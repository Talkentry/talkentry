import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useTalkentryTheme } from '../../theme';
import { EmojiPanel, EmojiPanelVariant } from '../shared/emoji/EmojiPanel';
import { chatStrings } from '../shared/strings';
import { AttachIcon } from './AttachIcon';
import { ComposerAttachmentStrip } from './ComposerAttachmentStrip';
import { fitComposerHeight } from './composerGeometry';
import { styles } from './ComposerView.styles';
import type { ComposerViewProps } from './types';
import { useComposerAttachments } from './useComposerAttachments';

const EMOJI_POPOVER_HEIGHT = 240;

export const ComposerView = ({
  locale = 'en',
  onError,
  onSend,
  placeholder,
  disabled,
  banner,
  onClearDraft,
  composerFocusKey,
  submitLabel,
  submitAccessibilityLabel,
  initialText = '',
  onTextActivity,
  showEmoji = true,
  emojiPinned = false,
  onEmojiPinnedChange,
  emojiInsertRef,
  onUpload,
}: ComposerViewProps) => {
  const theme = useTalkentryTheme();
  const strings = chatStrings[locale];
  const [text, setText] = useState(initialText);
  const [hover, setHover] = useState(false);
  const [popoverReady, setPopoverReady] = useState(false);
  const { pending, setPending, uploading, canAttach, addFiles } = useComposerAttachments({
    onUpload,
    onError,
    disabled,
  });
  const field = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastFocusKey = useRef(0);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useLayoutEffect(() => {
    fitComposerHeight(field.current);
  }, [text]);

  useEffect(() => {
    if (!composerFocusKey || composerFocusKey === lastFocusKey.current) {
      return;
    }
    lastFocusKey.current = composerFocusKey;
    field.current?.focus();
  }, [composerFocusKey]);

  useEffect(() => {
    if (!showEmoji) {
      return;
    }

    if (typeof requestIdleCallback === 'function') {
      const idle = requestIdleCallback(() => setPopoverReady(true));

      return () => cancelIdleCallback(idle);
    }

    if (typeof requestAnimationFrame !== 'function') {
      return;
    }

    const frame = requestAnimationFrame(() => setPopoverReady(true));

    return () => cancelAnimationFrame(frame);
  }, [showEmoji]);

  const trimmed = text.trim();
  const canSend = !disabled && uploading === 0 && (trimmed.length > 0 || pending.length > 0);
  const popoverVisible = showEmoji && hover && !emojiPinned;
  const showPopover = showEmoji && popoverReady && !emojiPinned;

  const showHover = () => {
    if (emojiPinned) {
      return;
    }
    setPopoverReady(true);
    setHover(true);
  };

  const insertEmoji = (emoji: string) => {
    const el = field.current;
    const current = el?.value ?? text;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
    setText(next);
    onTextActivity?.(next.trim().length > 0);

    const caret = start + emoji.length;
    const placeCaret = () => {
      if (!el) {
        return;
      }
      el.focus();
      el.setSelectionRange(caret, caret);
      fitComposerHeight(el);
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(placeCaret);
    } else {
      placeCaret();
    }
  };

  if (emojiInsertRef) {
    emojiInsertRef.current = insertEmoji;
  }

  const onPickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;

    if (files?.length) {
      addFiles(files).catch(() => undefined);
    }

    event.currentTarget.value = '';
  };

  const submit = async () => {
    if (!canSend) {
      return;
    }

    const includeAttachments = Boolean(onUpload) && pending.length > 0;
    const payload = {
      text: trimmed,
      ...(includeAttachments ? { attachments: pending } : {}),
    };
    const sentText = text;
    const sentPending = includeAttachments ? pending : [];

    setText('');
    if (includeAttachments) {
      setPending([]);
    }
    onTextActivity?.(false);

    try {
      await onSend(payload);
    } catch (error) {
      setText((current) => (current === '' ? sentText : current));
      if (includeAttachments) {
        setPending((current) => (current.length === 0 ? sentPending : current));
      }
      onError?.(error instanceof Error ? error : new Error('Could not send. Try again.'));
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit().catch(() => undefined);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }
    event.preventDefault();
    submit().catch(() => undefined);
  };

  return (
    <form
      aria-label={strings.input}
      onSubmit={onSubmit}
      style={{
        ...styles.form,
        borderTopColor: theme.colors.border,
        background: theme.colors.surface,
      }}
    >
      {banner ? (
        <div
          style={{
            ...styles.banner,
            background: theme.colors.inputBackground,
            borderLeftColor: theme.colors.accent,
          }}
        >
          <div>
            <div style={{ ...styles.bannerTitle, color: theme.colors.accent }}>{banner.title}</div>
            {banner.preview ? (
              <div style={{ ...styles.bannerPreview, color: theme.colors.textMuted }}>
                {banner.preview}
              </div>
            ) : null}
          </div>
          {onClearDraft ? (
            <button
              type="button"
              onClick={onClearDraft}
              style={{ ...styles.cancel, color: theme.colors.textMuted }}
            >
              {strings.cancel}
            </button>
          ) : null}
        </div>
      ) : null}
      {uploading > 0 ? (
        <div style={{ ...styles.uploading, color: theme.colors.textMuted }}>
          {strings.uploading}
        </div>
      ) : null}
      <ComposerAttachmentStrip
        locale={locale}
        attachments={pending}
        onRemove={(id) => setPending((items) => items.filter((item) => item.id !== id))}
      />
      <div style={styles.row}>
        {onUpload ? (
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              disabled={!canAttach}
              aria-hidden
              tabIndex={-1}
              onChange={onPickFiles}
              style={styles.fileInput}
            />
            <button
              type="button"
              disabled={!canAttach}
              aria-label={strings.attachLabel}
              onClick={() => fileInput.current?.click()}
              style={{ ...styles.attach, color: theme.colors.textMuted }}
            >
              <AttachIcon />
            </button>
          </>
        ) : null}
        <textarea
          ref={field}
          aria-label={strings.input}
          placeholder={placeholder ?? strings.placeholder}
          disabled={disabled}
          value={text}
          rows={1}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            onTextActivity?.(next.trim().length > 0);
            fitComposerHeight(event.currentTarget);
          }}
          onKeyDown={onKeyDown}
          style={{
            ...styles.field,
            borderColor: theme.colors.border,
            background: theme.colors.inputBackground,
            color: theme.colors.text,
          }}
        />
        {showEmoji ? (
          <div
            role="group"
            aria-label={strings.emoji}
            onMouseEnter={showHover}
            onMouseLeave={() => setHover(false)}
            style={styles.emojiWrap}
          >
            <button
              type="button"
              aria-label={strings.emojiLabel}
              aria-pressed={emojiPinned}
              aria-expanded={emojiPinned}
              onClick={() => {
                setHover(false);
                onEmojiPinnedChange?.(!emojiPinned);
              }}
              style={styles.emoji}
            >
              😊
            </button>
            {showPopover ? (
              <div
                aria-hidden={!popoverVisible}
                style={popoverVisible ? styles.popover : styles.popoverHidden}
              >
                <EmojiPanel
                  variant={EmojiPanelVariant.Popover}
                  height={EMOJI_POPOVER_HEIGHT}
                  onPick={insertEmoji}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={!canSend}
          aria-label={submitAccessibilityLabel ?? strings.sendLabel}
          style={{
            ...styles.send,
            background: theme.colors.accent,
            color: theme.colors.textOnAccent,
          }}
        >
          {submitLabel ?? strings.send}
        </button>
      </div>
    </form>
  );
};
