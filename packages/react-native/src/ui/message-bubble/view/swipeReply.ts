/** Finger travel before the row claims the gesture from the list. */
export const SWIPE_REPLY_CLAIM_DX = 6;
/** Horizontal dx must beat vertical dy by at least this ratio. */
export const SWIPE_REPLY_CLAIM_RATIO = 1;
/** Distance that arms reply. Past this the row rubber-bands. */
export const SWIPE_REPLY_THRESHOLD = 40;
/** Short flick still commits if it is at least this far left. */
export const SWIPE_REPLY_FLICK_DX = 14;
/** Leftward velocity in px/ms that counts as a flick. */
export const SWIPE_REPLY_FLICK_VX = 0.4;
/** Rubber length after the threshold. Larger = softer extra pull. */
export const SWIPE_REPLY_RUBBER = 52;
/** Visual cap after rubber. */
export const SWIPE_REPLY_MAX = 96;

/** Snap-back: stiff, no bounce — Telegram does not wobble the row. */
export const swipeReplySnapBack = {
  stiffness: 380,
  damping: 34,
  mass: 0.7,
  overshootClamping: true,
  useNativeDriver: true,
} as const;

/**
 * Maps leftward finger dx onto the bubble. 1:1 until the threshold, then
 * rubber-band so the catch stays readable instead of hitting a wall.
 */
export const swipeReplyOffset = (dx: number): number => {
  if (dx >= 0) {
    return 0;
  }

  const pulled = -dx;

  if (pulled <= SWIPE_REPLY_THRESHOLD) {
    return -pulled;
  }

  const extra = pulled - SWIPE_REPLY_THRESHOLD;
  const resisted = (extra * SWIPE_REPLY_RUBBER) / (SWIPE_REPLY_RUBBER + extra);

  return -Math.min(SWIPE_REPLY_THRESHOLD + resisted, SWIPE_REPLY_MAX);
};

/** True when a left swipe should take over from list scrolling. */
export const shouldClaimSwipeReply = (dx: number, dy: number): boolean => {
  if (dx >= 0) {
    return false;
  }
  if (-dx < SWIPE_REPLY_CLAIM_DX) {
    return false;
  }

  return -dx >= Math.abs(dy) * SWIPE_REPLY_CLAIM_RATIO;
};

/**
 * Release commits when the finger crossed the threshold, or when a short
 * left flick is fast enough. Pulling back to rest cancels.
 */
export const shouldCommitSwipeReply = (dx: number, vx: number): boolean => {
  if (dx >= 0) {
    return false;
  }
  if (-dx >= SWIPE_REPLY_THRESHOLD) {
    return true;
  }

  return -dx >= SWIPE_REPLY_FLICK_DX && -vx >= SWIPE_REPLY_FLICK_VX;
};
