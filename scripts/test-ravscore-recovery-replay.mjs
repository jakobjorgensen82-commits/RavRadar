import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';
import { reconstructCandidateGRollbackState } from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';
import { currentSupplyStrength } from '../js/core/ravscore-current-supply-memory.js';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import {
  buildRavScoreRecoveryReplay,
  ravScoreRecoverySourceStartAt,
  selectRavScoreInitialState,
} from './lib/ravscore-recovery-replay.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import { RAVSCORE_COLD_REPLAY_ID } from '../js/core/ravscore-model-contract.js';
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
    optionalFieldSet: [],
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
      optionalFieldSet: [],
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
  assert.throws(
    () => replayForAge(4, incomplete),
    error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING',
    'repeated failed runs must continue to fail without advancing state',
  );
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
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt: time(4),
  sourceRecords: [{ source: 'dmi-must-not-authorize-hold', record: record(nativeRows) }],
  publicHourly: publicRows(4),
  nativeCadenceHoldHours: 3,
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING',
'DMI→missing must fail; cadence permission is bound only to the approved regional source');
assert.throws(() => buildRavScoreRecoveryReplay({
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
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING',
'Copernicus→missing must fail even when a regional part has a three-hour cadence policy');
assert.throws(() => buildRavScoreRecoveryReplay({
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
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING',
'regional→DMI→missing must fail because the intervening DMI sample revokes regional hold authority');

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

const candidateState = reconstructCandidateGRollbackState(initialState, {
  candidateGStateKey: candidateGStateKey(part),
});
const candidateExactRows = Array.from({ length: 52 }, (_, index) => {
  const hour = index - 48;
  const rawU = hour === 0 ? 0.035 : 0.0349;
  return weather(hour, {
    speed: hour === 0 ? 0.04 : 0.03,
    rawU,
    rawV: 0,
  });
});
assert.equal(ravScoreRecoverySourceStartAt(candidateState, time(4)), time(-51),
  'migration v2 must request the 48-hour exact-current window plus one maximum-gap bridge');
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
  'VERIFIED_PRIVATE_RAW_UV_REBUILD');
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.sourceStateTime, candidateState.time);
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.currentReferenceAt,
  candidateState.transportReferenceAt);
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.currentEvidence.length, 49);
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.currentEvidence[0].strength,
  currentSupplyStrength(0.0349),
  '0.0349 m/s must cross migration at private precision despite a 0.03 display speed');
assert.equal(candidateRecovery.candidateGCurrentBootstrap?.currentEvidence.at(-1).strength,
  currentSupplyStrength(0.035),
  '0.035 m/s must cross migration at private precision despite a 0.04 display speed');
assert.notDeepEqual(
  candidateRecovery.candidateGCurrentBootstrap?.currentEvidence,
  candidateState.transportEvidence,
  'Candidate G quantized evidence may validate metadata but must not seed integrated current',
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
assert.equal(preboundaryRecovery.candidateGCurrentBootstrap?.currentEvidence[0].time, time(-49),
  'one real pre-boundary sample may bridge the missing C-48 native cadence hour');
assert.equal(preboundaryRecovery.candidateGCurrentBootstrap?.currentEvidence.at(-1).time, time(0));
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
assert.deepEqual(coldStart.hourly.slice(-3).map(row => row.time), [time(4), time(5), time(6)],
  'cold start must use verified private cache, not pre-target public rows, as history');
assert.equal(coldStart.hourly[0].time, time(-44));
const coldStartBuild = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: coldStart.hourly,
  initialState: null,
  scoreStartAt: coldStart.scoreStartAt,
  coldReplayBootstrap: {
    recoveryId: RAVSCORE_COLD_REPLAY_ID,
    replayedHourCount: coldStart.replayedHourCount,
    targetReferenceAt: coldStart.scoreStartAt,
  },
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
    coldReplayBootstrap: {
      recoveryId: RAVSCORE_COLD_REPLAY_ID,
      replayedHourCount: phaseRecovery.replayedHourCount,
      targetReferenceAt: phaseRecovery.scoreStartAt,
    },
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
assert.throws(() => buildRavScoreRecoveryReplay({
  part,
  initialState: null,
  targetReferenceAt: time(4),
  sourceRecords: [],
  publicHourly: publicRows(4),
}), error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING',
'cold start without already-fetched verified history must fail closed rather than warm up publicly');
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
