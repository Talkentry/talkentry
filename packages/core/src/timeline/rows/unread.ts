import type { MessageId } from '../../core/message';
import { type TimelineListRow, TimelineRowType } from '../types';

export const UNREAD_ROW_KEY = 'unread';

/**
 * Insert a single unread separator before the first message matching
 * `firstUnreadId` (UI key or resolved server id). Host owns the read cursor.
 */
export const insertUnreadSeparatorRow = (
  rows: readonly TimelineListRow[],
  firstUnreadId: MessageId | undefined,
  resolveId: (key: string) => MessageId | undefined = (key) => key,
): TimelineListRow[] => {
  if (!firstUnreadId) {
    return rows as TimelineListRow[];
  }

  const out: TimelineListRow[] = [];
  let inserted = false;

  for (const row of rows) {
    if (!inserted && row.type === TimelineRowType.Message) {
      const id = resolveId(row.key) ?? row.key;

      if (id === firstUnreadId || row.key === firstUnreadId) {
        out.push({ type: TimelineRowType.Unread, key: UNREAD_ROW_KEY, beforeId: id });
        inserted = true;
      }
    }

    out.push(row);
  }

  return out;
};

/**
 * Count of messages from `messageId` through the end of `messageKeys`.
 * `messageId` may be a timeline key or a resolved server id.
 * Returns 0 when that id is outside this window.
 */
export const countMessagesFromId = (
  messageKeys: readonly string[],
  messageId: string | undefined,
  resolveId: (key: string) => string | undefined = (key) => key,
): number => {
  if (!messageId) {
    return 0;
  }

  const index = messageKeys.findIndex((key) => key === messageId || resolveId(key) === messageId);

  if (index < 0) {
    return 0;
  }

  return messageKeys.length - index;
};
