/**
 * Theme layer for built-in DOM Chat UI.
 * Token values match `@talkentry/react-native`; this package does not import RN.
 */

export {
  TalkentryThemeProvider,
  type TalkentryThemeProviderProps,
  useTalkentryTheme,
} from './TalkentryThemeProvider';
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
