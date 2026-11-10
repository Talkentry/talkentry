import { message } from '@test/chat-fixtures';

import { buildMessageActions } from '../../../src/ui/message-bubble/actions/messageActions';
import { isGroupedWithPrevious } from '../../../src/ui/message-bubble/grouping';

describe('system messages', () => {
  it('excludes system rows from long-press actions', () => {
    const row = message('sys', { text: 'Chat created', system: true, senderId: 'system' });
    expect(
      buildMessageActions(row, 'me', 'en', {
        onReply: () => undefined,
        onEdit: () => undefined,
        onDelete: () => undefined,
      }),
    ).toEqual([]);
  });

  it('breaks sender grouping around system messages', () => {
    const senders: Record<string, string> = { a: 'u1', s: 'system', b: 'u1' };
    const systems = new Set(['s']);
    const rows = [
      { type: 'message' as const, key: 'a' },
      { type: 'message' as const, key: 's' },
      { type: 'message' as const, key: 'b' },
    ];
    expect(
      isGroupedWithPrevious(
        rows,
        2,
        (key) => senders[key],
        (key) => systems.has(key),
      ),
    ).toBe(false);
  });
});
