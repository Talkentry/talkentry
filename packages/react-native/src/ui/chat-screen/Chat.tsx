import type { Message } from '@talkentry/core';
import { type ReactElement, type ReactNode, useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTalkentrySession } from '../../react/context';
import { useTyping } from '../../react/hooks';
import { getComponentTokens, type TalkentryTheme, useTalkentryTheme } from '../../theme';
import { Composer } from '../composer/Composer';
import { EmojiDockProvider } from '../composer/emojiDock';
import { MessageBubble } from '../message-bubble';
import { MessageList } from '../message-list/MessageList';
import { MessageMenu } from '../message-menu/MessageMenu';
import { QUICK_REACTIONS } from '../message-menu/quickReactions';
import type { MessageAnchorMeasure, RenderMessageParams } from '../shared/slots';
import { chatStrings } from '../shared/strings';
import { listBottomInsetWhileSelecting, parkedComposerStyle } from './composerPark';
import { MessageSelectionBar } from './MessageSelectionBar';
import { MessageSelectionTools } from './MessageSelectionTools';
import type { ChatProps } from './types';
import { typingLabel } from './typingLabel';
import { useChatActions } from './useChatActions';
import { useKeyboardDock } from './useKeyboardDock';

export type { ChatProps } from './types';

/**
 * Minimal chat screen layout: message list + composer.
 *
 * The list fills the screen. The composer floats over its bottom edge so the
 * viewport shows through transparent composer padding. The list and composer share one lift:
 * the software keyboard, or the emoji sheet while it holds that slot.
 * Host may override appearance via TalkentryThemeProvider and/or render slots.
 * Host must wrap the tree in `KeyboardProvider`.
 */
