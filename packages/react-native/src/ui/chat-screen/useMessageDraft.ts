import type { Message } from '@talkentry/core';
import { useCallback, useRef, useState } from 'react';

import { shouldFocusComposerOnReply } from '../composer/replyFocus';
import { type ComposerDraft, ComposerDraftType } from '../composer/types';

/** Owns the reply/edit draft and the explicit composer focus request. */
export const useMessageDraft = () => {
  const [draft, setDraft] = useState<ComposerDraft | null>(null);
  const [composerFocusKey, setComposerFocusKey] = useState(0);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const onReply = useCallback((message: Message) => {
    if (shouldFocusComposerOnReply(draftRef.current)) {
      setComposerFocusKey((key) => key + 1);
    }
    setDraft({ type: ComposerDraftType.Reply, messageId: message.id });
  }, []);

  const onEdit = useCallback((message: Message) => {
    setDraft({ type: ComposerDraftType.Edit, messageId: message.id, text: message.text ?? '' });
  }, []);

  const clearDraft = useCallback(() => setDraft(null), []);
  const clearMessageDraft = useCallback((messageId: string) => {
    setDraft((current) => (current?.messageId === messageId ? null : current));
  }, []);

  return { draft, composerFocusKey, onReply, onEdit, clearDraft, clearMessageDraft };
};
