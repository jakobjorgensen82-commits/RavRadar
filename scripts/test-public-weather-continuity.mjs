import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { comparePublicWeatherHours, checkPublicWeatherContinuity,
  checkSavedCurrentPublicWeatherContinuity } from './check-public-weather-continuity.mjs';
import { writeColdPublicHour } from './lib/public-cold-hour-transport.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';
import { buildPrivatePublicHourDeliveryPack } from './lib/public-hour-delivery-pack.mjs';
import { POST_CUTOVER_PREDECESSOR } from './migrate-post-cutover-private-runtime.mjs';
import { FUR_WATER_ROUTING_PART_ID } from './lib/fur-water-routing-diagnostic.mjs';

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
    // Fur is deliberately the ninth loss: diagnosis must not depend on the
    // existing eight-example limit in the public continuity report.
    const parts=Object.fromEntries(Array.from({length:8},(_,i)=>[`A${i}`,part([10+i,56],values)]));
    parts[FUR_WATER_ROUTING_PART_ID]=part([10,56],values);
    const bytes = `${JSON.stringify({ ...hour(datasetId, parts),
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
    coastalPartCount: 9, detailDelivery: { hours: newHours },
  }));
  await fs.writeFile(path.join(newLive, 'conditions.json'), JSON.stringify({
    datasetId:'new-public',productionReferenceAt:new Date(start+3_600_000).toISOString(),
  }));
  const result = await checkPublicWeatherContinuity({ previousConditionsPath: oldConditionsPath,
    previousPackPath: packPath, newLiveDirectory: newLive, temporaryDirectory: root });
  assert.equal(result.comparedHours, 117);
  assert.equal(result.losses.waterLevel, 9);
  assert.deepEqual(result.lossHours, [{
    time: new Date(start + 5 * 3_600_000).toISOString(),
    losses: { wind: 0, wave: 0, current: 0, waterLevel: 9, waterTemperature: 0 },
    examplePartIds: { wind: [], wave: [], current: [], waterLevel: Array.from({length:8},(_,i)=>`A${i}`), waterTemperature: [] },
  }]);
  assert.equal(result.furWaterLevelDiagnosis.lostHours,1);
  assert.equal(result.furWaterLevelDiagnosis.codes.TRACE_NOT_RECORDED,1);
  assert.equal(Object.values(result.furWaterLevelDiagnosis.codes).reduce((a,b)=>a+b,0),1);
  assert.equal(result.furWaterLevelDiagnosis.privatePayloadIncluded,false);
  assert.equal(result.passed, false);
} finally { await fs.rm(root, { recursive: true, force: true }); }
console.log('Public weather continuity: all five valid-old-over-empty fields and changed-point boundary pass.');

const savedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-saved-public-continuity-'));
try {
  const predecessor = path.join(savedRoot, 'predecessor');
  const live = path.join(savedRoot, 'live');
  await fs.mkdir(path.join(predecessor, 'forecast'), { recursive: true });
  await fs.mkdir(path.join(live, 'forecast'), { recursive: true });
  const canonicalHour = (start, offset) => new Date(Date.parse(start) + offset * 3_600_000).toISOString();
  const previousReference = '2026-10-01T00:00:00.000Z';
  const overlap = canonicalHour(previousReference, 117);
  const binding = POST_CUTOVER_PREDECESSOR.modelBinding;
  const zoneIds = Array.from({ length: 210 }, (_, index) => 'z' + index);
  const exactDigest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const descriptor = (name, bytes = 1024) => {
    const sha256 = exactDigest(name);
    return { path: './forecast/' + sha256 + '.json', sha256, bytes };
  };
  const manifest = (datasetId, productionReferenceAt, cold) => {
    const hours = Object.fromEntries(Array.from({ length: 118 }, (_, index) => {
      const key = canonicalHour(productionReferenceAt, index);
      const entry = descriptor(datasetId + ':h:' + key);
      return [key, cold && index >= 12
        ? { ...entry, rawSha256: exactDigest(datasetId + ':raw:' + key), rawBytes: 2048 } : entry];
    }));
    const zones = Object.fromEntries(zoneIds.map(id => [id, descriptor(datasetId + ':z:' + id)]));
    return {
      schemaVersion: 4, complete: true, zoneCount: 210, coastalPartCount: 673, datasetId,
      productionReferenceAt, generatedAt: productionReferenceAt, ravScoreModelBinding: binding,
      publicConditionDetailsSha256: exactDigest(datasetId),
      detailDelivery: { schemaVersion: 1, forecastHours: 118, sourceDetailsSha256: exactDigest(datasetId),
        ...(cold ? { coldHoursSchema: 1, mapHoursLandingSchema: 1, mapHours: {} } : {}), hours, zones },
    };
  };
  const previous = manifest('saved-predecessor', previousReference, true);
  const current = manifest('saved-candidate', overlap, false);
  const document = (m, loseWaterLevel = false) => {
    const counts = new Map(zoneIds.map(id => [id, 0]));
    const parts = Object.fromEntries(Array.from({ length: 673 }, (_, index) => {
      const zoneId = zoneIds[index % zoneIds.length];
      counts.set(zoneId, counts.get(zoneId) + 1);
      return ['p' + index, { zoneId, waterPoint: [10, 56], landPoint: [10.01, 56],
        current: { time: overlap, weather: loseWaterLevel && index === 0
          ? { ...weather, waterLevelCm: null } : weather } }];
    }));
    const zones = Object.fromEntries(zoneIds.map(id => [id, { forecast: { hourly: [{ time: overlap }] } }]));
    const zoneScores = Object.fromEntries(zoneIds.map(id => [id,
      { hourly: [{ time: overlap }], expectedPartCount: counts.get(id) }]));
    return Buffer.from(JSON.stringify({
      datasetId: m.datasetId, productionReferenceAt: m.productionReferenceAt, generatedAt: m.generatedAt,
      delivery: { schemaVersion: 1, kind: 'hour', key: overlap,
        sourceDetailsSha256: m.publicConditionDetailsSha256, modelBinding: binding },
      zones, coastalParts: { parts, zones: zoneScores },
    }));
  };
  const oldRaw = document(previous);
  const cold = await writeColdPublicHour({ liveDirectory: predecessor,
    entry: { kind: 'hour', bytes: oldRaw.length, sha256: exactDigest(oldRaw) }, raw: oldRaw });
  previous.detailDelivery.hours[overlap] = cold;
  const pinnedManifest = path.join(predecessor, 'manifest.json');
  const localManifest = path.join(live, 'manifest.json');
  await fs.writeFile(pinnedManifest, JSON.stringify(previous));
  const oldWire = await fs.readFile(path.join(predecessor, cold.path));
  const stage = async (raw, manifestToStage = current) => {
    const sha256 = exactDigest(raw);
    const entry = { path: './forecast/' + sha256 + '.json', sha256, bytes: raw.length };
    manifestToStage.detailDelivery.hours[overlap] = entry;
    await fs.writeFile(path.join(live, entry.path), raw);
    await fs.writeFile(localManifest, JSON.stringify(manifestToStage));
    return entry;
  };
  let calls = 0;
  const respond = bytes => async (url, options) => {
    calls += 1;
    assert.equal(url.href, 'https://ravradar.dk/data/live/' + cold.path.slice(2));
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal.aborted, false);
    return new Response(bytes);
  };
  const checked = (patch = {}) => checkSavedCurrentPublicWeatherContinuity({
    previousManifestPath: pinnedManifest, expectedPublicManifestSha256: sha256CanonicalJson(previous),
    newLiveDirectory: live, fetchImpl: respond(oldWire), ...patch,
  });
  const healthy = document(current);
  let currentEntry = await stage(healthy);
  const pass = await checked();
  assert.equal(pass.passed, true);
  assert.equal(pass.comparedHours, 1);
  assert.equal(pass.comparedPartHours, 673);
  assert.equal(pass.predecessorHourBytes, oldWire.length);
  assert.equal(pass.currentManifestSha256, sha256CanonicalJson(current));
  assert.equal(calls, 1);
  assert.equal((await checked({ fetchImpl: respond(oldWire) })).previousManifestSha256,
    sha256CanonicalJson(previous));
  const beforeNetworkRefusals = calls;
  await assert.rejects(checked({ expectedPublicManifestSha256: '0'.repeat(64) }), /PREDECESSOR_PIN/);
  const malformed = structuredClone(current);
  malformed.detailDelivery.hours[overlap].path = 'https://other.invalid/hour.json';
  await fs.writeFile(localManifest, JSON.stringify(malformed));
  await assert.rejects(checked(), /DESCRIPTOR/);
  await fs.writeFile(localManifest, JSON.stringify(manifest('too-late', canonicalHour(overlap, 1), false)));
  await assert.rejects(checked(), /OVERLAP/);
  const manyOld = manifest('too-large', previousReference, false);
  for (const entry of Object.values(manyOld.detailDelivery.hours)) entry.bytes = 16 * 1024 * 1024;
  const early = manifest('early', canonicalHour(previousReference, 1), false);
  await fs.writeFile(pinnedManifest, JSON.stringify(manyOld));
  await fs.writeFile(localManifest, JSON.stringify(early));
  await assert.rejects(checked({ expectedPublicManifestSha256: sha256CanonicalJson(manyOld) }), /PHYSICAL_BYTES/);
  assert.equal(calls, beforeNetworkRefusals);
  await fs.writeFile(pinnedManifest, JSON.stringify(previous));

  currentEntry = await stage(healthy);
  const tampered = Buffer.from(oldWire);
  tampered[0] ^= 1;
  await assert.rejects(checked({ fetchImpl: respond(tampered) }), /PREDECESSOR_HOUR/);
  await fs.writeFile(path.join(live, currentEntry.path), Buffer.alloc(healthy.length));
  await assert.rejects(checked(), /CANDIDATE_HOUR/);
  await stage(healthy);
  await assert.rejects(checked({ fetchImpl: async (...args) => {
    const response = await respond(oldWire)(...args);
    await fs.writeFile(localManifest, JSON.stringify({ ...current, generatedAt: canonicalHour(overlap, 1) }));
    return response;
  } }), /CANDIDATE_DRIFT/);
  await stage(document(current, true));
  const loss = await checked();
  assert.equal(loss.passed, false);
  assert.equal(loss.losses.waterLevel, 1);
  assert.equal(loss.changedIdentities, 0);
  assert.doesNotMatch(JSON.stringify(loss), /waterPoint|partId|weatherValues/);
} finally {
  await fs.rm(savedRoot, { recursive: true, force: true });
}
console.log('Saved CURRENT continuity: strict manifest and transport pins, bounded reads and no-loss decisions pass.');
