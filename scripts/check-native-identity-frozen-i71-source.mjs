#!/usr/bin/env node
// Historical reader only. This never admits the current implementation or data.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEAD = '37e657867ff0f8c31f8e8489e5c9a1cf235192f9';
const TREE = 'aabcdfd4f81aeba8db448c7b60d87e5212e94cd3';
const SCANNER = 'scripts/lib/static-module-closure.mjs';
const BUILDER = 'scripts/build-current-grid-original-binding-successor.mjs';
const C = 'scripts/rollback-assets/ravscore-model-bundle.generated.js';
const I = 'js/core/ravscore-model-bundle.generated.js';
const T = 'scripts/lib/ravscore-continuation-implementation-contract.mjs';
const SQL = 'supabase/migrations/20261013220000_current_grid_original_bound_successor.sql';
const PREFIX = 'rr-frozen-i71-reader-';
// CPython may optionally cache imports. A plain empty file at each fixed cache
// directory prevents that write without altering its original source, argv or
// credential-free environment. Python reads the genuine .py normally; a cache
// directory or any other unexpected output remains a hard cleanup refusal.
const BYTECODE_BLOCKERS = Object.freeze(['scripts/__pycache__', 'scripts/lib/__pycache__']);
const BUILDER_RECEIPT = 'Exact current-grid successor source: C69/I71/T12, three full original families, newer reference only, 55s/5s unchanged. No installation performed.';

