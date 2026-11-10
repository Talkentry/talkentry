import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Live software-keyboard height in px.
 *
 * Prefer `KeyboardStickyView` / `KeyboardProvider` for chat layout.
 * This hook remains for hosts that need the raw height.
 */
export const useKeyboardHeight = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
};
