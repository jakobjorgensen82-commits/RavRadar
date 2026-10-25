// TEST ONLY: genuine whole586/587 PG adapters/factories, in the SAME owned native
// PostgreSQL host as the preceding phases. No current successor-byte retagging.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';
import {requireAssistantLaterH0Output,requireAssistantPublic587SuccessorOutput} from './lib/assistant-later-h0-successor-source.mjs';
import {requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixedNativeSource(profile){
  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588,'FROZEN_NATIVE_UNKNOWN_PROFILE');
  const HEAD=profile.head,TREE=profile.tree;
const ADAPTER=profile.adapter,FACTORY='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
// TEST-only extension of the fixed genuine DATA producer host plus its exact native adapter.
// The native factory is separately whole-source/factory-hash bound. Every byte is
// genuine issued predecessor source; no NEXT producer/model input is changed.
const TEST_CLOSURE=Object.freeze([
  Object.freeze({file:ADAPTER,bytes:profile.adapterBytes,sha256:profile.adapterSha256}),
  Object.freeze({file:'scripts/lib/current-memory-warmup-postgres.mjs',bytes:21181,sha256:'2e1498b7603a6625d415a1aed8c042c73d747ddd408f4222bdb0e3aa6046e091'}),
  Object.freeze({file:'scripts/check-current-memory-warmup-predecessor-source.mjs',bytes:10404,sha256:'a201e4afb0da382623004d7717ca867d9a9b881ff107e7a30dd052a5b2a68989'}),
]);
const FAILURE_PHASES=new Set(['TEST_CLOSURE','ADAPTER_IMPORT','FACTORY_IMPORT','NATIVE_CALLBACK','CLEANUP']);
const FAILURE_CODES=new Set(['ERR_MODULE_NOT_FOUND','ENOENT','EACCES','EPERM','ERR_ASSERTION']);
function firstFailureDiagnostic(phase,error){
  // Best-effort observation is never authority and must not replace a raw
  // failure or prevent the real guarded cleanup, even for throwing getters.
  try{
    assert(FAILURE_PHASES.has(phase));
    console.error(JSON.stringify({kind:profile.failureKind,phase,
      code:FAILURE_CODES.has(error?.code)?error.code:'UNKNOWN',privatePayloadIncluded:false}));
  }catch{}
}
const execute=promisify(callbackExec),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{encoding,timeout:30000,maxBuffer:2*1024*1024,
  env:{...environment(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'}})).stdout;
const identity=stat=>{assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n&&stat.ino>0n);
  return [stat.dev,stat.ino,stat.birthtimeNs,stat.size];};
async function noLinks(file){let at=path.parse(file).root;for(const piece of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,piece);assert(!(await fs.lstat(at)).isSymbolicLink());}}
async function frozenFactory(sourceRoot,source){
  assert.equal(sha(source),profile.factorySourceSha256);
  const slice=(a,b)=>{assert.equal(source.split(a).length,2);assert.equal(source.split(b).length,2);
    assert(source.indexOf(a)<source.indexOf(b));return source.slice(source.indexOf(a),source.indexOf(b));};
  const factory=slice('const PART_COUNT =','const safeShape =')+slice('const samples =','const sourceDocument =');
  assert.equal(sha(factory),'832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2');
  const imports=[['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
    ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
    ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
    ['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
    ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],
    ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
    ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],
    ['ravScoreContinuationImplementationSha256','scripts/lib/ravscore-continuation-implementation-contract.mjs'],
    ['privateRuntimeContractHashes','scripts/private-production-runtime-workflow.mjs']];
  const sourceText="import crypto from 'node:crypto';\n"+imports.map(([names,file])=>
    'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(sourceRoot,file)).href)+';').join('\n')+'\n'+factory
    +'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,ravScoreModelBinding,candidateGRollbackModelBinding,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,privateRuntimeContractHashes};';
  const loaded=await import('data:text/javascript;base64,'+Buffer.from(sourceText).toString('base64'));
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,profile.integrated);
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,profile.candidate);
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,profile.continuation);
  return Object.freeze({...loaded,sourceHead:HEAD,sourceTree:TREE});
}
async function withSource(callback){
  profile.requireOutput(); // UNISSUED NEXT stops before Git, filesystem, factory or callback.
  assert.equal(arguments.length,1);assert.equal(typeof callback,'function');
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  for(const file of [...TEST_CLOSURE.map(row=>row.file),FACTORY])
    assert.match(String(await git(['ls-tree',HEAD,'--',file],'utf8')),/^100(?:644|755) blob [a-f0-9]{40}\t/);
  const leaves=await Promise.all(TEST_CLOSURE.map(async row=>{
    const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+row.file]));
    assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256);return{...row,raw};
  }));
  const factorySource=String(await git(['cat-file','blob',HEAD+':'+FACTORY],'utf8'));
  return profile.withSource(async sourceRoot=>{
    const staged=[];let result,first,hasFirst=false,phase='TEST_CLOSURE';
    try{
      for(const row of leaves){
        const target=path.join(sourceRoot,row.file);await noLinks(path.dirname(target));
        const present=await fs.lstat(target,{bigint:true}).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
        const record={target,raw:row.raw,owned:null};
        if(present){identity(present);assert.deepEqual(await fs.readFile(target),row.raw);staged.push(record);}
        else{
          await fs.writeFile(target,row.raw,{flag:'wx',mode:0o600});staged.push(record);
          record.owned=identity(await fs.lstat(target,{bigint:true}));
        }
      }
      phase='ADAPTER_IMPORT';const adapter=await import(pathToFileURL(path.join(sourceRoot,ADAPTER)).href);
      phase='FACTORY_IMPORT';const factory=await frozenFactory(sourceRoot,factorySource);
      phase='NATIVE_CALLBACK';
      result=await callback({adapter,factory,repositoryRoot:sourceRoot});
    }catch(error){first=error;hasFirst=true;firstFailureDiagnostic(phase,error);}
    try{
      for(const{target,raw,owned}of [...staged].reverse()){
        await noLinks(target);assert.deepEqual(await fs.readFile(target),raw);
        if(owned){assert.deepEqual(identity(await fs.lstat(target,{bigint:true})),owned);await fs.unlink(target);}
      }
    }catch(error){firstFailureDiagnostic('CLEANUP',error);if(!hasFirst){first=error;hasFirst=true;}}
    if(hasFirst)throw first;return result;
  });
}

  return withSource;
}
const FROZEN586=Object.freeze({
  head:'7df56f36f705db641b3f9476ee8ca1b4c4cfed0c',tree:'57192d6d5cfbd8709f3558ad8afaaf10dd6cafe0',
  adapter:'scripts/lib/native-original-continuity-postgres.mjs',adapterBytes:24209,
  adapterSha256:'6690b4abd7f75c8011f4646c60236a0f88ab2563477b2dce76bcdadbaa0c27b6',
  factorySourceSha256:'8111a107b16ffdf6fdc9b2b5d50be837b18105da0b1f9e2aec4988b345640bce',
  candidate:'eb042ae79b64df21537421283a0d62d39af22c2d1a38707e530970af6bc7c8dd',
  integrated:'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805',
  continuation:'d2d93920aacc4be877da22c7b9e31e21426e647227a2c5018ee14b3a267500c7',
  withSource:withAuthenticated586PredecessorSource,requireOutput:requireAssistantLaterH0Output,
  failureKind:'FROZEN586_NATIVE_FIRST_FAILURE'});
