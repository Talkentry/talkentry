import { useSyncExternalStore } from 'react';

import { useTalkentrySession } from '../context/TalkentryContext';

/** Peer typing user ids from the active ChatSession (excludes local actor). */
export const useTyping = (): readonly string[] => {
  const session = useTalkentrySession();

  return useSyncExternalStore(
    session.subscribe,
    session.getTypingUserIds,
    session.getTypingUserIds,
  );
};
