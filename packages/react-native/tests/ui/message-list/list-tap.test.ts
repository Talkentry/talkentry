import { isBlankListTap } from '../../../src/ui/message-list/listTap';

const tap = (overrides: Partial<Parameters<typeof isBlankListTap>[0]> = {}) =>
  isBlankListTap({
    dragged: false,
    startedAt: 0,
    endedAt: 80,
    startOffset: 100,
    endOffset: 100,
    fromX: 120,
    fromY: 200,
    toX: 122,
    toY: 201,
    consumed: false,
    ...overrides,
  });

describe('blank list tap', () => {
  it('accepts a short still press on empty canvas', () => {
    expect(tap()).toBe(true);
  });

  it('ignores a message press, swipe, long-press, and scroll', () => {
    expect(tap({ consumed: true })).toBe(false);
    expect(tap({ dragged: true })).toBe(false);
    expect(tap({ endedAt: 400 })).toBe(false);
    expect(tap({ toX: 40 })).toBe(false);
    expect(tap({ endOffset: 140 })).toBe(false);
  });
});
