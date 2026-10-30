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
import {assertNativeOriginalContinuityCodeOnlyCaller,selectNativeOriginalContinuityCodeOnlySource,
  selectCurrentInstalledCodeOnlySource,verifyCurrentInstalledCodeOnlyPlan}
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

const installedCodeOnlyCaller=()=>({
  ...caller(true),CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN:'false',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PHASE:'installed',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN:'false',
  RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN:'false',
  RAVRADAR_USERDATA_UPGRADE_OPT_IN:'false',RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN:'false',
  RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN:'false',
  ...Object.fromEntries(['UPGRADE_EXISTING_OWNER_EXPORT','UPGRADE_ACCOUNT_ASSISTANT',
    'UPGRADE_STATISTICS_REVISION','UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',
    'UPGRADE_LAST_MILE_ENCLOSURE','UPGRADE_ACCOUNT_STATISTICS_ASSISTANT',
    'UPGRADE_NATIVE_ORIGINAL_CONTINUITY','RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER',
    'COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION',
    'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP','RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY',
    'NATIVE_IDENTITY_RECOVERY'].map(key=>[key,'false'])),
});
test('current installed code-only routing leaves both historical source phases inactive',async t=>{
  const environment=Object.freeze(installedCodeOnlyCaller());
  await t.test('native586 is not the current588 source',async()=>{
    assert.equal(await selectNativeOriginalContinuityCodeOnlySource(environment),false);
  });
  await t.test('metadata585 is not the current588 source',async()=>{
    const {selectAccountStatisticsAssistantCodeOnlySource}=await import('./select-account-statistics-assistant-code-only-source.mjs');
    assert.equal(await selectAccountStatisticsAssistantCodeOnlySource(environment),false);
  });
  assert.deepEqual(environment,installedCodeOnlyCaller(),'Selection never mutates caller authority');
});

test('current installed code-only source requires actual active issuance and the complete caller',async()=>{
  const environment=Object.freeze(installedCodeOnlyCaller());
  assert.deepEqual(await selectCurrentInstalledCodeOnlySource(environment),{
    sourcePhase:ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,
    migrationVersion:ACTIVE_ASSISTANT_SUCCESSOR.requireBinding().version});
  for(const [key,value]of Object.entries(environment)){
    if(key==='RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_PHASE'
      ||key==='RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PHASE'
      ||key==='RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_CONFIRMATION'
      ||key.endsWith('_ORIGINALS_VERIFIED')||key.endsWith('_NOLOSS_VERIFIED')||key.endsWith('_PREWRITE_VERIFIED'))continue;
    const changed={...environment,[key]:value==='false'?'true':value==='true'?'false':'INVALID'};
    await assert.rejects(selectCurrentInstalledCodeOnlySource(changed),{code:'ERR_ASSERTION'},key);
    const missing={...environment};delete missing[key];
    await assert.rejects(selectCurrentInstalledCodeOnlySource(missing),{code:'ERR_ASSERTION'},'missing '+key);
  }
  for(const key of ['RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN',
    'RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN','RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN'])
    await assert.rejects(selectCurrentInstalledCodeOnlySource({...environment,[key]:'true'}));
  await assert.rejects(selectNativeOriginalContinuityCodeOnlySource({...environment,
    RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN:'true',RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_PHASE:'before'}));
  const {selectAccountStatisticsAssistantCodeOnlySource}=await import('./select-account-statistics-assistant-code-only-source.mjs');
  await assert.rejects(selectAccountStatisticsAssistantCodeOnlySource({...environment,
    RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN:'true'}));
});

test('current installed code-only actual selection body rejects unknown or partial I C T before admission',async()=>{
  const {runInNewContext}=await import('node:vm');
  const source=await fs.readFile(path.join(ROOT,'scripts/select-native-original-continuity-code-only-source.mjs'),'utf8');
  const start='export async function selectCurrentInstalledCodeOnlySource(environment=process.env){';
  const end='\nexport async function verifyCurrentInstalledCodeOnlyPlan(options){';
  assert.equal(source.split(start).length,2);assert.equal(source.split(end).length,2);
  const body=source.slice(source.indexOf(start),source.indexOf(end)).replace(/^export /,'');
  const next=ACTIVE_ASSISTANT_SUCCESSOR.requireBinding();
  for(const change of [null,'I','C','T','missing-I','missing-C','missing-T','unissued']){
    const observed={I:next.I,C:next.C,T:next.T};let continuationCalls=0;
    if(['I','C','T'].includes(change))observed[change]='f'.repeat(64);
    if(change?.startsWith('missing-'))delete observed[change.slice(8)];
    const unavailable=Object.assign(new Error('SYNTHETIC_UNISSUED'),{code:'UNISSUED'});
    const actual=runInNewContext(body+'\nselectCurrentInstalledCodeOnlySource;',{
      assert,process:{env:{}},ACTIVE:{requireOutput(){if(change==='unissued')throw unavailable;},
        requireBinding:()=>next,requireRelease:()=>ACTIVE_ASSISTANT_SUCCESSOR.requireRelease(),
        sourcePhase:ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase},
      ravScoreModelBinding:()=>({modelBundleSha256:observed.I}),
      candidateBinding:()=>({modelBundleSha256:observed.C}),
      async ravScoreContinuationImplementationSha256(){continuationCalls++;return observed.T;},
    },{filename:'actual-current-installed-code-only-selection-body.js'});
    if(change===null)assert.equal((await actual(installedCodeOnlyCaller())).sourcePhase,ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase);
    else await assert.rejects(actual(installedCodeOnlyCaller()));
    assert.equal(continuationCalls,['I','C','missing-I','missing-C','unissued'].includes(change)?0:1);
  }
});

test('current installed code-only plan uses the normal active migration contract and refuses every pending write',async()=>{
  assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor'].includes(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase));
  const required=(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public591-successor'
    ?(await import('./integrated-cutover-readiness.mjs')).assistantPublic591SuccessorRequiredMigrations:ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor'
    ?assistantPublic590SuccessorRequiredMigrations:ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'
      ?assistantPublic588SuccessorRequiredMigrations:assistantPublic587SuccessorRequiredMigrations)(),next=required.at(-1);
  const full='Local | Remote | Time (UTC)\n'+required.map(row=>`${row.version} | ${row.version} | synthetic-plan-response`).join('\n');
  const noop='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.';
  const options={environment:installedCodeOnlyCaller(),migrationListText:full,dryRunText:noop,
    migrationsDirectory:path.join(ROOT,'supabase/migrations')};
  assert.deepEqual((await verifyCurrentInstalledCodeOnlyPlan(options)).pendingVersions,[]);
  for(const changed of [
    {...options,migrationListText:full.replace(`${next.version} | ${next.version}`,`${next.version} | `)},
    {...options,migrationListText:full+'\n20990101000000 | 20990101000000 | unknown'},
    {...options,migrationListText:full+'\n'+next.version+' | '+next.version+' | duplicate'},
    {...options,dryRunText:'DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '
      +next.filename+'\nFinished supabase db push.'},
    {...options,migrationListText:full.replace(`${required[0].version} | ${required[0].version}`,`${required[0].version} | `)},
    {...options,environment:{...options.environment,RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN:'true'}},
  ])await assert.rejects(verifyCurrentInstalledCodeOnlyPlan(changed));
  await assert.rejects(verifyCurrentInstalledCodeOnlyPlan({...options,allowPending:true}));
});

