// Normal controller, real synthetic SQLite metadata, no hosted calls or trips.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {schemaTokens} from './prepare-cloudflare-trip-storage.mjs';
import {exactRelativeModuleSpecifiers} from './lib/static-module-closure.mjs';
import {privateTripStudySchemaModel,classifyPrivateTripStudySchema,privateTripStudyMigrationSteps}
  from './deploy-private-trip-study.mjs';

const source=fs.readFileSync(new URL('./deploy-private-trip-study.mjs',import.meta.url),'utf8');
const migration='cloudflare/trip-gateway/migrations/007_trip_weather_aggregate_categorical_policy.sql';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const model=privateTripStudySchemaModel();
const metadata=db=>db.prepare("select type,name,tbl_name,sql from sqlite_master where name like 'trip_weather_aggregate_%' or tbl_name like 'trip_weather_aggregate_%' order by type,name")
  .all().map(row=>({...row}));
const snapshots=rows=>[rows,...Array.from({length:9},()=>[])];
function database(state='EXACT_004_005_006'){
  const db=new DatabaseSync(':memory:');
  db.exec(fs.readFileSync('cloudflare/trip-gateway/migrations/001_trip_observations.sql','utf8'));
  if(state!=='ABSENT')db.exec(model.migration);
  if(['EXACT_004_005','EXACT_004_005_006','EXACT_004_005_006_007'].includes(state))db.exec(model.jobsMigration);
  if(['EXACT_004_005_006','EXACT_004_005_006_007'].includes(state))db.exec(model.bindingMigration);
  if(state==='EXACT_004_005_006_007')db.exec(model.categoricalMigration);
  return db;
}

test('private-study007: exact source and18/39/41/46 states preserve004–006 and global4/8 accounting',()=>{
  assert.equal(sha(fs.readFileSync(migration)),'02af90118f981854da39edfde264480b89966fa9f336c0e6163de361569eb67e');
  assert.deepEqual([model.metadata.length,model.jobsMetadata.length,model.bindingMetadata.length,model.categoricalMetadata.length],[18,39,41,46]);
  for(const state of ['ABSENT','EXACT','EXACT_004_005','EXACT_004_005_006','EXACT_004_005_006_007']){
    const db=database(state);try{assert.equal(classifyPrivateTripStudySchema(model,snapshots(metadata(db))).state,state);}finally{db.close();}
  }
  const db=database();try{
    const before=metadata(db),anchor=db.prepare('select * from trip_weather_aggregate_policy_anchor').all(),
      control=db.prepare('select * from trip_weather_aggregate_job_control').all();
    db.exec(model.categoricalMigration);const after=metadata(db);
    assert.deepEqual(after.filter(row=>before.some(old=>old.name===row.name)&&row.name!=='trip_weather_aggregate_insert_guard'),
      before.filter(row=>row.name!=='trip_weather_aggregate_insert_guard'));
    assert.deepEqual(db.prepare('select * from trip_weather_aggregate_policy_anchor').all(),anchor);
    assert.deepEqual(db.prepare('select * from trip_weather_aggregate_job_control').all(),control);
    assert.deepEqual([model.categoricalAnchor[0].ledger_id,model.categoricalAnchor[0].cell_count,
      model.categoricalAnchor[0].cost_units,model.categoricalAnchor[0].maximum_units,model.categoricalAnchor[0].public_release_issued],
    ['rr-trip-descriptive-GLOBAL',160,4,8,0]);
    for(const table of ['trip_weather_aggregate_releases','trip_weather_aggregate_account_charges','trip_weather_aggregate_jobs'])
      assert.equal(db.prepare('select count(*) n from '+table).get().n,0);
    for(const sql of [model.categoricalMigration,
      'update trip_weather_aggregate_categorical_policy_anchor set cost_units=4',
      'delete from trip_weather_aggregate_categorical_policy_anchor'])assert.throws(()=>db.exec(sql));
  }finally{db.close();}
});

