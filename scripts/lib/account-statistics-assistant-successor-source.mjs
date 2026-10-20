// PRIVATE SOURCE preparation. Actual584 -> account/statistics/assistant585.
// No tuple is issued until the one complete normal source derivation exists.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readLastMileEnclosureCanonicalSource,requireLastMileEnclosureBinding,requireLastMileEnclosureOutput}
  from './last-mile-enclosure-successor-source.mjs';
export const ACCOUNT_STATISTICS_ASSISTANT_RELEASE='4.0.585';
export const ACCOUNT_STATISTICS_ASSISTANT_VERSION='20261019100000';
export const ACCOUNT_STATISTICS_ASSISTANT_BEFORE=Object.freeze({version:'20261019060000',
  C:'47a27aec034d8d7cbab7755a19025d796b6fe51c2b276676c7309c912a85f501',
  I:'bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947',
  T:'7532755a43f8bb2ccc125efa3aa747ed03365b720d13addfcdb91ce4b74d908c',
  canonicalSha256:'010da14413d92998a93b60743b7cddd8d3cc0b6b1ca22f7c257b3bd0448684f8',
  migrationSha256:'7d21e67a9d9b9ef5e1322a7e746120b289185ac09f24701044cbc7254617fd67'});
export const ACCOUNT_STATISTICS_ASSISTANT_BINDING=Object.freeze({
  version:'20261019100000',
  C:'2f5f28044ae88fccbcad4a9d21943b986aabcdd8be1ae607d5e79d0a8947925f',
  I:'31bbb9a98f4df93804a9d4bcdff50fe5e9b1c880e04492d2c596079488a6bfa2',
  T:'a0a5fa40385afb221dcb66e61b815453c11ee8c91f3e2d6581be0670cadc9299',
  candidateManifestSha256:'2f5f28044ae88fccbcad4a9d21943b986aabcdd8be1ae607d5e79d0a8947925f',
  integratedManifestSha256:'31bbb9a98f4df93804a9d4bcdff50fe5e9b1c880e04492d2c596079488a6bfa2',
});
export const ACCOUNT_STATISTICS_ASSISTANT_OUTPUT=Object.freeze({
  migrationSha256:'9cb02d5fccdb5c9458a1f924c8f8c57510044492d2f326ab28c45ff735039d59',
  canonicalSha256:'533315bef24fb179c1750c11b12c26df57ee6db6d0167e12bdb3c0567fb7fc18',
  checkpointContractSha256:'dadf9c6d4df61abbcd2f8304bcc083883125b1792b496e2b07d6027b9731fa78',
  tripBindingPolicySha256:'ad53dcf9b11a6029ee299f95de60a2dbb2e81ae5a3c4994684de3b3e14c231c6',
});
const CP='ravradar_ravscore_checkpoint_';
export const ACCOUNT_STATISTICS_ASSISTANT_PROJECTION=CP+'asa_same_h0_projection';
export const ACCOUNT_STATISTICS_ASSISTANT_ALIASES=Object.freeze([
  Object.freeze({name:CP+'asa584_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'asa584_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:ACCOUNT_STATISTICS_ASSISTANT_PROJECTION,signature:'(jsonb,timestamptz)'}),
]);
export const ACCOUNT_STATISTICS_ASSISTANT_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export function requireAccountStatisticsAssistantBinding(){
  assert.equal(arguments.length,0,'No caller tuple, source, phase or version');
  const value=ACCOUNT_STATISTICS_ASSISTANT_BINDING;
  assert(value&&Object.isFrozen(value),'ACCOUNT_STATISTICS_ASSISTANT_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.equal(value.version,ACCOUNT_STATISTICS_ASSISTANT_VERSION);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(value.C,value.candidateManifestSha256);assert.equal(value.I,value.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[value[k],ACCOUNT_STATISTICS_ASSISTANT_BEFORE[k]])).size,6);return value;
}
export function requireAccountStatisticsAssistantOutput(){
  assert.equal(arguments.length,0);requireAccountStatisticsAssistantBinding();const value=ACCOUNT_STATISTICS_ASSISTANT_OUTPUT;
  assert(value&&Object.isFrozen(value),'ACCOUNT_STATISTICS_ASSISTANT_SQL_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const pin of Object.values(value))assert.match(pin,/^[a-f0-9]{64}$/);return value;
}
export function accountStatisticsAssistantMigration(){
  assert.equal(arguments.length,0);requireAccountStatisticsAssistantBinding();
  const version=ACCOUNT_STATISTICS_ASSISTANT_VERSION,id=version+'_account_statistics_assistant_original_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
export function accountStatisticsAssistantDefinition(source,name){
  assert.match(name,/^[a-z0-9_]+$/);const found=[...source.matchAll(new RegExp('^create(?: or replace)? function public\\.'+name+'\\(','gm'))];
  assert.equal(found.length,1,'One whole function definition');const at=found[0].index,end=source.indexOf('\n$$;',at);assert(end>at);
  return source.slice(at,end+4);
}
export async function readAccountStatisticsAssistantPredecessorCanonicalSource(){
  assert.equal(arguments.length,0);const binding=requireLastMileEnclosureBinding(),pins=requireLastMileEnclosureOutput();
  assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,canonicalSha256:pins.canonicalSha256,
    migrationSha256:pins.migrationSha256},ACCOUNT_STATISTICS_ASSISTANT_BEFORE);
  const source=await readLastMileEnclosureCanonicalSource();assert.equal(sha(source.canonicalSource),ACCOUNT_STATISTICS_ASSISTANT_BEFORE.canonicalSha256);
  assert.equal(source.admission,'NO_ADMISSION');return source;
}
export function accountStatisticsAssistantCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert(base&&sha(base.definition)===base.sha256);let value=base.definition;
  const labels=['account-statistics-original584-state-validator','account-statistics-original584-payload-validator','account-statistics-assistant-same-h0-projection'];
  for(let i=0;i<ACCOUNT_STATISTICS_ASSISTANT_ALIASES.length;i++){
    const whole=accountStatisticsAssistantDefinition(source,ACCOUNT_STATISTICS_ASSISTANT_ALIASES[i].name),at=whole.indexOf('as $$');assert(at>0);
    value+='\n-- '+labels[i]+' --\n'+whole.slice(at+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }return Object.freeze({id:base.id,definition:value,sha256:sha(value)});
}
export async function readAccountStatisticsAssistantCanonicalSource(options){
  const pins=requireAccountStatisticsAssistantOutput();assert(arguments.length<=1);let directory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);assert.deepEqual(Object.keys(options),['migrationsDirectory']);
    assert(path.isAbsolute(options.migrationsDirectory));directory=path.resolve(options.migrationsDirectory);}
  const prior=await readAccountStatisticsAssistantPredecessorCanonicalSource(),migration=accountStatisticsAssistantMigration();
  const file=path.join(directory,migration.filename),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  const raw=await fs.readFile(file);assert.equal(sha(raw),pins.migrationSha256);const sql=raw.toString('utf8'),definition=accountStatisticsAssistantDefinition;
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...ACCOUNT_STATISTICS_ASSISTANT_ALIASES.map(row=>row.name),...ACCOUNT_STATISTICS_ASSISTANT_REPLACEMENTS]);
  const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,()=>b);};let canonicalSource=prior.canonicalSource;
  for(const name of ACCOUNT_STATISTICS_ASSISTANT_REPLACEMENTS)canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=ACCOUNT_STATISTICS_ASSISTANT_ALIASES.map(row=>definition(sql,row.name)+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');canonicalSource=once(canonicalSource,anchor,insertion+anchor);assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');for(const name of [...ACCOUNT_STATISTICS_ASSISTANT_REPLACEMENTS].reverse())
    inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole actual584 canonical inverse');
  for(const row of prior.originalDefinitions)assert.equal(definition(canonicalSource,row.name),row.definition);
  assert.equal(definition(canonicalSource,CP+'native_origin_projection'),definition(prior.canonicalSource,CP+'native_origin_projection'));
  assert.deepEqual(await fs.readFile(file),raw);return Object.freeze({...prior,canonicalSource,migration,admission:'NO_ADMISSION'});
}
