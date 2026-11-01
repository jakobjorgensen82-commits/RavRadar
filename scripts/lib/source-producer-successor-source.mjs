// PRIVATE SOURCE PROPOSAL. Nothing is issued, installed or admitted here.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import derivedMetadata from './source-producer-binding.generated.json' with {type:'json'};
import {assertSourceProducerDerivedMetadata,SOURCE_PRODUCER_PREDECESSOR_VERSION} from './source-producer-derived-metadata.mjs';
import {ASSISTANT_PUBLIC588_SUCCESSOR_BINDING,ASSISTANT_PUBLIC588_SUCCESSOR_OUTPUT,
  requireAssistantPublic588SuccessorBinding,requireAssistantPublic588SuccessorOutput,
  requireAssistantPublic588SuccessorRelease,readAssistantPublic588SuccessorCanonicalSource,
  requireAssistantPublic590SuccessorParent,assistantLaterH0Definition,
  requireAssistantPublic590SuccessorBinding,requireAssistantPublic590SuccessorOutput,
  requireAssistantPublic590SuccessorRelease,requireAssistantPublic591SuccessorBinding,
  requireAssistantPublic591SuccessorOutput,requireAssistantPublic591SuccessorRelease,
  requireInstalled593Original591Binding,requireInstalled593Original591Output,requireInstalled593Original591Release} from './assistant-later-h0-successor-source.mjs';
import {assertSource591CodeSourceSelected,withSource591CodeParent,assertSource592CodeSourceSelected,
  withSource592CodeParent,assertSource593CodeSourceSelected,withSource593CodeParent,
  withAuthenticated590PredecessorSource,assertSource594CodeSourceSelected,withSource594CodeParent}
  from '../check-assistant-later-h0-predecessor-source.mjs';

export const SOURCE_PRODUCER_PROPOSED_RELEASE=null; // Ingen reserveret historisk589-release i den aktuelle post591-kilde.
export const SOURCE_PRODUCER_LEGACY593_PREDECESSOR_RELEASE='4.0.593';
export const SOURCE_PRODUCER_PREDECESSOR_RELEASE='4.0.594';
export const SOURCE_PRODUCER_LEGACY593_CODE_PARENT=Object.freeze({
  head:'0f6dcbf1700fa936eab520cba0ef2a834d53466f',tree:'0336fce50b6015e62e346ad044099e67493c1a61',
  purpose:'CODE_DATA_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION',issuedSqlFileCount:71});
export const SOURCE_PRODUCER_CODE_PARENT=Object.freeze({
  head:'37a34703d9ae8bfb2c28056f21a7ea73944033ae',tree:'09aef7f6f5d965f565fadabea203b50687acc255',
  purpose:'CODE_DATA_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION',issuedSqlFileCount:72});
export const SOURCE_PRODUCER_LEGACY592_CODE_PARENT=Object.freeze({
  head:'a45aa41d12c356849c5e7272f9baf71bf523ccd3',tree:'6f8287bb5d5f94d80d4333014baace69e6ee8ecc',
  purpose:'CODE_DATA_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION',issuedSqlFileCount:70});
export const SOURCE_PRODUCER_LEGACY591_CODE_PARENT=Object.freeze({
  head:'a157c265949da661827d375db61f9e1e8c4fd6a0',tree:'54b020c90661caa31b4e5e1eceedbe827336e4b9',
  purpose:'CODE_DATA_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION',issuedSqlFileCount:69});
