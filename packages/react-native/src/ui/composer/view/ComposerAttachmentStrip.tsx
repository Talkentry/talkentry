import type { Attachment } from '@talkentry/core';
import type { ReactElement } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import type { ComposerStyles } from './styles';

type ComposerAttachmentStripProps = {
  readonly attachments: readonly Attachment[];
  readonly accessibilityLabel: string;
  readonly removeLabel: string;
  readonly styles: ComposerStyles;
  readonly onRemove: (id: string) => void;
};

/** Horizontal chips for files waiting to send. */
export const ComposerAttachmentStrip = ({
  attachments,
  accessibilityLabel,
  removeLabel,
  styles,
  onRemove,
}: ComposerAttachmentStripProps): ReactElement => (
  <ScrollView
    horizontal
    style={styles.pendingRow}
    showsHorizontalScrollIndicator={false}
    accessibilityLabel={accessibilityLabel}
  >
    {attachments.map((item) => (
      <View key={item.id} style={styles.pendingChip}>
        {item.type === 'image' && item.url ? (
          <Image source={{ uri: item.url }} style={styles.pendingImage} />
        ) : (
          <View style={styles.pendingFile}>
            <Text style={styles.pendingFileLabel} numberOfLines={3}>
              {item.name ?? item.type}
            </Text>
          </View>
        )}
        <Pressable
          style={styles.pendingRemove}
          onPress={() => onRemove(item.id)}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
        >
          <Text style={styles.pendingRemoveLabel}>×</Text>
        </Pressable>
      </View>
    ))}
  </ScrollView>
);
