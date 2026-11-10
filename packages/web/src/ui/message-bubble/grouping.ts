import { type TimelineListRow, TimelineRowType } from '@talkentry/core';

const breaksGroup = (row: TimelineListRow): boolean =>
  row.type === TimelineRowType.Day || row.type === TimelineRowType.Unread;

const neighborMessageKey = (
  rows: readonly TimelineListRow[],
  index: number,
  step: -1 | 1,
  getIsSystem?: (messageKey: string) => boolean,
): string | undefined => {
  for (let i = index + step; i >= 0 && i < rows.length; i += step) {
    const neighbor = rows[i];
    if (!neighbor) {
      return undefined;
    }
    if (neighbor.type === TimelineRowType.Gap) {
      continue;
    }
    if (breaksGroup(neighbor)) {
      return undefined;
    }

    if (neighbor.type === TimelineRowType.Message) {
      if (getIsSystem?.(neighbor.key)) {
        return undefined;
      }

      return neighbor.key;
    }
  }

  return undefined;
};

const isSameSenderNeighbor = (
  rows: readonly TimelineListRow[],
  index: number,
  step: -1 | 1,
  getSenderId: (messageKey: string) => string | undefined,
  getIsSystem?: (messageKey: string) => boolean,
): boolean => {
  const current = rows[index];
  if (!current || current.type !== TimelineRowType.Message) {
    return false;
  }
  if (getIsSystem?.(current.key)) {
    return false;
  }

  const senderId = getSenderId(current.key);
  if (!senderId) {
    return false;
  }

  const neighborKey = neighborMessageKey(rows, index, step, getIsSystem);
  if (!neighborKey) {
    return false;
  }

  return getSenderId(neighborKey) === senderId;
};

/** True when this message continues a same-sender run (hide the peer name). */
export const isGroupedWithPrevious = (
  rows: readonly TimelineListRow[],
  index: number,
  getSenderId: (messageKey: string) => string | undefined,
  getIsSystem?: (messageKey: string) => boolean,
): boolean => isSameSenderNeighbor(rows, index, -1, getSenderId, getIsSystem);

/** True when a later same-sender message continues this run (hide the avatar). */
export const isGroupedWithNext = (
  rows: readonly TimelineListRow[],
  index: number,
  getSenderId: (messageKey: string) => string | undefined,
  getIsSystem?: (messageKey: string) => boolean,
): boolean => isSameSenderNeighbor(rows, index, 1, getSenderId, getIsSystem);
