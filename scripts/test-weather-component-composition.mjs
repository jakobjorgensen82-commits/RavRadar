import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  buildDmiForecastHourly, createDmiForecastRecord, DMI_FORECAST_HOURS,
  normalizeForecastHourly, verifiedDmiPeakPeriodField, verifiedDmiForecastSource,
} from './lib/dmi-forecast-store.mjs';
import { verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { preferQualifiedDmiComponentSource } from './lib/weather-component-selection.mjs';
import { repairWaterLevelContinuity } from './lib/water-level-continuity.mjs';
import {
  buildOpenMeteoHourlyComponents, fetchIndependentOpenMeteoComponents,
  openMeteoUtcTime, buildOpenMeteoIndependentHourlyComponents, fetchOpenMeteoComponentResponses,
} from './lib/open-meteo-hourly-components.mjs';

const reference = '2026-09-19T00:00:00.000Z';
const at = hour => new Date(Date.parse(reference) + hour * 3_600_000).toISOString();
const response = hourly => ({ utc_offset_seconds: 0, hourly, hourly_units: {
  wind_speed_10m: 'm/s', wind_direction_10m: '°', temperature_2m: '°C',
  wave_height: 'm', wave_peak_period: 's', wave_direction: '°',
  sea_level_height_msl: 'm', sea_surface_temperature: '°C',
} });

test('Open-Meteo wrong units or shifted field lengths reject only affected components', () => {
  const weather = response({ time: [at(0), at(1)], wind_speed_10m: [5, 6],
    wind_direction_10m: [90, 90], temperature_2m: [15, 16] });
  weather.hourly_units.wind_speed_10m = 'km/h';
  const marine = response({ time: [at(0), at(1)], wave_height: [1, 1],
    wave_peak_period: [6, 7], wave_direction: [180, 180],
    sea_level_height_msl: [0.2], sea_surface_temperature: [16, 16] });
  const errors = [];
  const rows = buildOpenMeteoHourlyComponents(weather, marine, {
    onInvalidField: (variable, code) => errors.push([variable, code]),
  });
  for (const row of rows) {
    assert.equal(row.windSpeedMps, null);
    assert.equal(row.windDirectionDeg, null);
    assert.equal(row.waterLevelCm, null);
    assert.equal(row.waveHeightM, 1);
    assert.equal(row.waterTemperatureC, 16);
  }
  assert.deepEqual(errors, [
    ['wind_speed_10m', 'OPEN_METEO_FIELD_UNIT_INVALID'],
  ]);
  delete weather.hourly_units.wind_speed_10m;
  assert.equal(buildOpenMeteoHourlyComponents(weather, null)[0].windSpeedMps, null);
});

test('Open-Meteo rejects silently normalised calendar hours', () => {
  assert.equal(openMeteoUtcTime('2026-02-30T00:00'), null);
  assert.equal(openMeteoUtcTime('2026-09-19T24:00'), null);
  assert.equal(openMeteoUtcTime('2026-09-19T00:00+00:00'), at(0));
  assert.equal(openMeteoUtcTime('2026-09-19T00:00'), at(0));
});

test('explicit component responses cannot borrow a tuple field from a different model', () => {
  const rows = buildOpenMeteoIndependentHourlyComponents({
    wind: response({ time: [at(0)], wind_speed_10m: [7], wind_direction_10m: [90] }),
    wave: response({ time: [at(0), at(3)], wave_height: [1, 2],
      wave_peak_period: [null, 8], wave_direction: [180, 190], sea_level_height_msl: [9, 10] }),
    waterLevel: response({ time: [at(0), at(3)], sea_level_height_msl: [0.1, 0.4],
      wave_peak_period: [6, 6], sea_surface_temperature: [99, 99] }),
    waterTemperature: response({ time: [at(1)], sea_surface_temperature: [15] }),
  });
  assert.deepEqual(rows.map(row => row.time), [at(0), at(1), at(3)]);
  assert.equal(rows[0].waveHeightM, null, 'a foreign peak cannot complete this wave model');
  assert.equal(rows[0].waterLevelCm, null, 'reserve level is never selected, even from its own response');
  assert.equal(rows[0].waterLevelTrendCm3h, null);
  assert.equal(rows[0].waterTemperatureC, null);
  assert.equal(rows[1].waterTemperatureC, 15);
  assert.equal(rows[2].waveHeightM, 2);
  assert.equal(rows[2].waterLevelTrendCm3h, null);
});

test('bounded independent model transport keeps successful siblings after setup or time-axis errors', async () => {
  const errors = [];
  let active = 0;
  let maximum = 0;
  const delayed = async document => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve));
    active -= 1;
    return document;
  };
  const responses = await fetchOpenMeteoComponentResponses({
    wind: () => delayed(response({ time: [at(0)], wind_speed_10m: [5], wind_direction_10m: [360] })),
    wave: () => { throw new Error('synthetic setup'); },
    waterLevel: () => assert.fail('DMI-only level must not start reserve transport'),
    waterTemperature: () => delayed(response({ time: [at(0)], sea_surface_temperature: [15] })),
  }, { concurrency: 2, onError: component => errors.push(component) });
  assert.ok(maximum <= 2);
  assert.deepEqual(errors.sort(), ['wave']);
  const [row] = buildOpenMeteoIndependentHourlyComponents(responses);
  assert.equal(row.windSpeedMps, 5);
  assert.equal(row.windDirectionDeg, 0);
  assert.equal(row.waterTemperatureC, 15);
  assert.equal(row.waveHeightM, null);
  assert.equal(row.waterLevelCm, null);
});

