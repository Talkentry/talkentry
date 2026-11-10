import type { Message, MessageId, User, UserId } from '@talkentry/core';
import type { ReactElement, ReactNode } from 'react';

import type {
  MessageAnchorMeasure,
  MessageFocusHandler,
  RenderMessageActionsParams,
  RenderMessageBodyParams,
  RenderSwipeHintParams,
} from '../shared/slots';
import type { ChatLocale } from '../shared/strings';

export type MessageBubbleProps = {
  readonly onQuotePress?: (messageId: string) => void;
  readonly onNavigationFocus?: MessageFocusHandler;
  readonly replyParent?: Message;
  readonly locale?: ChatLocale;
  readonly messageId?: MessageId;
  readonly message?: Message;
  readonly currentUserId: UserId;
  readonly users?: Readonly<Record<string, User>>;
  readonly showSenderHeader?: boolean;
  readonly groupedWithPrevious?: boolean;
  readonly onReply?: (message: Message) => void;
  readonly onEdit?: (message: Message) => void;
  readonly onDelete?: (message: Message) => void;
  readonly onCopy?: (message: Message) => void;
  readonly onReact?: (message: Message, emoji: string) => void;
  /**
   * Replaces the built-in action sheet. Chat uses this for the selection bar
   * or a host-owned sheet.
   */
  readonly onLongPress?: (message: Message) => void;
  /**
   * Single tap on a confirmed bubble. `measure` reads the bubble frame so the
   * caller can anchor a menu. Taps on images, quotes, and chips keep their own action.
   */
  readonly onPress?: (message: Message, measure: MessageAnchorMeasure) => void;
  /** Marks this press so the list does not treat it as a blank-canvas tap. */
  readonly consumeListTap?: () => void;
  /**
   * Host-painted bubble inside swipe-to-reply and long-press.
   * The peer avatar stays on the row. Omit to keep the built-in bubble.
   */
  readonly renderMessageBody?: (params: RenderMessageBodyParams) => ReactNode;
  /**
   * Icon revealed by swipe-to-reply. Catch point, flick, rubber, and snap stay in the SDK.
   */
  readonly renderSwipeHint?: (params: RenderSwipeHintParams) => ReactNode;
  readonly renderMessageActions?: (params: RenderMessageActionsParams) => ReactElement | null;
  readonly renderSystemMessage?: (params: {
    readonly message: Message;
    readonly locale: ChatLocale;
  }) => ReactElement | null;
};
