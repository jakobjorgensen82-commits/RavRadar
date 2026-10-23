import { inverseAlternativeCCaller, inverseCurrentNativeOriginalConsumerTestInput, CURRENT_NATIVE_ORIGINAL_CONSUMER_TEST_REVIEW, inverseCurrent586EndpointDiagnosticTestInput, inverseCurrent586IdentityRefinementTestInput, inverseCurrent586SharedProjectionExportTestInput, inverseNationalCoherentWorkTestInput, NATIONAL_COHERENT_WORK_TEST_REVIEW, inverseNationalCapacityTestInput, NATIONAL_COHERENT_CAPACITY_TEST_REVIEW, inverseCoherentDistinctCaptureFramesTestInput, COHERENT_DISTINCT_CAPTURE_FRAME_TEST_REVIEW } from './lib/alternative-c-caller-test-input.mjs';
import { inverseJointCoherentControllerTestInput, JOINT_NATIONAL_COHERENT_CONTROLLER_TEST_REVIEW } from './lib/alternative-c-caller-test-input.mjs';
import { inverseCoherentRawTransportLifetimeTestInput, COHERENT_RAW_TRANSPORT_LIFETIME_TEST_REVIEW } from './lib/alternative-c-caller-test-input.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { collectPostH0DmiOriginalDependencies as collect, POST_H0_DMI_ENDPOINT_DIAGNOSTICS } from './lib/post-h0-dmi-original-dependencies.mjs';
import { buildRavScoreRawCurrentRetention, describeRavScoreCurrentHistoryFailure,
  withInstalledCoherentRawTransportRetention, planRavScoreCurrentHistoryForPart } from './plan-ravscore-current-history.mjs';
import { buildRavScoreProductionPartSeries, ravScoreOwnerCurrentHistoryStartAt,
  selectRavScoreProductionInitialState }
  from './lib/ravscore-production-part-pipeline.mjs';
import { ravScoreRecoverySourceStartAt } from './lib/ravscore-recovery-replay.mjs';
import { currentFamilyColdStartScoreInputs } from './current-family-cold-start.mjs';
import { inverseCurrentFamilyColdTargetTestInput, CURRENT_FAMILY_COLD_TARGET_TEST_REVIEW,
  inverseCurrentFamilyColdZoneHistoryTestInput, CURRENT_FAMILY_COLD_ZONE_HISTORY_TEST_REVIEW }
  from './lib/archived-weather-restart-updater-test-input.mjs';
import { buildPrivateDmiRecoveryRecord } from './lib/private-dmi-recovery-record.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { dmiExpectedIdentityForPart, verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { buildNewestValidRavScoreRecoverySources } from './lib/ravscore-recovery-source-priority.mjs';
import { createProtectedDmiNativeCurrentInspector, PROTECTED_DMI_NATIVE_PROOF_LIMITS } from './lib/protected-dmi-native-current-proofs.mjs';
import { inspectDmiForecastGridSampling } from './lib/dmi-forecast-store.mjs';
import { canonicalSavedDmiOriginalCapture } from './lib/saved-dmi-original-capture.mjs';
import { discoverCommittedCoherentOriginalBootstrap } from './lib/coherent-current-original-bootstrap.mjs';
import { reprojectCommittedCoherentCurrentOriginals, validatedCommittedCoherentCurrentOriginals } from './lib/reproject-coherent-current-originals.mjs';
import { SAVED_121_PROOF_ROLE } from './lib/coherent-original-source-views.mjs';
import { verifyProtectedDmiNativeCurrentProof } from './lib/protected-dmi-native-current-proofs.mjs';
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

// Existing normal source-body unit seam. These units begin AFTER the caller's
// real archive/cold-capability validation; they do not mint that capability,
// authenticate B/S, fetch providers or prove the full physical input view.
function coldTargetCallerUnits() {
  const planner = readFileSync(new URL('./plan-ravscore-current-history.mjs', import.meta.url), 'utf8');
  const updater = readFileSync(new URL('./update-weather.mjs', import.meta.url), 'utf8');
  const between = (source, first, next, from = 0) => {
    const begin = source.indexOf(first, from), end = source.indexOf(next, begin + first.length);
    assert(begin >= 0 && end > begin, 'Exact normal cold-target source boundary required');
    return source.slice(begin, end);
  };
  const demand = between(planner, '  if (currentFamilyColdStart !== null) {',
    '    demand.schemaVersion = 2;', planner.indexOf('  const demand = buildRavScoreCurrentHistoryDemand({'));
  const replay = between(updater, '      const replayStartAt =', '      let deployedRecoverySource = null;',
    updater.indexOf('      const nativeCadenceHoldHours ='));
  const progressive = between(updater, '        const progressiveInputRecord =', '        progressiveRecoverySource =');
  return {
    demand: new Function('demand', 'currentFamilyColdStart', 'productionReferenceAt', 'refuse',
      '"use strict";\n' + demand + '\n}\nreturn demand;'),
    replay: new Function('coldInputs', 'archivedRestartInputs', 'generatedAt', 'part', 'zoneId',
      'initialSelection', 'ravScoreOwnerCurrentHistoryStartAt', 'ravScoreRecoverySourceStartAt',
      '"use strict";\n' + replay + '\nreturn replayStartAt;'),
    progressive: new Function('coldInputs', 'archivedRestartInputs', 'progressiveRecord', 'generatedAt',
      '"use strict";\n' + progressive + '\nreturn progressiveInputRecord;'),
  };
}

test('cold target boundary: actual planner cold branch starts only at target, ordinary demand stays unchanged', () => {
  const units = coldTargetCallerUnits(), f = fixture();
  const cold = planRavScoreCurrentHistoryForPart({ part: f.part, targetReferenceAt: at(6), stateLessRecovery: true });
  assert.equal(cold.initialSource, 'COLD_START');
  assert.equal(cold.startAt, at(-42), 'The unchanged pure/model planner still describes its 48h cold window');
  const before = JSON.stringify(cold), refuse = code => { throw new Error(code); };
  const bounded = units.demand({ demands: [structuredClone(cold)] }, {}, at(6), refuse);
  assert.equal(bounded.demands[0].startAt, at(6));
  assert.equal(bounded.demands[0].endAt, at(6));
  assert.deepEqual({ ...bounded.demands[0], startAt: cold.startAt }, cold);
  assert.equal(JSON.stringify(cold), before);
  const ordinary = { demands: [structuredClone(cold)] }, saved = JSON.stringify(ordinary);
  assert.strictEqual(units.demand(ordinary, null, at(6), refuse), ordinary);
  assert.equal(JSON.stringify(ordinary), saved, 'No capability means no changed ordinary planner bytes');
  for (const mutation of [{ initialSource: 'INTEGRATED_CHECKPOINT' }, { initialStateAt: at(0) },
    { initialStateSha256: 'sha256:' + 'a'.repeat(64) }]) {
    assert.throws(() => units.demand({ demands: [{ ...cold, ...mutation }] }, {}, at(6), refuse),
      /CURRENT_FAMILY_COLD_START_DEMAND/);
  }
});

test('cold target boundary: actual updater shares target-only archived semantics and preserves normal 51h rule', () => {
  const units = coldTargetCallerUnits(), f = fixture();
  const evaluate = (coldInputs, archivedRestartInputs, state) => units.replay(coldInputs,
    archivedRestartInputs, at(6), f.part, f.part.zoneId, { state }, ravScoreOwnerCurrentHistoryStartAt,
    ravScoreRecoverySourceStartAt);
  assert.equal(evaluate({}, null, null), at(6), 'Validated same-family cold inputs use this target only');
  assert.equal(evaluate({}, {}, null), at(6), 'Existing archived restart still uses this target only');
  assert.equal(evaluate(null, null, null), at(-42), 'Ordinary COLD does not silently acquire reset authority');
  assert.equal(evaluate(null, null, f.options.initialSelection.state), at(-51), 'Ordinary pre-S model rule stays exact');
  const source = { point: f.part.waterPoint, hourly: [{ time: at(-3), marker: 'ARCHIVE_ONLY' },
    { time: at(6), marker: 'NEW_TARGET' }, { time: at(9), marker: 'NEW_FUTURE' }] };
  const saved = JSON.stringify(source);
  const cold = units.progressive({}, null, source, at(6));
  assert.deepEqual(cold.hourly.map(row => row.time), [at(6), at(9)]);
  assert.strictEqual(cold.point, source.point);
  assert.strictEqual(units.progressive(null, null, source, at(6)), source);
  assert.deepEqual(units.progressive({}, {}, source, at(6)), cold);
  assert.equal(JSON.stringify(source), saved, 'Original source/context bytes are not changed by the view');
});

test('cold target boundary: real cold accessor rejects forged capabilities before any target privilege', () => {
  const f = fixture(), scope = { registry: {}, targetReferenceAt: at(6) };
  for (const handle of [null, {}, Object.freeze({}), { status: 'PASS' }, { currentFamilyColdStart: true }]) {
    assert.throws(() => currentFamilyColdStartScoreInputs(handle, scope), /CURRENT_FAMILY_COLD_START_CAPABILITY/);
  }
  assert(f.part.partId);
});

