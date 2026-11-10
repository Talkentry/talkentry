/**
 * Contract limits bound payload handling; they do not replace the host HTTP body size limit.
 */
export const MAX_TEXT_LENGTH = 64 * 1024;
export const MAX_METADATA_BYTES = 16 * 1024;
export const MAX_PAGE_SIZE = 1000;
export const MAX_ID_LENGTH = 512;
export const MAX_REACTIONS = 32;
export const MIN_REACTION_EMOJI_LENGTH = 1;
export const MAX_REACTION_EMOJI_LENGTH = 16;
export const MAX_REACTION_USER_IDS = 256;
export const MAX_ATTACHMENTS = 32;
export const MAX_ATTACHMENT_STRING_LENGTH = 4096;
export const MAX_TYPING_USER_IDS = 64;
export const MIN_HISTORY_GAP_MISSING_COUNT = 1;

/** Optional numeric fields accepted on attachment payloads. */
export const ATTACHMENT_NUMBER_FIELDS = ['size', 'width', 'height', 'durationMs'] as const;

/** Optional string fields accepted on attachment payloads. */
export const ATTACHMENT_STRING_FIELDS = ['url', 'name', 'mimeType'] as const;
