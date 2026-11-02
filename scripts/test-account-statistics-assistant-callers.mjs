// Normal CURRENT585 caller checks. Historical584 oracles run separately,
// unchanged. A synthetic migration-list response is not an installed database,
// and these boundary checks do not authenticate a real original B/S pair.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import vm from 'node:vm';
import {exactRelativeModuleSpecifiers} from './lib/static-module-closure.mjs';
import test from 'node:test';
import {ACTIVE_ASSISTANT_SUCCESSOR as activeNationalSource} from './lib/assistant-later-h0-successor-source.mjs';
import {withInstalled593CodePredecessorSource} from './check-installed593-code-predecessor-source.mjs';
const activeNationalReaderRelease=activeNationalSource.requireRelease();
const installed593Original591Current=activeNationalSource.sourcePhase==='assistant-installed593-origin591-successor';

test('593 V2 national reader derives every native prefix from the actual whole-phase execution or reuse',async()=>{
  // Genuine frozen593 modules retain their own ACTIVE guard. Never retag593
  // evidence or substitute current594 code in this historical context test.
  await withInstalled593CodePredecessorSource(async frozenRoot=>{
  const load=relative=>import(pathToFileURL(path.join(frozenRoot,relative)).href);
  const {ASSISTANT_PUBLIC591_V2_KIND,ASSISTANT_PUBLIC591_V2_PROFILE,ASSISTANT_PUBLIC591_FROZEN,
    ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,ORIGIN,assistantPublic591RootPackageScopes}
    =await load('scripts/native-postgres-evidence.mjs');
  const {assistantPublic591NativeClaims,verifyAssistantPublic591SuccessorNativeContext}
    =await load('scripts/national584-source-evidence.mjs');
  const historicalReader=await load('scripts/national584-source-evidence.mjs');
  const currentReader=await import('./national584-source-evidence.mjs');
  const historicalPackage=JSON.parse(await fs.readFile(path.join(frozenRoot,'package.json'),'utf8'));
  assert.equal(historicalPackage.version,'4.0.593');historicalReader.verifyPackage(historicalPackage);
  if(installed593Original591Current)assert.throws(()=>currentReader.verifyPackage(historicalPackage),error=>
    error.code==='ERR_ASSERTION'&&error.actual==='4.0.593'&&error.expected===activeNationalReaderRelease);
  const current={run:ORIGIN.run+593,attempt:1,head:'b'.repeat(40),pullRequest:756,branch:'synthetic593-national-v2'};
  const receipt={schemaVersion:2,kind:ASSISTANT_PUBLIC591_V2_KIND,profile:ASSISTANT_PUBLIC591_V2_PROFILE,
    phase:'ASSISTANT_PUBLIC591_SUCCESSOR',commands:[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],
    current,status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:true,
    nativeInput:{schemaVersion:1,files:140,modules:65,sqlFiles:71,moduleSha256:ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,
      inputSha256:'a'.repeat(64),controlsSha256:'b'.repeat(64),packageMode:{type:'module',version:'4.0.593'},
      packageScopes:assistantPublic591RootPackageScopes(),frozenGitTrees:structuredClone(ASSISTANT_PUBLIC591_FROZEN)},
    runtime:{platform:'linux',arch:'x64',imageOS:'ubuntu24',imageVersion:'20261030.1',node:'v22.23.3',
      python:'Python 3.12.15',pythonLocation:'/opt/python',ldLibraryPath:'/opt/python/lib',
      git:'git version 2.55.0',pgBindir:'/usr/lib/postgresql/16/bin',overrides:[],
      selectedPrograms:{schemaVersion:1,majorVersion:16,files:['initdb','pg_ctl','psql','postgres'].map(name=>({
        name,path:'/usr/lib/postgresql/16/bin/'+name,realpath:'/usr/lib/postgresql/16/bin/'+name,mode:0o755,
        bytes:100,sha256:'c'.repeat(64),version:name+' (PostgreSQL) 16.10'}))}}};
  const keys=['current586PredecessorNative','current587PredecessorNative','current588PredecessorNative',
    'current590PredecessorNative','current591PredecessorNative','currentAssistantPublic591SuccessorNative'];
  for(const reused of [false,true]){
    const value=structuredClone(receipt);
    if(reused){value.status='REUSED';value.executedInThisRun=false;value.origin={run:ORIGIN.run+500,attempt:1,job:123,
      head:'a'.repeat(40),artifactId:456,artifactDigest:'sha256:'+'d'.repeat(64),sourceTreeSha256:'sha256:'+'e'.repeat(64)};}
    assert.equal(verifyAssistantPublic591SuccessorNativeContext(value,current,'4.0.593').status,value.status);
    if(installed593Original591Current){
      assert.throws(()=>currentReader.verifyAssistantPublic591SuccessorNativeContext(value,current,'4.0.593'),error=>
        error.code==='ERR_ASSERTION'&&error.actual===activeNationalSource.sourcePhase&&error.expected==='assistant-public591-successor');
      assert.throws(()=>currentReader.verifyInstalled593Original591NativeContext(value,current,activeNationalReaderRelease));
      assert.throws(()=>currentReader.installed593Original591NativeClaims(value,current));
    }
    const claims=assistantPublic591NativeClaims(value,current);assert.deepEqual(Object.keys(claims),keys);
    for(const key of keys){assert.equal(claims[key].status,value.status);assert.equal(claims[key].executedInThisRun,!reused);
      assert.deepEqual(claims[key].origin,value.origin);assert.equal(claims[key].separatelyRequired,true);}
    const bad=structuredClone(value);bad.executedInThisRun=reused;
    assert.throws(()=>assistantPublic591NativeClaims(bad,current));
  }
  const old={phase:receipt.phase,commands:receipt.commands,current,status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false};
  assert.equal(verifyAssistantPublic591SuccessorNativeContext(old,current,'4.0.593').status,'EXECUTED');
  assert.throws(()=>assistantPublic591NativeClaims(old,current));
  const source=await fs.readFile(path.join(frozenRoot,'scripts/national584-source-evidence.mjs'),'utf8');
  assert(source.includes('if(ctx.proof.nativePostgres.schemaVersion===2)Object.assign(current.historical584National,'));
  assert(source.includes('try{result=await authenticatedReuse(ctx);}'));
  assert(source.includes('catch{result=await executeHistorical();'));
  });
});

import {inverseCurrent586PhaseUpload} from './native-postgres-evidence.mjs';
import {DatabaseSync} from 'node:sqlite';
import {privateTripStudySchemaModel,classifyPrivateTripStudySchema,privateTripStudyMigrationSteps}
  from './deploy-private-trip-study.mjs';
import './test-trip-aggregate-month-rollover.mjs';
import './test-private-trip-study-categorical-controller.mjs';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withFrozen585AccountStatisticsAssistantTestHost}
  from './lib/frozen585-account-statistics-assistant-test-host.mjs';

// Existing normal controller and unchanged real SQL, synthetic in-memory D1
// metadata only. These cases neither install D1 nor prove Worker CPU/privacy.
const privateStudySql=async()=>Promise.all(['001_trip_observations.sql',
  '004_trip_weather_aggregate_releases.sql','005_trip_weather_aggregate_jobs.sql']
  .map(name=>fs.readFile(new URL('../cloudflare/trip-gateway/migrations/'+name,import.meta.url),'utf8')));
const privateStudySnapshot=database=>database.prepare('select type,name,tbl_name,sql from sqlite_master order by type,name')
  .all().map(row=>({...row})).filter(row=>row.name.startsWith('trip_weather_aggregate_')||row.tbl_name.startsWith('trip_weather_aggregate_'));
