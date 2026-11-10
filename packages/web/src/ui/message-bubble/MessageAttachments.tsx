import { type Attachment, AttachmentType } from '@talkentry/core';
import type { CSSProperties } from 'react';

import { useTalkentryTheme } from '../../theme';

export type MessageAttachmentsProps = {
  readonly attachments: readonly Attachment[];
  readonly isMine?: boolean;
};

const itemView = (item: Attachment, fileStyle: CSSProperties) => {
  if (item.type === AttachmentType.Image && item.url) {
    return (
      <a key={item.id} href={item.url} target="_blank" rel="noreferrer" style={styles.link}>
        <img src={item.url} alt={item.name ?? 'image'} style={styles.image} />
      </a>
    );
  }

  if (item.url) {
    return (
      <a key={item.id} href={item.url} target="_blank" rel="noreferrer" style={fileStyle}>
        {item.name ?? 'File'}
      </a>
    );
  }

  return (
    <span key={item.id} style={fileStyle}>
      {item.name ?? 'File'}
    </span>
  );
};

export const MessageAttachments = ({ attachments, isMine = false }: MessageAttachmentsProps) => {
  const theme = useTalkentryTheme();

  if (!attachments.length) {
    return null;
  }

  const fileStyle = {
    ...styles.file,
    color: isMine ? theme.colors.textOnAccent : theme.colors.accent,
  };

  return <div style={styles.stack}>{attachments.map((item) => itemView(item, fileStyle))}</div>;
};

const styles: Record<string, CSSProperties> = {
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 4,
  },
  link: { display: 'block' },
  image: {
    display: 'block',
    maxWidth: 240,
    maxHeight: 180,
    borderRadius: 8,
    objectFit: 'cover',
  },
  file: {
    fontSize: 13,
    wordBreak: 'break-all',
  },
};
