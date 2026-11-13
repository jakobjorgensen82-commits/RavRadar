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
import {decideSourceGate,discoverPullRequestSourceGate} from '../lib/weather-source-gate.mjs';
import {sourceTreeContentSha256} from '../lib/source-tree-content.mjs';

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

export async function captureGithub(){
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

export async function captureSourcePrNativeTest(context, {reconfirm=false}={}){
  requireSourceProducerOutput(); // BEFORE context operands, Git, paths or clients.
  assert.equal(process.platform,'linux');assert.equal(process.versions.node.split('.')[0],'24');
  const exact=(value,keys)=>assert.deepEqual(Object.keys(value??{}).sort(),[...keys].sort());
  const positive=value=>Number.isSafeInteger(value)&&value>0;
  exact(context,['schemaVersion','scope','current','sourceTreeSha256']);
  assert.equal(context.schemaVersion,1);assert.equal(context.scope,'SOURCE_PR_NATIVE_TEST_V1');
  const c=context.current;exact(c,['head','run','attempt','pullRequest','branch']);
  assert.match(c.head,/^[a-f0-9]{40}$/);assert.equal(c.head,head());
  assert(positive(c.run)&&positive(c.pullRequest));assert.equal(c.attempt,1);
  assert(typeof c.branch==='string'&&c.branch.startsWith('codex/')&&!/[\r\n\0]/.test(c.branch));
  assert.match(context.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  assert.equal(context.sourceTreeSha256,sourceTreeContentSha256('HEAD'));
  const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
  assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository??'')&&token,
    'SOURCE_PR_NATIVE_ACTUAL_READ_CREDENTIAL_REQUIRED');
  const git=args=>execFileSync('git',['-c','protocol.allow=never','-C',ROOT,...args],
    {encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024}).trim();
  const mainHead=git(['rev-parse','origin/main']);assert.match(mainHead,/^[a-f0-9]{40}$/);
  assert.notEqual(mainHead,c.head);git(['merge-base','--is-ancestor',mainHead,c.head]);
  const responses={},base='/repos/'+repository;
  const get=async route=>{
    const response=await fetch('https://api.github.com'+route,{headers:{Authorization:'Bearer '+token,
      Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000)});
    assert(response.ok,'SOURCE_PR_NATIVE_ACTUAL_GITHUB_READ_REFUSED');
    assert(!response.headers.get('link')?.includes('rel="next"'),'SOURCE_PR_NATIVE_PAGINATION_REFUSED');
    const raw=await response.text();assert(Buffer.byteLength(raw)<=8*1024*1024,'SOURCE_PR_NATIVE_METADATA_BOUND');
    return responses[route]=JSON.parse(raw);
  };
  const runRoute=base+'/actions/runs/'+c.run+'/attempts/1';
  const run=await get(runRoute),jobs=await get(runRoute+'/jobs?per_page=100');
  const pull=await get(base+'/pulls/'+c.pullRequest),main=await get(base+'/git/ref/heads/main');
  assert.equal(run.id,c.run);assert.equal(run.run_attempt,1);assert.equal(run.head_sha,c.head);
  assert.equal(run.head_branch,c.branch);assert.equal(run.path,'.github/workflows/validate-pull-request.yml');
  assert.equal(run.event,'pull_request');assert.equal(run.status,'in_progress');assert.equal(run.conclusion,null);
  for(const value of [run.repository,run.head_repository,pull.head?.repo,pull.base?.repo])assert.equal(value?.full_name,repository);
  assert.equal(pull.number,c.pullRequest);assert.equal(pull.state,'open');assert.equal(pull.merged,false);
  assert.equal(pull.head?.sha,c.head);assert.equal(pull.head?.ref,c.branch);assert.equal(pull.base?.ref,'main');
  assert.equal(pull.base?.sha,mainHead);assert.equal(main.ref,'refs/heads/main');
  assert.equal(main.object?.type,'commit');assert.equal(main.object.sha,mainHead);
  assert(Array.isArray(jobs.jobs)&&positive(jobs.total_count)&&jobs.total_count<=100);
  assert.equal(jobs.jobs.length,jobs.total_count);assert.equal(new Set(jobs.jobs.map(j=>j.id)).size,jobs.total_count);
  assert(jobs.jobs.every(j=>positive(j.id)));
  const matches=jobs.jobs.filter(j=>j.name==='Source validation and release gate');assert.equal(matches.length,1);
  const job=matches[0];assert.equal(job.run_id,c.run);assert.equal(job.head_sha,c.head);
  if(Object.hasOwn(job,'run_attempt'))assert.equal(job.run_attempt,1);
  assert.equal(job.status,'in_progress');assert.equal(job.conclusion,null);assert.equal(job.completed_at,null);
  assert(positive(job.runner_id)&&typeof job.runner_name==='string'&&job.runner_name.length>0);
  const started=Date.parse(job.started_at);assert(Number.isFinite(started)&&started<=Date.now());
  assert(Date.now()<started+180*60000,'SOURCE_PR_NATIVE_ORIGINAL_JOB_DEADLINE');
  assert(Array.isArray(job.steps));assert.equal(new Set(job.steps.map(v=>v.number)).size,job.steps.length);
  const sources=job.steps.filter(v=>['Validate source contracts and release governance',
    'Validate current Source contracts and release governance'].includes(v.name));
  const native=job.steps.filter(v=>v.name==='Validate native PostgreSQL checkpoint CAS on artificial data only');
  assert(sources.length>=1&&sources.length<=2);assert.equal(native.length,1);
  assert.equal(new Set(sources.map(v=>v.name)).size,sources.length);
  const successful=sources.filter(v=>v.status==='completed'&&v.conclusion==='success');
  assert.equal(successful.length,1);const source=successful[0];
  for(const other of sources)if(other!==source)assert.equal(other.conclusion,'skipped');
  assert(positive(source.number));
  const between=job.steps.filter(v=>v.number>source.number&&v.number<native[0].number);
  assert.equal(native[0].number,source.number+1+between.length);
  assert(between.length<=1&&between.every(v=>sources.includes(v)&&v.conclusion==='skipped'));
  assert.equal(native[0].status,'in_progress');assert.equal(native[0].conclusion,null);
  const sourceEnd=Date.parse(source.completed_at),nativeStart=Date.parse(native[0].started_at);
  assert(Number.isFinite(sourceEnd)&&Number.isFinite(nativeStart)&&sourceEnd<=nativeStart&&nativeStart<=Date.now());
  const current={...c,jobId:job.id};
  const output={kind:'SOURCE_PR_NATIVE_TEST_CAPTURE_V1',scope:'SOURCE_PR_NATIVE_TEST',head:c.head,
    current,mainHead,repository,sourceTreeSha256:context.sourceTreeSha256,
    workflowPath:run.path,jobStartedAt:job.started_at,runnerName:job.runner_name,
    sourceStepNumber:source.number,nativeStepNumber:native[0].number,
    checkedAt:new Date().toISOString(),responses,sourceAdmission:false,productionProof:false};
  const file=path.join(ROOT,'.cache/source-current-native-github-capture.json');
  if(reconfirm){
    const stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size<=16*1024*1024);
    const old=JSON.parse(await fs.readFile(file,'utf8'));
    for(const key of ['kind','scope','head','current','mainHead','repository','sourceTreeSha256','workflowPath',
      'jobStartedAt','runnerName','sourceStepNumber','nativeStepNumber','sourceAdmission','productionProof'])
      assert.deepEqual(output[key],old[key],'SOURCE_PR_NATIVE_METADATA_CHANGED:'+key);
    assert(Date.parse(output.checkedAt)>=Date.parse(old.checkedAt));
  }else{
    const raw=Buffer.from(JSON.stringify(output)+'\n');assert(raw.length<=16*1024*1024);
    await fs.mkdir(path.dirname(file),{recursive:true});
    for(let at=path.dirname(file);;at=path.dirname(at)){
      const row=await fs.lstat(at);assert(row.isDirectory()&&!row.isSymbolicLink());
      assert.equal(await fs.realpath(at),at);if(at===path.dirname(at))break;
    }
    const handle=await fs.open(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
    try{await handle.writeFile(raw);await handle.sync();}finally{await handle.close();}
    assert.deepEqual(await fs.readFile(file),raw);
  }
  return {kind:output.kind,scope:output.scope,current,mainHead,sourceTreeSha256:context.sourceTreeSha256,
    sourceStepNumber:output.sourceStepNumber,nativeStepNumber:output.nativeStepNumber,
    sourceAdmission:false,productionProof:false};
}

export async function sourcePrNativeContextInput(){
  requireSourceProducerOutput();let raw='';for await(const chunk of process.stdin){raw+=chunk;
    assert(Buffer.byteLength(raw)<=16384,'SOURCE_PR_NATIVE_EXPECTED_CONTEXT_BOUND');}
  return JSON.parse(raw);
}
