import type { MaskedJumpOptions, ScrollIntent } from '@talkentry/core';
import { ScrollIntentType, shouldMaskJump } from '@talkentry/core';

type Geometry = { readonly content: number; readonly height: number; readonly offset: number };
type TargetOptions = {
  readonly intent: ScrollIntent;
  readonly geometry: Geometry;
  readonly keys: readonly string[];
  readonly rowKeys: readonly string[];
  readonly readLayout: (
    index: number,
  ) => { readonly y: number; readonly height: number } | undefined;
  readonly firstItemOffset: () => number;
  readonly readingTopInset?: number;
  readonly readingBottomInset?: number;
};

/** Target geometry neither owns the lifecycle nor issues native scroll commands. */
export const getNavigationTargetOffset = (options: TargetOptions): number | undefined => {
  const { intent, geometry, keys, rowKeys, readLayout, firstItemOffset } = options;
  const { content, height } = geometry;
  if (intent.type === ScrollIntentType.None || height <= 0 || (content <= 0 && keys.length > 0)) {
    return;
  }
  if (intent.type === ScrollIntentType.ScrollToEnd) {
    return Math.max(0, content - height);
  }
  const layout = readLayout(rowKeys.indexOf(intent.key));
  if (!layout) {
    return;
  }
  const topInset = Math.max(0, options.readingTopInset ?? 0);
  const availableHeight = height - topInset - Math.max(0, options.readingBottomInset ?? 0);
  if (availableHeight <= 0) {
    return;
  }
  const top = layout.y + firstItemOffset() - topInset;

  return Math.max(
    0,
    Math.min(content - height, top - Math.max(0, (availableHeight - layout.height) / 2)),
  );
};

type CoverOptions = {
  readonly intent: ScrollIntent;
  readonly offset: number;
  readonly geometry: Geometry;
  readonly keys: readonly string[];
  readonly visibleKeys: ReadonlySet<string>;
  readonly previousKeys: readonly string[];
  readonly around: boolean;
  readonly maskedJumps?: MaskedJumpOptions;
};

/** Latest and local sends retain this version's skeleton-free presentation. */
export const shouldCoverNavigation = (options: CoverOptions): boolean => {
  const { intent, keys, geometry } = options;
  if (intent.type !== ScrollIntentType.ScrollToMessage || !intent.animated) {
    return false;
  }
  const targetIndex = keys.indexOf(intent.key);
  const indices = [...options.visibleKeys]
    .map((key) => keys.indexOf(key))
    .filter((index) => index >= 0);
  const distance = indices.length
    ? Math.min(...indices.map((index) => Math.abs(index - targetIndex)))
    : 0;

  return shouldMaskJump(
    Math.abs(options.offset - geometry.offset),
    geometry.height,
    distance,
    options.around && !options.previousKeys.includes(intent.key),
    options.maskedJumps,
  );
};
