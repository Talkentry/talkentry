import { dayRowKey, gapKey, UNREAD_ROW_KEY } from '@talkentry/core';

import { isGroupedWithPrevious } from '../../../src/ui/message-bubble/grouping';
import { formatMessageTime } from '../../../src/ui/message-bubble/view/messageTime';

describe('message grouping', () => {
  it('groups consecutive same-sender messages and breaks on day/gap/unread', () => {
    const senders: Record<string, string> = {
      a: 'u1',
      b: 'u1',
      c: 'u2',
      d: 'u2',
      e: 'u2',
      f: 'u2',
    };
    const rows = [
      { type: 'message' as const, key: 'a' },
      { type: 'message' as const, key: 'b' },
      { type: 'day' as const, key: dayRowKey('2026-01-02'), dayKey: '2026-01-02', createdAt: 1 },
      { type: 'message' as const, key: 'c' },
      {
        type: 'gap' as const,
        key: gapKey('c', 'd'),
        gap: { key: gapKey('c', 'd'), afterId: 'c', beforeId: 'd' },
      },
      { type: 'message' as const, key: 'd' },
      { type: 'message' as const, key: 'e' },
      { type: 'unread' as const, key: UNREAD_ROW_KEY, beforeId: 'f' },
      { type: 'message' as const, key: 'f' },
    ];
    const getSender = (key: string) => senders[key];
    expect(isGroupedWithPrevious(rows, 0, getSender)).toBe(false);
    expect(isGroupedWithPrevious(rows, 1, getSender)).toBe(true);
    expect(isGroupedWithPrevious(rows, 3, getSender)).toBe(false);
    expect(isGroupedWithPrevious(rows, 5, getSender)).toBe(false);
    expect(isGroupedWithPrevious(rows, 6, getSender)).toBe(true);
    expect(isGroupedWithPrevious(rows, 8, getSender)).toBe(false);
  });
});

describe('message time', () => {
  it('formats local HH:mm in 24h', () => {
    const noon = new Date(2026, 0, 15, 14, 5, 0).getTime();
    expect(formatMessageTime(noon, 'en')).toMatch(/14:05/);
  });
});
