// One real V2 coordinator/consumer protocol fixture. Git/143/CIT/13 anchors
// are real isolated objects. FULL/API/runtime/SQL claims are SYNTHETIC DATA.
// Selected Node target bodies are tiny committed fixtures, never product tests.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture597=process.argv[2]==='--source597',fixture598=process.argv[2]==='--source598';
assert(process.argv.length===2||(process.argv.length===3&&(fixture597||fixture598)),'Only the three fixed normal fixture profiles');
const REFERENCE=fixture598?'bd9cf518fe798ddea45d2b835f324f6e2bea06fc':fixture597?'c340b8d8637407b309d3380ae9221a607a4157ef':'e8786fabba66bd9184ab08a0c8c83bf97711f807';
const profile=JSON.parse(fs.readFileSync(path.join(SOURCE,fixture598?'scripts/lib/source-impact-domain-inputs-598.json':fixture597
  ?'scripts/lib/source-impact-domain-inputs-597.json':'scripts/lib/source-impact-domain-inputs-594.json')));
const registry=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-owners-594.json')));
if(fixture597||fixture598){
  // Fixture input inventory only. The actual normal planner independently verifies the fixed delta bytes.
  const delta=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-owners-597.json')));
  registry.owners.push(...delta.owners);
  for(const [file,row]of Object.entries(delta.sources))registry.sources[file]=row.definition;
  registry.resourceFiles.push(...delta.resourceFiles);
  if(fixture598){
    const current=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-owners-598.json')));
    registry.owners.push(...current.owners);for(const [file,row]of Object.entries(current.sources))registry.sources[file]=row.definition;
    registry.resourceFiles.push(...current.resourceFiles);
  }
}
const additions=['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-594.json',
  'scripts/test-source-impact-domain-inputs.mjs','scripts/source-impact-domain-plan.mjs',
  'scripts/lib/source-impact-control-imports.mjs','scripts/lib/source-impact-domain-owners-594.json',
  'scripts/test-source-impact-domain-plan.mjs','scripts/test-candidate-g-rollback-metadata-order.mjs',
  'scripts/source-targeted-receipt.mjs','scripts/source-targeted-producer.mjs',
  'scripts/source-targeted-consumer.mjs','scripts/weather-source-gate.mjs',
  'scripts/test-source-targeted-domain-integration.mjs'];
if(fixture597||fixture598)additions.push('scripts/lib/source-impact-domain-inputs-597.json','scripts/lib/source-impact-domain-owners-597.json');
if(fixture598)additions.push('scripts/lib/source-impact-domain-inputs-598.json','scripts/lib/source-impact-domain-owners-598.json','scripts/source-impact-full-baseline.mjs');
const legacyControlFiles=new Set(['scripts/source-impact-domain-inputs.mjs','scripts/test-source-impact-domain-inputs.mjs',
  'scripts/source-impact-domain-plan.mjs','scripts/test-source-impact-domain-plan.mjs','scripts/test-source-targeted-domain-integration.mjs']);
const fixtureControlBytes=file=>!fixture598&&legacyControlFiles.has(file)
  ?execFileSync('git',['-C',SOURCE,'cat-file','blob',(fixture597?'fad617a60b9830869b03e26ffa629b6e3d0fcb08':'45594e185f087ff02c8e72649d02cb45cf79cf16')+':'+file],{timeout:10000,maxBuffer:8*1024*1024})
  :fs.readFileSync(path.join(SOURCE,file));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const clone=value=>structuredClone(value);
const originalEnvironment={...process.env},originalFetch=globalThis.fetch,originalLog=console.log;
const temp=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temp,'rr-targeted-domain-integration-'));
const owned=fs.lstatSync(root,{bigint:true});
const gitEnvironment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_AUTHOR_NAME:'Synthetic V2 protocol fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',
  GIT_COMMITTER_NAME:'Synthetic V2 protocol fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid',
  GIT_AUTHOR_DATE:'2026-10-31T12:00:00Z',GIT_COMMITTER_DATE:'2026-10-31T12:00:00Z'};
const git=(where,args,input)=>execFileSync('git',['-C',where,...args],{input,env:gitEnvironment,
  timeout:30000,maxBuffer:256*1024*1024,stdio:['pipe','pipe','pipe']});
const text=(where,args,input)=>git(where,args,input).toString('utf8').trim();
const sourceBlob=file=>git(SOURCE,['cat-file','blob',REFERENCE+':'+file]);
const readGit=(args,options={})=>execFileSync('git',['-C',root,...args],{env:gitEnvironment,maxBuffer:256*1024*1024,
  timeout:10000,stdio:['pipe','pipe','pipe'],...options});
const write=(file,bytes)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);};
const stamp=n=>'2026-10-31T12:'+String(n).padStart(2,'0')+':00Z';
const zip=(raw,name)=>execFileSync('python',['-c','import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",compression=zipfile.ZIP_DEFLATED); z.writestr(sys.argv[1],sys.stdin.buffer.read()); z.close(); sys.stdout.buffer.write(b.getvalue())',name],
  {input:raw,maxBuffer:65536,timeout:10000,stdio:['pipe','pipe','pipe']});
const fullRun=50000000501,selectedRun=50000000502,fullJob=50000000503,selectedJob=50000000504;
const fullPr=9501,selectedPr=9502,fullFinalId=50000000505,fullNativeId=50000000506,selectedArtifactId=50000000507;
let base,head,main,baseContent,content,baselinePlan,coordinate,decide,discover,accessFactory;
let native,namespace,sourceContent,fullBody,phaseBody,fullJobBody,selectedJobBody;
let immutableFullZip,immutablePhaseZip;
let maps,zips,selectedReceipt,selectedZip,selectedMetadata,rows=[],cases=0,actualProcesses=0,calls=0;
const state={movedReview:false,missingReview:false,wrongPlan:false,merged:false,
  baseTip:null,hintOverride:null,duplicateReview:false,malformedReview:false,headMismatch:false,expiredFull:false,laterNegative:false,modernWorkflow:false};
const fallbackOnlyCommits=new Set();let observedRoutes=[],unexpectedRoutes=[],fixtureFailures=[],fallbackDiscoveries=[];
const scenarios=[];
const moduleAt=async file=>import(pathToFileURL(path.join(root,file)).href);
const commandRows=tree=>git(root,['ls-tree','-z',tree]).toString('utf8').split('\0').filter(Boolean).map(line=>{
  const m=/^(\d{6}) (blob|tree) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);return{mode:m[1],type:m[2],oid:m[3],name:m[4]};});
