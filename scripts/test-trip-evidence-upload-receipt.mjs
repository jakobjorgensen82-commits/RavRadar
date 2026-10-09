import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as trip from '../js/services/trip-evidence-contract.js';
import * as quality from '../js/services/calibration-eligibility.js';
import * as model from '../js/core/ravscore-model-contract.js';
import * as account from '../js/services/account-trip-report-contract.js';
import { createTripEvidenceController } from '../js/services/trip-evidence-controller.js';
import { listPendingTripEvidence, tripEvidenceStorageKeys } from '../js/services/trip-evidence-store.js';

// Real controller/uploader/store plus actual auth/service bodies in the existing
// VM seam. Only HTTP, browser storage and timer ownership are synthetic.
const source = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
const authBody = source('../js/services/auth-service.js');
const serviceBody = source('../js/services/observation-service.js');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const firstTrip = '11111111-1111-4111-8111-111111111111';
const secondTrip = '22222222-2222-4222-8222-222222222222';
const binding = model.ravScoreModelBinding();
const start = id => ({ tripId: id, startedAt: '2026-08-23T06:00:00.000Z', mode: 'waders',
  zoneId: 'DK-B04-12', coastalPartId: 'DK-B04-12-P01', forecastCalibrationEligible: true, dataQualityFlags: [],
  forecastSnapshot: { id: 'rr-synthetic-210', issuedAt: '2026-08-23T05:00:00.000Z',
    validAt: '2026-08-23T06:00:00.000Z', capturedAt: '2026-08-23T06:00:00.000Z' },
  calibrationFeatures: { modelVersion: binding.modelId, appVersion: '4.0.317', modelStateVersion: binding.stateSchemaVersion,
    modelVariantId: binding.variantId, modelProfileId: binding.profileId, modelComponentSchemaId: binding.componentSchemaId,
    modelExplanationSchemaId: binding.explanationSchemaId, modelRankingPolicyId: binding.rankingPolicyId,
    modelBestTimePolicyId: binding.bestTimePolicyId, modelPresentationPolicyId: binding.presentationPolicyId,
    modelContractSha256: binding.modelContractSha256, modelBundleSha256: binding.modelBundleSha256,
    totalScore: 50, scoreBoundLower: 50, scoreBoundUpper: 50, scoreBoundModelUncertaintyPoints: 0,
    scoreBoundRawLower: 50, scoreBoundRawUpper: 50, historyCoverageHours: 48, scoreQuality: 'FULL_HISTORY',
    scoreSemantics: 'EXACT_POINT_SCORE', scoreCalibrationEligible: true, conservativeTailResetApplied: false,
    historyReasonCodes: [], huntabilityScore: 50, transportScore: 50, mobilisationScore: 50, reasonCodes: [] } });
const stop = { endedAt: '2026-08-23T07:00:00.000Z' };
const answer = { zoneId: 'DK-B04-12', coastalPartId: 'DK-B04-12-P01', searchCoverage: 'normal', found: false, grams: null };
const sessionFor = owner => ({ access_token: 'synthetic-token', refresh_token: 'synthetic-refresh',
  expires_at: 9_999_999_999, user: { id: owner } });
const payload = id => trip.toObservationTripColumns(trip.completeTripEvidence(trip.createTripStartRecord(start(id)), { ...answer, ...stop }));
const clean = value => JSON.parse(JSON.stringify(value));

