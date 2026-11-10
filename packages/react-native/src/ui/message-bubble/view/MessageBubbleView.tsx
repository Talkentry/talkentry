import type { Message, User, UserId } from '@talkentry/core';
import { type ReactElement, useMemo, useState } from 'react';

import { useTalkentryTheme } from '../../../theme';
import type {
  MessageAnchorMeasure,
  RenderMessageActionsParams,
  RenderMessageBodyParams,
} from '../../shared/slots';
import type { ChatLocale } from '../../shared/strings';
import { MessageActionSheet } from '../actions/ActionSheet';
import {
  buildMessageActions,
  type MessageActionHandlers,
  type MessageActionItem,
} from '../actions/messageActions';
import { runMessageAction } from '../actions/runMessageAction';
import type { MessageBubbleProps } from '../types';
import {
  bubbleAccessibilityHint,
  bubbleAccessibilityLabel,
  receiptAccessibilityLabel,
} from './bubbleAccessibility';
import { BubbleContent } from './BubbleContent';
import { formatMessageTime } from './messageTime';
import { receiptTicks } from './receiptTicks';
import { createBubbleStyles } from './styles';
import { SwipeReplyShell } from './SwipeReplyShell';
import { SystemMessageRow } from './SystemMessageRow';

export type MessageBubbleViewProps = {
  readonly onQuotePress?: MessageBubbleProps['onQuotePress'];
  readonly onNavigationFocus?: MessageBubbleProps['onNavigationFocus'];
  readonly message: Message;
  readonly currentUserId: UserId;
  readonly users?: Readonly<Record<string, User>>;
  readonly showSenderHeader?: boolean;
  readonly groupedWithPrevious?: boolean;
  readonly locale?: ChatLocale;
  readonly onReply?: (message: Message) => void;
  readonly onEdit?: (message: Message) => void;
  readonly onDelete?: (message: Message) => void;
  readonly onCopy?: (message: Message) => void;
  readonly onReact?: (message: Message, emoji: string) => void;
  readonly onLongPress?: (message: Message) => void;
  readonly onPress?: (message: Message, measure: MessageAnchorMeasure) => void;
  readonly consumeListTap?: () => void;
  readonly renderMessageActions?: (params: RenderMessageActionsParams) => ReactElement | null;
  readonly renderMessageBody?: MessageBubbleProps['renderMessageBody'];
  readonly renderSwipeHint?: MessageBubbleProps['renderSwipeHint'];
  readonly renderSystemMessage?: MessageBubbleProps['renderSystemMessage'];
  readonly replyParent?: Message;
};

/**
 * Dumb bubble UI. No store subscription — parent passes `message` (+ optional reply parent).
 */
export const MessageBubbleView = ({
  message,
  onQuotePress,
  onNavigationFocus,
  currentUserId,
  users,
  showSenderHeader = true,
  groupedWithPrevious = false,
  locale = 'en',
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onReact,
  onLongPress,
  onPress,
  consumeListTap,
  renderMessageActions,
  renderMessageBody,
  renderSwipeHint,
  renderSystemMessage,
  replyParent,
}: MessageBubbleViewProps): ReactElement | null => {
  const theme = useTalkentryTheme();
  const styles = useMemo(() => createBubbleStyles(theme), [theme]);
  const [menuOpen, setMenuOpen] = useState(false);

  const isMine = message.senderId === currentUserId;
  const sender = users?.[message.senderId];
  const senderLabel = sender?.name ?? message.senderId;
  const timeLabel = formatMessageTime(message.createdAt, locale);
  const receipt = isMine ? receiptTicks(message.status, locale) : null;
  const edited = message.updatedAt !== undefined && message.updatedAt > message.createdAt;
  const confirmed = message.id !== message.localId;
  const canSwipeReply = confirmed && !!onReply && !message.system;
  const actionHandlers: MessageActionHandlers = {
    onReply,
    onEdit,
    onDelete,
    // Host-owned clipboard (Expo Go has no RNCCClipboard native module).
    onCopy: onCopy && message.text?.trim() ? onCopy : undefined,
  };
  const actions = buildMessageActions(message, currentUserId, locale, actionHandlers);
  const canOpenMenu =
    confirmed && !message.system && (!!onLongPress || actions.length > 0 || !!onReact);
  const canTap = confirmed && !message.system && !!onPress;

  const closeMenu = () => setMenuOpen(false);
  const statusLabel = receiptAccessibilityLabel(message.status, locale);

  if (message.system) {
    return (
      <SystemMessageRow
        message={message}
        locale={locale}
        styles={styles}
        renderSystemMessage={renderSystemMessage}
      />
    );
  }

  const bodyParams: RenderMessageBodyParams = {
    onQuotePress,
    message,
    replyParent,
    currentUserId,
    isMine,
    timeLabel,
    status: message.status,
    edited,
    locale,
    showSenderHeader,
    groupedWithPrevious,
    senderLabel,
    users,
  };
  const body = renderMessageBody ? renderMessageBody(bodyParams) : undefined;
  const row = (
    <BubbleContent
      onQuotePress={onQuotePress}
      onNavigationFocus={onNavigationFocus}
      message={message}
      currentUserId={currentUserId}
      users={users}
      showSenderHeader={showSenderHeader}
      groupedWithPrevious={groupedWithPrevious}
      locale={locale}
      isMine={isMine}
      senderLabel={senderLabel}
      timeLabel={timeLabel}
      receipt={receipt}
      receiptAccessibilityLabel={statusLabel}
      edited={edited}
      canOpenMenu={canOpenMenu}
      accessibilityLabel={bubbleAccessibilityLabel({
        isMine,
        senderLabel,
        text: message.text,
        timeLabel,
      })}
      accessibilityHint={bubbleAccessibilityHint({
        locale,
        canOpenMenu,
        canSwipeReply,
        isMine,
        receiptStatusLabel: statusLabel,
      })}
      replyParent={replyParent}
      styles={styles}
      onPress={
        canTap
          ? (measure) => {
              consumeListTap?.();
              onPress?.(message, measure);
            }
          : undefined
      }
      onOpenMenu={() => {
        consumeListTap?.();
        if (onLongPress) {
          onLongPress(message);

          return;
        }
        setMenuOpen(true);
      }}
      onReact={onReact}
      consumeListTap={consumeListTap}
      body={body}
    />
  );

  const handleAction = (action: MessageActionItem) => {
    closeMenu();
    runMessageAction(action, message, {
      onReply,
      onEdit,
      onDelete,
      onCopy,
    });
  };

  let actionSheet: ReactElement | null = null;

  if (menuOpen) {
    actionSheet = renderMessageActions?.({
      message,
      actions,
      locale,
      onClose: closeMenu,
      onAction: handleAction,
      onReact,
    }) ?? (
      <MessageActionSheet
        visible={menuOpen}
        message={message}
        locale={locale}
        actions={actions}
        onClose={closeMenu}
        onAction={handleAction}
        onReact={onReact}
      />
    );
  }

  return (
    <>
      <SwipeReplyShell
        enabled={canSwipeReply}
        message={message}
        onReply={onReply}
        styles={styles}
        renderSwipeHint={renderSwipeHint}
      >
        {row}
      </SwipeReplyShell>
      {actionSheet}
    </>
  );
};
