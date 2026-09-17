import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  expandValidationCommands,
  runValidationCollection,
  validateValidationCollectionReport,
  writeReportAtomically,
} from './run-validation-collection.mjs';

const synthetic = {
  validate: 'npm run first && npm run second && node scripts/last.mjs',
  first: 'node scripts/pass.mjs && python scripts/fail.py --self-test',
  second: 'node scripts/also-fail.mjs && node scripts/after-failure.mjs',
};
const plan = expandValidationCommands(synthetic, 'validate');
assert.deepEqual(plan, [
  'node scripts/pass.mjs',
  'python scripts/fail.py --self-test',
  'node scripts/also-fail.mjs',
  'node scripts/after-failure.mjs',
  'node scripts/last.mjs',
]);

const executed = [];
const snapshots = [];
const report = runValidationCollection(plan, {
  execute(command) {
    executed.push(command);
    if (command.includes('fail.py')) return { status: 2 };
    if (command.includes('also-fail')) return { error: new Error('synthetic') };
    return { status: 0 };
  },
  log() {},
  onProgress(snapshot) {
    snapshots.push(structuredClone(snapshot));
    validateValidationCollectionReport(snapshot, {
      expectedCommands: plan,
      expectedRootScript: 'validate',
    });
  },
});
assert.deepEqual(executed, plan, 'a failure must not hide any later validation command');
assert.equal(snapshots[0].status, 'IN_PROGRESS');
assert.equal(snapshots[0].completedCount, 0);
assert.equal(snapshots[0].commands.every(item => item.outcome === 'not-run'), true);
assert.equal(snapshots[1].commands[0].outcome, 'running');
assert.equal(snapshots.at(-1).completedCount, plan.length);
assert.equal(report.status, 'FAILED');
assert.equal(report.commandCount, 5);
assert.equal(report.completedCount, 5);
assert.equal(report.failureCount, 2);
assert.deepEqual(report.commands.map(item => item.outcome), [
  'success', 'failure', 'spawn-error', 'success', 'success',
]);
assert.deepEqual(validateValidationCollectionReport(report, {
  expectedCommands: plan,
  expectedRootScript: 'validate',
  requireComplete: true,
}), report);
assert.doesNotMatch(JSON.stringify(report), /synthetic/,
  'the payload-free report must not contain exception details or runtime data');

assert.throws(() => validateValidationCollectionReport(snapshots[1], {
  expectedCommands: plan,
  expectedRootScript: 'validate',
  requireComplete: true,
}), /classification is invalid/);
assert.throws(() => validateValidationCollectionReport({
  ...report,
  commands: report.commands.map((item, index) => index === 0
    ? { ...item, command: 'node scripts/substituted.mjs' } : item),
}, { expectedCommands: plan, expectedRootScript: 'validate' }), /command plan is invalid/);
assert.throws(
  () => expandValidationCommands({ validate: 'npm run validate' }, 'validate'),
  /Cyclic validation script/,
);
assert.throws(
  () => expandValidationCommands({ validate: 'echo unsafe' }, 'validate'),
  /Unsupported validation command/,
);
const reportRoot=fs.mkdtempSync(path.join(os.tmpdir(),'ravradar-validation-collection-'));
const reportPath=path.join(reportRoot,'report.json');
try{
 for(const snapshot of snapshots)writeReportAtomically(reportPath,snapshot);
 assert.deepEqual(JSON.parse(fs.readFileSync(reportPath,'utf8')),report,
  'the incremental report must be replaceable and end with the complete plan');
 assert.equal(fs.existsSync(`${reportPath}.tmp`),false,'no partial temporary report may remain');
}finally{
 fs.rmSync(reportRoot,{recursive:true,force:true});
}

const projectScripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
const projectPlan = expandValidationCommands(projectScripts, 'validate');
assert.ok(projectPlan.length >= 270, 'the collector must cover the complete hydrated validation tree');
assert.ok(projectPlan.includes('node scripts/test-forecast-integrity-4.0.17.mjs'));
assert.ok(projectPlan.includes('node scripts/test-workflow-validation-order-4.0.108.mjs'));
assert.ok(projectPlan.includes('python scripts/test-dmi-oneoff-fill.py'));
assert.ok(projectPlan.includes('python scripts/test-dmi-contiguous-component-horizon-4.0.210.py'));

const productionPlan = expandValidationCommands(projectScripts, 'validate:production-artifact');
assert.equal(productionPlan.length, 52,
  'the production artifact gate must remain the owner-approved 52-leaf critical plan');
for (const command of [
  'node scripts/validate-weather-health.mjs',
  'node scripts/test-forecast-integrity-4.0.17.mjs',
  'node scripts/test-score-presentation-4.0.45.mjs',
  'node scripts/test-public-runtime-4.0.74.mjs',
  'node scripts/test-current-full-coverage-gate-4.0.232.mjs',
  'node scripts/test-current-provenance-null-safety-4.0.78.mjs',
  'node scripts/test-missing-weather-null-safety-4.0.116.mjs',
  'node scripts/test-water-source-production-chain-4.0.103.mjs',
]) assert.ok(productionPlan.includes(command), `critical production plan is missing ${command}`);
for (const command of [
  'node scripts/test-dmi-bulk-model-download.mjs',
  'node scripts/test-feedback-learning.mjs',
  'node scripts/test-workflow-validation-order-4.0.108.mjs',
]) assert.ok(!productionPlan.includes(command), `production plan retained non-artifact check ${command}`);

const productionReleasePlan = expandValidationCommands(projectScripts, 'validate:production-release');
assert.deepEqual(productionReleasePlan, [
  'node scripts/validate-release-version.mjs',
  'node scripts/build-ravscore-model-bundle.mjs --check',
  'node scripts/sync-ravscore-model-binding.mjs --check',
], 'normal production must keep only exact version and active model-binding governance');

console.log(`Validation collector covers all ${projectPlan.length} full-suite checks, the ${productionPlan.length}-check production gate and three release checks, preserves partial progress and reports every failure.`);