test('cold target boundary: normal first state and follower need no pre-start DMI originals', () => {
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] });
  const source = structuredClone(f.options.recoverySources[0]);
  source.record.hourly = source.record.hourly.filter(row => Date.parse(row.time) >= Date.parse(at(0)));
  const first = buildRavScoreProductionPartSeries({ part: f.part,
    zone: { id: f.part.zoneId, onshoreDirectionDeg: 90 },
    initialSelection: selectRavScoreProductionInitialState({ part: f.part,
      targetReferenceAt: at(0), candidateGBootstrapMode: 'integrated-state-less-recovery',
      candidateGSourceValidated: false }),
    candidateGRollbackMeasuredColdStart: true, targetReferenceAt: at(0),
    recoverySources: [], publicHourly: [source.record.hourly.find(row => row.time === at(0))],
    requireNativeGridSampling: true });
  const state = first.scores.find(row => row.time === at(0)).ravScoreModel.continuationState;
  const candidate = first.candidateGRollbackScores.find(row => row.time === at(0)).candidateG.continuationState;
  assert.equal(state.time, at(0)); assert.equal(candidate.time, at(0));
  assert.equal(first.recovery.coldStartHistoryLineage.completeCausalPositionCount, 0);
  assert.equal(first.recovery.coldStartHistoryLineage.boundedUnknownPositionCount, 48);
  const demand = planRavScoreCurrentHistoryForPart({ part: f.part,
    checkpointStates: { [f.part.partId]: state }, targetReferenceAt: at(6) });
  assert.equal(demand.startAt, at(-51), 'Follower keeps the normal pre-S demand, not a new model bypass');
  const options = { part: f.part, initialSelection: { source: 'INTEGRATED_CHECKPOINT', state },
    targetReferenceAt: at(6), recoverySources: [source] };
  assert.deepEqual(collect(options).captures, [], 'Coherent new originals do not require historical RAW reconstruction');
  const replay = buildRavScoreRecoveryReplay({ ...options, initialState: state,
    sourceRecords: [source], publicHourly: [source.record.hourly.find(row => row.time === at(6))],
    requireNativeGridSampling: true });
  assert.equal(replay.scoreStartAt, at(6));
  assert(replay.hourly.every(row => Date.parse(row.time) > Date.parse(state.time)),
    'Normal replay consumes only new hours after the preserved first state');
  const follower = buildRavScoreProductionPartSeries({ part: f.part,
    zone: { id: f.part.zoneId, onshoreDirectionDeg: 90 },
    initialSelection: selectRavScoreProductionInitialState({ part: f.part,
      checkpointStates: { [f.part.partId]: state }, targetReferenceAt: at(6) }),
    previousCandidateGContinuation: candidate,
    candidateGRollbackMeasuredWarmupContinuation: candidate.transportMemoryReady !== true,
    targetReferenceAt: at(6), recoverySources: [source],
    publicHourly: [source.record.hourly.find(row => row.time === at(6))], requireNativeGridSampling: true });
  assert.equal(follower.ravScoreState.continuationState.time, at(6));
  assert.equal(follower.candidateGState.continuationState.time, at(6));
  assert.equal(JSON.stringify(source).includes('ARCHIVE_ONLY'), false);
});

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
    const unprojected = readFileSync(new URL('../' + row.path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const qualified = row.path === NATIONAL_COHERENT_WORK_TEST_REVIEW.path
      ? inverseNationalCoherentWorkTestInput(unprojected, row.path) : unprojected;
    const current = inverseCurrent586EndpointDiagnosticTestInput(inverseCurrent586IdentityRefinementTestInput(inverseCurrent586SharedProjectionExportTestInput(
      qualified, row.path), row.path), row.path);
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

const POST_H0_FIXED_CLI_SOURCES=[
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
  // Exact normal default-OFF preamble/decode/reprojection leaves; copy actual
  // bytes, not a loader stub or an import-rewritten approximation.
  'scripts/prepare-cached-coherent-current-work.mjs',
  'scripts/lib/coherent-current-original-bootstrap.mjs',
  'scripts/lib/coherent-original-source-views.mjs',
  'scripts/lib/reproject-coherent-current-originals.mjs',
  'scripts/lib/prove-cached-coherent-current-originals.mjs',
  'scripts/lib/private-weather-component-pack.mjs',
];


test('national coherent work oracle: exact additive planner inverse preserves every older oracle',()=>{
  const relative='scripts/plan-ravscore-current-history.mjs';
  const raw=inverseNationalCapacityTestInput(inverseCoherentDistinctCaptureFramesTestInput(inverseJointCoherentControllerTestInput(inverseCoherentRawTransportLifetimeTestInput(readFileSync(new URL('./plan-ravscore-current-history.mjs',import.meta.url),'utf8'),relative),relative),relative),relative);
  const review=NATIONAL_COHERENT_WORK_TEST_REVIEW;
  assert.equal(Buffer.byteLength(raw),review.after.bytes);
  assert.equal(sha(raw),review.after.sha256);
  const original=inverseNationalCoherentWorkTestInput(raw,relative);
  assert.equal(Buffer.byteLength(original),review.before.bytes);
  assert.equal(sha(original),'6fc90ba1b688ae2567ff760513f62db3124352a313279d1425c0b7bca014d96b');
  assert.equal(inverseAlternativeCCaller(raw,relative),inverseAlternativeCCaller(original,relative));
  for(const needle of ['--prepare-cached-native-originals','CACHED_NATIVE_ORIGINAL_MODE_COLLISION',
    'prepareCachedNativeOriginals = false']){
    assert(raw.includes(needle));
    assert.throws(()=>inverseAlternativeCCaller(raw.replace(needle,needle+'-MUTATED'),relative),
      /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  }
  assert.throws(()=>inverseNationalCoherentWorkTestInput(raw,'scripts/update-weather.mjs'),
    /NATIONAL_WORK_PATH/);
});


test('national coherent work report: actual closed guards use the normal seven-field reader and unknowns stay unknown',async()=>{
  const {decodeCommittedCoherentOriginalRequests}=await import('./lib/prove-cached-coherent-current-originals.mjs');
  const {coherentCurrentWorkFailureCode}=await import('./prepare-cached-coherent-current-work.mjs');
  for(const[operation,code,module]of[
    [()=>decodeCommittedCoherentOriginalRequests({metadata:null}),
      'COHERENT_CURRENT_CACHED_PROOF_METADATA_UNRESOLVED','scripts/lib/prove-cached-coherent-current-originals.mjs'],
    [()=>reprojectCommittedCoherentCurrentOriginals({}),
      'COHERENT_CURRENT_REPROJECTION_METADATA_REQUIRED','scripts/lib/reproject-coherent-current-originals.mjs']]){
    let error;try{await operation();}catch(value){error=value;}
    assert(error instanceof Error);const message=error.message;
    const observed=await describeRavScoreCurrentHistoryFailure(error,'COMMITTED_RAW_RETENTION');
    assert.deepEqual(Object.keys(observed).sort(),
      ['kind','code','phase','exceptionType','operator','frame','privatePayloadIncluded'].sort());
    assert.equal(observed.code,code);assert.equal(observed.phase,'COMMITTED_RAW_RETENTION');
    assert.equal(observed.exceptionType,'ERROR');assert.equal(observed.operator,null);
    assert.equal(observed.frame.module,module);assert.equal(observed.privatePayloadIncluded,false);
    const expected=sha(readFileSync(new URL('../'+module,import.meta.url),'utf8').replace(/\r\n/g,'\n'));
    assert.equal(observed.frame.sha256,expected);
    const wrongPhase=await describeRavScoreCurrentHistoryFailure(error,'DEMAND');
    assert.equal(wrongPhase.code,'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');
    assert.equal(wrongPhase.phase,'DEMAND');assert.equal(error.message,message);
    assert.equal(Object.hasOwn(error,'originalDependencyCode'),false);
  }
  // A foreign prefix or spoofed fixed-looking code is not an actual own WORK
  // failure and its test-file stack is not an approved source frame.
  const foreign=new Error('COHERENT_CURRENT_WORK_INPUT_FILE_CHANGED');
  assert.equal(coherentCurrentWorkFailureCode(foreign),'COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED');
  const foreignReport=await describeRavScoreCurrentHistoryFailure(foreign,'COMMITTED_RAW_RETENTION');
  assert.equal(foreignReport.code,'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');
  const canary=new Error('secret-error-canary');
  const unknown=await describeRavScoreCurrentHistoryFailure(canary,'COMMITTED_RAW_RETENTION');
  assert.equal(unknown.code,'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');
  assert.equal(unknown.phase,'COMMITTED_RAW_RETENTION');assert.equal(unknown.privatePayloadIncluded,false);
  assert(!JSON.stringify(unknown).includes('secret-error-canary'));
  let getters=0;const getter=new Error('discarded');
  Object.defineProperty(getter,'message',{get(){getters++;return 'secret-error-canary';},configurable:true});
  assert.equal(coherentCurrentWorkFailureCode(getter),'COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED');
  const getterReport=await describeRavScoreCurrentHistoryFailure(getter,'COMMITTED_RAW_RETENTION');
  assert.equal(getterReport.code,'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');assert.equal(getterReport.frame,null);
  assert.equal(getters,0);
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
  const {packDmiPartContinuity,unpackDmiPartContinuity}=await import('./lib/dmi-part-continuity.mjs');
  const {writeDmiForecastFileAtomic,inspectDmiForecastFile,readDmiForecastRecord}=await import('./lib/dmi-forecast-file.mjs');
  const {verifyProtectedDmiNativeCurrentProof}=await import('./lib/protected-dmi-native-current-proofs.mjs');
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
  const fixedCliSources=POST_H0_FIXED_CLI_SOURCES;
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

  if(process.env.RAVRADAR_TEST_DENSE_COHERENT_WORK_INPUT!==undefined){
    await runExistingDenseCoherentWorkFixture({fs,path,spawnSync,host,root,write,productBytes,
      saveRavScoreContinuationCheckpoint,buildPrivateRuntimeCreateSpec,PRIVATE_RUNTIME_BASE_FILES,
      PRIVATE_WEATHER_COMPONENT_FILES,createPrivateProductionRuntimeBundle,verifyPrivateProductionRuntimeBundle,
      buildCandidateGDerivedStateSeries,candidateGStateKey,ravScoreModelBinding,rollbackBinding,
      packPrivateConditionsHourly,assertPrivateConditionsHourly,unpackDmiPartContinuity,
      inspectDmiForecastFile,readDmiForecastRecord,buildPartDmiForecastWithProtectedRetention});
    console.log(JSON.stringify({kind:'LOCAL_DENSE_COHERENT_WORK_EVIDENCE',directory:root,privatePayloadIncluded:false}));
    return; // Preserve this owned host and whole child outputs; do not run old four cases again.
  }

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

  // Extend this SAME real B/S/CLI fixture; the four original cases/assertions
  // above remain unchanged. No model binding, authentication, kernel, codec,
  // source priority, process decoder or product filesystem is replaced.
  const forecastFile=path.join(host,'data/live/dmi-forecast-cache.json');
  const originalForecastBytes=await fs.readFile(forecastFile);
  const nationalStage=path.join(host,'.cache/coherent-current-national-work.json');
  const activeWorking=path.join(host,PRIVATE_WEATHER_COMPONENT_FILES.dmiActive);
  const nationalPrivate=path.join(root,'private-active'),nationalBundle=path.join(nationalPrivate,'bundle');
  const nationalVerified=await verifyPrivateProductionRuntimeBundle({
    privateRoot:nationalPrivate,bundlePath:nationalBundle,repositoryRoot:host});
  const nationalBBefore=new Map(await Promise.all(['manifest.json',...nationalVerified.files.map(row=>'payload/'+row.relativePath)]
    .map(async relative=>[relative,await fs.readFile(path.join(nationalBundle,relative))])));
  const nationalFirewall=networkGuard+`import cp from 'node:child_process';import net from 'node:net';
    import tls from 'node:tls';import dns from 'node:dns';import dgram from 'node:dgram';
    const noNetwork=()=>{process.stderr.write('FORBIDDEN_NETWORK\\n');throw Error('FORBIDDEN_NETWORK')};
    const noChild=()=>{process.stderr.write('FORBIDDEN_CHILD\\n');throw Error('FORBIDDEN_CHILD')};
    net.connect=net.createConnection=tls.connect=dgram.createSocket=dns.lookup=dns.resolve=noNetwork;
    for(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[name]=noChild;
    syncBuiltinESMExports();`;
  const noWorkerFiles=async()=>{
    for(const relative of ['.cache/coherent-current-original-requests.json',
      '.cache/coherent-current-native-originals.json','.cache/coherent-current-original-worker']){
      await assert.rejects(fs.access(path.join(host,relative)),{code:'ENOENT'});
    }
  };
  const runNational=async(name,{optIn=false,mode='active',expected=0,fault='',environment={}}={})=>{
    const privateRoot=path.join(root,'private-'+mode),bundlePath=path.join(privateRoot,'bundle');
    const verified=await verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:host});
    const bBefore=new Map(await Promise.all(['manifest.json',...verified.files.map(row=>'payload/'+row.relativePath)]
      .map(async relative=>[relative,await fs.readFile(path.join(bundlePath,relative))])));
    const runner=path.join(root,'runner-'+name),tmp=path.join(root,'temp-'+name);
    await fs.mkdir(runner,{mode:0o700});await fs.mkdir(tmp,{mode:0o700});
    await fs.writeFile(path.join(runner,'private-runtime-current-source.json'),JSON.stringify(verified),{flag:'wx',mode:0o600});
    const env={...envBase,RUNNER_TEMP:runner,TMPDIR:tmp,TMP:tmp,TEMP:tmp,
      RAVRADAR_PRIVATE_RUNTIME_ROOT:privateRoot,RAVRADAR_PRIVATE_RUNTIME_BUNDLE:bundlePath,
      RAVRADAR_PRODUCTION_TARGET_HOUR:at(6).replace('.000Z','Z'),RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE:'true',
      RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED:'false',RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP:'false',
      CHECKPOINT_ONLY:'false',...environment};
    const result=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(nationalFirewall),
      ...(fault?['--import','data:text/javascript,'+encodeURIComponent(fault)]:[]),
      path.join(host,'scripts/plan-ravscore-current-history.mjs'),'--retain-committed-raw',
      ...(optIn?['--prepare-cached-native-originals']:[])],
      {cwd:host,env,encoding:'utf8',timeout:90_000,maxBuffer:1024*1024,windowsHide:true});
    await fs.writeFile(path.join(root,name+'.stdout'),result.stdout??'',{flag:'wx',mode:0o600});
    await fs.writeFile(path.join(root,name+'.stderr'),result.stderr??'',{flag:'wx',mode:0o600});
    assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,expected,result.stderr);
    assert(!result.stderr.includes('FORBIDDEN_NETWORK'));assert(!result.stderr.includes('FORBIDDEN_CHILD'));
    if(expected===0){
      const demand=JSON.parse(await fs.readFile(output,'utf8'));
      assert.equal(demand.schemaVersion,2);assert.equal(demand.demands.length,673);
      assert.equal(demand.rawRetention.captures.length,0);
      assert.equal(demand.rawRetention.boundary.bundleContentSha256,verified.bundleContentSha256);
      assert.equal(demand.rawRetention.boundary.checkpointGenerationSha256,JSON.parse(sBefore).generationSha256);
      await fs.rename(output,path.join(root,name+'.demand.json'));
    }else{
      const reports=result.stderr.trim().split(/\r?\n/).map(line=>{try{return JSON.parse(line);}catch{return null;}})
        .filter(row=>row?.kind==='RAVSCORE_CURRENT_HISTORY_FIRST_FAILURE');
      assert.equal(reports.length,1);assert.equal(reports[0].privatePayloadIncluded,false);
      const expectedWorkCodes={
        'national-incomplete':'COHERENT_CURRENT_WORK_METADATA_UNRESOLVED',
        'national-changed-input':'COHERENT_CURRENT_WORK_INPUT_FILE_CHANGED',
        'national-existing-stage':'COHERENT_CURRENT_WORK_STAGE_EXISTS'};
      assert.equal(reports[0].phase,'COMMITTED_RAW_RETENTION');
      if(name==='national-falsy-first'){
        assert.equal(reports[0].code,'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');
        assert.equal(reports[0].exceptionType,'UNKNOWN');assert.equal(reports[0].frame,null);
      }else{
        assert.equal(reports[0].code,expectedWorkCodes[name]);
        assert.equal(reports[0].frame.module,'scripts/prepare-cached-coherent-current-work.mjs');
        assert.equal(reports[0].frame.sha256,sha(productBytes.get('scripts/prepare-cached-coherent-current-work.mjs')));
      }
      await assert.rejects(fs.access(output),{code:'ENOENT'});
    }
    for(const[relative,bytes]of bBefore)assert.deepEqual(await fs.readFile(path.join(bundlePath,relative)),bytes);
    assert.deepEqual(await fs.readFile(checkpointPath),sBefore);
    const after=await verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:host,expected:verified});
    assert.equal(after.bundleContentSha256,verified.bundleContentSha256);
    await noWorkerFiles(); // NO_BOOTSTRAP_REQUIRED/metadata refusal never spawns Python.
    assert.deepEqual(await fs.readdir(tmp),[],'Normal genuine companion cleanup leaves no owned temporary stage');
  };
  await runNational('national-default-off');
  assert.deepEqual(await fs.readFile(forecastFile),originalForecastBytes);
  await assert.rejects(fs.access(nationalStage),{code:'ENOENT'});

  // The real measured-file read throws false; actual close finishes and then
  // reports a later EIO. The first falsy value must survive into UNKNOWN,
  // never be replaced by the close error or accidentally become success.
  const falsyFirst=`import fs from 'node:fs/promises';import path from 'node:path';
    const original=fs.open;let injected=false;
    fs.open=async function(file,...rest){
      const handle=await Reflect.apply(original,this,[file,...rest]);
      if(!injected&&path.resolve(file)===path.join(process.cwd(),'data/live/dmi-forecast-cache.json')){
        injected=true;const close=handle.close.bind(handle);
        handle.read=async()=>{throw false};
        handle.close=async()=>{await close();throw Error('SYNTHETIC_LATE_CLOSE_EIO')};
      }
      return handle;
    };`;
  await runNational('national-falsy-first',{optIn:true,expected:1,fault:falsyFirst});
  assert.deepEqual(await fs.readFile(forecastFile),originalForecastBytes);
  await assert.rejects(fs.access(nationalStage),{code:'ENOENT'});

  await runNational('national-no-bootstrap',{optIn:true});
  const preparedIndex=await inspectDmiForecastFile(forecastFile);
  assert.equal(preparedIndex.continuity.metadata.schemaVersion,2);
  assert.equal(preparedIndex.continuity.metadata.productionReferenceAt,at(0));
  assert.equal(preparedIndex.continuity.metadata.partCount,673);
  assert.equal(preparedIndex.continuity.entries.length,673);
  const partsById=new Map(parts.map(part=>[part.partId,part]));let checked=0,proofs=0;
  for(const descriptor of preparedIndex.continuity.entries){
    const entry=await readDmiForecastRecord(preparedIndex,descriptor),part=partsById.get(entry.partId);
    assert(part);const restored=await unpackDmiPartContinuity({...preparedIndex.continuity.metadata,partCount:1,
      rawBytes:entry.rawBytes,compressedBytes:entry.compressedBytes,entries:[entry]},[part],at(6));
    const row=restored.get(part.partId),original=records.get(part.partId);
    assert.deepEqual(row.hourly,original.hourly);assert.deepEqual(row.point,original.point);
    assert.equal(row.hourly.length,121);assert.equal(row.hourly[0].time,at(0));assert.equal(row.hourly[120].time,at(120));
    if(part.partId===targetPart.partId){
      assert.equal(row.nativeCurrentOriginals.bank.selections.length,121);
      for(const hour of row.hourly){
        const proof=verifyProtectedDmiNativeCurrentProof(row.nativeCurrentOriginals.bank,{part,row:hour});
        assert.equal(proof.ok,true);assert.deepEqual(proof.source,hour.sources.current);
        assert.deepEqual([proof.currentUMps,proof.currentVMps],[hour.currentUMps,hour.currentVMps]);proofs++;
      }
    }else assert.equal(row.nativeCurrentOriginals.bank,null,'Time-only filler PARTs never obtain made-up native proof');
    checked++;
  }
  assert.equal(checked,673);assert.equal(proofs,121);
  await assert.rejects(fs.access(nationalStage),{code:'ENOENT'});

  // The missing-B fixture still has two complete, unique selected captures:
  // it correctly attempts the normal decoder, not METADATA_UNRESOLVED. For
  // this metadata-negative only, give the NORMAL projector one original whose
  // byte capture is incomplete before projection; never edit a projected row.
  const unboundOld=structuredClone(old);
  const unboundNative=unboundOld.zones[f.identity.entityId].hourly[at(0)].sources.current;
  assert(canonicalSavedDmiOriginalCapture(unboundNative));
  delete unboundNative.contentSha256;
  assert.equal(canonicalSavedDmiOriginalCapture(unboundNative),null);
  const unboundOriginal=buildPartDmiForecastWithProtectedRetention(feature,unboundOld,null,at(0),{
    startAt:at(0),expectedIdentity:f.identity});
  const unboundRetained=buildPartDmiForecastWithProtectedRetention(feature,partial,unboundOld,at(0),{
    startAt:at(0),expectedIdentity:f.identity,persistedHourly:unboundOriginal.hourly});
  // Apart from the deliberately absent own capture-byte hash, the normal
  // constructor must preserve the FULL source, age, native steps, UV and times.
  const expectedUnbound=structuredClone(retained.hourly);
  for(const row of expectedUnbound)for(const source of [row.currentProvenance,row.sources?.current]){
    if(source?.modelRun===at(-6)&&source.nativeValidTime===at(0))delete source.contentSha256;
  }
  assert.deepEqual(unboundRetained.hourly,expectedUnbound);
  assert.deepEqual(unboundRetained.point,retained.point);
  assert.equal(unboundRetained.hourly.length,121);
  assert.equal(unboundRetained.hourly[0].time,at(0));assert.equal(unboundRetained.hourly[120].time,at(120));
  for(const [index,row]of unboundRetained.hourly.entries()){
    assert.deepEqual(row.sources.current.nativeSteps,retained.hourly[index].sources.current.nativeSteps);
    assert.equal(inspectDmiForecastGridSampling(row.sources.current,'current',row.time,f.identity).status,'coherent');
  }
  const unboundRecords=new Map(records);unboundRecords.set(targetPart.partId,unboundRetained);
  const unboundInput=JSON.stringify([...unboundRecords]);
  const unboundContinuity=await packDmiPartContinuity(unboundRecords,parts,at(0));
  assert.equal(unboundContinuity.schemaVersion,1);assert.equal(unboundContinuity.productionReferenceAt,at(0));
  assert.equal(JSON.stringify([...unboundRecords]),unboundInput,'Normal packing does not alter the negative fixture');
  await writeDmiForecastFileAtomic(forecastFile,{schemaVersion:2,zones:{},partContinuity:unboundContinuity});
  const unboundForecastBytes=await fs.readFile(forecastFile);
  await runNational('national-incomplete',{optIn:true,mode:'missing',expected:1});
  assert.deepEqual(await fs.readFile(forecastFile),unboundForecastBytes);
  await assert.rejects(fs.access(nationalStage),{code:'ENOENT'});
  // The following independent negatives retain exactly their original input.
  await fs.writeFile(forecastFile,originalForecastBytes);

  // One filesystem-only mutation of a normal working donor when the real
  // exclusive stage is opened. No verification/proof/acceptance is mocked.
  const activeBefore=await fs.readFile(activeWorking);
  const changedInput=`import fs from 'node:fs/promises';import path from 'node:path';
    const original=fs.open,write=fs.writeFile;let changed=false;
    fs.open=async function(file,...rest){
      const handle=await Reflect.apply(original,this,[file,...rest]);
      if(!changed&&path.resolve(file)===path.join(process.cwd(),'.cache/coherent-current-national-work.json')){
        changed=true;const donor=path.join(process.cwd(),'.cache/dmi-active-complete.json');
        await write(donor,Buffer.concat([await fs.readFile(donor),Buffer.from('\\n')]));
      }
      return handle;
    };`;
  await runNational('national-changed-input',{optIn:true,expected:1,fault:changedInput});
  assert.deepEqual(await fs.readFile(activeWorking),Buffer.concat([activeBefore,Buffer.from('\n')]));
  assert.deepEqual(await fs.readFile(forecastFile),originalForecastBytes);
  const retainedStage=await fs.readFile(nationalStage);assert(retainedStage.length>0);
  await runNational('national-existing-stage',{optIn:true,expected:1});
  assert.deepEqual(await fs.readFile(nationalStage),retainedStage,'An existing owned/unknown stage is never adopted or overwritten');
  assert.deepEqual(await fs.readFile(forecastFile),originalForecastBytes);
  for(const[relative,bytes]of nationalBBefore)assert.deepEqual(await fs.readFile(path.join(nationalBundle,relative)),bytes);
  assert.deepEqual(await fs.readFile(checkpointPath),sBefore);
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

