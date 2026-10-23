// Normal CURRENT585 caller checks. Historical584 oracles run separately,
// unchanged. A synthetic migration-list response is not an installed database,
// and these boundary checks do not authenticate a real original B/S pair.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import './test-source-producer-prewrite.mjs';
import './test-source-native-node24-workflow.mjs';
import {inverseCurrent586PhaseUpload,inverseSourceProducerPhaseUpload,SOURCE_PRODUCER_COMMANDS}
  from './native-postgres-evidence.mjs';
import {inverseSourceNode24Workflow} from './national584-source-evidence.mjs';
import {DatabaseSync} from 'node:sqlite';
import {privateTripStudySchemaModel,classifyPrivateTripStudySchema,privateTripStudyMigrationSteps}
  from './deploy-private-trip-study.mjs';
import './test-trip-aggregate-month-rollover.mjs';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withFrozen585AccountStatisticsAssistantTestHost}
  from './lib/frozen585-account-statistics-assistant-test-host.mjs';

// TEST ONLY: the exact reviewed SOURCE CI changes are inverted before the
// unchanged whole586/historical584 assertions. Unknown bytes never fall back.
function sourcePrWorkflowBeforeSourceForTest(value){
  const source=String(value).replace(/\r\n/g,'\n');
  const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
  assert.equal(hash(source),'8070f5160f2599900c3f1dafc96f6fbd6d8ce0740353f1aa52e7f801456efc7a',
    'Whole reviewed SOURCE CI workflow, not selected markers');
  const prior=inverseSourceProducerPhaseUpload(inverseSourceNode24Workflow(source));
  assert.equal(hash(prior),'b8236a832c5145efee9bd97d1cdb552fa86453dffa086aaa63d61b533b9eefbb',
    'Whole genuine JOINT587 workflow before only the SOURCE CI delta');
  return prior;
}

