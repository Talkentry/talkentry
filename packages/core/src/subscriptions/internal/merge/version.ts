import type { Message } from '../../../core/message';

/** Fallback clock when the backend does not send `revision`. */
const contentStamp = (message: Message): number => message.updatedAt ?? message.createdAt;

/** True when `next` must not overwrite `prev` (older revision / older stamp). */
export const isOlderMessage = (next: Message, prev: Message): boolean => {
  if (prev.revision !== undefined) {
    return next.revision === undefined || next.revision < prev.revision;
  }

  return next.revision === undefined && contentStamp(next) < contentStamp(prev);
};

export const isSameMessageVersion = (next: Message, prev: Message): boolean => {
  if (prev.revision !== undefined) {
    return next.revision === prev.revision;
  }

  return next.revision === undefined && contentStamp(next) === contentStamp(prev);
};

export const isNewerRevision = (next: Message, prev: Message): boolean =>
  next.revision !== undefined && (prev.revision === undefined || next.revision > prev.revision);
