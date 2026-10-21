import { inverseAlternativeCCaller, inverseCurrentNativeOriginalConsumerTestInput, CURRENT_NATIVE_ORIGINAL_CONSUMER_TEST_REVIEW, inverseCurrent586EndpointDiagnosticTestInput, inverseCurrent586IdentityRefinementTestInput, inverseCurrent586SharedProjectionExportTestInput } from './lib/alternative-c-caller-test-input.mjs';
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
import { discoverCommittedCoherentOriginalBootstrap } from './lib/coherent-current-original-bootstrap.mjs';
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
  const currentCollectorSha256=sha(readFileSync(new URL('./lib/post-h0-dmi-original-dependencies.mjs',import.meta.url)));
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
    assert.equal(report.frame.module,'scripts/lib/post-h0-dmi-original-dependencies.mjs');
    assert.equal(report.frame.sha256,currentCollectorSha256);assert.equal(report.privatePayloadIncluded,false);
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

test('normal native originals consumers: A2 bank retention companions and newer candidate remain normal',async t=>{
  // Same normal native121 projection/continuity/priority/collector seam above.
  // Artificial schema-valid originals; not GRIB, authenticated B/S or395920 evidence.
  const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');
  const dmi=await import('./lib/dmi-forecast-store.mjs');
  const {buildProtectedDmiNativeCurrentProofs}=await import('./lib/protected-dmi-native-current-proofs.mjs');
  const continuity=await import('./lib/dmi-part-continuity.mjs');
  const io=await import('./lib/dmi-forecast-file.mjs');
  const {buildPartDmiForecastWithProtectedRetention}=await import('./lib/private-dmi-recovery-record.mjs');
  const {verifiedProtectedDmiPartHourly}=await import('./lib/protected-dmi-current-context.mjs');
  assert.equal(dmi.DMI_FORECAST_HOURS,121);
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rr-coherent-native-closure-'));
  let complete=false;
  t.after(async()=>{
    assert.equal(path.dirname(root),path.resolve(os.tmpdir()));
    assert(path.basename(root).startsWith('rr-coherent-native-closure-'));
    if(complete)await fs.rm(root,{recursive:true});
  });
  const f=fixture({coherent:[-3,0,3,6,9]});
  const feature={properties:{id:f.identity.entityId,dataPoint:f.part.waterPoint}};
  // Reuse the existing native121 fixture's source constructor and sampling record.
  // A is an older official run; B replaces only the native valid-time0 slot.
  const native=(run,lead)=>{
    const valid=run+lead,source=structuredClone(f.natives[1].sources.current);
    Object.assign(source,{modelRun:at(run),nativeValidTime:at(valid),leadTimeHours:lead,
      itemId:`synthetic-closure-${run}-${lead}`,assetIdentitySha256:sha(`closure-asset-${run}-${lead}`),
      contentSha256:sha(`closure-bytes-${run}-${lead}`),acquiredAt:at(run+0.5),
      itemCreatedAt:at(run),itemUpdatedAt:at(run)});
    source.nativeGridSampling=sampling(source);
    return{time:at(valid),'current-u':0.1+valid/1000+run/100,'current-v':0.2,sources:{current:source}};
  };
  const originals=Array.from({length:43},(_,index)=>native(-6,index*3));
  const oldDocument={...structuredClone(f.document),generatedAt:at(0),zones:{[f.identity.entityId]:{
    ...f.identity,hourly:Object.fromEntries(originals.map(row=>[row.time,row]))}}};
  const oldBefore=JSON.stringify(oldDocument);
  const oldRecord=buildPartDmiForecastWithProtectedRetention(feature,oldDocument,null,at(0),{
    startAt:at(0),expectedIdentity:f.identity});
  assert(oldRecord);assert.equal(oldRecord.hourly.length,121);
  const oldHourly=verifiedIntegratedPartHourly(oldRecord,oldDocument,f.identity.entityId,f.part,
    {requireNativeGridSampling:true});
  const oldA2=oldHourly.find(row=>row.time===at(2));assert(oldA2);
  assert.equal(oldA2.sources.current.modelRun,at(-6));
  assert.deepEqual(oldA2.sources.current.nativeSteps.map(step=>step.nativeValidTime),[at(0),at(3)]);
  assert.equal(inspectDmiForecastGridSampling(oldA2.currentProvenance,'current',oldA2.time,f.identity).status,'coherent');
  assert.equal(createProtectedDmiNativeCurrentInspector({contexts:[oldDocument]}).inspectOriginals({part:f.part,row:oldA2}).ok,true);
  // Real producer storage shape: one current source tuple at a valid-time key.
  const partialDocument=structuredClone(oldDocument);
  partialDocument.zones[f.identity.entityId].hourly[at(0)]=native(0,0);
  const partialBefore=JSON.stringify(partialDocument);
  const retained=buildPartDmiForecastWithProtectedRetention(feature,partialDocument,oldDocument,at(0),{
    startAt:at(0),expectedIdentity:f.identity,persistedHourly:oldRecord.hourly});
  // Observed positive edge control: B0 legitimately supplies the first hour only.
  const retainedB1=retained.hourly.find(row=>row.time===at(1));assert(retainedB1);
  assert.equal(retainedB1.sources.current.modelRun,at(0));
  assert.equal(retainedB1.sources.current.temporalResolution,'nearest-edge');
  const retainedA2=retained.hourly.find(row=>row.time===at(2));assert(retainedA2);
  assert.deepEqual(retainedA2.sources.current,oldA2.sources.current);
  assert.equal(partialDocument.zones[f.identity.entityId].hourly[at(0)].sources.current.modelRun,at(0));
  assert.equal(partialDocument.zones[f.identity.entityId].hourly[at(3)].sources.current.modelRun,at(-6));
  // This is the existing published PART-continuity producer/atomic IO/readback,
  // not an invented native donor or a fabricated serialized proof.
  const nativeBank=buildProtectedDmiNativeCurrentProofs({
    selections:retained.hourly.map(row=>({part:f.part,row})),contexts:[partialDocument,oldDocument]});
  const packed=await continuity.packDmiPartContinuity(new Map([[f.part.partId,retained]]),[f.part],at(0),
    {nativeCurrentProofsByPart:new Map([[f.part.partId,nativeBank]])});
  const file=path.join(root,'forecast.json');
  await io.writeDmiForecastFileAtomic(file,{schemaVersion:2,zones:{},partContinuity:packed});
  const saved=await fs.readFile(file),read=await io.readDmiForecastFile(file);
  const restored=await continuity.unpackDmiPartContinuity(read.partContinuity,[f.part],at(6));
  assert.deepEqual(restored.get(f.part.partId).hourly,retained.hourly);
  const recoveryRecord=buildPrivateDmiRecoveryRecord(feature,partialDocument,at(6),{
    startAt:at(0),expectedIdentity:f.identity,persistedHourly:restored.get(f.part.partId).hourly,
    protectPreviousDmi:true});
  const recovered=verifiedProtectedDmiPartHourly(recoveryRecord,[partialDocument],f.identity.entityId,f.part,
    {requireNativeGridSampling:false});
  const fallback={source:'deployed-private-runtime',nativeCurrentContexts:[partialDocument],
    record:{...recoveryRecord,hourly:recovered}};
  const selected=buildNewestValidRavScoreRecoverySources({fallbackSource:fallback,protectedPreviousSource:fallback,
    productionReferenceAt:at(6),part:f.part});
  const selectedA2=selected.flatMap(source=>source.record.hourly).find(row=>row.time===at(2));
  assert(Number.isFinite(selectedA2.currentUMps));
  assert.deepEqual(selectedA2.sources.current,oldA2.sources.current);
  assert.equal(inspectDmiForecastGridSampling(selectedA2.currentProvenance,'current',at(2),f.identity).status,'coherent');
  const own=createProtectedDmiNativeCurrentInspector({contexts:[partialDocument]}).inspectOriginals({part:f.part,row:selectedA2});
  assert.deepEqual(own,{ok:false,code:'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING'});
  assert.throws(()=>collect({...f.options,targetReferenceAt:at(6),recoverySources:selected}),error=>
    error.message==='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE'
      &&error.originalDependencyCode==='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING');
  // Positive control uses the actual unchanged old native document, not a label,
  // inspector stub, reconstructed provenance, changed score or zeroed demand.
  const completeFallback={...fallback,nativeCurrentContexts:[partialDocument,oldDocument]};
  const completeSelected=buildNewestValidRavScoreRecoverySources({fallbackSource:completeFallback,
    protectedPreviousSource:completeFallback,productionReferenceAt:at(6),part:f.part});
  const plan=collect({...f.options,targetReferenceAt:at(6),recoverySources:completeSelected});
  assert.equal(plan.captures.length,0);assert(plan.counts.coherentRows>0);
  assert.equal(JSON.stringify(oldDocument),oldBefore);assert.equal(JSON.stringify(partialDocument),partialBefore);
  assert.deepEqual(await fs.readFile(file),saved);
  // Same actual restored per-PART bank; the old donor document is absent here.
  const savedRecord=restored.get(f.part.partId);
  const bankFallback={...fallback,nativeCurrentOriginals:savedRecord.nativeCurrentOriginals};
  const bankSelected=buildNewestValidRavScoreRecoverySources({fallbackSource:bankFallback,
    protectedPreviousSource:bankFallback,productionReferenceAt:at(6),part:f.part});
  assert.equal(bankSelected[0].nativeCurrentOriginals,savedRecord.nativeCurrentOriginals);
  const bankPlan=collect({...f.options,targetReferenceAt:at(6),recoverySources:bankSelected});
  assert.equal(bankPlan.captures.length,0);assert(bankPlan.counts.coherentRows>0);
  assert.deepEqual(bankSelected[0].nativeCurrentContexts,[partialDocument]);
  // Bank existence cannot hide a wrong-PART wrapper, change the chosen current
  // tuple, or make an older DMI model win over a normally qualified newer one.
  const wrong=structuredClone(bankFallback);
  wrong.nativeCurrentOriginals.bank.contexts[0].value.partId='OTHER-SYNTHETIC-PART';
  assert.throws(()=>collect({...f.options,targetReferenceAt:at(6),recoverySources:[wrong]}),
    error=>error.message==='POST_H0_DMI_ORIGINAL_INPUT_INVALID');
  const freshDocument={...structuredClone(f.document),generatedAt:at(6),zones:{[f.identity.entityId]:{
    ...f.identity,hourly:Object.fromEntries(Array.from({length:43},(_,index)=>native(0,index*3)).map(row=>[row.time,row]))}}};
  const freshRecord=buildPrivateDmiRecoveryRecord(feature,freshDocument,at(6),{startAt:at(0),expectedIdentity:f.identity});
  const fresh={source:'progressive-private-dmi',nativeCurrentContexts:[freshDocument],record:{...freshRecord,
    hourly:verifiedIntegratedPartHourly(freshRecord,freshDocument,f.identity.entityId,f.part,{requireNativeGridSampling:true})}};
  const newest=buildNewestValidRavScoreRecoverySources({fallbackSource:bankFallback,preferredSource:fresh,
    protectedPreviousSource:bankFallback,productionReferenceAt:at(6),part:f.part});
  const a2=newest.flatMap(source=>source.record.hourly).filter(row=>row.time===at(2)&&Number.isFinite(row.currentUMps));
  assert.equal(a2.length,1);assert.equal(a2[0].currentProvenance.modelRun,at(0));
  assert.equal(newest[0].nativeCurrentOriginals,savedRecord.nativeCurrentOriginals);
  assert.equal(collect({...f.options,targetReferenceAt:at(6),recoverySources:newest}).captures.length,0);
  // The existing pure normal planner seam uses actual source documents as
  // companion proof ONLY; this is not an authenticated B transport fixture.
  const part={...f.part,name:'Synthetic retained PART',landPoint:[8.001,55]};
  const state=f.options.initialSelection.state;
  const conditions={datasetId:'rr-synthetic-native-consumers',productionReferenceAt:at(0),
    coastalParts:{parts:{[part.partId]:{ravScoreModel:{currentState:state}}}}};
  const checkpoint={datasetId:conditions.datasetId,productionReferenceAt:at(0),
    generationSha256:sha('synthetic-native-consumers-S'),states:{[part.partId]:state}};
  const options={registry:{partCount:1,zones:{[part.zoneId]:[part]}},conditions,checkpoint,
    productionReferenceAt:at(6),protectedBulk:partialDocument,
    persistedHourlyByPart:new Map([[part.partId,{point:savedRecord.point,hourly:savedRecord.hourly}]]),
    zones:{features:[{properties:{id:part.zoneId}}]},boundary:{datasetId:conditions.datasetId,
      productionReferenceAt:at(0),bundleContentSha256:sha('synthetic-native-consumers-B'),
      checkpointGenerationSha256:checkpoint.generationSha256,conditionsSha256:sha(JSON.stringify(conditions))}};
  assert.throws(()=>buildRavScoreRawCurrentRetention(options),
    error=>error.originalDependencyCode==='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING');
  assert.equal(buildRavScoreRawCurrentRetention({...options,protectedCompanionContexts:[oldDocument]}).captures.length,0);
  assert.equal(buildRavScoreRawCurrentRetention({...options,
    persistedHourlyByPart:new Map([[part.partId,savedRecord]])}).captures.length,0);
  assert.throws(()=>buildRavScoreRawCurrentRetention({...options,
    protectedCompanionContexts:[oldDocument,oldDocument,oldDocument]}),/RETENTION_INPUT_INVALID/);
  assert.equal(JSON.stringify(oldDocument),oldBefore);assert.equal(JSON.stringify(partialDocument),partialBefore);
  assert.deepEqual(await fs.readFile(file),saved);
  complete=true;
});