test('private-study007: separate exact006-only authority, old order, exact replay and malformed options',()=>{
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005_006'),[]);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005_006',{allow007:true}),['007']);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005_006_007',{allow004:true,allow005:true,allow006:true,allow007:true}),[]);
  assert.deepEqual(privateTripStudyMigrationSteps('ABSENT',{allow004:true,allow005:true,allow006:true}),['004','005','006']);
  for(const state of ['ABSENT','EXACT','EXACT_004_005'])
    assert.throws(()=>privateTripStudyMigrationSteps(state,{allow004:true,allow005:true,allow006:true,allow007:true}),e=>e.stage==='006_REQUIRED_BEFORE_007');
  for(const state of ['UNKNOWN','EXACT_007',null])assert.throws(()=>privateTripStudyMigrationSteps(state,{allow007:true}),e=>e.stage==='AUTHORITY');
  for(const allow007 of ['true',1,null,{}])assert.throws(()=>privateTripStudyMigrationSteps('EXACT_004_005_006',{allow007}),e=>e.stage==='AUTHORITY');
});

test('private-study007: all five additions, changed guard, ten-shard isolation and46-row bound fail closed',()=>{
  const db=database('EXACT_004_005_006_007');try{
    const rows=metadata(db),old=new Set(model.bindingMetadata.map(row=>row.name));
    const additions=rows.filter(row=>!old.has(row.name));assert.equal(additions.length,5);
    for(const removed of additions)assert.throws(()=>classifyPrivateTripStudySchema(model,snapshots(rows.filter(row=>row!==removed))),
      e=>e.stage==='PARTIAL_OR_CHANGED_STATISTICS_SCHEMA');
    assert.throws(()=>classifyPrivateTripStudySchema(model,snapshots(rows.map(row=>row.name==='trip_weather_aggregate_insert_guard'
      ?{...row,sql:row.sql.replace('>8','>9')}:row))),e=>e.stage==='PARTIAL_OR_CHANGED_STATISTICS_SCHEMA');
    for(const shard of [1,9]){const all=snapshots(rows);all[shard]=additions;
      assert.throws(()=>classifyPrivateTripStudySchema(model,all),e=>e.stage==='NON_CONTROL_STATISTICS_SCHEMA');}
    assert.throws(()=>classifyPrivateTripStudySchema(model,snapshots([...rows,{...rows[0]}])),e=>e.stage==='SCHEMA_METADATA');
    assert.throws(()=>classifyPrivateTripStudySchema(model,snapshots([...model.bindingMetadata,{...model.bindingMetadata[0]}])),e=>e.stage==='SCHEMA_METADATA');
    assert.throws(()=>classifyPrivateTripStudySchema(model,snapshots(rows.map(row=>row.name===additions[0].name?{...row,type:'view'}:row))),e=>e.stage==='SCHEMA_METADATA');
    assert.throws(()=>classifyPrivateTripStudySchema(model,snapshots(rows).slice(1)),e=>e.stage==='SHARD_COUNT');
  }finally{db.close();}
});

