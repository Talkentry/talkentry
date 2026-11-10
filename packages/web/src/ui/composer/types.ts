import type { Attachment, MessageId } from '@talkentry/core';
import type { MutableRefObject } from 'react';

import type { ChatLocale } from '../shared/strings';

export const ComposerDraftType = {
  Reply: 'reply',
  Edit: 'edit',
} as const;

export type ComposerDraftType = (typeof ComposerDraftType)[keyof typeof ComposerDraftType];

export type ComposerDraft =
  | { readonly type: typeof ComposerDraftType.Reply; readonly messageId: MessageId }
  | {
      readonly type: typeof ComposerDraftType.Edit;
      readonly messageId: MessageId;
      readonly text: string;
    };

export type ComposerSendPayload = {
  readonly text: string;
  readonly attachments?: readonly Attachment[];
};

export type DraftBanner = {
  readonly title: string;
  readonly preview?: string;
};

export type ComposerProps = {
  readonly locale?: ChatLocale;
  readonly onError?: (error: Error) => void;
  readonly onSend?: (payload: ComposerSendPayload) => void | Promise<void>;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly draft?: ComposerDraft | null;
  readonly onClearDraft?: () => void;
  readonly composerFocusKey?: number;
  /** Built-in emoji control. `false` hides the composer button. */
  readonly showEmoji?: boolean;
  /** Chat pins the right-hand emoji sidebar. Hides the hover popover. */
  readonly emojiPinned?: boolean;
  /** Fired when the composer emoji button is clicked. */
  readonly onEmojiPinnedChange?: (pinned: boolean) => void;
  /** Chat inserts glyphs from the sidebar into the same draft. */
  readonly emojiInsertRef?: MutableRefObject<((emoji: string) => void) | null>;
  /** Upload a picked file before send. Hidden when omitted. */
  readonly onUpload?: (file: File) => Promise<Attachment>;
};

export type ComposerViewProps = {
  readonly locale?: ChatLocale;
  readonly onError?: (error: Error) => void;
  readonly onSend: (payload: ComposerSendPayload) => void | Promise<void>;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly banner?: DraftBanner | null;
  readonly onClearDraft?: () => void;
  readonly composerFocusKey?: number;
  readonly submitLabel?: string;
  readonly submitAccessibilityLabel?: string;
  readonly initialText?: string;
  readonly onTextActivity?: (active: boolean) => void;
  readonly showEmoji?: boolean;
  readonly emojiPinned?: boolean;
  readonly onEmojiPinnedChange?: (pinned: boolean) => void;
  readonly emojiInsertRef?: MutableRefObject<((emoji: string) => void) | null>;
  readonly onUpload?: (file: File) => Promise<Attachment>;
};
