import type { Message, User } from '@talkentry/core';

import type { ComposerProps } from '../composer/types';
import type { ChatSlots } from '../shared/slots';
import type { ChatLocale } from '../shared/strings';

export type ChatProps = {
  readonly locale?: ChatLocale;
  /** Host-owned user directory for display names, avatars, and typing labels. */
  readonly users?: Readonly<Record<string, User>>;
  /** Built-in jump-to-latest control. `false` hides it. */
  readonly showScrollToLatest?: boolean;
  /** Sequence-hole label in the list. The hole stays in timeline state. */
  readonly showGapMarkers?: boolean;
  readonly showEmoji?: boolean;
  readonly composerProps?: Omit<
    ComposerProps,
    | 'draft'
    | 'onClearDraft'
    | 'composerFocusKey'
    | 'showEmoji'
    | 'emojiPinned'
    | 'onEmojiPinnedChange'
    | 'emojiInsertRef'
  >;
  /** Host clipboard. Defaults to `navigator.clipboard` when omitted. */
  readonly onCopy?: (message: Message) => void;
  /** Host forwards the message into another chat. Hidden when omitted. */
  readonly onForward?: (message: Message) => void;
} & ChatSlots;
