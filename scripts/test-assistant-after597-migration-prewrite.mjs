// Udstedelsesfri kildeprøve. Ingen database, B/S-kapabilitet eller produktion.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
// Explicit normal current entry. No project constructor/runtime import
// precedes the fixed after598 issuance guard. Old PRE bodies stay unchanged.
const currentArguments=process.argv.slice(2);
assert(currentArguments.length===0||(currentArguments.length===1&&['--after598-current','--after599-current','--after601-plan'].includes(currentArguments[0])),'Unknown or mixed assistant test mode');
const AFTER598_CURRENT_MODE=currentArguments[0]==='--after598-current';
const AFTER599_CURRENT_MODE=currentArguments[0]==='--after599-current';
const AFTER601_PLAN_MODE=currentArguments[0]==='--after601-plan';
const currentSource=await import('./lib/assistant-later-h0-successor-source.mjs');
if(AFTER598_CURRENT_MODE){
  currentSource.requireAssistantAfter598Output();currentSource.requireAssistantAfter598Release();
  assert.equal(currentSource.ACTIVE_ASSISTANT_SUCCESSOR,currentSource.INACTIVE_ASSISTANT_AFTER598_SUCCESSOR);
}
if(AFTER599_CURRENT_MODE){
  currentSource.requireAssistantAfter599Output();currentSource.requireAssistantAfter599Release();
  assert.equal(currentSource.ACTIVE_ASSISTANT_SUCCESSOR,currentSource.INACTIVE_ASSISTANT_AFTER599_SUCCESSOR);
}
const {ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR:next,readScalar597LaterH0CanonicalSource,
  assistantAfter597CheckpointContractFromBase}=await import('./lib/assistant-later-h0-successor-source.mjs');
const {prepareAssistantAfter597PredecessorAliases}=await import('./build-assistant-later-h0-successor.mjs');
const {assistantAfter597PrewritePredecessor}=await import('./assistant-later-h0-binding-prewrite.mjs');
const {REQUIRED_CUTOVER_MIGRATIONS,DEFAULT_CUTOVER_SOURCE_PHASE,scalar597LaterH0RequiredMigrations,
  assertScalar597LaterH0MigrationPlan,assertSupabaseMigrationsApplied,
  assistantAfter597RequiredMigrations,assertAssistantAfter597MigrationsApplied,assertAssistantAfter597MigrationPlan,
  prepareAssistantAfter597CutoverWorkdir,hydrateAssistantAfter597RemoteMigrationHistory,
  inspectMigrationSources,expectedCheckpointCasContract,expectedTripBindingPolicy,
  checkpointCasContractFromCanonicalSource,prepareTemporarySupabaseCutoverWorkdir,
  hydrateTemporaryRemoteMigrationHistory,verifyIntegratedDatabaseReadback}=await import('./integrated-cutover-readiness.mjs');

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const phase='assistant-mixed-after597-successor';
const rows=scalar597LaterH0RequiredMigrations();
const list=(values=rows)=>'Local | Remote | Time (UTC)\n'+values.map(row=>row.version+' | '+row.version+' | ').join('\n');
const upToDate='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.\n';

