import type { ChatId, Message, MessageId, MessageStatus } from './message';

/**
 * Wire discriminants for realtime / deferred adapter events.
 * Values stay stable for JSON transport; compare via this object, not raw strings.
 */
export const ChatEventType = {
  /** Transport lost continuity; session should replay or reload history. */
  HistoryInvalidated: 'history.invalidated',
  /** A new message entered the chat (send ack or peer message). */
  MessageAdded: 'message.added',
  /** An existing message changed (edit, reactions, etc.). */
  MessageUpdated: 'message.updated',
  /** A message was hard-deleted. */
  MessageRemoved: 'message.removed',
  /** Delivery/read status advanced for a message. */
  MessageStatus: 'message.status',
  /** Ephemeral typing roster changed. */
  TypingUpdated: 'typing.updated',
} as const;

export type ChatEventType = (typeof ChatEventType)[keyof typeof ChatEventType];

/**
 * Realtime or deferred updates delivered by an adapter.
 */
export type ChatEvent =
  | {
      /**
       * Transport lost continuity (typically reconnect). Session prefers durable
       * `loadEvents` replay when a cursor is known; else catch-up via loadAfter
       * at tip + window reconcile; otherwise reloads latest.
       */
      readonly type: typeof ChatEventType.HistoryInvalidated;
      /** Chat whose history continuity was lost. */
      readonly chatId: ChatId;
    }
  | {
      /** New message upsert into the active window. */
      readonly type: typeof ChatEventType.MessageAdded;
      /** Canonical message payload after validation. */
      readonly message: Message;
      /** Durable journal cursor when the backend records events. */
      readonly cursor?: number;
    }
  | {
      /** Existing message replaced with a newer revision. */
      readonly type: typeof ChatEventType.MessageUpdated;
      /** Full message snapshot after the update. */
      readonly message: Message;
      /** Durable journal cursor when the backend records events. */
      readonly cursor?: number;
    }
  | {
      /** Message hard-deleted from the chat. */
      readonly type: typeof ChatEventType.MessageRemoved;
      /** Chat that owned the removed message. */
      readonly chatId: ChatId;
      /** Id of the removed message (server or previously aliased local). */
      readonly messageId: MessageId;
      /** Entity revision at removal time when the backend provides it. */
      readonly revision?: number;
      /** Durable journal cursor when the backend records events. */
      readonly cursor?: number;
    }
  | {
      /** Delivery/read tick for a known message. */
      readonly type: typeof ChatEventType.MessageStatus;
      /** Chat that owns the message. */
      readonly chatId: ChatId;
      /** Message whose status advanced (may be a local id before alias). */
      readonly messageId: MessageId;
      /** New status; must only move forward in rank. */
      readonly status: MessageStatus;
      /** Entity revision when the backend versions status changes. */
      readonly revision?: number;
      /**
       * Present when a temporary/local id was replaced by a server id.
       */
      readonly serverId?: MessageId;
      /** Durable journal cursor when the backend records events. */
      readonly cursor?: number;
    }
  | {
      /** Ephemeral typing roster for the chat (not durable history). */
      readonly type: typeof ChatEventType.TypingUpdated;
      /** Chat whose typing roster changed. */
      readonly chatId: ChatId;
      /** User ids currently typing (excluding local handling in session). */
      readonly userIds: readonly string[];
    };

/** Listener invoked for each validated realtime/deferred event. */
export type ChatEventListener = (event: ChatEvent) => void;

/** Tear down a previous `subscribe` registration. */
export type Unsubscribe = () => void;
