// Source-only assistant successor after the whole issued0200 family.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readCurrentMemoryWarmupCanonicalSource,currentMemoryWarmupDefinition,
  CURRENT_MEMORY_WARMUP_BEFORE} from './current-memory-warmup-successor-source.mjs';
export const ASSISTANT_KNOWLEDGE_BEFORE=Object.freeze({
  version:'20261017020000',
  filename:'20261017020000_current_memory_warmup_original_bound_successor.sql',
  migrationSha256:'c8fff609ea03bbc2e5c84bea57b1d7702b15e51cd27f1854692506b18369ef47',
  canonicalSha256:'dd83aa94167fa7829fe262acc2a0ec598d4e22f45749ccaf7e0ac06565fdd71b',
  accountSourceSha256:CURRENT_MEMORY_WARMUP_BEFORE.accountSourceSha256,
  integrated:'84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3',
  candidate:'76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8',
  continuation:'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f',
});
// These are physically derived from the actual ABCD+581 source, never retagged.
export const ASSISTANT_KNOWLEDGE_BINDING=Object.freeze({
  version:'20261017053000',
  C:'f452111fd41fb3abbdf4138d669317edf1b8680f0fb48d40506676d4eeb27e59',
  I:'285edc56a4876d7a4da8fcb00977bf55a045893a4dacb4b9eae4cb894807bde8',
  T:'e1b9a8a82f70cd5a77956557dcf243b246a52f2ddbe736ebf12f580cac0a5ca3',
  candidateManifestSha256:'f452111fd41fb3abbdf4138d669317edf1b8680f0fb48d40506676d4eeb27e59',
  integratedManifestSha256:'2856080c69f226c51f82bba795728148268e9fee439cde811fa9af4b62d8e40f',
});
export const ASSISTANT_KNOWLEDGE_OUTPUT=Object.freeze({
  "migrationSha256": "7d9fac08e10e15b118cee0bc12c9b514a4e6a9c5a171363650b60ef7a4fda87a",
  "canonicalSha256": "dfe52715b3ac74c536bab2c12c2207f2a40ff651bae3771c42a48897823e7bdd",
  "checkpointContractSha256": "eeb1323286d9305b43bdc7e0680b15c10d9e5b774f89dad82d33b35786641c1e",
  "tripBindingPolicySha256": "305421dbcaf57c019fd085581dd992fa850329e71e4109d064395a4c3cb8d9d7"
});
export const ASSISTANT_KNOWLEDGE_PROJECTION='ravradar_ravscore_checkpoint_ak_predecessor_projection';
export const ASSISTANT_KNOWLEDGE_ARCHIVES=Object.freeze(['20261014140000','20261015030000','20261016030000']);
export const ASSISTANT_KNOWLEDGE_SCHEMA2_SHA='ee68e62d59e7d1c92ec0f0629c669f7e9c9756f30e86bc08af21cebdedbbe305';
const CP='ravradar_ravscore_checkpoint_';
export const ASSISTANT_KNOWLEDGE_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  'ravradar_trip_v3_binding_allowed',CP+'predecessor_payload_valid',CP+'cas',CP+'contract',
]);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,()=>b);};
export const assistantKnowledgeDefinition=currentMemoryWarmupDefinition;
export function requireAssistantKnowledgeBinding(){
  assert.equal(arguments.length,0,'No caller binding, migration or source override');
  const value=ASSISTANT_KNOWLEDGE_BINDING;assert(value&&Object.isFrozen(value));
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.match(value.version,/^\d{14}$/);assert(value.version>ASSISTANT_KNOWLEDGE_BEFORE.version);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set([value.C,value.I,value.T,ASSISTANT_KNOWLEDGE_BEFORE.candidate,
    ASSISTANT_KNOWLEDGE_BEFORE.integrated,ASSISTANT_KNOWLEDGE_BEFORE.continuation]).size,6);
  return value;
}
export function assistantKnowledgeMigration(){
  assert.equal(arguments.length,0,'No caller descriptor override');
  const {version}=requireAssistantKnowledgeBinding(),id=version+'_assistant_knowledge_original_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
export function requireAssistantKnowledgeOutput(){
  assert.equal(arguments.length,0,'No caller output override');requireAssistantKnowledgeBinding();
  const value=ASSISTANT_KNOWLEDGE_OUTPUT;
  assert(value&&Object.isFrozen(value),'ASSISTANT_KNOWLEDGE_SQL_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const v of Object.values(value))assert.match(v,/^[a-f0-9]{64}$/);
  assert.notEqual(value.canonicalSha256,ASSISTANT_KNOWLEDGE_BEFORE.canonicalSha256);
  return value;
}
export function assertAssistantKnowledgeArchivesAbsent(local,remote){
  assert.equal(arguments.length,2);
  for(const versions of [local,remote]){assert(versions instanceof Set);
    for(const version of versions)assert.match(version,/^\d{8,14}$/);
    for(const archive of ASSISTANT_KNOWLEDGE_ARCHIVES)assert(!versions.has(archive),'Archived assistant phase must be absent: '+archive);
  }
}
function directory(options){
  if(options===undefined)return path.join(ROOT,'supabase/migrations');
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options),['migrationsDirectory'],'Only the normal exact-byte SQL fixture seam');
  assert.equal(typeof options.migrationsDirectory,'string');assert(path.isAbsolute(options.migrationsDirectory));
  return path.resolve(options.migrationsDirectory);
}
export async function readAssistantKnowledgeBeforeSource(options){
  assert(arguments.length<=1,'No before-source override');
  const migrationsDirectory=directory(options);
  // The existing fixed0200 reader authenticates whole0200/0600/230 and all eight
  // originals. It never rebuilds its old tuple using the new global C/I/T.
  const prior=await readCurrentMemoryWarmupCanonicalSource({migrationsDirectory});
  assert.equal(sha(prior.canonicalSource),ASSISTANT_KNOWLEDGE_BEFORE.canonicalSha256);
  assert.equal(prior.migration.version,ASSISTANT_KNOWLEDGE_BEFORE.version);
  assert.equal(prior.originalDefinitions.length,8);assert.equal(prior.statisticsSchemaVersion,2);
  assert.equal(sha(prior.statisticsSchema2Source),ASSISTANT_KNOWLEDGE_SCHEMA2_SHA);
  return Object.freeze({...prior,native0600Predecessor:prior.predecessor,
    predecessor:ASSISTANT_KNOWLEDGE_BEFORE,admission:'NO_ADMISSION'});
}
export async function readAssistantKnowledgeCanonicalSource(options){
  const pins=requireAssistantKnowledgeOutput(); // FIRST: unissued means zero I/O.
  assert(arguments.length<=1,'No after-source override');
  const migrationsDirectory=directory(options),descriptor=assistantKnowledgeMigration();
  const prior=await readAssistantKnowledgeBeforeSource({migrationsDirectory});
  const file=path.join(migrationsDirectory,descriptor.filename),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=await fs.readFile(file);
  assert.equal(sha(bytes),pins.migrationSha256,'Whole raw new SQL');const sql=bytes.toString('utf8');
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [ASSISTANT_KNOWLEDGE_PROJECTION,...ASSISTANT_KNOWLEDGE_REPLACEMENTS]);
  let canonicalSource=prior.canonicalSource;
  for(const name of ASSISTANT_KNOWLEDGE_REPLACEMENTS)canonicalSource=once(canonicalSource,
    assistantKnowledgeDefinition(canonicalSource,name),assistantKnowledgeDefinition(sql,name));
  const insertion=assistantKnowledgeDefinition(sql,ASSISTANT_KNOWLEDGE_PROJECTION)+'\nrevoke all on function public.'
    +ASSISTANT_KNOWLEDGE_PROJECTION+'(jsonb,timestamptz) from public, anon, authenticated;\n\n';
  const anchor=assistantKnowledgeDefinition(canonicalSource,CP+'integrated_state_valid');
  canonicalSource=once(canonicalSource,anchor,insertion+anchor);assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...ASSISTANT_KNOWLEDGE_REPLACEMENTS].reverse())inverse=once(inverse,
    assistantKnowledgeDefinition(inverse,name),assistantKnowledgeDefinition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole genuine0200 canonical inverse');
  const oldNames=[...prior.canonicalSource.matchAll(/^create(?: or replace)? function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]);
  for(const name of oldNames.filter(n=>!ASSISTANT_KNOWLEDGE_REPLACEMENTS.includes(n)))
    assert.equal(assistantKnowledgeDefinition(canonicalSource,name),assistantKnowledgeDefinition(prior.canonicalSource,name),'Every non-replaced original body stays exact');
  for(const {name,definition} of prior.originalDefinitions)assert.equal(assistantKnowledgeDefinition(canonicalSource,name),definition);
  assert.deepEqual(await fs.readFile(file),bytes);return Object.freeze({...prior,canonicalSource,migration:descriptor,admission:'NO_ADMISSION'});
}
