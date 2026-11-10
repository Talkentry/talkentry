/**
 * DOM Talkentry shell: session Provider, hooks, and a prototype Chat screen.
 * This package must not import React Native, react-native-web, or FlashList.
 */

export {
  TalkentryProvider,
  type TalkentryProviderProps,
  type TalkentrySessionValue,
  type TalkentryTimelineValue,
  useOptionalTalkentrySession,
  useOptionalTalkentryTimeline,
  useTalkentrySession,
  useTalkentryTimeline,
} from './react/context';
export {
  useMessage,
  useMessages,
  type UseMessagesResult,
  useSendMessage,
  type UseSendMessageResult,
  useTyping,
  useViewport,
  type UseViewportParams,
  type UseViewportResult,
} from './react/hooks';
export {
  defaultTheme,
  mergeTheme,
  type TalkentryTheme,
  type TalkentryThemeColors,
  type TalkentryThemeOverride,
  TalkentryThemeProvider,
  type TalkentryThemeProviderProps,
  type TalkentryThemeRadii,
  type TalkentryThemeSpacing,
  type TalkentryThemeTypography,
  useTalkentryTheme,
} from './theme';
export { Chat, type ChatProps } from './ui/chat-screen/Chat';
export {
  Composer,
  type ComposerDraft,
  ComposerDraftType,
  type ComposerProps,
  type ComposerSendPayload,
} from './ui/composer/Composer';
export {
  MessageActionId,
  type MessageActionItem,
} from './ui/message-bubble/actions/messageActions';
export { MessageBubble, type MessageBubbleProps } from './ui/message-bubble/MessageBubble';
export { MessageList, type MessageListProps } from './ui/message-list/MessageList';
export type {
  ChatSlots,
  RenderChatParts,
  RenderComposerParams,
  RenderDayParams,
  RenderEmptyParams,
  RenderGapParams,
  RenderListHeaderParams,
  RenderMessageBodyParams,
  RenderMessageMenuParams,
  RenderMessageParams,
  RenderTypingParams,
} from './ui/shared/slots';
export * from '@talkentry/core';
