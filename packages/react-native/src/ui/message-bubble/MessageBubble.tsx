import { memo } from 'react';

import { useOptionalTalkentrySession } from '../../react/context';
import { MessageBubbleConnected } from './connected/MessageBubbleConnected';
import type { MessageBubbleProps } from './types';
import { MessageBubbleView } from './view/MessageBubbleView';

export type { MessageBubbleProps } from './types';

/**
 * Message row. Prefer `messageId` under TalkentryProvider so receipt/status
 * updates re-render only this bubble.
 *
 * - `messageId` + provider → `connected/`
 * - `message` prop → dumb `view/`
 */
export const MessageBubble = memo(
  ({
    messageId,
    message,
    onQuotePress,
    onNavigationFocus,
    replyParent,
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
  }: MessageBubbleProps) => {
    const session = useOptionalTalkentrySession();

    if (messageId != null && session != null) {
      return (
        <MessageBubbleConnected
          messageId={messageId}
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
        />
      );
    }

    if (message == null) {
      throw new Error('MessageBubble requires `message`, or `messageId` inside TalkentryProvider.');
    }

    return (
      <MessageBubbleView
        message={message}
        onQuotePress={onQuotePress}
        onNavigationFocus={onNavigationFocus}
        replyParent={replyParent}
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
      />
    );
  },
);

MessageBubble.displayName = 'MessageBubble';
