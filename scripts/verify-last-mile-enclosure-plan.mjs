#!/usr/bin/env node
// Fixed584 source/SQL plan only. Never a SQL installer or archive authority.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseSupabaseMigrationList,assertLastMileEnclosureMigrationPlan,
  assertLastMileEnclosureMigrationsApplied,lastMileEnclosureRequiredMigrations}
  from './integrated-cutover-readiness.mjs';
import {LAST_MILE_ENCLOSURE_BEFORE,lastMileEnclosureMigration,requireLastMileEnclosureOutput,
  readLastMileEnclosureCanonicalSource} from './lib/last-mile-enclosure-successor-source.mjs';
import {assertCurrentMemoryWarmupArchivesAbsent} from './lib/current-memory-warmup-successor-source.mjs';
const PREDECESSOR_VERSION=LAST_MILE_ENCLOSURE_BEFORE.version;
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
  &&Object.getPrototypeOf(value)===Object.prototype;
function exactOptions(value,required,optional=[]){
  assert(plain(value));const keys=Object.keys(value);
  assert(required.every(key=>keys.includes(key))&&keys.every(key=>[...required,...optional].includes(key)),
    'LAST_MILE_ENCLOSURE_FIXED_ARGUMENTS');
}
export function assertLastMileEnclosurePlanCaller(environment){
  requireLastMileEnclosureOutput(); // FIRST, including before environment getters.
  assert.equal(arguments.length,1);
  const descriptor=lastMileEnclosureMigration();
  assert.equal(descriptor.version,'20261019060000');assert(descriptor.version>PREDECESSOR_VERSION);
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(environment.GITHUB_REF,'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');
  assert.equal(environment.GITHUB_WORKFLOW,'Deploy RavRadar code-only repair');
  assert.match(environment.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);
  assert.match(environment.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert(['true','false'].includes(environment.RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN));
  assert.equal(environment.RAVRADAR_LAST_MILE_ENCLOSURE_CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.equal(environment.RAVRADAR_LAST_MILE_ENCLOSURE_WRITER_ACTIVE,'false');
  for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN','RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN',
    'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN',
    'RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN','RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN'])
    assert.notEqual(environment[key],'true','LAST_MILE_ENCLOSURE_EXCLUSIVE_SOURCE_PHASE');
  return descriptor;
}
export function selectLastMileEnclosureRoute(options){
  requireLastMileEnclosureOutput();
  assert.equal(arguments.length,1);exactOptions(options,['migrationListText'],['environment']);
  const environment=options.environment??process.env,descriptor=assertLastMileEnclosurePlanCaller(environment);
  const required=lastMileEnclosureRequiredMigrations();
  assert.equal(required.length,53);assert.equal(required.at(-2).version,PREDECESSOR_VERSION);
  const rows=parseSupabaseMigrationList(options.migrationListText);
  const local=rows.map(row=>row.local).filter(Boolean),remote=rows.map(row=>row.remote).filter(Boolean);
  assert.equal(new Set(local).size,local.length,'LAST_MILE_ENCLOSURE_DUPLICATE_LOCAL_VERSION');
  assert.equal(new Set(remote).size,remote.length,'LAST_MILE_ENCLOSURE_DUPLICATE_REMOTE_VERSION');
  assertCurrentMemoryWarmupArchivesAbsent(new Set(local),new Set(remote));
  const allowed=new Set(required.map(row=>row.version)),first=required[0].version;
  // Same normalized chronological comparison as the existing normal planner.
  const key=version=>version.padEnd(14,'0');
  for(const version of [...local,...remote])assert(allowed.has(version)||key(version)<key(first),
    'LAST_MILE_ENCLOSURE_UNKNOWN_POST_CUTOVER_VERSION');
  for(const {version}of required){assert(local.includes(version),'LAST_MILE_ENCLOSURE_MISSING_LOCAL_SOURCE');
    if(version!==descriptor.version)assert(remote.includes(version),'LAST_MILE_ENCLOSURE_MISSING_INSTALLED_PREDECESSOR');}
  const installed=remote.includes(descriptor.version);
  assert.equal([...remote].sort((a,b)=>key(a).localeCompare(key(b))).at(-1),
    installed?descriptor.version:PREDECESSOR_VERSION,'LAST_MILE_ENCLOSURE_EXACT_INSTALLED_BOUNDARY');
  const pending=local.filter(version=>!remote.includes(version));
  assert.deepEqual(pending,installed?[]:[descriptor.version],'LAST_MILE_ENCLOSURE_SOLE_PENDING_SOURCE');
  assert.equal(environment.RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN,installed?'false':'true',
    'LAST_MILE_ENCLOSURE_NO_CONSUMED_GRANT_REPLAY');
  return installed?'installed':'before';
}
export async function verifyLastMileEnclosurePlan(options){
  requireLastMileEnclosureOutput();
  assert.equal(arguments.length,1);exactOptions(options,['phase','migrationListText','dryRunText','migrationsDirectory'],['environment']);
  const {phase,migrationListText,dryRunText,migrationsDirectory}=options,environment=options.environment??process.env;
  assert(['before','installed'].includes(phase));
  assert.equal(selectLastMileEnclosureRoute({migrationListText,environment}),phase);
  await readLastMileEnclosureCanonicalSource({migrationsDirectory});
  const result=await assertLastMileEnclosureMigrationPlan({migrationListText,dryRunText,migrationsDirectory});
  if(phase==='before')assert.deepEqual(result.pendingVersions,[lastMileEnclosureMigration().version]);
  else{assertLastMileEnclosureMigrationsApplied(migrationListText);assert.deepEqual(result.pendingVersions,[]);}
  // A successful plan does NOT prove originals/prewrite/SQL execution.
  return result;
}
async function main(){
  assertLastMileEnclosurePlanCaller(process.env); // UNISSUED before files/arguments.
  const args=process.argv.slice(2);
  if(args[0]==='--select'){
    assert.equal(args.length,3);assert.equal(args[1],'--migration-list');
    const phase=selectLastMileEnclosureRoute({migrationListText:await fs.readFile(args[2],'utf8')});
    assert(typeof process.env.GITHUB_ENV==='string'&&process.env.GITHUB_ENV.length>0);
    await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_LAST_MILE_ENCLOSURE_PHASE='+phase+'\n'
      +'RAVRADAR_LAST_MILE_ENCLOSURE_EDGE_REQUIRED=true\n');
    console.log('Fixed last-mile source phase selected; no archive/prewrite/SQL authority.');return;
  }
  const keys=['--phase','--migration-list','--dry-run','--migrations-directory'];
  assert.equal(args.length,8);const options=new Map();
  for(let i=0;i<args.length;i+=2){assert(keys.includes(args[i])&&!options.has(args[i])&&args[i+1]);options.set(args[i],args[i+1]);}
  await verifyLastMileEnclosurePlan({phase:options.get('--phase'),
    migrationListText:await fs.readFile(options.get('--migration-list'),'utf8'),
    dryRunText:await fs.readFile(options.get('--dry-run'),'utf8'),
    migrationsDirectory:path.resolve(options.get('--migrations-directory'))});
  console.log('Exact last-mile SQL plan verified; no installation performed.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
