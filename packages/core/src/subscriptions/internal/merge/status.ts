import { MessageStatus } from '../../../core/message';

/**
 * Delivery/read may only move forward.
 * Sending/failed sit at the bottom so an ACK never goes backwards.
 */
const STATUS_RANK: Record<MessageStatus, number> = {
  [MessageStatus.Sending]: 0,
  [MessageStatus.Failed]: 0,
  [MessageStatus.Sent]: 1,
  [MessageStatus.Delivered]: 2,
  [MessageStatus.Read]: 3,
};

export const preferHigherStatus = (
  current: MessageStatus | undefined,
  candidate: MessageStatus | undefined,
): MessageStatus | undefined => {
  if (!current) {
    return candidate;
  }
  if (!candidate) {
    return current;
  }

  return STATUS_RANK[current] > STATUS_RANK[candidate] ? current : candidate;
};

/** True when the stored status already outranks the incoming one. */
export const statusRanksAbove = (
  existing: MessageStatus | undefined,
  incoming: MessageStatus,
): boolean => existing !== undefined && STATUS_RANK[existing] > STATUS_RANK[incoming];
