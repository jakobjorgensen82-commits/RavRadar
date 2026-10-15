import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { mergeHourlyPreferDmi, bulkZoneToForecastRecord,
  buildPartDmiForecastWithProtectedRetention, buildPrivateDmiRecoveryRecord }
  from './lib/private-dmi-recovery-record.mjs';
import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';
import {
  createDmiForecastRecord, DMI_FORECAST_HOURS, normalizeForecastHourly,
  inspectDmiForecastGridSampling,
} from './lib/dmi-forecast-store.mjs';
import {
  dmiExpectedIdentityForPart, assertDmiPartHourlyGridSamplingApplicable, verifiedDmiForecastComponentSource,
  verifiedDmiNativeComponentSource, verifiedBulkCurrent, verifiedIntegratedPartHourly,
} from './lib/ravscore-production-adapters.mjs';
import { buildDmiMarineComponentwiseHourly, recoverDmiMarineRunSeamHours }
  from './lib/dmi-marine-run-seam-recovery.mjs';
import { mergeLiveCurrentPilotIntoRecord } from './lib/live-current-pilot.mjs';
import { mergeProtectedLiveCurrentPilotIntoRecord,
  mergeActiveNativeLiveCurrentPilotIntoRecord } from './lib/protected-live-current-assembly.mjs';
import { FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS,
  buildFeggesundWaveProxy } from './lib/feggesund-wave-proxy.mjs';
import { preferQualifiedDmiComponentSource } from './lib/weather-component-selection.mjs';
import { repairWaterLevelContinuity } from './lib/water-level-continuity.mjs';
import { dmiWaveDirectionMatchesSource } from './lib/dmi-wave-tuple-proof.mjs';
import { buildNewestValidRavScoreRecoverySources } from './lib/ravscore-recovery-source-priority.mjs';
import { buildRavScoreRecoveryReplay, ravScoreRecoverySourceStartAt, RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS } from './lib/ravscore-recovery-replay.mjs';
import { originalContextForProtectedDmiCurrent, verifiedProtectedDmiPartHourly }
  from './lib/protected-dmi-current-context.mjs';

// Import the producer's actual shared selection boundary without acquisition.
// Neither provenance admission nor the downstream sanitizer is stubbed.
const producer = fs.readFileSync('scripts/update-weather.mjs', 'utf8');

const HOUR = 3_600_000;
const epoch = Date.parse('2026-09-01T00:00:00.000Z');
const time = offset => new Date(epoch + offset * HOUR).toISOString();
const part = { partId: 'SYNTHETIC-TUPLE-PART', parentZoneId: 'SYNTHETIC-TUPLE-ZONE',
  waterPoint: [8, 55], onshoreDirectionDeg: 90 };