// ROOT reserves/derives these only after the complete real source is frozen.
// Own hashes are generated DATA, never literals inside their own C/I input.
const metadata=assertSourceProducerDerivedMetadata(derivedMetadata);
export const SOURCE_PRODUCER_VERSION=metadata.version;
export const SOURCE_PRODUCER_BINDING=metadata.binding;
export const SOURCE_PRODUCER_OUTPUT=metadata.output;
export const SOURCE_PRODUCER_LEGACY593_BEFORE=Object.freeze({
  "version": "20261030105202",
  "C": "12f78005304316a680716a1d437e06a582815c1645a2eb567028bcc18ff99ffa",
  "I": "69bf81c3cc5e256deee2c116a52462597f4cfc47cb6c855c6dba969c1dcf4643",
  "T": "e894dd096d03f71cc334d97f85931c2b3969e9b140cb5403a4787cf4b81fbc2e",
  "migrationSha256": "47c51886a58aa1cfbbc244a5469ace67521774499135666c26fccd8c7f291bfd",
  "canonicalSha256": "5f0a0cbf5b867c60e580c95f5de332b51ac6fa9e6a4d7e78101fc99aaf15b164",
  "checkpointContractSha256": "fa0310dd89a87c5a094304d86c1cc32ff02ec334e0377d43a0a32f160d417da0",
  "tripBindingPolicySha256": "9fcf2a0f204688df77d23624de97e7c44955f03b5441ab002abc723d5a5180f9"
});
// Active594 CODE/DATA baseline; legacy identities are separate and never fallbacks.
export const SOURCE_PRODUCER_BEFORE=Object.freeze({
  "version": "20261031070755",
  "C": "2d5cde5418270a02396e24a249f0b6bb09527366c1c110d8742a44cfe2ab459b",
  "I": "08750e3667e5a221374762fccadccf08abf5e9f1ae8814ccc97bfc11880bf36c",
  "T": "a6c0408f76b5de70a90959e254df78317f8282cb93c0edc85a71d36b9ef8dafa",
  "migrationSha256": "0d50a857aebf838c072ee7ccfc846fecd9744f9bb093eb6943b0484eee99c777",
  "canonicalSha256": "e4964280ee54c95633454dfaa62d1507294ea2a85fb2a26cbedf9faa6c392184",
  "checkpointContractSha256": "0061cb6d5ef09e4b7d8136909bcbaaabe21af383323c75cd59761115372abd16",
  "tripBindingPolicySha256": "1e437449a6ee32e8778799e0be3284c39ec5aec89154fc9e7e1ea5ad4eda77a7"
});
// Whole issued-but-uninstalled592 canonical identity remains a separate CODE domain.
export const SOURCE_PRODUCER_LEGACY592_BEFORE=Object.freeze({
  "version": "20261029183010",
  "C": "40a7c6ce6b97d15a2fdc56cd1e587388554580c99244767fde2c4bf145828433",
  "I": "7e8ac21ad18682ebc490b067f8b0b8cefb935be7b90822be7e7983150053fc3f",
  "T": "24aa50184651b20f1846304db029ded943cb56b34fdf0b4820abc92415156308",
  "migrationSha256": "e5c7fb182d9491bd9222cb59dbefd3da4592867522dde805ea17e67c0d023e97",
  "canonicalSha256": "363514adee304c3c6f49731e01ee8e5596ac77a66557c1ffbbf44bee33fcd4da",
  "checkpointContractSha256": "b04f548fcf629ef4202a5bb0a7401a8e5eb1d310e275731fc95a3a025ef06ffa",
  "tripBindingPolicySha256": "f0a2df2ecada096c09917743033669b18e80fec7768a9dec51d2442376d9feab"
});
// Whole genuine591 identity remains a separate original domain.
export const SOURCE_PRODUCER_LEGACY591_BEFORE=Object.freeze({
  "version": "20261028223717",
  "C": "38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64",
  "I": "ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54",
  "T": "b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d",
  "canonicalSha256": "3c289bcd54c9286c1dbbcce82f401305df021a48a1408b146f7bc96f09f754b9",
  "migrationSha256": "72b53fb08ea0e5cebcda7e1cbf3bc49a8a3f2417975daeb6daf530c9029c6835",
  "checkpointContractSha256": "e674f6b149042c24f1ffa7cb82cd0623f004d827f89b5a0c3a3b700b7386b7fb",
  "tripBindingPolicySha256": "9319d189f1b09f32ffd357589d0a2c44f46438b7550c6bca96b20430f8db83e1"
});
// Historical genuine590 data stays in its own immutable domain; never a591 fallback.
export const SOURCE_PRODUCER_LEGACY590_BEFORE=Object.freeze({version:'20261027124633',
  C:'bca59cb435cb3f35041c665d2954f0ef04b189b572219771fc5628e4f7ccb551',
  I:'4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819',
  T:'d444e6141038f56dd04b97a55eefe07bbd98f122fb3b76a43bdddacff2d88c8a',
  canonicalSha256:'4c853a74379abb6983d6d06c353f0b51cf9b004859aa571fc4d5b668274d36df',
  migrationSha256:'eb0262716b66d29d52bf0ac4412c475ab5e9ea69e1cad15eabc9a31b48bcf821',
  checkpointContractSha256:'27f2c947268693a0d545ba8f1066c16cae789efe440f12b4295dca46c62ec8c9',
  tripBindingPolicySha256:'822f0052836a5b6acf40aa905374a29cb512d10c04ee0d4b6fccdc06f752f14d'});
