// Actual V4 coordinator, command processes, Git analysis and merged consumer.
// API/native receipt bodies are SYNTHETIC DATA; no SQL, provider or live API.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import childProcess,{execFileSync} from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import vm from 'node:vm';
import {copernicusOfflineEnvironment} from './lib/copernicus-offline-environment.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {OWNED_CACHE_DEPENDENCY_COMMAND,OWNED_CACHE_NATIVE_COMMAND,currentChangeCommand} from './source-current-contract-receipt.mjs';
import {inverseOwnedCacheNativeWorkflow,OWNED_CACHE_NATIVE_EARLY_NODE24,readHistoricalSourceSetupWorkflow} from './lib/source-impact-workflow-review.mjs';
import {CURRENT_CONTRACT_COMMANDS,currentWorkflowTargets,isBoundedLocalRestoreFixtureChange,isArchiveRestoreOuterQueueOnlyChange,archiveRestoreWorkflowWithoutInventory,isArchiveRestoreWorkflowChange,pagesContractCommandsForChangedInputs,sourceControlCommandsForChangedInputs,dmiBudgetWeatherBuildAreas,isDmiBudgetOnlyUpdaterChange,isDmiBudgetOnlySupervisorChange,isDmiCollectionRecoveryOnlyUpdaterChange,isDmiCollectionRecoveryOnlyFixtureChange,dmiCollectionRecoveryUpdaterAreas} from './source-current-contract-plan.mjs';

import { WEATHER_PUBLICATION_PATHS, inversePrivateWeatherPublicationWorkflow, isPrivateWeatherPublicationWorkflowChange,
  PRIVATE_WEATHER_PUBLICATION_OWNER_EDITS, isAdditivePrivateWeatherPublicationOwnerChange } from './lib/private-weather-publication-workflow.mjs';

const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dmiBudgetScopeOnly=process.argv.includes('--dmi-budget-scope-only');
const dmiRecoveryScopeOnly=process.argv.includes('--dmi-recovery-scope-only');
const adminHistoryScopeOnly=process.argv.includes('--admin-history-scope-only');
const weatherPublicationScopeOnly=process.argv.includes('--weather-publication-scope-only');

// The fixed restore command owns only its reviewed fixture body. Import and
// dispatch frames retain the old form plus the closed inventory mode; --self-test runs separately.
const restoreFixture='scripts/test-supabase-cli-local-restore.mjs';
// This already qualified historical test input grants no scope to current readers.
const RESTORE_SCOPE_FIXTURE_ORIGIN='13ecde5895cea1da42ba2421e5d2570efb6db645';
const readCommittedFixture=ref=>execFileSync('git',['-c','protocol.allow=never','-C',SOURCE,'cat-file','blob',
  ref+':'+restoreFixture],{timeout:10000,maxBuffer:4*1024*1024,windowsHide:true,
  env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}}).toString('utf8');
const restoreSource=readCommittedFixture(RESTORE_SCOPE_FIXTURE_ORIGIN);
const currentRestoreSource=readCommittedFixture('HEAD');
assert.deepEqual(CURRENT_CONTRACT_COMMANDS.backupRestore,['node '+restoreFixture+' --self-test',
  'node --test scripts/test-archive-supabase-database-backup.mjs',
  'node --test scripts/test-supabase-database-backup-workflow.mjs',
  'node --test scripts/test-supabase-backup-lifecycle.mjs']);
assert.equal(isBoundedLocalRestoreFixtureChange(restoreSource,restoreSource),true);
assert.equal(isBoundedLocalRestoreFixtureChange(restoreSource,
  restoreSource.replace('const IMAGES=','// Synthetic reviewed body delta\nconst IMAGES=')),true);
for(const changed of [
 '// Synthetic import-frame delta\n'+restoreSource,
 restoreSource+'\n// Synthetic dispatch-frame delta\n',
 restoreSource.replace("process.argv[2]==='--self-test'","process.argv[2]==='--run-archive-restore'"),
 restoreSource.replace('\nconst P=Object.freeze(','\nconst P=Object.freeze(\nconst P=Object.freeze('),
 ' '.repeat(256*1024)+restoreSource,
])assert.equal(isBoundedLocalRestoreFixtureChange(restoreSource,changed),false);
const currentBodyEdit=currentRestoreSource.replace('const IMAGES=','// Synthetic current restore body edit\nconst IMAGES=');
assert.notEqual(currentBodyEdit,currentRestoreSource);
assert.equal(isBoundedLocalRestoreFixtureChange(currentRestoreSource,currentBodyEdit),true);
for(const changed of [
 '// Synthetic current import delta\n'+currentBodyEdit,
 currentBodyEdit+'\n// Synthetic current dispatch delta\n',
 currentBodyEdit.replace('const IMAGES=','/*'+(' '.repeat(4*1024*1024))+'*/\nconst IMAGES='),
 currentBodyEdit.replace('const IMAGES=','// Synthetic NUL\0\nconst IMAGES='),
])assert.equal(isBoundedLocalRestoreFixtureChange(currentRestoreSource,changed),false);
// Eksisterende ownerindgang: kun fast helper-scope, aldrig et blanket Pages-skip.
const ownerHelpers=['scripts/github-pages-attempt-evidence.mjs','scripts/protected-operational-reentry-evidence.mjs'];
const deploymentCommand='node scripts/test-ravscore-operational-pages-deployment.mjs';
const ownerCommand=deploymentCommand+' --owner-completion-only';
const ownerCommands=CURRENT_CONTRACT_COMMANDS.pages.map(command=>command===deploymentCommand?ownerCommand:command);
const modified=path=>({path,status:'M',beforeMode:'100644',afterMode:'100644'});
for(const inputs of [[modified(ownerHelpers[0])],ownerHelpers.map(modified),
  [modified(ownerHelpers[1]),modified('docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md')],
  [modified(ownerHelpers[1]),modified('scripts/source-current-contract-plan.mjs'),modified('scripts/test-source-current-contracts.mjs')],
  [modified(ownerHelpers[1]),modified('scripts/test-protected-operational-reentry-evidence.mjs')]])
  assert.deepEqual(pagesContractCommandsForChangedInputs(inputs),ownerCommands);
for(const extra of ['scripts/test-ravscore-operational-pages-deployment.mjs',
  'scripts/lib/run-sealed-pages-deployment.mjs','.github/workflows/reusable-operational-reentry.yml',
  'app.js','scripts/source-targeted-consumer.mjs','js/unclassified-production-feature.js'])
  assert.deepEqual(pagesContractCommandsForChangedInputs([modified(ownerHelpers[1]),modified(extra)]),CURRENT_CONTRACT_COMMANDS.pages);
for(const inputs of [[],null,[modified('CHANGELOG.md')],
  [{...modified(ownerHelpers[1]),status:'A',beforeMode:'000000'}],
  [{...modified(ownerHelpers[1]),status:'D',afterMode:'000000'}],
  [{...modified(ownerHelpers[1]),afterMode:'100755'}],
  [modified(ownerHelpers[1]),modified(ownerHelpers[1])]])
  assert.deepEqual(pagesContractCommandsForChangedInputs(inputs),CURRENT_CONTRACT_COMMANDS.pages);

// Præcise kataloginput vælger hele CURRENT/workflow/gate/cadence; standarden bevares.
function assertPlannerControlCommandSelection(){
  const planner=['scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs'];
  const whole=[
    'node --test scripts/test-source-current-contracts.mjs',
    'node scripts/test-source-impact-workflow.mjs',
    'node scripts/test-weather-source-gate.mjs',
    'node scripts/test-weather-cadence-watchdog.mjs',
  ];
  const broad=CURRENT_CONTRACT_COMMANDS.sourceControls;
  assert.deepEqual(broad,[whole[0],whole[1],
    'node scripts/test-source-targeted-producer.mjs','node scripts/test-source-targeted-consumer.mjs',
    'node --test scripts/test-native-postgres-evidence.mjs','node --test scripts/test-source-impact-full-baseline.mjs',
    whole[2],whole[3]]);
  let passed=0;
  for(const changes of [[modified(planner[0])],[modified(planner[1])],planner.map(modified),
    [...planner.map(modified),modified('CHANGELOG.md')],
    [modified(planner[0]),modified('scripts/deploy-forecast-share-pages.mjs')]]){
    const selected=sourceControlCommandsForChangedInputs(changes);
    assert.deepEqual(selected,whole);assert(Object.isFrozen(selected));passed++;
  }
  for(const file of ['.github/workflows/validate-pull-request.yml',
    'scripts/lib/source-impact-workflow-review.mjs','scripts/test-source-impact-workflow.mjs',
    'scripts/source-current-contract-receipt.mjs','scripts/source-targeted-producer.mjs',
    'scripts/test-source-targeted-producer.mjs','scripts/source-targeted-receipt.mjs',
    'scripts/test-source-targeted-receipt.mjs','scripts/source-targeted-consumer.mjs',
    'scripts/test-source-targeted-consumer.mjs','scripts/native-postgres-evidence.mjs',
    'scripts/test-native-postgres-evidence.mjs','scripts/source-impact-full-baseline.mjs',
    'scripts/test-source-impact-full-baseline.mjs','scripts/test-source-targeted-domain-integration.mjs',
    'scripts/weather-source-gate.mjs','.github/workflows/watch-missed-weather-schedule.yml',
    'scripts/lib/weather-source-gate.mjs','scripts/test-weather-source-gate.mjs',
    'scripts/test-weather-cadence-watchdog.mjs','scripts/validate-release-version.mjs',
    'scripts/test-module-version-closure-4.0.87.mjs','scripts/test-security-hardening-4.0.284.mjs']){
    assert.strictEqual(sourceControlCommandsForChangedInputs([modified(file)]),broad);passed++;
    assert.strictEqual(sourceControlCommandsForChangedInputs([...planner.map(modified),modified(file)]),broad);passed++;
  }
  for(const changes of [null,[],[modified('CHANGELOG.md')],
    [modified(planner[0]),modified(planner[0])],[{}],[null],
    [{...modified(planner[0]),status:'A',beforeMode:'000000'}],
    [{...modified(planner[1]),status:'D',afterMode:'000000'}],
    [{...modified(planner[0]),beforeMode:'100755'}],
    [{...modified(planner[1]),afterMode:'100755'}]]){
    assert.strictEqual(sourceControlCommandsForChangedInputs(changes),broad);passed++;
  }
  return passed;
}
const plannerControlSelectionCases=assertPlannerControlCommandSelection();

// Rene transportændringer vælger fire fulde mål; ingen ejerindgang eller blanket Pages-fritagelse.
const transportInputs=['scripts/lib/run-sealed-pages-deployment.mjs','scripts/test-ordinary-pages-immediate-retry.mjs'];
const transportCommands=CURRENT_CONTRACT_COMMANDS.pages.filter(command=>command!==deploymentCommand);
for(const inputs of [transportInputs.slice(0,1).map(modified),transportInputs.slice(1).map(modified),transportInputs.map(modified),
  [modified(transportInputs[0]),modified('CHANGELOG.md'),modified('docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md')],
  [...transportInputs.map(modified),modified('scripts/source-current-contract-plan.mjs'),modified('scripts/test-source-current-contracts.mjs')],
  [modified(transportInputs[1]),modified('HANDBOOK-RAVRADAR.md'),modified('docs/handbook/content.json')]]){
  const selected=pagesContractCommandsForChangedInputs(inputs);
  assert.deepEqual(selected,transportCommands);assert.equal(selected.length,4);assert(Object.isFrozen(selected));
  assert(!selected.includes(deploymentCommand));assert(!selected.includes(ownerCommand));
}
const transportMixedPaths=[...ownerHelpers,'scripts/verify-ravscore-operational-pages-deployment.mjs',
  'scripts/test-ravscore-operational-pages-deployment.mjs','.github/workflows/reusable-pages-deploy.yml',
  '.github/workflows/reusable-operational-reentry.yml','app.js','scripts/test-pages-generation-and-reentry.mjs',
  'scripts/test-protected-operational-reentry-evidence.mjs','scripts/source-current-contract-receipt.mjs',
  'scripts/source-targeted-consumer.mjs','scripts/sync-handbook-installation-copy.mjs',
  'scripts/test-handbook-review-archive-4.0.91.mjs','js/unclassified-production-feature.js'];
for(const extra of transportMixedPaths)for(const transport of transportInputs)
  assert.deepEqual(pagesContractCommandsForChangedInputs([modified(transport),modified(extra)]),CURRENT_CONTRACT_COMMANDS.pages);
for(const inputs of [[],null,[modified('CHANGELOG.md')],[modified('scripts/source-current-contract-plan.mjs')],
  [modified(transportInputs[0]),modified(transportInputs[0])],
  [{...modified(transportInputs[0]),status:'A',beforeMode:'000000'}],
  [{...modified(transportInputs[1]),status:'D',afterMode:'000000'}],
  [{...modified(transportInputs[0]),beforeMode:'100755'}],
  [{...modified(transportInputs[1]),afterMode:'100755'}],
  [{...modified(transportInputs[0]),status:'R100'}],
  [modified(transportInputs[0]),{...modified('CHANGELOG.md'),status:'A',beforeMode:'000000'}],
  [modified(transportInputs[0]),{...modified('scripts/test-source-current-contracts.mjs'),afterMode:'100755'}],
  [modified(transportInputs[0]),{}],[modified(transportInputs[0]),null]])
  assert.deepEqual(pagesContractCommandsForChangedInputs(inputs),CURRENT_CONTRACT_COMMANDS.pages);
// Slut på de nye rene transportassertions.

// Assistant Edge scope: the same assertions run in the normal Git fixture.
function assertAssistantEdgePlanScope({baselineCommit,baselineTree,rewriteTree,makeCommit,checkoutCommit,plan,restoreHead}){
  const files=['supabase/functions/ravradar-assistant/index.ts',
    'scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
    'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
    'supabase/functions/_shared/rav-assistant-contract.ts'];
  const commands=['node scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
    'node scripts/test-rav-assistant-main-edge-roundtrip.mjs'];
  assert.deepEqual(CURRENT_CONTRACT_COMMANDS.assistantEdge,commands);
  const roundtrip=commands[1],results=[];
  const select=(label,paths)=>{
    const changes=paths.map(file=>[file,Buffer.from('// Synthetic assistant scope '+label+'\n')]);
    const candidate=makeCommit(rewriteTree(baselineTree,changes),[baselineCommit],'synthetic assistant scope '+label);
    checkoutCommit(candidate);
    const selected=plan({baselineCommit,candidateCommit:candidate,expectedHead:candidate});
    results.push({label,plan:selected});return selected;
  };
  const positive=selected=>{
    assert.equal(selected.status,'PLANNED');assert.equal(selected.selection,'CURRENT_CONTRACTS');
    assert.deepEqual(selected.areas.assistantEdge.commands,commands);
    assert.equal(selected.controlQualificationRequired,true);
    assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
  };
  try{
    for(const file of files){
      const selected=select(file,[file]);positive(selected);
      assert.deepEqual(Object.keys(selected.areas),['core','assistantEdge']);
      assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...commands]);
    }
    const all=select('all-four',files);positive(all);
    assert.deepEqual(all.areas.assistantEdge.changedPaths,[...files].sort());
    assert.deepEqual(all.commands,[...CURRENT_CONTRACT_COMMANDS.core,...commands]);
    const mixed=select('with-public-ui',[files[0],'app.js']);positive(mixed);
    assert.deepEqual(mixed.areas.publicUI.commands,CURRENT_CONTRACT_COMMANDS.publicUI);
    assert.deepEqual(mixed.commands,[...new Set([...CURRENT_CONTRACT_COMMANDS.core,...commands,...CURRENT_CONTRACT_COMMANDS.publicUI])]);
    assert.equal(mixed.commands.filter(command=>command===roundtrip).length,1);
    const ui=select('public-ui-only',['app.js']);
    assert.equal(ui.selection,'CURRENT_CONTRACTS');assert.equal(ui.areas.assistantEdge,undefined);
    assert.deepEqual(ui.areas.publicUI.commands,CURRENT_CONTRACT_COMMANDS.publicUI);
    assert.equal(ui.commands.filter(command=>command===roundtrip).length,1);
    for(const file of ['supabase/functions/_shared/unclassified-assistant.ts',
      'supabase/functions/other-assistant/index.ts','supabase/functions/ravradar-assistant/diagnostic.ts',
      'scripts/test-rav-assistant-extra.mjs']){
      const selected=select(file,[files[0],file]);assert.equal(selected.selection,'FULL');
      assert.deepEqual(selected.reasonCodes,['CURRENT_UNCLASSIFIED_PATH']);assert.deepEqual(selected.commands,[]);
    }
    const protectedInput=select('assistant-contract-with-model-input',
      ['supabase/functions/_shared/rav-assistant-contract.ts','config.js']);
    assert.equal(protectedInput.selection,'FULL');assert.deepEqual(protectedInput.commands,[]);
    assert.deepEqual(protectedInput.reasonCodes,['CURRENT_PROTECTED_INPUT_CHANGED']);
    for(const qualification of ['ACTUAL_POSTGRES','ACTUAL_MODEL_C','ACTUAL_MODEL_I'])
      assert(protectedInput.requiredQualifications.includes(qualification));
    const shared=select('shared-gateway',['supabase/functions/_shared/public-gateway.ts']);
    assert.equal(shared.selection,'FULL');assert.deepEqual(shared.commands,[]);
    assert.equal(shared.areas.assistantEdge,undefined);
    return results;
  }finally{checkoutCommit(restoreHead);}
}
// End Assistant Edge scope assertions.

// Exact existing sharing/erasure paths; all assertions also run in the normal Git fixture.
// Samme normale Git-/analyzerkald som de øvrige CURRENT-ejerassertions.
function assertPlannerAndSharingPlanScope({baselineCommit,baselineTree,rewriteTree,makeCommit,checkoutCommit,plan,restoreHead}){
  const controls=['scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs'];
  const pages=['.github/workflows/deploy-forecast-share-pages.yml',
    'scripts/deploy-forecast-share-pages.mjs','scripts/test-forecast-share-pages-deploy.mjs'];
  const sharing=['node scripts/test-map-forecast-timeline.mjs','node scripts/test-forecast-share-projection.mjs',
    'node scripts/test-forecast-share-pages-deploy.mjs'];
  const release=['scripts/set-version.mjs','scripts/test-private-production-runtime-workflow.mjs',
    'scripts/test-release-contract-metadata.mjs'];
  const releaseCommands=['node scripts/test-private-production-runtime-workflow.mjs',
    'node scripts/test-release-contract-metadata.mjs'];
  const narrow=sourceControlCommandsForChangedInputs(controls.map(modified)),results=[];
  assert.deepEqual(CURRENT_CONTRACT_COMMANDS.sharing,sharing);
  const tree=rewriteTree(baselineTree,[...pages,...release,'scripts/validate-release-version.mjs']
    .map(file=>[file,fixtureControlBytes(file)]));
  const prior=makeCommit(tree,[baselineCommit],'synthetic existing Pages controller and current controls');
  const before=file=>git(root,['cat-file','blob',prior+':'+file]);
  const changed=files=>files.map(file=>[file,Buffer.concat([before(file),Buffer.from('\n// Synthetic normal scope delta\n')])]);
  const select=(label,files,extra=[])=>{
    const candidate=makeCommit(rewriteTree(tree,[...changed(files),...extra]),[prior],'synthetic planner/sharing '+label);
    checkoutCommit(candidate);const selected=plan({baselineCommit:prior,candidateCommit:candidate,expectedHead:candidate});
    results.push({label,plan:selected});return selected;
  };
  const positive=selected=>{
    assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
    assert.equal(selected.controlQualificationRequired,true);
    assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
  };
  try{
    const all=select('planner-and-all-Pages-owners',[...controls,...pages]);positive(all);
    assert.deepEqual(all.areas.sourceControls.commands,narrow);assert.deepEqual(all.areas.sharing.commands,sharing);
    assert.deepEqual(all.commands,[...new Set([...CURRENT_CONTRACT_COMMANDS.core,...narrow,...sharing])]);
    const unknown=select('unknown-neighbour',[...controls,pages[1]],
      [['scripts/deploy-forecast-share-pages-extra.mjs',Buffer.from('// Unknown neighbouring source\n')]]);
    assert.equal(unknown.selection,'FULL');assert.deepEqual(unknown.reasonCodes,['CURRENT_UNCLASSIFIED_PATH']);
    const protectedFiles=['config.js','js/core/ravscore-model-contract.js','scripts/fixtures/statistics-preference-revision-input.json'];
    const protectedChanges=protectedFiles.map(file=>[file,Buffer.concat([before(file),Buffer.from('\n')])]);
    const protectedHead=makeCommit(rewriteTree(tree,[...changed(controls),...protectedChanges]),[prior],'synthetic protected planner neighbour');
    checkoutCommit(protectedHead);
    const protectedPlan=plan({baselineCommit:prior,candidateCommit:protectedHead,expectedHead:protectedHead});
    results.push({label:'protected-inputs',plan:protectedPlan});
    assert.equal(protectedPlan.selection,'FULL');assert.deepEqual(protectedPlan.reasonCodes,['CURRENT_PROTECTED_INPUT_CHANGED']);
    assert(protectedPlan.requiredQualifications.includes('ACTUAL_POSTGRES'));
    checkoutCommit(prior);git(root,['update-index','--chmod=+x','--',pages[1]]);
    const mode=makeCommit(text(root,['write-tree']),[prior],'synthetic Pages controller mode change');checkoutCommit(mode);
    const modePlan=plan({baselineCommit:prior,candidateCommit:mode,expectedHead:mode});results.push({label:'Pages-mode-change',plan:modePlan});
    assert.equal(modePlan.selection,'FULL');
    assert.deepEqual(modePlan.reasonCodes,['CURRENT_SMALL_USER_CONTRACT_REQUIRES_EXISTING_REGULAR_SOURCE']);
    // Release metadata uses the same normal Git fixture; no separate suite or proof cohort.
    assert.deepEqual(CURRENT_CONTRACT_COMMANDS.releaseMetadata,releaseCommands);
    for(const files of [release,[release[0]]]){
      const selected=select(files.length===1?'release-setter-only':'release-metadata-owners',files);positive(selected);
      assert.deepEqual(selected.areas.releaseMetadata.commands,releaseCommands);
      assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...releaseCommands]);
      assert.deepEqual(selected.areas.releaseMetadata.changedPaths,[...files].sort());
    }
    const mixed=select('release-metadata-and-validator',[...release,...controls,'scripts/validate-release-version.mjs']);positive(mixed);
    assert.deepEqual(mixed.areas.sourceControls.commands,CURRENT_CONTRACT_COMMANDS.sourceControls);
    assert.deepEqual(mixed.commands,[...new Set([...CURRENT_CONTRACT_COMMANDS.core,...releaseCommands,...CURRENT_CONTRACT_COMMANDS.sourceControls])]);
    const releaseUnknown=select('unknown-release-neighbour',[release[0]],
      [['scripts/set-version-extra.mjs',Buffer.from('// Unknown neighbouring version source\n')]]);
    assert.equal(releaseUnknown.selection,'FULL');assert.deepEqual(releaseUnknown.reasonCodes,['CURRENT_UNCLASSIFIED_PATH']);
    const boundPolicy='scripts/private-production-runtime-workflow.mjs';
    const policy=select('changed-bound-runtime-policy',[release[0]],
      [[boundPolicy,Buffer.concat([before(boundPolicy),Buffer.from('\n// Synthetic bound policy delta\n')])]]);
    assert.equal(policy.selection,'FULL');assert.deepEqual(policy.reasonCodes,['CURRENT_PROTECTED_INPUT_CHANGED']);
    assert(policy.requiredQualifications.includes('ACTUAL_MODEL_C'));assert(policy.requiredQualifications.includes('ACTUAL_MODEL_I'));
    checkoutCommit(prior);git(root,['update-index','--force-remove','--',release[0]]);
    const absentTree=text(root,['write-tree']),absent=makeCommit(absentTree,[prior],'synthetic absent release setter');
    checkoutCommit(absent);
    const deleted=plan({baselineCommit:prior,candidateCommit:absent,expectedHead:absent});results.push({label:'release-setter-deleted',plan:deleted});
    assert.equal(deleted.selection,'FULL');assert.deepEqual(deleted.reasonCodes,['CURRENT_RELEASE_METADATA_REQUIRES_EXISTING_REGULAR_SOURCE']);
    const addedHead=makeCommit(tree,[absent],'synthetic added release setter');checkoutCommit(addedHead);
    const added=plan({baselineCommit:absent,candidateCommit:addedHead,expectedHead:addedHead});results.push({label:'release-setter-added',plan:added});
    assert.equal(added.selection,'FULL');assert.deepEqual(added.reasonCodes,['CURRENT_RELEASE_METADATA_REQUIRES_EXISTING_REGULAR_SOURCE']);
    checkoutCommit(prior);git(root,['update-index','--chmod=+x','--',release[0]]);
    const modeHead=makeCommit(text(root,['write-tree']),[prior],'synthetic release setter mode change');checkoutCommit(modeHead);
    const releaseMode=plan({baselineCommit:prior,candidateCommit:modeHead,expectedHead:modeHead});results.push({label:'release-setter-mode-change',plan:releaseMode});
    assert.equal(releaseMode.selection,'FULL');assert.deepEqual(releaseMode.reasonCodes,['CURRENT_RELEASE_METADATA_REQUIRES_EXISTING_REGULAR_SOURCE']);
    // End release metadata scope assertions.
    return results;
  }finally{checkoutCommit(restoreHead);}
}

function assertSmallUserContractPlanScope({baselineCommit,baselineTree,rewriteTree,makeCommit,checkoutCommit,plan,restoreHead}){
  let passed=0;
  const definitions=[
    {area:'sharing',paths:['scripts/forecast-share/handler.mjs','scripts/test-forecast-share-projection.mjs'],
      commands:['node scripts/test-map-forecast-timeline.mjs','node scripts/test-forecast-share-projection.mjs',
        'node scripts/test-forecast-share-pages-deploy.mjs']},
    {area:'ownerErasure',paths:['supabase/functions/_shared/trip-owner-erasure.js','scripts/test-delete-trip-owner-data-readback.mjs'],
      commands:['node --test scripts/test-delete-trip-owner-data-readback.mjs']},
  ];
  const select=(before,tree,changes,label)=>{
    const candidate=makeCommit(rewriteTree(tree,changes),[before],'synthetic exact user contract '+label);checkoutCommit(candidate);
    return plan({baselineCommit:before,candidateCommit:candidate,expectedHead:candidate});
  };
  const refuse=(selected,reason)=>{
    assert.equal(selected.selection,'FULL',JSON.stringify(selected));
    assert.deepEqual(selected.reasonCodes,[reason]);assert.deepEqual(selected.commands,[]);passed++;
  };
  try{
    for(const def of definitions){
      const original=def.paths.map(file=>[file,fixtureControlBytes(file)]),tree=rewriteTree(baselineTree,original);
      const prior=makeCommit(tree,[baselineCommit],'synthetic existing '+def.area);
      const changes=original.map(([file,bytes])=>[file,Buffer.concat([bytes,Buffer.from('\n// Synthetic exact contract body change\n')])]);
      const selected=select(prior,tree,changes,def.area);
      assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
      assert.deepEqual(CURRENT_CONTRACT_COMMANDS[def.area],def.commands);
      assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...def.commands]);
      assert.deepEqual(selected.areas[def.area].changedPaths,[...def.paths].sort());
      assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
      assert.equal(selected.controlQualificationRequired,true);passed++;
      const caller=def.paths[0];checkoutCommit(prior);git(root,['update-index','--force-remove','--',caller]);
      const absentTree=text(root,['write-tree']),absent=makeCommit(absentTree,[prior],'synthetic absent '+def.area);
      const deleted=makeCommit(absentTree,[prior],'synthetic deleted '+def.area);checkoutCommit(deleted);
      refuse(plan({baselineCommit:prior,candidateCommit:deleted,expectedHead:deleted}),'CURRENT_SMALL_USER_CONTRACT_REQUIRES_EXISTING_REGULAR_SOURCE');
      const added=makeCommit(tree,[absent],'synthetic added '+def.area);checkoutCommit(added);
      refuse(plan({baselineCommit:absent,candidateCommit:added,expectedHead:added}),'CURRENT_SMALL_USER_CONTRACT_REQUIRES_EXISTING_REGULAR_SOURCE');
      checkoutCommit(prior);git(root,['update-index','--chmod=+x','--',caller]);
      const mode=makeCommit(text(root,['write-tree']),[prior],'synthetic executable '+def.area);checkoutCommit(mode);
      refuse(plan({baselineCommit:prior,candidateCommit:mode,expectedHead:mode}),'CURRENT_SMALL_USER_CONTRACT_REQUIRES_EXISTING_REGULAR_SOURCE');
    }
    const allPaths=[...definitions.flatMap(def=>def.paths),'scripts/weather-component-progress-cache.mjs','scripts/test-weather-component-progress-cache.mjs'];
    const allBytes=allPaths.map(file=>[file,fixtureControlBytes(file)]),tree=rewriteTree(baselineTree,allBytes),prior=makeCommit(tree,[baselineCommit],'synthetic six existing contract owners');
    const changes=allBytes.map(([file,bytes])=>[file,Buffer.concat([bytes,Buffer.from('\n// Synthetic owned source delta\n')])]);
    const selected=select(prior,tree,changes,'all six');
    assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
    assert.deepEqual(selected.commands,[...new Set([...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.sharing,
      ...CURRENT_CONTRACT_COMMANDS.ownerErasure,...CURRENT_CONTRACT_COMMANDS.weatherProgressRecovery])]);
    assert.equal(selected.controlQualificationRequired,true);passed++;
    for(const file of ['scripts/forecast-share/unclassified-handler.mjs','supabase/functions/_shared/unclassified-erasure.js'])
      refuse(select(prior,tree,[...changes,[file,Buffer.from('// Unknown neighbouring source\n')]],file),'CURRENT_UNCLASSIFIED_PATH');
    const protectedBefore=git(root,['cat-file','blob',prior+':config.js']);
    refuse(select(prior,tree,[...changes,['config.js',Buffer.concat([protectedBefore,Buffer.from('\n// Changed protected input\n')])]],'protected input'),
      'CURRENT_PROTECTED_INPUT_CHANGED');
    return passed;
  }finally{checkoutCommit(restoreHead);}
}


