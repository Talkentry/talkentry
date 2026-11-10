import type { TimelineChange } from '../timeline';

export const ViewportMode = {
  FollowingLatest: 'followingLatest',
  ReadingHistory: 'readingHistory',
} as const;

export type ViewportMode = (typeof ViewportMode)[keyof typeof ViewportMode];

export const ScrollIntentType = {
  None: 'none',
  ScrollToEnd: 'scrollToEnd',
  ScrollToMessage: 'scrollToMessage',
} as const;

export type ScrollIntentType = (typeof ScrollIntentType)[keyof typeof ScrollIntentType];

export type ScrollIntent =
  | { readonly type: typeof ScrollIntentType.None }
  | {
      readonly type: typeof ScrollIntentType.ScrollToEnd;
      readonly id: number;
      readonly animated: boolean;
    }
  | {
      readonly type: typeof ScrollIntentType.ScrollToMessage;
      readonly id: number;
      readonly key: string;
      readonly animated: boolean;
    };

export type ActiveScrollIntent = Exclude<ScrollIntent, { readonly type: 'none' }>;

export const NavigationStatus = {
  Idle: 'idle',
  Pending: 'pending',
  Executing: 'executing',
  Settled: 'settled',
  Cancelled: 'cancelled',
  Failed: 'failed',
} as const;

export const NavigationFailure = {
  LoadFailed: 'loadFailed',
  LayoutUnavailable: 'layoutUnavailable',
  TargetUnavailable: 'targetUnavailable',
  RetryExhausted: 'retryExhausted',
  ExecutionFailed: 'executionFailed',
} as const;

export type NavigationFailure = (typeof NavigationFailure)[keyof typeof NavigationFailure];
export type NavigationCancellation = 'gesture' | 'superseded' | 'inactive';

/** Only the current operation is retained; this is not an unbounded event journal. */
export type NavigationState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'pending' | 'executing';
      readonly id: number;
      readonly awaitingData: boolean;
    }
  | { readonly status: 'settled'; readonly id: number }
  | { readonly status: 'cancelled'; readonly id: number; readonly reason: NavigationCancellation }
  | {
      readonly status: 'failed';
      readonly id: number;
      readonly reason: NavigationFailure;
      /** Moved here from pendingIntent, never executed until an explicit retry. */
      readonly intent: ActiveScrollIntent;
    };

export type ViewportState = {
  readonly mode: ViewportMode;
  readonly pendingIntent: ScrollIntent;
  readonly nextIntentId: number;
  /** Geometry, not gesture start, controls the button. */
  readonly buttonVisible: boolean;
  /** A drag remains authoritative through its momentum phase. */
  readonly interacting: boolean;
  readonly manualOverride: boolean;
  readonly interruption: number;
  readonly distance: number;
  readonly hasMoreAfter: boolean;
  readonly lastChange: number;
  readonly navigation: NavigationState;
  readonly active: boolean;
  readonly layout: { readonly content: number; readonly height: number };
};

/** Discriminant for viewportReducer actions (comparisons / dispatch). */
export const ViewportActionType = {
  WindowChanged: 'window_changed',
  NearBottomChanged: 'near_bottom_changed',
  UserDrag: 'user_drag',
  FollowLatest: 'follow_latest',
  IntentConsumed: 'intent_consumed',
  Reset: 'reset',
  GeometryChanged: 'geometry_changed',
  InteractionEnded: 'interaction_ended',
  PrepareLatest: 'prepare_latest',
  PrepareMessage: 'prepare_message',
  LocalSendAccepted: 'local_send_accepted',
  LatestReady: 'latest_ready',
  ExecutionStarted: 'execution_started',
  ExecutionFailed: 'execution_failed',
  RetryNavigation: 'retry_navigation',
  LayoutChanged: 'layout_changed',
  ActivationChanged: 'activation_changed',
} as const;

export type ViewportActionType = (typeof ViewportActionType)[keyof typeof ViewportActionType];

export type ViewportAction =
  | {
      readonly type: typeof ViewportActionType.WindowChanged;
      readonly change: TimelineChange;
      readonly hasMoreAfter: boolean;
      readonly cancelled?: boolean;
    }
  | {
      readonly type: typeof ViewportActionType.NearBottomChanged;
      readonly nearBottom: boolean;
      readonly hasMoreAfter?: boolean;
    }
  | { readonly type: typeof ViewportActionType.UserDrag }
  | { readonly type: typeof ViewportActionType.FollowLatest; readonly animated?: boolean }
  | { readonly type: typeof ViewportActionType.IntentConsumed; readonly id: number }
  | {
      readonly type: typeof ViewportActionType.GeometryChanged;
      readonly distance: number;
      readonly hasMoreAfter: boolean;
    }
  | { readonly type: typeof ViewportActionType.InteractionEnded }
  | { readonly type: typeof ViewportActionType.PrepareLatest; readonly awaitingData?: boolean }
  | {
      readonly type: typeof ViewportActionType.PrepareMessage;
      readonly key: string;
      readonly awaitingData: boolean;
    }
  | { readonly type: typeof ViewportActionType.LocalSendAccepted; readonly awaitingData: boolean }
  | { readonly type: typeof ViewportActionType.LatestReady; readonly id: number }
  | { readonly type: typeof ViewportActionType.ExecutionStarted; readonly id: number }
  | {
      readonly type: typeof ViewportActionType.ExecutionFailed;
      readonly id: number;
      readonly reason: NavigationFailure;
    }
  | { readonly type: typeof ViewportActionType.RetryNavigation }
  | {
      readonly type: typeof ViewportActionType.LayoutChanged;
      readonly content: number;
      readonly height: number;
      readonly offset: number;
      readonly sequence: number;
      readonly hasMoreAfter: boolean;
    }
  | { readonly type: typeof ViewportActionType.ActivationChanged; readonly active: boolean }
  | { readonly type: typeof ViewportActionType.Reset };