test('current installed code-only normal workflow keeps read-only SQL, hard current restore and B before S',async()=>{
  const {runInNewContext}=await import('node:vm');
  const source=await fs.readFile(path.join(ROOT,'.github/workflows/deploy-code-only-repair.yml'),'utf8');
  const step=name=>{const heading='      - name: '+name,at=source.indexOf(heading);
    assert(at>=0);assert.equal(source.indexOf(heading,at+heading.length),-1);
    const end=source.indexOf('\n      - name:',at+heading.length);
    return source.slice(at,end<0?undefined:end);};
  const env={RAVRADAR_CURRENT_INSTALLED_CODE_ONLY_SOURCE_ACTIVE:'true'},inputs={};
  const steps={'operational-action':{outputs:{action:'integrated'}},'saved-last-mile-source':{outputs:{}},
    'current-private-publish':{outcome:'success'},'checkpoint-disposition':{outputs:{disposition:'READY_PUBLISHED'}}};
  const activeCondition=name=>{const text=step(name),match=/^        if: (.+)$/m.exec(text);assert(match);
    // GitHub permits hyphens in a step ID; JavaScript needs bracket notation.
    const expression=match[1].replace(/\bsteps\.([a-zA-Z0-9_-]+)/g,(_whole,id)=>'steps['+JSON.stringify(id)+']');
    return Boolean(runInNewContext(expression,{env,inputs,steps}));};
  assert.equal(activeCondition('Select only an already-installed established-origin successor before private work'),false);
  assert.equal(activeCondition('Require the current exact installed source and empty SQL plan before private work'),true);
  assert.equal(activeCondition('Apply exact dry-run-verified post-cutover binding'),false);
  assert.equal(activeCondition('Publish measured continuation checkpoint without promoting rollback readiness'),false);
  assert.equal(activeCondition('Publish measured continuation only after verified warmup private runtime'),true);
  steps['current-private-publish'].outcome='failure';
  assert.equal(activeCondition('Publish measured continuation only after verified warmup private runtime'),false);
  assert.equal(activeCondition('Deploy exact rebound trip Edges without Worker or D1 replay'),false);
  const installed=step('Require the current exact installed source and empty SQL plan before private work');
  assert.match(installed,/--verify-current-installed-plan/);assert.match(installed,/integrated-cutover-readiness\.mjs verify-db/);
  assert.match(installed,/verify-statistics-preference-revision-schema\.mjs/);
  assert.doesNotMatch(installed,/supabase db push --linked --skip-vault/);
  const readback=step('Read back migration and database binding');
  assert.match(readback,/if test "\$\{RAVRADAR_CURRENT_INSTALLED_CODE_ONLY_SOURCE_ACTIVE:-false\}" = true; then/);
  assert.match(readback,/--verify-current-installed-plan[\s\S]*else[\s\S]*verify-established-native-current-origin-plan\.mjs/);
  const restore=source.indexOf('      - name: Require authenticated current runtime before any historical fallback');
  assert(restore>source.indexOf('      - name: Try installing current-compatible private runtime'));
  assert(restore<source.indexOf('      - name: Describe exact target private runtime source for bounded migration'));
  assert.match(step('Require authenticated current runtime before any historical fallback'),/current-private-install\.outcome/);
  assert(source.includes("env.RAVRADAR_CURRENT_INSTALLED_CODE_ONLY_SOURCE_ACTIVE == 'true') && steps.established-native-current-origin-checkpoint-publish.outcome"));
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
      error instanceof assert.AssertionError&&!/ASSISTANT_LATER_H0_(?:SQL_)?UNISSUED/.test(error.message)
        &&!/ASSISTANT_PUBLIC587_SUCCESSOR_(?:SQL_)?UNISSUED/.test(error.message),key));
  }
  assert.throws(()=>assertAssistantBindingPrewriteCaller({}));
});
// Kun testvisninger: hele n590-bytes føres tilbage til de gennemgåede691-bytes.
// Den ældre691→b574-inverse nedenfor og alle dens oprindelige orakler bevares.
// Hver mutation kræver ny selvstændig whole-source-kvalifikation; intet runtimehåndtag udstedes.
// TEST DATA ONLY: strict whole592-to-immutable591 source view before old oracles.
// Every old SHA/assertion remains unchanged; this creates no runtime/source/original authority.
const reviewedIssued592Sources=Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs": {
    "canonicalSha256": "0c0b447d20b222daf5d119c60e814605f69572bc5b7f748d8174dc728fd9e87b",
    "canonicalBytes": 34477,
    "currentSha256": "00dc5244da4e9fe82b761f7ec2c8c4b394e4b2f97db7c225d99de9c1a9bf83e8",
    "currentBytes": 41147,
    "inverse": [
      {
        "before": "const execute=promisify(callbackExec);\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');\nfunction fixedSource(profile){\n  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n  const HEAD=profile.head,TREE=profile.tree;\nconst C='scripts/rollback-assets/ravscore-model-bundle.generated.js';\nconst I='js/core/ravscore-model-bundle.generated.js';\n",
        "after": "const execute=promisify(callbackExec);\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');\nfunction fixedSource(profile){\n  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n  const HEAD=profile.head,TREE=profile.tree;\nconst C='scripts/rollback-assets/ravscore-model-bundle.generated.js';\nconst I='js/core/ravscore-model-bundle.generated.js';\n"
      },
      {
        "before": "  await frozen588OriginData(options.descriptor,options.conditions,options.centralContract);\n}\n`;\nconst ORIGINAL_591_ASSERTION_SUFFIX=String.raw`\n// ASSERTIONS ONLY over the WHOLE immutable a157 issued591 origin implementation.\n// Removing this suffix restores whole Git SHA-256 516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c.\n// This is DATA validation, never a WeakMap origin/ForPart/finalizer capability.\nasync function frozen591OriginData(descriptor,conditions,centralContract) {\n  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');\n  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'FROZEN_591_DESCRIPTOR');\n  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();\n  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'FROZEN_591_FAMILY');\n  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);\n  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,\n    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,\n    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,\n    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});\n  // Exactly actual591's normal DATA dispatch, including its complete585/584 parents.\n  if(conditions[ATTEST]?.kind===METADATA585_KIND\n    &&conditions[ATTEST]?.predecessor?.sourceFamilyHead===METADATA585_SOURCE)\n    await validateMetadata585Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});\n  else if(conditions[ATTEST]?.kind===METADATA584_KIND)\n    await validateMetadata584Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});\n  else validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});\n  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');\n  return {pairs,binding,candidate,contracts};\n}\nexport async function assertFrozen591OriginSnapshotData(options) {\n  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');\n  const {descriptor,conditions,centralContract,checkpoint}=options;\n  const {pairs,binding,candidate,contracts}=await frozen591OriginData(descriptor,conditions,centralContract);\n  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)\n    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256\n    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt\n    &&SHA.test(checkpoint.generationSha256),'FROZEN_591_CHECKPOINT');\n  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())\n    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');\n  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])\n    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');\n}\nexport async function assertFrozen591MetadataOriginData(options) {\n  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract']),'ARGUMENTS');\n  await frozen591OriginData(options.descriptor,options.conditions,options.centralContract);\n}\n`;\nconst ORIGINAL_590_ASSERTION_SUFFIX=ORIGINAL_588_ASSERTION_SUFFIX\n  .replace('// Removing this suffix restores whole Git SHA-256 5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69.',\n    '// The source-owned selected590 origin SHA and whole inverse are checked by this host.')\n  .replaceAll('588','590');\nconst ASSERTION_SUFFIX=profile===FROZEN591?ORIGINAL_591_ASSERTION_SUFFIX:profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n  assertionNames.reduce((source,[before,after])=>{assert(source.includes(before));return source.replaceAll(before,after);},ORIGINAL_586_ASSERTION_SUFFIX);\nif(profile===FROZEN587)assert.equal([...assertionNames].reverse().reduce(\n  (source,[before,after])=>source.replaceAll(after,before),ASSERTION_SUFFIX),ORIGINAL_586_ASSERTION_SUFFIX,'Whole assertion-suffix inverse');\n",
        "after": "  await frozen588OriginData(options.descriptor,options.conditions,options.centralContract);\n}\n`;\nconst ORIGINAL_590_ASSERTION_SUFFIX=ORIGINAL_588_ASSERTION_SUFFIX\n  .replace('// Removing this suffix restores whole Git SHA-256 5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69.',\n    '// The source-owned selected590 origin SHA and whole inverse are checked by this host.')\n  .replaceAll('588','590');\nconst ASSERTION_SUFFIX=profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n  assertionNames.reduce((source,[before,after])=>{assert(source.includes(before));return source.replaceAll(before,after);},ORIGINAL_586_ASSERTION_SUFFIX);\nif(profile===FROZEN587)assert.equal([...assertionNames].reverse().reduce(\n  (source,[before,after])=>source.replaceAll(after,before),ASSERTION_SUFFIX),ORIGINAL_586_ASSERTION_SUFFIX,'Whole assertion-suffix inverse');\n"
      },
      {
        "before": "  await visit(root);assert.deepEqual([...seen].sort(),files);\n}\nasync function withSource(useVerifiedSource){\n  if(profile===FROZEN591)assertFrozen591CodeSourceSelected(); // Fixed genuine591 before Git/temp/I/O.\n  if(profile===FROZEN590)assertFrozen590CodeSourceSelected(); // FIRST: no selected parent, no Git/I/O.\n  if(profile===FROZEN588)assertFrozen588CodeSourceSelected(); // FIRST: unselected code cannot reach Git/I/O.\n  assert.equal(arguments.length,1,'No caller head/root/source override');assert.equal(typeof useVerifiedSource,'function');\n",
        "after": "  await visit(root);assert.deepEqual([...seen].sort(),files);\n}\nasync function withSource(useVerifiedSource){\n  if(profile===FROZEN590)assertFrozen590CodeSourceSelected(); // FIRST: no selected parent, no Git/I/O.\n  if(profile===FROZEN588)assertFrozen588CodeSourceSelected(); // FIRST: unselected code cannot reach Git/I/O.\n  assert.equal(arguments.length,1,'No caller head/root/source override');assert.equal(typeof useVerifiedSource,'function');\n"
      },
      {
        "before": "    for(const file of files){const output=path.resolve(root,file);assert(inside(root,output));await fs.mkdir(path.dirname(output),{recursive:true});\n      await fs.writeFile(output,await materializedBytes(file,index,gitReference),{flag:'wx',mode:0o600});}\n    await exactTree(root,files,index,gitReference);\n    const builderArgs=profile===FROZEN591?['--public590-successor','--check']:\n      profile===FROZEN590?['--public588-successor','--check']:\n      profile===FROZEN588?['--public587-successor','--check']:['--check'];\n    const checked=await execute(process.execPath,[path.join(root,BUILDER),...builderArgs],{cwd:root,env:fixedEnv(),timeout:60000,maxBuffer:1024*1024});\n    assert.equal(checked.stdout.trim(),profile.builderChecked);\n",
        "after": "    for(const file of files){const output=path.resolve(root,file);assert(inside(root,output));await fs.mkdir(path.dirname(output),{recursive:true});\n      await fs.writeFile(output,await materializedBytes(file,index,gitReference),{flag:'wx',mode:0o600});}\n    await exactTree(root,files,index,gitReference);\n    const builderArgs=profile===FROZEN590?['--public588-successor','--check']:\n      profile===FROZEN588?['--public587-successor','--check']:['--check'];\n    const checked=await execute(process.execPath,[path.join(root,BUILDER),...builderArgs],{cwd:root,env:fixedEnv(),timeout:60000,maxBuffer:1024*1024});\n    assert.equal(checked.stdout.trim(),profile.builderChecked);\n"
      },
      {
        "before": "    publicProjectionContractSha256:FROZEN590_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),\n});\n\n// Genuine issued591 CODE and DATA bank for the ordinary later-H0 assistant successor.\n// This fixed selection creates no original handle, SOURCE permission or runtime admission.\nexport const FROZEN591_CODE_SOURCE_PROVENANCE=Object.freeze({\n  \"selected\":true,\n  \"head\":\"a157c265949da661827d375db61f9e1e8c4fd6a0\",\n  \"tree\":\"54b020c90661caa31b4e5e1eceedbe827336e4b9\",\n  \"candidateFiles\":98,\n  \"integratedFiles\":97,\n  \"originSha256\":\"516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c\",\n  \"partPipelineSha256\":\"8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758\",\n  \"fullRuntimeContractSha256\":\"ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff\",\n  \"publicProjectionContractSha256\":\"c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09\"\n});\nconst FROZEN591=Object.freeze({\n  ...FROZEN591_CODE_SOURCE_PROVENANCE,\n  builder:'scripts/build-assistant-later-h0-successor.mjs',\n  builderChecked:'Exact original-preserving assistant590 later-H0 metadata source checked; no installation or state admission.',\n  assertion:'scripts/lib/established-native-current-origin-591-assertion.mjs',temporaryPrefix:'rr-a591-source-',\n  candidate:'38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',\n  integrated:'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54',\n  additionalMigrations:Object.freeze([...FROZEN590.additionalMigrations,Object.freeze({\n    path:'supabase/migrations/20261028223717_assistant_public590_later_h0_original_bound_successor.sql',\n    sha256:'72b53fb08ea0e5cebcda7e1cbf3bc49a8a3f2417975daeb6daf530c9029c6835'})]),\n  runtimeContracts:Object.freeze({\n    continuationStateContractSha256:'b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d',\n    fullRuntimeContractSha256:FROZEN591_CODE_SOURCE_PROVENANCE.fullRuntimeContractSha256,\n    publicProjectionContractSha256:FROZEN591_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),\n});\n\n// Hver fast profil ejer sin cache; samme relative sti kan aldrig genbruge den anden familie.\nconst source586=fixedSource(FROZEN586),source587=fixedSource(FROZEN587),source588=fixedSource(FROZEN588);\nexport async function withAuthenticated586PredecessorSource(useVerifiedSource){\n",
        "after": "    publicProjectionContractSha256:FROZEN590_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),\n});\n\n// Hver fast profil ejer sin cache; samme relative sti kan aldrig genbruge den anden familie.\nconst source586=fixedSource(FROZEN586),source587=fixedSource(FROZEN587),source588=fixedSource(FROZEN588);\nexport async function withAuthenticated586PredecessorSource(useVerifiedSource){\n"
      },
      {
        "before": "export async function withAuthenticated590PredecessorSource(callback){\n  assertFrozen590CodeSourceSelected();return source590(...arguments);\n}\n\nconst source591=fixedSource(FROZEN591);\nexport function assertFrozen591CodeSourceSelected(){\n  assert.equal(arguments.length,0);const source=FROZEN591_CODE_SOURCE_PROVENANCE;\n  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles','originSha256','partPipelineSha256','publicProjectionContractSha256','selected','tree']);\n  assert.equal(source.selected,true,'FROZEN591_CODE_SOURCE_UNSELECTED');\n  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);\n  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);\n  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])assert.match(source[key],/^[a-f0-9]{64}$/);\n  return source; // Fixed CODE data only; never a CI/PASS or original/runtime capability.\n}\nexport async function withAuthenticated591PredecessorSource(callback){\n  assertFrozen591CodeSourceSelected();return source591(...arguments);\n}\n",
        "after": "export async function withAuthenticated590PredecessorSource(callback){\n  assertFrozen590CodeSourceSelected();return source590(...arguments);\n}\n"
      }
    ]
  },
  "scripts/lib/authenticated-frozen586-predecessor.mjs": {
    "canonicalSha256": "67dc78cb89e552696e8642b13d23f0df0257a89f8e06036537f2dcab353ad655",
    "canonicalBytes": 19361,
    "currentSha256": "ba09589cd0f3c48b734d60214ddf2017a7dc3ebba0e14c468da825721b575776",
    "currentBytes": 20438,
    "inverse": [
      {
        "before": "import {promisify,isDeepStrictEqual} from 'node:util';\nimport {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,\n  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,\n  withAuthenticated591PredecessorSource,assertFrozen591CodeSourceSelected,FROZEN591_CODE_SOURCE_PROVENANCE}\n  from '../check-assistant-later-h0-predecessor-source.mjs';\n\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');\n",
        "after": "import {promisify,isDeepStrictEqual} from 'node:util';\nimport {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,\n  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE}\n  from '../check-assistant-later-h0-predecessor-source.mjs';\n\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');\n"
      },
      {
        "before": "// Ukendt fysisk FD-lukning blokerer samme sti på tværs af begge familier.\n// Opaque snapshots og friskhedsfunktioner tilhører derimod kun én fast profil.\nfunction fixedSnapshot(profile){\n  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n  const contexts=new WeakMap(),refreshers=new WeakMap();\n  const SOURCE=profile.sourceHead;\nconst SHA=/^[a-f0-9]{64}$/, HEAD=/^[a-f0-9]{40}$/, MB=1024*1024;\n",
        "after": "// Ukendt fysisk FD-lukning blokerer samme sti på tværs af begge familier.\n// Opaque snapshots og friskhedsfunktioner tilhører derimod kun én fast profil.\nfunction fixedSnapshot(profile){\n  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n  const contexts=new WeakMap(),refreshers=new WeakMap();\n  const SOURCE=profile.sourceHead;\nconst SHA=/^[a-f0-9]{64}$/, HEAD=/^[a-f0-9]{40}$/, MB=1024*1024;\n"
      },
      {
        "before": "  assertionPath:'scripts/lib/established-native-current-origin-590-assertion.mjs',\n  assertionExport:'assertFrozen590OriginSnapshotData',\n  temporaryPrefix:'rr-frozen590-snapshot-',errorPrefix:'FROZEN590_PREDECESSOR_'});\nconst FROZEN591=Object.freeze({\n  sourceHead:FROZEN591_CODE_SOURCE_PROVENANCE.head,\n  requiredSha:Object.freeze([FROZEN591_CODE_SOURCE_PROVENANCE.originSha256,\n    FROZEN591_CODE_SOURCE_PROVENANCE.partPipelineSha256]),\n  withSource:withAuthenticated591PredecessorSource,\n  assertionPath:'scripts/lib/established-native-current-origin-591-assertion.mjs',\n  assertionExport:'assertFrozen591OriginSnapshotData',\n  temporaryPrefix:'rr-frozen591-snapshot-',errorPrefix:'FROZEN591_PREDECESSOR_'});\nconst snapshot586=fixedSnapshot(FROZEN586),snapshot587=fixedSnapshot(FROZEN587),snapshot588=fixedSnapshot(FROZEN588);\n// Kun disse navngivne indgange; ingen caller-valgt profil, root, head eller tuple.\nexport async function readAuthenticatedFrozen586Predecessor(){\n",
        "after": "  assertionPath:'scripts/lib/established-native-current-origin-590-assertion.mjs',\n  assertionExport:'assertFrozen590OriginSnapshotData',\n  temporaryPrefix:'rr-frozen590-snapshot-',errorPrefix:'FROZEN590_PREDECESSOR_'});\nconst snapshot586=fixedSnapshot(FROZEN586),snapshot587=fixedSnapshot(FROZEN587),snapshot588=fixedSnapshot(FROZEN588);\n// Kun disse navngivne indgange; ingen caller-valgt profil, root, head eller tuple.\nexport async function readAuthenticatedFrozen586Predecessor(){\n"
      },
      {
        "before": "export async function assertAuthenticatedFrozen590SnapshotFresh(handle){\n  return snapshot590.fresh(...arguments);\n}\n\nconst snapshot591=fixedSnapshot(FROZEN591);\nexport async function readAuthenticatedFrozen591Predecessor(){\n  assertFrozen591CodeSourceSelected(); // Before paths, transport or callback.\n  return snapshot591.read(...arguments);\n}\nexport function assertAuthenticatedFrozen591Snapshot(handle){\n  return snapshot591.snapshot(...arguments);\n}\nexport async function assertAuthenticatedFrozen591SnapshotFresh(handle){\n  return snapshot591.fresh(...arguments);\n}\n",
        "after": "export async function assertAuthenticatedFrozen590SnapshotFresh(handle){\n  return snapshot590.fresh(...arguments);\n}\n"
      }
    ]
  },
  "scripts/lib/established-native-current-origin.mjs": {
    "canonicalSha256": "516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c",
    "canonicalBytes": 81982,
    "currentSha256": "2aa92e6a2fb14f93e6072160499be1f39a502f4078bf61c98f649adfe538cf01",
    "currentBytes": 85971,
    "inverse": [
      {
        "before": "import {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot,\n  readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot,\n  readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot,\n  readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot}\n  from './authenticated-frozen586-predecessor.mjs';\n\nexport const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v1';\n",
        "after": "import {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot,\n  readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot,\n  readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot}\n  from './authenticated-frozen586-predecessor.mjs';\n\nexport const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v1';\n"
      },
      {
        "before": "  return handle;\n}\n\n// Separate genuine591 later-H0 origin. The old590 implementation remains byte-whole above.\nasync function readFrozen591LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){\n  const oldI='ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54';\n  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'591_FAMILY');\n  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');\n  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'591_LATER_TARGET');\n  const snapshot=assertAuthenticatedFrozen591Snapshot(await readAuthenticatedFrozen591Predecessor());\n  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'591_ORIGINAL_CHANGED');\n  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();\n  need(descriptor.contractHashes.continuationStateContractSha256==='b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d'\n    &&snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256==='38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',\n    '591_FIXED_ORIGINAL_BINDING');\n  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate\n    &&contracts.continuationStateContractSha256===currentSource.continuation\n    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256\n    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,\n    '591_ISSUED_CURRENT_SOURCE');\n  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)\n    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)\n    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),\n    '591_METADATA_ONLY');\n  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt\n    &&same(conditions[ATTEST],snapshot.attestation),'591_WHOLE_PARENT_CHANGED');\n  const pairs=pairsFromConditions(conditions,parts);\n  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())\n    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'591_PARTS');\n  for(const[id,pair]of pairs){\n    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];\n    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);\n    need(inverseI.modelBundleSha256===I.modelBundleSha256,'591_CURRENT_PAIR_BINDING');\n    inverseI.modelBundleSha256=originalI.modelBundleSha256;\n    if(Object.hasOwn(inverseG,'modelBundleSha256')){\n      need(inverseG.modelBundleSha256===C.modelBundleSha256,'591_CURRENT_CANDIDATE_BINDING');\n      inverseG.modelBundleSha256=originalG.modelBundleSha256;\n    }\n    need(same(inverseI,originalI)&&same(inverseG,originalG),'591_WHOLE_PAIR_INVERSE');\n  }\n  need(same(await readPointer(request),before),'SOURCE_CHANGED');\n  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\nasync function readOrigin(centralContract, seedOnly) {\n  const currentSource = await sourceIdentity();\n  const registry = await json(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 16 * MB);\n",
        "after": "  return handle;\n}\n\nasync function readOrigin(centralContract, seedOnly) {\n  const currentSource = await sourceIdentity();\n  const registry = await json(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 16 * MB);\n"
      },
      {
        "before": "      return readFrozen588LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(descriptor.modelBinding.modelBundleSha256==='4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819')\n      return readFrozen590LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(descriptor.modelBinding.modelBundleSha256==='ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')\n      return readFrozen591LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    need(conditions[ATTEST] === undefined, 'UNSUPPORTED_ATTESTED_FAMILY');\n    need(!(descriptor.datasetId === SEED.datasetId && descriptor.productionReferenceAt === SEED.referenceAt\n      && descriptor.modelBinding.modelBundleSha256 === SEED.I), 'SEED_CONTENT_CHANGED');\n",
        "after": "      return readFrozen588LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(descriptor.modelBinding.modelBundleSha256==='4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819')\n      return readFrozen590LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    need(conditions[ATTEST] === undefined, 'UNSUPPORTED_ATTESTED_FAMILY');\n    need(!(descriptor.datasetId === SEED.datasetId && descriptor.productionReferenceAt === SEED.referenceAt\n      && descriptor.modelBinding.modelBundleSha256 === SEED.I), 'SEED_CONTENT_CHANGED');\n"
      }
    ]
  },
  "scripts/assistant-later-h0-binding-prewrite.mjs": {
    "canonicalSha256": "4f1b884c09647fb315cc7703ccefd5737ec7de3c2f38cac7e3d1b6019ab6066c",
    "canonicalBytes": 24155,
    "currentSha256": "c8f473abb689ff12fdbe0086fff2d9d29bb5a2d8a14e5f77a18c28c279e2b2e0",
    "currentBytes": 24709,
    "inverse": [
      {
        "before": "import {execFile as callbackExec} from 'node:child_process';\nimport {promisify,isDeepStrictEqual as equal} from 'node:util';\nimport {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';\nimport {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\nimport {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  assertAuthenticatedFrozen587SnapshotFresh,readAuthenticatedFrozen588Predecessor,\n  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh,readAuthenticatedFrozen590Predecessor,\n  assertAuthenticatedFrozen590Snapshot,assertAuthenticatedFrozen590SnapshotFresh,readAuthenticatedFrozen591Predecessor,\n  assertAuthenticatedFrozen591Snapshot,assertAuthenticatedFrozen591SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\nimport {assertRestoredOriginalInventory} from './migrate-post-cutover-private-runtime.mjs';\nimport {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan} from './integrated-cutover-readiness.mjs';\nimport {inspectDmiForecastFile,readDmiForecastRecord} from './lib/dmi-forecast-file.mjs';\nimport {unpackDmiPartContinuity,assertDmiPartContinuityTotalSize} from './lib/dmi-part-continuity.mjs';\nimport {createProtectedDmiNativeCurrentInspector} from './lib/protected-dmi-native-current-proofs.mjs';\n",
        "after": "import {execFile as callbackExec} from 'node:child_process';\nimport {promisify,isDeepStrictEqual as equal} from 'node:util';\nimport {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';\nimport {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\nimport {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  assertAuthenticatedFrozen587SnapshotFresh,readAuthenticatedFrozen588Predecessor,\n  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh,readAuthenticatedFrozen590Predecessor,\n  assertAuthenticatedFrozen590Snapshot,assertAuthenticatedFrozen590SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\nimport {assertRestoredOriginalInventory} from './migrate-post-cutover-private-runtime.mjs';\nimport {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan} from './integrated-cutover-readiness.mjs';\nimport {inspectDmiForecastFile,readDmiForecastRecord} from './lib/dmi-forecast-file.mjs';\nimport {unpackDmiPartContinuity,assertDmiPartContinuityTotalSize} from './lib/dmi-part-continuity.mjs';\nimport {createProtectedDmiNativeCurrentInspector} from './lib/protected-dmi-native-current-proofs.mjs';\n"
      },
      {
        "before": "import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';\nimport {ownFileDescriptorIdentity,ownedFileDescriptorClosed} from './lib/private-weather-component-pack.mjs';\n// Ingen caller-/miljøvalgt familie. Begge profiler beholder deres egne opaque handles.\nassert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public591-successor'?Object.freeze({\n  withSource:withAuthenticated591PredecessorSource,read:readAuthenticatedFrozen591Predecessor,\n  snapshot:assertAuthenticatedFrozen591Snapshot,fresh:assertAuthenticatedFrozen591SnapshotFresh,\n  plan:assertAssistantPublic591SuccessorMigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({  withSource:withAuthenticated590PredecessorSource,read:readAuthenticatedFrozen590Predecessor,\n  snapshot:assertAuthenticatedFrozen590Snapshot,fresh:assertAuthenticatedFrozen590SnapshotFresh,\n  plan:assertAssistantPublic590SuccessorMigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({\n",
        "after": "import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';\nimport {ownFileDescriptorIdentity,ownedFileDescriptorClosed} from './lib/private-weather-component-pack.mjs';\n// Ingen caller-/miljøvalgt familie. Begge profiler beholder deres egne opaque handles.\nassert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({\n  withSource:withAuthenticated590PredecessorSource,read:readAuthenticatedFrozen590Predecessor,\n  snapshot:assertAuthenticatedFrozen590Snapshot,fresh:assertAuthenticatedFrozen590SnapshotFresh,\n  plan:assertAssistantPublic590SuccessorMigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({\n"
      }
    ]
  },
  "scripts/build-assistant-later-h0-successor.mjs": {
    "canonicalSha256": "9d16218da5e34504e09ef4b6e89a8449f025977d73036c59ed02b93b1c3f9320",
    "canonicalBytes": 30413,
    "currentSha256": "51bbc5683dceed8c0afa822da6377e78568b9bd1bef824755a1d96fa9700a117",
    "currentBytes": 33668,
    "inverse": [
      {
        "before": "  ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,\n  readAssistantPublic590PredecessorCanonicalSource,assistantPublic590SuccessorCheckpointContractFromBase,\n  requireAssistantPublic590SuccessorParent,requireAssistantPublic590SuccessorBinding,requireAssistantPublic590SuccessorOutput,\n  requireAssistantPublic590SuccessorRelease,assistantPublic590SuccessorMigration,\n  ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,\n  readAssistantPublic591PredecessorCanonicalSource,assistantPublic591SuccessorCheckpointContractFromBase,\n  requireAssistantPublic591SuccessorParent,requireAssistantPublic591SuccessorBinding,requireAssistantPublic591SuccessorOutput,\n  requireAssistantPublic591SuccessorRelease,assistantPublic591SuccessorMigration}\n  from './lib/assistant-later-h0-successor-source.mjs';\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';\nconst sha=v=>crypto.createHash('sha256').update(v).digest('hex');\n",
        "after": "  ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,\n  readAssistantPublic590PredecessorCanonicalSource,assistantPublic590SuccessorCheckpointContractFromBase,\n  requireAssistantPublic590SuccessorParent,requireAssistantPublic590SuccessorBinding,requireAssistantPublic590SuccessorOutput,\n  requireAssistantPublic590SuccessorRelease,assistantPublic590SuccessorMigration}\n  from './lib/assistant-later-h0-successor-source.mjs';\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';\nconst sha=v=>crypto.createHash('sha256').update(v).digest('hex');\n"
      },
      {
        "before": "  contractTail:\"    || E'\\\\n-- assistant-later-h0-original588-payload-validator --\\\\n' || v_ask588_payload_definition;\",\n  kind:'ASSISTANT_PUBLIC590_SUCCESSOR_STRUCTURE'});\n\nconst PUBLIC591=Object.freeze({\n  previous:ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,\n  previousRelease:591,validatorCount:39,\n  readPredecessor:readAssistantPublic591PredecessorCanonicalSource,\n  checkpointFromBase:assistantPublic591SuccessorCheckpointContractFromBase,\n  contractTail:\"    || E'\\\\n-- assistant-later-h0-original590-payload-validator --\\\\n' || v_ask590_payload_definition;\",\n  kind:'ASSISTANT_PUBLIC591_SUCCESSOR_STRUCTURE'});\n\nfunction fixedProfile(profile){\n  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590||profile===PUBLIC591,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');\n  return profile;\n}\nfunction metadata(source,next,inventory,OLD){\n",
        "after": "  contractTail:\"    || E'\\\\n-- assistant-later-h0-original588-payload-validator --\\\\n' || v_ask588_payload_definition;\",\n  kind:'ASSISTANT_PUBLIC590_SUCCESSOR_STRUCTURE'});\n\nfunction fixedProfile(profile){\n  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');\n  return profile;\n}\nfunction metadata(source,next,inventory,OLD){\n"
      },
      {
        "before": "  assert(options&&Object.getPrototypeOf(options)===Object.prototype);\n  assert.deepEqual(Object.keys(options),['version'],'Kun normal tidsstempelinput; ingen caller-valgt profil eller tuple');\n  return prepareStructure(PUBLIC590,options.version);\n}\n\nexport async function prepareAssistantPublic591SuccessorStructure(options){\n  assert.equal(arguments.length,1);\n  requireAssistantPublic591SuccessorParent(); // Before operands, model discovery or filesystem work.\n  assert(options&&Object.getPrototypeOf(options)===Object.prototype);\n  assert.deepEqual(Object.keys(options),['version'],'Kun normal tidsstempelinput; ingen caller-valgt profil eller tuple');\n  return prepareStructure(PUBLIC591,options.version);\n}\n\nasync function prepareStructure(profile,version){\n",
        "after": "  assert(options&&Object.getPrototypeOf(options)===Object.prototype);\n  assert.deepEqual(Object.keys(options),['version'],'Kun normal tidsstempelinput; ingen caller-valgt profil eller tuple');\n  return prepareStructure(PUBLIC590,options.version);\n}\n\nasync function prepareStructure(profile,version){\n"
      },
      {
        "before": "}\n\n\nexport async function buildAssistantPublic591BindingSuccessor(options){\n  assert.equal(arguments.length,1);\n  const core=await prepareAssistantPublic591SuccessorStructure(options);\n  const prior=await readAssistantPublic591PredecessorCanonicalSource();\n  const result=wrap(core,prior,PUBLIC591);\n  assert.equal(result.migrationIssued,false);assert.equal(result.productionAuthority,false);\n  return Object.freeze({...result,sameH0Capability:false,admission:'NO_ADMISSION'});\n}\n\n\nasync function main(){\n  const args=process.argv.slice(2);\n  if(args[0]==='--active'){\n    // Det eksisterende normale source-mål følger kun det kildeejede aktive objekt.\n    // De navngivne gamle CLI-indgange bevares til autentiske frozen-banker.\n    assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor'].includes(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase));\n    args.shift();args.unshift(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public591-successor'\n      ?'--public591-successor':ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor'\n      ?'--public590-successor':ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'\n      ?'--public588-successor':'--public587-successor');\n  }\n  const public591=args[0]==='--public591-successor';\n  if(public591)args.shift();\n  if(public591){\n    // Lukket ny indgang: NULL afvises før konstruktion, modelberegning eller fil-I/O.\n    const issued=requireAssistantPublic591SuccessorBinding(),pins=requireAssistantPublic591SuccessorOutput();\n    requireAssistantPublic591SuccessorRelease();\n    assert(args.length===0||(args.length===1&&['--check','--write'].includes(args[0])));\n    const result=await buildAssistantPublic591BindingSuccessor({version:issued.version});\n    assert.deepEqual(result.nextBinding,issued,'Only the actual physical issued C/I/T');\n    assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,\n      checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);\n    const migration=assistantPublic591SuccessorMigration(),file=path.join(ROOT,'supabase/migrations',migration.filename);\n    if(args[0]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});\n    else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));\n    console.log('Exact original-preserving assistant591 later-H0 metadata source checked; no installation or state admission.');\n    return;\n  }\n  const public590=args[0]==='--public590-successor';\n  if(public590)args.shift();\n",
        "after": "}\n\n\nasync function main(){\n  const args=process.argv.slice(2);\n  if(args[0]==='--active'){\n    // Det eksisterende normale source-mål følger kun det kildeejede aktive objekt.\n    // De navngivne gamle CLI-indgange bevares til autentiske frozen-banker.\n    assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor'].includes(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase));\n    args.shift();args.unshift(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor'\n      ?'--public590-successor':ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'\n      ?'--public588-successor':'--public587-successor');\n  }\n  const public590=args[0]==='--public590-successor';\n  if(public590)args.shift();\n"
      }
    ]
  }
});
// TEST DATA ONLY: exact593 capacity delta projects to complete issued592 before
// the unchanged592-to591 whole-source oracles. No runtime or original admission.
const reviewedCapacity593Sources=Object.freeze({
  "scripts/lib/established-native-current-origin.mjs": {
    "path": "scripts/lib/established-native-current-origin.mjs",
    "before": {
      "bytes": 85971,
      "sha256": "2aa92e6a2fb14f93e6072160499be1f39a502f4078bf61c98f649adfe538cf01"
    },
    "after": {
      "bytes": 86377,
      "sha256": "e802e02df74a53bb543d7d0e9107efd3850890a9f2c15e5d7c0c01b5229671cb"
    },
    "hunks": [
      [
        "import { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';\nimport { assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';\nimport { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './private-weather-component-pack.mjs';\nimport { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen584Snapshot } from './authenticated-frozen584-predecessor.mjs';\nimport { withAuthenticated584PredecessorSource } from '../check-account-statistics-assistant-predecessor-source.mjs';\n",
        "import { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';\nimport { assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';\nimport { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './private-weather-component-pack.mjs';\nimport { PRIVATE_CONDITIONS_MAX_BYTES } from './bounded-json-writer.mjs';\nimport { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen584Snapshot } from './authenticated-frozen584-predecessor.mjs';\nimport { withAuthenticated584PredecessorSource } from '../check-account-statistics-assistant-predecessor-source.mjs';\n"
      ],
      [
        "  const before = await readPointer(request), descriptor = before.pointer.current;\n  const seed = descriptor.bundleContentSha256 === SEED.B;\n  if (seedOnly) need(seed, 'SEED_CONTENT_CHANGED');\n  let conditions = seedOnly ? null : await json(path.join(ROOT, 'data/live/conditions.json'), MAX_CONDITIONS);\n  // Unknown/legacy input retains its OLD normal transitions; a claimed clean\n  // origin cannot silently downgrade to that route after a failed check.\n  if (!seed && descriptor.modelBinding.modelBundleSha256 !== currentSource.integrated) {\n",
        "  const before = await readPointer(request), descriptor = before.pointer.current;\n  const seed = descriptor.bundleContentSha256 === SEED.B;\n  if (seedOnly) need(seed, 'SEED_CONTENT_CHANGED');\n  const conditionsMaximum = !seed && (descriptor.modelBinding.modelBundleSha256 === currentSource.integrated\n    || descriptor.modelBinding.modelBundleSha256 === 'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')\n    ? PRIVATE_CONDITIONS_MAX_BYTES : MAX_CONDITIONS;\n  let conditions = seedOnly ? null : await json(path.join(ROOT, 'data/live/conditions.json'), conditionsMaximum);\n  // Unknown/legacy input retains its OLD normal transitions; a claimed clean\n  // origin cannot silently downgrade to that route after a failed check.\n  if (!seed && descriptor.modelBinding.modelBundleSha256 !== currentSource.integrated) {\n"
      ],
      [
        "        expected: { modelBinding: descriptor.modelBinding, contractHashes: descriptor.contractHashes,\n          datasetId: descriptor.datasetId, productionReferenceAt: descriptor.productionReferenceAt,\n          generatedAt: descriptor.generatedAt, bundleContentSha256: descriptor.bundleContentSha256 } });\n      const originalBytes = await ownedBytes(path.join(bundlePath, 'payload/data/live/conditions.json'), MAX_CONDITIONS);\n      const file = verified.files.find(row => row.relativePath === 'data/live/conditions.json');\n      need(file && file.bytes === originalBytes.length && file.sha256 === sha(originalBytes), 'B_CONDITIONS_CHANGED');\n      originalConditions = JSON.parse(originalBytes);\n",
        "        expected: { modelBinding: descriptor.modelBinding, contractHashes: descriptor.contractHashes,\n          datasetId: descriptor.datasetId, productionReferenceAt: descriptor.productionReferenceAt,\n          generatedAt: descriptor.generatedAt, bundleContentSha256: descriptor.bundleContentSha256 } });\n      const originalBytes = await ownedBytes(path.join(bundlePath, 'payload/data/live/conditions.json'),\n        seed ? MAX_CONDITIONS : PRIVATE_CONDITIONS_MAX_BYTES);\n      const file = verified.files.find(row => row.relativePath === 'data/live/conditions.json');\n      need(file && file.bytes === originalBytes.length && file.sha256 === sha(originalBytes), 'B_CONDITIONS_CHANGED');\n      originalConditions = JSON.parse(originalBytes);\n"
      ]
    ]
  },
  "scripts/lib/authenticated-frozen586-predecessor.mjs": {
    "path": "scripts/lib/authenticated-frozen586-predecessor.mjs",
    "before": {
      "bytes": 20438,
      "sha256": "ba09589cd0f3c48b734d60214ddf2017a7dc3ebba0e14c468da825721b575776"
    },
    "after": {
      "bytes": 20626,
      "sha256": "3f47d6808f563b456d173e63be919e79ec57bff959e8e216aeeeb9096d7b368b"
    },
    "hunks": [
      [
        "import {fileURLToPath,pathToFileURL} from 'node:url';\nimport {execFile as callbackExec} from 'node:child_process';\nimport {promisify,isDeepStrictEqual} from 'node:util';\nimport {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,\n  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,\n",
        "import {fileURLToPath,pathToFileURL} from 'node:url';\nimport {execFile as callbackExec} from 'node:child_process';\nimport {promisify,isDeepStrictEqual} from 'node:util';\nimport {PRIVATE_CONDITIONS_MAX_BYTES} from './bounded-json-writer.mjs';\nimport {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,\n  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,\n"
      ],
      [
        "}\nasync function readAuthenticatedPredecessor(){\n  need(arguments.length===0,'ARGUMENTS');\n  // These normal workflow paths select already restored immutable B; they are\n  // not authority. No consumed 0200/140000 upgrade flag is reused as permission.\n  const paths=await fixedPaths();\n",
        "}\nasync function readAuthenticatedPredecessor(){\n  need(arguments.length===0,'ARGUMENTS');\n  const conditionsMaximum=profile===FROZEN591?PRIVATE_CONDITIONS_MAX_BYTES:256*MB;\n  // These normal workflow paths select already restored immutable B; they are\n  // not authority. No consumed 0200/140000 upgrade flag is reused as permission.\n  const paths=await fixedPaths();\n"
      ],
      [
        "      expected:{modelBinding:descriptor.modelBinding,contractHashes:descriptor.contractHashes,datasetId:descriptor.datasetId,\n        productionReferenceAt:descriptor.productionReferenceAt,generatedAt:descriptor.generatedAt,bundleContentSha256:descriptor.bundleContentSha256}});\n    const conditionsPath=path.join(paths.bundlePath,'payload/data/live/conditions.json');\n    const originalBytes=await read(conditionsPath,256*MB);\n    const inventory=verified.files.find(row=>row.relativePath==='data/live/conditions.json');\n    need(inventory&&inventory.bytes===originalBytes.length&&inventory.sha256===sha(originalBytes),'B_CONDITIONS_CHANGED');\n    const conditions=JSON.parse(originalBytes.toString('utf8'));\n",
        "      expected:{modelBinding:descriptor.modelBinding,contractHashes:descriptor.contractHashes,datasetId:descriptor.datasetId,\n        productionReferenceAt:descriptor.productionReferenceAt,generatedAt:descriptor.generatedAt,bundleContentSha256:descriptor.bundleContentSha256}});\n    const conditionsPath=path.join(paths.bundlePath,'payload/data/live/conditions.json');\n    const originalBytes=await read(conditionsPath,conditionsMaximum);\n    const inventory=verified.files.find(row=>row.relativePath==='data/live/conditions.json');\n    need(inventory&&inventory.bytes===originalBytes.length&&inventory.sha256===sha(originalBytes),'B_CONDITIONS_CHANGED');\n    const conditions=JSON.parse(originalBytes.toString('utf8'));\n"
      ],
      [
        "      need(same(await checkpointRequest('?document_key=eq.'+encodeURIComponent(SKey)\n        +'&select=document_key,payload,version&limit=2',{},'read'),SRows),'S_CHANGED');\n      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');\n      need(sha(await read(conditionsPath,256*MB))===inventory.sha256,'B_CONDITIONS_CHANGED');\n      need(same(await qualifyProducer(descriptor.sourceHead,frozenRoot),producer),'SOURCE_CHANGED');\n    }catch(error){first=error;hasFirst=true;}\n    try{\n",
        "      need(same(await checkpointRequest('?document_key=eq.'+encodeURIComponent(SKey)\n        +'&select=document_key,payload,version&limit=2',{},'read'),SRows),'S_CHANGED');\n      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');\n      need(sha(await read(conditionsPath,conditionsMaximum))===inventory.sha256,'B_CONDITIONS_CHANGED');\n      need(same(await qualifyProducer(descriptor.sourceHead,frozenRoot),producer),'SOURCE_CHANGED');\n    }catch(error){first=error;hasFirst=true;}\n    try{\n"
      ],
      [
        "    // reach the normal pointer/version readers. No JSON/PASS/grant is read.\n    refreshers.set(handle,async()=>{\n      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');\n      need(sha(await read(conditionsPath,256*MB))===inventory.sha256,'B_CONDITIONS_CHANGED');\n      need(same(await pointer(),before),'SOURCE_CHANGED');\n      const SKey=protectedS.PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;\n      const versionRequest=protectedS.createProtectedRavScoreCheckpointVersionRequester();\n",
        "    // reach the normal pointer/version readers. No JSON/PASS/grant is read.\n    refreshers.set(handle,async()=>{\n      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');\n      need(sha(await read(conditionsPath,conditionsMaximum))===inventory.sha256,'B_CONDITIONS_CHANGED');\n      need(same(await pointer(),before),'SOURCE_CHANGED');\n      const SKey=protectedS.PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;\n      const versionRequest=protectedS.createProtectedRavScoreCheckpointVersionRequester();\n"
      ]
    ]
  }
});
function canonical592CapacitySource(source,file){
  const row=reviewedCapacity593Sources[file];if(!row)return source;
  const hash=value=>successorHash('sha256').update(value).digest('hex');
  const canonical=reviewedIssued592Sources[file];
  for(const p of [row.before,{bytes:canonical.canonicalBytes,sha256:canonical.canonicalSha256}])
    if(hash(source)===p.sha256){assert.equal(Buffer.byteLength(source),p.bytes);return source;}
  const original=source;assert.equal(Buffer.byteLength(source),row.after.bytes,'Exact593 capacity source size');
  assert.equal(hash(source),row.after.sha256,'Exact593 capacity whole source');
  for(const [old,current]of [...row.hunks].reverse()){assert.equal(source.split(current).length,2);source=source.replace(current,()=>old);}
  assert.equal(hash(source),row.before.sha256);assert.equal(Buffer.byteLength(source),row.before.bytes);
  let roundtrip=source;for(const [old,current]of row.hunks){assert.equal(roundtrip.split(old).length,2);roundtrip=roundtrip.replace(old,()=>current);}
  assert.equal(roundtrip,original,'Whole593-592-593 DATA roundtrip');return source;
}

