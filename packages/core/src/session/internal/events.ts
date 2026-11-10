import { type ChatEvent, ChatEventType } from '../../core/events';
import { assertMessage, isChatEvent } from '../../core/validation';
import { TimelineActionType, TimelineChangeKind } from '../../timeline';
import { abortable } from './abort';
import { commit, dispatch, notify } from './commit';
import { loadLatest, loadNewer, noteEventCursor } from './history';
import { scheduleReceipts } from './receipts';
import type { SessionHandle } from './session-handle';
import { isSessionActive } from './session-handle';

export const clearTypingState = (session: SessionHandle): void => {
  if (session.typingIdleTimer !== undefined) {
    clearTimeout(session.typingIdleTimer);
    session.typingIdleTimer = undefined;
  }

  session.localTyping = false;

  if (session.typingUserIds.length) {
    session.typingUserIds = Object.freeze([]);
  }
};

export const receiveEvent = (session: SessionHandle, value: unknown): void => {
  if (!isSessionActive(session) || !isChatEvent(value, session.options.chatId)) {
    return;
  }

  const event: ChatEvent = value;

  if (event.type === ChatEventType.HistoryInvalidated) {
    // Prefer durable journal replay when cursor is known; else catch-up + reconcile.
    resyncAfterDisconnect(session).catch(() => undefined);

    return;
  }

  if ('cursor' in event) {
    noteEventCursor(session, event.cursor);
  }

  if (event.type === ChatEventType.TypingUpdated) {
    const next = Object.freeze(event.userIds.filter((id) => id !== session.options.currentUserId));

    if (
      next.length === session.typingUserIds.length &&
      next.every((id, index) => id === session.typingUserIds[index])
    ) {
      return;
    }

    session.typingUserIds = next;
    notify(session);

    return;
  }

  try {
    session.messageStore.batch(() => {
      const keys = [...session.state.messageKeys];
      let kind: TimelineChangeKind = TimelineChangeKind.Reconcile;
      let addedPeer = false;

      switch (event.type) {
        case ChatEventType.MessageAdded:
        case ChatEventType.MessageUpdated: {
          const message = event.message;
          const belongsHere = session.threadId
            ? message.threadId === session.threadId || message.id === session.threadId
            : !message.threadId;
          const known = session.messageStore.get(message.localId ?? message.id);

          if (event.type === ChatEventType.MessageUpdated && known) {
            // Point-update (reactions, replyCount, edit) even if row is outside the list filter.
            session.messageStore.upsert(message);
            commit(session, keys, TimelineChangeKind.Reconcile);

            return;
          }

          if (!belongsHere || session.state.hasMoreAfter) {
            return;
          }

          const key = session.messageStore.upsert(message);

          if (key && !keys.includes(key)) {
            keys.push(key);
            kind = TimelineChangeKind.Append;
          }

          addedPeer =
            event.type === ChatEventType.MessageAdded &&
            message.senderId !== session.options.currentUserId;
          break;
        }
        case ChatEventType.MessageRemoved:
          session.messageStore.remove(event.messageId, event.revision);
          kind = TimelineChangeKind.Remove;
          break;
        case ChatEventType.MessageStatus:
          session.messageStore.patchStatus(
            event.messageId,
            event.status,
            event.serverId,
            event.revision,
          );
          break;
        default:
          return;
      }

      commit(session, keys, kind);
      if (addedPeer) {
        scheduleReceipts(session);
      }
    });
  } catch {
    session.blocked = true;
    session.history?.controller.abort();
    dispatch(session, {
      type: TimelineActionType.LoadError,
      error: new Error('Session retention exhausted; resync required'),
    });
  }
};

/**
 * After transport drop: if eventCursor is known — replay journal + reconcile;
 * else if the window is at the tip — catch-up loadAfter + reconcile; else latest.
 */
