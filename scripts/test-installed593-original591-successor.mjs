// Normale kilde-/plan-/læsekontrakter; ingen faktisk database eller B/S.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withSource594CodeParent} from './check-assistant-later-h0-predecessor-source.mjs';
import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE,INACTIVE_INSTALLED593_ORIGINAL591_SUCCESSOR as HISTORICAL,
  INACTIVE_SCALAR597_LATER_H0_SUCCESSOR as SCALAR,UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as AFTER597,
  ASSISTANT_PUBLIC591_SUCCESSOR_BINDING as DB593,
  ASSISTANT_PUBLIC591_SUCCESSOR_OUTPUT as OUTPUT593,ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE as ORIGINAL591,
  readAssistantPublic591SuccessorCanonicalSource,readInstalled593Original591CanonicalSource}
  from './lib/assistant-later-h0-successor-source.mjs';
import {buildInstalled593Original591BindingSuccessor} from './build-assistant-later-h0-successor.mjs';
import {installed593Original591RequiredMigrations,assistantPublic591SuccessorRequiredMigrations,
  assertInstalled593Original591MigrationPlan,assertInstalled593Original591MigrationsApplied,
  assertSupabaseMigrationPlan,expectedCheckpointCasContract,expectedTripBindingPolicy,
  prepareTemporarySupabaseCutoverWorkdir} from './integrated-cutover-readiness.mjs';
import {assertAssistantBindingPrewriteCaller} from './assistant-later-h0-binding-prewrite.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
assert([HISTORICAL,SCALAR,AFTER597].includes(ACTIVE));
assert.equal(HISTORICAL.sourcePhase,'assistant-installed593-origin591-successor');
assert.equal(HISTORICAL.requireRelease(),'4.0.594');
assert.deepEqual(HISTORICAL.before,ORIGINAL591);
assert.deepEqual(HISTORICAL.databaseBefore,{...DB593,canonicalSha256:OUTPUT593.canonicalSha256});
const current=HISTORICAL.requireBinding(),output=HISTORICAL.requireOutput(),migration=HISTORICAL.migration();
const laterThan594=[SCALAR,AFTER597].includes(ACTIVE);
const result=laterThan594?await withSource594CodeParent(async frozen=>{
  const historical=await import(pathToFileURL(path.join(frozen,'scripts/build-assistant-later-h0-successor.mjs')).href);
  return historical.buildInstalled593Original591BindingSuccessor({version:current.version});
}):await buildInstalled593Original591BindingSuccessor({version:current.version});
assert.deepEqual(result.nextBinding,current);assert.equal(result.aliases.length,0);assert.equal(result.wholeCanonicalInverse,true);
assert.equal(result.originalStateFamily,'591');assert.equal(result.sameH0Capability,false);assert.equal(result.numericalSqlRulesChanged,false);
assert.deepEqual(await fs.readFile(path.join(root,'supabase/migrations',migration.filename)),Buffer.from(result.migration));
assert.equal((await readAssistantPublic591SuccessorCanonicalSource()).canonicalSource.length>0,true);
assert.equal((await readInstalled593Original591CanonicalSource()).canonicalSource,result.canonicalSource);
assert.equal((await expectedCheckpointCasContract({sourcePhase:HISTORICAL.sourcePhase})).sha256,output.checkpointContractSha256);
assert.equal((await expectedTripBindingPolicy({sourcePhase:HISTORICAL.sourcePhase})).sha256,output.tripBindingPolicySha256);
const required=installed593Original591RequiredMigrations(),oldRequired=assistantPublic591SuccessorRequiredMigrations();
assert.equal(oldRequired.length,60);assert.equal(required.length,61);assert.deepEqual(required.slice(0,-1),oldRequired);
assert.equal(required.at(-2).version,DB593.version);assert.deepEqual(required.at(-1),migration);
const list=(installed=false,omitRemote=null)=>'Local | Remote | Time (UTC)\n'
  +required.map(row=>row.version+' | '+((row.version===migration.version&&!installed)||row.version===omitRemote?'':row.version)+' | synthetic').join('\n');
