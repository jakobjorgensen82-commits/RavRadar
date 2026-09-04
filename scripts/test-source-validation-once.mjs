import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSourceValidationPlan, expandSourceCommands, runSourceValidation } from './validate-source-once.mjs';
import { RELEASE_GATE_TEST_FILES } from './lib/release-gate-test-plan.mjs';

const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
const plan = buildSourceValidationPlan(scripts);
const declared = expandSourceCommands(scripts, 'validate:source:checks');
const gateTests = RELEASE_GATE_TEST_FILES.map(file => `node ${file}`);
assert.equal(new Set(RELEASE_GATE_TEST_FILES).size, RELEASE_GATE_TEST_FILES.length);
for (const command of declared) assert.ok(command === plan.gate || plan.remaining.includes(command) || gateTests.includes(command), `Lost source check: ${command}`);
assert.deepEqual(plan.remaining, declared.filter(command => command !== plan.gate && !gateTests.includes(command)));
assert.ok(plan.reused.length >= 29, 'Expected measured duplicate coverage');
assert.ok(plan.remaining.includes('node scripts/build-ravscore-model-bundle.mjs --check'), 'Different arguments must not be treated as identical tests');

for (const changes of [
  { 'validate:source': 'node other.mjs' },
  { 'release:gate': 'node other.mjs' },
  { 'validate:source:checks': 'node scripts/test-score-engine.mjs' },
  { 'validate:source:checks': 'npm run release:gate && npm run release:gate' },
  { 'validate:source:checks': 'npm run release:gate && node scripts/test-score-engine.mjs' },
  { 'validate:source:checks': 'npm run missing' },
  { 'validate:source:checks': 'npm run validate:source:checks' },
  { 'validate:source:checks': 'echo ok || true && npm run release:gate' },
]) assert.throws(() => buildSourceValidationPlan({ ...scripts, ...changes }));

const calls = [];
assert.equal(runSourceValidation(plan, { execute: command => { calls.push(command); return 0; }, log() {} }), 0);
assert.deepEqual(calls, [plan.gate, ...plan.remaining]);
assert.equal(calls.filter(command => command === plan.gate).length, 1);
for (const failureIndex of [0, 1, calls.length - 1]) {
  let executed = 0;
  assert.equal(runSourceValidation(plan, { execute() { return executed++ === failureIndex ? 1 : 0; }, log() {} }), 1);
  assert.equal(executed, failureIndex + 1, 'A failed gate/test cannot produce success or authorize later work');
}
// Standalone production releasegate must execute the same complete inventory.
const gate = fs.readFileSync('scripts/release-gate.mjs', 'utf8');
assert.match(gate, /for\(const rel of RELEASE_GATE_TEST_FILES\)\{\s*const result=spawnSync\(process.execPath,\[rel\]/);
assert.match(gate, /ok\(result.status===0/);
assert.ok(gateTests.includes('node scripts/test-harmonie-binding-migration.mjs'));
console.log(`Source validation: complete coverage, full gate first, ${plan.reused.length} duplicate invocations removed, all failures remain blocking.`);
