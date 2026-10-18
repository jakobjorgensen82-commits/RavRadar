import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { collectPostH0DmiOriginalDependencies as collect } from './lib/post-h0-dmi-original-dependencies.mjs';
import { buildPrivateDmiRecoveryRecord } from './lib/private-dmi-recovery-record.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { dmiExpectedIdentityForPart, verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { buildNewestValidRavScoreRecoverySources } from './lib/ravscore-recovery-source-priority.mjs';
import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';
import { inspectDmiForecastGridSampling } from './lib/dmi-forecast-store.mjs';
import { canonicalSavedDmiOriginalCapture } from './lib/saved-dmi-original-capture.mjs';
import { buildRavScoreRecoveryReplay } from './lib/ravscore-recovery-replay.mjs';
import { canonicalRavScoreStateOnlyCurrentHold, RAVSCORE_STATE_ONLY_CURRENT_HOLD_CONTRACT_ID,
  RAVSCORE_STATE_ONLY_CURRENT_HOLD_CLOSURE_CONTRACT_ID } from '../js/core/ravscore-integrated-state-pipeline.js';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const at = hours => new Date(Date.parse('2026-10-18T00:00:00.000Z') + hours * 3_600_000).toISOString();
const captureAt = hours => at(hours).replace('.000Z', 'Z'); // normal Python capture wire spelling
const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
const sampling = source => ({ contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
  gridIndexIdentitySha256: sha('post-h0-synthetic-grid-index'),
  coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
  gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
  fieldSet: [...source.fieldSet], optionalFieldSet: [...source.optionalFieldSet] });

// Real normal constructors/verifiers on synthetic schema-valid originals, NOT
// actual GRIB, authenticated B/GCM, opaque regional admission or production.
function fixture({ coherent = [], collection = 'dkss_nsbs' } = {}) {
  const part = { partId: 'SYNTHETIC-POST-H0-PART', zoneId: 'DK-B01-01', waterPoint: [8, 55], onshoreDirectionDeg: 90 };
  const identity = dmiExpectedIdentityForPart(part);
  const natives = [-3, 0, 3, 6, 9].map(offset => {
    const source = { provider: 'dmi', fallback: false, collection, collectionFamily: 'marine',
      component: 'current', componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'], optionalFieldSet: [],
      spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', vectorSemanticsVersion: 3,
      vectorSelection, verticalLayer: 'depth:1', verticalLayerRankM: 1, ...identity,
      modelRun: at(-100), nativeValidTime: at(offset), leadTimeHours: 100 + offset,
      itemId: 'synthetic-post-h0-item-' + offset, assetIdentitySha256: sha('asset-' + offset),
      assetSizeBytes: 1234, acquiredAt: at(-1), contentLengthBytes: 1234, contentSha256: sha('bytes-' + offset),
      itemCreatedAt: at(-100), itemUpdatedAt: at(-99), gridPoint: [8, 55],
      gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0, spatialSemanticsVersion: 1 };
    if (coherent.includes(offset)) source.nativeGridSampling = sampling(source);
    return { time: at(offset), 'current-u': 0.1 + offset / 1000, 'current-v': 0.2, sources: { current: source } };
  });
  const document = { generatedAt: at(6), currentVectorSemanticsVersion: 3, currentVectorSelection: vectorSelection,
    currentMaxDistanceKm: 5, timeStrideHours: 3, zones: { [identity.entityId]: {
      ...identity, hourly: Object.fromEntries(natives.map(row => [row.time, row])) } } };
  const project = (doc, previous = true) => {
    const feature = { properties: { id: identity.entityId, dataPoint: part.waterPoint } };
    const record = buildPrivateDmiRecoveryRecord(feature, doc, at(6),
      { startAt: at(-3), expectedIdentity: identity, protectPreviousDmi: previous });
    assert.ok(record, 'normal private record constructor');
    return { source: previous ? 'deployed-private-runtime' : 'progressive-private-dmi', nativeCurrentContexts: [doc],
      record: { ...record, hourly: verifiedIntegratedPartHourly(record, doc, identity.entityId, part,
        { requireNativeGridSampling: false }) } };
  };
  const previous = project(document);
  const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource: previous,
    protectedPreviousSource: previous, productionReferenceAt: at(6), part });
  const state = buildIntegratedPartScoreSeries({ part, zone: { id: part.zoneId, onshoreDirectionDeg: 90 },
    hourly: [{ time: at(0) }] }).ravScoreState.continuationState;
  return { part, identity, document, natives, project,
    options: { part, initialSelection: { source: 'EXISTING_INTEGRATED', state }, targetReferenceAt: at(6), recoverySources } };
}
const rowAt = (f, hours) => f.options.recoverySources[0].record.hourly.find(row => row.time === at(hours));
const reject = (options, code) => assert.throws(() => collect(options), error =>
  error.message === `POST_H0_DMI_ORIGINAL_${code}` && error.originalDependencyCode === error.message);

