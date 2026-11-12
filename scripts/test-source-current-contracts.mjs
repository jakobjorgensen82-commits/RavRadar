// Actual V3 coordinator, command processes, Git analysis and merged consumer.
// API/native receipt bodies are SYNTHETIC DATA; no SQL, provider or live API.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CURRENT_CONTRACT_COMMANDS} from './source-current-contract-plan.mjs';

const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REFERENCE='bd9cf518fe798ddea45d2b835f324f6e2bea06fc';
const profile=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-inputs-598.json')));
const controlSources=new Set();
function collect(file){
  if(controlSources.has(file))return;
  const sourceFile=path.resolve(SOURCE,file),relative=path.relative(SOURCE,sourceFile);
  assert(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));
  controlSources.add(file);
  const body=fs.readFileSync(sourceFile,'utf8'),url=pathToFileURL(sourceFile);
  for(const match of body.matchAll(/^import\b[^;]*?\bfrom\s*['"](\.[^'"]+)['"]/gm)){
    const dep=fileURLToPath(new URL(match[1],url)),name=path.relative(SOURCE,dep).split(path.sep).join('/');
    collect(name);
  }
}
for(const file of ['scripts/source-targeted-producer.mjs','scripts/source-targeted-consumer.mjs',
  'scripts/source-current-contract-receipt.mjs','scripts/source-current-contract-plan.mjs'])collect(file);
const additions=[...controlSources,...['594','597','598'].map(v=>'scripts/lib/source-impact-domain-inputs-'+v+'.json')];
const fixtureControlBytes=file=>fs.readFileSync(path.join(SOURCE,file));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const clone=value=>structuredClone(value);
const originalEnvironment={...process.env},originalFetch=globalThis.fetch,originalLog=console.log;
const temp=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temp,'rr-current-contract-protocol-'));
const owned=fs.lstatSync(root,{bigint:true});
const gitEnvironment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_AUTHOR_NAME:'Synthetic current-contract protocol',GIT_AUTHOR_EMAIL:'fixture@example.invalid',
  GIT_COMMITTER_NAME:'Synthetic current-contract protocol',GIT_COMMITTER_EMAIL:'fixture@example.invalid',
  GIT_AUTHOR_DATE:'2026-11-12T09:00:00Z',GIT_COMMITTER_DATE:'2026-11-12T09:00:00Z'};
const git=(where,args,input)=>execFileSync('git',['-C',where,...args],{input,env:gitEnvironment,
  timeout:30000,maxBuffer:256*1024*1024,stdio:['pipe','pipe','pipe']});
const text=(where,args,input)=>git(where,args,input).toString('utf8').trim();
const sourceBlob=file=>git(SOURCE,['cat-file','blob',REFERENCE+':'+file]);
const readGit=(args,options={})=>execFileSync('git',['-C',root,...args],{env:gitEnvironment,maxBuffer:256*1024*1024,
  timeout:10000,stdio:['pipe','pipe','pipe'],...options});
const write=(file,bytes)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);};
const stamp=n=>'2026-11-12T09:'+String(n).padStart(2,'0')+':00Z';
const zip=(raw,name)=>execFileSync('python',['-c',
  'import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",compression=zipfile.ZIP_DEFLATED); z.writestr(sys.argv[1],sys.stdin.buffer.read()); z.close(); sys.stdout.buffer.write(b.getvalue())',name],
  {input:raw,maxBuffer:65536,timeout:10000,stdio:['pipe','pipe','pipe']});
