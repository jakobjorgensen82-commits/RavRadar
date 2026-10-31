import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {deployForecastSharePagesProcess} from './lib/forecast-share-pages-deploy-process.mjs';
import {ravScoreModelBinding,assertRavScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {selectPublicRuntimeAvailability} from '../js/core/ravscore-public-runtime-contract.js';

export const FORECAST_SHARE_PAGES_PROJECT='ravradar-del';
export const FORECAST_SHARE_PAGES_ORIGIN='https://ravradar-del.pages.dev';
export const FORECAST_SHARE_PAGES_FILES=Object.freeze([
  'functions/index.js','public/404.html','public/_routes.json','public/robots.txt','wrangler.jsonc']);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PROJECT=path.join(ROOT,'scripts/forecast-share-pages');
const REPO='jakobjorgensen82-commits/RavRadar',SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const fail=code=>Object.assign(new Error(code),{code});
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const empty=v=>object(v)&&Object.keys(v).length===0;
// Project IDs are opaque API data, never path or URL authority.
const projectId=v=>typeof v==='string'&&v.length>0&&v.length<=128
  &&v.trim()===v&&!/[\u0000-\u0020\u007f-\u009f]/u.test(v);
const unconfigured=v=>v===undefined||v===null||empty(v);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const need=(v,code)=>{if(!v)throw fail('SHARE_PAGES_'+code);};
export function assertForecastSharePagesAuthority(env){
  const operation=env.SHARE_OPERATION??'create';
  need(operation==='create'||operation==='update','OPERATION');
  if(operation==='update')need(projectId(env.EXPECTED_PROJECT_ID)
    &&UUID.test(env.EXPECTED_DEPLOYMENT_ID??'')&&SHA.test(env.EXPECTED_DEPLOYMENT_COMMIT??''),'UPDATE_IDENTITY');
  else need(['EXPECTED_PROJECT_ID','EXPECTED_DEPLOYMENT_ID','EXPECTED_DEPLOYMENT_COMMIT']
    .every(key=>env[key]===undefined||env[key]===''),'CREATE_IDENTITY');
  need(env.GITHUB_REPOSITORY===REPO&&env.GITHUB_EVENT_NAME==='workflow_dispatch'
    &&env.GITHUB_WORKFLOW==='Deploy RavRadar forecast sharing Pages'&&env.GITHUB_JOB==='deploy-share-pages'
    &&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_RUN_ATTEMPT==='1'
    &&/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID??'')&&SHA.test(env.EXPECTED_MAIN??'')
    &&env.GITHUB_SHA===env.EXPECTED_MAIN&&env.SHARE_CONFIRMATION===(operation==='create'
      ?'DEPLOY-FORECAST-SHARE-PAGES':'UPDATE-FORECAST-SHARE-PAGES')
    &&env.SOURCE_REQUIRED==='false'&&/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID??'')
    &&typeof env.CLOUDFLARE_API_TOKEN==='string'&&env.CLOUDFLARE_API_TOKEN.length>0
    &&typeof env.GITHUB_TOKEN==='string'&&env.GITHUB_TOKEN.length>0,'AUTHORITY');
  return operation;
}
export function assertForecastSharePagesConfig(value){
  assert.deepEqual(value,{name:FORECAST_SHARE_PAGES_PROJECT,pages_build_output_dir:'./public',
    compatibility_date:'2026-10-24',send_metrics:false});return value;
}
function noLinks(file){let at=path.parse(file).root;for(const part of path.relative(at,file).split(path.sep)){
  at=path.join(at,part);need(!fs.lstatSync(at).isSymbolicLink(),'LOCAL_LINK');}}
