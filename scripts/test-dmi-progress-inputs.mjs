import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildDmiForecastHourly, createDmiForecastRecord } from './lib/dmi-forecast-store.mjs';
import { mergeVerifiedDmiForecastProgress, mergeVerifiedStationObservationProgress } from './lib/verified-dmi-progress-inputs.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES as FILES } from './lib/private-weather-progress-files.mjs';
import { buildPrivateWeatherComponentPack, unpackPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { weatherComponentProgressCache, WEATHER_PROGRESS_CIPHER_PATH } from './weather-component-progress-cache.mjs';
import { prioritizeDmiFeatures } from './lib/dmi-acquisition-state.mjs';

const reference = '2026-09-26T07:00:00.000Z';
const earlier = '2026-09-26T01:00:00.000Z';
const features = [{ type: 'Feature', properties: { id: 'ZONE', dataPoint: [10, 56] },
  geometry: { type: 'Polygon', coordinates: [[[9, 55], [10, 55], [10, 56], [9, 55]]] } }];
const kinds = { wind: 'atmospheric-wind-vector', wave: 'wave-mobilisation-tuple',
  current: 'ocean-current-vector', waterLevel: 'marine-water-level-scalar', waterTemperature: 'marine-water-temperature-scalar' };
const fields = { wind: ['wind-u-10m', 'wind-v-10m'], wave: ['significant-wave-height', 'dominant-wave-period'],
  current: ['current-u', 'current-v'], waterLevel: ['sea-mean-deviation'], waterTemperature: ['water-temperature'] };
function native(component, modelRun, validTime = reference) {
  return { provider: 'dmi', fallback: false, component, componentKind: kinds[component], fieldSet: fields[component],
    collection: component === 'wind' ? 'harmonie_dini_sf' : component === 'wave' ? 'wam_dw' : 'dkss_idw',
    collectionFamily: component === 'wind' ? 'wind' : component === 'wave' ? 'wave' : 'marine',
    optionalFieldSet: component === 'wave' ? ['mean-wave-dir'] : [],
    ...(component === 'wave' ? { wavePeriodSemantics: 'peak', wavePeriodField: { shortName: 'pp1d', paramId: 231, indicatorOfParameter: null } } : {}),
    modelRun, nativeValidTime: validTime, leadTimeHours: (Date.parse(validTime) - Date.parse(modelRun)) / 3600000,
    entityId: 'ZONE', parentZoneId: 'ZONE', entityType: 'parent-zone', samplingContext: 'parent-zone-water-point',
    samplingPoint: [10, 56], gridPoint: [10, 56], gridDefinitionSha256: 'a'.repeat(64), distanceKm: 0,
    spatialSelection: component === 'wave' ? 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation'
      : ['waterLevel', 'waterTemperature'].includes(component) ? 'nearest-valid-grid-cell-no-spatial-interpolation'
        : 'nearest-shared-grid-cell-no-spatial-interpolation', spatialSemanticsVersion: 1,
    itemId: `synthetic-${component}-${modelRun}`, assetIdentitySha256: 'b'.repeat(64), acquiredAt: reference,
    ...(component === 'wind' ? { vectorSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', vectorSemanticsVersion: 2,
      vectorReference: 'earth-relative-east-north', vectorTransform: 'identity-earth-relative' } : {}),
    ...(component === 'current' ? { verticalLayer: 'depthbelowsea:7', verticalLayerRankM: 7,
      vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer', vectorSemanticsVersion: 3 } : {}),
  };
}
function store(modelRun = earlier, multiplier = 1, { startAt = reference, hours = 1 } = {}) {
  const rows = Array.from({ length: hours }, (_, index) => {
    const step = new Date(Date.parse(startAt) + index * 3600000).toISOString();
    return { step, provenance: Object.fromEntries(Object.keys(fields).map(component => [component, native(component, modelRun, step)])) };
  });
  const built = buildDmiForecastHourly({ generatedAt: reference, startAt, hours,
    wind: rows.map(row => ({ ...row, 'wind-speed-10m': 4 * multiplier, 'wind-dir-10m': 90 })),
    waves: rows.map(row => ({ ...row, 'significant-wave-height': multiplier, 'dominant-wave-period': 6, 'mean-wave-dir': 90 })),
    ocean: rows.map(row => ({ ...row, 'sea-mean-deviation': .1 * multiplier, 'water-temperature': 12 + multiplier,
      'current-u': .1 * multiplier, 'current-v': .2 * multiplier })),
  });
  return { schemaVersion: 2, generatedAt: modelRun,
    runtime: { nextZoneCursor: 0, lastAttemptAt: modelRun, rateLimits: { forecastEdr: { rateLimitedUntil: null } } },
    zones: { ZONE: createDmiForecastRecord({ zoneId: 'ZONE', point: [10, 56], generatedAt: modelRun, hourly: built.hourly }) } };
}
function stations({ observed = earlier, value = 3 } = {}) {
  return { schemaVersion: 3, generatedAt: reference, stations: [{ sourceKey: 'oceanobs:1', stationId: '1',
    sourceType: 'observation-station', point: [10, 56], name: 'Protected station',
    lastObservationAt: observed, lastObservationValueCm: value,
    forecastCacheValidUntil: '2026-09-27T07:00:00.000Z', firstObservationAt: earlier,
    routingEligible: true }], notifications: [] };
}
const options = { features, productionReferenceAt: reference, restoredAt: '2026-09-26T10:30:00.000Z' };

test('DMI progress merges all five proved tuples, preserves valid old fields at new holes', () => {
  const before = store();
  const newer = store(reference, 2);
  const result = mergeVerifiedDmiForecastProgress(before, newer, options);
  assert.equal(result.stats.recoveredComponents, 5);
  assert.equal(result.stats.runtimeRecovered, true);
  assert.equal(result.document.zones.ZONE.hourly[0].waterTemperatureC, 14);
  assert.equal(before.zones.ZONE.hourly[0].waterTemperatureC, 13);
  const missing = structuredClone(newer);
  delete missing.zones.ZONE.hourly[0].waterTemperatureC;
  missing.zones.ZONE.hourly[0].waterLevelCm = null;
  missing.zones.ZONE.hourly[0].currentVMps = null;
  const joined = mergeVerifiedDmiForecastProgress(before, missing, options).document.zones.ZONE.hourly[0];
  assert.equal(joined.waterTemperatureC, 13);
  assert.equal(joined.waterLevelCm, 10);
  assert.equal(joined.currentVMps, before.zones.ZONE.hourly[0].currentVMps);
  assert.deepEqual(joined.sources.waterLevel, before.zones.ZONE.hourly[0].sources.waterLevel);
  assert.equal(joined.windSpeedMps, 8);
});

test('paired protected DMI source donor updates all five fields without restoring its scheduler cursor', () => {
  const working = store(earlier, 1);
  const donor = store(reference, 2);
  working.runtime.nextZoneCursor = 0;
  working.runtime.lastAttemptAt = '2026-09-26T09:00:00.000Z';
  donor.runtime.lastAttemptAt = '2026-09-26T09:30:00.000Z';
  const result = mergeVerifiedDmiForecastProgress(working, donor, {
    ...options, recoverRuntimeCursor: false,
  });
  assert.equal(result.stats.recoveredComponents, 5);
  assert.equal(result.stats.runtimeRecovered, false);
  assert.equal(result.document.runtime.lastAttemptAt, working.runtime.lastAttemptAt);
  assert.equal(result.document.zones.ZONE.hourly[0].waterTemperatureC, 14);
  assert.equal(result.document.zones.ZONE.hourly[0].currentVMps, .4);
});

test('wrong point, stale source, missing proof and changed active geometry cannot overwrite protected values/cursor', () => {
  const before = store(reference, 2);
  const old = store(earlier, 1);
  assert.strictEqual(mergeVerifiedDmiForecastProgress(before, old, options).document, before);
  const wrong = store(reference, 3);
  wrong.zones.ZONE.point = [11, 56];
  assert.strictEqual(mergeVerifiedDmiForecastProgress(before, wrong, options).document, before);
  const unproved = store(reference, 3);
  unproved.runtime = before.runtime;
  unproved.zones.ZONE.hourly[0].sources = {};
  const rejected = mergeVerifiedDmiForecastProgress(before, unproved, options);
  assert.strictEqual(rejected.document, before);
  assert.equal(rejected.code, 'DMI_FORECAST_RECORDS_REJECTED');
  const absent = { ...store(), zones: {} };
  const partial = mergeVerifiedDmiForecastProgress(absent, store(reference), options);
  assert.equal(partial.stats.runtimeRecovered, false, 'Newly added records cannot retroactively prove the old cursor domain');
  const changed = [...features, { ...features[0], properties: { id: 'ANOTHER', dataPoint: [11, 56] } }];
  assert.equal(mergeVerifiedDmiForecastProgress(store(), store(reference), { ...options, features: changed }).stats.runtimeRecovered, false);
});

test('rolling121forecast keeps all still-current old tuples and the complete new tail, not expired EDR hours', () => {
  const before = store(earlier, 1, { startAt: earlier, hours: 121 });
  const newer = store(reference, 2, { hours: 121 });
  const oldByTime = new Map(before.zones.ZONE.hourly.map(row => [row.time, row]));
  for (const row of newer.zones.ZONE.hourly) if (oldByTime.has(row.time)) {
    row.waterTemperatureC = null;
    row.waterLevelCm = null;
    row.currentVMps = null;
  }
  const joined = mergeVerifiedDmiForecastProgress(before, newer, options).document.zones.ZONE;
  assert.equal(joined.hourly.length, 121);
  assert.equal(joined.validFrom, reference);
  assert.equal(joined.validUntil, '2026-10-01T07:00:00.000Z');
  for (const row of joined.hourly) {
    const old = oldByTime.get(row.time);
    assert.equal(row.windSpeedMps, 8);
    assert.equal(row.waveHeightM, 2);
    assert.equal(row.waterTemperatureC, old ? 13 : 14);
    assert.equal(row.waterLevelCm, old ? 10 : 20);
    assert.equal(row.currentVMps, old ? .2 : .4);
    if (old) assert.deepEqual(row.sources.waterTemperature, old.sources.waterTemperature);
  }
  assert.equal(before.zones.ZONE.hourly.length, 121, 'No mutation of the protected input');
});

test('ten successive sparse forecast generations retain every still-valid DMI component', () => {
  const future = new Date(Date.parse(reference) + 20 * 3600000).toISOString();
  let protectedStore = store(earlier, 1, { startAt: future });
  const sparse = store(reference, 2, { startAt: future });
  for (const row of sparse.zones.ZONE.hourly) {
    for (const key of ['windSpeedMps', 'waveHeightM', 'currentUMps', 'currentVMps',
      'waterLevelCm', 'waterTemperatureC']) row[key] = null;
    row.sources = {};
  }
  const original = structuredClone(protectedStore.zones.ZONE.hourly[0]);
  for (let run = 0; run < 10; run += 1) {
    const target = new Date(Date.parse(reference) + run * 3600000).toISOString();
    protectedStore = mergeVerifiedDmiForecastProgress(protectedStore, sparse,
      { ...options, productionReferenceAt: target, recoverRuntimeCursor: false }).document;
    const retained = protectedStore.zones.ZONE.hourly[0];
    for (const component of Object.keys(fields)) {
      assert.deepEqual(retained.sources[component], original.sources[component],
        `${component} lost its original source on sparse generation ${run + 1}`);
    }
    assert.equal(retained.waterTemperatureC, original.waterTemperatureC);
    assert.equal(retained.waterLevelCm, original.waterLevelCm);
    assert.equal(retained.currentVMps, original.currentVMps);
    assert.equal(retained.waveHeightM, original.waveHeightM);
    assert.equal(retained.windSpeedMps, original.windSpeedMps);
  }
});

test('late acquisition timestamps use the restore clock, not the locked target; real future timestamps fail closed', () => {
  const before = store();
  const donor = store(reference, 2);
  donor.zones.ZONE.generatedAt = '2026-09-26T10:00:00.000Z';
  donor.runtime.lastAttemptAt = donor.zones.ZONE.generatedAt;
  donor.runtime.lastSuccessAt = donor.zones.ZONE.generatedAt;
  const result = mergeVerifiedDmiForecastProgress(before, donor, options);
  assert.equal(result.stats.recoveredComponents, 5);
  assert.equal(result.stats.runtimeRecovered, true);
  donor.zones.ZONE.generatedAt = '2026-09-26T11:00:00.000Z';
  donor.runtime.lastAttemptAt = donor.zones.ZONE.generatedAt;
  assert.strictEqual(mergeVerifiedDmiForecastProgress(before, donor, options).document, before);
  const futureObservation = stations({ observed: '2026-09-26T08:00:00.000Z', value: 10 });
  assert.strictEqual(mergeVerifiedStationObservationProgress(stations(), futureObservation, options).stats.status,
    'RETAINED', 'A real later observation still cannot be used at the earlier locked target');
});

test('cursor domain follows producer canonical id order, so feature/key reordering is safe but changed points are not', () => {
  const before = store();
  const donor = store(reference);
  const another = { ...features[0], properties: { id: 'ANOTHER', dataPoint: [11, 56] } };
  before.zones.ANOTHER = { ...structuredClone(before.zones.ZONE), zoneId: 'ANOTHER', point: [11, 56], hourly: [] };
  donor.zones = { ANOTHER: { ...structuredClone(before.zones.ANOTHER) }, ZONE: donor.zones.ZONE };
  donor.runtime.nextZoneCursor = 1;
  const normal = [...features, another];
  const reversed = [...normal].reverse();
  const order = rows => prioritizeDmiFeatures(rows, before, reference, () => ({ available: false, remainingHours: 0 }), 1)
    .stable.map(feature => feature.properties.id);
  assert.deepEqual(order(normal), order(reversed));
  const result = mergeVerifiedDmiForecastProgress(before, donor, { ...options, features: reversed });
  assert.equal(result.stats.runtimeRecovered, true);
  assert.equal(result.document.runtime.nextZoneCursor, 1);
  donor.zones.ANOTHER.point = [12, 56];
  assert.equal(mergeVerifiedDmiForecastProgress(before, donor, { ...options, features: normal }).stats.runtimeRecovered, false);
});

test('station recovery preserves protected registry, rejects wrong/unknown/old observations and bounds expiry', () => {
  const before = stations();
  const newer = stations({ observed: reference, value: 7 });
  newer.stations[0].name = 'Do not restore this label';
  newer.stations[0].routingEligible = false;
  newer.stations.push({ ...newer.stations[0], stationId: '2', sourceKey: 'oceanobs:2' });
  const result = mergeVerifiedStationObservationProgress(before, newer, options);
  assert.equal(result.stats.recoveredObservations, 1);
  assert.equal(result.stats.rejectedRecords, 1);
  assert.equal(result.document.stations.length, 1);
  assert.equal(result.document.stations[0].name, before.stations[0].name);
  assert.equal(result.document.stations[0].routingEligible, true);
  assert.equal(result.document.stations[0].lastObservationValueCm, 7);
  assert.equal(result.document.stations[0].forecastCacheValidUntil, '2026-09-26T13:00:00.000Z');
  for (const patch of [{ point: [11, 56] }, { lastObservationValueCm: null }, { lastObservationAt: earlier },
    { lastObservationAt: '2026-09-27T07:00:00.000Z' }, { sourceType: 'forecast-point' }, { stationId: 1 }]) {
    const bad = stations({ observed: reference, value: 9 });
    Object.assign(bad.stations[0], patch);
    assert.strictEqual(mergeVerifiedStationObservationProgress(before, bad, options).document, before);
  }
});

async function write(root, relative, value) {
  const destination = path.join(root, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, typeof value === 'string' ? value : JSON.stringify(value));
}
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-dmi-progress-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('rr-dmi-progress-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

test('progress-only files do not change ordinary packs; old progress manifests remain exactly readable', async t => {
  const root = await fixture(t);
  const source = path.join(root, 'source');
  await write(source, '.cache/weather-component-fallback-cursor.json', { cursor: 0 });
  const old = path.join(root, 'old');
  await fs.mkdir(old);
  await buildPrivateWeatherComponentPack({ repositoryRoot: source, outputRoot: old, conditions: {}, includeOperationalProgress: true });
  const oldFiles = await unpackPrivateWeatherComponentPack({ restoredRoot: old, outputRoot: path.join(root, 'old-read'),
    conditions: {}, includeOperationalProgress: true });
  assert.equal(oldFiles.length, 1);
  await write(source, FILES.dmiForecastStore, store());
  await write(source, FILES.dmiWaterStations, stations());
  const regular = path.join(root, 'regular');
  await fs.mkdir(regular);
  await buildPrivateWeatherComponentPack({ repositoryRoot: source, outputRoot: regular, conditions: {} });
  const normalFiles = await unpackPrivateWeatherComponentPack({ restoredRoot: regular, outputRoot: path.join(root, 'normal-read'), conditions: {} });
  assert.equal(normalFiles.length, 1);
  const progress = path.join(root, 'progress');
  await fs.mkdir(progress);
  await buildPrivateWeatherComponentPack({ repositoryRoot: source, outputRoot: progress, conditions: {}, includeOperationalProgress: true });
  const newFiles = await unpackPrivateWeatherComponentPack({ restoredRoot: progress, outputRoot: path.join(root, 'progress-read'),
    conditions: {}, includeOperationalProgress: true });
  assert.equal(newFiles.length, 3);
  await assert.rejects(unpackPrivateWeatherComponentPack({ restoredRoot: progress,
    outputRoot: path.join(root, 'rejected-as-production'), conditions: {} }), /WEATHER_PACK_ENTRY_INVALID/);
});

async function encryptedFixture(t) {
  const folder = await fixture(t);
  const source = path.join(folder, 'source');
  const target = path.join(folder, 'target');
  const baseline = '{"protected":"unchanged"}\n';
  const history = '{"protectedHistory":"unchanged","samples72h":[{"at":"2026-09-26T06:00:00Z"}]}\n';
  const basePaths = new Map([[source, path.join(folder, 'source-base.json')], [target, path.join(folder, 'target-base.json')]]);
  const common = { repository: 'synthetic/fixture', encryptionKey: Buffer.alloc(32, 7).toString('base64'),
    protectedBundleSha256: 'a'.repeat(64), productionReferenceAt: reference };
  const call = (mode, root, extra = {}) => weatherComponentProgressCache({ ...common, mode, repositoryRoot: root,
    basePath: basePaths.get(root), ...extra });
  for (const root of [source, target]) {
    await write(root, 'data/live/conditions.json', baseline);
    await write(root, 'data/live/current-pilot-history.json', history);
    await write(root, 'data/zones.geojson', { type: 'FeatureCollection', features });
    await write(root, FILES.dmiForecastStore, store());
    await write(root, FILES.dmiWaterStations, stations());
    assert.equal((await call('capture-base', root)).captured, true);
  }
  await write(source, FILES.dmiForecastStore, store(reference, 2));
  await write(source, FILES.dmiWaterStations, stations({ observed: reference, value: 7 }));
  assert.equal((await call('save', source)).saved, true);
  await fs.mkdir(path.join(target, '.cache'));
  await fs.copyFile(path.join(source, WEATHER_PROGRESS_CIPHER_PATH), path.join(target, WEATHER_PROGRESS_CIPHER_PATH));
  return { source, target, call, baseline, history };
}

test('real encrypted progress restores both DMI inputs atomically without rewriting protected conditions', async t => {
  const f = await encryptedFixture(t);
  const restored = await f.call('restore', f.target);
  assert.equal(restored.restored, true, JSON.stringify(restored));
  const read = async relative => JSON.parse(await fs.readFile(path.join(f.target, relative), 'utf8'));
  assert.equal((await read(FILES.dmiForecastStore)).zones.ZONE.hourly[0].waterTemperatureC, 14);
  assert.equal((await read(FILES.dmiWaterStations)).stations[0].lastObservationValueCm, 7);
  assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), f.baseline);
  assert.equal(await fs.readFile(path.join(f.target, 'data/live/current-pilot-history.json'), 'utf8'), f.history);
});

test('failure while installing the second DMI file rolls the first back to its exact protected bytes', async t => {
  const f = await encryptedFixture(t);
  const previous = new Map(await Promise.all(Object.values(FILES).map(async relative =>
    [relative, await fs.readFile(path.join(f.target, relative), 'utf8')])));
  let attempts = 0;
  const result = await f.call('restore', f.target, { renameImpl: async (...args) => {
    attempts += 1;
    if (attempts === 2) throw new Error('synthetic install fault');
    return fs.rename(...args);
  } });
  assert.equal(result.code, 'INSTALL_REJECTED');
  for (const [relative, bytes] of previous) assert.equal(await fs.readFile(path.join(f.target, relative), 'utf8'), bytes);
});
