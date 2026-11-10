import { MessageStatus } from '../../core/message';
import { abortable } from './abort';
import type { SessionHandle } from './session-handle';
import { isSessionActive } from './session-handle';

/** Coalesce burst peer traffic into one receipt flush. */
const RECEIPT_FLUSH_DEBOUNCE_MS = 40;

/** Cap delivered ACKs per flush so a large window does not flood the adapter. */
const MAX_DELIVERY_ACKS_PER_FLUSH = 100;

/** Coalesce auto ACKs after history/live peer traffic. */
export const scheduleReceipts = (session: SessionHandle): void => {
  const caps = session.options.adapter.capabilities;

  if (!caps.deliveryReceipts) {
    return;
  }
  if (!session.options.adapter.updateReceipts) {
    return;
  }

  if (session.receiptTimer !== undefined) {
    clearTimeout(session.receiptTimer);
  }

  session.receiptTimer = setTimeout(() => {
    session.receiptTimer = undefined;
    flushReceipts(session).catch(() => undefined);
  }, RECEIPT_FLUSH_DEBOUNCE_MS);
};

export const flushReceipts = async (session: SessionHandle): Promise<void> => {
  if (!isSessionActive(session)) {
    return;
  }

  if (session.receiptsBusy) {
    session.receiptsQueued = true;

    return;
  }

  session.receiptsBusy = true;

  try {
    const peerIds = peerIdsNeedingDelivery(session);

    if (peerIds.length) {
      const sent = await sendReceipts(session, MessageStatus.Delivered, { messageIds: peerIds });
      if (sent && peerIdsNeedingDelivery(session).length) {
        session.receiptsQueued = true;
      }
    }
  } finally {
    session.receiptsBusy = false;

    if (session.receiptsQueued && isSessionActive(session)) {
      session.receiptsQueued = false;
      scheduleReceipts(session);
    }
  }
};

export const peerIdsNeedingDelivery = (session: SessionHandle): string[] => {
  const me = session.options.currentUserId;
  const ids: string[] = [];

  for (const key of session.state.messageKeys) {
    const message = session.messageStore.get(key);

    if (!message || message.system || message.senderId === me || message.id === message.localId) {
      continue;
    }

    const status = message.status ?? MessageStatus.Sent;

    if (status === MessageStatus.Sent || status === MessageStatus.Sending) {
      ids.push(message.id);
    }
    if (ids.length >= MAX_DELIVERY_ACKS_PER_FLUSH) {
      break;
    }
  }

  return ids;
};

export const sendReceipts = async (
  session: SessionHandle,
  status: typeof MessageStatus.Delivered | typeof MessageStatus.Read,
  target: { messageIds?: readonly string[]; upToMessageId?: string },
): Promise<boolean> => {
  if (!isSessionActive(session)) {
    return false;
  }

  const adapter = session.options.adapter;
  const capability = status === MessageStatus.Delivered ? 'deliveryReceipts' : 'readReceipts';

  if (!adapter.capabilities[capability] || !adapter.updateReceipts) {
    return false;
  }
  if (status === MessageStatus.Delivered && !target.messageIds?.length) {
    return false;
  }

  if (status === MessageStatus.Read && !target.upToMessageId && !target.messageIds?.length) {
    return false;
  }

  const epoch = session.epoch;
  const threadId = session.threadId;
  // Snapshot the target before awaiting I/O. New arrivals must not become read
  // as a side effect of an older receipt finishing.
  const requestedIds = target.messageIds ? new Set(target.messageIds) : undefined;
  const boundary = session.state.messageKeys.findIndex((key) => {
    const message = session.messageStore.get(key);

    return key === target.upToMessageId || message?.id === target.upToMessageId;
  });
  if (!requestedIds && boundary < 0) {
    return false;
  }
  const ids = session.state.messageKeys.flatMap((key, index) => {
    const message = session.messageStore.get(key);
    if (
      !message ||
      message.system ||
      message.senderId === session.options.currentUserId ||
      message.id === message.localId ||
      (message.threadId ?? null) !== threadId
    ) {
      return [];
    }
    if (requestedIds ? !requestedIds.has(message.id) : index > boundary) {
      return [];
    }

    return [message.id];
  });
  if (!ids.length) {
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), session.timeoutMs);

  try {
    // Reference transports accept up to 100 exact IDs per request. A cumulative
    // host cursor stays explicit; the viewport never uses it.
    const batchSize = requestedIds ? MAX_DELIVERY_ACKS_PER_FLUSH : ids.length;
    for (let start = 0; start < ids.length; start += batchSize) {
      if (!isSessionActive(session) || epoch !== session.epoch || threadId !== session.threadId) {
        return false;
      }
      const batch = ids.slice(start, start + batchSize);
      await abortable(
        adapter.updateReceipts({
          chatId: session.options.chatId,
          actorId: session.options.currentUserId,
          status,
          messageIds: requestedIds ? batch : undefined,
          upToMessageId: requestedIds ? undefined : target.upToMessageId,
          signal: controller.signal,
        }),
        controller.signal,
      );

      if (!isSessionActive(session) || epoch !== session.epoch || threadId !== session.threadId) {
        return false;
      }

      // Local advance so we do not re-ACK the same peers every flush; sender
      // clients learn the truth from realtime message.status fan-out.
      session.messageStore.batch(() => {
        for (const id of batch) {
          session.messageStore.patchStatus(id, status);
        }
      });
    }

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
