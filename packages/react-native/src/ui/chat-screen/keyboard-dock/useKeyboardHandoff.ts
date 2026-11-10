import { useCallback, useEffect, useRef, useState } from 'react';
import { useGenericKeyboardHandler } from 'react-native-keyboard-controller';
import { type SharedValue, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { canReleaseEmojiDock } from '../emojiDockRelease';

const HANDOFF_TIMEOUT_MS = 400;

/** Owns the keyboard handoff lifecycle; never owns a second copy of the dock. */
export const useKeyboardHandoff = (
  height: SharedValue<number>,
  emojiDock: SharedValue<number>,
  emojiDockTarget: SharedValue<number>,
) => {
  const handoff = useSharedValue(0);
  const handoffTarget = useSharedValue(0);
  const [slotHeight, setSlotHeight] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeners = useRef(new Set<() => void>());

  const clearTimer = useCallback(() => {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const rememberSlot = useCallback((next: number) => {
    const heightPx = Math.round(next);
    if (heightPx > 0) {
      setSlotHeight((current) => (current === heightPx ? current : heightPx));
    }
  }, []);
  const notifySettled = useCallback(() => {
    clearTimer();
    listeners.current.forEach((listener) => listener());
  }, [clearTimer]);
  const cancelHandoff = useCallback(() => {
    clearTimer();
    handoff.value = 0;
  }, [clearTimer, handoff]);
  const handoffToKeyboard = useCallback(() => {
    handoff.value = 1;
    clearTimer();
    // Covers a missed animation end; an incomplete keyboard must not release the dock.
    timer.current = setTimeout(() => {
      if (
        handoff.value === 0 ||
        !canReleaseEmojiDock(height.value, emojiDock.value, handoffTarget.value)
      ) {
        return;
      }
      handoff.value = 0;
      emojiDock.value = 0;
      emojiDockTarget.value = 0;
      notifySettled();
    }, HANDOFF_TIMEOUT_MS);
  }, [clearTimer, emojiDock, emojiDockTarget, handoff, handoffTarget, height, notifySettled]);
  const onKeyboardSettled = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  useGenericKeyboardHandler(
    {
      onEnd: (event) => {
        'worklet';
        if (event.height > 0) {
          scheduleOnRN(rememberSlot, event.height);
        }
        if (handoff.value === 0 || event.height <= 0) {
          return;
        }
        const destination = -event.height;
        // Interrupted show events report a short height. Keep the held list in place.
        if (emojiDock.value < destination - 8 && height.value > emojiDock.value + 8) {
          return;
        }
        handoffTarget.value = destination;
        if (!canReleaseEmojiDock(height.value, emojiDock.value, destination)) {
          handoff.value = 2;
          return;
        }
        handoff.value = 0;
        emojiDock.value = 0;
        emojiDockTarget.value = 0;
        scheduleOnRN(notifySettled);
      },
    },
    [notifySettled, rememberSlot],
  );

  useAnimatedReaction(
    () => height.value,
    (keyboard) => {
      if (
        handoff.value !== 2 ||
        !canReleaseEmojiDock(keyboard, emojiDock.value, handoffTarget.value)
      ) {
        return;
      }
      handoff.value = 0;
      emojiDock.value = 0;
      emojiDockTarget.value = 0;
      scheduleOnRN(notifySettled);
    },
    [notifySettled],
  );

  return { slotHeight, handoffToKeyboard, cancelHandoff, onKeyboardSettled };
};