// The existing normal fixedc03 DATA factory already materializes package.json.
// This test reads genuine587 bytes, never retags actual SOURCE package metadata.
let frozen587PackageBytesPromise;
async function genuine587PackageForTest(){
  const actual=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
  const {requireAssistantLaterH0Release}=await import('./lib/assistant-later-h0-successor-source.mjs');
  if(actual.version===requireAssistantLaterH0Release())return actual; // Ordinary587 path unchanged.
  const {verifySourceProducerPackage}=await import('./national584-source-evidence.mjs');
  verifySourceProducerPackage(actual); // Refuse unknown/unissued changed source before DATA materialization.
  frozen587PackageBytesPromise??=(async()=>{
    const {withAuthenticated587PredecessorSource}=await import('./check-source-producer-587-predecessor-source.mjs');
    return withAuthenticated587PredecessorSource(async sourceRoot=>{
      const bytes=await fs.readFile(path.join(sourceRoot,'package.json'));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
        '85614c466a1364662dbfb5fdde854a2d50face533b25684eae88c5d0fe246e77',
        'Whole actual fixedc03 genuine587 package, no version or scripts rewrite');
      return bytes;
    });
  })();
  const prior=JSON.parse(await frozen587PackageBytesPromise);
  assert.equal(prior.version,requireAssistantLaterH0Release());
  assert.deepEqual(prior.scripts,actual.scripts,'Only the exact preserved genuine587 command plan');
  return prior;
}

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
  const source=await fs.readFile(new URL('./deploy-private-trip-study.mjs',import.meta.url),'utf8'),
    workflow=await fs.readFile(new URL('../.github/workflows/private-trip-weather-study.yml',import.meta.url),'utf8');
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
test("private-study005: read-only plan substages preserve the whole original controller",async()=>{
  const source=(await fs.readFile(new URL('./deploy-private-trip-study.mjs',import.meta.url),'utf8'))
    .replace(/\r\n/g,'\n');
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
    inverseCandidatePublicSourceRunLine,verifyReviewed90Workflow:verifyWorkflow}=await import('./national584-source-evidence.mjs');
  const git=(...args)=>execFileSync('git',args,{maxBuffer:8*1024*1024,timeout:30000,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}});
  const fixture='b02745d6d2987ed0fd2913623b3809fd0ea02dd6';
  assert.equal(git('rev-parse',old.head+'^{tree}').toString().trim(),'400babda9377e43ea7ee1444008f7accd1aded32');
  assert.equal(git('rev-parse',fixture+'^{tree}').toString().trim(),'b3fe05c0b6356ead06fb91a957113d10553d7631');
  const before=git('show',old.head+':'+WORKFLOW).toString();
  const recorded=git('show',fixture+':'+WORKFLOW).toString();
  const currentWorkflow=(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  verifyCurrentWorkflow(currentWorkflow);
  const actual=inverseCurrent586PhaseUpload(sourcePrWorkflowBeforeSourceForTest(currentWorkflow));
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
    verifyWorkflow,verifyReviewed90Workflow}=await import('./national584-source-evidence.mjs');
  const fixture='b02745d6d2987ed0fd2913623b3809fd0ea02dd6';
  const recorded=execFileSync('git',['show',fixture+':'+WORKFLOW],{maxBuffer:65536,timeout:30000,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}}).toString();
  const currentWorkflow=(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  verifyWorkflow(currentWorkflow);
  const actual=inverseCurrent586PhaseUpload(sourcePrWorkflowBeforeSourceForTest(currentWorkflow));
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
  const actualPkg=await genuine587PackageForTest();
  const {verifyPackage,verifyCurrentNativeCommands,CURRENT586_NATIVE_COMMANDS}=await import('./national584-source-evidence.mjs');
  const {inverseReviewedAccountStatisticsAssistantSourceScripts,inverseAssistantLaterH0SourceScripts}=await import('./lib/account-statistics-assistant-package-review.mjs');
  const {ASSISTANT_LATER_H0_BINDING}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const later=Object.hasOwn(actualPkg.scripts,'test:assistant-later-h0-source');
  if(later){
    if(ASSISTANT_LATER_H0_BINDING===null)assert.throws(()=>verifyPackage(actualPkg),/ASSISTANT_LATER_H0_UNISSUED/);
    else assert.doesNotThrow(()=>verifyPackage(actualPkg));
  }
  const pkg=later?{...actualPkg,version:'4.0.586',scripts:inverseAssistantLaterH0SourceScripts(actualPkg.scripts)}:actualPkg;
  assert.equal(pkg.version,'4.0.586');assert.doesNotThrow(()=>verifyPackage(pkg));
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
  assert.doesNotThrow(()=>verifyCurrentNativeCommands([...CURRENT586_NATIVE_COMMANDS],'4.0.586'));
  assert.throws(()=>verifyCurrentNativeCommands([...CURRENT586_NATIVE_COMMANDS],'4.0.585'));
  assert.throws(()=>verifyCurrentNativeCommands(CURRENT586_NATIVE_COMMANDS.map(c=>c.replace(' --native-original-continuity','')),'4.0.586'));
  assert.throws(()=>verifyCurrentNativeCommands([...CURRENT586_NATIVE_COMMANDS,CURRENT586_NATIVE_COMMANDS[1]],'4.0.586'));
});

