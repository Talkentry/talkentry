import { type ChatLocale, chatStrings } from '../shared/strings';

const dayKey = (createdAt: number) => {
  const date = new Date(createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const formatDayLabel = (createdAt: number, locale: ChatLocale): string => {
  const key = dayKey(createdAt);
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 24 * 60 * 60 * 1000);
  const strings = chatStrings[locale];

  if (key === today) {
    return strings.today;
  }
  if (key === yesterday) {
    return strings.yesterday;
  }

  return new Date(createdAt).toLocaleDateString();
};
