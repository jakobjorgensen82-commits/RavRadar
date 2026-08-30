import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const walkFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
const workflow = read('.github/workflows/update-and-deploy.yml');
const pkg = JSON.parse(read('package.json'));
const releaseGate = read('scripts/release-gate.mjs');
const historicalDecision = read('docs/rdks/10_DECISIONS/DEC-0109-ONE-TIME-CANDIDATE-G-GAP-RECONSTRUCTION.md');
const retirementDecision = read('docs/rdks/10_DECISIONS/DEC-0111-RETIRE-STALE-CANDIDATE-G-GAP-RECONSTRUCTION.md');

const retiredPaths = [
  'scripts/one-time-candidate-g-gap-reconstruction.mjs',
  'scripts/test-one-time-candidate-g-gap-reconstruction-4.0.311.mjs',
  'scripts/test-one-time-candidate-g-gap-workflow-4.0.311.mjs',
  'data/admin/candidate-g-one-time-gap-reconstruction-20260829.json',
];
for (const retiredPath of retiredPaths) {
  assert.equal(fs.existsSync(retiredPath), false, `${retiredPath} must remain retired`);
}

const retiredOperationalMarkers = [
  'candidate_g_gap_reconstruction_mode',
  'candidate_g_gap_inspection_run_id',
  'candidate_g_gap_inspection_artifact_id',
  'candidate_g_gap_descriptor_sha256',
  'candidate_g_gap_apply_run_id',
  'candidate_g_gap_rollback_artifact_id',
  'inspect-candidate-g-one-time-gap',
  'candidate-g-gap-reconstruction-inspection-',
  'candidate-g-gap-reconstruction-rollback-',
  '.cache/candidate-g-gap-reconstruction',
  'one-time-candidate-g-gap-reconstruction.mjs',
  'Apply the descriptor-bound one-time Candidate G reconstruction',
  'Causally remove only the descriptor-bound reconstructed evidence',
  'RRGAP-2026-08-29-CANDIDATE-G-01',
];
for (const forbidden of retiredOperationalMarkers) {
  assert.equal(workflow.includes(forbidden), false, `production workflow must not expose retired marker: ${forbidden}`);
}

const workflowFiles = walkFiles('.github/workflows')
  .filter((file) => /\.ya?ml$/i.test(file));
const productionScriptFiles = walkFiles('scripts')
  .filter((file) => /\.(?:mjs|js|py|ps1)$/i.test(file))
  .filter((file) => !/^test-/i.test(file.split('/').at(-1)))
  .filter((file) => file !== 'scripts/release-gate.mjs');
for (const file of [...workflowFiles, ...productionScriptFiles]) {
  const content = read(file);
  for (const forbidden of retiredOperationalMarkers) {
    assert.equal(content.includes(forbidden), false, `${file} must not expose retired operational marker: ${forbidden}`);
  }
}

assert.equal(pkg.scripts['test:candidate-g-gap-reconstruction'], undefined);
assert.equal(pkg.scripts['test:candidate-g-gap-workflow'], undefined);
assert.equal(
  pkg.scripts['test:candidate-g-gap-retirement'],
  'node scripts/test-candidate-g-gap-reconstruction-retired.mjs',
);
assert.match(pkg.scripts['test:candidate-g-public-recovery'] ?? '', /test:candidate-g-gap-retirement/);
assert.match(pkg.scripts['test:workflow-action-contracts'] ?? '', /test:candidate-g-gap-retirement/);
assert.match(pkg.scripts.validate ?? '', /test:candidate-g-public-recovery/);
assert.match(pkg.scripts['validate:source'] ?? '', /test:workflow-action-contracts/);
assert.match(releaseGate, /test:candidate-g-gap-retirement/);

