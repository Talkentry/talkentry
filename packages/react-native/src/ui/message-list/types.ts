import type {
  MaskedJumpOptions,
  Message,
  NavigationState,
  SubscribeLocalSendAccepted,
  TimelineChange,
  User,
} from '@talkentry/core';

import type { ChatSlots } from '../shared/slots';
import type { ChatLocale } from '../shared/strings';

export type MessageListProps = {
  /** Programmatic jumps only; disable or tune provisional release-profile thresholds. */
  readonly maskedJumps?: MaskedJumpOptions;
  /** Controlled host: commit the target window before resolving true; honor cancellation. */
  readonly onGoToMessage?: (messageId: string, signal: AbortSignal) => Promise<boolean>;
  /** Controlled hosts should change this when account/chat/thread identity changes. */
  readonly scopeKey?: string;
  /** Bounded navigation lifecycle, not per-frame telemetry. Contains no message text. */
  readonly onNavigationChange?: (navigation: NavigationState) => void;
  /** Controlled host: a non-replaying source of newly accepted local sends. */
  readonly subscribeLocalSendAccepted?: SubscribeLocalSendAccepted;
  /** Navigation focus / overlay visibility supplied by the host. AppState is checked separately. */
  readonly isActive?: boolean;
  /** Pause read dwell during transient layout/occlusion without cancelling navigation. */
  readonly readEnabled?: boolean;
  /** Hidden top strip when a host translates/clips the list, in layout units. */
  readonly viewportTopInset?: number;
  /** Incoming IDs observed for 250 ms in the active, unobscured viewport.
   * Idempotent host persistence belongs here. Controlled unreadCount must be updated by the host.
   * This notification describes visibility, not successful server acknowledgement.
   */
  readonly onMessagesRead?: (messageIds: readonly string[]) => void;
  readonly messages?: readonly Message[];
  readonly currentUserId?: string;
  /** Host-owned user directory for avatars / display names. */
  readonly users?: Readonly<Record<string, User>>;
  /**
   * Host read cursor: first unread message id (or UI key).
   * The scroll-to-latest badge counts messages from this id through the end
   * of the retained window, excluding own/system and already observed messages.
   * Without a cursor, the local badge counts new incoming rows since mounting.
   * Ids outside the window are not included.
   * Not MessageStore state.
   */
  readonly firstUnreadId?: string;
  /**
   * Host unread total for the scroll-to-latest badge.
   * Replaces the count derived from `firstUnreadId`, including messages
   * outside the retained window.
   */
  readonly unreadCount?: number;
  /**
   * Built-in scroll-to-latest arrow. `false` leaves the control to the host
   * via `useScrollToLatest`. The list still publishes visibility and jump.
   */
  readonly showScrollToLatest?: boolean;
  /**
   * Space after the last message, in px. Chat sets this to the floating
   * composer height so the tail can scroll clear of the overlay.
   */
  readonly contentBottomInset?: number;
  readonly hasMoreBefore?: boolean;
  readonly hasMoreAfter?: boolean;
  readonly loading?: boolean;
  readonly onLoadOlder?: () => void | Promise<unknown>;
  /** Controlled mode: host loads latest before resolve(true). */
  readonly onGoToLatest?: (signal: AbortSignal) => Promise<boolean>;
  readonly change?: TimelineChange;
  readonly locale?: ChatLocale;
  readonly renderMessage?: ChatSlots['renderMessage'];
  /**
   * Host-painted bubble inside the default row. Swipe, long-press, and the
   * peer avatar stay. Ignored when `renderMessage` replaces the row.
   */
  readonly renderMessageBody?: ChatSlots['renderMessageBody'];
  /**
   * Swipe-reply icon for the default row. The gesture stays in the SDK.
   * Ignored when `renderMessage` replaces the row.
   */
  readonly renderSwipeHint?: ChatSlots['renderSwipeHint'];
  /**
   * Draw a row where `sequence` skips. `false` keeps the hole in timeline
   * state and omits the visible marker. Does not join the pages.
   */
  readonly showGapMarkers?: boolean;
  readonly renderGap?: ChatSlots['renderGap'];
  readonly renderDay?: ChatSlots['renderDay'];
  readonly renderUnread?: ChatSlots['renderUnread'];
  readonly renderEmpty?: ChatSlots['renderEmpty'];
  readonly renderListHeader?: ChatSlots['renderListHeader'];
  /**
   * Short tap on empty list canvas, outside the composer. Hides the keyboard
   * and emoji sheet. A message press, drag, reply swipe, or long press does not
   * call it.
   */
  readonly onListTap?: () => void;
};
