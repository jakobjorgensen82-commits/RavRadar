import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION,
  RAVSCORE_LOCAL_MARGIN_POINTS,
  buildIntegratedPartPublicProjection,
  buildIntegratedZoneHourlyProjection,
  dmiExpectedIdentityForPart,
  verifiedBulkCurrent,
  verifiedIntegratedPartHourly,
} from './lib/ravscore-production-adapters.mjs';
import { copernicusLiveRecordProjectionSha256 } from './lib/live-current-pilot.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
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
const scoreRow = (score, available = true) => ({
  time,
  weather: {
    waveHeightM: 1.2,
    wavePeriodS: 8,
    currentSpeedMps: 0.08,
    currentProvenance: { status: 'verified' },
  },
  ravScoreModel: {
    modes: Object.fromEntries(['waders', 'beach'].map(mode => [mode, available ? {
      available: true,
      score,
      components: { huntability: score, transport: score, release: score },
      explanation: { transportDiagnostics: { coastTransportExplanation: 'bounded' } },
    } : {
      available: false,
      score: null,
      unavailability: { code: 'FIXTURE_MISSING', messageDa: 'Fixture mangler.' },
    }])),
  },
});
const selectedMode = (row, mode) => row.ravScoreModel.modes[mode];
const zoneRows = values => values.map(([partId, score, available = true]) => ({
  partId,
  name: partId,
  scores: [scoreRow(score, available)],
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
assert.match(missingExpectedPart[0].waders.reasons.join(' '), /forventede kystdele mangler/i);
assert.deepEqual(missingExpectedPart[0].waders.modelBinding, ravScoreModelBinding());

const tie = buildIntegratedZoneHourlyProjection({
  rows: zoneRows([['B', 80], ['A', 80], ['C', 60]]),
  expectedPartCount: 3,
  selectedMode,
});
assert.equal(tie[0].waders.winningPartId, 'A', 'equal scores must use stable part-id tie breaking');

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
      continuationState: { schemaVersion: 4 },
    },
  },
  scoreProfile: { activeProfileId: 'RRS-COASTAL-PROCESS-INTEGRATED-1.0.0' },
  selectedMode,
  flowPoints: [],
});
assert.equal(projected.ravScoreModel.scoreImpact, 'active-public');
assert.equal(projected.ravScoreModel.migrationApplied, true);
assert.equal(projected.current.ravScoreModel, undefined);

console.log('RavScore-produktionsadapter: strømproof, fail-closed zoner, vinder og 7-punktsmargin består.');