test('native-original planner oracle preserves complete earlier source and actual collector identity', () => {
  assert.deepEqual(CURRENT_NATIVE_ORIGINAL_CONSUMER_TEST_REVIEW.rows.map(row => row.path),
    ['scripts/plan-ravscore-current-history.mjs', 'scripts/lib/post-h0-dmi-original-dependencies.mjs']);
  for (const row of CURRENT_NATIVE_ORIGINAL_CONSUMER_TEST_REVIEW.rows) {
    const current = inverseCurrent586EndpointDiagnosticTestInput(inverseCurrent586IdentityRefinementTestInput(inverseCurrent586SharedProjectionExportTestInput(
      readFileSync(new URL('../' + row.path, import.meta.url), 'utf8').replace(/\r\n/g, '\n'), row.path), row.path), row.path);
    assert.equal(sha(current), row.after.sha256, 'The actual current source must be qualified before historical projection');
    assert.equal(Buffer.byteLength(current), row.after.bytes);
    const original = inverseCurrentNativeOriginalConsumerTestInput(current, row.path);
    assert.equal(sha(original), row.before.sha256);
    assert.equal(inverseCurrentNativeOriginalConsumerTestInput(original, row.path), original);
    for (const edit of row.edits) {
      assert.equal(current.slice(edit.offset, edit.offset + edit.after.length), edit.after);
      const changed = edit.after.length
        ? current.slice(0, edit.offset) + (edit.after[0] === 'X' ? 'Y' : 'X') + current.slice(edit.offset + 1)
        : current.slice(0, edit.offset) + edit.before + current.slice(edit.offset);
      assert.notEqual(changed, current);
      assert.throws(() => inverseCurrentNativeOriginalConsumerTestInput(changed, row.path), /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
    }
    assert.throws(() => inverseCurrentNativeOriginalConsumerTestInput(current + '// unreviewed drift\n', row.path),
      /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
    assert.throws(() => inverseCurrentNativeOriginalConsumerTestInput(current, 'scripts/unknown.mjs'),
      /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
    if (row.path === 'scripts/plan-ravscore-current-history.mjs') {
      assert.equal(sha(inverseAlternativeCCaller(current, row.path)),
        '667b05b88a7cb3734507baccaa3bfa4e1fdd1214ea0ca076027dcbbae03d65d1');
      assert.equal(inverseAlternativeCCaller(current, row.path), inverseAlternativeCCaller(original, row.path));
    }
  }
  assert.throws(() => inverseCurrentNativeOriginalConsumerTestInput({}, 'scripts/plan-ravscore-current-history.mjs'),
    /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
});

test('normal authenticated B companions CLI: original fixed entries survive working changes and missing originals still fail',async t=>{
  // Real fixed CLI + ordinary local B create/verify and S save/load. Synthetic
  // constructor-valid DMI originals, not remote GCM/GRIB or production evidence.
  const fs=await import('node:fs/promises'),path=await import('node:path'),os=await import('node:os');
  const {fileURLToPath}=await import('node:url'),{spawnSync}=await import('node:child_process');
  const {GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST:integratedInventory}
    =await import('../js/core/ravscore-model-bundle.generated.js');
  const {GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST:candidateInventory}
    =await import('./rollback-assets/ravscore-model-bundle.generated.js');
  const {RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,ravScoreContinuationImplementationSha256}
    =await import('./lib/ravscore-continuation-implementation-contract.mjs');
  const {saveRavScoreContinuationCheckpoint,RAVSCORE_CONTINUATION_CHECKPOINT_POLICY}
    =await import('./ravscore-continuation-checkpoint.mjs');
  const {buildPrivateRuntimeCreateSpec,PRIVATE_RUNTIME_CONTRACT_FILES,PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES}
    =await import('./private-production-runtime-workflow.mjs');
  const {createPrivateProductionRuntimeBundle,verifyPrivateProductionRuntimeBundle}
    =await import('./private-production-runtime-bundle.mjs');
  const {PRIVATE_RUNTIME_BASE_FILES,PRIVATE_WEATHER_COMPONENT_FILES}
    =await import('./lib/private-weather-component-inventory.mjs');
  const {buildCandidateGDerivedStateSeries}=await import('../js/core/ravscore-candidate-g-state-pipeline.js');
  const {candidateGStateKey}=await import('./lib/coastal-point-staging-contract.mjs');
  const {ravScoreModelBinding}=await import('../js/core/ravscore-model-contract.js');
  const {ravScoreModelBinding:rollbackBinding}=await import('./rollback-assets/ravscore-model-contract.js');
  const {buildPartDmiForecastWithProtectedRetention}=await import('./lib/private-dmi-recovery-record.mjs');
  const {packDmiPartContinuity}=await import('./lib/dmi-part-continuity.mjs');
  const {writeDmiForecastFileAtomic}=await import('./lib/dmi-forecast-file.mjs');
  const {packPrivateConditionsHourly,assertPrivateConditionsHourly}=await import('./lib/private-conditions-hourly.mjs');
  const repository=fileURLToPath(new URL('../',import.meta.url));
  const root=await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'rr-auth-companion-cli-'));
  const rootIdentity=await fs.lstat(root,{bigint:true});let complete=false;
  t.after(async()=>{
    assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));
    assert(path.basename(root).startsWith('rr-auth-companion-cli-'));
    const current=await fs.lstat(root,{bigint:true});assert.equal(current.dev,rootIdentity.dev);assert.equal(current.ino,rootIdentity.ino);
    if(complete)await fs.rm(root,{recursive:true}); // Only the wholly owned artificial fixture.
  });
  const host=path.join(root,'source');await fs.mkdir(host,{mode:0o700});
  // Fixed-root host from the genuine model, continuation and normal producer
  // inventories. Computed historical loaders are copied byte-for-byte, not
  // interpreted as calls made by this ordinary retain-committed-raw CLI.
  // This closed controller list supplies their actual static module neighbours;
  // no directory copy, synthetic module, import rewrite or scanner exception.
  const fixedCliSources=[
    'scripts/current-family-cold-start.mjs',
    'scripts/lib/post-h0-dmi-original-dependencies.mjs',
    'scripts/check-native-identity-frozen-i71-source.mjs',
    'scripts/verify-native-sampling-identity-successor-plan.mjs',
    'scripts/native-sampling-identity-successor-readiness.mjs',
    'scripts/migrate-post-cutover-private-runtime.mjs',
    'scripts/audit-ravscore-integrated-public-runtime.mjs',
    'scripts/runtime-binding-registry.mjs',
    'scripts/lib/native-identity-staging-working-copy.mjs',
    'scripts/lib/native-sampling-identity-successor-source.mjs',
    'scripts/lib/current-grid-successor-source.mjs',
    'scripts/lib/account-assistant-successor-source.mjs',
    'scripts/lib/rebind-public-hour-pack-exact.mjs',
    'scripts/lib/public-delivery-nested-binding.mjs',
    'scripts/lib/protected-live-current-assembly.mjs',
    'scripts/lib/ravscore-continuation-implementation-contract.mjs',
    'scripts/lib/static-module-closure.mjs',
    'js/core/current-direction-audit.js',
    'js/core/direction-anchors.js',
    'js/core/water-station-routing.js',
    'scripts/archived-weather-restart.mjs',
    'scripts/build-public-coastal-parts-v2.mjs',
    'scripts/build-statistics-preference-revision.mjs',
    'scripts/check-last-mile-enclosure-predecessor-source.mjs',
    'scripts/lib/archived-weather-restart-input-view.mjs',
    'scripts/lib/current-memory-warmup-successor-source.mjs',
    'scripts/lib/current-spatial-runtime-proof.mjs',
    'scripts/lib/data-quality.mjs',
    'scripts/lib/dmi-acquisition-state.mjs',
    'scripts/lib/dmi-native-current-runtime-projection.mjs',
    'scripts/lib/established-native-current-origin-successor-source.mjs',
    'scripts/lib/last-mile-enclosure-successor-source.mjs',
    'scripts/lib/local-part-runtime.mjs',
    'scripts/lib/native0600-original-successor-source.mjs',
    'scripts/lib/ravscore-initial-current-window-audit.mjs',
    'scripts/lib/ravscore-operational-state-readiness.mjs',
    'scripts/lib/saved-current-forward-original-plan.mjs',
    'scripts/lib/saved-current-replay-grid-audit.mjs',
    'scripts/lib/water-level-continuity.mjs',
    'scripts/lib/water-station-routing-alerts.mjs',
    'scripts/lib/weather-history-retention.mjs',
    'scripts/verify-account-assistant-schema.mjs',
  ];
  const productBytes=new Map(),pending=[...new Set([
    'scripts/plan-ravscore-current-history.mjs','package.json',...fixedCliSources,
    ...RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
    ...Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat(),
    ...PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES,...candidateInventory.excludedModules,
    ...integratedInventory.files.map(row=>row.path),...candidateInventory.files.map(row=>row.file),
  ])];
  let sourceBytes=0;
  while(pending.length){
    const relative=pending.pop();if(productBytes.has(relative))continue;
    assert.equal(path.posix.normalize(relative),relative);assert(!relative.startsWith('../')&&!path.posix.isAbsolute(relative));
    const input=path.join(repository,relative),stat=await fs.lstat(input);assert(stat.isFile()&&!stat.isSymbolicLink());
    const bytes=await fs.readFile(input);productBytes.set(relative,bytes);sourceBytes+=bytes.length;
    assert(productBytes.size<=2048&&sourceBytes<=32*1024*1024);
  }
  const write=async(relative,value,{replace=false}={})=>{
    const file=path.join(host,relative);await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});
    await fs.writeFile(file,Buffer.isBuffer(value)?value:typeof value==='string'?value:JSON.stringify(value)+'\n',
      {flag:replace?'w':'wx',mode:0o600});return file;
  };
  for(const[relative,bytes]of productBytes){await write(relative,bytes);assert.deepEqual(await fs.readFile(path.join(host,relative)),bytes);}
  assert.equal(await ravScoreContinuationImplementationSha256({repositoryRoot:host}),
    await ravScoreContinuationImplementationSha256({repositoryRoot:repository}));

  const f=fixture({coherent:[-3,0,3,6,9]});
  const targetPart={...f.part,name:'Synthetic retained PART',landPoint:[8.001,55]};
  const feature={properties:{id:f.identity.entityId,dataPoint:targetPart.waterPoint}};
  const native=(run,lead)=>{
    const valid=run+lead,source=structuredClone(f.natives[1].sources.current);
    Object.assign(source,{modelRun:at(run),nativeValidTime:at(valid),leadTimeHours:lead,
      itemId:`synthetic-cli-closure-${run}-${lead}`,assetIdentitySha256:sha(`cli-asset-${run}-${lead}`),
      contentSha256:sha(`cli-bytes-${run}-${lead}`),acquiredAt:at(run+0.5),itemCreatedAt:at(run),itemUpdatedAt:at(run)});
    source.nativeGridSampling=sampling(source);
    return{time:at(valid),'current-u':0.1+valid/1000+run/100,'current-v':0.2,sources:{current:source}};
  };
  const old={...structuredClone(f.document),generatedAt:at(0),zones:{[f.identity.entityId]:{...f.identity,
    hourly:Object.fromEntries(Array.from({length:43},(_,i)=>native(-6,i*3)).map(row=>[row.time,row]))}}};
  const partial=structuredClone(old);partial.zones[f.identity.entityId].hourly[at(0)]=native(0,0);
  const oldRecord=buildPartDmiForecastWithProtectedRetention(feature,old,null,at(0),{startAt:at(0),expectedIdentity:f.identity});
  const retained=buildPartDmiForecastWithProtectedRetention(feature,partial,old,at(0),{
    startAt:at(0),expectedIdentity:f.identity,persistedHourly:oldRecord.hourly});
  const a2=retained.hourly.find(row=>row.time===at(2));assert(a2);
  assert.deepEqual(a2.sources.current.nativeSteps.map(step=>step.nativeValidTime),[at(0),at(3)]);
  assert.equal(createProtectedDmiNativeCurrentInspector({contexts:[partial]}).inspectOriginals({part:targetPart,row:a2}).code,
    'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
  assert.equal(createProtectedDmiNativeCurrentInspector({contexts:[old]}).inspectOriginals({part:targetPart,row:a2}).ok,true);

  // Fixed CLI and normal B/S policies require210/673; no test-only override.
  // Only one PART has DMI values. Other121 rows carry time alone, never fake weather.
  const zoneIds=[targetPart.zoneId,...Array.from({length:209},(_,i)=>'SYNTHETIC-CLI-ZONE-'+i)];
  const parts=[targetPart,...Array.from({length:RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount-1},(_,i)=>({
    partId:'SYNTHETIC-CLI-PART-'+String(i).padStart(3,'0'),zoneId:zoneIds[(i+1)%zoneIds.length],
    name:'Synthetic retained companion PART '+i,
    landPoint:[8.001+i/100000,55],waterPoint:[8+i/100000,55],onshoreDirectionDeg:90}))];
  assert.equal(parts.length,673);
  const registry={schemaVersion:2,enabled:true,zoneCount:210,partCount:673,zones:Object.fromEntries(zoneIds.map(id=>[id,[]]))};
  const stateParts={},candidateParts={},records=new Map();
  for(const part of parts){
    registry.zones[part.zoneId].push(part);
    const state=buildIntegratedPartScoreSeries({part,zone:{id:part.zoneId,onshoreDirectionDeg:90},hourly:[{time:at(0)}]})
      .ravScoreState.continuationState;
    stateParts[part.partId]={...part,ravScoreModel:{currentState:state}};
    const candidate=buildCandidateGDerivedStateSeries([{time:at(0)}],{stateKey:candidateGStateKey(part)}).continuationState;
    assert.equal(candidate.transportMemoryReady,false);
    candidateParts[part.partId]={ravScoreModel:{currentState:candidate}};
    records.set(part.partId,part===targetPart?retained:{zoneId:'PART::'+part.partId,point:part.waterPoint,
      hourly:Array.from({length:121},(_,i)=>({time:at(i)}))});
  }
  const ledger='{"synthetic":"fixed authenticated companion CLI fixture"}\n';
  const conditions={datasetId:'rr-synthetic-auth-companion-cli',productionReferenceAt:at(0),generatedAt:at(0),
    zones:Object.fromEntries(zoneIds.map(id=>[id,{forecast:{hourly:[]}}])),
    coastalParts:{modelBinding:ravScoreModelBinding(),parts:stateParts,
      zones:Object.fromEntries(zoneIds.map(id=>[id,{hourly:[]}]))},
    ravScoreCandidateGWarmup:{schemaVersion:'1.0.0',kind:'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
      privacyClass:'PRIVATE_PRODUCTION_RUNTIME',status:'BUILDING_MEASURED_ONLY',evidencePolicy:'MEASURED_ONLY',
      syntheticHistoryAllowed:false,automaticActivationAllowed:false,publicDuringNormalOperation:false,
      sourceModelBinding:ravScoreModelBinding(),candidateModelBinding:rollbackBinding(),runtime:{
        modelBinding:rollbackBinding(),status:'BUILDING_MEASURED_ONLY',expectedPartCount:673,measuredPartCount:673,parts:candidateParts}},
    weatherComponentInputs:{schemaVersion:1,kind:'PRIVATE_WEATHER_COMPONENT_INPUTS',sourceSelectionApplied:true,
      openMeteoBankSha256:null,copernicusBankSha256:null,selectedComponentsSha256:sha(ledger)}};
  await write('data/live/coastal-parts-v2.json',registry);
  await write('data/zones.geojson',{type:'FeatureCollection',features:zoneIds.map(id=>({type:'Feature',properties:{id}}))});
  const packedConditions=packPrivateConditionsHourly(conditions);assert.equal(assertPrivateConditionsHourly(packedConditions),true);
  await write('data/live/conditions.json',packedConditions);
  await fs.mkdir(path.join(host,'.cache/ravscore-continuation-checkpoint'),{recursive:true});
  const checkpointPath=path.join(host,'.cache/ravscore-continuation-checkpoint/checkpoint.json');
  await saveRavScoreContinuationCheckpoint({sourcePath:path.join(host,'data/live/conditions.json'),checkpointPath,repositoryRoot:host});
  const sBefore=await fs.readFile(checkpointPath);
  const continuity=await packDmiPartContinuity(records,parts,at(0));assert.equal(continuity.schemaVersion,1);
  await fs.mkdir(path.join(host,'data/live'),{recursive:true});
  await writeDmiForecastFileAtomic(path.join(host,'data/live/dmi-forecast-cache.json'),{schemaVersion:2,zones:{},partContinuity:continuity});
  await write('data/live/dmi-bulk-cache.json',partial);await write('.cache/deployed-dmi-bulk-cache.json',partial);
  for(const descriptor of PRIVATE_RUNTIME_BASE_FILES){
    const file=path.join(host,descriptor.relativePath);
    if(!await fs.lstat(file).catch(error=>{if(error.code==='ENOENT')return null;throw error;}))await write(descriptor.relativePath,{});
  }
  await write(PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents,ledger);
  const emptyWorking={...structuredClone(partial),zones:{}};
  const oldBytes=JSON.stringify(old),partialBytes=JSON.stringify(partial);
  const output=path.join(host,'.cache/ravscore-current-history-demand.json');
  const envBase=Object.fromEntries(Object.entries(process.env).filter(([key])=>
    new Set(['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','LANG','LC_ALL']).has(key.toUpperCase())));
  const networkGuard=`import http from 'node:http';import https from 'node:https';import {syncBuiltinESMExports} from 'node:module';
    const forbidden=()=>{process.stderr.write('FORBIDDEN_NETWORK\\n');process.exit(97)};
    globalThis.fetch=forbidden;http.get=http.request=https.get=https.request=forbidden;syncBuiltinESMExports();`;
  for(const[mode,active,candidate,expected]of[
    ['active',old,partial,0],['candidate',partial,old,0],['missing',partial,partial,1],['first-error',[],old,1]]){
    await write(PRIVATE_WEATHER_COMPONENT_FILES.dmiActive,active,{replace:true});
    await write(PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate,candidate,{replace:true});
    const privateRoot=path.join(root,'private-'+mode);await fs.mkdir(privateRoot,{mode:0o700});
    const bundlePath=path.join(privateRoot,'bundle');
    const spec=await buildPrivateRuntimeCreateSpec({repositoryRoot:host});
    await createPrivateProductionRuntimeBundle({...spec,privateRoot,bundlePath,repositoryRoot:host});
    const verified=await verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:host});
    assert.equal(verified.verified,true);assert.equal(verified.partCount,673);assert.equal(verified.zoneCount,210);
    const bBefore=new Map(await Promise.all(['manifest.json',...verified.files.map(row=>'payload/'+row.relativePath)]
      .map(async relative=>[relative,await fs.readFile(path.join(bundlePath,relative))])));
    const runner=path.join(root,'runner-'+mode),tmp=path.join(root,'temp-'+mode);
    await fs.mkdir(runner,{mode:0o700});await fs.mkdir(tmp,{mode:0o700});
    await fs.writeFile(path.join(runner,'private-runtime-current-source.json'),JSON.stringify(verified),{flag:'wx',mode:0o600});
    await fs.writeFile(path.join(tmp,'untouched-sentinel'),'owned fixture sentinel',{flag:'wx',mode:0o600});
    // Mutate ONLY disposable working files after B was really built/verified.
    await write(PRIVATE_WEATHER_COMPONENT_FILES.dmiActive,emptyWorking,{replace:true});
    await write(PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate,emptyWorking,{replace:true});
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(host,PRIVATE_WEATHER_COMPONENT_FILES.dmiActive),'utf8')),emptyWorking);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(host,PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate),'utf8')),emptyWorking);
    assert.notDeepEqual(emptyWorking,old,'The unchanged old original is absent from both mutable working donors');
    const env={...envBase,RUNNER_TEMP:runner,TMPDIR:tmp,TMP:tmp,TEMP:tmp,
      RAVRADAR_PRIVATE_RUNTIME_ROOT:privateRoot,RAVRADAR_PRIVATE_RUNTIME_BUNDLE:bundlePath,
      RAVRADAR_PRODUCTION_TARGET_HOUR:at(6).replace('.000Z','Z'),RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE:'true',
      RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED:'false',RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP:'false',CHECKPOINT_ONLY:'false'};
    // One bounded filesystem fault only: don't replace verification/proof.
    // Invalid decoded [] must stay FIRST even when normal cleanup gets EIO.
    const fault=mode==='first-error'?`import fs from 'node:fs/promises';import path from 'node:path';
      const original=fs.rmdir;fs.rmdir=async function(file,...rest){
        if(path.dirname(path.dirname(file)).startsWith(process.env.TMPDIR+path.sep+'rr-raw-retention-companions-')
          &&path.basename(file)==='.cache'){const error=new Error('SYNTHETIC_CLEANUP_EIO');error.code='EIO';throw error;}
        return Reflect.apply(original,this,[file,...rest]);};`:'';
    const result=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(networkGuard),
      ...(fault?['--import','data:text/javascript,'+encodeURIComponent(fault)]:[]),
      path.join(host,'scripts/plan-ravscore-current-history.mjs'),'--retain-committed-raw'],
      {cwd:host,env,encoding:'utf8',timeout:90_000,maxBuffer:1024*1024,windowsHide:true});
    // Keep whole child transports private before extracting any status/error.
    await fs.writeFile(path.join(root,mode+'.stdout'),result.stdout??'',{flag:'wx',mode:0o600});
    await fs.writeFile(path.join(root,mode+'.stderr'),result.stderr??'',{flag:'wx',mode:0o600});
    assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,expected,result.stderr);
    assert(!result.stderr.includes('FORBIDDEN_NETWORK'));
    if(expected===0){
      const demand=JSON.parse(await fs.readFile(output,'utf8'));
      assert.equal(demand.schemaVersion,2);assert.equal(demand.demands.length,673);assert.equal(demand.rawRetention.captures.length,0);
      assert.equal(demand.rawRetention.boundary.bundleContentSha256,verified.bundleContentSha256);
      const savedS=JSON.parse(sBefore);assert.equal(demand.rawRetention.boundary.checkpointGenerationSha256,savedS.generationSha256);
      await fs.rename(output,path.join(root,mode+'.demand.json')); // Own output only; preserve the first plan.
    }else{
      const reports=result.stderr.trim().split(/\r?\n/).map(line=>{try{return JSON.parse(line);}catch{return null;}})
        .filter(row=>row?.kind==='RAVSCORE_CURRENT_HISTORY_FIRST_FAILURE');
      assert.equal(reports.length,1);const report=reports[0];assert.equal(report.phase,'COMMITTED_RAW_RETENTION');
      assert.equal(report.privatePayloadIncluded,false);
      if(mode==='missing')assert.equal(report.code,'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING');
      else{assert.equal(report.code,'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');
        assert.equal(report.frame.module,'scripts/lib/dmi-bulk-storage.mjs');assert.notEqual(report.code,'EIO');}
      await assert.rejects(fs.access(output),{code:'ENOENT'});
    }
    for(const[relative,bytes]of bBefore)assert.deepEqual(await fs.readFile(path.join(bundlePath,relative)),bytes);
    assert.deepEqual(await fs.readFile(checkpointPath),sBefore);
    const finalVerified=await verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:host,expected:verified});
    assert.equal(finalVerified.bundleContentSha256,verified.bundleContentSha256);
    const tempNames=await fs.readdir(tmp);
    if(mode==='first-error')assert.equal(tempNames.filter(name=>name.startsWith('rr-raw-retention-companions-')).length,1,
      'An EIO cleanup keeps its own unresolved private stage without masking the decoder error');
    else assert.deepEqual(tempNames,['untouched-sentinel'],'Successful API/decode/cleanup leaves no owned stage, even if later collector fails');
  }
  assert.equal(JSON.stringify(old),oldBytes);assert.equal(JSON.stringify(partial),partialBytes);
  for(const[relative,bytes]of productBytes)assert.deepEqual(await fs.readFile(path.join(host,relative)),bytes);
  complete=true;
});