const privateStudyShards=rows=>[rows,...Array.from({length:9},()=>[])];
test('private-study005: exact absent,004 and004+005 states preserve the old policy',async()=>{
  const model=privateTripStudySchemaModel(),[initial,release,jobs]=await privateStudySql(),db=new DatabaseSync(':memory:');
  try{
    db.exec(initial);assert.equal(classifyPrivateTripStudySchema(model,privateStudyShards(privateStudySnapshot(db))).state,'ABSENT');
    db.exec(release);const only004=privateStudySnapshot(db),anchor=db.prepare('select * from trip_weather_aggregate_policy_anchor').all();
    assert.equal(classifyPrivateTripStudySchema(model,privateStudyShards(only004)).state,'EXACT');
    db.exec(jobs);const complete=privateStudySnapshot(db);
    assert.equal(classifyPrivateTripStudySchema(model,privateStudyShards(complete)).state,'EXACT_004_005');
    assert.deepEqual(db.prepare('select * from trip_weather_aggregate_policy_anchor').all(),anchor);
    assert.deepEqual(complete.filter(row=>only004.some(old=>old.name===row.name)),only004);
    assert.equal(anchor[0].status,'PRIVATE_UNISSUED_REVIEW_ONLY');assert.equal(anchor[0].public_release_issued,0);
    assert.equal(anchor[0].maximum_units,8);assert.equal(anchor[0].cost_units,4);
    assert.equal(db.prepare('select count(*) count from trip_weather_aggregate_releases').get().count,0);
    assert.equal(db.prepare('select count(*) count from trip_weather_aggregate_account_charges').get().count,0);
    assert.equal(db.prepare('select count(*) count from trip_weather_aggregate_jobs').get().count,0);
    assert.equal(db.prepare('select erasure_revision from trip_weather_aggregate_job_control').get().erasure_revision,0);
  }finally{db.close();}
});
test('private-study005: missing004,partial,tampered and non-control schemas refuse',async()=>{
  const model=privateTripStudySchemaModel(),[initial,release,jobs]=await privateStudySql(),db=new DatabaseSync(':memory:');
  const refused=rows=>assert.throws(()=>classifyPrivateTripStudySchema(model,rows),error=>error.stage==='PARTIAL_OR_CHANGED_STATISTICS_SCHEMA');
  try{
    db.exec(initial);db.exec(jobs);refused(privateStudyShards(privateStudySnapshot(db)));
    db.exec(release);const full=privateStudySnapshot(db);
    refused(privateStudyShards(full.filter(row=>row.name!=='trip_weather_aggregate_job_transition')));
    const changed=full.map(row=>row.name==='trip_weather_aggregate_jobs'?{...row,sql:row.sql.replace('4000','4001')}:row);
    refused(privateStudyShards(changed));
    db.exec('create index private_study_test_extra on trip_weather_aggregate_jobs(revision)');
    refused(privateStudyShards(privateStudySnapshot(db)));
    for(const index of [1,9]){
      const shards=privateStudyShards(full);shards[index]=[full[0]];
      assert.throws(()=>classifyPrivateTripStudySchema(model,shards),error=>error.stage==='NON_CONTROL_STATISTICS_SCHEMA');
    }
    assert.throws(()=>classifyPrivateTripStudySchema(model,[full]),error=>error.stage==='SHARD_COUNT');
  }finally{db.close();}
});
test('private-study005: old004 approval never authorizes005 and exact reentry never repeats DDL',()=>{
  assert.deepEqual(privateTripStudyMigrationSteps('ABSENT',{allow004:true}),['004']);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT',{allow004:true}),[]);
  assert.deepEqual(privateTripStudyMigrationSteps('ABSENT',{allow004:true,allow005:true}),['004','005']);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT',{allow005:true}),['005']);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005'),[]);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005',{allow004:true,allow005:true}),[]);
  assert.throws(()=>privateTripStudyMigrationSteps('ABSENT',{allow005:true}),error=>error.stage==='004_APPLY_NOT_ALLOWED');
  for(const state of ['UNKNOWN','EXACT_005',null])assert.throws(()=>privateTripStudyMigrationSteps(state),error=>error.stage==='AUTHORITY');
  assert.throws(()=>privateTripStudyMigrationSteps('EXACT',{allow005:'true'}),error=>error.stage==='AUTHORITY');
});
test('private-study005: the normal workflow stays OFF and DDL remains outside Worker repair',async()=>{
  const source=await privateStudyPre007Controller(),
    workflow=await privateStudyPre007Workflow();
  assert.match(workflow,/allow_005:\s*\n\s+description:[^\n]+\n\s+type: boolean\s*\n\s+default: false/);
  assert.match(workflow,/TRIP_PRIVATE_STUDY_JOBS_APPLY_ALLOWED: \$\{\{ inputs\.allow_005 && 'true' \|\| 'false' \}\}/);
  assert.match(workflow,/TRIP_PRIVATE_STUDY_APPLY_ALLOWED: \$\{\{ inputs\.allow_004 && 'true' \|\| 'false' \}\}/);
  assert.match(source,/const VARS=Object\.freeze\(\{TRIP_AGGREGATE_ENABLED:'false'\}\)/);
  const from=source.indexOf('    for(const migration of migrationSteps){'),to=source.indexOf('    let version;',from);
  assert(from>0&&to>from);const ddl=source.slice(from,to);
  assert.equal([...ddl.matchAll(/await cf\(/g)].length,1);
  assert.match(ddl,/config\.d1_databases\[0\]\.database_id/);
  assert.match(ddl,/await verifySchema\('EXACT'\);await attest\(currentVersion\);exactMain\(\);lease\(600\)/);
  assert.match(ddl,/stage=migration\+'_APPLY_OUTCOME_UNKNOWN'/);
  assert.match(ddl,/if\(!result\.length\|\|result\.length>64\|\|result\.some\(row=>row\?\.success!==true\)\)throw fail\(stage\)/);
  assert.doesNotMatch(ddl,/catch\s*\{|recoveryAttempted|replace\(/);
  assert.doesNotMatch(source.slice(to),/await cf\(|model\.jobsMigration/);
});

async function privateStudyPre007Workflow(){
  let source=(await fs.readFile(new URL('../.github/workflows/private-trip-weather-study.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const review=JSON.parse(await fs.readFile(new URL('./lib/private-trip-study-categorical-review.json',import.meta.url),'utf8')).workflow;
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(review.file,'.github/workflows/private-trip-weather-study.yml');
  const readPermission=review.sourceProofReadPermission;
  assert.equal(readPermission.kind,'EXACT_TOP_LEVEL_PULL_REQUEST_READ_GRANT');
  assert.equal(readPermission.beforeSha256,review.afterSha256);
  const enable=review.enableSuccessor;
  if(enable&&hash(source)===enable.afterSha256){
    assert.equal(enable.kind,'EXACT_PRIVATE_STUDY_ENABLE_WORKFLOW_TEST_ONLY_INVERSE');
    assert.equal(enable.beforeSha256,readPermission.afterSha256);
    for(const edit of [...enable.edits].reverse()){
      assert.equal(source.split(edit.after).length,2);source=source.replace(edit.after,()=>edit.before);
    }
    assert.equal(hash(source),enable.beforeSha256);
  }
  if(hash(source)===readPermission.afterSha256){
    assert.equal(source.split(readPermission.after).length,2);
    source=source.replace(readPermission.after,()=>readPermission.before);
    assert.equal(hash(source),readPermission.beforeSha256);
  }
  assert.equal(hash(source),review.afterSha256);
  for(const edit of [...review.edits].reverse()){
    assert.equal(source.split(edit.after).length,2);source=source.replace(edit.after,()=>edit.before);
  }
  assert.equal(hash(source),review.beforeSha256);
  assert.equal(hash(source),'bdde67e93ae059a520e21305af42c1566080faa0da786fc670d7f28dc0285949');
  return source;
}

async function privateStudyPre007Controller(){
  let source=(await fs.readFile(new URL('./deploy-private-trip-study.mjs',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const review=JSON.parse(await fs.readFile(new URL('./lib/private-trip-study-categorical-review.json',import.meta.url),'utf8'));
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(review.kind,'PRIVATE_TRIP_STUDY_007_TEST_ONLY_INVERSE');
  assert.equal(review.file,'scripts/deploy-private-trip-study.mjs');
  const enable=review.enableSuccessor;
  if(enable&&hash(source)===enable.afterSha256){
    assert.equal(enable.kind,'EXACT_PRIVATE_STUDY_ENABLE_TEST_ONLY_INVERSE');
    assert.equal(enable.beforeSha256,review.afterSha256);
    for(const edit of [...enable.edits].reverse()){
      assert.equal(source.split(edit.after).length,2);source=source.replace(edit.after,()=>edit.before);
    }
    assert.equal(hash(source),enable.beforeSha256);
  }
  assert.equal(hash(source),review.afterSha256);
  for(const edit of [...review.edits].reverse()){
    assert.equal(source.split(edit.after).length,2);source=source.replace(edit.after,()=>edit.before);
  }
  assert.equal(hash(source),review.beforeSha256);
  assert.equal(hash(source),'1dc1101146afbda2ff242cc759b0dfb1e7b172a93ab430a041778ef1e36a01f8');
  return source;
}

async function privateStudy005ControllerView(source){
  const descriptor=JSON.parse(await fs.readFile(new URL('./lib/private-trip-study-binding-review.json',import.meta.url),'utf8'));
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  // Kun denne hele count-successor må projiceres til den frosne006-controller.
  assert.equal(hash(source),'1dc1101146afbda2ff242cc759b0dfb1e7b172a93ab430a041778ef1e36a01f8');
  const countAfter="  if(!Array.isArray(rows)||rows.length>41)throw fail('SCHEMA_METADATA');",
    countBefore="  if(!Array.isArray(rows)||rows.length>40)throw fail('SCHEMA_METADATA');";
  assert.equal(source.split(countAfter).length,2);
  source=source.replace(countAfter,()=>countBefore);
  assert.equal(hash(source),'458d7b774aa146f298ba07b8c005d998676903ccc26016a03f1b19fc59d726fd');
  assert.equal(descriptor.kind,'PRIVATE_TRIP_STUDY_006_TEST_ONLY_INVERSE');
  assert.equal(descriptor.file,'scripts/deploy-private-trip-study.mjs');
  assert.equal(descriptor.beforeSha256,'a15b33d1ae183456908faa6a405807c5921f67c609f28d61f78655e841943167');
  assert.equal(descriptor.afterSha256,'458d7b774aa146f298ba07b8c005d998676903ccc26016a03f1b19fc59d726fd');
  assert.equal(hash(source),descriptor.afterSha256);
  assert.equal(descriptor.edits.length,17);
  let before=source;
  for(const edit of [...descriptor.edits].reverse()){
    assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');
    assert.equal(before.split(edit.after).length,2);before=before.replace(edit.after,()=>edit.before);
  }
  assert.equal(hash(before),descriptor.beforeSha256);
  return before;
}

test("private-study005: read-only plan substages preserve the whole original controller",async()=>{
  const source=await privateStudy005ControllerView((await privateStudyPre007Controller())
    .replace(/\r\n/g,'\n'));
  const edits=[
    ["    stage='READ_ONLY_PLAN';run('node',['scripts/prepare-cloudflare-trip-storage.mjs','--existing-worker-repair']);",
      "    stage='READ_ONLY_PLAN_EXISTING_STORAGE';run('node',['scripts/prepare-cloudflare-trip-storage.mjs','--existing-worker-repair']);"],
    ["    const base=readOwnedJson(CONFIG);if(Object.hasOwn(base,'vars'))throw fail('UNEXPECTED_CONFIG');",
      "    stage='READ_ONLY_PLAN_CONFIGURATION';\n    const base=readOwnedJson(CONFIG);if(Object.hasOwn(base,'vars'))throw fail('UNEXPECTED_CONFIG');"],
    ["    originalFence=oldFence();model=privateTripStudySchemaModel();",
      "    stage='READ_ONLY_PLAN_ORIGINAL_FENCE';originalFence=oldFence();\n    stage='READ_ONLY_PLAN_SCHEMA_MODEL';model=privateTripStudySchemaModel();"],
    ["    const before=await inspect();const currentVersion=await attest(originalFence.workerVersionId);edge('d1');",
      "    stage='READ_ONLY_PLAN_STATISTICS_SCHEMA';const before=await inspect();\n    stage='READ_ONLY_PLAN_WORKER_BINDINGS';const currentVersion=await attest(originalFence.workerVersionId);\n    stage='READ_ONLY_PLAN_EDGE_CONTRACT';edge('d1');"],
    ["    plan={kind:'PRIVATE_TRIP_STUDY_CONTROL0_PLAN',sourceSha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,",
      "    stage='READ_ONLY_PLAN_RECEIPT';\n    plan={kind:'PRIVATE_TRIP_STUDY_CONTROL0_PLAN',sourceSha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,"],
  ];
  const stagePattern=/stage='(READ_ONLY_PLAN_[A-Z_]+)'/g;
  const stages=edits.flatMap(([,after])=>[...after.matchAll(stagePattern)].map(match=>match[1]));
  assert.equal(stages.length,8);assert.equal(new Set(stages).size,8);
  const verify=value=>{
    assert.deepEqual([...value.matchAll(stagePattern)].map(match=>match[1]),stages);
    let original=value;
    for(const [before,after] of edits){
      assert.equal(original.split(after).length,2);
      original=original.replace(after,()=>before);
    }
    assert.equal(crypto.createHash('sha256').update(original).digest('hex'),
      '7aa118fe89f33395695f5c58c2e7c2052966bd68fd77a89eca243591eec32dce',
      'Only the exact eight stage assignments may differ from the whole reviewed controller');
  };
  verify(source);
  const swapped=source.replace(/READ_ONLY_PLAN_(?:EXISTING_STORAGE|CONFIGURATION)/g,
    stage=>stage===stages[0]?stages[1]:stages[0]);
  for(const changed of [swapped,source.replace(stages[2],'READ_ONLY_PLAN_UNKNOWN'),
    source+'\n// non-stage byte drift\n'])assert.throws(()=>verify(changed));
});

test('private-study006: præcis ny skemalæsning bevarer gamle objekter og afviser delvis installation',async()=>{
  const model=privateTripStudySchemaModel(),[initial,release,jobs]=await privateStudySql(),db=new DatabaseSync(':memory:');
  const migration=await fs.readFile(new URL('../cloudflare/trip-gateway/migrations/006_trip_weather_aggregate_job_binding.sql',import.meta.url),'utf8');
  const proposal=await fs.readFile(new URL('./fixtures/aggregate-job-binding-006-proposal.sql.txt',import.meta.url),'utf8');
  assert.equal(migration,proposal);assert.equal(model.bindingMigration,migration);
  assert.equal(crypto.createHash('sha256').update(migration).digest('hex'),'cd3cb6862e811bb01ab1279e28e8fb30f894db8c9516ef50314cd10d7cfc9d7b');
  try{
    db.exec(initial);db.exec(release);db.exec(jobs);
    const before=privateStudySnapshot(db),anchor=db.prepare('select * from trip_weather_aggregate_policy_anchor').all(),
      control=db.prepare('select * from trip_weather_aggregate_job_control').all();
    db.exec(migration);const after=privateStudySnapshot(db);
    const classification=classifyPrivateTripStudySchema(model,privateStudyShards(after));
    assert.equal(classification.state,'EXACT_004_005_006');
    assert.match(classification.expectedBindingControlSchemaSha256,/^[a-f0-9]{64}$/);
    const additions=after.filter(row=>!before.some(old=>old.name===row.name));
    assert.deepEqual(additions.map(row=>row.name).sort(),['trip_weather_aggregate_job_binding_immutable','trip_weather_aggregate_job_binding_required']);
    assert.deepEqual(after.filter(row=>before.some(old=>old.name===row.name)&&row.name!=='trip_weather_aggregate_jobs'),
      before.filter(row=>row.name!=='trip_weather_aggregate_jobs'));
    assert.deepEqual(db.prepare('select * from trip_weather_aggregate_policy_anchor').all(),anchor);
    assert.deepEqual(db.prepare('select * from trip_weather_aggregate_job_control').all(),control);
    for(const table of ['trip_weather_aggregate_releases','trip_weather_aggregate_account_charges','trip_weather_aggregate_jobs'])
      assert.equal(db.prepare('select count(*) n from '+table).get().n,0);
    const denied=rows=>assert.throws(()=>classifyPrivateTripStudySchema(model,privateStudyShards(rows)),
      error=>error.stage==='PARTIAL_OR_CHANGED_STATISTICS_SCHEMA');
    for(const row of additions)denied(after.filter(item=>item.name!==row.name));
    denied(after.map(row=>row.name==='trip_weather_aggregate_jobs'?{...row,sql:row.sql.replace('4096','4097')}:row));
    denied(after.map(row=>row.name==='trip_weather_aggregate_job_binding_immutable'?{...row,sql:row.sql.replace('IS NOT','!=')}:row));
    for(const shard of [1,9]){
      const shards=privateStudyShards(after);shards[shard]=additions;
      assert.throws(()=>classifyPrivateTripStudySchema(model,shards),error=>error.stage==='NON_CONTROL_STATISTICS_SCHEMA');
    }
    assert.throws(()=>db.exec(migration));
  }finally{db.close();}
});
test('private-study006: præcis metadataakse er 18/39/41 og 42 afvises',async()=>{
  const model=privateTripStudySchemaModel(),[initial,release,jobs]=await privateStudySql(),db=new DatabaseSync(':memory:');
  assert.equal(model.metadata.length,18);assert.equal(model.jobsMetadata.length,39);
  assert.equal(model.bindingMetadata.length,41);
  try{
    db.exec(initial);db.exec(release);db.exec(jobs);db.exec(model.bindingMigration);
    const exact=privateStudySnapshot(db);
    assert.equal(exact.length,41);
    assert.equal(classifyPrivateTripStudySchema(model,privateStudyShards(exact)).state,'EXACT_004_005_006');
    assert.throws(()=>classifyPrivateTripStudySchema(model,privateStudyShards([...exact,{...exact[0]}])),
      error=>error.stage==='SCHEMA_METADATA');
    assert.throws(()=>classifyPrivateTripStudySchema(model,privateStudyShards(exact.slice(0,-1))),
      error=>error.stage==='PARTIAL_OR_CHANGED_STATISTICS_SCHEMA');
  }finally{db.close();}
});
test('private-study006: særskilt tilladelse og præcis genindgang giver ingen DDL-gentagelse',()=>{
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005'),[]);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005',{allow004:true,allow005:true}),[]);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005',{allow006:true}),['006']);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT',{allow005:true,allow006:true}),['005','006']);
  assert.deepEqual(privateTripStudyMigrationSteps('ABSENT',{allow004:true,allow005:true,allow006:true}),['004','005','006']);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005_006'),[]);
  assert.deepEqual(privateTripStudyMigrationSteps('EXACT_004_005_006',{allow004:true,allow005:true,allow006:true}),[]);
  assert.throws(()=>privateTripStudyMigrationSteps('ABSENT',{allow005:true,allow006:true}),error=>error.stage==='004_APPLY_NOT_ALLOWED');
  for(const state of ['ABSENT','EXACT'])
    assert.throws(()=>privateTripStudyMigrationSteps(state,{allow004:true,allow006:true}),error=>error.stage==='005_APPLY_NOT_ALLOWED');
  for(const allow006 of ['true',1,null])
    assert.throws(()=>privateTripStudyMigrationSteps('EXACT_004_005',{allow006}),error=>error.stage==='AUTHORITY');
  for(const state of ['EXACT_006','EXACT_004_006','UNKNOWN'])
    assert.throws(()=>privateTripStudyMigrationSteps(state,{allow006:true}),error=>error.stage==='AUTHORITY');
});
test('private-study006: faktisk controllerkrop fastholder OFF, genlæsning, engangsskrivning og fuld historisk inverse',async()=>{
  const source=(await privateStudyPre007Controller()).replace(/\r\n/g,'\n'),
    workflow=await privateStudyPre007Workflow();
  const original=await privateStudy005ControllerView(source);
  await assert.rejects(()=>privateStudy005ControllerView(original));
  for(const changed of [source+'\n// ukendt ændring\n',
    source.replace('rows.length>41','rows.length>42'),source.replace('rows.length>41','rows.length>40'),
    source.replace("await attest(currentVersion,true);","await attest(currentVersion);"),
    source.replace("await verifySchema('EXACT_004_005');","await verifySchema('EXACT');")])
    await assert.rejects(()=>privateStudy005ControllerView(changed));
  assert.match(workflow,/allow_006:\s*\n\s+description:[^\n]+\n\s+type: boolean\s*\n\s+default: false/);
  assert.match(workflow,/TRIP_PRIVATE_STUDY_JOB_BINDING_APPLY_ALLOWED: \$\{\{ inputs\.allow_006 && 'true' \|\| 'false' \}\}/);
  const preOff=source.indexOf("if(migrationSteps.includes('006')){stage='PRE_BINDING_WORKER_OFF';await attest(currentVersion,true);}"),
    quiesce=source.indexOf("    quiesce();stage='PRE_APPLY_REVALIDATION';"),ddlStart=source.indexOf('    for(const migration of migrationSteps){'),
    ddlEnd=source.indexOf('    let version;',ddlStart),ddl=source.slice(ddlStart,ddlEnd);
  assert(preOff>0&&preOff<quiesce&&quiesce<ddlStart&&ddlEnd>ddlStart);
  assert.match(ddl,/if\(migration==='006'\)\{\n\s+await verifySchema\('EXACT_004_005'\);await attest\(currentVersion,true\);exactMain\(\);lease\(600\);/);
  assert.match(ddl,/fs\.writeFileSync\(binding\?BINDING_INTENT:jobs\?JOBS_INTENT:INTENT,[^\n]+\{flag:'wx',mode:0o600\}\)/);
  assert.match(ddl,/await verifySchema\(binding\?'EXACT_004_005_006':jobs\?'EXACT_004_005':'EXACT'\)/);
  assert.equal([...ddl.matchAll(/await cf\(/g)].length,1);
  assert.match(ddl,/config\.d1_databases\[0\]\.database_id/);
  assert.match(ddl,/sql:binding\?model\.bindingMigration:jobs\?model\.jobsMigration:model\.migration/);
  assert.doesNotMatch(ddl,/catch\s*\{|recoveryAttempted|replace\(/);
  assert.doesNotMatch(source.slice(ddlEnd),/await cf\(|model\.bindingMigration|model\.jobsMigration/);
  assert.match(source,/if\(env\.TRIP_PRIVATE_STUDY_MODE==='plan'\)return\{\.\.\.plan,operation:'READ_ONLY_PLAN',schemaApplied:false,workerUpdated:false\}/);
  assert.match(source,/const replace=async\(\)=>\{\n\s+stage='WORKER_REPLACE';if\(!schemaVerified\)throw fail\(stage\);await verifySchema\(\);await attest\(\);exactMain\(\);lease\(600\)/);
  assert.match(source,/await attest\(versions\[0\]\[1\],true\);return versions\[0\]\[1\]/);
  assert.match(source,/stage='RESTORE';await verifySchema\(\);await attest\(version,true\);exactMain\(\);lease\(1\)/);
});
test('private-study006: den normale Worker-importindsamler medtager hele det nye bindingsblad',async()=>{
  const source=(await privateStudyPre007Controller()).replace(/\r\n/g,'\n');
  await privateStudy005ControllerView(source);
  const start=source.indexOf('function workerSources(){'),end=source.indexOf('\nfunction normalized(',start);
  assert(start>0&&end>start);
  const invoke=filesystem=>vm.runInNewContext(source.slice(start,end)+'\nworkerSources();',{
    fs:filesystem,path,exactRelativeModuleSpecifiers,
    hash:value=>crypto.createHash('sha256').update(value).digest('hex'),
    fail:stage=>Object.assign(new Error('PRIVATE_TRIP_STUDY_DELIVERY_FAILED'),{stage}),
  });
  const rows=JSON.parse(JSON.stringify(invoke(fsSync))),name='cloudflare/trip-gateway/trip-aggregate-job-binding.js';
  const actual=await fs.readFile(new URL('../'+name,import.meta.url));
  assert.deepEqual(rows.filter(row=>row.file===name),[{file:name,bytes:actual.length,
    sha256:crypto.createHash('sha256').update(actual).digest('hex')}]);
  assert(rows.some(row=>row.file==='cloudflare/trip-gateway/trip-aggregate-job.js'));
  assert(rows.length<=128);assert(rows.reduce((n,row)=>n+row.bytes,0)<=8*1024*1024);
  assert.throws(()=>invoke({...fsSync,lstatSync(file){
    if(path.resolve(file)===path.resolve(name))return {isSymbolicLink:()=>true};
    return fsSync.lstatSync(file);
  }}),error=>error.stage==='WORKER_SOURCE_PATH');
});

test('current585 model-import guard admits only the whole reviewed first-raw-error loader',async()=>{
  const file='scripts/check-account-statistics-assistant-predecessor-source.mjs';
  const source=(await fs.readFile(new URL('./check-account-statistics-assistant-predecessor-source.mjs',import.meta.url),'utf8'))
    .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(hash(source),'10ccdee12b112bcc323689c331a7bb068b7f47ae1ac60d535caf2d4523f465c1');
  const imports=modelSourceRelativeModuleSpecifiers(source,file);
  assert(Object.isFrozen(imports));assert.deepEqual(imports,[]);
  const once=(text,before,after)=>{assert.equal(text.split(before).length,2);return text.replace(before,()=>after);};
  let predecessor=once(source,'let result,first,hasFirst=false;','let result,first;');
  predecessor=once(predecessor,'}catch(error){first=error;hasFirst=true;}','}catch(error){first=error;}');
  predecessor=once(predecessor,'}catch(error){if(!hasFirst){first=error;hasFirst=true;}}\n  if(hasFirst)throw first;',
    '}catch(error){if(!first)first=error;}\n  if(first)throw first;');
  assert.equal(hash(predecessor),'44ed717ec5aa7df32f2fb5603c50091aa53878df57dc23e834c67ba00185a4ac');
  for(const changed of [source+'\n// changed byte\n',source+"\nimport './hidden.mjs';\n",predecessor])
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/);
});

test('genuine fixed585 ASA callers retain every original oracle after current586',async t=>{
  await withFrozen585AccountStatisticsAssistantTestHost(async sourceRoot=>{
const load=file=>import(pathToFileURL(path.join(sourceRoot,file)).href);
const {checkpointMetadataCasBlock}=await load('scripts/sync-ravscore-model-binding.mjs');
const {ravScoreModelBinding:integratedBinding}=await load('js/core/ravscore-model-contract.js');
const {ravScoreModelBinding:candidateBinding}=await load('scripts/rollback-assets/ravscore-model-contract.js');
const {privateRuntimeContractHashes}=await load('scripts/private-production-runtime-workflow.mjs');
const {accountStatisticsAssistantRequiredMigrations}=await load('scripts/integrated-cutover-readiness.mjs');
const {ACCOUNT_STATISTICS_ASSISTANT_BEFORE:OLD,requireAccountStatisticsAssistantBinding,
  requireAccountStatisticsAssistantOutput,accountStatisticsAssistantMigration,
  readAccountStatisticsAssistantCanonicalSource,ACCOUNT_STATISTICS_ASSISTANT_ALIASES,
  accountStatisticsAssistantDefinition}=await load('scripts/lib/account-statistics-assistant-successor-source.mjs');
const {assertAccountStatisticsAssistantPlanCaller,selectAccountStatisticsAssistantRoute,
  verifyAccountStatisticsAssistantPlan}=await load('scripts/verify-account-statistics-assistant-plan.mjs');
const {assertAccountStatisticsAssistantPrewriteCaller,
  verifyAccountStatisticsAssistantPrewritePreservation}=await load('scripts/account-statistics-assistant-prewrite.mjs');
const {prepareAccountStatisticsAssistantRuntimeTransition,restoreAndPrepareAccountStatisticsAssistantRuntimeTransition,
  assertAccountStatisticsAssistantRuntimeTransitionPrepared}=await load('scripts/account-statistics-assistant-runtime-transition.mjs');
const {assertAuthenticatedFrozen584Snapshot}=await load('scripts/lib/authenticated-frozen584-predecessor.mjs');
const {buildEstablishedNativeCurrent584MetadataAttestation,
  assertEstablishedNativeCurrent584MetadataCheckpoint}=await load('scripts/lib/established-native-current-origin.mjs');
// No fake issued tuple and no early-UNISSUED branch that could qualify585.
const NEXT=requireAccountStatisticsAssistantBinding();
requireAccountStatisticsAssistantOutput();
const descriptor=accountStatisticsAssistantMigration();
const required=accountStatisticsAssistantRequiredMigrations();
const migrationsDirectory=path.join(sourceRoot,'supabase/migrations');
const environment=(installed=false)=>({
  GITHUB_WORKFLOW:'Deploy RavRadar code-only repair', GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_REF:'refs/heads/main', GITHUB_RUN_ATTEMPT:'1', GITHUB_RUN_ID:'1', GITHUB_SHA:'a'.repeat(40),
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN:installed?'false':'true',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PHASE:installed?'installed':'before',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_RECOVERY_RUN_ID:'',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_SAVED_WEATHER:'false',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_WRITER_ACTIVE:'false',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_RECOVERY_GATE_RESULT:'success',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_ORIGINALS_VERIFIED:'true',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_NOLOSS_VERIFIED:'true',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PREWRITE_VERIFIED:'true',
});
const list=(installed=false)=>'Local | Remote | Time (UTC)\n'+required.map(row=>
  `${row.version} | ${installed||row.version!==descriptor.version?row.version:''} | synthetic-caller-response`).join('\n');
const dry='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '
  +descriptor.filename+'\nFinished supabase db push.';
const noop='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.';
const plan=(installed=false)=>({phase:installed?'installed':'before',migrationListText:list(installed),
  dryRunText:installed?noop:dry,migrationsDirectory,environment:environment(installed)});

await t.test('actual585 bindings and canonical source are distinct from preserved584',async()=>{
  assert.equal(descriptor.version,'20261019100000');
  assert.equal(required.length,54);assert.equal(required.at(-2).version,OLD.version);
  assert.equal(required.at(-1).version,descriptor.version);
  assert.equal(integratedBinding().modelBundleSha256,NEXT.I);
  assert.equal(candidateBinding().modelBundleSha256,NEXT.C);
  assert.equal((await privateRuntimeContractHashes()).continuationStateContractSha256,NEXT.T);
  for(const key of ['C','I','T'])assert.notEqual(NEXT[key],OLD[key]);
  const source=await readAccountStatisticsAssistantCanonicalSource();
  assert.equal(source.admission,'NO_ADMISSION');
  assert.equal(source.migration.version,descriptor.version);
});

await t.test('normal585 plan distinguishes sole pending migration from installed reentry',async()=>{
  assert.equal(selectAccountStatisticsAssistantRoute({migrationListText:list(),environment:environment()}),'before');
  assert.deepEqual((await verifyAccountStatisticsAssistantPlan(plan())).pendingVersions,[descriptor.version]);
  assert.equal(selectAccountStatisticsAssistantRoute({migrationListText:list(true),environment:environment(true)}),'installed');
  assert.deepEqual((await verifyAccountStatisticsAssistantPlan(plan(true))).pendingVersions,[]);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list(true),environment:environment()}),
    /ACCOUNT_STATISTICS_ASSISTANT_NO_CONSUMED_GRANT_REPLAY/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list(),environment:environment(true)}),
    /ACCOUNT_STATISTICS_ASSISTANT_NO_CONSUMED_GRANT_REPLAY/);
});

await t.test('normal585 caller rejects missing584, unknown migrations and duplicate sources',()=>{
  for(const suffix of ['\n20991019060000 | 20991019060000 | unknown-future',
    '\n20261019080000 | 20261019080000 | unknown-between',
    '\n20261019100001 | | unknown-pending'])
    assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list()+suffix,environment:environment()}),
      /ACCOUNT_STATISTICS_ASSISTANT_UNKNOWN_POST_CUTOVER_VERSION/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list().replace(
    `${OLD.version} | ${OLD.version}`,`${OLD.version} | `),environment:environment()}),
    /ACCOUNT_STATISTICS_ASSISTANT_MISSING_INSTALLED_PREDECESSOR/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list().replace(
    `${descriptor.version} | `,' | '),environment:environment()}),
    /Supabase migration-list row contained neither a local nor a remote version/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list(true).replace(
    `${descriptor.version} | ${descriptor.version}`,` | ${descriptor.version}`),environment:environment(true)}),
    /ACCOUNT_STATISTICS_ASSISTANT_MISSING_LOCAL_SOURCE/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list()
    +`\n${descriptor.version} | | duplicate`,environment:environment()}),
    /Supabase migration-list output repeated migration version 20261019100000 across rows/);
  for(const version of ['20261014140000','20261015030000','20261016030000'])
    assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list()
      +`\n${version} | ${version} | forbidden-archive`,environment:environment()}));
});

await t.test('before-plan requires every fresh preservation flag and the exact dry-run',async()=>{
  for(const key of ['RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_ORIGINALS_VERIFIED',
    'RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_NOLOSS_VERIFIED','RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PREWRITE_VERIFIED'])
    await assert.rejects(verifyAccountStatisticsAssistantPlan({...plan(),environment:{...environment(),[key]:'false'}}),
      /Exact fresh B\/S and prepared byte preservation required before SQL/);
  await assert.rejects(verifyAccountStatisticsAssistantPlan({...plan(),dryRunText:noop}));
  await assert.rejects(verifyAccountStatisticsAssistantPlan({...plan(),dryRunText:dry.replace(
    'Finished supabase db push.',' • 20991019100001_extra.sql\nFinished supabase db push.')}));
});

await t.test('plan and prewrite cannot combine historical grants or an active writer',()=>{
  for(const installed of [false,true]){
    const env=environment(installed);
    assert.equal(assertAccountStatisticsAssistantPlanCaller(env).version,descriptor.version);
    assert.doesNotThrow(()=>assertAccountStatisticsAssistantPrewriteCaller(env));
    for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
      'RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN','RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN',
      'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN','RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN',
      'RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN','RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN',
      'RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN','RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN']){
      assert.throws(()=>assertAccountStatisticsAssistantPlanCaller({...env,[key]:'true'}));
      assert.throws(()=>assertAccountStatisticsAssistantPrewriteCaller({...env,[key]:'true'}));
    }
    for(const [key,value] of [['GITHUB_RUN_ATTEMPT','2'],['GITHUB_REF','refs/heads/other'],
      ['RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_WRITER_ACTIVE','true']]){
      assert.throws(()=>assertAccountStatisticsAssistantPlanCaller({...env,[key]:value}));
      assert.throws(()=>assertAccountStatisticsAssistantPrewriteCaller({...env,[key]:value}));
    }
    assert.throws(()=>assertAccountStatisticsAssistantPrewriteCaller({...env,
      RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PHASE:installed?'before':'installed'}));
    assert.throws(()=>assertAccountStatisticsAssistantPrewriteCaller({...env,
      RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_RECOVERY_GATE_RESULT:'failure'}));
  }
});

await t.test('serialized origin or prepared PASS cannot mint metadata or prewrite authority',async()=>{
  for(const forged of [{},{status:'passed'},Object.freeze({admission:'NO_ADMISSION',
    originalReferenceAt:'2026-10-19T00:00:00.000Z',targetReferenceAt:'2026-10-19T00:00:00.000Z'})]){
    assert.throws(()=>assertAuthenticatedFrozen584Snapshot(forged),/FROZEN584_PREDECESSOR_HANDLE/);
    await assert.rejects(buildEstablishedNativeCurrent584MetadataAttestation(forged,
      {centralContract:null,conditions:null}),/FROZEN584_PREDECESSOR_HANDLE/);
    await assert.rejects(assertAccountStatisticsAssistantRuntimeTransitionPrepared(forged),
      /Only this actual normal preparation, never a serialized receipt/);
  }
  // All reject their fixed argument envelope before paths, clients or I/O.
  const forged={status:'passed'};
  await assert.rejects(prepareAccountStatisticsAssistantRuntimeTransition(forged));
  await assert.rejects(restoreAndPrepareAccountStatisticsAssistantRuntimeTransition(forged));
  await assert.rejects(verifyAccountStatisticsAssistantPrewritePreservation(forged));
  await assert.rejects(assertEstablishedNativeCurrent584MetadataCheckpoint(forged),/ARGUMENTS/);
});

await t.test('normal585 mutable consumer reads the actual issued source and preserves all original584 aliases',async()=>{
  const {canonicalSource}=await readAccountStatisticsAssistantCanonicalSource();
  const block=checkpointMetadataCasBlock(canonicalSource,integratedBinding(),candidateBinding(),NEXT.T);
  for(const row of ACCOUNT_STATISTICS_ASSISTANT_ALIASES){
    const whole=accountStatisticsAssistantDefinition(canonicalSource,row.name);
    assert(block.includes(whole),'Mutable output retains the whole original or projection definition');
  }
  const whole=accountStatisticsAssistantDefinition(canonicalSource,ACCOUNT_STATISTICS_ASSISTANT_ALIASES[0].name);
  for(const changed of [canonicalSource.replace(whole,whole.replace('begin\n','begin\n  -- CHANGED ORIGINAL\n')),
    canonicalSource.replace(whole,''),canonicalSource+'\n'+whole+'\n'])
    assert.throws(()=>checkpointMetadataCasBlock(changed,integratedBinding(),candidateBinding(),NEXT.T));
});

  });
});

