import type { Attachment } from '@talkentry/core';
import { type ReactElement, useRef } from 'react';

import { useTalkentrySession } from '../../react/context';
import { useMessage, useSendMessage } from '../../react/hooks';
import { chatStrings } from '../shared/strings';
import { ComposerView } from './ComposerView';
import { draftBanner } from './draftBanner';
import { type SendAttempt, submitThroughSession } from './submitThroughSession';
import { ComposerDraftType, type ComposerProps } from './types';

export const ComposerConnected = ({
  placeholder,
  disabled,
  locale = 'en',
  onError,
  draft,
  onClearDraft,
  composerFocusKey,
  showEmoji,
  emojiPinned,
  onEmojiPinnedChange,
  emojiInsertRef,
  onUpload,
}: Omit<ComposerProps, 'onSend'>): ReactElement => {
  const session = useTalkentrySession();
  const { sendMessage, editMessage, getThreadId, setTyping } = useSendMessage();
  const attempt = useRef<SendAttempt | null>(null);
  const editing = draft?.type === ComposerDraftType.Edit;
  const strings = chatStrings[locale];
  const target = useMessage(draft?.messageId ?? '__composer_no_draft__');
  const banner = draft ? draftBanner(draft, target, locale) : null;
  const upload = session.options.adapter.uploadAttachment;
  const canUpload =
    !editing &&
    (Boolean(onUpload) ||
      (session.options.adapter.capabilities.uploadAttachment && typeof upload === 'function'));

  const uploadFile = async (file: File): Promise<Attachment> => {
    if (onUpload) {
      return onUpload(file);
    }
    if (!upload) {
      throw new Error('Could not upload. Try again.');
    }

    const uri = URL.createObjectURL(file);

    try {
      return await upload({
        uri,
        name: file.name,
        mimeType: file.type || undefined,
      });
    } finally {
      URL.revokeObjectURL(uri);
    }
  };

  return (
    <ComposerView
      placeholder={placeholder}
      disabled={disabled}
      locale={locale}
      onError={onError}
      banner={banner}
      onClearDraft={onClearDraft}
      composerFocusKey={composerFocusKey}
      showEmoji={showEmoji}
      emojiPinned={emojiPinned}
      onEmojiPinnedChange={onEmojiPinnedChange}
      emojiInsertRef={emojiInsertRef}
      onUpload={canUpload ? uploadFile : undefined}
      submitLabel={editing ? strings.save : undefined}
      submitAccessibilityLabel={editing ? strings.saveLabel : undefined}
      initialText={editing ? draft.text : ''}
      onTextActivity={(active) => {
        if (!editing) {
          setTyping(active).catch(() => undefined);
        }
      }}
      onSend={async (payload) => {
        attempt.current = await submitThroughSession({
          api: { sendMessage, editMessage, getThreadId },
          draft,
          payload,
          attempt: attempt.current,
          onClearDraft,
        });
      }}
    />
  );
};
