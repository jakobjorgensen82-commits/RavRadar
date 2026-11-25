import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyDatabaseBackupTrigger,requireNoUnresolvedDatabaseCapture,databaseRestoreCommitment,
  databaseReserveReceiptReady,DATABASE_BACKUP_INTERVAL_MS} from './supabase-backup-lifecycle.mjs';
import {databaseBackupWorkflowOutputs,runAutonomousDatabaseBackup,runCurrentDatabaseArchiveRestore} from './run-autonomous-supabase-backup.mjs';

const repo={id:1306858343,full_name:'jakobjorgensen82-commits/RavRadar'},head='a'.repeat(40),index='b'.repeat(64);
const env={GITHUB_REPOSITORY:repo.full_name,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'200',
  GITHUB_SHA:head,EXPECTED_HEAD_SHA:head,GITHUB_WORKFLOW:'Maintain RavRadar admin document history',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_ACTOR:'github-actions[bot]',
  SUPABASE_BACKUP_SOURCE_WEATHER_RUN_ID:'100',SUPABASE_BACKUP_AUTOMATION:'weekly'};
function fixture(){
  const source={id:100,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/run-current-weather-once.yml',
    name:'Run current RavRadar weather once',head_branch:'main',head_sha:head,repository:repo,head_repository:repo,
    status:'completed',conclusion:'success',actor:{login:'github-actions[bot]'},created_at:'2026-11-10T00:19:01Z',updated_at:'2026-11-10T03:08:50Z'};
  const job=name=>({name,run_id:100,head_sha:head,status:'completed',conclusion:'success'});
  const handoff=job('Hand off verified ordinary weather to admin document history');
  handoff.steps=[{name:'Bind document history recipient 200',status:'completed',conclusion:'success'}];
  const list={jobs:[job('Require a verified current-weather deployment'),handoff],total_count:2};
  return {source,list,read:path=>path==='runs/100'?source:list};
}
function report(){return {status:'PASS',scope:'authenticated-archive-isolated-sql-restore',sourceHead:head,cliVersion:'2.117.0',
  archiveIndexCommitmentSha256:databaseRestoreCommitment(index),authenticatedFiveFileSqlExecuted:true,exactSqlBytesStreamed:true,
  isolatedAuthServiceHealthy:true,localRestoredCatalogVerified:true,ownedDockerClosed:true,
  sourceDataParityVerified:true,authRestoreVerified:true,fullDatabaseBackupVerified:true,
  archiveDataParity:{status:'PASS',scope:'AUTHENTICATED_ARCHIVE_CONTENT_AND_DUPLICATES',digest:'c'.repeat(64)},
  productionDatabaseRestoreExecuted:false,productionBackupVerified:false,productionAuthRestoreVerified:false,
  atomicDatabaseSnapshot:false,storageObjectBytesRestored:false,erasureBarriersVerified:false,freeReady:false};}