// Egen normal samme-PG-bank. Historiske588-banknavne og manifestpins ændres ikke.
export const SOURCE_PRODUCER_NATIVE_BANK=Object.freeze({schemaVersion:1,
  predecessorVersion:SOURCE_PRODUCER_LEGACY590_BEFORE.version,
  predecessorPrefix:'assistant-public588-successor-current-',currentPrefix:'source-producer590-current-'});
const CP='ravradar_ravscore_checkpoint_';
export const SOURCE_PRODUCER_PROJECTION=CP+'source_same_h0_projection';
export const SOURCE_PRODUCER_ALIASES=Object.freeze([
  Object.freeze({name:CP+'source590_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'source590_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:SOURCE_PRODUCER_PROJECTION,signature:'(jsonb,timestamptz)'}),
]);
export const SOURCE_PRODUCER_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
export const SOURCE_PRODUCER_CONTRACT_LABELS=Object.freeze([
  'source-original590-state-validator','source-original590-payload-validator','source-same-h0-projection']);
export const sourceProducerDefinition=assistantLaterH0Definition;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};

// DATA only: the locally checked fixed CODE profile is not a CURRENT/STAGED
// original capability, public delivery witness or SOURCE runtime binding.
export function requireSourceProducerLegacy593CodeParent(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE parent');
  const code=assertSource593CodeSourceSelected();
  assert.equal(code.head,SOURCE_PRODUCER_LEGACY593_CODE_PARENT.head);assert.equal(code.tree,SOURCE_PRODUCER_LEGACY593_CODE_PARENT.tree);
  assert.equal(code.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');
  const binding=requireAssistantPublic591SuccessorBinding(),pins=requireAssistantPublic591SuccessorOutput();
  assert.equal(requireAssistantPublic591SuccessorRelease(),SOURCE_PRODUCER_LEGACY593_PREDECESSOR_RELEASE);
  assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
    canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
    checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},SOURCE_PRODUCER_LEGACY593_BEFORE);
  return SOURCE_PRODUCER_LEGACY593_BEFORE; // Intended CODE/DATA only; never runtime admission.
}

export function requireSourceProducerCodeParent(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE parent');
  const code=assertSource594CodeSourceSelected();
  assert.equal(code.head,SOURCE_PRODUCER_CODE_PARENT.head);assert.equal(code.tree,SOURCE_PRODUCER_CODE_PARENT.tree);
  assert.equal(code.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');
  const binding=requireInstalled593Original591Binding(),pins=requireInstalled593Original591Output();
  assert.equal(requireInstalled593Original591Release(),SOURCE_PRODUCER_PREDECESSOR_RELEASE);
  assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
    canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
    checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},SOURCE_PRODUCER_BEFORE);
  return SOURCE_PRODUCER_BEFORE; // Intended CODE/DATA only; never runtime admission.
}

