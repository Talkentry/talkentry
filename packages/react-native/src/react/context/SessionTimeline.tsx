import type { ChatSession } from '@talkentry/core';
import { type ReactNode, useSyncExternalStore } from 'react';

import { TalkentryTimelineContext } from './TalkentryContext';

export const SessionTimeline = ({
  session,
  children,
}: {
  readonly session: ChatSession;
  readonly children: ReactNode;
}) => {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

  return (
    <TalkentryTimelineContext.Provider value={state}>{children}</TalkentryTimelineContext.Provider>
  );
};
