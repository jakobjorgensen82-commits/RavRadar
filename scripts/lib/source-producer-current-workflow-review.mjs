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

// TEST ONLY actual588 port. Exact new images are first projected to their
// unchanged whole historical6649 images; no projection is imported as runtime.
const actual588Bytes=fs.readFileSync(new URL('./source-producer-actual588-test-review.json',import.meta.url));
assert.equal(sha(actual588Bytes),'f5fc34d830df7677a434478936981714ae369191ededc8de90f952cf4228e59d');
const actual588Review=JSON.parse(actual588Bytes);
export const ACTUAL588_SOURCE_PRODUCER_WORKFLOW_SHA256=actual588Review.roles.workflow.actualSha256;
assert.equal(actual588Review.kind,'TEST_ONLY_EXACT_ACTUAL588_SOURCE_HISTORICAL_VIEWS');
assert.equal(actual588Review.productionAuthority,false);
assert.deepEqual(Object.keys(actual588Review.roles),['workflow','reconcile','sync']);
function historicalActual588Source(source,role){
  assert.equal(typeof source,'string');assert(['workflow','reconcile','sync'].includes(role));
  const profile=actual588Review.roles[role];assert.equal(sha(source),profile.actualSha256);
  let prior=source,last=Infinity;
  for(const edit of profile.edits){
    assert(Number.isSafeInteger(edit.offset)&&edit.offset>=0&&edit.offset<last);last=edit.offset;
    assert.equal(sha(prior),edit.beforeSha256);
    assert.equal(prior.slice(edit.offset,edit.offset+edit.current.length),edit.current);
    prior=prior.slice(0,edit.offset)+edit.original+prior.slice(edit.offset+edit.current.length);
    assert.equal(sha(prior),edit.afterSha256);
  }
  assert.equal(sha(prior),profile.historicalSha256);return prior;
}
export function sourceBeforeActual588WorkflowView(source){
  assert.equal(arguments.length,1);return historicalActual588Source(source,'workflow');
}
export function sourceBeforeActual588ReconcileView(source){
  assert.equal(arguments.length,1);return historicalActual588Source(source,'reconcile');
}
export function sourceBeforeActual588SyncView(source){
  assert.equal(arguments.length,1);
  // TEST ONLY: the chosen full589 default is projected to the exact prior
  // explicit-phase image before its unchanged whole historical inverse.
  assert.equal(sha(source),'c96e8c874b65712e62cab4374ddf74856936bd32a93b8e0609996f229b1bde40');
  const current="// Full589 promotion only; UNISSUED SOURCE refuses before any normal sync I/O.\nconst DEFAULT_SYNC_SOURCE_PHASE = 'source-producer';",previous="// Kept on actual588 until ROOT separately reviews a full589 default promotion.\nconst DEFAULT_SYNC_SOURCE_PHASE = ACTIVE.sourcePhase;";
  assert.equal(source.split(current).length,2);
  const explicit=source.replace(current,()=>previous);
  assert.equal(sha(explicit),'057f9d37c53e807f5f8ec1d1a5c5d1bf9ffd1edc1dd8fbfa2a841cc037a5a787');
  return historicalActual588Source(explicit,'sync');
}
export function inverseActual588SourceProducerWorkflow(source){
  assert.equal(arguments.length,1);
  return inverseCurrentSourceProducerWorkflow(sourceBeforeActual588WorkflowView(source));
}
