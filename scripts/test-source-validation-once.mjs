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
// Preserve the 47-command bounded baseline plus exactly one normal current
// account/assistant successor source check. No prior check is removed.
const successorCheck = 'node scripts/build-account-assistant-binding-successor.mjs --check';
assert.equal(declared.filter(command => command === successorCheck).length, 1,
  'The actual account/assistant successor must be checked exactly once.');
assert.ok(declared.filter(command => command !== successorCheck).length <= 47,
  `Kildegaten er igen blevet for bred uden den præcise efterfølgerkontrol: ${declared.length} kommandoer.`);
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

// The new fixed historical read uses the same guarded job, never a write job.
// Parse only the actual existing equality/and/or operation grammar here;
// this is a source routing assertion, not live GitHub or log-read proof.
const fixedOperation = 'fixed-public-rate-log-read-20261013';
const fixedWorkflow = fs.readFileSync('.github/workflows/deploy-trip-storage.yml', 'utf8').replace(/\r\n/g, '\n');
const fixedJobsSource = fixedWorkflow.slice(fixedWorkflow.indexOf('\njobs:\n'));
const fixedHeaders = [...fixedJobsSource.matchAll(/^  ([a-z0-9-]+):$/gm)];
const fixedJobs = new Map(fixedHeaders.map((row,index) => [row[1], fixedJobsSource.slice(row.index,
  fixedHeaders[index+1]?.index ?? fixedJobsSource.length)]));
assert.deepEqual([...fixedJobs.keys()].sort(), ['deploy-trip-storage','read-fixed-supabase-metadata','reject-unknown-operation','repair-existing-worker']);
function operationAllows(job,operation) {
  const expression = /^    if: \$\{\{ (.+) \}\}$/m.exec(job)?.[1];
  assert.ok(expression, 'Every actual operation job must retain an explicit condition.');
  return expression.split(' || ').some(disjunction => disjunction.split(' && ').every(clause => {
    const match = /^inputs\.operation (==|!=) '([a-z0-9-]*)'$/.exec(clause);
    assert.ok(match, 'Do not silently accept another routing grammar.');
    return match[1] === '==' ? operation === match[2] : operation !== match[2];
  }));
}
for (const [name,job] of fixedJobs) assert.equal(operationAllows(job,fixedOperation),name === 'read-fixed-supabase-metadata');
for (const operation of ['typed-trip-catalog-read','fixed-public-rate-log-read']) {
  assert.equal(operationAllows(fixedJobs.get('read-fixed-supabase-metadata'),operation),true);
  assert.equal(operationAllows(fixedJobs.get('reject-unknown-operation'),operation),false);
}
for (const [name,job] of fixedJobs) assert.equal(operationAllows(job,'unknown-read-operation'),name === 'reject-unknown-operation');
const fixedReadJob = fixedJobs.get('read-fixed-supabase-metadata');
for (const marker of ['test "$GITHUB_REPOSITORY" = jakobjorgensen82-commits/RavRadar',
  'test "$GITHUB_RUN_ATTEMPT" = 1','test "$GITHUB_REF" = refs/heads/main',
  'node scripts/weather-source-gate.mjs check','steps.fixed_read_source.outputs.required',
  'node scripts/check-fixed-supabase-account-read-idle.mjs']) assert.ok(fixedReadJob.includes(marker));
const newFixedRead = 'node scripts/read-fixed-public-rate-log-20261013.mjs';
assert.equal(fixedReadJob.split(newFixedRead).length-1,1);
assert.ok(fixedReadJob.indexOf('Require genuinely fresh idle main') < fixedReadJob.indexOf(newFixedRead));
assert.equal(fixedReadJob.split('node scripts/read-fixed-public-rate-log-20261012.mjs').length-1,1);
assert.doesNotMatch(fixedReadJob,/supabase db push|functions deploy|wrangler|upload-artifact|cache\/save|SUPABASE_DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY/);
const fixedSourceWorkflow = fs.readFileSync('.github/workflows/validate-pull-request.yml','utf8');
const normalFixedTarget = 'node scripts/test-fixed-public-rate-log-20261013.mjs';
assert.equal(fixedSourceWorkflow.split(normalFixedTarget).length-1,1);
assert.ok(fixedSourceWorkflow.includes('run: npm run validate:source && '+normalFixedTarget),
  'The required normal Source step must run the synthetic reader target only after the existing source gate succeeds.');

console.log(`Source validation: ${calls.length} direkte produktionskritiske kommandoer, samlet fejlrapport og ingen bred release-/historiksuite; ny fast loglæsning bruger alene det beskyttede læsejob.`);
