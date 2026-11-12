import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {inspectLaterMainEvidence,PULL_REQUEST_SOURCE_JOB,PULL_REQUEST_SOURCE_WORKFLOW}
  from './lib/weather-source-gate.mjs';
import {sourceTreeContentSha256} from './lib/source-tree-content.mjs';
import {qualifySourceImpactFullBaseline,SOURCE_IMPACT_FULL_BASELINE_KIND}
  from './source-impact-full-baseline.mjs';
import {CURRENT_CONTRACT_SOURCE_CONTRACT,CURRENT_CONTRACT_SOURCE_KIND,currentContractSourceArtifactName,
  validateCurrentContractSourceReceipt,readCurrentContractReview,CURRENT_CHANGE_SOURCE_CONTRACT,CURRENT_CHANGE_SOURCE_KIND,
  currentChangeSourceArtifactName,validateCurrentChangeSourceReceipt,readCurrentChangeReview}
  from './source-current-contract-receipt.mjs';
import {ORIGIN,sourceImpactEvidenceBudget} from './native-postgres-evidence.mjs';

// Archived namespaces are parsed here without initializing their old planner.
// Their actual validators are loaded only when that legacy type is consumed.
const TARGETED_SOURCE_CONTRACT='weather-source-targeted-impact-v1';
const TARGETED_SOURCE_KIND='RAVRADAR_SOURCE_TARGETED_RECEIPT_V1';
const DOMAIN_TARGETED_SOURCE_CONTRACT='weather-source-targeted-domains-v2';
const DOMAIN_TARGETED_SOURCE_KIND='RAVRADAR_SOURCE_TARGETED_DOMAINS_RECEIPT_V2';

const LOCATOR_KEYS=['contractId','repository','headSha','producerHeadSha','sourceTreeSha256',
  'pullRequestNumber','runId','runAttempt','jobId','artifactId','artifactDigest','proofSha256'];
export const TARGETED_SOURCE_STEP_NAMES=Object.freeze(['Set up job','Run actions/checkout@v7','Require exact pull-request source head',
  'Run actions/setup-node@v7','Build deterministic source-tree content identity',
  'Diagnose normal pack-reader closure on artificial data only','Run actions/setup-python@v7',
  'Install source-gate dependencies','Set up Node24 for isolated acquisition contracts',
  'Install exact local cache-action dependencies without scripts','Verify locked cache API distribution without runtime calls',
  'Validate isolated acquisition ownership and raw-save cohort','Restore Node22 for existing source validation',
  'Validate bounded native current diagnosis on artificial data only','Validate source contracts and release governance',
  'Validate native PostgreSQL checkpoint CAS on artificial data only','Upload independently completed native586 PostgreSQL phase',
  'Validate isolated restart and two ordinary national followers',
  'Validate durable Copernicus current-reference baseline on artificial data only',
  'Validate download-inclusive DMI capacity on artificial data only','Require validated source tree to remain unchanged',
  'Upload tree-content source validation proof']);
export const TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES=Object.freeze([
  ...TARGETED_SOURCE_STEP_NAMES.slice(0,4),'Run actions/setup-python@v7',
  'Install declared requests dependency before source planning',
  ...TARGETED_SOURCE_STEP_NAMES.slice(4,6),...TARGETED_SOURCE_STEP_NAMES.slice(7)]);
export const TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES=Object.freeze(
  TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES.map((name,index)=>index===5?'Install declared DMI dependencies before source planning':name));
const DMI_PYTHON_WORKFLOW_SHA256='742835aa72adb58c50f6f404f5c3c1308a7c11b0038a528a9b5a1ac6253b3cff';
const DMI_REQUIREMENTS_WORKFLOW_SHA256='2947d429c6df45cfc415ace970f4e5efc89410ca60d277de19529dde73882843';
const verifiedMainFrontiers=new WeakMap();
// Only a result actually accepted by this normal consumer carries this brand.
export function verifiedMainSourceFrontier(result){
  assert.equal(arguments.length,1);const value=verifiedMainFrontiers.get(result);
  return value?structuredClone(value):null;
}
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const one=rows=>{assert.equal(rows.length,1);return rows[0];};
const positive=value=>Number.isSafeInteger(value)&&value>0;
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const digest=value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value);
const time=value=>{const n=Date.parse(value);assert(Number.isFinite(n));return n;};
const success=value=>value?.status==='completed'&&value.conclusion==='success';

