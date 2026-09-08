import assert from 'node:assert/strict';

import {
  PRODUCTION_WORKFLOW_INTERFACES,
  PRODUCTION_WORKFLOW_ROLES,
  PRODUCTION_WORKFLOW_SOURCES,
  concatenateProductionWorkflowSources,
  readProductionWorkflowSources,
} from './lib/production-workflow-sources.mjs';

const rawSources = await readProductionWorkflowSources();
const sources = Object.freeze(
  Object.fromEntries(
    Object.entries(rawSources).map(([role, sourceText]) => [
      role,
      sourceText.replace(/\r\n/g, '\n'),
    ]),
  ),
);
const { orchestrator, build, deploy } = sources;
const gh = expression => '$' + '{{ ' + expression + ' }}';

function indentedBody(sourceText, exactHeader) {
  const marker = exactHeader + '\n';
  const start = sourceText.indexOf(marker);
  assert.notEqual(start, -1, 'missing block header: ' + exactHeader);
  const headerIndent = exactHeader.match(/^ */)[0].length;
  const kept = [];
  for (const line of sourceText.slice(start + marker.length).split('\n')) {
    if (line === '') {
      kept.push(line);
      continue;
    }
    if (line.match(/^ */)[0].length <= headerIndent) break;
    kept.push(line);
  }
  return kept.join('\n');
}

const jobBlock = (sourceText, jobId) => indentedBody(sourceText, '  ' + jobId + ':');

function directKeys(block, indent) {
  const expression = new RegExp('^' + ' '.repeat(indent) + '([A-Za-z0-9_-]+):', 'gm');
  return [...block.matchAll(expression)].map(match => match[1]);
}

function assertExactKeys(actual, expected, label) {
  assert.deepEqual(actual, [...expected], label + ' exact ordered keys');
  assert.equal(new Set(actual).size, actual.length, label + ' duplicate keys');
}

function referencedNames(sourceText, namespace) {
  const expression = new RegExp(namespace + '\\.([A-Za-z0-9_-]+)', 'g');
  return [...new Set([...sourceText.matchAll(expression)].map(match => match[1]))].sort();
}

assert.deepEqual(PRODUCTION_WORKFLOW_SOURCES, {
  orchestrator: '.github/workflows/update-and-deploy.yml',
  build: '.github/workflows/reusable-weather-build.yml',
  deploy: '.github/workflows/reusable-pages-deploy.yml',
});
assert.deepEqual(PRODUCTION_WORKFLOW_ROLES, ['orchestrator', 'build', 'deploy']);
assert.equal(
  concatenateProductionWorkflowSources(sources),
  orchestrator + '\n' + build + '\n' + deploy,
  'role-aware concatenation order',
);

for (const [role, sourceText] of Object.entries({ build, deploy })) {
  assertExactKeys(directKeys(indentedBody(sourceText, 'on:'), 2), ['workflow_call'], role + ' trigger');
  assert.equal(sourceText.includes('\nconcurrency:'), false, role + ' callee cannot own concurrency');
  assert.equal(sourceText.includes('secrets: inherit'), false, role + ' uses exact secret allowlist');
  assert.equal(sourceText.includes('needs.'), false, role + ' cannot depend on caller needs');
  for (const unstableIdentity of ['GITHUB_JOB', 'github.job', 'workflow_ref', 'job_workflow_ref']) {
    assert.equal(sourceText.includes(unstableIdentity), false, role + ' avoids nested identity: ' + unstableIdentity);
  }
}
assertExactKeys(
  directKeys(indentedBody(orchestrator, 'on:'), 2),
  ['schedule', 'workflow_dispatch', 'push'],
  'orchestrator trigger',
);
assert.equal(orchestrator.includes('\nconcurrency:'), true, 'orchestrator remains sole concurrency owner');
assert.equal(orchestrator.includes('secrets: inherit'), false, 'callers use exact secret allowlists');

const contracts = [
  ['build', build, PRODUCTION_WORKFLOW_INTERFACES.build],
  ['deploy', deploy, PRODUCTION_WORKFLOW_INTERFACES.deploy],
];
assert.equal(PRODUCTION_WORKFLOW_INTERFACES.build.outputs.length, 28, 'exact 28 build outputs');
assert.equal(PRODUCTION_WORKFLOW_INTERFACES.deploy.outputs.length, 3, 'exact 3 deploy outputs');

