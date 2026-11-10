import type { User } from '@talkentry/core';
import type { ReactElement } from 'react';
import { Image, Text, View } from 'react-native';

import { initialsFor } from './initialsFor';
import type { BubbleStyles } from './styles';

type BubbleAvatarProps = {
  readonly sender: User | undefined;
  readonly senderId: string;
  readonly showSenderHeader: boolean;
  readonly styles: BubbleStyles;
};

/** Peer avatar or spacer so grouped rows stay aligned. */
export const BubbleAvatar = ({
  sender,
  senderId,
  showSenderHeader,
  styles,
}: BubbleAvatarProps): ReactElement => {
  if (!showSenderHeader) {
    return <View style={styles.avatarSpacer} accessibilityElementsHidden />;
  }

  return (
    <View style={styles.avatar} accessibilityElementsHidden>
      {sender?.avatarUrl ? (
        <Image source={{ uri: sender.avatarUrl }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarText}>{initialsFor(sender, senderId)}</Text>
      )}
    </View>
  );
};
