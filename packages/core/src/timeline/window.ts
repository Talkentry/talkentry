import { TimelineChangeKind, TimelineStatus, type TimelineWindow } from './types';

/** Empty idle window — used on construct and after `stop`. */
export const initialTimelineWindow = (): TimelineWindow => ({
  items: [],
  messageKeys: [],
  status: TimelineStatus.Idle,
  error: null,
  hasMoreBefore: false,
  hasMoreAfter: false,
  gaps: [],
  change: { sequence: 0, kind: TimelineChangeKind.Initial },
});
