import { projectPagesClosureHistoricalTestInput as historicalPagesInput,
  readHistoricalBuildWorkflowSource, readHistoricalCompletedStageWorkflowSources } from './lib/pages-closure-historical-test-input.mjs';
import assert from 'node:assert/strict';
import { inverseCompletedRuntimeWorkflow, inverseImmediateOrdinaryPagesWorkflow, inversePagesPublicProjectionWorkflow } from './lib/completed-private-runtime-workflow-review.mjs';
import {writeRuntimeAuditExecutionObservation} from './observe-runtime-audit-execution.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

// Workflow contract and an isolated shell guard. Never reads private data or calls a provider.
const read = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const actualNormalWorkflow = read('.github/workflows/reusable-weather-build.yml');
const historicalNormalWorkflow = readHistoricalBuildWorkflowSource();
const normal = inverseCompletedRuntimeWorkflow(historicalPagesInput(historicalNormalWorkflow, 'build'), 'build');
const orchestrator = read('.github/workflows/update-and-deploy.yml');
const manual = inverseCompletedRuntimeWorkflow(readHistoricalCompletedStageWorkflowSources().once, 'once');
const watchdog = read('.github/workflows/preserve-copernicus-current-shadow.yml');
const retiredOneoff = read('.github/workflows/validate-copernicus-current-pilot.yml');
assert.match(normal, /quick_confirmation:\s+required: false\s+type: boolean\s+default: false/);
assert.match(manual, /quick_confirmation:\s+description: '[^']+'\s+required: false\s+type: boolean\s+default: false/);
assert.match(normal, /quick_progress_source:\s+required: false\s+type: string\s+default: ''/);
assert.match(manual, /quick_progress_source:\s+description: '[^']+'\s+required: false\s+type: string\s+default: ''/);
const blocks = source => source.split(/(?=^      - (?:name:|uses:))/m);
function step(source, name) {
  const found = blocks(source).filter(block => block.startsWith(`      - name: ${name}\n`));
  assert.equal(found.length, 1, `Exactly one step: ${name}`);
  return found[0];
}

test('verified RAW handoffs use the exact ID and digest without listing artifacts again', () => {
  const current = read('.github/workflows/run-current-weather-once.yml');
  for (const [workflow, name, finder, kind] of [
    [current, 'Download the verified RAW rotation handoff', 'raw-proof', 'proof'],
    [actualNormalWorkflow, 'Download the immutable RAW rotation decision', 'raw-rotation-decision-artifact', 'result'],
    [current, 'Download the verified DMI RAW coverage receipt', 'saved-coverage', 'saved-coverage'],
  ]) {
    const download = step(workflow, name);
    assert.ok(download.includes(`steps.${finder}.outputs.artifact_status == 'found'`), name);
    assert.ok(download.includes(`RAW_ROTATION_ARTIFACT_ID: \${{ steps.${finder}.outputs.artifact_id }}`), name);
    assert.ok(download.includes(`RAW_ROTATION_ARTIFACT_DIGEST: \${{ steps.${finder}.outputs.artifact_digest }}`), name);
    assert.ok(download.includes('GITHUB_TOKEN: ${{ github.token }}'), name);
    assert.ok(download.includes(`run: node scripts/find-raw-rotation-artifact.mjs --download-${kind}`), name);
    assert.doesNotMatch(download, /actions\/download-artifact|continue-on-error/, name);
  }
});