// PRIVATE PROPOSAL, UNRUN: append to the existing post-H0 target only.
// These schema-valid synthetic rows are NOT actual Python/GRIB/B/GCM evidence.
function coherentReprojectionFixture(f, input = coherentBootstrapInput(f, [rowAt(f, 3)])) {
  const metadata = discoverCommittedCoherentOriginalBootstrap(input);
  assert.equal(metadata.summary.status, 'METADATA_BOUND');
  // Actual measured bytes in THIS synthetic test, deliberately pretty-printed.
  // Not a canonical-object hash or a claim about a real on-disk request file.
  const requestBytes = Buffer.from(JSON.stringify(metadata, null, 2) + '\n');
  const requestSha256 = sha(requestBytes);
  const privateOriginals = metadata.privateRequests.map(request => {
    const row = f.natives.find(value => Date.parse(value.time) === Date.parse(request.nativeValidTime)
      && value.sources.current.itemId === request.nativeStep.itemId);
    assert(row, 'the fixture supplies its actual original, not forecast U/V');
    return { requestId: request.requestId, partId: request.partId,
      header: Object.fromEntries(['currentVectorSemanticsVersion', 'currentVectorSelection', 'currentMaxDistanceKm']
        .map(key => [key, f.document[key]])), identity: structuredClone(f.identity),
      row: structuredClone(row), capture: structuredClone(request.capture) };
  });
  const decodedEnvelope = { schemaVersion: 1, kind: 'COHERENT_CURRENT_ORIGINAL_DECODE',
    privateBinding: structuredClone(metadata.privateBinding), requestSha256,
    captureCount: new Set(metadata.privateRequests.map(request => JSON.stringify(request.capture))).size,
    privateOriginals, nativeAdmissionPerformed: false };
  return { input, metadata, requestSha256, decodedEnvelope };
}

test('coherent reprojection: exact normal selection and stored age survive; private bank changes no caller input', () => {
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] });
  const args = coherentReprojectionFixture(f), inputBefore = bootstrapInputBytes(args.input);
  const envelopeBefore = JSON.stringify([args.metadata, args.decodedEnvelope]);
  const result = reprojectCommittedCoherentCurrentOriginals(args);
  assert.equal(result.summary.status, 'PROVED_PRIVATE_ONLY');
  assert.equal(result.privateProofBanks.length, 1);
  const proposed = result.privateProofBanks[0], selected = rowAt(f, 3);
  assert.equal(proposed.partId, f.part.partId); assert.equal(proposed.sourceRole, 'deployed-private-runtime');
  const proof = verifyProtectedDmiNativeCurrentProof(proposed.bank, { part: f.part, row: selected });
  assert.equal(proof.ok, true); assert.deepEqual(proof.source, selected.sources.current);
  assert.equal(proof.source.forecastAgeHours, selected.sources.current.forecastAgeHours);
  assert.deepEqual([proof.currentUMps, proof.currentVMps], [selected.currentUMps, selected.currentVMps]);
  assert(proposed.bank.contexts.every(context => !Object.hasOwn(context.value.header, 'generatedAt')
    && !Object.hasOwn(context.value.header, 'timeStrideHours')));
  for (const key of ['authenticationPerformed', 'rawReadPerformed', 'nativeAdmissionPerformed',
    'sourcePriorityChanged', 'selectedRowsChanged', 'bankActivated', 'bankSaved', 'privatePayloadIncluded']) {
    assert.equal(result.summary[key], false, key);
  }
  assert.equal(bootstrapInputBytes(args.input), inputBefore);
  assert.equal(JSON.stringify([args.metadata, args.decodedEnvelope]), envelopeBefore);
  assert.throws(() => buildRavScoreRawCurrentRetention(args.input), error =>
    error.originalDependencyCode === 'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING');
});

test('coherent reprojection: fresh metadata and measured request SHA reject stale binding/selection/capture/receipt', () => {
  const fresh = () => coherentReprojectionFixture(fixture({ coherent: [-3, 0, 3, 6, 9] }));
  for (const mutate of [
    a => { a.requestSha256 = sha('different-actual-request-bytes'); },
    a => { a.decodedEnvelope.privateBinding.targetReferenceAt = at(7); },
    a => { a.metadata.privateRequests[0].initialStateSha256 = sha('stale-state'); },
    a => { a.metadata.privateRequests[0].selectionReferences[0].tupleSha256 = sha('stale-tuple'); },
    a => { a.metadata.privateRequests[0].selectionReferences[0].sourceSha256 = sha('stale-source'); },
    a => { a.decodedEnvelope.privateOriginals[0].row.sources.current.acquiredAt = at(-2); },
    a => { a.decodedEnvelope.privateOriginals[0].capture.contentSha256 = sha('another-endpoint'); },
    a => { a.decodedEnvelope.privateOriginals[0].row.sources.current.nativeGridSampling.elementIndex++; },
    a => { a.decodedEnvelope.privateOriginals[0].identity.samplingPoint[0] += 0.01; },
    a => { a.decodedEnvelope.privateOriginals[0].header.generatedAt = at(6); },
    a => { a.decodedEnvelope.privateOriginals[0].row.sources.current.forecastAgeHours = 0; },
    a => { a.decodedEnvelope.privateOriginals[0].row['current-u'] += 0.5; },
  ]) {
    const args = fresh(); mutate(args);
    assert.throws(() => reprojectCommittedCoherentCurrentOriginals(args));
  }
  const timingOnly = fresh(); timingOnly.metadata.summary.timing.runtimeMilliseconds += 999;
  assert.equal(reprojectCommittedCoherentCurrentOriginals(timingOnly).summary.status, 'PROVED_PRIVATE_ONLY');
});

test('coherent reprojection: envelope inventory rejects missing duplicate and unknown request IDs without partial banks', () => {
  const fresh = () => {
    const f = fixture({ coherent: [-3, 0, 3, 6, 9] });
    return coherentReprojectionFixture(f, coherentBootstrapInput(f, [rowAt(f, 0), rowAt(f, 2), rowAt(f, 3)]));
  };
  assert.equal(fresh().metadata.privateRequests.length, 2);
  for (const mutate of [
    a => { a.decodedEnvelope.privateOriginals.pop(); },
    a => { a.decodedEnvelope.privateOriginals[1] = structuredClone(a.decodedEnvelope.privateOriginals[0]); },
    a => { a.decodedEnvelope.privateOriginals[0].requestId = sha('unknown-request'); },
    a => { a.decodedEnvelope.captureCount++; },
  ]) { const args = fresh(); mutate(args); assert.throws(() => reprojectCommittedCoherentCurrentOriginals(args)); }
});

test('coherent reprojection: own authenticated context supplies one bracket; decoded other bracket cannot change selected source', () => {
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), selected = rowAt(f, 2);
  // The interpolated row owns A0's capture, not A3's. Keep A3's genuine
  // saved row as the complete metadata donor for the other bracket.
  const input = coherentBootstrapInput(f, [selected, rowAt(f, 3)]);
  input.protectedBulk.zones[f.identity.entityId].hourly = { [at(0)]: structuredClone(f.natives[1]) };
  const args = coherentReprojectionFixture(f, input);
  assert.equal(args.metadata.privateRequests.length, 1);
  assert.equal(args.metadata.privateRequests[0].nativeValidTime, at(3));
  const result = reprojectCommittedCoherentCurrentOriginals(args);
  const proof = verifyProtectedDmiNativeCurrentProof(result.privateProofBanks[0].bank, { part: f.part, row: selected });
  assert.equal(proof.ok, true); assert.deepEqual(proof.source, selected.sources.current);
  assert.equal(proof.nativeRows.length, 2); assert.equal(result.summary.counts.decodedContextDocuments, 1);
});

test('coherent reprojection: ordinary 72h continuation packs more than sixteen exact endpoints without per-endpoint documents', async () => {
  const { buildDmiForecastHourly } = await import('./lib/dmi-forecast-store.mjs');
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] });
  f.natives = Array.from({ length: 26 }, (_, index) => {
    const offset = index * 3, source = structuredClone(f.natives[1].sources.current);
    Object.assign(source, { nativeValidTime: at(offset), leadTimeHours: 100 + offset,
      itemId: 'synthetic-reprojection-' + offset, assetIdentitySha256: sha('reprojection-asset-' + offset),
      contentSha256: sha('reprojection-bytes-' + offset) });
    return { time: at(offset), 'current-u': 0.1 + offset / 1000, 'current-v': 0.2, sources: { current: source } };
  });
  const hourly = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 76,
    ocean: f.natives.map(row => ({ step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'],
      provenance: { current: row.sources.current } })) }).hourly;
  const input = coherentBootstrapInput(f, hourly); input.productionReferenceAt = at(72);
  const args = coherentReprojectionFixture(f, input);
  assert(args.metadata.privateRequests.length > 16, 'real normal continuation, not reduced to sixteen endpoints');
  const result = reprojectCommittedCoherentCurrentOriginals(args);
  assert.equal(result.summary.counts.decodedContextDocuments, 1);
  assert.equal(result.summary.counts.selections, 71);
  assert.equal(result.privateProofBanks[0].bank.selections.length, 71);
  const selected = hourly.find(row => row.time === at(70));
  assert.equal(verifyProtectedDmiNativeCurrentProof(result.privateProofBanks[0].bank, { part: f.part, row: selected }).ok, true);
});

test('coherent reprojection: same-time distinct saved sources survive in separate context documents, never overwrite', async () => {
  const { buildDmiForecastHourly } = await import('./lib/dmi-forecast-store.mjs');
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), freshDocument = structuredClone(f.document);
  // A2 is a normal nearest-edge projection of the actual A3 original, so
  // its top-level capture is A3's own. A1 still requires both A0 and A3.
  // This preserves distinct saved hours while B3 occupies saved hour 3.
  const a3 = f.natives.find(row => row.time === at(3));
  const nearestA2 = buildDmiForecastHourly({ generatedAt: at(6), startAt: at(2), hours: 1,
    ocean: [{ step: a3.time, 'current-u': a3['current-u'], 'current-v': a3['current-v'],
      provenance: { current: a3.sources.current } }] }).hourly[0];
  f.options.recoverySources[0].record.hourly = f.options.recoverySources[0].record.hourly
    .map(row => row.time === at(2) ? nearestA2 : row);
  assert.deepEqual(rowAt(f, 1).sources.current.nativeSteps.map(step => step.nativeValidTime), [at(0), at(3)]);
  assert.deepEqual(rowAt(f, 2).sources.current.nativeSteps.map(step => step.nativeValidTime), [at(3)]);
  for (const row of Object.values(freshDocument.zones[f.identity.entityId].hourly)) {
    Object.assign(row.sources.current, { modelRun: at(-90), leadTimeHours: (Date.parse(row.time) - Date.parse(at(-90))) / 3_600_000,
      itemId: 'synthetic-other-run-' + row.time, assetIdentitySha256: sha('other-asset-' + row.time),
      contentSha256: sha('other-bytes-' + row.time) });
    row['current-u'] += 0.05;
  }
  const newer = f.project(freshDocument).record.hourly;
  const newerAt = hour => newer.find(row => row.time === at(hour));
  const input = coherentBootstrapInput(f, [rowAt(f, 0), rowAt(f, 1), rowAt(f, 2),
    newerAt(3), newerAt(4), newerAt(5), newerAt(6)]);
  f.natives = [...f.natives, ...Object.values(freshDocument.zones[f.identity.entityId].hourly)];
  const args = coherentReprojectionFixture(f, input), result = reprojectCommittedCoherentCurrentOriginals(args);
  assert.equal(result.summary.counts.decodedContextDocuments, 2);
  const bank = result.privateProofBanks[0].bank;
  assert.equal(bank.nativeRows.filter(record => Date.parse(record.value.time) === Date.parse(at(3))).length, 2);
  for (const row of [rowAt(f, 1), rowAt(f, 2), newerAt(3), newerAt(4), newerAt(5)]) {
    const proof = verifyProtectedDmiNativeCurrentProof(bank, { part: f.part, row });
    assert.equal(proof.ok, true); assert.deepEqual(proof.source, row.sources.current);
  }
});

test('coherent reprojection: same-role saved previousBank supplies an existing bracket through normal continuity', async () => {
  const { buildProtectedDmiNativeCurrentProofs } = await import('./lib/protected-dmi-native-current-proofs.mjs');
  const continuity = await import('./lib/dmi-part-continuity.mjs');
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), record = f.project(f.document).record;
  const bank = buildProtectedDmiNativeCurrentProofs({ selections: [{ part: f.part, row: rowAt(f, 0) }], contexts: [f.document] });
  const packed = await continuity.packDmiPartContinuity(new Map([[f.part.partId, record]]), [f.part], at(-3),
    { nativeCurrentProofsByPart: new Map([[f.part.partId, bank]]) });
  const restored = await continuity.unpackDmiPartContinuity(packed, [f.part], at(6));
  // A2's top capture cannot stand in for its A3 bracket's complete capture.
  const input = coherentBootstrapInput(f, [rowAt(f, 2), rowAt(f, 3)]);
  input.persistedHourlyByPart.get(f.part.partId).nativeCurrentOriginals = restored.get(f.part.partId).nativeCurrentOriginals;
  const args = coherentReprojectionFixture(f, input);
  assert.equal(args.metadata.privateRequests.length, 1); assert.equal(args.metadata.privateRequests[0].nativeValidTime, at(3));
  const result = reprojectCommittedCoherentCurrentOriginals(args);
  const proof = verifyProtectedDmiNativeCurrentProof(result.privateProofBanks[0].bank, { part: f.part, row: rowAt(f, 2) });
  assert.equal(proof.ok, true); assert.deepEqual(proof.source, rowAt(f, 2).sources.current);
  assert.equal(proof.nativeRows.length, 2);
});