// Append to the EXISTING post-H0 test target, retaining its fixture() unchanged.
// Synthetic normal-projection contracts only; no actual authenticated B or RAW.
function coherentBootstrapInput(f, hourly = f.options.recoverySources[0].record.hourly) {
  const part = { ...f.part, name: 'Synthetic bootstrap PART', landPoint: [8.001, 55] };
  const state = f.options.initialSelection.state;
  const conditions = { datasetId: 'rr-synthetic-coherent-bootstrap', productionReferenceAt: at(0),
    coastalParts: { parts: { [part.partId]: { ravScoreModel: { currentState: state } } } } };
  const checkpoint = { datasetId: conditions.datasetId, productionReferenceAt: at(0),
    generationSha256: sha('synthetic-bootstrap-S'), states: { [part.partId]: state } };
  const protectedBulk = structuredClone(f.document);
  protectedBulk.zones[f.identity.entityId].hourly = {};
  return { registry: { partCount: 1, zones: { [part.zoneId]: [part] } }, conditions, checkpoint,
    boundary: { datasetId: conditions.datasetId, productionReferenceAt: at(0),
      bundleContentSha256: sha('synthetic-bootstrap-B'), conditionsSha256: sha(JSON.stringify(conditions)),
      checkpointGenerationSha256: checkpoint.generationSha256 }, productionReferenceAt: at(6),
    protectedBulk, persistedHourlyByPart: new Map([[part.partId,
      { point: part.waterPoint, hourly: structuredClone(hourly) }]]),
    zones: { features: [{ properties: { id: part.zoneId } }] } };
}
const bootstrapInputBytes = input => JSON.stringify([input, [...input.persistedHourlyByPart]]);

