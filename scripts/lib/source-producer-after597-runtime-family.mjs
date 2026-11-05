// Closed normal SOURCE597 caller family. No issuance or caller-selected binding.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SOURCE_PRODUCER_AFTER597_PARENT,requireSourceProducerAfter597CodeParent,
  requireSourceProducerAfter597Binding,requireSourceProducerAfter597Output,readSourceProducerAfter597PredecessorCanonicalSource}
  from './source-producer-after597-parent.mjs';
import {assistantLaterH0Definition as definition} from './assistant-later-h0-successor-source.mjs';
import {resolveProductionReferenceTime} from './production-reference-time.mjs';
export const SOURCE_PRODUCER_BEFORE=SOURCE_PRODUCER_AFTER597_PARENT.before;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),CP='ravradar_ravscore_checkpoint_';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};
export const SOURCE_PRODUCER_ALIASES=Object.freeze([
  Object.freeze({name:CP+'source597_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'source597_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:CP+'source597_same_h0_projection',signature:'(jsonb,timestamptz)'}),
]);
const replacements=Object.freeze([CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
const labels=Object.freeze(['source-original597-state-validator','source-original597-payload-validator','source597-same-h0-projection']);
export function requireSourceProducerBinding(){
  requireSourceProducerAfter597Binding(); // FIRST, before operands or source access.
  assert.equal(arguments.length,0);return SOURCE_PRODUCER_AFTER597_PARENT.binding;
}
export function requireSourceProducerOutput(){
  requireSourceProducerAfter597Output(); // FIRST before caller options or I/O.
  assert.equal(arguments.length,0);return SOURCE_PRODUCER_AFTER597_PARENT.output;
}
// A value-only normalization of the inner caller's hour. Never rewrite the
// global request/environment identity or loosen the whole-UTC-hour contract.
export function sourceProducerReferenceHour(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  assert.match(value,/^\d{4}-\d\d-\d\dT\d\d:00:00(?:\.000)?Z$/);
  const actual=resolveProductionReferenceTime(value);assert.equal(Date.parse(actual),Date.parse(value));return actual;
}
export function sourceProducerMigration(){
  requireSourceProducerOutput();assert.equal(arguments.length,0);const {version}=requireSourceProducerBinding();
  const id=version+'_source_producer_original_bound_successor';return Object.freeze({version,id,filename:id+'.sql'});
}
export function sourceProducerCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert(base&&sha(base.definition)===base.sha256);let value=base.definition;
  for(let index=0;index<SOURCE_PRODUCER_ALIASES.length;index++){
    const whole=definition(source,SOURCE_PRODUCER_ALIASES[index].name),at=whole.indexOf('as $$');assert(at>0);
    value+='\n-- '+labels[index]+' --\n'+whole.slice(at+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }return Object.freeze({id:base.id,definition:value,sha256:sha(value)});
}
export async function readSourceProducerCanonicalSource(options){
  const pins=requireSourceProducerOutput(); // FIRST before caller paths or I/O.
  assert(arguments.length<=1);let directory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));directory=path.resolve(options.migrationsDirectory);}
  const prior=await readSourceProducerAfter597PredecessorCanonicalSource(),migration=sourceProducerMigration();
  const file=path.join(directory,migration.filename),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=8*1024*1024);
  const raw=await fs.readFile(file);assert.equal(raw.length,stat.size);assert.equal(sha(raw),pins.migrationSha256);
  const sql=raw.toString('utf8');
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row=>row[1]),
    [...SOURCE_PRODUCER_ALIASES.map(row=>row.name),...replacements]);
  let canonicalSource=prior.canonicalSource;
  for(const name of replacements)canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=SOURCE_PRODUCER_ALIASES.map(row=>definition(sql,row.name)+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...replacements].reverse())inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole genuine597 canonical inverse');
  for(const row of prior.originalDefinitions)assert.equal(definition(canonicalSource,row.name),row.definition);
  assert.deepEqual(await fs.readFile(file),raw);
  return Object.freeze({...prior,canonicalSource,migration,sourcePhase:'source-producer-after597',admission:'NO_ADMISSION'});
}
