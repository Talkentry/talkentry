import { useEffect, useRef, useState } from 'react';

import { ComposerErrorKind, type ComposerViewProps } from '../types';

const failureMessages: Record<ComposerErrorKind, string> = {
  [ComposerErrorKind.Attach]: 'Attachment could not be added',
  [ComposerErrorKind.Emoji]: 'Emoji could not be added',
  [ComposerErrorKind.Send]: 'Message could not be sent',
};

/** Serializes all async composer work, including presses before React commits. */
export const useComposerOperation = (disabled: boolean, onError: ComposerViewProps['onError']) => {
  const [active, setActive] = useState<ComposerErrorKind | null>(null);
  const [error, setError] = useState<ComposerErrorKind | null>(null);
  const running = useRef(false);
  const mounted = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      running.current = false;
    };
  }, []);

  const run = async (
    kind: ComposerErrorKind,
    action: (isCurrent: () => boolean) => Promise<void>,
  ): Promise<void> => {
    if (disabled || running.current || !mounted.current) {
      return;
    }
    running.current = true;
    const request = ++generation.current;
    const isCurrent = () => mounted.current && generation.current === request;
    setActive(kind);
    setError(null);

    try {
      await action(isCurrent);
    } catch {
      if (isCurrent()) {
        setError(kind);
        onError?.(new Error(failureMessages[kind]));
      }
    } finally {
      if (isCurrent()) {
        running.current = false;
        setActive(null);
      }
    }
  };

  return {
    run,
    error,
    busy: active !== null,
    sending: active === ComposerErrorKind.Send,
    attaching: active === ComposerErrorKind.Attach,
    pickingEmoji: active === ComposerErrorKind.Emoji,
  };
};

export type ComposerOperation = ReturnType<typeof useComposerOperation>;
