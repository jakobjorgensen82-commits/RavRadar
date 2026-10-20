// TEST ONLY. Qualify the actual585 command plan before unchanged old package oracles.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {expandSourceCommands,buildSourceValidationPlan,runSourceValidation} from '../validate-source-once.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./account-statistics-assistant-package-review.json',import.meta.url));
assert.equal(sha(bytes),'8d068a938290911427dbef05fc75a0700829b48c7f8dee069440ce013bc2c490');
const review=JSON.parse(bytes);assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_ACCOUNT_STATISTICS_ASSISTANT_PACKAGE_INVERSE');assert.equal(review.edits.length,3);
const canonical=scripts=>JSON.stringify(Object.keys(scripts).sort().map(key=>[key,scripts[key]]));
export function inverseReviewedAccountStatisticsAssistantSourceScripts(scripts){
  assert.equal(arguments.length,1);assert(scripts&&Object.getPrototypeOf(scripts)===Object.prototype);
  assert(Object.values(scripts).every(value=>typeof value==='string'));
  assert.equal(sha(canonical(scripts)),review.afterSha256,'Unreviewed actual source commands cannot enter an old oracle');
  const commands=expandSourceCommands(scripts,'validate:source:checks'),invoked=commands.flatMap(command=>command.split(' '));
  const plan=buildSourceValidationPlan(scripts),actualDispatch=[];
  assert.equal(runSourceValidation(plan,{execute(command){actualDispatch.push(command);return 0;},log(){}}),0);
  assert.deepEqual(actualDispatch,[...plan.preflight,...plan.remaining,plan.gate]);
  for(const command of [review.shortAuthoritySourceCommand,
    'node scripts/run-frozen584-source-targets.mjs source',
    'node scripts/build-account-statistics-assistant-successor.mjs --check',
    'node --test scripts/test-account-statistics-assistant-callers.mjs'])
  {
    assert.equal(commands.filter(value=>value===command).length,1,'Each actual old/new source caller expands exactly once');
    assert.equal(actualDispatch.filter(value=>value===command).length,1,'The normal planner dispatches each actual old/new caller exactly once');
  }
  assert.equal(commands.includes('node scripts/build-last-mile-enclosure-successor.mjs --check'),false);
  for(const file of ['scripts/test-last-mile-enclosure-current-model-imports.mjs','scripts/test-last-mile-enclosure-plan.mjs','scripts/test-last-mile-enclosure-postgres-source.mjs','scripts/test-last-mile-enclosure-restart-archive-origin.mjs'])
    assert.equal(invoked.includes(file),false,'Old584 assertions must not run against current585');
  for(const file of [...review.currentTargets,'scripts/test-code-only-public-coastal-registry-stage.mjs'])
    assert.equal(invoked.filter(value=>value===file).length,1,'Every still-current target remains once');
  assert.equal(sha(fs.readFileSync(new URL('../run-frozen584-source-targets.mjs',import.meta.url))),review.frozenRunnerSha256);
  const inventoryBytes=fs.readFileSync(new URL('./frozen584-normal-source-target-inventory.json',import.meta.url));
  assert.equal(sha(inventoryBytes),review.frozenInventorySha256);const inventory=JSON.parse(inventoryBytes);
  assert.equal(inventory.head,'ee029982538c67dea39880bc7b33f3508c10cf9c');assert.equal(inventory.tree,'400babda9377e43ea7ee1444008f7accd1aded32');
  assert.equal(inventory.migrations.length,53);assert.deepEqual(inventory.targets,['scripts/test-last-mile-enclosure-current-model-imports.mjs','scripts/test-last-mile-enclosure-plan.mjs','scripts/test-last-mile-enclosure-postgres-source.mjs']);
  const prior={...scripts};
  for(const edit of review.edits){assert.equal(prior[edit.key],edit.after);if(edit.before===null)delete prior[edit.key];else prior[edit.key]=edit.before;}
  assert.equal(sha(canonical(prior)),review.beforeSha256,'Every genuine previous script and ordering operand survives the whole inverse');
  return prior;
}
