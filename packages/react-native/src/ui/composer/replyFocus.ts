import { type ComposerDraft, ComposerDraftType } from './types';

/**
 * Telegram: the first reply focuses the composer so the keyboard opens.
 * Swapping the quoted message keeps the current keyboard / emoji state.
 */
export const shouldFocusComposerOnReply = (draft: ComposerDraft | null | undefined): boolean =>
  draft?.type !== ComposerDraftType.Reply;
