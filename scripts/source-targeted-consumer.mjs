import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {inspectLaterMainEvidence,PULL_REQUEST_SOURCE_JOB,PULL_REQUEST_SOURCE_WORKFLOW}
  from './lib/weather-source-gate.mjs';
import {sourceTreeContentSha256} from './lib/source-tree-content.mjs';
import {qualifySourceImpactFullBaseline,SOURCE_IMPACT_FULL_BASELINE_KIND}
  from './source-impact-full-baseline.mjs';
import {planSourceImpactFromGit} from './source-impact-git-diff.mjs';
import {TARGETED_SOURCE_CONTRACT,TARGETED_SOURCE_KIND,targetedSourceArtifactName,validateTargetedSourceReceipt}
  from './source-targeted-receipt.mjs';
import {ORIGIN,sourceImpactEvidenceBudget} from './native-postgres-evidence.mjs';

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
  assert.equal(record.contractId,TARGETED_SOURCE_CONTRACT);assert.equal(record.repository,ORIGIN.repository);
  assert.equal(env.GITHUB_REPOSITORY,record.repository);assert.equal(env.GITHUB_REF,'refs/heads/main');
  assert(oid(record.headSha)&&record.headSha===env.GITHUB_SHA&&oid(record.producerHeadSha));
  assert.notEqual(record.headSha,record.producerHeadSha);assert(digest(record.sourceTreeSha256));
  assert(digest(record.artifactDigest));assert.match(record.proofSha256,/^[a-f0-9]{64}$/);
  assert(typeof record.runId==='string'&&/^[1-9][0-9]*$/.test(record.runId)&&positive(Number(record.runId)));
  assert.notEqual(record.runId,String(env.GITHUB_RUN_ID));
  for(const key of ['pullRequestNumber','runAttempt','jobId','artifactId'])assert(positive(record[key]));
  assert.equal(record.runAttempt,1);
}

function runIdentity(run,pull,jobs,record){
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
  assert.deepEqual(job.steps.filter(value=>value.number<=22).map(value=>value.number),Array.from({length:22},(_,i)=>i+1));
  for(let i=0;i<TARGETED_SOURCE_STEP_NAMES.length;i++){
    const step=one(job.steps.filter(value=>value.number===i+1));assert.equal(step.name,TARGETED_SOURCE_STEP_NAMES[i]);
    assert.equal(step.status,'completed');assert.equal(step.conclusion,i>=5&&i<=19?'skipped':'success');
  }
  const selected=job.steps[4],unchanged=job.steps[20],uploaded=job.steps[21];
  assert(time(selected.started_at)<=time(selected.completed_at));
  assert(time(selected.completed_at)<=time(unchanged.started_at));
  assert(time(unchanged.started_at)<=time(unchanged.completed_at));
  assert(time(unchanged.completed_at)<=time(uploaded.started_at));
  assert(time(uploaded.started_at)<=time(uploaded.completed_at));
  return {proofTime:time(selected.completed_at),earliestArtifact:time(selected.started_at),latestArtifact:time(uploaded.completed_at)};
}

