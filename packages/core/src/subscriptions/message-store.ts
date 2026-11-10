import type { Message, MessageId, MessageStatus } from '../core/message';
import { collapseRemoteEcho, mergeWithExisting, statusRanksAbove } from './internal/merge';

type Listener = () => void;

type Entry = {
  /** Canonical message under this UI key. */
  message: Message;
  /** Store clock when content/status last changed. */
  changedAt: number;
  /** Store clock when the key first appeared (for concurrent history watermarks). */
  insertedAt: number;
};

/**
 * Sole owner of active message entities (maps, aliases, tombstones, notify).
 * Timeline stores structural keys only.
 *
 * Upsert merge rules live in `./internal/merge` — this class does not reinvent them.
 */
export class MessageStore {
  /** UI key → active message entry. */
  private readonly entries = new Map<string, Entry>();
  /** localId / server id → canonical UI key. */
  private readonly aliases = new Map<string, string>();
  /** Ids that must never resurrect after delete. */
  private readonly tombstones = new Set<string>();
  /** Per-id subscribers (`useMessage`). */
  private readonly listeners = new Map<string, Set<Listener>>();
  /** Alias/keys touched inside the current batch; flushed together. */
  private readonly touched = new Set<string>();
  /** Nested `batch` depth; notify only when it returns to 0. */
  private depth = 0;
  /** Monotonic store clock for watermarks / changedSince. */
  private clock = 0;

  constructor(private readonly maxTombstones = 1000) {}

  get version(): number {
    return this.clock;
  }

  get size(): number {
    return this.entries.size;
  }

  get aliasCount(): number {
    return this.aliases.size;
  }

  get tombstoneCount(): number {
    return this.tombstones.size;
  }

  get = (id: MessageId): Message | undefined => this.entries.get(this.resolve(id))?.message;

  resolve = (id: string): string => this.aliases.get(id) ?? id;

  keys = (): readonly string[] => [...this.entries.keys()];

  changedSince = (key: string, version: number): boolean =>
    (this.entries.get(this.resolve(key))?.changedAt ?? 0) > version;

  insertedSince = (key: string, version: number): boolean =>
    (this.entries.get(this.resolve(key))?.insertedAt ?? 0) > version;

  subscribe = (id: string, listener: Listener): (() => void) => {
    const set = this.listeners.get(id) ?? new Set<Listener>();
    this.listeners.set(id, set);
    set.add(listener);

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(id);
      }
    };
  };

  /** Notifications are deferred until entities and window structure are consistent. */
  batch = <T>(work: () => T): T => {
    this.depth += 1;

    try {
      return work();
    } finally {
      this.depth -= 1;
      if (this.depth === 0) {
        this.flush();
      }
    }
  };

  /**
   * Insert or merge a message. Returns the stable UI key, or `undefined` when
   * the id is tombstoned (delete wins).
   */
  upsert = (incoming: Message, historyStartedAt?: number): string | undefined => {
    if (this.isTombstoned(incoming)) {
      return undefined;
    }

    const key = this.resolve(incoming.localId ?? incoming.id);
    const previous = this.entries.get(key);
    const remoteKey = this.resolve(incoming.id);
    const remote = remoteKey !== key ? this.entries.get(remoteKey) : undefined;

    let message = incoming;

    if (previous) {
      const merged = mergeWithExisting(
        key,
        previous.message,
        incoming,
        historyStartedAt,
        previous.changedAt,
      );

      if (merged.action === 'keep') {
        return key;
      }
      message = merged.message;
    }

    if (remote) {
      message = collapseRemoteEcho(message, remote.message);
      this.evict(remoteKey);
    }

    if (previous?.message === message) {
      return key;
    }

    this.writeEntry(key, message, previous);
    this.flush();

    return key;
  };

  patchStatus = (id: string, status: MessageStatus, serverId?: string, revision?: number): void => {
    const old = this.get(id);

    if (serverId && old && serverId !== old.id && !old.localId) {
      return;
    }
    if (!old || (revision !== undefined && old.revision !== undefined && revision < old.revision)) {
      return;
    }
    if (statusRanksAbove(old.status, status)) {
      return;
    }

    this.upsert({
      ...old,
      id: serverId ?? old.id,
      status,
      revision: revision ?? old.revision,
    });
  };

  remove = (id: string, revision?: number): void => {
    const key = this.resolve(id);
    const old = this.get(key);

    if (old?.revision !== undefined && (revision === undefined || revision < old.revision)) {
      return;
    }

    const ids = new Set(
      [id, key, old?.id, old?.localId].filter((value): value is string => !!value),
    );
    const added = [...ids].filter((value) => !this.tombstones.has(value));

    // Do not silently forget deletes: when the budget is exhausted, session blocks new data.
    if (this.tombstones.size + added.length > this.maxTombstones) {
      throw new Error('Deletion retention limit reached; authoritative session resync required');
    }

    for (const value of ids) {
      this.tombstones.add(value);
    }
    this.evict(key);
    this.flush();
  };

  /** Drop entities outside the retained window / pending set. */
  retain = (keys: ReadonlySet<string>): void => {
    for (const key of this.entries.keys()) {
      if (!keys.has(key)) {
        this.evict(key);
      }
    }

    this.flush();
  };

  clear = (): void => {
    for (const key of this.entries.keys()) {
      this.evict(key);
    }
    this.tombstones.clear();
    this.flush();
  };

  private isTombstoned = (incoming: Message): boolean =>
    this.tombstones.has(incoming.id) ||
    (incoming.localId !== undefined && this.tombstones.has(incoming.localId));

  private writeEntry = (key: string, message: Message, previous: Entry | undefined): void => {
    this.removeAliases(key);
    this.entries.set(key, {
      message,
      changedAt: ++this.clock,
      insertedAt: previous?.insertedAt ?? this.clock,
    });

    for (const alias of new Set(
      [key, message.id, message.localId].filter((value): value is string => !!value),
    )) {
      this.aliases.set(alias, key);
      this.touched.add(alias);
    }
  };

  private removeAliases = (key: string): void => {
    const message = this.entries.get(key)?.message;

    for (const alias of [key, message?.id, message?.localId]) {
      if (alias && this.aliases.get(alias) === key) {
        this.aliases.delete(alias);
        this.touched.add(alias);
      }
    }
  };

  private evict = (key: string): void => {
    this.removeAliases(key);
    this.entries.delete(key);
    this.touched.add(key);
  };

  private flush = (): void => {
    if (this.depth > 0) {
      return;
    }

    const ids = [...this.touched];
    this.touched.clear();

    const callbacks = new Set<Listener>();

    for (const id of ids) {
      for (const callback of this.listeners.get(id) ?? []) {
        callbacks.add(callback);
      }
    }

    for (const callback of callbacks) {
      callback();
    }
  };
}