function canonical591AssistantSource(source,file){
  assert.equal(typeof source,'string');source=source.replace(/\r\n?/g,'\n');
  const variant=reviewedIssued592Sources[file];assert(variant,'Only the five reviewed source owners');
  source=canonical592CapacitySource(source,file);
  const input=source,hash=value=>successorHash('sha256').update(value).digest('hex');
  if(hash(source)===variant.canonicalSha256){assert.equal(Buffer.byteLength(source),variant.canonicalBytes);return source;}
  assert.equal(hash(source),variant.currentSha256,'Exact reviewed592 whole source before test-only inverse');
  assert.equal(Buffer.byteLength(source),variant.currentBytes);
  for(const row of variant.inverse){assert.equal(source.split(row.before).length,2);source=source.replace(row.before,()=>row.after);}
  assert.equal(hash(source),variant.canonicalSha256);assert.equal(Buffer.byteLength(source),variant.canonicalBytes);
  let roundtrip=source;
  for(const row of [...variant.inverse].reverse()){assert.equal(roundtrip.split(row.after).length,2);roundtrip=roundtrip.replace(row.after,()=>row.before);}
  assert.equal(roundtrip,input,'Whole592-591-592 DATA roundtrip');return source;
}

const reviewedUnissued590Sources={
  "scripts/assistant-later-h0-binding-prewrite.mjs": {
    "beforeSha256": "8807414050da91659ceefc2d6957e78aecb791d09632ea806bc182668b02a55d",
    "afterSha256": "4f1b884c09647fb315cc7703ccefd5737ec7de3c2f38cac7e3d1b6019ab6066c",
    "beforeBytes": 23600,
    "afterBytes": 24155,
    "inverse": [
      {
        "before": "import {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\n",
        "after": "import {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\n"
      },
      {
        "before": "  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh,readAuthenticatedFrozen590Predecessor,\n  assertAuthenticatedFrozen590Snapshot,assertAuthenticatedFrozen590SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\n",
        "after": "  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\n"
      },
      {
        "before": "import {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan} from './integrated-cutover-readiness.mjs';\n",
        "after": "import {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan} from './integrated-cutover-readiness.mjs';\n"
      },
      {
        "before": "assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({\n  withSource:withAuthenticated590PredecessorSource,read:readAuthenticatedFrozen590Predecessor,\n  snapshot:assertAuthenticatedFrozen590Snapshot,fresh:assertAuthenticatedFrozen590SnapshotFresh,\n  plan:assertAssistantPublic590SuccessorMigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({\n",
        "after": "assert(['assistant-public587-successor','assistant-public588-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({\n"
      }
    ]
  },
  "scripts/lib/authenticated-frozen586-predecessor.mjs": {
    "beforeSha256": "7dc5e67341e25d13cd0669fb0c5fcda5af9b8abe45edd609255eafef41aab79d",
    "afterSha256": "67dc78cb89e552696e8642b13d23f0df0257a89f8e06036537f2dcab353ad655",
    "beforeBytes": 18284,
    "afterBytes": 19361,
    "inverse": [
      {
        "before": "  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE}\n",
        "after": "  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE}\n"
      },
      {
        "before": "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n",
        "after": "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n"
      },
      {
        "before": "const FROZEN590=Object.freeze({\n  sourceHead:FROZEN590_CODE_SOURCE_PROVENANCE.head,\n  requiredSha:Object.freeze([FROZEN590_CODE_SOURCE_PROVENANCE.originSha256,\n    FROZEN590_CODE_SOURCE_PROVENANCE.partPipelineSha256]),\n  withSource:withAuthenticated590PredecessorSource,\n  assertionPath:'scripts/lib/established-native-current-origin-590-assertion.mjs',\n  assertionExport:'assertFrozen590OriginSnapshotData',\n  temporaryPrefix:'rr-frozen590-snapshot-',errorPrefix:'FROZEN590_PREDECESSOR_'});\n",
        "after": ""
      },
      {
        "before": "\nconst snapshot590=fixedSnapshot(FROZEN590);\nexport async function readAuthenticatedFrozen590Predecessor(){\n  assertFrozen590CodeSourceSelected(); // Before paths, transport or callback.\n  return snapshot590.read(...arguments);\n}\nexport function assertAuthenticatedFrozen590Snapshot(handle){\n  return snapshot590.snapshot(...arguments);\n}\nexport async function assertAuthenticatedFrozen590SnapshotFresh(handle){\n  return snapshot590.fresh(...arguments);\n}\n",
        "after": ""
      }
    ]
  },
  "scripts/check-assistant-later-h0-predecessor-source.mjs": {
    "beforeSha256": "853f2fbdaca3471f11b01449a7040e66bc300acbc080df22d99315c5ea9fc9e1",
    "afterSha256": "00facf607532512e2c9e904a6147f8dc58af672cfcd8b6c08dfda8a46d83aa39",
    "beforeBytes": 31157,
    "afterBytes": 34155,
    "inverse": [
      {
        "before": "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n",
        "after": "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n"
      },
      {
        "before": "const ORIGINAL_590_ASSERTION_SUFFIX=ORIGINAL_588_ASSERTION_SUFFIX\n  .replace('// Removing this suffix restores whole Git SHA-256 5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69.',\n    '// The source-owned selected590 origin SHA and whole inverse are checked by this host.')\n  .replaceAll('588','590');\nconst ASSERTION_SUFFIX=profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n",
        "after": "const ASSERTION_SUFFIX=profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n"
      },
      {
        "before": "  if(profile===FROZEN590)assertFrozen590CodeSourceSelected(); // FIRST: no selected parent, no Git/I/O.\n",
        "after": ""
      },
      {
        "before": "    const builderArgs=profile===FROZEN590?['--public588-successor','--check']:\n      profile===FROZEN588?['--public587-successor','--check']:['--check'];\n",
        "after": "    const builderArgs=profile===FROZEN588?['--public587-successor','--check']:['--check'];\n"
      },
      {
        "before": "export const FROZEN590_CODE_SOURCE_PROVENANCE=Object.freeze({\n  selected:false,head:null,tree:null,candidateFiles:null,integratedFiles:null,\n  originSha256:null,partPipelineSha256:null,fullRuntimeContractSha256:null,publicProjectionContractSha256:null,\n});\nconst FROZEN590=Object.freeze({\n  ...FROZEN590_CODE_SOURCE_PROVENANCE,\n  builder:'scripts/build-assistant-later-h0-successor.mjs',\n  builderChecked:'Exact original-preserving calendar588 later-H0 metadata source checked; no installation or state admission.',\n  assertion:'scripts/lib/established-native-current-origin-590-assertion.mjs',temporaryPrefix:'rr-a590-source-',\n  candidate:'bca59cb435cb3f35041c665d2954f0ef04b189b572219771fc5628e4f7ccb551',\n  integrated:'4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819',\n  additionalMigrations:Object.freeze([...FROZEN588.additionalMigrations,Object.freeze({\n    path:'supabase/migrations/20261027124633_assistant_public588_later_h0_original_bound_successor.sql',\n    sha256:'eb0262716b66d29d52bf0ac4412c475ab5e9ea69e1cad15eabc9a31b48bcf821'})]),\n  runtimeContracts:Object.freeze({\n    continuationStateContractSha256:'d444e6141038f56dd04b97a55eefe07bbd98f122fb3b76a43bdddacff2d88c8a',\n    fullRuntimeContractSha256:FROZEN590_CODE_SOURCE_PROVENANCE.fullRuntimeContractSha256,\n    publicProjectionContractSha256:FROZEN590_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),\n});\n\n",
        "after": ""
      },
      {
        "before": "\nconst source590=fixedSource(FROZEN590);\nexport function assertFrozen590CodeSourceSelected(){\n  assert.equal(arguments.length,0);const source=FROZEN590_CODE_SOURCE_PROVENANCE;\n  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles','originSha256','partPipelineSha256','publicProjectionContractSha256','selected','tree']);\n  assert.equal(source.selected,true,'FROZEN590_CODE_SOURCE_UNSELECTED');\n  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);\n  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);\n  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])assert.match(source[key],/^[a-f0-9]{64}$/);\n  return source; // Fixed source data only, never a CI/PASS or runtime capability.\n}\nexport async function withAuthenticated590PredecessorSource(callback){\n  assertFrozen590CodeSourceSelected();return source590(...arguments);\n}\n",
        "after": ""
      }
    ]
  },
  "scripts/lib/established-native-current-origin.mjs": {
    "beforeSha256": "bc3da0ace8094f36bc221e5d023620e42f8153e9082780141e48372ca7c1f2b0",
    "afterSha256": "516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c",
    "beforeBytes": 77912,
    "afterBytes": 81982,
    "inverse": [
      {
        "before": "  readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot,\n  readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot}\n",
        "after": "  readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot}\n"
      },
      {
        "before": "// Én fast ægte590-forgænger. Aktuel kilde bindes af sourceIdentity/hele I-manifestet;\n// controllerens outputpins importeres ikke i modelkernen (ingen selvhashcyklus).\nasync function readFrozen590LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){\n  const oldI='4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819';\n  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'590_FAMILY');\n  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');\n  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'590_LATER_TARGET');\n  const snapshot=assertAuthenticatedFrozen590Snapshot(await readAuthenticatedFrozen590Predecessor());\n  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'590_ORIGINAL_CHANGED');\n  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();\n  need(descriptor.contractHashes.continuationStateContractSha256==='d444e6141038f56dd04b97a55eefe07bbd98f122fb3b76a43bdddacff2d88c8a'\n    &&snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256==='bca59cb435cb3f35041c665d2954f0ef04b189b572219771fc5628e4f7ccb551',\n    '590_FIXED_ORIGINAL_BINDING');\n  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate\n    &&contracts.continuationStateContractSha256===currentSource.continuation\n    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256\n    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,\n    '590_ISSUED_CURRENT_SOURCE');\n  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)\n    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)\n    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),\n    '590_METADATA_ONLY');\n  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt\n    &&same(conditions[ATTEST],snapshot.attestation),'590_WHOLE_PARENT_CHANGED');\n  const pairs=pairsFromConditions(conditions,parts);\n  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())\n    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'590_PARTS');\n  for(const[id,pair]of pairs){\n    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];\n    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);\n    need(inverseI.modelBundleSha256===I.modelBundleSha256,'590_CURRENT_PAIR_BINDING');\n    inverseI.modelBundleSha256=originalI.modelBundleSha256;\n    if(Object.hasOwn(inverseG,'modelBundleSha256')){\n      need(inverseG.modelBundleSha256===C.modelBundleSha256,'590_CURRENT_CANDIDATE_BINDING');\n      inverseG.modelBundleSha256=originalG.modelBundleSha256;\n    }\n    need(same(inverseI,originalI)&&same(inverseG,originalG),'590_WHOLE_PAIR_INVERSE');\n  }\n  need(same(await readPointer(request),before),'SOURCE_CHANGED');\n  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\n\n",
        "after": ""
      },
      {
        "before": "    if(descriptor.modelBinding.modelBundleSha256==='4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819')\n      return readFrozen590LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n",
        "after": ""
      }
    ]
  }
};
function historical691AssistantSource(source,file){
  source=canonical591AssistantSource(source,file);const variant=reviewedUnissued590Sources[file];assert(variant);
  // Finite test-only DATA inverse; the old whole UNISSUED/691 oracle below stays exact.
  if(file==='scripts/check-assistant-later-h0-predecessor-source.mjs'
    &&successorHash('sha256').update(source).digest('hex')==='0c0b447d20b222daf5d119c60e814605f69572bc5b7f748d8174dc728fd9e87b'){
    assert.equal(Buffer.byteLength(source),34477);
    const current="export const FROZEN590_CODE_SOURCE_PROVENANCE=Object.freeze({\n  selected:true,head:'2712b6556acd33d3d06ff1a9b5f55b5b620f1ee9',tree:'e3fa7dd3eb7ec873deefb73148ad6bae0f0df725',candidateFiles:98,integratedFiles:97,\n  originSha256:'bc3da0ace8094f36bc221e5d023620e42f8153e9082780141e48372ca7c1f2b0',partPipelineSha256:'8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758',\n  fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',publicProjectionContractSha256:'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09',\n});\n",prior="export const FROZEN590_CODE_SOURCE_PROVENANCE=Object.freeze({\n  selected:false,head:null,tree:null,candidateFiles:null,integratedFiles:null,\n  originSha256:null,partPipelineSha256:null,fullRuntimeContractSha256:null,publicProjectionContractSha256:null,\n});\n";
    assert.equal(source.split(current).length,2);source=source.replace(current,()=>prior);
    assert.equal(successorHash('sha256').update(source).digest('hex'),'00facf607532512e2c9e904a6147f8dc58af672cfcd8b6c08dfda8a46d83aa39');
    assert.equal(Buffer.byteLength(source),34155);
  }
  assert.equal(successorHash('sha256').update(source).digest('hex'),variant.afterSha256);
  assert.equal(Buffer.byteLength(source),variant.afterBytes);
  for(const row of variant.inverse){assert.equal(source.split(row.before).length,2);source=source.replace(row.before,()=>row.after);}
  assert.equal(successorHash('sha256').update(source).digest('hex'),variant.beforeSha256);
  assert.equal(Buffer.byteLength(source),variant.beforeBytes);return source;
}

