import type { MessagePage } from '../../core/pagination';
import { assertPage } from '../../core/validation';
import { TimelineActionType, TimelineChangeKind, TimelineLoadMode } from '../../timeline';
import { abortable, aborted } from './abort';
import { commit, dispatch } from './commit';
import { resolveGaps } from './gaps';
import { belongsToThread } from './local-send';
import { scheduleReceipts } from './receipts';
import type { SessionHandle } from './session-handle';
import { isSessionActive } from './session-handle';

type LoadMode = (typeof TimelineLoadMode)[keyof typeof TimelineLoadMode];

export const noteEventCursor = (session: SessionHandle, cursor: number | undefined): void => {
  if (cursor === undefined || !Number.isSafeInteger(cursor) || cursor < 0) {
    return;
  }

  if (session.eventCursor === undefined || cursor > session.eventCursor) {
    session.eventCursor = cursor;
  }
};

export const load = (
  session: SessionHandle,
  mode: LoadMode,
  fetchPage: (signal: AbortSignal) => Promise<MessagePage>,
): Promise<boolean> => {
  if (!isSessionActive(session)) {
    return Promise.resolve(false);
  }
  if (session.history && (mode === TimelineLoadMode.Older || mode === TimelineLoadMode.Newer)) {
    return session.history.task;
  }

  session.history?.controller.abort();

  const controller = new AbortController();
  const epoch = session.epoch;
  const watermark = session.messageStore.version;

  dispatch(session, { type: TimelineActionType.LoadStart, mode });

  const timer = setTimeout(() => controller.abort(), session.timeoutMs);

  const task = (async () => {
    try {
      const result = await abortable(
        Promise.resolve().then(() => {
          if (controller.signal.aborted) {
            throw aborted();
          }

          return fetchPage(controller.signal);
        }),
        controller.signal,
      );

      if (
        !isSessionActive(session) ||
        epoch !== session.epoch ||
        controller.signal.aborted ||
        session.history?.controller !== controller
      ) {
        return false;
      }

      const page = assertPage(result, session.options.chatId);
      if (
        mode === TimelineLoadMode.Around &&
        !page.messages.some(
          (message) =>
            message.id === session.aroundFocusId || message.localId === session.aroundFocusId,
        )
      ) {
        throw new Error('Requested message is unavailable');
      }

      session.messageStore.batch(() => {
        const incoming = page.messages
          .map((message) => session.messageStore.upsert(message, watermark))
          .filter((key): key is string => key !== undefined);

        const navigation = mode !== TimelineLoadMode.Older && mode !== TimelineLoadMode.Newer;
        const concurrent =
          mode === TimelineLoadMode.Initial || mode === TimelineLoadMode.Refresh
            ? session.state.messageKeys
                .filter((key) => session.messageStore.insertedSince(key, watermark))
                .filter((key) => belongsToThread(session, session.messageStore.get(key)))
            : [];

        const atLatest =
          (mode === TimelineLoadMode.Initial || mode === TimelineLoadMode.Refresh) &&
          !page.hasMoreAfter;
        const localKeys = atLatest
          ? [...new Set([...session.pending.keys(), ...session.localTailKeys])].filter((key) =>
              belongsToThread(session, session.messageStore.get(key)),
            )
          : [];
        // Around/history windows must never absorb an unrelated optimistic tail.
        let keys: readonly string[];
        if (navigation) {
          keys = [...incoming, ...concurrent, ...localKeys];
        } else if (mode === TimelineLoadMode.Older) {
          keys = [...incoming, ...session.state.messageKeys];
        } else {
          keys = [...session.state.messageKeys, ...incoming];
        }

        const kind = mode === TimelineLoadMode.Refresh ? TimelineChangeKind.Latest : mode;
        let focusKey: string | undefined;

        if (mode === TimelineLoadMode.Around && session.aroundFocusId) {
          const focusId = session.aroundFocusId;

          focusKey = incoming.find((key) => {
            const message = session.messageStore.get(key);

            return key === focusId || message?.id === focusId || message?.localId === focusId;
          });

          session.aroundFocusId = undefined;
          if (!focusKey) {
            session.messageStore.retain(
              new Set([
                ...session.state.messageKeys,
                ...session.pending.keys(),
                ...session.localTailKeys,
              ]),
            );
            throw new Error('Requested message is unavailable');
          }
        }

        noteEventCursor(session, page.eventCursor);
        const gaps = resolveGaps(session, mode, page, keys);

        // The authoritative tail takes over retention before subscribers run.
        for (const key of localKeys) {
          session.localTailKeys.delete(key);
        }
        commit(session, keys, kind, {
          hasMoreBefore:
            mode === TimelineLoadMode.Newer ? session.state.hasMoreBefore : page.hasMoreBefore,
          hasMoreAfter:
            mode === TimelineLoadMode.Older ? session.state.hasMoreAfter : page.hasMoreAfter,
          ready: true,
          gaps,
          ...(focusKey ? { focusKey } : {}),
        });
      });

      scheduleReceipts(session);

      return true;
    } catch {
      if (
        isSessionActive(session) &&
        epoch === session.epoch &&
        session.history?.controller === controller
      ) {
        dispatch(session, {
          type: TimelineActionType.LoadError,
          error: new Error('History request failed or timed out'),
        });
      }

      return false;
    } finally {
      clearTimeout(timer);
      if (session.history?.controller === controller) {
        session.history = undefined;
      }
    }
  })();

  session.history = { controller, task, mode };

  return task;
};

