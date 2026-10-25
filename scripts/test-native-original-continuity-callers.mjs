// Narrow normal caller/source/refusal targets. Not a positive B/S origin,
// installed SQL, national capacity or production claim. No fabricated tuple.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import test from 'node:test';
import {NATIVE_ORIGINAL_CONTINUITY_BINDING as BINDING,NATIVE_ORIGINAL_CONTINUITY_OUTPUT as OUTPUT,
  NATIVE_ORIGINAL_CONTINUITY_BEFORE as OLD,requireNativeOriginalContinuityBinding,
  requireNativeOriginalContinuityOutput,nativeOriginalContinuityMigration,
  readNativeOriginalContinuityCanonicalSource} from './lib/native-original-continuity-successor-source.mjs';
import {assertNativeOriginalContinuityCodeOnlyCaller,selectNativeOriginalContinuityCodeOnlySource}
  from './select-native-original-continuity-code-only-source.mjs';
import {assertNativeOriginalContinuityPlanCaller,selectNativeOriginalContinuityRoute,
  verifyNativeOriginalContinuityPlan} from './verify-native-original-continuity-plan.mjs';
import {verifyNativeOriginalContinuityPrewritePreservation}
  from './native-original-continuity-prewrite.mjs';
import {prepareNativeOriginalContinuityRuntimeTransition,restoreAndPrepareNativeOriginalContinuityRuntimeTransition,
  assertNativeOriginalContinuityRuntimeTransitionPrepared} from './native-original-continuity-runtime-transition.mjs';
import {assertAuthenticatedFrozen585Snapshot} from './lib/authenticated-frozen585-predecessor.mjs';
import {buildEstablishedNativeCurrent585MetadataAttestation,
  assertEstablishedNativeCurrent585MetadataCheckpoint} from './lib/established-native-current-origin.mjs';
import {nativeOriginalContinuityRequiredMigrations} from './integrated-cutover-readiness.mjs';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import {reconcileNativeOriginalContinuityPrivateRuntimeCheckpoint,
  requiresPrivateRuntimeCheckpointReconcile} from './reconcile-private-runtime-checkpoint.mjs';
import {runNativeCheckpointSqlComparison,nativePostgresFailureDiagnostic}
  from './lib/checkpoint-cas-native-postgres.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const issued=BINDING!==null;
if(issued){requireNativeOriginalContinuityBinding();requireNativeOriginalContinuityOutput();}
else assert.equal(OUTPUT,null,'Partial source issuance is never a valid test state');
const caller=(installed=false)=>({
  GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40),
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN:installed?'false':'true',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_PHASE:installed?'installed':'before',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_RUN_ID:'',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_SAVED_WEATHER:'false',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_WRITER_ACTIVE:'false',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_GATE_RESULT:'success',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_ORIGINALS_VERIFIED:'true',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_NOLOSS_VERIFIED:'true',
  RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_PREWRITE_VERIFIED:'true',
});
const mixed=['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
  'RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN','RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN',
  'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN',
  'RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN','RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN',
  'RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN','RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN',
  'RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN','RESTART_ARCHIVED_WEATHER',
  'PUBLISH_NEWEST_SAVED_WEATHER','COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION',
  'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP','RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY'];

test('native continuity fixed before/installed caller pairs preserve their input',()=>{
  for(const installed of [false,true]){
    const env=Object.freeze(caller(installed));assert.doesNotThrow(()=>assertNativeOriginalContinuityCodeOnlyCaller(env));
    assert.deepEqual(env,caller(installed));
    for(const [key,value] of Object.entries({GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/other',
      GITHUB_RUN_ATTEMPT:'2',GITHUB_RUN_ID:'0',GITHUB_SHA:'A'.repeat(40),GITHUB_WORKFLOW:'Build',
      RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN:'TRUE',
      RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_PHASE:installed?'before':'installed',
      RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_CONFIRMATION:'DEPLOY-SAVED-WEATHER-REPAIR',
      RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_RUN_ID:'999',
      RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_SAVED_WEATHER:'true',
      RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_WRITER_ACTIVE:'true',
      RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_GATE_RESULT:'skipped'})){
      assert.throws(()=>assertNativeOriginalContinuityCodeOnlyCaller({...env,[key]:value}),key);
      const missing={...env};delete missing[key];assert.throws(()=>assertNativeOriginalContinuityCodeOnlyCaller(missing),'missing '+key);
    }
    for(const key of mixed)assert.throws(()=>assertNativeOriginalContinuityCodeOnlyCaller({...env,[key]:'true'}),key);
  }
  assert.throws(()=>assertNativeOriginalContinuityCodeOnlyCaller(caller(),{}));
});

test(issued?'native continuity actual issued selector rejects invalid callers before files or network'
  :'native continuity UNISSUED cannot access operands or start PostgreSQL',async t=>{
  let operands=0,io=0;
  const poison=new Proxy({},{get(){operands++;throw new Error('UNEXPECTED_OPERAND');},
    ownKeys(){operands++;throw new Error('UNEXPECTED_OPERAND');},
    getPrototypeOf(){operands++;throw new Error('UNEXPECTED_OPERAND');}});
  for(const name of ['readFile','appendFile','writeFile','mkdir','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    if(issued){
      for(const installed of [false,true]){
        await assert.rejects(selectNativeOriginalContinuityCodeOnlySource({...caller(installed),GITHUB_EVENT_NAME:'push'}),{code:'ERR_ASSERTION'});
        await assert.rejects(verifyNativeOriginalContinuityPlan({}),{code:'ERR_ASSERTION'});
      }
    }else{
      for(const call of [
        ()=>prepareNativeOriginalContinuityRuntimeTransition(poison),
        ()=>restoreAndPrepareNativeOriginalContinuityRuntimeTransition(poison),
        ()=>verifyNativeOriginalContinuityPrewritePreservation(poison),
        ()=>verifyNativeOriginalContinuityPlan(poison),
        ()=>reconcileNativeOriginalContinuityPrivateRuntimeCheckpoint(poison),
        ()=>runNativeCheckpointSqlComparison({includeStatisticsRevision:true,includeNativeIdentity:true,
          includeCurrentMemoryWarmup:true,includeEstablishedNativeCurrentOrigin:true,
          includeLastMileEnclosure:true,includeAccountStatisticsAssistant:true,includeNativeOriginalContinuity:true}),
      ])await assert.rejects(call,/NATIVE_ORIGINAL_CONTINUITY_UNISSUED/);
      assert.throws(()=>assertNativeOriginalContinuityPlanCaller(poison),/NATIVE_ORIGINAL_CONTINUITY_UNISSUED/);
      assert.throws(()=>selectNativeOriginalContinuityRoute(poison),/NATIVE_ORIGINAL_CONTINUITY_UNISSUED/);
      const accesses=[];
      const neutral=new Proxy({},{get(_target,key){accesses.push(key);
        assert.equal(key,'RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN');return 'false';}});
      assert.equal(await selectNativeOriginalContinuityCodeOnlySource(neutral),false);
      assert.deepEqual(accesses,['RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN']);
      await assert.rejects(selectNativeOriginalContinuityCodeOnlySource(caller()),/NATIVE_ORIGINAL_CONTINUITY_UNISSUED/);
    }
    assert.equal(operands,0);assert.equal(io,0);
  }finally{t.mock.restoreAll();}
});

test('serialized parent, registry or prepared PASS never creates a genuine585 handle',async()=>{
  for(const forged of [{},{status:'PASS'},Object.freeze({kind:'PRIVATE_ORIGINAL_BOUND_SAME_H0_METADATA',
    parent:{bundleContentSha256:'a'.repeat(64)},registrySha256:'b'.repeat(64)})]){
    assert.throws(()=>assertAuthenticatedFrozen585Snapshot(forged),/FROZEN585_PREDECESSOR_HANDLE/);
    await assert.rejects(buildEstablishedNativeCurrent585MetadataAttestation(forged,
      {centralContract:null,conditions:null}),/FROZEN585_PREDECESSOR_HANDLE/);
    await assert.rejects(assertNativeOriginalContinuityRuntimeTransitionPrepared(forged),
      /Only this actual normal preparation, never a serialized receipt/);
  }
  await assert.rejects(assertEstablishedNativeCurrent585MetadataCheckpoint({status:'PASS'}),/ARGUMENTS/);
});

test('actual genuine585 model imports remain whole-byte bound, not an exclusion',async()=>{
  for(const file of ['scripts/check-native-original-continuity-predecessor-source.mjs',
    'scripts/lib/authenticated-frozen585-predecessor.mjs','scripts/lib/established-native-current-origin.mjs']){
    const source=(await fs.readFile(path.join(ROOT,file),'utf8')).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    const imports=modelSourceRelativeModuleSpecifiers(source,file);assert(Object.isFrozen(imports));
    for(const changed of [source+'\n',source+"\nimport './unreviewed.mjs';\n"])
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/);
  }
  assert.deepEqual(nativePostgresFailureDiagnostic('NATIVE_ORIGINAL_CONTINUITY','ERROR: 40001\n'),
    {phase:'NATIVE_ORIGINAL_CONTINUITY',sqlState:'40001',category:'SQL_CAS_CONFLICT'});
});

