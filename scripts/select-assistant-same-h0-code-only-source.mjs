// Fixed source-phase routing only. Never a B/S/origin/SQL admission receipt.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASSISTANT_SAME_H0_BINDING,requireAssistantSameH0Binding,requireAssistantSameH0Output}
  from './lib/assistant-same-h0-successor-source.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
export async function selectAssistantSameH0CodeOnlySource(environment=process.env){
  assert(arguments.length<=1);
  const opted=environment.RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN;
  if(ASSISTANT_SAME_H0_BINDING===null && opted==='false')return false;
  requireAssistantSameH0Output(); // FIRST before new branch I/O; no caller tuple can issue this.
  const next=requireAssistantSameH0Binding();
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN,'false');
  assert(['true','false'].includes(opted));
  assert.equal(ravScoreModelBinding().modelBundleSha256,next.I);
  assert.equal(candidateBinding().modelBundleSha256,next.C);
  assert.equal(await ravScoreContinuationImplementationSha256(),next.T);
  return true;
}
async function main(){
  const active=await selectAssistantSameH0CodeOnlySource();
  assert.equal(typeof process.env.GITHUB_ENV,'string');assert(process.env.GITHUB_ENV.length>0);
  await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_ASSISTANT_SAME_H0_SOURCE_ACTIVE='+active+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await main().catch(()=>{console.error('ASSISTANT_SAME_H0_SOURCE_PHASE_REFUSED');process.exitCode=1;});
