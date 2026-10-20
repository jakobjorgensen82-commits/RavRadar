// TEST ONLY. Qualify the exact new caller before the unchanged P0 and historical oracles.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./account-statistics-assistant-workflow-review.json',import.meta.url));
assert.equal(sha(bytes),'2ba82cf4affe257162692ea34f570b16047db54c6a54f1aa53bc7ae8c5655a68');
const review=JSON.parse(bytes);
assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_ACCOUNT_STATISTICS_ASSISTANT_WORKFLOW_INVERSE');
assert.equal(review.role,'code-only-repair');assert.equal(review.edits.length,54);
export const ACCOUNT_STATISTICS_ASSISTANT_WORKFLOW_SHA256=review.actualSha256;
export function inverseAccountStatisticsAssistantWorkflow(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
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
