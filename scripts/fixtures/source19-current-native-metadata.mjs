// PRIVATE normal CURRENT test metadata. No owner, model, profile or SQL issuer.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {requireSourceProducerOutput,SOURCE_PRODUCER_BEFORE} from '../lib/source-producer-successor-source.mjs';
import {RAVSCORE_CONTINUATION_CHECKPOINT_POLICY} from '../ravscore-continuation-checkpoint.mjs';
import {verifyIntegratedDatabaseReadback} from '../integrated-cutover-readiness.mjs';
import {resolveOperationalRavScoreModel,operationalResolvedBindingCurrent,
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY as OPERATION,
  RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY as PROFILE} from '../ravscore-operational-activation.mjs';
import {PROTECTED_PRIVATE_RUNTIME_POLICY as POLICY} from '../protected-private-production-runtime.mjs';
import {decideSourceGate,discoverPullRequestSourceGate} from '../lib/weather-source-gate.mjs';
import {sourceTreeContentSha256} from '../lib/source-tree-content.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fail=code=>{throw Error('SOURCE_CURRENT_PROFILE_'+code);};
const head=()=>execFileSync('git',['-C',ROOT,'rev-parse','HEAD'],{encoding:'utf8'}).trim();

async function qualify(){
  requireSourceProducerOutput();
  let text='';for await(const chunk of process.stdin){text+=chunk;if(Buffer.byteLength(text)>48*1024*1024)fail('INPUT_BOUND');}
  const {pg,inputs}=JSON.parse(text);
  assert.equal(inputs.profile,'current-source-native');assert.equal(inputs.sourceHead,head());
  assert.equal(inputs.registry.zoneCount,210);assert.equal(inputs.registry.partCount,673);
  // These objects came from ACTUAL SQL in the same normal native host.
  // The normal verifier, not a handwritten current-family result, qualifies them.
  await verifyIntegratedDatabaseReadback({url:'https://current-native-pg.invalid',serviceRoleKey:'SYNTHETIC_TEST_ONLY',
    sourcePhase:'source-producer',
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

async function rpcRequest(initial=false){
  requireSourceProducerOutput();
  let bindings={};
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
    assert.equal(I.modelBundleSha256,SOURCE_PRODUCER_BEFORE.I);assert.equal(C.modelBundleSha256,SOURCE_PRODUCER_BEFORE.C);
    bindings={modelBinding:I,candidateModelBinding:C};
  }
  const sentinel=Object.freeze({}),seen=[];
  try{await verifyIntegratedDatabaseReadback({url:'https://current-native-pg.invalid',serviceRoleKey:'SYNTHETIC_TEST_ONLY',
    sourcePhase:'source-producer',...bindings,fetchImpl:async(input,options)=>{
      assert.equal(input,'https://current-native-pg.invalid/rest/v1/rpc/ravradar_integrated_cutover_contract');
      assert.equal(options.method,'POST');seen.push(JSON.parse(options.body));throw sentinel;
    }});}catch(error){if(error!==sentinel)throw error;}
  assert.equal(seen.length,1);
  return {integratedRequestBody:seen[0],sqlExecuted:false,
    bucket:{id:POLICY.bucketId,name:POLICY.bucketId,public:false,
      file_size_limit:POLICY.maximumArchiveBytes,allowed_mime_types:[POLICY.mimeType]},
    checkpointMaximumSerializedBytes:RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes};
}

async function captureGithub(){
  requireSourceProducerOutput();
  assert.equal(process.platform,'linux');assert.equal(process.versions.node.split('.')[0],'24');
  const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN,currentHead=head();
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository??'')||!token)fail('PENDING_ACTUAL_SOURCE_GATE_CREDENTIAL');
  const env={...process.env,GITHUB_SHA:currentHead,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ID:'200',GITHUB_RUN_ATTEMPT:'2'};
  const tree=sourceTreeContentSha256('HEAD'),responses={};
  const getJson=async route=>{
    assert(route.startsWith('/repos/'+repository+'/')&&!/[\r\n]/.test(route));
    const response=await fetch('https://api.github.com'+route,{headers:{Authorization:'Bearer '+token,
      Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)fail('ACTUAL_GITHUB_PROOF_UNAVAILABLE');
    const raw=await response.text();if(Buffer.byteLength(raw)>8*1024*1024)fail('GITHUB_BODY_BOUND');
    const value=JSON.parse(raw);
    if(Object.hasOwn(responses,route))assert.deepEqual(responses[route],value,'Actual source metadata changed during capture');
    responses[route]=value;return value;
  };
  const file=path.join(ROOT,'.cache/source-current-native-github-capture.json');
  await assert.rejects(fs.lstat(file),{code:'ENOENT'});
  let record=null;try{record=JSON.parse(await fs.readFile(path.join(ROOT,'.cache/weather-source-validation.json'),'utf8'));}catch{}
  let decision=await decideSourceGate(record,env,getJson,{sourceTreeSha256:tree});
  if(decision.required){
    const discovered=await discoverPullRequestSourceGate(env,tree,getJson);
    if(discovered.required)fail('PENDING_ACTUAL_GREEN_SOURCE_GATE');
    record=discovered.record;decision=await decideSourceGate(record,env,getJson,{sourceTreeSha256:tree});
  }
  if(decision.required)fail('PENDING_ACTUAL_GREEN_SOURCE_GATE');
  // Actual normal check/discovery and immutable job/step reads, never a local
  // cache-only success marker or a fabricated sourceGateRecord('success').
  const output={head:currentHead,repository,record,responses,normalDecisionRequired:false,
    sourceOwnerIssued:false,productionProof:false};
  const raw=Buffer.from(JSON.stringify(output)+'\n');assert(raw.length<=16*1024*1024);
  await fs.mkdir(path.dirname(file),{recursive:true});const handle=await fs.open(file,'wx',0o600);
  try{await handle.writeFile(raw);await handle.sync();}finally{await handle.close();}
  assert.deepEqual(await fs.readFile(file),raw);return {actualSourceMetadataCaptured:true,sourceOwnerIssued:false};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  requireSourceProducerOutput();assert.equal(process.argv.length,3);
  assert(['--qualify','--capture-github','--rpc-request','--initial-rpc-request'].includes(process.argv[2]));
  console.log(JSON.stringify(await(process.argv[2]==='--qualify'?qualify():
    process.argv[2]==='--rpc-request'?rpcRequest():process.argv[2]==='--initial-rpc-request'?rpcRequest(true):captureGithub())));
}
