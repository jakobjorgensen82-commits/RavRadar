import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { weatherComponentProgressCache, withAuthenticatedWeatherProgress,
  WEATHER_PROGRESS_CIPHER_PATH, WEATHER_PROGRESS_MAX_CIPHER_BYTES } from './weather-component-progress-cache.mjs';
import { buildPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES as files } from './lib/private-weather-component-inventory.mjs';
import { mergeVerifiedProtectedProgressComponents,
  protectedProgressUnionFailureCode } from './lib/verified-protected-progress-components.mjs';
import { pairedSourceDiagnostic,
  reconcileProtectedWeatherSources } from './reconcile-protected-weather-sources.mjs';
import { mergeOpenMeteoPartBank, buildOpenMeteoPartRequest, readOpenMeteoPartResponse,
  openMeteoMfNearestGridPoint, OPEN_METEO_NATIVE_NEAREST_POLICIES } from './lib/open-meteo-part-bank.mjs';
import { openMeteoO1280NearestGridPoint } from './lib/open-meteo-o1280-grid.mjs';
import { dmiWaterSourceFixture } from './test-helpers/dmi-water-source-fixture.mjs';
import { buildWaterSourceForecastIndex, packWaterSourceForecastContinuity,
  unpackWaterSourceForecastContinuity } from './lib/water-source-forecast-routing.mjs';
import { readDmiForecastFile, inspectDmiForecastFile, writeDmiForecastFileAtomic,
  DMI_FORECAST_FILE_MAX_BYTES } from './lib/dmi-forecast-file.mjs';
import { constants as bufferConstants } from 'node:buffer';
import { assertUsableDmiProgressRecovery } from './lib/verified-dmi-progress-inputs.mjs';

const execFileAsync = promisify(execFile);
const repository = 'owner/fixture';
const encryptionKey = Buffer.alloc(32, 73).toString('base64');
const protectedBundleSha256 = 'a'.repeat(64);
const reference = '2026-09-19T00:00:00.000Z';

// Reuse the real progress fixture and ordinary save/restore CLIs. Artificial
// large zone records test byte volume, not national native forecast coverage.
// The measured national SOURCE cardinality contains qualified synthetic originals.
test('large forecast and national SOURCE bank cross the normal encrypted CLI boundary together', {
  skip: process.env.RAVRADAR_TEST_LARGE_FORECAST !== '1', timeout: 600_000,
}, async t => {
  const f = await fixture(t);
  const referenceAt = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
  const sources = Array.from({ length: 373 }, (_, i) => ({ sourceKey: `tidewater:LARGE${i}`,
    stationId: `LARGE${i}`, sourceType: 'forecast-point', point: [10 + i / 10000, 56] }));
  const native = { generatedAt: referenceAt, timeStrideHours: 3, zones: {} };
  for (const source of sources) native.zones[`SOURCE::${source.sourceKey}`] = {
    hourly: Object.fromEntries(Array.from({ length: 41 }, (_, i) => {
      const time = new Date(Date.parse(referenceAt) + i * 3 * 3_600_000).toISOString();
      const row = dmiWaterSourceFixture(source, time, i, referenceAt);
      row.sources.waterLevel.assetIdentitySha256 = crypto.createHash('sha256')
        .update(source.sourceKey + time).digest('hex');
      return [time, row];
    })),
  };
  const originals = buildWaterSourceForecastIndex(sources, native, referenceAt);
  const sourcePack = await packWaterSourceForecastContinuity(originals, referenceAt);
  assert.equal(sourcePack.sourceCount, 373);
  assert.ok(Buffer.byteLength(JSON.stringify(sourcePack)) > 1024 * 1024);
  const protectedForecast = { schemaVersion: 2, generatedAt: referenceAt,
    runtime: { nextZoneCursor: 0 }, zones: {} };
  const paddedForecast = { ...protectedForecast, zones: {}, waterSourceContinuity: sourcePack };
  const padding = 'x'.repeat(3 * 1024 * 1024);
  for (let i = 0; i < 180; i++) {
    const id = `ZONE${i}`;
    protectedForecast.zones[id] = { zoneId: id, point: [10, 56], hourly: [] };
    paddedForecast.zones[id] = { ...protectedForecast.zones[id], padding };
  }
  const geometry = { type: 'FeatureCollection', features: Object.keys(protectedForecast.zones).map(id =>
    ({ type: 'Feature', properties: { id, dataPoint: [10, 56] } })) };
  for (const root of [f.source, f.target]) {
    await write(root, 'data/zones.geojson', geometry);
    await writeDmiForecastFileAtomic(path.join(root, 'data/live/dmi-forecast-cache.json'), protectedForecast);
  }
  const sourceFile = path.join(f.source, 'data/live/dmi-forecast-cache.json');
  await writeDmiForecastFileAtomic(sourceFile, paddedForecast);
  const sourceIndex = await inspectDmiForecastFile(sourceFile);
  assert.ok(sourceIndex.bytes > bufferConstants.MAX_STRING_LENGTH);
  assert.ok(sourceIndex.bytes > 256 * 1024 * 1024 && sourceIndex.bytes <= DMI_FORECAST_FILE_MAX_BYTES);
  assert.equal(sourceIndex.zones.size, 180);
  const digest = async file => {
    const hash = crypto.createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest('hex');
  };
  const sourceHash = await digest(sourceFile);
  const protectedBase = await fs.readFile(f.targetBase);
  const sourceBase = await fs.readFile(f.sourceBase);
  const geometryBefore = await fs.readFile(path.join(f.target, 'data/zones.geojson'));
  const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
    ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT'].includes(name.toUpperCase())));
  Object.assign(environment, { GITHUB_REPOSITORY: repository, WEATHER_PROGRESS_ENCRYPTION_KEY: encryptionKey,
    RAVRADAR_PRODUCTION_TARGET_HOUR: referenceAt });
  const cli = path.resolve('scripts/weather-component-progress-cache.mjs');
  const saveReport = path.join(f.folder, 'large-cli-save-report.json');
  const saveStarted = performance.now();
  const savedProcess = await execFileAsync(process.execPath,
    [cli, 'save', '--root', f.source, '--base', f.sourceBase, '--report', saveReport],
    { cwd: process.cwd(), env: environment, windowsHide: true, timeout: 240_000, killSignal: 'SIGKILL' });
  const saveElapsedMs = performance.now() - saveStarted;
  assert.equal(savedProcess.stderr, '');
  const saved = JSON.parse(await fs.readFile(saveReport, 'utf8'));
  assert.equal(saved.saved, true, JSON.stringify(saved));
  assert.equal(saved.status, 'SAVED');
  assert.equal(saved.code, 'ENCRYPTED_PROGRESS_SAVED');
  assert.equal(saved.privatePayloadIncluded, false);
  const cipherFile = path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH);
  assert.equal(saved.encryptedBytes, (await fs.stat(cipherFile)).size);
  assert.ok(saved.encryptedBytes <= WEATHER_PROGRESS_MAX_CIPHER_BYTES);
  assert.ok(saveElapsedMs < 240_000, 'This measured local seal finishes inside the existing four-minute step.');
  await fs.mkdir(path.dirname(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH)), { recursive: true });
  const transferStarted = performance.now();
  await fs.copyFile(cipherFile, path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  const localTransferElapsedMs = performance.now() - transferStarted;
  const restoreReport = path.join(f.folder, 'large-cli-restore-report.json');
  const restoreStarted = performance.now();
  const restoredProcess = await execFileAsync(process.execPath,
    [cli, 'restore', '--root', f.target, '--base', f.targetBase, '--report', restoreReport],
    { cwd: process.cwd(), env: environment, windowsHide: true, timeout: 240_000, killSignal: 'SIGKILL' });
  const restoreElapsedMs = performance.now() - restoreStarted;
  assert.equal(restoredProcess.stderr, '');
  const restored = JSON.parse(await fs.readFile(restoreReport, 'utf8'));
  assert.equal(restored.restored, true, JSON.stringify(restored));
  assert.equal(restored.saved, false);
  assert.equal(restored.productionAuthority, false);
  assert.equal(restored.privatePayloadIncluded, false);
  assert.equal(restored.dmiProgress.forecast.status, 'MERGED');
  assert.equal(restored.dmiProgress.forecast.recoveredComponents, 373 * 121);
  assert.equal(restored.dmiProgress.forecast.rejectedRecords, 180,
    'The 180 deliberately empty padding records are not provider originals; none acquires forecast authority.');
  assert.equal(assertUsableDmiProgressRecovery(restored.dmiProgress), true);
  const recovered = await readDmiForecastFile(path.join(f.target, 'data/live/dmi-forecast-cache.json'));
  assert.deepEqual(recovered.zones, protectedForecast.zones, 'Unqualified padding cannot replace protected originals.');
  const qualified = await unpackWaterSourceForecastContinuity(recovered.waterSourceContinuity, referenceAt);
  assert.equal(qualified.size, 373);
  for (const [key, original] of originals) assert.deepEqual(qualified.get(key).hourly, original.hourly);
  assert.equal(await digest(sourceFile), sourceHash, 'Read-only packaging never changes the original forecast.');
  assert.deepEqual(await fs.readFile(f.sourceBase), sourceBase);
  assert.deepEqual(await fs.readFile(f.targetBase), protectedBase);
  assert.deepEqual(await fs.readFile(path.join(f.target, 'data/zones.geojson')), geometryBefore);
  assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
  t.diagnostic(JSON.stringify({ kind: 'LARGE_FORECAST_SOURCE_PROGRESS_CLI_CAPACITY',
    forecastBytes: sourceIndex.bytes, encryptedBytes: saved.encryptedBytes,
    sourceCount: qualified.size, qualifiedSourceHours: 373 * 121,
    sourceRawBytes: sourcePack.rawBytes, sourceCompressedBytes: sourcePack.compressedBytes,
    saveElapsedMs, localTransferElapsedMs, restoreElapsedMs,
    parentMaxRssKiB: process.resourceUsage().maxRSS,
    note: 'Own synthetic bytes and real CLI exits; parent RSS excludes CLI children. No remote upload, runner-loss or national full-job proof.' }));
});