// Positive issued-only tests must use the real derived/committed source.
// A pre-issuance run reports the issued target as SKIP, never as qualified.
test('actual issued native continuity source and sole pending/installed plans',{skip:!issued},async()=>{
  const verify=async({ravScoreModelBinding,candidateBinding,privateRuntimeContractHashes})=>{
  const next=requireNativeOriginalContinuityBinding(),descriptor=nativeOriginalContinuityMigration();
  const required=nativeOriginalContinuityRequiredMigrations();
  assert.equal(required.length,55);assert.equal(required.at(-2).version,OLD.version);
  assert.equal(required.at(-1).version,next.version);
  assert.equal(ravScoreModelBinding().modelBundleSha256,next.I);
  assert.equal(candidateBinding().modelBundleSha256,next.C);
  assert.equal((await privateRuntimeContractHashes()).continuationStateContractSha256,next.T);
  const canonical=await readNativeOriginalContinuityCanonicalSource();
  assert.equal(canonical.admission,'NO_ADMISSION');assert.equal(canonical.migration.version,next.version);
  const list=installed=>'Local | Remote | Time (UTC)\n'+required.map(row=>
    row.version+' | '+(installed||row.version!==next.version?row.version:'')+' | synthetic-plan-response').join('\n');
  const dry='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '
    +descriptor.filename+'\nFinished supabase db push.';
  const noop='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.';
  const plan=installed=>({phase:installed?'installed':'before',migrationListText:list(installed),
    dryRunText:installed?noop:dry,migrationsDirectory:path.join(ROOT,'supabase/migrations'),environment:caller(installed)});
  for(const installed of [false,true]){
    assert.equal(selectNativeOriginalContinuityRoute({migrationListText:list(installed),environment:caller(installed)}),installed?'installed':'before');
    assert.deepEqual((await verifyNativeOriginalContinuityPlan(plan(installed))).pendingVersions,installed?[]:[next.version]);
    assert.throws(()=>selectNativeOriginalContinuityRoute({migrationListText:list(installed),environment:caller(!installed)}),
      /NATIVE_ORIGINAL_CONTINUITY_NO_CONSUMED_GRANT_REPLAY/);
  }
  for(const key of ['ORIGINALS_VERIFIED','NOLOSS_VERIFIED','PREWRITE_VERIFIED'])
    await assert.rejects(verifyNativeOriginalContinuityPlan({...plan(false),environment:{
      ...caller(),['RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_'+key]:'false'}}),/Exact fresh B\/S/);
  await assert.rejects(verifyNativeOriginalContinuityPlan({...plan(false),dryRunText:noop}));
  await assert.rejects(verifyNativeOriginalContinuityPlan({...plan(true),dryRunText:dry}));
  for(const changed of [
    list(false)+'\n20990101000000 | 20990101000000 | unknown',
    list(false).replace(OLD.version+' | '+OLD.version,OLD.version+' | '),
    list(false)+'\n'+next.version+' | | duplicate',
  ])assert.throws(()=>selectNativeOriginalContinuityRoute({migrationListText:changed,environment:caller()}));
  for(const family of [OLD,next])assert.equal(requiresPrivateRuntimeCheckpointReconcile({
    modelBinding:{modelBundleSha256:family.I},contractHashes:{continuationStateContractSha256:family.T}}),true);
  for(const [I,T]of [[next.I,OLD.T],[OLD.I,next.T],['f'.repeat(64),next.T]])
    assert.equal(requiresPrivateRuntimeCheckpointReconcile({modelBinding:{modelBundleSha256:I},
      contractHashes:{continuationStateContractSha256:T}}),false);
  };
  if(ASSISTANT_LATER_H0_BINDING!==null)return withFrozen586CheckpointPostgresSource(async({factory,repositoryRoot})=>verify({
    ravScoreModelBinding:factory.ravScoreModelBinding,candidateBinding:factory.candidateGRollbackModelBinding,
    privateRuntimeContractHashes:()=>factory.privateRuntimeContractHashes({repositoryRoot})}));
  return verify({ravScoreModelBinding,candidateBinding,privateRuntimeContractHashes});
});

// Additive later-H0 constructor/data seams; these are NOT genuine B/S/SQL evidence.
import {ASSISTANT_LATER_H0_BINDING,ASSISTANT_LATER_H0_OUTPUT,ASSISTANT_LATER_H0_BEFORE,
  assertAssistantLaterH0Target,requireAssistantLaterH0Output}
  from './lib/assistant-later-h0-successor-source.mjs';
import {assertAuthenticatedFrozen586Snapshot} from './lib/authenticated-frozen586-predecessor.mjs';
import {prepareAssistantLaterH0Runtime,installAssistantLaterH0Runtime,readAssistantLaterH0RetentionInput}
  from './assistant-later-h0-runtime-transition.mjs';
import {migrateExactModelBindingMetadata} from './migrate-post-cutover-private-runtime.mjs';
test('assistant later-H0 pure constructor refuses same/earlier/foreign input without changing it',()=>{
  const descriptor={modelBinding:{modelBundleSha256:ASSISTANT_LATER_H0_BEFORE.I},
    contractHashes:{continuationStateContractSha256:ASSISTANT_LATER_H0_BEFORE.T},
    productionReferenceAt:'2026-10-21T20:00:00.000Z'},before=structuredClone(descriptor);
  assert.equal(assertAssistantLaterH0Target(descriptor,'2026-10-21T21:00:00.000Z'),true);
  for(const time of ['2026-10-21T20:00:00.000Z','2026-10-21T19:00:00.000Z','invalid'])
    assert.throws(()=>assertAssistantLaterH0Target(descriptor,time));
  assert.throws(()=>assertAssistantLaterH0Target({...descriptor,modelBinding:{modelBundleSha256:'0'.repeat(64)}},'2026-10-21T21:00:00.000Z'));
  assert.deepEqual(descriptor,before);
});
test('assistant later-H0 normal metadata-carrier seam preserves the whole nested parent',()=>{
  const old=ravScoreModelBinding(),synthetic={...old,modelBundleSha256:'f'.repeat(64)};
  assert.notEqual(old.modelBundleSha256,synthetic.modelBundleSha256);
  const parent={kind:'SYNTHETIC_DATA_ONLY_NOT_AUTHORITY',producer:{integrated:old.modelBundleSha256},
    predecessor:{whole:{extra:['unknown',null,{original:true}]}}};
  const source={coastalParts:{modelBinding:old},privateEstablishedNativeCurrentOrigin:parent,unknown:[1,null,'unchanged']};
  const after=structuredClone(source),changed=migrateExactModelBindingMetadata(after,old,synthetic);
  assert.deepEqual(changed,['coastalParts.modelBinding.modelBundleSha256']);
  assert.deepEqual(after.privateEstablishedNativeCurrentOrigin,parent);
  after.coastalParts.modelBinding.modelBundleSha256=old.modelBundleSha256;
  assert.deepEqual(after,source,'Whole inverse, not selected field equality');
});
test('assistant later-H0 UNISSUED refuses before I/O; serialized parent/PASS cannot mint snapshot',async t=>{
  for(const data of [{},{prepared:true,admission:'NO_ADMISSION'},Object.freeze({status:'PASS',parent:{}})])
    assert.throws(()=>assertAuthenticatedFrozen586Snapshot(data),/FROZEN586_PREDECESSOR_HANDLE/);
  if(ASSISTANT_LATER_H0_BINDING!==null){requireAssistantLaterH0Output();assert.notEqual(ASSISTANT_LATER_H0_OUTPUT,null);return;}
  assert.equal(ASSISTANT_LATER_H0_OUTPUT,null);
  let io=0;
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    assert.throws(()=>requireAssistantLaterH0Output(),/ASSISTANT_LATER_H0_UNISSUED/);
    await assert.rejects(prepareAssistantLaterH0Runtime(),/ASSISTANT_LATER_H0_UNISSUED/);
    await assert.rejects(installAssistantLaterH0Runtime(),/ASSISTANT_LATER_H0_UNISSUED/);
    await assert.rejects(readAssistantLaterH0RetentionInput('2026-10-21T21:00:00.000Z'),/ASSISTANT_LATER_H0_UNISSUED/);
    assert.equal(io,0);
  }finally{t.mock.restoreAll();}
});

// Source-only additions; not PostgreSQL execution or positive B/S evidence.
import {withFrozen586CheckpointPostgresSource} from './run-frozen586-assistant-later-h0-postgres-source.mjs';
import {compareAssistantLaterH0Successor,assertAssistantLaterH0TransactionBounds}
  from './lib/assistant-later-h0-postgres.mjs';
