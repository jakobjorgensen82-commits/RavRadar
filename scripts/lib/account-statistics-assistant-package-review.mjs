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
function inverseReviewed585AccountStatisticsAssistantSourceScripts(scripts){
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

// Additive exact current586 registration inverse; all old585 assertions above
// still execute against their WHOLE unchanged canonical scripts hash.
// Additive exact NEXT-to586 scripts inverse. No old review/hash is replaced.
export function inverseAssistantLaterH0SourceScripts(scripts){
  assert.equal(arguments.length,1);assert(scripts&&Object.getPrototypeOf(scripts)===Object.prototype);
  assert(Object.values(scripts).every(value=>typeof value==='string'));
  assert.equal(sha(canonical(scripts)),'9df85408955c0449c92370f1af4451ff475f4cc10a4e92bcb440790793bda997','Only the entire reviewed later-H0 command map');
  assert.equal(scripts['test:native-original-continuity-source'],'node --test scripts/test-native-original-continuity-callers.mjs');
  assert.equal(scripts['test:assistant-later-h0-source'],'node scripts/build-assistant-later-h0-successor.mjs --check');
  const native='npm run test:native-original-continuity-source',next='npm run test:assistant-later-h0-source';
  const actual=scripts['test:ravscore-source-critical'];
  assert.equal(actual.split(native+' && '+next).length,2,'One exact predecessor then NEXT registration');
  const expanded=expandSourceCommands(scripts,'validate:source:checks'),plan=buildSourceValidationPlan(scripts),dispatched=[];
  assert.equal(runSourceValidation(plan,{execute(command){dispatched.push(command);return 0;},log(){}}),0);
  assert.deepEqual(dispatched,[...plan.preflight,...plan.remaining,plan.gate]);
  for(const command of ['node --test scripts/test-native-original-continuity-callers.mjs',
    'node scripts/build-assistant-later-h0-successor.mjs --check']){
    assert.equal(expanded.filter(c=>c===command).length,1);assert.equal(dispatched.filter(c=>c===command).length,1);
  }
  assert.equal(expanded.includes('node scripts/build-native-original-continuity-successor.mjs --check'),false,
    'The genuine586 builder executes in its fixed source host, never on NEXT');
  const prior={...scripts,'test:native-original-continuity-source':
    'node scripts/build-native-original-continuity-successor.mjs --check && node --test scripts/test-native-original-continuity-callers.mjs',
    'test:ravscore-source-critical':actual.replace(native+' && '+next,native)};
  delete prior['test:assistant-later-h0-source'];
  assert.equal(sha(canonical(prior)),'2340e00e085a5a6221e27a6caecf5dd85f6b8b6f6cd2ca8a845056c587befe57','Whole actual586 scripts before unchanged older inverses');
  return prior;
}

export function inverseReviewedAccountStatisticsAssistantSourceScripts(scripts){
  assert.equal(arguments.length,1);assert(scripts&&Object.getPrototypeOf(scripts)===Object.prototype);
  assert(Object.values(scripts).every(value=>typeof value==='string'));
  if(Object.hasOwn(scripts,'test:assistant-later-h0-source'))scripts=inverseAssistantLaterH0SourceScripts(scripts);
  if(!Object.hasOwn(scripts,'test:native-original-continuity-source'))
    return inverseReviewed585AccountStatisticsAssistantSourceScripts(scripts);
  assert.equal(scripts['test:native-original-continuity-source'],'node scripts/build-native-original-continuity-successor.mjs --check && node --test scripts/test-native-original-continuity-callers.mjs');
  assert.equal(scripts['test:account-statistics-assistant-source'],'node --test scripts/test-account-statistics-assistant-callers.mjs');
  const actual=scripts['test:ravscore-source-critical'],asa='npm run test:account-statistics-assistant-source',native='npm run test:native-original-continuity-source';
  assert.equal(actual.split(asa).length,2);assert.equal(actual.split(native).length,2);
  const sequence='npm run test:last-mile-enclosure && '+asa+' && '+native+' && node scripts/sync-ravscore-model-binding.mjs --check';
  assert.equal(actual.split(sequence).length,2,'Exact585 then586 source registration order');
  const expanded=expandSourceCommands(scripts,'validate:source:checks');
  const plan=buildSourceValidationPlan(scripts),dispatched=[];
  assert.equal(runSourceValidation(plan,{execute(command){dispatched.push(command);return 0;},log(){}}),0);
  assert.deepEqual(dispatched,[...plan.preflight,...plan.remaining,plan.gate]);
  for(const command of ['node --test scripts/test-account-statistics-assistant-callers.mjs',
    'node scripts/build-native-original-continuity-successor.mjs --check',
    'node --test scripts/test-native-original-continuity-callers.mjs']){
    assert.equal(expanded.filter(c=>c===command).length,1);assert.equal(dispatched.filter(c=>c===command).length,1);
  }
  assert.equal(expanded.includes('node scripts/build-account-statistics-assistant-successor.mjs --check'),false,
    'Genuine585 builder executes inside its fixed source host, never on current586');
  const prior={...scripts,'test:account-statistics-assistant-source':'node scripts/build-account-statistics-assistant-successor.mjs --check && node --test scripts/test-account-statistics-assistant-callers.mjs',
    'test:ravscore-source-critical':actual.replace(asa+' && '+native,asa)};
  delete prior['test:native-original-continuity-source'];
  assert.equal(sha(canonical(prior)),review.afterSha256,'Whole genuine585 scripts reconstructed before unchanged old oracles');
  return inverseReviewed585AccountStatisticsAssistantSourceScripts(prior);
}