test('a synchronous component setup error still lets the independent request finish', async () => {
  let marineRequested = false;
  const marineResponse = response({ time: [at(0)] });
  const errors = [];
  const result = await fetchIndependentOpenMeteoComponents({
    weather: () => { throw new Error('synthetic setup error'); },
    marine: async () => { marineRequested = true; return marineResponse; },
    onError: component => errors.push(component),
  });
  assert.equal(marineRequested, true);
  assert.deepEqual(result, [null, marineResponse]);
  assert.deepEqual(errors, ['weather']);
});

test('duplicate components retain the matching value and original source atomically', () => {
  const first = { time: reference, windSpeedMps: 4, windDirectionDeg: 90,
    sources: { wind: { provider: 'dmi', modelRun: at(-6) } } };
  const next = { time: reference, windSpeedMps: 8, windDirectionDeg: 180,
    waterTemperatureC: 15, sources: { wind: { provider: 'open-meteo' },
      waterTemperature: { provider: 'copernicus' } } };
  const [row] = normalizeForecastHourly([first, next]);
  assert.equal(row.windSpeedMps, 4);
  assert.deepEqual(row.sources.wind, first.sources.wind);
  assert.equal(row.waterTemperatureC, 15);
  assert.deepEqual(row.sources.waterTemperature, next.sources.waterTemperature);
  assert.notEqual(row.sources, first.sources);
});

test('incomplete vectors cannot borrow their other half or retain a foreign proof', () => {
  const [row] = normalizeForecastHourly([
    { time: reference, currentUMps: 1, currentVMps: null, sources: { current: { id: 'old' } } },
    { time: reference, currentUMps: null, currentVMps: 2, sources: { current: { id: 'other' } } },
  ]);
  assert.equal(row.currentVMps, null);
  assert.equal(row.sources.current.id, 'old');
  const [replaced] = normalizeForecastHourly([row,
    { time: reference, currentUMps: 3, currentVMps: 4, sources: { current: { id: 'whole' } } },
  ]);
  assert.deepEqual([replaced.currentUMps, replaced.currentVMps], [3, 4]);
  assert.equal(replaced.sources.current.id, 'whole');
});

