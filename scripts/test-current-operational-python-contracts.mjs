import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// The existing bounded Node source group also owns these fixed Python
// regressions. No source command or production gate is removed or weakened.
const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.env.PYTHON || 'python';
const environment = Object.fromEntries(
  ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']
    .filter(key => typeof process.env[key] === 'string')
    .map(key => [key, process.env[key]]),
);
environment.PYTHONUTF8 = '1';
if (process.platform !== 'linux') {
  console.log('Native Linux supervisor-loss contract not executed on this platform');
}
for (const file of [
  'test-regional-current-operational.py',
  'test-current-operational-closure.py',
  'test-current-operational-live-builder.py',
  'test-current-operational-producer-chain.py',
  'test-dmi-bulk-supervised.py',
  ...(process.platform === 'linux' ? ['test-dmi-supervisor-parent-loss.py'] : []),
]) {
  test(file, { timeout: 160_000 }, () => {
    const result = spawnSync(python, ['-B', path.join(root, 'scripts', file)], {
      cwd: root, env: environment, encoding: 'utf8', shell: false,
      timeout: 150_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    });
    assert.equal(result.error, undefined, `Synthetic Python runner failed: ${file}`);
    assert.equal(result.signal, null, `Synthetic Python runner interrupted: ${file}`);
    assert.equal(result.status, 0,
      `${file}\n${result.stdout || ''}\n${result.stderr || ''}`);
  });
}
