#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withFrozenI71Source } from './check-native-identity-frozen-i71-source.mjs';

const ROOTS = Object.freeze([
  'scripts/protected-private-production-runtime.mjs',
  'scripts/private-production-runtime-bundle.mjs',
  'scripts/protected-ravscore-continuation-checkpoint.mjs',
  'scripts/lib/bounded-conditions-predecessor-transition.mjs',
  'scripts/current-grid-binding-prewrite.mjs',
  'scripts/audit-saved-weather-inputs.mjs',
  'scripts/weather-component-progress-cache.mjs',
  'scripts/integrated-cutover-readiness.mjs',
  'scripts/verify-account-assistant-schema.mjs',
]);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const execFile = promisify(execFileCallback);
async function missing(root) {
  await assert.rejects(fs.lstat(root), { code: 'ENOENT' });
}
async function inventory(root, prefix = '') {
  const result = [];
  for (const name of (await fs.readdir(path.join(root, prefix))).sort()) {
    const relative = prefix ? prefix + '/' + name : name;
    const stat = await fs.lstat(path.join(root, relative));
    assert(!stat.isSymbolicLink());
    if (stat.isDirectory()) result.push(...await inventory(root, relative));
    else {
      assert(stat.isFile() && stat.nlink === 1);
      result.push([relative, digest(await fs.readFile(path.join(root, relative)))]);
    }
  }
  return result;
}
// Test-owned negative fixtures only. Verify EVERY remaining byte and exact
// inventory before unlinking leaves; .git is a plain leaf, never traversed.
async function removeVerifiedTestFixture(root, expected) {
  assert.equal(path.dirname(root), await fs.realpath(os.tmpdir()));
  assert(path.basename(root).startsWith('rr-frozen-i71-reader-'));
  assert.equal(await fs.realpath(root), root);
  assert.deepEqual(await inventory(root), expected);
  const dirs = new Set();
  for (const [relative] of expected) {
    await fs.unlink(path.join(root, relative));
    let parent = path.posix.dirname(relative);
    while (parent !== '.') { dirs.add(parent); parent = path.posix.dirname(parent); }
  }
  for (const dir of [...dirs].sort((a, b) => b.length - a.length)) await fs.rmdir(path.join(root, dir));
  await fs.rmdir(root);
}

