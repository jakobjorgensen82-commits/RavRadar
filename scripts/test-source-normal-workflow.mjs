// Actual SOURCE ordinary caller contracts; synthetic local values only.
// These checks do not execute providers, mint an owner, qualify B/S or deploy.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { sourceGateRecord, decideSourceGate as genericSourceDecision, SOURCE_GATE_CONTRACT, SOURCE_GATE_STEP } from './lib/weather-source-gate.mjs';
import { isDeepStrictEqual as sameRouteFixture } from 'node:util';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SOURCE_NORMAL_WORKFLOW_REVIEW as review, inverseSourceNormalWorkflow, SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW as mainImportReview, inverseSourceNormalMainImportWorkflow, SOURCE_NORMAL_SCALAR_WORKFLOW_REVIEW as scalarWorkflowReview, inverseSourceNormalScalarWorkflow, inverseSourceNormalInstalledRouteWorkflow, SOURCE_NORMAL_INSTALLED_ROUTE_WORKFLOW_REVIEW as installedRouteReview, inverseSourceNormalFinal596Workflow, SOURCE_NORMAL_FINAL596_WORKFLOW_REVIEW as final596Review } from './lib/source-normal-workflow-review.mjs';
import { buildWeatherOperationalControlSummary } from './weather-operational-control-summary.mjs';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const actual = Object.fromEntries(Object.entries(review.roles).map(([role, row]) => [role, inverseSourceNormalInstalledRouteWorkflow(read(row.relativePath),role)]));
const historicalActual = Object.fromEntries(Object.entries(actual).map(([role, source]) => [role, inverseSourceNormalMainImportWorkflow(source, role)]));
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
test('SOURCE whole caller inverses reproduce genuine b2 and reject drift in every reviewed hunk', () => {
  const actual = historicalActual; // Genuine fixed 6c8 CODE for all unchanged old oracles.
  for (const [role, row] of Object.entries(review.roles)) {
    const genuine = execFileSync('git', ['show', review.predecessorHead + ':' + row.relativePath],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 });
    assert.equal(prior[role], genuine); assert.equal(sha(actual[role]), row.actualSha256);
    assert.throws(() => inverseSourceNormalWorkflow(genuine, role), 'No historical identity fallback');
    assert.throws(() => inverseSourceNormalWorkflow(actual[role], 'other'));
    for (const edit of row.edits) {
      const changed = actual[role].slice(0, edit.offset) + '#' + actual[role].slice(edit.offset + 1);
      assert.notEqual(changed, actual[role]); assert.throws(() => inverseSourceNormalWorkflow(changed, role));
    }
    assert(Object.isFrozen(row) && Object.isFrozen(row.edits) && row.edits.every(Object.isFrozen));
  }
  // The raw current callers separately qualify only the fixed actual merge.
  assert.deepEqual(Object.values(mainImportReview.roles).map(row => row.layers.map(layer => layer.editCount)), [[37, 5], [4]]);
  for (const [role, row] of Object.entries(mainImportReview.roles)) {
    const current = inverseSourceNormalScalarWorkflow(read(row.relativePath),role), first = row.layers[0];
    assert.equal(Buffer.byteLength(current), first.after.bytes);
    assert.equal(sha(current), first.after.sha256);
    assert.equal(inverseSourceNormalMainImportWorkflow(current, role), actual[role]);
    assert.equal(inverseSourceNormalWorkflow(current, role), prior[role]);
    assert(Object.isFrozen(row) && Object.isFrozen(row.layers));
    for (const layer of row.layers) {
      assert(Object.isFrozen(layer) && Object.isFrozen(layer.edits) && layer.edits.every(Object.isFrozen));
    }
    for (const edit of first.edits) {
      const changed = current.slice(0, edit.offset) + '#' + current.slice(edit.offset + 1);
      assert.notEqual(changed, current);
      assert.equal(inverseSourceNormalMainImportWorkflow(changed, role), changed);
      assert.throws(() => inverseSourceNormalWorkflow(changed, role));
    }
    for (const changed of [current + '\n', current.replace('      source_normal_producer:', '      unknown_source_normal_producer:')]) {
      assert.notEqual(changed, current);
      assert.equal(inverseSourceNormalMainImportWorkflow(changed, role), changed);
      assert.throws(() => inverseSourceNormalWorkflow(changed, role));
    }
    if (role === 'build') {
      const positions = [...current.matchAll(/RavRadar\/4\.0\.595/g)].map(match => match.index);
      assert.equal(positions.length, 5);
      for (const at of positions) {
        const changed = current.slice(0, at) + '#' + current.slice(at + 1);
        assert.equal(inverseSourceNormalMainImportWorkflow(changed, role), changed);
        assert.throws(() => inverseSourceNormalWorkflow(changed, role));
      }
    }
    assert.equal(inverseSourceNormalMainImportWorkflow(current, 'other'), current);
    assert.throws(() => inverseSourceNormalMainImportWorkflow(current), /SOURCE_MAIN_IMPORT_INVERSE_ARGUMENTS/);
    assert.throws(() => inverseSourceNormalMainImportWorkflow(null, role), /SOURCE_MAIN_IMPORT_INVERSE_TYPE/);
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
test('default legacy step selectors stay equivalent across outcome/mode cases; true SOURCE excludes every legacy-only step', () => {
  const actual=historicalActual; // Exact reviewed original SOURCE-on-b2 input, before the later main594 assistant route.
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

test('SOURCE scalar workflow outer inverse keeps genuine a166 and all historical layers exact',()=>{
  const raw=inverseSourceNormalInstalledRouteWorkflow(read('.github/workflows/reusable-weather-build.yml'),'build'),row=scalarWorkflowReview;
  assert.equal(sha(raw),row.after.sha256);assert.equal(Buffer.byteLength(raw),row.after.bytes);
  const old=inverseSourceNormalScalarWorkflow(raw,'build');
  assert.equal(old,execFileSync('git',['show','7a5b23e18525a6747a1a0e49f99ff20fbdc1864c:.github/workflows/reusable-weather-build.yml'],{cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024}));
  assert.equal(inverseSourceNormalWorkflow(raw,'build'),inverseSourceNormalWorkflow(old,'build'));
  for(const[,actual]of row.hunks){
    const at=raw.indexOf(actual);assert(at>=0);
    const changed=raw.slice(0,at)+'#'+raw.slice(at+1);
    assert.equal(inverseSourceNormalScalarWorkflow(changed,'build'),changed);
    assert.throws(()=>inverseSourceNormalWorkflow(changed,'build'));
  }
  for(const role of ['once','other'])assert.equal(inverseSourceNormalScalarWorkflow(raw,role),raw);
  assert.throws(()=>inverseSourceNormalScalarWorkflow(raw),/SOURCE_SCALAR_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseSourceNormalScalarWorkflow(null,'build'),/SOURCE_SCALAR_WORKFLOW_TYPE/);
});

test('SOURCE raw76 DMI registration qualifies the actual normal plan and preserves both old package views',async()=>{
  const observed=JSON.parse(read('package.json')).scripts;
  const {inverseReviewedSupabaseBackupSourceScripts}=await import('./lib/account-statistics-assistant-package-review.mjs');
  const raw=Object.hasOwn(observed,'test:supabase-backup')?inverseReviewedSupabaseBackupSourceScripts(observed):observed,original=structuredClone(raw);
  const {reviewedSourceDmiMainSourceScripts:mainView,inverseReviewedSourceDmiScalarGapSourceScripts:oldView,SOURCE_DMI_PACKAGE_SCRIPT_REVIEW:row}=await import('./national584-source-evidence.mjs');
  const digest=value=>sha(JSON.stringify(Object.keys(value).sort().map(key=>[key,value[key]])));
  assert.equal(digest(raw),row.afterSha256);
  const main75=mainView(raw),source73=oldView(raw);
  assert.equal(digest(main75),row.mainAfterSha256);assert.equal(digest(source73),row.beforeSha256);
  assert.deepEqual(raw,original,'Actual raw Source76 is never rewritten');
  for(const mutate of [v=>delete v['test:source-producer-source'],v=>v['test:source-producer-source']+=' --unexpected',
    v=>v['test:assistant-later-h0-source']=v['test:assistant-later-h0-source'].replace('source594','source585'),
    v=>v['test:ravscore-source-critical']+=' && npm run test:source-producer-source',
    v=>v['test:weather-source-critical']=source73['test:weather-source-critical'],
    v=>v['validate:source:checks']=source73['validate:source:checks'],v=>v.unknown='node scripts/UNKNOWN.mjs']){
    const changed=structuredClone(raw);mutate(changed);assert.throws(()=>mainView(changed));assert.throws(()=>oldView(changed));
  }
  assert.throws(()=>oldView(source73));assert.throws(()=>mainView(main75));
  assert.throws(()=>mainView(raw,{}));assert.throws(()=>oldView(null));
});

// Synthetic route/metadata tests only. No source import, provider, SQL or owner is executed.
function installedRouteFixture() {
  const stage=read('scripts/stage-source-producer-originals.mjs');
  const source=read('scripts/lib/source-producer-successor-source.mjs');
  const before=JSON.parse(/export const SOURCE_PRODUCER_BEFORE=Object.freeze\((\{[\s\S]*?\})\);/.exec(source)[1]);
  const metadata=JSON.parse(read('scripts/lib/source-producer-binding.generated.json'));
  const from=stage.indexOf('export function sourceProducerOriginalStageFamily(');
  const until=stage.indexOf('\n// Route selection only:',from);
  assert(from>=0&&until>from);
  const family=Function('assert','OLD',stage.slice(from,until).replace('export function','function')
    +';return sourceProducerOriginalStageFamily;')(assert,before);
  const start=stage.indexOf('export async function selectInstalledSourceNormalRoute(');
  const end=stage.indexOf('\nexport async function stageSourceProducerOriginals()',start);
  assert(start>=0&&end>start);
  const body=stage.slice(start,end).replace('export async function','async function');
  // These are deliberately synthetic full-object fixtures, not production bindings or readbacks.
  const binding={modelBundleSha256:metadata.binding.I,modelId:'SYNTHETIC_ROUTE_ONLY'};
  const contracts={continuationStateContractSha256:metadata.binding.T,
    checkpointContractSha256:metadata.output.checkpointContractSha256,
    tripBindingPolicySha256:metadata.output.tripBindingPolicySha256};
  const current={modelBinding:binding,contractHashes:contracts};
  const operational={model:'integrated',status:'INTEGRATED_ACTIVE',pending:false,bindingCurrent:true,
    initialCutoverRequired:false,legacySourceRequired:false,centralVersion:1,modelBinding:binding};
  let selected=structuredClone(current),reads=0,outputIssued=true;
  const compiled=Function('assert','same','requireSourceProducerOutput','requireSourceProducerBinding',
    'describeCurrentProtectedPrivateProductionRuntime','sourceProducerOriginalStageFamily','ravScoreModelBinding',
    'privateRuntimeContractHashes',body+';return selectInstalledSourceNormalRoute;')(
      assert,sameRouteFixture,
      ()=>{assert(outputIssued,'SOURCE_PRODUCER_SQL_UNISSUED');return metadata.output;},()=>metadata.binding,
      async({request})=>{reads++;return request();},family,()=>binding,async()=>contracts);
  return { before,metadata,binding,contracts,current,operational,selector:compiled,documentRequest:async()=>structuredClone(selected),run:request=>compiled({request,operational,
    documentRequest:async()=>structuredClone(selected)}),select:value=>{selected=structuredClone(value);},
    issue:value=>{outputIssued=value;},reads:()=>reads };
}


async function runInstalledOperationalModel(source,fixture,request){
  const body=named(source,'operational-model').body;
  const match=/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/.exec(body);
  assert(match,'Execute the actual operational-model route program');
  const code=match[1].replace(/^          /gm,'');
  const allowed=["import fs from 'node:fs';",
    "import { createSupabaseAdminRequester } from './scripts/lib/supabase-admin-rest.mjs';",
    "import { selectInstalledSourceNormalRoute } from './scripts/stage-source-producer-originals.mjs';"];
  assert.deepEqual(code.split('\n').filter(line=>line.startsWith('import ')),allowed);
  const parent=fs.realpathSync(os.tmpdir()),own=fs.mkdtempSync(path.join(parent,'rr-source-route-'));
  try{
    const output=path.join(own,'output');fs.writeFileSync(path.join(own,'current.json'),JSON.stringify(fixture.operational));
    const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
    await AsyncFunction('process','fs','createSupabaseAdminRequester','selectInstalledSourceNormalRoute',
      code.replace(/^import [^\n]+\n/gm,''))({env:{RAVRADAR_OPERATIONAL_WORK:own,GITHUB_OUTPUT:output,
        SUPABASE_URL:'https://synthetic.invalid/',SUPABASE_SERVICE_ROLE_KEY:'dummy-no-live-key',SOURCE_REQUEST:JSON.stringify(request)}},
      fs,options=>{assert.deepEqual(options,{endpoint:'https://synthetic.invalid/rest/v1/admin_documents',key:'dummy-no-live-key'});
        return fixture.documentRequest;},fixture.selector);
    const value=fs.readFileSync(output,'utf8');assert.equal(value,'source_normal_producer=true\n');return 'source';
  }finally{
    assert.equal(path.dirname(own),parent);assert(path.basename(own).startsWith('rr-source-route-'));
    assert(!fs.lstatSync(own).isSymbolicLink());fs.rmSync(own,{recursive:true});
  }
}

for(const caller of ['run-current-weather-once','update-and-deploy'])
test('installed SOURCE ordinary defaults choose one effective route: '+caller,async()=>{
  const raw=read('.github/workflows/reusable-weather-build.yml');
  const request=requestFor(actual.build,requestNames.build,false);
  const callerSource=read('.github/workflows/'+caller+'.yml');
  if(caller==='update-and-deploy'){
    const neutral=/      ravscore_candidate_g_rollback_mode:\n[\s\S]*?        default: ([^\n]+)/.exec(callerSource)[1];
    assert.equal(neutral,'none');request.ravscore_candidate_g_rollback_mode=neutral;request.force=false;
    assert(callerSource.includes('ravscore_candidate_g_rollback_mode: '+gh('needs.validate-dispatch.outputs.ravscore_candidate_g_rollback_mode')));
  }else{
    assert(callerSource.includes("      ravscore_candidate_g_rollback_mode: ''"));
    assert(callerSource.includes('      source_normal_producer: '+gh('inputs.source_normal_producer')));
  }
  if(!named(raw,'operational-model').body.includes('selectInstalledSourceNormalRoute')){
    assert.equal(runInline(raw,requestNames.build,{SOURCE_REQUEST:JSON.stringify(request)}).route,'source',
      'Installed SOURCE must reach the effective ordinary route without per-dispatch opt-in');
    return;
  }
  const f=installedRouteFixture();
  assert.equal(await runInstalledOperationalModel(raw,f,request),'source');assert.equal(f.reads(),1);
  const selected='steps.operational-model.outputs.source_normal_producer';
  const source=named(raw,'source-normal');assert.equal(source.condition,selected+" == 'true'");
  const inline=named(raw,'operational-model').body;
  assert(inline.includes('const documentRequest=createSupabaseAdminRequester('));
  assert(inline.includes('await selectInstalledSourceNormalRoute({request:JSON.parse(process.env.SOURCE_REQUEST),operational,documentRequest})'));
  assert(inline.includes('SOURCE_REQUEST: '+gh('toJSON(inputs)')));
  assert(!inline.includes('R2_')&&!inline.includes('continue-on-error'));
  assert(!raw.slice(raw.indexOf('      - name: Read exact centrally active operational RavScore')).includes('inputs.source_normal_producer'));
  const db=named(raw,'Preflight exact integrated trip binding before provider work');
  assert(db.body.includes('if test "'+gh(selected)+'" = true; then'));
  assert(db.body.includes('source_readiness_args+=(--source-producer)'));
  const result=named(raw,resultName);
  assert(result.body.includes('SOURCE_SELECTED: '+gh(selected)));
  assert(named(raw,'operational-model').at<db.at&&db.at<source.at&&source.at<result.at);
  assert.equal(named(raw,'source-route').body,named(actual.build,'source-route').body,'Early explicit/mixed request guard is unchanged');
  const old=steps(actual.build),next=steps(raw);
  assert.equal(next.length,old.length);
  let checked=0;
  for(let i=0;i<old.length;i++){
    if(!old[i].condition.includes('inputs.source_normal_producer'))continue;
    const expected=old[i].condition.replaceAll('inputs.source_normal_producer == true',selected+" == 'true'")
      .replaceAll('inputs.source_normal_producer == false',selected+" == 'false'");
    assert.equal(next[i].condition,expected,old[i].name);checked++;
  }
  assert(checked>150,'All old route-conditioned selectors are mapped, not a chosen sample');
});

test('installed SOURCE route refuses unissued/mixed/unknown tuples and retains exact special-flow boundaries',async()=>{
  const f=installedRouteFixture(),request=requestFor(actual.build,requestNames.build,false);
  f.issue(false);await assert.rejects(f.run(request),/SOURCE_PRODUCER_SQL_UNISSUED/);assert.equal(f.reads(),0);f.issue(true);
  for(const bad of [{...request,unknown:false},{...request,force:'false'},
    {...request,production_target_hour:'2030-02-30T00:00:00Z'},
    {...request,production_target_hour:'2030-01-01T00:30:00Z'},
    {...request,source_normal_producer:'false'},{...request,completed_stage_source:undefined}])
    await assert.rejects(f.run(bad));
  for(const [key,value] of Object.entries(request)){
    if(['source_normal_producer','force','production_target_hour'].includes(key))continue;
    const special={...request,[key]:typeof value==='boolean'?true:'a-real-special-mode'};
    await assert.rejects(f.run(special),/SOURCE_ROUTE_INSTALLED_SPECIAL_UNSUPPORTED/,key);
    await assert.rejects(f.run({...special,source_normal_producer:true}),/SOURCE_ROUTE_MIXED_REQUEST/,key);
  }
  for(const mutate of [v=>v.modelBinding.modelBundleSha256='f'.repeat(64),
    v=>v.contractHashes.continuationStateContractSha256=f.before.T,
    v=>v.contractHashes.tripBindingPolicySha256='f'.repeat(64),v=>v.contractHashes.extra='not-admitted']){
    const selected=structuredClone(f.current);mutate(selected);f.select(selected);await assert.rejects(f.run(request));
  }
  f.select(f.current);
  for(const key of ['pending','bindingCurrent','initialCutoverRequired','legacySourceRequired','centralVersion','status','model']){
    const saved=f.operational[key];f.operational[key]=typeof saved==='boolean'?!saved:typeof saved==='number'?0:'unknown';
    await assert.rejects(f.run(request),/SOURCE_ROUTE_OPERATIONAL_NOT_ACTIVE/);f.operational[key]=saved;
  }
  const old={modelBinding:{...f.binding,modelBundleSha256:f.before.I},
    contractHashes:{...f.contracts,continuationStateContractSha256:f.before.T}};
  f.select(old);f.operational.modelBinding=old.modelBinding;
  await assert.rejects(f.run(request),/SOURCE_ROUTE_NOT_INSTALLED/);
  await assert.rejects(f.run({...request,source_normal_producer:true}),/SOURCE_ROUTE_NOT_INSTALLED/);
  assert.equal(await f.run({...request,checkpoint_only:true}),'legacy','Existing predecessor special route retains its guards');
  f.operational.modelBinding=f.binding;await assert.rejects(f.run({...request,checkpoint_only:true}),/SOURCE_ROUTE_CENTRAL_BINDING_CHANGED/);
});

test('installed SOURCE exact outer workflow inverse preserves all old layers and refuses drift',()=>{
  const raw=inverseSourceNormalFinal596Workflow(read('.github/workflows/reusable-weather-build.yml'),'build'),row=installedRouteReview;
  assert.equal(sha(raw),row.after.sha256);assert.equal(Buffer.byteLength(raw),row.after.bytes);
  const old=inverseSourceNormalInstalledRouteWorkflow(raw,'build');
  assert.equal(sha(old),row.before.sha256);assert.equal(Buffer.byteLength(old),row.before.bytes);
  assert.equal(old,execFileSync('git',['show',row.sourceHead+':.github/workflows/reusable-weather-build.yml'],{cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024}));
  assert.equal(inverseSourceNormalWorkflow(raw,'build'),inverseSourceNormalWorkflow(old,'build'));
  for(const edit of row.edits){
    const changed=raw.slice(0,edit.offset)+'#'+raw.slice(edit.offset+1);
    assert.equal(inverseSourceNormalInstalledRouteWorkflow(changed,'build'),changed);
    assert.throws(()=>inverseSourceNormalWorkflow(changed,'build'));
  }
  for(const changed of [raw+'\n',raw.replace('source_normal_producer','UNKNOWN')])
    assert.equal(inverseSourceNormalInstalledRouteWorkflow(changed,'build'),changed);
  assert.equal(inverseSourceNormalInstalledRouteWorkflow(raw,'other'),raw);
  assert.throws(()=>inverseSourceNormalInstalledRouteWorkflow(raw),/SOURCE_INSTALLED_ROUTE_INVERSE_ARGUMENTS/);
  assert.throws(()=>inverseSourceNormalInstalledRouteWorkflow(null,'build'),/SOURCE_INSTALLED_ROUTE_INVERSE_TYPE/);
});

test('installed SOURCE entry admits exactly the two normal paths with unchanged actual run job runner and source gates',async()=>{
  const source=read('scripts/source-normal-producer-entry.mjs');
  const paths=JSON.parse(/const WORKFLOWS = Object.freeze\((\[[\s\S]*?\])\);/.exec(source)[1].replaceAll("'",'"'));
  assert.deepEqual(paths,['.github/workflows/run-current-weather-once.yml','.github/workflows/update-and-deploy.yml']);
  const from=source.indexOf('async function qualifyNormalJob(state) {'),until=source.indexOf('\nfunction retainEntryFirstFailure',from);
  assert(from>=0&&until>from);const code=source.slice(from,until);
  const identity={GITHUB_REPOSITORY:'synthetic/repository',GITHUB_RUN_ID:'7',GITHUB_RUN_ATTEMPT:'1',
    GITHUB_SHA:'1'.repeat(40),GITHUB_EVENT_NAME:'workflow_dispatch',RUNNER_NAME:'synthetic-runner',EXTENDED_PROVIDER_BOOTSTRAP:'false'};
  const started='2030-01-01T00:00:00Z',wall=Date.parse(started);
  const baseRun={id:7,run_attempt:1,head_sha:identity.GITHUB_SHA,head_branch:'main',path:paths[0],event:'workflow_dispatch',
    status:'in_progress',conclusion:null,repository:{full_name:identity.GITHUB_REPOSITORY},head_repository:{full_name:identity.GITHUB_REPOSITORY}};
  const baseJob={id:8,name:'Build and prepare weather production through reusable workflow / build-and-prepare',run_id:7,
    head_sha:identity.GITHUB_SHA,run_attempt:1,status:'in_progress',conclusion:null,completed_at:null,runner_id:9,
    runner_name:identity.RUNNER_NAME,started_at:started};
  let run,job,required=false,checks=0;
  const qualify=Function('sourcePrIdentities','qualifyPrNativeJob','githubJson','need','WORKFLOWS','JOB','fs','path',
    'ROOT','sourceTreeContentSha256','decideSourceGate','assertProcess',code+';return qualifyNormalJob;')(
      new WeakSet(),()=>assert.fail('Normal paths must not enter the separate PR-native branch'),
      async(_state,url)=>({json:url.includes('/jobs?')?{jobs:[job],total_count:1}:run,
        response:{headers:{get:()=>null}},before:{wall}}),
      (value,code)=>assert(value,code),paths,baseJob.name,{readFile:async()=>'{}'},path,ROOT,
      ()=>'sha256:'+'2'.repeat(64),async()=>({required}),()=>{checks++;});
  const state=()=>({identity,clockUpper:wall});
  for(const workflow of paths){
    run={...baseRun,path:workflow};job={...baseJob};const s=state();await qualify(s);await qualify(s);
    assert.equal(s.workflowPath,workflow);assert.equal(s.endEpoch,wall+230*60000);
    run={...run,path:paths.find(p=>p!==workflow)};await assert.rejects(qualify(s),/RUN_PATH_CHANGED/);
  }
  for(const badPath of ['.github/workflows/deploy-code-only-repair.yml','.github/workflows/validate-pull-request.yml',
    '.github/workflows/UNKNOWN.yml',paths[0]+'@main']){
    run={...baseRun,path:badPath};job={...baseJob};await assert.rejects(qualify(state()),/RUN/);
  }
  for(const mutate of [v=>v.run_attempt=2,v=>v.head_sha='3'.repeat(40),v=>v.head_branch='branch',
    v=>v.status='completed',v=>v.event='push',v=>v.repository={full_name:'other/repository'}]){
    run={...baseRun};job={...baseJob};mutate(run);await assert.rejects(qualify(state()),/RUN/);
  }
  for(const mutate of [v=>v.runner_name='other',v=>v.run_attempt=2,v=>v.head_sha='3'.repeat(40),
    v=>v.status='completed',v=>v.completed_at=started,v=>v.started_at='not-a-time']){
    run={...baseRun};job={...baseJob};mutate(job);await assert.rejects(qualify(state()),/JOB/);
  }
  run={...baseRun};job={...baseJob};required=true;await assert.rejects(qualify(state()),/EXACT_SOURCE_GATE/);
  assert.equal(checks,4,'All four successful qualifications retain the actual final process guard');
});


test('installed SOURCE legacy isolation uses the actual complete M5 predecessor',()=>{
  const raw=read('.github/workflows/reusable-weather-build.yml');
  const main=execFileSync('git',['show','097f07ea974840f42a7a69d50a0e0a8ba178cc22:.github/workflows/reusable-weather-build.yml'],
    {cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024});
  const priorSteps=steps(main).filter(row=>row.name),current=steps(raw);
  const route=named(raw,resultName).body;
  const mapping=Object.fromEntries([...route.matchAll(/^          LEGACY_([A-Z_]+): \$\{\{ (.+) \}\}$/gm)].map(row=>[row[1].toLowerCase(),row[2]]));
  let compared=0,excluded=0;
  for(const old of priorSteps){
    const same=current.filter(row=>row.name===old.name);assert.equal(same.length,1,old.name);const next=same[0];
    for(let i=0;i<24;i++){
      const state={inputs:requestFor(actual.build,requestNames.build,false),steps:{},needs:{},
        github:{ref:i%2?'refs/heads/main':'refs/heads/other',event_name:['workflow_dispatch','push','pull_request'][i%3]},
        files:i%2===0,failed:i%3===0,cancelled:i%5===0};
      const conditions=old.condition+' '+next.condition+' '+Object.values(mapping).join(' ');
      for(const match of conditions.matchAll(/steps\.([A-Za-z0-9-]+)\.(?:outputs\.([A-Za-z0-9_]+)|outcome)/g)){
        const item=state.steps[match[1]]??={outcome:['success','failure','skipped'][i%3],outputs:{}};
        if(match[2])item.outputs[match[2]]=['true','false','','READY_PUBLISHED'][i%4];
      }
      state.steps['operational-action']={outputs:{action:['integrated','integrated-historical-maintenance','integrated-cutover','candidate-dry-run','candidate-maintenance','integrated-return'][i%6]}};
      state.steps['operational-model']??={outputs:{}};
      state.steps['operational-model'].outputs.source_normal_producer='false';
      state.steps['weather-route-result']={outcome:'success',outputs:Object.fromEntries(Object.entries(mapping).map(([key,expression])=>[key,evaluate(expression,state)]))};
      if(i>11)for(const key of Object.keys(state.inputs))if(typeof state.inputs[key]==='boolean'&&key!=='source_normal_producer')state.inputs[key]=true;
      assert.equal(Boolean(evaluate(next.condition,state)),Boolean(evaluate(old.condition,state)),old.name+' actual M5 legacy case '+i);
      if(next.condition.startsWith("steps.operational-model.outputs.source_normal_producer == 'false' &&")){
        state.steps['operational-model'].outputs.source_normal_producer='true';
        assert.equal(Boolean(evaluate(next.condition,state)),false,old.name+' isolated from installed SOURCE');excluded++;
      }
      compared++;
    }
  }
  assert(compared>3000&&excluded>2000,'Full actual M5 selector scope, not the older b2 scope');
  const assistant=named(raw,'Prepare exact old-reader restore for the measured wave transition');
  assert(assistant.condition.includes("steps.assistant-later-h0-source.outputs.required != 'true'"));
  const state={inputs:{},steps:{'operational-model':{outputs:{source_normal_producer:'false'}},
    'assistant-later-h0-source':{outputs:{required:'true'}},preflight:{outputs:{should_run:'true'}},
    'operational-action':{outputs:{action:'integrated'}}}};
  assert.equal(Boolean(evaluate(assistant.condition,state)),false,'Actual assistant route must exclude the old-reader wave restore');
  state.steps['assistant-later-h0-source'].outputs.required='false';
  assert.equal(Boolean(evaluate(assistant.condition,state)),true,'Without the assistant route the same eligible old-reader selector remains open');
});

// Actual lazy resolver and normal caller/guard bodies with isolated metadata clients.
// Synthetic expectations below are unit-test data only, never a DB/readiness/activation proof.
function codeReadinessFixture(){
  const readiness=read('scripts/integrated-cutover-readiness.mjs'),operational=read('scripts/ravscore-operational-activation.mjs');
  const source=read('scripts/lib/source-producer-successor-source.mjs');
  const old=JSON.parse(/export const SOURCE_PRODUCER_BEFORE=Object.freeze\((\{[\s\S]*?\})\);/.exec(source)[1]);
  const issued=JSON.parse(read('scripts/lib/source-producer-binding.generated.json'));
  const phase='assistant-installed593-origin591-successor';
  const policyId=/export const TRIP_BINDING_POLICY_ID\s*=\s*'([^']+)'/.exec(readiness)[1];
  const activeId=/export const TRIP_ACTIVE_ADMISSION_POLICY_ID\s*=\s*'([^']+)'/.exec(readiness)[1];
  const fields=JSON.parse(/const MODEL_BINDING_FIELDS = Object.freeze\((\[[\s\S]*?\])\);/.exec(readiness)[1].replaceAll("'",'"').replace(/,\s*]/,']'));
  const makeBinding=(bundle,contract)=>Object.fromEntries(fields.map((key,i)=>[key,key==='modelBundleSha256'?bundle:
    key==='modelContractSha256'?contract:'synthetic-'+i]));
  const sourceI=makeBinding(issued.binding.I,'a'.repeat(64)),sourceC=makeBinding(issued.binding.C,'b'.repeat(64));
  const oldI=makeBinding(old.I,'a'.repeat(64)),oldC=makeBinding(old.C,'b'.repeat(64));
  let I=sourceI,C=sourceC,issuedOutput=true,sourceOutputReads=0,metadataReads=0;
  const previous=Object.freeze(Array.from({length:61},(_,i)=>Object.freeze({id:'synthetic-original-'+i})));
  const current=Object.freeze([...previous,Object.freeze({id:issued.version+'_source_producer_original_bound_successor'})]);
  const required=p=>{assert([phase,'source-producer'].includes(p));return p===phase?previous:current;};
  const fn=(text,start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a);assert(a>=0&&b>a);return text.slice(a,b);};
  const start=readiness.indexOf('export function codeBoundIntegratedReadinessFamily(');
  const family=start<0?()=>assert.fail('CODE_BOUND_FAMILY_UNAVAILABLE'):
    Function('assert','ravScoreModelBinding','candidateGRollbackModelBinding','assertRavScoreModelBinding',
      'assertCandidateGRollbackModelBinding','ACTIVE','DEFAULT_CUTOVER_SOURCE_PHASE','integratedReadinessRequiredMigrations',
      'requireSourceProducerOutput','requireSourceProducerBinding',
      fn(readiness,'export function codeBoundIntegratedReadinessFamily(','export async function buildIntegratedCutoverReadiness(')
        .replace('export function','function')+';return codeBoundIntegratedReadinessFamily;')(
      assert,()=>I,()=>C,value=>assert.deepEqual(value,I),value=>assert.deepEqual(value,C),
      {requireBinding:()=>old,requireOutput:()=>({tripBindingPolicySha256:old.tripBindingPolicySha256})},phase,required,
      ()=>{sourceOutputReads++;assert(issuedOutput,'SOURCE_PRODUCER_SQL_UNISSUED');return issued.output;},()=>issued.binding);
  const profile={kind:'SYNTHETIC_UNIT_PROFILE'},activeHash='c'.repeat(64),head='d'.repeat(40),closure='e'.repeat(64);
  const document=p=>({schemaVersion:'ravscore-integrated-cutover-readiness-v1',sourceHead:head,
    modelContractSha256:I.modelContractSha256,modelBundleSha256:I.modelBundleSha256,
    publicImplementationClosureSha256:closure,migrationIds:required(p).map(row=>row.id),tripSchemaVersion:3,
    tripBindingPolicyId:policyId,tripBindingPolicySha256:p===phase?old.tripBindingPolicySha256:issued.output.tripBindingPolicySha256,
    tripActiveAdmissionPolicyId:activeId,tripActiveAdmissionPolicySha256:activeHash,modelBinding:I,candidateModelBinding:C,
    centralProfile:profile,assistantBinding:{modelId:I.modelId,stateSchemaVersion:I.stateSchemaVersion,
      modelContractSha256:I.modelContractSha256,modelBundleSha256:I.modelBundleSha256,
      knowledgeSchema:'rav-assistant-public-knowledge-v1',knowledgeSha256:'f'.repeat(64)}});
  let actual=document('source-producer'),databaseChecks=0,edgeChecks=0;
  const normalDocumentGuard=Function('assert','stableJson',fn(readiness,'function assertReadinessDocument(','function assertSealedModelBindingShape(')
    +';return assertReadinessDocument;')(assert,value=>JSON.stringify(value));
  const checker=Function('DEFAULT_CUTOVER_SOURCE_PHASE','buildIntegratedCutoverReadiness','readReadinessDocument',
    'assertReadinessDocument','verifyIntegratedDatabaseReadback','verifyTripStorageEdgeBoundaries','verifyIntegratedAssistantEdge',
    fn(readiness,'export async function checkIntegratedCutoverReadiness(','function sourceHeadFromEnvironment(')
      .replace('export async function','async function')+';return checkIntegratedCutoverReadiness;')(
      phase,async(sourceHead,{sourcePhase,publicImplementationClosureSha256})=>{
        assert.equal(sourceHead,head);assert.equal(publicImplementationClosureSha256,closure);return document(sourcePhase);},
      async()=>{metadataReads++;return actual;},normalDocumentGuard,
      async options=>{databaseChecks++;assert.equal(options.sourcePhase,I.modelBundleSha256===old.I?phase:'source-producer');
        assert.equal(options.url,'https://synthetic.invalid');assert.equal(options.serviceRoleKey,'dummy-service');},
      async()=>{edgeChecks++;},async()=>{edgeChecks++;});
  const processFixture={env:{SUPABASE_URL:'https://synthetic.invalid',SUPABASE_SERVICE_ROLE_KEY:'dummy-service',SUPABASE_PUBLISHABLE_KEY:'dummy-public'}};
  const fresh=Function('process','PUBLIC_CONFIG','checkIntegratedCutoverReadiness','codeBoundIntegratedReadinessFamily',
    fn(operational,'async function checkedIntegratedReadinessForEnvironment(','async function readJsonOption(')
      +';return checkedIntegratedReadinessForEnvironment;')(processFixture,{},checker,family);
  const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)
    &&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort());
  const guard=Function('codeBoundIntegratedReadinessFamily','exactKeys','integratedModelBinding','candidateModelBinding',
    'SHA256_PATTERN','TRIP_BINDING_POLICY_ID','EXPECTED_TRIP_BINDING_POLICY','TRIP_ACTIVE_ADMISSION_POLICY_ID',
    'EXPECTED_TRIP_ACTIVE_ADMISSION_POLICY','REQUIRED_CUTOVER_MIGRATIONS','assertBinding','assertIntegratedBinding',
    'assertCandidateBinding','assertIntegratedRavScoreSelection','assertProfileRowForSealedBinding',
    fn(operational,'function assertIntegratedReadiness(','function assertSealedIntegratedReadiness(')
      +';return assertIntegratedReadiness;')(family,exact,()=>I,()=>C,/^[a-f0-9]{64}$/,
      policyId,{sha256:old.tripBindingPolicySha256},activeId,{sha256:activeHash},previous,
      (value,expected,validate)=>{validate(value);assert.deepEqual(value,expected);},
      value=>assert.deepEqual(value,I),value=>assert.deepEqual(value,C),value=>assert.deepEqual(value,profile),
      (row,binding)=>{assert.deepEqual(row,{version:1,payload:profile});assert.deepEqual(binding,I);});
  const repair=read('scripts/protected-operational-reentry-evidence.mjs');
  const repairBody=fn(repair,'async function repairLiveReadiness(','async function preparedPhaseTarget(');
  const dependency=/  const \{([^}]+)\}=await import\('\.\/integrated-cutover-readiness\.mjs'\);/;
  assert(dependency.test(repairBody),'Only actual module loading is adapted to the isolated normal dependencies');
  const repairFresh=Function('process','PUBLIC_CONFIG','readinessModule',
    repairBody.replace(dependency,'  const {$1}=readinessModule;')+';return repairLiveReadiness;')(
      processFixture,{}, {checkIntegratedCutoverReadiness:checker,codeBoundIntegratedReadinessFamily:family});
  return {old,issued,family,head,closure,document,guard,fresh:()=>fresh(head,closure),
    repair:()=>repairFresh({sourceHead:head,publicImplementationClosureSha256:closure}),
    oldCode:()=>{I=oldI;C=oldC;actual=document(phase);},sourceCode:()=>{I=sourceI;C=sourceC;actual=document('source-producer');},
    setI:value=>{I={...I,modelBundleSha256:value};},setC:value=>{C={...C,modelBundleSha256:value};},
    issue:value=>{issuedOutput=value;},setActual:value=>{actual=value;},actual:()=>structuredClone(actual),
    counts:()=>({sourceOutputReads,metadataReads,databaseChecks,edgeChecks})};
}

