import { useMessage } from '../../react/hooks';
import { MessageBubble } from '../message-bubble/MessageBubble';
import type { MessageListProps } from './types';

export const MessageRow = ({
  messageKey,
  index,
  currentUserId,
  locale,
  users,
  groupedWithPrevious,
  groupedWithNext,
  onContextMenu,
  onReact,
  onReply,
  renderMessage,
  renderMessageBody,
}: {
  readonly messageKey: string;
  readonly index: number;
  readonly currentUserId: string;
  readonly groupedWithPrevious?: boolean;
  readonly groupedWithNext?: boolean;
} & Pick<
  MessageListProps,
  | 'locale'
  | 'users'
  | 'onContextMenu'
  | 'onReact'
  | 'onReply'
  | 'renderMessage'
  | 'renderMessageBody'
>) => {
  const message = useMessage(messageKey);

  if (!message) {
    return null;
  }

  const withPrevious = Boolean(groupedWithPrevious);
  const withNext = Boolean(groupedWithNext);
  const showAvatar = message.senderId !== currentUserId && !withNext;

  return (
    <div data-message-key={messageKey}>
      {renderMessage ? (
        renderMessage({
          message,
          currentUserId,
          locale: locale ?? 'en',
          index,
          showSenderHeader: !withPrevious,
          showAvatar,
          groupedWithPrevious: withPrevious,
          groupedWithNext: withNext,
          users,
          onContextMenu,
          onReact,
          onReply,
        })
      ) : (
        <MessageBubble
          message={message}
          currentUserId={currentUserId}
          locale={locale}
          user={users?.[message.senderId]}
          users={users}
          groupedWithPrevious={withPrevious}
          groupedWithNext={withNext}
          onContextMenu={onContextMenu}
          onReact={onReact}
          renderMessageBody={renderMessageBody}
        />
      )}
    </div>
  );
};
