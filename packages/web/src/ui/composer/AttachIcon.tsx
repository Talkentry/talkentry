import type { CSSProperties } from 'react';

export const AttachIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden style={styles.svg}>
    <path
      d="M21.44 11.05 12.25 20.24a6 6 0 1 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const styles: Record<string, CSSProperties> = {
  svg: { display: 'block' },
};
