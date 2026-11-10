import type { MessageId } from '../../core/message';
import { type TimelineGap, type TimelineListRow, TimelineRowType } from '../types';
import { insertDaySeparatorRows } from './days';

/**
 * Build FlashList rows from the retained window.
 *
 * Interleaves message keys with gap markers (gap appears after `afterId`).
 * `resolveId` maps UI key → server id when they differ (localId alias).
 * When `getCreatedAt` is provided, inserts local-calendar day separators.
 */
export const buildTimelineRows = (
  messageKeys: readonly string[],
  gaps: readonly TimelineGap[],
  resolveId: (key: string) => MessageId | undefined = (key) => key,
  getCreatedAt?: (messageKey: string) => number | undefined,
): TimelineListRow[] => {
  let rows: TimelineListRow[];

  if (!gaps.length) {
    rows = messageKeys.map((key) => ({ type: TimelineRowType.Message, key }));
  } else {
    const byAfter = new Map(gaps.map((gap) => [gap.afterId, gap]));
    rows = [];

    for (const key of messageKeys) {
      rows.push({ type: TimelineRowType.Message, key });
      const id = resolveId(key) ?? key;
      const gap = byAfter.get(id);
      if (gap) {
        rows.push({ type: TimelineRowType.Gap, key: gap.key, gap });
      }
    }
  }

  return getCreatedAt ? insertDaySeparatorRows(rows, getCreatedAt) : rows;
};
