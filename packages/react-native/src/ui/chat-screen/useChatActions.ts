import type { Message } from '@talkentry/core';
import { useCallback } from 'react';

import { useTalkentrySession } from '../../react/context';
import { useSendMessage } from '../../react/hooks';
import type { MessageAnchorMeasure } from '../shared/slots';
import type { ChatProps } from './types';
import { useMessageDraft } from './useMessageDraft';
import { useMessageMenu } from './useMessageMenu';
import { useMessageSelection } from './useMessageSelection';

type Options = Pick<
  ChatProps,
  'onCopy' | 'onForward' | 'onMessageLongPress' | 'onMessagePress' | 'renderMessageActions'
> & { locale: NonNullable<ChatProps['locale']> };

/** Composes draft, selection, and menu around one set of message commands. */
export const useChatActions = ({
  onCopy,
  onForward,
  onMessageLongPress,
  onMessagePress,
  renderMessageActions,
  locale,
}: Options) => {
  const session = useTalkentrySession();
  const { deleteMessage, toggleReaction } = useSendMessage();
  const { clearMessageDraft, ...draft } = useMessageDraft();

  const onDelete = useCallback(
    (message: Message) => {
      clearMessageDraft(message.id);
      deleteMessage(message.id).catch(() => undefined);
    },
    [clearMessageDraft, deleteMessage],
  );
  const onReact = useCallback(
    (message: Message, emoji: string) => {
      toggleReaction(message.id, emoji).catch(() => undefined);
    },
    [toggleReaction],
  );

  const handlers = {
    onReply: draft.onReply,
    onEdit: draft.onEdit,
    onDelete,
    onCopy,
    onForward: (message: Message) => onForward?.(message),
  };
  const { openSelection, ...selection } = useMessageSelection(handlers);
  const { openMenu, ...menu } = useMessageMenu(session.options.currentUserId, locale, handlers);

  const handleLongPress = onMessageLongPress ?? (renderMessageActions ? undefined : openSelection);
  const handlePress = useCallback(
    (message: Message, measure: MessageAnchorMeasure) => {
      if (onMessagePress) {
        onMessagePress(message);
        return;
      }
      openMenu(message, measure);
    },
    [onMessagePress, openMenu],
  );

  return { ...draft, ...selection, ...menu, onDelete, onReact, handleLongPress, handlePress };
};
