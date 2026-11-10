import { interpolate } from 'react-native-reanimated';

/** Keyboard lift, or the emoji sheet while it holds the keyboard's slot. */
export const dockedLift = (
  keyboardHeight: number,
  keyboardProgress: number,
  dock: number,
  openedOffset: number,
) => {
  'worklet';
  const offset = interpolate(keyboardProgress, [0, 1], [0, openedOffset]);
  const keyboardLift = keyboardHeight + offset;
  const emojiLift = dock === 0 ? 0 : dock + openedOffset;

  return Math.min(keyboardLift, emojiLift);
};
