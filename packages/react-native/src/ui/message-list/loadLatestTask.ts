/** A host callback may ignore AbortSignal. Do not keep navigation pending forever. */
export const loadLatestTask = async (
  load: ((signal: AbortSignal) => Promise<boolean>) | undefined,
  controller: AbortController,
): Promise<boolean> => {
  if (!load || controller.signal.aborted) {
    return false;
  }

  let onAbort = () => {};
  const cancelled = new Promise<boolean>((resolve) => {
    onAbort = () => resolve(false);
    controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    return await Promise.race([
      Promise.resolve().then(() => (controller.signal.aborted ? false : load(controller.signal))),
      cancelled,
    ]);
  } finally {
    clearTimeout(timeout);
    controller.signal.removeEventListener('abort', onAbort);
  }
};
