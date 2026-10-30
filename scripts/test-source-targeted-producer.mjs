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
let cases=0,executions=0,calls=0,signedCalls=0,coordinate,base,head,content,full,phase,job,json,zips;
const currentRun=50000000002,baselineRun=50000000001,baselineJob=50000000003;
const currentJob=50000000004,finalId=50000000005,nativeId=50000000006,pr=999,baselinePr=998;
const repo='/repos/'+ORIGIN.repository,actions=repo+'/actions';
const state={missing:false,badNational:false,badJob:false,movedPull:false};
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
  zips=new Map([[String(finalId),finalZip],[String(nativeId),nativeZip]]);
}
function currentPull(){return {number:pr,state:'open',head:{sha:head,repo:{full_name:ORIGIN.repository}},
  base:{sha:base,ref:'main',repo:{full_name:ORIGIN.repository}}};}
async function fakeFetch(url,options){
  calls++;const target=new URL(url);
  if(target.origin==='https://fixture.invalid'){
    assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');signedCalls++;
    return new Response(zips.get(target.pathname.slice(1)));
  }
  assert.equal(target.origin,'https://api.github.com');assert.equal(options.redirect,'manual');
  assert.equal(options.headers.Authorization,'Bearer synthetic-never-live');
  const route=target.pathname+target.search;
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
function reset(){
  git(['reset','--hard',head]);for(const key of Object.keys(state))state[key]=false;
  delete process.env.SYNTHETIC_SELECTED_ACTION;process.env.SOURCE_GATE_HEAD_SHA=head;
  const log=path.join(root,'.cache/executions.jsonl');if(fs.existsSync(log))fs.unlinkSync(log);
}
try{
  git(['init','-q']);git(['config','user.name','Synthetic source producer']);git(['config','user.email','fixture@example.invalid']);
  git(['config','core.autocrlf','false']);
  copyModule('scripts/source-targeted-producer.mjs');
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
  const positive=await coordinate();assert.equal(positive.selection,'TARGETED');assert.equal(count(),5);
  assert.equal(positive.receipt.reportedCommandResults.length,5);assert.equal(positive.receipt.database.executed,false);
  assert.equal(positive.receipt.national.status,'NOT_APPLICABLE');assert.equal(positive.deliveryAuthority,false);
  assert(signedCalls>=2);executions+=count();cases++;
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
  reset();await assert.rejects(coordinate({selection:'TARGETED'}),/NO_OVERRIDES/);cases++;
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
  productSourceCommandsExecuted:0,liveApiRequests:0,nativeSqlExecuted:false,production:false,deliveryAuthority:false}));