for (const [role, sourceText, contract] of contracts) {
  const call = indentedBody(sourceText, '  workflow_call:');
  assertExactKeys(directKeys(indentedBody(call, '    inputs:'), 6), contract.inputs, role + ' call inputs');
  assertExactKeys(directKeys(indentedBody(call, '    secrets:'), 6), contract.secrets, role + ' call secrets');
  assertExactKeys(directKeys(indentedBody(call, '    outputs:'), 6), contract.outputs, role + ' call outputs');
  for (const input of contract.inputs) {
    const block = indentedBody(call, '      ' + input + ':');
    assert.match(block, /^        required: true$/m, role + ' required input: ' + input);
    assert.match(block, /^        type: (?:boolean|string)$/m, role + ' typed input: ' + input);
  }
  for (const secret of contract.secrets) {
    assert.match(
      indentedBody(call, '      ' + secret + ':'),
      /^        required: true$/m,
      role + ' required secret: ' + secret,
    );
  }
  for (const output of contract.outputs) {
    assert.equal(
      indentedBody(call, '      ' + output + ':').includes(
        'value: ' + gh('jobs.' + contract.jobId + '.outputs.' + output),
      ),
      true,
      role + ' output mapping: ' + output,
    );
  }
  assert.deepEqual(
    referencedNames(sourceText, 'inputs'),
    [...contract.inputs].sort(),
    role + ' input references equal declared interface',
  );
  assert.deepEqual(
    referencedNames(sourceText, 'secrets'),
    [...contract.secrets].sort(),
    role + ' secret references equal declared allowlist',
  );
  const jobs = indentedBody(sourceText, 'jobs:');
  assertExactKeys(directKeys(jobs, 2), [contract.jobId], role + ' one internal job');
  const internal = jobBlock(sourceText, contract.jobId);
  assertExactKeys(
    directKeys(indentedBody(internal, '    outputs:'), 6),
    contract.outputs,
    role + ' internal outputs',
  );
}

const buildContract = PRODUCTION_WORKFLOW_INTERFACES.build;
const deployContract = PRODUCTION_WORKFLOW_INTERFACES.deploy;
const buildInternal = jobBlock(build, buildContract.jobId);
const deployInternal = jobBlock(deploy, deployContract.jobId);

assertExactKeys(
  directKeys(indentedBody(build, 'permissions:'), 2),
  ['contents', 'actions'],
  'build top permissions',
);
assertExactKeys(
  directKeys(indentedBody(buildInternal, '    permissions:'), 6),
  ['contents', 'actions'],
  'build job permissions',
);
assert.equal(build.includes('contents: write'), false, 'build contents remains read-only');
assert.equal(build.includes('actions: write'), false, 'build actions remains read-only');

assertExactKeys(
  directKeys(indentedBody(deploy, 'permissions:'), 2),
  ['contents', 'actions', 'pages', 'id-token'],
  'deploy top permissions',
);
assertExactKeys(
  directKeys(indentedBody(deployInternal, '    permissions:'), 6),
  ['contents', 'actions', 'pages', 'id-token'],
  'deploy job permissions',
);
assert.equal(
  deployInternal.includes('    environment:\n      name: github-pages'),
  true,
  'Pages environment remains inside callee',
);
assert.equal(
  deployInternal.includes('url: ' + gh('steps.deployment.outputs.page_url')),
  true,
  'Pages URL remains bound to deployment step',
);

const buildCaller = jobBlock(orchestrator, 'build-and-prepare');
assert.equal(buildCaller.includes('uses: ./.github/workflows/reusable-weather-build.yml'), true, 'build call path');
assert.equal(buildCaller.includes('runs-on:'), false, 'build caller has no runner');
assert.equal(buildCaller.includes('steps:'), false, 'build caller has no steps');
assert.equal(
  buildCaller.includes('needs: [validate-dispatch, current-hour-readiness, trip-storage-readiness]'),
  true,
  'build caller directly needs dispatch and readiness gates',
);
assertExactKeys(directKeys(indentedBody(buildCaller, '    with:'), 6), buildContract.inputs, 'build caller inputs');
assertExactKeys(directKeys(indentedBody(buildCaller, '    secrets:'), 6), buildContract.secrets, 'build caller secrets');
for (const secret of buildContract.secrets) {
  assert.equal(
    buildCaller.includes(secret + ': ' + gh('secrets.' + secret)),
    true,
    'build caller secret mapping: ' + secret,
  );
}
for (const input of [
  'force',
  'produce_weather_handoff',
  'ravscore_integrated_first_cutover',
  'ravscore_integrated_return',
]) {
  assert.equal(
    buildCaller.includes(input + ': ' + gh("needs.validate-dispatch.outputs." + input + " == 'true'")),
    true,
    'normalized boolean call input: ' + input,
  );
}
for (const geometryOutput of ['geometry_v2_pilot', 'geometry_v2_national']) {
  assert.equal(
    buildCaller.includes('needs.validate-dispatch.outputs.' + geometryOutput),
    true,
    'normalized geometry flag remains in the caller condition: ' + geometryOutput,
  );
}

