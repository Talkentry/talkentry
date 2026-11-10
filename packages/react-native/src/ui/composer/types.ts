import type { Attachment, MessageId } from '@talkentry/core';

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

/** Reply/edit strip above the input. */
export type DraftBanner = {
  readonly title: string;
  readonly preview?: string;
};

/**
 * Host emoji/sticker picker result: string appends to draft text;
 * Attachment(s) join pending media (stickers as image/custom).
 */
export type ComposerEmojiPick = string | Attachment | readonly Attachment[];

export type ComposerProps = {
  readonly locale?: ChatLocale;
  readonly onError?: (error: Error) => void;
  /**
   * Controlled send handler. When omitted, uses TalkentryProvider + useSendMessage.
   */
  readonly onSend?: (payload: ComposerSendPayload) => void | Promise<void>;
  /**
   * Host/demo picker (+ optional upload). Built-in Chat wires this for media.
   * Returning null/undefined cancels; arrays are concatenated up to 8 items.
   */
  readonly onAttach?: () => Promise<Attachment | readonly Attachment[] | null | undefined>;
  /**
   * Built-in Unicode emoji panel. `false` hides the button and the sheet.
   * Defaults to on. Ignored when `onPickEmoji` replaces the panel with a host picker.
   */
  readonly showEmoji?: boolean;
  /**
   * Host emoji keyboard / sticker panel. Replaces the built-in sheet.
   * Cancel with null/undefined.
   */
  readonly onPickEmoji?: () => Promise<ComposerEmojiPick | null | undefined>;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /**
   * Extra bottom padding under the composer row. Defaults to the system
   * navigation inset while the keyboard is hidden, and `0` while it is open.
   * Pass an explicit number when the host already owns bottom safe-area.
   */
  readonly bottomInset?: number;
  readonly draft?: ComposerDraft | null;
  readonly onClearDraft?: () => void;
  /**
   * Chat bumps this when a reply starts, not when the quoted message is swapped.
   * The composer focuses the field so the software keyboard opens.
   */
  readonly composerFocusKey?: number;
};

export type ComposerViewProps = {
  readonly locale?: ChatLocale;
  readonly onError?: (error: Error) => void;
  readonly onSend: (payload: ComposerSendPayload) => void | Promise<void>;
  readonly onAttach?: () => Promise<Attachment | readonly Attachment[] | null | undefined>;
  readonly showEmoji?: boolean;
  readonly onPickEmoji?: () => Promise<ComposerEmojiPick | null | undefined>;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly bottomInset?: number;
  readonly banner?: DraftBanner | null;

  readonly onClearDraft?: () => void;
  /**
   * Chat bumps this when a reply starts, not when the quoted message is swapped.
   * The composer focuses the field so the software keyboard opens.
   */
  readonly composerFocusKey?: number;
  readonly submitLabel?: string;
  readonly submitAccessibilityLabel?: string;
  readonly initialText?: string;
  readonly allowAttachments?: boolean;
  /** Fired when draft text presence changes (for typing indicators). */
  readonly onTextActivity?: (active: boolean) => void;
};

export const ComposerErrorKind = {
  Send: 'send',
  Attach: 'attach',
  Emoji: 'emoji',
} as const;

export type ComposerErrorKind = (typeof ComposerErrorKind)[keyof typeof ComposerErrorKind];
