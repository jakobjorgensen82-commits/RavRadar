import assert from 'node:assert/strict';
import test from 'node:test';
import { createTripEvidenceController } from '../js/services/trip-evidence-controller.js';
import { listPendingTripEvidence, loadActiveTripEvidence, tripEvidenceStorageKeys as keys } from '../js/services/trip-evidence-store.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

// Actual controller/store/contract. A synthetic bank interrupts only at a
// storage method boundary; this is not a browser crash or physical durability test.
const binding = ravScoreModelBinding();
const start = tripId => ({ tripId, startedAt: '2026-08-23T06:00:00.000Z', mode: 'waders',
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
const originalId = '11111111-1111-4111-8111-111111111111';
const retainedId = '22222222-2222-4222-8222-222222222222';
const stop = { endedAt: '2026-08-23T07:00:00.000Z' };
const answer = { zoneId: 'DK-B04-12', coastalPartId: 'DK-B04-12-P01', searchCoverage: 'normal', found: false, grams: null };

function bank(saved = []) {
  const values = new Map(saved), writes = [];
  const state = { fail: null };
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      if (key === keys.pending && state.fail?.boundary === 'pending-write') throw state.fail.error;
      writes.push(['set', key]); values.set(key, String(value));
    },
    removeItem(key) {
      if (key === keys.active && state.fail?.boundary === 'active-remove') throw state.fail.error;
      writes.push(['remove', key]); values.delete(key);
    },
  };
  const controller = value => createTripEvidenceController({ storage, openDialog: async () => value });
  return { values, storage, state, writes, controller };
}

async function interruptedCompletion(boundary, reasonCodes = []) {
  const h = bank();
  const first = h.controller(answer); first.start(start(retainedId));
  assert.equal((await first.stop(stop)).status, 'queued');
  const oldQueue = h.storage.getItem(keys.pending);
  const current = h.controller(answer), input = start(originalId);
  input.calibrationFeatures.reasonCodes = reasonCodes;
  current.start(input);
  const error = new Error(`synthetic-${boundary}`); h.state.fail = { boundary, error };
  await assert.rejects(current.stop(stop), value => value === error, 'Preserve the first storage exception');
  // Reopen over persisted bytes with fresh storage/controller objects; the old
  // call and its in-memory evidence are not used by the retry.
  const reopened = bank(h.values);
  assert.equal(loadActiveTripEvidence(reopened.storage)?.tripId, originalId);
  return { reopened, oldQueue };
}

for (const [label, changed] of [
  ['search coverage', { searchCoverage: 'thorough' }],
  ['find result', { found: true, grams: 5 }],
  ['actual coast', { coastalPartId: 'DK-B04-12-P02' }],
]) test(`reopening after committed queue / interrupted active removal cannot overwrite ${label}`, async () => {
  const { reopened: h } = await interruptedCompletion('active-remove');
  const originalQueue = h.storage.getItem(keys.pending), originalActive = h.storage.getItem(keys.active);
  assert.equal(listPendingTripEvidence(h.storage).length, 2);
  let rejected;
  try { await h.controller({ ...answer, ...changed }).resume(); } catch (error) { rejected = error; }
  assert.equal(h.storage.getItem(keys.pending) === originalQueue, true, 'The first complete report must remain byte-identical');
  assert.equal(h.storage.getItem(keys.active) === originalActive, true, 'Rejected replay must retain the active original');
  assert.ok(rejected instanceof Error, 'A changed completion must not silently succeed');
  assert.equal(h.writes.length, 0);
});

test('identical completion after reopening retains one original report and finishes active cleanup', async () => {
  const { reopened: h } = await interruptedCompletion('active-remove');
  const originalQueue = h.storage.getItem(keys.pending);
  assert.equal((await h.controller(answer).resume()).status, 'queued');
  assert.equal(h.storage.getItem(keys.pending), originalQueue);
  assert.equal(loadActiveTripEvidence(h.storage), null);
  assert.equal(listPendingTripEvidence(h.storage).length, 2);
});

test('failed queue write preserves prior queue and permits a new completion after reopening', async () => {
  const { reopened: h, oldQueue } = await interruptedCompletion('pending-write');
  assert.equal(h.storage.getItem(keys.pending), oldQueue);
  assert.equal(listPendingTripEvidence(h.storage).length, 1);
  assert.equal((await h.controller({ ...answer, found: true, grams: 5 }).resume()).status, 'queued');
  const saved = listPendingTripEvidence(h.storage);
  assert.equal(saved.length, 2); assert.equal(saved.find(value => value.tripId === originalId).grams, 5);
  assert.equal(loadActiveTripEvidence(h.storage), null);
});

