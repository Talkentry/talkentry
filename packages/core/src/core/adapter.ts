import type {
  DeleteMessageCommand,
  DeleteMessageResult,
  EditMessageCommand,
  ReconcileMessagesCommand,
  ReconcileMessagesResult,
  SendMessageCommand,
  SetTypingCommand,
  ToggleReactionCommand,
  UpdateReceiptsCommand,
  UploadAttachmentCommand,
} from './commands';
import type { ChatEventListener, Unsubscribe } from './events';
import type { Attachment, Message } from './message';
import type {
  ChatEventsPage,
  LoadAfterParams,
  LoadAroundParams,
  LoadBeforeParams,
  LoadEventsParams,
  LoadLatestParams,
  MessagePage,
} from './pagination';

/**
 * Declares which history and receipt operations an adapter actually supports.
 *
 * Host apps must not assume every backend can jump around an arbitrary id or
 * emit delivery/read receipts. Unsupported capabilities should be reported
 * honestly instead of being faked.
 */
export interface ChatAdapterCapabilities {
  /** Can paginate older history with `loadBefore`. */
  readonly loadBefore: boolean;
  /** Can paginate newer history with `loadAfter` (catch-up). */
  readonly loadAfter: boolean;
  /** Can jump to a message with surrounding context via `loadAround`. */
  readonly loadAround: boolean;
  /** Can ACK peer delivery via `updateReceipts` with delivered status. */
  readonly deliveryReceipts: boolean;
  /** Can ACK peer read via `updateReceipts` with read status. */
  readonly readReceipts: boolean;
  /** Can edit own messages via `editMessage`. */
  readonly editMessage: boolean;
  /** Can hard-delete own messages via `deleteMessage`. */
  readonly deleteMessage: boolean;
  /** Can upload media via `uploadAttachment` before send. */
  readonly uploadAttachment: boolean;
  /** Can toggle emoji reactions via `toggleReaction`. */
  readonly reactions: boolean;
  /** Backend scopes history/send by `threadId`. */
  readonly threads: boolean;
  /** Batch refresh of known window ids after reconnect (edit/delete barrier). */
  readonly reconcileMessages: boolean;
  /** Ephemeral peer typing indicators. */
  readonly typingIndicators: boolean;
  /** Durable per-chat event journal for reconnect replay. */
  readonly loadEvents: boolean;
}

/**
 * Host-owned integration boundary between Talkentry and any backend.
 *
 * Talkentry owns active UI state. The adapter owns persistence, transport,
 * authorization and server-side reconciliation.
 */
export interface ChatAdapter {
  /** Feature flags for optional methods on this adapter instance. */
  readonly capabilities: ChatAdapterCapabilities;

  /** Load the newest page (main channel or thread). */
  loadLatest(params: LoadLatestParams): Promise<MessagePage>;

  /** Load an older page before a known id. */
  loadBefore(params: LoadBeforeParams): Promise<MessagePage>;

  /** Load a newer page after a known id (catch-up). */
  loadAfter?(params: LoadAfterParams): Promise<MessagePage>;

  /** Load a page centered on a known id (jump-to-message). */
  loadAround?(params: LoadAroundParams): Promise<MessagePage>;

  /** Persist a new message; return the authoritative server row. */
  send(command: SendMessageCommand): Promise<Message>;

  /**
   * Optional. Required when `deliveryReceipts` or `readReceipts` is true.
   * Returns messages whose status actually advanced.
   */
  updateReceipts?(command: UpdateReceiptsCommand): Promise<readonly Message[]>;

  /** Optional. Required when `editMessage` capability is true. */
  editMessage?(command: EditMessageCommand): Promise<Message>;

  /** Optional. Required when `deleteMessage` capability is true. */
  deleteMessage?(command: DeleteMessageCommand): Promise<DeleteMessageResult>;

  /** Optional. Required when `uploadAttachment` capability is true. */
  uploadAttachment?(command: UploadAttachmentCommand): Promise<Attachment>;

  /** Optional. Required when `reactions` capability is true. */
  toggleReaction?(command: ToggleReactionCommand): Promise<Message>;

  /** Optional. Required when `reconcileMessages` capability is true. */
  reconcileMessages?(command: ReconcileMessagesCommand): Promise<ReconcileMessagesResult>;

  /** Optional. Required when `typingIndicators` capability is true. */
  setTyping?(command: SetTypingCommand): Promise<void>;

  /** Optional. Required when `loadEvents` capability is true. */
  loadEvents?(params: LoadEventsParams): Promise<ChatEventsPage>;

  /**
   * Subscribe to realtime/deferred events for a chat.
   * Returns an unsubscribe that must stop fan-out for this listener.
   */
  subscribe(chatId: string, listener: ChatEventListener): Unsubscribe;
}
