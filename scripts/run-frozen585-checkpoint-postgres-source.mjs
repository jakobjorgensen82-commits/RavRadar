// TEST ONLY: genuine whole585 PG adapter/factory, in the SAME owned native
// PostgreSQL host as the preceding phases. No current SOURCE-byte retagging.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated585PredecessorSource} from './check-source-producer-predecessor-source.mjs';
import {requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HEAD='e8f9f7197d9e262720b7627b4970d3da82baa9d9',TREE='24dbf944916031ea256537b125966e946efeead8';
const ADAPTER='scripts/lib/account-statistics-assistant-postgres.mjs',FACTORY='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
// TEST-only extension of the unchanged133-leaf DATA producer host plus this exact native adapter. The native factory is separately whole-source/factory-hash bound. Every byte is
// genuine issued585 source; no current producer/model input is changed.
const TEST_CLOSURE=Object.freeze([
  Object.freeze({file:ADAPTER,bytes:23300,sha256:'a889abaa42cb2eaeacda7a1e45d7469808d66fad410d2fc350be9b33201c267b'}),
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
    console.error(JSON.stringify({kind:'FROZEN585_NATIVE_FIRST_FAILURE',phase,
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
  assert.equal(sha(source),'3fd7faabf11eadc46d0bc4dbbce0253fbbab882805abedfe6ef5c68c02fb2b3f');
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
    ['ravScoreContinuationImplementationSha256','scripts/lib/ravscore-continuation-implementation-contract.mjs']];
  const sourceText="import crypto from 'node:crypto';\n"+imports.map(([names,file])=>
    'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(sourceRoot,file)).href)+';').join('\n')+'\n'+factory
    +'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,ravScoreModelBinding,candidateGRollbackModelBinding,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256};';
  const loaded=await import('data:text/javascript;base64,'+Buffer.from(sourceText).toString('base64'));
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,'31bbb9a98f4df93804a9d4bcdff50fe5e9b1c880e04492d2c596079488a6bfa2');
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,'2f5f28044ae88fccbcad4a9d21943b986aabcdd8be1ae607d5e79d0a8947925f');
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,'a0a5fa40385afb221dcb66e61b815453c11ee8c91f3e2d6581be0670cadc9299');
  return Object.freeze({...loaded,sourceHead:HEAD,sourceTree:TREE});
}
export async function withFrozen585CheckpointPostgresSource(callback){
  requireSourceProducerOutput(); // Unissued SOURCE stops before Git, filesystem, factory or callback.
  assert.equal(arguments.length,1);assert.equal(typeof callback,'function');
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  for(const file of [...TEST_CLOSURE.map(row=>row.file),FACTORY])
    assert.match(String(await git(['ls-tree',HEAD,'--',file],'utf8')),/^100(?:644|755) blob [a-f0-9]{40}\t/);
  const leaves=await Promise.all(TEST_CLOSURE.map(async row=>{
    const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+row.file]));
    assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256);return{...row,raw};
  }));
  const factorySource=String(await git(['cat-file','blob',HEAD+':'+FACTORY],'utf8'));
  return withAuthenticated585PredecessorSource(async sourceRoot=>{
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