test('normal priority/projected interpolated candidates resolve own endpoint captures, dedup and remain unchanged', () => {
  const f = fixture(), before = JSON.stringify(f.options), plan = collect(f.options);
  assert.equal(plan.initialStateAt, at(0));
  assert.equal(plan.targetReferenceAt, at(6));
  assert.equal(plan.scope, 'PRIORITY_PROJECTED_CANDIDATES_NOT_FINAL_REPLAY_UNION');
  assert.equal(plan.authenticationPerformed, false);
  assert.equal(plan.nativeAdmissionPerformed, false);
  assert.equal(plan.actualReplayConsumptionProved, false);
  assert.equal(plan.counts.forwardCandidateRows, 5);
  assert.equal(plan.counts.unknownRows, 5);
  assert.equal(plan.captures.length, 3);
  const expected = f.natives.filter(row => [at(0), at(3), at(6)].includes(row.time))
    .map(row => canonicalSavedDmiOriginalCapture(row.sources.current));
  assert.deepEqual(new Set(plan.captures.map(JSON.stringify)), new Set(expected.map(JSON.stringify)));
  const interpolation = rowAt(f, 1);
  const proof = createProtectedDmiNativeCurrentInspector({ contexts: [f.document] }).inspectOriginals({ part: f.part, row: interpolation });
  assert.equal(proof.ok, true);
  assert.deepEqual(proof.nativeRows.map(row => row.time), [at(0), at(3)]);
  assert.notEqual(interpolation.currentProvenance.nativeValidTime, at(1));
  assert.equal(JSON.stringify(f.options), before, 'whole state, rows and full native contexts untouched');
  plan.captures[0].itemId = 'detached-output-only';
  assert.equal(JSON.stringify(f.options), before);
  assert.equal(collect(f.options).captures.length, 3, 'no result/input alias');
});

test('only unknown actual native endpoints are dependencies; coherent originals retain normal strict admission', () => {
  const mixed = fixture({ coherent: [0] }), plan = collect(mixed.options);
  assert.deepEqual(plan.captures.map(value => value.validTime).sort(), [captureAt(3), captureAt(6)]);
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] });
  assert.equal(collect(f.options).captures.length, 0);
  const replay = buildRavScoreRecoveryReplay({ part: f.part, initialState: f.options.initialSelection.state,
    targetReferenceAt: at(6), sourceRecords: f.options.recoverySources, publicHourly: [{ time: at(6) }],
    requireNativeGridSampling: true });
  assert.equal(replay.replayedHourCount, 5, 'same strict open interval through the real replay caller');
  assert.throws(() => buildRavScoreRecoveryReplay({ part: mixed.part, initialState: mixed.options.initialSelection.state,
    targetReferenceAt: at(6), sourceRecords: mixed.options.recoverySources, publicHourly: [{ time: at(6) }],
    requireNativeGridSampling: true }), { code: 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' });
});

test('closed boundaries and irrelevant OLD/future rows do not create dependencies; endpoint support may straddle H0/target', () => {
  const f = fixture();
  f.options.recoverySources[0].record.hourly = [-3, 0, 6, 7].map(offset => rowAt(f, offset));
  assert.deepEqual(collect(f.options).captures, []);
  const g = fixture();
  g.options.recoverySources[0].record.hourly = [rowAt(g, 1)];
  assert.deepEqual(collect(g.options).captures.map(value => value.validTime).sort(), [captureAt(0), captureAt(3)]);
  // Malformed pre-H0 provenance is not inspected or restored by this route.
  g.options.recoverySources[0].record.hourly.unshift({ time: at(0), currentUMps: 1,
    currentVMps: 1, currentProvenance: { provider: 'dmi', nativeSteps: null } });
  assert.equal(collect(g.options).captures.length, 2);
  assert.deepEqual(collect({ ...g.options, targetReferenceAt: at(0) }).captures, [], 'H0 equals target has no forward replay');
});

