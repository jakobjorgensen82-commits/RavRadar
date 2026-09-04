import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { RELEASE_GATE_TEST_FILES } from './lib/release-gate-test-plan.mjs';

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
  assert.equal(scripts['release:gate'], 'node scripts/release-gate.mjs');
  const commands = expandSourceCommands(scripts, 'validate:source:checks');
  const gate = scripts['release:gate'];
  assert.equal(commands.filter(command => command === gate).length, 1, 'Exactly one full release gate is required');
  assert.equal(commands.at(-1), gate, 'The source declaration must retain its terminal release gate');
  const gateTests = new Set(RELEASE_GATE_TEST_FILES.map(file => `node ${file}`));
  return {
    gate,
    remaining: commands.filter(command => command !== gate && !gateTests.has(command)),
    reused: commands.filter(command => gateTests.has(command)),
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
  log(`SOURCE: full release gate first; ${plan.reused.length} identical test invocations need no second run.`);
  if (execute(plan.gate) !== 0) return 1;
  // Reuse exists only in this live invocation after the full gate succeeded.
  // No marker, file, environment flag or previous workflow can authorize it.
  for (const command of plan.remaining) {
    log(`SOURCE: ${command}`);
    if (execute(command) !== 0) return 1;
  }
  log('Full source validation passed; all declared checks covered.');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--plan'), 'Unsupported source option');
    const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
    const plan = buildSourceValidationPlan(scripts);
    if (process.argv[2] === '--plan') {
      console.log(JSON.stringify({ fullReleaseGate: true, gateTests: RELEASE_GATE_TEST_FILES.length,
        remainingCommands: plan.remaining.length, avoidedDuplicateInvocations: plan.reused.length }));
    } else process.exitCode = runSourceValidation(plan);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
