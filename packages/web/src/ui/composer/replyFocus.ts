import { type ComposerDraft, ComposerDraftType } from './types';

/** First reply focuses the field; swapping the quote does not. */
export const shouldFocusComposerOnReply = (draft: ComposerDraft | null | undefined): boolean =>
  draft?.type !== ComposerDraftType.Reply;