const identity = dmiExpectedIdentityForPart(part);
const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
const contracts = {
  wind: { collection: 'harmonie_dini_sf', collectionFamily: 'wind',
    componentKind: 'atmospheric-wind-vector', fieldSet: ['wind-u-10m', 'wind-v-10m'],
    spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
    vectorSemanticsVersion: 2, vectorSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
    vectorReference: 'earth-relative-east-north', vectorTransform: 'identity-earth-relative' },
  wave: { collection: 'wam_dw', collectionFamily: 'wave',
    componentKind: 'wave-mobilisation-tuple', fieldSet: ['significant-wave-height', 'dominant-wave-period'],
    spatialSelection: 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
    wavePeriodSemantics: 'peak',
    wavePeriodField: { shortName: 'pp1d', paramId: 231, indicatorOfParameter: null } },
  current: { collection: 'dkss_idw', collectionFamily: 'marine',
    componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'],
    spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
    vectorSemanticsVersion: 3, vectorSelection, verticalLayer: 'depth:1', verticalLayerRankM: 1 },
  waterLevel: { collection: 'dkss_idw', collectionFamily: 'marine',
    componentKind: 'marine-water-level-scalar', fieldSet: ['sea-mean-deviation'],
    spatialSelection: 'nearest-valid-grid-cell-no-spatial-interpolation' },
  waterTemperature: { collection: 'dkss_idw', collectionFamily: 'marine',
    componentKind: 'marine-water-temperature-scalar', fieldSet: ['water-temperature'],
    spatialSelection: 'nearest-valid-grid-cell-no-spatial-interpolation',
    verticalLayer: 'surface:0', verticalLayerRankM: 0 },
};
const components = Object.keys(contracts);
function source(component, hour, run = -12, revision = -11) {
  const at = time(hour);
  const optionalFieldSet = component === 'wave' ? ['mean-wave-dir'] : [];
  const step = { itemId: `synthetic-${component}-${hour}`, assetIdentitySha256: 'a'.repeat(64),
    nativeValidTime: at, leadTimeHours: hour - run, acquiredAt: time(-1),
    itemUpdatedAt: time(revision), optionalFieldSet,
    ...(component === 'wave' ? { wavePeriodSemantics: 'peak',
      wavePeriodField: { ...contracts.wave.wavePeriodField } } : {}) };
  return { provider: 'dmi', fallback: false, ...contracts[component], ...identity,
    component, modelRun: time(run), ...step, samplingPoint: [...part.waterPoint],
    gridPoint: [...part.waterPoint], gridDefinitionSha256: 'b'.repeat(64),
    distanceKm: 0, spatialSemanticsVersion: 1,
    temporalResolution: 'native', nativeValidTimes: [at], nativeSteps: [step] };
}
function row(hour = 0, run = -12, revision = -11, delta = 0) {
  return { time: time(hour), windSpeedMps: 5 + delta, windDirectionDeg: 180 + delta,
    waveHeightM: 1 + delta, wavePeriodS: 7 + delta, waveDirectionDeg: 270 + delta,
    currentUMps: 0.1 + delta / 10, currentVMps: 0.2 + delta / 10,
    waterLevelCm: 12 + delta, waterTemperatureC: 14 + delta,
    sources: Object.fromEntries(components.map(component =>
      [component, source(component, hour, run, revision)])) };
}
const bulk = { currentVectorSemanticsVersion: 3, currentVectorSelection: vectorSelection,
  currentMaxDistanceKm: 5, zones: { [identity.entityId]: { ...identity } } };
const options = { generatedAt: time(0), startAt: time(0),
  expectedIdentity: identity, protectPreviousDmi: true };
const adapt = hourly => verifiedIntegratedPartHourly({ point: part.waterPoint, hourly },
  bulk, identity.entityId, part);
const merge = (candidate, previous, overrides = {}) => mergeHourlyPreferDmi(
  candidate ? [candidate] : [], previous ? [previous] : [], { ...options, ...overrides });
const fields = {
  wind: ['windSpeedMps', 'windDirectionDeg'],
  wave: ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg'],
  current: ['currentUMps', 'currentVMps'],
  waterLevel: ['waterLevelCm'], waterTemperature: ['waterTemperatureC'],
};
const values = (value, component) => fields[component].map(key => value[key]);
const original = row();
for (const component of components) {
  assert.ok(verifiedDmiForecastComponentSource(original.sources[component], original.time,
    component, identity), `the ${component} fixture must pass canonical source admission`);
  assert.deepEqual(values(adapt([original])[0], component), values(original, component),
    `the ${component} fixture must survive the real production sanitizer`);
}

// Previously the numeric direction passed tuple selection while its official
// source attested height/period only. The real adapter then removed direction,
// after the valid old complete tuple had already been lost.
const missingDirectionProof = row(0, -6, -5, 1);
missingDirectionProof.sources.wave.optionalFieldSet = [];
missingDirectionProof.sources.wave.nativeSteps[0].optionalFieldSet = [];
assert.ok(verifiedDmiForecastComponentSource(missingDirectionProof.sources.wave, time(0),
  'wave', identity), 'height/period-only source proof is independently valid, not corrupt');
assert.equal(adapt([missingDirectionProof])[0].waveDirectionDeg, null,
  'the real adapter strips the unbound direction, demonstrating the downstream hazard');
const protectedWave = adapt(merge(missingDirectionProof, original))[0];
assert.deepEqual(values(protectedWave, 'wave'), values(original, 'wave'),
  'an unbound numeric direction must not displace the complete previous wave tuple');
assert.equal(protectedWave.sources.wave.modelRun, original.sources.wave.modelRun);

// Official newer runs and comparable official revisions must continue to win.
for (const candidate of [row(0, -6, -5, 1), row(0, -12, -10, 1)]) {
  const accepted = adapt(merge(candidate, original))[0];
  for (const component of components) {
    assert.deepEqual(values(accepted, component), values(candidate, component),
      `a fully admitted newer run/revision replaces ${component}`);
    assert.deepEqual(accepted.sources[component], candidate.sources[component]);
  }
}

