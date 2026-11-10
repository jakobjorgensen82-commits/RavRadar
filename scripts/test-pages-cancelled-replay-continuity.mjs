import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { cancelledReplayAnchor, verifyCancelledReplayContinuity } from './pages-cancelled-replay-continuity.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const iso = h => new Date(Date.UTC(2026, 10, 10, h)).toISOString();
const binding = { modelId: 'fixture', stateSchemaVersion: 'fixture', modelContractSha256: sha('contract'),
  modelBundleSha256: sha('model') };
const zoneIds = Array.from({ length: 210 }, (_, i) => 'z' + i);
const sourceDetailsSha256 = sha('details');
const descriptor = bytes => {
  const hash = sha(bytes);
  return { sha256: hash, bytes: bytes.length, path: './forecast/' + hash + '.json' };
};
function forecast(datasetId, start) {
  return { complete: true, zoneCount: 210, coastalPartCount: 673, datasetId, generatedAt: iso(start),
    productionReferenceAt: iso(start), ravScoreModelBinding: binding, publicConditionDetailsSha256: sourceDetailsSha256,
    detailDelivery: { schemaVersion: 1, sourceDetailsSha256, forecastHours: 118,
      hours: Object.fromEntries(Array.from({ length: 118 }, (_, i) => [iso(start + i), descriptor(Buffer.from('hour-' + i))])),
      zones: Object.fromEntries(zoneIds.map(id => [id, descriptor(Buffer.from(id))])) } };
}
function hourDocument(manifest, time, temperature) {
  const parts = {};
  for (let index = 0; index < 673; index += 1) {
    parts['p' + index] = { zoneId: zoneIds[index % 210], waterPoint: [1, 2], landPoint: [3, 4],
      current: { time, weather: { time, waterLevelCm: 0, waterTemperatureC: index === 0 ? temperature : null } } };
  }
  return { datasetId: manifest.datasetId, generatedAt: manifest.generatedAt, productionReferenceAt: manifest.productionReferenceAt,
    delivery: { schemaVersion: 1, kind: 'hour', key: time, sourceDetailsSha256, modelBinding: binding },
    zones: Object.fromEntries(zoneIds.map(id => [id, { forecast: { hourly: [{ time }] } }])),
    coastalParts: { zones: Object.fromEntries(zoneIds.map((id, index) => [id,
      { hourly: [{ time }], expectedPartCount: index < 43 ? 4 : 3 }])), parts } };
}
async function check(t, { lose = false, corrupt = false, pointerMoves = false, wrongRestore = false,
  overBudget = false, noOverlap = false, missingHour = false, manifestMoves = false, activeMoves = false } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-pages-cancelled-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, 'forecast'));
  const target = overBudget ? 95 : noOverlap ? 118 : 117;
  const previous = forecast('published', 0);
  const candidate = forecast('candidate', target);
  const time = iso(target);
  const oldBytes = Buffer.from(JSON.stringify(hourDocument(previous, time, 0)));
  const nextBytes = Buffer.from(JSON.stringify(hourDocument(candidate, time, lose ? null : 0)));
  if (!noOverlap) previous.detailDelivery.hours[time] = descriptor(oldBytes);
  if (overBudget) {
    for (const [key, value] of Object.entries(previous.detailDelivery.hours)) {
      if (Date.parse(key) >= Date.parse(iso(95))) value.bytes = 16 * 1024 * 1024;
    }
  }
  candidate.detailDelivery.hours[time] = descriptor(nextBytes);
  if (missingHour) delete candidate.detailDelivery.hours[time];
  await fs.writeFile(path.join(directory, descriptor(nextBytes).path), nextBytes);
  await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify(candidate));
  const context = { head: 'a'.repeat(40), consumerRunId: 150 };
  const saved = { sourceHead: context.head, datasetId: 'saved', productionReferenceAt: iso(target - 1),
    generatedAt: iso(target - 1), modelBinding: binding, bundleContentSha256: sha('saved-bundle') };
  const pin = sha('current');
  const publicManifestSha256 = sha256CanonicalJson(previous);
  const active = { model: 'integrated', status: 'INTEGRATED_ACTIVE', pending: false, datasetId: previous.datasetId,
    productionReferenceAt: previous.productionReferenceAt, publicManifestSha256 };
  let reads = 0;
  let publicReads = 0;
  let activeReads = 0;
  let fetched = 0;
  const result = verifyCancelledReplayContinuity({ ...context, targetHour: time,
    anchor: cancelledReplayAnchor({ ...context, publicManifestSha256, activeSha256: sha256CanonicalJson(active), pin }),
    restored: wrongRestore ? { ...saved, bundleContentSha256: sha('other') } : saved,
    newLiveDirectory: directory,
    readPin: async () => ({ descriptor: saved, pin: (++reads === 2 && pointerMoves) ? sha('moved') : pin }),
    readPublic: async () => (++publicReads === 2 && manifestMoves) ? { ...previous, datasetId: 'other' } : previous,
    readActive: async () => (++activeReads === 2 && activeMoves) ? { ...active, revision: 2 } : active,
    fetchPublic: async (url, options) => {
      fetched += 1;
      assert.equal(url.href, 'https://ravradar.dk/data/live/forecast/' + sha(oldBytes) + '.json');
      assert.equal(options.redirect, 'error');
      const response = new Response(corrupt ? Buffer.concat([Buffer.from('x'), oldBytes.subarray(1)]) : oldBytes);
      Object.defineProperty(response, 'url', { value: url.href });
      return response;
    },
  });
  return { result, get fetched() { return fetched; } };
}

test('reads only the overlapping published shard and compares every part', async t => {
  const attempt = await check(t);
  const result = await attempt.result;
  assert.equal(result.comparedHours, 1);
  assert.equal(result.comparedPartHours, 673);
  assert.equal(attempt.fetched, 1);
});
test('catches loss even when zero was the previously valid value', async t => {
  const attempt = await check(t, { lose: true });
  await assert.rejects(attempt.result, /PAGES_REPLAY_PUBLISHED_WEATHER_LOSS/);
});
test('refuses corrupt shard bytes and superseded bases', async t => {
  await assert.rejects((await check(t, { corrupt: true })).result, /hash mismatch/);
  await assert.rejects((await check(t, { pointerMoves: true })).result, /PAGES_REPLAY_ANCHOR_MOVED/);
  await assert.rejects((await check(t, { manifestMoves: true })).result, /PAGES_REPLAY_ANCHOR_MOVED/);
  await assert.rejects((await check(t, { activeMoves: true })).result, /PAGES_REPLAY_ANCHOR_MOVED/);
});
test('refuses old restored B, missing candidate hour, or excessive transfer before network read', async t => {
  const wrongRestore = await check(t, { wrongRestore: true });
  await assert.rejects(wrongRestore.result, /PAGES_REPLAY_RESTORED_GENERATION_MOVED/);
  assert.equal(wrongRestore.fetched, 0);
  const missingHour = await check(t, { missingHour: true });
  await assert.rejects(missingHour.result, /Incomplete public delivery inventory/);
  assert.equal(missingHour.fetched, 0);
  const overBudget = await check(t, { overBudget: true });
  await assert.rejects(overBudget.result, /PAGES_REPLAY_PUBLIC_OVERLAP_INVALID/);
  assert.equal(overBudget.fetched, 0);
});
test('allows a fully expired published forecast with zero shared hours', async t => {
  const noOverlap = await check(t, { noOverlap: true });
  assert.equal((await noOverlap.result).comparedHours, 0);
  assert.equal(noOverlap.fetched, 0);
});
