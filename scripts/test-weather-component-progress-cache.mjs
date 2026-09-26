import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { weatherComponentProgressCache, WEATHER_PROGRESS_CIPHER_PATH } from './weather-component-progress-cache.mjs';
import { buildPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES as files } from './lib/private-weather-component-inventory.mjs';
import { mergeOpenMeteoPartBank, buildOpenMeteoPartRequest, readOpenMeteoPartResponse,
  openMeteoMfNearestGridPoint, OPEN_METEO_NATIVE_NEAREST_POLICIES } from './lib/open-meteo-part-bank.mjs';

const execFileAsync = promisify(execFile);
const repository = 'owner/fixture';
const encryptionKey = Buffer.alloc(32, 73).toString('base64');
const protectedBundleSha256 = 'a'.repeat(64);
const reference = '2026-09-19T00:00:00.000Z';
const part = { partId: 'TEST', zoneId: 'ZONE', waterPoint: [10, 56] };
const spatialPolicies = Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature']
  .map(component => [component, { policyId: 'synthetic-exact-cell-only', maximumDistanceKm: 0 }]));
function bank(speed) {
  const responseText = JSON.stringify({ longitude: 10, latitude: 56, utc_offset_seconds: 0,
    hourly: { time: [reference], wind_speed_10m: [speed], wind_direction_10m: [90] },
    hourly_units: { wind_speed_10m: 'm/s', wind_direction_10m: '°' } });
  const admission = readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, {
    component: 'wind', productionReferenceAt: reference }), responseText, acquiredAt: reference }, { part, spatialPolicies });
  return mergeOpenMeteoPartBank(null, [admission], { parts: [part], spatialPolicies,
    retentionStartAt: reference, retentionEndAt: reference });
}
const originalBank = bank(4);
const progressedBank = bank(9);
const baseline = '{"kind":"synthetic protected conditions","state":"never change through progress"}\n';
function nativeTemperatureBank(validTime, value) {
  const grid = openMeteoMfNearestGridPoint(part.waterPoint);
  const responseText = JSON.stringify({ longitude: grid[0], latitude: grid[1], utc_offset_seconds: 0,
    hourly: { time: [validTime], sea_surface_temperature: [value] },
    hourly_units: { sea_surface_temperature: '°C' } });
  const admission = readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, {
    component: 'waterTemperature', productionReferenceAt: reference,
    spatialPolicy: OPEN_METEO_NATIVE_NEAREST_POLICIES.waterTemperature,
  }), responseText, acquiredAt: reference }, { part, spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES });
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

test('authenticated progress and protected production bank retain both distinct valid hours', async t => {
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
  const previousBank = nativeTemperatureBank(reference, 15);
  const nextHour = new Date(Date.parse(reference) + 3600000).toISOString();
  const progressBank = nativeTemperatureBank(nextHour, 16);
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
    basePath: targetBase, repository, encryptionKey, productionReferenceAt: reference });
  assert.equal(restored.restored, true, JSON.stringify(restored));
  assert.equal(restored.protectedOpenMeteoRecordsRecovered, 1);
  const finalBank = JSON.parse(await fs.readFile(path.join(target, files.openMeteoBank), 'utf8'));
  assert.deepEqual(finalBank.records.map(row => row.validTime), [reference, nextHour]);
  assert.deepEqual(await fs.readFile(path.join(target, '.cache/weather-component-inputs.pack')), protectedPack);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, 'data/live/conditions.json'), 'utf8')), conditions);
  await fs.appendFile(path.join(target, '.cache/weather-component-inputs.pack'), 'corrupt');
  const rejected = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: target,
    basePath: targetBase, repository, encryptionKey, productionReferenceAt: reference });
  assert.equal(rejected.status, 'RESTORE_REPAIR_REQUIRED');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.openMeteoBank), 'utf8')), finalBank);
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

test('missing key, absent snapshot, invalid original pack and unsafe destination remain bounded misses', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('restore', f.target)).code, 'SNAPSHOT_ABSENT');
  assert.equal((await f.call('save', f.source, { encryptionKey: '' })).code, 'ENCRYPTION_KEY_UNAVAILABLE');
  assert.equal((await f.call('save', f.source, { encryptionKey: 'invalid' })).code, 'ENCRYPTION_KEY_INVALID');
  await write(f.source, files.openMeteoBank, { invalid: true });
  assert.equal((await f.call('save')).saved, false);
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
    basePath: targetBase, repository, encryptionKey, productionReferenceAt: reference, pythonExecutable });
  assert.equal(restored.restored, true, JSON.stringify(restored));
  assert.equal(restored.protectedCopernicusBankMerged, true);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, files.copernicusBank), 'utf8')).records,
    cpBank.records);
  assert.deepEqual(await fs.readFile(path.join(target, '.cache/weather-component-inputs.pack')), protectedPack);
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
