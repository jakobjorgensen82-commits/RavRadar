// Append-only SOURCE authority after genuine installed0200. Not an installer.
// Frozen old SQL and numerical state remain independently verifiable.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CURRENT_MEMORY_WARMUP_BINDING as OLD,CURRENT_MEMORY_WARMUP_OUTPUT as PINS,
  readCurrentMemoryWarmupCanonicalSource,currentMemoryWarmupDefinition as definition}
  from './current-memory-warmup-successor-source.mjs';

// ROOT issues only after physical C -> rendered C -> I -> rendered I -> T.
export const ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING=Object.freeze({
  version:'20261017140000',
  C:'5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858',
  I:'038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f',
  T:'047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447',
  candidateManifestSha256:'5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858',
  integratedManifestSha256:'038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f',
});
export const ESTABLISHED_NATIVE_CURRENT_ORIGIN_OUTPUT=Object.freeze({
  migrationSha256:'f1d12590cfc93047afa94cdf152fab6e77f2851807695f0771127a2fdf6122b5',
  canonicalSha256:'97ba4b9b56ee514f7ce4f509ad17f64c65c3be9e3cdbbdb6a335e5b87191680a',
  checkpointContractSha256:'044469ff9158dbb17914311213721ba13b51edb1052f77c6fceba7955c90203f',
  tripBindingPolicySha256:'af750bf4928b9e0f3a5ede63e680bb0d546e0539883b42831bca0217649da8dc',
});
export const ESTABLISHED_NATIVE_CURRENT_ORIGIN_BEFORE=Object.freeze({
  version:OLD.version,integrated:OLD.I,candidate:OLD.C,continuation:OLD.T,
  canonicalSha256:PINS.canonicalSha256,migrationSha256:PINS.migrationSha256,
});
const CP='ravradar_ravscore_checkpoint_';
export const ESTABLISHED_NATIVE_CURRENT_ORIGIN_PROJECTION=CP+'native_origin_projection';
export const ESTABLISHED_NATIVE_CURRENT_ORIGIN_ALIASES=Object.freeze([
  Object.freeze({name:CP+'cmw0200_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'cmw0200_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:ESTABLISHED_NATIVE_CURRENT_ORIGIN_PROJECTION,signature:'(jsonb,timestamptz)'}),
]);
export const ESTABLISHED_NATIVE_CURRENT_ORIGIN_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'cmw_predecessor_projection',CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',
  CP+'cas',CP+'contract',
]);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const MIGRATIONS=path.join(ROOT,'supabase/migrations');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};
export function requireEstablishedNativeCurrentOriginBinding(){
  assert.equal(arguments.length,0,'No caller source, version or binding override');
  const value=ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING;
  assert(value&&Object.isFrozen(value),'ESTABLISHED_NATIVE_CURRENT_ORIGIN_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.match(value.version,/^\d{14}$/);assert(value.version>OLD.version);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set([value.C,value.I,value.T,OLD.C,OLD.I,OLD.T]).size,6);
  return value;
}
export function establishedNativeCurrentOriginMigration(){
  assert.equal(arguments.length,0);
  const {version}=requireEstablishedNativeCurrentOriginBinding();
  const id=version+'_established_native_current_origin_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
export function requireEstablishedNativeCurrentOriginOutput(){
  assert.equal(arguments.length,0);requireEstablishedNativeCurrentOriginBinding();
  const value=ESTABLISHED_NATIVE_CURRENT_ORIGIN_OUTPUT;
  assert(value&&Object.isFrozen(value),'ESTABLISHED_NATIVE_CURRENT_ORIGIN_SQL_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const pin of Object.values(value))assert.match(pin,/^[a-f0-9]{64}$/);
  assert.notEqual(value.canonicalSha256,PINS.canonicalSha256);
  assert.notEqual(value.migrationSha256,PINS.migrationSha256);return value;
}
function directory(options){
  if(options===undefined)return MIGRATIONS;
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options),['migrationsDirectory'],'Only the normal exact-byte SQL fixture seam');
  assert.equal(typeof options.migrationsDirectory,'string');assert(path.isAbsolute(options.migrationsDirectory));
  return path.resolve(options.migrationsDirectory);
}
export async function readEstablishedNativeCurrentOriginCanonicalSource(options){
  const pins=requireEstablishedNativeCurrentOriginOutput(); // FIRST, before caller paths or I/O.
  assert(arguments.length<=1,'No caller source or SQL override');
  const migrationsDirectory=directory(options),migration=establishedNativeCurrentOriginMigration();
  const prior=await readCurrentMemoryWarmupCanonicalSource({migrationsDirectory});
  assert.equal(sha(prior.canonicalSource),PINS.canonicalSha256);
  const filename=path.join(migrationsDirectory,migration.filename),stat=await fs.lstat(filename);
  assert(stat.isFile()&&!stat.isSymbolicLink(),'Regular immutable successor SQL required');
  const bytes=await fs.readFile(filename);assert.equal(sha(bytes),pins.migrationSha256,'Whole raw issued SQL');
  const sql=bytes.toString('utf8');
  const names=[...ESTABLISHED_NATIVE_CURRENT_ORIGIN_ALIASES.map(row=>row.name),...ESTABLISHED_NATIVE_CURRENT_ORIGIN_REPLACEMENTS];
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row=>row[1]),names);
  let canonicalSource=prior.canonicalSource;
  for(const name of ESTABLISHED_NATIVE_CURRENT_ORIGIN_REPLACEMENTS)
    canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=ESTABLISHED_NATIVE_CURRENT_ORIGIN_ALIASES.map(row=>definition(sql,row.name)
    +'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');
  canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...ESTABLISHED_NATIVE_CURRENT_ORIGIN_REPLACEMENTS].reverse())
    inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole genuine0200 canonical inverse');
  for(const {name,definition:original}of prior.originalDefinitions)
    assert.equal(definition(canonicalSource,name),original,'All eight original families unchanged');
  const frozenState=definition(canonicalSource,CP+'cmw0200_state_valid');
  const frozenPayload=definition(canonicalSource,CP+'cmw0200_payload_valid');
  assert.equal(once(frozenState,'function public.'+CP+'cmw0200_state_valid(',
    'function public.'+CP+'integrated_state_valid('),definition(prior.canonicalSource,CP+'integrated_state_valid'));
  assert.equal(once(once(frozenPayload,'function public.'+CP+'cmw0200_payload_valid(',
    'function public.'+CP+'payload_valid('),'public.'+CP+'cmw0200_state_valid(',
    'public.'+CP+'integrated_state_valid('),definition(prior.canonicalSource,CP+'payload_valid'));
  assert.deepEqual(await fs.readFile(filename),bytes,'Issued source bytes retained');
  return Object.freeze({...prior,canonicalSource,migration,admission:'NO_ADMISSION'});
}