// Reviewed dependency inventories apply ONLY to these exact immutable blobs.
// Dynamic old-root imports use the same fixed module paths; data-URL imports in
// issued213 are exclusively its genuine Git scanner/generated modules. Nothing
// here rewrites or evaluates a substitute body. Every other module is scanned.
const REVIEWED_MODULES = Object.freeze({
  'scripts/lib/historical-wave-input-transition.mjs': Object.freeze({
    sha256: 'fcc199d299c5173dae8fcb7ea8726e6717c2f3aeaaf038f5588a010fcc0460ef',
    imports: Object.freeze([
      '../../js/core/ravscore-model-contract.js',
      '../private-production-runtime-bundle.mjs',
      './ravscore-recovery-replay.mjs',
    ]),
  }),
  'scripts/build-public-coastal-parts-v2.mjs': Object.freeze({
    sha256: 'ad4dcfb1158639be600b1740453841f130539cf34f3f8e73158e3ad53fb99105',
    imports: Object.freeze([
    ]),
  }),
  'scripts/protected-private-production-runtime.mjs': Object.freeze({
    sha256: 'e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762',
    imports: Object.freeze([
      './private-production-runtime-bundle.mjs',
      './lib/supabase-admin-rest.mjs',
      '../js/core/ravscore-model-contract.js',
      './lib/r2-private-runtime-storage.mjs',
      './lib/private-weather-component-inventory.mjs',
      './lib/bounded-conditions-predecessor-transition.mjs',
    ]),
  }),
  'scripts/audit-saved-weather-inputs.mjs': Object.freeze({
    sha256: 'f1da935ba66e6b6b274b18094b4d7f49f721435f9ccab3c8096e3f2f50414f73',
    imports: Object.freeze([
      './protected-private-production-runtime.mjs',
      './lib/supabase-admin-rest.mjs',
      './lib/r2-private-runtime-storage.mjs',
      './lib/private-weather-component-inventory.mjs',
      './lib/dmi-forecast-file.mjs',
      './lib/dmi-bulk-storage.mjs',
      './lib/saved-dmi-original-capture.mjs',
      './lib/dmi-part-continuity.mjs',
      './lib/protected-dmi-current-context.mjs',
      './lib/protected-dmi-native-current-proofs.mjs',
      './lib/ravscore-production-adapters.mjs',
      './lib/private-weather-component-pack.mjs',
      './lib/weather-component-safe-summary.mjs',
      './weather-component-progress-cache.mjs',
      './lib/bounded-conditions-predecessor-transition.mjs',
      './migrate-post-cutover-private-runtime.mjs',
      './prepare-saved-dmi-original-restore.mjs',
      './private-production-runtime-workflow.mjs',
      '../js/core/ravscore-model-contract.js',
    ]),
  }),
  'scripts/migrate-post-cutover-private-runtime.mjs': Object.freeze({
    sha256: 'ed8fef02c6ef8716a895b8f2c45b5e8286eae0de833706ef5888322b19734117',
    imports: Object.freeze([
      './private-production-runtime-workflow.mjs',
      './lib/private-weather-component-inventory.mjs',
      './lib/public-hour-delivery-pack.mjs',
      './lib/rebind-public-hour-pack-exact.mjs',
      './lib/private-conditions-hourly.mjs',
      './public-conditions-lib.mjs',
      '../js/core/ravscore-public-runtime-contract.js',
      './lib/coastal-point-staging-contract.mjs',
      '../js/core/ravscore-model-contract.js',
      '../js/core/ravscore-public-profile-contract.js',
      '../js/core/ravscore-integrated-state-pipeline.js',
      '../js/core/ravscore-integrated.js',
      '../js/core/ravscore-public-model.js',
      './lib/ravscore-production-adapters.mjs',
      './lib/ravscore-integrated-runtime.mjs',
      './audit-ravscore-integrated-public-runtime.mjs',
      './rollback-assets/ravscore-model-contract.js',
      './runtime-binding-registry.mjs',
      './lib/bounded-json-writer.mjs',
      './lib/ravscore-production-part-pipeline.mjs',
      './lib/dmi-marine-zone-exclusions.mjs',
      './lib/bounded-conditions-predecessor-transition.mjs',
      './private-production-runtime-bundle.mjs',
      './protected-private-production-runtime.mjs',
    ]),
  }),
  'scripts/current-grid-binding-prewrite.mjs': Object.freeze({
    sha256: '3b250abdb9500db370822b3366a48b6101aef5a93b4f506cc759dee1be6aa92c',
    imports: Object.freeze([
      './check-account-assistant-issued-source.mjs',
      './protected-private-production-runtime.mjs',
      './private-production-runtime-bundle.mjs',
      './protected-ravscore-continuation-checkpoint.mjs',
      './lib/bounded-conditions-predecessor-transition.mjs',
      './migrate-post-cutover-private-runtime.mjs',
      './lib/private-conditions-hourly.mjs',
      './lib/ravscore-production-part-pipeline.mjs',
      './lib/current-grid-successor-source.mjs',
      './lib/current-grid-prewrite-diagnostic.mjs',
      './ravscore-continuation-checkpoint.mjs',
    ]),
  }),
  'scripts/check-account-assistant-issued-source.mjs': Object.freeze({
    sha256: '30faa2e4acdbff2f8ceba5385aed256edeea98b4f19b0f8094c3aad3abb2a208',
    imports: Object.freeze([

    ]),
  }),
  'scripts/private-production-runtime-bundle.mjs': Object.freeze({
    sha256: '2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529',
    imports: Object.freeze([
      '../js/core/ravscore-model-contract.js',
      './lib/bounded-conditions-predecessor-transition.mjs',
      './lib/private-weather-component-inventory.mjs',
    ]),
  }),
});
const CALLBACK_ROOTS = Object.freeze([
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
// Normal offline CP inventory/union and original-target ledger validator,
// including their exact local Python import closure (not the producer suite).
const NON_MODULE_FILES = Object.freeze([
  'supabase/config.toml',
  'scripts/fixtures/statistics-preference-revision-input.json',
  // Genuine fixed37 publicProjectionContractSha256 hash inputs. The other two
  // PRIVATE_RUNTIME_CONTRACT_FILES groups are exactly T12 and storage ABI below.
  'js/core/ravscore-model-contract.js',
  'js/core/ravscore-public-model.js',
  'js/core/ravscore-public-runtime-contract.js',
  'js/core/public-delivery-contract.js',
  'js/core/local-zone-score.js',
  'scripts/public-conditions-lib.mjs',
  'scripts/copy-public-delivery-shards.mjs',
  'scripts/lib/private-weather-component-inventory.mjs',
  'scripts/lib/public-hour-delivery-pack.mjs',
  'scripts/build-copernicus-target-registry.py',
  'scripts/lib/copernicus_component_spatial.py',
  'scripts/lib/copernicus_component_transport.py',
  'scripts/lib/copernicus_current.py',
  'scripts/lib/copernicus_current_donor_bank.py',
  'scripts/lib/copernicus_current_source_stage.py',
  'scripts/lib/copernicus_target_identity.py',
  'scripts/lib/copernicus_weather_component_bank.py',
  'scripts/lib/copernicus_weather_components.py',
  'scripts/lib/current_aged_dmi_challenge.py',
  'scripts/lib/current_model_reference.py',
  'scripts/lib/dmi_bulk_storage.py',
  'scripts/lib/dmi_current_processing_compatibility.py',
  'scripts/lib/dmi_native_provenance.py',
  'scripts/lib/dmi_wind_reference.py',
  'scripts/lib/open_meteo_current_fallback.py',
  'scripts/merge-verified-current-donor-banks.py',
  'scripts/run-copernicus-weather-components.py',
  'scripts/lib/dmi-marine-zone-exclusions.json',
  'scripts/lib/copernicus-component-spatial-policy.json',
  'scripts/lib/private-weather-storage-abi.json',
  'scripts/fixtures/account-assistant-successor-inputs.json',
  'knowledge/rav-assistant-public-v1.json',
  'data/admin/ravscore-profile-selection.json',
  'scripts/update-dmi-bulk.py',
  'scripts/lib/dmi_legacy_current_originals.py',
  'scripts/lib/dmi_legacy_current_recovery.py',
  'scripts/lib/dmi-legacy-current-originals.mjs',
  'scripts/lib/saved-dmi-original-capture.mjs',
  'scripts/lib/saved-dmi-original-dependencies.mjs',
  'scripts/plan-dmi-legacy-current-originals.mjs',
  'scripts/plan-ravscore-current-history.mjs',
  'scripts/update-weather.mjs',
  'scripts/prepare-saved-dmi-original-restore.mjs',
]);

const execFile = promisify(execFileCallback);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytesByPath = new Map();
const retained = new Set();
const normalize = value => String(value).replace(/\r\n?/g, '\n');

function relative(value) {
  assert.equal(typeof value, 'string');
  assert.match(value, /^[A-Za-z0-9_./-]+$/);
  assert.equal(path.posix.normalize(value), value);
  assert(!path.posix.isAbsolute(value) && value !== '.' && value !== '..'
    && value !== '' && !value.startsWith('../'));
  return value;
}
function inside(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}
function directoryIdentity(stat) {
  assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.ino > 0n);
  return [stat.dev, stat.ino, stat.birthtimeNs];
}
async function git(args, encoding = null) {
  return (await execFile('git', ['-C', ROOT, ...args], {
    encoding, timeout: 30_000, maxBuffer: 32 * 1024 * 1024, env: cleanEnvironment(),
  })).stdout;
}
function cleanEnvironment() {
  return Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']
    .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));
}
async function noLinks(absolute) {
  let at = path.parse(absolute).root;
  for (const segment of path.relative(at, absolute).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment);
    assert(!(await fs.lstat(at)).isSymbolicLink(), 'Git/source paths must not traverse links');
  }
}
async function gitLocator() {
  // A plain file, not a symlink/junction or copied Git repository. No Git writes.
  const directory = path.resolve(String(await git(['rev-parse', '--absolute-git-dir'], 'utf8')).trim());
  await noLinks(directory);
  assert.equal(await fs.realpath(directory), directory);
  const identity = directoryIdentity(await fs.lstat(directory, { bigint: true }));
  assert(!/[\r\n]/.test(directory));
  const content = Buffer.from('gitdir: ' + directory.split(path.sep).join('/') + '\n');
  return { directory, identity, content, sha256: sha(content) };
}
async function unchangedLocator(root, locator) {
  await noLinks(locator.directory);
  assert.equal(await fs.realpath(locator.directory), locator.directory);
  assert.deepEqual(directoryIdentity(await fs.lstat(locator.directory, { bigint: true })), locator.identity);
  const file = path.join(root, '.git'), stat = await fs.lstat(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
  const actual = await fs.readFile(file);
  assert.equal(sha(actual), locator.sha256);
  assert.deepEqual(actual, locator.content);
  for (const relative of BYTECODE_BLOCKERS) {
    const blocker = path.join(root, relative), details = await fs.lstat(blocker);
    assert(details.isFile() && !details.isSymbolicLink() && details.nlink === 1);
    assert.deepEqual(await fs.readFile(blocker), Buffer.alloc(0), 'Bytecode blocker changed');
  }
}
async function pinnedInventory() {
  assert.equal(String(await git(['rev-parse', HEAD + '^{tree}'], 'utf8')).trim(), TREE);
  const entries = String(await git(['ls-tree', '-r', '-z', HEAD], 'utf8')).split('\0').filter(Boolean);
  const files = new Map();
  for (const entry of entries) {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(entry);
    if (match) files.set(relative(match[3]), match[2]);
  }
  return files;
}
async function bytes(file, inventory) {
  relative(file);
  assert(inventory.has(file), 'Pinned regular source leaf is required');
  if (!bytesByPath.has(file)) bytesByPath.set(file, Buffer.from(await git(['show', HEAD + ':' + file])));
  return bytesByPath.get(file);
}
async function generated(file, expected, count, inventory) {
  const module = await import('data:text/javascript;base64,' + (await bytes(file, inventory)).toString('base64'));
  assert.equal(module.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256, expected);
  const rows = module.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files;
  assert.equal(rows.length, count);
  const paths = rows.map(row => relative(row.path ?? row.file));
  assert.equal(new Set(paths).size, count);
  return paths;
}
async function selectedSource(inventory) {
  const scanner = await import('data:text/javascript;base64,' + (await bytes(SCANNER, inventory)).toString('base64'));
  const c = await generated(C, 'd192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9', 69, inventory);
  const i = await generated(I, '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399', 71, inventory);
  const tSource = (await bytes(T, inventory)).toString('utf8');
  const tList = /export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(tSource);
  assert(tList, 'Exact pinned T12 declaration required');
  const tFiles = [...tList[1].matchAll(/  '([^']+)',\n/g)].map(m => relative(m[1]));
  assert.equal(tFiles.length, 12);
  assert.equal(new Set(tFiles).size, 12);
  const pending = [...new Set([...c, ...i, ...tFiles, ...CALLBACK_ROOTS, ...NON_MODULE_FILES,
    C, I, T, SCANNER, BUILDER, 'package.json'])];
  // These are immutable source dependencies, never weather files or SQL to run.
  for (const file of inventory.keys()) {
    if (/^supabase\/migrations\/[A-Za-z0-9_.-]+\.sql$/.test(file)
) pending.push(file);
  }
  const selected = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (selected.has(file)) continue;
    selected.add(file);
    const source = (await bytes(file, inventory)).toString('utf8');
    if (/\.(?:js|mjs|ts)$/.test(file)) {
      const reviewed = REVIEWED_MODULES[file];
      if (reviewed) assert.equal(sha(await bytes(file, inventory)), reviewed.sha256,
        'Reviewed import inventory requires its entire exact pinned source');
      const imports = reviewed ? reviewed.imports : scanner.exactRelativeModuleSpecifiers(source, file);
      for (const specifier of imports) {
        const clean = specifier.split(/[?#]/, 1)[0];
        const base = relative(path.posix.normalize(path.posix.join(path.posix.dirname(file), clean)));
        const choices = path.posix.extname(base) ? [base]
          : [base, base + '.js', base + '.mjs', base + '.json', base + '/index.js'];
        const found = choices.find(candidate => inventory.has(candidate));
        assert(found, 'Pinned relative import must resolve to a regular source leaf');
        pending.push(found);
      }
    }
  }
  assert.equal(sha(normalize((await bytes(SQL, inventory)).toString('utf8'))),
    '77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b');
  return [...selected].sort();
}
async function unchanged(root, selected, inventory) {
  for (const file of selected) {
    const actual = path.resolve(root, file);
    assert(inside(root, actual));
    const stat = await fs.lstat(actual);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
    assert.deepEqual(await fs.readFile(actual), await bytes(file, inventory), 'Frozen reader source changed');
  }
}
async function exactOwnedTree(root, selected) {
  const wanted = new Set(selected), seen = new Set();
  const wantedDirectories = new Set(['']);
  for (const file of selected) {
    let parent = path.posix.dirname(file);
    while (parent !== '.') {
      wantedDirectories.add(parent);
      parent = path.posix.dirname(parent);
    }
  }
  async function visit(directory, prefix) {
    for (const entry of await fs.readdir(directory)) {
      const name = prefix ? prefix + '/' + entry : entry;
      const file = path.resolve(directory, entry);
      assert(inside(root, file));
      const stat = await fs.lstat(file);
      assert(!stat.isSymbolicLink(), 'Frozen source cleanup must never traverse a link');
      if (stat.isDirectory()) {
        assert(wantedDirectories.has(name), 'Unknown directory retained, not recursively removed');
        await visit(file, name);
      } else {
        assert(stat.isFile() && wanted.has(name), 'Unknown file retained, not recursively removed');
        seen.add(name);
      }
    }
  }
  await visit(root, '');
  assert.deepEqual([...seen].sort(), [...wanted].sort());
}

// The callback receives one fixed verified historical reader. It cannot select
// a head, root, binding or executable. B/S and baseline outputs belong elsewhere.
export async function withFrozenI71Source(useVerifiedSource) {
  assert.equal(arguments.length, 1);
  assert.equal(typeof useVerifiedSource, 'function');
  const inventory = await pinnedInventory(), selected = await selectedSource(inventory);
  const locator = await gitLocator();
  const tempParent = await fs.realpath(os.tmpdir());
  const temporary = await fs.mkdtemp(path.join(tempParent, PREFIX));
  assert.equal(path.dirname(temporary), tempParent);
  assert.equal(await fs.realpath(temporary), temporary);
  const owned = { root: temporary, parent: tempParent,
    identity: directoryIdentity(await fs.lstat(temporary, { bigint: true })) };
  retained.add(owned);
  let first, failed = false, result;
  try {
    for (const file of selected) {
      const destination = path.resolve(temporary, file), parent = path.dirname(destination);
      assert(inside(temporary, destination));
      await fs.mkdir(parent, { recursive: true });
      assert.equal(await fs.realpath(parent), parent);
      await fs.writeFile(destination, await bytes(file, inventory), { flag: 'wx', mode: 0o600 });
    }
    await fs.writeFile(path.join(temporary, '.git'), locator.content, { flag: 'wx', mode: 0o600 });
    for (const file of BYTECODE_BLOCKERS) {
      await fs.writeFile(path.join(temporary, file), Buffer.alloc(0), { flag: 'wx', mode: 0o600 });
    }
    await unchangedLocator(temporary, locator);
    const env = cleanEnvironment();
    const checked = await execFile(process.execPath, [path.join(temporary, BUILDER), '--check'], {
      cwd: temporary, env, timeout: 60_000, maxBuffer: 1024 * 1024,
    });
    assert.equal(checked.stdout.trim(), BUILDER_RECEIPT);
    const oldT = await import(pathToFileURL(path.join(temporary, T)).href);
    assert.equal(await oldT.ravScoreContinuationImplementationSha256({ repositoryRoot: temporary }),
      '0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a');
    await unchanged(temporary, selected, inventory);
    await exactOwnedTree(temporary, [...selected, '.git', ...BYTECODE_BLOCKERS]);
    result = await useVerifiedSource(temporary);
    await unchanged(temporary, selected, inventory);
  } catch (error) { first = error; failed = true; }
  try {
    assert.equal(path.dirname(temporary), tempParent);
    assert(path.basename(temporary).startsWith(PREFIX));
    assert.equal(await fs.realpath(temporary), temporary);
    assert.deepEqual(directoryIdentity(await fs.lstat(temporary, { bigint: true })), owned.identity);
    await unchanged(temporary, selected, inventory);
    await unchangedLocator(temporary, locator);
    await exactOwnedTree(temporary, [...selected, '.git', ...BYTECODE_BLOCKERS]);
    // Unlink only verified owned leaves. Never recurse through the Git locator
    // or remove an unexpected file/directory, even if it appeared after callback.
    for (const file of [...selected, '.git', ...BYTECODE_BLOCKERS]) await fs.unlink(path.join(temporary, file));
    const directories = new Set();
    for (const file of selected) {
      let parent = path.posix.dirname(file);
      while (parent !== '.') { directories.add(parent); parent = path.posix.dirname(parent); }
    }
    for (const directory of [...directories].sort((a, b) => b.length - a.length)) {
      await fs.rmdir(path.join(temporary, directory));
    }
    await fs.rmdir(temporary);
    retained.delete(owned);
  } catch (error) { if (!failed) { first = error; failed = true; } }
  if (failed) throw first;
  return result;
}

async function main() {
  assert.equal(process.argv.length, 2, 'No source/root/hash/options override is accepted');
  await withFrozenI71Source(async () => {});
  console.log('Frozen I71 source verified at fixed37e657; genuine220 builder --check and C69/I71/T12 passed; no current-runtime admission.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    retained.add(Object.freeze({ firstFailure: error }));
    console.error('FROZEN_I71_SOURCE_CHECK_FAILED; no current-runtime admission.');
    process.exitCode = 1;
  });
}
