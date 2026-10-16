import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
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
// Preserve all 47 baseline commands and the genuine issued213 historical check.
// Issued220 is checked by its genuine frozen source, never rebuilt against NEW.
// The exact NEW builder and bounded native group are separate required checks.
const issuedCheck = 'node scripts/check-account-assistant-issued-source.mjs';
const frozenCurrentCheck = 'node scripts/check-native-identity-frozen-i71-source.mjs';
const successorCheck = 'node scripts/build-native-sampling-identity-original-binding-successor.mjs --check';
const diagnosticCheck = 'node scripts/test-current-grid-prewrite-diagnostic.mjs';
const nativeFrozenCheck = 'node scripts/test-native-identity-frozen-i71-source.mjs';
const nativeTargets = [
  'scripts/test-native-sampling-identity-successor.mjs',
  'scripts/test-native-identity-normal-readiness.mjs',
  'scripts/test-native-identity-normal-routing.mjs',
  'scripts/test-owned-i71-native-identity-working.mjs',
  'scripts/test-native-identity-staging-working-copy.mjs',
  'scripts/test-native-identity-installed-migration-metadata.mjs',
  'scripts/test-native-identity-checkpoint-runtime.mjs',
  'scripts/test-native-identity-workflow.mjs',
];
const nativeCheck = 'node --test --test-concurrency 2 ' + nativeTargets.join(' ');
const epochTargets = [
  'scripts/test-weather-state-epoch-archive.mjs',
  'scripts/test-weather-state-epoch-input-view.mjs',
  'scripts/test-weather-state-epoch-callers.mjs',
  'scripts/test-weather-state-epoch.mjs',
  'scripts/test-weather-state-epoch-budget.mjs',
  'scripts/test-weather-state-epoch-workflow.mjs',
];
const epochCheck = 'node --test --test-concurrency 2 ' + epochTargets.join(' ');
assert.equal(scripts['test:weather-state-epoch'], epochCheck);
assert.equal(scripts['test:native-identity-successor'], nativeFrozenCheck + ' && ' + nativeCheck,
  'All eight native targets and explicit concurrency2 must remain in the same normal group.');
const successorChecks = [issuedCheck, frozenCurrentCheck, successorCheck, diagnosticCheck,
  nativeFrozenCheck, nativeCheck, epochCheck];
for (const check of successorChecks) {
  assert.equal(declared.filter(command => command === check).length, 1,
    'Issued, genuine OLD, NEW, native and pure diagnostic source must each be checked exactly once.');
}
assert.equal(declared.includes('node scripts/build-account-assistant-binding-successor.mjs --check'), false,
  'The immutable issued213 builder must not be rerun against current220 source.');
assert.equal(declared.includes('node scripts/build-current-grid-original-binding-successor.mjs --check'), false,
  'The immutable issued220 builder must run only inside its genuine frozen source, not against NEW.');
