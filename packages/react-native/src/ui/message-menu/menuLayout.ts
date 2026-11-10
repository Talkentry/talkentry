/** Frame in the coordinates of the overlay that hosts the menu. */
export type MenuRect = {
  /** Left edge. */
  readonly x: number;
  /** Top edge. */
  readonly y: number;
  /** Frame width. */
  readonly width: number;
  /** Frame height. */
  readonly height: number;
};

/** Measured or fixed size of a menu card or of its host view. */
export type MenuSize = {
  /** Width in px. */
  readonly width: number;
  /** Height in px. */
  readonly height: number;
};

/** Top-left corner of a placed card. */
export type MenuPosition = {
  /** Offset from the host's left edge. */
  readonly left: number;
  /** Offset from the host's top edge. */
  readonly top: number;
};

/** Keeps cards off the host edges. */
export const MENU_MARGIN = 8;
/** Space between the bubble and the card. */
export const MENU_GAP = 6;

const PICKER_MAX_WIDTH = 360;
const PICKER_MAX_HEIGHT = 340;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Places a card next to the bubble: below when it fits, else above, else over the
 * bubble inside the host. `alignEnd` lines it up with the bubble's right edge.
 */
export const placeMenu = (
  anchor: MenuRect,
  size: MenuSize,
  host: MenuSize,
  alignEnd: boolean,
): MenuPosition => {
  const maxLeft = Math.max(MENU_MARGIN, host.width - size.width - MENU_MARGIN);
  const preferredLeft = alignEnd ? anchor.x + anchor.width - size.width : anchor.x;
  const left = clamp(preferredLeft, MENU_MARGIN, maxLeft);
  const below = anchor.y + anchor.height + MENU_GAP;

  if (below + size.height <= host.height - MENU_MARGIN) {
    return { left, top: below };
  }

  const above = anchor.y - MENU_GAP - size.height;

  if (above >= MENU_MARGIN) {
    return { left, top: above };
  }

  const maxTop = Math.max(MENU_MARGIN, host.height - size.height - MENU_MARGIN);

  return { left, top: clamp(anchor.y, MENU_MARGIN, maxTop) };
};

/** Full emoji card size for the host. */
export const pickerSize = (host: MenuSize): MenuSize => ({
  width: Math.max(0, Math.min(PICKER_MAX_WIDTH, host.width - MENU_MARGIN * 2)),
  height: Math.max(0, Math.min(PICKER_MAX_HEIGHT, host.height - MENU_MARGIN * 2)),
});
