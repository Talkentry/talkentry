import { useTalkentrySession } from '../context/TalkentryContext';

export type { SendMessageInput } from '@talkentry/core';

export const useSendMessage = () => {
  const session = useTalkentrySession();

  return {
    sendMessage: session.send,
    editMessage: session.edit,
    deleteMessage: session.delete,
    toggleReaction: session.toggleReaction,
    enterThread: session.enterThread,
    leaveThread: session.leaveThread,
    getThreadId: session.getThreadId,
    setTyping: session.setTyping,
  };
};

export type UseSendMessageResult = ReturnType<typeof useSendMessage>;