test('assistant later-H0 native entrypoints refuse UNISSUED before operands, I/O or callback',async t=>{
  if(ASSISTANT_LATER_H0_BINDING!==null){requireAssistantLaterH0Output();assert.notEqual(ASSISTANT_LATER_H0_OUTPUT,null);return;}
  assert.equal(ASSISTANT_LATER_H0_OUTPUT,null);
  let operands=0,io=0,callbacks=0;
  const poison=new Proxy({},{get(){operands++;throw new Error('UNEXPECTED_OPERAND');},
    ownKeys(){operands++;throw new Error('UNEXPECTED_OPERAND');},
    getPrototypeOf(){operands++;throw new Error('UNEXPECTED_OPERAND');}});
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    await assert.rejects(compareAssistantLaterH0Successor(poison),/ASSISTANT_LATER_H0_UNISSUED/);
    await assert.rejects(withFrozen586CheckpointPostgresSource(()=>{callbacks++;throw new Error('UNEXPECTED_CALLBACK');}),/ASSISTANT_LATER_H0_UNISSUED/);
    assert.equal(operands,0);assert.equal(io,0);assert.equal(callbacks,0);
  }finally{t.mock.restoreAll();}
});
test('assistant later-H0 native transaction-bound source guard retains normal55s/5s',()=>{
  const sql="begin;\n\nset local statement_timeout = '55s';\n\nset local lock_timeout = '5s';\n";
  assert.doesNotThrow(()=>assertAssistantLaterH0TransactionBounds(sql));
  for(const changed of [sql.replace("'55s'","'54s'"),sql.replace("'5s'","'6s'"),sql.replace('set local','set')])
    assert.throws(()=>assertAssistantLaterH0TransactionBounds(changed));
  for(const value of [null,{},55])assert.throws(()=>assertAssistantLaterH0TransactionBounds(value));
});

test('assistant later-H0 normal PG routing retains strict prerequisites before host creation',async t=>{
  let io=0;
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    await assert.rejects(runNativeCheckpointSqlComparison({includeAssistantLaterH0:true}),
      /Assistant later-H0 requires the genuine complete586 native phase/);
    await assert.rejects(runNativeCheckpointSqlComparison({includeAssistantLaterH0:'true',includeNativeOriginalContinuity:true}),{code:'ERR_ASSERTION'});
    if(ASSISTANT_LATER_H0_BINDING===null)await assert.rejects(runNativeCheckpointSqlComparison({
      includeStatisticsRevision:true,includeNativeIdentity:true,includeCurrentMemoryWarmup:true,
      includeEstablishedNativeCurrentOrigin:true,includeLastMileEnclosure:true,includeAccountStatisticsAssistant:true,
      includeNativeOriginalContinuity:true,includeAssistantLaterH0:true}),/ASSISTANT_LATER_H0_UNISSUED/);
    assert.equal(io,0);
    assert.deepEqual(nativePostgresFailureDiagnostic('ASSISTANT_LATER_H0','ERROR: 40001\n'),
      {phase:'ASSISTANT_LATER_H0',sqlState:'40001',category:'SQL_CAS_CONFLICT'});
  }finally{t.mock.restoreAll();}
});