// Existing whole account target also owns its normally imported month/controller modules.
function assertPrivateStudyPlanScope({baselineCommit,baselineTree,rewriteTree,makeCommit,checkoutCommit,plan,restoreHead}){
  const paths=[".github/workflows/private-trip-weather-study.yml","scripts/publish-private-trip-weather-study.mjs","scripts/deploy-private-trip-study.mjs","scripts/test-trip-aggregate-month-rollover.mjs","scripts/test-private-trip-study-categorical-controller.mjs","scripts/test-account-statistics-assistant-callers.mjs","cloudflare/trip-gateway/trip-aggregate-row.js"],command='node --test scripts/test-account-statistics-assistant-callers.mjs';
  assert.deepEqual(CURRENT_CONTRACT_COMMANDS.privateStudy,[command]);
  // The one normal account target executes its imported month/controller cases.
  // Planning checks owner scope and refusal boundaries, not source spelling.
  const owner=currentWorkflowTargets(paths[0]);
  assert.deepEqual(owner,{path:paths[0],owners:[{area:'privateStudy',commands:[command]}]});
  const original=paths.map(file=>[file,fixtureControlBytes(file)]),tree=rewriteTree(baselineTree,original);
  const prior=makeCommit(tree,[baselineCommit],'synthetic existing private-study callers'),results=[];
  const select=(files,extra=[])=>{
    const changes=files.map(file=>[file,Buffer.concat([git(root,['cat-file','blob',prior+':'+file]),Buffer.from('\n// Synthetic private-study owner delta\n')])]);
    const candidate=makeCommit(rewriteTree(tree,[...changes,...extra]),[prior],'synthetic private-study scope');
    checkoutCommit(candidate);const result=plan({baselineCommit:prior,candidateCommit:candidate,expectedHead:candidate});results.push(result);return result;
  };
  const safe=result=>{
    assert.equal(result.selection,'CURRENT_CONTRACTS',JSON.stringify(result));
    assert.deepEqual(result.areas.privateStudy.commands,[command]);
    assert.equal(result.controlQualificationRequired,true);
    assert.deepEqual(result.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
    assert.equal(result.commands.filter(value=>value===command).length,1);
    assert.equal(result.authority,'PLANNING_ONLY');
    for(const field of ['baselineQualified','skipAuthorized','productionAuthority'])assert.equal(result[field],false);
  };
  const refused=result=>{assert.equal(result.selection,'FULL',JSON.stringify(result));assert.deepEqual(result.commands,[]);};
  try{
    for(const file of paths){const result=select([file]);safe(result);assert.deepEqual(result.areas.privateStudy.changedPaths,[file]);}
    const together=select(paths);safe(together);assert.deepEqual(together.areas.privateStudy.changedPaths,[...paths].sort());
    assert.deepEqual(together.commands,[...CURRENT_CONTRACT_COMMANDS.core,command]);
    for(const neighbour of ['scripts/publish-private-trip-weather-study-extra.mjs','.github/workflows/private-trip-weather-study-extra.yml','cloudflare/trip-gateway/trip-aggregate-row-extra.js']){
      const result=select([paths[0]],[[neighbour,Buffer.from('// Unknown adjacent owner\n')]]);refused(result);
      assert.deepEqual(result.reasonCodes,['CURRENT_UNCLASSIFIED_PATH']);
    }
    const protectedFile='config.js',before=git(root,['cat-file','blob',prior+':'+protectedFile]);
    const protectedResult=select([paths[0]],[[protectedFile,Buffer.concat([before,Buffer.from('\n// Protected drift\n')])]]);
    refused(protectedResult);assert.deepEqual(protectedResult.reasonCodes,['CURRENT_PROTECTED_INPUT_CHANGED']);
    for(const file of paths.slice(0,3)){
      checkoutCommit(prior);git(root,['update-index','--force-remove','--',file]);
      const absent=makeCommit(text(root,['write-tree']),[prior],'synthetic absent private-study caller');
      checkoutCommit(absent);const deleted=plan({baselineCommit:prior,candidateCommit:absent,expectedHead:absent});refused(deleted);
      assert.deepEqual(deleted.reasonCodes,['CURRENT_SMALL_USER_CONTRACT_REQUIRES_EXISTING_REGULAR_SOURCE']);
      const added=makeCommit(tree,[absent],'synthetic added private-study caller');checkoutCommit(added);
      const addPlan=plan({baselineCommit:absent,candidateCommit:added,expectedHead:added});refused(addPlan);
      assert.deepEqual(addPlan.reasonCodes,['CURRENT_SMALL_USER_CONTRACT_REQUIRES_EXISTING_REGULAR_SOURCE']);
      checkoutCommit(prior);git(root,['update-index','--chmod=+x','--',file]);
      const executable=makeCommit(text(root,['write-tree']),[prior],'synthetic private-study mode');checkoutCommit(executable);
      const modePlan=plan({baselineCommit:prior,candidateCommit:executable,expectedHead:executable});refused(modePlan);
      assert.deepEqual(modePlan.reasonCodes,['CURRENT_SMALL_USER_CONTRACT_REQUIRES_EXISTING_REGULAR_SOURCE']);
    }
    return results.length+9;
  }finally{checkoutCommit(restoreHead);}
}

// Syntetisk støtteprøve af DEN normale forberedelse/argv; ingen Linux-/SDK-PASS.
function assertOwnedCacheNativePreparation(){
  assert.deepEqual(CURRENT_CONTRACT_COMMANDS.ownedCacheNative,
    [OWNED_CACHE_DEPENDENCY_COMMAND,OWNED_CACHE_NATIVE_COMMAND]);
  assert.equal(currentChangeCommand(OWNED_CACHE_NATIVE_COMMAND),true);
  for(const command of [OWNED_CACHE_NATIVE_COMMAND+' --official-sdk-only',
    OWNED_CACHE_NATIVE_COMMAND+' --unknown','python -c print(1)'])assert.equal(currentChangeCommand(command),false);
  const source=fs.readFileSync(path.join(SOURCE,'scripts/source-targeted-producer.mjs'),'utf8');
  const begin='function prepareSelectedOwnedCacheNativeSourceTarget(commands){',end='function prepareSelectedScalarSourceTarget(commands){';
  assert.equal(source.split(begin).length,2);assert.equal(source.split(end).length,2);
  const body=source.slice(source.indexOf(begin),source.indexOf(end));
  const ownRoot='/own/source',node24='/tools/node24/bin/node';
  let calls=[],filesystem=0,failInstall=false,version='v24.0.0\n';
  const ownEnvironment={PATH:'/usr/bin',LANG:'C.UTF-8',RAVRADAR_SOURCE_NODE24:node24,
    GITHUB_TOKEN:'synthetic-never-forward',ACTIONS_RUNTIME_TOKEN:'synthetic-never-forward',
    NODE_OPTIONS:'synthetic-never-forward',SUPABASE_SERVICE_ROLE_KEY:'synthetic-never-forward'};
  const fakeFs={constants:{O_WRONLY:1,O_CREAT:2,O_EXCL:4,O_NOFOLLOW:8},
    realpathSync(value){filesystem++;return value==='/tools/node24/bin/npm'?'/tools/node24/lib/node_modules/npm/bin/npm-cli.js':value;},
    readFileSync(){return '{"name":"npm"}';},
    lstatSync(value){filesystem++;if(value.endsWith('/.npmrc'))throw Object.assign(Error('SYNTHETIC_ABSENT'),{code:'ENOENT'});
      const directory=value.endsWith('/.npm-cache');
      return {isFile:()=>!directory,isDirectory:()=>directory,isSymbolicLink:()=>false,nlink:1,size:0};},
    mkdirSync(){filesystem++;},openSync(){filesystem++;return 17;},closeSync(){filesystem++;}};
  const context={assert,fs:fakeFs,path:path.posix,ROOT:ownRoot,process:{platform:'linux',env:ownEnvironment},
    OWNED_CACHE_DEPENDENCY_COMMAND,OWNED_CACHE_NATIVE_COMMAND,
    execFileSync(executable,args,options){
      calls.push({executable,args:Array.from(args),options});
      for(const key of ['GITHUB_TOKEN','GH_TOKEN','ACTIONS_RUNTIME_TOKEN','SUPABASE_SERVICE_ROLE_KEY','NODE_OPTIONS'])
        assert.equal(options.env[key],undefined);
      if(args[0]==='--version')return version;
      assert.equal(executable,node24);
      assert.deepEqual(Array.from(args),['/tools/node24/lib/node_modules/npm/bin/npm-cli.js','ci','--ignore-scripts','--no-audit','--no-fund']);
      assert.equal(options.cwd,ownRoot+'/.github/actions/save-owned-dmi-grib');
      assert.equal(options.env.npm_config_cache,options.cwd+'/.npm-cache');
      assert.notEqual(options.env.npm_config_userconfig,options.env.npm_config_globalconfig);
      assert.equal(options.timeout,300000);
      if(failInstall)throw Error('SYNTHETIC_NPM_FAILURE');return Buffer.alloc(0);
    }};
  const functions=vm.runInNewContext(body+'\n({prepareSelectedOwnedCacheNativeSourceTarget,ownedCacheNativeInvocation});',context);
  const prepare=functions.prepareSelectedOwnedCacheNativeSourceTarget;
  assert.equal(prepare(CURRENT_CONTRACT_COMMANDS.core),null);assert.equal(calls.length,0);assert.equal(filesystem,0);
  assert.throws(()=>prepare([OWNED_CACHE_DEPENDENCY_COMMAND]),/PLAN_REFUSED/);
  const runtime=prepare(CURRENT_CONTRACT_COMMANDS.ownedCacheNative);assert.equal(calls.length,2);
  const dependency=functions.ownedCacheNativeInvocation(OWNED_CACHE_DEPENDENCY_COMMAND,runtime);
  const native=functions.ownedCacheNativeInvocation(OWNED_CACHE_NATIVE_COMMAND,runtime);
  assert.equal(dependency.program,node24);assert.deepEqual(Array.from(dependency.args),['scripts/test-owned-dmi-cache-dependency.mjs']);
  assert.equal(native.program,'python');assert.deepEqual(Array.from(native.args),
    ['-B','scripts/test-owned-dmi-grib-save-native.py','--node24-path',node24]);
  assert(!native.args.includes('--official-sdk-only'),'Whole-file owner must execute the whole normal file');
  assert.throws(()=>functions.ownedCacheNativeInvocation(OWNED_CACHE_NATIVE_COMMAND+' --unknown',runtime),/COMMAND_REFUSED/);
  failInstall=true;assert.throws(()=>prepare(CURRENT_CONTRACT_COMMANDS.ownedCacheNative),/PREREQUISITE_FAILED/);failInstall=false;
  version='v22.0.0\n';assert.throws(()=>prepare(CURRENT_CONTRACT_COMMANDS.ownedCacheNative),/NODE24_REFUSED/);version='v24.0.0\n';
  context.process.platform='win32';assert.throws(()=>prepare(CURRENT_CONTRACT_COMMANDS.ownedCacheNative),/LINUX_REQUIRED/);
  return 9;
}

// Run the actual bounded prerequisite function with a synthetic pip transport only.
function assertSelectedProgressCopernicusPrerequisite(){
  const source=fs.readFileSync(path.join(SOURCE,'scripts/source-targeted-producer.mjs'),'utf8');
  const start='function prepareSelectedScalarSourceTarget(commands){',end='\nfunction finalProofHash(zip){';
  assert.equal(source.split(start).length,2);assert.equal(source.split(end).length,2);
  const body=source.slice(source.indexOf(start),source.indexOf(end));
  const declaration=source.slice(source.indexOf('const LOCAL_RESTORE_ENVIRONMENT='),source.indexOf('\nconst RECEIPT='));
  const scalar='node --test scripts/test-weather-component-normal-wireup.mjs';
  const progress='node --test scripts/test-weather-component-progress-cache.mjs scripts/test-weather-component-progress-workflow.mjs scripts/test-dmi-progress-inputs.mjs';
  let calls=[],failed=false;
  const childEnvironment={PATH:process.env.PATH??process.env.Path,SystemRoot:process.env.SystemRoot,
    LD_LIBRARY_PATH:'synthetic-runtime-library',DYLD_LIBRARY_PATH:'synthetic-runtime-library',PYTHON:'synthetic-python',
    GITHUB_TOKEN:'synthetic-never-forward',SUPABASE_SERVICE_ROLE_KEY:'synthetic-never-forward',
    COPERNICUSMARINE_SERVICE_PASSWORD:'synthetic-never-forward'};
  const context={process:{env:childEnvironment,platform:process.platform},ROOT:SOURCE,copernicusOfflineEnvironment,
    execFileSync(executable,args,options){
      calls.push({executable,args,options});assert.equal(executable,'synthetic-python');
      assert.deepEqual(Array.from(args),['-m','pip','install','--disable-pip-version-check','--no-input','-r','requirements-copernicus.txt']);
      assert.equal(options.cwd,SOURCE);assert.equal(options.timeout,120000);assert.equal(options.maxBuffer,2*1024*1024);
      assert.deepEqual(Array.from(options.stdio),['ignore','inherit','inherit']);
      assert.equal(options.env.LD_LIBRARY_PATH,childEnvironment.LD_LIBRARY_PATH);
      assert.equal(options.env.DYLD_LIBRARY_PATH,childEnvironment.DYLD_LIBRARY_PATH);
      assert.equal(options.env.PIP_CONFIG_FILE,process.platform==='win32'?'NUL':'/dev/null');
      for(const key of ['GITHUB_TOKEN','GH_TOKEN','SUPABASE_SERVICE_ROLE_KEY','COPERNICUSMARINE_SERVICE_PASSWORD'])assert.equal(options.env[key],undefined);
      if(failed)throw Error('SYNTHETIC_PREREQUISITE_FAILURE');return Buffer.alloc(0);
    }};
  const prepare=vm.runInNewContext(declaration+'\n'+body+'\nprepareSelectedScalarSourceTarget;',context);
  for(const commands of [[scalar],[progress],[scalar,progress]]){calls=[];prepare(commands);assert.equal(calls.length,1);}
  for(const commands of [['node --test scripts/test-delete-trip-owner-data-readback.mjs'],[progress+' --unknown']]){
    calls=[];prepare(commands);assert.equal(calls.length,0);
  }
  calls=[];failed=true;assert.throws(()=>prepare([progress]),/SOURCE_TARGETED_SCALAR_PREREQUISITE_FAILED/);assert.equal(calls.length,1);
  return 6;
}


// Archive outer queue: identical assertions also run in the normal Git fixture.
function assertArchiveOuterQueuePlanScope({baselineCommit,baselineTree,rewriteTree,makeCommit,checkoutCommit,plan,restoreHead,fixtureSource,workflowSource}){
  const fixture='scripts/test-supabase-cli-local-restore.mjs';
  const workflow='.github/workflows/verify-supabase-cli-local-restore.yml';
  const oldGroup="  group: ${{ inputs.restore_mode == 'archive' && 'ravradar-weather-production-v2' || 'ravradar-synthetic-standard-local-restore' }}\n";
  const newGroup=oldGroup.replace('ravradar-weather-production-v2','ravradar-isolated-archive-restore');
  const legacyWorkflow=archiveRestoreWorkflowWithoutInventory(workflowSource);
  const original=legacyWorkflow.includes(newGroup)?legacyWorkflow.replace(newGroup,oldGroup):legacyWorkflow;
  assert.equal(original.split(oldGroup).length,2);
  const changed=original.replace(oldGroup,newGroup);
  const mutate=(source,from,to)=>{assert(source.includes(from),from);return source.replace(from,to);};
  const invalid=[
    ['synthetic-queue',mutate(changed,'ravradar-synthetic-standard-local-restore','other-synthetic-queue')],
    ['trip-lock',mutate(changed,'ravradar-trip-storage-production','other-trip-lock')],
    ['queue',mutate(changed,'  queue: max\n','  queue: single\n')],
    ['cancel',mutate(changed,'  cancel-in-progress: false\n','  cancel-in-progress: true\n')],
    ['confirmation',mutate(changed,'RESTORE-PRIVATE-ARCHIVE-IN-ISOLATED-LOCAL-POSTGRES','OTHER-CONFIRMATION')],
    ['inputs',mutate(changed,'        default: synthetic\n','        default: archive\n')],
    ['timeout',mutate(changed,'    timeout-minutes: 30\n','    timeout-minutes: 31\n')],
    ['permissions',mutate(changed,'  contents: read\n','  contents: write\n')],
    ['env',mutate(changed,'          EXPECTED_HEAD_SHA:','          OTHER_EXPECTED_HEAD_SHA:')],
    ['command',mutate(changed,'run: node scripts/test-supabase-cli-local-restore.mjs --self-test','run: node scripts/test-supabase-cli-local-restore.mjs --run-archive-restore')],
    ['secret',changed+'\nenv:\n  EXTRA: ${{ secrets.EXTRA }}\n'],
    ['comment',changed+'\n# Unrelated workflow change\n'],
    ['duplicate-new',changed+newGroup],['duplicate-old',changed+oldGroup],
    ['wrong-group',changed.replace('ravradar-isolated-archive-restore','other-archive-queue')],
    ['indent',changed.replace(newGroup,' '+newGroup)],
    ['context',changed.replace('\nconcurrency:\n','\nother-concurrency:\n')],
    ['CRLF',changed.replaceAll('\n','\r\n')],['NUL',changed+'\0'],
  ];
  assert.equal(isArchiveRestoreOuterQueueOnlyChange(original,changed),true);
  assert.equal(isArchiveRestoreOuterQueueOnlyChange(original,original),false);
  assert.equal(isArchiveRestoreOuterQueueOnlyChange(changed,original),false);
  for(const[label,body]of invalid)assert.equal(isArchiveRestoreOuterQueueOnlyChange(original,body),false,label);
  assert.equal(isArchiveRestoreOuterQueueOnlyChange(original+oldGroup,changed+oldGroup),false);
  assert.equal(isArchiveRestoreOuterQueueOnlyChange(original+' '.repeat(256*1024),changed+' '.repeat(256*1024)),false);
  assert.equal(isArchiveRestoreOuterQueueOnlyChange(null,changed),false);
  const baseline=makeCommit(rewriteTree(baselineTree,[[fixture,Buffer.from(fixtureSource)],
    [workflow,Buffer.from(original)]]),[baselineCommit],'synthetic archive original outer queue');
  const tree=rewriteTree(baselineTree,[[fixture,Buffer.from(fixtureSource)],[workflow,Buffer.from(original)]]);
  const reviewedBody=fixtureSource.replace('const IMAGES=','// Synthetic reviewed fixture body\nconst IMAGES=');
  assert.notEqual(reviewedBody,fixtureSource);assert.equal(isBoundedLocalRestoreFixtureChange(fixtureSource,reviewedBody),true);
  const results=[],commands=['node scripts/test-supabase-cli-local-restore.mjs --self-test',
    'node --test scripts/test-archive-supabase-database-backup.mjs',
    'node --test scripts/test-supabase-database-backup-workflow.mjs',
    'node --test scripts/test-supabase-backup-lifecycle.mjs'];
  assert.deepEqual(CURRENT_CONTRACT_COMMANDS.backupRestore,commands);
  const select=(label,body,fixtureBody=reviewedBody)=>{
    const candidate=makeCommit(rewriteTree(tree,[[fixture,Buffer.from(fixtureBody)],[workflow,Buffer.from(body)]]),
      [baseline],'synthetic archive outer queue '+label);
    checkoutCommit(candidate);
    const selected=plan({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});
    results.push({label,plan:selected});return selected;
  };
  try{
    for(const[label,body]of [['unchanged-workflow',original],['exact-outer-queue',changed]]){
      const selected=select(label,body);assert.equal(selected.status,'PLANNED',label);
      assert.equal(selected.selection,'CURRENT_CONTRACTS');assert.equal(selected.controlQualificationRequired,true);
      assert.deepEqual(selected.areas.backupRestore.commands,commands);
      assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...commands]);
      assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
    }
    for(const[label,body]of invalid){
      const selected=select(label,body);assert.equal(selected.status,'REFUSED',label);
      assert.deepEqual(selected.reasonCodes,['CURRENT_RESTORE_FIXTURE_WORKFLOW_CHANGED'],label);
    }
    for(const[label,body]of [['import-frame','// Synthetic import mutation\n'+reviewedBody],
      ['dispatch-frame',reviewedBody+'\n// Synthetic dispatch mutation\n']]){
      const selected=select(label,changed,body);assert.equal(selected.status,'REFUSED',label);
      assert.deepEqual(selected.reasonCodes,['CURRENT_RESTORE_FIXTURE_SECURITY_FRAME_CHANGED'],label);
    }
    return results;
  }finally{checkoutCommit(restoreHead);}
}
// End archive outer queue scope assertions.


// Inventory er en ny, lukket sikkerhedsrolle; gammel CLI/origin retagges ikke.
function assertArchiveInventoryPlanScope({baselineCommit,baselineTree,rewriteTree,makeCommit,checkoutCommit,plan,restoreHead,fixtureSource,currentFixtureSource,workflowSource}){
  const fixture='scripts/test-supabase-cli-local-restore.mjs',workflow='.github/workflows/verify-supabase-cli-local-restore.yml';
  const legacyWorkflow=archiveRestoreWorkflowWithoutInventory(workflowSource);
  const branchStart=fixtureSource.indexOf("  else if(process.argv[2]==='--run-archive-inventory')");
  const branchEnd=fixtureSource.indexOf("  else if(process.argv[2]==='--run-archive-restore')");
  assert(branchStart>0&&branchEnd>branchStart);
  const branch=fixtureSource.slice(branchStart,branchEnd),legacyFixture=fixtureSource.replace(branch,'');
  assert.notEqual(legacyFixture,fixtureSource);
  assert.equal(isBoundedLocalRestoreFixtureChange(legacyFixture,fixtureSource),true);
  assert.equal(isBoundedLocalRestoreFixtureChange(fixtureSource,legacyFixture),true);
  assert.equal(isArchiveRestoreWorkflowChange(legacyWorkflow,workflowSource),true);
  assert.equal(isArchiveRestoreWorkflowChange(workflowSource,workflowSource),true);
  const mutate=(source,from,to)=>{assert.equal(source.split(from).length,2,from);return source.replace(from,to);};
  const badFixtures=[
    ['unknown-mode',mutate(fixtureSource,"process.argv[2]==='--run-archive-inventory'","process.argv[2]==='--run-private-inventory'")],
    ['mixed-mode',mutate(fixtureSource,"process.argv[2]==='--run-archive-inventory'","process.argv.includes('--run-archive-inventory')")],
    ['mode-args',mutate(fixtureSource,'await fixture({archive:true,inventoryOnly:true}).catch','await fixture({archive:true}).catch')],
    ['argc',mutate(fixtureSource,'process.argv.length===3','process.argv.length>=3')],
    ['duplicate-branch',fixtureSource.slice(0,branchStart)+branch+fixtureSource.slice(branchStart)],
  ];
  for(const[label,source]of badFixtures)assert.equal(isBoundedLocalRestoreFixtureChange(legacyFixture,source),false,label);
  const step=workflowSource.slice(workflowSource.indexOf('      - name: Read only the authenticated archive vendor-target inventory without Docker or SQL\n'));
  assert(step.length>0&&step.includes('--run-archive-inventory'));
  const sourceIf="        if: inputs.restore_mode == 'archive' || inputs.restore_mode == 'archive-inventory'\n";
  assert.equal(workflowSource.split(sourceIf).length,4);
  const badWorkflows=[
    ['unknown-mode',mutate(workflowSource,'options: [synthetic, archive, archive-inventory]','options: [synthetic, archive, archive-inventory, other]')],
    ['default',mutate(workflowSource,'        default: synthetic\n','        default: archive-inventory\n')],
    ['trip-lock',mutate(workflowSource,'ravradar-trip-storage-production','other-trip-lock')],
    ['outer-lock',mutate(workflowSource,'ravradar-isolated-archive-restore','other-archive-lock')],
    ['permissions',mutate(workflowSource,'  contents: read\n','  contents: write\n')],
    ['source-gate',workflowSource.replace(sourceIf,"        if: inputs.restore_mode == 'archive'\n")],
    ['source-required',mutate(workflowSource,'outputs.required }}" = false','outputs.required }}" = true')],
    ['inventory-sql',mutate(workflowSource,'run: node scripts/test-supabase-cli-local-restore.mjs --run-archive-inventory','run: node scripts/test-supabase-cli-local-restore.mjs --run-archive-restore')],
    ['inventory-env',mutate(workflowSource,step,step.replace('          EXPECTED_HEAD_SHA:','          OTHER_EXPECTED_HEAD_SHA:'))],
    ['cli-setup',mutate(workflowSource,"if: inputs.restore_mode != 'archive-inventory'","if: inputs.restore_mode == 'archive-inventory'")],
    ['duplicate-step',workflowSource+step],['extra-step',workflowSource+'      - run: private-unreviewed-command\n'],
    ['CRLF',workflowSource.replaceAll('\n','\r\n')],['NUL',workflowSource+'\0'],
  ];
  for(const[label,source]of badWorkflows)assert.equal(isArchiveRestoreWorkflowChange(legacyWorkflow,source),false,label);
  const oldGroup="  group: ${{ inputs.restore_mode == 'archive' && 'ravradar-weather-production-v2' || 'ravradar-synthetic-standard-local-restore' }}\n";
  const newGroup=oldGroup.replace('ravradar-weather-production-v2','ravradar-isolated-archive-restore');
  assert.equal(legacyWorkflow.split(newGroup).length,2);
  const oldQueueWorkflow=legacyWorkflow.replace(newGroup,oldGroup);
  assert.equal(isArchiveRestoreWorkflowChange(oldQueueWorkflow,workflowSource),true);
  const commands=CURRENT_CONTRACT_COMMANDS.backupRestore,results=[];
  const expectedCommands=[...CURRENT_CONTRACT_COMMANDS.core,...commands];
  const select=(label,previousFixture,previousWorkflow,nextFixture,nextWorkflow,extra=[])=>{
    const tree=rewriteTree(baselineTree,[[fixture,Buffer.from(previousFixture)],[workflow,Buffer.from(previousWorkflow)]]);
    const baseline=makeCommit(tree,[baselineCommit],'synthetic inventory baseline '+label);
    const candidate=makeCommit(rewriteTree(tree,[[fixture,Buffer.from(nextFixture)],[workflow,Buffer.from(nextWorkflow)],...extra]),[baseline],'synthetic inventory '+label);
    checkoutCommit(candidate);
    const selected=plan({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});
    results.push({label,plan:selected});return selected;
  };
  try{
    for(const[label,previousFixture,previousWorkflow,nextFixture]of [
      ['new-mode',legacyFixture,legacyWorkflow,fixtureSource],
      ['cumulative-outer-queue-and-mode',legacyFixture,oldQueueWorkflow,fixtureSource],
      ['installed-body',fixtureSource,workflowSource,fixtureSource.replace('const IMAGES=','// Synthetic reviewed inventory body\nconst IMAGES=')],
      ['workflow-only',fixtureSource,legacyWorkflow,fixtureSource],
    ]){
      const selected=select(label,previousFixture,previousWorkflow,nextFixture,workflowSource);
      assert.equal(selected.status,'PLANNED',label);assert.equal(selected.selection,'CURRENT_CONTRACTS');
      assert.equal(selected.controlQualificationRequired,true);assert.deepEqual(selected.areas.backupRestore.commands,commands);
      assert.deepEqual(selected.commands,expectedCommands);
      assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
    }
    const fixtureRejected=select('unknown-cli',legacyFixture,legacyWorkflow,badFixtures[0][1],workflowSource);
    assert.equal(fixtureRejected.selection,'FULL');assert.deepEqual(fixtureRejected.reasonCodes,['CURRENT_RESTORE_FIXTURE_SECURITY_FRAME_CHANGED']);
    const currentBody=currentFixtureSource.replace('const IMAGES=','// Reviewed update in the current fixture body\nconst IMAGES=');
    assert.notEqual(currentBody,currentFixtureSource);
    const currentSelected=select('actual-current-body',currentFixtureSource,workflowSource,currentBody,workflowSource);
    assert.equal(currentSelected.selection,'CURRENT_CONTRACTS');assert.equal(currentSelected.controlQualificationRequired,true);
    assert.deepEqual(currentSelected.commands,expectedCommands);
    for(const [label,body] of [['import-change','// Modified current import frame\n'+currentBody],
      ['dispatch-change',currentBody+'\n// Modified current dispatch frame\n']]){
      const currentRejected=select(label,currentFixtureSource,workflowSource,body,workflowSource);
      assert.equal(currentRejected.selection,'FULL');
      assert.deepEqual(currentRejected.reasonCodes,['CURRENT_RESTORE_FIXTURE_SECURITY_FRAME_CHANGED']);
      assert.deepEqual(currentRejected.commands,[]);assert.equal(currentRejected.skipAuthorized,false);
      assert.equal(currentRejected.productionAuthority,false);
    }
    for(const label of ['source-gate','inventory-sql']){
      const body=badWorkflows.find(row=>row[0]===label)[1];
      const rejected=select(label,fixtureSource,workflowSource,fixtureSource,body);
      assert.equal(rejected.selection,'FULL');assert.deepEqual(rejected.reasonCodes,['CURRENT_RESTORE_FIXTURE_WORKFLOW_CHANGED']);
    }
    const unknown=select('unknown-adjacent',legacyFixture,legacyWorkflow,fixtureSource,workflowSource,
      [['scripts/archive-inventory-unknown-helper.mjs',Buffer.from('// Unknown inventory helper\n')]]);
    assert.equal(unknown.selection,'FULL');assert.deepEqual(unknown.reasonCodes,['CURRENT_UNCLASSIFIED_PATH']);
    return results;
  }finally{checkoutCommit(restoreHead);}
}
// Slut på inventory-rollens normale plannerassertioner.

