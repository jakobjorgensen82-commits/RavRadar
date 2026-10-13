import assert from 'node:assert/strict';
import fs from 'node:fs';

const account = fs.readFileSync('js/ui/account-panel.js', 'utf8');
const accountContract = fs.readFileSync('js/services/account-trip-report-contract.js', 'utf8');
const observations = fs.readFileSync('js/services/observation-service.js', 'utf8');
const auth = fs.readFileSync('js/services/auth-service.js', 'utf8');
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const productionContract = fs.readFileSync('supabase/migrations/20260823_account_trip_log_contract.sql', 'utf8');
const uploadContract = fs.readFileSync('supabase/migrations/20260823_observation_upload_contract.sql', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const learning = fs.readFileSync('js/services/learning-analysis.js', 'utf8');
const calibration = fs.readFileSync('js/services/calibration-eligibility.js', 'utf8');

for (const marker of [
  'account.history',
  'account.magicTitle',
  'account.historyIntro',
  'getOwnTripObservations',
  'mergeOwnRows',
  'client_observation_id',
  'accountTripBindingStatus',
  'RAVSCORE_CALIBRATION_ELIGIBLE',
  'account.pending'
]) assert.match(account, new RegExp(marker));

assert.match(calibration, /TRIP_LOG_DTO_FIELD_NAMES[\s\S]*'model_binding'/,
  'Den private turlog-DTO skal medtage den eksakte, ikke-følsomme modelbinding.');
assert.match(calibration, /model_binding: isExactCalibrationModelBinding\(binding\)/,
  'Turlog-DTO må kun serialisere en komplet eksakt modelbinding.');

assert.doesNotMatch(account,
  /row\.calibration_binding_status\s*\|\|/,
  'Kontofladen må ikke stole på serverens integrerede bindingsklassifikation under Candidate rollback.');

assert.doesNotMatch(account, /Der oprettes ikke en ekstra kopi i databasen/, 'Turloggen må ikke vise intern databaseforklaring.');

assert.doesNotMatch(account, /\b(?:latitude|longitude|coordinates)\b/i);
assert.doesNotMatch(account, /fetch\s*\(/, 'Kontovisningen må kun bruge den afgrænsede observationstjeneste.');
assert.match(observations, /\/functions\/v1\/trip-log/);
assert.match(observations, /JSON\.stringify\(\{ limit: safeLimit \}\)/);
assert.match(observations, /Math\.min\(200/);
assert.doesNotMatch(observations, /schema_version=eq\.2/, 'Ældre egne fund skal også kunne vises.');
assert.doesNotMatch(account, /Number\(row\?\.schema_version\)\s*!==\s*2/, 'Ældre lokale egne fund må ikke skjules fra loggen.');
assert.match(account, /String\(fallback \|\| id \|\| t\('account\.unknownPlace'\)\)/, 'Ældre ture skal foretrække et forståeligt områdenavn frem for et internt id.');
assert.match(observations, /active\?\.user\?\.id!==payload\.user_id/, 'En kontoejet outbox-tur må kun sendes som den samme bruger.');
assert.match(observations, /session\?\.access_token&&!session\?\.user\?\.id/);
assert.doesNotMatch(observations, /rest\/v1\/observations\?select=/i);
assert.match(schema, /create policy "users can read own observations"[\s\S]*using \(user_id = auth\.uid\(\)\)/);
assert.match(schema, /grant select on table public\.observations to authenticated/);

assert.match(productionContract, /add column if not exists data_quality_flags jsonb not null default '\[\]'::jsonb/);
assert.match(productionContract, /create policy "users can read own observations"[\s\S]*using \(user_id = auth\.uid\(\)\)/);
assert.match(productionContract, /grant select on table public\.observations to authenticated/);
assert.match(productionContract, /notify pgrst, 'reload schema'/);
assert.doesNotMatch(productionContract, /\b(?:delete|truncate|update)\b/i, 'Turlogmigrationen må ikke ændre eller slette eksisterende observationer.');

for (const column of ['forecast_target_at', 'report_accuracy']) {
  assert.match(uploadContract, new RegExp(`add column if not exists ${column}\\b`), `Produktionsmigrationen mangler uploadfeltet ${column}.`);
}
assert.match(uploadContract, /notify pgrst, 'reload schema'/);
assert.doesNotMatch(uploadContract, /\b(?:delete|truncate|update)\b/i, 'Uploadmigrationen må ikke ændre eller slette eksisterende observationer.');
assert.doesNotMatch(observations, /^\s*\.\.\.columns,\s*$/m, 'Historiske rækker må ikke spredes ukontrolleret til lokal eller ekstern lagring.');
assert.match(observations, /data_quality_flags:\[\.\.\.columns\.data_quality_flags\]/);
assert.match(accountContract, /forecast_target_at: report\.observedAt/);
assert.match(accountContract, /report_accuracy: 'exact'/);

assert.doesNotMatch(account, /Supabase kunne ikke hentes/, 'Brugeren skal møde RavRadar-sprog og ikke leverandørnavnet ved en læsefejl.');
assert.match(account, /t\('account\.historyLoadError'\)/);

assert.match(auth, /authRequest\("\/user"\)/);
assert.match(auth, /redirect_to=\$\{encodeURIComponent\(redirectTo\)\}/);
assert.match(auth, /await hydrateSessionUser\(startingEpoch\)\.catch/,
  'Callbackens brugerhydrering skal afklare sit eget loginvalg før normal notifikation.');
assert.match(app, /openAccountDialog\(accountDialog,userDataContext\(\)\)/);
assert.match(learning, /getLocalObservations\(\)/, 'Den eksisterende lokale læringsmodel skal fortsat have sine observationer.');

// Import the actual UI, observation service and their shared versioned auth
// module. Only DOM/storage/HTTP are synthetic; no private renderer is called.
const releaseVersion = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
globalThis.window = { addEventListener() {} };
globalThis.fetch = async () => { throw new Error('TEST_NETWORK_FORBIDDEN'); };
const authApi = await import(`../js/services/auth-service.js?v=${releaseVersion}`);
const { openAccountDialog } = await import('../js/ui/account-panel.js');
const { PUBLIC_CONFIG } = await import('../config.js');
const turn = () => new Promise(resolve => setImmediate(resolve));
let historyCases = 0;
for (const action of ['unchanged', 'refresh', 'body-failure', 'switch', 'logout', 'same-owner-relogin',
  'switch-while-history', 'same-owner-while-history', 'closed-dialog', 'newer-account-view', 'newer-history']) {
  let loginOwner = 'synthetic-owner-a';
  const streams = [], handlers = new Map();
  const sessionFor = owner => ({ access_token: `synthetic-token-${owner}`,
    refresh_token: `synthetic-refresh-${owner}`, expires_at: 9_999_999_999,
    user: { id: owner, email: `${owner}@example.invalid` } });
  globalThis.fetch = async input => {
    const url = new URL(input);
    assert.equal(url.origin, new URL(PUBLIC_CONFIG.supabaseUrl).origin);
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password')
      return Response.json(sessionFor(loginOwner));
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token')
      return Response.json({ ...sessionFor('synthetic-owner-a'), access_token: 'synthetic-renewed-token' });
    if (url.pathname === '/auth/v1/logout') return Response.json({});
    if (url.pathname === '/functions/v1/trip-log') {
      return new Response(new ReadableStream({ start(controller) { streams.push(controller); } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error('TEST_NETWORK_FORBIDDEN');
  };
  await authApi.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
  const row = (id, zoneName, owner) => ({ id, zone_name: zoneName, user_id: owner,
    observed_at: '2026-10-09T08:00:00.000Z', hunt_mode: 'beach', result: 'none', search_minutes: 20 });
  values.set('ravradar-observations-v2', JSON.stringify([
    row('synthetic-local-a', 'LOCAL_A_VIEW', 'synthetic-owner-a'),
    row('synthetic-local-b', 'LOCAL_B_VIEW', 'synthetic-owner-b'),
  ]));
  values.set('ravradar-observation-outbox-v1', '[]');
  const localBefore = values.get('ravradar-observations-v2');
  let markup = '';
  // The actual account renderer now owns close/cancel listeners. Preserve
  // DOM node identity and detachment instead of returning a fresh node per read.
  const nodes = new Map(), dialogEvents = new EventTarget();
  const content = {
    get innerHTML() { return markup; },
    set innerHTML(value) {
      for (const node of nodes.values()) node.isConnected = false;
      nodes.clear(); markup = value; handlers.clear();
    },
    querySelector(selector) {
      if (!markup.includes(`id="${selector.slice(1)}"`)) return null;
      if (!nodes.has(selector)) nodes.set(selector, { isConnected: true,
        addEventListener(name, listener) { handlers.set(`${selector}:${name}`, listener); } });
      return nodes.get(selector);
    },
  };
  const dialog = { open: false, querySelector: () => content,
    addEventListener: (...args) => dialogEvents.addEventListener(...args),
    removeEventListener: (...args) => dialogEvents.removeEventListener(...args),
    showModal() { this.open = true; },
    close() { this.open = false; dialogEvents.dispatchEvent(new Event('close')); } };
  const startHistory = async () => {
    openAccountDialog(dialog);
    const listener = handlers.get('#tripHistoryLink:click');
    assert.equal(typeof listener, 'function');
    let prevented = false;
    listener({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    await turn();
  };
  const finishBody = (index, marker) => {
    streams[index].enqueue(new TextEncoder().encode(JSON.stringify({ rows: [
      row(`synthetic-remote-${index}`, marker, 'synthetic-owner-a'),
    ] })));
    streams[index].close();
  };
  await startHistory();
  assert.equal(streams.length, 1);
  assert.doesNotMatch(markup, /(?:REMOTE_A|LOCAL_[AB])_VIEW/, 'No private rows are rendered before body completion.');
  if (action === 'refresh') await authApi.refreshSession({ force: true });
  if (action === 'switch' || action === 'switch-while-history') {
    loginOwner = 'synthetic-owner-b';
    await authApi.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
  }
  if (['logout', 'same-owner-relogin', 'same-owner-while-history'].includes(action)) await authApi.signOut();
  if (action === 'same-owner-relogin' || action === 'same-owner-while-history')
    await authApi.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
  if (['switch', 'logout', 'same-owner-relogin', 'newer-account-view'].includes(action)) openAccountDialog(dialog);
  if (action === 'closed-dialog') dialog.close();
  if (action === 'newer-history') {
    await startHistory();
    assert.equal(streams.length, 2);
    finishBody(1, 'REMOTE_NEWER_VIEW');
    await turn();
    assert.match(markup, /REMOTE_NEWER_VIEW/);
  }
  const currentView = markup;
  if (action === 'body-failure') streams[0].error(new Error('SYNTHETIC_BODY_FAILURE'));
  else finishBody(0, 'REMOTE_A_VIEW');
  await turn();
  if (action === 'unchanged' || action === 'refresh') {
    assert.match(markup, /REMOTE_A_VIEW/);
    assert.match(markup, /LOCAL_A_VIEW/);
    assert.doesNotMatch(markup, /LOCAL_B_VIEW/, 'Another owner\'s private local rows must remain hidden.');
  } else if (action === 'body-failure') {
    assert.match(markup, /LOCAL_A_VIEW/, 'An ordinary failed remote read preserves the correct owner\'s local history.');
    assert.doesNotMatch(markup, /(?:LOCAL_B|REMOTE_A)_VIEW|SYNTHETIC_BODY_FAILURE/);
  } else {
    assert.equal(markup, currentView, `${action}: an old history completion must not overwrite the current account/view.`);
    assert.doesNotMatch(markup, /REMOTE_A_VIEW/);
  }
  assert.equal(values.get('ravradar-observations-v2'), localBefore, 'Rendering/rejecting a stale read must not rewrite private local rows.');
  assert.equal(values.get('ravradar-observation-outbox-v1'), '[]');
  historyCases += 1;
  dialog.close(); // Dispose this real renderer's own listeners before the next fixture.
}

console.log(`Brugerkonto og turlog: eksisterende kontrakter og ${historyCases} faktiske dialog/body/ejerforløb består uden netværk.`);

// Additive own-trip export checks; all prior real-module history cases remain above.
{
const { default: vm } = await import('node:vm');
const { collectOwnTripExport } = await import('../js/services/own-trip-export.js');
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const snapshot = '2026-10-01T00:00:00.000Z';
const exportedRows = Array.from({ length: 501 }, (_, index) => ({
  client_observation_id: `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  observed_at: '2026-08-01T00:00:00.000Z', schema_version: 1, result: 'none',
}));
const localRows = [{ id: 'local-a', user_id: ownerA, sync_status: 'pending', gps: { lat: 1, lon: 2 } },
  { id: 'local-b', user_id: ownerB }, { id: 'anonymous', user_id: null }];
const pendingRows = [{ id: 'pending-a', user_id: ownerA }, { id: 'pending-b', user_id: ownerB }];
const originalLocal = JSON.stringify([localRows, pendingRows]);
let currentOwner = ownerA, pageCalls = 0;
const assertOwner = async () => { if (currentOwner !== ownerA) throw new Error('OWNER_CHANGED'); };
const readPage = async cursor => {
  pageCalls += 1;
  const offset = cursor === null ? 0 : Number(cursor);
  return { rows: exportedRows.slice(offset, offset + 200), snapshot_at: snapshot,
    next_cursor: offset + 200 < exportedRows.length ? String(offset + 200) : null };
};
const collectorOptions = { userId: ownerA, assertOwner, readPage,
  readLocal: () => localRows, readPending: () => pendingRows };
const file = await collectOwnTripExport(collectorOptions);
assert.equal(pageCalls, 3);
assert.equal(file.stored_trips.length, 501);
assert.deepEqual(file.device_trips, [localRows[0]]);
assert.deepEqual(file.pending_trips, [pendingRows[0]]);
assert.equal(JSON.stringify([localRows, pendingRows]), originalLocal, 'Eksport skriver ikke migration, synkronisering eller lokal oprydning.');
assert.equal(JSON.stringify(file).includes(ownerB), false);
assert.equal(JSON.stringify(file).includes('anonymous'), false);
assert.equal(Object.hasOwn(file, 'access_token'), false);
assert.equal(file.scope, 'stored-trip-payloads-and-this-device');
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readPage: async cursor => {
  const result = await readPage(cursor); currentOwner = ownerB; return result;
} }), /OWNER_CHANGED/);
currentOwner = ownerA;
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readPage: async cursor => {
  if (cursor !== null) throw new Error('NETWORK_FAILURE'); return readPage(cursor);
} }), /NETWORK_FAILURE/);
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readPage: async () => ({
  rows: exportedRows.slice(0, 200), snapshot_at: snapshot, next_cursor: 'same-cursor',
}) }), /TRIP_EXPORT_INVALID|CURSOR_REPEATED/);
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readPage: async cursor => ({
  ...await readPage(cursor), snapshot_at: cursor === null ? snapshot : '2026-10-02T00:00:00.000Z',
}) }), /SNAPSHOT_CHANGED/);
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readPage: async () => ({
  rows: [{ ...exportedRows[0], user_id: ownerB }], snapshot_at: snapshot, next_cursor: null,
}) }), /TRIP_EXPORT_INVALID/);
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readLocal: () => ({ corrupted: true }) }), /LOCAL_INVALID/);
let repeatedPage = 0;
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readPage: async () => ({
  rows: exportedRows.slice(repeatedPage++ * 200, repeatedPage * 200),
  snapshot_at: snapshot, next_cursor: 'repeated-token',
}) }), /CURSOR_REPEATED/);
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readPage: async () => ({
  rows: [{ ...exportedRows[0], tooLarge: 'x'.repeat(20 * 1024 * 1024) }],
  snapshot_at: snapshot, next_cursor: null,
}) }), /TOO_LARGE/);
await assert.rejects(collectOwnTripExport({ ...collectorOptions, readLocal: () => {
  currentOwner = ownerB; return localRows;
} }), /OWNER_CHANGED/);
currentOwner = ownerA;
const emptyExport = await collectOwnTripExport({ ...collectorOptions,
  readPage: async () => ({ rows: [], snapshot_at: snapshot, next_cursor: null }), readLocal: () => [], readPending: () => [],
});
assert.equal(emptyExport.stored_trips.length, 0);

// Run the actual normal observation-service entry, not only the collector.
const storage = new Map();
let serviceOwner = ownerA, serviceCalls = 0, breakWhileReadingBody = false;
let exportClock = 0;
const observationScope = {
  authIdentityEpoch: () => 0, // Explicit fixed-login facade; transitions have their own epoch target.
  performance: { now: () => exportClock },
  setTimeout: (callback, delay) => { exportClock += delay; callback(); },
  PUBLIC_CONFIG: { supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'dummy-public-key' },
  collectOwnTripExport, currentSession: () => ({ user: { id: serviceOwner } }),
  requireFreshSession: async () => ({ user: { id: serviceOwner } }),
  localStorage: { getItem: key => storage.get(key) ?? null },
  authorizedFetch: async (url, options, guards) => {
    serviceCalls += 1;
    assert.equal(url, 'https://example.invalid/functions/v1/trip-log');
    assert.equal(guards.expectedUserId, ownerA);
    assert.equal(guards.retry401, false);
    assert.equal(guards.consumeJson, true);
    const body = JSON.parse(options.body);
    assert.deepEqual(Object.keys(body).sort(), ['cursor', 'operation']);
    assert.equal(body.operation, 'export-page');
    return { ok: true, json: async () => {
      if (breakWhileReadingBody) serviceOwner = ownerB;
      return readPage(body.cursor);
    } };
  },
};
const observationBody = observations.replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
observationScope.exportPageTransport = (...args) => observationScope.authorizedFetch(...args);
vm.runInNewContext(`const authorizedFetch = async (...args) => {
  const response = await exportPageTransport(...args);
  return { response, body: response.ok ? await response.json() : undefined };
};\n${observationBody}\nthis.exportTrips = getOwnTripExport;`, observationScope);
const normalServiceFile = await observationScope.exportTrips();
assert.equal(normalServiceFile.stored_trips.length, 501);
assert.deepEqual(normalServiceFile.device_trips, []);
assert.equal(serviceCalls, 3);
storage.set('ravradar-observations-v2', '{bad-json');
await assert.rejects(observationScope.exportTrips());
storage.delete('ravradar-observations-v2');
breakWhileReadingBody = true;
await assert.rejects(observationScope.exportTrips(), /OWNER_CHANGED/);

// The normal service must observe cancellation at its real asynchronous
// boundaries, before another page or any local/outbox reads. Do not simulate
// HTTP abortion: an already-started request can finish, but no next one starts.
serviceOwner = ownerA; breakWhileReadingBody = false;
const originalExportFetch = observationScope.authorizedFetch;
const originalFreshSession = observationScope.requireFreshSession;
for (const boundary of ['before-auth', 'during-auth', 'during-response', 'during-body']) {
  let active = boundary !== 'before-auth', authReads = 0, requests = 0, bodies = 0;
  observationScope.requireFreshSession = async () => {
    authReads += 1;
    if (boundary === 'during-auth') active = false;
    return { user: { id: ownerA } };
  };
  observationScope.authorizedFetch = async (...args) => {
    requests += 1;
    const response = await originalExportFetch(...args);
    if (boundary === 'during-response') active = false;
    return { ...response, json: async () => {
      bodies += 1;
      const body = await response.json();
      if (boundary === 'during-body') active = false;
      return body;
    } };
  };
  await assert.rejects(observationScope.exportTrips({ isActive: () => active }), /TRIP_EXPORT_CANCELLED/);
  assert.equal(requests, boundary === 'during-response' || boundary === 'during-body' ? 1 : 0, boundary);
  // consumeJson owns the body before authorizedFetch returns; cancellation still forbids the next page/local read/download.
  assert.equal(bodies, boundary === 'during-body' || boundary === 'during-response' ? 1 : 0, boundary);
  if (boundary === 'before-auth') assert.equal(authReads, 0);
  assert.equal(storage.size, 0, 'Cancellation writes no partial or resumable export.');
}
observationScope.authorizedFetch = originalExportFetch;
observationScope.requireFreshSession = originalFreshSession;
await assert.rejects(observationScope.exportTrips({ isActive: false }), /TRIP_EXPORT_INVALID/);

// Run actual authorizedFetch: no request or retry may switch to owner B.
let authCalls = 0, changeDuringFetch = false;
const authScope = {
  PUBLIC_CONFIG: observationScope.PUBLIC_CONFIG, AbortController, DOMException, setTimeout, clearTimeout,
  localStorage: { getItem: () => JSON.stringify({ access_token: 'dummy-a', user: { id: ownerA } }),
    setItem() {}, removeItem() {} },
  fetch: async () => {
    authCalls += 1;
    if (changeDuringFetch) authScope.runtime.set({ access_token: 'dummy-b', refresh_token: 'dummy', user: { id: ownerB } });
    return { status: changeDuringFetch ? 401 : 200 };
  },
};
vm.runInNewContext(`${auth.replace(/^import[^\n]+\r?\n/gm, '').replace(/^export\s+/gm, '')}
this.runtime = { authorizedFetch, set: saveSession };`, authScope);
await authScope.runtime.authorizedFetch('https://example.invalid', {}, { expectedUserId: ownerA });
assert.equal(authCalls, 1);
await assert.rejects(authScope.runtime.authorizedFetch('https://example.invalid', {}, { expectedUserId: ownerB }), /Kontoen blev ændret/);
assert.equal(authCalls, 1, 'Forkert ejer afvises før netværkskald.');
changeDuringFetch = true;
await assert.rejects(authScope.runtime.authorizedFetch('https://example.invalid', {}, { expectedUserId: ownerA }), /Kontoen blev ændret/);
assert.equal(authCalls, 2, 'Kontoskift giver ikke et 401-genforsøg med den anden konto.');
authScope.runtime.set({ access_token: 'dummy-a', refresh_token: 'dummy-refresh', user: { id: ownerA } });
const refreshedCalls = [];
authScope.fetch = async (url, options) => {
  refreshedCalls.push({ url, authorization: options.headers.Authorization });
  if (url.endsWith('/auth/v1/token?grant_type=refresh_token')) {
    return { ok: true, json: async () => ({ access_token: 'dummy-a-refreshed', refresh_token: 'dummy-refresh', user: { id: ownerA } }) };
  }
  return { status: refreshedCalls.length === 1 ? 401 : 200 };
};
await authScope.runtime.authorizedFetch('https://example.invalid', {}, { expectedUserId: ownerA });
assert.equal(refreshedCalls.length, 3);
assert.equal(refreshedCalls[2].authorization, 'Bearer dummy-a-refreshed');

// Run actual normal Edge route; only its existing auth/rate/storage boundaries
// are synthetic. No server row or real login is read or created.
const tripLogSource = fs.readFileSync('supabase/functions/trip-log/index.ts', 'utf8');
let edgeHandler, edgeUser = ownerA, rateFailure = false;
const edgeCalls = [];
class TestGatewayError extends Error { constructor(status, code) { super(code); this.status = status; } }
const edgeScope = {
  Deno: { serve: callback => { edgeHandler = callback; } },
  assertAllowedOrigin: request => {
    if (request.headers.get('origin') !== 'https://ravradar.example.invalid') throw new TestGatewayError(403, 'ORIGIN_NOT_ALLOWED');
  },
  readJsonObject: async request => request.json(), GatewayError: TestGatewayError,
  enforceRateLimits: async (_request, name, limits) => {
    edgeCalls.push(['rate', name, JSON.stringify(limits)]);
    if (rateFailure) throw new TestGatewayError(429, 'RATE_LIMITED');
  },
  requireAuthenticatedUserId: async () => {
    edgeCalls.push(['auth']); if (!edgeUser) throw new TestGatewayError(401, 'LOGIN_REQUIRED'); return edgeUser;
  },
  exportOwnTripPage: async (...args) => { edgeCalls.push(['export', ...args]); return { rows: [], snapshot_at: snapshot, next_cursor: null }; },
  listOwnTripObservations: async (...args) => { edgeCalls.push(['list', ...args]); return []; },
  jsonResponse: (_request, body) => new Response(JSON.stringify(body)),
  safeGatewayError: (_request, error) => new Response(JSON.stringify({ error: error.message }), { status: error.status || 500 }),
  TRIP_STORAGE_CONTRACT_PROBE_HEADER: 'x-ravradar-contract-probe',
};
const edgeBody = tripLogSource.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('payload.cursor as string | null', 'payload.cursor');
vm.runInNewContext(edgeBody, edgeScope);
const callEdge = body => edgeHandler(new Request('https://example.invalid/functions/v1/trip-log', {
  method: 'POST', headers: { origin: 'https://ravradar.example.invalid', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
assert.equal((await callEdge({ operation: 'export-page', cursor: null })).status, 200);
assert.deepEqual(edgeCalls, [['rate', 'trip-log', '{"minute":12,"hour":120,"globalDay":5000}'], ['auth'], ['export', ownerA, null]]);
edgeCalls.length = 0;
for (const body of [
  { operation: 'export-page', cursor: null, user_id: ownerB },
  { operation: 'export-page', cursor: null, owner_subject: 'forged' },
  { operation: 'export-page', cursor: null, consent_version: 'uninstalled' },
  { operation: 'export-page', cursor: null, limit: 200 },
  { operation: 'export-page', cursor: 42 }, { operation: 'unknown' },
]) assert.equal((await callEdge(body)).status, 400);
assert.deepEqual(edgeCalls, [], 'Ukendte felter/operationer må ikke passere som ejer eller samtykke.');
edgeUser = null;
assert.equal((await callEdge({ operation: 'export-page', cursor: null })).status, 401);
assert.equal(edgeCalls.some(row => row[0] === 'export'), false);
edgeUser = ownerA; edgeCalls.length = 0; rateFailure = true;
assert.equal((await callEdge({ operation: 'export-page', cursor: null })).status, 429);
assert.deepEqual(edgeCalls.map(row => row[0]), ['rate']);
rateFailure = false; edgeCalls.length = 0;
assert.equal((await callEdge({ limit: 100 })).status, 200);
assert.deepEqual(edgeCalls.at(-1), ['list', ownerA, 100], 'Den eksisterende logkalder bevares.');

// Run the normal renderer/click handler; failure must never create a blob.
async function checkExportButton({ fail = false, switchOwner = false, stop = null, readExport = null } = {}) {
  let click, blobs = 0, downloads = 0, owner = ownerA;
  const status = { textContent: '' };
  const button = { isConnected: true, disabled: false, addEventListener: (_, listener) => { click = listener; } };
  const content = { innerHTML: '', querySelector: key => key === '#tripExportButton' ? button : key === '#tripExportStatus' ? status : null };
  const listeners = new Map();
  const dialog = { open: true, querySelector: () => content,
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name, listener) => { if (listeners.get(name) === listener) listeners.delete(name); },
    close: () => { dialog.open = false; listeners.get('close')?.(); },
    cancel: () => { listeners.get('cancel')?.(); },
  };
  const scope = { currentSession: () => ({ access_token: 'dummy', user: { id: owner } }), t: key => key,
    authIdentityEpoch: () => 0, // Explicit fixed-login facade; transitions have their own epoch target.
    getOwnTripExport: async (...args) => {
      if (readExport) return readExport(...args, { dialog, button });
      if (stop === 'close' || stop === 'reopen') dialog.close();
      if (stop === 'reopen') dialog.open = true;
      if (stop === 'remove') button.isConnected = false;
      if (stop === 'cancel') dialog.cancel();
      if (fail) throw new Error('READ_FAILED'); if (switchOwner) owner = ownerB; return file;
    },
    Blob, URL: { createObjectURL: () => { blobs += 1; return 'blob:synthetic'; }, revokeObjectURL() {} },
    document: { createElement: () => ({ click: () => { downloads += 1; } }) },
    setTimeout: fn => fn(),
  };
  vm.runInNewContext(`${account.replace(/^import[^\n]+\r?\n/gm, '').replace(/^export\s+/gm, '')}\nthis.openAccountDialog = openAccountDialog;`, scope);
  scope.openAccountDialog(dialog);
  await click({ currentTarget: button });
  assert.equal(button.disabled, false);
  assert.equal(blobs, fail || switchOwner || stop ? 0 : 1);
  assert.equal(downloads, fail || switchOwner || stop ? 0 : 1);
  assert.equal(listeners.size, 0, 'Every outcome removes its own dialog cancellation listeners.');
  assert.equal(status.textContent, stop ? 'account.exportTripsWorking'
    : fail || switchOwner ? 'account.exportTripsFailed' : 'account.exportTripsReady');
}
await checkExportButton();
await checkExportButton({ fail: true });
await checkExportButton({ switchOwner: true });
// Closing a real dialog does not detach its button. The actual click handler
// must not download an export whose dialog was closed while the read awaited.
for (const stop of ['close', 'reopen', 'remove', 'cancel']) await checkExportButton({ stop });
// Actual normal renderer -> service -> collector. The first real page seam
// closes/removes/cancels the dialog while its body is awaited; never page two.
for (const stop of ['close', 'reopen', 'remove', 'cancel']) {
  let requests = 0, bodies = 0;
  await checkExportButton({ stop, readExport: (options, { dialog, button }) => {
    assert.equal(typeof options.isActive, 'function');
    observationScope.authorizedFetch = async (...args) => {
      requests += 1;
      const response = await originalExportFetch(...args);
      return { ...response, json: async () => {
        bodies += 1;
        const body = await response.json();
        if (stop === 'close' || stop === 'reopen') dialog.close();
        if (stop === 'reopen') dialog.open = true;
        if (stop === 'remove') button.isConnected = false;
        if (stop === 'cancel') dialog.cancel();
        return body;
      } };
    };
    return observationScope.exportTrips(options);
  } });
  assert.equal(requests, 1); assert.equal(bodies, 1);
  assert.equal(storage.size, 0);
  observationScope.authorizedFetch = originalExportFetch;
}
// Drive the ACTUAL service and click handler against conservative rolling
// windows stricter than the existing fixed server buckets. Only the clock /
// timer and HTTP transport are synthetic; this is not hosted quota evidence.
serviceOwner = ownerA; breakWhileReadingBody = false;
const normalExportTimer = observationScope.setTimeout;
async function checkPacedLargeAccount(size) {
  exportClock = 0;
  const rows = Array.from({ length: size }, (_, index) => ({ ...exportedRows[0],
    client_observation_id: `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  }));
  const originals = JSON.stringify(rows), starts = [];
  let result, bodies = 0;
  observationScope.authorizedFetch = async (_url, options, guards) => {
    assert.equal(guards.expectedUserId, ownerA); assert.equal(guards.retry401, false);
    const request = JSON.parse(options.body);
    assert.equal(request.operation, 'export-page');
    const minute = starts.filter(time => time > exportClock - 60_000).length;
    const hour = starts.filter(time => time > exportClock - 3_600_000).length;
    starts.push(exportClock);
    if (minute >= 12 || hour >= 120) return { ok: false, status: 429 };
    const offset = request.cursor === null ? 0 : Number(request.cursor);
    assert.equal(offset, (starts.length - 1) * 200);
    return { ok: true, json: async () => {
      bodies += 1;
      return { rows: rows.slice(offset, offset + 200), snapshot_at: snapshot,
        next_cursor: offset + 200 < rows.length ? String(offset + 200) : null };
    } };
  };
  await checkExportButton({ readExport: async options => {
    result = await observationScope.exportTrips(options); return result;
  } });
  assert.equal(result.stored_trips.length, size);
  assert.equal(JSON.stringify(result.stored_trips), originals, 'Every original row is exported unchanged.');
  assert.equal(starts.length, Math.ceil(size / 200)); assert.equal(bodies, starts.length);
  assert.equal(starts[11], 0, 'The initial twelve-page burst remains bounded.');
  assert.ok(starts[12] >= 61_000, 'Page thirteen must not hit the first minute.');
  for (let index = 13; index < starts.length; index += 1) {
    assert.ok(starts[index] - starts[index - 1] >= 36_000);
  }
  if (size > 24_000) assert.ok(starts.at(-1) > 3_600_000, 'Exercise the hourly boundary.');
  assert.equal(JSON.stringify(rows), originals);
  assert.equal(storage.size, 0, 'Pacing does not persist partial data or a resume copy.');
}
await checkPacedLargeAccount(2401);
await checkPacedLargeAccount(24401);

// Real refusal remains terminal: pacing is never an automatic 429 retry or
// a promise that competing traffic / the shared daily budget cannot refuse.
const largeAccountRows = Array.from({ length: 2401 }, (_, index) => ({ ...exportedRows[0],
  client_observation_id: `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
}));
const largeAccountOriginals = JSON.stringify(largeAccountRows);
let largePageCalls = 0, readAfterRateRefusal = 0;
observationScope.authorizedFetch = async (_url, options, guards) => {
  assert.equal(guards.expectedUserId, ownerA); assert.equal(guards.retry401, false);
  const request = JSON.parse(options.body);
  assert.equal(request.operation, 'export-page');
  largePageCalls += 1;
  if (largePageCalls > 12) return { ok: false, status: 429, json: async () => {
    readAfterRateRefusal += 1; throw new Error('SYNTHETIC_RATE_BODY_MUST_NOT_BE_READ');
  } };
  const offset = request.cursor === null ? 0 : Number(request.cursor);
  assert.equal(offset, (largePageCalls - 1) * 200);
  return { ok: true, json: async () => ({ rows: largeAccountRows.slice(offset, offset + 200),
    snapshot_at: snapshot, next_cursor: String(offset + 200) }) };
};
await checkExportButton({ fail: true, readExport: () => observationScope.exportTrips() });
assert.equal(largePageCalls, 13, 'No automatic retry after the rate refusal.');
assert.equal(readAfterRateRefusal, 0);
assert.equal(JSON.stringify(largeAccountRows), largeAccountOriginals);
assert.equal(storage.size, 0, 'No partial export or resume copy is stored on the device.');
const refusalFetch = observationScope.authorizedFetch;
for (const boundary of ['close', 'reopen', 'remove', 'cancel', 'owner', 'fresh-owner']) {
  exportClock = 0; largePageCalls = 0; readAfterRateRefusal = 0; serviceOwner = ownerA;
  let waits = 0;
  try {
    await checkExportButton({
      ...(boundary === 'owner' || boundary === 'fresh-owner' ? { fail: true } : { stop: boundary }),
      readExport: (options, { dialog, button }) => {
        observationScope.setTimeout = (callback, delay) => {
          assert.ok(delay > 0 && delay <= 1000);
          exportClock += delay; waits += 1;
          if (boundary === 'close' || boundary === 'reopen') dialog.close();
          if (boundary === 'reopen') dialog.open = true;
          if (boundary === 'remove') button.isConnected = false;
          if (boundary === 'cancel') dialog.cancel();
          if (boundary === 'owner') serviceOwner = ownerB;
          callback();
        };
        observationScope.requireFreshSession = async () => ({ user: { id:
          boundary === 'fresh-owner' && exportClock > 0 ? ownerB : serviceOwner,
        } });
        return observationScope.exportTrips(options);
      },
    });
    assert.equal(largePageCalls, 12, 'The capacity wait never starts page thirteen after loss of authority.');
    assert.equal(readAfterRateRefusal, 0); assert.equal(storage.size, 0);
    assert.equal(waits, boundary === 'fresh-owner' ? 61 : 1);
  } finally {
    observationScope.setTimeout = normalExportTimer;
    observationScope.requireFreshSession = originalFreshSession;
    observationScope.authorizedFetch = refusalFetch;
    serviceOwner = ownerA;
  }
}
// One genuine elapsed timer through the SAME normal service/UI entry. The
// DOM/auth/HTTP payloads remain synthetic; this is not a live browser proof.
const virtualExportPerformance = observationScope.performance;
largePageCalls = 0; readAfterRateRefusal = 0;
let actualWaits = 0;
try {
  await checkExportButton({ stop: 'close', readExport: (options, { dialog }) => {
    observationScope.performance = performance;
    observationScope.setTimeout = (callback, delay) => {
      actualWaits += 1;
      assert.ok(delay > 0 && delay <= 1000);
      return setTimeout(() => { dialog.close(); callback(); }, delay);
    };
    return observationScope.exportTrips(options);
  } });
  assert.equal(actualWaits, 1); assert.equal(largePageCalls, 12);
  assert.equal(readAfterRateRefusal, 0); assert.equal(storage.size, 0);
} finally {
  observationScope.performance = virtualExportPerformance;
  observationScope.setTimeout = normalExportTimer;
}
const translations = fs.readFileSync('js/i18n.js', 'utf8');
for (const key of ['exportTrips', 'exportTripsScope', 'exportTripsWorking', 'exportTripsReady', 'exportTripsFailed']) {
  assert.equal([...translations.matchAll(new RegExp(`'account\\.${key}':`, 'g'))].length, 3);
}
console.log('Konto/turlog bevares; normal service/UI har 501-/2401-/24401-turs eksport med virtuelt kapacitetstempo og ærlig rateafvisning uden retry/delfil offline.');

}

// Whole actual auth/service/collector/renderer export controls; ordinary relative imports.

{
const { default: test } = await import('node:test');
const { default: vm } = await import('node:vm');
const { collectOwnTripExport } = await import('../js/services/own-trip-export.js');

// Execute the actual auth -> observation service -> collector -> account click.
// Only import/export declarations are removed for the existing VM seam. Auth
// functions, session/epoch state, service and renderer are NOT facades. HTTP,
// browser storage/DOM and the pacing clock are synthetic; no hosted proof.
const source = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
const authBody = source('../js/services/auth-service.js');
const serviceBody = source('../js/services/observation-service.js');
const accountBody = source('../js/ui/account-panel.js');
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const snapshot = '2026-10-01T00:00:00.000Z';
const config = { supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'synthetic-public-key' };
const sessionFor = (owner = ownerA, token = 'synthetic-original', expires = 9_999_999_999) => ({
  access_token: token, refresh_token: 'synthetic-refresh-original', expires_at: expires, user: { id: owner },
});
function deferred() {
  let resolve;
  const promise = new Promise(complete => { resolve = complete; });
  return { promise, resolve };
}

async function scenario(boundary, action, fixture = {}) {
  const total = boundary === 'pacing' ? 2401 : 501;
  const rows = Array.from({ length: total }, (_, index) => ({
    client_observation_id: `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    observed_at: '2026-08-01T00:00:00.000Z', schema_version: 1, result: 'none',
  }));
  if (fixture.overBytes) rows[0].syntheticOversize = 'x'.repeat(20 * 1024 * 1024);
  if (fixture.foreignOwnerField) rows[0].user_id = ownerB;
  const originalRows = JSON.stringify(rows);
  const local = [{ id: 'local-own', user_id: ownerA }, { id: 'local-other', user_id: ownerB }, { id: 'anonymous' }];
  const pending = [{ id: 'pending-own', user_id: ownerA }, { id: 'pending-other', user_id: ownerB }];
  const stored = new Map([
    ['ravradar-auth-session', JSON.stringify(sessionFor(ownerA, 'synthetic-original', boundary === 'initial-refresh' ? 1 : undefined))],
    ['ravradar-observations-v2', JSON.stringify(local)],
    ['ravradar-observation-outbox-v1', JSON.stringify(pending)],
  ]);
  const originalLocal = stored.get('ravradar-observations-v2'), originalPending = stored.get('ravradar-observation-outbox-v1');
  const requests = [], routes = [], refreshes = [], blobs = [], revoked = [], operations = [], jobs = [];
  const timers = new Set(), listeners = new Map();
  let fireBodyDeadline, completedBeforeRelease = false;
  const reached = deferred(), release = deferred(), choiceReached = deferred(), choiceRelease = deferred();
  let bodyReads = 0, localReads = 0, downloads = 0, clock = 0, pacingStarted = false, click;
  let nextOwner = ownerA;
  const storage = {
    getItem(key) { if (key !== 'ravradar-auth-session') localReads += 1; return stored.get(key) ?? null; },
    setItem(key, value) { assert.equal(key, 'ravradar-auth-session'); stored.set(key, String(value)); },
    removeItem(key) { assert.equal(key, 'ravradar-auth-session'); stored.delete(key); },
  };
  const authScope = {
    PUBLIC_CONFIG: config, localStorage: storage, AbortController, DOMException, URLSearchParams,
    location: { hash: '', pathname: '/', search: '' }, history: { replaceState() {} },
    setTimeout(callback, delay) {
      if (fixture.deadline) {
        assert.equal(delay, 12_000, 'Original auth deadline, not a new export budget');
        const token = {}; timers.add(token);
        fireBodyDeadline = () => { timers.delete(token); callback(); };
        return token;
      }
      const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
      timers.add(timer); return timer;
    },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    async fetch(input, options) {
      const url = new URL(input);
      assert.equal(url.origin, config.supabaseUrl, 'No external HTTP');
      routes.push(url.pathname + url.search);
      if (url.pathname === '/functions/v1/trip-log') {
        assert.equal(options.method, 'POST');
        const payload = JSON.parse(options.body);
        assert.deepEqual(Object.keys(payload).sort(), ['cursor', 'operation']);
        assert.equal(payload.operation, 'export-page');
        const offset = payload.cursor === null ? 0 : Number(payload.cursor);
        assert.equal(offset, requests.length * 200, 'No retry or missing page');
        requests.push({ offset, token: options.headers.Authorization });
        if (boundary === 'headers' && requests.length === 1) { reached.resolve(); await release.promise; }
        const ok = boundary !== '401';
        return { ok, status: ok ? 200 : 401, async json() {
          bodyReads += 1;
          if (boundary === 'body' && bodyReads === 1) { reached.resolve(); await release.promise; }
          return { rows: rows.slice(offset, offset + 200), snapshot_at: snapshot,
            next_cursor: offset + 200 < total ? String(offset + 200) : null };
        } };
      }
      if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
        assert.equal(options.headers.Authorization, undefined);
        refreshes.push(JSON.parse(options.body));
        if (boundary === 'initial-refresh') { reached.resolve(); await release.promise; }
        // The actual auth code must preserve the original refresh token.
        return Response.json({ access_token: 'synthetic-renewed', expires_at: 9_999_999_999, user: { id: fixture.refreshOwner ?? ownerA } });
      }
      if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
        const chosen = sessionFor(nextOwner, 'synthetic-new-login');
        if (fixture.pendingChoice) {
          if (fixture.choiceBody) return { ok: true, status: 200, async json() { choiceReached.resolve(); await choiceRelease.promise; return chosen; } };
          choiceReached.resolve(); await choiceRelease.promise;
        }
        return Response.json(chosen);
      }
      if (url.pathname === '/auth/v1/logout') {
        if (fixture.pendingChoice) {
          if (fixture.choiceBody) return { ok: true, status: 200, async json() { choiceReached.resolve(); await choiceRelease.promise; return {}; } };
          choiceReached.resolve(); await choiceRelease.promise;
        }
        return Response.json({});
      }
      if (url.pathname === '/auth/v1/user') {
        assert.equal(options.headers.Authorization, 'Bearer synthetic-callback');
        return Response.json({ id: ownerA });
      }
      throw new Error('UNEXPECTED_SYNTHETIC_AUTH_ROUTE');
    },
  };
  vm.runInNewContext(`${authBody}\nthis.api = { authEnabled, authIdentityEpoch, currentSession, requireFreshSession,
    authorizedFetch, refreshSession, signOut, signInWithPassword, consumeAuthCallback };`, authScope,
  { filename: 'actual-auth-for-export-integration.js' });
  const auth = authScope.api;
  const serviceScope = {
    ...auth, PUBLIC_CONFIG: config, localStorage: storage, collectOwnTripExport,
    performance: { now: () => clock },
    setTimeout(callback, delay) {
      assert.ok(delay > 0 && delay <= 1000, 'Only the actual service pacing chunks');
      const job = (async () => {
        if (boundary === 'pacing' && !pacingStarted) {
          pacingStarted = true; reached.resolve(); await release.promise;
        }
        clock += delay; callback();
      })();
      jobs.push(job);
    },
  };
  vm.runInNewContext(`${serviceBody}\nthis.getOwnTripExport = getOwnTripExport;`, serviceScope,
    { filename: 'actual-observation-service-for-auth-export-integration.js' });
  const status = { textContent: '' };
  const button = { isConnected: true, disabled: false,
    addEventListener(type, handler) { assert.equal(type, 'click'); click = handler; } };
  const content = { innerHTML: '', querySelector: selector => selector === '#tripExportButton' ? button
    : selector === '#tripExportStatus' ? status : null };
  const dialog = { open: true, querySelector: () => content,
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type); } };
  const accountScope = {
    ...auth, getOwnTripExport: serviceScope.getOwnTripExport, t: key => key, Blob,
    URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:synthetic-only'; }, revokeObjectURL: value => revoked.push(value) },
    document: { createElement(tag) { assert.equal(tag, 'a'); return { click() { downloads += 1; } }; } },
    setTimeout(callback, delay) { assert.equal(delay, 0); jobs.push(Promise.resolve().then(callback)); },
  };
  vm.runInNewContext(`${accountBody}\nthis.openAccountDialog = openAccountDialog;`, accountScope,
    { filename: 'actual-account-renderer-for-auth-export-integration.js' });
  const track = promise => { operations.push(promise); return promise; };
  let completion, transitionRequests = null;
  try {
    if (boundary === 'initial-refresh') {
      // Register the explicit callback on the SAME real pending refresh before
      // the normal export's requireFreshSession continuation. No auth mock.
      const refreshing = track(auth.refreshSession());
      if (action === 'callback') track(refreshing.then(() => {
        authScope.location.hash = '#access_token=synthetic-callback&refresh_token=synthetic-callback-refresh&expires_in=3600';
        return auth.consumeAuthCallback();
      }));
    }
    accountScope.openAccountDialog(dialog);
    assert.equal(typeof click, 'function');
    completion = track(click({ currentTarget: button }));
    if (boundary !== '401' && boundary !== 'oversized') {
      await Promise.race([reached.promise, completion.then(() => { throw new Error('Expected asynchronous boundary not reached'); })]);
      transitionRequests = requests.length;
      if (action === 'renewal' && boundary !== 'initial-refresh') await track(auth.refreshSession({ force: true }));
      if (action === 'same-owner-login' || action === 'different-owner-login') {
        await track(auth.signOut());
        assert.equal(auth.currentSession(), null);
        nextOwner = action === 'different-owner-login' ? ownerB : ownerA;
        await track(auth.signInWithPassword('synthetic@example.invalid', 'synthetic-only'));
      }
      if (fixture.deadline) {
        const originalDeadline=fireBodyDeadline;
        if (fixture.renewBeforeDeadline) await track(auth.refreshSession({ force: true }));
        originalDeadline();
        let observer;
        try { completedBeforeRelease = await Promise.race([completion.then(() => true), new Promise(resolve => { observer=setTimeout(() => resolve(false), 50); })]); }
        finally { clearTimeout(observer); }
      }
      if (fixture.inspect) {
        if (action === 'pending-login') {
          nextOwner = fixture.sameOwner ? ownerA : ownerB;
          track(auth.signInWithPassword('synthetic@example.invalid', 'synthetic-only'));
          await choiceReached.promise;
        } else if (action === 'pending-logout') {
          track(auth.signOut()); await choiceReached.promise;
        } else if (action === 'remote-owner-renewal') {
          await track(auth.refreshSession({ force: true }));
        } else if (action === 'close' || action === 'cancel' || action === 'close-reopen') {
          dialog.open = false; listeners.get(action === 'cancel' ? 'cancel' : 'close')?.();
          if (action === 'close-reopen') dialog.open = true;
        }
      }
      release.resolve();
    }
    await completion;
  } finally {
    release.resolve(); choiceRelease.resolve();
    await Promise.allSettled(operations);
    await Promise.all(jobs);
    const leaked = timers.size;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    assert.equal(leaked, 0, 'The actual auth clears every timeout guard');
    assert.equal(listeners.size, 0);
    assert.equal(button.disabled, false);
    assert.equal(JSON.stringify(rows), originalRows);
    assert.equal(stored.get('ravradar-observations-v2'), originalLocal);
    assert.equal(stored.get('ravradar-observation-outbox-v1'), originalPending);
  }
  if (fixture.inspect) return { downloads, blobs: blobs.length, revoked: revoked.length,
    completedBeforeRelease, localReads, bodyReads, requests, refreshes, transitionRequests, status: status.textContent,
    epoch: auth.authIdentityEpoch(), finalOwner: auth.currentSession()?.user?.id ?? null, clock };
  const allowed = action === 'renewal';
  assert.equal(blobs.length, allowed ? 1 : 0);
  assert.equal(downloads, allowed ? 1 : 0);
  assert.equal(revoked.length, allowed ? 1 : 0);
  assert.equal(auth.currentSession().user.id, nextOwner);
  if (allowed) {
    assert.equal(status.textContent, 'account.exportTripsReady');
    assert.equal(auth.authIdentityEpoch(), 0);
    assert.equal(auth.currentSession().refresh_token, 'synthetic-refresh-original');
    assert.equal(refreshes.length, 1);
    assert.equal(requests.length, Math.ceil(total / 200));
    assert.equal(requests.at(-1).token, 'Bearer synthetic-renewed');
    assert.equal(localReads, 2);
    const file = JSON.parse(await blobs[0].text());
    assert.deepEqual(file.stored_trips, rows);
    assert.deepEqual(file.device_trips, [local[0]]);
    assert.deepEqual(file.pending_trips, [pending[0]]);
    assert.equal(file.snapshot_at, snapshot);
    if (boundary === 'pacing') assert.equal(clock, 61_000);
  } else {
    assert.notEqual(status.textContent, 'account.exportTripsReady');
    assert.equal(localReads, 0);
    if (boundary === '401') {
      assert.equal(requests.length, 1); assert.equal(bodyReads, 0);
      assert.equal(refreshes.length, 0); assert.equal(routes.length, 1);
      assert.equal(status.textContent, 'account.exportTripsFailed');
    } else {
      assert.equal(transitionRequests, boundary === 'initial-refresh' ? 0 : boundary === 'pacing' ? 12 : 1);
      assert.equal(requests.length, transitionRequests, 'No subsequent page belongs to a new login');
      assert.equal(auth.authIdentityEpoch(), action === 'callback' ? 1 : 2);
      assert.equal(auth.currentSession().access_token, action === 'callback' ? 'synthetic-callback' : 'synthetic-new-login');
    }
  }
}

for (const boundary of ['body', 'pacing', 'initial-refresh']) {
  test(`actual auth/export/click permits same-login renewal during ${boundary}`, () => scenario(boundary, 'renewal'));
  const action = boundary === 'initial-refresh' ? 'callback' : 'same-owner-login';
  test(`actual auth/export/click rejects ${action} during ${boundary}`, () => scenario(boundary, action));
}
test('actual auth/export/click rejects different-owner login during body', () => scenario('body', 'different-owner-login'));
test('actual auth/export/click never retries a page 401 or downloads a partial file', () => scenario('401', 'refused'));

for (const renewBeforeDeadline of [false, true]) test('561 export deadline covers awaited JSON with same-login renewal=' + renewBeforeDeadline, async () => {
  const result=await scenario('body', 'deadline', {inspect:true,deadline:true,renewBeforeDeadline});
  assert.equal(result.completedBeforeRelease,true,'Must settle before the withheld response body is released');
  assert.equal(result.downloads,0); assert.equal(result.blobs,0); assert.equal(result.localReads,0);
  assert.equal(result.requests.length,1); assert.equal(result.bodyReads,1);
  assert.notEqual(result.status,'account.exportTripsReady');
});
for (const boundary of ['headers', 'body', 'pacing']) {
  for (const action of ['pending-login', 'pending-logout']) {
    test('rebased actual export rejects ' + action + ' during ' + boundary, async () => {
      const result = await scenario(boundary, action, { inspect: true, pendingChoice: true,
        sameOwner: boundary === 'body', choiceBody: boundary === 'body' });
      assert.equal(result.downloads, 0); assert.equal(result.blobs, 0); assert.equal(result.revoked, 0);
      assert.equal(result.localReads, 0); assert.notEqual(result.status, 'account.exportTripsReady');
      assert.equal(result.requests.length, boundary === 'pacing' ? 12 : 1);
      assert.equal(result.requests.length, result.transitionRequests, 'No next page after changed intent');
      assert.ok(result.requests.every(row => row.token === 'Bearer synthetic-original'));
      assert.equal(result.bodyReads, boundary === 'headers' ? 0 : boundary === 'pacing' ? 12 : 1);
      assert.equal(result.refreshes.length, 0);
    });
  }
}
for (const action of ['close', 'cancel', 'close-reopen']) {
  test('rebased actual export cancellation during held body: ' + action, async () => {
    const result = await scenario('body', action, { inspect: true });
    assert.equal(result.downloads, 0); assert.equal(result.blobs, 0); assert.equal(result.localReads, 0);
    assert.equal(result.requests.length, 1); assert.notEqual(result.status, 'account.exportTripsReady');
  });
}
test('rebased actual export cancellation during held pagination starts no page13', async () => {
  const result = await scenario('pacing', 'cancel', { inspect: true });
  assert.equal(result.downloads, 0); assert.equal(result.blobs, 0); assert.equal(result.localReads, 0);
  assert.equal(result.requests.length, 12); assert.equal(result.bodyReads, 12);
  assert.notEqual(result.status, 'account.exportTripsReady');
});
test('rebased actual export rejects remote renewal to another owner without an epoch change', async () => {
  const result = await scenario('body', 'remote-owner-renewal', { inspect: true, refreshOwner: ownerB });
  assert.equal(result.epoch, 0); assert.equal(result.finalOwner, ownerB); assert.equal(result.refreshes.length, 1);
  assert.equal(result.requests.length, 1); assert.equal(result.localReads, 0);
  assert.equal(result.downloads, 0); assert.equal(result.blobs, 0);
});
test('rebased actual export rejects a remote row carrying a foreign identity field', async () => {
  const result = await scenario('body', 'untrusted-owner-field', { inspect: true, foreignOwnerField: true });
  assert.equal(result.finalOwner, ownerA); assert.equal(result.requests.length, 1);
  assert.equal(result.localReads, 0); assert.equal(result.downloads, 0); assert.equal(result.blobs, 0);
  assert.equal(result.status, 'account.exportTripsFailed');
});
test('rebased actual export over20MiB refuses before local read and never downloads a partial file', async () => {
  const result = await scenario('oversized', 'over-limit', { inspect: true, overBytes: true });
  assert.equal(result.requests.length, 1); assert.equal(result.bodyReads, 1);
  assert.equal(result.localReads, 0); assert.equal(result.downloads, 0); assert.equal(result.blobs, 0);
  assert.equal(result.status, 'account.exportTripsFailed');
});

}

{
const { default: test } = await import('node:test');
const { default: vm } = await import('node:vm');
const { collectOwnTripExport } = await import('../js/services/own-trip-export.js');

// Actual auth implementation through the existing VM/HTTP seam. Only module
// declarations, public config, browser storage and HTTP transport are supplied
// by this test; no auth function, epoch guard or retry implementation is mocked.
const authSource = fs.readFileSync(new URL('../js/services/auth-service.js', import.meta.url), 'utf8');
const authBody = authSource.replace(/^import[^\n]+\r?\n/gm, '').replace(/^export\s+/gm, '');
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const endpoint = 'https://example.invalid/functions/v1/trip-log';
const requestBody = JSON.stringify({ operation: 'export-page', cursor: null });
const sessionFor = (owner, token = 'synthetic-original') => ({
  access_token: token, refresh_token: `synthetic-refresh-${owner}`, expires_at: 9_999_999_999, user: { id: owner },
});
const deferred = () => {
  let resolve;
  const promise = new Promise(complete => { resolve = complete; });
  return { promise, resolve };
};

function authHarness({ initial = sessionFor(ownerA), resourceStatuses = [200], holdFirst = false, nextLogin = sessionFor(ownerB) } = {}) {
  const stored = new Map([['ravradar-auth-session', JSON.stringify(initial)]]);
  const requests = [], refreshes = [], logins = [], allCalls = [], operations = [], timers = new Set();
  const started = deferred(), heldResponse = deferred();
  const scope = {
    PUBLIC_CONFIG: { supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'synthetic-public-key' },
    AbortController, DOMException,
    setTimeout(callback, delay) {
      const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
      timers.add(timer);
      return timer;
    },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, String(value)),
      removeItem: key => stored.delete(key),
    },
    async fetch(input, options) {
      const url = new URL(input);
      assert.equal(url.origin, 'https://example.invalid', 'Never call an external host');
      allCalls.push(url.pathname + url.search);
      if (url.pathname === '/functions/v1/trip-log') {
        requests.push({ authorization: options.headers.Authorization, body: options.body });
        started.resolve();
        if (holdFirst && requests.length === 1) return heldResponse.promise;
        const status = resourceStatuses[requests.length - 1];
        assert.ok(status, 'No unplanned resource retry');
        return Response.json({ synthetic: true }, { status });
      }
      if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.Authorization, undefined);
        refreshes.push(JSON.parse(options.body));
        return Response.json({ access_token: 'synthetic-renewed', expires_at: 9_999_999_999, user: initial.user });
      }
      if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
        logins.push(JSON.parse(options.body));
        return Response.json(nextLogin);
      }
      throw new Error('UNEXPECTED_SYNTHETIC_AUTH_ROUTE');
    },
  };
  vm.runInNewContext(`${authBody}\nthis.api = { authorizedFetch, signInWithPassword, currentSession, authIdentityEpoch };`, scope, {
    filename: 'actual-auth-service-with-held-synthetic-http.js',
  });
  return {
    api: scope.api, stored, requests, refreshes, logins, allCalls, started, heldResponse,
    invoke(guards = {}) {
      const operation = scope.api.authorizedFetch(endpoint, { method: 'POST', body: requestBody }, guards)
        .then(value => ({ ok: true, value }), error => ({ ok: false, error }));
      operations.push(operation);
      return operation;
    },
    async close() {
      heldResponse.resolve(Response.json({ synthetic: true }));
      await Promise.all(operations);
      const leaked = timers.size;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      assert.equal(leaked, 0, 'Every actual auth timeout guard must already be cleared');
    },
  };
}

