import type { Message } from '../../../core/message';
import { preferHigherStatus } from './status';
import { isOlderMessage } from './version';

/**
 * Second merge path for `MessageStore.upsert`.
 *
 * Realtime may deliver the server-id row before HTTP send-ack attaches localId.
 * Collapse that duplicate onto the optimistic UI key instead of showing two bubbles.
 */
export const collapseRemoteEcho = (message: Message, remote: Message): Message => {
  let next = message;

  if (isOlderMessage(next, remote)) {
    next = { ...remote, localId: next.localId };
  }

  const status = preferHigherStatus(remote.status, next.status);

  if (status !== next.status) {
    next = { ...next, status };
  }

  return next;
};
