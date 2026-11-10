import { useEffect, useRef } from 'react';

const TYPING_IDLE_MS = 2500;

/**
 * Debounced text-presence → typing indicator callback.
 * View owns the timer; Connected/host wires `onTextActivity` to the session.
 */
export const useComposerTyping = (onTextActivity?: (active: boolean) => void) => {
  const typingActive = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onTextActivityRef = useRef(onTextActivity);
  onTextActivityRef.current = onTextActivity;

  const stopTyping = () => {
    if (typingTimer.current !== undefined) {
      clearTimeout(typingTimer.current);
      typingTimer.current = undefined;
    }

    if (typingActive.current) {
      typingActive.current = false;
      onTextActivityRef.current?.(false);
    }
  };

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, []);

  const noteTextActivity = (value: string) => {
    if (!onTextActivityRef.current) {
      return;
    }

    const active = value.trim().length > 0;

    if (!active) {
      stopTyping();

      return;
    }

    if (!typingActive.current) {
      typingActive.current = true;
      onTextActivityRef.current(true);
    }

    if (typingTimer.current !== undefined) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      typingTimer.current = undefined;

      if (typingActive.current) {
        typingActive.current = false;
        onTextActivityRef.current?.(false);
      }
    }, TYPING_IDLE_MS);
  };

  return { noteTextActivity, stopTyping };
};
