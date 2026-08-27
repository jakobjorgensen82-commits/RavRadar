export function createPublicPageResumeHandler({
  isCoreReady,
  isDetailsReady,
  waitForDetails,
  resume,
  reload,
  timeoutMs = 2000,
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = timer => globalThis.clearTimeout(timer)
}) {
  let activeResume = null;

  const waitForDetailsOrTimeout = async () => {
    let timer = null;
    try {
      await Promise.race([
        Promise.resolve().then(waitForDetails).catch(() => null),
        new Promise(resolve => { timer = setTimer(resolve, timeoutMs); })
      ]);
    } finally {
      if (timer !== null) clearTimer(timer);
    }
  };

  return event => {
    if (!event?.persisted) return Promise.resolve('ignored');
    if (activeResume) return activeResume;

    activeResume = (async () => {
      if (!isCoreReady()) {
        reload();
        return 'reloaded';
      }

      if (!isDetailsReady()) await waitForDetailsOrTimeout();
      if (!isDetailsReady()) {
        reload();
        return 'reloaded';
      }

      try {
        await resume();
        return 'resumed';
      } catch (error) {
        console.error('Forsiden kunne ikke genoprettes efter browserens sidecache', error);
        reload();
        return 'reloaded';
      }
    })().finally(() => { activeResume = null; });

    return activeResume;
  };
}
