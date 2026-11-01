// Faste, ægte udstedte586/587 DATA-kilder. Ingen caller-valgt root/head/pin.
// DATA ASSERTIONS ONLY: this source host never issues an authenticated origin handle.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(callbackExec);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixedSource(profile){
  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE591_CODE_PROFILE||profile===SOURCE591_ORIGINAL_DATA_PROFILE||profile===SOURCE592_CODE_PROFILE||profile===SOURCE593_CODE_PROFILE||profile===SOURCE593_ORIGINAL_DATA_PROFILE||profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE||profile===SOURCE_FROZEN588,'FROZEN_SOURCE_UNKNOWN_PROFILE');
  const HEAD=profile.head,TREE=profile.tree;
const C='scripts/rollback-assets/ravscore-model-bundle.generated.js';
const I='js/core/ravscore-model-bundle.generated.js';
const T='scripts/lib/ravscore-continuation-implementation-contract.mjs';
const BUILDER=profile.builder;
const SCANNER='scripts/lib/static-module-closure.mjs';
const MODEL_SCANNER='scripts/lib/model-source-imports.mjs';
const ORIGIN='scripts/lib/established-native-current-origin.mjs';
const ASSERTION=profile.assertion;
const GIT_REFERENCE='.git';
const CP='scripts/ravscore-continuation-checkpoint.mjs';
const RUNTIME_CONTRACTS=profile.runtimeContracts;
// Same reviewed fixed-module inventory mechanism as the historical helper.
// Applies ONLY to this whole immutable Git blob; no scanner failure fallback.
const REVIEWED=Object.freeze({
  'scripts/check-current-memory-warmup-predecessor-source.mjs':Object.freeze({
    sha256:'a201e4afb0da382623004d7717ca867d9a9b881ff107e7a30dd052a5b2a68989',
    // Node builtins only; its two computed imports are the fixed Git scanner
    // and fixed T already independently present in this exact producer host.
    imports:Object.freeze([]),
  }),
  // This exact d7b PG blob contains a deliberately generated data-URL factory.
  // Its whole blob and every relative static/factory import are bound here;
  // this is never a scanner-error fallback or a caller module override.
  'scripts/lib/current-memory-warmup-postgres.mjs':Object.freeze({
    sha256:'2e1498b7603a6625d415a1aed8c042c73d747ddd408f4222bdb0e3aa6046e091',
    imports:Object.freeze(['../check-current-memory-warmup-predecessor-source.mjs','./current-memory-warmup-successor-source.mjs',
      '../integrated-cutover-readiness.mjs','../verify-account-assistant-schema.mjs','../protected-ravscore-continuation-checkpoint.mjs',
      '../ravscore-continuation-checkpoint.mjs','../../js/core/ravscore-integrated-state-pipeline.js',
      '../../js/core/ravscore-candidate-g-state-pipeline.js','../../js/core/ravscore-model-contract.js',
      '../rollback-assets/ravscore-model-contract.js','./coastal-point-staging-contract.mjs',
      './ravscore-candidate-g-rollback-runtime.mjs','./ravscore-continuation-implementation-contract.mjs']),
  }),
  'scripts/protected-private-production-runtime.mjs':Object.freeze({
    sha256:'e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762',
    imports:Object.freeze(['./private-production-runtime-bundle.mjs','./lib/supabase-admin-rest.mjs','../js/core/ravscore-model-contract.js',
      './lib/r2-private-runtime-storage.mjs','./lib/private-weather-component-inventory.mjs','./lib/bounded-conditions-predecessor-transition.mjs']),
  }),
  'scripts/lib/historical-wave-input-transition.mjs':Object.freeze({
    sha256:'fcc199d299c5173dae8fcb7ea8726e6717c2f3aeaaf038f5588a010fcc0460ef',
    imports:Object.freeze(['../../js/core/ravscore-model-contract.js','../private-production-runtime-bundle.mjs','./ravscore-recovery-replay.mjs']),
  }),
  'scripts/build-public-coastal-parts-v2.mjs':Object.freeze({
    sha256:'ad4dcfb1158639be600b1740453841f130539cf34f3f8e73158e3ad53fb99105',imports:Object.freeze([]),
  }),
  'scripts/private-production-runtime-bundle.mjs':Object.freeze({
    sha256:'2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529',
    imports:Object.freeze(['../js/core/ravscore-model-contract.js','./lib/bounded-conditions-predecessor-transition.mjs','./lib/private-weather-component-inventory.mjs']),
  }),
});
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const bytesCache=new Map();
const env=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
const fixedEnv=()=>({...env(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{encoding,env:fixedEnv(),timeout:30000,maxBuffer:16*1024*1024})).stdout;
function relative(value){
  assert.equal(typeof value,'string');assert.match(value,/^[A-Za-z0-9_./-]+$/);
  assert.equal(path.posix.normalize(value),value);assert(value!=='.'&&value!=='..'&&!value.startsWith('../')&&!path.posix.isAbsolute(value));return value;
}
const inside=(root,file)=>{const r=path.relative(root,file);return r&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
function identity(s){assert(s.isDirectory()&&!s.isSymbolicLink()&&s.ino>0n);return [s.dev,s.ino,s.birthtimeNs];}
async function noLinks(file){let at=path.parse(file).root;for(const p of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,p);assert(!(await fs.lstat(at)).isSymbolicLink(),'Frozen source must not traverse links');}}
async function inventory(){
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  return new Map(String(await git(['ls-tree','-r','-z','--full-tree',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(row=>{
    const m=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(row);return m?[[relative(m[3]),m[2]]]:[];
  }));
}
async function bytes(file,index){relative(file);assert(index.has(file),'Fixed regular Git source leaf required: '+file);
  if(!bytesCache.has(file))bytesCache.set(file,Buffer.from(await git(['cat-file','blob',HEAD+':'+file])));return bytesCache.get(file);}
async function selected(index){
  const scannerBytes=await bytes(SCANNER,index),scannerUrl='data:text/javascript;base64,'+scannerBytes.toString('base64');
  const modelBytes=(await bytes(MODEL_SCANNER,index)).toString('utf8');
  const originalImport="import { exactRelativeModuleSpecifiers } from './static-module-closure.mjs';";
  assert.equal(modelBytes.split(originalImport).length,2,'One fixed normal scanner import');
  const replacementImport='import { exactRelativeModuleSpecifiers } from '+JSON.stringify(scannerUrl)+';';
  const executableModel=modelBytes.replace(originalImport,replacementImport);
  assert.equal(executableModel.replace(replacementImport,originalImport),modelBytes,'Whole frozen model scanner inverse');
  const scanner=await import('data:text/javascript;base64,'+Buffer.from(executableModel).toString('base64'));
  const pending=[BUILDER,SCANNER,MODEL_SCANNER,ORIGIN,C,I,T,CP,'package.json',
    'scripts/private-production-runtime-workflow.mjs',
    'scripts/protected-ravscore-continuation-checkpoint.mjs','scripts/private-production-runtime-bundle.mjs',
    'scripts/fixtures/statistics-preference-revision-input.json','scripts/fixtures/account-assistant-successor-inputs.json',
    'scripts/lib/private-weather-storage-abi.json','scripts/copy-public-delivery-shards.mjs',
    'scripts/lib/dmi-marine-zone-exclusions.json','scripts/lib/copernicus-component-spatial-policy.json'];
  for(const [file,binding,count] of [[C,profile.candidate,profile.candidateFiles],
    [I,profile.integrated,profile.integratedFiles]]){
    const generated=await import('data:text/javascript;base64,'+(await bytes(file,index)).toString('base64'));
    assert.equal(generated.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,binding);
    const rows=generated.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files;assert.equal(rows.length,count);
    const field=file===C?'file':'path';
    const paths=rows.map(row=>relative(row[field]));assert.equal(new Set(paths).size,count);
    pending.push(...paths);
  }
  const t=(await bytes(T,index)).toString('utf8');
  const list=/export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(t);assert(list);
  const tFiles=[...list[1].matchAll(/  '([^']+)',\n/g)].map(m=>relative(m[1]));assert.equal(tFiles.length,12);pending.push(...tFiles);
  // The eleven fixed canonical-chain migrations, not a copy of all source/history.
  for(const name of ['20261010130000_owner_export_origin_bound_successor.sql','20261012200000_checkpoint_cas_single_projection_successor.sql',
    '20261013210000_account_assistant_original_bound_successor.sql','20261013220000_current_grid_original_bound_successor.sql',
    '20261013230000_account_statistics_revision.sql','20261016060000_native_sampling_identity_original_bound_successor.sql',
    '20261017020000_current_memory_warmup_original_bound_successor.sql',
    '20261017140000_established_native_current_origin_bound_successor.sql',
    '20261019060000_last_mile_enclosure_original_bound_successor.sql',
    '20261019100000_account_statistics_assistant_original_bound_successor.sql',
    '20261021150500_native_original_continuity_original_bound_successor.sql'])pending.push('supabase/migrations/'+name);
  for(const row of profile.additionalMigrations){
    pending.push(row.path);assert.equal(sha(await bytes(row.path,index)),row.sha256,'Whole fixed predecessor migration');
  }
  const found=new Set();
  while(pending.length){const file=pending.pop();if(found.has(file))continue;found.add(file);
    if(!/\.(js|mjs|ts)$/.test(file))continue;
    const reviewed=REVIEWED[file],source=await bytes(file,index);
    if(reviewed)assert.equal(sha(source),reviewed.sha256,'Whole reviewed frozen import inventory');
    for(const specifier of reviewed?reviewed.imports:scanner.modelSourceRelativeModuleSpecifiers(source.toString('utf8'),file)){
      const base=relative(path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0])));
      const choices=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
      const target=choices.find(p=>index.has(p));assert(target,'Exact source import must resolve: '+file+' '+specifier);pending.push(target);
    }
  }
  assert.equal(sha(await bytes('supabase/migrations/20261016060000_native_sampling_identity_original_bound_successor.sql',index)),
    '10e26f9d095b6c06eee479eb11d821114b04e4db0dbdb7c6717c13200793f019');
  assert.equal(sha(await bytes('supabase/migrations/20261013230000_account_statistics_revision.sql',index)),
    'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae');
  assert.equal(sha(await bytes('supabase/migrations/20261017020000_current_memory_warmup_original_bound_successor.sql',index)),
    'c8fff609ea03bbc2e5c84bea57b1d7702b15e51cd27f1854692506b18369ef47');
  assert.equal(sha(await bytes('supabase/migrations/20261017140000_established_native_current_origin_bound_successor.sql',index)),
    'f1d12590cfc93047afa94cdf152fab6e77f2851807695f0771127a2fdf6122b5');
  assert.equal(sha(await bytes('supabase/migrations/20261019060000_last_mile_enclosure_original_bound_successor.sql',index)),
    '7d21e67a9d9b9ef5e1322a7e746120b289185ac09f24701044cbc7254617fd67');
  assert.equal(sha(await bytes(ORIGIN,index)),profile.originSha256);
  assert.equal(sha(await bytes('supabase/migrations/20261019100000_account_statistics_assistant_original_bound_successor.sql',index)),
    '9cb02d5fccdb5c9458a1f924c8f8c57510044492d2f326ab28c45ff735039d59');
  assert.equal(sha(await bytes('supabase/migrations/20261021150500_native_original_continuity_original_bound_successor.sql',index)),
    'b4594e2187c5326ef798551fdb12b596ce8b2bd0ae961b7529acf5b668ea5ccd');
  return [...found].sort();
}
const ORIGINAL_586_ASSERTION_SUFFIX=String.raw`
// ASSERTIONS ONLY over the WHOLE fixed e8f9 origin implementation.
// Remove this exact suffix to restore its original e6aac50d... Git bytes.
// No WeakMap snapshot/origin/ForPart/owner capability is created here.
async function frozen586OriginData(descriptor,conditions,centralContract) {
  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');
  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'FROZEN_586_DESCRIPTOR');
  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();
  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'FROZEN_586_FAMILY');
  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);
  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,
    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,
    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});
  // Exact normal586 dispatch, including its WHOLE metadata586->584 parent.
  // That validator itself invokes the genuine fixed584 DATA-source assertion.
  if(conditions[ATTEST]?.kind===METADATA585_KIND
    &&conditions[ATTEST]?.predecessor?.sourceFamilyHead===METADATA585_SOURCE)
    await validateMetadata585Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else if(conditions[ATTEST]?.kind===METADATA584_KIND)
    await validateMetadata584Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');
  return {pairs,binding,candidate,contracts}; // Internal values only, never exported authority.
}
export async function assertFrozen586OriginSnapshotData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');
  const {descriptor,conditions,centralContract,checkpoint}=options;
  const {pairs,binding,candidate,contracts}=await frozen586OriginData(descriptor,conditions,centralContract);
  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)
    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256
    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt
    &&SHA.test(checkpoint.generationSha256),'FROZEN_586_CHECKPOINT');
  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())
    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');
  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])
    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');
  // Undefined: normal protected-S/GCM/original-auth are the caller's obligations.
}
export async function assertFrozen586MetadataOriginData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract']),'ARGUMENTS');
  await frozen586OriginData(options.descriptor,options.conditions,options.centralContract);
  // Undefined: no authenticated snapshot, metadata issuer or installation proof.
}
`;
// Kun navne/faste fejlkoder ændres; metadata585→584-dispatchen bevares hel.
const assertionNames=Object.freeze([
  Object.freeze(['// ASSERTIONS ONLY over the WHOLE fixed e8f9 origin implementation.',
    '// ASSERTIONS ONLY over the WHOLE fixed aab72 origin implementation.']),
  Object.freeze(['// Remove this exact suffix to restore its original e6aac50d... Git bytes.',
    '// Remove this exact suffix to restore its original 5ebeea93... Git bytes.']),
  Object.freeze(['// Exact normal586 dispatch, including its WHOLE metadata586->584 parent.',
    '// Exact normal587 dispatch, including its WHOLE metadata585->584 parent.']),
  Object.freeze(['frozen586OriginData','frozen587OriginData']),
  Object.freeze(['assertFrozen586OriginSnapshotData','assertFrozen587OriginSnapshotData']),
  Object.freeze(['assertFrozen586MetadataOriginData','assertFrozen587MetadataOriginData']),
  Object.freeze(['FROZEN_586_','FROZEN_587_']),
]);
const ORIGINAL_588_ASSERTION_SUFFIX=String.raw`
// ASSERTIONS ONLY over the WHOLE selected genuine588 origin implementation.
// Removing this suffix restores whole Git SHA-256 5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69.
// This is DATA validation, never a WeakMap origin/ForPart/finalizer capability.
async function frozen588OriginData(descriptor,conditions,centralContract) {
  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');
  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'FROZEN_588_DESCRIPTOR');
  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();
  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'FROZEN_588_FAMILY');
  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);
  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,
    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,
    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});
  // Exactly actual588's normal DATA dispatch, including its complete585/584 parents.
  if(conditions[ATTEST]?.kind===METADATA585_KIND
    &&conditions[ATTEST]?.predecessor?.sourceFamilyHead===METADATA585_SOURCE)
    await validateMetadata585Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else if(conditions[ATTEST]?.kind===METADATA584_KIND)
    await validateMetadata584Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');
  return {pairs,binding,candidate,contracts};
}
export async function assertFrozen588OriginSnapshotData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');
  const {descriptor,conditions,centralContract,checkpoint}=options;
  const {pairs,binding,candidate,contracts}=await frozen588OriginData(descriptor,conditions,centralContract);
  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)
    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256
    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt
    &&SHA.test(checkpoint.generationSha256),'FROZEN_588_CHECKPOINT');
  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())
    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');
  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])
    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');
}
export async function assertFrozen588MetadataOriginData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract']),'ARGUMENTS');
  await frozen588OriginData(options.descriptor,options.conditions,options.centralContract);
}
`;
const SOURCE_588_ASSERTION_SUFFIX=String.raw`
// ASSERTIONS ONLY over the WHOLE actual4845 issued588 origin implementation.
// Removing this suffix restores whole Git SHA-256 5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69.
// This is DATA validation, never a WeakMap origin/ForPart/finalizer capability.
async function frozen588OriginData(descriptor,conditions,centralContract) {
  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');
  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'FROZEN_588_DESCRIPTOR');
  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();
  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'FROZEN_588_FAMILY');
  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);
  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,
    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,
    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});
  // Exactly actual588's normal DATA dispatch, including its complete585/584 parents.
  if(conditions[ATTEST]?.kind===METADATA585_KIND
    &&conditions[ATTEST]?.predecessor?.sourceFamilyHead===METADATA585_SOURCE)
    await validateMetadata585Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else if(conditions[ATTEST]?.kind===METADATA584_KIND)
    await validateMetadata584Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');
  return {pairs,binding,candidate,contracts};
}
export async function assertFrozen588OriginSnapshotData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');
  const {descriptor,conditions,centralContract,checkpoint}=options;
  const {pairs,binding,candidate,contracts}=await frozen588OriginData(descriptor,conditions,centralContract);
  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)
    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256
    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt
    &&SHA.test(checkpoint.generationSha256),'FROZEN_588_CHECKPOINT');
  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())
    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');
  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])
    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');
}
export async function assertFrozen588MetadataOriginData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract']),'ARGUMENTS');
  await frozen588OriginData(options.descriptor,options.conditions,options.centralContract);
}
`;
const SOURCE_591_ASSERTION_SUFFIX=String.raw`
// ASSERTIONS ONLY over the WHOLE immutable a157 issued591 origin implementation.
// Removing this suffix restores whole Git SHA-256 516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c.
// This is DATA validation, never a WeakMap origin/ForPart/finalizer capability.
async function frozen591OriginData(descriptor,conditions,centralContract) {
  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');
  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'FROZEN_591_DESCRIPTOR');
  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();
  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'FROZEN_591_FAMILY');
  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);
  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,
    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,
    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});
  // Exactly actual591's normal DATA dispatch, including its complete585/584 parents.
  if(conditions[ATTEST]?.kind===METADATA585_KIND
    &&conditions[ATTEST]?.predecessor?.sourceFamilyHead===METADATA585_SOURCE)
    await validateMetadata585Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else if(conditions[ATTEST]?.kind===METADATA584_KIND)
    await validateMetadata584Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');
  return {pairs,binding,candidate,contracts};
}
export async function assertFrozen591OriginSnapshotData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');
  const {descriptor,conditions,centralContract,checkpoint}=options;
  const {pairs,binding,candidate,contracts}=await frozen591OriginData(descriptor,conditions,centralContract);
  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)
    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256
    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt
    &&SHA.test(checkpoint.generationSha256),'FROZEN_591_CHECKPOINT');
  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())
    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');
  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])
    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');
}
export async function assertFrozen591MetadataOriginData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract']),'ARGUMENTS');
  await frozen591OriginData(options.descriptor,options.conditions,options.centralContract);
}
`;
const ORIGINAL_591_ASSERTION_SUFFIX=String.raw`
// ASSERTIONS ONLY over the WHOLE immutable a157 issued591 origin implementation.
// Removing this suffix restores whole Git SHA-256 516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c.
// This is DATA validation, never a WeakMap origin/ForPart/finalizer capability.
async function frozen591OriginData(descriptor,conditions,centralContract) {
  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');
  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'FROZEN_591_DESCRIPTOR');
  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();
  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'FROZEN_591_FAMILY');
  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);
  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,
    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,
    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});
  // Exactly actual591's normal DATA dispatch, including its complete585/584 parents.
  if(conditions[ATTEST]?.kind===METADATA585_KIND
    &&conditions[ATTEST]?.predecessor?.sourceFamilyHead===METADATA585_SOURCE)
    await validateMetadata585Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else if(conditions[ATTEST]?.kind===METADATA584_KIND)
    await validateMetadata584Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');
  return {pairs,binding,candidate,contracts};
}
export async function assertFrozen591OriginSnapshotData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');
  const {descriptor,conditions,centralContract,checkpoint}=options;
  const {pairs,binding,candidate,contracts}=await frozen591OriginData(descriptor,conditions,centralContract);
  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)
    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256
    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt
    &&SHA.test(checkpoint.generationSha256),'FROZEN_591_CHECKPOINT');
  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())
    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');
  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])
    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');
}
export async function assertFrozen591MetadataOriginData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract']),'ARGUMENTS');
  await frozen591OriginData(options.descriptor,options.conditions,options.centralContract);
}
`;
const ORIGINAL_590_ASSERTION_SUFFIX=ORIGINAL_588_ASSERTION_SUFFIX
  .replace('// Removing this suffix restores whole Git SHA-256 5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69.',
    '// The source-owned selected590 origin SHA and whole inverse are checked by this host.')
  .replaceAll('588','590');
// Særskilt assert-only læser af den hele, faktisk udstedte593-kilde.
// Ingen591-DATA ommærkes, og denne kildevært udsteder intet origin-handle.
const SOURCE_593_ASSERTION_SUFFIX=SOURCE_591_ASSERTION_SUFFIX
  .replaceAll('591','593')
  .replace('a157 issued593','0f6dcbf1 issued593')
  .replace('516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c',
    'e802e02df74a53bb543d7d0e9107efd3850890a9f2c15e5d7c0c01b5229671cb');
// Independent assert-only594 suffix over the exact whole genuine37 origin blob.
const SOURCE_594_ASSERTION_SUFFIX=SOURCE_591_ASSERTION_SUFFIX
  .replaceAll('591','594')
  .replace('a157 issued594','37a34703 issued594')
  .replace('516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c',
    'b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa');
const ASSERTION_SUFFIX=profile===SOURCE594_ORIGINAL_DATA_PROFILE?SOURCE_594_ASSERTION_SUFFIX:profile===SOURCE593_ORIGINAL_DATA_PROFILE?SOURCE_593_ASSERTION_SUFFIX:profile===SOURCE591_ORIGINAL_DATA_PROFILE?SOURCE_591_ASSERTION_SUFFIX:profile===SOURCE_FROZEN588?SOURCE_588_ASSERTION_SUFFIX:profile===FROZEN591?ORIGINAL_591_ASSERTION_SUFFIX:profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:
  assertionNames.reduce((source,[before,after])=>{assert(source.includes(before));return source.replaceAll(before,after);},ORIGINAL_586_ASSERTION_SUFFIX);
if(profile===FROZEN587)assert.equal([...assertionNames].reverse().reduce(
  (source,[before,after])=>source.replaceAll(after,before),ASSERTION_SUFFIX),ORIGINAL_586_ASSERTION_SUFFIX,'Whole assertion-suffix inverse');
const METADATA_ASSERTION_SUFFIX='';
async function materializedBytes(file,index,gitReference){
  if(file===GIT_REFERENCE){assert(Buffer.isBuffer(gitReference));return gitReference;}
  if(file!==ASSERTION)return bytes(file,index);
  const original=await bytes(ORIGIN,index),suffix=ASSERTION_SUFFIX+METADATA_ASSERTION_SUFFIX;
  const derived=Buffer.concat([original,Buffer.from(suffix)]);
  assert.deepEqual(derived.subarray(0,derived.length-Buffer.byteLength(suffix)),original,'Whole old origin-module inverse');
  return derived;
}
async function exactTree(root,files,index,gitReference){
  const expected=new Set(files),seen=new Set();
  async function visit(directory,prefix=''){
    for(const leaf of await fs.readdir(directory)){const rel=prefix?prefix+'/'+leaf:leaf,file=path.resolve(directory,leaf),stat=await fs.lstat(file);
      assert(inside(root,file)&&!stat.isSymbolicLink());
      if(stat.isDirectory()){assert(files.some(p=>p.startsWith(rel+'/')));await visit(file,rel);}
      else {assert(stat.isFile()&&stat.nlink===1&&expected.has(rel),'Unknown source leaf is retained');
        assert.deepEqual(await fs.readFile(file),await materializedBytes(rel,index,gitReference),'Fixed producer source changed');seen.add(rel);}
    }
  }
  await visit(root);assert.deepEqual([...seen].sort(),files);
}
async function withSource(useVerifiedSource){
  if(profile===SOURCE594_ORIGINAL_DATA_PROFILE)assertSource594OriginalDataSourceSelected();
  if(profile===SOURCE594_CODE_PROFILE)assertSource594CodeSourceSelected();
  if(profile===SOURCE593_ORIGINAL_DATA_PROFILE)assertSource593OriginalDataSourceSelected(); // Kun fast DATA-kildevært, før Git/temp/I/O.
  if(profile===SOURCE591_ORIGINAL_DATA_PROFILE)assertSource591OriginalDataSourceSelected(); // DATA assertions only, before Git/temp/I/O.
  if(profile===SOURCE_FROZEN588)assertSourceFrozen588CodeSourceSelected(); // Preserved fixed SOURCE4845 role.
  if(profile===SOURCE591_CODE_PROFILE)assertSource591CodeSourceSelected(); // CODE only, before Git/temp/I/O.
  if(profile===SOURCE592_CODE_PROFILE)assertSource592CodeSourceSelected(); // New fixed CODE only, never an original handle.
  if(profile===SOURCE593_CODE_PROFILE)assertSource593CodeSourceSelected(); // Exact proposed CODE only; no593 DATA bank.
  if(profile===FROZEN591)assertFrozen591CodeSourceSelected(); // Fixed genuine591 before Git/temp/I/O.
  if(profile===FROZEN590)assertFrozen590CodeSourceSelected(); // FIRST: no selected parent, no Git/I/O.
  if(profile===FROZEN588)assertFrozen588CodeSourceSelected(); // FIRST: unselected code cannot reach Git/I/O.
  assert.equal(arguments.length,1,'No caller head/root/source override');assert.equal(typeof useVerifiedSource,'function');
  const index=await inventory(),sourceFiles=await selected(index),files=[...sourceFiles,...(ASSERTION===null?[]:[ASSERTION]),GIT_REFERENCE].sort();
  assert(!index.has(GIT_REFERENCE));
  // Same genuine object-store reference as run-frozen584-reconcile-source.
  // This does NOT claim frozen HEAD/source-clean or create an issuer.
  const gitDirectory=path.resolve(String(await git(['rev-parse','--absolute-git-dir'],'utf8')).trim());
  await noLinks(gitDirectory);assert.equal(await fs.realpath(gitDirectory),gitDirectory);
  const gitIdentity=identity(await fs.lstat(gitDirectory,{bigint:true}));
  const gitReference=Buffer.from('gitdir: '+gitDirectory.split(path.sep).join('/')+'\n');
  assert(!index.has(ASSERTION),'New assert-only leaf cannot shadow an issued Git source');
  const parent=await fs.realpath(os.tmpdir()),prefix=profile.temporaryPrefix,root=await fs.mkdtemp(path.join(parent,prefix));
  assert.equal(path.dirname(root),parent);assert.equal(await fs.realpath(root),root);
  const owned=identity(await fs.lstat(root,{bigint:true}));
  let result,first,hasFirst=false;
  try{
    for(const file of files){const output=path.resolve(root,file);assert(inside(root,output));await fs.mkdir(path.dirname(output),{recursive:true});
      await fs.writeFile(output,await materializedBytes(file,index,gitReference),{flag:'wx',mode:0o600});}
    await exactTree(root,files,index,gitReference);
    const builderArgs=(profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE)?['--installed593-origin591-successor','--check']:
      (profile===SOURCE592_CODE_PROFILE||profile===SOURCE593_CODE_PROFILE||profile===SOURCE593_ORIGINAL_DATA_PROFILE)?['--public591-successor','--check']:
      (profile===SOURCE591_CODE_PROFILE||profile===SOURCE591_ORIGINAL_DATA_PROFILE||profile===FROZEN591)?['--public590-successor','--check']:
      profile===FROZEN590?['--public588-successor','--check']:
      (profile===FROZEN588||profile===SOURCE_FROZEN588)?['--public587-successor','--check']:['--check'];
    const checked=await execute(process.execPath,[path.join(root,BUILDER),...builderArgs],{cwd:root,env:fixedEnv(),timeout:60000,maxBuffer:1024*1024});
    assert.equal(checked.stdout.trim(),profile.builderChecked);
    const continuation=await import(pathToFileURL(path.join(root,T)).href);
    assert.equal(await continuation.ravScoreContinuationImplementationSha256({repositoryRoot:root}),
      RUNTIME_CONTRACTS.continuationStateContractSha256);
    const workflow=await import(pathToFileURL(path.join(root,'scripts/private-production-runtime-workflow.mjs')).href);
    assert.deepEqual(await workflow.privateRuntimeContractHashes({repositoryRoot:root}),RUNTIME_CONTRACTS,
      'Genuine fixed predecessor B/S persisted runtime contracts');
    await exactTree(root,files,index,gitReference);
    await noLinks(gitDirectory);assert.deepEqual(identity(await fs.lstat(gitDirectory,{bigint:true})),gitIdentity);
    result=await useVerifiedSource(root);
  }catch(error){first=error;hasFirst=true;}
  try{
    await noLinks(gitDirectory);assert.equal(await fs.realpath(gitDirectory),gitDirectory);
    assert.deepEqual(identity(await fs.lstat(gitDirectory,{bigint:true})),gitIdentity);
    await noLinks(root);assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),parent);assert(path.basename(root).startsWith(prefix));
    assert.deepEqual(identity(await fs.lstat(root,{bigint:true})),owned);await exactTree(root,files,index,gitReference);
    for(const file of files)await fs.unlink(path.join(root,file));
    const dirs=new Set();for(const file of files){let p=path.posix.dirname(file);while(p!=='.'){dirs.add(p);p=path.posix.dirname(p);}}
    for(const p of [...dirs].sort((a,b)=>b.length-a.length))await fs.rmdir(path.join(root,p));await fs.rmdir(root);
  }catch(error){if(!hasFirst){first=error;hasFirst=true;}}
  if(hasFirst)throw first;return result;
}

  return withSource;
}
const FROZEN586=Object.freeze({
  head:'7df56f36f705db641b3f9476ee8ca1b4c4cfed0c',tree:'57192d6d5cfbd8709f3558ad8afaaf10dd6cafe0',
  builder:'scripts/build-native-original-continuity-successor.mjs',
  builderChecked:'Exact post585 native-original-continuity metadata source checked; no installation or state admission.',
  assertion:'scripts/lib/established-native-current-origin-586-assertion.mjs',temporaryPrefix:'rr-a586-source-',
  candidate:'eb042ae79b64df21537421283a0d62d39af22c2d1a38707e530970af6bc7c8dd',candidateFiles:96,
  integrated:'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805',integratedFiles:95,
  originSha256:'b67f460aa9b01ff9d0ff03bfbbed5c9d570425196bf929f9bd8d7b4b67b586b1',
  additionalMigrations:Object.freeze([]),
  runtimeContracts:Object.freeze({
    continuationStateContractSha256:'d2d93920aacc4be877da22c7b9e31e21426e647227a2c5018ee14b3a267500c7',
    fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',
    publicProjectionContractSha256:'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09'}),
});
const FROZEN587=Object.freeze({
  head:'aab72babd27175a4276c2a2f1965c74bb021b4af',tree:'959f63d40c3980e804caa750da227cbd96e34a49',
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact original-preserving assistant later-H0 metadata source checked; no installation or state admission.',
  assertion:'scripts/lib/established-native-current-origin-587-assertion.mjs',temporaryPrefix:'rr-a587-source-',
  candidate:'5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4',candidateFiles:98,
  integrated:'5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2',integratedFiles:97,
  originSha256:'5ebeea93ee7da95011ecc3c589e2a1a54a7ac821ad938997aea0b6444aa607bf',
  additionalMigrations:Object.freeze([Object.freeze({
    path:'supabase/migrations/20261022181403_assistant_later_h0_original_bound_successor.sql',
    sha256:'b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7'})]),
  runtimeContracts:Object.freeze({
    continuationStateContractSha256:'cd3a3648ad5093662871559aa39d77671eda27edf1f9edc82a104c5430a43a21',
    fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',
    publicProjectionContractSha256:'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09'}),
});
// Den kvalificerede588-kilde er målt fra b574's uændrede Gittræ.
// De otte felter er kildeejede; ingen caller-/miljøoverrides eller runtimeadgang.
export const FROZEN588_CODE_SOURCE_PROVENANCE=Object.freeze({
  selected:true,head:'b57480082fb16f31ed4e4aa2bc308fff9abfe2d0',tree:'fe3b9bf6270c2a506aac003d57e1e4d2a7d491de',candidateFiles:98,integratedFiles:97,
  originSha256:'5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69',
  partPipelineSha256:'8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758',
  fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',
  publicProjectionContractSha256:'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09',
});
const FROZEN588=Object.freeze({
  ...FROZEN588_CODE_SOURCE_PROVENANCE,
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact original-preserving assistant later-H0 metadata source checked; no installation or state admission.',
  assertion:'scripts/lib/established-native-current-origin-588-assertion.mjs',temporaryPrefix:'rr-a588-source-',
  candidate:'00905533cd243ffce8e507beedbc39c8dba26e635b59fa154e6f9ab20575780c',
  integrated:'5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac',
  additionalMigrations:Object.freeze([...FROZEN587.additionalMigrations,Object.freeze({
    path:'supabase/migrations/20261025110000_assistant_public587_later_h0_original_bound_successor.sql',
    sha256:'363d3f304150e8abd61e0217848839bd7babb4e5687f3e61a1a6e84b948f589f'})]),
  runtimeContracts:Object.freeze({
    continuationStateContractSha256:'d98559d56d7bfe9b141cf1ddab73cddffb688a3b6766f5f9f3779b226f573701',
    fullRuntimeContractSha256:FROZEN588_CODE_SOURCE_PROVENANCE.fullRuntimeContractSha256,
    publicProjectionContractSha256:FROZEN588_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),
});

export const FROZEN590_CODE_SOURCE_PROVENANCE=Object.freeze({
  selected:true,head:'2712b6556acd33d3d06ff1a9b5f55b5b620f1ee9',tree:'e3fa7dd3eb7ec873deefb73148ad6bae0f0df725',candidateFiles:98,integratedFiles:97,
  originSha256:'bc3da0ace8094f36bc221e5d023620e42f8153e9082780141e48372ca7c1f2b0',partPipelineSha256:'8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758',
  fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',publicProjectionContractSha256:'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09',
});
const FROZEN590=Object.freeze({
  ...FROZEN590_CODE_SOURCE_PROVENANCE,
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact original-preserving calendar588 later-H0 metadata source checked; no installation or state admission.',
  assertion:'scripts/lib/established-native-current-origin-590-assertion.mjs',temporaryPrefix:'rr-a590-source-',
  candidate:'bca59cb435cb3f35041c665d2954f0ef04b189b572219771fc5628e4f7ccb551',
  integrated:'4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819',
  additionalMigrations:Object.freeze([...FROZEN588.additionalMigrations,Object.freeze({
    path:'supabase/migrations/20261027124633_assistant_public588_later_h0_original_bound_successor.sql',
    sha256:'eb0262716b66d29d52bf0ac4412c475ab5e9ea69e1cad15eabc9a31b48bcf821'})]),
  runtimeContracts:Object.freeze({
    continuationStateContractSha256:'d444e6141038f56dd04b97a55eefe07bbd98f122fb3b76a43bdddacff2d88c8a',
    fullRuntimeContractSha256:FROZEN590_CODE_SOURCE_PROVENANCE.fullRuntimeContractSha256,
    publicProjectionContractSha256:FROZEN590_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),
});

// Genuine issued591 CODE and DATA bank for the ordinary later-H0 assistant successor.
// This fixed selection creates no original handle, SOURCE permission or runtime admission.
export const FROZEN591_CODE_SOURCE_PROVENANCE=Object.freeze({
  "selected":true,
  "head":"a157c265949da661827d375db61f9e1e8c4fd6a0",
  "tree":"54b020c90661caa31b4e5e1eceedbe827336e4b9",
  "candidateFiles":98,
  "integratedFiles":97,
  "originSha256":"516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c",
  "partPipelineSha256":"8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758",
  "fullRuntimeContractSha256":"ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff",
  "publicProjectionContractSha256":"c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09"
});
const FROZEN591=Object.freeze({
  ...FROZEN591_CODE_SOURCE_PROVENANCE,
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact original-preserving assistant590 later-H0 metadata source checked; no installation or state admission.',
  assertion:'scripts/lib/established-native-current-origin-591-assertion.mjs',temporaryPrefix:'rr-a591-source-',
  candidate:'38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',
  integrated:'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54',
  additionalMigrations:Object.freeze([...FROZEN590.additionalMigrations,Object.freeze({
    path:'supabase/migrations/20261028223717_assistant_public590_later_h0_original_bound_successor.sql',
    sha256:'72b53fb08ea0e5cebcda7e1cbf3bc49a8a3f2417975daeb6daf530c9029c6835'})]),
  runtimeContracts:Object.freeze({
    continuationStateContractSha256:'b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d',
    fullRuntimeContractSha256:FROZEN591_CODE_SOURCE_PROVENANCE.fullRuntimeContractSha256,
    publicProjectionContractSha256:FROZEN591_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),
});

// SOURCE-owned CODE preparation only. This is not an authenticated original,
// CURRENT/STAGED capability, public delivery qualification or runtime admission.
export const SOURCE591_CODE_SOURCE_PROVENANCE=Object.freeze({
  "selected": true,
  "purpose": "CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION",
  "head": "a157c265949da661827d375db61f9e1e8c4fd6a0",
  "tree": "54b020c90661caa31b4e5e1eceedbe827336e4b9",
  "candidateFiles": 98,
  "integratedFiles": 97,
  "originSha256": "516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c",
  "partPipelineSha256": "8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758",
  "fullRuntimeContractSha256": "ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff",
  "publicProjectionContractSha256": "c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09"
});
const SOURCE591_CODE_PROFILE=Object.freeze({
  ...SOURCE591_CODE_SOURCE_PROVENANCE,
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact original-preserving assistant590 later-H0 metadata source checked; no installation or state admission.',
  assertion:null,temporaryPrefix:'rr-source-a591-code-',
  candidate:'38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',
  integrated:'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54',
  additionalMigrations:Object.freeze([
    Object.freeze({path:'supabase/migrations/20261022181403_assistant_later_h0_original_bound_successor.sql',sha256:'b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7'}),
    Object.freeze({path:'supabase/migrations/20261025110000_assistant_public587_later_h0_original_bound_successor.sql',sha256:'363d3f304150e8abd61e0217848839bd7babb4e5687f3e61a1a6e84b948f589f'}),
    Object.freeze({path:'supabase/migrations/20261027124633_assistant_public588_later_h0_original_bound_successor.sql',sha256:'eb0262716b66d29d52bf0ac4412c475ab5e9ea69e1cad15eabc9a31b48bcf821'}),
    Object.freeze({path:'supabase/migrations/20261028223717_assistant_public590_later_h0_original_bound_successor.sql',sha256:'72b53fb08ea0e5cebcda7e1cbf3bc49a8a3f2417975daeb6daf530c9029c6835'}),
  ]),
  runtimeContracts:Object.freeze({
    "continuationStateContractSha256": "b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d",
    "fullRuntimeContractSha256": "ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff",
    "publicProjectionContractSha256": "c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09"
  }),
});

// Proposed SOURCE592 CODE role, derived from actual immutable issued592.
// No DATA assertion suffix, authenticated snapshot, origin issuer or runtime admission.
export const SOURCE592_CODE_SOURCE_PROVENANCE=Object.freeze({
  "selected": true,
  "purpose": "CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION",
  "head": "a45aa41d12c356849c5e7272f9baf71bf523ccd3",
  "tree": "6f8287bb5d5f94d80d4333014baace69e6ee8ecc",
  "candidateFiles": 98,
  "integratedFiles": 97,
  "originSha256": "2aa92e6a2fb14f93e6072160499be1f39a502f4078bf61c98f649adfe538cf01",
  "partPipelineSha256": "70796cda12d12f858438d21860e84067e4cf7fe5dfb967a2176804a155c681bd",
  "fullRuntimeContractSha256": "ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff",
  "publicProjectionContractSha256": "24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec"
});
const SOURCE592_CODE_PROFILE=Object.freeze({
  ...SOURCE592_CODE_SOURCE_PROVENANCE,
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact original-preserving assistant591 later-H0 metadata source checked; no installation or state admission.',
  assertion:null,temporaryPrefix:'rr-source-a592-code-',
  candidate:'40a7c6ce6b97d15a2fdc56cd1e587388554580c99244767fde2c4bf145828433',integrated:'7e8ac21ad18682ebc490b067f8b0b8cefb935be7b90822be7e7983150053fc3f',
  additionalMigrations:Object.freeze([...SOURCE591_CODE_PROFILE.additionalMigrations,Object.freeze({
    path:'supabase/migrations/20261029183010_assistant_public591_later_h0_original_bound_successor.sql',sha256:'e5c7fb182d9491bd9222cb59dbefd3da4592867522dde805ea17e67c0d023e97'} )]),
  runtimeContracts:Object.freeze({continuationStateContractSha256:'24aa50184651b20f1846304db029ded943cb56b34fdf0b4820abc92415156308',
    fullRuntimeContractSha256:SOURCE592_CODE_SOURCE_PROVENANCE.fullRuntimeContractSha256,
    publicProjectionContractSha256:SOURCE592_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),
});

// Proposed fixed593 CODE; historical591/592 definitions above remain whole.
// No DATA assertion, snapshot capability, runtime binding or installation claim.
export const SOURCE593_CODE_SOURCE_PROVENANCE=Object.freeze({
  "selected": true,
  "purpose": "CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION",
  "head": "0f6dcbf1700fa936eab520cba0ef2a834d53466f",
  "tree": "0336fce50b6015e62e346ad044099e67493c1a61",
  "candidateFiles": 99,
  "integratedFiles": 98,
  "originSha256": "e802e02df74a53bb543d7d0e9107efd3850890a9f2c15e5d7c0c01b5229671cb",
  "partPipelineSha256": "8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758",
  "fullRuntimeContractSha256": "ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff",
  "publicProjectionContractSha256": "24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec"
});
const SOURCE593_CODE_PROFILE=Object.freeze({
  ...SOURCE593_CODE_SOURCE_PROVENANCE,
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact original-preserving assistant591 later-H0 metadata source checked; no installation or state admission.',
  assertion:null,temporaryPrefix:'rr-source-a593-code-',
  candidate:'12f78005304316a680716a1d437e06a582815c1645a2eb567028bcc18ff99ffa',integrated:'69bf81c3cc5e256deee2c116a52462597f4cfc47cb6c855c6dba969c1dcf4643',
  // Keep the uninstalled592 SQL bytes in the immutable source inventory.
  additionalMigrations:Object.freeze([...SOURCE592_CODE_PROFILE.additionalMigrations,Object.freeze({
    path:'supabase/migrations/20261030105202_assistant_public591_later_h0_original_bound_successor.sql',
    sha256:'47c51886a58aa1cfbbc244a5469ace67521774499135666c26fccd8c7f291bfd'})]),
  runtimeContracts:Object.freeze({
  "continuationStateContractSha256": "e894dd096d03f71cc334d97f85931c2b3969e9b140cb5403a4787cf4b81fbc2e",
  "fullRuntimeContractSha256": "ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff",
  "publicProjectionContractSha256": "24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec"
}),
});

// Samme faste, udstedte593-kode; en særskilt assert-only DATA-rolle.
// Ægte B/S, attest, register og friskhed kræves senere af snapshot-læseren.
const SOURCE593_ORIGINAL_DATA_PROFILE=Object.freeze({...SOURCE593_CODE_PROFILE,
  purpose:'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION',
  assertion:'scripts/lib/established-native-current-origin-593-assertion.mjs',temporaryPrefix:'rr-source-a593-data-'});

// Same immutable591 source, a distinct DATA-assertions role; this host still issues no original handle.
const SOURCE591_ORIGINAL_DATA_PROFILE=Object.freeze({...SOURCE591_CODE_PROFILE,
  purpose:'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION',
  assertion:'scripts/lib/established-native-current-origin-591-assertion.mjs',temporaryPrefix:'rr-source-a591-data-'});

// Genuine37 CODE for ordinary232; not a retag of genuine7a08/4145 or its recovery executor.
export const SOURCE594_CODE_SOURCE_PROVENANCE=Object.freeze({
  "selected": true,
  "purpose": "CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION",
  "head": "37a34703d9ae8bfb2c28056f21a7ea73944033ae",
  "tree": "09aef7f6f5d965f565fadabea203b50687acc255",
  "candidateFiles": 100,
  "integratedFiles": 99,
  "originSha256": "b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa",
  "partPipelineSha256": "8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758",
  "fullRuntimeContractSha256": "ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff",
  "publicProjectionContractSha256": "24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec"
});
const SOURCE594_CODE_PROFILE=Object.freeze({
  ...SOURCE594_CODE_SOURCE_PROVENANCE,
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact installed593/original591 later-H0 successor checked; no installation or state admission.',
  assertion:null,temporaryPrefix:'rr-source-a594-code-',
  candidate:'2d5cde5418270a02396e24a249f0b6bb09527366c1c110d8742a44cfe2ab459b',integrated:'08750e3667e5a221374762fccadccf08abf5e9f1ae8814ccc97bfc11880bf36c',
  additionalMigrations:Object.freeze([...SOURCE593_CODE_PROFILE.additionalMigrations,Object.freeze({
    path:'supabase/migrations/20261031070755_installed593_original591_later_h0_bound_successor.sql',
    sha256:'0d50a857aebf838c072ee7ccfc846fecd9744f9bb093eb6943b0484eee99c777'})]),
  runtimeContracts:Object.freeze({continuationStateContractSha256:'a6c0408f76b5de70a90959e254df78317f8282cb93c0edc85a71d36b9ef8dafa',
    fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',
    publicProjectionContractSha256:'24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec'}),
});
// This is only an immutable DATA validator host. B/S, original attestations,
// registry/snapshot and fresh CURRENT/S versions must still be authenticated.
const SOURCE594_ORIGINAL_DATA_PROFILE=Object.freeze({...SOURCE594_CODE_PROFILE,
  purpose:'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION',
  assertion:'scripts/lib/established-native-current-origin-594-assertion.mjs',temporaryPrefix:'rr-source-a594-data-'});

// Existing SOURCE4845 CODE role only; never the control b574 profile or a590 parent.
const SOURCE_FROZEN588=Object.freeze({
  selected:true,
  head:'4845e6c6622333ad4e8454b0b43f5f94ae42233e',tree:'30e8fd7994c3a625b55f6798fc0d268589bb4cfb',
  builder:'scripts/build-assistant-later-h0-successor.mjs',
  builderChecked:'Exact original-preserving assistant later-H0 metadata source checked; no installation or state admission.',
  assertion:'scripts/lib/established-native-current-origin-588-assertion.mjs',temporaryPrefix:'rr-a588-source-',
  candidate:'00905533cd243ffce8e507beedbc39c8dba26e635b59fa154e6f9ab20575780c',candidateFiles:98,
  integrated:'5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac',integratedFiles:97,
  originSha256:'5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69',
  additionalMigrations:Object.freeze([Object.freeze({
    path:'supabase/migrations/20261022181403_assistant_later_h0_original_bound_successor.sql',
    sha256:'b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7'}),Object.freeze({
    path:'supabase/migrations/20261025110000_assistant_public587_later_h0_original_bound_successor.sql',
    sha256:'363d3f304150e8abd61e0217848839bd7babb4e5687f3e61a1a6e84b948f589f'})]),
  runtimeContracts:Object.freeze({
    continuationStateContractSha256:'d98559d56d7bfe9b141cf1ddab73cddffb688a3b6766f5f9f3779b226f573701',
    fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',
    publicProjectionContractSha256:'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09'}),
});

// Hver fast profil ejer sin cache; samme relative sti kan aldrig genbruge den anden familie.
const source586=fixedSource(FROZEN586),source587=fixedSource(FROZEN587),source588=fixedSource(FROZEN588);
export async function withAuthenticated586PredecessorSource(useVerifiedSource){
  return source586(...arguments);
}
export async function withAuthenticated587PredecessorSource(useVerifiedSource){
  return source587(...arguments);
}

export function assertFrozen588CodeSourceSelected(){
  assert.equal(arguments.length,0,'No caller-selected588 source');
  const value=FROZEN588_CODE_SOURCE_PROVENANCE;
  assert.equal(value.selected,true,'FROZEN588_CODE_SOURCE_UNSELECTED');
  assert.deepEqual(Object.keys(value).sort(),['selected','head','tree','candidateFiles','integratedFiles',
    'originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'].sort());
  for(const key of ['head','tree'])assert.match(value[key],/^[a-f0-9]{40}$/);
  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])
    assert.match(value[key],/^[a-f0-9]{64}$/);
  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(value[key])&&value[key]>0);
  return true; // Kildevalg alene, aldrig runtime/B/S-adgang.
}
export async function withAuthenticated588PredecessorSource(useVerifiedSource){
  return source588(...arguments);
}

const source590=fixedSource(FROZEN590);
export function assertFrozen590CodeSourceSelected(){
  assert.equal(arguments.length,0);const source=FROZEN590_CODE_SOURCE_PROVENANCE;
  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles','originSha256','partPipelineSha256','publicProjectionContractSha256','selected','tree']);
  assert.equal(source.selected,true,'FROZEN590_CODE_SOURCE_UNSELECTED');
  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);
  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);
  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])assert.match(source[key],/^[a-f0-9]{64}$/);
  return source; // Fixed source data only, never a CI/PASS or runtime capability.
}
export async function withAuthenticated590PredecessorSource(callback){
  assertFrozen590CodeSourceSelected();return source590(...arguments);
}

