import type { TimelineAction, TimelineActionType } from '../actions';
import { retainGaps } from '../rows/gaps';
import { TimelineChangeKind, TimelineStatus, type TimelineWindow } from '../types';
import { sameGaps, sameItems } from './equality';
import { compareTimelineItems } from './sort';

/** Change kinds that always bump the structural `change` sequence (viewport navigation). */
const NAVIGATION_KINDS: ReadonlySet<TimelineChangeKind> = new Set([
  TimelineChangeKind.Initial,
  TimelineChangeKind.Latest,
  TimelineChangeKind.Around,
  TimelineChangeKind.OwnSend,
]);

/**
 * Apply a commit: dedupe → sort → trim → retain gaps → maybe bump change.
 * Returns the previous state reference when nothing material changed.
 */
export const commitWindow = (
  state: TimelineWindow,
  action: Extract<TimelineAction, { type: typeof TimelineActionType.Commit }>,
  maxMessages: number,
): TimelineWindow => {
  const unique = [...new Map(action.items.map((item) => [item.key, item])).values()];
  unique.sort(compareTimelineItems);

  const trimmed = unique.length > maxMessages;
  const keepOldest = action.kind === TimelineChangeKind.Older;
  const items = keepOldest ? unique.slice(0, maxMessages) : unique.slice(-maxMessages);
  const stableItems = sameItems(items, state.items) ? state.items : items;
  const remote = items.filter((item) => !item.pending);

  const hasMoreBefore = (action.hasMoreBefore ?? state.hasMoreBefore) || (trimmed && !keepOldest);
  const hasMoreAfter = (action.hasMoreAfter ?? state.hasMoreAfter) || (trimmed && keepOldest);
  const navigation = NAVIGATION_KINDS.has(action.kind);

  const messageIds = new Set(items.map((item) => item.id));
  const nextGaps =
    action.gaps !== undefined
      ? retainGaps(action.gaps, messageIds)
      : retainGaps(state.gaps, messageIds);
  const gaps = sameGaps(nextGaps, state.gaps) ? state.gaps : nextGaps;

  const changed = stableItems !== state.items || gaps !== state.gaps || navigation;

  if (
    !changed &&
    hasMoreBefore === state.hasMoreBefore &&
    hasMoreAfter === state.hasMoreAfter &&
    !action.ready
  ) {
    return state;
  }

  return {
    items: stableItems,
    messageKeys: stableItems === state.items ? state.messageKeys : items.map((item) => item.key),
    oldestId: remote[0]?.id,
    newestId: remote[remote.length - 1]?.id,
    status: action.ready ? TimelineStatus.Ready : state.status,
    error: action.ready ? null : state.error,
    hasMoreBefore,
    hasMoreAfter,
    gaps,
    change: changed
      ? {
          sequence: state.change.sequence + 1,
          kind: action.kind,
          ...(action.focusKey ? { focusKey: action.focusKey } : {}),
        }
      : state.change,
  };
};
