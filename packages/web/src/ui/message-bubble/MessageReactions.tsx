import type { Message } from '@talkentry/core';
import type { CSSProperties } from 'react';

import { useTalkentryTheme } from '../../theme';
import { type ChatLocale, chatStrings } from '../shared/strings';

export type MessageReactionsProps = {
  readonly message: Message;
  readonly currentUserId: string;
  readonly locale?: ChatLocale;
  readonly isMine?: boolean;
  readonly onReact?: (emoji: string) => void;
};

export const MessageReactions = ({
  message,
  currentUserId,
  locale = 'en',
  isMine = false,
  onReact,
}: MessageReactionsProps) => {
  const theme = useTalkentryTheme();
  const reactions = message.reactions;

  if (!reactions?.length) {
    return null;
  }

  const strings = chatStrings[locale];
  const countStyle = {
    ...styles.count,
    color: isMine ? theme.colors.textOnAccent : theme.colors.text,
  };

  return (
    <div style={styles.row}>
      {reactions.map((reaction) => {
        const mine = reaction.userIds.includes(currentUserId);
        const chipStyle = {
          ...styles.chip,
          background: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
          ...(mine ? { border: `1px solid ${theme.colors.accent}` } : {}),
        };

        return (
          <button
            key={reaction.emoji}
            type="button"
            aria-label={`${strings.reactLabel} ${reaction.emoji}`}
            aria-pressed={mine}
            onClick={() => onReact?.(reaction.emoji)}
            style={chipStyle}
          >
            {reaction.emoji}
            <span style={countStyle}>{reaction.userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
};

const chip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  border: 'none',
  borderRadius: 10,
  padding: '0 5px 0 3px',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
};

const styles: Record<string, CSSProperties> = {
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  chip,
  count: {
    fontSize: 11,
    fontFamily: 'system-ui, sans-serif',
  },
};