test('encrypted forecast progress recovers SOURCE-only holes through normal restore', async t => {
  for (const invalid of [false, true]) await t.test(invalid ? 'invalid inner source seal' : 'qualified four-hour progress', async child => {
    const f = await fixture(child);
    const source = { sourceKey: 'tidewater:PROGRESS', stationId: 'PROGRESS',
      sourceType: 'forecast-point', name: 'Synthetic original source', point: [11, 56] };
    const native = { generatedAt: reference, timeStrideHours: 3, zones: {
      [`SOURCE::${source.sourceKey}`]: { hourly: Object.fromEntries(Array.from({ length: 41 }, (_, i) => {
        const time = new Date(Date.parse(reference) + i * 3 * 3600000).toISOString();
        return [time, dmiWaterSourceFixture(source, time, i, reference)];
      })) },
    } };
    const original = buildWaterSourceForecastIndex([source], native, reference);
    assert.equal(original.get(source.sourceKey).hourly.length, 121);
    const sparse = structuredClone(original);
    const absentTimes = [94, 95, 109, 110].map(i => original.get(source.sourceKey).hourly[i].time);
    sparse.get(source.sourceKey).hourly = sparse.get(source.sourceKey).hourly.filter(row => !absentTimes.includes(row.time));
    const protectedForecast = { schemaVersion: 2, generatedAt: reference,
      runtime: { nextZoneCursor: 0 }, zones: { Z: { zoneId: 'Z', point: [10, 56], hourly: [] } },
      waterSourceContinuity: await packWaterSourceForecastContinuity(sparse, reference) };
    const incoming = { ...structuredClone(protectedForecast),
      waterSourceContinuity: await packWaterSourceForecastContinuity(original, reference) };
    if (invalid) incoming.waterSourceContinuity.entries[0].rawSha256 = '0'.repeat(64);
    for (const root of [f.source, f.target]) {
      await write(root, 'data/zones.geojson', { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { id: 'Z', dataPoint: [10, 56] } },
      ] });
      await write(root, 'data/live/dmi-forecast-cache.json', protectedForecast);
    }
    const forecastBefore = await fs.readFile(path.join(f.target, 'data/live/dmi-forecast-cache.json'));
    const baseBefore = await fs.readFile(f.targetBase);
    await write(f.source, 'data/live/dmi-forecast-cache.json', incoming);
    const saved = await f.call('save');
    assert.equal(saved.saved, true, JSON.stringify(saved));
    const ciphertext = await fs.readFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH));
    assert.equal(ciphertext.includes(Buffer.from(source.sourceKey)), false);
    await fs.mkdir(path.dirname(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH)), { recursive: true });
    await fs.copyFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH), path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
    const restored = await f.call('restore', f.target, { productionReferenceAt: reference });
    assert.equal(restored.restored, true, JSON.stringify(restored));
    assert.deepEqual(await fs.readFile(f.targetBase), baseBefore, 'Original protection baseline is never rewritten.');
    assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
    if (invalid) {
      assert.equal(restored.dmiProgress.forecast.status, 'REJECTED');
      assert.throws(() => assertUsableDmiProgressRecovery(restored.dmiProgress), /DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED/,
        'Actual normal workflow admission rejects a cache report with invalid SOURCE recovery.');
      assert.deepEqual(await fs.readFile(path.join(f.target, 'data/live/dmi-forecast-cache.json')), forecastBefore);
    } else {
      assert.equal(restored.dmiProgress.forecast.status, 'MERGED');
      assert.equal(restored.dmiProgress.forecast.recoveredComponents, 4);
      assert.equal(assertUsableDmiProgressRecovery(restored.dmiProgress), true);
      const actual = await readDmiForecastFile(path.join(f.target, 'data/live/dmi-forecast-cache.json'));
      assert.deepEqual(actual.zones, protectedForecast.zones);
      const qualified = await unpackWaterSourceForecastContinuity(actual.waterSourceContinuity, reference);
      assert.deepEqual(qualified.get(source.sourceKey).hourly, original.get(source.sourceKey).hourly);
      for (const row of sparse.get(source.sourceKey).hourly) assert.deepEqual(
        qualified.get(source.sourceKey).hourly.find(r => r.time === row.time), row,
        'Already qualified protected SOURCE hours retain their exact original proof.');
    }
  });
});
test('paired source diagnostics expose only fixed phases and classified codes', () => {
  assert.equal(pairedSourceDiagnostic(new Error('private response at C:\\secret')),
    'PAIRED_SOURCE_UNCLASSIFIED');
  assert.equal(pairedSourceDiagnostic(Object.assign(
    new Error('PAIRED_SOURCE_MERGE_WEATHER_BANKS_REJECTED'),
    { safeDetail: 'PROTECTED_PROGRESS_CP_MERGE_REJECTED' })),
  'PAIRED_SOURCE_MERGE_WEATHER_BANKS_REJECTED PROTECTED_PROGRESS_CP_MERGE_REJECTED');
  assert.equal(pairedSourceDiagnostic(Object.assign(
    new Error('PAIRED_SOURCE_MERGE_WEATHER_BANKS_REJECTED'),
    { safeDetail: 'private response at C:\\secret' })),
  'PAIRED_SOURCE_MERGE_WEATHER_BANKS_REJECTED');
});
const part = { partId: 'TEST', zoneId: 'ZONE', waterPoint: [10, 56] };
const spatialPolicies = Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature']
  .map(component => [component, { policyId: 'synthetic-exact-cell-only', maximumDistanceKm: 0 }]));