test('directionless waves cannot block a later complete tuple or borrow its direction', () => {
  const [row] = normalizeForecastHourly([
    { time: reference, waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: null,
      sources: { wave: { id: 'partial' } } },
    { time: reference, waveHeightM: 2, wavePeriodS: 7, waveDirectionDeg: 180,
      sources: { wave: { id: 'complete' } } },
  ]);
  assert.deepEqual([row.waveHeightM, row.wavePeriodS, row.waveDirectionDeg], [2, 7, 180]);
  assert.equal(row.sources.wave.id, 'complete');
});

const qualifiedDmi = (overrides = {}) => ({
  provider: 'dmi', collection: 'dkss_idw', component: 'waterLevel',
  modelRun: at(-6), entityId: 'PART::TEST', parentZoneId: 'TEST-ZONE',
  entityType: 'coastal-part', samplingContext: 'coastal-part-water-point',
  samplingPoint: [10, 56], gridPoint: [10, 56], gridDefinitionSha256: 'a'.repeat(64),
  distanceKm: 0, verticalLayerRankM: 1,
  nativeValidTime: reference, itemId: 'one', assetIdentitySha256: 'b'.repeat(64),
  acquiredAt: reference, ...overrides,
});

test('qualified donor freshness uses model run, never acquiredAt or hash alone', () => {
  const old = qualifiedDmi();
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ modelRun: at(-3) }), 'waterLevel'), true);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ acquiredAt: at(5),
    assetIdentitySha256: 'c'.repeat(64) }), 'waterLevel'), false);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ modelRun: at(-9),
    acquiredAt: at(5) }), 'waterLevel'), false);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ provider: 'open-meteo',
    modelRun: at(-1) }), 'waterLevel'), false);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ entityId: 'PART::OTHER',
    modelRun: at(-1) }), 'waterLevel'), false);
});

test('current selection retains spatial and layer priority before model freshness', () => {
  const old = qualifiedDmi({ component: 'current', distanceKm: 1 });
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ component: 'current',
    distanceKm: 2, gridPoint: [10.01, 56], modelRun: at(-1) }), 'current'), false);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ component: 'current',
    distanceKm: 0.5, gridPoint: [10.001, 56], modelRun: at(-9) }), 'current'), true);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ component: 'current',
    verticalLayerRankM: 2, modelRun: at(-9) }), 'current'), true);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({ component: 'current',
    verticalLayerRankM: 0.5, modelRun: at(-1) }), 'current'), false);
});

test('same-run revision requires comparable official timestamps for every changed endpoint', () => {
  const step = (hour, revision) => ({ nativeValidTime: at(hour), itemId: `item-${hour}-${revision}`,
    assetIdentitySha256: String(revision).repeat(64), itemUpdatedAt: at(revision) });
  const old = qualifiedDmi({ nativeSteps: [step(0, 1), step(3, 1)] });
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({
    nativeSteps: [step(0, 2), step(3, 1)],
  }), 'waterLevel'), true);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({
    nativeSteps: [step(0, 2), step(3, 0)],
  }), 'waterLevel'), false);
  assert.equal(preferQualifiedDmiComponentSource(old, qualifiedDmi({
    nativeSteps: [step(0, 2), { ...step(3, 2), itemUpdatedAt: undefined, itemCreatedAt: at(2) }],
  }), 'waterLevel'), false);
  assert.equal(preferQualifiedDmiComponentSource(
    qualifiedDmi({ itemUpdatedAt: at(1) }), qualifiedDmi({ itemUpdatedAt: at(2) }),
    'waterLevel',
  ), true, 'an official revision can update the same STAC item and asset URL');
});

