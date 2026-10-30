import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {decideSourceGate,SOURCE_GATE_CONTRACT,PULL_REQUEST_SOURCE_JOB,
  PULL_REQUEST_SOURCE_WORKFLOW,PULL_REQUEST_SOURCE_STEPS} from './lib/weather-source-gate.mjs';
import {sourceTreeContentSha256,sourceTreeProofArtifactName} from './lib/source-tree-content.mjs';
import {verifyAssistantPublic591SuccessorPhaseReceipt,verifyAssistantPublic591V2PhaseReceipt,
  verifyAssistantPublic591Metadata,ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,
  ASSISTANT_PUBLIC591_V2_KIND,sourceImpactEvidenceBudget} from './native-postgres-evidence.mjs';
import {ORIGIN as NATIONAL_ORIGIN,COMMAND as NATIONAL_COMMAND,STEP as NATIONAL_STEP,
  ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND}
  from './national584-source-evidence.mjs';

export const SOURCE_IMPACT_FULL_BASELINE_KIND='RAVRADAR_SOURCE_IMPACT_FULL_BASELINE_V1';
export const SOURCE_IMPACT_FULL_REFERENCE_KEYS=Object.freeze(['repository','mergeCommit','producerHead',
  'sourceTreeSha256','pullRequest','runId','runAttempt','jobId','finalArtifactId','finalArtifactDigest',
  'finalProofSha256','nativeArtifactId','nativeArtifactDigest']);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const one=rows=>{assert.equal(rows.length,1);return rows[0];};
const positive=value=>assert(Number.isSafeInteger(value)&&value>0);
const success=value=>value?.status==='completed'&&value.conclusion==='success';
const time=value=>{const n=Date.parse(value);assert(Number.isFinite(n));return n;};
const NATIVE_UPLOAD='Upload independently completed native586 PostgreSQL phase';
const SOURCE_UNCHANGED='Require validated source tree to remain unchanged';
const FINAL_UPLOAD='Upload tree-content source validation proof';
const ZIP_LIMIT=65536,JSON_LIMIT=32768,API_LIMIT=2*1024*1024;

function validateReference(value){
  assert(value&&Object.getPrototypeOf(value)===Object.prototype);
  assert.deepEqual(Object.keys(value).sort(),[...SOURCE_IMPACT_FULL_REFERENCE_KEYS].sort());
  assert.equal(value.repository,NATIONAL_ORIGIN.repository);
  for(const key of ['mergeCommit','producerHead'])assert.match(value[key],/^[a-f0-9]{40}$/);
  for(const key of ['sourceTreeSha256','finalArtifactDigest','nativeArtifactDigest'])
    assert.match(value[key],/^sha256:[a-f0-9]{64}$/);
  assert.match(value.finalProofSha256,/^[a-f0-9]{64}$/);
  for(const key of ['pullRequest','runId','runAttempt','jobId','finalArtifactId','nativeArtifactId'])positive(value[key]);
  assert.equal(value.runAttempt,1);assert.notEqual(value.finalArtifactId,value.nativeArtifactId);
}

// The ZIP is decoded here, rather than accepting caller-supplied unbound JSON.
// Python's normal ZIP reader checks CRC and central directory. Nothing extracts
// to disk; one exact, bounded entry is permitted and no raw data is logged.
function decodeArtifact(zip,name,remainingBudget){
  assert(Buffer.isBuffer(zip)&&zip.length>0&&zip.length<=ZIP_LIMIT);
  const remaining=remainingBudget();
  const raw=execFileSync('python',['-c',[
    'import io,sys,zipfile',
    'z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))',
    'assert z.namelist()==[sys.argv[1]]',
    'i=z.infolist()[0]',
    'assert not i.is_dir() and 0<i.file_size<=32768 and not (i.flag_bits & 1)',
    'sys.stdout.buffer.write(z.read(i))',
  ].join(';'),name],{input:zip,maxBuffer:JSON_LIMIT,timeout:Math.min(10000,Math.max(1,Math.floor(remaining))),
    stdio:['pipe','pipe','pipe']});
  remainingBudget();assert(raw.length>0&&raw.length<=JSON_LIMIT);return raw;
}

