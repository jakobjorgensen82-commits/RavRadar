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
// Additive fixed588-to587 command inverse. Qualify the actual new command
// through the normal planner before entering any unchanged historical oracle.
export function inverseAssistantPublic587SuccessorSourceScripts(scripts){
  assert.equal(arguments.length,1);assert(scripts&&Object.getPrototypeOf(scripts)===Object.prototype);
  assert(Object.values(scripts).every(value=>typeof value==='string'));
  assert.equal(sha(canonical(scripts)),'fe8e112b4e4e30d948aeecf764db02369bdfc90ba1d0d681af5733b27443b06b','Only the entire reviewed public587 successor command map');
  const current='node scripts/build-assistant-later-h0-successor.mjs --public587-successor --check',
    previous='node scripts/build-assistant-later-h0-successor.mjs --check';
  assert.equal(scripts['test:assistant-later-h0-source'],current);
  const expanded=expandSourceCommands(scripts,'validate:source:checks'),plan=buildSourceValidationPlan(scripts),dispatched=[];
  assert.equal(runSourceValidation(plan,{execute(command){dispatched.push(command);return 0;},log(){}}),0);
  assert.deepEqual(dispatched,[...plan.preflight,...plan.remaining,plan.gate]);
  for(const rows of [expanded,dispatched]){
    assert.equal(rows.filter(command=>command===current).length,1,'Actual588 builder is dispatched exactly once');
    assert.equal(rows.includes(previous),false,'The old default builder never runs on current588');
    assert.equal(rows.filter(command=>command==='node --test scripts/test-native-original-continuity-callers.mjs').length,1);
  }
  const prior={...scripts,'test:assistant-later-h0-source':previous};
  assert.equal(sha(canonical(prior)),'9df85408955c0449c92370f1af4451ff475f4cc10a4e92bcb440790793bda997','Whole genuine587 scripts before unchanged older inverses');
  return prior;
}

// TEST ONLY. Qualify the complete actual SOURCE plan before its exact two-key
// inverse. The native dispatcher is checked on CURRENT bytes by the normal test.
const SOURCE_FIXED588_FACTORY_COMMAND="node --input-type=module -e \"import {withAuthenticated588PredecessorSource} from './scripts/check-assistant-later-h0-predecessor-source.mjs';await withAuthenticated588PredecessorSource(async()=>{});\"";
export function inverseSourceProducerSourceScripts(scripts){
  assert.equal(arguments.length,1);assert(scripts&&Object.getPrototypeOf(scripts)===Object.prototype);
  assert(Object.values(scripts).every(value=>typeof value==='string'));
  assert.equal(sha(canonical(scripts)),'930ed5f01ad883e8310606fed1b12409dddd1a39ccccf3b61069677560d277ca','Only the whole deduplicated SOURCE command map');
  assert.equal(scripts['test:assistant-later-h0-source'],SOURCE_FIXED588_FACTORY_COMMAND);
  const current='npm run test:assistant-later-h0-source && node scripts/build-source-producer-successor.mjs --check && node --test scripts/test-source-producer-prewrite.mjs && node scripts/sync-ravscore-model-binding.mjs --check';
  const previous='npm run test:assistant-later-h0-source && node scripts/sync-ravscore-model-binding.mjs --check';
  const critical=scripts['test:ravscore-source-critical'];
  assert.equal(critical.split(current).length,2,'Exactly one ordered SOURCE builder/prewrite registration');
  const expanded=expandSourceCommands(scripts,'validate:source:checks'),plan=buildSourceValidationPlan(scripts),dispatched=[];
  assert.equal(expanded.length,73,'Deduplication removes an operand, not a normal command');
  assert.equal(runSourceValidation(plan,{execute(command){dispatched.push(command);return 0;},log(){}}),0);
  assert.deepEqual(dispatched,[...plan.preflight,...plan.remaining,plan.gate]);
  for(const rows of [expanded,dispatched])for(const command of [SOURCE_FIXED588_FACTORY_COMMAND,
    'node scripts/build-source-producer-successor.mjs --check','node --test scripts/test-source-producer-prewrite.mjs'])
    assert.equal(rows.filter(value=>value===command).length,1,'Actual fixed588/SOURCE checks remain once');
  const invoked=expanded.flatMap(command=>command.split(' '));
  assert.equal(invoked.filter(value=>value==='scripts/test-source-normal-workflow.mjs').length,0);
  assert.equal(invoked.filter(value=>value==='scripts/test-reusable-production-workflows.mjs').length,1,
    'The complete structural target remains reached through its existing normal import chain');
  const reviewedCritical=critical.replace('node --test scripts/test-source-producer-prewrite.mjs',
    'node --test scripts/test-source-producer-prewrite.mjs scripts/test-source-normal-workflow.mjs');
  const reviewed={...scripts,'test:ravscore-source-critical':reviewedCritical};
  assert.equal(sha(canonical(reviewed)),'47e6338aa670cfaa39d30f529d4a9d77fc2494d60476757ca30b95f3da283f51',
    'The entire original SOURCE plan is retained as a never-dispatched historical view');
  const reviewedCurrent=current.replace('node --test scripts/test-source-producer-prewrite.mjs',
    'node --test scripts/test-source-producer-prewrite.mjs scripts/test-source-normal-workflow.mjs');
  assert.equal(reviewedCritical.split(reviewedCurrent).length,2);
  const prior={...reviewed,'test:assistant-later-h0-source':
    'node scripts/build-assistant-later-h0-successor.mjs --public587-successor --check',
    'test:ravscore-source-critical':reviewedCritical.replace(reviewedCurrent,previous)};
  assert.equal(sha(canonical(prior)),'fe8e112b4e4e30d948aeecf764db02369bdfc90ba1d0d681af5733b27443b06b',
    'Exact two-key inverse preserves the entire actual588 command map before all old assertions');
  return prior;
}

export function inverseAssistantLaterH0SourceScripts(scripts){
  assert.equal(arguments.length,1);assert(scripts&&Object.getPrototypeOf(scripts)===Object.prototype);
  assert(Object.values(scripts).every(value=>typeof value==='string'));
  if(scripts['test:assistant-later-h0-source']===SOURCE_FIXED588_FACTORY_COMMAND)
    scripts=inverseSourceProducerSourceScripts(scripts);
  if(scripts['test:assistant-later-h0-source']==='node scripts/build-assistant-later-h0-successor.mjs --public587-successor --check')
    scripts=inverseAssistantPublic587SuccessorSourceScripts(scripts);
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