function bank(speed, acquiredAt = reference) {
  const responseText = JSON.stringify({ longitude: 10, latitude: 56, utc_offset_seconds: 0,
    hourly: { time: [reference], wind_speed_10m: [speed], wind_direction_10m: [90] },
    hourly_units: { wind_speed_10m: 'm/s', wind_direction_10m: '°' } });
  const admission = readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, {
    component: 'wind', productionReferenceAt: reference }), responseText, acquiredAt }, { part, spatialPolicies });
  return mergeOpenMeteoPartBank(null, [admission], { parts: [part], spatialPolicies,
    retentionStartAt: reference, retentionEndAt: reference });
}
const originalBank = bank(4);
const progressedBank = bank(9);
const baseline = '{"kind":"synthetic protected conditions","state":"never change through progress"}\n';
function nativeTemperatureBank(validTime, value, acquiredAt = reference) {
  const grid = openMeteoMfNearestGridPoint(part.waterPoint);
  const responseText = JSON.stringify({ longitude: grid[0], latitude: grid[1], utc_offset_seconds: 0,
    hourly: { time: Array.isArray(validTime) ? validTime : [validTime],
      sea_surface_temperature: Array.isArray(value) ? value : [value] },
    hourly_units: { sea_surface_temperature: '°C' } });
  const admission = readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, {
    component: 'waterTemperature', productionReferenceAt: reference,
    spatialPolicy: OPEN_METEO_NATIVE_NEAREST_POLICIES.waterTemperature,
  }), responseText, acquiredAt }, { part, spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES });
  return mergeOpenMeteoPartBank(null, [admission], { parts: [part], spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES,
    retentionStartAt: reference, retentionEndAt: new Date(Date.parse(reference) + 2 * 3600000).toISOString() });
}
async function write(root, relative, value) {
  const destination = path.join(root, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value));
}
async function fixture(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-progress-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('rr-progress-test-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const source = path.join(folder, 'source');
  const target = path.join(folder, 'target');
  await fs.mkdir(source);
  await fs.mkdir(target);
  const sourceBase = path.join(folder, 'source-base.json');
  const targetBase = path.join(folder, 'target-base.json');
  for (const root of [source, target]) {
    await write(root, 'data/live/conditions.json', baseline);
    await write(root, files.openMeteoBank, originalBank);
    await write(root, files.fallbackCursor, { previous: true });
    await write(root, files.selectedComponents, { previousSelected: true });
  }
  for (const [root, basePath] of [[source, sourceBase], [target, targetBase]]) {
    assert.equal((await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: root, basePath, repository,
      protectedBundleSha256 })).captured, true);
  }
  const call = (mode, root = source, extra = {}) => weatherComponentProgressCache({
    mode, repositoryRoot: root, basePath: root === source ? sourceBase : targetBase,
    repository, encryptionKey, protectedBundleSha256, ...extra,
  });
  async function saveAndTransfer() {
    await write(source, files.openMeteoBank, progressedBank);
    await write(source, files.fallbackCursor, { progressed: true });
    await write(source, files.selectedComponents, { progressedSelected: true });
    const saved = await call('save');
    assert.equal(saved.saved, true, JSON.stringify(saved));
    await fs.copyFile(path.join(source, WEATHER_PROGRESS_CIPHER_PATH), path.join(target, WEATHER_PROGRESS_CIPHER_PATH));
  }
  async function assertTargetOriginal() {
    assert.equal(await fs.readFile(path.join(target, 'data/live/conditions.json'), 'utf8'), baseline);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.openMeteoBank), 'utf8')), originalBank);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.fallbackCursor), 'utf8')), { previous: true });
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.selectedComponents), 'utf8')), { previousSelected: true });
  }
  return { folder, source, target, sourceBase, targetBase, call, saveAndTransfer, assertTargetOriginal };
}

test('encrypted roundtrip changes component files only and never caches plaintext or rewrites the production pack', async t => {
  const f = await fixture(t);
  await write(f.source, '.cache/weather-component-inputs.pack', 'protected-marker-pack-must-not-change');
  await write(f.source, '.cache/secret-token.json', 'secret-must-not-be-cached');
  await f.saveAndTransfer();
  assert.equal(await fs.readFile(path.join(f.source, '.cache/weather-component-inputs.pack'), 'utf8'), 'protected-marker-pack-must-not-change');
  const encrypted = await fs.readFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH));
  for (const text of ['wind_speed_10m', 'responseText', 'secret-must-not-be-cached', 'progressedSelected']) {
    assert.equal(encrypted.includes(Buffer.from(text)), false);
  }
  const restored = await f.call('restore', f.target);
  assert.equal(restored.restored, true, JSON.stringify(restored));
  assert.equal(restored.fileCount, 3);
  assert.equal(restored.productionAuthority, false);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')), progressedBank);
  assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
  await assert.rejects(fs.access(path.join(f.target, '.cache/secret-token.json')));
  await assert.rejects(fs.access(path.join(f.target, '.cache/weather-component-inputs.pack')));
});

test('authenticated audit callback exposes verified temporary inputs and exact sizes without installation', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  const cipher = await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  const options = { repositoryRoot: f.target, basePath: f.targetBase, repository, encryptionKey };
  let temporaryDirectory;
  let inspectedFiles;
  const result = await withAuthenticatedWeatherProgress(options, async input => {
    ({ temporaryDirectory } = input);
    inspectedFiles = input.files;
    assert.equal(input.protectedBundleContentSha256, protectedBundleSha256);
    assert.equal(input.baselineSha256, crypto.createHash('sha256').update(baseline).digest('hex'));
    assert.equal(input.capacity.encryptedBytes, cipher.length);
    assert.equal(input.capacity.compressedBytes,
      (await fs.stat(path.join(temporaryDirectory, 'authenticated-pack.gz'))).size);
    assert.equal(input.capacity.rawPackBytes,
      (await fs.stat(path.join(temporaryDirectory, '.cache/weather-component-inputs.pack'))).size);
    assert.equal(input.capacity.fileCount, 3);
    assert.ok(Object.values(input.capacity).every(value => Number.isSafeInteger(value) && value > 0));
    for (const file of input.files) {
      assert.equal(file.sourcePath, path.join(input.verifiedRoot, file.relativePath));
      const bytes = await fs.readFile(file.sourcePath);
      assert.equal(bytes.length, file.bytes);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
    }
    await f.assertTargetOriginal();
    return { inspected: true, ...input.capacity };
  });
  assert.equal(result.inspected, true);
  await assert.rejects(fs.access(temporaryDirectory), { code: 'ENOENT' });
  for (const file of inspectedFiles) await assert.rejects(fs.access(file.sourcePath), { code: 'ENOENT' });
  await f.assertTargetOriginal();
  assert.deepEqual(await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH)), cipher);
  let failedTemporary;
  await assert.rejects(withAuthenticatedWeatherProgress(options, async input => {
    failedTemporary = input.temporaryDirectory;
    throw new Error('SYNTHETIC_AUDIT_FAILURE');
  }), /SYNTHETIC_AUDIT_FAILURE/);
  await assert.rejects(fs.access(failedTemporary), { code: 'ENOENT' });
  await f.assertTargetOriginal();
});

test('audit cannot inspect unauthenticated, mismatched or over-budget progress and cleans rejected plaintext', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  // Incompressible scheduling-only bytes make the compressed bound test real.
  await write(f.source, files.fallbackCursor, { schedulingOnly: crypto.randomBytes(8192).toString('hex') });
  assert.equal((await f.call('save')).saved, true);
  await fs.copyFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH), path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  const cipherPath = path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH);
  const cipher = await fs.readFile(cipherPath);
  assert.ok(cipher.length > 4096);
  const options = { repositoryRoot: f.target, basePath: f.targetBase, repository, encryptionKey };
  const priorTemporary = new Set((await fs.readdir(os.tmpdir())).filter(name => name.startsWith('rr-encrypted-progress-')));
  let calls = 0;
  const inspect = async () => { calls += 1; };
  const rejects = async (extra, code) => {
    await assert.rejects(withAuthenticatedWeatherProgress({ ...options, ...extra }, inspect),
      error => error.progressCode === code);
    assert.equal(calls, 0);
    await f.assertTargetOriginal();
  };
  const corrupt = Buffer.from(cipher);
  corrupt[corrupt.length - 1] ^= 1;
  await fs.writeFile(cipherPath, corrupt);
  await rejects({}, 'SNAPSHOT_AUTHENTICATION_FAILED');
  await fs.writeFile(cipherPath, cipher);
  await rejects({ encryptionKey: Buffer.alloc(32, 74).toString('base64') }, 'SNAPSHOT_AUTHENTICATION_FAILED');
  await rejects({ maximumEncryptedBytes: 4096 }, 'FILE_INVALID');
  await rejects({ maximumPackBytes: 1024 }, 'SIZE_LIMIT');
  await rejects({ maximumEncryptedBytes: WEATHER_PROGRESS_MAX_CIPHER_BYTES + 1 }, 'SIZE_BUDGET_INVALID');
  await rejects({ maximumPackBytes: 768 * 1024 * 1024 + 1 }, 'SIZE_BUDGET_INVALID');
  const originalBase = await fs.readFile(f.targetBase, 'utf8');
  const changedBundle = JSON.parse(originalBase);
  changedBundle.protectedBundleContentSha256 = 'b'.repeat(64);
  await fs.writeFile(f.targetBase, JSON.stringify(changedBundle));
  await rejects({}, 'BASELINE_MISMATCH');
  await fs.writeFile(f.targetBase, originalBase);
  await write(f.target, 'data/live/conditions.json', `${baseline} `);
  await assert.rejects(withAuthenticatedWeatherProgress(options, inspect), error => error.progressCode === 'BASELINE_MISMATCH');
  assert.equal(calls, 0);
  await write(f.target, 'data/live/conditions.json', baseline);
  let changedDuringInspection;
  await assert.rejects(withAuthenticatedWeatherProgress(options, async input => {
    changedDuringInspection = input.temporaryDirectory;
    await write(f.target, 'data/live/conditions.json', `${baseline} `);
  }), error => error.progressCode === 'BASELINE_MISMATCH');
  await assert.rejects(fs.access(changedDuringInspection), { code: 'ENOENT' });
  await write(f.target, 'data/live/conditions.json', baseline);
  await f.assertTargetOriginal();
  const remainingTemporary = (await fs.readdir(os.tmpdir())).filter(name => name.startsWith('rr-encrypted-progress-'));
  assert.deepEqual(remainingTemporary.filter(name => !priorTemporary.has(name)), []);
  assert.deepEqual(await fs.readFile(cipherPath), cipher);
});

