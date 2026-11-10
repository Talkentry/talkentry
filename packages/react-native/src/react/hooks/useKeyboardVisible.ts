import { useKeyboardHeight } from './useKeyboardHeight';

/**
 * Tracks software keyboard visibility via keyboard height.
 */
export const useKeyboardVisible = (): boolean => useKeyboardHeight() > 0;
