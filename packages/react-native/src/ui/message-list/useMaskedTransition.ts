import { useEffect, useRef, useState } from 'react';

export type MaskPhase = 'covering' | 'relocating' | 'preparing' | 'revealing';
export type MaskState = { readonly id: number; readonly phase: MaskPhase } | null;

/** Bounded visual lifecycle attached to the coordinator ID, never a scroll controller. */
export const useMaskedTransition = (resume: () => void) => {
  const [state, setState] = useState<MaskState>(null);
  const current = useRef<MaskState>(null);
  const completed = useRef<number | null>(null);
  const prepared = useRef(false);
  const continuation = useRef(resume);
  continuation.current = resume;
  const waiting = useRef<(() => void) | null>(null);
  const publish = (next: MaskState) => {
    current.current = next;
    setState(next);
  };
  const cancel = () => {
    if (current.current) {
      completed.current = current.current.id;
    }
    publish(null);
    waiting.current?.();
    waiting.current = null;
  };
  const ensure = (id: number): boolean => {
    if (completed.current === id) {
      return false;
    }
    if (current.current?.id !== id) {
      prepared.current = false;
      publish({ id, phase: 'covering' });
    }

    return true;
  };
  const waitCovered = async (id: number, signal: AbortSignal): Promise<void> => {
    if (current.current?.id !== id || current.current.phase !== 'covering' || signal.aborted) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        if (waiting.current === finish) {
          waiting.current = null;
        }
        resolve();
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', finish);
        if (waiting.current === finish) {
          waiting.current = null;
        }
        reject(new Error('Mask did not commit'));
      }, 1000);
      waiting.current = finish;
      signal.addEventListener('abort', finish, { once: true });
    });
  };

  useEffect(
    () => () => {
      waiting.current?.();
      waiting.current = null;
    },
    [],
  );
  useEffect(() => {
    if (state?.phase === 'relocating') {
      continuation.current();
    }
  }, [state]);

  return {
    state,
    getState: () => current.current,
    ensure,
    waitCovered,
    cancel,
    covered: (id: number) => {
      if (current.current?.id !== id || current.current.phase !== 'covering') {
        return;
      }
      publish({ id, phase: 'relocating' });
      waiting.current?.();
    },
    reached: (id: number): boolean => {
      const mask = current.current;
      if (!mask || mask.id !== id) {
        return false;
      }
      if (mask.phase === 'relocating') {
        prepared.current = false;
        publish({ id, phase: 'preparing' });
      } else if (mask.phase === 'preparing' && prepared.current) {
        publish({ id, phase: 'revealing' });
      }

      return true;
    },
    realCommit: (snapshot: MaskState) => {
      if (
        snapshot?.phase === 'preparing' &&
        current.current?.id === snapshot.id &&
        current.current.phase === 'preparing'
      ) {
        prepared.current = true;
      }
    },
    finished: (id: number) => {
      if (current.current?.id !== id || current.current.phase !== 'revealing') {
        return;
      }
      completed.current = id;
      publish(null);
      continuation.current();
    },
  };
};
