// Current Pages safety only: raw checkout files, no historical projection or inverse imports.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const rawWorkflow = async relative => (await fs.readFile(new URL(relative, import.meta.url), 'utf8')).replaceAll('\r\n', '\n');

// Check actual full-checkout preparation before the unchanged historical view.
const fullGitPinPreparationSteps = [
  'Prepare exact pinned Candidate G source before source validation',
  'Ensure exact historical Candidate G source is present for full validation',
];
function fullGitPinPreparationStep(source, name) {
  const marker='      - name: '+name+'\n', start=source.indexOf(marker);
  assert.equal(source.split(marker).length,2,'One exact normal pin preparation step');
  const end=source.indexOf('\n      - ',start+marker.length);
  return source.slice(start,end<0?source.length:end);
}
function assertFullGitPinPreparation(source) {
  for(const [index,name]of fullGitPinPreparationSteps.entries()){
    const block=fullGitPinPreparationStep(source,name);
    assert.doesNotMatch(block,/git fetch[^\n]*(?:--depth|--deepen|--unshallow)/,
      'Normal pin preparation must preserve a complete checkout');
    const fetched=index===0?'            test "$(git rev-parse FETCH_HEAD^{commit})" = "$legacy_source_head"\n':'';
    assert.ok(block.includes('          if ! git cat-file -e "${legacy_source_head}^{commit}" 2>/dev/null; then\n'
      +'            git fetch --no-tags origin "$legacy_source_head"\n'+fetched+'          fi\n'),
      'Fetch only a missing pinned commit; preserve fetched identity verification');
    for(const suffix of ['commit','tree'])assert.ok(block.includes(
      '          test "$(git rev-parse "${legacy_source_head}^{'+suffix+'}")" = "$legacy_source_'+(suffix==='commit'?'head':'tree')+'"'),
      'Always verify the exact pinned commit and tree');
    assert.equal((block.match(/^\s+git fetch /gm)??[]).length,index===0?2:1,
      'No additional unguarded pin fetch');
    if(index===0)assert.ok(block.includes('            if ! git cat-file -e "${original_head}^{commit}"; then\n'
      +'              git fetch --no-tags origin "$original_head"\n            fi\n'
      +'            test "$(git rev-parse "${original_head}^{commit}")" = "$original_head"'),
      'Both original readers retain conditional no-depth fetching and exact identities');
  }
}

test('current Pages workflow preserves full Git pin preparation and every original mutation refusal', async () => {
const actualFullGitBuildSource=(await rawWorkflow('../.github/workflows/reusable-weather-build.yml')).replace(/\r\n/g,'\n');
assertFullGitPinPreparation(actualFullGitBuildSource);
for(const name of fullGitPinPreparationSteps){
  const block=fullGitPinPreparationStep(actualFullGitBuildSource,name);
  for(const changed of [
    block.replace('git fetch --no-tags origin','git fetch --no-tags --depth=1 origin'),
    block.replace('if ! git cat-file','if git cat-file'),
    ...['commit','tree'].map(suffix=>block.replace(
      '          test "$(git rev-parse "${legacy_source_head}^{'+suffix+'}")" = "$legacy_source_'+(suffix==='commit'?'head':'tree')+'"','')),
    block+'\n          git fetch --no-tags origin "$legacy_source_head"\n',
  ])assert.throws(()=>assertFullGitPinPreparation(actualFullGitBuildSource.replace(block,()=>changed)));
}
});

