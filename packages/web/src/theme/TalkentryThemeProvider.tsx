import { createContext, type ReactElement, type ReactNode, useContext, useMemo } from 'react';

import { defaultTheme } from './tokens/defaultTheme';
import { mergeTheme } from './tokens/mergeTheme';
import type { TalkentryTheme, TalkentryThemeOverride } from './types';

const TalkentryThemeContext = createContext<TalkentryTheme>(defaultTheme);

export type TalkentryThemeProviderProps = {
  readonly children: ReactNode;
  /** Full theme. When `themeOverride` is also set, override is merged onto this base. */
  readonly theme?: TalkentryTheme;
  /** Partial tokens merged onto `theme` when set, otherwise onto `defaultTheme`. */
  readonly themeOverride?: TalkentryThemeOverride;
};

/**
 * Supplies design tokens to built-in Chat UI.
 * Outside a provider, `useTalkentryTheme` falls back to `defaultTheme`.
 */
export const TalkentryThemeProvider = ({
  children,
  theme,
  themeOverride,
}: TalkentryThemeProviderProps): ReactElement => {
  const value = useMemo(() => {
    if (theme && themeOverride) {
      return mergeTheme(themeOverride, theme);
    }
    if (theme) {
      return theme;
    }
    if (themeOverride) {
      return mergeTheme(themeOverride);
    }

    return defaultTheme;
  }, [theme, themeOverride]);

  return <TalkentryThemeContext.Provider value={value}>{children}</TalkentryThemeContext.Provider>;
};

/** Resolved theme; falls back to `defaultTheme` outside a provider. */
export const useTalkentryTheme = (): TalkentryTheme => useContext(TalkentryThemeContext);