// Den historiske588-kalder prøves fortsat med sine hele oprindelige bytes.
// Kun den gennemgåede f7→b574-inverse må skabe denne testvisning; ingen runtimeautoritet.
function historical588PrewriteSource(source){
  source=source.replace(/\r\n?/g,'\n');
  assert.equal(successorHash('sha256').update(source).digest('hex'),'8807414050da91659ceefc2d6957e78aecb791d09632ea806bc182668b02a55d');
  const inverse=[
  {
    "before": "import {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\n",
    "after": "import {withAuthenticated587PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\n"
  },
  {
    "before": "  assertAuthenticatedFrozen587SnapshotFresh,readAuthenticatedFrozen588Predecessor,\n  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\n",
    "after": "  assertAuthenticatedFrozen587SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\n"
  },
  {
    "before": "import {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan} from './integrated-cutover-readiness.mjs';\n",
    "after": "import {assertAssistantPublic587SuccessorMigrationPlan} from './integrated-cutover-readiness.mjs';\n"
  },
  {
    "before": "// Ingen caller-/miljøvalgt familie. Begge profiler beholder deres egne opaque handles.\nassert(['assistant-public587-successor','assistant-public588-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({\n  withSource:withAuthenticated588PredecessorSource,read:readAuthenticatedFrozen588Predecessor,\n  snapshot:assertAuthenticatedFrozen588Snapshot,fresh:assertAuthenticatedFrozen588SnapshotFresh,\n  plan:assertAssistantPublic588SuccessorMigrationPlan\n}):Object.freeze({\n  withSource:withAuthenticated587PredecessorSource,read:readAuthenticatedFrozen587Predecessor,\n  snapshot:assertAuthenticatedFrozen587Snapshot,fresh:assertAuthenticatedFrozen587SnapshotFresh,\n  plan:assertAssistantPublic587SuccessorMigrationPlan\n});\n",
    "after": ""
  },
  {
    "before": "  await prewriteAt('PREPARE','FROZEN_SOURCE',()=>ACTIVE_PREDECESSOR.withSource(async frozenRoot=>{\n",
    "after": "  await prewriteAt('PREPARE','FROZEN_SOURCE',()=>withAuthenticated587PredecessorSource(async frozenRoot=>{\n"
  },
  {
    "before": "  const handle=await prewriteAt('PREPARE','SNAPSHOT',()=>ACTIVE_PREDECESSOR.read());\n  const snapshot=await prewriteAt('PREPARE','SNAPSHOT',()=>ACTIVE_PREDECESSOR.snapshot(handle));\n",
    "after": "  const handle=await prewriteAt('PREPARE','SNAPSHOT',()=>readAuthenticatedFrozen587Predecessor());\n  const snapshot=await prewriteAt('PREPARE','SNAPSHOT',()=>assertAuthenticatedFrozen587Snapshot(handle));\n"
  },
  {
    "before": "  await prewriteAt('PREPARE','FRESH_SNAPSHOT',()=>ACTIVE_PREDECESSOR.fresh(handle));\n",
    "after": "  await prewriteAt('PREPARE','FRESH_SNAPSHOT',()=>assertAuthenticatedFrozen587SnapshotFresh(handle));\n"
  },
  {
    "before": "  const result=await ACTIVE_PREDECESSOR.plan({migrationListText,dryRunText,migrationsDirectory:path.join(directory,'supabase/migrations')});\n",
    "after": "  const result=await assertAssistantPublic587SuccessorMigrationPlan({migrationListText,dryRunText,migrationsDirectory:path.join(directory,'supabase/migrations')});\n"
  },
  {
    "before": "  const handle=await ACTIVE_PREDECESSOR.read(),snapshot=ACTIVE_PREDECESSOR.snapshot(handle);\n",
    "after": "  const handle=await readAuthenticatedFrozen587Predecessor(),snapshot=assertAuthenticatedFrozen587Snapshot(handle);\n"
  },
  {
    "before": "  await source(true);await ACTIVE_PREDECESSOR.fresh(handle);return checked;\n",
    "after": "  await source(true);await assertAuthenticatedFrozen587SnapshotFresh(handle);return checked;\n"
  }
];
  for(const row of inverse){assert.equal(source.split(row.before).length,2);source=source.replace(row.before,()=>row.after);}
  assert.equal(successorHash('sha256').update(source).digest('hex'),'869d93119cb9ba2968b39259ecd3d6500797f17ec514c7df39b04dbf8328e0e8');
  return source;
}

