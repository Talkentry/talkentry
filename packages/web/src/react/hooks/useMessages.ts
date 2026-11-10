import { buildTimelineRows } from '@talkentry/core';
import { useMemo } from 'react';

import { useTalkentrySession, useTalkentryTimeline } from '../context/TalkentryContext';

/** Structure is subscribed separately; row fields are read only via useMessage(key). */
export const useMessages = () => {
  const session = useTalkentrySession();
  const state = useTalkentryTimeline();

  // Rows rebuild only when structure/gaps change — not on point receipt edits.
  const rows = useMemo(
    () =>
      buildTimelineRows(state.messageKeys, state.gaps, (key) => {
        const message = session.messageStore.get(key);

        return message?.id;
      }),
    [session, state.messageKeys, state.gaps],
  );

  return {
    messageKeys: state.messageKeys,
    rows,
    gaps: state.gaps,
    status: state.status,
    error: state.error,
    hasMoreBefore: state.hasMoreBefore,
    hasMoreAfter: state.hasMoreAfter,
    oldestId: state.oldestId,
    newestId: state.newestId,
    loadOlder: session.loadOlder,
    loadNewer: session.loadNewer,
    loadAround: session.loadAround,
    refresh: session.loadLatest,
    markDelivered: session.markDelivered,
    markRead: session.markRead,
    markReadMessages: session.markReadMessages,
    cancelNavigation: session.cancelNavigation,
  };
};

export type UseMessagesResult = ReturnType<typeof useMessages>;
