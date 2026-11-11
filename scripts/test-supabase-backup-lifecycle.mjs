import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {verifyDatabaseBackupTrigger,verifyDatabaseBackupReserve,requireNoUnresolvedDatabaseCapture,
  databaseRestoreCommitment,databaseReserveReceiptReady,DATABASE_BACKUP_INTERVAL_MS,backupGithubReader,
  confirmDatabaseBackupMain} from './supabase-backup-lifecycle.mjs';
import {runAutonomousDatabaseBackup} from './run-autonomous-supabase-backup.mjs';
const repo={id:1306858343,full_name:'jakobjorgensen82-commits/RavRadar'},head='a'.repeat(40);
const env={GITHUB_REPOSITORY:repo.full_name,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'200',GITHUB_SHA:head,
  EXPECTED_HEAD_SHA:head,GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_ACTOR:'github-actions[bot]',
  SUPABASE_BACKUP_SOURCE_WEATHER_RUN_ID:'100',SUPABASE_BACKUP_AUTOMATION:'weekly'};
function fixture(){
  const source={id:100,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/run-current-weather-once.yml',
    name:'Run current RavRadar weather once',head_branch:'main',head_sha:head,repository:repo,head_repository:repo,
    status:'completed',conclusion:'success',actor:{login:'github-actions[bot]'},created_at:'2026-11-10T00:19:01Z',updated_at:'2026-11-10T03:08:50Z'};
  const job=name=>({name,run_id:100,head_sha:head,status:'completed',conclusion:'success'});
  const handoff=job('Hand off verified ordinary weather to database backup');
  handoff.steps=[{name:'Bind database backup recipient 200',status:'completed',conclusion:'success'}];
  const list={jobs:[job('Require a verified current-weather deployment'),handoff],total_count:2};
  const reads=[];return {source,list,reads,read:path=>{reads.push(path);return path==='runs/100'?source:list;}};
}
test('normal database handoff binds live terminal proof, exact bot recipient and original next slot after both queues',()=>{
  const f=fixture();const at=time=>verifyDatabaseBackupTrigger(env,{read:f.read,now:()=>Date.parse(time)});
  assert.equal(at('2026-11-10T03:44:00Z').proceed,true);
  assert.equal(at('2026-11-10T03:44:01Z').proceed,false);
  const expired=at('2026-11-10T04:20:00Z');assert.equal(expired.proceed,false);
  assert.equal(expired.nextWeatherSlot,'2026-11-10T04:19:00.000Z');
  assert(f.reads.every(path=>path.startsWith('runs/100')));
  f.list.jobs[1].steps[0].name='Bind database backup recipient 201';
  assert.throws(()=>at('2026-11-10T03:10:00Z'),{code:'DATABASE_BACKUP_RECIPIENT'});
});
test('normal database trigger rejects other source, rerun, fork, unknown completion and missing public terminal evidence',()=>{
  for(const change of [s=>{s.head_sha='b'.repeat(40);},s=>{s.run_attempt=2;},s=>{s.conclusion='failure';},
    s=>{s.status='in_progress';},s=>{s.head_repository={...repo,id:1};},s=>{s.path='other.yml';}]){
    const f=fixture();change(f.source);assert.throws(()=>verifyDatabaseBackupTrigger(env,{read:f.read,now:()=>Date.parse('2026-11-10T03:10:00Z')}));
  }
  const f=fixture();f.list.jobs[0].conclusion='skipped';
  assert.throws(()=>verifyDatabaseBackupTrigger(env,{read:f.read,now:()=>Date.parse('2026-11-10T03:10:00Z')}));
});
test('owner workflow_run and direct bot route converge, while a bot workflow_run cannot double-trigger',()=>{
  const f=fixture(),now=()=>Date.parse('2026-11-10T03:10:00Z');
  assert.throws(()=>verifyDatabaseBackupTrigger({...env,GITHUB_EVENT_NAME:'workflow_run'},{read:f.read,now}),{code:'DATABASE_BACKUP_OWNER_ROUTE'});
  f.source.actor.login='owner';f.list.jobs.pop();f.list.total_count=1;
  assert.equal(verifyDatabaseBackupTrigger({...env,GITHUB_EVENT_NAME:'workflow_run'},{read:f.read,now}).proceed,true);
});
test('reserve proof requires the actual committed recovery marker; SQL/Auth-service PASS alone cannot authorize retirement',()=>{
  const index='b'.repeat(64),commitment='rr-supabase-restore-v1:'+databaseRestoreCommitment(index),run={
    id:300,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/verify-supabase-cli-local-restore.yml',
    name:'Verify standard Supabase CLI local restore',head_branch:'main',head_sha:head,repository:repo,head_repository:repo,
    status:'completed',conclusion:'success'};
  const job={name:'standard-local-restore',run_id:300,head_sha:head,status:'completed',conclusion:'success',steps:[]};
  const read=path=>path==='runs/300'?run:{total_count:1,jobs:[job]};
  assert.throws(()=>verifyDatabaseBackupReserve({indexSha256:index,restoreRunId:'300'},{read}),{code:'DATABASE_BACKUP_RESERVE_NOT_RECOVERY_VERIFIED'});
  job.steps=[{name:'Bind verified database reserve '+commitment,status:'completed',conclusion:'success'}];
  assert.equal(verifyDatabaseBackupReserve({indexSha256:index,restoreRunId:'300'},{read}).indexSha256,index);
  assert.throws(()=>verifyDatabaseBackupReserve({indexSha256:'c'.repeat(64),restoreRunId:'300'},{read}));
});
test('normal reserve receipt bridge preserves every existing false field and requires closed Docker, Auth and restored data parity',()=>{
  const indexCommitment='rr-supabase-restore-v1:'+'c'.repeat(64),options={sourceHead:head,indexCommitment};
  const report={status:'PASS',scope:'authenticated-archive-isolated-sql-restore',sourceHead:head,
    archiveIndexCommitmentSha256:'c'.repeat(64),authenticatedFiveFileSqlExecuted:true,exactSqlBytesStreamed:true,
    isolatedAuthServiceHealthy:true,localRestoredCatalogVerified:true,ownedDockerClosed:true,
    sourceDataParityVerified:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,productionDatabaseRestoreExecuted:false,
    authenticatedExportDataParityVerified:false,authenticatedSequenceStateVerified:false,
    isolatedFreshAuthPasswordLoginVerified:false,originalAuthRowsPreservedDuringProbe:false};
  assert.equal(databaseReserveReceiptReady(report,options),false);
  const complete={...report,authenticatedExportDataParityVerified:true,authenticatedSequenceStateVerified:true,
    isolatedFreshAuthPasswordLoginVerified:true,originalAuthRowsPreservedDuringProbe:true};
  assert.equal(databaseReserveReceiptReady(complete,options),true);
  for(const key of ['authenticatedExportDataParityVerified','authenticatedSequenceStateVerified',
    'isolatedFreshAuthPasswordLoginVerified','originalAuthRowsPreservedDuringProbe','ownedDockerClosed'])
    assert.equal(databaseReserveReceiptReady({...complete,[key]:false},options),false);
  assert.equal(databaseReserveReceiptReady({...report,fullDatabaseBackupVerified:true,authRestoreVerified:true},options),false);
  assert.equal(databaseReserveReceiptReady(complete,{...options,indexCommitment:'rr-supabase-restore-v1:'+'d'.repeat(64)}),false);
});
test('unresolved capture, cancelled step, rerun and incomplete history stop a new capture without a private write',()=>{
  const current={completedAt:'2026-11-01T00:00:00.000Z',context:{runId:'90'}};
  const run={id:150,path:'.github/workflows/backup-supabase-database.yml',run_attempt:1,repository:repo,head_repository:repo};
  const data={workflow_runs:[run],total_count:1};
  const job={steps:[{name:'Capture private Supabase database',status:'completed',conclusion:'cancelled'}]};
  const read=path=>path.startsWith('workflows/')?data:{total_count:1,jobs:[job]};
  assert.throws(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}),{code:'DATABASE_BACKUP_CAPTURE_OUTCOME_UNRESOLVED'});
  job.steps[0].conclusion='skipped';assert.doesNotThrow(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}));
  run.run_attempt=2;assert.throws(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}),{code:'DATABASE_BACKUP_CAPTURE_ATTEMPT_UNKNOWN'});
  data.total_count=2;assert.throws(()=>requireNoUnresolvedDatabaseCapture(current,{env,read}),{code:'DATABASE_BACKUP_CAPTURE_HISTORY_BOUND'});
});
test('weekly normal caller repeats admission after setup, deduplicates on authenticated current and never rotates after unknown capture',async()=>{
  let clock=Date.parse('2026-11-10T03:10:00Z'),capturedAt=clock-DATABASE_BACKUP_INTERVAL_MS,captures=0,rotations=0,preflights=0;
  const dependencies={env,now:()=>clock,verifyTrigger:()=>({proceed:true}),requireSettled:()=>{},
    inspectCurrent:async()=>({completedAt:new Date(capturedAt).toISOString(),context:{runId:'90'}}),
    runHosted:({phase})=>{if(phase==='preflight'){preflights++;return {};}captures++;capturedAt=clock;
      return {archiveWrittenThisOperation:true,centralLocatorVerified:true};},
    rotate:async()=>{rotations++;return {status:'RETAINED',deletedObjects:0};}};
  assert.equal((await runAutonomousDatabaseBackup({phase:'plan'},dependencies)).proceed,true);
  assert.equal(captures,0);assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).status,'DATABASE_BACKUP_WEEKLY_CAPTURE_COMPLETE');
  assert.equal(captures,1);assert.equal(rotations,0);
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},dependencies)).proceed,false);assert.equal(captures,1);
  clock+=DATABASE_BACKUP_INTERVAL_MS;
  await assert.rejects(()=>runAutonomousDatabaseBackup({phase:'execute'},{...dependencies,runHosted:({phase})=>{
    if(phase==='execute')throw Object.assign(new Error('unknown'),{code:'DB_BACKUP_WRITE_OUTCOME_UNKNOWN'});return {};}}));
  assert.equal(rotations,0);assert.equal(preflights,3);
});
test('automatic workflow and direct hook use the existing weather-first queues, source proof, one dispatch and fixed weekly caller',()=>{
  const backup=fs.readFileSync(new URL('../.github/workflows/backup-supabase-database.yml',import.meta.url),'utf8');
  const weather=fs.readFileSync(new URL('../.github/workflows/run-current-weather-once.yml',import.meta.url),'utf8');
  assert.match(backup,/workflow_run:/);assert.match(backup,/RAVRADAR_SUPABASE_BACKUP_AUTOMATION == 'weekly'/);
  assert.match(backup,/SUPABASE_BACKUP_RESERVE_INDEX_COMMITMENT/);assert(!backup.includes('RESERVE_INDEX_SHA'));
  assert(backup.indexOf('Reject missing source proof')<backup.indexOf('Plan one weekly capture'));
  assert.match(backup,/group: ravradar-weather-production-v2/);assert.match(backup,/group: ravradar-trip-storage-production/);
  const hook=weather.slice(weather.indexOf('  handoff-supabase-database-backup:'),weather.indexOf('  notify-owner-failure:'));
  assert.equal((hook.match(/gh api --method POST/g)??[]).length,1);assert.match(hook,/Bind database backup recipient/);
  assert.match(hook,/needs\.terminal-outcome.result == 'success'/);assert.match(hook,/completed_private_runtime == 'false'/);
  assert(!/rerun|sleep|retry|weather-once.yml\/dispatches/.test(hook));
});
test('GitHub proof reads receive only their own token, fixed origin and bounded GET; typed errors never expose child diagnostics',()=>{
  const calls=[],read=backupGithubReader({...env,GITHUB_TOKEN:'synthetic-gh',SUPABASE_SERVICE_ROLE_KEY:'private-never-forwarded'},(...args)=>{
    calls.push(args);return Buffer.from('{"ok":true}');});
  assert.deepEqual(read('runs/100'),{ok:true});const [,args,options]=calls[0];
  assert(args.includes('GET'));assert.equal(options.env.SUPABASE_SERVICE_ROLE_KEY,undefined);assert.equal(options.env.GH_TOKEN,'synthetic-gh');
  assert.equal(options.timeout,10000);assert.equal(options.shell,false);
});
test('retirement reconfirms actual main with clean Git credentials and rejects drift before any exact deletion',()=>{
  const calls=[],execute=(command,args,options)=>{
    calls.push({command,args,options});return Buffer.from(args[0]==='rev-parse'?head:'');};
  confirmDatabaseBackupMain({...env,GITHUB_TOKEN:'synthetic-gh',SUPABASE_DB_PASSWORD:'private-never-forwarded'},{execute});
  assert.equal(calls.length,3);
  for(const call of calls){assert.equal(call.command,'git');assert.equal(call.options.env.GITHUB_TOKEN,undefined);
    assert.equal(call.options.env.SUPABASE_DB_PASSWORD,undefined);assert.equal(call.options.shell,false);}
  assert.throws(()=>confirmDatabaseBackupMain(env,{execute:()=>Buffer.from('b'.repeat(40))}),{code:'DATABASE_BACKUP_MAIN_CHANGED'});
});
test('normal whole-workflow inverse removes only the reviewed backup hook and preserves the existing complete Pages inverse',async()=>{
  const {inverseAutomaticDatabaseBackupHookWorkflow:inverse,inverseAutomaticCompletedPagesWorkflow,
    automaticDatabaseBackupHookWorkflowReview:proof}=await import('./lib/completed-private-runtime-workflow-review.mjs');
  const current=fs.readFileSync(new URL('../.github/workflows/run-current-weather-once.yml',import.meta.url),'utf8');
  const before=inverse(current,'once');assert.notEqual(before,current);
  assert.equal(crypto.createHash('sha256').update(before).digest('hex'),proof.before.sha256);
  assert.equal(inverseAutomaticCompletedPagesWorkflow(current,'once'),inverseAutomaticCompletedPagesWorkflow(before,'once'));
  for(const changed of [current+'\n',current.replace('backup-supabase-database.yml','unreviewed-backup.yml')])
    assert.equal(inverse(changed,'once'),changed,'unknown workflow changes never receive the reviewed inverse');
});
test('actual normal maintenance inventory accepts the two exact new workflows and retains historical unknown/missing/changed refusals',()=>{
  const source=fs.readFileSync(new URL('./test-workflow-validation-order-4.0.108.mjs',import.meta.url),'utf8');
  const expected=source.slice(source.indexOf('const expectedWorkflowFiles = '),source.indexOf('// Test-only: qualify exactly'));
  const start=source.indexOf('const reviewedMaintenanceWorkflows = '),end=source.indexOf('const reviewedMaintenanceSources = ');
  const sources=Object.fromEntries(['backup-supabase-database.yml','maintain-admin-document-history.yml','verify-supabase-cli-local-restore.yml']
    .map(name=>[name,fs.readFileSync(new URL('../.github/workflows/'+name,import.meta.url))]));
  const actualChecks=source.slice(source.indexOf('const physicalWorkflowFiles = inverseReviewedMaintenanceWorkflowInventory('),
    source.indexOf('// Exact outer inventory'));
  vm.runInNewContext(expected+source.slice(start,end)+`
    const currentPhysicalWorkflowFiles=[...expectedWorkflowFiles,'private-trip-weather-study.yml','deploy-forecast-share.yml',
      ...Object.keys(reviewedMaintenanceWorkflows)].sort();
    const reviewedMaintenanceSources=suppliedSources;
    `+actualChecks+'\nassert.equal(physicalWorkflowFiles.length,currentPhysicalWorkflowFiles.length-3);',
    {assert,crypto,Buffer,Object,suppliedSources:sources});
});

