// Current normal source driver: behavior, failure propagation and child isolation.
// Historical command-map snapshots are not admission rules for today's code.
import './test-source-child-environment.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSourceValidationPlan,expandSourceCommands,runSourceValidation,
  sourceCommandsForChangedPaths,isOnlyReleaseVersionChange,SOURCE_BINDING_PREFLIGHT} from './validate-source-once.mjs';
const scripts=JSON.parse(fs.readFileSync('package.json','utf8')).scripts;
const plan=buildSourceValidationPlan(scripts);
assert.deepEqual(plan.preflight,[...SOURCE_BINDING_PREFLIGHT]);
assert.equal(plan.gate,'node scripts/source-critical-gate.mjs');
const expected=[
  'node scripts/validate-release-version.mjs',
  'node scripts/validate-rdks.mjs',
  'node scripts/test-security-hardening-4.0.284.mjs',
  'node scripts/test-tracked-runtime-privacy.mjs',
  'node scripts/test-source-validation-once.mjs',
];
assert.deepEqual(plan.remaining,expected);
assert.equal(plan.preflight.length+plan.remaining.length+1,8);
const calls=[];
assert.equal(runSourceValidation(plan,{execute(c){calls.push(c);return 0;},log(){}}),0);
assert.deepEqual(calls,[...plan.preflight,...expected,plan.gate]);
for(const failure of calls.keys()){
  let count=0;
  assert.equal(runSourceValidation(plan,{execute(){return count++===failure?1:0;},log(){}}),1);
  assert.equal(count,failure<plan.preflight.length?plan.preflight.length:calls.length);
}
for(const changes of [
  {'validate:source':'node other.mjs'},
  {'source:critical-gate':'node other.mjs'},
  {'validate:source:checks':'node scripts/test-score-engine.mjs'},
  {'validate:source:checks':'npm run source:critical-gate && npm run source:critical-gate'},
  {'validate:source:checks':'npm run source:critical-gate && node scripts/test-score-engine.mjs'},
  {'validate:source:checks':'npm run missing'},
  {'validate:source:checks':'npm run validate:source:checks'},
  {'validate:source:checks':'echo ok || true && npm run source:critical-gate'},
])assert.throws(()=>buildSourceValidationPlan({...scripts,...changes}));
assert.throws(()=>expandSourceCommands({a:'npm run b',b:'npm run a'},'a'));
const sharing=sourceCommandsForChangedPaths(['scripts/forecast-share/handler.mjs',
  'scripts/test-forecast-share-projection.mjs']);
assert(sharing.includes('node scripts/test-forecast-share-projection.mjs'));
assert.equal(new Set(sharing).size,sharing.length);
assert(!sharing.some(c=>/native-postgres|test-source-current-contracts/.test(c)));
assert(sourceCommandsForChangedPaths(['js/services/rav-assistant-public-help.js'])
  .includes('node --test scripts/test-assistant-ui-error-boundary.mjs'),
  'Public help-only changes must execute the normal whole UI caller contract');
assert.deepEqual(sourceCommandsForChangedPaths(['scripts/test-assistant-after597-sync-binding.mjs']),
  expandSourceCommands(scripts,'test:assistant-later-h0-source').filter(command=>command.includes('/test-assistant-after597-sync-binding.mjs')));
assert(!sourceCommandsForChangedPaths(['supabase/functions/ravradar-assistant/index.ts'])
  .some(command=>command.includes('test-fixed-assistant-failure-log-20261101.mjs')));
assert.deepEqual(sourceCommandsForChangedPaths(['scripts/read-fixed-assistant-failure-log-20261101.mjs']),
  ['node scripts/test-fixed-assistant-failure-log-20261101.mjs']);
assert.deepEqual(sourceCommandsForChangedPaths(['scripts/read-fixed-assistant-failure-log-20261121-1712.mjs']),
  ['node scripts/test-fixed-assistant-failure-log-20261121-1712.mjs']);
assert.deepEqual(sourceCommandsForChangedPaths(['scripts/read-fixed-account-activity-hook.mjs',
  'scripts/test-fixed-account-activity-hook.mjs']),
  ['node --test scripts/test-fixed-account-activity-hook.mjs']);