test('assistant binding original prewrite keeps one bank pass and normal owned readers before fresh identity',async()=>{
  const currentSource=await fs.readFile(path.join(ROOT,'scripts/assistant-later-h0-binding-prewrite.mjs'),'utf8');
  const priorSource=historical691AssistantSource(currentSource,'scripts/assistant-later-h0-binding-prewrite.mjs');
  for(const [source,freshCall]of [[historical588PrewriteSource(priorSource),'await assertAuthenticatedFrozen587SnapshotFresh(handle)'],
    [priorSource,'await ACTIVE_PREDECESSOR.fresh(handle)'],[currentSource,'await ACTIVE_PREDECESSOR.fresh(handle)']]){
  const prepare=source.slice(source.indexOf('async function prepare(p){'),source.indexOf('async function plan(){'));
  const plan=source.slice(source.indexOf('async function plan(){'),source.indexOf('async function boundedJsonText'));
  const verify=source.slice(source.indexOf('async function verify(p){'),source.indexOf('async function main(){'));
  assert(!prepare.includes('await bank('));assert(!plan.includes('readAuthenticatedFrozen587Predecessor'));
  for(const normal of ['identity=ownFileDescriptorIdentity(fd)','await ownedFileDescriptorClosed(fd,identity)',
    'current.dev===parent.dev&&current.ino===parent.ino','await handle.read(buffer','await handle.stat({bigint:true})',
    'failedCloses.set(absolute,handle)','await ownedRead(file,maximum,true)'])assert(source.includes(normal),normal);
  assert(!source.includes('createReadStream'));assert(!source.includes('await fs.readFile(file)'));
  assert.equal((source.match(/await bank\(p,snapshot\)/g)||[]).length,1);
  assert(verify.indexOf('await bank(p,snapshot)')<verify.indexOf('await source(true)'));
  assert(verify.indexOf('await source(true)')>=0);assert(verify.indexOf(freshCall)>=0);
  assert(verify.indexOf('await source(true)')<verify.indexOf(freshCall));
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
  }
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
  assert(readiness.includes("assert.ok(remote.has(assistantPublic587SuccessorMigration().version),'ASSISTANT_PUBLIC587_SUCCESSOR_PREWRITE_ROUTE_REQUIRED')"));
});
test('assistant binding original prewrite exact source-import variants reject changed bytes and preserve old variants',async()=>{
  for(const file of ['scripts/lib/authenticated-frozen586-predecessor.mjs','scripts/assistant-later-h0-binding-prewrite.mjs']){
    const source=await fs.readFile(path.join(ROOT,file),'utf8');
    for(const view of [historical691AssistantSource(source,file),source]){
      const imports=modelSourceRelativeModuleSpecifiers(view,file);assert(imports.length>0);
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(view+'\n// changed\n',file),/Whole reviewed model import source changed/);
    }
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
  const currentSource=await fs.readFile(path.join(ROOT,'scripts/assistant-later-h0-binding-prewrite.mjs'),'utf8');
  const priorSource=historical691AssistantSource(currentSource,'scripts/assistant-later-h0-binding-prewrite.mjs');
  for(const variant of [{source:historical588PrewriteSource(priorSource),phase:null},
    {source:priorSource,phase:'assistant-public587-successor'},{source:priorSource,phase:'assistant-public588-successor'},
    {source:currentSource,phase:'assistant-public587-successor'},{source:currentSource,phase:'assistant-public588-successor'},
    {source:currentSource,phase:'assistant-public590-successor'}]){
  const source=variant.source;
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
      async withAuthenticated587PredecessorSource(use){
        tick('FROZEN_SOURCE');let first,failed=false,result;
        try{result=await use('frozen-root');}catch(e){first=e;failed=true;}
        try{tick('SOURCE_CLEANUP');}catch(e){if(!failed){first=e;failed=true;}}
        if(failed)throw first;return result;
      },
      async readAuthenticatedFrozen587Predecessor(){tick('SNAPSHOT');return 'opaque-fixture-handle';},
      assertAuthenticatedFrozen587Snapshot(handle){assert.equal(handle,'opaque-fixture-handle');tick('SNAPSHOT_ACCESSOR');return selected;},
      async originalFiles(){tick('ORIGINAL_FILES');},
      async assertAuthenticatedFrozen587SnapshotFresh(handle){assert.equal(handle,'opaque-fixture-handle');tick('FRESH_SNAPSHOT');},
      async centralProof(){tick('CENTRAL');return {};},baseline:()=>({synthetic:true}),
      fs:{async writeFile(file,text,options){tick('BASELINE_WRITE');assert.equal(file,'baseline');
        assert.equal(options.flag,'wx');assert.equal(options.mode,0o600);}},
    };
    // Samme syntetiske kaldersøm: faktisk routelogik, ikke ægte parent, snapshot eller B/S-autoritet.
    let route='';
    if(variant.phase!==null){
      context.ACTIVE=Object.freeze({sourcePhase:variant.phase});
      context.assertAssistantPublic587SuccessorMigrationPlan=()=>{throw new Error('UNEXPECTED_PLAN_IN_PREPARE');};
      context.assertAssistantPublic588SuccessorMigrationPlan=()=>{throw new Error('UNEXPECTED_PLAN_IN_PREPARE');};
      context.assertAssistantPublic590SuccessorMigrationPlan=()=>{throw new Error('UNEXPECTED_PLAN_IN_PREPARE');};
      for(const names of [['withAuthenticated587PredecessorSource','withAuthenticated588PredecessorSource','withAuthenticated590PredecessorSource'],
        ['readAuthenticatedFrozen587Predecessor','readAuthenticatedFrozen588Predecessor','readAuthenticatedFrozen590Predecessor'],
        ['assertAuthenticatedFrozen587Snapshot','assertAuthenticatedFrozen588Snapshot','assertAuthenticatedFrozen590Snapshot'],
        ['assertAuthenticatedFrozen587SnapshotFresh','assertAuthenticatedFrozen588SnapshotFresh','assertAuthenticatedFrozen590SnapshotFresh']]){
        const original=context[names[0]],selected=['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor'].indexOf(variant.phase);assert(selected>=0);
        for(const [i,name]of names.entries())context[name]=i===selected?original:()=>{throw new Error('WRONG_FIXED_PREDECESSOR_FAMILY');};
      }
      const start=source.indexOf('// Ingen caller-/miljøvalgt familie.');
      const end=source.indexOf('const ROOT=',start);assert(start>=0&&end>start);route=source.slice(start,end);
      assert(route.includes('const ACTIVE_PREDECESSOR='));
    }
    const api=runInNewContext(route+'\n'+diagnostic+'\n'+executablePrepare+
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
    ['FROZEN586_PREDECESSOR_B_S_DIFFER','SNAPSHOT_B_S_DIFFER'],
    ['FROZEN587_PREDECESSOR_B_S_DIFFER','SNAPSHOT_B_S_DIFFER'],
    ['FROZEN587_PREDECESSOR_PRODUCER_POLICY_CHANGED','SNAPSHOT_PRODUCER_POLICY'],[1,'PROCESS_EXIT'],['PRIVATE_CANARY','UNCLASSIFIED_ERROR']]){
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

// Additiv, endnu uafviklet 587→588-konstruktørkontrakt. Ingen SQL-/B/S-admission.
import {createHash as successorHash} from 'node:crypto';
import {
  ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,
  ASSISTANT_PUBLIC587_SUCCESSOR_OUTPUT,ASSISTANT_PUBLIC587_SUCCESSOR_RELEASE,
  ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,requireAssistantPublic587SuccessorBinding,
  requireAssistantPublic587SuccessorOutput,requireAssistantPublic587SuccessorRelease,
  assistantPublic587SuccessorMigration,readAssistantPublic587PredecessorCanonicalSource,
  readAssistantLaterH0CanonicalSource,readAssistantPublic587SuccessorCanonicalSource
} from './lib/assistant-later-h0-successor-source.mjs';
import {prepareAssistantPublic587SuccessorStructure}
  from './build-assistant-later-h0-successor.mjs';
test('assistant public587 successor is fixed and UNISSUED before I/O',async t=>{
  assert.equal(ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.sourceHead,'aab72babd27175a4276c2a2f1965c74bb021b4af');
  assert.equal(ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.sourceTree,'959f63d40c3980e804caa750da227cbd96e34a49');
  if(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING!==null){
    requireAssistantPublic587SuccessorRelease();const next=requireAssistantPublic587SuccessorBinding();
    const whole=await readAssistantPublic587SuccessorCanonicalSource();
    assert.equal(whole.admission,'NO_ADMISSION');
    assert.equal(whole.migration.version,next.version);
    assert.equal(successorHash('sha256').update(whole.canonicalSource).digest('hex'),
      requireAssistantPublic587SuccessorOutput().canonicalSha256);
    return; // Udstedt kilde kontrolleres faktisk; det er ikke installeret/native bevis.
  }
  assert.equal(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,null);
  assert.equal(ASSISTANT_PUBLIC587_SUCCESSOR_OUTPUT,null);
  assert.equal(ASSISTANT_PUBLIC587_SUCCESSOR_RELEASE,null);
  assert.deepEqual(ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES.map(row=>row.name),
    ['ravradar_ravscore_checkpoint_ask587_state_valid','ravradar_ravscore_checkpoint_ask587_payload_valid']);
  let io=0;
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    for(const requireIssued of [requireAssistantPublic587SuccessorBinding,requireAssistantPublic587SuccessorOutput,
      requireAssistantPublic587SuccessorRelease,assistantPublic587SuccessorMigration])
      assert.throws(()=>requireIssued(),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
    for(const options of [{version:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.version},
      {version:'20261101000000',profile:'586'},{version:'20261101000000',C:'0'.repeat(64)},
      {version:'20261101000000',repositoryRoot:ROOT},{version:'20261101000000',sourceHead:'0'.repeat(40)},
      {version:'20261101000000',canonicalSource:'SYNTHETIC_NOT_AUTHORITY'}])
      await assert.rejects(prepareAssistantPublic587SuccessorStructure(options),error=>error.code==='ERR_ASSERTION');
    await assert.rejects(readAssistantPublic587SuccessorCanonicalSource(),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
    assert.equal(io,0,'Udstedelsesafslag og ukendte input må ikke nå fysisk kilde');
  }finally{t.mock.restoreAll();}
});
test('assistant public587 successor reads only whole genuine issued587 canonical source',async t=>{
  const old=await readAssistantLaterH0CanonicalSource();
  const next=await readAssistantPublic587PredecessorCanonicalSource();
  assert.equal(next.canonicalSource,old.canonicalSource,'Hele udstedte587-kilde genbruges uden alias som ny runtime');
  assert.equal(next.admission,'NO_ADMISSION');
  assert.equal(next.migration.filename,'20261022181403_assistant_later_h0_original_bound_successor.sql');
  assert.equal(successorHash('sha256').update(next.canonicalSource).digest('hex'),ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.canonicalSha256);
  assert.deepEqual({C:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.C,I:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.I,
    T:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.T,version:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.version},
    ASSISTANT_LATER_H0_BINDING);
  const actualRead=fs.readFile;
  let changed=0;
  t.mock.method(fs,'readFile',async function(file,...args){
    const value=await actualRead.call(fs,file,...args);
    if(path.basename(String(file))===next.migration.filename){
      changed++;assert(Buffer.isBuffer(value));return Buffer.concat([value,Buffer.from(' ')]);
    }
    return value;
  });
  try{
    await assert.rejects(readAssistantPublic587PredecessorCanonicalSource(),error=>error.code==='ERR_ASSERTION');
    assert.equal(changed,1,'Én hel migrationsmutation afvises ved den normale hashkontrol');
  }finally{t.mock.restoreAll();}
  await assert.rejects(readAssistantPublic587PredecessorCanonicalSource({sourceHead:'0'.repeat(40)}));
});

// Faste587-kilde-/snapshotmål. Ingen ny tuple, B/S-kvittering, SQL eller runtimeadgang.
import {withAuthenticated587PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';
import {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,
  assertAuthenticatedFrozen587SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';
test('assistant public587 fixed readers refuse caller profiles and JSON handles before I/O',async t=>{
  let io=0,callbacks=0,operands=0;
  const poison=new Proxy({},{get(){operands++;throw new Error('UNEXPECTED_OPERAND');}});
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    await assert.rejects(withAuthenticated587PredecessorSource(()=>{callbacks++;},poison),{code:'ERR_ASSERTION'});
    await assert.rejects(withAuthenticated587PredecessorSource(poison),{code:'ERR_ASSERTION'});
    await assert.rejects(readAuthenticatedFrozen587Predecessor(poison),/FROZEN587_PREDECESSOR_ARGUMENTS/);
    for(const value of [{},Object.freeze({status:'PASS'}),{sourceFamilyHead:'aab72babd27175a4276c2a2f1965c74bb021b4af'}]){
      assert.throws(()=>assertAuthenticatedFrozen587Snapshot(value),/FROZEN587_PREDECESSOR_HANDLE/);
      await assert.rejects(assertAuthenticatedFrozen587SnapshotFresh(value),/FROZEN587_PREDECESSOR_HANDLE/);
      assert.throws(()=>assertAuthenticatedFrozen586Snapshot(value),/FROZEN586_PREDECESSOR_HANDLE/);
      await assert.rejects(assertAuthenticatedFrozen586SnapshotFresh(value),/FROZEN586_PREDECESSOR_HANDLE/);
    }
    assert.throws(()=>assertAuthenticatedFrozen587Snapshot({},poison),/FROZEN587_PREDECESSOR_ARGUMENTS/);
    await assert.rejects(assertAuthenticatedFrozen587SnapshotFresh({},poison),/FROZEN587_PREDECESSOR_ARGUMENTS/);
    assert.equal(io,0);assert.equal(callbacks,0);assert.equal(operands,0);
  }finally{t.mock.restoreAll();}
});
test('assistant public587 import variants bind whole sources and reject every unknown mutation',async()=>{
  for(const [file,expected]of [
    ['scripts/check-assistant-later-h0-predecessor-source.mjs',[]],
    ['scripts/lib/authenticated-frozen586-predecessor.mjs',['../check-assistant-later-h0-predecessor-source.mjs']],
  ]){
    const source=await fs.readFile(path.join(ROOT,file),'utf8');
    assert.deepEqual([...modelSourceRelativeModuleSpecifiers(source,file)],expected);
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n// unknown mutation\n',file),/Whole reviewed model import source changed/);
    assert.throws(()=>modelSourceRelativeModuleSpecifiers({},file),/Reviewed model source must be a string/);
    const withUnknownImport=source+"\nimport './unreviewed-source.mjs';\n";
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(withUnknownImport,file),/Whole reviewed model import source changed/);
  }
  const catalog=await fs.readFile(path.join(ROOT,'scripts/lib/model-source-imports.mjs'),'utf8');
  for(const old of ['2e529a7a4e1cca1ab7ac1c16dd7292ca78263bfb980eff95c3f5c6d845eca04d',
    'd0ab8aa27c30aafdcc66ff120c748c05fbf4144c6aca71493a2c97710728137c',
    '4807e6e08c487a0cf7ed398dbe29be588c4bcb58b211778932cc9f36a0681df6'])assert(catalog.includes(old));
});
test('assistant public587 genuine DATA host keeps fixed family and exact producer ancestor policy seam',async()=>{
  const {runInNewContext}=await import('node:vm'),{createHash}=await import('node:crypto');
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const actualAuth=canonical591AssistantSource(await fs.readFile(path.join(ROOT,'scripts/lib/authenticated-frozen586-predecessor.mjs'),'utf8'),'scripts/lib/authenticated-frozen586-predecessor.mjs');
  const start=actualAuth.indexOf('const FROZEN587=Object.freeze({'),end=actualAuth.indexOf('const FROZEN588=Object.freeze({',start);
  assert(start>=0&&end>start);const profileSource=actualAuth.slice(start,end);
  assert.equal(hash(profileSource),'5f2b912b83735ba76b6424dd8ed0783604631ade26cf148abf66e97c7361adc1','Den hele historiske587-profil er byteuændret');
  const nextStart=actualAuth.indexOf('const FROZEN590=Object.freeze({'),nextEnd=actualAuth.indexOf('const snapshot586=',nextStart);
  assert(nextStart>=0&&nextEnd>nextStart);
  assert.equal(hash(actualAuth.slice(nextStart,nextEnd)),'5bf42b1521dc175ef186c898e3d758e53152a9d100718bc9282af8a6b10742c3','Den faste nye590-profil vælges ikke via en caller');
  const profile=runInNewContext(profileSource+'\nFROZEN587;',{Object,withAuthenticated587PredecessorSource});
  assert.equal(profile.sourceHead,'aab72babd27175a4276c2a2f1965c74bb021b4af');
  const actualProducer=actualAuth.slice(actualAuth.indexOf('async function qualifyProducer('),actualAuth.indexOf('async function fixedPaths('));
  const actualRequired=actualAuth.slice(actualAuth.indexOf('const REQUIRED='),actualAuth.indexOf('const REQUIRED_SHA='));
  const actualPolicy=actualAuth.slice(actualAuth.indexOf('const POLICY='),actualAuth.indexOf('const ATTEST='));
  assert(actualProducer.startsWith('async function qualifyProducer('));assert(actualProducer.endsWith('}\n'));
  let verifiedRoot;
  await withAuthenticated587PredecessorSource(async frozenRoot=>{
    verifiedRoot=frozenRoot;
    const candidate=await import(pathToFileURL(path.join(frozenRoot,'scripts/rollback-assets/ravscore-model-bundle.generated.js')).href);
    const integrated=await import(pathToFileURL(path.join(frozenRoot,'js/core/ravscore-model-bundle.generated.js')).href);
    assert.equal(candidate.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files.length,98);
    assert.equal(integrated.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files.length,97);
    assert.equal(candidate.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,'5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4');
    assert.equal(integrated.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,'5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2');
    const origin=await fs.readFile(path.join(frozenRoot,'scripts/lib/established-native-current-origin.mjs'));
    const assertion=await fs.readFile(path.join(frozenRoot,profile.assertionPath));
    assert.equal(hash(origin),'5ebeea93ee7da95011ecc3c589e2a1a54a7ac821ad938997aea0b6444aa607bf');
    assert.deepEqual(assertion.subarray(0,origin.length),origin,'Hele normale origin-krop bevares, ikke kun udvalgte felter');
    const suffix=assertion.subarray(origin.length).toString('utf8');
    assert(suffix.includes('assertFrozen587OriginSnapshotData'));assert(!suffix.includes('assertFrozen586OriginSnapshotData'));
    assert(suffix.includes('validateMetadata585Attestation'));assert(suffix.includes('validateMetadata584Attestation'));
    assert(suffix.includes('else validateAttestation('));assert(!suffix.includes('new WeakMap'));
    assert.equal(hash(await fs.readFile(path.join(frozenRoot,'supabase/migrations/20261022181403_assistant_later_h0_original_bound_successor.sql'))),
      'b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7');

    // Den ægte funktion og ægte frosne filbytes; Git-svar er syntetiske kontrollerede INPUTS.
    // Dette beviser ikke en virkelig generations forfædre, B/S eller snapshotadgang.
    const sourceFamily=profile.sourceHead,producer='b'.repeat(40),consumer='c'.repeat(40);
    const files=['scripts/lib/established-native-current-origin.mjs','scripts/lib/ravscore-production-part-pipeline.mjs'];
    const policy='scripts/lib/dmi-marine-zone-exclusions.json',policyBlob='a4f65f8eb0396dbe3c3da442ebcb9a06d99d3287';
    assert.notEqual(producer,sourceFamily);
    for(const refusal of [null,'ANCESTOR','FROZEN_SOURCE_CHANGED','PRODUCER_SEMANTICS_CHANGED',
      'FROZEN_POLICY_CHANGED','PRODUCER_POLICY_CHANGED','SOURCE_POLICY_CHANGED','SOURCE_HEAD','PRODUCER']){
      const calls=[],ancestorError=new Error('SYNTHETIC_ANCESTOR_REFUSAL');
      const git=async args=>{
        calls.push([...args]);
        if(args[0]==='merge-base'){
          assert.deepEqual([...args],['merge-base','--is-ancestor',producer,consumer]);
          if(refusal==='ANCESTOR')throw ancestorError;return '';
        }
        assert.equal(args[0],'rev-parse');
        if(args[1]==='HEAD')return consumer;
        for(const [index,file]of files.entries()){
          if(args[1]===sourceFamily+':'+file)return String(index+1).repeat(40);
          if(args[1]===producer+':'+file)return refusal==='PRODUCER_SEMANTICS_CHANGED'?'f'.repeat(40):String(index+1).repeat(40);
        }
        for(const [head,code]of [[sourceFamily,'FROZEN_POLICY_CHANGED'],[producer,'PRODUCER_POLICY_CHANGED'],['HEAD','SOURCE_POLICY_CHANGED']])
          if(args[1]===head+':'+policy)return refusal===code?'0'.repeat(40):policyBlob;
        assert.fail('Ukendt Git-operand i normal producer-seam');
      };
      const context={Object,HEAD:/^[a-f0-9]{40}$/,SOURCE:sourceFamily,REQUIRED_SHA:profile.requiredSha,
        path,sha:hash,git,process:{env:{GITHUB_SHA:refusal==='SOURCE_HEAD'?'d'.repeat(40):consumer}},
        need(value,code){if(!value)throw Object.assign(new Error(code),{code});},
        fs:{async readFile(file){
          const raw=await fs.readFile(file);
          return refusal==='FROZEN_SOURCE_CHANGED'?Buffer.concat([raw,Buffer.from(' ')]):raw;
        }}};
      const qualify=runInNewContext(actualRequired+actualPolicy+actualProducer+'\nqualifyProducer;',context);
      if(refusal===null){
        const result=await qualify(producer,frozenRoot);
        assert.deepEqual({...result},{consumerHead:consumer,producerHead:producer,sourceFamilyHead:sourceFamily,ownerPolicyGitBlob:policyBlob});
        assert(calls.some(row=>row[0]==='merge-base'),'Senere producent accepteres kun gennem den uændrede ancestor-kontrol');
      }else await assert.rejects(qualify(refusal==='PRODUCER'?'invalid':producer,frozenRoot),
        error=>refusal==='ANCESTOR'?error===ancestorError:error.code===refusal);
    }
    // Normal frozen587 protected-S-læser: kanonisk sti, ingen syntetisk PASS/restore.
    const normal=await import(pathToFileURL(path.join(frozenRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    let requests=0;const request=async()=>{requests++;return [];};
    const target=path.join(frozenRoot,'no-created-fixture','.cache','ravscore-continuation-checkpoint','checkpoint.json');
    await assert.rejects(normal.restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath:path.join(frozenRoot,'original-S.json'),targetReference:'2026-10-25T00:00:00.000Z',request,
    }),/dedicated \.cache path/);
    assert.equal(requests,0);
    const result=await normal.restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath:target,targetReference:'2026-10-25T00:00:00.000Z',request,
    });
    assert.equal(requests,1);assert.equal(result.reason,'protected-checkpoint-not-found');assert.equal(result.targetUnchanged,true);
    await assert.rejects(fs.access(target),/ENOENT/);
  });
  await assert.rejects(fs.access(verifiedRoot),/ENOENT/);
});

// Faste aktive587→588-kaldere. DATA-/kontraktmål, ikke autentificeret produktions-B/S.
import {ACTIVE_ASSISTANT_SUCCESSOR,assertAssistantPublic587SuccessorTarget,ISSUED_ASSISTANT_PUBLIC588_PROFILE,
  ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,
  requireAssistantPublic588SuccessorOutput,requireAssistantPublic588SuccessorRelease}
  from './lib/assistant-later-h0-successor-source.mjs';
import {selectAssistantLaterH0Source} from './assistant-later-h0-runtime-transition.mjs';
import * as PUBLIC590 from './lib/assistant-later-h0-successor-source.mjs';
import {INACTIVE_ASSISTANT_PUBLIC588_SUCCESSOR} from './lib/assistant-later-h0-successor-source.mjs';
import {withAuthenticated590PredecessorSource,FROZEN590_CODE_SOURCE_PROVENANCE}
  from './check-assistant-later-h0-predecessor-source.mjs';
import {readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot,assertAuthenticatedFrozen590SnapshotFresh}
  from './lib/authenticated-frozen586-predecessor.mjs';
import {DEFAULT_CUTOVER_SOURCE_PHASE,assistantPublic587SuccessorRequiredMigrations,assistantPublic588SuccessorRequiredMigrations,
  assistantPublic590SuccessorRequiredMigrations,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationsApplied,
  assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic587SuccessorMigrationsApplied,
  assertSupabaseMigrationPlan,assertSupabaseMigrationsApplied,buildIntegratedCutoverReadiness}
  from './integrated-cutover-readiness.mjs';
import {synchronizeRavScoreModelBinding,assistantPublic587SuccessorCheckpointInspectionView,
  assistantPublic588SuccessorCheckpointInspectionView,assistantPublic590SuccessorCheckpointInspectionView}
  from './sync-ravscore-model-binding.mjs';

test('assistant public587 ordinary caller uses real top-level workflow identity before selecting original data',async t=>{
  const entrypoints=await Promise.all(['update-and-deploy.yml','run-current-weather-once.yml'].map(async file=>{
    const source=await fs.readFile(path.join(ROOT,'.github/workflows',file),'utf8');
    const match=/^name: (.+)$/m.exec(source);assert(match,'Actual top-level caller has a fixed name');
    assert(source.includes('uses: ./.github/workflows/reusable-weather-build.yml'));
    return match[1].trim();
  }));
  assert.deepEqual(entrypoints,['Update weather and deploy RavRadar','Run current RavRadar weather once']);
  const descriptor={modelBinding:{modelBundleSha256:ACTIVE_ASSISTANT_SUCCESSOR.before.I},
    contractHashes:{continuationStateContractSha256:ACTIVE_ASSISTANT_SUCCESSOR.before.T},
    productionReferenceAt:'2026-10-25T12:00:00.000Z'};
  const ordinaryOnly=['CHECKPOINT_ONLY','QUICK_CONFIRMATION','COMPLETED_PRIVATE_RUNTIME',
    'NATIVE_IDENTITY_RECOVERY','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER'];
  const base={GITHUB_WORKFLOW:entrypoints[1],GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',
    GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:'a'.repeat(40),OPERATIONAL_ACTION:'integrated',
    RUNNER_TEMP:path.join(ROOT,'.cache','synthetic-caller-no-files'),
    RAVRADAR_PRODUCTION_TARGET_HOUR:'2026-10-25T16:00:00.000Z',
    ...Object.fromEntries(ordinaryOnly.map(key=>[key,'false']))};
  const keys=Object.keys(base),prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  let reads=0;
  t.mock.method(fs,'readFile',async(file,encoding)=>{
    assert.equal(file,path.join(base.RUNNER_TEMP,'private-runtime-current-source.json'));
    assert.equal(encoding,'utf8');reads++;return JSON.stringify(descriptor);
  });
  t.mock.method(globalThis,'fetch',()=>{throw new Error('NO_NETWORK_IN_CALLER_SELECTION');});
  for(const method of ['writeFile','appendFile','mkdir','mkdtemp','rm','unlink','rename'])
    t.mock.method(fs,method,()=>{throw new Error('NO_WRITE_IN_CALLER_SELECTION');});
  try{
    for(const name of entrypoints)for(const event of ['workflow_dispatch','schedule'])
      for(const action of ['integrated','integrated-historical-maintenance']){
        Object.assign(process.env,base,{GITHUB_WORKFLOW:name,GITHUB_EVENT_NAME:event,OPERATIONAL_ACTION:action});
        const before={...process.env};assert.equal(await selectAssistantLaterH0Source(),true);
        assert.deepEqual({...process.env},before,'The actual caller identity is never rewritten');
      }
    assert.equal(reads,8);
    for(const [key,value]of [...Object.entries({GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',
      GITHUB_REF:'refs/heads/other',GITHUB_EVENT_NAME:'push',GITHUB_RUN_ATTEMPT:'0',
      GITHUB_SHA:'A'.repeat(40),OPERATIONAL_ACTION:'integrated-cutover'}),
      ...ordinaryOnly.map(key=>[key,'true'])]){
      Object.assign(process.env,base,{[key]:value});await assert.rejects(selectAssistantLaterH0Source());
    }
    for(const target of ['2026-10-25T12:00:00.000Z','2026-10-25T11:00:00.000Z','invalid']){
      Object.assign(process.env,base,{RAVRADAR_PRODUCTION_TARGET_HOUR:target});
      await assert.rejects(selectAssistantLaterH0Source());
    }
    for(const family of [ACTIVE_ASSISTANT_SUCCESSOR.requireBinding().I,ASSISTANT_LATER_H0_BEFORE.I,'f'.repeat(64)]){
      descriptor.modelBinding.modelBundleSha256=family;
      Object.assign(process.env,base,{GITHUB_WORKFLOW:'Not an ordinary caller',RAVRADAR_PRODUCTION_TARGET_HOUR:'invalid'});
      assert.equal(await selectAssistantLaterH0Source(),false,'Only the exact predecessor selects the transition');
    }
  }finally{
    t.mock.restoreAll();for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}
  }
});

test('assistant public587 active facade is fixed and refuses UNISSUED before I/O',async t=>{
  // Den gamle588-facades oprindelige assertions kører fortsat på dens navngivne eksport.
  async function checkHistoricalFacade(ACTIVE_ASSISTANT_SUCCESSOR,DEFAULT_CUTOVER_SOURCE_PHASE){
  assert(Object.isFrozen(ACTIVE_ASSISTANT_SUCCESSOR));
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.before,ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE);
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.requireOutput,requireAssistantPublic587SuccessorOutput);
  assert.equal(DEFAULT_CUTOVER_SOURCE_PHASE,'assistant-public587-successor');
  if(ACTIVE_ASSISTANT_SUCCESSOR.binding!==null){
    requireAssistantPublic587SuccessorRelease();
    const required=assistantPublic587SuccessorRequiredMigrations();
    assert.equal(required.length,57);assert.equal(required.at(-2).version,ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.version);
    assert.equal(required.at(-1).version,ACTIVE_ASSISTANT_SUCCESSOR.requireBinding().version);
    const whole=await ACTIVE_ASSISTANT_SUCCESSOR.readCanonicalSource();
    const view=assistantPublic587SuccessorCheckpointInspectionView(whole.canonicalSource);
    for(const alias of [...ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,
      {name:'ravradar_ravscore_checkpoint_ask586_state_valid'},{name:'ravradar_ravscore_checkpoint_ask586_payload_valid'},
      {name:'ravradar_ravscore_checkpoint_noc585_state_valid'},{name:'ravradar_ravscore_checkpoint_noc585_payload_valid'}]){
      assert(whole.canonicalSource.includes('function public.'+alias.name+'('));
      assert(!view.includes('create or replace function public.'+alias.name+'('));
      assert(view.includes('revoke all on function public.'+alias.name+'('),
        'Kontrolvisningen bevarer originalens eksplicitte adgangsafslag');
    }
    for(const changed of [whole.canonicalSource+'\n',whole.canonicalSource.replace('ask587_state_valid','ask587_unknown_valid')])
      assert.throws(()=>assistantPublic587SuccessorCheckpointInspectionView(changed));
    return;
  }
  let io=0;
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat','readdir'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    for(const invoke of [selectAssistantLaterH0Source,prepareAssistantLaterH0Runtime,installAssistantLaterH0Runtime,
      ()=>readAssistantLaterH0RetentionInput('2026-10-25T20:00:00.000Z'),
      ()=>synchronizeRavScoreModelBinding({write:true}),()=>assertAssistantPublic587SuccessorMigrationPlan({}),
      ()=>assertSupabaseMigrationPlan({}),()=>buildIntegratedCutoverReadiness('a'.repeat(40),{})])
      await assert.rejects(invoke,/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
    for(const invoke of [assistantPublic587SuccessorRequiredMigrations,
      ()=>assertAssistantPublic587SuccessorMigrationsApplied(''),
      ()=>assertSupabaseMigrationsApplied(''),()=>assistantPublic587SuccessorCheckpointInspectionView('')])
      assert.throws(invoke,/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
    withBindingPrewriteEnv({},()=>assert.throws(()=>assertAssistantBindingPrewriteCaller(),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/));
    assert.equal(io,0);
  }finally{t.mock.restoreAll();}
  }
  await checkHistoricalFacade(ISSUED_ASSISTANT_PUBLIC588_PROFILE,ISSUED_ASSISTANT_PUBLIC588_PROFILE.sourcePhase);
  // Hele den allerede udstedte590-kontrakt prøves altid på sin navngivne profil.
  async function checkIssued590Facade(ACTIVE_ASSISTANT_SUCCESSOR,DEFAULT_CUTOVER_SOURCE_PHASE){
  assert(Object.isFrozen(ACTIVE_ASSISTANT_SUCCESSOR));
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.before,ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE);
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.requireOutput,requireAssistantPublic588SuccessorOutput);
  assert.equal(DEFAULT_CUTOVER_SOURCE_PHASE,'assistant-public588-successor');
  requireAssistantPublic588SuccessorRelease();
  const required=assistantPublic588SuccessorRequiredMigrations(),historical=assistantPublic587SuccessorRequiredMigrations();
  assert.equal(required.length,58);assert.deepEqual(required.slice(0,-1),historical);
  assert.equal(required.at(-2).version,ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE.version);
  assert.equal(required.at(-1).version,ACTIVE_ASSISTANT_SUCCESSOR.requireBinding().version);
  const whole=await ACTIVE_ASSISTANT_SUCCESSOR.readCanonicalSource();
  const view=assistantPublic588SuccessorCheckpointInspectionView(whole.canonicalSource);
  for(const alias of [...ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,...ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,
    {name:'ravradar_ravscore_checkpoint_ask586_state_valid'},{name:'ravradar_ravscore_checkpoint_ask586_payload_valid'},
    {name:'ravradar_ravscore_checkpoint_noc585_state_valid'},{name:'ravradar_ravscore_checkpoint_noc585_payload_valid'}]){
    assert(whole.canonicalSource.includes('function public.'+alias.name+'('));
    assert(!view.includes('create or replace function public.'+alias.name+'('));
    assert(view.includes('revoke all on function public.'+alias.name+'('));
  }
  for(const changed of [whole.canonicalSource+'\n',whole.canonicalSource.replace('ask588_state_valid','ask588_unknown_valid')])
    assert.throws(()=>assistantPublic588SuccessorCheckpointInspectionView(changed));
  }
  await checkIssued590Facade(INACTIVE_ASSISTANT_PUBLIC588_SUCCESSOR,INACTIVE_ASSISTANT_PUBLIC588_SUCCESSOR.sourcePhase);
  assert(Object.isFrozen(ACTIVE_ASSISTANT_SUCCESSOR));
  assert([ISSUED_ASSISTANT_PUBLIC588_PROFILE,INACTIVE_ASSISTANT_PUBLIC588_SUCCESSOR,
    PUBLIC590.INACTIVE_ASSISTANT_PUBLIC590_SUCCESSOR,PUBLIC590.INACTIVE_ASSISTANT_PUBLIC591_SUCCESSOR].includes(ACTIVE_ASSISTANT_SUCCESSOR));
  assert.equal(DEFAULT_CUTOVER_SOURCE_PHASE,ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase);
  const next=PUBLIC590.INACTIVE_ASSISTANT_PUBLIC590_SUCCESSOR;
  assert.equal(next.sourcePhase,'assistant-public590-successor');
  assert.equal(next.before,PUBLIC590.ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE);
  assert.equal(next.requireBinding,PUBLIC590.requireAssistantPublic590SuccessorBinding);
  assert.equal(next.requireOutput,PUBLIC590.requireAssistantPublic590SuccessorOutput);
  assert.equal(PUBLIC590.ASSISTANT_PUBLIC590_SUCCESSOR_PARENT.selected,FROZEN590_CODE_SOURCE_PROVENANCE.selected);
  if(next.binding===null){
    assert.notEqual(ACTIVE_ASSISTANT_SUCCESSOR,next);assert.equal(next.output,null);
    assert.equal(PUBLIC590.ASSISTANT_PUBLIC590_SUCCESSOR_RELEASE,null);
    const parentSelected=PUBLIC590.ASSISTANT_PUBLIC590_SUCCESSOR_PARENT.selected;
    assert.equal(typeof parentSelected,'boolean');
    if(!parentSelected){
      assert.equal(PUBLIC590.ASSISTANT_PUBLIC590_SUCCESSOR_PARENT.sourceHead,null);
      assert.equal(PUBLIC590.ASSISTANT_PUBLIC590_SUCCESSOR_PARENT.sourceTree,null);
    }
    const refusal=parentSelected?/ASSISTANT_PUBLIC590_SUCCESSOR_UNISSUED/:/ASSISTANT_PUBLIC590_PARENT_UNSELECTED/;
    let io=0,callbacks=0;
    for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat','readdir','stat'])
      t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_590_IO');});
    t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_590_NETWORK');});
    try{
      for(const invoke of [next.requireBinding,next.requireOutput,next.requireRelease,next.migration,
        assistantPublic590SuccessorRequiredMigrations,()=>assertAssistantPublic590SuccessorMigrationsApplied(''),
        ()=>assistantPublic590SuccessorCheckpointInspectionView('')])assert.throws(invoke,refusal);
      for(const invoke of [()=>next.readCanonicalSource(),()=>assertAssistantPublic590SuccessorMigrationPlan({})])
        await assert.rejects(invoke,refusal);
      if(!parentSelected){
        assert.throws(PUBLIC590.requireAssistantPublic590SuccessorParent,/ASSISTANT_PUBLIC590_PARENT_UNSELECTED/);
        await assert.rejects(PUBLIC590.readAssistantPublic590PredecessorCanonicalSource(),/ASSISTANT_PUBLIC590_PARENT_UNSELECTED/);
        await assert.rejects(withAuthenticated590PredecessorSource(()=>{callbacks++;}),/FROZEN590_CODE_SOURCE_UNSELECTED/);
        await assert.rejects(readAuthenticatedFrozen590Predecessor(),/FROZEN590_CODE_SOURCE_UNSELECTED/);
      }
      // JSON, CI/PASS-tekst og ukendte objekter er aldrig WeakMap-håndtag.
      for(const handle of [null,{},Object.freeze({status:'PASS'}),JSON.parse('{"status":"PASS"}')]){
        assert.throws(()=>assertAuthenticatedFrozen590Snapshot(handle),/FROZEN590_PREDECESSOR_HANDLE/);
        await assert.rejects(assertAuthenticatedFrozen590SnapshotFresh(handle),/FROZEN590_PREDECESSOR_HANDLE/);
      }
      assert.equal(io,0);assert.equal(callbacks,0);
    }finally{t.mock.restoreAll();}
  }else{
    // Kun den faktisk kildeudstedte successor må åbne disse normale positive kontraktprøver.
    PUBLIC590.requireAssistantPublic590SuccessorParent();next.requireBinding();next.requireOutput();next.requireRelease();
    const required=assistantPublic590SuccessorRequiredMigrations(),prior=assistantPublic588SuccessorRequiredMigrations();
    assert.equal(required.length,59);assert.deepEqual(required.slice(0,-1),prior);
    assert.equal(required.at(-2).version,next.before.version);assert.equal(required.at(-1).version,next.requireBinding().version);
    const whole=await next.readCanonicalSource(),view=assistantPublic590SuccessorCheckpointInspectionView(whole.canonicalSource);
    for(const alias of [...PUBLIC590.ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,...ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,
      ...ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,
      {name:'ravradar_ravscore_checkpoint_ask586_state_valid'},{name:'ravradar_ravscore_checkpoint_ask586_payload_valid'},
      {name:'ravradar_ravscore_checkpoint_noc585_state_valid'},{name:'ravradar_ravscore_checkpoint_noc585_payload_valid'}]){
      assert(whole.canonicalSource.includes('function public.'+alias.name+'('));
      assert(!view.includes('create or replace function public.'+alias.name+'('));
      assert(view.includes('revoke all on function public.'+alias.name+'('));
    }
    for(const changed of [whole.canonicalSource+'\n',whole.canonicalSource.replace('ask590_state_valid','ask590_unknown_valid')])
      assert.throws(()=>assistantPublic590SuccessorCheckpointInspectionView(changed));
  }
});

