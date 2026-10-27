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

function executeCommand(command) {
  const [program, ...args] = command.split(' ');
  const result = spawnSync(program === 'node' ? process.execPath : program, args, {
    cwd: process.cwd(), stdio: 'inherit', shell: false,
  });
  return result.status === 0 && !result.error && !result.signal ? 0 : 1;
}

export function runSourceValidation(plan, { execute = executeCommand, log = console.log } = {}) {
  const failures = [];
  for (const command of plan.preflight) {
    log(`SOURCE binding preflight: ${command}`);
    if (execute(command) !== 0) failures.push(command);
  }
  for (const command of plan.remaining) {
    log(`SOURCE: ${command}`);
    if (execute(command) !== 0) failures.push(command);
  }
  log(`SOURCE critical gate: ${plan.gate}`);
  if (execute(plan.gate) !== 0) failures.push(plan.gate);
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
