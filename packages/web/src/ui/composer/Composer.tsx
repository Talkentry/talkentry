import type { ReactElement } from 'react';

import { ComposerConnected } from './ComposerConnected';
import { ComposerView } from './ComposerView';
import type { ComposerProps } from './types';

export type { ComposerDraft, ComposerProps, ComposerSendPayload } from './types';
export { ComposerDraftType } from './types';

export const Composer = ({
  onSend,
  placeholder,
  disabled,
  locale,
  onError,
  draft,
  onClearDraft,
  composerFocusKey,
  showEmoji,
  emojiPinned,
  onEmojiPinnedChange,
  emojiInsertRef,
  onUpload,
}: ComposerProps): ReactElement => {
  if (onSend) {
    return (
      <ComposerView
        onSend={onSend}
        placeholder={placeholder}
        disabled={disabled}
        locale={locale}
        onError={onError}
        onClearDraft={onClearDraft}
        composerFocusKey={composerFocusKey}
        showEmoji={showEmoji}
        emojiPinned={emojiPinned}
        onEmojiPinnedChange={onEmojiPinnedChange}
        emojiInsertRef={emojiInsertRef}
        onUpload={onUpload}
      />
    );
  }

  return (
    <ComposerConnected
      placeholder={placeholder}
      disabled={disabled}
      locale={locale}
      onError={onError}
      draft={draft}
      onClearDraft={onClearDraft}
      composerFocusKey={composerFocusKey}
      showEmoji={showEmoji}
      emojiPinned={emojiPinned}
      onEmojiPinnedChange={onEmojiPinnedChange}
      emojiInsertRef={emojiInsertRef}
      onUpload={onUpload}
    />
  );
};