test('assistant public587 target preserves fixed original binding and strictly later hour',()=>{
  const descriptor={modelBinding:{modelBundleSha256:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.I},
    contractHashes:{continuationStateContractSha256:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.T},
    productionReferenceAt:'2026-10-25T16:00:00.000Z'},before=structuredClone(descriptor);
  assert.equal(assertAssistantPublic587SuccessorTarget(descriptor,'2026-10-25T17:00:00.000Z'),true);
  for(const hour of ['2026-10-25T16:00:00.000Z','2026-10-25T15:00:00.000Z','2026-10-25T17:01:00.000Z','invalid'])
    assert.throws(()=>assertAssistantPublic587SuccessorTarget(descriptor,hour));
  for(const changed of [
    {...descriptor,modelBinding:{modelBundleSha256:ASSISTANT_LATER_H0_BEFORE.I}},
    {...descriptor,contractHashes:{continuationStateContractSha256:ASSISTANT_LATER_H0_BEFORE.T}},
    {...descriptor,modelBinding:{modelBundleSha256:'f'.repeat(64)}},
  ])assert.throws(()=>assertAssistantPublic587SuccessorTarget(changed,'2026-10-25T17:00:00.000Z'));
  assert.throws(()=>assertAssistantPublic587SuccessorTarget(descriptor,'2026-10-25T17:00:00.000Z',{}));
  assert.deepEqual(descriptor,before);
});

