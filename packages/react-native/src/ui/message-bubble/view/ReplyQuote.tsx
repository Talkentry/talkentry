import type { Message } from '@talkentry/core';
import { Pressable, Text } from 'react-native';

import type { BubbleStyles } from './styles';

export const ReplyQuote = ({
  parent,
  isMine,
  styles,
  label,
  fallback,
  onPress,
}: {
  readonly parent?: Message;
  readonly isMine: boolean;
  readonly styles: BubbleStyles;
  readonly label: string;
  readonly fallback: string;
  readonly onPress?: () => void;
}) => {
  return (
    <Pressable
      style={[styles.reply, isMine ? styles.replyMine : null]}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={(event) => {
        event.stopPropagation();
        onPress?.();
      }}
      onLongPress={(event) => event.stopPropagation()}
    >
      {parent ? (
        <Text style={[styles.replySender, isMine ? styles.replySenderMine : null]}>
          {parent.senderId}
        </Text>
      ) : null}
      <Text style={[styles.replyText, isMine ? styles.replyTextMine : null]} numberOfLines={2}>
        {parent ? (parent.text ?? '') : fallback}
      </Text>
    </Pressable>
  );
};
