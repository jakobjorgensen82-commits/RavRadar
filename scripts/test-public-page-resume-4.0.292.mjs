import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
      getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    addEventListener: (name, listener) => listeners.set(name, listener),
    document: { visibilityState: 'visible', addEventListener: (name, listener) => listeners.set(name, listener) },
    setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {}, setInterval() {},
  });
  console.warn = (...args) => warnings.push(args);
  const turn = () => new Promise(resolve => setImmediate(resolve));
  try { await check({ values, transactions, listeners, timers, warnings, turn }); }
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

console.log('OK: Safari/bfcache-genoptagelse genoptegner en færdig forside og genindlæser kun efter en afbrudt opstart.');