function locatorIdentity(record,env){
  assert(record&&Object.getPrototypeOf(record)===Object.prototype);
  assert.deepEqual(Object.keys(record).sort(),[...LOCATOR_KEYS].sort());
  assert([TARGETED_SOURCE_CONTRACT,DOMAIN_TARGETED_SOURCE_CONTRACT,CURRENT_CONTRACT_SOURCE_CONTRACT,CURRENT_CHANGE_SOURCE_CONTRACT].includes(record.contractId));
  assert.equal(record.repository,ORIGIN.repository);
  assert.equal(env.GITHUB_REPOSITORY,record.repository);assert.equal(env.GITHUB_REF,'refs/heads/main');
  assert(oid(record.headSha)&&record.headSha===env.GITHUB_SHA&&oid(record.producerHeadSha));
  assert.notEqual(record.headSha,record.producerHeadSha);assert(digest(record.sourceTreeSha256));
  assert(digest(record.artifactDigest));assert.match(record.proofSha256,/^[a-f0-9]{64}$/);
  assert(typeof record.runId==='string'&&/^[1-9][0-9]*$/.test(record.runId)&&positive(Number(record.runId)));
  assert.notEqual(record.runId,String(env.GITHUB_RUN_ID));
  for(const key of ['pullRequestNumber','runAttempt','jobId','artifactId'])assert(positive(record[key]));
  assert.equal(record.runAttempt,1);
}

export function verifyTargetedSourceStepShape(job,workflowText){
  assert.equal(arguments.length,2);assert(Array.isArray(job.steps));
  const modern=workflowText!==undefined;
  const workflowHash=modern?sha(workflowText):null;
  if(modern)assert([DMI_PYTHON_WORKFLOW_SHA256,DMI_REQUIREMENTS_WORKFLOW_SHA256].includes(workflowHash),'EXACT_DMI_PYTHON_WORKFLOW_REQUIRED');
  const names=modern?(workflowHash===DMI_PYTHON_WORKFLOW_SHA256?TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES:TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES):TARGETED_SOURCE_STEP_NAMES;
  assert.deepEqual(job.steps.filter(value=>value.number<=names.length).map(value=>value.number),Array.from({length:names.length},(_,i)=>i+1));
  for(let i=0;i<names.length;i++){
    const step=one(job.steps.filter(value=>value.number===i+1));assert.equal(step.name,names[i]);assert.equal(step.status,'completed');
    assert.equal(step.conclusion,modern?(i>=7&&i<=20?'skipped':'success'):(i>=5&&i<=19?'skipped':'success'));
  }
  const selected=job.steps[modern?6:4],unchanged=job.steps[modern?21:20],uploaded=job.steps[modern?22:21];
  assert(time(selected.started_at)<=time(selected.completed_at));assert(time(selected.completed_at)<=time(unchanged.started_at));
  assert(time(unchanged.started_at)<=time(unchanged.completed_at));assert(time(unchanged.completed_at)<=time(uploaded.started_at));assert(time(uploaded.started_at)<=time(uploaded.completed_at));
  return {proofTime:time(selected.completed_at),earliestArtifact:time(selected.started_at),latestArtifact:time(uploaded.completed_at)};
}

function runIdentity(run,pull,jobs,record,workflowText){
  assert.equal(run.id,Number(record.runId));assert.equal(run.run_attempt,record.runAttempt);
  assert.equal(run.head_sha,record.producerHeadSha);assert.equal(run.event,'pull_request');
  assert.equal(run.path,PULL_REQUEST_SOURCE_WORKFLOW);assert(success(run));
  assert.equal(run.repository?.full_name,record.repository);assert.equal(run.head_repository?.full_name,record.repository);
  assert.equal(pull.number,record.pullRequestNumber);assert.equal(pull.state,'closed');time(pull.merged_at);
  assert.equal(pull.merge_commit_sha,record.headSha);assert.equal(pull.head?.sha,record.producerHeadSha);
  assert.equal(pull.head?.repo?.full_name,record.repository);assert.equal(pull.base?.ref,'main');
  assert.equal(pull.base?.repo?.full_name,record.repository);
  assert(Array.isArray(jobs.jobs)&&positive(jobs.total_count)&&jobs.total_count<=100&&jobs.total_count===jobs.jobs.length);
  const job=one(jobs.jobs.filter(value=>value.name===PULL_REQUEST_SOURCE_JOB));
  assert.equal(job.id,record.jobId);assert.equal(job.run_id,run.id);assert.equal(job.run_attempt,record.runAttempt);
  assert.equal(job.head_sha,record.producerHeadSha);assert(success(job));assert(Array.isArray(job.steps));
  return verifyTargetedSourceStepShape(job,workflowText);
}

