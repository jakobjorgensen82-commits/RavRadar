// TEST ONLY: genuine whole586/587 PG adapters/factories, in the SAME owned native
// PostgreSQL host as the preceding phases. No current successor-byte retagging.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,
  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,
  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,
  withAuthenticated591PredecessorSource,assertFrozen591CodeSourceSelected,FROZEN591_CODE_SOURCE_PROVENANCE} from './check-assistant-later-h0-predecessor-source.mjs';
import {FROZEN593_NATIVE_CODE,withInstalled593CodePredecessorSource} from './check-installed593-code-predecessor-source.mjs';
import {requireInstalled593Original591Output,requireAssistantLaterH0Output,requireAssistantPublic587SuccessorOutput,requireAssistantPublic588SuccessorOutput,requireAssistantPublic590SuccessorOutput,requireAssistantPublic591SuccessorOutput} from './lib/assistant-later-h0-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixedNativeSource(profile){
  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===FROZEN593,'FROZEN_NATIVE_UNKNOWN_PROFILE');
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
  if(profile===FROZEN591)assertFrozen591CodeSourceSelected();
  if(profile===FROZEN590)assertFrozen590CodeSourceSelected();
  if(profile===FROZEN588)assertFrozen588CodeSourceSelected();
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
// Ægte588 adapter/factory i separat kildekontekst; ingen child-retagging.
const FROZEN588=Object.freeze({
  head:FROZEN588_CODE_SOURCE_PROVENANCE.head,tree:FROZEN588_CODE_SOURCE_PROVENANCE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:25199,
  adapterSha256:'c8bafe6b5fe7ebed8d46eb24a4ccf778d2382f05cb0737bf7eb2335acf0281b0',
  factorySourceSha256:'3c702f489f632eada501d978502015e9b2f307867c9f3697c1707ddd2f3da4c0',
  candidate:'00905533cd243ffce8e507beedbc39c8dba26e635b59fa154e6f9ab20575780c',
  integrated:'5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac',
  continuation:'d98559d56d7bfe9b141cf1ddab73cddffb688a3b6766f5f9f3779b226f573701',
  withSource:withAuthenticated588PredecessorSource,requireOutput:requireAssistantPublic588SuccessorOutput,
  failureKind:'FROZEN588_NATIVE_FIRST_FAILURE'});
// Whole actual590 adapter/factory pins must come from the chosen genuine parent.
const FROZEN590=Object.freeze({
  head:FROZEN590_CODE_SOURCE_PROVENANCE.head,tree:FROZEN590_CODE_SOURCE_PROVENANCE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:26650,adapterSha256:'2f0b4fccd95b0109904e62490fffaeebf8bef78d47817c3fb22bb860a30fd41d',factorySourceSha256:'16d3eaaa236b352a345a9b599c2e297fedc022a24aec91f2eb1ef9e3e47b8124',
  candidate:'bca59cb435cb3f35041c665d2954f0ef04b189b572219771fc5628e4f7ccb551',
  integrated:'4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819',
  continuation:'d444e6141038f56dd04b97a55eefe07bbd98f122fb3b76a43bdddacff2d88c8a',
  withSource:withAuthenticated590PredecessorSource,requireOutput:requireAssistantPublic590SuccessorOutput,
  failureKind:'FROZEN590_NATIVE_FIRST_FAILURE'});
// Genuine issued591 PG adapter/factory; the new592 phase remains a separate normal caller.
const FROZEN591=Object.freeze({
  head:FROZEN591_CODE_SOURCE_PROVENANCE.head,tree:FROZEN591_CODE_SOURCE_PROVENANCE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:28147,
  adapterSha256:'4c1ab023207c1a2c2f3962df262330fed265c5d8353b5e514a9e673ca2fe3ce6',
  factorySourceSha256:'38154b4dc8ee862c905d0627dc0687bc981ac701a82b23a9e3f8de39dec131a4',
  candidate:'38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',
  integrated:'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54',
  continuation:'b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d',
  withSource:withAuthenticated591PredecessorSource,requireOutput:requireAssistantPublic591SuccessorOutput,
  failureKind:'FROZEN591_NATIVE_FIRST_FAILURE'});
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

const native590=fixedNativeSource(FROZEN590);
export async function withFrozen590CheckpointPostgresSource(callback){
  return native590(...arguments);
}

const native591=fixedNativeSource(FROZEN591);
export async function withFrozen591CheckpointPostgresSource(callback){
  return native591(...arguments);
}

// Genuine installed593 code executes its own complete native phase before594.
// Its synthetic native fixtures are never production B/S or origin authority.
const FROZEN593=Object.freeze({
  head:FROZEN593_NATIVE_CODE.head,tree:FROZEN593_NATIVE_CODE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:29689,
  adapterSha256:'f0db482f36685c2c05c34fd53ff6b55e683d5c9fa71a86bd4e81e8395f4b22eb',
  factorySourceSha256:'59aa19878b924401001120ca5ddccf9433399445a7ccdac37816c88c44d5fa33',
  candidate:'12f78005304316a680716a1d437e06a582815c1645a2eb567028bcc18ff99ffa',
  integrated:'69bf81c3cc5e256deee2c116a52462597f4cfc47cb6c855c6dba969c1dcf4643',
  continuation:'e894dd096d03f71cc334d97f85931c2b3969e9b140cb5403a4787cf4b81fbc2e',
  withSource:withInstalled593CodePredecessorSource,requireOutput:requireInstalled593Original591Output,
  failureKind:'FROZEN593_NATIVE_FIRST_FAILURE'});
const native593=fixedNativeSource(FROZEN593);
export async function withFrozen593CheckpointPostgresSource(callback){
  return native593(...arguments);
}