test('historical584 national evidence inverts only the reviewed current90-minute job and exact national wrapper',async()=>{
  const {execFileSync}=await import('node:child_process');
  const {ORIGIN:old,WORKFLOW,BEFORE_BLOCK,AFTER_BLOCK,BEFORE_JOB,AFTER_JOB,CURRENT_JOB,verifyWorkflow:verifyCurrentWorkflow,
    inverseCandidatePublicSourceRunLine,inverseSourceBeforePostgresWorkflow,verifyReviewed90Workflow:verifyWorkflow}=await import('./national584-source-evidence.mjs');
  const git=(...args)=>execFileSync('git',args,{maxBuffer:8*1024*1024,timeout:30000,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}});
  const fixture='b02745d6d2987ed0fd2913623b3809fd0ea02dd6';
  assert.equal(git('rev-parse',old.head+'^{tree}').toString().trim(),'400babda9377e43ea7ee1444008f7accd1aded32');
  assert.equal(git('rev-parse',fixture+'^{tree}').toString().trim(),'b3fe05c0b6356ead06fb91a957113d10553d7631');
  const before=git('show',old.head+':'+WORKFLOW).toString();
  const recorded=git('show',fixture+':'+WORKFLOW).toString();
  const currentWorkflow=(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  verifyCurrentWorkflow(currentWorkflow);
  const actual=inverseCurrent586PhaseUpload(inverseSourceBeforePostgresWorkflow(currentWorkflow));
  verifyCurrentWorkflow(actual);
  const current=inverseCandidatePublicSourceRunLine(actual).replace(CURRENT_JOB,AFTER_JOB);
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(hash(before),'55bd264d8cc8fb7301d6b403f7035f644625d08528514fab3200e7e435f1d2d0');
  assert.equal(recorded.split(AFTER_BLOCK).length,2);assert.equal(recorded.split(AFTER_JOB).length,2);
  assert.equal(hash(recorded.replace(AFTER_BLOCK,BEFORE_BLOCK)),'bd78b6279be1f9677bc04748f71f60553c1b2220f878bffbc0e2714a7841bcf6');
  assert.equal(recorded.replace(AFTER_BLOCK,BEFORE_BLOCK).replace(AFTER_JOB,BEFORE_JOB),before,
    'The entire genuine old workflow is preserved, not a repinned current hash');
  assert.doesNotThrow(()=>verifyWorkflow(recorded));assert.doesNotThrow(()=>verifyWorkflow(current));
  assert.throws(()=>verifyWorkflow(before),'A historical75-minute job is not the current source contract');
  const once=(text,from,to)=>{assert.equal(text.split(from).length,2);return text.replace(from,()=>to);};
  const mutations=[
    ...[75,89,91].map(minutes=>once(recorded,AFTER_JOB,AFTER_JOB.replace('timeout-minutes: 90','timeout-minutes: '+minutes))),
    once(recorded,AFTER_JOB,AFTER_JOB+AFTER_JOB),
    once(recorded,AFTER_BLOCK,AFTER_BLOCK+AFTER_BLOCK),
    once(recorded,'  contents: read\n','  contents: write\n'),
    once(recorded,"        run: npm run validate:source && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs\n","        run: true && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs\n"),
    once(recorded,'          node scripts/native-postgres-evidence.mjs\n','          true\n'),
    once(recorded,AFTER_BLOCK,AFTER_BLOCK.replace('github.token','secrets.UNRELATED')),
    once(recorded,AFTER_BLOCK,'')+AFTER_BLOCK,
    recorded+'\n# unreviewed byte\n',
  ];
  for(const changed of mutations)assert.throws(()=>verifyWorkflow(changed));
});

test('source-PR-only180-minute job preserves genuine120 and90 workflows and rejects every other budget',async()=>{
  const {execFileSync}=await import('node:child_process');
  const {WORKFLOW,CURRENT_JOB,AFTER_JOB,CURRENT_SOURCE_RUN_LINE,inverseCandidatePublicSourceRunLine,
    verifyWorkflow,verifyReviewed90Workflow,inverseSourceBeforePostgresWorkflow}=await import('./national584-source-evidence.mjs');
  const fixture='b02745d6d2987ed0fd2913623b3809fd0ea02dd6';
  const recorded=execFileSync('git',['show',fixture+':'+WORKFLOW],{maxBuffer:65536,timeout:30000,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}}).toString();
  const currentWorkflow=(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  verifyWorkflow(currentWorkflow);
  const actual=inverseCurrent586PhaseUpload(inverseSourceBeforePostgresWorkflow(currentWorkflow));
  const predecessorHead='bb8d354e0d889080b5f7182b2962f05fbb8fd2e7';
  const predecessor=execFileSync('git',['show',predecessorHead+':'+WORKFLOW],{maxBuffer:65536,timeout:30000,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}}).toString();
  const old120Job=CURRENT_JOB.replace('timeout-minutes: 180','timeout-minutes: 120');
  assert.notEqual(old120Job,CURRENT_JOB,'The reviewed successor is exactly180, not the interrupted120-minute job');
  assert.equal(actual.replace(CURRENT_JOB,old120Job),predecessor,
    'The WHOLE interrupted120 workflow is reconstructed; no command, gate, permission or weather budget changes');
  assert.throws(()=>verifyWorkflow(predecessor),'Historical120 is not current180 admission');
  assert.equal(recorded.split(AFTER_JOB).length,2);assert.equal(actual.split(CURRENT_JOB).length,2);
  assert.equal(inverseCandidatePublicSourceRunLine(actual).replace(CURRENT_JOB,AFTER_JOB),recorded,
    'The WHOLE genuine90 workflow is reconstructed');
  assert.doesNotThrow(()=>verifyWorkflow(actual));assert.doesNotThrow(()=>verifyReviewed90Workflow(recorded));
  assert.throws(()=>verifyWorkflow(recorded),'Historical90 is not current180 admission');
  assert.throws(()=>verifyReviewed90Workflow(actual),'Current180 is not silently accepted as historical90');
  for(const minutes of [75,89,90,91,119,120,121,179,181,360])
    assert.throws(()=>verifyWorkflow(actual.replace(CURRENT_JOB,CURRENT_JOB.replace('timeout-minutes: 180','timeout-minutes: '+minutes))));
  assert.throws(()=>verifyWorkflow(actual.replace(CURRENT_JOB,CURRENT_JOB+CURRENT_JOB)));
  for(const command of ['node scripts/test-prepare-candidate-g-operational-rollback.mjs',
    'node scripts/test-candidate-g-rollback-public-stage.mjs']) {
    assert.equal(actual.split(command).length,2,'Each appended Candidate command occurs exactly once');
    assert.throws(()=>verifyWorkflow(actual.replace(' && '+command,'')),
      'Missing Candidate command is not a current source-PR runline');
    assert.throws(()=>verifyWorkflow(actual.replace(command,command.replace('.mjs','-changed.mjs'))),
      'Changed Candidate command is not a current source-PR runline');
    assert.throws(()=>verifyWorkflow(actual.replace(command,command+' && '+command)),
      'Duplicate Candidate command is not a current source-PR runline');
  }
  assert.throws(()=>verifyWorkflow(actual.replace(CURRENT_SOURCE_RUN_LINE,CURRENT_SOURCE_RUN_LINE+CURRENT_SOURCE_RUN_LINE)));
  assert.throws(()=>verifyWorkflow(actual.replace('  contents: read\n','  contents: write\n')),
    'An unrelated workflow change must still fail after the exact runline inverse');
  assert.throws(()=>verifyWorkflow(actual+'\n# unknown source change\n'));
});

test('normal original584 staging forwards the selected R2 storage into the real frozen restore',async()=>{
  const {execFileSync}=await import('node:child_process');
  const {join}=await import('node:path');
  const {pathToFileURL}=await import('node:url');
  const {createProtectedPrivateRuntimeClients}=await import('./protected-private-production-runtime.mjs');
  const {withAuthenticated584PredecessorSource}=await import('./check-account-statistics-assistant-predecessor-source.mjs');
  const stageFile='scripts/stage-account-statistics-assistant-originals.mjs';
  const current=await fs.readFile(new URL('./stage-account-statistics-assistant-originals.mjs',import.meta.url),'utf8');
  const before=execFileSync('git',['show','e7b7436afb0c9388b7e9015ad60b361704950550:'+stageFile],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:30000,maxBuffer:65536,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'},
  });
  const seams=source=>{
    const factory=[...source.matchAll(/^  (const \{documentRequest:request(?:,storage)?\}=createProtectedPrivateRuntimeClients\((?:\{storageBackend:'supabase'\})?\);)\r?$/gm)];
    const restore=[...source.matchAll(/^    (const restored=await protectedB\.restoreProtectedPrivateProductionRuntime\(\{privateRoot,bundlePath,repositoryRoot:frozenRoot,expected,request(?:,storage)?\}\);)\r?$/gm)];
    assert.equal(factory.length,1,'One actual normal clientfactory seam');
    assert.equal(restore.length,1,'One actual normal frozen584 restore seam');
    return {factory:factory[0][1],restore:restore[0][1]};
  };
  const actual=seams(current),historical=seams(before);
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  await withAuthenticated584PredecessorSource(async frozenRoot=>{
    const protectedB=await import(pathToFileURL(join(frozenRoot,'scripts/protected-private-production-runtime.mjs')).href);
    const invoke=async(seam,observed)=>{
      observed.pointerReads=0;
      const factory=(...args)=>{
        assert(args.length<=1);observed.factoryArguments=args;
        const synthetic={RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND:'r2',
          RAVRADAR_R2_ACCOUNT_ID:'a'.repeat(32),RAVRADAR_R2_ACCESS_KEY_ID:'synthetic-r2-access',
          RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-r2-secret'};
        const saved=Object.fromEntries(Object.keys(synthetic).map(key=>[key,process.env[key]]));
        try{
          Object.assign(process.env,synthetic);
          observed.clients=createProtectedPrivateRuntimeClients({
            supabaseUrl:'https://synthetic.invalid',serviceRoleKey:'synthetic-service-role-key',
            fetchImpl:async(url,options={})=>{
              const target=new URL(url);
              assert.equal(target.origin,'https://synthetic.invalid');
              assert.equal(target.pathname,'/rest/v1/admin_documents');
              assert.equal(options.method??'GET','GET');
              assert.equal(target.searchParams.get('document_key'),'eq.ravscore-private-production-runtime-pointer');
              assert.equal(target.searchParams.get('select'),'document_key,payload,version');
              assert.equal(target.searchParams.get('limit'),'2');
              observed.pointerReads++;
              return new Response('[]',{status:200,headers:{'content-type':'application/json'}});
            },...args[0],
          });
          return observed.clients;
        }finally{
          for(const key of Object.keys(synthetic)){
            if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];
          }
        }
      };
      // Both executable statements are the actual stage source, not a repaired
      // product copy. Only the transport/configuration uses synthetic fixtures.
      const execute=new AsyncFunction('createProtectedPrivateRuntimeClients','protectedB','frozenRoot',
        "const privateRoot=frozenRoot+'/unused-private',bundlePath=privateRoot+'/bundle',expected={};\n"
        +seam.factory+'\n'+seam.restore+'\nreturn restored;');
      return execute(factory,protectedB,frozenRoot);
    };
    const oldObservation={};
    await assert.rejects(invoke(historical,oldObservation),/Private runtime storage client lacks ensurePrivateBucket/);
    assert.deepEqual(oldObservation.factoryArguments,[{storageBackend:'supabase'}]);
    assert.equal(typeof oldObservation.clients.storage.bucketUsage,'undefined','Actual old factory overrode the selected R2 backend');
    assert.equal(oldObservation.pointerReads,0,'The genuine old restore refuses before reading a pointer');
    const observation={},result=await invoke(actual,observation);
    assert.deepEqual(observation.factoryArguments,[],'The actual stage must retain the normally selected backend');
    assert.equal(typeof observation.clients.storage.bucketUsage,'function','The real selected R2 adapter was constructed');
    assert.equal(observation.pointerReads,1,'The genuine frozen584 document reader was reached');
    assert.deepEqual(result,{restored:false,reason:'protected-private-runtime-not-found',targetUnchanged:true,privatePayloadLogged:false});
    const dropped=actual.restore.replace(',request,storage}',',request}');
    assert.notEqual(dropped,actual.restore,'The actual after-call forwards storage explicitly');
    const droppedObservation={};
    await assert.rejects(invoke({...actual,restore:dropped},droppedObservation),/Private runtime storage client lacks ensurePrivateBucket/);
    assert.equal(droppedObservation.pointerReads,0);
  });
  // A deliberately empty pointer proves client/call wiring only: no archive
  // download, private payload, B/S admission, SQL or publication is exercised.
});