export function requireSourceProducerLegacy592CodeParent(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE parent');
  const code=assertSource592CodeSourceSelected();
  assert.equal(code.head,SOURCE_PRODUCER_LEGACY592_CODE_PARENT.head);
  assert.equal(code.tree,SOURCE_PRODUCER_LEGACY592_CODE_PARENT.tree);
  assert.equal(code.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');
  // Actual binding/output is checked inside the immutable592 CODE callback.
  return SOURCE_PRODUCER_LEGACY592_BEFORE;
}

export function requireSourceProducerLegacy591CodeParent(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE parent');
  const code=assertSource591CodeSourceSelected();
  assert.equal(code.head,SOURCE_PRODUCER_LEGACY591_CODE_PARENT.head);assert.equal(code.tree,SOURCE_PRODUCER_LEGACY591_CODE_PARENT.tree);
  assert.equal(code.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');
  const binding=requireAssistantPublic590SuccessorBinding(),pins=requireAssistantPublic590SuccessorOutput();
  assert.equal(requireAssistantPublic590SuccessorRelease(),'4.0.591');
  assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
    canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
    checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},SOURCE_PRODUCER_LEGACY591_BEFORE);
  return SOURCE_PRODUCER_LEGACY591_BEFORE; // Intended CODE/DATA only; never runtime admission.
}

