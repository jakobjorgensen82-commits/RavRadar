import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateExactDmiOriginalRestorePlan, validateExactDmiOriginalRestorePreparation }
  from './run-exact-dmi-original-restore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const currentHead = 'b'.repeat(40);
function fixturePlan() {
  const originals = [{ acquiredAt: '2026-10-10T02:01:00.000Z', assetIdentitySha256: 'a'.repeat(64),
    assetSizeBytes: 8, collection: 'dkss_nsbs', contentLengthBytes: 8, contentSha256: 'c'.repeat(64),
    itemCreatedAt: '2026-10-10T02:00:00.000Z', itemId: 'synthetic-old-original',
    itemUpdatedAt: '2026-10-10T02:00:00.000Z', modelRun: '2026-10-10T00:00:00.000Z',
    validTime: '2026-10-10T01:00:00.000Z' }];
  return { schemaVersion: 1, contractId: 'dmi-exact-original-restore-v1', binding: {
    progressSource: '38692413809-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1',
    targetReferenceAt: '2026-10-14T18:00:00.000Z', sourceHead: 'a'.repeat(40), executionHead: currentHead,
    protectedBundleSha256: '1'.repeat(64), protectedDatasetId: 'rr-synthetic-original',
    protectedProductionReferenceAt: '2026-10-10T02:00:00.000Z', protectedGeneratedAt: '2026-10-10T02:01:00.000Z',
    modelBindingSha256: '2'.repeat(64), historyDemandSha256: '3'.repeat(64),
    originalsSha256: sha(canonical(originals)), nonce: '4'.repeat(32),
  }, originals };
}
function bytesOf(plan) { return Buffer.from(canonical(plan) + '\n'); }
function environment(bytes) {
  return { GITHUB_SHA: currentHead, DMI_EXACT_ORIGINAL_PLAN_SHA256: sha(bytes) };
}

test('exact restore process: old source head remains separate from new execution head', () => {
  const bytes = bytesOf(fixturePlan());
  assert.deepEqual(validateExactDmiOriginalRestorePlan(bytes, environment(bytes)), {
    originalCount: 1, planSha256: sha(bytes),
  });
});