const blocks = text => text.split(/(?=^      - (?:name:|uses:))/m).slice(1);
const step = (text, name) => blocks(text).find(block => block.startsWith('      - name: ' + name + '\n'));
const selector = block => block.match(/^        if: (.+)$/m)?.[1] ?? 'true';
const evaluate = (expression, inputs, overrides = {}) => runInNewContext(expression
  .replace(/^\$\{\{\s*|\s*\}\}$/g, '').replace(/\bsteps\.([a-z][a-z0-9-]*)/g, (_, id) => `steps[${JSON.stringify(id)}]`),
  { inputs, steps: new Proxy(overrides, { get: (o, key) => o[key] ?? { outcome: 'success', outputs: {
    should_run: 'true', action: 'integrated-historical-maintenance', required: 'true', available: 'true', source_normal_producer: 'false',
    disposition: 'MEASURED_WARMUP_PUBLISHED', maintenance_completed: 'true', reused: 'false',
  } } }), github: { ref: 'refs/heads/main', event_name: 'workflow_dispatch' },
  success: () => true, always: () => true, cancelled: () => false, failure: () => false, hashFiles: () => 'synthetic' });
const defaults = { completed_private_runtime: false, checkpoint_only: false, quick_confirmation: false,
  quick_progress_source: '', weather_state_epoch_bootstrap: false, weather_state_epoch_checkpoint_reentry: false,
  native_sampling_identity_original_recovery: false, extended_provider_bootstrap: false, produce_weather_handoff: false };
const providerNames = ['Update DMI bulk model cache', 'Fill only exact-hour DMI gaps from Copernicus',
  'Fill only the exact remaining current gaps from Open-Meteo', 'Update central weather cache',
  'Prepare only an explicitly requested READY point activation',
  'Advance private point-candidate readiness without public score impact',
  'Atomically promote the validated point candidate in central admin storage',
  'Refuse a point activation without a successful exact-point weather rebuild',
  'Restore encrypted private weather progress only', 'Bind optional progress to the exact protected baseline'];



