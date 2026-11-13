import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {runHostedSupabaseBackup} from './run-hosted-supabase-backup.mjs';
import {inspectSupabaseDatabaseBackupLifecycle,rotateSupabaseDatabaseBackups,persistSupabaseDatabaseRestoreReceipt,
  DB_REMOTE_BACKUP_POLICY} from './archive-supabase-database-backup.mjs';
import {verifyDatabaseBackupTrigger,requireNoUnresolvedDatabaseCapture,DATABASE_BACKUP_INTERVAL_MS,
  databaseRestoreCommitment,databaseReserveReceiptReady} from './supabase-backup-lifecycle.mjs';
import {DB_BACKUP_CIPHER_LIMITS} from './seal-supabase-database-export.mjs';

const need=(ok,code)=>{if(!ok){const e=new Error(code);e.code=code;throw e;}};
const pick=(env,keys)=>Object.fromEntries(keys.filter(k=>typeof env[k]==='string').map(k=>[k,env[k]]));
// This is the existing isolated archive CLI, not another restore implementation.
// Only the archive reader receives these credentials; its ordinary SQL/Docker
// children retain the existing clean environment and owned cleanup.
export function runCurrentDatabaseArchiveRestore(env,{execute=execFileSync,execPath=process.execPath,timeout=23*60_000}={}){
  need(Number.isSafeInteger(timeout)&&timeout>0&&timeout<=23*60_000,'DATABASE_BACKUP_RESTORE_DEADLINE');
  const child=pick(env,['PATH','Path','HOME','USERPROFILE','SystemRoot','WINDIR','TEMP','TMP','RUNNER_TEMP',
    'LANG','LC_ALL','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','GITHUB_REPOSITORY','GITHUB_SHA',
    'GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REF','GITHUB_EVENT_NAME','EXPECTED_HEAD_SHA',
    'SUPABASE_INTERNAL_IMAGE_REGISTRY','RESTORE_ARCHIVE_INDEX_COMMITMENT','RESTORE_ARCHIVE_CONFIRMATION',
    'SUPABASE_SERVICE_ROLE_KEY','RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY']);
  let report;
  try{
    report=JSON.parse(execute(execPath,['scripts/test-supabase-cli-local-restore.mjs','--run-archive-restore'],{
      env:child,shell:false,windowsHide:true,timeout,maxBuffer:65536,stdio:['ignore','pipe','pipe']}).toString('utf8'));
  }catch{need(false,'DATABASE_BACKUP_ARCHIVE_RESTORE_FAILED');}
  need(databaseReserveReceiptReady(report,{sourceHead:env.GITHUB_SHA,
    indexCommitment:env.RESTORE_ARCHIVE_INDEX_COMMITMENT}),'DATABASE_BACKUP_ARCHIVE_RESTORE_NOT_VERIFIED');
  return report;
}

