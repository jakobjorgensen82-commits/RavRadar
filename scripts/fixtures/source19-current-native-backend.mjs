// PRIVATE normal CURRENT test metadata. No owner, model, profile or SQL issuer.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {requireSourceProducerOutput,SOURCE_PRODUCER_BEFORE} from '../lib/source-producer-current-native-profile.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BINDING as LEGACY585_BINDING} from '../lib/account-statistics-assistant-successor-source.mjs';
import {RAVSCORE_CONTINUATION_CHECKPOINT_POLICY} from '../ravscore-continuation-checkpoint.mjs';
import {verifyIntegratedDatabaseReadback} from '../integrated-cutover-readiness.mjs';
import {resolveOperationalRavScoreModel,operationalResolvedBindingCurrent,
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY as OPERATION,
  RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY as PROFILE} from '../ravscore-operational-activation.mjs';
import {PROTECTED_PRIVATE_RUNTIME_POLICY as POLICY} from '../protected-private-production-runtime.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fail=code=>{throw Error('SOURCE_CURRENT_PROFILE_'+code);};
const head=()=>execFileSync('git',['-C',ROOT,'rev-parse','HEAD'],{encoding:'utf8'}).trim();




// Expected CI identity is data, never a completed source/native authority.
// Only this outer prerequisite reader gets the existing read-only CI token.


// Exact594 DATA-prefix request input for the SAME normal native PG/protocol.
// CODE598 and the actual SOURCE executor remain distinct roles.
const CURRENT598_PREFIX_CODE=Object.freeze({head:'bd9cf518fe798ddea45d2b835f324f6e2bea06fc',
  tree:'2f71c562eea774ca03996802f83bdad7cccd43cc',
  I:'f8d8befa7ecda82f8194c0ca04142bd89f5c39e92ed37cda70afca8dded108d1',
  C:'239ac83f1df6050438243068bba5d942c4e88a921d0b70d611a12f0c798d3f5a',
  T:'035008731e6fac3fca396110b3d0ff3486e4854baa99bd691e2a7ea541191579'});

export async function qualify(){
  requireSourceProducerOutput();
  let text='';for await(const chunk of process.stdin){text+=chunk;if(Buffer.byteLength(text)>48*1024*1024)fail('INPUT_BOUND');}
  const {pg,inputs}=JSON.parse(text);
  assert.equal(inputs.profile,'current-source-native');assert.equal(inputs.sourceHead,head());
  assert.equal(inputs.registry.zoneCount,210);assert.equal(inputs.registry.partCount,673);
  // These objects came from ACTUAL SQL in the same normal native host.
  // The normal verifier, not a handwritten current-family result, qualifies them.
  await verifyIntegratedDatabaseReadback({url:'https://current-native-pg.invalid',serviceRoleKey:'SYNTHETIC_TEST_ONLY',
    sourcePhase:'source-producer-after597',
    fetchImpl:async(input,options)=>{
      const url=new URL(input);assert.equal(url.origin,'https://current-native-pg.invalid');
      assert.equal(options.method,'POST');
      const name=url.pathname.split('/').at(-1);
      assert(['ravradar_integrated_cutover_contract','ravradar_ravscore_checkpoint_contract'].includes(name));
      assert.deepEqual(JSON.parse(options.body),name==='ravradar_integrated_cutover_contract'?pg.rpcBody:{});
      return new Response(JSON.stringify(name==='ravradar_integrated_cutover_contract'?pg.integrated:pg.checkpoint),{status:200});
    }});
  const operation=pg.admin.find(row=>row.document_key===OPERATION),profile=pg.admin.find(row=>row.document_key===PROFILE);
  assert(operation&&profile);for(const row of [operation,profile])assert(Number.isSafeInteger(Number(row.version))&&Number(row.version)>0);
  const resolved=resolveOperationalRavScoreModel(operation,{profileRow:profile});
  assert.equal(resolved.model,'integrated');assert.equal(resolved.pending,false);
  assert.equal(resolved.initialCutoverRequired,false);assert.equal(resolved.legacySourceRequired,false);
  // Never construct a replacement activation/profile row to make this pass.
  return {operationalAction:operationalResolvedBindingCurrent(resolved)?'integrated':'integrated-historical-maintenance',
    bucket:{id:POLICY.bucketId,name:POLICY.bucketId,public:false,
      file_size_limit:POLICY.maximumArchiveBytes,allowed_mime_types:[POLICY.mimeType]},
    checkpointMaximumSerializedBytes:RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes,
    sameHostPgReadbackQualified:true,sourceOwnerIssued:false,productionProof:false};
}