test('private-study007: whole exact test-only inverse preserves historical controller assertions',async()=>{
  const review=JSON.parse(fs.readFileSync('scripts/lib/private-trip-study-categorical-review.json','utf8'));
  const inverse=value=>{
    assert.equal(sha(value),review.afterSha256);
    for(const edit of [...review.edits].reverse()){
      assert.equal(value.split(edit.after).length,2);value=value.replace(edit.after,()=>edit.before);
    }
    assert.equal(sha(value),review.beforeSha256);return value;
  };
  const old=inverse(source);
  assert.equal(sha(old),'1dc1101146afbda2ff242cc759b0dfb1e7b172a93ab430a041778ef1e36a01f8');
  for(const altered of [source+'\n',source.replace('rows.length>46','rows.length>47'),
    source.replace("await verifySchema('EXACT_004_005_006');await attest(currentVersion,true);",
      "await verifySchema('EXACT_004_005_006');await attest(currentVersion);")])assert.throws(()=>inverse(altered));
  const workflow=fs.readFileSync('.github/workflows/private-trip-weather-study.yml','utf8').replaceAll('\r\n','\n');
  const readPermission=review.workflow.sourceProofReadPermission;
  assert.equal(sha(workflow),readPermission.afterSha256);
  const assertSourceProofReadPermission=value=>{
    assert.deepEqual(value.match(/^permissions:\n(?:  [^\n]+\n)+/gm)||[],
      ['permissions:\n  contents: read\n  actions: read\n  pull-requests: read\n']);
    assert.doesNotMatch(value,/^[ \t]+permissions:/m);
  };
  assertSourceProofReadPermission(workflow);
  for(const altered of [workflow.replace('  pull-requests: read\n',''),
    workflow.replace('  pull-requests: read','  pull-requests: write'),
    workflow.replace('  pull-requests: read','  pull-requests: read\n  issues: read'),
    workflow.replace('  private-study-upgrade:\n','  private-study-upgrade:\n    permissions: {}\n')]){
    assert.notEqual(altered,workflow);assert.throws(()=>assertSourceProofReadPermission(altered));
  }
  const beforeReadPermission=workflow.replace(readPermission.after,()=>readPermission.before);
  assert.equal(sha(beforeReadPermission),review.workflow.afterSha256);
  const callersPath=path.resolve('scripts/test-account-statistics-assistant-callers.mjs'),
    callers=fs.readFileSync(callersPath,'utf8'),
    from=callers.indexOf('async function privateStudyPre007Workflow(){'),
    to=callers.indexOf('async function privateStudy005ControllerView(source){',from);
  assert(from>0&&to>from);
  const legacyReaders=vm.runInNewContext(callers.slice(from,to).replaceAll('import.meta.url','moduleUrl')
    +'\n({privateStudyPre007Workflow,privateStudyPre007Controller});',
  {fs:fs.promises,URL,moduleUrl:pathToFileURL(callersPath).href,assert,crypto});
  assert.equal(await legacyReaders.privateStudyPre007Controller(),old);
  const oldWorkflow=await legacyReaders.privateStudyPre007Workflow();
  assert.equal(sha(oldWorkflow),'bdde67e93ae059a520e21305af42c1566080faa0da786fc670d7f28dc0285949');
  const order=fs.readFileSync('scripts/test-workflow-validation-order-4.0.108.mjs','utf8'),
    orderFrom=order.indexOf('function privateStudyPre007Workflow(source) {'),
    orderTo=order.indexOf('const privateStudyActualSource =',orderFrom);
  assert(orderFrom>0&&orderTo>orderFrom);
  const orderReader=vm.runInNewContext(order.slice(orderFrom,orderTo).replaceAll('import.meta.url','moduleUrl')
    +'\nprivateStudyPre007Workflow;',{fs,URL,assert,crypto,moduleUrl:pathToFileURL(callersPath).href});
  assert.equal(orderReader(workflow),oldWorkflow);
  assert.equal(orderReader(beforeReadPermission),oldWorkflow);
  assert.throws(()=>orderReader(workflow.replace('  pull-requests: read','  pull-requests: write')));
  for(const drift of [workflow+'\n',workflow.replace('allow_007:', 'allow_007_unreviewed:'),
    workflow.replace("inputs.allow_007 && 'true' || 'false'",'true')])assert.throws(()=>orderReader(drift));
  assert.equal((callers.match(/import '\.\/test-private-trip-study-categorical-controller\.mjs';/g)||[]).length,1);
  assert.match(workflow,/allow_007:\s*\n\s+description:[^\n]+\n\s+type: boolean\s*\n\s+default: false/);
  assert.match(workflow,/TRIP_PRIVATE_STUDY_CATEGORICAL_APPLY_ALLOWED: \$\{\{ inputs\.allow_007 && 'true' \|\| 'false' \}\}/);
  assert.match(workflow,/group: ravradar-weather-production-v2/);assert.match(workflow,/group: ravradar-trip-storage-production/);
  assert.equal((workflow.match(/run: node scripts\/deploy-private-trip-study.mjs/g)||[]).length,1);
});