const source591=fixedSource(FROZEN591);
export function assertFrozen591CodeSourceSelected(){
  assert.equal(arguments.length,0);const source=FROZEN591_CODE_SOURCE_PROVENANCE;
  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles','originSha256','partPipelineSha256','publicProjectionContractSha256','selected','tree']);
  assert.equal(source.selected,true,'FROZEN591_CODE_SOURCE_UNSELECTED');
  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);
  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);
  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])assert.match(source[key],/^[a-f0-9]{64}$/);
  return source; // Fixed CODE data only; never a CI/PASS or original/runtime capability.
}
export async function withAuthenticated591PredecessorSource(callback){
  assertFrozen591CodeSourceSelected();return source591(...arguments);
}

// Only CODE bytes are materialized. No assert-only original leaf is appended,
// and no new fixedSnapshot/WeakMap bank or source runtime binding is registered.
const source592Code=fixedSource(SOURCE592_CODE_PROFILE);
export function assertSource592CodeSourceSelected(){
  assert.equal(arguments.length,0,'No caller-selected592 CODE source');
  const source=SOURCE592_CODE_SOURCE_PROVENANCE;
  assert.equal(source.selected,true);assert.equal(source.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');
  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles',
    'originSha256','partPipelineSha256','publicProjectionContractSha256','purpose','selected','tree'].sort());
  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);
  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);
  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])
    assert.match(source[key],/^[a-f0-9]{64}$/);
  return source; // Proposed CODE data only, not qualification or original admission.
}
export async function withSource592CodeParent(callback){
  assertSource592CodeSourceSelected();return source592Code(...arguments);
}

