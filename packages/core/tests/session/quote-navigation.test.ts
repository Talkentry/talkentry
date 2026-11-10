import { ChatEventType, ChatSession } from '@talkentry/core';
import { flush, message, mockAdapter, page } from '@test/chat-fixtures';

it('keeps the old window and does not admit an around page missing its requested target', async () => {
  const mock = mockAdapter();
  mock.loadLatest.mockResolvedValue(page([message('old')]));
  mock.loadAround.mockResolvedValue(page([message('unrelated')]));
  const session = new ChatSession({ adapter: mock.adapter, chatId: 'chat', currentUserId: 'me' });
  session.start();
  try {
    await flush();
    expect(await session.loadAround('deleted')).toBe(false);
    expect(session.getSnapshot().messageKeys).toEqual(['old']);
    expect(session.messageStore.get('unrelated')).toBeUndefined();
    expect(session.getSnapshot().change.kind).not.toBe('around');
  } finally {
    session.stop();
  }
});

it('does not resurrect a tombstoned target or retain unrelated page entities after a failed jump', async () => {
  const mock = mockAdapter();
  mock.loadLatest.mockResolvedValue(page([message('old')]));
  mock.loadAround.mockResolvedValue(page([message('deleted'), message('unrelated')]));
  const session = new ChatSession({ adapter: mock.adapter, chatId: 'chat', currentUserId: 'me' });
  session.start();
  try {
    await flush();
    mock.emit({
      type: ChatEventType.MessageRemoved,
      chatId: 'chat',
      messageId: 'deleted',
      revision: 2,
    });
    expect(await session.loadAround('deleted')).toBe(false);
    expect(session.getSnapshot().messageKeys).toEqual(['old']);
    expect(session.messageStore.get('deleted')).toBeUndefined();
    expect(session.messageStore.get('unrelated')).toBeUndefined();
  } finally {
    session.stop();
  }
});
