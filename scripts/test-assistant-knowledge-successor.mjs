// Normal offline exact assistant-after0200 source/metadata target. No SQL execution.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {ASSISTANT_KNOWLEDGE_BINDING as NEXT,ASSISTANT_KNOWLEDGE_OUTPUT as PINS,ASSISTANT_KNOWLEDGE_BEFORE as OLD,
  requireAssistantKnowledgeBinding,requireAssistantKnowledgeOutput,assistantKnowledgeMigration,
  assertAssistantKnowledgeArchivesAbsent,readAssistantKnowledgeBeforeSource,readAssistantKnowledgeCanonicalSource,
  assistantKnowledgeDefinition as def,ASSISTANT_KNOWLEDGE_REPLACEMENTS,ASSISTANT_KNOWLEDGE_PROJECTION as PROJECTION}
  from './lib/assistant-knowledge-successor-source.mjs';
import {inspectAssistantKnowledgeStructure,prepareAssistantKnowledgeMetadataSource,buildAssistantKnowledgeBindingSuccessor}
  from './build-assistant-knowledge-successor.mjs';
import {REQUIRED_CUTOVER_MIGRATIONS,assistantKnowledgeRequiredMigrations,assertAssistantKnowledgeMigrationPlan,
  assertAssistantKnowledgeMigrationsApplied,prepareAssistantKnowledgeCutoverWorkdir,hydrateAssistantKnowledgeRemoteMigrationHistory,
  expectedCheckpointCasContract,expectedTripBindingPolicy,verifyIntegratedDatabaseReadback}
  from './integrated-cutover-readiness.mjs';
