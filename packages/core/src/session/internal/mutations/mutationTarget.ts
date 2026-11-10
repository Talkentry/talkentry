import type { Message } from '../../../core/message';
import type { SessionHandle } from '../session-handle';

export const MessageMutation = {
  Edit: 'edit',
  Delete: 'delete',
  React: 'react',
} as const;
type MessageMutation = (typeof MessageMutation)[keyof typeof MessageMutation];

/** Keep command permissions independent from presentation-level action availability. */
export const requireMutationTarget = (
  session: SessionHandle,
  messageId: string,
  mutation: MessageMutation,
): Message => {
  const message = session.messageStore.get(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  if (mutation !== MessageMutation.React && message.senderId !== session.options.currentUserId) {
    throw new Error(`Only the sender can ${mutation} this message`);
  }

  if (message.id === message.localId) {
    const verb = mutation === MessageMutation.React ? 'react to' : mutation;
    throw new Error(`Cannot ${verb} an unconfirmed message`);
  }

  return message;
};
