import { type ReactElement, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';

import { useKeyboardBottomInset } from '../../../react/hooks';
import { useTalkentryTheme } from '../../../theme';
import { chatStrings } from '../../shared/strings';
import { useEmojiPanel } from '../emojiDock';
import { ComposerErrorKind, type ComposerViewProps } from '../types';
import { ComposerAttachmentStrip } from './ComposerAttachmentStrip';
import { ComposerDraftBanner } from './ComposerDraftBanner';
import { EmojiDockSheet } from './EmojiDockSheet';
import { MAX_PENDING_ATTACHMENTS } from './pendingAttachments';
import { createComposerStyles } from './styles';
import { useComposerAttachments } from './useComposerAttachments';
import { useComposerEmoji } from './useComposerEmoji';
import { useComposerOperation } from './useComposerOperation';
import { useComposerSend } from './useComposerSend';
import { useComposerText } from './useComposerText';

/**
 * Dumb composer UI: text, pending attachments, optional draft banner.
 * No Talkentry session — parent supplies `onSend` (host or ComposerConnected).
 */
export const ComposerView = ({
  onSend,
  onAttach,
  showEmoji = true,
  onPickEmoji,
  placeholder,
  locale = 'en',
  onError,
  disabled = false,
  bottomInset,
  banner,
  onClearDraft,
  composerFocusKey = 0,
  submitLabel,
  submitAccessibilityLabel,
  initialText = '',
  allowAttachments = true,
  onTextActivity,
}: ComposerViewProps): ReactElement => {
  const theme = useTalkentryTheme();
  const styles = useMemo(() => createComposerStyles(theme), [theme]);
  const resolvedBottomInset = useKeyboardBottomInset({ bottomInset });
  const emojiPanel = useEmojiPanel(showEmoji && !onPickEmoji);
  const textModel = useComposerText(initialText, onTextActivity);
  const operation = useComposerOperation(disabled, onError);
  const attachmentModel = useComposerAttachments(allowAttachments, onAttach, operation);
  const { handlePickEmoji } = useComposerEmoji(onPickEmoji, textModel, attachmentModel, operation);
  const { handleSend } = useComposerSend(onSend, textModel, attachmentModel, operation);
  const { text, changeText, changeSelection, insertEmoji } = textModel;
  const { attachments, removeAttachment, handleAttach } = attachmentModel;
  const { error, busy, sending, attaching, pickingEmoji } = operation;

  useEffect(() => {
    if (composerFocusKey === 0) {
      return;
    }

    const field = emojiPanel.inputRef.current as (TextInputInstance & { focus: () => void }) | null;

    field?.focus();
  }, [composerFocusKey, emojiPanel.inputRef]);

  const strings = chatStrings[locale];
  const builtInEmoji = showEmoji && !onPickEmoji;
  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled && !busy;

  let errorMessage: string | null = null;

  switch (error) {
    case ComposerErrorKind.Attach:
      errorMessage = strings.attachError;
      break;
    case ComposerErrorKind.Emoji:
      errorMessage = strings.emojiError;
      break;
    case ComposerErrorKind.Send:
      errorMessage = strings.sendError;
      break;
    default:
      break;
  }

  return (
    <View style={styles.wrap}>
      {banner ? (
        <ComposerDraftBanner
          banner={banner}
          cancelLabel={strings.cancel}
          styles={styles}
          onClearDraft={onClearDraft}
        />
      ) : null}
      {attachments.length ? (
        <ComposerAttachmentStrip
          attachments={attachments}
          accessibilityLabel={strings.attachmentsPending}
          removeLabel={strings.removeAttachment}
          styles={styles}
          onRemove={removeAttachment}
        />
      ) : null}
      <View
        style={[
          styles.container,
          {
            paddingBottom:
              styles.container.paddingVertical + (emojiPanel.open ? 0 : resolvedBottomInset),
          },
        ]}
      >
        {onAttach && allowAttachments ? (
          <Pressable
            onPress={() => {
              handleAttach().catch(() => undefined);
            }}
            disabled={disabled || busy || attachments.length >= MAX_PENDING_ATTACHMENTS}
            style={[
              styles.attach,
              disabled || busy || attachments.length >= MAX_PENDING_ATTACHMENTS
                ? styles.sendDisabled
                : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={strings.attachLabel}
          >
            {attaching ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              <Text style={styles.attachLabel}>+</Text>
            )}
          </Pressable>
        ) : null}
        <View style={styles.inputShell}>
          {builtInEmoji ? (
            <Pressable
              onPress={emojiPanel.toggle}
              disabled={disabled || busy}
              style={[styles.emoji, disabled || busy ? styles.sendDisabled : null]}
              accessibilityRole="button"
              accessibilityLabel={emojiPanel.emojiMode ? strings.keyboardLabel : strings.emojiLabel}
            >
              <Text style={styles.emojiLabel}>{emojiPanel.emojiMode ? '⌨' : '☺'}</Text>
            </Pressable>
          ) : null}
          <TextInput
            ref={emojiPanel.inputRef}
            style={[styles.input, builtInEmoji ? styles.inputAfterEmoji : null]}
            value={text}
            onChangeText={changeText}
            onSelectionChange={(event) => {
              changeSelection(event.nativeEvent.selection);
            }}
            onFocus={emojiPanel.onInputFocus}
            placeholder={placeholder ?? strings.placeholder}
            placeholderTextColor={theme.colors.textMuted}
            editable={!disabled}
            multiline
            accessibilityLabel={strings.input}
          />
        </View>
        {onPickEmoji && showEmoji ? (
          <Pressable
            onPress={() => {
              handlePickEmoji().catch(() => undefined);
            }}
            disabled={disabled || busy}
            style={[styles.attach, disabled || busy ? styles.sendDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel={strings.emojiLabel}
          >
            {pickingEmoji ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              <Text style={styles.emojiLabel}>☺</Text>
            )}
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            handleSend().catch(() => undefined);
          }}
          disabled={!canSend}
          style={[styles.send, !canSend ? styles.sendDisabled : null]}
          accessibilityRole="button"
          accessibilityLabel={submitAccessibilityLabel ?? strings.sendLabel}
        >
          {sending ? (
            <ActivityIndicator color={theme.colors.textOnAccent} />
          ) : (
            <Text style={styles.sendLabel}>{submitLabel ?? strings.send}</Text>
          )}
        </Pressable>
      </View>
      <EmojiDockSheet
        open={builtInEmoji && emojiPanel.open}
        height={emojiPanel.keyboardHeight}
        onPick={insertEmoji}
      />
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
};
