import type { TalkentryTheme, TalkentryThemeOverride } from '../types';
import { mergeComponentTokens } from './componentTokens';
import { defaultTheme } from './defaultTheme';

/** Shallow-merge token groups onto a base theme (defaults to `defaultTheme`). */
export const mergeTheme = (
  override: TalkentryThemeOverride,
  base: TalkentryTheme = defaultTheme,
): TalkentryTheme => ({
  colors: { ...base.colors, ...override.colors },
  spacing: { ...base.spacing, ...override.spacing },
  radii: { ...base.radii, ...override.radii },
  typography: { ...base.typography, ...override.typography },
  components: mergeComponentTokens(override.components, mergeComponentTokens(base.components)),
});