test('current586 source registration preserves exact585 predecessor and distinct current native scope',async()=>{
  const actualPkg=await reviewed587PackageViewForUnchangedOracles(JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8')));
  const {verifyPackage,verifyCurrentNativeCommands,CURRENT586_NATIVE_COMMANDS}=await import('./national584-source-evidence.mjs');
  const {inverseReviewedAccountStatisticsAssistantSourceScripts,inverseAssistantLaterH0SourceScripts}=await import('./lib/account-statistics-assistant-package-review.mjs');
  const {ASSISTANT_LATER_H0_BINDING,requireAssistantPublic590SuccessorRelease}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const later=Object.hasOwn(actualPkg.scripts,'test:assistant-later-h0-source');
  if(later){
    if(ASSISTANT_LATER_H0_BINDING===null)assert.throws(()=>verifyPackage(actualPkg),/ASSISTANT_LATER_H0_UNISSUED/);
    else assert.throws(()=>verifyPackage(actualPkg),error=>error.code==='ERR_ASSERTION'
      &&error.actual===actualPkg.version&&error.expected===activeNationalReaderRelease,
      'ACTIVE-first590 rejects the preserved historical587 package');
  }
  const pkg=later?{...actualPkg,version:'4.0.586',scripts:inverseAssistantLaterH0SourceScripts(actualPkg.scripts)}:actualPkg;
  assert.equal(pkg.version,'4.0.586');assert.throws(()=>verifyPackage(pkg),error=>error.code==='ERR_ASSERTION'
    &&error.actual==='4.0.586'&&error.expected===activeNationalReaderRelease,
    'ACTIVE-first590 rejects historical586 while its whole scripts inverse remains tested');
  assert.doesNotThrow(()=>inverseReviewedAccountStatisticsAssistantSourceScripts(pkg.scripts));
  const critical=pkg.scripts['test:ravscore-source-critical'],group='test:native-original-continuity-source';
  const asa='test:account-statistics-assistant-source',marker='npm run '+group;
  const clone=()=>structuredClone(pkg);
  for(const mode of ['missing','duplicate','reordered','changed-command','old-builder-current','unknown-version']){
    const changed=clone();
    if(mode==='missing'){delete changed.scripts[group];changed.scripts['test:ravscore-source-critical']=critical.replace(' && '+marker,'');}
    if(mode==='duplicate')changed.scripts['test:ravscore-source-critical']=critical.replace(marker,marker+' && '+marker);
    if(mode==='reordered')changed.scripts['test:ravscore-source-critical']=critical.replace('npm run '+asa+' && '+marker,marker+' && npm run '+asa);
    if(mode==='changed-command')changed.scripts[group]+=' --unexpected';
    if(mode==='old-builder-current')changed.scripts[asa]='node scripts/build-account-statistics-assistant-successor.mjs --check && node --test scripts/test-account-statistics-assistant-callers.mjs';
    if(mode==='unknown-version')changed.version='4.0.587';
    assert.throws(()=>verifyPackage(changed));
    if(mode!=='unknown-version')assert.throws(()=>inverseReviewedAccountStatisticsAssistantSourceScripts(changed.scripts));
  }
  assert.throws(()=>verifyCurrentNativeCommands([...CURRENT586_NATIVE_COMMANDS],'4.0.586'),error=>error.code==='ERR_ASSERTION'
    &&error.actual==='4.0.586'&&error.expected===activeNationalReaderRelease);
  assert.throws(()=>verifyCurrentNativeCommands([...CURRENT586_NATIVE_COMMANDS],'4.0.585'));
  assert.throws(()=>verifyCurrentNativeCommands(CURRENT586_NATIVE_COMMANDS.map(c=>c.replace(' --native-original-continuity','')),'4.0.586'));
  assert.throws(()=>verifyCurrentNativeCommands([...CURRENT586_NATIVE_COMMANDS,CURRENT586_NATIVE_COMMANDS[1]],'4.0.586'));
});

test('assistant later-H0 registration keeps exact older scripts and refuses phase/order mutations',async()=>{
  const pkg=await reviewed587PackageViewForUnchangedOracles(JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'))),original=structuredClone(pkg);
  const {ASSISTANT_LATER_H0_BINDING,requireAssistantLaterH0Release,requireAssistantPublic590SuccessorRelease}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const {verifyPackage,verifyCurrentNativeCommands,ASSISTANT_LATER_H0_NATIVE_COMMANDS}=await import('./national584-source-evidence.mjs');
  const {inverseAssistantLaterH0SourceScripts}=await import('./lib/account-statistics-assistant-package-review.mjs');
  const prior=inverseAssistantLaterH0SourceScripts(pkg.scripts);
  assert.equal(Object.hasOwn(prior,'test:assistant-later-h0-source'),false);
  assert.equal(prior['test:native-original-continuity-source'],
    'node scripts/build-native-original-continuity-successor.mjs --check && node --test scripts/test-native-original-continuity-callers.mjs');
  assert.deepEqual(pkg,original,'A historical test view never rewrites actual package source');
  if(ASSISTANT_LATER_H0_BINDING===null)assert.throws(()=>verifyPackage(pkg),/ASSISTANT_LATER_H0_UNISSUED/);
  else{
    assert.equal(pkg.version,requireAssistantLaterH0Release());assert.throws(()=>verifyPackage(pkg),error=>error.code==='ERR_ASSERTION'
      &&error.actual===pkg.version&&error.expected===activeNationalReaderRelease);
    assert.throws(()=>verifyCurrentNativeCommands([...ASSISTANT_LATER_H0_NATIVE_COMMANDS],pkg.version),error=>error.code==='ERR_ASSERTION'
      &&error.actual===pkg.version&&error.expected===activeNationalReaderRelease);
    assert.throws(()=>verifyCurrentNativeCommands(ASSISTANT_LATER_H0_NATIVE_COMMANDS.map(c=>c.replace(' --assistant-later-h0','')),pkg.version));
  }
  const native='npm run test:native-original-continuity-source',next='npm run test:assistant-later-h0-source';
  for(const mode of ['missing','duplicate','reordered','changed-command','old-live-builder','unknown-command']){
    const changed=structuredClone(pkg);
    if(mode==='missing')delete changed.scripts['test:assistant-later-h0-source'];
    if(mode==='duplicate')changed.scripts['test:ravscore-source-critical']=changed.scripts['test:ravscore-source-critical'].replace(next,next+' && '+next);
    if(mode==='reordered')changed.scripts['test:ravscore-source-critical']=changed.scripts['test:ravscore-source-critical'].replace(native+' && '+next,next+' && '+native);
    if(mode==='changed-command')changed.scripts['test:assistant-later-h0-source']+=' --unexpected';
    if(mode==='old-live-builder')changed.scripts['test:native-original-continuity-source']=prior['test:native-original-continuity-source'];
    if(mode==='unknown-command')changed.scripts['unknown-source-command']='node scripts/unreviewed.mjs';
    assert.throws(()=>inverseAssistantLaterH0SourceScripts(changed.scripts));
    assert.throws(()=>verifyPackage(changed));
  }
  assert.throws(()=>verifyPackage({...pkg,version:'0.0.0'}));
});

test('private-study006: deklarations-export må ikke forveksle Array.from med en re-export',async()=>{
  const file='scripts/lib/static-module-closure.mjs',
    source=(await fs.readFile(new URL('./lib/static-module-closure.mjs',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(hash(source),'bb64f60e1a700897f6dd982b8fe9c3ed85fbb48fd3dfd0b2f46f65e3dc91b17e');
  const current="    // En deklarations-export har ingen module-specifier. Fortsæt dog token\n"
    +"    // for token, så import(...) inde i initialisering/funktion stadig kontrolleres.\n"
    +"    if (token.value === 'export' && next?.type === 'id'\n"
    +"      && ['const', 'let', 'var', 'function', 'class', 'default', 'async'].includes(next.value)) continue;\n"
    +"    const end = statementEnd(items, index + 1);";
  assert.equal(source.split(current).length,2);
  const original=source.replace(current,"    const end = statementEnd(items, index + 1);");
  assert.equal(hash(original),'675f91e7942143a78636e219e54bd7fa0ff25ddcd1998657dd215105054938b0');
  assert.equal(original.split('export function exactRelativeModuleSpecifiers(').length,2);
  const oldScanner=vm.runInNewContext(original.replace('export function exactRelativeModuleSpecifiers(','function exactRelativeModuleSpecifiers(')
    +'\nexactRelativeModuleSpecifiers;');
  const dpFile='cloudflare/trip-gateway/trip-aggregate-dp.js',
    dp=(await fs.readFile(new URL('../'+dpFile,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  assert.equal(hash(dp),'ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b');
  assert.throws(()=>oldScanner(dp,dpFile),/contains an unparsed static module specifier/);
  assert.deepEqual(exactRelativeModuleSpecifiers(dp,dpFile),[
    '../../supabase/functions/_shared/trip-storage.js','../../js/services/calibration-eligibility.js']);
  for(const declarations of [
    "export const rows = Array.from({ length: 1 });",
    "export let rows = Array.from({ length: 1 });",
    "export var rows = Array.from({ length: 1 });",
    "export function rows() { return Array.from({ length: 1 }); }",
    "export async function rows() { return Array.from({ length: 1 }); }",
    "export class Rows { static all() { return Array.from({ length: 1 }); } }",
    "export default Array.from({ length: 1 });",
  ])assert.deepEqual(exactRelativeModuleSpecifiers(declarations,file),[]);
});
test('private-study006: deklarationer bevarer nested-importkontrol og re-exportafslag',()=>{
  const wrappers=[
    expression=>'export const value = '+expression+';',
    expression=>'export let value = '+expression+';',
    expression=>'export var value = '+expression+';',
    expression=>'export function read() { return '+expression+'; }',
    expression=>'export async function read() { return '+expression+'; }',
    expression=>'export class Reader { read() { return '+expression+'; } }',
    expression=>'export default '+expression+';',
  ];
  for(const wrap of wrappers){
    assert.deepEqual(exactRelativeModuleSpecifiers(wrap("import('./actual-child.js')"),'ordinary.js'),['./actual-child.js']);
    for(const dynamic of ['import(variable)',"import('./child.js' + suffix)","import(`./${name}.js`)",'import(unknown.path)'])
      assert.throws(()=>exactRelativeModuleSpecifiers(wrap(dynamic),'ordinary.js'),/non-literal or unparsed dynamic import/);
  }
  const mixed="import './before.js'; export const x = Array.from([]); "
    +"export { y } from './named.js'; export * from '../star.js'; "
    +"export * as ns from './namespace.js'; export default import('./after.js');";
  assert.deepEqual(exactRelativeModuleSpecifiers(mixed,'ordinary.js'),
    ['./before.js','./named.js','../star.js','./namespace.js','./after.js']);
  for(const source of ["export { y } from computed;","export * from computed;","export * as ns from computed;"])
    assert.throws(()=>exactRelativeModuleSpecifiers(source,'ordinary.js'),/unparsed static module specifier/);
});

test('private-study006: privat eksport bevarer hele installationsarm og normale adgangsgrænser',async()=>{
  const read=async file=>(await fs.readFile(new URL('../'+file,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
  const workflow=await privateStudyPre007Workflow();
  const validate=source=>{
    assert.equal(sha(source),'bdde67e93ae059a520e21305af42c1566080faa0da786fc670d7f28dc0285949');
    const marker='\n  private-study-export:\n';assert.equal(source.split(marker).length,2);
    const after=source.slice(source.indexOf(marker));
    assert.match(after,/needs: validate-operation\n    if: \$\{\{ inputs.operation == 'export' \}\}/);
    assert.match(after,/group: ravradar-trip-storage-production\n      cancel-in-progress: false/);
    assert.match(after,/timeout-minutes: 5/);
    assert.match(after,/TRIP_STORAGE_OPERATION: private-study-export/);
    assert.equal(after.split('run: node scripts/publish-private-trip-weather-study.mjs').length,2);
    assert.doesNotMatch(after,/allow_00[456]|APPLY_ALLOWED|CLOUDFLARE_API_TOKEN|SUPABASE_DB_PASSWORD|GITHUB_WORKFLOW:|deploy-private-trip-study|upload-artifact/);
    let original=source.slice(0,source.indexOf(marker));
    for(const [current,prior] of [
      ['description: Skrivefri plan, kontrolleret installation med statistik slået fra eller privat rapporteksport',
        'description: Read-only plan or controlled installation with statistics disabled'],
      ['options: [plan, deliver, export]','options: [plan, deliver]'],
      ['plan|deliver|export) ;;','plan|deliver) ;;'],
    ]){assert.equal(original.split(current).length,2);original=original.replace(current,prior);}
    assert.equal(sha(original),'b7272558358a939c1142d68cc6b9c79ff1b9953748189329ca2a87c148930548');
    assert.match(original,/group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false/);
    assert.match(original,/supabase\/setup-cli@3c2f5e2ae34c34e428e8e206e2c4d21fa2d20fbf/);
    assert.match(original,/version: 2\.117\.0/);
  };
  validate(workflow);
  for(const [before,after] of [['default: plan','default: export'],['cancel-in-progress: false','cancel-in-progress: true'],
    ["inputs.operation == 'export'","inputs.operation != 'deliver'"],['node scripts/publish-private-trip-weather-study.mjs','node scripts/deploy-private-trip-study.mjs']]){
    assert(workflow.includes(before));assert.throws(()=>validate(workflow.replace(before,after)));
  }
  const publisher=await read('scripts/publish-private-trip-weather-study.mjs');
  assert.equal(sha(publisher),'5b087741711e31ad64401be9a8bbfc4ffb0bfe53bd7e68a50a9fe08cd947d6dc');
  // TEST DATA only: the exact normal594 versioned dashboard precedes every
  // unchanged593 and older whole-file oracle. No UI behavior is ported here.
  const reviewed594DashboardView=source=>{
    assert.equal(Buffer.byteLength(source),141249);
    assert.equal(sha(source),'5fda05bab307c9c4025e1088497114ebe7de37250c3541645c6502ea30bd27bc');
    assert.equal(source.split('4.0.594').length,24);
    const prior=source.replaceAll('4.0.594','4.0.593');
    assert.equal(Buffer.byteLength(prior),141249);
    assert.equal(sha(prior),'30231deff0cad5b19b0ec0a6f80d266086d776be554040f1cd5255a0757ad02f');
    return prior;
  };
  // TEST DATA only: exact593 version literals precede every unchanged592/591/590 oracle.
  const reviewed593DashboardView=source=>{
    assert.equal(Buffer.byteLength(source),141249);
    assert.equal(sha(source),'30231deff0cad5b19b0ec0a6f80d266086d776be554040f1cd5255a0757ad02f');
    assert.equal(source.split('4.0.593').length,24);
    const prior=source.replaceAll('4.0.593','4.0.592');
    assert.equal(Buffer.byteLength(prior),141249);
    assert.equal(sha(prior),'d514939c3d9bd87a4dd53b9cfb824120bc817667840c4f0f21a1ae7b3acd0902');
    return prior;
  };
  // TEST DATA only: the normal591 versions restore the exact whole f42/590 dashboard.
  const reviewed591DashboardView=source=>{
    assert.equal(Buffer.byteLength(source),141164);
    assert.equal(sha(source),'5fee2cc4769e518fe02a5575e2256da9b958457921387fc9b14cff8b413b237c');
    assert.equal(source.split('4.0.591').length,24);
    const prior=source.replaceAll('4.0.591','4.0.590');
    assert.equal(Buffer.byteLength(prior),141164);
    assert.equal(sha(prior),'d53f32365f699e45012cc131566d28f89ce0dcae866f3801c3dd55ef9296fde7');
    return prior;
  };
  // Test DATA only: the whole issued592 dashboard differs solely in 23 version literals.
  const reviewed592DashboardView=source=>{
    assert.equal(Buffer.byteLength(source),141164);
    assert.equal(sha(source),'34c84a3a5679fbac8c2a3881b8952f23df79bfca60064e7b6c8ef14701db014a');
    assert.equal(source.split('4.0.592').length,24);
    const prior=source.replaceAll('4.0.592','4.0.591');
    assert.equal(Buffer.byteLength(prior),141164);
    assert.equal(sha(prior),'5fee2cc4769e518fe02a5575e2256da9b958457921387fc9b14cff8b413b237c');
    return prior;
  };
  // Exact TEST DATA inverse for this local-learning label only; all old592 and earlier whole oracles remain unchanged.
  const reviewedLocalLearningDashboardView=source=>{
    assert.equal(Buffer.byteLength(source),141249);
    assert.equal(sha(source),'d514939c3d9bd87a4dd53b9cfb824120bc817667840c4f0f21a1ae7b3acd0902');
    const current="<h2>Ture i lokalt datagrundlag</h2><div class=\"metric\">${analysis.sampleSize||0}</div><p class=\"muted\">Kun lokale ture, der opfylder visningens model- og evidenskrav. Samlet turtal findes i Overblik.</p>",previous="<h2>Registrerede ture</h2><div class=\"metric\">${analysis.sampleSize||0}</div><p class=\"muted\">Kun dækningskontrol</p>";
    assert.equal(source.split(current).length,2);
    const prior=source.replace(current,previous);
    assert.equal(Buffer.byteLength(prior),141164);
    assert.equal(sha(prior),'34c84a3a5679fbac8c2a3881b8952f23df79bfca60064e7b6c8ef14701db014a');
    return prior;
  };
  // Historical dashboard DATA comes from one fixed genuine Git object, never
  // from the changed current UI or a caller-selected source/native capability.
  const historicalDashboardData=Object.freeze({
    head:'04021af99bbdfe6cb856dce462404394fc985485',tree:'e3688bfd5be6d2c10313fa5ed4c285046b1c6870',
    file:'js/ui/admin-dashboard.js',bytes:141249,sha256:'5fda05bab307c9c4025e1088497114ebe7de37250c3541645c6502ea30bd27bc'});
  const verifyHistoricalDashboardData=(descriptor,bytes)=>{
    assert.deepEqual(descriptor,historicalDashboardData,'HISTORICAL_DASHBOARD_FIXED_IDENTITY');
    assert(Buffer.isBuffer(bytes),'HISTORICAL_DASHBOARD_BYTES');
    assert.equal(bytes.length,historicalDashboardData.bytes,'HISTORICAL_DASHBOARD_SIZE');
    assert.equal(sha(bytes),historicalDashboardData.sha256,'HISTORICAL_DASHBOARD_WHOLE');return bytes;
  };
  async function readFixedHistoricalDashboardData(){
    assert.equal(arguments.length,0,'HISTORICAL_DASHBOARD_NO_OVERRIDE');
    const {execFileSync}=await import('node:child_process');
    const environment=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
      .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
    const git=(...args)=>execFileSync('git',['-C',fileURLToPath(new URL('..',import.meta.url)),...args],{
      maxBuffer:1024*1024,timeout:30000,env:{...environment,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',
        GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'}});
    const tree=git('rev-parse',historicalDashboardData.head+'^{tree}').toString('utf8').trim();
    const bytes=git('cat-file','blob',historicalDashboardData.head+':'+historicalDashboardData.file);
    return verifyHistoricalDashboardData({...historicalDashboardData,tree},bytes);
  }
  const historicalDashboardBytes=await readFixedHistoricalDashboardData();
  for(const key of ['head','tree','file'])assert.throws(()=>verifyHistoricalDashboardData(
    {...historicalDashboardData,[key]:'UNREVIEWED'},historicalDashboardBytes),/HISTORICAL_DASHBOARD_FIXED_IDENTITY/);
  for(const bytes of [Buffer.concat([historicalDashboardBytes,Buffer.from('\n')]),
    Buffer.concat([Buffer.from('!'),historicalDashboardBytes.subarray(1)])])
    assert.throws(()=>verifyHistoricalDashboardData(historicalDashboardData,bytes),/HISTORICAL_DASHBOARD/);
  await assert.rejects(readFixedHistoricalDashboardData({head:'UNREVIEWED'}),/HISTORICAL_DASHBOARD_NO_OVERRIDE/);
  const raw594Dashboard=historicalDashboardBytes.toString('utf8');
  for(const changed of [raw594Dashboard+'\n',raw594Dashboard.replace('4.0.594','4.0.593'),
    raw594Dashboard.replaceAll('4.0.594','4.0.593'),raw594Dashboard.replace('renderLearning','renderLearning_UNREVIEWED')])
    assert.throws(()=>reviewed594DashboardView(changed));
  const raw593Dashboard=reviewed594DashboardView(raw594Dashboard);
  for(const changed of [raw593Dashboard+'\n',raw593Dashboard.replace('4.0.593','4.0.592'),
    raw593Dashboard.replace('renderLearning','renderLearning_UNREVIEWED')])
    assert.throws(()=>reviewed593DashboardView(changed));
  const currentDashboard=reviewed593DashboardView(raw593Dashboard);
  for(const changed of [currentDashboard+'\n',currentDashboard.replace('Ture i lokalt datagrundlag','Registrerede ture'),
    currentDashboard.replace('renderLearning','renderLearning_UNREVIEWED')])
    assert.throws(()=>reviewedLocalLearningDashboardView(changed));
  const issued592Dashboard=reviewedLocalLearningDashboardView(currentDashboard);
  for(const changed of [issued592Dashboard+'\n',issued592Dashboard.replace('4.0.592','4.0.591'),
    issued592Dashboard.replace('renderDashboard','renderDashboard_UNREVIEWED')])
    assert.throws(()=>reviewed592DashboardView(changed));
  const actualDashboard=reviewed592DashboardView(issued592Dashboard);
  const dashboard=reviewed591DashboardView(actualDashboard);
  for(const changed of [actualDashboard+'\n',actualDashboard.replace('4.0.591','4.0.590'),
    actualDashboard.replace('renderDashboard','renderDashboard_UNREVIEWED')])
    assert.throws(()=>reviewed591DashboardView(changed));
  // Kun test: vend denne ene gennemgåede datavisningsdelta før de hele
  // uændrede6172-admin-/590-/588-/587-inverser. Ingen historisk repin.
  const reviewedDataQualityDashboardView=source=>{
    assert.equal(Buffer.byteLength(source),141164);
    assert.equal(sha(source),"d53f32365f699e45012cc131566d28f89ce0dcae866f3801c3dd55ef9296fde7");
    const hunk={
      "before": " const runtime=state.runtimeDetails||state.runtime||{},acq=runtime.acquisition||{},quality=runtime.dataQuality||{},qf=quality.forecast||{},qo=quality.observations||{},cache=state.health?.dmiForecastCache||{};\n const rows=[['Vind',cache.windZones,'wind'],['Bølger',cache.waveZones,'wave'],['Strøm',cache.currentZones,'current'],['Vandstand',cache.waterLevelZones,'waterLevel']];\n const cooldownActive=Date.parse(acq.persistentRateLimitedUntil||'')>Date.now();\n const apiLabel=acq.stoppedByHttp429?'HTTP 429':cooldownActive?'Cooldown aktiv':(acq.requestsUsed??0)===0?'Ikke testet':'OK';\n const apiWarn=acq.stoppedByHttp429||cooldownActive||(acq.requestsUsed??0)===0;\n const runtimeMatches=!runtime.generatedAt||runtime.generatedAt===state.conditions.generatedAt;\n const ocean=state.oceanDiagnostics?.summary||{};const cacheAudit=state.cacheAudit||{};const dmiHealth=state.health?.dmi||{};const userHealth=state.health?.userData||{};const lifecycle=quality.stationLifecycle||{};\n const freshMarine=ocean.freshMarineZones??acq.bulkModelDownloads?.diagnostics?.freshMarineZones??0;const preservedMarine=ocean.preservedMarineZones??acq.bulkModelDownloads?.diagnostics?.preservedMarineZones??0;const fallbackMarine=ocean.fallbackMarineZones??Math.max(0,(state.health?.dmi?.totalZones??0)-(cache.currentZones??0));\n const missingReasons=state.oceanDiagnostics?.missingZoneReasons||state.oceanDiagnostics?.zonesWithoutCompleteMarineData||[];\n const planAudit=state.implementationAudit||{};const planSummary=planAudit.summary||planAudit;const providerSwitches=planSummary.hourlyProviderSwitches||{};\n content.innerHTML=`${runtimeMatches?'':`<article class=\"admin-card status-warning\"><h2>Forældet Runtime Diagnostics</h2><p>Den beskyttede driftsdiagnostik er ikke fra samme kørsel som det offentlige datasæt og kan derfor være misvisende.</p></article>`}<div class=\"admin-grid\"><article class=\"admin-card\"><h2>Brugerprognosen kan anvendes</h2><div class=\"metric ${userHealth.healthy===false?'status-warning':'status-good'}\">${esc(userHealth.completeZones??0)}/${esc(userHealth.totalZones??state.zoneRegistry.counts.registered)}</div><p class=\"muted\">Zoner med en komplet prognose til brugeren, inklusive kontrolleret fallback.</p></article><article class=\"admin-card\"><h2>Alle DMI-komponenter</h2><div class=\"metric ${cache.completeZones===dmiHealth.totalZones?'status-good':'status-warning'}\">${esc(cache.completeZones??0)}/${esc(dmiHealth.totalZones??state.zoneRegistry.counts.registered)}</div><p class=\"muted\">Zoner hvor vind, bølger, strøm og vandstand alle kommer fra DMI med den krævede horisont. Dette er ikke det samme som om brugerprognosen virker.</p></article><article class=\"admin-card\"><h2>DMI API</h2><div class=\"metric ${apiWarn?'status-warning':'status-good'}\">${apiLabel}</div><p class=\"muted\">${cooldownActive?`Cooldown til ${new Date(acq.persistentRateLimitedUntil).toLocaleString('da-DK')}`:'Ingen aktiv cooldown'}</p></article><article class=\"admin-card\"><h2>Dublerede rå tider</h2><div class=\"metric ${cache.duplicateTimestampZones?'status-warning':'status-good'}\">${esc(cache.duplicateTimestampZones??0)}</div><p class=\"muted\">Skal være 0 efter central komponentvis tidsfletning</p></article></div>\n<article class=\"admin-card\"><h2>Marine DMI-status</h2><div class=\"admin-grid compact\"><div><span class=\"metric status-good\">${esc(freshMarine)}</span><p class=\"muted\">Friske zoner i denne modelrunde</p></div><div><span class=\"metric status-warning\">${esc(preservedMarine)}</span><p class=\"muted\">Bevaret gyldig DMI-cache</p></div><div><span class=\"metric ${fallbackMarine?'status-warning':'status-good'}\">${esc(fallbackMarine)}</span><p class=\"muted\">Fallback eller manglende marine DMI</p></div></div><p class=\"hint\">Tallene holdes adskilt, så en kørsel ikke kan se ud som en forbedring, når den kun genbruger tidligere cache.</p></article>\n\n <article class=\"admin-card\"><h2>Samlet implementeringsaudit</h2><p><b>Fejl:</b> ${esc(planAudit.issueCounts?.errors??'–')} · <b>Advarsler:</b> ${esc(planAudit.issueCounts?.warnings??'–')} · <b>Forecast-horisont:</b> ${esc(planSummary.forecastHorizonHours?.median??planSummary.forecastHorizonHours??'–')} timer</p><p><b>Kildeskift:</b> Vind ${esc(providerSwitches.wind??0)} · Bølger ${esc(providerSwitches.wave??0)} · Strøm ${esc(providerSwitches.current??0)} · Vandstand ${esc(providerSwitches.waterLevel??0)}</p><p><b>Retningsankre:</b> ${esc(planSummary.zonesWithDirectionAnchors??'–')} zoner · <b>Geometri godkendt:</b> ${esc(planSummary.zonesWithValidGeometryDirection??'–')}</p><p class=\"hint\">Auditten dokumenterer problemer uden automatisk at omskrive autoritative DMI-data.</p></article>\n <article class=\"admin-card\"><h2>DMI-cacheaudit</h2><p><b>Før oprydning:</b> ${esc(cacheAudit.beforeBytes??cacheAudit.sizeBeforeBytes??'–')} bytes · <b>Efter:</b> ${esc(cacheAudit.afterBytes??cacheAudit.sizeAfterBytes??'–')} bytes · <b>Beholdt:</b> ${esc(cacheAudit.filesKept??cacheAudit.keptFiles?.length??'–')} · <b>Slettet:</b> ${esc(cacheAudit.filesRemoved??cacheAudit.removedFiles?.length??'–')}</p><p class=\"hint\">Cacheoptimering må ikke reducere DMI-dækning eller prognosehorisont.</p></article>\n <article class=\"admin-card\"><h2>Manglende marine zoner</h2>${missingReasons.length?`<div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Zone</th><th>Årsag</th><th>Prøvede modeller</th><th>Nærmeste gyldige punkt</th></tr></thead><tbody>${missingReasons.slice(0,231).map(x=>`<tr><td>${esc(x.zoneName||x.zoneId||x.id||'Ukendt')}</td><td>${esc(x.reason||x.code||x.primaryReason||'Ukendt')}</td><td>${esc((x.triedCollections||x.collectionsTried||x.attempts||[]).map?.(a=>typeof a==='string'?a:a.collection).filter(Boolean).join(', ')||'–')}</td><td>${esc(x.nearestValidDistanceKm??x.distanceKm??'–')}${Number.isFinite(Number(x.nearestValidDistanceKm??x.distanceKm))?' km':''}</td></tr>`).join('')}</tbody></table></div>`:'<p>Ingen manglende marine zoner registreret i den seneste diagnostik.</p>'}</article>\n  <article class=\"admin-card\"><h2>Datadækning pr. komponent</h2><div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Komponent</th><th>DMI-zoner</th><th>Mangler DMI</th><th>Faktiske kilder</th></tr></thead><tbody>${rows.map(([label,count,key])=>{const providers=runtime.componentCoverage?.[key]?.providers||{};return `<tr><td>${label}</td><td>${esc(count??0)}</td><td>${Math.max(0,(state.health?.dmi?.totalZones??0)-(count??0))}</td><td>${Object.entries(providers).map(([p,n])=>`${esc(p)}: ${n}`).join(' · ')||'–'}</td></tr>`}).join('')}</tbody></table></div></article>\n <article class=\"admin-card\"><h2>Automatisk datakvalitet</h2><div class=\"metric\">${esc(quality.status||'ukendt')}</div><p>${esc(quality.issueCounts?.errors??0)} fejl · ${esc(quality.issueCounts?.warnings??0)} advarsler</p>${(quality.issues||[]).length?`<div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Niveau</th><th>Kode</th><th>Forklaring</th></tr></thead><tbody>${quality.issues.map(x=>`<tr><td>${esc(x.severity)}</td><td>${esc(x.code)}</td><td>${esc(x.message)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Ingen registrerede problemer.</p>'}</article>\n <article class=\"admin-card\"><h2>Vandstand</h2><p><b>Stationsestimat:</b> sammenlignes særskilt med modelprognosen. <b>Observationer:</b> ${esc(qo.stationsWithFreshLevel??0)} friske stationer. <b>Direkte:</b> ${esc(qo.directZones??0)} zoner. <b>Interpoleret:</b> ${esc(qo.interpolatedZones??0)} zoner. <b>Uden observation:</b> ${esc(qo.zonesWithoutDmiObservation??0)} zoner.</p><p class=\"hint\">Aktuel observation, interpolation og modelprognose vises som tre forskellige datatyper. Ved HTTP 429 vises årsagen i stedet for en generel stationsforklaring.</p></article>\n <article class=\"admin-card\"><h2>Vandstandsstationernes livscyklus</h2><p><b>Register:</b> ${esc(lifecycle.total??state.waterStations?.length??0)} · <b>Leverer nu:</b> ${esc(lifecycle.delivering??0)} · <b>Midlertidigt uden ny måling:</b> ${esc(lifecycle.temporarilyMissing??0)} · <b>Gyldig prognosecache:</b> ${esc(lifecycle.forecastCacheValid??0)} · <b>Kun cache anvendelig:</b> ${esc(lifecycle.cacheOnlyUsable??0)} · <b>Utilgængelige:</b> ${esc(lifecycle.unavailable??0)}</p><p class=\"hint\">En kørsel, der bevidst springer observationer over, må ikke nulstille historikken. Observationsstatus, cachegyldighed og samlet anvendelighed vises hver for sig.</p></article>\n",
      "after": " const record=x=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x);\n const count=x=>Number.isSafeInteger(x)&&x>=0?x:null;\n const metric=x=>count(x)===null?'Ukendt':String(x);\n const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?String(x):'Ukendt';\n const pair=(n,d)=>count(n)!==null&&count(d)!==null&&n<=d?`${n}/${d}`:'Ukendt';\n const date=x=>typeof x==='string'&&/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,6})?Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,19)===x.slice(0,19);\n const when=x=>date(x)?esc(new Date(x).toLocaleString('da-DK')):'Ukendt';\n const version=x=>typeof x==='string'&&/^\\d+\\.\\d+\\.\\d+$/.test(x)?x:null;\n const reportMeta=x=>`<p class=\"hint\">Rapporttidspunkt: ${when(x.generatedAt)} · Version: ${esc(version(x.version)||'ikke oplyst')}. Selvstændig rapport, ikke eksplicit bundet til den offentlige generation.</p>`;\n const publicAt=state.conditions.generatedAt,publicBound=date(publicAt)&&date(state.publicManifest?.generatedAt)&&publicAt===state.publicManifest.generatedAt;\n const decoded=record(state.runtimeDetails)?state.runtimeDetails:{};\n const runtimeMatches=publicBound&&date(decoded.generatedAt)&&decoded.generatedAt===publicAt;\n const runtimeCurrent=runtimeMatches&&version(decoded.version)===VERSION;\n const runtime=runtimeCurrent?decoded:{},acq=record(runtime.acquisition)?runtime.acquisition:{};\n const health=record(state.health)?state.health:{},healthCurrent=publicBound&&date(health.generatedAt)&&health.generatedAt===publicAt;\n const cache=healthCurrent&&record(health.dmiForecastCache)?health.dmiForecastCache:{},dmiHealth=healthCurrent&&record(health.dmi)?health.dmi:{};\n const userHealth=healthCurrent&&record(health.userData)?health.userData:{};\n const quality=record(runtime.dataQuality)&&date(runtime.dataQuality.generatedAt)&&runtime.dataQuality.generatedAt===publicAt?runtime.dataQuality:{};\n const qo=record(quality.observations)?quality.observations:{},lifecycle=record(quality.stationLifecycle)?quality.stationLifecycle:{};\n const rows=[['Vind','windZones','wind'],['Bølger','waveZones','wave'],['Strøm','currentZones','current'],['Vandstand','waterLevelZones','waterLevel'],['Vandtemperatur',null,'waterTemperature']];\n const cooldownKnown=acq.persistentRateLimitedUntil===null||date(acq.persistentRateLimitedUntil),cooldownActive=date(acq.persistentRateLimitedUntil)&&Date.parse(acq.persistentRateLimitedUntil)>Date.now();\n const apiLabel=acq.stoppedByHttp429===true?'HTTP 429':cooldownActive?'Cooldown aktiv':count(acq.requestsUsed)!==null?`${acq.requestsUsed} forespørgsler registreret`:'Ukendt';\n const oceanDocument=record(state.oceanDiagnostics)?state.oceanDiagnostics:{},ocean=record(oceanDocument.summary)?oceanDocument.summary:{};\n let missingReasons=null;\n if(date(oceanDocument.generatedAt)){\n  if(record(oceanDocument.missingZones)&&Object.values(oceanDocument.missingZones).every(record))missingReasons=Object.entries(oceanDocument.missingZones).map(([zoneId,item])=>({...item,zoneId}));\n  else if(oceanDocument.missingZones===undefined){const old=oceanDocument.missingZoneReasons??oceanDocument.zonesWithoutCompleteMarineData;if(Array.isArray(old)&&old.every(record))missingReasons=old;}\n }\n const planAudit=record(state.implementationAudit)?state.implementationAudit:{},planSummary=record(planAudit.summary)?planAudit.summary:planAudit,providerSwitches=record(planSummary.hourlyProviderSwitches)?planSummary.hourlyProviderSwitches:{};\n const cacheAudit=record(state.cacheAudit)?state.cacheAudit:{};\n const cacheBefore=cacheAudit.before===undefined?(cacheAudit.beforeBytes??cacheAudit.sizeBeforeBytes):cacheAudit.before?.bytes;\n const cacheAfter=cacheAudit.after===undefined?(cacheAudit.afterBytes??cacheAudit.sizeAfterBytes):cacheAudit.after?.bytes;\n const cacheFiles=cacheAudit.after===undefined?(cacheAudit.filesKept??(Array.isArray(cacheAudit.keptFiles)?cacheAudit.keptFiles.length:undefined)):cacheAudit.after?.files;\n const removedFiles=cacheAudit.removedFiles===undefined?cacheAudit.filesRemoved:Array.isArray(cacheAudit.removedFiles)?cacheAudit.removedFiles.length:cacheAudit.removedFiles;\n const errors=count(quality.issueCounts?.errors),warnings=count(quality.issueCounts?.warnings),issues=Array.isArray(quality.issues)&&quality.issues.every(record)?quality.issues:null;\n const qualityConsistent=errors!==null&&warnings!==null&&issues!==null&&((errors+warnings===0)===(issues.length===0))&&quality.status===(errors?'error':warnings?'warning':'ok');\n const qualityStatus=qualityConsistent?quality.status:'Ukendt';\n const userPair=pair(userHealth.completeZones,userHealth.totalZones),userStatus=userPair!=='Ukendt'&&typeof userHealth.healthy==='boolean'?(userHealth.healthy?'tilstrækkelig':'utilstrækkelig'):'Ukendt';\n content.innerHTML=`<article class=\"admin-card ${runtimeCurrent&&healthCurrent?'':'status-warning'}\"><h2>Diagnosekilder og tidsbinding</h2><p>Offentlig generering: ${when(publicAt)} · Runtime: ${when(decoded.generatedAt)} · Runtimeversion: ${esc(version(decoded.version)||'Ukendt')} · Frontendversion: ${esc(VERSION)}.</p><p>Vejrstatus: ${when(health.generatedAt)} · Vejrstatusversion: ikke oplyst.</p><p class=\"hint\">${runtimeCurrent?'Runtime har kendt dato og version for denne visning.':'Runtime kan ikke bekræftes for denne visning; dens aktuelle tal vises som ukendte.'} ${healthCurrent?'Vejrstatus matcher den offentlige generering.':'Vejrstatus kan ikke bindes til den offentlige generering.'} En versionsafvigelse er ikke i sig selv bevis for forkert vejr. Rapporter nedenfor har egne tidspunkter.</p></article>\n<div class=\"admin-grid\"><article class=\"admin-card\"><h2>Fire aktuelle felter ved generering</h2><div class=\"metric\">${userPair}</div><p class=\"muted\">Vind, bølger, strøm og vandstand ved generering. Ikke vandtemperatur eller fuld prognosehorisont. Producentstatus: ${userStatus}.</p></article><article class=\"admin-card\"><h2>DMI-cache: fire komponenter</h2><div class=\"metric\">${pair(cache.completeZones,dmiHealth.totalZones)}</div><p class=\"muted\">Producentens cachekrav: mindst 96 timers vind og 24 timers bølger, strøm og vandstand. Ikke fuld femfamilie-/femdøgnsdækning.</p></article><article class=\"admin-card\"><h2>DMI-kørslens registrering</h2><div class=\"metric\">${esc(apiLabel)}</div><p class=\"muted\">${date(acq.persistentRateLimitedUntil)?`Registreret cooldown til ${when(acq.persistentRateLimitedUntil)}`:cooldownKnown?'Ingen cooldown registreret i kilden.':'Cooldownstatus ukendt.'} Dette er ikke en ny liveforbindelsesprøve.</p></article><article class=\"admin-card\"><h2>Dublerede rå tider</h2><div class=\"metric\">${metric(cache.duplicateTimestampZones)}</div><p class=\"muted\">Producentens registrerede antal; ukendt er ikke nul.</p></article></div>\n<article class=\"admin-card\"><h2>Marine DMI-rapport</h2>${reportMeta(oceanDocument)}<div class=\"admin-grid compact\"><div><span class=\"metric\">${metric(ocean.freshMarineZones)}</span><p class=\"muted\">Friske zoner i rapportens modelrunde</p></div><div><span class=\"metric\">${metric(ocean.preservedMarineZones)}</span><p class=\"muted\">Bevaret gyldig DMI-cache i rapporten</p></div><div><span class=\"metric\">${metric(ocean.fallbackOrMissingMarineZones)}</span><p class=\"muted\">Fallback eller manglende marine DMI i rapporten</p></div></div><p class=\"hint\">Ingen af tallene udledes af forskelle mellem andre rapporter. De er ikke en ny måling af hele prognosens dækning.</p></article>\n<article class=\"admin-card\"><h2>Samlet implementeringsaudit</h2>${reportMeta(planAudit)}<p><b>Fejl:</b> ${metric(planAudit.issueCounts?.errors)} · <b>Advarsler:</b> ${metric(planAudit.issueCounts?.warnings)} · <b>Forecast-horisont:</b> ${number(record(planSummary.forecastHorizonHours)?planSummary.forecastHorizonHours.median:planSummary.forecastHorizonHours)} timer</p><p><b>Kildeskift:</b> ${rows.map(([label,,key])=>`${label} ${metric(providerSwitches[key])}`).join(' · ')}</p><p><b>Retningsankre:</b> ${metric(planSummary.zonesWithDirectionAnchors)} zoner · <b>Geometri godkendt:</b> ${metric(planSummary.zonesWithValidGeometryDirection)}</p><p class=\"hint\">Auditten dokumenterer problemer uden automatisk at omskrive autoritative DMI-data.</p></article>\n<article class=\"admin-card\"><h2>DMI-cacheaudit</h2>${reportMeta(cacheAudit)}<p><b>Før oprydning:</b> ${metric(cacheBefore)} bytes · <b>Efter:</b> ${metric(cacheAfter)} bytes · <b>Filer efter:</b> ${metric(cacheFiles)} · <b>Slettet:</b> ${metric(removedFiles)}</p><p class=\"hint\">Cacheoptimering må ikke reducere DMI-dækning eller prognosehorisont.</p></article>\n<article class=\"admin-card\"><h2>Manglende marine zoner i rapporten</h2>${missingReasons===null?'<p>Ikke oplyst med et kendt rapporttidspunkt. Det beviser hverken mangler eller fuld dækning.</p>':missingReasons.length?`<div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Zone</th><th>Årsag</th><th>Prøvede modeller</th><th>Nærmeste gyldige punkt</th></tr></thead><tbody>${missingReasons.slice(0,231).map(x=>{const collections=x.triedCollections??x.collectionsTried??x.attempts;const distance=x.nearestValidDistanceKm??x.distanceKm;return `<tr><td>${esc(x.zoneName||x.zoneId||x.id||'Ukendt')}</td><td>${esc(x.reason||x.code||x.primaryReason||'Ukendt')}</td><td>${Array.isArray(collections)?esc(collections.map(a=>typeof a==='string'?a:a?.collection).filter(a=>typeof a==='string').join(', ')||'Ikke oplyst'):'Ikke oplyst'}</td><td>${number(distance)}${number(distance)==='Ukendt'?'':' km'}</td></tr>`;}).join('')}</tbody></table></div>`:'<p>Ingen manglende marine zoner registreret i denne daterede rapport.</p>'}</article>\n<article class=\"admin-card\"><h2>Komponenttal med særskilt afgrænsning</h2><p class=\"hint\">DMI-cache tæller zoner med mindst én gyldig komponenttime. Runtime tæller kilder og felter ved generering, ikke hele horisonten eller en senere valgt korttime. Ukendt kilde er ikke det samme som en manglende måling.</p><div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Komponent</th><th>DMI-cachezoner</th><th>Runtime: manglende felt/zoner</th><th>Runtimekilder ved generering</th></tr></thead><tbody>${rows.map(([label,cacheKey,key])=>{const component=record(runtime.componentCoverage?.[key])?runtime.componentCoverage[key]:{};const providers=record(component.providers)?Object.entries(component.providers):[];const providersKnown=count(component.totalZones)!==null&&providers.length>0&&providers.every(([,n])=>count(n)!==null)&&providers.reduce((sum,[,n])=>sum+n,0)===component.totalZones;return `<tr data-component=\"${key}\"><td>${label}</td><td>${cacheKey?metric(cache[cacheKey]):'Ikke opgjort i denne cachekontrakt'}</td><td>${pair(component.missing,component.totalZones)}</td><td>${providersKnown?providers.map(([p,n])=>`${esc(p)}: ${metric(n)}`).join(' · '):'Ukendt'}</td></tr>`;}).join('')}</tbody></table></div></article>\n<article class=\"admin-card\"><h2>Automatisk datakvalitet</h2><div class=\"metric\">${esc(qualityStatus)}</div><p>${metric(errors)} fejl · ${metric(warnings)} advarsler</p>${issues?.length?`<div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Niveau</th><th>Kode</th><th>Forklaring</th></tr></thead><tbody>${issues.map(x=>`<tr><td>${esc(x.severity)}</td><td>${esc(x.code)}</td><td>${esc(x.message)}</td></tr>`).join('')}</tbody></table></div>`:issues&&qualityConsistent&&errors===0&&warnings===0?'<p>Ingen registrerede problemer i denne generations diagnose.</p>':'<p>Problemlisten er ukendt eller kan ikke bekræftes. Det er ikke et fejlfrit resultat.</p>'}</article>\n<article class=\"admin-card\"><h2>Vandstand</h2><p><b>Stationsestimat:</b> sammenlignes særskilt med modelprognosen. <b>Observationer:</b> ${metric(qo.stationsWithFreshLevel)} friske stationer. <b>Direkte:</b> ${metric(qo.directZones)} zoner. <b>Interpoleret:</b> ${metric(qo.interpolatedZones)} zoner. <b>Uden observation:</b> ${metric(qo.zonesWithoutDmiObservation)} zoner.</p><p class=\"hint\">Aktuel observation, interpolation og modelprognose vises som tre forskellige datatyper. Ved HTTP 429 vises årsagen i stedet for en generel stationsforklaring.</p></article>\n<article class=\"admin-card\"><h2>Vandstandsstationernes livscyklus</h2><p><b>Register:</b> ${metric(lifecycle.total)} · <b>Leverer nu:</b> ${metric(lifecycle.delivering)} · <b>Midlertidigt uden ny måling:</b> ${metric(lifecycle.temporarilyMissing)} · <b>Gyldig prognosecache:</b> ${metric(lifecycle.forecastCacheValid)} · <b>Kun cache anvendelig:</b> ${metric(lifecycle.cacheOnlyUsable)} · <b>Utilgængelige:</b> ${metric(lifecycle.unavailable)}</p><p class=\"hint\">En kørsel, der bevidst springer observationer over, må ikke nulstille historikken. Observationsstatus, cachegyldighed og samlet anvendelighed vises hver for sig.</p></article>\n"
    };
    assert.equal(source.split(hunk.after).length,2);
    const prior=source.replace(hunk.after,hunk.before);
    assert.equal(Buffer.byteLength(prior),136873);
    assert.equal(sha(prior),'87da0e9bd9037db5972d0d0edc66d6d680ac148dbd5164585c20ca7f8f68455c');
    return prior;
  };
  const dataQualityAfterHunk=" const record=x=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x);\n const count=x=>Number.isSafeInteger(x)&&x>=0?x:null;\n const metric=x=>count(x)===null?'Ukendt':String(x);\n const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?String(x):'Ukendt';\n const pair=(n,d)=>count(n)!==null&&count(d)!==null&&n<=d?`${n}/${d}`:'Ukendt';\n const date=x=>typeof x==='string'&&/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,6})?Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,19)===x.slice(0,19);\n const when=x=>date(x)?esc(new Date(x).toLocaleString('da-DK')):'Ukendt';\n const version=x=>typeof x==='string'&&/^\\d+\\.\\d+\\.\\d+$/.test(x)?x:null;\n const reportMeta=x=>`<p class=\"hint\">Rapporttidspunkt: ${when(x.generatedAt)} · Version: ${esc(version(x.version)||'ikke oplyst')}. Selvstændig rapport, ikke eksplicit bundet til den offentlige generation.</p>`;\n const publicAt=state.conditions.generatedAt,publicBound=date(publicAt)&&date(state.publicManifest?.generatedAt)&&publicAt===state.publicManifest.generatedAt;\n const decoded=record(state.runtimeDetails)?state.runtimeDetails:{};\n const runtimeMatches=publicBound&&date(decoded.generatedAt)&&decoded.generatedAt===publicAt;\n const runtimeCurrent=runtimeMatches&&version(decoded.version)===VERSION;\n const runtime=runtimeCurrent?decoded:{},acq=record(runtime.acquisition)?runtime.acquisition:{};\n const health=record(state.health)?state.health:{},healthCurrent=publicBound&&date(health.generatedAt)&&health.generatedAt===publicAt;\n const cache=healthCurrent&&record(health.dmiForecastCache)?health.dmiForecastCache:{},dmiHealth=healthCurrent&&record(health.dmi)?health.dmi:{};\n const userHealth=healthCurrent&&record(health.userData)?health.userData:{};\n const quality=record(runtime.dataQuality)&&date(runtime.dataQuality.generatedAt)&&runtime.dataQuality.generatedAt===publicAt?runtime.dataQuality:{};\n const qo=record(quality.observations)?quality.observations:{},lifecycle=record(quality.stationLifecycle)?quality.stationLifecycle:{};\n const rows=[['Vind','windZones','wind'],['Bølger','waveZones','wave'],['Strøm','currentZones','current'],['Vandstand','waterLevelZones','waterLevel'],['Vandtemperatur',null,'waterTemperature']];\n const cooldownKnown=acq.persistentRateLimitedUntil===null||date(acq.persistentRateLimitedUntil),cooldownActive=date(acq.persistentRateLimitedUntil)&&Date.parse(acq.persistentRateLimitedUntil)>Date.now();\n const apiLabel=acq.stoppedByHttp429===true?'HTTP 429':cooldownActive?'Cooldown aktiv':count(acq.requestsUsed)!==null?`${acq.requestsUsed} forespørgsler registreret`:'Ukendt';\n const oceanDocument=record(state.oceanDiagnostics)?state.oceanDiagnostics:{},ocean=record(oceanDocument.summary)?oceanDocument.summary:{};\n let missingReasons=null;\n if(date(oceanDocument.generatedAt)){\n  if(record(oceanDocument.missingZones)&&Object.values(oceanDocument.missingZones).every(record))missingReasons=Object.entries(oceanDocument.missingZones).map(([zoneId,item])=>({...item,zoneId}));\n  else if(oceanDocument.missingZones===undefined){const old=oceanDocument.missingZoneReasons??oceanDocument.zonesWithoutCompleteMarineData;if(Array.isArray(old)&&old.every(record))missingReasons=old;}\n }\n const planAudit=record(state.implementationAudit)?state.implementationAudit:{},planSummary=record(planAudit.summary)?planAudit.summary:planAudit,providerSwitches=record(planSummary.hourlyProviderSwitches)?planSummary.hourlyProviderSwitches:{};\n const cacheAudit=record(state.cacheAudit)?state.cacheAudit:{};\n const cacheBefore=cacheAudit.before===undefined?(cacheAudit.beforeBytes??cacheAudit.sizeBeforeBytes):cacheAudit.before?.bytes;\n const cacheAfter=cacheAudit.after===undefined?(cacheAudit.afterBytes??cacheAudit.sizeAfterBytes):cacheAudit.after?.bytes;\n const cacheFiles=cacheAudit.after===undefined?(cacheAudit.filesKept??(Array.isArray(cacheAudit.keptFiles)?cacheAudit.keptFiles.length:undefined)):cacheAudit.after?.files;\n const removedFiles=cacheAudit.removedFiles===undefined?cacheAudit.filesRemoved:Array.isArray(cacheAudit.removedFiles)?cacheAudit.removedFiles.length:cacheAudit.removedFiles;\n const errors=count(quality.issueCounts?.errors),warnings=count(quality.issueCounts?.warnings),issues=Array.isArray(quality.issues)&&quality.issues.every(record)?quality.issues:null;\n const qualityConsistent=errors!==null&&warnings!==null&&issues!==null&&((errors+warnings===0)===(issues.length===0))&&quality.status===(errors?'error':warnings?'warning':'ok');\n const qualityStatus=qualityConsistent?quality.status:'Ukendt';\n const userPair=pair(userHealth.completeZones,userHealth.totalZones),userStatus=userPair!=='Ukendt'&&typeof userHealth.healthy==='boolean'?(userHealth.healthy?'tilstrækkelig':'utilstrækkelig'):'Ukendt';\n content.innerHTML=`<article class=\"admin-card ${runtimeCurrent&&healthCurrent?'':'status-warning'}\"><h2>Diagnosekilder og tidsbinding</h2><p>Offentlig generering: ${when(publicAt)} · Runtime: ${when(decoded.generatedAt)} · Runtimeversion: ${esc(version(decoded.version)||'Ukendt')} · Frontendversion: ${esc(VERSION)}.</p><p>Vejrstatus: ${when(health.generatedAt)} · Vejrstatusversion: ikke oplyst.</p><p class=\"hint\">${runtimeCurrent?'Runtime har kendt dato og version for denne visning.':'Runtime kan ikke bekræftes for denne visning; dens aktuelle tal vises som ukendte.'} ${healthCurrent?'Vejrstatus matcher den offentlige generering.':'Vejrstatus kan ikke bindes til den offentlige generering.'} En versionsafvigelse er ikke i sig selv bevis for forkert vejr. Rapporter nedenfor har egne tidspunkter.</p></article>\n<div class=\"admin-grid\"><article class=\"admin-card\"><h2>Fire aktuelle felter ved generering</h2><div class=\"metric\">${userPair}</div><p class=\"muted\">Vind, bølger, strøm og vandstand ved generering. Ikke vandtemperatur eller fuld prognosehorisont. Producentstatus: ${userStatus}.</p></article><article class=\"admin-card\"><h2>DMI-cache: fire komponenter</h2><div class=\"metric\">${pair(cache.completeZones,dmiHealth.totalZones)}</div><p class=\"muted\">Producentens cachekrav: mindst 96 timers vind og 24 timers bølger, strøm og vandstand. Ikke fuld femfamilie-/femdøgnsdækning.</p></article><article class=\"admin-card\"><h2>DMI-kørslens registrering</h2><div class=\"metric\">${esc(apiLabel)}</div><p class=\"muted\">${date(acq.persistentRateLimitedUntil)?`Registreret cooldown til ${when(acq.persistentRateLimitedUntil)}`:cooldownKnown?'Ingen cooldown registreret i kilden.':'Cooldownstatus ukendt.'} Dette er ikke en ny liveforbindelsesprøve.</p></article><article class=\"admin-card\"><h2>Dublerede rå tider</h2><div class=\"metric\">${metric(cache.duplicateTimestampZones)}</div><p class=\"muted\">Producentens registrerede antal; ukendt er ikke nul.</p></article></div>\n<article class=\"admin-card\"><h2>Marine DMI-rapport</h2>${reportMeta(oceanDocument)}<div class=\"admin-grid compact\"><div><span class=\"metric\">${metric(ocean.freshMarineZones)}</span><p class=\"muted\">Friske zoner i rapportens modelrunde</p></div><div><span class=\"metric\">${metric(ocean.preservedMarineZones)}</span><p class=\"muted\">Bevaret gyldig DMI-cache i rapporten</p></div><div><span class=\"metric\">${metric(ocean.fallbackOrMissingMarineZones)}</span><p class=\"muted\">Fallback eller manglende marine DMI i rapporten</p></div></div><p class=\"hint\">Ingen af tallene udledes af forskelle mellem andre rapporter. De er ikke en ny måling af hele prognosens dækning.</p></article>\n<article class=\"admin-card\"><h2>Samlet implementeringsaudit</h2>${reportMeta(planAudit)}<p><b>Fejl:</b> ${metric(planAudit.issueCounts?.errors)} · <b>Advarsler:</b> ${metric(planAudit.issueCounts?.warnings)} · <b>Forecast-horisont:</b> ${number(record(planSummary.forecastHorizonHours)?planSummary.forecastHorizonHours.median:planSummary.forecastHorizonHours)} timer</p><p><b>Kildeskift:</b> ${rows.map(([label,,key])=>`${label} ${metric(providerSwitches[key])}`).join(' · ')}</p><p><b>Retningsankre:</b> ${metric(planSummary.zonesWithDirectionAnchors)} zoner · <b>Geometri godkendt:</b> ${metric(planSummary.zonesWithValidGeometryDirection)}</p><p class=\"hint\">Auditten dokumenterer problemer uden automatisk at omskrive autoritative DMI-data.</p></article>\n<article class=\"admin-card\"><h2>DMI-cacheaudit</h2>${reportMeta(cacheAudit)}<p><b>Før oprydning:</b> ${metric(cacheBefore)} bytes · <b>Efter:</b> ${metric(cacheAfter)} bytes · <b>Filer efter:</b> ${metric(cacheFiles)} · <b>Slettet:</b> ${metric(removedFiles)}</p><p class=\"hint\">Cacheoptimering må ikke reducere DMI-dækning eller prognosehorisont.</p></article>\n<article class=\"admin-card\"><h2>Manglende marine zoner i rapporten</h2>${missingReasons===null?'<p>Ikke oplyst med et kendt rapporttidspunkt. Det beviser hverken mangler eller fuld dækning.</p>':missingReasons.length?`<div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Zone</th><th>Årsag</th><th>Prøvede modeller</th><th>Nærmeste gyldige punkt</th></tr></thead><tbody>${missingReasons.slice(0,231).map(x=>{const collections=x.triedCollections??x.collectionsTried??x.attempts;const distance=x.nearestValidDistanceKm??x.distanceKm;return `<tr><td>${esc(x.zoneName||x.zoneId||x.id||'Ukendt')}</td><td>${esc(x.reason||x.code||x.primaryReason||'Ukendt')}</td><td>${Array.isArray(collections)?esc(collections.map(a=>typeof a==='string'?a:a?.collection).filter(a=>typeof a==='string').join(', ')||'Ikke oplyst'):'Ikke oplyst'}</td><td>${number(distance)}${number(distance)==='Ukendt'?'':' km'}</td></tr>`;}).join('')}</tbody></table></div>`:'<p>Ingen manglende marine zoner registreret i denne daterede rapport.</p>'}</article>\n<article class=\"admin-card\"><h2>Komponenttal med særskilt afgrænsning</h2><p class=\"hint\">DMI-cache tæller zoner med mindst én gyldig komponenttime. Runtime tæller kilder og felter ved generering, ikke hele horisonten eller en senere valgt korttime. Ukendt kilde er ikke det samme som en manglende måling.</p><div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Komponent</th><th>DMI-cachezoner</th><th>Runtime: manglende felt/zoner</th><th>Runtimekilder ved generering</th></tr></thead><tbody>${rows.map(([label,cacheKey,key])=>{const component=record(runtime.componentCoverage?.[key])?runtime.componentCoverage[key]:{};const providers=record(component.providers)?Object.entries(component.providers):[];const providersKnown=count(component.totalZones)!==null&&providers.length>0&&providers.every(([,n])=>count(n)!==null)&&providers.reduce((sum,[,n])=>sum+n,0)===component.totalZones;return `<tr data-component=\"${key}\"><td>${label}</td><td>${cacheKey?metric(cache[cacheKey]):'Ikke opgjort i denne cachekontrakt'}</td><td>${pair(component.missing,component.totalZones)}</td><td>${providersKnown?providers.map(([p,n])=>`${esc(p)}: ${metric(n)}`).join(' · '):'Ukendt'}</td></tr>`;}).join('')}</tbody></table></div></article>\n<article class=\"admin-card\"><h2>Automatisk datakvalitet</h2><div class=\"metric\">${esc(qualityStatus)}</div><p>${metric(errors)} fejl · ${metric(warnings)} advarsler</p>${issues?.length?`<div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Niveau</th><th>Kode</th><th>Forklaring</th></tr></thead><tbody>${issues.map(x=>`<tr><td>${esc(x.severity)}</td><td>${esc(x.code)}</td><td>${esc(x.message)}</td></tr>`).join('')}</tbody></table></div>`:issues&&qualityConsistent&&errors===0&&warnings===0?'<p>Ingen registrerede problemer i denne generations diagnose.</p>':'<p>Problemlisten er ukendt eller kan ikke bekræftes. Det er ikke et fejlfrit resultat.</p>'}</article>\n<article class=\"admin-card\"><h2>Vandstand</h2><p><b>Stationsestimat:</b> sammenlignes særskilt med modelprognosen. <b>Observationer:</b> ${metric(qo.stationsWithFreshLevel)} friske stationer. <b>Direkte:</b> ${metric(qo.directZones)} zoner. <b>Interpoleret:</b> ${metric(qo.interpolatedZones)} zoner. <b>Uden observation:</b> ${metric(qo.zonesWithoutDmiObservation)} zoner.</p><p class=\"hint\">Aktuel observation, interpolation og modelprognose vises som tre forskellige datatyper. Ved HTTP 429 vises årsagen i stedet for en generel stationsforklaring.</p></article>\n<article class=\"admin-card\"><h2>Vandstandsstationernes livscyklus</h2><p><b>Register:</b> ${metric(lifecycle.total)} · <b>Leverer nu:</b> ${metric(lifecycle.delivering)} · <b>Midlertidigt uden ny måling:</b> ${metric(lifecycle.temporarilyMissing)} · <b>Gyldig prognosecache:</b> ${metric(lifecycle.forecastCacheValid)} · <b>Kun cache anvendelig:</b> ${metric(lifecycle.cacheOnlyUsable)} · <b>Utilgængelige:</b> ${metric(lifecycle.unavailable)}</p><p class=\"hint\">En kørsel, der bevidst springer observationer over, må ikke nulstille historikken. Observationsstatus, cachegyldighed og samlet anvendelighed vises hver for sig.</p></article>\n";
  for(const changed of [dashboard+'\n',dashboard.replace(dataQualityAfterHunk,''),
    dashboard.replace(dataQualityAfterHunk,dataQualityAfterHunk+dataQualityAfterHunk)])
    assert.throws(()=>reviewedDataQualityDashboardView(changed));
  // Kun test: vend præcis den gennemgåede admin-delta før de uændrede
  // hele590/588/587-orakler. Ingen historisk hash eller produktgrænse ommærkes.
  const reviewedAdminDashboardHunks=[
    ["import { authEnabled, currentSession, requireFreshSession, testConnection, signOut, authIdentityEpoch, onAuthChange } from '../services/auth-service.js?v=4.0.590';\nimport { loadAdminTripCount } from '../services/admin-trip-count.js?v=4.0.590&ui=admin-current-data-20261028';\nimport { loadAdminAccountCategories, filterAdminAccountProfiles } from '../services/admin-account-categories.js?v=4.0.590&ui=admin-current-data-20261028';\n","import { authEnabled, currentSession, requireFreshSession, testConnection, signOut } from '../services/auth-service.js?v=4.0.590';\n"],
    ["let adminTripCountRenderEpoch=0;\nlet disposeAdminTripCount=null;\nlet adminUserRenderEpoch=0;\nlet disposeAdminUserCategories=null;\nfunction invalidateAdminUserCategories(){adminUserRenderEpoch++;disposeAdminUserCategories?.();disposeAdminUserCategories=null;}\n\nfunction invalidateAdminTripCount(){adminTripCountRenderEpoch++;disposeAdminTripCount?.();disposeAdminTripCount=null;}\nfunction adminTripCountCard(){\n if(state.access?.profile?.is_active!==true||!allowed('full_admin'))return '';\n return '<article class=\"admin-card\" id=\"adminTripCount\"><h2>Samlet gemte ture/observationer</h2><div class=\"metric\" data-trip-count-total>AFVENTER</div><p>Heraf markerede testture: <span data-trip-count-test>—</span></p><p class=\"muted\">Alle gemte rækker i det aktive lager, også anonyme og ældre indberetninger. Umarkerede rækker er ikke verificerede virkelige ture.</p><p class=\"hint\" data-trip-count-time>Optællingen hentes sikkert.</p><button class=\"admin-button secondary\" data-trip-count-refresh>Opdatér optælling</button></article>';\n}\nfunction mountAdminTripCount(){\n const card=document.querySelector('#adminTripCount');if(!card)return;\n const generation=adminTripCountRenderEpoch,identity=authIdentityEpoch(),owner=currentSession()?.user?.id;\n const total=card.querySelector('[data-trip-count-total]'),test=card.querySelector('[data-trip-count-test]');\n const time=card.querySelector('[data-trip-count-time]'),button=card.querySelector('[data-trip-count-refresh]');let serial=0;\n const visible=()=>generation===adminTripCountRenderEpoch&&state.tab==='dashboard'&&card.isConnected\n  &&document.querySelector('#adminTripCount')===card&&identity===authIdentityEpoch()&&owner===currentSession()?.user?.id\n  &&Boolean(owner)&&state.access?.profile?.id===owner&&state.access.profile.is_active===true&&allowed('full_admin');\n const unavailable=()=>{total.textContent='IKKE TILGÆNGELIGT';test.textContent='—';time.textContent='Optællingen kunne ikke bekræftes. Prøv at opdatere.';};\n const unsubscribe=onAuthChange(()=>{if(identity===authIdentityEpoch()&&owner===currentSession()?.user?.id)return;serial++;if(card.isConnected)unavailable();});\n disposeAdminTripCount=()=>{serial++;unsubscribe();};\n const refresh=async()=>{\n  const request=++serial;if(!visible())return;button.disabled=true;total.textContent='HENTER…';test.textContent='—';time.textContent='Optællingen hentes sikkert.';\n  try{const result=await loadAdminTripCount();if(!visible()||request!==serial)return;\n   total.textContent=String(result.storedCount);test.textContent=String(result.markedTestCount);\n   time.textContent='Optalt '+new Date(result.startedAt).toLocaleString('da-DK')+' – '+new Date(result.completedAt).toLocaleTimeString('da-DK')+'. Lagerdelene læses efter hinanden.';\n  }catch{if(visible()&&request===serial)unavailable();}\n  finally{if(visible()&&request===serial)button.disabled=false;}\n };\n button.onclick=refresh;void refresh();\n}\n",""],
    [" users:{title:'Konti og rettigheder',purpose:'Her ses kontoens kontrollerede kategori og faktisk tildelte rettigheder. Kategorier og filtre ændrer ikke adgangen.',steps:['Vælg et udsnit og eventuelt et kategorifilter','Afklar advarsler om rettigheder, der afviger fra kategorien','Gem kun bevidste manuelle rettighedsændringer'],result:'En teknisk expertrolle er ikke i sig selv faglig ekspertstatus. Scoreændringer kræver kodegennemgang, målrettede tests og en versionsstyret udgivelse.'},\n"," users:{title:'Eksperter og rettigheder',purpose:'Her bestemmer du med få brede flueben, hvad hver ekspert må gøre.',steps:['Vælg en ekspert','Sæt eller fjern flueben','Tryk Gem rettigheder'],result:'Eksperter kan gennemgå håndbogen og indsende faglige rettelser. Scoreændringer kræver kodegennemgang, målrettede tests og en versionsstyret udgivelse.'},\n"],
    ["function render(){invalidateAdminTripCount();invalidateAdminUserCategories();if(state.tab!=='coastlineEditor')destroyCoastlineEditor();if(state.tab!=='directionAudit')destroyDirectionMap();if(state.tab!=='waterStations'&&state.stationMap){state.stationMap.remove();state.stationMap=null;}({dashboard:renderDashboard,weather:renderWeather,waterStations:renderWaterStations,zones:renderZones,coastlineEditor:renderAdminCoastlineEditor,directionAudit:renderDirectionAudit,observations:renderObservations,history:renderHistory,visitors:renderVisitors,learning:renderLearning,users:renderUsers,handbook:renderHandbook,documentation:renderDocumentation,system:renderSystem}[state.tab]||renderDashboard)();content.insertAdjacentHTML('afterbegin',moduleGuide());bindModuleGuide();if(state.tab==='learning')mountPrivateTripStudyCard(content,state.access);}\n","function render(){if(state.tab!=='coastlineEditor')destroyCoastlineEditor();if(state.tab!=='directionAudit')destroyDirectionMap();if(state.tab!=='waterStations'&&state.stationMap){state.stationMap.remove();state.stationMap=null;}({dashboard:renderDashboard,weather:renderWeather,waterStations:renderWaterStations,zones:renderZones,coastlineEditor:renderAdminCoastlineEditor,directionAudit:renderDirectionAudit,observations:renderObservations,history:renderHistory,visitors:renderVisitors,learning:renderLearning,users:renderUsers,handbook:renderHandbook,documentation:renderDocumentation,system:renderSystem}[state.tab]||renderDashboard)();content.insertAdjacentHTML('afterbegin',moduleGuide());bindModuleGuide();if(state.tab==='learning')mountPrivateTripStudyCard(content,state.access);}\n"],
    ["function renderDashboard(){invalidateAdminTripCount();const h=state.health;const zc=Object.keys(state.conditions.zones||{}).length;const obs=JSON.parse(localStorage.getItem('ravradar-observations-v2')||'[]');const conn=state.connection||{};const storage=state.storageHealth||{};const docs=storage.documents||{};const active=activePublicRavScoreState();const scoreMotorCard=active.ok?`<article class=\"admin-card\"><h2>Scoremotor</h2><div class=\"metric\">20/50/30</div><p class=\"muted\">${esc(active.value.statusDa)} Faglige ændringer gennemgår kode, tests og versionsstyring.</p></article>`:activeModelUnavailableCard(active,{title:'Scoremotor'});const activeDocuments=['water-level-station-routing','direction-reviews','coastline-overrides'];const docRows=activeDocuments.map(key=>{const x=docs[key]||{};return `<tr><td>${esc(key)}</td><td>${x.ok?(x.exists?'✓ Centralt':'○ Ikke oprettet endnu'):'✕ Fejl'}</td><td>${x.updatedAt?esc(new Date(x.updatedAt).toLocaleString('da-DK')):'—'}</td><td>${x.version??'—'}</td></tr>`}).join('');content.innerHTML=`<div class=\"admin-grid\">\n","function renderDashboard(){const h=state.health;const zc=Object.keys(state.conditions.zones||{}).length;const obs=JSON.parse(localStorage.getItem('ravradar-observations-v2')||'[]');const conn=state.connection||{};const storage=state.storageHealth||{};const docs=storage.documents||{};const active=activePublicRavScoreState();const scoreMotorCard=active.ok?`<article class=\"admin-card\"><h2>Scoremotor</h2><div class=\"metric\">20/50/30</div><p class=\"muted\">${esc(active.value.statusDa)} Faglige ændringer gennemgår kode, tests og versionsstyring.</p></article>`:activeModelUnavailableCard(active,{title:'Scoremotor'});const activeDocuments=['water-level-station-routing','direction-reviews','coastline-overrides'];const docRows=activeDocuments.map(key=>{const x=docs[key]||{};return `<tr><td>${esc(key)}</td><td>${x.ok?(x.exists?'✓ Centralt':'○ Ikke oprettet endnu'):'✕ Fejl'}</td><td>${x.updatedAt?esc(new Date(x.updatedAt).toLocaleString('da-DK')):'—'}</td><td>${x.version??'—'}</td></tr>`}).join('');content.innerHTML=`<div class=\"admin-grid\">\n"],
    ["${scoreMotorCard}${adminTripCountCard()}\n","${scoreMotorCard}\n"],
    [" mountAdminTripCount();document.querySelector('#openHandbookReview').onclick=()=>{state.tab='handbook';document.querySelectorAll('.admin-tabs button').forEach(tab=>tab.classList.toggle('active',tab.dataset.tab==='handbook'));render();};document.querySelector('#retestSupabase').onclick=async()=>{state.connection=await testConnection();state.storageHealth=await adminStorageHealth(activeDocuments);renderDashboard();};const persistenceButton=document.querySelector('#runPersistenceTest');if(persistenceButton)persistenceButton.onclick=async()=>{if(!confirm('Testen foretager midlertidige, mærkede ændringer i eksisterende centraldokumenter og gendanner dem straks. Fortsæt?'))return;persistenceButton.disabled=true;persistenceButton.textContent='Tester…';let box=document.querySelector('#persistenceTestResult');if(!box){box=document.createElement('article');box.id='persistenceTestResult';box.className='admin-card';content.append(box);}box.innerHTML='<h2>Supabase-persistenstest</h2><p>Testen kører…</p>';try{const report=await runFullPersistenceTest();box.innerHTML=`<h2>Supabase-persistenstest</h2><p class=\"${report.ok?'status-good':'status-bad'}\"><b>${report.ok?'BESTÅET':'FEJLEDE'}</b> · ${esc(report.runId)}</p><div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Del</th><th>Status</th><th>Resultat</th></tr></thead><tbody>${report.results.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.status==='passed'?'✓ Bestået':x.status==='skipped'?'○ Ikke oprettet':'✕ Fejl'}</td><td>${esc(x.detail)}</td></tr>`).join('')}</tbody></table></div><p class=\"hint\">Start ${new Date(report.startedAt).toLocaleString('da-DK')} · slut ${new Date(report.finishedAt).toLocaleString('da-DK')}</p>`;}catch(error){box.innerHTML=`<h2>Supabase-persistenstest</h2><p class=\"status-bad\">Testen kunne ikke gennemføres: ${esc(error.message)}</p>`;}finally{persistenceButton.disabled=false;persistenceButton.textContent='Kør fuld test';}};const verifyButton=document.querySelector('#verifyCentralStorage');if(verifyButton)verifyButton.onclick=async()=>{verifyButton.disabled=true;verifyButton.textContent='Kontrollerer…';try{state.storageHealth=await adminStorageHealth(activeDocuments);}catch(error){state.storageHealth={ok:false,checkedAt:new Date().toISOString(),error:error.message,documents:{}};}renderDashboard();};const siteButton=document.querySelector('#runSiteFunctionTest');if(siteButton){\n"," document.querySelector('#openHandbookReview').onclick=()=>{state.tab='handbook';document.querySelectorAll('.admin-tabs button').forEach(tab=>tab.classList.toggle('active',tab.dataset.tab==='handbook'));render();};document.querySelector('#retestSupabase').onclick=async()=>{state.connection=await testConnection();state.storageHealth=await adminStorageHealth(activeDocuments);renderDashboard();};const persistenceButton=document.querySelector('#runPersistenceTest');if(persistenceButton)persistenceButton.onclick=async()=>{if(!confirm('Testen foretager midlertidige, mærkede ændringer i eksisterende centraldokumenter og gendanner dem straks. Fortsæt?'))return;persistenceButton.disabled=true;persistenceButton.textContent='Tester…';let box=document.querySelector('#persistenceTestResult');if(!box){box=document.createElement('article');box.id='persistenceTestResult';box.className='admin-card';content.append(box);}box.innerHTML='<h2>Supabase-persistenstest</h2><p>Testen kører…</p>';try{const report=await runFullPersistenceTest();box.innerHTML=`<h2>Supabase-persistenstest</h2><p class=\"${report.ok?'status-good':'status-bad'}\"><b>${report.ok?'BESTÅET':'FEJLEDE'}</b> · ${esc(report.runId)}</p><div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Del</th><th>Status</th><th>Resultat</th></tr></thead><tbody>${report.results.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.status==='passed'?'✓ Bestået':x.status==='skipped'?'○ Ikke oprettet':'✕ Fejl'}</td><td>${esc(x.detail)}</td></tr>`).join('')}</tbody></table></div><p class=\"hint\">Start ${new Date(report.startedAt).toLocaleString('da-DK')} · slut ${new Date(report.finishedAt).toLocaleString('da-DK')}</p>`;}catch(error){box.innerHTML=`<h2>Supabase-persistenstest</h2><p class=\"status-bad\">Testen kunne ikke gennemføres: ${esc(error.message)}</p>`;}finally{persistenceButton.disabled=false;persistenceButton.textContent='Kør fuld test';}};const verifyButton=document.querySelector('#verifyCentralStorage');if(verifyButton)verifyButton.onclick=async()=>{verifyButton.disabled=true;verifyButton.textContent='Kontrollerer…';try{state.storageHealth=await adminStorageHealth(activeDocuments);}catch(error){state.storageHealth={ok:false,checkedAt:new Date().toISOString(),error:error.message,documents:{}};}renderDashboard();};const siteButton=document.querySelector('#runSiteFunctionTest');if(siteButton){\n"],
    [" invalidateAdminUserCategories();const generation=adminUserRenderEpoch,identity=authIdentityEpoch(),owner=currentSession()?.user?.id;\n",""],
    [" content.innerHTML=`<article class=\"admin-card\"><h2>Konti og rettigheder</h2><p class=\"muted\">${canManageAll?'Kategorier og filtre ændrer ikke kontoens rolle eller rettigheder.':'Du kan kun tildele de tre sikre ekspertadgange: administration, håndbog og faglig gennemgang. Kontokategorier er ikke tilgængelige i denne begrænsede rettighedsvisning.'}</p><div class=\"toolbar\">${canManageAll?'<label>Kategori <select id=\"accountCategoryFilter\"><option value=\"all\">Alle</option><option value=\"owner\">Ejer</option><option value=\"expert\">Ekspert</option><option value=\"ordinary\">Almindelige brugere</option></select></label><button class=\"admin-button secondary\" id=\"refreshAccountCategories\">Opdatér kategorier</button>':''}<button class=\"admin-button secondary\" id=\"previousAccountPage\">Forrige konti</button><button class=\"admin-button secondary\" id=\"nextAccountPage\">Næste konti</button></div><p class=\"hint\" id=\"accountCategoryScope\">Henter den tilladte profilliste…</p><div id=\"profilesList\" class=\"admin-grid\"><p class=\"muted\">Henter brugere…</p></div></article>`;\n"," content.innerHTML=`<article class=\"admin-card\"><h2>Eksperter og rettigheder</h2><p class=\"muted\">${canManageAll?'Administratorer kan tildele alle dokumenterede rettigheder.':'Du kan kun tildele de tre sikre ekspertadgange: administration, håndbog og faglig gennemgang.'}</p><div id=\"profilesList\" class=\"admin-grid\"><p class=\"muted\">Henter brugere…</p></div></article>`;\n"],
    [" const sameView=()=>generation===adminUserRenderEpoch&&state.tab==='users'&&host.isConnected\n  &&document.querySelector('#profilesList')===host;\n const current=()=>sameView()&&identity===authIdentityEpoch()&&owner===currentSession()?.user?.id&&Boolean(owner);\n try{const profiles=await listProfiles();if(!current())return;state.profiles=profiles;\n  const visibleProfiles=canManageAll?state.profiles:state.profiles.filter(profile=>profile.role==='expert');\n  let page=0,serial=0,categories=new Map(),categoryStatus=canManageAll?'Kategorier afventer kontrol.':'';\n  disposeAdminUserCategories=onAuthChange(()=>{if(identity===authIdentityEpoch()&&owner===currentSession()?.user?.id)return;serial++;categories.clear();state.profiles=[];if(sameView())host.innerHTML='<div class=\"empty\">Kontoen blev ændret. Åbn administrationen igen.</div>';});\n  const scope=document.querySelector('#accountCategoryScope'),select=document.querySelector('#accountCategoryFilter');\n  const previous=document.querySelector('#previousAccountPage'),next=document.querySelector('#nextAccountPage'),refresh=document.querySelector('#refreshAccountCategories');\n  const pageProfiles=()=>visibleProfiles.slice(page*64,page*64+64);\n  const draw=()=>{if(!current())return;const shown=pageProfiles(),filtered=filterAdminAccountProfiles(shown,categories,select?.value||'all');\n   scope.textContent=`Viser ${shown.length?page*64+1:0}–${page*64+shown.length} af ${visibleProfiles.length} aktuelt indlæste konti. Filtre gælder kun disse op til 64 konti; dette er ikke en fuld kontofortegnelse. ${categoryStatus}`;\n   previous.disabled=page===0;next.disabled=(page+1)*64>=visibleProfiles.length;\n   const labels={owner:'Ejer',expert:'Ekspert',ordinary:'Almindelig bruger',unknown:'Ukendt kategori'};\n   const issues={'ordinary-has-permissions':'Har rettigheder — afviger fra den aftalte kategori.','owner-expert-conflict':'Den udpegede ekspertprofil har også ejerrolle.','profile-unavailable':'Profilen kunne ikke klassificeres sikkert.','multiple-owners-in-batch':'Flere ejerroller i denne indlæste gruppe; kræver afklaring.'};\n   host.innerHTML=filtered.map(profile=>{const active=new Set((profile.user_permissions||[]).filter(x=>x.enabled).map(x=>x.permission_key));const classification=categories.get(profile.id);return `<article class=\"admin-card permission-card\" data-user-id=\"${esc(profile.id)}\"><div class=\"rule-card-head\"><div><h3>${esc(profile.display_name||profile.email)}</h3><p class=\"muted\">${esc(profile.email||'')} · ${esc(labels[classification?.category]||labels.unknown)}</p><p class=\"hint\">Teknisk rolle: ${esc(profile.role||'ukendt')}</p>${(classification?.issues||[]).map(issue=>`<p class=\"status-warning\">${esc(issues[issue])}</p>`).join('')}</div><span class=\"badge ${profile.is_active!==false?'active':'draft'}\">${profile.is_active!==false?'Aktiv':'Deaktiveret'}</span></div><div class=\"permission-list\">${manageablePermissions.map(p=>`<label class=\"permission-option\"><input type=\"checkbox\" name=\"${esc(p.id)}\" ${active.has(p.id)||profile.role==='owner'?'checked':''} ${profile.role==='owner'?'disabled':''}><span>${esc(p.label)}</span></label>`).join('')}</div>${profile.role==='owner'?'<p class=\"hint\">Owner har altid alle rettigheder.</p>':'<button class=\"admin-button save-user-permissions\" type=\"button\">Gem rettigheder</button><p class=\"form-status\"></p>'}</article>`}).join('')||'<div class=\"empty\">Ingen konti med bekræftet kategori i dette udsnit.</div>';\n   host.querySelectorAll('.save-user-permissions').forEach(button=>button.onclick=async()=>{const card=button.closest('[data-user-id]');const status=card.querySelector('.form-status');const values={};manageablePermissions.forEach(p=>values[p.id]=card.querySelector(`[name=\"${p.id}\"]`).checked);button.disabled=true;status.textContent='Gemmer…';try{await savePermissions(card.dataset.userId,values);status.textContent='Rettighederne er gemt og gælder med det samme.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});\n  };\n  const loadCategories=async()=>{const request=++serial;categories=new Map();categoryStatus=canManageAll?'Kategorier kontrolleres…':'';draw();if(!canManageAll||!pageProfiles().length)return;\n   refresh.disabled=true;try{const report=await loadAdminAccountCategories(pageProfiles().map(profile=>profile.id));if(!current()||request!==serial)return;\n    categories=new Map(report.rows.map(row=>[row.id,row]));categoryStatus='Kontrolleret '+new Date(report.checkedAt).toLocaleString('da-DK')+'. Ukendte profiler er ikke almindelige brugere.';\n   }catch{if(!current()||request!==serial)return;categoryStatus='Kategorier er ikke tilgængelige. Ukendte profiler vises kun under Alle.';}\n   finally{if(current()&&request===serial){refresh.disabled=false;draw();}}\n  };\n  previous.onclick=()=>{if(page>0){page--;void loadCategories();}};next.onclick=()=>{if((page+1)*64<visibleProfiles.length){page++;void loadCategories();}};\n  if(select)select.onchange=draw;if(refresh)refresh.onclick=loadCategories;draw();void loadCategories();\n }catch(error){if(sameView())host.innerHTML=`<div class=\"empty\">${esc(identity!==authIdentityEpoch()||owner!==currentSession()?.user?.id?'Kontoen blev ændret. Åbn administrationen igen.':error.message)}</div>`;}\n"," try{state.profiles=await listProfiles();const visibleProfiles=canManageAll?state.profiles:state.profiles.filter(profile=>profile.role==='expert');if(!visibleProfiles.length){host.innerHTML='<div class=\"empty\">Ingen ekspertprofiler blev fundet.</div>';return;}\n host.innerHTML=visibleProfiles.map(profile=>{const active=new Set((profile.user_permissions||[]).filter(x=>x.enabled).map(x=>x.permission_key));return `<article class=\"admin-card permission-card\" data-user-id=\"${esc(profile.id)}\"><div class=\"rule-card-head\"><div><h3>${esc(profile.display_name||profile.email)}</h3><p class=\"muted\">${esc(profile.email||'')} · ${esc(profile.role||'expert')}</p></div><span class=\"badge ${profile.is_active!==false?'active':'draft'}\">${profile.is_active!==false?'Aktiv':'Deaktiveret'}</span></div><div class=\"permission-list\">${manageablePermissions.map(p=>`<label class=\"permission-option\"><input type=\"checkbox\" name=\"${esc(p.id)}\" ${active.has(p.id)||profile.role==='owner'?'checked':''} ${profile.role==='owner'?'disabled':''}><span>${esc(p.label)}</span></label>`).join('')}</div>${profile.role==='owner'?'<p class=\"hint\">Owner har altid alle rettigheder.</p>':'<button class=\"admin-button save-user-permissions\" type=\"button\">Gem rettigheder</button><p class=\"form-status\"></p>'}</article>`}).join('');\n host.querySelectorAll('.save-user-permissions').forEach(button=>button.onclick=async()=>{const card=button.closest('[data-user-id]');const status=card.querySelector('.form-status');const values={};manageablePermissions.forEach(p=>values[p.id]=card.querySelector(`[name=\"${p.id}\"]`).checked);button.disabled=true;status.textContent='Gemmer…';try{await savePermissions(card.dataset.userId,values);status.textContent='Rettighederne er gemt og gælder med det samme.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});\n }catch(error){host.innerHTML=`<div class=\"empty\">${esc(error.message)}</div>`;}\n"],
  ];
  const reviewedAdminDashboardView=source=>{
    source=reviewedDataQualityDashboardView(source);
    assert.equal(Buffer.byteLength(source),136873);
    assert.equal(sha(source),"87da0e9bd9037db5972d0d0edc66d6d680ac148dbd5164585c20ca7f8f68455c");
    for(const [current,prior] of reviewedAdminDashboardHunks){
      assert.equal(source.split(current).length,2);source=source.replace(current,prior);
    }
    assert.equal(Buffer.byteLength(source),129214);
    assert.equal(sha(source),'dc282a24fe53f929ed50f7aae0df90e704b7126b134da044f6c49adedb787e87');
    return source;
  };
  for(const [current] of reviewedAdminDashboardHunks){
    assert.equal(dashboard.split(current).length,2);
    for(const changed of [dashboard.replace(current,''),dashboard.replace(current,current+'// UNREVIEWED_ADMIN_DELTA\n'),dashboard.replace(current,current+current)])
      assert.throws(()=>reviewedAdminDashboardView(changed));
  }
  // Kun test: bevis hele den aktuelle590-fil og præcis versionsinverse til588.
  // Det gamle588→587-orakel nedenfor bevares byteeksakt; normal render bruger590.
  const reviewed590DashboardView=source=>{
    assert.equal(Buffer.byteLength(source),129214);
    assert.equal(sha(source),'dc282a24fe53f929ed50f7aae0df90e704b7126b134da044f6c49adedb787e87');
    assert.equal(source.split('?v=4.0.590').length,21);
    assert.equal(source.includes('?v=4.0.588'),false);
    assert.equal(source.split("const VERSION='4.0.590';").length,2);
    const prior=source.replaceAll('?v=4.0.590','?v=4.0.588')
      .replace("const VERSION='4.0.590';","const VERSION='4.0.588';");
    assert.equal(sha(prior),'08f17fc40aa5c986ed869d8f202d9bf7c83b8490920cb354d4768c7585970731');
    return prior;
  };
  const historicalDashboardView=source=>{
    assert.equal(Buffer.byteLength(source),129214);
    assert.equal(sha(source),'08f17fc40aa5c986ed869d8f202d9bf7c83b8490920cb354d4768c7585970731');
    assert.equal(source.split('?v=4.0.588').length,21);
    assert.equal(source.includes('?v=4.0.587'),false);
    assert.equal(source.split("const VERSION='4.0.588';").length,2);
    const prior=source.replaceAll('?v=4.0.588','?v=4.0.587')
      .replace("const VERSION='4.0.588';","const VERSION='4.0.587';");
    assert.equal(sha(prior),'aa2466f85e4590e19c0af2dcb698e4f5c4406a0b9c1b6ac3e6f431007ebe2a4b');
    return prior;
  };
  for(const [before,after] of [['?v=4.0.590','?v=4.0.589'],
    ["const VERSION='4.0.590';","const VERSION='4.0.589';"],
    ['mountPrivateTripStudyCard(content,state.access);','mountPrivateTripStudyCarX(content,state.access);']]){
    assert.equal(dashboard.includes(before),true);
    assert.throws(()=>historicalDashboardView(reviewed590DashboardView(reviewedAdminDashboardView(dashboard.replace(before,after)))));
  }
  let original=historicalDashboardView(reviewed590DashboardView(reviewedAdminDashboardView(dashboard)));
  for(const [current,prior] of [
    ["import { mountPrivateTripStudyCard } from './admin-private-trip-study.js?v=4.0.587';\nimport { analyzeObservations }",'import { analyzeObservations }'],
    ["content.insertAdjacentHTML('afterbegin',moduleGuide());bindModuleGuide();if(state.tab==='learning')mountPrivateTripStudyCard(content,state.access);}",
      "content.insertAdjacentHTML('afterbegin',moduleGuide());bindModuleGuide();}"],
  ]){assert.equal(original.split(current).length,2);original=original.replace(current,prior);}
  assert.equal(sha(original),'cabbc3c638bf0330fe4b505e69dd72c4892f54753885a2fe0031154cf31daca2');
  // The genuine historical renderer remains DATA; raw current UI is tested separately below.
  const render=dashboard.match(/^function render\(\)\{[^\n]+\}/m)?.[0];assert(render);
  const start=dashboard.indexOf('function renderLearning(){'),end=dashboard.indexOf('\n\nconst saveBadge=',start);assert(start>=0&&end>start);
  let mounts=0;
  const context={state:{tab:'learning',stationMap:null},content:{insertAdjacentHTML(){}},analyzeObservations:()=>({}),
    activePublicRavScoreState:()=>({ok:false}),activeModelUnavailableCard:()=>'SYNTHETIC_UNAVAILABLE_MODEL',
    moduleGuide:()=>'',bindModuleGuide(){},destroyCoastlineEditor(){},destroyDirectionMap(){},mountPrivateTripStudyCard(){mounts++;}};
  for(const name of new Set([...render.matchAll(/(?:\:|\|\|)(render\w+)/g)].map(x=>x[1])))context[name]=()=>{};
  const lifetimeDeclarations=['adminTripCountRenderEpoch','disposeAdminTripCount','adminUserRenderEpoch','disposeAdminUserCategories']
    .map(name=>{const actual=dashboard.match(new RegExp('^let '+name+'=[^;]+;','m'))?.[0];assert(actual,name);return actual;}).join('\n');
  const lifetimeGuards=['invalidateAdminTripCount','invalidateAdminUserCategories']
    .map(name=>{const actual=dashboard.match(new RegExp('^function '+name+'\\(\\)\\{[^\\n]+\\}','m'))?.[0];assert(actual,name);return actual;}).join('\n');
  vm.runInNewContext(lifetimeDeclarations+'\n'+lifetimeGuards+'\n'+dashboard.slice(start,end)+';'+render+';render();',context);assert.equal(mounts,1);
  context.state.tab='dashboard';vm.runInNewContext('render();',context);assert.equal(mounts,1);
  {
  // This test owns the current private-study import/render/access seam, not
  // historical complete dashboard bytes, labels or public weather readiness.
  const dashboard=await read('js/ui/admin-dashboard.js');
  const currentVersion=JSON.parse(await read('package.json')).version;
  const checkDashboardCoupling=source=>{
    const imports=[...source.matchAll(/^\s*import\s*\{\s*mountPrivateTripStudyCard\s*\}\s*from\s*['"]([^'"]+)['"]\s*;/gm)];
    assert.equal(imports.length,1,'one normal private-study import');
    assert.equal(imports[0][1],'./admin-private-trip-study.js?v='+currentVersion);
    const render=source.match(/^function render\(\)\{[^\n]+\}/m)?.[0];assert(render,'actual normal render');
    const learningStart=source.indexOf('function renderLearning(){'),learningEnd=source.indexOf('\n\nconst saveBadge=',learningStart);
    assert(learningStart>=0&&learningEnd>learningStart,'actual learning renderer');
    const calls=[],host={insertAdjacentHTML(){}},firstAccess={profile:{id:'synthetic-first',is_active:true,role:'owner'},permissions:new Set(['full_admin'])};
    let learningCalls=0;
    const context={state:{tab:'learning',stationMap:null,access:firstAccess},content:host,
      analyzeObservations:()=>{learningCalls++;return{};},activePublicRavScoreState:()=>({ok:false}),
      activeModelUnavailableCard:()=>'SYNTHETIC_UNAVAILABLE_MODEL',moduleGuide:()=>'',bindModuleGuide(){},
      destroyCoastlineEditor(){},destroyDirectionMap(){},mountPrivateTripStudyCard(actualHost,access){
        assert.equal(actualHost,host,'normal host');assert.equal(access,context.state.access,'same current access object');
        calls.push({host:actualHost,access});
      }};
    for(const name of new Set([...render.matchAll(/(?:\:|\|\|)(render\w+)/g)].map(x=>x[1])))context[name]=()=>{};
    const declarations=['adminTripCountRenderEpoch','disposeAdminTripCount','adminUserRenderEpoch','disposeAdminUserCategories']
      .map(name=>{const actual=source.match(new RegExp('^let '+name+'=[^;]+;','m'))?.[0];assert(actual,name);return actual;}).join('\n');
    const guards=['invalidateAdminTripCount','invalidateAdminUserCategories']
      .map(name=>{const actual=source.match(new RegExp('^function '+name+'\\(\\)\\{[^\\n]+\\}','m'))?.[0];assert(actual,name);return actual;}).join('\n');
    const sandbox=vm.createContext(context);
    vm.runInContext(declarations+'\n'+guards+'\n'+source.slice(learningStart,learningEnd)+';'+render+';render();',sandbox);
    assert.equal(calls.length,1,'one private-study mount on learning');assert.equal(calls[0].access,firstAccess);assert.equal(learningCalls,1);
    const tabs=[...render.matchAll(/(?:\{|,)(\w+):render\w+/g)].map(x=>x[1]);assert(tabs.includes('learning')&&tabs.includes('dashboard'));
    for(const tab of tabs.filter(name=>name!=='learning')){context.state.tab=tab;vm.runInContext('render();',sandbox);assert.equal(calls.length,1,'no private-study mount on '+tab);}
    assert.equal(learningCalls,1,'other tabs do not run learning');
    const nextAccess={profile:{id:'synthetic-next',is_active:true,role:'owner'},permissions:new Set(['full_admin'])};
    context.state.access=nextAccess;context.state.tab='learning';vm.runInContext('render();',sandbox);
    assert.equal(calls.length,2,'returning to learning mounts once');assert.equal(calls[1].access,nextAccess);assert.equal(learningCalls,2);
  };
  checkDashboardCoupling(dashboard);
  const mount="if(state.tab==='learning')mountPrivateTripStudyCard(content,state.access);";
  assert.equal(dashboard.split(mount).length,2);
  for(const [label,changed]of[
    ['removed',dashboard.replace(mount,'')],['duplicated',dashboard.replace(mount,mount+mount)],
    ['unconditional',dashboard.replace(mount,'mountPrivateTripStudyCard(content,state.access);')],
    ['wrong-access',dashboard.replace(mount,"if(state.tab==='learning')mountPrivateTripStudyCard(content,{});")],
    ['wrong-host',dashboard.replace(mount,"if(state.tab==='learning')mountPrivateTripStudyCard({},state.access);")],
    ['misrouted-learning',dashboard.replace('learning:renderLearning','learning:renderDashboard')],
    ['removed-import',dashboard.replace(importsForMutation(dashboard),'')],
  ])assert.throws(()=>checkDashboardCoupling(changed),undefined,label);
  function importsForMutation(source){const line=source.match(/^import \{ mountPrivateTripStudyCard \} from [^\n]+\n/m)?.[0];assert(line);return line;}
  // Demonstrate scope independence: unrelated text/format additions are not
  // authorization or export regressions and need no five-version inverse.
  checkDashboardCoupling(dashboard+'\n// SYNTHETIC_UNRELATED_APPEND\n');
  assert(dashboard.includes('Ture i lokalt datagrundlag'));
  checkDashboardCoupling(dashboard.replace('Ture i lokalt datagrundlag','Ture i lokalt datagrundlag · syntetisk visningstekst'));
  // This existing normal target previously had only a package-script entry.
  // The normal source callers now executes its loading/failure/retry/draft
  // regression exactly once, without another workflow or broad test chain.
  await import('./test-admin-initial-dashboard-4.0.77.mjs');
  }
});

// TEST ONLY: qualify the real fixed588 plan before the unchanged587/586 oracles.
async function reviewed587PackageViewForUnchangedOracles(pkg){
  pkg=await reviewed588PackageViewForUnchangedOracles(pkg);
  const {ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND,verifyAssistantPublic587SuccessorPackage}
    =await import('./national584-source-evidence.mjs');
  if(pkg.scripts['test:assistant-later-h0-source']!==ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND)return pkg;
  const original=structuredClone(pkg);
  const {ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,requireAssistantLaterH0Release}
    =await import('./lib/assistant-later-h0-successor-source.mjs');
  const {inverseAssistantPublic587SuccessorSourceScripts}=await import('./lib/account-statistics-assistant-package-review.mjs');
  if(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING===null)
    assert.throws(()=>verifyAssistantPublic587SuccessorPackage(pkg),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
  else assert.doesNotThrow(()=>verifyAssistantPublic587SuccessorPackage(pkg));
  const prior=inverseAssistantPublic587SuccessorSourceScripts(pkg.scripts);
  assert.deepEqual(pkg,original,'Active verification and historical views cannot edit the source package');
  return {...pkg,version:requireAssistantLaterH0Release(),scripts:prior};
}

test('public587 successor source registration dispatches actual588 once before exact whole587 inverse',async()=>{
  const actual=await reviewed588PackageViewForUnchangedOracles(JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'))),original=structuredClone(actual);
  const {ASSISTANT_LATER_H0_SOURCE_COMMAND,ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND,
    verifyAssistantLaterH0Package,verifyAssistantPublic587SuccessorPackage}=await import('./national584-source-evidence.mjs');
  const {ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,requireAssistantLaterH0Release}
    =await import('./lib/assistant-later-h0-successor-source.mjs');
  const {inverseAssistantPublic587SuccessorSourceScripts,inverseAssistantLaterH0SourceScripts}
    =await import('./lib/account-statistics-assistant-package-review.mjs');
  assert([ASSISTANT_LATER_H0_SOURCE_COMMAND,ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND].includes(actual.scripts['test:assistant-later-h0-source']));
  const next={...actual,version:'4.0.588',scripts:{...actual.scripts,
    'test:assistant-later-h0-source':ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND}};
  const prior=inverseAssistantPublic587SuccessorSourceScripts(next.scripts);
  const sha=scripts=>crypto.createHash('sha256').update(JSON.stringify(Object.keys(scripts).sort().map(key=>[key,scripts[key]]))).digest('hex');
  assert.equal(sha(next.scripts),'fe8e112b4e4e30d948aeecf764db02369bdfc90ba1d0d681af5733b27443b06b');
  assert.equal(sha(prior),'9df85408955c0449c92370f1af4451ff475f4cc10a4e92bcb440790793bda997');
  assert.equal(prior['test:assistant-later-h0-source'],ASSISTANT_LATER_H0_SOURCE_COMMAND);
  assert.deepEqual(inverseAssistantLaterH0SourceScripts(next.scripts),inverseAssistantLaterH0SourceScripts(prior));
  assert.doesNotThrow(()=>verifyAssistantLaterH0Package({...actual,version:requireAssistantLaterH0Release(),scripts:prior}));
  if(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING===null)
    assert.throws(()=>verifyAssistantPublic587SuccessorPackage(next),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
  else{
    assert.equal(actual.version,'4.0.588');
    assert.equal(actual.scripts['test:assistant-later-h0-source'],ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND);
    assert.doesNotThrow(()=>verifyAssistantPublic587SuccessorPackage(actual));
  }
  for(const mutate of [v=>v['test:assistant-later-h0-source']=ASSISTANT_LATER_H0_SOURCE_COMMAND,
    v=>v['test:assistant-later-h0-source']+=' --unexpected',
    v=>delete v['test:assistant-later-h0-source'],v=>v['unreviewed']='true',
    v=>v['test:ravscore-source-critical']+=' && npm run test:assistant-later-h0-source',
    v=>v['test:ravscore-source-critical']=v['test:ravscore-source-critical'].replace(
      'npm run test:native-original-continuity-source && npm run test:assistant-later-h0-source',
      'npm run test:assistant-later-h0-source && npm run test:native-original-continuity-source')]){
    const changed=structuredClone(next.scripts);mutate(changed);
    assert.throws(()=>inverseAssistantPublic587SuccessorSourceScripts(changed));
    assert.throws(()=>verifyAssistantPublic587SuccessorPackage({...next,scripts:changed}));
  }
  assert.deepEqual(actual,original);
});

test('public587 successor national binding preserves587 commands and requires distinct588 native receipt',async()=>{
  const {ASSISTANT_LATER_H0_SOURCE_COMMAND,ASSISTANT_LATER_H0_NATIVE_COMMANDS,
    ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND,ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS,
    verifyCurrentNativeCommands}=await import('./national584-source-evidence.mjs');
  const {CURRENT_COMMANDS,ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS,
    verifyAssistantLaterH0PhaseReceipt,verifyAssistantPublic587SuccessorPhaseReceipt}=await import('./native-postgres-evidence.mjs');
  const {ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,requireAssistantPublic590SuccessorRelease}=await import('./lib/assistant-later-h0-successor-source.mjs');
  assert.equal(ASSISTANT_LATER_H0_SOURCE_COMMAND,'node scripts/build-assistant-later-h0-successor.mjs --check');
  assert.equal(ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND,'node scripts/build-assistant-later-h0-successor.mjs --public587-successor --check');
  assert.deepEqual(ASSISTANT_LATER_H0_NATIVE_COMMANDS,CURRENT_COMMANDS);
  assert.deepEqual(ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS,ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS);
  assert.throws(()=>verifyCurrentNativeCommands(CURRENT_COMMANDS,'4.0.587'),error=>error.code==='ERR_ASSERTION'
    &&error.actual==='4.0.587'&&error.expected===activeNationalReaderRelease);
  assert.throws(()=>verifyCurrentNativeCommands(ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS,'4.0.587'));
  if(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING===null)
    assert.throws(()=>verifyCurrentNativeCommands(ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS,'4.0.588'),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
  else{
    assert.throws(()=>verifyCurrentNativeCommands(ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS,'4.0.588'),error=>error.code==='ERR_ASSERTION'
      &&error.actual==='4.0.588'&&error.expected===activeNationalReaderRelease);
    assert.throws(()=>verifyCurrentNativeCommands(CURRENT_COMMANDS,'4.0.588'));
  }
  const current={run:123,attempt:1,head:'a'.repeat(40),pullRequest:123,branch:'synthetic-public587-successor'};
  const old={phase:'ASSISTANT_LATER_H0',status:'EXECUTED',executedInThisRun:true,origin:null,
    current,commands:[...CURRENT_COMMANDS],eligibleForReuse:false};
  const next={...old,phase:'ASSISTANT_PUBLIC587_SUCCESSOR',commands:[...ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS]};
  assert.doesNotThrow(()=>verifyAssistantLaterH0PhaseReceipt(old,current));
  assert.doesNotThrow(()=>verifyAssistantPublic587SuccessorPhaseReceipt(next,current));
  assert.throws(()=>verifyAssistantLaterH0PhaseReceipt(next,current));
  assert.throws(()=>verifyAssistantPublic587SuccessorPhaseReceipt(old,current));
  for(const mutate of [v=>v.status='REUSED',v=>v.origin={run:122},v=>v.eligibleForReuse=true,
    v=>v.executedInThisRun=false,v=>v.commands=[...CURRENT_COMMANDS]]){
    const changed=structuredClone(next);mutate(changed);
    assert.throws(()=>verifyAssistantPublic587SuccessorPhaseReceipt(changed,current));
  }
});

test('public587 national entry refuses unissued before I/O and leaves historical584 reuse scope unchanged',async()=>{
  const source=await fs.readFile(new URL('./national584-source-evidence.mjs',import.meta.url),'utf8');
  const main=source.slice(source.indexOf('async function main(){'));
  assert(main.indexOf('requireAssistantPublic587SuccessorRelease();')<main.indexOf('await requireSourceEnvironment();'));
  assert(source.includes("else if(pkg.version==='4.0.587')verifyAssistantLaterH0PhaseReceipt"));
  assert(source.includes("else if(pkg.version!=='4.0.585')verifyAssistantPublic587SuccessorPhaseReceipt"));
  assert(source.includes("current587PredecessorNative:{status:'EXECUTED',phase:'assistant-later-h0',scope:'GENUINE_FROZEN587'"));
  assert(source.includes("currentAssistantPublic587SuccessorNative:{status:'EXECUTED',phase:'assistant-public587-successor'"));
  assert(source.includes("actualCommand:ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true"));
  assert(source.includes('currentAssistantPublic587SuccessorNationalExecutionClaimed:false'));
  assert(source.includes("sourceScope:'HISTORICAL_584_ONLY'"));
  assert(source.includes("try{result=await authenticatedReuse(ctx);}"));
  assert(source.includes("catch{result=await executeHistorical();"));
  assert(source.includes("providerOrProductionProof:false"));
});

// TEST ONLY: exact590 package DATA inverse before whole unchanged588/587 oracles.
// This view is never passed to a runtime/native receipt verifier or installer.
async function reviewed588PackageViewForUnchangedOracles(pkg){
  const {ASSISTANT_PUBLIC590_SUCCESSOR_SOURCE_COMMAND,ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND,
    verifyAssistantPublic590SuccessorPackage,verifyAssistantPublic587SuccessorPackage}
    =await import('./national584-source-evidence.mjs');
  if(activeNationalSource.sourcePhase==='assistant-public591-successor'||installed593Original591Current){
    const {verifyAssistantPublic591SuccessorPackage,verifyInstalled593Original591Package}=await import('./national584-source-evidence.mjs');
    const {inverseReviewedForecastShareProjectionSourceScripts}=await import('./lib/account-statistics-assistant-package-review.mjs');
    const {requireAssistantPublic587SuccessorRelease}=await import('./lib/assistant-later-h0-successor-source.mjs');
    const original=structuredClone(pkg);
    (installed593Original591Current?verifyInstalled593Original591Package:verifyAssistantPublic591SuccessorPackage)(pkg);
    const scripts=inverseReviewedForecastShareProjectionSourceScripts(pkg.scripts);
    const prior={...pkg,version:requireAssistantPublic587SuccessorRelease(),scripts:{...scripts,
      'test:assistant-later-h0-source':ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND}};
    verifyAssistantPublic587SuccessorPackage(prior);
    assert.deepEqual({...prior,version:original.version,scripts:{...prior.scripts,
      'test:assistant-later-h0-source':original.scripts['test:assistant-later-h0-source'],
      'test:privacy-source-critical':original.scripts['test:privacy-source-critical']}},original,
      'Whole actual compact-sharing package DATA roundtrip; only release, builder and exact sharing registration differ');
    assert.deepEqual(pkg,original,'Historical package view cannot edit actual source');return prior;
  }
  if(pkg.scripts['test:assistant-later-h0-source']!==ASSISTANT_PUBLIC590_SUCCESSOR_SOURCE_COMMAND)return pkg;
  const original=structuredClone(pkg);
  verifyAssistantPublic590SuccessorPackage(pkg);
  const {requireAssistantPublic587SuccessorRelease}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const prior={...pkg,version:requireAssistantPublic587SuccessorRelease(),scripts:{...pkg.scripts,
    'test:assistant-later-h0-source':ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND}};
  verifyAssistantPublic587SuccessorPackage(prior);
  assert.deepEqual({...prior,version:original.version,scripts:{...prior.scripts,
    'test:assistant-later-h0-source':ASSISTANT_PUBLIC590_SUCCESSOR_SOURCE_COMMAND}},original,
    'Whole actual590 package DATA roundtrip; only release and one command differ');
  assert.deepEqual(pkg,original,'Historical package view cannot edit actual590 source');
  return prior;
}


test('compact-sharing registration qualifies actual592 plan once before unchanged whole command oracles',async()=>{
  const actual=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8')),original=structuredClone(actual);
  const {inverseReviewedForecastShareProjectionSourceScripts,inverseAssistantPublic588SuccessorSourceScripts}
    =await import('./lib/account-statistics-assistant-package-review.mjs');
  const {verifyAssistantPublic591SuccessorPackage,verifyInstalled593Original591Package}=await import('./national584-source-evidence.mjs');
  const verifyActual=installed593Original591Current?verifyInstalled593Original591Package:verifyAssistantPublic591SuccessorPackage;
  assert.doesNotThrow(()=>verifyActual(actual));
  const prior=inverseReviewedForecastShareProjectionSourceScripts(actual.scripts);
  const command='node scripts/test-forecast-share-projection.mjs',key='test:privacy-source-critical';
  assert.equal(prior[key]+' && '+command,actual.scripts[key]);
  assert.doesNotThrow(()=>inverseAssistantPublic588SuccessorSourceScripts(actual.scripts));
  assert.deepEqual(actual,original,'Planning and exact DATA inversion cannot edit the actual package');
  for(const mutate of [v=>v[key]=prior[key],v=>v[key]+=' && '+command,
    v=>v[key]=command+' && '+prior[key],v=>v[key]=v[key].replace(command,command+' --unexpected'),
    v=>v['test:ravscore-source-critical']+=' && '+command,v=>v.unreviewed='true']){
    const changed=structuredClone(actual.scripts);mutate(changed);
    assert.throws(()=>inverseReviewedForecastShareProjectionSourceScripts(changed));
    assert.throws(()=>verifyActual({...actual,scripts:changed}));
  }
  assert.throws(()=>inverseReviewedForecastShareProjectionSourceScripts(actual.scripts,{}));
});

test('active590 national reader validates actual591 before exact whole588 package inverse',async()=>{
  const actual=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8')),original=structuredClone(actual);
  const {verifyPackage,verifyInstalled593Original591Package,verifyAssistantPublic591SuccessorPackage,verifyAssistantPublic590SuccessorPackage,verifyAssistantPublic587SuccessorPackage,
    INSTALLED593_ORIGINAL591_SOURCE_COMMAND,ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND,ASSISTANT_PUBLIC590_SUCCESSOR_SOURCE_COMMAND,ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND}
    =await import('./national584-source-evidence.mjs');
  const {requireAssistantPublic590SuccessorRelease}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const current592=activeNationalSource.sourcePhase==='assistant-public591-successor';
  const compactCurrent=current592||installed593Original591Current;
  const activePackageVerifier=installed593Original591Current?verifyInstalled593Original591Package
    :current592?verifyAssistantPublic591SuccessorPackage:verifyAssistantPublic590SuccessorPackage;
  assert.equal(actual.version,compactCurrent?activeNationalReaderRelease:requireAssistantPublic590SuccessorRelease());
  assert.equal(actual.scripts['test:assistant-later-h0-source'],installed593Original591Current?INSTALLED593_ORIGINAL591_SOURCE_COMMAND
    :current592?ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND:ASSISTANT_PUBLIC590_SUCCESSOR_SOURCE_COMMAND);
  if(compactCurrent)assert.throws(()=>verifyAssistantPublic590SuccessorPackage(actual),error=>error.code==='ERR_ASSERTION'
    &&error.actual===activeNationalSource.sourcePhase&&error.expected==='assistant-public590-successor');
  if(installed593Original591Current)assert.throws(()=>verifyAssistantPublic591SuccessorPackage(actual),error=>error.code==='ERR_ASSERTION'
    &&error.actual===activeNationalSource.sourcePhase&&error.expected==='assistant-public591-successor');
  assert.doesNotThrow(()=>verifyPackage(actual));
  assert.doesNotThrow(()=>activePackageVerifier(actual));
  const prior=await reviewed588PackageViewForUnchangedOracles(actual);
  assert.equal(prior.version,'4.0.588');
  assert.equal(prior.scripts['test:assistant-later-h0-source'],ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND);
  assert.doesNotThrow(()=>verifyAssistantPublic587SuccessorPackage(prior));
  for(const mutate of [v=>v.version='4.0.588',v=>v.version='0.0.0',
    v=>v.scripts['test:assistant-later-h0-source']=ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND,
    v=>v.scripts['test:assistant-later-h0-source']+=' --unexpected',
    v=>delete v.scripts['test:assistant-later-h0-source'],v=>v.scripts.unreviewed='true',
    v=>v.scripts['test:ravscore-source-critical']+=' && npm run test:assistant-later-h0-source',
    v=>v.scripts['test:ravscore-source-critical']=v.scripts['test:ravscore-source-critical'].replace(
      'npm run test:native-original-continuity-source && npm run test:assistant-later-h0-source',
      'npm run test:assistant-later-h0-source && npm run test:native-original-continuity-source')]){
    const changed=structuredClone(actual);mutate(changed);
    assert.throws(()=>verifyPackage(changed));
    assert.throws(()=>activePackageVerifier(changed));
  }
  for(const version of ['4.0.586','4.0.587','4.0.588','4.0.590',...(compactCurrent?['4.0.591']:[]),
    ...(installed593Original591Current?['4.0.592','4.0.593']:[])]){
    const changed={...actual,version};
    assert.throws(()=>verifyPackage(changed),error=>error.code==='ERR_ASSERTION'
      &&error.actual===version&&error.expected===activeNationalReaderRelease);
  }
  assert.deepEqual(actual,original);
});

test('active590 normal national reader rejects old,retagged,reused,stale or mutated native evidence',async()=>{
  const {INSTALLED593_ORIGINAL591_NATIVE_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_NATIVE_COMMANDS,ASSISTANT_PUBLIC590_SUCCESSOR_NATIVE_COMMANDS,ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS,
    installed593Original591NativeClaims,verifyCurrentNativeCommands,verifyInstalled593Original591NativeContext,verifyAssistantPublic591SuccessorNativeContext,verifyAssistantPublic590SuccessorNativeContext}
    =await import('./national584-source-evidence.mjs');
  const {INSTALLED593_ORIGINAL591_COMMANDS,INSTALLED593_ORIGINAL591_PHASE_KIND,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS,
    verifyAssistantPublic591SuccessorPhaseReceipt,verifyAssistantPublic590SuccessorPhaseReceipt,verifyAssistantPublic587SuccessorPhaseReceipt}
    =await import('./native-postgres-evidence.mjs');
  const {requireAssistantPublic590SuccessorRelease}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const current592=activeNationalSource.sourcePhase==='assistant-public591-successor';
  const compactCurrent=current592||installed593Original591Current;
  const release=compactCurrent?activeNationalReaderRelease:requireAssistantPublic590SuccessorRelease();
  const activeVerifyNative=installed593Original591Current?verifyInstalled593Original591NativeContext
    :current592?verifyAssistantPublic591SuccessorNativeContext:verifyAssistantPublic590SuccessorNativeContext;
  const activeCommands=installed593Original591Current?INSTALLED593_ORIGINAL591_COMMANDS
    :current592?ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS:ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS;
  if(installed593Original591Current)assert.deepEqual(INSTALLED593_ORIGINAL591_NATIVE_COMMANDS,INSTALLED593_ORIGINAL591_COMMANDS);
  assert.deepEqual(ASSISTANT_PUBLIC591_SUCCESSOR_NATIVE_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS);
  assert.deepEqual(ASSISTANT_PUBLIC590_SUCCESSOR_NATIVE_COMMANDS,ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS);
  const current={run:123,attempt:1,head:'a'.repeat(40),pullRequest:123,branch:'synthetic-active590-reader'};
  // Synthetic validator input only; this is neither execution nor a receipt artifact.
  const common={status:'EXECUTED',executedInThisRun:true,origin:null,current,eligibleForReuse:false};
  const receipt=installed593Original591Current?{...common,schemaVersion:1,kind:INSTALLED593_ORIGINAL591_PHASE_KIND,
    phase:'INSTALLED593_ORIGINAL591_SUCCESSOR',sourcePhase:activeNationalSource.sourcePhase,releaseVersion:release,
    binding:activeNationalSource.requireBinding(),output:activeNationalSource.requireOutput(),databaseBefore:activeNationalSource.databaseBefore,
    commands:[...activeCommands]}:{...common,phase:current592?'ASSISTANT_PUBLIC591_SUCCESSOR':'ASSISTANT_PUBLIC590_SUCCESSOR',commands:[...activeCommands]};
  const old590={...common,phase:'ASSISTANT_PUBLIC590_SUCCESSOR',commands:[...ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS]};
  assert.doesNotThrow(()=>verifyAssistantPublic590SuccessorPhaseReceipt(old590,current));
  if(compactCurrent){
    assert.throws(()=>verifyAssistantPublic590SuccessorNativeContext(old590,current,requireAssistantPublic590SuccessorRelease()));
    assert.throws(()=>verifyCurrentNativeCommands(old590.commands,requireAssistantPublic590SuccessorRelease()));
    assert.throws(()=>activeVerifyNative(old590,current,release));
  }
  assert.doesNotThrow(()=>activeVerifyNative(receipt,current,release));
  assert.doesNotThrow(()=>verifyCurrentNativeCommands(receipt.commands,release));
  if(installed593Original591Current){
    const old593={...common,phase:'ASSISTANT_PUBLIC591_SUCCESSOR',commands:[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS]};
    assert.doesNotThrow(()=>verifyAssistantPublic591SuccessorPhaseReceipt(old593,current));
    assert.throws(()=>verifyAssistantPublic591SuccessorNativeContext(old593,current,'4.0.593'));
    assert.throws(()=>activeVerifyNative(old593,current,release));
    assert.throws(()=>verifyCurrentNativeCommands(old593.commands,release));
    assert.throws(()=>verifyAssistantPublic591SuccessorPhaseReceipt(receipt,current));
    const claims=installed593Original591NativeClaims(receipt,current);
    assert.deepEqual(Object.keys(claims),['current586PredecessorNative','current587PredecessorNative','current588PredecessorNative',
      'current590PredecessorNative','current591PredecessorNative','current593PredecessorNative','currentInstalled593Original591SuccessorNative']);
    assert.equal(claims.current593PredecessorNative.scope,'GENUINE_FROZEN593');
    assert.equal(claims.currentInstalled593Original591SuccessorNative.phase,activeNationalSource.sourcePhase);
    for(const claim of Object.values(claims)){
      assert.equal(claim.status,'EXECUTED');assert.equal(claim.executedInThisRun,true);
      assert.equal(claim.origin,null);assert.equal(claim.eligibleForReuse,false);assert.equal(claim.separatelyRequired,true);
    }
  }
  assert.throws(()=>verifyCurrentNativeCommands(ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS,release));
  assert.throws(()=>verifyCurrentNativeCommands(receipt.commands,'4.0.588'));
  assert.throws(()=>verifyAssistantPublic587SuccessorPhaseReceipt(receipt,current));
  for(const mutate of [v=>v.phase='ASSISTANT_PUBLIC587_SUCCESSOR',v=>v.status='REUSED',
    v=>v.executedInThisRun=false,v=>v.origin={run:122},v=>v.eligibleForReuse=true,
    v=>v.commands=[...ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS],
    ...(compactCurrent?[v=>v.phase='ASSISTANT_PUBLIC590_SUCCESSOR',v=>v.commands=[...ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS]]:[]),
    ...(installed593Original591Current?[v=>v.phase='ASSISTANT_PUBLIC591_SUCCESSOR',v=>v.commands=[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],
      v=>v.schemaVersion=2,v=>v.kind='wrong-phase-kind',v=>v.sourcePhase='assistant-public591-successor',v=>v.releaseVersion='4.0.593',
      v=>v.binding={...v.binding,I:'0'.repeat(64)},v=>v.output={...v.output,migrationSha256:'0'.repeat(64)},
      v=>v.databaseBefore={...v.databaseBefore,I:'0'.repeat(64)}]:[]),
    v=>v.current={...current,head:'b'.repeat(40)},v=>v.current={...current,attempt:2},
    v=>v.commands=[...v.commands,v.commands[1]]]){
    const changed=structuredClone(receipt);mutate(changed);
    assert.throws(()=>activeVerifyNative(changed,current,release));
    if(installed593Original591Current)assert.throws(()=>installed593Original591NativeClaims(changed,current));
  }
  assert.throws(()=>activeVerifyNative(receipt,current,'0.0.0'));
  // The genuine old phase remains valid directly; ACTIVE-first is not historical dispatch.
  const {ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS,verifyAssistantPublic588SuccessorPhaseReceipt}
    =await import('./native-postgres-evidence.mjs');
  const {verifyAssistantPublic588SuccessorNativeContext}=await import('./national584-source-evidence.mjs');
  const {requireAssistantPublic588SuccessorRelease}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const historical={...common,phase:'ASSISTANT_PUBLIC588_SUCCESSOR',commands:[...ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS]};
  assert.doesNotThrow(()=>verifyAssistantPublic588SuccessorPhaseReceipt(historical,current));
  assert.throws(()=>verifyAssistantPublic588SuccessorPhaseReceipt(receipt,current));
  assert.throws(()=>activeVerifyNative(historical,current,release));
  assert.throws(()=>verifyCurrentNativeCommands(historical.commands,release));
  assert.throws(()=>verifyCurrentNativeCommands(receipt.commands,requireAssistantPublic588SuccessorRelease()));
  assert.throws(()=>verifyAssistantPublic588SuccessorNativeContext(historical,current,requireAssistantPublic588SuccessorRelease()));
});

test('calendar588 national entry binds its own phase while historical584 reuse remains historical only',async()=>{
  const source=await fs.readFile(new URL('./national584-source-evidence.mjs',import.meta.url),'utf8');
  const main=source.slice(source.indexOf('async function main(){'));
  assert(main.indexOf('requireAssistantPublic588SuccessorRelease();')<main.indexOf('await requireSourceEnvironment();'));
  assert(source.includes('if(pkg.version===ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE)verifyAssistantPublic588SuccessorNativeContext'));
  assert(source.includes("current588PredecessorNative:{status:'EXECUTED',phase:'assistant-public587-successor',scope:'GENUINE_FROZEN588'"));
  assert(source.includes("phase:'assistant-public588-successor',eligibleForReuse:false,separatelyRequired:true"));
  assert(source.includes('actualCommand:ASSISTANT_PUBLIC588_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true'));
  assert(source.includes('currentAssistantPublic588SuccessorNationalExecutionClaimed:false'));
  assert(source.includes("sourceScope:'HISTORICAL_584_ONLY'"));
  assert(source.includes('try{result=await authenticatedReuse(ctx);}'));
  assert(source.includes('catch{result=await executeHistorical();'));
  assert(source.includes('providerOrProductionProof:false'));
});
