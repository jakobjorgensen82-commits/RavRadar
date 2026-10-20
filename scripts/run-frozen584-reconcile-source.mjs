// TEST ONLY. Genuine issued584 fixture/caller above the unchanged127-leaf host.
// No current585 tuple retag, SQL simulation or production admission.
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
const FIXTURE='scripts/test-reconcile-private-runtime-checkpoint.mjs';
const EXTENSION=Object.freeze([
 ['scripts/check-last-mile-enclosure-predecessor-source.mjs','cc241074b53b2a59c0f37585824b9977929ebbd9',13644,'ab211de90959b87ca342a7db803a43f4ed90fe97d6a37ea648314c75c53337c3'],
 ['scripts/check-production-target-freshness.mjs','629f94790599243d0ba73e963584b8226f2fa5b3',3899,'a4c3cf8417a761691173ee50970b2764dac8a58d97017da783c1c2aed5dab0c0'],
 ['scripts/lib/established-native-current-origin-test-transports.mjs','d5aa1d2ed7f9abd70dc3295a22217df163e28ead',5574,'c681a9f57771a66ab6f201142516446e4a8b0a47c1d6ec76a90a2c5013e59552'],
 ['scripts/lib/last-mile-enclosure-predecessor-source-inventory.json','17b683ed7c2e810f5f73461f2ff74236f9561a45',46197,'8a35db217041ddfb2f14fb2da76b09af427367989ec67bad7a4fef72d34c0e45'],
 ['scripts/run-frozen-established-native-current-origin-source-targets.mjs','ebaa0dcf017f83e9a42cc51a4a24e1793d200cbd',11203,'5cccc50307b84a52dd1d2af304076be3b7bdd4c714cd32ca58708017c70ad787'],
 ['scripts/lib/established-native-current-origin-source-target-inventory.json','cb077381e3fb3caba4e38686c397b4093c059697',43469,'d20f82536e630f2fc92a9680a199b214542d90ba1950d05c444ea0801b50e0f8'],
 ['scripts/reconcile-private-runtime-checkpoint.mjs','29f826e50cd22e60c85e11d088665c9e5ab2e9a6',19652,'ec7e0f195df6d7cc6adad00de94f0a930cd81ebd1e1a219ebf6e60aad4b7f7fa'],
].map(Object.freeze));
const execute=promisify(callbackExec),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const env=()=>({...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
 .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
 GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{encoding,env:env(),timeout:30000,maxBuffer:2*1024*1024})).stdout;
const identity=s=>{assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n&&s.ino>0n);return[s.dev,s.ino,s.birthtimeNs,s.size];};
async function noLinks(file){let at=path.parse(file).root;for(const piece of path.relative(at,file).split(path.sep).filter(Boolean)){
 at=path.join(at,piece);assert(!(await fs.lstat(at)).isSymbolicLink());}}