function rewrite(tree,changes){
  const entries=tree?commandRows(tree):[],groups=new Map();
  for(const[file,body]of changes){const[name,...tail]=file.split('/'),group=groups.get(name)??[];group.push([tail.join('/'),body]);groups.set(name,group);}
  for(const[name,group]of groups){const prior=entries.find(row=>row.name===name),next=group[0][0]===''
    ?{name,mode:prior?.mode??'100644',type:'blob',oid:text(root,['hash-object','-w','--stdin'],group[0][1])}
    :{name,mode:'040000',type:'tree',oid:rewrite(prior?.oid,group)};
    if(prior)entries.splice(entries.indexOf(prior),1);entries.push(next);}
  return text(root,['mktree','--missing','-z'],entries.map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join(''));
}
const commit=(tree,parents,label)=>text(root,['commit-tree',tree,...parents.flatMap(parent=>['-p',parent]),'-m',label]);
const checkout=commitId=>git(root,['reset','--hard',commitId]);
function reviewObject(plan){
  const reviewText='SYNTHETIC independent protocol-fixture review only\n'+head+'\n'+base+'\n'+JSON.stringify(plan)+'\n';
  write('.cache/synthetic-control-review.txt',reviewText);
  return {head,baselineCommit:base,inventorySha256:plan.inventorySha256,closureSha256:plan.closureSha256,
    planSha256:sha(JSON.stringify(plan)),reviewSha256:sha(reviewText)};
}
function currentPull(){
  const review=reviewObject(baselinePlan);
  if(state.hintOverride)review.baselineCommit=state.hintOverride;
  if(state.headMismatch)review.head=base;
  if(state.wrongPlan)review.planSha256='f'.repeat(64);
  if(state.movedReview&&rows.length)review.reviewSha256='e'.repeat(64);
  return {number:selectedPr,state:state.merged?'closed':'open',...(state.merged?{merged_at:stamp(24),merge_commit_sha:main}:{}),
    user:{login:native.ORIGIN.repository.split('/')[0]},head:{sha:head,ref:'codex/synthetic-domain-current',repo:{full_name:native.ORIGIN.repository}},
    base:{sha:state.baseTip??base,ref:'main',repo:{full_name:native.ORIGIN.repository}},
    body:state.missingReview?'Synthetic missing review':state.malformedReview?'<!-- RAVRADAR_CONTROL_REVIEW_V2 {bad-json} -->':('Synthetic fixture only\n<!-- RAVRADAR_CONTROL_REVIEW_V2 '+JSON.stringify(review)+' -->\n').repeat(state.duplicateReview?2:1)};
}
function run(selected){return {id:selected?selectedRun:fullRun,run_attempt:1,head_sha:selected?head:base,
  head_branch:selected?'codex/synthetic-domain-current':'codex/synthetic-domain-full',event:'pull_request',
  path:namespace.PULL_REQUEST_SOURCE_WORKFLOW,status:selected&&!state.merged?'in_progress':'completed',
  conclusion:selected&&!state.merged?null:'success',repository:{full_name:native.ORIGIN.repository},
  head_repository:{full_name:native.ORIGIN.repository},pull_requests:[]};}
function jobs(selected){
  const modern=selected&&state.modernWorkflow;
  const names=modern?namespace.TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES:namespace.TARGETED_SOURCE_STEP_NAMES;
  return {id:selected?selectedJob:fullJob,run_id:selected?selectedRun:fullRun,run_attempt:1,head_sha:selected?head:base,
    name:namespace.PULL_REQUEST_SOURCE_JOB,status:selected&&!state.merged?'in_progress':'completed',
    conclusion:selected&&!state.merged?null:'success',steps:names.map((name,index)=>({name,number:index+1,status:'completed',
      conclusion:selected&&(modern?(index>=7&&index<=20):(index>=5&&index<=19))?'skipped':'success',started_at:stamp(index),completed_at:stamp(index+1)}))};
}
function meta(id,name,body,runId,producer,n){return{id,name,digest:'sha256:'+sha(body),expired:false,size_in_bytes:body.length,
  workflow_run:{id:runId,head_sha:producer},created_at:stamp(n)};}
