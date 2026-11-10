import { useCallback, useMemo, useRef } from 'react';
import { Keyboard } from 'react-native';
import { type SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { EmojiDock } from '../../composer/emojiDock';
import { resolveEmojiDockTarget } from '../emojiDockRelease';
import { useKeyboardHandoff } from './useKeyboardHandoff';

const EMOJI_DOCK_MS = 250;

/** Sole owner of the emoji dock shared values and its provider API. */
export const useEmojiDockController = (height: SharedValue<number>) => {
  const emojiDock = useSharedValue(0);
  const emojiDockTarget = useSharedValue(0);
  const { slotHeight, handoffToKeyboard, cancelHandoff, onKeyboardSettled } = useKeyboardHandoff(
    height,
    emojiDock,
    emojiDockTarget,
  );
  const dismissListeners = useRef(new Set<() => void>());

  const requestDismiss = useCallback(() => {
    dismissListeners.current.forEach((listener) => listener());
  }, []);
  const onDismissRequest = useCallback((listener: () => void) => {
    dismissListeners.current.add(listener);
    return () => {
      dismissListeners.current.delete(listener);
    };
  }, []);
  const dismissInputChrome = useCallback(() => {
    requestDismiss();
    Keyboard.dismiss();
  }, [requestDismiss]);

  const hold = useCallback(
    (nextHeight: number): number => {
      const target = resolveEmojiDockTarget(emojiDockTarget.value, height.value, nextHeight);
      const full = -target;
      emojiDockTarget.value = target;
      if (emojiDock.value === 0 && height.value < -1) {
        emojiDock.value = height.value;
      }
      if (Math.abs(emojiDock.value - full) > 1) {
        emojiDock.value = withTiming(full, { duration: EMOJI_DOCK_MS });
      }
      return target;
    },
    [emojiDock, emojiDockTarget, height],
  );
  const release = useCallback(() => {
    emojiDock.value = 0;
    emojiDockTarget.value = 0;
  }, [emojiDock, emojiDockTarget]);
  const lower = useCallback(
    (onDone: () => void) => {
      emojiDock.value = withTiming(0, { duration: EMOJI_DOCK_MS }, (finished) => {
        if (finished) {
          emojiDockTarget.value = 0;
          scheduleOnRN(onDone);
        }
      });
    },
    [emojiDock, emojiDockTarget],
  );

  // Provider identity is stable while keyboard animation values change on the UI thread.
  const emojiDockApi = useMemo<EmojiDock>(
    () => ({
      slotHeight,
      hold,
      release,
      lower,
      handoffToKeyboard,
      cancelHandoff,
      onKeyboardSettled,
      requestDismiss,
      onDismissRequest,
    }),
    [
      slotHeight,
      hold,
      release,
      lower,
      handoffToKeyboard,
      cancelHandoff,
      onKeyboardSettled,
      requestDismiss,
      onDismissRequest,
    ],
  );

  return { emojiDock, emojiDockApi, dismissInputChrome };
};
