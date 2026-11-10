import { type CSSProperties, useEffect } from 'react';

import { emojiCategories } from './emojiCatalog';

const EMOJI_FONT = '28px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

const warmupText = emojiCategories.map((item) => `${item.icon}${item.emojis.join('')}`).join('');

export const EmojiGlyphWarmup = () => {
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.load) {
      return;
    }

    document.fonts.load(EMOJI_FONT, warmupText).catch(() => undefined);
  }, []);

  return (
    <div aria-hidden style={styles.warmup}>
      {warmupText}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  warmup: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 300,
    height: 240,
    overflow: 'hidden',
    opacity: 0,
    pointerEvents: 'none',
    fontSize: 28,
    lineHeight: 1.2,
    zIndex: 0,
    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
  },
};
