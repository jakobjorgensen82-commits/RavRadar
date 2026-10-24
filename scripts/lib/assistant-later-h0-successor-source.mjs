// Private inactive proposal. Real final source discovery/issuance is a separate reviewed act.
// No SAME_H0 projection, metadata event, arbitrary family, tuple or root override.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NATIVE_ORIGINAL_CONTINUITY_BINDING,NATIVE_ORIGINAL_CONTINUITY_OUTPUT,
  readNativeOriginalContinuityCanonicalSource,nativeOriginalContinuityDefinition}
  from './native-original-continuity-successor-source.mjs';
export const ASSISTANT_LATER_H0_BINDING=Object.freeze({
  "version": "20261022181403",
  "C": "5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4",
  "I": "5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2",
  "T": "cd3a3648ad5093662871559aa39d77671eda27edf1f9edc82a104c5430a43a21"
});
export const ASSISTANT_LATER_H0_OUTPUT=Object.freeze({
  "migrationSha256": "b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7",
  "canonicalSha256": "b14e0f9905bed1a4a2be13870bd2af54f82ebdcf4703847548b227ad2051ad04",
  "checkpointContractSha256": "207733bbbea2aa2f7747685a1a626b63d740aee3b607cfb920fabe50619e6596",
  "tripBindingPolicySha256": "831d5472a32eb22339253e2b0734bd9cc9b478e48ec6caf078e2fd42de646d67"
});
export const ASSISTANT_LATER_H0_RELEASE='4.0.587'; // Local source issuance, not installation or public delivery.
export const ASSISTANT_LATER_H0_BEFORE=Object.freeze({
  sourceHead:'7df56f36f705db641b3f9476ee8ca1b4c4cfed0c',
  sourceTree:'57192d6d5cfbd8709f3558ad8afaaf10dd6cafe0',
  version:'20261021150500',
  C:'eb042ae79b64df21537421283a0d62d39af22c2d1a38707e530970af6bc7c8dd',
  I:'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805',
  T:'d2d93920aacc4be877da22c7b9e31e21426e647227a2c5018ee14b3a267500c7',
  canonicalSha256:'d2ecf4414b020478789ed9007b3fe466c16ecc8e01b1053445397d241159065b'});
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
export const assistantLaterH0Definition=nativeOriginalContinuityDefinition;
export const ASSISTANT_LATER_H0_ALIASES=Object.freeze([
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask586_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask586_payload_valid',signature:'(jsonb,timestamptz)'})]);
export function requireAssistantLaterH0Binding(){
  assert.equal(arguments.length,0);
  const b=ASSISTANT_LATER_H0_BINDING;
  assert(b&&Object.isFrozen(b),'ASSISTANT_LATER_H0_UNISSUED');
  assert.deepEqual(Object.keys(b).sort(),['C','I','T','version']);
  assert.match(b.version,/^[0-9]{14}$/);assert(b.version>ASSISTANT_LATER_H0_BEFORE.version);
  for(const key of ['C','I','T'])assert.match(b[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[b[k],ASSISTANT_LATER_H0_BEFORE[k]])).size,6);
  return b;
}
export function requireAssistantLaterH0Output(){
  assert.equal(arguments.length,0);requireAssistantLaterH0Binding();const p=ASSISTANT_LATER_H0_OUTPUT;
  assert(p&&Object.isFrozen(p),'ASSISTANT_LATER_H0_SQL_UNISSUED');
  assert.deepEqual(Object.keys(p).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const value of Object.values(p))assert.match(value,/^[a-f0-9]{64}$/);return p;
}
export function requireAssistantLaterH0Release(){
  assert.equal(arguments.length,0);requireAssistantLaterH0Output();
  const release=ASSISTANT_LATER_H0_RELEASE;
  assert.equal(typeof release,'string','ASSISTANT_LATER_H0_RELEASE_UNISSUED');
  assert.match(release,/^4\.0\.[1-9][0-9]*$/);
  assert(Number(release.split('.').at(-1))>586,'Fixed assistant successor release must follow genuine586');
  return release; // Fixed source metadata, never caller-selected admission.
}
export function assistantLaterH0Migration(){
  const {version}=requireAssistantLaterH0Binding();
  const id=version+'_assistant_later_h0_original_bound_successor';return Object.freeze({version,id,filename:id+'.sql'});
}
export function assertAssistantLaterH0Target(descriptor,targetReferenceAt){
  assert.equal(arguments.length,2);
  assert.equal(descriptor?.modelBinding?.modelBundleSha256,ASSISTANT_LATER_H0_BEFORE.I);
  assert.equal(descriptor?.contractHashes?.continuationStateContractSha256,ASSISTANT_LATER_H0_BEFORE.T);
  for(const value of [descriptor.productionReferenceAt,targetReferenceAt]){
    assert.equal(typeof value,'string');assert.match(value,/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
    assert.equal(new Date(value).toISOString(),value);
  }
  assert(Date.parse(targetReferenceAt)>Date.parse(descriptor.productionReferenceAt),'ASSISTANT_LATER_H0_STRICTLY_LATER');
  return true; // Pure shape/time assertion: NOT authentication or a handle.
}
export function assertAssistantLaterH0Caller(env){
  assert.equal(arguments.length,1);assert.equal(env.GITHUB_WORKFLOW,'Update weather and deploy RavRadar');
  assert.equal(env.GITHUB_REF,'refs/heads/main');
  assert(['workflow_dispatch','schedule'].includes(env.GITHUB_EVENT_NAME));
  assert.match(env.GITHUB_RUN_ATTEMPT??'',/^[1-9][0-9]{0,5}$/);assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert(['integrated','integrated-historical-maintenance'].includes(env.OPERATIONAL_ACTION));
  for(const key of ['CHECKPOINT_ONLY','QUICK_CONFIRMATION','COMPLETED_PRIVATE_RUNTIME',
    'NATIVE_IDENTITY_RECOVERY','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','RESTART_ARCHIVED_WEATHER',
    'PUBLISH_NEWEST_SAVED_WEATHER'])assert.notEqual(env[key],'true','ASSISTANT_LATER_H0_ORDINARY_ONLY');
}
export async function readAssistantLaterH0PredecessorCanonicalSource(){
  assert.equal(arguments.length,0);
  assert.deepEqual({version:NATIVE_ORIGINAL_CONTINUITY_BINDING.version,
    C:NATIVE_ORIGINAL_CONTINUITY_BINDING.C,I:NATIVE_ORIGINAL_CONTINUITY_BINDING.I,
    T:NATIVE_ORIGINAL_CONTINUITY_BINDING.T,canonicalSha256:NATIVE_ORIGINAL_CONTINUITY_OUTPUT.canonicalSha256},
    Object.fromEntries(['version','C','I','T','canonicalSha256'].map(k=>[k,ASSISTANT_LATER_H0_BEFORE[k]])));
  const source=await readNativeOriginalContinuityCanonicalSource();
  assert.equal(sha(source.canonicalSource),ASSISTANT_LATER_H0_BEFORE.canonicalSha256);
  assert.equal(source.admission,'NO_ADMISSION');return source;
}
export function assistantLaterH0CheckpointContractFromBase(source,base){
  assert.equal(sha(base.definition),base.sha256);let text=base.definition;
  for(let i=0;i<ASSISTANT_LATER_H0_ALIASES.length;i++){
    const whole=nativeOriginalContinuityDefinition(source,ASSISTANT_LATER_H0_ALIASES[i].name);
    text+='\n-- assistant-later-h0-original586-'+(i===0?'state':'payload')+'-validator --\n'
      +whole.slice(whole.indexOf('as $$')+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }return Object.freeze({id:base.id,definition:text,sha256:sha(text)});
}
export async function readAssistantLaterH0CanonicalSource(options){
  const pins=requireAssistantLaterH0Output(),migration=assistantLaterH0Migration();
  assert(arguments.length<=1);let migrationsDirectory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));
    migrationsDirectory=path.resolve(options.migrationsDirectory);}
  const prior=await readAssistantLaterH0PredecessorCanonicalSource();
  const file=path.join(migrationsDirectory,migration.filename),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=await fs.readFile(file);
  assert.equal(sha(bytes),pins.migrationSha256);
  const sql=bytes.toString('utf8'),def=nativeOriginalContinuityDefinition;
  const replacements=['integrated_state_valid','payload_valid','integrated_state_reason','payload_reason',
    'cas','contract'].map(s=>'ravradar_ravscore_checkpoint_'+s);
  replacements.splice(4,0,'ravradar_trip_v3_binding_allowed');
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...ASSISTANT_LATER_H0_ALIASES.map(row=>row.name),...replacements]);
  let canonicalSource=prior.canonicalSource;
  for(const name of replacements){const before=def(canonicalSource,name);
    assert.equal(canonicalSource.split(before).length,2);canonicalSource=canonicalSource.replace(before,()=>def(sql,name));}
  const addition=ASSISTANT_LATER_H0_ALIASES.map(row=>def(sql,row.name)
    +'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=def(canonicalSource,replacements[0]);canonicalSource=canonicalSource.replace(anchor,()=>addition+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=canonicalSource.replace(addition,'');
  for(const name of [...replacements].reverse())inverse=inverse.replace(def(inverse,name),()=>def(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole genuine586 canonical inverse');
  for(const original of prior.originalDefinitions)assert.equal(def(canonicalSource,original.name),original.definition);
  assert.deepEqual(await fs.readFile(file),bytes);
  return Object.freeze({...prior,canonicalSource,migration,admission:'NO_ADMISSION'});
}
