import type { ChatEvent } from './events';
import type { Message, MessageId } from './message';

/**
 * Explicit discontinuity between two messages in server order.
 * `afterId` is the older retained message; `beforeId` is the newer one.
 */
export interface HistoryGap {
  /** Older retained message id on the near side of the hole. */
  readonly afterId: MessageId;
  /** Newer retained message id on the far side of the hole. */
  readonly beforeId: MessageId;
  /** Optional count of missing messages between the edges when known. */
  readonly missingCount?: number;
}

/**
 * One page of chat history returned by an adapter.
 *
 * Messages should be ordered from oldest to newest.
 */
export interface MessagePage {
  /** Page rows ordered oldest → newest. */
  readonly messages: readonly Message[];
  /** True when older history may still exist before this page. */
  readonly hasMoreBefore: boolean;
  /** True when newer history may still exist after this page. */
  readonly hasMoreAfter: boolean;
  /** Oldest message id in this page when non-empty. */
  readonly oldestId?: MessageId;
  /** Newest message id in this page when non-empty. */
  readonly newestId?: MessageId;
  /** Optional holes inside this page (sequence skips). */
  readonly gaps?: readonly HistoryGap[];
  /**
   * Tip of the durable chat event journal when the adapter supports `loadEvents`.
   * Session stores this for reconnect replay.
   */
  readonly eventCursor?: number;
}

/** One durable journal page (reconnect replay). Oldest → newest. */
export interface ChatEventsPage {
  /** Journal events in this page, oldest → newest. */
  readonly events: readonly ChatEvent[];
  /** Highest cursor included in / known after this page. */
  readonly latestCursor: number;
  /** True when older journal pages may still exist before this batch. */
  readonly hasMore: boolean;
}

export interface LoadEventsParams {
  /** Chat whose durable event journal is being read. */
  readonly chatId: string;
  /** Exclusive: return events with cursor greater than this value. */
  readonly afterCursor?: number;
  /** Max events to return (adapter/backend may clamp). */
  readonly limit?: number;
  /** Abort signal for the in-flight request. */
  readonly signal?: AbortSignal;
}

export interface LoadLatestParams {
  /** Chat to load. */
  readonly chatId: string;
  /** Max messages in the page (adapter/backend may clamp). */
  readonly limit?: number;
  /** Abort signal for the in-flight request. */
  readonly signal?: AbortSignal;
  /** When set, load that thread (root + replies). When omitted, main channel roots only. */
  readonly threadId?: MessageId;
}

export interface LoadBeforeParams {
  /** Chat to load. */
  readonly chatId: string;
  /** Load messages strictly older than this id. */
  readonly beforeId: MessageId;
  /** Max messages in the page (adapter/backend may clamp). */
  readonly limit?: number;
  /** Abort signal for the in-flight request. */
  readonly signal?: AbortSignal;
  /** When set, paginate inside that thread instead of the main channel. */
  readonly threadId?: MessageId;
}

export interface LoadAfterParams {
  /** Chat to load. */
  readonly chatId: string;
  /** Load messages strictly newer than this id. */
  readonly afterId: MessageId;
  /** Max messages in the page (adapter/backend may clamp). */
  readonly limit?: number;
  /** Abort signal for the in-flight request. */
  readonly signal?: AbortSignal;
  /** When set, paginate inside that thread instead of the main channel. */
  readonly threadId?: MessageId;
}

export interface LoadAroundParams {
  /** Chat to load. */
  readonly chatId: string;
  /** Anchor id; page should include context around this message. */
  readonly aroundId: MessageId;
  /** Max messages in the page (adapter/backend may clamp). */
  readonly limit?: number;
  /** Abort signal for the in-flight request. */
  readonly signal?: AbortSignal;
  /** When set, jump inside that thread instead of the main channel. */
  readonly threadId?: MessageId;
}