test('authenticated progress and protected production retain selected hours of overlapping responses', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-progress-union-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('rr-progress-union-test-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const source = path.join(folder, 'source');
  const target = path.join(folder, 'target');
  await fs.mkdir(source);
  await fs.mkdir(target);
  const nextHour = new Date(Date.parse(reference) + 3600000).toISOString();
  const lastHour = new Date(Date.parse(reference) + 2 * 3600000).toISOString();
  const wider = nativeTemperatureBank([reference, nextHour], [14, 17]);
  const previousBank = mergeOpenMeteoPartBank(nativeTemperatureBank(nextHour, 15),
    Object.values(wider.responses).map(evidence => ({ evidence })), {
      parts: [part], spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES,
      retentionStartAt: reference, retentionEndAt: lastHour,
    });
  const progressBank = nativeTemperatureBank(lastHour, 16);
  const selection = '{"synthetic":"selection"}\n';
  const conditions = { weatherComponentInputs: {
    schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
    openMeteoBankSha256: previousBank.bankSha256, copernicusBankSha256: null,
    selectedComponentsSha256: crypto.createHash('sha256').update(selection).digest('hex'),
  } };
  for (const root of [source, target]) {
    await write(root, 'data/live/conditions.json', conditions);
    await write(root, 'data/live/coastal-parts-v2.json', { partCount: 1, zones: { ZONE: [part] } });
    await write(root, files.openMeteoBank, previousBank);
    await write(root, files.selectedComponents, selection);
  }
  await buildPrivateWeatherComponentPack({ repositoryRoot: target, conditions });
  const protectedPack = await fs.readFile(path.join(target, '.cache/weather-component-inputs.pack'));
  const sourceBase = path.join(folder, 'source-base.json');
  const targetBase = path.join(folder, 'target-base.json');
  for (const [root, basePath] of [[source, sourceBase], [target, targetBase]]) {
    const captured = await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: root,
      basePath, repository, protectedBundleSha256 });
    assert.equal(captured.captured, true, JSON.stringify(captured));
  }
  await write(source, files.openMeteoBank, progressBank);
  const saved = await weatherComponentProgressCache({ mode: 'save', repositoryRoot: source,
    basePath: sourceBase, repository, encryptionKey });
  assert.equal(saved.saved, true, JSON.stringify(saved));
  await fs.copyFile(path.join(source, WEATHER_PROGRESS_CIPHER_PATH), path.join(target, WEATHER_PROGRESS_CIPHER_PATH));
  const restored = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: target,
    basePath: targetBase, repository, encryptionKey, productionReferenceAt: reference.replace('.000Z', 'Z') });
  assert.equal(restored.restored, true, JSON.stringify(restored));
  assert.equal(restored.protectedOpenMeteoRecordsRecovered, 2);
  const finalBank = JSON.parse(await fs.readFile(path.join(target, files.openMeteoBank), 'utf8'));
  assert.deepEqual(finalBank.records.map(row => row.validTime), [reference, nextHour, lastHour]);
  assert.deepEqual(finalBank.records.map(row => row.values.waterTemperatureC), [14, 15, 16]);
  // Exercise the real CLI/environment boundary used by the workflow, including
  // its seconds-only UTC target, then prove the millisecond spelling is equal.
  const cliReport = path.join(folder, 'cli-restore-report.json');
  const cli = await execFileAsync(process.execPath, ['scripts/weather-component-progress-cache.mjs', 'restore',
    '--root', target, '--base', targetBase, '--report', cliReport], { windowsHide: true,
    env: { ...process.env, GITHUB_REPOSITORY: repository, WEATHER_PROGRESS_ENCRYPTION_KEY: encryptionKey,
      RAVRADAR_PRODUCTION_TARGET_HOUR: reference.replace('.000Z', 'Z') } });
  assert.equal(JSON.parse(cli.stdout).restored, true);
  assert.equal(JSON.parse(await fs.readFile(cliReport, 'utf8')).restored, true);
  const canonical = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: target,
    basePath: targetBase, repository, encryptionKey, productionReferenceAt: reference });
  assert.equal(canonical.restored, true, JSON.stringify(canonical));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.openMeteoBank), 'utf8')), finalBank);
  for (const invalid of ['2026-09-19T00:01:00Z', '2026-09-19T00:00:01Z',
    '2026-09-19T00:00:00.001Z', '2026-09-19T00:00:00+00:00',
    '2026-02-30T00:00:00Z', '2026-09-19T24:00:00Z', null]) {
    const rejectedTime = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: target,
      basePath: targetBase, repository, encryptionKey, productionReferenceAt: invalid });
    assert.equal(rejectedTime.status, 'RESTORE_REPAIR_REQUIRED');
    assert.equal(rejectedTime.unionFailureCode, 'PROTECTED_PROGRESS_TARGET_HOUR_INVALID');
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.openMeteoBank), 'utf8')), finalBank);
  }
  assert.deepEqual(await fs.readFile(path.join(target, '.cache/weather-component-inputs.pack')), protectedPack);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, 'data/live/conditions.json'), 'utf8')), conditions);
  await fs.appendFile(path.join(target, '.cache/weather-component-inputs.pack'), 'corrupt');
  const rejected = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: target,
    basePath: targetBase, repository, encryptionKey, productionReferenceAt: reference });
  assert.equal(rejected.status, 'RESTORE_REPAIR_REQUIRED');
  assert.equal(rejected.unionFailureCode, 'PROTECTED_PROGRESS_BASE_UNPACK_FAILED');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.openMeteoBank), 'utf8')), finalBank);
});

test('progress union diagnostics never expose private exception details', () => {
  assert.equal(protectedProgressUnionFailureCode(new Error('PROTECTED_PROGRESS_CP_MERGE_TIMEOUT')),
    'PROTECTED_PROGRESS_CP_MERGE_TIMEOUT');
  for (const error of [new Error('private response, path or credential'),
    new Error('PROTECTED_PROGRESS_BASE_INVALID secret=private'), null]) {
    assert.equal(protectedProgressUnionFailureCode(error), 'PROTECTED_PROGRESS_UNCLASSIFIED');
  }
});

test('paired newer protected generation wins an exact verified Open-Meteo collision', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-paired-order-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('rr-paired-order-test-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const working = path.join(folder, 'working');
  const donor = path.join(folder, 'donor');
  const stage = path.join(folder, 'stage');
  await fs.mkdir(working);
  await fs.mkdir(donor);
  await fs.mkdir(stage);
  await write(working, 'data/live/coastal-parts-v2.json', { partCount: 1, zones: { ZONE: [part] } });
  await write(working, files.openMeteoBank, nativeTemperatureBank(reference, 14));
  await write(donor, files.openMeteoBank, nativeTemperatureBank(reference, 17,
    new Date(Date.parse(reference) + 300000).toISOString()));
  const inputs = { root: working, progressFiles: [{ relativePath: files.openMeteoBank,
    sourcePath: path.join(working, files.openMeteoBank) }], progressVerifiedRoot: working,
    temporaryDirectory: stage, productionReferenceAt: reference,
    completeFiles: [{ relativePath: files.openMeteoBank, sourcePath: path.join(donor, files.openMeteoBank) }],
    completeIsNewer: true };
  const merged = await mergeVerifiedProtectedProgressComponents(inputs);
  const result = JSON.parse(await fs.readFile(merged.files[0].sourcePath, 'utf8'));
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].values.waterTemperatureC, 17);
  assert.equal(merged.openMeteoAdded, 0, 'a same-slot update is not a newly filled hole');
});