test('normal cadence uses separate restore, capture and rotation windows; failure or unknown receipt never promotes',async()=>{
  let clock=Date.parse('2026-11-10T03:10:00Z'),verified=false,captures=0,restores=0,persists=0,rotations=0;
  const deps={env,now:()=>clock,verifyTrigger:()=>({proceed:true}),requireSettled:()=>{},
    inspectCurrent:async()=>({completedAt:new Date(clock-DATABASE_BACKUP_INTERVAL_MS).toISOString(),indexSha256:'b'.repeat(64),restoreVerified:verified}),
    runHosted:({phase})=>{if(phase==='execute')captures++;return {archiveWrittenThisOperation:true,centralLocatorVerified:true};},
    restore:async restoreEnv=>{restores++;assert.equal(restoreEnv.RESTORE_ARCHIVE_INDEX_COMMITMENT,'rr-supabase-restore-v1:'+databaseRestoreCommitment('b'.repeat(64)));return {ownReport:true};},
    persistRestore:async({report,indexSha256})=>{persists++;assert.deepEqual(report,{ownReport:true});assert.equal(indexSha256,'b'.repeat(64));verified=true;return {status:'DURABLE',receiptWritten:true};},
    rotate:async()=>{rotations++;return {status:'RETIRED',deletedObjects:1};}};
  assert.equal((await runAutonomousDatabaseBackup({phase:'plan'},deps)).action,'restore');assert.equal(restores,0);
  await runAutonomousDatabaseBackup({phase:'execute'},deps);assert.deepEqual([restores,persists,captures,rotations],[1,1,0,0]);
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},deps)).action,'capture');assert.deepEqual([restores,persists,captures,rotations],[1,1,1,0]);
  const rotation={...deps,inspectCurrent:async()=>({completedAt:new Date(clock).toISOString(),restoreVerified:true,rotationPending:true})};
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},rotation)).action,'rotate');assert.deepEqual([restores,persists,captures,rotations],[1,1,1,1]);
  verified=false;
  await assert.rejects(()=>runAutonomousDatabaseBackup({phase:'execute'},{...deps,restore:async()=>{throw new Error('synthetic local restore failure');}}));
  assert.equal(persists,1);assert.equal(rotations,1);
  await assert.rejects(()=>runAutonomousDatabaseBackup({phase:'execute'},{...deps,persistRestore:async()=>{throw new Error('synthetic unknown write');}}));
  assert.equal(rotations,1);assert.equal(captures,1);
  const late={...deps,verifyTrigger:()=>({proceed:false}),inspectCurrent:()=>{throw new Error('late source cannot touch archive');}};
  assert.equal((await runAutonomousDatabaseBackup({phase:'execute'},late)).privateAccessStarted,false);
});