/** Cancel navigation without turning a user gesture into a history error. */
export const cancelNavigation = (session: SessionHandle): void => {
  const request = session.history;
  if (
    !request ||
    (request.mode !== TimelineLoadMode.Refresh && request.mode !== TimelineLoadMode.Around)
  ) {
    return;
  }
  const first = session.messageStore.get(session.state.messageKeys[0] ?? '');
  // A thread switch is a scope transition, not a navigation within the old list.
  if (first && (first.threadId ?? null) !== session.threadId) {
    return;
  }
  session.history = undefined;
  session.aroundFocusId = undefined;
  request.controller.abort();
  dispatch(session, { type: TimelineActionType.LoadCancelled });
};

export const loadLatest = (
  session: SessionHandle,
  mode:
    typeof TimelineLoadMode.Initial | typeof TimelineLoadMode.Refresh = TimelineLoadMode.Refresh,
): Promise<boolean> =>
  load(session, mode, (signal) =>
    session.options.adapter.loadLatest({
      chatId: session.options.chatId,
      limit: session.pageSize,
      signal,
      ...(session.threadId ? { threadId: session.threadId } : {}),
    }),
  );

export const loadOlder = (session: SessionHandle): Promise<boolean> => {
  const { oldestId, hasMoreBefore } = session.state;

  if (!hasMoreBefore || !oldestId || !session.options.adapter.capabilities.loadBefore) {
    return Promise.resolve(false);
  }

  return load(session, TimelineLoadMode.Older, (signal) =>
    session.options.adapter.loadBefore({
      chatId: session.options.chatId,
      beforeId: oldestId,
      limit: session.pageSize,
      signal,
      ...(session.threadId ? { threadId: session.threadId } : {}),
    }),
  );
};

export const loadNewer = (
  session: SessionHandle,
  options: { readonly force?: boolean } = {},
): Promise<boolean> => {
  const { newestId, hasMoreAfter } = session.state;
  const adapter = session.options.adapter;

  if (
    (!hasMoreAfter && !options.force) ||
    !newestId ||
    !adapter.loadAfter ||
    !adapter.capabilities.loadAfter
  ) {
    return Promise.resolve(false);
  }

  return load(session, TimelineLoadMode.Newer, (signal) =>
    adapter.loadAfter!({
      chatId: session.options.chatId,
      afterId: newestId,
      limit: session.pageSize,
      signal,
      ...(session.threadId ? { threadId: session.threadId } : {}),
    }),
  );
};

export const loadAround = (session: SessionHandle, messageId: string): Promise<boolean> => {
  const adapter = session.options.adapter;

  if (!adapter.capabilities.loadAround || !adapter.loadAround) {
    return Promise.reject(new Error('ChatAdapter does not support loadAround'));
  }

  session.aroundFocusId = messageId;

  return load(session, TimelineLoadMode.Around, (signal) =>
    adapter.loadAround!({
      chatId: session.options.chatId,
      aroundId: messageId,
      limit: session.pageSize,
      signal,
      ...(session.threadId ? { threadId: session.threadId } : {}),
    }),
  );
};