test('assistant later-H0 registration keeps exact older scripts and refuses phase/order mutations',async()=>{
  const pkg=await genuine587PackageForTest(),original=structuredClone(pkg);
  const {ASSISTANT_LATER_H0_BINDING,requireAssistantLaterH0Release}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const {verifyPackage,verifyCurrentNativeCommands,ASSISTANT_LATER_H0_NATIVE_COMMANDS}=await import('./national584-source-evidence.mjs');
  const {inverseAssistantLaterH0SourceScripts}=await import('./lib/account-statistics-assistant-package-review.mjs');
  const prior=inverseAssistantLaterH0SourceScripts(pkg.scripts);
  assert.equal(Object.hasOwn(prior,'test:assistant-later-h0-source'),false);
  assert.equal(prior['test:native-original-continuity-source'],
    'node scripts/build-native-original-continuity-successor.mjs --check && node --test scripts/test-native-original-continuity-callers.mjs');
  assert.deepEqual(pkg,original,'A historical test view never rewrites actual package source');
  if(ASSISTANT_LATER_H0_BINDING===null)assert.throws(()=>verifyPackage(pkg),/ASSISTANT_LATER_H0_UNISSUED/);
  else{
    assert.equal(pkg.version,requireAssistantLaterH0Release());assert.doesNotThrow(()=>verifyPackage(pkg));
    assert.doesNotThrow(()=>verifyCurrentNativeCommands([...ASSISTANT_LATER_H0_NATIVE_COMMANDS],pkg.version));
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

test('actual SOURCE package/native registration remains distinct from genuine587 DATA oracles',async()=>{
  const sourceBytes=await fs.readFile(new URL('../package.json',import.meta.url));
  const actual=JSON.parse(sourceBytes);
  const registrationTargets=['./test-source-producer-prewrite.mjs','./test-source-native-node24-workflow.mjs'];
  const caller=(await fs.readFile(new URL('./test-account-statistics-assistant-callers.mjs',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  for(const target of registrationTargets)assert.equal(caller.split("import '"+target+"';\n").length,2,
    'Exactly one normal account import of '+target);
  const {expandSourceCommands}=await import('./validate-source-once.mjs');
  const commands=expandSourceCommands(actual.scripts,'validate:source:checks');
  assert.equal(commands.filter(command=>command==='node --test scripts/test-account-statistics-assistant-callers.mjs').length,1,
    'The actual unchanged 9df plan dispatches the registering account target once');
  for(const target of registrationTargets)assert.equal(commands.filter(command=>command.split(' ').includes('scripts/'+target.slice(2))).length,0,
    'No direct command duplicates the imported '+target);
  const {SOURCE_PRODUCER_BINDING,SOURCE_PRODUCER_OUTPUT,SOURCE_PRODUCER_PROPOSED_RELEASE,
    requireSourceProducerBinding,requireSourceProducerOutput}=await import('./lib/source-producer-successor-source.mjs');
  const {verifyPackage,verifySourceProducerPackage,verifyCurrentNativeCommands,
    ASSISTANT_LATER_H0_NATIVE_COMMANDS}=await import('./national584-source-evidence.mjs');
  const {requireAssistantLaterH0Release}=await import('./lib/assistant-later-h0-successor-source.mjs');
  if(SOURCE_PRODUCER_BINDING===null){
    assert.equal(SOURCE_PRODUCER_OUTPUT,null);assert.equal(SOURCE_PRODUCER_PROPOSED_RELEASE,null);
    assert.throws(()=>verifySourceProducerPackage(actual),/SOURCE_PRODUCER_UNISSUED/);
    return; // No invented version/tuple to manufacture a positive SOURCE case.
  }
  requireSourceProducerBinding();requireSourceProducerOutput();
  assert.equal(actual.version,SOURCE_PRODUCER_PROPOSED_RELEASE);
  assert.doesNotThrow(()=>verifySourceProducerPackage(actual));
  assert.doesNotThrow(()=>verifyPackage(actual));
  assert.doesNotThrow(()=>verifyCurrentNativeCommands(SOURCE_PRODUCER_COMMANDS,actual.version));
  assert.throws(()=>verifyCurrentNativeCommands(ASSISTANT_LATER_H0_NATIVE_COMMANDS,actual.version));
  assert.throws(()=>verifyCurrentNativeCommands(SOURCE_PRODUCER_COMMANDS,requireAssistantLaterH0Release()));
  const old=await genuine587PackageForTest();
  assert.equal(old.version,requireAssistantLaterH0Release());
  assert.notEqual(old.version,actual.version);
  assert.deepEqual(old.scripts,actual.scripts);
  assert.doesNotThrow(()=>verifyPackage(old)); // The actual old587 rule is still tested separately.
  assert.doesNotThrow(()=>verifyCurrentNativeCommands(ASSISTANT_LATER_H0_NATIVE_COMMANDS,old.version));
  for(const mode of ['version','missing','duplicate','reordered','command','unknown-command']){
    const changed=structuredClone(actual),key='test:assistant-later-h0-source',marker='npm run '+key;
    if(mode==='version')changed.version='0.0.0';
    if(mode==='missing')delete changed.scripts[key];
    if(mode==='duplicate')changed.scripts['test:ravscore-source-critical']=changed.scripts['test:ravscore-source-critical'].replace(marker,marker+' && '+marker);
    if(mode==='reordered')changed.scripts['test:ravscore-source-critical']=changed.scripts['test:ravscore-source-critical'].replace('npm run test:native-original-continuity-source && '+marker,marker+' && npm run test:native-original-continuity-source');
    if(mode==='command')changed.scripts[key]+=' --unexpected';
    if(mode==='unknown-command')changed.scripts['unreviewed-source-command']='node scripts/unreviewed.mjs';
    assert.throws(()=>verifySourceProducerPackage(changed));
    assert.throws(()=>verifyPackage(changed));
  }
  assert.deepEqual(await fs.readFile(new URL('../package.json',import.meta.url)),sourceBytes,
    'Genuine historical DATA views never rewrite actual SOURCE package bytes');
});