function verifyArtifact(metadata,record,phase){
  assert.equal(metadata.id,record.artifactId);assert.equal(metadata.digest,record.artifactDigest);
  assert.equal(metadata.name,targetedSourceArtifactName({pullRequest:record.pullRequestNumber,
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
    const jobs=await json(runRoute+'/attempts/1/jobs?per_page=100');const phase=runIdentity(run,pull,jobs,record);
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
    const gitPlan=planSourceImpactFromGit({baselineCommit:full.mergeCommit,candidateCommit:record.headSha,expectedHead:record.headSha});
    assert.equal(gitPlan.status,'PLANNED');assert.equal(gitPlan.plan.selection,'TARGETED');
    const structural=validateTargetedSourceReceipt(receipt,{current,fullBaseline:full,gitPlan,
      commandResults:receipt.reportedCommandResults});assert.equal(structural.validStructure,true);
    // Keep the original source gate's later-main evidence semantics. A later
    // red/unresolved source phase is never hidden by this narrower scope.
    const later=await inspectLaterMainEvidence({env,proofTime:phase.proofTime,record,getJson:json});
    if(later)return later;
    assert.deepEqual(await json(runRoute),run);assert.deepEqual(await json(artifactRoute),metadata);
    assertCommittedHead();assert.equal(sourceTreeContentSha256(record.headSha,{git}),record.sourceTreeSha256);remaining();
    return {required:false,reason:'verified-targeted-pull-request-source-content',runId:record.runId,
      scope:'TARGETED_COMMAND_RESULTS_ONLY',database:'NOT_APPLICABLE',national:'NOT_APPLICABLE'};
  }catch{return required();}
}

// Discovery returns only an untrusted locator. The normal caller must use a
// same bounded transport phase with decideTargetedSourceGate afterwards, including its
// independent FULL baseline, actual main Git tree/diff and later-failure checks.
// No caller chooses PR/run/job/artifact/hash fields or supplies verified:true.
export async function discoverTargetedSourceGate(env,sourceTreeSha256,dependencies){
  const required=()=>({required:true,reason:'targeted-source-locator-unavailable'});
  const deadline=performance.now()+60000;
  let sharedBudget=null;
  const remaining=()=>{const n=sharedBudget?sharedBudget.remaining():deadline-performance.now();assert(n>0);return n;};
  try{
    assert.equal(arguments.length,3);assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
    assert.equal(env.GITHUB_REF,'refs/heads/main');assert(oid(env.GITHUB_SHA)&&digest(sourceTreeSha256));
    assert.deepEqual(Object.keys(dependencies).sort(),['getArtifactZip','getJson']);
    const {getJson,getArtifactZip}=dependencies;
    for(const reader of [getJson,getArtifactZip])assert.equal(typeof reader,'function');
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
      const artifactName=targetedSourceArtifactName({pullRequest:pull.number,head:pull.head.sha,sourceTreeSha256});
      const listing=await json(repo+'/actions/artifacts?name='+encodeURIComponent(artifactName)+'&per_page=100');
      assert(Array.isArray(listing.artifacts)&&Number.isSafeInteger(listing.total_count)
        &&listing.total_count>=0&&listing.total_count<=100&&listing.total_count===listing.artifacts.length);
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
      const locator={contractId:TARGETED_SOURCE_CONTRACT,repository:env.GITHUB_REPOSITORY,
        headSha:env.GITHUB_SHA,producerHeadSha:pull.head.sha,sourceTreeSha256,pullRequestNumber:pull.number,
        runId:String(run.id),runAttempt:run.run_attempt,jobId:job.id,artifactId:artifact.id,
        artifactDigest:artifact.digest};
      const phase=runIdentity(run,pull,jobs,locator);verifyArtifact(artifact,locator,phase);
      const bytes=await bounded(getArtifactZip,repo+'/actions/artifacts/'+artifact.id+'/zip',true);
      assert.equal(bytes.length,artifact.size_in_bytes);assert.equal('sha256:'+sha(bytes),artifact.digest);
      const raw=decodeReceipt(bytes,remaining),receipt=JSON.parse(raw);locator.proofSha256=sha(raw);
      locatorIdentity(locator,env);
      assert.equal(receipt.schemaVersion,1);assert.equal(receipt.contractId,TARGETED_SOURCE_CONTRACT);
      assert.equal(receipt.kind,TARGETED_SOURCE_KIND);assert.equal(receipt.scope,'TARGETED_COMMAND_RESULTS_ONLY');
      assert.equal(receipt.artifactName,artifactName);assert.equal(receipt.privatePayloadIncluded,false);
      assert.deepEqual(receipt.current,{repository:locator.repository,head:locator.producerHeadSha,
        sourceTreeSha256,pullRequest:locator.pullRequestNumber,runId:run.id,runAttempt:1,jobId:job.id});
      remaining();
      return {locator,requiresVerification:true,deliveryAuthority:false};
    }
    return required();
  }catch{return required();}
}
