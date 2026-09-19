import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';
import { verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { buildFeggesundWaveInputProofEntry } from './lib/feggesund-wave-proxy.mjs';
import { flowPointsFromForecastRecord } from './lib/flow-points-from-forecast-record.mjs';
import {
  buildOpenMeteoPartRequest, mergeOpenMeteoPartBank, readOpenMeteoPartResponse,
  validateOpenMeteoPartBank, openMeteoMfNearestGridPoint,
} from './lib/open-meteo-part-bank.mjs';

const reference = '2026-09-19T00:00:00.000Z';
const part = { partId: 'TEST', zoneId: 'DK-B05-11', waterPoint: openMeteoMfNearestGridPoint([10, 56]), onshoreDirectionDeg: 90 };
const at = hours => new Date(Date.parse(reference) + hours * 3_600_000).toISOString();
const spatialPolicies = Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature']
  .map(component => [component, { policyId: 'synthetic-exact-cell-only', maximumDistanceKm: 0,
    ...(component === 'waterTemperature' ? { cellSelection: 'nearest' } : {}) }]));
const options = { parts: [part], spatialPolicies, retentionStartAt: at(-48), retentionEndAt: at(120) };
const admissions = ['wind', 'wave', 'waterTemperature'].map(component => {
  const response = { longitude: part.waterPoint[0], latitude: part.waterPoint[1], utc_offset_seconds: 0,
    hourly: { time: [reference], ...(component === 'wind'
      ? { wind_speed_10m: [4], wind_direction_10m: [90] }
      : { wave_height: [1], wave_peak_period: [6], wave_direction: [180],
        sea_level_height_msl: [0.2], sea_surface_temperature: [15] }) },
    hourly_units: component === 'wind' ? { wind_speed_10m: 'm/s', wind_direction_10m: '°' }
      : { wave_height: 'm', wave_peak_period: 's', wave_direction: '°', sea_level_height_msl: 'm', sea_surface_temperature: '°C' },
  };
  return readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, { component, productionReferenceAt: reference,
    cellSelection: spatialPolicies[component].cellSelection }),
    responseText: JSON.stringify(response), acquiredAt: reference }, { part, spatialPolicies });
});
const bank = mergeOpenMeteoPartBank(null, admissions, options);
const componentInputs = { productionReferenceAt: reference,
  openMeteoComponentIndex: validateOpenMeteoPartBank(bank, options) };
const sanitize = (hourly, target = part, inputs = componentInputs) => verifiedIntegratedPartHourly(
  { hourly }, {}, `PART::${target.partId}`, target, inputs);

test('response-bound PART bank reaches actual model adapter without relabeling native sea level', () => {
  const [row] = sanitize([{ time: reference }]);
  assert.equal(row.windSpeedMps, 4);
  assert.equal(row.wavePeriodS, 6);
  assert.equal(row.waterTemperatureC, 15);
  for (const key of ['windProvenance', 'waveProvenance', 'waterTemperatureProvenance']) {
    assert.equal(row[key].status, 'verified');
    assert.equal(row[key].provider, 'open-meteo');
    assert.equal(row[key].modelRun, null);
  }
  assert.equal(row.waterLevelCm, null);
  assert.equal(row.waterLevelTrendCm3h, null);
  assert.equal(row.currentUMps, null);
  assert.equal(row.waveInputSource, 'DIRECT_OFFICIAL');
  const entry = buildFeggesundWaveInputProofEntry({ partId: part.partId, time: reference,
    hour: row, part, componentInputs });
  assert.equal(entry.disposition, 'DIRECT');
  const arrows = flowPointsFromForecastRecord({ hourly: [row] }, part.waterPoint, reference, part, componentInputs);
  assert.equal(arrows.sources.wind, 'open-meteo-wind-grid');
  assert.equal(arrows.sources.wave, 'open-meteo-wave-grid');
  assert.deepEqual(arrows.wind, row.windProvenance.gridPoint);
  const noAuthority = flowPointsFromForecastRecord({ hourly: [row] }, part.waterPoint, reference, part);
  assert.equal(noAuthority.sources.wind, 'zone-marine-anchor');
  assert.equal(flowPointsFromForecastRecord({ hourly: [{ ...row, windSpeedMps: 8 }] },
    part.waterPoint, reference, part, componentInputs).sources.wind, 'zone-marine-anchor');
  assert.throws(() => buildFeggesundWaveInputProofEntry({ partId: part.partId, time: reference,
    hour: row, part }), /inconsistent accepted input/);
  assert.throws(() => buildFeggesundWaveInputProofEntry({ partId: part.partId, time: reference,
    hour: { ...row, wavePeriodS: 7 }, part, componentInputs }), /inconsistent accepted input/);
});

test('Open-Meteo cannot create a water-level request because water level is DMI-only', () => {
  assert.throws(() => buildOpenMeteoPartRequest(part, {
    component: 'waterLevel',
    productionReferenceAt: reference,
  }), /OPEN_METEO_WATER_LEVEL_DMI_ONLY/);
});

test('a fake verified flag, wrong PART point or wrong time does not admit reserve data', () => {
  const source = { provider: 'open-meteo', status: 'verified', component: 'wind' };
  const fake = { time: reference, windSpeedMps: 50, windDirectionDeg: 180,
    sources: { wind: source }, windProvenance: source };
  assert.equal(sanitize([fake], part, { productionReferenceAt: reference,
    openMeteoComponentIndex: { recordCount: 4 } })[0].windSpeedMps, null);
  assert.equal(sanitize([fake], { ...part, waterPoint: [10.1, 56] })[0].windSpeedMps, null);
  assert.equal(sanitize([{ time: at(1) }])[0].waveHeightM, null);
  assert.throws(() => sanitize([{ time: reference }], part,
    { openMeteoComponentIndex: componentInputs.openMeteoComponentIndex }), /LOCKED_TIME/);
});

test('unknown-age reserve does not replace qualified DMI even after 96 hours', () => {
  for (const age of [3, 96, 100]) {
    const modelRun = at(-age);
    const source = {
      provider: 'dmi', fallback: false, collection: 'harmonie_dini_sf', collectionFamily: 'wind',
      component: 'wind', componentKind: 'atmospheric-wind-vector', fieldSet: ['wind-u-10m', 'wind-v-10m'],
      optionalFieldSet: [], modelRun, nativeValidTime: reference, leadTimeHours: age,
      entityId: 'PART::TEST', parentZoneId: part.zoneId, entityType: 'coastal-part',
      samplingContext: 'coastal-part-water-point', samplingPoint: part.waterPoint,
      gridPoint: part.waterPoint, gridDefinitionSha256: 'a'.repeat(64), distanceKm: 0,
      spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', spatialSemanticsVersion: 1,
      vectorSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', vectorSemanticsVersion: 2,
      vectorReference: 'earth-relative-east-north', vectorTransform: 'lambert-conformal-to-earth-relative',
      itemId: 'synthetic-wind', assetIdentitySha256: 'b'.repeat(64), acquiredAt: reference,
    };
    const dmi = buildDmiForecastHourly({ generatedAt: reference, hours: 1,
      wind: [{ step: reference, 'wind-speed-10m': 8, 'wind-dir-10m': 270, provenance: { wind: source } }],
    });
    const [row] = sanitize(dmi.hourly);
    assert.equal(row.windSpeedMps, 8);
    assert.equal(row.windProvenance.provider, 'dmi');
    assert.equal(row.waveProvenance.provider, 'open-meteo', 'independent missing wave is still filled');
  }
});