test('harmless nested key reordering retains the exact existing queue bytes on replay', async () => {
  const { reopened: h } = await interruptedCompletion('active-remove');
  const reorder = value => Array.isArray(value) ? value.map(reorder)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)])) : value;
  const originalQueue = JSON.stringify(reorder(JSON.parse(h.storage.getItem(keys.pending))));
  h.values.set(keys.pending, originalQueue);
  assert.equal((await h.controller(answer).resume()).status, 'queued');
  assert.equal(h.storage.getItem(keys.pending) === originalQueue, true, 'Equivalent replay must not rewrite the first report');
  assert.equal(loadActiveTripEvidence(h.storage), null);
});

for (const variant of ['order', 'length', 'object-instead-of-array']) {
  test(`existing reasons array ${variant} cannot be silently replaced`, async () => {
    const { reopened: h } = await interruptedCompletion('active-remove', ['falling-water', 'recent-wave-energy']);
    const rows = JSON.parse(h.storage.getItem(keys.pending));
    const row = rows.find(value => value.tripId === originalId);
    if (variant === 'order') row.calibrationFeatures.reasonCodes.reverse();
    else if (variant === 'length') row.calibrationFeatures.reasonCodes.push('synthetic-other-reason');
    else row.calibrationFeatures.reasonCodes = { ...row.calibrationFeatures.reasonCodes };
    h.values.set(keys.pending, JSON.stringify(rows));
    const before = JSON.stringify([...h.values]);
    let rejected;
    try { await h.controller(answer).resume(); } catch (error) { rejected = error; }
    assert.equal(JSON.stringify([...h.values]) === before, true, 'Preserve all original bytes on a conflicting replay');
    assert.ok(rejected instanceof Error); assert.equal(h.writes.length, 0);
  });
}

test('a different existing observation time cannot be rewritten by completion replay', async () => {
  const { reopened: h } = await interruptedCompletion('active-remove');
  const rows = JSON.parse(h.storage.getItem(keys.pending));
  rows.find(value => value.tripId === originalId).observedAt = '2026-08-23T06:40:00.000Z';
  h.values.set(keys.pending, JSON.stringify(rows));
  const before = JSON.stringify([...h.values]);
  let rejected;
  try { await h.controller(answer).resume(); } catch (error) { rejected = error; }
  assert.equal(JSON.stringify([...h.values]) === before, true);
  assert.ok(rejected instanceof Error); assert.equal(h.writes.length, 0);
});

for (const format of ['malformed-json', 'non-array', 'unknown-same-id-schema']) {
  test(`existing pending ${format} is retained on rejection`, async () => {
    const { reopened: h } = await interruptedCompletion('active-remove');
    if (format === 'malformed-json') h.values.set(keys.pending, '{');
    else if (format === 'non-array') h.values.set(keys.pending, '{}');
    else {
      const rows = JSON.parse(h.storage.getItem(keys.pending));
      rows.find(value => value.tripId === originalId).schemaVersion = 999;
      h.values.set(keys.pending, JSON.stringify(rows));
    }
    const before = JSON.stringify([...h.values]);
    let rejected;
    try { await h.controller(answer).resume(); } catch (error) { rejected = error; }
    assert.equal(JSON.stringify([...h.values]) === before, true);
    assert.ok(rejected instanceof Error); assert.equal(h.writes.length, 0);
  });
}

test('interrupted identical cleanup preserves first error and queue without another write', async () => {
  const { reopened: h } = await interruptedCompletion('active-remove');
  const before = JSON.stringify([...h.values]);
  const firstError = new Error('synthetic-second-cleanup-interruption');
  h.state.fail = { boundary: 'active-remove', error: firstError };
  await assert.rejects(h.controller(answer).resume(), value => value === firstError);
  assert.equal(JSON.stringify([...h.values]), before);
  assert.equal(h.writes.length, 0, 'The committed complete queue does not need a second write');
  h.state.fail = null;
  assert.equal((await h.controller(answer).resume()).status, 'queued');
  assert.equal(loadActiveTripEvidence(h.storage), null);
  assert.equal(listPendingTripEvidence(h.storage).length, 2);
});
