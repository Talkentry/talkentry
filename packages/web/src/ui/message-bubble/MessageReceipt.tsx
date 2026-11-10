import type { MessageStatus } from '@talkentry/core';
import type { CSSProperties } from 'react';

import { useTalkentryTheme } from '../../theme';
import type { ChatLocale } from '../shared/strings';
import { receiptTicks } from './receiptTicks';

/** Light ticks on the blue outgoing bubble, matching RN `statusRead`. */
const READ_TICK = '#B8E0FF';

export const MessageReceipt = ({
  status,
  locale,
}: {
  readonly status?: MessageStatus;
  readonly locale: ChatLocale;
}) => {
  const theme = useTalkentryTheme();
  const receipt = receiptTicks(status, locale);

  if (!receipt) {
    return null;
  }

  return (
    <span
      aria-label={receipt.accessibilityLabel}
      style={receipt.read ? styles.read : { ...styles.mark, color: theme.colors.textOnAccent }}
    >
      {receipt.label}
    </span>
  );
};

const styles: Record<string, CSSProperties> = {
  mark: {},
  read: { color: READ_TICK },
};
