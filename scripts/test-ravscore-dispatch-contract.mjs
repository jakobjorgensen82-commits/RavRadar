import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { validateRavScoreDispatchContract } from './lib/ravscore-dispatch-contract.mjs';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const workflow = (await readProductionWorkflowSource('orchestrator')).replace(/\r\n/g, '\n');
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
assert.match(
  dispatchJob,
  /if \[ "\$FIRST_CUTOVER_REQUESTED" = "true" \]; then[\s\S]*?\[\[ ! "\$WEATHER_HANDOFF_RUN_ID" =~ \^\[1-9\]\[0-9\]\{0,19\}\$ \]\]/,
  'first cutover must require a concrete positive weather source producer run id',
);
assert.match(
  dispatchJob,
  /elif \[ -n "\$WEATHER_HANDOFF_RUN_ID" \]; then[\s\S]*?A verified weather handoff is accepted only by an integrated first cutover\./,
  'non-first-cutover dispatch must reject a weather source producer run id',
);

const base = {
  force: 'false', geometryPilot: 'false', geometryNational: 'false',
  rollbackMode: 'none', rollbackConfirmation: '',
  firstCutoverRequested: 'false', firstCutoverConfirmation: '',
  weatherHandoffRunId: '',
  returnRequested: 'false', returnConfirmation: '',
};
const operations = [
  { name: 'force', patch: { force: 'true' } },
  { name: 'geometry-pilot', patch: { geometryPilot: 'true' } },
  { name: 'geometry-national', patch: { geometryNational: 'true' } },
  { name: 'candidate-dry-run', patch: { rollbackMode: 'dry-run' } },
  { name: 'candidate-execute', patch: { rollbackMode: 'execute', rollbackConfirmation: 'EXECUTE-CANDIDATE-G-ROLLBACK' } },
  { name: 'integrated-first-cutover', patch: { firstCutoverRequested: 'true', firstCutoverConfirmation: 'EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE', weatherHandoffRunId: '34161930631' } },
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
assert.throws(() => validateRavScoreDispatchContract({ ...base, firstCutoverRequested: 'true' }), /confirmation is not exact/);
assert.throws(() => validateRavScoreDispatchContract({ ...base, firstCutoverConfirmation: 'EXTRA' }), /accepted only by an integrated first cutover/);
assert.throws(() => validateRavScoreDispatchContract({
  ...base,
  firstCutoverRequested: 'true',
  firstCutoverConfirmation: 'EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE',
}), /handoff run id is malformed/);
for (const weatherHandoffRunId of ['0', '-1', '1.5', '123456789012345678901']) {
  assert.throws(() => validateRavScoreDispatchContract({
    ...base,
    firstCutoverRequested: 'true',
    firstCutoverConfirmation: 'EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE',
    weatherHandoffRunId,
  }), /handoff run id is malformed/, `invalid weather handoff run id must fail closed: ${weatherHandoffRunId}`);
}
assert.throws(() => validateRavScoreDispatchContract({
  ...base,
  weatherHandoffRunId: '34161930631',
}), /accepted only by an integrated first cutover/);

const cliEnv = {
  ...process.env,
  GITHUB_REF: 'refs/heads/main',
  FORCE: 'false',
  GEOMETRY_PILOT: 'false',
  GEOMETRY_NATIONAL: 'false',
  ROLLBACK_MODE: 'none',
  ROLLBACK_CONFIRMATION: '',
  FIRST_CUTOVER_REQUESTED: 'true',
  FIRST_CUTOVER_CONFIRMATION: 'EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE',
  WEATHER_HANDOFF_RUN_ID: '',
  RETURN_REQUESTED: 'false',
  RETURN_CONFIRMATION: '',
};
const missingCliRunId = spawnSync(process.execPath, ['scripts/validate-ravscore-dispatch.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: cliEnv,
});
assert.notEqual(missingCliRunId.status, 0, 'CLI validator must reject first cutover without a run id');
assert.match(missingCliRunId.stderr, /handoff run id is malformed/);
const validCliRunId = spawnSync(process.execPath, ['scripts/validate-ravscore-dispatch.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...cliEnv, WEATHER_HANDOFF_RUN_ID: '34161930631' },
});
assert.equal(validCliRunId.status, 0, validCliRunId.stderr);
assert.match(validCliRunId.stdout, /integrated-first-cutover/);

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
assert.throws(() => validateRavScoreDispatchContract({
  ...base,
  firstCutoverRequested: 'true',
  firstCutoverConfirmation: 'EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE',
  weatherHandoffRunId: '34161930631',
}, { githubRef: 'refs/heads/feature' }), /only on main/);

console.log('RavScore manual dispatch matrix: passed.');
