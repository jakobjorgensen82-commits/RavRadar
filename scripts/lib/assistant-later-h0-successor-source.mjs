// Private inactive proposal. Real final source discovery/issuance is a separate reviewed act.
// No SAME_H0 projection, metadata event, arbitrary family, tuple or root override.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FROZEN590_CODE_SOURCE_PROVENANCE,assertFrozen590CodeSourceSelected,
  FROZEN591_CODE_SOURCE_PROVENANCE,assertFrozen591CodeSourceSelected}
  from '../check-assistant-later-h0-predecessor-source.mjs';
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
  assert(profile===ISSUED587_SOURCE||profile===PUBLIC587_SUCCESSOR_SOURCE||profile===PUBLIC588_SUCCESSOR_SOURCE||profile===PUBLIC590_SUCCESSOR_SOURCE||profile===PUBLIC591_SUCCESSOR_SOURCE||profile===INSTALLED593_ORIGINAL591_SOURCE,'ASSISTANT_SUCCESSOR_UNKNOWN_SOURCE_PROFILE');
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

// UNISSUED next family: immutable590 data, no selected qualified CODE parent.
export const ASSISTANT_PUBLIC590_SUCCESSOR_PARENT=Object.freeze({
  selected:FROZEN590_CODE_SOURCE_PROVENANCE.selected,
  sourceHead:FROZEN590_CODE_SOURCE_PROVENANCE.head,sourceTree:FROZEN590_CODE_SOURCE_PROVENANCE.tree,
});
export const ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE=Object.freeze({
  sourceHead:ASSISTANT_PUBLIC590_SUCCESSOR_PARENT.sourceHead,
  sourceTree:ASSISTANT_PUBLIC590_SUCCESSOR_PARENT.sourceTree,
  ...ASSISTANT_PUBLIC588_SUCCESSOR_BINDING,
  canonicalSha256:ASSISTANT_PUBLIC588_SUCCESSOR_OUTPUT.canonicalSha256,
});
export function requireAssistantPublic590SuccessorParent(){
  assert.equal(arguments.length,0);
  const parent=ASSISTANT_PUBLIC590_SUCCESSOR_PARENT;
  assert(parent&&Object.isFrozen(parent),'ASSISTANT_PUBLIC590_PARENT_UNSELECTED');
  assert.deepEqual(Object.keys(parent).sort(),['selected','sourceHead','sourceTree']);
  assert.equal(parent.selected,true,'ASSISTANT_PUBLIC590_PARENT_UNSELECTED');
  assertFrozen590CodeSourceSelected(); // Same single source-owned parent; no caller override.
  for(const key of ['sourceHead','sourceTree'])assert.match(parent[key],/^[a-f0-9]{40}$/);
  assert.equal(requireAssistantPublic588SuccessorRelease(),'4.0.590');
  assert.deepEqual({...requireAssistantPublic588SuccessorBinding(),canonicalSha256:requireAssistantPublic588SuccessorOutput().canonicalSha256},
    Object.fromEntries(['version','C','I','T','canonicalSha256'].map(key=>[key,ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE[key]])));
  return ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE; // DATA only; not a qualification receipt or runtime authority.
}
export const ASSISTANT_PUBLIC590_SUCCESSOR_BINDING=Object.freeze({"version":"20261028223717","C":"38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64","I":"ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54","T":"b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d"});
export const ASSISTANT_PUBLIC590_SUCCESSOR_OUTPUT=Object.freeze({"migrationSha256":"72b53fb08ea0e5cebcda7e1cbf3bc49a8a3f2417975daeb6daf530c9029c6835","canonicalSha256":"3c289bcd54c9286c1dbbcce82f401305df021a48a1408b146f7bc96f09f754b9","checkpointContractSha256":"e674f6b149042c24f1ffa7cb82cd0623f004d827f89b5a0c3a3b700b7386b7fb","tripBindingPolicySha256":"9319d189f1b09f32ffd357589d0a2c44f46438b7550c6bca96b20430f8db83e1"});
export const ASSISTANT_PUBLIC590_SUCCESSOR_RELEASE="4.0.591";
export const ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES=Object.freeze([
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask590_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask590_payload_valid',signature:'(jsonb,timestamptz)'})]);
export function requireAssistantPublic590SuccessorBinding(){
  assert.equal(arguments.length,0);
  requireAssistantPublic590SuccessorParent(); // FIRST: no parent, no successor.
  const b=ASSISTANT_PUBLIC590_SUCCESSOR_BINDING;
  assert(b&&Object.isFrozen(b),'ASSISTANT_PUBLIC590_SUCCESSOR_UNISSUED');
  assert.deepEqual(Object.keys(b).sort(),['C','I','T','version']);
  assert.match(b.version,/^[0-9]{14}$/);assert(b.version>ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE.version);
  for(const key of ['C','I','T'])assert.match(b[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[b[k],ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE[k]])).size,6);
  for(const key of ['sourceHead','sourceTree'])assert.match(ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE[key],/^[a-f0-9]{40}$/);
  return b;
}
export function requireAssistantPublic590SuccessorOutput(){
  assert.equal(arguments.length,0);requireAssistantPublic590SuccessorBinding();
  const p=ASSISTANT_PUBLIC590_SUCCESSOR_OUTPUT;
  assert(p&&Object.isFrozen(p),'ASSISTANT_PUBLIC590_SUCCESSOR_SQL_UNISSUED');
  assert.deepEqual(Object.keys(p).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const value of Object.values(p))assert.match(value,/^[a-f0-9]{64}$/);return p;
}
export function requireAssistantPublic590SuccessorRelease(){
  assert.equal(arguments.length,0);requireAssistantPublic590SuccessorOutput();
  const release=ASSISTANT_PUBLIC590_SUCCESSOR_RELEASE;
  assert.equal(typeof release,'string','ASSISTANT_PUBLIC590_SUCCESSOR_RELEASE_UNISSUED');
  assert.match(release,/^4\.0\.[1-9][0-9]*$/);
  assert(Number(release.split('.').at(-1))>590,'Fixed assistant successor release must follow genuine590');
  return release;
}
export function assistantPublic590SuccessorMigration(){
  assert.equal(arguments.length,0);
  const {version}=requireAssistantPublic590SuccessorBinding();
  const id=version+'_assistant_public590_later_h0_original_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
export async function readAssistantPublic590PredecessorCanonicalSource(){
  assert.equal(arguments.length,0);requireAssistantPublic590SuccessorParent();
  const prior=await readAssistantPublic588SuccessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE.canonicalSha256);
  assert.equal(prior.admission,'NO_ADMISSION');return prior;
}
export function assistantPublic590SuccessorCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);
  let text=assistantPublic588SuccessorCheckpointContractFromBase(source,base).definition;
  for(let i=0;i<ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES.length;i++){
    const whole=nativeOriginalContinuityDefinition(source,ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES[i].name);
    text+='\n-- assistant-later-h0-original590-'+(i===0?'state':'payload')+'-validator --\n'
      +whole.slice(whole.indexOf('as $$')+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }
  return Object.freeze({id:base.id,definition:text,sha256:sha(text)});
}
const PUBLIC590_SUCCESSOR_SOURCE=Object.freeze({
  readPredecessor:readAssistantPublic590PredecessorCanonicalSource,
  aliases:ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,previousRelease:590});
