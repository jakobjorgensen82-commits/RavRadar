// Separate existing-D1 statistics delivery. No assistant/Supabase migration grant.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {schemaTokens} from './prepare-cloudflare-trip-storage.mjs';
import {verifyExistingWorkerBindings} from './verify-cloudflare-trip-gateway.mjs';
import {deployTripWorker} from './lib/trip-worker-deploy-process.mjs';
import {waitForTripStorageEdgeReadiness} from './lib/trip-storage-edge-readiness.mjs';
import {boundedFetch} from './lib/bounded-fetch.mjs';
import {exactRelativeModuleSpecifiers} from './lib/static-module-closure.mjs';

const CONFIG='/tmp/ravradar-private-trip-study-wrangler.json';
const PLAN='/tmp/ravradar-private-trip-study-plan.json';
const INTENT='/tmp/ravradar-private-trip-study-apply-intent.json';
const MIGRATION='cloudflare/trip-gateway/migrations/004_trip_weather_aggregate_releases.sql';
const MIGRATION_SHA='89ce282ac7ab7ced40162a6fec09032def9256a69e740bd1ecc5d1d344733332';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const VARS=Object.freeze({TRIP_AGGREGATE_ENABLED:'false'});
const FAILURE='PRIVATE_TRIP_STUDY_DELIVERY_FAILED';
const STATS_TABLES=['trip_weather_aggregate_policy_anchor','trip_weather_aggregate_releases','trip_weather_aggregate_account_charges'];
const META_SQL="select type,name,tbl_name,sql from sqlite_master where name like 'trip_weather_aggregate_%' or tbl_name in ('trip_weather_aggregate_policy_anchor','trip_weather_aggregate_releases','trip_weather_aggregate_account_charges') order by type,name";
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=stage=>Object.assign(new Error(FAILURE),{stage});
const canonical=value=>JSON.stringify(value);
function workerSources(){
  const root=path.resolve('.'),pending=['cloudflare/trip-gateway/worker.js'],seen=new Set(),result=[];let total=0;
  while(pending.length){
    const file=pending.shift();if(seen.has(file))continue;seen.add(file);
    if(seen.size>128)throw fail('WORKER_SOURCE_BOUND');
    const absolute=path.resolve(root,file),relative=path.relative(root,absolute);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw fail('WORKER_SOURCE_PATH');
    let at=root;for(const component of relative.split(path.sep)){
      at=path.join(at,component);if(fs.lstatSync(at).isSymbolicLink())throw fail('WORKER_SOURCE_PATH');
    }
    const stat=fs.lstatSync(absolute);if(!stat.isFile()||stat.size<1||stat.size>4*1024*1024)throw fail('WORKER_SOURCE_BOUND');
    const bytes=fs.readFileSync(absolute);total+=bytes.length;if(bytes.length!==stat.size||total>8*1024*1024)throw fail('WORKER_SOURCE_BOUND');
    result.push({file:file.replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});
    for(const specifier of exactRelativeModuleSpecifiers(bytes.toString('utf8'),file)){
      if(/[?#]/.test(specifier))throw fail('WORKER_SOURCE_SPECIFIER');
      pending.push(path.relative(root,path.resolve(path.dirname(absolute),specifier)).replaceAll('\\','/'));
    }
  }
  return result.sort((a,b)=>a.file<b.file?-1:1);
}
function normalized(rows){
  if(!Array.isArray(rows)||rows.length>40)throw fail('SCHEMA_METADATA');
  return rows.map(row=>{
    if(!row||Object.keys(row).sort().join(',')!=='name,sql,tbl_name,type'
      ||!['table','index','trigger'].includes(row.type)||typeof row.name!=='string'||typeof row.tbl_name!=='string'
      ||!(row.sql===null||typeof row.sql==='string'))throw fail('SCHEMA_METADATA');
    return{type:row.type,name:row.name,tbl_name:row.tbl_name,sql:row.sql===null?null:schemaTokens(row.sql)};
  });
}
export function privateTripStudySchemaModel(){
  const bytes=fs.readFileSync(MIGRATION);if(hash(bytes)!==MIGRATION_SHA)throw fail('MIGRATION_SOURCE');
  const database=new DatabaseSync(':memory:');
  try{database.exec(bytes.toString('utf8'));
    return{migration:bytes.toString('utf8'),metadata:normalized(database.prepare(META_SQL).all().map(row=>({...row}))),
      anchor:database.prepare('select * from trip_weather_aggregate_policy_anchor').all().map(row=>({...row}))};
  }finally{database.close();}
}
export function classifyPrivateTripStudySchema(model,snapshots){
  if(!Array.isArray(snapshots)||snapshots.length!==10)throw fail('SHARD_COUNT');
  const normalizedSets=snapshots.map(normalized);
  if(normalizedSets.slice(1).some(rows=>rows.length))throw fail('NON_CONTROL_STATISTICS_SCHEMA');
  const current=normalizedSets[0],state=current.length===0?'ABSENT':isDeepStrictEqual(current,model.metadata)?'EXACT':'UNKNOWN';
  if(state==='UNKNOWN')throw fail('PARTIAL_OR_CHANGED_STATISTICS_SCHEMA');
  return{state,beforeSchemaSha256:hash(canonical(normalizedSets)),expectedControlSchemaSha256:hash(canonical(model.metadata))};
}
function readOwnedJson(filename,maximum=65536){
  const stat=fs.lstatSync(filename);if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>maximum)throw fail('LOCAL_FILE');
  return JSON.parse(fs.readFileSync(filename,'utf8'));
}
function assertConfiguration(config){
  if(!config||Object.keys(config).sort().join(',')!==['compatibility_date','d1_databases','main','name','observability','preview_urls','vars','workers_dev'].sort().join(',')
    ||config.name!=='ravradar-trip-gateway'||config.main!==path.resolve('cloudflare/trip-gateway/worker.js').replaceAll('\\','/')
    ||config.compatibility_date!=='2026-08-26'||config.workers_dev!==true||config.preview_urls!==false
    ||!isDeepStrictEqual(config.observability,{enabled:true})||!isDeepStrictEqual(config.vars,VARS)
    ||!Array.isArray(config.d1_databases)||config.d1_databases.length!==10
    ||config.d1_databases.some((row,i)=>Object.keys(row).sort().join(',')!=='binding,database_id,database_name'
      ||row.binding!=='TRIP_DB_'+i||row.database_name!=='ravradar-trips-'+i||!UUID.test(row.database_id||''))
    ||new Set(config.d1_databases.map(row=>row.database_id.toLowerCase())).size!==10)throw fail('CONFIGURATION');
  return config;
}
export async function deployPrivateTripStudy(){
  // These are existing secrets. Never put service-role/DB-password in Wrangler children.
  const env={...process.env,TRIP_WRANGLER_CONFIG_PATH:CONFIG,TRIP_STORAGE_OWNER_ERASURE_GUARD:'1',
    TRIP_STORAGE_OWNER_EXPORT_UPGRADE:'0',TRIP_STORAGE_UPGRADE_PREFLIGHT:'0'};
  delete env.SUPABASE_SERVICE_ROLE_KEY;delete env.SUPABASE_DB_PASSWORD;delete env.TRIP_PSEUDONYM_SECRET_V1;
  delete env.EXPECTED_TRIP_WORKER_VERSION;
  let stage='AUTHORITY',deadline=0,interrupted=false,schemaVerified=false,stopKnown=true,workerIntent=false,recoveryAttempted=false;
  const onSignal=()=>{interrupted=true;};
  const run=(command,args,extra={})=>{
    try{return execFileSync(command,args,{env:{...env,...extra},encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:240000,maxBuffer:2*1024*1024});}
    catch{throw fail(stage);}
  };
  const exactMain=()=>{
    if(interrupted||process.platform!=='linux'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'
      ||env.GITHUB_WORKFLOW!=='Private RavRadar trip weather study'||env.GITHUB_REF!=='refs/heads/main'
      ||env.GITHUB_RUN_ATTEMPT!=='1'||!/^\d+$/.test(env.GITHUB_RUN_ID||'')||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')
      ||env.SUPABASE_PROJECT_ID!=='afqhhdrkjfjtpadntdzo'||env.TRIP_STORAGE_OPERATION!=='existing-private-study-upgrade'
      ||env.TRIP_STORAGE_PRIVATE_STUDY!=='1'||!['plan','deliver'].includes(env.TRIP_PRIVATE_STUDY_MODE)
      ||!['true','false'].includes(env.TRIP_PRIVATE_STUDY_APPLY_ALLOWED))throw fail('AUTHORITY');
    if(!/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID||'')||typeof env.CLOUDFLARE_API_TOKEN!=='string'
      ||env.CLOUDFLARE_API_TOKEN.length<1)throw fail('CONFIGURATION');
    run('git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main']);
    for(const ref of ['HEAD^{commit}','origin/main^{commit}'])if(run('git',['rev-parse',ref]).trim()!==env.GITHUB_SHA)throw fail('MAIN_CHANGED');
  };
  const lease=seconds=>{if(interrupted||deadline-Date.now()<seconds*1000||deadline-Date.now()>20*60000)throw fail('LEASE');};
  const edge=mode=>run('node',['scripts/verify-trip-storage-edge.mjs'],{EXPECTED_TRIP_STORAGE_MODE:mode});
  const oldFence=()=>{
    const row=JSON.parse(run('node',['scripts/prepare-cloudflare-trip-storage.mjs','--existing-owner-erasure-guard-plan']));
    if(row.kind!=='TRIP_OWNER_ERASURE_INSERT_FENCE_SCHEMA_PLAN'||row.sourceSha!==env.GITHUB_SHA
      ||!UUID.test(row.workerVersionId||'')||!Array.isArray(row.missingShards)||row.missingShards.length
      ||!Array.isArray(row.shardIdentities)||row.shardIdentities.length!==10||new Set(row.shardIdentities).size!==10
      ||row.shardIdentities.some(x=>!/^[a-f0-9]{64}$/.test(x))
      ||row.migrationSha256!=='40c4590dd2c10e4ce8384cb98ef4be5b399bf7ba5fe6bcc270430c1e6093d83e')throw fail('EXISTING_SCHEMA');
    return row;
  };
  let config,model,originalFence,plan;
  const cf=async(pathname,body)=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let reader;
    try{
      return await Promise.race([(async()=>{
        const response=await boundedFetch('https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+pathname,
          {method:body?'POST':'GET',redirect:'error',cache:'no-store',signal:controller.signal,
            headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
        if(response.status!==200||response.redirected)throw fail(stage);
        reader=response.body?.getReader();if(!reader)throw fail(stage);let total=0;const chunks=[];
        for(;;){const item=await reader.read();if(item.done)break;if((total+=item.value.byteLength)>1024*1024)throw fail(stage);chunks.push(item.value);}
        const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(result?.success!==true||!Array.isArray(result.result))throw fail(stage);
        return result.result;
      })(),new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(fail(stage)),{once:true}))]);
    }finally{clearTimeout(timer);controller.abort();try{void reader?.cancel().catch(()=>{});}catch{}}
  };
  const query=async(index,sql)=>{
    const result=await cf('/d1/database/'+config.d1_databases[index].database_id+'/query',{sql});
    if(result.length!==1||result[0]?.success!==true||!Array.isArray(result[0].results))throw fail(stage);
    return result[0].results;
  };
  const inspect=async()=>{
    const snapshots=[];for(let i=0;i<10;i++)snapshots.push(await query(i,META_SQL));
    const classification=classifyPrivateTripStudySchema(model,snapshots);
    if(classification.state==='EXACT'){
      const anchor=await query(0,'select * from trip_weather_aggregate_policy_anchor');
      if(!isDeepStrictEqual(anchor,model.anchor))throw fail('POLICY_ANCHOR_CHANGED');
    }
    return classification;
  };
  const attest=async(version,enabled=false)=>{
    if(!isDeepStrictEqual(assertConfiguration(readOwnedJson(CONFIG)),config))throw fail('CONFIGURATION_CHANGED');
    if(plan&&!isDeepStrictEqual(workerSources(),plan.workerSourceFiles))throw fail('WORKER_SOURCE_CHANGED');
    const observed=await verifyExistingWorkerBindings({accountId:env.CLOUDFLARE_ACCOUNT_ID,apiToken:env.CLOUDFLARE_API_TOKEN,
      workerName:config.name,expectedBindings:config.d1_databases,expectedVersion:version,
      ...(enabled?{expectedPlainTextBindings:VARS}:{})});
    return observed.versionId;
  };
  const verifySchema=async()=>{
    stage='SCHEMA_READBACK';const result=await inspect();if(result.state!=='EXACT')throw fail(stage);
    const fence=oldFence();if(!isDeepStrictEqual({...fence,workerVersionId:null},{...originalFence,workerVersionId:null}))throw fail('OLD_SCHEMA_CHANGED');
    schemaVerified=true;return result;
  };
  const quiesce=()=>{
    stage='QUIESCE';exactMain();deadline=Date.now()+20*60000;
    run('supabase',['secrets','set','--project-ref',env.SUPABASE_PROJECT_ID,'TRIP_STORAGE_MODE=maintenance:'+new Date(deadline).toISOString()]);
    edge('maintenance');run('sleep',['20']);
  };
  const replace=async()=>{
    stage='WORKER_REPLACE';if(!schemaVerified)throw fail(stage);await verifySchema();await attest();exactMain();lease(600);
    stage='WORKER_REPLACE';
    workerIntent=true;stopKnown=false;let deployed;
    try{deployed=await deployTripWorker({configPath:CONFIG,env});stopKnown=deployed?.terminationConfirmed===true;if(!stopKnown)throw fail(stage);}
    catch(error){if(error?.terminationConfirmed===true)stopKnown=true;throw fail(stage);}
    const versions=[...deployed.stdout.matchAll(/^Current Version ID:\s*([a-f0-9-]+)\s*$/gim)];
    if(versions.length!==1||!UUID.test(versions[0][1]))throw fail('WORKER_VERSION');
    await attest(versions[0][1],true);return versions[0][1];
  };
  const restore=async version=>{
    stage='RESTORE';await verifySchema();await attest(version,true);exactMain();lease(1);
    stage='RESTORE';
    run('supabase',['secrets','set','--project-ref',env.SUPABASE_PROJECT_ID,'TRIP_STORAGE_MODE=d1']);edge('d1');await attest(version,true);
  };
  process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
  try{
    exactMain();stage='SOURCE_PROOF';
    const sourceProof=run('node',['scripts/weather-source-gate.mjs','check']);
    if(!/^Source gate: required=false; reason=[^\r\n]+$/m.test(sourceProof))throw fail(stage);
    stage='READ_ONLY_PLAN';run('node',['scripts/prepare-cloudflare-trip-storage.mjs','--existing-worker-repair']);
    const base=readOwnedJson(CONFIG);if(Object.hasOwn(base,'vars'))throw fail('UNEXPECTED_CONFIG');
    config=assertConfiguration({...base,vars:{...VARS}});fs.writeFileSync(CONFIG,JSON.stringify(config)+'\n',{mode:0o600});
    originalFence=oldFence();model=privateTripStudySchemaModel();
    const before=await inspect();const currentVersion=await attest(originalFence.workerVersionId);edge('d1');
    plan={kind:'PRIVATE_TRIP_STUDY_CONTROL0_PLAN',sourceSha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,
      workerVersionId:currentVersion,migrationSha256:MIGRATION_SHA,configurationSha256:hash(canonical(config)),
      bindingsSha256:hash(canonical(config.d1_databases)),workerSourceFiles:workerSources(),oldSchema:originalFence,...before};
    fs.writeFileSync(PLAN,JSON.stringify(plan)+'\n',{flag:'wx',mode:0o600});
    if(env.TRIP_PRIVATE_STUDY_MODE==='plan')return{...plan,operation:'READ_ONLY_PLAN',schemaApplied:false,workerUpdated:false};
    if(before.state==='ABSENT'&&env.TRIP_PRIVATE_STUDY_APPLY_ALLOWED!=='true')throw fail('004_APPLY_NOT_ALLOWED');
    quiesce();stage='PRE_APPLY_REVALIDATION';lease(600);exactMain();
    if(!isDeepStrictEqual(readOwnedJson(PLAN),plan)||!isDeepStrictEqual(await inspect(),before))throw fail(stage);
    await attest(currentVersion);
    if(before.state==='ABSENT'){
      if(env.TRIP_PRIVATE_STUDY_APPLY_ALLOWED!=='true')throw fail('004_APPLY_NOT_ALLOWED');
      stage='004_APPLY_INTENT';fs.writeFileSync(INTENT,JSON.stringify(plan)+'\n',{flag:'wx',mode:0o600});
      stage='004_APPLY_OUTCOME_UNKNOWN';
      // EXACTLY ONE possible DDL invocation, only the existing control binding0.
      const result=await cf('/d1/database/'+config.d1_databases[0].database_id+'/query',{sql:model.migration});
      if(!result.length||result.length>64||result.some(row=>row?.success!==true))throw fail(stage);
    }
    await verifySchema();await attest(currentVersion);
    let version;
    try{version=await replace();await restore(version);}
    catch(first){
      // DDL is outside this block and can NEVER be retried by Worker recovery.
      if(schemaVerified&&workerIntent&&stopKnown&&!interrupted){
        recoveryAttempted=true;try{
          const options={baseUrl:env.SUPABASE_URL,publishableKey:env.SUPABASE_PUBLISHABLE_KEY,preUpgrade:false};
          const maintained=await waitForTripStorageEdgeReadiness({...options,expectedStorageMode:'maintenance'});
          const normal=maintained.ok?null:await waitForTripStorageEdgeReadiness({...options,expectedStorageMode:'d1'});
          if(!maintained.ok&&!normal?.ok)throw fail('RECOVERY_READBACK');
          await verifySchema();quiesce();const recovered=await replace();await restore(recovered);
        }catch{}
      }
      throw first;
    }
    return{kind:'PRIVATE_TRIP_STUDY_EXISTING_WORKER_ATTESTED',sourceSha:env.GITHUB_SHA,workerVersionId:version,
      migrationSha256:MIGRATION_SHA,ddlApplied:before.state==='ABSENT',controlShard:0,shards:10,
      configAttested:true,storageMode:'d1',reportExported:false,publicStatisticsActivated:false};
  }catch(error){throw Object.assign(fail(error?.stage||stage),{recoveryAttempted,terminationConfirmed:stopKnown});}
  finally{process.off('SIGINT',onSignal);process.off('SIGTERM',onSignal);}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  if(process.argv.length!==2)throw fail('ARGUMENTS');
  deployPrivateTripStudy().then(value=>console.log(JSON.stringify(value))).catch(error=>{
    console.error(JSON.stringify({kind:FAILURE,stage:error.stage,recoveryAttempted:error.recoveryAttempted===true,
      terminationConfirmed:error.terminationConfirmed===true}));process.exitCode=1;
  });
}
