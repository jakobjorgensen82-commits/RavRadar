#!/usr/bin/env node
// Fixed established-origin successor. No caller tuple, version or source override.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseSupabaseMigrationList,assertEstablishedNativeCurrentOriginMigrationPlan,
  assertEstablishedNativeCurrentOriginMigrationsApplied,establishedNativeCurrentOriginRequiredMigrations}
  from './integrated-cutover-readiness.mjs';
const PREDECESSOR_VERSION='20261017020000';
import {establishedNativeCurrentOriginMigration,requireEstablishedNativeCurrentOriginOutput,
  readEstablishedNativeCurrentOriginCanonicalSource}
  from './lib/established-native-current-origin-successor-source.mjs';
import {assertCurrentMemoryWarmupArchivesAbsent} from './lib/current-memory-warmup-successor-source.mjs';

function authority(environment){
  requireEstablishedNativeCurrentOriginOutput(); // FIRST: no I/O or caller input while unissued
  const descriptor=establishedNativeCurrentOriginMigration();
  assert(descriptor.version>PREDECESSOR_VERSION);
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(environment.GITHUB_REF,'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');
  assert(['true','false'].includes(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN));
  for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN',
    'RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN'])
    assert.notEqual(environment[key],'true','Response and historical upgrade scopes are exclusive');
  return descriptor;
}
export function selectEstablishedNativeCurrentOriginRoute({migrationListText,environment=process.env}){
  const descriptor=authority(environment);
  const rows=parseSupabaseMigrationList(migrationListText);
  const local=rows.map(row=>row.local).filter(Boolean);
  const remote=rows.map(row=>row.remote).filter(Boolean).sort();
  assertCurrentMemoryWarmupArchivesAbsent(new Set(local),new Set(remote));
  for(const {version} of establishedNativeCurrentOriginRequiredMigrations().slice(0,-1))
    assert(remote.includes(version),'Response requires every genuinely installed predecessor');
  const installed=remote.includes(descriptor.version);
  assert.equal(remote.at(-1),installed?descriptor.version:PREDECESSOR_VERSION,
    'Response refuses an unknown later or missing immediate predecessor');
  if(installed){
    assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN,'false','No consumed-grant replay');
    return 'installed';
  }
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN,'true','Named response opt-in is required');
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_WRITER_ACTIVE,'false');
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_ORIGINALS_VERIFIED,'true');
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_NOLOSS_VERIFIED,'true');
  assert.notEqual(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_SAVED_WEATHER,'true');
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_RECOVERY_RUN_ID,'');
  return 'before';
}
export async function verifyEstablishedNativeCurrentOriginPlan({phase,migrationListText,dryRunText,
  migrationsDirectory,environment=process.env}){
  const descriptor=authority(environment);
  assert(['before','installed'].includes(phase));
  assert.equal(selectEstablishedNativeCurrentOriginRoute({migrationListText,environment}),phase);
  await readEstablishedNativeCurrentOriginCanonicalSource({migrationsDirectory});
  const result=await assertEstablishedNativeCurrentOriginMigrationPlan({migrationListText,dryRunText,
    migrationsDirectory});
  if(phase==='before'){
    assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PREWRITE_VERIFIED,'true');
    assert.deepEqual(result.pendingVersions,[descriptor.version]);
  }else{
    assertEstablishedNativeCurrentOriginMigrationsApplied(migrationListText);
    assert.deepEqual(result.pendingVersions,[]);
  }
  return result;
}
async function main(){
  authority(process.env);
  const args=process.argv.slice(2);
  if(args[0]==='--select'){
    assert.equal(args.length,3);assert.equal(args[1],'--migration-list');
    const phase=selectEstablishedNativeCurrentOriginRoute({migrationListText:await fs.readFile(args[2],'utf8')});
    assert(typeof process.env.GITHUB_ENV==='string'&&process.env.GITHUB_ENV.length>0);
    await fs.appendFile(process.env.GITHUB_ENV,
      'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE='+phase+'\n'
      +'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_METADATA_ONLY=true\n'
      +'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_EDGE_REQUIRED=true\n');
    return;
  }
  const keys=['--phase','--migration-list','--dry-run','--migrations-directory'];
  assert.equal(args.length,8);const options=new Map();
  for(let i=0;i<args.length;i+=2){
    assert(keys.includes(args[i])&&!options.has(args[i])&&args[i+1]);
    options.set(args[i],args[i+1]);
  }
  await verifyEstablishedNativeCurrentOriginPlan({phase:options.get('--phase'),
    migrationListText:await fs.readFile(options.get('--migration-list'),'utf8'),
    dryRunText:await fs.readFile(options.get('--dry-run'),'utf8'),
    migrationsDirectory:path.resolve(options.get('--migrations-directory'))});
  console.log('Exact named response plan verified; no installation performed.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