test('progress recovery counts newly usable slots separately from unusable tuple retirement', async t => {
  const f = await fixture(t);
  await write(f.source, 'data/live/coastal-parts-v2.json', { partCount: 1, zones: { ZONE: [part] } });
  const nextHour = new Date(Date.parse(reference) + 3600000).toISOString();
  const options = { parts: [part], spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES,
    retentionStartAt: reference, retentionEndAt: nextHour };
  const wave = period => {
    const grid = openMeteoO1280NearestGridPoint(part.waterPoint);
    return readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, {
      component: 'wave', productionReferenceAt: reference,
      spatialPolicy: OPEN_METEO_NATIVE_NEAREST_POLICIES.wave,
    }), responseText: JSON.stringify({ longitude: grid[0], latitude: grid[1], utc_offset_seconds: 0,
      hourly: { time: [reference], wave_height: [1], wave_peak_period: [period], wave_direction: [180] },
      hourly_units: { wave_height: 'm', wave_peak_period: 's', wave_direction: '°' },
    }), acquiredAt: reference }, { part, spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES });
  };
  // The locked parser still authenticates the original 0.04 s response, whose
  // stored canonical period rounds to zero and is therefore not usable weather.
  const previous = mergeOpenMeteoPartBank(nativeTemperatureBank(reference, 14), [wave(0.04)], options);
  assert.equal(previous.records.length, 2);
  await write(f.source, files.openMeteoBank, previous);
  const sourceText = await fs.readFile(path.join(f.source, files.openMeteoBank), 'utf8');
  const cases = [
    { name: 'retirement-only', complete: mergeOpenMeteoPartBank(null, [], options), added: 0, records: 1 },
    { name: 'repair-unusable-slot', complete: mergeOpenMeteoPartBank(null, [wave(6)], options), added: 1, records: 2 },
    { name: 'retire-and-add-other-hour', complete: nativeTemperatureBank(nextHour, 15), added: 1, records: 2 },
  ];
  for (const item of cases) {
    const stage = path.join(f.folder, item.name);
    await fs.mkdir(stage);
    await write(f.target, files.openMeteoBank, item.complete);
    const merged = await mergeVerifiedProtectedProgressComponents({ root: f.source,
      progressFiles: [{ relativePath: files.openMeteoBank, sourcePath: path.join(f.source, files.openMeteoBank) }],
      progressVerifiedRoot: f.source, temporaryDirectory: stage, productionReferenceAt: reference,
      completeFiles: [{ relativePath: files.openMeteoBank, sourcePath: path.join(f.target, files.openMeteoBank) }],
    });
    assert.equal(merged.openMeteoAdded, item.added, item.name);
    const result = JSON.parse(await fs.readFile(merged.files[0].sourcePath, 'utf8'));
    assert.equal(result.records.length, item.records, item.name);
    const oldTemperature = previous.records.find(row => row.component === 'waterTemperature');
    assert.deepEqual(result.records.find(row => row.recordId === oldTemperature.recordId), oldTemperature);
    assert.equal(await fs.readFile(path.join(f.source, files.openMeteoBank), 'utf8'), sourceText);
  }
});

test('the paired 11Z/15Z source restore admits the newer original without copying public values', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-paired-source-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('rr-paired-source-test-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const working = path.join(folder, 'working');
  const donor = path.join(folder, 'donor');
  await fs.mkdir(working);
  await fs.mkdir(donor);
  const newer = nativeTemperatureBank(reference, 17,
    new Date(Date.parse(reference) + 300000).toISOString());
  const selection = '{"synthetic":"selected"}\n';
  const donorConditions = {
    productionReferenceAt: reference,
    generatedAt: new Date(Date.parse(reference) + 17 * 60000).toISOString(),
    weatherComponentInputs: {
      schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
      openMeteoBankSha256: newer.bankSha256, copernicusBankSha256: null,
      selectedComponentsSha256: crypto.createHash('sha256').update(selection).digest('hex'),
    } };
  await write(working, 'data/live/conditions.json', {
    productionReferenceAt: new Date(Date.parse(reference) - 3600000).toISOString(),
    generatedAt: new Date(Date.parse(reference) - 43 * 60000).toISOString(),
  });
  await write(working, 'data/live/coastal-parts-v2.json', { partCount: 1, zones: { ZONE: [part] } });
  await write(working, files.openMeteoBank, nativeTemperatureBank(reference, 14));
  await write(donor, 'data/live/conditions.json', donorConditions);
  await write(donor, files.openMeteoBank, newer);
  await write(donor, files.selectedComponents, selection);
  await buildPrivateWeatherComponentPack({ repositoryRoot: donor, conditions: donorConditions });
  const forecastPath = 'data/live/dmi-forecast-cache.json';
  const protectedForecast = { schemaVersion: 2, zones: {
    ZONE: { zoneId: 'ZONE', point: [10, 56], hourly: [] },
  } };
  await write(working, forecastPath, protectedForecast);
  await write(donor, forecastPath, '{malformed authenticated donor');
  const protectedBank = await fs.readFile(path.join(working, files.openMeteoBank));
  const protectedConditions = await fs.readFile(path.join(working, 'data/live/conditions.json'));
  await assert.rejects(reconcileProtectedWeatherSources({ root: working, donorRoot: donor,
    productionReferenceAt: new Date(Date.parse(reference) + 3600000).toISOString() }),
  /PAIRED_SOURCE_MERGE_DMI_REJECTED/);
  assert.deepEqual(await fs.readFile(path.join(working, files.openMeteoBank)), protectedBank,
    'a rejected DMI donor must stop installation of the already staged provider bank');
  assert.deepEqual(await fs.readFile(path.join(working, 'data/live/conditions.json')), protectedConditions);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(working, forecastPath), 'utf8')), protectedForecast);
  await fs.unlink(path.join(donor, forecastPath));
  await fs.unlink(path.join(working, forecastPath));
  const report = await reconcileProtectedWeatherSources({ root: working, donorRoot: donor,
    productionReferenceAt: new Date(Date.parse(reference) + 3600000).toISOString() });
  assert.equal(report.dmiForecast.status, 'NOT_PRESENT', 'legacy optional DMI absence remains compatible');
  assert.equal(report.publicValuesCopied, false);
  assert.equal(report.runtimeCursorCopied, false);
  assert.equal(JSON.parse(await fs.readFile(path.join(working, files.openMeteoBank), 'utf8'))
    .records[0].values.waterTemperatureC, 17);
  const workingConditions = JSON.parse(await fs.readFile(path.join(working, 'data/live/conditions.json'), 'utf8'));
  await write(working, 'data/live/conditions.json', { ...workingConditions,
    productionReferenceAt: new Date(Date.parse(reference) + 2 * 3600000).toISOString(),
  });
  await assert.rejects(reconcileProtectedWeatherSources({ root: working, donorRoot: donor,
    productionReferenceAt: new Date(Date.parse(reference) + 3 * 3600000).toISOString() }),
  /PAIRED_SOURCE_GENERATION_ORDER_INVALID/);
  await write(working, 'data/live/conditions.json', workingConditions);
  await assert.rejects(reconcileProtectedWeatherSources({ root: working, donorRoot: donor,
    productionReferenceAt: new Date(Date.parse(reference) - 3600000).toISOString() }));
  assert.equal(JSON.parse(await fs.readFile(path.join(working, files.openMeteoBank), 'utf8'))
    .records[0].values.waterTemperatureC, 17);
  // The later private generation can contain a verified provider bank that
  // the earlier baseline never had. It must be re-admitted, not rejected.
  await fs.unlink(path.join(working, files.openMeteoBank));
  await reconcileProtectedWeatherSources({ root: working, donorRoot: donor,
    productionReferenceAt: new Date(Date.parse(reference) + 3600000).toISOString() });
  assert.equal(JSON.parse(await fs.readFile(path.join(working, files.openMeteoBank), 'utf8'))
    .records[0].values.waterTemperatureC, 17);
  await fs.appendFile(path.join(donor, '.cache/weather-component-inputs.pack'), 'tampered');
  await assert.rejects(reconcileProtectedWeatherSources({ root: working, donorRoot: donor,
    productionReferenceAt: new Date(Date.parse(reference) + 3600000).toISOString() }));
  assert.equal(JSON.parse(await fs.readFile(path.join(working, files.openMeteoBank), 'utf8'))
    .records[0].values.waterTemperatureC, 17);
});

