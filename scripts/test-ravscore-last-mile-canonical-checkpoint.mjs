import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateModelBinding } from './rollback-assets/ravscore-model-contract.js';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { reconcileIntegratedContinuation } from './migrate-post-cutover-private-runtime.mjs';
import { saveRavScoreContinuationCheckpoint, loadRavScoreContinuationCheckpointForTarget }
  from './ravscore-continuation-checkpoint.mjs';

// Synthetic normal-function regression only. It neither issues a new model
// family nor proves SQL, authenticated B/S publication, native data or providers.
// All previous last-mile/checkpoint/migration tests remain separate and intact.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const START = Date.parse('2026-01-01T00:00:00.000Z');
const time = hour => new Date(START + hour * 3_600_000).toISOString();
const part = { partId: 'LAST-MILE-CANONICAL', zoneId: 'SYNTHETIC-ZONE',
  landPoint: [10, 56], waterPoint: [10.01, 56.01], onshoreDirectionDeg: 0 };
const samplingContextKey = ravScoreSamplingContextKey(part);
const clone = value => structuredClone(value);
const sample = (hour, overrides = {}) => ({ time: time(hour), currentSpeedMps: 0.12,
  currentAlignment: 0.75, currentVerified: true,
  waveHeightM: 4, wavePeriodS: 10, waveDirectionDeg: 0, ...overrides });
const missing = hour => sample(hour, { waveHeightM: null, wavePeriodS: null, waveDirectionDeg: null });
const sevenHours = () => Array.from({ length: 7 }, (_, hour) =>
  hour >= 2 && hour <= 5 ? missing(hour) : sample(hour));
const build = (rows, options = {}) => buildIntegratedRavScoreStateSeries(rows,
  { samplingContextKey, onshoreDirectionDeg: part.onshoreDirectionDeg, ...options });
const canonical = state => build([], { initialState: state });

// Numerically equivalent to the I29 point-enclosure subpredicate ONLY.
// This is not a PostgreSQL execution or a replacement for its real admission.
const factor = track => Math.max(0.85, Math.min(1,
  1 - 0.15 * Math.max(0, Math.min(track.activityMoment,
    (track.activityMoment - track.normalMoment) / 1.25))));
function assertPointEnclosed(state) {
  const bounds = state.historyBounds.lastMile;
  for (const key of ['minimumFactorTrack', 'maximumFactorTrack']) {
    assert.deepEqual(Object.keys(bounds[key]).sort(), ['activityMoment', 'normalMoment']);
    assert.equal(Number.isFinite(bounds[key].activityMoment), true);
    assert.equal(Number.isFinite(bounds[key].normalMoment), true);
  }
  const lower = factor(bounds.minimumFactorTrack), upper = factor(bounds.maximumFactorTrack);
  assert.ok(lower <= upper + 1e-9);
  // The established 40-hour conservative scoring reset intentionally permits
  // the physical point to evolve separately until uncertainty reopens.
  if (bounds.conservativeResetAt === null) {
    const point = factor({ activityMoment: state.waveApproachState.waveActivityMoment,
      normalMoment: state.waveApproachState.waveNormalMoment });
    assert.ok(point >= lower - 1e-9 && point <= upper + 1e-9);
  }
}
function assertAlreadyCanonical(state) {
  const before = clone(state);
  const validated = canonical(state);
  assert.equal(validated.initialStateAccepted, true);
  assert.equal(validated.initialStateSource, 'INTEGRATED_CONTINUATION');
  assert.deepEqual(validated.continuationState, before,
    'The emitted state itself, not a repaired return-copy, must be canonical');
  assert.deepEqual(state, before, 'Validation never mutates a historical source');
  assertPointEnclosed(state);
}
function rawUncanonicalState() {
  const series = build(sevenHours());
  const raw = clone(series.continuationState);
  // Deliberately recreate only the former producer's contradictory envelope.
  // The state/model/contexts come from the actual current normal builder;
  // there is no retagged historical fixture or forged accepting function.
  raw.historyBounds.lastMile.maximumFactorTrack = clone(
    series.rows[1].continuationState.historyBounds.lastMile.maximumFactorTrack);
  assert.ok(factor(raw.historyBounds.lastMile.maximumFactorTrack) < 1 - 1e-9);
  assert.equal(raw.waveApproachState.waveActivityMoment, 0);
  assert.equal(raw.waveApproachState.waveNormalMoment, 0);
  return raw;
}
function measuredSource(state) {
  const candidate = buildCandidateGDerivedStateSeries(sevenHours(), {
    stateKey: candidateGStateKey(part),
  }).continuationState;
  assert.equal(candidate.transportMemoryReady, false);
  return { datasetId: 'rr-synthetic-last-mile-canonical', productionReferenceAt: state.time,
    coastalParts: { parts: { [part.partId]: { ...part, ravScoreModel: { currentState: clone(state) } } } },
    ravScoreCandidateGWarmup: {
      schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', status: 'BUILDING_MEASURED_ONLY',
      evidencePolicy: 'MEASURED_ONLY', syntheticHistoryAllowed: false,
      sourceModelBinding: ravScoreModelBinding(), candidateModelBinding: candidateModelBinding(),
      automaticActivationAllowed: false, publicDuringNormalOperation: false,
      runtime: { status: 'BUILDING_MEASURED_ONLY', modelBinding: candidateModelBinding(),
        expectedPartCount: 1, measuredPartCount: 1,
        parts: { [part.partId]: { ravScoreModel: { currentState: candidate } } } },
    },
  };
}
async function storage(t, fn) {
  const parent = await fs.realpath(os.tmpdir());
  const work = await fs.mkdtemp(path.join(parent, 'rr-last-mile-canonical-'));
  const identity = await fs.lstat(work, { bigint: true });
  let passed = false;
  try { await fn(work); passed = true; }
  finally {
    if (passed) {
      const current = await fs.lstat(work, { bigint: true });
      assert.equal(current.isDirectory() && !current.isSymbolicLink(), true);
      assert.equal(await fs.realpath(work), work);
      assert.equal(path.dirname(work), parent);
      assert.equal(current.dev, identity.dev); assert.equal(current.ino, identity.ino);
      assert.ok(path.basename(work).startsWith('rr-last-mile-canonical-'));
      await fs.rm(work, { recursive: true });
    } else t.diagnostic('Synthetic first-failure fixture retained; no automatic retry.');
  }
}
const serialized = value => `${JSON.stringify(value)}\n`;
const save = (sourcePath, checkpointPath) => saveRavScoreContinuationCheckpoint({ sourcePath,
  checkpointPath, expectedPartCount: 1, repositoryRoot: ROOT });

