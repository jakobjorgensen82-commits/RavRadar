// Fixed controller phase only. No B/S/origin/SQL authority from a flag.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NATIVE_ORIGINAL_CONTINUITY_BINDING,requireNativeOriginalContinuityBinding,requireNativeOriginalContinuityOutput}
  from './lib/native-original-continuity-successor-source.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';

// Current source selection is not installed-DB/B/S/SQL admission. Historical
// controllers remain issued, but cannot become current merely by being nonnull.
export async function selectCurrentInstalledCodeOnlySource(environment=process.env){
  assert(arguments.length<=1);ACTIVE.requireOutput();
  const current=ACTIVE.requireBinding();ACTIVE.requireRelease();
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(environment.GITHUB_REF,'refs/heads/main');assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');
  assert.match(environment.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);
  assert.match(environment.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert.equal(environment.GITHUB_WORKFLOW,'Deploy RavRadar code-only repair');
  assert.equal(environment.CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_WRITER_ACTIVE,'false');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_GATE_RESULT,'success');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_RUN_ID,'');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_SAVED_WEATHER,'false');
  for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN',
    'RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN','UPGRADE_EXISTING_OWNER_EXPORT',
    'UPGRADE_ACCOUNT_ASSISTANT','UPGRADE_STATISTICS_REVISION','UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',
    'UPGRADE_LAST_MILE_ENCLOSURE','UPGRADE_ACCOUNT_STATISTICS_ASSISTANT','UPGRADE_NATIVE_ORIGINAL_CONTINUITY',
    'RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER','COMPLETED_PRIVATE_RUNTIME',
    'CHECKPOINT_ONLY','QUICK_CONFIRMATION','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY'])
    assert.equal(environment[key],'false','Current installed code-only cannot acquire an upgrade/recovery grant');
  for(const key of ['RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN',
    'RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN','RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN'])
    assert(environment[key]===undefined||environment[key]==='false','No historical upgrade scope');
  assert.equal(ravScoreModelBinding().modelBundleSha256,current.I);
  assert.equal(candidateBinding().modelBundleSha256,current.C);
  assert.equal(await ravScoreContinuationImplementationSha256(),current.T);
  return Object.freeze({sourcePhase:ACTIVE.sourcePhase,migrationVersion:current.version});
}

export async function verifyCurrentInstalledCodeOnlyPlan(options){
  assert.equal(arguments.length,1);
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['dryRunText','environment','migrationListText','migrationsDirectory']);
  await selectCurrentInstalledCodeOnlySource(options.environment);
  const {assertSupabaseMigrationPlan,assertSupabaseMigrationsApplied,DEFAULT_CUTOVER_SOURCE_PHASE}
    =await import('./integrated-cutover-readiness.mjs');
  assert.equal(DEFAULT_CUTOVER_SOURCE_PHASE,ACTIVE.sourcePhase);
  const plan=await assertSupabaseMigrationPlan({migrationListText:options.migrationListText,
    dryRunText:options.dryRunText,migrationsDirectory:options.migrationsDirectory});
  assert.deepEqual(plan.pendingVersions,[],'Current code-only may only read already-installed SQL');
  assertSupabaseMigrationsApplied(options.migrationListText);
  return plan;
}
export function assertNativeOriginalContinuityCodeOnlyCaller(environment){
  assert.equal(arguments.length,1);
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(environment.GITHUB_REF,'refs/heads/main');assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');
  assert.match(environment.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);assert.match(environment.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert.equal(environment.GITHUB_WORKFLOW,'Deploy RavRadar code-only repair');
  const opted=environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN;
  assert(['true','false'].includes(opted));
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_PHASE,opted==='true'?'before':'installed');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_WRITER_ACTIVE,'false');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_GATE_RESULT,'success');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_SAVED_WEATHER,'false');
  assert.equal(environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_RUN_ID,'');
  for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN','RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN',
    'RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN','RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN',
    'RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN','RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN',
    'RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN'])
    assert.notEqual(environment[key],'true','Native continuity cannot combine historical upgrade grants');
  for(const key of ['RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER','COMPLETED_PRIVATE_RUNTIME',
    'CHECKPOINT_ONLY','QUICK_CONFIRMATION','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY'])
    assert.notEqual(environment[key],'true','Native continuity cannot combine weather/recovery modes');
}
export async function selectNativeOriginalContinuityCodeOnlySource(environment=process.env){
  assert(arguments.length<=1);
  const opted=environment.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN;
  if(NATIVE_ORIGINAL_CONTINUITY_BINDING===null&&opted==='false')return false;
  requireNativeOriginalContinuityOutput();
  const next=requireNativeOriginalContinuityBinding();
  if(ravScoreModelBinding().modelBundleSha256!==next.I&&opted==='false'){
    await selectCurrentInstalledCodeOnlySource(environment);return false;
  }
  assertNativeOriginalContinuityCodeOnlyCaller(environment);
  assert.equal(ravScoreModelBinding().modelBundleSha256,next.I);
  assert.equal(candidateBinding().modelBundleSha256,next.C);
  assert.equal(await ravScoreContinuationImplementationSha256(),next.T);
  assertNativeOriginalContinuityCodeOnlyCaller(environment);return true;
}
async function main(){
  if(process.argv[2]==='--current-installed'){
    assert.equal(process.argv.length,3);await selectCurrentInstalledCodeOnlySource();
    assert(typeof process.env.GITHUB_ENV==='string'&&process.env.GITHUB_ENV.length>0);
    await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_CURRENT_INSTALLED_CODE_ONLY_SOURCE_ACTIVE=true\n');return;
  }
  if(process.argv[2]==='--verify-current-installed-plan'){
    const keys=['--migration-list','--dry-run','--migrations-directory'],args=process.argv.slice(3),values={};
    assert.equal(args.length,6);
    for(let i=0;i<args.length;i+=2){assert(keys.includes(args[i])&&!Object.hasOwn(values,args[i]));
      assert(args[i+1]&&!args[i+1].startsWith('--'));values[args[i]]=args[i+1];}
    await selectCurrentInstalledCodeOnlySource();
    await verifyCurrentInstalledCodeOnlyPlan({environment:process.env,
      migrationListText:await fs.readFile(values['--migration-list'],'utf8'),
      dryRunText:await fs.readFile(values['--dry-run'],'utf8'),
      migrationsDirectory:path.resolve(values['--migrations-directory'])});return;
  }
  assert.equal(process.argv.length,2);
  const active=await selectNativeOriginalContinuityCodeOnlySource();
  assert(typeof process.env.GITHUB_ENV==='string'&&process.env.GITHUB_ENV.length>0);
  await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_SOURCE_ACTIVE='+active+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await main().catch(()=>{console.error('NATIVE_ORIGINAL_CONTINUITY_SOURCE_PHASE_REFUSED');process.exitCode=1;});
