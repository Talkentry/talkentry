import { StyleSheet } from 'react-native';

import type { TalkentryTheme } from '../../../theme';

const AVATAR_SIZE = 32;

export { AVATAR_SIZE };

export const createBubbleStyles = (theme: TalkentryTheme) =>
  StyleSheet.create({
    row: {
      marginVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
    },
    rowGrouped: {
      marginTop: 2,
      marginBottom: theme.spacing.xs,
    },
    rowMine: {
      justifyContent: 'flex-end',
    },
    rowTheirs: {
      justifyContent: 'flex-start',
      alignItems: 'flex-end', // avatar bottom-aligns with bubble like Telegram
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarSpacer: {
      width: AVATAR_SIZE,
      marginRight: theme.spacing.sm,
    },
    avatarImage: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    },
    avatarText: {
      fontSize: theme.typography.caption,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    bubbleMine: {
      backgroundColor: theme.colors.bubbleMine,
    },
    bubbleTheirs: {
      backgroundColor: theme.colors.bubbleTheirs,
    },
    /** Hit target for a host-painted bubble. No built-in fill or padding. */
    bubbleHost: {
      maxWidth: '80%',
      flexShrink: 1,
    },
    systemRow: {
      marginVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    systemText: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
      textAlign: 'center',
      fontWeight: '500',
    },
    sender: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
      marginBottom: 2,
    },
    reply: {
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.accent,
      paddingLeft: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      opacity: 0.9,
    },
    replyMine: {
      borderLeftColor: theme.colors.textOnAccent,
    },
    replySender: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    replySenderMine: {
      color: theme.colors.textOnAccent,
      opacity: 0.85,
    },
    replyText: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
    },
    replyTextMine: {
      color: theme.colors.textOnAccent,
      opacity: 0.85,
    },
    text: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.bodyLineHeight,
      color: theme.colors.text,
    },
    textMine: {
      color: theme.colors.textOnAccent,
    },
    attachments: {
      marginTop: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    attachmentImage: {
      width: 220,
      maxWidth: '100%',
      height: 160,
      borderRadius: theme.radii.sm,
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    attachmentFile: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
    },
    attachmentFileMine: {
      color: theme.colors.textOnAccent,
      opacity: 0.9,
    },
    meta: {
      marginTop: theme.spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
    },
    edited: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
      fontStyle: 'italic',
    },
    editedMine: {
      color: theme.colors.textOnAccent,
      opacity: 0.8,
    },
    time: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
    },
    timeMine: {
      color: theme.colors.textOnAccent,
      opacity: 0.85,
    },
    status: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
    },
    statusMine: {
      color: theme.colors.textOnAccent,
    },
    statusRead: {
      color: '#B8E0FF',
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    action: {
      fontSize: theme.typography.caption,
      color: theme.colors.accent,
      fontWeight: '600',
    },
    actionMine: {
      color: theme.colors.textOnAccent,
      opacity: 0.9,
    },
    reactionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: theme.spacing.xs,
    },
    reactionChip: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: 'rgba(0,0,0,0.06)',
    },
    reactionChipMine: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    reactionChipActive: {
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    reactionText: {
      fontSize: theme.typography.caption,
      color: theme.colors.text,
    },
    reactionTextMine: {
      color: theme.colors.textOnAccent,
    },
    reactPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: theme.spacing.xs,
    },
    swipeShell: {
      position: 'relative',
      overflow: 'visible',
    },
    swipeHint: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: theme.spacing.lg,
    },
    swipeHintIcon: {
      fontSize: 18,
      color: theme.colors.accent,
      fontWeight: '700',
    },
  });

export type BubbleStyles = ReturnType<typeof createBubbleStyles>;