function currentStepById(source, id) {
  const found = blocks(source).filter(block => block.includes('\n        id: ' + id + '\n'));
  assert.equal(found.length, 1, 'One current step for ' + id);
  return found[0];
}
function evaluateCurrentMode(block, completed, changes = {}) {
  const rows = {
    'operational-model': { outputs: { source_normal_producer: 'false' } },
    preflight: { outputs: { should_run: 'true' } },
    weather: { outcome: completed ? 'skipped' : 'success' },
    'completed-runtime-admission': { outcome: completed ? 'success' : 'skipped' },
    'checkpoint-disposition': { outputs: { disposition: 'READY_PUBLISHED' } },
    'operational-action': { outputs: { action: 'integrated-historical-maintenance' } },
    'private-build-stage-seal': { outcome: 'success' },
    'private-runtime-publish': { outcome: 'success' },
    'private-runtime-install': { outcome: 'success' },
    'weather-source-handoff': { outputs: { reused: 'false' } },
    'targeted-copernicus-cache': { outputs: { source_stage_ready: 'false' } },
    'dmi-bulk': { outcome: 'success' },
    ...changes,
  };
  const expression = selector(block);
  return runInNewContext(expression.replace(/^\$\{\{\s*|\s*\}\}$/g, '')
    .replace(/\bsteps\.([a-z][a-z0-9-]*)/g, (_, id) => 'steps[' + JSON.stringify(id) + ']'), {
    inputs: { ...defaults, current_family_cold_start: false, completed_private_runtime: completed },
    steps: new Proxy(rows, { get(target, key) {
      assert.ok(Object.hasOwn(target, key), 'The current-mode fixture must define ' + String(key));
      return target[key];
    } }),
    always: () => true, success: () => true, cancelled: () => false, failure: () => false,
    github: { ref: 'refs/heads/main', event_name: 'workflow_dispatch' },
  });
}
function assertCurrentModeRelations(source) {
  const at = id => source.indexOf(currentStepById(source, id));
  const precedes = (first, second) => assert.ok(at(first) < at(second), first + ' must precede ' + second);
  // Dependency edges, not one historical total ordering. The encrypted
  // unpublished B stage is deliberately allowed before final validation.
  for (const [first, second] of [
    ['private-runtime-bundle-spec', 'private-runtime-bundle-create'],
    ['private-runtime-bundle-create', 'private-build-stage-seal'],
    ['private-build-stage-seal', 'private-build-stage-upload'],
    ['private-build-stage-upload', 'full-validation'],
    ['full-validation', 'checkpoint-build'], ['release-gate', 'checkpoint-build'],
    ['checkpoint-build', 'checkpoint-save'], ['checkpoint-save', 'private-runtime-publish'],
    ['private-runtime-publish', 'checkpoint-publish'],
    ['completed-runtime-admission', 'completed-runtime-target'],
    ['completed-runtime-target', 'private-runtime-publish'],
    ['checkpoint-publish', 'current-grid-pages-target'],
    ['current-grid-pages-target', 'current-grid-pages-upload'],
    ['current-grid-pages-upload', 'current-grid-pages-artifact-seal'],
    ['current-grid-pages-artifact-seal', 'current-grid-edge-publication'],
    ['current-grid-edge-publication', 'current-grid-backend-readiness'],
  ]) precedes(first, second);
  const protectedIds = ['private-runtime-bundle-spec', 'private-runtime-bundle-create',
    'private-build-stage-seal', 'checkpoint-build', 'checkpoint-save',
    'private-runtime-publish', 'checkpoint-publish'];
  for (const completed of [false, true]) {
    for (const id of protectedIds) {
      const block = currentStepById(source, id);
      assert.equal(evaluateCurrentMode(block, completed), true, id + ': valid current mode');
      assert.equal(evaluateCurrentMode(block, completed, { preflight: { outputs: { should_run: 'false' } } }), false,
        id + ': no work without the actual preflight');
      assert.equal(evaluateCurrentMode(block, completed, { weather: { outcome: 'failure' },
        'completed-runtime-admission': { outcome: 'failure' } }), false,
        id + ': neither failed fresh weather nor failed completed admission grants publication');
      assert.doesNotMatch(selector(block), /always\(\)|failure\(\)|cancelled\(\)/,
        id + ': protected work retains the normal preceding-success requirement');
    }
    assert.equal(evaluateCurrentMode(currentStepById(source, 'completed-runtime-target'), completed), completed,
      'Only the selected completed mode enters completed-target admission');
    assert.equal(evaluateCurrentMode(currentStepById(source, 'checkpoint-publish'), completed,
      { 'private-runtime-publish': { outcome: 'failure' } }), false,
      'S cannot be published after failed B publication');
    for (const id of ['private-build-stage-seal', 'checkpoint-build', 'checkpoint-save', 'checkpoint-publish'])
      assert.equal(evaluateCurrentMode(currentStepById(source, id), completed,
        { 'checkpoint-disposition': { outputs: { disposition: 'UNKNOWN' } } }), false,
        id + ': an unknown checkpoint disposition cannot enter this mode');
  }
  const stage = currentStepById(source, 'private-build-stage-seal');
  assert.match(stage, /if test -n "\$COMPLETED_STAGE_SOURCE"; then[\s\S]*ordinary-completed-stage-admission\.mjs preserve-cipher[\s\S]*else[\s\S]*staged-private-production-runtime\.mjs seal/);
  assert.match(stage, /--source-head "\$GITHUB_SHA"[\s\S]*--repository "\$GITHUB_REPOSITORY"[\s\S]*--run-id "\$GITHUB_RUN_ID"[\s\S]*--run-attempt "\$GITHUB_RUN_ATTEMPT"/);
  assert.match(currentStepById(source, 'private-runtime-publish'), /if test -n "\$COMPLETED_STAGE_SOURCE"; then[\s\S]*ordinary-completed-stage-admission\.mjs publish[\s\S]*else[\s\S]*protected-private-production-runtime\.mjs/);
  const beforeB = step(source, 'Prove the whole recreated B manifest and installed originals are unchanged');
  assert.ok(source.indexOf(beforeB) < at('private-runtime-publish'), 'Original B proof precedes protected B publication');
  assert.match(beforeB, /ordinary-completed-stage-admission\.mjs before-publish[\s\S]*else[\s\S]*completed-private-runtime-admission\.mjs before-publish/);
  const disposition = step(source, 'Refuse current-family B publication without a completable checkpoint disposition');
  assert.ok(source.indexOf(disposition) < at('private-runtime-publish'), 'Disposition admission precedes B publication');
  assert.match(disposition, /CHECKPOINT_DISPOSITION: \$\{\{ steps\.checkpoint-disposition\.outputs\.disposition \}\}/);
  assert.match(disposition, /assertPrivateRuntimeCheckpointPublicationDisposition\(descriptor, process\.env\.CHECKPOINT_DISPOSITION\)/);
  const main = currentStepById(source, 'private-runtime-write-authority');
  assert.ok(source.indexOf(main) < at('private-runtime-publish'), 'Current main authority precedes B publication');
  assert.match(main, /test "\$GITHUB_REF" = "refs\/heads\/main"/);
  assert.match(main, /test "\$\(git rev-parse HEAD\)" = "\$\(git rev-parse origin\/main\)"/);
  const saved = currentStepById(source, 'pages-repeat-saved-pair');
  assert.match(saved, /if: inputs\.fresh_after_pages_failure == true && steps\.preflight\.outputs\.should_run == 'true'/);
  assert.match(saved, /test "\$\{\{ inputs\.completed_private_runtime \}\}" = false/);
  assert.match(saved, /RAVRADAR_PAGES_REPEAT_ANCHOR: \$\{\{ inputs\.prior_pages_anchor \}\}/);
}


