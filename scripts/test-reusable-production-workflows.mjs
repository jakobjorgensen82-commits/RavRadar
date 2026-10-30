import assert from 'node:assert/strict';
import {createHash as conditions593TestHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {withFrozenNative0600TestSource} from './run-frozen-native0600-source-targets.mjs';
import { inverseCompletedRuntimeWorkflow } from './lib/completed-private-runtime-workflow-review.mjs';
await import('./test-completed-private-runtime-workflow-inverse.mjs');
await import('./test-completed-private-runtime-admission.mjs');
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import { nativeIdentityMigration } from './lib/native-sampling-identity-successor-source.mjs';
import { lastMileEnclosureMigration } from './lib/last-mile-enclosure-successor-source.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BINDING,accountStatisticsAssistantMigration,requireAccountStatisticsAssistantOutput}
  from './lib/account-statistics-assistant-successor-source.mjs';
import {NATIVE_ORIGINAL_CONTINUITY_BINDING,nativeOriginalContinuityMigration,requireNativeOriginalContinuityOutput}
  from './lib/native-original-continuity-successor-source.mjs';
import {ASSISTANT_LATER_H0_BINDING,assistantLaterH0Migration,requireAssistantLaterH0Output,
  ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,assistantPublic587SuccessorMigration,
  requireAssistantPublic587SuccessorOutput,readAssistantPublic587SuccessorCanonicalSource,
  ASSISTANT_PUBLIC588_SUCCESSOR_BINDING,assistantPublic588SuccessorMigration,
  requireAssistantPublic588SuccessorOutput,readAssistantPublic588SuccessorCanonicalSource,
  ASSISTANT_PUBLIC590_SUCCESSOR_BINDING,assistantPublic590SuccessorMigration,
  requireAssistantPublic590SuccessorOutput,readAssistantPublic590SuccessorCanonicalSource,
  ASSISTANT_PUBLIC591_SUCCESSOR_BINDING,assistantPublic591SuccessorMigration,
  requireAssistantPublic591SuccessorOutput,readAssistantPublic591SuccessorCanonicalSource}
  from './lib/assistant-later-h0-successor-source.mjs';

// Keep the payload-free operational control report inside this existing cheap
// workflow command so the source gate does not grow another process.
await import('./test-weather-operational-control-summary.mjs');
await import('./test-pages-generation-and-reentry.mjs');

import {
  PRODUCTION_WORKFLOW_INTERFACES,
  PRODUCTION_WORKFLOW_ROLES,
  PRODUCTION_WORKFLOW_SOURCES,
  concatenateProductionWorkflowSources,
  readProductionWorkflowSources,
} from './lib/production-workflow-sources.mjs';

// Keep the private national weather contract inside this existing cheap
// deploy-workflow command so the source gate does not grow another process.
await import('./test-national-weather-shadow-contract.mjs');

const rawSources = await readProductionWorkflowSources();
const sources = Object.freeze(
  Object.fromEntries(
    Object.entries(rawSources).map(([role, sourceText]) => [
      role,
      inverseCompletedRuntimeWorkflow(sourceText.replace(/\r\n/g, '\n'), role),
    ]),
  ),
);
const { orchestrator, build, deploy, recovery } = sources;
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

const checkpointEpochDeclarations = [
  '      weather_state_epoch_checkpoint_reentry:',
  '        required: false',
  '        type: boolean',
  '        default: false',
  '      weather_state_epoch_raw_cache_key:',
  '        required: false',
  '        type: string',
  "        default: ''",
  '',
].join('\n');
const checkpointEpochInputs = ['weather_state_epoch_checkpoint_reentry', 'weather_state_epoch_raw_cache_key'];
function inverseCheckpointEpochDeclarations(call) {
  assert.equal(call.split(checkpointEpochDeclarations).length, 2,
    'Invert only the two reviewed optional checkpoint declarations, exactly once');
  return call.replace(checkpointEpochDeclarations, '');
}
function assertCheckpointEpochInterface(actualBuild, actualManual) {
  const call = indentedBody(actualBuild, '  workflow_call:');
  const legacy = PRODUCTION_WORKFLOW_INTERFACES.build.inputs;
  const archiveIndex = legacy.indexOf('weather_state_epoch_archive_key');
  assert.equal(archiveIndex, 7, 'The old interface anchor must remain exact');
  assertExactKeys(directKeys(indentedBody(call, '    inputs:'), 6),
    [...legacy.slice(0, archiveIndex), ...checkpointEpochInputs, ...legacy.slice(archiveIndex)],
    'actual checkpoint build call inputs');
  assertExactKeys(directKeys(indentedBody(inverseCheckpointEpochDeclarations(call), '    inputs:'), 6),
    legacy, 'unchanged historical build interface');
  const manualInputs = indentedBody(actualManual, '  workflow_dispatch:');
  for (const [name, type, value] of [
    ['weather_state_epoch_checkpoint_reentry', 'boolean', 'false'],
    ['weather_state_epoch_raw_cache_key', 'string', "''"],
    ['weather_state_epoch_archive_key', 'string', "''"],
    ['weather_state_epoch_archive_catalog_sha256', 'string', "''"],
  ]) {
    const input = indentedBody(manualInputs, '      ' + name + ':');
    assert.match(input, /^        required: false$/m);
    assert.ok(input.includes('        type: ' + type + '\n'));
    assert.ok(input.includes('        default: ' + value));
  }
  const actualWith = indentedBody(jobBlock(actualManual, 'build-and-prepare'), '    with:');
  const fields = ['extended_provider_bootstrap', 'weather_state_epoch_bootstrap',
    'weather_state_epoch_checkpoint_reentry', 'weather_state_epoch_raw_cache_key',
    'weather_state_epoch_archive_key', 'weather_state_epoch_archive_catalog_sha256'];
  const expressions = fields.map(field => {
    const lines = [...actualWith.matchAll(new RegExp('^      ' + field + ': (.+)$', 'gm'))];
    assert.equal(lines.length, 1, 'Exactly one actual manual field: ' + field);
    const expression = lines[0][1].match(/^\$\{\{ (.+) \}\}$/)?.[1];
    assert.ok(expression, 'An actual caller expression is required: ' + field);
    return expression.replaceAll('needs.state-epoch-prewrite.', 'needs["state-epoch-prewrite"].');
  });
  for (const [bootstrap, reentry] of [[false, false], [true, false], [false, true]]) {
    const inputs = { weather_state_epoch_bootstrap: bootstrap,
      weather_state_epoch_checkpoint_reentry: reentry,
      weather_state_epoch_raw_cache_key: reentry ? 'synthetic-exact-raw' : '',
      weather_state_epoch_archive_key: reentry ? 'synthetic-saved-archive' : '',
      weather_state_epoch_archive_catalog_sha256: reentry ? 'synthetic-saved-catalog' : '' };
    const outputs = { archive_key: bootstrap ? 'synthetic-prewrite-archive' : '',
      archive_catalog_sha256: bootstrap ? 'synthetic-prewrite-catalog' : '' };
    const context = { inputs, needs: { 'state-epoch-prewrite': { outputs } } };
    assert.deepEqual(expressions.map(expression => runInNewContext(expression, context)),
      [bootstrap, bootstrap || reentry, reentry, inputs.weather_state_epoch_raw_cache_key,
        reentry ? inputs.weather_state_epoch_archive_key : outputs.archive_key,
        reentry ? inputs.weather_state_epoch_archive_catalog_sha256 : outputs.archive_catalog_sha256],
      'Actual default/fresh/reentry routing must preserve its separate archive and RAW sources');
  }
}
const checkpointEpochManual = inverseCompletedRuntimeWorkflow(fs.readFileSync(
  new URL('../.github/workflows/run-current-weather-once.yml', import.meta.url), 'utf8',
).replaceAll('\r\n', '\n'), 'once');
assertCheckpointEpochInterface(build, checkpointEpochManual);
for (const changed of [
  build.replace(checkpointEpochDeclarations, ''),
  build.replace(checkpointEpochDeclarations, checkpointEpochDeclarations
    .replace('        required: false', '        required: true')),
  build.replace(checkpointEpochDeclarations, checkpointEpochDeclarations
    .replace('        default: false', '        default: true')),
  build.replace(checkpointEpochDeclarations, checkpointEpochDeclarations
    + '      unreviewed_checkpoint_input:\n        required: false\n        type: boolean\n        default: false\n'),
]) {
  assert.notEqual(changed, build);
  assert.throws(() => assertCheckpointEpochInterface(changed, checkpointEpochManual));
}
for (const [before, after] of [
  ['extended_provider_bootstrap: ' + gh('inputs.weather_state_epoch_bootstrap == true'),
    'extended_provider_bootstrap: ' + gh('true')],
  ['weather_state_epoch_bootstrap: ' + gh('inputs.weather_state_epoch_bootstrap == true || inputs.weather_state_epoch_checkpoint_reentry == true'),
    'weather_state_epoch_bootstrap: ' + gh('false')],
  ['weather_state_epoch_checkpoint_reentry: ' + gh('inputs.weather_state_epoch_checkpoint_reentry'),
    'weather_state_epoch_checkpoint_reentry: ' + gh('true')],
  ['weather_state_epoch_raw_cache_key: ' + gh('inputs.weather_state_epoch_raw_cache_key'),
    'weather_state_epoch_raw_cache_key: ' + gh("''")],
  ['inputs.weather_state_epoch_archive_key || needs.state-epoch-prewrite.outputs.archive_key',
    'inputs.weather_state_epoch_archive_catalog_sha256 || needs.state-epoch-prewrite.outputs.archive_key'],
  ['inputs.weather_state_epoch_archive_catalog_sha256 || needs.state-epoch-prewrite.outputs.archive_catalog_sha256',
    'inputs.weather_state_epoch_archive_key || needs.state-epoch-prewrite.outputs.archive_catalog_sha256'],
]) {
  assert.equal(checkpointEpochManual.split(before).length, 2, 'Mutate exactly one actual caller expression');
  assert.throws(() => assertCheckpointEpochInterface(build, checkpointEpochManual.replace(before, after)));
}

function referencedNames(sourceText, namespace) {
  // The namespace is an expression token, never the suffix of a filename
  // such as ./scripts/lib/verified-dmi-progress-inputs.mjs in a Node step.
  const expression = new RegExp('(?<![A-Za-z0-9_./-])' + namespace + '\\.([A-Za-z0-9_-]+)', 'g');
  return [...new Set([...sourceText.matchAll(expression)].map(match => match[1]))].sort();
}
assert.deepEqual(referencedNames([
  "import helper from './scripts/lib/verified-dmi-progress-inputs.mjs';",
  'if: inputs.quick_confirmation == true',
  'value: ' + gh('inputs.quick_progress_source'),
].join('\n'), 'inputs'), ['quick_confirmation', 'quick_progress_source']);
assert.deepEqual(referencedNames('value: ' + gh('secrets.SUPABASE_SERVICE_ROLE_KEY'), 'secrets'),
  ['SUPABASE_SERVICE_ROLE_KEY']);

assert.deepEqual(PRODUCTION_WORKFLOW_SOURCES, {
  orchestrator: '.github/workflows/update-and-deploy.yml',
  build: '.github/workflows/reusable-weather-build.yml',
  deploy: '.github/workflows/reusable-pages-deploy.yml',
  recovery: '.github/workflows/reusable-operational-reentry.yml',
});
assert.deepEqual(PRODUCTION_WORKFLOW_ROLES, ['orchestrator', 'build', 'deploy', 'recovery']);
assert.equal(
  concatenateProductionWorkflowSources(sources),
  orchestrator + '\n' + build + '\n' + deploy + '\n' + recovery,
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
  ['workflow_dispatch'],
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
  const actualCall = indentedBody(sourceText, '  workflow_call:');
  const call = role === 'build' ? inverseCheckpointEpochDeclarations(actualCall) : actualCall;
  assertExactKeys(directKeys(indentedBody(call, '    inputs:'), 6), contract.inputs, role + ' call inputs');
  assertExactKeys(directKeys(indentedBody(call, '    secrets:'), 6), contract.secrets, role + ' call secrets');
  assertExactKeys(directKeys(indentedBody(call, '    outputs:'), 6), contract.outputs, role + ' call outputs');
  for (const input of contract.inputs) {
    const block = indentedBody(call, '      ' + input + ':');
    assert.match(block,
      contract.optionalInputs?.includes(input)
        ? /^        required: false$/m
        : /^        required: true$/m,
      role + ' required input: ' + input);
    assert.match(block, /^        type: (?:boolean|string)$/m, role + ' typed input: ' + input);
  }
  for (const secret of contract.secrets) {
    assert.match(
      indentedBody(call, '      ' + secret + ':'),
      contract.optionalSecrets?.includes(secret) ? /^        required: false$/m : /^        required: true$/m,
      role + ' exact secret requirement: ' + secret,
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
    [...contract.inputs, ...(role === 'build' ? checkpointEpochInputs : [])].sort(),
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
  ['contents', 'actions', 'pull-requests'],
  'build top permissions',
);
assertExactKeys(
  directKeys(indentedBody(buildInternal, '    permissions:'), 6),
  ['contents', 'actions', 'pull-requests'],
  'build job permissions',
);
assert.equal(build.includes('contents: write'), false, 'build contents remains read-only');
assert.equal(build.includes('actions: write'), false, 'build actions remains read-only');
assert.equal(build.includes('pull-requests: write'), false, 'build pull requests remain read-only');

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
assertExactKeys(
  directKeys(indentedBody(buildCaller, '    permissions:'), 6),
  ['contents', 'actions', 'pull-requests'],
  'build caller forwards every reusable build permission',
);
assert.equal(buildCaller.includes('contents: write'), false, 'build caller contents remain read-only');
assert.equal(buildCaller.includes('actions: write'), false, 'build caller actions remain read-only');
assert.equal(buildCaller.includes('pull-requests: write'), false, 'build caller pull requests remain read-only');
assert.equal(
  buildCaller.includes('needs: [validate-dispatch, current-hour-readiness, trip-storage-readiness]'),
  true,
  'build caller directly needs dispatch and readiness gates',
);
assertExactKeys(directKeys(indentedBody(buildCaller, '    with:'), 6), buildContract.inputs, 'build caller inputs');
assert.match(buildCaller, /^      quick_confirmation: false$/m,
  'Automated production must not inherit manual short supplier budgets');
assert.match(buildCaller, /^      quick_progress_source: ''$/m,
  'Automated production has no one-off progress source');
assert.match(buildCaller, /^      checkpoint_only: false$/m,
  'Automated production does not inherit a manual provider-free continuation');
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
  'extended_provider_bootstrap',
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
assertExactKeys(
  directKeys(indentedBody(deployCaller, '    permissions:'), 6),
  ['contents', 'actions', 'pages', 'id-token'],
  'deploy caller forwards every reusable deploy permission',
);
assertExactKeys(directKeys(indentedBody(deployCaller, '    with:'), 6), deployContract.inputs.filter(name => name !== 'pre_activation_recovery'), 'deploy caller inputs');
assertExactKeys(directKeys(indentedBody(deployCaller, '    secrets:'), 6), deployContract.secrets, 'deploy caller secrets');
for (const input of [
  'active_deployment_id',
  'central_version',
  'integrated_implementation_closure_sha256',
]) {
  assert.equal(
    deployCaller.includes(input + ': ' + gh('needs.build-and-prepare.outputs.' + input)),
    true,
    'deploy caller input mapping: ' + input,
  );
}
for (const input of ['deployment_model', 'legacy_source_required', 'operational_action']) {
  assert.equal(
    deployCaller.includes(input + ': ' + gh('needs.build-and-prepare.outputs.' + input)),
    true,
    'deploy uses exact build output without first-launch fallbacks: ' + input,
  );
}
assert.equal(deployCaller.includes('code_only_repair: false'), true,
  'ordinary weather deploy explicitly remains non-code-only');

const dispatchOutputs = [
  'force',
  'extended_provider_bootstrap',
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
  'extended_provider_bootstrap=false',
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
  ['operational-recovery-gate', 'geometry_v2_pilot'],
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
  '--expected-head "$RAVRADAR_WEATHER_HANDOFF_EXPECTED_HEAD"',
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
  'Validate critical production artifact after fresh weather and current provenance',
  'Run release governance gate after refreshed data validation',
]) {
  assert.equal(
    indentedBody(build, '      - name: ' + stepName).includes("steps.weather-source-handoff.outputs.reused != 'true'"),
    false,
    'verified handoff retains rebuild/gate step: ' + stepName,
  );
}
const copernicusStageGate = indentedBody(
  build, '      - name: Require reusable Copernicus source stage before combined current closure',
);
const copernicusPreProviderInspect = indentedBody(
  build, '      - name: Inspect target-bound Copernicus source stage after fresh DMI',
);
assert.match(copernicusPreProviderInspect, /--persist-validated-rebase/,
  'normal pre-provider caller durably materializes a validated rebase before bounded acquisition');
assert.equal((build.match(/--persist-validated-rebase/g) || []).length, 1,
  'stage-only materialization belongs only to the explicit pre-provider caller');
assert.doesNotMatch(copernicusStageGate, /--allow-nonmatching-seal|--persist-validated-rebase/,
  'terminal source-stage gate reads exact on-disk evidence without rebase or writes');
const safeAcquisitionArtifact = indentedBody(
  build, '      - name: Preserve safe weather acquisition diagnostics before terminal gates',
);
assert.match(copernicusStageGate,
  /--github-output data\/diagnostics\/copernicus-current-source-stage-safe\.env/,
  'normal Copernicus stage must record its safe selected/remaining pair counts');
assert.match(safeAcquisitionArtifact,
  /data\/diagnostics\/copernicus-current-source-stage-safe\.env/,
  'normal acquisition artifact must retain the safe Copernicus stage counts');
const weatherCacheStep = indentedBody(build, '      - name: Update central weather cache');
assert.match(
  weatherCacheStep,
  /timeout-minutes:\s*80/,
  'normal weather cache sealing has enough bounded time for the measured 118-hour public build',
);
assert.match(
  weatherCacheStep,
  /NODE_OPTIONS:\s*--max-old-space-size=8192/,
  'normal weather cache sealing has a sufficient Node heap for the integrated runtime build',
);
const privateWeatherVerificationDependencies = indentedBody(
  build,
  '      - name: Install private weather-component verification dependencies',
);
assert.match(
  privateWeatherVerificationDependencies,
  /python -m pip install --disable-pip-version-check -r requirements-copernicus\.txt/,
  'private weather verification dependencies are installed explicitly',
);
assert.equal(
  build.indexOf('name: Install private weather-component verification dependencies')
    < build.indexOf('name: Restore newest compatible private runtime from protected storage'),
  true,
  'private weather verification dependencies precede protected runtime restore',
);
const secondPrivateRestore = indentedBody(
  build,
  '      - name: Verify and restore the private production runtime bundle',
);
assert.match(secondPrivateRestore, /private-runtime-second-restore-expectation\.mjs/);
assert.match(secondPrivateRestore, /--source-description "\$RUNNER_TEMP\/private-runtime-restored-source\.json"/);
assert.match(secondPrivateRestore, /--bundle-manifest "\$RAVRADAR_PRIVATE_RUNTIME_BUNDLE\/manifest\.json"/);
assert.match(secondPrivateRestore, /restore_expected="\$RUNNER_TEMP\/private-runtime-second-restore-expected\.json"/);
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

const sealedRecovery = fs.readFileSync(
  new URL('../.github/workflows/recover-sealed-weather-36396834072.yml', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');
assert.match(sealedRecovery, /workflow_dispatch:/);
assert.doesNotMatch(sealedRecovery, /\bschedule:/);
assert.match(sealedRecovery, /group: ravradar-weather-production-v2/);
assert.match(sealedRecovery, /ravscore-continuation-schema6-v2-36396834072-1/);
assert.match(sealedRecovery, /ravradar-private-build-stage-36396834072-1/);
assert.match(sealedRecovery, /cadd9b9dc605ac810ad2fbd6c5a73be834302dfb/);
assert.match(sealedRecovery, /ad864f1b29ad7f453f24eda7717bd10e837ad70147f87fa2b3ea77f3ee85592d/);
assert.match(sealedRecovery, /git diff --name-only "\$SOURCE_HEAD" "\$GITHUB_SHA"/);
assert.match(sealedRecovery, /--target-reference "\$TARGET_REFERENCE"/);
assert.match(sealedRecovery, /staged-private-production-runtime\.mjs open/);
assert.match(sealedRecovery, /mkdir -p "\$RAVRADAR_PRIVATE_RUNTIME_ROOT"/);
assert.match(sealedRecovery, /protected-private-production-runtime\.mjs/);
assert.doesNotMatch(sealedRecovery, /(?:run-current-weather-once|update-weather|run-dmi-bulk|run-copernicus|fill-open-meteo|npm run validate|npm run release:gate)/);
assert.equal(
  sealedRecovery.indexOf('Publish saved RavScore checkpoint')
    < sealedRecovery.indexOf('Authenticate and restore the exact sealed bundle'),
  true,
);
assert.equal(
  sealedRecovery.indexOf('Authenticate and restore the exact sealed bundle')
    < sealedRecovery.indexOf('Publish authenticated original private bundle'),
  true,
);
const checkpointTimeoutMigration = fs.readFileSync(
  new URL('../supabase/migrations/20260928112500_checkpoint_cas_bounded_timeout_55s.sql', import.meta.url),
  'utf8',
);
assert.match(checkpointTimeoutMigration,
  /alter function public\.ravradar_ravscore_checkpoint_cas\(bigint,timestamptz,jsonb\)\s+set statement_timeout = '55s';/);
assert.doesNotMatch(checkpointTimeoutMigration, /alter (?:role|database)/i);

// A later binding migration must not silently undo DEC-0249's scoped 55s
// setting. Checking the old corrective file alone missed the Top20 reset.
const migrationsUrl = new URL('../supabase/migrations/', import.meta.url);
let casTimeoutSettings = fs.readdirSync(migrationsUrl).filter(name => name.endsWith('.sql'))
  .sort().flatMap(name => [...fs.readFileSync(new URL(name, migrationsUrl), 'utf8').matchAll(
    /alter function public\.ravradar_ravscore_checkpoint_cas\(bigint,timestamptz,jsonb\)\s+set statement_timeout = '([^']+)';/g,
  )].map(match => ({ migration: name, timeout: match[1] })));
assert.equal(casTimeoutSettings.at(-1)?.timeout, '55s',
  'the final migration order must retain the established checkpoint-only 55s timeout');
// Kontrollér den faktisk udstedte public590/591-migration før de uændrede
// public588/590- og public587/588-inventarer. Kun dens ene præcise række fjernes.
// Actual issued592 is checked before projecting only its one55s row away.
// Existing whole591/590/588/587 timeout oracles stay unchanged below.
if(ASSISTANT_PUBLIC591_SUCCESSOR_BINDING!==null){
  requireAssistantPublic591SuccessorOutput();
  const canonical=await readAssistantPublic591SuccessorCanonicalSource();
  assert.equal(canonical.admission,'NO_ADMISSION');
  const migration=assistantPublic591SuccessorMigration();
  assert.equal(migration.version,ASSISTANT_PUBLIC591_SUCCESSOR_BINDING.version);
  const successor=migration.filename;
  const actualTimeoutInventory=casTimeoutSettings;
  assert.equal(actualTimeoutInventory.filter(row=>row.migration===successor).length,1,
    'Den udstedte592-migration skal have præcis én scoped55s-indstilling');
  assert.deepEqual(actualTimeoutInventory.at(-1),{migration:successor,timeout:'55s'},
    'Den eksakte udstedte592-migration skal være sidste scoped55s-efterfølger');
  casTimeoutSettings=actualTimeoutInventory.slice(0,-1);
  assert.deepEqual(actualTimeoutInventory,
    [...casTimeoutSettings,{migration:successor,timeout:'55s'}],
    'Hele det tidligere591/590/588/587-timeoutinventar bevares foran præcis én udstedt592-migration');
}
// TEST INVENTORY ONLY: preserve the whole uninstalled592 SQL source while
// removing only its exact55s row before the unchanged591/590 timeout oracles.
// The normal closed installation plan is checked separately; this grants no SQL admission.
if(ASSISTANT_PUBLIC591_SUCCESSOR_BINDING?.version==='20261030105202'){
  const name="20261029183010_assistant_public591_later_h0_original_bound_successor.sql";
  const bytes=fs.readFileSync(new URL(name,migrationsUrl));
  assert.equal(bytes.length,352862);
  assert.equal(conditions593TestHash('sha256').update(bytes).digest('hex'),"e5c7fb182d9491bd9222cb59dbefd3da4592867522dde805ea17e67c0d023e97");
  const inventory=casTimeoutSettings;
  assert.equal(inventory.filter(row=>row.migration===name).length,1);
  assert.deepEqual(inventory.at(-1),{migration:name,timeout:'55s'});
  casTimeoutSettings=inventory.slice(0,-1);
  assert.deepEqual(inventory,[...casTimeoutSettings,{migration:name,timeout:'55s'}]);
}
if(ASSISTANT_PUBLIC590_SUCCESSOR_BINDING!==null){
  requireAssistantPublic590SuccessorOutput();
  const canonical=await readAssistantPublic590SuccessorCanonicalSource();
  assert.equal(canonical.admission,'NO_ADMISSION');
  const migration=assistantPublic590SuccessorMigration();
  assert.equal(migration.version,ASSISTANT_PUBLIC590_SUCCESSOR_BINDING.version);
  const successor=migration.filename;
  const actualTimeoutInventory=casTimeoutSettings;
  assert.equal(actualTimeoutInventory.filter(row=>row.migration===successor).length,1,
    'Den udstedte591-migration skal have præcis én scoped55s-indstilling');
  assert.deepEqual(actualTimeoutInventory.at(-1),{migration:successor,timeout:'55s'},
    'Den eksakte udstedte591-migration skal være sidste scoped55s-efterfølger');
  casTimeoutSettings=actualTimeoutInventory.slice(0,-1);
  assert.deepEqual(actualTimeoutInventory,
    [...casTimeoutSettings,{migration:successor,timeout:'55s'}],
    'Hele det tidligere590/588/587-timeoutinventar bevares foran præcis én udstedt591-migration');
}
// Additiv590-kontrol først; de hele gamle588/587-orakler nedenfor bevares.
// Fjern kun denne præcise ene scoped55s-række fra TEST-inventarvisningen.
if(ASSISTANT_PUBLIC588_SUCCESSOR_BINDING!==null){
  requireAssistantPublic588SuccessorOutput();
  await readAssistantPublic588SuccessorCanonicalSource();
  const successor=assistantPublic588SuccessorMigration().filename;
  const actualTimeoutInventory=casTimeoutSettings;
  assert.equal(actualTimeoutInventory.filter(row=>row.migration===successor).length,1,
    'Den udstedte590-migration skal have præcis én scoped55s-indstilling');
  assert.deepEqual(actualTimeoutInventory.at(-1),{migration:successor,timeout:'55s'},
    'Den eksakte udstedte590-migration skal være sidste scoped55s-efterfølger');
  casTimeoutSettings=actualTimeoutInventory.slice(0,-1);
  assert.deepEqual(actualTimeoutInventory,
    [...casTimeoutSettings,{migration:successor,timeout:'55s'}],
    'Hele det tidligere588/587-timeoutinventar bevares foran præcis én udstedt590-migration');
}
// Kontrollér først hele den nye, kildeudstedte588-migration. Den uændrede
// gamle587-/forgængerprøve nedenfor ser kun dens præcise ene55s-efterfølger fjernet.
if(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING!==null){
  requireAssistantPublic587SuccessorOutput();
  await readAssistantPublic587SuccessorCanonicalSource();
  const successor=assistantPublic587SuccessorMigration().filename;
  const actualTimeoutInventory=casTimeoutSettings;
  assert.equal(actualTimeoutInventory.filter(row=>row.migration===successor).length,1,
    'Den udstedte588-migration skal have præcis én scoped55s-indstilling');
  assert.deepEqual(actualTimeoutInventory.at(-1),{migration:successor,timeout:'55s'},
    'Den eksakte udstedte588-migration skal være sidste scoped55s-efterfølger');
  casTimeoutSettings=actualTimeoutInventory.slice(0,-1);
  assert.deepEqual(actualTimeoutInventory,
    [...casTimeoutSettings,{migration:successor,timeout:'55s'}],
    'Hele den tidligere timeoutinventar bevares foran præcis én udstedt588-migration');
}
if(ACCOUNT_STATISTICS_ASSISTANT_BINDING!==null)requireAccountStatisticsAssistantOutput();
if(NATIVE_ORIGINAL_CONTINUITY_BINDING!==null)requireNativeOriginalContinuityOutput();
if(ASSISTANT_LATER_H0_BINDING!==null)requireAssistantLaterH0Output();
const assistantTimeoutMigration=ASSISTANT_LATER_H0_BINDING===null
  ? null : assistantLaterH0Migration().filename;
// Preserve the entire old latest-migration oracle, excluding only issued587.
const predecessorCasTimeoutSettings=assistantTimeoutMigration===null ? casTimeoutSettings
  : casTimeoutSettings.filter(row=>row.migration!==assistantTimeoutMigration);
assert.equal(predecessorCasTimeoutSettings.at(-1).migration,
  NATIVE_ORIGINAL_CONTINUITY_BINDING!==null ? nativeOriginalContinuityMigration().filename
    : ACCOUNT_STATISTICS_ASSISTANT_BINDING===null ? lastMileEnclosureMigration().filename : accountStatisticsAssistantMigration().filename);
assert.equal(predecessorCasTimeoutSettings.at(-1).timeout,'55s',
  'the unchanged issued predecessor retains its original scoped55s timeout');
if(assistantTimeoutMigration!==null)assert.deepEqual(casTimeoutSettings,
  [...predecessorCasTimeoutSettings,{migration:assistantTimeoutMigration,timeout:'55s'}],
  'Only one exact issued587 scoped55s successor may follow the whole predecessor timeout inventory');
if(ACCOUNT_STATISTICS_ASSISTANT_BINDING!==null)assert.deepEqual(
  casTimeoutSettings.find(item=>item.migration===accountStatisticsAssistantMigration().filename),
  {migration:accountStatisticsAssistantMigration().filename,timeout:'55s'},
  'the immutable actual585 predecessor also retains its original scoped55s timeout');
assert.deepEqual(casTimeoutSettings.find(item=>item.migration===lastMileEnclosureMigration().filename),
  {migration:lastMileEnclosureMigration().filename,timeout:'55s'},
  'the immutable actual584 predecessor also retains its original scoped55s timeout');
assert.deepEqual(casTimeoutSettings.find(item =>
  item.migration === '20261013220000_current_grid_original_bound_successor.sql'),
  { migration: '20261013220000_current_grid_original_bound_successor.sql', timeout: '55s' },
  'the immutable current-grid predecessor retains its original scoped timeout');
assert.deepEqual(casTimeoutSettings.find(item =>
  item.migration === '20261013210000_account_assistant_original_bound_successor.sql'),
  { migration: '20261013210000_account_assistant_original_bound_successor.sql', timeout: '55s' },
  'the installed account/assistant predecessor must retain its original scoped timeout');
assert.deepEqual(casTimeoutSettings.find(item =>
  item.migration === '20261010130000_owner_export_origin_bound_successor.sql'),
  { migration: '20261010130000_owner_export_origin_bound_successor.sql', timeout: '55s' },
  'the installed userdata predecessor must retain its original scoped timeout');
assert.deepEqual(casTimeoutSettings.find(item =>
  item.migration === '20261012200000_checkpoint_cas_single_projection_successor.sql'),
  { migration: '20261012200000_checkpoint_cas_single_projection_successor.sql', timeout: '55s' },
  'the installed single-projection predecessor must retain its original scoped timeout');
const restoredTimeoutMigration = fs.readFileSync(
  new URL('20261002094500_restore_checkpoint_cas_timeout.sql', migrationsUrl), 'utf8',
).replace(/\r\n?/g, '\n');
const top20BindingMigration = fs.readFileSync(
  new URL('20261002080000_top20_display_binding.sql', migrationsUrl), 'utf8',
).replace(/\r\n?/g, '\n');
const metadataFunction = sql => sql.match(
  /create or replace function public\.ravradar_ravscore_checkpoint_contract\(\)[\s\S]*?\n\$\$;/,
)?.[0];
const timeoutPredicate = `      'checkpointCasStatementTimeout55Seconds', coalesce((
        select 'statement_timeout=55s' = any (p.proconfig)
        from pg_catalog.pg_proc p where p.oid = v_cas_oid
      ), false),
`;
assert.ok(restoredTimeoutMigration.includes(timeoutPredicate));
assert.equal(metadataFunction(restoredTimeoutMigration).replace(timeoutPredicate, '')
  .replace("m.version::text = '20261002094500'", "m.version::text = '20261002080000'"),
metadataFunction(top20BindingMigration),
  'only the applied migration and new live timeout check may change metadata readback');
assert.equal([...restoredTimeoutMigration.matchAll(/create or replace function/g)].length, 1);
assert.doesNotMatch(restoredTimeoutMigration,
  /alter (?:role|database)|(?:insert into|update|delete from) public\.admin_documents|create.*(?:table|trigger)|drop\s/i);

console.log('Reusable production workflow interface and failure contracts passed.');

// Current-grid publication changes only its exact historical-to-current route.
await withFrozenNative0600TestSource('routing',async frozenRoot=>{
  const historicalImport = relative => import(pathToFileURL(path.join(frozenRoot,relative)).href);
  const { deferCurrentGridBindingEdges, currentGridEdgePublicationRequired, assertCurrentGridEdgeGeneration } =
    await historicalImport('scripts/lib/production-workflow-sources.mjs');
  const { ravScoreModelBinding } = await historicalImport('js/core/ravscore-model-contract.js');
  const { CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY: ffc,
    CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY: delivered,
    CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY: selected } =
    await historicalImport('scripts/lib/bounded-conditions-predecessor-transition.mjs');
  assert.equal(deferCurrentGridBindingEdges('20261013210000'), false);
  assert.equal(deferCurrentGridBindingEdges('20261013220000'), true);
  const { LATEST_RAVSCORE_BINDING_MIGRATION, LATEST_REQUIRED_CUTOVER_MIGRATION } =
    await historicalImport('scripts/integrated-cutover-readiness.mjs');
  assert.equal(LATEST_RAVSCORE_BINDING_MIGRATION.version, '20260920220000');
  assert.equal(LATEST_REQUIRED_CUTOVER_MIGRATION.version, nativeIdentityMigration().version);
  assert.equal(deferCurrentGridBindingEdges(LATEST_RAVSCORE_BINDING_MIGRATION.version), false);
  assert.equal(deferCurrentGridBindingEdges(LATEST_REQUIRED_CUTOVER_MIGRATION.version), true);
  const active = binding => ({ model: 'integrated', status: 'INTEGRATED_ACTIVE',
    pending: false, modelBinding: structuredClone(binding) });
  for (const policy of [ffc, delivered, selected]) {
    const current = active(policy.sourceModelBinding), before = structuredClone(current);
    assert.equal(await currentGridEdgePublicationRequired(current, 'integrated-historical-maintenance'), true);
    assert.deepEqual(current, before);
    for (const changed of [{ ...current, pending: true }, { ...current, status: 'PENDING' }])
      await assert.rejects(currentGridEdgePublicationRequired(changed, 'integrated-historical-maintenance'));
    await assert.rejects(currentGridEdgePublicationRequired(current, 'candidate-maintenance'));
  }
  assert.equal(await currentGridEdgePublicationRequired(active(ravScoreModelBinding()), 'integrated'), false);
  const foreign = active({ ...selected.sourceModelBinding, profileId: 'other' });
  await assert.rejects(currentGridEdgePublicationRequired(foreign, 'integrated-historical-maintenance'),
    /unknown public original binding/, 'a bundle-only match cannot authorize the native successor route');
  const oldGeneration = { ...active(selected.sourceModelBinding),
    datasetId: 'old', productionReferenceAt: '2026-10-13T00:00:00.000Z' };
  const nextGeneration = { schemaVersion: 4, complete: true, zoneCount: 210, coastalPartCount: 673,
    ravScoreModelBinding: ravScoreModelBinding(), ravScoreRuntime: { modelBinding: ravScoreModelBinding() },
    datasetId: 'next', productionReferenceAt: '2026-10-13T01:00:00.000Z' };
  await assertCurrentGridEdgeGeneration(oldGeneration, nextGeneration, nextGeneration.productionReferenceAt);
  for (const changed of [{ ...nextGeneration, productionReferenceAt: oldGeneration.productionReferenceAt },
    { ...nextGeneration, datasetId: 'old' }, { ...nextGeneration, ravScoreModelBinding: selected.sourceModelBinding },
    { ...nextGeneration, ravScoreModelBinding: undefined, modelBinding: ravScoreModelBinding() }])
    await assert.rejects(assertCurrentGridEdgeGeneration(oldGeneration, changed, nextGeneration.productionReferenceAt));
  await assert.rejects(assertCurrentGridEdgeGeneration(oldGeneration, nextGeneration, '2026-10-13T02:00:00.000Z'));
  const edge = indentedBody(build, '      - name: Deploy the three exact current-grid Edges only after new-generation gates');
  for (const id of ["weather","full-validation","release-gate","checkpoint-disposition","checkpoint-build","checkpoint-save","checkpoint-publish","private-runtime-bundle-create","private-build-stage-seal","private-build-stage-upload","private-runtime-publish","private-runtime-anon-audit","pages-build","pages-privacy"])
    assert(edge.includes('test "' + gh('steps.' + id + '.outcome') + '" = success'), id);
  assert(edge.includes('steps.current-grid-original-migration.outcome'));
  assert(edge.includes('check-production-target-freshness.mjs --target "$RAVRADAR_PRODUCTION_TARGET_HOUR" --maximum-age-minutes 150'));
  assert.doesNotMatch(edge, /continue-on-error|always\(\)|\|\| true|--no-verify-jwt|db push/);
  const deploys = [...edge.matchAll(/supabase functions deploy ([a-z-]+) --project-ref/g)].map(match => match[1]);
  assert.deepEqual(deploys, ['trip-log', 'submit-observation', 'ravradar-assistant']);
  const ordered = ['Audit the complete Pages artifact for private runtime material',
    'Preserve the exact current-grid Pages target before remote upload',
    "Current-grid pre-Edge - Configure GitHub Pages",
    "Current-grid pre-Edge - Upload GitHub Pages artifact",
    "Current-grid pre-Edge - Resolve and seal the exact uploaded Pages artifact",
    'Deploy the three exact current-grid Edges only after new-generation gates',
    'Require exact current-grid backend and Edge readiness after late deployment',
    'Seal current-grid historical maintenance only after late Edge readiness',
    'Seal privacy-safe operational deploy handoff', 'Upload GitHub Pages artifact'];
  for (let i = 1; i < ordered.length; i++) assert(build.indexOf('name: ' + ordered[i - 1]) < build.indexOf('name: ' + ordered[i]));
  for (const name of ["Require exact integrated backend and Edge readiness before integrated Pages", "Seal integrated return, initial cutover or historical maintenance plan after backend and public gates"])
    assert(indentedBody(build, '      - name: ' + name).includes("steps.current-grid-edge-route.outputs.required != 'true'"));
  const onceCaller = fs.readFileSync(new URL('../.github/workflows/run-current-weather-once.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(jobBlock(onceCaller, 'build-and-prepare').includes('SUPABASE_ACCESS_TOKEN: ' + gh('secrets.SUPABASE_ACCESS_TOKEN')));
  const binding = fs.readFileSync(new URL('../.github/workflows/apply-weather-model-binding-only.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(binding.includes("import { LATEST_REQUIRED_CUTOVER_MIGRATION } from './scripts/integrated-cutover-readiness.mjs';"));
  assert(binding.includes('deferCurrentGridBindingEdges(LATEST_REQUIRED_CUTOVER_MIGRATION.version)'));
  assert(!binding.includes('deferCurrentGridBindingEdges(LATEST_RAVSCORE_BINDING_MIGRATION.version)'));
  for (const name of ['Reconfirm exact main before assistant Edge deployment',
    'Deploy only the exact RavRadar assistant Edge function',
    'Verify exact backend and assistant readback without weather or Pages'])
    assert(indentedBody(binding, '      - name: ' + name).includes("if: inputs.diagnose_current_grid_original != true && steps.integrated-implementation.outputs.defer_edges != 'true'"),
      'Read-only diagnosis must exclude Edge while preserving the independent current-grid floor');

  const { assertCurrentGridEdgeArtifact } = await historicalImport('scripts/lib/production-workflow-sources.mjs');
  const { sha256CanonicalJson } = await historicalImport('scripts/ravscore-operational-pages-recovery.mjs');
  const identity = { repository: 'synthetic/repository', runId: 123, runAttempt: 1,
    headSha: 'a'.repeat(40), ref: 'refs/heads/main', attemptId: 'pages-123-1' };
  const implementation = { modelBinding: ravScoreModelBinding(), implementationClosureSha256: 'c'.repeat(64) };
  const seal = { schemaVersion: 'ravscore-operational-pages-artifact-seal-v1', ...identity,
    artifactId: 456, artifactName: 'github-pages', artifactDigestSha256: 'd'.repeat(64), artifactSizeBytes: 1234,
    targetPublicManifestSha256: sha256CanonicalJson(nextGeneration),
    targetImplementationClosureSha256: implementation.implementationClosureSha256,
    targetModelBinding: ravScoreModelBinding(), createdAt: '2026-09-01T00:00:00.000Z', privatePayloadIncluded: false };
  const allBefore = structuredClone({ oldGeneration, nextGeneration, seal, identity, implementation });
  assert.equal(await assertCurrentGridEdgeArtifact(oldGeneration, nextGeneration,
    nextGeneration.productionReferenceAt, seal, identity, implementation), sha256CanonicalJson(nextGeneration));
  for (const change of [{ artifactId: 0 }, { artifactDigestSha256: 'bad' }, { artifactSizeBytes: 0 },
    { runAttempt: 2 }, { headSha: 'b'.repeat(40) }, { privatePayloadIncluded: true },
    { targetPublicManifestSha256: 'f'.repeat(64) }, { targetImplementationClosureSha256: 'f'.repeat(64) },
    { targetModelBinding: selected.sourceModelBinding }, { extraField: true }])
    await assert.rejects(assertCurrentGridEdgeArtifact(oldGeneration, nextGeneration,
      nextGeneration.productionReferenceAt, { ...seal, ...change }, identity, implementation));
  for (const change of [{ ravScoreRuntime: { modelBinding: selected.sourceModelBinding } },
    { complete: false }, { coastalPartCount: 672 }, { zoneCount: 209 }])
    await assert.rejects(assertCurrentGridEdgeArtifact(oldGeneration, { ...nextGeneration, ...change },
      nextGeneration.productionReferenceAt, seal, identity, implementation));
  await assert.rejects(assertCurrentGridEdgeArtifact(oldGeneration, nextGeneration,
    nextGeneration.productionReferenceAt, seal, identity, { ...implementation, modelBinding: selected.sourceModelBinding }));
  assert.deepEqual({ oldGeneration, nextGeneration, seal, identity, implementation }, allBefore);
  for (const id of ["current-grid-pages-target","current-grid-pages-configure","current-grid-pages-upload","current-grid-pages-artifact-seal"])
    assert(edge.includes('test "' + gh('steps.' + id + '.outcome') + '" = success'), id);
  for (const [name, id] of [["Configure GitHub Pages","pages-configure"],["Upload GitHub Pages artifact","pages-upload"],["Resolve and seal the exact uploaded Pages artifact","pages-artifact-seal"]]) {
    const late = indentedBody(build, '      - name: ' + name);
    const early = indentedBody(build, '      - name: Current-grid pre-Edge - ' + name);
    assert(late.includes("steps.current-grid-edge-route.outputs.required != 'true'"));
    assert(early.includes("steps.current-grid-edge-route.outputs.required == 'true'"));
    const mapping = "steps.current-grid-edge-route.outputs.required == 'true' && steps.current-grid-" + id + '.outcome || steps.' + id + '.outcome';
    assert(build.includes(id.replaceAll('-', '_') + '_outcome: ' + gh(mapping)));
  }
  const remoteSeal = indentedBody(build, '      - name: Current-grid pre-Edge - Resolve and seal the exact uploaded Pages artifact');
  for (const required of ['steps.current-grid-pages-upload.outputs.artifact_id',
    'actions/artifacts/$artifact_id', '.expired == false', '.workflow_run.id == $runId',
    '.workflow_run.head_sha == $headSha', 'normalizeArtifactDigestSha256', '.size_in_bytes',
    'targetPublicManifestSha256', 'targetImplementationClosureSha256', 'targetModelBinding'])
    assert(remoteSeal.includes(required), required);
  const finalHandoff = indentedBody(build, '      - name: Seal privacy-safe operational deploy handoff');
  const selectedHead = finalHandoff.split('          else\n')[0];
  assert.doesNotMatch(selectedHead, /rm -rf|> .*pages-artifact-seal|cp .*manifest.json/);
  for (const required of ['cmp "_site/data/live/manifest.json"', 'assertCurrentGridEdgeArtifact',
    'assertIntegratedHistoricalMaintenancePlan', 'expectedCentralVersion: current.centralVersion',
    'plan.sourceModelBinding, current.modelBinding', 'plan.sourceImplementationClosureSha256, current.activeImplementationClosureSha256',
    'plan.requestedImplementationClosureSha256, seal.targetImplementationClosureSha256',
    'plan.integratedManifestSha256, seal.targetPublicManifestSha256',
    'plan.activeModelBinding, seal.targetModelBinding']) assert(finalHandoff.includes(required), required);
  assert.doesNotMatch(edge, /classifyRavScoreOperationalPagesRecovery|--begin|--activate/);
});


// The ordinary caller omits the new optional input and retains both default
// namespaces. Only the fixed internal recovery caller selects the new route.
assert.equal(deployCaller.includes('pre_activation_recovery:'),false);
assert.match(indentedBody(deploy,'      pre_activation_recovery:'),/default: false/);
const phaseResume=jobBlock(recovery,'resume-pre-activation');
const phasePages=jobBlock(recovery,'resume-pre-activation-pages');
assert.equal(phasePages.includes('pre_activation_recovery: true'),true);
assert.equal(phasePages.includes('uses: ./.github/workflows/reusable-pages-deploy.yml'),true);
assert.equal(phaseResume.includes('version: 2.117.0'),true);
for(const literal of ['for function in trip-log submit-observation ravradar-assistant;',
  '--claim-pre-activation','--restore-pre-activation','--publish-pre-activation','--assert-pre-activation-owner',
  'integrated-cutover-readiness.mjs publish','prepare-integrated-historical-maintenance','--prepare-pre-activation-handoff'])
  assert.equal(phaseResume.includes(literal),true,literal);
assert(phaseResume.indexOf('id: phase-pages-upload')<phaseResume.indexOf('--publish-pre-activation'));
assert(phaseResume.indexOf('--publish-pre-activation')<phaseResume.indexOf('supabase functions deploy'));
assert(phaseResume.indexOf('supabase functions deploy')<phaseResume.indexOf('integrated-cutover-readiness.mjs publish'));
assert(phaseResume.indexOf('integrated-cutover-readiness.mjs publish')<phaseResume.indexOf('prepare-integrated-historical-maintenance'));
assert(phaseResume.indexOf('prepare-integrated-historical-maintenance')<phaseResume.indexOf('--prepare-pre-activation-handoff'));
for(const sourceText of [orchestrator,fs.readFileSync('.github/workflows/run-current-weather-once.yml','utf8')])
  assert(jobBlock(sourceText.replace(/\r\n/g,'\n'),'operational-recovery-gate').includes('SUPABASE_ACCESS_TOKEN: '+gh('secrets.SUPABASE_ACCESS_TOKEN')));
assert(deploy.includes("|| 'github-pages'"));
assert(deploy.includes("|| format('pages-{0}-{1}', github.run_id, github.run_attempt)"));
assert(deploy.indexOf('id: deployment-terminal')<deploy.indexOf('--clear-pre-activation'));
assert(recovery.indexOf('--inspect-pre-activation')<recovery.indexOf('No durable RavScore transition'));
assert(jobBlock(recovery,'operational-recovery-gate').includes('test "$PHASE_COMPLETE_RESULT" = success'));

// The named original-preserving SQL prewrite must remain independent of Edge
// deferral. Recheck the exact 877b normal caller, not an older workflow fixture.
{
  const binding = fs.readFileSync(new URL('../.github/workflows/apply-weather-model-binding-only.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const names = [
    'Preserve authenticated unchanged originals for the named current-grid successor',
    'Dry-run and allow only the latest exact binding migration',
    'Reconfirm main immediately before the one database write',
    'Apply only the dry-run-verified binding migration',
    'Read back applied migration and live database binding',
  ];
  let previous = -1;
  for (const name of names) {
    const at = binding.indexOf('      - name: ' + name);
    assert(at > previous, 'original-preserving prewrite order: ' + name);
    previous = at;
    assert(!indentedBody(binding, '      - name: ' + name).includes('defer_edges'), 'Edge deferral must not skip SQL proof: ' + name);
  }
  const prepare = indentedBody(binding, '      - name: ' + names[0]);
  const dryRun = indentedBody(binding, '      - name: ' + names[1]);
  const apply = indentedBody(binding, '      - name: ' + names[3]);
  assert(prepare.includes('node scripts/current-grid-binding-prewrite.mjs prepare'));
  assert(dryRun.indexOf('supabase db push --linked --dry-run') >= 0);
  assert(dryRun.indexOf('supabase db push --linked --dry-run') < dryRun.indexOf('node scripts/current-grid-binding-prewrite.mjs verify-plan'));
  assert(apply.indexOf('node scripts/current-grid-binding-prewrite.mjs verify-plan') >= 0);
  assert(apply.indexOf('node scripts/current-grid-binding-prewrite.mjs verify-plan') < apply.indexOf('supabase db push --linked --skip-vault'));
  assert(indentedBody(binding, '      - name: ' + names[4]).includes('node scripts/integrated-cutover-readiness.mjs verify-db'));
}
