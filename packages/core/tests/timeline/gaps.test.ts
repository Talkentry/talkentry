import {
  buildTimelineRows,
  continuityGap,
  countMessagesFromId,
  dayKeyFromCreatedAt,
  dayRowKey,
  gapKey,
  gapsFromSequences,
  insertUnreadSeparatorRow,
  mergeGaps,
  retainGaps,
  UNREAD_ROW_KEY,
} from '@talkentry/core';

describe('timeline gaps', () => {
  it('detects sequence holes inside a page', () => {
    expect(
      gapsFromSequences([
        { id: 'a', sequence: 1 },
        { id: 'b', sequence: 2 },
        { id: 'c', sequence: 5 },
      ]),
    ).toEqual([
      {
        key: gapKey('b', 'c'),
        afterId: 'b',
        beforeId: 'c',
        missingCount: 2,
      },
    ]);
  });

  it('marks an edge discontinuity when gluing non-contiguous pages', () => {
    expect(continuityGap({ id: 'a', sequence: 10 }, { id: 'b', sequence: 14 })).toEqual({
      key: gapKey('a', 'b'),
      afterId: 'a',
      beforeId: 'b',
      missingCount: 3,
    });
    expect(continuityGap({ id: 'a', sequence: 10 }, { id: 'b', sequence: 11 })).toBeUndefined();
  });

  it('interleaves gap rows after the older message key', () => {
    const gaps = [
      {
        key: gapKey('a', 'c'),
        afterId: 'a',
        beforeId: 'c',
        missingCount: 1,
      },
    ];
    expect(buildTimelineRows(['a', 'c'], gaps)).toEqual([
      { type: 'message', key: 'a' },
      { type: 'gap', key: gapKey('a', 'c'), gap: gaps[0] },
      { type: 'message', key: 'c' },
    ]);
  });

  it('drops gaps whose endpoints left the window', () => {
    const gaps = mergeGaps([
      { key: gapKey('a', 'b'), afterId: 'a', beforeId: 'b', missingCount: 1 },
      { key: gapKey('c', 'd'), afterId: 'c', beforeId: 'd', missingCount: 2 },
    ]);
    expect(retainGaps(gaps, new Set(['a', 'b']))).toEqual([
      { key: gapKey('a', 'b'), afterId: 'a', beforeId: 'b', missingCount: 1 },
    ]);
  });

  it('inserts day separators before the first message of each local day', () => {
    const dayA = new Date(2026, 0, 1, 10, 0, 0).getTime();
    const dayB = new Date(2026, 0, 2, 9, 0, 0).getTime();
    const created = { a: dayA, b: dayA + 1000, c: dayB };
    const rows = buildTimelineRows(
      ['a', 'b', 'c'],
      [],
      (key) => key,
      (key) => created[key as keyof typeof created],
    );
    expect(rows).toEqual([
      {
        type: 'day',
        key: dayRowKey(dayKeyFromCreatedAt(dayA)),
        dayKey: dayKeyFromCreatedAt(dayA),
        createdAt: dayA,
      },
      { type: 'message', key: 'a' },
      { type: 'message', key: 'b' },
      {
        type: 'day',
        key: dayRowKey(dayKeyFromCreatedAt(dayB)),
        dayKey: dayKeyFromCreatedAt(dayB),
        createdAt: dayB,
      },
      { type: 'message', key: 'c' },
    ]);
  });

  it('keeps day separators when gap rows are present', () => {
    const t0 = new Date(2026, 5, 10, 8, 0, 0).getTime();
    const t1 = new Date(2026, 5, 10, 18, 0, 0).getTime();
    const gaps = [{ key: gapKey('a', 'c'), afterId: 'a', beforeId: 'c', missingCount: 1 }];
    const rows = buildTimelineRows(
      ['a', 'c'],
      gaps,
      (key) => key,
      (key) => (key === 'a' ? t0 : t1),
    );
    expect(rows.map((row) => row.type)).toEqual(['day', 'message', 'gap', 'message']);
  });

  it('inserts unread separator before the host cursor message', () => {
    const base = buildTimelineRows(['a', 'b', 'c'], [], (key) => key);
    const rows = insertUnreadSeparatorRow(base, 'b');
    expect(rows).toEqual([
      { type: 'message', key: 'a' },
      { type: 'unread', key: UNREAD_ROW_KEY, beforeId: 'b' },
      { type: 'message', key: 'b' },
      { type: 'message', key: 'c' },
    ]);
    expect(insertUnreadSeparatorRow(base, undefined)).toBe(base);
    expect(insertUnreadSeparatorRow(base, 'missing')).toEqual(base);
  });

  it('counts messages from the host cursor through the end of the window', () => {
    expect(countMessagesFromId(['a', 'b', 'c'], 'b')).toBe(2);
    expect(countMessagesFromId(['a', 'b', 'c'], 'id-b', (key) => `id-${key}`)).toBe(2);
    expect(countMessagesFromId(['a', 'b', 'c'], undefined)).toBe(0);
    expect(countMessagesFromId(['a', 'b', 'c'], 'missing')).toBe(0);
  });
});
