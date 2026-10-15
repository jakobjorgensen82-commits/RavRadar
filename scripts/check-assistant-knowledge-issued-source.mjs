#!/usr/bin/env node
// Fixed issued14140000 source check only. No future runtime or installation admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEAD = '8da23b07d10043a2903abec66a3f282ac3e00243';
const TREE = '728db9b5b7c98ce2959d586533ab72038d9a7439';
const SQL = 'supabase/migrations/20261014140000_assistant_knowledge_bound_successor.sql';
const SQL_SHA = '64f51a8a4a44e1094c97bfdf4fd48db7a276393410b27bb370fbd4ea2af1e74f';
const BUILDER = 'scripts/build-assistant-knowledge-binding-successor.mjs';
const SCANNER = 'scripts/lib/static-module-closure.mjs';
const T_CONTRACT = 'scripts/lib/ravscore-continuation-implementation-contract.mjs';
const GENERATED_C = 'scripts/rollback-assets/ravscore-model-bundle.generated.js';
const GENERATED_I = 'js/core/ravscore-model-bundle.generated.js';
const POLICY = 'scripts/lib/dmi-marine-zone-exclusions.json';
const PREFIX = 'rr-issued14140000-source-';
// The fixed commit/tree anchors every module and JSON blob; no worktree input.
const SOURCE_PINS = new Map([
  [POLICY, 'b959dee7b87cfebe9fdc7311ffd62b835c96d5c4a263bbcff5c0485f6660ef16'],
  ['supabase/migrations/20261010130000_owner_export_origin_bound_successor.sql',
    '55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6'],
  ['supabase/migrations/20261012200000_checkpoint_cas_single_projection_successor.sql',
    'b03605272397585a3e6ad248398ba7bc6d88af506837f76c88a9a92955b48c18'],
  ['supabase/migrations/20261013210000_account_assistant_original_bound_successor.sql',
    '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d'],
  ['supabase/migrations/20261013220000_current_grid_original_bound_successor.sql',
    '77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b'],
  ['supabase/migrations/20261013230000_account_statistics_revision.sql',
    'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae'],
  [SQL, SQL_SHA],
]);
const BUILDER_RECEIPT = 'Exact KB metadata source after230; no installation or activation performed.';
const RECEIPT = 'Issued14140000 historical source verified at fixed8da; normal C73/I75/T12 builder --check passed; future knowledge/runtime admission remains separate.';
const execFile = promisify(execFileCallback);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceBytes = new Map();
const environment = Object.fromEntries(
  ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']
    .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));

function relativePath(value) {
  assert.equal(typeof value, 'string');
  assert.match(value, /^[A-Za-z0-9_./-]+$/);
  assert.equal(path.posix.normalize(value), value);
  assert(!path.posix.isAbsolute(value) && !['.', '..', ''].includes(value)
    && !value.startsWith('../'));
  return value;
}
function inside(parent, child) {
  const relative = path.relative(parent, child);
  return !!relative && relative !== '..' && !relative.startsWith('..' + path.sep)
    && !path.isAbsolute(relative);
}
function identity(stat) {
  assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.ino > 0n,
    'Owned source directory identity must be available');
  return [stat.dev, stat.ino, stat.birthtimeNs];
}
async function git(args, encoding = null) {
  const result = await execFile('git', ['--no-replace-objects', '-C', ROOT, ...args], {
    encoding, env: environment, maxBuffer: 32 * 1024 * 1024, timeout: 30_000,
  });
  return result.stdout;
}
async function blobEntry(relative, resolutionCandidate = false) {
  relativePath(relative);
  const output = String(await git(['ls-tree', '-z', HEAD, '--', relative], 'utf8'));
  if (output === '') return null;
  const rows = output.split('\0').filter(Boolean);
  assert.equal(rows.length, 1, 'Exact pinned Git leaf required: ' + relative);
  if (resolutionCandidate && /^040000 tree [a-f0-9]{40}\t/.test(rows[0])) return null;
  const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(rows[0]);
  assert(match && match[3] === relative, 'Regular non-symlink Git blob required: ' + relative);
  return match[2];
}
async function gitBytes(relative) {
  relativePath(relative);
  if (sourceBytes.has(relative)) return sourceBytes.get(relative);
  assert(await blobEntry(relative), 'Missing required pinned source: ' + relative);
  const bytes = Buffer.from(await git(['show', HEAD + ':' + relative]));
  if (SOURCE_PINS.has(relative)) assert.equal(sha(bytes), SOURCE_PINS.get(relative),
    'Pinned issued14140000 source bytes: ' + relative);
  sourceBytes.set(relative, bytes);
  return bytes;
}
async function generated(relative, expectedSha, expectedCount) {
  const bytes = await gitBytes(relative);
  const module = await import('data:text/javascript;base64,' + bytes.toString('base64'));
  assert.equal(module.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256, expectedSha);
  const rows = module.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files;
  assert.equal(rows.length, expectedCount);
  const files = rows.map(row => {
    assert.match(row.sha256, /^[a-f0-9]{64}$/);
    return relativePath(row.file ?? row.path);
  });
  assert.equal(new Set(files).size, expectedCount);
  return files;
}
async function resolveImport(importer, specifier) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const base = relativePath(path.posix.normalize(
    path.posix.join(path.posix.dirname(importer), clean)));
  const candidates = path.posix.extname(base) ? [base]
    : [base, base + '.js', base + '.mjs', base + '.json', base + '/index.js'];
  for (const candidate of candidates) {
    if (await blobEntry(candidate, true)) return candidate;
  }
  throw new Error('Unresolved pinned import: ' + importer + ' -> ' + clean);
}
async function assertLocalIssuedSql(original) {
  try {
    const stat = await fs.lstat(path.join(ROOT, SQL));
    assert(stat.isFile() && !stat.isSymbolicLink());
    assert.deepEqual(await fs.readFile(path.join(ROOT, SQL)), original);
  } catch {
    throw Object.assign(new Error('Local issued14140000 differs'),
      { issuedSourceCode: 'ISSUED_LOCAL_14140000_MISMATCH' });
  }
}