test('legacy DMI, current, donor and staging progress share the authenticated private snapshot', async t => {
  const f = await fixture(t);
  const privateProgress = {
    [files.dmiActive]: { kind: 'DMI_ACTIVE', value: 1 },
    [files.dmiCandidate]: { kind: 'DMI_CANDIDATE', value: 2 },
    [files.currentFieldShadow]: { kind: 'CURRENT_FIELD', value: 3 },
    [files.copernicusCurrentShadow]: { kind: 'CP_CURRENT', value: 4 },
    [files.copernicusCurrentSourceStage]: { kind: 'CP_STAGE', value: 5 },
    [files.copernicusCurrentDonorBank]: { kind: 'CP_DONOR', value: 6 },
    [files.copernicusCurrentSegmentJournal]: { kind: 'CP_JOURNAL', value: 7 },
    [files.openMeteoCurrentFallback]: { kind: 'OM_CURRENT', value: 8 },
    [files.openMeteoCurrentDonorBank]: { kind: 'OM_DONOR', value: 9 },
    [files.coastalPointDmi]: { kind: 'POINT_DMI', value: 10 },
    [files.coastalPointState]: { kind: 'POINT_STATE', value: 11 },
    [files.coastalPointStatus]: { kind: 'POINT_STATUS', value: 12 },
    [files.coastalPointActivationState]: { kind: 'POINT_ACTIVATION', value: 13 },
    [files.coastalPointPendingPromotion]: { kind: 'POINT_PROMOTION', value: 14 },
  };
  for (const [relative, value] of Object.entries(privateProgress)) {
    await write(f.source, relative, value);
    await write(f.target, relative, { old: true });
  }
  await f.saveAndTransfer();
  const encrypted = await fs.readFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH));
  assert.equal(encrypted.includes(Buffer.from('DMI_CANDIDATE')), false);
  const restored = await f.call('restore', f.target);
  assert.equal(restored.restored, true, JSON.stringify(restored));
  for (const [relative, value] of Object.entries(privateProgress)) {
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, relative), 'utf8')), value);
  }
});

test('tag corruption, wrong key and wrong repository never install unauthenticated files', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  let installs = 0;
  const renameImpl = async (...args) => { installs += 1; return fs.rename(...args); };
  for (const extra of [
    { encryptionKey: Buffer.alloc(32, 74).toString('base64') },
    { repository: 'other/repository' },
  ]) {
    const result = await f.call('restore', f.target, { ...extra, renameImpl });
    assert.equal(result.status, 'CACHE_MISS');
    assert.equal(installs, 0);
    await f.assertTargetOriginal();
  }
  const ciphertext = await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  ciphertext[ciphertext.length - 1] ^= 1;
  await fs.writeFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH), ciphertext);
  const failed = await f.call('restore', f.target, { renameImpl });
  assert.equal(failed.code, 'SNAPSHOT_AUTHENTICATION_FAILED');
  assert.equal(installs, 0);
  await f.assertTargetOriginal();
});

test('baseline binding rejects replay on a different protected generation or changed local conditions', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  await write(f.target, 'data/live/conditions.json', `${baseline} `);
  const differentBasePath = path.join(f.folder, 'new-base.json');
  assert.equal((await f.call('capture-base', f.target, { basePath: differentBasePath })).captured, true);
  const replay = await f.call('restore', f.target, { basePath: differentBasePath });
  assert.equal(replay.code, 'BASELINE_MISMATCH');
  const changed = await f.call('restore', f.target);
  assert.equal(changed.code, 'BASELINE_MISMATCH');
  await write(f.target, 'data/live/conditions.json', baseline);
  await f.assertTargetOriginal();
});

test('save remains bound to the pre-acquisition baseline even after local scoring changed conditions', async t => {
  const f = await fixture(t);
  await write(f.source, 'data/live/conditions.json', { kind: 'not-yet-published candidate conditions' });
  await f.saveAndTransfer();
  assert.equal((await f.call('restore', f.target)).restored, true);
  assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
});

test('identical conditions on a different protected bundle never admit replay of older unused component inputs', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  const otherBase = path.join(f.folder, 'same-conditions-other-bundle.json');
  assert.equal((await f.call('capture-base', f.target, { basePath: otherBase,
    protectedBundleSha256: 'b'.repeat(64) })).captured, true);
  const replay = await f.call('restore', f.target, { basePath: otherBase });
  assert.equal(replay.code, 'BASELINE_MISMATCH');
  await f.assertTargetOriginal();
  const absent = await f.call('capture-base', f.target, { basePath: path.join(f.folder, 'missing-bundle-id.json'),
    protectedBundleSha256: undefined });
  assert.equal(absent.code, 'PROTECTED_BUNDLE_IDENTITY_REQUIRED');
  assert.equal(absent.captured, false);
});

test('a mid-install failure rolls every changed original back; unrecoverable rollback is not called cachemiss', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  let count = 0;
  const failedRename = async (...args) => {
    if (++count === 2) throw new Error('synthetic install failure with private details');
    return fs.rename(...args);
  };
  const ordinary = await f.call('restore', f.target, { renameImpl: failedRename });
  assert.equal(ordinary.code, 'INSTALL_REJECTED');
  assert.equal(ordinary.requiresProtectedRestore, false);
  await f.assertTargetOriginal();
  count = 0;
  const severe = await f.call('restore', f.target, { renameImpl: failedRename,
    rollbackRenameImpl: async () => { throw new Error('synthetic rollback unavailable'); } });
  assert.equal(severe.status, 'RESTORE_REPAIR_REQUIRED');
  assert.equal(severe.requiresProtectedRestore, true);
  assert.ok((await fs.readdir(path.join(f.target, '.cache'))).some(name => name.includes('.progress-previous-')));
  assert.equal(JSON.stringify(severe).includes('private details'), false);
});

test('normal restore requires protected recovery when the baseline changes after installation', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  const cipher = await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  let installed = 0;
  const result = await f.call('restore', f.target, { renameImpl: async (...args) => {
    await fs.rename(...args);
    if (++installed === 3) await write(f.target, 'data/live/conditions.json', `${baseline} `);
  } });
  assert.equal(installed, 3);
  assert.equal(result.status, 'RESTORE_REPAIR_REQUIRED');
  assert.equal(result.code, 'BASELINE_MISMATCH');
  assert.equal(result.requiresProtectedRestore, true);
  assert.equal(result.restored, false);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')), progressedBank);
  assert.deepEqual(await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH)), cipher);
});

test('normal restore reports post-install cleanup failure once without private exception details', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  const cipher = await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  const actualRm = fs.rm, attempts = [];
  const mock = t.mock.method(fs, 'rm', async (target, options) => {
    if (path.basename(target).startsWith('rr-encrypted-progress-')) {
      attempts.push(target);
      throw new Error('SYNTHETIC_PRIVATE_CLEANUP_DETAILS');
    }
    return actualRm(target, options);
  });
  let result;
  try { result = await f.call('restore', f.target); }
  finally {
    mock.mock.restore();
    for (const folder of new Set(attempts)) {
      assert.equal(path.dirname(path.resolve(folder)), await fs.realpath(os.tmpdir()));
      assert.ok(path.basename(folder).startsWith('rr-encrypted-progress-'));
      await actualRm(folder, { recursive: true, force: true });
    }
  }
  assert.equal(attempts.length, 1);
  assert.equal(result.status, 'RESTORE_REPAIR_REQUIRED');
  assert.equal(result.code, 'TEMPORARY_CLEANUP_FAILED');
  assert.equal(result.requiresProtectedRestore, true);
  assert.equal(result.restored, false);
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE'), false);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')), progressedBank);
  assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
  assert.deepEqual(await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH)), cipher);
});

