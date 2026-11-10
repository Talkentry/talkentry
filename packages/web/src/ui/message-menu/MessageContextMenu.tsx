import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useTalkentryTheme } from '../../theme';
import type { MessageActionItem } from '../message-bubble/actions/messageActions';
import { EmojiPanel, EmojiPanelVariant } from '../shared/emoji/EmojiPanel';
import { type ChatLocale, chatStrings } from '../shared/strings';
import { MessageReactionStrip } from './MessageReactionStrip';

export type MessageContextMenuProps = {
  readonly locale?: ChatLocale;
  readonly x: number;
  readonly y: number;
  readonly actions: readonly MessageActionItem[];
  readonly selectedReaction?: string | null;
  readonly onReact?: (emoji: string) => void;
  readonly onSelect: (action: MessageActionItem) => void;
  readonly onClose: () => void;
};

export const MessageContextMenu = ({
  locale = 'en',
  x,
  y,
  actions,
  selectedReaction,
  onReact,
  onSelect,
  onClose,
}: MessageContextMenuProps) => {
  const theme = useTalkentryTheme();
  const strings = chatStrings[locale];
  const layer = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useLayoutEffect(() => {
    const el = layer.current;
    if (!el || typeof window === 'undefined') {
      return;
    }

    const rect = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y, actions, pickerOpen, onReact]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (pickerOpen) {
        setPickerOpen(false);

        return;
      }

      onClose();
    };

    const onPointer = (event: Event) => {
      const node = event.target;
      if (node instanceof Node && layer.current?.contains(node)) {
        return;
      }
      onClose();
    };

    const onScroll = (event: Event) => {
      const node = event.target;
      if (node instanceof Node && layer.current?.contains(node)) {
        return;
      }
      onClose();
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onPointer);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onPointer);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose, pickerOpen]);

  return (
    <div ref={layer} style={styles.layer}>
      {onReact ? (
        <div
          style={{
            ...(pickerOpen ? styles.reactionOpen : styles.reaction),
            background: theme.colors.surface,
          }}
        >
          <MessageReactionStrip
            locale={locale}
            selectedReaction={selectedReaction}
            expanded={pickerOpen}
            onReact={onReact}
            onToggleExpand={() => setPickerOpen((open) => !open)}
          />
          {pickerOpen ? (
            <EmojiPanel variant={EmojiPanelVariant.Menu} height={240} onPick={onReact} />
          ) : null}
        </div>
      ) : null}
      {actions.length ? (
        <div
          role="group"
          aria-label={strings.messageActions}
          style={{ ...styles.menu, background: theme.colors.surface }}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              aria-label={action.accessibilityLabel}
              onClick={() => onSelect(action)}
              style={
                action.destructive
                  ? { ...styles.destructive, color: theme.colors.danger }
                  : { ...styles.item, color: theme.colors.text }
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const item: CSSProperties = {
  display: 'block',
  width: '100%',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  padding: '8px 14px',
  font: 'inherit',
  cursor: 'pointer',
};

const styles: Record<string, CSSProperties> = {
  layer: {
    position: 'fixed',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    pointerEvents: 'none',
  },
  reaction: {
    pointerEvents: 'auto',
    display: 'flex',
    borderRadius: 22,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
  reactionOpen: {
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  menu: {
    pointerEvents: 'auto',
    minWidth: 180,
    padding: '6px 0',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
  item,
  destructive: { ...item },
};