test('coherent original bootstrap metadata: single-native own top binds metadata but not original or RAW proof', () => {
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] });
  const input = coherentBootstrapInput(f, [rowAt(f, 3)]), before = bootstrapInputBytes(input);
  assert.throws(() => buildRavScoreRawCurrentRetention(input), error =>
    error.originalDependencyCode === 'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING');
  const result = discoverCommittedCoherentOriginalBootstrap(input);
  assert.equal(result.summary.status, 'METADATA_BOUND');
  assert.equal(result.summary.counts.missingOriginalEndpoints, 1);
  assert.equal(result.summary.counts.metadataBoundEndpoints, 1);
  assert.equal(result.privateRequests.length, 1);
  assert.deepEqual(result.privateRequests[0].capture, canonicalSavedDmiOriginalCapture(rowAt(f, 3).sources.current));
  assert.equal(result.privateRequests[0].nativeValidTime, at(3));
  assert.equal(result.summary.rawAvailability, 'NOT_PROBED');
  assert.equal(result.summary.missingRawFiles, null);
  for (const key of ['authenticationPerformed', 'rawReadPerformed', 'decoderExecuted',
    'nativeAdmissionPerformed', 'sourcePriorityChanged', 'selectedRowsChanged']) assert.equal(result.summary[key], false);
  assert.equal(bootstrapInputBytes(input), before);
  result.privateRequests[0].capture.contentSha256 = 'detached-output-only';
  assert.equal(bootstrapInputBytes(input), before);
  assert.throws(() => buildRavScoreRawCurrentRetention(input), error =>
    error.originalDependencyCode === 'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING');
});

