import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateRavScoreDispatchContract } from './lib/ravscore-dispatch-contract.mjs';

const workflow = fs.readFileSync('.github/workflows/update-and-deploy.yml', 'utf8')
  .replace(/\r\n/g, '\n');
const dispatchJobStart = workflow.indexOf('\n  validate-dispatch:');
const dispatchJobEnd = workflow.indexOf('\n  geometry-v2-pilot:', dispatchJobStart);
const dispatchJob = dispatchJobStart >= 0 && dispatchJobEnd > dispatchJobStart
  ? workflow.slice(dispatchJobStart, dispatchJobEnd)
  : '';
const checkoutIndex = dispatchJob.indexOf('uses: actions/checkout@v7');
const setupIndex = dispatchJob.indexOf('uses: actions/setup-node@v7');
const validatorIndex = dispatchJob.indexOf('node scripts/validate-ravscore-dispatch.mjs');
assert.ok(checkoutIndex >= 0 && setupIndex > checkoutIndex && validatorIndex > setupIndex,
  'manual dispatch must checkout the exact repository and set up Node before its validator');
assert.match(dispatchJob, /actions\/setup-node@v7[\s\S]*?node-version: '24'/,
  'manual dispatch validator must use the repository Node 24 contract');

const base = {
  force: 'false', geometryPilot: 'false', geometryNational: 'false',
  rollbackMode: 'none', rollbackConfirmation: '',
  returnRequested: 'false', returnConfirmation: '',
};
const operations = [
  { name: 'force', patch: { force: 'true' } },
  { name: 'geometry-pilot', patch: { geometryPilot: 'true' } },
  { name: 'geometry-national', patch: { geometryNational: 'true' } },
  { name: 'candidate-dry-run', patch: { rollbackMode: 'dry-run' } },
  { name: 'candidate-execute', patch: { rollbackMode: 'execute', rollbackConfirmation: 'EXECUTE-CANDIDATE-G-ROLLBACK' } },
  { name: 'integrated-return', patch: { returnRequested: 'true', returnConfirmation: 'EXECUTE-INTEGRATED-RAVSCORE-RETURN' } },
];

assert.equal(validateRavScoreDispatchContract(base).operation, 'normal');
for (const operation of operations) {
  assert.doesNotThrow(() => validateRavScoreDispatchContract({ ...base, ...operation.patch }), operation.name);
}
for (let left = 0; left < operations.length; left += 1) {
  for (let right = left + 1; right < operations.length; right += 1) {
    const sameRollbackFamily = operations[left].name.startsWith('candidate-') && operations[right].name.startsWith('candidate-');
    if (sameRollbackFamily) continue;
    const combined = { ...base, ...operations[left].patch, ...operations[right].patch };
    assert.throws(() => validateRavScoreDispatchContract(combined), /Exactly one/, `${operations[left].name}+${operations[right].name}`);
  }
}

assert.throws(() => validateRavScoreDispatchContract({ ...base, rollbackMode: 'execute' }), /confirmation is not exact/);
assert.throws(() => validateRavScoreDispatchContract({ ...base, rollbackConfirmation: 'EXTRA' }), /accepted only by execute/);
assert.throws(() => validateRavScoreDispatchContract({ ...base, returnConfirmation: 'EXTRA' }), /accepted only by an integrated return/);
for (const retiredInput of [
  { reconstructionMode: 'none' },
  { reconstructionMode: 'inspect' },
  { reconstructionMode: 'apply' },
  { reconstructionMode: 'rollback' },
  { reconstructionMode: 'cleanup' },
  { inspectionRunId: '123456789' },
  { inspectionArtifactId: '223456789' },
  { descriptorSha256: 'a'.repeat(64) },
  { applyRunId: '323456789' },
  { rollbackArtifactId: '423456789' },
]) {
  assert.throws(
    () => validateRavScoreDispatchContract({ ...base, ...retiredInput }),
    /permanently retired/,
    `retired reconstruction input must fail closed: ${Object.keys(retiredInput)[0]}`,
  );
}
assert.throws(() => validateRavScoreDispatchContract({ ...base, rollbackMode: 'dry-run' }, { githubRef: 'refs/heads/feature' }), /only on main/);

console.log('RavScore manual dispatch matrix: passed.');
