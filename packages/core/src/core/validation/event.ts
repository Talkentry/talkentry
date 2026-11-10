import { type ChatEvent, ChatEventType } from '../events';
import type { ChatEventsPage } from '../pagination';
import { MAX_PAGE_SIZE, MAX_TYPING_USER_IDS } from './limits';
import { isMessage, isMessageStatus } from './message';
import { id, number, optionalId, record, version } from './primitives';

const isTypingUserList = (value: unknown): boolean => {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length > MAX_TYPING_USER_IDS) {
    return false;
  }

  return value.every((userId) => id(userId));
};

export const isChatEvent = (value: unknown, chatId: string): value is ChatEvent => {
  if (!record(value)) {
    return false;
  }

  if (value.type === ChatEventType.MessageAdded || value.type === ChatEventType.MessageUpdated) {
    return isMessage(value.message, chatId);
  }

  if (value.chatId !== chatId) {
    return false;
  }

  switch (value.type) {
    case ChatEventType.HistoryInvalidated:
      return true;
    case ChatEventType.TypingUpdated:
      return isTypingUserList(value.userIds);
    case ChatEventType.MessageRemoved:
      return id(value.messageId) && version(value.revision);
    case ChatEventType.MessageStatus:
      return (
        id(value.messageId) &&
        version(value.revision) &&
        isMessageStatus(value.status) &&
        optionalId(value.serverId)
      );
    default:
      return false;
  }
};

const isChatEventList = (value: unknown, chatId: string): boolean => {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length > MAX_PAGE_SIZE) {
    return false;
  }

  return value.every((event) => isChatEvent(event, chatId));
};

const isEventsPage = (value: unknown, chatId: string): value is ChatEventsPage => {
  if (!record(value)) {
    return false;
  }
  if (!isChatEventList(value.events, chatId)) {
    return false;
  }
  if (!number(value.latestCursor)) {
    return false;
  }
  if (!Number.isSafeInteger(value.latestCursor)) {
    return false;
  }
  if (typeof value.hasMore !== 'boolean') {
    return false;
  }

  return true;
};

export const assertEventsPage = (value: unknown, chatId: string): ChatEventsPage => {
  if (!isEventsPage(value, chatId)) {
    throw new Error('Invalid events payload or scope');
  }

  return value;
};