for (const component of components) {
  const candidate = row(0, -6, -5, 1);
  candidate.sources[component].parentZoneId = 'SYNTHETIC-WRONG-PARENT';
  const accepted = adapt(merge(candidate, original))[0];
  assert.deepEqual(values(accepted, component), values(original, component),
    `a wrong-parent ${component} must not displace valid old data`);
  for (const unaffected of components.filter(value => value !== component)) {
    assert.deepEqual(values(accepted, unaffected), values(candidate, unaffected),
      `rejecting ${component} must not lock ${unaffected} to the old model run`);
  }
}
const invalidValues = {
  wind: { windDirectionDeg: null }, wave: { wavePeriodS: 0 },
  current: { currentVMps: null }, waterLevel: { waterLevelCm: '15' },
  waterTemperature: { waterTemperatureC: false },
};
for (const component of components) {
  const candidate = { ...row(0, -6, -5, 1), ...invalidValues[component] };
  assert.deepEqual(values(adapt(merge(candidate, original))[0], component),
    values(original, component), `an incomplete/malformed ${component} tuple retains the old tuple`);
}

const changedGrid = row(0, -12, -10, 1);
for (const component of components) changedGrid.sources[component].gridDefinitionSha256 = 'c'.repeat(64);
let retained = original;
for (let generation = 0; generation < 10; generation += 1) {
  retained = adapt(merge(generation % 2 ? null : changedGrid, retained))[0];
  for (const component of components) assert.deepEqual(values(retained, component),
    values(original, component), `generation ${generation + 1} preserves ${component} across an unproved grid revision`);
}
assert.deepEqual(original, row(), 'repeated selection must not mutate the protected donor');
const repairedDerivedCurrent = row(0, -6, -5, 1);
repairedDerivedCurrent.currentSpeedMps = 999;
repairedDerivedCurrent.currentDirectionDeg = 999;
const repaired = adapt(merge(repairedDerivedCurrent, original))[0];
assert.equal(repaired.currentSpeedMps,
  Number(Math.hypot(repairedDerivedCurrent.currentUMps, repairedDerivedCurrent.currentVMps).toFixed(2)),
  'old derived speed does not corrupt a newly admitted atomic raw U/V pair');

// Protected private history must use replay start, not production start. The
// replay horizon is bounded at 72 h; 121 rows cover even that complete catch-up.
for (const state of [null, { time: time(-72) }]) {
  const startAt = ravScoreRecoverySourceStartAt(state, time(0));
  const startHour = (Date.parse(startAt) - epoch) / HOUR;
  const hours = Array.from({ length: DMI_FORECAST_HOURS }, (_, index) =>
    row(startHour + index, -120, -119));
  const merged = mergeHourlyPreferDmi([], hours, { ...options, startAt });
  const record = createDmiForecastRecord({ zoneId: identity.entityId,
    point: part.waterPoint, generatedAt: time(0), hourly: merged });
  assert.equal(record.validFrom, startAt, 'record construction preserves the earlier replay start');
  assert.equal(record.hourly.length, 121);
  const historical = adapt(record.hourly).filter(hour => Date.parse(hour.time) < epoch);
  assert.equal(historical.length, -startHour, 'all required previous hours survive merge and sanitizer');
  for (const hour of historical) for (const component of components) {
    assert.ok(values(hour, component).every(value => typeof value === 'number'),
      `${component} remains admitted throughout cold/72h recovery, not only at production target`);
  }
  assert.ok(record.hourly.some(hour => hour.time === time(0)),
    'the 121-hour protected source includes the production boundary');
}

// A real historical context may prove the persisted U/V when the primary
// generation has no PART metadata. It must not become a synthetic capability,
// and recovering current must not re-project the other four families.
const noPartContext = { ...bulk, zones: {} };
const oldContext = structuredClone(bulk);
const contextRows = [row(0), row(3)];
contextRows[1].waterLevelCm += 6;
const contextRecord = { point: part.waterPoint, hourly: contextRows };
const originalContextRecord = structuredClone(contextRecord);
const originalHistoricalContext = structuredClone(oldContext);
assert.equal(originalContextForProtectedDmiCurrent(contextRows[0],
  [noPartContext, oldContext], identity.entityId, part), oldContext,
'the selector returns the original authentic context by reference, not a manufactured header');
const ordinaryProjection = verifiedIntegratedPartHourly(
  contextRecord, noPartContext, identity.entityId, part);
