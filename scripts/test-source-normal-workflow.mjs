// Actual SOURCE ordinary caller contracts; synthetic local values only.
// These checks do not execute providers, mint an owner, qualify B/S or deploy.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SOURCE_NORMAL_WORKFLOW_REVIEW as review, inverseSourceNormalWorkflow, inverseRelease588WorkflowUserAgents, inverseSourceNormalWorkflowForHistoricalOracle } from './lib/source-normal-workflow-review.mjs';
import { buildWeatherOperationalControlSummary } from './weather-operational-control-summary.mjs';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const actual = Object.fromEntries(Object.entries(review.roles).map(([role, row]) => [role, read(row.relativePath)]));
const prior = Object.fromEntries(Object.entries(actual).map(([role, source]) => [role, inverseSourceNormalWorkflow(source, role)]));
const count = (text, value) => text.split(value).length - 1;
const gh = value => '$' + '{{ ' + value + ' }}';
function steps(source) {
  const headings = [...source.matchAll(/^      - (name|uses): ([^\n]+)\n/gm)];
  return headings.map((match, index) => {
    const body = source.slice(match.index, headings[index + 1]?.index ?? source.length);
    return { name: match[1] === 'name' ? match[2] : null, at: match.index, body,
      id: /^        id: (.+)$/m.exec(body)?.[1],
      condition: /^        if: (.+)$/m.exec(body)?.[1] ?? 'true' };
  });
}
function named(source, name) {
  const rows = steps(source).filter(row => row.name === name || row.id === name);
  assert.equal(rows.length, 1, 'One actual step ' + name); return rows[0];
}
function job(source, name) {
  const marker = '  ' + name + ':\n', start = source.indexOf(marker);
  assert(start >= 0); const end = source.slice(start + marker.length).search(/^  [a-z][a-z-]*:\n/m);
  return source.slice(start, end < 0 ? source.length : start + marker.length + end);
}
function script(source, name) {
  const body = named(source, name).body;
  const match = /node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/.exec(body);
  assert(match, 'Actual inline Node program ' + name);
  const code = match[1].replace(/^          /gm, '');
  for (const line of code.split('\n').filter(line => line.startsWith('import ')))
    assert(['import assert from \'node:assert/strict\';', 'import fs from \'node:fs\';',
      "import { buildWeatherOperationalControlSummary } from './scripts/weather-operational-control-summary.mjs';"].includes(line));
  return code.replace(/^import [^\n]+\n/gm, '');
}
function runInline(source, name, env, report) {
  const parent = fs.realpathSync(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, 'rr-source-route-'));
  const output = path.join(root, 'output'), reportName = '.geometry-v2-work/weather-source-operational-control-summary.json';
  const reportPath = path.join(root, reportName);
  try {
    if (report !== undefined) { fs.mkdirSync(path.dirname(reportPath)); fs.writeFileSync(reportPath, JSON.stringify(report)); }
    // Only paths are redirected to this owned synthetic host. Actual file,
    // descriptor, stat and canonical-summary implementations remain in use.
    const mapped = value => value === reportName ? reportPath : value;
    const isolatedFs = { ...fs, existsSync: value => fs.existsSync(mapped(value)),
      lstatSync: (value, options) => fs.lstatSync(mapped(value), options),
      openSync: (value, flags) => fs.openSync(mapped(value), flags) };
    Function('process', 'fs', 'assert', 'buildWeatherOperationalControlSummary', script(source, name))(
      { env: { ...env, GITHUB_OUTPUT: output } }, isolatedFs, assert, buildWeatherOperationalControlSummary);
    return Object.fromEntries(fs.readFileSync(output, 'utf8').trimEnd().split('\n').map(line => {
      const at = line.indexOf('='); assert(at > 0); return [line.slice(0, at), line.slice(at + 1)];
    }));
  } finally {
    assert.equal(path.dirname(root), parent); assert(path.basename(root).startsWith('rr-source-route-'));
    assert(!fs.lstatSync(root).isSymbolicLink()); fs.rmSync(root, { recursive: true });
  }
}
function requestFor(source, name, enabled) {
  const code = script(source, name);
  const booleans = JSON.parse(/const booleans=(\[[^\n]+?\]), strings=/.exec(code)[1]);
  const strings = JSON.parse(/, strings=(\[[^\n]+?\]);/.exec(code)[1]);
  return { source_normal_producer: enabled, ...Object.fromEntries(booleans.map(key => [key, false])),
    ...Object.fromEntries(strings.map(key => [key, ''])),
    ...(source === actual.build ? { force: true, production_target_hour: '2030-01-01T00:00:00Z' } : {}) };
}
const requestNames = { build: 'Select one explicit legacy or SOURCE ordinary route',
  once: 'Reject unknown or mixed SOURCE request before any operational reentry' };
