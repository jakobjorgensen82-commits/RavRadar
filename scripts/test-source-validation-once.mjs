import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildSourceValidationPlan,
  expandSourceCommands,
  runSourceValidation,
  SOURCE_BINDING_PREFLIGHT,
} from './validate-source-once.mjs';

const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
const plan = buildSourceValidationPlan(scripts);
const declared = expandSourceCommands(scripts, 'validate:source:checks');

assert.deepEqual(plan.preflight, [...SOURCE_BINDING_PREFLIGHT]);
assert.deepEqual(plan.remaining, declared.filter(command => command !== plan.gate
  && !plan.preflight.includes(command)));
assert.equal(plan.gate, 'node scripts/source-critical-gate.mjs');
assert.ok(plan.preflight.includes('node scripts/build-ravscore-model-bundle.mjs --check'));
assert.ok(plan.preflight.includes('node scripts/sync-ravscore-model-binding.mjs --check'));
// Keep 47 bounded command groups. Related 4.0.519 regression files share a
// node --test command with their existing producer boundary; no old test is
// removed and no historical suite or network acquisition belongs here.
assert.ok(declared.length <= 47, `Kildegaten er igen blevet for bred: ${declared.length} kommandoer.`);
const invokedFiles = declared.flatMap(command => command.split(' ').filter(argument =>
  /^scripts\/test-[A-Za-z0-9_.-]+\.mjs$/.test(argument)));
for (const file of [
  'scripts/test-ravscore-integrated-generator.mjs',
  'scripts/test-ravscore-recovery-replay.mjs',
  'scripts/test-dmi-bulk-forecast-integration.mjs',
  'scripts/test-weather-component-normal-wireup.mjs',
  'scripts/test-weather-component-safe-summary.mjs',
  'scripts/test-dmi-protected-tuple-continuity.mjs',
  'scripts/test-weather-component-progress-cache.mjs',
  'scripts/test-weather-component-progress-workflow.mjs',
  'scripts/test-dmi-progress-inputs.mjs',
  'scripts/test-dmi-forecast-file.mjs',
  'scripts/test-current-provenance-sealing.mjs',
  'scripts/test-weather-acquisition-workflows.mjs',
  'scripts/test-source-validation-once.mjs',
  'scripts/test-open-meteo-part-bank.mjs',
  'scripts/test-open-meteo-part-runtime.mjs',
  'scripts/test-open-meteo-normal-component-chain.mjs',
]) {
  assert.equal(invokedFiles.filter(candidate => candidate === file).length, 1,
    `Den faktiske sourceplan skal køre ${file} præcis én gang, ikke kun erklære et ubrugt package-script.`);
}

for (const changes of [
  { 'validate:source': 'node other.mjs' },
  { 'source:critical-gate': 'node other.mjs' },
  { 'validate:source:checks': 'node scripts/test-score-engine.mjs' },
  { 'validate:source:checks': 'npm run source:critical-gate && npm run source:critical-gate' },
  { 'validate:source:checks': 'npm run source:critical-gate && node scripts/test-score-engine.mjs' },
  { 'validate:source:checks': 'npm run missing' },
  { 'validate:source:checks': 'npm run validate:source:checks' },
  { 'validate:source:checks': 'echo ok || true && npm run source:critical-gate' },
]) assert.throws(() => buildSourceValidationPlan({ ...scripts, ...changes }));

const calls = [];
assert.equal(runSourceValidation(plan, { execute(command) { calls.push(command); return 0; }, log() {} }), 0);
assert.deepEqual(calls, [...plan.preflight, ...plan.remaining, plan.gate]);

for (const failureIndex of calls.keys()) {
  let executed = 0;
  assert.equal(runSourceValidation(plan, {
    execute() { return executed++ === failureIndex ? 1 : 0; },
    log() {},
  }), 1);
  assert.equal(executed, calls.length, 'Alle uafhængige kritiske kontroller skal køres og rapporteres samlet.');
}

const sourceDeclaration = scripts['validate:source:checks'];
for (const required of [
  'test:ravscore-source-critical',
  'test:weather-source-critical',
  'test:water-source-production-chain',
  'test:water-regressions',
  'test:provider-continuity',
  'test:deploy-source-critical',
  'test:privacy-source-critical',
  'source:critical-gate',
]) assert.ok(sourceDeclaration.includes(required), `Den kritiske kildegate mangler ${required}.`);
for (const removed of [
  'validate:rdks',
  'test:rav-assistant',
  'test:feedback-learning',
  'test:hybrid-trip-storage',
  'test:adaptive-prediction',
  'test:admin-feature-reachability',
  'test:ravscore-rollback-oracle',
  'test:legacy-bootstrap-hydration',
  'test:workflow-action-contracts',
  'release:gate',
]) assert.ok(!sourceDeclaration.includes(removed), `${removed} hører ikke længere til i den faste kildegate.`);

console.log(`Source validation: ${calls.length} direkte produktionskritiske kommandoer, samlet fejlrapport og ingen bred release-/historiksuite.`);
