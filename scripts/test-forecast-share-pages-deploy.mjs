import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {EventEmitter} from 'node:events';
import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import {deployForecastSharePages,assertForecastSharePagesAuthority,assertForecastSharePagesConfig,
  assertForecastSharePagesRemoteProject,assertForecastSharePagesDeployment,
  completeForecastSharePagesList} from './deploy-forecast-share-pages.mjs';
import {deployForecastSharePagesProcess} from './lib/forecast-share-pages-deploy-process.mjs';
import {buildForecastSharePagesWranglerOnce,FORECAST_SHARE_PAGES_WRANGLER_PINS}
  from './lib/forecast-share-pages-wrangler-once.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const WORKFLOW='deploy-forecast-share-pages.yml';
const WORKFLOW_SHA='c42aef1818804e97a61c4ccf5f25b3c1d8e5d5d7f537340acea987cc48f9925e';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
export function inverseForecastSharePagesWorkflowInventory(names,source){
  assert.equal(names.filter(x=>x===WORKFLOW).length,1);
  assert.equal(hash(source.replace(/\r\n/g,'\n')),WORKFLOW_SHA,'Exact fixed Pages workflow before old workflow oracles');
  return names.filter(x=>x!==WORKFLOW);
}
let cases=0;
assert.equal(FORECAST_SHARE_PAGES_WRANGLER_PINS.version,'4.28.1');
assert.throws(()=>buildForecastSharePagesWranglerOnce({cli:Buffer.from('unproved'),bin:Buffer.alloc(0),packageJson:Buffer.alloc(0)}));
let preparationOverrides=0;
await assert.rejects(()=>deployForecastSharePagesProcess({commitSha:'a'.repeat(40),env:{},
  prepareImpl:async()=>{preparationOverrides++;throw Error('must not execute');}}));
assert.equal(preparationOverrides,0);cases++;
const workflow=await fs.readFile(path.join(ROOT,'.github/workflows',WORKFLOW),'utf8');
assert.equal(hash(workflow),WORKFLOW_SHA);
for(const marker of ['workflow_dispatch:','expected_main:','DEPLOY-FORECAST-SHARE-PAGES','group: ravradar-weather-production-v2',
  'queue: max','cancel-in-progress: false','node scripts/weather-source-gate.mjs check','steps.source-proof.outputs.required',
  'test "$GITHUB_RUN_ATTEMPT" = 1','node scripts/deploy-forecast-share-pages.mjs','if: always()'])assert(workflow.includes(marker));