test('exact restore process accepts only the two paired known checkpoint scopes', () => {
  const latest = fixturePlan();
  Object.assign(latest.binding, { progressSource: '38768040429-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-38768040429-1',
    targetReferenceAt: '2026-10-15T16:00:00.000Z' });
  for (const plan of [fixturePlan(), latest]) {
    const bytes = bytesOf(plan);
    assert.equal(validateExactDmiOriginalRestorePlan(bytes, environment(bytes)).originalCount, 1);
  }
  for (const [key, value] of [['progressSource', '38692413809-1'],
    ['progressCacheKey', 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1'],
    ['targetReferenceAt', '2026-10-14T18:00:00.000Z'],
    ['progressSource', '38768040429-2'], ['targetReferenceAt', '2026-10-15T17:00:00.000Z']]) {
    const plan = structuredClone(latest); plan.binding[key] = value;
    const bytes = bytesOf(plan);
    assert.throws(() => validateExactDmiOriginalRestorePlan(bytes, environment(bytes)),
      { code: 'DMI_EXACT_ORIGINAL_PLAN_REJECTED' });
  }
});

test('forward-only 390663 restore process accepts its exact tuple and rejects mixed scopes', () => {
  const plan = fixturePlan();
  Object.assign(plan.binding, { progressSource: '39066350748-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-39066350748-1',
    targetReferenceAt: '2026-10-17T20:00:00.000Z' });
  const before = structuredClone(plan), bytes = bytesOf(plan);
  assert.deepEqual(validateExactDmiOriginalRestorePlan(bytes, environment(bytes)), {
    originalCount: 1, planSha256: sha(bytes),
  });
  assert.deepEqual(plan, before, 'scope validation leaves original captures unchanged');
  for (const [key, value] of [['progressSource', '38692413809-1'],
    ['progressCacheKey', 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1'],
    ['targetReferenceAt', '2026-10-14T18:00:00.000Z'],
    ['progressSource', '39066350748-2'], ['targetReferenceAt', '2026-10-17T21:00:00.000Z']]) {
    const changed = structuredClone(plan); changed.binding[key] = value;
    const changedBytes = bytesOf(changed);
    assert.throws(() => validateExactDmiOriginalRestorePlan(changedBytes, environment(changedBytes)),
      { code: 'DMI_EXACT_ORIGINAL_PLAN_REJECTED' });
  }
});

const noOriginals = { DMI_EXACT_ORIGINAL_PREPARATION_STATUS: 'NO_ORIGINAL_RESTORE_REQUIRED',
  DMI_EXACT_ORIGINAL_COUNT: '0', DMI_EXACT_ORIGINAL_PLAN_BYTES: '0', DMI_EXACT_ORIGINAL_PLAN_SHA256: '' };
test('exact restore no-op is a complete strict tuple, never an empty plan or restore receipt', () => {
  assert.equal(validateExactDmiOriginalRestorePreparation(noOriginals), 'NO_ORIGINAL_RESTORE_REQUIRED');
  assert.equal(validateExactDmiOriginalRestorePreparation({}), 'ORIGINAL_PLAN_PREPARED');
  for (const changed of [{ DMI_EXACT_ORIGINAL_COUNT: '1' }, { DMI_EXACT_ORIGINAL_PLAN_BYTES: '1' },
    { DMI_EXACT_ORIGINAL_PLAN_SHA256: 'a'.repeat(64) }, { DMI_EXACT_ORIGINAL_PREPARATION_STATUS: 'RESTORED' },
    { DMI_EXACT_ORIGINAL_COUNT: undefined }]) {
    assert.throws(() => validateExactDmiOriginalRestorePreparation({ ...noOriginals, ...changed }),
      { code: 'DMI_EXACT_ORIGINAL_PREPARATION_REJECTED' });
  }
  assert.equal(validateExactDmiOriginalRestorePreparation({
    DMI_EXACT_ORIGINAL_PREPARATION_STATUS: 'ORIGINAL_PLAN_PREPARED', DMI_EXACT_ORIGINAL_COUNT: '1',
    DMI_EXACT_ORIGINAL_PLAN_BYTES: '2048', DMI_EXACT_ORIGINAL_PLAN_SHA256: 'a'.repeat(64),
  }), 'ORIGINAL_PLAN_PREPARED');
  const env = { ...process.env, ...noOriginals };
  delete env.GITHUB_OUTPUT;
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/run-exact-dmi-original-restore.mjs')],
    { encoding: 'utf8', timeout: 10_000, env });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), { schemaVersion: 1,
    contractId: 'dmi-exact-original-restore-result-v1', status: 'NO_ORIGINAL_RESTORE_REQUIRED',
    originalCount: 0, restorePerformed: false, writerClaimAcquired: false, remoteWrites: false, cacheSaved: false });
  assert.equal(result.stdout.includes('RESTORED'), false);
});

for (const [name, mutate] of [
  ['wrong progress', p => { p.binding.progressSource = '38692413809-2'; }],
  ['wrong cache identity', p => { p.binding.progressCacheKey += '-other'; }],
  ['new target hour', p => { p.binding.targetReferenceAt = '2026-10-15T18:00:00.000Z'; }],
  ['old head substituted as execution', p => { p.binding.executionHead = p.binding.sourceHead; }],
  ['changed originals', p => { p.originals[0].contentLengthBytes++; }],
  ['extra root fields', p => { p.output = '/arbitrary'; }],
  ['empty originals', p => { p.originals = []; p.binding.originalsSha256 = sha('[]'); }],
]) test(`exact restore process rejects ${name} before a child`, () => {
  const plan = fixturePlan(); mutate(plan); const bytes = bytesOf(plan);
  assert.throws(() => validateExactDmiOriginalRestorePlan(bytes, environment(bytes)),
    { code: 'DMI_EXACT_ORIGINAL_PLAN_REJECTED' });
});

