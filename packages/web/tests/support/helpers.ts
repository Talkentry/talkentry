import type { Attachment, ChatAdapter, UploadAttachmentCommand } from '@talkentry/core';
import { mockAdapter as createMockAdapter } from '@test/chat-fixtures';

export { deferred, flush, message, page } from '@test/chat-fixtures';

/** Browser tests opt into uploads and reactions without changing the core fixture defaults. */
export const mockAdapter = () => {
  const base = createMockAdapter();
  const uploadAttachment = jest.fn(
    async (command: UploadAttachmentCommand): Promise<Attachment> => ({
      id: `att-${command.name ?? 'file'}`,
      type: command.mimeType?.startsWith('image/') ? 'image' : 'file',
      url: `/uploads/${command.name ?? 'file'}`,
      name: command.name,
      mimeType: command.mimeType,
    }),
  );
  const adapter: ChatAdapter = {
    ...base.adapter,
    capabilities: { ...base.adapter.capabilities, uploadAttachment: true, reactions: true },
    uploadAttachment,
  };

  return { ...base, uploadAttachment, adapter };
};
