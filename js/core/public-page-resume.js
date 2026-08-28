export function createPublicPageResumeHandler({
  isCoreReady,
  detailsRequired = () => true,
  isDetailsReady,
  waitForDetails,
  resume,
  isViewHealthy = () => true,
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

      if (detailsRequired() && !isDetailsReady()) await waitForDetailsOrTimeout();
      if (detailsRequired() && !isDetailsReady()) {
        reload();
        return 'reloaded';
      }

      try {
        await resume();
        if (!isViewHealthy()) {
          reload();
          return 'reloaded';
        }
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

export function createPublicPageReturnWatchdog({
  isAppImported,
  shouldReloadImmediately = () => false,
  markPending = () => {},
  isResumeHealthy,
  reload,
  timeoutMs = 3000,
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = timer => globalThis.clearTimeout(timer)
}) {
  let watchdogTimer = null;

  return event => {
    if (!event?.persisted) return 'ignored';
    markPending();

    if (!isAppImported() || shouldReloadImmediately()) {
      reload();
      return 'reloaded';
    }

    if (watchdogTimer !== null) clearTimer(watchdogTimer);
    watchdogTimer = setTimer(() => {
      watchdogTimer = null;
      if (!isResumeHealthy()) reload();
    }, timeoutMs);
    return 'watching';
  };
}