const deployCaller = jobBlock(orchestrator, 'deploy-pages');
assert.equal(deployCaller.includes('uses: ./.github/workflows/reusable-pages-deploy.yml'), true, 'deploy call path');
assert.equal(deployCaller.includes('runs-on:'), false, 'deploy caller has no runner');
assert.equal(deployCaller.includes('steps:'), false, 'deploy caller has no steps');
assert.equal(deployCaller.includes('environment:'), false, 'deploy environment is callee-owned');
assertExactKeys(directKeys(indentedBody(deployCaller, '    with:'), 6), deployContract.inputs, 'deploy caller inputs');
assertExactKeys(directKeys(indentedBody(deployCaller, '    secrets:'), 6), deployContract.secrets, 'deploy caller secrets');
for (const input of deployContract.inputs) {
  assert.equal(
    deployCaller.includes(input + ': ' + gh('needs.build-and-prepare.outputs.' + input)),
    true,
    'deploy caller input mapping: ' + input,
  );
}

const dispatchOutputs = [
  'force',
  'produce_weather_handoff',
  'produce_weather_handoff_confirmation',
  'geometry_v2_pilot',
  'geometry_v2_national',
  'ravscore_candidate_g_rollback_mode',
  'ravscore_candidate_g_rollback_confirmation',
  'ravscore_integrated_first_cutover',
  'ravscore_integrated_first_cutover_confirmation',
  'ravscore_integrated_weather_handoff_run_id',
  'ravscore_integrated_return',
  'ravscore_integrated_return_confirmation',
];
const validateDispatch = jobBlock(orchestrator, 'validate-dispatch');
assertExactKeys(
  directKeys(indentedBody(validateDispatch, '    outputs:'), 6),
  dispatchOutputs,
  'normalized dispatch outputs',
);
const defaultIndex = validateDispatch.indexOf('id: dispatch-defaults');
const validationIndex = validateDispatch.indexOf('Reject ambiguous or insufficiently authorized dispatch');
const validatedIndex = validateDispatch.indexOf('id: validated-dispatch');
assert.equal(defaultIndex >= 0 && defaultIndex < validationIndex, true, 'defaults precede validation');
assert.equal(validatedIndex > validationIndex, true, 'manual outputs follow validation');
assert.equal(
  validateDispatch.includes("if: success() && github.event_name == 'workflow_dispatch'"),
  true,
  'invalid manual values cannot be emitted',
);
for (const literal of [
  'force=false',
  'produce_weather_handoff=false',
  'produce_weather_handoff_confirmation=',
  'geometry_v2_pilot=false',
  'geometry_v2_national=false',
  'ravscore_candidate_g_rollback_mode=none',
  'ravscore_candidate_g_rollback_confirmation=',
  'ravscore_integrated_first_cutover=false',
  'ravscore_integrated_first_cutover_confirmation=',
  'ravscore_integrated_weather_handoff_run_id=',
  'ravscore_integrated_return=false',
  'ravscore_integrated_return_confirmation=',
]) {
  assert.equal(validateDispatch.includes(literal), true, 'safe default: ' + literal);
}

for (const [jobId, output] of [
  ['geometry-v2-national', 'geometry_v2_national'],
  ['geometry-v2-pilot', 'geometry_v2_pilot'],
  ['reconcile-operational-pending', 'geometry_v2_pilot'],
]) {
  assert.equal(
    jobBlock(orchestrator, jobId).includes('needs.validate-dispatch.outputs.' + output),
    true,
    jobId + ' uses normalized dispatch',
  );
}

