import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const repository='jakobjorgensen82-commits/RavRadar',repositoryId=1306858343;
const need=(ok,code)=>{if(!ok){const error=new Error(code);error.code=code;throw error;}};
const id=value=>/^[1-9][0-9]{0,14}$/.test(String(value??''));
export const DATABASE_BACKUP_INTERVAL_MS=7*24*60*60*1000;
export const databaseRestoreCommitment=index=>crypto.createHash('sha256')
  .update(JSON.stringify(['RavRadar/SupabaseArchiveRestore/v1/selector',index])).digest('hex');
export function confirmDatabaseBackupMain(env=process.env,{execute=execFileSync}={}){
  need(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&env.GITHUB_SHA===env.EXPECTED_HEAD_SHA,'DATABASE_BACKUP_MAIN');
  const childEnv=Object.fromEntries(['PATH','Path','HOME','USERPROFILE','SystemRoot','WINDIR','TEMP','TMP']
    .filter(key=>typeof env[key]==='string').map(key=>[key,env[key]]));
  childEnv.GIT_TERMINAL_PROMPT='0';
  const call=args=>{try{return execute('git',args,{env:childEnv,shell:false,windowsHide:true,
    timeout:60000,maxBuffer:65536,stdio:['ignore','pipe','pipe']}).toString('utf8').trim();}
    catch{need(false,'DATABASE_BACKUP_MAIN_UNAVAILABLE');}};
  call(['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main']);
  for(const ref of ['HEAD^{commit}','origin/main^{commit}'])need(call(['rev-parse',ref])===env.GITHUB_SHA,'DATABASE_BACKUP_MAIN_CHANGED');
}
export function databaseReserveReceiptReady(report,{sourceHead,indexCommitment}={}){
  return report?.status==='PASS'&&report.scope==='authenticated-archive-isolated-sql-restore'
    &&/^[a-f0-9]{40}$/.test(sourceHead??'')&&report.sourceHead===sourceHead&&report.cliVersion==='2.117.0'
    &&/^rr-supabase-restore-v1:[a-f0-9]{64}$/.test(indexCommitment??'')
    &&report.archiveIndexCommitmentSha256===indexCommitment.slice('rr-supabase-restore-v1:'.length)
    &&['authenticatedFiveFileSqlExecuted','exactSqlBytesStreamed','isolatedAuthServiceHealthy',
      'localRestoredCatalogVerified','ownedDockerClosed','sourceDataParityVerified','authRestoreVerified',
      'fullDatabaseBackupVerified'].every(field=>report[field]===true)
    &&report.archiveDataParity?.status==='PASS'
    &&report.archiveDataParity.scope==='AUTHENTICATED_ARCHIVE_CONTENT_AND_DUPLICATES'
    &&/^[a-f0-9]{64}$/.test(report.archiveDataParity.digest??'')
    &&['productionDatabaseRestoreExecuted','productionBackupVerified','productionAuthRestoreVerified',
      'atomicDatabaseSnapshot','storageObjectBytesRestored','erasureBarriersVerified','freeReady']
      .every(field=>report[field]===false);
}
export function backupGithubReader(env=process.env,execute=execFileSync){
  return suffix=>{
    const childEnv=Object.fromEntries(['PATH','Path','HOME','USERPROFILE','SystemRoot','WINDIR','TEMP','TMP']
      .filter(key=>typeof env[key]==='string').map(key=>[key,env[key]]));
    childEnv.GH_TOKEN=env.GITHUB_TOKEN;
    try{return JSON.parse(execute('gh',['api','--method','GET','-H','Accept: application/vnd.github+json',
      'repos/'+repository+'/actions/'+suffix],{env:childEnv,shell:false,windowsHide:true,
      timeout:10000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}).toString('utf8'));}
    catch{need(false,'DATABASE_BACKUP_GITHUB_READ');}
  };
}
function runIdentity(run,runId,path){
  const own=value=>value?.id===repositoryId&&value.full_name===repository;
  need(String(run?.id)===String(runId)&&run.run_attempt===1&&run.event==='workflow_dispatch'
    &&run.path===path&&run.head_branch==='main'&&own(run.repository)&&own(run.head_repository)
    &&run.status==='completed'&&run.conclusion==='success','DATABASE_BACKUP_SOURCE_RUN');
}
function jobs(read,runId){const result=read('runs/'+runId+'/attempts/1/jobs?per_page=100');
  need(Array.isArray(result?.jobs)&&result.jobs.length>0&&result.jobs.length<=100
    &&result.total_count===result.jobs.length,'DATABASE_BACKUP_JOB_LIST');return result.jobs;}
function successfulJob(list,name,runId,head){const matching=list.filter(job=>job.name===name);
  need(matching.length===1&&String(matching[0].run_id)===String(runId)&&matching[0].head_sha===head
    &&matching[0].status==='completed'&&matching[0].conclusion==='success','DATABASE_BACKUP_SOURCE_JOB');return matching[0];}