// Run the unmodified normal deploy body with synthetic transports/commands only.
// SQLite executes exact migration bytes; a failed write is never retried here.
function controllerFixture({state='EXACT_004_005_006',mode='deliver',allow007='true',failure=null,workerOff=true}={}){
  const dbs=Array.from({length:10},(_,i)=>database(i===0?state:'ABSENT')),
    files=new Map(),events=[],writes=[],reads=[],account='a'.repeat(32),head='b'.repeat(40),
    version='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',nextVersion='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const configPath='/tmp/ravradar-private-trip-study-wrangler.json';let active=version;
  const config={name:'ravradar-trip-gateway',main:path.resolve('cloudflare/trip-gateway/worker.js').replaceAll('\\','/'),
    compatibility_date:'2026-08-26',workers_dev:true,preview_urls:false,observability:{enabled:true},
    d1_databases:dbs.map((_,i)=>({binding:'TRIP_DB_'+i,database_name:'ravradar-trips-'+i,
      database_id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`}))};
  const fence=()=>({kind:'TRIP_OWNER_ERASURE_INSERT_FENCE_SCHEMA_PLAN',sourceSha:head,workerVersionId:active,
    missingShards:[],shardIdentities:dbs.map((_,i)=>String(i).repeat(64)),
    migrationSha256:'40c4590dd2c10e4ce8384cb98ef4be5b399bf7ba5fe6bcc270430c1e6093d83e'});
  const filesystem={...fs,
    lstatSync(file){return files.has(file)?{isFile:()=>true,isSymbolicLink:()=>false,size:Buffer.byteLength(files.get(file))}:fs.lstatSync(file);},
    readFileSync(file,encoding){return files.has(file)?encoding?files.get(file):Buffer.from(files.get(file)):fs.readFileSync(file,encoding);},
    writeFileSync(file,data,options){assert.match(file,/^\/tmp\/ravradar-private-trip-study-/);if(options?.flag==='wx')assert(!files.has(file));
      files.set(file,String(data));events.push('file:'+path.basename(file));}
  };
  const run=(command,args)=>{
    events.push(command+':'+args[0]);
    if(command==='git')return args[0]==='rev-parse'?head+'\n':'';
    if(command==='node'&&args[0]==='scripts/weather-source-gate.mjs')return 'Source gate: required=false; reason=synthetic-exact-source\n';
    if(command==='node'&&args[0]==='scripts/prepare-cloudflare-trip-storage.mjs'){
      if(args[1]==='--existing-worker-repair'){files.set(configPath,JSON.stringify(config));return '';}
      assert.equal(args[1],'--existing-owner-erasure-guard-plan');return JSON.stringify(fence());
    }
    assert(command==='supabase'||command==='sleep'||command==='node'&&args[0]==='scripts/verify-trip-storage-edge.mjs');return '';
  };
  const attest=async options=>{
    events.push(options.expectedPlainTextBindings?'attest:OFF':'attest:bindings');
    assert.deepEqual(JSON.parse(JSON.stringify(options.expectedBindings)),config.d1_databases);
    if(options.expectedVersion)assert.equal(options.expectedVersion,active);
    if(options.expectedPlainTextBindings){assert.equal(options.expectedPlainTextBindings.TRIP_AGGREGATE_ENABLED,'false');if(!workerOff)throw new Error('synthetic ON');}
    return {versionId:active};
  };
  const transport=async(url,options)=>{
    assert(url.startsWith('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'));
    const id=url.split('/database/')[1].split('/')[0],index=config.d1_databases.findIndex(row=>row.database_id===id);assert(index>=0);
    const {sql}=JSON.parse(options.body);let result;
    if(sql===model.categoricalMigration){
      writes.push({index,sha256:sha(sql)});events.push('ddl:007');assert.equal(index,0);
      if(failure==='write-before')throw new Error('unknown write outcome');
      if(failure==='partial'){dbs[index].exec(sql.slice(0,sql.indexOf('CREATE TRIGGER trip_weather_aggregate_categorical_policy_no_replace')));}
      else dbs[index].exec(sql);
      if(failure==='write-after')throw new Error('unknown write outcome');
      result=failure==='write-shape'?[]:[{success:true,results:[]}];
    }else{
      assert(/^select /i.test(sql));reads.push({index,categorical:sql.includes('select * from trip_weather_aggregate_categorical_policy_anchor')});
      let rows=dbs[index].prepare(sql).all().map(row=>({...row}));
      if(failure==='categorical-anchor'&&sql.startsWith('select * from trip_weather_aggregate_categorical_policy_anchor'))
        rows=rows.map(row=>({...row,maximum_units:12}));
      if(failure==='legacy-anchor'&&sql.startsWith('select * from trip_weather_aggregate_policy_anchor'))
        rows=rows.map(row=>({...row,maximum_units:12}));
      result=[{success:true,results:rows}];
    }
    return new Response(JSON.stringify({success:true,result}),{status:200});
  };
  const body=source.slice(0,source.indexOf('\nif(process.argv[1]&&pathToFileURL('))
    .replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
  const context={fs:filesystem,path,crypto,execFileSync:run,DatabaseSync,pathToFileURL,isDeepStrictEqual,schemaTokens,
    exactRelativeModuleSpecifiers,verifyExistingWorkerBindings:attest,
    deployTripWorker:async()=>{events.push('worker:deploy');active=nextVersion;return{terminationConfirmed:true,stdout:'Current Version ID: '+nextVersion+'\n'};},
    waitForTripStorageEdgeReadiness:async()=>({ok:true}),boundedFetch:transport,
    process:{platform:'linux',on(){},off(){},env:{GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW:'Private RavRadar trip weather study',
      GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:head,
      SUPABASE_PROJECT_ID:'afqhhdrkjfjtpadntdzo',TRIP_STORAGE_OPERATION:'existing-private-study-upgrade',TRIP_STORAGE_PRIVATE_STUDY:'1',
      TRIP_PRIVATE_STUDY_MODE:mode,TRIP_PRIVATE_STUDY_APPLY_ALLOWED:'false',TRIP_PRIVATE_STUDY_JOBS_APPLY_ALLOWED:'false',
      TRIP_PRIVATE_STUDY_JOB_BINDING_APPLY_ALLOWED:'false',TRIP_PRIVATE_STUDY_CATEGORICAL_APPLY_ALLOWED:allow007,
      CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:'SYNTHETIC_NOT_A_CREDENTIAL'}},
    Buffer,AbortController,setTimeout,clearTimeout,console};
  const realm=vm.createContext(context),decodeRows=vm.runInContext('value=>JSON.parse(value)',realm);
  // node:sqlite is a host-native injection. Recreate its JSON result arrays in
  // the controller realm, exactly as normal same-realm SQLite/JSON do, keeping
  // the product's actual isDeepStrictEqual unchanged.
  realm.DatabaseSync=class{
    constructor(...args){this.database=new DatabaseSync(...args);}
    exec(sql){this.database.exec(sql);}
    prepare(sql){const statement=this.database.prepare(sql);return{all:(...args)=>decodeRows(JSON.stringify(statement.all(...args)))};}
    close(){this.database.close();}
  };
  const invoke=vm.runInContext(body+'\ndeployPrivateTripStudy;',realm);
  return{invoke,events,writes,reads,files,dbs,close:()=>dbs.forEach(db=>db.close())};
}

test('private-study007: normal read-only plan inspects all ten and sends no DDL or Worker write',async()=>{
  const fx=controllerFixture({mode:'plan'});try{
    const out=await fx.invoke();assert.equal(out.state,'EXACT_004_005_006');assert.equal(out.operation,'READ_ONLY_PLAN');
    assert.equal(out.originalJobBindingReady,true);assert.equal(out.categoricalPolicyReady,false);
    assert.equal(out.schemaApplied,false);assert.equal(out.workerUpdated,false);assert.equal(fx.writes.length,0);
    assert.equal(fx.events.filter(x=>x==='worker:deploy').length,0);
    assert.deepEqual([...new Set(fx.reads.map(row=>row.index))],[0,1,2,3,4,5,6,7,8,9]);
  }finally{fx.close();}
});

test('private-study007: normal deliver uses exact OFF-before-maintenance, one control0 write and full46 readbacks',async()=>{
  const fx=controllerFixture();try{
    const out=await fx.invoke();assert.equal(out.categoricalDdlApplied,true);assert.equal(out.categoricalPolicyReady,true);
    assert.equal(out.originalJobBindingReady,true);assert.equal(out.publicStatisticsActivated,false);assert.equal(out.reportExported,false);
    assert.equal(out.storageMode,'d1');assert.equal(fx.writes.length,1);assert.equal(fx.writes[0].index,0);
    assert(fx.events.indexOf('attest:OFF')<fx.events.indexOf('supabase:secrets'));
    assert(fx.events.indexOf('file:ravradar-private-trip-study-categorical-apply-intent.json')<fx.events.indexOf('ddl:007'));
    assert(fx.events.indexOf('ddl:007')<fx.events.indexOf('worker:deploy'));
    assert.equal(fx.events.filter(x=>x==='worker:deploy').length,1);
    assert(fx.reads.filter(row=>row.categorical).length>=4);
    assert.equal(classifyPrivateTripStudySchema(model,fx.dbs.map(metadata)).state,'EXACT_004_005_006_007');
    for(const db of fx.dbs){assert.equal(db.prepare('select count(*) n from trip_observations').get().n,0);}
  }finally{fx.close();}
});

test('private-study007: exact installed reentry never repeats007 and stays OFF',async()=>{
  const fx=controllerFixture({state:'EXACT_004_005_006_007'});try{
    const out=await fx.invoke();assert.equal(out.categoricalDdlApplied,false);assert.equal(out.categoricalPolicyReady,true);
    assert.equal(out.publicStatisticsActivated,false);assert.equal(fx.writes.length,0);
  }finally{fx.close();}
});

test('private-study007: active ON, missing006, malformed authority and changed anchors stop without writes',async()=>{
  for(const [options,stage] of [[{workerOff:false},'PRE_CATEGORICAL_WORKER_OFF'],
    [{state:'EXACT_004_005'},'006_REQUIRED_BEFORE_007'],[{allow007:'1'},'AUTHORITY'],
    [{failure:'legacy-anchor'},'POLICY_ANCHOR_CHANGED'],
    [{state:'EXACT_004_005_006_007',failure:'categorical-anchor'},'CATEGORICAL_POLICY_ANCHOR_CHANGED']]){
    const fx=controllerFixture(options);try{
      await assert.rejects(fx.invoke(),e=>e.stage===stage);assert.equal(fx.writes.length,0);
      assert.equal(fx.events.filter(x=>x==='worker:deploy').length,0);
    }finally{fx.close();}
  }
});

test('private-study007: unknown/bad/partial write stops without Worker repair, repeat or restore',async()=>{
  for(const failure of ['write-before','write-after','write-shape','partial','categorical-anchor']){
    const fx=controllerFixture({failure});try{
      await assert.rejects(fx.invoke(),e=>e.recoveryAttempted===false);
      assert.equal(fx.writes.length,1);assert.equal(fx.events.filter(x=>x==='worker:deploy').length,0);
      assert.equal(fx.events.filter(x=>x==='supabase:secrets').length,1);
      if(failure==='partial')assert.throws(()=>classifyPrivateTripStudySchema(model,fx.dbs.map(metadata)),
        e=>e.stage==='PARTIAL_OR_CHANGED_STATISTICS_SCHEMA');
      if(['write-after','write-shape'].includes(failure))
        assert.equal(classifyPrivateTripStudySchema(model,fx.dbs.map(metadata)).state,'EXACT_004_005_006_007');
    }finally{fx.close();}
  }
});
