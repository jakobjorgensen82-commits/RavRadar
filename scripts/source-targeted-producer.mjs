import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {planSourceImpactFromGit} from './source-impact-git-diff.mjs';
import {qualifySourceImpactFullBaseline,SOURCE_IMPACT_FULL_BASELINE_KIND} from './source-impact-full-baseline.mjs';
import {buildTargetedSourceReceipt} from './source-targeted-receipt.mjs';
import {assistantPublic591Reader,sourceImpactEvidenceAccess,ORIGIN} from './native-postgres-evidence.mjs';
import {discoverPullRequestSourceGate,PULL_REQUEST_SOURCE_JOB,PULL_REQUEST_SOURCE_WORKFLOW}
  from './lib/weather-source-gate.mjs';
import {sourceTreeContentSha256,sourceTreeProofArtifactName} from './lib/source-tree-content.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const RECEIPT='.cache/source-targeted-impact-proof.json',LIMIT=65536;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const positive=value=>Number.isSafeInteger(value)&&value>0;
const one=rows=>{assert.equal(rows.length,1);return rows[0];};
const gitEnv=()=>({...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
  LANG:'C',LC_ALL:'C',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
const git=(args,options={})=>execFileSync('git',['-C',ROOT,...args],{maxBuffer:512*1024*1024,
  timeout:10000,env:gitEnv(),stdio:['pipe','pipe','pipe'],...options});
const text=args=>git(args).toString('utf8').trim();
function clean(head){
  assert.equal(text(['rev-parse','HEAD']),head);
  assert.equal(text(['status','--porcelain','--untracked-files=no']),'');
  assert.equal(text(['for-each-ref','refs/replace']),'');
  assert.equal(text(['rev-parse','--is-shallow-repository']),'false');
}
const full=reasonCode=>({schemaVersion:1,selection:'FULL',reasonCode,targetedCommandsExecuted:0,
  receiptWritten:false,deliveryAuthority:false});
function finalProofHash(zip){
  assert(Buffer.isBuffer(zip)&&zip.length>0&&zip.length<=LIMIT);
  const raw=execFileSync('python',['-c',[
    'import io,sys,zipfile','z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))',
    'assert z.namelist()==["source-tree-content-proof.json"]','i=z.infolist()[0]',
    'assert not i.is_dir() and 0<i.file_size<=32768 and not (i.flag_bits & 1)',
    'sys.stdout.buffer.write(z.read(i))',
  ].join(';')],{input:zip,maxBuffer:32768,timeout:10000,stdio:['pipe','pipe','pipe']});
  assert(raw.length>0&&raw.length<=32768);return sha(raw);
}
function currentJob(result,current){
  assert(result&&Array.isArray(result.jobs)&&result.total_count===result.jobs.length&&result.jobs.length<=100);
  const job=one(result.jobs.filter(row=>row.name===PULL_REQUEST_SOURCE_JOB));
  assert(positive(job.id));assert.equal(job.run_id,current.runId);assert.equal(job.run_attempt,current.runAttempt);
  assert.equal(job.head_sha,current.head);assert.equal(job.status,'in_progress');return job.id;
}

// No caller-selected baseline, root, paths, commands, modes or dependency skips.
// FULL is a handoff to the existing digest/deep workflow, not a green receipt.
export async function coordinateTargetedSourceProducer(){
  assert.equal(arguments.length,0,'SOURCE_TARGETED_PRODUCER_NO_OVERRIDES');
  const env=process.env,head=env.SOURCE_GATE_HEAD_SHA;
  let current,content,gitPlan,baseline,get,jobRoute,pullRoute,pull;
  try{
    assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
    assert(oid(head));clean(head);
    const pullRequest=Number(env.PULL_REQUEST_NUMBER),runId=Number(env.GITHUB_RUN_ID),runAttempt=Number(env.GITHUB_RUN_ATTEMPT);
    for(const id of [pullRequest,runId,runAttempt])assert(positive(id));
    assert.equal(runAttempt,1);assert.equal(env.GITHUB_JOB,'validate');
    get=assistantPublic591Reader();const repo='/repos/'+env.GITHUB_REPOSITORY;
    pullRoute=repo+'/pulls/'+pullRequest;pull=await get(pullRoute);
    assert.equal(pull.number,pullRequest);assert.equal(pull.state,'open');
    assert.equal(pull.head?.sha,head);assert.equal(pull.head?.repo?.full_name,env.GITHUB_REPOSITORY);
    assert.equal(pull.base?.ref,'main');assert.equal(pull.base?.repo?.full_name,env.GITHUB_REPOSITORY);
    assert(oid(pull.base.sha));
    const mergeBase=text(['merge-base','--all',pull.base.sha,head]);assert(oid(mergeBase));
    gitPlan=planSourceImpactFromGit({baselineCommit:mergeBase,candidateCommit:head,expectedHead:head});
    if(gitPlan.status!=='PLANNED'||gitPlan.plan.selection!=='TARGETED')return full('COMPLETE_DIFF_REQUIRES_FULL');
    content=sourceTreeContentSha256(head,{git});current={repository:env.GITHUB_REPOSITORY,head,
      sourceTreeSha256:content,pullRequest,runId,runAttempt,jobId:0};
    const runRoute=repo+'/actions/runs/'+runId,run=await get(runRoute);
    assert.equal(run.id,runId);assert.equal(run.run_attempt,runAttempt);assert.equal(run.head_sha,head);
    assert.equal(run.event,'pull_request');assert.equal(run.path,PULL_REQUEST_SOURCE_WORKFLOW);
    assert.equal(run.status,'in_progress');assert.equal(run.repository?.full_name,current.repository);
    assert.equal(run.head_repository?.full_name,current.repository);
    jobRoute=runRoute+'/attempts/'+runAttempt+'/jobs?per_page=100';current.jobId=currentJob(await get(jobRoute),current);
    // One bounded first-parent search. A TARGETED predecessor is never promoted
    // to FULL: its separate namespace is not found by the normal FULL locator.
    const candidates=text(['rev-list','--first-parent','--max-count=6',mergeBase]).split('\n');
    assert(candidates.length>0&&candidates.every(oid));
    for(const candidate of candidates){
      const plan=planSourceImpactFromGit({baselineCommit:candidate,candidateCommit:head,expectedHead:head});
      // Older ancestry can only add paths. Unknown/shared cumulative impact
      // needs the existing full workflow, without downloading private blobs.
      if(plan.status!=='PLANNED'||plan.plan.selection!=='TARGETED')return full('CUMULATIVE_DIFF_REQUIRES_FULL');
      const sourceTreeSha256=sourceTreeContentSha256(candidate,{git});
      const located=await discoverPullRequestSourceGate({GITHUB_REPOSITORY:current.repository,GITHUB_REF:'refs/heads/main',
        GITHUB_SHA:candidate},sourceTreeSha256,route=>get(route));
      if(located.required)continue;
      const record=located.record;assert.equal(record.proofKind,'pull-request');assert.equal(record.runAttempt,1);
      const listing=await get(repo+'/actions/runs/'+record.runId+'/artifacts?per_page=100');
      assert(Array.isArray(listing.artifacts)&&listing.total_count===listing.artifacts.length&&listing.total_count<=100);
      const artifactName=sourceTreeProofArtifactName({pullRequestNumber:record.pullRequestNumber,
        headSha:record.producerHeadSha,sourceTreeSha256});
      const final=one(listing.artifacts.filter(row=>row.name===artifactName&&row.expired===false));
      const native=one(listing.artifacts.filter(row=>row.name==='native586-phase-'+record.runId+'-1-'+record.producerHeadSha
        &&row.expired===false));
      for(const artifact of [final,native]){
        assert(positive(artifact.id)&&positive(artifact.size_in_bytes)&&artifact.size_in_bytes<=LIMIT);
        assert.equal(artifact.workflow_run?.id,Number(record.runId));assert.equal(artifact.workflow_run?.head_sha,record.producerHeadSha);
        assert.match(artifact.digest,/^sha256:[a-f0-9]{64}$/);
      }
      const zipRoute=repo+'/actions/artifacts/'+final.id+'/zip',zip=await get(zipRoute,{zip:true});
      assert.equal(zip.length,final.size_in_bytes);assert.equal('sha256:'+sha(zip),final.digest);
      const jobs=await get(repo+'/actions/runs/'+record.runId+'/attempts/1/jobs?per_page=100');
      assert(jobs.total_count===jobs.jobs.length&&jobs.jobs.length<=100);
      const reference={repository:current.repository,mergeCommit:candidate,producerHead:record.producerHeadSha,
        sourceTreeSha256,pullRequest:record.pullRequestNumber,runId:Number(record.runId),runAttempt:1,
        jobId:one(jobs.jobs.filter(row=>row.name===PULL_REQUEST_SOURCE_JOB)).id,
        finalArtifactId:final.id,finalArtifactDigest:final.digest,finalProofSha256:finalProofHash(zip),
        nativeArtifactId:native.id,nativeArtifactDigest:native.digest};
      // One closed source phase covers the complete FULL qualification and
      // signed ZIP redirects. The native/discovery default remains 24/60.
      const qualification=sourceImpactEvidenceAccess();
      const qualified=await qualifySourceImpactFullBaseline({reference,candidateCommit:head},
        {...qualification,readGit:git});
      if(qualified.kind!==SOURCE_IMPACT_FULL_BASELINE_KIND)return full('FULL_BASELINE_NOT_QUALIFIED');
      baseline=qualified;gitPlan=plan;break;
    }
    if(!baseline)return full('NO_QUALIFIED_FULL_ANCESTOR');
    clean(head);assert.equal(sourceTreeContentSha256(head,{git}),content);
  }catch{return full('TARGETED_PRECONDITION_UNAVAILABLE');}

  // From the first selected command onward, a failure or source drift is RED.
  // It must never become a successful FULL handoff or partial TARGETED proof.
  const commandResults=[];
  for(const command of gitPlan.plan.commands){
    assert.match(command,/^node(?: [A-Za-z0-9_./:-]+)+$/);
    clean(head);
    const start=performance.now(),result=spawnSync(process.execPath,command.split(' ').slice(1),
      {cwd:ROOT,stdio:'inherit',shell:false,timeout:300000});
    const row={phase:'targeted',command,elapsedMs:Math.max(0,Math.round(performance.now()-start)),
      outcome:result.status===0&&!result.error&&!result.signal?'PASS':'FAIL'};
    console.log('SOURCE_TIME '+JSON.stringify(row));commandResults.push(row);
    assert.equal(row.outcome,'PASS','SOURCE_TARGETED_PRODUCER_COMMAND_FAILED');
  }
  clean(head);assert.equal(sourceTreeContentSha256(head,{git}),content);
  const finalPlan=planSourceImpactFromGit({baselineCommit:baseline.mergeCommit,candidateCommit:head,expectedHead:head});
  assert(isDeepStrictEqual(finalPlan,gitPlan),'SOURCE_TARGETED_PRODUCER_DIFF_MOVED');
  // Fresh post-test transport, exactly two reads, irrespective of test duration.
  const finalGet=assistantPublic591Reader(),freshPull=await finalGet(pullRoute);
  assert.equal(freshPull.number,current.pullRequest);assert.equal(freshPull.state,'open');
  assert.equal(freshPull.head?.sha,head);assert.equal(freshPull.base?.sha,pull.base.sha);
  assert.equal(freshPull.head?.repo?.full_name,current.repository);
  assert.equal(freshPull.base?.repo?.full_name,current.repository);assert.equal(freshPull.base?.ref,'main');
  assert.equal(currentJob(await finalGet(jobRoute),current),current.jobId);
  const receipt=buildTargetedSourceReceipt({current,fullBaseline:baseline,gitPlan,commandResults});
  clean(head);assert.equal(sourceTreeContentSha256(head,{git}),content);
  return {schemaVersion:1,selection:'TARGETED',reasonCode:'QUALIFIED_FULL_ANCESTOR_AND_SELECTED_COMMANDS_PASS',
    sourceTreeSha256:content,artifactName:receipt.artifactName,receiptPath:RECEIPT,receipt,
    targetedCommandsExecuted:commandResults.length,deliveryAuthority:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    assert.equal(process.argv.length,2,'SOURCE_TARGETED_PRODUCER_NO_OPTIONS');
    const result=await coordinateTargetedSourceProducer();
    if(result.selection==='TARGETED'){
      const cache=path.join(ROOT,'.cache');if(!fs.existsSync(cache))fs.mkdirSync(cache);
      assert(fs.lstatSync(cache).isDirectory()&&!fs.lstatSync(cache).isSymbolicLink());
      fs.writeFileSync(path.join(ROOT,RECEIPT),JSON.stringify(result.receipt)+'\n',{flag:'wx'});
    }
    const fields={selection:result.selection,reason_code:result.reasonCode};
    if(result.selection==='TARGETED')Object.assign(fields,{artifact_name:result.artifactName,
      receipt_path:result.receiptPath,source_tree_sha256:result.sourceTreeSha256});
    fs.appendFileSync(process.env.GITHUB_OUTPUT,Object.entries(fields).map(([key,value])=>key+'='+value+'\n').join(''));
    console.log('SOURCE_IMPACT '+JSON.stringify({...fields,targetedCommandsExecuted:result.targetedCommandsExecuted}));
  }catch{console.error('SOURCE_TARGETED_PRODUCER_FAILED');process.exitCode=1;}
}
