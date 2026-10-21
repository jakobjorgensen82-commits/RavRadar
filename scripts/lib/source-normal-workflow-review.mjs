// TEST ONLY. Exact whole SOURCE ordinary callers -> genuine b2 callers.
// Not a source-compatibility waiver, runtime loader, publication or SAVE authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = fs.readFileSync(new URL('./source-normal-workflow-review.json', import.meta.url));
assert.equal(sha(bytes), '15f0d6090091c2b26289a2626eb240d9c10e76bf0360fb01d240c30712911d84');
const review = JSON.parse(bytes);
assert.equal(review.schemaVersion, 1);
assert.equal(review.kind, 'TEST_ONLY_EXACT_SOURCE_NORMAL_WORKFLOW_INVERSE');
assert.equal(review.productionAuthority, false);
assert.equal(review.predecessorHead, 'b2d4ba68c6e560c6e1f2335ea8ace604a6315da3');
assert.equal(review.predecessorTree, 'd911b0ee27084194cba8bde59ff9540d8b164543');
assert.deepEqual(Object.keys(review.roles), ['build', 'once']);
for (const [role, row] of Object.entries(review.roles)) {
  assert.equal(row.edits.length, role === 'build' ? 152 : 4);
  assert.equal(row.mode, '100644');
  row.edits.forEach(Object.freeze); Object.freeze(row.edits); Object.freeze(row);
}
Object.freeze(review.roles); Object.freeze(review);
export const SOURCE_NORMAL_WORKFLOW_REVIEW = review;
export function inverseSourceNormalWorkflow(source, role) {
  assert.equal(arguments.length, 2);
  assert.equal(typeof source, 'string');
  assert(Object.hasOwn(review.roles, role), 'Only the reviewed build/once roles');
  const row = review.roles[role];
  assert.equal(Buffer.byteLength(source), row.actualBytes, 'Whole SOURCE caller byte length');
  assert.equal(sha(source), row.actualSha256, 'Only the exact reviewed SOURCE caller may enter its test-only inverse');
  let prior = source, hunk = row.edits.length + 1, last = Infinity;
  for (const edit of row.edits) {
    assert.equal(edit.sourceHunk, --hunk);
    assert(Number.isSafeInteger(edit.offset) && edit.offset >= 0 && edit.offset < last); last = edit.offset;
    assert.match(edit.header, /^@@ -[0-9]+(?:,[0-9]+)? \+[0-9]+(?:,[0-9]+)? @@/);
    assert.equal(sha(edit.current), edit.currentSha256);
    assert.equal(sha(edit.original), edit.originalSha256);
    assert.equal(sha(prior), edit.beforeSha256, 'Every whole intermediate SOURCE input is pinned');
    assert.equal(prior.slice(edit.offset, edit.offset + edit.current.length), edit.current, 'Exact Git hunk and offset');
    prior = prior.slice(0, edit.offset) + edit.original + prior.slice(edit.offset + edit.current.length);
    assert.equal(sha(prior), edit.afterSha256, 'Every whole inverse successor is pinned');
  }
  assert.equal(hunk, 1);
  assert.equal(Buffer.byteLength(prior), row.predecessorBytes);
  assert.equal(sha(prior), row.predecessorSha256, 'Whole genuine b2 caller, including its release585 strings');
  return prior;
}