function artifactNameFor(record,current){
  assert([TARGETED_SOURCE_CONTRACT,DOMAIN_TARGETED_SOURCE_CONTRACT,CURRENT_CONTRACT_SOURCE_CONTRACT,CURRENT_CHANGE_SOURCE_CONTRACT].includes(record.contractId));
  if(record.contractId===CURRENT_CHANGE_SOURCE_CONTRACT)return currentChangeSourceArtifactName(current);
  if(record.contractId===CURRENT_CONTRACT_SOURCE_CONTRACT)return currentContractSourceArtifactName(current);
  const prefix=record.contractId===DOMAIN_TARGETED_SOURCE_CONTRACT
    ?'ravradar-source-targeted-domains-v2-pr-':'ravradar-source-targeted-v1-pr-';
  return prefix+current.pullRequest+'-'+current.head+'-'+current.sourceTreeSha256.slice(7);
}
function verifyArtifact(metadata,record,phase){
  assert.equal(metadata.id,record.artifactId);assert.equal(metadata.digest,record.artifactDigest);
  assert.equal(metadata.name,artifactNameFor(record,{pullRequest:record.pullRequestNumber,
    head:record.producerHeadSha,sourceTreeSha256:record.sourceTreeSha256}));
  assert.equal(metadata.expired,false);assert(positive(metadata.size_in_bytes)&&metadata.size_in_bytes<=65536);
  assert.equal(metadata.workflow_run?.id,Number(record.runId));assert.equal(metadata.workflow_run?.head_sha,record.producerHeadSha);
  assert(time(metadata.created_at)>=phase.earliestArtifact&&time(metadata.created_at)<=phase.latestArtifact);
}

function decodeReceipt(zip,remainingBudget){
  const remaining=remainingBudget();
  const raw=execFileSync('python',['-c',[
    'import io,sys,zipfile','z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))',
    'assert z.namelist()==["source-targeted-impact-proof.json"]','i=z.infolist()[0]',
    'assert not i.is_dir() and 0<i.file_size<=32768 and not (i.flag_bits & 1)',
    'sys.stdout.buffer.write(z.read(i))',
  ].join(';')],{input:zip,maxBuffer:32768,timeout:Math.min(10000,Math.max(1,Math.floor(remaining))),
    stdio:['pipe','pipe','pipe']});
  remainingBudget();assert(raw.length>0&&raw.length<=32768);return raw;
}