function harness(owner = A, hydrated = true) {
  const values = new Map(owner ? [['ravradar-auth-session', JSON.stringify(hydrated ? sessionFor(owner) : { ...sessionFor(owner), user: null })]] : []);
  const timers = new Set();
  const state = { failSubmit: true, nextOwner: owner, submits: [], writes: [], failWrite: null };
  const storage = { values, getItem: key => values.get(key) ?? null,
    setItem(key, value) { state.writes.push(key); if (state.failWrite?.key === key) throw state.failWrite.error; values.set(key, String(value)); },
    removeItem: key => values.delete(key) };
  const config = { supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'synthetic-public' };
  const fetch = async (input, options) => {
    const url = new URL(input); assert.equal(url.origin, config.supabaseUrl);
    if (url.pathname === '/auth/v1/user') {
      state.hydration.reached(); await state.hydration.promise;
      return Response.json({ id: owner });
    }
    if (url.pathname === '/auth/v1/logout') return Response.json({});
    if (url.pathname === '/auth/v1/token') return Response.json(sessionFor(state.nextOwner));
    if (url.pathname === '/functions/v1/submit-observation') {
      state.submits.push(options.body);
      if (state.hold) { state.hold.reached(); await state.hold.promise; }
      return { ok: !state.failSubmit, status: state.failSubmit ? 503 : 200 };
    }
    assert.equal(url.pathname, '/functions/v1/trip-log');
    return Response.json({ rows: [], snapshot_at: '2026-10-09T22:00:00.000Z', next_cursor: null });
  };
  const authScope = { PUBLIC_CONFIG: config, localStorage: storage, fetch, AbortController, DOMException,
    setTimeout(callback, delay) { const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay); timers.add(timer); return timer; },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); } };
  vm.runInNewContext(`${authBody}\nthis.api={authIdentityEpoch,currentSession,requireFreshSession,authorizedFetch,signOut,signInWithPassword};`, authScope);
  const auth = authScope.api;
  const serviceScope = { ...trip, ...quality, ...model, ...account, ...auth,
    PUBLIC_CONFIG: config, localStorage: storage, fetch, crypto, structuredClone, performance, setTimeout,
    Date: class extends Date { constructor(...args) { super(...(args.length || state.clockMs === undefined ? args : [state.clockMs++])); } },
    window: { addEventListener() {} } };
  vm.runInNewContext(`${serviceBody}\nthis.api={submitTripEvidenceObservation,syncPendingObservations,getLocalObservations,getObservationSyncStatus};`, serviceScope);
  const service = serviceScope.api;
  const controller = persist => createTripEvidenceController({ storage, openDialog: async () => answer,
    persist: persist ?? service.submitTripEvidenceObservation });
  return { state, storage, service, controller,
    async login(next) { await auth.signOut(); state.nextOwner = next; await auth.signInWithPassword('synthetic@example.invalid', 'synthetic-only'); },
    finish() { const leaked = timers.size; for (const timer of timers) clearTimeout(timer); assert.equal(leaked, 0); } };
}

for (const [label, receipt, queued] of [
  ['pending', { stored: 'pending' }, true], ['local', { stored: 'local' }, true],
  ['remote', { stored: 'remote' }, false], ['undefined legacy', undefined, false],
  ['opaque numeric legacy', 1, false], ['opaque null legacy', null, false], ['opaque object legacy', {}, false],
]) test(`normal uploader receipt ${label}`, async () => {
  const h = harness();
  try {
    const controller = h.controller(async () => receipt); controller.start(start(firstTrip));
    const result = await controller.stop(stop);
    assert.equal(result.status, queued ? 'queued' : 'submitted');
    assert.equal(listPendingTripEvidence(h.storage).length, queued ? 1 : 0);
    assert.equal(h.state.submits.length, 0);
  } finally { h.finish(); }
});

for (const asynchronous of [false, true]) test(`normal ${asynchronous ? 'rejection' : 'throw'} preserves first failure and queued evidence`, async () => {
  const h = harness(), error = new Error('synthetic-first-error');
  try {
    const controller = h.controller(() => { if (asynchronous) return Promise.reject(error); throw error; });
    controller.start(start(firstTrip)); assert.equal((await controller.stop(stop)).status, 'queued');
    const before = h.storage.getItem('ravradar-trip-evidence-v2-pending');
    const retried = await controller.flush();
    assert.equal(retried.failures[0].message, error.message);
    assert.equal(h.storage.getItem('ravradar-trip-evidence-v2-pending'), before);
  } finally { h.finish(); }
});

test('actual503 service receipt stays queued; same-owner200 retry preserves exact immutable body', async () => {
  const h = harness();
  try {
    const controller = h.controller(); controller.start(start(firstTrip));
    assert.equal((await controller.stop(stop)).status, 'queued');
    const original = clean(h.service.getLocalObservations()[0]);
    assert.equal(listPendingTripEvidence(h.storage).length, 1);
    assert.equal(h.service.getLocalObservations().length, 1); assert.equal(h.service.getObservationSyncStatus().pending, 1);
    h.state.failSubmit = false;
    const retried = await controller.flush(); assert.equal(retried.submitted, 1); assert.equal(retried.failed, 0);
    assert.equal(listPendingTripEvidence(h.storage).length, 0);
    assert.equal(h.service.getObservationSyncStatus().pending, 0);
    assert.equal(h.service.getLocalObservations()[0].submitted_at, original.submitted_at);
    assert.equal(h.state.submits.length, 2); assert.equal(h.state.submits[1] === h.state.submits[0], true, 'Retry sends exact original body');
  } finally { h.finish(); }
});