test('coherent original bootstrap metadata: interpolated top binds only its OWN endpoint, never another bracket SHA', () => {
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), interpolated = rowAt(f, 2);
  assert.equal(interpolated.sources.current.nativeSteps.length, 2);
  const input = coherentBootstrapInput(f, [interpolated]), before = bootstrapInputBytes(input);
  const result = discoverCommittedCoherentOriginalBootstrap(input);
  assert.equal(result.summary.status, 'UNRESOLVED');
  assert.equal(result.summary.counts.missingOriginalEndpoints, 2);
  assert.equal(result.summary.counts.metadataBoundEndpoints, 1, 'top capture identifies only its selectedStep');
  assert.equal(result.summary.counts.unboundCaptures, 1);
  assert.equal(result.summary.refusalCode, 'COHERENT_ORIGINAL_BOOTSTRAP_CAPTURE_UNRESOLVED');
  assert.deepEqual(result.privateRequests, [], 'partial endpoint metadata cannot seed decode');
  assert.equal(bootstrapInputBytes(input), before);
});

test('coherent original bootstrap metadata: own stored selections resolve both brackets with distinct genuine captures', () => {
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] });
  const input = coherentBootstrapInput(f, [rowAt(f, 0), rowAt(f, 2), rowAt(f, 3)]), before = bootstrapInputBytes(input);
  const result = discoverCommittedCoherentOriginalBootstrap(input);
  assert.equal(result.summary.status, 'METADATA_BOUND');
  assert.equal(result.summary.counts.unboundCaptures, 0);
  const captures = new Map(result.privateRequests.map(request => [request.nativeValidTime, request.capture]));
  for (const offset of [0, 3]) assert.deepEqual(captures.get(at(offset)),
    canonicalSavedDmiOriginalCapture(rowAt(f, offset).sources.current));
  assert.notEqual(captures.get(at(0)).contentSha256, captures.get(at(3)).contentSha256);
  assert.equal(bootstrapInputBytes(input), before);
});

