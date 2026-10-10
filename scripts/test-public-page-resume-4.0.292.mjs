import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { createPublicPageResumeHandler } from '../js/core/public-page-resume.js';
import { initializeUserDataSafety } from '../js/services/storage-safety.js';

function harness(overrides = {}) {
  let detailsReady = overrides.detailsReady ?? true;
  let reloads = 0;
  let resumes = 0;
  const handler = createPublicPageResumeHandler({
    isCoreReady: () => overrides.coreReady ?? true,
    detailsRequired: () => overrides.detailsRequired ?? true,
    isDetailsReady: () => detailsReady,
    waitForDetails: overrides.waitForDetails || (() => Promise.resolve()),
    resume: overrides.resume || (async () => { resumes += 1; }),
    reload: () => { reloads += 1; },
    timeoutMs: 1,
    setTimer: overrides.setTimer || (callback => { callback(); return 1; }),
    clearTimer: () => {}
  });
  return { handler, setDetailsReady:value=>{detailsReady=value;}, counts:()=>({reloads,resumes}) };
}

{
  const test = harness({detailsReady:false,detailsRequired:false});
  assert.equal(await test.handler({persisted:true}), 'resumed');
  assert.deepEqual(test.counts(), {reloads:0,resumes:1});
}

{
  const test = harness();
  assert.equal(await test.handler({persisted:false}), 'ignored');
  assert.deepEqual(test.counts(), {reloads:0,resumes:0});
}

{
  const test = harness({coreReady:false});
  assert.equal(await test.handler({persisted:true}), 'reloaded');
  assert.deepEqual(test.counts(), {reloads:1,resumes:0});
}

{
  const test = harness();
  assert.equal(await test.handler({persisted:true}), 'resumed');
  assert.deepEqual(test.counts(), {reloads:0,resumes:1});
}

{
  let releaseWait;
  const waitForDetails = new Promise(resolve => { releaseWait=resolve; });
  const test = harness({detailsReady:false,waitForDetails:()=>waitForDetails,setTimer:()=>99});
  const first = test.handler({persisted:true});
  const second = test.handler({persisted:true});
  test.setDetailsReady(true);
  releaseWait();
  assert.equal(await first, 'resumed');
  assert.equal(await second, 'resumed');
  assert.deepEqual(test.counts(), {reloads:0,resumes:1});
}

{
  const test = harness({detailsReady:false});
  assert.equal(await test.handler({persisted:true}), 'reloaded');
  assert.deepEqual(test.counts(), {reloads:1,resumes:0});
}

{
  const test = harness({resume:async()=>{throw new Error('simuleret genoptegningsfejl');}});
  const originalConsoleError=console.error;
  console.error=()=>{};
  try { assert.equal(await test.handler({persisted:true}), 'reloaded'); }
  finally { console.error=originalConsoleError; }
  assert.deepEqual(test.counts(), {reloads:1,resumes:0});
}

const bootstrap=await fs.readFile('bootstrap.js','utf8');
const earlyGuard=bootstrap.indexOf("addEventListener('pageshow'");
const storageAwait=bootstrap.indexOf('await initializeUserDataSafety()');
assert.ok(earlyGuard>=0&&earlyGuard<storageAwait,'Bootstrapværnet skal være installeret før første asynkrone opstartstrin.');
assert.match(bootstrap,/event\.persisted && !appImported/);
assert.doesNotMatch(bootstrap,/createPublicPageReturnWatchdog|matchMedia|max-width: 900px|ravradarResume/);

const app=await fs.readFile('app.js','utf8');
assert.match(app,/createPublicPageResumeHandler/);
assert.match(app,/isCoreReady:\(\)=>coreViewReady&&Boolean\(state\.zoneLayer&&state\.zones\)/);
assert.match(app,/detailsRequired:\(\)=>!activeManifest\?\.detailDelivery&&conditionDetailsPromise!==null/);
assert.match(app,/isDetailsReady:\(\)=>conditionDetailsReady/);
assert.match(app,/map\.invalidateSize\(\{pan:false\}\)/);
assert.match(app,/renderRanking\(\);renderSelectedZone\(\);[\s\S]*await renderNationalForecast\(\)/);
assert.doesNotMatch(app,/publicViewHealthy|ravradarResume/);

