import { useEffect } from 'react';
import { BackHandler, Keyboard } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';

import { useKeyboardVisible } from '../../react/hooks';
import { useDockLift } from './keyboard-dock/useDockLift';
import { useEmojiDockController } from './keyboard-dock/useEmojiDockController';

/** Connects keyboard events, the emoji dock, and the shared list/composer lift. */
export const useKeyboardDock = (keyboardVerticalOffset: number) => {
  const { height, progress } = useReanimatedKeyboardAnimation();
  const keyboardVisible = useKeyboardVisible();
  const { emojiDock, emojiDockApi, dismissInputChrome } = useEmojiDockController(height);
  const lift = useDockLift(height, progress, emojiDock, keyboardVerticalOffset);

  useEffect(() => {
    if (!keyboardVisible) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [keyboardVisible]);

  return { emojiDockApi, dismissInputChrome, ...lift };
};
