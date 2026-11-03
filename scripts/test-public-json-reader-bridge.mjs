import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TAG = 'public-json-bridge-20261103';
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function events(initial = {}) {
  const listeners = new Map();
  return Object.assign(initial, {
    addEventListener(name, fn, options = {}) {
      const list = listeners.get(name) ?? [];
      list.push({ fn, once: Boolean(options?.once) }); listeners.set(name, list);
    },
    removeEventListener(name, fn) {
      listeners.set(name, (listeners.get(name) ?? []).filter(entry => entry.fn !== fn));
    },
    emit(name, event = {}) {
      for (const entry of [...(listeners.get(name) ?? [])]) {
        if (entry.once) this.removeEventListener(name, entry.fn);
        entry.fn(event);
      }
    },
  });
}
function updateHost({ readyState = 'complete', serviceWorker = true, registrationFails = false,
  controlled = true, remoteVersion = '4.0.594' } = {}) {
  const button = events({ disabled: false, textContent: '' });
  const banner = { hidden: true };
  const version = { textContent: '4.0.594' };
  const nodes = { '#updateBanner': banner, '#updateAppButton': button, '#appVersion': version };
  const document = events({ readyState, visibilityState: 'visible', querySelector: key => nodes[key] });
  const intervals = new Map();
  const counts = { fetch: 0, register: 0, update: 0, reload: 0, warn: 0 };
  const registration = events({ waiting: null, installing: null,
    update: async () => { counts.update++; } });
  const workers = events({ controller: controlled ? {} : null, register: async (url, options) => {
    counts.register++; host.registrationRequest = { url, options };
    if (registrationFails) throw new Error('SYNTHETIC_REGISTRATION_FAILURE');
    return registration;
  } });
  const host = events({ document, navigator: serviceWorker ? { serviceWorker: workers } : {},
    location: { reload: () => { counts.reload++; } },
    console: { debug() {}, warn() { counts.warn++; } },
    fetch: async () => { counts.fetch++; return { ok: true, json: async () => ({ version: remoteVersion }) }; },
    setInterval(callback, delay) { const id = intervals.size + 1; intervals.set(id, { callback, delay }); return id; },
    clearInterval(id) { intervals.delete(id); } });
  return { host, document, button, banner, version, workers, registration, intervals, counts };
}
function envelope(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  const compressed = gzipSync(bytes);
  return { schemaVersion: 1, kind: 'ravradar-public-json-gzip-v1', encoding: 'gzip-base64',
    decodedBytes: bytes.length, decodedSha256: hash(bytes),
    compressedBytes: compressed.length, compressedSha256: hash(compressed),
    dataBase64: compressed.toString('base64') };
}
function outer(value) {
  const text = JSON.stringify(value);
  return { text, expectedBytes: Buffer.byteLength(text), expectedSha256: hash(text) };
}
function exactOnce(text, before, after) {
  assert.equal(text.split(before).length - 1, 1, 'Private fixture seam must match exactly once');
  return text.replace(before, after);
}

