// SOURCE ONLY: genuine140000 -> last-mile enclosure producer successor.
// No placeholder tuple, installer, state admission or SAME_H0 projection.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEstablishedNativeCurrentOriginCanonicalSource,
  requireEstablishedNativeCurrentOriginBinding,requireEstablishedNativeCurrentOriginOutput}
  from './established-native-current-origin-successor-source.mjs';
export const LAST_MILE_ENCLOSURE_RELEASE='4.0.584';
export const LAST_MILE_ENCLOSURE_VERSION='20261019060000';
export const LAST_MILE_ENCLOSURE_BEFORE=Object.freeze({
  version:'20261017140000',
  C:'5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858',
  I:'038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f',
  T:'047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447',
  canonicalSha256:'97ba4b9b56ee514f7ce4f509ad17f64c65c3be9e3cdbbdb6a335e5b87191680a',
  migrationSha256:'f1d12590cfc93047afa94cdf152fab6e77f2851807695f0771127a2fdf6122b5',
});
// ROOT may issue these ONLY from the complete real rendered C -> I -> T.
export const LAST_MILE_ENCLOSURE_BINDING=Object.freeze({
  version:LAST_MILE_ENCLOSURE_VERSION,
  C:'47a27aec034d8d7cbab7755a19025d796b6fe51c2b276676c7309c912a85f501',
  I:'bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947',
  T:'7532755a43f8bb2ccc125efa3aa747ed03365b720d13addfcdb91ce4b74d908c',
  candidateManifestSha256:'47a27aec034d8d7cbab7755a19025d796b6fe51c2b276676c7309c912a85f501',
  integratedManifestSha256:'bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947',
});
export const LAST_MILE_ENCLOSURE_OUTPUT=Object.freeze({
  migrationSha256:'7d21e67a9d9b9ef5e1322a7e746120b289185ac09f24701044cbc7254617fd67',
  canonicalSha256:'010da14413d92998a93b60743b7cddd8d3cc0b6b1ca22f7c257b3bd0448684f8',
  checkpointContractSha256:'4f3bfa91c8f6ba4fb7ca4a13ed0e88b8d6c71390696a20923e790600a210f356',
  tripBindingPolicySha256:'254f85d69442e4c9686179851f55e76c64954d5afb51b994e18057d59fc7c669',
});
export const LAST_MILE_ENCLOSURE_PLANNED_MIGRATION=Object.freeze({
  version:LAST_MILE_ENCLOSURE_VERSION,
  id:LAST_MILE_ENCLOSURE_VERSION+'_last_mile_enclosure_original_bound_successor',
  filename:LAST_MILE_ENCLOSURE_VERSION+'_last_mile_enclosure_original_bound_successor.sql',
});
const CP='ravradar_ravscore_checkpoint_';
export const LAST_MILE_ENCLOSURE_ALIASES=Object.freeze([
  Object.freeze({name:CP+'lme140000_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'lme140000_payload_valid',signature:'(jsonb,timestamptz)'}),
]);
export const LAST_MILE_ENCLOSURE_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'native_origin_projection','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract',
]);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
export function requireLastMileEnclosureBinding(){
  assert.equal(arguments.length,0,'No caller tuple, source or version override');
  const value=LAST_MILE_ENCLOSURE_BINDING;
  assert(value&&Object.isFrozen(value),'LAST_MILE_ENCLOSURE_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.equal(value.version,LAST_MILE_ENCLOSURE_VERSION);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(value.C,value.candidateManifestSha256);assert.equal(value.I,value.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[value[k],LAST_MILE_ENCLOSURE_BEFORE[k]])).size,6);
  return value;
}
export function requireLastMileEnclosureOutput(){
  assert.equal(arguments.length,0);requireLastMileEnclosureBinding();
  const value=LAST_MILE_ENCLOSURE_OUTPUT;
  assert(value&&Object.isFrozen(value),'LAST_MILE_ENCLOSURE_OUTPUT_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const pin of Object.values(value))assert.match(pin,/^[a-f0-9]{64}$/);return value;
}
export function lastMileEnclosureMigration(){
  assert.equal(arguments.length,0);requireLastMileEnclosureBinding();return LAST_MILE_ENCLOSURE_PLANNED_MIGRATION;
}
export function lastMileEnclosureDefinition(source,name){
  assert.match(name,/^[a-z0-9_]+$/);
  const matches=[...source.matchAll(new RegExp('^create(?: or replace)? function public\\.'+name+'\\(','gm'))];
  assert.equal(matches.length,1,'One whole function definition: '+name);
  const at=matches[0].index,end=source.indexOf('\n$$;',at);assert(end>at);return source.slice(at,end+4);
}
export async function readLastMileEnclosurePredecessorCanonicalSource(){
  assert.equal(arguments.length,0);
  const binding=requireEstablishedNativeCurrentOriginBinding(),pins=requireEstablishedNativeCurrentOriginOutput();
  assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
    canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256},LAST_MILE_ENCLOSURE_BEFORE);
  const prior=await readEstablishedNativeCurrentOriginCanonicalSource();
  assert.equal(sha(prior.canonicalSource),LAST_MILE_ENCLOSURE_BEFORE.canonicalSha256);
  assert.equal(prior.admission,'NO_ADMISSION');return prior;
}
// Pure complete renderer extension; public source/readiness entrypoints still
// require the fixed issued binding/output before any new-phase I/O.
export function lastMileEnclosureCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert(base&&sha(base.definition)===base.sha256);
  let definition=base.definition;
  const labels=['last-mile-original140000-state-validator','last-mile-original140000-payload-validator'];
  for(let i=0;i<LAST_MILE_ENCLOSURE_ALIASES.length;i++){
    const whole=lastMileEnclosureDefinition(source,LAST_MILE_ENCLOSURE_ALIASES[i].name);
    const at=whole.indexOf('as $$');assert(at>0);
    definition+='\n-- '+labels[i]+' --\n'+whole.slice(at+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }
  return Object.freeze({id:base.id,definition,sha256:sha(definition)});
}
export async function readLastMileEnclosureCanonicalSource(options){
  const pins=requireLastMileEnclosureOutput(); // FIRST: UNISSUED fails before I/O/paths.
  assert(arguments.length<=1);let directory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));directory=path.resolve(options.migrationsDirectory);}
  const prior=await readLastMileEnclosurePredecessorCanonicalSource();
  const file=path.join(directory,lastMileEnclosureMigration().filename),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  const raw=await fs.readFile(file);assert.equal(sha(raw),pins.migrationSha256);
  const sql=raw.toString('utf8'),definition=lastMileEnclosureDefinition;
  const names=[...LAST_MILE_ENCLOSURE_ALIASES.map(r=>r.name),...LAST_MILE_ENCLOSURE_REPLACEMENTS];
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),names);
  const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,()=>b);};
  let canonicalSource=prior.canonicalSource;
  for(const name of LAST_MILE_ENCLOSURE_REPLACEMENTS)canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=LAST_MILE_ENCLOSURE_ALIASES.map(r=>definition(sql,r.name)+'\nrevoke all on function public.'+r.name+r.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...LAST_MILE_ENCLOSURE_REPLACEMENTS].reverse())inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole actual140000 source inverse');
  for(const row of prior.originalDefinitions)assert.equal(definition(canonicalSource,row.name),row.definition,'Every earlier issued original stays unchanged');
  assert.deepEqual(await fs.readFile(file),raw);return Object.freeze({...prior,canonicalSource,migration:lastMileEnclosureMigration(),admission:'NO_ADMISSION'});
}
