// Explicit preparation versus issued-source cases. Neither phase executes SQL.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareAssistantResponseMetadataSource,buildAssistantResponseBindingSuccessor}
  from './build-assistant-response-binding-successor.mjs';
import {ASSISTANT_RESPONSE_BINDING,ASSISTANT_RESPONSE_SOURCE_PINS,ASSISTANT_RESPONSE_MIGRATION,
  RESPONSE_BEFORE_PINS,RESPONSE_PROJECTION,RESPONSE_REPLACEMENTS,
  requireAssistantResponseBinding,readAssistantResponseCanonicalSource,readAssistantResponseBeforeSource}
  from './lib/assistant-response-successor-source.mjs';
import {readAssistantKnowledgeCanonicalSource,kbDefinition}
  from './lib/assistant-knowledge-successor-source.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MIGRATIONS=path.join(ROOT,'supabase/migrations');
const CP='ravradar_ravscore_checkpoint_';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
assert.equal(process.argv.length,3);
const mode=process.argv[2];assert(['--unfrozen','--issued'].includes(mode));
assert.equal(ASSISTANT_RESPONSE_MIGRATION.filename,'20261015030000_assistant_response_bound_successor.sql');
assert(Buffer.byteLength(RESPONSE_PROJECTION,'ascii')<63);
for(const override of [{root:ROOT},{sourceOverrides:{}},{I:'0'.repeat(64)}]){
  assert.throws(()=>requireAssistantResponseBinding(override),/No caller binding or source override/);
  await assert.rejects(prepareAssistantResponseMetadataSource(override),/No source or binding override/);
  await assert.rejects(buildAssistantResponseBindingSuccessor(override),/No caller root, hash, source or schema override/);
  await assert.rejects(readAssistantResponseCanonicalSource(override),/Only the normal SQL fixture-directory seam/);
  await assert.rejects(readAssistantResponseBeforeSource(override),/Only the normal SQL fixture-directory seam/);
}
const files=(await fs.readdir(MIGRATIONS)).filter(file=>file.endsWith('.sql')).sort();
const beforeSql=await Promise.all(files.map(async file=>[file,sha(await fs.readFile(path.join(MIGRATIONS,file)))]));
if(mode==='--unfrozen'){
  assert.equal(ASSISTANT_RESPONSE_SOURCE_PINS,null);
  if(ASSISTANT_RESPONSE_BINDING===null){
    assert.throws(()=>requireAssistantResponseBinding(),/RESPONSE_BINDING_UNFROZEN/);
    await assert.rejects(prepareAssistantResponseMetadataSource(),/RESPONSE_BINDING_UNFROZEN/);
    await assert.rejects(buildAssistantResponseBindingSuccessor(),/RESPONSE_BINDING_UNFROZEN/);
    await assert.rejects(readAssistantResponseCanonicalSource(),/RESPONSE_BINDING_UNFROZEN/);
  }else{
    requireAssistantResponseBinding();
    await assert.rejects(readAssistantResponseCanonicalSource(),/RESPONSE_SQL_SOURCE_UNFROZEN/);
  }
  console.log('Unfrozen response readback refused; no renderer or SQL execution proof.');
}else{
  requireAssistantResponseBinding();assert(ASSISTANT_RESPONSE_SOURCE_PINS);
  const predecessor=await readAssistantResponseBeforeSource();
  const archived=await readAssistantKnowledgeCanonicalSource();
  assert.equal(predecessor.migration.version,'20261013230000');
  assert.equal(sha(predecessor.canonicalSource),'52da7ec58df834fb879cab25d26d94da355e8eaaf6c24ce0913199ac8181a894');
  assert.equal(archived.migration.version,'20261014140000');
  assert.notEqual(predecessor.canonicalSource,archived.canonicalSource,'Archived KB is not the before phase');
  assert.throws(()=>assert.equal(sha(archived.canonicalSource),RESPONSE_BEFORE_PINS.canonicalSha256));
  assert.equal(predecessor.statisticsSchema2Source,archived.statisticsSchema2Source);
  assert.deepEqual(predecessor.statisticsExpected,archived.statisticsExpected);
  const output=await buildAssistantResponseBindingSuccessor();
  const current=await readAssistantResponseCanonicalSource();
  const original=await fs.readFile(path.join(MIGRATIONS,ASSISTANT_RESPONSE_MIGRATION.filename));
  assert.deepEqual(original,Buffer.from(output.migration));
  assert.equal(sha(original),ASSISTANT_RESPONSE_SOURCE_PINS.migrationSha256);
  assert.equal(current.canonicalSource,output.canonicalSource);
  assert.equal(sha(current.canonicalSource),ASSISTANT_RESPONSE_SOURCE_PINS.canonicalSha256);
  assert.equal(current.statisticsSchema2Source,predecessor.statisticsSchema2Source);
  assert.deepEqual(current.statisticsExpected,predecessor.statisticsExpected);
  assert.equal(current.historicalSchema1,predecessor.historicalSchema1);
  assert.deepEqual(output.changes.map(row=>row.name),RESPONSE_REPLACEMENTS);
  const insertion=output.projection+'\nrevoke all on function public.'+RESPONSE_PROJECTION
    +'(jsonb,timestamptz) from public, anon, authenticated;\n\n';
  assert.equal(output.canonicalSource.split(insertion).length,2);
  let inverse=output.canonicalSource.replace(insertion,'');
  for(const row of [...output.changes].reverse()){
    assert.equal(row.before,kbDefinition(predecessor.canonicalSource,row.name));
    assert.equal(inverse.split(row.after).length,2);inverse=inverse.replace(row.after,()=>row.before);
  }
  assert.equal(inverse,predecessor.canonicalSource);
  assert.equal(sha(inverse),RESPONSE_BEFORE_PINS.canonicalSha256);
  assert.equal(output.oldBinding.I,'994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399');
  assert.equal(output.oldBinding.C,'d192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9');
  assert.equal(output.oldBinding.T,'0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a');
  assert.doesNotMatch(current.canonicalSource,/kb_predecessor_projection/);
  assert.throws(()=>kbDefinition(current.canonicalSource,CP+'kb_predecessor_projection'),/One complete definition/);
  for(const name of ['ffc','249','c1ac'].flatMap(family=>['state','payload'].map(kind=>CP+'grid_'+family+'_'+kind+'_valid'))){
    assert.equal(kbDefinition(current.canonicalSource,name),kbDefinition(predecessor.canonicalSource,name));
    assert.equal(kbDefinition(current.canonicalSource,name),kbDefinition(archived.canonicalSource,name));
  }
  const cas=kbDefinition(current.canonicalSource,CP+'cas');
  const start=cas.indexOf('    if v_central_is_compatible_predecessor and v_rsp_predecessor_payload is not null then');
  assert(start>=0);
  const end=cas.indexOf('\n    elsif ',start);assert(end>start);
  const sameTarget=cas.slice(start,end);
  assert.match(sameTarget,/v_central_reference = p_target_reference/);
  assert.deepEqual([...sameTarget.matchAll(/#- '\{([^}]+)\}'/g)].map(m=>m[1]),[
    'generationSha256','stateSha256','candidateGRollbackCompanion,generationSha256',
    'generationSha256','stateSha256','candidateGRollbackCompanion,generationSha256',
  ]);
  assert.match(output.migration,/set local statement_timeout = '55s';/);
  assert.match(output.migration,/set local lock_timeout = '5s';/);
  assert.match(output.migration,/is distinct from '20261013230000'/);
  assert.match(output.migration,/where version::text='20261014140000'\)\n    then raise exception 'RESPONSE_ARCHIVED14140000_MUST_BE_ABSENT'/);
  assert.match(output.migration,/and proname='ravradar_ravscore_checkpoint_kb_predecessor_projection'\)\n    then raise exception 'RESPONSE_ARCHIVED_KB_PROJECTION_MUST_BE_ABSENT'/);
  assert.match(kbDefinition(current.canonicalSource,CP+'contract'),/v_validator_oids\[18\]/);
  assert.doesNotMatch(kbDefinition(current.canonicalSource,CP+'contract'),/v_validator_oids\[19\]/);
  assert.doesNotMatch(output.migration,/\balter\s+table\b/i);
  assert.deepEqual([...output.migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [RESPONSE_PROJECTION,...RESPONSE_REPLACEMENTS]);
  assert.equal([...output.migration.matchAll(/^  execute \$rsp_ddl_\d+\$/gm)].length,11);

  // Normal reader negatives use only whole issued SQL in an owned TEMP fixture.
  const parent=await fs.realpath(os.tmpdir()),prefix='rr-response-source-test-';
  const directory=await fs.mkdtemp(path.join(parent,prefix));
  const stat=await fs.lstat(directory,{bigint:true});
  assert(stat.isDirectory()&&!stat.isSymbolicLink()&&stat.ino>0n);
  const identity=[stat.dev,stat.ino,stat.birthtimeNs];
  assert.equal(path.dirname(directory),parent);assert.equal(await fs.realpath(directory),directory);
  const required=[
    '20261010130000_owner_export_origin_bound_successor.sql',
    '20261012200000_checkpoint_cas_single_projection_successor.sql',
    '20261013210000_account_assistant_original_bound_successor.sql',
    '20261013220000_current_grid_original_bound_successor.sql',
    '20261013230000_account_statistics_revision.sql',
    '20261014140000_assistant_knowledge_bound_successor.sql',
    ASSISTANT_RESPONSE_MIGRATION.filename,
  ];
  try{
    for(const file of required)await fs.writeFile(path.join(directory,file),
      await fs.readFile(path.join(MIGRATIONS,file)),{flag:'wx',mode:0o600});
    assert.equal((await readAssistantResponseCanonicalSource({migrationsDirectory:directory})).canonicalSource,
      current.canonicalSource);
    const archiveFile=path.join(directory,'20261014140000_assistant_knowledge_bound_successor.sql');
    const archiveBytes=await fs.readFile(archiveFile);
    await fs.unlink(archiveFile);
    assert.equal((await readAssistantResponseCanonicalSource({migrationsDirectory:directory})).canonicalSource,
      current.canonicalSource,'Active direct SQL view must not require archived14140000');
    await fs.writeFile(archiveFile,archiveBytes,{flag:'wx',mode:0o600});
    const nextFile=path.join(directory,ASSISTANT_RESPONSE_MIGRATION.filename);
    await fs.appendFile(nextFile,'\n');
    await assert.rejects(readAssistantResponseCanonicalSource({migrationsDirectory:directory}),/Exact raw issued SQL/);
    await fs.writeFile(nextFile,original);
    const oldGrid=path.join(directory,'20261013220000_current_grid_original_bound_successor.sql');
    const gridBytes=await fs.readFile(oldGrid);
    await fs.writeFile(oldGrid,await fs.readFile(path.join(directory,'20261014140000_assistant_knowledge_bound_successor.sql')));
    await assert.rejects(readAssistantResponseBeforeSource({migrationsDirectory:directory}),/Exact raw issued SQL/);
    await fs.writeFile(oldGrid,gridBytes);
    await fs.appendFile(nextFile,'\n'+kbDefinition(archived.canonicalSource,CP+'kb_predecessor_projection')+'\n');
    await assert.rejects(readAssistantResponseCanonicalSource({migrationsDirectory:directory}),/Exact raw issued SQL/);
    await fs.writeFile(nextFile,original);
    await fs.appendFile(path.join(directory,'20261014140000_assistant_knowledge_bound_successor.sql'),'\n');
    await assert.rejects(readAssistantKnowledgeCanonicalSource({migrationsDirectory:directory}),/Exact raw issued SQL/);
  }finally{
    assert.equal(path.dirname(directory),parent);assert(path.basename(directory).startsWith(prefix));
    assert.equal(await fs.realpath(directory),directory);
    const final=await fs.lstat(directory,{bigint:true});
    assert(final.isDirectory()&&!final.isSymbolicLink());
    assert.deepEqual([final.dev,final.ino,final.birthtimeNs],identity);
    await fs.rm(directory,{recursive:true,force:false});
  }
  console.log('Direct220+230 response source/whole inverse/schema2/original definitions and archived-KB/changed-SQL refusals passed; PG unrun.');
}
assert.deepEqual((await fs.readdir(MIGRATIONS)).filter(file=>file.endsWith('.sql')).sort(),files);
assert.deepEqual(await Promise.all(files.map(async file=>[file,sha(await fs.readFile(path.join(MIGRATIONS,file)))])),beforeSql);
