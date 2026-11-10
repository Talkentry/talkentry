import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

const FALLBACK_RATIO = 0.38;

/**
 * Height of the software keyboard, kept after it hides.
 * The emoji panel uses this so it matches the keyboard on the current device.
 * Before the keyboard has opened once, the value is a fraction of the window.
 */
export const useLastKeyboardHeight = (): number => {
  const fallback = Math.round(Dimensions.get('window').height * FALLBACK_RATIO);
  const [height, setHeight] = useState(fallback);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const subscription = Keyboard.addListener(showEvent, (event) => {
      const next = Math.round(event.endCoordinates.height);
      if (next > 0) {
        setHeight(next);
      }
    });

    return () => subscription.remove();
  }, []);

  return height;
};
