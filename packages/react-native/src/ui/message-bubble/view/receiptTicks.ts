import { type Message, MessageStatus } from '@talkentry/core';

import { type ChatLocale, chatStrings } from '../../shared/strings';

export const receiptTicks = (
  status: Message['status'],
  locale: ChatLocale,
): { label: string; read: boolean } | null => {
  switch (status) {
    case MessageStatus.Sending:
      return { label: '…', read: false };
    case MessageStatus.Failed:
      return { label: chatStrings[locale].failed, read: false };
    case MessageStatus.Read:
      return { label: '✓✓', read: true };
    case MessageStatus.Delivered:
      return { label: '✓✓', read: false };
    case MessageStatus.Sent:
      return { label: '✓', read: false };
    default:
      return null;
  }
};
