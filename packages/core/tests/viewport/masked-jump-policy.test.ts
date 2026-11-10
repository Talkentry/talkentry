import { shouldMaskJump } from '@talkentry/core';

describe('masked jump policy', () => {
  it.each([
    [49, false],
    [50, true],
    [51, true],
    [100, true],
    [500, true],
  ])('classifies %i messages without making the provisional boundary implicit', (count, masked) => {
    expect(shouldMaskJump(2000, 500, count, false)).toBe(masked);
  });
  it('does not mask a tiny viewport move even when many tiny messages fit', () => {
    expect(shouldMaskJump(400, 500, 100, false)).toBe(false);
  });
  it('handles pixel distance, an unknown remote window, and host opt-out', () => {
    expect(shouldMaskJump(6000, 500, 10, false)).toBe(true);
    expect(shouldMaskJump(0, 0, 0, true)).toBe(true);
    expect(shouldMaskJump(9000, 500, 100, true, { enabled: false })).toBe(false);
    expect(shouldMaskJump(1500, 500, 10, false, { viewportThreshold: 3 })).toBe(true);
  });
});
