import {
  getNavigationTargetOffset,
  shouldCoverNavigation,
} from '../../../src/ui/message-list/navigationGeometry';

describe('navigation geometry', () => {
  const keys = Array.from({ length: 101 }, (_, index) => `m${index}`);
  const geometry = { content: 6000, height: 500, offset: 0 };
  const intent = { type: 'scrollToMessage', id: 1, key: 'm100', animated: true } as const;
  const base = {
    intent,
    geometry,
    keys,
    rowKeys: keys,
    firstItemOffset: () => 0,
    readLayout: () => ({ y: 5000, height: 100 }),
  };

  it('centers a target inside readable insets and clamps the final offset', () => {
    expect(
      getNavigationTargetOffset({ ...base, readingTopInset: 100, readingBottomInset: 100 }),
    ).toBe(4800);
    expect(
      getNavigationTargetOffset({ ...base, readLayout: () => ({ y: 5990, height: 100 }) }),
    ).toBe(5500);
  });

  it('aligns tall rows at the readable top and waits for unknown layout', () => {
    const firstItemOffset = jest.fn(() => 0);
    expect(
      getNavigationTargetOffset({ ...base, firstItemOffset, readLayout: () => undefined }),
    ).toBeUndefined();
    expect(firstItemOffset).not.toHaveBeenCalled();
    expect(
      getNavigationTargetOffset({
        ...base,
        readingTopInset: 80,
        readLayout: () => ({ y: 2000, height: 800 }),
      }),
    ).toBe(1920);
    expect(getNavigationTargetOffset({ ...base, readLayout: () => undefined })).toBeUndefined();
    expect(getNavigationTargetOffset({ ...base, readingTopInset: 500 })).toBeUndefined();
  });

  it('distinguishes empty content from content not yet measured', () => {
    const end = { type: 'scrollToEnd', id: 1, animated: true } as const;
    expect(
      getNavigationTargetOffset({ ...base, intent: end, geometry: { ...geometry, content: 0 } }),
    ).toBeUndefined();
    expect(
      getNavigationTargetOffset({
        ...base,
        intent: end,
        keys: [],
        geometry: { ...geometry, content: 0 },
      }),
    ).toBe(0);
  });

  it('covers distant quotes but not Latest or disabled presentations', () => {
    const options = {
      intent,
      geometry,
      keys,
      offset: 5000,
      visibleKeys: new Set(['m0']),
      previousKeys: keys,
      around: false,
    };
    expect(shouldCoverNavigation(options)).toBe(true);
    expect(
      shouldCoverNavigation({ ...options, intent: { type: 'scrollToEnd', id: 2, animated: true } }),
    ).toBe(false);
    expect(shouldCoverNavigation({ ...options, maskedJumps: { enabled: false } })).toBe(false);
    expect(shouldCoverNavigation({ ...options, intent: { ...intent, animated: false } })).toBe(
      false,
    );
  });
});
