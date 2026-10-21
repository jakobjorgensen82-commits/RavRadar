// TEST ONLY. One complete reviewed native-original workflow layer, not runtime authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./native-original-continuity-workflow-review.json',import.meta.url));
assert.equal(sha(bytes),'2ae3fa9b4e7c4a4a4d85c22a510b29cc3d7fdb76134f5786cd81155847ea9662');
const review=JSON.parse(bytes);
assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_NATIVE_ORIGINAL_CONTINUITY_WORKFLOW_INVERSE');
assert.equal(review.role,'code-only-repair');assert.equal(review.edits.length,33);
export const NATIVE_ORIGINAL_CONTINUITY_WORKFLOW_SHA256=review.actualSha256;
export function inverseNativeOriginalContinuityWorkflow(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert.equal(sha(source),review.actualSha256,'Unknown native-original workflow cannot enter a frozen oracle');
  let prior=source;
  for(const edit of review.edits){
    assert.equal(sha(prior),edit.beforeSha256,'Exact whole input before each additive native layer inverse');
    assert.equal(prior.split(edit.current).length-1,edit.count,'All and only reviewed exact native hunks');
    prior=prior.split(edit.current).join(edit.original);
    assert.equal(sha(prior),edit.afterSha256,'Exact whole predecessor after each additive native layer inverse');
  }
  assert.equal(sha(prior),review.predecessorSha256,'Every genuine585 workflow byte survives unchanged');
  return prior;
}