test('1: measured cold long wave gap emits the canonical enclosing state', () => {
  const rows = sevenHours(); const before = clone(rows);
  const result = build(rows);
  assert.equal(result.initialStateAccepted, false);
  assert.equal(result.initialStateSource, 'COLD_START');
  assert.equal(result.rows.length, 7);
  assert.equal(result.rows.at(-1).lastMileMemoryStatus, 'COLD_START');
  assert.equal(result.rows.at(-1).lastMileFactor, 1);
  assert.equal(result.continuationState.currentMemoryReady, false,
    'A seven-hour new history must not pretend to have a full 48-hour window');
  result.rows.forEach(row => assertAlreadyCanonical(row.continuationState));
  assert.equal(factor(result.continuationState.historyBounds.lastMile.maximumFactorTrack), 1);
  assert.deepEqual(rows, before);
});

test('2: ordinary one-to-three-hour wave recovery keeps its bounded-credit policy', () => {
  for (const gap of [1, 2, 3]) {
    const rows = [sample(0), sample(1),
      ...Array.from({ length: gap - 1 }, (_, index) => missing(2 + index)), sample(1 + gap)];
    const result = build(rows), last = result.rows.at(-1);
    assert.equal(last.lastMileMemoryReady, true);
    assert.equal(last.lastMileMemoryStatus, gap === 1 ? 'READY' : 'RECOVERED_SHORT_GAP');
    const retained = 2 ** (-1 / 4), firstMoment = 1 - retained;
    assert.ok(Math.abs(last.continuationState.waveApproachState.waveActivityMoment
      - (retained * firstMoment + firstMoment)) <= 1e-9,
    'Only the existing one-hour recovery credit may update the held point');
    result.rows.forEach(row => assertAlreadyCanonical(row.continuationState));
  }
});

test('3: active missing direction and exact calm keep distinct honest semantics', () => {
  const result = build([sample(0), sample(1), sample(2, { waveDirectionDeg: null }),
    sample(3, { waveHeightM: 0, wavePeriodS: 0, waveDirectionDeg: null })]);
  assert.equal(result.rows[2].lastMileMemoryReady, false);
  assert.equal(result.rows[2].lastMileMemoryStatus, 'MISSING_INPUT');
  assert.equal(result.rows[2].lastMileEvidenceStatus, 'ACTIVE_WAVE_DIRECTION_MISSING');
  assert.equal(result.rows[3].lastMileMemoryReady, true);
  assert.equal(result.rows[3].lastMileEvidenceStatus, 'EXACT_CALM_DIRECTION_NEUTRAL');
  assert.ok(result.rows[3].lastMileFactor >= result.rows[1].lastMileFactor);
  result.rows.forEach(row => assertAlreadyCanonical(row.continuationState));
});