// Private additive saved121 scope tests; same existing normal target/fixture.
async function coherentSaved121Fixture() {
  const { buildDmiForecastHourly } = await import('./lib/dmi-forecast-store.mjs');
  const f = fixture({ coherent: [-3, 0, 3, 6, 9] }), template = structuredClone(f.natives[1]);
  f.natives = Array.from({ length: 41 }, (_, index) => {
    const offset = index * 3, row = structuredClone(template);
    row.time = at(offset); row['current-u'] = 0.1 + offset / 1000;
    Object.assign(row.sources.current, { modelRun: at(0), nativeValidTime: at(offset), leadTimeHours: offset,
      acquiredAt: at(0), itemCreatedAt: at(0), itemUpdatedAt: at(0),
      itemId: 'saved121-native-' + offset, assetIdentitySha256: sha('saved121-asset-' + offset),
      contentSha256: sha('saved121-bytes-' + offset) });
    return row;
  });
  const hourly = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 121,
    ocean: f.natives.map(row => ({ step: row.time, 'current-u': row['current-u'],
      'current-v': row['current-v'], provenance: { current: row.sources.current } })) }).hourly;
  const input = coherentBootstrapInput(f, hourly);
  input.includeSavedForecast121 = true;
  return { f, input, hourly };
}

test('coherent saved121: opt-in binds H0 plus119 plus120 without changing normal historical selections', async () => {
  const { f, input, hourly } = await coherentSaved121Fixture(), before = bootstrapInputBytes(input);
  const historyInput = { ...input }; delete historyInput.includeSavedForecast121;
  const history = discoverCommittedCoherentOriginalBootstrap(historyInput);
  assert(history.privateRequests.every(request => request.sourceRole !== SAVED_121_PROOF_ROLE));
  const metadata = discoverCommittedCoherentOriginalBootstrap(input);
  assert.equal(metadata.summary.status, 'METADATA_BOUND');
  const saved = metadata.privateRequests.filter(request => request.sourceRole === SAVED_121_PROOF_ROLE);
  for (const offset of [0, 119, 120]) assert(saved.some(request => request.selectionReferences.some(ref => ref.rowTime === at(offset))));
  assert.deepEqual(metadata.privateRequests.filter(request => request.sourceRole !== SAVED_121_PROOF_ROLE), history.privateRequests);
  assert.equal(bootstrapInputBytes(input), before);
  const args = coherentReprojectionFixture(f, input), result = reprojectCommittedCoherentCurrentOriginals(args);
  const proof = result.privateProofBanks.find(value => value.sourceRole === SAVED_121_PROOF_ROLE);
  assert(proof); assert.equal(proof.bank.selections.length, 121);
  for (const offset of [0, 119, 120]) {
    const row = hourly[offset], verified = verifyProtectedDmiNativeCurrentProof(proof.bank, { part: f.part, row });
    assert.equal(verified.ok, true); assert.deepEqual(verified.source, row.sources.current);
    assert.deepEqual([verified.currentUMps, verified.currentVMps], [row.currentUMps, row.currentVMps]);
    assert.equal(verified.source.forecastAgeHours, row.sources.current.forecastAgeHours);
  }
  assert.equal(bootstrapInputBytes(input), before);
  assert.equal(result.summary.bankActivated, false); assert.equal(result.summary.bankSaved, false);
});

test('coherent saved121: newer working run cannot replace the saved source tuple or its own old original bank', async () => {
  const { f, input, hourly } = await coherentSaved121Fixture();
  const newer = { ...f.document, zones: { [f.identity.entityId]: { ...f.identity,
    hourly: Object.fromEntries(f.natives.filter(row => Date.parse(row.time) >= Date.parse(at(3))
      && Date.parse(row.time) <= Date.parse(at(9))).map(row => [row.time, structuredClone(row)])) } } };
  for (const row of Object.values(newer.zones[f.identity.entityId].hourly)) {
    Object.assign(row.sources.current, { modelRun: at(3), acquiredAt: at(3), itemCreatedAt: at(3), itemUpdatedAt: at(3),
      leadTimeHours: (Date.parse(row.time) - Date.parse(at(3))) / 3_600_000,
      itemId: 'newer-working-' + row.time, assetIdentitySha256: sha('newer-asset-' + row.time),
      contentSha256: sha('newer-bytes-' + row.time) });
    row['current-u'] += 0.05;
  }
  input.progressCandidate = newer;
  f.natives = [...f.natives, ...Object.values(newer.zones[f.identity.entityId].hourly)];
  const args = coherentReprojectionFixture(f, input), before = bootstrapInputBytes(input);
  const result = reprojectCommittedCoherentCurrentOriginals(args);
  const bank = result.privateProofBanks.find(value => value.sourceRole === SAVED_121_PROOF_ROLE).bank;
  for (const offset of [0, 3, 119, 120]) {
    const verified = verifyProtectedDmiNativeCurrentProof(bank, { part: f.part, row: hourly[offset] });
    assert.equal(verified.ok, true); assert.equal(verified.source.modelRun, at(0));
    assert.deepEqual(verified.source, hourly[offset].sources.current);
  }
  assert.equal(bootstrapInputBytes(input), before);
});

test('coherent saved121: wrong old time length point identity and opt-in type refuse without mutating originals', async () => {
  for (const mutate of [
    (input, part) => { input.persistedHourlyByPart.get(part.partId).hourly.pop(); },
    (input, part) => { input.persistedHourlyByPart.get(part.partId).hourly[120].time = at(121); },
    (input, part) => { const saved = input.persistedHourlyByPart.get(part.partId);
      saved.point = [saved.point[0] + 0.01, saved.point[1]]; },
    (input, part) => { input.persistedHourlyByPart.get(part.partId).hourly[120].sources.current.entityId = 'PART::OTHER'; },
    input => { input.includeSavedForecast121 = 'true'; },
  ]) {
    const { f, input } = await coherentSaved121Fixture();
    mutate(input, f.part);
    const before = bootstrapInputBytes(input);
    assert.throws(() => discoverCommittedCoherentOriginalBootstrap(input), /COHERENT_ORIGINAL_VIEWS_/);
    assert.equal(bootstrapInputBytes(input), before);
  }
});

test('coherent saved121: already available originals build the entire bank without decoder or request SHA', async () => {
  const { f, input } = await coherentSaved121Fixture();
  input.protectedBulk = { ...f.document, zones: { [f.identity.entityId]: { ...f.identity,
    hourly: Object.fromEntries(f.natives.map(row => [row.time, row])) } } };
  const before = bootstrapInputBytes(input), metadata = discoverCommittedCoherentOriginalBootstrap(input);
  assert.equal(metadata.summary.status, 'NO_BOOTSTRAP_REQUIRED');
  assert.deepEqual(metadata.privateRequests, []);
  const result = reprojectCommittedCoherentCurrentOriginals({ input, metadata });
  assert.equal(result.privateProofBanks.find(value => value.sourceRole === SAVED_121_PROOF_ROLE).bank.selections.length, 121);
  assert.equal(result.summary.requestByteShaCompared, false); assert.equal(result.summary.decoderEnvelopeValidated, false);
  assert.throws(() => reprojectCommittedCoherentCurrentOriginals({ input, metadata, requestSha256: sha('unneeded') }), /UNEXPECTED_DECODE/);
  assert.equal(bootstrapInputBytes(input), before);
});

test('coherent cached proof IO: no-bootstrap 121-hour roundtrip preserves old H0 and rejects an existing destination', async t => {
  const fs = await import('node:fs/promises'), path = await import('node:path'), os = await import('node:os');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const { spawnSync } = await import('node:child_process');
  const { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST: integratedInventory }
    = await import('../js/core/ravscore-model-bundle.generated.js');
  const { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST: candidateInventory }
    = await import('./rollback-assets/ravscore-model-bundle.generated.js');
  const { RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES }
    = await import('./lib/ravscore-continuation-implementation-contract.mjs');
  const { PRIVATE_RUNTIME_CONTRACT_FILES, PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES }
    = await import('./private-production-runtime-workflow.mjs');
  const repository = fileURLToPath(new URL('../', import.meta.url));
  const temporaryParent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(temporaryParent, 'rr-coherent-cached-io-'));
  const identity = await fs.lstat(root, { bigint: true });
  let complete = false;
  t.after(async () => {
    assert.equal(await fs.realpath(root), root); assert.equal(path.dirname(root), temporaryParent);
    assert(path.basename(root).startsWith('rr-coherent-cached-io-'));
    const current = await fs.lstat(root, { bigint: true });
    assert.equal(current.dev, identity.dev); assert.equal(current.ino, identity.ino);
    if (complete) await fs.rm(root, { recursive: true }); // Only this owned synthetic host.
  });
  const host = path.join(root, 'source'); await fs.mkdir(host, { mode: 0o700 });
  // Same fixed-root source inventory as the normal authenticated B/CLI test.
  // These four new proof-only leaves are copied verbatim as well. No import,
  // product ROOT, decoder, kernel, codec or retention implementation is replaced.
  const pending = [...new Set(['package.json', 'scripts/plan-ravscore-current-history.mjs',
    ...POST_H0_FIXED_CLI_SOURCES, ...RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
    ...Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat(), ...PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES,
    ...candidateInventory.excludedModules, ...integratedInventory.files.map(row => row.path),
    ...candidateInventory.files.map(row => row.file),
    'scripts/lib/coherent-current-original-bootstrap.mjs', 'scripts/lib/coherent-original-source-views.mjs',
    'scripts/lib/reproject-coherent-current-originals.mjs', 'scripts/lib/prove-cached-coherent-current-originals.mjs'])];
  const productBytes = new Map(); let totalBytes = 0;
  for (const relative of pending) {
    assert.equal(path.posix.normalize(relative), relative);
    assert(!relative.startsWith('../') && !path.posix.isAbsolute(relative));
    const from = path.join(repository, relative), stat = await fs.lstat(from);
    assert(stat.isFile() && !stat.isSymbolicLink());
    const bytes = await fs.readFile(from); productBytes.set(relative, bytes); totalBytes += bytes.length;
    assert(productBytes.size <= 2048 && totalBytes <= 32 * 1024 * 1024);
    const target = path.join(host, relative);
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    assert.deepEqual(await fs.readFile(target), bytes);
  }
  await fs.mkdir(path.join(host, '.cache'), { mode: 0o700 });
  const { f, input } = await coherentSaved121Fixture();
  input.protectedBulk = { ...f.document, zones: { [f.identity.entityId]: { ...f.identity,
    hourly: Object.fromEntries(f.natives.map(row => [row.time, row])) } } };
  assert.equal(discoverCommittedCoherentOriginalBootstrap(input).summary.status, 'NO_BOOTSTRAP_REQUIRED');
  const before = bootstrapInputBytes(input);
  const inputFile = path.join(root, 'input.json');
  const inputBytes = Buffer.from(JSON.stringify({ ...input, persistedHourlyByPart: [...input.persistedHourlyByPart] }) + '\n');
  await fs.writeFile(inputFile, inputBytes, { flag: 'wx', mode: 0o600 });
  const proofUrl = pathToFileURL(path.join(host, 'scripts/lib/prove-cached-coherent-current-originals.mjs')).href;
  const storeUrl = pathToFileURL(path.join(host, 'scripts/lib/dmi-forecast-file.mjs')).href;
  const codecUrl = pathToFileURL(path.join(host, 'scripts/lib/dmi-part-continuity.mjs')).href;
  const nativeUrl = pathToFileURL(path.join(host, 'scripts/lib/protected-dmi-native-current-proofs.mjs')).href;
  // The subprocess is the normal copied module's real fixed-root environment.
  // Firewalls forbid subprocess/provider transport; they never replace proof or I/O.
  const driver = `import assert from 'node:assert/strict';
    import fs from 'node:fs/promises'; import path from 'node:path';
    import cp from 'node:child_process'; import http from 'node:http'; import https from 'node:https';
    import net from 'node:net'; import tls from 'node:tls'; import dns from 'node:dns'; import dgram from 'node:dgram';
    import { syncBuiltinESMExports } from 'node:module';
    let networkCalls=0, childCalls=0;
    const noNetwork=()=>{networkCalls++;throw Error('FORBIDDEN_NETWORK')};
    const noChild=()=>{childCalls++;throw Error('FORBIDDEN_CHILD')};
    globalThis.fetch=noNetwork; http.get=http.request=https.get=https.request=noNetwork;
    net.connect=net.createConnection=tls.connect=dgram.createSocket=dns.lookup=dns.resolve=noNetwork;
    for(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[name]=noChild;
    syncBuiltinESMExports();
    const {proveCachedCoherentCurrentOriginals}=await import(${JSON.stringify(proofUrl)});
    const {readDmiForecastFile}=await import(${JSON.stringify(storeUrl)});
    const {unpackDmiPartContinuity}=await import(${JSON.stringify(codecUrl)});
    const {verifyProtectedDmiNativeCurrentProof}=await import(${JSON.stringify(nativeUrl)});
    const inputFile=process.argv[2],originalInput=await fs.readFile(inputFile);
    const input=JSON.parse(originalInput);input.persistedHourlyByPart=new Map(input.persistedHourlyByPart);
    const snapshot=()=>JSON.stringify([input,[...input.persistedHourlyByPart]]),before=snapshot();
    const [[partId,saved]]=input.persistedHourlyByPart,oldH0=input.boundary.productionReferenceAt;
    const parts=Object.entries(input.registry.zones).flatMap(([zoneId,entries])=>entries.map(part=>({...part,zoneId})));
    assert.equal(saved.hourly.length,121);assert.equal(saved.hourly[0].time,oldH0);
    assert.equal(saved.hourly[120].time,new Date(Date.parse(oldH0)+120*3600000).toISOString());
    const result=await proveCachedCoherentCurrentOriginals({input}); // No Python executable or decoder hook.
    assert.equal(result.status,'FIRST_PART_PROVED_PRIVATE_ONLY');
    assert.equal(result.savedHours,121);assert.equal(result.bankSelections,121);
    for(const key of ['normalCodecRoundtripProved','normalRetentionAfterRoundtripProved','oldProductionReferencePreserved'])assert.equal(result[key],true);
    for(const key of ['rawReadPerformed','decoderPhysicalGroupClosed','nativeAdmissionPerformed','productionActivated','originalRowsChanged'])assert.equal(result[key],false);
    assert.equal(result.decodedRequests,0);assert.equal(result.decodedCaptures,0);assert.equal(result.retentionCaptureCount,0);
    const file=path.join(process.cwd(),'.cache/coherent-current-first-part-forecast.json');
    const firstBytes=await fs.readFile(file),readback=await readDmiForecastFile(file);
    assert.equal(readback.partContinuity.schemaVersion,2);assert.equal(readback.partContinuity.productionReferenceAt,oldH0);
    const restored=await unpackDmiPartContinuity(readback.partContinuity,parts,input.productionReferenceAt);
    assert.equal(restored.size,1);const actual=restored.get(partId);
    assert.deepEqual(actual.hourly,saved.hourly);assert.deepEqual(actual.point,saved.point);
    assert.equal(actual.nativeCurrentOriginals.bank.selections.length,121);
    for(let index=0;index<121;index++){
      const row=actual.hourly[index];assert.equal(row.time,new Date(Date.parse(oldH0)+index*3600000).toISOString());
      const proof=verifyProtectedDmiNativeCurrentProof(actual.nativeCurrentOriginals.bank,{part:parts[0],row});
      assert.equal(proof.ok,true);assert.deepEqual(proof.source,row.sources.current);
      assert.deepEqual([proof.currentUMps,proof.currentVMps],[row.currentUMps,row.currentVMps]);
    }
    assert.equal(snapshot(),before);assert.deepEqual(await fs.readFile(inputFile),originalInput);
    assert.deepEqual(await fs.readdir(path.join(process.cwd(),'.cache')),['coherent-current-first-part-forecast.json']);
    await assert.rejects(proveCachedCoherentCurrentOriginals({input}),{message:'COHERENT_CURRENT_CACHED_PROOF_ROUNDTRIP_EXISTS'});
    assert.deepEqual(await fs.readFile(file),firstBytes);assert.equal(snapshot(),before);
    assert.deepEqual(await fs.readFile(inputFile),originalInput);
    assert.deepEqual(await fs.readdir(path.join(process.cwd(),'.cache')),['coherent-current-first-part-forecast.json']);
    assert.equal(networkCalls,0);assert.equal(childCalls,0);
    console.log(JSON.stringify({kind:'COHERENT_CACHED_PROOF_IO_TEST',hours:121,bankSelections:121,
      noBootstrap:true,oldH0Preserved:true,existingDestinationRefused:true,networkCalls,childCalls}));`;
  const driverFile = path.join(root, 'driver.mjs');
  await fs.writeFile(driverFile, driver, { flag: 'wx', mode: 0o600 });
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'LANG', 'LC_ALL']).has(key.toUpperCase())));
  const child = spawnSync(process.execPath, [driverFile, inputFile], { cwd: host, env: environment,
    encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024, windowsHide: true });
  await fs.writeFile(path.join(root, 'whole.stdout'), child.stdout ?? '', { flag: 'wx', mode: 0o600 });
  await fs.writeFile(path.join(root, 'whole.stderr'), child.stderr ?? '', { flag: 'wx', mode: 0o600 });
  assert.equal(child.error, undefined); assert.equal(child.signal, null); assert.equal(child.status, 0, child.stderr);
  const reports = child.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line))
    .filter(row => row.kind === 'COHERENT_CACHED_PROOF_IO_TEST');
  assert.equal(reports.length, 1); assert.equal(reports[0].hours, 121); assert.equal(reports[0].bankSelections, 121);
  assert.equal(reports[0].networkCalls, 0); assert.equal(reports[0].childCalls, 0);
  assert.equal(bootstrapInputBytes(input), before); assert.deepEqual(await fs.readFile(inputFile), inputBytes);
  for (const [relative, bytes] of productBytes) assert.deepEqual(await fs.readFile(path.join(host, relative)), bytes);
  complete = true;
});

