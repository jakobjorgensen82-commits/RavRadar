import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';
import { reconstructCandidateGRollbackState } from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { buildCandidateGRollbackPartScoreSeries } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { buildRavScoreProductionPartSeries } from './lib/ravscore-production-part-pipeline.mjs';
import {
  buildRavScoreRecoveryReplay,
  ravScoreCandidateMigrationWaveBootstrapTargetAt,
  ravScoreRecoverySourceStartAt,
  selectRavScoreInitialState,
} from './lib/ravscore-recovery-replay.mjs';
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
      capturedAt: new Date(Date.parse(at) + 20 * 60_000).toISOString(),
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
assert.throws(() => replayForAge(4, [
  { source: 'deployed', record: record([weather(1), weather(2), weather(3)]) },
  { source: 'progressive', record: record([weather(2, { waveHeight: 1.3 })]) },
]), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');
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
  withoutCurrent(regionalWeather(2)),
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
  'a bounded native hold must remain missing rather than inventing a current sample');
assert.equal(nativeRecovery.hourly[0].currentProvenance.distanceKm, regionalDistanceKm,
  'the data-minimised replay row must preserve the exact regional distance authorization');
const nativeBuild = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: nativeRecovery.hourly,
  initialState,
  nativeCadenceHoldHours: 3,
  scoreStartAt: nativeRecovery.scoreStartAt,
});
assert.equal(nativeBuild.scores[0].time, time(4));
assert.equal(nativeBuild.scores[0].ravScoreModel.currentMemoryReady, true);
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

function candidateLagMigrationFixture(lagHours, boundaryReference) {
  const laggedState = candidateStateWithCurrentReferenceLag(lagHours);
  const targetRow = withoutCurrent(regionalWeather(lagHours));
  const waveHistory = Array.from(
    { length: RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours },
    (_, index) => weather(
      lagHours
        - RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours
        + index,
    ),
  );
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
  const cadenceRow = (hour, index) => index >= nativePhase
    && (index - nativePhase) % 3 === 0
    ? regionalWeather(hour)
    : withoutCurrent(regionalWeather(hour));
  const privateRows = Array.from(
    { length: 48 },
    (_, index) => cadenceRow(nativeStartHour + index, index),
  );
  const publicCadenceRows = Array.from(
    { length: 3 },
    (_, index) => cadenceRow(nativeTargetHour + index, 48 + index),
  );
  const boundaryReference = nativeBoundaryReference(
    regionalWeather(nativeStartHour + nativePhase - 3),
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
    nativeCadenceReferenceSample: boundaryReference,
  });
  assert.equal(phaseRecovery.replayedHourCount, 48);
  const phaseBuild = buildIntegratedPartScoreSeries({
    part,
    zone,
    hourly: phaseRecovery.hourly,
    initialState: null,
    nativeCadenceHoldHours: 3,
    nativeCadenceReferenceSample: boundaryReference,
    scoreStartAt: phaseRecovery.scoreStartAt,
    coldReplayBootstrap: phaseRecovery.coldStartHistoryLineage,
  });
  assert.equal(phaseBuild.scores[0].time, time(nativeTargetHour));
  assert.equal(phaseBuild.scores[0].ravScoreModel.currentMemoryReady, true,
    `native three-hour phase ${nativePhase} must be current-ready at first public target`);
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
