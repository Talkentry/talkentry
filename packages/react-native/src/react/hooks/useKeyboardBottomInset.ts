import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardVisible } from './useKeyboardVisible';

export type UseKeyboardBottomInsetOptions = {
  /**
   * Explicit override. When set, keyboard visibility is ignored.
   */
  readonly bottomInset?: number;
};

/**
 * Bottom padding for the composer: system nav inset while the keyboard is
 * hidden, `0` while it is visible (keyboard already covers the nav bar).
 */
export const useKeyboardBottomInset = (options: UseKeyboardBottomInsetOptions = {}): number => {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  if (options.bottomInset != null) {
    return options.bottomInset;
  }

  return keyboardVisible ? 0 : insets.bottom;
};
