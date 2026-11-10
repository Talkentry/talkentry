import type {
  ChatAdapter,
  ChatEvent,
  ChatEventListener,
  Message,
  MessagePage,
  UpdateReceiptsCommand,
} from '@talkentry/core';

export const message = (id: string, overrides: Partial<Message> = {}): Message => ({
  id,
  chatId: 'chat',
  senderId: 'other',
  createdAt: id.charCodeAt(0),
  text: id,
  status: 'sent',
  ...overrides,
});
export const page = (
  messages: readonly Message[] = [],
  more: Partial<MessagePage> = {},
): MessagePage => ({
  messages,
  hasMoreBefore: false,
  hasMoreAfter: false,
  ...more,
});
export const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};
export const flush = async () => {
  for (let i = 0; i < 15; i += 1) {
    await Promise.resolve();
  }
};
export const mockAdapter = () => {
  const listeners = new Set<ChatEventListener>();
  const loadLatest = jest.fn<Promise<MessagePage>, [unknown]>(async () => page());
  const loadBefore = jest.fn<Promise<MessagePage>, [unknown]>(async () => page());
  const loadAfter = jest.fn<Promise<MessagePage>, [unknown]>(async () => page());
  const loadAround = jest.fn<Promise<MessagePage>, [unknown]>(async () => page());
  const send = jest.fn<ReturnType<ChatAdapter['send']>, Parameters<ChatAdapter['send']>>(
    async (command) => message('server', { ...command, status: 'sent' }),
  );
  const updateReceipts = jest.fn(
    async (_command: UpdateReceiptsCommand): Promise<readonly Message[]> => [],
  );
  const editMessage = jest.fn(
    async (command: { messageId: string; text: string; actorId: string; chatId: string }) =>
      message(command.messageId, {
        text: command.text,
        senderId: command.actorId,
        status: 'sent',
        revision: 2,
        updatedAt: Date.now(),
      }),
  );
  const deleteMessage = jest.fn(
    async (command: { messageId: string; actorId: string; chatId: string }) => ({
      chatId: command.chatId,
      messageId: command.messageId,
      revision: 1,
    }),
  );
  const toggleReaction = jest.fn(
    async (command: { messageId: string; actorId: string; chatId: string; emoji: string }) =>
      message(command.messageId, {
        reactions: [{ emoji: command.emoji, userIds: [command.actorId] }],
        revision: 2,
        updatedAt: Date.now(),
      }),
  );
  const reconcileMessages = jest.fn(
    async (command: { chatId: string; messageIds: readonly string[] }) => ({
      messages: command.messageIds.map((id) => message(id)),
      removedIds: [] as string[],
    }),
  );
  const setTyping = jest.fn(async () => undefined);
  const loadEvents = jest.fn(
    async (): Promise<{
      events: ChatEvent[];
      latestCursor: number;
      hasMore: boolean;
    }> => ({
      events: [],
      latestCursor: 0,
      hasMore: false,
    }),
  );
  const adapter: ChatAdapter = {
    capabilities: {
      loadBefore: true,
      loadAfter: true,
      loadAround: true,
      // Off by default so history tests are not coupled to receipt timers.
      readReceipts: false,
      deliveryReceipts: false,
      editMessage: false,
      deleteMessage: false,
      uploadAttachment: false,
      reactions: false,
      threads: false,
      reconcileMessages: false,
      typingIndicators: false,
      loadEvents: false,
    },
    loadLatest,
    loadBefore,
    loadAfter,
    loadAround,
    send,
    updateReceipts,
    editMessage,
    deleteMessage,
    toggleReaction,
    reconcileMessages,
    setTyping,
    loadEvents,
    subscribe: (_chatId, listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    adapter,
    loadLatest,
    loadBefore,
    loadAfter,
    loadAround,
    send,
    updateReceipts,
    editMessage,
    deleteMessage,
    toggleReaction,
    reconcileMessages,
    setTyping,
    loadEvents,
    emit: (event: ChatEvent) => {
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
};
