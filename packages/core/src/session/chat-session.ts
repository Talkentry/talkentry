import { MessageStatus } from '../core/message';
import { MAX_PAGE_SIZE } from '../core/validation';
import { MessageStore } from '../subscriptions';
import { initialTimelineWindow, TimelineActionType, TimelineLoadMode } from '../timeline';
import { dispatch, notify } from './internal/commit';
import { clearTypingState, receiveEvent } from './internal/events';
import {
  cancelNavigation as runCancelNavigation,
  loadAround as runLoadAround,
  loadLatest as runLoadLatest,
  loadNewer as runLoadNewer,
  loadOlder as runLoadOlder,
} from './internal/history';
import {
  deleteMessage as runDeleteMessage,
  editMessage as runEditMessage,
  sendMessage as runSendMessage,
  toggleReaction as runToggleReaction,
} from './internal/mutations';
import { sendReceipts } from './internal/receipts';
import type { SessionHandle } from './internal/session-handle';
import { createSessionHandle, isSessionActive } from './internal/session-handle';
import type { ChatSessionOptions, SendMessageInput, SubscribeLocalSendAccepted } from './types';

export type { ChatSessionOptions, SendMessageInput } from './types';

let nextSession = 0;

/** Independent of React/RN. One instance serves one scope and one lifecycle epoch. */
export class ChatSession {
  readonly id = ++nextSession;
  readonly messageStore: MessageStore;
  /** Mutable runtime shared with session modules (history, events, mutations, …). */
  private readonly runtime: SessionHandle;
  private unsubscribe?: () => void;

  constructor(readonly options: ChatSessionOptions) {
    const pageSize = options.pageSize ?? 30;
    const maxPending = options.maxPendingSends ?? 16;
    const timeoutMs = options.requestTimeoutMs ?? 30000;
    const maxTombstones = options.maxTombstones ?? 1000;

    for (const limit of [pageSize, maxPending, timeoutMs, maxTombstones]) {
      if (!Number.isSafeInteger(limit) || limit < 1) {
        throw new Error('Invalid session limits');
      }
    }

    if (pageSize > MAX_PAGE_SIZE) {
      throw new Error('pageSize exceeds payload limit');
    }

    this.messageStore = new MessageStore(maxTombstones);
    this.runtime = createSessionHandle({
      id: this.id,
      options: this.options,
      messageStore: this.messageStore,
      pageSize,
      maxPending,
      timeoutMs,
    });
  }

  getSnapshot = () => this.runtime.state;

  subscribe = (listener: () => void): (() => void) => {
    this.runtime.listeners.add(listener);

    return () => {
      this.runtime.listeners.delete(listener);
    };
  };
  /** No replay: only a newly accepted local send can request viewport navigation. */
  subscribeLocalSendAccepted: SubscribeLocalSendAccepted = (listener) => {
    this.runtime.localSendListeners.add(listener);

    return () => {
      this.runtime.localSendListeners.delete(listener);
    };
  };

  isActive = (): boolean => isSessionActive(this.runtime);

  start = (): void => {
    if (this.runtime.active) {
      return;
    }

    this.runtime.active = true;
    this.runtime.blocked = false;
    const epoch = ++this.runtime.epoch;

    // Request starts before subscribe: the watermark includes all following live events.
    runLoadLatest(this.runtime, TimelineLoadMode.Initial).catch(() => undefined);

    try {
      this.unsubscribe = this.options.adapter.subscribe(this.options.chatId, (event) => {
        if (this.runtime.active && epoch === this.runtime.epoch) {
          receiveEvent(this.runtime, event);
        }
      });
    } catch {
      this.runtime.blocked = true;
      this.runtime.history?.controller.abort();
      dispatch(this.runtime, {
        type: TimelineActionType.LoadError,
        error: new Error('Subscription failed'),
      });
    }
  };

  stop = (): void => {
    this.runtime.active = false;
    this.runtime.epoch += 1;
    this.runtime.threadId = null;
    this.runtime.eventCursor = undefined;
    clearTypingState(this.runtime);

    if (this.runtime.receiptTimer !== undefined) {
      clearTimeout(this.runtime.receiptTimer);
      this.runtime.receiptTimer = undefined;
    }

    this.runtime.receiptsBusy = false;
    this.runtime.receiptsQueued = false;
    this.runtime.history?.controller.abort();
    this.runtime.history = undefined;

    for (const controller of this.runtime.pending.values()) {
      controller.abort();
    }
    this.runtime.pending.clear();
    this.runtime.localTailKeys.clear();

    try {
      this.unsubscribe?.();
    } catch {
      // An external cleanup failure must not leave old-scope data inside the SDK.
    }

    this.unsubscribe = undefined;

    this.messageStore.batch(() => {
      this.runtime.state = initialTimelineWindow();
      this.messageStore.clear();
      notify(this.runtime);
    });
  };

