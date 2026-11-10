import type { CSSProperties } from 'react';

import { useTalkentryTheme } from '../../theme';

export const DaySeparator = ({ label }: { readonly label: string }) => {
  const theme = useTalkentryTheme();

  return (
    <div style={styles.wrap}>
      <span
        style={{
          ...styles.pill,
          background: theme.colors.surface,
          color: theme.colors.textMuted,
        }}
      >
        {label}
      </span>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  wrap: { display: 'flex', justifyContent: 'center', margin: '8px 0' },
  pill: {
    borderRadius: 12,
    fontSize: 12,
    padding: '4px 10px',
  },
};
