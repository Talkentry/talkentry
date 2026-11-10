import type { ChatLocale } from '../../shared/strings';

/** Local wall-clock time for bubble meta (`HH:mm`, 24h). */
export const formatMessageTime = (createdAt: number, _locale: ChatLocale): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(createdAt));
  } catch {
    const date = new Date(createdAt);

    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
};