const source593Code=fixedSource(SOURCE593_CODE_PROFILE);
export function assertSource593CodeSourceSelected(){
  assert.equal(arguments.length,0,'No caller-selected593 CODE source');
  const source=SOURCE593_CODE_SOURCE_PROVENANCE;
  assert.equal(source.selected,true);assert.equal(source.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');
  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles',
    'originSha256','partPipelineSha256','publicProjectionContractSha256','purpose','selected','tree'].sort());
  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);
  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);
  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])
    assert.match(source[key],/^[a-f0-9]{64}$/);
  return source; // Proposed CODE data only, not qualification or original admission.
}
export async function withSource593CodeParent(callback){
  assertSource593CodeSourceSelected();return source593Code(...arguments);
}

const source594Code=fixedSource(SOURCE594_CODE_PROFILE);
export function assertSource594CodeSourceSelected(){
  assert.equal(arguments.length,0,'No caller-selected594 CODE source');
  const source=SOURCE594_CODE_SOURCE_PROVENANCE;
  assert.equal(source.selected,true);assert.equal(source.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');
  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles',
    'originSha256','partPipelineSha256','publicProjectionContractSha256','purpose','selected','tree'].sort());
  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);
  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);
  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])
    assert.match(source[key],/^[a-f0-9]{64}$/);
  return source; // Proposed CODE data only, not qualification or original admission.
}
export async function withSource594CodeParent(callback){
  assertSource594CodeSourceSelected();return source594Code(...arguments);
}

