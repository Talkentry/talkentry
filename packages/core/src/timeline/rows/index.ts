/**
 * Derived list rows for FlashList — not a second source of truth.
 * Window keys/gaps come from `timeline-reducer`; these only decorate for UI.
 */

export { buildTimelineRows } from './build';
export { dayKeyFromCreatedAt, dayRowKey, insertDaySeparatorRows } from './days';
export {
  continuityGap,
  gapKey,
  gapsFromSequences,
  MAX_TIMELINE_GAPS,
  mergeGaps,
  retainGaps,
  toTimelineGap,
} from './gaps';
export { countMessagesFromId, insertUnreadSeparatorRow, UNREAD_ROW_KEY } from './unread';
