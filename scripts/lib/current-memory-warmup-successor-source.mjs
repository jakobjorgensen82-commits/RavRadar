// New current-memory warmup phase AFTER genuine native0600 + installed statistics230.
// This is SOURCE preparation, not installation or current binding authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NATIVE0600_ORIGINAL_PREDECESSOR as OLD,readNative0600OriginalPredecessorSource}
  from './native0600-original-successor-source.mjs';
import {nativeIdentitySqlDefinition} from './native-sampling-identity-successor-source.mjs';
import {buildStatisticsPreferenceRevision} from '../build-statistics-preference-revision.mjs';

// ROOT freezes these ONLY after reviewed product integration/versioning and
// physical C -> rendered C -> I -> rendered I -> T. No guessed identity/time.
export const CURRENT_MEMORY_WARMUP_BINDING=Object.freeze({
  version:'20261017020000',
  C:'76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8',
  I:'84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3',
  T:'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f',
  candidateManifestSha256:'76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8',
  integratedManifestSha256:'f2cbe882ba11ed368714a913a85c40f059ef9972ded1acdcd86dddc02f5e08d7',
});
export const CURRENT_MEMORY_WARMUP_OUTPUT=Object.freeze({
  "migrationSha256": "c8fff609ea03bbc2e5c84bea57b1d7702b15e51cd27f1854692506b18369ef47",
  "canonicalSha256": "dd83aa94167fa7829fe262acc2a0ec598d4e22f45749ccaf7e0ac06565fdd71b",
  "checkpointContractSha256": "3c61ac03289a328de484927d5db018a29440fd244bd414ee6a86a0f12062b6ee",
  "tripBindingPolicySha256": "bbac613e08b38ec989cf19160b416750087a06721c8e8e3e28416ae4bd784517"
});
export const CURRENT_MEMORY_WARMUP_PROJECTION='ravradar_ravscore_checkpoint_cmw_predecessor_projection';
export const CURRENT_MEMORY_WARMUP_BEFORE=OLD;
export const CURRENT_MEMORY_WARMUP_ARCHIVES=Object.freeze(['20261014140000','20261015030000','20261016030000']);
const CP='ravradar_ravscore_checkpoint_';
export const CURRENT_MEMORY_WARMUP_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  'ravradar_trip_v3_binding_allowed',CP+'predecessor_payload_valid',CP+'cas',CP+'contract',
]);
export const CURRENT_MEMORY_WARMUP_SCHEMA2_SHA='ee68e62d59e7d1c92ec0f0629c669f7e9c9756f30e86bc08af21cebdedbbe305';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const MIGRATIONS=path.join(ROOT,'supabase/migrations');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,()=>b);};
export function currentMemoryWarmupDefinition(source,name){
  assert.match(name,/^[a-z0-9_]+$/);
  const re=new RegExp('^create(?: or replace)? function public\\.'+name+'\\(','gm');
  const found=[...source.matchAll(re)];assert.equal(found.length,1,'One complete definition: '+name);
  const start=found[0].index,end=source.indexOf('\n$$;',start);assert(end>start);
  return source.slice(start,end+4);
}
export function requireCurrentMemoryWarmupBinding(){
  assert.equal(arguments.length,0,'No caller binding, migration or source override');
  const value=CURRENT_MEMORY_WARMUP_BINDING;
  if(value===null)throw Object.assign(new Error('CURRENT_MEMORY_WARMUP_UNISSUED'),{code:'CURRENT_MEMORY_WARMUP_UNISSUED'});
  assert(Object.isFrozen(value));
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.match(value.version,/^\d{14}$/);assert(value.version>OLD.version);
  assert(!CURRENT_MEMORY_WARMUP_ARCHIVES.includes(value.version));
  for(const k of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[k],/^[a-f0-9]{64}$/);
  assert.equal(new Set([value.C,value.I,value.T,OLD.candidate,OLD.integrated,OLD.continuation]).size,6);
  return value;
}
export function currentMemoryWarmupMigration(){
  assert.equal(arguments.length,0,'No caller descriptor override');
  const {version}=requireCurrentMemoryWarmupBinding();
  const id=version+'_current_memory_warmup_original_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
export function requireCurrentMemoryWarmupOutput(){
  assert.equal(arguments.length,0,'No caller output override');
  requireCurrentMemoryWarmupBinding();
  const value=CURRENT_MEMORY_WARMUP_OUTPUT;
  assert(value&&Object.isFrozen(value),'CURRENT_MEMORY_WARMUP_SQL_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const v of Object.values(value))assert.match(v,/^[a-f0-9]{64}$/);
  assert.notEqual(value.canonicalSha256,OLD.canonicalSha256);
  assert.notEqual(value.migrationSha256,OLD.migrationSha256);
  return value;
}
export function assertCurrentMemoryWarmupArchivesAbsent(local,remote){
  assert.equal(arguments.length,2);
  for(const versions of [local,remote]){
    assert(versions instanceof Set);
    for(const version of versions)assert.match(version,/^\d{8,14}$/);
    for(const archive of CURRENT_MEMORY_WARMUP_ARCHIVES)
      assert(!versions.has(archive),'Archived assistant phase must be absent: '+archive);
  }
}
function directory(options){
  if(options===undefined)return MIGRATIONS;
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options),['migrationsDirectory'],'Only the normal exact-byte SQL fixture seam');
  assert.equal(typeof options.migrationsDirectory,'string');assert(path.isAbsolute(options.migrationsDirectory));
  return path.resolve(options.migrationsDirectory);
}
// Genuine230 initializer; never installed/replayed by this successor.
function schema2Initializer(historical,revision){
  assert.equal(sha(historical),OLD.accountSourceSha256);
  assert.equal(sha(revision),'687532cc1d4998b2f5ec404d99a315234383bea73744614d49df369a61c99458');
  const edits=[];let after=historical;
  const edit=(a,b)=>{after=once(after,a,b);edits.push([a,b]);};
  edit('  enabled boolean not null\n);','  enabled boolean not null,\n  revision bigint not null default 0 check (revision >= 0)\n);');
  for(const name of ['get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference'])
    edit(currentMemoryWarmupDefinition(after,name),currentMemoryWarmupDefinition(revision,name));
  const setter=currentMemoryWarmupDefinition(revision,'set_own_statistics_preference');
  const acl='revoke all on function public.set_own_statistics_preference(boolean, bigint) from public, anon, authenticated;\n'
    +'grant execute on function public.set_own_statistics_preference(boolean, bigint) to authenticated;';
  const anchor=currentMemoryWarmupDefinition(after,'enable_own_statistics_preference');
  edit(anchor,setter+'\n'+acl+'\n\n'+anchor);
  let inverse=after;for(const [a,b] of [...edits].reverse())inverse=once(inverse,b,a);
  assert.equal(inverse,historical,'Whole schema1 initializer inverse');
  assert.equal(currentMemoryWarmupDefinition(after,'record_account_activity'),currentMemoryWarmupDefinition(historical,'record_account_activity'));
  assert.equal(sha(after),CURRENT_MEMORY_WARMUP_SCHEMA2_SHA);return after;
}
export async function readCurrentMemoryWarmupBeforeSource(options){
  assert(arguments.length<=1,'No before-source override');
  const migrationsDirectory=directory(options);
  const predecessor=await readNative0600OriginalPredecessorSource({migrationsDirectory});
  assert.equal(sha(predecessor.canonicalSource),OLD.canonicalSha256);
  assert.equal(predecessor.predecessor.version,OLD.version);
  assert.equal(predecessor.originalDefinitions.length,8);
  const stats=await buildStatisticsPreferenceRevision({migrationsDirectory});
  assert.equal(stats.migration,predecessor.statisticsMigration);
  return Object.freeze({...predecessor,historicalSchema1:predecessor.accountSource,
    statisticsSchema2Source:schema2Initializer(predecessor.accountSource,stats.revisionSource),
    migration:Object.freeze({version:OLD.version,filename:OLD.filename})});
}
export async function readCurrentMemoryWarmupCanonicalSource(options){
  requireCurrentMemoryWarmupOutput(); // FIRST: no I/O or directory admission while unissued.
  assert(arguments.length<=1,'No after-source override');
  const migrationsDirectory=directory(options),descriptor=currentMemoryWarmupMigration(),pins=CURRENT_MEMORY_WARMUP_OUTPUT;
  const prior=await readCurrentMemoryWarmupBeforeSource({migrationsDirectory});
  const filename=path.join(migrationsDirectory,descriptor.filename),stat=await fs.lstat(filename);
  assert(stat.isFile()&&!stat.isSymbolicLink(),'Regular frozen successor SQL required');
  const bytes=await fs.readFile(filename);assert.equal(sha(bytes),pins.migrationSha256,'Whole raw new SQL');
  const sql=bytes.toString('utf8');
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [CURRENT_MEMORY_WARMUP_PROJECTION,...CURRENT_MEMORY_WARMUP_REPLACEMENTS]);
  let canonicalSource=prior.canonicalSource;
  for(const name of CURRENT_MEMORY_WARMUP_REPLACEMENTS)
    canonicalSource=once(canonicalSource,currentMemoryWarmupDefinition(canonicalSource,name),currentMemoryWarmupDefinition(sql,name));
  const insertion=currentMemoryWarmupDefinition(sql,CURRENT_MEMORY_WARMUP_PROJECTION)+'\nrevoke all on function public.'
    +CURRENT_MEMORY_WARMUP_PROJECTION+'(jsonb,timestamptz) from public, anon, authenticated;\n\n';
  const anchor=currentMemoryWarmupDefinition(canonicalSource,CP+'integrated_state_valid');
  canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...CURRENT_MEMORY_WARMUP_REPLACEMENTS].reverse())
    inverse=once(inverse,currentMemoryWarmupDefinition(inverse,name),currentMemoryWarmupDefinition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole native0600 canonical inverse');
  for(const {name,definition} of prior.originalDefinitions)
    assert.equal(currentMemoryWarmupDefinition(canonicalSource,name),definition,'All eight frozen originals');
  assert.deepEqual(await fs.readFile(filename),bytes,'Recheck source before return');
  return Object.freeze({...prior,canonicalSource,migration:descriptor,admission:'NO_ADMISSION'});
}