assert.equal(ordinaryProjection[0].currentUMps, null,
  'ordinary current admission correctly refuses an absent original PART context');
assert.equal(ordinaryProjection[0].waterLevelTrendCm3h, 6,
  'the real adapter derives the complete T/T+3 scalar trend');
const contextProjection = verifiedProtectedDmiPartHourly(
  contextRecord, [noPartContext, oldContext], identity.entityId, part);
assert.equal(contextProjection.length, 2);
const currentFields = ['currentUMps', 'currentVMps', 'currentSpeedMps',
  'currentDirectionDeg', 'currentCoastNormalSpeedMps', 'currentProvenance'];
const withoutCurrentProjection = value => Object.fromEntries(Object.entries(value)
  .filter(([key]) => !currentFields.includes(key)));
for (let index = 0; index < contextProjection.length; index += 1) {
  assert.deepEqual(values(contextProjection[index], 'current'), values(contextRows[index], 'current'));
  assert.equal(contextProjection[index].currentProvenance.status, 'verified');
  assert.deepEqual(withoutCurrentProjection(contextProjection[index]),
    withoutCurrentProjection(ordinaryProjection[index]),
    'historical-context current recovery changes no scalar, wave, wind, reserve, source or hold field');
}
assert.deepEqual(verifiedProtectedDmiPartHourly(contextRecord,
  [bulk, oldContext], identity.entityId, part), adapt(contextRows),
'an already admitted primary current is never replaced by historical context');
assert.deepEqual(contextRecord, originalContextRecord, 'context selection does not mutate original rows');
assert.deepEqual(oldContext, originalHistoricalContext, 'original context metadata is never modified');
for (const contexts of [[], [null], [noPartContext], [null, { ...oldContext,
  currentVectorSemanticsVersion: 2 }], [null, { ...oldContext, zones: {
  [identity.entityId]: { ...identity, samplingPoint: [9, 55] },
} }]]) {
  assert.equal(originalContextForProtectedDmiCurrent(contextRows[0], contexts,
    identity.entityId, part), null, 'missing or wrong original context remains unverified');
  assert.ok(verifiedProtectedDmiPartHourly(contextRecord, contexts,
    identity.entityId, part).every(hour => hour.currentUMps === null),
  'persisted values cannot create a current capability without an admitted original context');
}
for (const change of [
  value => { value.sources.current.parentZoneId = 'SYNTHETIC-WRONG-PARENT'; },
  value => { value.sources.current.samplingPoint = [9, 55]; },
  value => { value.sources.current.nativeValidTimes = [time(1)]; },
  value => { value.currentVMps = null; },
]) {
  const malformed = row();
  change(malformed);
  assert.equal(originalContextForProtectedDmiCurrent(malformed, [oldContext],
    identity.entityId, part), null, 'wrong identity/time or partial U/V is never recovered');
  assert.equal(verifiedProtectedDmiPartHourly({ hourly: [malformed] },
    [null, oldContext], identity.entityId, part)[0].currentUMps, null);
}
const invalidHold = { ...row(), currentStateOnlyHold: { invalid: true } };
assert.throws(() => verifiedProtectedDmiPartHourly({ hourly: [invalidHold] },
  [null, oldContext], identity.entityId, part), /invalid state-only hold/,
'the wrapper cannot suppress a malformed state-only hold error');