// Evaluate only the actual pure merge functions, never the executable producer
// (which performs network and filesystem work at module top level).
const producerSource = fs.readFileSync(new URL('./update-weather.mjs', import.meta.url), 'utf8');
const mergeSource = producerSource.slice(
  producerSource.indexOf('const ATOMIC_COMPONENT_TUPLE_KEYS ='),
  producerSource.indexOf('\nfunction componentSource('),
);
assert.ok(mergeSource.startsWith('const ATOMIC_COMPONENT_TUPLE_KEYS ='));
const mergeContext = vm.createContext({
  Date, DMI_FORECAST_HOURS, ACCEPTED_FORECAST_HOURS: 118, normalizeForecastHourly,
  repairWaterLevelContinuity, SHORT_DMI_WATER_GAP_HOURS: 6, WATER_LEVEL_JUMP_WARN_CM: 35,
  preferQualifiedDmiComponentSource,
  ravScoreNumber: value => typeof value === 'number' && Number.isFinite(value) ? value : null,
  verifiedDmiForecastComponentSource: (source, time, component, identity) =>
    verifiedDmiForecastSource(source, component, time, identity),
});
vm.runInContext(`${mergeSource}\nglobalThis.mergeForTest = mergeHourlyPreferDmi;`, mergeContext);
const recordMergeSource = producerSource.slice(producerSource.indexOf('function newerDmiRecord('),
  producerSource.indexOf('\nfunction mergeDmiStores('));
vm.runInContext(`${recordMergeSource}\nglobalThis.recordMergeForTest = newerDmiRecord;`, mergeContext);

const parentIdentity = { entityId: 'ZONE', parentZoneId: 'ZONE', entityType: 'parent-zone',
  samplingContext: 'parent-zone-water-point', samplingPoint: [10, 56] };
function parentHour(hour, { wind = null, temperature = null, level = null,
  identity = parentIdentity, modelRun = at(-6) } = {}) {
  const time = at(hour);
  const proof = (component, fields, kind) => ({
    ...qualifiedDmi({ component, modelRun }), ...identity,
    fallback: false, nativeValidTime: time, leadTimeHours: (Date.parse(time) - Date.parse(modelRun)) / 3_600_000,
    collection: component === 'wind' ? 'harmonie_dini_sf' : 'dkss_idw',
    collectionFamily: component === 'wind' ? 'wind' : 'marine', componentKind: kind,
    fieldSet: fields, optionalFieldSet: [], spatialSemanticsVersion: 1,
    spatialSelection: component === 'wind' ? 'nearest-shared-grid-cell-no-spatial-interpolation'
      : 'nearest-valid-grid-cell-no-spatial-interpolation',
    ...(component === 'wind' ? { vectorSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
      vectorSemanticsVersion: 2, vectorReference: 'earth-relative-east-north',
      vectorTransform: 'lambert-conformal-to-earth-relative' } : {}),
  });
  return buildDmiForecastHourly({ generatedAt: reference, startAt: time, hours: 1,
    wind: wind === null ? [] : [{ step: time, 'wind-speed-10m': wind, 'wind-dir-10m': 90,
      provenance: { wind: proof('wind', ['wind-u-10m', 'wind-v-10m'], 'atmospheric-wind-vector') } }],
    ocean: [{ step: time, 'water-temperature': temperature, 'sea-mean-deviation': level,
      provenance: {
        waterTemperature: proof('waterTemperature', ['water-temperature'], 'marine-water-temperature-scalar'),
        waterLevel: proof('waterLevel', ['sea-mean-deviation'], 'marine-water-level-scalar'),
      } }],
  }).hourly[0];
}

test('whole-cache freshness cannot erase valid exact-time components from the older file', () => {
  const older = { zoneId: 'ZONE', point: [10, 56], generatedAt: at(-1), validFrom: at(0), validUntil: at(2),
    hourly: [parentHour(0, { wind: 4 }), parentHour(2, { wind: 6 })] };
  const newer = { ...older, generatedAt: at(0), validUntil: at(0),
    hourly: [parentHour(0, { temperature: 15 })] };
  const merged = mergeContext.recordMergeForTest(older, newer);
  assert.equal(merged.generatedAt, newer.generatedAt);
  assert.equal(merged.hourly[0].windSpeedMps, 4);
  assert.equal(merged.hourly[0].sources.wind, older.hourly[0].sources.wind);
  assert.equal(merged.hourly[0].waterTemperatureC, 15);
  assert.equal(merged.validUntil, at(2));
  const moved = { ...newer, point: [10.1, 56] };
  const movedResult = mergeContext.recordMergeForTest(older, moved);
  assert.equal(movedResult.hourly.length, 1, 'a point change must not inherit the old tail');
  assert.equal(movedResult.hourly[0].windSpeedMps, undefined);
  assert.equal(movedResult.hourly[0].waterTemperatureC, undefined,
    'old-point proof in a new-point record is not admitted');
});

