import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { getComponentTokens, type TalkentryTheme, useTalkentryTheme } from '../../theme';
import type { MaskState } from './useMaskedTransition';

export const useReducedMotion = () => {
  // Fail safe until the asynchronous preference is known.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (active) {
          setReduced(value);
        }
      })
      .catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduced);

    return () => {
      active = false;
      listener?.remove();
    };
  }, []);

  return reduced;
};

export const MaskedJumpOverlay = ({
  state,
  reducedMotion,
  label,
  onCovered,
  onFinished,
}: {
  readonly state: NonNullable<MaskState>;
  readonly reducedMotion: boolean;
  readonly label: string;
  readonly onCovered: (id: number) => void;
  readonly onFinished: (id: number) => void;
}) => {
  const theme = useTalkentryTheme();
  const styles = createStyles(theme);
  const opacity = useRef(new Animated.Value(1)).current;
  const callbacks = useRef({ onCovered, onFinished });
  const signaled = useRef<number | null>(null);
  callbacks.current = { onCovered, onFinished };

  useEffect(() => {
    opacity.setValue(1);
  }, [state.id, opacity]);

  const onLayout = () => {
    // Layout means the native cover exists. A frame from useEffect can run
    // before that, and the list would jump onto an empty tail first.
    if (signaled.current === state.id) {
      return;
    }
    signaled.current = state.id;
    const covered = () => callbacks.current.onCovered(state.id);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(covered);

      return;
    }
    setTimeout(covered, 0);
  };
  useEffect(() => {
    if (state.phase !== 'revealing') {
      return;
    }
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: reducedMotion ? 0 : 180,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) {
        callbacks.current.onFinished(state.id);
      }
    });

    return () => animation.stop();
  }, [state.id, state.phase, reducedMotion, opacity]);

  return (
    <Animated.View
      testID="masked-jump-overlay"
      pointerEvents="none"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[StyleSheet.absoluteFill, styles.cover, { opacity }]}
      onLayout={onLayout}
    >
      <View
        importantForAccessibility="no"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.canvas }]}
      />
      {Array.from({ length: 7 }, (_, index) => (
        <View
          key={index}
          importantForAccessibility="no"
          style={[
            styles.row,
            index % 3 === 0 ? styles.tall : styles.short,
            index % 2 === 0 ? styles.left : styles.right,
            { backgroundColor: theme.colors.textMuted },
          ]}
        />
      ))}
    </Animated.View>
  );
};

const createStyles = (theme: TalkentryTheme) => {
  const { maskedJump } = getComponentTokens(theme);
  return StyleSheet.create({
    cover: {
      backgroundColor: theme.colors.surface,
      padding: maskedJump.padding,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    row: {
      borderRadius: theme.radii.sm,
      marginVertical: theme.spacing.sm,
      opacity: maskedJump.rowOpacity,
    },
    left: { width: maskedJump.incomingWidth, alignSelf: 'flex-start' },
    right: { width: maskedJump.outgoingWidth, alignSelf: 'flex-end' },
    tall: { height: maskedJump.tallHeight },
    short: { height: maskedJump.shortHeight },
  });
};
