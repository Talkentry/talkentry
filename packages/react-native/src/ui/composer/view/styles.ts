import { type ImageStyle, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { getComponentTokens, type TalkentryTheme } from '../../../theme';

/** Public RN style types keep emitted declarations independent of node_modules paths. */
export type ComposerStyles = {
  readonly wrap: ViewStyle;
  readonly banner: ViewStyle;
  readonly bannerBody: ViewStyle;
  readonly bannerTitle: TextStyle;
  readonly bannerPreview: TextStyle;
  readonly bannerCancel: TextStyle;
  readonly pendingRow: ViewStyle;
  readonly pendingChip: ViewStyle;
  readonly pendingImage: ImageStyle;
  readonly pendingFile: ViewStyle;
  readonly pendingFileLabel: TextStyle;
  readonly pendingRemove: ViewStyle;
  readonly pendingRemoveLabel: TextStyle;
  readonly container: ViewStyle & { readonly paddingVertical: number };
  readonly attach: ViewStyle;
  readonly attachLabel: TextStyle;
  readonly inputShell: ViewStyle;
  readonly emoji: ViewStyle;
  readonly inputAfterEmoji: ViewStyle;
  readonly emojiLabel: TextStyle;
  readonly input: TextStyle;
  readonly send: ViewStyle;
  readonly sendDisabled: ViewStyle;
  readonly sendLabel: TextStyle;
  readonly error: TextStyle;
};

export const createComposerStyles = (theme: TalkentryTheme): ComposerStyles => {
  const { composer, effects } = getComponentTokens(theme);
  return StyleSheet.create({
    wrap: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    banner: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    bannerBody: {
      flex: 1,
    },
    bannerTitle: {
      fontSize: theme.typography.caption,
      fontWeight: effects.semiboldWeight,
      color: theme.colors.accent,
    },
    bannerPreview: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
    },
    bannerCancel: {
      fontSize: theme.typography.caption,
      color: theme.colors.danger,
      fontWeight: effects.semiboldWeight,
    },
    pendingRow: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    pendingChip: {
      marginRight: theme.spacing.sm,
      borderRadius: theme.radii.sm,
      overflow: 'hidden',
      backgroundColor: theme.colors.inputBackground,
      position: 'relative',
    },
    pendingImage: {
      width: composer.thumbnailSize,
      height: composer.thumbnailSize,
    },
    pendingFile: {
      width: composer.thumbnailSize,
      height: composer.thumbnailSize,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xs,
    },
    pendingFileLabel: {
      fontSize: composer.fileFontSize,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    pendingRemove: {
      position: 'absolute',
      top: composer.removeInset,
      right: composer.removeInset,
      width: composer.removeSize,
      height: composer.removeSize,
      borderRadius: composer.removeRadius,
      backgroundColor: effects.mediaScrim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pendingRemoveLabel: {
      color: effects.textOnMedia,
      fontSize: composer.removeFontSize,
      fontWeight: effects.boldWeight,
      lineHeight: composer.removeLineHeight,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: composer.rowPadding,
    },
    attach: {
      minWidth: composer.controlHeight,
      height: composer.controlHeight,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachLabel: {
      fontSize: composer.iconSize,
      color: theme.colors.accent,
      fontWeight: effects.semiboldWeight,
      marginTop: composer.iconOffset,
    },
    inputShell: {
      flex: 1,
      minHeight: composer.controlHeight,
      maxHeight: composer.inputMaxHeight,
      flexDirection: 'row',
      alignItems: 'flex-end',
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.inputBackground,
    },
    emoji: {
      width: composer.emojiWidth,
      height: composer.controlHeight,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.xs,
    },
    inputAfterEmoji: {
      paddingLeft: theme.spacing.xs,
    },
    emojiLabel: {
      fontSize: composer.iconSize,
      color: theme.colors.text,
    },
    input: {
      flex: 1,
      minHeight: composer.controlHeight,
      maxHeight: composer.inputMaxHeight,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: composer.rowPadding,
      fontSize: theme.typography.body,
      color: theme.colors.text,
    },
    send: {
      minWidth: composer.sendMinWidth,
      height: composer.controlHeight,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: composer.sendPadding,
    },
    sendDisabled: {
      opacity: composer.disabledOpacity,
    },
    sendLabel: {
      color: theme.colors.textOnAccent,
      fontSize: theme.typography.label,
      fontWeight: effects.semiboldWeight,
    },
    error: {
      color: theme.colors.danger,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
  });
};
