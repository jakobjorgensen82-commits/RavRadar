import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

// Test compatibility only. The actual new reader target consumes raw workflow.
const review = JSON.parse(fs.readFileSync(new URL('./fixed-assistant-failure-workflow-review.json', import.meta.url), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const route = 'fixed-assistant-failure-log-read-20261101';
const step = "      - name: Read only the fixed 1 November assistant failure categories\n        if: inputs.operation == '" + route + "'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-assistant-failure-log-20261101.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n";

export function reviewedFixedAssistantFailureLegacyWorkflow(value) {
  assert.equal(typeof value, 'string', 'FIXED_ASSISTANT_WORKFLOW_TYPE');
  let source = value.replaceAll('\r\n', '\n');
  const readPermission = review.sourceProofReadPermission;
  assert.equal(readPermission.kind, 'EXACT_TOP_LEVEL_PULL_REQUEST_READ_GRANT');
  assert.equal(readPermission.beforeSha256, review.workflowAfterSha256);
  if (sha(source) === readPermission.afterSha256) {
    assert.equal(source.split(readPermission.after).length, 2, 'SOURCE_PROOF_READ_PERMISSION_EXACT_BLOCK');
    source = source.replace(readPermission.after, () => readPermission.before);
    assert.equal(sha(source), readPermission.beforeSha256, 'SOURCE_PROOF_READ_PERMISSION_INVERSE');
  }
  if (sha(source) === review.workflowBeforeSha256) return source;
  assert.equal(sha(source), review.workflowAfterSha256, 'FIXED_ASSISTANT_WORKFLOW_UNREVIEWED_BYTES');
  assert.equal(source.split(step).length, 2, 'FIXED_ASSISTANT_WORKFLOW_EXACT_STEP');
  let inverse = source.replace(step, '')
    .replace('          - ' + route + '\n', '')
    .replace(" || inputs.operation == '" + route + "'", '')
    .replace(" && inputs.operation != '" + route + "'", '');
  const start = inverse.indexOf('  read-fixed-supabase-metadata:');
  const end = inverse.indexOf('  reject-unknown-operation:');
  assert(start >= 0 && end > start, 'FIXED_ASSISTANT_WORKFLOW_JOB');
  let job = inverse.slice(start,end);
  const fetch = 'git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main';
  assert.equal(job.split(fetch).length, 3, 'FIXED_ASSISTANT_WORKFLOW_TWO_FETCHES');
  job = job.replaceAll(fetch, 'git fetch --no-tags --depth=1 origin +refs/heads/main:refs/remotes/origin/main');
  inverse = inverse.slice(0,start) + job + inverse.slice(end);
  assert.equal(sha(inverse), review.workflowBeforeSha256, 'FIXED_ASSISTANT_WORKFLOW_INVERSE');
  return inverse;
}

// Test compatibility only: exact reviewed byte insertions, then whole old hash.
export function reviewedFixedAssistantFailureLegacyRegistry(value) {
  assert.equal(typeof value, 'string', 'FIXED_ASSISTANT_REGISTRY_TYPE');
  let source = Buffer.from(value.replaceAll('\r\n', '\n'), 'utf8');
  const successor = review.registrySourceProofSuccessor;
  assert.equal(successor.kind, 'EXACT_CONTROLS_AND_SOURCE_PROOF_REGISTRY_SUCCESSOR');
  assert.equal(successor.oracleSha256, review.registryAfterSha256);
  const bindingSuccessor = review.registryBindingSuccessor;
  assert.equal(bindingSuccessor.kind, 'EXACT_AUDIT_RECIPIENT_SIX_BINDINGS_SUCCESSOR');
  assert.equal(bindingSuccessor.beforeSha256, successor.afterSha256);
  if (sha(source) === bindingSuccessor.afterSha256) {
    const insertion = bindingSuccessor.insertion;
    assert(Number.isSafeInteger(insertion.offset) && insertion.offset >= 0);
    assert(Number.isSafeInteger(insertion.bytes) && insertion.bytes > 0 && insertion.offset + insertion.bytes <= source.length);
    assert.equal(sha(source.subarray(insertion.offset, insertion.offset + insertion.bytes)), insertion.sha256,
      'FIXED_ASSISTANT_REGISTRY_BINDINGS_INSERTION');
    source = Buffer.concat([source.subarray(0, insertion.offset), source.subarray(insertion.offset + insertion.bytes)]);
    assert.equal(sha(source), bindingSuccessor.beforeSha256, 'FIXED_ASSISTANT_REGISTRY_BINDINGS_WHOLE_INVERSE');
  }
  if (sha(source) === review.registryAfterSha256) return source.toString('utf8');
  assert.equal(sha(source), successor.afterSha256, 'FIXED_ASSISTANT_REGISTRY_UNREVIEWED_BYTES');
  const removeInsertion = row => {
    assert(Number.isSafeInteger(row.offset) && row.offset >= 0);
    assert(Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.offset + row.bytes <= source.length);
    assert.equal(sha(source.subarray(row.offset, row.offset + row.bytes)), row.sha256,
      'FIXED_ASSISTANT_REGISTRY_EXACT_INSERTION');
    source = Buffer.concat([source.subarray(0, row.offset), source.subarray(row.offset + row.bytes)]);
  };
  removeInsertion(successor.transitionInsertion);
  assert.equal(sha(source), successor.controlsAfterSha256, 'FIXED_ASSISTANT_REGISTRY_CONTROLS_IMAGE');
  assert.deepEqual(successor.controlInsertions.map(row => row.field), ['owners', 'sources', 'resourceFiles']);
  for (const row of [...successor.controlInsertions].reverse()) removeInsertion(row);
  assert.equal(sha(source), review.registryAfterSha256, 'FIXED_ASSISTANT_REGISTRY_WHOLE_INVERSE');
  return source.toString('utf8');
}
