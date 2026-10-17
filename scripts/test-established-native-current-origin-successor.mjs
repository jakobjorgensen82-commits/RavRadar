// Normal offline source/route contract. No live credentials or SQL execution.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {buildEstablishedNativeCurrentOriginBindingSuccessor} from './build-established-native-current-origin-successor.mjs';
import {ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING as NEXT,ESTABLISHED_NATIVE_CURRENT_ORIGIN_OUTPUT as PINS,
  readEstablishedNativeCurrentOriginCanonicalSource,establishedNativeCurrentOriginMigration}
  from './lib/established-native-current-origin-successor-source.mjs';
import {currentMemoryWarmupDefinition as definition,readCurrentMemoryWarmupCanonicalSource}
  from './lib/current-memory-warmup-successor-source.mjs';
import {REQUIRED_CUTOVER_MIGRATIONS,CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS,
  expectedCheckpointCasContract,expectedTripBindingPolicy}
  from './integrated-cutover-readiness.mjs';
import {selectEstablishedNativeCurrentOriginRoute,verifyEstablishedNativeCurrentOriginPlan}
  from './verify-established-native-current-origin-plan.mjs';
import {assertEstablishedNativeCurrentOriginPrewriteCaller} from './established-native-current-origin-prewrite.mjs';
import {checkpointMetadataCasBlock} from './sync-ravscore-model-binding.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {buildPublicConditions,buildPublicConditionDetails} from './public-conditions-lib.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const descriptor=establishedNativeCurrentOriginMigration(),CP='ravradar_ravscore_checkpoint_';
let built;

test('actual physical successor preserves entire0200 and every original family',async()=>{
  built=await buildEstablishedNativeCurrentOriginBindingSuccessor();
  const before=await readCurrentMemoryWarmupCanonicalSource(),after=await readEstablishedNativeCurrentOriginCanonicalSource();
  assert.equal(sha(built.migration),PINS.migrationSha256);assert.equal(sha(after.canonicalSource),PINS.canonicalSha256);
  assert.equal(built.wholeCanonicalInverse,true);assert.equal(built.changes.length,9);
  assert.equal(after.originalDefinitions.length,8);
  for(const row of before.originalDefinitions)assert.equal(definition(after.canonicalSource,row.name),row.definition);
  assert.equal((await expectedCheckpointCasContract()).sha256,PINS.checkpointContractSha256);
  assert.equal((await expectedTripBindingPolicy()).sha256,PINS.tripBindingPolicySha256);
  assert.equal(REQUIRED_CUTOVER_MIGRATIONS.length,52);
  assert.equal(CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS.length,51);
  assert.equal(CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS.at(-1).version,'20261017020000');
  assert.equal(after.admission,'NO_ADMISSION');
});

test('mutable source consumer retains original aliases and refuses any marker/alias drift',async()=>{
  const {canonicalSource:source}=await readEstablishedNativeCurrentOriginCanonicalSource();
  const block=checkpointMetadataCasBlock(source,ravScoreModelBinding(),candidateBinding(),NEXT.T);
  assert(block.includes('function public.'+CP+'cmw0200_state_valid('));
  assert(block.includes('function public.'+CP+'cmw0200_payload_valid('));
  const original=definition(source,CP+'cmw0200_state_valid');
  assert.equal(block.split(original).length,2);
  assert.throws(()=>checkpointMetadataCasBlock(source.replace(original,()=>original.replace('begin\n','begin\n  -- altered\n')),
    ravScoreModelBinding(),candidateBinding(),NEXT.T),/Whole original0200 alias changed/);
  assert.throws(()=>checkpointMetadataCasBlock(source.replace(original,''),
    ravScoreModelBinding(),candidateBinding(),NEXT.T),/expected exactly one function/);
  const marker='-- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_BEGIN';
  assert.throws(()=>checkpointMetadataCasBlock(source+'\n'+marker+'\n',
    ravScoreModelBinding(),candidateBinding(),NEXT.T),/missing or duplicated/);
});

