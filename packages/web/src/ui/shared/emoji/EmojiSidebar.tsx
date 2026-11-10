import { type CSSProperties, memo } from 'react';

import { useTalkentryTheme } from '../../../theme';
import { EmojiPanel, EmojiPanelVariant } from './EmojiPanel';

export const EMOJI_SIDEBAR_WIDTH = 300;

export type EmojiSidebarProps = {
  readonly open: boolean;
  readonly label: string;
  readonly onPick: (emoji: string) => void;
};

export const EmojiSidebar = memo(
  ({ open, label, onPick }: EmojiSidebarProps) => {
    const theme = useTalkentryTheme();
    const shell = open ? styles.shellOpen : styles.shell;

    return (
      <aside
        aria-hidden={!open}
        aria-label={label}
        style={{
          ...shell,
          borderLeftColor: theme.colors.border,
          background: theme.colors.surface,
        }}
      >
        <div style={styles.inner}>
          <EmojiPanel variant={EmojiPanelVariant.Sidebar} onPick={onPick} />
        </div>
      </aside>
    );
  },
  (prev, next) => prev.open === next.open && prev.label === next.label,
);

EmojiSidebar.displayName = 'EmojiSidebar';

const styles: Record<string, CSSProperties> = {
  shell: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: EMOJI_SIDEBAR_WIDTH,
    overflow: 'hidden',
    borderLeft: '1px solid',
    pointerEvents: 'none',
    zIndex: 3,
    transform: 'translateX(100%)',
    transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'transform',
    backfaceVisibility: 'hidden',
  },
  shellOpen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: EMOJI_SIDEBAR_WIDTH,
    overflow: 'hidden',
    borderLeft: '1px solid',
    pointerEvents: 'auto',
    zIndex: 3,
    transform: 'translateX(0)',
    transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'transform',
    backfaceVisibility: 'hidden',
  },
  inner: {
    width: EMOJI_SIDEBAR_WIDTH,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
};
