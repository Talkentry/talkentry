import { type CSSProperties, useLayoutEffect, useRef } from 'react';

import { useTalkentryTheme } from '../../theme';

export const ScrollToLatestButton = ({
  label,
  onClick,
  inset = 28,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly inset?: number;
}) => {
  const theme = useTalkentryTheme();
  const button = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (button.current) {
      button.current.style.right = `${inset}px`;
    }
  }, [inset]);

  return (
    <button
      ref={button}
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        ...styles.button,
        background: theme.colors.surface,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      ↓
    </button>
  );
};

const styles: Record<string, CSSProperties> = {
  button: {
    position: 'absolute',
    right: 28,
    bottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    fontSize: 18,
    zIndex: 2,
  },
};
