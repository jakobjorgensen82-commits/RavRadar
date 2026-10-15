#!/usr/bin/env node
// Proposed scripts/verify-statistics-preference-revision-plan.mjs. Plan only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertSupabaseMigrationPlan,assertSupabaseMigrationsApplied,parseSupabaseMigrationList,REQUIRED_CUTOVER_MIGRATIONS,LATEST_REQUIRED_CUTOVER_MIGRATION}
  from './integrated-cutover-readiness.mjs';
import {STATISTICS_REVISION_MIGRATION,STATISTICS_REVISION_PREDECESSOR}
  from './build-statistics-preference-revision.mjs';

// Select one explicit phase from linked migration identities, never by probing
// schema2 and falling back to schema1. This selects a plan, not write authority.
export function selectStatisticsRevisionRoute({migrationListText,environment=process.env}) {
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(environment.GITHUB_REF,'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');
  const optIn=environment.RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN;
  assert(['true','false'].includes(optIn),'Explicit statistics opt-in state required');
  for(const name of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN',
    'RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN']) {
    assert.notEqual(environment[name],'true','Statistics route cannot combine historical upgrade scopes');
  }
  assert.equal(LATEST_REQUIRED_CUTOVER_MIGRATION.version,STATISTICS_REVISION_PREDECESSOR);
  const rows=parseSupabaseMigrationList(migrationListText);
  const remote=rows.map(row=>row.remote).filter(Boolean).sort();
  for(const {version} of REQUIRED_CUTOVER_MIGRATIONS)
    assert(remote.includes(version),'Statistics route requires every installed predecessor: '+version);
  const revision=STATISTICS_REVISION_MIGRATION.version;
  const installed=remote.includes(revision);
  assert.equal(remote.at(-1),installed?revision:STATISTICS_REVISION_PREDECESSOR,
    'No unknown later migration in the fixed statistics route');
  if(installed) {
    assert.equal(optIn,'false','No replay of an already applied statistics grant');
    return 'installed';
  }
  assert.equal(optIn,'true','Pending statistics revision requires its named opt-in');
  assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');
  assert.equal(environment.RAVRADAR_STATISTICS_REVISION_CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.notEqual(environment.RAVRADAR_STATISTICS_REVISION_SAVED_WEATHER,'true');
  assert.equal(environment.RAVRADAR_STATISTICS_REVISION_RECOVERY_RUN_ID,'');
  return 'before';
}

async function main(){
if(process.argv[2]==='--select'){
  assert.equal(process.argv.length,5);assert.equal(process.argv[3],'--migration-list');
  const phase=selectStatisticsRevisionRoute({migrationListText:await fs.readFile(process.argv[4],'utf8')});
  assert(typeof process.env.GITHUB_ENV==='string'&&process.env.GITHUB_ENV.length>0);
  await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_STATISTICS_REVISION_PHASE='+phase+'\n');
  return;
}
const allowed=['--phase','--migration-list','--dry-run','--migrations-directory'];
const args=process.argv.slice(2);assert.equal(args.length,8);
const values=new Map();
for(let i=0;i<args.length;i+=2){assert(allowed.includes(args[i])&&!values.has(args[i])&&args[i+1]);values.set(args[i],args[i+1]);}
assert.equal(values.size,4);
assert.equal(process.env.GITHUB_EVENT_NAME,'workflow_dispatch');
assert.equal(process.env.GITHUB_REF,'refs/heads/main');
assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');
const phase=values.get('--phase');assert(['before','installed'].includes(phase));
const migrationListText=await fs.readFile(values.get('--migration-list'),'utf8');
const dryRunText=await fs.readFile(values.get('--dry-run'),'utf8');
const result=await assertSupabaseMigrationPlan({migrationListText,dryRunText,
  migrationsDirectory:path.resolve(values.get('--migrations-directory')),allowStatisticsPreferenceRevisionPlan:true});
const rows=parseSupabaseMigrationList(migrationListText);
const remote=rows.map(row=>row.remote).filter(Boolean).sort();
if(phase==='before'){
  assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');
  assert.equal(process.env.RAVRADAR_STATISTICS_REVISION_PREWRITE_VERIFIED,'true');
  assert.equal(process.env.RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN,'true');
  assert.notEqual(process.env.RAVRADAR_USERDATA_UPGRADE_OPT_IN,'true');
  assert.notEqual(process.env.RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN,'true');
  assert.notEqual(process.env.RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN,'true');
  assert.deepEqual(result.pendingVersions,[STATISTICS_REVISION_MIGRATION.version],
    'Exact one pending statistics migration; no already-applied grant replay');
  assert.equal(remote.at(-1),STATISTICS_REVISION_PREDECESSOR);
}else{
  assert.equal(process.env.RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN,'false');
  assertSupabaseMigrationsApplied(migrationListText);
  assert.deepEqual(result.pendingVersions,[]);
  assert.equal(remote.at(-1),STATISTICS_REVISION_MIGRATION.version);
  assert(rows.some(row=>row.local===STATISTICS_REVISION_MIGRATION.version&&row.remote===row.local));
}
console.log('Exact statistics revision '+phase+' plan verified; no write or installation performed.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) await main();