export function assertCurrentCompletedRuntimeWorkflow(actualBuild, actualOnce) {
  assert.equal((actualOnce.match(/^      completed_private_runtime:/gm) ?? []).length, 3,
    'One manual declaration, one checked job output and one actual build forwarding');
  assert(actualOnce.includes('target_hour: ${{ steps.target-selection.outputs.target_hour }}'));
  assert(actualOnce.includes('completed_private_runtime: ${{ steps.target-selection.outputs.completed_private_runtime }}'));
  assert(actualOnce.includes("completed_private_runtime: ${{ needs.current-main-target.outputs.completed_private_runtime == 'true' }}"));
  const cacheLock = step(actualOnce, 'Lock the canonical UTC production hour');
  assert(cacheLock.includes("inputs.checkpoint_target_hour == '' && inputs.completed_private_runtime != true &&"));
  assert(cacheLock.includes("steps.automatic-completed-target.outcome == 'skipped' ||"));
  assert(cacheLock.includes("steps.automatic-completed-target.outputs.completed_private_runtime == 'false'"));
  assert(actualOnce.includes('COMPLETED_RUNTIME_OUTCOME: ${{ needs.build-and-prepare.outputs.completed_runtime_outcome }}'));
  assert(actualBuild.includes('weather_outcome: ${{ steps.weather-route-result.outputs.weather_outcome }}'));
  assert(actualBuild.includes("completed_runtime_outcome: ${{ steps.source-route.outputs.source_saved_pair == 'true' && steps.source-saved-pair-target.outcome || steps.completed-runtime-target.outcome }}"));
  for (const name of providerNames) {
    for (const completed of [false, true])
      assert.equal(evaluateCurrentMode(step(actualBuild, name), completed), !completed,
        name + ': fresh work only in the actual fresh mode');
  }
  for (const name of ['Restore newest compatible private runtime from protected storage',
    'Describe the exact restored private generation',
    'Install only the allowlisted restored private runtime files']) {
    const block = step(actualBuild, name);
    assert(block, name);
    assert.equal(evaluate(selector(block), { ...defaults, completed_private_runtime: true }, {
      'assistant-later-h0-source': { outputs: { required: 'false' } },
    }), true, name);
  }
  assertCurrentModeRelations(actualBuild);
  const target = step(actualBuild, 'Preserve the exact current-grid Pages target before remote upload');
  for (const proof of ['steps.weather-route-result.outputs.full_validation_outcome', 'steps.weather-route-result.outputs.release_gate_outcome',
    'steps.weather-route-result.outputs.checkpoint_save_outcome', 'steps.weather-route-result.outputs.checkpoint_publish_outcome',
    'steps.private-runtime-publish.outcome', 'steps.ravscore-integrated-runtime-audit.outputs.runtime_audit_outcome'])
    assert(target.includes('test "${{ ' + proof + ' }}" = success'), proof);
  assert(target.includes('steps.completed-runtime-target.outcome || steps.weather-route-result.outputs.weather_outcome'));
  const completedTarget = step(actualBuild, 'Refuse completed-runtime target or calibration mismatch before any new S or B publication');
  assert(completedTarget.includes('validate-completed-runtime-target'));
  assert(completedTarget.includes('test "${{ steps.ravscore-integrated-runtime-audit.outputs.runtime_audit_outcome }}" = success'));
  assert.equal(evaluate(selector(step(actualBuild, 'Restore newest compatible private runtime from protected storage')),
    { ...defaults, completed_private_runtime: true }, { 'assistant-later-h0-source': { outputs: { required: 'true' } } }), false,
    'The actual assistant source branch must retain its separate restore exclusion');
  assert(step(actualBuild, 'Prove the whole recreated B manifest and installed originals are unchanged')
    .includes('completed-private-runtime-admission.mjs before-publish'));
  assert.equal(actualBuild.split("      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n").length, 2, 'One full-history checkout on the current ordinary route');
  assert.equal(actualBuild.includes("          fetch-depth: ${{ inputs.completed_private_runtime && '0' || '1' }}"), false, 'The old conditional depth remains historical only');
}

