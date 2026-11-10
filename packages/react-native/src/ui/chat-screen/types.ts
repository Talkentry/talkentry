import type { Message, User } from '@talkentry/core';

import type { ComposerProps } from '../composer/types';
import type { MessageListProps } from '../message-list/types';
import type { ChatSlots } from '../shared/slots';
import type { ChatLocale } from '../shared/strings';

export type ChatProps = {
  readonly locale?: ChatLocale;
  /** Host-owned user directory for avatars / display names / typing labels. */
  readonly users?: Readonly<Record<string, User>>;
  /**
   * Host clipboard for the Copy action (e.g. expo-clipboard).
   * When omitted, the copy icon is hidden.
   */
  readonly onCopy?: (message: Message) => void;
  /**
   * Host forwards the message into another chat. The button stays visible
   * either way; without this callback the press only closes the selection.
   */
  readonly onForward?: (message: Message) => void;
  /**
   * Replaces the built-in long-press. Chat does not open its selection bar.
   * The host opens its own sheet from this callback.
   */
  readonly onMessageLongPress?: (message: Message) => void;
  /**
   * Replaces the built-in tap menu (quick reactions + actions). Chat then only
   * calls this; the host opens its own UI.
   */
  readonly onMessagePress?: (message: Message) => void;
  /**
   * Emoji in the tap menu's quick strip. Defaults to the built-in quick set.
   * An empty list hides reactions in the menu. The adapter must accept every emoji offered.
   */
  readonly quickReactions?: readonly string[];
  /**
   * Host read cursor for the unread badge (see MessageList `firstUnreadId`).
   */
  readonly firstUnreadId?: string;
  /**
   * Host unread total for the scroll-to-latest badge (see MessageList `unreadCount`).
   */
  readonly unreadCount?: number;
  /**
   * Built-in scroll-to-latest arrow. `false` hides it so the host can render
   * its own control with `useScrollToLatest`.
   */
  readonly showScrollToLatest?: boolean;
  /**
   * Sequence-hole label in the list. `false` hides "Missing messages".
   * The hole stays in timeline state.
   */
  readonly showGapMarkers?: boolean;
  readonly messageListProps?: Omit<
    MessageListProps,
    | 'renderMessage'
    | 'renderMessageBody'
    | 'renderSwipeHint'
    | 'renderGap'
    | 'renderDay'
    | 'renderUnread'
    | 'renderEmpty'
    | 'renderListHeader'
    | 'locale'
    | 'users'
    | 'firstUnreadId'
    | 'unreadCount'
    | 'showScrollToLatest'
    | 'showGapMarkers'
    | 'contentBottomInset'
  >;
  readonly composerProps?: Omit<ComposerProps, 'draft' | 'onClearDraft' | 'showEmoji'>;
  /**
   * Extra lift when the keyboard is open (e.g. host tab bar).
   * Passed to KeyboardStickyView as `offset.opened` and mirrored on the list.
   */
  readonly keyboardVerticalOffset?: number;
  /**
   * Built-in emoji panel on the composer. `false` hides it.
   * A custom `renderComposer` receives the same flag and should hide its own control.
   */
  readonly showEmoji?: boolean;
  readonly renderMessage?: ChatSlots['renderMessage'];
  /**
   * Host-painted bubble inside swipe and long-press. The peer avatar stays.
   * Ignored when `renderMessage` replaces the whole row.
   */
  readonly renderMessageBody?: ChatSlots['renderMessageBody'];
  /**
   * Swipe-reply icon. The gesture stays in the SDK. Ignored when `renderMessage`
   * replaces the whole row.
   */
  readonly renderSwipeHint?: ChatSlots['renderSwipeHint'];
  readonly renderGap?: ChatSlots['renderGap'];
  readonly renderDay?: ChatSlots['renderDay'];
  readonly renderUnread?: ChatSlots['renderUnread'];
  readonly renderMessageActions?: ChatSlots['renderMessageActions'];
  /**
   * Host layout for the tap menu card: reactions and actions. Placement, backdrop,
   * Android back, and the full emoji panel stay in Chat.
   */
  readonly renderMessageMenu?: ChatSlots['renderMessageMenu'];
  readonly renderTyping?: ChatSlots['renderTyping'];
  readonly renderComposer?: ChatSlots['renderComposer'];
  readonly renderEmpty?: ChatSlots['renderEmpty'];
  readonly renderListHeader?: ChatSlots['renderListHeader'];
};
