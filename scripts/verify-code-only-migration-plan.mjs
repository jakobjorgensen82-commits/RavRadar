#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {execFileSync} from 'node:child_process';
import {readAccountErasureSource,verifyInstalledAccountErasureSchema,readAccountInactivitySource,verifyInstalledAccountInactivitySchema} from './verify-account-erasure-schema.mjs';
import {
  LATEST_REQUIRED_CUTOVER_MIGRATION,
  REQUIRED_CUTOVER_MIGRATIONS,
  ACCOUNT_ASSISTANT_SOURCE_MIGRATION,
  assertSupabaseMigrationPlan,
} from './integrated-cutover-readiness.mjs';
import * as accountInactivityCutover from './integrated-cutover-readiness.mjs';
const ACCOUNT_ERASURE_APP_MIGRATION=accountInactivityCutover.ACCOUNT_ERASURE_APP_MIGRATION;
const ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS=accountInactivityCutover.ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS;
const currentInactivityOff=accountInactivityCutover.DEFAULT_CUTOVER_SOURCE_PHASE==='assistant-after599-successor'&&ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS!==undefined;
import { CURRENT_GRID_MIGRATION } from './lib/current-grid-successor-source.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error('Missing ' + name);
  return process.argv[index + 1];
}

async function qualifyCurrentAccountErasureChecks(receiptMode=false){
  assert.equal(process.env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(process.env.GITHUB_REF,'refs/heads/main');
  assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');
  assert.equal(process.env[receiptMode?'RAVRADAR_ACCOUNT_NATIVE_RECEIPT_OPT_IN':'RAVRADAR_ACCOUNT_ERASURE_OPT_IN'],'true');
  if(receiptMode){
    assert.notEqual(process.env.RAVRADAR_ACCOUNT_ERASURE_OPT_IN,'true');
    assert.equal(process.env.GITHUB_REPOSITORY,'jakobjorgensen82-commits/RavRadar');
    assert.equal(process.env.GITHUB_JOB,'apply-binding');
    assert.equal(process.env.GITHUB_WORKFLOW_REF,'jakobjorgensen82-commits/RavRadar/.github/workflows/apply-weather-model-binding-only.yml@refs/heads/main');
  }
  const raw=process.env.RAVRADAR_ACCOUNT_ERASURE_SOURCE_REFERENCE;
  assert(typeof raw==='string'&&Buffer.byteLength(raw)>0&&Buffer.byteLength(raw)<=16384);
  const reference=JSON.parse(raw),head=process.env.GITHUB_SHA;
  assert.match(head,/^[a-f0-9]{40}$/);assert.equal(reference.repository,process.env.GITHUB_REPOSITORY);
  assert.equal(reference.mergeCommit,head,'App installation requires the exact current FULL source reference');
  assert.match(reference.producerHead,/^[a-f0-9]{40}$/);
  const readGit=(args,options={})=>execFileSync('git',args,{maxBuffer:512*1024*1024,timeout:10000,...options,stdio:['pipe','pipe','pipe']});
  assert.equal(readGit(['rev-parse','HEAD']).toString().trim(),head);
  assert.equal(readGit(['status','--porcelain','--untracked-files=no']).toString().trim(),'');
  try{readGit(['cat-file','-e',reference.producerHead+'^{commit}']);}catch{
    // Exact source objects only; normal FULL verification still authenticates
    // the producer, immutable artifacts and all later negative evidence.
    readGit(['fetch','--no-tags','origin',reference.producerHead]);
  }
  const {sourceImpactEvidenceAccess}=await import('./native-postgres-evidence.mjs');
  const {qualifySourceImpactFullBaseline,qualifiedAccountErasureChecks,qualifiedAccountInactivityChecks,qualifiedAccountNativeReceipt}=await import('./source-impact-full-baseline.mjs');
  const access=sourceImpactEvidenceAccess({env:process.env});
  const qualified=await qualifySourceImpactFullBaseline({candidateCommit:head,reference},{...access,readGit});
  const facit=qualifiedAccountErasureChecks(qualified);
  assert(facit&&facit.candidateCommit===head&&facit.migrationSQLSha256===readAccountErasureSource().sha256,
    'The exact qualified native phase must contain this app SQL CHECK facit');
  const inactivity=!currentInactivityOff?null:qualifiedAccountInactivityChecks(qualified);
  if(currentInactivityOff){
    const source=readAccountInactivitySource();
    assert(inactivity&&inactivity.candidateCommit===head&&inactivity.sourceSqlFileCount===79,
      'The current OFF pair requires its own qualified native79 result');
    assert.deepEqual(inactivity.migrations,source.migrations.map(({sql,id,...row})=>row));
  }
  const receipt=receiptMode?qualifiedAccountNativeReceipt(qualified):null;
  if(receiptMode){
    const {readFixedNativeActivityReceiptSource}=await import('./lib/account-native-activity-receipt-source.mjs');
    assert(receipt&&receipt.candidateCommit===head&&receipt.receipt.sourceSqlFileCount===80
      &&receipt.receipt.originalSqlScopeCount===79&&receipt.receipt.cases===9&&receipt.receipt.actualPostgres===true
      &&receipt.receipt.migrationSQLSha256===readFixedNativeActivityReceiptSource().sha256,'Exact qualified native80 required');
    assert(['EXECUTED','REUSED'].includes(receipt.execution.status));
    assert.equal(receipt.execution.executedInThisRun,receipt.execution.status==='EXECUTED');
    assert(inactivity,'The unchanged OFF CHECK reference remains mandatory');
  }
  return {manual:facit.checkReference,inactivity:inactivity?.checkReference??null,receipt};
}
const appProofMode=process.argv[2];
const receiptProofModes=['--qualify-account-native-receipt-source','--read-account-native-receipt-before','--read-account-native-receipt-installed'];
if(receiptProofModes.includes(appProofMode)){
  let readbackPhase;
  try{
    assert.equal(process.argv.length,3);const checks=await qualifyCurrentAccountErasureChecks(true);
    if(appProofMode==='--qualify-account-native-receipt-source')console.log(JSON.stringify({kind:'QUALIFIED_ACCOUNT_NATIVE_RECEIPT_SOURCE',
      sourceSqlFileCount:80,originalSqlScopeCount:79,appendSha256:checks.receipt.receipt.migrationSQLSha256,
      execution:checks.receipt.execution.status,executedInThisRun:checks.receipt.execution.executedInThisRun,activationAuthority:false}));
    else {
      const {verifyFixedNativeActivityReceiptInstallState}=await import('./read-fixed-account-activity-hook.mjs');
      readbackPhase=appProofMode==='--read-account-native-receipt-before'?'before':'installed';
      console.log(JSON.stringify(await verifyFixedNativeActivityReceiptInstallState({
        phase:readbackPhase,accessToken:process.env.SUPABASE_ACCESS_TOKEN,
        expectedManualCheckReference:checks.manual,expectedInactivityCheckReference:checks.inactivity,
        expectedAppendSha256:checks.receipt.receipt.migrationSQLSha256})));
    }
  }catch(error){
    console.error('ACCOUNT_NATIVE_RECEIPT_QUALIFIED_INSTALL_EVIDENCE_REQUIRED');
    if(readbackPhase){
      // Log only known validator categories. Responses, catalog definitions,
      // error details and authentication settings must stay out of the run log.
      const knownReasons=new Set([
        'ACCOUNT_ERASURE_CATALOG_MISMATCH','ACCOUNT_ERASURE_CATALOG_DEADLINE',
        'ACCOUNT_ERASURE_CHECK_SEMANTICS_MISMATCH','ACCOUNT_INACTIVITY_CATALOG_MISMATCH',
        'ACCOUNT_INACTIVITY_CATALOG_DEADLINE','ACCOUNT_INACTIVITY_CHECK_SEMANTICS_MISMATCH',
        'NATIVE_RECEIPT_INSTALL_STATE_REQUIRED','NATIVE_RECEIPT_INSTALL_AUTH_DISABLED_REQUIRED',
        'NATIVE_RECEIPT_INSTALL_CATALOG_REQUIRED','NATIVE_RECEIPT_INSTALL_UNARMED_OFF_REQUIRED',
      ]);
      const reason=knownReasons.has(error?.message)?error.message:'READBACK_UNCLASSIFIED';
      console.error(JSON.stringify({kind:'ACCOUNT_NATIVE_RECEIPT_INSTALL_READBACK_REFUSED',phase:readbackPhase,reason}));
    }
    process.exitCode=1;
  }
}else if(['--qualify-account-erasure-source','--read-account-erasure-installed'].includes(appProofMode)){
  try{
    assert.equal(process.argv.length,3);const checks=await qualifyCurrentAccountErasureChecks();
    const expectedCheckReference=checks.manual;
    if(appProofMode==='--read-account-erasure-installed'){
      const receipt=await verifyInstalledAccountErasureSchema({accessToken:process.env.SUPABASE_ACCESS_TOKEN,expectedCheckReference});
      const {checkReference,...summary}=receipt;
      if(checks.inactivity){
        const {checkReference:noticeChecks,...off}=await verifyInstalledAccountInactivitySchema({accessToken:process.env.SUPABASE_ACCESS_TOKEN,expectedCheckReference:checks.inactivity});
        summary.inactivity={...off,checkDefinitions:noticeChecks.definitions.length,checkDefinitionsSha256:noticeChecks.definitionsSha256};
      }
      console.log(JSON.stringify({...summary,checkDefinitions:checkReference.definitions.length,
        postgresMajor:checkReference.postgresMajor,checkDefinitionsSha256:checkReference.definitionsSha256}));
    }else console.log(JSON.stringify({kind:'QUALIFIED_ACCOUNT_ERASURE_NATIVE_CHECKS',
      sourceSha256:readAccountErasureSource().sha256,postgresMajor:expectedCheckReference.postgresMajor,
      definitions:expectedCheckReference.definitions.length,definitionsSha256:expectedCheckReference.definitionsSha256,
      ...(checks.inactivity?{inactivity:{sourceSqlFileCount:79,definitions:checks.inactivity.definitions.length,definitionsSha256:checks.inactivity.definitionsSha256}}:{})}));
  }catch{console.error('ACCOUNT_ERASURE_QUALIFIED_SCHEMA_EVIDENCE_REQUIRED');process.exitCode=1;}
}else{
const latest = LATEST_REQUIRED_CUTOVER_MIGRATION;
const currentGridRoute = process.argv.includes('--current-grid-prewrite-plan');
const inactivityOffRoute=process.argv.includes('--account-erasure-plan');
const receiptRoute=process.argv.includes('--account-native-receipt-plan');
if(receiptRoute){
  assert.equal(process.argv.length,9);assert.deepEqual([process.argv[2],process.argv[3],process.argv[5],process.argv[7]],
    ['--account-native-receipt-plan','--migration-list','--dry-run','--migrations-directory']);
  assert.equal(process.env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(process.env.GITHUB_REF,'refs/heads/main');
  assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');assert.equal(process.env.GITHUB_JOB,'apply-binding');
  assert.equal(process.env.RAVRADAR_ACCOUNT_NATIVE_RECEIPT_OPT_IN,'true');
  assert.equal(process.env.GITHUB_WORKFLOW_REF,'jakobjorgensen82-commits/RavRadar/.github/workflows/apply-weather-model-binding-only.yml@refs/heads/main');
  assert(!inactivityOffRoute&&!currentGridRoute&&!process.argv.includes('--require-prewrite-gate')&&!process.argv.includes('--account-assistant-prewrite-plan')&&!process.argv.includes('--expected-pending-version'));
  for(const name of ['RAVRADAR_ACCOUNT_ERASURE_OPT_IN','RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN','RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN'])assert.notEqual(process.env[name],'true');
}
const selectedOffMigrations=inactivityOffRoute&&currentInactivityOff
  ?ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS:[ACCOUNT_ERASURE_APP_MIGRATION];
if(inactivityOffRoute){
  assert(ACCOUNT_ERASURE_APP_MIGRATION,'The explicit OFF route requires its current app descriptor');
  assert.equal(process.env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(process.env.GITHUB_REF,'refs/heads/main');
  assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');assert.equal(process.env.RAVRADAR_ACCOUNT_ERASURE_OPT_IN,'true');
  assert(!currentGridRoute&&!process.argv.includes('--account-assistant-prewrite-plan')&&!process.argv.includes('--expected-pending-version'));
  for(const name of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN','RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN'])assert.notEqual(process.env[name],'true');
}
assert.ok(!(currentGridRoute && process.argv.includes('--account-assistant-prewrite-plan')),
  'Current-grid and account/assistant prewrite routes are separate');
assert.equal(latest, REQUIRED_CUTOVER_MIGRATIONS.at(-1));
const plan = await assertSupabaseMigrationPlan({
  migrationListText: await fs.readFile(argument('--migration-list'), 'utf8'),
  dryRunText: await fs.readFile(argument('--dry-run'), 'utf8'),
  migrationsDirectory: path.resolve(argument('--migrations-directory')),
  allowAccountAssistantPrewritePlan: process.argv.includes('--account-assistant-prewrite-plan'),
  allowAccountErasurePlan:inactivityOffRoute,
  allowAccountNativeReceiptPlan:receiptRoute,
});
if (process.argv.includes('--require-prewrite-gate')
    && plan.pendingVersions.includes('20261010120000')) {
  assert.equal(process.env.RAVRADAR_ASSISTANT_PREWRITE_REQUIRED, 'true',
    'The pending assistant binding requires the completed normal original-preservation path');
}
if (plan.pendingVersions.includes('20261010130000')) {
  assert.equal(process.env.RAVRADAR_USERDATA_UPGRADE_OPT_IN, 'true',
    'The pending userdata binding requires explicit existing-owner-export opt-in');
  assert.ok(process.argv.includes('--require-prewrite-gate')
    && process.env.RAVRADAR_USERDATA_PREWRITE_REQUIRED === 'true'
    && process.env.RAVRADAR_USERDATA_PREWRITE_VERIFIED === 'true',
    'The pending userdata binding requires the completed normal original-preservation path');
}
if (plan.pendingVersions.includes(ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version)) {
  assert.equal(process.env.RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN, 'true',
    'Pending account/assistant binding requires its named opt-in');
  assert.ok(process.argv.includes('--account-assistant-prewrite-plan')
    && process.argv.includes('--require-prewrite-gate')
    && process.env.RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED === 'true'
    && process.env.RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_VERIFIED === 'true',
    'Pending account/assistant binding requires actual same-original prewrite proof');
}
if (process.argv.includes('--expected-pending-version')) {
  const expected = argument('--expected-pending-version');
  assert.equal(expected, currentGridRoute
    ? CURRENT_GRID_MIGRATION.version : ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version,
  currentGridRoute ? 'Only the fixed current-grid pending version can be pinned'
    : 'Only the fixed account/assistant pending version can be pinned');
  assert.deepEqual(plan.pendingVersions, [expected],
    'Pending plan changed or is already applied; do not reuse a one-install grant');
}
assert.ok(
  plan.pendingVersions.length === 0
    || (receiptRoute?plan.pendingVersions.length===1&&plan.pendingVersions[0]==='20261122200000'
      :inactivityOffRoute?plan.pendingVersions.length<=selectedOffMigrations.length
      &&plan.pendingVersions.every(version=>selectedOffMigrations.some(row=>row.version===version))
      :plan.pendingVersions.length===1&&plan.pendingVersions[0]===latest.version),
  'Code-only deployment may apply only the exact latest required integrated migration',
);
if (currentGridRoute || plan.pendingVersions.includes(CURRENT_GRID_MIGRATION.version)) {
  assert.equal(currentGridRoute, true,
    'Pending current-grid successor requires its exact prewrite route');
  assert.equal(process.env.RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN, 'true',
    'Pending current-grid binding requires its own named opt-in');
  assert.ok(process.argv.includes('--require-prewrite-gate')
    && process.env.RAVRADAR_CURRENT_GRID_PREWRITE_REQUIRED === 'true'
    && process.env.RAVRADAR_CURRENT_GRID_PREWRITE_VERIFIED === 'true',
  'Pending current-grid binding requires actual same-original prewrite proof');
  assert.equal(argument('--expected-pending-version'), CURRENT_GRID_MIGRATION.version,
    'Only the fixed current-grid pending version can be pinned');
  assert.deepEqual(plan.pendingVersions, [CURRENT_GRID_MIGRATION.version],
    'Current-grid plan changed or is already applied; do not reuse a one-install grant');
}
if(receiptRoute)console.log(JSON.stringify({kind:'ACCOUNT_NATIVE_RECEIPT_FINITE_PLAN',pendingVersions:plan.pendingVersions,activationAuthority:false}));
else console.log(
  plan.pendingVersions.length === 0
    ? 'Code-only migration is already applied; retry is safe.'
    : `Code-only migration dry-run contains exactly ${inactivityOffRoute?selectedOffMigrations.filter(row=>plan.pendingVersions.includes(row.version)).map(row=>row.filename).join(', '):latest.filename}.`,
);
}