  /** Active thread root id, or null for the main channel spine. */
  getThreadId = (): string | null => this.runtime.threadId;

  /** Peer user ids currently typing (excludes the local actor). Stable ref when unchanged. */
  getTypingUserIds = (): readonly string[] => this.runtime.typingUserIds;

  /**
   * Signal local typing. Requires `capabilities.typingIndicators`.
   * Debounced idle clear is owned by Composer; this method is idempotent.
   */
  setTyping = async (isTyping: boolean): Promise<void> => {
    if (!this.isActive()) {
      return;
    }

    const adapter = this.options.adapter;

    if (!adapter.capabilities.typingIndicators || !adapter.setTyping) {
      return;
    }
    if (this.runtime.localTyping === isTyping) {
      return;
    }

    this.runtime.localTyping = isTyping;

    if (this.runtime.typingIdleTimer !== undefined) {
      clearTimeout(this.runtime.typingIdleTimer);
      this.runtime.typingIdleTimer = undefined;
    }

    try {
      await adapter.setTyping({
        chatId: this.options.chatId,
        actorId: this.options.currentUserId,
        isTyping,
      });
    } catch {
      // Typing is best-effort; ignore transport failures.
    }
  };

  /**
   * Open a thread window (root + replies). Requires `capabilities.threads`.
   * Reloads latest for that thread scope.
   */
  enterThread = async (rootMessageId: string): Promise<boolean> => {
    if (!this.options.adapter.capabilities.threads) {
      throw new Error('ChatAdapter does not support threads');
    }

    if (!this.isActive()) {
      return false;
    }

    this.runtime.threadId = rootMessageId;

    return runLoadLatest(this.runtime, TimelineLoadMode.Refresh);
  };

  /** Leave thread view and reload the main channel. */
  leaveThread = async (): Promise<boolean> => {
    if (!this.isActive()) {
      return false;
    }

    this.runtime.threadId = null;

    return runLoadLatest(this.runtime, TimelineLoadMode.Refresh);
  };

  loadLatest = (
    mode:
      typeof TimelineLoadMode.Initial | typeof TimelineLoadMode.Refresh = TimelineLoadMode.Refresh,
  ): Promise<boolean> => runLoadLatest(this.runtime, mode);

  loadOlder = (): Promise<boolean> => runLoadOlder(this.runtime);

  loadNewer = (options: { readonly force?: boolean } = {}): Promise<boolean> =>
    runLoadNewer(this.runtime, options);

  loadAround = (messageId: string): Promise<boolean> => runLoadAround(this.runtime, messageId);

  /** Cancel latest/around navigation; ordinary history pagination is not interrupted. */
  cancelNavigation = (): void => runCancelNavigation(this.runtime);

  /**
   * Explicit delivery ACK for peer messages. Prefer automatic session receipts
   * when `capabilities.deliveryReceipts` is set; this is for host-driven flows.
   */
  markDelivered = (messageIds: readonly string[]): Promise<boolean> =>
    sendReceipts(this.runtime, MessageStatus.Delivered, { messageIds });

  /**
   * Explicit read ACK. Without `upToMessageId` uses current `newestId` when at tip.
   */
  markRead = (upToMessageId?: string): Promise<boolean> =>
    sendReceipts(this.runtime, MessageStatus.Read, {
      upToMessageId:
        upToMessageId ??
        (!this.runtime.state.hasMoreAfter ? this.runtime.state.newestId : undefined),
    });

  /** Exact incoming IDs observed by an active viewport. Does not mark intervening rows read. */
  markReadMessages = (messageIds: readonly string[]): Promise<boolean> =>
    sendReceipts(this.runtime, MessageStatus.Read, { messageIds });

  edit = (messageId: string, text: string): Promise<void> =>
    runEditMessage(this.runtime, messageId, text);

  toggleReaction = (messageId: string, emoji: string): Promise<void> =>
    runToggleReaction(this.runtime, messageId, emoji);

  delete = (messageId: string): Promise<void> => runDeleteMessage(this.runtime, messageId);

  send = (input: SendMessageInput): Promise<void> => runSendMessage(this.runtime, input);
}
