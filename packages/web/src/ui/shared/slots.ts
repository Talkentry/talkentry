import type { Message, MessageStatus, TimelineGap, User, UserId } from '@talkentry/core';
import type { MouseEvent, MutableRefObject, ReactNode } from 'react';

import type { ComposerDraft } from '../composer/types';
import type { MessageActionItem } from '../message-bubble/actions/messageActions';
import type { ChatLocale } from './strings';

export type RenderMessageParams = {
  /** Active message version from MessageStore. */
  readonly message: Message;
  /** Viewer id used to decide incoming vs own. */
  readonly currentUserId: UserId;
  readonly locale: ChatLocale;
  readonly index: number;
  /** False when this row continues a same-sender group (hide the peer name). */
  readonly showSenderHeader: boolean;
  /** Incoming avatar belongs on the last bubble of a same-sender run. */
  readonly showAvatar: boolean;
  readonly groupedWithPrevious: boolean;
  /** True when a later same-sender message continues this run. */
  readonly groupedWithNext: boolean;
  /** Host user directory passed to Chat or MessageList. */
  readonly users?: Readonly<Record<string, User>>;
  /**
   * Opens Chat's context menu. A full custom row should call this from
   * `onContextMenu` if it wants the built-in actions/reactions.
   */
  readonly onContextMenu?: (event: MouseEvent, message: Message) => void;
  /** Toggle a reaction on this message. */
  readonly onReact?: (message: Message, emoji: string) => void;
  /** Opens Chat's reply draft. */
  readonly onReply?: (message: Message) => void;
};

/**
 * Host-painted bubble. The row and peer avatar stay outside this slot.
 * The built-in fill is omitted, so the host paints its own background.
 * Ignored when `renderMessage` replaces the row.
 */
export type RenderMessageBodyParams = {
  readonly message: Message;
  /** Parent of `message.replyToId` when it is still in the retained window. */
  readonly replyParent?: Message;
  readonly currentUserId: UserId;
  readonly isMine: boolean;
  /** Wall-clock label already formatted `HH:mm`. */
  readonly timeLabel: string;
  readonly status?: MessageStatus;
  readonly edited: boolean;
  readonly locale: ChatLocale;
  /** False when this row continues a same-sender group (hide the peer name). */
  readonly showSenderHeader: boolean;
  /** Incoming avatar belongs on the last bubble of a same-sender run. */
  readonly showAvatar: boolean;
  readonly groupedWithPrevious: boolean;
  /** True when a later same-sender message continues this run. */
  readonly groupedWithNext: boolean;
  readonly senderLabel: string;
  readonly users?: Readonly<Record<string, User>>;
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

export type RenderMessageMenuParams = {
  readonly message: Message;
  readonly x: number;
  readonly y: number;
  readonly actions: readonly MessageActionItem[];
  readonly selectedReaction?: string;
  readonly locale: ChatLocale;
  readonly onReact?: (emoji: string) => void;
  readonly onSelect: (action: MessageActionItem) => void;
  readonly onClose: () => void;
};

export type RenderComposerParams = {
  readonly draft: ComposerDraft | null;
  readonly onClearDraft: () => void;
  readonly locale: ChatLocale;
  readonly showEmoji: boolean;
  readonly composerFocusKey: number;
  readonly emojiPinned: boolean;
  readonly onEmojiPinnedChange: (pinned: boolean) => void;
  readonly emojiInsertRef: MutableRefObject<((emoji: string) => void) | null>;
};

export type RenderEmptyParams = {
  readonly error: Error | null;
  readonly locale: ChatLocale;
};

/**
 * Built-in Chat pieces. Keep `list` mounted — do not copy timeline keys
 * into a second array. Place `emojiSidebar` in a `position: relative` shell
 * if you want the overlay on the right.
 */
export type RenderChatParts = {
  readonly list: ReactNode;
  readonly composer: ReactNode;
  readonly typing: ReactNode;
  readonly emojiSidebar: ReactNode;
  readonly contextMenu: ReactNode;
  readonly emojiPinned: boolean;
};

export type ChatSlots = {
  /**
   * Replaces the Chat frame. Session, drafts, and menus stay in Chat;
   * the host only rearranges the nodes it is given.
   */
  readonly renderChat?: (parts: RenderChatParts) => ReactNode;
  /** Replaces the whole message row. */
  readonly renderMessage?: (params: RenderMessageParams) => ReactNode;
  /** Replaces the bubble fill. Ignored when `renderMessage` is set. */
  readonly renderMessageBody?: (params: RenderMessageBodyParams) => ReactNode;
  readonly renderGap?: (params: RenderGapParams) => ReactNode;
  readonly renderDay?: (params: RenderDayParams) => ReactNode;
  readonly renderTyping?: (params: RenderTypingParams) => ReactNode;
  readonly renderComposer?: (params: RenderComposerParams) => ReactNode;
  readonly renderEmpty?: (params: RenderEmptyParams) => ReactNode;
  readonly renderListHeader?: (params: RenderListHeaderParams) => ReactNode;
  /** Replaces the right-click menu. Chat still opens/closes it. */
  readonly renderMessageMenu?: (params: RenderMessageMenuParams) => ReactNode;
};