test('expected owner rejects a wrong starting account before any HTTP', async context => {
  const harness = authHarness({ initial: sessionFor(ownerB) });
  context.after(() => harness.close());
  const result = await harness.invoke({ expectedUserId: ownerA });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /Kontoen blev ændret/);
  assert.equal(harness.allCalls.length, 0);
  assert.equal(harness.api.currentSession().user.id, ownerB);
  assert.equal(harness.api.authIdentityEpoch(), 0);
});

test('expected owner preserves the normal same-login 401 refresh and one retry', async context => {
  const harness = authHarness({ resourceStatuses: [401, 200] });
  context.after(() => harness.close());
  const result = await harness.invoke({ expectedUserId: ownerA });
  assert.equal(result.ok, true, result.error?.message);
  assert.equal(result.value.status, 200);
  assert.deepEqual(harness.requests, [
    { authorization: 'Bearer synthetic-original', body: requestBody },
    { authorization: 'Bearer synthetic-renewed', body: requestBody },
  ]);
  assert.deepEqual(harness.refreshes, [{ refresh_token: sessionFor(ownerA).refresh_token }]);
  assert.equal(harness.api.currentSession().refresh_token, sessionFor(ownerA).refresh_token, 'Keep the original refresh token when renewal omits it');
  assert.equal(harness.api.authIdentityEpoch(), 0);
});

