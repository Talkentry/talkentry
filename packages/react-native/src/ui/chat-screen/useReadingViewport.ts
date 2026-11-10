import { useCallback, useEffect, useRef, useState } from 'react';

/** Pause read dwell while keyboard/emoji translation is moving. Per-frame
 * measurements update refs only; React renders at transition start and settle. */
export const useReadingViewport = () => {
  const [state, setState] = useState({ active: true, topInset: 0 });
  const current = useRef(state);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Stable JS target is required by scheduleOnRN from the UI-thread reaction.
  const onLiftChanged = useCallback((topInset: number) => {
    if (!alive.current || (current.current.active && current.current.topInset === topInset)) {
      return;
    }
    clearTimeout(timer.current);
    if (current.current.active) {
      setState({ ...current.current, active: false });
    }
    current.current = { active: false, topInset };
    timer.current = setTimeout(() => {
      if (!alive.current) {
        return;
      }
      current.current = { ...current.current, active: true };
      setState(current.current);
    }, 100);
  }, []);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  return { ...state, onLiftChanged };
};