const source591Code=fixedSource(SOURCE591_CODE_PROFILE);
export function assertSource591CodeSourceSelected(){
  assert.equal(arguments.length,0,'No caller-selected591 CODE source');
  const source=SOURCE591_CODE_SOURCE_PROVENANCE;
  assert.equal(source.selected,true);
  assert.equal(source.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');
  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles',
    'originSha256','partPipelineSha256','publicProjectionContractSha256','purpose','selected','tree'].sort());
  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);
  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);
  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])
    assert.match(source[key],/^[a-f0-9]{64}$/);
  return source; // CODE data only; never a runtime/original handle or CI/PASS receipt.
}
export async function withSource591CodeParent(callback){
  assertSource591CodeSourceSelected();return source591Code(...arguments);
}

// The existing SOURCE4845 profile has its own fixedSource cache and no alias to b574/590.
const sourceProducer588=fixedSource(SOURCE_FROZEN588);
export function assertSourceFrozen588CodeSourceSelected(){
  assert.equal(arguments.length,0);assert.equal(SOURCE_FROZEN588.selected,true,'FROZEN588_CODE_SOURCE_UNSELECTED');
}
export async function withAuthenticatedSource588PredecessorSource(useVerifiedSource){
  return sourceProducer588(...arguments);
}

// The591 assertion source is separate from the original-free CODE profile.
// Actual CURRENT/STAGED authority is issued only by the existing authenticated snapshot primitive.
const source591OriginalData=fixedSource(SOURCE591_ORIGINAL_DATA_PROFILE);
export function assertSource591OriginalDataSourceSelected(){
  assert.equal(arguments.length,0);assertSource591CodeSourceSelected();
  assert.equal(SOURCE591_ORIGINAL_DATA_PROFILE.purpose,'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION');
  assert.equal(SOURCE591_ORIGINAL_DATA_PROFILE.head,SOURCE591_CODE_SOURCE_PROVENANCE.head);
  assert.equal(SOURCE591_ORIGINAL_DATA_PROFILE.tree,SOURCE591_CODE_SOURCE_PROVENANCE.tree);
  assert.equal(SOURCE591_ORIGINAL_DATA_PROFILE.assertion,'scripts/lib/established-native-current-origin-591-assertion.mjs');
}
export async function withSource591OriginalDataSource(callback){
  assertSource591OriginalDataSourceSelected();return source591OriginalData(...arguments);
}

