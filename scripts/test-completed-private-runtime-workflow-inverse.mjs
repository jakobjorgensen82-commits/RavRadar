// Test-only source inverse. No native B/S fixture, providers or production calls.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import { inverseCompletedRuntimeWorkflow, inverseOrdinaryFullHistoryCheckout, inversePairedPrivateRuntimePublication, inverseOriginWeatherReadCredentials, assertCurrentHistoryRawRetentionOrder, inverseCurrentHistoryRawRetentionOrder, inverseAssistant582UserAgent } from './lib/completed-private-runtime-workflow-review.mjs';
const sha = source => crypto.createHash('sha256').update(source).digest('hex');
const readActual = async relative => (await fs.readFile(new URL(relative, import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
// Exact private-composition test view: retain every earlier test body/hash.
const readRaw = async relative => {
  const source = await readActual(relative);
  if (relative === '../.github/workflows/reusable-weather-build.yml') {
    assert.equal(sha(source), '5086dcfbcde252d39173fe989ccd22b3f1f84314ca7ef8728d3468aa4b6b65e1', 'Only the whole composed582 RAW caller has this historical view');
    const previous = inverseCurrentHistoryRawRetentionOrder(inverseAssistant582UserAgent(source, 'build'), 'build').replaceAll('RavRadar/4.0.581', 'RavRadar/4.0.582');
    assert.equal(sha(previous), '251f0cd62db0d5ab779283cda14e1723433792baee97ded8815f1f7a69eed0aa');
    return previous;
  }
  if (relative === './lib/completed-private-runtime-workflow-review.mjs') {
    assert.equal(sha(source), '84a0477b5ff3ec88871fa962f236b244466c7044deb12dbde6cd0e85be69b525', 'Only the whole composed reader has this historical view');
    const previous = source.replace("// Exact test-only RAW-retention caller layer. No runtime input or authority changes.\nconst rawRetentionDemand = \"      - name: Plan bounded current history from the actual selected continuation\\n\";\nconst rawRetentionRefresh = \"      - name: Refresh DMI water-source registry\\n\";\nconst rawRetentionGeneration = \"      - name: Prepare strict active DMI donor or resumable candidate\\n\";\nconst rawRetentionLegacy = \"      - name: Bind causal OLD current reconstruction to the materialized saved inputs\\n\";\nconst rawRetentionDmi = \"      - name: Update DMI bulk model cache\\n\";\nconst rawRetentionOldBlock = \"      - name: Plan bounded current history from the actual selected continuation\\n        id: current-history-demand\\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.historical-wave-transition.outputs.required != 'true')\\n        run: node scripts/plan-ravscore-current-history.mjs\\n        env:\\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\\n          RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: ${{ steps.private-runtime-install.outcome == 'success' && 'true' || 'false' }}\\n          RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED: ${{ (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true' && 'true' || 'false' }}\\n\\n\";\nconst rawRetentionBlock = \"      - name: Plan bounded current history from the actual selected continuation\\n        id: current-history-demand\\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.historical-wave-transition.outputs.required != 'true')\\n        run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw\\n        env:\\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\\n          RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: ${{ steps.private-runtime-install.outcome == 'success' && 'true' || 'false' }}\\n          RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED: ${{ (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true' && 'true' || 'false' }}\\n\\n\";\nconst rawRetentionEnv = \"          DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION: ${{ steps.private-runtime-install.outcome == 'success' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && inputs.weather_state_epoch_bootstrap != true && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && steps.historical-wave-transition.outputs.required != 'true' && 'true' || 'false' }}\\n\";\nexport function assertCurrentHistoryRawRetentionOrder(source) {\n  for (const marker of [rawRetentionDemand, rawRetentionRefresh, rawRetentionGeneration,\n    rawRetentionLegacy, rawRetentionDmi])\n    assert.equal(source.split(marker).length, 2, 'One exact RAW-retention workflow step');\n  const start = source.indexOf(rawRetentionDemand);\n  const end = source.indexOf('      - name: ', start + rawRetentionDemand.length);\n  const prepared = source.indexOf(rawRetentionGeneration);\n  assert(end > start, 'The actual demand block has a finite next-step boundary');\n  assert.equal(end, source.indexOf(rawRetentionLegacy), 'Demand immediately precedes legacy binding');\n  assert(prepared < start, 'Actual generation materialization precedes demand');\n  assert.equal(source.indexOf('      - name: ', prepared + rawRetentionGeneration.length), start,\n    'Demand immediately follows actual generation materialization');\n  assert(end < source.indexOf(rawRetentionDmi), 'Demand and legacy binding precede DMI');\n  assert.equal(source.slice(start, end), rawRetentionBlock, 'Only the reviewed planner arg changes');\n  assert.equal(source.split(rawRetentionEnv).length, 2, 'One exact committed-retention requirement');\n  const dmiStart = source.indexOf(rawRetentionDmi);\n  const dmiEnd = source.indexOf('      - name: ', dmiStart + rawRetentionDmi.length);\n  assert(dmiEnd > dmiStart);\n  assert(source.slice(dmiStart, dmiEnd).includes(rawRetentionEnv), 'Retention requirement belongs to DMI');\n  assert.equal(sha(source), '46c88e4cca919ecc288c006db443106b1f8ce8fed1dbca3a87b74d7aea8a3e34', 'The entire current RAW-retention workflow is reviewed');\n}\nexport function inverseCurrentHistoryRawRetentionOrder(source, role) {\n  if (role !== 'build' || sha(source) !== '46c88e4cca919ecc288c006db443106b1f8ce8fed1dbca3a87b74d7aea8a3e34') return source;\n  assertCurrentHistoryRawRetentionOrder(source);\n  let previous = source.replace(rawRetentionEnv, '').replace(rawRetentionBlock, '');\n  previous = previous.replace(rawRetentionRefresh, rawRetentionOldBlock + rawRetentionRefresh);\n  assert.equal(sha(previous), 'fd1cd664bdbdcf41ef2ad32e6ad5caf058a980b3093a3f4fc226ca1797854b49',\n    'Whole preceding workflow survives only the exact demand move, arg and env inverses');\n  return previous;\n}\n", '').replace("  source = inverseCurrentHistoryRawRetentionOrder(source, role);\n", '').replace("  if (role === 'build' && sha(source) === '5086dcfbcde252d39173fe989ccd22b3f1f84314ca7ef8728d3468aa4b6b65e1') {\n    assert.equal(source.split('RavRadar/4.0.582').length, 6, 'Exactly five reviewed582 RAW-caller UA changes');\n    const previous = source.replaceAll('RavRadar/4.0.582', 'RavRadar/4.0.581');\n    assert.equal(sha(previous), '46c88e4cca919ecc288c006db443106b1f8ce8fed1dbca3a87b74d7aea8a3e34',\n      'The WHOLE d8 P0 RAW-retention caller survives only the582 UA inverse');\n    return previous;\n  }\n", '');
    assert.equal(sha(previous), '95f6136fba9e8582040981ec74ca9a5757293d2e27dece90e84c643c89c4c275');
    return previous;
  }
  return source;
};
const read = async relative => {
  const source = await readRaw(relative);
  return relative === '../.github/workflows/reusable-weather-build.yml'
    ? inverseAssistant582UserAgent(source, 'build') : source;
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

test('actual582 UA-only workflow retains the whole581 source and every historical completed oracle', async () => {
  const source = await readRaw('../.github/workflows/reusable-weather-build.yml');
  const currentSha = '251f0cd62db0d5ab779283cda14e1723433792baee97ded8815f1f7a69eed0aa';
  const priorSha = 'fd1cd664bdbdcf41ef2ad32e6ad5caf058a980b3093a3f4fc226ca1797854b49';
  assert.equal(sha(source), currentSha, 'The actual new workflow is not a synthetic replacement');
  assert.equal(source.split('RavRadar/4.0.582').length, 6);
  const previous = inverseAssistant582UserAgent(source, 'build');
  assert.equal(sha(previous), priorSha);
  assert.equal(previous, await read('../.github/workflows/reusable-weather-build.yml'));
  assert.equal(inverseAssistant582UserAgent(previous, 'build'), previous);
  assert.equal(inverseCompletedRuntimeWorkflow(source, 'build'), inverseCompletedRuntimeWorkflow(previous, 'build'));
  assert.equal(sha(inverseCompletedRuntimeWorkflow(source, 'build')), legacySha);
  assert.equal(inverseAssistant582UserAgent(source, 'once'), source);
  assert.throws(() => inverseCompletedRuntimeWorkflow(source, 'once'));
  const count = source.split('RavRadar/4.0.582').length - 1;
  const mutations = [
    ...Array.from({ length: count }, (_, index) => {
      let seen = 0;
      return source.replaceAll('RavRadar/4.0.582', value => seen++ === index ? 'RavRadar/4.0.581' : value);
    }),
    source.replaceAll('RavRadar/4.0.582', 'RavRadar/4.0.583'),
    source.replace('          fetch-depth: 0', '          fetch-depth: 1'),
    source.replace('SUPABASE_URL: ${{ secrets.SUPABASE_URL }}', 'SUPABASE_URL: INVALID'),
    source + '\n# UNREVIEWED582 DRIFT\n',
  ];
  for (const changed of mutations) {
    assert.notEqual(changed, source);
    assert.notEqual(sha(changed), currentSha);
    assert.equal(inverseAssistant582UserAgent(changed, 'build'), changed, 'An unknown whole source cannot enter the582 layer');
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
  const helper = await readRaw('./lib/completed-private-runtime-workflow-review.mjs');
  const begin = helper.indexOf('// Exact test-only582 UA layer;');
  const end = helper.indexOf('export function inverseOriginWeatherReadCredentials(source, role) {', begin);
  assert(begin > 0 && end > begin);
  const withoutNewLayer = (helper.slice(0, begin) + helper.slice(end))
    .replace('  source = inverseAssistant582UserAgent(source, role);\n', '');
  assert.equal(sha(withoutNewLayer), '60c98201e118be2536ad061e0bda162d16d460eb6196ca9d3f9ce5301ebbbc7c',
    'The WHOLE old helper, all guards, offsets and historical assertions survive');
});

{
  // The two unchanged P0 RAW cases see the exact581 d8 source through UA-only inverse.
  const read = async relative => inverseAssistant582UserAgent(await readActual(relative), 'build');

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

}

test('actual582 plus committed RAW caller composes both strict whole inverses without skipping either layer', async () => {
  const source = await readActual('../.github/workflows/reusable-weather-build.yml');
  assert.equal(sha(source), '5086dcfbcde252d39173fe989ccd22b3f1f84314ca7ef8728d3468aa4b6b65e1');
  const p0 = inverseAssistant582UserAgent(source, 'build');
  assert.equal(sha(p0), '46c88e4cca919ecc288c006db443106b1f8ce8fed1dbca3a87b74d7aea8a3e34');
  assertCurrentHistoryRawRetentionOrder(p0);
  assert.equal(sha(inverseCurrentHistoryRawRetentionOrder(p0, 'build')), 'fd1cd664bdbdcf41ef2ad32e6ad5caf058a980b3093a3f4fc226ca1797854b49');
  assert.equal(sha(inverseCompletedRuntimeWorkflow(source, 'build')), legacySha);
  const mutations = [source.replace(' --retain-committed-raw', ''), source.replace('RavRadar/4.0.582', 'RavRadar/4.0.581'), source.replace('DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION:', 'DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION_UNKNOWN:'), source + '\n# UNREVIEWED COMPOSITION DRIFT\n'];
  for (const changed of mutations) {
    assert.notEqual(changed, source);
    assert.equal(inverseAssistant582UserAgent(changed, 'build'), changed);
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'));
  }
});