const environment={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
  GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN:'true',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:'before',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_WRITER_ACTIVE:'false',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_RECOVERY_GATE_RESULT:'success',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_ORIGINALS_VERIFIED:'true',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_NOLOSS_VERIFIED:'true',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PREWRITE_VERIFIED:'true',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_SAVED_WEATHER:'false',
  RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_RECOVERY_RUN_ID:''};
const list=installed=>'Local | Remote | Time (UTC)\n'+REQUIRED_CUTOVER_MIGRATIONS.map(row=>
  row.version+' | '+(installed||row.version!==descriptor.version?row.version:'')+' | source fixture').join('\n');
test('sole pending exact phase and installed no-replay routes use normal source plan',async()=>{
  assert.equal(selectEstablishedNativeCurrentOriginRoute({migrationListText:list(false),environment}),'before');
  const result=await verifyEstablishedNativeCurrentOriginPlan({phase:'before',migrationListText:list(false),environment,
    migrationsDirectory:fileURLToPath(new URL('../supabase/migrations/',import.meta.url)),
    dryRunText:'DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n * '
      +descriptor.filename+'\nFinished supabase db push.\n'});
  assert.deepEqual(result.pendingVersions,[descriptor.version]);
  const installed={...environment,RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN:'false'};
  assert.equal(selectEstablishedNativeCurrentOriginRoute({migrationListText:list(true),environment:installed}),'installed');
  assert.throws(()=>selectEstablishedNativeCurrentOriginRoute({migrationListText:list(true),environment}),/consumed-grant/);
  for(const [key,value]of [['GITHUB_REF','refs/heads/other'],['GITHUB_RUN_ATTEMPT','2'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_ORIGINALS_VERIFIED','false'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_NOLOSS_VERIFIED','false'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_WRITER_ACTIVE','true'],
    ['RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN','true']])
    assert.throws(()=>selectEstablishedNativeCurrentOriginRoute({migrationListText:list(false),environment:{...environment,[key]:value}}));
});

test('prewrite caller cannot combine grants, bypass writer or use saved-weather purpose',()=>{
  assert.doesNotThrow(()=>assertEstablishedNativeCurrentOriginPrewriteCaller(environment));
  assert.doesNotThrow(()=>assertEstablishedNativeCurrentOriginPrewriteCaller({...environment,
    RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN:'false',
    RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:'installed'}));
  for(const [key,value]of [['GITHUB_WORKFLOW','other'],['GITHUB_SHA','invalid'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE','installed'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN','false'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_WRITER_ACTIVE','true'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_SAVED_WEATHER','true'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_RECOVERY_RUN_ID','123'],
    ['RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN','true'],['RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN','true']])
    assert.throws(()=>assertEstablishedNativeCurrentOriginPrewriteCaller({...environment,[key]:value}));
});

test('unchanged normal public projection drops the entire private origin without changing public bytes',async()=>{
  const source=await fs.readFile(new URL('./public-conditions-lib.mjs',import.meta.url),'utf8');
  assert.equal(sha(source.replace(/\r\n/g,'\n')),'e5a921d2a818694cfa13d5fcb30392cad972dc3b7038e929bc1d659a95f8017d');
  const full={datasetId:'rr-origin-privacy-fixture',generatedAt:'2026-10-17T10:00:00.000Z',
    productionReferenceAt:'2026-10-17T10:00:00.000Z',zones:{}};
  const withOrigin={...full,privateEstablishedNativeCurrentOrigin:{kind:'PRIVATE_ORIGIN_CANARY',
    nested:{privateEstablishedNativeCurrentOrigin:'PRIVATE_ORIGIN_CANARY'}}};
  for(const project of [buildPublicConditions,buildPublicConditionDetails]){
    const before=project(full),after=project(withOrigin);
    assert.deepEqual(after,before);
    assert.equal(JSON.stringify(after),JSON.stringify(before));
    assert(!JSON.stringify(after).includes('PRIVATE_ORIGIN_CANARY'));
  }
});