// One missing normal COPY/METADATA/CODEC caller-composition case. Synthetic
// schema-valid current, NOT authenticated B/S, issued NEXT or origin authority.
test('assistant later-H0 schema2 caller preserves121 original-bank rows through normal metadata copy and follower',async t=>{
  const crypto=await import('node:crypto'),os=await import('node:os');
  const {copyPrivateRuntimeInventory,assertExactRuntimeInventory,atomicWriteJson}
    =await import('./migrate-post-cutover-private-runtime.mjs');
  const {PRIVATE_RUNTIME_BASE_FILES}=await import('./lib/private-weather-component-inventory.mjs');
  const {packDmiPartContinuity,unpackDmiPartContinuity}=await import('./lib/dmi-part-continuity.mjs');
  const {writeDmiForecastFileAtomic,inspectDmiForecastFile,readDmiForecastRecord}
    =await import('./lib/dmi-forecast-file.mjs');
  const {buildDmiForecastHourly,DMI_FORECAST_HOURS}=await import('./lib/dmi-forecast-store.mjs');
  const {dmiExpectedIdentityForPart}=await import('./lib/ravscore-production-adapters.mjs');
  const {buildProtectedDmiNativeCurrentProofs,createProtectedDmiNativeCurrentInspector}
    =await import('./lib/protected-dmi-native-current-proofs.mjs');
  const {buildPartDmiForecastWithProtectedRetention}=await import('./lib/private-dmi-recovery-record.mjs');
  const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
  const at=n=>new Date(Date.parse('2026-10-21T00:00:00.000Z')+n*3_600_000).toISOString();
  const part={partId:'SYNTHETIC-ASSISTANT-SCHEMA2',zoneId:'DK-B01-01',waterPoint:[8,55]};
  const identity=dmiExpectedIdentityForPart(part);
  const selection='nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
  // The same ordinary constructors as the existing normal continuity target;
  // these values/receipts are synthetic INPUTS, never measured GRIB assertions.
  const native=Array.from({length:41},(_,i)=>{
    const n=i*3,source={provider:'dmi',fallback:false,collection:'dkss_nsbs',collectionFamily:'marine',
      component:'current',componentKind:'ocean-current-vector',fieldSet:['current-u','current-v'],optionalFieldSet:[],
      ...identity,modelRun:at(-12),nativeValidTime:at(n),leadTimeHours:12+n,gridPoint:[8,55],
      gridDefinitionSha256:'b'.repeat(64),distanceKm:0,spatialSemanticsVersion:1,
      spatialSelection:'nearest-shared-grid-cell-no-spatial-interpolation',vectorSemanticsVersion:3,
      vectorSelection:selection,verticalLayer:'depth:1',verticalLayerRankM:1,
      itemId:'synthetic-assistant-schema2-'+n,assetIdentitySha256:sha('synthetic-asset-'+n),
      assetSizeBytes:1234,contentLengthBytes:1234,contentSha256:sha('synthetic-content-'+n),
      acquiredAt:at(-1),itemCreatedAt:at(-12),itemUpdatedAt:at(-11)};
    source.nativeGridSampling={contractId:'dmi-native-grid-sampling-v1',elementIndex:71,
      gridIndexIdentitySha256:sha('synthetic-assistant-grid-index'),
      coordinateInterpretation:'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256:source.gridDefinitionSha256,gridPoint:[...source.gridPoint],
      fieldSet:[...source.fieldSet],optionalFieldSet:[]};
    return{time:at(n),'current-u':n/100,'current-v':0.2,sources:{current:source}};
  });
  const bulk={generatedAt:at(0),currentVectorSemanticsVersion:3,currentVectorSelection:selection,
    currentMaxDistanceKm:5,timeStrideHours:3,zones:{[identity.entityId]:{...identity,
      hourly:Object.fromEntries(native.map(row=>[row.time,row]))}}};
  const rows=buildDmiForecastHourly({generatedAt:at(0),startAt:at(0),hours:DMI_FORECAST_HOURS,
    ocean:native.map(row=>({step:row.time,'current-u':row['current-u'],'current-v':row['current-v'],provenance:row.sources}))}).hourly;
  assert.equal(rows.length,121);assert.equal(rows[0].time,at(0));assert.equal(rows[120].time,at(120));
  const bank=buildProtectedDmiNativeCurrentProofs({selections:rows.map(row=>({part,row})),contexts:[bulk]});
  assert.equal(bank.selections.length,121);
  const originalNative=JSON.stringify({part,rows,bank,bulk});
  const packed=await packDmiPartContinuity(new Map([[part.partId,{zoneId:identity.entityId,point:part.waterPoint,hourly:rows}]]),
    [part],at(0),{nativeCurrentProofsByPart:new Map([[part.partId,bank]])});
  assert.equal(packed.schemaVersion,2);

  const temporaryParent=await fs.realpath(os.tmpdir());
  const root=await fs.mkdtemp(path.join(temporaryParent,'rr-assistant-schema2-copy-'));
  const rootIdentity=await fs.lstat(root,{bigint:true});let complete=false;
  t.after(async()=>{
    assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),temporaryParent);
    assert(path.basename(root).startsWith('rr-assistant-schema2-copy-'));
    const current=await fs.lstat(root,{bigint:true});
    assert.equal(current.dev,rootIdentity.dev);assert.equal(current.ino,rootIdentity.ino);
    if(complete)await fs.rm(root,{recursive:true}); // Only this validated owned fixture.
  });
  const source=path.join(root,'original'),working=path.join(root,'working');
  await fs.mkdir(source);await fs.mkdir(working);
  // Current binding + a deliberately synthetic DATA-only replacement exercises
  // the exact normal carrier allowlist, NOT genuine586->NEXT source issuance.
  const beforeBinding=ravScoreModelBinding(),dataOnlyAfter={...beforeBinding,modelBundleSha256:'f'.repeat(64)};
  assert.notEqual(beforeBinding.modelBundleSha256,dataOnlyAfter.modelBundleSha256);
  const parent={kind:'SYNTHETIC_DATA_ONLY_NOT_AUTHORITY',unknown:{whole:['keep',null,{original:true}]}};
  const conditions={productionReferenceAt:at(0),generatedAt:at(0),coastalParts:{modelBinding:beforeBinding},
    privateEstablishedNativeCurrentOrigin:parent,unknown:[1,null,'unchanged']};
  for(const descriptor of PRIVATE_RUNTIME_BASE_FILES){
    const file=path.join(source,descriptor.relativePath);await fs.mkdir(path.dirname(file),{recursive:true});
    if(descriptor.id==='dmi-forecast-cache')await writeDmiForecastFileAtomic(file,{schemaVersion:2,zones:{},partContinuity:packed});
    else await fs.writeFile(file,JSON.stringify(descriptor.id==='full-conditions'?conditions:{syntheticOnly:descriptor.id})+'\n',{flag:'wx'});
  }
  const originalBytes=new Map(),sealed=new Map();
  for(const descriptor of PRIVATE_RUNTIME_BASE_FILES){
    const bytes=await fs.readFile(path.join(source,descriptor.relativePath));
    originalBytes.set(descriptor.relativePath,bytes);
    sealed.set(descriptor.id,{...descriptor,bytes:bytes.length,sha256:sha(bytes)});
  }
  const migrated=structuredClone(conditions);
  assert.deepEqual(migrateExactModelBindingMetadata(migrated,beforeBinding,dataOnlyAfter),
    ['coastalParts.modelBinding.modelBundleSha256']);
  assert.deepEqual(migrated.privateEstablishedNativeCurrentOrigin,parent);
  // These are the same exported normal copy and writer called by metadataOnly
  // migration; no copied implementation or forged migration/PASS report.
  await copyPrivateRuntimeInventory(source,working,PRIVATE_RUNTIME_BASE_FILES,{expectedFileDigests:sealed});
  for(const[relative,bytes]of originalBytes)assert.deepEqual(await fs.readFile(path.join(working,relative)),bytes);
  await atomicWriteJson(path.join(working,'data/live/conditions.json'),migrated);
  const readConditions=JSON.parse(await fs.readFile(path.join(working,'data/live/conditions.json'),'utf8'));
  assert.deepEqual(readConditions.privateEstablishedNativeCurrentOrigin,parent);
  readConditions.coastalParts.modelBinding.modelBundleSha256=beforeBinding.modelBundleSha256;
  assert.deepEqual(readConditions,conditions,'Whole parent/unknown-field inverse, not selected-field omission');
  assert.deepEqual(await assertExactRuntimeInventory(working),PRIVATE_RUNTIME_BASE_FILES);
  for(const[relative,bytes]of originalBytes){
    assert.deepEqual(await fs.readFile(path.join(source,relative)),bytes,'Original inventory stays byteexact');
    if(relative!=='data/live/conditions.json')assert.deepEqual(await fs.readFile(path.join(working,relative)),bytes);
  }

  const index=await inspectDmiForecastFile(path.join(working,'data/live/dmi-forecast-cache.json'));
  assert.equal(index.continuity.metadata.schemaVersion,2);
  assert.equal(index.continuity.metadata.productionReferenceAt,at(0));
  const entry=await readDmiForecastRecord(index,index.continuity.entries[0]);
  const record=(await unpackDmiPartContinuity({...index.continuity.metadata,entries:[entry]},[part],at(7))).get(part.partId);
  assert.deepEqual(record.hourly,rows);assert.deepEqual(record.nativeCurrentOriginals.bank,bank);
  assert.equal(record.nativeCurrentOriginals.coverage.length,121);
  assert(record.nativeCurrentOriginals.coverage.every(row=>row.status==='DMI_ORIGINAL_PROVED'));
  const originalInspector=createProtectedDmiNativeCurrentInspector({contexts:[],previousBank:record.nativeCurrentOriginals.bank});
  for(const row of record.hourly)assert.equal(originalInspector.inspect({part,row}).ok,true);
  const empty={...bulk,zones:{}};
  const follower=buildPartDmiForecastWithProtectedRetention({properties:{id:identity.entityId,dataPoint:part.waterPoint}},
    empty,empty,at(7),{startAt:at(0),expectedIdentity:identity,persistedHourly:record.hourly,
      nativeCurrentOriginals:record.nativeCurrentOriginals,protectedCompanionContexts:[]});
  assert(follower);assert.equal(follower.hourly.length,121);
  for(let i=0;i<121;i++){
    assert.equal(follower.hourly[i].time,rows[i].time);
    assert.deepEqual([follower.hourly[i].currentUMps,follower.hourly[i].currentVMps],[rows[i].currentUMps,rows[i].currentVMps]);
    assert.equal(follower.hourly[i].sources.current.modelRun,rows[i].sources.current.modelRun);
    assert.deepEqual(follower.hourly[i].sources.current.nativeSteps,rows[i].sources.current.nativeSteps);
  }
  const followerBank=buildProtectedDmiNativeCurrentProofs({contexts:[],previousBank:bank,
    selections:follower.hourly.map(row=>({part,row}))});
  assert.equal(followerBank.selections.length,121);
  const followerInspector=createProtectedDmiNativeCurrentInspector({contexts:[],previousBank:followerBank});
  for(const row of follower.hourly.slice(1,7))assert.equal(followerInspector.inspect({part,row}).ok,true);
  assert.equal(JSON.stringify({part,rows,bank,bulk}),originalNative);
  const wrong=new Map(sealed),forecastDescriptor=sealed.get('dmi-forecast-cache');
  wrong.set('dmi-forecast-cache',{...forecastDescriptor,sha256:'0'.repeat(64)});
  const refused=path.join(root,'refused');await fs.mkdir(refused);
  await assert.rejects(copyPrivateRuntimeInventory(source,refused,PRIVATE_RUNTIME_BASE_FILES,{expectedFileDigests:wrong}),
    /sealed original (input|copy)/);
  for(const[relative,bytes]of originalBytes)assert.deepEqual(await fs.readFile(path.join(source,relative)),bytes);
  complete=true;
});