import {selectAssistantKnowledgeRoute,verifyAssistantKnowledgePlan} from './verify-assistant-knowledge-plan.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MIGRATIONS=path.join(ROOT,'supabase/migrations');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const CP='ravradar_ravscore_checkpoint_';
let generated;
test('actual physical tuple; whole0200 +0600 +230 inverse, eight originals, append20→21 and23→24',async()=>{
  assert.equal(requireAssistantKnowledgeBinding(),NEXT);
  assert.equal(NEXT.version,'20261017053000');
  assert.equal(assistantKnowledgeMigration().filename,'20261017053000_assistant_knowledge_original_bound_successor.sql');
  const before=await readAssistantKnowledgeBeforeSource();
  assert.equal(sha(before.canonicalSource),OLD.canonicalSha256);
  assert.equal(before.statisticsSchemaVersion,2);assert.equal(before.originalDefinitions.length,8);
  assert.equal(sha(before.statisticsMigration),'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae');
  assert.equal(sha(before.statisticsSchema2Source),'ee68e62d59e7d1c92ec0f0629c669f7e9c9756f30e86bc08af21cebdedbbe305');
  generated=await buildAssistantKnowledgeBindingSuccessor();
  assert.equal(generated.oldBinding.I,OLD.integrated);assert.equal(generated.newBinding,NEXT);
  assert.deepEqual(generated.changes.map(r=>r.name),ASSISTANT_KNOWLEDGE_REPLACEMENTS);
  const insertion=generated.projection+'\nrevoke all on function public.'+PROJECTION+'(jsonb,timestamptz) from public, anon, authenticated;\n\n';
  let inverse=generated.canonicalSource.replace(insertion,'');
  for(const r of [...generated.changes].reverse()){
    assert.equal(r.before,def(before.canonicalSource,r.name));
    assert.equal(inverse.split(r.after).length,2);inverse=inverse.replace(r.after,()=>r.before);
  }
  assert.equal(inverse,before.canonicalSource);assert.equal(sha(inverse),OLD.canonicalSha256);
  for(const r of before.originalDefinitions)assert.equal(def(generated.canonicalSource,r.name),r.definition);
  const shape=await inspectAssistantKnowledgeStructure();
  assert.equal(shape.kind,'ACTUAL_ASSISTANT_KNOWLEDGE_SOURCE_STRUCTURE');assert.deepEqual(shape.newBinding,NEXT);
  assert.equal(shape.oldSlots.length,20);assert.equal(shape.newSlots.length,21);
  assert.deepEqual(shape.newSlots.slice(0,20),shape.oldSlots);
  assert.match(shape.newSlots[17],/native_identity_i71_state_valid/);
  assert.match(shape.newSlots[18],/native_identity_i71_payload_valid/);
  assert.match(shape.oldSlots[19],/cmw_predecessor_projection/);
  assert.match(shape.newSlots[20],/ak_predecessor_projection/);
  assert.equal(shape.oldBodies.length,23);assert.equal(shape.newBodies.length,24);
  assert.deepEqual(shape.newBodies.slice(0,23),shape.oldBodies);
  assert.equal(shape.oldBodies[20],'v_native_identity_i71_state_definition');
  assert.equal(shape.oldBodies[21],'v_native_identity_i71_payload_definition');
  assert.equal(shape.oldBodies[22],'v_cmw_projection_definition');
  assert.equal(shape.newBodies[23],'v_ak_projection_definition');
  for(const k of ['wholeInverse','oldDispatchPreserved','oldNumericalBranchPreserved','retryTailPreserved','numericalNewReferenceOnly'])assert.equal(shape[k],true);
  const same=def(generated.canonicalSource,CP+'cas').split('    if v_central_is_compatible_predecessor and v_ak_predecessor_payload is not null then')[1].split('\n    elsif ')[0];
  assert.match(same,/v_central_reference = p_target_reference/);
  assert.deepEqual([...same.matchAll(/#- '\{([^}]+)\}'/g)].map(m=>m[1]),[
    'generationSha256','stateSha256','candidateGRollbackCompanion,generationSha256',
    'generationSha256','stateSha256','candidateGRollbackCompanion,generationSha256']);
  assert.match(generated.migration,/is distinct from '20261017020000'/);
  assert.match(generated.migration,/where version::text='20261013230000'/);
  assert.match(generated.migration,/set local statement_timeout = '55s';/);
  assert.match(generated.migration,/set local lock_timeout = '5s';/);
  assert.doesNotMatch(generated.migration,/\balter\s+table\b/i);
  assert(!generated.migration.includes('@UNISSUED'));
  assert.equal(generated.canonicalIssuer,false);assert.equal(generated.installation,false);
  assert.equal((await expectedCheckpointCasContract({sourcePhase:'native0600'})).sha256,'7c5fca1a61300c47bc8ab6102071777314176f6ef3bfd10af44c55465b62fdfa');
  assert.equal((await expectedTripBindingPolicy({sourcePhase:'native0600'})).sha256,'dfb46e5d6c7d966d8833ff595f76dbb0f09a2af553630c6fb954ee8c17deffa9');
});
test('no caller tuple/root/source overrides; archived routes rejected; unissued outputs stop before I/O',async()=>{
  for(const override of [{version:'20261016030000'},{I:'0'.repeat(64)},{sourceOverrides:{}}]){
    assert.throws(()=>requireAssistantKnowledgeBinding(override),/No caller/);
    await assert.rejects(prepareAssistantKnowledgeMetadataSource(override),/No source or binding override/);
    await assert.rejects(buildAssistantKnowledgeBindingSuccessor(override),/No caller/);
  }
  for(const options of [{},{migrationsDirectory:'.'},{binding:OLD},{migrationsDirectory:ROOT,canonicalSource:'old220'}])
    await assert.rejects(readAssistantKnowledgeBeforeSource(options));
  assertAssistantKnowledgeArchivesAbsent(new Set(['20261013230000',OLD.version]),new Set([OLD.version]));
  for(const v of ['20261014140000','20261015030000','20261016030000'])for(const side of [0,1]){
    const sets=[new Set(),new Set()];sets[side].add(v);assert.throws(()=>assertAssistantKnowledgeArchivesAbsent(...sets),/Archived assistant phase/);
  }
  if(PINS===null){
    const saved=new Map(),ops=['lstat','readFile','readdir','mkdir','copyFile','writeFile','appendFile','open'];let io=0,network=0;
    for(const op of ops){saved.set(op,fs[op]);fs[op]=async()=>{io++;throw Error('UNISSUED_IO');};}
    try{
      for(const fn of [requireAssistantKnowledgeOutput,assistantKnowledgeRequiredMigrations,
        ()=>assertAssistantKnowledgeMigrationsApplied(''),()=>selectAssistantKnowledgeRoute({migrationListText:''})])
        assert.throws(fn,/ASSISTANT_KNOWLEDGE_SQL_UNISSUED/);
      for(const fn of [readAssistantKnowledgeCanonicalSource,()=>assertAssistantKnowledgeMigrationPlan({}),
        ()=>prepareAssistantKnowledgeCutoverWorkdir({}),()=>hydrateAssistantKnowledgeRemoteMigrationHistory({}),
        ()=>verifyAssistantKnowledgePlan({}),()=>expectedCheckpointCasContract({sourcePhase:'assistant-knowledge'}),
        ()=>expectedTripBindingPolicy({sourcePhase:'assistant-knowledge'}),
        ()=>verifyIntegratedDatabaseReadback({sourcePhase:'assistant-knowledge',url:'https://invalid.example',serviceRoleKey:'synthetic',
          fetchImpl:async()=>{network++;throw Error('UNISSUED_NETWORK');}})])await assert.rejects(fn,/ASSISTANT_KNOWLEDGE_SQL_UNISSUED/);
    }finally{for(const [op,fn] of saved)fs[op]=fn;}
    assert.equal(io,0);assert.equal(network,0);
  }
});
test('whole issued SQL reader and sole pending/apply plan with authentic source fixtures',async()=>{
  if(PINS===null){assert.equal(PINS,null);return;}
  assert(generated);requireAssistantKnowledgeOutput();
  assert.equal(generated.migrationSha256,PINS.migrationSha256);assert.equal(generated.afterCanonicalSha256,PINS.canonicalSha256);
  const parent=await fs.realpath(os.tmpdir()),prefix='rr-assistant-after0200-target-',fixture=await fs.mkdtemp(path.join(parent,prefix));
  const owner=await fs.lstat(fixture,{bigint:true});const identity=[owner.dev,owner.ino,owner.birthtimeNs];
  const required=assistantKnowledgeRequiredMigrations(),descriptor=assistantKnowledgeMigration();
  const list=(remote=required.map(m=>m.version),local=required.map(m=>m.version))=>' Local | Remote | Time (UTC)\n'
    +[...new Set([...local,...remote])].sort().map(v=>' '+(local.includes(v)?v:'')+' | '+(remote.includes(v)?v:'')+' | ').join('\n');
  const env={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
    RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN:'true',RAVRADAR_ASSISTANT_KNOWLEDGE_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
    RAVRADAR_ASSISTANT_KNOWLEDGE_SAVED_WEATHER:'false',RAVRADAR_ASSISTANT_KNOWLEDGE_RECOVERY_RUN_ID:'',
    RAVRADAR_ASSISTANT_KNOWLEDGE_PREWRITE_VERIFIED:'true',RAVRADAR_ASSISTANT_KNOWLEDGE_WRITER_ACTIVE:'false',
    RAVRADAR_ASSISTANT_KNOWLEDGE_ORIGINALS_VERIFIED:'true',RAVRADAR_ASSISTANT_KNOWLEDGE_NOLOSS_VERIFIED:'true'};
  try{
    for(const m of required)await fs.writeFile(path.join(fixture,m.filename),m.version===descriptor.version?generated.migration:await fs.readFile(path.join(MIGRATIONS,m.filename)),{flag:'wx'});
    const options={migrationsDirectory:fixture};
    assert.equal((await readAssistantKnowledgeCanonicalSource(options)).canonicalSource,generated.canonicalSource);
    assert.equal((await expectedCheckpointCasContract({...options,sourcePhase:'assistant-knowledge'})).sha256,PINS.checkpointContractSha256);
    assert.equal((await expectedTripBindingPolicy({...options,sourcePhase:'assistant-knowledge'})).sha256,PINS.tripBindingPolicySha256);
    const beforeList=list(required.slice(0,-1).map(m=>m.version));
    assert.equal(selectAssistantKnowledgeRoute({migrationListText:beforeList,environment:env}),'before');
    const dry='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n * '+descriptor.filename+'\nFinished supabase db push.';
    assert.deepEqual((await verifyAssistantKnowledgePlan({phase:'before',migrationListText:beforeList,dryRunText:dry,migrationsDirectory:fixture,environment:env})).pendingVersions,[descriptor.version]);
    const installed={...env,RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN:'false'};
    assert.equal(selectAssistantKnowledgeRoute({migrationListText:list(),environment:installed}),'installed');
    assert.deepEqual((await verifyAssistantKnowledgePlan({phase:'installed',migrationListText:list(),dryRunText:'DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.',migrationsDirectory:fixture,environment:installed})).pendingVersions,[]);
    for(const mutation of [
      ()=>selectAssistantKnowledgeRoute({migrationListText:beforeList,environment:{...env,RAVRADAR_ASSISTANT_KNOWLEDGE_WRITER_ACTIVE:'true'}}),
      ()=>selectAssistantKnowledgeRoute({migrationListText:beforeList,environment:{...env,RAVRADAR_ASSISTANT_KNOWLEDGE_NOLOSS_VERIFIED:'false'}}),
      ()=>selectAssistantKnowledgeRoute({migrationListText:list(),environment:env}),
      ()=>selectAssistantKnowledgeRoute({migrationListText:list([...required.map(m=>m.version),'20261018000000']),environment:env}),
      ()=>selectAssistantKnowledgeRoute({migrationListText:list(required.slice(0,-1).filter(m=>m.version!==OLD.version).map(m=>m.version)),environment:env}),
      ()=>selectAssistantKnowledgeRoute({migrationListText:list([...required.slice(0,-1).map(m=>m.version),'20261016030000']),environment:env}),
    ])assert.throws(mutation);
    const nextFile=path.join(fixture,descriptor.filename);await fs.appendFile(nextFile,'\n');
    await assert.rejects(readAssistantKnowledgeCanonicalSource(options),/Whole raw new SQL/);
    await fs.writeFile(nextFile,generated.migration);
    for(const m of required.filter(m=>['20261013220000','20261013230000','20261016060000',OLD.version].includes(m.version))){
      const file=path.join(fixture,m.filename),bytes=await fs.readFile(file);await fs.appendFile(file,'\n');
      await assert.rejects(readAssistantKnowledgeCanonicalSource(options));await fs.writeFile(file,bytes);
    }
    assert.equal((await readAssistantKnowledgeCanonicalSource(options)).canonicalSource,generated.canonicalSource);
  }finally{
    assert.equal(await fs.realpath(fixture),fixture);assert.equal(path.dirname(fixture),parent);assert(path.basename(fixture).startsWith(prefix));
    const final=await fs.lstat(fixture,{bigint:true});assert(final.isDirectory()&&!final.isSymbolicLink());
    assert.deepEqual([final.dev,final.ino,final.birthtimeNs],identity);
    assert((await fs.readdir(fixture)).every(f=>required.some(m=>m.filename===f)));
    await fs.rm(fixture,{recursive:true,force:false});
  }
});
