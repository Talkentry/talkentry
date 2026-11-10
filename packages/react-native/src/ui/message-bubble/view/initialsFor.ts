import type { User } from '@talkentry/core';

export const initialsFor = (user: User | undefined, fallbackId: string): string => {
  const source = (user?.name ?? fallbackId).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase() || '?';
};
