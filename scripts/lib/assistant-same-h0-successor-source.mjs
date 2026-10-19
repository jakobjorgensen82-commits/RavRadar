// Source authority for the later SAME_H0_MODEL_METADATA event, not admission.
// Local next C/I/T are physically derived through the normal ordered builders.
// Source issuance is not B/S admission, database installation or production.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEstablishedNativeCurrentOriginCanonicalSource,requireEstablishedNativeCurrentOriginBinding,
  requireEstablishedNativeCurrentOriginOutput} from './established-native-current-origin-successor-source.mjs';
import {statisticsPreferenceRevisionCatalogQuery} from '../verify-account-assistant-schema.mjs';
export const ASSISTANT_SAME_H0_BEFORE=Object.freeze({
  version:'20261017140000',
  C:'5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858',
  I:'038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f',
  T:'047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447',
  canonicalSha256:'97ba4b9b56ee514f7ce4f509ad17f64c65c3be9e3cdbbdb6a335e5b87191680a',
  migrationSha256:'f1d12590cfc93047afa94cdf152fab6e77f2851807695f0771127a2fdf6122b5',
});
export const ASSISTANT_SAME_H0_BINDING=Object.freeze({
  version:'20261019004500',
  C:'3fe3dcac26841b3f3889d027fd2ddc69a5778f4eaab451f0bccc508d71ae4cb3',
  I:'85d1ef6b0585c8a7e30dfdfd712cedd60f95ffe37e5b50f3b6126e510e958905',
  T:'0e65aad853abc5419b4682f430cb6abcbceaa0ec8d44a2dbb6680a9c59bbc479',
  candidateManifestSha256:'3fe3dcac26841b3f3889d027fd2ddc69a5778f4eaab451f0bccc508d71ae4cb3',
  integratedManifestSha256:'85d1ef6b0585c8a7e30dfdfd712cedd60f95ffe37e5b50f3b6126e510e958905',
});
export const ASSISTANT_SAME_H0_OUTPUT=Object.freeze({
  migrationSha256:'2a08d5054767cfee2e0e881fce7a2b3490a92628ef8397b7de026028faee3ca6',
  canonicalSha256:'dbe65d5664b2878f007630015afb47117c807244f794208d6c15108add7d8f65',
  checkpointContractSha256:'87529cbc02f97128c2716bda670f34119aefd9a0778145bd4888dc9085ffb43c',
  tripBindingPolicySha256:'7d13676abf79c1300ba3e75c566cb1e63062a1b1e8abc34e718c1086b32a2e9c',
});
const CP='ravradar_ravscore_checkpoint_';
export const ASSISTANT_SAME_H0_PROJECTION=CP+'assistant_same_h0_projection';
export const ASSISTANT_SAME_H0_ALIASES=Object.freeze([
  Object.freeze({name:CP+'origin140000_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'origin140000_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:ASSISTANT_SAME_H0_PROJECTION,signature:'(jsonb,timestamptz)'}),
]);
export const ASSISTANT_SAME_H0_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'native_origin_projection',CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',
  CP+'cas',CP+'contract',
]);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
export function requireAssistantSameH0Binding(){
  assert.equal(arguments.length,0,'No caller source, tuple, descriptor or phase override');
  const value=ASSISTANT_SAME_H0_BINDING;
  if(value===null)throw Object.assign(new Error('ASSISTANT_SAME_H0_UNISSUED'),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  assert(Object.isFrozen(value));
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.match(value.version,/^\d{14}$/);assert(value.version>ASSISTANT_SAME_H0_BEFORE.version);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[value[k],ASSISTANT_SAME_H0_BEFORE[k]])).size,6);
  return value;
}
export function requireAssistantSameH0Output(){
  assert.equal(arguments.length,0);requireAssistantSameH0Binding();const value=ASSISTANT_SAME_H0_OUTPUT;
  assert(value&&Object.isFrozen(value),'ASSISTANT_SAME_H0_SQL_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const pin of Object.values(value))assert.match(pin,/^[a-f0-9]{64}$/);return value;
}
export function assistantSameH0Migration(){
  assert.equal(arguments.length,0);const {version}=requireAssistantSameH0Binding();
  const id=version+'_assistant_same_h0_original_bound_successor';return Object.freeze({version,id,filename:id+'.sql'});
}
export function assistantSameH0Definition(source,name){
  assert.match(name,/^[a-z0-9_]+$/);
  const re=new RegExp('^create(?: or replace)? function public\\.'+name+'\\(','gm');
  const found=[...source.matchAll(re)];assert.equal(found.length,1,'One complete definition: '+name);
  const start=found[0].index,end=source.indexOf('\n$$;',start);assert(end>start);
  return source.slice(start,end+4);
}
export async function readAssistantSameH0PredecessorCanonicalSource(){
  assert.equal(arguments.length,0,'No caller old source, SQL or tuple override');
  // Source-only normal immutable SQL reader. This does not authenticate B/S,
  // mint an origin handle or qualify a future model closure.
  const source=await readEstablishedNativeCurrentOriginCanonicalSource();
  const binding=requireEstablishedNativeCurrentOriginBinding(),pins=requireEstablishedNativeCurrentOriginOutput();
  assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
    canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256},ASSISTANT_SAME_H0_BEFORE);
  assert.equal(sha(source.canonicalSource),ASSISTANT_SAME_H0_BEFORE.canonicalSha256);
  assert.equal(source.admission,'NO_ADMISSION');
  return Object.freeze({...source,statisticsCatalogQuery:statisticsPreferenceRevisionCatalogQuery});}
