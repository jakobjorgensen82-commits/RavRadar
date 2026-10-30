import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {sourceTreeContentSha256,sourceTreeProofArtifactName} from './lib/source-tree-content.mjs';
import {SOURCE_GATE_CONTRACT,PULL_REQUEST_SOURCE_JOB,PULL_REQUEST_SOURCE_WORKFLOW,SOURCE_GATE_PRODUCERS}
  from './lib/weather-source-gate.mjs';
import {TARGETED_SOURCE_STEP_NAMES} from './source-targeted-consumer.mjs';
import {ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,ORIGIN}
  from './native-postgres-evidence.mjs';
import {ORIGIN as NATIONAL,COMMAND as NATIONAL_COMMAND,ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND}
  from './national584-source-evidence.mjs';

// One tiny owned real Git fixture. APIs, IDs and command-result rows are
// synthetic data. No actual source suite, PostgreSQL, provider or network runs.
const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-targeted-consumer-'));
const identity=fs.lstatSync(root,{bigint:true}),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const git=(args,options={})=>execFileSync('git',['-C',root,...args],{maxBuffer:32*1024*1024,
  timeout:10000,stdio:['pipe','pipe','pipe'],...options});
const text=args=>git(args).toString('utf8').trim();
const write=(file,bytes)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);};
const commit=message=>{git(['add','--all']);git(['commit','-qm',message]);return text(['rev-parse','HEAD']);};
const stamp=n=>'2026-10-30T12:'+String(n).padStart(2,'0')+':00Z';
const zip=(raw,name)=>execFileSync('python',['-c',
  'import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",compression=zipfile.ZIP_DEFLATED); z.writestr(sys.argv[1],sys.stdin.buffer.read()); z.close(); sys.stdout.buffer.write(b.getvalue())',name],
  {input:raw,maxBuffer:65536,timeout:10000,stdio:['pipe','pipe','pipe']});
const copy=value=>structuredClone(value),repo='/repos/'+ORIGIN.repository,actions=repo+'/actions';
const fullRun=50000000001,fullJob=50000000003,fullPr=998,fullFinal=50000000005,fullNative=50000000006;
const selectedRun=50000000002,selectedJob=50000000004,selectedPr=999,selectedArtifact=50000000007;
let cases=0,base,producer,main,baseContent,content,fullReference,fullBody,nativeBody,fullZip,nativeZip;
let receipt,rawReceipt,targetZip,targetMetadata,currentJob,fullSourceJob,json,zips,locator,decide;
const env={GITHUB_REPOSITORY:ORIGIN.repository,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ID:'50000000009'};
function jobs(selected){
  return {id:selected?selectedJob:fullJob,run_id:selected?selectedRun:fullRun,run_attempt:1,
    head_sha:selected?producer:base,name:PULL_REQUEST_SOURCE_JOB,status:'completed',conclusion:'success',
    steps:TARGETED_SOURCE_STEP_NAMES.map((name,index)=>({name,number:index+1,status:'completed',
      conclusion:selected&&index>=5&&index<=19?'skipped':'success',started_at:stamp(index),completed_at:stamp(index+1)}))};
}
function run(selected){return {id:selected?selectedRun:fullRun,run_attempt:1,head_sha:selected?producer:base,
  head_branch:selected?'codex/synthetic-targeted':'codex/synthetic-full',path:PULL_REQUEST_SOURCE_WORKFLOW,
  event:'pull_request',status:'completed',conclusion:'success',repository:{full_name:ORIGIN.repository},
  head_repository:{full_name:ORIGIN.repository},pull_requests:[]};}
function pull(selected){return {number:selected?selectedPr:fullPr,state:'closed',merged_at:stamp(23),
  merge_commit_sha:selected?main:base,head:{sha:selected?producer:base,repo:{full_name:ORIGIN.repository}},
  base:{ref:'main',repo:{full_name:ORIGIN.repository}}};}
function metadata(id,name,body,runId,head,n){return {id,name,digest:'sha256:'+sha(body),expired:false,
  size_in_bytes:body.length,workflow_run:{id:runId,head_sha:head},created_at:stamp(n)};}
