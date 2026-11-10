import type { Message, MessageId } from '@talkentry/core';
import { useSyncExternalStore } from 'react';

import { useTalkentrySession } from '../context/TalkentryContext';

/**
 * Subscribe to a single message. Status / text updates re-render only this
 * subscriber — not the whole timeline list.
 */
export const useMessage = (messageId: MessageId): Message | undefined => {
  const { messageStore } = useTalkentrySession();

  return useSyncExternalStore(
    (onStoreChange) => messageStore.subscribe(messageId, onStoreChange),
    () => messageStore.get(messageId),
    () => messageStore.get(messageId),
  );
};
