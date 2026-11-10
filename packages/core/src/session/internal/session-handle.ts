import type { MessageStore } from '../../subscriptions';
import {
  createTimelineReducer,
  initialTimelineWindow,
  type TimelineLoadMode,
  type TimelineWindow,
} from '../../timeline';
import type { ChatSessionOptions, LocalSendAccepted } from '../types';

export type HistoryRequest = {
  readonly mode: TimelineLoadMode;
  /** AbortController for the in-flight history page request. */
  controller: AbortController;
  /** Shared promise so older/newer callers can join the same load. */
  task: Promise<boolean>;
};

/**
 * Package-internal mutable session runtime.
 * Owned exclusively by `ChatSession`; free functions receive this handle.
 */
export type SessionHandle = {
  /** Monotonic session instance id (for localId generation / diagnostics). */
  readonly id: number;
  /** Constructor options: adapter, chatId, actor, limits. */
  readonly options: ChatSessionOptions;
  /** Canonical message entities for this scope. */
  readonly messageStore: MessageStore;
  /** History page size passed to adapter loads. */
  readonly pageSize: number;
  /** Max concurrent in-flight optimistic sends. */
  readonly maxPending: number;
  /** Per-request timeout even if the adapter ignores AbortSignal. */
  readonly timeoutMs: number;
  /** localId → AbortController for sends still awaiting ack. */
  readonly pending: Map<string, AbortController>;
  /** Bounded IDs of accepted sends outside the current window, not duplicate entities. */
  readonly localTailKeys: Set<string>;
  /** Ephemeral synchronous intent listeners, separate from structural snapshots. */
  readonly localSendListeners: Set<(event: LocalSendAccepted) => void>;
  /** Monotonic across stop/start so an old event cannot replay after remount. */
  localSendSequence: number;
  /** External snapshot subscribers (`getSnapshot` / React). */
  readonly listeners: Set<() => void>;
  /** Pure timeline window reducer (keys, gaps, load status). */
  readonly reducer: ReturnType<typeof createTimelineReducer>;

  /** Current timeline window (keys, edges, gaps, load status). */
  state: TimelineWindow;
  /** Last state reference already pushed to listeners (skip duplicate notify). */
  notifiedState: TimelineWindow;
  /** Active history page request, if any. */
  history: HistoryRequest | undefined;
  /** Target id from the latest `loadAround` until the page commits. */
  aroundFocusId: string | undefined;
  /** Null = main channel (roots only). Set = active thread root id. */
  threadId: string | null;
  /** Ephemeral peer typing roster (never stored in MessageStore). */
  typingUserIds: readonly string[];
  /** Last local typing flag sent to the adapter. */
  localTyping: boolean;
  /** Optional idle timer for local typing clear (Composer usually owns debounce). */
  typingIdleTimer: ReturnType<typeof setTimeout> | undefined;
  /** Debounce timer before flushing auto delivery/read receipts. */
  receiptTimer: ReturnType<typeof setTimeout> | undefined;
  /** True while a receipt flush is in flight. */
  receiptsBusy: boolean;
  /** Another flush was requested during the busy flush. */
  receiptsQueued: boolean;
  /** Tip of durable chat event journal (`loadEvents` / reconnect replay). */
  eventCursor: number | undefined;
  /** Session was started and not yet stopped. */
  active: boolean;
  /** Fail-closed: retention exhausted or subscribe failed — refuse mutations. */
  blocked: boolean;
  /** Bumped on start/stop; async results must match before applying. */
  epoch: number;
};

export type CreateSessionHandleParams = {
  readonly id: number;
  readonly options: ChatSessionOptions;
  readonly messageStore: MessageStore;
  readonly pageSize: number;
  readonly maxPending: number;
  readonly timeoutMs: number;
};

/** Build the initial runtime bag for a new `ChatSession`. */
export const createSessionHandle = ({
  id,
  options,
  messageStore,
  pageSize,
  maxPending,
  timeoutMs,
}: CreateSessionHandleParams): SessionHandle => {
  const state = initialTimelineWindow();

  return {
    id,
    options,
    messageStore,
    pageSize,
    maxPending,
    timeoutMs,
    pending: new Map(),
    localTailKeys: new Set(),
    localSendListeners: new Set(),
    localSendSequence: 0,
    listeners: new Set(),
    reducer: createTimelineReducer({ maxMessages: options.maxMessages }),
    state,
    notifiedState: state,
    history: undefined,
    aroundFocusId: undefined,
    threadId: null,
    typingUserIds: Object.freeze([]),
    localTyping: false,
    typingIdleTimer: undefined,
    receiptTimer: undefined,
    receiptsBusy: false,
    receiptsQueued: false,
    eventCursor: undefined,
    active: false,
    blocked: false,
    epoch: 0,
  };
};

export const isSessionActive = (session: SessionHandle): boolean =>
  session.active && !session.blocked;
