import type { Message } from '@talkentry/core';
import type { ReactElement, ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';

import type { RenderSwipeHintParams } from '../../shared/slots';
import type { BubbleStyles } from './styles';
import { useSwipeReply } from './useSwipeReply';

type SwipeReplyShellProps = {
  readonly enabled: boolean;
  readonly message: Message;
  readonly onReply?: (message: Message) => void;
  readonly styles: BubbleStyles;
  readonly renderSwipeHint?: (params: RenderSwipeHintParams) => ReactNode;
  readonly children: ReactNode;
};

/** Wraps a bubble row with swipe-to-reply gesture chrome. */
export const SwipeReplyShell = ({
  enabled,
  message,
  onReply,
  styles,
  renderSwipeHint,
  children,
}: SwipeReplyShellProps): ReactElement => {
  const { translateX, hintOpacity, hintScale, progress, panHandlers } = useSwipeReply({
    enabled,
    message,
    onReply,
  });

  if (!enabled) {
    return <>{children}</>;
  }

  const hint = renderSwipeHint ? (
    renderSwipeHint({ progress })
  ) : (
    <Text style={styles.swipeHintIcon} accessibilityElementsHidden>
      ↩
    </Text>
  );

  return (
    <View style={styles.swipeShell}>
      <Animated.View
        style={[styles.swipeHint, { opacity: hintOpacity }]}
        pointerEvents="none"
        accessibilityElementsHidden
      >
        <Animated.View style={{ transform: [{ scale: hintScale }] }}>{hint}</Animated.View>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};
