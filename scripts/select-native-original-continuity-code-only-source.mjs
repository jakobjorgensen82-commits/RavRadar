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
  const next=requireNativeOriginalContinuityBinding();assertNativeOriginalContinuityCodeOnlyCaller(environment);
  assert.equal(ravScoreModelBinding().modelBundleSha256,next.I);
  assert.equal(candidateBinding().modelBundleSha256,next.C);
  assert.equal(await ravScoreContinuationImplementationSha256(),next.T);
  assertNativeOriginalContinuityCodeOnlyCaller(environment);return true;
}
async function main(){
  assert.equal(process.argv.length,2);
  const active=await selectNativeOriginalContinuityCodeOnlySource();
  assert(typeof process.env.GITHUB_ENV==='string'&&process.env.GITHUB_ENV.length>0);
  await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_SOURCE_ACTIVE='+active+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await main().catch(()=>{console.error('NATIVE_ORIGINAL_CONTINUITY_SOURCE_PHASE_REFUSED');process.exitCode=1;});
