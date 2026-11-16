#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {execFileSync} from 'node:child_process';
import {readAccountErasureSource,verifyInstalledAccountErasureSchema} from './verify-account-erasure-schema.mjs';
import {
  LATEST_REQUIRED_CUTOVER_MIGRATION,
  REQUIRED_CUTOVER_MIGRATIONS,
  ACCOUNT_ASSISTANT_SOURCE_MIGRATION,
  assertSupabaseMigrationPlan,
} from './integrated-cutover-readiness.mjs';
import * as accountInactivityCutover from './integrated-cutover-readiness.mjs';
const ACCOUNT_ERASURE_APP_MIGRATION=accountInactivityCutover.ACCOUNT_ERASURE_APP_MIGRATION;
import { CURRENT_GRID_MIGRATION } from './lib/current-grid-successor-source.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error('Missing ' + name);
  return process.argv[index + 1];
}

async function qualifyCurrentAccountErasureChecks(){
  assert.equal(process.env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(process.env.GITHUB_REF,'refs/heads/main');
  assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');assert.equal(process.env.RAVRADAR_ACCOUNT_ERASURE_OPT_IN,'true');
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
  const {qualifySourceImpactFullBaseline,qualifiedAccountErasureChecks}=await import('./source-impact-full-baseline.mjs');
  const access=sourceImpactEvidenceAccess({env:process.env});
  const qualified=await qualifySourceImpactFullBaseline({candidateCommit:head,reference},{...access,readGit});
  const facit=qualifiedAccountErasureChecks(qualified);
  assert(facit&&facit.candidateCommit===head&&facit.migrationSQLSha256===readAccountErasureSource().sha256,
    'The exact qualified native phase must contain this app SQL CHECK facit');
  return facit.checkReference;
}
const appProofMode=process.argv[2];
if(['--qualify-account-erasure-source','--read-account-erasure-installed'].includes(appProofMode)){
  try{
    assert.equal(process.argv.length,3);const expectedCheckReference=await qualifyCurrentAccountErasureChecks();
    if(appProofMode==='--read-account-erasure-installed'){
      const receipt=await verifyInstalledAccountErasureSchema({accessToken:process.env.SUPABASE_ACCESS_TOKEN,expectedCheckReference});
      const {checkReference,...summary}=receipt;
      console.log(JSON.stringify({...summary,checkDefinitions:checkReference.definitions.length,
        postgresMajor:checkReference.postgresMajor,checkDefinitionsSha256:checkReference.definitionsSha256}));
    }else console.log(JSON.stringify({kind:'QUALIFIED_ACCOUNT_ERASURE_NATIVE_CHECKS',
      sourceSha256:readAccountErasureSource().sha256,postgresMajor:expectedCheckReference.postgresMajor,
      definitions:expectedCheckReference.definitions.length,definitionsSha256:expectedCheckReference.definitionsSha256}));
  }catch{console.error('ACCOUNT_ERASURE_QUALIFIED_SCHEMA_EVIDENCE_REQUIRED');process.exitCode=1;}
}else{
const latest = LATEST_REQUIRED_CUTOVER_MIGRATION;
const currentGridRoute = process.argv.includes('--current-grid-prewrite-plan');
const inactivityOffRoute=process.argv.includes('--account-erasure-plan');
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
    || (plan.pendingVersions.length === 1 && plan.pendingVersions[0]
      ===(inactivityOffRoute?ACCOUNT_ERASURE_APP_MIGRATION.version:latest.version)),
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
console.log(
  plan.pendingVersions.length === 0
    ? 'Code-only migration is already applied; retry is safe.'
    : `Code-only migration dry-run contains exactly ${inactivityOffRoute?ACCOUNT_ERASURE_APP_MIGRATION.filename:latest.filename}.`,
);
}