// Denne vært kvalificerer kun den faste assert-only kode. Den giver ingen DATA-/origin-kapabilitet.
const source593OriginalData=fixedSource(SOURCE593_ORIGINAL_DATA_PROFILE);
export function assertSource593OriginalDataSourceSelected(){
  assert.equal(arguments.length,0);assertSource593CodeSourceSelected();
  assert.equal(SOURCE593_ORIGINAL_DATA_PROFILE.purpose,'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION');
  assert.equal(SOURCE593_ORIGINAL_DATA_PROFILE.head,SOURCE593_CODE_SOURCE_PROVENANCE.head);
  assert.equal(SOURCE593_ORIGINAL_DATA_PROFILE.tree,SOURCE593_CODE_SOURCE_PROVENANCE.tree);
  assert.equal(SOURCE593_ORIGINAL_DATA_PROFILE.assertion,'scripts/lib/established-native-current-origin-593-assertion.mjs');
}
export async function withSource593OriginalDataSource(callback){
  assertSource593OriginalDataSourceSelected();return source593OriginalData(...arguments);
}

const source594OriginalData=fixedSource(SOURCE594_ORIGINAL_DATA_PROFILE);
export function assertSource594OriginalDataSourceSelected(){
  assert.equal(arguments.length,0);assertSource594CodeSourceSelected();
  assert.equal(SOURCE594_ORIGINAL_DATA_PROFILE.purpose,'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION');
  assert.equal(SOURCE594_ORIGINAL_DATA_PROFILE.head,SOURCE594_CODE_SOURCE_PROVENANCE.head);
  assert.equal(SOURCE594_ORIGINAL_DATA_PROFILE.tree,SOURCE594_CODE_SOURCE_PROVENANCE.tree);
  assert.equal(SOURCE594_ORIGINAL_DATA_PROFILE.assertion,'scripts/lib/established-native-current-origin-594-assertion.mjs');
}
export async function withSource594OriginalDataSource(callback){
  assertSource594OriginalDataSourceSelected();return source594OriginalData(...arguments);
}
