import type { TextStyle } from 'react-native';

import type { TalkentryTheme } from '../types';

/** Component-level design decisions, separate from runtime layout geometry. */
export const defaultComponentTokens = {
  chat: {
    toolsTop: 8,
    toolsRight: 10,
    typingPaddingTop: 6,
    typingPaddingBottom: 2,
    typingFontSize: 12,
  },
  selection: {
    buttonHeight: 52,
    buttonRadius: 18,
    toolbarRadius: 22,
    itemWidth: 44,
    itemHeight: 40,
    iconSize: 22,
    toolbarIconSize: 20,
  },
  composer: {
    thumbnailSize: 64,
    fileFontSize: 10,
    removeInset: 2,
    removeSize: 20,
    removeRadius: 10,
    removeFontSize: 12,
    removeLineHeight: 14,
    rowPadding: 10,
    controlHeight: 40,
    iconSize: 22,
    iconOffset: -2,
    emojiWidth: 36,
    inputMaxHeight: 120,
    sendMinWidth: 64,
    sendPadding: 14,
    disabledOpacity: 0.4,
  },
  latest: {
    size: 42,
    radius: 21,
    chevronSize: 10,
    chevronStroke: 2,
    chevronOffset: -4,
    badgeOffset: -10,
    badgeSize: 20,
    badgePadding: 6,
    badgeRadius: 10,
  },
  actionSheet: {
    emojiSize: 28,
    rowPadding: 14,
  },
  maskedJump: {
    padding: 20,
    rowOpacity: 0.14,
    incomingWidth: '72%' as `${number}%`,
    outgoingWidth: '55%' as `${number}%`,
    tallHeight: 68,
    shortHeight: 42,
  },
  effects: {
    shadowColor: '#000',
    scrim: 'rgba(0,0,0,0.35)',
    mediaScrim: 'rgba(0,0,0,0.55)',
    textOnMedia: '#fff',
    mediumWeight: '500' as TextStyle['fontWeight'],
    semiboldWeight: '600' as TextStyle['fontWeight'],
    boldWeight: '700' as TextStyle['fontWeight'],
    lowElevation: 2,
    lowShadowOffset: 1,
    lowShadowOpacity: 0.16,
    lowShadowRadius: 2,
    mediumElevation: 3,
    mediumShadowOffset: 1,
    mediumShadowOpacity: 0.12,
    mediumShadowRadius: 3,
    highElevation: 4,
    highShadowOffset: 2,
    highShadowOpacity: 0.16,
    highShadowRadius: 4,
  },
};

export type TalkentryThemeComponents = typeof defaultComponentTokens;
export type TalkentryThemeComponentOverride = {
  readonly [Group in keyof TalkentryThemeComponents]?: Partial<TalkentryThemeComponents[Group]>;
};

/** Merge each semantic group so a single token override never drops its siblings. */
export const mergeComponentTokens = (
  override?: TalkentryThemeComponentOverride,
  base: TalkentryThemeComponents = defaultComponentTokens,
): TalkentryThemeComponents => {
  if (!override) {
    return base;
  }
  return {
    chat: { ...base.chat, ...override.chat },
    selection: { ...base.selection, ...override.selection },
    composer: { ...base.composer, ...override.composer },
    latest: { ...base.latest, ...override.latest },
    actionSheet: { ...base.actionSheet, ...override.actionSheet },
    maskedJump: { ...base.maskedJump, ...override.maskedJump },
    effects: { ...base.effects, ...override.effects },
  };
};

/** Older full host themes remain valid and receive the component defaults. */
export const getComponentTokens = (theme: TalkentryTheme): TalkentryThemeComponents =>
  mergeComponentTokens(theme.components);
