// Normal source-only callers: no model, origin, transport or SQL-success stub.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import * as readiness from './integrated-cutover-readiness.mjs';
import {ASSISTANT_SAME_H0_BINDING,ASSISTANT_SAME_H0_OUTPUT} from './lib/assistant-same-h0-successor-source.mjs';
import {selectAssistantSameH0CodeOnlySource} from './select-assistant-same-h0-code-only-source.mjs';
import {restoreAndPrepareAssistantSameH0RuntimeTransition,prepareAssistantSameH0RuntimeTransition,
 assertAssistantSameH0RuntimeTransitionPrepared} from './assistant-same-h0-runtime-transition.mjs';
import {selectAssistantSameH0MetadataRoute} from './assistant-same-h0-prewrite.mjs';
import {selectAssistantSameH0Route,verifyAssistantSameH0Plan} from './verify-assistant-same-h0-plan.mjs';
import {ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,buildEstablishedNativeCurrentSameH0MetadataAttestation,
 assertEstablishedNativeCurrentOriginForPart} from './lib/established-native-current-origin.mjs';
import {assertAuthenticatedFrozen140000Snapshot} from './lib/authenticated-frozen140000-predecessor.mjs';
import {requiresPrivateRuntimeCheckpointReconcile} from './reconcile-private-runtime-checkpoint.mjs';
import {deferCurrentGridBindingEdges} from './lib/production-workflow-sources.mjs';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE=process.env.RAVRADAR_ASSISTANT_SOURCE_ONLY_FIXTURE_ROOT??ROOT;
const read=file=>fs.readFile(path.join(SOURCE,file),'utf8');
const unissued={code:'ASSISTANT_SAME_H0_UNISSUED'};
let requests=0;globalThis.fetch=async()=>{requests++;throw Error('NO_NETWORK_IN_SOURCE_TARGET');};
test('new readiness branches stop while UNISSUED; genuine140000 default remains normal',async()=>{
 assert.equal(ASSISTANT_SAME_H0_BINDING,null);assert.equal(ASSISTANT_SAME_H0_OUTPUT,null);
 assert.equal(readiness.DEFAULT_CUTOVER_SOURCE_PHASE,'established-native-current-origin');
 assert.equal(readiness.establishedNativeCurrentOriginRequiredMigrations().length,52);
 assert.equal(readiness.REQUIRED_CUTOVER_MIGRATIONS.length,52);
 assert.equal(readiness.LATEST_REQUIRED_CUTOVER_MIGRATION.version,'20261017140000');
 assert.throws(()=>readiness.assistantSameH0RequiredMigrations(),unissued);
 assert.throws(()=>readiness.assertAssistantSameH0MigrationsApplied(''),unissued);
 for(const call of [()=>readiness.assertAssistantSameH0MigrationPlan({migrationsDirectory:'/do-not-read'}),
  ()=>readiness.prepareAssistantSameH0CutoverWorkdir({workdir:'/do-not-create'}),
  ()=>readiness.hydrateAssistantSameH0RemoteMigrationHistory({workdir:'/do-not-read'}),
  ()=>readiness.expectedTripBindingPolicy({migrationsDirectory:'/do-not-read',sourcePhase:'assistant-same-h0'}),
  ()=>readiness.expectedCheckpointCasContract({migrationsDirectory:'/do-not-read',sourcePhase:'assistant-same-h0'}),
  ()=>readiness.verifyIntegratedDatabaseReadback({sourcePhase:'assistant-same-h0',fetchImpl:globalThis.fetch})])await assert.rejects(call,unissued);
 const policy=await readiness.expectedTripBindingPolicy(),contract=await readiness.expectedCheckpointCasContract();
 assert.equal(policy.sha256,'af750bf4928b9e0f3a5ede63e680bb0d546e0539883b42831bca0217649da8dc');
 assert.equal(contract.sha256,'044469ff9158dbb17914311213721ba13b51edb1052f77c6fceba7955c90203f');
 assert.equal(requests,0);
});
test('fixed source/plan/prewrite selection cannot use a caller flag to issue a family',async()=>{
 assert.equal(await selectAssistantSameH0CodeOnlySource({RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:'false'}),false);
 await assert.rejects(selectAssistantSameH0CodeOnlySource({RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:'true'}),unissued);
 assert.throws(()=>selectAssistantSameH0Route({environment:{},migrationListText:''}),unissued);
 await assert.rejects(verifyAssistantSameH0Plan({phase:'before',migrationsDirectory:'/do-not-read',environment:{}}),unissued);
 await assert.rejects(selectAssistantSameH0MetadataRoute({sourceRoot:'/do-not-read'}),unissued);
 await assert.rejects(prepareAssistantSameH0RuntimeTransition({workdir:'/do-not-create'}),unissued);
 await assert.rejects(restoreAndPrepareAssistantSameH0RuntimeTransition({workdir:'/do-not-create'}),unissued);
 await assert.rejects(assertAssistantSameH0RuntimeTransitionPrepared({kind:'ASSISTANT_SAME_H0_140000_PREPARED_RUNTIME'}));
 assert.equal(requests,0);
});
test('normal generatedI038 retainsv1; fake handle, tuple and flags cannot mint metadata or ForPart',async()=>{
 assert.equal(ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,'established-native-current-continuation-v1');
 for(const handle of [{},{published:true},{modelBinding:{modelBundleSha256:'a'.repeat(64)},allowed:true}]){
  assert.throws(()=>assertAuthenticatedFrozen140000Snapshot(handle),{code:'FROZEN140000_PREDECESSOR_HANDLE'});
  await assert.rejects(buildEstablishedNativeCurrentSameH0MetadataAttestation(handle,{centralContract:{},conditions:{}}),{code:'ESTABLISHED_CURRENT_ORIGIN_METADATA_UNISSUED'});
  assert.throws(()=>assertEstablishedNativeCurrentOriginForPart(handle,{part:{},integrated:{},candidate:{}}),{code:'ESTABLISHED_CURRENT_ORIGIN_HANDLE'});
 }
 assert.equal(requests,0);
});
test('actual exact import inventories qualify only these complete source leaves',async()=>{
 for(const file of ['scripts/check-established-native-current-origin-predecessor-source.mjs',
  'scripts/lib/authenticated-frozen140000-predecessor.mjs','scripts/lib/established-native-current-origin.mjs']){
  const source=await read(file),imports=modelSourceRelativeModuleSpecifiers(source,file);
  assert(Object.isFrozen(imports));assert(Array.isArray(imports));
  assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n// mutation',file),/Whole reviewed model import source changed/u);
 }
 const origin=await read('scripts/lib/established-native-current-origin.mjs');
 assert(!origin.includes("from './assistant-same-h0-successor-source.mjs'"),'No NEXT C/I/T self-reference in bound closure');
 assert(origin.includes('const currentSource = await sourceIdentity();'));
 assert(origin.includes("METADATA_NUMERICAL_CHANGE")&&origin.includes("METADATA_REGISTRY_CHANGED"));
 assert(origin.includes("const builders = ['scripts/build-candidate-g-rollback-bundle.mjs', 'scripts/build-ravscore-model-bundle.mjs'];"));
 assert(origin.includes("for (const builder of builders) await exec(process.execPath, [path.join(ROOT, builder), '--check'],"));
});
test('null successor leaves ordinary reconciliation/publication-family selection unchanged',()=>{
 assert.equal(requiresPrivateRuntimeCheckpointReconcile({modelBinding:{modelBundleSha256:'038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f'},
  contractHashes:{continuationStateContractSha256:'047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447'}}),true);
 assert.equal(requiresPrivateRuntimeCheckpointReconcile({modelBinding:{modelBundleSha256:'a'.repeat(64)},contractHashes:{continuationStateContractSha256:'b'.repeat(64)}}),false);
 assert.equal(deferCurrentGridBindingEdges('20261017140000'),true);assert.equal(deferCurrentGridBindingEdges('20990101000000'),false);
});
test('actual code-only caller preserves named authority and original B before S before3Edges/readiness',async()=>{
 const workflow=await read('.github/workflows/deploy-code-only-repair.yml');
 assert(workflow.includes('upgrade_assistant_same_h0:\n'));
 assert(workflow.indexOf('Refuse an unissued named assistant phase before any recovery writer')<workflow.indexOf('  operational-recovery-gate:'));
 assert(workflow.includes('requireAssistantSameH0Output();'));
 for(const slot of ['select','prepare','proof','final'])assert(workflow.includes('assistant-same-h0-prewrite.mjs'+(slot==='final'?'"':'')+' --slot '+slot));
 const lateS=workflow.indexOf('id: established-native-current-origin-checkpoint-publish');
 const publishB=workflow.indexOf('name: Publish current bounded private runtime');
 assert(publishB>=0&&lateS>=0);assert(lateS>publishB);
 assert(lateS<workflow.indexOf('supabase functions deploy trip-log'));
 assert(workflow.indexOf('supabase functions deploy trip-log')<workflow.indexOf('supabase functions deploy submit-observation'));
 assert(workflow.indexOf('supabase functions deploy submit-observation')<workflow.indexOf('supabase functions deploy ravradar-assistant'));
 assert(workflow.indexOf('supabase functions deploy ravradar-assistant')<workflow.indexOf('name: Publish exact integrated backend and Edge readiness'));
 assert(!workflow.includes('update-assistant-same-h0-trip-worker.mjs'));
 assert(!/^\+/mu.test(workflow),'No accidental diff marker in actual workflow');
 const loader=process.env.RAVRADAR_ASSISTANT_SOURCE_ONLY_LOADER;
 const args=[...(loader?['--loader',loader]:[]),path.join(ROOT,'scripts/assistant-same-h0-prewrite.mjs'),'--slot','select'];
 const child=spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',timeout:15000,env:{...process.env,GITHUB_ENV:'/must-not-write',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''}});
 assert.equal(child.status,1);assert.equal(child.stdout,'');assert.equal(child.stderr.trim().split(/\r?\n/u).at(-1),'ASSISTANT_SAME_H0_PREWRITE_FAILED_DO_NOT_RETRY');
 assert.equal(requests,0);
});