test('cache admission checks lone rows, empty components and donor-only tail hours', () => {
  const make = (generatedAt, hourly) => ({ zoneId: 'ZONE', point: [10, 56], generatedAt,
    validFrom: at(0), validUntil: hourly.at(-1).time, hourly });
  const wrongIdentity = { ...parentIdentity, entityId: 'WRONG' };
  const donor = make(at(-1), [parentHour(0, { level: 0.2, identity: wrongIdentity }),
    parentHour(2, { wind: 6, identity: wrongIdentity })]);
  const primary = make(at(0), [parentHour(0, { temperature: 15 })]);
  for (const args of [[primary, donor], [null, donor], [donor, null]]) {
    const result = mergeContext.recordMergeForTest(...args);
    assert.equal(result.hourly[0].waterLevelCm, undefined);
    assert.equal(result.hourly[0].sources.waterLevel, undefined);
    assert.equal(result.hourly.at(-1).windSpeedMps, undefined);
    assert.equal(result.hourly.at(-1).sources.wind, undefined);
  }
  const validDonor = make(at(-1), [parentHour(0, { level: 0.3 })]);
  const invalidPrimary = make(at(0), donor.hourly);
  assert.equal(mergeContext.recordMergeForTest(invalidPrimary, validDonor).hourly[0].waterLevelCm, 30,
    'an unqualified primary value cannot block a qualified older-file donor');
});

test('north at 360 degrees is canonical at both normalisation and direct tuple selection', () => {
  for (const [component, speedKey, directionKey] of [
    ['wind', 'windSpeedMps', 'windDirectionDeg'], ['current', 'currentSpeedMps', 'currentDirectionDeg'],
  ]) {
    const primary = { time: reference, [speedKey]: 4, [directionKey]: 360 };
    const donor = { time: reference, [speedKey]: 5, [directionKey]: 90 };
    const [normalised] = normalizeForecastHourly([primary, donor]);
    assert.equal(normalised[directionKey], 0);
    assert.equal(normalised[speedKey], 4);
    assert.equal(primary[directionKey], 360, 'the source row is not mutated');
    const select = vm.runInContext('selectAtomicComponentTuple', mergeContext);
    assert.equal(select(primary, donor, component).values[directionKey], 0);
    const [invalid] = normalizeForecastHourly([{ ...primary, [directionKey]: 361 }, donor]);
    assert.equal(invalid[speedKey], 5, 'out-of-range is not silently wrapped');
  }
});

test('actual producer merge selects newer admitted donor and drops old derived metadata', () => {
  const identity = { entityId: 'PART::TEST', parentZoneId: 'TEST-ZONE',
    entityType: 'coastal-part', samplingContext: 'coastal-part-water-point', samplingPoint: [10, 56] };
  const build = (runOffset, level) => buildDmiForecastHourly({ generatedAt: reference,
    ocean: [{ step: reference, 'sea-mean-deviation': level, provenance: { waterLevel: {
      ...qualifiedDmi({ modelRun: at(runOffset) }), ...identity, fallback: false,
      collectionFamily: 'marine', componentKind: 'marine-water-level-scalar',
      fieldSet: ['sea-mean-deviation'], optionalFieldSet: [], leadTimeHours: -runOffset,
      spatialSelection: 'nearest-valid-grid-cell-no-spatial-interpolation', spatialSemanticsVersion: 1,
    } } }],
  }).hourly;
  const primary = build(-6, 0.1);
  primary[0].waterLevelBiasCm = 200;
  primary[0].waterLevelProvenance = { status: 'verified', modelRun: at(-6) };
  const donor = build(-3, 0.2);
  const [row] = mergeContext.mergeForTest(primary, donor, { generatedAt: reference, expectedIdentity: identity });
  assert.equal(row.waterLevelCm, 20);
  assert.equal(row.sources.waterLevel.modelRun, at(-3));
  assert.equal(row.waterLevelBiasCm, undefined);
  assert.equal(row.waterLevelProvenance, undefined);
  assert.equal(mergeContext.mergeForTest(primary, [], {
    generatedAt: reference, expectedIdentity: identity,
  })[0].waterLevelCm, 10, 'a missing new component does not erase a valid retained value');
});

