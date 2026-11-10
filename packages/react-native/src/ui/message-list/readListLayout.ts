import type { FlashListRef } from '@shopify/flash-list';

/** FlashList may throw before layout admission or while the window is replaced. */
export const readListLayout = (list: FlashListRef<string> | null, index: number) => {
  if (!list || index < 0) {
    return undefined;
  }
  try {
    const layout = list.getLayout(index);
    if (
      !layout ||
      !Number.isFinite(layout.y) ||
      !Number.isFinite(layout.height) ||
      layout.height < 0
    ) {
      return undefined;
    }

    return layout;
  } catch {
    return undefined;
  }
};
