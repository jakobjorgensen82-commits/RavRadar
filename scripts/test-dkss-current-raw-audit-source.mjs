import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert.equal(process.platform, 'linux', 'DKSS_NATIVE_AUDIT_REQUIRES_LINUX');
assert.equal(process.argv.length, 2, 'DKSS_NATIVE_AUDIT_NO_OPTIONS');

const cwd = fileURLToPath(new URL('../', import.meta.url));
const env = Object.fromEntries(
  ['PATH', 'LD_LIBRARY_PATH', 'TMPDIR', 'LANG', 'LC_ALL', 'LC_CTYPE']
    .filter(key => typeof process.env[key] === 'string')
    .map(key => [key, process.env[key]]),
);
env.PYTHON = 'python';

function run(program, args, label) {
  const result = spawnSync(program, args, {
    cwd, env, shell: false, encoding: 'utf8', timeout: 25_000, maxBuffer: 128 * 1024,
  });
  assert.ok(!result.error && !result.signal && result.status === 0, label + '_CHILD_FAILED');
  return result;
}

const synthetic = run('python', ['-B', 'scripts/test-dkss-current-raw-audit.py'], 'DKSS_AUDIT_SYNTHETIC');
assert.ok(/^Ran 5 tests in [^\r\n]+\r?$/m.test(synthetic.stderr), 'DKSS_AUDIT_SYNTHETIC_COUNT');
assert.ok(/^OK\r?$/m.test(synthetic.stderr), 'DKSS_AUDIT_SYNTHETIC_REQUIRED');

const native = run('python', ['-B', 'scripts/test-native-current-grid.py', '--native',
  'NativeTests.test_actual_normal_candidates_against_native_index_array'], 'DKSS_AUDIT_NATIVE');
assert.ok(/^Ran 1 test in [^\r\n]+\r?$/m.test(native.stderr), 'DKSS_AUDIT_NATIVE_COUNT');
assert.ok(/^OK\r?$/m.test(native.stderr), 'DKSS_AUDIT_NATIVE_REQUIRED');
assert.ok(/^DKSS_CURRENT_RAW_NATIVE_COMPARISON_OK\r?$/m.test(native.stdout), 'DKSS_AUDIT_NATIVE_COMPARISON_REQUIRED');

const h0 = run(process.execPath, ['--test', '--test-reporter=tap',
  '--test-name-pattern=^offline DKSS audit input uses the normal admitted H0 row and exact native endpoints$',
  'scripts/test-protected-dmi-native-current-proofs.mjs'], 'DKSS_AUDIT_H0');
assert.ok(/^# pass 1\r?$/m.test(h0.stdout), 'DKSS_AUDIT_H0_COUNT');
assert.ok(/^# skipped 0\r?$/m.test(h0.stdout), 'DKSS_AUDIT_H0_REQUIRED');
console.log('DKSS_CURRENT_RAW_AUDIT_SOURCE_PASS');
