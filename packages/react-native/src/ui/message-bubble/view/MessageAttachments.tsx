import type { Attachment } from '@talkentry/core';
import { Image, Text, View } from 'react-native';

import type { BubbleStyles } from './styles';

export const MessageAttachments = ({
  attachments,
  isMine,
  styles,
}: {
  readonly attachments: readonly Attachment[];
  readonly isMine: boolean;
  readonly styles: BubbleStyles;
}) => {
  if (!attachments.length) {
    return null;
  }

  return (
    <View style={styles.attachments}>
      {attachments.map((item) =>
        item.type === 'image' && item.url ? (
          <Image
            key={item.id}
            source={{ uri: item.url }}
            style={styles.attachmentImage}
            accessibilityLabel={item.name ?? 'image'}
          />
        ) : (
          <Text
            key={item.id}
            style={[styles.attachmentFile, isMine ? styles.attachmentFileMine : null]}
            numberOfLines={2}
          >
            {item.name ?? item.type}
          </Text>
        ),
      )}
    </View>
  );
};
