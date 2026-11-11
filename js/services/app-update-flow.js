import { createServiceWorkerControllerChangeHandler } from '../core/public-page-resume.js?v=4.0.611';

const installed = new WeakMap();

// Install independently of forecast/auth requests. This never clears user data,
// unregisters a worker, or treats a model/manifest mismatch as an update proof.
export function installPublicAppUpdateFlow({ version, translate, host = globalThis.window }) {
  if (!host?.document || !/^\d+\.\d+\.\d+$/.test(version) || typeof translate !== 'function') {
    throw new Error('PUBLIC_APP_UPDATE_ARGUMENTS_INVALID');
  }
  if (installed.has(host)) return installed.get(host);
  const doc = host.document;
  const workers = host.navigator?.serviceWorker;
  const banner = doc.querySelector('#updateBanner');
  const button = doc.querySelector('#updateAppButton');
  const displayedVersion = doc.querySelector('#appVersion');
  if (displayedVersion) displayedVersion.textContent = version;
  let registration = null;
  let waitingWorker = null;
  let startPromise = null;
  let activeCheck = null;
  let activeUpdate = null;
  let reloadRequested = false;
  let interval = null;
  let stopped = false;
  const reloadOnce = () => {
    if (stopped || reloadRequested) return;
    reloadRequested = true;
    host.location.reload();
  };
  const updateRegistration = () => {
    if (stopped || !registration) return Promise.resolve();
    if (activeUpdate) return activeUpdate;
    activeUpdate = Promise.resolve().then(() => registration.update())
      .catch(() => {}).finally(() => { activeUpdate = null; });
    return activeUpdate;
  };
  const showUpdate = worker => {
    if (stopped) return;
    waitingWorker = worker || waitingWorker;
    if (waitingWorker) { waitingWorker.postMessage({ type: 'SKIP_WAITING' }); return; }
    if (banner && button) {
      banner.hidden = false;
      button.disabled = false;
      button.textContent = translate('update.now');
    }
  };
  const activate = () => {
    if (stopped) return;
    if (button) { button.disabled = true; button.textContent = translate('update.updating'); }
    const worker = waitingWorker || registration?.waiting;
    if (worker) worker.postMessage({ type: 'SKIP_WAITING' });
    else reloadOnce();
  };
  button?.addEventListener('click', activate);
  const controllerChanged = workers ? createServiceWorkerControllerChangeHandler({
    isControlled: () => Boolean(workers.controller), reload: reloadOnce,
  }) : null;
  if (controllerChanged) workers.addEventListener('controllerchange', controllerChanged);
  const checkVersion = () => {
    if (stopped) return Promise.resolve();
    if (activeCheck) return activeCheck;
    activeCheck = (async () => {
      try {
        const response = await host.fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok || stopped) return;
        const remote = await response.json();
        if (typeof remote?.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(remote.version)
          || remote.version === version || stopped) return;
        showUpdate(registration?.waiting);
        await updateRegistration();
        if (registration?.waiting) showUpdate(registration.waiting);
      } catch { host.console?.debug?.('Versionskontrol kunne ikke gennemføres.'); }
    })().finally(() => { activeCheck = null; });
    return activeCheck;
  };
  const becameVisible = () => {
    if (doc.visibilityState !== 'visible' || stopped) return;
    void updateRegistration();
    void checkVersion();
  };
  const begin = () => {
    if (startPromise || stopped) return startPromise;
    startPromise = (async () => {
      // Version checks remain useful without SW support or if registration fails.
      doc.addEventListener('visibilitychange', becameVisible);
      interval = host.setInterval(checkVersion, 30 * 60 * 1000);
      const firstCheck = checkVersion();
      if (workers) {
        try {
          registration = await workers.register(`./service-worker.js?v=${version}&transport=public-json-bridge-20261103`, { updateViaCache: 'none' });
          if (stopped) return;
          if (registration.waiting && workers.controller) showUpdate(registration.waiting);
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
              if (!stopped && worker.state === 'installed' && workers.controller) showUpdate(worker);
            });
          });
          await updateRegistration();
        } catch { host.console?.warn?.('Service worker kunne ikke registreres.'); }
      }
      await firstCheck;
    })();
    return startPromise;
  };
  const onDomReady = () => { void begin(); };
  const state = {
    get ready() { return startPromise; },
    checkVersion,
    stop() {
      stopped = true;
      if (interval !== null) host.clearInterval(interval);
      doc.removeEventListener('DOMContentLoaded', onDomReady);
      doc.removeEventListener('visibilitychange', becameVisible);
      button?.removeEventListener('click', activate);
      if (controllerChanged) workers.removeEventListener('controllerchange', controllerChanged);
    },
  };
  installed.set(host, state);
  if (doc.readyState === 'interactive' || doc.readyState === 'complete') void begin();
  else doc.addEventListener('DOMContentLoaded', onDomReady, { once: true });
  return state;
}
