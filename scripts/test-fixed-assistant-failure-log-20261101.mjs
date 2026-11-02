import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { reviewedFixedAssistantFailureLegacyWorkflow, reviewedFixedAssistantFailureLegacyRegistry, reviewedFixedAssistantFailureBeforeBaselineHintRegistry, reviewedFixedAssistantFailureBeforePrSourceReadGrantRegistry, reviewedFixedAssistantFailureBeforePrivateStudyRegistry } from './lib/fixed-assistant-failure-workflow-review.mjs';

// One normal offline caller target. No hosted logs, SQL engine or real token.
const text = async file => (await fs.readFile(new URL('../' + file, import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const workflow = await text('.github/workflows/deploy-trip-storage.yml');
const edge = await text('supabase/functions/ravradar-assistant/index.ts');
const contract = await text('supabase/functions/_shared/rav-assistant-contract.ts');
const route = 'fixed-assistant-failure-log-read-20261101';
assert.equal(workflow.split('          - ' + route + '\n').length, 2);
const readJob = workflow.slice(workflow.indexOf('  read-fixed-supabase-metadata:'), workflow.indexOf('  reject-unknown-operation:'));
assert.match(readJob, new RegExp("inputs.operation == '" + route + "'"));
for (const expression of [/GITHUB_RUN_ATTEMPT" = 1/, /weather-source-gate\.mjs check/,
  /steps\.fixed_read_source\.outputs\.required.*false/, /check-fixed-supabase-account-read-idle\.mjs/]) assert.match(readJob, expression);
assert.equal((readJob.match(/git fetch --no-tags origin \+refs\/heads\/main:refs\/remotes\/origin\/main/g) ?? []).length, 2);
assert.doesNotMatch(readJob, /--depth|--shallow|--deepen/);
assert.equal((readJob.match(/git rev-parse origin\/main\^\{commit\}/g) ?? []).length, 2);
assert.ok(readJob.indexOf('check-fixed-supabase-account-read-idle.mjs') < readJob.indexOf('node scripts/read-fixed-assistant-failure-log-20261101.mjs'));
assert.match(readJob, /if: inputs\.operation == 'fixed-assistant-failure-log-read-20261101'\n        timeout-minutes: 1\n        run: node scripts\/read-fixed-assistant-failure-log-20261101\.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
assert.doesNotMatch(readJob, /SUPABASE_DB_PASSWORD|SERVICE_ROLE|CLOUDFLARE_API|continue-on-error/);
for (const historical of ['typed-trip-catalog-read','fixed-public-rate-log-read',
  'fixed-public-rate-log-read-20261013','fixed-public-rate-console-read-20261015',
  'fixed-storage-upload-log-read-20261013']) assert.ok(readJob.includes("inputs.operation == '" + historical + "'"));
const unknown = workflow.slice(workflow.indexOf('  reject-unknown-operation:'), workflow.indexOf('  repair-existing-worker:'));
assert.ok(unknown.includes("inputs.operation != '" + route + "'"));

// The new caller above always sees raw current source. Historical consumers
// receive only this exact whole reviewed transition, never an arbitrary strip.
const digest = value => createHash('sha256').update(value).digest('hex');
const review = JSON.parse(await text('scripts/lib/fixed-assistant-failure-workflow-review.json'));
assert.equal(review.sourceHead, '14ade133b7f3b9557f312630a5b557086245b938');
// The real source-proof callers inherit exactly these three read grants.
const readPermission = review.sourceProofReadPermission;
assert.equal(digest(workflow), readPermission.afterSha256);
function assertSourceProofReadPermission(source) {
  assert.deepEqual(source.match(/^permissions:\n(?:  [^\n]+\n)+/gm) ?? [],
    ['permissions:\n  contents: read\n  actions: read\n  pull-requests: read\n']);
  assert.doesNotMatch(source, /^[ \t]+permissions:/m, 'source-proof jobs must inherit the reviewed top-level grants');
}
assertSourceProofReadPermission(workflow);
for (const altered of [workflow.replace('  pull-requests: read\n', ''),
  workflow.replace('  pull-requests: read', '  pull-requests: write'),
  workflow.replace('  pull-requests: read', '  pull-requests: read\n  issues: read'),
  workflow.replace('  deploy-trip-storage:\n', '  deploy-trip-storage:\n    permissions: {}\n')]) {
  assert.notEqual(altered, workflow);assert.throws(() => assertSourceProofReadPermission(altered));
}
const beforeReadPermission = workflow.replace(readPermission.after, () => readPermission.before);
assert.equal(digest(beforeReadPermission), review.workflowAfterSha256);
const legacyWorkflow = reviewedFixedAssistantFailureLegacyWorkflow(workflow);
assert.equal(digest(legacyWorkflow), review.workflowBeforeSha256);
assert.equal(reviewedFixedAssistantFailureLegacyWorkflow(beforeReadPermission), legacyWorkflow);
assert.equal(reviewedFixedAssistantFailureLegacyWorkflow(legacyWorkflow), legacyWorkflow);
assert.equal(reviewedFixedAssistantFailureLegacyWorkflow(workflow.replaceAll('\n','\r\n')), legacyWorkflow);
const legacyReadJob = legacyWorkflow.slice(legacyWorkflow.indexOf('  read-fixed-supabase-metadata:'), legacyWorkflow.indexOf('  reject-unknown-operation:'));
assert.doesNotMatch(legacyReadJob, /fixed-assistant-failure-log-read-20261101/);
let workflowInverseCases = 4;
for (const [before,after] of [
  ['test "$GITHUB_RUN_ATTEMPT" = 1','test "$GITHUB_RUN_ATTEMPT" = 2'],
  ['node scripts/weather-source-gate.mjs check','node scripts/weather-source-gate.mjs unknown'],
  ['node scripts/check-fixed-supabase-account-read-idle.mjs','node scripts/check-fixed-supabase-account-read-idle.mjs --unknown'],
  [route,route+'-unknown'],
  ['  pull-requests: read','  pull-requests: write'],
]) {
  assert.notEqual(workflow.replace(before,after),workflow);
  assert.throws(()=>reviewedFixedAssistantFailureLegacyWorkflow(workflow.replace(before,after)), /FIXED_ASSISTANT_WORKFLOW_UNREVIEWED_BYTES/);
  workflowInverseCases++;
}

// Execute only the two actual historical oracle bodies, not their broad test
// programs. Both fail on the raw additive workflow and pass after exact inverse.
const integrated = await text('scripts/test-integrated-cutover-readiness.mjs');
const integratedStart = integrated.indexOf('const typedConsoleReadStep=');
const integratedEnd = integrated.indexOf('// Actual fixed reader idle guard',integratedStart);
assert(integratedStart >= 0 && integratedEnd > integratedStart);
const integratedOracle = integrated.slice(integratedStart,integratedEnd);
assert.equal(digest(integratedOracle),review.historicalOracleSha256.integrated);
assert.throws(()=>runInNewContext(integratedOracle,{assert,typedActualReadJob:readJob}), /two unchanged historical readers/);
runInNewContext(integratedOracle,{assert,typedActualReadJob:legacyReadJob});
const sourceValidation = await text('scripts/test-source-validation-once.mjs');
const sourceStart = sourceValidation.indexOf('const consoleOperation =');
const sourceEnd = sourceValidation.indexOf('\nconsole.log(`Source validation:',sourceStart);
const sourceOracle = sourceValidation.slice(sourceStart,sourceEnd);
assert(sourceStart >= 0 && sourceEnd > sourceStart);
assert.equal(digest(sourceOracle),review.historicalOracleSha256.sourceValidation);
const grammarStart = sourceValidation.indexOf('function operationAllows(job,operation)');
const grammarEnd = sourceValidation.indexOf('\n}\n',grammarStart)+3;
const grammar = sourceValidation.slice(grammarStart,grammarEnd);
const jobsStart = sourceValidation.indexOf('const fixedJobsSource =');
const jobsEnd = sourceValidation.indexOf('// A source fallback',jobsStart);
const jobsParser = sourceValidation.slice(jobsStart,jobsEnd);
assert(grammarStart >= 0 && grammarEnd > grammarStart && jobsStart >= 0 && jobsEnd > jobsStart);
const ci = await text('.github/workflows/validate-pull-request.yml');
const runSourceOracle = current => runInNewContext(grammar+'\n'+jobsParser+'\n'+sourceOracle,{
  assert,fixedWorkflow:current,
  actualFixedReadJob:current.slice(current.indexOf('  read-fixed-supabase-metadata:'),current.indexOf('  reject-unknown-operation:')),
  fs:{readFileSync(file,encoding){assert.equal(file,'.github/workflows/validate-pull-request.yml');assert.equal(encoding,'utf8');return ci;}},
});
assert.throws(()=>runSourceOracle(workflow),error=>error.code==='ERR_ASSERTION'&&error.actual===5&&error.expected===4);
runSourceOracle(legacyWorkflow);

// The new registry has its own exact additive proof. The completed admin
// fixture remains pinned to its original reviewed 14ade133 CODE and DATA.
const actualRegistryRaw = await text('scripts/lib/source-impact-domain-owners-594.json');
const registrySuccessor = review.registrySourceProofSuccessor;
const registryBindingSuccessor = review.registryBindingSuccessor;
const registryWorkflow066Successor = review.registryWorkflow066Successor;
const registryBaselineHintSuccessor = review.registryBaselineHintSuccessor;
const registryPrSourceReadGrantSuccessor = review.registryPrSourceReadGrantSuccessor;
function assertBeforePrSourceReadGrantRegistry(source) {
  assert.equal(digest(source), registryBaselineHintSuccessor.afterSha256, 'ACTUAL_SOURCE_PROOF_REGISTRY_BYTES');
  const registryDocument = JSON.parse(source);
  assert.deepEqual(registryBaselineHintSuccessor.ownerAdditions, [
    {
      "path": "scripts/test-source-impact-workflow.mjs",
      "domains": [
        "controls"
      ],
      "controlQualification": true,
      "commands": [
        [
          "controls",
          "node scripts/test-source-impact-workflow.mjs"
        ]
      ]
    },
    {
      "path": "scripts/lib/archived-weather-restart-workflow-review.mjs",
      "domains": [
        "controls"
      ],
      "controlQualification": true,
      "commands": [
        [
          "controls",
          "node --test scripts/test-archived-weather-restart-workflow.mjs"
        ],
        [
          "controls",
          "node scripts/test-code-only-public-runtime.mjs"
        ],
        [
          "controls",
          "node scripts/source-critical-gate.mjs"
        ]
      ]
    },
    {
      "path": "scripts/test-archived-weather-restart-workflow.mjs",
      "domains": [
        "controls"
      ],
      "controlQualification": true,
      "commands": [
        [
          "controls",
          "node --test scripts/test-archived-weather-restart-workflow.mjs"
        ]
      ]
    }
  ]);
  const ownersBeforeBaselineHint = registryDocument.owners.slice(0, registryBaselineHintSuccessor.ownersBeforeCount);
  assert.equal(registryDocument.owners.length,
    registryBaselineHintSuccessor.ownersBeforeCount + registryBaselineHintSuccessor.ownerAdditions.length);
  assert.deepEqual(registryDocument.owners.slice(registryBaselineHintSuccessor.ownersBeforeCount), registryBaselineHintSuccessor.ownerAdditions);
  assert.equal(digest(JSON.stringify(ownersBeforeBaselineHint)), registryBaselineHintSuccessor.ownersBeforeArraySha256);
  assert(registryDocument.controlSuite.includes('node scripts/test-source-impact-workflow.mjs'));
  const sourceKeys = Object.keys(registryDocument.sources);
  const sourceKeysBeforeBaselineHint = sourceKeys.slice(0, registryBaselineHintSuccessor.sourcesBeforeCount);
  assert.equal(registryBaselineHintSuccessor.sourceAdditions.length, 15);
  assert.equal(sourceKeys.length, registryBaselineHintSuccessor.sourcesBeforeCount + registryBaselineHintSuccessor.sourceAdditions.length);
  assert.equal(digest(JSON.stringify(sourceKeysBeforeBaselineHint)), registryBaselineHintSuccessor.sourcesBeforeKeysSha256);
  assert.deepEqual(sourceKeys.slice(registryBaselineHintSuccessor.sourcesBeforeCount), registryBaselineHintSuccessor.sourceAdditions.map(row => row.path));
  for (const addition of registryBaselineHintSuccessor.sourceAdditions)
    assert.equal(digest(JSON.stringify(registryDocument.sources[addition.path])), addition.definitionSha256);
  const resourcesBeforeBaselineHint = registryDocument.resourceFiles.slice(0, registryBaselineHintSuccessor.resourceFilesBeforeCount);
  assert.equal(registryBaselineHintSuccessor.resourceFileAdditions.length, 32);
  assert.equal(registryDocument.resourceFiles.length, registryBaselineHintSuccessor.resourceFilesBeforeCount + registryBaselineHintSuccessor.resourceFileAdditions.length);
  assert.equal(digest(JSON.stringify(resourcesBeforeBaselineHint)), registryBaselineHintSuccessor.resourceFilesBeforeArraySha256);
  assert.deepEqual(registryDocument.resourceFiles.slice(registryBaselineHintSuccessor.resourceFilesBeforeCount), registryBaselineHintSuccessor.resourceFileAdditions);
  for (const addition of registryBaselineHintSuccessor.surfaceAdditions) {
    const values = registryDocument.sources[addition.owner][addition.field];
    assert.equal(values.length, addition.beforeCount + addition.values.length);
    assert.deepEqual(values.slice(addition.beforeCount), addition.values);
    assert.equal(digest(JSON.stringify(values.slice(0, addition.beforeCount))), addition.beforeArraySha256);
  }
  const previousRegistryRaw = reviewedFixedAssistantFailureBeforeBaselineHintRegistry(source);
  assert.equal(digest(previousRegistryRaw), registryWorkflow066Successor.afterSha256, 'ACTUAL_SOURCE_PROOF_REGISTRY_BYTES');
  assert.equal(registryWorkflow066Successor.ownersBeforeCount, registrySuccessor.counts.owners);
  assert.equal(ownersBeforeBaselineHint.length,
    registryWorkflow066Successor.ownersBeforeCount + registryWorkflow066Successor.ownerAdditions.length);
  assert.deepEqual(ownersBeforeBaselineHint.slice(registryWorkflow066Successor.ownersBeforeCount),
    registryWorkflow066Successor.ownerAdditions);
  assert.equal(digest(JSON.stringify(ownersBeforeBaselineHint.slice(0, registryWorkflow066Successor.ownersBeforeCount))),
    registryWorkflow066Successor.ownersBeforeArraySha256);
  for (const ordinaryStageAddition of registryWorkflow066Successor.surfaceAdditions) {
    const ordinaryStageValues = registryDocument.sources[registryWorkflow066Successor.owner][ordinaryStageAddition.field];
    assert.equal(ordinaryStageValues.length, ordinaryStageAddition.beforeCount + 1);
    assert.deepEqual(ordinaryStageValues.slice(ordinaryStageAddition.beforeCount), [ordinaryStageAddition.sha256]);
    assert.equal(digest(JSON.stringify(ordinaryStageValues.slice(0, ordinaryStageAddition.beforeCount))),
      ordinaryStageAddition.beforeArraySha256);
  }
  const actualAuditBindings = registryDocument.sources[registryBindingSuccessor.owner].bindingSurfaces;
  assert.equal(actualAuditBindings.length, registryBindingSuccessor.beforeBindingCount + 6);
  assert.deepEqual(actualAuditBindings.slice(registryBindingSuccessor.beforeBindingCount), registryBindingSuccessor.bindingHashes);
  assert.equal(digest(JSON.stringify(actualAuditBindings.slice(0, registryBindingSuccessor.beforeBindingCount))),
    registryBindingSuccessor.beforeBindingsArraySha256);
  assert.deepEqual([ownersBeforeBaselineHint.length, sourceKeysBeforeBaselineHint.length, resourcesBeforeBaselineHint.length],
    [registrySuccessor.counts.owners + registryWorkflow066Successor.ownerAdditions.length, registrySuccessor.counts.sources, registrySuccessor.counts.resourceFiles]);
  for (const owner of registrySuccessor.controlOwners)
    assert.deepEqual(registryDocument.owners.filter(row => row.path === owner.path), [owner]);
  assert.deepEqual(registryDocument.exactSourceTransitions[registrySuccessor.transitionOwner],
    [...registrySuccessor.preservedHistoricalPairs, ...registrySuccessor.transitionPairs]);
  return registryDocument;
}
// Raw new registry proof first; all old assertions below still see exact c9d137.
function assertPrivateStudyRawRegistry(privateStudyRaw) {
  const privateStudyDescriptor = review.registryPrivateStudyEnableNativeSuccessor;
  assert.equal(privateStudyDescriptor.kind, 'EXACT_PRIVATE_STUDY_ENABLE_NATIVE785_REGISTRY_SUCCESSOR');
  assert.equal(digest(privateStudyRaw), privateStudyDescriptor.afterSha256, 'PRIVATE_STUDY_ACTUAL_REGISTRY_BYTES');
  assert.equal(privateStudyDescriptor.beforeSha256, registryPrSourceReadGrantSuccessor.afterSha256);
  assert.deepEqual(privateStudyDescriptor.additiveEdits.filter(entry=>entry.kind==='owner').map(entry=>entry.entry), [{"path": "scripts/verify-cloudflare-trip-gateway.mjs", "domains": ["d1"], "controlQualification": true, "commands": [["d1", "node scripts/test-trip-storage-edge-transient-retry.mjs"]]}, {"path": "scripts/test-trip-storage-edge-transient-retry.mjs", "domains": ["d1"], "controlQualification": true, "commands": [["d1", "node scripts/test-trip-storage-edge-transient-retry.mjs"]]}]);
  assert.deepEqual(privateStudyDescriptor.additiveEdits.filter(entry=>entry.kind==='resource').map(entry=>entry.path), ["cloudflare/trip-gateway/migrations/003_owner_erasure_insert_guard.sql", "cloudflare/trip-gateway/worker-legacy-erasure.test-fixture.js"]);
  assert.deepEqual(privateStudyDescriptor.additiveEdits.filter(entry=>entry.path==='scripts/native-postgres-evidence.mjs'), [{"kind": "sourceArrayAppend", "path": "scripts/native-postgres-evidence.mjs", "key": "dependencySurfaces", "added": ["484f1bde8a24f00960f64c901c811fe773c9af48c53556779b3c6582a60d831e", "7dbfa1428a9b248c6686edd8ce91af7cc01b6cd9baf0145d1018233e3863d111", "c3ee660bec76a9520e353bd78dc3e6096e5f342b9bb06b469f181639bf49934c", "cc9d8cf54dccd81099966cfc25823315dae4f34a30e853f20c75e72fe422fb1d"]}, {"kind": "sourceArrayAppend", "path": "scripts/native-postgres-evidence.mjs", "key": "bindingSurfaces", "added": ["6ed1f2063a70505ac7ead67b9cedc3f596f9c8b18a6b05df96d7aca3694738db", "4e0c7363e700637f03a67acb02a50afd29c6d1207b973c89084ea9b344e2a390", "597b9a0a4c44d118ececdafb32997a83667381e91975d4617346a66be6f731b8"]}]);
  assert.equal(privateStudyDescriptor.fixtureSourceSha256, '2ab5e3a34d8ca07e09d448ad36d979251484b1a9cdfe34138a8761d16570a191');
  assert.deepEqual(privateStudyDescriptor.additiveEdits.filter(entry=>entry.path==='scripts/test-source-impact-domain-plan.mjs'), [{"kind": "sourceArrayAppend", "path": "scripts/test-source-impact-domain-plan.mjs", "key": "dependencySurfaces", "added": ["eec69502819334977a96b04dca5d96f32a15d36b7c31bb7db6dbeb57849324b4", "e681c680e1757a581c4fa1b56e16a6b3fb09d62f7f70e86ab08ce7b746c8ee06", "3cd4ca49a7af6ab92d8a9c1eb154275c17bbfcb4c8cb286e1d56566a044fdca6", "0c58b85758283d5f3c31c8bd1c539888d0a4480a8a793aa70c2b7bdb4e2b3303", "5b33f36f4829cf28b8974bc78922d2451f11db6558b3802177622cf254df23d5", "6deef227377f53f34543f214c5c5ce22ebdc7210142ee1031374b1b114f981b1", "65b2158eb77142cf4b81dabdab9650418efa449f8708da94ab5775b5d39f130c", "e0618cee256f7ae405776d48fbd09218508dbfa464accce8b9053fea15f87f25", "217aba223c66c0cc1224cadf118e5c3814273e30d76e985e1e514f59fd2c3b55", "acfdb897402786c772c01c484063cba179ce4a29221cac3c27bd39051632f78b", "542ef9d319de1f7d3f28ddecf9e8a0c0ec2234e6e8e2d534a2a0489e31530fd5", "2ba3ed2d56c5dcad880559cffd1f7e60d92207ba27511d419eca996203ae43cd", "230f3319081fb5d93ea64b200dae46232ee32efd1d5f78f0b7d516f1b12ac6e4", "11f58727764bea7aa95ff3cbf24deeaebbe33ee080a46ae953779ba6c5d05095", "c399be3fbe71662a02c7c951472b9767a0b86c6790adb99a6c63bfe56b00bbec", "985503397fde7c96c51d410003ac434dafabac0293c58a05fee61ac985602f40", "24a1ac8df76079b04bec63a41cdb4b0ab4aab40b43bc18432937dc5aeccda4f7", "aa3dc34177ed0636d7d3e2f93a9a4aabcfcdf37bcb694291e067b13a3fb5b495", "5bafd37b5b715742b57ccfe41d405ca181f1d97d8a978ce60c7f10acc8e6f89a", "bb591d8c097393f7a0b186d72734a236eca5885702fc450fe1173758f511520e", "0fb6575f37c7da68ddc8b6e16bf6da273c4f4ecbbb6c617b0548566d75d582f2", "137568f318aa025199c8df26eb4da899b34c0b4c3236309c7fe7c09c140e0972", "78550d15ea15803bc4c23a294de21290569a1c68e0cb68d89d9432f8c4d59387", "a50e19f15503af5995e10f27bb575356808eb8b8742fba2ab67a5abf787f97b5", "36ac9960a0f4011c797aad0c01a542c9e2384a542f231ec977cce2dc954b887d"]}, {"kind": "sourceArrayAppend", "path": "scripts/test-source-impact-domain-plan.mjs", "key": "bindingSurfaces", "added": ["3378c8f5e91e874ebff76fe43a93a0c841b6362ac90182e2b4c01b8ca3360388"]}]);
  assert.equal(privateStudyDescriptor.assistantContractSourceSha256, '06a081ed30eb549dcb34f2469483f2a92bc43ed5742370404830ce8ab16b886c');
  assert.deepEqual(privateStudyDescriptor.additiveEdits.filter(entry=>entry.path==='supabase/functions/_shared/rav-assistant-contract.ts'), [{"kind": "sourceArrayAppend", "path": "supabase/functions/_shared/rav-assistant-contract.ts", "key": "dependencySurfaces", "added": ["dcb7db126b6ed6f351e7e4ea500bc686efa72f910bdcc278ceb87baeab70af52", "6f3f224228853e368d05339c48209596ce74b325e8fc4a02923ed80c4cf1e865", "7b24d64472107a09ec94502f8176436596d54825470a0c2227707795f74be14c", "8b1aceade22554ab1c67adf5664aaa88442563fdf883b6c892e3a8540066443c", "a214d34d339c84f24bd45f44cd536dcfdfec539127e8af48557b157b8b1e5825"]}]);
  assert.equal(privateStudyDescriptor.additiveEdits.filter(entry=>entry.kind==='source').length, 1);
  assert.equal(privateStudyDescriptor.additiveEdits.find(entry=>entry.kind==='source').path, 'scripts/test-trip-storage-edge-transient-retry.mjs');
  const privateStudyBeforeRaw = reviewedFixedAssistantFailureBeforePrivateStudyRegistry(privateStudyRaw);
  assert.equal(digest(privateStudyBeforeRaw), privateStudyDescriptor.beforeSha256);
  const privateStudyExpected = JSON.parse(privateStudyBeforeRaw);
  for (const privateStudyEdit of privateStudyDescriptor.additiveEdits) {
    if (privateStudyEdit.kind==='owner') privateStudyExpected.owners.push(privateStudyEdit.entry);
    else if (privateStudyEdit.kind==='source') {
      assert.equal(Object.hasOwn(privateStudyExpected.sources, privateStudyEdit.path), false);
      privateStudyExpected.sources[privateStudyEdit.path]=privateStudyEdit.entry;
    } else if (privateStudyEdit.kind==='resource') privateStudyExpected.resourceFiles.push(privateStudyEdit.path);
    else {
      assert.equal(privateStudyEdit.kind, 'sourceArrayAppend');
      for (const privateStudyHash of privateStudyEdit.added) assert(!privateStudyExpected.sources[privateStudyEdit.path][privateStudyEdit.key].includes(privateStudyHash));
      privateStudyExpected.sources[privateStudyEdit.path][privateStudyEdit.key].push(...privateStudyEdit.added);
    }
  }
  assert.deepEqual(JSON.parse(privateStudyRaw), privateStudyExpected, 'PRIVATE_STUDY_ONLY_EXACT_ADDITIONS');
  assert.equal(digest(JSON.stringify(privateStudyExpected,null,2)+'\n'), privateStudyDescriptor.afterSha256);
  return privateStudyBeforeRaw;
}

function assertActualRegistry(source) {
  if (digest(source) === review.registryPrivateStudyEnableNativeSuccessor.afterSha256)
    source = assertPrivateStudyRawRegistry(source);
  assert.equal(digest(source), registryPrSourceReadGrantSuccessor.afterSha256, 'ACTUAL_SOURCE_PROOF_REGISTRY_BYTES');
  const document = JSON.parse(source);
  assert.deepEqual(registryPrSourceReadGrantSuccessor.ownerAdditions, [
    {
      "path": ".github/workflows/validate-pull-request.yml",
      "domains": [
        "controls"
      ],
      "controlQualification": true,
      "commands": [
        [
          "controls",
          "node scripts/test-source-impact-workflow.mjs"
        ]
      ],
      "exactSourceTransition": true
    },
    {
      "path": "scripts/lib/source-impact-workflow-review.mjs",
      "domains": [
        "controls"
      ],
      "controlQualification": true,
      "commands": [
        [
          "controls",
          "node scripts/test-source-impact-workflow.mjs"
        ]
      ]
    }
  ]);
  const ownerPrefix = document.owners.slice(0, registryPrSourceReadGrantSuccessor.ownersBeforeCount);
  assert.equal(document.owners.length, registryPrSourceReadGrantSuccessor.ownersBeforeCount + 2);
  assert.equal(digest(JSON.stringify(ownerPrefix)), registryPrSourceReadGrantSuccessor.ownersBeforeArraySha256);
  assert.deepEqual(document.owners.slice(registryPrSourceReadGrantSuccessor.ownersBeforeCount), registryPrSourceReadGrantSuccessor.ownerAdditions);
  assert.deepEqual(registryPrSourceReadGrantSuccessor.transitionPairs, ["3838f9009f7df679581cea1a54eeba535bf4b0c90ae6e786691ba46dedd5afc5/45b1a6f3dba31711b8fa8d4cff8776c3f7daa024acc798c4da76bee4615eced1"]);
  const transitionEntries = Object.entries(document.exactSourceTransitions);
  const oldTransitions = Object.fromEntries(transitionEntries.slice(0, registryPrSourceReadGrantSuccessor.transitionsBeforeCount));
  assert.equal(transitionEntries.length, registryPrSourceReadGrantSuccessor.transitionsBeforeCount + 1);
  assert.equal(digest(JSON.stringify(Object.keys(oldTransitions))), registryPrSourceReadGrantSuccessor.transitionsBeforeKeysSha256);
  assert.equal(digest(JSON.stringify(oldTransitions)), registryPrSourceReadGrantSuccessor.transitionsBeforeObjectSha256);
  assert.deepEqual(transitionEntries.slice(registryPrSourceReadGrantSuccessor.transitionsBeforeCount),
    [[registryPrSourceReadGrantSuccessor.transitionOwner, registryPrSourceReadGrantSuccessor.transitionPairs]]);
  const beforeRaw = reviewedFixedAssistantFailureBeforePrSourceReadGrantRegistry(source);
  assert.equal(digest(beforeRaw), registryPrSourceReadGrantSuccessor.beforeSha256);
  const beforeDocument = assertBeforePrSourceReadGrantRegistry(beforeRaw);
  assert.deepEqual(Object.keys(document), Object.keys(beforeDocument));
  for (const key of Object.keys(document)) if (!['owners', 'exactSourceTransitions'].includes(key))
    assert.deepEqual(document[key], beforeDocument[key], 'All other raw registry fields remain exact');
  return document;
}
const actualRegistry = assertActualRegistry(actualRegistryRaw);
for (const altered of [actualRegistryRaw + '\n',
  ...registryPrSourceReadGrantSuccessor.ownerAdditions.map(owner =>
    actualRegistryRaw.replace('"path": "'+owner.path+'"', '"path": "'+owner.path+'-unknown"')),
  actualRegistryRaw.replace(registryPrSourceReadGrantSuccessor.transitionPairs[0], registryPrSourceReadGrantSuccessor.transitionPairs[0]+'0'),
  ...registryBaselineHintSuccessor.ownerAdditions.map(owner =>
    actualRegistryRaw.replace('"path": "'+owner.path+'"', '"path": "'+owner.path+'-unknown"')),
  actualRegistryRaw.replace('"'+registryBaselineHintSuccessor.sourceAdditions[0].path+'": {', '"unknown-source.mjs": {'),
  actualRegistryRaw.replace(JSON.stringify(registryBaselineHintSuccessor.resourceFileAdditions[0]), '"unknown-resource.yml"'),
  ...registryBaselineHintSuccessor.surfaceAdditions.map(addition =>
    actualRegistryRaw.replace(JSON.stringify(addition.values[0]), JSON.stringify(addition.values[0]+'-unknown'))),
  ...registryWorkflow066Successor.ownerAdditions.map(workflow066Owner =>
    actualRegistryRaw.replace('"path": "'+workflow066Owner.path+'"', '"path": "'+workflow066Owner.path+'-unknown"')),
  ...registryWorkflow066Successor.surfaceAdditions.flatMap(ordinaryStageAddition => [
    actualRegistryRaw.replace(ordinaryStageAddition.sha256, ordinaryStageAddition.sha256.slice(1)),
    actualRegistryRaw.replace(ordinaryStageAddition.sha256, '2'.repeat(64)),
    actualRegistryRaw.replace('"'+ordinaryStageAddition.sha256+'"', '"'+ordinaryStageAddition.sha256+'","'+'2'.repeat(64)+'"')]),
  actualRegistryRaw.replace(registryBindingSuccessor.bindingHashes[0], registryBindingSuccessor.bindingHashes[0].slice(1)),
  actualRegistryRaw.replace(registryBindingSuccessor.bindingHashes[0], '0'.repeat(64)),
  actualRegistryRaw.replace('"'+registryBindingSuccessor.bindingHashes[0]+'"', '"'+registryBindingSuccessor.bindingHashes[0]+'","'+'0'.repeat(64)+'"'),
  actualRegistryRaw.replace(actualRegistry.sources[registryBindingSuccessor.owner].bindingSurfaces[0], '1'.repeat(64)),
  actualRegistryRaw.replace(registrySuccessor.transitionPairs[0], registrySuccessor.transitionPairs[0] + '0'),
  JSON.stringify({...actualRegistry, owners:actualRegistry.owners.slice(0,-1)},null,2)+'\n',
  JSON.stringify({...actualRegistry, resourceFiles:[...actualRegistry.resourceFiles,'unknown-resource.txt']},null,2)+'\n']) {
  assert.notEqual(altered, actualRegistryRaw);assert.throws(() => assertActualRegistry(altered));
  assert.throws(() => reviewedFixedAssistantFailureLegacyRegistry(altered), /FIXED_ASSISTANT_REGISTRY_UNREVIEWED_BYTES/);
}
for (const privateStudyMutation of [
  actualRegistryRaw.replace('node scripts/test-trip-storage-edge-transient-retry.mjs', 'node scripts/unknown-private-study.mjs'),
  actualRegistryRaw.replace('484f1bde8a24f00960f64c901c811fe773c9af48c53556779b3c6582a60d831e', '0'.repeat(64)),
  actualRegistryRaw.replace('cloudflare/trip-gateway/worker-legacy-erasure.test-fixture.js', 'unknown-private-resource.js')
]) {
  assert.notEqual(privateStudyMutation, actualRegistryRaw);
  assert.throws(()=>assertActualRegistry(privateStudyMutation));
}
const registryRaw = reviewedFixedAssistantFailureLegacyRegistry(actualRegistryRaw);
assert.throws(() => assertActualRegistry(registryRaw), /ACTUAL_SOURCE_PROOF_REGISTRY_BYTES/);
assert.equal(reviewedFixedAssistantFailureLegacyRegistry(registryRaw), registryRaw);
assert.equal(digest(registryRaw),review.registryAfterSha256);
const registry = JSON.parse(registryRaw), priorRegistry = structuredClone(registry);
for (const owner of review.registryDelta.owners) {
  const index = priorRegistry.owners.findIndex(value=>value.path===owner.path);
  assert(index>=0);assert.deepEqual(priorRegistry.owners[index],owner);priorRegistry.owners.splice(index,1);
}
for (const [file,entry] of Object.entries(review.registryDelta.newSources)) {
  assert.deepEqual(priorRegistry.sources[file],entry);delete priorRegistry.sources[file];
}
for (const [file,fields] of Object.entries(review.registryDelta.sourceArrayAdditions)) for (const [field,values] of Object.entries(fields)) for (const value of values) {
  const index = priorRegistry.sources[file][field].indexOf(value);assert(index>=0);priorRegistry.sources[file][field].splice(index,1);
}
for (const file of review.registryDelta.resourceFiles) {
  const index = priorRegistry.resourceFiles.indexOf(file);assert(index>=0);priorRegistry.resourceFiles.splice(index,1);
}
for (const [file,pairs] of Object.entries(review.registryDelta.exactSourceTransitions)) {
  assert.deepEqual(priorRegistry.exactSourceTransitions[file],pairs);delete priorRegistry.exactSourceTransitions[file];
}
assert.equal(priorRegistry.owners.length,90);
assert.equal(digest(JSON.stringify(priorRegistry,null,2)+'\n'),review.registryBeforeSha256);
assert.match(await text('scripts/test-source-impact-domain-plan.mjs'), /const adminReviewedHead='14ade133b7f3b9557f312630a5b557086245b938'/);

// Exercise the actual logger body. Remove only this exact TypeScript signature.
const signature = 'function reportAssistantFailure(stage: string, upstreamStatus: number | null, rejectionCode: string | null, responseStatus: number) {';
const loggerStart = edge.indexOf(signature), loggerEnd = edge.indexOf('\nDeno.serve(', loggerStart);
assert(loggerStart >= 0 && loggerEnd > loggerStart);
const rejectionBlock = /export const RAV_ASSISTANT_REJECTION_CODES = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(contract);
assert(rejectionBlock);
const codes = [...rejectionBlock[1].matchAll(/"([A-Z_]+)"/g)].map(match => match[1]);
assert.equal(codes.length, 18);
const stagesBlock = /const stages = (\[[^\n]+\]);/.exec(edge.slice(loggerStart, loggerEnd));
assert(stagesBlock);
const stages = [...JSON.parse(stagesBlock[1]), 'UNKNOWN'];
let emitted = null;
const logger = runInNewContext(edge.slice(loggerStart, loggerEnd).replace(signature,
  'function reportAssistantFailure(stage, upstreamStatus, rejectionCode, responseStatus) {')
  + '\nreportAssistantFailure;', {
  RAV_ASSISTANT_REJECTION_CODES: codes,
  console: { warn(marker, value) { emitted = { marker, value: JSON.parse(JSON.stringify(value)) }; } },
});
logger('UPSTREAM_REQUEST', null, null, 504);
assert.equal(emitted.marker, 'RAVRADAR_ASSISTANT_FAILURE');
assert.deepEqual(Object.keys(emitted.value).sort(), ['rejectionCode','responseStatus','schemaVersion','stage','upstreamStatus']);
assert.deepEqual(emitted.value, {schemaVersion:1,stage:'UPSTREAM_REQUEST',responseStatus:504,upstreamStatus:null,rejectionCode:null});
logger('PRIVATE_RAW_STAGE', 999, 'PRIVATE_RAW_CODE', 399);
assert.deepEqual(emitted.value, {schemaVersion:1,stage:'UNKNOWN',responseStatus:null,upstreamStatus:null,rejectionCode:null});

assert.equal(Object.hasOwn(process.env, 'SUPABASE_ACCESS_TOKEN'), false,
  'Never inspect or replace an ambient credential in this offline target');
const originalFetch = globalThis.fetch;
process.env.SUPABASE_ACCESS_TOKEN = 'synthetic-fixed-assistant-NOT-A-CREDENTIAL';
const sample = {stage:'UPSTREAM_REQUEST',responseStatus:504,upstreamStatus:null,rejectionCode:null};
const valid = result => new Response(JSON.stringify({result,error:null}), {status:200});
let requests = 0, cases = 0, sqlCaptured = null;
function inspectSql(sql) {
  if (sqlCaptured !== null) assert.equal(sql, sqlCaptured);
  sqlCaptured = sql;
  assert.match(sql, /^SELECT DISTINCT\n  CASE WHEN stage_raw IN /);
  assert.match(sql, /source = 'function_logs'/);
  assert.match(sql, /timestamp >= '2026-11-01 00:27:03'/);
  assert.match(sql, /timestamp < '2026-11-01 00:27:16'/);
  assert.match(sql, /position\(event_message, 'RAVRADAR_ASSISTANT_FAILURE'\) = 1/);
  assert.match(sql, /LIMIT 8$/);
  assert.doesNotMatch(sql, /route|function_id|UNNEST|JSONExtract|requestId|execution_id|SELECT\s+\*|edge_logs|postgres_logs/);
  const output = sql.slice(0, sql.indexOf('\nFROM'));
  assert.doesNotMatch(output, /event_message|log_attributes|request|payload|question/);
  for (const stage of stages) assert.ok(sql.includes("'" + stage + "'"));
  for (const code of codes) assert.ok(sql.includes(code));
}
// Only literal fixed RE2 pattern contracts are checked here. This is not a
// ClickHouse evaluator, hosted format proof, or synthetic SQL execution claim.
function fixedTextCategories(message) {
  assert(sqlCaptured);
  const patterns = [...sqlCaptured.matchAll(/extract\(event_message,\s*'([^']+)'\)/g)].map(match => match[1]);
  const filters = [...sqlCaptured.matchAll(/match\(event_message,\s*'([^']+)'\)/g)].map(match => match[1]);
  assert.equal(patterns.length, 4); assert.equal(filters.length, 2);
  const expression = pattern => new RegExp(pattern.replaceAll('[[:space:]]', '\\s'));
  if (!message.startsWith('RAVRADAR_ASSISTANT_FAILURE') || !filters.every(pattern=>expression(pattern).test(message))) return [];
  const values = patterns.map(pattern => expression(pattern).exec(message)?.[1] ?? '');
  return [{stage:stages.includes(values[0])?values[0]:'UNKNOWN',
    responseStatus:values[1] === '' || values[1] === 'null'?null:Number(values[1]),
    upstreamStatus:values[2] === '' || values[2] === 'null'?null:Number(values[2]),
    rejectionCode:values[3] || null}];
}
async function runCase(label, responseFactory, expectedStatus, expectedCategories = null) {
  const module = await import('./read-fixed-assistant-failure-log-20261101.mjs?offline_fixed_assistant=' + label);
  let caseRequests = 0;
  globalThis.fetch = async (url, init) => {
    requests++; caseRequests++;
    assert.equal(url.origin, 'https://api.supabase.com');
    assert.equal(url.pathname, '/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
    assert.deepEqual([...url.searchParams.keys()].sort(), ['iso_timestamp_end','iso_timestamp_start','sql']);
    assert.equal(url.searchParams.get('iso_timestamp_start'), '2026-11-01T00:27:03Z');
    assert.equal(url.searchParams.get('iso_timestamp_end'), '2026-11-01T00:27:16Z');
    inspectSql(url.searchParams.get('sql'));
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit');
    assert.equal(init.signal instanceof AbortSignal, true);
    return responseFactory();
  };
  const report = await module.readFixedAssistantFailureLog20261101();
  cases++;
  assert.equal(report.requestStatus, expectedStatus, label);
  assert.equal(report.recordedEventAbsenceProved, false);
  assert.equal(report.privatePayloadLogged, false);
  assert.equal(report.functionName, 'ravradar-assistant');
  assert.deepEqual(report.scope, {startInclusive:'2026-11-01T00:27:03Z',endExclusive:'2026-11-01T00:27:16Z'});
  assert.deepEqual(report.categories, expectedCategories, label);
  assert.equal(report.rowCount, expectedCategories === null ? null : expectedCategories.length);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_RAW|NOT-A-CREDENTIAL|Bearer|requestId|execution_id|question|event_message/);
  assert.equal(caseRequests, 1);
  assert.equal((await module.readFixedAssistantFailureLog20261101()).requestStatus, 'LOG_READ_ALREADY_CONSUMED');
  assert.equal(caseRequests, 1);
}
try {
  await runCase('actual-safe-category', () => valid([sample]), 'RECORDED_CATEGORIES', [sample]);
  logger('UPSTREAM_REQUEST', null, null, 504);
  const deno = 'RAVRADAR_ASSISTANT_FAILURE {\n schemaVersion: 1,\n stage: "UPSTREAM_REQUEST",\n responseStatus: 504,\n upstreamStatus: null,\n rejectionCode: null\n}';
  const json = emitted.marker + ' ' + JSON.stringify(emitted.value);
  for (const [label,message,rows] of [
    ['deno-format',deno,[sample]], ['json-format',json,[sample]],
    ['not-prefix','PRIVATE_RAW_PREFIX '+json,[]],
    ['marker-suffix',json.replace('RAVRADAR_ASSISTANT_FAILURE','RAVRADAR_ASSISTANT_FAILURE_OTHER'),[]],
    ['wrong-schema',json.replace('"schemaVersion":1','"schemaVersion":2'),[]],
    ['unknown-format','RAVRADAR_ASSISTANT_FAILURE PRIVATE_RAW',[]],
    ['unknown-code',deno.replace('rejectionCode: null','rejectionCode: "PRIVATE_RAW_CODE"'),[sample]],
  ]) await runCase(label,()=>valid(fixedTextCategories(message)),rows.length?'RECORDED_CATEGORIES':'NO_MATCHING_FIXED_MARKER_CATEGORIES',rows);
  for (const stage of stages) {
    const row = {...sample,stage};
    await runCase('stage-'+stage,()=>valid([row]),'RECORDED_CATEGORIES',[row]);
  }
  for (const code of codes) {
    logger('RESULT_VALIDATION', 200, code, 502);
    const expected = {stage:'RESULT_VALIDATION',responseStatus:502,upstreamStatus:200,rejectionCode:code};
    await runCase('code-'+code,()=>valid(fixedTextCategories(emitted.marker+' '+JSON.stringify(emitted.value))), 'RECORDED_CATEGORIES',[expected]);
  }
  const seven = stages.map(stage=>({...sample,stage}));
  await runCase('seven-rows',()=>valid(seven),'RECORDED_CATEGORIES',seven);
  await runCase('optional-error',()=>new Response(JSON.stringify({result:[sample]}),{status:200}),'RECORDED_CATEGORIES',[sample]);
  await runCase('null-fields',()=>valid([{stage:'UNKNOWN',responseStatus:null,upstreamStatus:null,rejectionCode:null}]),'RECORDED_CATEGORIES',[{stage:'UNKNOWN',responseStatus:null,upstreamStatus:null,rejectionCode:null}]);
  const failures = [
    ['extra-row',()=>valid([{...sample,event_message:'PRIVATE_RAW_QUESTION'}]),'LOG_ROW_SHAPE'],
    ['stage',()=>valid([{...sample,stage:'PRIVATE_RAW'}]),'LOG_STAGE_NOT_ALLOWED'],
    ['response-type',()=>valid([{...sample,responseStatus:'504'}]),'LOG_RESPONSE_STATUS_NOT_ALLOWED'],
    ['response-range',()=>valid([{...sample,responseStatus:399}]),'LOG_RESPONSE_STATUS_NOT_ALLOWED'],
    ['upstream-range',()=>valid([{...sample,upstreamStatus:600}]),'LOG_UPSTREAM_STATUS_NOT_ALLOWED'],
    ['rejection',()=>valid([{...sample,rejectionCode:'PRIVATE_RAW'}]),'LOG_REJECTION_CODE_NOT_ALLOWED'],
    ['duplicate',()=>valid([sample,sample]),'LOG_CATEGORY_DUPLICATE'],
    ['cap',()=>valid(Array(8).fill(sample)),'LOG_ROW_CAP_REACHED'],
    ['envelope',()=>new Response(JSON.stringify({result:[sample],error:null,PRIVATE_RAW:'PRIVATE_RAW'}),{status:200}),'LOG_ENVELOPE_SHAPE'],
    ['query-error',()=>new Response(JSON.stringify({result:[],error:'PRIVATE_RAW_QUERY'}),{status:200}),'LOG_QUERY_ERROR'],
    ['error-type',()=>new Response(JSON.stringify({result:[],error:{PRIVATE_RAW:1}}),{status:200}),'LOG_ERROR_FIELD_TYPE'],
    ['result-type',()=>valid(null),'LOG_RESULT_TYPE'],
    ['utf8',()=>new Response(Uint8Array.from([255]),{status:200}),'LOG_UTF8_INVALID'],
    ['json',()=>new Response('{PRIVATE_RAW',{status:200}),'LOG_JSON_INVALID'],
    ['http',()=>new Response('PRIVATE_RAW',{status:503}),'LOG_HTTP_REJECTED'],
    ['content-length-shape',()=>new Response('PRIVATE_RAW',{status:200,headers:{'content-length':'oops'}}),'LOG_CONTENT_LENGTH_SHAPE'],
    ['content-length-cap',()=>new Response('PRIVATE_RAW',{status:200,headers:{'content-length':'32769'}}),'LOG_BODY_TOO_LARGE'],
    ['stream-cap',()=>new Response(new Uint8Array(32769),{status:200}),'LOG_BODY_TOO_LARGE'],
    ['missing-body',()=>new Response(null,{status:200}),'LOG_BODY_UNAVAILABLE'],
    ['transport',()=>{throw Error('PRIVATE_RAW_TRANSPORT');},'LOG_TRANSPORT_ERROR'],
    ['held-fetch',()=>new Promise(()=>{}),'LOG_DEADLINE_EXCEEDED'],
    ['held-body',()=>new Response(new ReadableStream({start(){}}),{status:200}),'LOG_DEADLINE_EXCEEDED'],
  ];
  for (const [label,response,expected] of failures) await runCase(label,response,expected);
  const module = await import('./read-fixed-assistant-failure-log-20261101.mjs?offline_fixed_assistant=arguments');
  let extra = 0; globalThis.fetch = async()=>{extra++;throw Error('MUST_NOT_RUN');};
  assert.equal((await module.readFixedAssistantFailureLog20261101({sql:'arbitrary',project:'other',start:'other'})).requestStatus,'LOG_ARGUMENTS_FORBIDDEN');
  assert.equal(extra,0);
  delete process.env.SUPABASE_ACCESS_TOKEN;
  assert.equal((await module.readFixedAssistantFailureLog20261101()).requestStatus,'LOG_CREDENTIAL_UNAVAILABLE');
  assert.equal((await module.readFixedAssistantFailureLog20261101()).requestStatus,'LOG_READ_ALREADY_CONSUMED');
  assert.equal(extra,0);
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.SUPABASE_ACCESS_TOKEN;
}
console.log(JSON.stringify({status:'PASS',fixedReaderCases:cases,controlledGETs:requests,
  workflowInverseCases,historicalOracleBodiesPreserved:true,historicalBeforeFailAfterPass:2,additiveRegistryInverseProved:true,
  realNetwork:0,retries:0,bodyDeadlineMs:10000,maximumResponseBytes:32768,rowCapRejectsAt:8,
  actualLoggerBodyExecuted:true,sqlRegexStringContractsOnly:true,nativeClickHouse:'UNRUN',
  hostedConsoleFormat:'UNRUN',rawPayloadOutput:false}));
