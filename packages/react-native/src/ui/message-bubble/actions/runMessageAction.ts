import type { Message } from '@talkentry/core';

import {
  type MessageActionHandlers,
  MessageActionId,
  type MessageActionItem,
} from './messageActions';

export const runMessageAction = (
  action: MessageActionItem,
  message: Message,
  callbacks: MessageActionHandlers,
): void => {
  switch (action.id) {
    case MessageActionId.Reply:
      callbacks.onReply?.(message);
      break;
    case MessageActionId.Copy:
      callbacks.onCopy?.(message);
      break;
    case MessageActionId.Edit:
      callbacks.onEdit?.(message);
      break;
    case MessageActionId.Forward:
      callbacks.onForward?.(message);
      break;
    case MessageActionId.Delete:
      callbacks.onDelete?.(message);
      break;
    default:
      break;
  }
};
