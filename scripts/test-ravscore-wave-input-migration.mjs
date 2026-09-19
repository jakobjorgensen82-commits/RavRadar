import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { classifyPeakPeriodInputChanges, planPeakPeriodStateMigration,
  replayPeakPeriodStateMigration, preparePeakPeriodProductionTransition } from './lib/ravscore-wave-input-migration.mjs';
import { buildRavScoreProductionPartSeries } from './lib/ravscore-production-part-pipeline.mjs';
import { RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION } from './lib/ravscore-recovery-replay.mjs';
import { verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { compareRavScoreBestTimeCandidates } from '../js/core/best-time-policy.js';

const time = hour => new Date(Date.parse('2026-09-19T00:00:00.000Z') + hour * 3600000).toISOString();
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const part = { partId: 'SYNTHETIC-PEAK', parentZoneId: 'SYNTHETIC-ZONE', waterPoint: [8, 55], onshoreDirectionDeg: 90 };
const zone = { id: part.parentZoneId, onshoreDirectionDeg: 90 };
function source(component, at) {
  const wave = component === 'wave';
  const result = { provider: 'dmi', fallback: false, component,
    collection: wave ? 'wam_dw' : 'dkss_idw', collectionFamily: wave ? 'wave' : 'marine',
    componentKind: wave ? 'wave-mobilisation-tuple' : 'ocean-current-vector',
    fieldSet: wave ? ['significant-wave-height', 'dominant-wave-period'] : ['current-u', 'current-v'],
    spatialSelection: wave ? 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation'
      : 'nearest-shared-grid-cell-no-spatial-interpolation',
    ...(wave ? { wavePeriodSemantics: 'peak', wavePeriodField: { shortName: 'pp1d', paramId: 231, indicatorOfParameter: null } }
      : { vectorSemanticsVersion: 3, vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
        verticalLayer: 'depth:1', verticalLayerRankM: 1 }),
    optionalFieldSet: wave ? ['mean-wave-dir'] : [], modelRun: time(-54), nativeValidTime: at,
    leadTimeHours: (Date.parse(at) - Date.parse(time(-54))) / 3600000,
    entityId: `PART::${part.partId}`, parentZoneId: part.parentZoneId, entityType: 'coastal-part',
    samplingContext: 'coastal-part-water-point', samplingPoint: [...part.waterPoint], gridPoint: [...part.waterPoint],
    gridDefinitionSha256: hash('grid'), distanceKm: 0, spatialSemanticsVersion: 1,
    itemId: `${component}-${at}`, assetIdentitySha256: hash(`${component}-${at}`), acquiredAt: time(-54),
    temporalResolution: 'native', nativeValidTimes: [at] };
  result.nativeSteps = [{ itemId: result.itemId, assetIdentitySha256: result.assetIdentitySha256,
    nativeValidTime: at, leadTimeHours: result.leadTimeHours, acquiredAt: result.acquiredAt,
    optionalFieldSet: [...result.optionalFieldSet], ...(wave ? { wavePeriodSemantics: 'peak', wavePeriodField: { ...result.wavePeriodField } } : {}) }];
  return result;
}
function weather(i) {
  const at = time(i);
  return { time: at, windSpeedMps: 5, windDirectionDeg: 270, waveHeightM: 1.2, wavePeriodS: 7,
    waveDirectionDeg: 270, waterLevelCm: 10, waterLevelTrendCm3h: 0, waterTemperatureC: 14,
    currentSpeedMps: .09, currentDirectionDeg: 90, currentUMps: .09, currentVMps: 0,
    currentProvenance: { status: 'verified', ...source('current', at) }, sources: { wave: source('wave', at) } };
}
const previousRecord = { point: [...part.waterPoint], hourly: Array.from({ length: 54 }, (_, i) => weather(i - 48)) };
const initial = buildRavScoreProductionPartSeries({ part, zone,
  initialSelection: { state: null, source: 'COLD_START', candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION },
  candidateGRollbackMeasuredColdStart: true, targetReferenceAt: time(0),
  recoverySources: [{ record: previousRecord }], publicHourly: [weather(0)],
});
const baseline = { integratedState: initial.scores[0].ravScoreModel.continuationState,
  candidateGState: initial.candidateGRollbackScores[0].candidateG.continuationState };
const baselineBytes = JSON.stringify(baseline), previousBytes = JSON.stringify(previousRecord);
const correctedRecord = structuredClone(previousRecord);
correctedRecord.hourly.find(row => row.time === time(1)).wavePeriodS = 9;
const options = { part, zone, previousRecord, correctedRecord, targetReferenceAt: time(3), baseline };
const inventory = classifyPeakPeriodInputChanges(options);
assert.deepEqual(inventory.affectedTimes, [time(1)]);
assert.deepEqual(inventory.historicalTimes, [time(1)]);
assert.equal(inventory.privatePayloadIncluded, false);
assert.equal('waterPoint' in inventory, false);
const replay = replayPeakPeriodStateMigration(options);
assert.equal(replay.plan.disposition, 'PRE_CHANGE_SUFFIX_REPLAY');
assert.equal(replay.plan.baselineTime, time(0));
assert.equal(replay.targetStatePair.integratedState.time, time(3));
assert.equal(replay.targetStatePair.candidateGState.time, time(3));
assert.equal(replay.series.recovery.coldStartHistoryLineage, null);
assert.deepEqual(replay.series.scores.map(row => row.time), replay.series.candidateGRollbackScores.map(row => row.time));
const uncorrected = buildRavScoreProductionPartSeries({ part, zone,
  initialSelection: { state: baseline.integratedState, source: 'INTEGRATED_CHECKPOINT' },
  previousCandidateGContinuation: baseline.candidateGState, targetReferenceAt: time(3),
  recoverySources: [{ record: previousRecord }], publicHourly: previousRecord.hourly.filter(row => Date.parse(row.time) >= Date.parse(time(3))),
});
assert.notEqual(replay.targetStatePair.integratedState.mobilisationPotential,
  uncorrected.scores[0].ravScoreModel.continuationState.mobilisationPotential);
assert.notEqual(replay.targetStatePair.candidateGState.mobilisationPotential,
  uncorrected.candidateGRollbackScores[0].candidateG.continuationState.mobilisationPotential);
assert.equal(JSON.stringify(baseline), baselineBytes);
assert.equal(JSON.stringify(previousRecord), previousBytes);
assert.equal(replayPeakPeriodStateMigration({ ...options, correctedRecord: structuredClone(previousRecord) }).series, null);
const futureOnlyRecord = structuredClone(previousRecord);
futureOnlyRecord.hourly.find(row => row.time === time(4)).wavePeriodS = 9;
const futureOnly = replayPeakPeriodStateMigration({ ...options, correctedRecord: futureOnlyRecord, baseline: null });
assert.equal(futureOnly.plan.disposition, 'UNCHANGED_STATE');
assert.equal(futureOnly.plan.reason, 'FUTURE_ONLY_INPUT_CHANGE');
assert.equal(futureOnly.series, null);
assert.equal(futureOnly.targetStatePair, null);
const changedH0 = structuredClone(previousRecord);
changedH0.hourly.find(row => row.time === time(3)).wavePeriodS = 9;
assert.equal(planPeakPeriodStateMigration({ ...options, correctedRecord: changedH0, baseline: null }).disposition,
  'AFFECTED_PART_BOUNDED_COLD_REPLAY', 'An H0 change still affects H0 state and must not be treated as future-only');

const cold = replayPeakPeriodStateMigration({ ...options, baseline: null });
assert.equal(cold.plan.disposition, 'AFFECTED_PART_BOUNDED_COLD_REPLAY');
assert.equal(cold.plan.baselineTime, null);
assert.equal(cold.series.recovery.coldStartHistoryLineage.expectedCausalPositionCount, 48);
assert.equal(cold.series.candidateGState.initialStateSource, 'VERIFIED_MEASURED_COLD_START');
assert.equal(cold.series.scores[0].ravScoreModel.modes.waders.scoreQuality, 'HISTORY_INCOMPLETE',
  '48 measured hours must not masquerade as exact 12-day mobilisation history');
const futureBaseline = { integratedState: replay.targetStatePair.integratedState, candidateGState: replay.targetStatePair.candidateGState };
assert.equal(planPeakPeriodStateMigration({ ...options, baseline: futureBaseline }).reason, 'NO_COMPATIBLE_PRE_CHANGE_PAIR');
const gapBefore = structuredClone(previousRecord), gapAfter = structuredClone(correctedRecord);
gapBefore.hourly = gapBefore.hourly.filter(row => row.time !== time(2));
gapAfter.hourly = gapAfter.hourly.filter(row => row.time !== time(2));
const gap = replayPeakPeriodStateMigration({ ...options, previousRecord: gapBefore, correctedRecord: gapAfter });
assert.equal(gap.plan.reason, 'INCOMPLETE_VERIFIED_SUFFIX');
assert.ok(gap.series.recovery.coldStartHistoryLineage.boundedUnknownPositionCount > 0);

const unknownBefore = structuredClone(previousRecord), unknownAfter = structuredClone(previousRecord);
delete unknownBefore.hourly.find(row => row.time === time(1)).sources.wave.wavePeriodSemantics;
const missing = unknownAfter.hourly.find(row => row.time === time(1));
missing.waveHeightM = null; missing.wavePeriodS = null; missing.waveDirectionDeg = null; delete missing.sources.wave;
const unknown = replayPeakPeriodStateMigration({ ...options, previousRecord: unknownBefore, correctedRecord: unknownAfter });
assert.deepEqual(unknown.plan.unprovenRemovedTimes, [time(1)]);
assert.equal(unknown.plan.disposition, 'AFFECTED_PART_BOUNDED_COLD_REPLAY');
assert.ok(unknown.series.recovery.coldStartHistoryLineage.boundedUnknownPositionCount > 0);
const badPeak = structuredClone(correctedRecord);
badPeak.hourly.find(row => row.time === time(1)).sources.wave.wavePeriodField.shortName = 'mwp';
assert.throws(() => planPeakPeriodStateMigration({ ...options, correctedRecord: badPeak }), /qualified peak-period evidence/);
const badWind = structuredClone(correctedRecord);
badWind.hourly[0].windSpeedMps = 99;
assert.throws(() => planPeakPeriodStateMigration({ ...options, correctedRecord: badWind }), /non-wave input/);
assert.throws(() => planPeakPeriodStateMigration({ ...options, correctedRecord: { ...correctedRecord,
  hourly: [...correctedRecord.hourly, correctedRecord.hourly[0]] } }), /duplicate/);
assert.throws(() => planPeakPeriodStateMigration({ ...options, previousRecord,
  correctedRecord: unknownAfter }), /retain an existing qualified wave tuple/);
const invalidRawBefore = structuredClone(previousRecord), invalidRawAfter = structuredClone(correctedRecord);
invalidRawBefore.hourly.find(row => row.time === time(2)).currentUMps = .02;
invalidRawAfter.hourly.find(row => row.time === time(2)).currentUMps = .02;
assert.throws(() => planPeakPeriodStateMigration({ ...options,
  previousRecord: invalidRawBefore, correctedRecord: invalidRawAfter }), /without exact verified provenance/,
  'invalid raw evidence must not be silently downgraded to bounded missing history');

// The real producer consumes one atomic option set: both old states are
// rewound together and no deployed/reprocessed source can reintroduce MWP.
const oldAt2 = buildRavScoreProductionPartSeries({ part, zone,
  initialSelection: { state: baseline.integratedState, source: 'EXISTING_INTEGRATED' },
  previousCandidateGContinuation: baseline.candidateGState, targetReferenceAt: time(2),
  recoverySources: [{ record: previousRecord }], publicHourly: previousRecord.hourly.filter(row => row.time >= time(2)),
});
const pipelineOptions = {
  initialSelection: { state: oldAt2.scores[0].ravScoreModel.continuationState, source: 'EXISTING_INTEGRATED' },
  previousCandidateGContinuation: oldAt2.candidateGRollbackScores[0].candidateG.continuationState,
  legacyCandidateGMigrationState: null, candidateGRollbackMeasuredColdStart: false,
  candidateGRollbackMeasuredWarmupContinuation: true,
  recoverySources: [{ label: 'must-not-survive', record: previousRecord }],
};
const integration = { ...options, previousProductionReferenceAt: time(2),
  currentPipelineOptions: pipelineOptions, preChangePairs: [baseline] };
const prepared = preparePeakPeriodProductionTransition(integration);
assert.equal(prepared.plan.disposition, 'PRE_CHANGE_SUFFIX_REPLAY');
assert.equal(prepared.pipelineOptions.initialSelection.state.time, time(0));
assert.equal(prepared.pipelineOptions.previousCandidateGContinuation.time, time(0));
assert.equal(prepared.pipelineOptions.recoverySources.length, 1);
assert.equal(prepared.pipelineOptions.recoverySources[0].label, 'verified-input-transition');
const integrated = buildRavScoreProductionPartSeries({ part, zone, targetReferenceAt: time(3), ...prepared.pipelineOptions });
assert.deepEqual(integrated.scores[0].ravScoreModel.continuationState, replay.targetStatePair.integratedState);
assert.deepEqual(integrated.candidateGRollbackScores[0].candidateG.continuationState, replay.targetStatePair.candidateGState);
const preparedCold = preparePeakPeriodProductionTransition({ ...integration, preChangePairs: [] });
assert.equal(preparedCold.pipelineOptions.initialSelection.state, null);
assert.equal(preparedCold.pipelineOptions.previousCandidateGContinuation, null);
assert.equal(preparedCold.pipelineOptions.candidateGRollbackMeasuredColdStart, true);
const changedOther = structuredClone(correctedRecord);
changedOther.hourly.find(row => row.time === time(1)).currentSpeedMps = .2;
assert.throws(() => preparePeakPeriodProductionTransition({ ...integration, correctedRecord: changedOther }),
  error => error.code === 'RAVSCORE_INPUT_MIGRATION_OTHER_CONSUMED_COMPONENT_CHANGED');
assert.throws(() => preparePeakPeriodProductionTransition({ ...integration, targetReferenceAt: time(2) }),
  error => error.code === 'RAVSCORE_INPUT_MIGRATION_SAME_REFERENCE_UNSUPPORTED');
const newForecast = structuredClone(previousRecord);
newForecast.hourly.find(row => row.time === time(4)).windSpeedMps = 10;
newForecast.hourly.find(row => row.time === time(4)).waveHeightM = 2;
const forecastOnly = preparePeakPeriodProductionTransition({ ...integration, correctedRecord: newForecast });
assert.equal(forecastOnly.plan.disposition, 'UNCHANGED_STATE');
assert.equal(forecastOnly.pipelineOptions.initialSelection, pipelineOptions.initialSelection);
assert.equal(forecastOnly.pipelineOptions.previousCandidateGContinuation, pipelineOptions.previousCandidateGContinuation);
assert.equal(forecastOnly.pipelineOptions.publicHourly.find(row => row.time === time(4)).windSpeedMps, 10);
assert.equal(forecastOnly.pipelineOptions.publicHourly.find(row => row.time === time(4)).waveHeightM, 2);
assert.throws(() => preparePeakPeriodProductionTransition({ ...integration, correctedRecord: newForecast,
  targetReferenceAt: time(2) }), error => error.code === 'RAVSCORE_INPUT_MIGRATION_SAME_REFERENCE_UNSUPPORTED',
  'Unchanged H0 state does not authorize a same-hour changed-weather publication');
const changedModel = structuredClone(pipelineOptions);
changedModel.initialSelection.state.modelBundleSha256 = hash('unproved-other-bundle');
assert.throws(() => preparePeakPeriodProductionTransition({ ...integration, currentPipelineOptions: changedModel }),
  /incompatible model metadata/);
assert.throws(() => preparePeakPeriodProductionTransition({ ...integration, currentPipelineOptions: {
  ...pipelineOptions, previousCandidateGContinuation: baseline.candidateGState,
} }), /exact integrated\/Candidate G continuation pair/);

// Water-level/T+3 removal uses the actual DMI-only production sanitizer, not
// a second permissive definition of scientific admission. Other fields remain
// byte-identical, even though the sanitizer also computes unrelated outputs.
function waterSanitized(record) {
  const rows = new Map(verifiedIntegratedPartHourly(record, null, `PART::${part.partId}`, part)
    .map(row => [row.time, row]));
  return { ...structuredClone(record), hourly: record.hourly.map(row => ({ ...structuredClone(row),
    ...Object.fromEntries(['waterLevelCm', 'waterLevelTrendCm3h', 'waterLevelProvenance']
      .map(key => [key, rows.get(row.time)[key]])),
  })) };
}
const waterOnlyRecord = waterSanitized(previousRecord);
const waterOnly = preparePeakPeriodProductionTransition({ ...integration, correctedRecord: waterOnlyRecord });
assert.equal(waterOnly.plan.disposition, 'UNCHANGED_STATE');
assert.equal(waterOnly.plan.reason, 'WATER_LEVEL_SANITIZED_STATE_UNCHANGED');
assert.equal(waterOnly.plan.stateNeutralDisposition, 'WATER_LEVEL_SANITIZED_STATE_UNCHANGED');
assert.equal(waterOnly.plan.publicProjectionRebuildRequired, true);
assert.equal(waterOnly.plan.previousRecordSha256, hash(JSON.stringify((function canonical(value) {
  return Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
})(previousRecord))), 'the original unsanitized evidence hash is preserved');
assert.equal(waterOnly.pipelineOptions.initialSelection, pipelineOptions.initialSelection);
assert.equal(waterOnly.pipelineOptions.previousCandidateGContinuation, pipelineOptions.previousCandidateGContinuation);
assert.equal(waterOnly.pipelineOptions.candidateGRollbackMeasuredColdStart, false);
const waterProduction = buildRavScoreProductionPartSeries({ part, zone, targetReferenceAt: time(3), ...waterOnly.pipelineOptions });
const oldWaterProduction = buildRavScoreProductionPartSeries({ part, zone, targetReferenceAt: time(3),
  ...pipelineOptions, recoverySources: [{ record: previousRecord }], publicHourly: previousRecord.hourly.filter(row => row.time >= time(3)) });
assert.deepEqual(waterProduction.scores.map(row => row.ravScoreModel.continuationState),
  oldWaterProduction.scores.map(row => row.ravScoreModel.continuationState));
assert.deepEqual(waterProduction.candidateGRollbackScores.map(row => row.candidateG.continuationState),
  oldWaterProduction.candidateGRollbackScores.map(row => row.candidateG.continuationState));
for (const mode of ['beach', 'waders']) assert.deepEqual(
  waterProduction.scores.map(row => row.ravScoreModel.modes[mode].score),
  oldWaterProduction.scores.map(row => row.ravScoreModel.modes[mode].score));
assert.equal(waterProduction.scores[0].weather.waterLevelCm, null);
assert.equal(oldWaterProduction.scores[0].weather.waterLevelCm, 10);
const reserveWaterBefore = structuredClone(previousRecord);
for (const row of reserveWaterBefore.hourly) {
  row.sources.waterLevel = { provider: 'copernicus', component: 'waterLevel' };
}
const reserveWaterAfter = waterSanitized(reserveWaterBefore);
for (const row of reserveWaterAfter.hourly) delete row.sources.waterLevel;
const reserveWaterRemoval = preparePeakPeriodProductionTransition({ ...integration,
  previousRecord: reserveWaterBefore, correctedRecord: reserveWaterAfter });
assert.equal(reserveWaterRemoval.plan.disposition, 'UNCHANGED_STATE');
assert.equal(reserveWaterRemoval.pipelineOptions.initialSelection, pipelineOptions.initialSelection);
assert.equal(reserveWaterRemoval.pipelineOptions.previousCandidateGContinuation, pipelineOptions.previousCandidateGContinuation);
const waveAndWater = preparePeakPeriodProductionTransition({ ...integration, correctedRecord: waterSanitized(correctedRecord) });
assert.equal(waveAndWater.plan.disposition, 'PRE_CHANGE_SUFFIX_REPLAY');
assert.equal(waveAndWater.pipelineOptions.initialSelection.state.time, time(0));
assert.equal(waveAndWater.plan.stateNeutralDisposition, 'WATER_LEVEL_SANITIZED_STATE_UNCHANGED');
const waveWaterProduction = buildRavScoreProductionPartSeries({ part, zone, targetReferenceAt: time(3), ...waveAndWater.pipelineOptions });
assert.deepEqual(waveWaterProduction.scores[0].ravScoreModel.continuationState, replay.targetStatePair.integratedState);
assert.deepEqual(waveWaterProduction.candidateGRollbackScores[0].candidateG.continuationState, replay.targetStatePair.candidateGState);
for (const change of [
  row => { row.windSpeedMps += 1; },
  row => { row.currentUMps += .01; },
  row => { row.currentProvenance.modelRun = time(-53); },
  row => { row.waterTemperatureC += 1; },
  row => { row.waterLevelCm = 11; },
  row => { row.waterLevelTrendCm3h = 1; },
  row => { row.waterLevelProvenance = { status: 'verified', provider: 'copernicus' }; },
  row => { row.sources.waterLevel = { provider: 'dmi', status: 'verified' }; },
]) {
  const badWater = structuredClone(waterOnlyRecord);
  change(badWater.hourly.find(row => row.time === time(1)));
  assert.throws(() => preparePeakPeriodProductionTransition({ ...integration, correctedRecord: badWater }),
    error => error.code === 'RAVSCORE_INPUT_MIGRATION_OTHER_CONSUMED_COMPONENT_CHANGED');
}
assert.throws(() => preparePeakPeriodProductionTransition({ ...integration,
  correctedRecord: waterOnlyRecord, targetReferenceAt: time(2) }),
error => error.code === 'RAVSCORE_INPUT_MIGRATION_SAME_REFERENCE_UNSUPPORTED');

function waterSource(at) {
  const result = source('waterLevel', at);
  for (const key of ['vectorSemanticsVersion', 'vectorSelection', 'verticalLayer', 'verticalLayerRankM']) delete result[key];
  return { ...result, componentKind: 'marine-water-level-scalar', fieldSet: ['sea-mean-deviation'],
    spatialSelection: 'nearest-valid-grid-cell-no-spatial-interpolation' };
}
const validWaterRaw = structuredClone(previousRecord);
for (const row of validWaterRaw.hourly) row.sources.waterLevel = waterSource(row.time);
const validWaterBefore = waterSanitized(validWaterRaw);
assert.equal(validWaterBefore.hourly.find(row => row.time === time(1)).waterLevelProvenance.status, 'verified');
assert.equal(validWaterBefore.hourly.find(row => row.time === time(1)).waterLevelCm, 10);
const removedGoodWater = structuredClone(validWaterBefore);
const removedGoodRow = removedGoodWater.hourly.find(row => row.time === time(1));
removedGoodRow.waterLevelCm = null;
removedGoodRow.waterLevelTrendCm3h = null;
removedGoodRow.waterLevelProvenance = { status: 'unverified', reason: 'no-exact-dmi-water-level-source' };
delete removedGoodRow.sources.waterLevel;
assert.throws(() => preparePeakPeriodProductionTransition({ ...integration,
  previousRecord: validWaterBefore, correctedRecord: removedGoodWater }),
error => error.code === 'RAVSCORE_INPUT_MIGRATION_OTHER_CONSUMED_COMPONENT_CHANGED',
'deleting a valid DMI source must not authorize deleting its valid value');
const differentSeriesRaw = structuredClone(validWaterRaw);
const laterSource = differentSeriesRaw.hourly.find(row => row.time === time(4)).sources.waterLevel;
laterSource.modelRun = time(-53);
laterSource.leadTimeHours -= 1;
laterSource.nativeSteps[0].leadTimeHours -= 1;
const differentSeriesAfter = waterSanitized(differentSeriesRaw);
const differentSeriesBefore = structuredClone(differentSeriesAfter);
differentSeriesBefore.hourly.find(row => row.time === time(1)).waterLevelTrendCm3h = 0;
const trendOnly = preparePeakPeriodProductionTransition({ ...integration,
  previousRecord: differentSeriesBefore, correctedRecord: differentSeriesAfter });
assert.equal(differentSeriesAfter.hourly.find(row => row.time === time(1)).waterLevelCm, 10);
assert.equal(differentSeriesAfter.hourly.find(row => row.time === time(1)).waterLevelTrendCm3h, null);
assert.equal(trendOnly.plan.disposition, 'UNCHANGED_STATE');
assert.equal(trendOnly.plan.stateNeutralDisposition, 'WATER_LEVEL_SANITIZED_STATE_UNCHANGED');
assert.equal(trendOnly.pipelineOptions.initialSelection, pipelineOptions.initialSelection);
assert.equal(trendOnly.pipelineOptions.previousCandidateGContinuation, pipelineOptions.previousCandidateGContinuation);
const revisedFiniteTrend = structuredClone(validWaterBefore);
revisedFiniteTrend.hourly.find(row => row.time === time(1)).waterLevelTrendCm3h = 1;
assert.throws(() => preparePeakPeriodProductionTransition({ ...integration,
  previousRecord: validWaterBefore, correctedRecord: revisedFiniteTrend }),
error => error.code === 'RAVSCORE_INPUT_MIGRATION_OTHER_CONSUMED_COMPONENT_CHANGED',
'finite-to-finite public/legacy DMI trend recomputation is not this removal-only migration contract');

// Equal scores still require fresh public water/best-time projection.
const candidates = [
  { hour: { time: time(3), waterLevelCm: 10, waterLevelTrendCm3h: 0 }, result: { score: 50, scoreQuality: 'FULL_HISTORY' } },
  { hour: { time: time(4), waterLevelCm: 5, waterLevelTrendCm3h: 0 }, result: { score: 50, scoreQuality: 'FULL_HISTORY' } },
];
assert.equal([...candidates].sort((a, b) => compareRavScoreBestTimeCandidates(a, b, 'waders'))[0].hour.time, time(4));
const sanitizedCandidates = candidates.map(candidate => ({ ...candidate,
  hour: { ...candidate.hour, waterLevelCm: null, waterLevelTrendCm3h: null } }));
assert.equal(sanitizedCandidates.sort((a, b) => compareRavScoreBestTimeCandidates(a, b, 'waders'))[0].hour.time, time(3));
assert.equal(JSON.stringify(baseline), baselineBytes);
assert.equal(JSON.stringify(previousRecord), previousBytes);
console.log('Peak-period migration: paired replay/cold replay, exact state-neutral DMI water sanitization, public rebuild guard and rejected unrelated changes passed.');
