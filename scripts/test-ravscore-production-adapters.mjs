import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION,
  RAVSCORE_LOCAL_MARGIN_POINTS,
  RAVSCORE_WAM_MAX_DISTANCE_KM,
  buildIntegratedPartPublicProjection,
  buildIntegratedZoneHourlyProjection,
  dmiExpectedIdentityForPart,
  verifiedBulkCurrent,
  verifiedIntegratedPartHourly,
} from './lib/ravscore-production-adapters.mjs';
import { copernicusLiveRecordProjectionSha256 } from './lib/live-current-pilot.mjs';
import {
  FEGGESUND_WAVE_PROXY_INPUT_SOURCE,
  FEGGESUND_WAVE_PROXY_NOTICE_ID,
  buildFeggesundWaveProxy,
} from './lib/feggesund-wave-proxy.mjs';
import {
  ravScoreModelBinding,
  RAVSCORE_MODEL_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-model-contract.js';
import { buildLocalZoneScore } from '../js/core/local-zone-score.js';

const point = [8, 55];
const bulkId = 'PART::SYNTHETIC-PART';
const partContext = {
  partId: 'SYNTHETIC-PART',
  zoneId: 'SYNTHETIC-ZONE',
  waterPoint: point,
  onshoreDirectionDeg: 90,
};
const targetIdentityPayload = JSON.stringify({
  schemaVersion: 1,
  targets: [[partContext.partId, partContext.zoneId, '8.0000000', '55.0000000']],
});
const targetIdentityFingerprint = `sha256:${crypto.createHash('sha256')
  .update(targetIdentityPayload).digest('hex')}`;
const modelRun = '2026-08-29T00:00:00.000Z';
const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const pointAtNorthDistanceKm = (origin, distanceKm) => [
  origin[0],
  origin[1] + distanceKm / 6371.0088 * 180 / Math.PI,
];
const componentContract = {
  wind: {
    collection: 'harmonie_dini_sf',
    collectionFamily: 'wind',
    componentKind: 'atmospheric-wind-vector',
    fieldSet: ['wind-u-10m', 'wind-v-10m'],
    spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
    vectorSemanticsVersion: 1,
    vectorSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
  },
  wave: {
    collection: 'wam_dw',
    collectionFamily: 'wave',
    componentKind: 'wave-mobilisation-tuple',
    fieldSet: ['significant-wave-height', 'dominant-wave-period'],
    optionalFieldSet: ['mean-wave-dir'],
    spatialSelection: 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
  },
  current: {
    collection: 'dkss_idw',
    collectionFamily: 'marine',
    componentKind: 'ocean-current-vector',
    fieldSet: ['current-u', 'current-v'],
    spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
    vectorSemanticsVersion: RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION,
    vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
    verticalLayer: '-0.5m',
    verticalLayerRankM: -0.5,
  },
  waterLevel: {
    collection: 'dkss_idw',
    collectionFamily: 'marine',
    componentKind: 'marine-water-level-scalar',
    fieldSet: ['sea-mean-deviation'],
    spatialSelection: 'nearest-valid-grid-cell-no-spatial-interpolation',
  },
};
const dmiSourceFor = (component, time, overrides = {}) => {
  const contract = componentContract[component];
  const leadTimeHours = (Date.parse(time) - Date.parse(modelRun)) / 3_600_000;
  const itemId = `${component}-${time}`;
  const optionalFieldSet = [...(contract.optionalFieldSet ?? [])];
  return {
  provider: 'dmi',
  fallback: false,
  ...contract,
  component,
  optionalFieldSet,
  modelRun,
  leadTimeHours,
  entityId: bulkId,
  parentZoneId: partContext.zoneId,
  entityType: 'coastal-part',
  samplingContext: 'coastal-part-water-point',
  samplingPoint: point,
  gridPoint: point,
  gridDefinitionSha256: sha('fixture-grid'),
  distanceKm: 0,
  spatialSemanticsVersion: 1,
  itemId,
  assetIdentitySha256: sha(`${component}-asset-${time}`),
  acquiredAt: '2026-08-29T00:05:00.000Z',
  nativeValidTime: time,
  temporalResolution: 'native',
  nativeValidTimes: [time],
  nativeSteps: [{
    itemId,
    assetIdentitySha256: sha(`${component}-asset-${time}`),
    nativeValidTime: time,
    leadTimeHours,
    acquiredAt: '2026-08-29T00:05:00.000Z',
    optionalFieldSet,
  }],
  ...overrides,
  };
};
const currentSourceFor = (time, overrides = {}) => dmiSourceFor('current', time, overrides);
const waveSourceWithoutDirection = time => {
  const source = dmiSourceFor('wave', time);
  return {
    ...source,
    optionalFieldSet: [],
    nativeSteps: source.nativeSteps.map(step => ({ ...step, optionalFieldSet: [] })),
  };
};
const sourceTime = '2026-08-29T12:00:00.000Z';
const source = currentSourceFor(sourceTime);
const expectedDmiIdentity = dmiExpectedIdentityForPart(partContext, bulkId);
assert.equal(dmiExpectedIdentityForPart({
  ...partContext,
  waterPoint: [...point, 0],
}, bulkId), null,
'a hidden third coordinate must fail the exact sampling identity instead of being projected away');
const bulkCache = {
  currentVectorSemanticsVersion: RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION,
  currentVectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
  currentMaxDistanceKm: 5,
  zones: {
    [bulkId]: { ...expectedDmiIdentity },
  },
};
assert.ok(verifiedBulkCurrent(
  bulkCache,
  bulkCache.zones[bulkId],
  point,
  source,
  sourceTime,
  expectedDmiIdentity,
));
assert.equal(verifiedBulkCurrent(
  { ...bulkCache, currentVectorSelection: 'different-selection' },
  bulkCache.zones[bulkId],
  point,
  source,
  sourceTime,
  expectedDmiIdentity,
), null, 'a mismatched vector-selection contract must fail closed');
assert.equal(verifiedBulkCurrent(
  bulkCache,
  bulkCache.zones[bulkId],
  [8.2, 55.2],
  source,
  sourceTime,
  expectedDmiIdentity,
), null, 'a different approved sampling point must fail closed');

const verified = verifiedIntegratedPartHourly({
  hourly: [{
    time: '2026-08-29T12:00:00.000Z',
    currentUMps: 0.08,
    currentVMps: -0.02,
    currentSpeedMps: 0.082,
    currentDirectionDeg: 104,
    sources: { current: source },
  }],
}, bulkCache, bulkId, partContext);
assert.equal(verified[0].currentProvenance.status, 'verified');
assert.equal(verified[0].currentSpeedMps, 0.08);
assert.equal(verified[0].currentDirectionDeg, 104);
assert.ok(Math.abs(verified[0].currentCoastNormalSpeedMps - 0.08) < 1e-12,
  'state input must retain the exact verified coast-normal U/V projection');

const justAboveDeadband = verifiedIntegratedPartHourly({
  hourly: [{
    time: '2026-08-29T16:00:00.000Z',
    currentUMps: 0.031,
    currentVMps: 0,
    currentSpeedMps: 0.03,
    currentDirectionDeg: 90,
    sources: { current: currentSourceFor('2026-08-29T16:00:00.000Z') },
  }],
}, bulkCache, bulkId, partContext);
assert.equal(justAboveDeadband[0].currentSpeedMps, 0.03,
  'public display precision remains two decimals');
assert.ok(Math.abs(justAboveDeadband[0].currentCoastNormalSpeedMps - 0.031) < 1e-12,
  'the private state path must not quantize a verified current at the 0.03 m/s boundary');

const contradictoryDerivedCurrent = verifiedIntegratedPartHourly({
  hourly: [{
    time: '2026-08-29T12:00:00.000Z',
    currentUMps: 0.08,
    currentVMps: -0.02,
    currentSpeedMps: 99,
    currentDirectionDeg: 284,
    sources: { current: source },
  }],
}, bulkCache, bulkId, partContext);
assert.equal(contradictoryDerivedCurrent[0].currentSpeedMps, 0.08,
  'verified current speed must be reconstructed from the proved U/V pair');
assert.equal(contradictoryDerivedCurrent[0].currentDirectionDeg, 104,
  'verified current direction must be reconstructed from the proved U/V pair');

const zeroAndWrap = verifiedIntegratedPartHourly({
  hourly: [{
    time: '2026-08-29T13:00:00.000Z',
    currentUMps: 0,
    currentVMps: 0,
    currentSpeedMps: 7,
    currentDirectionDeg: 180,
    sources: { current: currentSourceFor('2026-08-29T13:00:00.000Z') },
  }, {
    time: '2026-08-29T14:00:00.000Z',
    currentUMps: -0.0001,
    currentVMps: 1,
    currentSpeedMps: 7,
    currentDirectionDeg: 180,
    sources: { current: currentSourceFor('2026-08-29T14:00:00.000Z') },
  }],
}, bulkCache, bulkId, partContext);
assert.deepEqual({
  speed: zeroAndWrap[0].currentSpeedMps,
  direction: zeroAndWrap[0].currentDirectionDeg,
}, { speed: 0, direction: 0 },
'a proved zero vector must stay a canonical zero-strength observation');
assert.deepEqual({
  speed: zeroAndWrap[1].currentSpeedMps,
  direction: zeroAndWrap[1].currentDirectionDeg,
}, { speed: 1, direction: 0 },
'rounded northward direction must wrap from 360 to canonical zero degrees');

const livePilotSource = {
  recordProjectionContractId: 'copernicus-live-current-record-fixed-decimal-v1',
  recordId: `sha256:${sha('live-record')}`,
  acquisitionId: `sha256:${sha('live-acquisition')}`,
  collectionId: `sha256:${sha('live-collection')}`,
  productionReferenceAt: '2026-08-29T15:00:00.000Z',
  status: 'verified',
  provider: 'copernicus',
  sourceClass: 'supplemental-local-current',
  source: 'copernicus-baltic-nemo',
  partId: partContext.partId,
  parentZoneId: partContext.zoneId,
  targetIdentityFingerprint,
  controlledLivePilot: true,
  vectorSemanticsVersion: 4,
  componentPair: 'same-time-cell-layer',
  interpolation: false,
  verticalLayer: 'depth:12',
  verticalLayerM: 12,
  verticalLayerRankM: 12,
  layerQuality: 'deepest-common-layer',
  sharedLayerCount: 2,
  samplingPoint: point,
  gridPoint: [8.01, 55.01],
  distanceKm: 1.3,
  productId: 'BALTICSEA_ANALYSISFORECAST_PHY_003_006',
  datasetId: 'cmems_mod_bal_phy_anfc_PT1H-i',
  datasetVersion: '202411',
  validTime: '2026-08-29T15:00:00.000Z',
  capturedAt: '2026-08-29T15:20:00.000Z',
  acquisitionAt: '2026-08-29T15:20:00.000Z',
  acquisitionStatus: 'COMPLETE',
  requestContractId: 'copernicus-current-multitime-bounded-spatial-shards-v1',
  selectionPolicyId: 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1',
  uMps: 0.3,
  vMps: -0.4,
  temporalResolution: 'native',
  nativeValidTimes: ['2026-08-29T15:00:00.000Z'],
  fallback: false,
};
livePilotSource.recordProjectionSha256 = copernicusLiveRecordProjectionSha256(livePilotSource);
const canonicalLivePilot = verifiedIntegratedPartHourly({
  hourly: [{
    time: '2026-08-29T15:00:00.000Z',
    currentUMps: 0.3,
    currentVMps: -0.4,
    currentSpeedMps: 99,
    currentDirectionDeg: 323,
    currentProvenance: livePilotSource,
  }],
}, null, 'NOT-A-DMI-PART', partContext);
assert.deepEqual({
  speed: canonicalLivePilot[0].currentSpeedMps,
  direction: canonicalLivePilot[0].currentDirectionDeg,
  status: canonicalLivePilot[0].currentProvenance.status,
}, { speed: 0.5, direction: 143, status: 'verified' },
'controlled live current must use the same canonical U/V-derived values as DMI');

for (const poisoned of [
  { rowU: 0.31, rowV: -0.4, source: livePilotSource },
  { rowU: 0.3, rowV: -0.4, source: { ...livePilotSource, uMps: 0.31 } },
  { rowU: 0.3, rowV: -0.4, source: { ...livePilotSource, gridPoint: [8.02, 55.01] } },
]) {
  const rejected = verifiedIntegratedPartHourly({
    hourly: [{
      time: '2026-08-29T15:00:00.000Z',
      currentUMps: poisoned.rowU,
      currentVMps: poisoned.rowV,
      currentSpeedMps: 0.5,
      currentDirectionDeg: 143,
      currentProvenance: poisoned.source,
    }],
  }, null, 'NOT-A-DMI-PART', partContext);
  assert.equal(rejected[0].currentProvenance.status, 'unverified');
  assert.equal(rejected[0].currentUMps, null,
    'row/source U/V divergence or projection-field tampering must fail closed');
}

const sourceWithContradictoryStatus = verifiedIntegratedPartHourly({
  hourly: [{
    time: '2026-08-29T12:00:00.000Z',
    currentUMps: 0.08,
    currentVMps: -0.02,
    sources: { current: { ...source, status: 'unverified' } },
  }],
}, bulkCache, bulkId, partContext);
assert.equal(sourceWithContradictoryStatus[0].currentProvenance.status, 'verified',
  'a complete independent proof must emit one canonical verified status');

for (const malformed of [false, '0.08', '   ', [], [0.08], {}]) {
  const malformedCurrent = verifiedIntegratedPartHourly({
    hourly: [{
      time: '2026-08-29T12:00:00.000Z',
      currentUMps: malformed,
      currentVMps: -0.02,
      sources: { current: source },
    }],
  }, bulkCache, bulkId, partContext);
  assert.equal(malformedCurrent[0].currentProvenance.status, 'unverified',
    'coercible non-number current input must fail closed');
}

for (const malformedSource of [
  { ...source, fallback: undefined },
  { ...source, collection: '' },
  { ...source, leadTimeHours: '12' },
  { ...source, vectorSemanticsVersion: '3' },
  { ...source, distanceKm: '1.3' },
  { ...source, nativeValidTimes: ['2026-08-29T11:00:00.000Z'] },
  { ...source, parentZoneId: 'ANOTHER-ZONE' },
  { ...source, componentKind: 'generic-current-label' },
  {
    ...source,
    nativeSteps: source.nativeSteps.map(step => ({
      ...step,
      assetIdentitySha256: sha('another-acquisition'),
    })),
  },
]) {
  const malformedProof = verifiedIntegratedPartHourly({
    hourly: [{
      time: sourceTime,
      currentUMps: 0.08,
      currentVMps: -0.02,
      sources: { current: malformedSource },
    }],
  }, bulkCache, bulkId, partContext);
  assert.equal(malformedProof[0].currentProvenance.status, 'unverified',
    'incomplete, coercible or stale current provenance must fail closed');
}

const crossEntity = verifiedIntegratedPartHourly({
  hourly: [{
    time: sourceTime,
    currentUMps: 0.08,
    currentVMps: -0.02,
    sources: { current: source },
  }],
}, bulkCache, bulkId, { ...partContext, zoneId: 'ANOTHER-ZONE' });
assert.equal(crossEntity[0].currentProvenance.status, 'unverified',
  'a valid DMI tuple for a neighbouring parent zone must not cross the part boundary');

const physicalRows = ['2026-08-29T12:00:00.000Z', '2026-08-29T15:00:00.000Z']
  .map((rowTime, index) => ({
    time: rowTime,
    windSpeedMps: 5 + index,
    windDirectionDeg: index === 0 ? 360 : 180,
    waveHeightM: 1.2 + index * 0.1,
    wavePeriodS: 6 + index,
    waveDirectionDeg: 270,
    waterLevelCm: index === 0 ? 10 : 16,
    waterLevelTrendCm3h: 999,
    currentUMps: 0.08,
    currentVMps: -0.02,
    sources: {
      current: currentSourceFor(rowTime),
      wind: dmiSourceFor('wind', rowTime),
      wave: dmiSourceFor('wave', rowTime),
      waterLevel: dmiSourceFor('waterLevel', rowTime),
    },
  }));
const physical = verifiedIntegratedPartHourly(
  { hourly: physicalRows },
  bulkCache,
  bulkId,
  partContext,
);
assert.deepEqual({
  wind: physical[0].windSpeedMps,
  windDirection: physical[0].windDirectionDeg,
  wave: physical[0].waveHeightM,
  period: physical[0].wavePeriodS,
  water: physical[0].waterLevelCm,
  trend: physical[0].waterLevelTrendCm3h,
}, {
  wind: 5,
  windDirection: 0,
  wave: 1.2,
  period: 6,
  water: 10,
  trend: 6,
}, 'all score-relevant physical components require exact DMI time proof and water trend is recomputed');
assert.deepEqual({
  source: physical[0].waveInputSource,
  uncertainty: physical[0].waveInputUncertainty,
  notice: physical[0].waveInputNoticeId,
}, {
  source: 'DIRECT_OFFICIAL',
  uncertainty: 'LOW',
  notice: null,
}, 'a direct official wave must remain unlabelled as a proxy');

const feggesundPartContext = {
  ...partContext,
  zoneId: 'DK-B05-11',
};
const feggesundProxy = buildFeggesundWaveProxy({
  targetEntityId: bulkId,
  time: physicalRows[0].time,
  sources: ['DK-B05-10', 'DK-B05-12'].map((parentZoneId, index) => ({
    parentZoneId,
    validTime: physicalRows[0].time,
    provider: 'dmi',
    collection: 'wam_dw',
    component: 'wave',
    fallback: false,
    modelRun,
    waveHeightM: 1 + index,
    wavePeriodS: 6 + index,
    waveDirectionDeg: index ? 20 : 350,
    evidenceSha256: sha(parentZoneId),
  })),
});
const feggesundProxyHour = verifiedIntegratedPartHourly({
  hourly: [{
    ...physicalRows[0],
    waveHeightM: feggesundProxy.waveHeightM,
    wavePeriodS: feggesundProxy.wavePeriodS,
    waveDirectionDeg: feggesundProxy.waveDirectionDeg,
    sources: { ...physicalRows[0].sources, wave: feggesundProxy.proxy },
  }],
}, bulkCache, bulkId, feggesundPartContext)[0];
assert.deepEqual({
  source: feggesundProxyHour.waveInputSource,
  uncertainty: feggesundProxyHour.waveInputUncertainty,
  notice: feggesundProxyHour.waveInputNoticeId,
  status: feggesundProxyHour.waveProvenance.status,
}, {
  source: FEGGESUND_WAVE_PROXY_INPUT_SOURCE,
  uncertainty: feggesundProxy.proxy.disagreementClass,
  notice: FEGGESUND_WAVE_PROXY_NOTICE_ID,
  status: 'verified-derived',
}, 'the exact two-neighbour proxy must remain visibly derived');

const tamperedFeggesundProxy = structuredClone(feggesundProxy);
tamperedFeggesundProxy.waveHeightM += 0.01;
const rejectedFeggesundProxy = verifiedIntegratedPartHourly({
  hourly: [{
    ...physicalRows[0],
    waveHeightM: tamperedFeggesundProxy.waveHeightM,
    wavePeriodS: tamperedFeggesundProxy.wavePeriodS,
    waveDirectionDeg: tamperedFeggesundProxy.waveDirectionDeg,
    sources: { ...physicalRows[0].sources, wave: tamperedFeggesundProxy.proxy },
  }],
}, bulkCache, bulkId, feggesundPartContext)[0];
assert.equal(rejectedFeggesundProxy.waveProvenance.status, 'unverified',
  'a modified proxy tuple must fail closed');

assert.deepEqual(
  RAVSCORE_WAM_MAX_DISTANCE_KM,
  { wam_dw: 2, wam_nsb: 8 },
  'the public adapter must expose the exact collection-specific WAM distance policy',
);
const pythonNativePolicy = fs.readFileSync(
  new URL('./lib/dmi_native_provenance.py', import.meta.url),
  'utf8',
);
for (const [collection, maximum] of Object.entries(RAVSCORE_WAM_MAX_DISTANCE_KM)) {
  assert.match(
    pythonNativePolicy,
    new RegExp('"' + collection + '"\\s*:\\s*' + maximum.toFixed(1)),
    'Python and JS must bind the same ' + collection + ' WAM distance limit',
  );
  const verifyAtDistance = distanceKm => {
    const gridPoint = pointAtNorthDistanceKm(point, distanceKm);
    const wave = dmiSourceFor('wave', physicalRows[0].time, {
      collection,
      gridPoint,
      distanceKm,
    });
    return verifiedIntegratedPartHourly({
      hourly: [{
        ...physicalRows[0],
        sources: { ...physicalRows[0].sources, wave },
      }],
    }, bulkCache, bulkId, partContext)[0];
  };
  const accepted = verifyAtDistance(maximum * (1 - 1e-12));
  assert.deepEqual({
    height: accepted.waveHeightM,
    period: accepted.wavePeriodS,
    direction: accepted.waveDirectionDeg,
    status: accepted.waveProvenance.status,
  }, {
    height: physicalRows[0].waveHeightM,
    period: physicalRows[0].wavePeriodS,
    direction: physicalRows[0].waveDirectionDeg,
    status: 'verified',
  }, collection + ' must accept complete native wave provenance at its hard boundary');

  const rejectedDistance = verifyAtDistance(maximum + 0.001);
  assert.deepEqual({
    height: rejectedDistance.waveHeightM,
    period: rejectedDistance.wavePeriodS,
    direction: rejectedDistance.waveDirectionDeg,
    status: rejectedDistance.waveProvenance.status,
  }, {
    height: null,
    period: null,
    direction: null,
    status: 'unverified',
  }, collection + ' must fail closed immediately above its hard distance boundary');
}

const unattestedWaveDirection = verifiedIntegratedPartHourly({
  hourly: [{
    ...physicalRows[0],
    sources: {
      ...physicalRows[0].sources,
      wave: waveSourceWithoutDirection(physicalRows[0].time),
    },
  }],
}, bulkCache, bulkId, partContext)[0];
assert.deepEqual({
  height: unattestedWaveDirection.waveHeightM,
  period: unattestedWaveDirection.wavePeriodS,
  direction: unattestedWaveDirection.waveDirectionDeg,
  optionalFieldSet: unattestedWaveDirection.waveProvenance.optionalFieldSet,
}, { height: 1.2, period: 6, direction: null, optionalFieldSet: [] },
'an unattested numeric wave direction must become missing while verified height/period remain usable');

const directionlessExactCalm = verifiedIntegratedPartHourly({
  hourly: [{
    ...physicalRows[0],
    waveHeightM: 0,
    wavePeriodS: 0,
    waveDirectionDeg: null,
    sources: {
      ...physicalRows[0].sources,
      wave: waveSourceWithoutDirection(physicalRows[0].time),
    },
  }],
}, bulkCache, bulkId, partContext)[0];
assert.deepEqual({
  height: directionlessExactCalm.waveHeightM,
  period: directionlessExactCalm.wavePeriodS,
  direction: directionlessExactCalm.waveDirectionDeg,
}, { height: 0, period: 0, direction: null },
'directionless exact calm may remain neutral without inventing a direction');

const coerciblePhysical = verifiedIntegratedPartHourly({
  hourly: [{
    ...physicalRows[0],
    windSpeedMps: '5',
    waveHeightM: '1.2',
    waterLevelCm: '10',
  }],
}, bulkCache, bulkId, partContext);
assert.deepEqual({
  wind: coerciblePhysical[0].windSpeedMps,
  wave: coerciblePhysical[0].waveHeightM,
  water: coerciblePhysical[0].waterLevelCm,
}, { wind: null, wave: null, water: null },
'numeric strings must never cross the integrated RavScore trust boundary');

const placeholderPhysical = verifiedIntegratedPartHourly({
  hourly: [{
    ...physicalRows[0],
    sources: {
      ...physicalRows[0].sources,
      wind: { provider: 'dmi', fallback: false },
      wave: { provider: 'dmi', fallback: false },
      waterLevel: { provider: 'dmi', fallback: false },
    },
  }],
}, bulkCache, bulkId, partContext);
assert.deepEqual({
  wind: placeholderPhysical[0].windSpeedMps,
  wave: placeholderPhysical[0].waveHeightM,
  water: placeholderPhysical[0].waterLevelCm,
}, { wind: null, wave: null, water: null },
'legacy DMI provider labels without run and native-time proof must fail closed');

const differentWaterRunRows = structuredClone(physicalRows);
differentWaterRunRows[1].sources.waterLevel = dmiSourceFor('waterLevel', differentWaterRunRows[1].time, {
  modelRun: '2026-08-29T01:00:00.000Z',
  leadTimeHours: 14,
});
const differentWaterRun = verifiedIntegratedPartHourly(
  { hourly: differentWaterRunRows },
  bulkCache,
  bulkId,
  partContext,
);
assert.equal(differentWaterRun[0].waterLevelTrendCm3h, null,
  'water-level trend must not mix separate DMI model runs');

const rejected = verifiedIntegratedPartHourly({
  hourly: [{
    time: '2026-08-29T12:00:00.000Z',
    currentUMps: 0.08,
    currentVMps: -0.02,
    currentSpeedMps: 0.082,
    currentDirectionDeg: 104,
    sources: { current: { ...source, vectorSemanticsVersion: 2 } },
  }],
}, bulkCache, bulkId, partContext);
assert.deepEqual({
  u: rejected[0].currentUMps,
  v: rejected[0].currentVMps,
  speed: rejected[0].currentSpeedMps,
  direction: rejected[0].currentDirectionDeg,
  status: rejected[0].currentProvenance.status,
}, {
  u: null,
  v: null,
  speed: null,
  direction: null,
  status: 'unverified',
});

const time = '2026-08-29T12:00:00.000Z';
const scoreRow = (score, available = true, scoreQuality = 'FULL_HISTORY', {
  upper = scoreQuality === 'FULL_HISTORY' ? score : Math.min(100, score + 10),
  historyCoverageHours = scoreQuality === 'FULL_HISTORY' ? 48 : 24,
  historyReasonCodes = scoreQuality === 'FULL_HISTORY' ? [] : ['CURRENT_HISTORY_INCOMPLETE'],
  conservativeTailResetApplied = false,
  calibrationEligible = scoreQuality === 'FULL_HISTORY',
  waveInputQuality = {
    waveInputSource:'DIRECT_OFFICIAL',
    waveInputUncertainty:'LOW',
    waveInputNoticeId:null,
  },
} = {}) => ({
  time,
  weather: {
    waveHeightM: 1.2,
    wavePeriodS: 8,
    currentSpeedMps: 0.08,
    currentProvenance: { status: 'verified' },
    ...waveInputQuality,
  },
  ravScoreModel: {
    modes: Object.fromEntries(['waders', 'beach'].map(mode => [mode, available ? {
      available: true,
      score,
      scoreQuality,
      calibrationEligible,
      scoreSemantics: scoreQuality === 'FULL_HISTORY'
        ? conservativeTailResetApplied
          ? 'CONSERVATIVE_TAIL_RESET_POINT_SCORE'
          : 'EXACT_POINT_SCORE'
        : 'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
      conservativeTailResetApplied,
      scoreBounds: {
        lower: score,
        upper,
        modelUncertaintyPoints: upper - score,
        rawLower: score,
        rawUpper: upper,
      },
      historyCoverageHours,
      historyReasonCodes,
      components: { huntability: score, transport: score, release: score },
      explanation: { transportDiagnostics: { coastTransportExplanation: 'bounded' } },
    } : {
      available: false,
      score: null,
      scoreQuality: 'UNAVAILABLE',
      calibrationEligible: false,
      scoreSemantics: null,
      conservativeTailResetApplied: false,
      scoreBounds: null,
      historyCoverageHours: null,
      historyReasonCodes: [],
      unavailability: { code: 'FIXTURE_MISSING', messageDa: 'Fixture mangler.' },
    }])),
  },
});
const selectedMode = (row, mode) => row.ravScoreModel.modes[mode];
const zoneRows = values => values.map(([partId, score, available = true, scoreQuality = 'FULL_HISTORY']) => ({
  partId,
  name: partId,
  scores: [scoreRow(score, available, scoreQuality)],
}));

const several = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 80], ['B', 73], ['C', 60]]),
  expectedPartCount: 3,
  selectedMode,
});
assert.equal(several[0].waders.status, 'several-parts');
assert.deepEqual(several[0].waders.modelBinding, ravScoreModelBinding());
assert.deepEqual(several[0].waders.parts.map(item => item.partId), ['A', 'B']);
assert.equal(several[0].waders.winningPartId, 'A');
assert.equal(several[0].waders.scoreQuality, 'FULL_HISTORY');
assert.equal(several[0].waders.calibrationEligible, true);
assert.equal(several[0].waders.historyCoverageHours, 48);
assert.deepEqual(several[0].waders.historyReasonCodes, []);
assert.deepEqual(several[0].waders.scoreBounds, {
  lower:80,upper:80,modelUncertaintyPoints:0,rawLower:80,rawUpper:80,
});
assert.equal(several[0].waders.scoreSemantics, 'EXACT_POINT_SCORE');
assert.equal(several[0].waders.winningPartUncertain, false);
assert.deepEqual(several[0].waders.possibleWinningParts.map(item=>item.partId), ['A']);
assert.deepEqual(several[0].waders.parts.map(item=>({
  partId:item.partId,
  scoreQuality:item.scoreQuality,
  scoreBounds:item.scoreBounds,
  historyCoverageHours:item.historyCoverageHours,
  historyReasonCodes:item.historyReasonCodes,
})), [
  {partId:'A',scoreQuality:'FULL_HISTORY',scoreBounds:{
    lower:80,upper:80,modelUncertaintyPoints:0,rawLower:80,rawUpper:80,
  },historyCoverageHours:48,historyReasonCodes:[]},
  {partId:'B',scoreQuality:'FULL_HISTORY',scoreBounds:{
    lower:73,upper:73,modelUncertaintyPoints:0,rawLower:73,rawUpper:73,
  },historyCoverageHours:48,historyReasonCodes:[]},
], 'FULL_HISTORY comparison parts must retain collapsed bounds without changing their scores');