// A dedicated fallback after the old FULL consumer. Callers provide bounded,
// read-only GitHub/Git readers; no skip mode, different-head permission or
// caller-verified baseline boolean exists. Nothing here writes production.
export async function decideTargetedSourceGate(record,env,dependencies){
  const required=()=>({required:true,reason:'targeted-source-proof-unavailable'});
  const deadline=performance.now()+60000;
  let sharedBudget=null;
  const remaining=()=>{const n=sharedBudget?sharedBudget.remaining():deadline-performance.now();assert(n>0);return n;};
  try{
    assert.equal(arguments.length,3);locatorIdentity(record,env);
    assert.deepEqual(Object.keys(dependencies).sort(),['getArtifactZip','getJson','readGit']);
    const {getJson,getArtifactZip,readGit}=dependencies;
    for(const fn of [getJson,getArtifactZip,readGit])assert.equal(typeof fn,'function');
    sharedBudget=sourceImpactEvidenceBudget(getJson,getArtifactZip);
    const git=(args,options)=>{const limit=Math.min(10000,Math.max(1,Math.floor(remaining())));
      const result=readGit(args,{...options,timeout:limit});remaining();
      assert(Buffer.isBuffer(result)&&result.length<=512*1024*1024);return result;};
    const text=args=>git(args).toString('utf8').trim();
    const assertCommittedHead=()=>{assert.equal(text(['rev-parse','HEAD']),record.headSha);
      assert.equal(text(['for-each-ref','refs/replace']),'');};
    // The ordinary caller has already hydrated central runtime data. Source
    // identity is the committed tree; its runtime still needs all normal gates.
    assertCommittedHead();assert.equal(text(['rev-parse','--is-shallow-repository']),'false');
    const parents=text(['rev-list','--parents','-n','1',record.headSha]).split(' ');
    assert.equal(parents.length,3);assert.equal(parents[0],record.headSha);assert(parents.every(oid));
    assert.equal(parents.slice(1).filter(value=>value===record.producerHeadSha).length,1);
    const tree=text(['rev-parse',record.headSha+'^{tree}']);assert(oid(tree));
    assert.equal(text(['rev-parse',record.producerHeadSha+'^{tree}']),tree);
    assert.equal(sourceTreeContentSha256(record.headSha,{git}),record.sourceTreeSha256);
    let calls=0;
    const checked=(value,zip)=>{remaining();
      if(zip){assert(Buffer.isBuffer(value)&&value.length>0&&value.length<=65536);return value;}
      const raw=JSON.stringify(value);assert(Buffer.byteLength(raw)<=2*1024*1024);return JSON.parse(raw);};
    async function bounded(reader,route,zip=false){
      if(sharedBudget)return checked(await reader(route),zip);
      assert(++calls<=64);const timeout=Math.min(15000,remaining()),controller=new AbortController();let timer;
      try{
        const value=await Promise.race([reader(route,{signal:controller.signal,maxBytes:zip?65536:2*1024*1024}),
          new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('BOUND'));},timeout);})]);
        return checked(value,zip);
      }finally{clearTimeout(timer);controller.abort();}
    }
    const json=route=>bounded(getJson,route),zip=route=>bounded(getArtifactZip,route,true);
    const repo='/repos/'+record.repository,runRoute=repo+'/actions/runs/'+record.runId;
    const run=await json(runRoute),pull=await json(repo+'/pulls/'+record.pullRequestNumber);
    const jobs=await json(runRoute+'/attempts/1/jobs?per_page=100');
    const selectedJob=one(jobs.jobs.filter(value=>value.name===PULL_REQUEST_SOURCE_JOB));
    const usesDmiPythonShape=selectedJob.steps?.some(value=>value.number===5&&value.name==='Run actions/setup-python@v7');
    const workflowText=usesDmiPythonShape?git(['cat-file','blob',record.producerHeadSha+':'+PULL_REQUEST_SOURCE_WORKFLOW]).toString('utf8'):undefined;
    const phase=runIdentity(run,pull,jobs,record,workflowText);
    const artifactRoute=repo+'/actions/artifacts/'+record.artifactId,metadata=await json(artifactRoute);
    verifyArtifact(metadata,record,phase);
    const bytes=await zip(artifactRoute+'/zip');assert.equal(bytes.length,metadata.size_in_bytes);
    assert.equal('sha256:'+sha(bytes),metadata.digest);const raw=decodeReceipt(bytes,remaining);
    assert.equal(sha(raw),record.proofSha256);const receipt=JSON.parse(raw);
    const current={repository:record.repository,head:record.producerHeadSha,sourceTreeSha256:record.sourceTreeSha256,
      pullRequest:record.pullRequestNumber,runId:Number(record.runId),runAttempt:1,jobId:record.jobId};
    assert.deepEqual(receipt.current,current);
    const full=await qualifySourceImpactFullBaseline({reference:receipt.baselineReference,candidateCommit:record.headSha},
      {getJson,getArtifactZip,readGit});remaining();
    assert.equal(full.kind,SOURCE_IMPACT_FULL_BASELINE_KIND);
    const isDomain=record.contractId===DOMAIN_TARGETED_SOURCE_CONTRACT;
    const isCurrent=record.contractId===CURRENT_CONTRACT_SOURCE_CONTRACT;
    const isChange=record.contractId===CURRENT_CHANGE_SOURCE_CONTRACT;
    let structural,domainPlan,currentPlan,cumulativePlan,changeBase,controlReview;
    if(isChange){
      // A normal merge's first parent is the live main base tested by the PR.
      // No receipt-selected old ancestor may hide current changes.
      changeBase=receipt.changeBase;
      assert(changeBase&&oid(changeBase.commit)&&oid(changeBase.gitTree)&&oid(changeBase.pullBaseCommit));
      assert.equal(parents[2],record.producerHeadSha);assert.equal(parents[1],changeBase.pullBaseCommit);
      assert.equal(text(['merge-base','--all',parents[1],record.producerHeadSha]),changeBase.commit);
      assert.equal(text(['rev-parse',changeBase.commit+'^{tree}']),changeBase.gitTree);
      git(['merge-base','--is-ancestor',full.mergeCommit,changeBase.commit]);
      const {planSourceCurrentContractsFromGit}=await import('./source-current-contract-plan.mjs');
      currentPlan=planSourceCurrentContractsFromGit({baselineCommit:changeBase.commit,
        candidateCommit:record.headSha,expectedHead:record.headSha});remaining();
      cumulativePlan=planSourceCurrentContractsFromGit({baselineCommit:full.mergeCommit,
        candidateCommit:record.headSha,expectedHead:record.headSha});remaining();
      const expected={current,fullBaseline:full,changeBase,currentPlan,cumulativePlan};
      controlReview=readCurrentChangeReview(pull,expected);
      structural=validateCurrentChangeSourceReceipt(receipt,{...expected,frontier:receipt.frontier,
        commandResults:receipt.reportedCommandResults});
      if(receipt.frontier.mode==='MAIN'){
        const frontier=receipt.frontier,prior=frontier.sourceRecord;
        assert.equal(sourceTreeContentSha256(changeBase.commit,{git}),frontier.sourceTreeSha256);
        assert(frontier.sourceProofTime<=phase.proofTime);
        const priorParents=text(['rev-list','--parents','-n','1',changeBase.commit]).split(' ');
        assert.equal(priorParents.length,3);assert.equal(priorParents[2],prior.producerHeadSha);
        assert.equal(text(['rev-parse',prior.producerHeadSha+'^{tree}']),frontier.gitTree);
        // The producer verified the complete immediate base before commands.
        // This delegated summary never recursively reopens its ancestors.
      }
      const frontier=receipt.frontier;
      const negative=await inspectLaterMainEvidence({env:{...env,GITHUB_SHA:changeBase.commit},
        proofTime:frontier.mode==='MAIN'?frontier.sourceProofTime:0,
        record:frontier.sourceRecord??{runId:record.runId},getJson:json});
      if(negative)return negative;
    }else if(isCurrent){
      const {planSourceCurrentContractsFromGit}=await import('./source-current-contract-plan.mjs');
      currentPlan=planSourceCurrentContractsFromGit({baselineCommit:full.mergeCommit,
        candidateCommit:record.headSha,expectedHead:record.headSha});remaining();
      assert.equal(currentPlan.status,'PLANNED');assert.equal(currentPlan.selection,'CURRENT_CONTRACTS');
      controlReview=readCurrentContractReview(pull,{current,fullBaseline:full,currentPlan});
      structural=validateCurrentContractSourceReceipt(receipt,{current,fullBaseline:full,currentPlan,
        commandResults:receipt.reportedCommandResults});
    }else if(isDomain){
      const {planSourceDomainImpactFromGit}=await import('./source-impact-domain-plan.mjs');
      const {readDomainControlReview,validateDomainTargetedSourceReceipt}=await import('./source-targeted-receipt.mjs');
      domainPlan=planSourceDomainImpactFromGit({baselineCommit:full.mergeCommit,
        candidateCommit:record.headSha,expectedHead:record.headSha});remaining();
      assert.equal(domainPlan.status,'PLANNED');
      assert(['TARGETED_DOMAINS','CONTROL_QUALIFICATION_REQUIRED'].includes(domainPlan.selection));
      controlReview=readDomainControlReview(pull,{current,fullBaseline:full,domainPlan});
      structural=validateDomainTargetedSourceReceipt(receipt,{current,fullBaseline:full,domainPlan,
        commandResults:receipt.reportedCommandResults});
    }else{
      const {planSourceImpactFromGit}=await import('./source-impact-git-diff.mjs');
      const {validateTargetedSourceReceipt}=await import('./source-targeted-receipt.mjs');
      const gitPlan=planSourceImpactFromGit({baselineCommit:full.mergeCommit,candidateCommit:record.headSha,expectedHead:record.headSha});
      assert.equal(gitPlan.status,'PLANNED');assert.equal(gitPlan.plan.selection,'TARGETED');
      structural=validateTargetedSourceReceipt(receipt,{current,fullBaseline:full,gitPlan,
        commandResults:receipt.reportedCommandResults});
    }
    assert.equal(structural.validStructure,true);
    // Keep the original source gate's later-main evidence semantics. A later
    // red/unresolved source phase is never hidden by this narrower scope.
    const later=await inspectLaterMainEvidence({env,proofTime:phase.proofTime,record,getJson:json});
    if(later)return later;
    assert.deepEqual(await json(runRoute),run);assert.deepEqual(await json(artifactRoute),metadata);
    if(((isCurrent||isChange)&&currentPlan.controlQualificationRequired)
      ||(isDomain&&domainPlan.selection==='CONTROL_QUALIFICATION_REQUIRED')){
      const freshPull=await json(repo+'/pulls/'+record.pullRequestNumber);
      runIdentity(run,freshPull,jobs,record,workflowText);
      if(isChange)assert.deepEqual(readCurrentChangeReview(freshPull,{current,fullBaseline:full,changeBase,currentPlan,cumulativePlan}),controlReview);
      else if(isCurrent)assert.deepEqual(readCurrentContractReview(freshPull,{current,fullBaseline:full,currentPlan}),controlReview);
      else{
        const {readDomainControlReview}=await import('./source-targeted-receipt.mjs');
        assert.deepEqual(readDomainControlReview(freshPull,{current,fullBaseline:full,domainPlan}),controlReview);
      }
    }
    assertCommittedHead();assert.equal(sourceTreeContentSha256(record.headSha,{git}),record.sourceTreeSha256);remaining();
    if(isCurrent||isChange){
      const result={required:false,reason:isChange?'verified-current-change-pull-request-source-content':
      'verified-current-contract-pull-request-source-content',runId:record.runId,
      scope:isChange?'CURRENT_CHANGE_CONTRACT_RESULTS_ONLY':'CURRENT_CONTRACT_RESULTS_ONLY',testedAreas:Object.keys(isChange?receipt.execution.areas:receipt.impact.areas)
        .filter(area=>(isChange?receipt.execution.areas:receipt.impact.areas)[area].commands.length>0),
      postgresExecuted:false,historicalCompatibilityExecuted:false,historicalNationalExecuted:false,
      independentControlReview:controlReview?'VERIFIED_EXACT_ROOT_PR_REVIEW':'NOT_REQUIRED'};
      verifiedMainFrontiers.set(result,{schemaVersion:1,kind:'QUALIFIED_CHANGE_FRONTIER',mode:'MAIN',
        repository:record.repository,commit:record.headSha,gitTree:tree,sourceTreeSha256:record.sourceTreeSha256,
        sourceRecord:structuredClone(record),sourceProofTime:phase.proofTime,missingReason:null});
      return result;
    }
    return isDomain
      ?{required:false,reason:'verified-domain-targeted-pull-request-source-content',runId:record.runId,
        scope:'TARGETED_DOMAIN_COMMAND_RESULTS_ONLY',domains:structuredClone(receipt.domains),
        independentControlReview:controlReview?'VERIFIED_EXACT_ROOT_PR_REVIEW':'NOT_REQUIRED'}
      :{required:false,reason:'verified-targeted-pull-request-source-content',runId:record.runId,
        scope:'TARGETED_COMMAND_RESULTS_ONLY',database:'NOT_APPLICABLE',national:'NOT_APPLICABLE'};
  }catch{return required();}
}