test('code-bound readiness normal fresh operational caller accepts Source after installation',async()=>{
  const f=codeReadinessFixture();assert.equal((await f.fresh()).migrationIds.length,62);
  assert.deepEqual(f.counts(),{sourceOutputReads:1,metadataReads:1,databaseChecks:1,edgeChecks:2});
});
test('code-bound readiness normal pure plan and Pages guard accepts exact Source family',()=>{
  const f=codeReadinessFixture();assert.equal(f.guard(f.actual(),f.head),true);
  for(const mutate of [v=>v.migrationIds.pop(),v=>v.tripBindingPolicySha256=f.old.tripBindingPolicySha256,
    v=>v.modelBundleSha256=f.old.I,v=>v.modelBinding={...v.modelBinding,modelBundleSha256:f.old.I},
    v=>v.assistantBinding.modelBundleSha256=f.old.I,v=>v.tripActiveAdmissionPolicySha256='a'.repeat(64),
    v=>v.sourceHead='a'.repeat(40),v=>v.unknown=true]){
    const value=f.actual();mutate(value);assert.throws(()=>f.guard(value,f.head));
  }
});
test('code-bound readiness already-qualified repair caller uses same current-code family',async()=>{
  const f=codeReadinessFixture();assert.equal((await f.repair()).migrationIds.length,62);
  assert.equal(f.counts().databaseChecks,1);assert.equal(f.counts().edgeChecks,2);
  const drift=f.actual();drift.modelBundleSha256=f.old.I;f.setActual(drift);
  await assert.rejects(f.repair(),/does not match the exact source\/model\/backend binding/);
});
test('code-bound readiness preserves genuine594 before without Source output and rejects unknown pairs lazily',async()=>{
  const f=codeReadinessFixture();assert.equal(f.counts().sourceOutputReads,0,'No output check on module/function compilation');
  f.oldCode();f.issue(false);const old=f.family();assert.equal(old.requiredMigrations.length,61);
  assert.equal(f.counts().sourceOutputReads,0,'Genuine594 before does not borrow an unissued child');
  assert.equal((await f.fresh()).migrationIds.length,61);assert.equal(f.guard(f.actual(),f.head),true);
  assert.equal((await f.repair()).migrationIds.length,61);
  f.sourceCode();await assert.rejects(f.fresh(),/SOURCE_PRODUCER_SQL_UNISSUED/);
  assert.throws(()=>f.guard(f.actual(),f.head),/SOURCE_PRODUCER_SQL_UNISSUED/);
  f.issue(true);f.setI(f.old.I);assert.throws(()=>f.family(),/CODE_READINESS_MIXED_PREDECESSOR_PAIR/);
  f.sourceCode();f.setI('0'.repeat(64));assert.throws(()=>f.family(),/CODE_READINESS_UNKNOWN_INTEGRATED_PAIR/);
  f.sourceCode();f.setC('0'.repeat(64));assert.throws(()=>f.family(),/CODE_READINESS_UNKNOWN_CANDIDATE_PAIR/);
  assert.throws(()=>f.family({sourcePhase:'source-producer'}),/CODE_READINESS_FAMILY_ARGUMENTS/);
});


