import { type GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTalkentryTheme } from '../../theme';
import { type ChatLocale, chatStrings } from '../shared/strings';

type MessageMenuReactionsProps = {
  readonly emojis: readonly string[];
  /** The viewer's current reaction. Tapping it again removes it. */
  readonly selected?: string;
  readonly locale: ChatLocale;
  readonly onPick: (emoji: string) => void;
  readonly onExpand: () => void;
};

/** Quick reaction pill with a chevron that opens the full emoji card. */
export const MessageMenuReactions = ({
  emojis,
  selected,
  locale,
  onPick,
  onExpand,
}: MessageMenuReactionsProps) => {
  const theme = useTalkentryTheme();
  const strings = chatStrings[locale];

  return (
    <View
      style={[styles.pill, { backgroundColor: theme.colors.surface }]}
      accessibilityRole="toolbar"
      accessibilityLabel={strings.reactLabel}
    >
      {emojis.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => onPick(emoji)}
          onTouchEnd={(event: GestureResponderEvent) => {
            event.stopPropagation();
            onPick(emoji);
          }}
          style={[
            styles.cell,
            emoji === selected ? { backgroundColor: theme.colors.inputBackground } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${strings.reactLabel} ${emoji}`}
          accessibilityState={{ selected: emoji === selected }}
        >
          <Text style={styles.glyph}>{emoji}</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={onExpand}
        onTouchEnd={(event: GestureResponderEvent) => {
          event.stopPropagation();
          onExpand();
        }}
        style={[styles.more, { backgroundColor: theme.colors.inputBackground }]}
        accessibilityRole="button"
        accessibilityLabel={strings.moreReactions}
      >
        <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>⌄</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  cell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 26,
  },
  more: {
    width: 32,
    height: 32,
    marginLeft: 2,
    marginRight: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
});
