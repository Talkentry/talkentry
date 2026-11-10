export const aborted = (): Error => new Error('Operation cancelled');

/** Even an adapter that ignores signal cannot hold a session request forever. */
export const abortable = <T>(task: Promise<T>, signal: AbortSignal): Promise<T> =>
  new Promise((resolve, reject) => {
    const cancel = () => reject(aborted());

    if (signal.aborted) {
      task.catch(() => undefined);
      reject(aborted());

      return;
    }

    signal.addEventListener('abort', cancel, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