test('4: forty-hour reset, reopened bounds and explicit historical repair remain valid', () => {
  const history = Array.from({ length: 49 }, (_, hour) =>
    sample(hour, hour > 40 ? { waveDirectionDeg: 180 } : {}));
  const postReset = build(history).continuationState;
  assert.equal(postReset.historyBounds.lastMile.conservativeResetAt, time(40));
  const original = clone(postReset);
  const reopened = build([sample(49, { waveDirectionDeg: null })], { initialState: postReset });
  assertAlreadyCanonical(reopened.continuationState);
  assert.equal(reopened.continuationState.historyBounds.lastMile.conservativeResetAt, null);
  assert.equal(reopened.continuationState.historyBounds.lastMile.lastUnknownAt, time(49));
  assert.deepEqual(postReset, original);

  const formerlySaved = clone(reopened.continuationState);
  formerlySaved.historyBounds.lastMile.minimumFactorTrack = clone(postReset.historyBounds.lastMile.minimumFactorTrack);
  formerlySaved.historyBounds.lastMile.maximumFactorTrack = clone(postReset.historyBounds.lastMile.maximumFactorTrack);
  const beforeRepair = clone(formerlySaved);
  const reconciliation = reconcileIntegratedContinuation({
    originalState: formerlySaved, migratedState: formerlySaved,
    assertPredecessor: state => { assert.equal(canonical(state).initialStateAccepted, true); },
    canonicalizeCurrent: state => canonical(state).continuationState,
  });
  assert.ok(reconciliation.repairPaths.length > 0);
  assert.ok(reconciliation.repairPaths.every(value =>
    /^historyBounds\.lastMile\.(minimumFactorTrack|maximumFactorTrack)(\.|$)/.test(value)));
  assertAlreadyCanonical(reconciliation.canonicalState);
  assert.deepEqual(formerlySaved, beforeRepair, 'Explicit historical repair must keep the original bytes/values');
});

test('5: serializer refuses a raw repaired-copy mismatch before creation or replacement', async t => storage(t, async work => {
  const raw = rawUncanonicalState(), before = clone(raw);
  const validation = canonical(raw);
  assert.equal(validation.initialStateAccepted, true);
  assert.notDeepEqual(validation.continuationState.historyBounds.lastMile, raw.historyBounds.lastMile);
  const sourcePath = path.join(work, 'conditions.json');
  const checkpointPath = path.join(work, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  await fs.writeFile(sourcePath, serialized(measuredSource(raw)), { flag: 'wx' });
  const sourceBytes = await fs.readFile(sourcePath);
  const refused = error => error.code === 'RAVSCORE_CHECKPOINT_LAST_MILE_CANONICALIZATION_REQUIRED';
  await assert.rejects(save(sourcePath, checkpointPath), refused);
  await assert.rejects(fs.lstat(checkpointPath), { code: 'ENOENT' });
  await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
  const prior = Buffer.from('synthetic-existing-checkpoint-do-not-overwrite\n');
  await fs.writeFile(checkpointPath, prior, { flag: 'wx' });
  await assert.rejects(save(sourcePath, checkpointPath), refused);
  assert.deepEqual(await fs.readFile(checkpointPath), prior);
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes);
  assert.deepEqual(raw, before);
}));

test('6: explicit canonical source saves and reloads the identical measured checkpoint', async t => storage(t, async work => {
  const rawSource = measuredSource(rawUncanonicalState());
  const originalPath = path.join(work, 'original-conditions.json');
  await fs.writeFile(originalPath, serialized(rawSource), { flag: 'wx' });
  const originalBytes = await fs.readFile(originalPath);
  const canonicalSource = clone(rawSource);
  canonicalSource.coastalParts.parts[part.partId].ravScoreModel.currentState = canonical(
    rawSource.coastalParts.parts[part.partId].ravScoreModel.currentState).continuationState;
  const state = canonicalSource.coastalParts.parts[part.partId].ravScoreModel.currentState;
  assertAlreadyCanonical(state);
  const sourcePath = path.join(work, 'canonical-conditions.json');
  await fs.writeFile(sourcePath, serialized(canonicalSource), { flag: 'wx' });
  const sourceBytes = await fs.readFile(sourcePath);
  const checkpointPath = path.join(work, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  const saved = await save(sourcePath, checkpointPath);
  assert.equal(saved.saved, true);
  const storedBytes = await fs.readFile(checkpointPath);
  const stored = JSON.parse(storedBytes);
  assert.deepEqual(stored.states[part.partId], state);
  assert.deepEqual(stored.candidateGRollbackCompanion.states[part.partId],
    canonicalSource.ravScoreCandidateGWarmup.runtime.parts[part.partId].ravScoreModel.currentState);
  const loaded = await loadRavScoreContinuationCheckpointForTarget({ checkpointPath,
    expectedPartCount: 1, targetReference: time(7), repositoryRoot: ROOT });
  assert.equal(loaded.loaded, true); assert.equal(loaded.continuationAvailable, true);
  assert.deepEqual(loaded.states[part.partId], state);
  assert.equal(loaded.states[part.partId].currentMemoryReady, false);
  assert.deepEqual(await fs.readFile(checkpointPath), storedBytes);
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes);
  assert.deepEqual(await fs.readFile(originalPath), originalBytes);
  const follower = build([sample(7)], { initialState: loaded.states[part.partId] });
  assert.equal(follower.initialStateAccepted, true);
  assert.equal(follower.initialStateSource, 'INTEGRATED_CONTINUATION');
  assertAlreadyCanonical(follower.continuationState);
  // This is only a normal local continuation. Genuine fixed B/S/readOrigin
  // and family-bound ordinary followers remain the separate seventh target.
}));
