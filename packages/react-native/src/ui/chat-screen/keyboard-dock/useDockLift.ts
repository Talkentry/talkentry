import { type SharedValue, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReadingViewport } from '../useReadingViewport';
import { dockedLift } from './dockLift';

/** One geometry calculation drives both surfaces and the reading viewport inset. */
export const useDockLift = (
  height: SharedValue<number>,
  progress: SharedValue<number>,
  emojiDock: SharedValue<number>,
  keyboardVerticalOffset: number,
) => {
  const { active: readingActive, topInset: readingTopInset, onLiftChanged } = useReadingViewport();

  useAnimatedReaction(
    () =>
      Math.max(
        0,
        -dockedLift(height.value, progress.value, emojiDock.value, keyboardVerticalOffset),
      ),
    (inset, previousInset) => {
      if (inset !== previousInset) {
        scheduleOnRN(onLiftChanged, inset);
      }
    },
    [onLiftChanged, keyboardVerticalOffset],
  );

  const composerLiftStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY: dockedLift(
            height.value,
            progress.value,
            emojiDock.value,
            keyboardVerticalOffset,
          ),
        },
      ],
    }),
    [keyboardVerticalOffset],
  );
  const listLiftStyle = useAnimatedStyle(
    () => ({
      flex: 1,
      transform: [
        {
          translateY: dockedLift(
            height.value,
            progress.value,
            emojiDock.value,
            keyboardVerticalOffset,
          ),
        },
      ],
    }),
    [keyboardVerticalOffset],
  );

  return { readingActive, readingTopInset, composerLiftStyle, listLiftStyle };
};
