import type { TalkentryTheme } from '../types';

/** Built-in light palette: cool gray room, white incoming bubbles, blue outgoing. */
export const defaultTheme: TalkentryTheme = {
  colors: {
    canvas: '#E4EAF0',
    surface: '#FFFFFF',
    border: '#D3DCE3',
    text: '#1C1C1E',
    textMuted: '#7D8B99',
    textOnAccent: '#FFFFFF',
    accent: '#3390EC',
    bubbleMine: '#3390EC',
    bubbleTheirs: '#FFFFFF',
    inputBackground: '#EEF2F6',
    danger: '#E04F4F',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  radii: {
    sm: 12,
    md: 14,
    lg: 20,
    pill: 20,
  },
  typography: {
    body: 16,
    bodyLineHeight: 22,
    caption: 11,
    label: 15,
  },
};
