import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getComponentTokens, type TalkentryTheme, useTalkentryTheme } from '../../theme';
import { type ChatLocale, chatStrings } from '../shared/strings';

type MessageSelectionBarProps = {
  readonly locale: ChatLocale;
  readonly onReply: () => void;
  readonly onForward: () => void;
};

/** Bottom reply / forward buttons shown while a message is selected. */
export const MessageSelectionBar = ({ locale, onReply, onForward }: MessageSelectionBarProps) => {
  const theme = useTalkentryTheme();
  const styles = createStyles(theme);
  const strings = chatStrings[locale];
  const buttonStyle = [
    styles.button,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  ];
  const labelStyle = [styles.label, { color: theme.colors.text }];
  const iconStyle = [styles.icon, { color: theme.colors.accent }];

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
      <Pressable
        onPress={onReply}
        accessibilityRole="button"
        accessibilityLabel={strings.replyLabel}
        style={buttonStyle}
      >
        <Text style={iconStyle}>↩</Text>
        <Text style={labelStyle}>{strings.reply}</Text>
      </Pressable>
      <Pressable
        onPress={onForward}
        accessibilityRole="button"
        accessibilityLabel={strings.forwardLabel}
        style={buttonStyle}
      >
        <Text style={labelStyle}>{strings.forward}</Text>
        <Text style={iconStyle}>↪</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (theme: TalkentryTheme) => {
  const { selection, effects } = getComponentTokens(theme);
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    button: {
      flex: 1,
      minHeight: selection.buttonHeight,
      borderRadius: selection.buttonRadius,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      elevation: effects.mediumElevation,
      shadowColor: effects.shadowColor,
      shadowOffset: { width: 0, height: effects.mediumShadowOffset },
      shadowOpacity: effects.mediumShadowOpacity,
      shadowRadius: effects.mediumShadowRadius,
    },
    icon: {
      fontSize: selection.iconSize,
      fontWeight: effects.semiboldWeight,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: effects.semiboldWeight,
    },
  });
};