export async function checkPublicReaderBridge() {
  const fetched = globalThis.fetch;
  let networkAttempts = 0;
  globalThis.fetch = () => { networkAttempts++; throw new Error('REAL_NETWORK_FORBIDDEN'); };
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ravradar-public-reader-'));
  const resolved = path.resolve(scratch);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('ravradar-public-reader-'));
  let cases = 0;
  const cleanups = [];
  try {
    // Real private copies of normal modules. Only the unexported read/cache seam
    // is exported in this owned temp host; no product function body is replaced.
    fs.cpSync(path.join(ROOT, 'js'), path.join(scratch, 'js'), { recursive: true });
    fs.writeFileSync(path.join(scratch, 'package.json'), '{"type":"module"}\n');
    const sourcePath = path.join(scratch, 'js/services/data-service.js');
    const normalSource = fs.readFileSync(sourcePath);
    const seam = '\n// Private fixture export only; exact normal module bytes above.\nexport { fetchJson as bridgeFetchJson, memory as bridgeMemory };\n';
    assert.ok(!normalSource.includes(Buffer.from('bridgeFetchJson')));
    fs.writeFileSync(sourcePath, Buffer.concat([normalSource, Buffer.from(seam)]));
    assert.deepEqual(fs.readFileSync(sourcePath).subarray(0, normalSource.length), normalSource);
    const { bridgeFetchJson, bridgeMemory } = await import(pathToFileURL(sourcePath).href);
    const { assertPublicDeliveryDocument } = await import(pathToFileURL(path.join(scratch, 'js/core/public-delivery-contract.js')).href);
    const { installPublicAppUpdateFlow } = await import(pathToFileURL(path.join(scratch, 'js/services/app-update-flow.js')).href);
    const respond = body => {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return { ok: true, text: async () => body.text }; };
      return () => calls;
    };
    const selected = '2030-01-01T00:00:00.000Z';
    const manifest = { datasetId: 'synthetic', generatedAt: selected, productionReferenceAt: selected,
      publicConditionDetailsSha256: 'a'.repeat(64), ravScoreModelBinding: { fixture: true }, coastalPartCount: 1,
      detailDelivery: { zones: { Z: {} }, hours: { [selected]: {} } } };
    const entry = { kind: 'hour', key: selected };
    const document = { datasetId: 'synthetic', generatedAt: selected, productionReferenceAt: selected,
      delivery: { schemaVersion: 1, kind: 'hour', key: selected,
        sourceDetailsSha256: manifest.publicConditionDetailsSha256, modelBinding: manifest.ravScoreModelBinding },
      zones: { Z: { forecast: { hourly: [{ time: selected }] } } },
      coastalParts: { zones: { Z: { expectedPartCount: 1, hourly: [{ time: selected }] } }, parts: { P: { zoneId: 'Z' } } } };
    for (const [name, payload] of [['plain', document], ['encoded', envelope(document)]]) {
      bridgeMemory.clear();
      const body = outer(payload), calls = respond(body);
      const loaded = await bridgeFetchJson('/synthetic-' + name, { ...body, ttlMs: 120000 });
      assert.deepEqual(loaded, document);
      assert.strictEqual(assertPublicDeliveryDocument(loaded, manifest, entry), loaded,
        'The unchanged normal semantic validator receives the unwrapped value');
      const again = await bridgeFetchJson('/synthetic-' + name, { ...body, ttlMs: 120000 });
      assert.strictEqual(again, loaded); assert.equal(calls(), 1);
      const cached = bridgeMemory.get('/synthetic-' + name);
      assert.equal(cached.transportBytes, body.expectedBytes);
      assert.equal(cached.bytes, Buffer.byteLength(JSON.stringify(document)));
      cases++;
    }
    // Hash-valid transport never excuses a wrong semantic generation.
    {
      const body = outer(envelope({ ...document, datasetId: 'wrong-generation' })); respond(body);
      const loaded = await bridgeFetchJson('/synthetic-wrong-generation', body);
      assert.throws(() => assertPublicDeliveryDocument(loaded, manifest, entry), /different generation/); cases++;
    }
    {
      const Native = globalThis.DecompressionStream;
      let decoded = 0;
      globalThis.DecompressionStream = class { constructor(...args) { decoded++; return new Native(...args); } };
      try {
        const body = outer(envelope(document)); respond(body);
        await assert.rejects(bridgeFetchJson('/synthetic-wrong-size', { ...body, expectedBytes: body.expectedBytes + 1 }), /byteantallet/);
        await assert.rejects(bridgeFetchJson('/synthetic-wrong-sha', { ...body, expectedSha256: '0'.repeat(64) }), /SHA-256/);
        await assert.rejects(bridgeFetchJson('/synthetic-unbound-envelope'), /REQUIRES_OUTER_INTEGRITY/);
        assert.equal(decoded, 0, 'Outer integrity/unbound rejection must precede decompression');
      } finally { globalThis.DecompressionStream = Native; }
      cases++;
    }
    {
      bridgeMemory.clear();
      const large = { text: 'x'.repeat(20000) }, body = outer(envelope(large)); const calls = respond(body);
      const value = await bridgeFetchJson('/synthetic-cache', { ...body, ttlMs: 120000 });
      const decodedBytes = Buffer.byteLength(JSON.stringify(large));
      assert.equal(bridgeMemory.size().bytes, decodedBytes);
      assert.notEqual(decodedBytes, body.expectedBytes);
      assert.strictEqual(await bridgeFetchJson('/synthetic-cache', { ...body, ttlMs: 120000 }), value);
      await assert.rejects(bridgeFetchJson('/synthetic-cache', { ...body, ttlMs: 120000,
        expectedBytes: decodedBytes }), /cachede fil matcher/);
      assert.equal(calls(), 1);
      bridgeMemory.remember('/synthetic-legacy-cache', { at: Date.now(), value, sha256: body.expectedSha256,
        bytes: body.expectedBytes });
      assert.strictEqual(await bridgeFetchJson('/synthetic-legacy-cache', { ...body, ttlMs: 120000 }), value,
        'Entries from the old raw cache still use bytes when transportBytes is absent');
      cases++;
    }
    {
      const raw = { oldVersion: true }; const body = outer(raw); respond(body);
      assert.deepEqual(await bridgeFetchJson('/synthetic-old-plain'), raw);
      const waiting = deferred(); let calls = 0;
      globalThis.fetch = async () => { calls++; await waiting.promise; return { ok: true, text: async () => body.text }; };
      const one = bridgeFetchJson('/synthetic-singleflight', body);
      const two = bridgeFetchJson('/synthetic-singleflight', body);
      waiting.resolve(); assert.deepEqual(await one, raw); assert.deepEqual(await two, raw);
      assert.equal(calls, 1); cases++;
    }
    globalThis.fetch = () => { networkAttempts++; throw new Error('REAL_NETWORK_FORBIDDEN'); };

    {
      const h = updateHost({ serviceWorker: false, remoteVersion: '4.0.595' });
      const state = installPublicAppUpdateFlow({ version: '4.0.594', translate: key => key, host: h.host });
      cleanups.push(() => state.stop());
      assert.strictEqual(installPublicAppUpdateFlow({ version: '4.0.594', translate: key => key, host: h.host }), state);
      await state.ready;
      assert.equal(h.counts.fetch, 1); assert.equal(h.banner.hidden, false);
      h.button.emit('click'); h.button.emit('click'); assert.equal(h.counts.reload, 1);
      assert.equal(h.intervals.size, 1);
      state.stop(); assert.equal(h.intervals.size, 0); cases++;
    }
    {
      const h = updateHost({ readyState: 'loading' });
      const state = installPublicAppUpdateFlow({ version: '4.0.594', translate: key => key, host: h.host });
      cleanups.push(() => state.stop());
      assert.equal(h.counts.register, 0); assert.equal(state.ready, null);
      h.document.emit('DOMContentLoaded'); h.document.emit('DOMContentLoaded'); await state.ready;
      assert.equal(h.counts.register, 1); assert.equal(h.counts.fetch, 1);
      assert.match(h.host.registrationRequest.url, /transport=public-json-bridge-20261103/);
      assert.equal(h.host.registrationRequest.options.updateViaCache, 'none');
      h.workers.emit('controllerchange'); h.workers.emit('controllerchange');
      assert.equal(h.counts.reload, 1); cases++;
    }
    {
      const h = updateHost({ controlled: false });
      const state = installPublicAppUpdateFlow({ version: '4.0.594', translate: key => key, host: h.host });
      cleanups.push(() => state.stop()); await state.ready;
      h.workers.controller = {};
      h.workers.emit('controllerchange'); assert.equal(h.counts.reload, 0, 'First claim must preserve the page');
      h.workers.emit('controllerchange'); h.workers.emit('controllerchange'); assert.equal(h.counts.reload, 1); cases++;
    }
    {
      const h = updateHost({ registrationFails: true, remoteVersion: '4.0.595' });
      const state = installPublicAppUpdateFlow({ version: '4.0.594', translate: key => key, host: h.host });
      cleanups.push(() => state.stop()); await state.ready;
      assert.equal(h.counts.register, 1); assert.equal(h.counts.warn, 1);
      assert.equal(h.counts.fetch, 1); assert.equal(h.banner.hidden, false); cases++;
    }
    {
      const h = updateHost();
      const state = installPublicAppUpdateFlow({ version: '4.0.594', translate: key => key, host: h.host });
      cleanups.push(() => state.stop()); await state.ready;
      const fetchWait = deferred(), updateWait = deferred();
      h.host.fetch = async () => { h.counts.fetch++; await fetchWait.promise; return { ok: true, json: async () => ({ version: '4.0.594' }) }; };
      h.registration.update = async () => { h.counts.update++; await updateWait.promise; };
      h.document.visibilityState = 'hidden'; h.document.emit('visibilitychange');
      assert.equal(h.counts.fetch, 1); assert.equal(h.counts.update, 1);
      h.document.visibilityState = 'visible'; h.document.emit('visibilitychange'); h.document.emit('visibilitychange');
      const active = state.checkVersion(); assert.strictEqual(state.checkVersion(), active);
      [...h.intervals.values()][0].callback();
      await tick(); assert.equal(h.counts.fetch, 2); assert.equal(h.counts.update, 2);
      fetchWait.resolve(); updateWait.resolve(); await active; await tick();
      state.stop(); h.document.emit('visibilitychange'); await state.checkVersion();
      assert.equal(h.counts.fetch, 2); assert.equal(h.counts.update, 2); cases++;
    }
    // Execute the actual bootstrap body with only the dynamic app-import seam
    // replaced under an exact guard. The updater must run while app I/O waits.
    for (const readyState of ['complete', 'interactive']) {
      const bootstrap = read('bootstrap.js');
      const appImport = bootstrap.match(/await import\("([^"]*app\.js\?[^"]+)"\);/)?.[0];
      assert.ok(appImport);
      const body = bootstrap.slice(bootstrap.indexOf('let appImported = false;'), bootstrap.indexOf('void import('));
      const guarded = exactOnce(body, appImport, 'await waitForAppImport();');
      const storage = deferred(), app = deferred(), h = updateHost({ readyState });
      const marks = [], launched = [];
      const context = { document: h.document, location: h.host.location,
        addEventListener: h.host.addEventListener.bind(h.host), performance: { mark: name => marks.push(name) },
        initialiseI18n() {}, t: key => key, initializeUserDataSafety: () => storage.promise,
        installPublicAppUpdateFlow: options => {
          const result = installPublicAppUpdateFlow({ ...options, host: h.host });
          launched.push(result); cleanups.push(() => result.stop()); return result;
        },
        waitForAppImport: () => app.promise };
      const running = vm.runInNewContext('(async()=>{' + guarded + '})()', context);
      await tick(); assert.equal(h.counts.register, 0);
      storage.resolve(); await tick(); assert.equal(h.counts.register, 1);
      assert.equal(marks.includes('ravradar:app-imported'), false);
      await launched[0].ready; assert.equal(h.counts.fetch, 1);
      app.resolve(); await running; assert.equal(marks.includes('ravradar:app-imported'), true); cases++;
    }

    // Keep the pre-existing UI arguments, and force new full-URL cache keys at
    // every changed reader edge even under an already installed old worker.
    {
      const root = 'https://ravradar.invalid/';
      const html = read('index.html'), bootstrap = read('bootstrap.js'), app = read('app.js');
      const data = read('js/services/data-service.js'), sw = read('service-worker.js');
      const paths = [
        html.match(/src="(bootstrap\.js\?[^"]+)"/)?.[1],
        bootstrap.match(/import\("([^"]*app\.js\?[^"]+)"\)/)?.[1],
        app.match(/from "([^"]*services\/data-service\.js\?[^"]+)"/)?.[1],
        data.match(/from '([^']*public-json-transport\.js\?[^']+)'/)?.[1],
        bootstrap.match(/from "([^"]*app-update-flow\.js\?[^"]+)"/)?.[1],
      ];
      assert.ok(paths.every(Boolean));
      const version = JSON.parse(read('package.json')).version;
      const bootstrapUrl = new URL(paths[0], root);
      const appUrl = new URL(paths[1], bootstrapUrl);
      const dataUrl = new URL(paths[2], appUrl);
      const urls = [bootstrapUrl, appUrl, dataUrl, new URL(paths[3], dataUrl), new URL(paths[4], bootstrapUrl)];
      for (const url of urls) {
        assert.equal(url.searchParams.get('v'), version);
        assert.equal(url.searchParams.get('transport'), TAG);
      }
      for (const url of urls.slice(0, 2)) {
        assert.equal(url.searchParams.get('copy'), 'footer-20261005');
        assert.equal(url.searchParams.get('ui'), 'zone-panels-20261027');
        assert.equal(url.searchParams.get('assistant'), 'forecast-followup-20261101');
        assert.equal(url.searchParams.get('share'), 'custom-domain-20261102');
      }
      assert.equal(urls[2].searchParams.get('ui'), 'forecast-share-20261024');
      assert.equal(urls[2].searchParams.get('share'), 'custom-domain-20261102');
      const old = new Map(urls.map(url => {
        const plain = new URL(url); plain.searchParams.delete('transport'); return [plain.href, { old: true }];
      }));
      const requests = [];
      const cacheContext = { CACHE: 'synthetic-installed-old', caches: { open: async () => ({
        match: async request => old.get(request), put: (request, response) => old.set(request, response),
      }) }, fetch: async request => { requests.push(request); return { ok: true, clone: () => ({ fresh: true }) }; } };
      const from = sw.indexOf('async function cacheFirst(request)');
      const to = sw.indexOf('async function staleWhileRevalidate(request)', from);
      assert.ok(from >= 0 && to > from);
      vm.runInNewContext(sw.slice(from, to), cacheContext);
      for (const url of urls) {
        assert.equal(old.has(url.href), false);
        await cacheContext.cacheFirst(url.href); await cacheContext.cacheFirst(url.href);
        assert.equal(old.get(url.href).fresh, true);
      }
      assert.equal(requests.length, 5);
      const constants = sw.slice(0, sw.indexOf("self.addEventListener('install'"));
      const values = vm.runInNewContext(constants + '\n({cache:CACHE,assets:STATIC});');
      assert.ok(values.cache.endsWith('-' + TAG));
      for (const url of urls) assert.ok(values.assets.some(asset => new URL(asset, root).href === url.href));
      assert.ok(values.assets.includes('./js/services/vendor/fflate-0.8.2/browser.js'));
      assert.match(app, /function currentAppVersion\(\)/);
      assert.ok(app.match(/currentAppVersion\(\)/g).length >= 2, 'Trip version use remains');
      assert.doesNotMatch(app, /installAppUpdateFlow|createServiceWorkerControllerChangeHandler/);
      assert.doesNotMatch(read('js/services/app-update-flow.js'), /\.unregister\s*\(|localStorage[.(]|indexedDB[.(]|caches\.delete\s*\(/);
      cases++;
    }
    assert.equal(networkAttempts, 0);
    return { status: 'PASS_PUBLIC_JSON_PLAIN_READER_UPGRADER_BRIDGE', cases,
      node: process.version, rawAndEncodedSyntheticParity: true, oldRawCacheCompatible: true,
      normalCoreMemoryUnchanged: true, normalBootstrapBeforeAwaitApp: true, realNetworkCalls: 0,
      providers: 0, productionEmission: 'UNCHANGED_PLAIN', fixtureOnlySeam: 'appended export in owned temp clone' };
  } finally {
    for (const cleanup of cleanups) cleanup();
    globalThis.fetch = fetched;
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('ravradar-public-reader-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await checkPublicReaderBridge()));
}

