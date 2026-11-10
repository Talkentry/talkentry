/**
 * Timeline layer — bounded window of message order for one chat scope.
 *
 * Why it exists: `MessageStore` holds entity payloads (text, status, reactions).
 * Timeline holds only keys, edges, gaps, and load status so the list can render
 * without a second copy of message bodies. Session commits into both together.
 *
 * - `timeline-reducer` — switch on actions (thin)
 * - `actions` / `window` — action contract + empty window
 * - `internal/` — sort, equality, commit-window
 * - `types` — window + list-row contracts
 * - `rows/` — FlashList decoration derived from the window
 */

export type { TimelineAction, TimelineReducerOptions } from './actions';
export {
  buildTimelineRows,
  continuityGap,
  countMessagesFromId,
  dayKeyFromCreatedAt,
  dayRowKey,
  gapKey,
  gapsFromSequences,
  insertDaySeparatorRows,
  insertUnreadSeparatorRow,
  MAX_TIMELINE_GAPS,
  mergeGaps,
  retainGaps,
  toTimelineGap,
  UNREAD_ROW_KEY,
} from './rows';
export {
  createTimelineReducer,
  initialTimelineWindow,
  TimelineActionType,
  TimelineLoadMode,
  timelineReducer,
} from './timeline-reducer';
export type {
  TimelineChange,
  TimelineGap,
  TimelineItem,
  TimelineListRow,
  TimelineWindow,
} from './types';
export { TimelineChangeKind, TimelineRowType, TimelineStatus } from './types';
