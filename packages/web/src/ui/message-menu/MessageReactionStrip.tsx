import type { CSSProperties } from 'react';

import { useTalkentryTheme } from '../../theme';
import { type ChatLocale, chatStrings } from '../shared/strings';
import { QUICK_REACTIONS } from './quickReactions';

export type MessageReactionStripProps = {
  readonly locale?: ChatLocale;
  readonly selectedReaction?: string | null;
  readonly expanded: boolean;
  readonly onReact: (emoji: string) => void;
  readonly onToggleExpand: () => void;
};

export const MessageReactionStrip = ({
  locale = 'en',
  selectedReaction,
  expanded,
  onReact,
  onToggleExpand,
}: MessageReactionStripProps) => {
  const theme = useTalkentryTheme();
  const strings = chatStrings[locale];

  return (
    <div style={styles.strip}>
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={`${strings.reactLabel} ${emoji}`}
          aria-pressed={emoji === selectedReaction}
          onClick={() => onReact(emoji)}
          style={
            emoji === selectedReaction
              ? { ...styles.quickSelected, background: theme.colors.inputBackground }
              : styles.quick
          }
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        aria-label={strings.moreReactions}
        aria-pressed={expanded}
        onClick={onToggleExpand}
        style={{
          ...(expanded ? styles.expandOpen : styles.expand),
          color: theme.colors.textMuted,
          ...(expanded ? { background: theme.colors.inputBackground } : {}),
        }}
      >
        {expanded ? '‹' : '›'}
      </button>
    </div>
  );
};

const quick: CSSProperties = {
  width: 36,
  height: 36,
  border: 'none',
  borderRadius: 18,
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 22,
  fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
};

const expand: CSSProperties = {
  ...quick,
  fontSize: 20,
};

const styles: Record<string, CSSProperties> = {
  strip: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '4px 6px',
  },
  quick,
  quickSelected: { ...quick },
  expand,
  expandOpen: { ...expand },
};
