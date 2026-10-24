// TEST ONLY. Exact whole SOURCE ordinary callers -> the exact newer P0/587 callers plus observed588 synchronization.
// Not a source-compatibility waiver, runtime loader, publication or SAVE authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = fs.readFileSync(new URL('./source-normal-workflow-review.json', import.meta.url));
assert.equal(sha(bytes), 'a302aacaa9348bc10d7dcd16fc37d35a225da12fd36712dc81f16fd6b240eedb');
const review = JSON.parse(bytes);
assert.equal(review.schemaVersion, 1);
assert.equal(review.kind, 'TEST_ONLY_EXACT_SOURCE_NORMAL_WORKFLOW_INVERSE');
assert.equal(review.productionAuthority, false);
assert.equal(review.predecessorHead, 'd4bd3af9df53107a4057fc930d89307059c34c88');
assert.deepEqual(Object.keys(review.roles), ['build', 'once']);
for (const [role, row] of Object.entries(review.roles)) {
  assert.equal(row.edits.length, role === 'build' ? 156 : 4);
  assert.equal(row.mode, '100644');
  row.edits.forEach(Object.freeze); Object.freeze(row.edits); Object.freeze(row);
}
Object.freeze(review.roles); Object.freeze(review.release588); Object.freeze(review);
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
  assert.equal(sha(prior), row.predecessorSha256, 'Whole genuine newer P0/587 caller with only the observed588 UA sync');
  return prior;
}

export function inverseRelease588WorkflowUserAgents(source, role) {
  assert.equal(arguments.length, 2);
  assert.equal(typeof source, 'string');
  const row = review.release588;
  if (role !== row.role || sha(source) !== row.actualSha256) return source;
  assert.equal(Buffer.byteLength(source), row.actualBytes);
  assert.equal(source.split(row.actual).length - 1, row.count, 'Only the five observed normal UA fields');
  const previous = source.replaceAll(row.actual, row.original);
  assert.equal(Buffer.byteLength(previous), row.originalBytes);
  assert.equal(sha(previous), row.originalSha256, 'The entire genuine d4bd caller remains the old oracle');
  return previous;
}
// The old oracles still reject unknown bytes. Only this exact newer outer
// SOURCE image and the observed five-UA version image gain a test-only view.
export function inverseSourceNormalWorkflowForHistoricalOracle(source, role) {
  assert.equal(arguments.length, 2);
  assert.equal(typeof source, 'string');
  if (!Object.hasOwn(review.roles, role)) return source;
  if (source.includes('source_normal_producer:')) source = inverseSourceNormalWorkflow(source, role);
  return inverseRelease588WorkflowUserAgents(source, role);
}
