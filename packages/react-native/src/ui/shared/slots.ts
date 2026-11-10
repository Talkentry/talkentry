import type { Message, MessageId, MessageStatus, TimelineGap, User, UserId } from '@talkentry/core';
import type { ComponentRef, ReactElement, ReactNode } from 'react';
import type { Animated, View } from 'react-native';

import type { ComposerDraft } from '../composer/types';
import type { MessageActionItem } from '../message-bubble/actions/messageActions';
import type { ChatLocale } from './strings';

/**
 * Reads the pressed bubble frame in window coordinates. Call it when the menu
 * is about to open: the keyboard may still be moving the list.
 */
export type MessageAnchorMeasure = (
  callback: (x: number, y: number, width: number, height: number) => void,
) => void;

export type MessageFocusHandler = (node: ComponentRef<typeof View> | null) => void;

export type RenderMessageParams = {
  /** Navigate to the quoted message, independently from the bubble menu. */
  readonly onQuotePress?: (messageId: string) => void;
  /** Forward to MessageBubble to restore accessibility focus after arrival. */
  readonly onNavigationFocus?: MessageFocusHandler;
  readonly messageId?: MessageId;
  readonly message?: Message;
  readonly currentUserId: UserId;
  readonly locale: ChatLocale;
  readonly index: number;
  /** False when this row continues a same-sender group (hide name/avatar). */
  readonly showSenderHeader: boolean;
  readonly groupedWithPrevious: boolean;
  /**
   * Opens Chat's reply draft. Set when Chat renders the row.
   * A full custom row calls this from its own gesture.
   */
  readonly onReply?: (message: Message) => void;
  /**
   * Chat long-press. Opens the selection bar, or the host sheet when
   * `onMessageLongPress` is set. A full custom row calls this itself.
   */
  readonly onLongPress?: (message: Message) => void;
  /**
   * Chat tap. Opens the reaction and action menu next to the bubble, or calls
   * `onMessagePress` when the host set it. A full custom row calls this itself.
   */
  readonly onPress?: (message: Message, measure: MessageAnchorMeasure) => void;
  /**
   * Call from a custom row's press or long-press so a blank-list tap does not
   * dismiss the keyboard or emoji sheet.
   */
  readonly consumeListTap?: () => void;
};

/**
 * Host-painted bubble. The row, peer avatar, swipe, and long-press stay
 * outside this slot. The built-in fill and padding are omitted, so the name
 * can sit above the host's own background.
 */
export type RenderMessageBodyParams = {
  /** A custom quote can call this with message.replyToId. */
  readonly onQuotePress?: (messageId: string) => void;
  /** Active message version. */
  readonly message: Message;
  /** Parent of `message.replyToId` when it is still in the retained window. */
  readonly replyParent?: Message;
  /** Viewer id used to decide `isMine`. */
  readonly currentUserId: UserId;
  /** True when `message.senderId` is `currentUserId`. */
  readonly isMine: boolean;
  /** Wall-clock label already formatted for `locale`. */
  readonly timeLabel: string;
  /** Delivery status. The built-in ticks draw this only for own messages. */
  readonly status?: MessageStatus;
  /** True when `updatedAt` is later than `createdAt`. */
  readonly edited: boolean;
  /** Active locale of the list. */
  readonly locale: ChatLocale;
  /** False when this row continues a same-sender group. */
  readonly showSenderHeader: boolean;
  /** True when the previous row is the same non-system sender. */
  readonly groupedWithPrevious: boolean;
  /** `users[senderId].name`, or the sender id when the directory has no name. */
  readonly senderLabel: string;
  /** Host user directory passed to Chat or MessageList. */
  readonly users?: Readonly<Record<string, User>>;
};

/**
 * Graphic revealed while the row is swiped toward reply.
 * The shell positions it and fades it; the gesture threshold stays in the SDK.
 */
export type RenderSwipeHintParams = {
  /**
   * 0 at rest, 1 once the swipe is armed. Extra rubber past the catch stays at 1.
   * Bind this interpolation in a style. Do not read it during render.
   */
  readonly progress: Animated.AnimatedInterpolation<number>;
};

export type RenderGapParams = {
  readonly gap: TimelineGap;
  readonly locale: ChatLocale;
};

