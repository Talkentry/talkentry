import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { createScrollToLatestStore, type ScrollToLatestStore } from './scrollToLatestStore';

const ScrollToLatestContext = createContext<ScrollToLatestStore | null>(null);

export type ScrollToLatestProviderProps = {
  readonly children: ReactNode;
};

/**
 * Holds the scroll-to-latest snapshot for one mounted list.
 * `TalkentryProvider` already includes this. Controlled screens wrap the list
 * and the host button themselves. A second list overwrites the same snapshot.
 */
export const ScrollToLatestProvider = ({ children }: ScrollToLatestProviderProps) => {
  const store = useMemo(() => createScrollToLatestStore(), []);

  return <ScrollToLatestContext.Provider value={store}>{children}</ScrollToLatestContext.Provider>;
};

export const useScrollToLatestStore = (): ScrollToLatestStore | null =>
  useContext(ScrollToLatestContext);