test('code-bound readiness four actual current plan fixture producers follow the same family',async()=>{
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const specifications=[
    ['scripts/test-ravscore-operational-activation.mjs',['readiness','missedMaintenanceTargetReadiness']],
    ['scripts/test-protected-operational-reentry-evidence.mjs',['preparedReadiness','readiness']],
  ];
  let checked=0;
  for(const [file,names] of specifications){
    const text=read(file);
    for(const name of names){
      const expression=new RegExp('const '+name+'\\s*=\\s*await buildIntegratedCutoverReadiness\\(sourceHead,\\s*\\{[\\s\\S]*?\\}\\);');
      const match=expression.exec(text);assert(match,'One actual current fixture producer '+file+':'+name);
      assert.equal(text.match(new RegExp(expression.source,'g')).length,1);
      const f=codeReadinessFixture();
      const result=await AsyncFunction('buildIntegratedCutoverReadiness','sourceHead','defaultImplementationClosureSha256',
        'missedMaintenanceClosureSha256','target','codeBoundIntegratedReadinessFamily',match[0]+';return '+name+';')(
        async(head,options)=>{assert.equal(head,f.head);assert.equal(options.publicImplementationClosureSha256,f.closure);
          return f.document(options.sourcePhase??'assistant-installed593-origin591-successor');},
        f.head,f.closure,f.closure,{seal:{targetImplementationClosureSha256:f.closure}},f.family);
      assert.equal(result.migrationIds.length,62);assert.equal(f.guard(result,f.head),true);checked++;
    }
  }
  assert.equal(checked,4);
});

