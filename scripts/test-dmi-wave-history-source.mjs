import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const environment = Object.fromEntries(
  ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']
    .filter(key => typeof process.env[key] === 'string')
    .map(key => [key, process.env[key]]),
);
environment.PYTHONUTF8 = '1';

const result = spawnSync(process.env.PYTHON || 'python', [
  '-B', '-m', 'unittest',
  'scripts.test_dmi_wave_history_bootstrap',
  'scripts.test_dmi_wave_bootstrap_update_integration.OperationalWaveClosureTests',
], {
  cwd: root, env: environment, encoding: 'utf8', shell: false,
  timeout: 120_000, maxBuffer: 1024 * 1024, windowsHide: true,
});
assert.equal(result.error, undefined);
assert.equal(result.signal, null);
assert.equal(result.status, 0, result.stderr);
assert.match(result.stderr, /^Ran [1-9]\d* tests in [^\r\n]+\r?$/m);
assert.match(result.stderr, /^OK\r?$/m);
process.stdout.write(result.stderr);
