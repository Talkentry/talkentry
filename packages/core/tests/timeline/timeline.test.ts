import { createTimelineReducer, initialTimelineWindow, type TimelineItem } from '@talkentry/core';

const item = (id: string): TimelineItem => ({ key: id, id, createdAt: id.charCodeAt(0) });
const reducer = createTimelineReducer({ maxMessages: 3 });
describe('structural timeline', () => {
  it('deduplicates within one page', () => {
    const s = reducer(initialTimelineWindow(), {
      type: 'commit',
      kind: 'initial',
      items: [item('b'), item('a'), item('a')],
      ready: true,
    });
    expect(s.messageKeys).toEqual(['a', 'b']);
    expect(s.status).toBe('ready');
  });
  it('derives both boundaries from the retained window after prepend trim', () => {
    const s = reducer(initialTimelineWindow(), {
      type: 'commit',
      kind: 'older',
      items: ['a', 'b', 'c', 'd'].map(item),
      hasMoreBefore: false,
    });
    expect(s.messageKeys).toEqual(['a', 'b', 'c']);
    expect(s.oldestId).toBe('a');
    expect(s.newestId).toBe('c');
    expect(s.hasMoreAfter).toBe(true);
  });
  it('derives both boundaries after append trim', () => {
    const s = reducer(initialTimelineWindow(), {
      type: 'commit',
      kind: 'newer',
      items: ['a', 'b', 'c', 'd'].map(item),
      hasMoreAfter: false,
    });
    expect(s.messageKeys).toEqual(['b', 'c', 'd']);
    expect(s.oldestId).toBe('b');
    expect(s.newestId).toBe('d');
    expect(s.hasMoreBefore).toBe(true);
  });
  it.each(['older', 'newer'] as const)('does not invent hasMore at exactly the cap: %s', (kind) => {
    const s = reducer(initialTimelineWindow(), {
      type: 'commit',
      kind,
      items: ['a', 'b', 'c'].map(item),
    });
    expect(s.hasMoreBefore).toBe(false);
    expect(s.hasMoreAfter).toBe(false);
  });
  it('preserves structural snapshot on a point update', () => {
    const s = reducer(initialTimelineWindow(), {
      type: 'commit',
      kind: 'initial',
      items: [item('a')],
    });
    expect(reducer(s, { type: 'commit', kind: 'reconcile', items: [item('a')] })).toBe(s);
  });
  it('does not use an optimistic id as a history cursor', () => {
    const s = reducer(initialTimelineWindow(), {
      type: 'commit',
      kind: 'own-send',
      items: [item('a'), { ...item('z'), pending: true }],
    });
    expect(s.messageKeys).toEqual(['a', 'z']);
    expect(s.newestId).toBe('a');
  });
  it('rejects invalid retention limits', () => {
    expect(() => createTimelineReducer({ maxMessages: 0 })).toThrow();
  });
});
