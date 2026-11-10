import { abortable, aborted } from '../abort';
import { isSessionActive, type SessionHandle } from '../session-handle';

/** Own one command deadline and its session generation, without owning its commit policy. */
export const createMutationRequest = (session: SessionHandle) => {
  const epoch = session.epoch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), session.timeoutMs);
  const isCurrent = () => isSessionActive(session) && session.epoch === epoch;

  return {
    signal: controller.signal,
    isCurrent,
    run: <T>(task: Promise<T>): Promise<T> => abortable(task, controller.signal),
    // Check at the commit site, not inside another async continuation.
    assertCurrent: (): void => {
      if (!isCurrent()) {
        throw aborted();
      }
    },
    dispose: (): void => clearTimeout(timer),
  };
};
