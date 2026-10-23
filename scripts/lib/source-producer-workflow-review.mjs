// TEST ONLY. Reconstruct the whole genuine pre-SOURCE caller before its
// unchanged storage/OFF/585 and older oracles. Never runtime/source admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./source-producer-workflow-review.json',import.meta.url));
assert.equal(sha(bytes),'2fd48655814f85a80faa65b96fd84da9d8086c904cea6f7cdfb593241a5d60e7');
const review=JSON.parse(bytes);
assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_SOURCE_PRODUCER_WORKFLOW_INVERSE');
assert.equal(review.role,'code-only-repair');
assert.equal(review.productionAuthority,false);
assert.equal(review.edits.length,46);
assert.equal(review.predecessorHead,'b2d4ba68c6e560c6e1f2335ea8ace604a6315da3');
assert.equal(review.predecessorTree,'d911b0ee27084194cba8bde59ff9540d8b164543');
export const SOURCE_PRODUCER_WORKFLOW_SHA256=review.actualSha256;
export const SOURCE_PRODUCER_WORKFLOW_PREDECESSOR_SHA256=review.predecessorSha256;
export function inverseSourceProducerWorkflow(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),review.actualSha256,'Only the exact reviewed SOURCE caller may enter its test-only inverse');
  let prior=source,hunk=47,last=Infinity;
  for(const edit of review.edits){
    assert.equal(edit.sourceHunk,--hunk);
    assert(Number.isSafeInteger(edit.offset)&&edit.offset>=0&&edit.offset<last);last=edit.offset;
    assert.match(edit.header,/^@@ -[0-9]+(?:,[0-9]+)? \+[0-9]+(?:,[0-9]+)? @@/);
    assert.equal(sha(prior),edit.beforeSha256,'Each complete SOURCE workflow input is pinned');
    assert.equal(prior.slice(edit.offset,edit.offset+edit.current.length),edit.current,'Exact whole Git-diff hunk at its original offset');
    prior=prior.slice(0,edit.offset)+edit.original+prior.slice(edit.offset+edit.current.length);
    assert.equal(sha(prior),edit.afterSha256,'Each complete inverse successor is pinned');
  }
  assert.equal(hunk,1);
  assert.equal(sha(prior),review.predecessorSha256,'Whole genuine b2/storage caller reconstructed, without changing an old pin');
  return prior;
}

// TEST ONLY. Exact reverse replay for the pinned historical SOURCE view.
export function forwardHistoricalSourceProducerWorkflow(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),review.predecessorSha256);
  let next=source,hunk=0;
  for(const edit of [...review.edits].reverse()){
    assert.equal(edit.sourceHunk,++hunk);
    assert.equal(sha(next),edit.afterSha256);
    assert.equal(next.slice(edit.offset,edit.offset+edit.original.length),edit.original);
    next=next.slice(0,edit.offset)+edit.current+next.slice(edit.offset+edit.original.length);
    assert.equal(sha(next),edit.beforeSha256);
  }
  assert.equal(hunk,46);assert.equal(sha(next),review.actualSha256);return next;
}
