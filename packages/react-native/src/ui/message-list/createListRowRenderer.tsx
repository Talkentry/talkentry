import type { ListRenderItem } from '@shopify/flash-list';
import { TimelineRowType } from '@talkentry/core';
import { StyleSheet, Text, View } from 'react-native';

import { MessageBubble } from '../message-bubble';
import { isGroupedWithPrevious } from '../message-bubble/grouping';
import type { MessageFocusHandler } from '../shared/slots';
import { formatDayLabel } from './dayLabel';
import type { createListStyles } from './MessageList.styles';
import type { MessageListProps } from './types';
import type { useListNavigation } from './useListNavigation';
import type { useMessageListData } from './useMessageListData';

type Options = {
  props: MessageListProps;
  data: ReturnType<typeof useMessageListData>;
  styles: ReturnType<typeof createListStyles>;
  navigation: Pick<
    ReturnType<typeof useListNavigation>,
    'mask' | 'placeholderHeight' | 'noteRealTarget' | 'targetReached'
  >;
  highlighted: string | null;
  focusTarget: MessageFocusHandler;
  consumeListTap: () => void;
  onQuotePress: (id: string) => void;
};

/** Keeps markers, placeholders, and real messages on one row rendering path. */
export const createListRowRenderer = ({
  props,
  data,
  styles,
  navigation,
  highlighted,
  focusTarget,
  consumeListTap,
  onQuotePress,
}: Options) => {
  const {
    rows,
    connected,
    currentUserId,
    locale,
    strings,
    resolveMessage,
    resolveSenderId,
    resolveIsSystem,
  } = data;
  const target = navigation.targetReached;
  const renderItem: ListRenderItem<string> = ({ item, index }) => {
    if (navigation.mask.getState()?.phase === 'relocating') {
      const height = navigation.placeholderHeight(index);
      // Never invent a height: unmeasured rows keep the real measurement path.
      if (height !== undefined) {
        return (
          <View
            testID="masked-jump-cell"
            importantForAccessibility="no-hide-descendants"
            style={{ height }}
          />
        );
      }
    }
    navigation.noteRealTarget(item);
    const row = rows[index];
    if (row?.type === TimelineRowType.Day) {
      const label = formatDayLabel(row.createdAt, locale);
      if (props.renderDay) {
        return props.renderDay({
          dayKey: row.dayKey,
          createdAt: row.createdAt,
          label,
          locale,
        });
      }

      return (
        <View style={styles.day} accessibilityRole="header" accessibilityLabel={label}>
          <Text style={styles.dayText}>{label}</Text>
        </View>
      );
    }
    if (row?.type === TimelineRowType.Unread) {
      const label = strings.unread;
      if (props.renderUnread) {
        return props.renderUnread({ beforeId: row.beforeId, label, locale });
      }

      return (
        <View
          style={styles.unread}
          accessibilityRole="header"
          accessibilityLabel={strings.unreadLabel}
        >
          <View style={styles.unreadLine} />
          <Text style={styles.unreadText}>{label}</Text>
        </View>
      );
    }
    if (row?.type === TimelineRowType.Gap) {
      if (props.renderGap) {
        return props.renderGap({ gap: row.gap, locale });
      }
      const label =
        row.gap.missingCount !== undefined
          ? `${strings.gap} (${row.gap.missingCount})`
          : strings.gap;

      return (
        <View style={styles.gap} accessibilityRole="text" accessibilityLabel={strings.gapLabel}>
          <Text style={styles.gapText}>{label}</Text>
        </View>
      );
    }
    const groupedWithPrevious = isGroupedWithPrevious(
      rows,
      index,
      resolveSenderId,
      resolveIsSystem,
    );
    const showSenderHeader = !groupedWithPrevious;
    if (props.renderMessage) {
      return props.renderMessage(
        connected
          ? {
              messageId: item,
              currentUserId,
              locale,
              index,
              showSenderHeader,
              groupedWithPrevious,
              onQuotePress,
              onNavigationFocus: target?.key === item ? focusTarget : undefined,
              consumeListTap,
            }
          : {
              message: resolveMessage(item)!,
              currentUserId,
              locale,
              index,
              showSenderHeader,
              groupedWithPrevious,
              onQuotePress,
              onNavigationFocus: target?.key === item ? focusTarget : undefined,
              consumeListTap,
            },
      );
    }

    return connected ? (
      <MessageBubble
        messageId={item}
        onQuotePress={onQuotePress}
        onNavigationFocus={target?.key === item ? focusTarget : undefined}
        currentUserId={currentUserId}
        locale={locale}
        users={props.users}
        showSenderHeader={showSenderHeader}
        groupedWithPrevious={groupedWithPrevious}
        consumeListTap={consumeListTap}
        renderMessageBody={props.renderMessageBody}
        renderSwipeHint={props.renderSwipeHint}
      />
    ) : (
      <MessageBubble
        message={resolveMessage(item)!}
        onQuotePress={onQuotePress}
        onNavigationFocus={target?.key === item ? focusTarget : undefined}
        replyParent={data.resolveReplyParent(item)}
        currentUserId={currentUserId}
        locale={locale}
        users={props.users}
        showSenderHeader={showSenderHeader}
        groupedWithPrevious={groupedWithPrevious}
        consumeListTap={consumeListTap}
        renderMessageBody={props.renderMessageBody}
        renderSwipeHint={props.renderSwipeHint}
      />
    );
  };
  const renderRow: ListRenderItem<string> = (info) => {
    const content = renderItem(info);

    return (
      <View>
        {content}
        {info.item === highlighted ? (
          <View
            pointerEvents="none"
            importantForAccessibility="no"
            style={[StyleSheet.absoluteFill, styles.targetHighlight]}
          />
        ) : null}
      </View>
    );
  };

  return renderRow;
};
