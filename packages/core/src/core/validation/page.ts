import type { MessagePage } from '../pagination';
import { MAX_PAGE_SIZE, MIN_HISTORY_GAP_MISSING_COUNT } from './limits';
import { isMessage } from './message';
import { id, number, optionalId, record } from './primitives';

const isOptionalSafeInteger = (value: unknown): boolean =>
  value === undefined || (number(value) && Number.isSafeInteger(value));

const isHistoryGap = (value: unknown): boolean => {
  if (!record(value)) {
    return false;
  }
  if (!id(value.afterId)) {
    return false;
  }
  if (!id(value.beforeId)) {
    return false;
  }
  if (value.afterId === value.beforeId) {
    return false;
  }
  if (value.missingCount === undefined) {
    return true;
  }
  if (!number(value.missingCount)) {
    return false;
  }
  if (!Number.isSafeInteger(value.missingCount)) {
    return false;
  }

  return value.missingCount >= MIN_HISTORY_GAP_MISSING_COUNT;
};

const isHistoryGapList = (value: unknown): boolean => {
  if (value === undefined) {
    return true;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length > MAX_PAGE_SIZE) {
    return false;
  }

  return value.every(isHistoryGap);
};

const isMessageList = (value: unknown, chatId: string): boolean => {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length > MAX_PAGE_SIZE) {
    return false;
  }

  return value.every((message) => isMessage(message, chatId));
};

const isMessagePage = (value: unknown, chatId: string): value is MessagePage => {
  if (!record(value)) {
    return false;
  }
  if (!isMessageList(value.messages, chatId)) {
    return false;
  }
  if (typeof value.hasMoreBefore !== 'boolean') {
    return false;
  }
  if (typeof value.hasMoreAfter !== 'boolean') {
    return false;
  }
  if (!optionalId(value.oldestId)) {
    return false;
  }
  if (!optionalId(value.newestId)) {
    return false;
  }
  if (!isHistoryGapList(value.gaps)) {
    return false;
  }
  if (!isOptionalSafeInteger(value.eventCursor)) {
    return false;
  }

  return true;
};

export const assertPage = (value: unknown, chatId: string): MessagePage => {
  if (!isMessagePage(value, chatId)) {
    throw new Error('Invalid history payload or scope');
  }

  return value;
};
