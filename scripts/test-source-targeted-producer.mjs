import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {expandSourceCommands} from './validate-source-once.mjs';
import {sourceTreeContentSha256,sourceTreeProofArtifactName} from './lib/source-tree-content.mjs';
import {SOURCE_GATE_CONTRACT,PULL_REQUEST_SOURCE_JOB,PULL_REQUEST_SOURCE_STEPS,PULL_REQUEST_SOURCE_WORKFLOW,
  SOURCE_GATE_PRODUCERS} from './lib/weather-source-gate.mjs';
import {ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,ORIGIN}
  from './native-postgres-evidence.mjs';
import {ORIGIN as NATIONAL,COMMAND as NATIONAL_COMMAND,STEP as NATIONAL_STEP,
  ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND} from './national584-source-evidence.mjs';

// Actual normal coordinator and child-process execution; tiny local fixtures,
// synthetic GitHub/artifacts and synthetic target script bodies. No product
// suite, native SQL, live API, provider, production or historical data is used.
const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temp,'rr-targeted-producer-'));
const owned=fs.lstatSync(root,{bigint:true}),oldEnv={...process.env},oldFetch=globalThis.fetch;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const git=(args,options={})=>execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:32*1024*1024,
  stdio:['pipe','pipe','pipe'],...options});
const write=(name,body)=>{const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body);};
const commit=message=>{git(['add','--all']);git(['commit','-qm',message]);return git(['rev-parse','HEAD']).trim();};
const count=()=>fs.existsSync(path.join(root,'.cache/executions.jsonl'))
  ?fs.readFileSync(path.join(root,'.cache/executions.jsonl'),'utf8').trim().split('\n').filter(Boolean).length:0;
const stamp=n=>'2026-10-30T12:'+String(n).padStart(2,'0')+':00Z';
const zip=(raw,name)=>execFileSync('python',['-c',
  'import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",compression=zipfile.ZIP_DEFLATED); z.writestr(sys.argv[1],sys.stdin.buffer.read()); z.close(); sys.stdout.buffer.write(b.getvalue())',name],
  {input:raw,maxBuffer:65536,timeout:10000,stdio:['pipe','pipe','pipe']});