// Existing source-control responsibility: exact controller/library/test paths,
// whole normal targets, and no permission for adjacent unknown dependencies.
function assertSourceAutonomyPlanScope({baselineCommit,baselineTree,rewriteTree,makeCommit,checkoutCommit,plan,restoreHead}){
  const files=['.github/workflows/watch-missed-weather-schedule.yml','scripts/weather-source-gate.mjs',
    'scripts/lib/weather-source-gate.mjs','scripts/test-weather-source-gate.mjs','scripts/test-weather-cadence-watchdog.mjs',
    'scripts/native-postgres-evidence.mjs','scripts/source-impact-full-baseline.mjs',
    'scripts/test-native-postgres-evidence.mjs','scripts/test-source-impact-full-baseline.mjs'];
  const commands=['node --test scripts/test-source-current-contracts.mjs',
    'node scripts/test-source-impact-workflow.mjs',
    'node scripts/test-source-targeted-producer.mjs',
    'node scripts/test-source-targeted-consumer.mjs',
    'node --test scripts/test-native-postgres-evidence.mjs',
    'node --test scripts/test-source-impact-full-baseline.mjs',
    'node scripts/test-weather-source-gate.mjs','node scripts/test-weather-cadence-watchdog.mjs'];
  assert.deepEqual(CURRENT_CONTRACT_COMMANDS.sourceControls,commands);
  const results=[];
  const select=(label,paths)=>{
    const changes=paths.map(file=>[file,Buffer.from('// Synthetic source-owner scope '+label+String.fromCharCode(10))]);
    const candidate=makeCommit(rewriteTree(baselineTree,changes),[baselineCommit],'synthetic source-owner scope '+label);
    checkoutCommit(candidate);
    const selected=plan({baselineCommit,candidateCommit:candidate,expectedHead:candidate});
    results.push({label,plan:selected});return selected;
  };
  const positive=selected=>{
    assert.equal(selected.status,'PLANNED');assert.equal(selected.selection,'CURRENT_CONTRACTS');
    assert.deepEqual(selected.areas.sourceControls.commands,commands);
    assert.equal(selected.controlQualificationRequired,true);
    assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
    for(const command of commands)assert.equal(selected.commands.filter(row=>row===command).length,1);
  };
  try{
    for(const file of files){
      const selected=select(file,[file]);positive(selected);
      assert.deepEqual(Object.keys(selected.areas),file===files[0]?['core','sourceControls','actionVersions']:['core','sourceControls']);
      assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...commands,
        ...(file===files[0]?CURRENT_CONTRACT_COMMANDS.actionVersions:[])]);
    }
    const all=select('all-controller-owners-with-selector-and-docs',[...files,
      'scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs','docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md']);
    positive(all);assert.deepEqual(Object.keys(all.areas),['core','documentation','sourceControls','actionVersions']);
    for(const file of ['scripts/lib/unclassified-weather-source.mjs','scripts/test-weather-source-extra.mjs',
      'scripts/native-postgres-evidence-extra.mjs','scripts/test-source-impact-full-baseline-extra.mjs',
      '.github/workflows/unclassified-source-renewal.yml']){
      const selected=select(file,[files[1],file]);assert.equal(selected.selection,'FULL');
      assert.deepEqual(selected.reasonCodes,['CURRENT_UNCLASSIFIED_PATH']);assert.deepEqual(selected.commands,[]);
    }
    for(const [label,owners]of [['changed-protected-source-input',[files[1]]],
      ['changed-protected-native-evidence-input',files.slice(-4)]]){
      const changedProtected=select(label,[...owners,'config.js']);
      assert.equal(changedProtected.selection,'FULL');assert.deepEqual(changedProtected.commands,[]);
      assert.deepEqual(changedProtected.reasonCodes,['CURRENT_PROTECTED_INPUT_CHANGED']);
      for(const qualification of ['ACTUAL_POSTGRES','ACTUAL_MODEL_C','ACTUAL_MODEL_I'])
        assert(changedProtected.requiredQualifications.includes(qualification));
    }
    return results;
  }finally{checkoutCommit(restoreHead);}
}
// End exact source-autonomy ownership assertions.


// Current bytes with a small semantic predecessor, no full source hash/pin.
const DMI_FILES=['.github/workflows/reusable-weather-build.yml','scripts/plan-dmi-recovery.py',
  'scripts/lib/dmi_adaptive_recovery.py','scripts/run-dmi-bulk-supervised.py','scripts/update-dmi-bulk.py',
  'scripts/test-plan-dmi-recovery.py','scripts/test-dmi-budget-rotation-4.0.189.mjs'];
const dmiAfter=new Map(DMI_FILES.map(f=>[f,fs.readFileSync(path.join(SOURCE,f),'utf8').replaceAll('\r\n','\n')])),dmiBefore=new Map();
const takeDmiStep=(s,name)=>{const start=s.indexOf('      - name: '+name+'\n'),end=s.indexOf('\n      - ',start+1)+1;
  assert(start>=0&&end>start);return {start,end,body:s.slice(start,end)};};
{
  const f=DMI_FILES[0],s=dmiAfter.get(f),a=takeDmiStep(s,'Prepare retained DMI planning snapshot'),
    b=takeDmiStep(s,'Plan global current acquisition before DMI'),c=takeDmiStep(s,'Choose DMI budget from retained five-component PART coverage');
  const printf="          printf 'cache_path=%s\\n' ";
  let call=c.body.slice(c.body.indexOf('          python scripts/plan-dmi-recovery.py \\\n'),c.body.indexOf(printf));
  call=call.replace('"$DMI_PLANNING_SNAPSHOT"','"$recovery_cache"').replace('            "'+'$'+'{qualified_args[@]}" \\\n','');
  const aOld=a.body.replace('Prepare retained DMI planning snapshot','Choose DMI budget from retained five-component PART coverage')
    .replace('id: dmi-recovery-snapshot','id: dmi-recovery-budget'),at=aOld.indexOf(printf);assert(at>0);
  dmiBefore.set(f,s.slice(0,a.start)+aOld.slice(0,at)+call+aOld.slice(at)
    +b.body.replaceAll('steps.dmi-recovery-snapshot.outputs.cache_path','steps.dmi-recovery-budget.outputs.cache_path')+s.slice(c.end));
  assert.deepEqual(dmiBudgetWeatherBuildAreas(dmiBefore.get(f),s),['dmiBudget']);
  for(const x of [s+'# unowned workflow\n',s.replace('DMI_BULK_MAX_DOWNLOAD_MB:','CHANGED_LIMIT:'),
    s.replace('--parts data/live/coastal-parts-v2.json','--parts data/other.json')])
    assert.equal(dmiBudgetWeatherBuildAreas(dmiBefore.get(f),x),null);
}
{
  const f='scripts/update-dmi-bulk.py',s=dmiAfter.get(f),a=s.indexOf('    selected_runtime_budget = os.getenv("DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS")\n'),
    b=s.indexOf('    if adaptive_recovery is not None:\n');assert(a>0&&b>a);
  const old='    extended_recovery = (os.getenv("DMI_BULK_ADAPTIVE_RECOVERY", "false").lower() == "true"\n'
    +'                         and MAX_RUNTIME_SECONDS >= EXTENDED_RUNTIME_SECONDS)\n'
    +'    adaptive_recovery = next_adaptive_recovery(\n'
    +'        previous, requested=extended_recovery, runtime_budget_seconds=MAX_RUNTIME_SECONDS,\n'
    +'        generated_at=generated,\n'
    +'        before_counts=(json.loads(os.getenv("DMI_BULK_RECOVERY_BEFORE_COUNTS", "{}"))\n'
    +'                       if extended_recovery else None),\n    )\n';
  const before=(s.slice(0,a)+old+s.slice(b)).replace('from lib.dmi_adaptive_recovery import extended_runtime_profile_selected, next_adaptive_recovery',
    'from lib.dmi_adaptive_recovery import EXTENDED_RUNTIME_SECONDS, next_adaptive_recovery');dmiBefore.set(f,before);
  assert.equal(isDmiBudgetOnlyUpdaterChange(before,s),true);
  assert.equal(isDmiBudgetOnlyUpdaterChange(before,s+'# changed numerical tail\n'),false);
  assert.equal(isDmiBudgetOnlyUpdaterChange(before,s.replace('WORK_DEADLINE = STARTED +','WORK_DEADLINE = STARTED + 1 +')),false);
}
{
  const f='scripts/run-dmi-bulk-supervised.py',s=dmiAfter.get(f),addition=
    '    # Preserve the actually selected envelope, not a rounded child remainder.\n'
    +'    # Overwrite caller input; this metadata neither resets nor extends deadline.\n'
    +'    environment["DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS"] = str(total_runtime)\n';
  const before=s.replace(addition,'');assert.notEqual(before,s);dmiBefore.set(f,before);
  assert.equal(isDmiBudgetOnlySupervisorChange(before,s),true);
  assert.equal(isDmiBudgetOnlySupervisorChange(before,s.replace('deadline = time.monotonic() + total_runtime',
    'deadline = time.monotonic() + total_runtime + 1')),false);
  assert.equal(isDmiBudgetOnlySupervisorChange(before,s+'# changed process closure\n'),false);
}
for(const f of DMI_FILES)if(!dmiBefore.has(f))dmiBefore.set(f,dmiAfter.get(f)+(f.endsWith('.py')?'\n# Synthetic budget predecessor\n':'\n// Synthetic budget predecessor\n'));
assert.deepEqual(CURRENT_CONTRACT_COMMANDS.dmiBudget,['node scripts/test-dmi-budget-rotation-4.0.189.mjs']);

const REFERENCE='bd9cf518fe798ddea45d2b835f324f6e2bea06fc';
const profile=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-inputs-598.json')));
// Historiske model-/PG-input og nativekontekst vælges før importkæden indsamles.
const gitEnvironment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_AUTHOR_NAME:'Synthetic current-contract protocol',GIT_AUTHOR_EMAIL:'fixture@example.invalid',
  GIT_COMMITTER_NAME:'Synthetic current-contract protocol',GIT_COMMITTER_EMAIL:'fixture@example.invalid',
  GIT_AUTHOR_DATE:'2026-11-12T09:00:00Z',GIT_COMMITTER_DATE:'2026-11-12T09:00:00Z'};
const git=(where,args,input)=>execFileSync('git',['-C',where,...args],{input,env:gitEnvironment,
  timeout:30000,maxBuffer:256*1024*1024,stdio:['pipe','pipe','pipe']});
const text=(where,args,input)=>git(where,args,input).toString('utf8').trim();
const sourceBlob=file=>git(SOURCE,['cat-file','blob',REFERENCE+':'+file]);
const modelFiles=Object.values(profile.models).flatMap(def=>{
  const raw=sourceBlob(def.file).toString('utf8'),manifest=JSON.parse(raw.slice(raw.indexOf('Object.freeze(')+14,raw.lastIndexOf(');')));
  return[def.file,...manifest.files.map(row=>row[def.rowKey])];});
const protectedFiles=new Set([...profile.postgresModules,...profile.postgresData,...profile.continuation.files,profile.continuation.file,...modelFiles]);
const historicalControlSources=new Set(['scripts/native-postgres-evidence.mjs',
  'scripts/national584-source-evidence.mjs','scripts/source-impact-full-baseline.mjs']);
const {assertSource598CodeSourceSelected}=await import(pathToFileURL(path.join(SOURCE,'scripts/check-assistant-later-h0-predecessor-source.mjs')).href);
const fixedCode598=assertSource598CodeSourceSelected();
assert.equal(text(SOURCE,['rev-parse',fixedCode598.head+'^{tree}']),fixedCode598.tree);
// Current planner DATA is distinct from the unchanged protected historical PG module.
const currentDomainFamily=(await import(pathToFileURL(path.join(SOURCE,'scripts/lib/assistant-later-h0-successor-source.mjs')).href)).ASSISTANT_AFTER599_BINDING;
assert(currentDomainFamily&&Object.isFrozen(currentDomainFamily));
assert.deepEqual(Object.keys(currentDomainFamily).sort(),['C','I','T','version']);
const currentDomainFamilyImport="import {ASSISTANT_AFTER599_BINDING as FAMILY601} from './lib/assistant-later-h0-successor-source.mjs';";
function currentDomainFixtureBytes(bytes){
  const body=bytes.toString('utf8');
  const imports=[...body.matchAll(/^import\b[^;]*?\bfrom\s*['"]\.\/lib\/assistant-later-h0-successor-source\.mjs['"];$/gm)].map(match=>match[0]);
  assert.deepEqual(imports,[currentDomainFamilyImport],'Only the actual current binding DATA import is materialized');
  return Buffer.from(body.replace(currentDomainFamilyImport,'const FAMILY601=Object.freeze('+JSON.stringify(currentDomainFamily)+');'));
}
const currentDomainBytes=fs.readFileSync(path.join(SOURCE,'scripts/source-impact-domain-inputs.mjs'));
assert.throws(()=>currentDomainFixtureBytes(Buffer.from(currentDomainBytes.toString('utf8').replace(currentDomainFamilyImport,''))));
assert.throws(()=>currentDomainFixtureBytes(Buffer.concat([currentDomainBytes,Buffer.from('\n'+currentDomainFamilyImport+'\n')])));
assert.throws(()=>currentDomainFixtureBytes(Buffer.from(currentDomainBytes.toString('utf8').replace('ASSISTANT_AFTER599_BINDING as FAMILY601','ASSISTANT_AFTER599_BINDING as FAMILY601,ASSISTANT_AFTER599_OUTPUT'))));
const fixtureControlOrigin=file=>protectedFiles.has(file)?'REFERENCE':historicalControlSources.has(file)?'CODE598':'SOURCE';
function fixtureControlBytes(file){
  const origin=fixtureControlOrigin(file);
  const bytes=origin==='REFERENCE'?sourceBlob(file):origin==='CODE598'
    ?git(SOURCE,['cat-file','blob',fixedCode598.head+':'+file]):fs.readFileSync(path.join(SOURCE,file));
  if(file!=='scripts/source-impact-domain-inputs.mjs')return bytes;
  assert.equal(origin,'SOURCE');return currentDomainFixtureBytes(bytes);
}
const historicalSuccessor='scripts/lib/assistant-later-h0-successor-source.mjs';
assert.equal(fixtureControlOrigin(historicalSuccessor),'REFERENCE');
assert(fixtureControlBytes(historicalSuccessor).equals(sourceBlob(historicalSuccessor)),
  'Whole historical FULL/PG helper remains authentic; no current exports or behavior added');
const controlSources=new Set();
function collect(file){
  if(controlSources.has(file))return;
  const sourceFile=path.resolve(SOURCE,file),relative=path.relative(SOURCE,sourceFile);
  assert(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));
  controlSources.add(file);
  const body=fixtureControlBytes(file).toString('utf8'),url=pathToFileURL(sourceFile);
  for(const match of body.matchAll(/^import\b[^;]*?\bfrom\s*['"](\.[^'"]+)['"]/gm)){
    const dep=fileURLToPath(new URL(match[1],url)),name=path.relative(SOURCE,dep).split(path.sep).join('/');
    collect(name);
  }
}
for(const file of ['scripts/source-targeted-producer.mjs','scripts/source-targeted-consumer.mjs',
  'scripts/source-current-contract-receipt.mjs','scripts/source-current-contract-plan.mjs'])collect(file);
const additions=[...controlSources,...ownerHelpers,...WEATHER_PUBLICATION_PATHS,
  'scripts/test-owned-dmi-grib-save-native.py',
  '.github/workflows/watch-missed-weather-schedule.yml','scripts/weather-source-gate.mjs',
  ...['594','597','598'].map(v=>'scripts/lib/source-impact-domain-inputs-'+v+'.json')];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const clone=value=>structuredClone(value);
const originalEnvironment={...process.env},originalFetch=globalThis.fetch,originalLog=console.log;
const temp=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temp,'rr-current-contract-protocol-'));
const owned=fs.lstatSync(root,{bigint:true});
const readGit=(args,options={})=>execFileSync('git',['-C',root,...args],{env:gitEnvironment,maxBuffer:256*1024*1024,
  timeout:10000,stdio:['pipe','pipe','pipe'],...options});
const write=(file,bytes)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);};
const stamp=n=>'2026-11-12T09:'+String(n).padStart(2,'0')+':00Z';
const zip=(raw,name)=>execFileSync('python',['-c',
  'import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",compression=zipfile.ZIP_DEFLATED); z.writestr(sys.argv[1],sys.stdin.buffer.read()); z.close(); sys.stdout.buffer.write(b.getvalue())',name],
  {input:raw,maxBuffer:65536,timeout:10000,stdio:['pipe','pipe','pipe']});
const fullRun=50000000501,fullJob=50000000503,fullPr=9501,fullFinalId=50000000505,fullNativeId=50000000506;
let selectedRun=50000000502,selectedJob=50000000504,selectedPr=9502,selectedArtifactId=50000000507;
let currentReceiptHelpers,planCurrent;
const priorMaps=new Map(),priorZips=new Map();
let firstDelivery,legacyFirstReceipt,legacyFirstReview;
let base,head,main,baseContent,content,baselinePlan,coordinate,decide,discover,accessFactory;
let native,namespace,sourceContent,fullBody,phaseBody,fullJobBody,selectedJobBody;
let immutableFullZip,immutablePhaseZip;
let actualCurrentAfter598SourceVerified=false;
let actualCurrentAfter599SourceVerified=false;
let maps,zips,selectedReceipt,selectedZip,selectedMetadata,rows=[],cases=0,actualProcesses=0,calls=0;
const state={movedReview:false,missingReview:false,wrongPlan:false,merged:false,
  baseTip:null,hintOverride:null,duplicateReview:false,malformedReview:false,headMismatch:false,expiredFull:false,laterNegative:false,modernWorkflow:false,ownedCacheNativeWorkflow:false,fullModernWorkflow:false,sdkStepFault:null};
const fallbackOnlyCommits=new Set();let observedRoutes=[],unexpectedRoutes=[],fixtureFailures=[],fallbackDiscoveries=[];
const scenarios=[];
const moduleAt=async file=>import(pathToFileURL(path.join(root,file)).href);
const commandRows=tree=>git(root,['ls-tree','-z',tree]).toString('utf8').split('\0').filter(Boolean).map(line=>{
  const m=/^(\d{6}) (blob|tree) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);return{mode:m[1],type:m[2],oid:m[3],name:m[4]};});
function rewrite(tree,changes){
  const entries=tree?commandRows(tree):[],groups=new Map();
  for(const[file,body]of changes){const[name,...tail]=file.split('/'),group=groups.get(name)??[];group.push([tail.join('/'),body]);groups.set(name,group);}
  for(const[name,group]of groups){const prior=entries.find(row=>row.name===name),next=group[0][0]===''
    ?{name,mode:prior?.mode??'100644',type:'blob',oid:text(root,['hash-object','-w','--stdin'],group[0][1])}
    :{name,mode:'040000',type:'tree',oid:rewrite(prior?.oid,group)};
    if(prior)entries.splice(entries.indexOf(prior),1);entries.push(next);}
  return text(root,['mktree','--missing','-z'],entries.map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join(''));
}
const commit=(tree,parents,label)=>text(root,['commit-tree',tree,...parents.flatMap(parent=>['-p',parent]),'-m',label]);
const checkout=commitId=>git(root,['reset','--hard',commitId]);
// Kun fixture-PR'ens deterministiske plandel genbruges; review/API/state er altid friske.
const reviewPlanCache=new WeakMap();
function reviewObject(plan){
  const reviewText='SYNTHETIC independent protocol-fixture review only\n'+head+'\n'+base+'\n'+JSON.stringify(plan)+'\n';
  write('.cache/synthetic-control-review.txt',reviewText);
  const pullBaseCommit=state.baseTip??base,commit=text(root,['merge-base','--all',pullBaseCommit,head]);
  const changeBase={commit,gitTree:text(root,['rev-parse',commit+'^{tree}']),pullBaseCommit};
  const actual=text(root,['rev-parse','HEAD']);
  const input={baselineCommit:commit,candidateCommit:actual,expectedHead:actual};
  let cacheKey=null;
  try{
    const location=fs.lstatSync(root,{bigint:true}),realRoot=fs.realpathSync(root);
    const top=fs.statSync(fs.realpathSync(text(root,['rev-parse','--show-toplevel'])),{bigint:true});
    if(location.isDirectory()&&!location.isSymbolicLink()&&realRoot===root
      &&location.dev===owned.dev&&location.ino===owned.ino&&top.dev===owned.dev&&top.ino===owned.ino
      &&text(root,['status','--porcelain','--untracked-files=no'])===''
      &&text(root,['for-each-ref','refs/replace'])===''&&text(root,['rev-parse','--is-shallow-repository'])==='false'){
      cacheKey=JSON.stringify([input,pullBaseCommit,root,String(owned.dev),String(owned.ino),
        ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'].map(key=>process.env[key]??null),
        sha(fs.readFileSync(path.join(root,'.git/config'))),
        ['594','597','598'].map(version=>sha(fs.readFileSync(path.join(root,'scripts/lib/source-impact-domain-inputs-'+version+'.json'))))]);
    }
  }catch{} // Uafklaret eller ændret levende input bruger altid den normale beregning.
  const bindings=[execFileSync,childProcess.execFileSync,fs.readFileSync,fs.lstatSync,fs.statSync,fs.realpathSync,performance,performance.now];
  let plans=reviewPlanCache.get(planCurrent);
  if(!plans){plans=new Map();reviewPlanCache.set(planCurrent,plans);}
  const cached=cacheKey&&plans.get(cacheKey);
  const currentPlan=cached&&bindings.every((value,index)=>value===cached.bindings[index])
    ?clone(cached.plan):planCurrent(input);
  if(cacheKey&&currentPlan.status==='PLANNED'&&currentPlan.selection==='CURRENT_CONTRACTS')
    plans.set(cacheKey,{plan:clone(currentPlan),bindings});
  const current={repository:native.ORIGIN.repository,head,sourceTreeSha256:content,pullRequest:selectedPr,
    runId:selectedRun,runAttempt:1,jobId:selectedJob};
  const reference={schemaVersion:1,kind:'RAVRADAR_SOURCE_IMPACT_FULL_BASELINE_V1',scope:'FULL_SOURCE',
    repository:current.repository,mergeCommit:base,producerHead:base,sourceTreeSha256:baseContent,pullRequest:fullPr,
    runId:fullRun,runAttempt:1,jobId:fullJob,finalArtifactId:fullFinalId,
    finalArtifactDigest:'sha256:'+sha(immutableFullZip),finalProofSha256:sha(Buffer.from(JSON.stringify(fullBody)+'\n')),
    nativeArtifactId:fullNativeId,nativeArtifactDigest:'sha256:'+sha(immutablePhaseZip),
    gitTree:text(root,['rev-parse',base+'^{tree}']),historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false};
  return {head,changeBaseCommit:commit,pullBaseCommit,baselineCommit:base,inventorySha256:currentPlan.inventorySha256,
    cumulativeInventorySha256:plan.inventorySha256,planSha256:currentReceiptHelpers.currentChangePlanSha256(
      {current,fullBaseline:reference,changeBase,currentPlan,cumulativePlan:plan}),reviewSha256:sha(reviewText)};
}
function currentPull(){
  const review=reviewObject(baselinePlan);
  if(state.hintOverride)review.baselineCommit=state.hintOverride;
  if(state.headMismatch)review.head=base;
  if(state.wrongPlan)review.planSha256='f'.repeat(64);
  if(state.movedReview&&rows.length)review.reviewSha256='e'.repeat(64);
  return {number:selectedPr,state:state.merged?'closed':'open',...(state.merged?{merged_at:stamp(24),merge_commit_sha:main}:{}),
    user:{login:native.ORIGIN.repository.split('/')[0]},head:{sha:head,ref:'codex/synthetic-domain-current',repo:{full_name:native.ORIGIN.repository}},
    base:{sha:state.merged&&state.closedBaseTip?state.closedBaseTip:state.baseTip??base,ref:'main',repo:{full_name:native.ORIGIN.repository}},
    body:state.missingReview?'Synthetic missing review':state.malformedReview?'<!-- RAVRADAR_CURRENT_CHANGE_REVIEW_V4 {bad-json} -->':('Synthetic fixture only\n<!-- RAVRADAR_CURRENT_CHANGE_REVIEW_V4 '+JSON.stringify(review)+' -->\n').repeat(state.duplicateReview?2:1)};
}
function run(selected){return {id:selected?selectedRun:fullRun,run_attempt:1,head_sha:selected?head:base,
  head_branch:selected?'codex/synthetic-domain-current':'codex/synthetic-domain-full',event:'pull_request',
  path:namespace.PULL_REQUEST_SOURCE_WORKFLOW,status:selected&&!state.merged?'in_progress':'completed',
  conclusion:selected&&!state.merged?null:'success',repository:{full_name:native.ORIGIN.repository},
  head_repository:{full_name:native.ORIGIN.repository},pull_requests:[]};}