test('assistant public587 origin retains whole parent and pair refusals in the actual normal arm',async()=>{
  const {runInNewContext}=await import('node:vm');
  const source=await fs.readFile(path.join(ROOT,'scripts/lib/established-native-current-origin.mjs'),'utf8');
  const begin='async function readFrozen587LaterOrigin(',end='\nasync function readOrigin(';
  assert.equal(source.split(begin).length,2);assert.equal(source.split(end).length,2);
  const body=source.slice(source.indexOf(begin),source.indexOf(end));
  assert(!source.includes("from './assistant-later-h0-successor-source.mjs'"),'Ingen I-selvhashcyklus');
  const identity=source.slice(source.indexOf('async function sourceIdentity('),source.indexOf('function registryParts('));
  for(const exact of ["I_MANIFEST.files.find","sha(physical) === row.sha256","['diff', '--exit-code', 'HEAD', '--', ...leaves]",
    "HEAD:scripts/lib/dmi-marine-zone-exclusions.json","'SOURCE_POLICY_CHANGED'"])assert(identity.includes(exact),exact);
  for(const change of [null,'family','same-hour','earlier-hour','snapshot','registry','old-T','old-C','current-I',
    'parent','pair-value','candidate-value','extra-key','pointer','registry-read']){
    // Lille DATA-fixture i den eksisterende VM-kaldersøm. Den kvalificerer
    // hverken 673 dele, et ægte opaque snapshot eller en produktionsattest.
    const old=ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,next={I:'1'.repeat(64),C:'2'.repeat(64),T:'3'.repeat(64)};
    const descriptor={modelBinding:{modelBundleSha256:old.I},contractHashes:{continuationStateContractSha256:old.T},
      datasetId:'synthetic',productionReferenceAt:'2026-10-25T16:00:00.000Z'};
    const originalI={modelBundleSha256:old.I,value:1,extra:{retained:true}},originalG={modelBundleSha256:old.C,value:2};
    const central={synthetic:true},parent={whole:{retained:[1,null]}},before={version:1};
    const snapshot={descriptor:structuredClone(descriptor),centralContract:central,attestation:parent,
      checkpoint:{modelBinding:{modelBundleSha256:old.I},candidateGRollbackCompanion:{
        modelBinding:{modelBundleSha256:old.C},states:{part:originalG}},states:{part:originalI},generationSha256:'4'.repeat(64)}};
    const conditions={datasetId:descriptor.datasetId,productionReferenceAt:descriptor.productionReferenceAt,
      privateEstablishedNativeCurrentOrigin:parent};
    const pair={integrated:{...structuredClone(originalI),modelBundleSha256:next.I},
      candidate:{...structuredClone(originalG),modelBundleSha256:next.C}};
    const currentSource={integrated:next.I,candidate:next.C,continuation:next.T};
    let target='2026-10-25T17:00:00.000Z',pointer=before,registry=central,authenticated=0;
    if(change==='family')descriptor.modelBinding.modelBundleSha256=ASSISTANT_LATER_H0_BEFORE.I;
    if(change==='same-hour')target=descriptor.productionReferenceAt;
    if(change==='earlier-hour')target='2026-10-25T15:00:00.000Z';
    if(change==='snapshot')snapshot.descriptor.datasetId='changed';
    if(change==='registry')snapshot.centralContract={changed:true};
    if(change==='old-T'){descriptor.contractHashes.continuationStateContractSha256='5'.repeat(64);snapshot.descriptor=structuredClone(descriptor);}
    if(change==='old-C')snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256='6'.repeat(64);
    if(change==='current-I')currentSource.integrated='7'.repeat(64);
    if(change==='parent')conditions.privateEstablishedNativeCurrentOrigin={changed:true};
    if(change==='pair-value')pair.integrated.value++;
    if(change==='candidate-value')pair.candidate.value++;
    if(change==='extra-key')pair.integrated.unknown=true;
    if(change==='pointer')pointer={version:2};
    if(change==='registry-read')registry={changed:true};
    const contexts=new WeakMap(),opaque=Object.freeze({}),parts=new Map(),pairs=new Map([['part',pair]]);
    const need=(value,code)=>{if(!value)throw new Error(code);};
    const invoke=runInNewContext(body+'\nreadFrozen587LaterOrigin;',{
      need,same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),process:{env:{RAVRADAR_PRODUCTION_TARGET_HOUR:target}},
      readAuthenticatedFrozen587Predecessor:async()=>{authenticated++;return opaque;},
      assertAuthenticatedFrozen587Snapshot:handle=>{assert.equal(handle,opaque);return snapshot;},
      privateRuntimeContractHashes:async()=>({continuationStateContractSha256:next.T}),
      ravScoreModelBinding:()=>({modelBundleSha256:next.I}),candidateBinding:()=>({modelBundleSha256:next.C}),
      pairsFromConditions:()=>pairs,readPointer:async()=>pointer,json:async()=>registry,
      ROOT,path,MB:1024*1024,ATTEST:'privateEstablishedNativeCurrentOrigin',contexts,structuredClone,
    },{filename:'actual-public587-origin-arm-data-only.js'});
    const args={descriptor,before,request:null,conditions,central,parts,currentSource};
    if(change===null){
      const handle=await invoke(args),stored=contexts.get(handle);assert(stored);
      assert.equal(stored.generationSha256,snapshot.checkpoint.generationSha256);
      assert.equal(stored.pairs,pairs);assert.equal(stored.finalized,false);assert.equal(stored.consumedParts.size,0);
    }else await assert.rejects(invoke(args));
    assert.equal(authenticated,['family','same-hour','earlier-hour'].includes(change)?0:1);
  }
});

test('assistant public587 operative import variants remain whole-source bound',async()=>{
  for(const file of ['scripts/assistant-later-h0-binding-prewrite.mjs','scripts/lib/established-native-current-origin.mjs',
    'scripts/lib/authenticated-frozen586-predecessor.mjs','scripts/check-assistant-later-h0-predecessor-source.mjs']){
    const source=(await fs.readFile(path.join(ROOT,file),'utf8')).replace(/\r\n?/g,'\n');
    for(const view of [historical691AssistantSource(source,file),source]){
      const imports=modelSourceRelativeModuleSpecifiers(view,file);assert(Object.isFrozen(imports));
      for(const changed of [view+'\n',view+"\nimport './unknown.mjs';\n"])
        assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/);
    }
    assert.throws(()=>modelSourceRelativeModuleSpecifiers({},file),/must be a string/);
  }
  const prewrite=await fs.readFile(path.join(ROOT,'scripts/assistant-later-h0-binding-prewrite.mjs'),'utf8');
  for(const row of prewrite.matchAll(/FROZEN586_PREDECESSOR_([A-Z_]+):'([A-Z_]+)'/g))
    assert(prewrite.includes("FROZEN587_PREDECESSOR_"+row[1]+":'"+row[2]+"'"));
  const pkg=JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8'));
  assert.equal(pkg.scripts['test:assistant-later-h0-source'],
    'node scripts/build-assistant-later-h0-successor.mjs --active --check');
  const builder=canonical591AssistantSource(await fs.readFile(path.join(ROOT,'scripts/build-assistant-later-h0-successor.mjs'),'utf8'),'scripts/build-assistant-later-h0-successor.mjs');
  const from=builder.indexOf('  const issued=public587?requireAssistantPublic587SuccessorBinding()'),to=builder.indexOf('\n}\nif(process.argv[1]',from);
  assert(from>=0&&to>from);
  assert.equal(successorHash('sha256').update(builder.slice(from,to)).digest('hex'),'a9dae0f55e685015441b8c0d3d528f563f3703a17e72927e3a000e2cabcc6edb',
    'Hele den normale historiske587/588-konstruktørgren bevares');
});