for (const nextOwner of [ownerA, ownerB]) {
  test(`an old held 401 cannot refresh/retry after explicit ${nextOwner === ownerA ? 'same-owner' : 'different-owner'} login`, async context => {
    const harness = authHarness({ holdFirst: true, nextLogin: sessionFor(nextOwner, 'synthetic-explicit-new-login') });
    context.after(() => harness.close());
    const pending = harness.invoke({ expectedUserId: ownerA });
    await harness.started.promise;
    assert.equal(harness.requests.length, 1);
    await harness.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
    const chosenSession = harness.api.currentSession(), saved = harness.stored.get('ravradar-auth-session');
    assert.equal(chosenSession.user.id, nextOwner);
    assert.equal(harness.api.authIdentityEpoch(), 1);
    harness.heldResponse.resolve(Response.json({ synthetic: true }, { status: 401 }));
    const result = await pending;
    assert.equal(result.ok, false);
    assert.match(result.error.message, /Kontoen blev ændret/);
    assert.equal(harness.refreshes.length, 0);
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.logins.length, 1);
    assert.equal(harness.api.currentSession(), chosenSession);
    assert.equal(harness.stored.get('ravradar-auth-session'), saved);
  });
}

test('export retry401:false returns the first 401 without refreshing', async context => {
  const harness = authHarness({ resourceStatuses: [401] });
  context.after(() => harness.close());
  const result = await harness.invoke({ expectedUserId: ownerA, retry401: false });
  assert.equal(result.ok, true, result.error?.message);
  assert.equal(result.value.status, 401);
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.refreshes.length, 0);
  assert.equal(harness.allCalls.length, 1);
  assert.equal(harness.api.authIdentityEpoch(), 0);
});