assert.equal(
  buildCaller.includes(
    'ravscore_integrated_weather_handoff_run_id: ' +
      gh('needs.validate-dispatch.outputs.ravscore_integrated_weather_handoff_run_id'),
  ),
  true,
  'exact weather handoff run id is forwarded from validated dispatch',
);
for (const marker of [
  'WEATHER_HANDOFF_RUN_ID: ' + gh('inputs.ravscore_integrated_weather_handoff_run_id'),
  'A verified weather handoff is accepted only by an integrated first cutover.',
  '[[ ! "$WEATHER_HANDOFF_RUN_ID" =~ ^[1-9][0-9]{0,19}$ ]]',
]) {
  assert.equal(validateDispatch.includes(marker), true, 'dispatch handoff authorization: ' + marker);
}

for (const marker of [
  'PRODUCE_WEATHER_HANDOFF: ' + gh('inputs.produce_weather_handoff'),
  'PRODUCE_WEATHER_HANDOFF_CONFIRMATION: ' + gh('inputs.produce_weather_handoff_confirmation'),
  'Verified weather handoff producer confirmation is not exact.',
  'Verified weather handoff producer confirmation requires its explicit producer flag.',
  'PRODUCE-VERIFIED-WEATHER-SOURCE-HANDOFF',
]) {
  assert.equal(validateDispatch.includes(marker), true, 'normal handoff producer authorization: ' + marker);
}

const handoffResolve = indentedBody(build, '      - name: Resolve exact verified weather source producer run');
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && inputs.ravscore_integrated_weather_handoff_run_id != ''",
  'GITHUB_TOKEN: ' + gh('github.token'),
  'verified-weather-source-handoff.mjs resolve-run',
  '--expected-head "$GITHUB_SHA"',
  '--first-cutover ' + '"' + gh('inputs.ravscore_integrated_first_cutover') + '"',
  '--confirmation ' + '"' + gh('inputs.ravscore_integrated_first_cutover_confirmation') + '"',
]) assert.equal(handoffResolve.includes(marker), true, 'verified handoff resolve: ' + marker);

const handoffRestore = indentedBody(build, '      - name: Restore exact run-bound verified weather source cache');
assert.equal(handoffRestore.includes('path: .cache/verified-weather-source-handoff-cache'), true, 'fixed handoff cache root');
assert.equal(handoffRestore.includes('fail-on-cache-miss: true'), true, 'handoff cache miss fails closed');
assert.equal(handoffRestore.includes('restore-keys:'), false, 'handoff cache has no prefix fallback');

const handoffInstall = indentedBody(build, '      - name: Install exact verified weather sources atomically');
for (const marker of [
  'test ' + '"' + gh('steps.weather-source-handoff-cache.outputs.cache-matched-key') + '" = ' + '"' + gh('steps.weather-source-handoff-resolve.outputs.cache_key') + '"',
  'verified-weather-source-handoff.mjs install',
  '--artifact-attestation "$RUNNER_TEMP/ravradar-weather-source-handoff/artifact/attestation.json"',
  '--github-env "$GITHUB_ENV"',
]) assert.equal(handoffInstall.includes(marker), true, 'verified handoff install: ' + marker);

const normalHandoffReconfirm = indentedBody(
  build,
  '      - name: Reconfirm exact main before sealing normal verified weather source handoff',
);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && inputs.produce_weather_handoff == true",
  'test "$GITHUB_EVENT_NAME" = "workflow_dispatch"',
  'test "$GITHUB_REF" = "refs/heads/main"',
  'test "$(git rev-parse origin/main^{commit})" = "$EXPECTED_HEAD_SHA"',
  'candidate-maintenance|candidate-legacy-maintenance',
  'test "' + gh('steps.operational-model.outputs.initial_cutover_required') + '" = "true"',
]) assert.equal(normalHandoffReconfirm.includes(marker), true, 'normal handoff producer boundary: ' + marker);
for (const marker of [
  'candidate-g:true|legacy-candidate-g:true|legacy-candidate-g:false',
  'Weather handoff production requires a current pre-cutover maintenance state.',
]) assert.equal(build.includes(marker), true, 'normal handoff current-state admission: ' + marker);
assert.equal(
  build.indexOf('name: Run release governance gate after refreshed data validation')
    < build.indexOf('name: Reconfirm exact main before sealing normal verified weather source handoff'),
  true,
  'normal handoff remains after full validation and release gate',
);