assert.ok(declared.filter(command => !successorChecks.includes(command)).length <= 47,
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
  { 'test:native-identity-successor': scripts['test:native-identity-successor']
    .replace('--test-concurrency 2', '--test-concurrency=2') },
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
// A source fallback is an offline check, not permission to borrow job credentials.
function assertOfflineTripInstallerSource(job) {
  assert.ok(job.includes('      - uses: actions/checkout@v7\n'
    + '        with:\n'
    + '          # Offline source fixtures archive genuine historical producer commits.\n'
    + '          fetch-depth: 0\n'),
  'source fallback must retain genuine historical Git objects, not just one legacy ref');
  assert.ok(job.includes("      - name: Validate exact source head before external writes\n"
    + "        id: source-gate\n"
    + "        if: steps.source-proof.outputs.required != 'false'\n"
    + '        run: env -u SUPABASE_ACCESS_TOKEN npm run validate:source\n'),
  'offline source child must receive no ambient Management-token key');
  assert.ok(job.includes('      SUPABASE_ACCESS_TOKEN: ' + '$' + '{{ secrets.SUPABASE_ACCESS_TOKEN }}\n'),
    'step-local isolation must not remove credentials needed by later approved operations');
}
for (const name of ['deploy-trip-storage', 'repair-existing-worker']) {
  const job = fixedJobs.get(name);
  assertOfflineTripInstallerSource(job);
  assert.throws(() => assertOfflineTripInstallerSource(job.replace('          fetch-depth: 0\n', '')),
    /genuine historical Git objects/);
  assert.throws(() => assertOfflineTripInstallerSource(job.replace(
    'run: env -u SUPABASE_ACCESS_TOKEN npm run validate:source', 'run: npm run validate:source')),
  /no ambient Management-token key/);
}
if (process.platform === 'linux') {
  const syntheticSourceEnv = {
    PATH: process.env.PATH,
    SUPABASE_ACCESS_TOKEN: 'synthetic-offline-source-token',
  };
  const sanitizedChild = spawnSync('env', ['-u', 'SUPABASE_ACCESS_TOKEN', process.execPath,
    '--input-type=module', '-e',
    "if(Object.hasOwn(process.env,'SUPABASE_ACCESS_TOKEN'))process.exit(1);"
      + "process.stdout.write('OFFLINE_TOKEN_ABSENT\\n');"],
  { env: syntheticSourceEnv, encoding: 'utf8', timeout: 5000 });
  assert.equal(sanitizedChild.error, undefined, 'the actual Linux env caller must execute');
  assert.equal(sanitizedChild.status, 0, 'the actual source child must have no token key');
  assert.equal(sanitizedChild.stdout, 'OFFLINE_TOKEN_ABSENT\n');
  assert.equal(sanitizedChild.stderr, '');
  assert.equal(syntheticSourceEnv.SUPABASE_ACCESS_TOKEN, 'synthetic-offline-source-token',
    'step-local removal must not mutate its parent environment');
} else {
  console.log('Linux env -u source-child token isolation: UNRUN on this platform.');
}

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
const actualFixedReadJob = fixedJobs.get('read-fixed-supabase-metadata');
const consoleOperation = 'fixed-public-rate-console-read-20261015';
for (const [name, job] of fixedJobs) assert.equal(operationAllows(job, consoleOperation),
  name === 'read-fixed-supabase-metadata');
const consoleReadStep = "      - name: Read the one fixed 15 October public rate console-log interval\n        if: inputs.operation == 'fixed-public-rate-console-read-20261015'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-public-rate-console-log-20261015.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n";
assert.equal(actualFixedReadJob.split(consoleReadStep).length, 2,
  'the separately tested console route must occur exactly once before historical projection');
assert.ok(actualFixedReadJob.indexOf('Require genuinely fresh idle main')
  < actualFixedReadJob.indexOf(consoleReadStep));
assert.doesNotMatch(actualFixedReadJob, /supabase db push|functions deploy|wrangler|upload-artifact|cache\/save|SUPABASE_DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY/);
// Remove only this exact additive step; preserve every historical assertion.
const fixedReadJob = actualFixedReadJob.replace(consoleReadStep, '');
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

// New Storage read is a fourth separately scoped fixed reader, never a write job.
const storageOperation='fixed-storage-upload-log-read-20261013';
for(const[name,job]of fixedJobs)assert.equal(operationAllows(job,storageOperation),name==='read-fixed-supabase-metadata');
const storageReadStep="      - name: Read the one fixed 13 October Storage upload-log interval\n        if: inputs.operation == 'fixed-storage-upload-log-read-20261013'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-storage-upload-log-20261013.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n";
assert.equal(fixedReadJob.split(storageReadStep).length,2);
assert.ok(fixedReadJob.indexOf('Require genuinely fresh idle main')<fixedReadJob.indexOf(storageReadStep));
assert.equal((fixedReadJob.match(/SUPABASE_ACCESS_TOKEN:/g)||[]).length,4);
const storageRemovedJob=fixedReadJob.replace(storageReadStep,'');
assert.equal((storageRemovedJob.match(/SUPABASE_ACCESS_TOKEN:/g)||[]).length,3);
for(const oldRead of ['read-typed-trip-catalog.mjs','read-fixed-public-rate-log-20261012.mjs','read-fixed-public-rate-log-20261013.mjs'])
  assert.equal(storageRemovedJob.split('node scripts/'+oldRead).length,2);
assert.equal(fixedSourceWorkflow.split('node scripts/test-fixed-storage-upload-log-20261013.mjs').length,2);
assert.ok(fixedSourceWorkflow.includes('run: npm run validate:source && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs'));
assert.doesNotMatch(fixedReadJob,/supabase db push|functions deploy|wrangler|upload-artifact|cache\/save|SUPABASE_DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY/);

console.log(`Source validation: ${calls.length} direkte produktionskritiske kommandoer, samlet fejlrapport og ingen bred release-/historiksuite; ny fast loglæsning bruger alene det beskyttede læsejob.`);
