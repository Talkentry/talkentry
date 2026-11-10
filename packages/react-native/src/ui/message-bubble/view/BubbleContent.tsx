import type { Message, User, UserId } from '@talkentry/core';
import { type ComponentRef, type ReactElement, type ReactNode, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { MessageAnchorMeasure, MessageFocusHandler } from '../../shared/slots';
import { type ChatLocale, chatStrings } from '../../shared/strings';
import { BubbleAvatar } from './BubbleAvatar';
import { BubbleMeta } from './BubbleMeta';
import { BubbleReactions } from './BubbleReactions';
import { MessageAttachments } from './MessageAttachments';
import { ReplyQuote } from './ReplyQuote';
import type { BubbleStyles } from './styles';

type BubbleContentProps = {
  readonly onQuotePress?: (messageId: string) => void;
  readonly onNavigationFocus?: MessageFocusHandler;
  readonly message: Message;
  readonly currentUserId: UserId;
  readonly users?: Readonly<Record<string, User>>;
  readonly showSenderHeader: boolean;
  readonly groupedWithPrevious: boolean;
  readonly locale: ChatLocale;
  readonly isMine: boolean;
  readonly senderLabel: string;
  readonly timeLabel: string;
  readonly receipt: { readonly label: string; readonly read: boolean } | null;
  readonly receiptAccessibilityLabel?: string;
  readonly edited: boolean;
  readonly canOpenMenu: boolean;
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  readonly replyParent?: Message;
  readonly styles: BubbleStyles;
  readonly onOpenMenu: () => void;
  /** Single tap. Undefined leaves the bubble without a tap action. */
  readonly onPress?: (measure: MessageAnchorMeasure) => void;
  readonly onReact?: (message: Message, emoji: string) => void;
  readonly consumeListTap?: () => void;
  /** Host interior. Undefined keeps the built-in quote, text, time, and receipts. */
  readonly body?: ReactNode;
};

/** One chat row: optional avatar + pressable bubble body. */
export const BubbleContent = ({
  onQuotePress,
  onNavigationFocus,
  message,
  currentUserId,
  users,
  showSenderHeader,
  groupedWithPrevious,
  locale,
  isMine,
  senderLabel,
  timeLabel,
  receipt,
  receiptAccessibilityLabel,
  edited,
  canOpenMenu,
  accessibilityLabel,
  accessibilityHint,
  replyParent,
  styles,
  onOpenMenu,
  onPress,
  onReact,
  consumeListTap,
  body,
}: BubbleContentProps): ReactElement => {
  const bubbleRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    onNavigationFocus?.(bubbleRef.current);
  }, [onNavigationFocus]);
  const sender = users?.[message.senderId];
  const chrome = isMine ? styles.bubbleMine : styles.bubbleTheirs;
  const bubbleStyle = body === undefined ? [styles.bubble, chrome] : styles.bubbleHost;
  const strings = chatStrings[locale];
  const measure: MessageAnchorMeasure = (callback) => {
    bubbleRef.current?.measureInWindow(callback);
  };
  let pressHint: string | undefined;

  if (onPress) {
    pressHint = strings.messageMenuHint;
  } else if (canOpenMenu) {
    pressHint = strings.longPressHint;
  }

  return (
    <View
      style={[
        styles.row,
        groupedWithPrevious ? styles.rowGrouped : null,
        isMine ? styles.rowMine : styles.rowTheirs,
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {!isMine ? (
        <BubbleAvatar
          sender={sender}
          senderId={message.senderId}
          showSenderHeader={showSenderHeader}
          styles={styles}
        />
      ) : null}
      <Pressable
        ref={bubbleRef}
        style={bubbleStyle}
        disabled={!canOpenMenu && !onPress && !(onQuotePress && message.replyToId)}
        delayLongPress={350}
        onPressIn={consumeListTap}
        onPress={onPress ? () => onPress(measure) : undefined}
        onLongPress={() => {
          if (canOpenMenu) {
            onOpenMenu();
          }
        }}
        accessibilityRole="button"
        accessibilityHint={pressHint}
      >
        {body !== undefined ? (
          body
        ) : (
          <>
            {!isMine && showSenderHeader ? <Text style={styles.sender}>{senderLabel}</Text> : null}
            {message.replyToId ? (
              <ReplyQuote
                parent={replyParent}
                isMine={isMine}
                styles={styles}
                label={strings.quoteLabel}
                fallback={strings.quoteUnavailable}
                onPress={
                  onQuotePress
                    ? () => {
                        consumeListTap?.();
                        onQuotePress(message.replyToId!);
                      }
                    : undefined
                }
              />
            ) : null}
            {message.attachments?.length ? (
              <MessageAttachments
                attachments={message.attachments}
                isMine={isMine}
                styles={styles}
              />
            ) : null}
            {message.text ? (
              <Text style={[styles.text, isMine ? styles.textMine : null]}>{message.text}</Text>
            ) : null}
            <BubbleMeta
              locale={locale}
              isMine={isMine}
              edited={edited}
              timeLabel={timeLabel}
              receipt={receipt}
              receiptAccessibilityLabel={receiptAccessibilityLabel}
              styles={styles}
            />
            <BubbleReactions
              message={message}
              currentUserId={currentUserId}
              isMine={isMine}
              styles={styles}
              onReact={(target, emoji) => {
                consumeListTap?.();
                onReact?.(target, emoji);
              }}
            />
          </>
        )}
      </Pressable>
    </View>
  );
};