// Additive fixed binding-prewrite contract; not live B/S, bank capacity or SQL.
import {assertAssistantBindingPrewriteCaller} from './assistant-later-h0-binding-prewrite.mjs';
import {assertAuthenticatedFrozen586SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';
const bindingPrewriteCaller=()=>({GITHUB_WORKFLOW:'Apply RavRadar backend bindings without weather',
  GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'a'.repeat(40),
  GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN:'true',
  RAVRADAR_ASSISTANT_LATER_H0_BINDING_CONFIRMATION:'APPLY-WEATHER-MODEL-BINDING'});
function withBindingPrewriteEnv(changes,callback){
  const previous={...process.env};
  try{
    for(const key of Object.keys(process.env))if(key.startsWith('RAVRADAR_')||key.startsWith('GITHUB_')
      ||['RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER','CHECKPOINT_ONLY','QUICK_CONFIRMATION'].includes(key))delete process.env[key];
    Object.assign(process.env,bindingPrewriteCaller(),changes);return callback();
  }finally{for(const key of Object.keys(process.env))if(!Object.hasOwn(previous,key))delete process.env[key];Object.assign(process.env,previous);}
}
test('assistant binding original prewrite rejects JSON/PASS handles before I/O',async t=>{
  let io=0;
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    for(const data of [{},{status:'PASS',checkpointVersion:1},Object.freeze({prepared:true})])
      await assert.rejects(assertAuthenticatedFrozen586SnapshotFresh(data),/FROZEN586_PREDECESSOR_HANDLE/);
    if(ASSISTANT_LATER_H0_BINDING===null){
      assert.equal(ASSISTANT_LATER_H0_OUTPUT,null);
      withBindingPrewriteEnv({},()=>assert.throws(()=>assertAssistantBindingPrewriteCaller(),/ASSISTANT_LATER_H0_UNISSUED/));
    }
    assert.equal(io,0);
  }finally{t.mock.restoreAll();}
});
test('assistant binding original prewrite caller rejects old flags, replay and wrong normal route',()=>{
  for(const [key,value]of Object.entries({GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',GITHUB_EVENT_NAME:'push',
    GITHUB_REF:'refs/heads/other',GITHUB_SHA:'A'.repeat(40),GITHUB_RUN_ID:'0',GITHUB_RUN_ATTEMPT:'2',
    RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN:'false',RAVRADAR_ASSISTANT_LATER_H0_BINDING_CONFIRMATION:'CHECK-CURRENT-GRID-ORIGINALS',
    RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN:'true',RAVRADAR_CURRENT_GRID_DIAGNOSE_ONLY:'true',
    RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN:'true',RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN:'true',
    RAVRADAR_ASSISTANT_BINDING_PREWRITE_VERIFIED:'true',RAVRADAR_ASSISTANT_BINDING_PREWRITE_REQUIRED:'true',
    RESTART_ARCHIVED_WEATHER:'true',PUBLISH_NEWEST_SAVED_WEATHER:'true',CHECKPOINT_ONLY:'true',QUICK_CONFIRMATION:'true'})){
    withBindingPrewriteEnv({[key]:value},()=>assert.throws(()=>assertAssistantBindingPrewriteCaller(),error=>
      error instanceof assert.AssertionError&&!/ASSISTANT_LATER_H0_(?:SQL_)?UNISSUED/.test(error.message),key));
  }
  assert.throws(()=>assertAssistantBindingPrewriteCaller({}));
});
test('assistant binding original prewrite keeps one bank pass and normal owned readers before fresh identity',async()=>{
  const source=await fs.readFile(path.join(ROOT,'scripts/assistant-later-h0-binding-prewrite.mjs'),'utf8');
  const prepare=source.slice(source.indexOf('async function prepare(p){'),source.indexOf('async function plan(){'));
  const plan=source.slice(source.indexOf('async function plan(){'),source.indexOf('async function boundedJsonText'));
  const verify=source.slice(source.indexOf('async function verify(p){'),source.indexOf('async function main(){'));
  assert(!prepare.includes('await bank('));assert(!plan.includes('readAuthenticatedFrozen586Predecessor'));
  for(const normal of ['identity=ownFileDescriptorIdentity(fd)','await ownedFileDescriptorClosed(fd,identity)',
    'current.dev===parent.dev&&current.ino===parent.ino','await handle.read(buffer','await handle.stat({bigint:true})',
    'failedCloses.set(absolute,handle)','await ownedRead(file,maximum,true)'])assert(source.includes(normal),normal);
  assert(!source.includes('createReadStream'));assert(!source.includes('await fs.readFile(file)'));
  assert.equal((source.match(/await bank\(p,snapshot\)/g)||[]).length,1);
  assert(verify.indexOf('await bank(p,snapshot)')<verify.indexOf('await source(true)'));
  assert(verify.indexOf('await source(true)')<verify.indexOf('await assertAuthenticatedFrozen586SnapshotFresh(handle)'));
  for(const normal of ['inspectDmiForecastFile(file)','readDmiForecastRecord(index,entryDescriptor)',
    'unpackDmiPartContinuity(',"createProtectedDmiNativeCurrentInspector({contexts:[],previousBank:original})",
    'saved121DirectSelection(row)','inspector.inspect({part,row}).ok','assertRestoredOriginalInventory(p.originals',
    "await fs.mkdir(root,{mode:0o700})","flag:'wx'",'same(previous,baseline(snapshot,await centralProof()))'])assert(source.includes(normal),normal);
  for(const forbidden of ['projectOriginal','SAME_H0_MODEL_METADATA','supabase db push','project-original','installAssistantLaterH0Runtime'])
    assert(!source.includes(forbidden),forbidden);
  const auth=await fs.readFile(path.join(ROOT,'scripts/lib/authenticated-frozen586-predecessor.mjs'),'utf8');
  assert(auth.includes('checkpointVersion=SRows[0].version'));assert(auth.includes('rows[0].version===checkpointVersion'));
  const fresh=auth.slice(auth.indexOf('refreshers.set(handle,async()=>{'),auth.indexOf('    return handle;'));
  assert(fresh.indexOf("'B_CONDITIONS_CHANGED'")<fresh.indexOf('await pointer()'));
  assert(fresh.indexOf('await pointer()')<fresh.indexOf('await versionRequest('));
  assert(!fresh.includes('restoreProtectedRavScoreContinuationCheckpoint'));assert(!fresh.includes('unpackDmiPartContinuity'));
});
test('assistant binding original prewrite workflow keeps locks, exact normal central seams and the sole SQL',async()=>{
  const workflow=await fs.readFile(path.join(ROOT,'.github/workflows/apply-weather-model-binding-only.yml'),'utf8');
  assert(workflow.includes('group: ravradar-weather-production-v2'));assert(workflow.includes('group: ravradar-trip-storage-production'));
  assert(workflow.includes('timeout-minutes: 30'));assert(workflow.includes('upgrade_assistant_later_h0_original:'));
  assert(workflow.includes('test "$RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN" != true'));
  assert(workflow.includes('test "$RAVRADAR_CURRENT_GRID_DIAGNOSE_ONLY" != true'));
  const prepare=workflow.indexOf('node scripts/assistant-later-h0-binding-prewrite.mjs prepare');
  const dry=workflow.indexOf('supabase db push --linked --dry-run --skip-vault');
  const plan=workflow.indexOf('node scripts/assistant-later-h0-binding-prewrite.mjs plan');
  const verify=workflow.indexOf('node scripts/assistant-later-h0-binding-prewrite.mjs verify');
  const sql=workflow.indexOf('          supabase db push --linked --skip-vault\n');
  assert(0<prepare&&prepare<dry&&dry<plan&&plan<verify&&verify<sql);
  assert.equal((workflow.match(/^          supabase db push --linked --skip-vault$/gm)||[]).length,1);
  assert.equal((workflow.match(/python scripts\/sync-admin-config.py/g)||[]).length,2);
  const apply=workflow.slice(workflow.indexOf('      - name: Apply only the dry-run-verified binding migration'),sql);
  assert(apply.indexOf('python scripts/sync-admin-config.py')<apply.indexOf('python scripts/apply-central-zone-reviews.py'));
  assert(apply.indexOf('python scripts/apply-central-zone-reviews.py')<apply.indexOf('node scripts/build-public-coastal-parts-v2.mjs'));
  assert(apply.indexOf('node scripts/build-public-coastal-parts-v2.mjs')<apply.indexOf('node scripts/assistant-later-h0-binding-prewrite.mjs verify'));
  assert(workflow.slice(verify,sql).trim().endsWith('cd "'+String.fromCharCode(36)+'{{ steps.migration-view.outputs.workdir }}"'));
  const generic=await fs.readFile(path.join(ROOT,'scripts/verify-code-only-migration-plan.mjs'));
  const {createHash}=await import('node:crypto');
  assert.equal(createHash('sha256').update(generic.toString('utf8').replace(/\r\n?/g,'\n')).digest('hex'),
    'f33e7f723ffe970bd6bbff5085ec65110d18953f5e7fb78b2609be2e5b57cc45');
  const readiness=await fs.readFile(path.join(ROOT,'scripts/integrated-cutover-readiness.mjs'),'utf8');
  assert(readiness.includes('...(ASSISTANT_LATER_H0_BINDING === null ? [] : [assistantLaterH0Migration()]),'));
  assert(readiness.includes("assert.ok(remote.has(assistantLaterH0Migration().version),'ASSISTANT_LATER_H0_PREWRITE_ROUTE_REQUIRED')"));
});
test('assistant binding original prewrite exact source-import variants reject changed bytes and preserve old variants',async()=>{
  for(const file of ['scripts/lib/authenticated-frozen586-predecessor.mjs','scripts/assistant-later-h0-binding-prewrite.mjs']){
    const source=await fs.readFile(path.join(ROOT,file),'utf8');
    const imports=modelSourceRelativeModuleSpecifiers(source,file);assert(imports.length>0);
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n// changed\n',file),/Whole reviewed model import source changed/);
  }
  const source=await fs.readFile(path.join(ROOT,'scripts/lib/model-source-imports.mjs'),'utf8');
  for(const preserved of ['d0ab8aa27c30aafdcc66ff120c748c05fbf4144c6aca71493a2c97710728137c',
    '900e9452cdf7cb4ed2ec73cebfd451510a1ae71dc55402fb06a66c4b256c1792',
    'b62351eb51f1871d970295957f6d4882f9a996db95ee8e7ff10b638306acc65a'])assert(source.includes(preserved));
});


