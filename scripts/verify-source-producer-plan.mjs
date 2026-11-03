// Exact SOURCE plan through the existing normal migration validators. This
// reads local control evidence only; it cannot execute SQL or admit B/S.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireSourceProducerOutput,sourceProducerMigration} from './lib/source-producer-successor-source.mjs';
import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';
import {assertSourceProducerMigrationPlan,assertSourceProducerMigrationsApplied}
  from './integrated-cutover-readiness.mjs';

// Pure pending-write policy only, never source, original or SQL admission.
// The real caller below supplies its version from the normally issued source
// AFTER canonical migration/history/dry-run verification.
export function sourceProducerSqlWriteRequired(phase,pendingVersions,version){
  assert.equal(arguments.length,3);assert(['before','installed'].includes(phase));
  assert.match(version,/^[0-9]{14}$/);assert(Array.isArray(pendingVersions));
  if(phase==='before'&&pendingVersions.length===1){
    assert.deepEqual(pendingVersions,[version]);return true;
  }
  assert.deepEqual(pendingVersions,[]);return false;
}

export async function verifySourceProducerPlan(options){
  requireSourceProducerOutput(); // FIRST, before options, environment or files.
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  const keys=Object.keys(options).sort(),required=['dryRunText','migrationListText','migrationsDirectory','phase'];
  assert.deepEqual(keys,options.environment===undefined?required:['dryRunText','environment','migrationListText','migrationsDirectory','phase']);
  const {phase,migrationListText,dryRunText,migrationsDirectory}=options,environment=options.environment??process.env;
  assertSourceProducerCodeOnlyCaller(environment);
  assert(['before','installed'].includes(phase));assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_PHASE,phase);
  assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN,phase==='before'?'true':'false');
  const result=await assertSourceProducerMigrationPlan({migrationListText,dryRunText,migrationsDirectory});
  if(phase==='before'){
    assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY,'predecessor');
    for(const key of ['RAVRADAR_SOURCE_PRODUCER_ORIGINALS_VERIFIED','RAVRADAR_SOURCE_PRODUCER_NOLOSS_VERIFIED',
      'RAVRADAR_SOURCE_PRODUCER_PREWRITE_VERIFIED'])assert.equal(environment[key],'true');
    // A previous response may have been lost after the SQL commit but before
    // B publication. Keep the exact fresh585 B/S preservation route; if the
    // canonical live history says installed, never execute that SQL again.
  }else{
    assertSourceProducerMigrationsApplied(migrationListText);assert.deepEqual(result.pendingVersions,[]);
  }
  const sqlWriteRequired=sourceProducerSqlWriteRequired(phase,result.pendingVersions,sourceProducerMigration().version);
  if(!sqlWriteRequired)assertSourceProducerMigrationsApplied(migrationListText);
  // Revalidate the fixed caller after the awaited canonical-source checks.
  assertSourceProducerCodeOnlyCaller(environment);return Object.freeze({...result,sqlWriteRequired});
}

async function main(){
  requireSourceProducerOutput();assertSourceProducerCodeOnlyCaller(process.env);
  const args=process.argv.slice(2),keys=['--phase','--migration-list','--dry-run','--migrations-directory'];
  assert.equal(args.length,8);const values=new Map();
  for(let index=0;index<args.length;index+=2){
    assert(keys.includes(args[index])&&!values.has(args[index])&&args[index+1]);values.set(args[index],args[index+1]);
  }
  const result=await verifySourceProducerPlan({phase:values.get('--phase'),
    migrationListText:await fs.readFile(values.get('--migration-list'),'utf8'),
    dryRunText:await fs.readFile(values.get('--dry-run'),'utf8'),
    migrationsDirectory:path.resolve(values.get('--migrations-directory'))});
  console.log('SOURCE_PRODUCER_SQL_WRITE_REQUIRED='+result.sqlWriteRequired);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main().catch(()=>{
  console.error('SOURCE_PRODUCER_PLAN_REFUSED');process.exitCode=1;
});
