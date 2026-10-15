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

// Additive fixed220 cases. All preceding genuine213 source and assertions stay exact.
const CURRENT_GRID_CHECKER = 'scripts/check-current-grid-issued-source.mjs';
const CURRENT_GRID_SQL = 'supabase/migrations/20261013220000_current_grid_original_bound_successor.sql';
const CURRENT_GRID_HEAD = 'c74737575e1404e98bbcef7f644684ab250e1b6c';
const CURRENT_GRID_TREE = 'bee109d9bce90ebee031ad883ebfcd5d52b406d2';
const CURRENT_GRID_SQL_SHA = '77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b';
const CURRENT_GRID_RECEIPT = 'Issued220 historical source verified at fixedc747; normal C69/I71/T12 builder --check passed; future knowledge/runtime admission remains separate.';
const CURRENT_GRID_PREFIX = 'rr-issued220-test-';
const currentGridChecker = await fs.readFile(path.join(ROOT, CURRENT_GRID_CHECKER));
const currentGridOriginal = await fs.readFile(path.join(ROOT, CURRENT_GRID_SQL));
assert.equal(sha(currentGridOriginal), CURRENT_GRID_SQL_SHA);

async function currentGridFixture(useGenuineObjects, body) {
  const parent = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(parent, CURRENT_GRID_PREFIX));
  assert.equal(path.dirname(directory), parent);
  assert.equal(await fs.realpath(directory), directory);
  const owned = identity(await fs.lstat(directory, { bigint: true }));
  try {
    for (const [relative, bytes] of [
      [CURRENT_GRID_CHECKER, currentGridChecker], [CURRENT_GRID_SQL, currentGridOriginal],
    ]) {
      const destination = path.resolve(directory, relative);
      const inside = path.relative(directory, destination);
      assert(inside && !inside.startsWith('..') && !path.isAbsolute(inside));
      await fs.mkdir(path.dirname(destination), { recursive: true });
      assert.equal(await fs.realpath(path.dirname(destination)), path.dirname(destination));
      await fs.writeFile(destination, bytes, { flag: 'wx' });
    }
    assert.equal(sha(await fs.readFile(path.join(directory, CURRENT_GRID_CHECKER))),
      sha(currentGridChecker));
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
      const actualTree = await run('git', ['--no-replace-objects', 'rev-parse',
        CURRENT_GRID_HEAD + '^{tree}'], directory);
      assert.equal(actualTree.code, 0);
      assert.equal(actualTree.stdout.trim(), CURRENT_GRID_TREE);
    }
    await body(directory);
  } finally {
    assert.equal(path.dirname(directory), parent);
    assert(path.basename(directory).startsWith(CURRENT_GRID_PREFIX));
    assert.equal(await fs.realpath(directory), directory);
    assert.deepEqual(identity(await fs.lstat(directory, { bigint: true })), owned);
    await fs.rm(directory, { recursive: true, force: false });
    assert.equal(sha(await fs.readFile(path.join(ROOT, SQL))), SQL_SHA);
    assert.equal(sha(await fs.readFile(path.join(ROOT, CURRENT_GRID_SQL))), CURRENT_GRID_SQL_SHA);
  }
}

test('issued220 normal builder uses fixedc747 Git source, never future worktree modules', async () => {
  await currentGridFixture(true, async directory => {
    const poisoned = [
      'js/services/rav-assistant.js',
      'js/core/ravscore-model-bundle.generated.js',
      'scripts/rollback-assets/ravscore-model-bundle.generated.js',
      'scripts/build-current-grid-original-binding-successor.mjs',
    ];
    const poison = Buffer.from("throw new Error('WORKTREE_SOURCE_MUST_NOT_BE_USED');\n");
    for (const relative of poisoned) {
      const destination = path.resolve(directory, relative);
      const inside = path.relative(directory, destination);
      assert(inside && !inside.startsWith('..') && !path.isAbsolute(inside));
      await fs.mkdir(path.dirname(destination), { recursive: true });
      assert.equal(await fs.realpath(path.dirname(destination)), path.dirname(destination));
      await fs.writeFile(destination, poison, { flag: 'wx' });
    }
    const checked = await run(process.execPath, [path.join(directory, CURRENT_GRID_CHECKER)], directory);
    assert.equal(checked.code, 0, checked.stderr);
    assert.equal(checked.signal, null);
    assert.equal(checked.stdout.trim(), CURRENT_GRID_RECEIPT);
    assert.equal(checked.stderr, '');
    for (const relative of poisoned) {
      assert.deepEqual(await fs.readFile(path.join(directory, relative)), poison);
    }
    assert.deepEqual(await fs.readFile(path.join(directory, CURRENT_GRID_SQL)), currentGridOriginal);
  });
});