function jobs(selected){
  const owned=selected&&state.ownedCacheNativeWorkflow;
  const modern=selected?state.modernWorkflow:state.fullModernWorkflow;
  const names=owned?namespace.TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES
    :modern?namespace.TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES:namespace.TARGETED_SOURCE_STEP_NAMES;
  const steps=names.map((name,index)=>({name,number:index+1,status:'completed',
    conclusion:selected&&(owned?(index>=9&&index<=22):modern?(index>=7&&index<=20):(index>=5&&index<=19))?'skipped':'success',
    started_at:stamp(index),completed_at:stamp(index+1)}));
  if(selected&&state.sdkStepFault==='python-position')steps.find(row=>row.name==='Run actions/setup-python@v7').number=5;
  if(selected&&state.sdkStepFault==='retainer-skipped')steps[4].conclusion='skipped';
  return {id:selected?selectedJob:fullJob,run_id:selected?selectedRun:fullRun,run_attempt:1,head_sha:selected?head:base,
    name:namespace.PULL_REQUEST_SOURCE_JOB,status:selected&&!state.merged?'in_progress':'completed',
    conclusion:selected&&!state.merged?null:'success',steps};
}
function meta(id,name,body,runId,producer,n){return{id,name,digest:'sha256:'+sha(body),expired:false,size_in_bytes:body.length,
  workflow_run:{id:runId,head_sha:producer},created_at:stamp(n)};}
