import type { Message, MessageId, User, UserId } from '@talkentry/core';
import type { ReactElement } from 'react';

import { useMessage } from '../../../react/hooks';
import type { RenderMessageActionsParams } from '../../shared/slots';
import type { ChatLocale } from '../../shared/strings';
import type { MessageBubbleProps } from '../types';
import { MessageBubbleView } from '../view/MessageBubbleView';

/**
 * Session-backed bubble: subscribes to `messageId` (+ reply parent) in the store.
 */
export const MessageBubbleConnected = ({
  messageId,
  onQuotePress,
  onNavigationFocus,
  currentUserId,
  users,
  showSenderHeader,
  groupedWithPrevious,
  locale,
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
}: {
  readonly messageId: MessageId;
  readonly onQuotePress?: MessageBubbleProps['onQuotePress'];
  readonly onNavigationFocus?: MessageBubbleProps['onNavigationFocus'];
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
  readonly onLongPress?: MessageBubbleProps['onLongPress'];
  readonly onPress?: MessageBubbleProps['onPress'];
  readonly consumeListTap?: MessageBubbleProps['consumeListTap'];
  readonly renderMessageActions?: (params: RenderMessageActionsParams) => ReactElement | null;
  readonly renderMessageBody?: MessageBubbleProps['renderMessageBody'];
  readonly renderSwipeHint?: MessageBubbleProps['renderSwipeHint'];
  readonly renderSystemMessage?: MessageBubbleProps['renderSystemMessage'];
}) => {
  const message = useMessage(messageId);
  const replyParent = useMessage(message?.replyToId ?? messageId);

  if (message == null) {
    return null;
  }

  return (
    <MessageBubbleView
      message={message}
      onQuotePress={onQuotePress}
      onNavigationFocus={onNavigationFocus}
      currentUserId={currentUserId}
      users={users}
      showSenderHeader={showSenderHeader}
      groupedWithPrevious={groupedWithPrevious}
      locale={locale}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
      onCopy={onCopy}
      onReact={onReact}
      onLongPress={onLongPress}
      onPress={onPress}
      consumeListTap={consumeListTap}
      renderMessageActions={renderMessageActions}
      renderMessageBody={renderMessageBody}
      renderSwipeHint={renderSwipeHint}
      renderSystemMessage={renderSystemMessage}
      replyParent={message.replyToId ? replyParent : undefined}
    />
  );
};