// Additive observation-only cases through the actual prepare/CLI bodies.
// These injected failures do not claim live B/S, network, original admission or SQL.
test('assistant binding prewrite fixed diagnostics preserve prepare order and first error',async()=>{
  const {runInNewContext}=await import('node:vm');
  const source=await fs.readFile(path.join(ROOT,'scripts/assistant-later-h0-binding-prewrite.mjs'),'utf8');
  const diagnostic=source.slice(source.indexOf('const prewriteSites='),source.indexOf('async function source(fresh=false){'));
  const actualPrepare=source.slice(source.indexOf('async function prepare(p){'),source.indexOf('async function plan(){'));
  const loader="const load=file=>import(pathToFileURL(path.join(frozenRoot,file)).href);";
  assert.equal(actualPrepare.split(loader).length,2);
  const executablePrepare=actualPrepare.replace(loader,'const load=file=>fixtureLoad(file);');
  assert.equal(executablePrepare.replace('const load=file=>fixtureLoad(file);',loader),actualPrepare);
  const selected={modelBinding:{fixed:'binding'},contractHashes:{fixed:'contracts'},datasetId:'synthetic',
    productionReferenceAt:'2026-10-24T16:00:00.000Z',generatedAt:'2026-10-24T18:00:00.000Z',bundleContentSha256:'a'.repeat(64)};
  const expectedCalls=['FROZEN_SOURCE','MODULES','CLIENTS','CURRENT_B','B_FAMILY','B_RESTORE','B_UNPACK',
    'S_REQUESTER','S_RESTORE','SOURCE_CLEANUP','SNAPSHOT','SNAPSHOT_ACCESSOR','ORIGINAL_FILES','FRESH_SNAPSHOT','CENTRAL','BASELINE_WRITE'];
  for(const failure of [null,'FROZEN_SOURCE','MODULES','CLIENTS','CURRENT_B','B_FAMILY','B_RESTORE','B_UNPACK',
    'S_REQUESTER','S_RESTORE','SOURCE_CLEANUP','SNAPSHOT','SNAPSHOT_ACCESSOR','ORIGINAL_FILES','FRESH_SNAPSHOT','CENTRAL','BASELINE_WRITE']){
    const calls=[],lines=[],error=Object.assign(new Error('PRIVATE_OBSERVATION_CANARY'),{code:'ERR_ASSERTION'});
    let privateReads=0;
    for(const name of ['message','stack','actual','expected','cause'])
      Object.defineProperty(error,name,{get(){privateReads++;throw new Error('PRIVATE_GETTER');}});
    const tick=name=>{calls.push(name);if(name===failure)throw error;};
    const models={};
    models['scripts/protected-private-production-runtime.mjs']={
      createProtectedPrivateRuntimeClients(){tick('CLIENTS');return {documentRequest:'private-request',storage:'private-storage'};},
      async describeCurrentProtectedPrivateProductionRuntime(options){assert.deepEqual({...options},{request:'private-request'});tick('CURRENT_B');return selected;},
      async restoreProtectedPrivateProductionRuntime(options){
        tick('B_RESTORE');assert.equal(options.expected.targetReferenceAt,selected.productionReferenceAt);
        assert.equal(options.expected.minimumReferenceAt,selected.productionReferenceAt);
        assert.equal(options.expected.minimumGeneratedAt,selected.generatedAt);
        assert.equal(options.storage,'private-storage');return {restored:true,rollbackSelected:false};},
    };
    models['scripts/private-production-runtime-bundle.mjs']={async restorePrivateProductionRuntimeBundle(options){
      tick('B_UNPACK');assert.equal(options.targetReferenceAt,selected.productionReferenceAt);assert.equal(options.outputPath,'originals');}};
    models['scripts/private-production-runtime-workflow.mjs']={async privateRuntimeContractHashes(){tick('B_FAMILY');return selected.contractHashes;}};
    models['js/core/ravscore-model-contract.js']={ravScoreModelBinding:()=>selected.modelBinding};
    models['scripts/protected-ravscore-continuation-checkpoint.mjs']={
      createProtectedRavScoreCheckpointRequester(){tick('S_REQUESTER');return 's-request';},
      async restoreProtectedRavScoreContinuationCheckpoint(options){tick('S_RESTORE');assert.equal(options.request,'s-request');return {restored:true};},
    };
    let loaded=0;
    const context={assert,SyntaxError,console:{error:line=>lines.push(line)},same:assert.deepEqual,
      fixtureLoad:file=>{if(loaded++===0)tick('MODULES');return Promise.resolve(models[file]);},
      async withAuthenticated586PredecessorSource(use){
        tick('FROZEN_SOURCE');let first,failed=false,result;
        try{result=await use('frozen-root');}catch(e){first=e;failed=true;}
        try{tick('SOURCE_CLEANUP');}catch(e){if(!failed){first=e;failed=true;}}
        if(failed)throw first;return result;
      },
      async readAuthenticatedFrozen586Predecessor(){tick('SNAPSHOT');return 'opaque-fixture-handle';},
      assertAuthenticatedFrozen586Snapshot(handle){assert.equal(handle,'opaque-fixture-handle');tick('SNAPSHOT_ACCESSOR');return selected;},
      async originalFiles(){tick('ORIGINAL_FILES');},
      async assertAuthenticatedFrozen586SnapshotFresh(handle){assert.equal(handle,'opaque-fixture-handle');tick('FRESH_SNAPSHOT');},
      async centralProof(){tick('CENTRAL');return {};},baseline:()=>({synthetic:true}),
      fs:{async writeFile(file,text,options){tick('BASELINE_WRITE');assert.equal(file,'baseline');
        assert.equal(options.flag,'wx');assert.equal(options.mode,0o600);}},
    };
    const api=runInNewContext(diagnostic+'\n'+executablePrepare+
      '\n({prepare,prewriteAt,prewriteDiagnostic,emitPrewriteRefusal});',context,{filename:'actual-assistant-binding-prepare-diagnostic.js'});
    const invoke=()=>api.prepare({root:'private-root',bundle:'bundle',originals:'originals',originalS:'s',baseline:'baseline'});
    if(failure===null){await invoke();assert.deepEqual(calls,expectedCalls);assert.equal(lines.length,0);}
    else{
      await assert.rejects(invoke(),e=>e===error);
      const site={SOURCE_CLEANUP:'FROZEN_SOURCE',S_REQUESTER:'S_RESTORE',SNAPSHOT_ACCESSOR:'SNAPSHOT',CENTRAL:'BASELINE_WRITE'}[failure]??failure;
      assert.deepEqual(JSON.parse(JSON.stringify(api.prewriteDiagnostic(error))),{
        kind:'ASSISTANT_BINDING_ORIGINAL_PREWRITE_DIAGNOSTIC',phase:'PREPARE',site,category:'ASSERTION'});
      assert.equal(calls.filter(value=>value===failure).length,1,'failed operation is never retried');
      if(!['FROZEN_SOURCE','SOURCE_CLEANUP'].includes(failure))assert(calls.includes('SOURCE_CLEANUP'));
      assert.equal(calls.includes('BASELINE_WRITE'),failure==='BASELINE_WRITE');
      await assert.rejects(api.prewriteAt('VERIFY','UNCHANGED_ORIGINALS',()=>{throw error;}),e=>e===error);
      assert.equal(api.prewriteDiagnostic(error).site,site,'outer catch cannot replace the first callsite');
      api.emitPrewriteRefusal(error);assert.equal(lines[0],'ASSISTANT_BINDING_ORIGINAL_PREWRITE_REFUSED');
      assert.equal(lines.length,2);assert.doesNotMatch(lines.join('\n'),/PRIVATE_OBSERVATION|PRIVATE_GETTER|message|stack|actual|expected|cause|private-request|private-storage/);
    }
    assert.equal(privateReads,0);
  }
});

