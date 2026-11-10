import type { ChatSession, TimelineWindow } from '@talkentry/core';
import { createContext, useContext } from 'react';

export type TalkentrySessionValue = ChatSession;
export type TalkentryTimelineValue = TimelineWindow;

export const TalkentrySessionContext = createContext<ChatSession | null>(null);
export const TalkentryTimelineContext = createContext<TimelineWindow | null>(null);

export const useTalkentrySession = (): ChatSession => {
  const value = useContext(TalkentrySessionContext);
  if (!value) {
    throw new Error('TalkentryProvider is required');
  }

  return value;
};

export const useTalkentryTimeline = (): TimelineWindow => {
  const value = useContext(TalkentryTimelineContext);
  if (!value) {
    throw new Error('TalkentryProvider is required');
  }

  return value;
};

export const useOptionalTalkentrySession = () => useContext(TalkentrySessionContext);
export const useOptionalTalkentryTimeline = () => useContext(TalkentryTimelineContext);