export function verifyDatabaseBackupTrigger(env=process.env,{read=backupGithubReader(env),now=Date.now}={}){
  const sourceId=env.SUPABASE_BACKUP_SOURCE_WEATHER_RUN_ID;
  need(id(sourceId)&&id(env.GITHUB_RUN_ID)&&sourceId!==env.GITHUB_RUN_ID
    &&env.GITHUB_REPOSITORY===repository&&env.GITHUB_REF==='refs/heads/main'
    &&env.GITHUB_RUN_ATTEMPT==='1'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')
    &&env.EXPECTED_HEAD_SHA===env.GITHUB_SHA&&env.SUPABASE_BACKUP_AUTOMATION==='weekly'
    &&env.GITHUB_WORKFLOW==='Maintain RavRadar admin document history'
    &&env.GITHUB_EVENT_NAME==='workflow_dispatch','DATABASE_BACKUP_TRIGGER');
  const run=read('runs/'+sourceId);
  runIdentity(run,sourceId,'.github/workflows/run-current-weather-once.yml');
  need(run.name==='Run current RavRadar weather once'&&run.head_sha===env.GITHUB_SHA
    &&run.actor?.login==='github-actions[bot]','DATABASE_BACKUP_SOURCE_HEAD');
  const list=jobs(read,sourceId);
  successfulJob(list,'Require a verified current-weather deployment',sourceId,run.head_sha);
  need(env.GITHUB_ACTOR==='github-actions[bot]','DATABASE_BACKUP_BOT_ROUTE');
  const handoff=successfulJob(list,'Hand off verified ordinary weather to admin document history',sourceId,run.head_sha);
  const binding=(handoff.steps??[]).filter(step=>step.name?.startsWith('Bind document history recipient '));
  need(binding.length===1&&binding[0].name==='Bind document history recipient '+env.GITHUB_RUN_ID
    &&binding[0].status==='completed'&&binding[0].conclusion==='success','DATABASE_BACKUP_RECIPIENT');
  const created=Date.parse(run.created_at),completed=Date.parse(run.updated_at),clock=now();
  need(Number.isFinite(created)&&Number.isFinite(completed)&&completed>=created&&clock>=completed
    &&new Date(created).toISOString().replace('.000Z','Z')===run.created_at,'DATABASE_BACKUP_SOURCE_TIME');
  // Bind to the source run's original slot, never a later window after queueing.
  const period=4*60*60*1000,base=Math.floor(created/period)*period+19*60*1000;
  const next=base<=created?base+period:base;
  return {sourceRunId:sourceId,nextWeatherSlot:new Date(next).toISOString(),
    proceed:next-clock>=35*60*1000,sourceCompletedAt:run.updated_at};
}
export function verifyDatabaseBackupReserve({indexSha256,restoreRunId},
  {env=process.env,read=backupGithubReader(env)}={}){
  need(/^[a-f0-9]{64}$/.test(indexSha256??'')&&id(restoreRunId),'DATABASE_BACKUP_RESERVE_SELECTOR');
  const run=read('runs/'+restoreRunId);
  runIdentity(run,restoreRunId,'.github/workflows/verify-supabase-cli-local-restore.yml');
  need(run.name==='Verify standard Supabase CLI local restore','DATABASE_BACKUP_RESERVE_WORKFLOW');
  const job=successfulJob(jobs(read,restoreRunId),'standard-local-restore',restoreRunId,run.head_sha);
  const name='Bind verified database reserve rr-supabase-restore-v1:'+databaseRestoreCommitment(indexSha256);
  const proof=(job.steps??[]).filter(step=>step.name===name);
  need(proof.length===1&&proof[0].status==='completed'&&proof[0].conclusion==='success',
    'DATABASE_BACKUP_RESERVE_NOT_RECOVERY_VERIFIED');
  return {indexSha256,restoreRunId:String(restoreRunId),sourceHead:run.head_sha};
}
export function requireNoUnresolvedDatabaseCapture(current,{env=process.env,read=backupGithubReader(env)}={}){
  const since=encodeURIComponent('>='+current.completedAt);
  for(const workflow of ['maintain-admin-document-history.yml','backup-supabase-database.yml']){
    const result=read('workflows/'+workflow+'/runs?per_page=100&created='+since);
    need(Array.isArray(result?.workflow_runs)&&result.total_count===result.workflow_runs.length
      &&result.workflow_runs.length<=100,'DATABASE_BACKUP_CAPTURE_HISTORY_BOUND');
    for(const run of result.workflow_runs){
      need(id(run.id)&&run.path==='.github/workflows/'+workflow
        &&run.repository?.id===repositoryId&&run.head_repository?.id===repositoryId,'DATABASE_BACKUP_CAPTURE_HISTORY');
      if(String(run.id)===env.GITHUB_RUN_ID||String(run.id)===current.context.runId
        ||current.restoreRunIds?.includes(String(run.id)))continue;
      need(run.run_attempt===1,'DATABASE_BACKUP_CAPTURE_ATTEMPT_UNKNOWN');
      const started=jobs(read,String(run.id)).some(job=>(job.steps??[]).some(step=>
        ['Capture private Supabase database','Restore and seal current private Supabase archive'].includes(step.name)
          &&step.status!=='pending'&&step.status!=='queued'&&step.conclusion!=='skipped'));
      need(!started,'DATABASE_BACKUP_CAPTURE_OUTCOME_UNRESOLVED');
    }
  }
}
