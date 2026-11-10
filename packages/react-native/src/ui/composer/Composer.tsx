import type { ReactElement } from 'react';

import { ComposerConnected } from './connected/ComposerConnected';
import type { ComposerProps } from './types';
import { ComposerView } from './view/ComposerView';

export type { ComposerDraft, ComposerEmojiPick, ComposerProps, ComposerSendPayload } from './types';
export { ComposerDraftType } from './types';

/**
 * Public composer entry.
 *
 * - `onSend` set → controlled/dumb UI only (`view/ComposerView`)
 * - `onSend` omitted inside TalkentryProvider → `connected/` (session send/edit)
 */
export const Composer = ({
  onSend,
  onAttach,
  showEmoji,
  onPickEmoji,
  placeholder,
  disabled,
  bottomInset,
  locale,
  onError,
  draft,
  onClearDraft,
  composerFocusKey,
}: ComposerProps): ReactElement => {
  if (onSend) {
    return (
      <ComposerView
        onSend={onSend}
        onAttach={onAttach}
        showEmoji={showEmoji}
        onPickEmoji={onPickEmoji}
        placeholder={placeholder}
        disabled={disabled}
        bottomInset={bottomInset}
        locale={locale}
        onError={onError}
        onClearDraft={onClearDraft}
        composerFocusKey={composerFocusKey}
      />
    );
  }

  return (
    <ComposerConnected
      placeholder={placeholder}
      disabled={disabled}
      bottomInset={bottomInset}
      locale={locale}
      onError={onError}
      draft={draft}
      onClearDraft={onClearDraft}
      onAttach={onAttach}
      showEmoji={showEmoji}
      onPickEmoji={onPickEmoji}
      composerFocusKey={composerFocusKey}
    />
  );
};
