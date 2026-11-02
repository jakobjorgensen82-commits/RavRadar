import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const workflow = fs.readFileSync(new URL('../.github/workflows/maintain-admin-document-history.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const controller = fs.readFileSync(new URL('./admin-document-history-maintenance.mjs', import.meta.url), 'utf8');
const start = workflow.indexOf("          node <<'NODE'\n"), end = workflow.indexOf('\n          NODE', start);
assert(start >= 0 && end > start);
const source = workflow.slice(start + "          node <<'NODE'\n".length, end).split('\n').map(line => {
  assert(line.startsWith('          ')); return line.slice(10);
}).join('\n');
const statuses = Object.fromEntries([...source.matchAll(/^  (?:'([^']+)'|([a-z]+)): '([A-Z_]+)',$/gm)]
  .map(match => [match[1] || match[2], match[3]]));
for (const value of Object.values(statuses)) assert(controller.includes("'" + value + "'"), 'Every receipt status comes from the unchanged real V2 controller');
function execute(overrides = {}, fault = {}) {
  const calls = [], bucketCalls = [], gitCalls = [], log = [], errors = [], made = [];
  const env = {GITHUB_EVENT_NAME:'workflow_dispatch', GITHUB_REF:'refs/heads/main', GITHUB_RUN_ATTEMPT:'1',
    GITHUB_REPOSITORY:'jakobjorgensen82-commits/RavRadar', GITHUB_WORKFLOW:'Maintain RavRadar admin document history',
    GITHUB_SHA:'a'.repeat(40), EXPECTED_HEAD_SHA:'a'.repeat(40), RUNNER_TEMP:'/runner/temp', PATH:'/normal/bin',
    DOCUMENT_HISTORY_OPERATION:'plan', DOCUMENT_HISTORY_CONFIRMATION:'', DOCUMENT_HISTORY_INDEX_SHA:'',
    DOCUMENT_HISTORY_PRUNE_LIMIT:'25',
    SUPABASE_URL:'https://afqhhdrkjfjtpadntdzo.supabase.co', SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-role',
    SUPABASE_ACCESS_TOKEN:'synthetic-management-token', RAVRADAR_R2_ACCOUNT_ID:'b'.repeat(32),
    RAVRADAR_R2_ACCESS_KEY_ID:'synthetic-access-key', RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-secret-key',
    GITHUB_TOKEN:'synthetic-source-token-never-controller', CLOUDFLARE_API_TOKEN:'synthetic-unrelated-token',
    TRIP_GATEWAY_SHARED_SECRET:'synthetic-unrelated-secret', ...overrides};
  const proc = {env, execPath:'/normal/node', exitCode:0};
  const child = {execFileSync(command, args, options) {
    assert.equal(options.stdio.join(','), 'ignore,pipe,pipe'); assert(options.timeout > 0 && options.timeout <= 1200000);
    if (command === 'git') { gitCalls.push({args, env:options.env});
      if (args[0] === 'fetch') return Buffer.from('');
      return Buffer.from((fault.changedAfterPlan && calls.length ? 'c'.repeat(40) : env.GITHUB_SHA) + '\n'); }
    assert.equal(command, proc.execPath);
    if (args[0] === 'scripts/provision-admin-document-history-bucket.mjs') {
      const mode = args[1].slice(2); bucketCalls.push({mode,args,env:options.env});
      if (fault.bucketFailure) {const error = new Error('raw-private-bucket-error-never-log');
        error.stderr = Buffer.from(JSON.stringify({status:'FAILED_CLOSED',code:'R2_BUCKET_API_DENIED',httpStatus:403}));throw error;}
      return Buffer.from(JSON.stringify({status:fault.bucketAbsent?'PRIVATE_EU_BUCKET_ABSENT':mode==='create'?'PRIVATE_EU_BUCKET_CREATED_VERIFIED':'PRIVATE_EU_BUCKET_VERIFIED',
        bucket:'ravradar-admin-history-archive',jurisdiction:'eu',managedPublicEnabled:false,customDomainCount:0,objectsUploaded:false,settingsChanged:false}));
    }
    assert.equal(args[0], 'scripts/admin-document-history-maintenance.mjs');
    const mode = args[1].slice(2); calls.push({mode, args, env:options.env});
    if (fault.failMode === mode) {const error = new Error('never log raw child material');
      if (fault.typedCode) error.stderr = Buffer.from(JSON.stringify({status:'FAILED_CLOSED', code:fault.typedCode, operation:{private:'not printed'}}));
      throw error;}
    return Buffer.from(JSON.stringify({mode, status:statuses[mode], currentDocumentsWritten:false,
      protectedOtherKeysWritten:false, archiveObjectsDeleted:false}));
  }};
  vm.runInNewContext(source, {require(name) {
    if (name === 'node:fs') return {mkdtempSync(prefix) {made.push(prefix); return prefix+'owned';}, chmodSync(file,mode) {assert.equal(mode,0o700);}};
    if (name === 'node:path') return path.posix;
    if (name === 'node:child_process') return child;
    throw Error('Unexpected import '+name);
  }, process:proc, console:{log(value) {log.push(JSON.parse(value));}, error(value) {errors.push(JSON.parse(value));}}, Date, Buffer}, {timeout:1000});
  return {calls,bucketCalls,gitCalls,log,errors,made,exitCode:proc.exitCode};
}

test('document history workflow: exact existing weather then trip locks, readonly default and isolated authority', () => {
  assert.match(workflow,/on:\n  workflow_dispatch:/); assert(!workflow.includes('  schedule:'));
  assert.match(workflow,/default: plan\n        options: \[plan, archive, publish-locator, discover, restore, prune, bucket-readonly, bucket-create\]/);
  const outer=workflow.slice(workflow.indexOf('concurrency:'),workflow.indexOf('jobs:'));
  assert.match(outer,/group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false/);
  assert.match(workflow,/admin-document-history:\n    concurrency:\n      group: ravradar-trip-storage-production\n      cancel-in-progress: false/);
  assert.equal((workflow.match(/cancel-in-progress: false/g)||[]).length,2);
  assert.match(workflow,/timeout-minutes: 25/); assert.match(source,/const deadline = Date\.now\(\) \+ 20 \* 60 \* 1000/);
  assert.match(workflow,/prune_limit:\n[^\n]+\n        type: choice\n        default: '25'\n        options: \['25', '100', '600'\]/);
  assert.match(workflow,/DOCUMENT_HISTORY_PRUNE_LIMIT: \$\{\{ inputs\.prune_limit \}\}/);
  assert.match(workflow,/fetch-depth: 0/);
  assert.match(workflow,/contents: read\n  actions: read\n  pull-requests: read/);
  assert.match(workflow,/run: node scripts\/weather-source-gate.mjs check\n        env:\n          GITHUB_TOKEN: \$\{\{ github.token \}\}/);
  assert.match(workflow,/run: test "\$\{\{ steps.source-proof.outputs.required \}\}" = false/);
  assert(workflow.indexOf('Reject missing source proof') < workflow.indexOf('Run only the fixed document-history operation'));
  for(const secret of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ACCESS_TOKEN','RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY'])
    assert(workflow.includes(secret+': ${{ secrets.'+secret+' }}'));
  assert(!/wrangler|deploy-private-trip-study|publish-private-trip-weather-study|allow_00[4-7]|upload-artifact|continue-on-error|monitor-trip-storage/.test(workflow));
  const result=execute(); assert.equal(result.exitCode,0); assert.deepEqual(result.calls.map(row=>row.mode),['plan']);
  assert.deepEqual(result.log[0].completed,['plan']); assert.equal(result.log[0].fullDatabaseBackupVerified,false); assert.equal(result.log[0].freeReady,false);
});

test('document history workflow: fixed archive and publish prerequisites stay in one owned runner without automatic prune', () => {
  for (const [operation,confirmation,expected] of [['archive','',['plan','archive']],
    ['publish-locator','PUBLISH-PRIVATE-ADMIN-HISTORY-LOCATOR',['plan','archive','publish-locator']]]) {
    const result=execute({DOCUMENT_HISTORY_OPERATION:operation,DOCUMENT_HISTORY_CONFIRMATION:confirmation});
    assert.equal(result.exitCode,0); assert.deepEqual(result.calls.map(row=>row.mode),expected);
    assert.equal(result.made.length,1); assert(result.calls.every(row=>row.args[row.args.indexOf('--workdir')+1]==='/runner/temp/rr-admin-document-history-owned'));
    assert(!result.calls.some(row=>row.mode==='prune'));
  }
});

test('document history workflow: discover restore and bounded prune use only their real V2 arguments', () => {
  for (const operation of ['discover','restore','prune']) {
    const overrides={DOCUMENT_HISTORY_OPERATION:operation};
    if(operation==='prune')overrides.DOCUMENT_HISTORY_CONFIRMATION='PRUNE-EXACT-THREE-DOCUMENT-HISTORY';
    else overrides.DOCUMENT_HISTORY_INDEX_SHA='d'.repeat(64);
    const result=execute(overrides);assert.equal(result.exitCode,0);assert.equal(result.calls.length,1);
    const args=result.calls[0].args;
    if(operation==='prune'){assert.deepEqual(Array.from(args.slice(-4)),['--confirm','PRUNE-EXACT-THREE-DOCUMENT-HISTORY','--limit','25']);assert(!args.includes('--index-sha'));}
    else assert.deepEqual(Array.from(args.slice(-2)),['--index-sha','d'.repeat(64)]);
  }
  for (const limit of ['25','100','600']) {
    const result=execute({DOCUMENT_HISTORY_OPERATION:'prune',DOCUMENT_HISTORY_CONFIRMATION:'PRUNE-EXACT-THREE-DOCUMENT-HISTORY',DOCUMENT_HISTORY_PRUNE_LIMIT:limit});
    assert.equal(result.exitCode,0); assert.equal(result.calls.length,1);
    assert.deepEqual(Array.from(result.calls[0].args.slice(-2)),['--limit',limit]);
  }
});

test('document history workflow: invalid scope and confirmations refuse before private child IO', () => {
  for(const changed of [{GITHUB_REF:'refs/heads/topic'},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_EVENT_NAME:'schedule'},
    {GITHUB_REPOSITORY:'foreign/repository'},{GITHUB_WORKFLOW:'Private RavRadar trip weather study'},
    {EXPECTED_HEAD_SHA:'b'.repeat(40)},{DOCUMENT_HISTORY_OPERATION:'archive; curl forged.invalid'},
    {DOCUMENT_HISTORY_OPERATION:'publish-locator'},{DOCUMENT_HISTORY_OPERATION:'prune'},
    {DOCUMENT_HISTORY_CONFIRMATION:'unexpected'}, {DOCUMENT_HISTORY_OPERATION:'archive',DOCUMENT_HISTORY_INDEX_SHA:'d'.repeat(64)},
    {DOCUMENT_HISTORY_OPERATION:'restore',DOCUMENT_HISTORY_INDEX_SHA:'not-a-sha'},
    {DOCUMENT_HISTORY_PRUNE_LIMIT:'26'}, {DOCUMENT_HISTORY_PRUNE_LIMIT:''}, {DOCUMENT_HISTORY_PRUNE_LIMIT:undefined},
    {DOCUMENT_HISTORY_OPERATION:'prune',DOCUMENT_HISTORY_CONFIRMATION:'PRUNE-EXACT-THREE-DOCUMENT-HISTORY',DOCUMENT_HISTORY_PRUNE_LIMIT:'601'},
    {DOCUMENT_HISTORY_OPERATION:'prune',DOCUMENT_HISTORY_CONFIRMATION:'PRUNE-EXACT-THREE-DOCUMENT-HISTORY',DOCUMENT_HISTORY_PRUNE_LIMIT:'600.0'},
    {DOCUMENT_HISTORY_OPERATION:'archive',DOCUMENT_HISTORY_PRUNE_LIMIT:'600'},
    {DOCUMENT_HISTORY_OPERATION:'publish-locator',DOCUMENT_HISTORY_CONFIRMATION:'PUBLISH-PRIVATE-ADMIN-HISTORY-LOCATOR',DOCUMENT_HISTORY_PRUNE_LIMIT:'100'},
    {DOCUMENT_HISTORY_OPERATION:'discover',DOCUMENT_HISTORY_PRUNE_LIMIT:'600'},
    {DOCUMENT_HISTORY_OPERATION:'restore',DOCUMENT_HISTORY_PRUNE_LIMIT:'600'}]){
    const result=execute(changed);assert.equal(result.exitCode,1);assert.equal(result.calls.length,0);assert.equal(result.made.length,0);
  }
});

test('document history workflow: every phase rechecks main and only exact controller credentials pass', () => {
  const valid=execute({DOCUMENT_HISTORY_OPERATION:'publish-locator',DOCUMENT_HISTORY_CONFIRMATION:'PUBLISH-PRIVATE-ADMIN-HISTORY-LOCATOR'});
  assert.equal(valid.gitCalls.filter(row=>row.args[0]==='fetch').length,6);
  for(const row of valid.gitCalls)for(const key of ['GITHUB_TOKEN','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ACCESS_TOKEN','RAVRADAR_R2_SECRET_ACCESS_KEY'])assert(!(key in row.env));
  for(const row of valid.calls)for(const key of ['GITHUB_TOKEN','CLOUDFLARE_API_TOKEN','TRIP_GATEWAY_SHARED_SECRET'])assert(!(key in row.env));
  const drift=execute({DOCUMENT_HISTORY_OPERATION:'archive'}, {changedAfterPlan:true});
  assert.equal(drift.exitCode,1);assert.deepEqual(drift.calls.map(row=>row.mode),['plan']);assert.equal(drift.errors[0].code,'DOCUMENT_HISTORY_MAIN_CHANGED');
});

test('document history workflow: typed failures and unknown writes stop without replay or raw error disclosure', () => {
  for(const typedCode of [null,'WRITE_OUTCOME_UNKNOWN','ROW_PAYLOAD_CHANGED']){
    const result=execute({DOCUMENT_HISTORY_OPERATION:'publish-locator',DOCUMENT_HISTORY_CONFIRMATION:'PUBLISH-PRIVATE-ADMIN-HISTORY-LOCATOR'},
      {failMode:'archive',typedCode});
    assert.equal(result.exitCode,1);assert.deepEqual(result.calls.map(row=>row.mode),['plan','archive']);
    assert.equal(result.errors[0].phase,'archive');assert.equal(result.errors[0].code,typedCode||'WRITE_OUTCOME_UNKNOWN');
    assert(!JSON.stringify(result.errors).includes('private'));assert(!JSON.stringify(result.errors).includes('never log'));
  }
});


test('document history workflow: fixed bucket modes are separate and never run archive/DB controller',()=>{
  const readonly=execute({DOCUMENT_HISTORY_OPERATION:'bucket-readonly'},{bucketAbsent:true});
  assert.equal(readonly.exitCode,0);assert.equal(readonly.calls.length,0);assert.deepEqual(readonly.bucketCalls.map(x=>x.mode),['read-only']);
  const created=execute({DOCUMENT_HISTORY_OPERATION:'bucket-create',DOCUMENT_HISTORY_CONFIRMATION:'CREATE-PRIVATE-EU-ADMIN-HISTORY-BUCKET'});
  assert.equal(created.exitCode,0);assert.equal(created.calls.length,0);assert.deepEqual(Array.from(created.bucketCalls[0].args.slice(-2)),['--confirm','CREATE-PRIVATE-EU-ADMIN-HISTORY-BUCKET']);
  for(const changed of [{DOCUMENT_HISTORY_OPERATION:'bucket-create'},
    {DOCUMENT_HISTORY_OPERATION:'bucket-readonly',DOCUMENT_HISTORY_CONFIRMATION:'CREATE-PRIVATE-EU-ADMIN-HISTORY-BUCKET'},
    {DOCUMENT_HISTORY_OPERATION:'bucket-create',DOCUMENT_HISTORY_CONFIRMATION:'CREATE-PRIVATE-EU-ADMIN-HISTORY-BUCKET',DOCUMENT_HISTORY_PRUNE_LIMIT:'600'},
    {DOCUMENT_HISTORY_OPERATION:'bucket-create',DOCUMENT_HISTORY_CONFIRMATION:'CREATE-PRIVATE-EU-ADMIN-HISTORY-BUCKET',DOCUMENT_HISTORY_INDEX_SHA:'d'.repeat(64)}]){
    const r=execute(changed);assert.equal(r.exitCode,1);assert.equal(r.calls.length,0);assert.equal(r.bucketCalls.length,0);
  }
});
test('document history workflow: fresh private metadata dominates archive/publish/prune,403 stops before upload',()=>{
  const valid=execute({DOCUMENT_HISTORY_OPERATION:'publish-locator',DOCUMENT_HISTORY_CONFIRMATION:'PUBLISH-PRIVATE-ADMIN-HISTORY-LOCATOR'});
  assert.equal(valid.exitCode,0);assert.equal(valid.bucketCalls.length,2);
  for(const b of valid.bucketCalls){assert.equal(b.mode,'read-only');assert.equal(b.env.CLOUDFLARE_API_TOKEN,'synthetic-unrelated-token');
    for(const key of ['GITHUB_TOKEN','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ACCESS_TOKEN','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY','TRIP_GATEWAY_SHARED_SECRET'])assert(!(key in b.env));}
  for(const operation of ['archive','publish-locator','prune']){
    const confirmation=operation==='prune'?'PRUNE-EXACT-THREE-DOCUMENT-HISTORY':operation==='publish-locator'?'PUBLISH-PRIVATE-ADMIN-HISTORY-LOCATOR':'';
    for(const fault of [{bucketFailure:true},{bucketAbsent:true}]){
      const r=execute({DOCUMENT_HISTORY_OPERATION:operation,DOCUMENT_HISTORY_CONFIRMATION:confirmation},fault);
      assert.equal(r.exitCode,1);assert.equal(r.calls.filter(x=>x.mode!=='plan').length,0);assert.equal(r.bucketCalls.length,1);
      if(fault.bucketFailure){assert.equal(r.errors[0].code,'R2_BUCKET_API_DENIED');assert.equal(r.errors[0].httpStatus,403);}
      assert(!JSON.stringify(r.errors).includes('raw-private'));
    }
  }
});
// One existing normal source entry owns both the fixed workflow and the new management helper tests.
import './test-admin-document-history-bucket.mjs';
