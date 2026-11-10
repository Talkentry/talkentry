import { useLayoutEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmojiPanel } from '../../shared/emoji/EmojiPanel';
import { useEmojiDock, useEmojiSheetSlot } from '../emojiDock';

export type EmojiDockSheetProps = {
  /** Sheet is mounted. Outside Chat it participates in layout. */
  readonly open: boolean;
  /** Keyboard height in px. The sheet hangs in that slot. */
  readonly height: number;
  readonly onPick: (emoji: string) => void;
};

/**
 * Emoji sheet in the keyboard's rectangle.
 * Inside Chat it hangs below the composer so it does not change the composer height.
 */
export const EmojiDockSheet = ({ open, height, onPick }: EmojiDockSheetProps) => {
  const dock = useEmojiDock();
  const slot = useEmojiSheetSlot();
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useLayoutEffect(() => {
    if (!dock || !slot) {
      return undefined;
    }

    if (!open) {
      slot.setSheet(null);

      return undefined;
    }

    slot.setSheet(
      <View pointerEvents="box-none" style={[styles.hang, { height, bottom: -height }]}>
        <EmojiPanel height={height} onPick={(emoji) => onPickRef.current(emoji)} />
      </View>,
    );

    return () => slot.setSheet(null);
  }, [dock, height, open, slot]);

  if (!open || (dock && slot)) {
    return null;
  }

  return <EmojiPanel height={height} onPick={onPick} />;
};

const styles = StyleSheet.create({
  hang: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