for (const originalOwner of [A, null]) test(`existing ${originalOwner ? 'owner' : 'anonymous'} row cannot be adopted by a new login`, async () => {
  const h = harness(originalOwner);
  try {
    await h.service.submitTripEvidenceObservation(payload(firstTrip));
    await h.login(B); h.state.writes.length = 0;
    const local = h.storage.getItem('ravradar-observations-v2'), pending = h.storage.getItem('ravradar-observation-outbox-v1');
    await assert.rejects(h.service.submitTripEvidenceObservation(payload(firstTrip)), /konto|Konto/);
    assert.equal(h.state.submits.length, 1); assert.equal(h.state.writes.length, 0);
    assert.equal(h.storage.getItem('ravradar-observations-v2'), local);
    assert.equal(h.storage.getItem('ravradar-observation-outbox-v1'), pending);
    assert.equal(h.service.getLocalObservations().some(row => row.user_id === B), false);
  } finally { h.finish(); }
});

test('changed existing content rejects before writes or HTTP; key order alone is compatible', async () => {
  const h = harness();
  try {
    const columns = payload(firstTrip); await h.service.submitTripEvidenceObservation(columns);
    h.state.writes.length = 0; const before = JSON.stringify([...h.storage.values]);
    await assert.rejects(h.service.submitTripEvidenceObservation({ ...columns, search_coverage: 'thorough' }));
    assert.equal(h.state.writes.length, 0); assert.equal(h.state.submits.length, 1);
    assert.equal(JSON.stringify([...h.storage.values]), before);
    const reordered = { ...columns, calibration_features: Object.fromEntries(Object.entries(columns.calibration_features).reverse()) };
    h.state.failSubmit = false;
    assert.equal((await h.service.submitTripEvidenceObservation(reordered)).stored, 'remote');
    assert.equal(h.state.submits[1] === h.state.submits[0], true, 'Key ordering never changes the retried body');
  } finally { h.finish(); }
});

test('a successfully sent exact row is remote even when another owner remains pending', async () => {
  const h = harness(B);
  try {
    await h.service.submitTripEvidenceObservation(payload(firstTrip));
    await h.login(A); h.state.failSubmit = false;
    const result = await h.service.submitTripEvidenceObservation(payload(secondTrip));
    assert.equal(result.status.pending, 1); assert.equal(result.stored, 'remote');
    assert.equal(h.service.getLocalObservations().find(row => row.trip_id === secondTrip).sync_status, 'synced');
  } finally { h.finish(); }
});

test('existing-row storage failure preserves first exception and original local bytes', async () => {
  const h = harness();
  try {
    await h.service.submitTripEvidenceObservation(payload(firstTrip));
    const original = h.storage.getItem('ravradar-observations-v2');
    const error = new Error('synthetic-outbox-quota');
    h.state.failWrite = { key: 'ravradar-observation-outbox-v1', error };
    await assert.rejects(h.service.submitTripEvidenceObservation(payload(firstTrip)), value => value === error);
    assert.equal(h.storage.getItem('ravradar-observations-v2') === original, true, 'A failed outbox write cannot overwrite original local bytes');
    assert.equal(h.state.submits.length, 1);
  } finally { h.finish(); }
});

test('restored previously-synced row still requires a fresh normal server receipt', async () => {
  const h = harness();
  try {
    h.state.failSubmit = false;
    assert.equal((await h.service.submitTripEvidenceObservation(payload(firstTrip))).stored, 'remote');
    const original = h.state.submits[0]; h.state.failSubmit = true;
    assert.equal((await h.service.submitTripEvidenceObservation(payload(firstTrip))).stored, 'pending');
    assert.equal(h.state.submits.length, 2); assert.equal(h.state.submits[1] === original, true, 'Reconfirmation sends exact original body');
    assert.equal(h.service.getObservationSyncStatus().pending, 1);
  } finally { h.finish(); }
});

test('a conflicting same-id outbox entry is preserved and rejected before retry I/O', async () => {
  const h = harness();
  try {
    await h.service.submitTripEvidenceObservation(payload(firstTrip));
    const queued = JSON.parse(h.storage.getItem('ravradar-observation-outbox-v1'));
    queued[0].search_coverage = 'thorough';
    h.storage.setItem('ravradar-observation-outbox-v1', JSON.stringify(queued));
    const before = JSON.stringify([...h.storage.values]); h.state.writes.length = 0;
    await assert.rejects(h.service.submitTripEvidenceObservation(payload(firstTrip)));
    assert.equal(h.state.submits.length, 1); assert.equal(h.state.writes.length, 0);
    assert.equal(JSON.stringify([...h.storage.values]) === before, true);
  } finally { h.finish(); }
});