export async function readAssistantPublic590SuccessorCanonicalSource(options){
  const pins=requireAssistantPublic590SuccessorOutput(),migration=assistantPublic590SuccessorMigration();
  assert(arguments.length<=1);
  return readFixedCanonicalSource(PUBLIC590_SUCCESSOR_SOURCE,options,pins,migration);
}


export function assertAssistantPublic590SuccessorTarget(descriptor,targetReferenceAt){
  assert.equal(arguments.length,2);
  assert.equal(descriptor?.modelBinding?.modelBundleSha256,ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE.I);
  assert.equal(descriptor?.contractHashes?.continuationStateContractSha256,ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE.T);
  for(const value of [descriptor.productionReferenceAt,targetReferenceAt]){
    assert.equal(typeof value,'string');assert.match(value,/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
    assert.equal(new Date(value).toISOString(),value);
  }
  assert(Date.parse(targetReferenceAt)>Date.parse(descriptor.productionReferenceAt),'ASSISTANT_PUBLIC590_SUCCESSOR_STRICTLY_LATER');
  return true; // Ren data-/tidskontrol, ingen autentificering eller kapabilitet.
}
export function assertAssistantPublic590SuccessorCaller(env){
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

export const INACTIVE_ASSISTANT_PUBLIC590_SUCCESSOR=Object.freeze({
  sourcePhase:'assistant-public590-successor',before:ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE,
  binding:ASSISTANT_PUBLIC590_SUCCESSOR_BINDING,output:ASSISTANT_PUBLIC590_SUCCESSOR_OUTPUT,
  requireBinding:requireAssistantPublic590SuccessorBinding,requireOutput:requireAssistantPublic590SuccessorOutput,
  requireRelease:requireAssistantPublic590SuccessorRelease,migration:assistantPublic590SuccessorMigration,
  readCanonicalSource:readAssistantPublic590SuccessorCanonicalSource,
  assertTarget:assertAssistantPublic590SuccessorTarget,assertCaller:assertAssistantPublic590SuccessorCaller,
});


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
// Additive assistant592 candidate from the exact selected, issued public591 family.
export const ASSISTANT_PUBLIC591_SUCCESSOR_PARENT=Object.freeze({
  selected:FROZEN591_CODE_SOURCE_PROVENANCE.selected,
  sourceHead:FROZEN591_CODE_SOURCE_PROVENANCE.head,sourceTree:FROZEN591_CODE_SOURCE_PROVENANCE.tree,
});
export const ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE=Object.freeze({
  sourceHead:ASSISTANT_PUBLIC591_SUCCESSOR_PARENT.sourceHead,
  sourceTree:ASSISTANT_PUBLIC591_SUCCESSOR_PARENT.sourceTree,
  ...ASSISTANT_PUBLIC590_SUCCESSOR_BINDING,
  canonicalSha256:ASSISTANT_PUBLIC590_SUCCESSOR_OUTPUT.canonicalSha256,
});
export function requireAssistantPublic591SuccessorParent(){
  assert.equal(arguments.length,0);
  const parent=ASSISTANT_PUBLIC591_SUCCESSOR_PARENT;
  assert(parent&&Object.isFrozen(parent),'ASSISTANT_PUBLIC591_PARENT_UNSELECTED');
  assert.deepEqual(Object.keys(parent).sort(),['selected','sourceHead','sourceTree']);
  assert.equal(parent.selected,true,'ASSISTANT_PUBLIC591_PARENT_UNSELECTED');
  assertFrozen590CodeSourceSelected(); // Same single source-owned parent; no caller override.
  for(const key of ['sourceHead','sourceTree'])assert.match(parent[key],/^[a-f0-9]{40}$/);
  assert.equal(requireAssistantPublic590SuccessorRelease(),'4.0.591');
  assert.deepEqual({...requireAssistantPublic590SuccessorBinding(),canonicalSha256:requireAssistantPublic590SuccessorOutput().canonicalSha256},
    Object.fromEntries(['version','C','I','T','canonicalSha256'].map(key=>[key,ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE[key]])));
  return ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE; // DATA only; not a qualification receipt or runtime authority.
}
export const ASSISTANT_PUBLIC591_SUCCESSOR_BINDING=Object.freeze({"version":"20261030105202","C":"12f78005304316a680716a1d437e06a582815c1645a2eb567028bcc18ff99ffa","I":"69bf81c3cc5e256deee2c116a52462597f4cfc47cb6c855c6dba969c1dcf4643","T":"e894dd096d03f71cc334d97f85931c2b3969e9b140cb5403a4787cf4b81fbc2e"});
export const ASSISTANT_PUBLIC591_SUCCESSOR_OUTPUT=Object.freeze({"migrationSha256":"47c51886a58aa1cfbbc244a5469ace67521774499135666c26fccd8c7f291bfd","canonicalSha256":"5f0a0cbf5b867c60e580c95f5de332b51ac6fa9e6a4d7e78101fc99aaf15b164","checkpointContractSha256":"fa0310dd89a87c5a094304d86c1cc32ff02ec334e0377d43a0a32f160d417da0","tripBindingPolicySha256":"9fcf2a0f204688df77d23624de97e7c44955f03b5441ab002abc723d5a5180f9"});
export const ASSISTANT_PUBLIC591_SUCCESSOR_RELEASE="4.0.593";
export const ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES=Object.freeze([
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask591_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:'ravradar_ravscore_checkpoint_ask591_payload_valid',signature:'(jsonb,timestamptz)'})]);
export function requireAssistantPublic591SuccessorBinding(){
  assert.equal(arguments.length,0);
  requireAssistantPublic591SuccessorParent(); // FIRST: no parent, no successor.
  const b=ASSISTANT_PUBLIC591_SUCCESSOR_BINDING;
  assert(b&&Object.isFrozen(b),'ASSISTANT_PUBLIC591_SUCCESSOR_UNISSUED');
  assert.deepEqual(Object.keys(b).sort(),['C','I','T','version']);
  assert.match(b.version,/^[0-9]{14}$/);assert(b.version>ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE.version);
  for(const key of ['C','I','T'])assert.match(b[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[b[k],ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE[k]])).size,6);
  for(const key of ['sourceHead','sourceTree'])assert.match(ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE[key],/^[a-f0-9]{40}$/);
  return b;
}
export function requireAssistantPublic591SuccessorOutput(){
  assert.equal(arguments.length,0);requireAssistantPublic591SuccessorBinding();
  const p=ASSISTANT_PUBLIC591_SUCCESSOR_OUTPUT;
  assert(p&&Object.isFrozen(p),'ASSISTANT_PUBLIC591_SUCCESSOR_SQL_UNISSUED');
  assert.deepEqual(Object.keys(p).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const value of Object.values(p))assert.match(value,/^[a-f0-9]{64}$/);return p;
}
export function requireAssistantPublic591SuccessorRelease(){
  assert.equal(arguments.length,0);requireAssistantPublic591SuccessorOutput();
  const release=ASSISTANT_PUBLIC591_SUCCESSOR_RELEASE;
  assert.equal(typeof release,'string','ASSISTANT_PUBLIC591_SUCCESSOR_RELEASE_UNISSUED');
  assert.match(release,/^4\.0\.[1-9][0-9]*$/);
  assert(Number(release.split('.').at(-1))>591,'Fixed assistant successor release must follow genuine591');
  return release;
}
export function assistantPublic591SuccessorMigration(){
  assert.equal(arguments.length,0);
  const {version}=requireAssistantPublic591SuccessorBinding();
  const id=version+'_assistant_public591_later_h0_original_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
export async function readAssistantPublic591PredecessorCanonicalSource(){
  assert.equal(arguments.length,0);requireAssistantPublic591SuccessorParent();
  const prior=await readAssistantPublic590SuccessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE.canonicalSha256);
  assert.equal(prior.admission,'NO_ADMISSION');return prior;
}
export function assistantPublic591SuccessorCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);
  let text=assistantPublic590SuccessorCheckpointContractFromBase(source,base).definition;
  for(let i=0;i<ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES.length;i++){
    const whole=nativeOriginalContinuityDefinition(source,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES[i].name);
    text+='\n-- assistant-later-h0-original591-'+(i===0?'state':'payload')+'-validator --\n'
      +whole.slice(whole.indexOf('as $$')+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }
  return Object.freeze({id:base.id,definition:text,sha256:sha(text)});
}
const PUBLIC591_SUCCESSOR_SOURCE=Object.freeze({
  readPredecessor:readAssistantPublic591PredecessorCanonicalSource,
  aliases:ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,previousRelease:591});
