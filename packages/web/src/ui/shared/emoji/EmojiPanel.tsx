import { type CSSProperties, memo, useLayoutEffect, useRef, useState } from 'react';

import { useTalkentryTheme } from '../../../theme';
import { emojiCategories } from './emojiCatalog';

// Chat re-renders on history poll; skip reconciling the glyph grid unless the panel chrome changes.

export const EmojiPanelVariant = {
  Popover: 'popover',
  Sidebar: 'sidebar',
  Menu: 'menu',
} as const;

export type EmojiPanelVariant = (typeof EmojiPanelVariant)[keyof typeof EmojiPanelVariant];

export type EmojiPanelProps = {
  readonly height?: number;
  readonly variant?: EmojiPanelVariant;
  readonly onPick: (emoji: string) => void;
};

export const EmojiPanel = memo(
  ({ height, variant = EmojiPanelVariant.Popover, onPick }: EmojiPanelProps) => {
    const theme = useTalkentryTheme();
    const [categoryId, setCategoryId] = useState(emojiCategories[0]?.id ?? 'smileys');
    const root = useRef<HTMLDivElement>(null);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;
    const category = emojiCategories.find((item) => item.id === categoryId) ?? emojiCategories[0];
    const emojis = category?.emojis ?? [];
    const sidebar = variant === EmojiPanelVariant.Sidebar;
    let panel = styles.panelPopover;

    switch (variant) {
      case EmojiPanelVariant.Sidebar:
        panel = styles.panelSidebar;
        break;
      case EmojiPanelVariant.Menu:
        panel = styles.panelMenu;
        break;
      default:
        break;
    }

    useLayoutEffect(() => {
      if (!root.current || sidebar || height == null) {
        return;
      }
      root.current.style.height = `${height}px`;
    }, [height, sidebar]);

    return (
      <div
        ref={root}
        style={{
          ...panel,
          background: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <style>{HOVER_CSS}</style>
        <div style={{ ...styles.tabs, borderBottomColor: theme.colors.border }}>
          {emojiCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.id}
              aria-pressed={item.id === categoryId}
              onClick={() => setCategoryId(item.id)}
              style={styles.tab}
            >
              <span style={item.id === categoryId ? styles.tabIconActive : styles.tabIcon}>
                {item.icon}
              </span>
            </button>
          ))}
        </div>
        <div style={sidebar ? styles.gridSidebar : styles.gridPopover}>
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              className="talkentry-emoji-cell"
              onClick={() => onPickRef.current(emoji)}
              style={sidebar ? styles.cellSidebar : styles.cellPopover}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    );
  },
  (prev, next) => prev.height === next.height && prev.variant === next.variant,
);

EmojiPanel.displayName = 'EmojiPanel';

const HOVER_CSS = '.talkentry-emoji-cell:hover{background:rgba(17,17,17,.08);border-radius:8px}';

const styles: Record<string, CSSProperties> = {
  panelPopover: {
    display: 'flex',
    flexDirection: 'column',
    width: 320,
    border: '1px solid',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  panelSidebar: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    height: '100%',
  },
  panelMenu: {
    display: 'flex',
    flexDirection: 'column',
    width: 320,
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid',
    flexShrink: 0,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    height: 40,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 18,
    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
  },
  tabIcon: { opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  gridPopover: {
    flex: 1,
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    alignContent: 'start',
    padding: '6px 0',
  },
  gridSidebar: {
    flex: 1,
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    alignContent: 'start',
    padding: '6px 0',
  },
  cellPopover: {
    minWidth: 0,
    boxSizing: 'border-box',
    height: 40,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 24,
    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
  },
  cellSidebar: {
    minWidth: 0,
    boxSizing: 'border-box',
    height: 44,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 28,
    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
  },
};