const dry='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '+migration.filename+'\nFinished supabase db push.';
const noop='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.';
assert.deepEqual((await assertInstalled593Original591MigrationPlan({migrationListText:list(),dryRunText:dry})).pendingVersions,[migration.version]);
assert.deepEqual((await assertInstalled593Original591MigrationPlan({migrationListText:list(true),dryRunText:noop})).pendingVersions,[]);
assert.equal(assertInstalled593Original591MigrationsApplied(list(true)).appliedVersions.length,61);
await assert.rejects(assertInstalled593Original591MigrationPlan({migrationListText:list(false,DB593.version),dryRunText:dry}));
await assert.rejects(assertInstalled593Original591MigrationPlan({migrationListText:list(),dryRunText:noop}));
assert.throws(()=>assertInstalled593Original591MigrationsApplied(list()));
await assert.rejects(assertSupabaseMigrationPlan({migrationListText:list(),dryRunText:dry}));
const parent=await fs.realpath(os.tmpdir()),work=await fs.mkdtemp(path.join(parent,'rr594-normal-plan-'));
const prepared=await prepareTemporarySupabaseCutoverWorkdir({workdir:work,includeStatisticsPreferenceRevisionSource:true,sourcePhase:HISTORICAL.sourcePhase});
assert.equal((await fs.readdir(prepared.migrationsDirectory)).filter(name=>name.endsWith('.sql')).length,61);
if(laterThan594){
  await assert.rejects(assertSupabaseMigrationPlan({migrationListText:list(true),dryRunText:noop}));
  await withSource594CodeParent(async frozen=>{
    const historical=await import(pathToFileURL(path.join(frozen,'scripts/integrated-cutover-readiness.mjs')).href);
    await assert.rejects(historical.assertSupabaseMigrationPlan({migrationListText:list(),dryRunText:dry,migrationsDirectory:prepared.migrationsDirectory}));
    assert.deepEqual((await historical.assertSupabaseMigrationPlan({migrationListText:list(true),dryRunText:noop,migrationsDirectory:prepared.migrationsDirectory})).pendingVersions,[]);
  });
}else assert.deepEqual((await assertSupabaseMigrationPlan({migrationListText:list(true),dryRunText:noop})).pendingVersions,[]);
const descriptor={modelBinding:{modelBundleSha256:ORIGINAL591.I},
  contractHashes:{continuationStateContractSha256:ORIGINAL591.T},productionReferenceAt:'2026-10-30T23:00:00.000Z'};
assert.equal(HISTORICAL.assertTarget(descriptor,'2026-10-31T00:00:00.000Z'),true);
assert.throws(()=>HISTORICAL.assertTarget(descriptor,descriptor.productionReferenceAt));
assert.throws(()=>HISTORICAL.assertTarget({...descriptor,modelBinding:{modelBundleSha256:DB593.I}},'2026-10-31T00:00:00.000Z'));
const env={GITHUB_WORKFLOW:'Apply RavRadar backend bindings without weather',GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_REF:'refs/heads/main',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',
  RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN:'true',RAVRADAR_ASSISTANT_LATER_H0_BINDING_CONFIRMATION:'APPLY-WEATHER-MODEL-BINDING'};
const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
try{Object.assign(process.env,env);assert.deepEqual(assertAssistantBindingPrewriteCaller(),ACTIVE.requireBinding());
  process.env.GITHUB_RUN_ATTEMPT='2';assert.throws(()=>assertAssistantBindingPrewriteCaller());
}finally{for(const key of Object.keys(env))if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
assert.deepEqual((await assertInstalled593Original591MigrationPlan({migrationListText:list(),dryRunText:dry,migrationsDirectory:prepared.migrationsDirectory})).pendingVersions,[migration.version]);
console.log(JSON.stringify({kind:'NORMAL_INSTALLED593_ORIGINAL591_ROLLEPROEVE',status:'PASS',requiredMigrations:61,
  oldSqlPreserved:71,aliasesAdded:0,databaseBeforeRelease:593,originalStateFamily:591,sameH0Refused:true,
  missingInstalled593Refused:true,genericPendingInstallRefused:true,wholeCanonicalInverse:true,sqlExecuted:false,productionProof:false}));
