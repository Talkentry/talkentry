/**
 * Built-in Chat UI — feature folders, not a flat dump.
 *
 * - `chat-screen/` — screen shell (list + composer)
 * - `composer/` — input / drafts (`view/` UI, `connected/` session)
 * - `message-list/` — FlashList window
 * - `message-bubble/` — single row (`view/` / `connected/` / `actions/`)
 * - `message-menu/` — tap menu: quick reactions, full emoji card, actions
 * - `shared/` — slots, locale strings, emoji panel
 *
 * Each feature owns its `types.ts` next to the components (no `ui/types/` dump).
 */

export { Chat, type ChatProps } from './chat-screen/Chat';
export {
  Composer,
  type ComposerDraft,
  ComposerDraftType,
  type ComposerEmojiPick,
  type ComposerProps,
  type ComposerSendPayload,
  type EmojiDock,
  EmojiDockProvider,
  EmojiDockSheet,
  type EmojiDockSheetProps,
  EmojiPanel,
  type EmojiPanelController,
  type EmojiPanelProps,
  useEmojiDock,
  useEmojiPanel,
} from './composer';
export {
  buildMessageActions,
  type MessageActionHandlers,
  MessageActionId,
  type MessageActionItem,
  MessageActionSheet,
  type MessageActionSheetProps,
  MessageBubble,
  type MessageBubbleProps,
} from './message-bubble';
export { MessageList, type MessageListProps } from './message-list/MessageList';
export type { MenuRect, MenuSize } from './message-menu/menuLayout';
export { MessageMenu, type MessageMenuProps } from './message-menu/MessageMenu';
export type {
  ChatSlots,
  MessageAnchorMeasure,
  RenderComposerParams,
  RenderDayParams,
  RenderGapParams,
  RenderListHeaderParams,
  RenderMessageActionsParams,
  RenderMessageBodyParams,
  RenderMessageMenuParams,
  RenderMessageParams,
  RenderSwipeHintParams,
  RenderTypingParams,
  RenderUnreadParams,
} from './shared/slots';
