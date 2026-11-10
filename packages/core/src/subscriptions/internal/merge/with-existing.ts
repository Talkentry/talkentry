import type { Message } from '../../../core/message';
import { preferHigherStatus } from './status';
import { isNewerRevision, isOlderMessage, isSameMessageVersion } from './version';

export type MergeExistingResult =
  | { readonly action: 'keep'; readonly key: string }
  | { readonly action: 'apply'; readonly message: Message };

/**
 * localId → server id ack under the same UI key.
 * List identity stays on localId so FlashList keys do not jump.
 */
const isLocalToServerReconcile = (existing: Message, incoming: Message, key: string): boolean =>
  existing.id === key && incoming.id !== existing.id && existing.localId === key;

/**
 * Main merge path for `MessageStore.upsert` when a row already exists.
 *
 * Decide whether the incoming payload replaces the stored message, or we keep
 * what we have (stale page, older revision, identity clash).
 */
export const mergeWithExisting = (
  key: string,
  existing: Message,
  incoming: Message,
  historyStartedAt: number | undefined,
  existingChangedAt: number,
): MergeExistingResult => {
  if (existing.chatId !== incoming.chatId || existing.senderId !== incoming.senderId) {
    return { action: 'keep', key };
  }

  const reconcile = isLocalToServerReconcile(existing, incoming, key);
  const newerRevision = isNewerRevision(incoming, existing);

  // Stale page must not clobber a live edit that landed after the request started.
  const staleHistory =
    historyStartedAt !== undefined && existingChangedAt > historyStartedAt && !newerRevision;

  if (!reconcile && (isOlderMessage(incoming, existing) || staleHistory)) {
    return { action: 'keep', key };
  }

  // Server id is immutable after ack; localId remains the UI key.
  if (!reconcile && existing.id !== incoming.id) {
    return { action: 'keep', key };
  }

  let message: Message = {
    ...existing,
    ...incoming,
    localId: existing.localId ?? incoming.localId,
  };

  // Equal version: only status may advance (receipt), not content rewrite.
  if (!reconcile && isSameMessageVersion(incoming, existing)) {
    message = { ...existing, status: incoming.status ?? existing.status };
  }

  const status = preferHigherStatus(existing.status, message.status);

  if (status !== message.status) {
    message = { ...message, status };
  }

  return { action: 'apply', message };
};