// Normal record producer + actual Source qualification function. Synthetic GitHub
// metadata only; no source validation, provider, original or activation is executed.
function currentSourceExecutionFixture(){
  const entry=read('scripts/source-normal-producer-entry.mjs');
  const paths=JSON.parse(/const WORKFLOWS = Object.freeze\((\[[\s\S]*?\])\);/.exec(entry)[1].replaceAll("'",'"'));
  const workflow=read('.github/workflows/reusable-weather-build.yml');
  const identity={GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:'synthetic/repository',GITHUB_RUN_ID:'7',
    GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:'1'.repeat(40),GITHUB_EVENT_NAME:'workflow_dispatch',
    RUNNER_NAME:'synthetic-runner',EXTENDED_PROVIDER_BOOTSTRAP:'false'};
  const tree='sha256:'+'2'.repeat(64),at=seconds=>'2030-01-01T00:00:'+String(seconds).padStart(2,'0')+'Z';
  const run={id:7,run_attempt:1,head_sha:identity.GITHUB_SHA,head_branch:'main',path:paths[0],event:'workflow_dispatch',
    status:'in_progress',conclusion:null,repository:{full_name:identity.GITHUB_REPOSITORY},head_repository:{full_name:identity.GITHUB_REPOSITORY}};
  const record=sourceGateRecord(identity,'success',tree);
  const gate={name:SOURCE_GATE_STEP,number:5,status:'completed',conclusion:'success',started_at:at(1),completed_at:at(2)};
  const recorded={name:'Record actual source validation outcome',number:6,status:'completed',conclusion:'success',started_at:at(3),completed_at:at(4)};
  const action={name:'Run the one explicit owned SOURCE ordinary route',number:9,status:'in_progress',conclusion:null,started_at:at(5),completed_at:null};
  const job={id:8,name:'Build and prepare weather production through reusable workflow / build-and-prepare',run_id:7,
    head_sha:identity.GITHUB_SHA,run_attempt:1,status:'in_progress',conclusion:null,completed_at:null,
    runner_id:9,runner_name:identity.RUNNER_NAME,started_at:at(0),steps:[gate,recorded,action]};
  const need=(value,code)=>assert(value,code);
  const begin=entry.indexOf('function assertSourceNormalCurrentSourceExecution('),end=entry.indexOf('\nasync function qualifyNormalJob(',begin);
  const direct=begin<0?()=>assert.fail('DIRECT_SOURCE_EXECUTION_UNAVAILABLE'):
    Function('need','SOURCE_GATE_CONTRACT','SOURCE_GATE_STEP',entry.slice(begin,end)+';return assertSourceNormalCurrentSourceExecution;')(
      need,SOURCE_GATE_CONTRACT,SOURCE_GATE_STEP);
  const from=entry.indexOf('async function qualifyNormalJob(state) {'),until=entry.indexOf('\nfunction retainEntryFirstFailure',from);
  assert(from>=0&&until>from);
  let currentRecord=structuredClone(record),actualWorkflow=workflow,cachedDecision=null,cachedCalls=0,processChecks=0,gitReads=0;
  const qualify=Function('sourcePrIdentities','qualifyPrNativeJob','githubJson','need','WORKFLOWS','JOB','fs','path','ROOT',
    'sourceTreeContentSha256','decideSourceGate','assertProcess','git','assertSourceNormalCurrentSourceExecution',
    entry.slice(from,until)+';return qualifyNormalJob;')(
      new WeakSet(),()=>assert.fail('Normal execution must not enter PR-native branch'),
      async(_state,url)=>({json:url.includes('/jobs?')?{jobs:[job],total_count:1}:run,
        response:{headers:{get:()=>null}},before:{wall:Date.parse(at(10))}}),need,paths,job.name,
      {readFile:async()=>JSON.stringify(currentRecord)},path,ROOT,()=>tree,
      async(...args)=>{cachedCalls++;return cachedDecision??genericSourceDecision(...args);},()=>{processChecks++;},
      args=>{assert.deepEqual(args,['show','HEAD:.github/workflows/reusable-weather-build.yml']);gitReads++;return actualWorkflow;},direct);
  return {identity,run,job,record,workflow,paths,tree,at,qualify:()=>qualify({identity,clockUpper:Date.parse(at(0))}),
    setRecord:value=>{currentRecord=structuredClone(value);},setWorkflow:value=>{actualWorkflow=value;},
    cached:value=>{cachedDecision=value;},counts:()=>({cachedCalls,processChecks,gitReads})};
}

