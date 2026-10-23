// PRIVATE SOURCE PROPOSAL. Nothing is issued, installed or admitted here.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import derivedMetadata from './source-producer-binding.generated.json' with {type:'json'};
import {assertSourceProducerDerivedMetadata} from './source-producer-derived-metadata.mjs';
import {ASSISTANT_LATER_H0_BINDING,ASSISTANT_LATER_H0_OUTPUT,
  requireAssistantLaterH0Binding,requireAssistantLaterH0Output,readAssistantLaterH0CanonicalSource,
  assistantLaterH0Definition} from './assistant-later-h0-successor-source.mjs';

export const SOURCE_PRODUCER_PROPOSED_RELEASE=null; // Unknown future release: normal whole-source issuance only.
// ROOT reserves/derives these only after the complete real source is frozen.
// Own hashes are generated DATA, never literals inside their own C/I input.
const metadata=assertSourceProducerDerivedMetadata(derivedMetadata);
export const SOURCE_PRODUCER_VERSION=metadata.version;
export const SOURCE_PRODUCER_BINDING=metadata.binding;
export const SOURCE_PRODUCER_OUTPUT=metadata.output;
export const SOURCE_PRODUCER_BEFORE=Object.freeze({version:'20261022181403',
  C:'5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4',
  I:'5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2',
  T:'cd3a3648ad5093662871559aa39d77671eda27edf1f9edc82a104c5430a43a21',
  canonicalSha256:'b14e0f9905bed1a4a2be13870bd2af54f82ebdcf4703847548b227ad2051ad04',
  migrationSha256:'b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7'});
const CP='ravradar_ravscore_checkpoint_';
export const SOURCE_PRODUCER_PROJECTION=CP+'source_same_h0_projection';
export const SOURCE_PRODUCER_ALIASES=Object.freeze([
  Object.freeze({name:CP+'source587_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'source587_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:SOURCE_PRODUCER_PROJECTION,signature:'(jsonb,timestamptz)'}),
]);
export const SOURCE_PRODUCER_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
export const SOURCE_PRODUCER_CONTRACT_LABELS=Object.freeze([
  'source-original587-state-validator','source-original587-payload-validator','source-same-h0-projection']);
export const sourceProducerDefinition=assistantLaterH0Definition;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};

export function requireSourceProducerBinding(){
  assert.equal(arguments.length,0,'No caller tuple/source/phase/version');
  const value=SOURCE_PRODUCER_BINDING;
  assert(value&&Object.isFrozen(value),'SOURCE_PRODUCER_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.match(SOURCE_PRODUCER_VERSION,/^[0-9]{14}$/);
  assert.equal(value.version,SOURCE_PRODUCER_VERSION);assert(value.version>SOURCE_PRODUCER_BEFORE.version);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(value.C,value.candidateManifestSha256);assert.equal(value.I,value.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[value[k],SOURCE_PRODUCER_BEFORE[k]])).size,6);
  return value;
}
export function requireSourceProducerOutput(){
  assert.equal(arguments.length,0);requireSourceProducerBinding();const value=SOURCE_PRODUCER_OUTPUT;
  assert(value&&Object.isFrozen(value),'SOURCE_PRODUCER_SQL_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const pin of Object.values(value))assert.match(pin,/^[a-f0-9]{64}$/);return value;
}
export function sourceProducerMigration(){
  assert.equal(arguments.length,0);const {version}=requireSourceProducerBinding();
  const id=version+'_source_producer_original_bound_successor';return Object.freeze({version,id,filename:id+'.sql'});
}
export async function readSourceProducerPredecessorCanonicalSource(){
  assert.equal(arguments.length,0);const binding=requireAssistantLaterH0Binding(),pins=requireAssistantLaterH0Output();
  assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
    canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256},SOURCE_PRODUCER_BEFORE);
  assert.equal(binding,ASSISTANT_LATER_H0_BINDING);assert.equal(pins,ASSISTANT_LATER_H0_OUTPUT);
  const source=await readAssistantLaterH0CanonicalSource();
  assert.equal(sha(source.canonicalSource),SOURCE_PRODUCER_BEFORE.canonicalSha256);
  assert.equal(source.admission,'NO_ADMISSION');return source;
}
export function sourceProducerCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert(base&&sha(base.definition)===base.sha256);let value=base.definition;
  for(let index=0;index<SOURCE_PRODUCER_ALIASES.length;index++){
    const whole=sourceProducerDefinition(source,SOURCE_PRODUCER_ALIASES[index].name),at=whole.indexOf('as $$');assert(at>0);
    value+='\n-- '+SOURCE_PRODUCER_CONTRACT_LABELS[index]+' --\n'+whole.slice(at+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }return Object.freeze({id:base.id,definition:value,sha256:sha(value)});
}
export async function readSourceProducerCanonicalSource(options){
  const pins=requireSourceProducerOutput(); // UNISSUED before any I/O.
  assert(arguments.length<=1);let directory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));directory=path.resolve(options.migrationsDirectory);}
  const prior=await readSourceProducerPredecessorCanonicalSource(),migration=sourceProducerMigration();
  const file=path.join(directory,migration.filename),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  const raw=await fs.readFile(file);assert.equal(sha(raw),pins.migrationSha256);const sql=raw.toString('utf8'),definition=sourceProducerDefinition;
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...SOURCE_PRODUCER_ALIASES.map(row=>row.name),...SOURCE_PRODUCER_REPLACEMENTS]);
  let canonicalSource=prior.canonicalSource;
  for(const name of SOURCE_PRODUCER_REPLACEMENTS)canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=SOURCE_PRODUCER_ALIASES.map(row=>definition(sql,row.name)+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...SOURCE_PRODUCER_REPLACEMENTS].reverse())inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole actual587 canonical inverse');
  const changed=new Set(SOURCE_PRODUCER_REPLACEMENTS);
  for(const match of prior.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)){
    if(!changed.has(match[1]))assert.equal(definition(canonicalSource,match[1]),definition(prior.canonicalSource,match[1]));
  }
  for(const row of prior.originalDefinitions)assert.equal(definition(canonicalSource,row.name),row.definition);
  assert.deepEqual(await fs.readFile(file),raw);return Object.freeze({...prior,canonicalSource,migration,admission:'NO_ADMISSION'});
}
