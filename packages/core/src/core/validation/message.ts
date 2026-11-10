import {
  AttachmentType,
  type Message,
  MessageStatus,
  type MessageStatus as MessageStatusValue,
} from '../message';
import {
  ATTACHMENT_NUMBER_FIELDS,
  ATTACHMENT_STRING_FIELDS,
  MAX_ATTACHMENT_STRING_LENGTH,
  MAX_ATTACHMENTS,
  MAX_PAGE_SIZE,
  MAX_REACTION_EMOJI_LENGTH,
  MAX_REACTION_USER_IDS,
  MAX_REACTIONS,
  MAX_TEXT_LENGTH,
  MIN_REACTION_EMOJI_LENGTH,
} from './limits';
import { id, metadata, number, optionalId, record, version } from './primitives';

const MESSAGE_STATUSES: readonly string[] = Object.values(MessageStatus);
const ATTACHMENT_KINDS: readonly string[] = Object.values(AttachmentType);

const isOptionalNumber = (value: unknown): boolean => value === undefined || number(value);

const isOptionalSafeInteger = (value: unknown): boolean =>
  value === undefined || (number(value) && Number.isSafeInteger(value));

const isOptionalBoolean = (value: unknown): boolean =>
  value === undefined || typeof value === 'boolean';

const isOptionalText = (value: unknown, maxLength: number): boolean =>
  value === undefined || (typeof value === 'string' && value.length <= maxLength);

export const isMessageStatus = (value: unknown): value is MessageStatusValue =>
  typeof value === 'string' && MESSAGE_STATUSES.includes(value);

const isOptionalMessageStatus = (value: unknown): boolean =>
  value === undefined || isMessageStatus(value);

const isReaction = (value: unknown): boolean => {
  if (!record(value)) {
    return false;
  }
  if (typeof value.emoji !== 'string') {
    return false;
  }
  if (value.emoji.length < MIN_REACTION_EMOJI_LENGTH) {
    return false;
  }
  if (value.emoji.length > MAX_REACTION_EMOJI_LENGTH) {
    return false;
  }
  if (!Array.isArray(value.userIds)) {
    return false;
  }
  if (value.userIds.length > MAX_REACTION_USER_IDS) {
    return false;
  }

  return value.userIds.every((userId) => id(userId));
};

const isReactionList = (value: unknown): boolean => {
  if (value === undefined) {
    return true;
  }
  if (!Array.isArray(value) || value.length > MAX_REACTIONS) {
    return false;
  }

  return value.every(isReaction);
};

const isAttachment = (value: unknown): boolean => {
  if (!record(value)) {
    return false;
  }
  if (!id(value.id)) {
    return false;
  }
  if (!ATTACHMENT_KINDS.includes(String(value.type))) {
    return false;
  }

  for (const field of ATTACHMENT_NUMBER_FIELDS) {
    if (!isOptionalNumber(value[field])) {
      return false;
    }
  }
  for (const field of ATTACHMENT_STRING_FIELDS) {
    if (!isOptionalText(value[field], MAX_ATTACHMENT_STRING_LENGTH)) {
      return false;
    }
  }

  return metadata(value.metadata);
};

const isAttachmentList = (value: unknown): boolean => {
  if (value === undefined) {
    return true;
  }
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS) {
    return false;
  }

  return value.every(isAttachment);
};

export const isMessage = (value: unknown, chatId: string): value is Message => {
  if (!record(value)) {
    return false;
  }

  if (!id(value.id)) {
    return false;
  }
  if (value.chatId !== chatId) {
    return false;
  }
  if (!id(value.senderId)) {
    return false;
  }
  if (!number(value.createdAt)) {
    return false;
  }
  if (!isOptionalNumber(value.updatedAt)) {
    return false;
  }
  if (!version(value.revision)) {
    return false;
  }
  if (!version(value.sequence)) {
    return false;
  }
  if (!optionalId(value.localId)) {
    return false;
  }
  if (!optionalId(value.replyToId)) {
    return false;
  }
  if (!optionalId(value.threadId)) {
    return false;
  }
  if (!isOptionalSafeInteger(value.replyCount)) {
    return false;
  }
  if (!isOptionalMessageStatus(value.status)) {
    return false;
  }
  if (!isOptionalText(value.text, MAX_TEXT_LENGTH)) {
    return false;
  }
  if (!isOptionalBoolean(value.system)) {
    return false;
  }
  if (!metadata(value.metadata)) {
    return false;
  }
  if (!isReactionList(value.reactions)) {
    return false;
  }
  if (!isAttachmentList(value.attachments)) {
    return false;
  }

  return true;
};

export const assertMessage = (value: unknown, chatId: string): Message => {
  if (!isMessage(value, chatId)) {
    throw new Error('Invalid message payload or scope');
  }

  return value;
};

export const assertMessages = (value: unknown, chatId: string): readonly Message[] => {
  if (!Array.isArray(value) || value.length > MAX_PAGE_SIZE) {
    throw new Error('Invalid receipts payload or scope');
  }

  return value.map((item) => assertMessage(item, chatId));
};
