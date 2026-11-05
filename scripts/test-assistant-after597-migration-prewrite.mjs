// Udstedelsesfri kildeprøve. Ingen database, B/S-kapabilitet eller produktion.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as next,readScalar597LaterH0CanonicalSource,
  assistantAfter597CheckpointContractFromBase} from './lib/assistant-later-h0-successor-source.mjs';
import {prepareAssistantAfter597PredecessorAliases} from './build-assistant-later-h0-successor.mjs';
import {assistantAfter597PrewritePredecessor} from './assistant-later-h0-binding-prewrite.mjs';
import {REQUIRED_CUTOVER_MIGRATIONS,DEFAULT_CUTOVER_SOURCE_PHASE,scalar597LaterH0RequiredMigrations,
  assertScalar597LaterH0MigrationPlan,assertSupabaseMigrationsApplied,
  assistantAfter597RequiredMigrations,assertAssistantAfter597MigrationsApplied,assertAssistantAfter597MigrationPlan,
  prepareAssistantAfter597CutoverWorkdir,hydrateAssistantAfter597RemoteMigrationHistory,
  inspectMigrationSources,expectedCheckpointCasContract,expectedTripBindingPolicy,
  checkpointCasContractFromCanonicalSource,prepareTemporarySupabaseCutoverWorkdir,
  hydrateTemporaryRemoteMigrationHistory,verifyIntegratedDatabaseReadback} from './integrated-cutover-readiness.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const phase='assistant-mixed-after597-successor';
const rows=scalar597LaterH0RequiredMigrations();
const list=(values=rows)=>'Local | Remote | Time (UTC)\n'+values.map(row=>row.version+' | '+row.version+' | ').join('\n');
const upToDate='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.\n';

test('den faktiske597-plan og alle gamle krav bevares uden SOURCE eller en uudstedt migration',async()=>{
  assert.equal(rows.length,62);assert.deepEqual(REQUIRED_CUTOVER_MIGRATIONS,rows);
  assert.equal(rows.at(-1).version,next.before.version);
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR);
  assert.equal(DEFAULT_CUTOVER_SOURCE_PHASE,'scalar597-later-h0-original594-successor');
  const plan=await assertScalar597LaterH0MigrationPlan({migrationListText:list(),dryRunText:upToDate,
    migrationsDirectory:path.join(ROOT,'supabase/migrations')});
  assert.deepEqual(plan.pendingVersions,[]);assert.equal(plan.alreadyAppliedVersions.length,62);
  assert.equal(assertSupabaseMigrationsApplied(list()).appliedVersions.length,62);
  await assert.rejects(assertScalar597LaterH0MigrationPlan({migrationListText:list([...rows,{version:'20261103012633'}]),
    dryRunText:upToDate,migrationsDirectory:path.join(ROOT,'supabase/migrations')}));
  await assert.rejects(assertScalar597LaterH0MigrationPlan({migrationListText:list([...rows,rows.at(-1)]),
    dryRunText:upToDate,migrationsDirectory:path.join(ROOT,'supabase/migrations')}));
});

test('den faste efter597-plan og normale førskrivningsgren afviser uudstedt før alle læsere og skrivere',async()=>{
  const names=['readFile','readdir','mkdir','writeFile','copyFile','lstat','stat'];
  const saved=new Map(names.map(key=>[key,fs[key]])),fetch=globalThis.fetch;let io=0;
  for(const key of names)fs[key]=async()=>{io++;throw new Error('UVENTET_FILADGANG');};
  globalThis.fetch=async()=>{io++;throw new Error('UVENTET_NETADGANG');};
  const hostile=new Proxy({},{get(){io++;throw new Error('ARGUMENTER_MÅ_IKKE_LÆSES_FØR_UDSTEDELSE');}});
  try{
    assert.throws(()=>assistantAfter597RequiredMigrations(),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>assertAssistantAfter597MigrationsApplied('ingen læsning'),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>assistantAfter597PrewritePredecessor(),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>assistantAfter597PrewritePredecessor({family:'594'}),/Ingen caller-valgt/);
    for(const work of [
      ()=>assertAssistantAfter597MigrationPlan(hostile),
      ()=>prepareAssistantAfter597CutoverWorkdir(hostile),
      ()=>hydrateAssistantAfter597RemoteMigrationHistory(hostile),
      ()=>inspectMigrationSources({sourcePhase:phase}),
      ()=>expectedCheckpointCasContract({sourcePhase:phase}),
      ()=>expectedTripBindingPolicy({sourcePhase:phase}),
      ()=>prepareTemporarySupabaseCutoverWorkdir({sourcePhase:phase}),
      ()=>hydrateTemporaryRemoteMigrationHistory({sourcePhase:phase}),
      ()=>verifyIntegratedDatabaseReadback({sourcePhase:phase}),
    ])await assert.rejects(work(),/ASSISTANT_AFTER597_UNISSUED/);
    await assert.rejects(expectedCheckpointCasContract({sourcePhase:phase+'-ukendt'}),{code:'ERR_ASSERTION'});
    assert.equal(io,0);
  }finally{for(const[key,value]of saved)fs[key]=value;globalThis.fetch=fetch;}
  assert.equal(next.binding,null);assert.equal(next.output,null);
});

test('normal kontraktlæser kan behandle ægte597-aliasdata uden at give dem installationsautoritet',async()=>{
  const prior=await readScalar597LaterH0CanonicalSource();
  const aliasData=await prepareAssistantAfter597PredecessorAliases();
  const canonicalData=prior.canonicalSource+'\n'+aliasData.aliases.map(row=>row.definition).join('\n');
  const base=checkpointCasContractFromCanonicalSource(canonicalData,{sourcePhase:'native-original-continuity'});
  assert.deepEqual(checkpointCasContractFromCanonicalSource(canonicalData,{sourcePhase:phase}),
    assistantAfter597CheckpointContractFromBase(canonicalData,base));
  await assert.rejects(expectedCheckpointCasContract({sourcePhase:phase}),/ASSISTANT_AFTER597_UNISSUED/);
  assert.equal(aliasData.admission,'NO_ADMISSION');assert.equal(aliasData.nextBinding,null);
  assert.equal(aliasData.migration,null);assert.equal(next.originalStateFamily,'597');
});