export async function runAutonomousDatabaseBackup({phase='plan'}={},dependencies={}){
  const env={...(dependencies.env??process.env),SUPABASE_BACKUP_OPERATION:'capture',
    SUPABASE_BACKUP_CONFIRMATION:'CAPTURE-PRIVATE-SUPABASE-DATABASE-BACKUP',SUPABASE_BACKUP_INDEX_SHA:''};
  const own={...dependencies,env},now=dependencies.now??Date.now;
  need(['plan','execute'].includes(phase),'DATABASE_BACKUP_PHASE');
  if(env.SUPABASE_BACKUP_AUTOMATION!=='weekly')return {
    status:'DATABASE_BACKUP_AUTOMATION_DISABLED',proceed:false,privateAccessStarted:false};
  const trigger=(dependencies.verifyTrigger??verifyDatabaseBackupTrigger)(env,{read:dependencies.readGithub,now});
  if(!trigger.proceed)return {status:'DATABASE_BACKUP_SKIPPED_ORIGINAL_WEATHER_WINDOW',proceed:false,privateAccessStarted:false};
  // Source qualification is earlier in the ordinary workflow. Main, private
  // bucket and original weather window are checked again after setup/queueing.
  (dependencies.runHosted??runHostedSupabaseBackup)({phase:'preflight',automatic:true},own);
  const current=await (dependencies.inspectCurrent??inspectSupabaseDatabaseBackupLifecycle)(own);
  need(current?.remoteIndexAuthenticated===true&&typeof current.restoreVerified==='boolean'
    &&typeof current.rotationPending==='boolean'&&typeof current.rotationHeld==='boolean','DATABASE_BACKUP_CURRENT_NOT_QUALIFIED');
  (dependencies.requireSettled??requireNoUnresolvedDatabaseCapture)(current,{env,read:dependencies.readGithub});
  const age=now()-Date.parse(current.completedAt);
  need(Number.isFinite(age)&&age>=0,'DATABASE_BACKUP_CURRENT_TIME');
  if(current.rotationHeld)return {status:'DATABASE_BACKUP_RETENTION_HELD',proceed:false,
    privateAccessStarted:true,retentionReady:false,freeReady:false};
  // Do not create another generation while restore or retirement is unsettled.
  // Capture, restore and rotation each use a separate normal weather gap.
  const action=current.restoreVerified===false?'restore':current.rotationPending?'rotate'
    :age>=DATABASE_BACKUP_INTERVAL_MS?'capture':null;
  if(!action)return {status:'DATABASE_BACKUP_SKIPPED_NOT_DUE',proceed:false,privateAccessStarted:true};
  if(action==='capture')need(Number.isSafeInteger(current.usedBytes)&&current.usedBytes>=0
    &&current.usedBytes+DB_BACKUP_CIPHER_LIMITS.wireBytes<=DB_REMOTE_BACKUP_POLICY.maximumBucketBytes,
    'R2_CAPTURE_HEADROOM');
  if(phase==='plan')return {status:'DATABASE_BACKUP_MAINTENANCE_DUE',action,proceed:true,privateAccessStarted:true};
  if(action==='restore'){
    const restoreEnv={...env,RESTORE_ARCHIVE_INDEX_COMMITMENT:'rr-supabase-restore-v1:'+databaseRestoreCommitment(current.indexSha256),
      RESTORE_ARCHIVE_CONFIRMATION:'RESTORE-PRIVATE-ARCHIVE-IN-ISOLATED-LOCAL-POSTGRES'};
    const untilNext=Date.parse(trigger.nextWeatherSlot)-now()-5*60_000;
    need(Number.isFinite(untilNext)&&untilNext>0,'DATABASE_BACKUP_RESTORE_DEADLINE');
    const report=await (dependencies.restore??runCurrentDatabaseArchiveRestore)(restoreEnv,{
      timeout:Math.min(23*60_000,untilNext)});
    need(databaseReserveReceiptReady(report,{sourceHead:env.GITHUB_SHA,
      indexCommitment:restoreEnv.RESTORE_ARCHIVE_INDEX_COMMITMENT}),'DATABASE_BACKUP_ARCHIVE_RESTORE_NOT_VERIFIED');
    const receipt=await (dependencies.persistRestore??persistSupabaseDatabaseRestoreReceipt)({report,indexSha256:current.indexSha256},own);
    need(['DATABASE_RESTORE_RECEIPT_DURABLE','DATABASE_RESTORE_RECEIPT_ALREADY_DURABLE'].includes(receipt?.status),
      'DATABASE_BACKUP_RESTORE_RECEIPT');
    return {status:receipt.status,action,proceed:true,receiptWritten:receipt.receiptWritten,
      fullDatabaseBackupVerified:false,freeReady:false,automaticRetry:false};
  }
  if(action==='rotate'){
    const rotation=await (dependencies.rotate??rotateSupabaseDatabaseBackups)({},own);
    need(rotation?.status==='DATABASE_BACKUP_ONE_GROUP_RETIRED','DATABASE_BACKUP_RETENTION_NOT_SETTLED');
    return {status:rotation.status,action,proceed:true,deletedObjects:rotation.deletedObjects,
      fullDatabaseBackupVerified:false,freeReady:false,automaticRetry:false};
  }
  // The current generation is restore-qualified and safe retirement settled
  // BEFORE this capture. The fresh generation remains unverified until restore.
  const captured=(dependencies.runHosted??runHostedSupabaseBackup)({phase:'execute',automatic:true},own);
  return {status:'DATABASE_BACKUP_WEEKLY_CAPTURE_CREATED_RESTORE_PENDING',action,proceed:true,
    archiveWrittenThisOperation:captured.archiveWrittenThisOperation,centralLocatorVerified:captured.centralLocatorVerified,
    fullDatabaseBackupVerified:false,freeReady:false,automaticRetry:false};
}
async function main(){const args=process.argv.slice(2);
  need(args.length===1&&['--plan','--execute'].includes(args[0]),'DATABASE_BACKUP_PHASE');
  const result=await runAutonomousDatabaseBackup({phase:args[0].slice(2)});
  if(args[0]==='--plan'&&process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,
    'proceed='+String(result.proceed)+'\n'+'action='+(result.action??'none')+'\n');
  console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{
  console.error(JSON.stringify({status:'FAILED_CLOSED',code:/^[A-Z][A-Z0-9_]{0,95}$/.test(error.code??'')?error.code:'DATABASE_BACKUP_FAILED_CLOSED',
    automaticRetry:false,fullDatabaseBackupVerified:false,freeReady:false}));process.exitCode=1;
});
