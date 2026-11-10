import type { Message, UserId } from '@talkentry/core';
import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { BubbleStyles } from './styles';

type BubbleReactionsProps = {
  readonly message: Message;
  readonly currentUserId: UserId;
  readonly isMine: boolean;
  readonly styles: BubbleStyles;
  readonly onReact?: (message: Message, emoji: string) => void;
};

/** Toggle chips under the bubble body. */
export const BubbleReactions = ({
  message,
  currentUserId,
  isMine,
  styles,
  onReact,
}: BubbleReactionsProps): ReactElement | null => {
  const reactions = message.reactions;
  if (!reactions?.length) {
    return null;
  }

  return (
    <View style={styles.reactionRow}>
      {reactions.map((item) => {
        const mine = item.userIds.includes(currentUserId);

        return (
          <Pressable
            key={item.emoji}
            onPress={() => onReact?.(message, item.emoji)}
            style={[
              styles.reactionChip,
              isMine ? styles.reactionChipMine : null,
              mine ? styles.reactionChipActive : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.emoji} ${item.userIds.length}`}
          >
            <Text style={[styles.reactionText, isMine ? styles.reactionTextMine : null]}>
              {item.emoji} {item.userIds.length}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
