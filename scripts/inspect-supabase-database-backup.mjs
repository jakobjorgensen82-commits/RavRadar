import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {DB_REMOTE_BACKUP_POLICY, inspectSupabaseDatabaseBackupStock} from './archive-supabase-database-backup.mjs';
import {DB_BACKUP_CIPHER_LIMITS} from './seal-supabase-database-export.mjs';
import {confirmDatabaseBackupMain, requireNoUnresolvedDatabaseCapture} from './supabase-backup-lifecycle.mjs';

const workflow = 'Inspect RavRadar database backup stock';
const repository = 'jakobjorgensen82-commits/RavRadar';

function requireCondition(condition, code) {
  if (!condition) throw Object.assign(new Error(code), {code});
}

export async function inspectDatabaseBackupPlan({env=process.env, confirmMain=confirmDatabaseBackupMain,
  inspectStock=inspectSupabaseDatabaseBackupStock, readGithub, fetchImpl}={}) {
  requireCondition(env.GITHUB_ACTIONS === 'true' && env.RUNNER_ENVIRONMENT === 'github-hosted'
    && env.RUNNER_OS === 'Linux' && env.GITHUB_WORKFLOW === workflow && env.GITHUB_REPOSITORY === repository
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_RUN_ATTEMPT === '1', 'BACKUP_STOCK_HOSTED_MAIN');
  const commitment = /^rr-supabase-restore-v1:([a-f0-9]{64})$/.exec(env.RESTORE_ARCHIVE_INDEX_COMMITMENT ?? '');
  requireCondition(commitment, 'BACKUP_STOCK_SELECTOR');
  confirmMain(env);
  const stock = await inspectStock(commitment[1], {env, fetchImpl});
  // A receipt may explain a prior restore attempt. With unclassified objects,
  // neither its absence nor the absence of an unsettled writer is established.
  if (stock.selfContainedCurrentOnly) {
    requireNoUnresolvedDatabaseCapture({...stock, restoreRunIds:[]}, {env, read:readGithub});
  }
  confirmMain(env);
  const bucketLimitBytes = DB_REMOTE_BACKUP_POLICY.maximumBucketBytes;
  const reservedCaptureBytes = DB_BACKUP_CIPHER_LIMITS.wireBytes;
  return {
    status: 'DATABASE_BACKUP_STOCK_INSPECTED',
    expectedArchiveCurrent: true,
    locatorVersion: stock.locatorVersion,
    archiveCompletedAt: stock.completedAt,
    objectCount: stock.objectCount,
    databaseStorage: stock.databaseStorage,
    usedBytes: stock.usedBytes,
    bucketLimitBytes,
    reservedCaptureBytes,
    captureHeadroomAvailable: stock.usedBytes + reservedCaptureBytes <= bucketLimitBytes,
    rotationState: stock.selfContainedCurrentOnly ? 'SINGLE_CURRENT_ARCHIVE' : 'UNCLASSIFIED_STOCK',
    durableRestoreReceipt: stock.selfContainedCurrentOnly ? false : null,
    nextEligibleWeeklyAction: stock.selfContainedCurrentOnly ? 'restore' : null,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireCondition(process.argv.length === 2, 'BACKUP_STOCK_ARGUMENTS');
    console.log(JSON.stringify(await inspectDatabaseBackupPlan()));
  } catch (error) {
    const code = /^[A-Z][A-Z0-9_]{0,95}$/.test(error.code ?? '') ? error.code : 'BACKUP_STOCK_FAILED_CLOSED';
    console.error(JSON.stringify({status:'FAILED_CLOSED', code}));
    process.exitCode = 1;
  }
}