test('current Pages workflow keeps completed-runtime B S gates and provider exclusion on raw callers', async () => {
  const [build, once] = await Promise.all(['../.github/workflows/reusable-weather-build.yml', '../.github/workflows/run-current-weather-once.yml'].map(rawWorkflow));
  assertCurrentCompletedRuntimeWorkflow(build, once);

  const changeStep = (name, original, replacement) => {
    const current = step(build, name);
    assert.ok(current, 'An actual named current step is required: ' + name);
    assert.equal(current.split(original).length, 2, 'One exact mutation operand in ' + name);
    return build.replace(current, () => current.replace(original, replacement));
  };
  const changeOutput = (original, replacement) => {
    assert.equal(build.split(original).length, 2, 'One exact actual output declaration');
    return build.replace(original, replacement);
  };
  const pagesTarget = 'Preserve the exact current-grid Pages target before remote upload';
  const mutations = [
    ['completed-mode provider exclusion', changeStep('Update DMI bulk model cache',
      'inputs.completed_private_runtime != true', 'true')],
    ['restored original installation', changeStep('Install only the allowlisted restored private runtime files',
      'id: private-runtime-install\n', 'id: private-runtime-install\n        if: false\n')],
    ['full validation before Pages target', changeStep(pagesTarget,
      'test "${{ steps.weather-route-result.outputs.full_validation_outcome }}" = success', 'true')],
    ['release gate before Pages target', changeStep(pagesTarget,
      'test "${{ steps.weather-route-result.outputs.release_gate_outcome }}" = success', 'true')],
    ['protected S publication before Pages target', changeStep(pagesTarget,
      'test "${{ steps.weather-route-result.outputs.checkpoint_publish_outcome }}" = success', 'true')],
    ['completed-target runtime audit', changeStep('Refuse completed-runtime target or calibration mismatch before any new S or B publication',
      'test "${{ steps.ravscore-integrated-runtime-audit.outputs.runtime_audit_outcome }}" = success', 'true')],
    ['actual Pages upload identity', changeStep('Current-grid pre-Edge - Upload GitHub Pages artifact',
      'id: current-grid-pages-upload\n', 'id: moved-pages-upload\n')],
    ['authenticated completed outcome', changeOutput(
      "completed_runtime_outcome: ${{ steps.source-route.outputs.source_saved_pair == 'true' && steps.source-saved-pair-target.outcome || steps.completed-runtime-target.outcome }}", 'completed_runtime_outcome: success')],
    ['unchanged installed originals before B publication', changeStep('Prove the whole recreated B manifest and installed originals are unchanged',
      'completed-private-runtime-admission.mjs before-publish', 'true')],
    ['actual fresh weather outcome', changeOutput(
      'weather_outcome: ${{ steps.weather-route-result.outputs.weather_outcome }}', 'weather_outcome: success')],
  ];
  for (const [contract, changed] of mutations) {
    assert.notEqual(changed, build, contract);
    assert.throws(() => assertCurrentCompletedRuntimeWorkflow(changed, once), contract);
  }

});

