/** Provisional prototype thresholds; hosts can tune them after release profiling. */
export type MaskedJumpOptions = {
  /** Enabled by default; false keeps ordinary programmatic scrolling. */
  readonly enabled?: boolean;
  /** Inclusive message-distance threshold, default 50; moves within one viewport are excluded. */
  readonly messageThreshold?: number;
  /** Physical-distance fallback for tall rows, default 12 viewport heights. */
  readonly viewportThreshold?: number;
};

const threshold = (value: number | undefined, fallback: number, minimum: number) =>
  value !== undefined && Number.isFinite(value) ? Math.max(minimum, value) : fallback;

/** Presentation selection only. This never owns or executes a navigation intent. */
export const shouldMaskJump = (
  distance: number,
  viewportHeight: number,
  messageDistance: number,
  outsideWindow: boolean,
  options: MaskedJumpOptions = {},
): boolean => {
  if (options.enabled === false) {
    return false;
  }
  if (outsideWindow) {
    return true;
  }
  if (viewportHeight <= 0 || distance <= viewportHeight) {
    return false;
  }
  const messages = threshold(options.messageThreshold, 50, 1);
  const viewports = threshold(options.viewportThreshold, 12, 2);

  return messageDistance >= messages || distance >= viewportHeight * viewports;
};