export const resyncAfterDisconnect = async (session: SessionHandle): Promise<boolean> => {
  if (!isSessionActive(session)) {
    return false;
  }

  const adapter = session.options.adapter;

  if (await replayJournal(session)) {
    if (!(await reconcileWindow(session))) {
      return loadLatest(session);
    }

    return true;
  }

  const awayFromTip = session.state.hasMoreAfter;
  const canCatchUp =
    !awayFromTip &&
    !!session.state.newestId &&
    !!adapter.loadAfter &&
    !!adapter.capabilities.loadAfter;

  if (!canCatchUp) {
    return loadLatest(session);
  }

  if (!(await loadNewer(session, { force: true }))) {
    return loadLatest(session);
  }

  for (
    let pages = 0;
    pages < 19 && isSessionActive(session) && session.state.hasMoreAfter;
    pages += 1
  ) {
    if (!(await loadNewer(session))) {
      return loadLatest(session);
    }
  }

  if (session.state.hasMoreAfter) {
    return loadLatest(session);
  }
  if (!(await reconcileWindow(session))) {
    return loadLatest(session);
  }

  return true;
};

/**
 * Replay durable events after `eventCursor`. Returns false to fall back to catch-up/latest.
 */
export const replayJournal = async (session: SessionHandle): Promise<boolean> => {
  if (!isSessionActive(session)) {
    return false;
  }

  const adapter = session.options.adapter;

  if (
    !adapter.capabilities.loadEvents ||
    !adapter.loadEvents ||
    session.eventCursor === undefined
  ) {
    return false;
  }

  const epoch = session.epoch;
  let afterCursor = session.eventCursor;

  for (let pages = 0; pages < 20; pages += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), session.timeoutMs);

    try {
      const page = await abortable(
        adapter.loadEvents({
          chatId: session.options.chatId,
          afterCursor,
          limit: session.pageSize,
          signal: controller.signal,
        }),
        controller.signal,
      );

      if (!isSessionActive(session) || epoch !== session.epoch) {
        return false;
      }

      for (const event of page.events) {
        if (
          event.type === ChatEventType.HistoryInvalidated ||
          event.type === ChatEventType.TypingUpdated
        ) {
          continue;
        }

        receiveEvent(session, event);
      }

      noteEventCursor(session, page.latestCursor);
      afterCursor = page.latestCursor;

      if (!page.hasMore) {
        return true;
      }
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  return false;
};

/**
 * Refresh known confirmed messages in the active window against the server.
 * Applies higher-revision upserts and tombstones for missing ids.
 */
export const reconcileWindow = async (session: SessionHandle): Promise<boolean> => {
  if (!isSessionActive(session)) {
    return false;
  }

  const adapter = session.options.adapter;

  if (!adapter.capabilities.reconcileMessages || !adapter.reconcileMessages) {
    return true;
  }

  const messageIds: string[] = [];

  for (const key of session.state.messageKeys) {
    const row = session.messageStore.get(key);
    if (!row || row.id === row.localId) {
      continue;
    }
    messageIds.push(row.id);
  }

  if (!messageIds.length) {
    return true;
  }

  const epoch = session.epoch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), session.timeoutMs);

  try {
    const result = await abortable(
      adapter.reconcileMessages({
        chatId: session.options.chatId,
        messageIds,
        signal: controller.signal,
      }),
      controller.signal,
    );

    if (!isSessionActive(session) || epoch !== session.epoch) {
      return false;
    }

    const messages = result.messages.map((item) => assertMessage(item, session.options.chatId));
    const removedIds = result.removedIds.filter((id) => typeof id === 'string' && id.length > 0);

    session.messageStore.batch(() => {
      for (const message of messages) {
        session.messageStore.upsert(message);
      }

      for (const id of removedIds) {
        const existing = session.messageStore.get(id);
        session.messageStore.remove(id, existing?.revision);
      }

      commit(session, session.state.messageKeys, TimelineChangeKind.Reconcile);
    });

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
