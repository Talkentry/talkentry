import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTalkentryTheme } from '../../../theme';
import { emojiCategories } from './emojiCatalog';

export type EmojiPanelProps = {
  /** Panel height in px. Pass the keyboard height so the sheet matches the device. */
  readonly height: number;
  /** Inserts the chosen Unicode emoji into the draft. */
  readonly onPick: (emoji: string) => void;
};

/**
 * System-emoji sheet. Glyphs come from the platform font, not from drawn assets.
 */
export const EmojiPanel = ({ height, onPick }: EmojiPanelProps) => {
  const theme = useTalkentryTheme();
  const [categoryId, setCategoryId] = useState(emojiCategories[0]?.id ?? 'smileys');
  const category = emojiCategories.find((item) => item.id === categoryId) ?? emojiCategories[0];
  const emojis = category?.emojis ?? [];

  return (
    <View
      style={[
        styles.panel,
        { height, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
      ]}
    >
      <View style={[styles.tabs, { borderBottomColor: theme.colors.border }]}>
        {emojiCategories.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setCategoryId(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.id}
            style={styles.tab}
          >
            <Text style={[styles.tabIcon, item.id === categoryId ? styles.tabIconActive : null]}>
              {item.icon}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        {emojis.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => onPick(emoji)}
            accessibilityRole="button"
            accessibilityLabel={emoji}
            style={styles.cell}
          >
            <Text style={styles.glyph}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.45,
  },
  tabIconActive: {
    opacity: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 6,
  },
  cell: {
    width: '12.5%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 28,
  },
});