function artifactMetadata(metadata,reference,kind,phase){
  const native=kind==='native',id=native?reference.nativeArtifactId:reference.finalArtifactId;
  const digest=native?reference.nativeArtifactDigest:reference.finalArtifactDigest;
  const name=native?'native586-phase-'+reference.runId+'-1-'+reference.producerHead:
    sourceTreeProofArtifactName({pullRequestNumber:reference.pullRequest,headSha:reference.producerHead,
      sourceTreeSha256:reference.sourceTreeSha256});
  assert.equal(metadata.id,id);assert.equal(metadata.name,name);assert.equal(metadata.digest,digest);
  assert.equal(metadata.expired,false);assert.equal(metadata.workflow_run?.id,reference.runId);
  assert.equal(metadata.workflow_run?.head_sha,reference.producerHead);
  positive(metadata.size_in_bytes);assert(metadata.size_in_bytes<=ZIP_LIMIT);
  const start=native?phase.pgStartedAt:phase.finalStartedAt;
  const end=native?phase.uploadedAt:phase.finalCompletedAt;
  assert(time(metadata.created_at)>=time(start)&&time(metadata.created_at)<=time(end));return metadata;
}

function nativeProof(proof,reference,current){
  assert([1,2].includes(proof.schemaVersion));
  assert.equal(proof.kind,proof.schemaVersion===2?ASSISTANT_PUBLIC591_V2_KIND:ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND);
  assert.equal(proof.repository,reference.repository);assert.equal(proof.headSha,reference.producerHead);
  assert.equal(proof.sourceTreeSha256,reference.sourceTreeSha256);assert.equal(proof.privatePayloadIncluded,false);
  const native=proof.nativePostgres;
  if(proof.schemaVersion===2)verifyAssistantPublic591V2PhaseReceipt(native,current);
  else verifyAssistantPublic591SuccessorPhaseReceipt(native,current);
  return native;
}

function historicalNational(proof,current,native){
  const national=proof.historical584National;
  assert(national&&['EXECUTED','REUSED'].includes(national.status));
  assert.equal(national.executedInThisRun,national.status==='EXECUTED');
  assert.equal(national.command,NATIONAL_COMMAND);assert.deepEqual(national.current,
    {head:current.head,run:current.run,attempt:current.attempt,pullRequest:current.pullRequest});
  assert.equal(national.providerOrProductionProof,false);
  assert.equal(national.historicalInput?.head,NATIONAL_ORIGIN.head);
  assert.equal(national.historicalInput?.tree,NATIONAL_ORIGIN.tree);
  assert.equal(national.historicalInput?.content,NATIONAL_ORIGIN.content);
  for(const key of ['current585NationalExecutionClaimed','current586NationalExecutionClaimed',
    'currentAssistantLaterH0NationalExecutionClaimed','currentAssistantPublic587SuccessorNationalExecutionClaimed',
    'currentAssistantPublic588SuccessorNationalExecutionClaimed','currentAssistantPublic591SuccessorNationalExecutionClaimed'])
    assert.equal(national[key],false);
  for(const [key,value]of Object.entries(national))if(key.endsWith('NationalExecutionClaimed'))assert.equal(value,false);
  const claim=national.currentAssistantPublic591SuccessorNative;
  assert.equal(claim?.status,native.status);assert.equal(claim.executedInThisRun,native.executedInThisRun);
  assert.deepEqual(claim.origin,native.origin);assert.equal(claim.separatelyRequired,true);
  assert.equal(claim.phase,'assistant-public591-successor');assert.equal(claim.eligibleForReuse,native.eligibleForReuse);
  assert.deepEqual(national.currentAssistantPublic591SuccessorSource,{command:'npm run test:assistant-later-h0-source',
    actualCommand:ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true});
  if(national.status==='EXECUTED'){
    assert.equal(national.sourceScope,'HISTORICAL_584_NATIONAL_ONLY');assert.equal(national.origin,null);
    assert.equal(national.frozenHead,NATIONAL_ORIGIN.head);assert.equal(national.frozenTree,NATIONAL_ORIGIN.tree);
  }else{
    assert.equal(national.sourceScope,'HISTORICAL_584_ONLY');assert.deepEqual(national.origin,NATIONAL_ORIGIN);
    assert.equal(national.artifactSha256,NATIONAL_ORIGIN.zipSha256);
    assert(Array.isArray(national.branchAudits)&&national.branchAudits.length>0);
    for(const audit of national.branchAudits){assert.equal(audit.complete,true);positive(audit.runs);}
  }
}