test('SOURCE whole caller inverses preserve genuine d4bd, exact588 sync and reject every hunk mutation', () => {
  for (const [role, row] of Object.entries(review.roles)) {
    const genuine = execFileSync('git', ['show', review.predecessorHead + ':' + row.relativePath],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 });
    assert.equal(inverseRelease588WorkflowUserAgents(prior[role], role), genuine);
    assert.equal(inverseSourceNormalWorkflowForHistoricalOracle(actual[role], role), genuine);
    assert.equal(sha(actual[role]), row.actualSha256);
    assert.throws(() => inverseSourceNormalWorkflow(genuine, role), 'No historical identity fallback');
    assert.throws(() => inverseSourceNormalWorkflow(actual[role], 'other'));
    for (const edit of row.edits) {
      for (const replacement of ['', edit.current + edit.current, '#' + edit.current.slice(1), edit.original]) {
        const changed = actual[role].slice(0, edit.offset) + replacement + actual[role].slice(edit.offset + edit.current.length);
        assert.notEqual(changed, actual[role]); assert.throws(() => inverseSourceNormalWorkflow(changed, role));
      }
    }
    assert(Object.isFrozen(row) && Object.isFrozen(row.edits) && row.edits.every(Object.isFrozen));
  }
});
test('both actual request programs are explicit default-OFF and reject unknown or mixed SOURCE modes', () => {
  for (const [role, name] of Object.entries(requestNames)) {
    const source = actual[role];
    assert.match(source, /      source_normal_producer:\n(?:        [^\n]*\n)*?        type: boolean\n        default: false/);
    const run = request => runInline(source, name, { SOURCE_REQUEST: JSON.stringify(request) });
    const off = requestFor(source, name, false), on = requestFor(source, name, true);
    assert.deepEqual(run(off), { route: 'legacy' }); assert.deepEqual(run(on), { route: 'source' });
    for (const bad of [null, [], { ...on, unknown: false }, { ...on, source_normal_producer: 'true' },
      { ...on, source_normal_producer: undefined }]) assert.throws(() => run(bad));
    for (const [key, value] of Object.entries(on)) {
      if (['source_normal_producer', 'force', 'production_target_hour'].includes(key)) continue;
      assert.throws(() => run({ ...on, [key]: typeof value === 'boolean' ? true : 'unexpected' }), key);
      assert.throws(() => run({ ...on, [key]: undefined }), key + ' missing');
      assert.equal(run({ ...off, [key]: typeof value === 'boolean' ? true : 'existing-legacy-mode' }).route, 'legacy');
    }
    if (role === 'build') for (const bad of [{ ...on, force: 'true' }, { ...on, production_target_hour: '' },
      { ...on, production_target_hour: '2030-01-01T00:30:00Z' }]) assert.throws(() => run(bad));
  }
});
const resultName = 'Select actual route observations without legacy fallback';
const resultCode = script(actual.build, resultName);
const resultNames = JSON.parse(/const names=(\[[^\n]+\]);/.exec(resultCode)[1]);
const fields = JSON.parse(/const fields=(\{[^\n]+\});/.exec(resultCode)[1]);
const base = ['preflight_should_run', 'operational_action', 'operational_model', 'operational_binding_current',
  'central_version', 'initial_cutover_required', 'legacy_source_required', 'active_deployment_id'];
const direct = JSON.parse(/const direct=(\{[^\n]+\});/.exec(resultCode)[1]);
const kinds = JSON.parse(/const kinds=(\{[^\n]+\});/.exec(resultCode)[1]);
const scalar = { preflight_should_run: 'true', operational_action: 'integrated', operational_model: 'integrated',
  operational_binding_current: 'true', central_version: '1', initial_cutover_required: 'false', legacy_source_required: 'false',
  integrated_implementation_closure_sha256: '1'.repeat(64), active_deployment_id: 'synthetic', weather_outcome: 'success',
  full_validation_outcome: 'success', release_gate_outcome: 'success', checkpoint_disposition: 'READY_PUBLISHED',
  checkpoint_disposition_sha256: '2'.repeat(64), checkpoint_dataset_id: 'synthetic-dataset',
  checkpoint_runtime_audit_sha256: '3'.repeat(64), checkpoint_build_outcome: 'success', checkpoint_save_outcome: 'success',
  checkpoint_publish_outcome: 'success' };
