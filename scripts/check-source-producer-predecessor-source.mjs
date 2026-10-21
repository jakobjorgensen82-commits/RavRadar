// Fixed genuine issued585 DATA source. No caller root/head/pin.
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
const HEAD='e8f9f7197d9e262720b7627b4970d3da82baa9d9';
const TREE='24dbf944916031ea256537b125966e946efeead8';
const C='scripts/rollback-assets/ravscore-model-bundle.generated.js';
const I='js/core/ravscore-model-bundle.generated.js';
const T='scripts/lib/ravscore-continuation-implementation-contract.mjs';
const BUILDER='scripts/build-account-statistics-assistant-successor.mjs';
const SCANNER='scripts/lib/static-module-closure.mjs';
const MODEL_SCANNER='scripts/lib/model-source-imports.mjs';
const ORIGIN='scripts/lib/established-native-current-origin.mjs';
const ASSERTION='scripts/lib/established-native-current-origin-585-assertion.mjs';
const GIT_REFERENCE='.git';
const CP='scripts/ravscore-continuation-checkpoint.mjs';
const RUNTIME_CONTRACTS=Object.freeze({
  continuationStateContractSha256:'a0a5fa40385afb221dcb66e61b815453c11ee8c91f3e2d6581be0670cadc9299',
  fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',
  publicProjectionContractSha256:'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09',
});
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
  for(const [file,binding,count] of [[C,'2f5f28044ae88fccbcad4a9d21943b986aabcdd8be1ae607d5e79d0a8947925f',94],
    [I,'31bbb9a98f4df93804a9d4bcdff50fe5e9b1c880e04492d2c596079488a6bfa2',93]]){
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
  // The ten fixed canonical-chain migrations, not a copy of all source/history.
  for(const name of ['20261010130000_owner_export_origin_bound_successor.sql','20261012200000_checkpoint_cas_single_projection_successor.sql',
    '20261013210000_account_assistant_original_bound_successor.sql','20261013220000_current_grid_original_bound_successor.sql',
    '20261013230000_account_statistics_revision.sql','20261016060000_native_sampling_identity_original_bound_successor.sql',
    '20261017020000_current_memory_warmup_original_bound_successor.sql',
    '20261017140000_established_native_current_origin_bound_successor.sql',
    '20261019060000_last_mile_enclosure_original_bound_successor.sql',
    '20261019100000_account_statistics_assistant_original_bound_successor.sql'])pending.push('supabase/migrations/'+name);
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
  assert.equal(sha(await bytes(ORIGIN,index)),
    'e6aac50d3077acd501228ffa64027c6524ab4c429a9b7edf97f48f966bcfb95b');
  assert.equal(sha(await bytes('supabase/migrations/20261019100000_account_statistics_assistant_original_bound_successor.sql',index)),
    '9cb02d5fccdb5c9458a1f924c8f8c57510044492d2f326ab28c45ff735039d59');
  return [...found].sort();
}
const ASSERTION_SUFFIX=String.raw`
// ASSERTIONS ONLY over the WHOLE fixed e8f9 origin implementation.
// Remove this exact suffix to restore its original e6aac50d... Git bytes.
// No WeakMap snapshot/origin/ForPart/owner capability is created here.
async function frozen585OriginData(descriptor,conditions,centralContract) {
  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');
  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'FROZEN_585_DESCRIPTOR');
  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();
  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'FROZEN_585_FAMILY');
  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);
  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,
    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,
    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});
  // Exact normal585 dispatch, including its WHOLE metadata585->584 parent.
  // That validator itself invokes the genuine fixed584 DATA-source assertion.
  if(conditions[ATTEST]?.kind===METADATA584_KIND)
    await validateMetadata584Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  else validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');
  return {pairs,binding,candidate,contracts}; // Internal values only, never exported authority.
}
export async function assertFrozen585OriginSnapshotData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');
  const {descriptor,conditions,centralContract,checkpoint}=options;
  const {pairs,binding,candidate,contracts}=await frozen585OriginData(descriptor,conditions,centralContract);
  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)
    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256
    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt
    &&SHA.test(checkpoint.generationSha256),'FROZEN_585_CHECKPOINT');
  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())
    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');
  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])
    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');
  // Undefined: normal protected-S/GCM/original-auth are the caller's obligations.
}
export async function assertFrozen585MetadataOriginData(options) {
  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract']),'ARGUMENTS');
  await frozen585OriginData(options.descriptor,options.conditions,options.centralContract);
  // Undefined: no authenticated snapshot, metadata issuer or installation proof.
}
`;
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
export async function withAuthenticated585PredecessorSource(useVerifiedSource){
  assert.equal(arguments.length,1,'No caller head/root/source override');assert.equal(typeof useVerifiedSource,'function');
  const index=await inventory(),sourceFiles=await selected(index),files=[...sourceFiles,ASSERTION,GIT_REFERENCE].sort();
  assert(!index.has(GIT_REFERENCE));
  // Same genuine object-store reference as run-frozen584-reconcile-source.
  // This does NOT claim frozen HEAD/source-clean or create an issuer.
  const gitDirectory=path.resolve(String(await git(['rev-parse','--absolute-git-dir'],'utf8')).trim());
  await noLinks(gitDirectory);assert.equal(await fs.realpath(gitDirectory),gitDirectory);
  const gitIdentity=identity(await fs.lstat(gitDirectory,{bigint:true}));
  const gitReference=Buffer.from('gitdir: '+gitDirectory.split(path.sep).join('/')+'\n');
  assert(!index.has(ASSERTION),'New assert-only leaf cannot shadow an issued Git source');
  const parent=await fs.realpath(os.tmpdir()),prefix='rr-a585-source-',root=await fs.mkdtemp(path.join(parent,prefix));
  assert.equal(path.dirname(root),parent);assert.equal(await fs.realpath(root),root);
  const owned=identity(await fs.lstat(root,{bigint:true}));
  let result,first,hasFirst=false;
  try{
    for(const file of files){const output=path.resolve(root,file);assert(inside(root,output));await fs.mkdir(path.dirname(output),{recursive:true});
      await fs.writeFile(output,await materializedBytes(file,index,gitReference),{flag:'wx',mode:0o600});}
    await exactTree(root,files,index,gitReference);
    const checked=await execute(process.execPath,[path.join(root,BUILDER),'--check'],{cwd:root,env:fixedEnv(),timeout:60000,maxBuffer:1024*1024});
    assert.equal(checked.stdout.trim(),'Exact account/statistics/assistant successor source verified; no installation or state admission.');
    const continuation=await import(pathToFileURL(path.join(root,T)).href);
    assert.equal(await continuation.ravScoreContinuationImplementationSha256({repositoryRoot:root}),
      'a0a5fa40385afb221dcb66e61b815453c11ee8c91f3e2d6581be0670cadc9299');
    const workflow=await import(pathToFileURL(path.join(root,'scripts/private-production-runtime-workflow.mjs')).href);
    assert.deepEqual(await workflow.privateRuntimeContractHashes({repositoryRoot:root}),RUNTIME_CONTRACTS,
      'Genuine fixed585 B/S persisted runtime contracts');
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
