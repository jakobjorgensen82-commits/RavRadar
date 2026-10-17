// Test-only source inverse. No native B/S fixture, providers or production calls.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import { inverseCompletedRuntimeWorkflow, inverseOrdinaryFullHistoryCheckout, inversePairedPrivateRuntimePublication, inverseOriginWeatherReadCredentials } from './lib/completed-private-runtime-workflow-review.mjs';
const sha = source => crypto.createHash('sha256').update(source).digest('hex');
const read = async relative => (await fs.readFile(new URL(relative, import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
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