async function fixtureFactory(sourceRoot,source){
 assert.equal(sha(source),'dfa4cdd570fe1ebc7571b6cca07024a9aa843b9486a17a9fa49528c561899f48');
 const slice=(a,b)=>{assert.equal(source.split(a).length,2);assert.equal(source.split(b).length,2);
  assert(source.indexOf(a)<source.indexOf(b));return source.slice(source.indexOf(a),source.indexOf(b));};
 const utilities=slice('const sha = value =>',"test('normal CURRENT B/S interruption reconciliation preserves whole pairs and refuses ambiguity', async t => {");
 const setup=slice("  const own = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-paired-publication-test-'));",
  "  await t.test('pre-B failure leaves exact old pair; matched S has no write or version bump', async () => {");
 assert.equal(sha(utilities),'2825947d5ef3a12bcf448a19fb8252f1a68bc11f5e3a4678a16835214552d12a');
 assert.equal(sha(setup),'bcd4724d20f315d6ec74ad6a5b3e74fa39c8514a580c9fb09caca854dd6d9afc');
 const imports=[
  ['normalBAndSTransports','scripts/lib/established-native-current-origin-test-transports.mjs'],
  ['withFrozenEstablishedNativeCurrentOriginPostgresSource','scripts/run-frozen-established-native-current-origin-source-targets.mjs'],
  ['reconcilePrivateRuntimeCheckpoint','scripts/reconcile-private-runtime-checkpoint.mjs'],
  ['PRIVATE_RUNTIME_FILES,PRIVATE_RUNTIME_CONTRACT_FILES,buildPrivateRuntimeCreateSpec,buildPrivateRuntimeExpectation,installRestoredPrivateRuntime','scripts/private-production-runtime-workflow.mjs'],
  ['createPrivateProductionRuntimeBundle,restorePrivateProductionRuntimeBundle','scripts/private-production-runtime-bundle.mjs'],
  ['publishProtectedPrivateProductionRuntime,restoreProtectedPrivateProductionRuntime','scripts/protected-private-production-runtime.mjs'],
  ['saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],
  ['publishProtectedRavScoreContinuationCheckpoint,createProtectedRavScoreCheckpointRequester,createProtectedRavScoreCheckpointVersionRequester,createProtectedRavScoreCheckpointRpcRequester','scripts/protected-ravscore-continuation-checkpoint.mjs'],
  ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
  ['ravScoreModelBinding as candidateBinding','scripts/rollback-assets/ravscore-model-contract.js'],
  ['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
  ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
  ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
  ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs']];
 const text="import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';\n"
  +imports.map(([names,file])=>'import{'+names+'}from '+JSON.stringify(pathToFileURL(path.join(sourceRoot,file)).href)+';').join('\n')
  +'\nconst ROOT='+JSON.stringify(sourceRoot)+';\n'+utilities
  +'\nexport async function prepare(t){\n'+setup+'\nreturn{saved,run,publishB,publishS,normalBAndSTransports,withFrozenEstablishedNativeCurrentOriginPostgresSource};}\n';
 const factory=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
 return factory;
}
export async function withFrozen584ReconcileFixture(t,callback){
 assert.equal(arguments.length,2);assert.equal(typeof t?.after,'function');assert.equal(typeof callback,'function');
 assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
 const leaves=[];for(const[file,blob,size,hash]of EXTENSION){
  assert.equal(String(await git(['ls-tree',HEAD,'--',file],'utf8')).trim(),'100644 blob '+blob+'\t'+file);
  const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+file]));assert.equal(raw.length,size);assert.equal(sha(raw),hash);leaves.push({file,raw});}
 assert.match(String(await git(['ls-tree',HEAD,'--',FIXTURE],'utf8')),/^100644 blob 47c2c216ac5e0883c52291bfccf237d5f6f2c75b\t/);
 const source=String(await git(['cat-file','blob',HEAD+':'+FIXTURE],'utf8'));
 const gitDirectory=path.resolve(String(await git(['rev-parse','--absolute-git-dir'],'utf8')).trim());await noLinks(gitDirectory);
 assert.equal(await fs.realpath(gitDirectory),gitDirectory);const stat=await fs.lstat(gitDirectory,{bigint:true});
 assert(stat.isDirectory());const gitIdentity=[stat.dev,stat.ino,stat.birthtimeNs];
 return withAuthenticated584PredecessorSource(async sourceRoot=>{
  const added=[];let result,first,hasFirst=false;
  try{
   for(const{file,raw}of[...leaves,{file:'.git',raw:Buffer.from('gitdir: '+gitDirectory.split(path.sep).join('/')+'\n')}]){
    const target=path.join(sourceRoot,file);await noLinks(path.dirname(target));
    await assert.rejects(fs.lstat(target),{code:'ENOENT'});await fs.writeFile(target,raw,{flag:'wx',mode:0o600});
    added.push({target,raw,identity:identity(await fs.lstat(target,{bigint:true}))});}
   const factory=await fixtureFactory(sourceRoot,source),fixture=await factory.prepare(t);
   const expected=JSON.parse(await fs.readFile(fixture.saved[1].checkpointPath,'utf8'));
   assert.equal(expected.modelBinding.modelBundleSha256,'bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947');
   assert.equal(expected.continuationStateContractSha256,'7532755a43f8bb2ccc125efa3aa747ed03365b720d13addfcdb91ce4b74d908c');
   result=await callback(fixture);
  }catch(error){first=error;hasFirst=true;}
  try{
   await noLinks(gitDirectory);const fresh=await fs.lstat(gitDirectory,{bigint:true});assert.deepEqual([fresh.dev,fresh.ino,fresh.birthtimeNs],gitIdentity);
   for(const row of added){await noLinks(row.target);assert.deepEqual(identity(await fs.lstat(row.target,{bigint:true})),row.identity);assert.deepEqual(await fs.readFile(row.target),row.raw);}
   for(const row of [...added].reverse())await fs.unlink(row.target);
  }catch(error){if(!hasFirst){first=error;hasFirst=true;}}
  if(hasFirst)throw first;return result;
 });
}
