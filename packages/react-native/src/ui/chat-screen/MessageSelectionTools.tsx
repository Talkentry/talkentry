import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getComponentTokens, type TalkentryTheme, useTalkentryTheme } from '../../theme';
import { type ChatLocale, chatStrings } from '../shared/strings';

type MessageSelectionToolsProps = {
  readonly locale: ChatLocale;
  readonly showCopy: boolean;
  readonly showEdit: boolean;
  readonly showDelete: boolean;
  readonly onCopy: () => void;
  readonly onEdit: () => void;
  readonly onForward: () => void;
  readonly onDelete: () => void;
};

/** Top-end icon pill: copy, edit, forward, delete. */
export const MessageSelectionTools = ({
  locale,
  showCopy,
  showEdit,
  showDelete,
  onCopy,
  onEdit,
  onForward,
  onDelete,
}: MessageSelectionToolsProps) => {
  const theme = useTalkentryTheme();
  const styles = createStyles(theme);
  const strings = chatStrings[locale];
  const iconStyle = [styles.icon, { color: theme.colors.text }];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel={strings.messageActions}
    >
      {showCopy ? (
        <Pressable
          onPress={onCopy}
          accessibilityRole="button"
          accessibilityLabel={strings.copyLabel}
          style={styles.hit}
        >
          <Text style={iconStyle}>⧉</Text>
        </Pressable>
      ) : null}
      {showEdit ? (
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={strings.editLabel}
          style={styles.hit}
        >
          <Text style={iconStyle}>✎</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={onForward}
        accessibilityRole="button"
        accessibilityLabel={strings.forwardLabel}
        style={styles.hit}
      >
        <Text style={iconStyle}>↪</Text>
      </Pressable>
      {showDelete ? (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={strings.deleteLabel}
          style={styles.hit}
        >
          <Text style={[styles.icon, { color: theme.colors.danger }]}>🗑</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = (theme: TalkentryTheme) => {
  const { selection, effects } = getComponentTokens(theme);
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: selection.toolbarRadius,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: theme.spacing.xs,
      elevation: effects.highElevation,
      shadowColor: effects.shadowColor,
      shadowOffset: { width: 0, height: effects.highShadowOffset },
      shadowOpacity: effects.highShadowOpacity,
      shadowRadius: effects.highShadowRadius,
    },
    hit: {
      width: selection.itemWidth,
      height: selection.itemHeight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      fontSize: selection.toolbarIconSize,
      fontWeight: effects.semiboldWeight,
    },
  });
};
