import type { Attachment, ChatId, Message, MessageId, MessageStatus } from './message';
import type { UserId } from './user';

/**
 * Command to send a new message through an adapter.
 *
 * The adapter owns network transport, auth and durable outbox behavior.
 */
export interface SendMessageCommand {
  /** Abort signal for the in-flight send. */
  readonly signal?: AbortSignal;
  /** Target conversation. */
  readonly chatId: ChatId;
  /**
   * Author of the outgoing message. Required by most backends.
   */
  readonly senderId: UserId;
  /** Plain text body when sending text (may be omitted for media-only). */
  readonly text?: string;
  /**
   * Optional client id for optimistic UI and later server-id reconciliation.
   */
  readonly localId?: string;
  /** Quote-reply parent message id when replying. */
  readonly replyToId?: MessageId;
  /** Place the message in a thread rooted at this main-channel message id. */
  readonly threadId?: MessageId;
  /** Attachments already uploaded (or inline) to include with the send. */
  readonly attachments?: readonly Attachment[];
  /** Host-defined extras forwarded to the backend. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Advance delivery/read status on peer messages (actor is not the sender).
 * Status must only move forward; backends reject or no-op regressions.
 */
export interface UpdateReceiptsCommand {
  /** Abort signal for the in-flight receipt call. */
  readonly signal?: AbortSignal;
  /** Chat whose peer messages are being acknowledged. */
  readonly chatId: ChatId;
  /** Local user acknowledging delivery/read (must not be the sender). */
  readonly actorId: UserId;
  /** Target receipt rank: delivered or read. */
  readonly status: typeof MessageStatus.Delivered | typeof MessageStatus.Read;
  /** Explicit ids (max batch is adapter/backend-defined, typically ≤100). */
  readonly messageIds?: readonly MessageId[];
  /** Inclusive sequence anchor: advance peer messages up to this id. */
  readonly upToMessageId?: MessageId;
}

/**
 * Edit an existing message's text. Actor must be the original sender.
 */
export interface EditMessageCommand {
  /** Abort signal for the in-flight edit. */
  readonly signal?: AbortSignal;
  /** Chat that owns the message. */
  readonly chatId: ChatId;
  /** Message being edited. */
  readonly messageId: MessageId;
  /** Must be the original sender. */
  readonly actorId: UserId;
  /** Replacement plain text body. */
  readonly text: string;
}

/**
 * Hard-delete an existing message. Actor must be the original sender.
 * Backend should fan out `message.removed` with the revision at removal.
 */
export interface DeleteMessageCommand {
  /** Abort signal for the in-flight delete. */
  readonly signal?: AbortSignal;
  /** Chat that owns the message. */
  readonly chatId: ChatId;
  /** Message being deleted. */
  readonly messageId: MessageId;
  /** Must be the original sender. */
  readonly actorId: UserId;
}

/** Result of a successful delete; revision is the value at removal time. */
export interface DeleteMessageResult {
  /** Chat that owned the deleted message. */
  readonly chatId: ChatId;
  /** Id of the deleted message. */
  readonly messageId: MessageId;
  /** Entity revision at removal time when the backend provides it. */
  readonly revision?: number;
}

/**
 * Upload a local file before send. Host/picker supplies uri; adapter owns transport.
 */
export interface UploadAttachmentCommand {
  /** Abort signal for the in-flight upload. */
  readonly signal?: AbortSignal;
  /** Local file URI from the host picker. */
  readonly uri: string;
  /** Optional file name for multipart upload. */
  readonly name?: string;
  /** Optional MIME type for multipart upload. */
  readonly mimeType?: string;
}

/**
 * Toggle an emoji reaction for the actor on a message.
 */
export interface ToggleReactionCommand {
  /** Abort signal for the in-flight reaction toggle. */
  readonly signal?: AbortSignal;
  /** Chat that owns the message. */
  readonly chatId: ChatId;
  /** Message receiving the reaction toggle. */
  readonly messageId: MessageId;
  /** User toggling the emoji. */
  readonly actorId: UserId;
  /** Emoji glyph to add or remove. */
  readonly emoji: string;
}

/**
 * Refresh known window messages after reconnect (edit/delete/reactions barrier).
 * Missing ids are treated as hard-deleted.
 */
export interface ReconcileMessagesCommand {
  /** Abort signal for the in-flight reconcile. */
  readonly signal?: AbortSignal;
  /** Chat whose known ids are being refreshed. */
  readonly chatId: ChatId;
  /** Ids currently in the retained window (or host-known set). */
  readonly messageIds: readonly MessageId[];
}

export interface ReconcileMessagesResult {
  /** Current snapshots for ids that still exist. */
  readonly messages: readonly Message[];
  /** Ids that no longer exist on the server (hard-deleted). */
  readonly removedIds: readonly MessageId[];
}

/** Ephemeral typing signal for the actor in a chat. */
export interface SetTypingCommand {
  /** Abort signal for the in-flight typing call. */
  readonly signal?: AbortSignal;
  /** Chat where the actor is typing. */
  readonly chatId: ChatId;
  /** Local user whose typing state is published. */
  readonly actorId: UserId;
  /** True while the composer has non-empty draft activity. */
  readonly isTyping: boolean;
}
