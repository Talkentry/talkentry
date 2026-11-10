import type { Message } from '@talkentry/core';

import { type ChatLocale, chatStrings } from '../../shared/strings';
import { type ComposerDraft, ComposerDraftType, type DraftBanner } from '../types';

/**
 * Copy for the reply/edit strip above the input.
 * Pure: Connected supplies the target message from the store.
 */
export const draftBanner = (
  draft: ComposerDraft,
  target: Message | undefined,
  locale: ChatLocale,
): DraftBanner => {
  const strings = chatStrings[locale];

  if (draft.type === ComposerDraftType.Edit) {
    return { title: strings.editing, preview: target?.text ?? draft.text };
  }

  return {
    title: `${strings.replyingTo} ${target?.senderId ?? ''}`.trim(),
    preview: target?.text,
  };
};
