// TEST ONLY. Whole current587/native/P0 preservation, never production admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {inverseNativeOriginalContinuityWorkflow} from './native-original-continuity-workflow-review.mjs';
import {forwardHistoricalSourceProducerWorkflow,SOURCE_PRODUCER_WORKFLOW_SHA256} from './source-producer-workflow-review.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./source-producer-current-workflow-review.json',import.meta.url));
assert.equal(sha(bytes),'9d3c660d866ebdc0b45975416b4d978f3cbe2f3dc6f0e710a982327fd8e3bd7e');
const review=JSON.parse(bytes);
assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_CURRENT_SOURCE_WORKFLOW_INVERSE');
assert.equal(review.role,'code-only-repair');assert.equal(review.productionAuthority,false);
assert.equal(review.edits.length,57);
assert.equal(review.predecessorHead,'664aeb46966cd0ec182599a90bcaacc6c4b609ab');
assert.equal(review.predecessorTree,'65f3fdb129fe28c9675c9d177067beb155deb60a');
export const SOURCE_PRODUCER_CURRENT_WORKFLOW_SHA256=review.actualSha256;
export const SOURCE_PRODUCER_CURRENT_PREDECESSOR_SHA256=review.predecessorSha256;
export function inverseCurrentSourceProducerWorkflow(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),review.actualSha256,'Only the whole reviewed current SOURCE caller');
  let previous=source;
  for(const edit of review.edits){
    assert(Number.isSafeInteger(edit.offset)&&edit.offset>=0);
    assert.equal(sha(previous),edit.beforeSha256);
    assert.equal(previous.slice(edit.offset,edit.offset+edit.current.length),edit.current);
    previous=previous.slice(0,edit.offset)+edit.original+previous.slice(edit.offset+edit.current.length);
    assert.equal(sha(previous),edit.afterSha256);
  }
  assert.equal(sha(previous),review.predecessorSha256,'Every current native/P0 workflow byte survives');
  return previous;
}
export function historicalSourceProducerWorkflowView(source){
  assert.equal(arguments.length,1);
  const current=inverseCurrentSourceProducerWorkflow(source);
  const old=forwardHistoricalSourceProducerWorkflow(inverseNativeOriginalContinuityWorkflow(current));
  assert.equal(sha(old),SOURCE_PRODUCER_WORKFLOW_SHA256);return old;
}