test('current Pages workflow guards both weather bases before publication', async () => {
  const raw = await rawWorkflow('../.github/workflows/reusable-weather-build.yml');
  assert.match(raw, /      fresh_after_pages_failure:\n        required: false\n        type: boolean\n        default: false\n/);
  assert.match(raw, /      prior_pages_anchor:\n        required: false\n        type: string\n        default: ''\n/);
  const admit = 'node scripts/pages-cancelled-replay-continuity.mjs admit';
  const compare = 'node scripts/pages-cancelled-replay-continuity.mjs compare';
  const savedNoLoss = 'node scripts/check-public-weather-continuity.mjs';
  const privatePublish = '      - name: Publish bounded private runtime with one protected rollback generation';
  const checkpointPublish = '      - name: Publish atomic RavScore checkpoint to protected admin storage';
  const order = [admit, '      - name: Update central weather cache', savedNoLoss, compare, privatePublish, checkpointPublish];
  assert.deepEqual(order.map(marker => raw.indexOf(marker)), order.map(marker => raw.indexOf(marker)).sort((a,b) => a-b));
  for (const marker of order) assert.ok(raw.includes(marker), marker);
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

function coldEvaluate(expression, context) {
  return runInNewContext(expression.replace(/^\$\{\{\s*|\s*\}\}$/g, '')
    .replace(/\b(needs|steps)\.([a-zA-Z0-9_-]+)/g, (_, root, key) => root + '[' + JSON.stringify(key) + ']'),
  { inputs: {}, always: () => true, cancelled: () => false, ...context });
}

test('scheduled weather keeps its fresh hour and uses one exclusive immediate-retry route', async () => {
  const [once, deploy, action, retryCli] = await Promise.all([
    '../.github/workflows/run-current-weather-once.yml',
    '../.github/workflows/reusable-pages-deploy.yml',
    '../.github/actions/deploy-ravradar-pages/action.yml',
    './deploy-ordinary-pages-with-immediate-retry.mjs',
  ].map(relative => fs.readFile(new URL(relative, import.meta.url), 'utf8')));
  const currentMain = coldBlock(once, '  current-main-target:');
  const select = coldStep(currentMain, 'Require one canonical target hour and completed-runtime decision');
  assert.match(currentMain, /id: cache-state[\s\S]*check-copernicus-current-hour\.py/);
  assert.doesNotMatch(select, /success:true\)|completed=true\s*\n\s*target="\$AUTO_TARGET"/);
  assert.match(select, /target="\$\{CHECKPOINT_TARGET:-\$CACHE_TARGET\}"/);
  assert.match(once, /ordinary_immediate_retry: \$\{\{ needs\.current-main-target\.outputs\.ordinary_scheduled == 'true' \}\}/);
  assert.match(deploy, /id: deployment\n        uses: \.\/\.github\/actions\/deploy-ravradar-pages/);
  assert.match(deploy, /id: public-verification[\s\S]*--base-url "\$\{\{ steps\.deployment\.outputs\.page_url \}\}"/);
  assert.match(deploy, /steps\.deployment\.outcome == 'failure' && steps\.deployment\.outputs\.closed_unpublished == 'true'/);
  const standard = coldBlock(action, '    - name: Deploy with the standard Pages action');
  const scheduled = coldBlock(action, '    - name: Deploy ordinary weather with one bounded immediate retry');
  assert.match(standard, /^      uses: actions\/deploy-pages@v5$/m);
  assert.match(standard, /^      if: \$\{\{ inputs\.immediate_retry != 'true' \}\}$/m);
  assert.match(scheduled, /^      if: \$\{\{ inputs\.immediate_retry == 'true' \}\}$/m);
  for (const immediate_retry of ['false', 'true']) {
    const context = { inputs: { immediate_retry } };
    assert.equal(coldEvaluate(scheduled.match(/^      if: (.+)$/m)[1], context), immediate_retry === 'true');
    assert.equal(coldEvaluate(standard.match(/^      if: (.+)$/m)[1], context), immediate_retry !== 'true');
  }
  assert.match(standard, /artifact_name: \$\{\{ inputs\.artifact_name \}\}/);
  assert.match(standard, /token: \$\{\{ inputs\.github_token \}\}/);
  assert.doesNotMatch(standard,/SUPABASE|supabase/);
  assert.match(scheduled,/SUPABASE_URL: \$\{\{ inputs\.supabase_url \}\}/);
  assert.match(scheduled,/SUPABASE_SERVICE_ROLE_KEY: \$\{\{ inputs\.supabase_service_role_key \}\}/);
  assert.match(deploy,/supabase_url: \$\{\{ secrets\.SUPABASE_URL \}\}/);
  assert.match(deploy,/supabase_service_role_key: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  assert.match(action, /run: node scripts\/deploy-ordinary-pages-with-immediate-retry\.mjs/);
  // The actual CLI closure program is behavior-tested in test-ordinary-pages-immediate-retry.
  // This workflow check owns only the output name consumed above.
  assert.match(retryCli, /closed_unpublished=true/);
  assert.match(retryCli, /const first = deliveries\[0\];[\s\S]*!hasSealedPagesRetryEvidence\(first\)/);
  assert.match(retryCli,/readProtectedPagesWriterSnapshot\([\s\S]*expectedSnapshot:writerSnapshot/);
  assert.match(retryCli,/beforeCreate: async intent =>[\s\S]*currentSeal[\s\S]*if \(!await revalidateWriter\(\)\) return false;[\s\S]*fs\.writeFile\(file/);
  assert.doesNotMatch(retryCli,/console\.(?:log|error).*SUPABASE|console\.(?:log|error).*serviceRoleKey/);
});


// Source-variant: rå aktive kaldere. Ingen historisk operand eller byteprojektion.
export function assertCurrentSourceWorkflow(build,once,deploy){
 const byId=id=>currentStepById(build,id);
 const condition=(id,saved,changes={})=>{
  const rows={'operational-model':{outputs:{source_normal_producer:'true'}},
   'source-route':{outputs:{source_saved_pair:saved?'true':'false'}},
   'source-route-profile':{outcome:'success'},preflight:{outputs:{should_run:'true'}},
   'source-saved-pair-admission':{outcome:'success'},'source-saved-pair-target':{outcome:'success'},
   'production-reference-zones':{outcome:'success'},'full-validation':{outcome:'success'},...changes};
  return runInNewContext(selector(byId(id)).replace(/\bsteps\.([a-z][a-z0-9-]*)/g,(_,key)=>'steps['+JSON.stringify(key)+']'),
   {steps:new Proxy(rows,{get(o,key){assert(Object.hasOwn(o,key),'Missing Source fixture operand '+String(key));return o[key];}}),
    always:()=>true});
 };
 assert.match(byId('source-normal'),/uses: \.\/\.github\/actions\/save-owned-dmi-grib/);
 assert.match(byId('source-normal'),/operation: source/);
 assert.equal(condition('source-normal',false),true);assert.equal(condition('source-normal',true),false);
 for(const id of ['source-saved-pair-admission','source-saved-pair-target','source-saved-pair-no-loss']){
  assert.equal(condition(id,true),true,id);assert.equal(condition(id,false),false,id);
 }
 assert.equal(condition('source-saved-pair-admission',true,{preflight:{outputs:{should_run:'false'}}}),false);
 for(const id of ['source-saved-pair-target','source-saved-pair-no-loss','full-validation','release-gate'])
  assert.equal(condition(id,true,{'source-saved-pair-admission':{outcome:'failure'}}),false,id);
 assert.equal(condition('source-saved-pair-no-loss',true,{'source-saved-pair-target':{outcome:'failure'}}),false);
 assert.equal(condition('release-gate',true,{'full-validation':{outcome:'failure'}}),false);
 assert.equal(condition('full-validation',true),true);assert.equal(condition('release-gate',true),true);
 assert.equal(condition('full-validation',false),false);assert.equal(condition('release-gate',false),false);
 for(const [first,second] of [['source-saved-pair-admission','source-saved-pair-target'],
  ['source-saved-pair-target','source-saved-pair-no-loss'],['source-saved-pair-no-loss','full-validation'],
  ['full-validation','release-gate'],['release-gate','source-saved-pair-upload-authority'],
  ['source-saved-pair-upload-authority','pages-artifact-seal'],
  ['pages-artifact-seal','source-saved-pair-artifact-proof'],
  ['source-saved-pair-artifact-proof','source-integrated-publication-pin']])
  assert(build.indexOf(byId(first))<build.indexOf(byId(second)),first+' precedes '+second);
 assert.match(once,/source_saved_pair != 'true' \|\| needs\.build-and-prepare\.outputs\.source_saved_pair_outcome == 'success'/);
 assert.match(once,/ordinary_scheduled: .*recovery_family == 'ordinary'.*recovery_family == 'source'.*selected != 'true'/);
 assert.match(step(deploy,'Deploy to GitHub Pages'),/inputs\.ordinary_immediate_retry && !inputs\.source_saved_pair_readback/);
 assert.match(build,/RAVRADAR_SOURCE_CLOSED_PAGES_PIN: \$\{\{ steps\.source-route\.outputs\.source_closed_pages_pin \}\}/);
 assert.match(build,/SOURCE_CLOSED_PAGES_REQUIRES_INSTALLED_SOURCE/);
 const result=byId('weather-route-result');
 for(const invariant of ['SOURCE_RESULT_NOT_CLOSED','SOURCE_BINDING_ACTION_MISMATCH','SOURCE_OPERATIONAL_OBSERVATION_CHANGED','SOURCE_SAVED_PAIR_REQUIRED_','SAVED_PAIR_READBACK_VERIFIED'])assert(result.includes(invariant));
}
test('current Source workflow preserves fresh saved-pair isolation and actual gate mutations',async()=>{
 const [build,once,deploy]=await Promise.all(['../.github/workflows/reusable-weather-build.yml',
  '../.github/workflows/run-current-weather-once.yml','../.github/workflows/reusable-pages-deploy.yml'].map(rawWorkflow));
 assertCurrentSourceWorkflow(build,once,deploy);
 const changed=(id,from,to)=>{const part=currentStepById(build,id);assert.equal(part.split(from).length,2);return build.replace(part,()=>part.replace(from,to));};
 for(const [id,from,to] of [
  ['source-normal',"steps.source-route.outputs.source_saved_pair != 'true'","true"],
  ['source-saved-pair-admission',"steps.preflight.outputs.should_run == 'true'","true"],
  ['source-saved-pair-target',"steps.source-saved-pair-admission.outcome == 'success'","true"],
  ['source-saved-pair-no-loss',"steps.source-saved-pair-target.outcome == 'success'","true"],
  ['full-validation',"steps.source-saved-pair-admission.outcome == 'success'","true"],
  ['release-gate',"steps.full-validation.outcome == 'success'","true"],
 ])assert.throws(()=>assertCurrentSourceWorkflow(changed(id,from,to),once,deploy),id);
 const deployment=step(deploy,'Deploy to GitHub Pages');
 assert.equal(deployment.split('&& !inputs.source_saved_pair_readback').length,2);
 assert.throws(()=>assertCurrentSourceWorkflow(build,once,deploy.replace(deployment,()=>deployment.replace('&& !inputs.source_saved_pair_readback',''))));
});
