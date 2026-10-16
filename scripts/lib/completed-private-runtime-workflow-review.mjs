// Test-only exact inverse. Every byte of the historical workflow oracle is
// retained; new-route behavior is tested separately against the actual files.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const review = JSON.parse(fs.readFileSync(new URL('./completed-private-runtime-workflow-review.json', import.meta.url), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
export function inverseCompletedRuntimeWorkflow(source, role) {
  const row = review.inverseReview[role];
  if (!row) return source;
  assert.equal(sha(source), row.actualSha256, 'Exact reviewed completed-runtime workflow: ' + role);
  let legacy = source;
  for (const [offset, actual, original] of row.edits) {
    assert.equal(legacy.slice(offset, offset + actual.length), actual, 'Exact inverse segment');
    legacy = legacy.slice(0, offset) + original + legacy.slice(offset + actual.length);
  }
  assert.equal(sha(legacy), row.legacySha256, 'Whole historical workflow must survive the inverse');
  return legacy;
}