for (const stepName of [
  'Update DMI bulk model cache',
  'Fill only exact-hour DMI gaps from Copernicus',
  'Fill only the exact remaining current gaps from Open-Meteo',
]) {
  assert.equal(
    indentedBody(build, '      - name: ' + stepName).includes("steps.weather-source-handoff.outputs.reused != 'true'"),
    true,
    'verified handoff skips only long forecast acquisition: ' + stepName,
  );
}
for (const stepName of [
  'Select exact-hour DMI gaps for targeted Copernicus supplement',
  'Inspect target-bound Copernicus source stage after fresh DMI',
  'Require reusable Copernicus source stage before combined current closure',
  'Build exact DMI-first current operational closure',
  'Build public seven-day current history and controlled live selection',
  'Update central weather cache',
  'Validate full project after fresh weather and current provenance',
  'Run release governance gate after refreshed data validation',
]) {
  assert.equal(
    indentedBody(build, '      - name: ' + stepName).includes("steps.weather-source-handoff.outputs.reused != 'true'"),
    false,
    'verified handoff retains rebuild/gate step: ' + stepName,
  );
}
assert.equal(
  build.indexOf('name: Install exact verified weather sources atomically')
    < build.indexOf('name: Restore the latest atomic schema-6 and Candidate G rollback checkpoint'),
  true,
  'attested target is installed before every target-bound restore',
);
assert.equal(
  build.indexOf('name: Build exact DMI-first current operational closure')
    < build.indexOf('name: Verify rebuilt closure exactly matches the run-bound source handoff'),
  true,
  'rebuilt closure is matched after reconstruction',
);
assert.equal(build.includes('single-use'), false, 'run-bound replay-safe handoff is not falsely described as single-use');

const outcome = jobBlock(orchestrator, 'production-outcome');
assert.equal(outcome.includes('if: always()'), true, 'outcome runs after callee failure');
assert.equal(
  outcome.includes('RAVRADAR_OUTCOME_JOB_BUILD: ' + gh('needs.build-and-prepare.result')),
  true,
  'build failure uses caller job result even when outputs are empty',
);
assert.equal(
  outcome.includes('RAVRADAR_OUTCOME_JOB_DEPLOY: ' + gh('needs.deploy-pages.result')),
  true,
  'deploy failure uses caller job result even when outputs are empty',
);
assert.equal(
  outcome.includes("if: always() && steps.classify.outputs.status == 'FAILED'"),
  true,
  'FAILED classification remains red',
);
assert.equal(outcome.includes('exit 1'), true, 'FAILED classification exits non-zero');
for (const output of [
  'preflight_should_run',
  'operational_action',
  'should_deploy',
  'weather_outcome',
  'full_validation_outcome',
  'release_gate_outcome',
  'pages_build_outcome',
  'pages_privacy_outcome',
  'handoff_upload_outcome',
  'checkpoint_disposition',
  'checkpoint_disposition_sha256',
  'checkpoint_dataset_id',
  'checkpoint_runtime_audit_sha256',
  'checkpoint_build_outcome',
  'checkpoint_save_outcome',
  'checkpoint_publish_outcome',
  'pages_configure_outcome',
  'pages_upload_outcome',
  'artifact_built',
]) {
  assert.equal(
    orchestrator.includes('needs.build-and-prepare.outputs.' + output),
    true,
    'retained outcome build consumer: ' + output,
  );
}
for (const output of deployContract.outputs) {
  assert.equal(
    outcome.includes('needs.deploy-pages.outputs.' + output),
    true,
    'retained deploy consumer: ' + output,
  );
}
assert.equal(
  orchestrator.includes(
    'RAVRADAR_OUTCOME_GEOMETRY_PILOT: ' +
      gh("needs.validate-dispatch.outputs.geometry_v2_pilot == 'true'"),
  ),
  true,
  'outcome pilot flag is normalized',
);
assert.equal(
  orchestrator.includes(
    'RAVRADAR_OUTCOME_GEOMETRY_NATIONAL: ' +
      gh("needs.validate-dispatch.outputs.geometry_v2_national == 'true'"),
  ),
  true,
  'outcome national flag is normalized',
);

console.log('Reusable production workflow interface and failure contracts passed.');