const proxyLocked = buildIntegratedZoneHourlyProjection({
  rows: [
    {partId:'A',name:'A',scores:[scoreRow(80,true,'FULL_HISTORY',{
      calibrationEligible:false,
      waveInputQuality:{
        waveInputSource:'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION',
        waveInputUncertainty:'MODERATE',
        waveInputNoticeId:'FEGGESUND_NEIGHBOR_WAVE_PROXY',
      },
    })]},
    {partId:'B',name:'B',scores:[scoreRow(73)]},
  ],
  expectedPartCount:2,
  selectedMode,
});
assert.equal(proxyLocked[0].waders.scoreQuality,'FULL_HISTORY');
assert.equal(proxyLocked[0].waders.calibrationEligible,false,
  'a FULL_HISTORY zone depending on a proxy part must remain calibration ineligible');
assert.deepEqual(
  Object.fromEntries(['waveInputSource','waveInputUncertainty','waveInputNoticeId']
    .map(field=>[field,proxyLocked[0].waders.weather[field]])),
  {
    waveInputSource:'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION',
    waveInputUncertainty:'MODERATE',
    waveInputNoticeId:'FEGGESUND_NEIGHBOR_WAVE_PROXY',
  },
  'the winning coastal-part hour must carry the exact compact tuple into zone weather',
);