// Discovery returns only an untrusted locator. The normal caller must use a
// same bounded transport phase with decideTargetedSourceGate afterwards, including its
// independent FULL baseline, actual main Git tree/diff and later-failure checks.
// No caller chooses PR/run/job/artifact/hash fields or supplies verified:true.
export async function discoverTargetedSourceGate(env,sourceTreeSha256,dependencies){
  const required=(frontierAvailability='UNPROVED')=>({required:true,reason:'targeted-source-locator-unavailable',frontierAvailability});
  let expired=false;
  const deadline=performance.now()+60000;
  let sharedBudget=null;
  const remaining=()=>{const n=sharedBudget?sharedBudget.remaining():deadline-performance.now();assert(n>0);return n;};
  try{
    assert.equal(arguments.length,3);assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
    assert.equal(env.GITHUB_REF,'refs/heads/main');assert(oid(env.GITHUB_SHA)&&digest(sourceTreeSha256));
    const dependencyKeys=Object.keys(dependencies).sort();
    assert(isDeepStrictEqual(dependencyKeys,['getArtifactZip','getJson'])
      ||isDeepStrictEqual(dependencyKeys,['getArtifactZip','getJson','readGit']));
    const {getJson,getArtifactZip,readGit}=dependencies;
    for(const reader of [getJson,getArtifactZip])assert.equal(typeof reader,'function');
    if(readGit!==undefined)assert.equal(typeof readGit,'function');
    sharedBudget=sourceImpactEvidenceBudget(getJson,getArtifactZip);
    let calls=0;
    const checked=(value,zip)=>{remaining();
      if(zip){assert(Buffer.isBuffer(value)&&value.length>0&&value.length<=65536);return value;}
      const raw=JSON.stringify(value);assert(Buffer.byteLength(raw)<=2*1024*1024);return JSON.parse(raw);};
    async function bounded(reader,route,zip=false){
      if(sharedBudget){assert(++calls<=16);return checked(await reader(route),zip);}
      assert(++calls<=16);const timeout=Math.min(15000,remaining()),controller=new AbortController();let timer;
      try{
        const value=await Promise.race([reader(route,{signal:controller.signal,maxBytes:zip?65536:2*1024*1024}),
          new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('BOUND'));},timeout);})]);
        return checked(value,zip);
      }finally{clearTimeout(timer);controller.abort();}
    }
    const json=route=>bounded(getJson,route),repo='/repos/'+env.GITHUB_REPOSITORY;
    const pulls=await json(repo+'/commits/'+env.GITHUB_SHA+'/pulls?per_page=100');
    assert(Array.isArray(pulls)&&pulls.length<=100);
    const candidates=pulls.filter(pull=>positive(pull.number)&&pull.state==='closed'
      &&typeof pull.merged_at==='string'&&Number.isFinite(Date.parse(pull.merged_at))
      &&pull.merge_commit_sha===env.GITHUB_SHA&&oid(pull.head?.sha)
      &&pull.head?.repo?.full_name===env.GITHUB_REPOSITORY&&pull.base?.ref==='main'
      &&pull.base?.repo?.full_name===env.GITHUB_REPOSITORY).sort((a,b)=>b.number-a.number);
    assert(candidates.length<=4&&new Set(candidates.map(pull=>pull.number)).size===candidates.length);
    for(const pull of candidates){
     for(const contractId of [CURRENT_CHANGE_SOURCE_CONTRACT,CURRENT_CONTRACT_SOURCE_CONTRACT,DOMAIN_TARGETED_SOURCE_CONTRACT,TARGETED_SOURCE_CONTRACT]){
      const artifactName=artifactNameFor({contractId},{pullRequest:pull.number,head:pull.head.sha,sourceTreeSha256});
      const listing=await json(repo+'/actions/artifacts?name='+encodeURIComponent(artifactName)+'&per_page=100');
      assert(Array.isArray(listing.artifacts)&&Number.isSafeInteger(listing.total_count)
        &&listing.total_count>=0&&listing.total_count<=100&&listing.total_count===listing.artifacts.length);
      expired ||= listing.artifacts.some(artifact=>artifact.name===artifactName&&artifact.expired===true);
      const matches=listing.artifacts.filter(artifact=>artifact.name===artifactName&&artifact.expired===false)
        .sort((a,b)=>b.id-a.id);
      assert(matches.length<=8&&new Set(matches.map(artifact=>artifact.id)).size===matches.length);
      if(matches.length===0)continue;
      // Once the newest matching artifact exists, unknown/red identity chooses
      // FULL; do not hunt an older green artifact past conflicting evidence.
      const artifact=matches[0];assert(positive(artifact.id)&&positive(artifact.workflow_run?.id));
      assert.equal(artifact.workflow_run.head_sha,pull.head.sha);
      const runRoute=repo+'/actions/runs/'+artifact.workflow_run.id,run=await json(runRoute);
      assert.equal(run.run_attempt,1);assert.equal(run.id,artifact.workflow_run.id);
      const jobs=await json(runRoute+'/attempts/1/jobs?per_page=100');
      assert(Array.isArray(jobs.jobs));const job=one(jobs.jobs.filter(value=>value.name===PULL_REQUEST_SOURCE_JOB));
      assert(positive(job.id)&&digest(artifact.digest));assert.notEqual(env.GITHUB_SHA,pull.head.sha);
      const locator={contractId,repository:env.GITHUB_REPOSITORY,
        headSha:env.GITHUB_SHA,producerHeadSha:pull.head.sha,sourceTreeSha256,pullRequestNumber:pull.number,
        runId:String(run.id),runAttempt:run.run_attempt,jobId:job.id,artifactId:artifact.id,
        artifactDigest:artifact.digest};
      const usesDmiPythonShape=job.steps?.some(value=>value.number===5&&value.name==='Run actions/setup-python@v7');
      let workflowText;
      if(usesDmiPythonShape){
        assert.equal(typeof readGit,'function');const timeout=Math.min(10000,Math.max(1,Math.floor(remaining())));
        const workflowBytes=readGit(['cat-file','blob',pull.head.sha+':'+PULL_REQUEST_SOURCE_WORKFLOW],{timeout});remaining();
        assert(Buffer.isBuffer(workflowBytes)&&workflowBytes.length<=65536);workflowText=workflowBytes.toString('utf8');
      }
      const phase=runIdentity(run,pull,jobs,locator,workflowText);verifyArtifact(artifact,locator,phase);
      const bytes=await bounded(getArtifactZip,repo+'/actions/artifacts/'+artifact.id+'/zip',true);
      assert.equal(bytes.length,artifact.size_in_bytes);assert.equal('sha256:'+sha(bytes),artifact.digest);
      const raw=decodeReceipt(bytes,remaining),receipt=JSON.parse(raw);locator.proofSha256=sha(raw);
      locatorIdentity(locator,env);
       const isDomain=contractId===DOMAIN_TARGETED_SOURCE_CONTRACT,isCurrent=contractId===CURRENT_CONTRACT_SOURCE_CONTRACT,
         isChange=contractId===CURRENT_CHANGE_SOURCE_CONTRACT;
       assert.equal(receipt.schemaVersion,isChange?4:isCurrent?3:isDomain?2:1);assert.equal(receipt.contractId,contractId);
       assert.equal(receipt.kind,isChange?CURRENT_CHANGE_SOURCE_KIND:isCurrent?CURRENT_CONTRACT_SOURCE_KIND:isDomain?DOMAIN_TARGETED_SOURCE_KIND:TARGETED_SOURCE_KIND);
       assert.equal(receipt.scope,isChange?'CURRENT_CHANGE_CONTRACT_RESULTS_ONLY':isCurrent?'CURRENT_CONTRACT_RESULTS_ONLY'
         :isDomain?'TARGETED_DOMAIN_COMMAND_RESULTS_ONLY':'TARGETED_COMMAND_RESULTS_ONLY');
      assert.equal(receipt.artifactName,artifactName);assert.equal(receipt.privatePayloadIncluded,false);
      assert.deepEqual(receipt.current,{repository:locator.repository,head:locator.producerHeadSha,
        sourceTreeSha256,pullRequest:locator.pullRequestNumber,runId:run.id,runAttempt:1,jobId:job.id});
      remaining();
      if((isCurrent||isChange)&&(!Array.isArray(receipt.reportedCommandResults)
        ||receipt.reportedCommandResults.length===0||receipt.reportedCommandResults.some(row=>row?.outcome!=='PASS')))
        return {required:true,reason:'typed-source-reported-result-not-pass',frontierAvailability:'CONTRADICTION'};
      return {locator,receipt,requiresVerification:true,deliveryAuthority:false,
        // Data for locating the original FULL proof, never inherited authority.
        ...((isCurrent||isChange)?{baselineReferenceLocator:structuredClone(receipt.baselineReference)}:{})};
     }
    }
    return required(expired?'EXPIRED':'MISSING');
  }catch{return required();}
}
