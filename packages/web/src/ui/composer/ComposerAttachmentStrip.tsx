import { type Attachment, AttachmentType } from '@talkentry/core';
import type { CSSProperties } from 'react';

import { useTalkentryTheme } from '../../theme';
import { type ChatLocale, chatStrings } from '../shared/strings';

export type ComposerAttachmentStripProps = {
  readonly locale?: ChatLocale;
  readonly attachments: readonly Attachment[];
  readonly onRemove: (id: string) => void;
};

const preview = (item: Attachment, nameColor: string) => {
  if (item.type === AttachmentType.Image && item.url) {
    return <img src={item.url} alt={item.name ?? 'image'} style={styles.thumb} />;
  }

  return <span style={{ ...styles.name, color: nameColor }}>{item.name ?? 'File'}</span>;
};

export const ComposerAttachmentStrip = ({
  locale = 'en',
  attachments,
  onRemove,
}: ComposerAttachmentStripProps) => {
  const theme = useTalkentryTheme();
  const strings = chatStrings[locale];

  if (!attachments.length) {
    return null;
  }

  return (
    <div style={styles.row}>
      {attachments.map((item) => (
        <div
          key={item.id}
          style={{
            ...styles.chip,
            background: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          {preview(item, theme.colors.text)}
          <button
            type="button"
            aria-label={strings.removeAttachment}
            onClick={() => onRemove(item.id)}
            style={{
              ...styles.remove,
              background: theme.colors.textMuted,
              color: theme.colors.textOnAccent,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    maxWidth: 160,
    padding: '4px 8px',
    borderRadius: 8,
    border: '1px solid',
  },
  thumb: {
    display: 'block',
    width: 56,
    height: 56,
    objectFit: 'cover',
    borderRadius: 6,
  },
  name: {
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    border: 'none',
    borderRadius: 9,
    cursor: 'pointer',
    lineHeight: '18px',
    fontSize: 12,
    padding: 0,
  },
};