for(const workflow of ['.github/workflows/run-current-weather-once.yml','.github/workflows/update-and-deploy.yml'])
test('current main Source fallback directly proves its executed gate and record: '+workflow,async()=>{
  const f=currentSourceExecutionFixture();f.run.path=workflow;
  await f.qualify();assert.deepEqual(f.counts(),{cachedCalls:0,processChecks:1,gitReads:1});
  const generic=await genericSourceDecision(f.record,f.identity,()=>assert.fail('Self-reuse must reject before any API'),{sourceTreeSha256:f.tree});
  assert.equal(generic.required,true);assert.equal(generic.reason,'missing-or-mismatched-proof','Generic self-reuse rejection is unchanged');
});

test('current main Source execution refuses skipped failed malformed unordered or substitute evidence',async()=>{
  const changed=[
    f=>f.job.steps[0].conclusion='skipped',f=>f.job.steps[0].conclusion='failure',f=>f.job.steps[0].status='in_progress',
    f=>f.job.steps[1].conclusion='failure',f=>f.job.steps[1].conclusion=null,
    f=>f.job.steps[2].status='completed',f=>f.job.steps[2].conclusion='success',f=>f.job.steps[2].completed_at=f.at(6),
    f=>f.job.steps.push(structuredClone(f.job.steps[0])),f=>f.job.steps.splice(1,1),f=>f.job.steps=null,
    f=>f.job.steps[1].number=4,f=>f.job.steps[0].completed_at=f.at(4),f=>f.job.steps[1].completed_at=f.at(6),
    f=>f.job.steps[2].started_at=f.at(11),f=>f.job.steps[0].started_at='not-time',f=>f.job.steps[0].number='5',
    f=>f.setRecord({...f.record,contractId:'other'}),f=>f.setRecord({...f.record,proofKind:'pull-request'}),
    f=>f.setRecord({...f.record,runId:7}),f=>f.setRecord({...f.record,runAttempt:2}),
    f=>f.setRecord({...f.record,headSha:'3'.repeat(40)}),f=>f.setRecord({...f.record,producerHeadSha:'3'.repeat(40)}),
    f=>f.setRecord({...f.record,runHeadSha:'3'.repeat(40)}),f=>f.setRecord({...f.record,sourceTreeSha256:'sha256:'+'3'.repeat(64)}),
    f=>f.setRecord({...f.record,repository:'other/repository'}),f=>f.setRecord({...f.record,conclusion:'failure'}),
    f=>f.setRecord({...f.record,unknown:true}),f=>f.job.runner_name='other',f=>f.run.head_sha='3'.repeat(40),
    f=>f.setWorkflow(f.workflow.replace('        run: npm run validate:source\n','        run: echo success\n')),
    f=>f.setWorkflow(f.workflow.replace('        run: node scripts/weather-source-gate.mjs record\n','        run: echo success\n')),
    f=>f.setWorkflow(f.workflow.replace('          SOURCE_GATE_OUTCOME: ${{ steps.source-gate.outcome }}','          SOURCE_GATE_OUTCOME: success')),
    f=>f.setWorkflow(f.workflow.replace('        run: npm run validate:source\n','        continue-on-error: true\n        run: npm run validate:source\n')),
    f=>f.setWorkflow(f.workflow.replace('          operation: source\n','          operation: other\n')),
  ];
  for(let i=0;i<changed.length;i++){const f=currentSourceExecutionFixture();changed[i](f);await assert.rejects(f.qualify(),undefined,'case '+i);}
});

