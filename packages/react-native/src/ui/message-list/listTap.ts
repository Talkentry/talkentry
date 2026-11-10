/** Finger travel past this is a gesture, including a reply swipe, so it is not a tap. */
export const LIST_TAP_SLOP_PX = 8;
/** A press longer than this is a long-press, not a blank-area tap. */
export const LIST_TAP_MAX_MS = 300;

export const movedPastTap = (fromX: number, fromY: number, toX: number, toY: number) => {
  const dx = toX - fromX;
  const dy = toY - fromY;

  return dx * dx + dy * dy > LIST_TAP_SLOP_PX * LIST_TAP_SLOP_PX;
};

type ListTapInput = {
  readonly dragged: boolean;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  /** A bubble, chip, or quote already handled this press. */
  readonly consumed: boolean;
};

/** Blank canvas tap. Message presses must not dismiss the keyboard or emoji sheet. */
export const isBlankListTap = (input: ListTapInput) => {
  if (input.consumed || input.dragged) {
    return false;
  }
  if (input.endedAt - input.startedAt > LIST_TAP_MAX_MS) {
    return false;
  }
  if (Math.abs(input.endOffset - input.startOffset) > 1) {
    return false;
  }

  return !movedPastTap(input.fromX, input.fromY, input.toX, input.toY);
};