assert.doesNotMatch(workflow,/continue-on-error:|workflow_run:|schedule:|SUPABASE|secrets: inherit|pages: write|id-token: write|validate-source|npm run validate/);
assert.deepEqual([...workflow.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(x=>x[1]).sort(),['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN']);
assert.deepEqual(inverseForecastSharePagesWorkflowInventory(['old.yml',WORKFLOW],workflow),['old.yml']);
for(const names of [['old.yml'],['old.yml',WORKFLOW,WORKFLOW]])assert.throws(()=>inverseForecastSharePagesWorkflowInventory(names,workflow));
assert.throws(()=>inverseForecastSharePagesWorkflowInventory([WORKFLOW],workflow+'\n# drift'));cases++;
const commit='a'.repeat(40),projectId='11111111111141118111111111111111',deploymentId='22222222-2222-4222-8222-222222222222';
const env={GITHUB_REPOSITORY:'jakobjorgensen82-commits/RavRadar',GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_WORKFLOW:'Deploy RavRadar forecast sharing Pages',GITHUB_JOB:'deploy-share-pages',GITHUB_REF:'refs/heads/main',
  GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'1',EXPECTED_MAIN:commit,GITHUB_SHA:commit,SOURCE_REQUIRED:'false',
  SHARE_CONFIRMATION:'DEPLOY-FORECAST-SHARE-PAGES',CLOUDFLARE_ACCOUNT_ID:'b'.repeat(32),
  CLOUDFLARE_API_TOKEN:'SYNTHETIC_CF',GITHUB_TOKEN:'SYNTHETIC_GH',PATH:'SYNTHETIC_PATH',
  CLOUDFLARE_API_BASE_URL:'https://must-not-forward.invalid/'};
assertForecastSharePagesAuthority(env);
for(const delta of [{GITHUB_RUN_ATTEMPT:'2'},{SOURCE_REQUIRED:'true'},{GITHUB_JOB:'other'},
  {EXPECTED_MAIN:'c'.repeat(40)},{SHARE_CONFIRMATION:'other'}])assert.throws(()=>assertForecastSharePagesAuthority({...env,...delta}));cases++;
const config={name:'ravradar-del',pages_build_output_dir:'./public',compatibility_date:'2026-10-24',send_metrics:false};
assertForecastSharePagesConfig(config);
for(const delta of [{name:'other'},{kv_namespaces:[]},{assets:{}},{pages_build_output_dir:'../..'}])
  assert.throws(()=>assertForecastSharePagesConfig({...config,...delta}));cases++;
const deployment={id:deploymentId,project_id:projectId,project_name:'ravradar-del',environment:'production',
  is_skipped:false,uses_functions:true,latest_stage:{name:'deploy',status:'success'},
  deployment_trigger:{type:'ad_hoc',metadata:{branch:'main',commit_hash:commit,commit_dirty:false}},
  env_vars:{},url:'https://abcd1234.ravradar-del.pages.dev',aliases:['https://ravradar-del.pages.dev']};
function project(deployed=false){return{id:projectId,name:'ravradar-del',production_branch:'main',subdomain:'ravradar-del.pages.dev',
  source:null,domains:['ravradar-del.pages.dev'],uses_functions:deployed,
  deployment_configs:{preview:{compatibility_date:'2026-10-24',compatibility_flags:[],env_vars:{}},
    production:{compatibility_date:'2026-10-24',compatibility_flags:[],env_vars:{}}},
  canonical_deployment:deployed?structuredClone(deployment):null,latest_deployment:deployed?structuredClone(deployment):null};}
assertForecastSharePagesRemoteProject(project(),projectId);assertForecastSharePagesDeployment(deployment,projectId,commit);
for(const delta of [{name:'other'},{domains:['del.ravradar.dk']},{source:{type:'github'}}])
  assert.throws(()=>assertForecastSharePagesRemoteProject({...project(),...delta},projectId));
const withSecret=project();withSecret.deployment_configs.production.env_vars={PRIVATE:{type:'secret_text',value:'RAW_PRIVATE'}};
assert.throws(()=>assertForecastSharePagesRemoteProject(withSecret));
for(const delta of [{aliases:['https://other.pages.dev']},{environment:'preview'},{env_vars:{PRIVATE:{}}},{latest_stage:{name:'deploy',status:'failure'}}])
  assert.throws(()=>assertForecastSharePagesDeployment({...deployment,...delta},projectId,commit));cases++;
const listEnvelope=(rows,info={count:rows.length,page:1,per_page:100,total_count:rows.length,total_pages:rows.length?1:0})=>
  ({status:200,value:{success:true,errors:[],result:rows,result_info:info}});
assert.deepEqual(await completeForecastSharePagesList(async()=>listEnvelope([])),[]);
assert.deepEqual(await completeForecastSharePagesList(async()=>({status:200,value:{success:true,errors:[],result:[]}})),[]);
await assert.rejects(()=>completeForecastSharePagesList(async()=>listEnvelope([],{count:0,page:1,per_page:100,total_count:2,total_pages:1})),/LIST_INCOMPLETE/);cases++;

// API contract regression: exercise the real public controller validators and
// array pager. No account access, provider substitution or deployment is used.
const opaqueId='opaque-project_ID:590';
assert.equal(assertForecastSharePagesRemoteProject({...project(),id:opaqueId},opaqueId),opaqueId);
assert.equal(assertForecastSharePagesRemoteProject({...project(),id:'11111111-1111-4111-8111-111111111111'}),'11111111-1111-4111-8111-111111111111');
for(const id of ['', ' padded', 'padded ', '\u0000', 'line\nbreak', 'x'.repeat(129), {}, 7])
  assert.throws(()=>assertForecastSharePagesRemoteProject({...project(),id}));
assert.throws(()=>assertForecastSharePagesRemoteProject(project(),'another-id'));
const mapBindings=['env_vars','ai_bindings','analytics_engine_datasets','browsers','d1_databases',
  'durable_object_namespaces','hyperdrive_bindings','kv_namespaces','mtls_certificates',
  'queue_producers','r2_buckets','services','vectorize_bindings'];
for(const key of mapBindings){
  const value=project();value.deployment_configs.production[key]=null;assertForecastSharePagesRemoteProject(value);
  value.deployment_configs.production[key]={CONFIGURED:null};assert.throws(()=>assertForecastSharePagesRemoteProject(value));
}
for(const placement of [undefined,null,{}, {mode:'off'}]){
  const value=project();value.deployment_configs.production.placement=placement;assertForecastSharePagesRemoteProject(value);
}
for(const placement of ['off',{mode:'smart'},{mode:null},{mode:'off',hint:'aws:eu-west-1'}]){
  const value=project();value.deployment_configs.production.placement=placement;assert.throws(()=>assertForecastSharePagesRemoteProject(value));
}
for(const limits of [undefined,null,{}, {cpu_ms:1},{cpu_ms:10},{cpu_ms:30000},{cpu_ms:300000}]){
  const value=project();value.deployment_configs.production.limits=limits;assertForecastSharePagesRemoteProject(value);
}
for(const limits of [{cpu_ms:0},{cpu_ms:-1},{cpu_ms:1.5},{cpu_ms:NaN},{cpu_ms:Infinity},
  {cpu_ms:'10'},{cpu_ms:300001},{cpu_ms:10,other:1},{other:10}]){
  const value=project();value.deployment_configs.production.limits=limits;assert.throws(()=>assertForecastSharePagesRemoteProject(value));
}
const unknownConfig=project();unknownConfig.deployment_configs.production.unknown_binding={};
assert.throws(()=>assertForecastSharePagesRemoteProject(unknownConfig));
const unknownSecrets=project();delete unknownSecrets.deployment_configs.production.env_vars;
assert.throws(()=>assertForecastSharePagesRemoteProject(unknownSecrets));
for(const aliases of [null,[],['https://main.ravradar-del.pages.dev'],['https://abcd1234.ravradar-del.pages.dev'],
  ['https://ravradar-del.pages.dev','https://main.ravradar-del.pages.dev']])
  assert.equal(assertForecastSharePagesDeployment({...deployment,aliases,env_vars:null},projectId,commit),deploymentId);
for(const aliases of [undefined,['https://other.pages.dev'],['https://main.ravradar-del.pages.dev.evil.invalid'],
  ['https://ravradar-del.pages.dev@evil.invalid'],['http://ravradar-del.pages.dev'],
  ['https://ravradar-del.pages.dev/path'],['https://main.ravradar-del.pages.dev:8443']])
  assert.throws(()=>assertForecastSharePagesDeployment({...deployment,aliases},projectId,commit));
for(const delta of [{uses_functions:false},{uses_functions:'true'},{env_vars:undefined},
  {deployment_trigger:{type:'ad_hoc',metadata:{branch:'main',commit_hash:commit,commit_dirty:true}}},
  {deployment_trigger:{type:'ad_hoc',metadata:{branch:'main',commit_hash:commit,commit_dirty:'false'}}}])
  assert.throws(()=>assertForecastSharePagesDeployment({...deployment,...delta},projectId,commit));
for(const uses_functions of [undefined,null])
  assertForecastSharePagesDeployment({...deployment,uses_functions},projectId,commit);
cases++;
const projectRow=(n)=>({id:'opaque-project-'+n,name:'project-'+n});
const arrayPage=(rows,info)=>({status:200,value:{success:true,errors:[],result:rows,...(info===undefined?{}:{result_info:info})}});
let pagesRead=0;
const paged=await completeForecastSharePagesList(async requested=>{
  const page=++pagesRead;assert.equal(requested,'/pages/projects?page='+page+'&per_page=100');
  return arrayPage(page<3?[projectRow(page)]:[],page===2?{page:2,per_page:100,count:1}:undefined);
});
assert.deepEqual(paged,[projectRow(1),projectRow(2)]);assert.equal(pagesRead,3,'A short page must not claim completeness');
let countedRead=0;
assert.deepEqual(await completeForecastSharePagesList(async()=>{
  const page=++countedRead;return arrayPage(page===1?[projectRow(1)]:[],
    {page,per_page:100,count:page===1?1:0,total_count:1,total_pages:1});
}),[projectRow(1)]);assert.equal(countedRead,2,'Totals still require the actual empty terminal page');
for(const info of [null,{page:2},{per_page:0},{per_page:101},{count:1},{total_count:-1},{total_count:501},
  {total_count:1},{total_pages:-1},{total_pages:6},{total_pages:2}])
  await assert.rejects(()=>completeForecastSharePagesList(async()=>arrayPage([],info)),/LIST_INCOMPLETE/);
for(const repeat of ['id','name']){
  let n=0;await assert.rejects(()=>completeForecastSharePagesList(async()=>{
    const page=++n;return arrayPage(page===1?[projectRow(1)]:[repeat==='id'
      ?{id:projectRow(1).id,name:'different'}:{id:'different',name:projectRow(1).name}],{page});
  }),/LIST_ROW/);assert.equal(n,2);
}
let changedRead=0;await assert.rejects(()=>completeForecastSharePagesList(async()=>{
  const page=++changedRead;return arrayPage([projectRow(page)],{page,total_count:page+1});
}),/LIST_CHANGED/);
let boundedRead=0;await assert.rejects(()=>completeForecastSharePagesList(async()=>{
  const page=++boundedRead;return arrayPage([projectRow(page)]);
}),/LIST_INCOMPLETE/);assert.equal(boundedRead,5,'No unbounded pagination');
await assert.rejects(()=>completeForecastSharePagesList(async()=>arrayPage(Array.from({length:101},(_,n)=>projectRow(n)))),/LIST_INCOMPLETE/);
await assert.rejects(()=>completeForecastSharePagesList(async()=>({status:403,value:{success:false}})),/LIST_STATUS/);
for(const listStatus of [400,404,500,'400',99,600,NaN,Infinity]){
  let listStatusReads=0;
  await assert.rejects(()=>completeForecastSharePagesList(async()=>{listStatusReads++;
    return{status:listStatus,value:{success:false,errors:[{message:'RAW_PRIVATE_LIST_ERROR'}]}};}),
    error=>error.code==='SHARE_PAGES_LIST_STATUS'&&error.message==='SHARE_PAGES_LIST_STATUS'
      &&error.kind==='PROJECT_LIST'&&error.httpStatus===(Number.isInteger(listStatus)&&listStatus>=100&&listStatus<=599?listStatus:null));
  assert.equal(listStatusReads,1,'A list status refusal must never retry');
}

cases++;

// Reuse only the existing normal fixture factory prefix. No old tests, I/O or
// product modules are replaced; the real controller uses the real public guard.
const fixturePath=new URL('./test-ravscore-public-data-service-binding.mjs',import.meta.url);
const fixtureText=(await fs.readFile(fixturePath,'utf8')).replace(/\r\n/g,'\n');
const sentinel="const primary = bundle('primary-integrated', 61);";assert.equal(fixtureText.split(sentinel).length,2);
const fixturePrefix=fixtureText.split(sentinel)[0];
assert.equal(hash(fixturePrefix),'091f68c8be579ab7f555a0a4caeefe5159f0a2027bdd0300438b1e64d0c90014');
const fixtureUrl=new URL('./test-ravscore-public-data-service-binding.mjs?pagesControllerFixture',import.meta.url).href;
const hook=registerHooks({load(url,context,next){return url===fixtureUrl?{format:'module',source:fixturePrefix+'\nexport {bundle,freshNow};\n',shortCircuit:true}:next(url,context);}});
let fixture;try{fixture=await import(fixtureUrl);}finally{hook.deregister();}
const manifest=fixture.bundle('pages-controller-synthetic',42).manifest;
const projectFiles=['wrangler.jsonc','functions/index.js','public/_routes.json','public/robots.txt','public/404.html'];
const originals=new Map(await Promise.all(projectFiles.map(async name=>[name,await fs.readFile(path.join(ROOT,'scripts/forecast-share-pages',name),'utf8')])));
const git=args=>args[0]==='show'?originals.get(args[1].split(':scripts/forecast-share-pages/')[1]):args[0]==='rev-parse'?commit:'';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
async function scenario(kind){
  let created=false,deployed=false,creates=0,deploys=0,ghReads=0,scratchCreated=false;const receipts=[],requests=[];
  const fetchImpl=async(url,options)=>{
    requests.push({url,method:options.method});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
    if(url.startsWith('https://api.github.com/'))return json({ref:'refs/heads/main',object:{type:'commit',sha:kind==='main-moved'&&++ghReads>1?'c'.repeat(40):commit}});
    if(url==='https://ravradar.dk/data/live/manifest.json'){
      const value=structuredClone(manifest);if(kind==='wrong-model')value.ravScoreModelBinding.modelBundleSha256='0'.repeat(64);return json(value);}
    if(url.includes('/pages/projects?page=')){
      if(kind==='permission')return json({success:false,errors:[{code:1000,message:'RAW_PRIVATE'}]},403);
      if(['list-400','list-404','list-500'].includes(kind))
        return json({success:false,errors:[{code:1000,message:'RAW_PRIVATE_LIST_ERROR'}],result:null},Number(kind.slice(5)));
      const result=listEnvelope(kind==='existing'?[project()]:[]);if(kind==='incomplete')result.value.result_info={page:2};
      return json(result.value);}
    if(url.endsWith('/pages/projects')&&options.method==='POST'){
      creates++;assert.equal(creates,1);assert.deepEqual(JSON.parse(options.body),{name:'ravradar-del',production_branch:'main',
        deployment_configs:{preview:{compatibility_date:'2026-10-24',compatibility_flags:[],env_vars:{}},
          production:{compatibility_date:'2026-10-24',compatibility_flags:[],env_vars:{}}}});
      created=true;if(kind==='create-lost')throw Error('RAW_PRIVATE');return json({success:true,errors:[],result:project()},201);}
    if(url.endsWith('/deployments/'+deploymentId)){
      const value=structuredClone(deployment);if(kind==='api-defaults')value.uses_functions=null;
      return json({success:true,errors:[],result:value});}
    if(url.endsWith('/pages/projects/ravradar-del')){
      if(!created)return json({success:false,errors:[{code:8000007,message:'not found'}],result:null},404);
      const value=project(deployed);if(kind==='bad-alias'&&deployed)value.canonical_deployment.aliases=['https://other.pages.dev'];
      if(kind==='api-defaults'){
        for(const config of Object.values(value.deployment_configs))Object.assign(config,{env_vars:null,
          d1_databases:null,kv_namespaces:{},placement:{mode:'off'},limits:{cpu_ms:10}});
        if(deployed){value.canonical_deployment.aliases=null;value.canonical_deployment.env_vars=null;
          value.canonical_deployment.uses_functions=null;}
      }
      if(kind==='functions-unproved'&&deployed)value.uses_functions=null;
      return json({success:true,errors:[],result:value},kind==='readback-http'?500:200);}
    throw Error('Unexpected synthetic request');
  };
  const deployImpl=async options=>{deploys++;assert.equal(deploys,1);assert.equal(options.commitSha,commit);
    assert.equal(options.env.GITHUB_TOKEN,undefined);assert.equal(options.env.CLOUDFLARE_API_BASE_URL,undefined);
    assert.equal(options.env.CLOUDFLARE_API_TOKEN,'SYNTHETIC_CF');deployed=true;
    if(kind==='success'){await fs.mkdir(path.join(ROOT,'scripts/forecast-share-pages/.wrangler'));scratchCreated=true;}
    if(kind==='deploy-lost')throw Object.assign(Error('RAW_PRIVATE'),{terminationConfirmed:true});
    if(kind==='stop-unknown')throw Object.assign(Error('RAW_PRIVATE'),{terminationConfirmed:false});
    return{terminationConfirmed:true,stdout:'RAW_PRIVATE_NOT_EXPOSED'};};
  let result,error;try{result=await deployForecastSharePages({env,fetchImpl,deployImpl,git,now:()=>fixture.freshNow,report:x=>receipts.push(x)});}catch(caught){error=caught;}
  finally{if(scratchCreated)await fs.rmdir(path.join(ROOT,'scripts/forecast-share-pages/.wrangler'));}
  assert(!JSON.stringify(receipts).includes('RAW_PRIVATE'));return{result,error,creates,deploys,receipts,requests};
}
const good=await scenario('success');assert.equal(good.error,undefined);assert.equal(good.result.outcome,'DEPLOYED_READBACK_PROVED');
assert.equal(good.creates,1);assert.equal(good.deploys,1);assert.equal(good.result.hostedScoreProved,false);cases++;
const defaultResponse=await scenario('api-defaults');assert.equal(defaultResponse.error,undefined);
assert.equal(defaultResponse.creates,1);assert.equal(defaultResponse.deploys,1);
assert.equal(defaultResponse.result.freeCapacityProved,false);assert.equal(defaultResponse.result.hostedScoreProved,false);cases++;
for(const kind of ['permission','incomplete','existing','main-moved','wrong-model','list-400','list-404','list-500']){
  const result=await scenario(kind);assert(result.error);assert.equal(result.creates,0);assert.equal(result.deploys,0);
  assert.equal(result.error.receipt.outcome,'REFUSED_BEFORE_WRITE');if(kind==='permission')assert.equal(result.error.receipt.httpStatus,403);
  if(kind.startsWith('list-')){
    assert.equal(result.error.receipt.code,'SHARE_PAGES_LIST_STATUS');
    assert.equal(result.error.receipt.readKind,'PROJECT_LIST');assert.equal(result.error.receipt.httpStatus,Number(kind.slice(5)));
    assert.equal(result.error.receipt.createIssued,false);assert.equal(result.error.receipt.deployIssued,false);
    assert.equal(result.requests.filter(row=>row.url.includes('/pages/projects?page=')).length,1,'No list retry after HTTP refusal');
    assert.equal(result.receipts.length,1);assert(!JSON.stringify(result.receipts).includes('RAW_PRIVATE_LIST_ERROR'));
  }
  cases++;
}
const lostCreate=await scenario('create-lost');assert(lostCreate.error);assert.equal(lostCreate.creates,1);assert.equal(lostCreate.deploys,0);
assert.equal(lostCreate.error.receipt.readback,'PRESENT_UNOWNED');assert.equal(lostCreate.error.receipt.outcome,'UNKNOWN_NO_RETRY');cases++;
const wrongReadback=await scenario('readback-http');assert(wrongReadback.error);assert.equal(wrongReadback.creates,1);
assert.equal(wrongReadback.deploys,0);assert.equal(wrongReadback.error.receipt.httpStatus,500);cases++;
const lostDeploy=await scenario('deploy-lost');assert.equal(lostDeploy.error,undefined);
assert.equal(lostDeploy.result.outcome,'COMMITTED_REPLY_LOST_READBACK_PROVED');assert.equal(lostDeploy.deploys,1);cases++;
for(const kind of ['bad-alias','stop-unknown','functions-unproved']){const result=await scenario(kind);assert(result.error);
  assert.equal(result.creates,1);assert.equal(result.deploys,1);assert.equal(result.error.receipt.outcome,'UNKNOWN_NO_RETRY');cases++;}

// Same normal controller, fixed project and owned one-shot process. The explicit
// update identity comes from previously verified first-create/deployment receipts;
// project discovery or a lost first-create reply alone never selects this mode.
const predecessorId='33333333-3333-4333-8333-333333333333',predecessorCommit='d'.repeat(40);
const updateEnv={...env,SHARE_OPERATION:'update',SHARE_CONFIRMATION:'UPDATE-FORECAST-SHARE-PAGES',
  EXPECTED_PROJECT_ID:projectId,EXPECTED_DEPLOYMENT_ID:predecessorId,EXPECTED_DEPLOYMENT_COMMIT:predecessorCommit};
assert.equal(assertForecastSharePagesAuthority(updateEnv),'update');
for(const delta of [{SHARE_OPERATION:'other'},{SHARE_OPERATION:''},{SHARE_CONFIRMATION:env.SHARE_CONFIRMATION},
  {EXPECTED_PROJECT_ID:''},{EXPECTED_PROJECT_ID:' foreign'},{EXPECTED_DEPLOYMENT_ID:undefined},
  {EXPECTED_DEPLOYMENT_ID:'../deployments'},{EXPECTED_DEPLOYMENT_COMMIT:'d'.repeat(39)},{GITHUB_RUN_ATTEMPT:'2'}])
  assert.throws(()=>assertForecastSharePagesAuthority({...updateEnv,...delta}));
for(const key of ['EXPECTED_PROJECT_ID','EXPECTED_DEPLOYMENT_ID','EXPECTED_DEPLOYMENT_COMMIT'])
  assert.throws(()=>assertForecastSharePagesAuthority({...env,[key]:updateEnv[key]}));cases++;

async function updateScenario(kind){
  let deployed=false,deploys=0,creates=0,projectReads=0,ghReads=0;const requests=[],receipts=[];
  const predecessor=structuredClone(deployment);predecessor.id=predecessorId;
  predecessor.deployment_trigger.metadata.commit_hash=predecessorCommit;
  const current=()=>{const value=project(true),selected=kind==='already-deployed'||deployed?deployment:predecessor;
    value.canonical_deployment=structuredClone(selected);value.latest_deployment=structuredClone(selected);return value;};
  const fetchImpl=async(url,options)=>{
    requests.push({url,method:options.method});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
    if(url.startsWith('https://api.github.com/'))return json({ref:'refs/heads/main',object:{type:'commit',
      sha:kind==='main-moved'&&++ghReads>1?'e'.repeat(40):commit}});
    if(url==='https://ravradar.dk/data/live/manifest.json'){
      const value=structuredClone(manifest);if(kind==='wrong-model')value.ravScoreModelBinding.modelBundleSha256='0'.repeat(64);return json(value);}
    if(url.includes('/pages/projects?page=')){
      if(kind==='permission')return json({success:false,errors:[{message:'RAW_PRIVATE'}]},403);
      const page=Number(new URL(url).searchParams.get('page'));
      return json(arrayPage(page===1?[{id:kind==='foreign-list'?'foreign-project':projectId,name:'ravradar-del'}]:[],
        {page,per_page:100,count:page===1?1:0,total_count:1,total_pages:1}).value);}
    if(url.endsWith('/pages/projects')&&options.method==='POST'){creates++;throw Error('Create forbidden for update');}
    if(url.endsWith('/deployments/'+predecessorId)){
      const value=structuredClone(predecessor);
      if(kind==='wrong-predecessor-commit')value.deployment_trigger.metadata.commit_hash='e'.repeat(40);
      if(kind==='wrong-predecessor-id')value.id=deploymentId;
      return json({success:true,errors:[],result:value},kind==='missing-predecessor'?404:200);}
    if(url.endsWith('/deployments/'+deploymentId))return json({success:true,errors:[],result:structuredClone(deployment)});
    if(url.endsWith('/pages/projects/ravradar-del')){
      const value=current();projectReads++;
      if(kind==='foreign-project')value.id='foreign-project';
      if(kind==='custom-domain')value.domains.push('del.ravradar.dk');
      if(kind==='missing-domain')value.domains=[];
      if(kind==='secret')value.deployment_configs.production.env_vars={PRIVATE:{type:'secret_text',value:'RAW_PRIVATE'}};
      if(kind==='functions-unproved')value.uses_functions=null;
      if(kind==='stale-latest')value.latest_deployment.id=deploymentId;
      if(kind==='changed-current'||kind==='drift-before-write'&&projectReads===2)value.canonical_deployment.id='44444444-4444-4444-8444-444444444444';
      if(kind==='bad-output'&&deployed)value.canonical_deployment.url='https://other.pages.dev';
      if(kind==='drift-final'&&projectReads===4)value.id='foreign-project';
      return json({success:true,errors:[],result:value});}
    throw Error('Unexpected synthetic update request');
  };
  const deployImpl=async options=>{
    deploys++;assert.equal(deploys,1);assert.equal(options.commitSha,commit);
    assert.equal(options.env.GITHUB_TOKEN,undefined);assert.equal(options.env.CLOUDFLARE_API_BASE_URL,undefined);
    if(kind!=='uncommitted-reply-lost')deployed=true;
    if(kind==='reply-lost'||kind==='uncommitted-reply-lost')throw Object.assign(Error('RAW_PRIVATE'),{terminationConfirmed:true});
    if(kind==='stop-unknown')throw Object.assign(Error('RAW_PRIVATE'),{terminationConfirmed:false});
    return{terminationConfirmed:true};
  };
  let result,error;
  try{result=await deployForecastSharePages({env:updateEnv,fetchImpl,deployImpl,git,now:()=>fixture.freshNow,report:x=>receipts.push(x)});}
  catch(caught){error=caught;}
  assert.equal(creates,0);assert(!JSON.stringify(receipts).includes('RAW_PRIVATE'));
  assert(requests.every(x=>x.method==='GET'),'Update controller never creates or patches a project');
  return{result,error,creates,deploys,requests,receipts};
}
const updated=await updateScenario('success');assert.equal(updated.error,undefined);assert.equal(updated.deploys,1);
assert.equal(updated.result.operation,'update');assert.equal(updated.result.createIssued,false);
assert.equal(updated.result.outcome,'DEPLOYED_READBACK_PROVED');assert.equal(updated.result.predecessorDeploymentId,predecessorId);
assert.equal(updated.result.predecessorCommit,predecessorCommit);assert.equal(updated.result.hostedScoreProved,false);
assert.equal(updated.result.freeCapacityProved,false);assert.equal(updated.result.dnsChanged,false);cases++;
const alreadyUpdated=await updateScenario('already-deployed');assert.equal(alreadyUpdated.error,undefined);
assert.equal(alreadyUpdated.deploys,0);assert.equal(alreadyUpdated.result.deployIssued,false);
assert.equal(alreadyUpdated.result.terminationConfirmed,null);assert.equal(alreadyUpdated.result.outcome,'ALREADY_DEPLOYED_READBACK_PROVED');cases++;
for(const kind of ['permission','foreign-list','foreign-project','custom-domain','missing-domain','secret','functions-unproved',
  'wrong-predecessor-commit','wrong-predecessor-id','missing-predecessor','stale-latest','changed-current','drift-before-write','main-moved','wrong-model']){
  const result=await updateScenario(kind);assert(result.error,kind);assert.equal(result.deploys,0,kind);
  assert.equal(result.error.receipt.outcome,'REFUSED_BEFORE_WRITE',kind);cases++;
}
const updatedLost=await updateScenario('reply-lost');assert.equal(updatedLost.error,undefined);
assert.equal(updatedLost.deploys,1);assert.equal(updatedLost.result.outcome,'COMMITTED_REPLY_LOST_READBACK_PROVED');cases++;
for(const kind of ['stop-unknown','uncommitted-reply-lost','bad-output','drift-final']){
  const result=await updateScenario(kind);assert(result.error,kind);assert.equal(result.deploys,1,kind);
  assert.equal(result.error.receipt.outcome,'UNKNOWN_NO_RETRY',kind);cases++;
}

async function processScenario(scenario){
  const host=Object.assign(new EventEmitter(),{platform:'linux'}),child=Object.assign(new EventEmitter(),{pid:24444,unref(){}});
  for(const key of ['stdout','stderr'])child[key]=Object.assign(new EventEmitter(),{destroy(){}});
  let clock=0,tick=0,group=true;const calls=[],signals=[];
  const finish=code=>{group=false;child.emit('exit',code,code===0?null:'SIGTERM');child.emit('close');};
  let value,error;
  try{value=await deployForecastSharePagesProcess({commitSha:commit,env:{SYNTHETIC:'true'},timeoutMs:40,termGraceMs:20,killGraceMs:20,
    processImpl:host,now:()=>clock,spawnImpl:(command,args,options)=>{calls.push({command,args,options});return child;},
    prepareImpl:async()=>({cliPath:'/owned/wrangler-dist/cli.ravradar-pages-1-1.cjs',
      nodeArgs:['--no-warnings','--experimental-vm-modules'],cleanup:async()=>{}}),
    killImpl:(pid,signal)=>{assert.equal(pid,-24444);if(signal===0){if(!group)throw Object.assign(Error('gone'),{code:'ESRCH'});return true;}
      signals.push(signal);if(scenario==='unknown')return true;finish(1);return true;},
    delay:async ms=>{clock+=ms;if(++tick===1){if(scenario==='success')finish(0);if(scenario==='descendant'){child.emit('exit',0,null);child.emit('close');}}}});
  }catch(caught){error=caught;}
  assert.equal(host.listenerCount('SIGINT')+host.listenerCount('SIGTERM'),0);assert(clock<=80);return{value,error,calls,signals};
}
for(const kind of ['success','timeout','descendant','unknown']){
  const result=await processScenario(kind),call=result.calls[0];assert.equal(call.command,process.execPath);
  assert.deepEqual(call.args,['--no-warnings','--experimental-vm-modules','/owned/wrangler-dist/cli.ravradar-pages-1-1.cjs',
    'pages','deploy','public','--project-name','ravradar-del',
    '--branch','main','--commit-hash',commit,'--commit-dirty=false']);assert.equal(call.options.cwd,path.join(ROOT,'scripts/forecast-share-pages'));
  assert.equal(call.options.detached,true);assert.deepEqual(call.options.stdio,['ignore','pipe','pipe','ipc']);assert(!call.args.includes('--config'));
  if(kind==='success')assert.equal(result.value.terminationConfirmed,true);
  else{assert(result.error);assert.equal(result.error.terminationConfirmed,kind!=='unknown');}cases++;
}
console.log(JSON.stringify({kind:'FORECAST_SHARE_PAGES_NORMAL_CONTROLLER_WORKFLOW_PROCESS_TARGET',cases,
  actualCloudflareCalls:0,providerCalls:0,projectCreated:false,hostedPreviewProved:false,freeCapacityProved:false}));