function rebuildMaps(){
  const repo='/repos/'+native.ORIGIN.repository,actions=repo+'/actions';
  // Actual uploaded baseline artifacts are immutable across producer/consumer.
  // Recreating a ZIP later would change its timestamp and bound digest.
  const fullZip=immutableFullZip??=zip(Buffer.from(JSON.stringify(fullBody)+'\n'),'source-tree-content-proof.json'),
    phaseZip=immutablePhaseZip??=zip(Buffer.from(JSON.stringify(phaseBody)+'\n'),'native-postgres-phase-proof.json');
  const fullName=sourceContent.sourceTreeProofArtifactName({pullRequestNumber:fullPr,headSha:base,sourceTreeSha256:baseContent});
  const fullMeta=meta(fullFinalId,fullName,fullZip,fullRun,base,22),phaseMeta=meta(fullNativeId,'native586-phase-'+fullRun+'-1-'+base,phaseZip,fullRun,base,17);
  fullJobBody=jobs(false);selectedJobBody=jobs(true);
  const fullPull={number:fullPr,state:'closed',merged_at:stamp(24),merge_commit_sha:base,user:{login:native.ORIGIN.repository.split('/')[0]},
    head:{sha:base,repo:{full_name:native.ORIGIN.repository}},base:{ref:'main',repo:{full_name:native.ORIGIN.repository}}};
  maps=new Map([[actions+'/runs/'+fullRun,run(false)],[repo+'/pulls/'+fullPr,fullPull],
    [repo+'/commits/'+base+'/pulls?per_page=100',[fullPull]],
    [actions+'/runs/'+fullRun+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[fullJobBody]}],
    [actions+'/runs/'+fullRun+'/artifacts?per_page=100',{total_count:2,artifacts:[fullMeta,phaseMeta]}],
    [actions+'/artifacts?name='+encodeURIComponent(fullName)+'&per_page=100',{total_count:1,artifacts:[fullMeta]}],
    [actions+'/artifacts/'+fullFinalId,fullMeta],[actions+'/artifacts/'+fullNativeId,phaseMeta]]);
  if(state.expiredFull){fullMeta.expired=true;phaseMeta.expired=true;}
  zips=new Map([[String(fullFinalId),fullZip],[String(fullNativeId),phaseZip],...priorZips]);
  for(const [route,value]of priorMaps)maps.set(route,value);
  for(const current of [base,main].filter(Boolean))for(const producer of Object.values(namespace.SOURCE_GATE_PRODUCERS))
    maps.set(actions+'/workflows/'+producer.workflowId+'/runs?head_sha='+current+'&branch=main&per_page=100&page=1',
      {total_count:0,workflow_runs:[]});
  if(state.laterNegative){
    const [workflow,producer]=Object.entries(namespace.SOURCE_GATE_PRODUCERS)[0],negativeRun=fullRun+100,negativeHead=state.laterNegativeAt??base;
    maps.set(actions+'/workflows/'+producer.workflowId+'/runs?head_sha='+negativeHead+'&branch=main&per_page=100&page=1',
      {total_count:1,workflow_runs:[{id:negativeRun,run_attempt:1,head_sha:negativeHead,head_branch:'main',path:workflow,
        repository:{full_name:native.ORIGIN.repository},status:'completed',conclusion:'failure',updated_at:stamp(30)}]});
    maps.set(actions+'/runs/'+negativeRun+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[{
      id:negativeRun+1000,run_id:negativeRun,run_attempt:1,head_sha:negativeHead,name:producer.gates[0].job,
      status:'completed',conclusion:'failure',steps:[{name:producer.gates[0].step,status:'completed',
        conclusion:'failure',completed_at:stamp(25)}]}]});
  }
  if(state.merged){
    maps.set(repo+'/commits/'+main+'/pulls?per_page=100',[currentPull()]);
    maps.set(actions+'/artifacts?name='+encodeURIComponent(selectedReceipt.artifactName)+'&per_page=100',
      {total_count:1,artifacts:[selectedMetadata]});
    maps.set(actions+'/artifacts/'+selectedArtifactId,selectedMetadata);zips.set(String(selectedArtifactId),selectedZip);
  }
}
async function transport(url,options){
  try{
  calls++;const target=new URL(url),repo='/repos/'+native.ORIGIN.repository,actions=repo+'/actions';
  if(target.origin==='https://synthetic-v3.invalid'){
    assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');
    if(!zips.has(target.pathname.slice(1)))unexpectedRoutes.push('SIGNED_ARTIFACT:'+target.pathname.slice(1));
    assert(zips.has(target.pathname.slice(1)));
    return new Response(zips.get(target.pathname.slice(1)));}
  assert.equal(target.origin,'https://api.github.com');
  if(options.redirect===undefined){
    assert.equal(options.headers.Accept,'application/vnd.github+json');
    assert.equal(options.headers['X-GitHub-Api-Version'],'2022-11-28');
  }else assert.equal(options.redirect,'manual');
  assert.equal(options.headers.Authorization,'Bearer synthetic-never-live');const route=target.pathname+target.search;
  observedRoutes.push(route);
  if(route===repo+'/pulls/'+selectedPr)return Response.json(currentPull());
  if(route===actions+'/runs/'+selectedRun)return Response.json(run(true));
  if(route===actions+'/runs/'+selectedRun+'/attempts/1/jobs?per_page=100')return Response.json({total_count:1,jobs:[jobs(true)]});
  const match=new RegExp('^'+actions+'/artifacts/([0-9]+)/zip$').exec(route);
  if(match){if(!zips.has(match[1]))unexpectedRoutes.push(route);assert(zips.has(match[1]));
    return new Response(null,{status:302,headers:{location:'https://synthetic-v3.invalid/'+match[1]}});}
  if(route.startsWith(actions+'/artifacts?name=')&&!maps.has(route))return Response.json({total_count:0,artifacts:[]});
  const absentCommit=/\/commits\/([a-f0-9]{40})\/pulls\?per_page=100$/.exec(route);
  if(absentCommit&&fallbackOnlyCommits.has(absentCommit[1])&&!maps.has(route)){
    fallbackDiscoveries.push(absentCommit[1]);return Response.json([]);
  }
  if(!maps.has(route))unexpectedRoutes.push(route);
  assert(maps.has(route),'Unexpected synthetic-only route '+route);return Response.json(maps.get(route));
  }catch(error){fixtureFailures.push('SYNTHETIC_TRANSPORT_FIXTURE_FAILURE');throw error;}
}
function configure(candidate){
  head=candidate;checkout(head);rows=[];observedRoutes=[];unexpectedRoutes=[];fixtureFailures=[];fallbackDiscoveries=[];
  state.missingReview=false;state.movedReview=false;state.wrongPlan=false;state.merged=false;state.closedBaseTip=null;
  state.modernWorkflow=false;state.ownedCacheNativeWorkflow=false;state.fullModernWorkflow=false;state.sdkStepFault=null;
  state.baseTip=null;state.hintOverride=null;state.duplicateReview=false;state.malformedReview=false;state.headMismatch=false;state.expiredFull=false;state.laterNegative=false;state.laterNegativeAt=null;state.negativeDuringTargets=false;main=null;
  Object.assign(process.env,{GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:native.ORIGIN.repository,SOURCE_GATE_HEAD_SHA:head,
    PULL_REQUEST_NUMBER:String(selectedPr),GITHUB_RUN_ID:String(selectedRun),GITHUB_RUN_ATTEMPT:'1',GITHUB_JOB:'validate',
    GITHUB_TOKEN:'synthetic-never-live'});
  // The outer node:test harness must not tell a real nested --test process
  // that its files are already executing. Production CI is not such a parent.
  delete process.env.NODE_TEST_CONTEXT;
  content=sourceContent.sourceTreeContentSha256(head,{git:readGit});
}
try{
  git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
  const referenceRows=git(SOURCE,['ls-tree','-rz','-t','--full-tree',REFERENCE]).toString('utf8').split('\0').filter(Boolean).map(line=>{
    const m=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);return{mode:m[1],type:m[2],oid:m[3],file:m[4]};});
  const referenceTree=text(SOURCE,['rev-parse',REFERENCE+'^{tree}']);
  // A small SYNTHETIC repository, not a copied entire432MB release tree.
  // Every protected input and every real planner/runtime source/resource stays
  // genuine. Other unrelated files are absent from this new root identity.
  const selected=new Set([...protectedFiles,...profile.nativeEvidenceControls,...profile.setupInputs,
    ...profile.plannerTrustChain,...additions,'package.json',
    ...referenceRows.filter(row=>row.file.startsWith('supabase/migrations/')&&row.file.endsWith('.sql')).map(row=>row.file)]);
  const objects=[...new Set([referenceTree,...referenceRows.filter(row=>row.type==='tree'||selected.has(row.file)).map(row=>row.oid),
    ...profile.frozenGitAnchors.flatMap(row=>[row.head,row.tree])])];
  git(root,['unpack-objects','-q'],git(SOURCE,['pack-objects','--stdout'],objects.join('\n')+'\n'));
  function selectedTree(tree,prefix=''){
    const kept=[];for(const row of commandRows(tree)){
      const file=prefix+row.name;
      if(row.type==='tree'){
        if([...selected].some(name=>name.startsWith(file+'/')))kept.push({...row,oid:selectedTree(row.oid,file+'/')});
      }else if(selected.has(file))kept.push(row);
    }
    return text(root,['mktree','--missing','-z'],kept.map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join(''));
  }
  const protectedTree=selectedTree(referenceTree);
  // The producer/consumer protocol below executes its own declared scenarios.
  // Weather and historical-updater owners use the separate planning-only Git
  // fixture below and their real complete targets run in ordinary source CI.
  // Do not enlarge every historical protocol tree with unused fake weather
  // executables merely because the permanent command catalogue grows.
  const planningOnlyWeatherAreas=new Set(['waterSourceRouting','weatherUpdater','runtimeAudit','historicalUpdaterOracles']);
  const protocolCommands=Object.entries(CURRENT_CONTRACT_COMMANDS)
    .filter(([area])=>!planningOnlyWeatherAreas.has(area)).flatMap(([,commands])=>commands);
  const targetFiles=[...new Set(protocolCommands.flatMap(command=>command.split(' ').filter(part=>part.endsWith('.mjs'))))];
  assert(targetFiles.length>0);for(const file of targetFiles)assert(!protectedFiles.has(file),'A synthetic target must never replace143/CIT: '+file);
  const tiny=()=>Buffer.from("import fs from 'node:fs';\n"
    +"fs.mkdirSync('.cache',{recursive:true});\n"
    +"fs.appendFileSync('.cache/actual-current-targets.jsonl',JSON.stringify({file:process.argv[1]})+'\\n');\n"
    +"console.log('SYNTHETIC_CURRENT_TARGET_EXECUTED');\n");
  const baselineChanges=new Map(),targetSet=new Set(targetFiles);
  const putFixture=(file,body)=>{
    const prior=baselineChanges.get(file);
    if(prior)assert(prior.equals(body),'CURRENT_FIXTURE_ORIGIN_CONFLICT: '+file);
    baselineChanges.set(file,body);
  };
  for(const file of additions){
    assert(!historicalControlSources.has(file)||!targetSet.has(file),'Historical native context is never a synthetic command target');
    if(targetSet.has(file))continue; // De allerede erklærede kunstige mål ejer kun deres egne bladfiler.
    const body=fixtureControlBytes(file);
    if(protectedFiles.has(file))assert(body.equals(sourceBlob(file)),'CURRENT_FIXTURE_PROTECTED_INPUT_CONFLICT: '+file);
    putFixture(file,body);
  }
  for(const file of targetFiles)putFixture(file,tiny(file));
  const baselineTree=rewrite(protectedTree,[...baselineChanges]);
  base=commit(baselineTree,[],'synthetic root with genuine594 protected inputs and synthetic control targets');
  checkout(base);assert.notEqual(base,REFERENCE);assert.deepEqual(text(root,['rev-list','--parents','-n','1',base]).split(' '),[base]);
  native=await moduleAt('scripts/native-postgres-evidence.mjs');
  const gate=await moduleAt('scripts/lib/weather-source-gate.mjs'),consumer=await moduleAt('scripts/source-targeted-consumer.mjs');
  namespace={...gate,TARGETED_SOURCE_STEP_NAMES:consumer.TARGETED_SOURCE_STEP_NAMES,
    TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES:consumer.TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES,
    TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES:consumer.TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES,
    TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES:consumer.TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES};
  sourceContent=await moduleAt('scripts/lib/source-tree-content.mjs');
  ({coordinateTargetedSourceProducer:coordinate}=await moduleAt('scripts/source-targeted-producer.mjs'));
  ({decideTargetedSourceGate:decide,discoverTargetedSourceGate:discover}=consumer);accessFactory=native.sourceImpactEvidenceAccess;
  const {planSourceCurrentContractsFromGit:plan}=await moduleAt('scripts/source-current-contract-plan.mjs');
  planCurrent=plan;

  // Begin exact small-contract owner assertions (also run by the full normal target).
  if(!weatherPublicationScopeOnly&&!dmiBudgetScopeOnly&&!dmiRecoveryScopeOnly&&!adminHistoryScopeOnly){
    const started=performance.now(),caller='scripts/weather-component-progress-cache.mjs',
      fixture='scripts/test-weather-component-progress-cache.mjs',workflow='.github/workflows/reusable-weather-build.yml';
    const ownedPaths=[caller,fixture],bytes=new Map([...ownedPaths,workflow].map(file=>[file,fixtureControlBytes(file)]));
    const priorTree=rewrite(baselineTree,[...bytes]),prior=commit(priorTree,[base],'synthetic existing weather progress owner');
    const changes=ownedPaths.map(file=>[file,Buffer.concat([bytes.get(file),Buffer.from('\n// Synthetic permanent owner delta\n')])]);
    const selectedTree=rewrite(priorTree,changes),candidate=commit(selectedTree,[prior],'synthetic combined progress owner');checkout(candidate);
    const selected=plan({baselineCommit:prior,candidateCommit:candidate,expectedHead:candidate});
    assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
    const wholeCommands=[
      'node --test scripts/test-weather-component-progress-cache.mjs scripts/test-weather-component-progress-workflow.mjs scripts/test-dmi-progress-inputs.mjs',
      'node --test scripts/test-audit-saved-weather-inputs.mjs',
      'node --test scripts/test-native-identity-checkpoint-runtime.mjs',
      'node --test scripts/test-current-family-cold-supervisor-wrapper.mjs',
      'node --test scripts/test-saved-current-window-scratch.mjs',
    ];
    assert.deepEqual(CURRENT_CONTRACT_COMMANDS.weatherProgressRecovery,wholeCommands);
    assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...wholeCommands]);
    assert.deepEqual(selected.areas.weatherProgressRecovery.changedPaths,[...ownedPaths].sort());
    assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
    assert.equal(selected.controlQualificationRequired,true);assert.equal(selected.changedRows,2);cases++;
    const codec='scripts/lib/private-weather-component-pack.mjs';
    const protectedBefore=git(root,['cat-file','blob',prior+':'+codec]);
    for(const [label,extra,reason]of [
      ['unknown adjacent input',['scripts/unclassified-progress-input.mjs',Buffer.from('// Unknown input\n')],'CURRENT_UNCLASSIFIED_PATH'],
      ['broader weather workflow',[workflow,Buffer.concat([bytes.get(workflow),Buffer.from('\n# outside every owned workflow section\n')])],'CURRENT_WEATHER_BUILD_CHANGE_EXCEEDS_PAGES'],
      ['protected codec',[codec,Buffer.concat([protectedBefore,Buffer.from('\n// Changed protected codec\n')])],'CURRENT_PROTECTED_INPUT_CHANGED'],
    ]){
      const refused=commit(rewrite(selectedTree,[extra]),[prior],'synthetic progress refusal '+label);checkout(refused);
      const rejected=plan({baselineCommit:prior,candidateCommit:refused,expectedHead:refused});
      assert.equal(rejected.selection,'FULL',JSON.stringify(rejected));assert.deepEqual(rejected.reasonCodes,[reason]);
      assert.deepEqual(rejected.commands,[]);cases++;
    }
    // Neither a new path, deleting this owner, nor changing its executable mode
    // inherits the existing regular-source contract.
    checkout(prior);git(root,['update-index','--force-remove','--',caller]);
    const absentTree=text(root,['write-tree']),absent=commit(absentTree,[prior],'synthetic absent progress owner');
    const deleted=commit(absentTree,[prior],'synthetic deleted progress owner');checkout(deleted);
    let refused=plan({baselineCommit:prior,candidateCommit:deleted,expectedHead:deleted});
    assert.equal(refused.selection,'FULL');assert.deepEqual(refused.reasonCodes,['CURRENT_WEATHER_PROGRESS_REQUIRES_EXISTING_REGULAR_SOURCE']);cases++;
    const added=commit(priorTree,[absent],'synthetic added progress owner');checkout(added);
    refused=plan({baselineCommit:absent,candidateCommit:added,expectedHead:added});
    assert.equal(refused.selection,'FULL');assert.deepEqual(refused.reasonCodes,['CURRENT_WEATHER_PROGRESS_REQUIRES_EXISTING_REGULAR_SOURCE']);cases++;
    checkout(prior);git(root,['update-index','--chmod=+x','--',caller]);
    const executable=commit(text(root,['write-tree']),[prior],'synthetic changed progress owner mode');checkout(executable);
    refused=plan({baselineCommit:prior,candidateCommit:executable,expectedHead:executable});
    assert.equal(refused.selection,'FULL');assert.deepEqual(refused.reasonCodes,['CURRENT_WEATHER_PROGRESS_REQUIRES_EXISTING_REGULAR_SOURCE']);cases++;
    checkout(base);scenarios.push('Permanent progress owner selects whole existing caller contracts; unknown, broader workflow, protected input and A/D/mode retain FULL');
    console.log(JSON.stringify({kind:'WEATHER_PROGRESS_RECOVERY_NORMAL_GIT_SCOPE',cases:7,elapsedMs:performance.now()-started,
      completeExistingTargetFiles:7,wholeExistingTargetCommands:5,protectedAnalysisReused:false,plannerMock:false}));
  }

  if(!weatherPublicationScopeOnly&&!dmiBudgetScopeOnly&&!dmiRecoveryScopeOnly&&!adminHistoryScopeOnly){
    const ownerCases=assertSmallUserContractPlanScope({baselineCommit:base,baselineTree,rewriteTree:rewrite,makeCommit:commit,checkoutCommit:checkout,plan,restoreHead:base})
      +assertPrivateStudyPlanScope({baselineCommit:base,baselineTree,rewriteTree:rewrite,makeCommit:commit,checkoutCommit:checkout,plan,restoreHead:base});
    const prerequisiteCases=assertSelectedProgressCopernicusPrerequisite();
    cases+=ownerCases+prerequisiteCases;
    scenarios.push('Exact sharing/erasure/progress owners retain whole tests and refusal boundaries; selected CP prerequisite is bounded and credential-free');
    console.log(JSON.stringify({kind:'SMALL_USER_AND_PROGRESS_OWNERS_FOCUSED_ASSERTIONS',ownerCases,prerequisiteCases,wholeSuite:false,productTargetsExecuted:0}));
  }
  // End exact small-contract owner assertions.

  if(!dmiBudgetScopeOnly&&!dmiRecoveryScopeOnly&&!adminHistoryScopeOnly){
    const started=performance.now(),build='.github/workflows/reusable-weather-build.yml',repair='.github/workflows/deploy-code-only-repair.yml';
    const publicationCaseStart=cases;
    const actual=new Map([build,repair].map(file=>[file,fs.readFileSync(path.join(SOURCE,file))]));
    const old=new Map([...actual].map(([file,bytes])=>[file,inversePrivateWeatherPublicationWorkflow(bytes)]));
    const priorTree=rewrite(baselineTree,[...old]),prior=commit(priorTree,[base],'synthetic private weather publication predecessor');
    const check=(file,body,label,expected=true)=>{
      const candidate=commit(rewrite(priorTree,[[file,body]]),[prior],'synthetic weather publication '+label);checkout(candidate);
      const selected=plan({baselineCommit:prior,candidateCommit:candidate,expectedHead:candidate});
      if(expected){
        assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
        assert.deepEqual(Object.keys(selected.areas),['core','weatherPublication',
          ...(file==='scripts/test-ordinary-completed-stage-source.mjs'?['historicalTests']:[])]);
        assert.deepEqual(selected.areas.weatherPublication.commands,CURRENT_CONTRACT_COMMANDS.weatherPublication);
        assert.equal(selected.controlQualificationRequired,true);
        assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
      }else if(file===repair){
        assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
        assert.deepEqual(Object.keys(selected.areas),['core','pagesArtifact','compatibility']);
        assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.pagesArtifact,...CURRENT_CONTRACT_COMMANDS.compatibility]);
        assert.equal(selected.controlQualificationRequired,true);
      }else{assert.equal(selected.selection,'FULL',JSON.stringify(selected));assert.deepEqual(selected.commands,[]);}
      cases++;
    };
    for(const file of WEATHER_PUBLICATION_PATHS){
      const before=git(root,['cat-file','blob',prior+':'+file]);
      check(file,Buffer.concat([before,Buffer.from('\n// Synthetic solo publication owner delta\n')]),file);
    }
    for(const file of [build,repair]){
      check(file,actual.get(file),'exact publication argv');
      const source=actual.get(file).toString();
      for(const [label,body]of [
        ['argv',source.replace('scripts/publish-private-weather-runtime.mjs','scripts/publish-private-weather-runtime.mjs --unknown')],
        ['env',source.replace('secrets.RAVRADAR_R2_ACCOUNT_ID','secrets.UNKNOWN_ACCOUNT')],
        ['gate',source.replace('        if:','        if: false &&')],
        ['step',source+'\n      - name: Synthetic unknown step\n        run: false\n'],
      ]){
        assert.notEqual(body,source);assert.equal(isPrivateWeatherPublicationWorkflowChange(old.get(file),Buffer.from(body)),false);
        check(file,Buffer.from(body),label,false);
      }
    }
    const combinedBefore=inversePrivateWeatherPublicationWorkflow(Buffer.from(dmiBefore.get(build)));
    const combinedAfter=actual.get(build);
    for(const [label,beforeBytes,afterBytes,expected]of [
      ['old-to-new with DMI',combinedBefore,combinedAfter,['dmiBudget','weatherPublication']],
      ['both-new retain DMI',Buffer.from(dmiBefore.get(build)),combinedAfter,['dmiBudget']],
      ['reverse entry',combinedAfter,combinedBefore,null],
      ['combined unknown argv',combinedBefore,Buffer.from(combinedAfter.toString().replace('scripts/publish-private-weather-runtime.mjs','scripts/publish-private-weather-runtime.mjs --unknown')),null],
      ['combined unknown gate',combinedBefore,Buffer.from(combinedAfter.toString().replace('        if:','        if: false &&')),null],
      ['combined unknown step',combinedBefore,Buffer.concat([combinedAfter,Buffer.from('\n# Synthetic unknown workflow change\n')]),null],
    ]){
      const oldTree=rewrite(priorTree,[[build,beforeBytes]]),comparison=commit(oldTree,[prior],'synthetic publication combination predecessor');
      const candidate=commit(rewrite(oldTree,[[build,afterBytes]]),[comparison],'synthetic publication combination '+label);checkout(candidate);
      const selected=plan({baselineCommit:comparison,candidateCommit:candidate,expectedHead:candidate});
      if(expected){assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
        assert.deepEqual(Object.keys(selected.areas).filter(area=>area!=='core').sort(),[...expected].sort());
        assert.equal(selected.controlQualificationRequired,true);
        assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
      }else{assert.equal(selected.selection,'FULL',JSON.stringify(selected));assert.deepEqual(selected.commands,[]);}
      cases++;
    }
    const protectedFile=profile.postgresModules[0];check(protectedFile,Buffer.concat([
      git(root,['cat-file','blob',prior+':'+protectedFile]),Buffer.from('\n// Synthetic genuine protected drift\n')]),'PG remains protected',false);
    const current=fs.readFileSync(path.join(SOURCE,'scripts/source-current-contract-plan.mjs'));
    let predecessor=current.toString();
    for(const [old,added]of PRIVATE_WEATHER_PUBLICATION_OWNER_EDITS){assert.equal(predecessor.split(added).length,2);predecessor=predecessor.replace(added,old);}
    assert(isAdditivePrivateWeatherPublicationOwnerChange(Buffer.from(predecessor),current));
    assert(!isAdditivePrivateWeatherPublicationOwnerChange(current,Buffer.from(predecessor)),'Owner removal is not additive admission.');
    for(const [old,added]of PRIVATE_WEATHER_PUBLICATION_OWNER_EDITS){
      assert(!isAdditivePrivateWeatherPublicationOwnerChange(Buffer.from(predecessor),Buffer.from(current.toString().replace(added,old))));
      assert(!isAdditivePrivateWeatherPublicationOwnerChange(Buffer.from(predecessor),Buffer.from(current.toString().replace(added,added+added))));
    }
    assert(!isAdditivePrivateWeatherPublicationOwnerChange(Buffer.from(predecessor),Buffer.from(current.toString().replace("'node scripts/test-security-hardening-4.0.284.mjs'","'node scripts/unknown.mjs'"))));
    assert(!isAdditivePrivateWeatherPublicationOwnerChange(Buffer.from(predecessor),Buffer.from(current.toString().replace('out.controlQualificationRequired=true','out.controlQualificationRequired=false'))));
    checkout(base);scenarios.push('Publication solo owners and exact argv require control review; unknown BUILD/PG retains FULL and repair retains its original broader compatibility targets');
    console.log(JSON.stringify({kind:'WEATHER_PUBLICATION_NORMAL_GIT_SCOPE',cases:cases-publicationCaseStart,elapsedMs:performance.now()-started,
      realGit:true,actualProtectedInputsUnchanged:true,ownerRemovalRefused:true,unknownChangesRefused:true,productionAuthority:false}));
  }
  if(!weatherPublicationScopeOnly&&!dmiBudgetScopeOnly&&!dmiRecoveryScopeOnly){
    const started=performance.now(),files=['scripts/admin-document-history-maintenance.mjs','scripts/test-admin-document-history-maintenance.mjs'];
    const priorTree=rewrite(baselineTree,files.map(file=>[file,fixtureControlBytes(file)]));
    const prior=commit(priorTree,[base],'synthetic existing admin history controller and regression');
    const changes=files.map(file=>[file,Buffer.concat([fixtureControlBytes(file),Buffer.from('\n// Synthetic owned admin-history delta\n')])]);
    const positive=commit(rewrite(priorTree,changes),[prior],'synthetic complete admin-history owned scope');checkout(positive);
    const selected=plan({baselineCommit:prior,candidateCommit:positive,expectedHead:positive});
    assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
    assert.deepEqual(Object.keys(selected.areas),['core','adminHistory']);
    assert.deepEqual(selected.areas.adminHistory.changedPaths,[...files].sort());
    assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.adminHistory]);
    assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
    assert.equal(selected.controlQualificationRequired,true);cases++;
    for(const [label,file]of [['unknown','scripts/unclassified-admin-retention.mjs'],['PG',profile.postgresModules[0]]]){
      const bytes=label==='unknown'?Buffer.from('export const synthetic=true;\n'):Buffer.concat([
        git(root,['cat-file','blob',prior+':'+file]),Buffer.from('\n// Synthetic protected PG drift\n')]);
      const candidate=commit(rewrite(priorTree,[...changes,[file,bytes]]),[prior],'synthetic admin-history '+label+' refusal');checkout(candidate);
      const rejected=plan({baselineCommit:prior,candidateCommit:candidate,expectedHead:candidate});
      assert.equal(rejected.selection,'FULL',JSON.stringify(rejected));assert.deepEqual(rejected.commands,[]);cases++;
    }
    for(const kind of ['A','D','mode']){
      checkout(prior);const file=files[0];git(root,['update-index','--force-remove','--',file]);
      const absentTree=text(root,['write-tree']),absent=commit(absentTree,[prior],'synthetic absent admin-history controller');
      let comparison=prior,tree=absentTree;
      if(kind==='A'){comparison=absent;tree=priorTree;}
      if(kind==='mode'){checkout(prior);const blob=text(root,['rev-parse',prior+':'+file]);
        git(root,['update-index','--cacheinfo','100755,'+blob+','+file]);tree=text(root,['write-tree']);}
      const candidate=commit(tree,[comparison],'synthetic non-M admin-history '+kind);checkout(candidate);
      const rejected=plan({baselineCommit:comparison,candidateCommit:candidate,expectedHead:candidate});
      assert.equal(rejected.selection,'FULL',JSON.stringify(rejected));assert.deepEqual(rejected.commands,[]);cases++;
    }
    checkout(base);scenarios.push('Existing admin-history controller selects both real owner targets; unknown/PG/A/D/mode retain FULL');
    console.log(JSON.stringify({kind:'ADMIN_HISTORY_NORMAL_GIT_SCOPE',cases:6,elapsedMs:performance.now()-started,protectedAnalysisReused:false}));
  }
  if(!weatherPublicationScopeOnly&&!dmiRecoveryScopeOnly&&!adminHistoryScopeOnly){
  const dmiScopeStarted=performance.now();
  // The existing normal Git planner, with genuine PG/C/I/T fixture inputs.
  const dmiBaseTree=rewrite(baselineTree,DMI_FILES.map(f=>[f,Buffer.from(dmiBefore.get(f))]));
  const dmiBase=commit(dmiBaseTree,[base],'synthetic bounded budget predecessor');
  {
    const files=DMI_FILES; // One whole inventory, not seven identical protected analyses.
    const c=commit(rewrite(dmiBaseTree,files.map(f=>[f,Buffer.from(dmiAfter.get(f))])),[dmiBase],'synthetic DMI budget scope');checkout(c);
    const selected=plan({baselineCommit:dmiBase,candidateCommit:c,expectedHead:c});
    assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
    assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.dmiBudget]);
    assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
    assert.equal(selected.controlQualificationRequired,true);
    assert.equal(selected.changedRows,DMI_FILES.length);
    assert.deepEqual(selected.areas.dmiBudget.changedPaths,[...DMI_FILES].sort());cases++;
  }
  for(const[f,body,reason]of [
    ['scripts/update-dmi-bulk.py',dmiAfter.get('scripts/update-dmi-bulk.py')+'# outside metadata\n','CURRENT_DMI_BUDGET_UPDATER_SCOPE_CHANGED'],
    ['scripts/run-dmi-bulk-supervised.py',dmiAfter.get('scripts/run-dmi-bulk-supervised.py')+'# outside budget\n','CURRENT_DMI_BUDGET_SUPERVISOR_SCOPE_CHANGED'],
    [DMI_FILES[0],dmiAfter.get(DMI_FILES[0])+'# outside workflow\n','CURRENT_WEATHER_BUILD_CHANGE_EXCEEDS_PAGES'],
    ['scripts/unclassified-dmi-operation.py','# unknown\n','CURRENT_UNCLASSIFIED_PATH'],
  ]){
    const c=commit(rewrite(dmiBaseTree,[[f,Buffer.from(body)]]),[dmiBase],'synthetic refused budget scope');checkout(c);
    const selected=plan({baselineCommit:dmiBase,candidateCommit:c,expectedHead:c});
    assert.equal(selected.selection,'FULL');assert.deepEqual(selected.reasonCodes,[reason]);assert.deepEqual(selected.commands,[]);cases++;
  }
  const added=commit(rewrite(baselineTree,[['scripts/plan-dmi-recovery.py',Buffer.from(dmiAfter.get('scripts/plan-dmi-recovery.py'))]]),[base],'synthetic added scheduler');checkout(added);
  assert.equal(plan({baselineCommit:base,candidateCommit:added,expectedHead:added}).selection,'FULL');cases++;
  checkout(base);scenarios.push('DMI owner preserves all unowned workflow/updater/supervisor bytes; unknown or protected changes retain FULL');
  console.log(JSON.stringify({kind:'DMI_BUDGET_NORMAL_GIT_SCOPE',cases:6,elapsedMs:performance.now()-dmiScopeStarted,
    independentProtectedBoundaryRefusals:3,unknownAndAddedRefusals:2,protectedAnalysisReused:false}));
  }
  if(!weatherPublicationScopeOnly&&!dmiBudgetScopeOnly&&!adminHistoryScopeOnly){
    const started=performance.now(),producer='scripts/update-dmi-bulk.py',fixture='scripts/test-dmi-dkss-primary-mode.py';
    // Actual historical Git blobs are test inputs only. They cannot route or
    // qualify a candidate. Pin both preimages so later producer/version work
    // does not silently rewrite this historical scope oracle.
    const oldBytes=new Map([[producer,'261fec2f43c72bd3c47adef9ce9f652b24a4e5a0'],
      [fixture,'d1f7b0dfdb50244b66e939d3d5111706de7c0897']].map(([file,blob])=>[file,git(SOURCE,['cat-file','blob',blob])]));
    const newBytes=new Map([[producer,'6dc5367aa803572057b7a0c49f7ffc430ae85ea4'],
      [fixture,'3880978c343e2ba9bab21476363d418a91eaaf92']].map(([file,blob])=>[file,git(SOURCE,['cat-file','blob',blob])]));
    const helper=file=>file===producer?isDmiCollectionRecoveryOnlyUpdaterChange:isDmiCollectionRecoveryOnlyFixtureChange;
    for(const file of [producer,fixture])assert.equal(helper(file)(oldBytes.get(file).toString(),newBytes.get(file).toString()),true);
    const priorTree=rewrite(baselineTree,[...oldBytes]),prior=commit(priorTree,[base],'synthetic collection recovery predecessor');
    const positive=commit(rewrite(priorTree,[...newBytes]),[prior],'synthetic complete recovery scope');checkout(positive);
    const selected=plan({baselineCommit:prior,candidateCommit:positive,expectedHead:positive});
    assert.equal(selected.selection,'CURRENT_CONTRACTS',JSON.stringify(selected));
    assert.deepEqual(selected.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.dmiCollectionRecovery]);
    assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
    assert.equal(selected.controlQualificationRequired,true);assert.equal(selected.changedRows,2);
    assert.deepEqual(selected.areas.dmiCollectionRecovery.changedPaths,[fixture,producer].sort());cases++;
    const cumulativePriorProducer=git(SOURCE,['cat-file','blob','c7449040417c61dd9fa1a84ca00f6c3e02b5a402:'+producer]);
    assert.deepEqual(dmiCollectionRecoveryUpdaterAreas(cumulativePriorProducer.toString(),newBytes.get(producer).toString()),['dmiBudget','dmiCollectionRecovery']);
    const cumulativeTree=rewrite(priorTree,[[producer,cumulativePriorProducer]]),cumulativeBase=commit(cumulativeTree,[base],'synthetic genuine full producer predecessor');
    const cumulativeHead=commit(rewrite(cumulativeTree,[...newBytes]),[cumulativeBase],'synthetic closed budget and recovery composition');checkout(cumulativeHead);
    const combined=plan({baselineCommit:cumulativeBase,candidateCommit:cumulativeHead,expectedHead:cumulativeHead});
    assert.equal(combined.selection,'CURRENT_CONTRACTS',JSON.stringify(combined));
    assert.deepEqual(combined.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.dmiBudget,...CURRENT_CONTRACT_COMMANDS.dmiCollectionRecovery]);
    assert.deepEqual(combined.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});cases++;
    const original=newBytes.get(producer).toString(),replace=(needle,next)=>{assert(original.includes(needle));return original.replace(needle,next);};
    const refusals=[
      [producer,replace('\ndef process_grib_transactionally(','\ndef changed_process_grib_transactionally(')],
      [producer,replace('\ndef prepare_raw_cache_space(','\ndef changed_prepare_raw_cache_space(')],
      [producer,replace('WORK_DEADLINE = STARTED +','WORK_DEADLINE = STARTED + 1 +')],
      [producer,replace('PARSER_VERSION = 20','PARSER_VERSION = 21')],
      [producer,replace('blocked_parser_version != PARSER_VERSION','False')],
      [fixture,newBytes.get(fixture).toString()+'\n# outside the new local regression\n'],
    ];
    for(const [file,body]of refusals){
      const failed=commit(rewrite(priorTree,[[file,Buffer.from(body)]]),[prior],'synthetic recovery boundary refusal');checkout(failed);
      const rejected=plan({baselineCommit:prior,candidateCommit:failed,expectedHead:failed});
      assert.equal(rejected.selection,'FULL',JSON.stringify(rejected));assert.deepEqual(rejected.commands,[]);cases++;
    }
    checkout(base);scenarios.push('Recovery classifier preserves decoder/RAW/deadline/native/original-parser and all old test bytes');
    console.log(JSON.stringify({kind:'DMI_COLLECTION_RECOVERY_NORMAL_GIT_SCOPE',cases:8,elapsedMs:performance.now()-started,
      protectedAnalysisReused:false,productInputsAreHistoricalGitBlobs:true,qualificationHashPinsAdded:false}));
  }
  if(!weatherPublicationScopeOnly&&!dmiBudgetScopeOnly&&!dmiRecoveryScopeOnly&&!adminHistoryScopeOnly){
  // Den samme normale Gitplan skal eje transportvalget og bevare sine beskyttede input.
  const beforeTransportHead=text(root,['rev-parse','HEAD']);
  try{
    const transportFixtureFiles=[...transportInputs,...ownerHelpers,'scripts/verify-ravscore-operational-pages-deployment.mjs',
      'scripts/test-ravscore-operational-pages-deployment.mjs','.github/workflows/reusable-pages-deploy.yml',
      '.github/workflows/reusable-operational-reentry.yml','scripts/test-pages-generation-and-reentry.mjs',
      'scripts/test-protected-operational-reentry-evidence.mjs','scripts/source-current-contract-receipt.mjs',
      'scripts/sync-handbook-installation-copy.mjs','app.js','CHANGELOG.md'];
    const transportBaseTree=rewrite(baselineTree,transportFixtureFiles.map(file=>[file,fixtureControlBytes(file)]));
    const transportBase=commit(transportBaseTree,[base],'synthetic genuine transport scope base');
    for(const [label,paths,narrow,control]of [
      ['transport',[transportInputs[0]],true,false],['test',[transportInputs[1]],true,true],
      ['both',transportInputs,true,true],['docs',[transportInputs[0],'CHANGELOG.md'],true,false],
      ['controllers',[...transportInputs,'scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs'],true,true],
      ...[...ownerHelpers,'scripts/verify-ravscore-operational-pages-deployment.mjs',
        'scripts/test-ravscore-operational-pages-deployment.mjs','.github/workflows/reusable-pages-deploy.yml',
        '.github/workflows/reusable-operational-reentry.yml','scripts/test-pages-generation-and-reentry.mjs',
        'scripts/test-protected-operational-reentry-evidence.mjs','scripts/source-current-contract-receipt.mjs',
        'scripts/sync-handbook-installation-copy.mjs','app.js'].map(file=>['mixed '+file,[transportInputs[1],file],false,null]),
    ]){
      const tree=rewrite(transportBaseTree,paths.map(file=>[file,Buffer.concat([
        git(root,['cat-file','blob',transportBase+':'+file]),Buffer.from('\n// Synthetic transport scope delta\n')])]));
      const candidate=commit(tree,[transportBase],'synthetic transport scope '+label);checkout(candidate);
      const selected=plan({baselineCommit:transportBase,candidateCommit:candidate,expectedHead:candidate});
      assert(narrow?selected.selection==='CURRENT_CONTRACTS':['CURRENT_CONTRACTS','FULL'].includes(selected.selection),label);
      if(selected.selection==='CURRENT_CONTRACTS'){
        assert.deepEqual(selected.areas.pages.commands,narrow?transportCommands:CURRENT_CONTRACT_COMMANDS.pages,label);
        assert.equal(selected.commands.includes(deploymentCommand),!narrow,label);
      }
      assert(!selected.commands.includes(ownerCommand),label);
      if(control!==null)assert.equal(selected.controlQualificationRequired,control,label);
      for(const key of ['postgresUnchanged','CUnchanged','IUnchanged','TUnchanged'])assert.equal(selected.protectedInputs[key],true,label);
      cases++;
    }
    for(const kind of ['A','D','mode']){
      checkout(transportBase);const file=transportInputs[0];git(root,['update-index','--force-remove','--',file]);
      const absentTree=text(root,['write-tree']);
      const absentBase=commit(absentTree,[transportBase],'synthetic absent transport base');
      let comparisonBase=transportBase,tree=absentTree;
      if(kind==='A'){comparisonBase=absentBase;tree=transportBaseTree;}
      if(kind==='mode'){
        checkout(transportBase);const blob=text(root,['rev-parse',transportBase+':'+file]);
        git(root,['update-index','--cacheinfo','100755,'+blob+','+file]);tree=text(root,['write-tree']);
      }
      const candidate=commit(tree,[comparisonBase],'synthetic non-M transport '+kind);checkout(candidate);
      const selected=plan({baselineCommit:comparisonBase,candidateCommit:candidate,expectedHead:candidate});
      assert(['CURRENT_CONTRACTS','FULL'].includes(selected.selection),kind);
      if(selected.selection==='CURRENT_CONTRACTS')assert.deepEqual(selected.areas.pages.commands,CURRENT_CONTRACT_COMMANDS.pages,kind);
      assert(!selected.commands.includes(ownerCommand),kind);cases++;
    }
    for(const [label,file]of [['unknown','js/unclassified-production-feature.js'],['PG',profile.postgresModules[0]]]){
      const bytes=label==='unknown'?Buffer.from('export const changed=true;\n'):Buffer.concat([
        git(root,['cat-file','blob',transportBase+':'+file]),Buffer.from('\n// Synthetic protected PG drift\n')]);
      const tree=rewrite(transportBaseTree,[[transportInputs[0],Buffer.concat([
        git(root,['cat-file','blob',transportBase+':'+transportInputs[0]]),Buffer.from('\n// Synthetic transport scope delta\n')])],[file,bytes]]);
      const candidate=commit(tree,[transportBase],'synthetic transport plus '+label);checkout(candidate);
      assert.equal(plan({baselineCommit:transportBase,candidateCommit:candidate,expectedHead:candidate}).selection,'FULL',label);cases++;
    }
  }finally{checkout(beforeTransportHead);}
  scenarios.push('normal Git transport-only selection keeps four full Pages targets, fresh control review, protected inputs and broad/FULL mixed fallbacks');
  // Slut på de nye normale Gittransportcases.

  // The reviewed SDK-only addition uses its historical setup. Current planning
  // still owns the actual Python fixture and decides which prerequisite to run.
  if(!weatherPublicationScopeOnly&&!dmiBudgetScopeOnly&&!dmiRecoveryScopeOnly&&!adminHistoryScopeOnly){
    const restore=text(root,['rev-parse','HEAD']),tree=text(root,['rev-parse',base+'^{tree}']);
    const nativeFile='scripts/test-owned-dmi-grib-save-native.py',workflow='.github/workflows/validate-pull-request.yml';
    const source=git(root,['show',base+':'+nativeFile]);
    const sdkWorkflow=readHistoricalSourceSetupWorkflow();
    const predecessor=inverseOwnedCacheNativeWorkflow(sdkWorkflow);
    try{
      const beforeTree=rewrite(tree,[[workflow,Buffer.from(predecessor)]]);
      const before=commit(beforeTree,[base],'synthetic normal SDK environment predecessor');
      const frontierTree=rewrite(beforeTree,[['docs/rdks/90_INDEX/SYNTHETIC-NATIVE-FRONTIER.md',Buffer.from('Synthetic ordinary documentation frontier\n')]]);
      const frontier=commit(frontierTree,[before],'synthetic qualified current frontier');
      const afterTree=rewrite(frontierTree,[[nativeFile,Buffer.concat([source,Buffer.from('\n# Synthetic native test delta\n')])],
        [workflow,Buffer.from(sdkWorkflow)]]);
      const after=commit(afterTree,[frontier],'synthetic whole native owner with normal environment');checkout(after);
      const nativePlans=new Map();
      for(const baselineCommit of [frontier,before]){
        const selected=plan({baselineCommit,candidateCommit:after,expectedHead:after});
        assert.equal(selected.status,'PLANNED',JSON.stringify(selected.reasonCodes));
        assert.deepEqual(selected.areas.ownedCacheNative.commands,[OWNED_CACHE_DEPENDENCY_COMMAND,OWNED_CACHE_NATIVE_COMMAND]);
        assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
        assert.equal(selected.controlQualificationRequired,true);nativePlans.set(baselineCommit,selected);cases++;
      }
      // Receipt DATA only: normal builders replay these actual synthetic Git plans.
      // PASS rows here are format fixtures, never SDK/native execution evidence.
      const receiptHelpers=await moduleAt('scripts/source-current-contract-receipt.mjs');
      const currentPlan=nativePlans.get(frontier),cumulativePlan=nativePlans.get(before);
      const fullBaseline={schemaVersion:1,kind:'RAVRADAR_SOURCE_IMPACT_FULL_BASELINE_V1',scope:'FULL_SOURCE',
        repository:native.ORIGIN.repository,mergeCommit:before,producerHead:before,gitTree:beforeTree,
        sourceTreeSha256:sourceContent.sourceTreeContentSha256(before,{git:readGit}),
        pullRequest:fullPr,runId:fullRun,runAttempt:1,jobId:fullJob,finalArtifactId:fullFinalId,
        finalArtifactDigest:'sha256:'+'a'.repeat(64),finalProofSha256:'b'.repeat(64),
        nativeArtifactId:fullNativeId,nativeArtifactDigest:'sha256:'+'c'.repeat(64),
        historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false};
      const current={repository:native.ORIGIN.repository,head:after,
        sourceTreeSha256:sourceContent.sourceTreeContentSha256(after,{git:readGit}),pullRequest:selectedPr,
        runId:selectedRun,runAttempt:1,jobId:selectedJob};
      const commandResults=cumulativePlan.commands.map(command=>({phase:'targeted',command,elapsedMs:0,outcome:'PASS'}));
      const input={current,fullBaseline,changeBase:{commit:frontier,gitTree:frontierTree,pullBaseCommit:frontier},
        currentPlan,cumulativePlan,frontier:{schemaVersion:1,kind:'QUALIFIED_CHANGE_FRONTIER',mode:'FULL',
          repository:native.ORIGIN.repository,commit:before,gitTree:beforeTree,
          sourceTreeSha256:fullBaseline.sourceTreeSha256,sourceRecord:null,sourceProofTime:null,missingReason:'MISSING'},
        commandResults};
      const receipt=await receiptHelpers.buildCurrentChangeSourceReceipt(input);
      assert.equal(receiptHelpers.validateCurrentChangeSourceReceipt(receipt,input).validStructure,true);
      assert.deepEqual(receipt.reportedCommandResults,commandResults);
      assert(receipt.execution.commands.includes(OWNED_CACHE_NATIVE_COMMAND));
      assert.equal(receipt.postgres.executedInThisRun,false);assert.equal(receipt.fullSourceValidationClaimed,false);
      const legacy={current,fullBaseline,currentPlan:cumulativePlan,commandResults};
      assert.throws(()=>receiptHelpers.validateCurrentContractSourceReceipt(null,legacy),/CURRENT_COMMANDS/);
      await assert.rejects(receiptHelpers.buildCurrentContractSourceReceipt(legacy),/CURRENT_COMMANDS/);
      for(const change of ['missing-dependency','reversed-order','extra-flag']){
        const invalid=clone(input);
        for(const value of [invalid.currentPlan,invalid.cumulativePlan]){
          const dep=value.commands.indexOf(OWNED_CACHE_DEPENDENCY_COMMAND),nativeIndex=value.commands.indexOf(OWNED_CACHE_NATIVE_COMMAND);
          if(change==='missing-dependency'){value.commands.splice(dep,1);value.areas.ownedCacheNative.commands.splice(0,1);}
          else if(change==='reversed-order')[value.commands[dep],value.commands[nativeIndex]]=[value.commands[nativeIndex],value.commands[dep]];
          else{
            value.commands[nativeIndex]+=' --official-sdk-only';
            value.areas.ownedCacheNative.commands[1]+=' --official-sdk-only';
          }
        }
        await assert.rejects(receiptHelpers.buildCurrentChangeSourceReceipt(invalid),
          change==='extra-flag'?/CURRENT_COMMANDS/:/CURRENT_OWNED_CACHE_NATIVE_COMMANDS/);
      }
      const invalidRows=clone(input),dep=invalidRows.commandResults.findIndex(row=>row.command===OWNED_CACHE_DEPENDENCY_COMMAND);
      const nativeIndex=invalidRows.commandResults.findIndex(row=>row.command===OWNED_CACHE_NATIVE_COMMAND);
      [invalidRows.commandResults[dep],invalidRows.commandResults[nativeIndex]]=
        [invalidRows.commandResults[nativeIndex],invalidRows.commandResults[dep]];
      assert.throws(()=>receiptHelpers.validateCurrentChangeSourceReceipt(receipt,invalidRows),/COMMAND_RESULTS/);
      cases+=7;
      scenarios.push('normal V4 Python receipt builder/validator with two whole command rows and unchanged V3 refusal; synthetic receipt DATA only');
      const reverse=commit(rewrite(afterTree,[[workflow,Buffer.from(predecessor)]]),[after],'synthetic forbidden reverse SDK workflow');checkout(reverse);
      assert.deepEqual(plan({baselineCommit:after,candidateCommit:reverse,expectedHead:reverse}).reasonCodes,
        ['CURRENT_VALIDATION_WORKFLOW_REQUIRES_FULL']);cases++;
      for(const [file,bytes]of [['scripts/lib/unclassified-native-helper.mjs',Buffer.from('export const unknown=true;\n')],
        [profile.postgresModules[0],Buffer.concat([git(root,['show',base+':'+profile.postgresModules[0]]),Buffer.from('\n// Synthetic protected drift\n')])]]){
        const candidate=commit(rewrite(afterTree,[[file,bytes]]),[before],'synthetic native plus unknown or protected drift');checkout(candidate);
        assert.equal(plan({baselineCommit:before,candidateCommit:candidate,expectedHead:candidate}).selection,'FULL');cases++;
      }
      cases+=assertOwnedCacheNativePreparation();
      scenarios.push('whole owned-cache native owner selects dependency plus full Python file, preserves actual PG/C/I/T and closes environment/bootstrap/reverse/unknown boundaries; helper execution is SYNTHETIC only');
    }finally{checkout(restore);}
  }

  currentReceiptHelpers=await moduleAt('scripts/source-current-contract-receipt.mjs');
  const successor=await moduleAt('scripts/lib/assistant-later-h0-successor-source.mjs');
  const national=await moduleAt('scripts/national584-source-evidence.mjs');
  const analyzer=await moduleAt('scripts/source-impact-domain-inputs.mjs');
  const actual=analyzer.analyzeSourceDomainInputs({baselineCommit:base,candidateCommit:base,expectedHead:base});
  assert.equal(actual.analysis,'COMPLETE',actual.failureCode);
  assert.equal(actual.actualPostgresInput.before.totalFiles,148);
  assert.equal(actual.actualPostgresInput.before.sqlFiles,74);
  assert.equal(actual.frozenGitAnchors.anchors.length,16);
  baseContent=sourceContent.sourceTreeContentSha256(base,{git:readGit});
  const nativeCurrent={run:fullRun,attempt:1,head:base,pullRequest:fullPr,branch:'codex/synthetic-domain-full'};
  let nativeReceipt;
  {
    // Synthetic report DATA against real598C/I/T and74actualSQLfiles, not native execution proof.
    // Historisk FULL598 bruger sin autentiske native/national/FULL-kontekst.
    // Producer/consumer/receipt/planner er aktuelle; faktisk599 prøves særskilt ved SOURCE.
    const active=successor.UNISSUED_ASSISTANT_AFTER597_SUCCESSOR;
    const binding=active.requireBinding(),databaseBefore=active.databaseBefore;
    assert.equal(active.sourcePhase,'assistant-mixed-after597-successor');assert.equal(active.requireRelease(),'4.0.598');
    assert.deepEqual(readGit(['cat-file','blob',base+':package.json']),sourceBlob('package.json'),
      'The historical FULL package is the authentic REFERENCE blob, never retagged current599');
    const historicalPackage=JSON.parse(readGit(['cat-file','blob',base+':package.json']));
    assert.equal(historicalPackage.version,active.requireRelease());
    const oldSQL=referenceRows.filter(row=>row.file.startsWith('supabase/migrations/')&&row.file.endsWith('.sql'));
    const actualSQL=git(root,['ls-tree','-rz','--full-tree',base,'--','supabase/migrations']).toString('utf8').split('\0').filter(Boolean).map(line=>{
      const match=/^(\d{6}) blob ([a-f0-9]{40})\t(.+)$/.exec(line);assert(match);return {file:match[3],oid:match[2]};});
    assert.equal(oldSQL.length,74);assert.deepEqual(actualSQL,oldSQL.map(({file,oid})=>({file,oid})));
    const {withSource598CodeParent}=await import(pathToFileURL(path.join(SOURCE,'scripts/check-assistant-later-h0-predecessor-source.mjs')).href);
    const original598=await withSource598CodeParent(async originalRoot=>{
      const original=await import(pathToFileURL(path.join(originalRoot,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
      const pkg=JSON.parse(fs.readFileSync(path.join(originalRoot,'package.json'),'utf8'));
      assert.equal(original.ACTIVE_ASSISTANT_SUCCESSOR,original.UNISSUED_ASSISTANT_AFTER597_SUCCESSOR);
      assert.equal(pkg.version,original.requireAssistantAfter597Release());
      return {binding:original.requireAssistantAfter597Binding(),output:original.requireAssistantAfter597Output(),
        databaseBefore:original.ASSISTANT_AFTER597_BEFORE,release:pkg.version};
    });
    assert.deepEqual(binding,original598.binding);assert.deepEqual(active.requireOutput(),original598.output);
    assert.deepEqual(databaseBefore,original598.databaseBefore);assert.equal(active.requireRelease(),original598.release);
    const oldIntegrated=await moduleAt('js/core/ravscore-model-contract.js');
    const oldCandidate=await moduleAt('scripts/rollback-assets/ravscore-model-contract.js');
    const oldContinuation=await moduleAt('scripts/lib/ravscore-continuation-implementation-contract.mjs');
    assert.equal(oldIntegrated.ravScoreModelBinding().modelBundleSha256,binding.I);
    assert.equal(oldCandidate.ravScoreModelBinding().modelBundleSha256,binding.C);
    assert.equal(await oldContinuation.ravScoreContinuationImplementationSha256({repositoryRoot:root}),binding.T);
    const fixtureRuntime={platform:'linux',arch:'x64',imageOS:'ubuntu24',imageVersion:'20261012.334.1',
      node:'v22.23.3',python:'Python 3.12.15',pythonLocation:'/opt/hostedtoolcache/Python/3.12.15/x64',
      ldLibraryPath:'/opt/hostedtoolcache/Python/3.12.15/x64/lib',pgBindir:'/usr/lib/postgresql/16/bin',git:'git version 2.55.0',overrides:[],
      selectedPrograms:{schemaVersion:1,majorVersion:16,files:['initdb','pg_ctl','psql','postgres'].map(name=>({name,path:'/usr/lib/postgresql/16/bin/'+name,
        realpath:'/usr/lib/postgresql/16/bin/'+name,mode:0o755,bytes:100,sha256:'c'.repeat(64),version:name+' (PostgreSQL) 16.10'}))}};
    const observed={kind:'ASSISTANT_AFTER597_SUCCESSOR',sourceMigrationInventory:63,databaseBeforeVersion:databaseBefore.version,
      originalStateRelease:597,migrationVersion:binding.version,partCount:673,checkpointOidSlots:45,contractBodies:48,
      productionSeedAuthenticated:false,parentCodeHead:'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84',parentNativeHead:'97d189e4a99fdab1b2764db1bfe59f96e92c3f02'};
    for(const key of ['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved','allOriginalDefinitionsPreserved',
      'exactCheckpointContract','exactTripContract','schema2Catalog','normalProtectedJsonbRoundtrip','originalDigestsPreserved',
      'trueOld597Fixtures','currentNormalFixtures','old597ModelNotRetagged','wholeMetadataInverse','strictlyLater597ToNextOnly',
      'sqlIsNotOriginAuthentication','predecessorExecutedInSameHost'])observed[key]=true;
    observed.intermediateRuntime=Object.fromEntries(['old597ActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused',
      'nextActiveAfterCompletion','old597RefusedAfterCompletion','wholeHistoryAndDocumentsPreserved',
      'quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'].map(key=>[key,true]));
    nativeReceipt={schemaVersion:1,kind:native.ASSISTANT_AFTER597_PHASE_KIND,phase:'ASSISTANT_AFTER597_SUCCESSOR',
      sourcePhase:native.ASSISTANT_AFTER597_PHASE,releaseVersion:active.requireRelease(),binding,output:active.requireOutput(),databaseBefore,
      current:nativeCurrent,commands:[...native.ASSISTANT_AFTER597_COMMANDS],status:'EXECUTED',executedInThisRun:true,
      origin:null,eligibleForReuse:false,runtime:fixtureRuntime,report:{kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',
        sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,normalModelPartCount:673,postgresMajorVersion:16,
        nativeProgramIdentity:fixtureRuntime.selectedPrograms,assistantAfter597Successor:observed}};
  }
  const historical={status:'EXECUTED',executedInThisRun:true,origin:null,command:national.COMMAND,
    sourceScope:'HISTORICAL_584_NATIONAL_ONLY',frozenHead:national.ORIGIN.head,frozenTree:national.ORIGIN.tree,
    historicalInput:{head:national.ORIGIN.head,tree:national.ORIGIN.tree,content:national.ORIGIN.content},
    current:{head:base,run:fullRun,attempt:1,pullRequest:fullPr},providerOrProductionProof:false,
    ...await national.assistantAfter597NativeClaims(nativeReceipt,nativeCurrent)};
  fullBody={schemaVersion:1,contractId:gate.SOURCE_GATE_CONTRACT,repository:native.ORIGIN.repository,
    pullRequestNumber:fullPr,headSha:base,sourceTreeSha256:baseContent,privatePayloadIncluded:false,
    nativePostgres:nativeReceipt,historical584National:historical};
  phaseBody={schemaVersion:1,kind:native.ASSISTANT_AFTER597_PHASE_KIND,repository:native.ORIGIN.repository,
    headSha:base,sourceTreeSha256:baseContent,privatePayloadIncluded:false,nativePostgres:clone(nativeReceipt)};

  // The actual current source owner is exercised separately from the old FULL
  // fixture. Its real binding/output/SQL are required; old receipts stay old.
  const actualSuccessor=await import(pathToFileURL(path.join(SOURCE,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
  if(actualSuccessor.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-after598-successor'){
    const actualNational=await import(pathToFileURL(path.join(SOURCE,'scripts/national584-source-evidence.mjs')).href);
    const actualNative=await import(pathToFileURL(path.join(SOURCE,'scripts/native-postgres-evidence.mjs')).href);
    const currentOutput=actualSuccessor.requireAssistantAfter598Output(),currentBinding=actualSuccessor.requireAssistantAfter598Binding();
    const currentPackage=JSON.parse(fs.readFileSync(path.join(SOURCE,'package.json'),'utf8'));
    actualNational.verifyAssistantAfter598Package(currentPackage);
    const checked=await actualNational.verifyAssistantAfter598SourceTarget();
    assert.equal(checked.sourcePhase,'assistant-after598-successor');assert.equal(checked.canonicalSha256,currentOutput.canonicalSha256);
    assert.equal(checked.release,actualSuccessor.requireAssistantAfter598Release());
    assert.deepEqual([checked.sourceOnly,checked.sqlExecuted,checked.originalsAuthenticated,checked.productionProof],[true,false,false,false]);
    assert.notDeepEqual(actualNative.ASSISTANT_AFTER598_COMMANDS,nativeReceipt.commands);
    assert.notDeepEqual(currentBinding,nativeReceipt.binding);
    actualNational.verifyAssistantAfter598NativeCommands(actualNative.ASSISTANT_AFTER598_COMMANDS,actualSuccessor.requireAssistantAfter598Release());
    assert.throws(()=>actualNational.verifyAssistantAfter598NativeCommands(nativeReceipt.commands,actualSuccessor.requireAssistantAfter598Release()));
    await assert.rejects(actualNative.verifyAssistantAfter598PhaseReceipt(nativeReceipt,nativeCurrent));
    await assert.rejects(actualNational.verifyAssistantAfter598NativeContext(nativeReceipt,nativeCurrent,actualSuccessor.requireAssistantAfter598Release()));
    const omitted=structuredClone(currentPackage);omitted.scripts['test:assistant-later-h0-source']=
      omitted.scripts['test:assistant-later-h0-source'].replace(actualNational.ASSISTANT_AFTER598_CURRENT_SOURCE_COMMANDS[0]+' && ','');
    assert.throws(()=>actualNational.verifyAssistantAfter598Package(omitted));
    actualCurrentAfter598SourceVerified=true;cases++;
    scenarios.push('actual current after598 source namespace/package is distinct from authentic historical FULL598; old receipt refused, no PG execution');
  }
  if(actualSuccessor.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-after599-successor'){
    const actualNational=await import(pathToFileURL(path.join(SOURCE,'scripts/national584-source-evidence.mjs')).href);
    const actualNative=await import(pathToFileURL(path.join(SOURCE,'scripts/native-postgres-evidence.mjs')).href);
    const currentOutput=actualSuccessor.requireAssistantAfter599Output(),currentBinding=actualSuccessor.requireAssistantAfter599Binding();
    const currentPackage=JSON.parse(fs.readFileSync(path.join(SOURCE,'package.json'),'utf8'));
    actualNational.verifyAssistantAfter599Package(currentPackage);
    const checked=await actualNational.verifyAssistantAfter599SourceTarget();
    assert.equal(checked.sourcePhase,'assistant-after599-successor');assert.equal(checked.canonicalSha256,currentOutput.canonicalSha256);
    assert.equal(checked.release,actualSuccessor.requireAssistantAfter599Release());
    assert.deepEqual([checked.sourceOnly,checked.sqlExecuted,checked.originalsAuthenticated,checked.productionProof],[true,false,false,false]);
    assert.notDeepEqual(actualNative.ASSISTANT_AFTER599_COMMANDS,nativeReceipt.commands);
    assert.notDeepEqual(currentBinding,nativeReceipt.binding);
    actualNational.verifyAssistantAfter599NativeCommands(actualNative.ASSISTANT_AFTER599_COMMANDS,actualSuccessor.requireAssistantAfter599Release());
    assert.throws(()=>actualNational.verifyAssistantAfter599NativeCommands(nativeReceipt.commands,actualSuccessor.requireAssistantAfter599Release()));
    await assert.rejects(actualNative.verifyAssistantAfter599PhaseReceipt(nativeReceipt,nativeCurrent));
    await assert.rejects(actualNational.verifyAssistantAfter599NativeContext(nativeReceipt,nativeCurrent,actualSuccessor.requireAssistantAfter599Release()));
    const omitted=structuredClone(currentPackage);omitted.scripts['test:assistant-later-h0-source']=
      omitted.scripts['test:assistant-later-h0-source'].replace(actualNational.ASSISTANT_AFTER599_CURRENT_SOURCE_COMMANDS[0]+' && ','');
    assert.throws(()=>actualNational.verifyAssistantAfter599Package(omitted));
    actualCurrentAfter599SourceVerified=true;cases++;
    scenarios.push('actual current after599 source namespace/package is distinct from authentic historical FULL599; old receipt refused, no PG execution');
  }


  async function assertScalarSourcePrerequisites(){
    const scalarTarget='scripts/test-weather-component-normal-wireup.mjs';
    const scalarTree=rewrite(baselineTree,[[scalarTarget,Buffer.concat([
      git(root,['cat-file','blob',base+':'+scalarTarget]),Buffer.from('\n// Synthetic selected scalar target delta\n')])]]);
    const scalarHead=commit(scalarTree,[base],'synthetic selected scalar prerequisite');
    const ordinaryTree=rewrite(baselineTree,[['scripts/source-current-contract-receipt.mjs',Buffer.concat([
      git(root,['cat-file','blob',base+':scripts/source-current-contract-receipt.mjs']),
      Buffer.from('\n// Synthetic ordinary control target delta\n')])]]);
    const ordinaryHead=commit(ordinaryTree,[base],'synthetic unselected scalar prerequisite');
    const originalExec=childProcess.execFileSync,savedFetch=globalThis.fetch,savedLog=console.log;
    const environmentKeys=['LD_LIBRARY_PATH','DYLD_LIBRARY_PATH','SUPABASE_SERVICE_ROLE_KEY','COPERNICUSMARINE_SERVICE_PASSWORD'];
    const savedEnvironment=Object.fromEntries(environmentKeys.map(key=>[key,process.env[key]]));
    const fixtureLibrary=path.join(root,'.cache','synthetic-runtime-library');
    process.env.LD_LIBRARY_PATH=[savedEnvironment.LD_LIBRARY_PATH,fixtureLibrary].filter(Boolean).join(path.delimiter);
    process.env.DYLD_LIBRARY_PATH=[savedEnvironment.DYLD_LIBRARY_PATH,fixtureLibrary].filter(Boolean).join(path.delimiter);
    process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service-never-forward';
    process.env.COPERNICUSMARINE_SERVICE_PASSWORD='synthetic-provider-never-forward';
    let preparationCalls=[],failPreparation=false;
    try{
      globalThis.fetch=transport;
      console.log=(...args)=>{
        if(String(args[0]).startsWith('SOURCE_TIME ')){rows.push(JSON.parse(String(args[0]).slice('SOURCE_TIME '.length)));actualProcesses++;}
        originalLog(...args);
      };
      childProcess.execFileSync=function(executable,args,options){
        if(args?.[0]==='-m'&&args?.[1]==='pip'){
          preparationCalls.push({executable,args,options});
          assert.equal(executable,process.env.PYTHON??'python');
          assert.deepEqual(args,['-m','pip','install','--disable-pip-version-check','--no-input',
            '-r','requirements-copernicus.txt']);
          assert.equal(options.cwd,root);assert.equal(options.timeout,120000);
          assert.equal(options.env.LD_LIBRARY_PATH,process.env.LD_LIBRARY_PATH);
          assert.equal(options.env.DYLD_LIBRARY_PATH,process.env.DYLD_LIBRARY_PATH);
          assert.equal(options.env.PIP_CONFIG_FILE,process.platform==='win32'?'NUL':'/dev/null');
          for(const key of ['GITHUB_TOKEN','GH_TOKEN','SUPABASE_SERVICE_ROLE_KEY','COPERNICUSMARINE_SERVICE_PASSWORD'])
            assert.equal(options.env[key],undefined,'No private credential in the preparation process');
          assert.equal(rows.length,0,'Prepare the declared runtime before any selected command');
          if(failPreparation)throw Error('SYNTHETIC_PRIVATE_PREPARATION_FAILURE');
          return Buffer.alloc(0);
        }
        return Reflect.apply(originalExec,childProcess,[executable,args,options]);
      };
      syncBuiltinESMExports();
      configure(scalarHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
      const selected=await coordinate();
      assert.equal(selected.selection,'TARGETED');assert.equal(preparationCalls.length,1);
      assert(selected.receipt.reportedCommandResults.some(row=>row.command==='node --test '+scalarTarget&&row.outcome==='PASS'));
      cases++;scenarios.push('actual selected scalar coordinator prepares only existing declared CP runtime with sanitized library environment');
      failPreparation=true;preparationCalls=[];
      configure(scalarHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
      await assert.rejects(coordinate(),/SOURCE_TARGETED_SCALAR_PREREQUISITE_FAILED/);
      assert.equal(preparationCalls.length,1);assert.equal(rows.length,0);
      cases++;scenarios.push('failed scalar runtime preparation is red before targets with no retry or FULL fallback');
      failPreparation=false;preparationCalls=[];
      configure(ordinaryHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
      assert.equal((await coordinate()).selection,'TARGETED');assert.equal(preparationCalls.length,0);
      cases++;scenarios.push('unselected scalar target installs no CP runtime');
    }finally{
      childProcess.execFileSync=originalExec;syncBuiltinESMExports();
      globalThis.fetch=savedFetch;console.log=savedLog;
      for(const key of environmentKeys){if(savedEnvironment[key]===undefined)delete process.env[key];else process.env[key]=savedEnvironment[key];}
    }
  }

  // The normal documentation helper has one documented area; no code fingerprint
  // or unrelated UI/Pages test is needed to classify this exact known path.
  const handbookHelper='scripts/sync-handbook-installation-copy.mjs';
  const handbookTree=rewrite(baselineTree,[[handbookHelper,fixtureControlBytes(handbookHelper)]]);
  const handbookHead=commit(handbookTree,[base],'synthetic handbook-helper documentation child');
  checkout(handbookHead);
  const handbookPlan=plan({baselineCommit:base,candidateCommit:handbookHead,expectedHead:handbookHead});
  assert.equal(handbookPlan.selection,'CURRENT_CONTRACTS',JSON.stringify(handbookPlan.reasonCodes));
  assert.deepEqual(Object.keys(handbookPlan.areas),['core','documentation']);
  assert.deepEqual(handbookPlan.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.documentation]);
  assert.equal(handbookPlan.controlQualificationRequired,false);
  for(const family of ['postgres','C','I','T'])
    assert.equal(handbookPlan.inputDigests[family+'Before'],handbookPlan.inputDigests[family+'After']);
  cases++;scenarios.push('normal handbook sync helper selects only core and documentation');
  checkout(base);

  // The ordinary bot sender and its existing maintenance recipient share one
  // normal target. This classifies current behavior, not an old workflow hash.
  const adminHistoryPaths=['.github/workflows/run-current-weather-once.yml',
    '.github/workflows/maintain-admin-document-history.yml','scripts/test-admin-document-history-workflow.mjs'];
  const adminHistoryTree=rewrite(baselineTree,adminHistoryPaths.map(file=>[file,fixtureControlBytes(file)]));
  const adminHistoryHead=commit(adminHistoryTree,[base],'synthetic normal admin-history handoff child');
  checkout(adminHistoryHead);
  const adminHistoryPlan=plan({baselineCommit:base,candidateCommit:adminHistoryHead,expectedHead:adminHistoryHead});
  assert.equal(adminHistoryPlan.selection,'CURRENT_CONTRACTS',JSON.stringify(adminHistoryPlan.reasonCodes));
  assert.deepEqual(Object.keys(adminHistoryPlan.areas),['core','pages','adminHistory','backupRestore']);
  assert.deepEqual(adminHistoryPlan.commands,[...CURRENT_CONTRACT_COMMANDS.core,
    ...CURRENT_CONTRACT_COMMANDS.pages,...CURRENT_CONTRACT_COMMANDS.adminHistory,...CURRENT_CONTRACT_COMMANDS.backupRestore]);
  assert.equal(adminHistoryPlan.controlQualificationRequired,true);
  for(const family of ['postgres','C','I','T'])
    assert.equal(adminHistoryPlan.inputDigests[family+'Before'],adminHistoryPlan.inputDigests[family+'After']);
  cases++;scenarios.push('normal bot handoff selects the ordinary sender and existing admin-history target');
  checkout(base);

  // A later selector-only edit still changes a privileged controller. Its
  // area must require review even when the test/catalogue itself is unchanged.
  const currentSelector='scripts/select-native-original-continuity-code-only-source.mjs';
  const selectorBytes=fixtureControlBytes(currentSelector);
  const selectorBaseTree=rewrite(baselineTree,[[currentSelector,selectorBytes]]);
  const selectorBase=commit(selectorBaseTree,[base],'synthetic established current-installed selector');
  const selectorTree=rewrite(selectorBaseTree,[[currentSelector,Buffer.concat([
    selectorBytes,Buffer.from('\n// Synthetic later selector-only controller change\n')])]]);
  const selectorHead=commit(selectorTree,[selectorBase],'synthetic later selector-only change');
  checkout(selectorHead);
  const selectorPlan=plan({baselineCommit:selectorBase,candidateCommit:selectorHead,expectedHead:selectorHead});
  assert.equal(selectorPlan.selection,'CURRENT_CONTRACTS',JSON.stringify(selectorPlan.reasonCodes));
  assert.deepEqual(Object.keys(selectorPlan.areas),['core','currentInstalledCodeOnly']);
  assert.deepEqual(selectorPlan.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.currentInstalledCodeOnly]);
  assert.equal(selectorPlan.controlQualificationRequired,true);
  for(const family of ['postgres','C','I','T'])
    assert.equal(selectorPlan.inputDigests[family+'Before'],selectorPlan.inputDigests[family+'After']);
  cases++;scenarios.push('later selector-only controller change requires independent control review');
  checkout(base);

  const owner='scripts/source-current-contract-receipt.mjs';
  const candidateTree=rewrite(baselineTree,[[owner,Buffer.concat([
    git(root,['cat-file','blob',base+':'+owner]),Buffer.from('\n// synthetic current-control child delta\n')])],
    ['app.js',Buffer.from('// Synthetic previously delivered public UI delta\n')],
    ['admin.html',Buffer.from('<!-- Synthetic previously delivered admin delta -->\n')]]);
  const positiveHead=commit(candidateTree,[base],'synthetic reviewed current-control child');
  configure(positiveHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  assert.equal(baselinePlan.selection,'CURRENT_CONTRACTS',JSON.stringify(baselinePlan.reasonCodes));
  assert.equal(baselinePlan.controlQualificationRequired,true);
  for(const family of ['postgres','C','I','T'])assert.equal(baselinePlan.inputDigests[family+'Before'],baselinePlan.inputDigests[family+'After']);
  globalThis.fetch=transport;
  console.log=(...args)=>{
    if(String(args[0]).startsWith('SOURCE_TIME ')){
      const row=JSON.parse(String(args[0]).slice('SOURCE_TIME '.length));rows.push(row);actualProcesses++;
      if(state.negativeDuringTargets){state.negativeDuringTargets=false;state.laterNegative=true;
        state.laterNegativeAt=state.baseTip??base;rebuildMaps();}
    }
    originalLog(...args);
  };
  rebuildMaps();const positive=await coordinate();
  assert.equal(positive.selection,'TARGETED');selectedReceipt=positive.receipt;
  assert.equal(selectedReceipt.schemaVersion,4);assert.equal(selectedReceipt.scope,'CURRENT_CHANGE_CONTRACT_RESULTS_ONLY');
  assert.equal(rows.length,baselinePlan.commands.length);assert(rows.every(row=>row.outcome==='PASS'));
  const physicallyExecuted=fs.readFileSync(path.join(root,'.cache/actual-current-targets.jsonl'),'utf8')
    .trim().split('\n').map(line=>JSON.parse(line).file);
  assert.deepEqual(physicallyExecuted.map(file=>path.relative(root,file).split(path.sep).join('/')).sort(),
    rows.flatMap(row=>row.command.split(' ').filter(file=>file.endsWith('.mjs'))).sort(),
    'Every selected command file, including each --test file, must physically execute its fixture body');
  assert(physicallyExecuted.some(file=>file.endsWith('test-source-current-contracts.mjs')),
    'The actual --test child body ran; an inherited harness skip is not execution');
  assert.deepEqual(selectedReceipt.reportedCommandResults,rows);
  assert.equal(selectedReceipt.postgres.executedInThisRun,false);
  assert.equal(selectedReceipt.historicalCompatibilityExecuted,false);
  assert.equal(selectedReceipt.fullSourceValidationClaimed,false);
  cases++;scenarios.push('actual producer child processes and separate V4 receipt');
  assert.equal(selectedReceipt.frontier.mode,'FULL');assert.equal(selectedReceipt.frontier.missingReason,'MISSING');
  const legacyFull={schemaVersion:1,kind:'RAVRADAR_SOURCE_IMPACT_FULL_BASELINE_V1',scope:'FULL_SOURCE',
    ...selectedReceipt.baselineReference,gitTree:text(root,['rev-parse',base+'^{tree}']),
    historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false};
  legacyFirstReceipt=await currentReceiptHelpers.buildCurrentContractSourceReceipt({current:selectedReceipt.current,
    fullBaseline:legacyFull,currentPlan:baselinePlan,commandResults:rows});
  legacyFirstReview={head,baselineCommit:base,inventorySha256:baselinePlan.inventorySha256,
    planSha256:currentReceiptHelpers.currentContractPlanSha256(baselinePlan,legacyFull),
    reviewSha256:sha('SYNTHETIC old V3 control review only')};

  // V4 keeps its entire canonical shape; only its complete-file capacity grows.
  const capacityLimit=currentReceiptHelpers.CURRENT_CHANGE_SOURCE_MAX_FILE_BYTES;
  assert.equal(capacityLimit,48*1024);
  const capacityInput={current:selectedReceipt.current,fullBaseline:legacyFull,
    changeBase:selectedReceipt.changeBase,currentPlan:clone(baselinePlan),cumulativePlan:clone(baselinePlan),
    frontier:selectedReceipt.frontier,commandResults:clone(selectedReceipt.reportedCommandResults)};
  const plannedInput=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='commandResults'));
  const paddedCapacity=length=>{
    const input=clone(capacityInput),receipt=clone(selectedReceipt);
    const file='scripts/synthetic-capacity-'+('x'.repeat(length))+'.mjs';
    input.currentPlan.areas.core.changedPaths.push(file);receipt.impact.areas.core.changedPaths.push(file);
    const {planSha256,...impact}=receipt.impact;receipt.impact.planSha256=sha(JSON.stringify(impact));
    return {input,receipt,bytes:Buffer.byteLength(JSON.stringify(receipt)+'\n')};
  };
  const emptyCapacity=paddedCapacity(0),mediumCapacity=paddedCapacity(33000-emptyCapacity.bytes);
  assert.equal(mediumCapacity.bytes,33000);
  assert.equal(currentReceiptHelpers.validateCurrentChangeSourceReceipt(mediumCapacity.receipt,mediumCapacity.input).validStructure,true);
  const plannedCapacity=currentReceiptHelpers.assertCurrentChangeReceiptCapacity(plannedInput(mediumCapacity.input));
  assert.equal(plannedCapacity.scope,'PLANNED_RECEIPT_BYTE_BUDGET_ONLY');
  assert.equal(plannedCapacity.maximumFileBytes,capacityLimit);assert(plannedCapacity.plannedFileBytes>=mediumCapacity.bytes);
  assert.equal(plannedCapacity.actualCommandResults,false);assert.equal(plannedCapacity.receiptCreated,false);
  assert.equal(plannedCapacity.deliveryAuthority,false);assert(!Object.hasOwn(plannedCapacity,'reportedCommandResults'));
  const exactCapacity=paddedCapacity(capacityLimit-emptyCapacity.bytes);
  assert.equal(exactCapacity.bytes,capacityLimit);
  assert.equal(currentReceiptHelpers.validateCurrentChangeSourceReceipt(exactCapacity.receipt,exactCapacity.input).validStructure,true);
  const overCapacity=paddedCapacity(capacityLimit+1-emptyCapacity.bytes);
  assert.equal(overCapacity.bytes,capacityLimit+1);
  assert.throws(()=>currentReceiptHelpers.validateCurrentChangeSourceReceipt(overCapacity.receipt,overCapacity.input),/RECEIPT_TOO_LARGE/);
  assert.throws(()=>currentReceiptHelpers.assertCurrentChangeReceiptCapacity(plannedInput(overCapacity.input)),/RECEIPT_CAPACITY_EXCEEDED/);
  const oldCapacity=clone(capacityInput.currentPlan);
  oldCapacity.areas.core.changedPaths.push('scripts/'+('x'.repeat(33000))+'.mjs');
  assert.throws(()=>currentReceiptHelpers.validateCurrentContractSourceReceipt(null,{current:capacityInput.current,
    fullBaseline:legacyFull,currentPlan:oldCapacity,commandResults:capacityInput.commandResults}),/RECEIPT_TOO_LARGE/);
  // The independent planned upper bound accounts for every safe-integer width.
  const worstInput=clone(mediumCapacity.input);
  for(const row of worstInput.commandResults)row.elapsedMs=Number.MAX_SAFE_INTEGER;
  const worstReceipt=clone(mediumCapacity.receipt);worstReceipt.reportedCommandResults=worstInput.commandResults;
  assert.equal(Buffer.byteLength(JSON.stringify(worstReceipt)+'\n'),plannedCapacity.plannedFileBytes);
  assert.equal(currentReceiptHelpers.validateCurrentChangeSourceReceipt(worstReceipt,worstInput).validStructure,true);
  const producerSource=fixtureControlBytes('scripts/source-targeted-producer.mjs').toString('utf8');
  assert(producerSource.indexOf('assertCurrentChangeReceiptCapacity({...reviewInput(),frontier})')
    <producerSource.indexOf('clean(head);prepareSelectedScalarSourceTarget(executionPlan.commands)'));
  const priorCapacityRows=rows;
  const largeDocs=Array.from({length:180},(_,i)=>['docs/ai/synthetic-capacity-'+String(i).padStart(3,'0')+'-'+('x'.repeat(100))+'.md',
    Buffer.from('# Synthetic planned capacity only\n')]);
  configure(commit(rewrite(candidateTree,largeDocs),[positiveHead],'synthetic receipt capacity before commands'));
  baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  assert.equal(baselinePlan.status,'PLANNED');rebuildMaps();
  await assert.rejects(coordinate(),/RECEIPT_CAPACITY_EXCEEDED/);assert.equal(rows.length,0);
  configure(positiveHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  rows=priorCapacityRows;rebuildMaps();
  cases+=7;scenarios.push('V4 complete-file48KiB and newline boundaries, exact conservative planning budget, legacy32KiB unchanged, actual producer stops before any target');



  main=commit(candidateTree,[base,head],'synthetic same-tree main merge');checkout(main);state.merged=true;
  assert.equal(text(root,['rev-parse',head+'^{tree}']),text(root,['rev-parse',main+'^{tree}']));
  selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
  selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
  const context={GITHUB_REPOSITORY:native.ORIGIN.repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:main,GITHUB_RUN_ID:'50000000599'};
  const freshAccess=()=>accessFactory({env:{GITHUB_TOKEN:'synthetic-never-live'}});
  const found=await discover(context,content,{...freshAccess(),readGit});
  assert.equal(found.requiresVerification,true);
  assert.equal(found.locator.contractId,'weather-source-current-change-v4');
  const accepted=await decide(found.locator,context,{...freshAccess(),readGit});
  assert.equal(accepted.required,false,JSON.stringify(accepted));
  assert.equal(accepted.scope,'CURRENT_CHANGE_CONTRACT_RESULTS_ONLY');
  assert.equal(accepted.postgresExecuted,false);
  assert.equal(accepted.historicalCompatibilityExecuted,false);
  assert.equal(accepted.independentControlReview,'VERIFIED_EXACT_ROOT_PR_REVIEW');
  cases++;scenarios.push('same-tree merge plus authenticated synthetic FULL and V4 consumer');
  assert.equal(consumer.verifiedMainSourceFrontier(accepted).commit,main);
  assert.equal(consumer.verifiedMainSourceFrontier(clone(accepted)),null);
  assert.equal(consumer.verifiedMainSourceFrontier({required:false}),null);
  const regularMerge=main;
  try{
    for(const [parent,required] of [[base,false],[head,true]]){
      main=commit(candidateTree,[parent],'synthetic GitHub squash with an exact tree');
      checkout(main);rebuildMaps();
      const squashContext={...context,GITHUB_SHA:main};
      const located=await discover(squashContext,content,{...freshAccess(),readGit});
      assert.equal(located.requiresVerification,true);
      assert.equal((await decide(located.locator,squashContext,{...freshAccess(),readGit})).required,required);
      cases++;
    }
  }finally{main=regularMerge;checkout(main);rebuildMaps();}
  scenarios.push('GitHub-linked V4 squash requires the same tested parent as well as an exact tree');
  firstDelivery={head,main,receipt:clone(selectedReceipt),zip:selectedZip,metadata:clone(selectedMetadata),
    pull:currentPull(),run:run(true),job:jobs(true),runId:selectedRun,jobId:selectedJob,pr:selectedPr,artifactId:selectedArtifactId};

  const validReceipt=clone(selectedReceipt),validMetadata=clone(selectedMetadata),validZip=selectedZip;

  // Both normal MAIN entry points consume one stored V4 member at exactly48KiB.
  const canonicalRaw=Buffer.from(JSON.stringify(validReceipt)+'\n');
  const boundaryRaw=Buffer.concat([canonicalRaw,Buffer.alloc(capacityLimit-canonicalRaw.length,32)]);
  const storedBoundary=execFileSync('python',['-c',
    'import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",compression=zipfile.ZIP_STORED); z.writestr("source-targeted-impact-proof.json",sys.stdin.buffer.read()); z.close(); sys.stdout.buffer.write(b.getvalue())'],
    {input:boundaryRaw,maxBuffer:65536,timeout:10000,stdio:['pipe','pipe','pipe']});
  assert.equal(storedBoundary.length,boundaryRaw.length+164);assert(storedBoundary.length<=65536);
  selectedZip=storedBoundary;selectedMetadata=meta(selectedArtifactId,validReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
  const boundaryFound=await discover(context,content,{...freshAccess(),readGit});
  assert.equal(boundaryFound.requiresVerification,true);
  assert.equal(boundaryFound.locator.proofSha256,sha(boundaryRaw));
  assert.equal((await decide(boundaryFound.locator,context,{...freshAccess(),readGit})).required,false);
  selectedZip=zip(Buffer.concat([boundaryRaw,Buffer.from(' ')]),'source-targeted-impact-proof.json');
  selectedMetadata=meta(selectedArtifactId,validReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
  assert.equal((await discover(context,content,{...freshAccess(),readGit})).required,true);
  const oversizedV3=Buffer.concat([Buffer.from(JSON.stringify(legacyFirstReceipt)+'\n'),
    Buffer.alloc(32769-Buffer.byteLength(JSON.stringify(legacyFirstReceipt)+'\n'),32)]);
  selectedReceipt=legacyFirstReceipt;selectedZip=zip(oversizedV3,'source-targeted-impact-proof.json');
  selectedMetadata=meta(selectedArtifactId,legacyFirstReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
  assert.equal((await discover(context,content,{...freshAccess(),readGit})).required,true);
  selectedReceipt=validReceipt;selectedMetadata=validMetadata;selectedZip=validZip;rebuildMaps();
  cases+=3;scenarios.push('normal discover and MAIN decoder accept exact48KiB V4 stored file, reject one-byte overflow, preserve old V3 complete-file32KiB');

  for(const change of [
    row=>{row.reportedCommandResults[0].outcome='FAIL';},
    row=>{row.reportedCommandResults.pop();},
    row=>{row.impact.inputDigests.postgresAfter='f'.repeat(64);},
    row=>{row.current.head=base;},
    row=>{row.fullSourceValidationClaimed=true;},
    row=>{row.schemaVersion=2;},
  ]){
    selectedReceipt=clone(validReceipt);change(selectedReceipt);
    selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
    selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
    const tamperedFound=await discover(context,content,{...freshAccess(),readGit});
    if(tamperedFound.locator)assert.equal((await decide(tamperedFound.locator,context,{...freshAccess(),readGit})).required,true);
    else assert.equal(tamperedFound.required,true);
    cases++;
  }
  scenarios.push('six altered source/result/protected-input/type/claim receipts cannot authorize');
  selectedReceipt=validReceipt;selectedMetadata=validMetadata;selectedZip=validZip;rebuildMaps();
  state.laterNegative=true;rebuildMaps();
  assert.equal((await decide(found.locator,context,{...freshAccess(),readGit})).required,true);
  cases++;scenarios.push('later negative FULL-source evidence remains red');
  state.laterNegative=false;state.expiredFull=true;rebuildMaps();
  assert.equal((await decide(found.locator,context,{...freshAccess(),readGit})).required,true);
  cases++;scenarios.push('expired original FULL/native reference cannot authorize');
  state.expiredFull=false;

  for(const flag of ['missingReview','wrongPlan','movedReview']){
    configure(positiveHead);baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
    state[flag]=true;rebuildMaps();
    await assert.rejects(coordinate(),/CONTROL_REVIEW/);
    assert.equal(rows.length,flag==='movedReview'?baselinePlan.commands.length:0);
    cases++;
  }
  scenarios.push('missing wrong or changed independent review gives no receipt');

  const target='scripts/test-source-current-contracts.mjs';
  assert(targetFiles.includes(target));
  const failTree=rewrite(candidateTree,[[target,Buffer.from("throw new Error('SYNTHETIC_SELECTED_TARGET_FAILURE');\n")]]);
  configure(commit(failTree,[positiveHead],'synthetic actual selected target failure'));
  baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
  await assert.rejects(coordinate(),/COMMAND_FAILED/);
  assert.equal(rows.at(-1).outcome,'FAIL');
  cases++;scenarios.push('an actual child-process failure is red, never FULL fallback');

  const nativeFile=profile.postgresModules[0];
  for(const [label,file]of [['PG',nativeFile],['C',profile.models.C.file],['I',profile.models.I.file],['T',profile.continuation.file]]){
    const changedTree=rewrite(candidateTree,[[file,Buffer.concat([
      git(root,['cat-file','blob',positiveHead+':'+file]),Buffer.from('\n// synthetic protected-input drift\n')])]]);
    configure(commit(changedTree,[positiveHead],'synthetic protected '+label+' change'));
    baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
    assert.equal(baselinePlan.selection,'FULL');
    assert.equal((await coordinate()).selection,'FULL');assert.equal(rows.length,0);
    cases++;
  }
  scenarios.push('all four actual protected PG/C/I/T input families require qualification on drift');
  const unknownTree=rewrite(candidateTree,[['js/unclassified-production-feature.js',Buffer.from('export const changed=true;\n')]]);
  configure(commit(unknownTree,[positiveHead],'synthetic unclassified product change'));
  baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});rebuildMaps();
  assert.equal(baselinePlan.selection,'FULL');assert.equal((await coordinate()).selection,'FULL');assert.equal(rows.length,0);
  cases++;scenarios.push('unknown product paths have no short-source authority');
  assert.equal(unexpectedRoutes.length,0);

  // A delivered public/admin change is not retested as a current Pages change.
  // The prior V4 ZIP only locates the FULL origin; normal FULL qualification runs.
  const repo='/repos/'+native.ORIGIN.repository,actions=repo+'/actions';
  firstDelivery.receipt=legacyFirstReceipt;
  firstDelivery.zip=zip(Buffer.from(JSON.stringify(legacyFirstReceipt)+'\n'),'source-targeted-impact-proof.json');
  firstDelivery.metadata=meta(firstDelivery.artifactId,legacyFirstReceipt.artifactName,firstDelivery.zip,
    firstDelivery.runId,firstDelivery.head,22);
  firstDelivery.pull.body='<!-- RAVRADAR_CURRENT_CONTRACT_REVIEW_V3 '+JSON.stringify(legacyFirstReview)+' -->';
  priorMaps.set(repo+'/commits/'+firstDelivery.main+'/pulls?per_page=100',[firstDelivery.pull]);
  priorMaps.set(repo+'/pulls/'+firstDelivery.pr,firstDelivery.pull);
  priorMaps.set(actions+'/runs/'+firstDelivery.runId,firstDelivery.run);
  priorMaps.set(actions+'/runs/'+firstDelivery.runId+'/attempts/1/jobs?per_page=100',
    {total_count:1,jobs:[firstDelivery.job]});
  priorMaps.set(actions+'/artifacts?name='+encodeURIComponent(firstDelivery.receipt.artifactName)+'&per_page=100',
    {total_count:1,artifacts:[firstDelivery.metadata]});
  priorMaps.set(actions+'/artifacts/'+firstDelivery.artifactId,firstDelivery.metadata);
  priorZips.set(String(firstDelivery.artifactId),firstDelivery.zip);
  for(const producer of Object.values(namespace.SOURCE_GATE_PRODUCERS))priorMaps.set(
    actions+'/workflows/'+producer.workflowId+'/runs?head_sha='+firstDelivery.main+'&branch=main&per_page=100&page=1',
    {total_count:0,workflow_runs:[]});
  // Den faktiske Gitplan skal bruge det snavre valg, ikke kun den rene udvaelger.
  const beforeOwnerPlan=head;
  try{
    for(const [label,extra,bounded]of [
      ['helper',[],true],
      ['deployment-test',[['scripts/test-ravscore-operational-pages-deployment.mjs',Buffer.from('// Synthetic changed broad deployment test\n')]],false],
      ['workflow',[['.github/workflows/reusable-pages-deploy.yml',Buffer.from('# Synthetic changed Pages workflow\n')]],false],
    ]){
      const helper=ownerHelpers[1],original=git(root,['cat-file','blob',firstDelivery.main+':'+helper]);
      const tree=rewrite(candidateTree,[[helper,Buffer.concat([original,Buffer.from('\n// Synthetic owner-only delta\n')])],...extra]);
      const candidate=commit(tree,[firstDelivery.main],'synthetic owner scope '+label);checkout(candidate);
      const selected=plan({baselineCommit:firstDelivery.main,candidateCommit:candidate,expectedHead:candidate});
      assert.equal(selected.selection,'CURRENT_CONTRACTS');
      assert.deepEqual(selected.areas.pages.commands,bounded?ownerCommands:CURRENT_CONTRACT_COMMANDS.pages);
      assert.equal(selected.commands.includes(ownerCommand),bounded);
      assert.equal(selected.commands.includes(deploymentCommand),!bounded);
      assert.equal(selected.protectedInputs.postgresUnchanged,true);
      assert.equal(selected.protectedInputs.CUnchanged,true);assert.equal(selected.protectedInputs.IUnchanged,true);
      assert.equal(selected.protectedInputs.TUnchanged,true);cases++;
    }
  }finally{checkout(beforeOwnerPlan);}
  scenarios.push('normal Git owner-only plan selects the existing entry; changed broad deployment test or workflow preserves the full command');
  const plannerSharingResults=assertPlannerAndSharingPlanScope({baselineCommit:firstDelivery.main,
    baselineTree:text(root,['rev-parse',firstDelivery.main+'^{tree}']),rewriteTree:rewrite,
    makeCommit:commit,checkoutCommit:checkout,plan,restoreHead:head});
  cases+=plannerSharingResults.length;
  scenarios.push('exact regular planner/current inputs select four whole controls; other controls retain eight; exact Pages sharing owners and unknown/protected/mode refusals remain');
  const assistantScopeResults=assertAssistantEdgePlanScope({baselineCommit:firstDelivery.main,
    baselineTree:text(root,['rev-parse',firstDelivery.main+'^{tree}']),rewriteTree:rewrite,
    makeCommit:commit,checkoutCommit:checkout,plan,restoreHead:head});
  cases+=assistantScopeResults.length;
  scenarios.push('exact assistant Edge owners select existing full targets; UI deduplicates roundtrip and unknown/shared functions retain refusal');
  const archiveQueueResults=assertArchiveOuterQueuePlanScope({baselineCommit:firstDelivery.main,
    baselineTree:text(root,['rev-parse',firstDelivery.main+'^{tree}']),rewriteTree:rewrite,
    makeCommit:commit,checkoutCommit:checkout,plan,restoreHead:head,fixtureSource:restoreSource,
    workflowSource:fs.readFileSync(new URL('../.github/workflows/verify-supabase-cli-local-restore.yml',import.meta.url),'utf8')});
  cases+=archiveQueueResults.length;
  scenarios.push('only the exact manual archive outer queue replacement composes with the unchanged fixture security frame; all four backup targets and fresh control review remain');
  const archiveInventoryResults=assertArchiveInventoryPlanScope({baselineCommit:firstDelivery.main,
    baselineTree:text(root,['rev-parse',firstDelivery.main+'^{tree}']),rewriteTree:rewrite,
    makeCommit:commit,checkoutCommit:checkout,plan,restoreHead:head,fixtureSource:restoreSource,currentFixtureSource:currentRestoreSource,
    workflowSource:fs.readFileSync(new URL('../.github/workflows/verify-supabase-cli-local-restore.yml',import.meta.url),'utf8')});
  cases+=archiveInventoryResults.length;
  scenarios.push('the fixed inventory CLI and workflow role select all four backup targets and fresh review; unknown mode, source/writer changes and adjacent paths refuse');
  const sourceAutonomyScopeResults=assertSourceAutonomyPlanScope({baselineCommit:firstDelivery.main,
    baselineTree:text(root,['rev-parse',firstDelivery.main+'^{tree}']),rewriteTree:rewrite,
    makeCommit:commit,checkoutCommit:checkout,plan,restoreHead:head});
  cases+=sourceAutonomyScopeResults.length;
  scenarios.push('exact source-controller owners select both normal whole tests and independent source-controls; unknown and protected inputs retain refusal');
  const pagesTree=rewrite(candidateTree,[['.github/workflows/reusable-pages-deploy.yml',
    Buffer.from('# SYNTHETIC current Pages caller delta only\n')]]);
  selectedRun+=1000;selectedJob+=1000;selectedPr+=1000;selectedArtifactId+=1000;
  const pagesHead=commit(pagesTree,[firstDelivery.main],'synthetic subsequent current Pages change');
  const configurePages=()=>{configure(pagesHead);state.baseTip=firstDelivery.main;state.missingReview=true;
    baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});};
  const seedName=actions+'/artifacts?name='+encodeURIComponent(firstDelivery.receipt.artifactName)+'&per_page=100';
  const restoreSeed=()=>{priorMaps.set(repo+'/commits/'+firstDelivery.main+'/pulls?per_page=100',[firstDelivery.pull]);
    priorMaps.set(seedName,{total_count:1,artifacts:[firstDelivery.metadata]});
    priorMaps.set(actions+'/artifacts/'+firstDelivery.artifactId,firstDelivery.metadata);
    priorZips.set(String(firstDelivery.artifactId),firstDelivery.zip);};
  const failedPrior=clone(firstDelivery.receipt);failedPrior.reportedCommandResults[0].outcome='FAIL';
  const failedZip=zip(Buffer.from(JSON.stringify(failedPrior)+'\n'),'source-targeted-impact-proof.json');
  const failedMeta=meta(firstDelivery.artifactId,failedPrior.artifactName,failedZip,firstDelivery.runId,firstDelivery.head,22);
  priorMaps.set(seedName,{total_count:1,artifacts:[failedMeta]});priorMaps.set(actions+'/artifacts/'+firstDelivery.artifactId,failedMeta);
  priorZips.set(String(firstDelivery.artifactId),failedZip);
  configurePages();rebuildMaps();await assert.rejects(coordinate(),/FRONTIER_CONTRADICTION/);assert.equal(rows.length,0);
  cases++;scenarios.push('known FAIL in prior typed V3 receipt is red before any target, never FULL fallback');
  restoreSeed();configurePages();state.laterNegative=true;state.laterNegativeAt=firstDelivery.main;rebuildMaps();
  await assert.rejects(coordinate(),/FRONTIER_CONTRADICTION/);assert.equal(rows.length,0);
  cases++;scenarios.push('later negative on the actual prior main frontier is red before commands');
  configurePages();state.laterNegative=true;state.laterNegativeAt=firstDelivery.main;
  priorMaps.set(repo+'/commits/'+firstDelivery.main+'/pulls?per_page=100',[]);rebuildMaps();
  await assert.rejects(coordinate(),/FRONTIER_LATER_NEGATIVE_OR_UNKNOWN/);assert.equal(rows.length,0);
  cases++;scenarios.push('missing frontier cannot hide known negative exact-base source history');
  restoreSeed();
  restoreSeed();configurePages();
  priorMaps.set(repo+'/commits/'+firstDelivery.main+'/pulls?per_page=100',[]);
  state.negativeDuringTargets=true;rebuildMaps();
  await assert.rejects(coordinate(),/FRONTIER_LATER_NEGATIVE_OR_UNKNOWN/);
  assert.equal(rows.length,baselinePlan.commands.length);
  cases++;scenarios.push('known negative arriving during cumulative fallback targets prevents a receipt');
  restoreSeed();
  for(const missing of ['MISSING','EXPIRED']){
    restoreSeed();configurePages();
    if(missing==='MISSING')priorMaps.set(repo+'/commits/'+firstDelivery.main+'/pulls?per_page=100',[]);
    else priorMaps.set(seedName,{total_count:1,artifacts:[{...firstDelivery.metadata,expired:true}]});
    rebuildMaps();const fallback=await coordinate();assert.equal(fallback.selection,'TARGETED');
    assert.equal(fallback.receipt.frontier.mode,'FULL');assert.equal(fallback.receipt.frontier.missingReason,missing);
    assert.deepEqual(fallback.receipt.reportedCommandResults.map(row=>row.command),baselinePlan.commands);
    assert.equal(fallback.receipt.postgres.executedInThisRun,false);assert.equal(fallback.receipt.fullSourceValidationClaimed,false);
    cases++;
  }
  scenarios.push('only explicit missing or expired frontier runs known cumulative targets without fresh PostgreSQL');
  restoreSeed();configurePages();
  const onlyPages=plan({baselineCommit:firstDelivery.main,candidateCommit:head,expectedHead:head});
  assert.equal(onlyPages.selection,'CURRENT_CONTRACTS');assert.equal(onlyPages.controlQualificationRequired,false);
  assert.deepEqual(onlyPages.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.pages]);
  rebuildMaps();const next=await coordinate();
  assert.equal(next.selection,'TARGETED');assert.deepEqual(next.receipt.reportedCommandResults.map(row=>row.command),onlyPages.commands);
  assert.equal(next.receipt.changeBase.commit,firstDelivery.main);
  assert.equal(next.receipt.frontier.kind,'QUALIFIED_CHANGE_FRONTIER');
  assert.equal(next.receipt.frontier.mode,'MAIN');
  assert.equal(next.receipt.frontier.sourceRecord.contractId,'weather-source-current-contracts-v3');
  assert.equal(next.receipt.baselineReference.mergeCommit,base);
  assert.equal(next.receipt.baselineContinuity.commandsExecuted,false);
  assert(next.receipt.baselineContinuity.areas.publicUI&&next.receipt.baselineContinuity.areas.adminUI);
  assert(!next.receipt.impact.areas.publicUI&&!next.receipt.impact.areas.adminUI);
  assert(observedRoutes.some(route=>route.includes(encodeURIComponent(firstDelivery.receipt.artifactName))),
    'The ordinary caller read the latest immutable receipt as an origin locator without a ROOT marker');
  assert.equal(rows.length,onlyPages.commands.length);assert(rows.every(row=>row.outcome==='PASS'));
  selectedReceipt=next.receipt;
  main=commit(pagesTree,[firstDelivery.main],'synthetic subsequent same-tree main squash');checkout(main);state.merged=true;
  // Later API base-tip movement cannot rewrite the tested immutable Git parent.
  state.closedBaseTip='f'.repeat(40);
  selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
  selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
  const nextContext={...context,GITHUB_SHA:main};
  const nextFound=await discover(nextContext,next.sourceTreeSha256,{...freshAccess(),readGit});
  const nextAccepted=await decide(nextFound.locator,nextContext,{...freshAccess(),readGit});
  assert.equal(nextAccepted.required,false,JSON.stringify(nextAccepted));
  assert.equal(nextAccepted.independentControlReview,'NOT_REQUIRED');
  assert.deepEqual(nextAccepted.testedAreas,['core','pages']);
  cases++;scenarios.push('normal next Pages producer and merged consumer execute exactly the current core/Pages command list after delivered UI/admin');
  const nextValid=clone(selectedReceipt),nextValidMetadata=clone(selectedMetadata),nextValidZip=selectedZip;
  const pageDelivery={head,main,receipt:clone(selectedReceipt),zip:selectedZip,metadata:clone(selectedMetadata),
    pull:currentPull(),run:run(true),job:jobs(true),runId:selectedRun,pr:selectedPr,artifactId:selectedArtifactId};
  for(const alter of [
    row=>{row.frontier.mode='MAIN';row.frontier.sourceRecord=null;},
    row=>{row.frontier.sourceTreeSha256='sha256:'+'f'.repeat(64);},
    row=>{row.changeBase.commit=base;},
    row=>{row.changeBase.gitTree='f'.repeat(40);},
    row=>{row.changeBase.pullBaseCommit=base;},
    ...['postgres','C','I','T'].map(family=>row=>{row.baselineContinuity.inputDigests[family+'After']='f'.repeat(64);}),
  ]){
    selectedReceipt=clone(nextValid);alter(selectedReceipt);
    selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
    selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
    const altered=await discover(nextContext,next.sourceTreeSha256,{...freshAccess(),readGit});
    assert.equal((await decide(altered.locator,nextContext,{...freshAccess(),readGit})).required,true);cases++;
  }
  scenarios.push('three false current bases and four false FULL-origin protected input digests are refused');

  // The next V4 summary is verified directly, without reopening its V3 parent ZIP.
  for(const [route,value]of [
    [repo+'/commits/'+pageDelivery.main+'/pulls?per_page=100',[pageDelivery.pull]],
    [repo+'/pulls/'+pageDelivery.pr,pageDelivery.pull],
    [actions+'/runs/'+pageDelivery.runId,pageDelivery.run],
    [actions+'/runs/'+pageDelivery.runId+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[pageDelivery.job]}],
    [actions+'/artifacts?name='+encodeURIComponent(pageDelivery.receipt.artifactName)+'&per_page=100',
      {total_count:1,artifacts:[pageDelivery.metadata]}],
    [actions+'/artifacts/'+pageDelivery.artifactId,pageDelivery.metadata],
  ])priorMaps.set(route,value);
  priorZips.set(String(pageDelivery.artifactId),pageDelivery.zip);
  priorZips.delete(String(firstDelivery.artifactId));
  for(const producer of Object.values(namespace.SOURCE_GATE_PRODUCERS))priorMaps.set(
    actions+'/workflows/'+producer.workflowId+'/runs?head_sha='+pageDelivery.main+'&branch=main&per_page=100&page=1',
    {total_count:0,workflow_runs:[]});
  const uiTree=rewrite(pagesTree,[['app.js',Buffer.from('// SYNTHETIC next ordinary public UI delta\n')]]);
  selectedRun+=1000;selectedJob+=1000;selectedPr+=1000;selectedArtifactId+=1000;
  configure(commit(uiTree,[pageDelivery.main],'synthetic next ordinary UI change'));
  state.baseTip=pageDelivery.main;state.missingReview=true;
  baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  const onlyUi=plan({baselineCommit:pageDelivery.main,candidateCommit:head,expectedHead:head});
  assert.equal(onlyUi.controlQualificationRequired,false);rebuildMaps();
  const ui=await coordinate();assert.equal(ui.selection,'TARGETED');assert.equal(ui.receipt.frontier.mode,'MAIN');
  assert.equal(ui.receipt.frontier.sourceRecord.contractId,'weather-source-current-change-v4');
  assert.deepEqual(ui.receipt.reportedCommandResults.map(row=>row.command),onlyUi.commands);
  assert(!observedRoutes.includes(actions+'/artifacts/'+firstDelivery.artifactId+'/zip'),'No ancestor ZIP recursion');
  selectedReceipt=ui.receipt;main=commit(uiTree,[pageDelivery.main,head],'synthetic next ordinary UI same-tree merge');
  checkout(main);state.merged=true;state.closedBaseTip='e'.repeat(40);
  selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
  selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,22);rebuildMaps();
  const uiContext={...context,GITHUB_SHA:main},uiFound=await discover(uiContext,ui.sourceTreeSha256,{...freshAccess(),readGit});
  const uiAccepted=await decide(uiFound.locator,uiContext,{...freshAccess(),readGit});
  assert.equal(uiAccepted.required,false,JSON.stringify(uiAccepted));assert.equal(uiAccepted.independentControlReview,'NOT_REQUIRED');
  assert.deepEqual(uiAccepted.testedAreas,['core','publicUI']);
  const priorPullRoute=repo+'/pulls/'+pageDelivery.pr;
  try{
    for(const [field,value] of [['merge_commit_sha',base],['head',{...pageDelivery.pull.head,sha:base}]]){
      priorMaps.set(priorPullRoute,{...pageDelivery.pull,[field]:value});
      rebuildMaps();
      const result=await decide(uiFound.locator,uiContext,{...freshAccess(),readGit});
      assert.equal(result.required,true);
      cases++;
    }
  }finally{priorMaps.set(priorPullRoute,pageDelivery.pull);rebuildMaps();}
  cases++;scenarios.push('two successive qualified V4 delta frontiers with an authenticated squash predecessor and rejection of false prior PR identity');

  // A later candidate may extend its catalogue while qualifying an older main.
  // Its cached ESM planner must not rewrite the older receipt's actual scope.
  const priorMain=main,catalogFile='scripts/source-current-contract-plan.mjs';
  const priorCatalog=fs.readFileSync(path.join(root,catalogFile),'utf8');
  const laterCatalog=priorCatalog.replace('  historicalTests:[],',
    "  laterCatalogue:['node scripts/test-github-action-versions.mjs'],\n  historicalTests:[],")
    .replace('  historicalTests:[\n',"  laterCatalogue:['app.js'],\n  historicalTests:[");
  assert.notEqual(laterCatalog,priorCatalog);
  const catalogTree=rewrite(uiTree,[[catalogFile,Buffer.from(laterCatalog)]]);
  checkout(commit(catalogTree,[priorMain],'synthetic next catalogue registration'));
  const {planSourceCurrentContractsFromGit:cachedLaterPlan}=await import(
    pathToFileURL(path.join(root,catalogFile)).href+'?later-catalogue-regression');
  checkout(priorMain);
  const wrongCurrentPlan=cachedLaterPlan({baselineCommit:pageDelivery.main,candidateCommit:priorMain,expectedHead:priorMain});
  assert.equal(wrongCurrentPlan.status,'PLANNED');
  assert.notDeepEqual(wrongCurrentPlan.commands,ui.receipt.impact.commands);
  const savedNodeOptions=process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS='--require /RAVRADAR_SYNTHETIC_OPTIONS_MUST_NOT_EXECUTE';
  const planDeadline=performance.now()+60000;
  const remainingPlanBudget=()=>{const n=planDeadline-performance.now();assert(n>0);return n;};
  let priorPlans;
  try{
    write('data/kystdata.json',Buffer.from('{"syntheticCentralRuntime":true}\n'));
    write('HANDBOOK-RAVRADAR.md',Buffer.from('Synthetic hydrated handbook document\n'));
    priorPlans=consumer.readCommittedCurrentSourcePlans({head:priorMain,baselines:[pageDelivery.main,base]},
      {readGit,remaining:remainingPlanBudget});
    assert.deepEqual(priorPlans[0].commands,ui.receipt.impact.commands);
    assert.deepEqual(priorPlans[1].commands,ui.receipt.baselineContinuity.commands);
    assert(priorPlans.every(plan=>plan.authority==='PLANNING_ONLY'&&plan.productionAuthority===false));
    fs.appendFileSync(path.join(root,catalogFile),'\n// Synthetic uncommitted executable drift\n');
    assert.throws(()=>consumer.readCommittedCurrentSourcePlans({head:priorMain,baselines:[base]},
      {readGit,remaining:remainingPlanBudget}),/SOURCE_CURRENT_PLANNER_NOT_COMMITTED/);
  }finally{
    if(savedNodeOptions===undefined)delete process.env.NODE_OPTIONS;else process.env.NODE_OPTIONS=savedNodeOptions;
    checkout(priorMain);
  }
  cases++;scenarios.push('later catalogue cannot rewrite prior V4 scope; committed child plans allow data hydration and discard Node injection');

  {

    // Selvstændig SDK/control-case: de tidligere V3/22- og UI/no-ROOT-cases bevares.
    const saved={base,baseContent,fullBody,phaseBody,immutableFullZip,immutablePhaseZip,head,main,
      baselinePlan,selectedReceipt,selectedZip,selectedMetadata,rows,selectedRun,selectedJob,selectedPr,selectedArtifactId,
      maps,zips,state:clone(state),priorMaps:new Map(priorMaps),priorZips:new Map(priorZips),gitHead:text(root,['rev-parse','HEAD'])};
    try{
      const workflow='.github/workflows/validate-pull-request.yml';
      // This exercise qualifies the historical SDK-only change and its former
      // FULL producer. The dependency-only workflow has its own current test.
      const sdkWorkflow=readHistoricalSourceSetupWorkflow();
      const predecessor=inverseOwnedCacheNativeWorkflow(sdkWorkflow);assert.notEqual(predecessor,sdkWorkflow);
      const seedTree=rewrite(baselineTree,[[workflow,Buffer.from(predecessor)]]);
      base=commit(seedTree,[saved.base],'synthetic same genuine PG seed with normal DMI environment');
      assert.equal(text(root,['diff','--name-only',saved.base,base]),workflow);
      checkout(base);baseContent=sourceContent.sourceTreeContentSha256(base,{git:readGit});
      const sdkNativeCurrent={...nativeCurrent,head:base};
      const sdkNative={...clone(nativeReceipt),current:sdkNativeCurrent};
      const sdkHistorical={...clone(historical),current:{...historical.current,head:base},
        ...await national.assistantAfter597NativeClaims(sdkNative,sdkNativeCurrent)};
      fullBody={...clone(saved.fullBody),headSha:base,sourceTreeSha256:baseContent,
        nativePostgres:sdkNative,historical584National:sdkHistorical};
      phaseBody={...clone(saved.phaseBody),headSha:base,sourceTreeSha256:baseContent,nativePostgres:clone(sdkNative)};
      immutableFullZip=null;immutablePhaseZip=null;priorMaps.clear();priorZips.clear();
      const sdkTree=rewrite(seedTree,[[workflow,Buffer.from(sdkWorkflow)]]);
      selectedRun+=1000;selectedJob+=1000;selectedPr+=1000;selectedArtifactId+=1000;
      configure(commit(sdkTree,[base],'synthetic real committed SDK workflow change'));
      state.modernWorkflow=true;state.ownedCacheNativeWorkflow=true;state.fullModernWorkflow=true;
      baselinePlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
      assert.equal(baselinePlan.status,'PLANNED');assert.equal(baselinePlan.selection,'CURRENT_CONTRACTS');
      assert.deepEqual(Object.keys(baselinePlan.areas),['core','sourceControls']);
      assert.equal(baselinePlan.controlQualificationRequired,true);
      assert.deepEqual(baselinePlan.commands,[...CURRENT_CONTRACT_COMMANDS.core,...CURRENT_CONTRACT_COMMANDS.sourceControls]);
      assert.deepEqual(baselinePlan.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
      const logFile=path.join(root,'.cache/actual-current-targets.jsonl');
      const beforeTargets=fs.readFileSync(logFile,'utf8').trim().split('\n').filter(Boolean).length;
      rebuildMaps();const sdk=await coordinate();assert.equal(sdk.selection,'TARGETED');
      assert.equal(rows.length,baselinePlan.commands.length);assert(rows.every(row=>row.outcome==='PASS'));
      const executed=fs.readFileSync(logFile,'utf8').trim().split('\n').filter(Boolean).slice(beforeTargets)
        .map(line=>path.relative(root,JSON.parse(line).file).split(path.sep).join('/'));
      assert.deepEqual(executed.sort(),rows.flatMap(row=>row.command.split(' ').filter(file=>file.endsWith('.mjs'))).sort());
      selectedReceipt=sdk.receipt;assert.equal(selectedReceipt.schemaVersion,4);
      assert.deepEqual(selectedReceipt.reportedCommandResults,rows);
      main=commit(sdkTree,[base,head],'synthetic SDK same-tree main merge');checkout(main);state.merged=true;
      selectedZip=zip(Buffer.from(JSON.stringify(selectedReceipt)+'\n'),'source-targeted-impact-proof.json');
      selectedMetadata=meta(selectedArtifactId,selectedReceipt.artifactName,selectedZip,selectedRun,head,24);rebuildMaps();
      const sdkJob=jobs(true);assert.equal(sdkJob.steps.find(row=>row.name==='Run actions/setup-python@v7').number,7);
      assert.deepEqual(sdkJob.steps.slice(3,5).map(row=>row.name),[
        'Set up Node24 for selected owned-cache native contracts','Retain actual Node24 executable for selected native contracts']);
      const sdkContext={...context,GITHUB_SHA:main};let workflowReads=0;
      const sdkReadGit=(args,options)=>{
        if(args[0]==='cat-file'&&args[1]==='blob'&&args[2]===head+':'+workflow){workflowReads++;
          const bytes=readGit(args,options);assert.equal(bytes.toString('utf8'),sdkWorkflow);return bytes;}
        return readGit(args,options);
      };
      const sdkFound=await discover(sdkContext,sdk.sourceTreeSha256,{...freshAccess(),readGit:sdkReadGit});
      assert(sdkFound.locator);assert.equal(sdkFound.locator.contractId,'weather-source-current-change-v4');
      const sdkAccepted=await decide(sdkFound.locator,sdkContext,{...freshAccess(),readGit:sdkReadGit});
      assert.equal(sdkAccepted.required,false,JSON.stringify(sdkAccepted));
      assert.equal(sdkAccepted.independentControlReview,'VERIFIED_EXACT_ROOT_PR_REVIEW');
      assert.deepEqual(sdkAccepted.testedAreas,['core','sourceControls']);assert.equal(workflowReads,2);
      cases++;
      for(const fault of ['python-position','retainer-skipped']){
        state.sdkStepFault=fault;
        assert.equal((await discover(sdkContext,sdk.sourceTreeSha256,{...freshAccess(),readGit:sdkReadGit})).required,true);
        assert.equal((await decide(sdkFound.locator,sdkContext,{...freshAccess(),readGit:sdkReadGit})).required,true);cases++;
      }
      state.sdkStepFault=null;
      scenarios.push('normal SDK/control producer executes its full selected fake targets; Python7 workflow binds in discovery and decide, unknown layout/status still refuse');
    }finally{
      ({base,baseContent,fullBody,phaseBody,immutableFullZip,immutablePhaseZip,head,main,baselinePlan,
        selectedReceipt,selectedZip,selectedMetadata,rows,selectedRun,selectedJob,selectedPr,selectedArtifactId,maps,zips}=saved);
      Object.assign(state,saved.state);priorMaps.clear();for(const [key,value]of saved.priorMaps)priorMaps.set(key,value);
      priorZips.clear();for(const [key,value]of saved.priorZips)priorZips.set(key,value);checkout(saved.gitHead);
    }
  }

  await assertScalarSourcePrerequisites();
  }

}finally{
  console.log=originalLog;globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env))if(!Object.hasOwn(originalEnvironment,key))delete process.env[key];
  Object.assign(process.env,originalEnvironment);
  assert.equal(path.dirname(fs.realpathSync(root)),temp);
  const current=fs.lstatSync(root,{bigint:true});
  assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
  fs.rmSync(root,{recursive:true,force:false});
}
console.log(JSON.stringify({kind:'SYNTHETIC_CURRENT_V4_PRODUCER_CONSUMER_INTEGRATION',cases,passed:cases,failed:0,scenarios,
  actualTargetProcesses:actualProcesses,syntheticTransportCalls:calls,realIsolatedGit:true,
  genuineProtected148AndCIT:true,frozenAnchors:16,plannerMock:false,productSourceTestsExecuted:false,
  actualSqlOrSqliteExecuted:false,actualGitHubOrFullQualification:false,actualCurrentAfter598SourceVerified,actualCurrentAfter599SourceVerified,
  network:false,production:false,deliveryAuthority:false}));

// BEGIN FOCUSED WEATHER OPERATION OWNER CASES
// Real current Git input; plans/receipt capacity only, never native or source PASS.
{
const gitEnvironment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_AUTHOR_NAME:'Synthetic current-contract protocol',GIT_AUTHOR_EMAIL:'fixture@example.invalid',
  GIT_COMMITTER_NAME:'Synthetic current-contract protocol',GIT_COMMITTER_EMAIL:'fixture@example.invalid',
  GIT_AUTHOR_DATE:'2026-11-12T09:00:00Z',GIT_COMMITTER_DATE:'2026-11-12T09:00:00Z'};
const git=(where,args,input)=>execFileSync('git',['-C',where,...args],{input,env:gitEnvironment,
  timeout:30000,maxBuffer:256*1024*1024,stdio:['pipe','pipe','pipe']});
const text=(where,args,input)=>git(where,args,input).toString('utf8').trim();
  const temp=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temp,'rr-weather-operation-owner-'));
  const owned=fs.lstatSync(root,{bigint:true});