test('assistant public587 late Edge route preserves exact prior profile and ordinary gates',async()=>{
  const {deferCurrentGridBindingEdges,currentGridEdgePublicationRequired}=
    await import('./lib/production-workflow-sources.mjs');
  if(ACTIVE_ASSISTANT_SUCCESSOR.binding===null){
    await assert.rejects(currentGridEdgePublicationRequired({},'integrated-historical-maintenance'),
      ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor'
        ?(PUBLIC590.ASSISTANT_PUBLIC590_SUCCESSOR_PARENT.selected?/ASSISTANT_PUBLIC590_SUCCESSOR_UNISSUED/:/ASSISTANT_PUBLIC590_PARENT_UNSELECTED/)
        :ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'?/ASSISTANT_PUBLIC588_SUCCESSOR_UNISSUED/:/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
    assert.equal(deferCurrentGridBindingEdges('20990101000000'),false);return;
  }
  const next=ACTIVE_ASSISTANT_SUCCESSOR.requireBinding(),binding=ravScoreModelBinding();
  assert.equal(binding.modelBundleSha256,next.I);
  assert.equal(deferCurrentGridBindingEdges(ACTIVE_ASSISTANT_SUCCESSOR.migration().version),true);
  const old={model:'integrated',status:'INTEGRATED_ACTIVE',pending:false,
    modelBinding:{...binding,modelBundleSha256:ACTIVE_ASSISTANT_SUCCESSOR.before.I}};
  assert.equal(await currentGridEdgePublicationRequired(old,'integrated-historical-maintenance'),true);
  assert.equal(await currentGridEdgePublicationRequired({...old,modelBinding:binding},'integrated-historical-maintenance'),false);
  for(const changed of [{...old,pending:true},{...old,status:'UNKNOWN'},{...old,model:'candidate'},
    {...old,modelBinding:{...old.modelBinding,modelBundleSha256:ASSISTANT_LATER_H0_BEFORE.I}},
    {...old,modelBinding:{...old.modelBinding,modelBundleSha256:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.I}},
    ...(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor'
      ?[{...old,modelBinding:{...old.modelBinding,modelBundleSha256:ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE.I}}]:[]),
    {...old,modelBinding:{...old.modelBinding,modelContractSha256:'f'.repeat(64)}}])
    await assert.rejects(currentGridEdgePublicationRequired(changed,'integrated-historical-maintenance'));
  for(const action of ['integrated','code-only','unknown'])
    await assert.rejects(currentGridEdgePublicationRequired(old,action));
  assert.equal(deferCurrentGridBindingEdges('20990101000000'),false);
});

test('ordinary companion readers use the exact active predecessor before and after providers',async()=>{
  const {compileFunction}=await import('node:vm'),{isDeepStrictEqual}=await import('node:util');
  const crypto=await import('node:crypto'),os=await import('node:os');
  const profiles=await import('./lib/assistant-later-h0-successor-source.mjs');
  const source=(await fs.readFile(path.join(ROOT,'scripts/read-authenticated-dmi-current-companions.mjs'),'utf8')).replace(/\r\n/g,'\n');
  const start=source.indexOf('export async function readCurrentPrivateRuntimeCompanionInput(');
  const end=source.indexOf('\nexport { readAuthenticatedCurrentCompanions };',start);
  assert(start>=0&&end>start,'Actual normal reader boundaries');
  const selectorStart=source.indexOf('const ACTIVE_PREDECESSOR=');
  const selectorEnd=source.indexOf('\nconst ROOT',selectorStart);
  if(selectorStart>=0)assert(selectorEnd>selectorStart,'Actual fixed family selector boundary');
  const selector=selectorStart<0?'':source.slice(selectorStart,selectorEnd);
  const factory=compileFunction(selector+'\n'+source.slice(start,end).replaceAll('export async function','async function')
    +'\nreturn {readCurrentPrivateRuntimeCompanionInput,readCurrentPrivateRuntimeCompanions};',
    ['ACTIVE','ravScoreModelBinding','process','path','fs','ROOT','crypto','isDeepStrictEqual','refuse',
      'readAssistantLaterH0RetentionInput','verifyPrivateProductionRuntimeBundle',
      'readAuthenticatedFrozen587Predecessor','assertAuthenticatedFrozen587Snapshot',
      'readAuthenticatedFrozen588Predecessor','assertAuthenticatedFrozen588Snapshot',
      'readAuthenticatedFrozen590Predecessor','assertAuthenticatedFrozen590Snapshot',
      'readAuthenticatedFrozen591Predecessor','assertAuthenticatedFrozen591Snapshot',
      'readAuthenticatedCurrentCompanions']);
  const target='2026-10-27T20:00:00.000Z';
  // Routing-only fixtures: no real B/S, opaque authority, model values or I/O.
  for(const profile of [profiles.ACTIVE_ASSISTANT_SUCCESSOR,profiles.INACTIVE_ASSISTANT_PUBLIC590_SUCCESSOR,profiles.ISSUED_ASSISTANT_PUBLIC588_PROFILE]){
    const expectedFamily=profile.sourcePhase==='assistant-public591-successor'?'591'
      :profile.sourcePhase==='assistant-public590-successor'?'590'
      :profile.sourcePhase==='assistant-public588-successor'?'588':'587';
    assert(profile.before.I&&profile.binding.I&&profile.before.I!==profile.binding.I);
    const env={RUNNER_TEMP:path.join(os.tmpdir(),'synthetic-companion-runner'),
      RAVRADAR_PRIVATE_RUNTIME_ROOT:path.join(os.tmpdir(),'synthetic-companion-private')};
    env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE=path.join(env.RAVRADAR_PRIVATE_RUNTIME_ROOT,'bundle');
    let descriptorI=profile.before.I,localI=profile.binding.I,changedDescriptor=false,changedSnapshot=false;
    let descriptorReads=0,retentionReads=0,directReads=0,companionReads=0;
    const families=[],originalPath=path.join(env.RAVRADAR_PRIVATE_RUNTIME_ROOT,'synthetic-original.json');
    const original={synthetic:'unchanged original weather'},contexts=[{synthetic:'original companion'}];
    const snapshot={descriptor:{bundleContentSha256:'b'.repeat(64)},conditionsPath:originalPath,
      verified:{bundleContentSha256:'b'.repeat(64)}};
    const view={verified:snapshot.verified,conditions:{synthetic:'metadata-only working view'}};
    const descriptor=()=>Buffer.from(JSON.stringify({modelBinding:{modelBundleSha256:descriptorI},
      bundleContentSha256:'b'.repeat(64)}));
    const mockFs={lstat:async()=>({isFile:()=>true,isSymbolicLink:()=>false,size:descriptor().length}),
      readFile:async file=>{
        if(file===originalPath)return Buffer.from(JSON.stringify(original));
        assert.equal(file,path.join(env.RUNNER_TEMP,'private-runtime-current-source.json'));
        descriptorReads++;return changedDescriptor&&descriptorReads>1?Buffer.from('{}'):descriptor();
      }};
    const readFamily=family=>async()=>{families.push(family);return{family};};
    const snapshotFamily=family=>handle=>{
      assert.equal(handle.family,family);
      return changedSnapshot&&families.length>1?{...snapshot,changed:true}:snapshot;
    };
    const normal=factory(profile,()=>({modelBundleSha256:localI}),{env},path,mockFs,ROOT,crypto,isDeepStrictEqual,
      reason=>{throw Error(reason);},async()=>{retentionReads++;return view;},
      async()=>{directReads++;throw Error('SYNTHETIC_STRICT_NORMAL_MODEL_CHECK');},
      readFamily('587'),snapshotFamily('587'),readFamily('588'),snapshotFamily('588'),
      readFamily('590'),snapshotFamily('590'),readFamily('591'),snapshotFamily('591'),
      async(verified,conditions)=>{companionReads++;assert.equal(verified,snapshot.verified);
        assert.deepEqual(conditions,original);return contexts;});
    assert.equal(await normal.readCurrentPrivateRuntimeCompanionInput(target),view);
    assert.equal(retentionReads,1);assert.equal(directReads,0);
    descriptorReads=0;
    assert.equal(await normal.readCurrentPrivateRuntimeCompanions(target),contexts);
    assert.equal(retentionReads,1,'After providers must not re-enter the pre-provider working-view reader');
    assert.deepEqual(families,[expectedFamily,expectedFamily],'Exact original family is read and freshly rechecked');
    assert.equal(companionReads,1);
    families.length=0;changedSnapshot=true;descriptorReads=0;
    await assert.rejects(normal.readCurrentPrivateRuntimeCompanions(target),/RETENTION_B_CHANGED/);
    changedSnapshot=false;changedDescriptor=true;descriptorReads=0;
    await assert.rejects(normal.readCurrentPrivateRuntimeCompanionInput(target),/RETENTION_B_CHANGED/);
    changedDescriptor=false;descriptorReads=0;
    for(const [nextDescriptor,nextLocal] of [[profile.binding.I,profile.binding.I],['f'.repeat(64),profile.binding.I],
      [profile.before.I,'e'.repeat(64)]]){
      descriptorI=nextDescriptor;localI=nextLocal;families.length=0;
      const priorRetention=retentionReads;
      await assert.rejects(normal.readCurrentPrivateRuntimeCompanionInput(target),/SYNTHETIC_STRICT_NORMAL_MODEL_CHECK/);
      await assert.rejects(normal.readCurrentPrivateRuntimeCompanions(target),/SYNTHETIC_STRICT_NORMAL_MODEL_CHECK/);
      assert.equal(retentionReads,priorRetention);assert.equal(families.length,0,
        'Current/unknown/local-mismatch inputs cannot borrow the predecessor path');
    }
  }
});


test('assistant592 strict source DATA inverse preserves canonical591 and refuses changed bytes',async()=>{
  for(const file of Object.keys(reviewedIssued592Sources)){
    const raw=await fs.readFile(path.join(ROOT,file),'utf8'),canonical=canonical591AssistantSource(raw,file);
    assert.equal(canonical591AssistantSource(canonical,file),canonical);
    for(const changed of [raw+'\n',raw.replace(/./,'X'),canonical+'\n'])
      assert.throws(()=>canonical591AssistantSource(changed,file));
  }
});

// Actual issued assistant593 caller/binding contracts. No B/S or SQL execution.
test('assistant593 issued metadata preserves genuine591 canonical source and strict later target',async()=>{
  const m=await import('./lib/assistant-later-h0-successor-source.mjs');
  const r=await import('./integrated-cutover-readiness.mjs');
  const s=await import('./sync-ravscore-model-binding.mjs');
  const active=m.ACTIVE_ASSISTANT_SUCCESSOR;
  assert.equal(active,m.INACTIVE_ASSISTANT_PUBLIC591_SUCCESSOR);assert.equal(active.requireRelease(),'4.0.593');
  assert.equal(active.before,m.ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE);
  assert.deepEqual({version:active.before.version,C:active.before.C,I:active.before.I,T:active.before.T},m.ASSISTANT_PUBLIC590_SUCCESSOR_BINDING);
  const required=r.assistantPublic591SuccessorRequiredMigrations(),prior=r.assistantPublic590SuccessorRequiredMigrations();
  assert.equal(required.length,60);assert.deepEqual(required.slice(0,-1),prior);
  assert.equal(required.at(-2).version,active.before.version);assert.equal(required.at(-1).version,active.requireBinding().version);
  const whole=await active.readCanonicalSource(),view=s.assistantPublic591SuccessorCheckpointInspectionView(whole.canonicalSource);
  for(const row of [...m.ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,...m.ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,...m.ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES]){
    assert(whole.canonicalSource.includes('function public.'+row.name+'('));
    assert(!view.includes('create or replace function public.'+row.name+'('));
  }
  for(const changed of [whole.canonicalSource+'\n',whole.canonicalSource.replace('ask591_state_valid','ask591_unknown_valid')])assert.throws(()=>s.assistantPublic591SuccessorCheckpointInspectionView(changed));
  const descriptor={modelBinding:{modelBundleSha256:active.before.I},contractHashes:{continuationStateContractSha256:active.before.T},productionReferenceAt:'2026-10-29T08:00:00.000Z'};
  assert.equal(active.assertTarget(descriptor,'2026-10-29T09:00:00.000Z'),true);
  for(const target of ['2026-10-29T08:00:00.000Z','2026-10-29T07:00:00.000Z','invalid'])assert.throws(()=>active.assertTarget(descriptor,target));
  assert.throws(()=>active.assertTarget({...descriptor,modelBinding:{modelBundleSha256:m.ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE.I}},'2026-10-29T09:00:00.000Z'));
});
test('assistant592 ordinary caller selects only genuine591 after normal guards',async t=>{
  const m=await import('./lib/assistant-later-h0-successor-source.mjs');
  const active=m.ACTIVE_ASSISTANT_SUCCESSOR;
  const descriptor={modelBinding:{modelBundleSha256:active.before.I},contractHashes:{continuationStateContractSha256:active.before.T},productionReferenceAt:'2026-10-29T08:00:00.000Z'};
  const flags=['CHECKPOINT_ONLY','QUICK_CONFIRMATION','COMPLETED_PRIVATE_RUNTIME','NATIVE_IDENTITY_RECOVERY','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP','RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER'];
  const base={GITHUB_WORKFLOW:'Run current RavRadar weather once',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:'a'.repeat(40),OPERATIONAL_ACTION:'integrated',RUNNER_TEMP:path.join(ROOT,'.cache','synthetic592-no-files'),RAVRADAR_PRODUCTION_TARGET_HOUR:'2026-10-29T09:00:00.000Z',...Object.fromEntries(flags.map(key=>[key,'false']))};
  const prior=Object.fromEntries(Object.keys(base).map(key=>[key,process.env[key]]));let reads=0;
  t.mock.method(fs,'readFile',async(file,encoding)=>{assert.equal(file,path.join(base.RUNNER_TEMP,'private-runtime-current-source.json'));assert.equal(encoding,'utf8');reads++;return JSON.stringify(descriptor);});
  t.mock.method(globalThis,'fetch',()=>{throw Error('NO_NETWORK_ASSISTANT592_CALLER');});
  for(const method of ['writeFile','appendFile','mkdir','mkdtemp','rm','unlink','rename'])t.mock.method(fs,method,()=>{throw Error('NO_WRITE_ASSISTANT592_CALLER');});
  try{
    for(const workflow of ['Update weather and deploy RavRadar','Run current RavRadar weather once'])for(const event of ['workflow_dispatch','schedule']){
      Object.assign(process.env,base,{GITHUB_WORKFLOW:workflow,GITHUB_EVENT_NAME:event});assert.equal(await selectAssistantLaterH0Source(),true);
    }
    for(const target of ['2026-10-29T08:00:00.000Z','2026-10-29T07:00:00.000Z','invalid']){Object.assign(process.env,base,{RAVRADAR_PRODUCTION_TARGET_HOUR:target});await assert.rejects(selectAssistantLaterH0Source());}
    for(const key of flags){Object.assign(process.env,base,{[key]:'true'});await assert.rejects(selectAssistantLaterH0Source());}
    descriptor.modelBinding.modelBundleSha256=m.ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE.I;
    Object.assign(process.env,base);assert.equal(await selectAssistantLaterH0Source(),false);
    assert(reads>=8);
  }finally{t.mock.restoreAll();for(const key of Object.keys(base)){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}}
});
test('assistant592 native evidence requires its own new commands and rejects old receipt without PG',async()=>{
  const n=await import('./native-postgres-evidence.mjs');
  const e=await import('./national584-source-evidence.mjs');
  const pkg=JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8'));
  e.verifyAssistantPublic591SuccessorPackage(pkg);
  assert.deepEqual(n.ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,[n.ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS[0],n.ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS[1]+' --assistant-public591-successor']);
  assert.deepEqual(n.ACTIVE_COMMANDS,n.ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS);
  assert.deepEqual(e.ASSISTANT_PUBLIC591_SUCCESSOR_NATIVE_COMMANDS,n.ACTIVE_COMMANDS);
  const current={run:1,attempt:1,head:'a'.repeat(40),pullRequest:1,branch:'codex/synthetic592'};
  const receipt={phase:'ASSISTANT_PUBLIC591_SUCCESSOR',commands:n.ACTIVE_COMMANDS,current,status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false};
  assert.equal(n.verifyAssistantPublic591SuccessorPhaseReceipt(receipt,current).status,'EXECUTED');
  assert.throws(()=>n.verifyAssistantPublic591SuccessorPhaseReceipt({...receipt,phase:'ASSISTANT_PUBLIC590_SUCCESSOR'},current));
  assert.throws(()=>n.verifyAssistantPublic591SuccessorPhaseReceipt({...receipt,commands:n.ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS},current));
  assert.throws(()=>n.verifyAssistantPublic591SuccessorPhaseReceipt({...receipt,executedInThisRun:false},current));
});

// The uninstalled592 source stays in Git; only the closed actual593 plan is eligible.
test('assistant593 exact outer source DATA and closed direct591 migration plan',async()=>{
  for(const [file,row]of Object.entries(reviewedCapacity593Sources)){
    const raw=await fs.readFile(path.join(ROOT,file),'utf8'),old=canonical592CapacitySource(raw,file);
    assert.equal(Buffer.byteLength(old),row.before.bytes);assert.equal(successorHash('sha256').update(old).digest('hex'),row.before.sha256);
    for(const [previous,current]of row.hunks)for(const changed of [raw.replace(current,()=>previous),raw.replace(current,()=>current+current)])
      assert.throws(()=>canonical592CapacitySource(changed,file));
    for(const changed of [raw+'\n','!'+raw.slice(1)])assert.throws(()=>canonical592CapacitySource(changed,file));
  }
  const r=await import('./integrated-cutover-readiness.mjs');
  const required=r.assistantPublic591SuccessorRequiredMigrations(),target=required.at(-1),prior=required.slice(0,-1);
  assert.equal(prior.length,59);assert.equal(target.version,'20261030105202');
  assert(!required.some(row=>row.filename==="20261029183010_assistant_public591_later_h0_original_bound_successor.sql"));
  const historical=await fs.readFile(path.join(ROOT,'supabase/migrations',"20261029183010_assistant_public591_later_h0_original_bound_successor.sql"));
  assert.equal(historical.length,352862);assert.equal(successorHash('sha256').update(historical).digest('hex'),"e5c7fb182d9491bd9222cb59dbefd3da4592867522dde805ea17e67c0d023e97");
  const list=installed=>'Local | Remote | Time (UTC)\n'+required.map(row=>row.version+' | '+(installed||row!==target?row.version:'')+' | synthetic-plan-response').join('\n');
  const noop='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.';
  const dry='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n - '+target.filename+'\nFinished supabase db push.';
  const before=await r.assertAssistantPublic591SuccessorMigrationPlan({migrationListText:list(false),dryRunText:dry,migrationsDirectory:path.join(ROOT,'supabase/migrations')});
  assert.deepEqual(before.pendingVersions,[target.version]);assert.equal(before.alreadyAppliedVersions.length,59);
  const installed=await r.assertAssistantPublic591SuccessorMigrationPlan({migrationListText:list(true),dryRunText:noop,migrationsDirectory:path.join(ROOT,'supabase/migrations')});
  assert.deepEqual(installed.pendingVersions,[]);assert.equal(installed.alreadyAppliedVersions.length,60);
  for(const extra of ["20261029183010",'20990101000000'])
    await assert.rejects(r.assertAssistantPublic591SuccessorMigrationPlan({migrationListText:list(false)+'\n'+extra+' | '+extra+' | unknown.sql',dryRunText:dry,migrationsDirectory:path.join(ROOT,'supabase/migrations')}));
});