const nonWinningProxyScore = scoreRow(73,true,'FULL_HISTORY',{
  calibrationEligible:false,
  waveInputQuality:{
    waveInputSource:'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION',
    waveInputUncertainty:'HIGH',
    waveInputNoticeId:'FEGGESUND_NEIGHBOR_WAVE_PROXY',
  },
});
nonWinningProxyScore.weather.waveHeightM = 2.4;
const proxyLockedByNonWinner = buildIntegratedZoneHourlyProjection({
  rows: [
    {partId:'A',name:'A',scores:[scoreRow(80)]},
    {partId:'B',name:'B',scores:[nonWinningProxyScore]},
  ],
  expectedPartCount:2,
  selectedMode,
});
assert.equal(proxyLockedByNonWinner[0].waders.winningPartId,'A');
assert.equal(proxyLockedByNonWinner[0].waders.weather.waveHeightM,1.2,
  'aggregate proxy warning must not replace the direct winner weather values');
assert.equal(proxyLockedByNonWinner[0].waders.calibrationEligible,false);
assert.deepEqual(
  Object.fromEntries(['waveInputSource','waveInputUncertainty','waveInputNoticeId']
    .map(field=>[field,proxyLockedByNonWinner[0].waders.weather[field]])),
  {
    waveInputSource:'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION',
    waveInputUncertainty:'HIGH',
    waveInputNoticeId:'FEGGESUND_NEIGHBOR_WAVE_PROXY',
  },
  'a non-winning proxy contribution must remain visible on the downstream zone score',
);