for (const primary of ['rollback', 'union']) test(`normal restore preserves ${primary} failure when temporary cleanup also fails`, async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  if (primary === 'union') await write(f.target, '.cache/weather-component-inputs.pack', 'synthetic-invalid-protected-pack');
  const cipher = await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  const actualRm = fs.rm, attempts = [];
  let installs = 0;
  const mock = t.mock.method(fs, 'rm', async (target, options) => {
    if (path.basename(target).startsWith('rr-encrypted-progress-')) {
      attempts.push(target);
      throw new Error('SYNTHETIC_PRIVATE_SECONDARY_CLEANUP');
    }
    return actualRm(target, options);
  });
  let result;
  try {
    result = await f.call('restore', f.target, { productionReferenceAt: reference,
      renameImpl: async (...args) => {
        if (++installs === 2) throw new Error('SYNTHETIC_PRIVATE_INSTALL');
        return fs.rename(...args);
      }, rollbackRenameImpl: async () => { throw new Error('SYNTHETIC_PRIVATE_ROLLBACK'); } });
  } finally {
    mock.mock.restore();
    for (const folder of new Set(attempts)) {
      assert.equal(path.dirname(path.resolve(folder)), await fs.realpath(os.tmpdir()));
      assert.ok(path.basename(folder).startsWith('rr-encrypted-progress-'));
      await actualRm(folder, { recursive: true, force: true });
    }
  }
  assert.equal(attempts.length, 1);
  assert.equal(result.status, 'RESTORE_REPAIR_REQUIRED');
  assert.equal(result.requiresProtectedRestore, true);
  assert.equal(result.restored, false);
  assert.equal(result.code, primary === 'rollback' ? 'ROLLBACK_FAILED' : 'PROTECTED_PROGRESS_UNION_FAILED');
  if (primary === 'rollback') {
    assert.equal(installs, 2);
    assert.ok((await fs.readdir(path.join(f.target, '.cache'))).some(name => name.includes('.progress-previous-')));
  } else {
    assert.equal(installs, 0);
    assert.equal(result.unionFailureCode, 'PROTECTED_PROGRESS_BASE_UNPACK_FAILED');
    await f.assertTargetOriginal();
  }
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE'), false);
  assert.deepEqual(await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH)), cipher);
});

test('missing key, absent snapshot, invalid original pack and unsafe destination remain bounded misses', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('restore', f.target)).code, 'SNAPSHOT_ABSENT');
  assert.equal((await f.call('save', f.source, { encryptionKey: '' })).code, 'ENCRYPTION_KEY_UNAVAILABLE');
  assert.equal((await f.call('save', f.source, { encryptionKey: 'invalid' })).code, 'ENCRYPTION_KEY_INVALID');
  await write(f.source, files.openMeteoBank, { invalid: true });
  const invalidBank = await f.call('save');
  assert.equal(invalidBank.saved, false);
  assert.equal(invalidBank.code, 'WEATHER_PACK_OM_BANK_HASH_INVALID',
    'a fixed, payload-free reason must replace the opaque progress-unavailable status');
  await assert.rejects(fs.access(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH)));
  await f.saveAndTransfer();
  await fs.unlink(path.join(f.target, files.selectedComponents));
  await fs.mkdir(path.join(f.target, files.selectedComponents));
  const rejected = await f.call('restore', f.target);
  assert.equal(rejected.code, 'INSTALL_REJECTED');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')), originalBank);
});

test('existing protected service secret derives one stable domain-separated progress key', async t => {
  const f = await fixture(t);
  const masterSecret = 'sb_secret_fixture_with_more_than_thirty_two_random_characters';
  await write(f.source, files.openMeteoBank, progressedBank);
  const saved = await f.call('save', f.source, { encryptionKey: undefined, masterSecret });
  assert.equal(saved.saved, true, JSON.stringify(saved));
  await fs.copyFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH), path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  const restored = await f.call('restore', f.target, { encryptionKey: undefined, masterSecret });
  assert.equal(restored.restored, true, JSON.stringify(restored));
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')),
    progressedBank,
  );
  const wrongScope = await f.call('restore', f.target, {
    encryptionKey: undefined,
    masterSecret,
    repository: 'other/repository',
  });
  assert.equal(wrongScope.status, 'CACHE_MISS');
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')),
    progressedBank,
  );
});

test('CP positive original object/static/receipt inventory survives encrypted save and authenticated restore', async t => {
  const f = await fixture(t);
  const prepared = path.join(f.folder, 'cp-fixture');
  const pythonExecutable = process.env.PYTHON ?? 'python';
  await execFileAsync(pythonExecutable, ['scripts/test-copernicus-component-production.py', '--prepare-fixture', prepared], { timeout: 30_000, windowsHide: true });
  await fs.copyFile(path.join(prepared, 'bank.json'), path.join(f.source, files.copernicusBank));
  await fs.cp(path.join(prepared, 'cache'), path.join(f.source, '.cache/copernicus-components'), { recursive: true });
  await write(f.source, '.cache/copernicus-component-bank.json.progress.json', { cursor: 'scheduling-only' });
  const saved = await f.call('save', f.source, { pythonExecutable });
  assert.equal(saved.saved, true, JSON.stringify(saved));
  await fs.copyFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH), path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  const restored = await f.call('restore', f.target, { pythonExecutable });
  assert.equal(restored.restored, true, JSON.stringify(restored));
  assert.ok(restored.fileCount > 5);
  assert.deepEqual(await fs.readFile(path.join(f.target, files.copernicusBank)), await fs.readFile(path.join(f.source, files.copernicusBank)));
  assert.ok((await fs.readdir(path.join(f.target, '.cache/copernicus-components/objects'))).length > 0);
  assert.ok((await fs.readdir(path.join(f.target, '.cache/copernicus-components/receipts'))).length > 0);
  assert.ok((await fs.readdir(path.join(f.target, '.cache/copernicus-components/static'))).length > 0);
});

test('protected CP originals are re-admitted before encrypted progress can replace the working bank', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-progress-cp-union-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('rr-progress-cp-union-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const pythonExecutable = process.env.PYTHON ?? 'python';
  const prepared = path.join(folder, 'cp-fixture');
  await execFileAsync(pythonExecutable, ['scripts/test-copernicus-component-production.py', '--prepare-fixture', prepared],
    { timeout: 30_000, windowsHide: true });
  const cpBank = JSON.parse(await fs.readFile(path.join(prepared, 'bank.json'), 'utf8'));
  const selection = '{"synthetic":"selection"}\n';
  const conditions = { weatherComponentInputs: {
    schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
    openMeteoBankSha256: null, copernicusBankSha256: cpBank.bankSha256,
    selectedComponentsSha256: crypto.createHash('sha256').update(selection).digest('hex'),
  } };
  const source = path.join(folder, 'source');
  const target = path.join(folder, 'target');
  for (const root of [source, target]) {
    await fs.mkdir(root);
    await write(root, 'data/live/conditions.json', conditions);
    await write(root, 'data/live/coastal-parts-v2.json', { partCount: 1, zones: {
      'DK-B05-11': [{ partId: 'SYNTHETIC-ø-PART', sourceZoneId: 'DK-B05-11', waterPoint: [10, 58] }],
    } });
    await write(root, files.selectedComponents, selection);
    await fs.copyFile(path.join(prepared, 'bank.json'), path.join(root, files.copernicusBank));
    await fs.cp(path.join(prepared, 'cache'), path.join(root, '.cache/copernicus-components'), { recursive: true });
  }
  await buildPrivateWeatherComponentPack({ repositoryRoot: target, conditions, pythonExecutable });
  const protectedPack = await fs.readFile(path.join(target, '.cache/weather-component-inputs.pack'));
  const sourceBase = path.join(folder, 'source-base.json');
  const targetBase = path.join(folder, 'target-base.json');
  for (const [root, basePath] of [[source, sourceBase], [target, targetBase]]) {
    assert.equal((await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: root,
      basePath, repository, protectedBundleSha256 })).captured, true);
  }
  const saved = await weatherComponentProgressCache({ mode: 'save', repositoryRoot: source,
    basePath: sourceBase, repository, encryptionKey, pythonExecutable });
  assert.equal(saved.saved, true, JSON.stringify(saved));
  await fs.copyFile(path.join(source, WEATHER_PROGRESS_CIPHER_PATH), path.join(target, WEATHER_PROGRESS_CIPHER_PATH));
  const restored = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: target,
    basePath: targetBase, repository, encryptionKey, productionReferenceAt: reference.replace('.000Z', 'Z'), pythonExecutable });
  assert.equal(restored.restored, true, JSON.stringify(restored));
  assert.equal(restored.protectedCopernicusBankMerged, true);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.copernicusBank), 'utf8')).records,
    cpBank.records);
  assert.deepEqual(await fs.readFile(path.join(target, '.cache/weather-component-inputs.pack')), protectedPack);
});

