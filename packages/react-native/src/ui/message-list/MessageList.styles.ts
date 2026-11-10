import { StyleSheet } from 'react-native';

import type { TalkentryTheme } from '../../theme';

export const createListStyles = (theme: TalkentryTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.canvas },
    loadingHeader: { height: 24 },
    targetHighlight: { borderWidth: 2, borderColor: theme.colors.accent, borderRadius: 8 },
    control: {
      padding: theme.spacing.md,
      textAlign: 'center',
      color: theme.colors.accent,
    },
    gap: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
    },
    gapText: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
    },
    day: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
    },
    dayText: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    unread: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
    },
    unreadLine: {
      alignSelf: 'stretch',
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.accent,
      marginBottom: theme.spacing.xs,
      opacity: 0.45,
    },
    unreadText: {
      fontSize: theme.typography.caption,
      color: theme.colors.accent,
      fontWeight: '600',
    },
  });
