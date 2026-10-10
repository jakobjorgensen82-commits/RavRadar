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
// Keep the 47 existing bounded command groups; audit regressions share the
// existing workflow group. No check is removed and no provider is contacted.
assert.ok(declared.length <= 47, `Kildegaten er igen blevet for bred: ${declared.length} kommandoer.`);
assert.equal(declared.filter(command => command === 'python scripts/test-copernicus-current-pilot.py').length, 1);
assert.ok(fs.readFileSync('scripts/test-copernicus-current-pilot.py', 'utf8').includes(
  'runpy.run_path(str(ROOT / "scripts/test-copernicus-dataset-updating.py"), run_name="__main__")'),
  'The existing Copernicus source group must execute the actual subset/checkpoint regression suite.');
const pythonContractGroup = fs.readFileSync('scripts/test-current-operational-python-contracts.mjs', 'utf8');
const publicPrivacyGroup = fs.readFileSync('scripts/test-tracked-runtime-privacy.mjs', 'utf8');
for (const file of [
  'scripts/test-observation-production-mapping.mjs',
  'scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
  'scripts/test-public-page-resume-4.0.292.mjs',
  'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
  'scripts/test-auth-bootstrap-4.0.66.mjs',
  'scripts/test-user-account-trip-log-4.0.264.mjs',
  'scripts/test-profile-permission-owner-epoch.mjs',
  'scripts/test-delete-trip-owner-data-readback.mjs',
  'scripts/test-trip-evidence-controller-active-intent.mjs',
  'scripts/test-assistant-ui-error-boundary.mjs',
  'scripts/test-trip-evidence-upload-receipt.mjs',
  'scripts/test-trip-evidence-storage-interruption.mjs',
  'scripts/test-trip-storage-edge-transient-retry.mjs',
]) assert.equal(publicPrivacyGroup.split(`'${file}'`).length - 1, 1,
  `The existing source privacy group must execute ${file} exactly once.`);
assert.equal((pythonContractGroup.match(/'test-dmi-bulk-supervised\.py'/g) || []).length, 1,
  'The existing Python source group must execute the DMI supervisor regression exactly once.');
assert.equal((scripts['test:flow-arrow-runtime'].match(/node scripts\/test-current-arrow-land-mask\.mjs/g) || []).length, 1,
  'The existing flow-arrow group must verify the actual nationwide land mask exactly once.');
assert.equal((fs.readFileSync('scripts/source-critical-gate.mjs', 'utf8').match(/'test:flow-arrow-runtime'/g) || []).length, 1,
  'The normal source gate must retain the flow-arrow group exactly once.');
const invokedFiles = declared.flatMap(command => command.split(' ').filter(argument =>
  /^scripts\/test-[A-Za-z0-9_.-]+\.mjs$/.test(argument)));
for (const file of [
  'scripts/test-progressive-public-conditions-4.0.216.mjs',
  'scripts/test-public-nonblocking-forecast-4.0.83.mjs',
  'scripts/test-map-zoom-refresh-4.0.88.mjs',
  'scripts/test-source-validation-once.mjs',
  'scripts/test-tracked-runtime-privacy.mjs',
  'scripts/test-current-operational-python-contracts.mjs',
  'scripts/test-saved-weather-audit-workflow.mjs',
  'scripts/test-audit-saved-weather-inputs.mjs',
  'scripts/test-protected-dmi-native-current-proofs.mjs',
  'scripts/test-dmi-forecast-file.mjs',
  'scripts/test-weather-component-safe-summary.mjs',
  'scripts/test-weather-component-progress-cache.mjs',
  'scripts/test-weather-component-progress-workflow.mjs',
  'scripts/test-dmi-progress-inputs.mjs',
  'scripts/test-ravscore-recovery-replay.mjs',
  'scripts/test-dmi-bulk-forecast-integration.mjs',
  'scripts/test-weather-component-normal-wireup.mjs',
  'scripts/test-dmi-protected-tuple-continuity.mjs',
  'scripts/test-current-provenance-sealing.mjs',
  'scripts/test-open-meteo-part-bank.mjs',
  'scripts/test-open-meteo-part-runtime.mjs',
  'scripts/test-open-meteo-normal-component-chain.mjs',
]) {
  assert.equal(invokedFiles.filter(candidate => candidate === file).length, 1,
    `Source plan must run ${file} exactly once.`);
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
