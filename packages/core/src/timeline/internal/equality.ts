import type { TimelineGap, TimelineItem } from '../types';

export const sameItems = (a: readonly TimelineItem[], b: readonly TimelineItem[]): boolean =>
  a.length === b.length &&
  a.every(
    (item, index) =>
      item.key === b[index]?.key &&
      item.id === b[index]?.id &&
      item.pending === b[index]?.pending &&
      item.createdAt === b[index]?.createdAt &&
      item.sequence === b[index]?.sequence,
  );

export const sameGaps = (a: readonly TimelineGap[], b: readonly TimelineGap[]): boolean =>
  a.length === b.length &&
  a.every(
    (gap, index) =>
      gap.key === b[index]?.key &&
      gap.afterId === b[index]?.afterId &&
      gap.beforeId === b[index]?.beforeId &&
      gap.missingCount === b[index]?.missingCount,
  );