test('atomic current selection derives from the same complete raw pair, never stale parallel fields', () => {
  const select = vm.runInContext('selectAtomicComponentTuple', mergeContext);
  const raw = { currentUMps: 0, currentVMps: 1, currentSpeedMps: -1, currentDirectionDeg: 361 };
  const result = select(raw, null, 'current', { attest: row => row === raw ? { provider: 'dmi' } : null });
  assert.equal(result.values.currentSpeedMps, 1);
  assert.equal(result.values.currentDirectionDeg, 0);
  assert.equal(select(raw, null, 'current', { attest: () => null }), null);
  assert.equal(select({ ...raw, currentVMps: null }, null, 'current'), null);
});

test('temperature without matching component proof is not accepted from a spread row', () => {
  const part = { partId: 'TEST', zoneId: 'TEST-ZONE', waterPoint: [10, 56], onshoreDirectionDeg: 90 };
  const [row] = verifiedIntegratedPartHourly({ hourly: [{ time: reference,
    waterTemperatureC: 15, sources: { waterTemperature: { provider: 'dmi' } },
  }] }, {}, 'PART::TEST', part);
  assert.equal(row.waterTemperatureC, null);
  assert.equal(row.waterTemperatureProvenance.status, 'unverified');
});

test('Open-Meteo joins exact timestamps, including marine-only times', () => {
  const rows = buildOpenMeteoHourlyComponents(
    response({ time: [at(0), at(1)], wind_speed_10m: [5, 6], wind_direction_10m: [90, 100] }),
    response({ time: [at(1), at(3)], wave_height: [1, 2], wave_peak_period: [6, 7], wave_direction: [180, 190] }),
  );
  assert.deepEqual(rows.map(row => row.time), [at(0), at(1), at(3)]);
  assert.equal(rows[0].waveHeightM, null);
  assert.equal(rows[1].waveHeightM, 1);
  assert.equal(rows[2].windSpeedMps, null);
});

test('even exact T+3 reserve levels cannot supply the DMI-only trend', () => {
  const rows = buildOpenMeteoHourlyComponents(null, response({
    time: [at(0), at(2), at(3)], sea_level_height_msl: [0.1, 0.3, 0.4],
  }));
  assert.equal(rows[0].waterLevelTrendCm3h, null);
  assert.equal(rows[1].waterLevelTrendCm3h, null);
  assert.equal(rows[2].waterLevelTrendCm3h, null);
});

test('mean wave period never substitutes for peak wave period', () => {
  const [row] = buildOpenMeteoHourlyComponents(null, response({
    time: [at(0)], wave_height: [1], wave_period: [6], wave_direction: [180],
  }));
  assert.equal(row.wavePeriodS, null);
  assert.equal(verifiedDmiPeakPeriodField({ shortName: 'pp1d', paramId: 231, indicatorOfParameter: null }), true);
  for (const field of [
    { shortName: 'mwp', paramId: 232, indicatorOfParameter: null },
    { shortName: 'mwp', paramId: 231, indicatorOfParameter: null },
    { shortName: 'pp1d', paramId: 232, indicatorOfParameter: null },
    { shortName: 'pp1d', paramId: true, indicatorOfParameter: null },
  ]) assert.equal(verifiedDmiPeakPeriodField(field), false);
});

