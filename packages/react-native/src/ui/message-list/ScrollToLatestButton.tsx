import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getComponentTokens, type TalkentryTheme, useTalkentryTheme } from '../../theme';

const BADGE_LIMIT = 99;

export type ScrollToLatestButtonProps = {
  /** Accessibility name for the jump control. */
  readonly label: string;
  /** Unread messages. `0` hides the badge. */
  readonly count: number;
  /** Noun after the count in the badge accessibility label, e.g. "unread". */
  readonly countNoun: string;
  readonly onPress: () => void;
  /** Extra lift so the control sits above a floating composer. */
  readonly bottomOffset?: number;
};

const formatBadge = (count: number): string => {
  if (count > BADGE_LIMIT) {
    return `${BADGE_LIMIT}+`;
  }

  return String(count);
};

/** Round down-arrow that jumps to the latest edge, with an unread count badge. */
export const ScrollToLatestButton = ({
  label,
  count,
  countNoun,
  onPress,
  bottomOffset = 0,
}: ScrollToLatestButtonProps) => {
  const theme = useTalkentryTheme();
  const styles = createStyles(theme);
  const showBadge = count > 0;

  return (
    <View
      style={[styles.wrap, { bottom: theme.spacing.md + bottomOffset }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={{ top: theme.spacing.md }}
        style={styles.button}
        onPress={onPress}
      >
        {showBadge ? (
          <View style={styles.badge} accessibilityLabel={`${count} ${countNoun}`}>
            <Text style={styles.badgeText}>{formatBadge(count)}</Text>
          </View>
        ) : null}
        <View style={styles.chevron} />
      </Pressable>
    </View>
  );
};

const createStyles = (theme: TalkentryTheme) => {
  const { latest, effects } = getComponentTokens(theme);
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      right: theme.spacing.lg,
      alignItems: 'center',
    },
    button: {
      width: latest.size,
      height: latest.size,
      borderRadius: latest.radius,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      elevation: effects.lowElevation,
      shadowColor: effects.shadowColor,
      shadowOffset: { width: 0, height: effects.lowShadowOffset },
      shadowOpacity: effects.lowShadowOpacity,
      shadowRadius: effects.lowShadowRadius,
    },
    chevron: {
      width: latest.chevronSize,
      height: latest.chevronSize,
      marginTop: latest.chevronOffset,
      borderRightWidth: latest.chevronStroke,
      borderBottomWidth: latest.chevronStroke,
      borderColor: theme.colors.text,
      transform: [{ rotate: '45deg' }],
    },
    badge: {
      position: 'absolute',
      top: latest.badgeOffset,
      zIndex: 1,
      minWidth: latest.badgeSize,
      height: latest.badgeSize,
      paddingHorizontal: latest.badgePadding,
      borderRadius: latest.badgeRadius,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
    },
    badgeText: {
      color: theme.colors.textOnAccent,
      fontSize: theme.typography.caption,
      fontWeight: effects.boldWeight,
    },
  });
};
