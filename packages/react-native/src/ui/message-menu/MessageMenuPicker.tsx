import { StyleSheet, View } from 'react-native';

import { useTalkentryTheme } from '../../theme';
import { EmojiPanel } from '../shared/emoji/EmojiPanel';
import type { MenuPosition, MenuSize } from './menuLayout';

type MessageMenuPickerProps = {
  readonly position: MenuPosition;
  readonly size: MenuSize;
  readonly onPick: (emoji: string) => void;
};

/** Full emoji card opened from the reaction chevron. */
export const MessageMenuPicker = ({ position, size, onPick }: MessageMenuPickerProps) => {
  const theme = useTalkentryTheme();

  return (
    <View
      collapsable={false}
      onTouchEnd={(event) => event.stopPropagation()}
      style={[
        styles.card,
        {
          left: position.left,
          top: position.top,
          width: size.width,
          height: size.height,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <EmojiPanel height={size.height} onPick={onPick} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
});