assert.deepEqual(sourceCommandsForChangedPaths(['.github/workflows/deploy-trip-storage.yml']),
  ['node scripts/test-fixed-assistant-failure-log-20261101.mjs',
    'node scripts/test-fixed-assistant-failure-log-20261121-1712.mjs']);
assert.deepEqual(sourceCommandsForChangedPaths(['scripts/lib/pages-closure-historical-test-input.mjs']),[]);
assert.deepEqual(sourceCommandsForChangedPaths(['scripts/audit-cloudflare-trip-storage.mjs']),
  ['node scripts/test-hybrid-trip-storage-4.0.287.mjs']);
assert.deepEqual(sourceCommandsForChangedPaths(['scripts/audit-pages-artifact-privacy.mjs',
  'scripts/build-forecast-share-projection.mjs','scripts/verify-ravscore-operational-pages-deployment.mjs']),
  ['node scripts/test-pages-artifact-privacy.mjs','node scripts/test-forecast-share-projection.mjs',
    'node scripts/test-ravscore-operational-pages-deployment.mjs --public-verification-only']);
assert.deepEqual(sourceCommandsForChangedPaths(['scripts/verify-code-only-migration-plan.mjs',
  'scripts/lib/account-erasure-outbox-native-fixture.mjs','scripts/test-account-erasure-outbox.mjs']),
  ['node --test scripts/test-account-erasure-outbox.mjs']);
assert.deepEqual(sourceCommandsForChangedPaths(['supabase/functions/trip-log/index.ts',
  'supabase/functions/_shared/account-lifecycle.js','supabase/functions/_shared/inactivity-notice-mail.mjs']),
  ['node --test scripts/test-user-account-trip-log-4.0.264.mjs',
    'node --test scripts/test-delete-trip-owner-data-readback.mjs']);
for(const path of ['scripts/audit-pages-artifact-unreviewed.mjs','supabase/functions/trip-log/unreviewed.ts'])
  assert.throws(()=>sourceCommandsForChangedPaths([path]),/SOURCE_CHANGED_OWNER_REQUIRED/);
assert.throws(()=>sourceCommandsForChangedPaths(['../arbitrary.mjs']));
assert.throws(()=>sourceCommandsForChangedPaths(['unowned-source.mjs']),/SOURCE_CHANGED_OWNER_REQUIRED/);
assert.equal(isOnlyReleaseVersionChange('import x from "a?v=4.0.600"','import x from "a?v=4.0.601"','4.0.600','4.0.601'),true);
for(const value of ['import y from "a?v=4.0.601"','import x from "a?v=4.0.601";extra',
  'import x from "a?v=4.0.601"\0','import x from "a?v=4.0.601"\uFFFD'])
  assert.equal(isOnlyReleaseVersionChange('import x from "a?v=4.0.600"',value,'4.0.600','4.0.601'),false);
for(const [before,after] of [
  ['} from "./a.js?lang=da&v=4.0.600#asset";','} from "./a.js?lang=da&v=4.0.601#asset";'],
  ['<script src="./app.js?v=4.0.600"></script>','<script src="./app.js?v=4.0.601"></script>'],
  ['  <link href="./style.css?v=4.0.600" rel="stylesheet">','  <link href="./style.css?v=4.0.601" rel="stylesheet">'],
])assert.equal(isOnlyReleaseVersionChange(before,after,'4.0.600','4.0.601'),true);
for(const before of [
  "if(version==='4.0.600')return fallback;",
  "if(version>='4.0.600')activate();",
  "const minimumVersion='4.0.600';",
  '{"version":"4.0.600"}',
  "const cache='?v=4.0.600';",
  "if(html==='<script src=\"a.js?v=4.0.600\"></script>')activate();",
  "import('./module.js').then(()=>check('from \"a?v=4.0.600\"'));",
  'import x from "a?v=4.0.600";\nconst minimumVersion="4.0.600";',
  'import x from "a?v=4.0.600-extra";',
])assert.equal(isOnlyReleaseVersionChange(before,before.replaceAll('4.0.600','4.0.601'),'4.0.600','4.0.601'),false);
console.log('Current source driver: eight fixed commands, actual changed natural owners, unique execution, red preconditions and failures preserved; historical and SQL proof not claimed.');
