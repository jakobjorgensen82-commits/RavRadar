// TEST ONLY: genuine LOCAL587 PG adapter/factory, in the SAME owned native
// PostgreSQL host as the preceding phases. No current successor-byte retagging.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated587PredecessorSource} from './check-source-producer-587-predecessor-source.mjs';
import {requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HEAD='c03a4f8dc106e535db61d6248cb395a1a96b9b88',TREE='42b345259142d5451386d56184374ce380c5ddd5';
const ADAPTER='scripts/lib/assistant-later-h0-postgres.mjs',FACTORY='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
// TEST-only extension of the fixed genuinec03 DATA producer host plus this exact native adapter.
// The native factory is separately whole-source/factory-hash bound. Every byte is
// genuine c03 local587 source, not installation proof; no NEXT producer/model input is changed.
const TEST_CLOSURE=Object.freeze([
  Object.freeze({file:ADAPTER,bytes:22564,sha256:'51f12b62222bd998362186456323685ee52f26d3b6af38823428850acb4c20da'}),
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
    console.error(JSON.stringify({kind:'FROZEN587_NATIVE_FIRST_FAILURE',phase,
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
  assert.equal(sha(source),'e87ee5406f02681e6c5a6848ed8481e11168088d0799f7b399bfe7715edf17b0');
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
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,'5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2');
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,'5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4');
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,'cd3a3648ad5093662871559aa39d77671eda27edf1f9edc82a104c5430a43a21');
  return Object.freeze({...loaded,sourceHead:HEAD,sourceTree:TREE});
}
export async function withFrozen587CheckpointPostgresSource(callback){
  requireSourceProducerOutput(); // UNISSUED NEXT stops before Git, filesystem, factory or callback.
  assert.equal(arguments.length,1);assert.equal(typeof callback,'function');
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  for(const file of [...TEST_CLOSURE.map(row=>row.file),FACTORY])
    assert.match(String(await git(['ls-tree',HEAD,'--',file],'utf8')),/^100(?:644|755) blob [a-f0-9]{40}\t/);
  const leaves=await Promise.all(TEST_CLOSURE.map(async row=>{
    const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+row.file]));
    assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256);return{...row,raw};
  }));
  const factorySource=String(await git(['cat-file','blob',HEAD+':'+FACTORY],'utf8'));
  return withAuthenticated587PredecessorSource(async sourceRoot=>{
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