const commandRows=tree=>git(root,['ls-tree','-z',tree]).toString('utf8').split('\0').filter(Boolean).map(line=>{
  const m=/^(\d{6}) (blob|tree) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);return{mode:m[1],type:m[2],oid:m[3],name:m[4]};});
function rewrite(tree,changes){
  const entries=tree?commandRows(tree):[],groups=new Map();
  for(const[file,body]of changes){const[name,...tail]=file.split('/'),group=groups.get(name)??[];group.push([tail.join('/'),body]);groups.set(name,group);}
  for(const[name,group]of groups){const prior=entries.find(row=>row.name===name),next=group[0][0]===''
    ?{name,mode:prior?.mode??'100644',type:'blob',oid:text(root,['hash-object','-w','--stdin'],group[0][1])}
    :{name,mode:'040000',type:'tree',oid:rewrite(prior?.oid,group)};
    if(prior)entries.splice(entries.indexOf(prior),1);entries.push(next);}
  return text(root,['mktree','--missing','-z'],entries.map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join(''));
}
const commit=(tree,parents,label)=>text(root,['commit-tree',tree,...parents.flatMap(parent=>['-p',parent]),'-m',label]);
const checkout=commitId=>git(root,['reset','--hard',commitId]);
  const pointHead=id=>git(root,['update-ref','HEAD',id]);
  const controlSources=new Set(),fixtureControlBytes=file=>fs.readFileSync(path.join(SOURCE,file));
