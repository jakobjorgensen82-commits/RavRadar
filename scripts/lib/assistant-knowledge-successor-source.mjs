// Fixed assistant-knowledge metadata successor after installed statistics230.
// Historical issued readers remain unchanged; this module is not an installer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readCurrentGridCanonicalSource} from './current-grid-successor-source.mjs';
import {buildStatisticsPreferenceRevision} from '../build-statistics-preference-revision.mjs';

// Two distinct freezes: actual-disk C -> renderC -> I -> renderI -> T FIRST;
// then the one reviewed normal renderer freezes its whole outputs. No aliases.
export const ASSISTANT_KNOWLEDGE_BINDING = Object.freeze({
  version: '20261014140000',
  C: '74883293f9a19f948773678e2e373bff77a8f79d2e09ca81f7e51f78240980a6',
  I: 'd6707d44fea563a3aaf99e1a81975fcb738d8a0152d2f85adff36060b75d7faa',
  T: 'a541199142e24abf6798c736d32ae09cf623de1d58687c0ab108a35396fc6ca9',
  candidateManifestSha256: '74883293f9a19f948773678e2e373bff77a8f79d2e09ca81f7e51f78240980a6',
  integratedManifestSha256: '59a661e6eca28cdc3765aef333e05ac53295e0ded58789a9b25af540fcc0d993',
});
export const ASSISTANT_KNOWLEDGE_SOURCE_PINS = Object.freeze({
  migrationSha256: '64f51a8a4a44e1094c97bfdf4fd48db7a276393410b27bb370fbd4ea2af1e74f',
  canonicalSha256: '4c2f8c04b446640bbf288cdb384b991418b752eae9f7f9d316dc0d5aa176c8cb',
  schema2InitializerSha256: 'ee68e62d59e7d1c92ec0f0629c669f7e9c9756f30e86bc08af21cebdedbbe305',
});
export const KB_PROJECTION = 'ravradar_ravscore_checkpoint_kb_predecessor_projection';
export const KB_CANONICAL_BEFORE_SHA = '52da7ec58df834fb879cab25d26d94da355e8eaaf6c24ce0913199ac8181a894';
export const KB_SCHEMA1_SHA = 'a049bf058cd9fb849d354170f3eee717cb922d1ffea71e31e429a194179feec8';
export const KB_STATISTICS_SQL_SHA = 'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae';
const MIGRATIONS=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../supabase/migrations');
const CP='ravradar_ravscore_checkpoint_';
export const KB_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  'ravradar_trip_v3_binding_allowed',CP+'predecessor_payload_valid',CP+'cas',CP+'contract',
]);
const IMMUTABLE=Object.freeze([
  ['20261010130000_owner_export_origin_bound_successor.sql','55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6'],
  ['20261012200000_checkpoint_cas_single_projection_successor.sql','b03605272397585a3e6ad248398ba7bc6d88af506837f76c88a9a92955b48c18'],
  ['20261013210000_account_assistant_original_bound_successor.sql','80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d'],
  ['20261013220000_current_grid_original_bound_successor.sql','77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b'],
  ['20261013230000_account_statistics_revision.sql',KB_STATISTICS_SQL_SHA],
]);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};
export function kbDefinition(source,name){
  const expression=new RegExp('^create(?: or replace)? function public\\.'+name+'\\(','gm');
  const found=[...source.matchAll(expression)];assert.equal(found.length,1,'One complete definition: '+name);
  const start=found[0].index,end=source.indexOf('\n$$;',start);assert(end>start);
  return source.slice(start,end+4);
}
export function requireAssistantKnowledgeBinding(){
  assert(ASSISTANT_KNOWLEDGE_BINDING,'KB_BINDING_UNFROZEN');
  const value=ASSISTANT_KNOWLEDGE_BINDING;
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.match(value.version,/^\d{14}$/);assert(value.version>'20261013230000');
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  return value;
}
export function assistantKnowledgeMigration(){
  const {version}=requireAssistantKnowledgeBinding();
  const id=version+'_assistant_knowledge_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
// Fresh INSTALL/schema initializer ONLY. This is not replayed by KB migration.
// A049 remains a separate historical value; schema2 is constructed explicitly.
export function statisticsSchema2Initializer(historicalSchema1,revisionSource){
  assert.equal(sha(historicalSchema1),KB_SCHEMA1_SHA);
  assert.equal(sha(revisionSource),'687532cc1d4998b2f5ec404d99a315234383bea73744614d49df369a61c99458');
  const edits=[];let after=historicalSchema1;
  const edit=(before,next)=>{after=once(after,before,next);edits.push([before,next]);};
  edit('  enabled boolean not null\n);','  enabled boolean not null,\n  revision bigint not null default 0 check (revision >= 0)\n);');
  for(const name of ['get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference'])
    edit(kbDefinition(after,name),kbDefinition(revisionSource,name));
  const setter=kbDefinition(revisionSource,'set_own_statistics_preference');
  const acl='revoke all on function public.set_own_statistics_preference(boolean, bigint) from public, anon, authenticated;\n'
    +'grant execute on function public.set_own_statistics_preference(boolean, bigint) to authenticated;';
  const anchor=kbDefinition(after,'enable_own_statistics_preference');
  edit(anchor,setter+'\n'+acl+'\n\n'+anchor);
  let inverse=after;for(const [before,next] of [...edits].reverse())inverse=once(inverse,next,before);
  assert.equal(inverse,historicalSchema1,'Whole schema1 initializer inverse');
  assert.equal(kbDefinition(after,'record_account_activity'),kbDefinition(historicalSchema1,'record_account_activity'));
  return after;
}
export async function readAssistantKnowledgeCanonicalSource({migrationsDirectory=MIGRATIONS}={}){
  const migrationDescriptor=assistantKnowledgeMigration();
  assert(ASSISTANT_KNOWLEDGE_SOURCE_PINS,'KB_SQL_SOURCE_UNFROZEN');
  const pins=ASSISTANT_KNOWLEDGE_SOURCE_PINS;
  assert.deepEqual(Object.keys(pins).sort(),['canonicalSha256','migrationSha256','schema2InitializerSha256']);
  for(const value of Object.values(pins))assert.match(value,/^[a-f0-9]{64}$/);
  async function read(file,digest){
    const filename=path.join(migrationsDirectory,file),stat=await fs.lstat(filename);
    assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=await fs.readFile(filename);
    assert.equal(sha(bytes),digest,'Exact raw issued SQL: '+file);return bytes.toString('utf8');
  }
  for(const [file,digest] of IMMUTABLE)await read(file,digest);
  const {canonicalSource:before,accountSource:historicalSchema1}=
    await readCurrentGridCanonicalSource({migrationsDirectory});
  assert.equal(sha(before),KB_CANONICAL_BEFORE_SHA);assert.equal(sha(historicalSchema1),KB_SCHEMA1_SHA);
  const statistics=await buildStatisticsPreferenceRevision({migrationsDirectory});
  assert.equal(statistics.migrationSha256,KB_STATISTICS_SQL_SHA);
  const migration=await read(migrationDescriptor.filename,pins.migrationSha256);
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [KB_PROJECTION,...KB_REPLACEMENTS]);
  let canonicalSource=before;
  for(const name of KB_REPLACEMENTS)canonicalSource=once(canonicalSource,kbDefinition(canonicalSource,name),kbDefinition(migration,name));
  const insertion=kbDefinition(migration,KB_PROJECTION)+'\nrevoke all on function public.'+KB_PROJECTION
    +'(jsonb,timestamptz) from public, anon, authenticated;\n\n';
  const anchor=kbDefinition(canonicalSource,CP+'integrated_state_valid');
  canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...KB_REPLACEMENTS].reverse())inverse=once(inverse,kbDefinition(inverse,name),kbDefinition(before,name));
  assert.equal(inverse,before,'Whole immutable220 canonical inverse');
  const statisticsSchema2Source=statisticsSchema2Initializer(historicalSchema1,statistics.revisionSource);
  assert.equal(sha(statisticsSchema2Source),pins.schema2InitializerSha256);
  return Object.freeze({canonicalSource,historicalSchema1,statisticsSchema2Source,
    statisticsSchemaVersion:2,statisticsExpected:statistics.afterExpected,migration:migrationDescriptor});
}
