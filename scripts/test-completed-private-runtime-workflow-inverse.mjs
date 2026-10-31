// Test-only source inverse. No native B/S fixture, providers or production calls.
import assert from 'node:assert/strict';
import { inverseFullGitPinnedSourcePreparationWorkflow, fullGitPinnedSourcePreparationWorkflowReview }
  from './lib/completed-private-runtime-workflow-review.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import { inverseRelease585WorkflowUserAgents, ordinaryStageWiringReview, inverseOrdinaryCompletedStageWorkflowWiring, assertEarlyCompletedRuntimeStageOrder, inverseEarlyCompletedRuntimeStage, inverseCompletedRuntimeWorkflow, inverseOrdinaryFullHistoryCheckout, inversePairedPrivateRuntimePublication, inverseOriginWeatherReadCredentials, assertCurrentHistoryRawRetentionOrder, inverseCurrentHistoryRawRetentionOrder, inverseCurrentFamilyColdStartWorkflow, inverseRelease584WorkflowUserAgents } from './lib/completed-private-runtime-workflow-review.mjs';
import { runInNewContext } from 'node:vm';
import { inverseNativeOriginalSchemaSelectorWorkflow, nativeOriginalSchemaSelectorWorkflowReview,
  inverseCurrentFamilyColdBudgetWorkflow, currentFamilyColdBudgetWorkflowReview,
  assistant587ColdBudgetCombinedWorkflowReview, inverseAssistant587ColdBudgetCombinedTo707Workflow,
  inverseAssistant587ColdBudgetCombinedTo587Workflow }
  from './lib/completed-private-runtime-workflow-review.mjs';
import { inverseCurrentFamilyColdCheckpointWorkflow, currentFamilyColdCheckpointWorkflowReview,
  assistant587ColdCheckpointCombinedWorkflowReview,
  inverseAssistant587ColdCheckpointCombinedToF83Workflow, inverseAssistant587ColdCheckpointCombinedToD5Workflow }
  from './lib/completed-private-runtime-workflow-review.mjs';
import { inverseRelease594WorkflowUserAgents, release594WorkflowUserAgentReview, inverseRelease593WorkflowUserAgents, release593WorkflowUserAgentReview, inverseRuntimeAuditExecutionWorkflow, runtimeAuditExecutionWorkflowReview, runtimeAuditExecution592WorkflowReview, inverseRelease592WorkflowUserAgents, release592WorkflowUserAgentReview, inverseWindTailCapacityWorkflow, windTailCapacityWorkflowReview, inverseRelease591WorkflowUserAgents, inverseRelease590WorkflowUserAgents, inverseRelease588WorkflowUserAgents, inverseLatestColdProgressWorkflow, latestColdProgressWorkflowReview,
  assistant587LatestColdCombinedWorkflowReview,
  inverseAssistant587LatestColdCombinedTo664aWorkflow, inverseAssistant587LatestColdCombinedTo2bWorkflow }
  from './lib/completed-private-runtime-workflow-review.mjs';
