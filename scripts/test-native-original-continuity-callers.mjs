// Narrow normal caller/source/refusal targets. Not a positive B/S origin,
// installed SQL, national capacity or production claim. No fabricated tuple.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
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
});
