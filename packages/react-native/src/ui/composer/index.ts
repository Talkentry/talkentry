/**
 * Composer feature:
 * - `Composer.tsx` / `types.ts` — public entry + contract
 * - `view/` — dumb UI (input, attachments, banner chrome)
 * - `connected/` — Talkentry session wiring (send/edit/typing/draft copy)
 */

export { EmojiPanel, type EmojiPanelProps } from '../shared/emoji/EmojiPanel';
export {
  Composer,
  type ComposerDraft,
  ComposerDraftType,
  type ComposerEmojiPick,
  type ComposerProps,
  type ComposerSendPayload,
} from './Composer';
export type { EmojiDock, EmojiPanelController } from './emojiDock';
export { EmojiDockProvider, useEmojiDock, useEmojiPanel } from './emojiDock';
export { EmojiDockSheet, type EmojiDockSheetProps } from './view/EmojiDockSheet';