const exactWinnerWithResetLoser = buildIntegratedZoneHourlyProjection({
  rows: [
    {partId:'A',name:'A',scores:[scoreRow(80)]},
    {partId:'B',name:'B',scores:[scoreRow(70,true,'FULL_HISTORY',{
      conservativeTailResetApplied:true,
    })]},
  ],
  expectedPartCount:2,
  selectedMode,
});
assert.equal(exactWinnerWithResetLoser[0].waders.conservativeTailResetApplied,false,
  'a non-winning reset part must not relabel an exact FULL_HISTORY zone score');
assert.equal(exactWinnerWithResetLoser[0].waders.scoreSemantics,'EXACT_POINT_SCORE');

const resetWinnerWithExactLoser = buildIntegratedZoneHourlyProjection({
  rows: [
    {partId:'A',name:'A',scores:[scoreRow(80,true,'FULL_HISTORY',{
      conservativeTailResetApplied:true,
    })]},
    {partId:'B',name:'B',scores:[scoreRow(70)]},
  ],
  expectedPartCount:2,
  selectedMode,
});
assert.equal(resetWinnerWithExactLoser[0].waders.conservativeTailResetApplied,true,
  'a reset FULL_HISTORY winner must retain its own point-score semantics');
assert.equal(resetWinnerWithExactLoser[0].waders.scoreSemantics,
  'CONSERVATIVE_TAIL_RESET_POINT_SCORE');

