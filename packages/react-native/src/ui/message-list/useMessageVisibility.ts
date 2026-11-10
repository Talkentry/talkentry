import {
  type ChatSession,
  type Message,
  type TimelineChange,
  TimelineChangeKind,
} from '@talkentry/core';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const READ_DWELL_MS = 250;
const ACK_RETRY_COOLDOWN_MS = 1000;

/** Candidate visibility is cheap; this hook checks the unobscured reading area
 * and continuous dwell time before notifying the host or sending exact ACKs. */
type Params = {
  readonly scope: string;
  readonly keys: readonly string[];
  readonly change: TimelineChange;
  readonly currentUserId: string;
  readonly firstUnreadId?: string;
  readonly isActive: boolean;
  readonly resolve: (key: string) => Message | undefined;
  readonly isReadable: (key: string) => boolean;
  readonly session?: ChatSession;
  readonly onMessagesRead?: (ids: readonly string[]) => void;
  readonly topInset: number;
  readonly bottomInset: number;
};

export const useMessageVisibility = (params: Params) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const candidates = useRef<readonly string[]>([]);
  const seen = useRef(new Set<string>());
  const unread = useRef(new Set<string>());
  const acknowledged = useRef(new Set<string>());
  const inFlight = useRef(new Set<string>());
  const retryAt = useRef(new Map<string, number>());
  const entered = useRef(new Map<string, number>());
  const previous = useRef<readonly string[]>([]);
  const previousCursor = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(AppState.currentState === 'active');
  const epoch = useRef(0);
  const alive = useRef(true);
  const latest = useRef(params);
  latest.current = params;

  const incoming = (key: string) => {
    const input = latest.current;
    const message = input.resolve(key);
    if (
      !message ||
      message.system ||
      message.senderId === input.currentUserId ||
      message.localId === message.id
    ) {
      return;
    }

    return message.id;
  };

  const observe = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (!alive.current) {
      return;
    }
    const input = latest.current;
    if (!active.current || !input.isActive) {
      entered.current.clear();

      return;
    }
    const now = Date.now();
    const visible = new Set<string>();
    const fresh: string[] = [];
    const ack: string[] = [];
    let nextDeadline = Infinity;
    for (const key of candidates.current) {
      const id = incoming(key);
      if (!id || !input.isReadable(key)) {
        continue;
      }
      visible.add(id);
      const since = entered.current.get(id) ?? now;
      entered.current.set(id, since);
      if (now - since < READ_DWELL_MS) {
        nextDeadline = Math.min(nextDeadline, since + READ_DWELL_MS);
        continue;
      }
      if (!seen.current.has(id)) {
        seen.current.add(id);
        unread.current.delete(id);
        fresh.push(id);
      }
      if (
        input.session &&
        !acknowledged.current.has(id) &&
        !inFlight.current.has(id) &&
        now >= (retryAt.current.get(id) ?? 0)
      ) {
        ack.push(id);
      }
    }
    for (const id of entered.current.keys()) {
      if (!visible.has(id)) {
        entered.current.delete(id);
      }
    }
    if (nextDeadline !== Infinity) {
      timer.current = setTimeout(() => observeRef.current(), Math.max(1, nextDeadline - now));
    }
    if (fresh.length) {
      setUnreadCount(unread.current.size);
      input.onMessagesRead?.(fresh);
    }
    if (!ack.length || !input.session?.options.adapter.capabilities.readReceipts) {
      return;
    }
    const generation = epoch.current;
    const scope = input.scope;
    for (const id of ack) {
      inFlight.current.add(id);
    }
    input.session
      .markReadMessages(ack)
      .then((ok) => {
        if (!alive.current || epoch.current !== generation || latest.current.scope !== scope) {
          return;
        }
        for (const id of ack) {
          inFlight.current.delete(id);
          if (ok && seen.current.has(id)) {
            acknowledged.current.add(id);
          } else {
            retryAt.current.set(id, Date.now() + ACK_RETRY_COOLDOWN_MS);
          }
        }
      })
      .catch(() => {
        if (!alive.current || epoch.current !== generation || latest.current.scope !== scope) {
          return;
        }
        for (const id of ack) {
          inFlight.current.delete(id);
          retryAt.current.set(id, Date.now() + ACK_RETRY_COOLDOWN_MS);
        }
      });
  };
  const observeRef = useRef(observe);
  observeRef.current = observe;

  useLayoutEffect(() => {
    epoch.current += 1;
    candidates.current = [];
    seen.current.clear();
    unread.current.clear();
    acknowledged.current.clear();
    inFlight.current.clear();
    entered.current.clear();
    retryAt.current.clear();
    previous.current = [];
    previousCursor.current = undefined;
    setUnreadCount(0);
    clearTimeout(timer.current);
  }, [params.scope]);

  useLayoutEffect(() => {
    const input = latest.current;
    const ids = new Set(
      input.keys.flatMap((key) => {
        const id = incoming(key);

        return id ? [id] : [];
      }),
    );
    // All viewport caches are bounded by the retained window, not chat lifetime.
    for (const cache of [seen.current, unread.current, acknowledged.current, inFlight.current]) {
      for (const id of cache) {
        if (!ids.has(id)) {
          cache.delete(id);
        }
      }
    }
    for (const id of retryAt.current.keys()) {
      if (!ids.has(id)) {
        retryAt.current.delete(id);
      }
    }
    let firstUnread = -1;
    if (input.firstUnreadId !== undefined) {
      firstUnread = input.keys.findIndex(
        (key) => key === input.firstUnreadId || input.resolve(key)?.id === input.firstUnreadId,
      );
      unread.current.clear();
    } else if (previousCursor.current !== undefined) {
      unread.current.clear();
    }
    previousCursor.current = input.firstUnreadId;
    const oldKeys = new Set(previous.current);
    const liveChange =
      input.change.kind === TimelineChangeKind.Append ||
      input.change.kind === TimelineChangeKind.Newer ||
      input.change.kind === TimelineChangeKind.OwnSend;
    const controlledAppend =
      input.change.sequence === 0 &&
      previous.current.length > 0 &&
      input.keys.indexOf(previous.current[previous.current.length - 1]!) >= 0;
    const oldTailIndex = input.keys.indexOf(previous.current[previous.current.length - 1]!);
    input.keys.forEach((key, index) => {
      const id = incoming(key);
      if (!id || seen.current.has(id)) {
        return;
      }
      const cursorUnread = firstUnread >= 0 && index >= firstUnread;
      const newIncoming =
        !oldKeys.has(key) && (liveChange || (controlledAppend && index > oldTailIndex));
      if (cursorUnread || (input.firstUnreadId === undefined && newIncoming)) {
        unread.current.add(id);
      }
    });
    previous.current = input.keys;
    setUnreadCount(unread.current.size);
    observeRef.current();
  }, [params.keys, params.firstUnreadId, params.change.sequence, params.scope]);

  useEffect(() => {
    // A changed clipping region starts a fresh dwell interval.
    entered.current.clear();
    observeRef.current();
  }, [params.isActive, params.topInset, params.bottomInset]);

  useEffect(() => {
    alive.current = true;
    const listener = AppState.addEventListener('change', (state) => {
      active.current = state === 'active';
      entered.current.clear();
      observeRef.current();
    });

    return () => {
      alive.current = false;
      epoch.current += 1;
      clearTimeout(timer.current);
      listener.remove();
    };
  }, []);

  return {
    unreadCount,
    onGeometryChanged: observe,
    onViewableKeys: (keys: readonly string[]) => {
      candidates.current = keys;
      observe();
    },
  };
};
