/**
 * Keep the composer mounted under the selection bar.
 * height: 0 drops the IME; overflow: hidden clips the hanging emoji sheet.
 * opacity hides reply/edit chrome so only Reply / Forward remain, like Telegram.
 */
export const parkedComposerStyle = {
  pointerEvents: 'none',
  opacity: 0,
} as const;

/** Used until the selection bar reports its layout. */
export const SELECTION_BAR_FALLBACK_HEIGHT = 68;

/**
 * While a message is selected the list tucks under the two buttons, not under
 * the hidden reply banner.
 */
export const listBottomInsetWhileSelecting = (
  selected: boolean,
  composerHeight: number,
  selectionBarHeight: number,
): number => {
  if (!selected) {
    return composerHeight;
  }
  if (selectionBarHeight > 0) {
    return selectionBarHeight;
  }

  return SELECTION_BAR_FALLBACK_HEIGHT;
};
