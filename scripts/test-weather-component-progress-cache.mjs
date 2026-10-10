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
  const nextReference = new Date(Date.parse(reference) + 3600000).toISOString();
  const cases = [
    { productionReferenceAt: reference, targetSpelling: 'canonical target' },
    { productionReferenceAt: reference.replace('.000Z', 'Z'), targetSpelling: 'scheduled seconds-only UTC target' },
    { productionReferenceAt: nextReference.replace('.000Z', 'Z'), targetSpelling: 'next scheduled seconds-only UTC target' },
  ].flatMap(target => [false, true].map(invalid => ({ ...target, invalid })));
  for (const { productionReferenceAt, targetSpelling, invalid } of cases) await t.test(
    `${invalid ? 'invalid inner source seal' : 'qualified four-hour progress'} / ${targetSpelling}`, async child => {
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
    let restored;
    if (productionReferenceAt === reference) {
      restored = await f.call('restore', f.target, { productionReferenceAt });
    } else {
      // Exercise the actual scheduled environment/CLI boundary with an
      // authenticated SOURCE bank, not just a bank-free restore fixture.
      const cliReport = path.join(f.folder, 'source-restore-report.json');
      const cli = await execFileAsync(process.execPath, ['scripts/weather-component-progress-cache.mjs', 'restore',
        '--root', f.target, '--base', f.targetBase, '--report', cliReport], { windowsHide: true,
        env: { ...process.env, GITHUB_REPOSITORY: repository, WEATHER_PROGRESS_ENCRYPTION_KEY: encryptionKey,
          RAVRADAR_PRODUCTION_TARGET_HOUR: productionReferenceAt } });
      restored = JSON.parse(cli.stdout);
      assert.deepEqual(JSON.parse(await fs.readFile(cliReport, 'utf8')), restored);
    }
    assert.equal(restored.restored, true, JSON.stringify(restored));
    assert.deepEqual(await fs.readFile(f.targetBase), baseBefore, 'Original protection baseline is never rewritten.');
    assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
    if (invalid) {
      assert.equal(restored.dmiProgress.forecast.status, 'REJECTED');
      assert.ok(restored.dmiProgress.codes.includes('DMI_FORECAST_MERGE_UNAVAILABLE'),
        'Invalid inner seals retain the existing bounded diagnostic, without private exception details.');
      assert.throws(() => assertUsableDmiProgressRecovery(restored.dmiProgress), /DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED/,
        'Actual normal workflow admission rejects a cache report with invalid SOURCE recovery.');
      assert.deepEqual(await fs.readFile(path.join(f.target, 'data/live/dmi-forecast-cache.json')), forecastBefore);
    } else {
      assert.equal(restored.dmiProgress.forecast.status, 'MERGED');
      assert.equal(restored.dmiProgress.forecast.recoveredComponents, 4);
      assert.equal(assertUsableDmiProgressRecovery(restored.dmiProgress), true);
      const actual = await readDmiForecastFile(path.join(f.target, 'data/live/dmi-forecast-cache.json'));
      assert.deepEqual(actual.zones, protectedForecast.zones);
      const canonicalTarget = new Date(Date.parse(productionReferenceAt)).toISOString();
      const qualified = await unpackWaterSourceForecastContinuity(actual.waterSourceContinuity, canonicalTarget);
      const expected = original.get(source.sourceKey).hourly.filter(row => Date.parse(row.time) >= Date.parse(canonicalTarget));
      assert.deepEqual(qualified.get(source.sourceKey).hourly, expected);
      assert.equal(qualified.get(source.sourceKey).hourly.length, canonicalTarget === reference ? 121 : 120,
        'A rolling target never invents the missing new tail hour.');
      for (const row of sparse.get(source.sourceKey).hourly.filter(row => Date.parse(row.time) >= Date.parse(canonicalTarget))) assert.deepEqual(
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

test('normal progress CLIs retain authenticated data but never report success after late report creation fails', async t => {
  const f = await fixture(t);
  await f.saveAndTransfer();
  const cipherPath = path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH);
  const previousCipher = await fs.readFile(cipherPath);
  const sourceBase = await fs.readFile(f.sourceBase);
  const targetBase = await fs.readFile(f.targetBase);
  const previousReport = '{"syntheticPreviousReport":true}\n';
  const saveReport = path.join(f.folder, 'cli-existing-save-report.json');
  await fs.writeFile(saveReport, previousReport, { flag: 'wx' });
  await write(f.source, files.fallbackCursor, { committedBeforeReportFailure: true });
  const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
    ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT'].includes(name.toUpperCase())));
  Object.assign(environment, { GITHUB_REPOSITORY: repository, WEATHER_PROGRESS_ENCRYPTION_KEY: encryptionKey });
  const cli = path.resolve('scripts/weather-component-progress-cache.mjs');
  const assertReportFailure = error => {
    assert.equal(error.code, 1);
    assert.equal(error.stdout, '', 'no successful output may precede a failed report');
    assert.equal(error.stderr.trim(), 'WEATHER_PROGRESS_CACHE_REPORT_UNAVAILABLE');
    return true;
  };
  await assert.rejects(execFileAsync(process.execPath, [cli, 'save', '--root', f.source,
    '--base', f.sourceBase, '--report', saveReport],
  { cwd: process.cwd(), env: environment, windowsHide: true }), assertReportFailure);
  assert.equal(await fs.readFile(saveReport, 'utf8'), previousReport);
  const committedCipher = await fs.readFile(cipherPath);
  assert.notDeepEqual(committedCipher, previousCipher);
  assert.deepEqual(await fs.readFile(f.sourceBase), sourceBase);
  assert.equal(await fs.readFile(path.join(f.source, 'data/live/conditions.json'), 'utf8'), baseline);
  assert.equal((await fs.readdir(path.dirname(cipherPath))).some(name =>
    name.startsWith(`${path.basename(cipherPath)}.new-`)), false);
  await withAuthenticatedWeatherProgress({ repositoryRoot: f.source,
    basePath: f.sourceBase, repository, encryptionKey }, async ({ verifiedRoot }) => {
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(verifiedRoot, files.fallbackCursor), 'utf8')),
      { committedBeforeReportFailure: true });
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(verifiedRoot, files.openMeteoBank), 'utf8')), progressedBank);
  });
  await f.assertTargetOriginal();
  // Only a locally copied ciphertext is supplied to a fresh normal CLI. The
  // failed seal/report step is not a saved-output or remote-upload receipt.
  await fs.copyFile(cipherPath, path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
  const blockedRestoreReport = path.join(f.folder, 'cli-existing-restore-report.json');
  await fs.writeFile(blockedRestoreReport, previousReport, { flag: 'wx' });
  await assert.rejects(execFileAsync(process.execPath, [cli, 'restore', '--root', f.target,
    '--base', f.targetBase, '--report', blockedRestoreReport],
  { cwd: process.cwd(), env: environment, windowsHide: true }), assertReportFailure);
  assert.equal(await fs.readFile(blockedRestoreReport, 'utf8'), previousReport);
  // A late failed report is not an untouched cache miss: the normal restore
  // already installed verified progress. It exits nonzero and must stop the
  // normal caller; these bytes alone do not prove successful outer recovery.
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.fallbackCursor), 'utf8')),
    { committedBeforeReportFailure: true });
  assert.deepEqual(await fs.readFile(f.targetBase), targetBase);
  assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
  assert.deepEqual(await fs.readFile(path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH)), committedCipher);
  const restoreReport = path.join(f.folder, 'cli-after-report-failure-restore.json');
  const { stdout, stderr } = await execFileAsync(process.execPath, [cli, 'restore',
    '--root', f.target, '--base', f.targetBase, '--report', restoreReport],
  { cwd: process.cwd(), env: environment, windowsHide: true });
  const restored = JSON.parse(await fs.readFile(restoreReport, 'utf8'));
  assert.equal(stderr, '');
  assert.deepEqual(JSON.parse(stdout), restored);
  assert.equal(restored.restored, true);
  assert.equal(restored.saved, false);
  assert.equal(restored.privatePayloadIncluded, false);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.fallbackCursor), 'utf8')),
    { committedBeforeReportFailure: true });
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')), progressedBank);
  assert.deepEqual(await fs.readFile(f.targetBase), targetBase);
  assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
});

test('hard stop at the normal encrypted CLI commit boundary retains only the last committed snapshot', async t => {
  for (const phase of ['before', 'after']) await t.test(phase, async sub => {
    const f = await fixture(sub);
    await f.saveAndTransfer();
    const cipherPath = path.resolve(await fs.realpath(f.source), WEATHER_PROGRESS_CIPHER_PATH);
    const previousCipher = await fs.readFile(cipherPath);
    const sourceBase = await fs.readFile(f.sourceBase);
    const targetBase = await fs.readFile(f.targetBase);
    await write(f.source, files.fallbackCursor, { hardStoppedSeal: true });
    const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
      ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT'].includes(name.toUpperCase())));
    Object.assign(environment, { GITHUB_REPOSITORY: repository, WEATHER_PROGRESS_ENCRYPTION_KEY: encryptionKey });
    const cli = path.resolve('scripts/weather-component-progress-cache.mjs');
    const saveReport = path.join(f.folder, `hard-stop-${phase}-save-report.json`);
    // Test-only preload holds the existing fs.rename seam immediately before
    // or after the actual atomic commit. The normal executable, pack, GCM,
    // flush and restore paths are unchanged; no production hook is added.
    const preload = `
      import fs from 'node:fs/promises';
      import path from 'node:path';
      const mkdir = fs.mkdtemp.bind(fs), rename = fs.rename.bind(fs);
      fs.mkdtemp = async (...args) => {
        const folder = await mkdir(...args);
        if (path.basename(String(args[0])).startsWith('rr-encrypted-progress-'))
          process.stderr.write('COMMIT_TEST_TEMP:' + JSON.stringify(folder) + '\\n');
        return folder;
      };
      fs.rename = async (from, to) => {
        if (path.resolve(String(to)) !== ${JSON.stringify(cipherPath)}) return rename(from, to);
        if (${JSON.stringify(phase)} === 'after') await rename(from, to);
        process.stderr.write('COMMIT_TEST_READY\\n');
        await new Promise(() => { setInterval(() => {}, 1000); });
      };
    `;
    let child, temporaryDirectory, boundaryReached = false, killRequested = false;
    let stderr = '';
    const completion = new Promise(resolve => {
      child = execFile(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`,
        cli, 'save', '--root', f.source, '--base', f.sourceBase, '--report', saveReport],
      { cwd: process.cwd(), env: environment, windowsHide: true, timeout: 10_000, killSignal: 'SIGKILL' },
      (error, stdout, output) => resolve({ error, stdout, stderr: output }));
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
        const temporary = stderr.match(/^COMMIT_TEST_TEMP:(.+)$/m);
        if (temporary) temporaryDirectory = JSON.parse(temporary[1]);
        if (!boundaryReached && stderr.includes('COMMIT_TEST_READY\n')) {
          boundaryReached = true;
          killRequested = child.kill('SIGKILL');
        }
      });
    });
    try {
      const interrupted = await completion;
      assert.equal(boundaryReached, true, 'the real normal CLI must reach the exact commit boundary');
      assert.equal(killRequested, true);
      assert.ok(interrupted.error, 'a forcibly stopped seal cannot report success');
      assert.ok(child.exitCode !== null || child.signalCode !== null, 'wait for actual own child exit');
      assert.notEqual(child.exitCode, 0);
      assert.equal(interrupted.stdout, '');
      assert.equal(interrupted.stderr, stderr);
      await assert.rejects(fs.access(saveReport), { code: 'ENOENT' });
      const committedCipher = await fs.readFile(cipherPath);
      if (phase === 'before') assert.deepEqual(committedCipher, previousCipher);
      else assert.notDeepEqual(committedCipher, previousCipher);
      const staging = (await fs.readdir(path.dirname(cipherPath))).filter(name =>
        name.startsWith(`${path.basename(cipherPath)}.new-`));
      assert.equal(staging.length, phase === 'before' ? 1 : 0);
      assert.deepEqual(await fs.readFile(f.sourceBase), sourceBase);
      assert.equal(await fs.readFile(path.join(f.source, 'data/live/conditions.json'), 'utf8'), baseline);
      await withAuthenticatedWeatherProgress({ repositoryRoot: f.source,
        basePath: f.sourceBase, repository, encryptionKey }, async ({ verifiedRoot }) => {
        assert.deepEqual(JSON.parse(await fs.readFile(path.join(verifiedRoot, files.fallbackCursor), 'utf8')),
          phase === 'before' ? { progressed: true } : { hardStoppedSeal: true });
      });
      await f.assertTargetOriginal();
      // Transfer only the normal committed path, never the orphan .new file.
      // Local recovery is not an Actions upload or survival of a lost runner.
      await fs.copyFile(cipherPath, path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH));
      const restoreReport = path.join(f.folder, `hard-stop-${phase}-restore-report.json`);
      const restoredProcess = await execFileAsync(process.execPath, [cli, 'restore', '--root', f.target,
        '--base', f.targetBase, '--report', restoreReport],
      { cwd: process.cwd(), env: environment, windowsHide: true });
      const restored = JSON.parse(await fs.readFile(restoreReport, 'utf8'));
      assert.equal(restoredProcess.stderr, '');
      assert.deepEqual(JSON.parse(restoredProcess.stdout), restored);
      assert.equal(restored.restored, true);
      assert.equal(restored.saved, false);
      assert.equal(restored.privatePayloadIncluded, false);
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.fallbackCursor), 'utf8')),
        phase === 'before' ? { progressed: true } : { hardStoppedSeal: true });
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.openMeteoBank), 'utf8')), progressedBank);
      assert.deepEqual(await fs.readFile(f.targetBase), targetBase);
      assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await completion;
      if (temporaryDirectory) {
        const parent = await fs.realpath(os.tmpdir());
        assert.equal(path.dirname(path.resolve(temporaryDirectory)), parent);
        assert.ok(path.basename(temporaryDirectory).startsWith('rr-encrypted-progress-'));
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
      }
    }
    // Actual own-process termination at an injected deterministic file seam,
    // not OS-wide/job-tree cancellation, power loss or four-minute capacity.
  });
});

test('hard stop during normal restore retains the cipher and originals without claiming a complete installation', async t => {
  for (const phase of ['before', 'after']) await t.test(phase, async sub => {
    const f = await fixture(sub);
    await f.saveAndTransfer();
    const targetRoot = await fs.realpath(f.target);
    const bankPath = path.resolve(targetRoot, files.openMeteoBank);
    const cipherPath = path.join(f.target, WEATHER_PROGRESS_CIPHER_PATH);
    const cipher = await fs.readFile(cipherPath);
    const sourceBase = await fs.readFile(f.sourceBase);
    const targetBase = await fs.readFile(f.targetBase);
    const originalBytes = await fs.readFile(bankPath);
    const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
      ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT'].includes(name.toUpperCase())));
    Object.assign(environment, { GITHUB_REPOSITORY: repository, WEATHER_PROGRESS_ENCRYPTION_KEY: encryptionKey });
    const cli = path.resolve('scripts/weather-component-progress-cache.mjs');
    const failedReport = path.join(f.folder, `hard-restore-${phase}-report.json`);
    // Hold only the existing first component replacement, after normal GCM
    // authentication, unpacking and staging. A real own-process hard stop
    // cannot execute JavaScript rollback/finally; do not call it a cache miss.
    const preload = `
      import fs from 'node:fs/promises';
      import path from 'node:path';
      const mkdir = fs.mkdtemp.bind(fs), rename = fs.rename.bind(fs);
      fs.mkdtemp = async (...args) => {
        const folder = await mkdir(...args);
        if (path.basename(String(args[0])).startsWith('rr-encrypted-progress-'))
          process.stderr.write('RESTORE_TEST_TEMP:' + JSON.stringify(folder) + '\\n');
        return folder;
      };
      fs.rename = async (from, to) => {
        if (path.resolve(String(to)) !== ${JSON.stringify(bankPath)}) return rename(from, to);
        if (${JSON.stringify(phase)} === 'after') await rename(from, to);
        process.stderr.write('RESTORE_TEST_READY\\n');
        await new Promise(() => { setInterval(() => {}, 1000); });
      };
    `;
    let child, temporaryDirectory, boundaryReached = false, killRequested = false;
    let stderr = '';
    const completion = new Promise(resolve => {
      child = execFile(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`,
        cli, 'restore', '--root', f.target, '--base', f.targetBase, '--report', failedReport],
      { cwd: process.cwd(), env: environment, windowsHide: true, timeout: 10_000, killSignal: 'SIGKILL' },
      (error, stdout, output) => resolve({ error, stdout, stderr: output }));
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
        const temporary = stderr.match(/^RESTORE_TEST_TEMP:(.+)$/m);
        if (temporary) temporaryDirectory = JSON.parse(temporary[1]);
        if (!boundaryReached && stderr.includes('RESTORE_TEST_READY\n')) {
          boundaryReached = true;
          killRequested = child.kill('SIGKILL');
        }
      });
    });
    try {
      const interrupted = await completion;
      assert.equal(boundaryReached, true);
      assert.equal(killRequested, true);
      assert.ok(interrupted.error, 'a stopped partial restore cannot be admitted as success');
      assert.ok(child.exitCode !== null || child.signalCode !== null);
      assert.notEqual(child.exitCode, 0);
      assert.equal(interrupted.stdout, '');
      assert.equal(interrupted.stderr, stderr);
      await assert.rejects(fs.access(failedReport), { code: 'ENOENT' });
      assert.deepEqual(await fs.readFile(cipherPath), cipher);
      assert.deepEqual(await fs.readFile(f.sourceBase), sourceBase);
      assert.deepEqual(await fs.readFile(f.targetBase), targetBase);
      assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
      assert.deepEqual(JSON.parse(await fs.readFile(bankPath, 'utf8')),
        phase === 'before' ? originalBank : progressedBank);
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.fallbackCursor), 'utf8')),
        { previous: true });
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.selectedComponents), 'utf8')),
        { previousSelected: true });
      const stagedNames = (await fs.readdir(path.dirname(bankPath))).filter(name =>
        name.includes('.progress-new-') || name.includes('.progress-previous-'));
      assert.equal(stagedNames.filter(name => name.includes('.progress-previous-')).length, 3);
      assert.equal(stagedNames.filter(name => name.includes('.progress-new-')).length, phase === 'before' ? 3 : 2);
      const originalBackup = stagedNames.find(name => name.startsWith(`${path.basename(bankPath)}.progress-previous-`));
      assert.ok(originalBackup);
      assert.deepEqual(await fs.readFile(path.join(path.dirname(bankPath), originalBackup)), originalBytes,
        'the previous original is retained even when abrupt termination bypasses rollback');
      await withAuthenticatedWeatherProgress({ repositoryRoot: f.target,
        basePath: f.targetBase, repository, encryptionKey }, async ({ verifiedRoot, files: verifiedFiles }) => {
        assert.equal(verifiedFiles.length, 3, 'orphan backups/staging do not enter the authenticated inventory');
        assert.deepEqual(JSON.parse(await fs.readFile(path.join(verifiedRoot, files.openMeteoBank), 'utf8')), progressedBank);
      });
      // Explicit fresh own CLI in the now-stopped synthetic workspace only:
      // this is not permission for production retry in a partially used root.
      const retryReport = path.join(f.folder, `hard-restore-${phase}-fresh-report.json`);
      const retry = await execFileAsync(process.execPath, [cli, 'restore', '--root', f.target,
        '--base', f.targetBase, '--report', retryReport],
      { cwd: process.cwd(), env: environment, windowsHide: true });
      const restored = JSON.parse(await fs.readFile(retryReport, 'utf8'));
      assert.equal(retry.stderr, '');
      assert.deepEqual(JSON.parse(retry.stdout), restored);
      assert.equal(restored.restored, true);
      assert.equal(restored.saved, false);
      assert.equal(restored.productionAuthority, false);
      assert.equal(restored.privatePayloadIncluded, false);
      assert.equal(restored.fileCount, 3);
      assert.deepEqual(JSON.parse(await fs.readFile(bankPath, 'utf8')), progressedBank);
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.fallbackCursor), 'utf8')),
        { progressed: true });
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.target, files.selectedComponents), 'utf8')),
        { progressedSelected: true });
      assert.deepEqual(await fs.readFile(cipherPath), cipher);
      assert.deepEqual(await fs.readFile(f.targetBase), targetBase);
      assert.equal(await fs.readFile(path.join(f.target, 'data/live/conditions.json'), 'utf8'), baseline);
      assert.deepEqual((await fs.readdir(path.dirname(bankPath))).filter(name =>
        name.includes('.progress-new-') || name.includes('.progress-previous-')).sort(), stagedNames.sort(),
      'normal restore never adopts or prunes earlier orphan transactions');
      assert.deepEqual(await fs.readFile(path.join(path.dirname(bankPath), originalBackup)), originalBytes);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await completion;
      if (temporaryDirectory) {
        const parent = await fs.realpath(os.tmpdir());
        assert.equal(path.dirname(path.resolve(temporaryDirectory)), parent);
        assert.ok(path.basename(temporaryDirectory).startsWith('rr-encrypted-progress-'));
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
      }
    }
    // Existing fixture cleanup runs only after actual child exit; no real
    // private payload, provider, remote upload, runner-loss or B/S certificate.
  });
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