let cases=0,executions=0,calls=0,signedCalls=0,cliTransportCalls=0,coordinate,base,head,content,full,phase,job,json,zips;
const currentRun=50000000002,baselineRun=50000000001,baselineJob=50000000003;
const currentJob=50000000004,finalId=50000000005,nativeId=50000000006,pr=999,baselinePr=998;
const repo='/repos/'+ORIGIN.repository,actions=repo+'/actions';
const state={missing:false,badNational:false,badJob:false,movedPull:false,laterInspections:false,transportRoutes:false,postFailure:false};
function copyModule(name,seen=new Set()){
  if(seen.has(name))return;seen.add(name);const bytes=fs.readFileSync(path.join(SOURCE,name));write(name,bytes);
  for(const m of bytes.toString('utf8').matchAll(/^import\b[^;]*?\bfrom\s*['"](\.[^'"]+)['"]/gm))
    copyModule(path.posix.normalize(path.posix.join(path.posix.dirname(name),m[1])),seen);
}
function rebuild(){
  const rawFinal=Buffer.from(JSON.stringify(full)+'\n'),rawNative=Buffer.from(JSON.stringify(phase)+'\n');
  const finalZip=zip(rawFinal,'source-tree-content-proof.json'),nativeZip=zip(rawNative,'native-postgres-phase-proof.json');
  const name=sourceTreeProofArtifactName({pullRequestNumber:baselinePr,headSha:base,sourceTreeSha256:content});
  const metadata=(id,name,body,n)=>({id,name,digest:'sha256:'+hash(body),expired:false,size_in_bytes:body.length,
    workflow_run:{id:baselineRun,head_sha:base},created_at:stamp(n)});
  const final=metadata(finalId,name,finalZip,22),native=metadata(nativeId,'native586-phase-'+baselineRun+'-1-'+base,nativeZip,17);
  json=new Map([[actions+'/runs/'+baselineRun,{id:baselineRun,run_attempt:1,head_sha:base,head_branch:'codex/synthetic-baseline',
    path:PULL_REQUEST_SOURCE_WORKFLOW,event:'pull_request',status:'completed',conclusion:'success',
    repository:{full_name:ORIGIN.repository},head_repository:{full_name:ORIGIN.repository},pull_requests:[]}],
    [repo+'/pulls/'+baselinePr,{number:baselinePr,state:'closed',merged_at:stamp(23),merge_commit_sha:base,
      head:{sha:base,repo:{full_name:ORIGIN.repository}},base:{ref:'main',repo:{full_name:ORIGIN.repository}}}],
    [repo+'/commits/'+base+'/pulls?per_page=100',null],
    [actions+'/runs/'+baselineRun+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[job]}],
    [actions+'/runs/'+baselineRun+'/artifacts?per_page=100',{total_count:2,artifacts:[final,native]}],
    [actions+'/artifacts?name='+encodeURIComponent(name)+'&per_page=100',{total_count:1,artifacts:[final]}],
    [actions+'/artifacts/'+finalId,final],[actions+'/artifacts/'+nativeId,native]]);
  json.set(repo+'/commits/'+base+'/pulls?per_page=100',[json.get(repo+'/pulls/'+baselinePr)]);
  for(const producer of Object.values(SOURCE_GATE_PRODUCERS))json.set(actions+'/workflows/'+producer.workflowId
    +'/runs?head_sha='+base+'&branch=main&per_page=100&page=1',{total_count:0,workflow_runs:[]});
  if(state.laterInspections){
    const workflow='.github/workflows/run-current-weather-once.yml',producer=SOURCE_GATE_PRODUCERS[workflow];
    assert(producer);const history=[];
    for(let i=0;i<state.laterInspections;i++){
      const id=baselineRun+100+i;
      history.push({id,run_attempt:1,head_sha:base,head_branch:'main',path:workflow,
        repository:{full_name:ORIGIN.repository},status:'completed',conclusion:'failure',updated_at:stamp(30)});
      json.set(actions+'/runs/'+id+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[{
        id:id+1000,run_id:id,run_attempt:1,head_sha:base,name:producer.gates[0].job,status:'completed',conclusion:'failure',
        steps:[{name:producer.gates[0].step,status:'completed',conclusion:'success',completed_at:stamp(25)}],
      }]});
    }
    json.set(actions+'/workflows/'+producer.workflowId+'/runs?head_sha='+base+'&branch=main&per_page=100&page=1',
      {total_count:history.length,workflow_runs:history});
  }
  zips=new Map([[String(finalId),finalZip],[String(nativeId),nativeZip]]);
}
function currentPull(){return {number:pr,state:'open',head:{sha:head,repo:{full_name:ORIGIN.repository}},
  base:{sha:base,ref:'main',repo:{full_name:ORIGIN.repository}}};}
