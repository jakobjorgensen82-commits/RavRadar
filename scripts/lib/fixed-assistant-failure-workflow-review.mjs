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
  const source = value.replaceAll('\r\n', '\n');
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
