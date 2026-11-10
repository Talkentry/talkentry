import { type TimelineListRow, TimelineRowType } from '../types';

/** Local calendar day key for a Unix ms timestamp. */
export const dayKeyFromCreatedAt = (createdAt: number): string => {
  const date = new Date(createdAt);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
};

export const dayRowKey = (dayKey: string): string => `day:${dayKey}`;

/**
 * Insert a day separator row before the first message of each local calendar day.
 * Operates on already-built message/gap rows (oldest → newest).
 */
export const insertDaySeparatorRows = (
  rows: readonly TimelineListRow[],
  getCreatedAt: (messageKey: string) => number | undefined,
): TimelineListRow[] => {
  const out: TimelineListRow[] = [];
  let previousDay: string | undefined;

  for (const row of rows) {
    if (row.type !== TimelineRowType.Message) {
      out.push(row);
      continue;
    }

    const createdAt = getCreatedAt(row.key);

    if (createdAt === undefined || !Number.isFinite(createdAt)) {
      out.push(row);
      continue;
    }

    const dayKey = dayKeyFromCreatedAt(createdAt);

    if (dayKey !== previousDay) {
      out.push({
        type: TimelineRowType.Day,
        key: dayRowKey(dayKey),
        dayKey,
        createdAt,
      });
      previousDay = dayKey;
    }

    out.push(row);
  }

  return out;
};