export const Chat = ({
  users,
  firstUnreadId,
  unreadCount,
  showScrollToLatest,
  showGapMarkers,
  messageListProps,
  composerProps,
  keyboardVerticalOffset = 0,
  showEmoji = true,
  locale = 'en',
  onCopy,
  onForward,
  onMessageLongPress,
  onMessagePress,
  quickReactions = QUICK_REACTIONS,
  renderMessage,
  renderMessageBody,
  renderSwipeHint,
  renderGap,
  renderDay,
  renderUnread,
  renderMessageActions,
  renderMessageMenu,
  renderTyping,
  renderComposer,
  renderEmpty,
  renderListHeader,
}: ChatProps): ReactElement => {
  const theme = useTalkentryTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const session = useTalkentrySession();
  const typingUserIds = useTyping();
  const {
    emojiDockApi,
    dismissInputChrome,
    readingActive,
    readingTopInset,
    composerLiftStyle,
    listLiftStyle,
  } = useKeyboardDock(keyboardVerticalOffset);
  const {
    draft,
    composerFocusKey,
    selected,
    menu,
    hostSize,
    onReply,
    onEdit,
    onDelete,
    onReact,
    clearDraft,
    closeSelection,
    handleLongPress,
    handlePress,
    closeMenu,
    replyToSelected,
    editSelected,
    forwardSelected,
    copySelected,
    deleteSelected,
    menuActions,
    runMenuAction,
  } = useChatActions({
    onCopy,
    onForward,
    onMessageLongPress,
    onMessagePress,
    renderMessageActions,
    locale,
  });
  const [composerHeight, setComposerHeight] = useState(0);
  const [selectionBarHeight, setSelectionBarHeight] = useState(0);
  const onComposerLayout = (event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    setComposerHeight((current) => (current === next ? current : next));
  };

  const onSelectionBarLayout = (event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    setSelectionBarHeight((current) => (current === next ? current : next));
  };
  const renderListMessage = useCallback(
    (params: RenderMessageParams) => {
      const onLongPress = (message: Message) => {
        params.consumeListTap?.();
        handleLongPress?.(message);
      };
      const onPress = (message: Message, measure: MessageAnchorMeasure) => {
        params.consumeListTap?.();
        handlePress(message, measure);
      };
      const row = { ...params, onReply, onLongPress, onPress };

      if (renderMessage) {
        return renderMessage(row);
      }

      return (
        <MessageBubble
          messageId={params.messageId}
          onQuotePress={params.onQuotePress}
          onNavigationFocus={params.onNavigationFocus}
          message={params.message}
          currentUserId={params.currentUserId}
          locale={params.locale}
          users={users}
          showSenderHeader={params.showSenderHeader}
          groupedWithPrevious={params.groupedWithPrevious}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onCopy={onCopy}
          onReact={onReact}
          onLongPress={handleLongPress ? onLongPress : undefined}
          onPress={onPress}
          consumeListTap={params.consumeListTap}
          renderMessageActions={handleLongPress ? undefined : renderMessageActions}
          renderMessageBody={renderMessageBody}
          renderSwipeHint={renderSwipeHint}
        />
      );
    },
    [
      users,
      onReply,
      onEdit,
      onDelete,
      onCopy,
      onReact,
      renderMessage,
      handleLongPress,
      handlePress,
      renderMessageActions,
      renderMessageBody,
      renderSwipeHint,
    ],
  );

  const typingText = useMemo(
    () => typingLabel(typingUserIds, users, locale),
    [typingUserIds, users, locale],
  );
  const typingNode: ReactNode =
    typingUserIds.length === 0
      ? null
      : (renderTyping?.({
          userIds: typingUserIds,
          label: typingText,
          locale,
        }) ?? (
          <View
            style={[styles.typingBar, { backgroundColor: theme.colors.surface }]}
            accessibilityRole="text"
            accessibilityLabel={chatStrings[locale].typingLabel}
          >
            <Text style={[styles.typingText, { color: theme.colors.textMuted }]}>{typingText}</Text>
          </View>
        ));

  return (
    <View style={styles.root}>
      <Animated.View style={listLiftStyle}>
        <MessageList
          {...messageListProps}
          key={session.id}
          isActive={messageListProps?.isActive !== false && !selected && !menu}
          readEnabled={messageListProps?.readEnabled !== false && readingActive}
          viewportTopInset={readingTopInset}
          users={users}
          firstUnreadId={firstUnreadId}
          unreadCount={unreadCount}
          showScrollToLatest={showScrollToLatest}
          showGapMarkers={showGapMarkers}
          contentBottomInset={listBottomInsetWhileSelecting(
            !!selected,
            composerHeight,
            selectionBarHeight,
          )}
          locale={locale}
          renderMessage={renderListMessage}
          renderGap={renderGap}
          renderDay={renderDay}
          renderUnread={renderUnread}
          renderEmpty={renderEmpty}
          renderListHeader={renderListHeader}
          onListTap={dismissInputChrome}
        />
      </Animated.View>
      {selected ? (
        <Pressable
          style={styles.selectionDismiss}
          onPress={closeSelection}
          accessibilityRole="button"
          accessibilityLabel={chatStrings[locale].cancel}
        />
      ) : null}
      {selected ? (
        <View style={styles.selectionTools}>
          <MessageSelectionTools
            locale={locale}
            showCopy={!!onCopy && !!selected.text?.trim()}
            showEdit={
              selected.senderId === session.options.currentUserId && !!selected.text?.trim()
            }
            showDelete={selected.senderId === session.options.currentUserId}
            onCopy={copySelected}
            onEdit={editSelected}
            onForward={forwardSelected}
            onDelete={deleteSelected}
          />
        </View>
      ) : null}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.composerOverlay, composerLiftStyle]}
        onLayout={onComposerLayout}
      >
        <EmojiDockProvider value={emojiDockApi}>
          <View
            pointerEvents="box-none"
            collapsable={false}
            style={selected ? parkedComposerStyle : undefined}
          >
            {typingNode}
            {renderComposer ? (
              renderComposer({
                draft,
                onClearDraft: clearDraft,
                locale,
                showEmoji,
                composerFocusKey,
              })
            ) : (
              <Composer
                locale={locale}
                {...composerProps}
                showEmoji={showEmoji}
                draft={draft}
                onClearDraft={clearDraft}
                composerFocusKey={composerFocusKey}
              />
            )}
          </View>
        </EmojiDockProvider>
      </Animated.View>
      {selected ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.selectionCover, composerLiftStyle]}
          onLayout={onSelectionBarLayout}
        >
          <MessageSelectionBar
            locale={locale}
            onReply={replyToSelected}
            onForward={forwardSelected}
          />
        </Animated.View>
      ) : null}
      {menu ? (
        <MessageMenu
          message={menu.message}
          anchor={menu.anchor}
          host={hostSize}
          currentUserId={session.options.currentUserId}
          locale={locale}
          actions={menuActions}
          quickReactions={quickReactions}
          onReact={onReact}
          onAction={runMenuAction}
          onClose={closeMenu}
          renderContent={renderMessageMenu}
        />
      ) : null}
    </View>
  );
};

const createStyles = (theme: TalkentryTheme) => {
  const { chat } = getComponentTokens(theme);
  return StyleSheet.create({
    root: {
      flex: 1,
      overflow: 'hidden',
    },
    composerOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 3,
    },
    selectionCover: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 4,
    },
    selectionDismiss: {
      ...StyleSheet.absoluteFill,
      zIndex: 2,
    },
    selectionTools: {
      position: 'absolute',
      top: chat.toolsTop,
      right: chat.toolsRight,
      zIndex: 3,
    },
    typingBar: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: chat.typingPaddingTop,
      paddingBottom: chat.typingPaddingBottom,
    },
    typingText: {
      fontSize: chat.typingFontSize,
    },
  });
};