test('legacy weather dispatch stops before fresh work when the protected RAW caller is required', () => {
  const readiness = orchestrator.split('\n  current-hour-readiness:\n')[1].split('\n  trip-storage-readiness:\n')[0];
  const guard = step(readiness, 'Require the protected RAW caller for fresh ordinary weather');
  const condition = /^        if: >-\n((?:          .*\n)+)/m.exec(guard)?.[1]?.trim();
  assert.ok(condition);
  assert.match(readiness, /needs: operational-recovery-gate[\s\S]*?outputs\.closure_deferred == 'false'/);
  assert.ok(readiness.indexOf(guard) < readiness.indexOf('uses: actions/checkout'));
  assert.match(guard, /DIRECT_FRESH_WEATHER_REQUIRES_RAW_ROTATION[\s\S]*?^          exit 1$/m);
  assert.doesNotMatch(guard, /continue-on-error|always\(/);

  const rejects = (mode, inputs = {}) => runInNewContext(condition, {vars:{RAVRADAR_RAW_BOOTSTRAP_PROOF:mode},inputs});
  assert.equal(rejects('enforce'), true);
  assert.equal(rejects('enforce', {force:true,extended_provider_bootstrap:true}), true);
  assert.equal(rejects('observe'), false);
  assert.equal(rejects(''), false);
  for (const operation of ['geometry_v2_pilot','geometry_v2_national','produce_weather_handoff',
    'ravscore_integrated_first_cutover','ravscore_integrated_return']) {
    assert.equal(rejects('enforce', {[operation]:true}), false, operation);
  }
});

test('current weather dispatch requires RAW for fresh work and preserves the exact protected and recovery routes', () => {
  const current = read('.github/workflows/run-current-weather-once.yml');
  const readiness = current.split('\n  current-main-target:\n')[1].split('\n  native-identity-prewrite:\n')[0];
  const botScope = step(readiness, 'Identify the default scheduled weather caller');
  const guard = step(readiness, 'Require the protected RAW caller for fresh ordinary weather');
  const checkoutAndSelection = [
    botScope,
    step(readiness, 'Pin the actual newest completed private generation before target selection'),
    step(readiness, 'Require the explicit provider-free epoch checkpoint request'),
    step(readiness, 'Lock the requested original checkpoint hour without provider work'),
    step(readiness, 'Require the fixed native-identity recovery scope before continuation'),
    guard,
    step(readiness, 'Lock the canonical UTC production hour'),
  ].map(block => readiness.indexOf(block));
  assert.ok(checkoutAndSelection.every((position, index) => position > (checkoutAndSelection[index - 1] ?? -1)));
  assert.match(guard, /DIRECT_FRESH_WEATHER_REQUIRES_RAW_ROTATION[\s\S]*?^          exit 1$/m);
  assert.doesNotMatch(guard, /continue-on-error|always\(/);

  const condition = block => /^        if: >-\n((?:          .*\n)+)/m.exec(block)?.[1]?.trim();
  const evaluate = (expression, context) => {
    assert.ok(expression);
    return runInNewContext(expression.replace(/\b(steps|needs)\.([a-z]+(?:-[a-z]+)+)\./g, '$1["$2"].'), context);
  };
  const build = current.split('\n  build-and-prepare:\n')[1].split('\n  deploy-pages:\n')[0];
  const enforce = /^      enforce_raw_cache_rotation: \$\{\{ (.+) \}\}$/m.exec(build)?.[1];
  const dispatch = step(read('.github/workflows/watch-missed-weather-schedule.yml'), 'Dispatch one ordinary current-weather run');
  assert.match(dispatch, /inputs\.owner_retry_after_failed_run_id != ''/);
  assert.match(dispatch, /GH_TOKEN: \$\{\{ github.token \}\}/);
  assert.match(dispatch, /run-current-weather-once\.yml\/dispatches"\s+\\\n\s+-f ref=main -F "inputs\[quick_confirmation\]=false"/);
  const defaults = {completed_private_runtime:false,current_family_cold_start:false,quick_confirmation:false,
    weather_state_epoch_bootstrap:false,weather_state_epoch_checkpoint_reentry:false,
    native_sampling_identity_original_recovery:false,completed_stage_source:'',quick_progress_source:'',
    checkpoint_target_hour:'',weather_state_epoch_archive_key:'',weather_state_epoch_archive_catalog_sha256:'',
    weather_state_epoch_raw_cache_key:''};
  const bot = 'github-actions[bot]';
  const evaluateDispatch = ({actor='owner',triggeringActor=actor,attempt=1,mode='enforce',
    input={},completed='skipped',checkpoint='skipped'}={}) => {
    const vars = {RAVRADAR_RAW_BOOTSTRAP_PROOF:mode};
    const inputs = {...defaults,...input};
    const github = {actor,triggering_actor:triggeringActor,run_attempt:attempt};
    const eligible = evaluate(condition(botScope),{github,inputs}) ? 'true' : '';
    const steps = {'automatic-completed-scope':{outputs:{eligible}},'completed-target':{outcome:completed},
      'checkpoint-target':{outcome:checkpoint}};
    return {
      stopped:evaluate(condition(guard),{vars,inputs,steps}),
      protectedRaw:evaluate(enforce,{vars,needs:{'current-main-target':{outputs:{ordinary_scheduled:eligible,
        completed_private_runtime:inputs.completed_private_runtime ? 'true' : 'false'}}}}),
    };
  };
  assert.deepEqual(evaluateDispatch({actor:bot}),{stopped:false,protectedRaw:true});
  for (const request of [{},{actor:bot,triggeringActor:'owner'},{actor:bot,attempt:2},
    {input:{quick_confirmation:true}},{input:{quick_progress_source:'123-1'}},
    {input:{completed_private_runtime:true}},{input:{checkpoint_target_hour:'2026-11-21T08:00:00Z'}}]) {
    assert.deepEqual(evaluateDispatch(request),{stopped:true,protectedRaw:false});
  }
  for (const request of [{mode:'observe'},{mode:''},{input:{current_family_cold_start:true}},
    {input:{weather_state_epoch_bootstrap:true}},{input:{completed_private_runtime:true},completed:'success'},
    {input:{checkpoint_target_hour:'2026-11-21T08:00:00Z',quick_progress_source:'123-1'},checkpoint:'success'},
    {input:{weather_state_epoch_checkpoint_reentry:true},checkpoint:'success'},
    {input:{native_sampling_identity_original_recovery:true},checkpoint:'success'}]) {
    assert.deepEqual(evaluateDispatch(request),{stopped:false,protectedRaw:false});
  }
});

test('ordinary producer cessation precedes RAW, consumers and encrypted progress', () => {
  const source = actualNormalWorkflow;
  const dmi = step(source, 'Update DMI bulk model cache');
  const dmiStop = step(source, 'Require physically stopped ordinary DMI before reading or saving its result');
  const rawWrite = step(source, 'Reconfirm exact main before shared DMI GRIB cache');
  const fill = step(source, 'Fill only exact-hour DMI gaps from Copernicus');
  const fillStop = step(source, 'Require physically stopped ordinary Copernicus before reading its source stage');
  const fillRead = step(source, 'Require reusable Copernicus source stage before combined current closure');
  const openMeteo = step(source, 'Fill only the exact remaining current gaps from Open-Meteo');
  const openMeteoStop = step(source, 'Require physically stopped ordinary Open-Meteo before reading its checkpoint');
  const openMeteoRead = step(source, 'Require verified Open-Meteo residual checkpoint before closure');
  const refresh = step(source, 'Reclaim a bounded Copernicus quality slice for the next normal run');
  const refreshStop = step(source, 'Require physically stopped ordinary Copernicus after optional quality work');
  const seal = step(source, 'Encrypt newly saved private weather progress before later production steps');
  const sequence = [dmi, dmiStop, rawWrite, fill, fillStop, fillRead, openMeteo, openMeteoStop,
    openMeteoRead, refresh, refreshStop, seal]
    .map(block => source.indexOf(block));
  assert.ok(sequence.every((position, index) => position > (sequence[index - 1] ?? -1)));
  assert.match(dmi, /node scripts\/run-current-family-cold-start.mjs run-dmi/);
  assert.match(dmi, /run-ordinary-provider-cgroup.py dmi .+4140.+3240/);
  assert.match(dmi, /python -u scripts\/run-dmi-bulk-supervised.py/);
  assert.match(fill, /provider=\(python scripts\/run-copernicus-current-pilot-with-retry.py\)/);
  assert.match(fill, /run-ordinary-provider-cgroup.py copernicus 1560 --/);
  assert.match(refresh, /timeout-minutes: 7/);
  assert.match(refresh, /run-ordinary-provider-cgroup.py copernicus 380 --/);
  for (const stop of [dmiStop, fillStop, openMeteoStop, refreshStop]) {
    assert.match(stop, /if: always\(\) && env.RAVRADAR_ORDINARY_PROVIDER_CLOSURE == 'true'/);
    assert.match(stop, /test "\$PRODUCER_CLOSED" != true/);
    assert.doesNotMatch(stop, /continue-on-error/);
  }
  assert.match(dmiStop, /steps.dmi-bulk.outputs.ordinary_dmi_producer_closed/);
  assert.match(fillStop, /steps.copernicus-fill.outputs.copernicus_producer_closed/);
  assert.match(refreshStop, /steps.copernicus-next-run-refresh.outputs.copernicus_producer_closed/);
  assert.match(rawWrite, /steps.dmi-producer-closure.outcome == 'success'/);
  assert.match(seal, /steps.dmi-producer-closure.outcome == 'success'/);
  assert.match(seal, /steps.copernicus-fill-closure.outcome == 'success'/);
  assert.match(seal, /steps.copernicus-next-run-refresh-closure.outcome == 'success'/);
  assert.match(openMeteo, /--runtime-seconds \$\{\{ inputs.quick_confirmation && '120' \|\| '900' \}\}/);
  assert.match(openMeteo, /--timeout-seconds 30/);
  assert.match(openMeteo, /--critical-only/);
  assert.match(openMeteo, /\$\{\{ inputs.checkpoint_only && '--reuse-only' \|\| '' \}\}/);
  assert.match(openMeteo, /run-ordinary-provider-cgroup.py open-meteo -- "\$\{args\[@\]\}"/);
  assert.match(openMeteo, /exec python scripts\/fill-open-meteo-current-fallback.py "\$\{args\[@\]\}"/);
  assert.match(openMeteoStop, /steps.open-meteo-fill.outputs.open_meteo_producer_closed/);
  for(const reader of [openMeteoRead, step(source, 'Preserve safe weather acquisition diagnostics before terminal gates'), seal]){
    assert.match(reader, /steps.open-meteo-fill-closure.outcome == 'success'/);
  }

  const enabled = (block, steps) => {
    const condition = /^        if: (.*)$/m.exec(block)[1]
      .replace(/\bsteps\.([a-z][\w-]*)/g, 'steps["$1"]');
    return runInNewContext(condition, { steps, always:()=>true, inputs:{},
      env:{RAVRADAR_ORDINARY_PROVIDER_CLOSURE:'true'}, github:{ref:'refs/heads/main'} });
  };
  const steps = {
    preflight:{outputs:{should_run:'true'}}, 'operational-action':{outputs:{action:'integrated'}},
    'weather-source-handoff':{outputs:{reused:'false'}}, 'dmi-bulk':{outcome:'success'},
    'dmi-producer-closure':{outcome:'success'}, 'copernicus-fill':{outcome:'skipped'},
    'copernicus-next-run-refresh':{outcome:'skipped'},
    'component-progress-restore':{outcome:'success',outputs:{captured:'true'}},
    'open-meteo-fill':{outcome:'success'}, 'open-meteo-fill-closure':{outcome:'success'},
  };
  assert.equal(enabled(openMeteo,steps),true);
  assert.equal(enabled(openMeteoStop,steps),true);
  for (const outcome of ['success','failure']) {
    const available = {...steps,'open-meteo-fill':{outcome}};
    assert.equal(enabled(seal,available),true,'Physical closure permits the normal or partial snapshot path');
    assert.equal(enabled(seal,{...available,'open-meteo-fill-closure':{outcome:'failure'}}),false);
    assert.equal(enabled(openMeteoRead,{...available,'open-meteo-fill-closure':{outcome:'failure'}}),false);
  }
  assert.equal(enabled(seal,{...steps,'open-meteo-fill':{outcome:'cancelled'},
    'open-meteo-fill-closure':{outcome:'skipped'}}),false);
  const handoff = {...steps,'weather-source-handoff':{outputs:{reused:'true'}},
    'open-meteo-fill':{outcome:'skipped'},'open-meteo-fill-closure':{outcome:'skipped'}};
  assert.equal(enabled(openMeteo,handoff),false);
  assert.equal(enabled(openMeteoStop,handoff),false);
  assert.equal(enabled(openMeteoRead,handoff),true);
  assert.equal(enabled(seal,{...handoff,'dmi-bulk':{outcome:'skipped'}}),false);
  assert.match(openMeteoRead, /test -s \.cache\/open-meteo-current-fallback\.json/);
});

test('normal DMI save uses its measured allowance and must actually finalize before fresh weather', () => {
  const admission = step(actualNormalWorkflow, 'Measure room for the next DMI RAW cache');
  const save = step(actualNormalWorkflow, 'Save progressed DMI GRIB download cache');
  const finalization = step(actualNormalWorkflow, 'Require finalized RAW storage before using newly acquired DMI data');
  const scoring = step(actualNormalWorkflow, 'Update central weather cache');
  for (const block of [admission, save]) {
    assert.match(block, /dmi-grib-v4-\$\{\{ runner\.os \}\}-\$\{\{ steps\.dmi-cache-generation\.outputs\.generation \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  }
  assert.match(admission, /node scripts\/observe-github-raw-cache-stock\.mjs --admit-upload/);
  assert.match(admission, /steps\.dmi-progress-write-authority\.outcome == 'success'/);
  assert.match(save, /steps\.dmi-raw-upload-admission\.outputs\.raw_upload_budget_bytes != ''/);
  assert.match(save, /archive_limit: \$\{\{ steps\.dmi-raw-upload-admission\.outputs\.raw_upload_budget_bytes \}\}/);
  assert.match(save, /inputs\.enforce_raw_cache_rotation != true \|\| \(steps\.dmi-raw-upload-admission\.outcome == 'success'/);
  assert.match(finalization, /\(steps\.dmi-bulk\.outcome == 'success' \|\| steps\.dmi-bulk\.outcome == 'failure'\) && steps\.dmi-raw-save\.outputs\.saved != 'true'/);
  assert.match(finalization, /exit 1/);
  assert.doesNotMatch(scoring.match(/^        if:.*$/m)?.[0] ?? '', /always\(|!cancelled\(/);
  const order = [admission, save, finalization, scoring].map(block => actualNormalWorkflow.indexOf(block));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('first assistant continuation must prove its restored RAW and use the ordinary retirement result', () => {
  const proof = step(actualNormalWorkflow, 'Observe exact restored RAW coverage for the locked successor before DMI');
  const wait = step(actualNormalWorkflow, 'Wait for the RAW rotation decision before DMI');
  const requireDecision = step(actualNormalWorkflow, 'Require successful RAW rotation for this exact target');
  const savedProof = step(actualNormalWorkflow, 'Prove that this run saved the required DMI originals');
  const run = {
    inputs:{enforce_raw_cache_rotation:true,completed_private_runtime:false,
      completed_stage_source:'',quick_progress_source:''},
    github:{repository:'jakobjorgensen82-commits/RavRadar',ref:'refs/heads/main',
      event_name:'workflow_dispatch',actor:'github-actions[bot]',triggering_actor:'github-actions[bot]',run_attempt:'1'},
    vars:{},success:()=>true,
  };
  const successful = {outcome:'success'};
  const steps = {
    preflight:{outputs:{should_run:'true'}},
    'assistant-later-h0-source':{outputs:{required:'true'}},
    'assistant-later-h0-prepare':successful,
    'operational-action':{outputs:{action:'integrated-historical-maintenance'}},
    'operational-model':{outputs:{binding_current:'false'}},
    'private-runtime-install':{outcome:'success',outputs:{raw_baseline_proved:'true'}},
    'paired-checkpoint-reconcile':{outcome:'skipped',outputs:{}},
    'dmi-part-continuity-donor':{outputs:{continuity_schema:'2'}},
    'dmi-grib-cache-restore':successful,
    'dmi-raw-restore-identity':{outcome:'success',outputs:{observed:'true'}},
    'current-history-demand':successful,
    'handoff-upload':successful,
    'private-runtime-publish':successful,
    'checkpoint-publish':{outcome:'success',outputs:{raw_s_central_version:'12'}},
    'dmi-raw-save':{outputs:{saved_inventory:'fixture-inventory'}},
    'raw-rotation-decision-confirmed':successful,
  };
  const enabled = (block, overrides={}) => {
    const expression = (block.match(/^        if: >-\n((?:          .*\n)+)/m)?.[1]
      ?? block.match(/^        if: (.*)$/m)?.[1]).trim();
    return runInNewContext(expression.replace(/\bsteps\.([a-z]+(?:-[a-z0-9]+)+)\./g, 'steps["$1"].'),
      {...run,steps:{...steps,...overrides}});
  };
  assert.equal(enabled(proof),true);
  for (const [id, denied] of [
    ['assistant-later-h0-source',{outputs:{required:'false'}}],
    ['assistant-later-h0-prepare',{outcome:'skipped'}],
    ['private-runtime-install',{outcome:'success',outputs:{}}],
    ['operational-model',{outputs:{binding_current:'true'}}],
    ['dmi-part-continuity-donor',{outputs:{continuity_schema:'1'}}],
    ['dmi-raw-restore-identity',{outcome:'success',outputs:{observed:'false'}}],
    ['current-history-demand',{outcome:'failure'}],
  ]) assert.equal(enabled(proof,{[id]:denied}),false,id);
  assert.equal(enabled(proof,{
    'assistant-later-h0-source':{outputs:{required:'false'}},
    'operational-action':{outputs:{action:'integrated'}},
    'operational-model':{outputs:{binding_current:'true'}},
    'private-runtime-install':successful,
    'paired-checkpoint-reconcile':{outcome:'success',outputs:{paired:'true',raw_baseline_proved:'true'}},
  }),true);
  assert.equal(enabled(wait),true);
  assert.equal(enabled(requireDecision),true);
  assert.match(requireDecision, /retire-verified-raw-caches\.mjs --require-decision/);
  assert.equal(enabled(savedProof),true);
  assert.equal(enabled(savedProof,{'raw-rotation-decision-confirmed':{outcome:'skipped'}}),false);
  assert.equal(enabled(savedProof,{'checkpoint-publish':{outcome:'success',outputs:{raw_s_central_version:''}}}),false);
  assert.equal(enabled(savedProof,{'dmi-raw-save':{outputs:{saved_inventory:''}}}),false);
});

test('ordinary source validation runs on committed files before any runtime overlay', () => {
  const orderedSteps = [
    'Decide whether weather needs updating before private runtime download',
    'Verify exact-content source validation with GitHub',
    'Run fast source gate before expensive data refresh',
    'Preserve latest verified source-content validation outcome',
    'Build constrained natural zone coastlines',
    'Sync centrally saved admin configuration',
    'Verify and restore the private production runtime bundle',
    'Update DMI bulk model cache',
  ];
  let previous = -1;
  for (const name of orderedSteps) {
    const position = actualNormalWorkflow.indexOf(step(actualNormalWorkflow, name));
    assert.ok(position > previous, 'Workflow step runs out of order: ' + name);
    previous = position;
  }
});

test('ordinary checkpoint publishes a RAW receipt only for a completed upload inventory', () => {
  const publish = step(actualNormalWorkflow, 'Publish atomic RavScore checkpoint to protected admin storage');
  const proof = step(actualNormalWorkflow, 'Prove that this run saved the required DMI originals');
  assert.match(publish, /RAVRADAR_RAW_PUBLICATION_RECEIPT: .*steps\.dmi-raw-save\.outputs\.saved_inventory != ''/);
  assert.match(publish, /if \[ "\$RAVRADAR_RAW_PUBLICATION_RECEIPT" = true \]; then\s+node scripts\/publish-checkpoint-with-raw-receipt\.mjs/);
  assert.match(publish, /else\s+node scripts\/protected-ravscore-continuation-checkpoint\.mjs\s+\\\s+--publish/);
  assert.match(proof, /RAW_PUBLISHED_S_VERSION: \$\{\{ steps\.checkpoint-publish\.outputs\.raw_s_central_version \}\}/);
  assert.match(proof, /RAW_PUBLISHED_S_GENERATION_SHA256: \$\{\{ steps\.checkpoint-publish\.outputs\.raw_s_generation_sha256 \}\}/);
});

function epochCheckpointPreflightGuard(source) {
  const preflight = step(source, 'Decide whether weather needs updating before private runtime download');
  const run = preflight.match(/        run: \|\n([\s\S]*)$/)?.[1]?.replace(/^          /gm, '');
  assert.ok(run, 'The actual normal preflight shell must exist');
  const state = run.indexOf('state=.cache/weather-preflight-state/state.json\n');
  assert.ok(state > 0, 'The normal preflight state read must remain after the guard');
  const guard = run.slice(0, state);
  assert.match(guard, /^set -uo pipefail\nif test "\$\{CHECKPOINT_ONLY:-false\}" = true && test "\$\{RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY:-false\}" = true; then\n/,
    'Only the conjunction of both explicit epoch checkpoint flags may bypass model probes');
  assert.match(guard, /  echo "should_run=true" >> "\$GITHUB_OUTPUT"\n  echo "dmi_changed=false" >> "\$GITHUB_OUTPUT"\n  echo "reason=epoch-checkpoint-reentry" >> "\$GITHUB_OUTPUT"\n  echo "age_minutes=unknown" >> "\$GITHUB_OUTPUT"\n  exit 0\nfi\n$/);
  assert.doesNotMatch(guard, /python|curl|fetch|materialize-preflight/,
    'The checkpoint preflight guard may not reach state materialization or providers');
  return guard;
}
const checkpointPreflightGuard = epochCheckpointPreflightGuard(normal);
const checkpointPreflightYaml = checkpointPreflightGuard.replace(/^set -uo pipefail\n/, '')
  .split('\n').slice(0, -1).map(line => '          ' + line).join('\n') + '\n';
assert.equal(normal.split(checkpointPreflightYaml).length, 2, 'The inverse must remove exactly the actual YAML guard');
assert.throws(() => epochCheckpointPreflightGuard(normal.replace(checkpointPreflightYaml, '')),
  'The original unguarded preflight must fail the checkpoint contract');
for (const clause of [
  'test "${CHECKPOINT_ONLY:-false}" = true && ',
  ' && test "${RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY:-false}" = true',
]) {
  assert.equal(normal.split(clause).length, 2, 'Each guard mutation must change exactly one actual clause');
  assert.throws(() => epochCheckpointPreflightGuard(normal.replace(clause, '')),
    'Neither checkpoint flag alone may bypass the normal preflight');
}
const guardShell = process.platform === 'linux' ? 'bash' : process.env.RAVRADAR_POSIX_TEST_SHELL;
test('epoch checkpoint preflight: actual shell uses an owned output file and requires both flags',
  { skip: !guardShell && 'Linux Bash or an explicitly selected local POSIX test shell is required' }, () => {
    const parent = fs.realpathSync(tmpdir());
    const own = fs.mkdtempSync(path.join(parent, 'rr-epoch-preflight-'));
    const identity = fs.lstatSync(own, { bigint: true });
    let index = 0;
    try {
    for (const checkpoint of [undefined, 'false', 'true', 'TRUE', '1']) {
      for (const reentry of [undefined, 'false', 'true', 'TRUE', '1']) {
        const output = path.join(own, `output-${index++}.txt`);
        const env = { PATH: process.env.PATH, GITHUB_OUTPUT: output };
        if (checkpoint !== undefined) env.CHECKPOINT_ONLY = checkpoint;
        if (reentry !== undefined) env.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY = reentry;
        // Linux always executes the exact Bash body. A local POSIX shell can
        // exercise the identical if-body, but is not Linux/Bash evidence.
        const body = process.platform === 'linux' ? checkpointPreflightGuard
          : checkpointPreflightGuard.replace(/^set -uo pipefail\n/, 'set -u\n');
        const args = process.platform === 'linux' ? ['--noprofile', '--norc', '-c'] : ['-c'];
        const result = spawnSync(guardShell, [...args,
          body + 'printf "NORMAL_PREFLIGHT_FALLTHROUGH\\n"\n'],
        { env, encoding: 'utf8', timeout: 5000, maxBuffer: 16_384 });
        const label = JSON.stringify({ checkpoint, reentry });
        assert.equal(result.error, undefined, label);
        assert.equal(result.signal, null, label);
        assert.equal(result.status, 0, `${label}\n${result.stderr}`);
        assert.equal(result.stderr, '', label);
        const selected = checkpoint === 'true' && reentry === 'true';
        assert.equal(result.stdout, selected ? '' : 'NORMAL_PREFLIGHT_FALLTHROUGH\n', label);
        assert.equal(fs.existsSync(output), selected, label);
        if (selected) assert.equal(fs.readFileSync(output, 'utf8'),
          'should_run=true\ndmi_changed=false\nreason=epoch-checkpoint-reentry\nage_minutes=unknown\n', label);
      }
    }
    } finally {
      const current = fs.lstatSync(own, { bigint: true });
      assert.equal(fs.realpathSync(own), own); assert.equal(path.dirname(own), parent);
      assert.equal(current.dev, identity.dev); assert.equal(current.ino, identity.ino);
      assert.ok(current.isDirectory() && !current.isSymbolicLink());
      fs.rmSync(own, { recursive: true, force: false });
    }
  });

const privatePlaintextPrefixes = [
  'coastal-point-staging-v1-',
  'copernicus-current-progress-v3-',
  'copernicus-current-donor-bank-v1-',
  'open-meteo-current-fallback-v2-',
  'open-meteo-current-donor-bank-v1-',
  'dmi-zone-active-v1-',
  'dmi-zone-candidate-v1-',
  'current-field-shadow-v1-',
  'copernicus-current-post-build-input-v1-',
];
for (const prefix of privatePlaintextPrefixes) {
  assert.doesNotMatch(normal, new RegExp(prefix), `Active reusable build still exposes ${prefix}`);
  assert.doesNotMatch(manual, new RegExp(prefix), `Manual normal caller still exposes ${prefix}`);
}
assert.doesNotMatch(orchestrator.slice(0, orchestrator.indexOf('\n  copernicus-post-build-refresh:')),
  /copernicus-current-progress-v3-|copernicus-current-shadow-v1-/,
  'Active orchestrator entrance must not restore a plaintext provider cache');

const restore = step(normal, 'Restore encrypted private weather progress only');
assert.match(restore, /actions\/cache\/restore@v6/);
assert.match(restore, /path: \.cache\/weather-private-progress\.encrypted/);
assert.match(restore, /weather-private-progress-encrypted-v2-/);
const shortRecoveryGate = step(normal, 'Require recovered progress before short confirmation');
assert.ok(shortRecoveryGate.includes("        if: inputs.quick_confirmation == true || inputs.quick_progress_source != ''\n"),
  'Every quick confirmation and explicit full-run source requires exact authenticated progress');
assert.match(shortRecoveryGate, /\.status == "RESTORED" and \.restored == true and \.fileCount > 0/);
assert.match(shortRecoveryGate, /test -s \.cache\/dmi-candidate-progress\.json/);
assert.match(shortRecoveryGate, /test "\$PROGRESS_CACHE_MATCHED_KEY" = "\$expected"/);
assert.ok(normal.indexOf(restore) < normal.indexOf(shortRecoveryGate));
const seal = step(normal, 'Encrypt newly saved private weather progress before later production steps');
assert.match(seal, /if: always\(\)/);
assert.match(seal, /steps\.preflight\.outputs\.should_run == 'true'/);
assert.match(seal, /steps\.component-progress-restore\.outputs\.captured == 'true'/);
assert.match(seal, /steps\.dmi-bulk\.outcome == 'success' \|\| steps\.dmi-bulk\.outcome == 'failure'/,
  'An early restore gate failure must not create a misleading new progress checkpoint');
const save = step(normal, 'Save only the authenticated encrypted private weather snapshot');
assert.match(save, /uses: \.\/\.github\/actions\/save-owned-dmi-grib/);
assert.match(save, /operation: upload-encrypted-progress\s+key: weather-private-progress-encrypted-v2-/);
assert.match(save,
  /always\(\).*steps\.component-progress-seal\.outcome == 'success'.*steps\.component-progress-seal\.outputs\.saved == 'true'/);
assert.match(save, /continue-on-error: true/);
assert.doesNotMatch(save, /\bpath:|actions\/cache\/save@/,
  'Cipher upload must not accept a caller path or bypass the owned operation');
const encryptedProgressUploadAction = read('.github/actions/save-owned-dmi-grib/index.cjs');
assert.match(encryptedProgressUploadAction, /const CIPHER_PATH = '\.cache\/weather-private-progress\.encrypted'/);
const coverage = step(normal, 'Report counts for each weather component after central cache');
const weather = step(normal, 'Update central weather cache');
assert.match(weather, /timeout-minutes: 80/);
assert.match(weather, /RAVRADAR_COMPONENT_COPERNICUS_BUDGET_MS: \$\{\{ inputs\.quick_confirmation && '45000' \|\| '90000' \}\}/);
assert.match(weather, /RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: \$\{\{ inputs\.quick_confirmation && '60000' \|\| '90000' \}\}/);
// The old assertions above retain their exact historical view. Capacity is
// proved separately on the actual current workflow, never on that inverse.
test('scalar reserve capacity: actual caller keeps ordinary600s quick60s and cache-only0', () => {
  const actualWeather = step(actualNormalWorkflow, 'Update central weather cache');
  assert.match(actualWeather, /RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: \$\{\{ inputs\.quick_confirmation && '60000' \|\| '600000' \}\}/);
  const expression = actualWeather.match(/RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: \$\{\{ (.+) \}\}/)?.[1];
  assert.ok(expression);
  for (const quick of [false, true]) assert.equal(runInNewContext(expression, { inputs: { quick_confirmation: quick } }), quick ? '60000' : '600000');
  assert.match(actualWeather, /RAVRADAR_WEATHER_CACHE_ONLY: \$\{\{ inputs\.checkpoint_only \}\}/);
  const runtime = read('scripts/update-weather.mjs');
  const runtimeExpression = runtime.match(/const COMPONENT_OPEN_METEO_BUDGET_MS = ([\s\S]*?);/)?.[1];
  assert.ok(runtimeExpression);
  for (const cacheOnly of [false, true]) {
    assert.equal(runInNewContext(runtimeExpression, { WEATHER_CACHE_ONLY: cacheOnly, process: { env: {} } }), cacheOnly ? 0 : 600000);
    for (const explicit of ['60000', '600000']) assert.equal(runInNewContext(runtimeExpression,
      { WEATHER_CACHE_ONLY: cacheOnly, process: { env: { RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: explicit } } }), cacheOnly ? 0 : Number(explicit));
  }
});
assert.match(coverage, /if: steps\.weather\.outcome == 'success'/);
assert.match(coverage, /continue-on-error: true/);
assert.match(coverage, /\.weatherEngine\.componentFallback/);
assert.match(coverage, /data\/live\/conditions\.json > "\$WEATHER_COMPONENT_SUMMARY_PATH"/);
assert.match(coverage, /import \{ safeWeatherComponentSummary \} from '\.\/scripts\/lib\/weather-component-safe-summary\.mjs'/);
assert.match(coverage, /console\.log\(JSON\.stringify\(safeWeatherComponentSummary\(summary\)\)\)/);
const safeProjection = read('scripts/lib/weather-component-safe-summary.mjs');
for (const field of ['before', 'afterCopernicus', 'after',
  'admittedCandidates', 'remainingNeeds', 'retryableAttempts', 'retryableReasons', 'transportFailure',
  'attemptCountsComplete', 'remainingUpgradeNeeds', 'passes', 'requestedNeeds', 'budgetMs',
  'deferred', 'failureCount', 'componentsNotAdmitted']) {
  assert.match(safeProjection, new RegExp(field));
}
assert.doesNotMatch(coverage, /lastAttemptedPartId|\$coverage\.openMeteo\.failures(?!\s*\|\s*length)/,
  'The safe component report must not print per-part cursor or raw failure rows');
assert.ok(normal.indexOf(coverage) < normal.indexOf(seal));
const cpQuality = step(normal, 'Reclaim a bounded Copernicus quality slice for the next normal run');
const cpQualityCheck = step(normal, 'Recheck reusable Copernicus evidence after optional quality work');
assert.match(cpQuality, /--refresh-only/);
assert.match(cpQuality, /--timeout-seconds 360/);
assert.match(cpQuality, /continue-on-error: true/);
assert.match(cpQualityCheck, /--require-source-stage-reusable/);
assert.ok(normal.indexOf(coverage) < normal.indexOf(cpQuality));
assert.ok(normal.indexOf(cpQuality) < normal.indexOf(cpQualityCheck));
assert.ok(normal.indexOf(cpQualityCheck) < normal.indexOf(seal));
assert.doesNotMatch(cpQuality, /actions\/cache\/(?:save|restore)/,
  'Copernicus quality work must use only the encrypted private progress path');

const dmiGribRestore = step(normal, 'Restore bounded DMI GRIB download cache');
const dmiGribSave = step(normal, 'Save progressed DMI GRIB download cache');
for (const official of [dmiGribRestore, dmiGribSave]) {
  assert.match(official, /\.cache\/dmi-grib/);
  assert.match(official, /dmi-grib-v4-/);
}

const dmi = step(normal, 'Update DMI bulk model cache');
const beforeDmi = step(normal, 'Plan global current acquisition before DMI');
const beforeCp = step(normal, 'Plan global current acquisition before Copernicus');
const cp = step(normal, 'Fill only exact-hour DMI gaps from Copernicus');
const om = step(normal, 'Fill only the exact remaining current gaps from Open-Meteo');
const terminal = step(normal, 'Require verified Open-Meteo residual checkpoint before closure');
assert.match(dmi, /inputs\.quick_confirmation && '900'/);
assert.match(dmi, /DMI_BULK_ADAPTIVE_RECOVERY: \$\{\{ inputs\.quick_confirmation != true &&/,
  'Short confirmation must not consume a one-hour adaptive recovery cooldown');
assert.ok(normal.indexOf(shortRecoveryGate) < normal.indexOf(dmi));
assert.match(cp, /inputs\.quick_confirmation && '120'/);
assert.match(om, /--runtime-seconds \$\{\{ inputs\.quick_confirmation && '120' \|\| '900' \}\}/);
assert.match(manual, /quick_confirmation: \$\{\{ inputs\.quick_confirmation \}\}/);
assert.match(manual, /quick_progress_source: \$\{\{ inputs\.quick_progress_source \}\}/);
assert.match(manual, /Progress source: exact encrypted-progress run-attempt for a full or short run; protected-current is short-only/);
const currentOriginalHour = step(normal, 'Require a strictly new normal hour for current-grid source succession');
assert.match(currentOriginalHour, /test "\$QUICK_CONFIRMATION" != 'true'/);
assert.match(currentOriginalHour, /target <= Date\.parse\(expected\.productionReferenceAt\)/);
// Invert only the reviewed epoch interface for the unchanged adjacency oracle;
// separately evaluate actual default/epoch routing, not synthetic admission.
const epochBuildInterface = [
  "      extended_provider_bootstrap: ${{ inputs.weather_state_epoch_bootstrap == true }}",
  "      weather_state_epoch_bootstrap: ${{ inputs.weather_state_epoch_bootstrap == true || inputs.weather_state_epoch_checkpoint_reentry == true }}",
  "      weather_state_epoch_checkpoint_reentry: ${{ inputs.weather_state_epoch_checkpoint_reentry }}",
  "      weather_state_epoch_raw_cache_key: ${{ inputs.weather_state_epoch_raw_cache_key }}",
  "      weather_state_epoch_archive_key: ${{ inputs.weather_state_epoch_checkpoint_reentry && inputs.weather_state_epoch_archive_key || needs.state-epoch-prewrite.outputs.archive_key }}",
  "      weather_state_epoch_archive_catalog_sha256: ${{ inputs.weather_state_epoch_checkpoint_reentry && inputs.weather_state_epoch_archive_catalog_sha256 || needs.state-epoch-prewrite.outputs.archive_catalog_sha256 }}",
].join('\n');
assert.equal(manual.split(epochBuildInterface).length, 2);
const ordinaryManual = manual.replace(epochBuildInterface, '      extended_provider_bootstrap: false');
assert.match(ordinaryManual, /force: true\n      extended_provider_bootstrap: false\n      quick_confirmation: \$\{\{ inputs\.quick_confirmation \}\}/);
function assertManualEpochInterface(source) {
  assert.match(source,
    /weather_state_epoch_bootstrap:\n        description: '[^']+'\n        required: false\n        type: boolean\n        default: false\n/);
  const start = source.indexOf('\n  build-and-prepare:\n');
  assert.ok(start >= 0, 'normal reusable-build caller must exist');
  const build = source.slice(start);
  const evaluate = (field, context) => {
    const lines = build.match(new RegExp('^      ' + field + ': (.+)$', 'gm')) ?? [];
    assert.equal(lines.length, 1, 'exactly one actual caller field: ' + field);
    const expression = lines[0].match(/: \$\{\{ (.+) \}\}$/)?.[1];
    assert.ok(expression, 'actual caller expression: ' + field);
    return runInNewContext(expression.replaceAll(
      'needs.state-epoch-prewrite.', 'needs["state-epoch-prewrite"].',
    ), context);
  };
  for (const enabled of [undefined, false, true]) {
    for (const quick of [false, true]) {
      const outputs = enabled === true
        ? { archive_key: 'synthetic-archive', archive_catalog_sha256: 'synthetic-catalog' }
        : { archive_key: '', archive_catalog_sha256: '' };
      const context = {
        inputs: { weather_state_epoch_bootstrap: enabled, quick_confirmation: quick },
        needs: { 'state-epoch-prewrite': { outputs } },
      };
      assert.equal(evaluate('extended_provider_bootstrap', context), enabled === true);
      assert.equal(evaluate('weather_state_epoch_bootstrap', context), enabled === true);
      assert.equal(evaluate('weather_state_epoch_archive_key', context), outputs.archive_key);
      assert.equal(evaluate('weather_state_epoch_archive_catalog_sha256', context), outputs.archive_catalog_sha256);
      assert.equal(evaluate('quick_confirmation', context), quick);
    }
  }
}
assertManualEpochInterface(manual);
{
  const build = manual.slice(manual.indexOf('\n  build-and-prepare:\n'));
  const context = { inputs: { weather_state_epoch_bootstrap:false, weather_state_epoch_checkpoint_reentry:true,
    weather_state_epoch_archive_key:'saved-archive', weather_state_epoch_archive_catalog_sha256:'saved-catalog',
    weather_state_epoch_raw_cache_key:'saved-raw' }, needs: { 'state-epoch-prewrite': { outputs:{} } } };
  const expected = { extended_provider_bootstrap:false, weather_state_epoch_bootstrap:true,
    weather_state_epoch_checkpoint_reentry:true, weather_state_epoch_archive_key:'saved-archive',
    weather_state_epoch_archive_catalog_sha256:'saved-catalog', weather_state_epoch_raw_cache_key:'saved-raw' };
  for (const [field,value] of Object.entries(expected)) {
    const expression = build.match(new RegExp('^      '+field+': \\$\\{\\{ (.+) \\}\\}$','m'))?.[1];
    assert(expression, field);
    assert.equal(runInNewContext(expression.replaceAll('needs.state-epoch-prewrite.','needs["state-epoch-prewrite"].'),context),value);
  }
}

for (const [from, to] of [
  ['extended_provider_bootstrap: ${{ inputs.weather_state_epoch_bootstrap == true }}',
    'extended_provider_bootstrap: ${{ true }}'],
  ['weather_state_epoch_bootstrap: ${{ inputs.weather_state_epoch_bootstrap == true || inputs.weather_state_epoch_checkpoint_reentry == true }}',
    'weather_state_epoch_bootstrap: ${{ false }}'],
  ['needs.state-epoch-prewrite.outputs.archive_key', 'needs.state-epoch-prewrite.outputs.archive_catalog_sha256'],
  ['needs.state-epoch-prewrite.outputs.archive_catalog_sha256', 'needs.state-epoch-prewrite.outputs.archive_key'],
]) {
  assert.equal(manual.split(from).length, 2, 'each interface mutation must change one actual caller');
  assert.throws(() => assertManualEpochInterface(manual.replace(from, to)));
}
assert.ok(normal.indexOf(beforeDmi) < normal.indexOf(dmi));
assert.ok(normal.indexOf(dmi) < normal.indexOf(beforeCp));
assert.ok(normal.indexOf(beforeCp) < normal.indexOf(cp));
assert.ok(normal.indexOf(cp) < normal.indexOf(om));
assert.ok(normal.indexOf(om) < normal.indexOf(terminal));
assert.ok(normal.indexOf(terminal) < normal.indexOf(seal));
assert.match(dmi, /DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH: \.cache\/weather-current-acquisition-plan\.json/);
assert.match(beforeCp, /--dmi \.cache\/dmi-candidate-progress\.json/);
for (const plan of [beforeDmi, beforeCp]) {
  assert.match(plan, /if ! python scripts\/build-weather-acquisition-plan\.py/);
  assert.match(plan, /rm -f \.cache\/weather-current-acquisition-plan\.json/);
  assert.match(plan, /continue-on-error: true/);
}
assert.match(terminal, /missing_pair_count/);
assert.match(terminal, /checkpoint_written/);

const safe = step(normal, 'Preserve safe weather acquisition diagnostics before terminal gates');
assert.match(safe, /actions\/upload-artifact@v7/);
assert.match(safe, /retention-days: 7/);
assert.doesNotMatch(safe, /currentUMps|currentVMps|donor-bank|shadow\.json/);

test('ordinary WAM diagnostics survive a finalized partial DMI result only after closure and RAW save', () => {
  const stepName = 'Preserve safe weather acquisition diagnostics before terminal gates';
  const actual = step(actualNormalWorkflow, stepName);
  const report = 'data/diagnostics/dmi-wave-acquisition-safe.json';
  const reportExpression = actual.split('\n').find(line => line.includes(report))?.trim();
  assert.ok(reportExpression?.startsWith('${{') && reportExpression.endsWith('}}'));
  const expression = reportExpression.slice(3, -2).trim();
  const ready = {wave_acquisition_report_ready: 'true', status: 'failed', strict_current_anchor_ready: 'false'};
  const selects = ({outcome = 'failure', outputs = ready, closed = 'success', saved = 'true'} = {}) =>
    runInNewContext(expression, {
      steps: {
        'dmi-bulk': {outcome, outputs},
        'dmi-producer-closure': {outcome: closed},
        'dmi-raw-save': {outputs: {saved}},
      },
    }, {timeout: 250});

  assert.equal(selects(), report);
  assert.equal(selects({outcome: 'success', closed: 'skipped', saved: ''}), report);
  assert.equal(selects({outputs: {...ready, wave_acquisition_report_ready: 'false'}}), '');
  assert.equal(selects({outputs: {...ready, status: 'ok'}}), '');
  assert.equal(selects({outputs: {...ready, strict_current_anchor_ready: 'true'}}), '');
  assert.equal(selects({closed: 'failure'}), '');
  assert.equal(selects({saved: ''}), '');
  assert.equal(selects({outcome: 'cancelled'}), '');
  assert.equal(selects({outcome: 'skipped'}), '');
});

const retiredPostBuild = orchestrator.slice(
  orchestrator.indexOf('\n  copernicus-post-build-refresh:'),
  orchestrator.indexOf('\n  deploy-pages:'),
);
assert.match(retiredPostBuild, /&& false \}\}/);
const retiredKeepalive = watchdog.slice(
  watchdog.indexOf('\n  preserve:'),
  watchdog.indexOf('\n  retry-failed-production:'),
);
assert.match(retiredKeepalive, /&& false/);
for (const job of ['validate', 'operational-118-preflight', 'resume-private-capacity-and-seal-handoff', 'current-input-diagnostic']) {
  const start = retiredOneoff.indexOf(`\n  ${job}:`);
  assert.ok(start >= 0, `Retired one-off job missing: ${job}`);
  const header = retiredOneoff.slice(start, start + 1200);
  assert.match(header, /if: .*&& false/);
}

const weatherRuntime = read('scripts/update-weather.mjs');
function assertCacheOnlyBeforeFetch(runtime) {
  assert.equal((runtime.match(/\bfetch\(/g) || []).length, 1,
    'All update:weather network access must remain behind fetchJson');
  assert.equal((runtime.match(/^async function fetchJson\(/gm) || []).length, 1,
    'Exactly one actual fetchJson declaration');
  const start = runtime.indexOf('async function fetchJson(');
  const end = runtime.indexOf('\nasync function fetchAllFeatures(', start);
  assert.ok(start >= 0 && end > start, 'Actual fetchJson extraction must be bounded');
  const fetchJson = runtime.slice(start, end);
  const guard = fetchJson.match(/^  if \(WEATHER_CACHE_ONLY\) \{\n    const error = new Error\([^\n]+\);\n    error\.code = 'WEATHER_CACHE_ONLY_NETWORK_DISABLED';\n    throw error;\n  \}\n/m)?.[0];
  assert.ok(guard, 'Cache-only mode must throw its existing error');
  assert.match(fetchJson, /^async function fetchJson\([^\n]+\) \{\n  assertWeatherTransportSettlement\(\);\n  if \(WEATHER_CACHE_ONLY\) \{/,
    'Cache-only rejection stays at the actual function entry');
  const cacheOnlyGuard = fetchJson.indexOf(guard);
  const networkFetch = fetchJson.indexOf('response = await fetch(url');
  assert.equal((fetchJson.match(/\bfetch\(/g) || []).length, 1,
    'The sole network fetch must be inside actual fetchJson');
  assert.ok(cacheOnlyGuard >= 0 && networkFetch > cacheOnlyGuard + guard.length,
    'Cache-only guard must fail before the sole network fetch');
  assert.match(fetchJson, /error\.code = 'WEATHER_CACHE_ONLY_NETWORK_DISABLED'/);
  return guard;
}
const cacheOnlyGuard = assertCacheOnlyBeforeFetch(weatherRuntime);
assert.throws(() => assertCacheOnlyBeforeFetch(weatherRuntime.replace(cacheOnlyGuard, '')),
  'A removed cache-only rejection must fail the static contract');
assert.throws(() => assertCacheOnlyBeforeFetch(weatherRuntime.replace(cacheOnlyGuard, '')
  .replace('  throw lastError ??', `${cacheOnlyGuard}  throw lastError ??`)),
  'A rejection moved after the network fetch must fail the static contract');
assert.throws(() => assertCacheOnlyBeforeFetch(`${weatherRuntime}\nfetch('synthetic-only');\n`),
  'An additional fetch must fail the static contract');
assert.throws(() => assertCacheOnlyBeforeFetch(weatherRuntime
  .replace('response = await fetch(url', 'response = await syntheticTransport(url')
  + '\nasync function syntheticOutside() { const response = await fetch(url); }\n'),
  'A sole fetch outside fetchJson must fail the static contract');

// Explicit checkpoint continuation is a real normal build, not a fabricated
// provider handoff. Its untrusted hour hint is confirmed by authenticated input.
assert.match(manual, /checkpoint_target_hour:\s+description: '[^']+'\s+required: false\s+type: string\s+default: ''/);
assert.match(normal, /checkpoint_only:\s+required: false\s+type: boolean\s+default: false/);
assert.match(orchestrator, /^      checkpoint_only: false$/m,
  'Automated production must keep ordinary acquisition by default');
assert.ok(manual.includes("      checkpoint_only: ${{ inputs.checkpoint_target_hour != '' }}"));
const originalHour = step(manual, 'Lock the requested original checkpoint hour without provider work');
assert.ok(originalHour.includes("if: inputs.checkpoint_target_hour != ''"));
assert.match(originalHour, /test "\$QUICK_CONFIRMATION" = false/);
assert.match(originalHour, /\[\[ "\$QUICK_PROGRESS_SOURCE" =~ \^\[1-9\]\[0-9\]\*-\[1-9\]\[0-9\]\*\$ \]\]/);
assert.match(originalHour, /check-production-target-freshness\.mjs/);
assert.doesNotMatch(originalHour, /DMI_API_KEY|fetch\(|curl |requests\./);
const offlineRequest = step(normal, 'Validate provider-free checkpoint continuation request');
const offlineHour = step(normal, 'Require the authenticated original hour before provider-free continuation');
assert.match(offlineRequest, /if: inputs\.checkpoint_only == true/);
assert.match(offlineRequest, /test "\$QUICK_CONFIRMATION" = false/);
assert.match(offlineRequest, /steps\.private-runtime-install\.outcome.*success/);
assert.match(offlineRequest, /steps\.private-runtime-state\.outputs\.available.*true/);
assert.match(offlineRequest, /integrated\|integrated-historical-maintenance/);
assert.match(offlineHour, /report\.status !== 'RESTORED' \|\| report\.restored !== true/);
assert.match(offlineHour, /report\.restoredProductionReferenceAt/);
assert.match(offlineHour, /process\.env\.RAVRADAR_PRODUCTION_TARGET_HOUR/);
assert.ok(normal.indexOf(offlineRequest) < normal.indexOf(restore));
assert.ok(normal.indexOf(shortRecoveryGate) < normal.indexOf(offlineHour));
assert.ok(normal.indexOf(offlineHour) < normal.indexOf(dmi));
const progressBind = step(normal, 'Bind optional progress to the exact protected baseline');
assert.match(progressBind, /restore_arguments=\(\)/);
assert.match(progressBind, /restore_arguments=\(--resume-original-target true\)/);
assert.match(progressBind, /--report "\$RUNNER_TEMP\/weather-progress-restore-report\.json" "\$\{restore_arguments\[@\]\}"/);
const generationPrepare = step(normal, 'Prepare strict active DMI donor or resumable candidate');
assert.ok(generationPrepare.indexOf('inputs.checkpoint_only')
  < generationPrepare.indexOf('steps.dmi-active-restore.outputs.available'),
  'Explicit continuation may not replace its authenticated candidate with an older active donor');
assert.match(dmi, /DMI_BULK_CACHE_ONLY: \$\{\{ inputs\.checkpoint_only \}\}/);
assert.match(dmi, /continue-on-error: \$\{\{ inputs\.checkpoint_only != true \}\}/);
for (const providerStep of [cp, cpQuality,
  step(normal, 'Refresh DMI water-source registry'),
  step(normal, 'Install targeted Copernicus dependencies'),
  step(normal, 'Verify targeted Copernicus credentials')]) {
  assert.match(providerStep, /inputs\.checkpoint_only != true/);
}
assert.ok(om.includes("${{ inputs.checkpoint_only && '--reuse-only' || '' }}"));
assert.match(weather, /RAVRADAR_WEATHER_CACHE_ONLY: \$\{\{ inputs\.checkpoint_only \}\}/);
assert.doesNotMatch(offlineRequest + offlineHour, /DMI_HANDOFF_VERIFIED|strict_active_ready=true|reused=true/,
  'A checkpoint request must not invent a successful producer or handoff');

console.log('OK: DMI-first acquisition, one encrypted private progress path, safe diagnostics and retired plaintext entrances.');

test('runtime audit execution observation keeps actual exit and private-free metadata without changing gates',async()=>{
  const block=step(actualNormalWorkflow,'Audit runtime and collect independent cutover validation failures');
  const ordinary=block.slice(block.indexOf('            # Both small observers'));
  const starts=['node scripts/observe-runtime-audit-execution.mjs --phase before || true',
    'node scripts/audit-ravscore-integrated-public-runtime.mjs','|| runtime_audit_exit_status=$?',
    'node scripts/observe-runtime-audit-execution.mjs --phase after'].map(marker=>ordinary.indexOf(marker));
  assert.ok(starts.every((value,index)=>value>=0&&(index===0||value>starts[index-1])));
  for(const marker of ['--exit-code "$runtime_audit_exit_status" || true',
    'echo "runtime_audit_exit_status=$runtime_audit_exit_status" >> "$GITHUB_OUTPUT"',
    'echo "runtime_audit_outcome=$runtime_audit_outcome" >> "$GITHUB_OUTPUT"'])assert.ok(ordinary.includes(marker));
  assert.doesNotMatch(ordinary,/NODE_OPTIONS|--max-old-space|2>|stderr|--input [^d]/);
  const warnings=ordinary.slice(ordinary.indexOf('            if test "$runtime_audit_outcome" = "failure"; then'),ordinary.indexOf('          rollback_status='));
  assert.match(warnings,/if test -f "\$audit_path"; then[\s\S]*The audit found one or more model\/state issues[\s\S]*else[\s\S]*The audit process stopped before its required report was written \(exit \$runtime_audit_exit_status\)/);
  assert.equal(warnings.split('The audit found one or more model/state issues.').length,2);
  assert.equal(warnings.split('The audit process stopped before its required report was written').length,2);
  assert.ok(warnings.includes('Fixed failure/execution observations are uploaded separately; the required-report publication gates remain unchanged.'));
  const upload=step(actualNormalWorkflow,'Upload the payload-free runtime audit for every weather build');
  assert.ok(upload.includes('if: always()'));
  for(const suffix of ['', '.failure.json', '.execution.json'])
    assert.equal(upload.split('            .geometry-v2-work/ravscore-integrated-public-runtime-audit.json'+suffix+'\n').length,2);
  assert.ok(upload.includes("hashFiles('.geometry-v2-work/ravscore-integrated-public-runtime-audit.json', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json.failure.json', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json.execution.json')"));
  const disposition=step(actualNormalWorkflow,'Create and validate exactly one checkpoint disposition before release gate');
  assert.doesNotMatch(disposition,/execution\.json|failure\.json|observe-runtime-audit/);
  assert.ok(disposition.includes('select(. == "READY" or . == "BUILDING_MEASURED_ONLY")'));
  const root=fs.mkdtempSync(path.join(tmpdir(),'rr-audit-execution-'));
  const helper=path.resolve('scripts/observe-runtime-audit-execution.mjs');
  const report=path.join(root,'.geometry-v2-work/ravscore-integrated-public-runtime-audit.json');
  const output=report+'.execution.json',marker='PRIVATE_AUDIT_OBSERVATION_MARKER';
  const inputPaths={conditions:'data/live/conditions.json',startup:'data/live/public-conditions.json',details:'data/live/public-condition-details.json',manifest:'data/live/manifest.json',coastalParts:'data/live/coastal-parts-v2.json',zoneRegistry:'data/zones.geojson'};
  const keys=['auditExitCode','failureReportPresent','heapLimitBytes','inputSizes','phase','privatePayloadIncluded','reportPresent','schemaVersion','status'].sort();
  try{
    const missing=await writeRuntimeAuditExecutionObservation({phase:'before',repositoryRoot:root});
    assert.deepEqual(Object.keys(missing).sort(),keys);assert.equal(missing.status,'NOT_FINISHED');
    assert.equal(missing.auditExitCode,null);assert.equal(missing.reportPresent,false);assert.equal(missing.failureReportPresent,false);
    assert.deepEqual(Object.keys(missing.inputSizes).sort(),Object.keys(inputPaths).sort());
    for(const value of Object.values(missing.inputSizes))assert.deepEqual(value,{status:'MISSING',bytes:null});
    for(const relative of Object.values(inputPaths)){
      const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,marker+' æ');
    }
    const env={...process.env,NODE_OPTIONS:'--max-old-space-size=192',RAVRADAR_PRIVATE_TEST_MARKER:marker};
    const expected=spawnSync(process.execPath,['--max-old-space-size=128','-e',"process.stdout.write(String(require('node:v8').getHeapStatistics().heap_size_limit))"],{cwd:root,env,encoding:'utf8'});
    assert.equal(expected.status,0);
    const run=args=>spawnSync(process.execPath,['--max-old-space-size=128',helper,...args],{cwd:root,env,encoding:'utf8'});
    let child=run(['--phase','before']);assert.equal(child.status,0);assert.equal(child.stdout,'');assert.equal(child.stderr,'');
    const start=JSON.parse(fs.readFileSync(output,'utf8'));
    assert.equal(start.heapLimitBytes,Number(expected.stdout));assert.equal(start.phase,'BEFORE_AUDIT');
    for(const size of Object.values(start.inputSizes))assert.deepEqual(size,{status:'REGULAR',bytes:Buffer.byteLength(marker+' æ')});
    const stopped=spawnSync(process.execPath,['-e','process.exit(134)'],{cwd:root,encoding:'utf8'});
    assert.equal(stopped.status,134);
    child=run(['--phase','after','--exit-code',String(stopped.status)]);assert.equal(child.status,0);
    let value=JSON.parse(fs.readFileSync(output,'utf8'));
    assert.equal(value.phase,'AFTER_AUDIT');assert.equal(value.status,'EXIT_NONZERO');assert.equal(value.auditExitCode,134);
    assert.equal(value.heapLimitBytes,start.heapLimitBytes);assert.equal(value.reportPresent,false);
    fs.writeFileSync(report,marker);fs.writeFileSync(report+'.failure.json',marker);
    child=run(['--phase','after','--exit-code','0']);assert.equal(child.status,0);
    value=JSON.parse(fs.readFileSync(output,'utf8'));assert.deepEqual(Object.keys(value).sort(),keys);
    assert.equal(value.status,'EXIT_ZERO');assert.equal(value.auditExitCode,0);
    assert.equal(value.reportPresent,true);assert.equal(value.failureReportPresent,true);assert.equal(value.privatePayloadIncluded,false);
    const good=fs.readFileSync(output,'utf8');
    assert.doesNotMatch(good,new RegExp(marker+'|NODE_OPTIONS|RAVRADAR_PRIVATE_TEST_MARKER|stderr|stack|READY|conditions.json|zones.geojson'));
    for(const args of [['--phase','after','--exit-code','256'],['--phase','after','--exit-code','-1'],
      ['--phase','after','--exit-code',marker],['--phase','before','--exit-code','0'],['--phase','unknown']]){
      child=run(args);assert.equal(child.status,1);assert.equal(child.stdout,'');
      assert.equal(child.stderr.trim(),'AUDIT_EXECUTION_OBSERVATION_FAILED');assert.equal(fs.readFileSync(output,'utf8'),good);
    }
    await assert.rejects(()=>writeRuntimeAuditExecutionObservation({phase:'after',exitCode:1.5,repositoryRoot:root}),/AUDIT_EXECUTION_ARGUMENTS/);
    assert.equal(fs.readFileSync(output,'utf8'),good);
  }finally{
    const absolute=path.resolve(root),allowed=path.resolve(tmpdir())+path.sep;
    assert.ok(absolute.startsWith(allowed)&&path.basename(absolute).startsWith('rr-audit-execution-'));
    fs.rmSync(absolute,{recursive:true,force:true});
  }
});


test('qualified scalar planning uses the restored snapshot and preserves conservative special routes', () => {
  // This original layout oracle keeps its genuine input; the current layout is checked separately below.
  const actualNormalWorkflow = historicalNormalWorkflow;
  const budget = step(actualNormalWorkflow, 'Choose DMI budget from retained five-component PART coverage');
  const planner = step(actualNormalWorkflow, 'Plan global current acquisition before DMI');
  const dmi = step(actualNormalWorkflow, 'Update DMI bulk model cache');
  assert.match(budget, /printf 'cache_path=%s\\n' "\$recovery_cache" >> "\$GITHUB_OUTPUT"/);
  assert.match(planner, /DMI_PLANNING_SNAPSHOT: \$\{\{ steps\.dmi-recovery-budget\.outputs\.cache_path \}\}/);
  assert.match(planner, /node scripts\/plan-weather-scalar-acquisition\.mjs "\$\{scalar_args\[@\]\}"/);
  assert.match(planner, /--scalar-snapshot "\$DMI_PLANNING_SNAPSHOT"/);
  assert.match(planner, /--scalar-history "\$DMI_PART_CONTINUITY_DONOR_PATH"/);
  assert.match(planner, /scalar_status.*-eq 2; then[\s\S]*exit 2/);
  assert.doesNotMatch(planner, /continue-on-error: true/);
  assert.match(planner, /rm -f \.cache\/weather-scalar-needs\.json \.cache\/weather-qualified-acquisition-plan\.json/);
  assert.match(dmi, /DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH: \.cache\/weather-current-acquisition-plan\.json/);
  assert.match(dmi, /DMI_BULK_QUALIFIED_ACQUISITION_PLAN_PATH: \.cache\/weather-qualified-acquisition-plan\.json/);
  assert.match(dmi, /DMI_BULK_SCALAR_SNAPSHOT_PATH: \$\{\{ steps\.dmi-recovery-budget\.outputs\.cache_path \}\}/);
  const expression = planner.match(/RAVRADAR_RETAINED_SCALAR_CONTEXT: \$\{\{ (.+) && 'ordinary-restored' \|\| '' \}\}/)?.[1];
  assert.ok(expression);
  const history = step(actualNormalWorkflow, 'Plan bounded current history from the actual selected continuation');
  const schema1 = "steps.dmi-part-continuity-donor.outputs.continuity_schema == '1'";
  const schema12 = "("+schema1+" || steps.dmi-part-continuity-donor.outputs.continuity_schema == '2')";
  assert.equal(expression.split(schema12).length, 2, 'Only the two known continuity schemas select scalar work');
  const historicalExpression = expression.replace(schema12, schema1);
  assert.ok(history.includes(historicalExpression+" && '--prepare-cached-native-originals'"),
    'Every other existing ordinary-restored guard and the historical schema1 selector remain unchanged');
  // Restore the exact reviewed Pages predecessors before deriving the prior scalar selector.
  const reviewedWeatherWorkflow = inversePagesPublicProjectionWorkflow(
    inverseImmediateOrdinaryPagesWorkflow(historicalPagesInput(actualNormalWorkflow, 'build'), 'build'), 'build');
  const predecessor = reviewedWeatherWorkflow.replace('RAVRADAR_RETAINED_SCALAR_CONTEXT: ${{ '+schema12,
    'RAVRADAR_RETAINED_SCALAR_CONTEXT: ${{ '+schema1);
  assert.notEqual(predecessor, reviewedWeatherWorkflow);
  assert.equal(inverseCompletedRuntimeWorkflow(historicalPagesInput(actualNormalWorkflow, 'build'), 'build'),
    inverseCompletedRuntimeWorkflow(predecessor, 'build'), 'The complete historical workflow oracle is unchanged');
  for (const unknown of [actualNormalWorkflow+'\n', actualNormalWorkflow.replace(schema12, schema12+' || true')]) {
    assert.throws(() => inverseCompletedRuntimeWorkflow(unknown, 'build'),
      'Unknown whole workflows retain the historical rejection');
  }
});

test('raw current acquisition binds one retained snapshot to planner then qualified DMI budget', () => {
  function requireCurrentChain(source) {
    const snapshot = step(source, 'Prepare retained DMI planning snapshot');
    const planner = step(source, 'Plan global current acquisition before DMI');
    const budget = step(source, 'Choose DMI budget from retained five-component PART coverage');
    const dmi = step(source, 'Update DMI bulk model cache');
    const offsets = [snapshot, planner, budget, dmi].map(block => source.indexOf(block));
    assert.ok(offsets.every((at, index) => at >= 0 && (!index || at > offsets[index - 1])),
      'Materialize one snapshot, finish the planner, derive its qualified budget, then run DMI');
    const guard = "inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true')";
    for (const block of [snapshot, planner, budget])
      assert.equal(block.match(/^        if: (.+)$/m)?.[1], guard, 'Same ordinary provider-route guard');
    assert.match(snapshot, /id: dmi-recovery-snapshot/);
    assert.ok(snapshot.includes("printf 'cache_path=%s\\n' \"$recovery_cache\" >> \"$GITHUB_OUTPUT\""));
    for (const block of [planner, budget]) {
      assert.ok(block.includes('DMI_PLANNING_SNAPSHOT: ${{ steps.dmi-recovery-snapshot.outputs.cache_path }}'));
      assert.ok(block.includes('DMI_PART_CONTINUITY_DONOR_PATH: ${{ steps.restored-dmi-part-continuity-donor.outputs.path }}'));
      assert.ok(block.includes('--scalar-history "$DMI_PART_CONTINUITY_DONOR_PATH"'));
    }
    assert.ok(planner.includes('if ! python scripts/build-weather-acquisition-plan.py'));
    assert.ok(planner.includes('"${qualified_args[@]}"; then'));
    assert.ok(planner.includes('rm -f .cache/weather-current-acquisition-plan.json .cache/weather-qualified-acquisition-plan.json'));
    assert.ok(budget.includes('python scripts/plan-dmi-recovery.py'));
    for (const argument of ['--qualified-plan .cache/weather-qualified-acquisition-plan.json',
      '--current-plan .cache/weather-current-acquisition-plan.json', '--scalar-snapshot "$DMI_PLANNING_SNAPSHOT"',
      '--cache "$DMI_PLANNING_SNAPSHOT"', '--parts data/live/coastal-parts-v2.json',
      '--at "$RAVRADAR_PRODUCTION_TARGET_HOUR"', '"${qualified_args[@]}"', '--github-output "$GITHUB_OUTPUT"'])
      assert.ok(budget.includes(argument), 'Normal qualified budget argument: ' + argument);
    assert.ok(budget.includes("printf 'cache_path=%s\\n' \"$DMI_PLANNING_SNAPSHOT\" >> \"$GITHUB_OUTPUT\""));
    for (const variable of ['DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH: .cache/weather-current-acquisition-plan.json',
      'DMI_BULK_QUALIFIED_ACQUISITION_PLAN_PATH: .cache/weather-qualified-acquisition-plan.json',
      'DMI_BULK_SCALAR_SNAPSHOT_PATH: ${{ steps.dmi-recovery-budget.outputs.cache_path }}'])
      assert.ok(dmi.includes(variable), 'DMI receives the same qualified planning inputs: ' + variable);
    return { planner, budget, guard };
  }
  const { planner, budget, guard } = requireCurrentChain(actualNormalWorkflow);
  for (const changed of [
    actualNormalWorkflow.replace(budget, '').replace(planner, () => budget + planner),
    actualNormalWorkflow.replace(budget, () => budget.replace('--qualified-plan .cache/weather-qualified-acquisition-plan.json', '')),
    actualNormalWorkflow.replace(budget, () => budget.replace('steps.dmi-recovery-snapshot.outputs.cache_path', 'steps.dmi-recovery-budget.outputs.cache_path')),
    actualNormalWorkflow.replace(budget, () => budget.replace('        if: ' + guard, '        if: true')),
  ]) {
    assert.notEqual(changed, actualNormalWorkflow);
    assert.throws(() => requireCurrentChain(changed));
  }
});