// No network is performed unless the normal caller supplies bounded readers.
// Unknown/missing evidence returns no cheap-path authority. This never upgrades
// a TARGETED qualification or a main-source-only locator into a FULL baseline.
export async function qualifySourceImpactFullBaseline(input,dependencies){
  // One acceptance deadline covers local Git, asynchronous evidence reads,
  // synchronous ZIP decoding and final freshness checks. Synchronous processes
  // receive the remaining timeout; a callback that ignores it may return late,
  // but late work can never produce a qualified result. This is not an OS-level
  // guarantee that an uncooperative injected callback is physically stopped.
  const deadline=performance.now()+60000;
  let sharedBudget=null;
  const remainingBudget=()=>{const remaining=sharedBudget?sharedBudget.remaining():deadline-performance.now();
    assert(remaining>0);return remaining;};
  const refused=()=>({schemaVersion:1,status:'REFUSED',failureCode:'SOURCE_IMPACT_FULL_BASELINE_UNAVAILABLE',
    cheapPlanAvailable:false,deliveryAuthority:false});
  try{
    assert.equal(arguments.length,2);
    assert.deepEqual(Object.keys(input).sort(),['candidateCommit','reference']);
    validateReference(input.reference);const reference=structuredClone(input.reference);
    assert.match(input.candidateCommit,/^[a-f0-9]{40}$/);
    assert.deepEqual(Object.keys(dependencies).sort(),['getArtifactZip','getJson','readGit']);
    const {getJson,getArtifactZip,readGit}=dependencies;
    for(const fn of [getJson,getArtifactZip,readGit])assert.equal(typeof fn,'function');
    sharedBudget=sourceImpactEvidenceBudget(getJson,getArtifactZip);
    const git=(args,options)=>{const remaining=remainingBudget();
      const value=readGit(args,{...options,timeout:Math.min(10000,Math.max(1,Math.floor(remaining)))});
      remainingBudget();assert(Buffer.isBuffer(value));assert(value.length<=512*1024*1024);return value;};
    const text=args=>git(args).toString('utf8').trim();
    const assertHead=()=>{assert.equal(text(['rev-parse','HEAD']),input.candidateCommit);
      assert.equal(text(['for-each-ref','refs/replace']),'');};
    // Historical source proof authenticates Git objects. Central runtime
    // hydration is governed by the normal runtime gates, not this old source.
    assertHead();assert.equal(text(['rev-parse','--is-shallow-repository']),'false');
    git(['merge-base','--is-ancestor',reference.mergeCommit,input.candidateCommit]);
    const gitTree=text(['rev-parse',reference.mergeCommit+'^{tree}']);assert.match(gitTree,/^[a-f0-9]{40}$/);
    assert.equal(text(['rev-parse',reference.producerHead+'^{tree}']),gitTree);
    assert.equal(sourceTreeContentSha256(reference.mergeCommit,{git}),reference.sourceTreeSha256);
    const base='/repos/'+reference.repository+'/actions',seen=new Map();let calls=0;
    const checked=(value,zip)=>{remainingBudget();
      if(zip){assert(Buffer.isBuffer(value)&&value.length<=ZIP_LIMIT);return value;}
      const raw=JSON.stringify(value);assert(Buffer.byteLength(raw)<=API_LIMIT);return JSON.parse(raw);};
    async function bounded(reader,route,zip=false){
      if(sharedBudget)return checked(await reader(route),zip);
      assert(++calls<=64);const timeout=Math.min(15000,remainingBudget());
      const controller=new AbortController();let timer;
      try{
        const value=await Promise.race([reader(route,{maxBytes:zip?ZIP_LIMIT:API_LIMIT,signal:controller.signal}),
          new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('BOUND'));},timeout);})]);
        return checked(value,zip);
      }finally{clearTimeout(timer);controller.abort();}
    }
    const json=async route=>{const value=await bounded(getJson,route);seen.set(route,value);return value;};
    const record={contractId:SOURCE_GATE_CONTRACT,repository:reference.repository,headSha:reference.mergeCommit,
      sourceTreeSha256:reference.sourceTreeSha256,proofKind:'pull-request',pullRequestNumber:reference.pullRequest,
      producerHeadSha:reference.producerHead,runHeadSha:reference.producerHead,runId:String(reference.runId),
      runAttempt:reference.runAttempt,conclusion:'success'};
    const decision=await decideSourceGate(record,{GITHUB_REPOSITORY:reference.repository,GITHUB_SHA:reference.mergeCommit,
      GITHUB_REF:'refs/heads/main',GITHUB_RUN_ID:'0'},json,{sourceTreeSha256:reference.sourceTreeSha256});
    assert.equal(decision.required,false);
    const runRoute=base+'/runs/'+reference.runId,jobsRoute=runRoute+'/attempts/1/jobs?per_page=100';
    const run=seen.get(runRoute),jobs=seen.get(jobsRoute);assert(run&&jobs);
    assert.equal(run.path,PULL_REQUEST_SOURCE_WORKFLOW);
    const job=one(jobs.jobs.filter(value=>value.name===PULL_REQUEST_SOURCE_JOB));assert.equal(job.id,reference.jobId);
    const names=[...PULL_REQUEST_SOURCE_STEPS,NATIVE_UPLOAD,NATIONAL_STEP,
      'Validate durable Copernicus current-reference baseline on artificial data only',
      'Validate download-inclusive DMI capacity on artificial data only'];
    for(const name of names)assert(success(one(job.steps.filter(value=>value.name===name))));
    const phase=verifyAssistantPublic591Metadata(run,jobs);
    const nationalStep=one(job.steps.filter(value=>value.name===NATIONAL_STEP));assert.equal(nationalStep.number,18);
    const unchanged=one(job.steps.filter(value=>value.name===SOURCE_UNCHANGED));assert.equal(unchanged.number,21);
    const final=one(job.steps.filter(value=>value.name===FINAL_UPLOAD));assert.equal(final.number,22);
    assert(time(phase.uploadedAt)<=time(nationalStep.started_at));
    assert(time(nationalStep.completed_at)<=time(unchanged.started_at));
    assert(time(unchanged.completed_at)<=time(final.started_at));
    Object.assign(phase,{finalStartedAt:final.started_at,finalCompletedAt:final.completed_at});
    const metadata={},raw={};
    for(const kind of ['native','final']){
      const id=kind==='native'?reference.nativeArtifactId:reference.finalArtifactId;
      const route=base+'/artifacts/'+id;
      metadata[kind]=artifactMetadata(await json(route),reference,kind,phase);
      const zip=await bounded(getArtifactZip,route+'/zip',true);
      assert.equal(zip.length,metadata[kind].size_in_bytes);assert.equal('sha256:'+sha(zip),metadata[kind].digest);
      raw[kind]=decodeArtifact(zip,kind==='native'?'native-postgres-phase-proof.json':'source-tree-content-proof.json',remainingBudget);
    }
    assert.equal(sha(raw.final),reference.finalProofSha256);
    const full=JSON.parse(raw.final),phaseProof=JSON.parse(raw.native);
    assert.equal(full.schemaVersion,1);assert.equal(full.contractId,SOURCE_GATE_CONTRACT);
    assert.equal(full.repository,reference.repository);assert.equal(full.pullRequestNumber,reference.pullRequest);
    assert.equal(full.headSha,reference.producerHead);assert.equal(full.sourceTreeSha256,reference.sourceTreeSha256);
    assert.equal(full.privatePayloadIncluded,false);assert.equal(full.qualification,undefined);
    const current={run:reference.runId,attempt:1,head:reference.producerHead,
      pullRequest:reference.pullRequest,branch:run.head_branch};
    const native=nativeProof(phaseProof,reference,current);assert.deepEqual(full.nativePostgres,native);
    historicalNational(full,current,native);
    assert.deepEqual(await json(runRoute),run);
    for(const kind of ['native','final'])assert.deepEqual(await json(base+'/artifacts/'+metadata[kind].id),metadata[kind]);
    assertHead();
    remainingBudget();
    return {schemaVersion:1,kind:SOURCE_IMPACT_FULL_BASELINE_KIND,scope:'FULL_SOURCE',...reference,gitTree,
      historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false};
  }catch{return refused();}
}
