import type { Attachment } from '@talkentry/core';

import { useComposerAttachments } from '../../../src/ui/composer/useComposerAttachments';
import { act, render } from '../../support/renderer';

const file = (name = 'file', size = 1) => ({ name, size }) as File;
const attachment: Attachment = { id: 'uploaded', type: 'file', url: '/uploaded' };

describe('composer attachment lifecycle', () => {
  it('keeps the budget current across sequential batches using a stale callback', async () => {
    const onUpload = jest.fn(async () => attachment);
    let state!: ReturnType<typeof useComposerAttachments>;
    const Host = () => {
      state = useComposerAttachments({ onUpload });
      return null;
    };
    await render(<Host />);
    const add = state.addFiles;
    await act(async () => {
      await add(Array.from({ length: 8 }, () => file()));
      await add([file()]);
    });
    expect(onUpload).toHaveBeenCalledTimes(8);
    expect(state.pending).toHaveLength(8);
  });

  it('does not start overlapping uploads before React renders the busy state', async () => {
    let resolve!: (value: Attachment) => void;
    const onUpload = jest.fn(
      () =>
        new Promise<Attachment>((done) => {
          resolve = done;
        }),
    );
    let state!: ReturnType<typeof useComposerAttachments>;
    const Host = () => {
      state = useComposerAttachments({ onUpload });
      return null;
    };
    await render(<Host />);
    await act(async () => {
      const first = state.addFiles([file('first')]);
      await state.addFiles([file('second')]);
      resolve(attachment);
      await first;
    });
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(state.pending).toEqual([attachment]);
    expect(state.uploading).toBe(0);
  });

  it('drops a late rejection after unmount instead of calling the old error handler', async () => {
    let reject!: (error: Error) => void;
    const onUpload = jest.fn(
      () =>
        new Promise<Attachment>((_resolve, fail) => {
          reject = fail;
        }),
    );
    const onError = jest.fn();
    let state!: ReturnType<typeof useComposerAttachments>;
    const Host = () => {
      state = useComposerAttachments({ onUpload, onError });
      return null;
    };
    const tree = await render(<Host />);
    let task!: Promise<void>;
    await act(async () => {
      task = state.addFiles([file()]);
    });
    await act(async () => {
      tree.unmount();
    });
    await act(async () => {
      reject(new Error('late'));
      await task;
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('rejects oversized files without transport and continues with valid files', async () => {
    const onUpload = jest.fn(async () => attachment);
    const onError = jest.fn();
    let state!: ReturnType<typeof useComposerAttachments>;
    const Host = () => {
      state = useComposerAttachments({ onUpload, onError });
      return null;
    };
    await render(<Host />);
    await act(async () => {
      await state.addFiles([file('huge', 6 * 1024 * 1024), file()]);
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(state.pending).toEqual([attachment]);
  });

  it('enforces the attachment budget and ignores disabled input', async () => {
    const onUpload = jest.fn(async () => attachment);
    let state!: ReturnType<typeof useComposerAttachments>;
    const Host = ({ disabled = false }: { disabled?: boolean }) => {
      state = useComposerAttachments({ onUpload, disabled });
      return null;
    };
    const tree = await render(<Host disabled />);
    await act(async () => {
      await state.addFiles([file()]);
    });
    expect(onUpload).not.toHaveBeenCalled();
    await act(async () => {
      tree.update(<Host />);
    });
    await act(async () => {
      await state.addFiles(Array.from({ length: 10 }, () => file()));
    });
    expect(onUpload).toHaveBeenCalledTimes(8);
    await act(async () => {
      await state.addFiles([file()]);
    });
    expect(onUpload).toHaveBeenCalledTimes(8);
  });
});
