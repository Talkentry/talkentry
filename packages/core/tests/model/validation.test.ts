import { assertPage, ChatEventType, isChatEvent, isMessage } from '@talkentry/core';
import { message, page } from '@test/chat-fixtures';

describe('untrusted payload contracts', () => {
  it('accepts a valid page and scoped event', () => {
    expect(assertPage(page([message('a')]), 'chat').messages).toHaveLength(1);
    expect(isChatEvent({ type: ChatEventType.MessageAdded, message: message('a') }, 'chat')).toBe(
      true,
    );
  });
  it.each([
    null,
    {},
    { type: ChatEventType.MessageUpdated },
    { type: ChatEventType.MessageStatus, chatId: 'chat', messageId: 'a', status: 'unknown' },
    { type: ChatEventType.MessageRemoved, chatId: 'other', messageId: 'a' },
    { type: ChatEventType.HistoryInvalidated, chatId: 'other' },
  ])('rejects malformed or foreign events: %j', (event) => {
    expect(isChatEvent(event, 'chat')).toBe(false);
  });
  it.each([
    { createdAt: NaN },
    { revision: -1 },
    { revision: 1.5 },
    { senderId: '' },
    { text: 'x'.repeat(65537) },
    { attachments: new Array(33).fill({}) },
    { metadata: { oversized: 'x'.repeat(17000) } },
  ])('rejects invalid message fields', (override) => {
    expect(isMessage({ ...message('a'), ...override }, 'chat')).toBe(false);
  });
  it('rejects oversized pages and cycles without throwing in the event listener', () => {
    expect(() => assertPage(page(new Array(1001).fill(message('a'))), 'chat')).toThrow();
    const metadata: Record<string, unknown> = {};
    metadata.self = metadata;
    expect(isMessage(message('a', { metadata }), 'chat')).toBe(false);
  });
  it('accepts optional history gaps and rejects malformed ones', () => {
    expect(
      assertPage(
        page([message('a'), message('c')], {
          gaps: [{ afterId: 'a', beforeId: 'c', missingCount: 1 }],
        }),
        'chat',
      ).gaps,
    ).toEqual([{ afterId: 'a', beforeId: 'c', missingCount: 1 }]);
    expect(() =>
      assertPage(page([message('a')], { gaps: [{ afterId: 'a', beforeId: 'a' }] }), 'chat'),
    ).toThrow('scope');
  });
});
