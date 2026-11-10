/**
 * Timeline owns order and list structure only.
 * Message text/status live in `MessageStore` — never duplicated here.
 */

/** Load / ready state of the retained window. */
export const TimelineStatus = {
  Idle: 'idle',
  Loading: 'loading',
  Ready: 'ready',
  Refreshing: 'refreshing',
  LoadingOlder: 'loadingOlder',
  LoadingNewer: 'loadingNewer',
  LoadingAround: 'loadingAround',
} as const;

export type TimelineStatus = (typeof TimelineStatus)[keyof typeof TimelineStatus];

/** Why the structural window snapshot changed (viewport / list react to this). */
export const TimelineChangeKind = {
  Initial: 'initial',
  Latest: 'latest',
  Older: 'older',
  Newer: 'newer',
  Around: 'around',
  Append: 'append',
  OwnSend: 'own-send',
  Remove: 'remove',
  Reconcile: 'reconcile',
} as const;

export type TimelineChangeKind = (typeof TimelineChangeKind)[keyof typeof TimelineChangeKind];

export type TimelineChange = {
  /** Monotonic counter for this window; bumps only on structural change. */
  readonly sequence: number;
  readonly kind: TimelineChangeKind;
  /** After `around` navigation: UI key to bring into view. */
  readonly focusKey?: string;
};

/** Order projection only. Text/status fields are not stored here. */
export type TimelineItem = {
  /** Stable UI key (localId until server ack). */
  readonly key: string;
  /** Server id when confirmed, else same as key. */
  readonly id: string;
  readonly createdAt: number;
  /** Per-chat monotonic server order when present. */
  readonly sequence?: number;
  /** True while waiting for send ack (sorts after confirmed rows). */
  readonly pending?: boolean;
};

/** Structural hole between two retained messages — not a MessageStore entity. */
export type TimelineGap = {
  readonly key: string;
  /** Message id immediately before the missing range. */
  readonly afterId: string;
  /** Message id immediately after the missing range. */
  readonly beforeId: string;
  readonly missingCount?: number;
};

/** Discriminants for FlashList timeline rows. */
export const TimelineRowType = {
  /** Ordinary message bubble (key → MessageStore). */
  Message: 'message',
  /** Missing sequence range marker between two retained ids. */
  Gap: 'gap',
  /** Local calendar day separator. */
  Day: 'day',
  /** Host-driven unread separator before `beforeId`. */
  Unread: 'unread',
} as const;

export type TimelineRowType = (typeof TimelineRowType)[keyof typeof TimelineRowType];

/** Rows FlashList renders: messages plus derived markers. */
export type TimelineListRow =
  | { readonly type: typeof TimelineRowType.Message; readonly key: string }
  | { readonly type: typeof TimelineRowType.Gap; readonly key: string; readonly gap: TimelineGap }
  | {
      readonly type: typeof TimelineRowType.Day;
      readonly key: string;
      /** Local calendar day `YYYY-MM-DD`. */
      readonly dayKey: string;
      readonly createdAt: number;
    }
  | {
      readonly type: typeof TimelineRowType.Unread;
      readonly key: string;
      /** Server/UI id of the first unread message this marker precedes. */
      readonly beforeId: string;
    };

/** Bounded history window: keys, edges, gaps, load status. */
export type TimelineWindow = {
  readonly items: readonly TimelineItem[];
  readonly messageKeys: readonly string[];
  readonly status: TimelineStatus;
  readonly error: Error | null;
  readonly hasMoreBefore: boolean;
  readonly hasMoreAfter: boolean;
  /** Sequence discontinuities inside the retained window. */
  readonly gaps: readonly TimelineGap[];
  /** Edges of the retained window, not the source page cursors. */
  readonly oldestId?: string;
  readonly newestId?: string;
  readonly change: TimelineChange;
};