test('coherent original bootstrap metadata: ambiguity refuses the whole reservoir rather than selecting a capture', () => {
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), original = rowAt(f, 3), conflict = structuredClone(original);
  // Synthetic malformed reservoir, not a claim that an authenticated pack has
  // duplicate hours: two structurally complete own captures must not be chosen.
  conflict.sources.current.contentSha256 = sha('different-own-capture-bytes');
  const input = coherentBootstrapInput(f, [original, conflict]), result = discoverCommittedCoherentOriginalBootstrap(input);
  assert.equal(result.summary.status, 'UNRESOLVED');
  assert(result.summary.counts.ambiguousCaptures > 0);
  assert.deepEqual(result.privateRequests, []);
});

test('coherent original bootstrap metadata: wrong sampling/capture identity cannot complete another stored bracket', () => {
  for (const mode of ['sampling', 'acquiredAt', 'itemRevision']) {
    const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), reservoir = structuredClone(rowAt(f, 0));
    if (mode === 'sampling') {
      reservoir.sources.current.nativeGridSampling.elementIndex++;
      reservoir.sources.current.nativeSteps[0].nativeGridSampling.elementIndex++;
      reservoir.currentProvenance.nativeGridSampling.elementIndex++;
      reservoir.currentProvenance.nativeSteps[0].nativeGridSampling.elementIndex++;
    } else {
      const key = mode === 'acquiredAt' ? 'acquiredAt' : 'itemUpdatedAt';
      for (const view of [reservoir.sources.current, reservoir.currentProvenance]) {
        view[key] = at(-0.5); view.nativeSteps[0][key] = at(-0.5);
      }
    }
    const result = discoverCommittedCoherentOriginalBootstrap(coherentBootstrapInput(f, [reservoir, rowAt(f, 2)]));
    assert.equal(result.summary.status, 'UNRESOLVED', mode);
    assert(result.summary.counts.unboundCaptures > 0, mode);
    assert.deepEqual(result.privateRequests, []);
  }
});

test('coherent original bootstrap metadata: existing originals stay proved, UNKNOWN stays outside this coherent route', () => {
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), input = coherentBootstrapInput(f, [rowAt(f, 3)]);
  input.protectedBulk = f.document;
  const proved = discoverCommittedCoherentOriginalBootstrap(input);
  assert.equal(proved.summary.status, 'NO_BOOTSTRAP_REQUIRED');
  assert.equal(proved.summary.counts.missingOriginalEndpoints, 0);
  assert.deepEqual(proved.privateRequests, []);
  const unknown = fixture(), unresolved = discoverCommittedCoherentOriginalBootstrap(
    coherentBootstrapInput(unknown, [rowAt(unknown, 3)]));
  assert.equal(unresolved.summary.status, 'UNRESOLVED');
  assert(unresolved.summary.counts.nonCoherentMissingSelections > 0);
  assert.deepEqual(unresolved.privateRequests, []);
});