function rebuildMaps(){
  const repo='/repos/'+native.ORIGIN.repository,actions=repo+'/actions';
  // Actual uploaded baseline artifacts are immutable across producer/consumer.
  // Recreating a ZIP later would change its timestamp and bound digest.
  const fullZip=immutableFullZip??=zip(Buffer.from(JSON.stringify(fullBody)+'\n'),'source-tree-content-proof.json'),
    phaseZip=immutablePhaseZip??=zip(Buffer.from(JSON.stringify(phaseBody)+'\n'),'native-postgres-phase-proof.json');
  const fullName=sourceContent.sourceTreeProofArtifactName({pullRequestNumber:fullPr,headSha:base,sourceTreeSha256:baseContent});
  const fullMeta=meta(fullFinalId,fullName,fullZip,fullRun,base,22),phaseMeta=meta(fullNativeId,'native586-phase-'+fullRun+'-1-'+base,phaseZip,fullRun,base,17);
  fullJobBody=jobs(false);selectedJobBody=jobs(true);
  const fullPull={number:fullPr,state:'closed',merged_at:stamp(24),merge_commit_sha:base,user:{login:native.ORIGIN.repository.split('/')[0]},
    head:{sha:base,repo:{full_name:native.ORIGIN.repository}},base:{ref:'main',repo:{full_name:native.ORIGIN.repository}}};
  maps=new Map([[actions+'/runs/'+fullRun,run(false)],[repo+'/pulls/'+fullPr,fullPull],
    [repo+'/commits/'+base+'/pulls?per_page=100',[fullPull]],
    [actions+'/runs/'+fullRun+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[fullJobBody]}],
    [actions+'/runs/'+fullRun+'/artifacts?per_page=100',{total_count:2,artifacts:[fullMeta,phaseMeta]}],
    [actions+'/artifacts?name='+encodeURIComponent(fullName)+'&per_page=100',{total_count:1,artifacts:[fullMeta]}],
    [actions+'/artifacts/'+fullFinalId,fullMeta],[actions+'/artifacts/'+fullNativeId,phaseMeta]]);
  if(state.expiredFull){fullMeta.expired=true;phaseMeta.expired=true;}
  zips=new Map([[String(fullFinalId),fullZip],[String(fullNativeId),phaseZip]]);
  for(const current of [base,main].filter(Boolean))for(const producer of Object.values(namespace.SOURCE_GATE_PRODUCERS))
    maps.set(actions+'/workflows/'+producer.workflowId+'/runs?head_sha='+current+'&branch=main&per_page=100&page=1',
      {total_count:0,workflow_runs:[]});
  if(state.laterNegative){
    const [workflow,producer]=Object.entries(namespace.SOURCE_GATE_PRODUCERS)[0],negativeRun=fullRun+100;
    maps.set(actions+'/workflows/'+producer.workflowId+'/runs?head_sha='+base+'&branch=main&per_page=100&page=1',
      {total_count:1,workflow_runs:[{id:negativeRun,run_attempt:1,head_sha:base,head_branch:'main',path:workflow,
        repository:{full_name:native.ORIGIN.repository},status:'completed',conclusion:'failure',updated_at:stamp(30)}]});
    maps.set(actions+'/runs/'+negativeRun+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[{
      id:negativeRun+1000,run_id:negativeRun,run_attempt:1,head_sha:base,name:producer.gates[0].job,
      status:'completed',conclusion:'failure',steps:[{name:producer.gates[0].step,status:'completed',
        conclusion:'failure',completed_at:stamp(25)}]}]});
  }
  if(state.merged){
    maps.set(repo+'/commits/'+main+'/pulls?per_page=100',[currentPull()]);
    maps.set(actions+'/artifacts?name='+encodeURIComponent(selectedReceipt.artifactName)+'&per_page=100',
      {total_count:1,artifacts:[selectedMetadata]});
    maps.set(actions+'/artifacts/'+selectedArtifactId,selectedMetadata);zips.set(String(selectedArtifactId),selectedZip);
  }
}
async function transport(url,options){
  try{
  calls++;const target=new URL(url),repo='/repos/'+native.ORIGIN.repository,actions=repo+'/actions';
  if(target.origin==='https://synthetic-v2.invalid'){
    assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');
    if(!zips.has(target.pathname.slice(1)))unexpectedRoutes.push('SIGNED_ARTIFACT:'+target.pathname.slice(1));
    assert(zips.has(target.pathname.slice(1)));
    return new Response(zips.get(target.pathname.slice(1)));}
  assert.equal(target.origin,'https://api.github.com');
  if(options.redirect===undefined){
    assert.equal(options.headers.Accept,'application/vnd.github+json');
    assert.equal(options.headers['X-GitHub-Api-Version'],'2022-11-28');
  }else assert.equal(options.redirect,'manual');
  assert.equal(options.headers.Authorization,'Bearer synthetic-never-live');const route=target.pathname+target.search;
  observedRoutes.push(route);
  if(route===repo+'/pulls/'+selectedPr)return Response.json(currentPull());
  if(route===actions+'/runs/'+selectedRun)return Response.json(run(true));
  if(route===actions+'/runs/'+selectedRun+'/attempts/1/jobs?per_page=100')return Response.json({total_count:1,jobs:[jobs(true)]});
  const match=new RegExp('^'+actions+'/artifacts/([0-9]+)/zip$').exec(route);
  if(match){if(!zips.has(match[1]))unexpectedRoutes.push(route);assert(zips.has(match[1]));
    return new Response(null,{status:302,headers:{location:'https://synthetic-v2.invalid/'+match[1]}});}
  if(route.startsWith(actions+'/artifacts?name=')&&!maps.has(route))return Response.json({total_count:0,artifacts:[]});
  const absentCommit=/\/commits\/([a-f0-9]{40})\/pulls\?per_page=100$/.exec(route);
  if(absentCommit&&fallbackOnlyCommits.has(absentCommit[1])&&!maps.has(route)){
    fallbackDiscoveries.push(absentCommit[1]);return Response.json([]);
  }
  if(!maps.has(route))unexpectedRoutes.push(route);
  assert(maps.has(route),'Unexpected synthetic-only route '+route);return Response.json(maps.get(route));
  }catch(error){fixtureFailures.push('SYNTHETIC_TRANSPORT_FIXTURE_FAILURE');throw error;}
}
function configure(candidate){
  head=candidate;checkout(head);rows=[];observedRoutes=[];unexpectedRoutes=[];fixtureFailures=[];fallbackDiscoveries=[];
  state.missingReview=false;state.movedReview=false;state.wrongPlan=false;state.merged=false;
  state.baseTip=null;state.hintOverride=null;state.duplicateReview=false;state.malformedReview=false;state.headMismatch=false;state.expiredFull=false;state.laterNegative=false;main=null;
  Object.assign(process.env,{GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:native.ORIGIN.repository,SOURCE_GATE_HEAD_SHA:head,
    PULL_REQUEST_NUMBER:String(selectedPr),GITHUB_RUN_ID:String(selectedRun),GITHUB_RUN_ATTEMPT:'1',GITHUB_JOB:'validate',
    GITHUB_TOKEN:'synthetic-never-live'});
  content=sourceContent.sourceTreeContentSha256(head,{git:readGit});
}
try{
  git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
  const referenceRows=git(SOURCE,['ls-tree','-rz','-t','--full-tree',REFERENCE]).toString('utf8').split('\0').filter(Boolean).map(line=>{
    const m=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);return{mode:m[1],type:m[2],oid:m[3],file:m[4]};});
  const referenceTree=text(SOURCE,['rev-parse',REFERENCE+'^{tree}']);
  const modelFiles=Object.values(profile.models).flatMap(def=>{
    const raw=sourceBlob(def.file).toString('utf8'),manifest=JSON.parse(raw.slice(raw.indexOf('Object.freeze(')+14,raw.lastIndexOf(');')));
    return[def.file,...manifest.files.map(row=>row[def.rowKey])];});
  const protectedFiles=new Set([...profile.postgresModules,...profile.postgresData,...profile.continuation.files,profile.continuation.file,...modelFiles]);
  // A small SYNTHETIC repository, not a copied entire432MB release tree.
  // Every protected input and every real planner/runtime source/resource stays
  // genuine. Other unrelated files are absent from this new root identity.
  const selected=new Set([...protectedFiles,...profile.nativeEvidenceControls,...profile.setupInputs,
    ...profile.plannerTrustChain,...Object.keys(registry.sources),...registry.resourceFiles,'package.json',
    ...referenceRows.filter(row=>row.file.startsWith('supabase/migrations/')&&row.file.endsWith('.sql')).map(row=>row.file)]);
  const objects=[...new Set([referenceTree,...referenceRows.filter(row=>row.type==='tree'||selected.has(row.file)).map(row=>row.oid),
    ...profile.frozenGitAnchors.flatMap(row=>[row.head,row.tree])])];
  git(root,['unpack-objects','-q'],git(SOURCE,['pack-objects','--stdout'],objects.join('\n')+'\n'));
  function selectedTree(tree,prefix=''){
    const kept=[];for(const row of commandRows(tree)){
      const file=prefix+row.name;
      if(row.type==='tree'){
        if([...selected].some(name=>name.startsWith(file+'/')))kept.push({...row,oid:selectedTree(row.oid,file+'/')});
      }else if(selected.has(file))kept.push(row);
    }
    return text(root,['mktree','--missing','-z'],kept.map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join(''));
  }
  const protectedTree=selectedTree(referenceTree);
  const targetFiles=[...new Set([...registry.commonCommands,...registry.controlSuite].flatMap(command=>command.split(' ').filter(part=>part.endsWith('.mjs'))))];
  assert(targetFiles.length>0);for(const file of targetFiles)assert(!protectedFiles.has(file),'A synthetic target must never replace143/CIT: '+file);
  const tiny=()=>Buffer.from("console.log('SYNTHETIC_DOMAIN_TARGET');\n");
  const baselineTree=rewrite(protectedTree,[...new Map([...additions.map(file=>[file,fixtureControlBytes(file)]),...targetFiles.map(file=>[file,tiny(file)])])]);
  base=commit(baselineTree,[],'synthetic root with genuine594 protected inputs and synthetic control targets');
  checkout(base);assert.notEqual(base,REFERENCE);assert.deepEqual(text(root,['rev-list','--parents','-n','1',base]).split(' '),[base]);
  native=await moduleAt('scripts/native-postgres-evidence.mjs');
  const gate=await moduleAt('scripts/lib/weather-source-gate.mjs'),consumer=await moduleAt('scripts/source-targeted-consumer.mjs');
  namespace={...gate,TARGETED_SOURCE_STEP_NAMES:consumer.TARGETED_SOURCE_STEP_NAMES,
    TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES:consumer.TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES,
    TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES:consumer.TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES};
  sourceContent=await moduleAt('scripts/lib/source-tree-content.mjs');
  ({coordinateTargetedSourceProducer:coordinate}=await moduleAt('scripts/source-targeted-producer.mjs'));
  ({decideTargetedSourceGate:decide,discoverTargetedSourceGate:discover}=consumer);accessFactory=native.sourceImpactEvidenceAccess;
  const {planSourceDomainImpactFromGit:plan}=await moduleAt('scripts/source-impact-domain-plan.mjs');
  const successor=await moduleAt('scripts/lib/assistant-later-h0-successor-source.mjs');
  const national=await moduleAt('scripts/national584-source-evidence.mjs');
  const baseNativeInput=fixture597||fixture598?null:await native.captureInstalled593Original591Input({ref:base,readGit:args=>readGit(args).toString('utf8'),physical:false});
  if(fixture597||fixture598){
    const analyzer=await moduleAt('scripts/source-impact-domain-inputs.mjs');
    const actual=analyzer.analyzeSourceDomainInputs({baselineCommit:base,candidateCommit:base,expectedHead:base});
    assert.equal(actual.analysis,'COMPLETE',actual.failureCode);assert.equal(actual.actualPostgresInput.before.totalFiles,fixture598?148:144);
    assert.equal(actual.actualPostgresInput.before.sqlFiles,fixture598?74:73);assert.equal(actual.models.C.before.files.length,101);
    assert.equal(actual.models.I.before.files.length,100);assert.equal(actual.frozenGitAnchors.anchors.length,fixture598?16:14);
  }else{assert.equal(baseNativeInput.files,143);assert.equal(baseNativeInput.frozenGitTrees.length,13);}
  baseContent=sourceContent.sourceTreeContentSha256(base,{git:readGit});
  const nativeCurrent={run:fullRun,attempt:1,head:base,pullRequest:fullPr,branch:'codex/synthetic-domain-full'};
  let nativeReceipt;
  if(!fixture597&&!fixture598)nativeReceipt={schemaVersion:2,kind:native.INSTALLED593_ORIGINAL591_V2_KIND,profile:native.INSTALLED593_ORIGINAL591_V2_PROFILE,
    phase:'INSTALLED593_ORIGINAL591_SUCCESSOR',sourcePhase:'assistant-installed593-origin591-successor',
    releaseVersion:successor.requireInstalled593Original591Release(),binding:successor.requireInstalled593Original591Binding(),
    output:successor.requireInstalled593Original591Output(),databaseBefore:successor.INSTALLED593_ORIGINAL591_DATABASE_BEFORE,
    commands:[...native.INSTALLED593_ORIGINAL591_COMMANDS],current:nativeCurrent,eligibleForReuse:true,status:'EXECUTED',executedInThisRun:true,
    origin:null,nativeInput:baseNativeInput,runtime:{platform:'linux',arch:'x64',imageOS:'ubuntu24',imageVersion:'20261012.334.1',
      node:'v22.23.3',python:'Python 3.12.15',pythonLocation:'/opt/hostedtoolcache/Python/3.12.15/x64',
      ldLibraryPath:'/opt/hostedtoolcache/Python/3.12.15/x64/lib',pgBindir:'/usr/lib/postgresql/16/bin',git:'git version 2.55.0',overrides:[],
      selectedPrograms:{schemaVersion:1,majorVersion:16,files:['initdb','pg_ctl','psql','postgres'].map(name=>({name,path:'/usr/lib/postgresql/16/bin/'+name,
        realpath:'/usr/lib/postgresql/16/bin/'+name,mode:0o755,bytes:100,sha256:'c'.repeat(64),version:name+' (PostgreSQL) 16.10'}))}}};
  if(fixture597){
    const active=successor.INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,binding=active.requireBinding(),databaseBefore=active.databaseBefore;
    const fixtureRuntime={platform:'linux',arch:'x64',imageOS:'ubuntu24',imageVersion:'20261012.334.1',
      node:'v22.23.3',python:'Python 3.12.15',pythonLocation:'/opt/hostedtoolcache/Python/3.12.15/x64',
      ldLibraryPath:'/opt/hostedtoolcache/Python/3.12.15/x64/lib',pgBindir:'/usr/lib/postgresql/16/bin',git:'git version 2.55.0',overrides:[],
      selectedPrograms:{schemaVersion:1,majorVersion:16,files:['initdb','pg_ctl','psql','postgres'].map(name=>({name,path:'/usr/lib/postgresql/16/bin/'+name,
        realpath:'/usr/lib/postgresql/16/bin/'+name,mode:0o755,bytes:100,sha256:'c'.repeat(64),version:name+' (PostgreSQL) 16.10'}))}};
    // SYNTHETIC report DATA on genuine597 protected source, never SQL execution or a reused594 receipt.
    nativeReceipt={schemaVersion:1,kind:native.SCALAR597_LATER_H0_PHASE_KIND,phase:'SCALAR597_LATER_H0_SUCCESSOR',
      sourcePhase:native.SCALAR597_LATER_H0_PHASE,releaseVersion:active.requireRelease(),binding,
      output:active.requireOutput(),databaseBefore,current:nativeCurrent,commands:[...native.SCALAR597_LATER_H0_COMMANDS],
      status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime:fixtureRuntime,
      report:{kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,
        normalModelPartCount:673,postgresMajorVersion:16,nativeProgramIdentity:fixtureRuntime.selectedPrograms,
        scalar597LaterH0Successor:{kind:'SCALAR597_LATER_H0_SUCCESSOR',sourceMigrationInventory:62,sqlExecuted:true,
          wholeMigrationExecuted:true,databaseBeforeVersion:databaseBefore.version,originalStateRelease:594,
          migrationVersion:binding.version,partCount:673,checkpointOidSlots:43,contractBodies:46,
          oldFunctionsAndOidsPreserved:true,allOriginalDefinitionsPreserved:true,exactCheckpointContract:true,exactTripContract:true,
          schema2Catalog:true,normalProtectedJsonbRoundtrip:true,originalDigestsPreserved:true,trueOld594Fixtures:true,
          currentNormalFixtures:true,old594ModelNotRetagged:true,wholeMetadataInverse:true,strictlyLater594ToNextOnly:true,
          productionSeedAuthenticated:false,sqlIsNotOriginAuthentication:true,
          intermediateRuntime:{oldActiveAfterSql:true,nextRefusedBeforeActivation:true,pendingBothRefused:true,
            nextActiveAfterCompletion:true,oldRefusedAfterCompletion:true,activeDocumentsUnchangedBySql:true,
            quotaFunctionAndAdmissionUnchanged:true,quotaServiceRoleWorking:true}}}};
  }
  if(fixture598){
    // Synthetic report DATA against real598C/I/T and74actualSQLfiles, not native execution proof.
    const active=successor.ACTIVE_ASSISTANT_SUCCESSOR,binding=active.requireBinding(),databaseBefore=active.databaseBefore;
    const fixtureRuntime={platform:'linux',arch:'x64',imageOS:'ubuntu24',imageVersion:'20261012.334.1',
      node:'v22.23.3',python:'Python 3.12.15',pythonLocation:'/opt/hostedtoolcache/Python/3.12.15/x64',
      ldLibraryPath:'/opt/hostedtoolcache/Python/3.12.15/x64/lib',pgBindir:'/usr/lib/postgresql/16/bin',git:'git version 2.55.0',overrides:[],
      selectedPrograms:{schemaVersion:1,majorVersion:16,files:['initdb','pg_ctl','psql','postgres'].map(name=>({name,path:'/usr/lib/postgresql/16/bin/'+name,
        realpath:'/usr/lib/postgresql/16/bin/'+name,mode:0o755,bytes:100,sha256:'c'.repeat(64),version:name+' (PostgreSQL) 16.10'}))}};
    const observed={kind:'ASSISTANT_AFTER597_SUCCESSOR',sourceMigrationInventory:63,databaseBeforeVersion:databaseBefore.version,
      originalStateRelease:597,migrationVersion:binding.version,partCount:673,checkpointOidSlots:45,contractBodies:48,
      productionSeedAuthenticated:false,parentCodeHead:'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84',parentNativeHead:'97d189e4a99fdab1b2764db1bfe59f96e92c3f02'};
    for(const key of ['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved','allOriginalDefinitionsPreserved',
      'exactCheckpointContract','exactTripContract','schema2Catalog','normalProtectedJsonbRoundtrip','originalDigestsPreserved',
      'trueOld597Fixtures','currentNormalFixtures','old597ModelNotRetagged','wholeMetadataInverse','strictlyLater597ToNextOnly',
      'sqlIsNotOriginAuthentication','predecessorExecutedInSameHost'])observed[key]=true;
    observed.intermediateRuntime=Object.fromEntries(['old597ActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused',
      'nextActiveAfterCompletion','old597RefusedAfterCompletion','wholeHistoryAndDocumentsPreserved',
      'quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'].map(key=>[key,true]));
    nativeReceipt={schemaVersion:1,kind:native.ASSISTANT_AFTER597_PHASE_KIND,phase:'ASSISTANT_AFTER597_SUCCESSOR',
      sourcePhase:native.ASSISTANT_AFTER597_PHASE,releaseVersion:active.requireRelease(),binding,output:active.requireOutput(),databaseBefore,
      current:nativeCurrent,commands:[...native.ASSISTANT_AFTER597_COMMANDS],status:'EXECUTED',executedInThisRun:true,
      origin:null,eligibleForReuse:false,runtime:fixtureRuntime,report:{kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',
        sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,normalModelPartCount:673,postgresMajorVersion:16,
        nativeProgramIdentity:fixtureRuntime.selectedPrograms,assistantAfter597Successor:observed}};
  }
  let historical;
  if(!fixture597&&!fixture598)historical={status:'EXECUTED',executedInThisRun:true,origin:null,command:national.COMMAND,sourceScope:'HISTORICAL_584_NATIONAL_ONLY',
    frozenHead:national.ORIGIN.head,frozenTree:national.ORIGIN.tree,historicalInput:{head:national.ORIGIN.head,tree:national.ORIGIN.tree,content:national.ORIGIN.content},
    current:{head:base,run:fullRun,attempt:1,pullRequest:fullPr},providerOrProductionProof:false,
    current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,currentAssistantLaterH0NationalExecutionClaimed:false,
    currentAssistantPublic587SuccessorNationalExecutionClaimed:false,currentAssistantPublic588SuccessorNationalExecutionClaimed:false,
    currentAssistantPublic591SuccessorNationalExecutionClaimed:false,currentInstalled593Original591SuccessorNationalExecutionClaimed:false,
    ...national.installed593Original591NativeClaims(nativeReceipt,nativeCurrent),currentInstalled593Original591SuccessorSource:{command:'npm run test:assistant-later-h0-source',
      actualCommand:national.INSTALLED593_ORIGINAL591_SOURCE_COMMAND,separatelyRequired:true}};
  if(fixture597)historical={status:'EXECUTED',executedInThisRun:true,origin:null,command:national.COMMAND,
    sourceScope:'HISTORICAL_584_NATIONAL_ONLY',frozenHead:national.ORIGIN.head,frozenTree:national.ORIGIN.tree,
    historicalInput:{head:national.ORIGIN.head,tree:national.ORIGIN.tree,content:national.ORIGIN.content},
    current:{head:base,run:fullRun,attempt:1,pullRequest:fullPr},providerOrProductionProof:false,
    ...national.scalar597LaterH0NativeClaims(nativeReceipt,nativeCurrent),
    currentScalar597LaterH0Source:{command:'npm run test:assistant-later-h0-source',actualCommand:national.SCALAR597_LATER_H0_SOURCE_COMMAND,separatelyRequired:true}};
  if(fixture598)historical={status:'EXECUTED',executedInThisRun:true,origin:null,command:national.COMMAND,
    sourceScope:'HISTORICAL_584_NATIONAL_ONLY',frozenHead:national.ORIGIN.head,frozenTree:national.ORIGIN.tree,
    historicalInput:{head:national.ORIGIN.head,tree:national.ORIGIN.tree,content:national.ORIGIN.content},
    current:{head:base,run:fullRun,attempt:1,pullRequest:fullPr},providerOrProductionProof:false,
    ...await national.assistantAfter597NativeClaims(nativeReceipt,nativeCurrent)};
  fullBody={schemaVersion:1,contractId:gate.SOURCE_GATE_CONTRACT,repository:native.ORIGIN.repository,pullRequestNumber:fullPr,headSha:base,
    sourceTreeSha256:baseContent,privatePayloadIncluded:false,nativePostgres:nativeReceipt,historical584National:historical};
  phaseBody={schemaVersion:fixture597||fixture598?1:2,kind:fixture598?native.ASSISTANT_AFTER597_PHASE_KIND:fixture597?native.SCALAR597_LATER_H0_PHASE_KIND:native.INSTALLED593_ORIGINAL591_V2_KIND,repository:native.ORIGIN.repository,headSha:base,
    sourceTreeSha256:baseContent,privatePayloadIncluded:false,nativePostgres:clone(nativeReceipt)};
  const owner='scripts/source-targeted-receipt.mjs',candidateTree=rewrite(baselineTree,[[owner,Buffer.concat([git(root,['cat-file','blob',base+':'+owner]),Buffer.from('\n// synthetic CONTROL-only child delta\n')])]]);
  const positiveHead=commit(candidateTree,[base],'synthetic reviewed CONTROL child');
  configure(positiveHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  assert.equal(baselinePlan.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(baselinePlan.reasonCodes));
  assert.equal(baselinePlan.domains.postgres.status,'NOT_APPLICABLE');assert.equal(baselinePlan.domains.historical584National.status,'NOT_APPLICABLE');
  for(const family of ['postgres','C','I','T'])assert.equal(baselinePlan.inputDigests[family+'Before'],baselinePlan.inputDigests[family+'After']);
  globalThis.fetch=transport;
  console.log=(...args)=>{if(args[0]==='SOURCE_TIME '||String(args[0]).startsWith('SOURCE_TIME ')){
    const row=JSON.parse(String(args[0]).slice('SOURCE_TIME '.length));rows.push(row);actualProcesses++;}originalLog(...args);};
  rebuildMaps();const beforePositiveCalls=calls,positive=await coordinate(),positivePhysicalCalls=calls-beforePositiveCalls;
  assert.equal(positive.selection,'TARGETED');selectedReceipt=positive.receipt;
  assert.equal(selectedReceipt.schemaVersion,2);assert.equal(rows.length,baselinePlan.commands.length);assert(rows.every(row=>row.outcome==='PASS'));
  assert.deepEqual(selectedReceipt.reportedCommandResults,rows);assert.equal(selectedReceipt.domains.postgres.executedInThisRun,false);
  assert.equal(selectedReceipt.domains.historical584National.executedInThisRun,false);cases++;scenarios.push('actual producer processes and V2 receipt');
  main=commit(candidateTree,[base,head],'synthetic same-tree main merge');checkout(main);state.merged=true;
  assert.equal(text(root,['rev-parse',head+'^{tree}']),text(root,['rev-parse',main+'^{tree}']));
  assert.deepEqual(plan({baselineCommit:base,candidateCommit:main,expectedHead:main}),baselinePlan);
  selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
  selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
  const artifactRoute='/repos/'+native.ORIGIN.repository+'/actions/artifacts/';
  assert.equal(maps.get(artifactRoute+fullFinalId).digest,selectedReceipt.baselineReference.finalArtifactDigest);
  assert.equal(maps.get(artifactRoute+fullNativeId).digest,selectedReceipt.baselineReference.nativeArtifactDigest);
  const context={GITHUB_REPOSITORY:native.ORIGIN.repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:main,GITHUB_RUN_ID:'50000000599'};
  const access=accessFactory({env:{GITHUB_TOKEN:'synthetic-never-live'}}),found=await discover(context,content,access);
  assert.equal(found.requiresVerification,true);assert.equal(found.locator.contractId,'weather-source-targeted-domains-v2');
  const accepted=await decide(found.locator,context,{...access,readGit});assert.equal(accepted.required,false,JSON.stringify(accepted));
  assert.equal(accepted.scope,'TARGETED_DOMAIN_COMMAND_RESULTS_ONLY');assert.equal(accepted.independentControlReview,'VERIFIED_EXACT_ROOT_PR_REVIEW');
  cases++;scenarios.push('V2 discovery, live synthetic FULL and same-tree merge consumer');
  // Exercise the actual top-level check caller and its real Git stdin adapter.
  // The transport and all evidence stay synthetic; no verifier is injected here.
  const cliCwd=process.cwd(),cliArgv=process.argv,cliEnvironment={...process.env};
  const cliOutput=path.join(root,'.cache/normal-cli-output.txt');
  const cliLocator=path.join(root,'.cache/weather-source-validation.json');
  assert.equal(fs.existsSync(cliLocator),false);
  try{
    Object.assign(process.env,context,{GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_OUTPUT:cliOutput});
    process.chdir(root);process.argv=[process.execPath,path.join(root,'scripts/weather-source-gate.mjs'),'check'];
    await moduleAt('scripts/weather-source-gate.mjs');
    const output=fs.readFileSync(cliOutput,'utf8');
    assert.equal(output,'required=false\nreason=verified-domain-targeted-pull-request-source-content\nsource_tree_sha256='+content+'\n');
    assert.deepEqual(JSON.parse(fs.readFileSync(cliLocator,'utf8')),found.locator);
    cases++;scenarios.push('normal weather-source-gate check CLI discovers V2 and persists verified locator');
  }finally{
    process.chdir(cliCwd);process.argv=cliArgv;
    for(const key of Object.keys(process.env))if(!Object.hasOwn(cliEnvironment,key))delete process.env[key];Object.assign(process.env,cliEnvironment);
  }
  // A genuine synthetic FULL baseline beyond the unchanged six-entry fallback
  // is located only through the existing marker, then qualified normally.
  let deepTip=base;
  for(let index=0;index<7;index++){
    deepTip=commit(baselineTree,[deepTip],'synthetic intervening main wrapper '+index);
    fallbackOnlyCommits.add(deepTip);
  }
  const deepHead=commit(candidateTree,[deepTip],'synthetic reviewed control child after seven main wrappers');
  assert.equal(text(root,['rev-list','--first-parent','--max-count=8',deepTip]).split('\n').indexOf(base),7);
  const legacyDeepFallback=text(root,['rev-list','--first-parent','--max-count=6',deepTip]).split('\n');
  configure(deepHead);state.baseTip=deepTip;baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  assert.equal(baselinePlan.selection,'CONTROL_QUALIFICATION_REQUIRED');rebuildMaps();
  const beforeDeepCalls=calls,deep=await coordinate();assert.equal(deep.selection,'TARGETED');
  assert.equal(calls-beforeDeepCalls,positivePhysicalCalls,'Locator adds no physical calls to successful normal FULL qualification');
  assert.deepEqual(deep.receipt.impact.commands,positive.receipt.impact.commands);
  assert.equal(rows.length,baselinePlan.commands.length);assert.equal(deep.receipt.baselineReference.mergeCommit,base);
  assert.equal(deep.receipt.domains.postgres.executedInThisRun,false);assert.deepEqual(unexpectedRoutes,[]);assert.deepEqual(fixtureFailures,[]);
  assert.deepEqual(fallbackDiscoveries,[]);cases++;scenarios.push('untrusted marker locates normal FULL at position8 without larger call or command budget');
  const unrelated=commit(baselineTree,[],'synthetic non-ancestor marker target');
  for(const hint of [unrelated,'f'.repeat(40)]){
    configure(deepHead);state.baseTip=deepTip;state.hintOverride=hint;
    baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();const before=calls;
    const refused=await coordinate();assert.equal(refused.selection,'FULL');assert.equal(refused.reasonCode,'NO_QUALIFIED_FULL_ANCESTOR');
    assert.equal(calls-before,9,'Unusable hint uses initial PR/run/job and unchanged six-entry discovery fallback');
    assert.equal(rows.length,0);assert.deepEqual(unexpectedRoutes,[]);assert.deepEqual(fixtureFailures,[]);assert.deepEqual(fallbackDiscoveries,legacyDeepFallback);
    cases++;scenarios.push('deep non-ancestor or absent-object hint is ignored; legacy fallback has no FULL');
  }
  configure(deepHead);state.baseTip=deepTip;state.duplicateReview=true;
  baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();const beforeDuplicate=calls;
  assert.equal((await coordinate()).selection,'FULL');assert.equal(calls-beforeDuplicate,9);assert.equal(rows.length,0);
  assert.deepEqual(unexpectedRoutes,[]);assert.deepEqual(fixtureFailures,[]);assert.deepEqual(fallbackDiscoveries,legacyDeepFallback);
  cases++;scenarios.push('deep ambiguous marker is ignored as a locator; unchanged fallback has no FULL');
  for(const flag of ['missingReview','expiredFull','laterNegative']){
    configure(deepHead);state.baseTip=deepTip;state[flag]=true;
    baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
    const refused=await coordinate();assert.equal(refused.selection,'FULL');assert.equal(rows.length,0);
    assert.deepEqual(unexpectedRoutes,[],'FULL must not hide a missing synthetic transport route');
    assert.deepEqual(fixtureFailures,[],'FULL must not hide any synthetic transport assertion or route failure');
    assert.equal(refused.reasonCode,flag==='laterNegative'?'FULL_BASELINE_NOT_QUALIFIED':'NO_QUALIFIED_FULL_ANCESTOR');
    assert.deepEqual(fallbackDiscoveries,flag==='laterNegative'?[]:legacyDeepFallback);
    if(flag==='laterNegative')assert(observedRoutes.includes('/repos/'+native.ORIGIN.repository+'/actions/runs/'+(fullRun+100)+'/attempts/1/jobs?per_page=100'));
    if(flag==='expiredFull')assert.equal(maps.get('/repos/'+native.ORIGIN.repository+'/actions/artifacts/'+fullFinalId).expired,true);
    cases++;scenarios.push('deep locator remains unavailable for '+flag);
  }
  configure(deepHead);state.baseTip=deepTip;state.hintOverride=deepTip;
  baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
  const hintPr=selectedPr+1,hintPull={number:hintPr,state:'closed',merged_at:stamp(24),merge_commit_sha:deepTip,
    head:{sha:deepTip,repo:{full_name:native.ORIGIN.repository}},base:{ref:'main',repo:{full_name:native.ORIGIN.repository}}};
  const hintRepo='/repos/'+native.ORIGIN.repository,hintActions=hintRepo+'/actions';
  maps.set(hintRepo+'/commits/'+deepTip+'/pulls?per_page=100',[hintPull]);
  const targetedHintName='ravradar-source-targeted-domains-v2-pr-'+hintPr+'-'+deepTip+'-'+baseContent.slice(7);
  maps.set(hintActions+'/artifacts?name='+encodeURIComponent(targetedHintName)+'&per_page=100',
    {total_count:1,artifacts:[{id:selectedArtifactId,name:targetedHintName,expired:false,workflow_run:{id:selectedRun,head_sha:deepTip}}]});
  const targetedHint=await coordinate();assert.equal(targetedHint.selection,'FULL');assert.equal(targetedHint.reasonCode,'NO_QUALIFIED_FULL_ANCESTOR');
  assert.equal(rows.length,0);assert.deepEqual(unexpectedRoutes,[]);assert.deepEqual(fixtureFailures,[]);assert.deepEqual(fallbackDiscoveries,legacyDeepFallback.slice(1));
  assert(!observedRoutes.some(route=>route.includes('ravradar-source-targeted-domains-v2-')||route.endsWith('/zip')));
  cases++;scenarios.push('TARGETED-only hint is never promoted or downloaded as FULL');
  // Within the existing six-entry window a bad locator must never turn the
  // old complete CONTROL refusal into an automatic FULL handoff.
  for(const flag of ['duplicateReview','malformedReview','headMismatch','nonAncestor']){
    configure(positiveHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
    if(flag==='nonAncestor')state.hintOverride=unrelated;else state[flag]=true;
    rebuildMaps();const before=calls;
    await assert.rejects(coordinate(),/SOURCE_TARGETED_CONTROL_REVIEW_/);
    assert.equal(calls-before,positivePhysicalCalls-2,'Same normal FULL qualification; RED precedes two post-target reads');
    assert.equal(rows.length,0);assert.deepEqual(unexpectedRoutes,[]);assert.deepEqual(fixtureFailures,[]);assert.deepEqual(fallbackDiscoveries,[]);
    cases++;scenarios.push('legacy-window '+flag+' preserves complete CONTROL RED with zero commands');
  }
  if(fixture598){
    // Same real producer -> discovery -> consumer path, genuine148/C101/I100/T12
    // fixture inputs and synthetic API/target bodies; both ROOT-review reads run.
    const modernWorkflow='.github/workflows/validate-pull-request.yml';
    const modernTree=rewrite(candidateTree,[[modernWorkflow,fs.readFileSync(path.join(SOURCE,modernWorkflow))]]);
    configure(commit(modernTree,[base],'synthetic exact modern Python environment workflow'));
    state.modernWorkflow=true;baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
    assert.equal(baselinePlan.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(baselinePlan.reasonCodes));rebuildMaps();
    const modernProduction=await coordinate();assert.equal(modernProduction.selection,'TARGETED');
    selectedReceipt=modernProduction.receipt;
    main=commit(modernTree,[base,head],'synthetic modern same-tree reviewed main');checkout(main);state.merged=true;
    selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
    selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
    const modernContext={...context,GITHUB_SHA:main};let workflowReads=0;
    const modernGit=(args,options={})=>{if(args[0]==='cat-file'&&args[1]==='blob'&&args[2]===head+':'+modernWorkflow)workflowReads++;return readGit(args,options);};
    const modernAccess=accessFactory({env:{GITHUB_TOKEN:'synthetic-never-live'}});
    const modernFound=await discover(modernContext,content,{...modernAccess,readGit:modernGit});
    assert.equal(modernFound.requiresVerification,true);assert.equal(modernFound.locator.contractId,'weather-source-targeted-domains-v2');
    const modernDecision=await decide(modernFound.locator,modernContext,{...modernAccess,readGit:modernGit});
    assert.equal(modernDecision.required,false);assert.equal(workflowReads,2,'Both discovery and decide bind the actual producer workflow blob');
    assert.equal(modernDecision.scope,'TARGETED_DOMAIN_COMMAND_RESULTS_ONLY');
    assert.equal(modernDecision.independentControlReview,'VERIFIED_EXACT_ROOT_PR_REVIEW');
    cases++;scenarios.push('actual modern23 discovery -> decide -> fresh ROOT CONTROL review uses genuine workflow bytes');
    configure(positiveHead);state.modernWorkflow=false;baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
  }
  for(const flag of ['missingReview','wrongPlan','movedReview']){
    configure(positiveHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});state[flag]=true;rebuildMaps();
    await assert.rejects(coordinate(),/CONTROL_REVIEW/);assert.equal(rows.length,flag==='movedReview'?baselinePlan.commands.length:0);
    cases++;scenarios.push(flag);
  }
  const target='scripts/test-source-targeted-receipt.mjs';assert(targetFiles.includes(target));
  assert(baselinePlan.commands.some(command=>command.split(' ').at(-1)===target));
  const failTree=rewrite(candidateTree,[[target,Buffer.from("throw new Error('SYNTHETIC_SELECTED_TARGET_FAILURE');\n")]]);
  configure(commit(failTree,[positiveHead],'synthetic selected target fails'));baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  assert.equal(baselinePlan.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(baselinePlan.reasonCodes));rebuildMaps();
  await assert.rejects(coordinate(),/COMMAND_FAILED/);assert.equal(rows.at(-1).outcome,'FAIL');cases++;scenarios.push('actual selected child failure stays RED');
  const nativeFile=profile.postgresModules[0],nativeTree=rewrite(candidateTree,[[nativeFile,Buffer.concat([git(root,['cat-file','blob',positiveHead+':'+nativeFile]),Buffer.from('\n// synthetic protected input drift\n')])]]);
  configure(commit(nativeTree,[positiveHead],'synthetic actual PostgreSQL input changes'));baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
  assert.equal(baselinePlan.selection,'FULL');const refused=await coordinate();assert.equal(refused.selection,'FULL');assert.equal(rows.length,0);
  cases++;scenarios.push('changed real protected input has no short proof');
  for(const family of ['C','I','T']){
    const file=family==='T'?profile.continuation.file:profile.models[family].file,changedTree=rewrite(candidateTree,[[file,Buffer.concat([
      git(root,['cat-file','blob',positiveHead+':'+file]),Buffer.from('\n// synthetic protected '+family+' input drift\n')])]]);
    configure(commit(changedTree,[positiveHead],'synthetic actual '+family+' input changes'));
    baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
    assert.equal(baselinePlan.selection,'FULL');assert.equal((await coordinate()).selection,'FULL');assert.equal(rows.length,0);
    cases++;scenarios.push('marker cannot override changed real '+family+' input');
  }
}finally{
  console.log=originalLog;globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env))if(!Object.hasOwn(originalEnvironment,key))delete process.env[key];Object.assign(process.env,originalEnvironment);
  assert.equal(path.dirname(fs.realpathSync(root)),temp);const current=fs.lstatSync(root,{bigint:true});
  assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);fs.rmSync(root,{recursive:true,force:false});
}
console.log(JSON.stringify({kind:'SYNTHETIC_NORMAL_V2_PRODUCER_CONSUMER_INTEGRATION',cases,passed:cases,failed:0,scenarios,
  actualTargetProcesses:actualProcesses,syntheticTransportCalls:calls,realIsolatedGit:true,genuineProtected143AndCIT:!fixture597&&!fixture598,genuineProtected144AndCIT:fixture597,genuineProtected148AndCIT:fixture598,frozenAnchors:fixture598?16:fixture597?14:13,
  plannerMock:false,productSourceTestsExecuted:false,actualSqlOrSqliteExecuted:false,actualGitHubOrFullQualification:false,
  network:false,production:false,deliveryAuthority:false}));

if(!fixture597&&!fixture598){
  // One ordinary invocation covers both distinct genuine source generations.
  // The child has the same normal program, a closed fixture selector and synthetic transport only.
  execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--source597'],{stdio:'inherit',timeout:180000,
    env:{...process.env}});
}
