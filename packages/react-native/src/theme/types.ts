/**
 * Color tokens for built-in Chat UI surfaces and text.
 * Host overrides via `TalkentryThemeProvider` / `mergeTheme`.
 */
import type { TalkentryThemeComponentOverride } from './tokens/componentTokens';

export type TalkentryThemeColors = {
  /** Chat screen background. */
  readonly canvas: string;
  /** Elevated panels (composer bar, sheets). */
  readonly surface: string;
  /** Dividers and input borders. */
  readonly border: string;
  /** Primary body text. */
  readonly text: string;
  /** Secondary / meta text (timestamps, hints). */
  readonly textMuted: string;
  /** Text drawn on accent-filled controls (send, mine bubble). */
  readonly textOnAccent: string;
  /** Primary action / brand accent. */
  readonly accent: string;
  /** Outgoing message bubble fill. */
  readonly bubbleMine: string;
  /** Incoming message bubble fill. */
  readonly bubbleTheirs: string;
  /** Composer text field background. */
  readonly inputBackground: string;
  /** Destructive actions (delete). */
  readonly danger: string;
};

/** Spacing scale in density-independent pixels. */
export type TalkentryThemeSpacing = {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
};

/** Corner radii for bubbles, inputs, and pills. */
export type TalkentryThemeRadii = {
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly pill: number;
};

/** Font sizes / line heights for built-in typography. */
export type TalkentryThemeTypography = {
  /** Message body font size. */
  readonly body: number;
  /** Message body line height. */
  readonly bodyLineHeight: number;
  /** Timestamps and fine print. */
  readonly caption: number;
  /** Button / action labels. */
  readonly label: number;
};

/**
 * Design tokens for built-in Chat UI.
 * Bank-specific branding stays in the host app, not in SDK core.
 */
export type TalkentryTheme = {
  readonly colors: TalkentryThemeColors;
  readonly spacing: TalkentryThemeSpacing;
  readonly radii: TalkentryThemeRadii;
  readonly typography: TalkentryThemeTypography;
  /** Optional semantic design tokens. Omitted groups retain built-in defaults. */
  readonly components?: TalkentryThemeComponentOverride;
};

/** Partial token groups applied on top of a base theme. */
export type TalkentryThemeOverride = {
  readonly colors?: Partial<TalkentryThemeColors>;
  readonly spacing?: Partial<TalkentryThemeSpacing>;
  readonly radii?: Partial<TalkentryThemeRadii>;
  readonly typography?: Partial<TalkentryThemeTypography>;
  readonly components?: TalkentryThemeComponentOverride;
};