const FROZEN587=Object.freeze({
  head:'aab72babd27175a4276c2a2f1965c74bb021b4af',tree:'959f63d40c3980e804caa750da227cbd96e34a49',
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:22564,
  adapterSha256:'51f12b62222bd998362186456323685ee52f26d3b6af38823428850acb4c20da',
  factorySourceSha256:'e87ee5406f02681e6c5a6848ed8481e11168088d0799f7b399bfe7715edf17b0',
  candidate:'5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4',
  integrated:'5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2',
  continuation:'cd3a3648ad5093662871559aa39d77671eda27edf1f9edc82a104c5430a43a21',
  withSource:withAuthenticated587PredecessorSource,requireOutput:requireAssistantPublic587SuccessorOutput,
  failureKind:'FROZEN587_NATIVE_FIRST_FAILURE'});
// Genuine actual588 CODE factory only. Runtime B/S is never fabricated here.
// This must remain pinned to the separately selected fixed588 DATA code source.
const FROZEN588=Object.freeze({
  head:'4845e6c6622333ad4e8454b0b43f5f94ae42233e',tree:'30e8fd7994c3a625b55f6798fc0d268589bb4cfb',
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:25199,
  adapterSha256:'c8bafe6b5fe7ebed8d46eb24a4ccf778d2382f05cb0737bf7eb2335acf0281b0',
  factorySourceSha256:'3c702f489f632eada501d978502015e9b2f307867c9f3697c1707ddd2f3da4c0',
  candidate:'00905533cd243ffce8e507beedbc39c8dba26e635b59fa154e6f9ab20575780c',
  integrated:'5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac',
  continuation:'d98559d56d7bfe9b141cf1ddab73cddffb688a3b6766f5f9f3779b226f573701',
  withSource:withAuthenticated588PredecessorSource,requireOutput:requireSourceProducerOutput,
  failureKind:'FROZEN588_NATIVE_FIRST_FAILURE'});
const native586=fixedNativeSource(FROZEN586),native587=fixedNativeSource(FROZEN587),native588=fixedNativeSource(FROZEN588);
export async function withFrozen586CheckpointPostgresSource(callback){
  return native586(...arguments);
}
export async function withFrozen587CheckpointPostgresSource(callback){
  return native587(...arguments);
}
export async function withFrozen588CheckpointPostgresSource(callback){
  return native588(...arguments);
}
