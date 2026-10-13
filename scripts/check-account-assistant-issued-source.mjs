#!/usr/bin/env node
// Verify only the immutable, already issued 213 source. Never current admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEAD = '044d3045fecc2e70d6f35f60010921c6bd597ecc';
const TREE = '4c56c3b73633bf3a5e1540e4f53e75be49f0b9da';
const SQL = 'supabase/migrations/20261013210000_account_assistant_original_bound_successor.sql';
const SQL_SHA = '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d';
const BUILDER = 'scripts/build-account-assistant-binding-successor.mjs';
const SCANNER = 'scripts/lib/static-module-closure.mjs';
const T_CONTRACT = 'scripts/lib/ravscore-continuation-implementation-contract.mjs';
const GENERATED_C = 'scripts/rollback-assets/ravscore-model-bundle.generated.js';
const GENERATED_I = 'js/core/ravscore-model-bundle.generated.js';
const PREFIX = 'rr-issued213-source-';
const BUILDER_RECEIPT = 'Exact account/assistant successor source: original 130000/200000 immutable, C66/I68/T12, single-projection CAS, no numeric/history rewrite.';
const execFile = promisify(execFileCallback);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceBytes = new Map();

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
  const result = await execFile('git', ['-C', ROOT, ...args], {
    encoding, maxBuffer: 32 * 1024 * 1024, timeout: 30_000,
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
  assert(match && match[3] === relative,
    'Regular non-symlink Git blob required: ' + relative);
  return match[2];
}
async function gitBytes(relative) {
  relativePath(relative);
  if (sourceBytes.has(relative)) return sourceBytes.get(relative);
  assert(await blobEntry(relative), 'Missing required pinned source: ' + relative);
  const bytes = Buffer.from(await git(['show', HEAD + ':' + relative]));
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

async function main() {
  assert.equal(process.argv.length, 2, 'No source/root/hash/options override is accepted');
  try {
    assert.equal(String(await git(['rev-parse', HEAD + '^{tree}'], 'utf8')).trim(), TREE);
  } catch {
    throw Object.assign(new Error('Pinned issued source unavailable'),
      { issuedSourceCode: 'ISSUED_SOURCE_OBJECT_UNAVAILABLE' });
  }
  const original = await gitBytes(SQL);
  assert.equal(sha(original), SQL_SHA);
  try {
    const actualStat = await fs.lstat(path.join(ROOT, SQL));
    assert(actualStat.isFile() && !actualStat.isSymbolicLink());
    assert.deepEqual(await fs.readFile(path.join(ROOT, SQL)), original);
  } catch {
    throw Object.assign(new Error('Local issued213 differs'),
      { issuedSourceCode: 'ISSUED_LOCAL_213_MISMATCH' });
  }

  const scanner = await import('data:text/javascript;base64,'
    + (await gitBytes(SCANNER)).toString('base64'));
  const cFiles = await generated(GENERATED_C,
    '2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9', 66);
  const iFiles = await generated(GENERATED_I,
    'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5', 68);
  const tSource = (await gitBytes(T_CONTRACT)).toString('utf8');
  const tList = /export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(tSource);
  assert(tList, 'Exact pinned T file declaration required');
  const tFiles = [...tList[1].matchAll(/  '([^']+)',\n/g)].map(m => relativePath(m[1]));
  assert.equal(tFiles.length, 12);
  assert.equal(new Set(tFiles).size, 12);
  const pending = [...new Set([...cFiles, ...iFiles,
    GENERATED_C, GENERATED_I, BUILDER, SCANNER, T_CONTRACT, 'package.json',
    'scripts/fixtures/account-assistant-successor-inputs.json',
    'supabase/migrations/20261010130000_owner_export_origin_bound_successor.sql',
    'supabase/migrations/20261012200000_checkpoint_cas_single_projection_successor.sql', SQL])];
  const selected = new Set(tFiles), visited = new Set();
  for (const relative of tFiles) await gitBytes(relative);
  while (pending.length) {
    const relative = pending.pop();
    if (visited.has(relative)) continue;
    visited.add(relative);
    const bytes = await gitBytes(relative);
    selected.add(relative);
    if (/\.(?:js|mjs|ts)$/.test(relative)) {
      for (const specifier of scanner.exactRelativeModuleSpecifiers(bytes.toString('utf8'), relative)) {
        pending.push(await resolveImport(relative, specifier));
      }
    }
  }

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
    const environment = Object.fromEntries(
      ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']
        .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));
    try {
      const checked = await execFile(process.execPath, [path.join(temporary, BUILDER), '--check'], {
        cwd: temporary, env: environment, timeout: 60_000, maxBuffer: 1024 * 1024,
      });
      assert.equal(checked.stdout.trim(), BUILDER_RECEIPT);
    } catch {
      throw new Error('Pinned issued213 normal builder --check failed');
    }
    assert.deepEqual(await fs.readFile(path.join(temporary, SQL)), original,
      'Historical builder must not modify issued migration');
  } finally {
    assert.equal(path.dirname(temporary), tempParent);
    assert(path.basename(temporary).startsWith(PREFIX));
    assert.equal(await fs.realpath(temporary), temporary);
    assert.deepEqual(identity(await fs.lstat(temporary, { bigint: true })), ownedIdentity);
    await fs.rm(temporary, { recursive: true, force: false });
  }
  console.log('Issued213 historical source verified at fixed044d; normal C66/I68/T12 builder --check passed; current220 admission remains separate.');
}
main().catch(error => {
  const code = ['ISSUED_SOURCE_OBJECT_UNAVAILABLE', 'ISSUED_LOCAL_213_MISMATCH']
    .includes(error?.issuedSourceCode) ? error.issuedSourceCode : 'ISSUED_SOURCE_CHECK_FAILED';
  console.error(code + '; no current-runtime admission.');
  process.exitCode = 1;
});
