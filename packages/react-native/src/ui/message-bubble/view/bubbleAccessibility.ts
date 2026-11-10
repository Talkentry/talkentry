import { type Message, MessageStatus } from '@talkentry/core';

import { type ChatLocale, chatStrings } from '../../shared/strings';

export const receiptAccessibilityLabel = (
  status: Message['status'],
  locale: ChatLocale,
): string | undefined => {
  switch (status) {
    case MessageStatus.Read:
      return chatStrings[locale].read;
    case MessageStatus.Delivered:
      return chatStrings[locale].delivered;
    case MessageStatus.Sent:
      return chatStrings[locale].sent;
    case MessageStatus.Failed:
      return chatStrings[locale].failed;
    default:
      return undefined;
  }
};

export const bubbleAccessibilityHint = (args: {
  readonly locale: ChatLocale;
  readonly canOpenMenu: boolean;
  readonly canSwipeReply: boolean;
  readonly isMine: boolean;
  readonly receiptStatusLabel?: string;
}): string | undefined => {
  if (args.canOpenMenu) {
    return chatStrings[args.locale].longPressHint;
  }
  if (args.canSwipeReply) {
    return chatStrings[args.locale].replySwipeHint;
  }
  if (args.isMine) {
    return args.receiptStatusLabel;
  }

  return undefined;
};

export const bubbleAccessibilityLabel = (args: {
  readonly isMine: boolean;
  readonly senderLabel: string;
  readonly text: string | undefined;
  readonly timeLabel: string;
}): string => {
  const senderPrefix = args.isMine ? '' : `${args.senderLabel}. `;

  return `${senderPrefix}${args.text ?? ''} ${args.timeLabel}`;
};
