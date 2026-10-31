import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Fail-fast binding checks make an invalid generated model obvious immediately.
// The remaining critical checks still run to completion and report together.
export const SOURCE_BINDING_PREFLIGHT = Object.freeze([
  'node scripts/build-ravscore-model-bundle.mjs --check',
  'node scripts/sync-ravscore-model-binding.mjs --check',
]);

export function expandSourceCommands(scripts, name, parents = []) {
  assert.ok(!parents.includes(name), `Cyclic source test script: ${name}`);
  assert.ok(typeof scripts[name] === 'string' && scripts[name].trim(), `Missing test script: ${name}`);
  return scripts[name].split(/\s*&&\s*/).flatMap(command => {
    const nested = command.match(/^npm run ([\w:-]+)$/);
    if (nested) return expandSourceCommands(scripts, nested[1], [...parents, name]);
    // Current source commands are literal node/python invocations. New shell
    // syntax needs explicit support, never silent dropping or shell execution.
    assert.match(command, /^(node|python)(?: [A-Za-z0-9_./:-]+)+$/, `Unsupported source command: ${command}`);
    return [command];
  });
}

export function buildSourceValidationPlan(scripts) {
  assert.equal(scripts['validate:source'], 'node scripts/validate-source-once.mjs');
  assert.equal(scripts['source:critical-gate'], 'node scripts/source-critical-gate.mjs');
  const commands = expandSourceCommands(scripts, 'validate:source:checks');
  const gate = scripts['source:critical-gate'];
  assert.equal(commands.filter(command => command === gate).length, 1, 'Exactly one critical source gate is required');
  assert.equal(commands.at(-1), gate, 'The critical source gate must remain the terminal source check');
  return {
    preflight: [...SOURCE_BINDING_PREFLIGHT],
    gate,
    remaining: commands.filter(command => command !== gate && !SOURCE_BINDING_PREFLIGHT.includes(command)),
  };
}

// Source checks run synthetic fixtures, not the hydrated production runtime.
// Keep the host/CI contract explicitly; never pass ambient provider credentials,
// runtime roots, loader options or alternate Git configuration to a child.
const SOURCE_HOST_ENVIRONMENT = new Set([
  'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'windir',
  'COMSPEC', 'ComSpec', 'SystemDrive', 'SYSTEMDRIVE', 'ProgramFiles',
  'ProgramFiles(x86)', 'ProgramW6432', 'HOME', 'USERPROFILE', 'HOMEDRIVE',
  'HOMEPATH', 'LOCALAPPDATA', 'APPDATA', 'PROGRAMDATA', 'ProgramData',
  'TEMP', 'TMP', 'TMPDIR', 'USER', 'USERNAME', 'LOGNAME', 'LANG', 'LANGUAGE',
  'LC_ALL', 'LC_CTYPE', 'TZ', 'TERM', 'CI', 'FORCE_COLOR', 'NO_COLOR',
  'PYTHON', 'PYTHON_EXECUTABLE', 'PULL_REQUEST_NUMBER',
  'GIT_NO_LAZY_FETCH', 'GIT_NO_REPLACE_OBJECTS', 'GIT_TERMINAL_PROMPT',
]);
// These are opt-in fixture sizes/measurements or local tool selectors. The
// historical source wrappers intentionally receive no RAVRADAR_* overrides.
const SOURCE_TEST_ENVIRONMENT = new Set([
  'RAVRADAR_PYTHON', 'RAVRADAR_TEST_BASH', 'RAVRADAR_POSIX_TEST_SHELL',
  'RAVRADAR_CHROME', 'RAVRADAR_TEST_LARGE_FORECAST',
  'RAVRADAR_TEST_DENSE_COHERENT_WORK_INPUT',
  'RAVRADAR_RECOVERY_PRIORITY_BENCHMARK', 'RAVRADAR_NATIVE_PROOF_BENCHMARK',
]);
function sourceChildEnvironment(command) {
  const testCommand = /(?:^| )scripts\/test-[^ ]+\.mjs(?: |$)/.test(command);
  return Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    SOURCE_HOST_ENVIRONMENT.has(key) || /^(?:GITHUB_|RUNNER_|SOURCE_GATE_)/.test(key)
      || (testCommand && SOURCE_TEST_ENVIRONMENT.has(key))));
}

function executeCommand(command) {
  const [program, ...args] = command.split(' ');
  const result = spawnSync(program === 'node' ? process.execPath : program, args, {
    cwd: process.cwd(), stdio: 'inherit', shell: false,
    env: sourceChildEnvironment(command),
  });
  return result.status === 0 && !result.error && !result.signal ? 0 : 1;
}

export function runSourceValidation(plan, { execute = executeCommand, log = console.log } = {}) {
  const failures = [];
  const executeTimed = (command, phase) => {
    const start = performance.now(), result = execute(command);
    log('SOURCE_TIME ' + JSON.stringify({ phase, command,
      elapsedMs: Math.max(0, Math.round(performance.now() - start)),
      outcome: result === 0 ? 'PASS' : 'FAIL' }));
    return result;
  };
  for (const command of plan.preflight) {
    log(`SOURCE binding preflight: ${command}`);
    if (executeTimed(command, 'binding') !== 0) failures.push(command);
  }
  if (failures.length) {
    log('Source binding preflight failed; dependent checks were not started.');
    return 1; // A red precondition is never a successful/reusable source proof.
  }
  for (const command of plan.remaining) {
    log(`SOURCE: ${command}`);
    if (executeTimed(command, 'check') !== 0) failures.push(command);
  }
  log(`SOURCE critical gate: ${plan.gate}`);
  if (executeTimed(plan.gate, 'critical') !== 0) failures.push(plan.gate);
  if (failures.length) {
    log(`Critical source validation found ${failures.length} failing check(s): ${failures.join(', ')}`);
    return 1;
  }
  log('Critical source validation passed; non-critical suites remain available for targeted or post-data validation.');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--plan'), 'Unsupported source option');
    const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
    const plan = buildSourceValidationPlan(scripts);
    if (process.argv[2] === '--plan') {
      console.log(JSON.stringify({ criticalSourceGate: true, bindingPreflight: plan.preflight.length,
        criticalChecks: plan.remaining.length + 1, totalCommands: plan.preflight.length + plan.remaining.length + 1 }));
    } else process.exitCode = runSourceValidation(plan);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
