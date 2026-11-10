import type { HistoryGap } from '../../core/pagination';
import type { TimelineGap } from '../types';

/** Cap retained structural holes so a hostile page cannot grow unbounded markers. */
export const MAX_TIMELINE_GAPS = 50;

export const gapKey = (afterId: string, beforeId: string): string => `gap:${afterId}:${beforeId}`;

export const toTimelineGap = (gap: HistoryGap): TimelineGap => ({
  key: gapKey(gap.afterId, gap.beforeId),
  afterId: gap.afterId,
  beforeId: gap.beforeId,
  ...(gap.missingCount !== undefined ? { missingCount: gap.missingCount } : {}),
});

/** Holes between consecutive messages that carry monotonic sequence. */
export const gapsFromSequences = (
  messages: readonly { readonly id: string; readonly sequence?: number }[],
): TimelineGap[] => {
  const gaps: TimelineGap[] = [];

  for (let i = 1; i < messages.length; i += 1) {
    const prev = messages[i - 1]!;
    const next = messages[i]!;

    if (
      prev.sequence === undefined ||
      next.sequence === undefined ||
      next.sequence <= prev.sequence + 1
    ) {
      continue;
    }

    gaps.push({
      key: gapKey(prev.id, next.id),
      afterId: prev.id,
      beforeId: next.id,
      missingCount: next.sequence - prev.sequence - 1,
    });
  }

  return gaps;
};

/** Edge hole when gluing an older page onto a newer retained message. */
export const continuityGap = (
  older: { readonly id: string; readonly sequence?: number },
  newer: { readonly id: string; readonly sequence?: number },
): TimelineGap | undefined => {
  if (older.sequence === undefined || newer.sequence === undefined) {
    return undefined;
  }
  if (newer.sequence <= older.sequence + 1) {
    return undefined;
  }

  return {
    key: gapKey(older.id, newer.id),
    afterId: older.id,
    beforeId: newer.id,
    missingCount: newer.sequence - older.sequence - 1,
  };
};

export const mergeGaps = (...lists: readonly (readonly TimelineGap[])[]): TimelineGap[] => {
  const map = new Map<string, TimelineGap>();

  for (const list of lists) {
    for (const gap of list) {
      map.set(gap.key, gap);
    }
  }

  return [...map.values()].slice(0, MAX_TIMELINE_GAPS);
};

/** Drop gaps whose endpoints left the retained window. */
export const retainGaps = (
  gaps: readonly TimelineGap[],
  messageIds: ReadonlySet<string>,
): TimelineGap[] =>
  gaps.filter((gap) => messageIds.has(gap.afterId) && messageIds.has(gap.beforeId));