// Current source checks run only after the fixed issuance/ACTIVE admission above.
if(AFTER598_CURRENT_MODE){
  const {verifyAssistantAfter598SourceTarget}=await import('./national584-source-evidence.mjs');
  await verifyAssistantAfter598SourceTarget();
}
if(AFTER599_CURRENT_MODE){
  const {verifyAssistantAfter599SourceTarget}=await import('./national584-source-evidence.mjs');
  await verifyAssistantAfter599SourceTarget();
}
if(AFTER601_PLAN_MODE){
  const ready=await import('./integrated-cutover-readiness.mjs');
  const {assistantAfter601PrewritePredecessor}=await import('./assistant-later-h0-binding-prewrite.mjs');
  const {source601OriginalPredecessor}=await import('./lib/authenticated-frozen586-predecessor.mjs');
  const profile=currentSource.INACTIVE_ASSISTANT_AFTER601_SUCCESSOR;
  const rows=ready.assistantAfter601RequiredMigrations(),installed=rows.slice(0,-1);
  const ledger=(local,remote)=>'Local | Remote | Time (UTC)\n'+local.map(({version})=>
    version+' | '+(remote.some(row=>row.version===version)?version:'')+' | ').join('\n');
  const pending='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '
    +rows.at(-1).filename+'\nFinished supabase db push.\n';
  test('after601 normal prewrite requires the complete installed ledger before the sole new migration',async()=>{
    assert.equal(ready.assistantAfter599RequiredMigrations().length,66);
    assert.deepEqual(installed.slice(-3).map(row=>row.version),
      profile.installedAppMigrations.slice(1).map(row=>row.version));
    assert.equal(installed.at(-1).version,profile.databaseBefore.version);
    assert.equal(installed.length,69);
    const owner=assistantAfter601PrewritePredecessor();
    assert.equal(owner.read,source601OriginalPredecessor.read);
    assert.equal(owner.plan,ready.assertAssistantAfter601MigrationPlan);
    const newPlan=await owner.plan({migrationListText:ledger(rows,installed),dryRunText:pending});
    assert.deepEqual(newPlan.pendingVersions,[profile.migration().version]);
    assert.equal(newPlan.alreadyAppliedVersions.length,69);
    assert.throws(()=>ready.assertAssistantAfter601MigrationsApplied(ledger(rows,installed)),
      /ASSISTANT_AFTER601_PREWRITE_ROUTE_REQUIRED/);
    const done=await owner.plan({migrationListText:ledger(rows,rows),dryRunText:upToDate});
    assert.deepEqual(done.pendingVersions,[]);
    assert.equal(ready.assertAssistantAfter601MigrationsApplied(ledger(rows,rows)).appliedVersions.length,70);
    assert.equal((await ready.expectedCheckpointCasContract({sourcePhase:profile.sourcePhase})).sha256,
      profile.output.checkpointContractSha256);
  });
  test('after601 normal prewrite rejects missing SQL80, unknown or duplicate rows and a mismatched dry run',async()=>{
    const owner=assistantAfter601PrewritePredecessor();
    assert.throws(()=>assistantAfter601PrewritePredecessor({family:'599'}));
    const invalid=ledger(rows,installed.slice(0,-1));
    await assert.rejects(owner.plan({migrationListText:invalid,dryRunText:pending}),/Missing genuine installed assistant predecessor/);
    for(const local of [[...rows,rows.at(-1)],[...rows,{version:'20991231235959'}]]){
      await assert.rejects(owner.plan({migrationListText:ledger(local,installed),dryRunText:pending}));
    }
    await assert.rejects(owner.plan({migrationListText:ledger(rows,installed),dryRunText:upToDate}));
  });
}else if(!AFTER598_CURRENT_MODE&&!AFTER599_CURRENT_MODE){

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

}else if(AFTER598_CURRENT_MODE){

  const ready=await import('./integrated-cutover-readiness.mjs'),prewrite=await import('./assistant-later-h0-binding-prewrite.mjs');
  const currentRows=ready.assistantAfter598RequiredMigrations();
  const migrationList=(values=currentRows,pending=false)=>'Local | Remote | Time (UTC)\n'+values.map((row,i)=>row.version+' | '+(pending&&i===values.length-1?'':row.version)+' | ').join('\n');
  test('after598 current normal64 migration plan and canonical contracts require actual old598 and new SQL',async()=>{
    assert.equal(currentRows.length,64);assert.deepEqual(currentRows.slice(0,63),ready.assistantAfter597RequiredMigrations());
    assert.deepEqual(ready.REQUIRED_CUTOVER_MIGRATIONS,currentRows);assert.equal(ready.DEFAULT_CUTOVER_SOURCE_PHASE,currentSource.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase);
    const plan=await ready.assertAssistantAfter598MigrationPlan({migrationListText:migrationList(),dryRunText:upToDate,migrationsDirectory:path.join(ROOT,'supabase/migrations')});
    assert.deepEqual(plan.pendingVersions,[]);assert.equal(ready.assertAssistantAfter598MigrationsApplied(migrationList()).appliedVersions.length,64);
    const pending=await ready.assertAssistantAfter598MigrationPlan({migrationListText:migrationList(currentRows,true),
      dryRunText:'DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '+currentRows.at(-1).filename+'\nFinished supabase db push.\n',migrationsDirectory:path.join(ROOT,'supabase/migrations')});
    assert.deepEqual(pending.pendingVersions,[currentRows.at(-1).version]);
    const output=currentSource.requireAssistantAfter598Output();
    assert.equal((await ready.expectedCheckpointCasContract({sourcePhase:'assistant-after598-successor'})).sha256,output.checkpointContractSha256);
    assert.equal((await ready.expectedTripBindingPolicy({sourcePhase:'assistant-after598-successor'})).sha256,output.tripBindingPolicySha256);
  });
  test('after598 current plan rejects missing duplicate extra SQL and caller-selected prewrite source',async()=>{
    for(const bad of [currentRows.slice(1),[...currentRows,currentRows.at(-1)],[...currentRows,{version:'20990101000000'}]])
      await assert.rejects(ready.assertAssistantAfter598MigrationPlan({migrationListText:migrationList(bad),dryRunText:upToDate,migrationsDirectory:path.join(ROOT,'supabase/migrations')}));
    await assert.rejects(ready.assertAssistantAfter598MigrationPlan({migrationListText:migrationList(currentRows,true),dryRunText:upToDate,migrationsDirectory:path.join(ROOT,'supabase/migrations')}));
    assert.throws(()=>prewrite.assistantAfter598PrewritePredecessor({family:'597'}));
    assert.throws(()=>prewrite.assistantAfter597PrewritePredecessor({family:'598'}));
    const fixed=prewrite.assistantAfter598PrewritePredecessor();
    const original=await import('./lib/authenticated-frozen586-predecessor.mjs');
    assert.equal(fixed.read,original.readAuthenticatedSource598Predecessor);assert.equal(fixed.snapshot,original.assertAuthenticatedSource598Snapshot);
    assert.equal(fixed.plan,ready.assertAssistantAfter598MigrationPlan);
    for(const options of [{family:'597'}, {workdir:'caller-selected',family:'598'}])
      await assert.rejects(ready.prepareAssistantAfter598CutoverWorkdir(options));
  });

}else{

  const ready=await import('./integrated-cutover-readiness.mjs'),prewrite=await import('./assistant-later-h0-binding-prewrite.mjs');
  const currentRows=ready.assistantAfter599RequiredMigrations();
  const migrationList=(values=currentRows,pending=false)=>'Local | Remote | Time (UTC)\n'+values.map((row,i)=>row.version+' | '+(pending&&i===values.length-1?'':row.version)+' | ').join('\n');
  test('after599 current normal66 migration plan and canonical contracts require actual old599 and new SQL',async()=>{
    assert.equal(currentRows.length,66);assert.deepEqual(currentRows.slice(0,64),ready.assistantAfter598RequiredMigrations());
    assert.equal(currentRows.at(-2).version,'20261116181500');
    assert.deepEqual(ready.REQUIRED_CUTOVER_MIGRATIONS,currentRows);assert.equal(ready.DEFAULT_CUTOVER_SOURCE_PHASE,currentSource.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase);
    assert.equal(ready.assertSupabaseMigrationsApplied(migrationList()).appliedVersions.length,66);
    const plan=await ready.assertAssistantAfter599MigrationPlan({migrationListText:migrationList(),dryRunText:upToDate,migrationsDirectory:path.join(ROOT,'supabase/migrations')});
    assert.deepEqual(plan.pendingVersions,[]);assert.equal(ready.assertAssistantAfter599MigrationsApplied(migrationList()).appliedVersions.length,66);
    const pending=await ready.assertAssistantAfter599MigrationPlan({migrationListText:migrationList(currentRows,true),
      dryRunText:'DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '+currentRows.at(-1).filename+'\nFinished supabase db push.\n',migrationsDirectory:path.join(ROOT,'supabase/migrations')});
    assert.deepEqual(pending.pendingVersions,[currentRows.at(-1).version]);
    const output=currentSource.requireAssistantAfter599Output();
    assert.equal((await ready.expectedCheckpointCasContract({sourcePhase:'assistant-after599-successor'})).sha256,output.checkpointContractSha256);
    assert.equal((await ready.expectedTripBindingPolicy({sourcePhase:'assistant-after599-successor'})).sha256,output.tripBindingPolicySha256);
  });
  test('after599 current plan rejects missing duplicate extra SQL and caller-selected prewrite source',async()=>{
    for(const bad of [currentRows.slice(1),currentRows.filter(row=>row.version!=='20261116181500'),
      currentRows.filter(row=>row.version!==currentSource.ASSISTANT_AFTER599_BEFORE.version),[...currentRows,currentRows.at(-1)],[...currentRows,{version:'20990101000000'}]])
      await assert.rejects(ready.assertAssistantAfter599MigrationPlan({migrationListText:migrationList(bad),dryRunText:upToDate,migrationsDirectory:path.join(ROOT,'supabase/migrations')}));
    await assert.rejects(ready.assertAssistantAfter599MigrationPlan({migrationListText:migrationList(currentRows,true),dryRunText:upToDate,migrationsDirectory:path.join(ROOT,'supabase/migrations')}));
    assert.throws(()=>prewrite.assistantAfter599PrewritePredecessor({family:'597'}));
    assert.throws(()=>prewrite.assistantAfter597PrewritePredecessor({family:'599'}));
    const fixed=prewrite.assistantAfter599PrewritePredecessor();
    const original=await import('./lib/authenticated-frozen586-predecessor.mjs');
    assert.equal(fixed.read,original.readAuthenticatedSource599Predecessor);assert.equal(fixed.snapshot,original.assertAuthenticatedSource599Snapshot);
    assert.equal(fixed.plan,ready.assertAssistantAfter599MigrationPlan);
    for(const options of [{family:'597'}, {workdir:'caller-selected',family:'599'}])
      await assert.rejects(ready.prepareAssistantAfter599CutoverWorkdir(options));
  });


  test('after599 generic raw dispatcher selects exactly one current or historical family',async()=>{
    const source=await fs.readFile(path.join(ROOT,'scripts/integrated-cutover-readiness.mjs'),'utf8');
    const whole=name=>{const match=new RegExp('^(?:export )?function '+name+'\\(','m').exec(source);assert(match);
      const end=source.indexOf('\n}',match.index)+2;assert(end>match.index);return source.slice(match.index,end);};
    const raw=whole('assertSupabaseMigrationsApplied'),unique=whole('uniqueVersions');
    const local=raw.replace('export function','function');assert.equal(local.replace('function','export function'),raw);
    const build=async body=>(await import('data:text/javascript;base64,'+Buffer.from("import assert from 'node:assert/strict';\nexport function build(context){\n"
      +"const {ACTIVE,REQUIRED_CUTOVER_MIGRATIONS,ACCOUNT_ERASURE_APP_MIGRATION,parseSupabaseMigrationList,"
      +"assertAssistantAfter598MigrationsApplied,assertAssistantAfter599MigrationsApplied,assertAssistantAfter597MigrationsApplied,"
      +"assertScalar597LaterH0MigrationsApplied,assertInstalled593Original591MigrationsApplied,assertAssistantPublic591SuccessorMigrationsApplied,"
      +"assertAssistantPublic590SuccessorMigrationsApplied,assertAssistantPublic588SuccessorMigrationsApplied,assertAssistantPublic587SuccessorMigrationsApplied}=context;\n"
      +unique+'\n'+body+'\nreturn assertSupabaseMigrationsApplied;}').toString('base64'))).build;
    const compile=await build(local);
    const fixture=(phase,rows)=>{const calls=[],context={ACTIVE:Object.freeze({sourcePhase:phase}),REQUIRED_CUTOVER_MIGRATIONS:rows,
      ACCOUNT_ERASURE_APP_MIGRATION:ready.ACCOUNT_ERASURE_APP_MIGRATION,parseSupabaseMigrationList:ready.parseSupabaseMigrationList};
      for(const name of ['assertAssistantAfter598MigrationsApplied','assertAssistantAfter599MigrationsApplied','assertAssistantAfter597MigrationsApplied',
        'assertScalar597LaterH0MigrationsApplied','assertInstalled593Original591MigrationsApplied','assertAssistantPublic591SuccessorMigrationsApplied',
        'assertAssistantPublic590SuccessorMigrationsApplied','assertAssistantPublic588SuccessorMigrationsApplied','assertAssistantPublic587SuccessorMigrationsApplied'])
        context[name]=(...args)=>{calls.push(name);return ready[name](...args);};
      return {calls,context};};
    for(const [phase,rows,selected]of [['assistant-after598-successor',ready.assistantAfter598RequiredMigrations(),'assertAssistantAfter598MigrationsApplied'],
      ['assistant-after599-successor',currentRows,'assertAssistantAfter599MigrationsApplied']]){
      const f=fixture(phase,rows);assert.equal(compile(f.context)(migrationList(rows)).appliedVersions.length,rows.length);assert.deepEqual(f.calls,[selected]);
      for(const bad of [migrationList(rows,true),migrationList(rows.slice(1)),migrationList([...rows,rows.at(-1)]),migrationList([...rows,{version:'20990101000000'}])])
        assert.throws(()=>compile(fixture(phase,rows).context)(bad));
    }
    const marker="  else if(ACTIVE.sourcePhase==='assistant-after599-successor')";assert.equal(local.split(marker).length,2);
    const buggy=await build(local.replace(marker,"  if(ACTIVE.sourcePhase==='assistant-after599-successor')"));
    const old=fixture('assistant-after598-successor',ready.assistantAfter598RequiredMigrations());
    assert.throws(()=>buggy(old.context)(migrationList(old.context.REQUIRED_CUTOVER_MIGRATIONS)));
    assert.deepEqual(old.calls,['assertAssistantAfter598MigrationsApplied','assertAssistantPublic587SuccessorMigrationsApplied']);
  });
}