test('transport or invalid time axis in one response preserves the other', async () => {
  for (const marine of [
    async () => { throw new TypeError('connection reset'); },
    async () => response({ time: [at(0), at(0)] }),
  ]) {
    const errors = [];
    const good = response({ time: [at(0)], wind_speed_10m: [4], wind_direction_10m: [90] });
    const [weatherResult, marineResult] = await fetchIndependentOpenMeteoComponents({
      weather: async () => good, marine, onError: component => errors.push(component),
    });
    assert.equal(weatherResult, good);
    assert.equal(marineResult, null);
    assert.deepEqual(errors, ['marine']);
    assert.equal(buildOpenMeteoHourlyComponents(weatherResult, marineResult)[0].windSpeedMps, 4);
  }
});

test('private H118..H120 survive cache and adapter for all final three public trends', () => {
  const part = { partId: 'TEST', zoneId: 'TEST-ZONE', waterPoint: [10, 56], onshoreDirectionDeg: 90 };
  const ocean = Array.from({ length: 121 }, (_, hour) => {
    const step = at(hour);
    return { step, 'sea-mean-deviation': hour / 100, provenance: { waterLevel: {
      provider: 'dmi', fallback: false, collection: 'dkss_idw', collectionFamily: 'marine',
      component: 'waterLevel', componentKind: 'marine-water-level-scalar',
      fieldSet: ['sea-mean-deviation'], optionalFieldSet: [], modelRun: reference,
      nativeValidTime: step, leadTimeHours: hour, entityId: 'PART::TEST',
      parentZoneId: 'TEST-ZONE', entityType: 'coastal-part', samplingContext: 'coastal-part-water-point',
      samplingPoint: part.waterPoint, gridPoint: part.waterPoint, gridDefinitionSha256: 'a'.repeat(64),
      distanceKm: 0, spatialSelection: 'nearest-valid-grid-cell-no-spatial-interpolation', spatialSemanticsVersion: 1,
      itemId: `level-${hour}`, assetIdentitySha256: 'b'.repeat(64), acquiredAt: reference,
    } } };
  });
  const built = buildDmiForecastHourly({ generatedAt: reference, ocean });
  const record = createDmiForecastRecord({ zoneId: 'PART::TEST', point: part.waterPoint,
    generatedAt: reference, hourly: built.hourly });
  const accepted = verifiedIntegratedPartHourly(record, {}, 'PART::TEST', part);
  assert.equal(DMI_FORECAST_HOURS, 121);
  assert.equal(accepted.length, 121);
  for (const hour of [115, 116, 117]) assert.equal(accepted[hour].waterLevelTrendCm3h, 3);
  assert.equal(accepted[118].waterLevelTrendCm3h, null);
});

test('parent-zone merge uses private DMI support without extending its public horizon', () => {
  const primary = Array.from({ length: 121 }, (_, hour) => parentHour(hour, { level: hour / 100 }));
  const rows = mergeContext.mergeForTest(primary, [], { generatedAt: reference });
  assert.equal(rows.length, 118);
  assert.equal(rows.at(-1).time, at(117));
  for (const hour of [115, 116, 117]) assert.equal(rows[hour].waterLevelTrendCm3h, 3);
  const reserveSupport = primary.slice(118).map(row => ({ ...row,
    sources: { waterLevel: { provider: 'open-meteo' } } }));
  const withoutSupport = mergeContext.mergeForTest(primary.slice(0, 118), reserveSupport,
    { generatedAt: reference });
  for (const hour of [115, 116, 117]) assert.equal(withoutSupport[hour].waterLevelTrendCm3h, null);
  const retainedSupport = mergeContext.mergeForTest(primary.slice(0, 118), primary.slice(118),
    { generatedAt: reference });
  for (const hour of [115, 116, 117]) assert.equal(retainedSupport[hour].waterLevelTrendCm3h, 3);
  const otherRunSupport = [118, 119, 120].map(hour => parentHour(hour,
    { level: hour / 100, modelRun: at(-3) }));
  const otherRun = mergeContext.mergeForTest(primary.slice(0, 118), otherRunSupport,
    { generatedAt: reference });
  for (const hour of [115, 116, 117]) assert.equal(otherRun[hour].waterLevelTrendCm3h, null,
    'private support from another DMI run is not the same forecast series');
});