const only = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 80], ['B', 72], ['C', 60]]),
  expectedPartCount: 3,
  selectedMode,
  marginPoints: RAVSCORE_LOCAL_MARGIN_POINTS,
});
assert.equal(only[0].waders.status, 'only-part');
assert.deepEqual(only[0].waders.parts.map(item => item.partId), ['A']);

const whole = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 80], ['B', 75], ['C', 74]]),
  expectedPartCount: 3,
  selectedMode,
});
assert.equal(whole[0].waders.status, 'whole-zone');
assert.deepEqual(whole[0].waders.parts, []);
assert.equal(whole[0].waders.weather.wavePeriodS, 8,
  'zone projection must retain the wave period used by the integrated mobilisation score');
const localWavePeriod = buildLocalZoneScore({
  coastalParts: {
    enabled: true,
    generatedAt: time,
    zones: { ZONE: { expectedPartCount: 3, hourly: whole } },
    parts: {
      A: {
        name: 'A',
        current: {
          time,
          weather: scoreRow(80).weather,
          waders: selectedMode(scoreRow(80), 'waders'),
        },
      },
    },
  },
  zoneId: 'ZONE',
  mode: 'waders',
  time,
});
assert.equal(localWavePeriod.localWeather.wavePeriodS, 8,
  'local score, assistant and observation consumers must receive the scored wave period');

