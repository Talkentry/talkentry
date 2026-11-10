import type { User } from '@talkentry/core';

import { type ChatLocale, chatStrings } from '../shared/strings';

export const typingLabel = (
  userIds: readonly string[],
  users: Readonly<Record<string, User>> | undefined,
  locale: ChatLocale,
): string => {
  const strings = chatStrings[locale];

  if (!userIds.length) {
    return '';
  }

  const names = userIds.map((id) => users?.[id]?.name ?? id);

  if (names.length === 1) {
    return `${names[0]} ${strings.typingOne}`;
  }
  if (names.length === 2) {
    return `${names[0]}, ${names[1]} ${strings.typingMany}`;
  }

  return `${names[0]} +${names.length - 1} ${strings.typingMany}`;
};
