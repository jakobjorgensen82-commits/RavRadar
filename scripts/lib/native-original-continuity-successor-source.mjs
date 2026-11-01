// PRIVATE SOURCE PROPOSAL. Nothing is issued, installed or admitted here.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ACCOUNT_STATISTICS_ASSISTANT_BINDING,ACCOUNT_STATISTICS_ASSISTANT_OUTPUT,
  requireAccountStatisticsAssistantBinding,requireAccountStatisticsAssistantOutput,
  readAccountStatisticsAssistantCanonicalSource,accountStatisticsAssistantDefinition}
  from './account-statistics-assistant-successor-source.mjs';

export const NATIVE_ORIGINAL_CONTINUITY_PROPOSED_RELEASE='4.0.586';
// UNISSUED controller-only proposal, matching the actual585 normal controller graph.
// After ALL wiring and version sync, normal actual C/I/T input discovery must prove
// this helper, its builder and readiness/transition/prewrite controllers stay outside
// the model/kernel/pack closure. Only then may fixed inline binding/output be issued.
// If a controller enters C/I/T, STOP before issuance; never add an inventory exclusion.
// No separate generated-DATA mechanism or SOURCE runtime/migration is copied here.
export const NATIVE_ORIGINAL_CONTINUITY_VERSION='20261021150500';
export const NATIVE_ORIGINAL_CONTINUITY_BINDING=Object.freeze({
  version:NATIVE_ORIGINAL_CONTINUITY_VERSION,
  C:'eb042ae79b64df21537421283a0d62d39af22c2d1a38707e530970af6bc7c8dd',
  I:'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805',
  T:'d2d93920aacc4be877da22c7b9e31e21426e647227a2c5018ee14b3a267500c7',
  candidateManifestSha256:'eb042ae79b64df21537421283a0d62d39af22c2d1a38707e530970af6bc7c8dd',
  integratedManifestSha256:'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805',
});
export const NATIVE_ORIGINAL_CONTINUITY_OUTPUT=Object.freeze({
  canonicalSha256:'d2ecf4414b020478789ed9007b3fe466c16ecc8e01b1053445397d241159065b',
  checkpointContractSha256:'d69f1327c28bbc1d36a4267ab2b9c557791100ca0a7be663df049a845431e07f',
  migrationSha256:'b4594e2187c5326ef798551fdb12b596ce8b2bd0ae961b7529acf5b668ea5ccd',
  tripBindingPolicySha256:'c4cc7de2c5464f23bd42a6372b4543e82e7106374385e562a7dfb4e7dae67348',
});
export const NATIVE_ORIGINAL_CONTINUITY_BEFORE=Object.freeze({version:'20261019100000',
  C:'2f5f28044ae88fccbcad4a9d21943b986aabcdd8be1ae607d5e79d0a8947925f',
  I:'31bbb9a98f4df93804a9d4bcdff50fe5e9b1c880e04492d2c596079488a6bfa2',
  T:'a0a5fa40385afb221dcb66e61b815453c11ee8c91f3e2d6581be0670cadc9299',
  canonicalSha256:'533315bef24fb179c1750c11b12c26df57ee6db6d0167e12bdb3c0567fb7fc18',
  migrationSha256:'9cb02d5fccdb5c9458a1f924c8f8c57510044492d2f326ab28c45ff735039d59'});
const CP='ravradar_ravscore_checkpoint_';
export const NATIVE_ORIGINAL_CONTINUITY_PROJECTION=CP+'noc_same_h0_projection';
export const NATIVE_ORIGINAL_CONTINUITY_ALIASES=Object.freeze([
  Object.freeze({name:CP+'noc585_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'noc585_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:NATIVE_ORIGINAL_CONTINUITY_PROJECTION,signature:'(jsonb,timestamptz)'}),
]);
export const NATIVE_ORIGINAL_CONTINUITY_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
export const NATIVE_ORIGINAL_CONTINUITY_CONTRACT_LABELS=Object.freeze([
  'native-original-continuity-original585-state-validator','native-original-continuity-original585-payload-validator','native-original-continuity-same-h0-projection']);
export const nativeOriginalContinuityDefinition=accountStatisticsAssistantDefinition;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};

