import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { comparePublicWeatherHours, checkPublicWeatherContinuity } from './check-public-weather-continuity.mjs';
import { buildPrivatePublicHourDeliveryPack } from './lib/public-hour-delivery-pack.mjs';
import { POST_CUTOVER_PREDECESSOR } from './migrate-post-cutover-private-runtime.mjs';

const time = '2026-09-25T10:00:00.000Z';
const weather = Object.freeze({
  windSpeedMps: 4, windDirectionDeg: 0,
  waveHeightM: 0.2, waveDirectionDeg: 90, wavePeriodS: 4,
  currentSpeedMps: 0.1, currentDirectionDeg: 0,
  waterLevelCm: 50, waterTemperatureC: 12,
});
const part = (point, values = weather) => ({
  zoneId: 'Z1', waterPoint: point, landPoint: [point[0] + 0.01, point[1]],
  current: { weather: values },
});
const hour = (datasetId, parts) => ({
  datasetId, delivery: { kind: 'hour', key: time }, coastalParts: { parts },
});
const old = hour('old', { A: part([10, 56]), B: part([11, 56]) });
const newValid = hour('new', { A: part([10, 56], { ...weather, windSpeedMps: 5 }),
  B: part([11, 56], { ...weather, waterLevelCm: 51 }) });
const options = { time, previousDatasetId: 'old', currentDatasetId: 'new', partCount: 2 };
assert.deepEqual(comparePublicWeatherHours(old, newValid, options).losses,
  { wind: 0, wave: 0, current: 0, waterLevel: 0, waterTemperature: 0 });
const calmOld = hour('old', { A: part([10, 56], {
  ...weather, waveHeightM: 0, wavePeriodS: 0, waveDirectionDeg: null,
}), B: part([11, 56]) });
const calmLost = hour('new', { A: part([10, 56], {
  ...weather, waveHeightM: null, wavePeriodS: null, waveDirectionDeg: null,
}), B: part([11, 56]) });
assert.equal(comparePublicWeatherHours(calmOld, calmLost, options).losses.wave, 1,
  'an attested calm wave is still a valid old value');

const stateless = hour('new', { A: part([10, 56], { ...weather, windDirectionDeg: null,
  waveHeightM: null, currentDirectionDeg: null, waterLevelCm: null,
  waterTemperatureC: null }), B: part([11, 56]) });
assert.deepEqual(comparePublicWeatherHours(old, stateless, options).losses,
  { wind: 1, wave: 1, current: 1, waterLevel: 1, waterTemperature: 1 });
assert.deepEqual(comparePublicWeatherHours(old, stateless, options).lossPartIds,
  { wind: ['A'], wave: ['A'], current: ['A'], waterLevel: ['A'], waterTemperature: ['A'] });

const moved = hour('new', { A: part([12, 56], {}), B: part([11, 56]) });
assert.equal(comparePublicWeatherHours(old, moved, options).changedIdentities, 1);
assert.deepEqual(comparePublicWeatherHours(old, moved, options).losses,
  { wind: 0, wave: 0, current: 0, waterLevel: 0, waterTemperature: 0 });
assert.throws(() => comparePublicWeatherHours(old, { ...newValid, datasetId: 'wrong' }, options),
  /HOUR_IDENTITY_INVALID/);
assert.throws(() => comparePublicWeatherHours(old, hour('new', { A: part([10, 56]) }), options),
  /HOUR_IDENTITY_INVALID/);

// The production check must authenticate and materialize the actual private
// predecessor pack, not compare an invented in-memory "old" document.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-five-field-continuity-'));
try {
  const oldLive = path.join(root, 'old');
  const newLive = path.join(root, 'new');
  await fs.mkdir(path.join(oldLive, 'forecast'), { recursive: true });
  await fs.mkdir(path.join(newLive, 'forecast'), { recursive: true });
  const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const binding = structuredClone(POST_CUTOVER_PREDECESSOR.modelBinding);
  const sourceDetailsSha256 = 'a'.repeat(64);
  const start = Date.parse('2026-09-24T10:00:00.000Z');
  const oldHours = {}, newHours = {};
  const writeHour = async (folder, datasetId, instant, values) => {
    const bytes = `${JSON.stringify({ ...hour(datasetId, { A: part([10, 56], values) }),
      delivery: { schemaVersion: 1, kind: 'hour', key: instant,
        sourceDetailsSha256, modelBinding: binding } })}\n`;
    const sha256 = digest(bytes);
    await fs.writeFile(path.join(folder, 'forecast', `${sha256}.json`), bytes);
    return { path: `./forecast/${sha256}.json`, sha256, bytes: Buffer.byteLength(bytes) };
  };
  for (let index = 0; index < 118; index += 1) {
    const instant = new Date(start + index * 3_600_000).toISOString();
    oldHours[instant] = await writeHour(oldLive, 'old-packed', instant, weather);
    const next = new Date(start + (index + 1) * 3_600_000).toISOString();
    newHours[next] = await writeHour(newLive, 'new-public', next,
      index === 4 ? { ...weather, waterLevelCm: null } : weather);
  }
  const reference = new Date(start).toISOString();
  const oldManifest = { datasetId: 'old-packed', productionReferenceAt: reference,
    publicConditionDetailsSha256: sourceDetailsSha256, ravScoreModelBinding: binding,
    detailDelivery: { schemaVersion: 1, sourceDetailsSha256, hours: oldHours } };
  const startup = { schemaVersion: 2, modelBinding: binding,
    dates: ['2026-09-24'], modes: { waders: [], beach: [] } };
  const packPath = path.join(root, 'old.pack');
  const built = await buildPrivatePublicHourDeliveryPack({ liveDirectory: oldLive,
    publicManifest: oldManifest, startupNationalForecast: startup, outputPath: packPath });
  const oldConditionsPath = path.join(root, 'old-conditions.json');
  await fs.writeFile(oldConditionsPath, JSON.stringify({ datasetId: 'old-packed',
    productionReferenceAt: reference, publicHourDelivery: built.marker }));
  await fs.writeFile(path.join(newLive, 'manifest.json'), JSON.stringify({
    datasetId: 'new-public', productionReferenceAt: new Date(start + 3_600_000).toISOString(),
    coastalPartCount: 1, detailDelivery: { hours: newHours },
  }));
  const result = await checkPublicWeatherContinuity({ previousConditionsPath: oldConditionsPath,
    previousPackPath: packPath, newLiveDirectory: newLive, temporaryDirectory: root });
  assert.equal(result.comparedHours, 117);
  assert.equal(result.losses.waterLevel, 1);
  assert.deepEqual(result.lossHours, [{
    time: new Date(start + 5 * 3_600_000).toISOString(),
    losses: { wind: 0, wave: 0, current: 0, waterLevel: 1, waterTemperature: 0 },
    examplePartIds: { wind: [], wave: [], current: [], waterLevel: ['A'], waterTemperature: [] },
  }]);
  assert.equal(result.passed, false);
} finally { await fs.rm(root, { recursive: true, force: true }); }
console.log('Public weather continuity: all five valid-old-over-empty fields and changed-point boundary pass.');
