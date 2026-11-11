import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runHostedSupabaseBackup} from './run-hosted-supabase-backup.mjs';
import {inspectSupabaseDatabaseBackupLifecycle,rotateSupabaseDatabaseBackups} from './archive-supabase-database-backup.mjs';
import {verifyDatabaseBackupTrigger,requireNoUnresolvedDatabaseCapture,DATABASE_BACKUP_INTERVAL_MS} from './supabase-backup-lifecycle.mjs';

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
  if(age<DATABASE_BACKUP_INTERVAL_MS)return {status:'DATABASE_BACKUP_SKIPPED_NOT_DUE',proceed:false,privateAccessStarted:true};
  if(phase==='plan')return {status:'DATABASE_BACKUP_WEEKLY_CAPTURE_DUE',proceed:true,privateAccessStarted:true};
  // The same checks run again after CLI setup. No unknown write is retried.
  const captured=(dependencies.runHosted??runHostedSupabaseBackup)({phase:'execute',automatic:true},own);
  const rotation=await (dependencies.rotate??rotateSupabaseDatabaseBackups)({
    reserveIndexCommitment:env.SUPABASE_BACKUP_RESERVE_INDEX_COMMITMENT,
    restoreRunId:env.SUPABASE_BACKUP_RESERVE_RESTORE_RUN_ID,
  },own);
  return {status:'DATABASE_BACKUP_WEEKLY_CAPTURE_COMPLETE',proceed:true,
    archiveWrittenThisOperation:captured.archiveWrittenThisOperation,
    centralLocatorVerified:captured.centralLocatorVerified,rotationStatus:rotation.status,
    deletedObjects:rotation.deletedObjects,fullDatabaseBackupVerified:false,freeReady:false,automaticRetry:false};
}
async function main(){const args=process.argv.slice(2);
  if(args.length!==1||!['--plan','--execute'].includes(args[0]))throw Object.assign(new Error('DATABASE_BACKUP_PHASE'),{code:'DATABASE_BACKUP_PHASE'});
  const result=await runAutonomousDatabaseBackup({phase:args[0].slice(2)});
  if(args[0]==='--plan'&&process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'proceed='+String(result.proceed)+'\n');
  console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{
  console.error(JSON.stringify({status:'FAILED_CLOSED',code:/^[A-Z][A-Z0-9_]{0,95}$/.test(error.code??'')?error.code:'DATABASE_BACKUP_FAILED_CLOSED',
    automaticRetry:false,fullDatabaseBackupVerified:false,freeReady:false}));process.exitCode=1;
});