const fullRun=50000000501,selectedRun=50000000502,fullJob=50000000503,selectedJob=50000000504;
const fullPr=9501,selectedPr=9502,fullFinalId=50000000505,fullNativeId=50000000506,selectedArtifactId=50000000507;
let currentReceiptHelpers;
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
  return {head,baselineCommit:base,inventorySha256:plan.inventorySha256,planSha256:currentReceiptHelpers.currentContractPlanSha256(plan,{mergeCommit:base,gitTree:plan.identity.baselineTree}),reviewSha256:sha(reviewText)};
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
    body:state.missingReview?'Synthetic missing review':state.malformedReview?'<!-- RAVRADAR_CURRENT_CONTRACT_REVIEW_V3 {bad-json} -->':('Synthetic fixture only\n<!-- RAVRADAR_CURRENT_CONTRACT_REVIEW_V3 '+JSON.stringify(review)+' -->\n').repeat(state.duplicateReview?2:1)};
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
  if(target.origin==='https://synthetic-v3.invalid'){
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
    return new Response(null,{status:302,headers:{location:'https://synthetic-v3.invalid/'+match[1]}});}
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
  // The outer node:test harness must not tell a real nested --test process
  // that its files are already executing. Production CI is not such a parent.
  delete process.env.NODE_TEST_CONTEXT;
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
    ...profile.plannerTrustChain,...additions,'package.json',
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
  const targetFiles=[...new Set(Object.values(CURRENT_CONTRACT_COMMANDS).flat().flatMap(command=>command.split(' ').filter(part=>part.endsWith('.mjs'))))];
  assert(targetFiles.length>0);for(const file of targetFiles)assert(!protectedFiles.has(file),'A synthetic target must never replace143/CIT: '+file);
  const tiny=()=>Buffer.from("import fs from 'node:fs';\n"
    +"fs.mkdirSync('.cache',{recursive:true});\n"
    +"fs.appendFileSync('.cache/actual-current-targets.jsonl',JSON.stringify({file:process.argv[1]})+'\\n');\n"
    +"console.log('SYNTHETIC_CURRENT_TARGET_EXECUTED');\n");
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
  const {planSourceCurrentContractsFromGit:plan}=await moduleAt('scripts/source-current-contract-plan.mjs');
  currentReceiptHelpers=await moduleAt('scripts/source-current-contract-receipt.mjs');
  const successor=await moduleAt('scripts/lib/assistant-later-h0-successor-source.mjs');
  const national=await moduleAt('scripts/national584-source-evidence.mjs');
  const analyzer=await moduleAt('scripts/source-impact-domain-inputs.mjs');
  const actual=analyzer.analyzeSourceDomainInputs({baselineCommit:base,candidateCommit:base,expectedHead:base});
  assert.equal(actual.analysis,'COMPLETE',actual.failureCode);
  assert.equal(actual.actualPostgresInput.before.totalFiles,148);
  assert.equal(actual.actualPostgresInput.before.sqlFiles,74);
  assert.equal(actual.frozenGitAnchors.anchors.length,16);
  baseContent=sourceContent.sourceTreeContentSha256(base,{git:readGit});
  const nativeCurrent={run:fullRun,attempt:1,head:base,pullRequest:fullPr,branch:'codex/synthetic-domain-full'};
  let nativeReceipt;
  {
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
  const historical={status:'EXECUTED',executedInThisRun:true,origin:null,command:national.COMMAND,
    sourceScope:'HISTORICAL_584_NATIONAL_ONLY',frozenHead:national.ORIGIN.head,frozenTree:national.ORIGIN.tree,
    historicalInput:{head:national.ORIGIN.head,tree:national.ORIGIN.tree,content:national.ORIGIN.content},
    current:{head:base,run:fullRun,attempt:1,pullRequest:fullPr},providerOrProductionProof:false,
    ...await national.assistantAfter597NativeClaims(nativeReceipt,nativeCurrent)};
  fullBody={schemaVersion:1,contractId:gate.SOURCE_GATE_CONTRACT,repository:native.ORIGIN.repository,
    pullRequestNumber:fullPr,headSha:base,sourceTreeSha256:baseContent,privatePayloadIncluded:false,
    nativePostgres:nativeReceipt,historical584National:historical};
  phaseBody={schemaVersion:1,kind:native.ASSISTANT_AFTER597_PHASE_KIND,repository:native.ORIGIN.repository,
    headSha:base,sourceTreeSha256:baseContent,privatePayloadIncluded:false,nativePostgres:clone(nativeReceipt)};

  const owner='scripts/source-current-contract-receipt.mjs';
  const candidateTree=rewrite(baselineTree,[[owner,Buffer.concat([
    git(root,['cat-file','blob',base+':'+owner]),Buffer.from('\n// synthetic current-control child delta\n')])]]);
  const positiveHead=commit(candidateTree,[base],'synthetic reviewed current-control child');
  configure(positiveHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  assert.equal(baselinePlan.selection,'CURRENT_CONTRACTS',JSON.stringify(baselinePlan.reasonCodes));
  assert.equal(baselinePlan.controlQualificationRequired,true);
  for(const family of ['postgres','C','I','T'])assert.equal(baselinePlan.inputDigests[family+'Before'],baselinePlan.inputDigests[family+'After']);
  globalThis.fetch=transport;
  console.log=(...args)=>{
    if(String(args[0]).startsWith('SOURCE_TIME ')){
      const row=JSON.parse(String(args[0]).slice('SOURCE_TIME '.length));rows.push(row);actualProcesses++;
    }
    originalLog(...args);
  };
  rebuildMaps();const positive=await coordinate();
  assert.equal(positive.selection,'TARGETED');selectedReceipt=positive.receipt;
  assert.equal(selectedReceipt.schemaVersion,3);assert.equal(selectedReceipt.scope,'CURRENT_CONTRACT_RESULTS_ONLY');
  assert.equal(rows.length,baselinePlan.commands.length);assert(rows.every(row=>row.outcome==='PASS'));
  const physicallyExecuted=fs.readFileSync(path.join(root,'.cache/actual-current-targets.jsonl'),'utf8')
    .trim().split('\n').map(line=>JSON.parse(line).file);
  assert.equal(physicallyExecuted.length,rows.length,'Every selected command must physically execute its fixture body');
  assert(physicallyExecuted.some(file=>file.endsWith('test-source-current-contracts.mjs')),
    'The actual --test child body ran; an inherited harness skip is not execution');
  assert.deepEqual(selectedReceipt.reportedCommandResults,rows);
  assert.equal(selectedReceipt.postgres.executedInThisRun,false);
  assert.equal(selectedReceipt.historicalCompatibilityExecuted,false);
  assert.equal(selectedReceipt.fullSourceValidationClaimed,false);
  cases++;scenarios.push('actual producer child processes and separate V3 receipt');

  main=commit(candidateTree,[base,head],'synthetic same-tree main merge');checkout(main);state.merged=true;
  assert.equal(text(root,['rev-parse',head+'^{tree}']),text(root,['rev-parse',main+'^{tree}']));
  selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
  selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
  const context={GITHUB_REPOSITORY:native.ORIGIN.repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:main,GITHUB_RUN_ID:'50000000599'};
  const freshAccess=()=>accessFactory({env:{GITHUB_TOKEN:'synthetic-never-live'}});
  const found=await discover(context,content,{...freshAccess(),readGit});
  assert.equal(found.requiresVerification,true);
  assert.equal(found.locator.contractId,'weather-source-current-contracts-v3');
  const accepted=await decide(found.locator,context,{...freshAccess(),readGit});
  assert.equal(accepted.required,false,JSON.stringify(accepted));
  assert.equal(accepted.scope,'CURRENT_CONTRACT_RESULTS_ONLY');
  assert.equal(accepted.postgresExecuted,false);
  assert.equal(accepted.historicalCompatibilityExecuted,false);
  assert.equal(accepted.independentControlReview,'VERIFIED_EXACT_ROOT_PR_REVIEW');
  cases++;scenarios.push('same-tree merge plus authenticated synthetic FULL and V3 consumer');

  const validReceipt=clone(selectedReceipt),validMetadata=clone(selectedMetadata),validZip=selectedZip;
  for(const change of [
    row=>{row.reportedCommandResults[0].outcome='FAIL';},
    row=>{row.reportedCommandResults.pop();},
    row=>{row.impact.inputDigests.postgresAfter='f'.repeat(64);},
    row=>{row.current.head=base;},
    row=>{row.fullSourceValidationClaimed=true;},
    row=>{row.schemaVersion=2;},
  ]){
    selectedReceipt=clone(validReceipt);change(selectedReceipt);
    selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
    selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
    const tamperedFound=await discover(context,content,{...freshAccess(),readGit});
    if(tamperedFound.locator)assert.equal((await decide(tamperedFound.locator,context,{...freshAccess(),readGit})).required,true);
    else assert.equal(tamperedFound.required,true);
    cases++;
  }
  scenarios.push('six altered source/result/protected-input/type/claim receipts cannot authorize');
  selectedReceipt=validReceipt;selectedMetadata=validMetadata;selectedZip=validZip;rebuildMaps();
  state.laterNegative=true;rebuildMaps();
  assert.equal((await decide(found.locator,context,{...freshAccess(),readGit})).required,true);
  cases++;scenarios.push('later negative FULL-source evidence remains red');
  state.laterNegative=false;state.expiredFull=true;rebuildMaps();
  assert.equal((await decide(found.locator,context,{...freshAccess(),readGit})).required,true);
  cases++;scenarios.push('expired original FULL/native reference cannot authorize');
  state.expiredFull=false;

  for(const flag of ['missingReview','wrongPlan','movedReview']){
    configure(positiveHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
    state[flag]=true;rebuildMaps();
    await assert.rejects(coordinate(),/CONTROL_REVIEW/);
    assert.equal(rows.length,flag==='movedReview'?baselinePlan.commands.length:0);
    cases++;
  }
  scenarios.push('missing wrong or changed independent review gives no receipt');

  const target='scripts/test-source-current-contracts.mjs';
  assert(targetFiles.includes(target));
  const failTree=rewrite(candidateTree,[[target,Buffer.from("throw new Error('SYNTHETIC_SELECTED_TARGET_FAILURE');\n")]]);
  configure(commit(failTree,[positiveHead],'synthetic actual selected target failure'));
  baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
  await assert.rejects(coordinate(),/COMMAND_FAILED/);
  assert.equal(rows.at(-1).outcome,'FAIL');
  cases++;scenarios.push('an actual child-process failure is red, never FULL fallback');

  const nativeFile=profile.postgresModules[0];
  for(const [label,file]of [['PG',nativeFile],['C',profile.models.C.file],['I',profile.models.I.file],['T',profile.continuation.file]]){
    const changedTree=rewrite(candidateTree,[[file,Buffer.concat([
      git(root,['cat-file','blob',positiveHead+':'+file]),Buffer.from('\n// synthetic protected-input drift\n')])]]);
    configure(commit(changedTree,[positiveHead],'synthetic protected '+label+' change'));
    baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
    assert.equal(baselinePlan.selection,'FULL');
    assert.equal((await coordinate()).selection,'FULL');assert.equal(rows.length,0);
    cases++;
  }
  scenarios.push('all four actual protected PG/C/I/T input families require qualification on drift');
  const unknownTree=rewrite(candidateTree,[['js/unclassified-production-feature.js',Buffer.from('export const changed=true;\n')]]);
  configure(commit(unknownTree,[positiveHead],'synthetic unclassified product change'));
  baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
  assert.equal(baselinePlan.selection,'FULL');assert.equal((await coordinate()).selection,'FULL');assert.equal(rows.length,0);
  cases++;scenarios.push('unknown product paths have no short-source authority');
  assert.equal(unexpectedRoutes.length,0);
}finally{
  console.log=originalLog;globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env))if(!Object.hasOwn(originalEnvironment,key))delete process.env[key];
  Object.assign(process.env,originalEnvironment);
  assert.equal(path.dirname(fs.realpathSync(root)),temp);
  const current=fs.lstatSync(root,{bigint:true});
  assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
  fs.rmSync(root,{recursive:true,force:false});
}
console.log(JSON.stringify({kind:'SYNTHETIC_CURRENT_V3_PRODUCER_CONSUMER_INTEGRATION',cases,passed:cases,failed:0,scenarios,
  actualTargetProcesses:actualProcesses,syntheticTransportCalls:calls,realIsolatedGit:true,
  genuineProtected148AndCIT:true,frozenAnchors:16,plannerMock:false,productSourceTestsExecuted:false,
  actualSqlOrSqliteExecuted:false,actualGitHubOrFullQualification:false,
  network:false,production:false,deliveryAuthority:false}));
