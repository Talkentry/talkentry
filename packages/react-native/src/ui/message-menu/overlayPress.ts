import type { GestureResponderEvent } from 'react-native';

/**
 * OverKeyboardView often delivers native touches but not Pressable onPress.
 * Lock the rest of this turn so onPress + onTouchEnd do not fire twice.
 */
export const createPressLock = () => {
  let locked = false;

  return (onPress: () => void) => {
    if (locked) {
      return;
    }
    locked = true;
    onPress();
    Promise.resolve()
      .then(() => {
        locked = false;
      })
      .catch(() => undefined);
  };
};

/** Pressable props that work inside OverKeyboardView. */
export const overlayPressProps = (lock: (onPress: () => void) => void, onPress: () => void) => ({
  onPress: () => lock(onPress),
  onTouchEnd: (event: GestureResponderEvent) => {
    event.stopPropagation();
    lock(onPress);
  },
});
