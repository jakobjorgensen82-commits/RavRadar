import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateRavScoreDispatchContract } from './lib/ravscore-dispatch-contract.mjs';

const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const workflow = read('.github/workflows/update-and-deploy.yml');
const pkg = JSON.parse(read('package.json'));
const releaseGate = read('scripts/release-gate.mjs');
const decision = read('docs/rdks/10_DECISIONS/DEC-0109-ONE-TIME-CANDIDATE-G-GAP-RECONSTRUCTION.md');

for (const retiredPath of [
  'scripts/one-time-candidate-g-gap-reconstruction.mjs',
  'scripts/test-one-time-candidate-g-gap-reconstruction-4.0.311.mjs',
  'scripts/test-one-time-candidate-g-gap-workflow-4.0.311.mjs',
  'data/admin/candidate-g-one-time-gap-reconstruction-20260829.json',
]) {
  assert.equal(fs.existsSync(retiredPath), false, `${retiredPath} must remain retired`);
}

for (const forbidden of [
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
]) {
  assert.equal(workflow.includes(forbidden), false, `production workflow must not expose retired marker: ${forbidden}`);
}

const baseDispatch = {
  force: 'false',
  geometryPilot: 'false',
  geometryNational: 'false',
  rollbackMode: 'none',
  rollbackConfirmation: '',
  returnRequested: 'false',
  returnConfirmation: '',
};
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
    () => validateRavScoreDispatchContract({ ...baseDispatch, ...retiredInput }),
    /permanently retired/,
    `legacy dispatch field must fail closed: ${Object.keys(retiredInput)[0]}`,
  );
}

assert.equal(pkg.scripts['test:candidate-g-gap-reconstruction'], undefined);
assert.equal(pkg.scripts['test:candidate-g-gap-workflow'], undefined);
assert.equal(pkg.scripts['test:candidate-g-gap-contract'], undefined);
assert.match(pkg.scripts['test:workflow-action-contracts'] ?? '', /test:candidate-g-gap-retirement/);
assert.match(pkg.scripts['validate:source'] ?? '', /test:workflow-action-contracts/);
assert.match(releaseGate, /test:candidate-g-gap-retirement/);

// Historical read/quality compatibility remains intentionally available. It
// cannot create reconstructed state, but it must reject or classify legacy
// evidence without deleting already stored user history.
const candidateState = read('js/core/ravscore-candidate-g-state-pipeline.js');
const trustContract = read('js/core/ravscore-evidence-trust-contract.js');
const regimeMemory = read('js/core/ravscore-regime-memory.js');
const updateWeather = read('scripts/update-weather.mjs');
const tripMigration = read('scripts/apply-candidate-g-trip-quality-migration.mjs');
assert.match(candidateState, /CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION/);
assert.match(candidateState, /isReconstructedTransportEvidence/);
assert.match(trustContract, /RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS/);
assert.match(regimeMemory, /RECONSTRUCTED_DERIVED_NOT_MEASURED/);
assert.match(updateWeather, /refuses Candidate G source with active reconstructed evidence trust/);
assert.match(updateWeather, /refuses Candidate G schema 2\.1 or reconstructed transport samples/);
assert.match(tripMigration, /ravscore-reconstructed-derived-evidence/);
assert.equal(fs.existsSync('supabase/migrations/20260829_candidate_g_reconstructed_trip_exclusion.sql'), true);

// These are separate, still-authorized safety paths and must not be removed by
// retirement of the abandoned incident.
assert.match(workflow, /ravscore_candidate_g_rollback_mode/);
assert.match(workflow, /Resolve the one-time Candidate G bootstrap gate/);
assert.match(decision, /Historisk, tilbagetrukket uden anvendelse og erstattet af DEC-0111/);
assert.match(decision, /må ikke eksekveres/i);

console.log('Candidate G gap reconstruction retirement: no production entrypoint; historical read/quality compatibility preserved.');
