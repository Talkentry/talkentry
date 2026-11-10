import type { Message, UserId } from '@talkentry/core';
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OverKeyboardView } from 'react-native-keyboard-controller';

import { type TalkentryTheme, useTalkentryTheme } from '../../theme';
import { MessageActionId, type MessageActionItem } from '../message-bubble/actions/messageActions';
import type { RenderMessageMenuParams } from '../shared/slots';
import { type ChatLocale, chatStrings } from '../shared/strings';
import { type MenuRect, type MenuSize, pickerSize, placeMenu } from './menuLayout';
import { MessageMenuPicker } from './MessageMenuPicker';
import { MessageMenuReactions } from './MessageMenuReactions';
import { createPressLock, overlayPressProps } from './overlayPress';

export type MessageMenuProps = {
  /** Message the menu acts on. */
  readonly message: Message;
  /** Bubble frame in window coordinates. */
  readonly anchor: MenuRect;
  /** Size of the overlay that hosts the menu, usually the window. */
  readonly host: MenuSize;
  /** Viewer id. Decides alignment and the highlighted reaction. */
  readonly currentUserId: UserId;
  readonly locale: ChatLocale;
  /** Rows under the reactions, usually from `buildMessageActions`. */
  readonly actions: readonly MessageActionItem[];
  /** Emoji in the quick strip. Empty hides the strip and the full picker. */
  readonly quickReactions: readonly string[];
  /** Adds the emoji, replaces the viewer's other reaction, or removes the same one. */
  readonly onReact?: (message: Message, emoji: string) => void;
  readonly onAction: (action: MessageActionItem) => void;
  readonly onClose: () => void;
  /** Host card in place of the built-in strip and action rows. */
  readonly renderContent?: (params: RenderMessageMenuParams) => ReactNode;
};

const ACTION_ICONS: Record<MessageActionId, string> = {
  [MessageActionId.Reply]: '↩',
  [MessageActionId.Copy]: '⧉',
  [MessageActionId.Edit]: '✎',
  [MessageActionId.Forward]: '↪',
  [MessageActionId.Delete]: '🗑',
};

const sameSize = (a: MenuSize | null, b: MenuSize) =>
  a !== null && a.width === b.width && a.height === b.height;

/**
 * Telegram-style tap menu: quick reactions over the message actions, anchored to the bubble.
 * The chevron swaps in the full emoji card; a tap outside the card returns here,
 * a tap outside the menu closes it. Android back follows the same steps.
 * Hosted in OverKeyboardView so the card covers the software keyboard
 * without dismissing it.
 */
export const MessageMenu = ({
  message,
  anchor,
  host,
  currentUserId,
  locale,
  actions,
  quickReactions,
  onReact,
  onAction,
  onClose,
  renderContent,
}: MessageMenuProps): ReactElement => {
  const theme = useTalkentryTheme();
  const styles = useMemo(() => createMenuStyles(theme), [theme]);
  const lockPress = useRef(createPressLock()).current;
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState<MenuSize | null>(null);

  const strings = chatStrings[locale];
  const alignEnd = message.senderId === currentUserId;
  const canReact = !!onReact && quickReactions.length > 0;
  const myReaction = message.reactions?.find((item) => item.userIds.includes(currentUserId))?.emoji;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (expanded) {
        setExpanded(false);
      } else {
        onClose();
      }

      return true;
    });

    return () => subscription.remove();
  }, [expanded, onClose]);

  const react = (emoji: string) => {
    lockPress(() => {
      onClose();
      onReact?.(message, emoji);
    });
  };

  const onMenuLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (sameSize(current, { width, height }) ? current : { width, height }));
  };
  const menuPosition = size ? placeMenu(anchor, size, host, alignEnd) : null;
  const picker = pickerSize(host);
  const expand = () => setExpanded(true);
  const builtInContent = (
    <>
      {canReact ? (
        <MessageMenuReactions
          emojis={quickReactions}
          selected={myReaction}
          locale={locale}
          onPick={react}
          onExpand={expand}
        />
      ) : null}
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              style={styles.action}
              {...overlayPressProps(lockPress, () => onAction(action))}
              accessibilityRole="menuitem"
              accessibilityLabel={action.accessibilityLabel}
            >
              <Text style={[styles.actionIcon, action.destructive ? styles.destructive : null]}>
                {ACTION_ICONS[action.id]}
              </Text>
              <Text style={[styles.actionLabel, action.destructive ? styles.destructive : null]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
  const content = renderContent
    ? renderContent({
        message,
        isMine: alignEnd,
        actions,
        quickReactions: canReact ? quickReactions : [],
        selectedReaction: myReaction,
        locale,
        onReact: react,
        onAction,
        onExpandReactions: expand,
        onClose,
      })
    : builtInContent;

  return (
    <OverKeyboardView visible>
      <View collapsable={false} style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          {...overlayPressProps(lockPress, expanded ? () => setExpanded(false) : onClose)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? strings.backToActions : strings.cancel}
        />
        {expanded ? (
          <MessageMenuPicker
            position={placeMenu(anchor, picker, host, alignEnd)}
            size={picker}
            onPick={react}
          />
        ) : (
          <View
            collapsable={false}
            onLayout={onMenuLayout}
            onTouchEnd={(event) => event.stopPropagation()}
            style={[
              styles.menu,
              alignEnd ? styles.menuEnd : styles.menuStart,
              menuPosition ?? styles.measuring,
            ]}
            accessibilityRole="menu"
            accessibilityLabel={strings.messageActions}
          >
            {content}
          </View>
        )}
      </View>
    </OverKeyboardView>
  );
};

const createMenuStyles = (theme: TalkentryTheme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    menu: {
      position: 'absolute',
      gap: theme.spacing.sm,
      zIndex: 2,
      elevation: 8,
    },
    menuStart: {
      alignItems: 'flex-start',
    },
    menuEnd: {
      alignItems: 'flex-end',
    },
    measuring: {
      left: 0,
      top: 0,
      opacity: 0,
    },
    actions: {
      minWidth: 220,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.xs,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 11,
      gap: theme.spacing.md,
    },
    actionIcon: {
      width: 22,
      fontSize: 18,
      textAlign: 'center',
      color: theme.colors.textMuted,
    },
    actionLabel: {
      fontSize: theme.typography.label,
      color: theme.colors.text,
    },
    destructive: {
      color: theme.colors.danger,
    },
  });
