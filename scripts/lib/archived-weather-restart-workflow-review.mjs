// TEST ONLY. Preserve the entire genuine old code-only oracle, never a runtime waiver.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {inverseArchivedProductionGate} from './archived-production-gate-review.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_WORKFLOW_SHA256,ACCOUNT_STATISTICS_ASSISTANT_OFF_WORKFLOW_SHA256,ACCOUNT_STATISTICS_ASSISTANT_STORAGE_WORKFLOW_SHA256,inverseAccountStatisticsAssistantWorkflow} from './account-statistics-assistant-workflow-review.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./archived-weather-restart-workflow-review.json',import.meta.url));
assert.equal(sha(bytes),'192f5696670ec1a84e82b5c58e065ff69f236d18d7b7e2d5b4cc8473d1a1a072');
const review=JSON.parse(bytes);
assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_ARCHIVED_WEATHER_RESTART_WORKFLOW_INVERSE');
assert.equal(review.role,'code-only-repair');assert.equal(review.edits.length,44);
export function inverseArchivedWeatherRestartWorkflow(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  if([ACCOUNT_STATISTICS_ASSISTANT_WORKFLOW_SHA256,ACCOUNT_STATISTICS_ASSISTANT_OFF_WORKFLOW_SHA256,ACCOUNT_STATISTICS_ASSISTANT_STORAGE_WORKFLOW_SHA256].includes(sha(source)))source=inverseAccountStatisticsAssistantWorkflow(source);
  if(sha(source)!==review.predecessorSha256)source=inverseArchivedProductionGate(source);
  const digest=sha(source);
  if(digest===review.predecessorSha256)return source;
  assert.equal(digest,review.actualSha256,'Unreviewed workflow cannot enter the historical oracle');
  let prior=source,last=Infinity;
  for(const [offset,actual,original]of review.edits){
    assert(Number.isSafeInteger(offset)&&offset>=0&&offset<last);last=offset;
    assert.equal(prior.slice(offset,offset+actual.length),actual,'Exact reviewed workflow inverse segment');
    prior=prior.slice(0,offset)+original+prior.slice(offset+actual.length);
  }
  assert.equal(sha(prior),review.predecessorSha256,'Every old workflow byte survives the complete inverse');
  return prior;
}
