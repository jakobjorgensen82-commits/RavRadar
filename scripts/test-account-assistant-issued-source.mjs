import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKER = 'scripts/check-account-assistant-issued-source.mjs';
const SQL = 'supabase/migrations/20261013210000_account_assistant_original_bound_successor.sql';
const HEAD = '044d3045fecc2e70d6f35f60010921c6bd597ecc';
const TREE = '4c56c3b73633bf3a5e1540e4f53e75be49f0b9da';
const SQL_SHA = '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d';
const RECEIPT = 'Issued213 historical source verified at fixed044d; normal C66/I68/T12 builder --check passed; current220 admission remains separate.';
const PREFIX = 'rr-issued213-test-';
const execFile = promisify(execFileCallback);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const environment = Object.fromEntries(
  ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']
    .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));
const checker = await fs.readFile(path.join(ROOT, CHECKER));
const original = await fs.readFile(path.join(ROOT, SQL));
assert.equal(sha(original), SQL_SHA);

function identity(stat) {
  assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.ino > 0n);
  return [stat.dev, stat.ino, stat.birthtimeNs];
}
async function run(file, args, cwd) {
  try {
    const result = await execFile(file, args, {
      cwd, env: environment, encoding: 'utf8', timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });
    return { code: 0, signal: null, ...result };
  } catch (error) {
    assert.equal(typeof error.code, 'number', 'A spawn failure is not a negative case');
    assert.equal(error.signal, null, 'Timeout/termination is not a negative case');
    return { code: error.code, signal: error.signal,
      stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}
async function fixture(useGenuineObjects, body) {
  const parent = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(parent, PREFIX));
  assert.equal(path.dirname(directory), parent);
  assert.equal(await fs.realpath(directory), directory);
  const owned = identity(await fs.lstat(directory, { bigint: true }));
  try {
    for (const [relative, bytes] of [[CHECKER, checker], [SQL, original]]) {
      const target = path.resolve(directory, relative);
      const inside = path.relative(directory, target);
      assert(inside && !inside.startsWith('..') && !path.isAbsolute(inside));
      await fs.mkdir(path.dirname(target), { recursive: true });
      assert.equal(await fs.realpath(path.dirname(target)), path.dirname(target));
      await fs.writeFile(target, bytes, { flag: 'wx' });
    }
    assert.equal(sha(await fs.readFile(path.join(directory, CHECKER))), sha(checker));
    const initialized = await run('git', ['init', '--quiet', '--initial-branch=fixture'], directory);
    assert.equal(initialized.code, 0);
    if (useGenuineObjects) {
      const objects = await run('git', ['-C', ROOT, 'rev-parse',
        '--path-format=absolute', '--git-path', 'objects'], ROOT);
      assert.equal(objects.code, 0);
      const absolute = await fs.realpath(objects.stdout.trim());
      assert((await fs.stat(absolute)).isDirectory());
      const info = path.join(directory, '.git', 'objects', 'info');
      await fs.mkdir(info, { recursive: true });
      await fs.writeFile(path.join(info, 'alternates'), absolute.replaceAll('\\', '/') + '\n',
        { flag: 'wx' });
      const actualTree = await run('git', ['rev-parse', HEAD + '^{tree}'], directory);
      assert.equal(actualTree.code, 0);
      assert.equal(actualTree.stdout.trim(), TREE);
    }
    await body(directory);
  } finally {
    assert.equal(path.dirname(directory), parent);
    assert(path.basename(directory).startsWith(PREFIX));
    assert.equal(await fs.realpath(directory), directory);
    assert.deepEqual(identity(await fs.lstat(directory, { bigint: true })), owned);
    await fs.rm(directory, { recursive: true, force: false });
    assert.equal(sha(await fs.readFile(path.join(ROOT, SQL))), SQL_SHA);
  }
}

test('genuine issued213 normal builder checks historical C66/I68/T12, never current220', async () => {
  const before = sha(await fs.readFile(path.join(ROOT, SQL)));
  const checked = await run(process.execPath, [path.join(ROOT, CHECKER)], ROOT);
  assert.equal(checked.code, 0, checked.stderr);
  assert.equal(checked.signal, null);
  assert.equal(checked.stdout.trim(), RECEIPT);
  assert.equal(sha(await fs.readFile(path.join(ROOT, SQL))), before);
  assert.equal(before, SQL_SHA);
});

test('genuine pinned objects cannot excuse changed local213 or run its historical builder', async () => {
  await fixture(true, async directory => {
    await fs.appendFile(path.join(directory, SQL), '\n');
    assert.notEqual(sha(await fs.readFile(path.join(directory, SQL))), SQL_SHA);
    const checked = await run(process.execPath, [path.join(directory, CHECKER)], directory);
    assert.equal(checked.code, 1);
    assert.equal(checked.stdout, '');
    assert.equal(checked.stderr.trim(), 'ISSUED_LOCAL_213_MISMATCH; no current-runtime admission.');
  });
});

test('missing genuine pinned object rejects even correct local213 without worktree fallback', async () => {
  await fixture(false, async directory => {
    const missing = await run('git', ['cat-file', '-e', HEAD + '^{commit}'], directory);
    assert.notEqual(missing.code, 0);
    assert.equal(sha(await fs.readFile(path.join(directory, SQL))), SQL_SHA);
    const checked = await run(process.execPath, [path.join(directory, CHECKER)], directory);
    assert.equal(checked.code, 1);
    assert.equal(checked.stdout, '');
    assert.equal(checked.stderr.trim(), 'ISSUED_SOURCE_OBJECT_UNAVAILABLE; no current-runtime admission.');
  });
});