export function requireSourceProducerBinding(){
  assert.equal(arguments.length,0,'No caller tuple/source/phase/version');
  const value=SOURCE_PRODUCER_BINDING;
  assert(value&&Object.isFrozen(value),'SOURCE_PRODUCER_UNISSUED');
  const parent=requireSourceProducerCodeParent(); // One fixed intended594 CODE/DATA parent; no original admission.
  for(const key of ['version','C','I','T','canonicalSha256'])assert.equal(parent[key],SOURCE_PRODUCER_BEFORE[key]);
  assert.deepEqual(Object.keys(value).sort(),['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.match(SOURCE_PRODUCER_VERSION,/^[0-9]{14}$/);
  assert.equal(value.version,SOURCE_PRODUCER_VERSION);assert(value.version>SOURCE_PRODUCER_BEFORE.version);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(value.C,value.candidateManifestSha256);assert.equal(value.I,value.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[value[k],SOURCE_PRODUCER_BEFORE[k]])).size,6);
  return value;
}
export function requireSourceProducerOutput(){
  assert.equal(arguments.length,0);requireSourceProducerBinding();const value=SOURCE_PRODUCER_OUTPUT;
  assert(value&&Object.isFrozen(value),'SOURCE_PRODUCER_SQL_UNISSUED');
  assert.deepEqual(Object.keys(value).sort(),['canonicalSha256','checkpointContractSha256','migrationSha256','tripBindingPolicySha256']);
  for(const pin of Object.values(value))assert.match(pin,/^[a-f0-9]{64}$/);return value;
}
export function sourceProducerMigration(){
  assert.equal(arguments.length,0);const {version}=requireSourceProducerBinding();
  const id=version+'_source_producer_original_bound_successor';return Object.freeze({version,id,filename:id+'.sql'});
}
export async function readSourceProducerLegacy593CanonicalSource(){
  assert.equal(arguments.length,0);requireSourceProducerLegacy593CodeParent();
  return withSource593CodeParent(async root=>{
    const api=await import(pathToFileURL(path.join(root,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
    assert.equal(api.requireAssistantPublic591SuccessorRelease(),SOURCE_PRODUCER_LEGACY593_PREDECESSOR_RELEASE);
    const binding=api.requireAssistantPublic591SuccessorBinding(),pins=api.requireAssistantPublic591SuccessorOutput();
    assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
      canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
      checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},SOURCE_PRODUCER_LEGACY593_BEFORE);
    const source=await api.readAssistantPublic591SuccessorCanonicalSource();
    assert.equal(sha(source.canonicalSource),SOURCE_PRODUCER_LEGACY593_BEFORE.canonicalSha256);
    sourceProducerLegacy593ContractInventory(source.canonicalSource);
    assert.equal(source.admission,'NO_ADMISSION');return source;
  });
}

export async function readSourceProducerPredecessorCanonicalSource(){
  assert.equal(arguments.length,0);requireSourceProducerCodeParent();
  return withSource594CodeParent(async root=>{
    const api=await import(pathToFileURL(path.join(root,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
    assert.equal(api.requireInstalled593Original591Release(),SOURCE_PRODUCER_PREDECESSOR_RELEASE);
    const binding=api.requireInstalled593Original591Binding(),pins=api.requireInstalled593Original591Output();
    assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
      canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
      checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},SOURCE_PRODUCER_BEFORE);
    const source=await api.readInstalled593Original591CanonicalSource();
    assert.equal(sha(source.canonicalSource),SOURCE_PRODUCER_BEFORE.canonicalSha256);
    sourceProducerPredecessorContractInventory(source.canonicalSource);
    assert.equal(source.admission,'NO_ADMISSION');return source;
  });
}

export async function readSourceProducerLegacy592CanonicalSource(){
  assert.equal(arguments.length,0);requireSourceProducerLegacy592CodeParent();
  return withSource592CodeParent(async root=>{
    const api=await import(pathToFileURL(path.join(root,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
    assert.equal(api.requireAssistantPublic591SuccessorRelease(),'4.0.592');
    const binding=api.requireAssistantPublic591SuccessorBinding(),pins=api.requireAssistantPublic591SuccessorOutput();
    assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
      canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
      checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},SOURCE_PRODUCER_LEGACY592_BEFORE);
    const source=await api.readAssistantPublic591SuccessorCanonicalSource();
    assert.equal(sha(source.canonicalSource),SOURCE_PRODUCER_LEGACY592_BEFORE.canonicalSha256);
    sourceProducerLegacy592ContractInventory(source.canonicalSource);
    assert.equal(source.admission,'NO_ADMISSION');return source;
  });
}

export async function readSourceProducerLegacy591CanonicalSource(){
  assert.equal(arguments.length,0);requireSourceProducerLegacy591CodeParent();
  return withSource591CodeParent(async root=>{
    const api=await import(pathToFileURL(path.join(root,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
    assert.equal(api.requireAssistantPublic590SuccessorRelease(),'4.0.591');
    const binding=api.requireAssistantPublic590SuccessorBinding(),pins=api.requireAssistantPublic590SuccessorOutput();
    assert.deepEqual({version:binding.version,C:binding.C,I:binding.I,T:binding.T,
      canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
      checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},SOURCE_PRODUCER_LEGACY591_BEFORE);
    const source=await api.readAssistantPublic590SuccessorCanonicalSource();
    assert.equal(sha(source.canonicalSource),SOURCE_PRODUCER_LEGACY591_BEFORE.canonicalSha256);
    sourceProducerLegacy591ContractInventory(source.canonicalSource);
    assert.equal(source.admission,'NO_ADMISSION');return source;
  });
}

// Explicit historical590 canonical data, not the intended591 SOURCE parent.
export async function readSourceProducerLegacy590CanonicalSource(){
  assert.equal(arguments.length,0);
  const old=requireAssistantPublic590SuccessorParent();
  for(const key of ['version','C','I','T','canonicalSha256'])assert.equal(old[key],SOURCE_PRODUCER_LEGACY590_BEFORE[key]);
  return withAuthenticated590PredecessorSource(async root=>{
    const api=await import(pathToFileURL(path.join(root,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
    assert.equal(api.requireAssistantPublic588SuccessorRelease(),'4.0.590');
    const source=await api.readAssistantPublic588SuccessorCanonicalSource();
    assert.equal(sha(source.canonicalSource),SOURCE_PRODUCER_LEGACY590_BEFORE.canonicalSha256);
    sourceProducerLegacy590ContractInventory(source.canonicalSource);
    assert.equal(source.admission,'NO_ADMISSION');return source;
  });
}

// The intended591 parent and historical590 contract inventories are disjoint.
// Whole canonical/validator hashes are code data, never new CI/original authority.
export function sourceProducerLegacy593ContractInventory(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),SOURCE_PRODUCER_LEGACY593_BEFORE.canonicalSha256);
  const contract=sourceProducerDefinition(source,CP+'contract');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);
  const checkpoint=/  v_checkpoint_definition := v_canonical_time_definition[\s\S]*?;/.exec(contract);
  assert(oid&&checkpoint);
  assert.equal(sha(oid[1]),'1be7f2229fb954d934431b211bb10be656f493327ebacb9051d9f799383def83','Whole intended593 ordered validator inventory');
  assert.equal(sha(checkpoint[0]),'5a278c6bd5957ece0ecadae20ad8d9e1073988392e0abfe8b382dcd966f2b214','Whole intended593 44-body checkpoint definition');
  const validators=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(row=>row[1]);
  assert.equal(validators.length,41);assert.equal(new Set(validators).size,41);
  assert.deepEqual(validators.slice(-2),['public.'+CP+'ask591_state_valid(jsonb,text)',
    'public.'+CP+'ask591_payload_valid(jsonb,timestamptz)']);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,44);
  return Object.freeze({contract,oid:oid[0],validators:Object.freeze(validators),checkpoint:checkpoint[0],
    validatorCount:41,definitionCount:44});
}
export function sourceProducerPredecessorContractInventory(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),SOURCE_PRODUCER_BEFORE.canonicalSha256);
  const contract=sourceProducerDefinition(source,CP+'contract');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);
  const checkpoint=/  v_checkpoint_definition := v_canonical_time_definition[\s\S]*?;/.exec(contract);
  assert(oid&&checkpoint);
  assert.equal(sha(oid[1]),'1be7f2229fb954d934431b211bb10be656f493327ebacb9051d9f799383def83','Whole intended594 ordered validator inventory');
  assert.equal(sha(checkpoint[0]),'5a278c6bd5957ece0ecadae20ad8d9e1073988392e0abfe8b382dcd966f2b214','Whole intended594 44-body checkpoint definition');
  const validators=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(row=>row[1]);
  assert.equal(validators.length,41);assert.equal(new Set(validators).size,41);
  assert.deepEqual(validators.slice(-2),['public.'+CP+'ask591_state_valid(jsonb,text)',
    'public.'+CP+'ask591_payload_valid(jsonb,timestamptz)']);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,44);
  return Object.freeze({contract,oid:oid[0],validators:Object.freeze(validators),checkpoint:checkpoint[0],
    validatorCount:41,definitionCount:44});
}
export function sourceProducerLegacy592ContractInventory(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),SOURCE_PRODUCER_LEGACY592_BEFORE.canonicalSha256);
  const contract=sourceProducerDefinition(source,CP+'contract');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);
  const checkpoint=/  v_checkpoint_definition := v_canonical_time_definition[\s\S]*?;/.exec(contract);
  assert(oid&&checkpoint);
  assert.equal(sha(oid[1]),'1be7f2229fb954d934431b211bb10be656f493327ebacb9051d9f799383def83','Whole intended592 ordered validator inventory');
  assert.equal(sha(checkpoint[0]),'5a278c6bd5957ece0ecadae20ad8d9e1073988392e0abfe8b382dcd966f2b214','Whole intended592 44-body checkpoint definition');
  const validators=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(row=>row[1]);
  assert.equal(validators.length,41);assert.equal(new Set(validators).size,41);
  assert.deepEqual(validators.slice(-2),['public.'+CP+'ask591_state_valid(jsonb,text)',
    'public.'+CP+'ask591_payload_valid(jsonb,timestamptz)']);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,44);
  return Object.freeze({contract,oid:oid[0],validators:Object.freeze(validators),checkpoint:checkpoint[0],
    validatorCount:41,definitionCount:44});
}
export function sourceProducerLegacy591ContractInventory(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),SOURCE_PRODUCER_LEGACY591_BEFORE.canonicalSha256);
  const contract=sourceProducerDefinition(source,CP+'contract');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);
  const checkpoint=/  v_checkpoint_definition := v_canonical_time_definition[\s\S]*?;/.exec(contract);
  assert(oid&&checkpoint);
  assert.equal(sha(oid[1]),'9225976b0e8e9744b154069ad3a3b82383108a3c15bbfc3ea07b62843565fa1c','Whole intended591 ordered validator inventory');
  assert.equal(sha(checkpoint[0]),'8dd9bdb1fcb2e647939c6886eeb3d5754e03d4aaf175bbe6b8c64b35f904ec86','Whole intended591 42-body checkpoint definition');
  const validators=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(row=>row[1]);
  assert.equal(validators.length,39);assert.equal(new Set(validators).size,39);
  assert.deepEqual(validators.slice(-2),['public.'+CP+'ask590_state_valid(jsonb,text)',
    'public.'+CP+'ask590_payload_valid(jsonb,timestamptz)']);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,42);
  return Object.freeze({contract,oid:oid[0],validators:Object.freeze(validators),checkpoint:checkpoint[0],
    validatorCount:39,definitionCount:42});
}
export function sourceProducerLegacy590ContractInventory(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),SOURCE_PRODUCER_LEGACY590_BEFORE.canonicalSha256);
  const contract=sourceProducerDefinition(source,CP+'contract');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);
  const checkpoint=/  v_checkpoint_definition := v_canonical_time_definition[\s\S]*?;/.exec(contract);
  assert(oid&&checkpoint);
  assert.equal(sha(oid[1]),'8825c919eb781889f9cfc05b57812a9ca4fd7da8c784488fd3328b0af0dff75c','Whole genuine590 ordered validator inventory');
  assert.equal(sha(checkpoint[0]),'21eeba155734e878c6316390654730eb079dbe7b651b8aba802119e8c211e654','Whole genuine590 40-body checkpoint definition');
  const validators=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(row=>row[1]);
  assert.equal(validators.length,37);assert.equal(new Set(validators).size,37);
  assert.deepEqual(validators.slice(-2),['public.'+CP+'ask588_state_valid(jsonb,text)',
    'public.'+CP+'ask588_payload_valid(jsonb,timestamptz)']);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,40);
  return Object.freeze({contract,oid:oid[0],validators:Object.freeze(validators),checkpoint:checkpoint[0],
    validatorCount:37,definitionCount:40});
}