const productionTargetCondition = "github.event_name != 'workflow_dispatch' || (inputs.geometry_v2_pilot != true && inputs.geometry_v2_national != true && inputs.ravscore_active_shadow != true)";
assert.equal(workflow.split(productionTargetCondition).length - 1, 3);
assert.match(workflow, /CHECK_CURRENT_HOUR: \$\{\{ github\.event_name == 'schedule' \|\| \(github\.event_name == 'workflow_dispatch' && inputs\.force != true/);
for (const marker of [
  "if [ \"$release_version\" = \"4.0.311\" ] || [ \"$release_version\" = \"4.0.312\" ] || [ \"$release_version\" = \"4.0.313\" ] || [ \"$release_version\" = \"4.0.314\" ]",
  'The historical 4.0.311-4.0.314 exact-D1 release interlock is not required for version $release_version.',
  'node scripts/restore-candidate-g-gap-checkpoint.mjs',
  'RavRadar-support-3633.zip',
  'node scripts/candidate-g-continuation-checkpoint.mjs',
  'run: npm run validate',
  'run: npm run release:gate',
]) {
  assert.match(workflow, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.equal(workflow.includes('"4.0.315"'), false, '4.0.315 must not inherit the historical exact-D1 interlock');

const productionPositions = {
  buildJob: workflow.indexOf('\n  build-and-prepare:'),
  weather: workflow.indexOf('name: Update central weather cache'),
  runtime: workflow.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  validate: workflow.indexOf('name: Validate full project after fresh weather and current provenance'),
  releaseGate: workflow.indexOf('name: Run release governance gate after refreshed data validation'),
  pagesBuild: workflow.indexOf('name: Build lean GitHub Pages artifact'),
  pagesUpload: workflow.indexOf('name: Upload GitHub Pages artifact'),
  deployJob: workflow.indexOf('\n  deploy-pages:'),
  pagesDeploy: workflow.indexOf('name: Deploy to GitHub Pages'),
};
for (const [name, position] of Object.entries(productionPositions)) {
  assert.notEqual(position, -1, `normal production path must retain ${name}`);
}
const productionOrder = [
  'buildJob',
  'weather',
  'runtime',
  'validate',
  'releaseGate',
  'pagesBuild',
  'pagesUpload',
  'deployJob',
  'pagesDeploy',
];
for (let index = 1; index < productionOrder.length; index += 1) {
  const before = productionOrder[index - 1];
  const after = productionOrder[index];
  assert.ok(productionPositions[before] < productionPositions[after], `${before} must precede ${after}`);
}
for (const marker of [
  'run: npm run update:weather',
  'run: node scripts/generate-public-conditions.mjs',
  'run: npm run validate',
  'run: npm run release:gate',
  'uses: actions/upload-pages-artifact@v5',
  'needs: build-and-prepare',
  "if: needs.build-and-prepare.outputs.should_deploy == 'true'",
  'uses: actions/deploy-pages@v5',
]) {
  assert.match(workflow, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

// Historical read/quality compatibility remains intentionally available. It
// cannot create reconstructed state, but it must reject or classify legacy
// evidence without deleting already stored user history.
const candidateState = read('js/core/ravscore-candidate-g-state-pipeline.js');
const regimeMemory = read('js/core/ravscore-regime-memory.js');
const updateWeather = read('scripts/update-weather.mjs');
const tripMigration = read('scripts/apply-candidate-g-trip-quality-migration.mjs');
assert.match(candidateState, /CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION/);
assert.match(candidateState, /isReconstructedTransportEvidence/);
assert.match(regimeMemory, /RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS/);
assert.match(regimeMemory, /RECONSTRUCTED_DERIVED_NOT_MEASURED/);
assert.match(updateWeather, /Candidate G reconstructed evidence lacks its sealed incident binding/);
assert.match(updateWeather, /candidateGOneTimeReconstruction/);
assert.match(tripMigration, /ravscore-reconstructed-derived-evidence/);
assert.equal(fs.existsSync('supabase/migrations/20260829_candidate_g_reconstructed_trip_exclusion.sql'), true);

assert.match(historicalDecision, /må ikke eksekveres/i);
assert.match(retirementDecision, /tilbagetrukket uden anvendelse/);
assert.match(retirementDecision, /measured-only/);

console.log('Candidate G gap reconstruction retirement: no production entrypoint; measured recovery and historical trust compatibility preserved.');
