// Normal fixed caller/source guards. No credentials, SQL or remote execution.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAssistantKnowledgePredecessorSource} from './check-assistant-knowledge-predecessor-source.mjs';
import {classifyVerifiedRuntimeMigration,assertMetadataOnlyMigrationResult} from './migrate-post-cutover-private-runtime.mjs';
import {ASSISTANT_KNOWLEDGE_BEFORE as OLD} from './lib/assistant-knowledge-successor-source.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {privateRuntimeContractHashes,PRIVATE_RUNTIME_FILES} from './private-production-runtime-workflow.mjs';
import {createPrivateProductionRuntimeBundle} from './private-production-runtime-bundle.mjs';
import {buildProtectedPrivateRuntimeArchive,describeTargetProtectedPrivateProductionRuntime,PROTECTED_PRIVATE_RUNTIME_POLICY} from './protected-private-production-runtime.mjs';
import {assertAssistantKnowledgePrewriteCaller,verifyAssistantKnowledgePrewritePreservation}
  from './assistant-knowledge-prewrite.mjs';
const environment={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',
  GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN:'true',
  RAVRADAR_ASSISTANT_KNOWLEDGE_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',RAVRADAR_ASSISTANT_KNOWLEDGE_SAVED_WEATHER:'false',
  RAVRADAR_ASSISTANT_KNOWLEDGE_RECOVERY_RUN_ID:'',RAVRADAR_ASSISTANT_KNOWLEDGE_WRITER_ACTIVE:'false',RAVRADAR_ASSISTANT_KNOWLEDGE_RECOVERY_GATE_RESULT:'success'};
