import { ComposerErrorKind, type ComposerViewProps } from '../types';
import type { ComposerAttachments } from './useComposerAttachments';
import type { ComposerOperation } from './useComposerOperation';
import type { ComposerText } from './useComposerText';

/** Sends a snapshot; completion never erases text typed during the request. */
export const useComposerSend = (
  onSend: ComposerViewProps['onSend'],
  text: ComposerText,
  attachments: ComposerAttachments,
  operation: ComposerOperation,
) => {
  const handleSend = async () => {
    const submitted = text.text;
    const value = submitted.trim();
    const pending = attachments.attachments;
    if (!value && !pending.length) {
      return;
    }
    await operation.run(ComposerErrorKind.Send, async (isCurrent) => {
      await onSend({
        text: value,
        ...(pending.length ? { attachments: pending } : {}),
      });
      if (isCurrent()) {
        text.clearSubmitted(submitted);
        attachments.clearSubmitted(pending);
      }
    });
  };

  return { handleSend };
};
