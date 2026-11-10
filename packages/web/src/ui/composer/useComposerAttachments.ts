import type { Attachment } from '@talkentry/core';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ComposerViewProps } from './types';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_PENDING_ATTACHMENTS = 8;

type Options = Pick<ComposerViewProps, 'onUpload' | 'onError' | 'disabled'>;

/** Upload results belong to the mounted composer, not a stale async callback. */
export const useComposerAttachments = ({ onUpload, onError, disabled }: Options) => {
  const [pending, setPendingState] = useState<Attachment[]>([]);
  const pendingRef = useRef<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const owner = useRef(0);
  const busy = useRef(false);
  // The budget must be current even before React commits a completed batch.
  const setPending = useCallback<Dispatch<SetStateAction<Attachment[]>>>((next) => {
    const value = typeof next === 'function' ? next(pendingRef.current) : next;
    pendingRef.current = value;
    setPendingState(value);
  }, []);

  useEffect(() => {
    owner.current += 1;
    busy.current = false;

    return () => {
      owner.current += 1;
      busy.current = false;
    };
  }, []);

  const canAttach = Boolean(onUpload) && !disabled && uploading === 0;
  const addFiles = async (list: FileList | readonly File[]) => {
    if (!onUpload || !canAttach || busy.current) {
      return;
    }

    const files = Array.from(list).slice(
      0,
      Math.max(0, MAX_PENDING_ATTACHMENTS - pendingRef.current.length),
    );
    if (list.length > files.length) {
      onError?.(new Error(`You can attach up to ${MAX_PENDING_ATTACHMENTS} files.`));
    }
    const epoch = owner.current;
    busy.current = true;
    setUploading(files.length);

    try {
      for (const file of files) {
        if (owner.current !== epoch) {
          return;
        }
        try {
          if (file.size > MAX_UPLOAD_BYTES) {
            throw new Error('File is too large (max 5 MB).');
          }
          const attachment = await onUpload(file);
          if (owner.current !== epoch) {
            return;
          }
          setPending((current) => [...current, attachment]);
        } catch (error) {
          if (owner.current === epoch) {
            onError?.(error instanceof Error ? error : new Error('Could not upload. Try again.'));
          }
        }
      }
    } finally {
      if (owner.current === epoch) {
        busy.current = false;
        setUploading(0);
      }
    }
  };

  return { pending, setPending, uploading, canAttach, addFiles };
};