export function forecastSharePagesInventory(git,expectedMain,{afterDeployment=false}={}){
  noLinks(PROJECT);const found=[];
  const walk=(directory,prefix='')=>{for(const item of fs.readdirSync(directory,{withFileTypes:true})){
    const name=prefix+item.name,file=path.join(directory,item.name),stat=fs.lstatSync(file);
    need(!stat.isSymbolicLink()&&stat.nlink>=1,'LOCAL_LINK');
    if(stat.isDirectory()){
      // Wrangler owns only this new scratch directory after its sole invocation.
      // It is outside public/functions and was forbidden at every prewrite.
      if(afterDeployment&&name==='.wrangler')continue;
      need(['functions','public'].includes(name),'LOCAL_INVENTORY');walk(file,name+'/');}
    else {need(stat.isFile()&&stat.nlink===1&&stat.size>0&&stat.size<=64*1024,'LOCAL_FILE');found.push(name);}
  }};walk(PROJECT);assert.deepEqual(found.sort(),FORECAST_SHARE_PAGES_FILES);
  const rows=found.map(name=>{const raw=fs.readFileSync(path.join(PROJECT,name));
    need(raw.equals(Buffer.from(git(['show',expectedMain+':scripts/forecast-share-pages/'+name]),'utf8')),'LOCAL_SOURCE');
    return{path:name,bytes:raw.length,sha256:sha(raw)};});
  assertForecastSharePagesConfig(JSON.parse(fs.readFileSync(path.join(PROJECT,'wrangler.jsonc'),'utf8')));
  need(fs.readFileSync(path.join(PROJECT,'public/robots.txt'),'utf8')==='User-agent: *\nAllow: /\n','ROBOTS');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(PROJECT,'public/_routes.json'),'utf8')),
    {version:1,include:['/'],exclude:[]});return rows;
}
const BINDINGS=['env_vars','ai_bindings','analytics_engine_datasets','browsers','d1_databases',
  'durable_object_namespaces','hyperdrive_bindings','kv_namespaces','mtls_certificates',
  'queue_producers','r2_buckets','services','vectorize_bindings'];
