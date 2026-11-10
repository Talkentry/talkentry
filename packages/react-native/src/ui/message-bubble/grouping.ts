import { type TimelineListRow, TimelineRowType } from '@talkentry/core';

/**
 * True when this message continues a same-sender run (hide name/avatar).
 * Day, gap, and unread rows break the group.
 */
export const isGroupedWithPrevious = (
  rows: readonly TimelineListRow[],
  index: number,
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

  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = rows[i]!;

    if (
      prev.type === TimelineRowType.Day ||
      prev.type === TimelineRowType.Gap ||
      prev.type === TimelineRowType.Unread
    ) {
      return false;
    }

    if (prev.type === TimelineRowType.Message) {
      if (getIsSystem?.(prev.key)) {
        return false;
      }

      return getSenderId(prev.key) === senderId;
    }
  }

  return false;
};