for (const change of ['same-owner-new-login', 'different-local-receipt']) {
  test(`awaited normal retry cannot acknowledge ${change}`, async () => {
    const h = harness(); let release, reached;
    const ready = new Promise(resolve => { reached = resolve; });
    const held = new Promise(resolve => { release = resolve; });
    let pending;
    try {
      await h.service.submitTripEvidenceObservation(payload(firstTrip));
      h.state.failSubmit = false; h.state.hold = { promise: held, reached };
      pending = h.service.submitTripEvidenceObservation(payload(firstTrip))
        .then(value => ({ value }), error => ({ error }));
      await ready;
      if (change === 'same-owner-new-login') await h.login(A);
      else {
        const rows = clean(h.service.getLocalObservations());
        rows[0].search_coverage = 'thorough'; rows[0].sync_status = 'synced';
        h.storage.setItem('ravradar-observations-v2', JSON.stringify(rows));
        h.storage.setItem('ravradar-observation-outbox-v1', '[]');
      }
      release(); const result = await pending;
      if (change === 'same-owner-new-login') {
        assert.match(result.error?.message ?? '', /Kontoen blev ændret/);
        assert.equal(h.service.getObservationSyncStatus().pending, 1);
      } else {
        assert.equal(result.value?.stored, 'pending');
        assert.equal(h.service.getLocalObservations()[0].search_coverage, 'thorough');
      }
    } finally { release(); if (pending) await pending; h.finish(); }
  });
}

// Combined normal store/intent/receipt boundary, not another isolated receipt stub.
test('interrupted completion preserves its first report through pending receipt and account switch', async () => {
  const h = harness(), keys = tripEvidenceStorageKeys;
  const remove = h.storage.removeItem, error = new Error('synthetic-active-cleanup-stop');
  const make = value => createTripEvidenceController({ storage: h.storage, openDialog: async () => value,
    persist: h.service.submitTripEvidenceObservation });
  try {
    h.storage.removeItem = key => { if (key === keys.active) throw error; remove(key); };
    const controller = make(answer); controller.start(start(firstTrip));
    await assert.rejects(controller.stop(stop), value => value === error);
    const firstQueue = h.storage.getItem(keys.pending);
    assert.equal(h.state.submits.length, 0);
    h.storage.removeItem = remove;
    await assert.rejects(make({ ...answer, found: true, grams: 5 }).resume());
    assert.equal(h.storage.getItem(keys.pending), firstQueue); assert.equal(h.state.submits.length, 0);
    assert.equal((await make(answer).resume()).status, 'queued');
    assert.equal(h.storage.getItem(keys.pending), firstQueue);
    const originalBody = h.state.submits[0];
    await h.login(B); assert.equal((await make(answer).flush()).failed, 1);
    assert.equal(h.state.submits.length, 1); assert.equal(h.storage.getItem(keys.pending), firstQueue);
    await h.login(A); h.state.failSubmit = false;
    assert.equal((await make(answer).flush()).submitted, 1);
    assert.equal(h.state.submits[1], originalBody);
    assert.equal(listPendingTripEvidence(h.storage).length, 0);
    assert.equal(h.service.getObservationSyncStatus().pending, 0);
  } finally { h.storage.removeItem = remove; h.finish(); }
});

test('shared initial hydration preserves the first immutable row through both normal submits', async () => {
  const h = harness(A, false);
  let release, reached, first, second;
  const ready = new Promise(resolve => { reached = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  h.state.hydration = { promise: held, reached };
  h.state.clockMs = Date.parse('2026-10-10T00:00:00.000Z');
  try {
    const columns = payload(firstTrip); h.state.failSubmit = false;
    first = h.service.submitTripEvidenceObservation(columns); await ready;
    second = h.service.submitTripEvidenceObservation(columns);
    release(); const results = await Promise.all([first, second]);
    assert.equal(h.state.submits.length, 1, 'The shared normal drain sends the original once');
    const firstSubmittedAt = JSON.parse(h.state.submits[0]).submitted_at;
    const local = h.service.getLocalObservations()[0];
    assert.equal(local.submitted_at, firstSubmittedAt, 'Hydration continuation retains the first committed row');
    assert.equal(local.sync_status, 'synced');
    assert.equal(results.every(result => result.stored === 'remote'), true);
    assert.equal(h.service.getObservationSyncStatus().pending, 0);
  } finally { release(); await Promise.allSettled([first, second].filter(Boolean)); h.finish(); }
});
