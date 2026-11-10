import { createScrollCommand } from '../../../src/ui/message-list/scrollCommand';

const command = (offset: number, keys: readonly string[] = ['a'], id = 1) => ({
  id,
  offset,
  keys,
  animated: true,
});

describe('bounded native scroll execution', () => {
  it('retains only the active command while thousands of newer targets arrive', () => {
    const executor = createScrollCommand();
    expect(executor.request(command(100), 0)).toBe(true);
    for (let offset = 101; offset <= 10000; offset += 1) {
      expect(executor.request(command(offset), 0)).toBe(false);
    }
    expect(executor.applied?.offset).toBe(100);
    executor.observe(100);
    expect(executor.request(command(10000), 100)).toBe(true);
    expect(executor.applied?.offset).toBe(10000);
  });

  it('admits same-height replacement keys without an unnecessary native command', () => {
    const executor = createScrollCommand();
    executor.request(command(100), 0);
    executor.observe(100);
    const keys = ['b'];
    expect(executor.request(command(100, keys), 100)).toBe(false);
    expect(executor.applied?.keys).toBe(keys);
    expect(executor.active).toBe(false);
  });

  it('bounds retries without progress and admits a changed destination', () => {
    const executor = createScrollCommand();
    const target = command(100);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      executor.release();
      expect(executor.request(target, 0, true)).toBe(true);
    }
    executor.release();
    expect(executor.request(target, 0, true)).toBe(false);
    expect(executor.request(command(200), 0, true)).toBe(true);
  });

  it('admits a new attempt after real progress', () => {
    const executor = createScrollCommand();
    const target = command(100);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      executor.release();
      executor.request(target, 0, true);
    }
    executor.release();
    expect(executor.request(target, 50, true)).toBe(true);
  });

  it('deduplicates a command but allows a new explicit intent', () => {
    const executor = createScrollCommand();
    const target = { ...command(100), animated: false };
    expect(executor.request(target, 0)).toBe(true);
    expect(executor.request(target, 0)).toBe(false);
    expect(executor.request({ ...target, id: 2 }, 0)).toBe(true);
  });

  it('cancels all command state and accepts a later navigation', () => {
    const executor = createScrollCommand();
    executor.request(command(100), 0);
    executor.cancel();
    expect(executor.active).toBe(false);
    expect(executor.applied).toBeNull();
    expect(executor.request(command(200, ['b'], 2), 0)).toBe(true);
  });
});
