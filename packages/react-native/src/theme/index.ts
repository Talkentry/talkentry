/**
 * Theme layer for built-in Chat UI.
 *
 * - `TalkentryThemeProvider` / `useTalkentryTheme` — React entry
 * - `types` — token contract
 * - `tokens/` — default palette + merge helper (also public for hosts)
 */

export {
  TalkentryThemeProvider,
  type TalkentryThemeProviderProps,
  useTalkentryTheme,
} from './TalkentryThemeProvider';
export {
  getComponentTokens,
  type TalkentryThemeComponentOverride,
  type TalkentryThemeComponents,
} from './tokens/componentTokens';
export { defaultTheme } from './tokens/defaultTheme';
export { mergeTheme } from './tokens/mergeTheme';
export type {
  TalkentryTheme,
  TalkentryThemeColors,
  TalkentryThemeOverride,
  TalkentryThemeRadii,
  TalkentryThemeSpacing,
  TalkentryThemeTypography,
} from './types';