export type RenderDayParams = {
  readonly dayKey: string;
  readonly createdAt: number;
  readonly label: string;
  readonly locale: ChatLocale;
};

export type RenderUnreadParams = {
  readonly beforeId: string;
  readonly label: string;
  readonly locale: ChatLocale;
};

export type RenderTypingParams = {
  readonly userIds: readonly UserId[];
  readonly label: string;
  readonly locale: ChatLocale;
};

export type RenderListHeaderParams = {
  readonly hasMoreBefore: boolean;
  readonly loading: boolean;
  readonly onLoadOlder: () => void;
  readonly locale: ChatLocale;
};

export type RenderMessageActionsParams = {
  readonly message: Message;
  readonly actions: readonly MessageActionItem[];
  readonly locale: ChatLocale;
  readonly onClose: () => void;
  readonly onAction: (action: MessageActionItem) => void;
  readonly onReact?: (message: Message, emoji: string) => void;
};

/**
 * Card of the tap menu. Chat keeps the backdrop, placement next to the bubble,
 * Android back, and the full emoji panel; the host paints what sits by the bubble.
 */
export type RenderMessageMenuParams = {
  /** Message the menu acts on. */
  readonly message: Message;
  /** True for the viewer's own message. The card is aligned to the right edge. */
  readonly isMine: boolean;
  /** Rows from `buildMessageActions`, delete last. */
  readonly actions: readonly MessageActionItem[];
  /** Chat `quickReactions`. Empty when reactions are off. */
  readonly quickReactions: readonly string[];
  /** The viewer's current reaction on this message. */
  readonly selectedReaction?: string;
  readonly locale: ChatLocale;
  /** Closes the menu, then sets, replaces, or (same emoji) removes the viewer's reaction. */
  readonly onReact: (emoji: string) => void;
  /** Closes the menu and runs the action. */
  readonly onAction: (action: MessageActionItem) => void;
  /** Swaps the card for the built-in full emoji panel. A tap outside the panel comes back. */
  readonly onExpandReactions: () => void;
  readonly onClose: () => void;
};

export type RenderComposerParams = {
  /** Reply/edit draft owned by Chat. Null when the composer is idle. */
  readonly draft: ComposerDraft | null;
  /** Clears the reply/edit draft after send or cancel. */
  readonly onClearDraft: () => void;
  readonly locale: ChatLocale;
  /**
   * Chat `showEmoji`. Custom composers should hide their emoji control when false.
   */
  readonly showEmoji: boolean;
  /**
   * Bumps when Chat starts a reply, not when the quoted message is swapped.
   * Focus the input so the keyboard opens, as Telegram does.
   */
  readonly composerFocusKey: number;
};

export type ChatSlots = {
  readonly renderMessage?: (params: RenderMessageParams) => ReactElement | null;
  /**
   * Replaces the bubble, including its background. Swipe-to-reply, long-press,
   * and the peer avatar stay. Ignored when `renderMessage` replaces the row.
   */
  readonly renderMessageBody?: (params: RenderMessageBodyParams) => ReactNode;
  /**
   * Replaces the swipe-reply icon. Omit to keep the built-in reply arrow.
   * Ignored when `renderMessage` replaces the whole row.
   */
  readonly renderSwipeHint?: (params: RenderSwipeHintParams) => ReactNode;
  readonly renderGap?: (params: RenderGapParams) => ReactElement | null;
  readonly renderDay?: (params: RenderDayParams) => ReactElement | null;
  readonly renderUnread?: (params: RenderUnreadParams) => ReactElement | null;
  readonly renderMessageActions?: (params: RenderMessageActionsParams) => ReactElement | null;
  /** Replaces the tap menu card. Ignored when `onMessagePress` takes the tap. */
  readonly renderMessageMenu?: (params: RenderMessageMenuParams) => ReactNode;
  readonly renderTyping?: (params: RenderTypingParams) => ReactNode;
  readonly renderComposer?: (params: RenderComposerParams) => ReactNode;
  readonly renderEmpty?: (params: {
    readonly error: Error | null;
    readonly locale: ChatLocale;
  }) => ReactNode;
  readonly renderListHeader?: (params: RenderListHeaderParams) => ReactNode;
};
