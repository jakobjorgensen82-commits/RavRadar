import { inverseAlternativeCCaller } from './lib/alternative-c-caller-test-input.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { collectPostH0DmiOriginalDependencies as collect, POST_H0_DMI_ENDPOINT_DIAGNOSTICS } from './lib/post-h0-dmi-original-dependencies.mjs';
import { buildRavScoreRawCurrentRetention, describeRavScoreCurrentHistoryFailure } from './plan-ravscore-current-history.mjs';
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

test('actual planner checkpoint-only control omits only the new eviction projection', async () => {
  const source = inverseAlternativeCCaller(readFileSync(new URL('./plan-ravscore-current-history.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n'), 'scripts/plan-ravscore-current-history.mjs');
  const environment = source.slice(source.indexOf('function environmentBoolean(name) {'), source.indexOf('async function main() {'));
  const checkpoint = source.match(/^  const checkpointOnly = environmentBoolean\('CHECKPOINT_ONLY'\);$/m)?.[0];
  const gate = source.match(/^  if \(retainCommittedRaw[^\n]+\) \{\n    demand.schemaVersion = 2;\n    demand.rawRetention = await readCommittedRawCurrentRetention\(registry.json, checkpointFile, productionReferenceAt\);\n  \}/m)?.[0];
  assert(checkpoint && gate, 'read the actual normal caller, not a copied predicate');
  for (const [flag, expected] of [['true', 0], ['false', 1]]) {
    let reads = 0;
    const context = { process: { env: { CHECKPOINT_ONLY: flag } }, refuse: code => { throw Error(code); },
      retainCommittedRaw: true, baselineRequired: true, epochView: null, stateLessRecovery: false,
      demand: { schemaVersion: 1 }, registry: { json: {} }, checkpointFile: {}, productionReferenceAt: at(6),
      readCommittedRawCurrentRetention: () => { reads++; return {}; } };
    const run = vm.runInNewContext(`(async () => { ${environment}\n${checkpoint}\n${gate}\n })`, context);
    await run();
    assert.equal(reads, expected);
    assert.equal(context.demand.schemaVersion, expected ? 2 : 1);
  }
  assert.throws(() => vm.runInNewContext(`${environment}\nenvironmentBoolean('CHECKPOINT_ONLY')`, {
    process: { env: { CHECKPOINT_ONLY: 'unknown' } }, refuse: code => { throw Error(code); },
  }), /ENVIRONMENT_INVALID/);
});
const reject = (options, code) => assert.throws(() => collect(options), error =>
  error.message === `POST_H0_DMI_ORIGINAL_${code}` && (error.originalDependencyCode === error.message
    ||code==='SELECTED_ENDPOINT_UNAVAILABLE'&&POST_H0_DMI_ENDPOINT_DIAGNOSTICS.some(reason=>
      error.originalDependencyCode===`POST_H0_DMI_ORIGINAL_${reason}`)));


test('endpoint failure detail: normal collector and seven-field CLI distinguish exact failure branches',async()=>{
  for(const [mutate,reason]of [
    [f=>{f.options.recoverySources[0].record.hourly=[{...rowAt(f,1),sources:{}}];},'SELECTED_ENDPOINT_SOURCE_MISSING'],
    [f=>{rowAt(f,1).currentProvenance.entityId='PART::OTHER';},'SELECTED_ENDPOINT_VIEW_MISMATCH'],
    [f=>{delete f.document.zones[f.identity.entityId].hourly[at(0)];},'SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING'],
    [f=>{rowAt(f,1).currentUMps+=0.1;},'SELECTED_ENDPOINT_PROOF_PROJECTION_MISMATCH'],
  ]){
    const f=fixture();mutate(f);const before=JSON.stringify(f.options);let error;
    try{collect(f.options);}catch(value){error=value;}
    assert(error instanceof Error);assert.equal(error.message,'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE');
    assert.equal(error.originalDependencyCode,'POST_H0_DMI_ORIGINAL_'+reason);assert.equal(error.code,undefined);
    const report=await describeRavScoreCurrentHistoryFailure(error,'COMMITTED_RAW_RETENTION');
    assert.deepEqual(Object.keys(report).sort(),['kind','code','phase','exceptionType','operator','frame','privatePayloadIncluded'].sort());
    assert.equal(report.code,error.originalDependencyCode);assert.equal(report.frame.line,18);
    assert.equal(report.frame.sha256,'0db7833d68cad3c1ab60c86855bab6e90b1cbf40d8a2ad766da74609781ce6dc');assert.equal(report.privatePayloadIncluded,false);
    assert.equal(JSON.stringify(f.options),before);assert.equal(error.message,'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE');
  }
});


test('endpoint failure detail: original validation keeps nonfinite INPUT_INVALID before missing-source diagnosis',()=>{
  for(const value of [NaN,Infinity,-Infinity]){
    const f=fixture(),selected=rowAt(f,1);
    f.options.recoverySources[0].record.hourly=[{...selected,sources:{current:value}}];
    assert.throws(()=>collect(f.options),error=>error.message==='POST_H0_DMI_ORIGINAL_INPUT_INVALID'
      &&error.originalDependencyCode===error.message&&error.code===undefined);
    assert(Object.is(f.options.recoverySources[0].record.hourly[0].sources.current,value));
  }
  for(const value of [null,undefined,false,0]){
    const f=fixture(),selected=rowAt(f,1);
    f.options.recoverySources[0].record.hourly=[{...selected,sources:{current:value}}];
    assert.throws(()=>collect(f.options),error=>error.message==='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE'
      &&error.originalDependencyCode==='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_SOURCE_MISSING'&&error.code===undefined);
    assert(Object.is(f.options.recoverySources[0].record.hourly[0].sources.current,value));
  }
});

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

test('committed B/S retention uses normal priority and UNKNOWN endpoints, never a local advanced H0', () => {
  const f = fixture();
  const part = { ...f.part, name: 'Synthetic retained PART', landPoint: [8.001, 55] };
  const state = f.options.initialSelection.state;
  const conditions = { datasetId: 'rr-synthetic-committed', productionReferenceAt: at(0),
    coastalParts: { parts: { [part.partId]: { ravScoreModel: { currentState: state } } } } };
  const checkpoint = { datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
    generationSha256: sha('synthetic-committed-S'), states: { [part.partId]: state } };
  const registry = { partCount: 1, zones: { [part.zoneId]: [part] } };
  const boundary = { datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
    bundleContentSha256: sha('synthetic-committed-B'), checkpointGenerationSha256: checkpoint.generationSha256,
    conditionsSha256: sha(JSON.stringify(conditions)) };
  // Structural normal caller fixture, NOT authenticated B/S or production proof.
  const options = { registry, conditions, checkpoint, boundary, productionReferenceAt: at(6),
    protectedBulk: f.document, zones: { features: [{ properties: { id: part.zoneId } }] } };
  const before = JSON.stringify(options);
  const plan = buildRavScoreRawCurrentRetention(options);
  const protectedCaptures = new Set(plan.captures.map(JSON.stringify));
  for (const capture of collect(f.options).captures) assert(protectedCaptures.has(JSON.stringify(capture)));
  assert.deepEqual(plan.captures.map(c => c.validTime).sort(), [-3, 0, 3, 6, 9].map(captureAt),
    'also retain the bounded possible normal Python merge/bracket endpoints, not a claimed exact final union');
  assert.deepEqual(plan.boundary, boundary);
  assert.equal(JSON.stringify(options), before);
  const advanced = buildIntegratedPartScoreSeries({ part, zone: { id: part.zoneId, onshoreDirectionDeg: 90 },
    hourly: [{ time: at(4) }] }).ravScoreState.continuationState;
  const local = structuredClone(conditions);
  local.coastalParts.parts[part.partId].ravScoreModel.currentState = advanced;
  assert.throws(() => buildRavScoreRawCurrentRetention({ ...options, conditions: local }),
    /RETENTION_COMMITTED_STATE_REQUIRED/, 'local score cannot unpin committed B/S');
  assert.deepEqual(buildRavScoreRawCurrentRetention(options).captures, plan.captures,
    'later score failure/no B/S publication leaves the exact requirements unchanged');
  const successor = { ...local, datasetId: 'rr-synthetic-successor', productionReferenceAt: at(4) };
  const nextCheckpoint = { ...checkpoint, datasetId: successor.datasetId, productionReferenceAt: at(4),
    generationSha256: sha('synthetic-new-S'), states: { [part.partId]: advanced } };
  const next = { ...options, conditions: successor, checkpoint: nextCheckpoint,
    boundary: { ...boundary, datasetId: successor.datasetId, productionReferenceAt: at(4),
      bundleContentSha256: sha('synthetic-new-B'), conditionsSha256: sha(JSON.stringify(successor)),
      checkpointGenerationSha256: nextCheckpoint.generationSha256 } };
  assert.deepEqual(buildRavScoreRawCurrentRetention(next).captures.map(c => c.validTime).sort(),
    [captureAt(3), captureAt(6), captureAt(9)], 'only the separately selected matching B/S releases older possible support');
  const coherent = fixture({ coherent: [-3, 0, 3, 6, 9] });
  assert.deepEqual(buildRavScoreRawCurrentRetention({ ...options, protectedBulk: coherent.document }).captures, []);
  const merged = buildRavScoreRawCurrentRetention({ ...options, protectedBulk: coherent.document,
    progressCandidate: coherent.document, progressActive: f.document });
  assert.equal(merged.captures.length, 5, 'normal active backfill cannot be lost behind an already coherent candidate');
  const invalid = structuredClone(f.document);
  invalid.zones[f.identity.entityId].hourly[at(3)].sources.current.contentSha256 = '';
  assert.throws(() => buildRavScoreRawCurrentRetention({ ...options, protectedBulk: coherent.document,
    progressCandidate: coherent.document, progressActive: invalid }), /RETENTION_CAPTURE_REQUIRED/);
});

test('normal one-PART native121 survives atomic continuity IO and newer model/window without inventing zero UNKNOWN demand', async t => {
  // Synthetic schema-valid native originals through real normal constructors.
  // Not GRIB decoding, authenticated B/S, a C capability or national capacity.
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const dmi = await import('./lib/dmi-forecast-store.mjs');
  const continuity = await import('./lib/dmi-part-continuity.mjs');
  const io = await import('./lib/dmi-forecast-file.mjs');
  assert.equal(dmi.DMI_FORECAST_HOURS, 121);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-native121-continuity-'));
  let complete = false;
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert(path.basename(root).startsWith('rr-native121-continuity-'));
    if (complete) await fs.rm(root, { recursive: true, force: true });
  });
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), originalFixture = JSON.stringify(f.options);
  const native = (shift, offset) => {
    const hour = shift + offset, source = structuredClone(f.natives[1].sources.current);
    Object.assign(source, { modelRun: at(shift), nativeValidTime: at(hour), leadTimeHours: offset,
      itemId: `synthetic-native121-${shift}-${offset}`, assetIdentitySha256: sha(`native121-asset-${shift}-${offset}`),
      contentSha256: sha(`native121-bytes-${shift}-${offset}`), acquiredAt: at(shift + 0.5),
      itemCreatedAt: at(shift), itemUpdatedAt: at(shift) });
    source.nativeGridSampling = sampling(source);
    return { time: at(hour), 'current-u': 0.1 + hour / 1000 + shift / 100, 'current-v': 0.2,
      sources: { current: source } };
  };
  const saveAndRestore = async shift => {
    const originals = Array.from({ length: 121 }, (_, offset) => native(shift, offset));
    const document = { ...structuredClone(f.document), generatedAt: at(shift + 6),
      zones: { [f.identity.entityId]: { ...f.identity,
        hourly: Object.fromEntries(originals.map(row => [row.time, row])) } } };
    const before = JSON.stringify(document);
    const projection = dmi.buildDmiForecastHourly({ ocean: originals.map(row => ({ step: row.time,
      'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
    generatedAt: at(shift + 6), startAt: at(shift), hours: dmi.DMI_FORECAST_HOURS }).hourly;
    const verified = verifiedIntegratedPartHourly({ point: f.part.waterPoint, hourly: projection },
      document, f.identity.entityId, f.part, { requireNativeGridSampling: true });
    assert.equal(verified.length, 121);
    for (const row of verified) {
      assert(Number.isFinite(row.currentUMps) && Number.isFinite(row.currentVMps));
      assert.equal(inspectDmiForecastGridSampling(row.currentProvenance, 'current', row.time, f.identity).status, 'coherent');
    }
    const packed = await continuity.packDmiPartContinuity(new Map([[f.part.partId,
      { point: f.part.waterPoint, zoneId: f.identity.entityId, hourly: verified }]]), [f.part], at(shift));
    const file = path.join(root, `forecast-${shift}.json`);
    await io.writeDmiForecastFileAtomic(file, { schemaVersion: 2, zones: {}, partContinuity: packed });
    const saved = await fs.readFile(file), read = await io.readDmiForecastFile(file);
    const restored = await continuity.unpackDmiPartContinuity(read.partContinuity, [f.part], at(shift + 6));
    assert.deepEqual(restored.get(f.part.partId).hourly, verified);
    assert.deepEqual(await fs.readFile(file), saved);
    assert.equal(JSON.stringify(document), before, 'normal projection/pack/IO never changes actual native contexts');
    return { document, record: restored.get(f.part.partId), file, saved };
  };
  const old = await saveAndRestore(0), fresh = await saveAndRestore(6);
  const fallback = { source: 'deployed-private-runtime', nativeCurrentContexts: [old.document], record: old.record };
  const preferred = { source: 'progressive-private-dmi', nativeCurrentContexts: [fresh.document], record: fresh.record };
  const selected = buildNewestValidRavScoreRecoverySources({ fallbackSource: fallback, preferredSource: preferred,
    protectedPreviousSource: fallback, productionReferenceAt: at(12), part: f.part });
  for (let hour = 6; hour < 12; hour++) {
    const actual = selected.flatMap(source => source.record.hourly).filter(row => row.time === at(hour) && Number.isFinite(row.currentUMps));
    assert.equal(actual.length, 1, 'normal priority must suppress the old component, not merely include a fresh donor');
    assert.equal(actual[0].currentProvenance.modelRun, at(6));
    assert.equal(inspectDmiForecastGridSampling(actual[0].currentProvenance, 'current', actual[0].time, f.identity).status, 'coherent');
  }
  const options = { ...f.options, targetReferenceAt: at(12), recoverySources: selected };
  assert.equal(collect(options).captures.length, 0, 'actual coherent saved/restored endpoints require no RAW originals');
  const unknown = structuredClone(fresh.document);
  delete unknown.zones[f.identity.entityId].hourly[at(8)].sources.current.nativeGridSampling;
  const feature = { properties: { id: f.identity.entityId, dataPoint: f.part.waterPoint } };
  const unknownRecord = buildPrivateDmiRecoveryRecord(feature, unknown, at(12),
    { startAt: at(0), expectedIdentity: f.identity, protectPreviousDmi: false });
  assert(unknownRecord);
  const unknownSource = { source: 'progressive-private-dmi', nativeCurrentContexts: [unknown], record: {
    ...unknownRecord, hourly: verifiedIntegratedPartHourly(unknownRecord, unknown, f.identity.entityId, f.part,
      { requireNativeGridSampling: false }) } };
  const demand = collect({ ...options, recoverySources: [unknownSource] });
  assert(demand.captures.length > 0, 'a genuinely selected UNKNOWN endpoint must still require its original');
  assert(demand.captures.some(capture => capture.validTime === captureAt(8)));
  assert.equal(JSON.stringify(f.options), originalFixture);
  assert.deepEqual(await fs.readFile(old.file), old.saved);
  assert.deepEqual(await fs.readFile(fresh.file), fresh.saved);
  complete = true;
});
