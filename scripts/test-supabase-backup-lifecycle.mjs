import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyDatabaseBackupTrigger,requireNoUnresolvedDatabaseCapture,databaseRestoreCommitment,
  databaseReserveReceiptReady,DATABASE_BACKUP_INTERVAL_MS} from './supabase-backup-lifecycle.mjs';
import {runAutonomousDatabaseBackup,runCurrentDatabaseArchiveRestore} from './run-autonomous-supabase-backup.mjs';

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
  assert.equal((await runAutonomousDatabaseBackup({phase:'plan'},dependencies)).action,'restore');
  assert.equal(captures+restores+rotations+receipts,0);
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).action,'restore');
  assert.equal(captures,0);assert.equal(restores,1);assert.equal(receipts,1);
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).action,'rotate');assert.equal(captures,0);
  current.rotationHeld=true;assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).retentionReady,false);
  assert.equal(captures,0);current.rotationHeld=false;
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).status,'DATABASE_BACKUP_WEEKLY_CAPTURE_CREATED_RESTORE_PENDING');
  assert.equal(captures,1);assert.equal(current.restoreVerified,false);
  assert.equal((await runAutonomousDatabaseBackup({phase:'plan'},dependencies)).action,'restore');assert.equal(captures,1);
  current.restoreVerified=true;assert.equal((await runAutonomousDatabaseBackup({phase:'plan'},dependencies)).proceed,false);
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
  assert(workflow.includes("group: ${{ inputs.restore_mode == 'archive' && 'ravradar-isolated-archive-restore' || 'ravradar-synthetic-standard-local-restore' }}"));
  assert(workflow.includes("group: ${{ inputs.restore_mode == 'archive' && 'ravradar-trip-storage-production' || format('ravradar-synthetic-standard-local-restore-{0}', github.run_id) }}"));
  assert(!workflow.includes("'ravradar-weather-production-v2'"));
  assert.match(workflow,/default: synthetic[\s\S]*options: \[synthetic, archive\]/);
  assert.equal((workflow.match(/cancel-in-progress: false/g)??[]).length,2);
  assert(!workflow.includes('persistSupabaseDatabaseRestoreReceipt'));
});