const unavailable = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 80], ['B', 75, false], ['C', 74]]),
  expectedPartCount: 3,
  selectedMode,
});
assert.equal(unavailable[0].waders.available, false);
assert.equal(unavailable[0].waders.score, null);
assert.equal(unavailable[0].waders.scoreQuality, 'UNAVAILABLE');
assert.equal(unavailable[0].waders.calibrationEligible, false);
assert.equal(unavailable[0].waders.historyCoverageHours, null);
assert.deepEqual(unavailable[0].waders.historyReasonCodes, []);
assert.equal(unavailable[0].waders.parts, undefined,
  'UNAVAILABLE must not manufacture a secondary score list');
assert.deepEqual(unavailable[0].waders.modelBinding, ravScoreModelBinding(),
  'a local unavailable result must remain bound to the one active public model');
assert.deepEqual(unavailable[0].waders.unavailableParts.map(item => item.partId), ['B']);

const missingExpectedPart = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 80], ['B', 75]]),
  expectedPartCount: 3,
  selectedMode,
});
assert.equal(missingExpectedPart[0].waders.available, false);
assert.equal(missingExpectedPart[0].waders.unavailability.code,
  'INTEGRATED_RAVSCORE_PART_COVERAGE_INCOMPLETE');
assert.equal(missingExpectedPart[0].waders.historyCoverageHours, null);
assert.deepEqual(missingExpectedPart[0].waders.historyReasonCodes, []);
assert.match(missingExpectedPart[0].waders.reasons.join(' '), /forventede kystdele mangler/i);
assert.deepEqual(missingExpectedPart[0].waders.modelBinding, ravScoreModelBinding());

