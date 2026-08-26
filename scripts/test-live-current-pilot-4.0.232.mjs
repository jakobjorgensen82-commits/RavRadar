import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  flattenCoastalPartsWithParentZoneId,
  latestVerifiedNativeCadenceSampleForPart,
  mergeLiveCurrentPilotIntoRecord,
  nativeCadenceHoldHoursForPart,
  verifiedLivePilotSource,
  verifiedNativeCadenceReferenceForPart,
} from './lib/live-current-pilot.mjs';
import { flowPointsFromForecastRecord } from './lib/flow-points-from-forecast-record.mjs';
import { buildFlowArrowCandidates } from '../js/map/map-view.js';

const part = { partId: 'P1', zoneId: 'Z1', waterPoint: [10, 55] };
const dmiSource = {
  provider: 'dmi', vectorSemanticsVersion: 3, verticalLayer: 'depthbelowsea:7',
  vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
  samplingPoint: part.waterPoint, gridPoint: [10.01, 55], distanceKm: 0.64,
};
const copernicusEntry = {
  partId: 'P1', parentZoneId: 'Z1', validTime: '2026-08-18T13:00:00.000Z',
  samplingPoint: part.waterPoint, provider: 'copernicus', sourceClass: 'supplemental-local-current',
  source: 'copernicus-baltic-nemo', productId: 'P', datasetId: 'D', gridPoint: [10.02, 55],
  distanceKm: 1.28, verticalLayer: 'depth:12', verticalLayerRankM: 12,
  componentPair: 'same-time-cell-layer', interpolation: false, vectorSemanticsVersion: 4,
  uMps: 0.3, vMps: -0.4,
};
const live = {
  schemaVersion: 1, controlledLivePilot: true, mode: 'controlled-live', enabled: true,
  credentialsIncluded: false, entries: [copernicusEntry],
};
const regionalPart = { partId: 'R1', zoneId: 'ZR', waterPoint: [11, 56] };
const regionalEntry = {
  partId: 'R1', parentZoneId: 'ZR', validTime: '2026-08-18T12:00:00.000Z',
  samplingPoint: regionalPart.waterPoint, provider: 'dmi', sourceClass: 'owner-approved-regional-proxy',
  source: 'dmi-dkss-lf-regional-proxy', collection: 'dkss_lf', gridPoint: [11.1, 56],
  distanceKm: 6.2, verticalLayer: 'depthbelowsea:5', verticalLayerRankM: 5,
  componentPair: 'same-time-cell-layer', interpolation: false, vectorSemanticsVersion: 4,
  uMps: 0.1, vMps: 0.2,
};
const regionalLive = { ...live, entries: [regionalEntry] };
const flattenedRegionalParts = flattenCoastalPartsWithParentZoneId({
  zones: { ZR: [{ partId: 'R1', zoneId: 'STALE', waterPoint: regionalPart.waterPoint }] },
});
assert.equal(flattenedRegionalParts.length, 1);
assert.equal(flattenedRegionalParts[0].zoneId, 'ZR',
  'the authoritative parent-zone map key must survive flattening and override stale embedded context');
assert.equal(verifiedNativeCadenceReferenceForPart(
  flattenedRegionalParts[0], regionalLive, '2026-08-18T12:00:00.000Z'), true,
  'the final audit must recognize native-cadence evidence after flattening coastal parts');
assert.equal(nativeCadenceHoldHoursForPart(regionalPart, regionalLive), 3);
const regionalReferenceSample = latestVerifiedNativeCadenceSampleForPart(
  { ...regionalPart, onshoreDirectionDeg: 45 },
  regionalLive,
  '2026-08-18T13:00:00.000Z',
);
assert.equal(regionalReferenceSample?.time, '2026-08-18T12:00:00.000Z');
assert.equal(regionalReferenceSample?.currentVerified, true);
assert.ok(Number.isFinite(regionalReferenceSample?.currentSpeedMps));
assert.ok(Number.isFinite(regionalReferenceSample?.currentAlignment));
assert.deepEqual(Object.keys(regionalReferenceSample).sort(), [
  'currentAlignment', 'currentSpeedMps', 'currentVerified', 'time',
].sort(), 'referenceprøven må ikke føre rå U/V, koordinater eller kilde-id videre');
assert.equal(latestVerifiedNativeCadenceSampleForPart(
  { ...regionalPart, onshoreDirectionDeg: 45 }, regionalLive, '2026-08-18T16:00:01.000Z'), null,
'a native measurement older than three hours must not seed Candidate G');
assert.equal(verifiedNativeCadenceReferenceForPart(
  regionalPart, regionalLive, '2026-08-18T12:00:00.000Z'), true);