export async function rpcRequest(initial=false){
  requireSourceProducerOutput();
  let bindings={},verifier=verifyIntegratedDatabaseReadback,sourcePhase='source-producer-after597';
  if(initial){
    const source=path.join(path.dirname(ROOT),'current-source-native-initial-inputs/normal-initial-operative585');
    assert.equal(path.basename(ROOT),'current-source-native');
    assert.match(path.basename(path.dirname(ROOT)),/^rr-source19-union-native-/);
    for(let at=source;;at=path.dirname(at)){assert(!(await fs.lstat(at)).isSymbolicLink());if(at===path.dirname(at))break;}
    assert.equal(await fs.realpath(source),source);
    assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),'e7c2e14a6403870e8a1df6c91862980640684733');
    assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),'10799761addcd1976055d9051bc5062f02eaf9f6');
    const I=(await import(pathToFileURL(path.join(source,'js/core/ravscore-model-contract.js')).href)).ravScoreModelBinding();
    const C=(await import(pathToFileURL(path.join(source,'scripts/rollback-assets/ravscore-model-contract.js')).href)).ravScoreModelBinding();
    assert.equal(I.modelBundleSha256,LEGACY585_BINDING.I);assert.equal(C.modelBundleSha256,LEGACY585_BINDING.C);
    bindings={modelBinding:I,candidateModelBinding:C};
    verifier=(await import(pathToFileURL(path.join(source,'scripts/integrated-cutover-readiness.mjs')).href)).verifyIntegratedDatabaseReadback;
    sourcePhase='account-statistics-assistant'; // Actual archived585 normal schema, never currentSOURCE/594.
  }
  const sentinel=Object.freeze({}),seen=[];
  try{await verifier({url:'https://current-native-pg.invalid',serviceRoleKey:'SYNTHETIC_TEST_ONLY',
    sourcePhase,...bindings,fetchImpl:async(input,options)=>{
      assert.equal(input,'https://current-native-pg.invalid/rest/v1/rpc/ravradar_integrated_cutover_contract');
      assert.equal(options.method,'POST');seen.push(JSON.parse(options.body));throw sentinel;
    }});}catch(error){if(error!==sentinel)throw error;}
  assert.equal(seen.length,1);
  return {integratedRequestBody:seen[0],sqlExecuted:false,
    bucket:{id:POLICY.bucketId,name:POLICY.bucketId,public:false,
      file_size_limit:POLICY.maximumArchiveBytes,allowed_mime_types:[POLICY.mimeType]},
    checkpointMaximumSerializedBytes:RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes};
}