// Same existing target: current frame inverse, never an authentication mock.
test('national coherent capacity oracle: exact new frame inverse precedes the frozen V3 inverse',()=>{
  const relative='scripts/plan-ravscore-current-history.mjs';
  const raw=inverseCoherentDistinctCaptureFramesTestInput(inverseJointCoherentControllerTestInput(inverseCoherentRawTransportLifetimeTestInput(readFileSync(new URL('./plan-ravscore-current-history.mjs',import.meta.url),'utf8'),relative),relative),relative);
  const review=NATIONAL_COHERENT_CAPACITY_TEST_REVIEW;
  assert.throws(()=>inverseNationalCoherentWorkTestInput(null,relative),/NATIONAL_WORK_TYPE/);
  assert.throws(()=>inverseNationalCoherentWorkTestInput(null),/NATIONAL_WORK_ARGUMENTS/);
  assert.equal(sha(raw),review.after.sha256);
  const before=inverseNationalCapacityTestInput(raw,relative);
  assert.equal(sha(before),NATIONAL_COHERENT_WORK_TEST_REVIEW.after.sha256);
  assert.equal(inverseNationalCoherentWorkTestInput(raw,relative),inverseNationalCoherentWorkTestInput(before,relative));
  assert.equal(inverseAlternativeCCaller(raw,relative),inverseAlternativeCCaller(before,relative));
  const original=inverseNationalCoherentWorkTestInput(before,relative);
  assert.equal(Buffer.byteLength(original),NATIONAL_COHERENT_WORK_TEST_REVIEW.before.bytes);
  assert.equal(sha(original),NATIONAL_COHERENT_WORK_TEST_REVIEW.before.sha256);
  assert.throws(()=>inverseNationalCapacityTestInput(original,relative),/NATIONAL_CAPACITY_SIZE/,
    'Direct capacity inverse stays strict; older sources use the existing V3 reader');
  const knownViews=[original];
  for(const inverse of [inverseCurrent586SharedProjectionExportTestInput,
    inverseCurrent586IdentityRefinementTestInput,inverseCurrent586EndpointDiagnosticTestInput,
    inverseCurrentNativeOriginalConsumerTestInput]){
    knownViews.push(inverse(knownViews.at(-1),relative));
  }
  for(const known of knownViews){
    assert.equal(inverseNationalCoherentWorkTestInput(known,relative),known);
    assert.equal(inverseNationalCoherentWorkTestInput(known.replace(/\n/g,'\r\n'),relative),known);
    assert.equal(inverseAlternativeCCaller(known,relative),inverseAlternativeCCaller(raw,relative));
    for(const mutated of ['!'+known.slice(1),known+'\n'])assert.throws(
      ()=>inverseNationalCoherentWorkTestInput(mutated,relative),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
    assert.throws(()=>inverseNationalCoherentWorkTestInput(known,'scripts/update-weather.mjs'),
      /NATIONAL_WORK_PATH/);
  }
  for(const[_old,current]of review.hunks)assert.throws(
    ()=>inverseNationalCapacityTestInput(raw.replace(current,'0'.repeat(64)),relative),/NATIONAL_CAPACITY/);
});

// ACCOUNTING UNITS ONLY: exact controller text, not a native proof/worker receipt.
// No runtime export, product hook, copied accounting implementation or 192MiB allocation.
function nationalCapacityAccountingUnits({ bankBytes = PROTECTED_DMI_NATIVE_PROOF_LIMITS.bankBytes } = {}) {
  const source = inverseJointCoherentControllerTestInput(inverseCoherentRawTransportLifetimeTestInput(readFileSync(new URL('./prepare-cached-coherent-current-work.mjs', import.meta.url), 'utf8')
    .replace(/\r\n/g, '\n'), 'scripts/prepare-cached-coherent-current-work.mjs'), 'scripts/prepare-cached-coherent-current-work.mjs');
  assert.equal(sha(source), '8dca73ce782f1293cb154aaeab4e536cd839c16b21695695ccf9c2c055c471a7',
    'ACCOUNTING_UNIT_CONTROLLER_WHOLE_CHANGED');
  const between = (start, end) => {
    assert.equal(source.split(start).length, 2, 'ACCOUNTING_UNIT_START_NOT_UNIQUE');
    const offset = source.indexOf(start) + start.length, tail = source.slice(offset);
    assert.equal(tail.split(end).length, 2, 'ACCOUNTING_UNIT_END_NOT_UNIQUE');
    return tail.slice(0, tail.indexOf(end));
  };
  const canonical = between('const canonical = ', '\n\nasync function measuredFile(');
  const block = between('// BEGIN national coherent work capacity accounting\n',
    '// END national coherent work capacity accounting');
  const guard = between('\n    const saved = projection.privateProofBanks.filter(',
    '\n    const record = persisted.get(part.partId);');
  const commit = between('\n    savedBankBytes += localSavedBytes;',
    '\n    if (checkedParts % 100 === 0)');
  // Include the exact boundary statements omitted by the text delimiters.
  const definitions = 'const canonical = ' + canonical + '\n' + block;
  const compile = (body, parameters) => vm.compileFunction(definitions + '\n' + body,
    ['LIMIT', 'Buffer', 'refuse', 'SAVED_FORECAST_121_ROLE', ...parameters]);
  const limits = Object.freeze({ ...PROTECTED_DMI_NATIVE_PROOF_LIMITS, bankBytes });
  const refuse = code => { throw new Error(code); }; // Fixed unit sentinel, never a product-issued refusal identity.
  const bind = (fn, ...args) => fn(limits, Buffer, refuse, SAVED_121_PROOF_ROLE, ...args);
  const functions = bind(compile('return { chargeNationalMetadataRequests, proofBankBytes };', []));
  const applyProjection = compile(
    'let { savedBankBytes, historyRoleBankPeakBytes, perPartProofBankPeakBytes } = state;\n'
    + 'const saved = projection.privateProofBanks.filter(' + guard + '\n'
    + 'savedBankBytes += localSavedBytes;' + commit + '\n'
    + 'return { savedBankBytes, historyRoleBankPeakBytes, perPartProofBankPeakBytes };',
    ['projection', 'state']);
  return { ...functions, accountProjection: (projection, state) => bind(applyProjection, projection, state) };
}

test('national coherent capacity accounting: actual UTF8 request array, exact ceiling and refusing request preserves state', () => {
  const unit = nationalCapacityAccountingUnits(), maximum = PROTECTED_DMI_NATIVE_PROOF_LIMITS.bankBytes;
  const first = { note: 'vandstand å / küste / 😀', requestId: 'accounting-only-1' };
  const second = { note: 'Øresund 漢', requestId: 'accounting-only-2' };
  const metadata = { privateRequests: [first, second] }, original = JSON.stringify(metadata);
  const budget = { bytes: 2, requests: 0 };
  unit.chargeNationalMetadataRequests(budget, { privateRequests: [] });
  assert.equal(budget.bytes, Buffer.byteLength(JSON.stringify([])), 'Both array brackets are charged');
  unit.chargeNationalMetadataRequests(budget, { privateRequests: [first] });
  assert.equal(budget.bytes, Buffer.byteLength(JSON.stringify([first])));
  unit.chargeNationalMetadataRequests(budget, { privateRequests: [second] });
  assert.equal(budget.bytes, Buffer.byteLength(JSON.stringify([first, second])), 'Real UTF8 and inter-request comma');
  assert(Buffer.byteLength(JSON.stringify(metadata.privateRequests)) > JSON.stringify(metadata.privateRequests).length);
  assert.equal(budget.requests, 2);
  const together = { bytes: 2, requests: 0 };
  unit.chargeNationalMetadataRequests(together, metadata);
  assert.deepEqual(together, budget, 'PART boundaries add neither brackets nor a missing comma');
  assert.equal(JSON.stringify(metadata), original);

  const singleWireBytes = Buffer.byteLength(JSON.stringify([first]));
  const exact = { bytes: maximum - singleWireBytes + 2, requests: 0 };
  unit.chargeNationalMetadataRequests(exact, { privateRequests: [first] });
  assert.equal(exact.bytes, maximum); assert.equal(exact.requests, 1);
  const over = { bytes: maximum - singleWireBytes + 3, requests: 0 }, overBefore = { ...over };
  assert.throws(() => unit.chargeNationalMetadataRequests(over, { privateRequests: [first] }),
    { message: 'REQUEST_BYTES_BOUND' });
  assert.deepEqual(over, overBefore, 'The refusing request is never committed');
  const commaBytes = Buffer.byteLength(JSON.stringify([first, second])) - singleWireBytes;
  const commaExact = { bytes: maximum - commaBytes, requests: 1 };
  unit.chargeNationalMetadataRequests(commaExact, { privateRequests: [second] });
  assert.equal(commaExact.bytes, maximum); assert.equal(commaExact.requests, 2);
  const commaOver = { bytes: maximum - commaBytes + 1, requests: 1 }, commaBefore = { ...commaOver };
  assert.throws(() => unit.chargeNationalMetadataRequests(commaOver, { privateRequests: [second] }),
    { message: 'REQUEST_BYTES_BOUND' });
  assert.deepEqual(commaOver, commaBefore);
  // Real production arithmetic with a small UNIT-ONLY ceiling: no product cap changes.
  const prefixUnit = nationalCapacityAccountingUnits({ bankBytes: singleWireBytes });
  const prefix = { bytes: 2, requests: 0 };
  assert.throws(() => prefixUnit.chargeNationalMetadataRequests(prefix, metadata),
    { message: 'REQUEST_BYTES_BOUND' });
  assert.deepEqual(prefix, { bytes: singleWireBytes, requests: 1 },
    'An accepted prefix stays charged; the refusing next request adds nothing (not whole-PART rollback)');
  assert.equal(JSON.stringify(metadata), original);
});

test('national coherent capacity accounting: saved national sum excludes nonzero transient history peaks', () => {
  const unit = nationalCapacityAccountingUnits(), maximum = PROTECTED_DMI_NATIVE_PROOF_LIMITS.bankBytes;
  // Deliberately NOT schema-valid native evidence: this exercises accounting only.
  // No inspector/admission/worker/decoder receives these small record containers.
  const bank = label => ({ contexts: [{ accountingOnly: label }], nativeRows: [], selections: [] });
  const saved = bank('saved121 / å'), historical = bank('deployed history / 😀'),
    progressive = bank('progress history / küste'), largerHistory = bank('H'.repeat(1600));
  const savedBytes = unit.proofBankBytes(saved), historicalBytes = unit.proofBankBytes(historical),
    progressiveBytes = unit.proofBankBytes(progressive), largerBytes = unit.proofBankBytes(largerHistory);
  const projection = proofs => ({ privateProofBanks: proofs,
    summary: { counts: { bankBytes: 2 + proofs.reduce((bytes, proof) => bytes + unit.proofBankBytes(proof.bank), 0) } } });
  const first = projection([{ sourceRole: SAVED_121_PROOF_ROLE, bank: saved },
    { sourceRole: 'deployed-private-runtime', bank: historical },
    { sourceRole: 'progressive-private-dmi', bank: progressive }]);
  const second = projection([{ sourceRole: SAVED_121_PROOF_ROLE, bank: saved },
    { sourceRole: 'deployed-private-runtime', bank: historical }]);
  const historyOnly = projection([{ sourceRole: 'progressive-private-dmi', bank: largerHistory }]);
  const initial = Object.freeze({ savedBankBytes: maximum - 2 * savedBytes,
    historyRoleBankPeakBytes: 0, perPartProofBankPeakBytes: 0 });
  const snapshot = JSON.stringify({ initial, first, second, historyOnly });
  const a = unit.accountProjection(first, initial);
  assert.equal(a.savedBankBytes, maximum - savedBytes);
  assert.equal(a.historyRoleBankPeakBytes, historicalBytes + progressiveBytes);
  assert.equal(a.perPartProofBankPeakBytes, savedBytes + historicalBytes + progressiveBytes);
  assert(a.historyRoleBankPeakBytes > 0);
  assert(a.savedBankBytes + a.historyRoleBankPeakBytes > maximum,
    'The old cumulative mixed-role charge would spuriously exceed the persistent ceiling');
  const b = unit.accountProjection(second, a);
  assert.equal(b.savedBankBytes, maximum, 'Two real saved charges reach the exact ceiling');
  assert.equal(b.historyRoleBankPeakBytes, a.historyRoleBankPeakBytes, 'History is a peak, not an accumulated sum');
  const c = unit.accountProjection(historyOnly, b);
  assert.equal(c.savedBankBytes, maximum, 'History-only work adds no persistent saved bytes');
  assert.equal(c.historyRoleBankPeakBytes, Math.max(a.historyRoleBankPeakBytes, largerBytes));
  assert.equal(c.perPartProofBankPeakBytes, Math.max(a.perPartProofBankPeakBytes, largerBytes));
  const empty = unit.accountProjection(projection([]), c);
  for (const key of Object.keys(c)) assert.equal(empty[key], c[key]);
  assert.equal(JSON.stringify({ initial, first, second, historyOnly }), snapshot, 'No input or prior accounting state is changed');
});

test('national coherent capacity accounting: wrong summary, saved overflow and own bank overflow still refuse without commit', () => {
  const unit = nationalCapacityAccountingUnits(), maximum = PROTECTED_DMI_NATIVE_PROOF_LIMITS.bankBytes;
  const bank = { contexts: [{ accountingOnly: 'one small record / Æ😀' }], nativeRows: [], selections: [] };
  const bytes = unit.proofBankBytes(bank);
  const projection = { privateProofBanks: [{ sourceRole: SAVED_121_PROOF_ROLE, bank }],
    summary: { counts: { bankBytes: 2 + bytes } } };
  const state = Object.freeze({ savedBankBytes: maximum - bytes,
    historyRoleBankPeakBytes: 17, perPartProofBankPeakBytes: 19 });
  const inputBefore = JSON.stringify({ projection, state });
  const valid = unit.accountProjection(projection, state);
  assert.equal(valid.savedBankBytes, maximum);
  const wrong = structuredClone(projection); wrong.summary.counts.bankBytes++;
  const wrongBefore = JSON.stringify(wrong);
  assert.throws(() => unit.accountProjection(wrong, state), { message: 'OUTPUT_BYTES_BOUND' });
  assert.equal(JSON.stringify(wrong), wrongBefore);
  const over = Object.freeze({ ...state, savedBankBytes: state.savedBankBytes + 1 });
  const overBefore = JSON.stringify(over);
  assert.throws(() => unit.accountProjection(projection, over), { message: 'OUTPUT_BYTES_BOUND' });
  assert.equal(JSON.stringify(over), overBefore);
  // These small UNIT-ONLY ceilings execute the exact per-bank check; product limits stay immutable.
  const exactBank = nationalCapacityAccountingUnits({ bankBytes: bytes });
  assert.equal(exactBank.proofBankBytes(bank), bytes);
  const overBank = nationalCapacityAccountingUnits({ bankBytes: bytes - 1 });
  assert.throws(() => overBank.proofBankBytes(bank), { message: 'OUTPUT_BYTES_BOUND' });
  assert.throws(() => overBank.accountProjection(projection, state), { message: 'OUTPUT_BYTES_BOUND' });
  assert.equal(JSON.stringify({ projection, state }), inputBefore);
});

const DISTINCT_READ_CAPTURE_TEST_MODE='AUTHENTICATED_ORIGINAL_WITH_DISTINCT_MEASURED_READ_CAPTURE';
function distinctReadCaptureFixture() {
  const f=fixture({coherent:[-3,0,3,6,9]}), args=coherentReprojectionFixture(f);
  args.captureMode=DISTINCT_READ_CAPTURE_TEST_MODE;
  // Synthetic contract bytes, not a real file or proof that any transport ran.
  args.requestSha256=sha(Buffer.from(JSON.stringify({...args.metadata,captureMode:args.captureMode},null,2)+'\n'));
  args.decodedEnvelope.requestSha256=args.requestSha256;
  args.decodedEnvelope.captureMode=args.captureMode;
  for(const original of args.decodedEnvelope.privateOriginals){
    original.transportCapture=canonicalSavedDmiOriginalCapture({...original.capture,acquiredAt:captureAt(1)});
    assert(original.transportCapture);assert.notEqual(original.transportCapture.acquiredAt,original.capture.acquiredAt);
  }
  return {f,args};
}

test('coherent reprojection distinct capture: explicit mode preserves exact original source, tuple and age; DEFAULT refuses mode',()=>{
  const {f,args}=distinctReadCaptureFixture(), before=bootstrapInputBytes(args.input);
  const envelopeBefore=JSON.stringify([args.metadata,args.decodedEnvelope]);
  const oldResult=reprojectCommittedCoherentCurrentOriginals(coherentReprojectionFixture(f));
  const result=reprojectCommittedCoherentCurrentOriginals(args);
  assert.deepEqual(result.privateProofBanks,oldResult.privateProofBanks,'Bank represents ORIGINAL source, not transport time');
  const selected=rowAt(f,3),proof=verifyProtectedDmiNativeCurrentProof(result.privateProofBanks[0].bank,{part:f.part,row:selected});
  assert.equal(proof.ok,true);assert.deepEqual(proof.source,selected.sources.current);
  assert.equal(proof.source.forecastAgeHours,selected.sources.current.forecastAgeHours);
  assert.deepEqual([proof.currentUMps,proof.currentVMps],[selected.currentUMps,selected.currentVMps]);
  assert.equal(bootstrapInputBytes(args.input),before);
  assert.equal(JSON.stringify([args.metadata,args.decodedEnvelope]),envelopeBefore);
  const strict={...args};delete strict.captureMode;
  assert.throws(()=>reprojectCommittedCoherentCurrentOriginals(strict),/COHERENT_CURRENT_REPROJECTION_ENVELOPE_BINDING/);
  assert.equal(result.summary.nativeAdmissionPerformed,false);
});

test('coherent reprojection distinct capture: all ten identity fields, inventory and old native evidence remain strict',()=>{
  const mutations={
    collection:value=>value==='dkss_lf'?'dkss_nsbs':'dkss_lf',
    modelRun:()=>captureAt(-101),validTime:()=>captureAt(12),itemId:()=> 'different-own-item',
    assetIdentitySha256:()=>sha('different-own-url'),assetSizeBytes:value=>value===null?1234:null,
    contentLengthBytes:value=>value+1,contentSha256:()=>sha('different-own-bytes'),
    itemCreatedAt:value=>value===null?captureAt(-100):null,itemUpdatedAt:value=>value===null?captureAt(-99):null,
  };
  assert.equal(Object.keys(mutations).length,10);assert(!Object.hasOwn(mutations,'acquiredAt'));
  for(const[field,change]of Object.entries(mutations)){
    const {args}=distinctReadCaptureFixture(),record=args.decodedEnvelope.privateOriginals[0];
    record.transportCapture[field]=change(record.transportCapture[field]);
    const before=bootstrapInputBytes(args.input),wireBefore=JSON.stringify(args.decodedEnvelope);
    assert.throws(()=>reprojectCommittedCoherentCurrentOriginals(args),/COHERENT_CURRENT_REPROJECTION_/);
    assert.equal(bootstrapInputBytes(args.input),before);assert.equal(JSON.stringify(args.decodedEnvelope),wireBefore);
  }
  for(const mutate of [
    a=>{delete a.decodedEnvelope.privateOriginals[0].transportCapture;},
    a=>{a.decodedEnvelope.privateOriginals[0].transportCapture.extra='not-canonical';},
    a=>{a.decodedEnvelope.privateOriginals.pop();},
    a=>{a.decodedEnvelope.privateOriginals[1]=structuredClone(a.decodedEnvelope.privateOriginals[0]);},
    a=>{a.decodedEnvelope.privateOriginals[0].requestId=sha('unknown-request');},
    a=>{a.decodedEnvelope.captureCount++;},
    a=>{a.decodedEnvelope.captureMode='unknown-mode';},
    a=>{a.captureMode='unknown-mode';},
    a=>{a.decodedEnvelope.privateOriginals[0].row.sources.current.acquiredAt=captureAt(1);},
    a=>{a.decodedEnvelope.privateOriginals[0].row.sources.current.nativeGridSampling.elementIndex++;},
    a=>{a.decodedEnvelope.privateOriginals[0].row['current-u']+=0.5;},
    a=>{a.decodedEnvelope.privateOriginals[0].identity.samplingPoint[0]+=0.01;},
    a=>{a.decodedEnvelope.privateOriginals[0].header.generatedAt=at(6);},
  ]){
    const {args}=distinctReadCaptureFixture();mutate(args);
    const before=bootstrapInputBytes(args.input),wireBefore=JSON.stringify(args.decodedEnvelope);
    assert.throws(()=>reprojectCommittedCoherentCurrentOriginals(args),/COHERENT_CURRENT_REPROJECTION_|DMI_NATIVE_PROOF_/);
    assert.equal(bootstrapInputBytes(args.input),before);assert.equal(JSON.stringify(args.decodedEnvelope),wireBefore);
  }
});

test('national coherent distinct capture frame oracle: exact additive inverse preserves every previous oracle',()=>{
  const relative='scripts/plan-ravscore-current-history.mjs';
  const raw=inverseJointCoherentControllerTestInput(inverseCoherentRawTransportLifetimeTestInput(readFileSync(new URL('./plan-ravscore-current-history.mjs',import.meta.url),'utf8').replace(/\r\n/g,'\n'),relative),relative);
  const review=COHERENT_DISTINCT_CAPTURE_FRAME_TEST_REVIEW;
  assert.equal(sha(raw),review.after.sha256);
  const before=inverseCoherentDistinctCaptureFramesTestInput(raw,relative);
  assert.equal(sha(before),review.before.sha256);
  assert.equal(inverseNationalCoherentWorkTestInput(raw,relative),inverseNationalCoherentWorkTestInput(before,relative));
  assert.equal(inverseAlternativeCCaller(raw,relative),inverseAlternativeCCaller(before,relative));
  for(const[_old,current]of review.hunks)assert.throws(
    ()=>inverseCoherentDistinctCaptureFramesTestInput(raw.replace(current,'0'.repeat(64)),relative),/DISTINCT_CAPTURE/);
  assert.throws(()=>inverseCoherentDistinctCaptureFramesTestInput(raw+'\n',relative),/DISTINCT_CAPTURE/);
  assert.throws(()=>inverseCoherentDistinctCaptureFramesTestInput(null,relative),/DISTINCT_CAPTURE_TYPE/);
  assert.throws(()=>inverseCoherentDistinctCaptureFramesTestInput(raw),/DISTINCT_CAPTURE_ARGUMENTS/);
  assert.throws(()=>inverseCoherentDistinctCaptureFramesTestInput(raw,'scripts/update-weather.mjs'),/DISTINCT_CAPTURE_PATH/);
});

async function runExistingDenseCoherentWorkFixture({fs,path,spawnSync,host,root,write,productBytes,
  saveRavScoreContinuationCheckpoint,buildPrivateRuntimeCreateSpec,PRIVATE_RUNTIME_BASE_FILES,
  PRIVATE_WEATHER_COMPONENT_FILES,createPrivateProductionRuntimeBundle,verifyPrivateProductionRuntimeBundle,
  buildCandidateGDerivedStateSeries,candidateGStateKey,ravScoreModelBinding,rollbackBinding,
  packPrivateConditionsHourly,assertPrivateConditionsHourly,unpackDmiPartContinuity,
  inspectDmiForecastFile,readDmiForecastRecord,buildPartDmiForecastWithProtectedRetention}) {
  // Explicit LOCAL input, never a source-CI cache/PASS token. Missing or changed
  // input is a failure. Do not regenerate the already measured component here.
  const supplied=process.env.RAVRADAR_TEST_DENSE_COHERENT_WORK_INPUT;
  assert(path.isAbsolute(supplied),'Dense fixture requires an explicit absolute input directory');
  const inputRoot=await fs.realpath(supplied);assert.equal(inputRoot,path.resolve(supplied));
  const pins={
    'dmi-active.json':{bytes:12714438,sha256:'df42832efb4dc7b90fb012022f697d63d6cd7f31f9db894e418d78d24ede4a35'},
    'dmi-candidate.json':{bytes:12714438,sha256:'df42832efb4dc7b90fb012022f697d63d6cd7f31f9db894e418d78d24ede4a35'},
    'forecast.json':{bytes:45730977,sha256:'b0ec39e10daeeea5cbb910440f2a6f89f476e159b0e03a7486e0b82787da9a14'}};
  const fixtureBefore=new Map();
  for(const[name,pin]of Object.entries(pins)){
    const file=path.join(inputRoot,name),stat=await fs.lstat(file);
    assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1);assert.equal(await fs.realpath(file),file);
    const bytes=await fs.readFile(file);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);
    fixtureBefore.set(name,pin.sha256);
  }
  const {readDmiBulkDocument}=await import('./lib/dmi-bulk-storage.mjs');
  const {buildProtectedDmiNativeCurrentProofs}=await import('./lib/protected-dmi-native-current-proofs.mjs');
  const {ravScoreNumber}=await import('./lib/private-dmi-recovery-record.mjs');
  const {DMI_FORECAST_HOURS}=await import('./lib/dmi-forecast-store.mjs');
  const native=await readDmiBulkDocument(path.join(inputRoot,'dmi-active.json'));
  const originalIndex=await inspectDmiForecastFile(path.join(inputRoot,'forecast.json'));
  const h0=originalIndex.continuity.metadata.productionReferenceAt;
  const nextAt=hours=>new Date(Date.parse(h0)+hours*3_600_000).toISOString();
  assert.equal(h0,'2026-10-21T00:00:00.000Z');
  assert.equal(originalIndex.continuity.metadata.partCount,673);assert.equal(originalIndex.continuity.entries.length,673);
  const parts=Object.values(native.zones).map(zone=>{
    assert.equal(zone.entityType,'coastal-part');assert(zone.entityId.startsWith('PART::'));
    const part={partId:zone.entityId.slice('PART::'.length),zoneId:zone.parentZoneId,
      name:'Existing numeric national fixture '+zone.entityId,
      waterPoint:[...zone.samplingPoint],landPoint:[zone.samplingPoint[0]+0.001,zone.samplingPoint[1]],onshoreDirectionDeg:90};
    assert.deepEqual(dmiExpectedIdentityForPart(part),{
      entityId:zone.entityId,parentZoneId:zone.parentZoneId,entityType:zone.entityType,
      samplingContext:zone.samplingContext,samplingPoint:zone.samplingPoint});
    return part;
  }).sort((a,b)=>a.partId.localeCompare(b.partId));
  assert.equal(parts.length,673);assert.equal(new Set(parts.map(p=>p.partId)).size,673);
  const zones=[...new Set(parts.map(p=>p.zoneId))].sort();assert.equal(zones.length,210);
  const registry={schemaVersion:2,enabled:true,zoneCount:210,partCount:673,
    zones:Object.fromEntries(zones.map(id=>[id,parts.filter(part=>part.zoneId===id)]))};
  const partsById=new Map(parts.map(part=>[part.partId,part])),states={},candidateParts={},rowPins=new Map();
  let numeric=0;
  for(const descriptor of originalIndex.continuity.entries){
    const entry=await readDmiForecastRecord(originalIndex,descriptor),part=partsById.get(entry.partId);assert(part);
    const restored=await unpackDmiPartContinuity({...originalIndex.continuity.metadata,partCount:1,
      rawBytes:entry.rawBytes,compressedBytes:entry.compressedBytes,entries:[entry]},[part],h0);
    const record=restored.get(part.partId);assert.equal(record.hourly.length,121);
    assert.equal(record.hourly[0].time,h0);assert.equal(record.hourly[120].time,nextAt(120));
    for(const row of record.hourly){assert(Number.isFinite(row.currentUMps)&&Number.isFinite(row.currentVMps));numeric++;}
    rowPins.set(part.partId,{hourly:sha(JSON.stringify(record.hourly)),point:sha(JSON.stringify(record.point))});
    const initial=buildIntegratedPartScoreSeries({part,zone:{id:part.zoneId,onshoreDirectionDeg:90},
      hourly:[record.hourly[0]]}).ravScoreState.continuationState;
    assert.equal(initial.time,h0);states[part.partId]={...part,ravScoreModel:{currentState:initial}};
    const candidate=buildCandidateGDerivedStateSeries([{time:h0}],{stateKey:candidateGStateKey(part)}).continuationState;
    assert.equal(candidate.transportMemoryReady,false);candidateParts[part.partId]={ravScoreModel:{currentState:candidate}};
  }
  assert.equal(numeric,673*121);
  const ledger='{"synthetic":"existing dense coherent work fixture"}\n';
  const conditions={datasetId:'rr-existing-dense-coherent-work',productionReferenceAt:h0,generatedAt:h0,
    zones:Object.fromEntries(zones.map(id=>[id,{forecast:{hourly:[]}}])),
    coastalParts:{modelBinding:ravScoreModelBinding(),parts:states,zones:Object.fromEntries(zones.map(id=>[id,{hourly:[]}]))},
    ravScoreCandidateGWarmup:{schemaVersion:'1.0.0',kind:'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
      privacyClass:'PRIVATE_PRODUCTION_RUNTIME',status:'BUILDING_MEASURED_ONLY',evidencePolicy:'MEASURED_ONLY',
      syntheticHistoryAllowed:false,automaticActivationAllowed:false,publicDuringNormalOperation:false,
      sourceModelBinding:ravScoreModelBinding(),candidateModelBinding:rollbackBinding(),runtime:{
        modelBinding:rollbackBinding(),status:'BUILDING_MEASURED_ONLY',expectedPartCount:673,measuredPartCount:673,parts:candidateParts}},
    weatherComponentInputs:{schemaVersion:1,kind:'PRIVATE_WEATHER_COMPONENT_INPUTS',sourceSelectionApplied:true,
      openMeteoBankSha256:null,copernicusBankSha256:null,selectedComponentsSha256:sha(ledger)}};
  const zoneDocument={type:'FeatureCollection',features:zones.map(id=>({type:'Feature',properties:{id}}))};
  await write('data/live/coastal-parts-v2.json',registry);await write('data/zones.geojson',zoneDocument);
  const packedConditions=packPrivateConditionsHourly(conditions);assert.equal(assertPrivateConditionsHourly(packedConditions),true);
  await write('data/live/conditions.json',packedConditions);
  const checkpointPath=path.join(host,'.cache/ravscore-continuation-checkpoint/checkpoint.json');
  await fs.mkdir(path.dirname(checkpointPath),{recursive:true});
  await saveRavScoreContinuationCheckpoint({sourcePath:path.join(host,'data/live/conditions.json'),checkpointPath,repositoryRoot:host});
  const sBefore=await fs.readFile(checkpointPath),checkpoint=JSON.parse(sBefore);
  await write('data/live/dmi-forecast-cache.json',await fs.readFile(path.join(inputRoot,'forecast.json')));
  const empty={...native,zones:{}};
  // Exact original documents belong only to the authenticated B companion pack.
  await write('data/live/dmi-bulk-cache.json',empty);await write('.cache/deployed-dmi-bulk-cache.json',empty);
  await write(PRIVATE_WEATHER_COMPONENT_FILES.dmiActive,await fs.readFile(path.join(inputRoot,'dmi-active.json')));
  await write(PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate,await fs.readFile(path.join(inputRoot,'dmi-candidate.json')));
  for(const descriptor of PRIVATE_RUNTIME_BASE_FILES){
    if(!await fs.lstat(path.join(host,descriptor.relativePath)).catch(error=>{if(error.code==='ENOENT')return null;throw error;})){
      await write(descriptor.relativePath,{});
    }
  }
  await write(PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents,ledger);
  const privateRoot=path.join(root,'private-dense');await fs.mkdir(privateRoot,{mode:0o700});
  const bundlePath=path.join(privateRoot,'bundle'),spec=await buildPrivateRuntimeCreateSpec({repositoryRoot:host});
  await createPrivateProductionRuntimeBundle({...spec,privateRoot,bundlePath,repositoryRoot:host});
  const verified=await verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:host});
  assert.equal(verified.verified,true);assert.equal(verified.partCount,673);assert.equal(verified.zoneCount,210);
  const bBefore=new Map(await Promise.all(['manifest.json',...verified.files.map(row=>'payload/'+row.relativePath)]
    .map(async relative=>[relative,sha(await fs.readFile(path.join(bundlePath,relative)))])));
  // All mutable native contexts are absent before the actual controller call.
  await fs.writeFile(path.join(host,PRIVATE_WEATHER_COMPONENT_FILES.dmiActive),JSON.stringify(empty)+'\n');
  await fs.writeFile(path.join(host,PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate),JSON.stringify(empty)+'\n');
  const runner=path.join(root,'runner-dense'),tmp=path.join(root,'temp-dense');
  await fs.mkdir(runner,{mode:0o700});await fs.mkdir(tmp,{mode:0o700});
  await fs.writeFile(path.join(runner,'private-runtime-current-source.json'),JSON.stringify(verified),{flag:'wx',mode:0o600});
  const firewall=`import http from 'node:http';import https from 'node:https';import cp from 'node:child_process';
    import net from 'node:net';import tls from 'node:tls';import dns from 'node:dns';import dgram from 'node:dgram';
    import {syncBuiltinESMExports} from 'node:module';
    const no=()=>{process.stderr.write('FORBIDDEN_NETWORK_OR_CHILD\\n');throw Error('FORBIDDEN_NETWORK_OR_CHILD')};
    globalThis.fetch=no;http.get=http.request=https.get=https.request=no;
    net.connect=net.createConnection=tls.connect=dgram.createSocket=dns.lookup=dns.resolve=no;
    for(const key of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[key]=no;
    syncBuiltinESMExports();`;
  const envBase=Object.fromEntries(Object.entries(process.env).filter(([key])=>
    new Set(['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','LANG','LC_ALL']).has(key.toUpperCase())));
  const env={...envBase,RUNNER_TEMP:runner,TMPDIR:tmp,TMP:tmp,TEMP:tmp,
    RAVRADAR_PRIVATE_RUNTIME_ROOT:privateRoot,RAVRADAR_PRIVATE_RUNTIME_BUNDLE:bundlePath,
    RAVRADAR_PRODUCTION_TARGET_HOUR:nextAt(6).replace('.000Z','Z'),RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE:'true',
    RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED:'false',RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP:'false',CHECKPOINT_ONLY:'false'};
  // Two existing600s controller phases; no RAW decoder is permitted in this
  // NO_BOOTSTRAP_REQUIRED target. This is LOCAL observation, not production budget.
  const started=performance.now();
  const result=spawnSync(process.execPath,['--max-old-space-size=6144','--import','data:text/javascript,'+encodeURIComponent(firewall),
    path.join(host,'scripts/plan-ravscore-current-history.mjs'),'--retain-committed-raw','--prepare-cached-native-originals'],
    {cwd:host,env,encoding:'utf8',timeout:1_200_000,maxBuffer:2*1024*1024,windowsHide:true});
  await fs.writeFile(path.join(root,'dense-controller.stdout'),result.stdout??'',{flag:'wx',mode:0o600});
  await fs.writeFile(path.join(root,'dense-controller.stderr'),result.stderr??'',{flag:'wx',mode:0o600});
  assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,0,result.stderr);
  assert(!result.stderr.includes('FORBIDDEN_NETWORK_OR_CHILD'));
  const demand=JSON.parse(await fs.readFile(path.join(host,'.cache/ravscore-current-history-demand.json'),'utf8'));
  assert.equal(demand.demands.length,673);assert.equal(demand.rawRetention.captures.length,0);
  assert.equal(demand.rawRetention.boundary.bundleContentSha256,verified.bundleContentSha256);
  assert.equal(demand.rawRetention.boundary.checkpointGenerationSha256,checkpoint.generationSha256);
  const controllerMilliseconds=Math.round(performance.now()-started);
  const index=await inspectDmiForecastFile(path.join(host,'data/live/dmi-forecast-cache.json'));
  assert.equal(index.continuity.metadata.schemaVersion,2);assert.equal(index.continuity.metadata.productionReferenceAt,h0);
  assert.equal(index.continuity.metadata.partCount,673);assert.equal(index.continuity.entries.length,673);
  // Same established normal updater producer seam as the preserved596790ms
  // component. No numerical/proof implementation is copied or replaced.
  const updater=productBytes.get('scripts/update-weather.mjs');assert(updater);
  const updaterText=updater.toString('utf8'),begin='// BEGIN normal PART native-original continuity',end='// END normal PART native-original continuity';
  assert.equal(updaterText.split(begin).length,2);assert.equal(updaterText.split(end).length,2);
  const producer=new Function('buildProtectedDmiNativeCurrentProofs','createProtectedDmiNativeCurrentInspector','ravScoreNumber','DMI_FORECAST_HOURS',
    updaterText.slice(updaterText.indexOf(begin),updaterText.indexOf(end)+end.length)
      +'\nreturn {buildSelectedDmiPartNativeProofBank,assertSelectedDmiNativeOriginalsBeforeScore};')(
    buildProtectedDmiNativeCurrentProofs,createProtectedDmiNativeCurrentInspector,ravScoreNumber,DMI_FORECAST_HOURS);
  const followStarted=performance.now();let checked=0,checkedRows=0,forwardRows=0;
  for(const descriptor of index.continuity.entries){
    assert(performance.now()-followStarted<=600_000,'Existing600s local follower observation ceiling');
    const entry=await readDmiForecastRecord(index,descriptor),part=partsById.get(entry.partId);assert(part);
    const restored=await unpackDmiPartContinuity({...index.continuity.metadata,partCount:1,
      rawBytes:entry.rawBytes,compressedBytes:entry.compressedBytes,entries:[entry]},[part],nextAt(7));
    const record=restored.get(part.partId),old=rowPins.get(part.partId);
    assert.equal(record.hourly.length,121);assert.equal(record.hourly[0].time,h0);assert.equal(record.hourly[120].time,nextAt(120));
    assert.equal(sha(JSON.stringify(record.hourly)),old.hourly);assert.equal(sha(JSON.stringify(record.point)),old.point);
    const previous=record.nativeCurrentOriginals.bank;assert.equal(previous.selections.length,121);
    const beforeRecord=sha(JSON.stringify(record));
    const nextRecord=buildPartDmiForecastWithProtectedRetention({properties:{id:dmiExpectedIdentityForPart(part).entityId,
      dataPoint:part.waterPoint}},empty,empty,nextAt(7),{startAt:h0,expectedIdentity:dmiExpectedIdentityForPart(part),
      persistedHourly:record.hourly,nativeCurrentOriginals:record.nativeCurrentOriginals,protectedCompanionContexts:[]});
    assert(nextRecord);assert.equal(nextRecord.hourly.length,121);
    for(let i=0;i<121;i++){
      assert.equal(nextRecord.hourly[i].time,record.hourly[i].time);
      assert.deepEqual([nextRecord.hourly[i].currentUMps,nextRecord.hourly[i].currentVMps],
        [record.hourly[i].currentUMps,record.hourly[i].currentVMps]);
      assert.equal(nextRecord.hourly[i].sources.current.modelRun,record.hourly[i].sources.current.modelRun);
      assert.deepEqual(nextRecord.hourly[i].sources.current.nativeSteps,record.hourly[i].sources.current.nativeSteps);
    }
    const bank=producer.buildSelectedDmiPartNativeProofBank(part,nextRecord,[],previous);
    assert.equal(bank.selections.length,121);
    const fallback={source:'deployed-private-runtime',nativeCurrentContexts:[],nativeCurrentOriginals:record.nativeCurrentOriginals,record};
    const recoverySources=buildNewestValidRavScoreRecoverySources({fallbackSource:fallback,protectedPreviousSource:fallback,
      productionReferenceAt:nextAt(7),part});
    const forward=recoverySources.flatMap(source=>source.record.hourly).filter(row=>Date.parse(row.time)>Date.parse(h0)
      &&Date.parse(row.time)<Date.parse(nextAt(7))&&Number.isFinite(row.currentUMps)&&Number.isFinite(row.currentVMps));
    assert.equal(forward.length,6,'Forward collector may not pass by silently dropping saved numeric current');
    producer.assertSelectedDmiNativeOriginalsBeforeScore({part,publicHourly:nextRecord.hourly.slice(7,7+114),
      publicBank:bank,publicContexts:[],recoverySources,forwardStartAt:h0,targetReferenceAt:nextAt(7)});
    const retained=collect({part,initialSelection:{source:'EXISTING_INTEGRATED',state:checkpoint.states[part.partId]},
      targetReferenceAt:nextAt(7),recoverySources});
    assert.equal(retained.captures.length,0);assert.equal(sha(JSON.stringify(record)),beforeRecord);
    forwardRows+=forward.length;checkedRows+=record.hourly.length;checked++;
  }
  assert.equal(checked,673);assert.equal(checkedRows,673*121);assert.equal(forwardRows,673*6);
  assert(performance.now()-followStarted<=600_000,'Existing600s local follower observation ceiling');
  for(const[relative,pin]of bBefore)assert.equal(sha(await fs.readFile(path.join(bundlePath,relative))),pin);
  assert.deepEqual(await fs.readFile(checkpointPath),sBefore);
  const after=await verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:host,expected:verified});
  assert.equal(after.bundleContentSha256,verified.bundleContentSha256);
  for(const[name,pin]of fixtureBefore)assert.equal(sha(await fs.readFile(path.join(inputRoot,name))),pin);
  for(const[relative,bytes]of productBytes)assert.deepEqual(await fs.readFile(path.join(host,relative)),bytes);
  for(const relative of ['.cache/coherent-current-original-requests.json','.cache/coherent-current-native-originals.json',
    '.cache/coherent-current-original-worker','.cache/coherent-current-national-work.json']){
    await assert.rejects(fs.access(path.join(host,relative)),{code:'ENOENT'});
  }
  assert.deepEqual(await fs.readdir(tmp),[]);
  await fs.writeFile(path.join(root,'dense-result.json'),JSON.stringify({kind:'LOCAL_DENSE_COHERENT_WORK_CALLER',
    parts:checked,savedRows:checkedRows,forwardRows,controllerMilliseconds,
    followerMilliseconds:Math.round(performance.now()-followStarted),originalBSUnchanged:true,
    originalInputFilesUnchanged:true,oldH0Preserved:true,rawDecoderExercised:false,
    remoteGcmOrCentralPointerProved:false,allFiveFamiliesProved:false,productionActivated:false},null,2)+'\n',{flag:'wx',mode:0o600});
}