assert.equal(verifiedNativeCadenceReferenceForPart(
  regionalPart, regionalLive, '2026-08-18T13:00:00.000Z'), false,
'a held state must reference a real native source row, not an invented intermediate hour');
assert.equal(nativeCadenceHoldHoursForPart(part, live), 0,
  'Copernicus entries must not receive native-cadence hold permission');
const record = {
  model: { completeness: {
    currentVectorSemanticsVersion: 3, currentVectorSelection: dmiSource.vectorSelection,
    currentMaxDistanceKm: 5, samplingPoint: part.waterPoint, gridPoints: {},
  } },
  hourly: [
    { time: '2026-08-18T12:00:00.000Z', currentUMps: 0.1, currentVMps: 0.2, currentSpeedMps: 0.22, currentDirectionDeg: 27, sources: { current: dmiSource } },
    { time: '2026-08-18T13:00:00.000Z', currentUMps: null, currentVMps: null, sources: { current: { provider: 'missing' } } },
    { time: '2026-08-18T14:00:00.000Z', currentUMps: null, currentVMps: null, sources: { current: { provider: 'missing' } } },
  ],
};
const merged = mergeLiveCurrentPilotIntoRecord(record, part, live, {
  primaryCurrentVerified: row => row.time === '2026-08-18T12:00:00.000Z',
});
assert.equal(merged.hourly[0].sources.current.provider, 'dmi', 'Gyldig lokal DMI skal altid vinde.');
assert.equal(merged.hourly[1].sources.current.provider, 'copernicus');
assert.equal(merged.hourly[1].currentSpeedMps, 0.5);
assert.equal(merged.hourly[1].currentDirectionDeg, 143);
assert.equal(merged.hourly[2].currentUMps, null, 'Et nabotidspunkt må ikke udfyldes ved interpolation.');
assert.ok(verifiedLivePilotSource(merged.hourly[1].currentProvenance, part.waterPoint, { requireStatus: true }));

const flow = flowPointsFromForecastRecord(merged, part.waterPoint, '2026-08-18T13:00:00.000Z');
assert.deepEqual(flow.current, [10.02, 55]);
assert.equal(flow.sources.current, 'copernicus-current-grid');
const dmiFlow = flowPointsFromForecastRecord(merged, part.waterPoint, '2026-08-18T12:00:00.000Z');
assert.equal(dmiFlow.sources.current, 'dmi-marine-grid');

const rollback = mergeLiveCurrentPilotIntoRecord(record, part, { ...live, mode: 'dmi-only-rollback', enabled: false });
assert.equal(rollback.hourly[1].currentUMps, null, 'Rollback må ikke føre supplerende strøm til score.');
const tooFar = { ...merged.hourly[1].currentProvenance, gridPoint: [10.3, 55], distanceKm: 20 };
assert.equal(verifiedLivePilotSource(tooFar, part.waterPoint, { requireStatus: true }), null, 'En fjern, ikke-godkendt celle skal afvises.');

const features = { type: 'FeatureCollection', features: [{ properties: { id: 'Z1', zoneStatus: 'active', dataPoint: [10, 55] } }] };
const coastalParts = { enabled: true, zones: {
  Z1: { currentReferenceAt: '2026-08-18T13:00:00.000Z' },
}, parts: {
  P1: { zoneId: 'Z1', flowPoints: flow, current: { time: '2026-08-18T13:00:00.000Z', weather: { currentDirectionDeg: 143 } } },
} };
const arrows = buildFlowArrowCandidates(features, () => ({ current: {}, flowPoints: {} }), coastalParts, 10);
assert.equal(arrows.length, 1);
assert.equal(arrows[0].source, 'copernicus-current-grid');
assert.deepEqual(arrows[0].point, [10.02, 55]);

const [workflow, updateWeather, packageRelease] = await Promise.all([
  fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8'),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  fs.readFile('scripts/package-release.mjs', 'utf8'),
]);
const buildPosition = workflow.indexOf('name: Build public seven-day current history and controlled live selection');
const weatherPosition = workflow.indexOf('name: Update central weather cache');
assert.ok(buildPosition >= 0 && buildPosition < weatherPosition, 'Livehistorikken skal bygges før score og pile.');
assert.match(updateWeather, /mergeLiveCurrentPilotIntoRecord/);
assert.match(updateWeather, /current-pilot-history\.json/);
assert.match(updateWeather, /latestVerifiedNativeCadenceSampleForPart/,
  'weather build must fetch the last exact native-cadence row before the public window');
assert.match(updateWeather, /nativeCadenceReferenceSample/,
  'weather build must pass the data-minimised native reference into Candidate G state');
assert.ok(!packageRelease.includes("'data/live/*'"), 'Onlinehistorikken må ikke udelukkes af releasepakken.');

console.log('OK: DMI-først, eksakt Copernicus-fletning, rigtig pilcelle og DMI-only rollback er regressionslåst.');