test('exact restore process rejects changed bytes and alternate/duplicate JSON', () => {
  const bytes = bytesOf(fixturePlan());
  assert.throws(() => validateExactDmiOriginalRestorePlan(Buffer.concat([bytes, Buffer.from(' ')]), environment(bytes)));
  for (const changed of [Buffer.from(JSON.stringify(fixturePlan(), null, 2)),
    Buffer.from(bytes.toString().replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1'))]) {
    assert.throws(() => validateExactDmiOriginalRestorePlan(changed, environment(changed)),
      { code: 'DMI_EXACT_ORIGINAL_PLAN_REJECTED' });
  }
});

test('exact restore CLI refuses any caller command/path arguments', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/run-exact-dmi-original-restore.mjs'),
    '--command', 'MUST_NOT_RUN'], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_RESTORE_ARGUMENTS_INVALID');
});

const native = process.platform === 'linux' ? test : test.skip;
async function privateFixture(mode) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-exact-restore-process-'));
  await fs.mkdir(path.join(root, 'scripts/lib'), { recursive: true });
  await fs.mkdir(path.join(root, '.cache/dmi-grib'), { recursive: true });
  for (const file of ['scripts/run-exact-dmi-original-restore.mjs', 'scripts/run-dmi-bulk-supervised.py',
    'scripts/lib/weather-acquisition-writer.mjs']) await fs.copyFile(path.join(ROOT, file), path.join(root, file));
  const bytes = bytesOf(fixturePlan());
  await fs.writeFile(path.join(root, '.cache/dmi-grib/.original-recovery-plan.json'), bytes, { flag: 'wx' });
  await fs.writeFile(path.join(root, '.cache/original-BS'), 'unchanged synthetic original\n', { flag: 'wx' });
  await fs.writeFile(path.join(root, '.cache/github-output'), '', { flag: 'wx' });
  const rejected = mode.startsWith('rejected');
  const report = { schemaVersion: 1, contractId: 'dmi-exact-original-restore-result-v1',
    status: rejected ? 'REJECTED' : 'RESTORED',
    code: mode === 'rejected-unknown' ? 'UNKNOWN_MUST_NOT_LEAK' : mode === 'rejected-unclassified'
      ? 'UNCLASSIFIED' : mode === 'rejected-metadata' ? 'DMI_EXACT_ORIGINAL_METADATA_UNAVAILABLE'
        : mode === 'rejected-asset' ? 'DMI_EXACT_ORIGINAL_ASSET_UNAVAILABLE'
          : rejected ? 'DMI_EXACT_ORIGINAL_UNAVAILABLE' : 'EXACT_ORIGINALS_RESTORED',
    originalCount: 1, uniqueAssetCount: 1, downloadedAssetCount: 1, reusedAssetCount: 0,
    downloadedBytes: 8, pruningPerformed: false, replayPerformed: false, scorePerformed: false };
  const source = `import json,os,pathlib,signal,sys,time\n`
    + `assert sys.argv[1:]==['--restore-exact-originals']\n`
    + `assert all(k not in os.environ for k in ['SUPABASE_ACCESS_TOKEN','R2_SECRET_ACCESS_KEY','GITHUB_TOKEN','GITHUB_OUTPUT','DMI_BULK_RAW_DIR','DMI_STAC_ROOT','DMI_BULK_FINALIZE_ONLY'])\n`
    + `assert os.environ.get('DMI_API_KEY')=='synthetic-dmi-key'\n`
    + `pathlib.Path('.cache/producer-ready').write_text('ready')\n`
    + `time.sleep(0.2)\n`
    + (mode === 'unproved' ? `os.kill(os.getppid(),signal.SIGKILL)\n` : '')
    + (mode === 'raw-output' ? `print('PRIVATE_MUST_NOT_LEAK')\n` : '')
    + `print(${JSON.stringify(JSON.stringify(report))},flush=True)\n`
    + `raise SystemExit(${rejected ? 2 : 0})\n`;
  await fs.writeFile(path.join(root, 'scripts/update-dmi-bulk.py'), source, { flag: 'wx' });
  return { root, env: { ...process.env, ...environment(bytes),
    GITHUB_OUTPUT: path.join(root, '.cache/github-output'), DMI_API_KEY: 'synthetic-dmi-key',
    SUPABASE_ACCESS_TOKEN: 'PRIVATE_MUST_NOT_LEAK', R2_SECRET_ACCESS_KEY: 'PRIVATE_MUST_NOT_LEAK',
    GITHUB_TOKEN: 'PRIVATE_MUST_NOT_LEAK', DMI_BULK_RAW_DIR: '/MUST_NOT_USE',
    DMI_STAC_ROOT: 'https://invalid.example', DMI_BULK_FINALIZE_ONLY: 'true' } };
}
async function runFixture(f, during) {
  const child = spawn(process.execPath, [path.join(f.root, 'scripts/run-exact-dmi-original-restore.mjs')],
    { cwd: f.root, env: f.env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = [], err = []; child.stdout.on('data', data => out.push(data)); child.stderr.on('data', data => err.push(data));
  const completed = new Promise((resolve, reject) => {
    child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal,
      stdout: Buffer.concat(out).toString(), stderr: Buffer.concat(err).toString() }));
  });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 10_000);
  try { if (during) await during(); return await completed; }
  finally { clearTimeout(timeout); }
}
async function exists(file) { try { await fs.lstat(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
async function removeFixture(f) {
  assert.equal(path.dirname(f.root), path.resolve(os.tmpdir()));
  assert.ok(path.basename(f.root).startsWith('rr-exact-restore-process-'));
  await fs.rm(f.root, { recursive: true, force: true });
}

native('exact restore native: actual fixed supervisor/producer closes before plan and claim removal', async () => {
  const f = await privateFixture('restored');
  try {
    const result = await runFixture(f, async () => {
      const deadline = Date.now() + 5000;
      while (!await exists(path.join(f.root, '.cache/producer-ready'))) {
        assert.ok(Date.now() < deadline); await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.equal(await exists(path.join(f.root, '.cache/weather-acquisition-writer.claim')), true);
      assert.equal(await exists(path.join(f.root, '.cache/dmi-grib/.original-recovery-plan.json')), true);
    });
    assert.equal(result.signal, null); assert.equal(result.code, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.status, 'RESTORED'); assert.equal(receipt.physicalGroupClosed, true);
    assert.equal(receipt.writerClaimReleased, true); assert.equal(receipt.planRemoved, true);
    assert.equal(receipt.cacheSaved, false);
    assert.equal(await fs.readFile(path.join(f.root, '.cache/github-output'), 'utf8'), 'originals_restored=true\n');
    assert.equal(await exists(path.join(f.root, '.cache/weather-acquisition-writer.claim')), false);
    assert.equal(await exists(path.join(f.root, '.cache/dmi-grib/.original-recovery-plan.json')), false);
    assert.equal(await fs.readFile(path.join(f.root, '.cache/original-BS'), 'utf8'), 'unchanged synthetic original\n');
  } finally { await removeFixture(f); }
});

for (const mode of ['rejected', 'rejected-metadata', 'rejected-asset', 'rejected-unclassified', 'rejected-unknown', 'unproved', 'raw-output']) native(`exact restore native: ${mode} is not a SAVE receipt`, async () => {
  const f = await privateFixture(mode);
  try {
    const result = await runFixture(f);
    assert.equal(result.signal, null); assert.equal(result.code, 1);
    assert.equal(result.stdout, ''); assert.equal(result.stderr.includes('PRIVATE_MUST_NOT_LEAK'), false);
    if (mode === 'rejected') assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_UNAVAILABLE');
    if (mode === 'rejected-metadata') assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_METADATA_UNAVAILABLE');
    if (mode === 'rejected-asset') assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_ASSET_UNAVAILABLE');
    if (mode === 'rejected-unclassified') assert.equal(result.stderr.trim(), 'UNCLASSIFIED');
    if (mode === 'rejected-unknown') {
      assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_RESTORE_OUTPUT_INVALID');
      assert.equal(result.stderr.includes('UNKNOWN_MUST_NOT_LEAK'), false);
    }
    assert.equal(await fs.readFile(path.join(f.root, '.cache/github-output'), 'utf8'), '');
    assert.equal(await exists(path.join(f.root, '.cache/weather-acquisition-writer.claim')),
      !['rejected', 'rejected-metadata', 'rejected-asset', 'rejected-unclassified'].includes(mode));
    assert.equal(await exists(path.join(f.root, '.cache/dmi-grib/.original-recovery-plan.json')), true);
    assert.equal(await fs.readFile(path.join(f.root, '.cache/original-BS'), 'utf8'), 'unchanged synthetic original\n');
  } finally { await removeFixture(f); }
});
