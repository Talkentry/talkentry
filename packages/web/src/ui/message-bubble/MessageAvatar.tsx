import type { User } from '@talkentry/core';
import type { CSSProperties } from 'react';

import { useTalkentryTheme } from '../../theme';

const AVATAR_SIZE = 32;

export type MessageAvatarProps = {
  readonly user?: User;
  readonly senderId: string;
  readonly visible: boolean;
};

const initialsFor = (user: User | undefined, fallbackId: string): string => {
  const source = (user?.name ?? fallbackId).trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';

    return `${first}${second}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase() || '?';
};

export const MessageAvatar = ({ user, senderId, visible }: MessageAvatarProps) => {
  const theme = useTalkentryTheme();

  if (!visible) {
    return <div aria-hidden style={styles.spacer} />;
  }

  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name ?? senderId} style={styles.image} />;
  }

  return (
    <div
      aria-hidden
      style={{
        ...styles.fallback,
        background: theme.colors.border,
        color: theme.colors.textMuted,
      }}
    >
      {initialsFor(user, senderId)}
    </div>
  );
};

const face: CSSProperties = {
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  borderRadius: AVATAR_SIZE / 2,
  flexShrink: 0,
  alignSelf: 'flex-end',
};

const styles: Record<string, CSSProperties> = {
  spacer: { ...face, visibility: 'hidden' },
  image: { ...face, objectFit: 'cover', display: 'block' },
  fallback: {
    ...face,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
};
