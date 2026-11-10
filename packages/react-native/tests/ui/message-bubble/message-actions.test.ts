import { message } from '@test/chat-fixtures';

import { buildMessageActions } from '../../../src/ui/message-bubble/actions/messageActions';

describe('buildMessageActions', () => {
  it('lists own confirmed message actions in Telegram order with delete last', () => {
    const row = message('a', { text: 'hello', senderId: 'me' });
    const actions = buildMessageActions(row, 'me', 'en', {
      onReply: () => undefined,
      onEdit: () => undefined,
      onDelete: () => undefined,
      onCopy: () => undefined,
      onForward: () => undefined,
    });
    expect(actions.map((item) => item.id)).toEqual(['reply', 'copy', 'edit', 'forward', 'delete']);
    expect(actions.at(-1)?.destructive).toBe(true);
  });

  it('omits edit/delete for peer messages and skips pending local rows', () => {
    const peer = { ...message('b', { text: 'hi', senderId: 'peer' }) };
    const peerActions = buildMessageActions(peer, 'me', 'en', {
      onReply: () => undefined,
      onEdit: () => undefined,
      onDelete: () => undefined,
      onCopy: () => undefined,
      onForward: () => undefined,
    });
    expect(peerActions.map((item) => item.id)).toEqual(['reply', 'copy', 'forward']);
    expect(peerActions[0]?.label).toBe('Reply');

    const pending = { ...message('c', { text: 'x' }), id: 'local-1', localId: 'local-1' };
    expect(
      buildMessageActions(pending, 'me', 'en', {
        onReply: () => undefined,
        onEdit: () => undefined,
      }),
    ).toEqual([]);
  });

  it('hides copy and edit for a message without text', () => {
    const image = message('d', { text: '  ', senderId: 'me' });
    const actions = buildMessageActions(image, 'me', 'en', {
      onCopy: () => undefined,
      onEdit: () => undefined,
      onDelete: () => undefined,
    });
    expect(actions.map((item) => item.id)).toEqual(['delete']);
  });
});
