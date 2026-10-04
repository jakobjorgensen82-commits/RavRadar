import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PRIVATE_CONDITIONS_MAX_BYTES, writeBoundedJsonAtomic } from './lib/bounded-json-writer.mjs';
import {
  assertPrivateConditionsHourly,
  hydratePrivateConditionsHourly,
  packPrivateConditionsHourly,
} from './lib/private-conditions-hourly.mjs';

const HOUR = 3_600_000;
const START = Date.parse('2026-09-27T04:00:00.000Z');

function fullFiveTypeFixture(hours = 118) {
  const zones = {};
  const scoreZones = {};
  for (let number = 0; number < 210; number += 1) {
    const id = `zone-${number}`;
    const forecast = [];
    const score = [];
    for (let hour = 0; hour < hours; hour += 1) {
      const time = new Date(START + hour * HOUR).toISOString();
      forecast.push({
        time, windSpeedMps: 4 + number / 100 + hour / 1000,
        waveHeightM: 0.3 + hour / 1000,
        currentSpeedMps: 0.12 + number / 1000,
        waterLevelCm: 20 + hour / 10,
        waterTemperatureC: 14 + number / 100,
        sources: {
          wind: { provider: 'dmi', modelRun: '2026-09-27T00:00:00.000Z' },
          wave: { provider: 'copernicus', modelRun: '2026-09-27T00:00:00.000Z' },
          current: { provider: 'open-meteo', modelRun: '2026-09-27T00:00:00.000Z' },
          waterLevel: { provider: 'dmi', modelRun: '2026-09-27T00:00:00.000Z' },
          waterTemperature: { provider: 'dmi', modelRun: '2026-09-27T00:00:00.000Z' },
        },
      });
      score.push({ time, waders: { score: (number + hour) % 101 },
        beach: { score: (number + hour + 7) % 101 },
        evidence: { historyHours: hour, missing: false } });
    }
    zones[id] = { forecast: { provider: 'mixed', hourly: forecast },
      samples24h: [{ time: new Date(START - HOUR).toISOString(), waterTemperatureC: 14 }] };
    scoreZones[id] = { expectedPartCount: 3, scoredPartCount: 3, hourly: score };
  }
  return { schemaVersion: 4, datasetId: 'rr-test-210',
    productionReferenceAt: new Date(START).toISOString(), zones,
    coastalParts: { expectedPartCount: 673, zones: scoreZones, parts: {} } };
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('full 210-zone, 118-hour five-weather-type cache is losslessly bounded', async t => {
  const source = fullFiveTypeFixture();
  // Real producers need not place `hourly` last in an object. Property order
  // outside the array is not a weather value or a public contract.
  const firstWeather = source.zones['zone-0'].forecast;
  source.zones['zone-0'].forecast = { hourly: firstWeather.hourly, provider: firstWeather.provider };
  const firstScore = source.coastalParts.zones['zone-0'];
  source.coastalParts.zones['zone-0'] = { hourly: firstScore.hourly,
    expectedPartCount: firstScore.expectedPartCount, scoredPartCount: firstScore.scoredPartCount };
  const rawBytes = Buffer.byteLength(JSON.stringify(source));
  const packed = packPrivateConditionsHourly(source);
  t.diagnostic(`Synthetic five-type size: raw=${rawBytes}, packed=${Buffer.byteLength(JSON.stringify(packed))}, hourlyRaw=${packed.privateZoneHourly.rawBytes}, hourlyGzip=${packed.privateZoneHourly.gzipBytes}`);
  assert.equal(Object.keys(packed.privateZoneHourly.zones).length, 210);
  assert.equal(packed.privateZoneHourly.rawBytes > 0, true);
  assert.equal(packed.privateZoneHourly.gzipBytes < packed.privateZoneHourly.rawBytes, true);
  assert.equal(Object.hasOwn(packed.zones['zone-0'].forecast, 'hourly'), false);
  assert.equal(Object.hasOwn(packed.coastalParts.zones['zone-0'], 'hourly'), false);
  assert.equal(assertPrivateConditionsHourly(packed), true);
  const hydrated = hydratePrivateConditionsHourly(JSON.parse(JSON.stringify(packed)));
  assert.deepEqual(hydrated, source);
  assert.equal(digest(hydrated.zones['zone-0'].forecast.hourly),
    digest(source.zones['zone-0'].forecast.hourly));
  assert.equal(digest(hydrated.coastalParts.zones['zone-0'].hourly),
    digest(source.coastalParts.zones['zone-0'].hourly));
  assert.equal(Buffer.byteLength(JSON.stringify(packed)) < rawBytes / 2, true);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-private-hourly-'));
  const file = path.join(directory, 'conditions.json');
  try {
    const written = await writeBoundedJsonAtomic(file, packed);
    assert.equal(written.bytes < PRIVATE_CONDITIONS_MAX_BYTES, true);
    const restored = hydratePrivateConditionsHourly(JSON.parse(await fs.readFile(file, 'utf8')));
    assert.deepEqual(restored, source);
  } finally {
    await fs.unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.rmdir(directory);
  }
  // Normal runs may inherit a value through any number of cache generations.
  let inherited = packed;
  for (let generation = 0; generation < 10; generation += 1) {
    inherited = packPrivateConditionsHourly(hydratePrivateConditionsHourly(inherited));
  }
  assert.deepEqual(hydratePrivateConditionsHourly(inherited), source);
});

test('legacy authenticated predecessor remains readable without a stateless reset', () => {
  const source = fullFiveTypeFixture(1);
  assert.equal(hydratePrivateConditionsHourly(source), source);
  assert.equal(assertPrivateConditionsHourly(source), false);
});

test('packing keeps independent weather and score-zone insertion orders', () => {
  const source = fullFiveTypeFixture(2);
  source.furWaterRoutingDiagnostic={kind:'PRIVATE_FUR_WATER_ROUTING_DIAGNOSTIC',
    privacyClass:'PRIVATE_PRODUCTION_RUNTIME',trace:{privateMarker:'routing-presence-only'}};
  source.coastalParts.zones = Object.fromEntries(
    Object.entries(source.coastalParts.zones).reverse());
  const weatherOrder = Object.keys(source.zones);
  const scoreOrder = Object.keys(source.coastalParts.zones);
  assert.notDeepEqual(weatherOrder, scoreOrder);
  const packed = packPrivateConditionsHourly(source);
  assert.deepEqual(Object.keys(packed.zones), weatherOrder);
  assert.deepEqual(Object.keys(packed.coastalParts.zones), scoreOrder);
  const restored = hydratePrivateConditionsHourly(JSON.parse(JSON.stringify(packed)));
  assert.deepEqual(Object.keys(restored.zones), weatherOrder);
  assert.deepEqual(Object.keys(restored.coastalParts.zones), scoreOrder);
  assert.deepEqual(restored, source);
});

test('tampering, partial packing and a mixed raw/packed zone fail closed', () => {
  const source = fullFiveTypeFixture(1);
  const packed = packPrivateConditionsHourly(source);
  const badHash = structuredClone(packed);
  badHash.privateZoneHourly.zones['zone-0'].forecast.rawSha256 = '0'.repeat(64);
  assert.throws(() => hydratePrivateConditionsHourly(badHash), /PRIVATE_CONDITIONS_HOURLY_/);
  const missing = structuredClone(packed);
  delete missing.privateZoneHourly.zones['zone-1'];
  assert.throws(() => hydratePrivateConditionsHourly(missing), /PRIVATE_CONDITIONS_HOURLY_/);
  const mixed = structuredClone(packed);
  mixed.zones['zone-1'].forecast.hourly = source.zones['zone-1'].forecast.hourly;
  assert.throws(() => hydratePrivateConditionsHourly(mixed), /PRIVATE_CONDITIONS_HOURLY_/);
  const nullMarker = structuredClone(packed);
  nullMarker.privateZoneHourly = null;
  assert.throws(() => hydratePrivateConditionsHourly(nullMarker), /PRIVATE_CONDITIONS_HOURLY_/);
});
