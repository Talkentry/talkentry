import type { ChatAdapter } from '../core/adapter';
import type { SendMessageCommand } from '../core/commands';

export type SendMessageInput = Omit<SendMessageCommand, 'chatId' | 'senderId' | 'signal'>;

/** Ephemeral local intent, not a server event or durable-outbox acknowledgement. */
export type LocalSendAccepted = {
  /** Monotonically increasing within this source; never replay old events on subscribe. */
  readonly sequence: number;
  /** Stable optimistic identity, retained through reconciliation. */
  readonly localId: string;
  /** Destination thread; null means the main channel. */
  readonly threadId: string | null;
  /** The old window cannot safely receive the new tail directly. */
  readonly requiresLatest: boolean;
};

/** The source delivers synchronously after local acceptance; cleanup must stop delivery. */
export type SubscribeLocalSendAccepted = (
  listener: (event: LocalSendAccepted) => void,
) => () => void;

export type ChatSessionOptions = {
  readonly adapter: ChatAdapter;
  readonly chatId: string;
  readonly currentUserId: string;
  readonly scopeKey?: string;
  readonly pageSize?: number;
  readonly maxMessages?: number;
  /** Cap for in-flight sends and, independently, accepted sends staged outside the window. Default 16. */
  readonly maxPendingSends?: number;
  readonly maxTombstones?: number;
  readonly requestTimeoutMs?: number;
};
