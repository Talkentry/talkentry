import type { TimelineItem } from '../types';

/**
 * Sort order for the retained window (oldest → newest):
 * 1. Confirmed rows before optimistic pending sends
 * 2. Rows with server `sequence` before those without
 * 3. Ascending `sequence`, else `createdAt`, else `id`
 */
export const compareTimelineItems = (a: TimelineItem, b: TimelineItem): number => {
  const pendingOrder = comparePending(a, b);
  if (pendingOrder !== 0) {
    return pendingOrder;
  }

  const sequencePresence = compareSequencePresence(a, b);
  if (sequencePresence !== 0) {
    return sequencePresence;
  }

  if (a.sequence !== undefined && b.sequence !== undefined && a.sequence !== b.sequence) {
    return a.sequence - b.sequence;
  }

  return compareCreatedAtThenId(a, b);
};

/** Pending sends sort after confirmed history. */
const comparePending = (a: TimelineItem, b: TimelineItem): number => {
  if (a.pending === b.pending) {
    return 0;
  }
  if (a.pending) {
    return 1;
  }

  return -1;
};

/** Prefer rows that already have a server sequence. */
const compareSequencePresence = (a: TimelineItem, b: TimelineItem): number => {
  const aHasSequence = a.sequence !== undefined;
  const bHasSequence = b.sequence !== undefined;

  if (aHasSequence === bHasSequence) {
    return 0;
  }
  if (aHasSequence) {
    return -1;
  }

  return 1;
};

const compareCreatedAtThenId = (a: TimelineItem, b: TimelineItem): number => {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }

  return 0;
};
