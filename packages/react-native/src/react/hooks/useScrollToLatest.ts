import { useSyncExternalStore } from 'react';

import { useScrollToLatestStore } from '../context/ScrollToLatestProvider';
import { hiddenScrollToLatest, type ScrollToLatestSnapshot } from '../context/scrollToLatestStore';

const subscribeNop = (): (() => void) => () => undefined;

const getHidden = (): ScrollToLatestSnapshot => hiddenScrollToLatest;

/**
 * Visibility, unread total, and jump action published by the mounted `MessageList`.
 * Without a `ScrollToLatestProvider` (or `TalkentryProvider`) the snapshot stays hidden.
 */
export const useScrollToLatest = (): ScrollToLatestSnapshot => {
  const store = useScrollToLatestStore();

  return useSyncExternalStore(
    store ? store.subscribe : subscribeNop,
    store ? store.getSnapshot : getHidden,
    store ? store.getSnapshot : getHidden,
  );
};