import { spawnSync } from 'node:child_process';
const sha = source => crypto.createHash('sha256').update(source).digest('hex');
const read = async relative => {
  const source = (await fs.readFile(new URL(relative, import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  const role = relative.endsWith('/reusable-weather-build.yml') ? 'build'
    : relative.endsWith('/run-current-weather-once.yml') ? 'once' : null;
  return role ? inverseCurrentFamilyColdStartWorkflow(source, role) : source;
};
const actualBuild = inversePairedPrivateRuntimePublication(await read('../.github/workflows/reusable-weather-build.yml'), 'build');
const build = inverseOrdinaryFullHistoryCheckout(actualBuild, 'build');
const once = await read('../.github/workflows/run-current-weather-once.yml');
const legacySha = '649f832d33e9efb1f2569c840b26818c23e39ffd98e7cf7b75de82afc3e62e6b';
test('release581 inverse preserves whole reviewed580 and the original completed-runtime oracle', () => {
  assert.equal(sha(build), 'c3f3f76aed3b1193d3c446f00018668ea165370bcdb92742c7139b2cd3e9ab7d');
  const previous = build.replaceAll('RavRadar/4.0.581', 'RavRadar/4.0.580');
  assert.equal(sha(previous), '41db6fb9dbde88f26cf6be776db5d712925e166ebc90e4db8f3d754954233615');
  assert.equal(sha(inverseCompletedRuntimeWorkflow(build, 'build')), legacySha);
  assert.equal(inverseCompletedRuntimeWorkflow(build, 'build'), inverseCompletedRuntimeWorkflow(previous, 'build'));
});
test('all three earlier exact UA layers and unchanged manual completed route remain accepted', () => {
  for (const version of ['580', '579', '578']) {
    assert.equal(sha(inverseCompletedRuntimeWorkflow(build.replaceAll('RavRadar/4.0.581', 'RavRadar/4.0.' + version), 'build')), legacySha);
  }
  assert.equal(sha(inverseCompletedRuntimeWorkflow(once, 'once')), '35c95da08399c252372ed3ea6feaa190edd9a6dc3632572a2e83d360fa18fd44');
});
test('all ten original completed-route source mutations still fail the exact inverse', () => {
  const mutations = [
    build.replace('inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run', 'true && (steps.preflight.outputs.should_run'),
    build.replace('id: private-runtime-install\n', 'id: private-runtime-install\n        if: false\n'),
    build.replace('test "${{ steps.full-validation.outcome }}" = success', 'true'),
    build.replace('test "${{ steps.release-gate.outcome }}" = success', 'true'),
    build.replace('test "${{ steps.checkpoint-publish.outcome }}" = success', 'true'),
    build.replace('test "${{ steps.ravscore-integrated-runtime-audit.outputs.runtime_audit_outcome }}" = success', 'true'),
    build.replace('id: current-grid-pages-upload\n', 'id: moved-pages-upload\n'),
    build.replace('completed_runtime_outcome: ${{ steps.completed-runtime-target.outcome }}', 'completed_runtime_outcome: success'),
    build.replace('completed-private-runtime-admission.mjs before-publish', 'true'),
    build.replace('weather_outcome: ${{ steps.weather.outcome }}', 'weather_outcome: success'),
  ];
  for (const changed of mutations) {
    assert.notEqual(changed, build);
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
});

// Actual C afterimages are tested separately. The eleven historical cases
// above retain their complete original assertions and exact predecessor bytes.
const coldWorkflowReview = JSON.parse(await read('./lib/current-family-cold-start-workflow-review.json'));
const coldActual = Object.fromEntries(await Promise.all(Object.entries(coldWorkflowReview.roles).map(async ([role, row]) =>
  [role, inverseRelease584WorkflowUserAgents((await fs.readFile(new URL('../' + row.relativePath, import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), role)])));
function coldBlock(source, header) {
  const marker = header + '\n', at = source.indexOf(marker);
  assert(at >= 0, 'Actual C workflow block: ' + header);
  const indent = header.match(/^ */)[0].length, kept = [];
  for (const line of source.slice(at + marker.length).split('\n')) {
    if (line.trim() && line.match(/^ */)[0].length <= indent) break;
    kept.push(line);
  }
  return kept.join('\n');
}
const coldStep = (source, name) => coldBlock(source, '      - name: ' + name);
const coldJob = name => coldBlock(coldActual.once, '  ' + name + ':');
const coldInputs = Object.freeze({ current_family_cold_start: false, completed_private_runtime: false,
  weather_state_epoch_bootstrap: false, weather_state_epoch_checkpoint_reentry: false,
  native_sampling_identity_original_recovery: false, quick_confirmation: false, checkpoint_only: false,
  quick_progress_source: '', produce_weather_handoff: false, ravscore_integrated_first_cutover: false,
  ravscore_integrated_return: false, ravscore_candidate_g_rollback_mode: '', force: true,
  extended_provider_bootstrap: false });
function coldEvaluate(expression, context) {
  return runInNewContext(expression.replace(/^\$\{\{\s*|\s*\}\}$/g, '')
    .replace(/\b(needs|steps)\.([a-zA-Z0-9_-]+)/g, (_, root, key) => root + '[' + JSON.stringify(key) + ']'),
  { inputs: { ...coldInputs }, always: () => true, cancelled: () => false, ...context });
}
function coldSelector(block) {
  const match = /^    +if: (.+)$/m.exec(block); assert(match, 'Actual explicit C/default selector'); return match[1];
}
function coldOrdinaryContext(enabled, outcome = 'failure', closed) {
  return { inputs: { ...coldInputs, current_family_cold_start: enabled },
    github: { ref: 'refs/heads/main', event_name: 'workflow_dispatch' }, steps: {
      preflight: { outputs: { should_run: 'true' } },
      'private-runtime-install': { outcome: 'success' },
      'weather-source-handoff': { outputs: { reused: 'false' } },
      'component-progress-restore': { outcome: 'success', outputs: { captured: 'true' } },
      'dmi-bulk': { outcome, outputs: { current_family_cold_producer_closed: closed } },
    } };
}
test('current-family C whole inverse retains f644 and refuses every missing changed or duplicated hunk', () => {
  assert.equal(coldWorkflowReview.baseHead, 'f6442a8bf16f631036bd7a310a1ce88dea655fd7');
  assert.deepEqual(Object.keys(coldWorkflowReview.roles), ['build', 'once']);
  for (const [role, row] of Object.entries(coldWorkflowReview.roles)) {
    const source = coldActual[role]; assert.equal(sha(source), row.actualSha256);
    const old = inverseCurrentFamilyColdStartWorkflow(source, role);
    assert.equal(sha(old), row.predecessorSha256);
    assert.equal(inverseCurrentFamilyColdStartWorkflow(old, role), old);
    assert.equal(inverseCurrentFamilyColdStartWorkflow(source, role === 'build' ? 'once' : 'build'), source);
    for (const [offset, actual] of row.edits) {
      assert(actual.length > 0, 'Current C delta has no silent deletion-only inverse');
      for (const substitute of ['', actual + actual, '?' + actual.slice(1)]) {
        const changed = source.slice(0, offset) + substitute + source.slice(offset + actual.length);
        assert.notEqual(changed, source);
        assert.equal(inverseCurrentFamilyColdStartWorkflow(changed, role), changed, 'Unknown whole bytes never enter C inverse');
        assert.throws(() => inverseCompletedRuntimeWorkflow(changed, role));
      }
    }
    assert.equal(inverseCurrentFamilyColdStartWorkflow(source + '\n# UNREVIEWED C DRIFT\n', role), source + '\n# UNREVIEWED C DRIFT\n');
  }
});
test('current-family C actual optional inventory and forwarding remain default false without new bindings', () => {
  for (const source of Object.values(coldActual)) {
    assert.equal((source.match(/^      current_family_cold_start:/gm) ?? []).length, source === coldActual.once ? 2 : 1);
    const input = coldBlock(source, '      current_family_cold_start:');
    assert.match(input, /^        required: false$/m); assert.match(input, /^        type: boolean$/m);
    assert.match(input, /^        default: false$/m);
  }
  const caller = coldJob('build-and-prepare');
  const field = key => { const rows = [...caller.matchAll(new RegExp('^      ' + key + ': (.+)$', 'gm'))]; assert.equal(rows.length, 1); return rows[0][1]; };
  for (const inputs of [{}, { current_family_cold_start: false }, { current_family_cold_start: true }, { weather_state_epoch_bootstrap: true }]) {
    assert.equal(coldEvaluate(field('current_family_cold_start'), { inputs }), inputs.current_family_cold_start === true);
    assert.equal(coldEvaluate(field('extended_provider_bootstrap'), { inputs }), inputs.weather_state_epoch_bootstrap === true || inputs.current_family_cold_start === true);
  }
  assert.match(caller, /^      force: true$/m);
  assert.equal(coldBlock(coldActual.build, '    secrets:'),
    coldBlock(inverseCurrentFamilyColdStartWorkflow(coldActual.build, 'build'), '    secrets:'),
    'No new reusable secret declaration or privilege');
  for (const name of ['Require the explicit fresh caller-only cold-start scope', 'Prepare strict active DMI donor or resumable candidate', 'Update DMI bulk model cache']) {
    const scope = coldStep(coldActual.build, name);
    assert(!scope.includes('SUPABASE_DB_PASSWORD')); assert(!scope.includes('SUPABASE_ACCESS_TOKEN'));
  }
});
test('current-family C actual reentry skip and target needs accept only the intended default or fresh path', () => {
  const recovery = coldSelector(coldJob('operational-recovery-gate'));
  const target = coldSelector(coldJob('current-main-target'));
  for (const enabled of [undefined, false, true]) for (const result of ['success', 'skipped', 'failure', 'cancelled']) for (const cancelled of [false, true]) {
    const inputs = { ...coldInputs }; if (enabled === undefined) delete inputs.current_family_cold_start; else inputs.current_family_cold_start = enabled;
    const context = { inputs, needs: { 'operational-recovery-gate': { result } }, cancelled: () => cancelled };
    assert.equal(coldEvaluate(recovery, context), enabled !== true);
    assert.equal(coldEvaluate(target, context), !cancelled && result === (enabled === true ? 'skipped' : 'success'));
  }
  assert.match(coldJob('current-main-target'), /^    needs: operational-recovery-gate$/m);
  assert(coldJob('build-and-prepare').includes('needs: [current-main-target, native-identity-prewrite, state-epoch-prewrite]'));
  assert(coldActual.once.includes('group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false'));
});
test('current-family C actual restore exclusion retains protected capture partial SAVE and sole fixed output', () => {
  const source = coldActual.build;
  const restore = coldStep(source, 'Restore encrypted private weather progress only');
  for (const enabled of [false, true]) assert.equal(coldEvaluate(coldSelector(restore), coldOrdinaryContext(enabled)), !enabled);
  const bind = coldStep(source, 'Bind optional progress to the exact protected baseline');
  const captured = bind.indexOf('weather-component-progress-cache.mjs capture-base');
  const isolated = bind.indexOf('if test "${{ inputs.current_family_cold_start }}" = true; then');
  const restored = bind.indexOf('weather-component-progress-cache.mjs restore');
  assert(captured >= 0 && captured < isolated && isolated < restored);
  assert.match(bind.slice(isolated, restored), /test "\$captured" = true\n            exit 0/);
  const prepare = coldStep(source, 'Prepare strict active DMI donor or resumable candidate');
  assert.match(prepare, /if test "\$\{\{ inputs.current_family_cold_start \}\}" = true; then\n            node scripts\/run-current-family-cold-start.mjs prepare/);
  assert(prepare.indexOf('run-current-family-cold-start.mjs prepare') < prepare.indexOf('source_kind=empty'));
  const dmi = coldStep(source, 'Update DMI bulk model cache');
  assert.match(dmi, /DMI_BULK_OUTPUT_PATH: \.cache\/dmi-candidate-progress\.json/);
  assert.match(dmi, /run-current-family-cold-start\.mjs run-dmi\n          else\n            python -u scripts\/run-dmi-bulk-supervised\.py/);
  for (const name of ['Reconfirm exact main before shared DMI GRIB cache', 'Encrypt newly saved private weather progress before later production steps']) {
    const value = coldStep(source, name);
    assert.equal(coldEvaluate(coldSelector(value), coldOrdinaryContext(false)), true);
    for (const closed of [undefined, '', 'false', 'true']) assert.equal(coldEvaluate(coldSelector(value), coldOrdinaryContext(true, 'failure', closed)), closed === 'true');
  }
  const seal = coldStep(source, 'Encrypt newly saved private weather progress before later production steps');
  assert(!seal.includes('steps.weather.outcome')); assert(seal.includes('steps.component-progress-restore.outputs.captured'));
  assert(seal.includes('weather-component-progress-cache.mjs save'));
  assert(source.indexOf(prepare) < source.indexOf('        id: current-history-demand\n'));
  const promotion = coldStep(source, 'Atomically promote the validated point candidate in central admin storage');
  assert.match(promotion, /run: python scripts\/promote-coastal-point-activation\.py/);
  for (const enabled of [undefined, false, true]) {
    const context = coldOrdinaryContext(enabled, 'success', 'true');
    context.steps.weather = { outcome: 'success' };
    context.steps['completed-runtime-admission'] = { outcome: 'success' };
    context.steps['operational-action'] = { outputs: { action: 'integrated' } };
    context.steps['point-candidate-readiness'] = { outcome: 'success', outputs: { ready: 'true', pending_promotion: 'true' } };
    context.pendingPromotionFilePresent = true; // Preserved OLD B may contain it.
    assert.equal(coldEvaluate(coldSelector(promotion), context), enabled !== true,
      'C may never PATCH admin through a retained pending promotion; defaults stay normal');
  }
});
test('current-family C actual hardstop precedes all later consumers and provider budgets are unchanged', () => {
  const source = coldActual.build, prior = inverseCurrentFamilyColdStartWorkflow(source, 'build');
  const dmiMarker = '      - name: Update DMI bulk model cache\n';
  const hardMarker = '      - name: Require actual cold-start producer cessation before other consumers\n';
  const at = source.indexOf(dmiMarker); assert(at >= 0);
  assert.equal(source.indexOf('      - name: ', at + dmiMarker.length), source.indexOf(hardMarker));
  const hard = coldStep(source, 'Require actual cold-start producer cessation before other consumers');
  assert(!hard.includes('continue-on-error:')); assert.match(hard, /test "\$PRODUCER_CLOSED" = true/);
  for (const outcome of ['success', 'failure', 'skipped', '']) assert.equal(coldEvaluate(coldSelector(hard), coldOrdinaryContext(true, outcome)), outcome !== 'skipped' && outcome !== '');
  assert.equal(coldEvaluate(coldSelector(hard), coldOrdinaryContext(false)), false);
  for (const name of ['Advance private point-candidate readiness without public score impact', 'Select exact-hour DMI gaps for targeted Copernicus supplement', 'Build exact DMI-first current operational closure', 'Update central weather cache'])
    assert(source.indexOf(hardMarker) < source.indexOf('      - name: ' + name + '\n'));
  const job = coldBlock(source, '  build-and-prepare:');
  const budget = /^    timeout-minutes: (.+)$/m.exec(job)?.[1]; assert(budget);
  for (const [inputs, expected] of [[{}, 230], [{ extended_provider_bootstrap: true }, 240], [{ current_family_cold_start: true }, 360], [{ weather_state_epoch_bootstrap: true }, 360]]) assert.equal(coldEvaluate(budget, { inputs }), expected);
  const dmi = coldStep(source, 'Update DMI bulk model cache'), oldDmi = coldStep(prior, 'Update DMI bulk model cache');
  for (const key of ['DMI_BULK_HOURS', 'DMI_BULK_MAX_DOWNLOAD_MB', 'DMI_BULK_RAW_CACHE_MAX_MB', 'DMI_BULK_MAX_RUNTIME_SECONDS',
    'DMI_BULK_FINALIZE_RESERVE_SECONDS', 'DMI_BULK_MAX_ASSETS_PER_COLLECTION', 'DMI_BULK_COLLECTIONS_PER_RUN',
    'DMI_BULK_REQUEST_TIMEOUT_SECONDS', 'DMI_BULK_ASSET_PROCESSING_TIMEOUT_SECONDS', 'DMI_BULK_SUPERVISED_FINALIZE_TIMEOUT_SECONDS']) {
    const expression = new RegExp('^          ' + key + ': (.+)$', 'm');
    assert.equal(expression.exec(dmi)?.[1], expression.exec(oldDmi)?.[1], 'Unchanged real provider budget: ' + key);
  }
});
test('current-family C actual Linux shell guards reject all mixed scopes and unproved writer cessation', { skip: process.platform !== 'linux' ? 'Actual bash execution is required by normal Linux CI; this Windows target is not that proof' : false }, () => {
  const render = (body, inputs) => body.split('        run: |\n')[1].replace(/^          /gm, '')
    .replace(/\$\{\{ (.+?) \}\}/g, (_, expression) => String(coldEvaluate(expression, { inputs })));
  const buildGuard = coldStep(coldActual.build, 'Require the explicit fresh caller-only cold-start scope');
  const manualGuard = coldStep(coldActual.once, 'Reject mixed caller-only cold-start modes before target selection');
  const inputs = { ...coldInputs, current_family_cold_start: true, extended_provider_bootstrap: true };
  const env = { PATH: process.env.PATH, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ATTEMPT: '1',
    RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_ID: '', RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_CATALOG_SHA256: '', RAVRADAR_WEATHER_STATE_EPOCH_RAW_CACHE_KEY: '' };
  const run = (script, environment) => {
    assert(script.split('\n').every(line => !line.trim() || /^(?:#|set |test )/.test(line.trim())), 'Only actual read-only shell guards are executed');
    const result = spawnSync('bash', ['--noprofile', '--norc', '-euo', 'pipefail', '-c', script], { env: environment, encoding: 'utf8', timeout: 3000 });
    assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.stdout, ''); assert.equal(result.stderr, ''); return result.status;
  };
  assert.equal(run(render(buildGuard, inputs), env), 0);
  for (const key of ['weather_state_epoch_bootstrap', 'weather_state_epoch_checkpoint_reentry', 'native_sampling_identity_original_recovery',
    'completed_private_runtime', 'quick_confirmation', 'checkpoint_only', 'produce_weather_handoff', 'ravscore_integrated_first_cutover', 'ravscore_integrated_return'])
    assert.notEqual(run(render(buildGuard, { ...inputs, [key]: true }), env), 0, key);
  for (const [key, value] of [['force', false], ['extended_provider_bootstrap', false], ['quick_progress_source', '123-1'], ['ravscore_candidate_g_rollback_mode', 'unreviewed']])
    assert.notEqual(run(render(buildGuard, { ...inputs, [key]: value }), env), 0, key);
  for (const [key, value] of [['GITHUB_EVENT_NAME', 'push'], ['GITHUB_REF', 'refs/heads/other'], ['GITHUB_RUN_ATTEMPT', '2'],
    ['RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_ID', 'synthetic'], ['RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_CATALOG_SHA256', 'synthetic'], ['RAVRADAR_WEATHER_STATE_EPOCH_RAW_CACHE_KEY', 'synthetic']])
    assert.notEqual(run(render(buildGuard, inputs), { ...env, [key]: value }), 0, key);
  const manualEnv = { ...env, COMPLETED: 'false', QUICK: 'false', PROGRESS: '', TARGET: '', EPOCH: 'false', REENTRY: 'false', NATIVE: 'false' };
  assert.equal(run(render(manualGuard, inputs), manualEnv), 0);
  for (const key of ['COMPLETED', 'QUICK', 'PROGRESS', 'TARGET', 'EPOCH', 'REENTRY', 'NATIVE', 'GITHUB_RUN_ATTEMPT'])
    assert.notEqual(run(render(manualGuard, inputs), { ...manualEnv, [key]: key === 'GITHUB_RUN_ATTEMPT' ? '2' : 'true' }), 0, key);
  const hard = render(coldStep(coldActual.build, 'Require actual cold-start producer cessation before other consumers'), inputs);
  for (const closed of ['', 'false', 'true']) assert.equal(run(hard, { ...env, PRODUCER_CLOSED: closed }), closed === 'true' ? 0 : 1);
});
test('partial UA conversion, unrelated drift and wrong role cannot enter the new exact layer', () => {
  for (const changed of [build.replace('RavRadar/4.0.581', 'RavRadar/4.0.580'), build + '\n# UNREVIEWED\n']) {
    assert.notEqual(changed, build);
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
  assert.throws(() => inverseCompletedRuntimeWorkflow(build, 'once'));
});
test('the original 96-edit build and seven-edit manual oracle is physically unchanged', async () => {
  const source = await read('./lib/completed-private-runtime-workflow-review.json');
  assert.equal(sha(source), 'c9ba84655b981fcb835813ca285b5c7279afbd5017af92542c29422c4f400e0b');
  const review = JSON.parse(source);
  assert.deepEqual(Object.keys(review.inverseReview), ['build', 'once']);
  assert.equal(review.inverseReview.build.edits.length, 96);
  assert.equal(review.inverseReview.once.edits.length, 7);
});

test('ordinary full-history checkout has one exact inverse before every unchanged historical oracle', () => {
  assert.equal(sha(actualBuild), '861fad7501e32d4b63c72caa598825b15fb5fb2758961a1187ed57858e5c01ce');
  assert.equal(actualBuild.split("      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n").length, 2);
  assert.equal(inverseOrdinaryFullHistoryCheckout(actualBuild, 'build'), build);
  assert.equal(inverseOrdinaryFullHistoryCheckout(build, 'build'), build);
  assert.equal(sha(build), 'c3f3f76aed3b1193d3c446f00018668ea165370bcdb92742c7139b2cd3e9ab7d');
  assert.equal(inverseCompletedRuntimeWorkflow(actualBuild, 'build'),
    inverseCompletedRuntimeWorkflow(build, 'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actualBuild, 'build')), legacySha);
  assert.equal(inverseOrdinaryFullHistoryCheckout(actualBuild, 'once'), actualBuild);
  assert.throws(() => inverseCompletedRuntimeWorkflow(actualBuild, 'once'));
});
test('ordinary checkout rejects depth regression, missing or duplicate block and unrelated changes', () => {
  const assertExactOrdinaryCheckout = source => {
    assert.equal(sha(source), '861fad7501e32d4b63c72caa598825b15fb5fb2758961a1187ed57858e5c01ce', 'Only the whole reviewed ordinary workflow is current');
    assert.equal(inverseOrdinaryFullHistoryCheckout(source, 'build'), build);
  };
  const mutations = [
    actualBuild.replace("          fetch-depth: 0", '          fetch-depth: 1'),
    actualBuild.replace("          fetch-depth: 0", "          fetch-depth: ${{ inputs.completed_private_runtime && '0' || '1' }}"),
    actualBuild.replace("          fetch-depth: 0\n", ''),
    actualBuild.replace("      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n", "      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n"),
    actualBuild.replace('actions/checkout@v7', 'actions/checkout@v6'),
    actualBuild.replace('RavRadar/4.0.581', 'RavRadar/4.0.580'),
    actualBuild + '\n# UNREVIEWED CHECKOUT CHANGE\n',
  ];
  for (const changed of mutations) {
    assert.notEqual(changed, actualBuild);
    assert.throws(() => assertExactOrdinaryCheckout(changed));
  }
  // The old conditional is still accepted only as the unchanged historical
  // oracle, not as the new ordinary checkout configuration.
  assert.equal(sha(inverseCompletedRuntimeWorkflow(mutations[1], 'build')), legacySha);
});

// Test-only evaluation of the two existing GH expression shapes, never real
// credentials or a runtime caller/authority API. Unknown expressions refuse.
function weatherCredentialBlock(source) {
  const marker='      - name: Update central weather cache\n';
  assert.equal(source.split(marker).length,2);
  const start=source.indexOf(marker),end=source.indexOf('\n      - name: ',start+marker.length);
  assert(end>start);return {start,end,text:source.slice(start,end)};
}
function assertOriginWeatherCredentials(source) {
  const {text}=weatherCredentialBlock(source);
  assert(text.includes("        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true')\n"));
  assert(text.includes('        run: npm run update:weather\n'));
  const fields=Object.fromEntries(['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY',
    'RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY'].map(key=>{
    const rows=[...text.matchAll(new RegExp('^          '+key+': (.+)$','gm'))];
    assert.equal(rows.length,1,'Exactly one weather env '+key);return [key,rows[0][1]];
  }));
  const secrets={SUPABASE_URL:'https://origin-credentials-test.invalid',
    SUPABASE_SERVICE_ROLE_KEY:'SYNTHETIC_TEST_ONLY_NO_PRIVILEGE',
    RAVRADAR_R2_ACCOUNT_ID:'SYNTHETIC_R2_ACCOUNT',RAVRADAR_R2_ACCESS_KEY_ID:'SYNTHETIC_R2_ACCESS',
    RAVRADAR_R2_SECRET_ACCESS_KEY:'SYNTHETIC_R2_NO_PRIVILEGE'};
  const evaluate=(expression,inputs)=>{
    const m=/^\$\{\{ (inputs\.weather_state_epoch_bootstrap && )?secrets\.([A-Z0-9_]+)( \|\| '')? \}\}$/.exec(expression);
    assert(m&&Object.hasOwn(secrets,m[2]),'Only existing explicit secret expression shapes');
    assert.equal(Boolean(m[1]),Boolean(m[3]),'Conditional expression must retain exact empty fallback');
    return m[1]&&!inputs.weather_state_epoch_bootstrap?'':secrets[m[2]];
  };
  for(const inputs of [
    {weather_state_epoch_bootstrap:false,quick_confirmation:false,checkpoint_only:false},
    {weather_state_epoch_bootstrap:false,quick_confirmation:true,checkpoint_only:false},
    {weather_state_epoch_bootstrap:false,quick_confirmation:false,checkpoint_only:true},
    {weather_state_epoch_bootstrap:false,native_sampling_identity_original_recovery:true},
    {weather_state_epoch_bootstrap:true,quick_confirmation:false,checkpoint_only:false},
  ]) {
    for(const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'])
      assert.equal(evaluate(fields[key],inputs),secrets[key],
        'Every actually executed eager-origin weather mode needs normal Supabase reads: '+key);
    for(const key of ['RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY'])
      assert.equal(evaluate(fields[key],inputs),inputs.weather_state_epoch_bootstrap?secrets[key]:'',
        'R2 must remain epoch-only: '+key);
  }
  assert.equal(fields.SUPABASE_URL,'${{ secrets.SUPABASE_URL }}');
  assert.equal(fields.SUPABASE_SERVICE_ROLE_KEY,'${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
}
test('normal eager-origin weather receives existing Supabase reads in ordinary quick checkpoint and epoch modes',async()=>{
  const source=await read('../.github/workflows/reusable-weather-build.yml');
  assertOriginWeatherCredentials(source);
  const old=inverseOriginWeatherReadCredentials(source,'build');
  assert.equal(sha(old),'fff327a65cf0a441f33da2e70e144802d11d5bcb8c0b8d570219f23a84970f11');
  assert.equal(inverseOriginWeatherReadCredentials(old,'build'),old);
  assert.equal(inversePairedPrivateRuntimePublication(source,'build'),actualBuild);
  assert.equal(sha(inverseCompletedRuntimeWorkflow(source,'build')),legacySha);
  assert.equal(inverseOriginWeatherReadCredentials(source,'once'),source);
  assert.throws(()=>inverseCompletedRuntimeWorkflow(source,'once'));
});
test('weather credential scope refuses conditional missing duplicate wrong-key R2 and gate mutations',async()=>{
  const source=await read('../.github/workflows/reusable-weather-build.yml');
  assertOriginWeatherCredentials(source);
  const mutate=(from,to)=>{const block=weatherCredentialBlock(source);
    assert.equal(block.text.split(from).length,2);
    return source.slice(0,block.start)+block.text.replace(from,to)+source.slice(block.end);};
  const mutations=[
    mutate('SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',"SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}"),
    mutate('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',"SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}"),
    mutate('          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n',''),
    mutate('          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n',''),
    mutate('          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n','          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n'),
    mutate('SUPABASE_URL: ${{ secrets.SUPABASE_URL }}','SUPABASE_URL: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}'),
    mutate("RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}",'RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}'),
    mutate("inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true')","steps.preflight.outputs.should_run == 'true'"),
  ];
  for(const changed of mutations){
    assert.notEqual(changed,source);assert.throws(()=>assertOriginWeatherCredentials(changed));
    assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
  }
  assert.throws(()=>inverseCompletedRuntimeWorkflow(source+'\n# UNREVIEWED CREDENTIAL DRIFT\n','build'));
});

test('actual committed RAW caller has one exact inverse before every unchanged historical layer', async () => {
  const source = await read('../.github/workflows/reusable-weather-build.yml');
  assertCurrentHistoryRawRetentionOrder(source);
  const previous = inverseCurrentHistoryRawRetentionOrder(source, 'build');
  assert.notEqual(previous, source);
  assert.equal(sha(previous), 'fd1cd664bdbdcf41ef2ad32e6ad5caf058a980b3093a3f4fc226ca1797854b49');
  assert.equal(inverseCurrentHistoryRawRetentionOrder(previous, 'build'), previous);
  assert.equal(inverseOriginWeatherReadCredentials(source, 'build'), inverseOriginWeatherReadCredentials(previous, 'build'));
  assert.equal(inversePairedPrivateRuntimePublication(source, 'build'), actualBuild);
  assert.equal(sha(inverseCompletedRuntimeWorkflow(source, 'build')), legacySha);
  assert.equal(inverseCurrentHistoryRawRetentionOrder(source, 'once'), source);
  assert.throws(() => inverseCompletedRuntimeWorkflow(source, 'once'));
});
test('actual RAW caller refuses missing duplicate misplaced changed and unrelated source mutations', async () => {
  const source = await read('../.github/workflows/reusable-weather-build.yml');
  assertCurrentHistoryRawRetentionOrder(source);
  const demand = "      - name: Plan bounded current history from the actual selected continuation\n", refresh = "      - name: Refresh DMI water-source registry\n", legacy = "      - name: Bind causal OLD current reconstruction to the materialized saved inputs\n";
  const start = source.indexOf(demand), end = source.indexOf(legacy, start);
  assert(end > start);
  const block = source.slice(start, end);
  const without = source.slice(0, start) + source.slice(end);
  const requirement = "          DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION: ${{ steps.private-runtime-install.outcome == 'success' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && inputs.weather_state_epoch_bootstrap != true && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && steps.historical-wave-transition.outputs.required != 'true' && 'true' || 'false' }}\n";
  const replaceOnce = (input, from, to) => {
    assert.equal(input.split(from).length, 2); return input.replace(from, to);
  };
  const mutations = [
    without,
    replaceOnce(source, block, block + block),
    replaceOnce(without, refresh, block + refresh),
    replaceOnce(without, legacy, legacy + block),
    replaceOnce(source, '--retain-committed-raw', '--retain-committed-raw-unreviewed'),
    replaceOnce(source, ' --retain-committed-raw', ''),
    replaceOnce(source, requirement, ''),
    replaceOnce(source, requirement, requirement + requirement),
    replaceOnce(source, requirement, requirement.replace("steps.private-runtime-install.outcome == 'success'", 'true')),
    replaceOnce(source, "        id: current-history-demand\n", "        id: unreviewed-current-history-demand\n"),
    source + '\n# UNREVIEWED RAW-RETENTION DRIFT\n',
  ];
  assert.equal(mutations.length, 11);
  for (const changed of mutations) {
    assert.notEqual(changed, source);
    assert.throws(() => assertCurrentHistoryRawRetentionOrder(changed));
    assert.equal(inverseCurrentHistoryRawRetentionOrder(changed, 'build'), changed,
      'Unknown bytes never enter this exact layer');
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
});

// Actual584 is qualified separately; all581/580/C/checkout/RAW cases above
// continue to receive only the exact whole predecessor, never a partial view.
test('release584 actual five User-Agent fields preserve the whole581 current-family-C source', async () => {
  const source = inverseEarlyCompletedRuntimeStage((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  assert.equal(sha(source), 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6');
  assert.equal((source.match(/^          WEATHER_USER_AGENT: "RavRadar\/4\.0\.584 /gm) ?? []).length, 5);
  const previous = inverseRelease584WorkflowUserAgents(source, 'build');
  assert.notEqual(previous, source);
  assert.equal(sha(previous), '4883b292423e162eec6f88d6402ef189adca71dc538fdfe22b7f91162f8ce4f0');
  assert.equal(previous, coldActual.build);
  assert.equal(inverseRelease584WorkflowUserAgents(previous, 'build'), previous);
  assert.equal(inverseCurrentFamilyColdStartWorkflow(source, 'build'),
    inverseCurrentFamilyColdStartWorkflow(previous, 'build'));
  assert.equal(inverseCompletedRuntimeWorkflow(source, 'build'),
    inverseCompletedRuntimeWorkflow(previous, 'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(source, 'build')), legacySha);
  assert.equal(inverseRelease584WorkflowUserAgents(source, 'once'), source);
  assert.throws(() => inverseCompletedRuntimeWorkflow(source, 'once'));
});
test('release584 rejects every partial UA conversion deletion duplication and unrelated whole-source change', async () => {
  const source = inverseEarlyCompletedRuntimeStage((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const current = 'RavRadar/4.0.584', pieces = source.split(current);
  assert.equal(pieces.length, 6);
  const mutations = Array.from({ length: 5 }, (_, changedAt) => pieces.reduce((text, piece, index) =>
    text + (index ? index - 1 === changedAt ? 'RavRadar/4.0.581' : current : '') + piece, ''));
  const line = source.split('\n').find(row => row.includes('WEATHER_USER_AGENT: "' + current));
  assert.equal(typeof line, 'string');
  mutations.push(source.replace(line + '\n', ''), source.replace(line + '\n', line + '\n' + line + '\n'),
    source.replace(current, 'RavRadar/4.0.583'), source.replace('actions/checkout@v7', 'actions/checkout@v6'),
    source + '\n# UNREVIEWED RELEASE584 DRIFT\n');
  assert.equal(mutations.length, 10);
  for (const changed of mutations) {
    assert.notEqual(changed, source);
    assert.equal(inverseRelease584WorkflowUserAgents(changed, 'build'), changed,
      'Only one exact whole584 source can enter the UA inverse');
    assert.equal(inverseCurrentFamilyColdStartWorkflow(changed, 'build'), changed);
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
});

test('actual encrypted completed B stage precedes final gates with whole c72 and protected B/S order preserved', async () => {
  const source = inverseOrdinaryCompletedStageWorkflowWiring((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const block = assertEarlyCompletedRuntimeStageOrder(source);
  assert.equal(Buffer.byteLength(block), 3399);
  const previous = inverseEarlyCompletedRuntimeStage(source, 'build');
  assert.notEqual(previous, source);
  assert.equal(sha(previous), 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6');
  assert.equal(inverseEarlyCompletedRuntimeStage(previous, 'build'), previous);
  assert.equal(inverseRelease584WorkflowUserAgents(source, 'build'), coldActual.build);
  assert.equal(inverseCompletedRuntimeWorkflow(source, 'build'), inverseCompletedRuntimeWorkflow(previous, 'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(source, 'build')), legacySha);
  assert.equal(inverseEarlyCompletedRuntimeStage(source, 'once'), source);
  assert.throws(() => inverseCompletedRuntimeWorkflow(source, 'once'));
});

test('early stage rejects changed missing duplicated relocated or unrelated whole-workflow bytes', async () => {
  const source = inverseOrdinaryCompletedStageWorkflowWiring((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const block = assertEarlyCompletedRuntimeStageOrder(source);
  const without = source.replace(block, '');
  const oldNext = '      - name: Build dataminimized weather preflight state after final gates\n';
  const mutateBlock = (from, to) => {
    assert.equal(block.split(from).length, 2, 'One exact changed field inside the relocated stage');
    return source.replace(block, () => block.replace(from, to));
  };
  const mutations = [
    mutateBlock('id: private-build-stage-seal\n', 'id: unreviewed-private-build-stage-seal\n'),
    mutateBlock('retention-days: 1\n', 'retention-days: 2\n'),
    mutateBlock('          STAGED_PRIVATE_BUILD_MASTER_SECRET: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n', ''),
    source.replace(block, block + block), without,
    without.replace(oldNext, () => block + oldNext),
    source + '\n# UNREVIEWED EARLY-STAGE DRIFT\n',
  ];
  assert.equal(mutations.length, 7);
  for (const changed of mutations) {
    assert.notEqual(changed, source);
    assert.throws(() => assertEarlyCompletedRuntimeStageOrder(changed));
    assert.equal(inverseEarlyCompletedRuntimeStage(changed, 'build'), changed,
      'Only the one whole reviewed afterimage enters the relocation inverse');
    if (sha(changed) === 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6')
      assert.equal(sha(inverseCompletedRuntimeWorkflow(changed, 'build')), legacySha,
        'The exact unchanged c72 remains only the separate historical oracle');
    else assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
});

const actualWiringStep = (source, name) => {
  const marker = '      - name: ' + name + '\n';
  assert.equal(source.split(marker).length, 2, 'One exact actual stage-wiring step');
  const start = source.indexOf(marker);
  const end = source.indexOf('\n      - ', start + marker.length);
  assert(end > start); return source.slice(start, end);
};
const actualWiringBranches = block => {
  const rows = [...block.matchAll(/^          if test -n "\$COMPLETED_STAGE_SOURCE"; then\n([\s\S]*?)^          else\n([\s\S]*?)^          fi(?:\n|$)/gm)];
  assert.equal(rows.length, 1, 'One explicit locator-only branch, not completed flag alone');
  const command = body => body.trim().replace(/\\\n\s*/g, ' ').replace(/\s+/g, ' ');
  return { stage: command(rows[0][1]), ordinary: command(rows[0][2]) };
};
test('actual optional stage wiring preserves default commands, original cipher, caller mode and every delivery gate', async () => {
  const current = Object.fromEntries(await Promise.all([['build', 'reusable-weather-build.yml'], ['once', 'run-current-weather-once.yml']]
    .map(async ([role, file]) => [role, inverseRelease585WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/' + file, import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), role)])));
  assert.equal(sha(current.build), 'b509a5131c64f9df9a431fdf9f99b082fb14c88de8bf9c3ad3e33b8ddc77de57');
  assert.equal(sha(current.once), 'ca7f15673910e1176ba68c190b9f08c85d8274efb31dc36dbceca1b3838360b3');
  for (const [role, source] of Object.entries(current)) {
    assert.equal((source.match(/^      completed_stage_source:\n/gm) ?? []).length, 1,
      'One optional declaration; forwarding has its own exact expression assertion below');
    const input = coldBlock(source, '      completed_stage_source:');
    assert.match(input, /^        required: false$/m); assert.match(input, /^        type: string$/m);
    assert.match(input, /^        default: ''$/m);
    const prior = inverseOrdinaryCompletedStageWorkflowWiring(source, role);
    assert.notEqual(prior, source);
    assert.equal(sha(prior), role === 'build' ? '05665749cefb5f210a7542cb6fab06e2900be0fd9bb8326cab9b1dcc7b432f73'
      : '445964fbbc697ec86848744a9413897d3418b011c4218fb10336734b5e5055a2');
    assert.equal(inverseOrdinaryCompletedStageWorkflowWiring(prior, role), prior);
    assert.equal(inverseCompletedRuntimeWorkflow(source, role), inverseCompletedRuntimeWorkflow(prior, role));
  }
  const locator = '123-1-' + 'a'.repeat(40);
  const pin = actualWiringStep(current.once, 'Pin the actual newest completed private generation before target selection');
  assert.deepEqual(actualWiringBranches(pin), { stage: 'node scripts/ordinary-completed-stage-admission.mjs pin',
    ordinary: 'node scripts/completed-private-runtime-admission.mjs pin' });
  assert.match(pin, /^          CHECKPOINT_TARGET_HOUR: \$\{\{ inputs\.checkpoint_target_hour \}\}$/m);
  const orphan = actualWiringStep(current.once, 'Reject an orphaned completed-stage locator before target selection');
  assert.match(orphan, /^        if: inputs\.completed_stage_source != ''$/m);
  assert(orphan.includes('test "$COMPLETED" = true'));
  const checkpoint = actualWiringStep(current.once, 'Lock the requested original checkpoint hour without provider work');
  const checkpointSelector = /^        if: (.+)$/m.exec(checkpoint)[1];
  const checkpointOnly = /^      checkpoint_only: (.+)$/m.exec(current.once)[1];
  for (const [stage, targetHint, expected] of [['', '', false], ['', '2026-10-19T11:00:00Z', true],
    [locator, '2026-10-19T11:00:00Z', false], [locator, '', false]]) {
    const context = { inputs: { completed_stage_source: stage, checkpoint_target_hour: targetHint } };
    assert.equal(coldEvaluate(checkpointSelector, context), expected);
    assert.equal(coldEvaluate(checkpointOnly, context), expected);
  }
  assert(current.once.includes('completed_stage_source: ${{ inputs.completed_stage_source }}'));
  assert(current.build.includes("CHECKPOINT_TARGET_HOUR: ${{ inputs.checkpoint_only && inputs.production_target_hour || '' }}"));
  const source = actualWiringStep(current.build, 'Verify the original ordinary-stage source before any hydration');
  assert.match(source, /^        if: inputs\.completed_stage_source != ''$/m);
  assert(source.includes('run: node scripts/ordinary-completed-stage-admission.mjs source'));
  assert(current.build.indexOf(source) > current.build.indexOf('      - name: Set up Node.js\n'));
  for (const later of ['Read exact centrally active operational RavScore', 'Build constrained natural zone coastlines',
    'Sync centrally saved admin configuration', 'Materialize the authoritative active coastal-part registry'])
    assert(current.build.indexOf(source) < current.build.indexOf('      - name: ' + later + '\n'));
  for (const [key, expression] of [['CURRENT_FAMILY_COLD_START', 'current_family_cold_start'], ['EPOCH_BOOTSTRAP', 'weather_state_epoch_bootstrap'],
    ['EPOCH_REENTRY', 'weather_state_epoch_checkpoint_reentry'], ['NATIVE_IDENTITY_RECOVERY', 'native_sampling_identity_original_recovery'],
    ['EXTENDED_PROVIDER_BOOTSTRAP', 'extended_provider_bootstrap'], ['PRODUCE_HANDOFF', 'produce_weather_handoff']]) {
    assert(source.includes('          ' + key + ': ${{ inputs.' + expression + ' }}'));
    assert(current.build.includes('      ' + key + ': ${{ inputs.' + expression + ' }}'),
      'Every later stage CLI operation receives the actual typed mode, never a default false');
  }
  for (const [name, command] of [
    ['Require the separate completed B request and actual restored originals', 'request'],
    ['Admit only the exact authenticated completed B and matching central S', 'admit'],
    ['Refuse completed-runtime target or calibration mismatch before any new S or B publication', 'target'],
    ['Prove the whole recreated B manifest and installed originals are unchanged', 'before-publish'],
  ]) {
    const scope = actualWiringStep(current.build, name);
    assert.deepEqual(actualWiringBranches(scope), { stage: 'node scripts/ordinary-completed-stage-admission.mjs ' + command,
      ordinary: 'node scripts/completed-private-runtime-admission.mjs ' + command });
    assert(!scope.includes('continue-on-error:'));
  }
  const admit = actualWiringStep(current.build, 'Admit only the exact authenticated completed B and matching central S');
  assert.match(admit, /^        id: completed-runtime-admission$/m);
  assert.match(admit, /^          GH_TOKEN: \$\{\{ github\.token \}\}$/m);
  assert.match(admit, /^          STAGED_PRIVATE_BUILD_MASTER_SECRET: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}$/m);
  const cipher = actualWiringStep(current.build, 'Encrypt exact completed private build for late-failure recovery');
  assert.match(cipher, /^          SUPABASE_URL: \$\{\{ secrets\.SUPABASE_URL \}\}$/m);
  assert.match(cipher, /^          SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}$/m);
  const cipherBranches = actualWiringBranches(cipher);
  assert.equal(cipherBranches.stage, 'node scripts/ordinary-completed-stage-admission.mjs preserve-cipher echo ORIGINAL_CIPHERTEXT_PRESERVED_NOT_NEW_GENERATION');
  assert(cipherBranches.ordinary.startsWith('node scripts/staged-private-production-runtime.mjs seal '));
  assert(cipherBranches.ordinary.endsWith('--output "$RUNNER_TEMP/ravradar-private-build-stage/sealed.bin"'));
  const publish = actualWiringBranches(actualWiringStep(current.build, 'Publish bounded private runtime with one protected rollback generation'));
  assert.equal(publish.stage, 'node scripts/ordinary-completed-stage-admission.mjs publish');
  assert(publish.ordinary.startsWith('node scripts/protected-private-production-runtime.mjs --publish '));
  assert(publish.ordinary.endsWith('--source-head "$GITHUB_SHA"'));
  assert.equal(actualWiringStep(current.build, 'Save only encrypted completed private build for one day'),
    actualWiringStep(inverseOrdinaryCompletedStageWorkflowWiring(current.build, 'build'), 'Save only encrypted completed private build for one day'));
  assertEarlyCompletedRuntimeStageOrder(current.build);
});

test('actual optional wiring refuses every partial hunk, wrong role and changed complete workflow', async () => {
  for (const [role, file] of [['build', 'reusable-weather-build.yml'], ['once', 'run-current-weather-once.yml']]) {
    const source = inverseRelease585WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/' + file, import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), role);
    assert.equal(sha(source), ordinaryStageWiringReview[role].afterSha256);
    for (const [offset, actual] of ordinaryStageWiringReview[role].edits) {
      assert(actual.length > 0);
      for (const substitute of ['', actual + actual, '?' + actual.slice(1)]) {
        const changed = source.slice(0, offset) + substitute + source.slice(offset + actual.length);
        assert.notEqual(changed, source);
        assert.equal(inverseOrdinaryCompletedStageWorkflowWiring(changed, role), changed);
        assert.throws(() => inverseCompletedRuntimeWorkflow(changed, role));
      }
    }
    const mutations = [source.replace('completed_stage_source:', 'unreviewed_stage_source:'),
      source.replace('ordinary-completed-stage-admission.mjs', 'unreviewed-stage-admission.mjs'),
      source.replace('if test -n "$COMPLETED_STAGE_SOURCE"; then', 'if true; then'),
      source + '\n# UNREVIEWED STAGE WIRING DRIFT\n'];
    for (const changed of mutations) {
      assert.notEqual(changed, source);
      assert.equal(inverseOrdinaryCompletedStageWorkflowWiring(changed, role), changed);
      assert.throws(() => inverseCompletedRuntimeWorkflow(changed, role));
    }
    const wrong = role === 'build' ? 'once' : 'build';
    assert.equal(inverseOrdinaryCompletedStageWorkflowWiring(source, wrong), source);
    assert.throws(() => inverseCompletedRuntimeWorkflow(source, wrong));
  }
});

test('current585 release inverse keeps every genuine584 workflow byte and refuses partial UA or unrelated drift', async () => {
  const current586 = inverseNativeOriginalSchemaSelectorWorkflow((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  assert.equal(sha(current586), '8223891e25cfb7fbcf57a536bcc55a1cbf59ed676f02172588192065ae4eccc0');
  assert.equal(current586.split('RavRadar/4.0.586').length, 6, 'Exactly five genuine current586 User-Agent fields');
  assertEarlyCompletedRuntimeStageOrder(current586);
  assert.equal(inverseRelease585WorkflowUserAgents(current586, 'once'), current586);
  for (const changed of [current586.replace('RavRadar/4.0.586', 'RavRadar/4.0.585'),
    current586.replace('RavRadar/4.0.586', 'RavRadar/4.0.587'), current586 + '\n# UNREVIEWED\n']) {
    assert.equal(inverseRelease585WorkflowUserAgents(changed, 'build'), changed);
    assert.throws(() => assertEarlyCompletedRuntimeStageOrder(changed));
  }
  // Only the WHOLE qualified586 workflow projects to its genuine585
  // predecessor; every original585 assertion/mutation below is unchanged.
  const source = current586.replaceAll('RavRadar/4.0.586', 'RavRadar/4.0.585');
  assert.equal(sha(source), '2ee56b8ae3546f8ac3ce97b45aaedbfe7eb67fac0960961f164cecca70c0970c');
  const previous = inverseRelease585WorkflowUserAgents(source, 'build');
  assert.equal(sha(previous), 'b509a5131c64f9df9a431fdf9f99b082fb14c88de8bf9c3ad3e33b8ddc77de57');
  assert.equal(previous.replaceAll('RavRadar/4.0.584', 'RavRadar/4.0.585'), source);
  assert.equal(inverseRelease585WorkflowUserAgents(source, 'once'), source);
  assertEarlyCompletedRuntimeStageOrder(source);
  for (const changed of [source.replace('RavRadar/4.0.585', 'RavRadar/4.0.584'), source + '\n# UNREVIEWED\n']) {
    assert.equal(inverseRelease585WorkflowUserAgents(changed, 'build'), changed);
    assert.throws(() => assertEarlyCompletedRuntimeStageOrder(changed));
  }
});


test('native original schema selector: actual installed schema1 alone selects ordinary preparation; all old routes stay old',async()=>{
  // Remove only the exact combined parent layers before the unchanged586 oracle.
  const actual=inverseAssistant587ColdCheckpointCombinedToF83Workflow(inverseAssistant587LatestColdCombinedTo664aWorkflow((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build'),'build');
  const source=inverseCurrentFamilyColdBudgetWorkflow(inverseAssistant587CompletedWorkflow(
    inverseAssistant587ColdBudgetCombinedTo707Workflow(actual,'build'),'build'),'build');
  const donor=coldStep(source,'Classify one-time DMI PART continuity donor');
  const plan=coldStep(source,'Plan bounded current history from the actual selected continuation');
  const review=nativeOriginalSchemaSelectorWorkflowReview;
  assert.equal(Buffer.byteLength(source),review.after.bytes);assert.equal(sha(source),review.after.sha256);
  const previous=inverseNativeOriginalSchemaSelectorWorkflow(source,'build');
  assert.equal(Buffer.byteLength(previous),review.before.bytes);assert.equal(sha(previous),review.before.sha256);
  assert.equal(inverseCompletedRuntimeWorkflow(source,'build'),inverseCompletedRuntimeWorkflow(previous,'build'));
  assert.equal(inverseNativeOriginalSchemaSelectorWorkflow(source,'once'),source);
  assert(source.indexOf('        id: private-runtime-install\n')<source.indexOf('        id: dmi-part-continuity-donor\n'));
  assert(source.indexOf('        id: dmi-part-continuity-donor\n')<source.indexOf('        id: current-history-demand\n'));
  assert(donor.includes("steps.private-runtime-install.outcome == 'success'"));
  assert(donor.includes("const store = await inspectDmiForecastFile('data/live/dmi-forecast-cache.json');"));
  assert.equal(source.split('await inspectDmiForecastFile(').length,2,'Reuse the existing indexed read, not another full input route');
  const start=donor.indexOf('          const continuitySchema = '),end=donor.indexOf('          if (store.hasPartContinuity) {',start);
  assert(start>=0&&end>start);
  const body=donor.slice(start,end).replace(/^          /gm,'');
  const classify=store=>{
    const writes=[];
    runInNewContext(body,{store,process:{env:{GITHUB_OUTPUT:'SYNTHETIC_OWN_OUTPUT'}},
      fs:{appendFileSync(file,text){assert.equal(file,'SYNTHETIC_OWN_OUTPUT');writes.push(text);}}});
    assert.equal(writes.length,1);return writes[0];
  };
  for(const schema of [1,2])assert.equal(classify({hasPartContinuity:true,continuity:{metadata:{schemaVersion:schema}}}),
    'continuity_schema='+schema+'\n');
  assert.equal(classify({hasPartContinuity:false,continuity:null}),'continuity_schema=\n');
  for(const schema of [undefined,null,0,3,'1',{},1.5])assert.throws(
    ()=>classify({hasPartContinuity:true,continuity:{metadata:{schemaVersion:schema}}}),/Unknown DMI PART continuity schema/);
  const match=plan.match(/^        run: node scripts\/plan-ravscore-current-history\.mjs --retain-committed-raw (\$\{\{ .+ \}\})$/m);
  assert(match,'The existing exact argument variant must be the only selected suffix');
  const expression=match[1];
  const inputs={...coldInputs,completed_private_runtime_pin:'',completed_stage_source:'',
    weather_state_epoch_raw_cache_key:'',weather_state_epoch_archive_key:'',weather_state_epoch_archive_catalog_sha256:'',
    ravscore_integrated_weather_handoff_run_id:''};
  const context={inputs,steps:{
    'dmi-part-continuity-donor':{outputs:{continuity_schema:'1'}},
    'private-runtime-install':{outcome:'success'},
    'operational-model':{outputs:{model:'integrated',binding_current:'true'}},
    'operational-action':{outputs:{action:'integrated'}},
    'legacy-bootstrap':{outputs:{stateless_integrated_recovery:'false'}}}};
  const selected=changed=>coldEvaluate(expression,changed);
  assert.equal(selected(context),'--prepare-cached-native-originals');
  for(const schema of ['2','','3','unknown']){
    const changed=structuredClone(context);changed.steps['dmi-part-continuity-donor'].outputs.continuity_schema=schema;
    assert.equal(selected(changed),'','Header2 or unknown never grants preparation/admission');
  }
  for(const flag of ['completed_private_runtime','checkpoint_only','quick_confirmation','current_family_cold_start',
    'weather_state_epoch_bootstrap','weather_state_epoch_checkpoint_reentry','native_sampling_identity_original_recovery',
    'produce_weather_handoff','ravscore_integrated_first_cutover','ravscore_integrated_return']){
    const changed=structuredClone(context);changed.inputs[flag]=true;assert.equal(selected(changed),'',flag);
  }
  for(const locator of ['completed_private_runtime_pin','completed_stage_source','quick_progress_source',
    'weather_state_epoch_raw_cache_key','weather_state_epoch_archive_key','weather_state_epoch_archive_catalog_sha256',
    'ravscore_integrated_weather_handoff_run_id']){
    const changed=structuredClone(context);changed.inputs[locator]='SYNTHETIC_EXPLICIT_REENTRY';
    assert.equal(selected(changed),'',locator);
  }
  for(const mode of ['dry-run','execute']){
    const changed=structuredClone(context);changed.inputs.ravscore_candidate_g_rollback_mode=mode;assert.equal(selected(changed),'');
  }
  const none=structuredClone(context);none.inputs.ravscore_candidate_g_rollback_mode='none';
  assert.equal(selected(none),'--prepare-cached-native-originals');
  for(const[item,key,field,bad]of [
    ['private-runtime-install',null,'outcome','skipped'],
    ['operational-model','outputs','model','candidate-g'],
    ['operational-model','outputs','binding_current','false'],
    ['operational-action','outputs','action','integrated-historical-maintenance'],
    ['operational-action','outputs','action','integrated-cutover'],
    ['legacy-bootstrap','outputs','stateless_integrated_recovery','true']]){
    const changed=structuredClone(context),target=key?changed.steps[item][key]:changed.steps[item];target[field]=bad;
    assert.equal(selected(changed),'',[item,field].join('.'));
  }
  // The new layer cannot consume mutation/partial copies as historical proof.
  for(const[before,after]of review.hunks){
    assert.equal(source.split(after).length,2);
    for(const changed of [source.replace(after,before),source.replace(after,after+'\n# UNREVIEWED\n')]){
      assert.equal(inverseNativeOriginalSchemaSelectorWorkflow(changed,'build'),changed);
      assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
    }
  }
  // Pure argument selection: no new input flag, provider, raw decoder, installed
  // marker, source-priority candidate, score change or SQL operation is added.
  assert.equal(source.split('--prepare-cached-native-originals').length,2);
  assert.equal(source.split('--retain-committed-raw').length,2);
});


// New whole587 afterimage is not a repin of any historical oracle above.
import {assistant587CompletedWorkflowReview,inverseAssistant587CompletedWorkflow}
  from './lib/completed-private-runtime-workflow-review.mjs';
test('assistant587 exact workflow inverse retains genuine586 and every historical mutation refusal',async()=>{
  const actual=inverseAssistant587ColdBudgetCombinedTo587Workflow(inverseAssistant587ColdCheckpointCombinedToF83Workflow(inverseAssistant587LatestColdCombinedTo664aWorkflow((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build'),'build'),'build');
  const review=assistant587CompletedWorkflowReview;
  assert.equal(Buffer.byteLength(actual),review.after.bytes);assert.equal(sha(actual),review.after.sha256);
  const previous=inverseAssistant587CompletedWorkflow(actual,'build');
  assert.equal(Buffer.byteLength(previous),nativeOriginalSchemaSelectorWorkflowReview.after.bytes);
  assert.equal(sha(previous),nativeOriginalSchemaSelectorWorkflowReview.after.sha256);
  assert.equal(inverseCompletedRuntimeWorkflow(actual,'build'),inverseCompletedRuntimeWorkflow(previous,'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual,'build')),legacySha);
  assert.equal(inverseAssistant587CompletedWorkflow(actual,'once'),actual);
  assert.equal(inverseAssistant587CompletedWorkflow(previous,'build'),previous);
  const donor='Classify one-time DMI PART continuity donor',planner='Plan bounded current history from the actual selected continuation';
  assert.equal(coldStep(actual,donor),coldStep(previous,donor),'Actual donor/schema validation remains whole byteexact');
  const command=source=>{
    const lines=coldStep(source,planner).split('\n'),inlinePrefix='        run: ',scriptPrefix='          ';
    const inline=lines.filter(line=>line.startsWith(inlinePrefix+'node scripts/plan-ravscore-current-history.mjs '));
    const script=lines.filter(line=>line.startsWith(scriptPrefix+'node scripts/plan-ravscore-current-history.mjs '));
    assert.equal(inline.length+script.length,1,'Exactly one actual planner node invocation, inline OR script');
    return inline.length?inline[0].slice(inlinePrefix.length):script[0].slice(scriptPrefix.length);
  };
  const node=command(actual);assert.equal(node,command(previous),'Whole node argv including --retain-committed-raw and schema1 selector is unchanged');
  const currentPlan=coldStep(actual,planner),previousPlan=coldStep(previous,planner);
  const start=currentPlan.indexOf('        run: |\n'),end=currentPlan.indexOf('        env:\n',start);
  assert(start>=0&&end>start);
  const heap=[
    '        run: |',
    '          if test "'+String.fromCharCode(36)+'{{ steps.assistant-later-h0-source.outputs.required }}" = true; then',
    '            export NODE_OPTIONS=--max-old-space-size=6144',
    '          fi',
    '          '+node,
    '',
  ].join('\n');
  assert.equal(currentPlan.slice(start,end),heap,'Exact587 conditional heap block; no extra command, unconditional heap or selector rewrite');
  assert(previousPlan.includes('        run: '+node+'\n'));assert(!previousPlan.includes('        run: |\n'));
  assert.throws(()=>command(actual.replace('          '+node+'\n','          '+node+'\n          '+node+'\n')),
    'Duplicate actual planner invocation is not accepted');
  const fixed=actual.replaceAll('RavRadar/4.0.587','RavRadar/4.0.586');
  const changed=[actual+'\n# UNREVIEWED587\n',actual.replace('RavRadar/4.0.587','RavRadar/4.0.586'),
    actual.replace('test "'+String.fromCharCode(36)+'{{ steps.full-validation.outcome }}" = success','true'),
    actual.replace('test "'+String.fromCharCode(36)+'{{ steps.release-gate.outcome }}" = success','true')];
  for(const[offset,text,original]of review.hunks){
    for(const replacement of [original,text+text,'?'+text.slice(1)]){
      const partial=fixed.slice(0,offset)+replacement+fixed.slice(offset+text.length);
      changed.push(partial.replaceAll('RavRadar/4.0.586','RavRadar/4.0.587'));
    }
  }
  for(const source of changed){
    assert.notEqual(source,actual);assert.equal(inverseAssistant587CompletedWorkflow(source,'build'),source);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(source,'build'));
  }
});

test('cold budget inverse: exact five conditions preserve all native and earlier workflow oracles',async()=>{
  const source=inverseAssistant587ColdBudgetCombinedTo707Workflow(inverseAssistant587ColdCheckpointCombinedToF83Workflow(inverseAssistant587LatestColdCombinedTo664aWorkflow((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build'),'build'),'build');
  const row=currentFamilyColdBudgetWorkflowReview;
  assert.equal(Buffer.byteLength(source),row.after.bytes);assert.equal(sha(source),row.after.sha256);
  assert.equal(row.hunks.length,5);
  const before=inverseCurrentFamilyColdBudgetWorkflow(source,'build');
  assert.equal(sha(before),nativeOriginalSchemaSelectorWorkflowReview.after.sha256);
  assert.equal(inverseCurrentFamilyColdBudgetWorkflow(before,'build'),before);
  assert.equal(inverseNativeOriginalSchemaSelectorWorkflow(source,'build'),inverseNativeOriginalSchemaSelectorWorkflow(before,'build'));
  assert.equal(inverseCompletedRuntimeWorkflow(source,'build'),inverseCompletedRuntimeWorkflow(before,'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(source,'build')),legacySha);
  for(const[old,current]of row.hunks){
    assert.equal(source.split(current).length,2);
    for(const changed of [source.replace(current,old),source.replace(current,current+current),
      source.replace(current,current+'\n# UNREVIEWED_COLD_BUDGET\n')]){
      assert.notEqual(changed,source);
      assert.throws(()=>inverseCurrentFamilyColdBudgetWorkflow(changed,'build'),/COLD_BUDGET_WORKFLOW/);
      assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
    }
  }
  assert.throws(()=>inverseCurrentFamilyColdBudgetWorkflow(source+'\n','build'),/COLD_BUDGET_WORKFLOW/);
  assert.throws(()=>inverseCurrentFamilyColdBudgetWorkflow(source,'once'),/COLD_BUDGET_WORKFLOW_ROLE/);
});

test('assistant587 plus cold budget: actual combined whole source retains both parents and every older oracle',async()=>{
  const actual=inverseAssistant587ColdCheckpointCombinedToF83Workflow(inverseAssistant587LatestColdCombinedTo664aWorkflow((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build'),'build');
  const row=assistant587ColdBudgetCombinedWorkflowReview;
  assert.equal(Buffer.byteLength(actual),row.combined.bytes);assert.equal(sha(actual),row.combined.sha256);
  const p0707=inverseAssistant587ColdBudgetCombinedTo707Workflow(actual,'build');
  const assistant587=inverseAssistant587ColdBudgetCombinedTo587Workflow(actual,'build');
  assert.equal(Buffer.byteLength(p0707),row.p0707Parent.bytes);assert.equal(sha(p0707),row.p0707Parent.sha256);
  assert.equal(Buffer.byteLength(assistant587),row.assistant587Parent.bytes);assert.equal(sha(assistant587),row.assistant587Parent.sha256);
  assert.equal(inverseCurrentFamilyColdBudgetWorkflow(p0707,'build'),inverseAssistant587CompletedWorkflow(assistant587,'build'));
  assert.equal(inverseCompletedRuntimeWorkflow(actual,'build'),inverseCompletedRuntimeWorkflow(p0707,'build'));
  assert.equal(inverseCompletedRuntimeWorkflow(actual,'build'),inverseCompletedRuntimeWorkflow(assistant587,'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual,'build')),legacySha);
  for(const name of ['Classify one-time DMI PART continuity donor','Plan bounded current history from the actual selected continuation'])
    assert.equal(coldStep(actual,name),coldStep(assistant587,name),'Actual combined donor, planner argv, conditional heap and read guards remain whole587');
  const changed=[actual+'\n# UNREVIEWED_COMPOSITION\n',actual.replace('RavRadar/4.0.587','RavRadar/4.0.586')];
  for(const[before,after]of currentFamilyColdBudgetWorkflowReview.hunks){
    assert.equal(actual.split(after).length,2);
    changed.push(actual.replace(after,before),actual.replace(after,after+after),actual.replace(after,'?'+after.slice(1)));
  }
  for(const[,after,before]of assistant587CompletedWorkflowReview.hunks){
    const offsets=[];
    for(let at=actual.indexOf(after);at!==-1;at=actual.indexOf(after,at+1))offsets.push(at);
    assert(offsets.length>0,'Actual combined assistant hunk is preserved');
    for(const at of offsets)for(const replacement of [before,after+after,'?'+after.slice(1)])
      changed.push(actual.slice(0,at)+replacement+actual.slice(at+after.length));
  }
  for(const source of changed){
    assert.notEqual(source,actual);
    assert.equal(inverseAssistant587ColdBudgetCombinedTo707Workflow(source,'build'),source);
    assert.equal(inverseAssistant587ColdBudgetCombinedTo587Workflow(source,'build'),source);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(source,'build'));
  }
  for(const role of ['once','unknown']){
    assert.equal(inverseAssistant587ColdBudgetCombinedTo707Workflow(actual,role),actual);
    assert.equal(inverseAssistant587ColdBudgetCombinedTo587Workflow(actual,role),actual);
  }
});


// Keep both genuine P0 inputs separate: latest PR712 and its whole PR710
// predecessor. All existing historical test bodies and pins stay unchanged.
const latestColdProgressActual = Object.fromEntries(await Promise.all(
  Object.entries(currentFamilyColdCheckpointWorkflowReview.roles).map(async ([role, row]) =>
    [role, inverseAssistant587LatestColdCombinedTo2bWorkflow((await fs.readFile(new URL('../' + row.relativePath, import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), role)])));
const coldCheckpointActual = Object.fromEntries(Object.entries(latestColdProgressActual).map(([role,source]) =>
  [role,inverseLatestColdProgressWorkflow(source,role)]));

test('same-archive cold checkpoint inverse admits only both exact new whole workflows and restores c59', () => {
  const review = currentFamilyColdCheckpointWorkflowReview;
  assert.equal(review.baseHead, 'c59e840b0fc5cc0eb3148ffbf62f4e1de54a55ab');
  assert.deepEqual(review.scope, { progressSource: '39886354260-1', targetReferenceAt: '2026-10-23T01:00:00Z' });
  assert.deepEqual(Object.keys(review.roles), ['build', 'once']);
  for (const [role, row] of Object.entries(review.roles)) {
    const source = coldCheckpointActual[role];
    assert.equal(Buffer.byteLength(source), row.after.bytes); assert.equal(sha(source), row.after.sha256);
    assert.equal(row.edits.length, role === 'build' ? 10 : 3);
    const old = inverseCurrentFamilyColdCheckpointWorkflow(source, role);
    assert.equal(Buffer.byteLength(old), row.before.bytes); assert.equal(sha(old), row.before.sha256);
    assert.equal(inverseCurrentFamilyColdCheckpointWorkflow(old, role), old);
    assert.equal(inverseCompletedRuntimeWorkflow(source, role), inverseCompletedRuntimeWorkflow(old, role));
    let layerSource = source, prior = source.length;
    for (const [index, [offset, actual, original]] of row.edits.entries()) {
      if (role === 'build' && index === 4) {
        assert.equal(Buffer.byteLength(layerSource), 288646);
        assert.equal(sha(layerSource), '2b4677beed11b2d5b421e580a223531ac668fb96ca26c8d44516af155b533bd1');
        prior = layerSource.length;
      }
      assert(Number.isSafeInteger(offset) && offset >= 0 && offset + actual.length <= prior);
      prior = offset; assert(actual.length > 0); assert(original.length > 0);
      assert.equal(layerSource.slice(offset, offset + actual.length), actual);
      const currentOffset = source.indexOf(actual);
      assert(currentOffset >= 0);
      assert.equal(source.indexOf(actual, currentOffset + 1), -1);
      for (const replacement of ['', actual + actual, '?' + actual.slice(1), original]) {
        const changed = source.slice(0, currentOffset) + replacement + source.slice(currentOffset + actual.length);
        assert.notEqual(changed, source);
        assert.throws(() => inverseCurrentFamilyColdCheckpointWorkflow(changed, role), /COLD_CHECKPOINT_WORKFLOW/);
        assert.throws(() => inverseCompletedRuntimeWorkflow(changed, role));
      }
      layerSource = layerSource.slice(0, offset) + original + layerSource.slice(offset + actual.length);
    }
    assert.equal(layerSource, old);
    for (const changed of [source + '\n# UNREVIEWED\n', source.replace('39886354260-1', '39886354260-2'),
      source.replace('2026-10-23T01:00:00Z', '2026-10-23T02:00:00Z')]) {
      assert.notEqual(changed, source);
      assert.throws(() => inverseCurrentFamilyColdCheckpointWorkflow(changed, role), /COLD_CHECKPOINT_WORKFLOW/);
      assert.throws(() => inverseCompletedRuntimeWorkflow(changed, role));
    }
    const wrongRole = role === 'build' ? 'once' : 'build';
    assert.throws(() => inverseCurrentFamilyColdCheckpointWorkflow(source, wrongRole), /COLD_CHECKPOINT_WORKFLOW/);
    assert.throws(() => inverseCompletedRuntimeWorkflow(source, wrongRole));
  }
  assert.throws(() => inverseCurrentFamilyColdCheckpointWorkflow(null, 'build'), /COLD_CHECKPOINT_WORKFLOW_TYPE/);
  assert.throws(() => inverseCurrentFamilyColdCheckpointWorkflow(coldCheckpointActual.build, 'toString'), /COLD_CHECKPOINT_WORKFLOW_ROLE/);
  assert.throws(() => inverseCurrentFamilyColdCheckpointWorkflow(coldCheckpointActual.build), /COLD_CHECKPOINT_WORKFLOW_ARGUMENTS/);
  assert.throws(() => inverseCurrentFamilyColdCheckpointWorkflow(coldCheckpointActual.build, 'build', true), /COLD_CHECKPOINT_WORKFLOW_ARGUMENTS/);
});

test('same-archive actual selectors retain ordinary defaults and exclude checkpoint_only from cold', () => {
  const actual = coldCheckpointActual;
  const old = Object.fromEntries(Object.entries(actual).map(([role, source]) =>
    [role, inverseCurrentFamilyColdCheckpointWorkflow(source, role)]));
  const field = (source, key) => {
    const rows = [...source.matchAll(new RegExp('^      ' + key + ': (.+)$', 'gm'))];
    assert.equal(rows.length, 1); return rows[0][1];
  };
  for (const [role, source] of Object.entries(actual)) {
    const inventory = text => [...text.matchAll(/^      ([a-z_]+):\n/gm)].map(row => row[1]);
    assert.deepEqual(inventory(source), inventory(old[role]), 'No new public input');
    const input = coldBlock(source, '      current_family_cold_start:');
    assert.match(input, /^        required: false$/m);
    assert.match(input, /^        type: boolean$/m);
    assert.match(input, /^        default: false$/m);
    if (role === 'build') assert.equal(coldBlock(source, '    secrets:'), coldBlock(old[role], '    secrets:'));
  }
  const caller = coldBlock(actual.once, '  build-and-prepare:');
  for (const cold of [undefined, false, true]) for (const target of ['', '2026-10-23T01:00:00Z'])
    for (const completed of ['', '123-1-' + 'a'.repeat(40)]) {
      const inputs = { ...coldInputs, checkpoint_target_hour: target, completed_stage_source: completed };
      if (cold !== undefined) inputs.current_family_cold_start = cold;
      else delete inputs.current_family_cold_start;
      assert.equal(coldEvaluate(field(caller, 'checkpoint_only'), { inputs }), cold !== true && target !== '' && completed === '');
      assert.equal(coldEvaluate(field(caller, 'current_family_cold_start'), { inputs }), cold === true);
      assert.equal(coldEvaluate(field(caller, 'extended_provider_bootstrap'), { inputs }), cold === true);
    }
  for (const cold of [false, true]) for (const checkpoint of [false, true]) for (const progress of ['', '39886354260-1']) {
    const inputs = { ...coldInputs, current_family_cold_start: cold, checkpoint_only: checkpoint,
      quick_progress_source: progress, production_target_hour: '2026-10-23T01:00:00Z' };
    assert.equal(coldEvaluate(field(actual.build, 'CHECKPOINT_TARGET_HOUR'), { inputs }),
      checkpoint || (cold && progress !== '') ? inputs.production_target_hour : '');
  }
  assert.equal(coldStep(actual.once, 'Lock the requested original checkpoint hour without provider work'),
    coldStep(old.once, 'Lock the requested original checkpoint hour without provider work'));
  assert(coldStep(actual.once, 'Lock the requested original checkpoint hour without provider work')
    .includes('--target "$CHECKPOINT_TARGET_HOUR" --maximum-age-minutes 90'));
  assert(actual.once.includes('group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false'));
});

test('same-archive actual cache selectors admit only the fixed cold source with no prefix and defer only cold quick proof', () => {
  const source = coldCheckpointActual.build;
  const restore = coldStep(source, 'Restore encrypted private weather progress only');
  const requireProgress = coldStep(source, 'Require recovered progress before short confirmation');
  const prefix = /^          restore-keys: (.+)$/m.exec(restore)?.[1]; assert(prefix);
  const key = /^          key: (.+)$/m.exec(restore)?.[1]; assert(key);
  const format = (value, ...args) => value.replace(/\{(\d+)\}/g, (_, n) => String(args[Number(n)]));
  for (const cold of [false, true]) for (const progress of ['', '39886354260-1', '39886354260-2', 'protected-current']) {
    const context = coldOrdinaryContext(cold);
    context.inputs = { ...context.inputs, quick_progress_source: progress };
    context.runner = { os: 'Linux' }; context.format = format;
    assert.equal(coldEvaluate(coldSelector(restore), context), !cold || progress === '39886354260-1');
    assert.equal(coldEvaluate(coldSelector(requireProgress), context), !cold && progress !== '');
    assert.equal(coldEvaluate(prefix, context), progress === '' ? 'weather-private-progress-encrypted-v2-Linux-main-' : '');
  }
  const context = coldOrdinaryContext(true);
  context.inputs = { ...context.inputs, quick_progress_source: '39886354260-1' };
  context.runner = { os: 'Linux' }; context.github.run_id = '999'; context.github.run_attempt = '1'; context.format = format;
  const actualKey = key.replace(/\$\{\{ (.+?) \}\}/g, (_, expression) => String(coldEvaluate(expression, context)));
  assert.equal(actualKey, 'weather-private-progress-encrypted-v2-Linux-main-39886354260-1');
  for (const [field, value] of [['completed_private_runtime', true], ['native_sampling_identity_original_recovery', true],
    ['weather_state_epoch_bootstrap', true]]) {
    const changed = structuredClone({ inputs: context.inputs, github: context.github, steps: context.steps });
    changed.inputs[field] = value; assert.equal(coldEvaluate(coldSelector(restore), changed), false, field);
  }
  for (const event of ['pull_request', 'pull_request_target']) {
    const changed = { ...context, github: { ...context.github, event_name: event } };
    assert.equal(coldEvaluate(coldSelector(restore), changed), false);
  }
  for (const [step, field, value] of [['private-runtime-install', 'outcome', 'failure'],
    ['weather-source-handoff', 'outputs', { reused: 'true' }]]) {
    const changed = structuredClone({ inputs: context.inputs, github: context.github, steps: context.steps });
    changed.steps[step][field] = value; assert.equal(coldEvaluate(coldSelector(restore), changed), false);
  }
  const old = inverseCurrentFamilyColdCheckpointWorkflow(source, 'build');
  assert.equal(coldStep(source, 'Bind optional progress to the exact protected baseline'),
    coldStep(old, 'Bind optional progress to the exact protected baseline'), 'Captured OLD B baseline is byte-for-byte unchanged');
});

test('same-archive actual scope and prepare/resolve seams bind source and target before provider use or rebinding', () => {
  const actual = coldCheckpointActual;
  const manual = coldStep(actual.once, 'Reject mixed caller-only cold-start modes before target selection');
  const fixedManual = [
    '          if test -z "$PROGRESS"; then',
    '            test -z "$TARGET"',
    '          else',
    '            test "$PROGRESS" = 39886354260-1',
    '            test "$TARGET" = 2026-10-23T01:00:00Z',
    '          fi',
  ].join('\n');
  assert.equal(manual.split(fixedManual).length, 2);
  assert(actual.once.indexOf(manual) < actual.once.indexOf('      - name: Lock the requested original checkpoint hour without provider work\n'));
  const reusable = coldStep(actual.build, 'Require the explicit fresh caller-only cold-start scope');
  const fixedReusable = [
    '          if test -n "$QUICK_PROGRESS_SOURCE"; then',
    '            test "$QUICK_PROGRESS_SOURCE" = 39886354260-1',
    '            test "$RAVRADAR_PRODUCTION_TARGET_HOUR" = 2026-10-23T01:00:00Z',
    '            test "$CHECKPOINT_TARGET_HOUR" = "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
    '          else',
    '            test -z "$CHECKPOINT_TARGET_HOUR"',
    '          fi',
  ].join('\n');
  assert.equal(reusable.split(fixedReusable).length, 2);
  assert(reusable.includes('test "${{ inputs.checkpoint_only }}" = false'));
  assert(actual.build.indexOf(reusable) < actual.build.indexOf('      - name: Restore encrypted private weather progress only\n'));
  const prepare = coldStep(actual.build, 'Prepare strict active DMI donor or resumable candidate');
  const branch = [
    '          if test "${{ inputs.current_family_cold_start }}" = true; then',
    '            if test -n "$QUICK_PROGRESS_SOURCE"; then',
    '              node scripts/run-current-family-cold-start.mjs reopen',
    '            else',
    '              node scripts/run-current-family-cold-start.mjs prepare',
    '            fi',
    '            echo "strict_active_ready=false" >> "$GITHUB_OUTPUT"',
    '            echo "candidate_seeded=true" >> "$GITHUB_OUTPUT"',
    '            exit 0',
    '          fi',
  ].join('\n');
  assert.equal(prepare.split(branch).length, 2);
  assert(prepare.includes('PROGRESS_CACHE_MATCHED_KEY: ${{ steps.component-progress-cache.outputs.cache-matched-key }}'));
  assert(prepare.includes('PROGRESS_CACHE_OUTCOME: ${{ steps.component-progress-cache.outcome }}'));
  const secret = /^          WEATHER_PROGRESS_MASTER_SECRET: (.+)$/m.exec(prepare)?.[1]; assert(secret);
  for (const cold of [false, true]) for (const progress of ['', '39886354260-1'])
    assert.equal(coldEvaluate(secret, { inputs: { ...coldInputs, current_family_cold_start: cold, quick_progress_source: progress },
      secrets: { SUPABASE_SERVICE_ROLE_KEY: 'SYNTHETIC_SECRET' } }), cold && progress !== '' ? 'SYNTHETIC_SECRET' : '');
  const bind = coldStep(actual.build, 'Bind production to resolved DMI current hour');
  const fixedResolve = [
    '          if test "${{ inputs.current_family_cold_start }}" = true && test -n "$QUICK_PROGRESS_SOURCE"; then',
    '            test "$QUICK_PROGRESS_SOURCE" = 39886354260-1',
    '            test "$resolved_target" = "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
    '            test "$resolved_target" = 2026-10-23T01:00:00Z',
    '          fi',
  ].join('\n');
  assert.equal(bind.split(fixedResolve).length, 2);
  assert(bind.indexOf(fixedResolve) < bind.indexOf('echo "RAVRADAR_PRODUCTION_TARGET_HOUR=$resolved_target" >> "$GITHUB_ENV"'));
  const old = inverseCurrentFamilyColdCheckpointWorkflow(actual.build, 'build');
  for (const name of ['Require actual cold-start producer cessation before other consumers',
    'Encrypt newly saved private weather progress before later production steps',
    'Preserve the fixed epoch post-processing reserve before dmi',
    'Preserve the fixed epoch post-processing reserve before copernicus',
    'Preserve the fixed epoch post-processing reserve before open-meteo',
    'Preserve the fixed epoch post-processing reserve before weather']) {
    const previous = coldStep(old, name);
    const expected = name.startsWith('Preserve the fixed epoch post-processing reserve before ')
      ? previous.replace('        run:', [
        '        env:',
        "          QUICK_PROGRESS_SOURCE: ${{ inputs.current_family_cold_start != true && inputs.quick_progress_source || '' }}",
        "          CHECKPOINT_TARGET_HOUR: ${{ inputs.current_family_cold_start != true && inputs.checkpoint_only && inputs.production_target_hour || '' }}",
        '        run:',
      ].join('\n')) : previous;
    assert.equal(coldStep(actual.build, name), expected, name);
  }
});

test('assistant587 plus PR710 checkpoint: actual whole composition preserves both exact parents and every oracle', async () => {
  const actual = inverseAssistant587LatestColdCombinedTo664aWorkflow((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const row = assistant587ColdCheckpointCombinedWorkflowReview;
  assert.equal(row.p0Parent.commit, 'd5d2f5e95c55c3096fa7b03890289c7d2cba307a');
  assert.equal(row.assistantParent.commit, 'f83da62fc5a90d65190dfb715539eb30070beb22');
  assert.equal(Buffer.byteLength(actual), row.combined.bytes); assert.equal(sha(actual), row.combined.sha256);
  assert.equal(row.toF83.length, 11); assert.equal(row.toD5.length, 19);
  const f83 = inverseAssistant587ColdCheckpointCombinedToF83Workflow(actual, 'build');
  const d5 = inverseAssistant587ColdCheckpointCombinedToD5Workflow(actual, 'build');
  for (const [text, pin] of [[f83, row.assistantParent], [d5, row.p0Parent]]) {
    assert.equal(Buffer.byteLength(text), pin.bytes); assert.equal(sha(text), pin.sha256);
    assert.equal(inverseCompletedRuntimeWorkflow(actual, 'build'), inverseCompletedRuntimeWorkflow(text, 'build'));
  }
  assert.equal(d5, coldCheckpointActual.build);
  assert.equal(inverseAssistant587ColdBudgetCombinedTo707Workflow(f83, 'build'),
    inverseCurrentFamilyColdCheckpointWorkflow(d5, 'build'), 'Both exact parents retain the whole common65 workflow');
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual, 'build')), legacySha);
  for (const [edits, parent] of [[row.toF83, f83], [row.toD5, d5]]) {
    let previous = actual, prior = actual.length;
    for (const [offset, current, old] of edits) {
      assert(Number.isSafeInteger(offset) && offset >= 0 && offset + current.length <= prior);
      prior = offset;
      assert.equal(previous.slice(offset, offset + current.length), current);
      previous = previous.slice(0, offset) + old + previous.slice(offset + current.length);
    }
    assert.equal(previous, parent, 'Entire fixed projection, not selected fields');
  }
});

test('assistant587 plus PR710 checkpoint: partial cross-parent mutations never enter a historical inverse', async () => {
  const actual = inverseAssistant587LatestColdCombinedTo664aWorkflow((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const row = assistant587ColdCheckpointCombinedWorkflowReview;
  assert.equal(sha(actual), row.combined.sha256);
  const changed = [
    actual + '\n# UNREVIEWED_PR710_ASSISTANT587\n',
    actual.replace('39886354260-1', '39886354260-2'),
    actual.replace('2026-10-23T01:00:00Z', '2026-10-23T02:00:00Z'),
    actual.replace('RavRadar/4.0.587', 'RavRadar/4.0.586'),
  ];
  for (const edits of [row.toF83, row.toD5]) for (const [offset, current, old] of edits) {
    assert.equal(actual.slice(offset, offset + current.length), current);
    for (const replacement of ['', current + current, '?' + current.slice(1), old]) {
      const candidate = actual.slice(0, offset) + replacement + actual.slice(offset + current.length);
      if (candidate !== actual) changed.push(candidate);
    }
  }
  for (const source of changed) {
    assert.notEqual(source, actual);
    assert.equal(inverseAssistant587ColdCheckpointCombinedToF83Workflow(source, 'build'), source);
    assert.equal(inverseAssistant587ColdCheckpointCombinedToD5Workflow(source, 'build'), source);
    assert.throws(() => inverseCompletedRuntimeWorkflow(source, 'build'));
  }
  for (const project of [inverseAssistant587ColdCheckpointCombinedToF83Workflow,
    inverseAssistant587ColdCheckpointCombinedToD5Workflow]) {
    for (const role of ['once', 'unknown']) assert.equal(project(actual, role), actual);
    for (const parent of [inverseAssistant587ColdCheckpointCombinedToF83Workflow(actual, 'build'),
      inverseAssistant587ColdCheckpointCombinedToD5Workflow(actual, 'build')]) assert.equal(project(parent, 'build'), parent);
    assert.throws(() => project(actual), /ASSISTANT587_CHECKPOINT_ARGUMENTS/);
    assert.throws(() => project(actual, 'build', true), /ASSISTANT587_CHECKPOINT_ARGUMENTS/);
    assert.throws(() => project(null, 'build'), /ASSISTANT587_CHECKPOINT_TYPE/);
  }
});

test('latest saved progress inverse restores both exact earlier workflows and rejects every changed hunk',async()=>{
  const review=latestColdProgressWorkflowReview;
  assert.deepEqual(review.scope,{progressSource:'39886354260-1',latestProgressSource:'39933506923-1',
    archiveId:'775f99a210b899eacd3ee056f4daae56c20fc3258e64691d4e0544aabd04d3fb',
    targetReferenceAt:'2026-10-23T01:00:00.000Z',publicInputTarget:'2026-10-23T01:00:00Z'});
  assert.equal(sha((await fs.readFile(new URL('./lib/current-family-cold-checkpoint-workflow-review.json',import.meta.url),'utf8')).replaceAll('\r\n','\n')),
    '1ddb3f26ce9e674a7aac8bc045040c2c4aef6c9c968fa916a0753e1db096ae42','Every earlier checkpoint/budget edit and pin remains unchanged');
  for(const [role,row] of Object.entries(review.roles)){
    const source=latestColdProgressActual[role];
    assert.equal(Buffer.byteLength(source),row.after.bytes);assert.equal(sha(source),row.after.sha256);
    assert.equal(row.edits.length,role==='build'?3:2);
    const old=inverseLatestColdProgressWorkflow(source,role);
    assert.equal(old,coldCheckpointActual[role]);assert.equal(Buffer.byteLength(old),row.before.bytes);
    assert.equal(sha(old),row.before.sha256);assert.equal(inverseLatestColdProgressWorkflow(old,role),old);
    assert.equal(inverseCurrentFamilyColdCheckpointWorkflow(source,role),inverseCurrentFamilyColdCheckpointWorkflow(old,role));
    assert.equal(inverseCompletedRuntimeWorkflow(source,role),inverseCompletedRuntimeWorkflow(old,role));
    let previousOffset=source.length;
    for(const [offset,actual,original] of row.edits){
      assert(Number.isSafeInteger(offset)&&offset>=0&&offset+actual.length<=previousOffset);
      previousOffset=offset;assert(actual.length>0&&original.length>0);
      const at=source.indexOf(actual);assert(at>=0);assert.equal(source.indexOf(actual,at+1),-1);
      for(const substitute of ['',actual+actual,'?'+actual.slice(1),original]){
        const changed=source.slice(0,at)+substitute+source.slice(at+actual.length);
        assert.notEqual(changed,source);
        assert.throws(()=>inverseLatestColdProgressWorkflow(changed,role),/LATEST_COLD_PROGRESS_WORKFLOW/);
        assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,role));
      }
    }
    for(const changed of [source+'\n# UNREVIEWED_LATEST_PROGRESS\n',
      source.replace('39933506923-1','39933506923-2'),source.replace('2026-10-23T01:00:00Z','2026-10-23T02:00:00Z')]){
      assert.notEqual(changed,source);
      assert.throws(()=>inverseLatestColdProgressWorkflow(changed,role),/LATEST_COLD_PROGRESS_WORKFLOW/);
      assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,role));
    }
    assert.throws(()=>inverseLatestColdProgressWorkflow(source,role==='build'?'once':'build'),/LATEST_COLD_PROGRESS_WORKFLOW/);
  }
  assert.throws(()=>inverseLatestColdProgressWorkflow(null,'build'),/LATEST_COLD_PROGRESS_WORKFLOW_TYPE/);
  assert.throws(()=>inverseLatestColdProgressWorkflow(latestColdProgressActual.build,'toString'),/LATEST_COLD_PROGRESS_WORKFLOW_ROLE/);
  assert.throws(()=>inverseLatestColdProgressWorkflow(latestColdProgressActual.build),/LATEST_COLD_PROGRESS_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseLatestColdProgressWorkflow(latestColdProgressActual.build,'build',true),/LATEST_COLD_PROGRESS_WORKFLOW_ARGUMENTS/);
});

test('actual latest progress cache selects the requested exact ID and keeps original target defaults and reserves',()=>{
  const actual=latestColdProgressActual,ids=['39886354260-1','39933506923-1'];
  const restore=coldStep(actual.build,'Restore encrypted private weather progress only');
  const prefix=/^          restore-keys: (.+)$/m.exec(restore)?.[1],key=/^          key: (.+)$/m.exec(restore)?.[1];
  assert(prefix&&key);assert(restore.includes('uses: actions/cache/restore@v6'));
  const format=(value,...args)=>value.replace(/\{(\d+)\}/g,(_,n)=>String(args[Number(n)]));
  for(const cold of [false,true])for(const progress of ['',...ids,'39886354260-2','39933506923-2','39933506924-1','protected-current']){
    const context=coldOrdinaryContext(cold);context.inputs={...context.inputs,quick_progress_source:progress};
    context.runner={os:'Linux'};context.github.run_id='999';context.github.run_attempt='1';context.format=format;
    assert.equal(coldEvaluate(coldSelector(restore),context),!cold||ids.includes(progress));
    assert.equal(coldEvaluate(prefix,context),progress===''?'weather-private-progress-encrypted-v2-Linux-main-':'');
    const selected=key.replace(/\$\{\{ (.+?) \}\}/g,(_,expression)=>String(coldEvaluate(expression,context)));
    assert.equal(selected,'weather-private-progress-encrypted-v2-Linux-main-'+(progress||'999-1'));
  }
  const manual=coldStep(actual.once,'Reject mixed caller-only cold-start modes before target selection');
  assert(manual.includes('test "$PROGRESS" = 39886354260-1 || test "$PROGRESS" = 39933506923-1'));
  assert(manual.includes('test "$TARGET" = 2026-10-23T01:00:00Z'));
  assert(manual.includes('test "$GITHUB_RUN_ATTEMPT" = 1'));
  const scope=coldStep(actual.build,'Require the explicit fresh caller-only cold-start scope');
  const bind=coldStep(actual.build,'Bind production to resolved DMI current hour');
  for(const step of [scope,bind])assert(step.includes('test "$QUICK_PROGRESS_SOURCE" = 39886354260-1 || test "$QUICK_PROGRESS_SOURCE" = 39933506923-1'));
  assert(scope.includes('test "$RAVRADAR_PRODUCTION_TARGET_HOUR" = 2026-10-23T01:00:00Z'));
  assert(scope.includes('test "$CHECKPOINT_TARGET_HOUR" = "$RAVRADAR_PRODUCTION_TARGET_HOUR"'));
  assert(scope.includes('test "${{ inputs.checkpoint_only }}" = false'));
  assert(bind.includes('test "$resolved_target" = "$RAVRADAR_PRODUCTION_TARGET_HOUR"'));
  assert(bind.includes('test "$resolved_target" = 2026-10-23T01:00:00Z'));
  assert(bind.indexOf('test "$resolved_target" = 2026-10-23T01:00:00Z')<bind.indexOf('echo "RAVRADAR_PRODUCTION_TARGET_HOUR=$resolved_target"'));
  const caller=coldBlock(actual.once,'  build-and-prepare:');
  const field=(text,name)=>{const matches=[...text.matchAll(new RegExp('^      '+name+': (.+)$','gm'))];assert.equal(matches.length,1);return matches[0][1];};
  for(const progress of ['',...ids]){
    const inputs={...coldInputs,current_family_cold_start:true,checkpoint_target_hour:'2026-10-23T01:00:00Z',
      completed_stage_source:'',quick_progress_source:progress};
    assert.equal(coldEvaluate(field(caller,'checkpoint_only'),{inputs}),false);
    assert.equal(coldEvaluate(field(caller,'current_family_cold_start'),{inputs}),true);
    assert.equal(coldEvaluate(field(caller,'extended_provider_bootstrap'),{inputs}),true);
  }
  for(const role of ['build','once']){
    const previous=coldCheckpointActual[role];
    assert.equal(coldBlock(actual[role],'      current_family_cold_start:').replace(/^        description:.*\n/m,''),
      coldBlock(previous,'      current_family_cold_start:').replace(/^        description:.*\n/m,''));
  }
  for(const name of ['Prepare strict active DMI donor or resumable candidate',
    'Require actual cold-start producer cessation before other consumers',
    'Encrypt newly saved private weather progress before later production steps',
    ...['dmi','copernicus','open-meteo','weather'].map(phase=>'Preserve the fixed epoch post-processing reserve before '+phase)])
    assert.equal(coldStep(actual.build,name),coldStep(coldCheckpointActual.build,name),name+' remains byte-identical');
});

test('assistant587 plus PR712 latest progress: actual whole composition preserves both exact Git parents', async () => {
  const actual = inverseRelease588WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const row = assistant587LatestColdCombinedWorkflowReview;
  assert.equal(row.p0Parent.commit, '2b1d7a95d4201ef39e10cc9d7e52cd0f4d6243aa');
  assert.equal(row.assistantParent.commit, '664aeb46966cd0ec182599a90bcaacc6c4b609ab');
  assert.equal(row.commonParent.commit, 'd957e9579f2d6b3ef2281a1d65a9cb1ff4c39909');
  assert.equal(Buffer.byteLength(actual), row.combined.bytes); assert.equal(sha(actual), row.combined.sha256);
  assert.equal(row.to664a.length, 3); assert.equal(row.to2b.length, 19);
  const assistant = inverseAssistant587LatestColdCombinedTo664aWorkflow(actual, 'build');
  const p0 = inverseAssistant587LatestColdCombinedTo2bWorkflow(actual, 'build');
  for (const [source, pin] of [[assistant, row.assistantParent], [p0, row.p0Parent]]) {
    assert.equal(Buffer.byteLength(source), pin.bytes); assert.equal(sha(source), pin.sha256);
    assert.equal(inverseCompletedRuntimeWorkflow(actual, 'build'), inverseCompletedRuntimeWorkflow(source, 'build'));
  }
  assert.equal(p0, latestColdProgressActual.build);
  const common = inverseLatestColdProgressWorkflow(p0, 'build');
  assert.equal(common, inverseAssistant587ColdCheckpointCombinedToD5Workflow(assistant, 'build'));
  assert.equal(Buffer.byteLength(common), row.commonParent.bytes); assert.equal(sha(common), row.commonParent.sha256);
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual, 'build')), legacySha);
  for (const [edits, parent] of [[row.to664a, assistant], [row.to2b, p0]]) {
    let previous = actual, prior = actual.length;
    for (const [offset, current, old] of edits) {
      assert(Number.isSafeInteger(offset) && offset >= 0 && offset + current.length <= prior);
      prior = offset;
      assert.equal(previous.slice(offset, offset + current.length), current);
      previous = previous.slice(0, offset) + old + previous.slice(offset + current.length);
    }
    assert.equal(previous, parent, 'Entire fixed parent projection, not selected fields');
  }
  // Evaluate the genuine combined selector, not a normalized historic workflow.
  const restore = coldStep(actual, 'Restore encrypted private weather progress only');
  for (const cold of [false, true]) for (const progress of ['', '39886354260-1', '39933506923-1', '39933506923-2', 'protected-current']) {
    const context = coldOrdinaryContext(cold);
    context.inputs = { ...context.inputs, quick_progress_source: progress };
    assert.equal(coldEvaluate(coldSelector(restore), context), !cold || ['39886354260-1', '39933506923-1'].includes(progress));
  }
});

test('assistant587 plus PR712 latest progress: partial parent mutations never enter any historical inverse', async () => {
  const actual = inverseRelease588WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const row = assistant587LatestColdCombinedWorkflowReview;
  assert.equal(sha(actual), row.combined.sha256);
  const changed = [
    actual + '\n# UNREVIEWED_PR712_ASSISTANT587\n',
    actual.replace('39933506923-1', '39933506923-2'),
    actual.replace('39886354260-1', '39886354260-2'),
    actual.replace('2026-10-23T01:00:00Z', '2026-10-23T02:00:00Z'),
    actual.replace('RavRadar/4.0.587', 'RavRadar/4.0.586'),
  ];
  for (const edits of [row.to664a, row.to2b]) for (const [offset, current, old] of edits) {
    assert.equal(actual.slice(offset, offset + current.length), current);
    for (const replacement of ['', current + current, '?' + current.slice(1), old]) {
      const candidate = actual.slice(0, offset) + replacement + actual.slice(offset + current.length);
      if (candidate !== actual) changed.push(candidate);
    }
  }
  for (const source of changed) {
    assert.notEqual(source, actual);
    assert.equal(inverseAssistant587LatestColdCombinedTo664aWorkflow(source, 'build'), source);
    assert.equal(inverseAssistant587LatestColdCombinedTo2bWorkflow(source, 'build'), source);
    assert.throws(() => inverseCompletedRuntimeWorkflow(source, 'build'));
  }
  for (const project of [inverseAssistant587LatestColdCombinedTo664aWorkflow,
    inverseAssistant587LatestColdCombinedTo2bWorkflow]) {
    for (const role of ['once', 'unknown']) assert.equal(project(actual, role), actual);
    for (const parent of [inverseAssistant587LatestColdCombinedTo664aWorkflow(actual, 'build'),
      inverseAssistant587LatestColdCombinedTo2bWorkflow(actual, 'build')]) assert.equal(project(parent, 'build'), parent);
    assert.throws(() => project(actual), /ASSISTANT587_LATEST_COMBINED_ARGUMENTS/);
    assert.throws(() => project(actual, 'build', true), /ASSISTANT587_LATEST_COMBINED_ARGUMENTS/);
    assert.throws(() => project(null, 'build'), /ASSISTANT587_LATEST_COMBINED_TYPE/);
  }
});

test('release588 exact five UA fields preserve whole587 and every historical refusal',async()=>{
  const actual=inverseRelease590WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build');
  assert.equal(Buffer.byteLength(actual),292886);
  assert.equal(sha(actual),'998d3a8e11a1088363a84bfd4a0d64f7117eacc059a3cf5c0ca895f7a85e22b3');
  assert.equal(actual.split('RavRadar/4.0.588').length,6);
  assert.equal(actual.includes('RavRadar/4.0.587'),false);
  const previous=inverseRelease588WorkflowUserAgents(actual,'build');
  assert.equal(sha(previous),'e4c022274fe0d05fd3e10aff59d7a3165c67b92847a196c7ee793df68a666600');
  assert.equal(previous,actual.replaceAll('RavRadar/4.0.588','RavRadar/4.0.587'));
  assert.equal(inverseRelease588WorkflowUserAgents(previous,'build'),previous);
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual,'build')),legacySha);
  for(const project of [inverseAssistant587LatestColdCombinedTo664aWorkflow,
    inverseAssistant587LatestColdCombinedTo2bWorkflow])
    assert.equal(project(actual,'build'),project(previous,'build'));
  for(const role of ['once','unknown']){
    assert.equal(inverseRelease588WorkflowUserAgents(actual,role),actual);
    assert.equal(inverseRelease588WorkflowUserAgents(previous,role),previous);
  }
  const mutations=[actual+'\n# UNREVIEWED588\n',
    actual.replace('RavRadar/4.0.588','RavRadar/4.0.587'),
    actual.replaceAll('RavRadar/4.0.588','RavRadar/4.0.589'),
    actual.replace('RavRadar/4.0.588','RavRadar/4.0.588 RavRadar/4.0.588'),
    actual.replace('test "${{ steps.full-validation.outcome }}" = success','true')];
  for(const changed of mutations){
    assert.notEqual(changed,actual);
    assert.equal(inverseRelease588WorkflowUserAgents(changed,'build'),changed);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
  }
  assert.throws(()=>inverseRelease588WorkflowUserAgents(actual),/RELEASE588_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease588WorkflowUserAgents(actual,'build',true),/RELEASE588_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease588WorkflowUserAgents(null,'build'),/RELEASE588_WORKFLOW_TYPE/);
});

test('release590 five UA inverse reaches genuine588 then the existing19-hunk cold-progress adapter',async()=>{
  const actual=inverseRelease591WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build');
  assert.equal(Buffer.byteLength(actual),292886);
  assert.equal(sha(actual),'bf9f27721718511cf345505416230b10c863a963bbb49ee774e4fdea8a7adfa6');
  assert.equal(actual.split('RavRadar/4.0.590').length,6);
  const previous=inverseRelease590WorkflowUserAgents(actual,'build');
  assert.equal(Buffer.byteLength(previous),292886);
  assert.equal(sha(previous),'998d3a8e11a1088363a84bfd4a0d64f7117eacc059a3cf5c0ca895f7a85e22b3');
  assert.equal(previous,actual.replaceAll('RavRadar/4.0.590','RavRadar/4.0.588'));
  assert.equal(inverseRelease590WorkflowUserAgents(previous,'build'),previous);
  assert.equal(inverseRelease588WorkflowUserAgents(actual,'build'),inverseRelease588WorkflowUserAgents(previous,'build'));
  for(const project of [inverseAssistant587LatestColdCombinedTo664aWorkflow,inverseAssistant587LatestColdCombinedTo2bWorkflow])
    assert.equal(project(actual,'build'),project(previous,'build'));
  const normalProgress=inverseAssistant587LatestColdCombinedTo2bWorkflow(actual,'build');
  assert.equal(Buffer.byteLength(normalProgress),latestColdProgressWorkflowReview.roles.build.after.bytes);
  assert.equal(sha(normalProgress),latestColdProgressWorkflowReview.roles.build.after.sha256);
  assert.equal(inverseLatestColdProgressWorkflow(normalProgress,'build'),
    inverseLatestColdProgressWorkflow(inverseAssistant587LatestColdCombinedTo2bWorkflow(previous,'build'),'build'));
});

test('release590 UA view rejects mixed,duplicated,unknown or non-UA drift through unchanged whole oracles',async()=>{
  const actual=inverseRelease591WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build');
  for(const role of ['once','unknown','toString'])assert.equal(inverseRelease590WorkflowUserAgents(actual,role),actual);
  const mutations=[actual+'\n# UNREVIEWED590\n',
    actual.replace('RavRadar/4.0.590','RavRadar/4.0.588'),
    // 591 is now exact-reviewed; retain this unknown-future-UA refusal with 592.
    actual.replaceAll('RavRadar/4.0.590','RavRadar/4.0.592'),
    actual.replace('RavRadar/4.0.590','RavRadar/4.0.590 RavRadar/4.0.590'),
    actual.replace('steps.preflight.outputs.should_run','steps.preflight.outputs.changed')];
  for(const changed of mutations){
    assert.notEqual(changed,actual);
    assert.equal(inverseRelease590WorkflowUserAgents(changed,'build'),changed);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
  }
  assert.throws(()=>inverseRelease590WorkflowUserAgents(actual),/RELEASE590_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease590WorkflowUserAgents(actual,'build',true),/RELEASE590_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease590WorkflowUserAgents(null,'build'),/RELEASE590_WORKFLOW_TYPE/);
});

test('release591 actual normal workflow preserves genuine590 and historical refusals',async()=>{
  const actual=inverseWindTailCapacityWorkflow(inverseRelease592WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build'),'build');
  assert.equal(Buffer.byteLength(actual),292886);
  assert.equal(sha(actual),'bfb4d382c36d713328e8d68f7a04801a16f35b3bcecffb3c1e9813cc578338c7');
  assert.equal(actual.split('RavRadar/4.0.591').length,6);
  assert.equal(actual.includes('RavRadar/4.0.590'),false);
  const previous=inverseRelease591WorkflowUserAgents(actual,'build');
  assert.equal(Buffer.byteLength(previous),292886);
  assert.equal(sha(previous),'bf9f27721718511cf345505416230b10c863a963bbb49ee774e4fdea8a7adfa6');
  assert.equal(previous,actual.replaceAll('RavRadar/4.0.591','RavRadar/4.0.590'));
  assert.equal(inverseRelease591WorkflowUserAgents(previous,'build'),previous);
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual,'build')),legacySha);
  assert.equal(inverseCompletedRuntimeWorkflow(actual,'build'),inverseCompletedRuntimeWorkflow(previous,'build'));
  for(const project of [inversePairedPrivateRuntimePublication,inverseRelease590WorkflowUserAgents,
    inverseAssistant587LatestColdCombinedTo664aWorkflow,inverseAssistant587LatestColdCombinedTo2bWorkflow])
    assert.equal(project(actual,'build'),project(previous,'build'));
  for(const role of ['once','unknown','toString'])assert.equal(inverseRelease591WorkflowUserAgents(actual,role),actual);
  const mutations=[actual+'\n# UNREVIEWED591\n',
    actual.replace('RavRadar/4.0.591','RavRadar/4.0.590'),
    actual.replace('RavRadar/4.0.591','RavRadar/4.0.592'),
    actual.replaceAll('RavRadar/4.0.591','RavRadar/4.0.592'),
    actual.replace('RavRadar/4.0.591','RavRadar/4.0.591 RavRadar/4.0.591'),
    actual.replace('test "${{ steps.full-validation.outcome }}" = success','true'),
    actual.replace('steps.preflight.outputs.should_run','steps.preflight.outputs.changed')];
  for(const changed of mutations){
    assert.notEqual(changed,actual);
    assert.equal(inverseRelease591WorkflowUserAgents(changed,'build'),changed);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
  }
  assert.throws(()=>inverseRelease591WorkflowUserAgents(actual),/RELEASE591_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease591WorkflowUserAgents(actual,'build',true),/RELEASE591_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease591WorkflowUserAgents(null,'build'),/RELEASE591_WORKFLOW_TYPE/);
});


test('wind-tail capacity whole inverse preserves every591 byte and refuses budget or surrounding drift', async () => {
  const actual = inverseRelease592WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const row = windTailCapacityWorkflowReview;
  assert.equal(Buffer.byteLength(actual), row.after.bytes);
  assert.equal(sha(actual), row.after.sha256);
  const previous = inverseWindTailCapacityWorkflow(actual, 'build');
  assert.equal(Buffer.byteLength(previous), row.before.bytes);
  assert.equal(sha(previous), row.before.sha256);
  assert.equal(previous, actual.replace(row.afterBlock, row.beforeBlock));
  assert.equal(inverseWindTailCapacityWorkflow(previous, 'build'), previous);
  assert.equal(inverseRelease591WorkflowUserAgents(actual, 'build'), inverseRelease591WorkflowUserAgents(previous, 'build'));
  assert.equal(inverseCompletedRuntimeWorkflow(actual, 'build'), inverseCompletedRuntimeWorkflow(previous, 'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual, 'build')), legacySha);
  const mutations = [
    actual.replace("|| '600000'", "|| '600001'"),
    actual.replace("&& '60000'", "&& '60001'"),
    actual.replace(row.afterBlock, row.beforeBlock.replace("|| '90000'", "|| '600000'")),
    actual.replace(row.afterBlock, row.afterBlock + row.afterBlock),
    actual.replace(row.afterBlock, ''),
    actual.replace('The ordinary scalar reserve must be able to reach all 673 PARTs.', 'Unreviewed reserve policy.'),
    actual.replace("test \"${{ steps.full-validation.outcome }}\" = success", 'true'),
    actual + '\n# UNREVIEWED_TAIL_CHANGE\n',
  ];
  for (const changed of mutations) {
    assert.notEqual(changed, actual);
    assert.equal(inverseWindTailCapacityWorkflow(changed, 'build'), changed);
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
  for (const role of ['once', 'unknown', 'toString']) assert.equal(inverseWindTailCapacityWorkflow(actual, role), actual);
  assert.throws(() => inverseWindTailCapacityWorkflow(actual), /WORKFLOW_ARGUMENTS/);
  assert.throws(() => inverseWindTailCapacityWorkflow(actual, 'build', true), /WORKFLOW_ARGUMENTS/);
  assert.throws(() => inverseWindTailCapacityWorkflow(null, 'build'), /WORKFLOW_TYPE/);
});


test('release592 actual capacity workflow preserves whole591 tail and historical refusals', async () => {
  const actual = inverseRuntimeAuditExecutionWorkflow((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), 'build');
  const row = release592WorkflowUserAgentReview;
  assert.equal(Buffer.byteLength(actual), row.after.bytes);
  assert.equal(sha(actual), row.after.sha256);
  assert.equal(actual.split('RavRadar/4.0.592').length, 6);
  const previous = inverseRelease592WorkflowUserAgents(actual, 'build');
  assert.equal(Buffer.byteLength(previous), row.before.bytes);
  assert.equal(sha(previous), row.before.sha256);
  assert.equal(previous, actual.replaceAll('RavRadar/4.0.592', 'RavRadar/4.0.591'));
  assert.equal(inverseRelease592WorkflowUserAgents(previous, 'build'), previous);
  assert.equal(inverseWindTailCapacityWorkflow(previous, 'build'), previous.replace(windTailCapacityWorkflowReview.afterBlock, windTailCapacityWorkflowReview.beforeBlock));
  assert.equal(inverseRelease591WorkflowUserAgents(actual, 'build'), inverseRelease591WorkflowUserAgents(previous, 'build'));
  assert.equal(inverseCompletedRuntimeWorkflow(actual, 'build'), inverseCompletedRuntimeWorkflow(previous, 'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual, 'build')), legacySha);
  const mutations = [
    actual.replace('RavRadar/4.0.592', 'RavRadar/4.0.591'),
    actual.replace("|| '600000'", "|| '600001'"),
    actual.replace("&& '60000'", "&& '60001'"),
    actual.replace(windTailCapacityWorkflowReview.afterBlock, windTailCapacityWorkflowReview.afterBlock + windTailCapacityWorkflowReview.afterBlock),
    actual.replace('timeout-minutes: 80', 'timeout-minutes: 81'),
    actual + '\n# UNREVIEWED592_CAPACITY_CHANGE\n',
  ];
  for (const changed of mutations) {
    assert.notEqual(changed, actual);
    assert.equal(inverseRelease592WorkflowUserAgents(changed, 'build'), changed);
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
  for (const role of ['once', 'unknown', 'toString']) assert.equal(inverseRelease592WorkflowUserAgents(actual, role), actual);
  assert.throws(() => inverseRelease592WorkflowUserAgents(actual), /RELEASE592_WORKFLOW_ARGUMENTS/);
  assert.throws(() => inverseRelease592WorkflowUserAgents(actual, 'build', true), /RELEASE592_WORKFLOW_ARGUMENTS/);
  assert.throws(() => inverseRelease592WorkflowUserAgents(null, 'build'), /RELEASE592_WORKFLOW_TYPE/);
});

test('runtime audit592 observation whole inverse preserves issued592 and exact591753 parents',async()=>{
  const actual=inverseRelease593WorkflowUserAgents(inverseRelease594WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build'),'build');
  const row=runtimeAuditExecution592WorkflowReview;
  assert.equal(Buffer.byteLength(actual),row.after.bytes);assert.equal(sha(actual),row.after.sha256);
  const previous=inverseRuntimeAuditExecutionWorkflow(actual,'build');
  assert.equal(Buffer.byteLength(previous),row.before.bytes);assert.equal(sha(previous),row.before.sha256);
  assert.equal(inverseRuntimeAuditExecutionWorkflow(previous,'build'),previous);
  const genuine591=actual.replaceAll('RavRadar/4.0.592','RavRadar/4.0.591');
  assert.equal(Buffer.byteLength(genuine591),runtimeAuditExecutionWorkflowReview.after.bytes);
  assert.equal(sha(genuine591),runtimeAuditExecutionWorkflowReview.after.sha256);
  assert.equal(inverseRuntimeAuditExecutionWorkflow(genuine591,'build'),previous.replaceAll('RavRadar/4.0.592','RavRadar/4.0.591'));

  assert.equal(inverseCompletedRuntimeWorkflow(actual,'build'),inverseCompletedRuntimeWorkflow(previous,'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual,'build')),legacySha);
  for(const changed of [actual+'\n# UNKNOWN_AUDIT_CHANGE\n',
    actual.replace('|| runtime_audit_exit_status=$?','|| runtime_audit_exit_status=0'),
    actual.replace('--exit-code "$runtime_audit_exit_status"','--exit-code 0'),
    actual.replace('node scripts/observe-runtime-audit-execution.mjs --phase before || true','true'),
    actual.replace('.json.execution.json\n','.json.execution-UNKNOWN.json\n'),
    actual.replace('runtime-audit.json.failure.json','runtime-audit-UNKNOWN.json.failure.json'),
    actual.replace('Create and validate exactly one checkpoint disposition before release gate','Unreviewed disposition'),
    actual.replace('test "$'+'{{ steps.full-validation.outcome }}" = success','true')]){
    assert.notEqual(changed,actual);
    assert.equal(inverseRuntimeAuditExecutionWorkflow(changed,'build'),changed);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
  }
  for(const role of ['once','unknown','toString'])assert.equal(inverseRuntimeAuditExecutionWorkflow(actual,role),actual);
  assert.throws(()=>inverseRuntimeAuditExecutionWorkflow(actual),/WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRuntimeAuditExecutionWorkflow(actual,'build',true),/WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRuntimeAuditExecutionWorkflow(null,'build'),/WORKFLOW_TYPE/);
});


test('release593 actual workflow preserves the immutable592 body and all older whole oracles',async()=>{
  const actual=inverseRelease594WorkflowUserAgents((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build');
  const row=release593WorkflowUserAgentReview;
  assert.equal(Buffer.byteLength(actual),row.after.bytes);assert.equal(sha(actual),row.after.sha256);
  assert.equal(actual.split('RavRadar/4.0.593').length,6);
  const previous=inverseRelease593WorkflowUserAgents(actual,'build');
  assert.equal(Buffer.byteLength(previous),row.before.bytes);assert.equal(sha(previous),row.before.sha256);
  assert.equal(previous,actual.replaceAll('RavRadar/4.0.593','RavRadar/4.0.592'));
  assert.equal(inverseRelease593WorkflowUserAgents(previous,'build'),previous);
  assert.equal(sha(previous),runtimeAuditExecution592WorkflowReview.after.sha256);
  assert.equal(inverseRuntimeAuditExecutionWorkflow(actual,'build'),inverseRuntimeAuditExecutionWorkflow(previous,'build'));
  assert.equal(inverseRelease592WorkflowUserAgents(actual,'build'),inverseRelease592WorkflowUserAgents(previous,'build'));
  assert.equal(inverseCompletedRuntimeWorkflow(actual,'build'),inverseCompletedRuntimeWorkflow(previous,'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual,'build')),legacySha);
  for(const changed of [actual.replace('RavRadar/4.0.593','RavRadar/4.0.592'),
    actual.replace("|| '600000'","|| '600001'"),actual.replace('timeout-minutes: 80','timeout-minutes: 81'),
    actual.replace('|| runtime_audit_exit_status=$?','|| runtime_audit_exit_status=0'),
    actual+'\n# UNKNOWN593_WORKFLOW_CHANGE\n']){
    assert.notEqual(changed,actual);assert.equal(inverseRelease593WorkflowUserAgents(changed,'build'),changed);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
  }
  for(const role of ['once','unknown','toString'])assert.equal(inverseRelease593WorkflowUserAgents(actual,role),actual);
  assert.throws(()=>inverseRelease593WorkflowUserAgents(actual),/RELEASE593_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease593WorkflowUserAgents(actual,'build',true),/RELEASE593_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease593WorkflowUserAgents(null,'build'),/RELEASE593_WORKFLOW_TYPE/);
});

test('full Git pin preparation has an exact outer inverse before every unchanged workflow oracle',async()=>{
  const actual=(await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n');
  const row=fullGitPinnedSourcePreparationWorkflowReview;
  assert.equal(Buffer.byteLength(actual),row.after.bytes);assert.equal(sha(actual),row.after.sha256);
  const previous=inverseFullGitPinnedSourcePreparationWorkflow(actual,'build');
  assert.equal(Buffer.byteLength(previous),row.before.bytes);assert.equal(sha(previous),row.before.sha256);
  assert.deepEqual(row.before,release594WorkflowUserAgentReview.after);
  assert.equal(inverseFullGitPinnedSourcePreparationWorkflow(previous,'build'),previous);
  assert.equal(inverseCompletedRuntimeWorkflow(actual,'build'),inverseCompletedRuntimeWorkflow(previous,'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual,'build')),legacySha);
  const mutations=[actual+'\n# UNKNOWN_FULL_GIT_CHANGE\n','!'+actual.slice(1)];
  for(const[before,after]of row.hunks)for(const replacement of [before,after+after,''])
    mutations.push(actual.replace(after,()=>replacement));
  for(const changed of mutations){
    assert.notEqual(changed,actual);
    assert.equal(inverseFullGitPinnedSourcePreparationWorkflow(changed,'build'),changed);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
  }
  for(const role of ['once','unknown','toString'])
    assert.equal(inverseFullGitPinnedSourcePreparationWorkflow(actual,role),actual);
  assert.throws(()=>inverseFullGitPinnedSourcePreparationWorkflow(actual),/WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseFullGitPinnedSourcePreparationWorkflow(actual,'build',true),/WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseFullGitPinnedSourcePreparationWorkflow(null,'build'),/WORKFLOW_TYPE/);
});

test('release594 actual workflow preserves whole593 and refuses unrelated changes',async()=>{
  const actual=inverseFullGitPinnedSourcePreparationWorkflow(
    (await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n'),'build');
  const row=release594WorkflowUserAgentReview;
  assert.equal(Buffer.byteLength(actual),row.after.bytes);assert.equal(sha(actual),row.after.sha256);
  assert.equal(actual.split('RavRadar/4.0.594').length,6);
  const previous=inverseRelease594WorkflowUserAgents(actual,'build');
  assert.equal(Buffer.byteLength(previous),row.before.bytes);assert.equal(sha(previous),row.before.sha256);
  assert.equal(previous,actual.replaceAll('RavRadar/4.0.594','RavRadar/4.0.593'));
  assert.equal(inverseRelease594WorkflowUserAgents(previous,'build'),previous);
  assert.equal(inverseCompletedRuntimeWorkflow(actual,'build'),inverseCompletedRuntimeWorkflow(previous,'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(actual,'build')),legacySha);
  for(const changed of [actual.replace('RavRadar/4.0.594','RavRadar/4.0.593'),
    actual.replace("|| '600000'","|| '600001'"),actual.replace('timeout-minutes: 80','timeout-minutes: 81'),
    actual.replace('|| runtime_audit_exit_status=$?','|| runtime_audit_exit_status=0'),
    actual+'\n# UNKNOWN594_WORKFLOW_CHANGE\n']){
    assert.notEqual(changed,actual);assert.equal(inverseRelease594WorkflowUserAgents(changed,'build'),changed);
    assert.throws(()=>inverseCompletedRuntimeWorkflow(changed,'build'));
  }
  for(const role of ['once','unknown','toString'])assert.equal(inverseRelease594WorkflowUserAgents(actual,role),actual);
  assert.throws(()=>inverseRelease594WorkflowUserAgents(actual),/RELEASE594_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease594WorkflowUserAgents(actual,'build',true),/RELEASE594_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseRelease594WorkflowUserAgents(null,'build'),/RELEASE594_WORKFLOW_TYPE/);
});

// The actual repair is read before the unchanged historical workflow oracles.
test('terminal delivery repair maps only five exact whole sources and its exact wrapper inventory', async () => {
  const { terminalRepair4145WorkflowReview: review, inverseTerminalRepair4145Workflow: inverse,
    inverseTerminalRepair4145WorkflowInventory: inventory } = await import('./lib/completed-private-runtime-workflow-review.mjs');
  assert.deepEqual(Object.keys(review.roles), ['orchestrator', 'once', 'repair', 'recovery', 'deploy']);
  for (const [role, row] of Object.entries(review.roles)) {
    const actual = (await fs.readFile(new URL('../' + row.path, import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(Buffer.byteLength(actual), row.after.bytes); assert.equal(sha(actual), row.after.sha256);
    const prior = inverse(actual, role);
    assert.equal(Buffer.byteLength(prior), row.before.bytes); assert.equal(sha(prior), row.before.sha256);
    assert.equal(inverse(prior, role), prior);
    assert.equal(inverseCompletedRuntimeWorkflow(actual, role), inverseCompletedRuntimeWorkflow(prior, role));
    const unknown = actual + '\n# UNREVIEWED terminal repair mutation\n';
    assert.equal(inverse(unknown, role), unknown, 'Unknown whole bytes never receive the inverse');
    for (const unknownRole of ['unknown', 'toString', '__proto__', null, 1])
      assert.equal(inverse(actual, unknownRole), actual, 'Unknown or inherited role cannot select a reviewed inverse');
    for (const [offset, fragment] of row.edits) {
      const mixed = actual.slice(0, offset) + 'MIXED_UNREVIEWED' + actual.slice(offset + fragment.length);
      assert.equal(inverse(mixed, role), mixed, 'Every incomplete/mixed hunk stays outside the whole inverse');
    }
  }
  const wrapper = (await fs.readFile(new URL('../' + review.wrapper.path, import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  const names = ['other-unreviewed.yml', review.wrapper.name, 'update-and-deploy.yml'];
  assert.deepEqual(inventory(names, wrapper), ['other-unreviewed.yml', 'update-and-deploy.yml']);
  assert.deepEqual(names, ['other-unreviewed.yml', review.wrapper.name, 'update-and-deploy.yml']);
  assert.throws(() => inventory(names, wrapper + '\n'), /TERMINAL4145_WRAPPER_/);
  assert.throws(() => inventory(names, wrapper.replace('pull-requests: read', 'pull-requests: write')), /TERMINAL4145_WRAPPER_/);
  assert.throws(() => inventory([...names, review.wrapper.name], wrapper), /TERMINAL4145_INVENTORY_DUPLICATE/);
  assert.throws(() => inventory(names.filter(name => name !== review.wrapper.name), wrapper), /TERMINAL4145_WRAPPER_ONE/);
});
