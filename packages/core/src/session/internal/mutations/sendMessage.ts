import { type Message, MessageStatus } from '../../../core/message';
import { assertMessage } from '../../../core/validation';
import { TimelineChangeKind, TimelineStatus } from '../../../timeline';
import type { SendMessageInput } from '../../types';
import { abortable, aborted } from '../abort';
import { commit } from '../commit';
import { belongsToThread, publishLocalSend } from '../local-send';
import type { SessionHandle } from '../session-handle';
import { isSessionActive } from '../session-handle';

let nextLocalSequence = 0;

/** Optimistic client id when the host did not supply `localId` on send. */
const allocateLocalId = (sessionId: number): string =>
  `local-${sessionId}-${Date.now()}-${++nextLocalSequence}`;

export const sendMessage = async (
  session: SessionHandle,
  input: SendMessageInput,
): Promise<void> => {
  if (!isSessionActive(session)) {
    throw aborted();
  }
  if (!input.text?.trim() && !input.attachments?.length) {
    throw new Error('Message is empty');
  }
  if (session.pending.size >= session.maxPending) {
    throw new Error('Pending send limit reached');
  }

  const epoch = session.epoch;

  const localId = input.localId ?? allocateLocalId(session.id);

  if (session.pending.has(localId)) {
    throw new Error('Message is already sending');
  }

  const existing = session.messageStore.get(localId);

  if (existing && existing.status !== MessageStatus.Failed) {
    throw new Error('localId already exists');
  }
  const requiresLatest =
    session.state.hasMoreAfter ||
    [
      TimelineStatus.Loading,
      TimelineStatus.Refreshing,
      TimelineStatus.LoadingOlder,
      TimelineStatus.LoadingAround,
    ].some((status) => status === session.state.status);
  if (
    requiresLatest &&
    !session.localTailKeys.has(localId) &&
    session.localTailKeys.size >= session.maxPending
  ) {
    throw new Error('Unshown local send limit reached');
  }

  // Active thread scope wins over a stale caller threadId.
  const threadId = session.threadId ?? input.threadId;
  if (
    existing &&
    ((existing.threadId ?? null) !== (threadId ?? null) ||
      existing.senderId !== session.options.currentUserId)
  ) {
    throw new Error('Local send scope mismatch');
  }
  const controller = new AbortController();
  const now = Date.now();

  const optimistic: Message = assertMessage(
    {
      ...input,
      ...(threadId ? { threadId } : {}),
      id: localId,
      localId,
      chatId: session.options.chatId,
      senderId: session.options.currentUserId,
      createdAt: existing?.createdAt ?? now,
      status: MessageStatus.Sending,
    },
    session.options.chatId,
  );

  session.pending.set(localId, controller);
  if (requiresLatest) {
    session.localTailKeys.add(localId);
  }

  try {
    session.messageStore.batch(() => {
      const key = session.messageStore.upsert(optimistic);
      if (!key) {
        throw new Error('Local message could not be accepted');
      }
      const append = !requiresLatest && belongsToThread(session, optimistic);
      commit(
        session,
        [...session.state.messageKeys, ...(append ? [key] : [])],
        existing ? TimelineChangeKind.Reconcile : TimelineChangeKind.OwnSend,
      );
    });
  } catch (error) {
    session.pending.delete(localId);
    session.localTailKeys.delete(localId);
    throw error;
  }

  const timer = setTimeout(() => controller.abort(), session.timeoutMs);

  try {
    if (!existing) {
      publishLocalSend(session, { localId, threadId: threadId ?? null, requiresLatest });
    }
    if (!isSessionActive(session) || epoch !== session.epoch) {
      throw aborted();
    }
    const result = await abortable(
      session.options.adapter.send({
        ...input,
        ...(threadId ? { threadId } : {}),
        localId,
        chatId: session.options.chatId,
        senderId: session.options.currentUserId,
        signal: controller.signal,
      }),
      controller.signal,
    );

    if (!isSessionActive(session) || epoch !== session.epoch) {
      throw aborted();
    }

    const message = assertMessage(result, session.options.chatId);

    if (
      message.senderId !== session.options.currentUserId ||
      (message.threadId ?? null) !== (threadId ?? null) ||
      (message.localId !== undefined && message.localId !== localId) ||
      message.status === MessageStatus.Sending ||
      message.status === MessageStatus.Failed
    ) {
      throw new Error('Invalid send acknowledgement');
    }

    session.messageStore.batch(() => {
      const key = session.messageStore.upsert({
        ...message,
        localId,
        status: message.status ?? MessageStatus.Sent,
      });
      session.pending.delete(localId);
      commit(
        session,
        key ? session.state.messageKeys : session.state.messageKeys.filter((id) => id !== localId),
        TimelineChangeKind.Reconcile,
      );
    });
  } catch {
    if (isSessionActive(session) && epoch === session.epoch) {
      session.messageStore.batch(() => {
        session.messageStore.patchStatus(localId, MessageStatus.Failed);
        session.pending.delete(localId);
        commit(session, session.state.messageKeys, TimelineChangeKind.Reconcile);
        // Delivery failure belongs to the pending row and send rejection,
        // not to history loading or viewport navigation.
      });
    }

    throw new Error('Message could not be sent');
  } finally {
    clearTimeout(timer);
    if (epoch === session.epoch) {
      session.pending.delete(localId);
    }
  }
};
