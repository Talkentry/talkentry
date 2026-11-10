import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { type ChatLocale, chatStrings } from '../../shared/strings';
import type { BubbleStyles } from './styles';

type BubbleMetaProps = {
  readonly locale: ChatLocale;
  readonly isMine: boolean;
  readonly edited: boolean;
  readonly timeLabel: string;
  readonly receipt: { readonly label: string; readonly read: boolean } | null;
  readonly receiptAccessibilityLabel?: string;
  readonly styles: BubbleStyles;
};

/** Edited marker + wall-clock time + receipt ticks. */
export const BubbleMeta = ({
  locale,
  isMine,
  edited,
  timeLabel,
  receipt,
  receiptAccessibilityLabel,
  styles,
}: BubbleMetaProps): ReactElement => (
  <View style={styles.meta}>
    {edited ? (
      <Text style={[styles.edited, isMine ? styles.editedMine : null]}>
        {chatStrings[locale].edited}
      </Text>
    ) : null}
    <Text style={[styles.time, isMine ? styles.timeMine : null]}>{timeLabel}</Text>
    {receipt ? (
      <Text
        style={[styles.status, styles.statusMine, receipt.read ? styles.statusRead : null]}
        accessibilityLabel={receiptAccessibilityLabel}
      >
        {receipt.label}
      </Text>
    ) : null}
  </View>
);