export async function current598InitialRpcRequest(){
  requireSourceProducerOutput(); // BEFORE paths/data/Git/model access.
  assert.equal(process.platform,'linux');assert.equal(process.versions.node.split('.')[0],'24');
  assert.equal(path.basename(ROOT),'current-source-native');
  const own=path.dirname(ROOT);assert.match(path.basename(own),/^rr-source19-union-native-/);
  const work=path.join(own,'current598-native-inputs'),source=path.join(work,'normal-genuine598');
  const input=path.join(work,'transport/current598-prefix-inputs.json');
  for(const file of [ROOT,source,input])for(let at=file;;at=path.dirname(at)){
    assert(!(await fs.lstat(at)).isSymbolicLink());if(at===path.dirname(at))break;}
  assert.equal(await fs.realpath(source),source);assert.equal(await fs.realpath(input),input);
  const stat=await fs.lstat(input);assert(stat.isFile()&&stat.nlink===1&&stat.size>0&&stat.size<=32*1024*1024);
  const raw=await fs.readFile(input),prefix=JSON.parse(raw),executionHead=head();
  assert.equal(prefix.schemaVersion,1);assert.equal(prefix.profile,'current598-native-prefix');
  assert.equal(prefix.sourceHead,CURRENT598_PREFIX_CODE.head);assert.equal(prefix.executionHead,executionHead);
  assert.equal(prefix.sourceRoot,source);assert.equal(prefix.saved598.sourceHead,CURRENT598_PREFIX_CODE.head);
  assert.equal(prefix.registry.zoneCount,210);assert.equal(prefix.registry.partCount,673);
  assert.equal(prefix.actionInvoked,false);assert.equal(prefix.sdkInvoked,false);assert.equal(prefix.sourceOwnerIssued,false);
  const fixedGit=args=>execFileSync('git',['-c','protocol.allow=never','-C',source,...args],{
    encoding:'utf8',maxBuffer:4*1024*1024,timeout:30000,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'}}).trim();
  assert.equal(fixedGit(['rev-parse','HEAD']),CURRENT598_PREFIX_CODE.head);
  assert.equal(fixedGit(['rev-parse','HEAD^{tree}']),CURRENT598_PREFIX_CODE.tree);
  assert.equal(fixedGit(['diff','--name-only','HEAD','--','scripts','js','.github','package.json','package-lock.json']),'');
  const I=(await import(pathToFileURL(path.join(source,'js/core/ravscore-model-contract.js')).href)).ravScoreModelBinding();
  const C=(await import(pathToFileURL(path.join(source,'scripts/rollback-assets/ravscore-model-contract.js')).href)).ravScoreModelBinding();
  const workflow=await import(pathToFileURL(path.join(source,'scripts/private-production-runtime-workflow.mjs')).href);
  const contracts=await workflow.privateRuntimeContractHashes({repositoryRoot:source});
  assert.equal(I.modelBundleSha256,CURRENT598_PREFIX_CODE.I);assert.equal(C.modelBundleSha256,CURRENT598_PREFIX_CODE.C);
  assert.equal(contracts.continuationStateContractSha256,CURRENT598_PREFIX_CODE.T);
  assert.equal(SOURCE_PRODUCER_BEFORE.I,I.modelBundleSha256);assert.equal(SOURCE_PRODUCER_BEFORE.C,C.modelBundleSha256);
  assert.equal(SOURCE_PRODUCER_BEFORE.T,contracts.continuationStateContractSha256);
  assert.deepEqual(prefix.saved598.modelBinding,I);assert.deepEqual(prefix.saved598.contractHashes,contracts);
  // Reuse rpcRequest's normal verifier/request capture seam. No SQL is executed
  // or database readback claimed by capturing its first request with a sentinel.
  const sentinel=Object.freeze({}),seen=[];
  const frozenReadiness=await import(pathToFileURL(path.join(source,'scripts/integrated-cutover-readiness.mjs')).href);
  try{await frozenReadiness.verifyIntegratedDatabaseReadback({url:'https://current-native-pg.invalid',serviceRoleKey:'SYNTHETIC_TEST_ONLY',
    sourcePhase:'assistant-mixed-after597-successor',modelBinding:I,candidateModelBinding:C,fetchImpl:async(url,options)=>{
      assert.equal(url,'https://current-native-pg.invalid/rest/v1/rpc/ravradar_integrated_cutover_contract');
      assert.equal(options.method,'POST');seen.push(JSON.parse(options.body));throw sentinel;
    }});}catch(error){if(error!==sentinel)throw error;}
  assert.equal(seen.length,1);assert.equal(Object.keys(seen[0]).length,22);
  assert(Object.entries(seen[0]).every(([key,value])=>/^p_[a-z0-9_]+$/.test(key)&&typeof value==='string'));
  assert.deepEqual(await fs.readFile(input),raw,'Retain original prefix input, never author an activation row');
  return {profile:'current598-native-prefix',dataProducerHead:CURRENT598_PREFIX_CODE.head,dataCodeTree:CURRENT598_PREFIX_CODE.tree,
    executionHead,integratedRequestBody:seen[0],sqlExecuted:false,sameHostPgReadbackQualified:false,
    bucket:{id:POLICY.bucketId,name:POLICY.bucketId,public:false,
      file_size_limit:POLICY.maximumArchiveBytes,allowed_mime_types:[POLICY.mimeType]},
    checkpointMaximumSerializedBytes:RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes,
    sourceOwnerIssued:false,productionProof:false};
}
