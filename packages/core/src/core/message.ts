import type { UserId } from './user';

/**
 * Entity id: temporary local id until ack, then server id.
 * For React keys use stable timeline messageKeys, not this field.
 */
export type MessageId = string;

/**
 * Identifier of a conversation / channel / thread scope.
 */
export type ChatId = string;

/**
 * Delivery lifecycle of a message from the current user's perspective.
 */
export const MessageStatus = {
  /** Optimistic local send in flight. */
  Sending: 'sending',
  /** Accepted by the server; not yet delivered to peers. */
  Sent: 'sent',
  /** Delivered to peer device(s). */
  Delivered: 'delivered',
  /** Read by the peer. */
  Read: 'read',
  /** Local or server send failed; may be retried. */
  Failed: 'failed',
} as const;

export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

/**
 * Attachment kind. Host apps may use `custom` for product-specific payloads.
 */
export const AttachmentType = {
  /** Raster / image attachment. */
  Image: 'image',
  /** Generic file download. */
  File: 'file',
  /** Audio clip. */
  Audio: 'audio',
  /** Video clip. */
  Video: 'video',
  /** Host-defined payload; SDK does not interpret contents. */
  Custom: 'custom',
} as const;

export type AttachmentType = (typeof AttachmentType)[keyof typeof AttachmentType];

/**
 * Media or file payload attached to a message.
 *
 * Rendering details stay outside core. This contract only describes data.
 */
export interface Attachment {
  /** Stable attachment id within the message (or upload result). */
  readonly id: string;
  /** Attachment kind used by UI to pick a renderer. */
  readonly type: AttachmentType;
  /** Fetchable URL after upload; may be relative until the adapter absolutizes it. */
  readonly url?: string;
  /** Display / download file name. */
  readonly name?: string;
  /** MIME type when known (e.g. image/jpeg). */
  readonly mimeType?: string;
  /** File size in bytes when known. */
  readonly size?: number;
  /** Pixel width for image/video when known. */
  readonly width?: number;
  /** Pixel height for image/video when known. */
  readonly height?: number;
  /** Duration for audio/video in milliseconds when known. */
  readonly durationMs?: number;
  /** Host-defined extras; Talkentry does not interpret them. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Aggregated emoji reaction on a message (one group per emoji).
 */
export interface Reaction {
  /** Emoji glyph for this reaction group. */
  readonly emoji: string;
  /** Users who currently hold this emoji on the message. */
  readonly userIds: readonly UserId[];
}

/**
 * Canonical chat message model used by Talkentry.
 *
 * Timestamps are Unix epoch milliseconds for portability across adapters.
 */
export interface Message {
  /** Active id: local until ack, then server id (see also `localId`). */
  readonly id: MessageId;
  /** Monotonic entity version from the server. Prefer over client clocks. */
  readonly revision?: number;
  /** Immutable server order; falls back to createdAt/id when absent. */
  readonly sequence?: number;
  /**
   * Idempotent client id kept after ack and used as the stable UI key.
   */
  readonly localId?: string;
  /** Conversation this message belongs to. */
  readonly chatId: ChatId;
  /** Author user id. */
  readonly senderId: UserId;
  /** Plain text body when present. */
  readonly text?: string;
  /**
   * Service/notice row (GiftedChat-style). Rendered centered without bubble chrome;
   * not editable/reactable via built-in actions.
   */
  readonly system?: boolean;
  /** Created-at Unix epoch milliseconds. */
  readonly createdAt: number;
  /** Last content update Unix epoch milliseconds (edits). */
  readonly updatedAt?: number;
  /** Delivery lifecycle for the current viewer when known. */
  readonly status?: MessageStatus;
  /** Parent message id when this row is a quote-reply. */
  readonly replyToId?: MessageId;
  /**
   * Root message id when this row is a thread reply. Absent/undefined on main spine.
   */
  readonly threadId?: MessageId;
  /** Number of thread replies under a root (main-channel) message. */
  readonly replyCount?: number;
  /** Aggregated reactions on this message. */
  readonly reactions?: readonly Reaction[];
  /** Media/file payloads on this message. */
  readonly attachments?: readonly Attachment[];
  /** Host-defined extras; Talkentry does not interpret them. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}