// Pure source renderer extension: never B/S, origin or installation authority.
// The caller supplies the result of the EXISTING complete140000 renderer on
// this same source; only the three new exact definitions are appended.
export function assistantSameH0CheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert.equal(typeof source,'string');
  assert(base&&typeof base.definition==='string'&&sha(base.definition)===base.sha256);
  const names=['origin140000_state_valid','origin140000_payload_valid','assistant_same_h0_projection'];
  const labels=['origin140000-original-state-validator','origin140000-original-payload-validator','assistant-same-h0-metadata-projection'];
  let value=base.definition;
  for(let i=0;i<names.length;i++){
    const whole=assistantSameH0Definition(source,CP+names[i]),start=whole.indexOf('as $$');assert(start>0);
    const body=whole.slice(start+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
    value+='\n-- '+labels[i]+' --\n'+body;
  }
  return Object.freeze({id:base.id,definition:value,sha256:sha(value)});
}
export async function readAssistantSameH0CanonicalSource(options){
  const pins=requireAssistantSameH0Output(); // Fail CLOSED before any I/O.
  assert(arguments.length<=1);let directory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));directory=path.resolve(options.migrationsDirectory);}
  const prior=await readAssistantSameH0PredecessorCanonicalSource(),migration=assistantSameH0Migration();
  const file=path.join(directory,migration.filename),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  const raw=await fs.readFile(file);assert.equal(sha(raw),pins.migrationSha256,'Whole raw issued successor SQL');
  const sql=raw.toString('utf8'),definition=assistantSameH0Definition;
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...ASSISTANT_SAME_H0_ALIASES.map(r=>r.name),...ASSISTANT_SAME_H0_REPLACEMENTS]);
  const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,()=>b);};
  let canonicalSource=prior.canonicalSource;
  for(const name of ASSISTANT_SAME_H0_REPLACEMENTS)canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=ASSISTANT_SAME_H0_ALIASES.map(r=>definition(sql,r.name)+'\nrevoke all on function public.'+r.name+r.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...ASSISTANT_SAME_H0_REPLACEMENTS].reverse())inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole actual140000 canonical inverse');
  for(const row of prior.originalDefinitions)assert.equal(definition(canonicalSource,row.name),row.definition,'Every earlier original family unchanged');
  assert.deepEqual(await fs.readFile(file),raw,'Issued source retained');
  return Object.freeze({...prior,canonicalSource,migration,admission:'NO_ADMISSION'});
}