// Exercise the actual public PART producer call chain, not only the helper.
// Its native-to-hourly conversion, protected donor assembly, pilot merge and
// final sanitizer are real production code. No source/context verifier is
// replaced. Geometry uses the synthetic fixture's ordinary dataPoint property.
const extract = (first, next) => {
  const from = producer.indexOf(first);
  const until = producer.indexOf(next, from);
  assert.ok(from >= 0 && until > from, `production boundary ${first} must exist`);
  return producer.slice(from, until);
};
const scorerStart = producer.indexOf('function scoreCoastalPartsRuntime(');
const publicStart = producer.indexOf('      const dmiRecord = buildPartDmiForecastWithProtectedRetention(', scorerStart);
const publicEnd = producer.indexOf('      const routedWater = waterSourceRoutingContext', publicStart);
assert.ok(publicStart > scorerStart && publicEnd > publicStart);
const replayStart = producer.indexOf('      let deployedRecoverySource = null;', scorerStart);
const replayEnd = producer.indexOf('      let productionSeries;', replayStart);
assert.ok(replayStart > scorerStart && replayEnd > replayStart);
const runPublicPartProjection = Function(
  'inspectDmiForecastGridSampling', 'createProtectedDmiNativeCurrentInspector',
  'dmiExpectedIdentityForPart',
  'createDmiForecastRecord', 'DMI_FORECAST_HOURS', 'verifiedDmiNativeComponentSource',
  'verifiedDmiForecastComponentSource', 'verifiedBulkCurrent',
  'buildDmiMarineComponentwiseHourly', 'recoverDmiMarineRunSeamHours',
  'mergeHourlyPreferDmi', 'mergeLiveCurrentPilotIntoRecord',
  'bulkZoneToForecastRecord', 'buildPartDmiForecastWithProtectedRetention', 'buildPrivateDmiRecoveryRecord',
  'mergeProtectedLiveCurrentPilotIntoRecord', 'mergeActiveNativeLiveCurrentPilotIntoRecord', 'verifiedIntegratedPartHourly',
  'originalContextForProtectedDmiCurrent', 'verifiedProtectedDmiPartHourly',
  'buildNewestValidRavScoreRecoverySources',
  'RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS',
  'FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID', 'FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS',
  'buildFeggesundWaveProxy', 'fixturePart', 'fixtureIdentity', 'productionAt',
  `const CURRENT_VECTOR_SEMANTICS_VERSION = 3;
   const ravScoreNumber = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
   const num = ravScoreNumber;
   ${extract('function applyFeggesundOperationalWaveProxy(', 'function missingFeggesundWaveHour(')}
   return function ({active, deployed = null, historical = null, persisted = [], pointActivated = false, replay = false, pilot = null, partWithoutZoneIdentity = false}) {
     const [zoneId, zoneParts] = Object.entries({[fixturePart.parentZoneId]: [fixturePart]})[0];
     const part = partWithoutZoneIdentity
       ? Object.fromEntries(Object.entries(zoneParts[0]).filter(([key]) =>
         !['zoneId', 'parentZoneId', 'sourceZoneId'].includes(key))) : zoneParts[0];
     const bulkId = fixtureIdentity.entityId;
     const feature = {type: 'Feature', geometry: {type: 'Point', coordinates: part.waterPoint},
       properties: {id: bulkId, coastType: 'east', dataPoint: part.waterPoint}};
     const bulkCache = active, deployedBulkCache = deployed, historicalDmiBulkCache = historical;
     const generatedAt = productionAt, partForecastStartAt = productionAt;
     const partDmiIdentity = fixtureIdentity;
     const initialSelection = {source: pointActivated ? 'POINT_ACTIVATION' : 'PRIVATE_RUNTIME'};
     const persistedDmiPartRows = new Map([[part.partId, {hourly: persisted}]]);
     const selectedDmiPartRecords = new Map();
     const feggesundSourcesByTime = new Map();
     const liveCurrentPilot = pilot;
     const componentInputs = {};
     if (replay) {
       const replayStartAt = productionAt;
       const protectedSameRunDmiRetentions = {current: {SAME_VALUES: 0, DIFFERENT_VALUES: 0},
         wave: {SAME_VALUES: 0, DIFFERENT_VALUES: 0}};
       ${producer.slice(replayStart, replayEnd)}
       return {deployedRecoverySource, progressiveRecoverySource, recoverySources};
     }
     ${producer.slice(publicStart, publicEnd)}
     return {dmiRecord, record, verifiedHourly};
   };`,
)(inspectDmiForecastGridSampling, createProtectedDmiNativeCurrentInspector,
  dmiExpectedIdentityForPart, createDmiForecastRecord, DMI_FORECAST_HOURS, verifiedDmiNativeComponentSource,
  verifiedDmiForecastComponentSource, verifiedBulkCurrent,
  buildDmiMarineComponentwiseHourly, recoverDmiMarineRunSeamHours,
  mergeHourlyPreferDmi, mergeLiveCurrentPilotIntoRecord,
  bulkZoneToForecastRecord, buildPartDmiForecastWithProtectedRetention, buildPrivateDmiRecoveryRecord,
  mergeProtectedLiveCurrentPilotIntoRecord, mergeActiveNativeLiveCurrentPilotIntoRecord, verifiedIntegratedPartHourly,
  originalContextForProtectedDmiCurrent, verifiedProtectedDmiPartHourly,
  buildNewestValidRavScoreRecoverySources,
  RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS,
  FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS,
  buildFeggesundWaveProxy, part, identity, time(0));
