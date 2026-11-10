/**
 * Message bubble feature:
 * - `MessageBubble.tsx` / `types.ts` — public entry + contract
 * - `view/` — dumb row UI (attachments, reply quote, time, receipts)
 * - `connected/` — store subscription by messageId
 * - `actions/` — long-press sheet + action list builder
 * - `grouping.ts` — consecutive-sender grouping for the list
 */

export { MessageActionSheet, type MessageActionSheetProps } from './actions/ActionSheet';
export {
  buildMessageActions,
  type MessageActionHandlers,
  MessageActionId,
  type MessageActionItem,
} from './actions/messageActions';
export { isGroupedWithPrevious } from './grouping';
export { MessageBubble, type MessageBubbleProps } from './MessageBubble';
export { formatMessageTime } from './view/messageTime';