test('provenance wrapper cannot replace the whole original view; full capture dedup includes acquiredAt', () => {
  const f = fixture(), selected = rowAt(f, 1);
  f.options.recoverySources[0].record.hourly = [{ ...selected, sources: {} }];
  reject(f.options, 'SELECTED_ENDPOINT_UNAVAILABLE');
  f.options.recoverySources[0].record.hourly = [selected];
  const fresh = structuredClone(f.document);
  for (const row of Object.values(fresh.zones[f.identity.entityId].hourly)) row.sources.current.acquiredAt = at(-0.5);
  const source = f.project(fresh, false);
  const previous = f.options.recoverySources[0];
  const selectedSources = buildNewestValidRavScoreRecoverySources({ fallbackSource: previous, preferredSource: source,
    protectedPreviousSource: previous, productionReferenceAt: at(6), part: f.part });
  const result = collect({ ...f.options, recoverySources: selectedSources });
  assert.ok(result.captures.some(value => value.acquiredAt === '2026-10-17T23:00:00Z'));
  assert.ok(result.captures.some(value => value.acquiredAt === '2026-10-17T23:30:00Z'));
});

test('missing/changed own endpoint, contradictory receipt and cross-part source refuse rather than zero demand', () => {
  for (const mutate of [
    f => { delete f.document.zones[f.identity.entityId].hourly[at(0)]; },
    f => { f.document.zones[f.identity.entityId].hourly[at(0)]['current-u'] += 0.1; },
    f => { f.document.zones[f.identity.entityId].hourly[at(0)].sources.current.contentSha256 = sha('changed'); },
    f => { rowAt(f, 1).currentUMps += 0.1; },
    f => { rowAt(f, 1).currentProvenance.entityId = 'PART::OTHER'; },
  ]) {
    const f = fixture();
    assert.equal(collect(f.options).captures.length, 3, 'warm previous invocation is no cached authority');
    mutate(f);
    reject(f.options, 'SELECTED_ENDPOINT_UNAVAILABLE');
  }
  const f = fixture({ coherent: [0] });
  rowAt(f, 1).currentProvenance.nativeGridSampling.elementIndex += 1;
  reject(f.options, 'SELECTED_ENDPOINT_UNAVAILABLE');
});

test('legacy/cold/context/time/point/bounds and executable input views fail closed with fixed payload-free codes', () => {
  const f = fixture();
  for (const source of ['COLD_START', 'POINT_ACTIVATION', 'CANDIDATE_G_MIGRATION', 'caller-origin-label']) {
    reject({ ...f.options, initialSelection: { ...f.options.initialSelection, source } }, 'INITIAL_SELECTION_INVALID');
  }
  reject({ ...f.options, part: { ...f.part, onshoreDirectionDeg: 91 } }, 'INITIAL_STATE_INVALID');
  reject({ ...f.options, targetReferenceAt: at(-1) }, 'WINDOW_INVALID');
  reject({ ...f.options, targetReferenceAt: at(73) }, 'WINDOW_INVALID');
  reject({ ...f.options, targetReferenceAt: at(6.5) }, 'WINDOW_INVALID');
  const wrongPoint = fixture(); wrongPoint.options.recoverySources[0].record.point = [9, 55];
  reject(wrongPoint.options, 'SAMPLING_MISMATCH');
  reject({ ...f.options, recoverySources: Array(17).fill(f.options.recoverySources[0]) }, 'INPUT_BOUND');
  let executed = 0;
  const getter = fixture();
  Object.defineProperty(rowAt(getter, 1), 'currentProvenance', { get() { executed++; throw new Error('PRIVATE-CANARY'); } });
  reject(getter.options, 'INPUT_INVALID');
  const proxy = fixture(); proxy.options.recoverySources[0].nativeCurrentContexts[0] = new Proxy(proxy.document,
    { get() { executed++; throw new Error('PRIVATE-CANARY'); } });
  reject(proxy.options, 'INPUT_INVALID');
  assert.equal(executed, 0);
});