function rebuildTarget(){
  rawReceipt=Buffer.from(JSON.stringify(receipt)+'\n');targetZip=zip(rawReceipt,'source-targeted-impact-proof.json');
  targetMetadata=metadata(selectedArtifact,receipt.artifactName,targetZip,selectedRun,producer,22);
  locator={contractId:receipt.contractId,repository:ORIGIN.repository,headSha:main,producerHeadSha:producer,
    sourceTreeSha256:content,pullRequestNumber:selectedPr,runId:String(selectedRun),runAttempt:1,jobId:selectedJob,
    artifactId:selectedArtifact,artifactDigest:targetMetadata.digest,proofSha256:sha(rawReceipt)};
}
function maps(){
  currentJob=jobs(true);fullSourceJob=jobs(false);const nativeMetadata=metadata(fullNative,
    'native586-phase-'+fullRun+'-1-'+base,nativeZip,fullRun,base,17);
  const finalMetadata=metadata(fullFinal,sourceTreeProofArtifactName({pullRequestNumber:fullPr,headSha:base,
    sourceTreeSha256:baseContent}),fullZip,fullRun,base,22);
  json=new Map([[actions+'/runs/'+selectedRun,run(true)],[actions+'/runs/'+fullRun,run(false)],
    [repo+'/pulls/'+selectedPr,pull(true)],[repo+'/pulls/'+fullPr,pull(false)],
    [actions+'/runs/'+selectedRun+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[currentJob]}],
    [actions+'/runs/'+fullRun+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[fullSourceJob]}],
    [actions+'/artifacts/'+selectedArtifact,targetMetadata],[actions+'/artifacts/'+fullNative,nativeMetadata],
    [actions+'/artifacts/'+fullFinal,finalMetadata]]);
  for(const head of [base,main])for(const p of Object.values(SOURCE_GATE_PRODUCERS))
    json.set(actions+'/workflows/'+p.workflowId+'/runs?head_sha='+head+'&branch=main&per_page=100&page=1',
      {total_count:0,workflow_runs:[]});
  zips=new Map([[String(fullFinal),fullZip],[String(fullNative),nativeZip],[String(selectedArtifact),targetZip]]);
}
function dependencies(){
  const reads={json:[],zip:[]};
  return {reads,getJson:async(route,options)=>{reads.json.push(route);assert(options.signal instanceof AbortSignal);
    assert.equal(options.maxBytes,2*1024*1024);assert(json.has(route),'Unexpected synthetic route');return copy(json.get(route));},
    getArtifactZip:async(route,options)=>{reads.zip.push(route);assert.equal(options.maxBytes,65536);
      assert(options.signal instanceof AbortSignal);const id=/\/artifacts\/([0-9]+)\/zip$/.exec(route)?.[1];
      assert(zips.has(id));return Buffer.from(zips.get(id));},readGit:git};
}
function d(deps){return {getJson:deps.getJson,getArtifactZip:deps.getArtifactZip,readGit:deps.readGit};}
function copyModule(name,seen=new Set()){
  if(seen.has(name))return;seen.add(name);const bytes=fs.readFileSync(path.join(SOURCE,name));write(name,bytes);
  for(const match of bytes.toString('utf8').matchAll(/^import\b[^;]*?\bfrom\s*['"](\.[^'"]+)['"]/gm))
    copyModule(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])),seen);
}
try{
  copyModule('scripts/source-targeted-consumer.mjs');
  for(const name of ['package.json','scripts/lib/account-statistics-assistant-package-review.json',
    'js/ui/about-i18n.js','js/ui/about-explainer-i18n.js','js/ui/learn-i18n.js','js/ui/learn-i18n-de.js','js/ui/learn-i18n-en.js'])
    write(name,fs.readFileSync(path.join(SOURCE,name)));
  write('.gitignore','.cache/\n');git(['init','-q']);git(['config','user.name','Synthetic targeted consumer']);
  git(['config','user.email','fixture@example.invalid']);git(['config','core.autocrlf','false']);
  base=commit('synthetic full qualified source');baseContent=sourceTreeContentSha256(base,{git});
  const native={phase:'ASSISTANT_PUBLIC591_SUCCESSOR',commands:[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,
    current:{run:fullRun,attempt:1,head:base,pullRequest:fullPr,branch:'codex/synthetic-full'}};
  const national={status:'EXECUTED',executedInThisRun:true,origin:null,command:NATIONAL_COMMAND,
    sourceScope:'HISTORICAL_584_NATIONAL_ONLY',frozenHead:NATIONAL.head,frozenTree:NATIONAL.tree,
    historicalInput:{head:NATIONAL.head,tree:NATIONAL.tree,content:NATIONAL.content},
    current:{head:base,run:fullRun,attempt:1,pullRequest:fullPr},providerOrProductionProof:false,
    current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,
    currentAssistantLaterH0NationalExecutionClaimed:false,currentAssistantPublic587SuccessorNationalExecutionClaimed:false,
    currentAssistantPublic588SuccessorNationalExecutionClaimed:false,currentAssistantPublic591SuccessorNationalExecutionClaimed:false,
    currentAssistantPublic591SuccessorNative:{status:native.status,executedInThisRun:true,origin:null,
      phase:'assistant-public591-successor',eligibleForReuse:false,separatelyRequired:true},
    currentAssistantPublic591SuccessorSource:{command:'npm run test:assistant-later-h0-source',
      actualCommand:ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true}};
  fullBody={schemaVersion:1,contractId:SOURCE_GATE_CONTRACT,repository:ORIGIN.repository,pullRequestNumber:fullPr,
    headSha:base,sourceTreeSha256:baseContent,privatePayloadIncluded:false,nativePostgres:native,historical584National:national};
  nativeBody={schemaVersion:1,kind:ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,repository:ORIGIN.repository,
    headSha:base,sourceTreeSha256:baseContent,privatePayloadIncluded:false,nativePostgres:copy(native)};
  const fullRaw=Buffer.from(JSON.stringify(fullBody)+'\n');fullZip=zip(fullRaw,'source-tree-content-proof.json');
  nativeZip=zip(Buffer.from(JSON.stringify(nativeBody)+'\n'),'native-postgres-phase-proof.json');
  fullReference={schemaVersion:1,kind:'RAVRADAR_SOURCE_IMPACT_FULL_BASELINE_V1',scope:'FULL_SOURCE',repository:ORIGIN.repository,
    mergeCommit:base,producerHead:base,sourceTreeSha256:baseContent,pullRequest:fullPr,runId:fullRun,runAttempt:1,jobId:fullJob,
    finalArtifactId:fullFinal,finalArtifactDigest:'sha256:'+sha(fullZip),finalProofSha256:sha(fullRaw),
    nativeArtifactId:fullNative,nativeArtifactDigest:'sha256:'+sha(nativeZip),gitTree:text(['rev-parse',base+'^{tree}']),
    historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false};
  git(['checkout','-qb','codex/synthetic-targeted']);
  const about=fs.readFileSync(path.join(root,'js/ui/about-i18n.js'),'utf8');
  const updated=about.replace("'about.header':'Om projektet'","'about.header':'Om RavRadar'");assert.notEqual(updated,about);
  write('js/ui/about-i18n.js',updated);producer=commit('reviewed text only');content=sourceTreeContentSha256(producer,{git});
  const {planSourceImpactFromGit}=await import(pathToFileURL(path.join(root,'scripts/source-impact-git-diff.mjs')).href);
  const {buildTargetedSourceReceipt}=await import(pathToFileURL(path.join(root,'scripts/source-targeted-receipt.mjs')).href);
  const gitPlan=planSourceImpactFromGit({baselineCommit:base,candidateCommit:producer,expectedHead:producer});
  assert.equal(gitPlan.plan.selection,'TARGETED');
  receipt=copy(buildTargetedSourceReceipt({current:{repository:ORIGIN.repository,head:producer,sourceTreeSha256:content,
    pullRequest:selectedPr,runId:selectedRun,runAttempt:1,jobId:selectedJob},fullBaseline:fullReference,gitPlan,
    commandResults:gitPlan.plan.commands.map(command=>({phase:'targeted',command,elapsedMs:1,outcome:'PASS'}))}));
  git(['checkout','-qb','main',base]);git(['merge','--no-ff','-qm','synthetic same-tree reviewed merge','codex/synthetic-targeted']);
  main=text(['rev-parse','HEAD']);env.GITHUB_SHA=main;assert.equal(sourceTreeContentSha256(main,{git}),content);
  ({decideTargetedSourceGate:decide}=await import(pathToFileURL(path.join(root,'scripts/source-targeted-consumer.mjs')).href));
  const canonicalReceipt=copy(receipt);rebuildTarget();maps();
  const check=async mutate=>{receipt=copy(canonicalReceipt);rebuildTarget();maps();const deps=dependencies();mutate?.(deps);
    const result=await decide(locator,env,d(deps));cases++;return {result,deps};};
  const happy=await check();assert.equal(happy.result.required,false);assert.equal(happy.result.scope,'TARGETED_COMMAND_RESULTS_ONLY');
  assert.equal(happy.result.database,'NOT_APPLICABLE');assert.equal(happy.result.national,'NOT_APPLICABLE');
  assert.equal(happy.deps.reads.zip.length,3);
  for(const mutate of [()=>locator.contractId=SOURCE_GATE_CONTRACT,()=>locator.headSha=producer,
    ()=>locator.producerHeadSha=base,()=>locator.runAttempt=2,()=>locator.repository='other/repo']){
    const {result,deps}=await check(mutate);assert.equal(result.required,true);assert.equal(deps.reads.zip.length,0);
  }
  for(const mutate of [()=>currentJob.steps[4].conclusion='skipped',()=>currentJob.steps[20].conclusion='failure',
    ()=>currentJob.steps[21].conclusion='skipped',()=>currentJob.steps[15].conclusion='success',
    ()=>currentJob.steps[17].status='in_progress',()=>currentJob.steps.push(copy(currentJob.steps[4])),
    ()=>json.get(repo+'/pulls/'+selectedPr).head.sha=base,()=>json.get(actions+'/runs/'+selectedRun).run_attempt=2,
    ()=>targetMetadata.expired=true]){
    const {result,deps}=await check(mutate);assert.equal(result.required,true);assert.equal(deps.reads.zip.length,0);
  }
  for(const mutate of [()=>receipt.database.executed=true,()=>receipt.reportedCommandResults[0].outcome='FAIL',
    ()=>receipt.impact.rawInventorySha256='f'.repeat(64),()=>receipt.current.head=main,
    ()=>receipt.baselineReference.finalProofSha256='0'.repeat(64)]){
    const {result}=await check(()=>{mutate();rebuildTarget();maps();});assert.equal(result.required,true);
  }
  const badBaseline=await check(()=>{fullSourceJob.steps[17].conclusion='skipped';});assert.equal(badBaseline.result.required,true);
  const wrongParent=await check(deps=>{const original=deps.readGit;deps.readGit=(args,options)=>args[0]==='rev-list'
    ?Buffer.from(main+' '+base+' '+'f'.repeat(40)+'\n'):original(args,options);});
  assert.equal(wrongParent.result.required,true);assert.equal(wrongParent.deps.reads.zip.length,0);
  const corrupt=await check(()=>{const bytes=Buffer.from(targetZip);bytes[0]^=1;zips.set(String(selectedArtifact),bytes);});
  assert.equal(corrupt.result.required,true);assert.equal(corrupt.deps.reads.zip.length,1);
  const later=await check(()=>{
    const p=Object.values(SOURCE_GATE_PRODUCERS)[0],id=50000000008;
    json.set(actions+'/workflows/'+p.workflowId+'/runs?head_sha='+main+'&branch=main&per_page=100&page=1',
      {total_count:1,workflow_runs:[{id,run_attempt:1,head_sha:main,head_branch:'main',repository:{full_name:ORIGIN.repository},
        path:'.github/workflows/update-and-deploy.yml',conclusion:'failure',updated_at:stamp(30)}]});
    json.set(actions+'/runs/'+id+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[{name:p.gates[0].job,
      run_id:id,run_attempt:1,head_sha:main,conclusion:'failure',steps:[{name:p.gates[0].step,status:'in_progress',conclusion:null}]}]});
  });assert.equal(later.result.required,true);assert.equal(later.result.reason,'later-source-unresolved');
  const drift=await check(deps=>{const read=deps.getJson;let times=0;deps.getJson=async(route,...args)=>{
    const value=await read(route,...args);if(route===actions+'/runs/'+selectedRun&&++times===2)value.run_attempt=2;return value;};});
  assert.equal(drift.result.required,true);
  const fresh=await check();assert.equal(fresh.result.required,false);
  console.log(JSON.stringify({cases,passed:cases,failed:0,realGitFixture:true,syntheticReceipts:true,
    sourceCommandsExecuted:0,liveApiCalls:0,sqlExecuted:false,production:false}));
}finally{
  const current=fs.lstatSync(root,{bigint:true});assert(current.isDirectory()&&!current.isSymbolicLink());
  assert.equal(current.dev,identity.dev);assert.equal(current.ino,identity.ino);assert.equal(current.birthtimeNs,identity.birthtimeNs);
  assert.equal(fs.realpathSync(root),root);assert.equal(path.dirname(root),temporary);assert(root.startsWith(path.join(temporary,'rr-targeted-consumer-')));
  fs.rmSync(root,{recursive:true});
}