export async function readAssistantPublic591SuccessorCanonicalSource(options){
  const pins=requireAssistantPublic591SuccessorOutput(),migration=assistantPublic591SuccessorMigration();
  assert(arguments.length<=1);
  return readFixedCanonicalSource(PUBLIC591_SUCCESSOR_SOURCE,options,pins,migration);
}


export function assertAssistantPublic591SuccessorTarget(descriptor,targetReferenceAt){
  assert.equal(arguments.length,2);
  assert.equal(descriptor?.modelBinding?.modelBundleSha256,ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE.I);
  assert.equal(descriptor?.contractHashes?.continuationStateContractSha256,ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE.T);
  for(const value of [descriptor.productionReferenceAt,targetReferenceAt]){
    assert.equal(typeof value,'string');assert.match(value,/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
    assert.equal(new Date(value).toISOString(),value);
  }
  assert(Date.parse(targetReferenceAt)>Date.parse(descriptor.productionReferenceAt),'ASSISTANT_PUBLIC591_SUCCESSOR_STRICTLY_LATER');
  return true; // Ren data-/tidskontrol, ingen autentificering eller kapabilitet.
}
export function assertAssistantPublic591SuccessorCaller(env){
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

export const INACTIVE_ASSISTANT_PUBLIC591_SUCCESSOR=Object.freeze({
  sourcePhase:'assistant-public591-successor',before:ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,
  binding:ASSISTANT_PUBLIC591_SUCCESSOR_BINDING,output:ASSISTANT_PUBLIC591_SUCCESSOR_OUTPUT,
  requireBinding:requireAssistantPublic591SuccessorBinding,requireOutput:requireAssistantPublic591SuccessorOutput,
  requireRelease:requireAssistantPublic591SuccessorRelease,migration:assistantPublic591SuccessorMigration,
  readCanonicalSource:readAssistantPublic591SuccessorCanonicalSource,
  assertTarget:assertAssistantPublic591SuccessorTarget,assertCaller:assertAssistantPublic591SuccessorCaller,
});


// Aktiv operativ familie vælges KUN af denne gennemgåede kilde. De gamle
// navngivne586→587-eksporter ovenfor forbliver historiske; NULL falder aldrig tilbage.

// Database593 er installeret, men den autentiske originale vejr-/statefamilie
// er fortsat591. Ingen593-original eller ny originalvalidator konstrueres.
export const INSTALLED593_ORIGINAL591_DATABASE_BEFORE=Object.freeze({
  ...ASSISTANT_PUBLIC591_SUCCESSOR_BINDING,
  canonicalSha256:ASSISTANT_PUBLIC591_SUCCESSOR_OUTPUT.canonicalSha256,
});
export const INSTALLED593_ORIGINAL591_BINDING=Object.freeze({"version":"20261031070755","C":"2d5cde5418270a02396e24a249f0b6bb09527366c1c110d8742a44cfe2ab459b","I":"08750e3667e5a221374762fccadccf08abf5e9f1ae8814ccc97bfc11880bf36c","T":"a6c0408f76b5de70a90959e254df78317f8282cb93c0edc85a71d36b9ef8dafa"});
export const INSTALLED593_ORIGINAL591_OUTPUT=Object.freeze({"migrationSha256":"0d50a857aebf838c072ee7ccfc846fecd9744f9bb093eb6943b0484eee99c777","canonicalSha256":"e4964280ee54c95633454dfaa62d1507294ea2a85fb2a26cbedf9faa6c392184","checkpointContractSha256":"0061cb6d5ef09e4b7d8136909bcbaaabe21af383323c75cd59761115372abd16","tripBindingPolicySha256":"1e437449a6ee32e8778799e0be3284c39ec5aec89154fc9e7e1ea5ad4eda77a7"});
export const INSTALLED593_ORIGINAL591_RELEASE="4.0.594";
export function requireInstalled593Original591Binding(){
  assert.equal(arguments.length,0);requireAssistantPublic591SuccessorOutput();
  const binding=INSTALLED593_ORIGINAL591_BINDING;
  assert(binding&&Object.isFrozen(binding),'INSTALLED593_ORIGINAL591_BINDING_UNISSUED');
  assert.deepEqual(Object.keys(binding).sort(),['C','I','T','version']);
  assert.match(binding.version,/^[0-9]{14}$/);assert(binding.version>INSTALLED593_ORIGINAL591_DATABASE_BEFORE.version);
  for(const key of ['C','I','T'])assert.match(binding[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(key=>[binding[key],INSTALLED593_ORIGINAL591_DATABASE_BEFORE[key]])).size,6);
  return binding;
}
export function requireInstalled593Original591Output(){
  assert.equal(arguments.length,0);requireInstalled593Original591Binding();
  const output=INSTALLED593_ORIGINAL591_OUTPUT;
  assert(output&&Object.isFrozen(output),'INSTALLED593_ORIGINAL591_OUTPUT_UNISSUED');
  assert.deepEqual(Object.keys(output).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const value of Object.values(output))assert.match(value,/^[a-f0-9]{64}$/);
  return output;
}
export function requireInstalled593Original591Release(){
  assert.equal(arguments.length,0);requireInstalled593Original591Output();
  assert.match(INSTALLED593_ORIGINAL591_RELEASE??'',/^4\.0\.[1-9][0-9]*$/);
  assert(Number(INSTALLED593_ORIGINAL591_RELEASE.split('.').at(-1))>593);
  return INSTALLED593_ORIGINAL591_RELEASE;
}
export function installed593Original591Migration(){
  assert.equal(arguments.length,0);const {version}=requireInstalled593Original591Binding();
  const id=version+'_installed593_original591_later_h0_bound_successor';
  return Object.freeze({version,id,filename:id+'.sql'});
}
const INSTALLED593_ORIGINAL591_SOURCE=Object.freeze({
  readPredecessor:readAssistantPublic591SuccessorCanonicalSource,aliases:Object.freeze([]),previousRelease:593,
});
export async function readInstalled593Original591CanonicalSource(options){
  assert(arguments.length<=1);
  return readFixedCanonicalSource(INSTALLED593_ORIGINAL591_SOURCE,options,
    requireInstalled593Original591Output(),installed593Original591Migration());
}
export const INACTIVE_INSTALLED593_ORIGINAL591_SUCCESSOR=Object.freeze({
  sourcePhase:'assistant-installed593-origin591-successor',
  before:ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,databaseBefore:INSTALLED593_ORIGINAL591_DATABASE_BEFORE,
  originalStateFamily:'591',binding:INSTALLED593_ORIGINAL591_BINDING,output:INSTALLED593_ORIGINAL591_OUTPUT,
  requireBinding:requireInstalled593Original591Binding,requireOutput:requireInstalled593Original591Output,
  requireRelease:requireInstalled593Original591Release,migration:installed593Original591Migration,
  readCanonicalSource:readInstalled593Original591CanonicalSource,
  assertTarget:assertAssistantPublic591SuccessorTarget,assertCaller:assertAssistantPublic591SuccessorCaller,
});
export const ACTIVE_ASSISTANT_SUCCESSOR=INACTIVE_INSTALLED593_ORIGINAL591_SUCCESSOR;
