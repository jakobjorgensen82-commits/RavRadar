// TEST ONLY. Qualify the exact new caller before the unchanged P0 and historical oracles.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {SOURCE_PRODUCER_WORKFLOW_SHA256,inverseSourceProducerWorkflow}
  from './source-producer-workflow-review.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./account-statistics-assistant-workflow-review.json',import.meta.url));
assert.equal(sha(bytes),'2ba82cf4affe257162692ea34f570b16047db54c6a54f1aa53bc7ae8c5655a68');
const review=JSON.parse(bytes);
assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_ACCOUNT_STATISTICS_ASSISTANT_WORKFLOW_INVERSE');
assert.equal(review.role,'code-only-repair');assert.equal(review.edits.length,54);
export const ACCOUNT_STATISTICS_ASSISTANT_WORKFLOW_SHA256=review.actualSha256;
export const ACCOUNT_STATISTICS_ASSISTANT_OFF_WORKFLOW_SHA256='5bd146c570f3413e3f9cb4e687975c8ec05f61f5fa2232ef6f9de19437b16a9f';
export const ACCOUNT_STATISTICS_ASSISTANT_STORAGE_WORKFLOW_SHA256='c60f65d52663525fb01095b87888e9385fa886b6d7d9cc38af788e08ad1d5435';
// Only the existing R2 transport credentials are wired to the original reader.
// Remove precisely those three lines to recover the whole qualified OFF caller.
export function inverseAccountStatisticsAssistantStorageTransport(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),ACCOUNT_STATISTICS_ASSISTANT_STORAGE_WORKFLOW_SHA256,'Only the exact original-storage caller may enter this inverse');
  const heading='      - name: Select actual CURRENT family and restore only genuine original584 if needed\n';
  const start=source.indexOf(heading),end=source.indexOf('\n      - name:',start+heading.length);
  assert(start>=0&&end>start);assert.equal(source.indexOf(heading,start+heading.length),-1);
  const lines=['          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n',
    '          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n',
    '          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n'].join('');
  const current=source.slice(start,end);assert.equal(current.split(lines).length,2);
  const prior=source.slice(0,start)+current.replace(lines,'')+source.slice(end);
  assert.equal(sha(prior),ACCOUNT_STATISTICS_ASSISTANT_OFF_WORKFLOW_SHA256,'Whole qualified OFF workflow survives storage wiring');
  return prior;
}
// Qualify ONLY the reviewed two-symbol OFF-caller correction. The old 54-hunk
// descriptor and its genuine input/output remain physically unchanged.
export function inverseAccountStatisticsAssistantOffAttestation(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),ACCOUNT_STATISTICS_ASSISTANT_OFF_WORKFLOW_SHA256,'Only the exact live-OFF caller may enter this inverse');
  const heading='      - name: Require the exact new Worker and explicit aggregate OFF binding\n';
  const start=source.indexOf(heading),end=source.indexOf('\n      - name:',start+heading.length);
  assert(start>=0&&end>start);assert.equal(source.indexOf(heading,start+heading.length),-1);
  const current=source.slice(start,end);let prior=current;
  for(const [actual,original]of [
    ["import {verifyExistingWorkerBindings} from './scripts/verify-cloudflare-trip-gateway.mjs';","import {verifyActiveWorkerDeployment} from './scripts/verify-cloudflare-trip-gateway.mjs';"],
    ['await verifyExistingWorkerBindings({expectedBindings:config.d1_databases,','await verifyActiveWorkerDeployment({expectedBindings:config.d1_databases,'],
  ]){assert.equal(prior.split(actual).length,2,'Exactly one reviewed OFF symbol');prior=prior.replace(actual,original);}
  prior=source.slice(0,start)+prior+source.slice(end);
  assert.equal(sha(prior),review.actualSha256,'Whole genuine pre-fix585 workflow restored');return prior;
}
export function inverseAccountStatisticsAssistantWorkflow(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  if(sha(source)===SOURCE_PRODUCER_WORKFLOW_SHA256)source=inverseSourceProducerWorkflow(source);
  if(sha(source)===ACCOUNT_STATISTICS_ASSISTANT_STORAGE_WORKFLOW_SHA256)source=inverseAccountStatisticsAssistantStorageTransport(source);
  if(sha(source)===ACCOUNT_STATISTICS_ASSISTANT_OFF_WORKFLOW_SHA256)source=inverseAccountStatisticsAssistantOffAttestation(source);
  if(sha(source)===review.predecessorSha256)return source;
  assert.equal(sha(source),review.actualSha256,'Unreviewed new workflow cannot enter the P0 or old oracle');
  let prior=source,sourceHunk=55;
  for(const edit of review.edits){
    assert.equal(edit.sourceHunk,--sourceHunk);
    assert(Number.isSafeInteger(edit.offset)&&edit.offset>=0);
    assert.equal(sha(prior),edit.beforeSha256,'Every staged whole-workflow input is exact');
    assert.equal(prior.slice(edit.offset,edit.offset+edit.current.length),edit.current,'Exact new caller inverse segment');
    prior=prior.slice(0,edit.offset)+edit.original+prior.slice(edit.offset+edit.current.length);
    assert.equal(sha(prior),edit.afterSha256,'Every staged whole-workflow predecessor is exact');
  }
  assert.equal(sourceHunk,1);
  assert.equal(sha(prior),review.predecessorSha256,'Every actual P0 workflow byte survives the new whole inverse');
  return prior;
}