test('current main Source fallback preserves every cached-locator decision and the untouched PR-native entry',async()=>{
  const f=currentSourceExecutionFixture(),old={...f.record,runId:'6'};f.setRecord(old);f.cached({required:false});
  await f.qualify();assert.deepEqual(f.counts(),{cachedCalls:1,processChecks:1,gitReads:0});
  f.cached({required:true,reason:'later-source-not-green'});await assert.rejects(f.qualify(),/EXACT_SOURCE_GATE/);
  assert.equal(f.counts().cachedCalls,2);assert.equal(f.counts().gitReads,0);
  const entry=read('scripts/source-normal-producer-entry.mjs');
  const normal=entry.slice(entry.indexOf('async function qualifyNormalJob('));
  assert(normal.startsWith('async function qualifyNormalJob(state) {\n  if (sourcePrIdentities.has(state.identity)) return qualifyPrNativeJob(state);'));
});


test('SOURCE backup77 and main backup76 qualify separate whole maps before unchanged package oracles',async()=>{
  const actual=JSON.parse(read('package.json')).scripts,original=structuredClone(actual);
  const {inverseReviewedSupabaseBackupSourceScripts:inverse}=await import('./lib/account-statistics-assistant-package-review.mjs');
  const {reviewedSourceDmiMainSourceScripts:mainView,inverseReviewedSourceDmiScalarGapSourceScripts:oldView}=await import('./national584-source-evidence.mjs');
  const {expandSourceCommands,buildSourceValidationPlan,runSourceValidation}=await import('./validate-source-once.mjs');
  const digest=value=>sha(JSON.stringify(Object.keys(value).sort().map(key=>[key,value[key]])));
  assert.equal(digest(actual),'913d9b42baa61d2eabe625e6bf42d3550edf627715af666987603e991a1af437');
  const source76=inverse(actual),main75=mainView(source76);
  assert.equal(digest(source76),'88c2c51d0873e0d04349ee4eb8a996ff9f45b26bb4186f7025cc551c1aab4b10');
  assert.equal(digest(main75),'fd4857146f205c9dc04248c642807456e01cdf47d6087de026ddd5f9c2316663');
  assert.deepEqual(mainView(actual),main75);assert.deepEqual(oldView(actual),oldView(source76));
  // These two actual field values reconstruct exactly P0's independently reviewed whole main map.
  const mainBackup76={...main75,'test:supabase-backup':actual['test:supabase-backup'],
    'validate:source:checks':actual['validate:source:checks']};
  assert.equal(digest(mainBackup76),'a18c020a5b54066241dc1e3670bc1472a00a4e75206e3da16bb1e8f8141e7df5');
  assert.deepEqual(inverse(mainBackup76),main75);
  for(const [scripts,count,previous] of [[actual,77,source76],[mainBackup76,76,main75]]){
    const commands=expandSourceCommands(scripts,'validate:source:checks'),plan=buildSourceValidationPlan(scripts),calls=[];
    assert.equal(commands.length,count);
    assert.equal(runSourceValidation(plan,{execute(command){calls.push(command);return 0;},log(){}}),0);
    assert.deepEqual(calls,[...plan.preflight,...plan.remaining,plan.gate]);
    const backup=scripts['test:supabase-backup'];
    for(const values of [commands,calls])assert.equal(values.filter(value=>value===backup).length,1);
    assert.deepEqual(commands.filter(value=>value!==backup),expandSourceCommands(previous,'validate:source:checks'));
    for(const mutate of [v=>v['test:supabase-backup']+=' scripts/UNREVIEWED.mjs',
      v=>v['validate:source:checks']+=' && npm run test:supabase-backup',v=>v.unknown='node scripts/UNKNOWN.mjs',
      v=>v['test:weather-source-critical']+=' --unknown']){
      const changed=structuredClone(scripts);mutate(changed);assert.throws(()=>inverse(changed));
    }
  }
  assert.throws(()=>inverse(source76));assert.throws(()=>inverse(main75));
  assert.throws(()=>inverse(actual,{}));assert.throws(()=>inverse(null));
  assert.deepEqual(actual,original,'Actual package DATA and order are not rewritten by either view');
});


