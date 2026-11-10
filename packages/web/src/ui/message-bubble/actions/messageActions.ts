import type { Message } from '@talkentry/core';

import { type ChatLocale, chatStrings } from '../../shared/strings';

export const MessageActionId = {
  Reply: 'reply',
  Copy: 'copy',
  Edit: 'edit',
  Forward: 'forward',
  Delete: 'delete',
} as const;

export type MessageActionId = (typeof MessageActionId)[keyof typeof MessageActionId];

export type MessageActionItem = {
  readonly id: MessageActionId;
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly destructive?: boolean;
};

export type MessageActionHandlers = {
  readonly onReply?: (message: Message) => void;
  readonly onEdit?: (message: Message) => void;
  readonly onDelete?: (message: Message) => void;
  readonly onCopy?: (message: Message) => void;
  readonly onForward?: (message: Message) => void;
};

/** Built-in menu rows for a confirmed message, Telegram order, delete last. */
export const buildMessageActions = (
  message: Message,
  currentUserId: string,
  locale: ChatLocale,
  handlers: MessageActionHandlers,
): MessageActionItem[] => {
  const confirmed = message.id !== message.localId;
  if (!confirmed || message.system) {
    return [];
  }

  const strings = chatStrings[locale];
  const isMine = message.senderId === currentUserId;
  const hasText = !!message.text?.trim();
  const actions: MessageActionItem[] = [];

  if (handlers.onReply) {
    actions.push({
      id: MessageActionId.Reply,
      label: strings.reply,
      accessibilityLabel: strings.replyLabel,
    });
  }

  if (handlers.onCopy && hasText) {
    actions.push({
      id: MessageActionId.Copy,
      label: strings.copy,
      accessibilityLabel: strings.copyLabel,
    });
  }

  if (isMine && handlers.onEdit && hasText) {
    actions.push({
      id: MessageActionId.Edit,
      label: strings.edit,
      accessibilityLabel: strings.editLabel,
    });
  }

  if (handlers.onForward) {
    actions.push({
      id: MessageActionId.Forward,
      label: strings.forward,
      accessibilityLabel: strings.forwardLabel,
    });
  }

  if (isMine && handlers.onDelete) {
    actions.push({
      id: MessageActionId.Delete,
      label: strings.delete,
      accessibilityLabel: strings.deleteLabel,
      destructive: true,
    });
  }

  return actions;
};
