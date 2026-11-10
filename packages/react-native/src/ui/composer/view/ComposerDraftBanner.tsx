import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { DraftBanner } from '../types';
import type { ComposerStyles } from './styles';

type ComposerDraftBannerProps = {
  readonly banner: DraftBanner;
  readonly cancelLabel: string;
  readonly styles: ComposerStyles;
  readonly onClearDraft?: () => void;
};

/** Reply/edit strip above the text field. */
export const ComposerDraftBanner = ({
  banner,
  cancelLabel,
  styles,
  onClearDraft,
}: ComposerDraftBannerProps): ReactElement => (
  <View style={styles.banner}>
    <View style={styles.bannerBody}>
      <Text style={styles.bannerTitle}>{banner.title}</Text>
      {banner.preview ? (
        <Text style={styles.bannerPreview} numberOfLines={1}>
          {banner.preview}
        </Text>
      ) : null}
    </View>
    {onClearDraft ? (
      <Pressable onPress={onClearDraft} accessibilityRole="button" accessibilityLabel={cancelLabel}>
        <Text style={styles.bannerCancel}>{cancelLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);