test('normal direct database handoff binds terminal source, actual recipient and original next weather slot',()=>{
  const f=fixture(),at=time=>verifyDatabaseBackupTrigger(env,{read:f.read,now:()=>Date.parse(time)});
  assert.equal(at('2026-11-10T03:44:00Z').proceed,true);assert.equal(at('2026-11-10T03:44:01Z').proceed,false);
  assert.equal(at('2026-11-10T04:20:00Z').nextWeatherSlot,'2026-11-10T04:19:00.000Z');
  f.list.jobs[1].steps[0].name='Bind document history recipient 201';
  assert.throws(()=>at('2026-11-10T03:10:00Z'),{code:'DATABASE_BACKUP_RECIPIENT'});
});
test('normal database trigger refuses unknown completion, fork, rerun, wrong head and duplicate event routes',()=>{
  for(const change of [s=>{s.head_sha='d'.repeat(40);},s=>{s.run_attempt=2;},s=>{s.conclusion='failure';},
    s=>{s.status='in_progress';},s=>{s.head_repository={...repo,id:1};},s=>{s.path='other.yml';}]){
    const f=fixture();change(f.source);assert.throws(()=>verifyDatabaseBackupTrigger(env,{read:f.read,now:()=>Date.parse('2026-11-10T03:10:00Z')}));
  }
  const f=fixture();f.list.jobs[0].conclusion='skipped';assert.throws(()=>verifyDatabaseBackupTrigger(env,{read:f.read}));
  assert.throws(()=>verifyDatabaseBackupTrigger({...env,GITHUB_EVENT_NAME:'workflow_run'},{read:fixture().read}),{code:'DATABASE_BACKUP_TRIGGER'});
});
test('reserve bridge consumes exact598 content Auth and closure flags without granting production or Free claims',()=>{
  const options={sourceHead:head,indexCommitment:'rr-supabase-restore-v1:'+databaseRestoreCommitment(index)},ready=report();
  assert.equal(databaseReserveReceiptReady(ready,options),true);
  for(const key of ['sourceDataParityVerified','authRestoreVerified','fullDatabaseBackupVerified','ownedDockerClosed'])
    assert.equal(databaseReserveReceiptReady({...ready,[key]:false},options),false);
  for(const key of ['productionDatabaseRestoreExecuted','productionBackupVerified','productionAuthRestoreVerified','atomicDatabaseSnapshot','freeReady'])
    assert.equal(databaseReserveReceiptReady({...ready,[key]:true},options),false);
  assert.equal(databaseReserveReceiptReady({...ready,archiveDataParity:{...ready.archiveDataParity,digest:''}},options),false);
  assert.equal(databaseReserveReceiptReady(ready,{...options,indexCommitment:'rr-supabase-restore-v1:'+'d'.repeat(64)}),false);
});
test('unresolved capture or receipt writer stops a fresh action; authenticated origins and bounded absence alone settle it',()=>{
  const current={completedAt:'2026-11-01T00:00:00.000Z',context:{runId:'90'},restoreRunIds:[]};
  const run={id:150,path:'.github/workflows/maintain-admin-document-history.yml',run_attempt:1,repository:repo,head_repository:repo};
  const data={workflow_runs:[run],total_count:1},step={name:'Capture private Supabase database',status:'completed',conclusion:'cancelled'};
  const read=path=>path.startsWith('workflows/maintain-admin-document-history.yml')?data
    :path.startsWith('workflows/')?{total_count:0,workflow_runs:[]}:{total_count:1,jobs:[{steps:[step]}]};
  for(const name of ['Capture private Supabase database','Restore and seal current private Supabase archive']){
    step.name=name;assert.throws(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}),{code:'DATABASE_BACKUP_CAPTURE_OUTCOME_UNRESOLVED'});
  }
  current.restoreRunIds=['150'];assert.doesNotThrow(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}));
  current.restoreRunIds=[];step.conclusion='skipped';assert.doesNotThrow(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}));
  run.run_attempt=2;assert.throws(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}),{code:'DATABASE_BACKUP_CAPTURE_ATTEMPT_UNKNOWN'});
  data.total_count=2;assert.throws(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}),{code:'DATABASE_BACKUP_CAPTURE_HISTORY_BOUND'});
});
test('a due backup that loses its weather window during setup leaves exact proof of no private access', async () => {
  const source=fixture();
  let clock=Date.parse('2026-11-10T03:44:00Z'), privateCalls=0;
  const current={
    indexSha256:index, remoteIndexAuthenticated:true, restoreVerified:true, rotationPending:false, rotationHeld:false,
    completedAt:new Date(clock-DATABASE_BACKUP_INTERVAL_MS).toISOString(), context:{runId:'90'}, usedBytes:70_000_000,
  };
  const dependencies={
    env, now:()=>clock, readGithub:source.read, requireSettled:()=>{},
    inspectCurrent:async()=>{privateCalls++;return current;},
    runHosted:()=>{privateCalls++;},
  };
  const plan=await runAutonomousDatabaseBackup({phase:'plan'},dependencies);
  assert.equal(plan.action,'capture');
  assert.equal(privateCalls,2);
  clock+=1000;
  const closedPlan=await runAutonomousDatabaseBackup({phase:'plan'},dependencies);
  assert.equal(databaseBackupWorkflowOutputs('plan',closedPlan),'proceed=false\naction=none\nplan_outcome=window-closed\n');
  assert.equal(closedPlan.privateAccessStarted,false);
  const execute=await runAutonomousDatabaseBackup({phase:'execute'},dependencies);
  assert.equal(execute.status,'DATABASE_BACKUP_SKIPPED_ORIGINAL_WEATHER_WINDOW');
  assert.equal(privateCalls,2);
  assert.equal(databaseBackupWorkflowOutputs('execute',execute),'no_private_access=true\n');
  assert.equal(databaseBackupWorkflowOutputs('execute',{...execute,privateAccessStarted:true}),'');
  assert.equal(databaseBackupWorkflowOutputs('execute',{...execute,status:'OTHER'}),'');

  const run={
    id:150, path:'.github/workflows/maintain-admin-document-history.yml', run_attempt:1, repository:repo, head_repository:repo,
    head_branch:'main', head_sha:head, event:'workflow_dispatch', actor:{login:'github-actions[bot]'},
    status:'completed', conclusion:'success',
  };
  const job={
    name:'Maintain one due private database backup after document history', run_id:150, run_attempt:1,
    head_sha:head, status:'completed', conclusion:'success',
    steps:[
      {name:'Capture private Supabase database', number:9, status:'completed', conclusion:'success'},
      {name:'Confirm backup stopped before private access', number:10, status:'completed', conclusion:'success'},
    ],
  };
  const inspect=({run,job})=>requireNoUnresolvedDatabaseCapture(current,{
    env,
    read:path=>path.startsWith('workflows/maintain-admin-document-history.yml')?{total_count:1,workflow_runs:[run]}
      :path.startsWith('workflows/')?{total_count:0,workflow_runs:[]}:{total_count:1,jobs:[job]},
  });
  assert.doesNotThrow(()=>inspect({run,job}));
  for(const alter of [
    ({run})=>{run.actor.login='somebody-else';},
    ({job})=>{job.name='Some other job';},
    ({job})=>{job.run_attempt=2;},
    ({job})=>{job.head_sha='c'.repeat(40);},
    ({job})=>{job.steps.pop();},
    ({job})=>{job.steps.push({...job.steps[1],number:11});},
    ({job})=>{job.steps[1].number=8;},
    ({job})=>{job.steps[1].conclusion='skipped';},
    ({job})=>{job.steps[0].conclusion='failure';},
  ]){
    const invalid=structuredClone({run,job});
    alter(invalid);
    assert.throws(()=>inspect(invalid),{code:'DATABASE_BACKUP_CAPTURE_OUTCOME_UNRESOLVED'});
  }
  const workflow=fs.readFileSync(new URL('../.github/workflows/maintain-admin-document-history.yml',import.meta.url),'utf8');
  assert.match(workflow,/id: backup-execute[\s\S]*--execute[\s\S]*- name: Confirm backup stopped before private access\s+if: steps\.backup-execute\.outputs\.no_private_access == 'true'/);
  assert.match(workflow,/plan_outcome == 'not-due' && 'Database backup plan - current archive not due'[\s\S]*plan_outcome == 'window-closed' && 'Database backup plan - weather window closed before private access'[\s\S]*plan_outcome == 'retention-held' && 'Database backup plan - rotation held'[\s\S]*if: steps\.backup-plan\.outputs\.proceed == 'false'/);
});
test('manual archive execution blocks when unresolved while the same job positively skips capture on a diagnosis', () => {
  const current={completedAt:'2026-11-01T00:00:00.000Z',context:{runId:'90'},restoreRunIds:[]};
  const run={
    id:150, path:'.github/workflows/backup-supabase-database.yml', run_attempt:1, repository:repo, head_repository:repo,
    head_branch:'main', head_sha:head, event:'workflow_dispatch', status:'completed', conclusion:'failure',
  };
  const job={
    name:'supabase-database-backup', run_id:150, run_attempt:1, head_sha:head, status:'completed', conclusion:'failure',
    steps:[
      {name:'Check private bucket before capture-only CLI setup', number:8, status:'completed', conclusion:'success'},
      {name:'Set up the already used pinned Supabase CLI only for capture', number:9, status:'completed', conclusion:'success'},
      {name:'Run only the fixed backup operation', number:10, status:'completed', conclusion:'failure'},
    ],
  };
  const inspect=({run,job})=>requireNoUnresolvedDatabaseCapture(current,{
    env,
    read:path=>path.startsWith('workflows/backup-supabase-database.yml')?{total_count:1,workflow_runs:[run]}
      :path.startsWith('workflows/')?{total_count:0,workflow_runs:[]}:{total_count:1,jobs:[job]},
  });
  const unresolved={code:'DATABASE_BACKUP_CAPTURE_OUTCOME_UNRESOLVED'};
  assert.throws(()=>inspect({run,job}),unresolved);
  job.steps[2].conclusion='success';
  assert.throws(()=>inspect({run,job}),unresolved);
  job.steps[2].conclusion='skipped';
  assert.doesNotThrow(()=>inspect({run,job}));

  job.steps[0].conclusion='skipped';
  job.steps[1].conclusion='skipped';
  job.steps[2].conclusion='success';
  assert.doesNotThrow(()=>inspect({run,job}));
  job.steps[2].conclusion='failure';
  assert.doesNotThrow(()=>inspect({run,job}));
  for(const alter of [
    ({run})=>{run.head_branch='other';},
    ({run})=>{run.conclusion=null;},
    ({run})=>{run.conclusion='unknown';},
    ({job})=>{job.name='Some other job';},
    ({job})=>{job.run_id=149;},
    ({job})=>{job.run_attempt=2;},
    ({job})=>{job.head_sha='c'.repeat(40);},
    ({job})=>{job.conclusion=null;},
    ({job})=>{job.conclusion='unknown';},
    ({job})=>{job.steps.splice(1,1);},
    ({job})=>{job.steps.push({...job.steps[0]});},
    ({job})=>{job.steps[1].number=7;},
    ({job})=>{job.steps[1].conclusion='success';},
    ({job})=>{job.steps[2].conclusion=null;},
  ]){
    const invalid=structuredClone({run,job});
    alter(invalid);
    assert.throws(()=>inspect(invalid),unresolved);
  }
});
test('normal coordinator is disabled before IO, restores before rotation and capture, and never calls a held action complete',async()=>{
  let clock=Date.parse('2026-11-10T03:10:00Z'),captures=0,restores=0,rotations=0,receipts=0,preflights=0;
  const current={indexSha256:index,remoteIndexAuthenticated:true,completedAt:new Date(clock-DATABASE_BACKUP_INTERVAL_MS).toISOString(),
    context:{runId:'90'},restoreVerified:false,rotationPending:true,rotationHeld:false,usedBytes:250_000_000};
  const dependencies={env,now:()=>clock,verifyTrigger:()=>({proceed:true,nextWeatherSlot:new Date(clock+60*60_000).toISOString()}),
    requireSettled:()=>{},inspectCurrent:async()=>current,
    runHosted:({phase})=>{if(phase==='preflight'){preflights++;return {};}
      captures++;current.completedAt=new Date(clock).toISOString();current.restoreVerified=false;
      return {archiveWrittenThisOperation:true,centralLocatorVerified:true};},
    restore:()=>{restores++;return report();},persistRestore:async()=>{receipts++;current.restoreVerified=true;
      return {status:'DATABASE_RESTORE_RECEIPT_DURABLE',receiptWritten:true};},
    rotate:async()=>{rotations++;current.rotationPending=false;return {status:'DATABASE_BACKUP_ONE_GROUP_RETIRED',deletedObjects:6};}};
  const disabled=await runAutonomousDatabaseBackup({phase:'execute'},{...dependencies,env:{...env,SUPABASE_BACKUP_AUTOMATION:''}});
  assert.equal(disabled.proceed,false);assert.equal(preflights,0);
  assert.equal(disabled.backupBucketStock,undefined);
  const restorePlan=await runAutonomousDatabaseBackup({phase:'plan'},dependencies);
  assert.equal(restorePlan.action,'restore');
  assert.equal(databaseBackupWorkflowOutputs('plan',restorePlan),'proceed=true\naction=restore\nplan_outcome=due\n');
  assert.deepEqual(restorePlan.backupBucketStock,{usedBytes:250_000_000,policyLimitBytes:2_000_000_000});
  assert.equal(captures+restores+rotations+receipts,0);
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).action,'restore');
  assert.equal(captures,0);assert.equal(restores,1);assert.equal(receipts,1);
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).action,'rotate');assert.equal(captures,0);
  current.rotationHeld=true;assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).retentionReady,false);
  const heldPlan=await runAutonomousDatabaseBackup({phase:'plan'},dependencies);
  assert.equal(databaseBackupWorkflowOutputs('plan',heldPlan),'proceed=false\naction=none\nplan_outcome=retention-held\n');
  assert.equal(heldPlan.privateAccessStarted,true);
  assert.equal(captures,0);current.rotationHeld=false;
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).status,'DATABASE_BACKUP_WEEKLY_CAPTURE_CREATED_RESTORE_PENDING');
  assert.equal(captures,1);assert.equal(current.restoreVerified,false);
  assert.equal((await runAutonomousDatabaseBackup({phase:'plan'},dependencies)).action,'restore');assert.equal(captures,1);
  current.restoreVerified=true;
  current.usedBytes=195_000_000;
  const afterRotation=await runAutonomousDatabaseBackup({phase:'plan'},dependencies);
  assert.equal(afterRotation.status,'DATABASE_BACKUP_SKIPPED_NOT_DUE');
  assert.equal(afterRotation.proceed,false);
  assert.equal(databaseBackupWorkflowOutputs('plan',afterRotation),'proceed=false\naction=none\nplan_outcome=not-due\n');
  assert.throws(()=>databaseBackupWorkflowOutputs('plan',{...afterRotation,status:'OTHER'}),{code:'DATABASE_BACKUP_PLAN_OUTCOME'});
  assert.deepEqual(afterRotation.backupBucketStock,{usedBytes:195_000_000,policyLimitBytes:2_000_000_000});
  const unknownStock=await runAutonomousDatabaseBackup({phase:'plan'},{
    ...dependencies,inspectCurrent:async()=>({...current,usedBytes:undefined}),
  });
  assert.equal(unknownStock.backupBucketStock,undefined);
  clock+=DATABASE_BACKUP_INTERVAL_MS;current.usedBytes=1_700_000_001;
  await assert.rejects(()=>runAutonomousDatabaseBackup({phase:'execute'},dependencies),{code:'R2_CAPTURE_HEADROOM'});assert.equal(captures,1);
  current.usedBytes=250_000_000;current.rotationPending=true;
  await assert.rejects(()=>runAutonomousDatabaseBackup({phase:'execute'},{...dependencies,rotate:async()=>({status:'DATABASE_BACKUP_ROTATION_RETAINS_ALL_NO_VERIFIED_RESERVE'})}),
    {code:'DATABASE_BACKUP_RETENTION_NOT_SETTLED'});assert.equal(captures,1);
});
test('fixed normal restore child uses the original CLI and excludes unrelated credentials from its environment',()=>{
  const at={...env,RESTORE_ARCHIVE_INDEX_COMMITMENT:'rr-supabase-restore-v1:'+databaseRestoreCommitment(index),
    SUPABASE_SERVICE_ROLE_KEY:'synthetic-master',RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-r2',
    SUPABASE_ACCESS_TOKEN:'must-not-forward',SUPABASE_DB_PASSWORD:'must-not-forward',GITHUB_TOKEN:'must-not-forward',
    TRIP_GATEWAY_SHARED_SECRET:'must-not-forward'};
  let calls=0;
  const execute=(command,args,options)=>{calls++;assert.equal(command,'fixed-node');
    assert.deepEqual(args,['scripts/test-supabase-cli-local-restore.mjs','--run-archive-restore']);
    assert.equal(options.shell,false);assert.equal(options.timeout,23*60_000);assert.equal(options.maxBuffer,65536);
    assert.equal(options.env.SUPABASE_SERVICE_ROLE_KEY,'synthetic-master');
    for(const key of ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','GITHUB_TOKEN','TRIP_GATEWAY_SHARED_SECRET'])assert.equal(options.env[key],undefined);
    return Buffer.from(JSON.stringify(report()));};
  assert.equal(runCurrentDatabaseArchiveRestore(at,{execute,execPath:'fixed-node'}).status,'PASS');assert.equal(calls,1);
  assert.throws(()=>runCurrentDatabaseArchiveRestore(at,{execute:()=>{throw Error('private child output');}}),{code:'DATABASE_BACKUP_ARCHIVE_RESTORE_FAILED'});
});
test('existing maintenance owns the subsequent backup job with original weather authority and no new dispatch',()=>{
  const maintenance=fs.readFileSync(new URL('../.github/workflows/maintain-admin-document-history.yml',import.meta.url),'utf8');
  const weather=fs.readFileSync(new URL('../.github/workflows/run-current-weather-once.yml',import.meta.url),'utf8');
  const manual=fs.readFileSync(new URL('../.github/workflows/backup-supabase-database.yml',import.meta.url),'utf8');
  const restore=fs.readFileSync(new URL('../.github/workflows/verify-supabase-cli-local-restore.yml',import.meta.url),'utf8');
  const begin=maintenance.indexOf('  database-backup-maintenance:');assert(begin>0);
  const job=maintenance.slice(begin),before=maintenance.slice(0,begin);
  assert.match(job,/needs: admin-document-history/);assert.match(job,/needs\.admin-document-history\.result == 'success'/);
  assert.match(job,/github\.event_name == 'workflow_dispatch' && github\.actor == 'github-actions\[bot\]'/);
  assert.match(job,/RAVRADAR_SUPABASE_BACKUP_AUTOMATION == 'weekly'/);
  assert.match(job,/group: ravradar-trip-storage-production\n      cancel-in-progress: false/);
  assert.match(job,/node-version: 24/);assert.match(before,/node-version: 22/);
  assert.match(before,/backup_source_weather_run_id:.*steps\.bot-handoff\.outputs\.proceed == 'true'.*steps\.source-proof\.outputs\.required == 'false'/);
  assert(job.indexOf('Reject missing backup source proof')<job.indexOf('run-autonomous-supabase-backup.mjs --plan'));
  assert.match(job,/SUPABASE_BACKUP_SOURCE_WEATHER_RUN_ID: \$\{\{ needs\.admin-document-history\.outputs\.backup_source_weather_run_id \}\}/);
  assert.equal((job.match(/--plan/g)??[]).length,1);assert.equal((job.match(/--execute/g)??[]).length,1);
  assert(!/gh api --method POST|workflow_run:|schedule:|Bind database backup recipient/.test(job));
  assert(!weather.includes('handoff-supabase-database-backup:'));
  assert(!manual.includes('source_weather_run_id:')&&!manual.includes('run-autonomous-supabase-backup'));
  assert.equal((restore.match(/--run-archive-restore/g)??[]).length,1);
  const archive=restore.slice(restore.indexOf('      - name: Materialize the exact authenticated archive'));
  assert(!restore.includes('persistSupabaseDatabaseRestoreReceipt'),'manual restore remains independent of automation receipts');
  assert(!/SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|GITHUB_TOKEN|upload-artifact/.test(archive));
});

// This manual reader keeps retirement/capture exclusion without owning the
// ordinary weather queue. Autonomous receipt/rotation/capture paths stay locked.
test('manual archive keeps the retention lock and does not acquire the weather queue',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/verify-supabase-cli-local-restore.yml',import.meta.url),'utf8');
  assert(workflow.includes("group: ${{ (inputs.restore_mode == 'archive' || inputs.restore_mode == 'archive-inventory') && 'ravradar-isolated-archive-restore' || 'ravradar-synthetic-standard-local-restore' }}"));
  assert(workflow.includes("group: ${{ (inputs.restore_mode == 'archive' || inputs.restore_mode == 'archive-inventory') && 'ravradar-trip-storage-production' || format('ravradar-synthetic-standard-local-restore-{0}', github.run_id) }}"));
  assert(!workflow.includes("'ravradar-weather-production-v2'"));
  assert.match(workflow,/default: synthetic[\s\S]*options: \[synthetic, archive, archive-inventory\]/);
  assert.equal((workflow.match(/cancel-in-progress: false/g)??[]).length,2);
  assert(!workflow.includes('persistSupabaseDatabaseRestoreReceipt'));
});

test('manual stock inspection only reads on qualified main under the trip storage lock',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/inspect-supabase-database-backup.yml',import.meta.url),'utf8');
  assert.match(workflow,/group: ravradar-trip-storage-production\n      queue: max\n      cancel-in-progress: false/);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main' && github\.run_attempt == 1 && inputs\.expected_head == github\.sha/);
  assert.match(workflow,/permissions:\n  contents: read\n  actions: read\n  pull-requests: read/);
  assert(!/ravradar-weather-production-v2|: write|workflow_run:|schedule:|SUPABASE_DB_PASSWORD|CLOUDFLARE_API_TOKEN|supabase\/setup-cli|upload-artifact/.test(workflow));
  assert.deepEqual([...workflow.matchAll(/\brun: (.+)/g)].map(([,command])=>command),[
    'node scripts/weather-source-gate.mjs check',
    'test "${{ steps.source-proof.outputs.required }}" = false',
    'node scripts/inspect-supabase-database-backup.mjs',
  ]);
  assert(workflow.indexOf('Refuse missing exact source proof before backup credentials')<workflow.indexOf('secrets.SUPABASE_URL'));
});