test('fixed normal prewrite caller denies different intent, writer, reentry and historical grant combinations',async()=>{
  assertAssistantKnowledgePrewriteCaller(environment);
  assertAssistantKnowledgePrewriteCaller({...environment,RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN:'false',RAVRADAR_ASSISTANT_KNOWLEDGE_PHASE:'installed'});
  for(const [key,value] of Object.entries({GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/other',GITHUB_RUN_ATTEMPT:'2',GITHUB_RUN_ID:'0',
    GITHUB_SHA:'other',GITHUB_WORKFLOW:'other',RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN:'false',RAVRADAR_ASSISTANT_KNOWLEDGE_CONFIRMATION:'other',
    RAVRADAR_ASSISTANT_KNOWLEDGE_SAVED_WEATHER:'true',RAVRADAR_ASSISTANT_KNOWLEDGE_RECOVERY_RUN_ID:'123',RAVRADAR_ASSISTANT_KNOWLEDGE_WRITER_ACTIVE:'true',
    RAVRADAR_ASSISTANT_KNOWLEDGE_RECOVERY_GATE_RESULT:'failure',RAVRADAR_USERDATA_UPGRADE_OPT_IN:'true',RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN:'true',
    RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN:'true',RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN:'true',RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN:'true'}))
    assert.throws(()=>assertAssistantKnowledgePrewriteCaller({...environment,[key]:value}),key);
  await assert.rejects(verifyAssistantKnowledgePrewritePreservation({sourceRoot:'unknown'}));
});
test('actual code-only source uses named warmup binding proof/plan once and normal one-apply release ordering',async()=>{
  const workflow=(await fs.readFile(new URL('../.github/workflows/deploy-code-only-repair.yml',import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
  const gate=(await fs.readFile(new URL('./source-critical-gate.mjs',import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
  assert.match(workflow,/      upgrade_assistant_knowledge:\n(?:        [^\n]+\n)*?        default: false/);
  for(const literal of ['RAVRADAR_ASSISTANT_KNOWLEDGE_RECOVERY_GATE_RESULT: ${{ needs.operational-recovery-gate.result }}',
    'group: ravradar-weather-production-v2','group: ravradar-trip-storage-production','migration_args+=(--metadata-only)',
    'assistant-knowledge-prewrite.mjs --slot proof','env -u SUPABASE_DB_PASSWORD node "$GITHUB_WORKSPACE/scripts/assistant-knowledge-prewrite.mjs" --slot final',
    'RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN=false node scripts/verify-assistant-knowledge-plan.mjs'])assert(workflow.includes(literal),literal);
  const ordered=['Authenticate issued0200 B/S and compare every prepared successor byte before new binding',
    'Select the sole pending assistant knowledge successor after actual original and no-loss proof','Dry-run and require only the latest exact integrated migration',
    'Reconfirm current main before the database binding write','Apply exact dry-run-verified post-cutover binding',
    'Read back migration and database binding','Publish measured continuation checkpoint without promoting rollback readiness'];
  let before=-1;for(const name of ordered){const at=workflow.indexOf('      - name: '+name+'\n');assert(at>before,name);before=at;}
  const start=gate.indexOf('assert.equal(\n  (codeOnlyWorkflow.match(/supabase db push --linked/g)'),
    end=gate.indexOf('\nassert.ok(\n  read(\'scripts/verify-code-only-migration-plan.mjs\')',start);
  assert(start>0&&end>start);
  // Execute the ACTUAL normal gate assertions, not a duplicate permissive test.
  runInNewContext(gate.slice(start,end),{assert,codeOnlyWorkflow:workflow},{timeout:1000});
  assert.equal((workflow.match(/^\s*supabase db push --linked --skip-vault\s*$/gm)??[]).length,1);
  const plan=workflow.slice(workflow.indexOf('      - name: Select only an already-installed assistant knowledge successor before private work'),workflow.indexOf('      - name: Hydrate only already-applied migration identities'));
  assert(plan.includes("if test \"$RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN\" = 'false'; then"));
});

test('new warmup binding publishes all three normal Edges only after installed readback, without replaying storage',async()=>{
  const workflow=(await fs.readFile(new URL('../.github/workflows/deploy-code-only-repair.yml',import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
  const readback=workflow.indexOf('      - name: Read back migration and database binding\n');
  const installed=workflow.indexOf('          echo "RAVRADAR_ASSISTANT_KNOWLEDGE_PHASE=installed" >> "$GITHUB_ENV"',readback);
  const trip=workflow.indexOf('      - name: Deploy exact rebound trip Edges without Worker or D1 replay\n');
  const assistant=workflow.indexOf('      - name: Deploy only the exact RavRadar assistant Edge function\n');
  assert(readback>0&&installed>readback&&trip>installed&&assistant>trip);
  const block=workflow.slice(trip,assistant);
  assert(block.includes("if: env.RAVRADAR_ACCOUNT_ASSISTANT_FINAL_REQUIRED == 'true' || env.RAVRADAR_CURRENT_MEMORY_WARMUP_EDGE_REQUIRED == 'true' || env.RAVRADAR_ASSISTANT_KNOWLEDGE_EDGE_REQUIRED == 'true'"));
  assert(block.includes('test "$RAVRADAR_ASSISTANT_KNOWLEDGE_PHASE" = "installed"'));
  assert(block.includes('test "$RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN" = "false"'));
  assert(block.includes('supabase functions deploy trip-log --project-ref "$SUPABASE_PROJECT_ID"'));
  assert(block.includes('supabase functions deploy submit-observation --project-ref "$SUPABASE_PROJECT_ID"'));
  assert(!/\b(?:wrangler|d1 execute|db push)\b/.test(block),'No storage replay in the binding-only Edges phase');
  assert.match(workflow.slice(assistant),/\|\| test "\$\{RAVRADAR_ASSISTANT_KNOWLEDGE_EDGE_REQUIRED:-false\}" = "true"; then\n            assistant_deploy_attempts=1/);
});

test('issued0200 route selection preserves normal contract-only and future current-family reuse; conflicting old source fails closed',async()=>{
  const workflow=(await fs.readFile(new URL('../.github/workflows/deploy-code-only-repair.yml',import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
  const metadataDefault=workflow.match(/^      RAVRADAR_ASSISTANT_KNOWLEDGE_METADATA_ONLY: '(true|false)'$/m)?.[1];
  const unchanged={coastalParts:{modelBinding:ravScoreModelBinding()},controlledValues:[17,null,false]};
  const contractOnly={transitionKind:classifyVerifiedRuntimeMigration({source:unchanged,migrated:structuredClone(unchanged),
    bindingMetadataPaths:[],verifiedChangedPaths:[]}),repairedContinuationCount:0,recomputedModeCount:0,recomputedZoneCount:0};
  assert.equal(contractOnly.transitionKind,'CONTRACT_ONLY_REBIND');
  // Genuine v1 RED: execute the normal strict contract classifier/guard with
  // the actual workflow default, not a permissive replacement migration.
  assert.doesNotThrow(()=>{if(metadataDefault==='true')assertMetadataOnlyMigrationResult(contractOnly);},
    'A normal same-binding contract-only route must not acquire the issued0200 metadata-only restriction');
  assert.equal(metadataDefault,'false');
  const {selectAssistantKnowledgeMetadataRoute}=await import('./assistant-knowledge-prewrite.mjs');
  const selectAt=workflow.indexOf('      - name: Select only the exact authenticated issued0200 metadata bridge\n');
  const migrateAt=workflow.indexOf('      - name: Rebind saved private runtime to current source without changing measurements\n');
  const restoredAt=workflow.indexOf('      - name: Verify and unpack exact predecessor private runtime\n');
  assert(restoredAt>0&&selectAt>restoredAt&&selectAt<migrateAt);
  assert.match(workflow.slice(selectAt,migrateAt),/if: env\.RAVRADAR_ASSISTANT_KNOWLEDGE_CURRENT == 'true' && steps\.current-private-install\.outcome != 'success' && steps\.owner-current-original\.outputs\.transition_kind != 'owner-current-domain-original'/);
  assert(workflow.slice(selectAt,migrateAt).includes('assistant-knowledge-prewrite.mjs --slot select'));
  assert.match(workflow.slice(migrateAt,workflow.indexOf('      - name: Install migrated saved private runtime atomically\n')),
    /if test "\$\{RAVRADAR_ASSISTANT_KNOWLEDGE_METADATA_ONLY:-false\}" = "true"; then\n            test "\$\{\{ steps\.owner-current-original\.outputs\.transition_kind \}\}" != "owner-current-domain-original"\n            migration_args\+=\(--metadata-only\)/);
  assert(workflow.includes("if: env.RAVRADAR_ASSISTANT_KNOWLEDGE_METADATA_ONLY == 'true' && steps.migrated-private-install.outcome == 'success'"));
  const temporary=await fs.realpath(await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'rr-assistant-knowledge-route-')));
  const owner=await fs.lstat(temporary,{bigint:true});
  try{
    const sourceRoot=path.join(temporary,'restored');await fs.mkdir(sourceRoot);
    for(const item of PRIVATE_RUNTIME_FILES){const file=path.join(sourceRoot,item.relativePath);await fs.mkdir(path.dirname(file),{recursive:true});
      await fs.writeFile(file,JSON.stringify({controlledEnvelopeOnly:true,id:item.id,unchangedValues:[17,null,false]})+'\n',{flag:'wx'});}
    const reference='2026-10-16T10:00:00.000Z',generatedAt='2026-10-16T10:05:00.000Z';let sequence=0;
    async function normalSelectCli(inputs,selected){
      const githubEnv=path.join(temporary,'normal-cli-env-'+sequence+'.txt');
      const variables={...environment,RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN:'false',RAVRADAR_ASSISTANT_KNOWLEDGE_PHASE:'installed',
        RAVRADAR_PREDECESSOR_PRIVATE_RESTORE:inputs.sourceRoot,RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE:path.dirname(inputs.bundleManifestPath),
        RAVRADAR_OPERATIONAL_WORK:path.dirname(inputs.predecessorDescriptorPath),GITHUB_ENV:githubEnv};
      // Invoke the genuine CLI entry point, not an imitation of its branch.
      // It is read-only except its normal GITHUB_ENV output. No clients exist
      // on this path; the later proof remains responsible for authentic S.
      const descriptor=path.join(variables.RAVRADAR_OPERATIONAL_WORK,'target-private-runtime-source.json');
      await fs.copyFile(inputs.predecessorDescriptorPath,descriptor,fs.constants.COPYFILE_EXCL);
      const previous=Object.fromEntries(Object.keys(variables).map(k=>[k,process.env[k]])),argv=process.argv,exitCode=process.exitCode;
      try{
        for(const [k,v] of Object.entries(variables))process.env[k]=v;
        const entry=new URL('./assistant-knowledge-prewrite.mjs',import.meta.url);process.argv=[process.execPath,fileURLToPath(entry),'--slot','select'];
        await import(entry.href+'?normal-selection-cli='+sequence);
        assert.equal(process.exitCode,exitCode);assert.equal(await fs.readFile(githubEnv,'utf8'),'RAVRADAR_ASSISTANT_KNOWLEDGE_METADATA_ONLY='+selected+'\n');
      }finally{
        process.argv=argv;process.exitCode=exitCode;
        for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
        await fs.unlink(descriptor);
      }
    }
    async function normalBundle(bundleModule,protectedModule,binding,contracts,repositoryRoot){
      const bundlePath=path.join(temporary,'bundle-'+(++sequence));
      const metadata={datasetId:'rr-controlled-route-envelope',generationId:'controlled-'+sequence,productionReferenceAt:reference,
        generatedAt,zoneCount:210,partCount:673,modelBinding:binding,contractHashes:contracts,privacyClass:'PRIVATE_PRODUCTION_RUNTIME'};
      await bundleModule.createPrivateProductionRuntimeBundle({privateRoot:temporary,bundlePath,repositoryRoot,metadata,
        files:PRIVATE_RUNTIME_FILES.map(item=>({...item,sourcePath:path.join(sourceRoot,item.relativePath),privacyClass:'PRIVATE_PRODUCTION_RUNTIME'}))});
      const archive=await protectedModule.buildProtectedPrivateRuntimeArchive({privateRoot:temporary,bundlePath,repositoryRoot,
        expected:{modelBinding:binding,contractHashes:contracts},sourceHead:'229d11935776871083116c41b8e230b7841a4038'});
      const row={document_key:protectedModule.PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey,version:1,payload:{
        schemaVersion:protectedModule.PROTECTED_PRIVATE_RUNTIME_POLICY.schemaVersion,kind:protectedModule.PROTECTED_PRIVATE_RUNTIME_POLICY.pointerKind,
        current:archive.descriptor,previous:null}};
      const identity=await protectedModule.describeTargetProtectedPrivateProductionRuntime({request:async()=>[row],targetReferenceAt:reference});
      const predecessorDescriptorPath=path.join(temporary,'descriptor-'+sequence+'.json');
      await fs.writeFile(predecessorDescriptorPath,JSON.stringify(identity)+'\n',{flag:'wx'});
      return {sourceRoot,bundleManifestPath:path.join(bundlePath,'manifest.json'),predecessorDescriptorPath};
    }
    await withAssistantKnowledgePredecessorSource(async frozenRoot=>{
      const load=p=>import(pathToFileURL(path.join(frozenRoot,p)).href);
      const [model,oldWorkflow,bundle,protectedB]=await Promise.all([load('js/core/ravscore-model-contract.js'),
        load('scripts/private-production-runtime-workflow.mjs'),load('scripts/private-production-runtime-bundle.mjs'),load('scripts/protected-private-production-runtime.mjs')]);
      const oldContracts=await oldWorkflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot});
      const old=await normalBundle(bundle,protectedB,model.ravScoreModelBinding(),oldContracts,frozenRoot);
      assert.equal(await selectAssistantKnowledgeMetadataRoute(old),true,'First genuine issued0200 source selects fixed bridge');
      await normalSelectCli(old,true);
      // Selection deliberately does not depend on pending/installed phase.
      // The unchanged caller guard permits both pending opt-in and installed warmup binding
      // reentry with the same old B/S; later proof still authenticates old S.
      assertAssistantKnowledgePrewriteCaller(environment);
      assertAssistantKnowledgePrewriteCaller({...environment,RAVRADAR_ASSISTANT_KNOWLEDGE_UPGRADE_OPT_IN:'false',RAVRADAR_ASSISTANT_KNOWLEDGE_PHASE:'installed'});
      const original=await fs.readFile(old.predecessorDescriptorPath),identity=JSON.parse(original);
      const originalManifest=await fs.readFile(old.bundleManifestPath);
      for(const mutate of [x=>{x.modelBinding.modelBundleSha256=ravScoreModelBinding().modelBundleSha256;},
        x=>{x.contractHashes.continuationStateContractSha256='0'.repeat(64);},
        x=>{x.contractHashes.publicProjectionContractSha256='0'.repeat(64);}]){
        const changed=structuredClone(identity);mutate(changed);
        const changedManifest=JSON.parse(originalManifest);changedManifest.modelBinding=changed.modelBinding;changedManifest.contractHashes=changed.contractHashes;
        await fs.writeFile(old.predecessorDescriptorPath,JSON.stringify(changed));await fs.writeFile(old.bundleManifestPath,JSON.stringify(changedManifest));
        await assert.rejects(selectAssistantKnowledgeMetadataRoute(old),'Conflicting native markers must not fall back to generic');
      }
      await fs.writeFile(old.predecessorDescriptorPath,original);await fs.writeFile(old.bundleManifestPath,originalManifest);
      const file=path.join(sourceRoot,PRIVATE_RUNTIME_FILES[0].relativePath),bytes=await fs.readFile(file);await fs.appendFile(file,'\n');
      await assert.rejects(selectAssistantKnowledgeMetadataRoute(old),'Changed restored original must fail closed');await fs.writeFile(file,bytes);
    });
    const repositoryRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
    const current=await normalBundle({createPrivateProductionRuntimeBundle},{buildProtectedPrivateRuntimeArchive,describeTargetProtectedPrivateProductionRuntime,
      PROTECTED_PRIVATE_RUNTIME_POLICY},ravScoreModelBinding(),await privateRuntimeContractHashes(),repositoryRoot);
    assert.equal(await selectAssistantKnowledgeMetadataRoute(current),false,'An already-current generation does not acquire issued0200-only proof');
    await normalSelectCli(current,false);
    assert.doesNotThrow(()=>{if(metadataDefault==='true')assertMetadataOnlyMigrationResult(contractOnly);});
    const bytes=await fs.readFile(current.predecessorDescriptorPath),identity=JSON.parse(bytes);
    identity.modelBinding.modelBundleSha256='8'.repeat(64);identity.contractHashes.continuationStateContractSha256='9'.repeat(64);
    const manifest=JSON.parse(await fs.readFile(current.bundleManifestPath));manifest.modelBinding=identity.modelBinding;manifest.contractHashes=identity.contractHashes;
    await fs.writeFile(current.predecessorDescriptorPath,JSON.stringify(identity));await fs.writeFile(current.bundleManifestPath,JSON.stringify(manifest));
    assert.equal(await selectAssistantKnowledgeMetadataRoute(current),false,'Unrelated historical route gains no native grant and keeps normal generic guards');
  }finally{
    const actual=await fs.realpath(temporary),stat=await fs.lstat(actual,{bigint:true});
    assert.equal(actual,temporary);assert(path.basename(actual).startsWith('rr-assistant-knowledge-route-'));
    assert.equal(stat.dev,owner.dev);assert.equal(stat.ino,owner.ino);assert.equal(stat.birthtimeNs,owner.birthtimeNs);
    await fs.rm(actual,{recursive:true,force:true});
  }
});