export function sourceProducerCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert(base&&sha(base.definition)===base.sha256);let value=base.definition;
  for(let index=0;index<SOURCE_PRODUCER_ALIASES.length;index++){
    const whole=sourceProducerDefinition(source,SOURCE_PRODUCER_ALIASES[index].name),at=whole.indexOf('as $$');assert(at>0);
    value+='\n-- '+SOURCE_PRODUCER_CONTRACT_LABELS[index]+' --\n'+whole.slice(at+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }return Object.freeze({id:base.id,definition:value,sha256:sha(value)});
}
export async function readSourceProducerCanonicalSource(options){
  const pins=requireSourceProducerOutput(); // UNISSUED before any I/O.
  assert(arguments.length<=1);let directory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));directory=path.resolve(options.migrationsDirectory);}
  const prior=await readSourceProducerPredecessorCanonicalSource(),migration=sourceProducerMigration();
  const file=path.join(directory,migration.filename),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  const raw=await fs.readFile(file);assert.equal(sha(raw),pins.migrationSha256);const sql=raw.toString('utf8'),definition=sourceProducerDefinition;
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...SOURCE_PRODUCER_ALIASES.map(row=>row.name),...SOURCE_PRODUCER_REPLACEMENTS]);
  let canonicalSource=prior.canonicalSource;
  for(const name of SOURCE_PRODUCER_REPLACEMENTS)canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=SOURCE_PRODUCER_ALIASES.map(row=>definition(sql,row.name)+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...SOURCE_PRODUCER_REPLACEMENTS].reverse())inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole intended594 canonical inverse');
  const changed=new Set(SOURCE_PRODUCER_REPLACEMENTS);
  for(const match of prior.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)){
    if(!changed.has(match[1]))assert.equal(definition(canonicalSource,match[1]),definition(prior.canonicalSource,match[1]));
  }
  for(const row of prior.originalDefinitions)assert.equal(definition(canonicalSource,row.name),row.definition);
  assert.deepEqual(await fs.readFile(file),raw);return Object.freeze({...prior,canonicalSource,migration,admission:'NO_ADMISSION'});
}