const asNative = rows => {
  const sourcesFor = value => Object.fromEntries(components.map(component => {
    const proof = { ...value.sources[component] };
    for (const key of ['nativeValidTimes', 'nativeSteps', 'temporalResolution']) delete proof[key];
    return [component, proof];
  }));
  return { ...bulk, generatedAt: time(0), zones: {
    [identity.entityId]: { ...identity,
      hourly: Object.fromEntries(rows.map(value => [value.time, {
        time: value.time,
        'wind-speed-10m': value.windSpeedMps, 'wind-dir-10m': value.windDirectionDeg,
        'significant-wave-height': value.waveHeightM, 'dominant-wave-period': value.wavePeriodS,
        'mean-wave-dir': value.waveDirectionDeg,
        'current-u': value.currentUMps, 'current-v': value.currentVMps,
        'sea-mean-deviation': value.waterLevelCm / 100, 'water-temperature': value.waterTemperatureC,
        sources: sourcesFor(value),
      }])),
    },
  } };
};
const nativeHistorical = asNative([row(0), row(3)]);
for (const input of [
  { active: noPartContext, historical: nativeHistorical },
  { active: null, historical: nativeHistorical },
  { active: noPartContext, deployed: nativeHistorical },
]) {
  const result = runPublicPartProjection(input);
  assert.deepEqual(values(result.dmiRecord.hourly[0], 'current'), values(original, 'current'),
    'the actual producer reconstructs valid current from the original protected native donor');
  assert.ok(verifiedDmiForecastComponentSource(result.dmiRecord.hourly[0].sources.current,
    time(0), 'current', identity), 'the actual reconstructed current has full canonical source proof');
  assert.equal(verifiedIntegratedPartHourly(result.record, input.active,
    identity.entityId, part)[0].currentUMps, null,
  'an absent active PART header remains unverified on the existing PUBLIC path');
  assert.equal(result.verifiedHourly[0].currentUMps, null,
    'replay-only retention must not introduce alternate-context PUBLIC admission');
  assert.deepEqual(result.verifiedHourly, verifiedIntegratedPartHourly(result.record, input.active,
    identity.entityId, part), 'PUBLIC keeps the existing active-only sanitizer unchanged');
}
const pointActivationProjection = runPublicPartProjection({ active: noPartContext,
  deployed: nativeHistorical, historical: nativeHistorical, persisted: [original], pointActivated: true });
assert.equal(pointActivationProjection.verifiedHourly[0].currentUMps, null,
  'POINT_ACTIVATION must not import original-point protected donors');
const newerActive = row(0, -6, -5, 1);
const activeWins = runPublicPartProjection({ active: asNative([newerActive]),
  deployed: nativeHistorical, historical: nativeHistorical, persisted: [original] });
assert.deepEqual(values(activeWins.verifiedHourly[0], 'current'),
  values(newerActive, 'current').map(value => Number(value.toFixed(5))),
  'a genuinely newer validated active run still replaces old protected current');
assert.equal(activeWins.verifiedHourly[0].currentProvenance.modelRun, time(-6));
// Use the actual deployed/progressive assembly and priority call, not a label
// masquerading as the previous selection. The persisted PART tuple differs
// from a later reconstruction of its own old raw model run.
const sameRunNativeAlternative = asNative([changedGrid]);
const replayInputs = {active: sameRunNativeAlternative,
  deployed: sameRunNativeAlternative, historical: nativeHistorical, persisted: [original]};
const savedInputs = structuredClone(replayInputs);
const publicDefault = runPublicPartProjection(replayInputs);
assert.deepEqual(values(publicDefault.dmiRecord.hourly[0], 'current'),
  values(changedGrid, 'current').map(value => Number(value.toFixed(5))),
  'the default builder retains its existing native-first selection, not new replay retention');
