// Fixed source-phase routing only. Never a B/S/origin/SQL admission receipt.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ACCOUNT_STATISTICS_ASSISTANT_BINDING,requireAccountStatisticsAssistantBinding,requireAccountStatisticsAssistantOutput}
  from './lib/account-statistics-assistant-successor-source.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
export async function selectAccountStatisticsAssistantCodeOnlySource(environment=process.env){
  assert(arguments.length<=1);
  const opted=environment.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN;
  if(ACCOUNT_STATISTICS_ASSISTANT_BINDING===null && opted==='false')return false;
  requireAccountStatisticsAssistantOutput(); // FIRST before new branch I/O; no caller tuple can issue this.
  const next=requireAccountStatisticsAssistantBinding();
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN,'false');
  assert.equal(environment.RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN,'false');
  assert.notEqual(environment.RESTART_ARCHIVED_WEATHER,'true');
  assert(['true','false'].includes(opted));
  assert.equal(ravScoreModelBinding().modelBundleSha256,next.I);
  assert.equal(candidateBinding().modelBundleSha256,next.C);
  assert.equal(await ravScoreContinuationImplementationSha256(),next.T);
  return true;
}
async function main(){
  const active=await selectAccountStatisticsAssistantCodeOnlySource();
  assert.equal(typeof process.env.GITHUB_ENV,'string');assert(process.env.GITHUB_ENV.length>0);
  await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_SOURCE_ACTIVE='+active+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await main().catch(()=>{console.error('ACCOUNT_STATISTICS_ASSISTANT_SOURCE_PHASE_REFUSED');process.exitCode=1;});