test('SOURCE596 exact raw workflow preserves actual M6 schema1/2 and every old whole oracle',()=>{
  const raw=read('.github/workflows/reusable-weather-build.yml'),row=final596Review;
  assert.equal(Buffer.byteLength(raw),row.after.bytes);assert.equal(sha(raw),row.after.sha256);
  assert.equal(raw.split(row.currentUserAgent).length,row.userAgentCount+1);
  assert.equal(raw.split(row.previousUserAgent).length,1);
  const m6=execFileSync('git',['show',row.codeHead+':.github/workflows/reusable-weather-build.yml'],
    {cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(Buffer.byteLength(m6),row.m6.bytes);assert.equal(sha(m6),row.m6.sha256);
  assert.equal(raw.split(row.currentUserAgent).join(row.previousUserAgent),m6);
  const actualMain=execFileSync('git',['show','6fb3fc1682b68bcf51b5ed73c14a84ead7676371:.github/workflows/reusable-weather-build.yml'],
    {cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024});
  const selector=value=>value.split('\n').filter(line=>line.startsWith('          RAVRADAR_RETAINED_SCALAR_CONTEXT:'));
  assert.equal(selector(raw).length,1);assert.deepEqual(selector(raw),selector(actualMain));
  assert(selector(raw)[0].includes(row.currentSchema),'The actual current selector keeps both known schemas');
  const guarded=inverseSourceNormalFinal596Workflow(raw,'build');
  assert.equal(Buffer.byteLength(guarded),row.before.bytes);assert.equal(sha(guarded),row.before.sha256);
  assert.equal(inverseSourceNormalFinal596Workflow(m6,'build'),guarded);
  assert.equal(inverseSourceNormalFinal596Workflow(guarded,'build'),guarded);
  assert.equal(inverseSourceNormalWorkflow(raw,'build'),inverseSourceNormalWorkflow(guarded,'build'));
  for(const changed of [raw+'\n',raw.replace(row.currentUserAgent,row.previousUserAgent),
    raw.replace(row.currentSchema,row.currentSchema+' || true'),
    raw.replace("continuity_schema == '2'","continuity_schema == '3'"),
    raw.replace('operation: source','operation: UNKNOWN')]){
    assert.notEqual(changed,raw);assert.equal(inverseSourceNormalFinal596Workflow(changed,'build'),changed);
    assert.throws(()=>inverseSourceNormalWorkflow(changed,'build'));
  }
  for(const role of ['once','other',null,1])assert.equal(inverseSourceNormalFinal596Workflow(raw,role),raw);
  assert.throws(()=>inverseSourceNormalFinal596Workflow(raw),/SOURCE_FINAL596_WORKFLOW_ARGUMENTS/);
  assert.throws(()=>inverseSourceNormalFinal596Workflow(null,'build'),/SOURCE_FINAL596_WORKFLOW_TYPE/);
});
