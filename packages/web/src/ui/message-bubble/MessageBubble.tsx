import type { Message, User } from '@talkentry/core';
import type { CSSProperties, MouseEvent } from 'react';

import { useMessage } from '../../react/hooks';
import { useTalkentryTheme } from '../../theme';
import type { ChatSlots } from '../shared/slots';
import { type ChatLocale, chatStrings } from '../shared/strings';
import { MessageAttachments } from './MessageAttachments';
import { MessageAvatar } from './MessageAvatar';
import { MessageReactions } from './MessageReactions';
import { MessageReceipt } from './MessageReceipt';

export type MessageBubbleProps = {
  readonly message: Message;
  readonly currentUserId: string;
  readonly locale?: ChatLocale;
  readonly user?: User;
  readonly users?: Readonly<Record<string, User>>;
  readonly groupedWithPrevious?: boolean;
  readonly groupedWithNext?: boolean;
  readonly onContextMenu?: (event: MouseEvent, message: Message) => void;
  readonly onReact?: (message: Message, emoji: string) => void;
  readonly renderMessageBody?: ChatSlots['renderMessageBody'];
};

const timeLabel = (createdAt: number) => {
  const date = new Date(createdAt);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

export const MessageBubble = ({
  message,
  currentUserId,
  locale = 'en',
  user,
  users,
  groupedWithPrevious = false,
  groupedWithNext = false,
  onContextMenu,
  onReact,
  renderMessageBody,
}: MessageBubbleProps) => {
  const theme = useTalkentryTheme();
  const strings = chatStrings[locale];
  const own = message.senderId === currentUserId;
  const name = user?.name ?? message.senderId;
  const showName = !own && !groupedWithPrevious;
  const showAvatar = !own && !groupedWithNext;
  const clock = timeLabel(message.createdAt);
  const edited = Boolean(message.updatedAt && message.updatedAt > message.createdAt);
  const replyParent = useMessage(message.replyToId ?? '');

  if (message.system) {
    return <div style={{ ...styles.system, color: theme.colors.textMuted }}>{message.text}</div>;
  }

  const bubbleStyle = own
    ? { ...styles.bubble, background: theme.colors.bubbleMine, color: theme.colors.textOnAccent }
    : { ...styles.bubble, background: theme.colors.bubbleTheirs, color: theme.colors.text };
  const quoteStyle = own
    ? {
        ...styles.quote,
        color: theme.colors.textOnAccent,
        borderLeftColor: theme.colors.textOnAccent,
      }
    : { ...styles.quote, color: theme.colors.accent, borderLeftColor: theme.colors.accent };
  const metaStyle = own
    ? { ...styles.meta, color: theme.colors.textOnAccent }
    : { ...styles.meta, color: theme.colors.textMuted };

  const body = renderMessageBody ? (
    renderMessageBody({
      message,
      replyParent,
      currentUserId,
      isMine: own,
      timeLabel: clock,
      status: message.status,
      edited,
      locale,
      showSenderHeader: !groupedWithPrevious,
      showAvatar,
      groupedWithPrevious,
      groupedWithNext,
      senderLabel: name,
      users,
    })
  ) : (
    <div style={bubbleStyle}>
      {showName ? (
        <div style={{ ...styles.name, color: theme.colors.textMuted }}>{name}</div>
      ) : null}
      {message.replyToId ? <div style={quoteStyle}>↪ {message.replyToId}</div> : null}
      {message.attachments?.length ? (
        <MessageAttachments attachments={message.attachments} isMine={own} />
      ) : null}
      {message.text ? <div style={styles.text}>{message.text}</div> : null}
      <div style={styles.footer}>
        <MessageReactions
          message={message}
          currentUserId={currentUserId}
          locale={locale}
          isMine={own}
          onReact={onReact ? (emoji) => onReact(message, emoji) : undefined}
        />
        <div style={metaStyle}>
          {edited ? <span>{strings.edited}</span> : null}
          <span>{clock}</span>
          {own ? <MessageReceipt status={message.status} locale={locale} /> : null}
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={own ? styles.rowOwn : styles.rowOther}
      onContextMenu={(event) => onContextMenu?.(event, message)}
    >
      {own ? null : <MessageAvatar user={user} senderId={message.senderId} visible={showAvatar} />}
      <div style={own ? styles.stackOwn : styles.stackOther}>{body}</div>
    </div>
  );
};

const bubble: CSSProperties = {
  borderRadius: 14,
  padding: '6px 10px',
  boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
};

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 8,
  margin: '2px 8px',
  cursor: 'context-menu',
};
const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '75%',
};

const styles: Record<string, CSSProperties> = {
  rowOwn: { ...row, justifyContent: 'flex-end' },
  rowOther: { ...row, justifyContent: 'flex-start' },
  stackOwn: { ...stack, alignItems: 'flex-end' },
  stackOther: { ...stack, alignItems: 'flex-start' },
  bubble,
  system: { textAlign: 'center', fontSize: 12, margin: '8px 0' },
  name: { fontSize: 12, fontWeight: 600, marginBottom: 2 },
  quote: {
    fontSize: 12,
    borderLeft: '2px solid',
    paddingLeft: 6,
    marginBottom: 4,
    opacity: 0.9,
  },
  text: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },
};