async function main() {
  let root, nestedRoot;
  const result = await withFrozenI71Source(async frozen => {
    root = frozen;
    const modules = [];
    for (const file of ROOTS) modules.push(await import(pathToFileURL(path.join(frozen, file)).href));
    assert.equal(modules.length, 9);
    const c = await import(pathToFileURL(path.join(frozen, 'scripts/rollback-assets/ravscore-model-bundle.generated.js')).href);
    const i = await import(pathToFileURL(path.join(frozen, 'js/core/ravscore-model-bundle.generated.js')).href);
    assert.equal(c.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files.length, 69);
    assert.equal(i.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files.length, 71);
    assert.equal(i.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256, '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399');
    const locator = await fs.readFile(path.join(frozen, '.git'), 'utf8');
    assert.match(locator, /^gitdir: [^\r\n]+\n$/);
    const issued = await import(pathToFileURL(path.join(frozen, 'scripts/check-account-assistant-issued-source.mjs')).href);
    await issued.withIssuedAccountAssistantSource(async historical => {
      nestedRoot = historical;
      assert.notEqual(historical, frozen);
      const old = await import(pathToFileURL(path.join(historical, 'js/core/ravscore-model-bundle.generated.js')).href);
      assert.equal(old.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256, 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5');
      assert.equal(old.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files.length, 68);
    });
    await missing(nestedRoot);
    const offline = await import(pathToFileURL(path.join(frozen, 'scripts/lib/copernicus-offline-environment.mjs')).href);
    for (const file of ['scripts/build-copernicus-target-registry.py',
      'scripts/run-copernicus-weather-components.py', 'scripts/merge-verified-current-donor-banks.py']) {
      const result = await execFile(process.env.PYTHON ?? 'python', [path.join(frozen, file), '--help'], {
        cwd: frozen, env: offline.copernicusOfflineEnvironment(), timeout: 30_000, maxBuffer: 64 * 1024,
      });
      assert.match(result.stdout, /usage:/);
    }
    for (const file of ['scripts/__pycache__', 'scripts/lib/__pycache__']) {
      assert((await fs.lstat(path.join(frozen, file))).isFile());
      assert.equal((await fs.readFile(path.join(frozen, file))).length, 0);
    }
    return 'FIXED_I71_SOURCE_ONLY';
  });
  assert.equal(result, 'FIXED_I71_SOURCE_ONLY');
  await missing(root);
  console.log('PASS fixed37e657 C69/I71/T12, normal220 --check, all nine reader imports, genuine nested044d normal213 --check, all three normal Python CLI imports and both owned cleanups');

  let thrown = false;
  try { await withFrozenI71Source(async frozen => { root = frozen; throw null; }); }
  catch (error) { thrown = true; assert.equal(error, null); }
  assert(thrown, 'Even a null first exception must survive cleanup');
  await missing(root);
  console.log('PASS first callback exception preserved, normal cleanup');

  let expected;
  await assert.rejects(withFrozenI71Source(async frozen => {
    root = frozen;
    const file = path.join(frozen, 'package.json');
    await fs.appendFile(file, '\n');
    expected = await inventory(frozen);
  }), /Frozen reader source changed/);
  assert((await fs.lstat(root)).isDirectory(), 'Changed source must be retained, not removed');
  await removeVerifiedTestFixture(root, expected);
  console.log('PASS changed source rejected and retained; exact test-owned cleanup');

  const first = new Error('TEST_FIRST_FAILURE');
  await assert.rejects(withFrozenI71Source(async frozen => {
    root = frozen;
    await fs.writeFile(path.join(frozen, 'unexpected-test-output'), 'synthetic\n', { flag: 'wx' });
    expected = await inventory(frozen);
    throw first;
  }), error => error === first);
  assert((await fs.lstat(root)).isDirectory(), 'Unknown output must be retained');
  await removeVerifiedTestFixture(root, expected);
  console.log('PASS unknown output retained, first exception preserved; no Git target traversed');
  await assert.rejects(withFrozenI71Source(() => {}, 'override'), /strictly equal/);
  await assert.rejects(withFrozenI71Source(null), /strictly equal/);
  console.log('PASS source/root/hash override and noncallback refused');
  await cliCases();
  await workdirCase();
}
async function workdirCase() {
  const parent = await fs.realpath(os.tmpdir());
  const workdir = await fs.mkdtemp(path.join(parent, 'rr-frozen-i71-reader-workdir-'));
  let sourceRoot;
  const expected = await withFrozenI71Source(async frozen => {
    sourceRoot = frozen;
    const normal = await import(pathToFileURL(path.join(frozen, 'scripts/integrated-cutover-readiness.mjs')).href);
    const workflow = await import(pathToFileURL(path.join(frozen, 'scripts/private-production-runtime-workflow.mjs')).href);
    for (const files of Object.values(workflow.PRIVATE_RUNTIME_CONTRACT_FILES)) {
      for (const file of files) assert((await fs.lstat(path.join(frozen, file))).isFile());
    }
    const contracts = await workflow.privateRuntimeContractHashes({ repositoryRoot: frozen });
    assert.deepEqual(Object.keys(contracts).sort(), Object.keys(workflow.PRIVATE_RUNTIME_CONTRACT_FILES).sort());
    for (const value of Object.values(contracts)) assert.match(value, /^[a-f0-9]{64}$/);
    const expected = [['supabase/config.toml', digest(await fs.readFile(path.join(frozen, 'supabase/config.toml')))]];
    for (const filename of [...normal.REQUIRED_CUTOVER_MIGRATIONS.map(row => row.filename),
      '20261013230000_account_statistics_revision.sql']) {
      expected.push(['supabase/migrations/' + filename,
        digest(await fs.readFile(path.join(frozen, 'supabase/migrations', filename)))]);
    }
    expected.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    const prepared = await normal.prepareTemporarySupabaseCutoverWorkdir({ workdir,
      includeStatisticsPreferenceRevisionSource: true });
    assert.equal(prepared.workdir, workdir);
    assert.equal(prepared.migrationsDirectory, path.join(workdir, 'supabase/migrations'));
    assert.deepEqual(await inventory(workdir), expected);
    assert.equal(digest(await fs.readFile(path.join(prepared.migrationsDirectory,
      '20261013230000_account_statistics_revision.sql'))),
    'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae');
    return expected;
  });
  await missing(sourceRoot);
  await removeVerifiedTestFixture(workdir, expected);
  await missing(workdir);
  console.log('PASS genuine frozen normal230 workdir, all actual runtime contract hashes, exact config/migration bytes and source/view owned cleanup; no SQL executed');
}
async function cliCases() {
  const file = fileURLToPath(new URL('./check-native-identity-frozen-i71-source.mjs', import.meta.url));
  const before = (await fs.readdir(os.tmpdir())).filter(name => name.startsWith('rr-frozen-i71-reader-')).sort();
  await assert.rejects(execFile(process.execPath, [file, '--source', 'other'], {
    timeout: 10_000, maxBuffer: 1024 * 1024,
  }), error => error.code === 1 && error.stdout === ''
    && error.stderr.trim() === 'FROZEN_I71_SOURCE_CHECK_FAILED; no current-runtime admission.');
  assert.deepEqual((await fs.readdir(os.tmpdir())).filter(name => name.startsWith('rr-frozen-i71-reader-')).sort(), before);
  console.log('PASS fixed CLI rejects extra arguments before source/temp work, finite failure only');
  const result = await execFile(process.execPath, [file], { timeout: 120_000, maxBuffer: 1024 * 1024 });
  assert.equal(result.stdout.trim(), 'Frozen I71 source verified at fixed37e657; genuine220 builder --check and C69/I71/T12 passed; no current-runtime admission.');
  assert.equal(result.stderr, '');
  assert.deepEqual((await fs.readdir(os.tmpdir())).filter(name => name.startsWith('rr-frozen-i71-reader-')).sort(), before);
  console.log('PASS fixed no-argument CLI, genuine normal builder and cleanup');
}
assert(process.argv.length === 2 || (process.argv.length === 3
  && ['--cli-only', '--workdir-only'].includes(process.argv[2])));
(process.argv[2] === '--cli-only' ? cliCases() : process.argv[2] === '--workdir-only' ? workdirCase() : main()).catch(error => {
  // Avoid data-URL source/stack, stdout, stderr or private callback fields.
  console.error(JSON.stringify({ name: typeof error?.name === 'string' ? error.name.slice(0, 80) : 'UNKNOWN',
    message: typeof error?.message === 'string' ? error.message.slice(0, 400) : 'UNKNOWN' }));
  process.exitCode = 1;
});
