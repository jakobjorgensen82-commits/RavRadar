import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';
import {
  RAVSCORE_STATE_ONLY_CURRENT_HOLD_CLOSURE_CONTRACT_ID,
  buildIntegratedRavScoreStateSeries,
  reconstructCandidateGRollbackState,
} from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildIntegratedPartScoreSeries,
  compactIntegratedRavScoreMode,
  integratedInputCalibrationEligible,
} from './lib/ravscore-integrated-runtime.mjs';
import {
  reconstructIntegratedEvaluationState,
} from './audit-ravscore-integrated-public-runtime.mjs';
import { buildCandidateGRollbackPartScoreSeries } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { buildRavScoreProductionPartSeries } from './lib/ravscore-production-part-pipeline.mjs';
import {
  buildRavScoreRecoveryReplay,
  RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES,
  RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
  ravScoreCandidateMigrationWaveBootstrapTargetAt,
  ravScoreRecoverySourceStartAt,
  selectRavScoreInitialState,
} from './lib/ravscore-recovery-replay.mjs';
import {
  buildNewestValidRavScoreRecoverySources,
  summarizeIsolatedRavScoreWaveReplayConflicts,
  summarizeRavScoreCurrentRecoveryConflicts,
  summarizeRavScoreWaveRecoveryConflictCandidates,
} from './lib/ravscore-recovery-source-priority.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import {
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_RECOVERY_POLICY,
} from '../js/core/ravscore-model-contract.js';
import { copernicusLiveRecordProjectionSha256 } from './lib/live-current-pilot.mjs';

const HOUR_MS = 3_600_000;
const baseMs = Date.parse('2026-08-29T00:00:00.000Z');
const time = hour => new Date(baseMs + hour * HOUR_MS).toISOString();
const part = {
  partId: 'SYNTHETIC-RECOVERY-PART',
  parentZoneId: 'SYNTHETIC-RECOVERY-ZONE',
  waterPoint: [8, 55],
  onshoreDirectionDeg: 90,
};
const zone = { id: 'SYNTHETIC-RECOVERY-ZONE', onshoreDirectionDeg: 90 };
const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
const liveIdentityPayload = JSON.stringify({
  schemaVersion: 1,
  targets: [[part.partId, part.parentZoneId, '8.0000000', '55.0000000']],
});
const liveIdentityFingerprint = `sha256:${crypto.createHash('sha256')
  .update(liveIdentityPayload).digest('hex')}`;
const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const HOLD_SHA = `sha256:${'b'.repeat(64)}`;
const dmiContracts = {
  current: {
    collection: 'dkss_idw',
    collectionFamily: 'marine',
    componentKind: 'ocean-current-vector',
    fieldSet: ['current-u', 'current-v'],
    spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
    vectorSemanticsVersion: 3,
    vectorSelection,
    verticalLayer: 'depth:1',
    verticalLayerRankM: 1,
  },
  wave: {
    collection: 'wam_dw',
    collectionFamily: 'wave',
    componentKind: 'wave-mobilisation-tuple',
    wavePeriodSemantics: 'peak',
    wavePeriodField: { shortName: 'pp1d', paramId: 231, indicatorOfParameter: null },
    fieldSet: ['significant-wave-height', 'dominant-wave-period'],
    spatialSelection: 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
  },
};
function dmiNativeSource(component, at, modelRun) {
  const contract = dmiContracts[component];
  const leadTimeHours = (Date.parse(at) - Date.parse(modelRun)) / HOUR_MS;
  const itemId = `${component}-${at}`;
  return {
    provider: 'dmi',
    fallback: false,
    ...contract,
    component,
    optionalFieldSet: component === 'wave' ? ['mean-wave-dir'] : [],
    modelRun,
    nativeValidTime: at,
    leadTimeHours,
    entityId: `PART::${part.partId}`,
    parentZoneId: part.parentZoneId,
    entityType: 'coastal-part',
    samplingContext: 'coastal-part-water-point',
    samplingPoint: [...part.waterPoint],
    gridPoint: [...part.waterPoint],
    gridDefinitionSha256: sha('recovery-grid'),
    distanceKm: 0,
    spatialSemanticsVersion: 1,
    itemId,
    assetIdentitySha256: sha(`${component}-asset-${at}`),
    acquiredAt: time(-54),
  };
}
function dmiForecastSource(component, at, modelRun) {
  const source = dmiNativeSource(component, at, modelRun);
  return {
    ...source,
    temporalResolution: 'native',
    nativeValidTimes: [at],
    nativeSteps: [{
      itemId: source.itemId,
      assetIdentitySha256: source.assetIdentitySha256,
      nativeValidTime: at,
      leadTimeHours: source.leadTimeHours,
      acquiredAt: source.acquiredAt,
      optionalFieldSet: [...source.optionalFieldSet],
      ...(component === 'wave' ? {
        wavePeriodSemantics: source.wavePeriodSemantics,
        wavePeriodField: { ...source.wavePeriodField },
      } : {}),
    }],
  };
}

function weather(hour, {
  modelRun = time(-54),
  speed = 0.09,
  waveHeight = 1.2,
  wavePeriod = 7,
  rawU = speed,
  rawV = 0,
} = {}) {
  const at = time(hour);
  return {
    time: at,
    windSpeedMps: 5,
    windDirectionDeg: 270,
    waveHeightM: waveHeight,
    wavePeriodS: wavePeriod,
    waveDirectionDeg: 270,
    waterLevelCm: 10,
    waterLevelTrendCm3h: 0,
    waterTemperatureC: 14,
    currentSpeedMps: speed,
    currentDirectionDeg: 90,
    currentUMps: rawU,
    currentVMps: rawV,
    currentProvenance: {
      status: 'verified',
      ...dmiForecastSource('current', at, modelRun),
    },
    sources: {
      wave: dmiForecastSource('wave', at, modelRun),
    },
  };
}

function withoutCurrent(row) {
  return {
    ...row,
    currentSpeedMps: null,
    currentDirectionDeg: null,
    currentUMps: null,
    currentVMps: null,
    currentProvenance: null,
  };
}

function withoutWave(row) {
  const sources = { ...(row?.sources ?? {}) };
  delete sources.wave;
  return {
    ...row,
    waveHeightM: null,
    wavePeriodS: null,
    waveDirectionDeg: null,
    waveProvenance: null,
    sources,
  };
}

function withVerifiedWave(row) {
  return {
    ...row,
    waveProvenance: { status: 'verified' },
  };
}

function withCurrentRevision(row, itemUpdatedAt) {
  return {
    ...row,
    currentProvenance: {
      ...row.currentProvenance,
      itemUpdatedAt,
      nativeSteps: row.currentProvenance.nativeSteps.map(step => ({
        ...step,
        itemUpdatedAt,
      })),
    },
  };
}

function controlledLiveWeather(hour, overrides = {}) {
  const row = weather(hour);
  const at = row.time;
  const capturedAt = new Date(Date.parse(at) + 20 * 60_000).toISOString();
  const currentProvenance = {
    recordProjectionContractId: 'copernicus-live-current-record-fixed-decimal-v1',
    recordId: `sha256:${sha(`live-record-${hour}`)}`,
    acquisitionId: `sha256:${sha(`live-acquisition-${hour}`)}`,
    collectionId: `sha256:${sha('live-collection')}`,
    productionReferenceAt: time(0),
    status: 'verified',
    provider: 'copernicus',
    sourceClass: 'supplemental-local-current',
    source: 'copernicus-baltic-nemo',
    partId: part.partId,
    parentZoneId: part.parentZoneId,
    targetIdentityFingerprint: liveIdentityFingerprint,
    productId: 'BALTICSEA_ANALYSISFORECAST_PHY_003_006',
    datasetId: 'cmems_mod_bal_phy_anfc_PT1H-i',
    datasetVersion: '202411',
    validTime: at,
    capturedAt,
    acquisitionAt: capturedAt,
    acquisitionStatus: 'COMPLETE',
    requestContractId: 'copernicus-current-multitime-bounded-spatial-shards-v1',
    selectionPolicyId: 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1',
    temporalResolution: 'native',
    nativeValidTimes: [at],
    controlledLivePilot: true,
    vectorSemanticsVersion: 4,
    componentPair: 'same-time-cell-layer',
    interpolation: false,
    verticalLayer: 'depth:1',
    verticalLayerM: 1,
    verticalLayerRankM: 1,
    layerQuality: 'deepest-common-layer',
    sharedLayerCount: 2,
    samplingPoint: [...part.waterPoint],
    gridPoint: [8.005, 55],
    distanceKm: 0.31889,
    uMps: row.currentUMps,
    vMps: row.currentVMps,
    fallback: false,
    ...overrides,
  };
  currentProvenance.recordProjectionSha256 = copernicusLiveRecordProjectionSha256(currentProvenance);
  return {
    ...row,
    currentProvenance,
  };
}

function withoutWaveDirectionAttestation(row) {
  const source = row.sources.wave;
  return {
    ...row,
    sources: {
      ...row.sources,
      wave: {
        ...source,
        optionalFieldSet: [],
        nativeSteps: source.nativeSteps.map(step => ({ ...step, optionalFieldSet: [] })),
      },
    },
  };
}

function openMeteoWaveReserve(row) {
  const source = {
    provider: 'open-meteo',
    fallback: true,
    component: 'wave',
    sourceClass: 'response-bound-official-component',
    componentRecordId: `sha256:${'c'.repeat(64)}`,
    entityId: `PART::${part.partId}`,
    parentZoneId: part.parentZoneId,
    entityType: 'coastal-part',
    samplingContext: 'coastal-part-water-point',
    samplingPoint: [...part.waterPoint],
    validTime: row.time,
  };
  return {
    ...row,
    sources: { ...row.sources, wave: source },
    waveProvenance: { status: 'verified', ...source },
  };
}

const radians = degrees => degrees * Math.PI / 180;
const regionalGridPoint = [8.1, 55];
const regionalDistanceKm = (() => {
  const dLat = radians(regionalGridPoint[1] - part.waterPoint[1]);
  const dLon = radians(regionalGridPoint[0] - part.waterPoint[0]);
  const lat1 = radians(part.waterPoint[1]);
  const lat2 = radians(regionalGridPoint[1]);
  const term = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term));
})();
function regionalWeather(hour, { rawU = 0.09, rawV = 0, ...weatherOverrides } = {}) {
  const row = weather(hour, {
    ...weatherOverrides,
    speed: Math.hypot(rawU, rawV),
    rawU,
    rawV,
  });
  const at = row.time;
  return {
    ...row,
    currentDirectionDeg: ((Math.atan2(rawU, rawV) * 180 / Math.PI) + 360) % 360,
    currentProvenance: {
      status: 'verified',
      provider: 'dmi',
      sourceClass: 'owner-approved-regional-proxy',
      source: 'dmi-dkss-lf-regional-proxy',
      collection: 'dkss_lf',
      partId: part.partId,
      parentZoneId: part.parentZoneId,
      targetIdentityFingerprint: liveIdentityFingerprint,
      validTime: at,
      sourceValidTime: at,
      classification: 'REGIONAL_DMI_NATIVE',
      capturedAt: new Date(Date.parse(at) + 20 * 60_000).toISOString(),
      productionReferenceAt: at,
      modelRun: time(-54),
      samplingPoint: [...part.waterPoint],
      gridPoint: [...regionalGridPoint],
      distanceKm: regionalDistanceKm,
      verticalLayer: 'depthbelowsea:5',
      verticalLayerRankM: 5,
      componentPair: 'same-time-cell-layer',
      interpolation: false,
      vectorSemanticsVersion: 4,
      controlledLivePilot: true,
      vectorSelection: 'dmi-local-then-copernicus-local-then-owner-approved-regional-proxy',
      temporalResolution: 'native',
      nativeValidTimes: [at],
      fallback: false,
      uMps: rawU,
      vMps: rawV,
    },
  };
}
function nativeBoundaryReference(row) {
  return {
    time: row.time,
    currentSpeedMps: row.currentSpeedMps,
    currentAlignment: Math.cos(
      (row.currentDirectionDeg - part.onshoreDirectionDeg) * Math.PI / 180,
    ),
    currentVerified: true,
    currentProvenance: {
      status: 'verified',
      sourceClass: row.currentProvenance.sourceClass,
      source: row.currentProvenance.source,
      collection: row.currentProvenance.collection,
      distanceKm: row.currentProvenance.distanceKm,
    },
  };
}

function stateOnlyCurrentHold(validHour, sourceHour) {
  return {
    contractId: 'regional-dmi-exact-state-only-hold-v1',
    status: 'verified-derived-state-only',
    classification: 'REGIONAL_DMI_DERIVED_HOLD',
    stateOnly: true,
    partId: part.partId,
    parentZoneId: part.parentZoneId,
    targetIdentityFingerprint: liveIdentityFingerprint,
    validTime: time(validHour),
    sourceValidTime: time(sourceHour),
    holdAgeHours: validHour - sourceHour,
    provider: 'dmi',
    sourceClass: 'owner-approved-regional-proxy',
    source: 'dmi-dkss-lf-regional-proxy',
    collection: 'dkss_lf',
    modelRun: time(-54),
    closureContractId: RAVSCORE_STATE_ONLY_CURRENT_HOLD_CLOSURE_CONTRACT_ID,
    closureId: HOLD_SHA,
    closureAssignmentSha256: HOLD_SHA,
    sourceAssetSha256: HOLD_SHA,
    sourceProofSha256: HOLD_SHA,
    vectorCommitmentSha256: HOLD_SHA,
  };
}

function stateOnlyHoldWeather(validHour, sourceHour) {
  return {
    ...withoutCurrent(regionalWeather(validHour)),
    currentStateOnlyHold: stateOnlyCurrentHold(validHour, sourceHour),
  };
}

const initialBuild = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: Array.from({ length: 49 }, (_, index) => weather(index - 48)),
});
const initialState = initialBuild.scores.at(-1).ravScoreModel.continuationState;
assert.equal(initialState.time, time(0));
assert.equal(initialState.currentMemoryReady, true);
assert.equal(initialState.waveMemoryReady, true);

const record = rows => ({ point: [...part.waterPoint], hourly: rows });
const publicRows = targetHour => [weather(targetHour), weather(targetHour + 1), weather(targetHour + 2)];

// Synthetic counterpart of the authenticated baseline/history assembly. The
// production caller must authenticate the previous record before opting in;
// a matching source label or an equal clone is deliberately not sufficient.
const authenticatedPrioritySources = options => buildNewestValidRavScoreRecoverySources({
  part,
  ...options,
  protectedPreviousSource: options.fallbackSource,
});

function replayForAge(age, sources) {
  return buildRavScoreRecoveryReplay({
    part,
    initialState,
    targetReferenceAt: time(age),
    sourceRecords: sources,
    publicHourly: publicRows(age),
  });
}

for (const age of [3, 4, 72]) {
  const bridge = Array.from({ length: age - 1 }, (_, index) => weather(index + 1));
  const recovery = replayForAge(age, [{ source: 'source-only', record: record(bridge) }]);
  assert.equal(recovery.replayedHourCount, age - 1, `${age}h recovery must replay every real intervening hour`);
  assert.equal(recovery.hourly[0].time, time(1));
  assert.equal(recovery.hourly.at(-3).time, time(age));
  const built = buildIntegratedPartScoreSeries({
    part,
    zone,
    hourly: recovery.hourly,
    initialState,
    scoreStartAt: recovery.scoreStartAt,
  });
  assert.equal(built.scores.length, 3, `${age}h recovery must not emit historical public scores`);
  assert.equal(built.scores[0].time, time(age));
  assert.equal(built.ravScoreState.initialStateAccepted, true);
  assert.equal(built.scores[0].ravScoreModel.currentMemoryReady, true);
  assert.equal(built.scores[0].ravScoreModel.waveMemoryReady, true);
}

const union = replayForAge(4, [
  { source: 'deployed', record: record([weather(1), weather(2)]) },
  { source: 'progressive', record: record([weather(2), weather(3)]) },
]);
assert.equal(union.replayedHourCount, 3);
assert.equal(union.sourceRecordCount, 2);
assert.deepEqual(union.hourly.slice(0, 3).map(row => row.time), [time(1), time(2), time(3)]);
assert.deepEqual(union.hourly[0].currentProvenance, { status: 'verified' });
assert.equal(Object.hasOwn(union.hourly[0], 'currentUMps'), false);
assert.equal(Object.hasOwn(union.hourly[0], 'currentVMps'), false);
assert.equal(Object.hasOwn(union.hourly[0], 'sources'), false,
  'private sampling and model-run provenance must be consumed by verification, not retained in replay state rows');

const reserveWaveReplay = replayForAge(4, [{
  source: 'verified-open-meteo-wave-reserve',
  record: record([weather(1), openMeteoWaveReserve(weather(2)), weather(3)]),
}]);
assert.equal(reserveWaveReplay.replayedHourCount, 3,
  'a separately admitted CP/Open-Meteo wave reserve must remain usable in normal integrated recovery');

const controlledLiveBridge = replayForAge(4, [{
  source: 'controlled-live-current',
  record: record([1, 2, 3].map(controlledLiveWeather)),
}]);
assert.equal(controlledLiveBridge.replayedHourCount, 3,
  'exact part-bound controlled-live current must satisfy the private replay bridge');