export function requireNativeOriginalContinuityBinding(){
  assert.equal(arguments.length,0,'No caller tuple/source/phase/version');
  const value=NATIVE_ORIGINAL_CONTINUITY_BINDING;
  assert(value&&Object.isFrozen(value),'NATIVE_ORIGINAL_CONTINUITY_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.match(NATIVE_ORIGINAL_CONTINUITY_VERSION,/^[0-9]{14}$/);
  assert.equal(value.version,NATIVE_ORIGINAL_CONTINUITY_VERSION);assert(value.version>NATIVE_ORIGINAL_CONTINUITY_BEFORE.version);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(value.C,value.candidateManifestSha256);assert.equal(value.I,value.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[value[k],NATIVE_ORIGINAL_CONTINUITY_BEFORE[k]])).size,6);
  return value;
}
export function requireNativeOriginalContinuityOutput(){
  assert.equal(arguments.length,0);requireNativeOriginalContinuityBinding();const value=NATIVE_ORIGINAL_CONTINUITY_OUTPUT;
  assert(value&&Object.isFrozen(value),'NATIVE_ORIGINAL_CONTINUITY_SQL_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const pin of Object.values(value))assert.match(pin,/^[a-f0-9]{64}$/);return value;
}
export function nativeOriginalContinuityMigration(){
  assert.equal(arguments.length,0);const {version}=requireNativeOriginalContinuityBinding();
  const id=version+'_native_original_continuity_original_bound_successor';return Object.freeze({version,id,filename:id+'.sql'});
}
export async function readNativeOriginalContinuityPredecessorCanonicalSource(){
  assert.equal(arguments.length,0);const binding=requireAccountStatisticsAssistantBinding(),pins=requireAccountStatisticsAssistantOutput();
  assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
    canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256},NATIVE_ORIGINAL_CONTINUITY_BEFORE);
  assert.equal(binding,ACCOUNT_STATISTICS_ASSISTANT_BINDING);assert.equal(pins,ACCOUNT_STATISTICS_ASSISTANT_OUTPUT);
  const source=await readAccountStatisticsAssistantCanonicalSource();
  assert.equal(sha(source.canonicalSource),NATIVE_ORIGINAL_CONTINUITY_BEFORE.canonicalSha256);
  assert.equal(source.admission,'NO_ADMISSION');return source;
}
export function nativeOriginalContinuityCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert(base&&sha(base.definition)===base.sha256);let value=base.definition;
  for(let index=0;index<NATIVE_ORIGINAL_CONTINUITY_ALIASES.length;index++){
    const whole=nativeOriginalContinuityDefinition(source,NATIVE_ORIGINAL_CONTINUITY_ALIASES[index].name),at=whole.indexOf('as $$');assert(at>0);
    value+='\n-- '+NATIVE_ORIGINAL_CONTINUITY_CONTRACT_LABELS[index]+' --\n'+whole.slice(at+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }return Object.freeze({id:base.id,definition:value,sha256:sha(value)});
}
export async function readNativeOriginalContinuityCanonicalSource(options){
  const pins=requireNativeOriginalContinuityOutput(); // UNISSUED before any I/O.
  assert(arguments.length<=1);let directory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));directory=path.resolve(options.migrationsDirectory);}
  const prior=await readNativeOriginalContinuityPredecessorCanonicalSource(),migration=nativeOriginalContinuityMigration();
  const file=path.join(directory,migration.filename),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  const raw=await fs.readFile(file);assert.equal(sha(raw),pins.migrationSha256);const sql=raw.toString('utf8'),definition=nativeOriginalContinuityDefinition;
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...NATIVE_ORIGINAL_CONTINUITY_ALIASES.map(row=>row.name),...NATIVE_ORIGINAL_CONTINUITY_REPLACEMENTS]);
  let canonicalSource=prior.canonicalSource;
  for(const name of NATIVE_ORIGINAL_CONTINUITY_REPLACEMENTS)canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=NATIVE_ORIGINAL_CONTINUITY_ALIASES.map(row=>definition(sql,row.name)+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...NATIVE_ORIGINAL_CONTINUITY_REPLACEMENTS].reverse())inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole actual585 canonical inverse');
  const changed=new Set(NATIVE_ORIGINAL_CONTINUITY_REPLACEMENTS);
  for(const match of prior.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)){
    if(!changed.has(match[1]))assert.equal(definition(canonicalSource,match[1]),definition(prior.canonicalSource,match[1]));
  }
  for(const row of prior.originalDefinitions)assert.equal(definition(canonicalSource,row.name),row.definition);
  assert.deepEqual(await fs.readFile(file),raw);return Object.freeze({...prior,canonicalSource,migration,admission:'NO_ADMISSION'});
}