async function verifyIssuedAssistantKnowledgeSource() {
  try {
    assert.equal(String(await git(['rev-parse', HEAD + '^{tree}'], 'utf8')).trim(), TREE);
  } catch {
    throw Object.assign(new Error('Pinned issued14140000 source unavailable'),
      { issuedSourceCode: 'ISSUED_SOURCE_OBJECT_UNAVAILABLE' });
  }
  const original = await gitBytes(SQL);
  await assertLocalIssuedSql(original); // Before any owned temporary directory.
  const scanner = await import('data:text/javascript;base64,'
    + (await gitBytes(SCANNER)).toString('base64'));
  const cFiles = await generated(GENERATED_C,
    '74883293f9a19f948773678e2e373bff77a8f79d2e09ca81f7e51f78240980a6', 73);
  const iFiles = await generated(GENERATED_I,
    'd6707d44fea563a3aaf99e1a81975fcb738d8a0152d2f85adff36060b75d7faa', 75);
  const tSource = (await gitBytes(T_CONTRACT)).toString('utf8');
  const tList = /export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(tSource);
  assert(tList, 'Exact pinned T file declaration required');
  const tFiles = [...tList[1].matchAll(/  '([^']+)',\n/g)].map(m => relativePath(m[1]));
  assert.equal(tFiles.length, 12);
  assert.equal(new Set(tFiles).size, 12);
  // The scanner resolves every module from this immutable Git tree only,
  // including excluded model-resolver dependencies and all T imports.
  const pending = [...new Set([...cFiles, ...iFiles, ...tFiles,
    ...SOURCE_PINS.keys(), BUILDER, SCANNER, T_CONTRACT, GENERATED_C, GENERATED_I,
    'package.json', 'scripts/fixtures/statistics-preference-revision-input.json'])];
  const selected = new Set();
  while (pending.length) {
    const relative = pending.pop();
    if (selected.has(relative)) continue;
    const bytes = await gitBytes(relative);
    selected.add(relative);
    if (/\.(?:js|mjs|ts)$/.test(relative)) {
      for (const specifier of scanner.exactRelativeModuleSpecifiers(bytes.toString('utf8'), relative)) {
        pending.push(await resolveImport(relative, specifier));
      }
    }
  }
  assert.equal((await gitBytes(POLICY)).length, 416,
    'Fixed non-ESM policy data dependency remains genuine');
  for (const relative of SOURCE_PINS.keys()) assert(selected.has(relative));
  // As in the fixed213 reader, the immutable tree plus closed imports anchors
  // the complete fixture; do not borrow fixed220's unrelated 93-leaf digest.
  await assertLocalIssuedSql(original);

  const tempParent = await fs.realpath(os.tmpdir());
  const temporary = await fs.mkdtemp(path.join(tempParent, PREFIX));
  assert.equal(path.dirname(temporary), tempParent);
  assert.equal(await fs.realpath(temporary), temporary);
  const ownedIdentity = identity(await fs.lstat(temporary, { bigint: true }));
  try {
    for (const relative of [...selected].sort()) {
      const destination = path.resolve(temporary, relative);
      assert(inside(temporary, destination));
      const parent = path.dirname(destination);
      await fs.mkdir(parent, { recursive: true });
      assert((parent === temporary || inside(temporary, parent))
        && await fs.realpath(parent) === parent);
      await fs.writeFile(destination, await gitBytes(relative), { flag: 'wx', mode: 0o600 });
    }
    try {
      const checked = await execFile(process.execPath, [path.join(temporary, BUILDER), '--check'], {
        cwd: temporary, env: environment, timeout: 60_000, maxBuffer: 1024 * 1024,
      });
      assert.equal(checked.stderr.trim(), '');
      assert.equal(checked.stdout.trim(), BUILDER_RECEIPT);
    } catch {
      throw new Error('Pinned issued14140000 normal builder --check failed');
    }
    // A read-only normal --check cannot rewrite its selected source.
    for (const relative of selected) {
      assert.deepEqual(await fs.readFile(path.join(temporary, relative)), await gitBytes(relative),
        'Historical builder must preserve source bytes: ' + relative);
    }
    await assertLocalIssuedSql(original);
  } finally {
    assert.equal(path.dirname(temporary), tempParent);
    assert(path.basename(temporary).startsWith(PREFIX));
    assert.equal(await fs.realpath(temporary), temporary);
    assert.deepEqual(identity(await fs.lstat(temporary, { bigint: true })), ownedIdentity);
    await fs.rm(temporary, { recursive: true, force: false });
  }
}
async function main() {
  assert.equal(process.argv.length, 2, 'No source/root/hash/options override is accepted');
  await verifyIssuedAssistantKnowledgeSource();
  console.log(RECEIPT);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  const code = ['ISSUED_SOURCE_OBJECT_UNAVAILABLE', 'ISSUED_LOCAL_14140000_MISMATCH']
    .includes(error?.issuedSourceCode) ? error.issuedSourceCode : 'ISSUED_SOURCE_CHECK_FAILED';
  console.error(code + '; no future-runtime admission.');
  process.exitCode = 1;
});