test('a sole newer protected Copernicus bank is re-admitted against current targets', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-paired-cp-only-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('rr-paired-cp-only-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const pythonExecutable = process.env.PYTHON ?? 'python';
  const prepared = path.join(folder, 'cp-fixture');
  await execFileAsync(pythonExecutable,
    ['scripts/test-copernicus-component-production.py', '--prepare-fixture', prepared],
    { timeout: 30_000, windowsHide: true });
  const cpBank = JSON.parse(await fs.readFile(path.join(prepared, 'bank.json'), 'utf8'));
  const selection = '{"synthetic":"selection"}\n';
  const donor = path.join(folder, 'donor');
  const working = path.join(folder, 'working');
  for (const root of [donor, working]) {
    await fs.mkdir(root);
    await write(root, 'data/live/coastal-parts-v2.json', { partCount: 1, zones: {
      'DK-B05-11': [{ partId: 'SYNTHETIC-ø-PART', sourceZoneId: 'DK-B05-11', waterPoint: [10, 58] }],
    } });
  }
  await write(working, 'data/live/conditions.json', {
    productionReferenceAt: new Date(Date.parse(reference) - 3600000).toISOString(),
    generatedAt: new Date(Date.parse(reference) - 43 * 60000).toISOString(),
  });
  const donorConditions = { productionReferenceAt: reference,
    generatedAt: new Date(Date.parse(reference) + 17 * 60000).toISOString(),
    weatherComponentInputs: {
      schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
      openMeteoBankSha256: null, copernicusBankSha256: cpBank.bankSha256,
      selectedComponentsSha256: crypto.createHash('sha256').update(selection).digest('hex'),
    } };
  await write(donor, 'data/live/conditions.json', donorConditions);
  await write(donor, files.selectedComponents, selection);
  await fs.copyFile(path.join(prepared, 'bank.json'), path.join(donor, files.copernicusBank));
  await fs.cp(path.join(prepared, 'cache'), path.join(donor, '.cache/copernicus-components'), { recursive: true });
  await buildPrivateWeatherComponentPack({ repositoryRoot: donor, conditions: donorConditions,
    pythonExecutable });
  const report = await reconcileProtectedWeatherSources({ root: working, donorRoot: donor,
    productionReferenceAt: new Date(Date.parse(reference) + 3600000).toISOString(), pythonExecutable });
  assert.equal(report.sourceComponentsMerged.copernicus, true);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(working, files.copernicusBank), 'utf8')).records,
    cpBank.records);
  assert.ok((await fs.readdir(path.join(working, '.cache/copernicus-components/objects'))).length > 0);
  const repeated = await reconcileProtectedWeatherSources({ root: working, donorRoot: donor,
    productionReferenceAt: new Date(Date.parse(reference) + 3600000).toISOString(), pythonExecutable });
  assert.equal(repeated.sourceComponentsMerged.copernicus, true,
    'the next run must merge two present, authenticated Copernicus generations');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(working, files.copernicusBank), 'utf8')).records,
    cpBank.records);
});

test('compressed progress budget preserves the previous snapshot and never stops ordinary operation', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  const originalCipher = await fs.readFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH));
  await write(f.source, files.fallbackCursor, { schedulingOnly: crypto.randomBytes(16_384).toString('hex') });
  const bounded = await f.call('save', f.source, { maximumEncryptedBytes: 4096 });
  assert.equal(bounded.code, 'SIZE_LIMIT');
  assert.equal(bounded.saved, false);
  assert.equal(bounded.requiresProtectedRestore, false);
  assert.deepEqual(await fs.readFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH)), originalCipher);
  assert.equal((await fs.readdir(path.join(f.source, '.cache'))).some(name => name.includes('.encrypted.new-')), false);
  assert.equal((await f.call('restore', f.target)).restored, true);
});

test('cipher commit flushes and closes complete authenticated bytes before replacing the previous snapshot', async t => {
  for (const fault of ['none', 'sync', 'close', 'sync-and-close']) await t.test(fault, async sub => {
    const f = await fixture(sub);
    await f.saveAndTransfer();
    const cipherPath = path.resolve(await fs.realpath(f.source), WEATHER_PROGRESS_CIPHER_PATH);
    const previousCipher = await fs.readFile(cipherPath);
    const previousBase = await fs.readFile(f.sourceBase);
    await write(f.source, files.fallbackCursor, { afterPreviousSeal: true });
    const open = fs.open.bind(fs), rename = fs.rename.bind(fs);
    let opened = 0, syncAttempts = 0, closeAttempts = 0, closed = false, replacements = 0;
    sub.mock.method(fs, 'open', async (file, ...args) => {
      const handle = await open(file, ...args);
      if (path.resolve(String(file)).startsWith(`${cipherPath}.new-`)) {
        opened++;
        const sync = handle.sync.bind(handle), close = handle.close.bind(handle);
        sub.mock.method(handle, 'sync', async () => {
          syncAttempts++;
          if (fault === 'sync' || fault === 'sync-and-close') throw new Error('synthetic private sync failure');
          await sync();
        });
        sub.mock.method(handle, 'close', async () => {
          closeAttempts++;
          await close();
          closed = true;
          if (fault === 'close' || fault === 'sync-and-close') throw new Error('synthetic private close failure');
        });
      }
      return handle;
    });
    sub.mock.method(fs, 'rename', async (from, to) => {
      if (path.resolve(String(to)) === cipherPath) {
        replacements++;
        assert.equal(syncAttempts, 1, 'the complete ciphertext and GCM tag must be flushed before commit');
        assert.equal(closed, true, 'the owned flush handle must close before commit');
      }
      return rename(from, to);
    });
    const result = await f.call('save');
    sub.mock.restoreAll();
    assert.equal(opened, 1);
    assert.equal(syncAttempts, 1);
    assert.equal(closeAttempts, 1, 'close must be attempted even after failed sync');
    assert.equal(result.saved, fault === 'none');
    assert.equal(replacements, fault === 'none' ? 1 : 0);
    assert.equal(JSON.stringify(result).includes('synthetic private'), false);
    assert.deepEqual(await fs.readFile(f.sourceBase), previousBase);
    if (fault !== 'none') {
      assert.equal(result.code, fault === 'close' ? 'CIPHER_CLOSE_FAILED' : 'CIPHER_SYNC_FAILED');
      assert.deepEqual(await fs.readFile(cipherPath), previousCipher);
    } else assert.equal(result.status, 'SAVED');
    await withAuthenticatedWeatherProgress({ repositoryRoot: f.source,
      basePath: f.sourceBase, repository, encryptionKey }, async ({ verifiedRoot }) => {
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(verifiedRoot, files.fallbackCursor), 'utf8')),
        fault === 'none' ? { afterPreviousSeal: true } : { progressed: true });
    });
    assert.equal((await fs.readdir(path.dirname(cipherPath))).some(name =>
      name.startsWith(`${path.basename(cipherPath)}.new-`)), false);
    if (fault === 'none') await sub.test('actual normal save and fresh restore CLIs preserve the original baseline', async () => {
      await write(f.source, files.fallbackCursor, { actualCliSeal: true });
      const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
        ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT'].includes(name.toUpperCase())));
      Object.assign(environment, { GITHUB_REPOSITORY: repository, WEATHER_PROGRESS_ENCRYPTION_KEY: encryptionKey });
      const saveReport = path.join(f.folder, 'cli-flushed-save-report.json');
      await execFileAsync(process.execPath, [path.resolve('scripts/weather-component-progress-cache.mjs'),
        'save', '--root', f.source, '--base', f.sourceBase, '--report', saveReport],
      { cwd: process.cwd(), env: environment, windowsHide: true });
      const saved = JSON.parse(await fs.readFile(saveReport, 'utf8'));
      assert.equal(saved.saved, true);
      assert.equal(saved.status, 'SAVED');
      assert.equal(saved.code, 'ENCRYPTED_PROGRESS_SAVED');
      assert.equal(saved.encryptedBytes, (await fs.stat(cipherPath)).size);
      assert.equal(saved.privatePayloadIncluded, false);
      assert.deepEqual(await fs.readFile(f.sourceBase), previousBase);
      await fs.copyFile(cipherPath, path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
      const targetBase = await fs.readFile(f.targetBase);
      const restoreReport = path.join(f.folder, 'cli-flushed-restore-report.json');
      await execFileAsync(process.execPath, [path.resolve('scripts/weather-component-progress-cache.mjs'),
        'restore', '--root', f.target, '--base', f.targetBase, '--report', restoreReport],
      { cwd: process.cwd(), env: environment, windowsHide: true });
      const restored = JSON.parse(await fs.readFile(restoreReport, 'utf8'));
      assert.equal(restored.restored, true);
      assert.equal(restored.saved, false);
      assert.equal(restored.privatePayloadIncluded, false);
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.fallbackCursor), 'utf8')),
        { actualCliSeal: true });
      assert.deepEqual(await fs.readFile(f.targetBase), targetBase);
      assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')), progressedBank);
      // Real CLI exits and local file transfer, not a remote Actions upload or
      // evidence that a deleted/failed hosted runner can be recovered.
    });
    // Same-disk authenticated commit boundary only, not upload/runner-loss,
    // directory crash durability or national four-minute capacity.
  });
});
