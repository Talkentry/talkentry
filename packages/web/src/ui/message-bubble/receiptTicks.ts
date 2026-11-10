import { type Message, MessageStatus } from '@talkentry/core';

import { type ChatLocale, chatStrings } from '../shared/strings';

export type ReceiptTicks = {
  readonly label: string;
  readonly read: boolean;
  readonly accessibilityLabel: string;
};

/** Map core `Message.status` to ticks. Glyphs stay in UI, not in `@talkentry/core`. */
export const receiptTicks = (
  status: Message['status'],
  locale: ChatLocale,
): ReceiptTicks | null => {
  const strings = chatStrings[locale];

  switch (status) {
    case MessageStatus.Sending:
      return { label: '…', read: false, accessibilityLabel: strings.sending };
    case MessageStatus.Failed:
      return { label: strings.failed, read: false, accessibilityLabel: strings.failed };
    case MessageStatus.Read:
      return { label: '✓✓', read: true, accessibilityLabel: strings.read };
    case MessageStatus.Delivered:
      return { label: '✓✓', read: false, accessibilityLabel: strings.delivered };
    case MessageStatus.Sent:
      return { label: '✓', read: false, accessibilityLabel: strings.sent };
    default:
      return null;
  }
};