const tie = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['B', 80], ['A', 80], ['C', 60]]),
  expectedPartCount: 3,
  selectedMode,
});
assert.equal(tie[0].waders.winningPartId, 'A', 'equal scores must use stable part-id tie breaking');

const qualityTie = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 80, true, 'HISTORY_INCOMPLETE'], ['B', 80], ['C', 60]]),
  expectedPartCount: 3,
  selectedMode,
});
assert.equal(qualityTie[0].waders.winningPartId, 'B',
  'FULL_HISTORY may outrank HISTORY_INCOMPLETE only when their numeric scores tie exactly');
assert.equal(qualityTie[0].waders.scoreQuality, 'HISTORY_INCOMPLETE');
assert.deepEqual(qualityTie[0].waders.scoreBounds, {
  lower:80,upper:90,modelUncertaintyPoints:10,rawLower:80,rawUpper:90,
});
assert.equal(qualityTie[0].waders.winningPartUncertain, true);
assert.deepEqual(qualityTie[0].waders.possibleWinningParts.map(item=>item.partId), ['A','B']);
assert.deepEqual(qualityTie[0].waders.parts.map(item=>({
  partId:item.partId,
  scoreQuality:item.scoreQuality,
  scoreBounds:item.scoreBounds,
  historyCoverageHours:item.historyCoverageHours,
  historyReasonCodes:item.historyReasonCodes,
})), [
  {partId:'B',scoreQuality:'FULL_HISTORY',scoreBounds:{
    lower:80,upper:80,modelUncertaintyPoints:0,rawLower:80,rawUpper:80,
  },historyCoverageHours:48,historyReasonCodes:[]},
  {partId:'A',scoreQuality:'HISTORY_INCOMPLETE',scoreBounds:{
    lower:80,upper:90,modelUncertaintyPoints:10,rawLower:80,rawUpper:90,
  },historyCoverageHours:24,historyReasonCodes:['CURRENT_HISTORY_INCOMPLETE']},
], 'mixed comparison parts must retain each part own quality, bounds, coverage and reasons');

