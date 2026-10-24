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
  console.log('Native Linux supervisor-loss and owned GRIB provenance contracts not executed on this platform');
}

const transactionalCheckpointFile = 'test-dmi-transactional-checkpoint.py';
test('DMI canonical-time parsing and transactional ledger (6 current cases)', { timeout: 160_000 }, () => {
  const file = transactionalCheckpointFile;
  const result = spawnSync(python, ['-B', path.join(root, 'scripts', file),
    'CanonicalTimeParsingTests', 'CurrentLedgerCheckpointTests'], {
    cwd: root, env: environment, encoding: 'utf8', shell: false,
    timeout: 150_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
  assert.equal(result.error, undefined, `Synthetic Python runner failed: ${file}`);
  assert.equal(result.signal, null, `Synthetic Python runner interrupted: ${file}`);
  assert.equal(result.status, 0,
    `${file}\n${result.stdout || ''}\n${result.stderr || ''}`);
  assert.match(result.stderr, /^Ran 6 tests in [^\r\n]+\r?$/m,
    'The current parser and ledger classes must actually execute all six cases.');
  assert.match(result.stderr, /^OK\r?$/m,
    'The six current cases must finish without skipped tests.');
});
test('DMI retained current winner survives normal saved-step ledger and resume (1 case)', { timeout: 160_000 }, () => {
  const file = transactionalCheckpointFile;
  const result = spawnSync(python, ['-B', path.join(root, 'scripts', file),
    'TransactionalAssetTests.test_retained_current_winner_closes_real_main_stage_without_mutation'], {
    cwd: root, env: environment, encoding: 'utf8', shell: false,
    timeout: 150_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
  assert.equal(result.error, undefined, `Synthetic Python runner failed: ${file}`);
  assert.equal(result.signal, null, `Synthetic Python runner interrupted: ${file}`);
  assert.equal(result.status, 0,
    `${file}\n${result.stdout || ''}\n${result.stderr || ''}`);
  assert.match(result.stderr, /^Ran 1 test in [^\r\n]+\r?$/m,
    'The normal main, saved-step, ledger and resume case must actually execute once.');
  assert.match(result.stderr, /^OK\r?$/m,
    'The retained-winner case must finish without skipped tests.');
});
test('DMI ordinary/cold lead turns retain fair time and per-asset reserves (4 cases)', { timeout: 160_000 }, () => {
  const file = 'test-dmi-native-chain-continuity.py';
  const result = spawnSync(python, ['-B', path.join(root, 'scripts', file),
    'SchedulingContinuityTests.test_idw_lead_can_catch_up_multiple_hours_without_stealing_reserves',
    'SchedulingContinuityTests.test_cold_child_policy_is_not_an_env_only_or_ordinary48h_grant',
    'SchedulingContinuityTests.test_actual_cold_cap_guard_keeps_shared_asset_bound_and_per_asset_critical_reserves',
    'SchedulingContinuityTests.test_ordinary_lead_can_pass_eight_only_with_actual_fair_time_remaining'], {
    cwd: root, env: environment, encoding: 'utf8', shell: false,
    timeout: 150_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
  assert.equal(result.error, undefined, `Synthetic Python runner failed: ${file}`);
  assert.equal(result.signal, null, `Synthetic Python runner interrupted: ${file}`);
  assert.equal(result.status, 0,
    `${file}\n${result.stdout || ''}\n${result.stderr || ''}`);
  assert.match(result.stderr, /^Ran 4 tests in [^\r\n]+\r?$/m,
    'All four ordinary/cold scheduling and reserve cases must actually execute.');
  assert.match(result.stderr, /^OK\r?$/m,
    'The scheduling cases must finish without skipped tests.');
});
for (const file of [
  'test-copernicus-bounded-retry-4.0.289.py',
  'test-regional-current-operational.py',
  'test-current-operational-closure.py',
  'test-current-operational-live-builder.py',
  'test-current-operational-producer-chain.py',
  'test-dmi-bulk-supervised.py',
  ...(process.platform === 'linux' ? [
    'test-dmi-supervisor-parent-loss.py',
    'test-dmi-native-provenance.py',
  ] : []),
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
