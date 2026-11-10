import type { Attachment } from '@talkentry/core';

import { type ComposerDraft, ComposerDraftType, type ComposerSendPayload } from './types';

export type SessionSubmitApi = {
  readonly sendMessage: (input: {
    readonly text?: string;
    readonly localId: string;
    readonly attachments?: readonly Attachment[];
    readonly replyToId?: string;
    readonly threadId?: string;
  }) => Promise<unknown>;
  readonly editMessage: (messageId: string, text: string) => Promise<unknown>;
  readonly getThreadId: () => string | null;
};

export type SendAttempt = {
  readonly text: string;
  readonly attachmentsKey: string;
  readonly id: string;
};

export const attachmentIdsKey = (attachments: readonly Attachment[] | undefined): string =>
  (attachments ?? []).map((item) => item.id).join(',');

export const nextSendAttempt = (
  previous: SendAttempt | null,
  text: string,
  attachments: readonly Attachment[] | undefined,
): SendAttempt => {
  const attachmentsKey = attachmentIdsKey(attachments);

  if (previous?.text === text && previous.attachmentsKey === attachmentsKey) {
    return previous;
  }

  return {
    text,
    attachmentsKey,
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
};

export const submitThroughSession = async (args: {
  readonly api: SessionSubmitApi;
  readonly draft: ComposerDraft | null | undefined;
  readonly payload: ComposerSendPayload;
  readonly attempt: SendAttempt | null;
  readonly onClearDraft?: () => void;
}): Promise<SendAttempt | null> => {
  const { api, draft, payload, onClearDraft } = args;
  const editing = draft?.type === ComposerDraftType.Edit;

  if (editing && draft) {
    await api.editMessage(draft.messageId, payload.text);
    onClearDraft?.();

    return null;
  }

  const attempt = nextSendAttempt(args.attempt, payload.text, payload.attachments);
  const activeThreadId = api.getThreadId();

  await api.sendMessage({
    text: payload.text || undefined,
    localId: attempt.id,
    ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
    ...(draft?.type === ComposerDraftType.Reply ? { replyToId: draft.messageId } : {}),
    ...(activeThreadId ? { threadId: activeThreadId } : {}),
  });
  onClearDraft?.();

  return null;
};