const legacyEnv = Object.fromEntries(Object.entries(scalar).map(([key, value]) => ['LEGACY_' + key.toUpperCase(), value]));
const identity = { GITHUB_SHA: '4'.repeat(40), GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' };
const normalReport = () => buildWeatherOperationalControlSummary({ sourceHead: identity.GITHUB_SHA,
  runId: identity.GITHUB_RUN_ID, runAttempt: identity.GITHUB_RUN_ATTEMPT,
  checks: Object.entries(kinds).map(([id, kind]) => id + '|' + kind + '|success') });
const prepared = () => ({ source_result_kind: 'PREPARED_WEATHER',
  ...Object.fromEntries(Object.entries(fields).map(([key, field]) => [field, scalar[key]])),
  ...Object.fromEntries(Object.values(direct).map(key => [key, 'success'])),
  source_private_runtime_anonymous_denied: 'true', source_operational_control_report: 'observed' });
const runResult = (source, report, extra = {}) => runInline(actual.build, resultName, { ...legacyEnv, ...identity,
  SOURCE_SELECTED: 'true', SOURCE_ACTION_OUTCOME: 'success', SOURCE_OUTPUTS: JSON.stringify(source), ...extra }, report);
test('actual route result preserves all 19 legacy mappings and never falls back from a failed SOURCE', () => {
  assert.equal(resultNames.length, 19); assert.deepEqual(Object.keys(fields), resultNames);
  const resultStep = named(actual.build, resultName).body;
  const oldOutputs = prior.build.slice(prior.build.indexOf('    outputs:\n'), prior.build.indexOf('    steps:\n'));
  for (const name of resultNames) {
    const priorExpression = new RegExp('^      ' + name + ': (.+)$', 'm').exec(oldOutputs)?.[1];
    assert(priorExpression, name);
    assert(resultStep.includes('          LEGACY_' + name.toUpperCase() + ': ' + priorExpression), name + ' unchanged mapping');
    assert(actual.build.includes('      ' + name + ': ' + gh('steps.weather-route-result.outputs.' + name)), name + ' job output');
  }
  const off = runResult(null, undefined, { SOURCE_SELECTED: 'false', SOURCE_ACTION_OUTCOME: 'failure',
    SOURCE_OUTPUTS: 'not-json', RAVRADAR_PRIVATE_RUNTIME_BUNDLE: '/synthetic/bundle' });
  assert.deepEqual(off, { ...scalar, private_runtime_bundle: '/synthetic/bundle' });
  for (const outcome of ['failure', 'cancelled', 'skipped', '']) assert.throws(() => runResult(prepared(), normalReport(), { SOURCE_ACTION_OUTCOME: outcome }));
  for (const value of [null, [], {}, { source_result_kind: 'SUCCESS' }]) assert.throws(() => runResult(value));
  assert.throws(() => runResult(prepared(), normalReport(), { SOURCE_SELECTED: '"true"' }));
});
test('actual NO_WORK is not a prepared generation and may not carry old control or publication outputs', () => {
  const noWork = { source_result_kind: 'NO_WORK', ...Object.fromEntries(base.map(key => [fields[key], scalar[key]])),
    source_preflight_should_run: 'false' };
  const result = runResult(noWork);
  assert.deepEqual(result, { source_result_kind: 'NO_WORK', ...Object.fromEntries(base.map(key => [key, key === 'preflight_should_run' ? 'false' : scalar[key]])) });
  assert.throws(() => runResult(noWork, normalReport()));
  for (const key of resultNames.filter(key => !base.includes(key))) assert.throws(() => runResult({ ...noWork, [fields[key]]: scalar[key] }), key);
  assert.throws(() => runResult({ ...noWork, source_preflight_should_run: 'true' }));
});
test('actual prepared result requires current report identity, finite complete observations and anonymous denial', () => {
  const result = runResult(prepared(), normalReport());
  for (const key of resultNames) assert.equal(result[key], scalar[key]);
  assert.equal(result.private_runtime_bundle, '/tmp/ravradar-private-production-runtime/bundle-source-successor');
  assert.equal(result.control_private_runtime_anon_audit, 'success');
  for (const key of [...Object.values(fields), ...Object.values(direct), 'source_private_runtime_anonymous_denied', 'source_operational_control_report']) {
    const missing = prepared(); delete missing[key]; assert.throws(() => runResult(missing, normalReport()), key);
  }
  for (const [key, value] of [['sourceHead', '5'.repeat(40)], ['runId', '124'], ['runAttempt', '2'],
    ['privatePayloadIncluded', true], ['checks', []], ['failureCount', 1]]) assert.throws(() => runResult(prepared(), { ...normalReport(), [key]: value }), key);
  for (const key of base.filter(key => key !== 'preflight_should_run')) assert.throws(() => runResult({ ...prepared(), [fields[key]]: 'changed' }, normalReport()), key);
  assert.throws(() => runResult(prepared()));
  assert.throws(() => runResult({ ...prepared(), source_checkpoint_dataset_id: 'unsafe\noutput=true' }, normalReport()));
  // Existing diagnostic policy is observed, not silently relabelled green.
  const checks = Object.entries(kinds).map(([id, kind]) => id + '|' + kind + '|' + (id === 'full-validation' ? 'failure' : 'success'));
  const degraded = buildWeatherOperationalControlSummary({ sourceHead: identity.GITHUB_SHA, runId: identity.GITHUB_RUN_ID, runAttempt: '1', checks });
  const observed = runResult({ ...prepared(), source_full_validation_outcome: 'failure' }, degraded);
  assert.equal(observed.full_validation_outcome, 'failure'); assert.equal(observed.control_full_validation, 'failure');
});
function evaluate(expression, state) {
  const value = expression.replace(/^\$\{\{\s*|\s*\}\}$/g, '').replace(/\b(inputs|steps|github|needs)\.[A-Za-z0-9_.-]+/g, token => {
    let item = state; for (const key of token.split('.')) item = item?.[key]; return JSON.stringify(item) ?? 'undefined';
  });
  return Function('always', 'cancelled', 'success', 'failure', 'hashFiles', 'startsWith', 'contains', 'return (' + value + ');')(
    () => true, () => state.cancelled, () => !state.failed, () => state.failed,
    () => state.files ? 'hash' : '', (a, b) => String(a).startsWith(b), (a, b) => a?.includes(b) ?? false);
}
test('critical source gate preserves the exact old release oracle and actual release-after-validation-failure route', () => {
  const gate = read('scripts/source-critical-gate.mjs');
  assert.equal(count(gate, "import { inverseSourceNormalWorkflowForHistoricalOracle } from './lib/source-normal-workflow-review.mjs';"), 1);
  assert(gate.includes("const buildWorkflow = inverseSourceNormalWorkflowForHistoricalOracle("));
  assert(gate.includes("read('.github/workflows/reusable-weather-build.yml').replaceAll('\\r\\n', '\\n'), 'build');"));
  const release = named(actual.build, 'release-gate');
  const old = named(prior.build, 'release-gate');
  const state = { inputs: { source_normal_producer: false }, failed: true, cancelled: false,
    steps: { preflight: { outputs: { should_run: 'true' } },
      'operational-action': { outputs: { action: 'integrated' } } } };
  assert(release.condition.includes('always()'));
  assert.equal(evaluate(old.condition, state), true);
  assert.equal(evaluate(release.condition, state), true, 'A failed validation must not suppress the independent release attempt');
  assert.equal(evaluate(release.condition, { ...state, inputs: { source_normal_producer: true } }), false,
    'SOURCE uses its own producer controls, never both routes');
  for(const [shouldRun, action] of [['false', 'integrated'], ['true', 'integrated-cutover']]){
    const closed = { ...state, steps: { preflight: { outputs: { should_run: shouldRun } },
      'operational-action': { outputs: { action } } } };
    assert.equal(evaluate(release.condition, closed), false);
    assert.equal(evaluate(old.condition, closed), false);
  }
  assert.equal(count(actual.build, release.condition), 1);
  for(const replacement of [release.condition.replace('always() && ', ''),
    release.condition + ' && success()', release.condition + release.condition]){
    const changed = actual.build.replace(release.condition, replacement);
    assert.throws(() => inverseSourceNormalWorkflowForHistoricalOracle(changed, 'build'),
      'No weakened, duplicated or success-only condition may obtain the old oracle');
  }
});
test('default legacy step selectors stay equivalent across outcome/mode cases; true SOURCE excludes every legacy-only step', () => {
  const oldSteps = steps(prior.build).filter(row => row.name);
  const current = steps(actual.build);
  const route = named(actual.build, resultName).body;
  const mapping = Object.fromEntries([...route.matchAll(/^          LEGACY_([A-Z_]+): \$\{\{ (.+) \}\}$/gm)].map(row => [row[1].toLowerCase(), row[2]]));
  let compared = 0, excluded = 0;
  for (const old of oldSteps) {
    const same = current.filter(row => row.name === old.name); assert.equal(same.length, 1, old.name);
    const next = same[0];
    for (let i = 0; i < 24; i++) {
      const state = { inputs: requestFor(actual.build, requestNames.build, false), steps: {}, needs: {},
        github: { ref: i % 2 ? 'refs/heads/main' : 'refs/heads/other', event_name: ['workflow_dispatch', 'push', 'pull_request'][i % 3] },
        files: i % 2 === 0, failed: i % 3 === 0, cancelled: i % 5 === 0 };
      const conditions = old.condition + ' ' + next.condition + ' ' + Object.values(mapping).join(' ');
      for (const match of conditions.matchAll(/steps\.([\w-]+)\.(?:outputs\.([\w-]+)|(outcome))/g)) {
        const item = state.steps[match[1]] ??= { outputs: {}, outcome: ['success', 'failure', 'skipped', 'cancelled'][i % 4] };
        if (match[2]) item.outputs[match[2]] = ['true', 'false', '', 'READY_PUBLISHED'][i % 4];
      }
      state.steps['operational-action'] = { outputs: { action: ['integrated', 'integrated-historical-maintenance', 'integrated-cutover', 'candidate-dry-run', 'candidate-maintenance', 'integrated-return'][i % 6] } };
      state.steps['weather-route-result'] = { outcome: 'success', outputs: Object.fromEntries(Object.entries(mapping).map(([key, expression]) => [key, evaluate(expression, state)])) };
      if (i > 11) for (const key of Object.keys(state.inputs)) if (typeof state.inputs[key] === 'boolean' && key !== 'source_normal_producer') state.inputs[key] = true;
      assert.equal(Boolean(evaluate(next.condition, state)), Boolean(evaluate(old.condition, state)), old.name + ' legacy case ' + i);
      if (next.condition.startsWith('inputs.source_normal_producer == false &&')) {
        state.inputs.source_normal_producer = true; assert.equal(Boolean(evaluate(next.condition, state)), false, old.name + ' isolated from SOURCE'); excluded++;
      }
      compared++;
    }
  }
  assert(compared > 3000 && excluded > 2000, 'Every old named selector, not a small chosen sample');
});
test('normal caller dependency/main gates, one SOURCE action and actual B-before-S producer ordering remain closed', () => {
  const build = actual.build, once = actual.once;
  const source = named(build, 'source-normal');
  assert.equal(source.condition, 'inputs.source_normal_producer == true');
  assert.equal(count(build, '        id: source-normal\n'), 1);
  assert(source.body.includes('uses: ./.github/actions/save-owned-dmi-grib\n'));
  assert(source.body.includes('          operation: source\n'));
  for (const before of ['source-route', 'source-proof', 'source-gate', 'source-route-profile',
    'Preflight exact integrated trip binding before provider work', 'Sync centrally saved admin configuration']) assert(named(build, before).at < source.at, before);
  assert(!source.body.includes('continue-on-error:'));
  const main = named(build, 'Require checked-out HEAD to equal current origin/main').body;
  for (const required of ['test "$GITHUB_REF" = "refs/heads/main"', 'git rev-parse HEAD^{commit}', 'git rev-parse origin/main^{commit}']) assert(main.includes(required));
  const onceGuard = job(once, 'source-route-request');
  assert(!onceGuard.includes('secrets.') && !onceGuard.includes('actions: write'));
  assert(job(once, 'operational-recovery-gate').includes("needs: source-route-request\n    if: needs.source-route-request.result == 'success' &&"));
  assert(job(once, 'current-main-target').includes('needs: [source-route-request, operational-recovery-gate]'));
  assert(job(once, 'build-and-prepare').includes('source_normal_producer: ' + gh('inputs.source_normal_producer')));
  assert.equal(job(once, 'deploy-pages'), job(prior.once, 'deploy-pages'), 'All old deployment permission/result guards unchanged');
  assert.equal(job(once, 'terminal-outcome'), job(prior.once, 'terminal-outcome'), 'No new false terminal success');
  for (const name of ['pages-build', 'pages-privacy', 'deployment-decision', 'source-operational-handoff-seal']) assert(named(build, name).at > named(build, resultName).at);
  assert.equal(named(build, 'deployment-decision').condition, "steps.weather-route-result.outputs.preflight_should_run == 'true'");
  const tail = read('scripts/source-normal-producer-tail.mjs');
  const publisher = tail.slice(tail.indexOf('async function publishSourceNormalArtifact('), tail.indexOf('\nasync function ', tail.indexOf('async function publishSourceNormalArtifact(') + 1));
  const order = ["const actualWriteAuthority = await recheck();", "artifact.currentControls.firstSafetyFailure !== null",
    'sourcePostWeatherCacheOutcomes(state);', "publication.private = await runSourceRequiredProgram(holder, operation, 'artifactPrivatePublish');",
    "published.private_anonymous_denied !== 'true'", 'publication.privateAck = freezeSourceOriginalMetadata(published);',
    "publication.checkpoint = await runSourceRequiredProgram(holder, operation, 'artifactCheckpointPublish');", 'publication.checkpointAck = freezeSourceOriginalMetadata(checkpoint);'];
  let last = -1; for (const marker of order) { assert.equal(count(publisher, marker), 1); const at = publisher.indexOf(marker); assert(at > last, marker); last = at; }
  assert(publisher.includes("publication.publishAttempted = true"));
  assert(publisher.includes('phase.transportClosed !== true'));
  assert(publisher.includes('return reconfirmSourceNormalMain(holder)'));
  assert(!publisher.includes('continueOnError'));
});

test('normal source plan registers this structural target exactly once through the existing completed inverse caller', () => {
  const complete = read('scripts/test-completed-private-runtime-workflow-inverse.mjs');
  const reusable = read('scripts/test-reusable-production-workflows.mjs');
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(count(complete, "await import('./test-source-normal-workflow.mjs');"), 1);
  assert.equal(count(reusable, "await import('./test-completed-private-runtime-workflow-inverse.mjs');"), 1);
  assert.equal(count(scripts['test:deploy-source-critical'], 'scripts/test-reusable-production-workflows.mjs'), 1);
  assert.equal(count(scripts['validate:source:checks'], 'npm run test:deploy-source-critical'), 1);
  assert.equal(count(JSON.stringify(scripts), 'scripts/test-source-normal-workflow.mjs'), 0, 'No duplicate standalone package target');
});
test('SOURCE isolation preserves the actual newer P0 and genuine587 bodies and the same seven early source gates', () => {
  const onlySelector = body => body.replace(/^        if: .+\n/m, '');
  const names = [
    'Record the actual epoch build start before checkout',
    'Require the explicit fresh caller-only cold-start scope',
    'Restore encrypted private weather progress only',
    'Require recovered progress before short confirmation',
    'Prepare strict active DMI donor or resumable candidate',
    'Bind production to resolved DMI current hour',
    'Select only authentic586 for the normal assistant successor',
    'Prepare the whole original-preserving586 working view',
    'Install only the allowlisted restored private runtime files',
    'Plan bounded current history from the actual selected continuation',
    ...['dmi', 'copernicus', 'open-meteo', 'weather'].map(phase => 'Preserve the fixed epoch post-processing reserve before ' + phase),
  ];
  for (const name of names) assert.equal(onlySelector(named(actual.build, name).body), onlySelector(named(prior.build, name).body), name);
  for (const name of [
    'Restore source-content validation locator', 'Verify exact-content source validation with GitHub',
    'Prepare exact pinned Candidate G source before source validation', 'Install source-gate dependencies',
    'Run fast source gate before expensive data refresh', 'Record actual source validation outcome',
    'Preserve latest verified source-content validation outcome',
  ]) {
    assert.equal(onlySelector(named(actual.build, name).body), onlySelector(named(prior.build, name).body), name);
    assert(named(actual.build, name).at < named(actual.build, 'Sync centrally saved admin configuration').at, name + ' fail-fast placement');
  }
  for (const value of ['39886354260-1', '39933506923-1', '2026-10-23T01:00:00Z'])
    assert(named(actual.build, 'Require the explicit fresh caller-only cold-start scope').body.includes(value));
  assert.equal(count(actual.build, 'RavRadar/4.0.588'), 5);
  assert.equal(count(actual.build, 'RavRadar/4.0.587'), 0);
  assert.equal(inverseRelease588WorkflowUserAgents(prior.once, 'once'), prior.once, 'No invented once version layer');
  const changed = prior.build.replace('RavRadar/4.0.588', 'RavRadar/4.0.587');
  assert.notEqual(changed, prior.build);
  assert.equal(inverseRelease588WorkflowUserAgents(changed, 'build'), changed, 'Partial UA drift is not normalized');
});
