import { ChatSession, type ChatSessionOptions } from '@talkentry/core';
import { Fragment, type ReactNode, useLayoutEffect, useMemo } from 'react';

import { ScrollToLatestProvider } from './ScrollToLatestProvider';
import { SessionTimeline } from './SessionTimeline';
import { TalkentrySessionContext } from './TalkentryContext';

export type TalkentryProviderProps = ChatSessionOptions & {
  readonly children: ReactNode;
  /** Change when the tenant/auth principal changes while adapter and currentUserId stay the same. */
  readonly scopeKey?: string;
};

export const TalkentryProvider = ({
  children,
  adapter,
  chatId,
  currentUserId,
  scopeKey = '',
  pageSize = 30,
  maxMessages = 500,
  maxPendingSends = 16,
  maxTombstones = 1000,
  requestTimeoutMs = 30000,
}: TalkentryProviderProps) => {
  const session = useMemo(
    () =>
      new ChatSession({
        adapter,
        chatId,
        currentUserId,
        scopeKey,
        pageSize,
        maxMessages,
        maxPendingSends,
        maxTombstones,
        requestTimeoutMs,
      }),
    [
      adapter,
      chatId,
      currentUserId,
      scopeKey,
      pageSize,
      maxMessages,
      maxPendingSends,
      maxTombstones,
      requestTimeoutMs,
    ],
  );

  useLayoutEffect(() => {
    session.start();

    return session.stop;
  }, [session]);

  return (
    <TalkentrySessionContext.Provider value={session}>
      <SessionTimeline session={session}>
        <ScrollToLatestProvider>
          <Fragment key={session.id}>{children}</Fragment>
        </ScrollToLatestProvider>
      </SessionTimeline>
    </TalkentrySessionContext.Provider>
  );
};
