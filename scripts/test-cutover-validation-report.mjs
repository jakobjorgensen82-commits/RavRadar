import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildCutoverValidationReport,
  validateCutoverValidationReport,
} from './cutover-validation-report.mjs';

const identity = {
  sourceHead: 'a'.repeat(40),
  runId: '34706453561',
  runAttempt: 1,
  action: 'integrated-cutover',
};
const failed = buildCutoverValidationReport({
  ...identity,
  steps: [
    { id: 'runtime-audit', required: true, outcome: 'failure' },
    { id: 'state-reference', required: true, outcome: 'skipped' },
    { id: 'full-validation', required: true, outcome: 'success' },
    { id: 'release-gate', required: true, outcome: 'success' },
    { id: 'data-validation', required: true, outcome: 'success' },
  ],
});
assert.equal(failed.status, 'FAILED');
assert.equal(failed.failureCount, 2);
assert.deepEqual(failed.steps.map(step => step.failureReason), [
  'STEP_FAILED', 'REQUIRED_STEP_NOT_RUN', null, null, null,
]);
assert.deepEqual(validateCutoverValidationReport(failed), failed);
assert.doesNotMatch(JSON.stringify(failed), /waterPoint|currentUMps|coordinates|rawPayload/);

const passed = buildCutoverValidationReport({
  ...identity,
  steps: [
    { id: 'runtime-audit', required: true, outcome: 'success' },
    { id: 'state-reference', required: true, outcome: 'success' },
    { id: 'full-validation', required: true, outcome: 'success' },
    { id: 'release-gate', required: true, outcome: 'success' },
    { id: 'data-validation', required: true, outcome: 'success' },
  ],
});
assert.equal(passed.status, 'PASSED');
assert.equal(passed.failureCount, 0);
assert.throws(
  () => validateCutoverValidationReport({ ...passed, privatePayloadIncluded: true }),
  /contract is invalid/,
);
assert.throws(
  () => buildCutoverValidationReport({
    ...identity,
    steps: [
      { id: 'runtime-audit', required: true, outcome: 'success' },
      { id: 'runtime-audit', required: true, outcome: 'failure' },
    ],
  }),
  /step is invalid/,
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ravradar-cutover-report-'));
const failedPath = path.join(root, 'failed.json');
const passedPath = path.join(root, 'passed.json');
try {
  fs.writeFileSync(failedPath, JSON.stringify(failed));
  fs.writeFileSync(passedPath, JSON.stringify(passed));
  const rejected = spawnSync(process.execPath, [
    'scripts/cutover-validation-report.mjs', 'check', '--input', failedPath,
  ], { encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /2 collected error/);
  const accepted = spawnSync(process.execPath, [
    'scripts/cutover-validation-report.mjs', 'check', '--input', passedPath,
  ], { encoding: 'utf8' });
  assert.equal(accepted.status, 0, accepted.stderr);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Cutover validation report aggregates independent failures and blocks writes once.');
