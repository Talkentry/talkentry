import type { SubscribeLocalSendAccepted } from '@talkentry/core';
import { useLayoutEffect, useRef } from 'react';

/** Event binding and replay protection only; navigation policy stays in the coordinator. */
export const useLocalSendNavigation = (
  scopeKey: string | undefined,
  threadId: string | null | undefined,
  subscribe: SubscribeLocalSendAccepted | undefined,
  onAccepted: (requiresLatest: boolean) => Promise<void>,
) => {
  const accepted = useRef({ scopeKey, sequence: 0 });
  const latest = useRef({ scopeKey, threadId, onAccepted });
  latest.current = { scopeKey, threadId, onAccepted };

  useLayoutEffect(() => {
    if (accepted.current.scopeKey !== scopeKey) {
      accepted.current = { scopeKey, sequence: 0 };
    }
    let subscribed = true;
    const unsubscribe = subscribe?.((event) => {
      const input = latest.current;
      if (
        !subscribed ||
        input.scopeKey !== scopeKey ||
        !Number.isSafeInteger(event.sequence) ||
        event.sequence <= accepted.current.sequence ||
        (input.threadId !== undefined && input.threadId !== event.threadId)
      ) {
        return;
      }
      accepted.current.sequence = event.sequence;
      input.onAccepted(event.requiresLatest === true).catch(() => undefined);
    });

    return () => {
      subscribed = false;
      unsubscribe?.();
    };
  }, [subscribe, scopeKey]);
};
