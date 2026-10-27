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
  assert(arguments.length<=1);
  return readFixedCanonicalSource(ISSUED587_SOURCE,options,pins,migration);
}
async function readFixedCanonicalSource(profile,options,pins,migration){
  assert(profile===ISSUED587_SOURCE||profile===PUBLIC587_SUCCESSOR_SOURCE||profile===PUBLIC588_SUCCESSOR_SOURCE,'ASSISTANT_SUCCESSOR_UNKNOWN_SOURCE_PROFILE');
  let migrationsDirectory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));
    migrationsDirectory=path.resolve(options.migrationsDirectory);}
  const prior=await profile.readPredecessor();
  const file=path.join(migrationsDirectory,migration.filename),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=await fs.readFile(file);
  assert.equal(sha(bytes),pins.migrationSha256);
  const sql=bytes.toString('utf8'),def=nativeOriginalContinuityDefinition;
  const replacements=['integrated_state_valid','payload_valid','integrated_state_reason','payload_reason',
    'cas','contract'].map(s=>'ravradar_ravscore_checkpoint_'+s);
  replacements.splice(4,0,'ravradar_trip_v3_binding_allowed');
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...profile.aliases.map(row=>row.name),...replacements]);
  let canonicalSource=prior.canonicalSource;
  for(const name of replacements){const before=def(canonicalSource,name);
    assert.equal(canonicalSource.split(before).length,2);canonicalSource=canonicalSource.replace(before,()=>def(sql,name));}
  const addition=profile.aliases.map(row=>def(sql,row.name)
    +'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=def(canonicalSource,replacements[0]);canonicalSource=canonicalSource.replace(anchor,()=>addition+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=canonicalSource.replace(addition,'');
  for(const name of [...replacements].reverse())inverse=inverse.replace(def(inverse,name),()=>def(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole genuine'+profile.previousRelease+' canonical inverse');
  for(const original of prior.originalDefinitions)assert.equal(def(canonicalSource,original.name),original.definition);
  assert.deepEqual(await fs.readFile(file),bytes);
  return Object.freeze({...prior,canonicalSource,migration,admission:'NO_ADMISSION'});
}

// Fast profil for den faktisk offentlige 587. Disse kildepins er DATA,
// ikke en snapshotkapabilitet eller tilladelse til at læse en anden familie.
export const ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE=Object.freeze({
  sourceHead:'aab72babd27175a4276c2a2f1965c74bb021b4af',
  sourceTree:'959f63d40c3980e804caa750da227cbd96e34a49',
  version:'20261022181403',
  C:'5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4',
  I:'5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2',
  T:'cd3a3648ad5093662871559aa39d77671eda27edf1f9edc82a104c5430a43a21',
  canonicalSha256:'b14e0f9905bed1a4a2be13870bd2af54f82ebdcf4703847548b227ad2051ad04'});
export const ASSISTANT_PUBLIC587_SUCCESSOR_BINDING=Object.freeze({
  version:'20261025110000',
  C:'00905533cd243ffce8e507beedbc39c8dba26e635b59fa154e6f9ab20575780c',
  I:'5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac',
  T:'d98559d56d7bfe9b141cf1ddab73cddffb688a3b6766f5f9f3779b226f573701'});
export const ASSISTANT_PUBLIC587_SUCCESSOR_OUTPUT=Object.freeze({
  migrationSha256:'363d3f304150e8abd61e0217848839bd7babb4e5687f3e61a1a6e84b948f589f',
  canonicalSha256:'cc97ffdf3533dc16e2325205ad75a3d5bfaadca44fa45b7bbadaaa6e8580b38a',
  checkpointContractSha256:'899a3b770fd0e987fb3a578d221f7f903a9e6dbd09c89817e06252db3cdbc0fe',
  tripBindingPolicySha256:'78cea33888241950c77b7db287627ae34626580d52ca35b9d4c90ddc10842984'});
export const ASSISTANT_PUBLIC587_SUCCESSOR_RELEASE='4.0.588'; // Lokal kildeudstedelse, ikke installation eller offentlig levering.
export const ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES=Object.freeze([
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask587_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask587_payload_valid',signature:'(jsonb,timestamptz)'})]);
export function requireAssistantPublic587SuccessorBinding(){
  assert.equal(arguments.length,0);
  const b=ASSISTANT_PUBLIC587_SUCCESSOR_BINDING;
  assert(b&&Object.isFrozen(b),'ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED');
  assert.deepEqual(Object.keys(b).sort(),['C','I','T','version']);
  assert.match(b.version,/^[0-9]{14}$/);assert(b.version>ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.version);
  for(const key of ['C','I','T'])assert.match(b[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[b[k],ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE[k]])).size,6);
  return b;
}
export function requireAssistantPublic587SuccessorOutput(){
  assert.equal(arguments.length,0);requireAssistantPublic587SuccessorBinding();
  const p=ASSISTANT_PUBLIC587_SUCCESSOR_OUTPUT;
  assert(p&&Object.isFrozen(p),'ASSISTANT_PUBLIC587_SUCCESSOR_SQL_UNISSUED');
  assert.deepEqual(Object.keys(p).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const value of Object.values(p))assert.match(value,/^[a-f0-9]{64}$/);return p;
}
export function requireAssistantPublic587SuccessorRelease(){
  assert.equal(arguments.length,0);requireAssistantPublic587SuccessorOutput();
  assert.equal(ASSISTANT_PUBLIC587_SUCCESSOR_RELEASE,'4.0.588','ASSISTANT_PUBLIC587_SUCCESSOR_RELEASE_UNISSUED');
  return ASSISTANT_PUBLIC587_SUCCESSOR_RELEASE;
}
export function assistantPublic587SuccessorMigration(){
  assert.equal(arguments.length,0);
  const {version}=requireAssistantPublic587SuccessorBinding();
  const id=version+'_assistant_public587_later_h0_original_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
export async function readAssistantPublic587PredecessorCanonicalSource(){
  assert.equal(arguments.length,0);
  const binding=requireAssistantLaterH0Binding(),output=requireAssistantLaterH0Output();
  assert.equal(requireAssistantLaterH0Release(),'4.0.587');
  assert.deepEqual({...binding,canonicalSha256:output.canonicalSha256},
    Object.fromEntries(['version','C','I','T','canonicalSha256'].map(k=>[k,ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE[k]])));
  assert.equal(output.migrationSha256,'b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7');
  assert.equal(output.checkpointContractSha256,'207733bbbea2aa2f7747685a1a626b63d740aee3b607cfb920fabe50619e6596');
  assert.equal(output.tripBindingPolicySha256,'831d5472a32eb22339253e2b0734bd9cc9b478e48ec6caf078e2fd42de646d67');
  const prior=await readAssistantLaterH0CanonicalSource();
  assert.equal(sha(prior.canonicalSource),ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.canonicalSha256);
  assert.equal(prior.admission,'NO_ADMISSION');
  return prior; // Kun eksakt udstedt SQL-kilde; ingen B/S- eller installeret DB-autoritet.
}
export function assistantPublic587SuccessorCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);
  const preserved=assistantLaterH0CheckpointContractFromBase(source,base);
  let text=preserved.definition;
  for(let i=0;i<ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES.length;i++){
    const whole=nativeOriginalContinuityDefinition(source,ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES[i].name);
    text+='\n-- assistant-later-h0-original587-'+(i===0?'state':'payload')+'-validator --\n'
      +whole.slice(whole.indexOf('as $$')+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }
  return Object.freeze({id:base.id,definition:text,sha256:sha(text)});
}

const ISSUED587_SOURCE=Object.freeze({
  readPredecessor:readAssistantLaterH0PredecessorCanonicalSource,
  aliases:ASSISTANT_LATER_H0_ALIASES,previousRelease:586});
const PUBLIC587_SUCCESSOR_SOURCE=Object.freeze({
  readPredecessor:readAssistantPublic587PredecessorCanonicalSource,
  aliases:ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,previousRelease:587});
export async function readAssistantPublic587SuccessorCanonicalSource(options){
  const pins=requireAssistantPublic587SuccessorOutput(),migration=assistantPublic587SuccessorMigration();
  assert(arguments.length<=1);
  return readFixedCanonicalSource(PUBLIC587_SUCCESSOR_SOURCE,options,pins,migration);
}


// Kalender-only efter den ægte588-familie. Udstedt kildebinding, ikke installeret; ingen SOURCE-aktivering.
// Disse nye kildeejede felter kan ikke sættes af miljø, tuple eller caller.
export const ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE=Object.freeze({
  sourceHead:'b57480082fb16f31ed4e4aa2bc308fff9abfe2d0',sourceTree:'fe3b9bf6270c2a506aac003d57e1e4d2a7d491de',
  version:'20261025110000',
  C:'00905533cd243ffce8e507beedbc39c8dba26e635b59fa154e6f9ab20575780c',
  I:'5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac',
  T:'d98559d56d7bfe9b141cf1ddab73cddffb688a3b6766f5f9f3779b226f573701',
  canonicalSha256:'cc97ffdf3533dc16e2325205ad75a3d5bfaadca44fa45b7bbadaaa6e8580b38a',
});
export const ASSISTANT_PUBLIC588_SUCCESSOR_BINDING=Object.freeze({
  version:'20261027124633',
  C:'bca59cb435cb3f35041c665d2954f0ef04b189b572219771fc5628e4f7ccb551',
  I:'4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819',
  T:'d444e6141038f56dd04b97a55eefe07bbd98f122fb3b76a43bdddacff2d88c8a',
});
export const ASSISTANT_PUBLIC588_SUCCESSOR_OUTPUT=Object.freeze({
  migrationSha256:'eb0262716b66d29d52bf0ac4412c475ab5e9ea69e1cad15eabc9a31b48bcf821',
  canonicalSha256:'4c853a74379abb6983d6d06c353f0b51cf9b004859aa571fc4d5b668274d36df',
  checkpointContractSha256:'27f2c947268693a0d545ba8f1066c16cae789efe440f12b4295dca46c62ec8c9',
  tripBindingPolicySha256:'822f0052836a5b6acf40aa905374a29cb512d10c04ee0d4b6fccdc06f752f14d',
});
export const ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE='4.0.590';
export const ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES=Object.freeze([
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask588_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask588_payload_valid',signature:'(jsonb,timestamptz)'})]);
export function requireAssistantPublic588SuccessorBinding(){
  assert.equal(arguments.length,0);
  const b=ASSISTANT_PUBLIC588_SUCCESSOR_BINDING;
  assert(b&&Object.isFrozen(b),'ASSISTANT_PUBLIC588_SUCCESSOR_UNISSUED');
  assert.deepEqual(Object.keys(b).sort(),['C','I','T','version']);
  assert.match(b.version,/^[0-9]{14}$/);assert(b.version>ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE.version);
  for(const key of ['C','I','T'])assert.match(b[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[b[k],ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE[k]])).size,6);
  for(const key of ['sourceHead','sourceTree'])assert.match(ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE[key],/^[a-f0-9]{40}$/);
  return b;
}
export function requireAssistantPublic588SuccessorOutput(){
  assert.equal(arguments.length,0);requireAssistantPublic588SuccessorBinding();
  const p=ASSISTANT_PUBLIC588_SUCCESSOR_OUTPUT;
  assert(p&&Object.isFrozen(p),'ASSISTANT_PUBLIC588_SUCCESSOR_SQL_UNISSUED');
  assert.deepEqual(Object.keys(p).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const value of Object.values(p))assert.match(value,/^[a-f0-9]{64}$/);return p;
}
export function requireAssistantPublic588SuccessorRelease(){
  assert.equal(arguments.length,0);requireAssistantPublic588SuccessorOutput();
  const release=ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE;
  assert.equal(typeof release,'string','ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE_UNISSUED');
  assert.match(release,/^4\.0\.[1-9][0-9]*$/);
  assert(Number(release.split('.').at(-1))>588,'Fixed calendar successor release must follow genuine588');
  return release;
}
export function assistantPublic588SuccessorMigration(){
  assert.equal(arguments.length,0);
  const {version}=requireAssistantPublic588SuccessorBinding();
  const id=version+'_assistant_public588_later_h0_original_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
export async function readAssistantPublic588PredecessorCanonicalSource(){
  assert.equal(arguments.length,0);
  const binding=requireAssistantPublic587SuccessorBinding(),output=requireAssistantPublic587SuccessorOutput();
  assert.equal(requireAssistantPublic587SuccessorRelease(),'4.0.588');
  assert.deepEqual({...binding,canonicalSha256:output.canonicalSha256},
    Object.fromEntries(['version','C','I','T','canonicalSha256'].map(k=>[k,ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE[k]])));
  const prior=await readAssistantPublic587SuccessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE.canonicalSha256);
  assert.equal(prior.admission,'NO_ADMISSION');return prior;
}
export function assistantPublic588SuccessorCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);
  let text=assistantPublic587SuccessorCheckpointContractFromBase(source,base).definition;
  for(let i=0;i<ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES.length;i++){
    const whole=nativeOriginalContinuityDefinition(source,ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES[i].name);
    text+='\n-- assistant-later-h0-original588-'+(i===0?'state':'payload')+'-validator --\n'
      +whole.slice(whole.indexOf('as $$')+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }
  return Object.freeze({id:base.id,definition:text,sha256:sha(text)});
}
const PUBLIC588_SUCCESSOR_SOURCE=Object.freeze({
  readPredecessor:readAssistantPublic588PredecessorCanonicalSource,
  aliases:ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,previousRelease:588});
export async function readAssistantPublic588SuccessorCanonicalSource(options){
  const pins=requireAssistantPublic588SuccessorOutput(),migration=assistantPublic588SuccessorMigration();
  assert(arguments.length<=1);
  return readFixedCanonicalSource(PUBLIC588_SUCCESSOR_SOURCE,options,pins,migration);
}

// Aktiv operativ familie vælges KUN af denne gennemgåede kilde. De gamle
// navngivne586→587-eksporter ovenfor forbliver historiske; NULL falder aldrig tilbage.
export function assertAssistantPublic587SuccessorTarget(descriptor,targetReferenceAt){
  assert.equal(arguments.length,2);
  assert.equal(descriptor?.modelBinding?.modelBundleSha256,ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.I);
  assert.equal(descriptor?.contractHashes?.continuationStateContractSha256,ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.T);
  for(const value of [descriptor.productionReferenceAt,targetReferenceAt]){
    assert.equal(typeof value,'string');assert.match(value,/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
    assert.equal(new Date(value).toISOString(),value);
  }
  assert(Date.parse(targetReferenceAt)>Date.parse(descriptor.productionReferenceAt),'ASSISTANT_PUBLIC587_SUCCESSOR_STRICTLY_LATER');
  return true; // Ren data-/tidskontrol, ingen autentificering eller kapabilitet.
}
export function assertAssistantPublic587SuccessorCaller(env){
  assert.equal(arguments.length,1);
  // GitHub retains the top-level caller identity inside reusable workflows.
  // These are the two existing ordinary entrances, not caller-selected aliases.
  assert(['Update weather and deploy RavRadar','Run current RavRadar weather once'].includes(env.GITHUB_WORKFLOW));
  assert.equal(env.GITHUB_REF,'refs/heads/main');
  assert(['workflow_dispatch','schedule'].includes(env.GITHUB_EVENT_NAME));
  assert.match(env.GITHUB_RUN_ATTEMPT??'',/^[1-9][0-9]{0,5}$/);assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert(['integrated','integrated-historical-maintenance'].includes(env.OPERATIONAL_ACTION));
  for(const key of ['CHECKPOINT_ONLY','QUICK_CONFIRMATION','COMPLETED_PRIVATE_RUNTIME',
    'NATIVE_IDENTITY_RECOVERY','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','RESTART_ARCHIVED_WEATHER',
    'PUBLISH_NEWEST_SAVED_WEATHER'])assert.notEqual(env[key],'true','ASSISTANT_LATER_H0_ORDINARY_ONLY');
}
export function assertAssistantPublic588SuccessorTarget(descriptor,targetReferenceAt){
  assert.equal(arguments.length,2);
  assert.equal(descriptor?.modelBinding?.modelBundleSha256,ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE.I);
  assert.equal(descriptor?.contractHashes?.continuationStateContractSha256,ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE.T);
  for(const value of [descriptor.productionReferenceAt,targetReferenceAt]){
    assert.equal(typeof value,'string');assert.match(value,/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
    assert.equal(new Date(value).toISOString(),value);
  }
  assert(Date.parse(targetReferenceAt)>Date.parse(descriptor.productionReferenceAt),'ASSISTANT_PUBLIC588_SUCCESSOR_STRICTLY_LATER');
  return true; // Ren data-/tidskontrol, ingen autentificering eller kapabilitet.
}
export function assertAssistantPublic588SuccessorCaller(env){
  assert.equal(arguments.length,1);
  // GitHub retains the top-level caller identity inside reusable workflows.
  // These are the two existing ordinary entrances, not caller-selected aliases.
  assert(['Update weather and deploy RavRadar','Run current RavRadar weather once'].includes(env.GITHUB_WORKFLOW));
  assert.equal(env.GITHUB_REF,'refs/heads/main');
  assert(['workflow_dispatch','schedule'].includes(env.GITHUB_EVENT_NAME));
  assert.match(env.GITHUB_RUN_ATTEMPT??'',/^[1-9][0-9]{0,5}$/);assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert(['integrated','integrated-historical-maintenance'].includes(env.OPERATIONAL_ACTION));
  for(const key of ['CHECKPOINT_ONLY','QUICK_CONFIRMATION','COMPLETED_PRIVATE_RUNTIME',
    'NATIVE_IDENTITY_RECOVERY','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','RESTART_ARCHIVED_WEATHER',
    'PUBLISH_NEWEST_SAVED_WEATHER'])assert.notEqual(env[key],'true','ASSISTANT_LATER_H0_ORDINARY_ONLY');
}
// Kun det eksplicitte kildevalg nedenfor aktiverer denne lukkede profil.
// Den tidligere udstedte588-profil og dens navngivne indgange bevares.
export const INACTIVE_ASSISTANT_PUBLIC588_SUCCESSOR=Object.freeze({
  sourcePhase:'assistant-public588-successor',before:ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE,
  binding:ASSISTANT_PUBLIC588_SUCCESSOR_BINDING,output:ASSISTANT_PUBLIC588_SUCCESSOR_OUTPUT,
  requireBinding:requireAssistantPublic588SuccessorBinding,requireOutput:requireAssistantPublic588SuccessorOutput,
  requireRelease:requireAssistantPublic588SuccessorRelease,migration:assistantPublic588SuccessorMigration,
  readCanonicalSource:readAssistantPublic588SuccessorCanonicalSource,
  assertTarget:assertAssistantPublic588SuccessorTarget,assertCaller:assertAssistantPublic588SuccessorCaller,
});

export const ISSUED_ASSISTANT_PUBLIC588_PROFILE=Object.freeze({
  sourcePhase:'assistant-public587-successor',before:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,
  binding:ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,output:ASSISTANT_PUBLIC587_SUCCESSOR_OUTPUT,
  requireBinding:requireAssistantPublic587SuccessorBinding,requireOutput:requireAssistantPublic587SuccessorOutput,
  requireRelease:requireAssistantPublic587SuccessorRelease,migration:assistantPublic587SuccessorMigration,
  readCanonicalSource:readAssistantPublic587SuccessorCanonicalSource,
  assertTarget:assertAssistantPublic587SuccessorTarget,assertCaller:assertAssistantPublic587SuccessorCaller,
});
export const ACTIVE_ASSISTANT_SUCCESSOR=INACTIVE_ASSISTANT_PUBLIC588_SUCCESSOR;
