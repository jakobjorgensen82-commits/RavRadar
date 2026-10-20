// TEST ONLY: genuine whole584 PG adapter/factory, in the SAME owned native
// PostgreSQL host as the preceding phases. No current585-byte retagging.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated584PredecessorSource} from './check-account-statistics-assistant-predecessor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HEAD='ee029982538c67dea39880bc7b33f3508c10cf9c',TREE='400babda9377e43ea7ee1444008f7accd1aded32';
const ADAPTER='scripts/lib/last-mile-enclosure-postgres.mjs',FACTORY='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
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
  assert.equal(sha(source),'949a332c33073fdd2d9e01238241c9b8bfb6f877414ff7765d835759074dd736');
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
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,'bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947');
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,'47a27aec034d8d7cbab7755a19025d796b6fe51c2b276676c7309c912a85f501');
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,'7532755a43f8bb2ccc125efa3aa747ed03365b720d13addfcdb91ce4b74d908c');
  return Object.freeze({...loaded,sourceHead:HEAD,sourceTree:TREE});
}
export async function withFrozen584CheckpointPostgresSource(callback){
  assert.equal(arguments.length,1);assert.equal(typeof callback,'function');
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  for(const file of [ADAPTER,FACTORY])assert.match(String(await git(['ls-tree',HEAD,'--',file],'utf8')),/^100(?:644|755) blob [a-f0-9]{40}\t/);
  const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+ADAPTER]));
  assert.equal(raw.length,22604);assert.equal(sha(raw),'ce41dc273b2fbf82f0bfd3b8fa0883c0212fd0c51a6ff05fb3017c46cb0c357b');
  const factorySource=String(await git(['cat-file','blob',HEAD+':'+FACTORY],'utf8'));
  return withAuthenticated584PredecessorSource(async sourceRoot=>{
    const target=path.join(sourceRoot,ADAPTER);await noLinks(path.dirname(target));
    const present=await fs.lstat(target).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    let owned=null,result,first;
    try{
      if(present){assert(present.isFile()&&!present.isSymbolicLink());assert.deepEqual(await fs.readFile(target),raw);}
      else{await fs.writeFile(target,raw,{flag:'wx',mode:0o600});owned=identity(await fs.lstat(target,{bigint:true}));}
      const adapter=await import(pathToFileURL(target).href),factory=await frozenFactory(sourceRoot,factorySource);
      result=await callback({adapter,factory,repositoryRoot:sourceRoot});
    }catch(error){first=error;}
    try{
      await noLinks(target);assert.deepEqual(await fs.readFile(target),raw);
      if(owned){assert.deepEqual(identity(await fs.lstat(target,{bigint:true})),owned);await fs.unlink(target);}
    }catch(error){first=first?new AggregateError([first,error],'Frozen584 PG source failed; preserve unknown files'):error;}
    if(first)throw first;return result;
  });
}