// Cheap source contract only, NOT an elapsed-time/capacity PASS.
test('national coherent stage budget: whole inverse and final awaited stage work keep the existing limit',()=>{
  for(const row of JOINT_NATIONAL_COHERENT_CONTROLLER_TEST_REVIEW){
    const file=new URL(row.path==='scripts/plan-ravscore-current-history.mjs'
      ?'./plan-ravscore-current-history.mjs':'./prepare-cached-coherent-current-work.mjs',import.meta.url);
    const raw=inverseCoherentRawTransportLifetimeTestInput(readFileSync(file,'utf8').replace(/\r\n/g,'\n'),row.path);
    assert.equal(Buffer.byteLength(raw),row.after.bytes);assert.equal(sha(raw),row.after.sha256);
    const before=inverseJointCoherentControllerTestInput(raw,row.path);
    assert.equal(Buffer.byteLength(before),row.before.bytes);assert.equal(sha(before),row.before.sha256);
    if(row.path.endsWith('plan-ravscore-current-history.mjs')){
      assert.equal(inverseAlternativeCCaller(raw,row.path),inverseAlternativeCCaller(before,row.path));
      for(const[_old,current]of row.hunks)assert.throws(
        ()=>inverseAlternativeCCaller(raw.replace(current,'0'.repeat(64)),row.path),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
    }else{
      // These exact hunks include writer, zone/water readback and final input+
      // stage hashing. No earlier assertion or600s/192MiB limit is removed.
      assert.equal(row.stageBudgetHunkCount,4);
      const stageHunks=row.hunks.slice(0,row.stageBudgetHunkCount);
      assert.equal(stageHunks.length,4);
      for(const[old,current]of stageHunks){
        assert.equal(raw.split(current).length,2);assert(current.includes(old));
        assert(current.includes("if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');"));
      }
      assert(raw.lastIndexOf("if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');")
        >raw.indexOf('const stageIdentity = await measuredFile(STAGE);'));
      assert(raw.indexOf('preparedStages.set(receipt,')>raw.indexOf('const stageIdentity = await measuredFile(STAGE);'));
      for(const[_old,current]of row.hunks.slice(row.stageBudgetHunkCount)) assert.equal(raw.split(current).length,2);
      assert(raw.includes('captureMode: metadata.privateRequests.length ? COHERENT_DISTINCT_READ_CAPTURE_MODE : null'));
      assert(raw.includes('decodedEnvelope: decoded.decodedEnvelope, captureMode: decoded.captureMode ?? null'));
      assert(raw.includes('captureMode: localMetadata.privateRequests.length ? decoded.captureMode ?? null : null'));
      const mutation=raw.replace(row.hunks[3][1],row.hunks[3][0]);
      assert.notEqual(sha(inverseJointCoherentControllerTestInput(mutation,row.path)),row.before.sha256);
    }
  }
});


// Narrow control/accounting units from the EXACT ordinary source, not a second
// native admission implementation and not a fabricated worker/owned-file receipt.
function coherentRawTransportLifetimeUnits() {
  const relative='scripts/prepare-cached-coherent-current-work.mjs';
  const source=readFileSync(new URL('./prepare-cached-coherent-current-work.mjs',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const review=COHERENT_RAW_TRANSPORT_LIFETIME_TEST_REVIEW.find(row=>row.path===relative);
  assert.equal(sha(source),review.after.sha256);
  const begin='// BEGIN validated coherent RAW transport retention',end='// END validated coherent RAW transport retention';
  assert.equal(source.split(begin).length,2);assert.equal(source.split(end).length,2);
  const canonicalStart=source.indexOf('const canonical = value =>');
  const canonicalEnd=source.indexOf('\n\nasync function measuredFile(',canonicalStart);
  assert(canonicalStart>0&&canonicalEnd>canonicalStart);
  const definitions=source.slice(canonicalStart,canonicalEnd)+'\n'
    +source.slice(source.indexOf(begin),source.indexOf(end)+end.length);
  const refuse=code=>{throw new Error('COHERENT_CURRENT_WORK_'+code)};
  const unit=vm.compileFunction(definitions+'\nreturn {snapshot:validatedTransportRetentionCaptures,canonical};',
    ['refuse'])(refuse);
  const installStart=source.indexOf('export async function installPreparedCoherentCurrentWork(receipt) {');
  assert(installStart>0);
  const installDefinition=source.slice(installStart).replace(/^export /,'');
  return {...unit,source,install({preparedStages,rename,log}) {
    return vm.compileFunction(installDefinition+'\nreturn installPreparedCoherentCurrentWork;',
      ['preparedStages','assertCoherentCurrentWorkInputs','equal','measuredFile','STAGE','FORECAST','fs','capacityStage','refuse'])(
      preparedStages,async()=>{},(a,b)=>JSON.stringify(a)===JSON.stringify(b),async()=>({stage:'same'}),
      'UNIT_STAGE','UNIT_FORECAST',{rename},log,refuse);
  }};
}

test('coherent raw transport lifetime: validated DEFAULT and explicit captures stay detached canonical and source-neutral',()=>{
  const units=coherentRawTransportLifetimeUnits();
  for(const distinct of [false,true]){
    const args=distinct?distinctReadCaptureFixture().args
      :coherentReprojectionFixture(fixture({coherent:[-3,0,3,6,9]}));
    const inputBefore=bootstrapInputBytes(args.input),wireBefore=JSON.stringify(args.decodedEnvelope);
    const originals=validatedCommittedCoherentCurrentOriginals(args);
    const pins=units.snapshot(originals);
    const expected=[...new Map([...originals.values()].map(original=>{
      const capture=original.transportCapture??original.capture;return[units.canonical(capture),capture];
    })).entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,capture])=>capture);
    assert.deepEqual(pins,expected);assert(Object.isFrozen(pins));assert(pins.every(Object.isFrozen));
    assert.equal(bootstrapInputBytes(args.input),inputBefore);assert.equal(JSON.stringify(args.decodedEnvelope),wireBefore);
    for(const original of originals.values()){
      assert.deepEqual(canonicalSavedDmiOriginalCapture(original.row.sources.current),original.capture);
      if(distinct)assert.notEqual(original.transportCapture.acquiredAt,original.capture.acquiredAt);
    }
    const boundary=structuredClone(args.metadata.privateBinding);
    const retention={schemaVersion:1,kind:'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION',boundary,captures:[]};
    const merged=withInstalledCoherentRawTransportRetention(retention,pins);
    assert.deepEqual(merged.captures,pins);assert.strictEqual(merged.boundary,boundary);
    const frozenBefore=JSON.stringify(pins),first=originals.values().next().value;
    (first.transportCapture??first.capture).acquiredAt=captureAt(8);
    assert.equal(JSON.stringify(pins),frozenBefore,'Private snapshot never aliases a caller-visible envelope');
    assert.deepEqual(retention.captures,[]);
    if(distinct){
      const strict=distinctReadCaptureFixture().args;delete strict.captureMode;
      assert.throws(()=>validatedCommittedCoherentCurrentOriginals(strict),/REPROJECTION_ENVELOPE_BINDING/);
    }
  }
  assert.deepEqual(units.snapshot(null),[]);
  assert.deepEqual(units.snapshot(new Map()),[]);
});

test('coherent raw transport lifetime: exact canonical union permits4096 refuses4097 and never mutates demand',()=>{
  const {args}=distinctReadCaptureFixture(),sample=args.decodedEnvelope.privateOriginals[0].transportCapture;
  const captures=Array.from({length:4097},(_,i)=>canonicalSavedDmiOriginalCapture({...sample,
    itemId:'synthetic-retention-only-'+i,assetIdentitySha256:sha('synthetic-retention-only-'+i)}));
  assert(captures.every(Boolean));
  const base={schemaVersion:1,kind:'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION',
    boundary:structuredClone(args.metadata.privateBinding),captures:captures.slice(0,2048)};
  const incoming=captures.slice(2048,4096),before=JSON.stringify({base,incoming});
  const atLimit=withInstalledCoherentRawTransportRetention(base,incoming);
  assert.equal(atLimit.captures.length,4096);
  assert.equal(withInstalledCoherentRawTransportRetention(atLimit,[captures[0],captures[4095]]).captures.length,4096);
  assert.strictEqual(atLimit.boundary,base.boundary);
  assert.equal(JSON.stringify({base,incoming}),before);
  const fullBefore=JSON.stringify(atLimit);
  assert.throws(()=>withInstalledCoherentRawTransportRetention(atLimit,[captures[4096]]),/RETENTION_BOUND/);
  assert.equal(JSON.stringify(atLimit),fullBefore);
  for(const invalid of [{...sample,contentSha256:'bad'},{...sample,acquiredAt:captureAt(1)+'.invalid'},
    {...sample,privateUnexpectedField:'NOT_A_CAPTURE'}]){
    assert.throws(()=>withInstalledCoherentRawTransportRetention(base,[invalid]),/RETENTION_CAPTURE_REQUIRED/);
    assert.equal(JSON.stringify({base,incoming}),before);
  }
  assert.deepEqual(withInstalledCoherentRawTransportRetention({...base,captures:[]},[]).captures,[]);
});

test('coherent raw transport lifetime: actual install control flow releases private pins only after successful rename',async()=>{
  // Control-flow unit with local WeakMap and inert I/O only. It DOES NOT prove
  // authentic B/S, an owned stage or a decoded RAW/worker completion.
  const units=coherentRawTransportLifetimeUnits(),{args}=distinctReadCaptureFixture();
  const pins=units.snapshot(validatedCommittedCoherentCurrentOriginals(args));
  const receipt={capacity:{privateCanary:'PRIVATE_RECEIPT_CANARY'},transportCaptures:[{fake:'PUBLIC_MUTATION'}]};
  const stages=new WeakMap(),capacity=Object.freeze({savedBankBytes:123});
  stages.set(receipt,{workingInputs:[],stageIdentity:{stage:'same'},capacity,transportCaptures:pins});
  let release,started;const gate=new Promise(resolve=>{release=resolve}),renaming=new Promise(resolve=>{started=resolve});
  const logs=[],install=units.install({preparedStages:stages,rename:async(from,to)=>{
    assert.deepEqual([from,to],['UNIT_STAGE','UNIT_FORECAST']);started();await gate;
  },log:(...values)=>logs.push(values)});
  let finished=false;
  const pending=install(receipt).then(value=>{finished=true;return value});
  await renaming;assert.equal(finished,false);assert.equal(logs.length,0);
  receipt.transportCaptures=[];receipt.capacity={newPrivateCanary:'SECOND_CANARY'};
  release();assert.strictEqual(await pending,pins);
  assert.deepEqual(logs,[['installed',capacity]]);
  assert(!JSON.stringify(logs).includes('CANARY'));assert(!JSON.stringify(logs).includes(pins[0].itemId));
  await assert.rejects(install(receipt),/OWNED_STAGE_REQUIRED/);
  const failureReceipt={},failure=new Error('UNIT_RENAME_FAILURE'),failureStages=new WeakMap();
  failureStages.set(failureReceipt,{workingInputs:[],stageIdentity:{stage:'same'},capacity,transportCaptures:pins});
  const failed=units.install({preparedStages:failureStages,rename:async()=>{throw failure},log:()=>assert.fail('No installed log after failure')});
  await assert.rejects(failed(failureReceipt),error=>error===failure);
  await assert.rejects(failed(failureReceipt),/OWNED_STAGE_REQUIRED/);
  const publicReceipt=units.source.slice(units.source.indexOf('  const receipt = {'),units.source.indexOf('  preparedStages.set(receipt,'));
  assert(!publicReceipt.includes('transportCaptures'));
  assert(units.source.includes('capacity: Object.freeze({ ...capacity }), transportCaptures'));
});

test('coherent raw transport lifetime: exact outer inverse preserves joint and every old source oracle',()=>{
  for(const row of COHERENT_RAW_TRANSPORT_LIFETIME_TEST_REVIEW){
    const file=new URL('../'+row.path,import.meta.url),input=readFileSync(file,'utf8').replace(/\r\n/g,'\n');
    const raw=row.path==='scripts/plan-ravscore-current-history.mjs'
      ?inverseCurrentFamilyColdTargetTestInput(input,row.path):input;
    assert.equal(Buffer.byteLength(raw),row.after.bytes);assert.equal(sha(raw),row.after.sha256);
    const before=inverseCoherentRawTransportLifetimeTestInput(raw,row.path);
    assert.equal(Buffer.byteLength(before),row.before.bytes);assert.equal(sha(before),row.before.sha256);
    if(row.path.endsWith('plan-ravscore-current-history.mjs')){
      assert.equal(inverseAlternativeCCaller(raw,row.path),inverseAlternativeCCaller(before,row.path));
      for(const changed of ['!'+raw.slice(1),raw+'\n'])assert.throws(
        ()=>inverseAlternativeCCaller(changed,row.path),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
      const install=raw.indexOf('const transportCaptures = await preamble.installPreparedCoherentCurrentWork(prepared);');
      const recurse=raw.indexOf('const retention = await readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt);',install);
      const union=raw.indexOf('return withInstalledCoherentRawTransportRetention(retention, transportCaptures);',recurse);
      assert(install>0&&recurse>install&&union>recurse);
      assert(union<raw.indexOf('async function main()'));
    }
  }
});

test('cold target inverse: complete exact modules precede unchanged historical oracles and reject every changed hunk',()=>{
  for(const row of CURRENT_FAMILY_COLD_TARGET_TEST_REVIEW){
    const complete=readFileSync(new URL('../'+row.path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    const outer=row.path===CURRENT_FAMILY_COLD_ZONE_HISTORY_TEST_REVIEW.path
      ?CURRENT_FAMILY_COLD_ZONE_HISTORY_TEST_REVIEW:null;
    if(outer){
      assert.equal(Buffer.byteLength(complete),outer.after.bytes);assert.equal(sha(complete),outer.after.sha256);
      assert.equal(complete.split(outer.hunk).length,2);
    }
    // Qualify the exact additive outer module before the unchanged target pins.
    // Never repin an older oracle to accept the final caller wholesale.
    const actual=outer?inverseCurrentFamilyColdZoneHistoryTestInput(complete,row.path):complete;
    assert.equal(Buffer.byteLength(actual),row.after.bytes);assert.equal(sha(actual),row.after.sha256);
    const before=inverseCurrentFamilyColdTargetTestInput(actual,row.path);
    assert.equal(Buffer.byteLength(before),row.before.bytes);assert.equal(sha(before),row.before.sha256);
    assert.equal(inverseCurrentFamilyColdTargetTestInput(before,row.path),before);
    assert.equal(inverseAlternativeCCaller(actual,row.path),inverseAlternativeCCaller(before,row.path));
    if(outer){
      assert.equal(Buffer.byteLength(actual),outer.before.bytes);assert.equal(sha(actual),outer.before.sha256);
      assert.equal(inverseCurrentFamilyColdTargetTestInput(complete,row.path),before);
      assert.equal(inverseAlternativeCCaller(complete,row.path),inverseAlternativeCCaller(before,row.path));
      assert.equal(complete.replace(outer.hunk,''),actual,
        'Only the complete pinned outer predecessor is an idempotent historical input');
      for(const changed of [complete.replace(outer.hunk,outer.hunk+outer.hunk),
        complete.replace(outer.hunk,outer.hunk+'/*UNREVIEWED*/'),
        complete.replace('zone[key] = withoutHistoricCurrent(zone[key]);','zone[key] = [];'),
        '!'+complete.slice(1),complete+'\n']){
        assert.notEqual(changed,complete);
        assert.throws(()=>inverseCurrentFamilyColdZoneHistoryTestInput(changed,row.path),/COLD_ZONE_HISTORY/);
        assert.throws(()=>inverseCurrentFamilyColdTargetTestInput(changed,row.path),/COLD_ZONE_HISTORY/);
        assert.throws(()=>inverseAlternativeCCaller(changed,row.path),/COLD_ZONE_HISTORY/);
      }
    }
    for(const[old,current]of row.hunks){
      assert.equal(actual.split(current).length,2);
      for(const changed of [actual.replace(current,old),actual.replace(current,current+current),
        actual.replace(current,current+'/*UNREVIEWED*/')]){
        assert.notEqual(changed,actual);
        if(changed===before){
          assert.equal(inverseCurrentFamilyColdTargetTestInput(changed,row.path),before,
            'The complete one-hunk predecessor remains an explicitly pinned idempotent input');
          assert.equal(inverseAlternativeCCaller(changed,row.path),inverseAlternativeCCaller(before,row.path));
        }else{
          assert.throws(()=>inverseCurrentFamilyColdTargetTestInput(changed,row.path),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
          assert.throws(()=>inverseAlternativeCCaller(changed,row.path),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
        }
      }
    }
    for(const changed of ['!'+actual.slice(1),actual+'\n']){
      assert.throws(()=>inverseCurrentFamilyColdTargetTestInput(changed,row.path),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
      assert.throws(()=>inverseAlternativeCCaller(changed,row.path),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
    }
  }
  assert.throws(()=>inverseCurrentFamilyColdTargetTestInput({},'scripts/update-weather.mjs'),/COLD_TARGET_TYPE/);
  assert.throws(()=>inverseCurrentFamilyColdTargetTestInput('','scripts/unknown.mjs'),/COLD_TARGET_PATH/);
});
