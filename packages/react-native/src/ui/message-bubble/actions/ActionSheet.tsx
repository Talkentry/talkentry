import type { Message } from '@talkentry/core';
import { type ReactElement, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getComponentTokens, type TalkentryTheme, useTalkentryTheme } from '../../../theme';
import { QUICK_REACTIONS } from '../../message-menu/quickReactions';
import { type ChatLocale, chatStrings } from '../../shared/strings';
import type { MessageActionItem } from './messageActions';

export type MessageActionSheetProps = {
  readonly visible: boolean;
  readonly message: Message;
  readonly locale?: ChatLocale;
  readonly actions: readonly MessageActionItem[];
  readonly onClose: () => void;
  readonly onAction: (action: MessageActionItem) => void;
  readonly onReact?: (message: Message, emoji: string) => void;
};

/**
 * Cross-platform message action sheet (Telegram-style). Host may replace via
 * `renderMessageActions` on Chat / MessageBubble.
 */
export const MessageActionSheet = ({
  visible,
  message,
  locale = 'en',
  actions,
  onClose,
  onAction,
  onReact,
}: MessageActionSheetProps): ReactElement => {
  const theme = useTalkentryTheme();
  const styles = useMemo(() => createSheetStyles(theme), [theme]);
  const strings = chatStrings[locale];
  const preview = (message.text ?? '').trim() || message.attachments?.[0]?.name || '…';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={strings.cancel}
      >
        <Pressable
          style={styles.sheet}
          onPress={(event) => event.stopPropagation()}
          accessibilityRole="menu"
          accessibilityLabel={strings.messageActions}
        >
          <View style={styles.preview} accessibilityElementsHidden>
            <Text style={styles.previewText} numberOfLines={2}>
              {preview}
            </Text>
          </View>
          {onReact ? (
            <View style={styles.reactRow}>
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    onReact(message, emoji);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${strings.reactLabel} ${emoji}`}
                >
                  <Text style={styles.reactEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {actions.map((action) => (
            <Pressable
              key={action.id}
              style={styles.action}
              onPress={() => onAction(action)}
              accessibilityRole="menuitem"
              accessibilityLabel={action.accessibilityLabel}
            >
              <Text
                style={[styles.actionLabel, action.destructive ? styles.actionDestructive : null]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.cancel}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={strings.cancel}
          >
            <Text style={styles.cancelLabel}>{strings.cancel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createSheetStyles = (theme: TalkentryTheme) => {
  const { actionSheet, effects } = getComponentTokens(theme);
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: effects.scrim,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    preview: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    previewText: {
      fontSize: theme.typography.caption,
      color: theme.colors.textMuted,
    },
    reactRow: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    reactEmoji: {
      fontSize: actionSheet.emojiSize,
      padding: theme.spacing.sm,
    },
    action: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: actionSheet.rowPadding,
    },
    actionLabel: {
      fontSize: theme.typography.body,
      color: theme.colors.text,
      fontWeight: effects.mediumWeight,
    },
    actionDestructive: {
      color: theme.colors.danger,
    },
    cancel: {
      marginTop: theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: actionSheet.rowPadding,
      alignItems: 'center',
    },
    cancelLabel: {
      fontSize: theme.typography.body,
      color: theme.colors.accent,
      fontWeight: effects.semiboldWeight,
    },
  });
};
