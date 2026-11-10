import type { Message } from '@talkentry/core';
import { useRef } from 'react';
import {
  Animated,
  type GestureResponderEvent,
  PanResponder,
  type PanResponderGestureState,
} from 'react-native';

import {
  shouldClaimSwipeReply,
  shouldCommitSwipeReply,
  SWIPE_REPLY_THRESHOLD,
  swipeReplyOffset,
  swipeReplySnapBack,
} from './swipeReply';

export type UseSwipeReplyResult = {
  readonly translateX: Animated.Value;
  readonly hintOpacity: Animated.AnimatedInterpolation<number>;
  readonly hintScale: Animated.AnimatedInterpolation<number>;
  /** 0 at rest, 1 once the swipe is armed. */
  readonly progress: Animated.AnimatedInterpolation<number>;
  /** Opaque responder handlers for `Animated.View` — typed loosely for portable .d.ts. */
  readonly panHandlers: object;
};

/**
 * Left-swipe → reply. Refs keep the PanResponder stable across re-renders.
 * Captures the row so the list cannot steal a started swipe.
 */
export const useSwipeReply = (args: {
  readonly enabled: boolean;
  readonly message: Message;
  readonly onReply?: (message: Message) => void;
}): UseSwipeReplyResult => {
  const translateX = useRef(new Animated.Value(0)).current;
  const onReplyRef = useRef(args.onReply);
  onReplyRef.current = args.onReply;
  const messageRef = useRef(args.message);
  messageRef.current = args.message;
  const enabledRef = useRef(args.enabled);
  enabledRef.current = args.enabled;

  const snapBack = () => {
    Animated.spring(translateX, {
      toValue: 0,
      ...swipeReplySnapBack,
    }).start();
  };

  const claim = (_event: GestureResponderEvent, gesture: PanResponderGestureState) =>
    enabledRef.current && shouldClaimSwipeReply(gesture.dx, gesture.dy);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: claim,
      onMoveShouldSetPanResponderCapture: claim,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_event, gesture) => {
        if (!enabledRef.current) {
          return;
        }
        translateX.setValue(swipeReplyOffset(gesture.dx));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (enabledRef.current && shouldCommitSwipeReply(gesture.dx, gesture.vx)) {
          onReplyRef.current?.(messageRef.current);
        }

        snapBack();
      },
      onPanResponderTerminate: () => {
        snapBack();
      },
    }),
  ).current;

  const hintOpacity = translateX.interpolate({
    inputRange: [-SWIPE_REPLY_THRESHOLD, -SWIPE_REPLY_THRESHOLD * 0.2, 0],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });
  const hintScale = translateX.interpolate({
    inputRange: [-SWIPE_REPLY_THRESHOLD, 0],
    outputRange: [1, 0.45],
    extrapolate: 'clamp',
  });
  const progress = translateX.interpolate({
    inputRange: [-SWIPE_REPLY_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return { translateX, hintOpacity, hintScale, progress, panHandlers: pan.panHandlers };
};