assert.throws(() => replayForAge(4, [{
  source: 'wrong-controlled-live-part',
  record: record([
    controlledLiveWeather(1),
    controlledLiveWeather(2, { partId: 'OTHER-PART' }),
    controlledLiveWeather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED',
'controlled-live evidence from another part must fail closed during replay');
assert.throws(() => replayForAge(4, [{
  source: 'stale-controlled-live-capture',
  record: record([
    controlledLiveWeather(1),
    controlledLiveWeather(2, { capturedAt: time(-20) }),
    controlledLiveWeather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED',
'controlled-live evidence without a fresh acquisition binding must fail closed');
assert.throws(() => replayForAge(4, [{
  source: 'controlled-live-row-vector-divergence',
  record: record([
    controlledLiveWeather(1),
    controlledLiveWeather(2, { uMps: 0.1 }),
    controlledLiveWeather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED',
'a separately valid projection may not authorize different row U/V values during recovery replay');

const producerModelRun = time(-6);
const nativeSource = (component, hour) => dmiNativeSource(
  component,
  time(hour),
  producerModelRun,
);
const nativeHours = [0, 3];
const producerRows = buildDmiForecastHourly({
  generatedAt: time(4),
  startAt: time(1),
  hours: 3,
  sourceCadenceMinutes: 180,
  ocean: nativeHours.map(hour => ({
    step: time(hour),
    'current-u': 0.09,
    'current-v': 0,
    provenance: { current: nativeSource('current', hour) },
  })),
  waves: nativeHours.map(hour => ({
    step: time(hour),
    'significant-wave-height': 1.2,
    'dominant-wave-period': 7,
    'mean-wave-dir': 270,
    provenance: { wave: nativeSource('wave', hour) },
  })),
}).hourly.map(row => ({
  ...row,
  currentProvenance: { status: 'verified', ...row.sources.current },
}));
const producerRecovery = replayForAge(4, [{
  source: 'real-dmi-forecast-producer',
  record: record(producerRows),
}]);
assert.equal(producerRecovery.replayedHourCount, 3,
  'native and interpolated rows from the real DMI forecast producer must satisfy the replay proof');
const boundedRecovery = replayForAge(4, [{
  source: 'bounded-window',
  record: record([
    { ...weather(0), currentProvenance: { status: 'invalid-outside-window' } },
    weather(1),
    weather(2),
    weather(3),
    { ...weather(4), currentProvenance: { status: 'invalid-outside-window' } },
  ]),
}]);
assert.equal(boundedRecovery.replayedHourCount, 3,
  'only rows strictly after persisted state and strictly before target may enter replay');

assert.throws(() => replayForAge(4, [
  { source: 'deployed', record: record([weather(1), weather(2), weather(3)]) },
  { source: 'progressive', record: record([weather(2, { speed: 0.12 })]) },
]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');
assert.throws(() => replayForAge(4, [{
  source: 'inconsistent-vector',
  record: record([weather(1), weather(2, { speed: 0.2, rawU: 0.09 }), weather(3)]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED');
assert.throws(() => replayForAge(4, [{
  source: 'partial-vector',
  record: record([weather(1), weather(2, { rawV: null }), weather(3)]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED');
assert.throws(() => replayForAge(4, [{
  source: 'numeric-string-current',
  record: record([
    weather(1),
    { ...weather(2), currentSpeedMps: '0.09' },
    weather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED',
'numeric-string current must not become verified recovery evidence');
assert.throws(() => replayForAge(4, [{
  source: 'numeric-string-wave',
  record: record([
    weather(1),
    { ...weather(2), waveHeightM: '1.2' },
    weather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED',
'numeric-string wave must not become verified recovery evidence');
assert.throws(() => replayForAge(4, [{
  source: 'unattested-wave-direction',
  record: record([
    weather(1),
    withoutWaveDirectionAttestation(weather(2)),
    weather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED',
'a numeric wave direction without mean-wave-dir on every proved native step must fail closed');
const exactCalmWithoutDirection = withoutWaveDirectionAttestation({
  ...weather(2),
  waveHeightM: 0,
  wavePeriodS: 0,
  waveDirectionDeg: null,
});
const exactCalmReplay = replayForAge(4, [{
  source: 'directionless-exact-calm',
  record: record([weather(1), exactCalmWithoutDirection, weather(3)]),
}]);
assert.deepEqual({
  height: exactCalmReplay.hourly[1].waveHeightM,
  period: exactCalmReplay.hourly[1].wavePeriodS,
  direction: exactCalmReplay.hourly[1].waveDirectionDeg,
}, { height: 0, period: 0, direction: null },
'directionless exact calm with an empty optional-field proof remains a valid neutral replay row');
assert.throws(() => replayForAge(4, [{
  source: 'invalid-directionless-positive-height-zero-period',
  record: record([
    weather(1),
    withoutWaveDirectionAttestation({
      ...weather(2),
      waveHeightM: 1,
      wavePeriodS: 0,
      waveDirectionDeg: null,
    }),
    weather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED',
'positive height with zero period must fail recovery instead of entering as directionless calm');
assert.throws(() => replayForAge(4, [{
  source: 'numeric-string-provenance',
  record: record([
    weather(1),
    {
      ...weather(2),
      currentProvenance: { ...weather(2).currentProvenance, distanceKm: '0.5' },
    },
    weather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED',
'numeric-string provenance must fail closed during recovery');
assert.throws(() => replayForAge(4, [{
  source: 'wrong-native-time',
  record: record([
    weather(1),
    {
      ...weather(2),
      currentProvenance: { ...weather(2).currentProvenance, nativeValidTimes: [time(1)] },
    },
    weather(3),
  ]),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED');
assert.throws(() => replayForAge(4, [
  { source: 'deployed', record: record([weather(1), weather(2, { rawU: 0.09, rawV: 0 }), weather(3)]) },
  { source: 'progressive', record: record([weather(2, { rawU: 0.091, rawV: 0 })]) },
]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');
const currentConflictSources = [
  { source: 'deployed-private-runtime', record: record([weather(2)]) },
  { source: 'progressive-private-dmi', record: record([
    weather(2, { speed: 0.11, rawU: 0.11 }),
  ]) },
];
const currentConflictSnapshot = JSON.stringify(currentConflictSources);
const currentConflictProof = summarizeRavScoreCurrentRecoveryConflicts({
  sourceRecords: currentConflictSources,
  startAt: time(1), targetAt: time(4),
  replayCandidate: sources => replayForAge(4, sources),
});
assert.equal(currentConflictProof.candidatePairCount, 1);
assert.equal(currentConflictProof.confirmedClass, 'DMI_DMI_SAME_RUN_DIFFERENT_VALUES');
assert.equal(currentConflictProof.confirmedSameRunDmiReason, 'SAME_OFFICIAL_ASSET_PROOF');
assert.deepEqual(currentConflictProof.sameRunDmiReasons,
  { DIFFERENT_VALUES_SAME_OFFICIAL_ASSET_PROOF: 1 });
assert.equal(JSON.stringify(currentConflictSources), currentConflictSnapshot,
  'current diagnosis must not change either private source');
for (const privateValue of [part.partId, time(2), '0.11']) {
  assert.equal(JSON.stringify(currentConflictProof).includes(privateValue), false,
    'current diagnosis must contain fixed classes and counts only');
}
const provenanceOnlyCurrent = weather(2);
const currentBefore = dmiForecastSource('current', time(1), time(-54));
const currentAfter = dmiForecastSource('current', time(3), time(-54));
provenanceOnlyCurrent.currentProvenance = {
  status: 'verified',
  ...currentBefore,
  leadTimeHours: (Date.parse(time(2)) - Date.parse(time(-54))) / HOUR_MS,
  temporalResolution: 'interpolated',
  nativeValidTimes: [time(1), time(3)],
  nativeSteps: [currentBefore.nativeSteps[0], currentAfter.nativeSteps[0]],
};
const provenanceOnlySources = [currentConflictSources[0], {
  source: 'progressive-private-dmi', record: record([provenanceOnlyCurrent]),
}];
const provenanceOnlyProof = summarizeRavScoreCurrentRecoveryConflicts({
  sourceRecords: provenanceOnlySources,
  startAt: time(1), targetAt: time(4),
  replayCandidate: sources => replayForAge(4, sources),
});
assert.equal(provenanceOnlyProof.confirmedClass, 'DMI_DMI_SAME_RUN_SAME_VALUES',
  'same U/V can conflict if RavRadar used different native DMI time support');
assert.equal(provenanceOnlyProof.confirmedSameRunDmiReason,
  'NATIVE_STEP_COUNT_NOT_COMPARABLE');
const currentProviderProof = summarizeRavScoreCurrentRecoveryConflicts({
  sourceRecords: [currentConflictSources[0], {
    source: 'progressive-private-dmi', record: record([controlledLiveWeather(2)]),
  }],
  startAt: time(1), targetAt: time(4),
  replayCandidate: sources => replayForAge(4, sources),
});
assert.equal(currentProviderProof.candidatePairCount, 1);
assert.deepEqual(currentProviderProof.classes,
  { ACROSS_RECORDS_DMI_OTHER_UNBOUND_RUN_SAME_VALUES: 1 },
  'a cross-provider overlap must not be misreported as a DMI revision');
const changedGridCurrent = weather(2, { speed: 0.11, rawU: 0.11 });
changedGridCurrent.currentProvenance.gridDefinitionSha256 = sha('changed-grid');
const changedGridProof = summarizeRavScoreCurrentRecoveryConflicts({
  sourceRecords: [currentConflictSources[0], {
    source: 'progressive-private-dmi', record: record([changedGridCurrent]),
  }],
  startAt: time(1), targetAt: time(4),
  replayCandidate: sources => replayForAge(4, sources),
});
assert.deepEqual(changedGridProof.sameRunDmiIdentityMismatchFields,
  { gridDefinitionSha256: 1 });
assert.equal(changedGridProof.confirmedSameRunDmiReason,
  'SOURCE_IDENTITY_NOT_COMPARABLE');
const withinRecordCurrent = summarizeRavScoreCurrentRecoveryConflicts({
  sourceRecords: [{ source: 'deployed-private-runtime', record: record([
    weather(2), weather(2, { speed: 0.11, rawU: 0.11 }),
  ]) }],
  startAt: time(1), targetAt: time(4),
  replayCandidate: sources => replayForAge(4, sources),
});
assert.deepEqual(withinRecordCurrent.classes,
  { WITHIN_RECORD_DMI_DMI_SAME_RUN_DIFFERENT_VALUES: 1 });
assert.equal(summarizeRavScoreCurrentRecoveryConflicts({
  sourceRecords: currentConflictSources, startAt: time(4), targetAt: time(1),
  replayCandidate: sources => replayForAge(4, sources),
}).status, 'INVALID_DIAGNOSTIC_INPUT');
const opaqueCurrentFailure = summarizeRavScoreCurrentRecoveryConflicts({
  sourceRecords: currentConflictSources, startAt: time(1), targetAt: time(4),
  replayCandidate: () => { throw new Error('PRIVATE_SYNTHETIC_CURRENT_FAILURE'); },
});
assert.equal(opaqueCurrentFailure.confirmedClass, 'NONE');
assert.equal(JSON.stringify(opaqueCurrentFailure).includes('PRIVATE_SYNTHETIC'), false);
assert.throws(() => replayForAge(4, [
  { source: 'deployed', record: record([weather(1), weather(2), weather(3)]) },
  { source: 'progressive', record: record([weather(2, { waveHeight: 1.3 })]) },
]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');
const unresolvedWaveSources = [
  { source: 'deployed-private-runtime', record: record([withVerifiedWave(weather(2))]) },
  { source: 'progressive-private-dmi', record: record([
    withVerifiedWave(weather(2, { waveHeight: 1.3 })),
  ]) },
];
const unresolvedWaveSnapshot = JSON.stringify(unresolvedWaveSources);
const safeWaveDiagnosis = summarizeRavScoreWaveRecoveryConflictCandidates({
  sourceRecords: unresolvedWaveSources, part, startAt: time(1), targetAt: time(4),
});
assert.deepEqual(safeWaveDiagnosis, {
  status: 'CANDIDATES_ONLY',
  candidatePairCount: 1,
  withinRecordPairCount: 0,
  classes: {
    ACROSS_RECORDS_DMI_DMI_SAME_RUN_BOTH_PRIORITY_ADMITTED_DIFFERENT_VALUES: 1,
  },
  sameRunDmiRevisionClasses: { SAME_OFFICIAL_ASSET_PROOF: 1 },
  sameRunDmiValueRevisionClasses: {
    DIFFERENT_VALUES_SAME_OFFICIAL_ASSET_PROOF: 1,
  },
  sameRunDmiIdentityMismatchFields: {},
}, 'a same-run DMI wave overlap is classified without relaxing replay');
assert.equal(JSON.stringify(unresolvedWaveSources), unresolvedWaveSnapshot,
  'failure-only classification must not mutate recovery inputs');
assert.equal(JSON.stringify(safeWaveDiagnosis).includes(part.partId), false);
assert.equal(JSON.stringify(safeWaveDiagnosis).includes(time(2)), false);
assert.equal(JSON.stringify(safeWaveDiagnosis).includes('1.3'), false);
const changedWaveAsset = withVerifiedWave(weather(2, { waveHeight: 1.3 }));
changedWaveAsset.sources.wave.assetIdentitySha256 = sha('distinct-wave-asset');
changedWaveAsset.sources.wave.nativeSteps[0].assetIdentitySha256 = sha('distinct-wave-asset');
const missingRevisionProof = summarizeRavScoreWaveRecoveryConflictCandidates({
  sourceRecords: [unresolvedWaveSources[0], {
    source: 'progressive-private-dmi', record: record([changedWaveAsset]),
  }],
  part, startAt: time(1), targetAt: time(4),
});
assert.deepEqual(missingRevisionProof.sameRunDmiRevisionClasses,
  { CREATED_AT_MISSING: 1 },
  'a changed same-run asset without comparable official times stays diagnostic-only');
const differentGridWave = withVerifiedWave(weather(2, { waveHeight: 1.3 }));
differentGridWave.sources.wave.gridDefinitionSha256 = sha('different-wave-grid');
const nonComparableWave = summarizeRavScoreWaveRecoveryConflictCandidates({
  sourceRecords: [unresolvedWaveSources[0], {
    source: 'progressive-private-dmi', record: record([differentGridWave]),
  }],
  part, startAt: time(1), targetAt: time(4),
});
assert.deepEqual(nonComparableWave.sameRunDmiRevisionClasses,
  { SOURCE_IDENTITY_NOT_COMPARABLE: 1 });
assert.deepEqual(nonComparableWave.sameRunDmiIdentityMismatchFields,
  { gridDefinitionSha256: 1 },
  'a changed grid must be classified without exposing either grid hash');
assert.deepEqual(nonComparableWave.sameRunDmiValueRevisionClasses,
  { DIFFERENT_VALUES_SOURCE_IDENTITY_NOT_COMPARABLE: 1 });
const oldTimedWave = withVerifiedWave(weather(2));
oldTimedWave.sources.wave.itemUpdatedAt = time(-2);
oldTimedWave.sources.wave.nativeSteps[0].itemUpdatedAt = time(-2);
const newTimedWave = withVerifiedWave(weather(2, { waveHeight: 1.3 }));
newTimedWave.sources.wave.assetIdentitySha256 = sha('newer-wave-asset');
newTimedWave.sources.wave.nativeSteps[0].assetIdentitySha256 = sha('newer-wave-asset');
newTimedWave.sources.wave.itemUpdatedAt = time(-1);
newTimedWave.sources.wave.nativeSteps[0].itemUpdatedAt = time(-1);
const provedRevisionCandidates = summarizeRavScoreWaveRecoveryConflictCandidates({
  sourceRecords: [
    { source: 'deployed-private-runtime', record: record([oldTimedWave]) },
    { source: 'progressive-private-dmi', record: record([newTimedWave]) },
  ],
  part, startAt: time(1), targetAt: time(4),
});
assert.deepEqual(provedRevisionCandidates.sameRunDmiRevisionClasses,
  { RIGHT_OFFICIAL_REVISION_PROVED: 1 },
  'the safe classifier can distinguish a proved official revision from an unresolved peer');
for (const diagnosis of [missingRevisionProof, nonComparableWave,
  provedRevisionCandidates]) {
  const serialized = JSON.stringify(diagnosis);
  assert.equal(serialized.includes(part.partId), false);
  assert.equal(serialized.includes(time(2)), false);
  assert.equal(serialized.includes('1.3'), false);
}
assert.throws(() => replayForAge(4, unresolvedWaveSources),
  error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
  'classification never authorizes a conflicting wave');
const isolatedWaveProof = summarizeIsolatedRavScoreWaveReplayConflicts({
  sourceRecords: unresolvedWaveSources,
  startAt: time(1), targetAt: time(4),
  replayCandidate: sources => replayForAge(4, sources),
});
assert.deepEqual(isolatedWaveProof, {
  status: 'ISOLATED_REPLAY_PROOFS_NOT_FULL_REPLAY_ORDER',
  candidatePairCount: 1,
  confirmedPairCount: 1,
  otherOutcomeCount: 0,
  confirmedClasses: { DMI_DMI_SAME_RUN_DIFFERENT_VALUES: 1 },
  confirmedSameRunDmiReasons: { DIFFERENT_VALUES_SAME_OFFICIAL_ASSET_PROOF: 1 },
}, 'the unchanged replay validator rejects the isolated verified pair');
assert.equal(JSON.stringify(unresolvedWaveSources), unresolvedWaveSnapshot,
  'isolated replay diagnosis must not mutate the original private rows');
for (const privateValue of [part.partId, time(2), '1.3']) {
  assert.equal(JSON.stringify(isolatedWaveProof).includes(privateValue), false);
}
const equalWaveProof = summarizeIsolatedRavScoreWaveReplayConflicts({
  sourceRecords: [unresolvedWaveSources[0], unresolvedWaveSources[0]],
  startAt: time(1), targetAt: time(4),
  replayCandidate: sources => replayForAge(4, sources),
});
assert.equal(equalWaveProof.confirmedPairCount, 0,
  'an identical replay signature is not reported as a proven conflict');
const interpolatedWaveAt2 = (beforeHour, afterHour, waveHeight) => {
  const before = dmiForecastSource('wave', time(beforeHour), time(-54));
  const after = dmiForecastSource('wave', time(afterHour), time(-54));
  return withVerifiedWave({
    ...weather(2, { waveHeight }),
    sources: {
      wave: {
        ...before,
        leadTimeHours: (Date.parse(time(2)) - Date.parse(time(-54))) / HOUR_MS,
        temporalResolution: 'interpolated',
        nativeValidTimes: [time(beforeHour), time(afterHour)],
        nativeSteps: [before.nativeSteps[0], after.nativeSteps[0]],
      },
    },
  });
};
for (const [leftWave, rightWave, expectedReason] of [
  [withVerifiedWave(weather(2)), interpolatedWaveAt2(1, 3, 1.3),
    'DIFFERENT_VALUES_NATIVE_STEP_COUNT_NOT_COMPARABLE'],
  [interpolatedWaveAt2(0, 3, 1.2), interpolatedWaveAt2(1, 3, 1.3),
    'DIFFERENT_VALUES_NATIVE_STEP_TIME_NOT_COMPARABLE'],
]) {
  const sources = [
    { source: 'deployed-private-runtime', record: record([leftWave]) },
    { source: 'progressive-private-dmi', record: record([rightWave]) },
  ];
  const proof = summarizeIsolatedRavScoreWaveReplayConflicts({
    sourceRecords: sources, startAt: time(1), targetAt: time(4),
    replayCandidate: isolated => replayForAge(4, isolated),
  });
  assert.equal(proof.confirmedPairCount, 1,
    'different valid DMI native support must still fail through the unchanged replay');
  assert.deepEqual(proof.confirmedSameRunDmiReasons, { [expectedReason]: 1 });
}
for (const [oldWave, progressiveWave] of [
  [withVerifiedWave(weather(2)), interpolatedWaveAt2(1, 3, 1.3)],
  [interpolatedWaveAt2(0, 3, 1.2), interpolatedWaveAt2(1, 3, 1.3)],
  [interpolatedWaveAt2(1, 3, 1.2), withVerifiedWave(weather(2, { waveHeight: 1.3 }))],
  [withVerifiedWave(weather(2)), interpolatedWaveAt2(1, 3, 1.2)],
]) {
  const deployed = withoutCurrent(oldWave);
  const progressive = withoutCurrent(progressiveWave);
  const unchangedInputs = JSON.stringify([deployed, progressive]);
  const retained = [];
  const projected = authenticatedPrioritySources({
    fallbackSource: { source: 'deployed-private-runtime', record: record([deployed]) },
    preferredSource: { source: 'progressive-private-dmi', record: record([progressive]) },
    part,
    onProtectedSameRunDmiRetention: (component, valueClass) =>
      retained.push(`${component}:${valueClass}`),
  });
  assert.equal(replayForAge(4, projected).hourly.find(row => row.time === time(2)).waveHeightM,
    deployed.waveHeightM,
    'an unproved same-run DMI wave refresh must preserve the verified deployed wave');
  assert.equal(projected[1].record.hourly[0].waveHeightM, null,
    'only the losing wave tuple is removed before strict replay');
  assert.deepEqual(retained, [
    `wave:${deployed.waveHeightM === progressive.waveHeightM
      ? 'SAME_VALUES' : 'DIFFERENT_VALUES'}`,
  ]);
  assert.equal(JSON.stringify([deployed, progressive]), unchangedInputs,
    'same-run protection must not mutate either original DMI record');
}
const protectedWave = withoutCurrent(withVerifiedWave(weather(2)));
const badNativeProof = withoutCurrent(interpolatedWaveAt2(1, 3, 1.3));
badNativeProof.sources.wave.nativeValidTimes = [time(1), time(4)];
const mismatchedGridWave = withoutCurrent(interpolatedWaveAt2(1, 3, 1.3));
mismatchedGridWave.sources.wave.gridDefinitionSha256 = sha('other-wave-grid');
for (const candidate of [badNativeProof]) {
  const retained = [];
  const projected = authenticatedPrioritySources({
    fallbackSource: { source: 'deployed-private-runtime', record: record([protectedWave]) },
    preferredSource: { source: 'progressive-private-dmi', record: record([candidate]) },
    part,
    onProtectedSameRunDmiRetention: (component, valueClass) =>
      retained.push(`${component}:${valueClass}`),
  });
  assert.notEqual(projected[1].record.hourly[0].waveHeightM, null,
    'invalid native proof must never be silently suppressed');
  assert.deepEqual(retained, []);
}
const officialWaveRevision = (row, updatedAt) => ({
  ...row,
  sources: { ...row.sources, wave: {
    ...row.sources.wave,
    itemUpdatedAt: updatedAt,
    nativeSteps: row.sources.wave.nativeSteps.map(step => ({ ...step, itemUpdatedAt: updatedAt })),
  } },
});
const revisedProtectedWave = officialWaveRevision(protectedWave, time(-2));
const revisedProgressiveWave = officialWaveRevision(
  withoutCurrent(withVerifiedWave(weather(2, { waveHeight: 1.3 }))), time(-1),
);
const revisedWaveSources = authenticatedPrioritySources({
  fallbackSource: { source: 'deployed-private-runtime', record: record([revisedProtectedWave]) },
  preferredSource: { source: 'progressive-private-dmi', record: record([revisedProgressiveWave]) },
  part,
});
assert.equal(replayForAge(4, revisedWaveSources).hourly
  .find(row => row.time === time(2)).waveHeightM, 1.3,
'a proved newer official DMI wave revision still replaces the protected old wave');
assert.deepEqual(summarizeIsolatedRavScoreWaveReplayConflicts({
  sourceRecords: unresolvedWaveSources,
  startAt: time(1), targetAt: time(4), maxPairs: 1,
  replayCandidate: sources => replayForAge(4, sources),
}).candidatePairCount, 1);
const opaqueFailureProof = summarizeIsolatedRavScoreWaveReplayConflicts({
  sourceRecords: unresolvedWaveSources,
  startAt: time(1), targetAt: time(4),
  replayCandidate: () => { throw new Error('PRIVATE_SYNTHETIC_FAILURE_TEXT'); },
});
assert.equal(opaqueFailureProof.confirmedPairCount, 0);
assert.equal(opaqueFailureProof.otherOutcomeCount, 1);
assert.equal(JSON.stringify(opaqueFailureProof).includes('PRIVATE_SYNTHETIC'), false,
  'unrelated exception text must not leave the private diagnostic callback');
const withinRecordWaveDiagnosis = summarizeRavScoreWaveRecoveryConflictCandidates({
  sourceRecords: [{ source: 'deployed-private-runtime', record: record([
    withVerifiedWave(weather(2)), withVerifiedWave(weather(2, { waveHeight: 1.3 })),
  ]) }],
  part, startAt: time(1), targetAt: time(4),
});
assert.equal(withinRecordWaveDiagnosis.withinRecordPairCount, 1,
  'duplicate hours inside one source must be distinguishable from cache overlap');
const admissionGapDiagnosis = summarizeRavScoreWaveRecoveryConflictCandidates({
  sourceRecords: [
    { source: 'deployed-private-runtime', record: record([weather(2)]) },
    { source: 'progressive-private-dmi', record: record([
      withoutCurrent(openMeteoWaveReserve(weather(2, { waveHeight: 1.3 }))),
    ]) },
  ],
  part, startAt: time(1), targetAt: time(4),
});
assert.deepEqual(admissionGapDiagnosis.classes, {
  ACROSS_RECORDS_DMI_OTHER_UNBOUND_RUN_PRIORITY_ADMISSION_GAP_DIFFERENT_VALUES: 1,
}, 'the diagnostic distinguishes a source-priority admission gap without silently selecting a reserve');
assert.deepEqual(summarizeRavScoreWaveRecoveryConflictCandidates({
  sourceRecords: unresolvedWaveSources, part, startAt: time(4), targetAt: time(1),
}), { status: 'INVALID_WINDOW' });
const deployedFallbackRows = [weather(1), weather(2), weather(3)]
  .map(withVerifiedWave);
const freshWaveOnly = {
  ...withoutCurrent(weather(2, { waveHeight: 1.3, modelRun: time(-48) })),
  waveProvenance: { status: 'verified' },
};
const deployedFallbackSnapshot = JSON.stringify(deployedFallbackRows);
const freshWaveSnapshot = JSON.stringify(freshWaveOnly);
const freshFirstSources = authenticatedPrioritySources({
  fallbackSource: {
    source: 'deployed-private-runtime',
    record: record(deployedFallbackRows),
  },
  preferredSource: {
    source: 'progressive-private-dmi',
    record: record([freshWaveOnly]),
  },
});
const freshFirstRecovery = replayForAge(4, freshFirstSources);
const freshFirstHour = freshFirstRecovery.hourly.find(row => row.time === time(2));
assert.equal(freshFirstHour.waveHeightM, 1.3,
  'fresh verified wave must replace an older deployed wave at the same hour');
assert.equal(freshFirstHour.currentSpeedMps, 0.09,
  'the old verified current must remain when the fresh row has no current');
assert.equal(JSON.stringify(deployedFallbackRows), deployedFallbackSnapshot,
  'fresh-first recovery preparation must not mutate deployed history');
assert.equal(JSON.stringify(freshWaveOnly), freshWaveSnapshot,
  'fresh-first recovery preparation must not mutate progressive history');
const newerCurrentOnly = withoutWave(weather(2, {
  modelRun: time(-47),
  speed: 0.11,
  rawU: 0.11,
}));
const newestPerComponentSources = authenticatedPrioritySources({
  fallbackSource: {
    source: 'deployed-private-runtime',
    record: record(deployedFallbackRows),
  },
  preferredSource: {
    source: 'progressive-private-dmi',
    record: record([newerCurrentOnly]),
  },
});
const newestPerComponentRecovery = replayForAge(4, newestPerComponentSources);
const newestPerComponentHour = newestPerComponentRecovery.hourly
  .find(row => row.time === time(2));
assert.equal(newestPerComponentHour.currentSpeedMps, 0.11,
  'the newest verified current must replace an older current independently');
assert.equal(newestPerComponentHour.waveHeightM, 1.2,
  'an older valid wave must remain when the newer DMI run lacks waves');
const olderProgressiveSources = authenticatedPrioritySources({
  fallbackSource: {
    source: 'deployed-private-runtime',
    record: record([withVerifiedWave(
      weather(2, { modelRun: time(-48), waveHeight: 1.4 }),
    )]),
  },
  preferredSource: {
    source: 'progressive-private-dmi',
    record: record([withVerifiedWave(
      weather(2, { modelRun: time(-54), waveHeight: 1.2 }),
    )]),
  },
});
const olderProgressiveRecovery = replayForAge(4, olderProgressiveSources);
const olderProgressiveHour = olderProgressiveRecovery.hourly
  .find(row => row.time === time(2));
assert.equal(olderProgressiveHour.waveHeightM, 1.4,
  'a cache position may not override a genuinely newer DMI model run');
const equalRunProgressiveRevision = authenticatedPrioritySources({
  fallbackSource: {
    source: 'deployed-private-runtime',
    record: record([withCurrentRevision(
      weather(2, { modelRun: time(-48), speed: 0.09, rawU: 0.09 }),
      time(-2),
    )]),
  },
  preferredSource: {
    source: 'progressive-private-dmi',
    record: record([withCurrentRevision(
      weather(2, { modelRun: time(-48), speed: 0.11, rawU: 0.11 }),
      time(-1),
    )]),
  },
});
const equalRunProgressiveRevisionRecovery = replayForAge(4, equalRunProgressiveRevision);
assert.equal(
  equalRunProgressiveRevisionRecovery.hourly.find(row => row.time === time(2)).currentSpeedMps,
  0.11,
  'the accepted progressive DMI revision may replace the deployed current at the same model run',
);

const dmiMustBeatControlledLiveReserve = authenticatedPrioritySources({
  fallbackSource: {
    source: 'deployed-private-runtime',
    record: record([controlledLiveWeather(2)]),
  },
  preferredSource: {
    source: 'progressive-private-dmi',
    record: record([weather(2, { speed: 0.12, rawU: 0.12 })]),
  },
  productionReferenceAt: time(4),
});
const dmiMustBeatControlledLiveRecovery = replayForAge(4, dmiMustBeatControlledLiveReserve);
assert.equal(
  dmiMustBeatControlledLiveRecovery.hourly.find(row => row.time === time(2)).currentSpeedMps,
  0.12,
  'a verified DMI current must replace an overlapping controlled-live reserve current',
);
const priorityWaveRows = (oldRow, newRow, at = time(4)) =>
  buildNewestValidRavScoreRecoverySources({
    fallbackSource: { source: 'deployed-private-runtime', record: record([oldRow]) },
    preferredSource: { source: 'progressive-private-dmi', record: record([newRow]) },
    productionReferenceAt: at,
    part,
  });
const oldReserveWave = openMeteoWaveReserve(weather(2, { waveHeight: 1.2 }));
const freshDirectWave = withVerifiedWave(withoutCurrent(weather(2, {
  modelRun: time(-48), waveHeight: 1.3,
})));
const dmiReclaimsReserve = replayForAge(4, priorityWaveRows(oldReserveWave, freshDirectWave));
assert.equal(dmiReclaimsReserve.hourly.find(row => row.time === time(2)).waveHeightM, 1.3,
  'a verified DMI wave must reclaim the exact hour from an old reserve without a model reference');
assert.equal(dmiReclaimsReserve.hourly.find(row => row.time === time(2)).currentSpeedMps, 0.09,
  'replacing the wave must retain an independent old valid current component');
const retainedDirectWave = replayForAge(4, priorityWaveRows(
  freshDirectWave,
  openMeteoWaveReserve(weather(2, { waveHeight: 1.4 })),
));
assert.equal(retainedDirectWave.hourly.find(row => row.time === time(2)).waveHeightM, 1.3,
  'an unaged verified DMI wave must resist a newer download without model-reference proof');
const oldReserveRetained = replayForAge(4, priorityWaveRows(
  oldReserveWave,
  openMeteoWaveReserve(weather(2, { waveHeight: 1.4 })),
));
assert.equal(oldReserveRetained.hourly.find(row => row.time === time(2)).waveHeightM, 1.2,
  'an unproved new reserve must not erase a previously selected valid reserve');
const invalidNewReserve = openMeteoWaveReserve(weather(2, { waveHeight: 1.4 }));
invalidNewReserve.sources.wave.componentRecordId = 'not-a-valid-record-digest';
const invalidNewReserveSources = priorityWaveRows(oldReserveWave, invalidNewReserve);
assert.equal(invalidNewReserveSources[0].record.hourly[0].waveHeightM, 1.2,
  'a malformed preferred reserve must not suppress the old verified wave');
assert.throws(() => replayForAge(4, invalidNewReserveSources),
  error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED',
  'the strict replay still rejects a malformed candidate');
const withBoundWaveModelRun = (row, modelRun, payload) => {
  const source = {
    ...row.sources.wave,
    modelRun,
    sourceResponseSha256: `sha256:${sha(payload)}`,
    modelReference: {
      kind: 'response-forecast-reference-time',
      modelRun,
      payloadSha256: `sha256:${sha(payload)}`,
    },
  };
  return {
    ...row,
    sources: { ...row.sources, wave: source },
    waveProvenance: { ...source, status: 'verified' },
  };
};
const agedDmiWave = withVerifiedWave(weather(2, {
  modelRun: time(-100), waveHeight: 1.3,
}));
const newerBoundReserveWave = withBoundWaveModelRun(
  openMeteoWaveReserve(weather(2, { waveHeight: 1.4 })), time(-2), 'newer-wave',
);
const olderBoundReserveWave = withBoundWaveModelRun(
  openMeteoWaveReserve(weather(2, { waveHeight: 1.2 })), time(-6), 'older-wave',
);
const reserveRevised = replayForAge(4, priorityWaveRows(
  olderBoundReserveWave, newerBoundReserveWave,
));
assert.equal(reserveRevised.hourly.find(row => row.time === time(2)).waveHeightM, 1.4,
  'a response-bound newer revision of the same reserve may replace its old wave');
const crossProviderReserve = openMeteoWaveReserve(weather(2, { waveHeight: 1.4 }));
crossProviderReserve.sources.wave.provider = 'copernicus';
crossProviderReserve.waveProvenance.provider = 'copernicus';
const copernicusReplacesOpenMeteoWave = replayForAge(4, priorityWaveRows(
  oldReserveWave, crossProviderReserve,
));
assert.equal(copernicusReplacesOpenMeteoWave.hourly.find(row => row.time === time(2)).waveHeightM, 1.4,
  'independently admitted Copernicus wave replaces a valid Open-Meteo wave at the same part/hour');
const agedDmiMayYield = replayForAge(4, priorityWaveRows(
  agedDmiWave, newerBoundReserveWave,
));
assert.equal(agedDmiMayYield.hourly.find(row => row.time === time(2)).waveHeightM, 1.4,
  'a DMI wave at least 96 hours old may yield only to a proved newer reserve run');
const unboundReserveWave = {
  ...newerBoundReserveWave,
  sources: { ...newerBoundReserveWave.sources,
    wave: { ...newerBoundReserveWave.sources.wave,
      modelReference: { ...newerBoundReserveWave.sources.wave.modelReference,
        payloadSha256: `sha256:${'0'.repeat(64)}` },
    },
  },
};
const agedDmiMustNotYieldWithoutProof = replayForAge(4, priorityWaveRows(
  agedDmiWave, unboundReserveWave,
));
assert.equal(agedDmiMustNotYieldWithoutProof.hourly.find(row => row.time === time(2)).waveHeightM, 1.3,
  'even aged DMI remains when the reserve model reference is not response-bound');
const revisionRows = (oldRow, newRow, labels = ['deployed-private-runtime', 'progressive-private-dmi'],
  authenticated = true) =>
  (authenticated ? authenticatedPrioritySources : buildNewestValidRavScoreRecoverySources)({
    fallbackSource: { source: labels[0], record: record([oldRow]) },
    preferredSource: { source: labels[1], record: record([newRow]) },
    part,
  });
const oldRevision = withCurrentRevision(weather(2, { modelRun: time(-48) }), time(-2));
const newRevision = withCurrentRevision(
  weather(2, { modelRun: time(-48), speed: 0.11, rawU: 0.11 }), time(-1),
);
const reversedRevision = replayForAge(4, revisionRows(newRevision, oldRevision));
assert.equal(reversedRevision.hourly.find(row => row.time === time(2)).currentSpeedMps, 0.11,
  'a newer deployed revision must survive an older progressive cache');
const retainedCurrent = [];
const unprovedSameRunCurrent = authenticatedPrioritySources({
  fallbackSource: { source: 'deployed-private-runtime', record: record([weather(2)]) },
  preferredSource: { source: 'progressive-private-dmi',
    record: record([weather(2, { speed: 0.11, rawU: 0.11 })]) },
  part,
  onProtectedSameRunDmiRetention: (component, valueClass) =>
    retainedCurrent.push(`${component}:${valueClass}`),
});
assert.equal(replayForAge(4, unprovedSameRunCurrent).hourly
  .find(row => row.time === time(2)).currentSpeedMps, 0.09,
'the protected verified current survives an unproved same-run DMI refresh');
assert.deepEqual(retainedCurrent, ['current:DIFFERENT_VALUES']);

// A new native selection can change its collection, cell or deepest valid
// layer inside the same model run. Recovery must not invent a cross-grid
// interpolation or treat that selection as proof of an official revision.
const alternateCurrentIdentity = row => ({
  ...row,
  currentProvenance: {
    ...row.currentProvenance,
    collection: 'dkss_nsbs',
    gridPoint: [8.001, 55],
    gridDefinitionSha256: sha('second-current-grid'),
    distanceKm: 0.064,
    verticalLayer: 'depth:2',
    verticalLayerRankM: 2,
  },
});
const alternateWaveIdentity = row => ({
  ...row,
  sources: { ...row.sources, wave: {
    ...row.sources.wave,
    collection: 'wam_nsb',
    gridPoint: [8.001, 55],
    gridDefinitionSha256: sha('second-wave-grid'),
    distanceKm: 0.064,
  } },
});
const alternateCurrent = alternateCurrentIdentity(withoutWave(
  weather(2, { speed: 0.11, rawU: 0.11 }),
));
const oldCurrent = withoutWave(weather(2));
const alternateWave = alternateWaveIdentity(withoutCurrent(
  withVerifiedWave(weather(2, { waveHeight: 1.3 })),
));
const interpolatedCurrent = {
  ...alternateCurrent,
  currentProvenance: {
    ...alternateCurrent.currentProvenance,
    ...dmiForecastSource('current', time(1), time(-54)).nativeSteps[0],
    leadTimeHours: 56,
    temporalResolution: 'interpolated',
    nativeValidTimes: [time(1), time(3)],
    nativeSteps: [1, 3].map(hour => dmiForecastSource('current', time(hour), time(-54)).nativeSteps[0]),
  },
};
const currentIdentityVariants = [
  { gridDefinitionSha256: sha('another-grid-definition') },
  { gridPoint: [8.001, 55], distanceKm: 0.064 },
  { collection: 'dkss_nsbs' },
  { verticalLayer: 'depth:2', verticalLayerRankM: 2 },
].map(proof => ({
  ...oldCurrent, currentUMps: 0.11, currentSpeedMps: 0.11,
  currentProvenance: { ...oldCurrent.currentProvenance, ...proof },
}));
for (const [previous, candidate, component, physicalKey] of [
  [oldCurrent, alternateCurrent, 'current', 'currentUMps'],
  ...currentIdentityVariants.map(row => [oldCurrent, row, 'current', 'currentUMps']),
  [oldCurrent, interpolatedCurrent, 'current', 'currentUMps'],
  [interpolatedCurrent, oldCurrent, 'current', 'currentUMps'],
  [protectedWave, alternateWave, 'wave', 'waveHeightM'],
  [protectedWave, mismatchedGridWave, 'wave', 'waveHeightM'],
]) {
  const inputs = JSON.stringify([previous, candidate]);
  // Prove validity independently with the unchanged validator; a green
  // priority result alone would not distinguish valid retention from hiding.
  for (const row of [previous, candidate]) replayForAge(4, [{ record: record([row]) }]);
  assert.throws(() => replayForAge(4, [{ record: record([previous, candidate]) }]),
    error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');
  const fallbackSource = { source: 'deployed-private-runtime', record: record([previous]) };
  const preferredSource = { source: 'progressive-private-dmi', record: record([candidate]) };
  const selected = authenticatedPrioritySources({ fallbackSource, preferredSource });
  replayForAge(4, selected);
  assert.equal(selected[0].record.hourly[0][physicalKey], previous[physicalKey]);
  assert.equal(selected[1].record.hourly[0][physicalKey], null,
    `${component}: an authenticated previous tuple survives an incomparable same-run refresh`);
  assert.equal(JSON.stringify([previous, candidate]), inputs);
  for (const protectedPreviousSource of [null, structuredClone(fallbackSource), preferredSource]) {
    const unauthorized = buildNewestValidRavScoreRecoverySources({
      fallbackSource, preferredSource, protectedPreviousSource, part,
    });
    assert.throws(() => replayForAge(4, unauthorized),
      error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
      'labels, equal objects and reversed ownership are not authenticated prior ownership');
  }
}

// A genuine newer model run can change the grid, but an updatedAt on a
// different same-run grid does not prove a revision of the protected cell.
const newerGridCurrent = alternateCurrentIdentity(withoutWave(
  weather(2, { modelRun: time(-48), speed: 0.12, rawU: 0.12 }),
));
assert.equal(replayForAge(4, revisionRows(oldCurrent, newerGridCurrent)).hourly[0].currentSpeedMps,
  0.12, 'a newer independently validated model run may replace the previous grid');
assert.equal(replayForAge(4, revisionRows(newerGridCurrent, oldCurrent)).hourly[0].currentSpeedMps,
  0.12, 'an older grid must not displace a newer protected model run');
const newerGridWave = alternateWaveIdentity(withoutCurrent(withVerifiedWave(
  weather(2, { modelRun: time(-48), waveHeight: 1.4 }),
)));
assert.equal(replayForAge(4, revisionRows(protectedWave, newerGridWave)).hourly[0].waveHeightM,
  1.4, 'the same newer-run rule applies to the complete wave tuple');
assert.equal(replayForAge(4, revisionRows(
  withCurrentRevision(oldCurrent, time(-2)), withCurrentRevision(alternateCurrent, time(-1)),
)).hourly[0].currentSpeedMps, 0.09,
'a newer timestamp attached to a different current cell is not a comparable official revision');
assert.equal(replayForAge(4, revisionRows(
  officialWaveRevision(protectedWave, time(-2)), officialWaveRevision(alternateWave, time(-1)),
)).hourly[0].waveHeightM, 1.2,
'a newer timestamp attached to another wave grid is not a comparable official revision');
const independentlyUpdated = {
  ...alternateCurrent, waveHeightM: newerGridWave.waveHeightM,
  wavePeriodS: newerGridWave.wavePeriodS, waveDirectionDeg: newerGridWave.waveDirectionDeg,
  waveProvenance: { status: 'verified' }, sources: { wave: newerGridWave.sources.wave },
};
const mixedTuples = revisionRows(withVerifiedWave(weather(2)), independentlyUpdated);
assert.equal(mixedTuples[0].record.hourly[0].currentUMps, 0.09);
assert.equal(mixedTuples[0].record.hourly[0].currentVMps, 0);
assert.equal(mixedTuples[0].record.hourly[0].waveHeightM, null);
assert.equal(mixedTuples[0].record.hourly[0].wavePeriodS, null);
assert.equal(mixedTuples[0].record.hourly[0].waveDirectionDeg, null);
assert.equal(mixedTuples[0].record.hourly[0].sources.wave, undefined);
assert.equal(mixedTuples[1].record.hourly[0].currentUMps, null);
assert.equal(mixedTuples[1].record.hourly[0].waveHeightM, 1.4);
assert.equal(replayForAge(4, mixedTuples).hourly[0].currentSpeedMps, 0.09,
  'retaining same-run current does not block a newer independently valid wave tuple');
assert.equal(replayForAge(4, mixedTuples).hourly[0].waveHeightM, 1.4);

assert.throws(() => replayForAge(4, revisionRows(
  withoutWave(regionalWeather(2)), withoutWave(regionalWeather(2, { rawU: 0.11 })),
)), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
'the separate owner-approved regional proxy is not silently redefined by direct DMI retention');

// Invalid data must remain visible in either direction, including when it
// claims a newer run: never suppress the invalid loser or valid old winner.
const changeCurrentProof = change => {
  const row = structuredClone(alternateCurrent);
  change(row, row.currentProvenance);
  return row;
};
const badCurrentRows = [
  changeCurrentProof(row => { row.currentSpeedMps = 0.8; }),
  changeCurrentProof(row => { row.currentDirectionDeg = 180; }),
  changeCurrentProof(row => { row.currentVMps = null; }),
  changeCurrentProof((row, proof) => { proof.distanceKm = 6; }),
  changeCurrentProof((row, proof) => { proof.gridPoint = [9, 55]; }),
  changeCurrentProof((row, proof) => { proof.vectorSemanticsVersion = 2; }),
  changeCurrentProof((row, proof) => { proof.vectorSelection = 'deepest-anywhere'; }),
  changeCurrentProof((row, proof) => { proof.entityId = 'PART::OTHER'; }),
  changeCurrentProof((row, proof) => { proof.parentZoneId = 'OTHER'; }),
  changeCurrentProof((row, proof) => { proof.samplingPoint = [8.1, 55]; }),
  changeCurrentProof((row, proof) => { proof.nativeValidTimes = [time(3)]; }),
  changeCurrentProof((row, proof) => { proof.nativeSteps[0].leadTimeHours += 1; }),
  changeCurrentProof((row, proof) => { proof.modelRun = time(-48); }),
];
const changeWaveProof = change => {
  const row = structuredClone(alternateWave);
  change(row, row.sources.wave);
  return row;
};
const badWaveRows = [
  badNativeProof,
  changeWaveProof(row => { row.waveHeightM = -1; }),
  changeWaveProof(row => { row.wavePeriodS = null; }),
  changeWaveProof(row => { row.waveDirectionDeg = null; }),
  changeWaveProof((row, proof) => { proof.optionalFieldSet = []; }),
  changeWaveProof((row, proof) => { proof.entityId = 'PART::OTHER'; }),
  changeWaveProof((row, proof) => { proof.parentZoneId = 'OTHER'; }),
  changeWaveProof((row, proof) => { proof.samplingPoint = [8.1, 55]; }),
  changeWaveProof((row, proof) => { proof.modelRun = time(-48); }),
];
for (const [validRow, badRows, key, expectedCode] of [
  [oldCurrent, badCurrentRows, 'currentUMps', 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED'],
  [protectedWave, badWaveRows, 'waveHeightM', 'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED'],
]) {
  for (const invalid of badRows) {
    for (const rows of [[validRow, invalid], [invalid, validRow]]) {
      const sources = revisionRows(...rows);
      assert.equal(sources[0].record.hourly[0][key], rows[0][key]);
      assert.equal(sources[1].record.hourly[0][key], rows[1][key]);
      assert.throws(() => replayForAge(4, sources), error => error?.code === expectedCode,
        'priority must leave malformed evidence to the unchanged replay rejection');
    }
  }
}

const wrongPointSource = { source: 'deployed-private-runtime',
  record: { ...record([oldCurrent]), point: [8.1, 55] } };
assert.throws(() => replayForAge(4, authenticatedPrioritySources({
  fallbackSource: wrongPointSource,
  preferredSource: { source: 'progressive-private-dmi', record: record([alternateCurrent]) },
})), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_SAMPLING_MISMATCH');
const duplicateProtectedSource = { source: 'deployed-private-runtime',
  record: record([oldCurrent, alternateCurrent]) };
assert.throws(() => replayForAge(4, authenticatedPrioritySources({
  fallbackSource: duplicateProtectedSource,
  preferredSource: { source: 'progressive-private-dmi', record: record([alternateCurrent]) },
})), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
'ambiguous within-record duplicates must not be masked by a cross-record decision');
const noBorrowedHour = revisionRows(oldCurrent, { ...alternateCurrent, time: time(3) });
assert.equal(noBorrowedHour[0].record.hourly[0].currentUMps, oldCurrent.currentUMps,
  'an exact-hour retention rule never borrows another hour');
assert.equal(noBorrowedHour[1].record.hourly[0].currentUMps, alternateCurrent.currentUMps);

// Cache admission only inside one call. A later mutation must be revalidated.
const mutableCandidate = structuredClone(alternateCurrent);
revisionRows(oldCurrent, mutableCandidate);
mutableCandidate.currentSpeedMps = 0.8;
assert.throws(() => replayForAge(4, revisionRows(oldCurrent, mutableCandidate)),
  error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED');

// Protection is about the exact still-valid component, not how many runs
// ago it was selected. Keep each tuple atomic and retain independent waves.
let cumulative = withVerifiedWave(weather(2));
const originalCumulative = structuredClone(cumulative);
for (let generation = 0; generation < 10; generation += 1) {
  const candidate = { ...alternateCurrent, waterTemperatureC: 16,
    waveHeightM: null, wavePeriodS: null, waveDirectionDeg: null };
  const projected = revisionRows(cumulative, candidate);
  cumulative = projected[0].record.hourly[0];
  assert.deepEqual(cumulative, originalCumulative);
  assert.equal(projected[1].record.hourly[0].currentUMps, null);
  assert.equal(projected[1].record.hourly[0].currentVMps, null);
  assert.equal(projected[1].record.hourly[0].currentSpeedMps, null);
  assert.equal(projected[1].record.hourly[0].currentDirectionDeg, null);
  assert.equal(projected[1].record.hourly[0].waterTemperatureC, 16,
    'current retention must not alter any scalar component');
  assert.equal(replayForAge(4, projected).replayedHourCount, 1);
}

// Opt-in synthetic capacity measurement, deliberately separate from normal
// correctness testing. It exercises all 673 parts x 118 hours x 2 complete
// competing tuples, without providers, files, cache writes or score builds.
if (process.env.RAVRADAR_RECOVERY_PRIORITY_BENCHMARK === '1') {
  const previousRows = Array.from({ length: 118 }, (_, hour) => withVerifiedWave(weather(hour)));
  const nextRows = previousRows.map(row => alternateCurrentIdentity(alternateWaveIdentity({
    ...structuredClone(row), currentUMps: 0.11, currentSpeedMps: 0.11, waveHeightM: 1.3,
  })));
  const startedAt = performance.now();
  let retainedComponents = 0;
  for (let index = 0; index < 673; index += 1) {
    const benchmarkPart = { ...part, partId: `SYNTHETIC-BENCHMARK-${index}` };
    for (const row of [...previousRows, ...nextRows]) {
      row.currentProvenance.entityId = `PART::${benchmarkPart.partId}`;
      row.sources.wave.entityId = `PART::${benchmarkPart.partId}`;
    }
    const fallbackSource = { source: 'deployed-private-runtime', record: record(previousRows) };
    const projected = buildNewestValidRavScoreRecoverySources({
      fallbackSource,
      protectedPreviousSource: fallbackSource,
      preferredSource: { source: 'progressive-private-dmi', record: record(nextRows) },
      part: benchmarkPart,
      onProtectedSameRunDmiRetention: () => { retainedComponents += 1; },
    });
    assert.equal(projected[1].record.hourly.filter(row =>
      row.currentUMps === null && row.waveHeightM === null).length, 118);
  }
  assert.equal(retainedComponents, 673 * 118 * 2);
  console.log(JSON.stringify({
    test: 'SYNTHETIC_RECOVERY_PRIORITY_CAPACITY', parts: 673, hours: 118,
    competingComponents: retainedComponents,
    elapsedMs: Math.round(performance.now() - startedAt),
  }));
}

for (const labels of [['deployed', 'progressive'], ['progressive-private-dmi', 'deployed-private-runtime']]) {
  assert.throws(() => replayForAge(4, revisionRows(oldRevision, newRevision, labels)),
    error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');
}
const endpoints = (row, firstAt, secondAt) => ({
  ...row,
  currentProvenance: {
    ...row.currentProvenance,
    nativeSteps: [1, 3].map((hour, index) => ({
      ...row.currentProvenance.nativeSteps[0], nativeValidTime: time(hour),
      itemUpdatedAt: index === 0 ? firstAt : secondAt,
    })),
  },
});
const oldEndpoints = endpoints(oldRevision, time(-2), time(-2));
for (const invalidRevision of [
  endpoints(newRevision, time(-1), time(-3)),
  endpoints(newRevision, time(-1), undefined),
  { ...newRevision, currentProvenance: {
    ...newRevision.currentProvenance, provider: 'copernicus',
  } },
]) {
  const sources = revisionRows(oldEndpoints, invalidRevision);
  assert.notEqual(sources[0].record.hourly[0].currentUMps, null,
    'regressed, incomplete or foreign revision proof cannot erase the deployed component');
  assert.notEqual(sources[1].record.hourly[0].currentUMps, null,
    'unresolved evidence remains visible to the strict replay validator');
}
assert.throws(() => replayForAge(4, revisionRows(
  weather(2), weather(2, { speed: 0.11, rawU: 0.11 }),
  ['deployed-private-runtime', 'progressive-private-dmi'], false,
)), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
'source labels alone never prove a same-run revision');
assert.throws(() => replayForAge(4, [
  { source: 'deployed', record: record([weather(2, { modelRun: time(-48), waveHeight: 1.2 })]) },
  { source: 'progressive', record: record([weather(2, { modelRun: time(-48), waveHeight: 1.3 })]) },
]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
'different values from the same generic model run must remain a hard conflict');
assert.throws(() => replayForAge(4, [
  { source: 'deployed', record: record([weather(1), weather(2), weather(3)]) },
  { source: 'progressive', record: record([weather(2, { modelRun: time(-53) })]) },
]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');

const incomplete = [{ source: 'source-only', record: record([weather(1), weather(3)]) }];
const snapshot = JSON.stringify(incomplete);
const stateSnapshot = JSON.stringify(initialState);
for (let attempt = 0; attempt < 2; attempt += 1) {
  const partialRecovery = replayForAge(4, incomplete);
  assert.equal(partialRecovery.replayedHourCount, 2);
  const partialBuild = buildIntegratedPartScoreSeries({
    part,
    zone,
    hourly: partialRecovery.hourly,
    initialState,
    scoreStartAt: partialRecovery.scoreStartAt,
  });
  assert.equal(partialBuild.scores[0].ravScoreModel.modes.waders.scoreQuality,
    'HISTORY_INCOMPLETE',
    'a real gap must retain a conservative score without inventing the absent row');
  assert.equal(JSON.stringify(incomplete), snapshot);
  assert.equal(JSON.stringify(initialState), stateSnapshot);
}

assert.throws(() => replayForAge(73, [{
  source: 'too-old',
  record: record(Array.from({ length: 72 }, (_, index) => weather(index + 1))),
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_TOO_OLD');
assert.throws(() => replayForAge(4, [{
  source: 'wrong-point',
  record: { point: [8.1, 55], hourly: [weather(1), weather(2), weather(3)] },
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_SAMPLING_MISMATCH');
assert.throws(() => replayForAge(4, [{
  source: 'extra-coordinate',
  record: { point: [...part.waterPoint, 0], hourly: [weather(1), weather(2), weather(3)] },
}]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_SAMPLING_MISMATCH',
'a coordinate tuple with hidden extra dimensions must not match the sampling context');
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4).replace('Z', ''),
  sourceRecords: [{ source: 'timezone-free-target', record: record([weather(1), weather(2), weather(3)]) }],
  publicHourly: publicRows(4),
}), /not a valid time/, 'timezone-free replay references are ambiguous and must fail closed');
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState: { ...initialState, samplingContextKey: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  targetReferenceAt: time(4),
  sourceRecords: [{ source: 'context', record: record([weather(1), weather(2), weather(3)]) }],
  publicHourly: publicRows(4),
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONTEXT_MISMATCH');

const nativeRows = [
  weather(1),
  withoutCurrent(weather(2)),
  weather(3),
];
const dmiGapRecovery = buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4),
  sourceRecords: [{ source: 'dmi-must-not-authorize-hold', record: record(nativeRows) }],
  publicHourly: publicRows(4),
  nativeCadenceHoldHours: 3,
});
assert.equal(dmiGapRecovery.hourly[1].currentSpeedMps, null,
  'DMI→missing must remain an explicit unknown component, never a native hold');
const copernicusGapRecovery = buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4),
  sourceRecords: [{
    source: 'copernicus-must-not-authorize-hold',
    record: record([
      controlledLiveWeather(1),
      withoutCurrent(weather(2)),
      controlledLiveWeather(3),
    ]),
  }],
  publicHourly: publicRows(4),
  nativeCadenceHoldHours: 3,
});
assert.equal(copernicusGapRecovery.hourly[1].currentProvenance.reason,
  'bounded-unknown-history-interval',
  'Copernicus→missing must be bounded unknown, not silently held');
const revokedHoldRecovery = buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4),
  sourceRecords: [{
    source: 'regional-then-dmi-must-revoke-hold',
    record: record([
      regionalWeather(1),
      weather(2),
      withoutCurrent(weather(3)),
    ]),
  }],
  publicHourly: publicRows(4),
  nativeCadenceHoldHours: 3,
});
assert.equal(revokedHoldRecovery.hourly[2].currentProvenance.reason,
  'bounded-unknown-history-interval',
  'regional→DMI→missing must revoke native hold and preserve an unknown interval');

const regionalRows = [
  regionalWeather(1),
  stateOnlyHoldWeather(2, 1),
  regionalWeather(3),
];
const nativeRecovery = buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4),
  sourceRecords: [{ source: 'source-bound-regional-hold', record: record(regionalRows) }],
  publicHourly: publicRows(4),
  nativeCadenceHoldHours: 3,
});
assert.equal(nativeRecovery.replayedHourCount, 3);
assert.equal(nativeRecovery.hourly[1].currentSpeedMps, null,
  'a historical state-only marker must remain missing rather than inventing a current sample');
assert.equal(nativeRecovery.hourly[1].currentProvenance.reason,
  'bounded-unknown-history-interval',
  'target−48..target−1 must never become hold, even if a marker is injected');
assert.equal(Object.hasOwn(nativeRecovery.hourly[1], 'currentStateOnlyHold'), false,
  'recovery must strip state-only markers from historical rows');
assert.equal(nativeRecovery.hourly[0].currentProvenance.distanceKm, regionalDistanceKm,
  'the data-minimised replay row must preserve the exact regional distance authorization');
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4),
  sourceRecords: [],
  publicHourly: [
    withoutCurrent(weather(4)),
    stateOnlyHoldWeather(5, 4),
  ],
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: nativeBoundaryReference(regionalWeather(4)),
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_NATIVE_REFERENCE_INVALID',
'a neighbouring public hold marker must not authorize a reference at the replay boundary');
const nativeBuild = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: nativeRecovery.hourly,
  initialState,
  nativeCadenceHoldHours: 3,
  scoreStartAt: nativeRecovery.scoreStartAt,
});
assert.equal(nativeBuild.scores[0].time, time(4));
assert.equal(nativeBuild.scores[0].ravScoreModel.currentMemoryReady, false,
  'one real historical current gap must remain visible instead of being held');
assert.equal(nativeBuild.scores[0].ravScoreModel.modes.waders.available, true,
  'historical incompleteness must not remove a score with valid target inputs');
assert.equal(nativeBuild.scores[0].ravScoreModel.modes.waders.scoreQuality,
  'HISTORY_INCOMPLETE');
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4),
  sourceRecords: [{
    source: 'invalid-provenance-must-not-become-hold',
    record: record([
      weather(1),
      { ...weather(2), currentProvenance: { status: 'verified' } },
      weather(3),
    ]),
  }],
  publicHourly: publicRows(4),
  nativeCadenceHoldHours: 3,
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED');

const candidateState = buildCandidateGDerivedStateSeries(
  Array.from({ length: 49 }, (_, index) => ({
    time: time(index - 48),
    currentSpeedMps: 0.09,
    currentAlignment: 1,
    currentVerified: true,
    waveHeightM: 1.2,
    wavePeriodS: 7,
  })),
  { stateKey: candidateGStateKey(part) },
).continuationState;
assert.equal(
  ravScoreCandidateMigrationWaveBootstrapTargetAt(candidateState, time(4)),
  time(1),
  'Candidate migration wave target must be the first exact hour after its state',
);
assert.equal(
  ravScoreCandidateMigrationWaveBootstrapTargetAt(candidateState, time(0)),
  time(0),
  'a Candidate state already at the production target must keep that target',
);

function candidateStateWithCurrentReferenceLag(lagHours) {
  assert.ok([1, 2, 3].includes(lagHours));
  const stateKey = candidateGStateKey(part);
  const ready = buildCandidateGDerivedStateSeries(
    Array.from({ length: 49 }, (_, index) => ({
      time: time(index - 48),
      currentSpeedMps: 0.09,
      currentAlignment: 1,
      currentVerified: true,
      waveHeightM: 1.2,
      wavePeriodS: 7,
    })),
    { stateKey },
  );
  const held = buildCandidateGDerivedStateSeries(
    Array.from({ length: lagHours }, (_, index) => ({
      time: time(index + 1),
      currentSpeedMps: null,
      currentAlignment: null,
      currentVerified: false,
      waveHeightM: 1.2,
      wavePeriodS: 7,
    })),
    {
      stateKey,
      initialState: ready.continuationState,
      nativeCadenceHoldHours: 3,
    },
  );
  assert.equal(held.continuationState.time, time(lagHours));
  assert.equal(held.continuationState.transportReferenceAt, time(0));
  assert.equal(held.continuationState.transportMemoryReady, true);
  return held.continuationState;
}

function candidateLagWaveHistory(lagHours) {
  return Array.from(
    { length: RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours },
    (_, index) => weather(
      lagHours
        - RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours
        + index,
    ),
  );
}

function candidateLagMigrationFixture(lagHours, boundaryReference) {
  const laggedState = candidateStateWithCurrentReferenceLag(lagHours);
  const targetRow = stateOnlyHoldWeather(lagHours, 0);
  const waveHistory = candidateLagWaveHistory(lagHours);
  const recovery = buildRavScoreRecoveryReplay({
    part,
    initialState: laggedState,
    targetReferenceAt: time(lagHours),
    sourceRecords: [{ source: `candidate-lag-${lagHours}-wave-history`, record: record(waveHistory) }],
    publicHourly: [targetRow],
    nativeCadenceHoldHours: 3,
    nativeCadenceReferenceSample: boundaryReference,
  });
  return { laggedState, recovery };
}

for (const lagHours of [1, 2, 3]) {
  const boundaryReference = nativeBoundaryReference(regionalWeather(0));
  const { laggedState, recovery } = candidateLagMigrationFixture(
    lagHours,
    boundaryReference,
  );
  const sealedEvidence = JSON.stringify(laggedState.transportEvidence);
  assert.equal(recovery.replayedHourCount, 0,
    `${lagHours}h Candidate G lag at the exact target must not invent replay rows`);
  assert.equal(
    JSON.stringify(recovery.candidateGCurrentBootstrap.currentEvidence),
    sealedEvidence,
    `${lagHours}h Candidate G migration must preserve the sealed signed evidence`,
  );
  assert.equal(
    recovery.candidateGCurrentBootstrap.currentNativeHoldAuthorization,
    null,
    'the Candidate G bootstrap must not guess or carry an unattested hold authorization',
  );
  const migratedLag = buildIntegratedPartScoreSeries({
    part,
    zone,
    hourly: recovery.hourly,
    initialState: laggedState,
    candidateGCurrentBootstrap: recovery.candidateGCurrentBootstrap,
    candidateGWaveApproachBootstrap: recovery.candidateGWaveApproachBootstrap,
    nativeCadenceHoldHours: 3,
    nativeCadenceReferenceSample: boundaryReference,
    scoreStartAt: recovery.scoreStartAt,
  });
  assert.equal(migratedLag.ravScoreState.migrationApplied, true);
  assert.equal(migratedLag.ravScoreState.rows[0].currentTransition, 'NATIVE_CADENCE_HOLD');
  assert.equal(migratedLag.ravScoreState.rows[0].currentMemoryReady, true);
  assert.equal(
    JSON.stringify(migratedLag.ravScoreState.continuationState.currentEvidence),
    sealedEvidence,
    `${lagHours}h boundary proof must authorize hold without re-crediting sealed evidence`,
  );
  assert.deepEqual(
    migratedLag.ravScoreState.continuationState.currentNativeHoldAuthorization,
    {
      sourceClass: 'owner-approved-regional-proxy',
      source: 'dmi-dkss-lf-regional-proxy',
      collection: 'dkss_lf',
      distanceKm: regionalDistanceKm,
    },
    `${lagHours}h migration must retain only the compact regional hold authorization`,
  );
}

for (const lagHours of [1, 2, 3]) {
  const boundaryReference = nativeBoundaryReference(regionalWeather(0));
  const { laggedState, recovery } = candidateLagMigrationFixture(
    lagHours,
    boundaryReference,
  );
  assert.throws(
    () => buildIntegratedPartScoreSeries({
      part,
      zone,
      hourly: recovery.hourly,
      initialState: laggedState,
      candidateGCurrentBootstrap: recovery.candidateGCurrentBootstrap,
      candidateGWaveApproachBootstrap: recovery.candidateGWaveApproachBootstrap,
      nativeCadenceHoldHours: 3,
      nativeCadenceReferenceSample: null,
      scoreStartAt: recovery.scoreStartAt,
    }),
    /requires exact regional boundary proof/,
    `${lagHours}h lagged Candidate G hold without exact regional proof must fail closed`,
  );
}

for (const lagHours of [1, 2, 3]) {
  const laggedState = candidateStateWithCurrentReferenceLag(lagHours);
  const boundaryReference = nativeBoundaryReference(regionalWeather(0));
  const integratedResolverCalls = [];
  const candidateResolverCalls = [];
  const production = buildRavScoreProductionPartSeries({
    part,
    zone,
    initialSelection: {
      state: laggedState,
      source: 'CANDIDATE_G_MIGRATION',
      rejectedSources: [],
    },
    legacyCandidateGMigrationState: laggedState,
    targetReferenceAt: time(lagHours),
    recoverySources: [{
      source: `candidate-lag-${lagHours}-production-wave-history`,
      record: record(candidateLagWaveHistory(lagHours)),
    }],
    publicHourly: [stateOnlyHoldWeather(lagHours, 0)],
    nativeCadenceHoldHours: 3,
    resolveNativeCadenceReferenceSample: (sourceValidTime, context) => {
      integratedResolverCalls.push({ sourceValidTime, context });
      return boundaryReference;
    },
    resolveCandidateGNativeCadenceReferenceSample: (sourceValidTime, context) => {
      candidateResolverCalls.push({ sourceValidTime, context });
      return boundaryReference;
    },
  });
  const expectedCall = {
    sourceValidTime: time(0),
    context: {
      partId: part.partId,
      replayStartAt: time(lagHours),
      validTime: time(lagHours),
      sourceValidTime: time(0),
      holdAgeHours: lagHours,
    },
  };
  assert.deepEqual(integratedResolverCalls, [expectedCall],
    `${lagHours}h integrated resolver must receive only the marker's exact source time`);
  assert.deepEqual(candidateResolverCalls, [expectedCall],
    `${lagHours}h Candidate G resolver must receive only the marker's exact source time`);
  assert.equal(production.recovery.replayedHourCount, 0);
  assert.equal(production.ravScoreState.rows[0].currentTransition, 'NATIVE_CADENCE_HOLD');
  assert.equal(production.candidateGState.rows[0].currentTransition, 'NATIVE_CADENCE_HOLD');
}

{
  const lagHours = 2;
  const laggedState = candidateStateWithCurrentReferenceLag(lagHours);
  let resolverSourceTime = null;
  assert.throws(() => buildRavScoreProductionPartSeries({
    part,
    zone,
    initialSelection: {
      state: laggedState,
      source: 'CANDIDATE_G_MIGRATION',
      rejectedSources: [],
    },
    legacyCandidateGMigrationState: laggedState,
    targetReferenceAt: time(lagHours),
    recoverySources: [{
      source: 'candidate-lag-production-missing-boundary-source',
      record: record(candidateLagWaveHistory(lagHours)),
    }],
    publicHourly: [stateOnlyHoldWeather(lagHours, 0)],
    nativeCadenceHoldHours: 3,
    resolveNativeCadenceReferenceSample: sourceValidTime => {
      resolverSourceTime = sourceValidTime;
      return null;
    },
  }), /requires exact regional boundary proof/,
  'a missing independently verified source row must fail closed, never reconstruct from hashes');
  assert.equal(resolverSourceTime, time(0),
    'even a missing boundary source lookup must use marker.sourceValidTime');
}

{
  const lagHours = 2;
  const boundaryReference = nativeBoundaryReference(regionalWeather(0));
  const { laggedState, recovery } = candidateLagMigrationFixture(
    lagHours,
    boundaryReference,
  );
  const buildLaggedMigration = nativeCadenceReferenceSample =>
    buildIntegratedPartScoreSeries({
      part,
      zone,
      hourly: recovery.hourly,
      initialState: laggedState,
      candidateGCurrentBootstrap: recovery.candidateGCurrentBootstrap,
      candidateGWaveApproachBootstrap: recovery.candidateGWaveApproachBootstrap,
      nativeCadenceHoldHours: 3,
      nativeCadenceReferenceSample,
      scoreStartAt: recovery.scoreStartAt,
    });
  assert.throws(
    () => buildLaggedMigration(nativeBoundaryReference(regionalWeather(0, { rawU: 0.03 }))),
    /conflicts with persisted evidence/,
    'a regional boundary sample whose signed strength differs from sealed evidence must fail closed',
  );
  assert.throws(() => candidateLagMigrationFixture(lagHours, {
    ...boundaryReference,
    currentProvenance: {
      ...boundaryReference.currentProvenance,
      source: 'unapproved-regional-source',
    },
  }), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_NATIVE_REFERENCE_INVALID',
  'a boundary sample with wrong regional provenance must fail before migration');
  assert.throws(() => candidateLagMigrationFixture(
    lagHours,
    nativeBoundaryReference(regionalWeather(-2)),
  ), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_NATIVE_REFERENCE_INVALID',
  'a regional boundary sample older than the three-hour gate must fail before migration');
}

const candidateExactRows = Array.from({ length: 52 }, (_, index) => {
  const hour = index - 48;
  const rawU = hour === 0 ? 0.035 : 0.0349;
  return weather(hour, {
    speed: hour === 0 ? 0.04 : 0.03,
    rawU,
    rawV: 0,
  });
});
assert.equal(ravScoreRecoverySourceStartAt(candidateState, time(4)), time(-39),
  'migration must request only the 40-hour bounded wave-approach bridge before its first replay hour');
const candidateRecovery = buildRavScoreRecoveryReplay({
  part,
  initialState: candidateState,
  targetReferenceAt: time(4),
  sourceRecords: [{
    source: 'verified-private-raw-uv-candidate-migration',
    record: record(candidateExactRows),
  }],
  publicHourly: publicRows(4),
});
assert.equal(candidateRecovery.coldStartBootstrapApplied, false);
assert.equal(candidateRecovery.replayedHourCount, 3);
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.source,
  RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource);
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.sourceStateTime, candidateState.time);
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.currentReferenceAt,
  candidateState.transportReferenceAt);
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.currentEvidence.length, 49);
assert.equal(candidateRecovery.candidateGWaveApproachBootstrap?.source,
  'VERIFIED_PRIVATE_DMI_WAVE_DIRECTION_REPLAY');
assert.equal(candidateRecovery.candidateGWaveApproachBootstrap?.rows.length, 40);
assert.equal(candidateRecovery.candidateGWaveApproachBootstrap?.targetReferenceAt, time(1));
assert.equal(candidateRecovery.candidateGWaveApproachBootstrap?.rows[0].time, time(-39));
assert.equal(candidateRecovery.candidateGWaveApproachBootstrap?.rows.at(-1).time, time(0));
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState: candidateState,
  targetReferenceAt: time(4),
  sourceRecords: [{
    source: 'private-direction-gap-must-not-be-filled-from-public',
    record: record(candidateExactRows.map(row => row.time === time(-20)
      ? { ...row, waveDirectionDeg: null }
      : row)),
  }],
  publicHourly: publicRows(4),
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED',
'an active private direction gap must fail closed and may not be filled from public rows');
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState: candidateState,
  targetReferenceAt: time(4),
  sourceRecords: [{
    source: 'reconstructed-or-fallback-direction-must-not-bootstrap',
    record: record(candidateExactRows.map(row => row.time === time(-20)
      ? { ...row, sources: { ...row.sources, wave: { ...row.sources.wave, fallback: true } } }
      : row)),
  }],
  publicHourly: publicRows(4),
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED',
'fallback/reconstructed wave provenance must never enter exact migration history');
assert.deepEqual(
  candidateRecovery.candidateGCurrentBootstrap?.currentEvidence,
  candidateState.transportEvidence,
  'the integrated kernel must reweight the exact sealed Candidate G signed evidence',
);
const forbiddenPrivateStateKey = /currentumps|currentvmps|\b(?:u|v)mps\b|gridpoint|samplingpoint|waterpoint|coordinates?|latitude|longitude/i;
assert.equal(forbiddenPrivateStateKey.test(JSON.stringify(candidateRecovery.candidateGCurrentBootstrap)), false,
  'the migration bootstrap must not retain raw vectors or coordinates');
const candidateMigrationBuild = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: candidateRecovery.hourly,
  initialState: candidateState,
  candidateGCurrentBootstrap: candidateRecovery.candidateGCurrentBootstrap,
  candidateGWaveApproachBootstrap: candidateRecovery.candidateGWaveApproachBootstrap,
  scoreStartAt: candidateRecovery.scoreStartAt,
});
assert.equal(candidateMigrationBuild.ravScoreState.initialStateSource,
  'CANDIDATE_G_SCHEMA2_MIGRATION');
assert.equal(candidateMigrationBuild.ravScoreState.migrationApplied, true);
assert.equal(candidateMigrationBuild.ravScoreState.rows[0].waveTransition,
  'MIGRATED_FROM_CANDIDATE_G',
  'migration v2 must preserve Candidate G wave mobilisation as the first transition seed');
assert.equal(
  candidateMigrationBuild.ravScoreState.rows[0].mobilisationPotential,
  candidateState.mobilisationPotential,
  'the integrated wave path must begin from the validated Candidate G seed',
);
assert.ok(Number.isFinite(
  candidateMigrationBuild.ravScoreState.continuationState
    .rollbackCandidateGMobilisationPotential,
), 'the separately recoverable Candidate G wave path must survive migration and replay');
assert.equal(candidateMigrationBuild.scores[0].time, time(4));
assert.equal(candidateMigrationBuild.scores[0].ravScoreModel.currentMemoryReady, true);
assert.equal(candidateMigrationBuild.scores[0].ravScoreModel.waveMemoryReady, true);
assert.equal(
  forbiddenPrivateStateKey.test(JSON.stringify(
    candidateMigrationBuild.ravScoreState.continuationState,
  )),
  false,
  'integrated continuation state must remain free of raw vectors and coordinates',
);

const preboundaryHours = [
  -49,
  ...Array.from({ length: 51 }, (_, index) => index - 47),
];
const preboundaryRecovery = buildRavScoreRecoveryReplay({
  part,
  initialState: candidateState,
  targetReferenceAt: time(4),
  sourceRecords: [{
    source: 'verified-private-one-real-preboundary-bridge',
    record: record(preboundaryHours.map(hour => weather(hour, {
      speed: 0.03,
      rawU: 0.0349,
      rawV: 0,
    }))),
  }],
  publicHourly: publicRows(4),
});
assert.equal(preboundaryRecovery.candidateGCurrentBootstrap?.currentEvidence.length, 49);
assert.deepEqual(
  preboundaryRecovery.candidateGCurrentBootstrap?.currentEvidence,
  candidateState.transportEvidence,
  'extra raw-current source rows must not replace or extend the sealed Candidate G evidence',
);
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState: {
    ...candidateState,
    transportPotential: candidateState.transportPotential > 50
      ? candidateState.transportPotential - 1
      : candidateState.transportPotential + 1,
  },
  targetReferenceAt: time(4),
  sourceRecords: [{ source: 'invalid-candidate-metadata', record: record(candidateExactRows) }],
  publicHourly: publicRows(4),
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CANDIDATE_G_INVALID',
'Candidate metadata that contradicts its quantized evidence oracle must fail before exact rebuild');
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState: { ...candidateState, time: time(5) },
  targetReferenceAt: time(4),
  sourceRecords: [{ source: 'future-candidate-state', record: record(candidateExactRows) }],
  publicHourly: publicRows(4),
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_FUTURE_STATE',
'a future Candidate state must fail closed before migration input is consumed');
const existingPart = {
  ravScoreModel: { currentState: initialState },
  candidateG: { currentState: candidateState },
};
const checkpointStates = { [part.partId]: initialState };
const pointStateInjections = { [part.partId]: initialState };
assert.equal(selectRavScoreInitialState({
  part, pointStateInjections, existingPart, checkpointStates,
}).source, 'POINT_ACTIVATION');
assert.equal(selectRavScoreInitialState({
  part, existingPart, checkpointStates,
}).source, 'EXISTING_INTEGRATED');
assert.equal(selectRavScoreInitialState({
  part, existingPart: { candidateG: existingPart.candidateG }, checkpointStates,
}).source, 'INTEGRATED_CHECKPOINT');
assert.equal(selectRavScoreInitialState({
  part, existingPart: { candidateG: existingPart.candidateG }, checkpointStates: {},
}).source, 'CANDIDATE_G_MIGRATION');
const integratedStateLessRecoveryMode =
  RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.integratedStateLessRecovery;
const stateLessRecoveryFromExisting = selectRavScoreInitialState({
  part,
  existingPart,
  checkpointStates,
  targetReferenceAt: time(4),
  candidateGBootstrapMode: integratedStateLessRecoveryMode,
});
assert.equal(stateLessRecoveryFromExisting.source, 'EXISTING_INTEGRATED');
assert.equal(stateLessRecoveryFromExisting.state, initialState,
  'state-less recovery mode must still prefer a fresh exact integrated continuation');
const stateLessRecoveryFromAbsence = selectRavScoreInitialState({
  part,
  existingPart: null,
  checkpointStates: {},
  targetReferenceAt: time(4),
  candidateGBootstrapMode: integratedStateLessRecoveryMode,
});
assert.deepEqual(stateLessRecoveryFromAbsence, {
  state: null,
  source: 'COLD_START',
  rejectedSources: [],
  expiredSources: [],
  candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
}, 'explicit integrated state-less recovery must attest only measured cold replay');
assert.equal(
  Object.keys(stateLessRecoveryFromAbsence)
    .some(key => /synthetic|interpolat|reconstruct/i.test(key)),
  false,
  'state-less recovery selection must not authorize synthesis, interpolation or reconstruction',
);
assert.throws(() => selectRavScoreInitialState({
  part,
  existingPart: { candidateG: existingPart.candidateG },
  checkpointStates: {},
  targetReferenceAt: time(4),
  candidateGBootstrapMode: integratedStateLessRecoveryMode,
}), error => error?.code
  === 'RAVSCORE_INTEGRATED_STATE_LESS_RECOVERY_CANDIDATE_ONLY',
'integrated state-less recovery must never accept or migrate Candidate G-only state');
assert.throws(() => selectRavScoreInitialState({
  part,
  existingPart: {
    ...existingPart,
    ravScoreModel: {
      currentState: { ...initialState, modelBundleSha256: 'invalid' },
    },
  },
  checkpointStates,
  targetReferenceAt: time(4),
  candidateGBootstrapMode: integratedStateLessRecoveryMode,
}), error => error?.code === 'RAVSCORE_INITIAL_STATE_SOURCES_INVALID',
'state-less recovery must not mask an invalid present integrated state with a valid checkpoint');
assert.throws(() => selectRavScoreInitialState({
  part,
  existingPart,
  checkpointStates: {
    [part.partId]: { ...initialState, samplingContextKey: 'sha256:invalid' },
  },
  targetReferenceAt: time(4),
  candidateGBootstrapMode: integratedStateLessRecoveryMode,
}), error => error?.code === 'RAVSCORE_INITIAL_STATE_SOURCES_INVALID',
'state-less recovery must fail when any present integrated checkpoint is invalid');
const stateLessRecoveryFromExpiredIntegrated = selectRavScoreInitialState({
  part,
  existingPart,
  checkpointStates: {},
  targetReferenceAt: time(73),
  candidateGBootstrapMode: integratedStateLessRecoveryMode,
});
assert.deepEqual(stateLessRecoveryFromExpiredIntegrated, {
  state: null,
  source: 'COLD_START',
  rejectedSources: [],
  expiredSources: ['EXISTING_INTEGRATED_EXPIRED'],
  candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
}, 'a legitimate expired integrated state must become measured-only cold replay');
const stateLessRecoveryFromExpiredCheckpoint = selectRavScoreInitialState({
  part,
  existingPart: null,
  checkpointStates,
  targetReferenceAt: time(73),
  candidateGBootstrapMode: integratedStateLessRecoveryMode,
});
assert.deepEqual(stateLessRecoveryFromExpiredCheckpoint, {
  state: null,
  source: 'COLD_START',
  rejectedSources: [],
  expiredSources: ['INTEGRATED_CHECKPOINT_EXPIRED'],
  candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
}, 'a legitimate expired integrated checkpoint must become measured-only cold replay');
assert.throws(() => selectRavScoreInitialState({
  part,
  existingPart: null,
  checkpointStates: {},
  candidateGBootstrapMode: integratedStateLessRecoveryMode,
  candidateGSourceValidated: true,
}), error => error?.code === 'RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_INVALID',
'state-less recovery must not reuse the aggregate Candidate G first-cutover attestation');
const warmupCandidateState = buildCandidateGDerivedStateSeries(
  Array.from({ length: 6 }, (_, index) => ({
    time: time(index - 5),
    currentSpeedMps: 0.09,
    currentAlignment: 1,
    currentVerified: true,
    waveHeightM: 1.2,
    wavePeriodS: 7,
  })),
  { stateKey: candidateGStateKey(part) },
).continuationState;
assert.equal(warmupCandidateState.transportMemoryReady, false);
const attestedColdSelection = selectRavScoreInitialState({
  part,
  existingPart: { candidateG: { currentState: warmupCandidateState } },
  checkpointStates: {},
  candidateGBootstrapMode: 'genuine-cold-start',
  candidateGSourceValidated: true,
});
assert.equal(attestedColdSelection.source, 'COLD_START');
assert.equal(attestedColdSelection.state, null);
assert.equal(
  attestedColdSelection.candidateGSourceDisposition,
  'VALIDATED_ROLLBACK_ORACLE_REBUILT_FROM_MEASURED_HISTORY',
);
assert.throws(() => selectRavScoreInitialState({
  part,
  existingPart: { candidateG: { currentState: warmupCandidateState } },
  checkpointStates: {},
  candidateGBootstrapMode: 'genuine-cold-start',
  candidateGSourceValidated: false,
}), error => error?.code === 'RAVSCORE_FIRST_CUTOVER_COLD_START_UNATTESTED',
'an explicit cold start must never mask a Candidate G source that lacks aggregate attestation');
assert.throws(() => selectRavScoreInitialState({
  part,
  existingPart: { candidateG: { currentState: warmupCandidateState } },
  checkpointStates: {},
}), error => error?.code === 'RAVSCORE_INITIAL_STATE_SOURCES_INVALID',
'canonical warmup remains fail-closed unless the aggregate first-cutover resolver selected cold start');
const fallbackFromInvalidExisting = selectRavScoreInitialState({
  part,
  existingPart: {
    ravScoreModel: {
      currentState: { ...initialState, modelBundleSha256: 'invalid' },
    },
    candidateG: existingPart.candidateG,
  },
  checkpointStates,
});
assert.equal(fallbackFromInvalidExisting.source, 'INTEGRATED_CHECKPOINT');
assert.deepEqual(fallbackFromInvalidExisting.rejectedSources, ['EXISTING_INTEGRATED_INVALID']);
const fallbackFromInvalidIntegratedSources = selectRavScoreInitialState({
  part,
  existingPart: {
    ravScoreModel: {
      currentState: { ...initialState, modelBundleSha256: 'invalid' },
    },
    candidateG: existingPart.candidateG,
  },
  checkpointStates: {
    [part.partId]: { ...initialState, samplingContextKey: 'sha256:invalid' },
  },
});
assert.equal(fallbackFromInvalidIntegratedSources.source, 'CANDIDATE_G_MIGRATION');
assert.deepEqual(fallbackFromInvalidIntegratedSources.rejectedSources, [
  'EXISTING_INTEGRATED_INVALID',
  'INTEGRATED_CHECKPOINT_INVALID',
]);
assert.throws(() => selectRavScoreInitialState({
  part,
  existingPart: {
    ravScoreModel: {
      currentState: { ...initialState, modelBundleSha256: 'invalid' },
    },
    candidateG: {
      currentState: { ...candidateState, transportPotential: 101 },
    },
  },
  checkpointStates: {
    [part.partId]: { ...initialState, samplingContextKey: 'sha256:invalid' },
  },
}), error => error?.code === 'RAVSCORE_INITIAL_STATE_SOURCES_INVALID',
'present but invalid state sources must never be masked as a cold start');
assert.equal(selectRavScoreInitialState({
  part,
  existingPart: null,
  checkpointStates: {},
}).source, 'COLD_START', 'bounded cold bootstrap is reserved for genuinely absent state');
const expiredIntegratedSelection = selectRavScoreInitialState({
  part,
  existingPart: { ravScoreModel: { currentState: initialState } },
  checkpointStates: {},
  targetReferenceAt: time(73),
});
assert.equal(expiredIntegratedSelection.source, 'COLD_START');
assert.deepEqual(expiredIntegratedSelection.rejectedSources, []);
assert.deepEqual(
  expiredIntegratedSelection.expiredSources,
  ['EXISTING_INTEGRATED_EXPIRED'],
  'a valid same-model continuation outside 72 hours is absence, not corruption',
);
const freshDirectAfterExpiredState = buildRavScoreRecoveryReplay({
  part,
  initialState: expiredIntegratedSelection.state,
  targetReferenceAt: time(73),
  sourceRecords: [],
  publicHourly: [73, 74, 75].map(hour => weather(hour, { modelRun:time(20) })),
});
assert.equal(expiredIntegratedSelection.state, null);
assert.equal(
  freshDirectAfterExpiredState.coldStartHistoryLineage.completeCausalPositionCount,
  0,
);
assert.equal(freshDirectAfterExpiredState.scoreStartAt, time(73));
assert.throws(() => selectRavScoreInitialState({
  part,
  pointStateInjections: {
    [part.partId]: {
      ...initialState,
      samplingContextKey: ravScoreSamplingContextKey({ ...part, waterPoint: [8.1, 55] }),
    },
  },
  existingPart,
  checkpointStates,
}), error => error?.code === 'RAVSCORE_POINT_ACTIVATION_CONTEXT_MISMATCH');

const coldReplayFixture = ({ historyRows, targetRow = weather(4) }) => {
  const recovery = buildRavScoreRecoveryReplay({
    part,
    initialState: null,
    targetReferenceAt: time(4),
    sourceRecords: historyRows.length
      ? [{ source: 'verified-private-partial-history', record: record(historyRows) }]
      : [],
    publicHourly: [targetRow, weather(5), weather(6)],
  });
  const built = buildIntegratedPartScoreSeries({
    part,
    zone,
    hourly: recovery.hourly,
    initialState: null,
    scoreStartAt: recovery.scoreStartAt,
    coldReplayBootstrap: recovery.coldStartHistoryLineage,
  });
  return { recovery, built };
};

for (const completeHours of [0, 5, 47, 48]) {
  const historyRows = Array.from(
    { length: completeHours },
    (_, index) => weather(4 - completeHours + index),
  );
  const { recovery, built } = coldReplayFixture({ historyRows });
  assert.equal(recovery.replayedHourCount, completeHours);
  assert.equal(recovery.coldStartHistoryLineage.expectedCausalPositionCount, 48);
  assert.equal(recovery.coldStartHistoryLineage.completeCausalPositionCount, completeHours);
  assert.equal(recovery.coldStartHistoryLineage.boundedUnknownPositionCount,
    48 - completeHours);
  assert.equal(
    recovery.coldStartHistoryLineage.completeCausalPositionCount
      + recovery.coldStartHistoryLineage.boundedUnknownPositionCount,
    48,
  );
  assert.equal(built.scores[0].ravScoreModel.modes.waders.available, true);
  assert.equal(built.scores[0].ravScoreModel.modes.waders.scoreQuality,
    'HISTORY_INCOMPLETE',
    `${completeHours} verified cold hours must score conservatively as HISTORY_INCOMPLETE`);
}

const gappedCold = coldReplayFixture({
  historyRows: [-44, -43, -21, -2, 3].map(weather),
});
assert.equal(gappedCold.recovery.replayedHourCount, 5);
assert.equal(gappedCold.recovery.coldStartHistoryLineage.completeCausalPositionCount, 5);
assert.equal(gappedCold.recovery.coldStartHistoryLineage.historyTransition,
  'UNKNOWN_HISTORY_INTERVAL');
assert.deepEqual(gappedCold.recovery.hourly.slice(0, 5).map(row => row.time),
  [-44, -43, -21, -2, 3].map(time),
  'gapped cold replay must retain only the five real rows');

const currentOnly = {
  ...weather(-2),
  waveHeightM: null,
  wavePeriodS: null,
  waveDirectionDeg: null,
};
const waveOnly = withoutCurrent(weather(-1));
const componentPartialCold = coldReplayFixture({ historyRows: [currentOnly, waveOnly] });
assert.equal(componentPartialCold.recovery.replayedHourCount, 2);
assert.equal(componentPartialCold.recovery.coldStartHistoryLineage.completeCausalPositionCount, 0);
assert.equal(componentPartialCold.recovery.coldStartHistoryLineage.boundedUnknownPositionCount, 48);
assert.equal(componentPartialCold.recovery.hourly[0].waveHeightM, null);
assert.equal(componentPartialCold.recovery.hourly[1].currentSpeedMps, null);
assert.equal(componentPartialCold.built.scores[0].ravScoreModel.modes.beach.scoreQuality,
  'HISTORY_INCOMPLETE');

const missingCurrentTarget = coldReplayFixture({
  historyRows: [],
  targetRow: withoutCurrent(weather(4)),
});
assert.equal(missingCurrentTarget.built.scores[0].ravScoreModel.modes.waders.scoreQuality,
  'UNAVAILABLE');
const missingWaveTarget = coldReplayFixture({
  historyRows: [],
  targetRow: {
    ...weather(4),
    waveHeightM: null,
    wavePeriodS: null,
    waveDirectionDeg: null,
  },
});
assert.equal(missingWaveTarget.built.scores[0].ravScoreModel.modes.waders.scoreQuality,
  'UNAVAILABLE');
const missingHuntabilityTarget = coldReplayFixture({
  historyRows: [],
  targetRow: { ...weather(4), windSpeedMps: null },
});
assert.equal(missingHuntabilityTarget.built.scores[0].ravScoreModel.modes.beach.scoreQuality,
  'UNAVAILABLE');
const missingWaveDirectionTarget = coldReplayFixture({
  historyRows: [],
  targetRow: { ...weather(4), waveDirectionDeg: null },
});
assert.equal(missingWaveDirectionTarget.built.scores[0].ravScoreModel.modes.beach.scoreQuality,
  'UNAVAILABLE');
const targetState = componentPartialCold.built.ravScoreState.rows
  .find(row => row.time === time(4));
const tamperedHistoryState = structuredClone(targetState);
tamperedHistoryState.historyScoreView.coverageHours = null;
const tamperedHistoryResult = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone,
  weather: weather(4),
}, { state: tamperedHistoryState });
assert.equal(tamperedHistoryResult.scoreQuality, 'UNAVAILABLE');
assert.equal(tamperedHistoryResult.historyCoverageHours, null);
assert.equal(tamperedHistoryResult.conservativeTailResetApplied, false,
  'invalid incomplete-history coverage must fail closed as clean UNAVAILABLE');

const coldStart = buildRavScoreRecoveryReplay({
  part,
  initialState: null,
  targetReferenceAt: time(4),
  sourceRecords: [{
    source: 'existing-verified-private-cache',
    record: record(Array.from({ length: 48 }, (_, index) => weather(index - 44))),
  }],
  publicHourly: [
    weather(3),
    { ...weather(4), time: '2026-08-29T04:00:00Z' },
    weather(5),
    weather(6),
  ],
});
assert.equal(coldStart.coldStartBootstrapApplied, true);
assert.equal(coldStart.replayedHourCount, 48);
assert.deepEqual(coldStart.coldStartHistoryLineage, {
  recoveryId: RAVSCORE_COLD_REPLAY_ID,
  expectedCausalPositionCount: 48,
  completeCausalPositionCount: 48,
  boundedUnknownPositionCount: 0,
  historyTransition: RAVSCORE_RECOVERY_POLICY.completeHistoryTransition,
  targetReferenceAt: time(4),
});
assert.deepEqual(coldStart.hourly.slice(-3).map(row => row.time), [time(4), time(5), time(6)],
  'cold start must use verified private cache, not pre-target public rows, as history');
assert.equal(coldStart.hourly[0].time, time(-44));
const coldStartBuild = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: coldStart.hourly,
  initialState: null,
  scoreStartAt: coldStart.scoreStartAt,
  coldReplayBootstrap: coldStart.coldStartHistoryLineage,
});
assert.equal(coldStartBuild.scores[0].time, time(4));
assert.equal(coldStartBuild.scores[0].ravScoreModel.currentMemoryReady, true,
  'cold-start bootstrap must be current-ready at the first public target hour');
assert.equal(coldStartBuild.scores[0].ravScoreModel.waveMemoryReady, true,
  'cold-start bootstrap must be wave-ready at the first public target hour');
assert.equal(
  coldStartBuild.ravScoreState.initialStateSource,
  'VERIFIED_PRIVATE_48H_COLD_REPLAY',
  'a real cold bootstrap must remain distinguishable from migration and continuation',
);
assert.equal(coldStartBuild.scores[0].ravScoreModel.modes.waders.scoreQuality,
  'HISTORY_INCOMPLETE',
  'even exact 48-hour cold replay must remain incomplete until the 288-hour wave tail closes');
assert.throws(() => reconstructCandidateGRollbackState(
  coldStartBuild.ravScoreState.continuationState,
  { candidateGStateKey: candidateGStateKey(part) },
), /requires FULL_HISTORY integrated state/,
'Candidate G rollback reconstruction must reject an otherwise READY cold state with open history');
const candidateCompanionAt = referenceHour => buildCandidateGDerivedStateSeries(
  Array.from({ length: 49 }, (_, index) => ({
    time: time(referenceHour - 48 + index),
    currentSpeedMps: 0.09,
    currentAlignment: 1,
    currentVerified: true,
    waveHeightM: 1.2,
    wavePeriodS: 7,
  })),
  { stateKey: candidateGStateKey(part) },
).continuationState;
const coldRollbackCompanion = candidateCompanionAt(-45);
const coldProduction = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: { state: null, source: 'COLD_START', rejectedSources: [] },
  targetReferenceAt: time(4),
  recoverySources: [{
    source: 'existing-verified-private-cache',
    record: record(Array.from({ length: 48 }, (_, index) => weather(index - 44))),
  }],
  publicHourly: [weather(4), weather(5), weather(6)],
  previousCandidateGContinuation: coldRollbackCompanion,
});
const measuredColdRollbackProduction = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: {
    state: null,
    source: 'COLD_START',
    rejectedSources: [],
    candidateGSourceDisposition:
      'VALIDATED_ROLLBACK_ORACLE_REBUILT_FROM_MEASURED_HISTORY',
  },
  targetReferenceAt: time(4),
  recoverySources: [{
    source: 'existing-verified-private-cache',
    record: record(Array.from({ length: 48 }, (_, index) => weather(index - 44))),
  }],
  publicHourly: [weather(4), weather(5), weather(6)],
  candidateGRollbackMeasuredColdStart: true,
});
assert.equal(
  measuredColdRollbackProduction.candidateGState.initialStateSource,
  'VERIFIED_MEASURED_COLD_START',
);
assert.equal(
  measuredColdRollbackProduction.candidateGRollbackScores[0]
    .candidateG.transportMemoryReady,
  true,
  'the separate rollback oracle must become READY only from its own complete measured replay',
);
const partialMeasuredColdRollbackProduction = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: {
    state: null,
    source: 'COLD_START',
    rejectedSources: [],
    candidateGSourceDisposition:
      'VALIDATED_ROLLBACK_ORACLE_REBUILT_FROM_MEASURED_HISTORY',
  },
  targetReferenceAt: time(4),
  recoverySources: [{
    source: 'measured-cold-start-with-one-boundary-hour-missing',
    record: record(Array.from({ length: 47 }, (_, index) => weather(index - 43))),
  }],
  publicHourly: [weather(4), weather(5), weather(6)],
  candidateGRollbackMeasuredColdStart: true,
});
assert.equal(
  partialMeasuredColdRollbackProduction.candidateGState.initialStateSource,
  'VERIFIED_MEASURED_COLD_START',
);
assert.equal(
  partialMeasuredColdRollbackProduction.candidateGRollbackScores[0]
    .candidateG.transportMemoryReady,
  false,
  'measured cold-start rollback memory must remain non-READY without the boundary hour',
);
assert.equal(
  partialMeasuredColdRollbackProduction.candidateGRollbackScores[0]
    .candidateG.transportMemoryStatus,
  'WINDOW_INCOMPLETE',
);
assert.equal(
  partialMeasuredColdRollbackProduction.candidateGRollbackScores[0]
    .candidateG.transportMemoryCoverageHours,
  47,
);
for (const mode of ['waders', 'beach']) {
  const candidate = partialMeasuredColdRollbackProduction.candidateGRollbackScores[0]
    .candidateG.modes[mode];
  const unavailable = partialMeasuredColdRollbackProduction.candidateGRollbackScores[0]
    .candidateG.publicModes[mode];
  assert.equal(candidate.available, true,
    'the private measured oracle may retain its numeric warmup calculation');
  assert.equal(unavailable.available, false,
    'a non-READY measured oracle must not expose a rollback score');
  assert.equal(unavailable.score, null);
  assert.equal(unavailable.scoreQuality, 'UNAVAILABLE');
  assert.equal(unavailable.unavailability.code, 'WINDOW_INCOMPLETE');
  assert.equal(unavailable.calibrationEligible, false);
}
assert.deepEqual(
  partialMeasuredColdRollbackProduction.scores.map(row => row.time),
  partialMeasuredColdRollbackProduction.candidateGRollbackScores.map(row => row.time),
  'integrated and measured rollback warmup rows must retain exact time parity',
);
assert.equal(
  partialMeasuredColdRollbackProduction.scores[0]
    .ravScoreModel.modes.waders.scoreQuality,
  'HISTORY_INCOMPLETE',
  'the integrated score must continue honestly while rollback memory warms up',
);
assert.throws(() => buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: { state: null, source: 'COLD_START', rejectedSources: [] },
  targetReferenceAt: time(4),
  recoverySources: [],
  publicHourly: [weather(4)],
  previousCandidateGContinuation: coldRollbackCompanion,
  candidateGRollbackMeasuredColdStart: true,
}), /one exclusive Candidate G rollback initialization path/,
'measured rollback cold start must never be hybridized with a continuation');
assert.throws(() => buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: {
    state: null,
    source: 'COLD_START',
    rejectedSources: [],
  },
  targetReferenceAt: time(4),
  recoverySources: [],
  publicHourly: [weather(4)],
  candidateGRollbackMeasuredColdStart: true,
}), /one exclusive Candidate G rollback initialization path/,
'a measured rollback cold start flag requires the aggregate-attested source disposition');
assert.throws(() => buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: {
    state: coldRollbackCompanion,
    source: 'EXISTING_PART',
    rejectedSources: [],
    candidateGSourceDisposition:
      'VALIDATED_ROLLBACK_ORACLE_REBUILT_FROM_MEASURED_HISTORY',
  },
  targetReferenceAt: time(4),
  recoverySources: [],
  publicHourly: [weather(4)],
  candidateGRollbackMeasuredColdStart: true,
}), /one exclusive Candidate G rollback initialization path/,
'a forged disposition may not turn an existing continuation into measured cold start');
assert.equal(coldProduction.recovery.coldStartBootstrapApplied, true);
assert.equal(coldProduction.recovery.replayedHourCount, 48);
const exactPrivateColdTimes = Array.from(
  { length: 48 },
  (_, index) => time(index - 44),
);
assert.deepEqual(
  coldProduction.recovery.hourly.slice(0, 48).map(row => row.time),
  exactPrivateColdTimes,
  'cold production must use exactly target-48h..target-1h as its private bridge',
);
assert.equal(
  coldProduction.recovery.hourly[48].time,
  time(4),
  'the real public target row must close the private 48-hour bridge',
);
assert.deepEqual(
  coldProduction.scores.map(row => row.time),
  coldProduction.candidateGRollbackScores.map(row => row.time),
  'state-less integrated replay and the separate Candidate G companion must cover the same public times',
);
assert.equal(
  coldProduction.candidateGState.initialStateSource,
  'PREVIOUS_PRIVATE_ROLLBACK',
  'rollback must identify the separate protected companion as its source',
);
assert.equal(coldProduction.scores[0].ravScoreModel.currentMemoryReady, true);
assert.equal(coldProduction.scores[0].ravScoreModel.waveMemoryReady, true);
assert.equal(coldProduction.candidateGRollbackScores[0].candidateG.transportMemoryReady, true);
assert.equal(coldProduction.candidateGState.initialStateAccepted, true);
assert.equal(coldProduction.candidateGState.initialStateResetReason, null);
assert.equal(
  coldProduction.candidateGState.rows[0].currentTransition,
  'INBOUND_BUILDUP',
  'the separate Candidate G companion must causally replay real rows without schema-6 reconstruction',
);
const directTargetRollback = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: coldProduction.recovery.hourly,
  previousCandidateGContinuation: coldRollbackCompanion,
  scoreStartAt: time(4),
});
assert.equal(
  JSON.stringify(coldProduction.candidateGRollbackScores[0]),
  JSON.stringify(directTargetRollback.scores[0]),
  'cold production first public Candidate G score must be byte-identical to direct replay',
);

const coldProductionWithOlderOutOfScopeRow = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: { state: null, source: 'COLD_START', rejectedSources: [] },
  targetReferenceAt: time(4),
  recoverySources: [{
    source: 'existing-verified-private-cache-with-older-row',
    record: record(Array.from({ length: 49 }, (_, index) => weather(index - 45))),
  }],
  publicHourly: [weather(4), weather(5), weather(6)],
  previousCandidateGContinuation: coldRollbackCompanion,
});
assert.equal(
  JSON.stringify(coldProductionWithOlderOutOfScopeRow),
  JSON.stringify(coldProduction),
  'history older than target-48h must have no effect on cold replay, scores or continuations',
);

const coldFirstPublicHour = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: { state: null, source: 'COLD_START', rejectedSources: [] },
  targetReferenceAt: time(4),
  recoverySources: [{
    source: 'existing-verified-private-cache',
    record: record(Array.from({ length: 48 }, (_, index) => weather(index - 44))),
  }],
  publicHourly: [weather(4)],
  previousCandidateGContinuation: coldRollbackCompanion,
});
let neighborResolverCallCount = 0;
const exactNeighborHold = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: {
    state: coldFirstPublicHour.ravScoreState.continuationState,
    source: 'EXISTING_PART',
    rejectedSources: [],
  },
  targetReferenceAt: time(5),
  recoverySources: [],
  publicHourly: [regionalWeather(5), stateOnlyHoldWeather(6, 5)],
  previousCandidateGContinuation: coldFirstPublicHour.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  resolveNativeCadenceReferenceSample: () => {
    neighborResolverCallCount += 1;
    throw new Error('a neighbouring hold must not authorize the replay boundary');
  },
  resolveCandidateGNativeCadenceReferenceSample: () => {
    neighborResolverCallCount += 1;
    throw new Error('a neighbouring hold must not authorize the Candidate boundary');
  },
});
assert.equal(neighborResolverCallCount, 0,
  'a marker on a neighbouring forecast hour must not invoke either boundary resolver');
assert.equal(exactNeighborHold.ravScoreState.rows[1].currentTransition, 'NATIVE_CADENCE_HOLD');
assert.equal(exactNeighborHold.candidateGState.rows[1].currentTransition, 'NATIVE_CADENCE_HOLD');

let historicalResolverCallCount = 0;
const historicalMarkerRows = [
  stateOnlyHoldWeather(5, 4),
  ...Array.from({ length: 48 }, (_, index) => regionalWeather(index + 6)),
];
const historicalMarkerProduction = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: {
    state: coldFirstPublicHour.ravScoreState.continuationState,
    source: 'EXISTING_PART',
    rejectedSources: [],
  },
  targetReferenceAt: time(54),
  recoverySources: [{
    source: 'historical-marker-must-remain-unknown',
    record: record(historicalMarkerRows),
  }],
  publicHourly: [regionalWeather(54)],
  previousCandidateGContinuation: coldFirstPublicHour.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  resolveNativeCadenceReferenceSample: () => {
    historicalResolverCallCount += 1;
    throw new Error('historical marker must not authorize the production boundary');
  },
  resolveCandidateGNativeCadenceReferenceSample: () => {
    historicalResolverCallCount += 1;
    throw new Error('historical marker must not authorize the Candidate boundary');
  },
});
assert.equal(historicalResolverCallCount, 0,
  'a marker in target-48..target-1 history must not invoke either boundary resolver');
assert.equal(historicalMarkerProduction.recovery.hourly[0].time, time(5));
assert.equal(historicalMarkerProduction.recovery.hourly[0].currentProvenance.reason,
  'bounded-unknown-history-interval');
assert.equal(
  Object.hasOwn(historicalMarkerProduction.recovery.hourly[0], 'currentStateOnlyHold'),
  false,
  'historical replay must strip the marker rather than converting it to hold',
);
const warmAfterCold = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: {
    state: coldFirstPublicHour.ravScoreState.continuationState,
    source: 'EXISTING_PART',
    rejectedSources: [],
  },
  targetReferenceAt: time(5),
  recoverySources: [],
  publicHourly: [weather(5), weather(6)],
  previousCandidateGContinuation: coldFirstPublicHour.candidateGState.continuationState,
});
assert.equal(
  JSON.stringify([
    ...coldFirstPublicHour.scores,
    ...warmAfterCold.scores,
  ]),
  JSON.stringify(coldProduction.scores),
  'integrated cold start plus warm continuation must be byte-identical to one-pass scoring',
);
assert.equal(
  JSON.stringify([
    ...coldFirstPublicHour.candidateGRollbackScores,
    ...warmAfterCold.candidateGRollbackScores,
  ]),
  JSON.stringify(coldProduction.candidateGRollbackScores),
  'Candidate G cold start plus warm continuation must be byte-identical to one-pass scoring',
);
assert.equal(
  JSON.stringify(warmAfterCold.ravScoreState.continuationState),
  JSON.stringify(coldProduction.ravScoreState.continuationState),
  'integrated split-run continuation must close on the one-pass state',
);
assert.equal(
  JSON.stringify(warmAfterCold.candidateGState.continuationState),
  JSON.stringify(coldProduction.candidateGState.continuationState),
  'Candidate G split-run continuation must close on the one-pass state',
);

for (const nativePhase of [0, 1, 2]) {
  const nativeTargetHour = 64;
  const nativeStartHour = nativeTargetHour - 48;
  const cadenceRow = (hour, index, { operational = false } = {}) => {
    const sinceNative = index >= nativePhase
      ? (index - nativePhase) % 3
      : 3 - (nativePhase - index);
    if (sinceNative === 0) return regionalWeather(hour);
    return operational
      ? stateOnlyHoldWeather(hour, hour - sinceNative)
      : withoutCurrent(regionalWeather(hour));
  };
  const privateRows = Array.from(
    { length: 48 },
    (_, index) => cadenceRow(nativeStartHour + index, index),
  );
  const publicCadenceRows = Array.from(
    { length: 3 },
    (_, index) => cadenceRow(nativeTargetHour + index, 48 + index, { operational: true }),
  );
  const phaseRecovery = buildRavScoreRecoveryReplay({
    part,
    initialState: null,
    targetReferenceAt: time(nativeTargetHour),
    sourceRecords: [{
      source: `existing-verified-native-phase-${nativePhase}`,
      record: record(privateRows),
    }],
    publicHourly: publicCadenceRows,
    nativeCadenceHoldHours: 3,
  });
  assert.equal(phaseRecovery.replayedHourCount, 48);
  const phaseBuild = buildIntegratedPartScoreSeries({
    part,
    zone,
    hourly: phaseRecovery.hourly,
    initialState: null,
    nativeCadenceHoldHours: 3,
    scoreStartAt: phaseRecovery.scoreStartAt,
    coldReplayBootstrap: phaseRecovery.coldStartHistoryLineage,
  });
  assert.equal(phaseBuild.scores[0].time, time(nativeTargetHour));
  assert.equal(phaseBuild.scores[0].ravScoreModel.currentMemoryReady, false,
    `native three-hour phase ${nativePhase} must expose incomplete measured history`);
  const historicalMissingRows = phaseBuild.ravScoreState.rows
    .slice(0, 48)
    .filter(row => row.currentVerified !== true);
  assert.ok(historicalMissingRows.length > 0,
    `native three-hour phase ${nativePhase} must exercise historical gaps`);
  assert.ok(historicalMissingRows.every(row => row.currentTransition === 'UNVERIFIED_MISSING'),
    `native three-hour phase ${nativePhase} must never convert history gaps into holds`);
  if (nativePhase === 0) {
    assert.equal(phaseBuild.scores[0].ravScoreModel.modes.waders.available, true);
    assert.equal(phaseBuild.scores[0].ravScoreModel.modes.waders.scoreQuality,
      'HISTORY_INCOMPLETE');
  } else if (nativePhase === 1) {
    assert.equal(phaseBuild.ravScoreState.rows[47].currentTransition, 'UNVERIFIED_MISSING',
      'an unmarked neighbouring missing hour must remain bounded unknown');
    assert.equal(phaseBuild.ravScoreState.rows[48].currentTransition, 'UNVERIFIED_MISSING',
      'a hold without its independent target reference must remain unavailable');
    assert.equal(phaseBuild.scores[0].ravScoreModel.modes.waders.available, false);
    assert.equal(phaseBuild.scores[0].ravScoreModel.modes.waders.scoreQuality,
      'UNAVAILABLE');

    const targetReference = nativeBoundaryReference(regionalWeather(nativeTargetHour - 2));
    const targetBoundBuild = buildIntegratedPartScoreSeries({
      part,
      zone,
      hourly: phaseRecovery.hourly,
      initialState: null,
      nativeCadenceHoldHours: 3,
      scoreTargetNativeCadenceReferenceSample: targetReference,
      scoreStartAt: phaseRecovery.scoreStartAt,
      coldReplayBootstrap: phaseRecovery.coldStartHistoryLineage,
    });
    assert.equal(targetBoundBuild.ravScoreState.rows[47].currentTransition,
      'UNVERIFIED_MISSING',
    'the independently bound H0 hold must not rewrite the intervening unknown hour');
    assert.equal(targetBoundBuild.ravScoreState.rows[48].currentTransition,
      'NATIVE_CADENCE_HOLD',
    'the exact private reference must bind only the closure-marked H0 hold');
    assert.equal(targetBoundBuild.scores[0].ravScoreModel.modes.waders.available, true);
    assert.equal(targetBoundBuild.scores[0].ravScoreModel.modes.waders.scoreQuality,
      'HISTORY_INCOMPLETE');

    const integratedResolverCalls = [];
    const candidateResolverCalls = [];
    const productionTargetBound = buildRavScoreProductionPartSeries({
      part,
      zone,
      initialSelection: {
        state: null,
        source: 'COLD_START',
        rejectedSources: [],
        candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
      },
      targetReferenceAt: time(nativeTargetHour),
      recoverySources: [{
        source: 'measured-native-cadence-target-reference',
        record: record(privateRows),
      }],
      publicHourly: publicCadenceRows,
      candidateGRollbackMeasuredColdStart: true,
      nativeCadenceHoldHours: 3,
      resolveNativeCadenceReferenceSample: (sourceValidTime, context) => {
        integratedResolverCalls.push({ sourceValidTime, context });
        return targetReference;
      },
      resolveCandidateGNativeCadenceReferenceSample: (sourceValidTime, context) => {
        candidateResolverCalls.push({ sourceValidTime, context });
        return targetReference;
      },
    });
    assert.equal(integratedResolverCalls.length, 1,
      'the integrated producer must resolve the exact H0 source once');
    assert.equal(candidateResolverCalls.length, 1,
      'the Candidate G producer must resolve the exact H0 source once');
    assert.equal(integratedResolverCalls[0].sourceValidTime, time(nativeTargetHour - 2));
    assert.equal(candidateResolverCalls[0].sourceValidTime, time(nativeTargetHour - 2));
    assert.equal(productionTargetBound.ravScoreState.rows[48].currentTransition,
      'NATIVE_CADENCE_HOLD');
    assert.equal(productionTargetBound.candidateGState.rows[48].currentTransition,
      'NATIVE_CADENCE_HOLD');
    const integratedTargetState = productionTargetBound.scores[0]
      .ravScoreModel.continuationState;
    assert.deepEqual(integratedTargetState.currentNativeHoldIntervalEnds, [],
      'a later forecast row must not mutate the earlier H0 continuation snapshot');
    const integratedTargetReplay = buildIntegratedRavScoreStateSeries([], {
      initialState: integratedTargetState,
      samplingContextKey: ravScoreSamplingContextKey(part),
    });
    assert.equal(integratedTargetReplay.initialStateAccepted, true);
    assert.equal(integratedTargetReplay.continuationState, integratedTargetState,
      'the exact H0 hold continuation must remain replayable byte-for-byte');
    const integratedTargetScore = productionTargetBound.scores[0];
    const auditModel = {
      ...integratedTargetScore.ravScoreModel,
      currentTransition: integratedTargetScore.ravScoreModel.publicContext.currentTransition,
    };
    const reconstructedEvaluationState = reconstructIntegratedEvaluationState(
      integratedTargetState,
      auditModel,
      integratedTargetScore.weather,
      integratedTargetScore.ravScoreModel.modes.waders,
      part.onshoreDirectionDeg,
    );
    for (const mode of ['waders', 'beach']) {
      const reconstructedMode = compactIntegratedRavScoreMode(evaluateRavScoreIntegrated({
        mode,
        weather: integratedTargetScore.weather,
        zone: { onshoreDirectionDeg: part.onshoreDirectionDeg },
      }, { state: reconstructedEvaluationState }), {
        inputCalibrationEligible: integratedInputCalibrationEligible(
          integratedTargetScore.weather,
        ),
      });
      assert.deepEqual(
        reconstructedMode,
        integratedTargetScore.ravScoreModel.modes[mode],
        'the audit must reconstruct the exact ' + mode
          + ' H0 hold mode from its real source time',
      );
    }
    const candidateTargetState = productionTargetBound.candidateGRollbackScores[0]
      .candidateG.continuationState;
    assert.equal(candidateTargetState.time, time(nativeTargetHour));
    assert.equal(candidateTargetState.transportReferenceAt, time(nativeTargetHour - 2));
    const candidateTargetReplay = buildCandidateGDerivedStateSeries([], {
      stateKey: candidateGStateKey(part),
      initialState: candidateTargetState,
    });
    assert.equal(candidateTargetReplay.initialStateAccepted, true);
    assert.equal(candidateTargetReplay.continuationState, candidateTargetState,
      'Candidate G must accept the exact bounded H0 hold without inventing a target vector');
  } else {
    assert.equal(phaseBuild.ravScoreState.rows[47].currentTransition, 'VERIFIED_REPLAY',
      'the direct native source immediately before target must remain verified');
    assert.equal(phaseBuild.ravScoreState.rows[48].currentTransition, 'NATIVE_CADENCE_HOLD',
      'an exact operational marker may hold only its own target hour');
    assert.equal(phaseBuild.scores[0].ravScoreModel.modes.waders.available, true);
    assert.equal(phaseBuild.scores[0].ravScoreModel.modes.waders.scoreQuality,
      'HISTORY_INCOMPLETE');
  }
}

assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState: null,
  targetReferenceAt: time(64),
  sourceRecords: [{
    source: 'invalid-native-boundary-reference',
    record: record(Array.from({ length: 48 }, (_, index) => weather(index + 16))),
  }],
  publicHourly: publicRows(64),
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: {
    ...nativeBoundaryReference(regionalWeather(15)),
    currentSpeedMps: '0.09',
  },
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_NATIVE_REFERENCE_INVALID',
'a coercible pre-boundary native reference must fail closed');
const zeroHistoryRecovery = buildRavScoreRecoveryReplay({
  part,
  initialState: null,
  targetReferenceAt: time(4),
  sourceRecords: [],
  publicHourly: publicRows(4),
});
assert.equal(zeroHistoryRecovery.coldStartHistoryLineage.completeCausalPositionCount, 0);
assert.equal(zeroHistoryRecovery.coldStartHistoryLineage.historyTransition,
  'UNKNOWN_HISTORY_INTERVAL');
const partialColdProduction = buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection: { state: null, source: 'COLD_START', rejectedSources: [] },
  targetReferenceAt: time(4),
  recoverySources: [{
    source: 'private-bridge-with-one-hour-missing',
    record: record(Array.from({ length: 47 }, (_, index) => weather(index - 43))),
  }],
  publicHourly: publicRows(4),
  previousCandidateGContinuation: coldRollbackCompanion,
});
assert.equal(partialColdProduction.recovery.replayedHourCount, 47);
assert.equal(partialColdProduction.scores[0].ravScoreModel.modes.waders.scoreQuality,
  'HISTORY_INCOMPLETE',
  'production cold start must retain scores when one private history position is absent');
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState: null,
  targetReferenceAt: time(4),
  publicHourly: [weather(5)],
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_TARGET_MISSING');
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4),
  sourceRecords: [{ source: 'valid', record: record([weather(1), weather(2), weather(3)]) }],
  publicHourly: [weather(4), weather(4)],
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_PUBLIC_DUPLICATE');

const productionSource = await fs.readFile('scripts/update-weather.mjs', 'utf8');
const productionPartPipelineSource = await fs.readFile(
  'scripts/lib/ravscore-production-part-pipeline.mjs',
  'utf8',
);
assert.ok(productionSource.includes(
  'const replayStartAt = ravScoreRecoverySourceStartAt(',
), 'production must derive the cache window from the recovery source-window contract');
assert.ok(productionSource.includes(
  '{ startAt: replayStartAt, expectedIdentity: partDmiIdentity }',
), 'production must request the exact identity-bound private history window');
assert.ok(productionPartPipelineSource.includes(
  'candidateGCurrentBootstrap: recovery.candidateGCurrentBootstrap',
), 'production must pass the verified exact-current migration bootstrap into the model');
assert.equal(productionSource.includes('initialSelection.state?.time ?? generatedAt'), false,
  'a state-less production path must not start its cache query at the target hour');
assert.equal(ravScoreRecoverySourceStartAt(null, time(4)), time(-44),
  'a genuine cold start must still request its exact private 48-hour bridge');

console.log('Integreret RavScore bounded recovery replay og exact-point stateprioritet: bestået.');
