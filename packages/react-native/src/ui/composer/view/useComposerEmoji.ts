import { ComposerErrorKind, type ComposerViewProps } from '../types';
import type { ComposerAttachments } from './useComposerAttachments';
import type { ComposerOperation } from './useComposerOperation';
import type { ComposerText } from './useComposerText';

/** Routes host emoji results to text or pending media, without a second draft. */
export const useComposerEmoji = (
  onPickEmoji: ComposerViewProps['onPickEmoji'],
  text: ComposerText,
  attachments: ComposerAttachments,
  operation: ComposerOperation,
) => {
  const handlePickEmoji = async () => {
    if (!onPickEmoji) {
      return;
    }
    await operation.run(ComposerErrorKind.Emoji, async (isCurrent) => {
      const picked = await onPickEmoji();
      if (!isCurrent() || picked == null || picked === '') {
        return;
      }
      if (typeof picked === 'string') {
        text.appendEmoji(picked);
        return;
      }
      attachments.addAttachments(picked);
    });
  };

  return { handlePickEmoji };
};
