import {
  type TimelineChangeKind,
  type TimelineGap,
  type TimelineItem,
  TimelineStatus,
} from './types';

/** How a history page request was initiated. */
export const TimelineLoadMode = {
  Initial: 'initial',
  Refresh: 'refresh',
  Older: 'older',
  Newer: 'newer',
  Around: 'around',
} as const;

export type TimelineLoadMode = (typeof TimelineLoadMode)[keyof typeof TimelineLoadMode];

/** Discriminants for timeline reducer actions. */
export const TimelineActionType = {
  LoadStart: 'load_start',
  LoadError: 'load_error',
  LoadCancelled: 'load_cancelled',
  Commit: 'commit',
} as const;

export type TimelineActionType = (typeof TimelineActionType)[keyof typeof TimelineActionType];

export type TimelineReducerOptions = {
  /** Max confirmed+pending items retained in the window. */
  readonly maxMessages?: number;
};

export type TimelineAction =
  | { type: typeof TimelineActionType.LoadStart; mode: TimelineLoadMode }
  | { type: typeof TimelineActionType.LoadError; error: Error }
  | { type: typeof TimelineActionType.LoadCancelled }
  | {
      type: typeof TimelineActionType.Commit;
      items: readonly TimelineItem[];
      kind: TimelineChangeKind;
      hasMoreBefore?: boolean;
      hasMoreAfter?: boolean;
      ready?: boolean;
      focusKey?: string;
      gaps?: readonly TimelineGap[];
    };

/** Maps a load mode to the window status shown while the request is in flight. */
export const LOAD_STATUS: Record<TimelineLoadMode, TimelineStatus> = {
  [TimelineLoadMode.Initial]: TimelineStatus.Loading,
  [TimelineLoadMode.Refresh]: TimelineStatus.Refreshing,
  [TimelineLoadMode.Older]: TimelineStatus.LoadingOlder,
  [TimelineLoadMode.Newer]: TimelineStatus.LoadingNewer,
  [TimelineLoadMode.Around]: TimelineStatus.LoadingAround,
};
