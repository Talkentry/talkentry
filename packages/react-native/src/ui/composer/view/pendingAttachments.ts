import type { Attachment } from '@talkentry/core';

export const MAX_PENDING_ATTACHMENTS = 8;

export const appendPendingAttachments = (
  current: readonly Attachment[],
  list: readonly Attachment[],
): Attachment[] => {
  const next = [...current];

  for (const item of list) {
    if (next.length >= MAX_PENDING_ATTACHMENTS) {
      break;
    }
    if (next.some((existing) => existing.id === item.id)) {
      continue;
    }
    next.push(item);
  }

  return next;
};