const higherIncomplete = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 81, true, 'HISTORY_INCOMPLETE'], ['B', 80], ['C', 60]]),
  expectedPartCount: 3,
  selectedMode,
});
assert.equal(higherIncomplete[0].waders.winningPartId, 'A',
  'a higher numeric HISTORY_INCOMPLETE score must not be demoted below a lower FULL_HISTORY score');
assert.equal(higherIncomplete[0].waders.calibrationEligible, false);
assert.equal(higherIncomplete[0].waders.score, 81);
assert.equal(higherIncomplete[0].waders.scoreBounds.upper, 91);
assert.equal(higherIncomplete[0].waders.winningPartUncertain, false);

const uncertainLoser = buildIntegratedZoneHourlyProjection({
  rows: [
    {partId:'A',name:'A',scores:[scoreRow(60)]},
    {partId:'B',name:'B',scores:[scoreRow(59,true,'HISTORY_INCOMPLETE',{upper:90})]},
  ],
  expectedPartCount:2,
  selectedMode,
});
for (const mode of ['waders','beach']) {
  assert.equal(uncertainLoser[0][mode].score,60);
  assert.equal(uncertainLoser[0][mode].scoreQuality,'HISTORY_INCOMPLETE');
  assert.equal(uncertainLoser[0][mode].calibrationEligible,false);
  assert.equal(uncertainLoser[0][mode].scoreSemantics,'CONSERVATIVE_ENCLOSING_LOWER_BOUND');
  assert.deepEqual(uncertainLoser[0][mode].scoreBounds,{
    lower:60,upper:90,modelUncertaintyPoints:30,rawLower:60,rawUpper:90,
  });
  assert.equal(uncertainLoser[0][mode].winningPartId,'A');
  assert.equal(uncertainLoser[0][mode].winningPartUncertain,true);
  assert.deepEqual(uncertainLoser[0][mode].possibleWinningParts.map(item=>item.partId),['A','B']);
}

const sevenPartBoundary = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([
    ['P7',70],['P6',63],['P5',62],['P4',61],['P3',60],['P2',59],['P1',58],
  ]),
  expectedPartCount:7,
  selectedMode,
});
assert.equal(sevenPartBoundary[0].waders.status,'several-parts',
  'the exact seven-point margin must remain inclusive with seven parts');
assert.deepEqual(sevenPartBoundary[0].waders.parts.map(item=>item.partId),['P7','P6']);
assert.equal(sevenPartBoundary[0].waders.possibleWinningPartCount,1);

assert.throws(() => buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 80], ['A', 75]]),
  expectedPartCount: 2,
  selectedMode,
}), /unique expected coastal parts/, 'duplicate parts must not satisfy coverage by count');
assert.throws(() => buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['A', 80]]),
  expectedPartCount: 1,
  selectedMode,
  marginPoints: '7',
}), /requires rows/, 'coercible margin values must fail closed');

const projected = buildIntegratedPartPublicProjection({
  row: {
    zoneId: 'ZONE',
    partId: 'A',
    name: 'A',
    ravScoreState: { migrationApplied: true, migrationId: 'fixture' },
  },
  score: {
    ...scoreRow(80),
    ravScoreModel: {
      ...scoreRow(80).ravScoreModel,
      referenceAt: time,
      lastMileWaveReferenceAt: time,
      lastMileMemoryReady: true,
      lastMileMemoryStatus: 'READY',
      continuationState: { schemaVersion: RAVSCORE_STATE_SCHEMA_VERSION },
    },
  },
  scoreProfile: { activeProfileId: RAVSCORE_MODEL_ID },
  selectedMode,
  flowPoints: [],
});
assert.equal(projected.ravScoreModel.scoreImpact, 'active-public');
assert.equal(projected.ravScoreModel.migrationApplied, true);
assert.deepEqual({
  referenceAt: projected.ravScoreModel.lastMileWaveReferenceAt,
  ready: projected.ravScoreModel.lastMileMemoryReady,
  status: projected.ravScoreModel.lastMileMemoryStatus,
}, { referenceAt: time, ready: true, status: 'READY' },
'the integrated part projection must carry schema-6 last-mile readiness into every public consumer');
assert.equal(projected.current.ravScoreModel, undefined);

console.log('RavScore-produktionsadapter: strømproof, fail-closed zoner, vinder og 7-punktsmargin består.');