test('rebased optional owner pin leaves the normal default authorized caller unchanged', async context => {
  const harness = authHarness({ initial: sessionFor(ownerB) }); context.after(() => harness.close());
  const result = await harness.invoke(); assert.equal(result.ok, true);
  assert.equal(harness.requests.length, 1); assert.equal(harness.requests[0].authorization, 'Bearer synthetic-original');
  assert.equal(harness.api.currentSession().user.id, ownerB); assert.equal(harness.api.authIdentityEpoch(), 0);
});
test('rebased normal explicit login can immediately make an unpinned default request', async context => {
  const harness = authHarness(); context.after(() => harness.close());
  await harness.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
  const result = await harness.invoke(); assert.equal(result.ok, true);
  assert.equal(harness.api.currentSession().user.id, ownerB); assert.equal(harness.api.authIdentityEpoch(), 1);
  assert.equal(harness.requests.length, 1);
});

}

{
const { default: test } = await import('node:test');
const { default: vm } = await import('node:vm');
const { collectOwnTripExport } = await import('../js/services/own-trip-export.js');

// Actual existing auth -> export service -> collector -> account click.
// Declarations only are removed for the established VM seam. This target
// starts a NEW export while an earlier explicit auth choice is awaiting HTTP.
const source = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
const authBody = source('../js/services/auth-service.js');
const serviceBody = source('../js/services/observation-service.js');
const accountBody = source('../js/ui/account-panel.js');
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const sessionFor = (owner = ownerA, token = 'synthetic-original') => ({
  access_token: token, refresh_token: 'synthetic-refresh', expires_at: 9_999_999_999, user: { id: owner },
});
const defer = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function scenario(action) {
  const config = { supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'synthetic-key' };
  const rows = [{ client_observation_id: 'a0000000-0000-4000-8000-000000000001', schema_version: 1, result: 'none' }];
  const local = JSON.stringify([{ id: 'local-original-A', user_id: ownerA }, { id: 'local-other-B', user_id: ownerB }]);
  const pending = JSON.stringify([{ id: 'pending-original-A', user_id: ownerA }]);
  const stored = new Map([['ravradar-auth-session', JSON.stringify(sessionFor())],
    ['ravradar-observations-v2', local], ['ravradar-observation-outbox-v1', pending]]);
  const reached = defer(), release = defer();
  const timers = new Set(), operations = [], jobs = [], calls = [], pages = [], blobs = [], revoked = [], dialogListeners = new Map();
  let downloads = 0, reads = 0;
  const storage = {
    getItem(key) { if (key !== 'ravradar-auth-session') reads++; return stored.get(key) ?? null; },
    setItem(key, value) { assert.equal(key, 'ravradar-auth-session'); stored.set(key, String(value)); },
    removeItem(key) { assert.equal(key, 'ravradar-auth-session'); stored.delete(key); },
  };
  const authScope = {
    PUBLIC_CONFIG: config, localStorage: storage, AbortController, DOMException, URLSearchParams,
    location: { hash: '', pathname: '/', search: '' }, history: { replaceState() {} },
    setTimeout(callback, delay) { const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay); timers.add(timer); return timer; },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    async fetch(input, options) {
      const url = new URL(input);
      assert.equal(url.origin, config.supabaseUrl, 'Only the synthetic normal HTTP seam');
      calls.push(url.pathname + url.search);
      if (url.pathname === '/functions/v1/trip-log') {
        assert.equal(options.headers.Authorization, 'Bearer synthetic-original');
        assert.deepEqual(JSON.parse(options.body), { operation: 'export-page', cursor: null });
        pages.push(options.headers.Authorization);
        return Response.json({ rows, snapshot_at: '2026-10-01T00:00:00.000Z', next_cursor: null });
      }
      if (url.pathname === '/auth/v1/logout') {
        assert.equal(action, 'logout');
        assert.equal(options.headers.Authorization, 'Bearer synthetic-original');
        reached.resolve(); await release.promise;
        return Response.json({});
      }
      if (url.pathname === '/auth/v1/token') {
        const grant = url.searchParams.get('grant_type');
        assert.equal(grant, action === 'renewal' ? 'refresh_token' : 'password');
        reached.resolve(); await release.promise;
        return Response.json(sessionFor(action === 'other-login' ? ownerB : ownerA, action === 'renewal' ? 'synthetic-renewed' : 'synthetic-new-login'));
      }
      throw new Error('UNEXPECTED_SYNTHETIC_ROUTE');
    },
  };
  vm.runInNewContext(`${authBody}\nthis.api={authEnabled,authIdentityEpoch,currentSession,requireFreshSession,authorizedFetch,refreshSession,signOut,signInWithPassword};`, authScope);
  const auth = authScope.api;
  const serviceScope = { ...auth, PUBLIC_CONFIG: config, localStorage: storage, collectOwnTripExport,
    performance: { now: () => 0 }, setTimeout() { throw new Error('Unexpected pacing on one page'); } };
  vm.runInNewContext(`${serviceBody}\nthis.getOwnTripExport=getOwnTripExport;`, serviceScope);
  const nodes = new Map();
  for (const id of ['tripExportButton', 'signOutButton']) nodes.set(id, { disabled: false, isConnected: true, handlers: new Map(),
    addEventListener(type, listener) { this.handlers.set(type, listener); } });
  nodes.set('tripExportStatus', { textContent: '' });
  const content = { innerHTML: '', querySelector(selector) { return this.innerHTML.includes(`id="${selector.slice(1)}"`) ? nodes.get(selector.slice(1)) ?? null : null; } };
  const dialog = { open: true, querySelector: () => content,
    addEventListener: (name, listener) => dialogListeners.set(name, listener),
    removeEventListener(name, listener) { if (dialogListeners.get(name) === listener) dialogListeners.delete(name); } };
  const uiScope = { ...auth, getOwnTripExport: serviceScope.getOwnTripExport, t: key => key, Blob,
    URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:synthetic-only'; }, revokeObjectURL: href => revoked.push(href) },
    document: { createElement(tag) { assert.equal(tag, 'a'); return { click() { downloads++; } }; } },
    setTimeout(callback, delay) { assert.equal(delay, 0); jobs.push(Promise.resolve().then(callback)); },
  };
  vm.runInNewContext(`${accountBody}\nthis.openAccountDialog=openAccountDialog;`, uiScope);
  const track = operation => { operations.push(operation); return operation; };
  let transition, beforeRelease;
  try {
    uiScope.openAccountDialog(dialog);
    const button = nodes.get('tripExportButton');
    if (action === 'logout') transition = track(nodes.get('signOutButton').handlers.get('click')());
    else if (action === 'renewal') transition = track(auth.refreshSession({ force: true }));
    else if (action !== 'unchanged') transition = track(auth.signInWithPassword('synthetic@example.invalid', 'synthetic-only'));
    if (transition) await Promise.race([reached.promise, transition.then(() => { throw new Error('Held auth request not reached'); })]);
    assert.equal(auth.currentSession()?.user?.id, ownerA, 'The original session is still current while auth awaits');
    assert.equal(button.disabled, false, 'This is a normal enabled user click, not disabled dispatch');
    const exportOperation = track(button.handlers.get('click')({ currentTarget: button }));
    await exportOperation;
    beforeRelease = { epoch: auth.authIdentityEpoch(), owner: auth.currentSession()?.user?.id,
      pages: pages.length, downloads, blobs: blobs.length, reads, status: nodes.get('tripExportStatus').textContent };
  } finally {
    release.resolve();
    await Promise.allSettled(operations);
    await Promise.all(jobs);
    const leaked = timers.size;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    assert.equal(leaked, 0);
    assert.equal(dialogListeners.size, 0);
    assert.equal(stored.get('ravradar-observations-v2'), local);
    assert.equal(stored.get('ravradar-observation-outbox-v1'), pending);
  }
  const allowed = action === 'unchanged' || action === 'renewal';
  console.log(JSON.stringify({ action, beforeRelease, finalOwner: auth.currentSession()?.user?.id ?? null, calls, realNetwork: 0 }));
  assert.equal(beforeRelease.pages, allowed ? 1 : 0, 'A new export cannot borrow the old session during an explicit unfinished auth choice');
  assert.equal(beforeRelease.blobs, allowed ? 1 : 0);
  assert.equal(beforeRelease.downloads, allowed ? 1 : 0);
  assert.equal(beforeRelease.reads, allowed ? 2 : 0);
  assert.equal(revoked.length, allowed ? 1 : 0);
  if (allowed) {
    assert.equal(beforeRelease.status, 'account.exportTripsReady');
    const file = JSON.parse(await blobs[0].text());
    assert.deepEqual(file.stored_trips, rows);
    assert.deepEqual(file.device_trips, [JSON.parse(local)[0]]);
    assert.deepEqual(file.pending_trips, JSON.parse(pending));
  } else assert.notEqual(beforeRelease.status, 'account.exportTripsReady');
}

for (const action of ['logout', 'same-login', 'other-login', 'unchanged', 'renewal'])
  test(`new normal export while ${action} is awaiting: preserve explicit login intent`, () => scenario(action));

}
