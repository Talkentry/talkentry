import { type ReactElement, useRef } from 'react';

import { useMessage, useSendMessage } from '../../../react/hooks';
import { chatStrings } from '../../shared/strings';
import { ComposerDraftType, type ComposerProps } from '../types';
import { ComposerView } from '../view/ComposerView';
import { draftBanner } from './draftBanner';
import { type SendAttempt, submitThroughSession } from './submitThroughSession';

/**
 * Session-backed composer (no host `onSend`).
 *
 * Wires TalkentryProvider → dumb ComposerView:
 * - send / edit / reply / thread
 * - stable localId across retries
 * - typing indicator
 * - reply/edit banner copy from the message store
 */
export const ComposerConnected = ({
  placeholder,
  disabled,
  bottomInset,
  locale = 'en',
  onError,
  draft,
  onClearDraft,
  onAttach,
  showEmoji,
  onPickEmoji,
  composerFocusKey,
}: Omit<ComposerProps, 'onSend'>): ReactElement => {
  const { sendMessage, editMessage, getThreadId, setTyping } = useSendMessage();
  const attempt = useRef<SendAttempt | null>(null);
  const editing = draft?.type === ComposerDraftType.Edit;
  const strings = chatStrings[locale];

  // Target message for the reply/edit strip (placeholder id when no draft).
  const target = useMessage(draft?.messageId ?? '__composer_no_draft__');
  const banner = draft ? draftBanner(draft, target, locale) : null;

  return (
    <ComposerView
      placeholder={placeholder}
      disabled={disabled}
      bottomInset={bottomInset}
      locale={locale}
      onError={onError}
      banner={banner}
      onClearDraft={onClearDraft}
      onAttach={onAttach}
      showEmoji={showEmoji}
      onPickEmoji={onPickEmoji}
      composerFocusKey={composerFocusKey}
      allowAttachments={!editing}
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