assert.deepEqual(publicDefault.verifiedHourly, verifiedIntegratedPartHourly(
  publicDefault.record, replayInputs.active, identity.entityId, part),
  'the public path still uses only its original active-context projection');
const replayResult = runPublicPartProjection({...replayInputs, replay: true});
for (const component of components) {
  assert.deepEqual(values(replayResult.deployedRecoverySource.record.hourly[0], component),
    values(original, component), 'replay uses the actual saved ' + component + ' tuple');
  assert.deepEqual(replayResult.deployedRecoverySource.record.hourly[0].sources[component],
    original.sources[component], 'replay does not reconstruct or borrow saved source metadata');
}
const strictReplay = sourceRecords => buildRavScoreRecoveryReplay({
  part, initialState: null, targetReferenceAt: time(1), sourceRecords,
  publicHourly: adapt([row(1)]),
});
for (const sourceRecord of [replayResult.deployedRecoverySource,
  replayResult.progressiveRecoverySource]) strictReplay([sourceRecord]);
assert.throws(() => strictReplay([replayResult.deployedRecoverySource,
  replayResult.progressiveRecoverySource]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
  'both independent valid alternatives still conflict under the unchanged replay validator');
const recovered = strictReplay(replayResult.recoverySources);
assert.equal(recovered.replayedHourCount, 1,
  'the real authenticated previous-source priority resolves the strict historical overlap');
assert.deepEqual(replayInputs, savedInputs, 'actual producer assembly does not mutate any donor');
assert.equal(runPublicPartProjection({...replayInputs, replay: true, pointActivated: true})
  .deployedRecoverySource, null, 'new sampling-point activation never adopts old PART ownership');
const historicalReplay = runPublicPartProjection({active: noPartContext,
  deployed: noPartContext, historical: nativeHistorical, persisted: [original], replay: true});
assert.deepEqual(values(historicalReplay.deployedRecoverySource.record.hourly[0], 'current'),
  values(original, 'current'), 'replay alone can validate the saved tuple against its original context');
const withoutOriginalContext = runPublicPartProjection({active: noPartContext,
  deployed: noPartContext, persisted: [original], replay: true});
assert.equal(withoutOriginalContext.deployedRecoverySource.record.hourly[0].currentUMps, null,
  'saved values never manufacture their missing original current context');
// The existing normal native-to-hourly and PUBLIC caller must not resurrect
// a closer legacy column after a qualified reinterpretation of the SAME bytes.
// Synthetic native originals are supplied in full; no sampler/inspector is mocked.
const decoderHash = value => crypto.createHash('sha256').update(value).digest('hex');
const decoderOldRows = [row(0), row(3)];
for (const value of decoderOldRows) {
  const bytes = Buffer.from(`synthetic-dkss-original-${value.time}`);
  Object.assign(value.sources.current, { contentLengthBytes: bytes.length,
    assetSizeBytes: bytes.length, contentSha256: decoderHash(bytes),
    assetIdentitySha256: decoderHash(`synthetic-dkss-asset-${value.time}`) });
}
const decoderFreshRows = structuredClone(decoderOldRows);
for (const value of decoderFreshRows) {
  value.currentUMps += 0.3;
  value.currentVMps += 0.1;
  const source = value.sources.current;
  source.gridPoint = [part.waterPoint[0] + 0.005, part.waterPoint[1]];
  source.distanceKm = 0.319;
  source.acquiredAt = time(0);
  source.nativeSteps[0].acquiredAt = source.acquiredAt;
  source.nativeSteps[0].assetIdentitySha256 = source.assetIdentitySha256;
  source.nativeGridSampling = { contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
    gridIndexIdentitySha256: decoderHash('synthetic-dkss-message-grid-index-order'),
    coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
    gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
    fieldSet: [...source.fieldSet], optionalFieldSet: [...source.optionalFieldSet] };
  source.nativeSteps[0].nativeGridSampling = structuredClone(source.nativeGridSampling);
  source.nativeSteps[0].gridPoint = [...source.gridPoint];
  source.nativeSteps[0].distanceKm = source.distanceKm;
}
const decoderOldBulk = asNative(decoderOldRows), decoderFreshBulk = asNative(decoderFreshRows);
// asNative removes hourly lineage exactly as before; the original capture
// fields remain on each independent native endpoint, not copied from H0.
const decoderInputs = { active: decoderFreshBulk, deployed: decoderOldBulk,
  historical: decoderOldBulk, persisted: runPublicPartProjection({active: decoderOldBulk}).dmiRecord.hourly };
const decoderBefore = structuredClone(decoderInputs);
const decoderFreshOnly = runPublicPartProjection({ active: decoderFreshBulk });
const decoderResult = runPublicPartProjection(decoderInputs);
const assertDecoderNewUse = result => assertDmiPartHourlyGridSamplingApplicable(
  result.verifiedHourly.filter(value => value.time >= time(0) && value.time < time(118)),
  identity.entityId, part);
assertDecoderNewUse(decoderResult);
for (const offset of [0, 1, 3]) {
  const actual = decoderResult.verifiedHourly.find(value => value.time === time(offset));
  const fresh = decoderFreshOnly.verifiedHourly.find(value => value.time === time(offset));
  assert.deepEqual(values(actual, 'current'), values(fresh, 'current'),
    'the real PUBLIC chain selects the farther corrected interpretation of the same whole originals');
  assert.equal(inspectDmiForecastGridSampling(actual.sources.current,
    'current', actual.time, identity).status, 'coherent');
}
assert.equal(decoderResult.dmiRecord.hourly.length, 121, 'the private T+3 horizon is not pruned');
const decoderUnknown = error => error.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED'
  && error.samplingStatus === 'unknown';
for (const mutate of [
  input => { input.active.zones[identity.entityId].hourly[time(3)].sources.current.contentSha256 = decoderHash('different-original-bytes'); },
  input => { input.active.zones[identity.entityId].hourly[time(3)].sources.current.itemId += '-different'; },
  input => { input.active.zones[identity.entityId].hourly[time(3)].sources.current.itemUpdatedAt = time(-11).replace(':00:00.000Z', ':01:00.000Z'); },
  input => { input.deployed = null; input.historical = null; },
]) {
  const changed = structuredClone(decoderInputs);
  mutate(changed);
  assert.throws(() => assertDecoderNewUse(runPublicPartProjection(changed)), decoderUnknown,
    'different bytes/endpoints/precise revisions or missing native originals cannot borrow a transition');
}
const decoderQualifiedOld = structuredClone(decoderInputs);
for (const donor of [decoderQualifiedOld.deployed, decoderQualifiedOld.historical]) {
  for (const native of Object.values(donor.zones[identity.entityId].hourly)) {
    const source = native.sources.current;
    source.nativeGridSampling = { ...decoderFreshRows[0].sources.current.nativeGridSampling,
      elementIndex: 0, gridPoint: [...source.gridPoint] };
  }
}
decoderQualifiedOld.persisted = runPublicPartProjection({active: decoderQualifiedOld.deployed}).dmiRecord.hourly;
const decoderKeepQualified = runPublicPartProjection(decoderQualifiedOld);
assertDecoderNewUse(decoderKeepQualified);
assert.deepEqual(values(decoderKeepQualified.verifiedHourly[0], 'current'),
  values(runPublicPartProjection({active: decoderOldBulk}).verifiedHourly[0], 'current'),
  'an independently qualified closer original keeps ordinary same-run priority');
const decoderMapOwnedPart = runPublicPartProjection({...decoderInputs, partWithoutZoneIdentity: true});
assertDecoderNewUse(decoderMapOwnedPart);
assert.deepEqual(values(decoderMapOwnedPart.verifiedHourly[0], 'current'),
  values(decoderFreshOnly.verifiedHourly[0], 'current'),
  'the normal zone-map authority qualifies a part row without embedded zone identity');
const decoderReplay = runPublicPartProjection({...decoderInputs, replay: true});
assert.deepEqual(values(decoderReplay.deployedRecoverySource.record.hourly[0], 'current'),
  values(runPublicPartProjection({...decoderInputs, active: decoderOldBulk}).dmiRecord.hourly[0], 'current'),
  'historical replay keeps its saved original winner; the PUBLIC option is not forwarded');
assert.deepEqual(decoderInputs, decoderBefore, 'all native originals, persisted rows and captures remain byte-equivalent');

console.log('Protected five-family tuple continuity passed with real DMI validators and production sanitizer');
