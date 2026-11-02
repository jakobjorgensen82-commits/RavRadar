// SOURCE source-phase routing only. Never B/S/origin/SQL or producer admission.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SOURCE_PRODUCER_BINDING,requireSourceProducerBinding,requireSourceProducerOutput}
  from './lib/source-producer-successor-source.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';

// Pure caller checks, deliberately not an issued-source or data-admission proof.
// Stage/prewrite must independently require their own issued SOURCE output first.
export function assertSourceProducerCodeOnlyCaller(environment){
  assert.equal(arguments.length,1);
  assert(environment&&typeof environment==='object'&&!Array.isArray(environment));
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(environment.GITHUB_REF,'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');
  assert.match(environment.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);
  assert.match(environment.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert.equal(environment.GITHUB_WORKFLOW,'Deploy RavRadar code-only repair');
  const opted=environment.RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN;
  assert(['true','false'].includes(opted));
  assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_PHASE,opted==='true'?'before':'installed');
  assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_WRITER_ACTIVE,'false');
  assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_RECOVERY_GATE_RESULT,'success');
  assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_SAVED_WEATHER,'false');
  assert.equal(environment.RAVRADAR_SOURCE_PRODUCER_RECOVERY_RUN_ID,'');
  assert.equal(environment.RAVRADAR_SOURCE_NORMAL_PRODUCER,'false');
  assert.equal(environment.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN,'false');
  const historical=[
    'RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN','RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN',
    'RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN','RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN',
    'RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN','RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN',
    ...Object.keys(environment).filter(key=>key.endsWith('_UPGRADE_OPT_IN')
      &&key!=='RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN'),
  ];
  for(const key of new Set(historical))assert.notEqual(environment[key],'true',
    'SOURCE code-only selection cannot combine historical upgrade grants');
  for(const key of ['RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER',
    'COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION',
    'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP','RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY',
    'NATIVE_IDENTITY_RECOVERY'])assert.notEqual(environment[key],'true',
      'SOURCE code-only selection cannot combine alternative weather/recovery modes');
}

export async function selectSourceProducerCodeOnlySource(environment=process.env){
  assert(arguments.length<=1);
  const opted=environment.RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN;
  // The exact unissued/false branch leaves the old selector and its authority alone.
  if(SOURCE_PRODUCER_BINDING===null&&opted==='false')return false;
  requireSourceProducerOutput(); // FIRST before branch I/O or caller authority.
  const next=requireSourceProducerBinding();
  assertSourceProducerCodeOnlyCaller(environment);
  assert.equal(ravScoreModelBinding().modelBundleSha256,next.I);
  assert.equal(candidateBinding().modelBundleSha256,next.C);
  assert.equal(await ravScoreContinuationImplementationSha256(),next.T);
  assertSourceProducerCodeOnlyCaller(environment);
  return true;
}

async function main(){
  const active=await selectSourceProducerCodeOnlySource();
  assert.equal(process.argv.length,2);
  assert.equal(typeof process.env.GITHUB_ENV,'string');assert(process.env.GITHUB_ENV.length>0);
  await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE='+active+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await main().catch(()=>{console.error('SOURCE_PRODUCER_SOURCE_PHASE_REFUSED');process.exitCode=1;});