for (const mode of ['save', 'inspect']) for (const fault of ['close-noop', 'none'])
test('main pack JSON physical lifetime / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const originals = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(mode === 'save' ? f.source : f.target);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) {
    preserved.set(file, await originals.readFile(file));
  }
  let armed = true, reader, fd, identity, actualClose, selectedPath, observationFailure;
  let reads = 0, closes = 0, inspected = 0, launches = 0;
  const temporaries = [], removed = [], hooks = [];
  const nativeProbe = () => {
    try {
      const stat = native.fstatSync(fd);
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
      return 'OPEN_SAME_OBJECT';
    } catch (error) {
      if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED';
      throw error;
    }
  };
  const isSelected = (file, stack) => armed && !reader && typeof file === 'string'
    && stack.includes('at readSmallJson (') && stack.includes('private-weather-component-pack.mjs')
    && (mode === 'save' ? path.resolve(file) === path.join(root, files.openMeteoBank)
      : temporaries.some(row => path.resolve(file) === path.join(row.folder, 'verified', files.openMeteoBank)));
  const bind = async (handle, file) => {
    reader = handle; fd = handle.fd; actualClose = handle.close.bind(handle);
    try {
      selectedPath = await fs.realpath(file); identity = native.fstatSync(fd);
      const stat = await fs.stat(selectedPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      assert.equal(temporaries.length, 1, 'The actual parent created its own private staging directory.');
      handle.close = async () => { closes++; if (fault !== 'close-noop') await actualClose(); };
    } catch (error) { observationFailure = { error }; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_NATIVE_OR_PROVIDER_CHILD_ALLOWED'); }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(originals.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removed.push(path.resolve(String(file)));
    return Reflect.apply(originals.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = isSelected(file, new Error().stack) && flags === 'r';
    const handle = await Reflect.apply(originals.open, fs, [file, flags, ...args]);
    if (selected) { reads++; await bind(handle, file); }
    return handle;
  }));
  let result, failure;
  try {
    try {
      result = mode === 'save' ? await f.call('save') : await withAuthenticatedWeatherProgress({
        repositoryRoot: root, basePath: f.targetBase, repository, encryptionKey,
      }, async input => { inspected++; assert.ok(input.files.length); return 'INSPECTED'; });
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(reader, 'Actual normal pack JSON reader was reached.');
    assert.equal(reads, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const fdState = nativeProbe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = [...await Promise.all([...preserved].map(async ([file, bytes]) =>
      [file, (await originals.readFile(file)).equals(bytes)]))];
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_READER_NORMAL_CALLER', mode, fault, reads, closes, launches,
      fdState, stagingExists, stagingCleanupCalls: removed.length, inspected,
      saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      originalNonCipherUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      originalCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none: this exact main baseline has no paired/SOURCE owner at these callers' }));
    for (const [file, same] of unchanged) if (file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH) || fault !== 'none') assert.equal(same, true, file);
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    if (fault === 'none') {
      assert.equal(failure, undefined);
      if (mode === 'save') assert.equal(result.saved, true); else { assert.equal(result, 'INSPECTED'); assert.equal(inspected, 1); }
      assert.equal(stagingExists, false); assert.equal(removed.length, 1);
    } else {
      if (mode === 'save') assert.notEqual(result?.saved, true); else { assert.ok(failure); assert.equal(inspected, 0); }
      assert.equal(stagingExists, true, 'Unproved actual reader prevents cleanup of this same parent staging directory.');
      assert.equal(removed.length, 0);
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Teardown happens only after the measured result; never manufacture stop/closure success.
    if (reader && nativeProbe() !== 'CLOSED') await actualClose();
    if (reader) assert.equal(nativeProbe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await originals.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});



for (const mode of ['nested-union', 'donor', 'install']) for (const fault of ['close-noop', 'none'])
test('main remaining pack JSON lifetime / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const originals = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, mkdir: fs.mkdir, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.target);
  const sourceRoot = await fs.realpath(f.source);
  let installSource, execute;
  await write(root, 'data/live/coastal-parts-v2.json', { partCount: 1, zones: { ZONE: [part] } });
  if (mode === 'nested-union') {
    // Reuse the existing normal-union native-temperature fixture, not the generic bank fixture's custom test policy.
    for (const destination of [sourceRoot, root]) await write(destination, files.openMeteoBank, nativeTemperatureBank(reference, 14));
    assert.equal((await f.call('save')).saved, true);
    await fs.copyFile(path.join(sourceRoot, WEATHER_PROGRESS_CIPHER_PATH), path.join(root, WEATHER_PROGRESS_CIPHER_PATH));
    await buildPrivateWeatherComponentPack({ repositoryRoot: root, conditions: JSON.parse(baseline) });
    execute = () => f.call('restore', f.target, { productionReferenceAt: reference });
  } else if (mode === 'donor') {
    await write(root, files.openMeteoBank, nativeTemperatureBank(reference, 14));
    await write(sourceRoot, files.openMeteoBank, nativeTemperatureBank(reference, 17,
      new Date(Date.parse(reference) + 300000).toISOString()));
    const bank = JSON.parse(await fs.readFile(path.join(sourceRoot, files.openMeteoBank), 'utf8'));
    const ledger = await fs.readFile(path.join(sourceRoot, files.selectedComponents));
    const conditions = { productionReferenceAt: reference, weatherComponentInputs: {
      schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
      openMeteoBankSha256: bank.bankSha256, copernicusBankSha256: null,
      selectedComponentsSha256: crypto.createHash('sha256').update(ledger).digest('hex'),
    } };
    await write(root, 'data/live/conditions.json', { productionReferenceAt: new Date(Date.parse(reference) - 3600000).toISOString() });
    await write(sourceRoot, 'data/live/conditions.json', conditions);
    await buildPrivateWeatherComponentPack({ repositoryRoot: sourceRoot, conditions });
    execute = () => reconcileProtectedWeatherSources({ root, donorRoot: sourceRoot,
      productionReferenceAt: new Date(Date.parse(reference) + 3600000).toISOString() });
  } else {
    const { installRestoredPrivateRuntime, PRIVATE_RUNTIME_FILES } = await import('./private-production-runtime-workflow.mjs');
    installSource = path.join(await fs.realpath(f.folder), 'restored');
    for (const descriptor of PRIVATE_RUNTIME_FILES) await write(installSource, descriptor.relativePath,
      descriptor.id === 'full-conditions' ? { legacy: true } : 'own-synthetic-' + descriptor.id);
    // Existing installer fixture's base-file shape, plus a real normally created component pack.
    const pack = await buildPrivateWeatherComponentPack({ repositoryRoot: sourceRoot, conditions: { legacy: true } });
    await fs.mkdir(path.join(installSource, '.cache'), { recursive: true });
    await fs.copyFile(pack.sourcePath, path.join(installSource, '.cache/weather-component-inputs.pack'));
    execute = () => installRestoredPrivateRuntime({ restoredRoot: installSource, repositoryRoot: root });
  }
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, WEATHER_PROGRESS_CIPHER_PATH),
    path.join(sourceRoot, files.openMeteoBank), path.join(sourceRoot, WEATHER_PROGRESS_CIPHER_PATH)]) {
    preserved.set(file, await originals.readFile(file));
  }
  let armed = true, reader, fd, identity, actualClose, selectedPath, observationFailure;
  let reads = 0, closes = 0, inspected = 0, launches = 0;
  const temporaries = [], removed = [], hooks = [];
  const nativeProbe = () => {
    try {
      const stat = native.fstatSync(fd);
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
      return 'OPEN_SAME_OBJECT';
    } catch (error) {
      if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED';
      throw error;
    }
  };
  const isSelected = async (file, stack) => {
    if (!armed || reader || typeof file !== 'string' || !stack.includes('at readSmallJson (')
      || !stack.includes('private-weather-component-pack.mjs')) return false;
    // Windows temp aliases may name the same own file; bind only after realpath identity.
    const physical = await fs.realpath(file);
    return temporaries.some(row => physical === path.join(row.folder,
      ...(mode === 'nested-union' ? ['protected-verified'] : mode === 'donor' ? ['donor-verified'] : []),
      files.openMeteoBank));
  };
  const bind = async (handle, file) => {
    reader = handle; fd = handle.fd; actualClose = handle.close.bind(handle);
    try {
      selectedPath = await fs.realpath(file); identity = native.fstatSync(fd);
      const stat = await fs.stat(selectedPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      assert.equal(temporaries.length, 1, 'The actual parent created its own private staging directory.');
      handle.close = async () => { closes++; if (fault !== 'close-noop') await actualClose(); };
    } catch (error) { observationFailure = { error }; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_NATIVE_OR_PROVIDER_CHILD_ALLOWED'); }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(originals.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith(mode === 'donor' ? 'rr-paired-source-' : 'rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, requested: path.resolve(folder), dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'mkdir', async (file, ...args) => {
    const result = await Reflect.apply(originals.mkdir, fs, [file, ...args]);
    if (armed && mode === 'install' && typeof file === 'string' && file.startsWith(installSource + '.weather-components-')
      && path.dirname(file) === path.dirname(installSource)) {
      const physical = await fs.realpath(file), stat = await fs.stat(physical);
      if (!temporaries.some(row => row.folder === physical)) temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return result;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder || path.resolve(String(file)) === row.requested)) removed.push(path.resolve(String(file)));
    return Reflect.apply(originals.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = flags === 'r' && await isSelected(file, new Error().stack);
    const handle = await Reflect.apply(originals.open, fs, [file, flags, ...args]);
    if (selected) { reads++; await bind(handle, file); }
    return handle;
  }));
  let result, failure;
  try {
    try {
      result = await execute();
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    if (!reader) t.diagnostic(JSON.stringify({ mode, fault, stageCount: temporaries.length, failure: String(failure?.error?.message), cause: String(failure?.error?.cause?.message) }));
    assert.ok(reader, 'Actual normal pack JSON reader was reached.');
    assert.equal(reads, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const fdState = nativeProbe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = [...await Promise.all([...preserved].map(async ([file, bytes]) =>
      [file, (await originals.readFile(file)).equals(bytes)]))];
    t.diagnostic(JSON.stringify({ kind: 'MAIN_REMAINING_PACK_READER_NORMAL_CALLER', mode, fault, reads, closes, launches,
      fdState, stagingExists, stagingCleanupCalls: removed.length, inspected,
      restored: result?.restored === true, installed: result?.installed === true, code: result?.code ?? null, unionFailureCode: result?.unionFailureCode ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      originalNonCipherUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      originalCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none: this exact main baseline has no paired/SOURCE owner at these callers' }));
    for (const [file, same] of unchanged) {
      const expectedInstall = fault === 'none' && (file === path.join(root, files.openMeteoBank)
        || mode === 'install' && file === path.join(root, 'data/live/conditions.json'));
      if (!expectedInstall) assert.equal(same, true, file);
    }
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    if (fault === 'none') {
      assert.equal(failure, undefined);
      if (mode === 'nested-union') assert.equal(result.restored, true);
      else if (mode === 'install') assert.equal(result.installed, true);
      else assert.equal(result.publicValuesCopied, false);
      assert.equal(stagingExists, false); assert.equal(removed.length, 1);
    } else {
      if (mode === 'nested-union') {
        assert.equal(result.status, 'RESTORE_REPAIR_REQUIRED');
        assert.equal(result.unionFailureCode, 'PROTECTED_PROGRESS_BASE_UNPACK_FAILED');
      } else assert.ok(failure);
      assert.equal(stagingExists, true, 'Unproved actual reader prevents cleanup of this same parent staging directory.');
      assert.equal(removed.length, 0);
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Teardown happens only after the measured result; never manufacture stop/closure success.
    if (reader && nativeProbe() !== 'CLOSED') await actualClose();
    if (reader) assert.equal(nativeProbe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        if (mode === 'install') {
          assert.equal(path.dirname(row.folder), path.dirname(installSource));
          assert.ok(row.folder.startsWith(installSource + '.weather-components-'));
        } else {
          assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
          assert.ok(path.basename(row.folder).startsWith(mode === 'donor' ? 'rr-paired-source-' : 'rr-encrypted-progress-'));
        }
        await originals.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});



for (const mode of ['inspect']) for (const fault of ['close-noop', 'none'])
test('main pack archive input physical lifetime / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const originals = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(mode === 'save' ? f.source : f.target);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) {
    preserved.set(file, await originals.readFile(file));
  }
  let armed = true, reader, fd, identity, actualClose, selectedPath, observationFailure;
  let reads = 0, closes = 0, inspected = 0, launches = 0;
  const temporaries = [], removed = [], hooks = [];
  const nativeProbe = () => {
    try {
      const stat = native.fstatSync(fd);
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
      return 'OPEN_SAME_OBJECT';
    } catch (error) {
      if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED';
      throw error;
    }
  };
  const isSelected = (file, stack) => armed && !reader && typeof file === 'string'
    && stack.includes('at unpackPackWithJsonReadLifetime (') && stack.includes('private-weather-component-pack.mjs')
    && (mode === 'save' ? path.resolve(file) === path.join(root, files.openMeteoBank)
      : temporaries.some(row => path.resolve(file) === path.join(row.folder, '.cache/weather-component-inputs.pack')));
  const bind = async (handle, file) => {
    reader = handle; fd = handle.fd; actualClose = handle.close.bind(handle);
    try {
      selectedPath = await fs.realpath(file); identity = native.fstatSync(fd);
      const stat = await fs.stat(selectedPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      assert.equal(temporaries.length, 1, 'The actual parent created its own private staging directory.');
      handle.close = async () => { closes++; if (fault !== 'close-noop') await actualClose(); };
    } catch (error) { observationFailure = { error }; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_NATIVE_OR_PROVIDER_CHILD_ALLOWED'); }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(originals.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removed.push(path.resolve(String(file)));
    return Reflect.apply(originals.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = isSelected(file, new Error().stack) && flags === 'r';
    const handle = await Reflect.apply(originals.open, fs, [file, flags, ...args]);
    if (selected) { reads++; await bind(handle, file); }
    return handle;
  }));
  let result, failure;
  try {
    try {
      result = mode === 'save' ? await f.call('save') : await withAuthenticatedWeatherProgress({
        repositoryRoot: root, basePath: f.targetBase, repository, encryptionKey,
      }, async input => { inspected++; assert.ok(input.files.length); return 'INSPECTED'; });
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(reader, 'Actual normal unpack archive input reader was reached.');
    assert.equal(reads, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const fdState = nativeProbe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = [...await Promise.all([...preserved].map(async ([file, bytes]) =>
      [file, (await originals.readFile(file)).equals(bytes)]))];
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_ARCHIVE_READER_NORMAL_CALLER', mode, fault, reads, closes, launches,
      fdState, stagingExists, stagingCleanupCalls: removed.length, inspected,
      saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      originalNonCipherUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      originalCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none: this exact main baseline has no paired/SOURCE owner at these callers' }));
    for (const [file, same] of unchanged) if (file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH) || fault !== 'none') assert.equal(same, true, file);
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    if (fault === 'none') {
      assert.equal(failure, undefined);
      if (mode === 'save') assert.equal(result.saved, true); else { assert.equal(result, 'INSPECTED'); assert.equal(inspected, 1); }
      assert.equal(stagingExists, false); assert.equal(removed.length, 1);
    } else {
      if (mode === 'save') assert.notEqual(result?.saved, true); else { assert.ok(failure); assert.equal(inspected, 0); }
      assert.equal(stagingExists, true, 'Unproved actual reader prevents cleanup of this same parent staging directory.');
      assert.equal(removed.length, 0);
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Teardown happens only after the measured result; never manufacture stop/closure success.
    if (reader && nativeProbe() !== 'CLOSED') await actualClose();
    if (reader) assert.equal(nativeProbe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await originals.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});



for (const mode of ['restore']) for (const fault of ['close-noop', 'none'])
test('main direct restore pack JSON lifetime / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const originals = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(mode === 'save' ? f.source : f.target);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) {
    preserved.set(file, await originals.readFile(file));
  }
  let armed = true, reader, fd, identity, actualClose, selectedPath, observationFailure;
  let reads = 0, closes = 0, inspected = 0, launches = 0;
  const temporaries = [], removed = [], hooks = [];
  const nativeProbe = () => {
    try {
      const stat = native.fstatSync(fd);
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
      return 'OPEN_SAME_OBJECT';
    } catch (error) {
      if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED';
      throw error;
    }
  };
  const isSelected = (file, stack) => armed && !reader && typeof file === 'string'
    && stack.includes('at readSmallJson (') && stack.includes('private-weather-component-pack.mjs')
    && (mode === 'save' ? path.resolve(file) === path.join(root, files.openMeteoBank)
      : temporaries.some(row => path.resolve(file) === path.join(row.folder, 'verified', files.openMeteoBank)));
  const bind = async (handle, file) => {
    reader = handle; fd = handle.fd; actualClose = handle.close.bind(handle);
    try {
      selectedPath = await fs.realpath(file); identity = native.fstatSync(fd);
      const stat = await fs.stat(selectedPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      assert.equal(temporaries.length, 1, 'The actual parent created its own private staging directory.');
      handle.close = async () => { closes++; if (fault !== 'close-noop') await actualClose(); };
    } catch (error) { observationFailure = { error }; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_NATIVE_OR_PROVIDER_CHILD_ALLOWED'); }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(originals.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removed.push(path.resolve(String(file)));
    return Reflect.apply(originals.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = isSelected(file, new Error().stack) && flags === 'r';
    const handle = await Reflect.apply(originals.open, fs, [file, flags, ...args]);
    if (selected) { reads++; await bind(handle, file); }
    return handle;
  }));
  let result, failure;
  try {
    try {
      result = await f.call('restore', f.target);
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(reader, 'Actual normal pack JSON reader was reached.');
    assert.equal(reads, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const fdState = nativeProbe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = [...await Promise.all([...preserved].map(async ([file, bytes]) =>
      [file, (await originals.readFile(file)).equals(bytes)]))];
    t.diagnostic(JSON.stringify({ kind: 'MAIN_DIRECT_RESTORE_PACK_READER', mode, fault, reads, closes, launches,
      fdState, stagingExists, stagingCleanupCalls: removed.length, inspected,
      restored: result?.restored === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      originalNonCipherUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      originalCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none: this exact main baseline has no paired/SOURCE owner at these callers' }));
    for (const [file, same] of unchanged) if (file !== path.join(root, files.openMeteoBank) || fault !== 'none') assert.equal(same, true, file);
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    if (fault === 'none') {
      assert.equal(failure, undefined);
      assert.equal(result.restored, true);
      assert.equal(stagingExists, false); assert.equal(removed.length, 1);
    } else {
      assert.equal(result.restored, false); assert.equal(result.code, 'PROGRESS_UNAVAILABLE');
      assert.equal(stagingExists, true, 'Unproved actual reader prevents cleanup of this same parent staging directory.');
      assert.equal(removed.length, 0);
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Teardown happens only after the measured result; never manufacture stop/closure success.
    if (reader && nativeProbe() !== 'CLOSED') await actualClose();
    if (reader) assert.equal(nativeProbe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await originals.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});



for (const mode of ['inspect']) for (const fault of ['read-null-close-error', 'read-zero-close-noop', 'closed-then-zero', 'probe-callback-null', 'probe-proxy-ebadf'])
test('main pack archive first-error and probe / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const originals = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(mode === 'save' ? f.source : f.target);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) {
    preserved.set(file, await originals.readFile(file));
  }
  let armed = true, reader, fd, identity, actualClose, selectedPath, observationFailure;
  let reads = 0, closes = 0, inspected = 0, launches = 0, inputReads = 0, probeCalls = 0, proxyTraps = 0;
  const uncertain = ['read-zero-close-noop', 'probe-callback-null', 'probe-proxy-ebadf'].includes(fault);
  const remainsOpen = ['read-zero-close-noop', 'probe-proxy-ebadf'].includes(fault);
  const originalFstat = native.fstat;
  const temporaries = [], removed = [], hooks = [];
  const nativeProbe = () => {
    try {
      const stat = native.fstatSync(fd);
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
      return 'OPEN_SAME_OBJECT';
    } catch (error) {
      if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED';
      throw error;
    }
  };
  const isSelected = (file, stack) => armed && !reader && typeof file === 'string'
    && stack.includes('at unpackPackWithJsonReadLifetime (') && stack.includes('private-weather-component-pack.mjs')
    && (mode === 'save' ? path.resolve(file) === path.join(root, files.openMeteoBank)
      : temporaries.some(row => path.resolve(file) === path.join(row.folder, '.cache/weather-component-inputs.pack')));
  const bind = async (handle, file) => {
    reader = handle; fd = handle.fd; actualClose = handle.close.bind(handle);
    try {
      selectedPath = await fs.realpath(file); identity = native.fstatSync(fd);
      const stat = await fs.stat(selectedPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      assert.equal(temporaries.length, 1, 'The actual parent created its own private staging directory.');
      if (fault.startsWith('read-')) handle.read = async () => { inputReads++; throw fault === 'read-null-close-error' ? null : 0; };
      handle.close = async () => {
        closes++;
        if (remainsOpen) return;
        await actualClose();
        if (fault === 'closed-then-zero') throw 0;
        if (fault === 'read-null-close-error') throw Error('OWN_SECONDARY_CLOSE_ERROR');
      };
    } catch (error) { observationFailure = { error }; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_NATIVE_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(native.default, 'fstat', (number, callback) => {
    const stack = new Error().stack;
    if (!armed || !reader || number !== fd || !stack.includes('at unpackPackWithJsonReadLifetime (')) return originalFstat(number, callback);
    probeCalls++;
    if (fault === 'probe-callback-null') { callback(null); return; }
    if (fault === 'probe-proxy-ebadf') {
      callback(new Proxy({ code: 'EBADF' }, {
        get(target, key) { proxyTraps++; return Reflect.get(target, key); },
        getOwnPropertyDescriptor(target, key) { proxyTraps++; return Reflect.getOwnPropertyDescriptor(target, key); },
      })); return;
    }
    return originalFstat(number, callback);
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(originals.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removed.push(path.resolve(String(file)));
    return Reflect.apply(originals.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = isSelected(file, new Error().stack) && flags === 'r';
    const handle = await Reflect.apply(originals.open, fs, [file, flags, ...args]);
    if (selected) { reads++; await bind(handle, file); }
    return handle;
  }));
  let result, failure;
  try {
    try {
      result = mode === 'save' ? await f.call('save') : await withAuthenticatedWeatherProgress({
        repositoryRoot: root, basePath: f.targetBase, repository, encryptionKey,
      }, async input => { inspected++; assert.ok(input.files.length); return 'INSPECTED'; });
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(reader, 'Actual normal unpack archive input reader was reached.');
    assert.equal(reads, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const fdState = nativeProbe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = [...await Promise.all([...preserved].map(async ([file, bytes]) =>
      [file, (await originals.readFile(file)).equals(bytes)]))];
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_ARCHIVE_PRIMARY_PROBE', mode, fault, reads, closes, launches,
      fdState, stagingExists, inputReads, probeCalls, proxyTraps, stagingCleanupCalls: removed.length, inspected,
      saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      originalNonCipherUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      originalCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none: this exact main baseline has no paired/SOURCE owner at these callers' }));
    for (const [file, same] of unchanged) if (file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH) || fault !== 'none') assert.equal(same, true, file);
    assert.equal(fdState, remainsOpen ? 'OPEN_SAME_OBJECT' : 'CLOSED');
    assert.equal(probeCalls, 1); assert.equal(proxyTraps, 0);
    assert.ok(failure); assert.equal(inspected, 0);
    if (fault === 'read-null-close-error') { assert.equal(failure.error, null); assert.equal(inputReads, 1); }
    else if (fault === 'read-zero-close-noop' || fault === 'closed-then-zero') assert.equal(failure.error, 0);
    else assert.equal(failure.error.message, 'WEATHER_PACK_ARCHIVE_CLOSE_UNPROVED');
    assert.equal(stagingExists, uncertain);
    assert.equal(removed.length, uncertain ? 0 : 1);
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Teardown happens only after the measured result; never manufacture stop/closure success.
    if (reader && nativeProbe() !== 'CLOSED') await actualClose();
    if (reader) assert.equal(nativeProbe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await originals.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});



for (const mode of ['save']) for (const fault of ['close-noop', 'none'])
test('main create-spec pack JSON lifetime / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const originals = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.source);
  const { buildPrivateRuntimeCreateSpec, PRIVATE_RUNTIME_FILES, PRIVATE_RUNTIME_CONTRACT_FILES } =
    await import('./private-production-runtime-workflow.mjs');
  const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
  const { fileURLToPath } = await import('node:url');
  // Existing workflow fixture shape and exact source-only contract inputs.
  const sourceTree = fileURLToPath(new URL('../', import.meta.url));
  const conditions = { datasetId: 'rr-synthetic-private-workflow', generatedAt: reference, productionReferenceAt: reference,
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => ['z-' + i, {}])),
    coastalParts: { modelBinding: ravScoreModelBinding(),
      parts: Object.fromEntries(Array.from({ length: 673 }, (_, i) => ['p-' + i, {}])) } };
  for (const descriptor of PRIVATE_RUNTIME_FILES) await write(root, descriptor.relativePath,
    descriptor.id === 'full-conditions' ? conditions : 'own-synthetic-' + descriptor.id);
  for (const relative of [...new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())]) {
    await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await fs.copyFile(path.join(sourceTree, relative), path.join(root, relative));
  }
  const priorPack = await buildPrivateWeatherComponentPack({ repositoryRoot: root, conditions });
  const originalPackBytes = await fs.readFile(priorPack.sourcePath);
  const originalPackIdentity = await fs.stat(priorPack.sourcePath);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) {
    preserved.set(file, await originals.readFile(file));
  }
  let armed = true, reader, fd, identity, actualClose, selectedPath, observationFailure;
  let reads = 0, closes = 0, inspected = 0, launches = 0;
  const temporaries = [], removed = [], hooks = [];
  const nativeProbe = () => {
    try {
      const stat = native.fstatSync(fd);
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
      return 'OPEN_SAME_OBJECT';
    } catch (error) {
      if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED';
      throw error;
    }
  };
  const isSelected = (file, stack) => armed && !reader && typeof file === 'string'
    && stack.includes('at readSmallJson (') && stack.includes('private-weather-component-pack.mjs')
    && (mode === 'save' ? path.resolve(file) === path.join(root, files.openMeteoBank)
      : temporaries.some(row => path.resolve(file) === path.join(row.folder, 'verified', files.openMeteoBank)));
  const bind = async (handle, file) => {
    reader = handle; fd = handle.fd; actualClose = handle.close.bind(handle);
    try {
      selectedPath = await fs.realpath(file); identity = native.fstatSync(fd);
      const stat = await fs.stat(selectedPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      assert.equal(temporaries.length, 0, 'This normal spec caller has no creator scratch to acquire or remove.');
      handle.close = async () => { closes++; if (fault !== 'close-noop') await actualClose(); };
    } catch (error) { observationFailure = { error }; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_NATIVE_OR_PROVIDER_CHILD_ALLOWED'); }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(originals.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removed.push(path.resolve(String(file)));
    return Reflect.apply(originals.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = isSelected(file, new Error().stack) && flags === 'r';
    const handle = await Reflect.apply(originals.open, fs, [file, flags, ...args]);
    if (selected) { reads++; await bind(handle, file); }
    return handle;
  }));
  let result, failure;
  try {
    try {
      result = await buildPrivateRuntimeCreateSpec({ repositoryRoot: root });
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(reader, 'Actual normal pack JSON reader was reached.');
    assert.equal(reads, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const fdState = nativeProbe();
    const stagingExists = null;
    assert.deepEqual(await originals.readFile(priorPack.sourcePath), originalPackBytes);
    const unchanged = [...await Promise.all([...preserved].map(async ([file, bytes]) =>
      [file, (await originals.readFile(file)).equals(bytes)]))];
    t.diagnostic(JSON.stringify({ kind: 'MAIN_CREATE_SPEC_PACK_READER', mode, fault, reads, closes, launches,
      fdState, stagingExists, stagingCleanupCalls: removed.length, inspected,
      specReturned: Boolean(result?.metadata), code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      originalNonCipherUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      originalCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none: this exact main baseline has no paired/SOURCE owner at these callers' }));
    for (const [file, same] of unchanged) if (file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH) || fault !== 'none') assert.equal(same, true, file);
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    assert.equal(removed.length, 0);
    if (fault === 'none') {
      assert.equal(failure, undefined);
      assert.equal(result.metadata.zoneCount, 210); assert.equal(result.metadata.partCount, 673);
      assert.equal(result.files.some(row => row.relativePath === '.cache/weather-component-inputs.pack'), true);
    } else {
      assert.equal(result, undefined); assert.equal(failure.error.message, 'WEATHER_PACK_JSON_CLOSE_UNPROVED');
      const current = await fs.stat(priorPack.sourcePath);
      assert.equal(current.dev, originalPackIdentity.dev); assert.equal(current.ino, originalPackIdentity.ino);
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Teardown happens only after the measured result; never manufacture stop/closure success.
    if (reader && nativeProbe() !== 'CLOSED') await actualClose();
    if (reader) assert.equal(nativeProbe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await originals.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});



test('main exact pack invocation keeps uncertain and healthy concurrent lifetimes separate', { timeout: 30_000 }, async t => {
  const { privateWeatherPackJsonReadsClosed } = await import('./lib/private-weather-component-pack.mjs');
  const native = await import('node:fs');
  const first = await fixture(t), second = await fixture(t);
  const selectedPath = await fs.realpath(path.join(first.source, files.openMeteoBank));
  const originalOpen = fs.open;
  let handle, fd, identity, close, closes = 0, observationFailure;
  const hook = t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = !handle && flags === 'r' && new Error().stack.includes('at readSmallJson (')
      && typeof file === 'string' && await fs.realpath(file) === selectedPath;
    const opened = await originalOpen(file, flags, ...args);
    if (selected) {
      handle = opened; fd = opened.fd; close = opened.close.bind(opened);
      try {
        identity = native.fstatSync(fd); const stat = await fs.stat(selectedPath);
        assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
        opened.close = async () => { closes++; };
      } catch (error) { observationFailure = { error }; throw error; }
    }
    return opened;
  });
  try {
    const uncertain = buildPrivateWeatherComponentPack({ repositoryRoot: first.source, conditions: {} });
    const healthy = buildPrivateWeatherComponentPack({ repositoryRoot: second.source, conditions: {} });
    const copied = healthy.then(result => result);
    assert.equal(privateWeatherPackJsonReadsClosed(uncertain), false, 'Pending is never stopped evidence.');
    assert.equal(privateWeatherPackJsonReadsClosed(healthy), false);
    for (const absent of [undefined, null, {}, [], Promise.resolve(), copied]) assert.equal(privateWeatherPackJsonReadsClosed(absent), false);
    const results = await Promise.allSettled([uncertain, healthy, copied]);
    if (observationFailure) throw observationFailure.error;
    assert.equal(results[0].status, 'rejected'); assert.equal(results[0].reason.message, 'WEATHER_PACK_JSON_CLOSE_UNPROVED');
    assert.equal(results[1].status, 'fulfilled'); assert.equal(results[2].status, 'fulfilled');
    assert.equal(privateWeatherPackJsonReadsClosed(uncertain), false);
    assert.equal(privateWeatherPackJsonReadsClosed(healthy), true);
    assert.equal(privateWeatherPackJsonReadsClosed(copied), false);
    assert.equal(privateWeatherPackJsonReadsClosed(results[1].value), false);
    assert.equal(closes, 1);
    const current = native.fstatSync(fd); assert.equal(current.dev, identity.dev); assert.equal(current.ino, identity.ino);
    t.diagnostic(JSON.stringify({ exactHealthy: true, uncertainRemainsFalse: true, copiedRemainsFalse: true,
      unknownPendingFalse: true, ownFdStillOpen: true, closes, ownerClaim: 'none' }));
  } finally {
    hook.mock.restore();
    if (handle) {
      await close();
      assert.throws(() => native.fstatSync(fd), error => Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF');
    }
  }
});

for (const mode of ['inspect']) for (const fault of ['close-noop', 'none'])
test('main unpack destination output physical lifetime / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const originals = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(mode === 'save' ? f.source : f.target);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) {
    preserved.set(file, await originals.readFile(file));
  }
  let armed = true, writer, fd, identity, actualClose, selectedPath, observationFailure;
  let opens = 0, closes = 0, inspected = 0, launches = 0;
  const temporaries = [], removed = [], hooks = [];
  const nativeProbe = () => {
    try {
      const stat = native.fstatSync(fd);
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
      return 'OPEN_SAME_OBJECT';
    } catch (error) {
      if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED';
      throw error;
    }
  };
  const isSelected = (file, stack) => armed && !writer && typeof file === 'string'
    && stack.includes('at unpackPackWithJsonReadLifetime (') && stack.includes('private-weather-component-pack.mjs')
    && (mode === 'save' ? path.resolve(file) === path.join(root, files.openMeteoBank)
      : temporaries.some(row => path.resolve(file) === path.join(row.folder, 'verified', files.openMeteoBank)));
  const bind = async (handle, file) => {
    writer = handle; fd = handle.fd; actualClose = handle.close.bind(handle);
    try {
      selectedPath = await fs.realpath(file); identity = native.fstatSync(fd);
      const stat = await fs.stat(selectedPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      assert.equal(temporaries.length, 1, 'The actual parent created its own private staging directory.');
      handle.close = async () => { closes++; if (fault !== 'close-noop') await actualClose(); };
    } catch (error) { observationFailure = { error }; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_NATIVE_OR_PROVIDER_CHILD_ALLOWED'); }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(originals.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removed.push(path.resolve(String(file)));
    return Reflect.apply(originals.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = isSelected(file, new Error().stack) && flags === 'wx';
    const handle = await Reflect.apply(originals.open, fs, [file, flags, ...args]);
    if (selected) { opens++; await bind(handle, file); }
    return handle;
  }));
  let result, failure;
  try {
    try {
      result = mode === 'save' ? await f.call('save') : await withAuthenticatedWeatherProgress({
        repositoryRoot: root, basePath: f.targetBase, repository, encryptionKey,
      }, async input => { inspected++; assert.ok(input.files.length); return 'INSPECTED'; });
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(writer, 'Actual normal unpack destination output handle was reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const fdState = nativeProbe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = [...await Promise.all([...preserved].map(async ([file, bytes]) =>
      [file, (await originals.readFile(file)).equals(bytes)]))];
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_DESTINATION_OUTPUT_NORMAL_CALLER', mode, fault, opens, closes, launches,
      fdState, stagingExists, stagingCleanupCalls: removed.length, inspected,
      saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      originalNonCipherUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      originalCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none: this exact main baseline has no paired/SOURCE owner at these callers' }));
    for (const [file, same] of unchanged) if (file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH) || fault !== 'none') assert.equal(same, true, file);
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    if (fault === 'none') {
      assert.equal(failure, undefined);
      if (mode === 'save') assert.equal(result.saved, true); else { assert.equal(result, 'INSPECTED'); assert.equal(inspected, 1); }
      assert.equal(stagingExists, false); assert.equal(removed.length, 1);
    } else {
      if (mode === 'save') assert.notEqual(result?.saved, true); else { assert.ok(failure); assert.equal(inspected, 0); }
      assert.equal(stagingExists, true, 'Unproved actual output close prevents cleanup of this same parent staging directory.');
      assert.equal(removed.length, 0);
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Teardown happens only after the measured result; never manufacture stop/closure success.
    if (writer && nativeProbe() !== 'CLOSED') await actualClose();
    if (writer) assert.equal(nativeProbe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await originals.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});


for (const mode of ['inspect']) for (const fault of ['write-null-close-error', 'write-zero-close-noop', 'closed-then-zero', 'probe-callback-null', 'probe-proxy-ebadf'])
test('main unpack destination output primary and probe / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const originals = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(mode === 'save' ? f.source : f.target);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) {
    preserved.set(file, await originals.readFile(file));
  }
  let armed = true, writer, fd, identity, actualClose, selectedPath, observationFailure;
  let opens = 0, closes = 0, inspected = 0, launches = 0, outputWrites = 0, probeCalls = 0, proxyTraps = 0;
  const uncertain = ['write-zero-close-noop', 'probe-callback-null', 'probe-proxy-ebadf'].includes(fault);
  const remainsOpen = ['write-zero-close-noop', 'probe-proxy-ebadf'].includes(fault);
  const originalFstat = native.fstat;
  const temporaries = [], removed = [], hooks = [];
  const nativeProbe = () => {
    try {
      const stat = native.fstatSync(fd);
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
      return 'OPEN_SAME_OBJECT';
    } catch (error) {
      if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED';
      throw error;
    }
  };
  const isSelected = (file, stack) => armed && !writer && typeof file === 'string'
    && stack.includes('at unpackPackWithJsonReadLifetime (') && stack.includes('private-weather-component-pack.mjs')
    && (mode === 'save' ? path.resolve(file) === path.join(root, files.openMeteoBank)
      : temporaries.some(row => path.resolve(file) === path.join(row.folder, 'verified', files.openMeteoBank)));
  const bind = async (handle, file) => {
    writer = handle; fd = handle.fd; actualClose = handle.close.bind(handle);
    try {
      selectedPath = await fs.realpath(file); identity = native.fstatSync(fd);
      const stat = await fs.stat(selectedPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      assert.equal(temporaries.length, 1, 'The actual parent created its own private staging directory.');
      if (fault.startsWith('write-')) handle.writeFile = async () => { outputWrites++; throw fault === 'write-null-close-error' ? null : 0; };
      handle.close = async () => {
        closes++;
        if (remainsOpen) return;
        await actualClose();
        if (fault === 'closed-then-zero') throw 0;
        if (fault === 'write-null-close-error') throw Error('OWN_SECONDARY_CLOSE_ERROR');
      };
    } catch (error) { observationFailure = { error }; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_NATIVE_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(native.default, 'fstat', (number, callback) => {
    const stack = new Error().stack;
    if (!armed || !writer || number !== fd || !stack.includes('at unpackPackWithJsonReadLifetime (')) return originalFstat(number, callback);
    probeCalls++;
    if (fault === 'probe-callback-null') { callback(null); return; }
    if (fault === 'probe-proxy-ebadf') {
      callback(new Proxy({ code: 'EBADF' }, {
        get(target, key) { proxyTraps++; return Reflect.get(target, key); },
        getOwnPropertyDescriptor(target, key) { proxyTraps++; return Reflect.getOwnPropertyDescriptor(target, key); },
      })); return;
    }
    return originalFstat(number, callback);
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(originals.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removed.push(path.resolve(String(file)));
    return Reflect.apply(originals.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const selected = isSelected(file, new Error().stack) && flags === 'wx';
    const handle = await Reflect.apply(originals.open, fs, [file, flags, ...args]);
    if (selected) { opens++; await bind(handle, file); }
    return handle;
  }));
  let result, failure;
  try {
    try {
      result = mode === 'save' ? await f.call('save') : await withAuthenticatedWeatherProgress({
        repositoryRoot: root, basePath: f.targetBase, repository, encryptionKey,
      }, async input => { inspected++; assert.ok(input.files.length); return 'INSPECTED'; });
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(writer, 'Actual normal unpack destination output handle was reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const fdState = nativeProbe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = [...await Promise.all([...preserved].map(async ([file, bytes]) =>
      [file, (await originals.readFile(file)).equals(bytes)]))];
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_DESTINATION_OUTPUT_PRIMARY_PROBE', mode, fault, opens, closes, launches,
      fdState, stagingExists, outputWrites, probeCalls, proxyTraps, stagingCleanupCalls: removed.length, inspected,
      saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      originalNonCipherUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      originalCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none: this exact main baseline has no paired/SOURCE owner at these callers' }));
    for (const [file, same] of unchanged) if (file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH) || fault !== 'none') assert.equal(same, true, file);
    assert.equal(fdState, remainsOpen ? 'OPEN_SAME_OBJECT' : 'CLOSED');
    assert.equal(probeCalls, 1); assert.equal(proxyTraps, 0);
    assert.ok(failure); assert.equal(inspected, 0);
    if (fault === 'write-null-close-error') { assert.equal(failure.error, null); assert.equal(outputWrites, 1); }
    else if (fault === 'write-zero-close-noop' || fault === 'closed-then-zero') assert.equal(failure.error, 0);
    else assert.equal(failure.error.message, 'WEATHER_PACK_OUTPUT_CLOSE_UNPROVED');
    assert.equal(stagingExists, uncertain);
    assert.equal(removed.length, uncertain ? 0 : 1);
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Teardown happens only after the measured result; never manufacture stop/closure success.
    if (writer && nativeProbe() !== 'CLOSED') await actualClose();
    if (writer) assert.equal(nativeProbe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await originals.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const mode of ['copy', 'inspect']) for (const fault of ['close-noop', 'none'])
test('main pack caller stream physical lifetime / ' + mode + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = (await import('node:fs')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const original = { createReadStream: native.createReadStream, close: native.close,
    fstatSync: native.fstatSync, statSync: native.statSync, realpathSync: native.realpathSync,
    readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(mode === 'inspect' ? f.target : f.source);
  const selectedFile = path.join(root, files.openMeteoBank);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    selectedFile, path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) preserved.set(file, await original.readFile(file));
  const temporaries = [], removals = [], hooks = [];
  let stream, fd, identity, observationFailure, armed = true;
  let opens = 0, closes = 0, closeEvents = 0, launches = 0, inspected = 0;
  const probe = () => {
    try { const stat = original.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(native, 'createReadStream', (...args) => {
    const stack = new Error().stack;
    const selected = armed && !stream && typeof args[0] === 'string'
      && (mode === 'inspect'
        ? temporaries.some(row => path.resolve(args[0]) === path.join(row.folder, 'verified', files.openMeteoBank))
          && stack.includes('at digestFile (')
        : path.resolve(args[0]) === selectedFile && !stack.includes('at digestFile (')
          && stack.includes('at buildPackWithJsonReadLifetime ('));
    const created = Reflect.apply(original.createReadStream, native, args);
    if (selected) {
      stream = created;
      created.once('open', number => {
        opens++; fd = number;
        try {
          assert.equal(created.fd, fd);
          assert.equal(original.realpathSync(args[0]), mode === 'inspect'
            ? path.join(temporaries[0].folder, 'verified', files.openMeteoBank) : selectedFile);
          identity = original.fstatSync(fd); const stat = original.statSync(args[0]);
          assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
        } catch (error) { observationFailure = { error }; }
      });
      created.once('close', () => { closeEvents++; });
    }
    return created;
  }));
  hooks.push(t.mock.method(native, 'close', (number, callback) => {
    if (!armed || !stream || number !== fd || stream.fd !== fd) return Reflect.apply(original.close, native, [number, callback]);
    closes++;
    try { assert.equal(probe(), 'OPEN_SAME_OBJECT'); }
    catch (error) { observationFailure = { error }; return Reflect.apply(original.close, native, [number, callback]); }
    if (fault === 'close-noop') { callback(null); return; }
    return Reflect.apply(original.close, native, [number, callback]);
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removals.push(String(file));
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  let result, failure;
  try {
    try {
      result = mode === 'inspect' ? await withAuthenticatedWeatherProgress({ repositoryRoot: root,
        basePath: f.targetBase, repository, encryptionKey }, async input => {
          inspected++; assert.equal(input.verifiedRoot, path.join(temporaries[0].folder, 'verified'));
          for (const row of input.files) assert.equal(crypto.createHash('sha256')
            .update(await original.readFile(row.sourcePath)).digest('hex'), row.sha256);
          return { inspected: true };
        }) : await f.call('save');
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(stream, 'Actual normal selected copy/inspect ReadStream reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    assert.equal(closeEvents, 1, 'Logical close alone is explicitly not the physical proof.');
    assert.equal(temporaries.length, 1);
    const fdState = probe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = await Promise.all([...preserved].map(async ([file, bytes]) => [file, (await original.readFile(file)).equals(bytes)]));
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_CALLER_STREAM_LIFETIME', mode, fault, inspected, opens, closes, closeEvents, launches,
      fdState, stagingExists, stagingCleanupCalls: removals.length, saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      nonCipherOriginalsUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      previousCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none; exact invocation retention is not an exclusive global writer lock' }));
    for (const [file, same] of unchanged) if (mode === 'inspect' || fault !== 'none' || file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)) assert.equal(same, true, file);
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    if (fault === 'none') {
      assert.equal(failure, undefined);
      assert.equal(mode === 'inspect' ? result.inspected : result.saved, true);
      assert.equal(inspected, mode === 'inspect' ? 1 : 0);
      assert.equal(stagingExists, false); assert.equal(removals.length, 1);
    } else {
      if (mode === 'inspect') assert.equal(failure?.error?.message, 'WEATHER_PACK_STREAM_CLOSE_UNPROVED');
      else { assert.equal(failure, undefined); assert.notEqual(result?.saved, true); }
      assert.equal(inspected, 0);
      assert.equal(stagingExists, true); assert.equal(removals.length, 0);
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Real cleanup only after measuring the normal result and own physical fd.
    if (Number.isInteger(fd) && probe() !== 'CLOSED') await new Promise((resolve, reject) => original.close(fd, error => error ? reject(error) : resolve()));
    if (Number.isInteger(fd)) assert.equal(probe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const fault of ['digest-null-close-error', 'digest-zero-close-noop', 'closed-then-error',
  'probe-null', 'probe-proxy', 'read-error-close-noop'])
test('main pack stream first error and probe / ' + fault, { timeout: 30_000 }, async t => {
  const mode = 'inspect';
  const native = (await import('node:fs')).default;
  const primary = new Error('OWN_STREAM_READ_FIRST');
  const secondary = new Error('OWN_STREAM_CLOSE_SECONDARY');
  const rawFirst = fault.startsWith('digest-null') ? null : fault.startsWith('digest-zero') ? 0 : primary;
  const unknown = ['digest-zero-close-noop', 'probe-null', 'probe-proxy', 'read-error-close-noop'].includes(fault);
  let injected = 0, probes = 0, traps = 0;
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const original = { createReadStream: native.createReadStream, close: native.close, read: native.read,
    fstat: native.fstat, createHash: crypto.createHash,
    fstatSync: native.fstatSync, statSync: native.statSync, realpathSync: native.realpathSync,
    readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(mode === 'inspect' ? f.target : f.source);
  const selectedFile = path.join(root, files.openMeteoBank);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    selectedFile, path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) preserved.set(file, await original.readFile(file));
  const temporaries = [], removals = [], hooks = [];
  let stream, fd, identity, observationFailure, armed = true;
  let opens = 0, closes = 0, closeEvents = 0, launches = 0, inspected = 0;
  const probe = () => {
    try { const stat = original.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(native, 'createReadStream', (...args) => {
    const stack = new Error().stack;
    const selected = armed && !stream && typeof args[0] === 'string'
      && (mode === 'inspect'
        ? temporaries.some(row => path.resolve(args[0]) === path.join(row.folder, 'verified', files.openMeteoBank))
          && stack.includes('at digestFile (')
        : path.resolve(args[0]) === selectedFile && !stack.includes('at digestFile (')
          && stack.includes('at buildPackWithJsonReadLifetime ('));
    const created = Reflect.apply(original.createReadStream, native, args);
    if (selected) {
      stream = created;
      created.once('open', number => {
        opens++; fd = number;
        try {
          assert.equal(created.fd, fd);
          assert.equal(original.realpathSync(args[0]), mode === 'inspect'
            ? path.join(temporaries[0].folder, 'verified', files.openMeteoBank) : selectedFile);
          identity = original.fstatSync(fd); const stat = original.statSync(args[0]);
          assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
        } catch (error) { observationFailure = { error }; }
      });
      created.once('close', () => { closeEvents++; });
    }
    return created;
  }));
  hooks.push(t.mock.method(native, 'close', (number, callback) => {
    if (!armed || !stream || number !== fd || stream.fd !== fd) return Reflect.apply(original.close, native, [number, callback]);
    closes++;
    try { assert.equal(probe(), 'OPEN_SAME_OBJECT'); }
    catch (error) { observationFailure = { error }; return Reflect.apply(original.close, native, [number, callback]); }
    if (fault.endsWith('close-noop')) { callback(null); return; }
    return Reflect.apply(original.close, native, [number, error => {
      assert.equal(error, null);
      callback(fault.endsWith('close-error') || fault === 'closed-then-error' ? secondary : null);
    }]);
  }));
  hooks.push(t.mock.method(native, 'read', (...args) => {
    if (!armed || fault !== 'read-error-close-noop' || !stream || args[0] !== fd || stream.fd !== fd)
      return Reflect.apply(original.read, native, args);
    const callback = args.at(-1); injected++;
    assert.equal(probe(), 'OPEN_SAME_OBJECT');
    return Reflect.apply(original.read, native, [...args.slice(0, -1), (error, bytes, buffer) => {
      assert.equal(error, null); callback(primary, bytes, buffer);
    }]);
  }));
  hooks.push(t.mock.method(crypto, 'createHash', (...args) => {
    const hash = Reflect.apply(original.createHash, crypto, args), update = hash.update.bind(hash);
    hash.update = (...values) => {
      if (armed && stream && fault.startsWith('digest-') && new Error().stack.includes('at digestFile (')) {
        injected++; assert.equal(probe(), 'OPEN_SAME_OBJECT'); throw rawFirst;
      }
      return update(...values);
    };
    return hash;
  }));
  hooks.push(t.mock.method(native, 'fstat', (number, callback) => {
    if (!armed || !stream || number !== fd || !new Error().stack.includes('at readPackChunks ('))
      return Reflect.apply(original.fstat, native, [number, callback]);
    probes++; assert.equal(closeEvents, 1);
    if (fault === 'probe-null') { callback(null); return; }
    if (fault === 'probe-proxy') {
      callback(new Proxy({ code: 'EBADF' }, { get() { traps++; throw Error('NO_PROXY_GET'); },
        getOwnPropertyDescriptor() { traps++; throw Error('NO_PROXY_DESCRIPTOR'); } })); return;
    }
    return Reflect.apply(original.fstat, native, [number, callback]);
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removals.push(String(file));
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  let result, failure;
  try {
    try {
      result = mode === 'inspect' ? await withAuthenticatedWeatherProgress({ repositoryRoot: root,
        basePath: f.targetBase, repository, encryptionKey }, async input => {
          inspected++; assert.equal(input.verifiedRoot, path.join(temporaries[0].folder, 'verified'));
          for (const row of input.files) assert.equal(crypto.createHash('sha256')
            .update(await original.readFile(row.sourcePath)).digest('hex'), row.sha256);
          return { inspected: true };
        }) : await f.call('save');
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(stream, 'Actual normal selected copy/inspect ReadStream reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    assert.equal(closeEvents, 1, 'Logical close alone is explicitly not the physical proof.');
    assert.equal(temporaries.length, 1);
    const fdState = probe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = await Promise.all([...preserved].map(async ([file, bytes]) => [file, (await original.readFile(file)).equals(bytes)]));
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_STREAM_ERROR_PROBE', mode, fault, inspected, probes, injected, traps, opens, closes, closeEvents, launches,
      fdState, stagingExists, stagingCleanupCalls: removals.length, saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      nonCipherOriginalsUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      previousCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none; exact invocation retention is not an exclusive global writer lock' }));
    for (const [file, same] of unchanged) assert.equal(same, true, file);
    assert.equal(fdState, fault.endsWith('close-noop') ? 'OPEN_SAME_OBJECT' : 'CLOSED');
    assert.ok(failure && Object.hasOwn(failure, 'error'));
    if (fault.startsWith('digest-') || fault === 'read-error-close-noop') {
      assert.equal(injected, 1); assert.strictEqual(failure.error, rawFirst);
    } else if (fault === 'closed-then-error') assert.strictEqual(failure.error, secondary);
    else assert.equal(failure.error.message, 'WEATHER_PACK_STREAM_CLOSE_UNPROVED');
    assert.equal(probes, 1); assert.equal(traps, 0); assert.equal(inspected, 0);
    assert.equal(stagingExists, unknown); assert.equal(removals.length, unknown ? 0 : 1);
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Real cleanup only after measuring the normal result and own physical fd.
    if (Number.isInteger(fd) && probe() !== 'CLOSED') await new Promise((resolve, reject) => original.close(fd, error => error ? reject(error) : resolve()));
    if (Number.isInteger(fd)) assert.equal(probe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const fault of ['close-noop', 'none'])
test('main SAVE pack build output physical lifetime / ' + fault, { timeout: 30_000 }, async t => {
  const native = (await import('node:fs')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const original = { open: fs.open, close: native.close,
    fstatSync: native.fstatSync, statSync: native.statSync, realpathSync: native.realpathSync,
    readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.source), selectedFile = path.join(root, files.openMeteoBank);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    selectedFile, path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) preserved.set(file, await original.readFile(file));
  const temporaries = [], removals = [], hooks = [];
  let writer, fd, identity, actualClose, outputPath, observationFailure, armed = true;
  let opens = 0, closes = 0, launches = 0;
  const probe = () => {
    try { const stat = original.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(fs, 'open', async (...args) => {
    const stack = new Error().stack, opened = await Reflect.apply(original.open, fs, args);
    if (!armed || writer || args[1] !== 'wx' || typeof args[0] !== 'string'
      || !stack.includes('at buildPackWithJsonReadLifetime (')
      || !temporaries.some(row => path.dirname(args[0]) === path.join(row.folder, '.cache')
        && path.basename(args[0]).startsWith('weather-component-inputs.pack.tmp-'))) return opened;
    writer = opened; fd = opened.fd; actualClose = opened.close.bind(opened); opens++;
    try {
      outputPath = await fs.realpath(args[0]);
      identity = original.fstatSync(fd); const stat = await fs.stat(outputPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      opened.close = async () => {
        closes++; assert.equal(probe(), 'OPEN_SAME_OBJECT');
        if (fault !== 'close-noop') await actualClose();
      };
    } catch (error) { observationFailure = { error }; throw error; }
    return opened;
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removals.push(String(file));
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  let result, failure;
  try {
    try { result = await f.call('save'); } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(writer, 'Actual normal SAVE build pack output handle reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    assert.equal(temporaries.length, 1);
    const fdState = probe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = await Promise.all([...preserved].map(async ([file, bytes]) => [file, (await original.readFile(file)).equals(bytes)]));
    t.diagnostic(JSON.stringify({ kind: 'MAIN_SAVE_PACK_BUILD_OUTPUT_LIFETIME', fault, opens, closes, launches,
      fdState, stagingExists, stagingCleanupCalls: removals.length, saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      nonCipherOriginalsUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      previousCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none; exact invocation retention is not an exclusive global writer lock' }));
    for (const [file, same] of unchanged) if (fault !== 'none' || file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)) assert.equal(same, true, file);
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    assert.equal(failure, undefined);
    if (fault === 'none') {
      assert.equal(result.saved, true); assert.equal(stagingExists, false); assert.equal(removals.length, 1);
    } else {
      assert.notEqual(result?.saved, true);
      assert.equal(stagingExists, true); assert.equal(removals.length, 0);
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Real cleanup only after measuring the normal result and own physical fd.
    if (Number.isInteger(fd) && probe() !== 'CLOSED') await actualClose();
    if (Number.isInteger(fd)) assert.equal(probe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const fault of ['sync-null-close-error', 'sync-zero-close-noop', 'closed-then-error', 'probe-null-open'])
test('main pack build output raw first error / ' + fault, { timeout: 30_000 }, async t => {
  const native = (await import('node:fs')).default;
  const { privateWeatherPackJsonReadsClosed } = await import('./lib/private-weather-component-pack.mjs');
  const primary = fault === 'sync-null-close-error' ? null : 0;
  const secondary = new Error('OWN_PACK_BUILD_CLOSE_SECONDARY');
  const unknown = fault === 'sync-zero-close-noop' || fault === 'probe-null-open';
  let probes = 0, syncs = 0;
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const original = { open: fs.open, close: native.close, fstat: native.fstat,
    fstatSync: native.fstatSync, statSync: native.statSync, realpathSync: native.realpathSync,
    readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.source), selectedFile = path.join(root, files.openMeteoBank);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    selectedFile, path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) preserved.set(file, await original.readFile(file));
  const temporaries = [], removals = [], hooks = [];
  let writer, fd, identity, actualClose, outputPath, observationFailure, armed = true;
  let opens = 0, closes = 0, launches = 0;
  const probe = () => {
    try { const stat = original.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(fs, 'open', async (...args) => {
    const stack = new Error().stack, opened = await Reflect.apply(original.open, fs, args);
    if (!armed || writer || args[1] !== 'wx' || typeof args[0] !== 'string'
      || !stack.includes('at buildPackWithJsonReadLifetime (')
      || path.dirname(args[0]) !== path.join(root, '.cache')
      || !path.basename(args[0]).startsWith('weather-component-inputs.pack.tmp-')) return opened;
    writer = opened; fd = opened.fd; actualClose = opened.close.bind(opened); opens++;
    try {
      outputPath = await fs.realpath(args[0]);
      identity = original.fstatSync(fd); const stat = await fs.stat(outputPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      const actualSync = opened.sync.bind(opened);
      opened.sync = async () => { syncs++; if (fault.startsWith('sync-')) throw primary; await actualSync(); };
      opened.close = async () => {
        closes++; assert.equal(probe(), 'OPEN_SAME_OBJECT');
        if (!unknown) await actualClose();
        if (fault === 'sync-null-close-error' || fault === 'closed-then-error') throw secondary;
      };
    } catch (error) { observationFailure = { error }; throw error; }
    return opened;
  }));
  hooks.push(t.mock.method(native, 'fstat', (number, callback) => {
    if (!armed || !writer || number !== fd || !new Error().stack.includes('at closeOutput ('))
      return Reflect.apply(original.fstat, native, [number, callback]);
    probes++;
    if (fault === 'probe-null-open') { callback(null); return; }
    return Reflect.apply(original.fstat, native, [number, callback]);
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removals.push(String(file));
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  let result, failure, invocation;
  try {
    try {
      invocation = buildPrivateWeatherComponentPack({ repositoryRoot: root, conditions: {}, includeOperationalProgress: true });
      result = await invocation;
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(writer, 'Actual normal SAVE build pack output handle reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    assert.equal(temporaries.length, 0, 'Normal pack entry does not create a separate parent workspace.');
    const fdState = probe();
    const stagingExists = await fs.stat(outputPath).then(stat => {
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = await Promise.all([...preserved].map(async ([file, bytes]) => [file, (await original.readFile(file)).equals(bytes)]));
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_BUILD_OUTPUT_RAW_FIRST', fault, opens, closes, launches, probes, syncs,
      trackedClosed: privateWeatherPackJsonReadsClosed(invocation),
      fdState, stagingExists, stagingCleanupCalls: removals.length, saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      nonCipherOriginalsUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      previousCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none; exact invocation retention is not an exclusive global writer lock' }));
    for (const [file, same] of unchanged) assert.equal(same, true, file);
    assert.equal(fdState, unknown ? 'OPEN_SAME_OBJECT' : 'CLOSED');
    assert.ok(failure && Object.hasOwn(failure, 'error'));
    if (fault.startsWith('sync-')) assert.strictEqual(failure.error, primary);
    else if (fault === 'closed-then-error') assert.strictEqual(failure.error, secondary);
    else assert.equal(failure.error.message, 'WEATHER_PACK_BUILD_OUTPUT_CLOSE_UNPROVED');
    assert.equal(probes, 1); assert.equal(syncs, 1);
    assert.equal(privateWeatherPackJsonReadsClosed(invocation), !unknown);
    assert.equal(stagingExists, unknown);
    await assert.rejects(fs.stat(path.join(root, '.cache/weather-component-inputs.pack')), { code: 'ENOENT' });
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Real cleanup only after measuring the normal result and own physical fd.
    if (Number.isInteger(fd) && probe() !== 'CLOSED') await actualClose();
    if (Number.isInteger(fd)) assert.equal(probe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const fault of ['close-then-replacement-error'])
test('main SAVE pack build output replacement safety / ' + fault, { timeout: 30_000 }, async t => {
  const native = (await import('node:fs')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const original = { open: fs.open, close: native.close, unlink: fs.unlink, rename: fs.rename, writeFile: fs.writeFile,
    fstatSync: native.fstatSync, statSync: native.statSync, realpathSync: native.realpathSync,
    readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.source), selectedFile = path.join(root, files.openMeteoBank);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    selectedFile, path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) preserved.set(file, await original.readFile(file));
  const temporaries = [], removals = [], hooks = [];
  let writer, fd, identity, actualClose, outputPath, observationFailure, armed = true;
  let opens = 0, closes = 0, launches = 0;
  let movedPath, movedIdentity, replacementIdentity, movedBytes;
  const unlinks = [];
  const probe = () => {
    try { const stat = original.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(fs, 'open', async (...args) => {
    const stack = new Error().stack, opened = await Reflect.apply(original.open, fs, args);
    if (!armed || writer || args[1] !== 'wx' || typeof args[0] !== 'string'
      || !stack.includes('at buildPackWithJsonReadLifetime (')
      || !temporaries.some(row => path.dirname(args[0]) === path.join(row.folder, '.cache')
        && path.basename(args[0]).startsWith('weather-component-inputs.pack.tmp-'))) return opened;
    writer = opened; fd = opened.fd; actualClose = opened.close.bind(opened); opens++;
    try {
      outputPath = await fs.realpath(args[0]);
      identity = original.fstatSync(fd); const stat = await fs.stat(outputPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      opened.close = async () => {
        closes++; assert.equal(probe(), 'OPEN_SAME_OBJECT');
        movedBytes = await original.readFile(outputPath);
        await actualClose();
        movedPath = outputPath + '.own-synthetic-moved';
        await original.rename(outputPath, movedPath);
        movedIdentity = await fs.stat(movedPath);
        assert.equal(movedIdentity.dev, identity.dev); assert.equal(movedIdentity.ino, identity.ino);
        await original.writeFile(outputPath, 'OWN_SYNTHETIC_REPLACEMENT_MUST_SURVIVE', { flag: 'wx' });
        replacementIdentity = await fs.stat(outputPath);
        assert.notEqual(replacementIdentity.ino, identity.ino);
        throw new Error('OWN_CLOSE_AFTER_ACTUAL_STAGE_REPLACEMENT');
      };
    } catch (error) { observationFailure = { error }; throw error; }
    return opened;
  }));
  hooks.push(t.mock.method(fs, 'unlink', async (file, ...args) => {
    if (armed && outputPath && path.resolve(String(file)) === outputPath) unlinks.push(String(file));
    return Reflect.apply(original.unlink, fs, [file, ...args]);
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removals.push(String(file));
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  let result, failure;
  try {
    try { result = await f.call('save'); } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(writer, 'Actual normal SAVE build pack output handle reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    assert.equal(temporaries.length, 1);
    const fdState = probe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const replacementExists = await fs.stat(outputPath).then(stat => {
      assert.equal(stat.dev, replacementIdentity.dev); assert.equal(stat.ino, replacementIdentity.ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const movedExists = await fs.stat(movedPath).then(stat => {
      assert.equal(stat.dev, movedIdentity.dev); assert.equal(stat.ino, movedIdentity.ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = await Promise.all([...preserved].map(async ([file, bytes]) => [file, (await original.readFile(file)).equals(bytes)]));
    t.diagnostic(JSON.stringify({ kind: 'MAIN_SAVE_PACK_BUILD_OUTPUT_REPLACEMENT', fault, opens, closes, launches,
      replacementExists, movedExists, replacementUnlinks: unlinks.length,
      fdState, stagingExists, stagingCleanupCalls: removals.length, saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      nonCipherOriginalsUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      previousCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none; exact invocation retention is not an exclusive global writer lock' }));
    for (const [file, same] of unchanged) if (fault !== 'none' || file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)) assert.equal(same, true, file);
    assert.equal(fdState, 'CLOSED'); assert.equal(failure, undefined);
    assert.notEqual(result?.saved, true);
    assert.equal(stagingExists, true, 'Closed fd does not authorize deleting unknown replacement/staging.');
    assert.equal(removals.length, 0); assert.equal(unlinks.length, 0);
    assert.equal(replacementExists, true); assert.equal(movedExists, true);
    assert.deepEqual(await original.readFile(movedPath), movedBytes);
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Real cleanup only after measuring the normal result and own physical fd.
    if (Number.isInteger(fd) && probe() !== 'CLOSED') await actualClose();
    if (Number.isInteger(fd)) assert.equal(probe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const fault of ['closed-error', 'cleanup-noop', 'cleanup-then-error', 'stage-absent',
  'stage-stat-error', 'rename-noop', 'rename-copy', 'rename-then-error', 'post-rename-stat-error'])
test('main SAVE pack own identity publication / ' + fault, { timeout: 30_000 }, async t => {
  const native = (await import('node:fs')).default;
  const primary = new Error('OWN_FIRST_BUILD_FAILURE');
  const held = !['closed-error', 'cleanup-then-error', 'rename-then-error'].includes(fault);
  let unlinks = 0, renames = 0, statFaults = 0, publishedPath, movedPath, publishedOwnIdentity = false;
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const original = { open: fs.open, close: native.close, unlink: fs.unlink, rename: fs.rename,
    lstat: fs.lstat, copyFile: fs.copyFile,
    fstatSync: native.fstatSync, statSync: native.statSync, realpathSync: native.realpathSync,
    readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.source), selectedFile = path.join(root, files.openMeteoBank);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    selectedFile, path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) preserved.set(file, await original.readFile(file));
  const temporaries = [], removals = [], hooks = [];
  let writer, fd, identity, actualClose, outputPath, observationFailure, armed = true;
  let opens = 0, closes = 0, launches = 0;
  const probe = () => {
    try { const stat = original.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(fs, 'open', async (...args) => {
    const stack = new Error().stack, opened = await Reflect.apply(original.open, fs, args);
    if (!armed || writer || args[1] !== 'wx' || typeof args[0] !== 'string'
      || !stack.includes('at buildPackWithJsonReadLifetime (')
      || !temporaries.some(row => path.dirname(args[0]) === path.join(row.folder, '.cache')
        && path.basename(args[0]).startsWith('weather-component-inputs.pack.tmp-'))) return opened;
    writer = opened; fd = opened.fd; actualClose = opened.close.bind(opened); opens++;
    try {
      outputPath = await fs.realpath(args[0]);
      identity = original.fstatSync(fd); const stat = await fs.stat(outputPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      const actualSync = opened.sync.bind(opened);
      opened.sync = async () => {
        if (fault.startsWith('cleanup-')) throw primary;
        return actualSync();
      };
      opened.close = async () => {
        closes++; assert.equal(probe(), 'OPEN_SAME_OBJECT'); await actualClose();
        if (fault === 'stage-absent') {
          movedPath = outputPath + '.own-synthetic-moved';
          await original.rename(outputPath, movedPath);
          const stat = await fs.stat(movedPath);
          assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
        }
        if (fault === 'closed-error') throw primary;
      };
    } catch (error) { observationFailure = { error }; throw error; }
    return opened;
  }));
  hooks.push(t.mock.method(fs, 'lstat', async (file, ...args) => {
    if (armed && writer && path.resolve(String(file)) === outputPath
      && (fault === 'stage-stat-error' || fault === 'post-rename-stat-error' && renames === 1)) {
      statFaults++; throw Object.assign(new Error('OWN_STAT_UNKNOWN'), { code: 'EACCES' });
    }
    return Reflect.apply(original.lstat, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'unlink', async (file, ...args) => {
    if (!armed || !writer || path.resolve(String(file)) !== outputPath)
      return Reflect.apply(original.unlink, fs, [file, ...args]);
    unlinks++;
    if (fault === 'cleanup-noop') return;
    const result = await Reflect.apply(original.unlink, fs, [file, ...args]);
    if (fault === 'cleanup-then-error') throw new Error('OWN_UNLINK_AFTER_ABSENCE');
    return result;
  }));
  hooks.push(t.mock.method(fs, 'rename', async (from, to, ...args) => {
    if (!armed || !writer || path.resolve(String(from)) !== outputPath)
      return Reflect.apply(original.rename, fs, [from, to, ...args]);
    renames++; publishedPath = path.resolve(String(to));
    assert.equal(path.dirname(publishedPath), path.dirname(outputPath));
    assert.equal(path.basename(publishedPath), 'weather-component-inputs.pack');
    if (fault === 'rename-noop') return;
    if (fault === 'rename-copy') { await original.copyFile(from, to); return; }
    const result = await Reflect.apply(original.rename, fs, [from, to, ...args]);
    const stat = await fs.stat(publishedPath);
    assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); publishedOwnIdentity = true;
    if (fault === 'rename-then-error') throw primary;
    return result;
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removals.push(String(file));
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  let result, failure;
  try {
    try { result = await f.call('save'); } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(writer, 'Actual normal SAVE build pack output handle reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    assert.equal(temporaries.length, 1);
    const fdState = probe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = await Promise.all([...preserved].map(async ([file, bytes]) => [file, (await original.readFile(file)).equals(bytes)]));
    t.diagnostic(JSON.stringify({ kind: 'MAIN_SAVE_PACK_OWN_IDENTITY_PUBLICATION', fault, opens, closes, launches,
      unlinks, renames, statFaults, publishedOwnIdentity,
      fdState, stagingExists, stagingCleanupCalls: removals.length, saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      nonCipherOriginalsUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      previousCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none; exact invocation retention is not an exclusive global writer lock' }));
    for (const [file, same] of unchanged) if (fault !== 'none' || file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)) assert.equal(same, true, file);
    assert.equal(fdState, 'CLOSED'); assert.equal(failure, undefined); assert.notEqual(result?.saved, true);
    assert.equal(stagingExists, held); assert.equal(removals.length, held ? 0 : 1);
    assert.equal(unlinks, fault.startsWith('cleanup-') || fault === 'closed-error' ? 1 : 0);
    assert.equal(renames, fault.startsWith('rename-') || fault === 'post-rename-stat-error' ? 1 : 0);
    assert.equal(statFaults, fault === 'stage-stat-error' || fault === 'post-rename-stat-error' ? 1 : 0);
    if (movedPath) { const stat = await fs.stat(movedPath); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); }
    if (fault === 'rename-copy') {
      const source = await fs.stat(outputPath), live = await fs.stat(publishedPath);
      assert.equal(source.ino, identity.ino); assert.notEqual(live.ino, identity.ino);
    }
    if (fault === 'post-rename-stat-error') assert.equal((await fs.stat(publishedPath)).ino, identity.ino);
    if (fault === 'cleanup-then-error') await assert.rejects(fs.stat(outputPath), { code: 'ENOENT' });
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Real cleanup only after measuring the normal result and own physical fd.
    if (Number.isInteger(fd) && probe() !== 'CLOSED') await actualClose();
    if (Number.isInteger(fd)) assert.equal(probe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const fault of ['rename-null-completed', 'rename-zero-poststate-unknown'])
test('main pack publication raw first error / ' + fault, { timeout: 30_000 }, async t => {
  const native = (await import('node:fs')).default;
  const { privateWeatherPackJsonReadsClosed } = await import('./lib/private-weather-component-pack.mjs');
  const primary = fault === 'rename-null-completed' ? null : 0;
  const secondary = new Error('OWN_PACK_BUILD_CLOSE_SECONDARY');
  const unknown = fault === 'rename-zero-poststate-unknown';
  let renames = 0, destination, expectedOutput, statFaults = 0;
  let probes = 0, syncs = 0;
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const original = { open: fs.open, close: native.close, fstat: native.fstat,
    rename: fs.rename, lstat: fs.lstat,
    fstatSync: native.fstatSync, statSync: native.statSync, realpathSync: native.realpathSync,
    readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.source), selectedFile = path.join(root, files.openMeteoBank);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    selectedFile, path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) preserved.set(file, await original.readFile(file));
  const temporaries = [], removals = [], hooks = [];
  let writer, fd, identity, actualClose, outputPath, observationFailure, armed = true;
  let opens = 0, closes = 0, launches = 0;
  const probe = () => {
    try { const stat = original.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(fs, 'open', async (...args) => {
    const stack = new Error().stack, opened = await Reflect.apply(original.open, fs, args);
    if (!armed || writer || args[1] !== 'wx' || typeof args[0] !== 'string'
      || !stack.includes('at buildPackWithJsonReadLifetime (')
      || path.dirname(args[0]) !== path.join(root, '.cache')
      || !path.basename(args[0]).startsWith('weather-component-inputs.pack.tmp-')) return opened;
    writer = opened; fd = opened.fd; actualClose = opened.close.bind(opened); opens++;
    try {
      outputPath = await fs.realpath(args[0]);
      identity = original.fstatSync(fd); const stat = await fs.stat(outputPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      const actualSync = opened.sync.bind(opened);
      opened.sync = async () => { syncs++; await actualSync(); };
      opened.close = async () => {
        closes++; assert.equal(probe(), 'OPEN_SAME_OBJECT');
        await actualClose();
      };
    } catch (error) { observationFailure = { error }; throw error; }
    return opened;
  }));
  hooks.push(t.mock.method(native, 'fstat', (number, callback) => {
    if (!armed || !writer || number !== fd || !new Error().stack.includes('at closeOutput ('))
      return Reflect.apply(original.fstat, native, [number, callback]);
    probes++;
    if (fault === 'probe-null-open') { callback(null); return; }
    return Reflect.apply(original.fstat, native, [number, callback]);
  }));
  hooks.push(t.mock.method(fs, 'rename', async (from, to, ...args) => {
    if (!armed || !writer || path.resolve(String(from)) !== outputPath)
      return Reflect.apply(original.rename, fs, [from, to, ...args]);
    renames++; destination = path.resolve(String(to));
    expectedOutput = await original.readFile(outputPath);
    await Reflect.apply(original.rename, fs, [from, to, ...args]);
    assert.equal((await fs.stat(destination)).ino, identity.ino);
    throw primary;
  }));
  hooks.push(t.mock.method(fs, 'lstat', async (file, ...args) => {
    if (armed && writer && unknown && renames === 1 && path.resolve(String(file)) === outputPath) {
      statFaults++; throw Object.assign(new Error('OWN_POST_RENAME_STAT_UNKNOWN'), { code: 'EACCES' });
    }
    return Reflect.apply(original.lstat, fs, [file, ...args]);
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removals.push(String(file));
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  let result, failure, invocation;
  try {
    try {
      invocation = buildPrivateWeatherComponentPack({ repositoryRoot: root, conditions: {}, includeOperationalProgress: true });
      result = await invocation;
    } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(writer, 'Actual normal SAVE build pack output handle reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    assert.equal(temporaries.length, 0, 'Normal pack entry does not create a separate parent workspace.');
    const fdState = probe();
    const stagingExists = await fs.stat(outputPath).then(stat => {
      assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = await Promise.all([...preserved].map(async ([file, bytes]) => [file, (await original.readFile(file)).equals(bytes)]));
    t.diagnostic(JSON.stringify({ kind: 'MAIN_PACK_PUBLICATION_RAW_FIRST', fault, opens, closes, launches, probes, syncs, renames, statFaults,
      trackedClosed: privateWeatherPackJsonReadsClosed(invocation),
      fdState, stagingExists, stagingCleanupCalls: removals.length, saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      nonCipherOriginalsUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      previousCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none; exact invocation retention is not an exclusive global writer lock' }));
    for (const [file, same] of unchanged) assert.equal(same, true, file);
    assert.equal(fdState, 'CLOSED');
    assert.ok(failure && Object.hasOwn(failure, 'error'));
    assert.strictEqual(failure.error, primary);
    assert.equal(probes, 1); assert.equal(syncs, 1);
    assert.equal(privateWeatherPackJsonReadsClosed(invocation), !unknown);
    assert.equal(stagingExists, false); assert.equal(renames, 1); assert.equal(statFaults, unknown ? 1 : 0);
    assert.equal((await fs.stat(destination)).ino, identity.ino);
    assert.deepEqual(await original.readFile(destination), expectedOutput,
      'Actually published own bytes survive the first error; no rollback/delete.');
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Real cleanup only after measuring the normal result and own physical fd.
    if (Number.isInteger(fd) && probe() !== 'CLOSED') await actualClose();
    if (Number.isInteger(fd)) assert.equal(probe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const fault of ['equal-length-payload', 'none'])
test('main SAVE pack exact own output bytes / ' + fault, { timeout: 30_000 }, async t => {
  const native = (await import('node:fs')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const original = { open: fs.open, close: native.close,
    fstatSync: native.fstatSync, statSync: native.statSync, realpathSync: native.realpathSync,
    readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.source), selectedFile = path.join(root, files.openMeteoBank);
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    selectedFile, path.join(root, WEATHER_PROGRESS_CIPHER_PATH)]) preserved.set(file, await original.readFile(file));
  const temporaries = [], removals = [], hooks = [];
  let writer, fd, identity, actualClose, outputPath, observationFailure, armed = true;
  let opens = 0, closes = 0, launches = 0, writes = 0, altered = 0;
  const expectedHash = crypto.createHash('sha256');
  let expectedBytes = 0, actualBytes, actualHash, expectedDigest, inspectCalls = 0, inspectResult, inspectFailure;
  const probe = () => {
    try { const stat = original.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(fs, 'open', async (...args) => {
    const stack = new Error().stack, opened = await Reflect.apply(original.open, fs, args);
    if (!armed || writer || args[1] !== 'wx' || typeof args[0] !== 'string'
      || !stack.includes('at buildPackWithJsonReadLifetime (')
      || !temporaries.some(row => path.dirname(args[0]) === path.join(row.folder, '.cache')
        && path.basename(args[0]).startsWith('weather-component-inputs.pack.tmp-'))) return opened;
    writer = opened; fd = opened.fd; actualClose = opened.close.bind(opened); opens++;
    try {
      outputPath = await fs.realpath(args[0]);
      identity = original.fstatSync(fd); const stat = await fs.stat(outputPath);
      assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
      const actualWrite = opened.writeFile.bind(opened);
      opened.writeFile = async (data, ...rest) => {
        assert.equal(probe(), 'OPEN_SAME_OBJECT');
        assert.ok(Buffer.isBuffer(data), 'Actual builder writes its existing own buffers.');
        writes++; expectedBytes += data.length; expectedHash.update(data);
        if (fault === 'equal-length-payload' && writes === 2) {
          const changed = Buffer.from(data); assert.ok(changed.length > 0);
          changed[0] ^= 1; altered++;
          assert.equal(changed.length, data.length);
          return actualWrite(changed, ...rest);
        }
        return actualWrite(data, ...rest);
      };
      opened.close = async () => {
        closes++; assert.equal(probe(), 'OPEN_SAME_OBJECT');
        const actual = await original.readFile(outputPath), stat = await fs.stat(outputPath);
        assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino);
        actualBytes = actual.length; actualHash = crypto.createHash('sha256').update(actual).digest('hex');
        expectedDigest = expectedHash.digest('hex');
        await actualClose();
      };
    } catch (error) { observationFailure = { error }; throw error; }
    return opened;
  }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && path.basename(folder).startsWith('rr-encrypted-progress-')) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      temporaries.push({ folder: physical, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    if (armed && temporaries.some(row => path.resolve(String(file)) === row.folder)) removals.push(String(file));
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  let result, failure;
  try {
    try { result = await f.call('save'); } catch (error) { failure = { error }; }
    armed = false;
    if (observationFailure) throw observationFailure.error;
    assert.ok(writer, 'Actual normal SAVE build pack output handle reached.');
    assert.equal(opens, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    assert.equal(temporaries.length, 1);
    const fdState = probe();
    const stagingExists = await fs.stat(temporaries[0].folder).then(stat => {
      assert.equal(stat.dev, temporaries[0].dev); assert.equal(stat.ino, temporaries[0].ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    const unchanged = await Promise.all([...preserved].map(async ([file, bytes]) => [file, (await original.readFile(file)).equals(bytes)]));
    try {
      inspectResult = await withAuthenticatedWeatherProgress({
        repositoryRoot: f.source, basePath: f.sourceBase, repository, encryptionKey,
      }, async () => { inspectCalls++; return { inspected: true }; });
    } catch (error) { inspectFailure = { error }; }
    t.diagnostic(JSON.stringify({ kind: 'MAIN_SAVE_PACK_EXACT_OUTPUT_BYTES', fault, opens, closes, launches,
      writes, altered, expectedBytes, actualBytes, exactOutputBytes: actualHash === expectedDigest,
      inspectCalls, inspected: inspectResult?.inspected === true, inspectError: inspectFailure ? String(inspectFailure.error?.message ?? inspectFailure.error) : null,
      fdState, stagingExists, stagingCleanupCalls: removals.length, saved: result?.saved === true, code: result?.code ?? null,
      failure: failure ? String(failure.error?.message ?? failure.error) : null,
      nonCipherOriginalsUnchanged: unchanged.filter(([file]) => file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)).every(([,same]) => same),
      previousCipherUnchanged: unchanged.find(([file]) => file === path.join(root, WEATHER_PROGRESS_CIPHER_PATH))[1],
      ownerClaim: 'none; exact invocation retention is not an exclusive global writer lock' }));
    for (const [file, same] of unchanged) if (fault !== 'none' || file !== path.join(root, WEATHER_PROGRESS_CIPHER_PATH)) assert.equal(same, true, file);
    assert.equal(fdState, 'CLOSED');
    assert.equal(actualBytes, expectedBytes); assert.ok(writes >= 2);
    assert.equal(altered, fault === 'none' ? 0 : 1);
    assert.equal(failure, undefined);
    if (fault === 'none') {
      assert.equal(result.saved, true); assert.equal(stagingExists, false); assert.equal(removals.length, 1);
      assert.equal(actualHash, expectedDigest); assert.equal(inspectCalls, 1); assert.equal(inspectResult.inspected, true);
    } else {
      assert.notEqual(actualHash, expectedDigest);
      assert.notEqual(result?.saved, true, 'Altered own pack bytes must not replace the previous valid encrypted snapshot.');
    }
  } finally {
    armed = false;
    for (const hook of hooks.reverse()) hook.mock.restore();
    syncBuiltinESMExports();
    // Real cleanup only after measuring the normal result and own physical fd.
    if (Number.isInteger(fd) && probe() !== 'CLOSED') await actualClose();
    if (Number.isInteger(fd)) assert.equal(probe(), 'CLOSED');
    for (const row of temporaries) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat) {
        assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
        assert.equal(path.dirname(row.folder), await fs.realpath(os.tmpdir()));
        assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder, { recursive: true, force: true });
      }
    }
  }
});

for (const fault of ['reader-close-noop', 'reader-close-before-error', 'reader-close-after-error',
  'read-null-close-noop', 'read-zero-close-after-error', 'probe-null-open', 'probe-false-open',
  'probe-eacces-open', 'probe-inherited-open', 'probe-accessor-open', 'probe-proxy-open',
  'probe-own-ebadf', 'stage-before-open', 'stage-during-read', 'bytes-during-read',
  'write-noop', 'write-short', 'header-change', 'rename-before-error-existing', 'multichunk'])
test('main pack own byte scan boundary / ' + fault, { timeout: 30_000 }, async t => {
  const native = (await import('node:fs')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const { privateWeatherPackJsonReadsClosed } = await import('./lib/private-weather-component-pack.mjs');
  const childProcess = (await import('node:child_process')).default;
  const original = { open: fs.open, readFile: fs.readFile, writeFile: fs.writeFile, rename: fs.rename,
    lstat: fs.lstat, unlink: fs.unlink, mkdtemp: fs.mkdtemp, rm: fs.rm, fstat: native.fstat, fstatSync: native.fstatSync };
  const f = await fixture(t);
  await f.saveAndTransfer();
  const root = await fs.realpath(f.source), destination = path.join(root, '.cache/weather-component-inputs.pack');
  if (fault === 'multichunk') await write(root, files.fallbackCursor, { padding: 'x'.repeat(2 * 1024 * 1024) });
  if (fault === 'rename-before-error-existing') await original.writeFile(destination, 'own previous synthetic destination');
  const preserved = new Map();
  for (const file of [f.sourceBase, f.targetBase, path.join(root, 'data/live/conditions.json'),
    path.join(root, files.openMeteoBank), path.join(root, files.fallbackCursor),
    path.join(root, WEATHER_PROGRESS_CIPHER_PATH),
    ...(fault === 'rename-before-error-existing' ? [destination] : [])]) preserved.set(file, await original.readFile(file));
  const primary = fault === 'read-null-close-noop' ? null : 0, secondary = new Error('OWN_SCAN_CLOSE_SECONDARY');
  const renameError = new Error('OWN_RENAME_BEFORE_MUTATION');
  const direct = fault.startsWith('read-') || fault === 'reader-close-after-error' || fault === 'rename-before-error-existing';
  const physicalOpen = fault === 'reader-close-noop' || fault === 'reader-close-before-error'
    || fault === 'read-null-close-noop' || /^probe-.*-open$/.test(fault);
  const held = physicalOpen || fault.startsWith('stage-') || fault === 'bytes-during-read';
  const healthy = fault === 'probe-own-ebadf' || fault === 'multichunk';
  const temporaries = [], removals = [], hooks = [];
  let output, reader, outputFd, readerFd, outputIdentity, readerIdentity, stage, moved,
    outputClose, readerClose, outputClosedBeforeReader = false, observerFailure;
  let writes=0, outputCloses=0, readerCloses=0, scans=0, scanProbes=0, traps=0, unlinks=0, renames=0, launches=0, armed=true;
  let maxRead=0, readBytes=0, invocation, result, failure;
  const rawState=(fd,identity)=>{
    try { const stat=original.fstatSync(fd); assert.equal(stat.dev,identity.dev);assert.equal(stat.ino,identity.ino);return 'OPEN_SAME_OBJECT'; }
    catch(error){if(Object.getOwnPropertyDescriptor(error,'code')?.value==='EBADF')return 'CLOSED';throw error;}
  };
  const replaceStage=async()=>{
    moved=stage+'.own-synthetic-moved';await original.rename(stage,moved);
    assert.equal((await fs.stat(moved)).ino,outputIdentity.ino);
    await original.writeFile(stage,Buffer.alloc(Number((await fs.stat(moved)).size),35),{flag:'wx'});
    assert.notEqual((await fs.stat(stage)).ino,outputIdentity.ino);
  };
  hooks.push(t.mock.method(childProcess,'spawn',()=>{launches++;throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED');}));
  hooks.push(t.mock.method(globalThis,'fetch',()=>{throw Error('NO_NETWORK_ALLOWED');}));
  hooks.push(t.mock.method(fs,'open',async(...args)=>{
    const numericRead=armed && output && !reader && typeof args[1]==='number' && path.resolve(String(args[0]))===stage;
    if(numericRead){
      assert.equal(outputCloses,1);
      assert.equal(rawState(outputFd,outputIdentity),'CLOSED');
      outputClosedBeforeReader=true;
      if(fault==='stage-before-open')await replaceStage();
    }
    const stack=new Error().stack,opened=await Reflect.apply(original.open,fs,args);
    if(numericRead){
      reader=opened;readerFd=opened.fd;readerIdentity=original.fstatSync(readerFd);
      assert.equal(readerIdentity.ino,(await fs.stat(stage)).ino);
      readerClose=opened.close.bind(opened);const actualRead=opened.read.bind(opened);
      opened.read=async(buffer,offset,length,position)=>{
        assert.equal(rawState(readerFd,readerIdentity),'OPEN_SAME_OBJECT');
        scans++;maxRead=Math.max(maxRead,length);assert.ok(length>0&&length<=256*1024);assert.equal(position,readBytes);
        if(fault==='read-null-close-noop'||fault==='read-zero-close-after-error')throw primary;
        const answer=await actualRead(buffer,offset,length,position);readBytes+=answer.bytesRead;
        if(scans===1&&fault==='stage-during-read')await replaceStage();
        if(scans===1&&fault==='bytes-during-read'){
          const bytes=await original.readFile(stage);bytes[bytes.length-1]^=1;await original.writeFile(stage,bytes);
          const before=await fs.stat(stage);await fs.utimes(stage,before.atime,new Date(before.mtimeMs+2000));
        }
        return answer;
      };
      opened.close=async()=>{
        readerCloses++;assert.equal(rawState(readerFd,readerIdentity),'OPEN_SAME_OBJECT');
        if(!physicalOpen)await readerClose();
        if(fault==='reader-close-before-error'||fault==='reader-close-after-error'||fault==='read-zero-close-after-error')throw secondary;
      };
      return opened;
    }
    if(!armed||output||args[1]!=='wx'||!stack.includes('at buildPackWithJsonReadLifetime (')
      ||!path.basename(String(args[0])).startsWith('weather-component-inputs.pack.tmp-'))return opened;
    output=opened;outputFd=opened.fd;outputIdentity=original.fstatSync(outputFd);
    stage=await fs.realpath(args[0]);assert.equal(outputIdentity.ino,(await fs.stat(stage)).ino);
    assert.ok(direct?path.dirname(stage)===path.dirname(destination):temporaries.some(r=>path.dirname(stage)===path.join(r.folder,'.cache')));
    outputClose=opened.close.bind(opened);const actualWrite=opened.writeFile.bind(opened);
    opened.writeFile=async(bytes,...rest)=>{
      writes++;
      if(writes===2&&fault==='write-noop')return;
      if(writes===2&&fault==='write-short')return actualWrite(bytes.subarray(0,bytes.length-1),...rest);
      if(writes===1&&fault==='header-change'){const other=Buffer.from(bytes);other[0]^=1;return actualWrite(other,...rest);}
      return actualWrite(bytes,...rest);
    };
    opened.close=async()=>{outputCloses++;await outputClose();assert.equal(rawState(outputFd,outputIdentity),'CLOSED');};
    return opened;
  }));
  hooks.push(t.mock.method(native,'fstat',(fd,callback)=>{
    if(!armed||!reader||fd!==readerFd||!new Error().stack.includes('at verifyOutputBytes ('))
      return Reflect.apply(original.fstat,native,[fd,callback]);
    scanProbes++;
    if(fault==='probe-null-open'){callback(null);return;}
    if(fault==='probe-false-open'){callback(false);return;}
    if(fault==='probe-eacces-open'){callback(Object.assign(Error('OWN_PROBE_UNKNOWN'),{code:'EACCES'}));return;}
    if(fault==='probe-inherited-open'){callback(Object.create({code:'EBADF'}));return;}
    if(fault==='probe-accessor-open'){callback(Object.defineProperty({},'code',{get(){traps++;return 'EBADF';}}));return;}
    if(fault==='probe-proxy-open'){callback(new Proxy({code:'EBADF'},{get(){traps++;return 'EBADF';},getOwnPropertyDescriptor(){traps++;return {value:'EBADF',configurable:true};}}));return;}
    return Reflect.apply(original.fstat,native,[fd,callback]);
  }));
  hooks.push(t.mock.method(fs,'unlink',async(file,...rest)=>{
    if(armed&&output&&path.resolve(String(file))===stage)unlinks++;
    return Reflect.apply(original.unlink,fs,[file,...rest]);
  }));
  hooks.push(t.mock.method(fs,'rename',async(from,to,...rest)=>{
    if(armed&&output&&path.resolve(String(from))===stage){renames++;if(fault==='rename-before-error-existing')throw renameError;}
    return Reflect.apply(original.rename,fs,[from,to,...rest]);
  }));
  hooks.push(t.mock.method(fs,'mkdtemp',async(...args)=>{
    const folder=await Reflect.apply(original.mkdtemp,fs,args);
    if(armed&&path.basename(folder).startsWith('rr-encrypted-progress-')){
      const physical=await fs.realpath(folder),stat=await fs.stat(physical);temporaries.push({folder:physical,dev:stat.dev,ino:stat.ino});
    }return folder;
  }));
  hooks.push(t.mock.method(fs,'rm',async(file,...rest)=>{
    if(armed&&temporaries.some(row=>path.resolve(String(file))===row.folder))removals.push(String(file));
    return Reflect.apply(original.rm,fs,[file,...rest]);
  }));
  syncBuiltinESMExports();
  const started=performance.now();
  try{
    try{
      if(direct){invocation=buildPrivateWeatherComponentPack({repositoryRoot:root,conditions:{},includeOperationalProgress:true});result=await invocation;}
      else result=await f.call('save');
    }catch(error){failure={error};}
    armed=false;
    if(observerFailure)throw observerFailure.error;
    assert.ok(output);assert.equal(outputCloses,1);assert.equal(launches,0);assert.equal(traps,0);
    const short=fault==='write-noop'||fault==='write-short';
    assert.equal(Boolean(reader),!short);
    if(reader){assert.equal(outputClosedBeforeReader,true);assert.equal(readerCloses,1);assert.equal(scanProbes,1);}
    const readerState=reader?rawState(readerFd,readerIdentity):'NOT_OPENED';
    const stageExists=await fs.lstat(stage).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
    const originals=await Promise.all([...preserved].map(async([file,bytes])=>[file,(await original.readFile(file)).equals(bytes)]));
    t.diagnostic(JSON.stringify({kind:'MAIN_PACK_OWN_BYTE_SCAN_BOUNDARY',fault,direct,writes,outputCloses,
      outputClosedBeforeReader,readerCloses,scanProbes,scans,maxRead,readBytes,readerState,stageExists,unlinks,renames,
      saved:result?.saved===true,code:result?.code??null,failure:failure?String(failure.error?.message??failure.error):null,
      trackedClosed:invocation?privateWeatherPackJsonReadsClosed(invocation):null,workspaces:temporaries.length,
      workspaceRemovals:removals.length,traps,launches,elapsedMs:performance.now()-started,
      originalsUnchanged:originals.every(([file,same])=>same||healthy&&file===path.join(root,WEATHER_PROGRESS_CIPHER_PATH)),
      priorCipherUnchanged:originals.find(([file])=>file===path.join(root,WEATHER_PROGRESS_CIPHER_PATH))[1],
      scope:'Own synthetic normal caller only; no global owner, national capacity, or runner-loss claim.'}));
    for(const[file,same]of originals)if(!healthy||file!==path.join(root,WEATHER_PROGRESS_CIPHER_PATH))assert.equal(same,true,file);
    if(reader)assert.equal(readerState,physicalOpen?'OPEN_SAME_OBJECT':'CLOSED');
    assert.equal(stageExists,held);
    if(direct){
      assert.ok(failure&&Object.hasOwn(failure,'error'));
      assert.strictEqual(failure.error,fault==='rename-before-error-existing'?renameError:fault==='reader-close-after-error'?secondary:primary);
      assert.equal(privateWeatherPackJsonReadsClosed(invocation),!held);assert.equal(temporaries.length,0);
    }else{
      assert.equal(failure,undefined);assert.equal(result.saved===true,healthy);
      assert.equal(temporaries.length,1);assert.equal(removals.length,held?0:1);
      if(held)assert.equal((await fs.stat(temporaries[0].folder)).ino,temporaries[0].ino);
    }
    assert.equal(renames,healthy||fault==='rename-before-error-existing'?1:0);
    assert.equal(unlinks,!held&&!healthy?1:0);
    if(moved){assert.equal((await fs.stat(moved)).ino,outputIdentity.ino);assert.notEqual((await fs.stat(stage)).ino,outputIdentity.ino);}
    if(fault==='multichunk'){assert.ok(readBytes>2*1024*1024);assert.ok(scans>8);assert.equal(maxRead,256*1024);}
  }finally{
    armed=false;for(const hook of hooks.reverse())hook.mock.restore();syncBuiltinESMExports();
    if(reader&&rawState(readerFd,readerIdentity)!=='CLOSED')await readerClose();
    if(reader)assert.equal(rawState(readerFd,readerIdentity),'CLOSED');
    if(!reader&&output&&rawState(outputFd,outputIdentity)!=='CLOSED')await outputClose();
    for(const row of temporaries){
      const stat=await fs.stat(row.folder).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
      if(stat){assert.equal(stat.dev,row.dev);assert.equal(stat.ino,row.ino);
        assert.equal(path.dirname(row.folder),await fs.realpath(os.tmpdir()));assert.ok(path.basename(row.folder).startsWith('rr-encrypted-progress-'));
        await original.rm(row.folder,{recursive:true,force:true});}
    }
  }
});

test('normal SAVE CP launch preserves inherited runner tracking without forwarding credentials', async t => {
  const childProcess = (await import('node:child_process')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  for (const trackingPresent of [true, false]) await t.test(trackingPresent ? 'existing runner marker' : 'no marker invented', async st => {
    const f = await fixture(st);
    assert.equal((await f.call('save')).saved, true);
    const cipher = await fs.readFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH));
    const originalBase = await fs.readFile(f.sourceBase);
    const conditions = await fs.readFile(path.join(f.source, 'data/live/conditions.json'));
    // Dispatch-only artificial bank. It is NEVER admitted by a replacement
    // interpreter: the unchanged normal spawn boundary throws before launch.
    await write(f.source, files.copernicusBank, { bankSha256: 'synthetic-dispatch-only' });
    const bankBytes = await fs.readFile(path.join(f.source, files.copernicusBank));
    const root = await fs.realpath(f.source), inheritedEnvironment = process.env;
    const pythonExecutable = inheritedEnvironment.PYTHON ?? 'python';
    const marker = 'github_02660000-0000-4000-8000-000000000001';
    const runtimeKeys = ['PATH', 'TEMP', 'TMP', 'TMPDIR', 'SystemRoot', 'WINDIR',
      'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'LD_LIBRARY_PATH', 'DYLD_LIBRARY_PATH'];
    const ownEnvironment = Object.fromEntries(runtimeKeys.filter(key => typeof inheritedEnvironment[key] === 'string')
      .map(key => [key, inheritedEnvironment[key]]));
    Object.assign(ownEnvironment, { GITHUB_TOKEN: 'synthetic-github-secret',
      SUPABASE_SERVICE_ROLE_KEY: 'synthetic-storage-secret', WEATHER_PROGRESS_MASTER_SECRET: 'synthetic-progress-secret',
      COPERNICUSMARINE_SERVICE_PASSWORD: 'synthetic-provider-secret', PYTHONPATH: 'synthetic-import-injection' });
    if (trackingPresent) ownEnvironment.RUNNER_TRACKING_ID = marker;
    let observed = null, launches = 0, result;
    const spawnMock = st.mock.method(childProcess, 'spawn', (executable, argv, options) => {
      launches++;
      observed = { executable, argv: [...argv], options: { ...options, env: { ...options.env } } };
      throw Object.assign(new Error('SYNTHETIC_LAUNCH_REFUSED'), { code: 'ENOENT' });
    });
    syncBuiltinESMExports();
    try {
      // Do not mutate HOME/TMPDIR or a real parent's marker/credentials. This
      // test process temporarily presents only its explicit synthetic env.
      process.env = ownEnvironment;
      result = await f.call('save', f.source, { pythonExecutable, masterSecret: null });
    } finally {
      process.env = inheritedEnvironment;
      spawnMock.mock.restore();
      syncBuiltinESMExports();
    }
    assert.equal(launches, 1);
    assert.equal(result.saved, false);
    assert.equal(result.status, 'CACHE_MISS');
    assert.equal(result.code, 'PROGRESS_UNAVAILABLE');
    assert.equal(observed.executable, pythonExecutable);
    assert.deepEqual(observed.argv.slice(0, 6), [path.resolve('scripts/run-copernicus-weather-components.py'),
      '--bank', path.join(root, files.copernicusBank), '--cache-directory',
      path.join(root, '.cache/copernicus-components/'), '--storage-inventory']);
    assert.equal(observed.argv.length, 7);
    const scratch = path.dirname(observed.argv[6]);
    assert.equal(path.basename(observed.argv[6]), 'inventory.json');
    assert.ok(path.basename(scratch).startsWith('rr-cp-storage-inventory-'));
    await assert.rejects(fs.lstat(scratch), { code: 'ENOENT' });
    assert.deepEqual(Object.keys(observed.options).sort(), ['env', 'stdio', 'windowsHide']);
    assert.equal(observed.options.windowsHide, true);
    assert.equal(observed.options.stdio, 'ignore');
    assert.equal(observed.options.env.PYTHONUTF8, '1');
    for (const key of ['GITHUB_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'WEATHER_PROGRESS_MASTER_SECRET',
      'COPERNICUSMARINE_SERVICE_PASSWORD', 'PYTHONPATH']) assert.equal(Object.hasOwn(observed.options.env, key), false);
    for (const key of runtimeKeys) assert.equal(observed.options.env[key], ownEnvironment[key]);
    assert.deepEqual(await fs.readFile(f.sourceBase), originalBase);
    assert.deepEqual(await fs.readFile(path.join(f.source, WEATHER_PROGRESS_CIPHER_PATH)), cipher);
    assert.deepEqual(await fs.readFile(path.join(f.source, 'data/live/conditions.json')), conditions);
    assert.deepEqual(await fs.readFile(path.join(f.source, files.copernicusBank)), bankBytes);
    // This is environment propagation, NOT a launched-child/kill/runner-loss
    // receipt. A missing marker must fail even though SAVE safely refused.
    assert.equal(observed.options.env.RUNNER_TRACKING_ID, trackingPresent ? marker : undefined);
    assert.equal(Object.hasOwn(observed.options.env, 'RUNNER_TRACKING_ID'), trackingPresent);
  });
});