function collect(file){
  if(controlSources.has(file))return;
  const sourceFile=path.resolve(SOURCE,file),relative=path.relative(SOURCE,sourceFile);
  assert(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));
  controlSources.add(file);
  const body=fixtureControlBytes(file).toString('utf8'),url=pathToFileURL(sourceFile);
  // Static re-exports also load their real module before any reader is called.
  for(const match of body.matchAll(/^(?:import\b|export\s+(?:\*|\{))[^;]*?\bfrom\s*['"](\.[^'"]+)['"]/gm)){
    const dep=fileURLToPath(new URL(match[1],url)),name=path.relative(SOURCE,dep).split(path.sep).join('/');
    collect(name);
  }
}
  try{
    const sourceHead=text(SOURCE,['rev-parse','HEAD']);
    assert.match(sourceHead,/^[a-f0-9]{40}$/);
    git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
    // Only existing local object addresses are shared for reading. All newly
    // made fixture objects/index/HEAD belong to this owned temporary repository.
    const objects=fs.realpathSync(path.resolve(SOURCE,text(SOURCE,['rev-parse','--git-path','objects'])));
    fs.writeFileSync(path.join(root,'.git/objects/info/alternates'),objects.replaceAll('\\','/')+'\n');
    assert.equal(text(root,['cat-file','-t',sourceHead]),'commit');
    collect('scripts/source-current-contract-plan.mjs');
    collect('scripts/source-current-contract-receipt.mjs');
    for(const file of ['scripts/verify-account-assistant-schema.mjs','scripts/verify-account-erasure-schema.mjs'])
      assert(controlSources.has(file),'Actual app schema import/re-export closure: '+file);
    for(const file of [...controlSources,'package.json','version.json',
      ...['594','597','598'].map(version=>'scripts/lib/source-impact-domain-inputs-'+version+'.json'),
      'scripts/test-source-current-contracts.mjs']){
      const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,fixtureControlBytes(file));
    }
    git(root,['read-tree',sourceHead]);
    git(root,['add','--','scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs']);
    const seedTree=text(root,['write-tree']),seed=commit(seedTree,[sourceHead],'synthetic current weather owner controls');pointHead(seed);
    const {planSourceCurrentContractsFromGit:plan}=await import(pathToFileURL(path.join(root,'scripts/source-current-contract-plan.mjs')).href);
    const receipt=await import(pathToFileURL(path.join(root,'scripts/source-current-contract-receipt.mjs')).href);
    const {expandSourceCommands}=await import(pathToFileURL(path.join(SOURCE,'scripts/validate-source-once.mjs')).href);
    const scripts=JSON.parse(fixtureControlBytes('package.json')).scripts;
    const expectedWater=['node scripts/test-water-source-forecast-routing-4.0.100.mjs',
      'node scripts/test-water-source-automatic-selection-4.0.101.mjs','node scripts/test-water-source-production-chain-4.0.103.mjs',
      'node scripts/test-water-regressions-4.0.104.mjs'];
    const expectedRuntime=expandSourceCommands(scripts,'test:ravscore-integrated-public');
    const expectedUpdater=[...expandSourceCommands(scripts,'test:weather-source-critical').filter(command=>command.startsWith('node ')).flatMap(command=>
        command.includes('scripts/test-current-operational-python-contracts.mjs')&&command.includes('scripts/test-weather-component-normal-wireup.mjs')
          ?[command.replace(' scripts/test-weather-component-normal-wireup.mjs',''),'node --test scripts/test-weather-component-normal-wireup.mjs']:[command]),
      expandSourceCommands(scripts,'test:ravscore-source-critical').find(command=>command.startsWith('node --test scripts/test-ravscore-integrated-generator.mjs ')),
      'node scripts/test-ravscore-production-adapters.mjs','node scripts/test-runtime-diagnostics-envelope-4.0.234.mjs',
      'node scripts/test-admin-config-production-contract-4.0.94.mjs',
      expandSourceCommands(scripts,'test:provider-continuity').find(command=>command.startsWith('node --test scripts/test-weather-component-runtime.mjs '))];
    assert.equal(expectedUpdater.length,20);assert(expectedUpdater.every(Boolean));
    assert(expectedUpdater.includes('node --test scripts/test-weather-component-normal-wireup.mjs'));
    const once=['scripts/test-current-operational-python-contracts.mjs','scripts/test-dmi-bulk-forecast-integration.mjs',
      'scripts/test-weather-component-normal-wireup.mjs','scripts/test-dmi-protected-tuple-continuity.mjs','scripts/test-protected-live-current-assembly.mjs'];
    for(const file of once)assert.equal(expectedUpdater.flatMap(command=>command.split(' ')).filter(word=>word===file).length,1,
      'Each normal file runs once, with the recognized solo scalar preparation');
    assert.deepEqual(CURRENT_CONTRACT_COMMANDS.waterSourceRouting,expectedWater);
    assert.deepEqual(CURRENT_CONTRACT_COMMANDS.runtimeAudit,expectedRuntime);
    assert.deepEqual(CURRENT_CONTRACT_COMMANDS.weatherUpdater,expectedUpdater);
    assert(expectedRuntime.includes('node scripts/test-ravscore-integrated-public-runtime-audit.mjs'));
    const expectedHistoricalUpdater=[
      expectedUpdater.find(command=>command.startsWith('node --test scripts/test-ravscore-integrated-generator.mjs ')),
      'node --test scripts/test-weather-update-entrypoint.mjs',
      'node scripts/test-weather-history-retention-4.0.209.mjs',
      'node --test scripts/test-audit-saved-weather-inputs.mjs',
    ];
    assert(expectedHistoricalUpdater.every(Boolean));
    assert.deepEqual(CURRENT_CONTRACT_COMMANDS.historicalUpdaterOracles,expectedHistoricalUpdater);
    const historicalUpdaterOwners={
      'scripts/lib/archived-weather-restart-updater-test-input.mjs':expectedHistoricalUpdater,
      'scripts/test-post-h0-dmi-original-dependencies.mjs':[expectedHistoricalUpdater[0]],
      'scripts/test-ravscore-initial-current-window-audit.mjs':[expectedHistoricalUpdater[0]],
      'scripts/test-ravscore-integrated-generator.mjs':[expectedHistoricalUpdater[0]],
      'scripts/test-ravscore-recovery-replay.mjs':[expectedHistoricalUpdater[0]],
      'scripts/test-weather-update-entrypoint.mjs':[expectedHistoricalUpdater[1]],
      'scripts/test-weather-history-retention-4.0.209.mjs':[expectedHistoricalUpdater[2]],
    };
    const ownerAreas={
      'scripts/lib/water-source-forecast-routing.mjs':['waterSourceRouting','runtimeAudit'],
      'scripts/test-water-source-forecast-routing-4.0.100.mjs':['waterSourceRouting'],
      'scripts/test-water-source-production-chain-4.0.103.mjs':['waterSourceRouting'],
      'scripts/audit-ravscore-integrated-public-runtime.mjs':['runtimeAudit'],
      'scripts/test-ravscore-integrated-public-runtime-audit.mjs':['runtimeAudit'],
      'scripts/update-weather.mjs':['waterSourceRouting','weatherUpdater','runtimeAudit'],
    };
    const paths=Object.keys(ownerAreas),bytes=new Map(paths.map(file=>[file,fixtureControlBytes(file)]));
    const run=(before,after)=>{pointHead(after);return plan({baselineCommit:before,candidateCommit:after,expectedHead:after});};
    // A closed current Git child covers every owner plus normal docs/controls.
    // This does not depend on a previous release/head or fabricate a baseline.
    const budgetFiles=[...paths,...Object.keys(historicalUpdaterOwners),'CHANGELOG.md','scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs'];
    const budgetChanges=budgetFiles.map(file=>[file,Buffer.concat([bytes.get(file)??fixtureControlBytes(file),
      Buffer.from('\n// Synthetic bounded owner-budget delta\n')])]);
    const prior=seed,budgetHead=commit(rewrite(seedTree,budgetChanges),[seed],'synthetic complete current weather owner budget');
    const budgetPlan=run(prior,budgetHead);
    assert.equal(budgetPlan.selection,'CURRENT_CONTRACTS',JSON.stringify(budgetPlan));
    assert(budgetPlan.commands.length<=128);assert.equal(Object.keys(budgetPlan.areas).length<=32,true);
    const beforeTree=text(root,['rev-parse',prior+'^{tree}']),repository='jakobjorgensen82-commits/RavRadar',max=Number.MAX_SAFE_INTEGER;
    // Existing FULL/frontier header format, with conservative maximum numeric
    // widths and fixed-width digest DATA solely for byte budgeting. No receipt,
    // command result or externally qualified baseline is manufactured here.
    const fullBaseline={schemaVersion:1,kind:'RAVRADAR_SOURCE_IMPACT_FULL_BASELINE_V1',scope:'FULL_SOURCE',
      repository,mergeCommit:prior,producerHead:prior,gitTree:beforeTree,sourceTreeSha256:'sha256:'+'a'.repeat(64),
      pullRequest:max,runId:max,runAttempt:1,jobId:max,finalArtifactId:max,finalArtifactDigest:'sha256:'+'b'.repeat(64),
      finalProofSha256:'c'.repeat(64),nativeArtifactId:max,nativeArtifactDigest:'sha256:'+'d'.repeat(64),
      historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false};
    const current={repository,head:budgetHead,sourceTreeSha256:'sha256:'+'e'.repeat(64),pullRequest:max,
      runId:max-1,runAttempt:1,jobId:max};
    const capacity=receipt.assertCurrentChangeReceiptCapacity({current,fullBaseline,
      changeBase:{commit:prior,gitTree:beforeTree,pullBaseCommit:prior},currentPlan:budgetPlan,cumulativePlan:budgetPlan,
      frontier:{schemaVersion:1,kind:'QUALIFIED_CHANGE_FRONTIER',mode:'FULL',repository,commit:prior,gitTree:beforeTree,
        sourceTreeSha256:fullBaseline.sourceTreeSha256,sourceRecord:null,sourceProofTime:null,missingReason:'MISSING'}});
    assert.equal(capacity.receiptCreated,false);assert.equal(capacity.actualCommandResults,false);
    console.log(JSON.stringify({kind:'WEATHER_OPERATION_RECEIPT_PREFLIGHT',commands:budgetPlan.commands.length,
      maximumCommands:128,areas:Object.keys(budgetPlan.areas).length,maximumAreas:32,...capacity,scopeCasesStarted:0}));
    let checked=0;
    const positive=(selected,wanted,commands=null)=>{
      assert.equal(selected.status,'PLANNED');assert.equal(selected.selection,'CURRENT_CONTRACTS');
      assert.equal(selected.controlQualificationRequired,true);
      assert.deepEqual(selected.protectedInputs,{postgresUnchanged:true,CUnchanged:true,IUnchanged:true,TUnchanged:true});
      const areas=['core',...Object.keys(CURRENT_CONTRACT_COMMANDS).filter(area=>wanted.includes(area))];
      assert.deepEqual(Object.keys(selected.areas),areas);
      assert.deepEqual(selected.commands,commands??[...new Set(areas.flatMap(area=>CURRENT_CONTRACT_COMMANDS[area]))]);checked++;
    };
    const select=(files,label,extra=[])=>{
      const changes=files.map(file=>[file,Buffer.concat([bytes.get(file)??fixtureControlBytes(file),Buffer.from('\n// Synthetic permanent weather owner delta\n')])]);
      const child=commit(rewrite(seedTree,[...changes,...extra]),[seed],label);return run(seed,child);
    };
    for(const [file,areas]of Object.entries(ownerAreas)){
      positive(select([file],'synthetic single natural weather owner'),areas);
    }
    positive(select(paths,'synthetic combined natural weather owners'),['waterSourceRouting','weatherUpdater','runtimeAudit']);
    const mixed=select([...paths,'CHANGELOG.md','scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs'],
      'synthetic mixed documentation and owner controls');
    assert.equal(mixed.selection,'CURRENT_CONTRACTS');assert.equal(mixed.controlQualificationRequired,true);
    assert.deepEqual(mixed.areas.sourceControls.commands,sourceControlCommandsForChangedInputs([
      {path:'scripts/source-current-contract-plan.mjs',status:'M',beforeMode:'100644',afterMode:'100644'},
      {path:'scripts/test-source-current-contracts.mjs',status:'M',beforeMode:'100644',afterMode:'100644'}]));
    assert.equal(mixed.commands.length,new Set(mixed.commands).size);checked++;
    for(const [file,reason]of [['scripts/unclassified-weather-operation.mjs','CURRENT_UNCLASSIFIED_PATH'],
      ['js/core/ravscore-regime-memory.js','CURRENT_INPUT_ANALYSIS_INCOMPLETE']]){
      const original=file.startsWith('js/')?git(root,['cat-file','blob',seed+':'+file]):Buffer.from('// Unknown adjacent source\n');
      const rejected=select([paths[0]],'synthetic unsafe weather neighbour',[[file,Buffer.concat([original,Buffer.from('\n// Synthetic delta\n')])]]);
      assert.equal(rejected.selection,'FULL');assert.deepEqual(rejected.commands,[]);assert.deepEqual(rejected.reasonCodes,[reason]);
      assert.equal(rejected.authority,'PLANNING_ONLY');
      for(const key of ['baselineQualified','skipAuthorized','productionAuthority'])assert.equal(rejected[key],false);checked++;
    }
    const updater='scripts/update-weather.mjs';
    git(root,['read-tree',seedTree]);git(root,['update-index','--force-remove','--',updater]);
    const absentTree=text(root,['write-tree']),absent=commit(absentTree,[seed],'synthetic absent normal updater');
    const added=commit(seedTree,[absent],'synthetic newly added normal updater');
    const blob=text(root,['rev-parse',seed+':'+updater]);git(root,['read-tree',seedTree]);
    git(root,['update-index','--cacheinfo','100755,'+blob+','+updater]);
    const executable=commit(text(root,['write-tree']),[seed],'synthetic executable updater mode');
    for(const [before,after]of [[seed,absent],[absent,added],[seed,executable]]){
      const rejected=run(before,after);assert.equal(rejected.selection,'FULL');assert.deepEqual(rejected.commands,[]);
      assert.deepEqual(rejected.reasonCodes,['CURRENT_WEATHER_OPERATION_REQUIRES_EXISTING_REGULAR_SOURCE']);
      assert.equal(rejected.authority,'PLANNING_ONLY');
      for(const key of ['baselineQualified','skipAuthorized','productionAuthority'])assert.equal(rejected[key],false);checked++;
    }
    // BEGIN FOCUSED HISTORICAL UPDATER OWNER CASES
    const historicalCaseStart=checked;
    for(const [file,commands]of Object.entries(historicalUpdaterOwners)){
      positive(select([file],'synthetic single historical updater input owner'),['historicalUpdaterOracles'],
        [...CURRENT_CONTRACT_COMMANDS.core,...commands]);
    }
    const helper='scripts/lib/archived-weather-restart-updater-test-input.mjs';
    const allHistorical=select(Object.keys(historicalUpdaterOwners),'synthetic complete historical updater owners');
    positive(allHistorical,['historicalUpdaterOracles'],
      [...CURRENT_CONTRACT_COMMANDS.core,...expectedHistoricalUpdater]);
    assert.equal(allHistorical.commands.length,new Set(allHistorical.commands).size);
    const historicalMixed=select([...Object.keys(historicalUpdaterOwners),'CHANGELOG.md',
      'scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs'],
      'synthetic historical input owners with documentation and controls');
    assert.equal(historicalMixed.selection,'CURRENT_CONTRACTS');
    assert.equal(historicalMixed.controlQualificationRequired,true);
    assert.deepEqual(historicalMixed.areas.historicalUpdaterOracles.commands,expectedHistoricalUpdater);
    assert.equal(historicalMixed.commands.length,new Set(historicalMixed.commands).size);checked++;
    const unsafeHistorical=(selected)=>{
      assert.equal(selected.selection,'FULL');assert.deepEqual(selected.commands,[]);
      assert.equal(selected.authority,'PLANNING_ONLY');
      for(const key of ['baselineQualified','skipAuthorized','productionAuthority'])assert.equal(selected[key],false);checked++;
    };
    unsafeHistorical(select([helper],'synthetic unknown historical helper neighbour',[
      ['scripts/lib/unclassified-historical-updater-input.mjs',Buffer.from('// Unknown adjacent helper\n')]]));
    for(const file of ['js/core/ravscore-regime-memory.js','supabase/schema.sql']){
      const original=git(root,['cat-file','blob',seed+':'+file]);
      unsafeHistorical(select([helper],'synthetic protected historical helper neighbour',
        [[file,Buffer.concat([original,Buffer.from('\n// Synthetic protected drift\n')])]]));
    }
    for(const file of [helper,'scripts/test-weather-update-entrypoint.mjs']){
      git(root,['read-tree',seedTree]);git(root,['update-index','--force-remove','--',file]);
      const absentTree=text(root,['write-tree']),absent=commit(absentTree,[seed],'synthetic absent historical updater input');
      const added=commit(seedTree,[absent],'synthetic newly added historical updater input');
      const blob=text(root,['rev-parse',seed+':'+file]);git(root,['read-tree',seedTree]);
      git(root,['update-index','--cacheinfo','100755,'+blob+','+file]);
      const executable=commit(text(root,['write-tree']),[seed],'synthetic executable historical updater input');
      for(const [before,after]of [[seed,absent],[absent,added],[seed,executable]])unsafeHistorical(run(before,after));
    }
    console.log(JSON.stringify({kind:'FOCUSED_HISTORICAL_UPDATER_OWNER_SELECTION_CASES',cases:checked-historicalCaseStart,
      normalWholeCommands:expectedHistoricalUpdater.length,realIsolatedGit:true,actualTargetProcesses:0,
      modelsAndSqlExecuted:false,wholeCurrentExecuted:false,independentReviewRequired:true,production:false}));
    // END FOCUSED HISTORICAL UPDATER OWNER CASES
    console.log(JSON.stringify({kind:'FOCUSED_NEW_WEATHER_OWNER_SELECTION_CASES',cases:checked,passed:checked,
      realIsolatedGit:true,modelsAndSqlExecuted:false,wholeCurrentExecuted:false,production:false,
      expectedUpdaterCommands:20,expectedWaterCommands:4,expectedRuntimeCommands:5,
      wholeRuntimeAuditStillRequired:true,sourceInputProfile:budgetPlan.inputProfile.id}));
  }finally{
    assert.equal(path.dirname(fs.realpathSync(root)),temp);
    const current=fs.lstatSync(root,{bigint:true});
    assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
    fs.rmSync(root,{recursive:true,force:false});
  }
}
// END FOCUSED WEATHER OPERATION OWNER CASES
