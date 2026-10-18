// Test-only source inverse. No native B/S fixture, providers or production calls.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import { inverseCompletedRuntimeWorkflow, inverseOrdinaryFullHistoryCheckout, inversePairedPrivateRuntimePublication, inverseOriginWeatherReadCredentials, assertCurrentHistoryRawRetentionOrder, inverseCurrentHistoryRawRetentionOrder, inverseCurrentFamilyColdStartWorkflow, inverseRelease583WorkflowUserAgent } from './lib/completed-private-runtime-workflow-review.mjs';
import { runInNewContext } from 'node:vm';
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
  [role, inverseRelease583WorkflowUserAgent((await fs.readFile(new URL('../' + row.relativePath, import.meta.url), 'utf8')).replaceAll('\r\n', '\n'), role)])));
test('release583 UA-only inverse preserves every C oracle and rejects partial UA, changed body and wrong role', async () => {
  const source = (await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  assert.equal(sha(source), '4c86626e29537f51d48b0246fe33559f6efcdf0e1f431d879c2283290b0ad7a0');
  assert.equal(source.split('RavRadar/4.0.583').length, 6, 'Exactly five actual UA fields');
  const previous = inverseRelease583WorkflowUserAgent(source, 'build');
  assert.equal(sha(previous), '4883b292423e162eec6f88d6402ef189adca71dc538fdfe22b7f91162f8ce4f0');
  assert.equal(previous, coldActual.build, 'Whole reviewed C afterimage, not merely matching headers');
  assert.equal(previous.replaceAll('RavRadar/4.0.581', 'RavRadar/4.0.583'), source);
  for (const role of ['once', 'orchestrator', 'deploy', 'recovery', 'unknown'])
    assert.equal(inverseRelease583WorkflowUserAgent(source, role), source, 'Wrong role cannot enter UA inverse');
  assert.equal(inverseRelease583WorkflowUserAgent(previous, 'build'), previous, 'Historical afterimage is unchanged');
  for (const changed of [
    source.replace('RavRadar/4.0.583', 'RavRadar/4.0.581'),
    source.replace('          fetch-depth: 0', '          fetch-depth: 1'),
    source + '\n# RavRadar/4.0.583\n',
  ]) {
    assert.notEqual(changed, source);
    assert.equal(inverseRelease583WorkflowUserAgent(changed, 'build'), changed, 'Unknown whole bytes cannot enter UA inverse');
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'), 'Every historical downstream gate still refuses drift');
  }
});
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
