/**
 * Platform-agnostic Talkentry core: models, session, store, timeline, viewport.
 * UI shells import this package; they do not copy these layers.
 */

export type { ChatAdapter, ChatAdapterCapabilities } from './core/adapter';
export type {
  DeleteMessageCommand,
  DeleteMessageResult,
  EditMessageCommand,
  ReconcileMessagesCommand,
  ReconcileMessagesResult,
  SendMessageCommand,
  SetTypingCommand,
  ToggleReactionCommand,
  UpdateReceiptsCommand,
  UploadAttachmentCommand,
} from './core/commands';
export type { ChatEvent, ChatEventListener, Unsubscribe } from './core/events';
export { ChatEventType } from './core/events';
export {
  type Attachment,
  AttachmentType,
  type ChatId,
  type Message,
  type MessageId,
  MessageStatus,
  type Reaction,
} from './core/message';
export type {
  ChatEventsPage,
  HistoryGap,
  LoadAfterParams,
  LoadAroundParams,
  LoadBeforeParams,
  LoadEventsParams,
  LoadLatestParams,
  MessagePage,
} from './core/pagination';
export type { User, UserId } from './core/user';
export {
  assertEventsPage,
  assertMessage,
  assertMessages,
  assertPage,
  isChatEvent,
  isMessage,
  isMessageStatus,
  MAX_PAGE_SIZE,
} from './core/validation';
export type {
  ChatSessionOptions,
  LocalSendAccepted,
  SendMessageInput,
  SubscribeLocalSendAccepted,
} from './session';
export { ChatSession } from './session';
export { MessageStore } from './subscriptions';
export type {
  TimelineAction,
  TimelineChange,
  TimelineGap,
  TimelineItem,
  TimelineListRow,
  TimelineReducerOptions,
  TimelineWindow,
} from './timeline';
export {
  buildTimelineRows,
  continuityGap,
  countMessagesFromId,
  createTimelineReducer,
  dayKeyFromCreatedAt,
  dayRowKey,
  gapKey,
  gapsFromSequences,
  initialTimelineWindow,
  insertDaySeparatorRows,
  insertUnreadSeparatorRow,
  MAX_TIMELINE_GAPS,
  mergeGaps,
  retainGaps,
  TimelineActionType,
  TimelineChangeKind,
  TimelineLoadMode,
  timelineReducer,
  TimelineRowType,
  TimelineStatus,
  toTimelineGap,
  UNREAD_ROW_KEY,
} from './timeline';
export type {
  ActiveScrollIntent,
  MaskedJumpOptions,
  NavigationState,
  ScrollIntent,
  ViewportAction,
  ViewportState,
} from './viewport';
export {
  DEFAULT_LATEST_SHOW_THRESHOLD_PX,
  DEFAULT_NEAR_BOTTOM_THRESHOLD_PX,
  END_POSITION_TOLERANCE_PX,
  initialViewportState,
  isNearBottom,
  NavigationFailure,
  NavigationStatus,
  ScrollIntentType,
  shouldMaskJump,
  ViewportActionType,
  ViewportMode,
  viewportReducer,
} from './viewport';