test('excluded LF and unqualified regional/HOLD cannot be turned into a no-work plan', () => {
  const f = fixture(), row = rowAt(f, 1);
  row.currentProvenance.collection = 'dkss_lf';
  reject(f.options, 'SOURCE_DOMAIN_EXCLUDED');
  const erased = fixture(), erasedRow = rowAt(erased, 1);
  erasedRow.currentProvenance.collection = 'dkss_lf';
  for (const key of ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg']) erasedRow[key] = null;
  assert.equal(collect(erased.options).captures.length, 3, 'an erased component is not made eligible or demanded by its stale provenance');
  const regional = fixture();
  Object.assign(rowAt(regional, 1).currentProvenance, { collection: 'dkss_nsbs', vectorSemanticsVersion: 4,
    sourceClass: 'owner-approved-regional-proxy', source: 'dmi-dkss-lf-regional-proxy' });
  reject(regional.options, 'REGIONAL_SUPPORT_REQUIRED');
  const h = fixture(), parentZoneId = 'DK-B04-01';
  h.options.part = { ...h.part, zoneId: parentZoneId };
  const marker = { contractId: RAVSCORE_STATE_ONLY_CURRENT_HOLD_CONTRACT_ID,
    status: 'verified-derived-state-only', classification: 'REGIONAL_DMI_DERIVED_HOLD', stateOnly: true,
    partId: h.part.partId, parentZoneId, targetIdentityFingerprint: 'sha256:' + 'a'.repeat(64),
    validTime: at(1), sourceValidTime: at(0), modelRun: at(-100), holdAgeHours: 1,
    provider: 'dmi', sourceClass: 'owner-approved-regional-proxy', source: 'dmi-dkss-lf-regional-proxy', collection: 'dkss_lf',
    closureContractId: RAVSCORE_STATE_ONLY_CURRENT_HOLD_CLOSURE_CONTRACT_ID, closureId: 'sha256:' + 'b'.repeat(64),
    closureAssignmentSha256: 'sha256:' + 'c'.repeat(64), sourceAssetSha256: 'sha256:' + 'd'.repeat(64),
    sourceProofSha256: 'sha256:' + 'e'.repeat(64), vectorCommitmentSha256: 'sha256:' + 'f'.repeat(64) };
  assert.deepEqual(canonicalRavScoreStateOnlyCurrentHold(marker, at(1)), marker,
    'valid marker shape is deliberately insufficient for opaque native HOLD admission');
  h.options.recoverySources[0].record.hourly = [{ time: at(1), currentStateOnlyHold: marker }];
  reject(h.options, 'HOLD_SUPPORT_REQUIRED');
  reject({ ...h.options, liveCurrentPilot: { entries: [], claimedOpaque: true } }, 'HOLD_SUPPORT_REQUIRED');
});

test('normal full-history continuation and PART geometry are not limited by the small original-record parser', () => {
  const f = fixture();
  const full = buildIntegratedPartScoreSeries({ part: f.part, zone: { id: f.part.zoneId, onshoreDirectionDeg: 90 },
    hourly: Array.from({ length: 289 }, (_, index) => ({ time: at(index - 288) })) }).ravScoreState.continuationState;
  const part = { ...f.part, geometry: { coordinates: Array.from({ length: 5000 }, () => [8, 55]) } };
  assert.equal(collect({ ...f.options, part, initialSelection: { source: 'EXISTING_INTEGRATED', state: full } }).captures.length, 3);
});

test('normal optional null historical donor slots preserve actual whole native proofs in either order', () => {
  const f = fixture(), expected = collect(f.options);
  for (const contexts of [[f.document, null], [null, f.document]]) {
    f.options.recoverySources[0].nativeCurrentContexts = contexts;
    const before = JSON.stringify(f.options);
    const row = rowAt(f, 1);
    assert.equal(createProtectedDmiNativeCurrentInspector({ contexts }).inspectOriginals({ part: f.part, row }).ok, true,
      'unchanged normal inspector already accepts absent historical document');
    assert.deepEqual(collect(f.options), expected);
    assert.equal(JSON.stringify(f.options), before, 'no donor synthesized, changed or filtered in-place');
  }
  f.options.recoverySources[0].nativeCurrentContexts = [null];
  reject(f.options, 'SELECTED_ENDPOINT_UNAVAILABLE');
});
