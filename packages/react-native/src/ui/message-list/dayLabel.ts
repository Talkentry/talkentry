import type { ChatLocale } from '../shared/strings';
import { chatStrings } from '../shared/strings';

const startOfLocalDay = (ms: number): number => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);

  return date.getTime();
};

/** Human-readable day separator for built-in MessageList (Today / Yesterday / date). */
export const formatDayLabel = (createdAt: number, locale: ChatLocale, now = Date.now()): string => {
  const day = startOfLocalDay(createdAt);
  const today = startOfLocalDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  if (day === today) {
    return chatStrings[locale].today;
  }
  if (day === today - dayMs) {
    return chatStrings[locale].yesterday;
  }
  const date = new Date(createdAt);
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toDateString();
  }
};
