import type { Message } from '@talkentry/core';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { type ChatLocale, chatStrings } from '../../shared/strings';
import type { BubbleStyles } from './styles';

type SystemMessageRowProps = {
  readonly message: Message;
  readonly locale: ChatLocale;
  readonly styles: BubbleStyles;
  readonly renderSystemMessage?: (params: {
    readonly message: Message;
    readonly locale: ChatLocale;
  }) => ReactElement | null;
};

/** Centered system line (or host override). */
export const SystemMessageRow = ({
  message,
  locale,
  styles,
  renderSystemMessage,
}: SystemMessageRowProps): ReactElement | null => {
  const custom = renderSystemMessage?.({ message, locale });
  if (custom != null) {
    return custom;
  }

  const label = message.text?.trim() || '…';

  return (
    <View
      style={styles.systemRow}
      accessibilityRole="text"
      accessibilityLabel={`${chatStrings[locale].systemMessageLabel}. ${label}`}
    >
      <Text style={styles.systemText}>{label}</Text>
    </View>
  );
};
