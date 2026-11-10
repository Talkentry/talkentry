import type { Attachment } from '@talkentry/core';
import { useEffect, useRef, useState } from 'react';

import { ComposerErrorKind, type ComposerViewProps } from '../types';
import { appendPendingAttachments, MAX_PENDING_ATTACHMENTS } from './pendingAttachments';
import type { ComposerOperation } from './useComposerOperation';

/** Pending media and the host attachment picker share the same budget. */
export const useComposerAttachments = (
  allowAttachments: boolean,
  onAttach: ComposerViewProps['onAttach'],
  operation: ComposerOperation,
) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const allowed = useRef(allowAttachments);
  allowed.current = allowAttachments;

  useEffect(() => {
    if (!allowAttachments) {
      setAttachments([]);
    }
  }, [allowAttachments]);

  const addAttachments = (picked: Attachment | readonly Attachment[]) => {
    if (!allowed.current) {
      return;
    }
    const list = 'id' in picked ? [picked] : picked;
    setAttachments((current) => appendPendingAttachments(current, list));
  };
  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((entry) => entry.id !== id));
  };
  const clearSubmitted = (submitted: readonly Attachment[]) => {
    const ids = new Set(submitted.map((entry) => entry.id));
    setAttachments((current) => current.filter((entry) => !ids.has(entry.id)));
  };
  const handleAttach = async () => {
    if (!onAttach || !allowAttachments || attachments.length >= MAX_PENDING_ATTACHMENTS) {
      return;
    }
    await operation.run(ComposerErrorKind.Attach, async (isCurrent) => {
      const picked = await onAttach();
      if (isCurrent() && picked != null) {
        addAttachments(picked);
      }
    });
  };

  return { attachments, addAttachments, removeAttachment, clearSubmitted, handleAttach };
};

export type ComposerAttachments = ReturnType<typeof useComposerAttachments>;
