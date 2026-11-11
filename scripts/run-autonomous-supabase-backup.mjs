import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runHostedSupabaseBackup} from './run-hosted-supabase-backup.mjs';
import {inspectSupabaseDatabaseBackupLifecycle,rotateSupabaseDatabaseBackups,persistSupabaseDatabaseRestoreReceipt} from './archive-supabase-database-backup.mjs';
import {verifyDatabaseBackupTrigger,requireNoUnresolvedDatabaseCapture,DATABASE_BACKUP_INTERVAL_MS,databaseRestoreCommitment} from './supabase-backup-lifecycle.mjs';

export async function runAutonomousDatabaseBackup({phase='plan'}={},dependencies={}){
  const env={...(dependencies.env??process.env),SUPABASE_BACKUP_OPERATION:'capture',
    SUPABASE_BACKUP_CONFIRMATION:'CAPTURE-PRIVATE-SUPABASE-DATABASE-BACKUP',SUPABASE_BACKUP_INDEX_SHA:''};
  const own={...dependencies,env},now=dependencies.now??Date.now;
  if(!['plan','execute'].includes(phase))throw Object.assign(new Error('DATABASE_BACKUP_PHASE'),{code:'DATABASE_BACKUP_PHASE'});
  const trigger=(dependencies.verifyTrigger??verifyDatabaseBackupTrigger)(env,{read:dependencies.readGithub,now});
  if(!trigger.proceed)return {status:'DATABASE_BACKUP_SKIPPED_ORIGINAL_WEATHER_WINDOW',proceed:false,privateAccessStarted:false};
  // Exact current main and the private bucket are reconfirmed before even the
  // small current-index read. Source qualification precedes this in the workflow.
  (dependencies.runHosted??runHostedSupabaseBackup)({phase:'preflight',automatic:true},own);
  const current=await (dependencies.inspectCurrent??inspectSupabaseDatabaseBackupLifecycle)(own);
  (dependencies.requireSettled??requireNoUnresolvedDatabaseCapture)(current,{env,read:dependencies.readGithub});
  const age=now()-Date.parse(current.completedAt);
  if(!Number.isFinite(age)||age<0)throw Object.assign(new Error('DATABASE_BACKUP_CURRENT_TIME'),{code:'DATABASE_BACKUP_CURRENT_TIME'});
  // One bounded operation per completed weather gap. Capture, physical restore
  // and rotation each retain their existing independent operation deadlines.
  const action=current.restoreVerified===false?'restore':age>=DATABASE_BACKUP_INTERVAL_MS?'capture':current.rotationPending?'rotate':null;
  if(!action)return {status:'DATABASE_BACKUP_SKIPPED_NOT_DUE',proceed:false,privateAccessStarted:true};
  if(phase==='plan')return {status:'DATABASE_BACKUP_MAINTENANCE_DUE',action,proceed:true,privateAccessStarted:true};
  if(action==='restore'){
    const restoreEnv={...env,RESTORE_ARCHIVE_INDEX_COMMITMENT:'rr-supabase-restore-v1:'+databaseRestoreCommitment(current.indexSha256),
      RESTORE_ARCHIVE_CONFIRMATION:'RESTORE-PRIVATE-ARCHIVE-IN-ISOLATED-LOCAL-POSTGRES'};
    const restore=dependencies.restore??(await import('./test-supabase-cli-local-restore.mjs')).runAuthenticatedArchiveRestore;
    const report=await restore(restoreEnv);
    const receipt=await (dependencies.persistRestore??persistSupabaseDatabaseRestoreReceipt)({report,indexSha256:current.indexSha256},own);
    return {status:receipt.status,action,proceed:true,receiptWritten:receipt.receiptWritten,fullDatabaseBackupVerified:false,freeReady:false};
  }
  if(action==='capture'){
    const captured=(dependencies.runHosted??runHostedSupabaseBackup)({phase:'execute',automatic:true},own);
    return {status:'DATABASE_BACKUP_WEEKLY_CAPTURE_COMPLETE',action,proceed:true,
      archiveWrittenThisOperation:captured.archiveWrittenThisOperation,centralLocatorVerified:captured.centralLocatorVerified,
      rotationStatus:'DEFERRED_TO_A_SEPARATE_NORMAL_WEATHER_WINDOW',deletedObjects:0,
      fullDatabaseBackupVerified:false,freeReady:false,automaticRetry:false};
  }
  const rotation=await (dependencies.rotate??rotateSupabaseDatabaseBackups)({
    reserveIndexCommitment:env.SUPABASE_BACKUP_RESERVE_INDEX_COMMITMENT,
    restoreRunId:env.SUPABASE_BACKUP_RESERVE_RESTORE_RUN_ID,
  },own);
  return {status:rotation.status,action,proceed:true,deletedObjects:rotation.deletedObjects,
    fullDatabaseBackupVerified:false,freeReady:false,automaticRetry:false};
}
async function main(){const args=process.argv.slice(2);
  if(args.length!==1||!['--plan','--execute'].includes(args[0]))throw Object.assign(new Error('DATABASE_BACKUP_PHASE'),{code:'DATABASE_BACKUP_PHASE'});
  const result=await runAutonomousDatabaseBackup({phase:args[0].slice(2)});
  if(args[0]==='--plan'&&process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'proceed='+String(result.proceed)+'\n'+'action='+(result.action??'none')+'\n');
  console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{
  console.error(JSON.stringify({status:'FAILED_CLOSED',code:/^[A-Z][A-Z0-9_]{0,95}$/.test(error.code??'')?error.code:'DATABASE_BACKUP_FAILED_CLOSED',
    automaticRetry:false,fullDatabaseBackupVerified:false,freeReady:false}));process.exitCode=1;
});