export function assertForecastSharePagesRemoteProject(project,expectedId=null){
  need(object(project)&&projectId(project.id)&&project.name===FORECAST_SHARE_PAGES_PROJECT
    &&project.production_branch==='main'&&project.subdomain==='ravradar-del.pages.dev'
    &&(expectedId===null||project.id===expectedId),'REMOTE_PROJECT');
  need(project.source===undefined||project.source===null,'REMOTE_SOURCE');
  need(Array.isArray(project.domains)&&project.domains.every(x=>x==='ravradar-del.pages.dev')
    &&new Set(project.domains).size===project.domains.length,'REMOTE_DOMAINS');
  need(object(project.deployment_configs)
    &&Object.keys(project.deployment_configs).sort().join(',')==='preview,production','REMOTE_CONFIG');
  for(const config of Object.values(project.deployment_configs)){
    need(object(config),'REMOTE_CONFIG');
    const known=[...BINDINGS,'always_use_latest_compatibility_date','build_image_major_version',
      'compatibility_date','compatibility_flags','fail_open','usage_model','placement','limits','wrangler_config_hash'];
    need(Object.keys(config).every(key=>known.includes(key)),'REMOTE_CONFIG_UNKNOWN');
    for(const key of BINDINGS)need(unconfigured(config[key]),'REMOTE_BINDINGS');
    need(config.env_vars===null||empty(config.env_vars),'REMOTE_SECRETS_UNKNOWN');
    need(config.compatibility_date==='2026-10-24'&&Array.isArray(config.compatibility_flags)
      &&config.compatibility_flags.length===0,'REMOTE_COMPATIBILITY');
    need(config.always_use_latest_compatibility_date===undefined||config.always_use_latest_compatibility_date===false,'REMOTE_COMPATIBILITY');
    need(config.usage_model===undefined||config.usage_model==='standard','REMOTE_USAGE');
    need(unconfigured(config.placement)||(object(config.placement)
      &&Object.keys(config.placement).join(',')==='mode'&&config.placement.mode==='off'),'REMOTE_PLACEMENT');
    // Schema validation only: this is not evidence of the account plan or Free capacity.
    need(unconfigured(config.limits)||(object(config.limits)
      &&Object.keys(config.limits).join(',')==='cpu_ms'&&Number.isSafeInteger(config.limits.cpu_ms)
      &&config.limits.cpu_ms>0&&config.limits.cpu_ms<=300000),'REMOTE_LIMITS');
  }
  if(project.build_config)for(const key of ['build_command','web_analytics_tag','web_analytics_token'])
    need(project.build_config[key]===undefined||project.build_config[key]===null||project.build_config[key]==='','REMOTE_BUILD');
  return project.id;
}
export function assertForecastSharePagesDeployment(deployment,projectId,commit){
  need(object(deployment)&&UUID.test(deployment.id??'')&&deployment.project_id===projectId
    &&deployment.project_name===FORECAST_SHARE_PAGES_PROJECT&&deployment.environment==='production'
    &&deployment.is_skipped===false&&(deployment.uses_functions===undefined||deployment.uses_functions===null||deployment.uses_functions===true)
    &&deployment.latest_stage?.name==='deploy'&&deployment.latest_stage.status==='success','DEPLOYMENT');
  const trigger=deployment.deployment_trigger;
  need(trigger?.type==='ad_hoc'&&trigger.metadata?.branch==='main'&&trigger.metadata.commit_hash===commit
    &&trigger.metadata.commit_dirty===false&&(deployment.env_vars===null||empty(deployment.env_vars)),'DEPLOYMENT_SOURCE');
  need(typeof deployment.url==='string'&&/^https:\/\/[a-f0-9]{8}\.ravradar-del\.pages\.dev\/?$/.test(deployment.url),'DEPLOYMENT_URL');
  // Aliases are optional metadata, not proof that the canonical production root is current.
  need(deployment.aliases===null||(Array.isArray(deployment.aliases)
    &&deployment.aliases.every(x=>typeof x==='string'&&(x===FORECAST_SHARE_PAGES_ORIGIN
      ||x==='https://main.ravradar-del.pages.dev'
      ||/^https:\/\/[a-f0-9]{8}\.ravradar-del\.pages\.dev$/.test(x)))),'DEPLOYMENT_ALIAS');
  return deployment.id;
}
// Exactly bounded HTTP/JSON, no retries, redirects, raw error text or URL in errors.
async function boundedJson(fetchImpl,url,options,kind){
  let status=null;
  try{
    const response=await fetchImpl(url,{...options,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});
    status=Number.isInteger(response.status)?response.status:null;
    if(status===401||status===403){await response.body?.cancel();throw fail('SHARE_PAGES_PERMISSION');}
    need(response.body,'HTTP_BODY');
    const size=response.headers.get('content-length');
    if(!(size===null||/^[0-9]+$/.test(size)&&Number(size)<=2*1024*1024)){
      await response.body.cancel();throw fail('SHARE_PAGES_READ_BOUND');}
    const reader=response.body.getReader(),chunks=[];let bytes=0;
    try{while(true){const row=await reader.read();if(row.done)break;bytes+=row.value.byteLength;
      if(bytes>2*1024*1024){await reader.cancel();throw fail('SHARE_PAGES_READ_BOUND');}chunks.push(Buffer.from(row.value));}}
    finally{reader.releaseLock();}
    const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));return{status,value};
  }catch(error){throw Object.assign(fail(/^SHARE_PAGES_[A-Z_]+$/.test(error?.code??'')?error.code:'SHARE_PAGES_HTTP_OR_JSON'),{kind,httpStatus:status});}
}
const envelope=value=>{need(object(value)&&value.success===true&&Array.isArray(value.errors)&&value.errors.length===0,'CF_ENVELOPE');return value.result;};
export async function completeForecastSharePagesList(read){
  const rows=[],ids=new Set(),names=new Set();let total=null,pages=null,perPage=null;
  for(let page=1;page<=5;page++){
    const response=await read('/pages/projects?page='+page+'&per_page=100','PROJECT_LIST');
    need(response.status===200,'LIST_STATUS');const data=envelope(response.value),info=response.value.result_info;
    need(Array.isArray(data)&&data.length<=100&&(info===undefined||object(info)),'LIST_INCOMPLETE');
    if(info!==undefined){
      if(Object.hasOwn(info,'page'))need(info.page===page,'LIST_INCOMPLETE');
      if(Object.hasOwn(info,'per_page')){
        need(Number.isSafeInteger(info.per_page)&&info.per_page>0&&info.per_page<=100
          &&data.length<=info.per_page,'LIST_INCOMPLETE');
        if(perPage===null)perPage=info.per_page;else need(perPage===info.per_page,'LIST_CHANGED');
      }
      if(Object.hasOwn(info,'count'))need(info.count===data.length,'LIST_INCOMPLETE');
      for(const [key,maximum] of [['total_count',500],['total_pages',5]])if(Object.hasOwn(info,key)){
        need(Number.isSafeInteger(info[key])&&info[key]>=0&&info[key]<=maximum,'LIST_INCOMPLETE');
        if(key==='total_count'){if(total===null)total=info[key];else need(total===info[key],'LIST_CHANGED');}
        else{if(pages===null)pages=info[key];else need(pages===info[key],'LIST_CHANGED');}
      }
    }
    for(const row of data){need(object(row)&&projectId(row.id)&&typeof row.name==='string'
      &&/^[a-z0-9][a-z0-9-]*$/.test(row.name)&&!ids.has(row.id)&&!names.has(row.name),'LIST_ROW');
      ids.add(row.id);names.add(row.name);rows.push(row);}
    need(rows.length<=500&&(total===null||rows.length<=total),'LIST_INCOMPLETE');
    // A short page or optional totals are not a completeness proof. Observe the
    // actual empty terminal page, still within the same fixed five-page bound.
    if(data.length===0){
      need(total===null||rows.length===total,'LIST_INCOMPLETE');
      need(pages===null||(page===1&&rows.length===0&&(pages===0||pages===1))||pages===page-1,'LIST_INCOMPLETE');
      return rows;
    }
    need(pages===null||page<=pages,'LIST_INCOMPLETE');
  }
  throw fail('SHARE_PAGES_LIST_INCOMPLETE');
}
export async function deployForecastSharePages({env=process.env,fetchImpl=globalThis.fetch,
  deployImpl=deployForecastSharePagesProcess,git=args=>{const text=execFileSync('git',args,{cwd:ROOT,encoding:'utf8'});return args[0]==='show'?text:text.trimEnd();},
  now=()=>Date.now(),report=()=>{}}={}){
  let stage='AUTHORITY',operation=null,createIssued=false,deployIssued=false,terminationConfirmed=null,ownedId=null;
  let readback='NOT_ATTEMPTED',lastKind=null,httpStatus=null;
  const emit=value=>report(value);
  try{
    operation=assertForecastSharePagesAuthority(env);const commit=env.EXPECTED_MAIN;
    const inventory=forecastSharePagesInventory(git,commit);
    const ghHeaders={Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    const freshMain=async()=>{
      need(git(['rev-parse','HEAD^{commit}'])===commit&&git(['status','--porcelain','--untracked-files=no'])==='','LOCAL_MAIN');
      const result=await boundedJson(fetchImpl,'https://api.github.com/repos/'+REPO+'/git/ref/heads/main',{method:'GET',headers:ghHeaders},'GH_MAIN');
      need(result.status===200&&result.value.ref==='refs/heads/main'&&result.value.object?.type==='commit'
        &&result.value.object.sha===commit,'MAIN_MOVED');
    };
    const cfBase='https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID;
    const cfHeaders={Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,Accept:'application/json'};
    const read=(suffix,kind)=>boundedJson(fetchImpl,cfBase+suffix,{method:'GET',headers:cfHeaders},kind);
    const readResult=async(suffix,kind)=>{const response=await read(suffix,kind);
      if(response.status!==200)throw Object.assign(fail('SHARE_PAGES_READ_STATUS'),{kind,httpStatus:response.status});
      return envelope(response.value);};
    const projectPath='/pages/projects/'+FORECAST_SHARE_PAGES_PROJECT;
    stage='PREWRITE';await freshMain();
    const manifestRead=await boundedJson(fetchImpl,'https://ravradar.dk/data/live/manifest.json',
      {method:'GET',headers:{Accept:'application/json'}},'PUBLIC_MANIFEST');
    need(manifestRead.status===200&&manifestRead.value.schemaVersion===4,'PUBLIC_MANIFEST');
    const manifest=manifestRead.value;assertRavScoreModelBinding(manifest.ravScoreModelBinding);
    selectPublicRuntimeAvailability(manifest,{modelBinding:ravScoreModelBinding(),now:now()});
    const projects=await completeForecastSharePagesList(read);
    let alreadyDeployed=false,selected;
    // An update requires the exact owned identity recorded after a successful
    // first create. Discovery alone never adopts an existing project. This
    // first update phase intentionally retains the pages.dev-only host guard.
    const pinnedCurrent=(value,deploymentId,deploymentCommit)=>{
      assertForecastSharePagesRemoteProject(value,ownedId);
      need(value.domains.length===1,'UPDATE_DOMAINS');
      need(value.uses_functions===true,'FUNCTIONS_UNPROVED');
      need(assertForecastSharePagesDeployment(value.canonical_deployment,ownedId,deploymentCommit)===deploymentId
        &&value.latest_deployment?.id===deploymentId,'PREDECESSOR_CHANGED');
    };
    if(operation==='create'){
    need(!projects.some(row=>row.name===FORECAST_SHARE_PAGES_PROJECT),'PROJECT_ALREADY_EXISTS');
    const absence=await read(projectPath,'PROJECT_ABSENCE');
    need(absence.status===404&&absence.value?.success===false&&Array.isArray(absence.value.errors)
      &&absence.value.errors.length>0&&(absence.value.result===null||absence.value.result===undefined),'ABSENCE_UNPROVED');
    await freshMain();assert.deepEqual(forecastSharePagesInventory(git,commit),inventory);
    stage='CREATE_PROJECT';createIssued=true;emit({kind:'FORECAST_SHARE_PAGES_WRITE_INTENT_V1',stage,sourceSha:commit,createIssued,deployIssued});
    const createBody={name:FORECAST_SHARE_PAGES_PROJECT,production_branch:'main',deployment_configs:{
      preview:{compatibility_date:'2026-10-24',compatibility_flags:[],env_vars:{}},
      production:{compatibility_date:'2026-10-24',compatibility_flags:[],env_vars:{}}}};
    let created;
    try{
      const result=await boundedJson(fetchImpl,cfBase+'/pages/projects',{method:'POST',
        headers:{...cfHeaders,'Content-Type':'application/json'},body:JSON.stringify(createBody)},'PROJECT_CREATE');
      need(result.status===200||result.status===201,'CREATE_STATUS');created=envelope(result.value);
      ownedId=assertForecastSharePagesRemoteProject(created);
    }catch(error){
      // Presence after a lost response is evidence, never proof that this caller
      // owns that project. Report the readback and stop; never repeat the POST.
      try{const observed=await read(projectPath,'CREATE_READBACK');readback=observed.status===200?'PRESENT_UNOWNED':observed.status===404?'ABSENT':'UNKNOWN';}catch{readback='UNKNOWN';}
      throw error;
    }
    selected=await readResult(projectPath,'OWNED_PROJECT_READBACK');
    assertForecastSharePagesRemoteProject(selected,ownedId);
    need(!selected.canonical_deployment&&!selected.latest_deployment,'PREEXISTING_DEPLOYMENT');
    }else{
      const row=projects.find(row=>row.name===FORECAST_SHARE_PAGES_PROJECT);
      need(row?.id===env.EXPECTED_PROJECT_ID,'UPDATE_PROJECT_IDENTITY');
      selected=await readResult(projectPath,'UPDATE_PROJECT_READBACK');
      assertForecastSharePagesRemoteProject(selected,env.EXPECTED_PROJECT_ID);ownedId=env.EXPECTED_PROJECT_ID;
      const predecessor=await readResult(projectPath+'/deployments/'+env.EXPECTED_DEPLOYMENT_ID,'UPDATE_PREDECESSOR_DETAIL');
      need(assertForecastSharePagesDeployment(predecessor,ownedId,env.EXPECTED_DEPLOYMENT_COMMIT)
        ===env.EXPECTED_DEPLOYMENT_ID,'UPDATE_PREDECESSOR');
      alreadyDeployed=selected.canonical_deployment?.deployment_trigger?.metadata?.commit_hash===commit;
      pinnedCurrent(selected,alreadyDeployed?selected.canonical_deployment.id:env.EXPECTED_DEPLOYMENT_ID,
        alreadyDeployed?commit:env.EXPECTED_DEPLOYMENT_COMMIT);
    }
    await freshMain();assert.deepEqual(forecastSharePagesInventory(git,commit),inventory);
    if(operation==='update'){
      const current=await readResult(projectPath,'UPDATE_PROJECT_PREWRITE');
      pinnedCurrent(current,selected.canonical_deployment.id,alreadyDeployed?commit:env.EXPECTED_DEPLOYMENT_COMMIT);
    }
    const deployEnv=Object.fromEntries(['PATH','HOME','USERPROFILE','SystemRoot','WINDIR','TEMP','TMP','TMPDIR','LANG','LC_ALL',
      'RUNNER_TEMP','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN']
      .filter(key=>typeof env[key]==='string').map(key=>[key,env[key]]));
    Object.assign(deployEnv,{CI:'true',WRANGLER_SEND_METRICS:'false',NO_COLOR:'1'});
    let deployFailed=false;
    if(!alreadyDeployed){
    stage='DEPLOY';deployIssued=true;terminationConfirmed=false;
    emit({kind:'FORECAST_SHARE_PAGES_WRITE_INTENT_V1',stage,sourceSha:commit,projectId:ownedId,createIssued,deployIssued,terminationConfirmed});
    try{const result=await deployImpl({commitSha:commit,env:deployEnv});terminationConfirmed=result?.terminationConfirmed===true;}
    catch(error){terminationConfirmed=error?.terminationConfirmed===true;deployFailed=true;}
    if(!terminationConfirmed){
      try{const observed=await read(projectPath,'DEPLOY_STOP_READBACK');
        readback=observed.status===200?'PRESENT_PROCESS_UNCONFIRMED':'UNKNOWN';}catch{readback='UNKNOWN';}
    }
    need(terminationConfirmed,'DEPLOY_STOP_UNKNOWN');
    }
    stage='DEPLOY_READBACK';
    const remote=await readResult(projectPath,'DEPLOY_PROJECT');
    assertForecastSharePagesRemoteProject(remote,ownedId);
    if(operation==='update')pinnedCurrent(remote,remote.canonical_deployment?.id,commit);
    need(remote.uses_functions===true,'FUNCTIONS_UNPROVED');
    const deploymentId=assertForecastSharePagesDeployment(remote.canonical_deployment,ownedId,commit);
    const deployment=await readResult(projectPath+'/deployments/'+deploymentId,'DEPLOYMENT_DETAIL');
    need(assertForecastSharePagesDeployment(deployment,ownedId,commit)===deploymentId,'DEPLOYMENT_CHANGED');
    need(remote.latest_deployment?.id===deploymentId,'LATEST_DEPLOYMENT_CHANGED');
    await freshMain();assert.deepEqual(forecastSharePagesInventory(git,commit,{afterDeployment:deployIssued}),inventory);
    const final=await readResult(projectPath,'FINAL_PROJECT');
    assertForecastSharePagesRemoteProject(final,ownedId);
    if(operation==='update')pinnedCurrent(final,deploymentId,commit);
    need(final.uses_functions===true,'FUNCTIONS_UNPROVED');
    need(assertForecastSharePagesDeployment(final.canonical_deployment,ownedId,commit)===deploymentId
      &&final.latest_deployment?.id===deploymentId,'FINAL_DEPLOYMENT_CHANGED');
    stage='COMPLETE';readback='DEPLOYMENT_PROVED';
    const receipt={kind:'FORECAST_SHARE_PAGES_RELEASE_READBACK_V1',stage,sourceSha:commit,projectName:FORECAST_SHARE_PAGES_PROJECT,
      operation,projectId:ownedId,deploymentId,publicOrigin:FORECAST_SHARE_PAGES_ORIGIN,publicDatasetId:manifest.datasetId,
      predecessorDeploymentId:operation==='update'?env.EXPECTED_DEPLOYMENT_ID:null,
      predecessorCommit:operation==='update'?env.EXPECTED_DEPLOYMENT_COMMIT:null,
      publicModelBinding:ravScoreModelBinding(),createIssued,deployIssued,terminationConfirmed,readback,
      outcome:alreadyDeployed?'ALREADY_DEPLOYED_READBACK_PROVED'
        :deployFailed?'COMMITTED_REPLY_LOST_READBACK_PROVED':'DEPLOYED_READBACK_PROVED',
      staticInputFiles:3,functionsInputFiles:1,bindings:0,customDomains:0,dnsChanged:false,legacyWorkerChanged:false,
      frontendChanged:false,hostedScoreProved:false,freeCapacityProved:false};emit(receipt);return receipt;
  }catch(error){
    lastKind=['GH_MAIN','PUBLIC_MANIFEST','PROJECT_LIST','PROJECT_ABSENCE','PROJECT_CREATE','CREATE_READBACK',
      'OWNED_PROJECT_READBACK','UPDATE_PROJECT_READBACK','UPDATE_PREDECESSOR_DETAIL','UPDATE_PROJECT_PREWRITE',
      'DEPLOY_PROJECT','DEPLOYMENT_DETAIL','FINAL_PROJECT'].includes(error?.kind)?error.kind:null;
    httpStatus=Number.isInteger(error?.httpStatus)&&error.httpStatus>=100&&error.httpStatus<=599?error.httpStatus:null;
    const receipt={kind:'FORECAST_SHARE_PAGES_RELEASE_STOP_V1',stage,sourceSha:SHA.test(env.EXPECTED_MAIN??'')?env.EXPECTED_MAIN:null,
      code:/^SHARE_PAGES_[A-Z_]+$/.test(error?.code??'')?error.code:'SHARE_PAGES_VALIDATION_OR_TRANSPORT',
      operation,readKind:lastKind,httpStatus,projectId:ownedId,createIssued,deployIssued,terminationConfirmed,readback,
      outcome:createIssued||deployIssued?'UNKNOWN_NO_RETRY':'REFUSED_BEFORE_WRITE'};emit(receipt);
    throw Object.assign(fail(receipt.outcome),{receipt});
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let descriptor;
  try{
    need(process.argv.length===2,'ARGUMENTS');fs.mkdirSync(path.join(ROOT,'.cache'),{recursive:true});
    descriptor=fs.openSync(path.join(ROOT,'.cache/forecast-share-pages-release.jsonl'),'wx',0o600);
    await deployForecastSharePages({report:value=>{fs.writeSync(descriptor,JSON.stringify(value)+'\n');fs.fsyncSync(descriptor);}});
    console.log('Pages-prognosedeling: projekt og deploy genlæst. Hosted score og Free-kapacitet afventer særskilt kontrol.');
  }catch{console.error('Pages-prognosedeling stoppet; se fast kvittering. Ingen automatisk gentagelse.');process.exitCode=1;}
  finally{if(descriptor!==undefined)fs.closeSync(descriptor);}
}
