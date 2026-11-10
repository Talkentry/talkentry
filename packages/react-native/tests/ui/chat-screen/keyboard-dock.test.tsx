import type * as ReactTypes from 'react';
import { BackHandler, Keyboard } from 'react-native';

import { useKeyboardDock } from '../../../src/ui/chat-screen/useKeyboardDock';
import { act, render } from '../../support/renderer';

const mockAnimation = { height: { value: 0 }, progress: { value: 0 } };
const mockReactions = new Set<() => void>();
const mockRemoveBack = jest.fn();
let mockKeyboardVisible = false;
let mockKeyboardEnd: (event: { height: number }) => void;

jest.mock('../../../src/react/hooks', () => ({
  useKeyboardVisible: () => mockKeyboardVisible,
}));
jest.mock('react-native', () => ({
  Keyboard: { dismiss: jest.fn() },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: mockRemoveBack })) },
}));
jest.mock('react-native-keyboard-controller', () => ({
  useReanimatedKeyboardAnimation: () => mockAnimation,
  useGenericKeyboardHandler: (handlers: { onEnd: typeof mockKeyboardEnd }) => {
    mockKeyboardEnd = handlers.onEnd;
  },
}));
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) => callback(...args),
}));
jest.mock('react-native-reanimated', () => {
  const React = require('react') as typeof ReactTypes;
  return {
    useSharedValue: (initial: number) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedReaction: (
      prepare: () => unknown,
      react: (value: unknown, previous: unknown) => void,
    ) => {
      const current = React.useRef({ prepare, react });
      current.current = { prepare, react };
      React.useEffect(() => {
        const run = () => current.current.react(current.current.prepare(), null);
        mockReactions.add(run);
        return () => {
          mockReactions.delete(run);
        };
      }, []);
    },
    interpolate: (progress: number, _input: number[], output: number[]) =>
      output[0]! + progress * (output[1]! - output[0]!),
    withTiming: (value: number, _config: unknown, done?: (finished: boolean) => void) => {
      done?.(true);
      return value;
    },
  };
});

describe('keyboard dock composition with JS animation doubles', () => {
  let dock!: ReturnType<typeof useKeyboardDock>;
  const Probe = ({ offset = 0 }: { offset?: number }) => {
    dock = useKeyboardDock(offset);
    return null;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockKeyboardVisible = false;
    mockAnimation.height.value = 0;
    mockAnimation.progress.value = 0;
    mockRemoveBack.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps one lift for the list and composer during rapid emoji reversals', async () => {
    const tree = await render(<Probe offset={10} />);
    await act(async () => {
      expect(dock.emojiDockApi.hold(320)).toBe(320);
      mockAnimation.height.value = -140;
      expect(dock.emojiDockApi.hold(304)).toBe(320);
      tree.update(<Probe offset={10} />);
    });
    expect(dock.composerLiftStyle).toMatchObject({ transform: [{ translateY: -310 }] });
    expect(dock.listLiftStyle).toMatchObject({ transform: [{ translateY: -310 }] });
  });

  it('waits for keyboard geometry before notifying and releases only once', async () => {
    const tree = await render(<Probe />);
    const settled = jest.fn();
    dock.emojiDockApi.onKeyboardSettled(settled);
    await act(async () => {
      dock.emojiDockApi.hold(320);
      dock.emojiDockApi.handoffToKeyboard();
      mockAnimation.height.value = -100;
      mockKeyboardEnd({ height: 320 });
      mockReactions.forEach((run) => run());
    });
    expect(settled).not.toHaveBeenCalled();
    expect(dock.emojiDockApi.slotHeight).toBe(320);
    await act(async () => {
      mockAnimation.height.value = -320;
      mockReactions.forEach((run) => run());
      mockReactions.forEach((run) => run());
    });
    expect(settled).toHaveBeenCalledTimes(1);
    await act(async () => {
      mockAnimation.height.value = 0;
      tree.update(<Probe />);
    });
    expect(dock.composerLiftStyle).toMatchObject({ transform: [{ translateY: 0 }] });
  });

  it('cancels a pending handoff and removes subscribers symmetrically', async () => {
    const tree = await render(<Probe />);
    const settled = jest.fn();
    const dismissed = jest.fn();
    const unsubscribeSettled = dock.emojiDockApi.onKeyboardSettled(settled);
    const unsubscribeDismiss = dock.emojiDockApi.onDismissRequest(dismissed);
    await act(async () => {
      dock.emojiDockApi.hold(320);
      dock.emojiDockApi.handoffToKeyboard();
      dock.emojiDockApi.cancelHandoff();
      mockAnimation.height.value = -320;
      jest.advanceTimersByTime(401);
      dock.dismissInputChrome();
    });
    expect(settled).not.toHaveBeenCalled();
    expect(dismissed).toHaveBeenCalledTimes(1);
    unsubscribeDismiss();
    unsubscribeSettled();
    await act(async () => dock.dismissInputChrome());
    expect(dismissed).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
    expect(mockReactions.size).toBe(0);
  });

  it('uses the missed-end fallback only after the keyboard holds the slot', async () => {
    await render(<Probe />);
    const settled = jest.fn();
    dock.emojiDockApi.onKeyboardSettled(settled);
    await act(async () => {
      dock.emojiDockApi.hold(320);
      dock.emojiDockApi.handoffToKeyboard();
      mockAnimation.height.value = -100;
      jest.advanceTimersByTime(401);
    });
    expect(settled).not.toHaveBeenCalled();
    await act(async () => {
      dock.emojiDockApi.handoffToKeyboard();
      mockAnimation.height.value = -320;
      jest.advanceTimersByTime(401);
    });
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('clears its timer and hardware back subscription on unmount', async () => {
    mockKeyboardVisible = true;
    const tree = await render(<Probe />);
    const settled = jest.fn();
    const schedule = jest.spyOn(globalThis, 'setTimeout');
    const cancel = jest.spyOn(globalThis, 'clearTimeout');
    dock.emojiDockApi.onKeyboardSettled(settled);
    await act(async () => {
      dock.emojiDockApi.hold(320);
      dock.emojiDockApi.handoffToKeyboard();
      tree.unmount();
    });
    await act(async () => {
      mockAnimation.height.value = -320;
      jest.advanceTimersByTime(401);
    });
    expect(settled).not.toHaveBeenCalled();
    expect(mockRemoveBack).toHaveBeenCalledTimes(1);
    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );
    const handoffTimer = schedule.mock.calls.findIndex((args) => args[1] === 400);
    expect(handoffTimer).toBeGreaterThanOrEqual(0);
    expect(cancel).toHaveBeenCalledWith(schedule.mock.results[handoffTimer]!.value);
    expect(Keyboard.dismiss).toBeDefined();
    schedule.mockRestore();
    cancel.mockRestore();
  });
});