async function fakeFetch(url,options){
  calls++;const target=new URL(url);
  if(Array.isArray(state.transportRoutes))state.transportRoutes.push(target.origin==='https://fixture.invalid'
    ?'SIGNED_ARTIFACT':target.pathname+target.search);
  if(target.origin==='https://fixture.invalid'){
    assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');signedCalls++;
    return new Response(zips.get(target.pathname.slice(1)));
  }
  assert.equal(target.origin,'https://api.github.com');assert.equal(options.redirect,'manual');
  assert.equal(options.headers.Authorization,'Bearer synthetic-never-live');
  const route=target.pathname+target.search;
  const postPhase=route===repo+'/pulls/'+pr?'PULL'
    :route===actions+'/runs/'+currentRun+'/attempts/1/jobs?per_page=100'?'JOB':null;
  if(state.postFailure&&state.postFailure.phase===postPhase&&count()>0){
    const failure=state.postFailure;
    if(failure.category==='HTTP_STATUS_FAILED'||failure.category==='HTTP_OK_BODY_OR_JSON_FAILED')
      return new Response('PRIVATE_POSTCHECK_BODY_TOKEN_URL',{status:failure.httpStatus});
    throw Object.assign(new Error('PRIVATE_POSTCHECK_ERROR_TOKEN_URL'),{
      name:failure.category==='FETCH_TIMEOUT'?'TimeoutError':failure.category==='FETCH_ABORT'?'AbortError':'Error',
      cause:{code:failure.category==='FETCH_NETWORK'?'UND_ERR_SOCKET':'PRIVATE_POSTCHECK_CAUSE_TOKEN_URL'}});
  }
  if(route===repo+'/pulls/'+pr){
    const pull=currentPull();if(state.movedPull&&count()>0){
      if(state.movedPull==='head')pull.head.sha='f'.repeat(40);
      if(state.movedPull==='number')pull.number++;
      if(state.movedPull==='closed')pull.state='closed';
      if(state.movedPull==='head-repository')pull.head.repo.full_name='foreign/repository';
      if(state.movedPull==='base-repository')pull.base.repo.full_name='foreign/repository';
      if(state.movedPull==='base-ref')pull.base.ref='other-branch';
    }
    return Response.json(pull);
  }
  if(route===actions+'/runs/'+currentRun)return Response.json({id:currentRun,run_attempt:1,head_sha:head,
    head_branch:'codex/synthetic-current',event:'pull_request',path:PULL_REQUEST_SOURCE_WORKFLOW,status:'in_progress',
    repository:{full_name:ORIGIN.repository},head_repository:{full_name:ORIGIN.repository}});
  if(route===actions+'/runs/'+currentRun+'/attempts/1/jobs?per_page=100')return Response.json({total_count:1,jobs:[
    {id:state.badJob?0:currentJob,run_id:currentRun,run_attempt:1,head_sha:head,name:PULL_REQUEST_SOURCE_JOB,status:'in_progress'}]});
  if(state.missing&&route===repo+'/commits/'+base+'/pulls?per_page=100')return Response.json([]);
  const match=new RegExp('^'+actions+'/artifacts/([0-9]+)/zip$').exec(route);
  if(match)return new Response(null,{status:302,headers:{location:'https://fixture.invalid/'+match[1]}});
  assert(json.has(route),'UNEXPECTED_SYNTHETIC_ROUTE');return Response.json(json.get(route));
}
function clearCliOutputs(){
  for(const name of ['source-tree-content-proof.json','source-targeted-impact-proof.json','cli-output.txt',
    'cli-fetch.txt','cli-fetch-preload.mjs']){
    const file=path.join(root,'.cache',name);if(fs.existsSync(file))fs.unlinkSync(file);
  }
}
function runNormalDigestCli(mode,offline){
  clearCliOutputs();const preload=path.join(root,'.cache/cli-fetch-preload.mjs');
  const output=path.join(root,'.cache/cli-output.txt'),journal=path.join(root,'.cache/cli-fetch.txt');
  // Only the fetch implementation is injected into a real child CLI. The
  // production bridge and coordinator are copied byte-for-byte, and execute
  // their real Git guards, decoder, selected processes and artifact writes.
  write('.cache/cli-fetch-preload.mjs',[
    "import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';",
    'const root=process.cwd(),ORIGIN='+JSON.stringify({repository:ORIGIN.repository})+';',
    'const repo='+JSON.stringify(repo)+',actions='+JSON.stringify(actions)+';',
    'const PULL_REQUEST_SOURCE_WORKFLOW='+JSON.stringify(PULL_REQUEST_SOURCE_WORKFLOW)
      +',PULL_REQUEST_SOURCE_JOB='+JSON.stringify(PULL_REQUEST_SOURCE_JOB)+';',
    'const pr='+pr+',currentRun='+currentRun+',currentJob='+currentJob+',head='+JSON.stringify(head)+',base='+JSON.stringify(base)+';',
    'const state='+JSON.stringify(state)+';let calls=0,signedCalls=0;',
    'const json=new Map('+JSON.stringify([...json])+');',
    'const zips=new Map('+JSON.stringify([...zips].map(([key,value])=>[key,value.toString('base64')]))
      +'.map(([key,value])=>[key,Buffer.from(value,"base64")]));',
    'const count='+count.toString()+';',currentPull.toString(),fakeFetch.toString(),
    'globalThis.fetch=async(...args)=>{fs.appendFileSync('+JSON.stringify(journal)+',"SYNTHETIC_FETCH\\n");'
      +(offline?'throw new Error("OFFLINE_DIGEST_MUST_NOT_FETCH");':'return fakeFetch(...args);')+'};',
  ].join('\n'));
  const stdout=execFileSync(process.execPath,['--import',pathToFileURL(preload).href,
    path.join(root,'scripts/weather-source-gate.mjs'),mode],{cwd:root,env:{...process.env,GITHUB_OUTPUT:output},
    encoding:'utf8',maxBuffer:1024*1024,timeout:30000,stdio:['ignore','pipe','pipe']});
  const observed=fs.existsSync(journal)?fs.readFileSync(journal,'utf8').trim().split('\n').length:0;
  cliTransportCalls+=observed;
  const lines=fs.readFileSync(output,'utf8').trim().split('\n'),fields=Object.fromEntries(lines.map(line=>{
    const separator=line.indexOf('=');assert(separator>0);return [line.slice(0,separator),line.slice(separator+1)];}));
  assert.equal(lines.length,Object.keys(fields).length,'No duplicate GitHub output fields');
  return {stdout,fields,fetchCalls:observed};
}
function reset(){
  git(['reset','--hard',head]);for(const key of Object.keys(state))state[key]=false;
  delete process.env.SYNTHETIC_SELECTED_ACTION;process.env.SOURCE_GATE_HEAD_SHA=head;
  const log=path.join(root,'.cache/executions.jsonl');if(fs.existsSync(log))fs.unlinkSync(log);
}
try{
  git(['init','-q']);git(['config','user.name','Synthetic source producer']);git(['config','user.email','fixture@example.invalid']);
  git(['config','core.autocrlf','false']);
  copyModule('scripts/source-targeted-producer.mjs');
  copyModule('scripts/weather-source-gate.mjs');
  for(const name of ['package.json','scripts/lib/account-statistics-assistant-package-review.json','js/ui/about-i18n.js',
    'js/ui/about-explainer-i18n.js','js/ui/learn-i18n.js','js/ui/learn-i18n-de.js','js/ui/learn-i18n-en.js'])
    write(name,fs.readFileSync(path.join(SOURCE,name)));
  write('.gitignore','.cache/\n');fs.mkdirSync(path.join(root,'.cache'));
  const scripts=JSON.parse(fs.readFileSync(path.join(SOURCE,'package.json'))).scripts;
  const commands=[...new Set(['validate:release-version','test:module-version-closure','test:security-hardening',
    'test:public-about','test:public-i18n-assistant'].flatMap(name=>expandSourceCommands(scripts,name)))];
  for(const command of commands){const tokens=command.split(' ');assert.equal(tokens.length,2);write(tokens[1],
    "import fs from 'node:fs';fs.appendFileSync('.cache/executions.jsonl',process.argv[1]+'\\n');"
    +"if(process.env.SYNTHETIC_SELECTED_ACTION==='fail')process.exit(1);"
    +"if(process.env.SYNTHETIC_SELECTED_ACTION==='dirty')fs.appendFileSync('js/ui/about-i18n.js','\\n// synthetic drift\\n');\n");}
  base=commit('synthetic full source baseline');
  content=sourceTreeContentSha256(base,{git:(args,options)=>git(args,{...options,encoding:'buffer'})});
  const about=fs.readFileSync(path.join(root,'js/ui/about-i18n.js'),'utf8');
  write('js/ui/about-i18n.js',about.replace("'about.header':'Om projektet'","'about.header':'Om RavRadar'"));
  head=commit('reviewed text only');
  const native={phase:'ASSISTANT_PUBLIC591_SUCCESSOR',commands:[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,
    current:{run:baselineRun,attempt:1,head:base,pullRequest:baselinePr,branch:'codex/synthetic-baseline'}};
  const national={status:'EXECUTED',executedInThisRun:true,origin:null,command:NATIONAL_COMMAND,
    sourceScope:'HISTORICAL_584_NATIONAL_ONLY',frozenHead:NATIONAL.head,frozenTree:NATIONAL.tree,
    historicalInput:{head:NATIONAL.head,tree:NATIONAL.tree,content:NATIONAL.content},
    current:{head:base,run:baselineRun,attempt:1,pullRequest:baselinePr},providerOrProductionProof:false,
    current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,
    currentAssistantLaterH0NationalExecutionClaimed:false,currentAssistantPublic587SuccessorNationalExecutionClaimed:false,
    currentAssistantPublic588SuccessorNationalExecutionClaimed:false,currentAssistantPublic591SuccessorNationalExecutionClaimed:false,
    currentAssistantPublic591SuccessorNative:{status:native.status,executedInThisRun:true,origin:null,
      phase:'assistant-public591-successor',eligibleForReuse:false,separatelyRequired:true},
    currentAssistantPublic591SuccessorSource:{command:'npm run test:assistant-later-h0-source',
      actualCommand:ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true}};
  full={schemaVersion:1,contractId:SOURCE_GATE_CONTRACT,repository:ORIGIN.repository,pullRequestNumber:baselinePr,
    headSha:base,sourceTreeSha256:content,privatePayloadIncluded:false,nativePostgres:native,historical584National:national};
  phase={schemaVersion:1,kind:ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,repository:ORIGIN.repository,
    headSha:base,sourceTreeSha256:content,privatePayloadIncluded:false,nativePostgres:structuredClone(native)};
  const step=(name,n)=>({name,number:n,status:'completed',conclusion:'success',started_at:stamp(n-1),completed_at:stamp(n)});
  job={id:baselineJob,run_id:baselineRun,run_attempt:1,head_sha:base,name:PULL_REQUEST_SOURCE_JOB,
    status:'completed',conclusion:'success',steps:Array.from({length:22},(_,i)=>step('Synthetic setup '+(i+1),i+1))};
  for(const [number,name]of [[3,PULL_REQUEST_SOURCE_STEPS[0]],[15,PULL_REQUEST_SOURCE_STEPS[1]],
    [16,PULL_REQUEST_SOURCE_STEPS[2]],[17,'Upload independently completed native586 PostgreSQL phase'],[18,NATIONAL_STEP],
    [19,'Validate durable Copernicus current-reference baseline on artificial data only'],
    [20,'Validate download-inclusive DMI capacity on artificial data only'],[21,PULL_REQUEST_SOURCE_STEPS[3]],
    [22,PULL_REQUEST_SOURCE_STEPS[4]]])job.steps[number-1]=step(name,number);
  rebuild();Object.assign(process.env,{GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:ORIGIN.repository,
    SOURCE_GATE_HEAD_SHA:head,PULL_REQUEST_NUMBER:String(pr),GITHUB_RUN_ID:String(currentRun),GITHUB_RUN_ATTEMPT:'1',
    GITHUB_JOB:'validate',GITHUB_TOKEN:'synthetic-never-live'});globalThis.fetch=fakeFetch;
  ({coordinateTargetedSourceProducer:coordinate}=await import(pathToFileURL(path.join(root,'scripts/source-targeted-producer.mjs')).href));
  let parentTicks=0,positive;const parentHeartbeat=setInterval(()=>parentTicks++,5);
  try{positive=await coordinate();}finally{clearInterval(parentHeartbeat);}
  assert(parentTicks>0,'SOURCE_TARGETED_PARENT_EVENT_LOOP_BLOCKED');
  assert.equal(positive.selection,'TARGETED');assert.equal(count(),5);
  assert.equal(positive.receipt.reportedCommandResults.length,5);assert.equal(positive.receipt.database.executed,false);
  assert.equal(positive.receipt.national.status,'NOT_APPLICABLE');assert.equal(positive.deliveryAuthority,false);
  assert(signedCalls>=2);executions+=count();cases++;
  reset();state.laterInspections=12;state.transportRoutes=[];rebuild();
  const beforeHistoryCalls=calls,beforeHistorySigned=signedCalls,withHistory=await coordinate();
  assert.equal(withHistory.selection,'TARGETED');assert.equal(count(),5);executions+=count();
  const trace=state.transportRoutes,originRoute=actions+'/runs/'+baselineRun;
  const qualificationStart=trace.findIndex((route,index)=>route===originRoute&&trace.slice(0,index).includes(route));
  const qualificationEnd=trace.lastIndexOf(actions+'/artifacts/'+finalId);
  assert(qualificationStart>=0&&qualificationEnd>qualificationStart);
  assert.equal(qualificationEnd-qualificationStart+1,27,'Real FULL qualification exceeds native24 without resetting its source phase');
  assert.equal(calls-beforeHistoryCalls,40);assert.equal(signedCalls-beforeHistorySigned,3);
  for(let i=0;i<12;i++)assert.equal(trace.filter(route=>route===actions+'/runs/'+(baselineRun+100+i)
    +'/attempts/1/jobs?per_page=100').length,1,'Every legitimate later source result is independently inspected');
  assert.equal(withHistory.receipt.database.executed,false);assert.equal(withHistory.receipt.national.executed,false);cases++;
  reset();rebuild();
  reset();state.missing=true;assert.equal((await coordinate()).selection,'FULL');assert.equal(count(),0);cases++;
  reset();job.steps[17].conclusion='failure';rebuild();assert.equal((await coordinate()).selection,'FULL');
  assert.equal(count(),0);job.steps[17].conclusion='success';rebuild();cases++;
  reset();state.badJob=true;assert.equal((await coordinate()).selection,'FULL');assert.equal(count(),0);cases++;
  reset();process.env.SOURCE_GATE_HEAD_SHA=base;const before=calls;
  assert.equal((await coordinate()).selection,'FULL');assert.equal(calls,before);assert.equal(count(),0);cases++;
  reset();fs.appendFileSync(path.join(root,'js/ui/about-i18n.js'),'\n// uncommitted synthetic change\n');
  assert.equal((await coordinate()).selection,'FULL');assert.equal(count(),0);cases++;
  reset();process.env.SYNTHETIC_SELECTED_ACTION='fail';await assert.rejects(coordinate(),/COMMAND_FAILED/);
  assert.equal(count(),1);executions+=count();cases++;
  reset();process.env.SYNTHETIC_SELECTED_ACTION='dirty';await assert.rejects(coordinate());
  assert.equal(count(),1);executions+=count();cases++;
  for(const variant of ['head','number','closed','head-repository','base-repository','base-ref']){
    reset();state.movedPull=variant;await assert.rejects(coordinate());assert.equal(count(),5);executions+=count();cases++;
  }
  for(const failure of [
    {phase:'PULL',category:'HTTP_STATUS_FAILED',httpStatus:403},
    {phase:'PULL',category:'HTTP_STATUS_FAILED',httpStatus:429},
    {phase:'JOB',category:'HTTP_STATUS_FAILED',httpStatus:503},
    {phase:'PULL',category:'FETCH_TIMEOUT',httpStatus:0},
    {phase:'PULL',category:'FETCH_ABORT',httpStatus:0},
    {phase:'PULL',category:'FETCH_NETWORK',httpStatus:0},
    {phase:'PULL',category:'FETCH_OTHER',httpStatus:0},
    {phase:'PULL',category:'HTTP_OK_BODY_OR_JSON_FAILED',httpStatus:200},
  ]){
    reset();state.postFailure=failure;const diagnostics=[],oldError=console.error;
    try{
      console.error=line=>diagnostics.push(line);
      await assert.rejects(coordinate(),error=>error.message==='NATIVE591_V2_EVIDENCE_UNAVAILABLE'&&error.cause===undefined);
    }finally{console.error=oldError;}
    assert.deepEqual(diagnostics,['SOURCE_TARGETED_POSTCHECK '+JSON.stringify(failure)]);
    assert(!diagnostics.join('').includes('PRIVATE_POSTCHECK'));
    assert(!diagnostics.join('').includes(process.env.GITHUB_TOKEN));
    assert.equal(count(),5);executions+=count();cases++;
    assert(!fs.existsSync(path.join(root,'.cache/source-targeted-impact-proof.json')));
  }
  reset();await assert.rejects(coordinate({selection:'TARGETED'}),/NO_OVERRIDES/);cases++;
  reset();const offline=runNormalDigestCli('digest',true);
  assert.equal(offline.fetchCalls,0);assert.equal(count(),0);
  assert.deepEqual(Object.keys(offline.fields).sort(),['artifact_name','source_tree_sha256']);
  assert(offline.fields.artifact_name.startsWith('ravradar-source-validation-v2-pr-'+pr+'-'+head+'-'));
  const oldProof=JSON.parse(fs.readFileSync(path.join(root,'.cache/source-tree-content-proof.json')));
  assert.equal(oldProof.contractId,SOURCE_GATE_CONTRACT);assert.equal(oldProof.headSha,head);
  assert.equal(oldProof.sourceTreeSha256,offline.fields.source_tree_sha256);
  assert.equal(oldProof.privatePayloadIncluded,false);assert.equal(oldProof.qualification,undefined);
  assert.equal(oldProof.nativePostgres,undefined);assert.equal(oldProof.historical584National,undefined);
  assert(!fs.existsSync(path.join(root,'.cache/source-targeted-impact-proof.json')));cases++;
  reset();const targeted=runNormalDigestCli('impact-digest',false);
  assert(targeted.fetchCalls>0);assert.equal(count(),5,targeted.stdout);executions+=count();
  assert.deepEqual(Object.keys(targeted.fields).sort(),['artifact_name','receipt_path','selection','source_tree_sha256']);
  assert.equal(targeted.fields.selection,'TARGETED');
  assert.equal(targeted.fields.receipt_path,'.cache/source-targeted-impact-proof.json');
  assert(!fs.existsSync(path.join(root,'.cache/source-tree-content-proof.json')));
  const cliProof=JSON.parse(fs.readFileSync(path.join(root,targeted.fields.receipt_path)));
  assert.equal(cliProof.kind,'RAVRADAR_SOURCE_TARGETED_RECEIPT_V1');
  assert.equal(cliProof.artifactName,targeted.fields.artifact_name);
  assert(cliProof.artifactName.startsWith('ravradar-source-targeted-v1-pr-'+pr+'-'+head+'-'));
  assert.equal(cliProof.current.head,head);assert.equal(cliProof.current.runId,currentRun);
  assert.equal(cliProof.current.jobId,currentJob);assert.equal(cliProof.current.sourceTreeSha256,targeted.fields.source_tree_sha256);
  assert.equal(cliProof.reportedCommandResults.length,5);assert(cliProof.reportedCommandResults.every(row=>row.outcome==='PASS'));
  assert.equal(cliProof.database.executed,false);assert.equal(cliProof.national.executed,false);
  assert.equal(cliProof.fullSourceValidationClaimed,false);assert.equal(cliProof.deliveryAuthority,false);
  assert.equal(targeted.stdout.split('SOURCE_TIME ').length-1,5);cases++;
  reset();state.missing=true;rebuild();const fullHandoff=runNormalDigestCli('impact-digest',false);
  assert.equal(fullHandoff.fields.selection,'FULL');assert.equal(fullHandoff.fields.reason_code,'NO_QUALIFIED_FULL_ANCESTOR');
  assert.deepEqual(Object.keys(fullHandoff.fields).sort(),['artifact_name','reason_code','receipt_path','selection','source_tree_sha256']);
  assert.equal(fullHandoff.fields.receipt_path,'.cache/source-tree-content-proof.json');
  assert.equal(count(),0);assert(fullHandoff.fetchCalls>0&&fullHandoff.fetchCalls<=24);
  const safeFullLines=fullHandoff.stdout.split('\n').filter(line=>line.startsWith('SOURCE_IMPACT '));
  assert.deepEqual(safeFullLines,['SOURCE_IMPACT '+JSON.stringify({selection:'FULL',reason_code:'NO_QUALIFIED_FULL_ANCESTOR'})]);
  assert(!fullHandoff.stdout.includes('PRIVATE_'));assert(!fullHandoff.stdout.includes(process.env.GITHUB_TOKEN));
  const fullHandoffProof=JSON.parse(fs.readFileSync(path.join(root,fullHandoff.fields.receipt_path)));
  assert.equal(fullHandoffProof.qualification,undefined);assert.equal(fullHandoffProof.nativePostgres,undefined);
  assert(!fs.existsSync(path.join(root,'.cache/source-targeted-impact-proof.json')));cases++;
  clearCliOutputs();reset();
  write('js/core/unreviewed.js','export const protectedChange=true;\n');const saved=head;
  head=commit('protected change must choose full');process.env.SOURCE_GATE_HEAD_SHA=head;
  assert.equal((await coordinate()).selection,'FULL');assert.equal(count(),0);head=saved;cases++;
  assert(!fs.existsSync(path.join(root,'.cache/source-targeted-impact-proof.json')),'Library coordinator does not write receipt before CLI finalization');
}finally{
  globalThis.fetch=oldFetch;for(const key of Object.keys(process.env))if(!Object.hasOwn(oldEnv,key))delete process.env[key];
  Object.assign(process.env,oldEnv);assert.equal(path.dirname(fs.realpathSync(root)),temp);
  const actual=fs.lstatSync(root,{bigint:true});assert.equal(actual.dev,owned.dev);assert.equal(actual.ino,owned.ino);
  assert.equal(actual.birthtimeNs,owned.birthtimeNs);fs.rmSync(root,{recursive:true,force:false});
}
console.log(JSON.stringify({kind:'PRIVATE_NORMAL_TARGETED_PRODUCER_TARGET',cases,passed:cases,failed:0,
  realLocalGitFixtures:true,actualSyntheticTargetProcesses:executions,syntheticTransportCalls:calls,
  cliSyntheticTransportCalls:cliTransportCalls,actualDigestCliCases:3,
  productSourceCommandsExecuted:0,liveApiRequests:0,nativeSqlExecuted:false,production:false,deliveryAuthority:false}));