// Use the actual initializer. Only browser storage/events are synthetic;
// request success and transaction completion are deliberately separate.
async function storageHarness(check) {
  const names = ['indexedDB', 'localStorage', 'addEventListener', 'document', 'setTimeout', 'clearTimeout', 'setInterval'];
  const original = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const oldWarn = console.warn;
  const values = new Map([['ravradar-observations-v2', '[{"id":"synthetic-original"}]']]);
  const transactions = [], listeners = new Map(), timers = [], warnings = [];
  const previous = { schemaVersion: 1, values: { 'ravradar-mode': 'beach' } };
  const database = { transaction(name, mode) {
    assert.equal(name, 'snapshots');
    const tx = { mode, error: null, objectStore(storeName) {
      assert.equal(storeName, 'snapshots');
      return {
        get(key) { assert.equal(key, 'latest'); tx.request = { result: previous }; return tx.request; },
        put(snapshot, key) { assert.equal(key, 'latest'); tx.snapshot = snapshot; tx.request = { result: key }; return tx.request; },
      };
    } };
    transactions.push(tx);
    return tx;
  } };
  Object.assign(globalThis, {
    indexedDB: { open(name, version) {
      assert.equal(name, 'ravradar-userdata'); assert.equal(version, 1);
      const request = { result: database };
      queueMicrotask(() => request.onsuccess());
      return request;
    } },
    localStorage: { get length() { return values.size; }, key: index => [...values.keys()][index],
      getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    addEventListener: (name, listener) => listeners.set(name, listener),
    document: { visibilityState: 'visible', addEventListener: (name, listener) => listeners.set(name, listener) },
    setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {}, setInterval() {},
  });
  console.warn = (...args) => warnings.push(args);
  const turn = () => new Promise(resolve => setImmediate(resolve));
  try { await check({ values, transactions, listeners, timers, warnings, turn, previous }); }
  finally {
    console.warn = oldWarn;
    for (const [name, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

for (const outcome of ['complete', 'write-abort', 'read-abort', 'request-error']) {
  await storageHarness(async ({ values, transactions, listeners, timers, warnings, turn }) => {
    let settled;
    const initialization = initializeUserDataSafety().then(result => { settled = result; return result; });
    await turn();
    const read = transactions[0];
    assert.equal(read.mode, 'readonly');
    read.request.onsuccess();
    if (outcome === 'read-abort') {
      read.error = new Error('SYNTHETIC_READ_ABORT');
      read.onabort?.();
      await turn();
      assert.equal(settled?.available, false, 'A rolled-back read must not restore uncommitted snapshot data.');
      assert.equal(transactions.length, 1);
      assert.equal(values.has('ravradar-mode'), false);
      return;
    }
    read.oncomplete?.();
    await turn();
    const write = transactions[1];
    assert.equal(write.mode, 'readwrite');
    assert.equal(write.snapshot.values['ravradar-observations-v2'], '[{"id":"synthetic-original"}]');
    assert.equal(write.snapshot.values['ravradar-mode'], 'beach');
    if (outcome === 'request-error') {
      write.request.error = new Error('SYNTHETIC_REQUEST_ERROR');
      write.request.onerror();
    } else {
      write.request.onsuccess();
      await turn();
      assert.equal(settled, undefined, 'A successful put request is not a committed backup.');
    }
    if (outcome === 'complete') write.oncomplete?.();
    else { write.error = new Error('SYNTHETIC_WRITE_ABORT'); write.onabort?.(); }
    const result = await initialization;
    assert.equal(result.available, outcome === 'complete');
    assert.equal(listeners.size, outcome === 'complete' ? 3 : 0);
    assert.equal(warnings.length, outcome === 'complete' ? 0 : 1);
    if (outcome === 'complete') {
      // The same transaction helper governs ordinary scheduled backups.
      listeners.get('storage')();
      const scheduled = timers.pop()();
      const nextWrite = transactions[2];
      nextWrite.request.onsuccess();
      await turn();
      assert.equal(warnings.length, 0);
      nextWrite.error = new Error('SYNTHETIC_LATER_ABORT');
      nextWrite.onabort?.();
      await scheduled;
      assert.equal(warnings.length, 1, 'A later transaction abort reaches the existing backup failure handler.');
    }
  });
}

// Actual auth/logout and initializer; only browser storage, transaction events
// and the logout HTTP response are synthetic. No real account or network.
const authBody = (await fs.readFile(new URL('../js/services/auth-service.js', import.meta.url), 'utf8'))
  .replace(/^import[^\n]+\r?\n/gm, '').replace(/^export\s+/gm, '');
const authKey = 'ravradar-auth-session';
const syntheticSession = JSON.stringify({
  access_token: 'synthetic-access-only', refresh_token: 'synthetic-refresh-only',
  expires_at: 9_999_999_999, user: { id: 'synthetic-owner' },
});
const nativeSetTimeout = globalThis.setTimeout, nativeClearTimeout = globalThis.clearTimeout;

function snapshotAuthHarness() {
  const timers = new Set(), calls = [], unexpected = [];
  const scope = {
    PUBLIC_CONFIG: { supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'synthetic-public' },
    localStorage: globalThis.localStorage, AbortController, DOMException,
    setTimeout(callback, delay) {
      const timer = nativeSetTimeout(() => { timers.delete(timer); callback(); }, delay);
      timers.add(timer);
      return timer;
    },
    clearTimeout(timer) { nativeClearTimeout(timer); timers.delete(timer); },
    async fetch(url, options) {
      calls.push({ url, method: options.method, authorization: options.headers.Authorization });
      if (url !== 'https://example.invalid/auth/v1/logout' || options.method !== 'POST') {
        unexpected.push(url);
        throw new Error('UNEXPECTED_SYNTHETIC_AUTH_ROUTE');
      }
      return Response.json({});
    },
  };
  vm.runInNewContext(`${authBody}\nthis.api = { signOut, currentSession };`, scope,
    { filename: 'actual-auth-snapshot-readback.js' });
  return {
    api: scope.api, calls,
    close() {
      const leaked = timers.size;
      for (const timer of timers) nativeClearTimeout(timer);
      timers.clear();
      assert.equal(leaked, 0, 'Actual logout must settle and clear its timeout.');
      assert.deepEqual(unexpected, [], 'No unplanned HTTP route is accepted.');
    },
  };
}

async function completeSnapshotInitialization({ transactions, turn }) {
  const initialization = initializeUserDataSafety();
  await turn();
  transactions[0].request.onsuccess();
  transactions[0].oncomplete();
  await turn();
  transactions[1].request.onsuccess();
  transactions[1].oncomplete();
  const result = await initialization;
  assert.equal(result.available, true);
  return result;
}

await test('actual logout remains signed out after normal snapshot restore and fresh auth load', async () => {
  await storageHarness(async context => {
    const { values, previous, transactions } = context;
    values.set(authKey, syntheticSession);
    previous.values = Object.fromEntries(values);
    const auth = snapshotAuthHarness();
    let freshAuth;
    try {
      assert.equal(auth.api.currentSession().user.id, 'synthetic-owner');
      await auth.api.signOut();
      assert.deepEqual(auth.calls, [{ url: 'https://example.invalid/auth/v1/logout', method: 'POST', authorization: 'Bearer synthetic-access-only' }]);
      assert.equal(auth.api.currentSession(), null);
      assert.equal(values.has(authKey), false);
      await completeSnapshotInitialization(context);
      freshAuth = snapshotAuthHarness();
      assert.equal(freshAuth.api.currentSession(), null, 'An old durable snapshot must not undo actual logout.');
      assert.equal(values.has(authKey), false);
      assert.equal(Object.hasOwn(transactions[1].snapshot.values, authKey), false);
    } finally { freshAuth?.close(); auth.close(); }
  });
});

await test('normal backup excludes credentials without changing the active auth session', async () => {
  await storageHarness(async context => {
    const { values, previous, transactions } = context;
    values.set(authKey, syntheticSession);
    values.set('ravradar-auth-session-setting', 'synthetic-noncredential-value');
    previous.values[authKey] = '{"access_token":"synthetic-stale-only"}';
    const auth = snapshotAuthHarness();
    try {
      const active = auth.api.currentSession();
      await completeSnapshotInitialization(context);
      assert.equal(values.get(authKey), syntheticSession, 'The active login remains byte-identical.');
      assert.equal(auth.api.currentSession(), active);
      assert.deepEqual(auth.calls, []);
      assert.equal(transactions[1].snapshot.values['ravradar-observations-v2'], '[{"id":"synthetic-original"}]');
      assert.equal(transactions[1].snapshot.values['ravradar-auth-session-setting'], 'synthetic-noncredential-value');
      assert.equal(Object.hasOwn(transactions[1].snapshot.values, authKey), false, 'Authentication is not durable trip data.');
    } finally { auth.close(); }
  });
});

await test('normal restore preserves missing trip/outbox bytes and never replaces existing local data', async () => {
  await storageHarness(async context => {
    const { values, previous, transactions } = context;
    const trip = '[{"id":"synthetic-pending-trip","samples":[]}]';
    const outbox = '[{"id":"synthetic-pending-observation","pendingSync":true}]';
    previous.values = {
      'ravradar-trip-evidence-v2-pending': trip,
      'ravradar-observation-outbox-v1': outbox,
      'ravradar-observations-v2': '[{"id":"synthetic-stale-original"}]',
      'foreign-key': 'not-ravradar', 'ravradar-null-value': null,
    };
    const result = await completeSnapshotInitialization(context);
    assert.equal(result.restored, 2);
    assert.equal(values.get('ravradar-trip-evidence-v2-pending'), trip);
    assert.equal(values.get('ravradar-observation-outbox-v1'), outbox);
    assert.equal(values.get('ravradar-observations-v2'), '[{"id":"synthetic-original"}]');
    assert.equal(values.has('foreign-key'), false);
    assert.equal(values.has('ravradar-null-value'), false);
    assert.equal(values.has(authKey), false);
    assert.deepEqual(transactions[1].snapshot.values, Object.fromEntries(values));
  });
});

console.log('OK: Safari/bfcache-genoptagelse genoptegner en færdig forside og genindlæser kun efter en afbrudt opstart.');