test('issued220 pinned objects cannot excuse changed local220', async () => {
  await currentGridFixture(true, async directory => {
    await fs.appendFile(path.join(directory, CURRENT_GRID_SQL), '\n');
    assert.notEqual(sha(await fs.readFile(path.join(directory, CURRENT_GRID_SQL))), CURRENT_GRID_SQL_SHA);
    const checked = await run(process.execPath, [path.join(directory, CURRENT_GRID_CHECKER)], directory);
    assert.equal(checked.code, 1);
    assert.equal(checked.stdout, '');
    assert.equal(checked.stderr.trim(), 'ISSUED_LOCAL_220_MISMATCH; no future-runtime admission.');
  });
});

test('issued220 missing pinned objects rejects correct local220 without worktree fallback', async () => {
  await currentGridFixture(false, async directory => {
    const missing = await run('git', ['--no-replace-objects', 'cat-file', '-e',
      CURRENT_GRID_HEAD + '^{commit}'], directory);
    assert.notEqual(missing.code, 0);
    assert.equal(sha(await fs.readFile(path.join(directory, CURRENT_GRID_SQL))), CURRENT_GRID_SQL_SHA);
    const checked = await run(process.execPath, [path.join(directory, CURRENT_GRID_CHECKER)], directory);
    assert.equal(checked.code, 1);
    assert.equal(checked.stdout, '');
    assert.equal(checked.stderr.trim(), 'ISSUED_SOURCE_OBJECT_UNAVAILABLE; no future-runtime admission.');
  });
});

test('issued220 CLI has no source root hash or write override', async () => {
  await currentGridFixture(true, async directory => {
    for (const args of [['--root', directory], ['--source', CURRENT_GRID_HEAD],
      ['--hash', CURRENT_GRID_SQL_SHA], ['--write']]) {
      const checked = await run(process.execPath,
        [path.join(directory, CURRENT_GRID_CHECKER), ...args], directory);
      assert.equal(checked.code, 1);
      assert.equal(checked.stdout, '');
      assert.equal(checked.stderr.trim(), 'ISSUED_SOURCE_CHECK_FAILED; no future-runtime admission.');
      assert.deepEqual(await fs.readFile(path.join(directory, CURRENT_GRID_SQL)), currentGridOriginal);
    }
  });
});
// Additive fixed14140000 cases. All preceding genuine213/220 cases stay exact.
const KNOWLEDGE_CHECKER = 'scripts/check-assistant-knowledge-issued-source.mjs';
const KNOWLEDGE_SQL = 'supabase/migrations/20261014140000_assistant_knowledge_bound_successor.sql';
const KNOWLEDGE_HEAD = '8da23b07d10043a2903abec66a3f282ac3e00243';
const KNOWLEDGE_TREE = '728db9b5b7c98ce2959d586533ab72038d9a7439';
const KNOWLEDGE_SQL_SHA = '64f51a8a4a44e1094c97bfdf4fd48db7a276393410b27bb370fbd4ea2af1e74f';
const KNOWLEDGE_RECEIPT = 'Issued14140000 historical source verified at fixed8da; normal C73/I75/T12 builder --check passed; future knowledge/runtime admission remains separate.';
const knowledgeChecker = await fs.readFile(path.join(ROOT, KNOWLEDGE_CHECKER));
const knowledgeOriginal = await fs.readFile(path.join(ROOT, KNOWLEDGE_SQL));
assert.equal(sha(knowledgeOriginal), KNOWLEDGE_SQL_SHA);

// Reuse the existing owned TEMP/Git-object fixture and its cleanup guards.
// Its fixed220 objects remain present; the new checker must select fixed8da.
async function knowledgeFixture(useGenuineObjects, body) {
  try {
    await currentGridFixture(useGenuineObjects, async directory => {
      for (const [relative, bytes] of [
        [KNOWLEDGE_CHECKER, knowledgeChecker], [KNOWLEDGE_SQL, knowledgeOriginal],
      ]) {
        const destination = path.resolve(directory, relative);
        const inside = path.relative(directory, destination);
        assert(inside && !inside.startsWith('..') && !path.isAbsolute(inside));
        await fs.mkdir(path.dirname(destination), { recursive: true });
        assert.equal(await fs.realpath(path.dirname(destination)), path.dirname(destination));
        await fs.writeFile(destination, bytes, { flag: 'wx' });
      }
      assert.deepEqual(await fs.readFile(path.join(directory, KNOWLEDGE_CHECKER)), knowledgeChecker);
      if (useGenuineObjects) {
        const actualTree = await run('git', ['--no-replace-objects', 'rev-parse',
          KNOWLEDGE_HEAD + '^{tree}'], directory);
        assert.equal(actualTree.code, 0);
        assert.equal(actualTree.stdout.trim(), KNOWLEDGE_TREE);
      }
      await body(directory);
    });
  } finally {
    assert.deepEqual(await fs.readFile(path.join(ROOT, KNOWLEDGE_SQL)), knowledgeOriginal);
  }
}

