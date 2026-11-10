/**
 * Keyboard and emoji lifts are negative. Dropping the sheet early moves the
 * list, then the keyboard finishes and moves it back.
 * Release only when the keyboard already holds the sheet, or it has finished
 * shorter than the sheet.
 */
export const canReleaseEmojiDock = (
  keyboard: number,
  dock: number,
  destination: number,
): boolean => {
  'worklet';
  if (keyboard >= -1 || dock >= -1) {
    return false;
  }
  if (keyboard <= dock + 1) {
    return true;
  }

  return destination < -1 && keyboard <= destination + 1;
};

/** Preserve the occupied slot while a rapid tap reverses an in-flight handoff. */
export const resolveEmojiDockTarget = (
  heldTarget: number,
  keyboard: number,
  requested: number,
): number => {
  'worklet';
  if (heldTarget > 0) {
    return heldTarget;
  }
  if (keyboard < -1) {
    return Math.abs(keyboard);
  }

  return Math.abs(requested);
};