test('assistant binding prewrite diagnostic keeps real CLI guards and bounded code projection',async()=>{
  const {runInNewContext}=await import('node:vm');
  const source=await fs.readFile(path.join(ROOT,'scripts/assistant-later-h0-binding-prewrite.mjs'),'utf8');
  const diagnostic=source.slice(source.indexOf('const prewriteSites='),source.indexOf('async function source(fresh=false){'));
  const main=source.slice(source.indexOf('async function main(){'),source.indexOf('\nif(process.argv[1]'));
  let calls=0;
  const context={assert,SyntaxError,process:{argv:['node','private-script','unknown']},console:{log(){},error(){}},
    source:async()=>{calls++;throw Object.assign(new Error('PRIVATE_CANARY'),{code:'ENOENT'});}};
  const api=runInNewContext(diagnostic+'\n'+main+
    '\n({main,prewriteAt,prewriteDiagnostic,emitPrewriteRefusal});',context,{filename:'actual-assistant-binding-cli-diagnostic.js'});
  let error;try{await api.main();}catch(e){error=e;}
  assert.equal(api.prewriteDiagnostic(error).phase,'CLI');assert.equal(api.prewriteDiagnostic(error).category,'ASSERTION');assert.equal(calls,0);
  context.process.argv[2]='prepare';try{await api.main();}catch(e){error=e;}
  assert.equal(api.prewriteDiagnostic(error).phase,'SOURCE');assert.equal(api.prewriteDiagnostic(error).category,'FILE_NOT_FOUND');assert.equal(calls,1);
  for(const [code,category]of [['ERR_ASSERTION','ASSERTION'],['EEXIST','EXISTING_DESTINATION'],
    ['PROTECTED_PRIVATE_RUNTIME_NO_COMPATIBLE_GENERATION','B_NO_COMPATIBLE_GENERATION'],
    ['FROZEN586_PREDECESSOR_B_S_DIFFER','SNAPSHOT_B_S_DIFFER'],[1,'PROCESS_EXIT'],['PRIVATE_CANARY','UNCLASSIFIED_ERROR']]){
    const original=Object.assign(new Error('PRIVATE_CANARY'),{code});
    await assert.rejects(api.prewriteAt('PREPARE','SNAPSHOT',()=>{throw original;}),e=>e===original);
    assert.equal(api.prewriteDiagnostic(original).category,category);
  }
  let reads=0;
  const hostile=new Error('PRIVATE_CANARY');Object.defineProperty(hostile,'code',{get(){reads++;throw new Error('PRIVATE_CANARY');}});
  await assert.rejects(api.prewriteAt('PREPARE','SNAPSHOT',()=>{throw hostile;}),e=>e===hostile);
  assert.equal(reads,0);assert.equal(api.prewriteDiagnostic(hostile).category,'UNCLASSIFIED_ERROR');
  await assert.rejects(api.prewriteAt('PRIVATE_CANARY','UNKNOWN',()=>{calls++;}),/DIAGNOSTIC_SITE_INVALID/);assert.equal(calls,1);
  for(const primitive of ['PRIVATE_CANARY',null,undefined]){
    await assert.rejects(api.prewriteAt('PREPARE','SNAPSHOT',()=>Promise.reject(primitive)),e=>e===primitive);
    assert.equal(api.prewriteDiagnostic(primitive).category,'UNCLASSIFIED_ERROR');
  }
  const value=Object.freeze({synthetic:true});assert.equal(await api.prewriteAt('PREPARE','SNAPSHOT',()=>value),value);
  assert.match(source,/main\(\)\.catch\(error=>\{\s+emitPrewriteRefusal\(error\);process\.exitCode=1;/);
  const catalog=await fs.readFile(path.join(ROOT,'scripts/lib/model-source-imports.mjs'),'utf8');
  assert(catalog.includes("sha256:'860d62ff21d2854ca2856bcb6998ba48859c0237f94b315c7736a1265e1be8de'"));
  assert(catalog.includes("sha256:'fa16454cd00e516c4fe3c3b80f3445c73a32ce2162c0258b493e5a88e61c3d25'"));
  assert(catalog.includes("imports:ASSISTANT_BINDING_PREWRITE_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports"));
});

test('assistant binding and ordinary transition destinations satisfy the genuine frozen586 protected-S path contract',async()=>{
  const {runInNewContext}=await import('node:vm');
  const {withAuthenticated586PredecessorSource}=await import('./check-assistant-later-h0-predecessor-source.mjs');
  const source=await fs.readFile(path.join(ROOT,'scripts/assistant-later-h0-binding-prewrite.mjs'),'utf8');
  const locations=source.slice(source.indexOf('async function locations(prepare){'),source.indexOf('async function centralProof(){'));
  const matches=[...locations.matchAll(/const p=(\{[\s\S]*?\});/g)];
  assert.equal(matches.length,1,'Use the actual normal destination constructor, not a copied test path');
  assert(source.includes('checkpointPath:p.originalS,targetReference:selected.productionReferenceAt'));
  const ordinary=await fs.readFile(path.join(ROOT,'scripts/assistant-later-h0-runtime-transition.mjs'),'utf8');
  const actualPaths=ordinary.slice(ordinary.indexOf('function paths(){'),ordinary.indexOf('async function inventory(root){'));
  const checkpointConstant=[...ordinary.matchAll(/,CP='([^']+)';/g)];assert.equal(checkpointConstant.length,1);
  assert(ordinary.includes('checkpointPath:p.originalSPath,'));
  await withAuthenticated586PredecessorSource(async frozenRoot=>{
    // No target is created: a missing synthetic protected row stops before write.
    const root=path.join(frozenRoot,'fixture-binding-original');
    const targets=runInNewContext('('+matches[0][1]+')',{path,root});
    assert.equal(targets.root,root);
    const ordinaryTargets=runInNewContext(actualPaths+'\npaths();',{assert,path,ROOT,CP:checkpointConstant[0][1],
      process:{env:{RAVRADAR_PRIVATE_RUNTIME_ROOT:root,RAVRADAR_PRIVATE_RUNTIME_BUNDLE:path.join(root,'bundle')}}});
    assert.equal(ordinaryTargets.privateRoot,root);
    const normal=await import(pathToFileURL(path.join(frozenRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    let requests=0;
    const request=async()=>{requests++;return [];};
    for(const previous of ['original-S.json','assistant586-original-checkpoint.json']){
      await assert.rejects(normal.restoreProtectedRavScoreContinuationCheckpoint({
        checkpointPath:path.join(root,previous),targetReference:'2026-10-24T16:00:00.000Z',request,
      }),/dedicated \.cache path/);
      assert.equal(requests,0,'Each previous caller target is rejected before protected I/O');
    }
    for(const checkpointPath of [targets.originalS,ordinaryTargets.originalSPath]){
      const before=requests;
      const result=await normal.restoreProtectedRavScoreContinuationCheckpoint({
        checkpointPath,targetReference:'2026-10-24T16:00:00.000Z',request,
      });
      assert.equal(requests,before+1,'Each actual caller target must reach the genuine reader');
      assert.equal(result.reason,'protected-checkpoint-not-found');assert.equal(result.targetUnchanged,true);
      await assert.rejects(fs.access(checkpointPath),/ENOENT/);
    }
    await assert.rejects(fs.access(root),/ENOENT/);
  });
});
// Afgrænset data-/kalderprøve: ingen autentificeret B/S, GRIB eller ny adgang.
test('assistant later-H0 original RAW boundary preserves working hashes and actual S generation',async t=>{
  const {createHash}=await import('node:crypto'),{compileFunction}=await import('node:vm');
  const {spawnSync}=await import('node:child_process'),os=await import('node:os');
  const sha=value=>createHash('sha256').update(value).digest('hex');
  const read=async relative=>(await fs.readFile(path.join(ROOT,relative),'utf8')).replace(/\r\n/g,'\n');
  const ordinary=await read('scripts/assistant-later-h0-runtime-transition.mjs');
  const planner=await read('scripts/plan-ravscore-current-history.mjs');
  const cut=(text,begin,end)=>{
    assert.equal(text.split(begin).length,2);assert.equal(text.split(end).length,2);
    const a=text.indexOf(begin)+begin.length,b=text.indexOf(end,a);assert(b>a);return text.slice(a,b);
  };
  // De faktiske retur-/boundarykonstruktioner; ingen kopi af en alternativ læser.
  const returned=cut(ordinary,'    return snapshot.verified;\n  };\n',
    '\n}\nexport async function readAssistantLaterH0RetentionInput');
  const construct=compileFunction('return (async()=>{'+returned+'})();',
    ['snapshot','result','conditionsPath','bytes','verify','fs','sha','same','assert','json']);
  const boundarySource=cut(planner,
    '    ? await readDmiBulkDocument(process.env.DMI_PART_CONTINUITY_DONOR_PATH) : null;\n',
    '  const liveCurrentPilot = await readLiveCurrentPilot(registry), zones = (await readFixed(\'data/zones.geojson\')).json;');
  const boundary=compileFunction(boundarySource+'\nreturn boundary;',
    ['verified','checkpoint','originalConditionsSha256','conditionsSha256','refuse']);
  const hashes=planner.match(/sourceHashes: (\{ conditions: baseline\?\.sha256 \?\? null,[\s\S]*?activation: activation\?\.sha256 \?\? null \})/g);
  assert.equal(hashes?.length,1);
  const sourceHashes=compileFunction('return ('+hashes[0].slice('sourceHashes: '.length)+');',
    ['baseline','checkpointFile','activation']);
  const tmp=await fs.realpath(os.tmpdir()),root=await fs.mkdtemp(path.join(tmp,'rr-original-raw-boundary-'));
  const owned=await fs.lstat(root,{bigint:true});let complete=false;
  t.after(async()=>{
    assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),tmp);
    const now=await fs.lstat(root,{bigint:true});assert.equal(now.dev,owned.dev);assert.equal(now.ino,owned.ino);
    if(complete)await fs.rm(root,{recursive:true}); // Kun denne fødselskontrollerede prøve.
  });
  const write=async(relative,bytes)=>{const file=path.join(root,relative);
    await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx'});return file;};
  const original=Buffer.from('{"synthetic":"original586","coastalParts":{}}\n');
  const working=Buffer.from('{"synthetic":"working587","coastalParts":{}}\n');
  const originalPath=await write('private/bundle/payload/data/live/conditions.json',original);
  const conditionsPath=await write('data/live/conditions.json',working);
  const checkpoint={generationSha256:sha('new-working-S'),synthetic:'working-checkpoint'};
  const checkpointBytes=Buffer.from(JSON.stringify(checkpoint)+'\n');
  await write('.cache/ravscore-continuation-checkpoint/checkpoint.json',checkpointBytes);
  const verified={datasetId:'rr-synthetic-original-boundary',productionReferenceAt:'2026-10-24T16:00:00.000Z',
    bundleContentSha256:sha('synthetic-original-B'),files:[{relativePath:'data/live/conditions.json',
      bytes:original.length,sha256:sha(original)}]};
  await write('private/bundle/manifest.json',JSON.stringify(verified)+'\n');
  const snapshot={verified,conditionsPath:originalPath},result={conditions:JSON.parse(working)};
  let verifiedCalls=0;
  // Inert kaldestedsgrænse, IKKE en falsk autentificeringsfunktion eller opaque handle.
  const verify=async()=>{verifiedCalls++;return verified;};
  const invoke=(view=snapshot,check=verify)=>construct(view,result,conditionsPath,working,check,fs,sha,
    assert.deepEqual,assert,async file=>JSON.parse(await fs.readFile(file,'utf8')));
  const value=await invoke();
  assert.equal(verifiedCalls,1,'Returen afventer den eksisterende friske fuldkontrol');
  assert.strictEqual(value.verify,verify);assert.strictEqual(value.verified,verified);
  assert.strictEqual(value.conditions,result.conditions);assert.equal(value.conditionsPath,conditionsPath);
  assert.equal(value.conditionsSha256,sha(working));
  assert.deepEqual(value.originalConditions,JSON.parse(original));
  const refuse=code=>{throw new Error(code);};
  const bound=boundary(value.verified,checkpoint,value.originalConditionsSha256,value.conditionsSha256,refuse);
  const actualHashes=sourceHashes({sha256:'sha256:'+sha(working)},{sha256:'sha256:'+sha(checkpointBytes)},null);
  assert.deepEqual(actualHashes,{conditions:'sha256:'+sha(working),checkpoint:'sha256:'+sha(checkpointBytes),activation:null});
  const partBytes=Buffer.from('{"zones":{"SYNTHETIC":[{"partId":"PART","waterPoint":[1,2]}]}}');
  const demand={schemaVersion:2,kind:'RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND',
    productionReferenceAt:'2026-10-24T20:00:00.000Z',modelBinding:{synthetic:true},
    registrySha256:'sha256:'+sha(partBytes),sourceHashes:actualHashes,demands:[],
    rawRetention:{schemaVersion:1,kind:'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION',boundary:bound,captures:[]}};
  await write('.cache/ravscore-current-history-demand.json',JSON.stringify(demand)+'\n');
  // Den uændrede normale Python-læser/configurator, med samme import-safe
  // ecCodes-seam som test-dmi-native-provenance.py; ingen dekodning/netværk.
  const python=String.raw`
import importlib.util, json, os, pathlib, socket, sys, types
repo, root = map(pathlib.Path, sys.argv[1:])
sys.path.insert(0, str(repo / 'scripts'))
def no_network(*args, **kwargs): raise AssertionError('UNEXPECTED_NETWORK')
socket.create_connection = no_network
socket.socket.connect = no_network
eccodes = types.ModuleType('eccodes')
eccodes.OutOfAreaError = type('OutOfAreaError', (Exception,), {})
for name in ('codes_get','codes_get_array','codes_get_elements','codes_grib_find_nearest','codes_grib_new_from_file','codes_release'):
    setattr(eccodes, name, no_network)
sys.modules['eccodes'] = eccodes
spec = importlib.util.spec_from_file_location('raw_boundary_normal_producer', repo / 'scripts/update-dmi-bulk.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
p.ROOT, p.RAW_DIR, p.CACHE_ONLY = root, root / '.cache/dmi-grib', False
f = root / '.cache/ravscore-current-history-demand.json'
os.environ.update(DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION='true', DMI_BULK_CURRENT_HISTORY_DEMAND_PATH=str(f),
    RAVRADAR_PRIVATE_RUNTIME_ROOT=str(root/'private'), RAVRADAR_PRIVATE_RUNTIME_BUNDLE=str(root/'private/bundle'))
raw = f.read_bytes(); document = json.loads(raw)
parts = b'{"zones":{"SYNTHETIC":[{"partId":"PART","waterPoint":[1,2]}]}}'
read = lambda: p.read_current_history_demands(json.loads(parts), parts, [{'partId':'PART'}], [], document['productionReferenceAt'])
assert read() == {}
assert p._RAW_CURRENT_PROTECTED == {}
def refused(change, expected):
    changed = json.loads(raw); change(changed); f.write_text(json.dumps(changed), encoding='utf-8')
    try: read()
    except (ValueError, p.AssetDownloadCleanupUnproven) as error: assert str(error) == expected, str(error)
    else: raise AssertionError('EXPECTED_REFUSAL')
    finally: f.write_bytes(raw)
refused(lambda x: x['rawRetention']['boundary'].update(conditionsSha256=x['sourceHashes']['conditions'][7:]), 'DMI_RAW_CURRENT_B_BOUNDARY_CHANGED')
refused(lambda x: x['rawRetention']['boundary'].update(checkpointGenerationSha256='0'*64), 'DMI_RAW_CURRENT_B_BOUNDARY_CHANGED')
refused(lambda x: x['sourceHashes'].update(conditions='sha256:'+x['rawRetention']['boundary']['conditionsSha256']), 'DMI_CURRENT_HISTORY_DEMAND_INPUT_MISMATCH')
original = root/'private/bundle/payload/data/live/conditions.json'
saved = original.read_bytes(); original.write_bytes(saved+b' ')
try: read()
except p.AssetDownloadCleanupUnproven as error: assert str(error) == 'DMI_RAW_CURRENT_B_BOUNDARY_CHANGED'
else: raise AssertionError('CHANGED_ORIGINAL_ACCEPTED')
finally: original.write_bytes(saved)
working = root/'data/live/conditions.json'
saved = working.read_bytes(); working.write_bytes(saved+b' ')
try: read()
except ValueError as error: assert str(error) == 'DMI_CURRENT_HISTORY_DEMAND_INPUT_MISMATCH'
else: raise AssertionError('CHANGED_WORKING_ACCEPTED')
finally: working.write_bytes(saved)
assert read() == {}
print('NORMAL_RAW_BOUNDARY_PASS old-working-hash-refused original-and-working-distinct new-S-preserved')
`;
  const child=spawnSync(process.env.PYTHON||'python',['-B','-c',python,ROOT,root],
    {cwd:ROOT,encoding:'utf8',timeout:30000,maxBuffer:1024*1024,
      env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUTF8:'1'}});
  assert.equal(child.error,undefined);assert.equal(child.signal,null);
  assert.equal(child.status,0,child.stderr);assert.match(child.stdout,/^NORMAL_RAW_BOUNDARY_PASS /);
  assert.equal(value.originalConditionsSha256,sha(original));
  assert.notEqual(value.originalConditionsSha256,value.conditionsSha256);
  assert.equal(bound.conditionsSha256,sha(original));assert.equal(bound.checkpointGenerationSha256,checkpoint.generationSha256);
  assert.equal(boundary(verified,checkpoint,undefined,sha(original),refuse).conditionsSha256,sha(original),
    'Normal ikke-overgang beholder den eksisterende hash');
  for(const hash of [sha(working),'0'.repeat(64)])assert.throws(
    ()=>boundary(verified,checkpoint,hash,sha(working),refuse),/RETENTION_B_CHANGED/);
  assert.throws(()=>boundary({...verified,files:[]},checkpoint,sha(original),sha(working),refuse),/RETENTION_B_CHANGED/);
  const first=new Error('SYNTHETIC_FRESH_VERIFY_REFUSED');
  await assert.rejects(invoke(snapshot,async()=>{throw first;}),error=>error===first);
  for(const entry of [null,{...verified.files[0],bytes:original.length+1},
    {...verified.files[0],sha256:sha(working)}]){
    const calls=verifiedCalls;
    await assert.rejects(invoke({...snapshot,verified:{...verified,files:entry?[entry]:[]}}));
    assert.equal(verifiedCalls,calls,'Forkert originalinventar afvises før retur');
  }
  await fs.writeFile(originalPath,Buffer.concat([original,Buffer.from(' ')]));
  await assert.rejects(invoke(),/Original B conditions bytes/);await fs.writeFile(originalPath,original);
  assert.deepEqual(await fs.readFile(originalPath),original);assert.deepEqual(await fs.readFile(conditionsPath),working);
  assert.deepEqual(await fs.readFile(path.join(root,'.cache/ravscore-continuation-checkpoint/checkpoint.json')),checkpointBytes);
  complete=true;
});