test('issued14140000 normal builder uses fixed8da, never changed local knowledge or generated modules', async () => {
  await knowledgeFixture(true, async directory => {
    const poisoned = [
      'js/services/rav-assistant.js',
      'knowledge/rav-assistant-research-material-v1.js',
      'js/core/ravscore-model-bundle.generated.js',
      'scripts/rollback-assets/ravscore-model-bundle.generated.js',
      'scripts/build-assistant-knowledge-binding-successor.mjs',
    ];
    const poison = Buffer.from("throw new Error('WORKTREE_SOURCE_MUST_NOT_BE_USED');\n");
    for (const relative of poisoned) {
      const destination = path.resolve(directory, relative);
      const inside = path.relative(directory, destination);
      assert(inside && !inside.startsWith('..') && !path.isAbsolute(inside));
      await fs.mkdir(path.dirname(destination), { recursive: true });
      assert.equal(await fs.realpath(path.dirname(destination)), path.dirname(destination));
      await fs.writeFile(destination, poison, { flag: 'wx' });
    }
    const checked = await run(process.execPath, [path.join(directory, KNOWLEDGE_CHECKER)], directory);
    assert.equal(checked.code, 0, checked.stderr);
    assert.equal(checked.signal, null);
    assert.equal(checked.stdout.trim(), KNOWLEDGE_RECEIPT);
    assert.equal(checked.stderr, '');
    for (const relative of poisoned) {
      assert.deepEqual(await fs.readFile(path.join(directory, relative)), poison);
    }
    assert.deepEqual(await fs.readFile(path.join(directory, KNOWLEDGE_SQL)), knowledgeOriginal);
  });
});

test('issued14140000 pinned source cannot excuse changed local SQL bytes', async () => {
  await knowledgeFixture(true, async directory => {
    await fs.appendFile(path.join(directory, KNOWLEDGE_SQL), '\n');
    assert.notEqual(sha(await fs.readFile(path.join(directory, KNOWLEDGE_SQL))), KNOWLEDGE_SQL_SHA);
    const checked = await run(process.execPath, [path.join(directory, KNOWLEDGE_CHECKER)], directory);
    assert.equal(checked.code, 1);
    assert.equal(checked.stdout, '');
    assert.equal(checked.stderr.trim(), 'ISSUED_LOCAL_14140000_MISMATCH; no future-runtime admission.');
  });
});

test('issued14140000 missing fixed8da objects rejects correct local SQL without fallback', async () => {
  await knowledgeFixture(false, async directory => {
    const missing = await run('git', ['--no-replace-objects', 'cat-file', '-e',
      KNOWLEDGE_HEAD + '^{commit}'], directory);
    assert.notEqual(missing.code, 0);
    assert.equal(sha(await fs.readFile(path.join(directory, KNOWLEDGE_SQL))), KNOWLEDGE_SQL_SHA);
    const checked = await run(process.execPath, [path.join(directory, KNOWLEDGE_CHECKER)], directory);
    assert.equal(checked.code, 1);
    assert.equal(checked.stdout, '');
    assert.equal(checked.stderr.trim(), 'ISSUED_SOURCE_OBJECT_UNAVAILABLE; no future-runtime admission.');
  });
});

test('issued14140000 CLI refuses source root hash and write overrides', async () => {
  await knowledgeFixture(true, async directory => {
    for (const args of [['--root', directory], ['--source', KNOWLEDGE_HEAD],
      ['--hash', KNOWLEDGE_SQL_SHA], ['--sourceOverrides', '{}'], ['--write']]) {
      const checked = await run(process.execPath,
        [path.join(directory, KNOWLEDGE_CHECKER), ...args], directory);
      assert.equal(checked.code, 1);
      assert.equal(checked.stdout, '');
      assert.equal(checked.stderr.trim(), 'ISSUED_SOURCE_CHECK_FAILED; no future-runtime admission.');
      assert.deepEqual(await fs.readFile(path.join(directory, KNOWLEDGE_SQL)), knowledgeOriginal);
    }
  });
});
