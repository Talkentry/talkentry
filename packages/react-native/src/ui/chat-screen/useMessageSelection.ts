import type { Message } from '@talkentry/core';
import { useCallback, useState } from 'react';

import type { MessageActionHandlers } from '../message-bubble/actions/messageActions';

/** Selection state and toolbar commands; message mutations belong to the caller. */
export const useMessageSelection = (handlers: MessageActionHandlers) => {
  const [selected, setSelected] = useState<Message | null>(null);
  const closeSelection = useCallback(() => setSelected(null), []);
  const openSelection = useCallback((message: Message) => {
    if (!message.system && message.id !== message.localId) {
      setSelected(message);
    }
  }, []);

  const actOnSelected = (handler: ((message: Message) => void) | undefined) => {
    if (!selected) {
      return;
    }
    handler?.(selected);
    closeSelection();
  };

  const replyToSelected = () => actOnSelected(handlers.onReply);
  const editSelected = () => {
    if (selected?.text?.trim()) {
      actOnSelected(handlers.onEdit);
    }
  };
  const forwardSelected = () => actOnSelected(handlers.onForward);
  const copySelected = () => actOnSelected(handlers.onCopy);
  const deleteSelected = () => actOnSelected(handlers.onDelete);

  return {
    selected,
    openSelection,
    closeSelection,
    replyToSelected,
    editSelected,
    forwardSelected,
    copySelected,
    deleteSelected,
  };
};
