import type { CSSProperties } from 'react';

import { useTalkentryTheme } from '../../theme';

export const GapMarker = ({ label }: { readonly label: string }) => {
  const theme = useTalkentryTheme();

  return <div style={{ ...styles.wrap, color: theme.colors.textMuted }}>{label}</div>;
};

const styles: Record<string, CSSProperties> = {
  wrap: {
    textAlign: 'center',
    fontSize: 12,
    margin: '8px 0',
  },
};
