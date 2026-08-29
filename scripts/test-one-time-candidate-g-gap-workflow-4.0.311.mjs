import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowPath = '.github/workflows/update-and-deploy.yml';
const workflow = fs.readFileSync(workflowPath, 'utf8').replace(/\r\n/g, '\n');

function requireMarkers(section, markers, label) {
  for (const marker of markers) {
    assert.ok(section.includes(marker), `${label} mangler ${marker}`);
  }
}

function count(value, marker) {
  return value.split(marker).length - 1;
}

function position(marker) {
  const value = workflow.indexOf(marker);
  assert.notEqual(value, -1, `Workflowet mangler ${marker}`);
  return value;
}

function step(name) {
  const marker = `      - name: ${name}`;
  const start = position(marker);
  const next = workflow.indexOf('\n      - name:', start + marker.length);
  return workflow.slice(start, next === -1 ? workflow.length : next);
}

const inputs = workflow.slice(
  position('      candidate_g_gap_reconstruction_mode:'),
  position('  push:'),
);
requireMarkers(inputs, [
  'default: none',
  'type: choice',
  '          - none',
  '          - inspect',
  '          - apply',
  '          - rollback',
  '          - cleanup',
  'candidate_g_gap_inspection_run_id:',
  'candidate_g_gap_inspection_artifact_id:',
  'candidate_g_gap_descriptor_sha256:',
  'candidate_g_gap_apply_run_id:',
  'candidate_g_gap_rollback_artifact_id:',
], 'Dispatch-inputkontrakten');

const dispatchGate = step('Validate one-time Candidate G reconstruction dispatch contract');
requireMarkers(dispatchGate, [
  "if: github.event_name == 'workflow_dispatch'",
  'none|inspect|apply|rollback|cleanup',
  'test "$GITHUB_REF" = "refs/heads/main"',
  'Reconstruction cannot be combined with force, geometry or shadow modes.',
  '[[ "$INSPECTION_RUN_ID" =~ ^[1-9][0-9]{8,}$ ]]',
  '[[ "$INSPECTION_ARTIFACT_ID" =~ ^[1-9][0-9]{8,}$ ]]',
  '[[ "$DESCRIPTOR_SHA256" =~ ^[a-f0-9]{64}$ ]]',
  'Inspection bindings are accepted only by apply, rollback or cleanup.',
  '[[ "$APPLY_RUN_ID" =~ ^[1-9][0-9]{8,}$ ]]',
  '[[ "$ROLLBACK_ARTIFACT_ID" =~ ^[1-9][0-9]{8,}$ ]]',
  'Apply-run rollback bindings are accepted only by rollback.',
], 'Fail-closed dispatchgate');

assert.equal(count(workflow, 'name: Require checked-out HEAD to equal current origin/main'), 5,
  'Readiness, D1-readiness, inspect, build og Pages-deploy skal hver kontrollere aktuel origin/main.');
for (const marker of [
  'git fetch --no-tags --prune origin +refs/heads/main:refs/remotes/origin/main',
  'test "$(git rev-parse HEAD^{commit})" = "$EXPECTED_HEAD_SHA"',
  'test "$(git rev-parse origin/main^{commit})" = "$EXPECTED_HEAD_SHA"',
]) {
  assert.equal(count(workflow, marker), 8, `Exact-current-main-gaten mangler fem jobgates og tre sene rechecks af ${marker}`);
}

const concurrency = workflow.slice(position('concurrency:'), position('jobs:'));
requireMarkers(concurrency, [
  "inputs.candidate_g_gap_reconstruction_mode != 'none' && 'ravradar-weather-production'",
  'cancel-in-progress: false',
], 'Rekonstruktions-concurrency');
assert.equal(count(concurrency, 'cancel-in-progress:'), 1);
const cancelInProgress = /cancel-in-progress:\s*(\S+)/.exec(concurrency)?.[1];
assert.equal(cancelInProgress, 'false');
for (const incoming of ['push', 'schedule', 'none', 'force', 'inspect', 'apply', 'rollback', 'cleanup']) {
  assert.equal(cancelInProgress === 'true', false,
    `Indkommende ${incoming} må ikke annullere en igangværende recovery-/produktionskørsel.`);
}

const inspectStart = position('  inspect-candidate-g-one-time-gap:');
const buildStart = position('  build-and-prepare:');
const tripReadinessJob = workflow.slice(position('  trip-storage-readiness:'), inspectStart);
requireMarkers(tripReadinessJob, [
  'name: Check exact-head D1 trip-storage readiness',
  'needs: current-hour-readiness',
  'actions: read',
  'ready: ${{ steps.readiness.outputs.ready }}',
  'uses: actions/checkout@v7',
  'Require checked-out HEAD to equal current origin/main',
], 'D1 readiness-jobbet');
const tripStorageGate = step('Determine exact-head D1 trip-storage readiness without failing the run');
requireMarkers(tripStorageGate, [
  'echo "ready=false" >> "$GITHUB_OUTPUT"',
  'release_version="$(jq -er',
  'test("^4\\\\.0\\\\.[0-9]+$")',
  'version.json could not be validated; this run remains a green no-op',
  '"4.0.311"',
  '"4.0.312"',
  '"4.0.313"',
  '"4.0.314"',
  'RECONSTRUCTION_MODE" = "apply"',
  'RECONSTRUCTION_MODE" = "rollback"',
  'RECONSTRUCTION_MODE" = "cleanup"',
  'deploy-trip-storage.yml/runs?branch=main&status=completed&event=workflow_dispatch&per_page=100',
  '.head_sha == $sha',
  '.head_branch == "main"',
  '.conclusion == "success"',
  '.event == "workflow_dispatch"',
  '.display_title == "Deploy RavRadar trip storage [d1]"',
  'EXPECTED_TRIP_STORAGE_MODE: d1',
  'node scripts/verify-trip-storage-edge.mjs',
  'node scripts/verify-cloudflare-trip-gateway.mjs',
  'The live Edge contract is not the required Candidate G D1 mode',
  'The live Worker/registry contract could not be attested',
  'actions/workflows/update-and-deploy.yml/runs?branch=main&status=completed&event=workflow_dispatch&per_page=100',
  'recovery_run_ids_json="$(jq -ce',
  'all(.workflow_runs[];',
  'error("invalid workflow-runs response")',
  '.head_sha == $sha',
  '/actions/runs/${recovery_run_id}/jobs?per_page=100',
  'recovery_jobs_array="$(jq -ce',
  'all(.jobs[];',
  'all(.steps[]?;',
  'error("invalid jobs response")',
  'Apply the descriptor-bound one-time Candidate G reconstruction',
  'Deploy prepared Pages artifact',
  'apply_release_proven=true',
  'Apply and deploy the sealed one-time reconstruction on this exact main head',
  'echo "ready=true" >> "$GITHUB_OUTPUT"',
  'this run remains a green no-op',
], 'Exact-head D1 readiness-gaten');
assert.ok(!tripStorageGate.includes('exit 1'),
  'Manglende exact-D1-bevis skal give et grønt no-op, ikke et bevidst rødt workflow.');
assert.ok(!tripStorageGate.includes('recovery_run_ids="$(jq'),
  'Run-id-listen må ikke bruge ubeskyttet jq-output, som kan være delvist ved parsefejl.');

function validatedRecoveryRunIds(response, expectedHead) {
  if (!response || !Array.isArray(response.workflow_runs)
    || response.workflow_runs.some(run => !run || typeof run !== 'object'
      || !Number.isInteger(run.id)
      || typeof run.head_sha !== 'string'
      || typeof run.head_branch !== 'string'
      || typeof run.conclusion !== 'string'
      || typeof run.event !== 'string')) {
    throw new Error('invalid workflow-runs response');
  }
  return response.workflow_runs.filter(run => run.head_sha === expectedHead
    && run.head_branch === 'main'
    && run.conclusion === 'success'
    && run.event === 'workflow_dispatch').map(run => run.id);
}

const proofHead = 'a'.repeat(40);
const validProofRun = {
  id: 33270000001,
  head_sha: proofHead,
  head_branch: 'main',
  conclusion: 'success',
  event: 'workflow_dispatch',
};
assert.deepEqual(validatedRecoveryRunIds({ workflow_runs: [validProofRun] }, proofHead), [33270000001]);
assert.throws(() => validatedRecoveryRunIds({
  workflow_runs: [validProofRun, { id: null }],
}, proofHead), /invalid workflow-runs response/,
'Et gyldigt første run må ikke overleve en malformed senere metadatarecord som delvist output.');

function exactApplyAndPagesProof(jobs) {
  if (!Array.isArray(jobs) || jobs.some(job => !job || typeof job !== 'object'
    || typeof job.name !== 'string'
    || typeof job.conclusion !== 'string'
    || !(job.steps == null || Array.isArray(job.steps))
    || (job.steps || []).some(step => !step || typeof step !== 'object'
      || typeof step.name !== 'string' || typeof step.conclusion !== 'string'))) {
    throw new Error('invalid jobs response');
  }
  const apply = jobs.flatMap(job => job.steps || []).filter(step =>
    step.name === 'Apply the descriptor-bound one-time Candidate G reconstruction'
      && step.conclusion === 'success');
  const pages = jobs.filter(job => job.name === 'Deploy prepared Pages artifact'
    && job.conclusion === 'success');
  return apply.length === 1 && pages.length === 1;
}
assert.equal(exactApplyAndPagesProof([
  { name: 'build-and-prepare', conclusion: 'success', steps: [{
    name: 'Apply the descriptor-bound one-time Candidate G reconstruction', conclusion: 'success',
  }] },
  { name: 'Deploy prepared Pages artifact', conclusion: 'success', steps: [] },
]), true);
assert.throws(() => exactApplyAndPagesProof([
  { name: 'build-and-prepare', conclusion: 'success', steps: [{
    name: 'Apply the descriptor-bound one-time Candidate G reconstruction', conclusion: 'success',
  }] },
  { name: null, conclusion: 'success', steps: [] },
]), /invalid jobs response/);

const d1BuildHeader = workflow.slice(buildStart, workflow.indexOf('\n    steps:', buildStart));
requireMarkers(d1BuildHeader, [
  'needs: [current-hour-readiness, trip-storage-readiness]',
  "needs.trip-storage-readiness.outputs.ready == 'true'",
], 'Pages-produktionsjobbets D1-afhængighed');

function pagesProductionAllowed({
  releaseVersion,
  reconstructionMode,
  exactD1Proof,
  liveD1Attestation,
  exactApplyAndPagesProof = false,
}) {
  if (!/^4\.0\.[0-9]+$/.test(releaseVersion)) return false;
  const requiresExactD1 = ['4.0.311', '4.0.312', '4.0.313', '4.0.314'].includes(releaseVersion)
    || ['apply', 'rollback', 'cleanup'].includes(reconstructionMode);
  if (requiresExactD1 && !(exactD1Proof && liveD1Attestation)) return false;
  if (releaseVersion === '4.0.314' && (!reconstructionMode || reconstructionMode === 'none')) {
    return exactApplyAndPagesProof;
  }
  return true;
}
for (const eventName of ['push', 'schedule', 'workflow_dispatch']) {
  assert.equal(pagesProductionAllowed({
    releaseVersion: '4.0.311', reconstructionMode: 'none', exactD1Proof: false, liveD1Attestation: false,
  }), false, `${eventName} må være grønt no-op uden exact-head D1-bevis på 4.0.311.`);
}
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.311', reconstructionMode: 'none', exactD1Proof: true, liveD1Attestation: true,
}), true);
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.311', reconstructionMode: 'none', exactD1Proof: true, liveD1Attestation: false,
}), false, 'Et ældre exact-head D1-run må ikke åbne Pages efter en senere Supabase-rollback eller partial failure.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.312', reconstructionMode: 'none', exactD1Proof: false,
}), false, '4.0.312-roll-forward må ikke deploye uden sit eget exact-head D1-bevis.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.312', reconstructionMode: 'none', exactD1Proof: true, liveD1Attestation: true,
}), true, '4.0.312 må først åbne Pages efter exact-head D1-bevis og live attestation.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.313', reconstructionMode: 'none', exactD1Proof: false,
}), false, '4.0.313-replayrettelsen må ikke deploye før dens egen exact-head D1-kæde er grøn.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.313', reconstructionMode: 'none', exactD1Proof: true, liveD1Attestation: true,
}), true, '4.0.313 må først åbne Pages efter exact-head D1-bevis og live attestation.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.314', reconstructionMode: 'none', exactD1Proof: false,
}), false, '4.0.314-afterankerrettelsen må ikke overhale sin egen exact-head D1-kæde.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.314', reconstructionMode: 'none', exactD1Proof: true, liveD1Attestation: true,
}), false, '4.0.314-normalproduktion må ikke overhale inspect/apply efter et grønt D1-bevis.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.314', reconstructionMode: '', exactD1Proof: true, liveD1Attestation: true,
}), false, 'Push og schedule uden mode skal også forblive grøn no-op før applybeviset.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.314', reconstructionMode: 'inspect', exactD1Proof: true, liveD1Attestation: true,
}), true, 'Read-only inspect må åbnes efter exact-head D1-beviset.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.314', reconstructionMode: 'apply', exactD1Proof: true, liveD1Attestation: true,
}), true, 'Descriptorbundet apply må åbnes efter exact-head D1-beviset.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.314', reconstructionMode: 'none', exactD1Proof: true,
  liveD1Attestation: true, exactApplyAndPagesProof: true,
}), true, 'Normal 4.0.314 må fortsætte efter exact-head apply- og Pages-bevis.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '4.0.315', reconstructionMode: 'none', exactD1Proof: false,
}), true, 'Den afgrænsede recoveryinterlock må ikke blive en permanent managementafhængighed.');
assert.equal(pagesProductionAllowed({
  releaseVersion: '', reconstructionMode: 'none', exactD1Proof: false,
}), false, 'Ugyldig versionsidentitet skal give grønt no-op, ikke bypass.');
const inspectJob = workflow.slice(inspectStart, buildStart);
requireMarkers(inspectJob, [
  "if: github.event_name == 'workflow_dispatch' && inputs.candidate_g_gap_reconstruction_mode == 'inspect'",
  'needs: [current-hour-readiness, trip-storage-readiness]',
  "needs.trip-storage-readiness.outputs.ready == 'true'",
  'permissions:\n      contents: read\n      actions: read',
  'descriptor_sha256: ${{ steps.inspect.outputs.descriptor_sha256 }}',
  'descriptor_artifact_id: ${{ steps.upload-descriptor.outputs.artifact-id }}',
  'artifact-ids: 9707010150',
  'run-id: 33225493339',
  'RavRadar-support-3675.zip',
  'artifact-ids: 9709446092',
  'run-id: 33233545688',
  'RavRadar-support-3676.zip',
  '--inspect',
  '--target data/live/conditions.json',
  '--before-attestation',
  '--after-attestation',
  '--before-bundle',
  '--after-bundle',
  '--github-output "$GITHUB_OUTPUT"',
  'test -s .cache/candidate-g-gap-reconstruction/sealed-descriptor.json',
  'find .cache/candidate-g-gap-reconstruction -maxdepth 1 -type f | wc -l',
  'name: candidate-g-gap-reconstruction-inspection-${{ github.run_id }}',
  'path: .cache/candidate-g-gap-reconstruction/sealed-descriptor.json',
  'if-no-files-found: error',
], 'Inspect-jobbet');
assert.ok(!inspectJob.includes('pages: write') && !inspectJob.includes('id-token: write'), 'Inspect-jobbet må ikke kunne deploye.');
const inspectExtraction = step('Extract only the bound source bundles');
requireMarkers(inspectExtraction, [
  'unzip -p .cache/candidate-g-gap-reconstruction/source-before/RavRadar-support-3675.zip',
  'unzip -p .cache/candidate-g-gap-reconstruction/source-after/RavRadar-support-3676.zip',
  'project/data/live/conditions.json',
  'run-metadata/github-run.txt',
  'find .cache/candidate-g-gap-reconstruction/extracted-before -type f | wc -l)" -eq 2',
  'find .cache/candidate-g-gap-reconstruction/extracted-after -type f | wc -l)" -eq 2',
], 'Inspect-jobbets dataminimerede udpakning');
assert.equal(count(inspectExtraction, 'unzip -p '), 4, 'Inspect må udpakke præcis de to tilladte filer fra hver source bundle.');
assert.ok(!inspectExtraction.includes('unzip -q') && !inspectExtraction.includes(' -d '), 'Inspect må aldrig udpakke hele supportbundlen.');
const inspectUpload = step('Upload only the sanitized sealed inspection descriptor');
assert.ok(!inspectUpload.includes('source-before') && !inspectUpload.includes('source-after') && !inspectUpload.includes('conditions.json'), 'Inspect-upload må kun indeholde descriptoren.');

const buildHeader = workflow.slice(buildStart, workflow.indexOf('\n    steps:', buildStart));
requireMarkers(buildHeader, [
  "inputs.candidate_g_gap_reconstruction_mode != 'inspect'",
  "needs.current-hour-readiness.outputs.ready == 'true'",
  'should_deploy: ${{ steps.preflight.outputs.should_run }}',
], 'Build-jobheaderen');
assert.ok(buildHeader.includes("github.event_name != 'workflow_dispatch' ||"), 'Push og schedule skal bevare den normale buildvej.');
assert.ok(buildHeader.includes(
  "if: (github.event_name != 'workflow_dispatch' || (inputs.candidate_g_gap_reconstruction_mode != 'inspect' && inputs.geometry_v2_pilot != true && inputs.geometry_v2_national != true && inputs.ravscore_active_shadow != true)) && needs.current-hour-readiness.outputs.ready == 'true' && needs.trip-storage-readiness.outputs.ready == 'true'",
), 'Build-matricen skal køre normal none/apply/cleanup og push/schedule først efter exact-D1 readiness, men aldrig inspect eller private dispatches.');

for (const jobName of ['geometry-v2-national', 'ravscore-active-shadow', 'geometry-v2-pilot']) {
  const jobStart = position(`  ${jobName}:`);
  const jobHeader = workflow.slice(jobStart, workflow.indexOf('\n    steps:', jobStart));
  requireMarkers(jobHeader, [
    'needs: current-hour-readiness',
    "inputs.candidate_g_gap_reconstruction_mode == 'none'",
  ], `${jobName} dispatch-isolation`);
  assert.ok(!jobHeader.includes('trip-storage-readiness'), `${jobName} er read-only og må ikke blokeres af Pages D1-readiness.`);
}

const artifactIdentity = step('Verify exact sealed inspection artifact identity');
requireMarkers(artifactIdentity, [
  "inputs.candidate_g_gap_reconstruction_mode == 'apply'",
  "inputs.candidate_g_gap_reconstruction_mode == 'rollback'",
  "inputs.candidate_g_gap_reconstruction_mode == 'cleanup'",
  'GH_TOKEN: ${{ github.token }}',
  'RECONSTRUCTION_MODE: ${{ inputs.candidate_g_gap_reconstruction_mode }}',
  '/actions/artifacts/${INSPECTION_ARTIFACT_ID}',
  'candidate-g-gap-reconstruction-inspection-${INSPECTION_RUN_ID}',
  "'.workflow_run.id | tostring'",
  "'.workflow_run.head_branch'",
  '"main"',
  "'.workflow_run.head_sha'",
  'EXPECTED_HEAD_SHA: ${{ github.sha }}',
  'if [ "$RECONSTRUCTION_MODE" = "apply" ] || [ "$RECONSTRUCTION_MODE" = "rollback" ]; then',
  'test "$inspection_head_sha" = "$EXPECTED_HEAD_SHA"',
], 'Inspect-artifactets identitetsgate');

const descriptorDownload = step('Download the exact sealed reconstruction descriptor');
requireMarkers(descriptorDownload, [
  'artifact-ids: ${{ inputs.candidate_g_gap_inspection_artifact_id }}',
  'run-id: ${{ inputs.candidate_g_gap_inspection_run_id }}',
  'github-token: ${{ github.token }}',
], 'Descriptor-downloadet');
const descriptorIsolation = step('Verify the downloaded inspection artifact is descriptor-only');
requireMarkers(descriptorIsolation, [
  'test -s .cache/candidate-g-gap-reconstruction/inspection/sealed-descriptor.json',
  'find .cache/candidate-g-gap-reconstruction/inspection -type f | wc -l',
], 'Descriptor-isolationsgaten');

const applyArtifactIdentity = step('Verify exact successful apply rollback artifact identity');
requireMarkers(applyArtifactIdentity, [
  "inputs.candidate_g_gap_reconstruction_mode == 'rollback'",
  'candidate-g-gap-reconstruction-rollback-${APPLY_RUN_ID}',
  '/actions/artifacts/${ROLLBACK_ARTIFACT_ID}',
  '/actions/runs/${APPLY_RUN_ID}',
  "'.workflow_run.id | tostring'",
  "'.workflow_run.head_branch'",
  "'.workflow_run.head_sha'",
  "'.head_branch'",
  "'.head_sha'",
  "'.event'",
  "'.status'",
  "'.conclusion'",
  '"success"',
], 'Apply-rollbackartifactets exact run/head/success-gate');
const rollbackDownload = step('Download the exact private apply rollback checkpoint');
requireMarkers(rollbackDownload, [
  'artifact-ids: ${{ inputs.candidate_g_gap_rollback_artifact_id }}',
  'run-id: ${{ inputs.candidate_g_gap_apply_run_id }}',
  'path: .cache/candidate-g-gap-reconstruction/rollback-operation',
], 'Privat rollbackcheckpoint-download');
const rollbackDownloadIsolation = step('Verify the downloaded rollback artifact is checkpoint-only');
requireMarkers(rollbackDownloadIsolation, [
  'rollback-operation/compact-rollback.json',
  'find .cache/candidate-g-gap-reconstruction/rollback-operation -type f | wc -l',
], 'Rollbackcheckpointets isolationsgate');

const apply = step('Apply the descriptor-bound one-time Candidate G reconstruction');
requireMarkers(apply, [
  "inputs.candidate_g_gap_reconstruction_mode == 'apply'",
  '--apply',
  '--before .cache/candidate-g-gap-reconstruction/extracted-before/project/data/live/conditions.json',
  '--after .cache/candidate-g-gap-reconstruction/extracted-after/project/data/live/conditions.json',
  '--target data/live/conditions.json',
  '--descriptor .cache/candidate-g-gap-reconstruction/inspection/sealed-descriptor.json',
  '--descriptor-sha256 "${{ inputs.candidate_g_gap_descriptor_sha256 }}"',
  '--rollback-checkpoint .cache/candidate-g-gap-reconstruction/rollback/compact-rollback.json',
  '--before-attestation',
  '--after-attestation',
  '--before-bundle',
  '--after-bundle',
], 'Apply-trinnet');
assert.ok(!apply.includes('continue-on-error'), 'Apply må ikke skjule fejl.');
const applyExtraction = step('Extract only the bound source bundles for apply');
requireMarkers(applyExtraction, [
  'unzip -p .cache/candidate-g-gap-reconstruction/source-before/RavRadar-support-3675.zip',
  'unzip -p .cache/candidate-g-gap-reconstruction/source-after/RavRadar-support-3676.zip',
  'project/data/live/conditions.json',
  'run-metadata/github-run.txt',
  'find .cache/candidate-g-gap-reconstruction/extracted-before -type f | wc -l)" -eq 2',
  'find .cache/candidate-g-gap-reconstruction/extracted-after -type f | wc -l)" -eq 2',
], 'Apply-jobbets dataminimerede udpakning');
assert.equal(count(applyExtraction, 'unzip -p '), 4, 'Apply må udpakke præcis de to tilladte filer fra hver source bundle.');
assert.ok(!applyExtraction.includes('unzip -q') && !applyExtraction.includes(' -d '), 'Apply må aldrig udpakke hele supportbundlen.');

const rollbackIsolation = step('Refuse a missing or non-isolated rollback checkpoint');
requireMarkers(rollbackIsolation, [
  'test -s .cache/candidate-g-gap-reconstruction/rollback/compact-rollback.json',
  'find .cache/candidate-g-gap-reconstruction/rollback -maxdepth 1 -type f | wc -l',
], 'Rollback-isolationsgaten');
const rollbackUpload = step('Upload compact private rollback before continuing production');
requireMarkers(rollbackUpload, [
  "inputs.candidate_g_gap_reconstruction_mode == 'apply'",
  'path: .cache/candidate-g-gap-reconstruction/rollback/compact-rollback.json',
  'if-no-files-found: error',
], 'Rollback-uploadet');
assert.ok(!rollbackUpload.includes('conditions.json'), 'Rollback-uploadet må ikke eksportere conditions.json.');

const preApplyCapture = step('Capture the exact pre-apply target for isolated rollback proof');
requireMarkers(preApplyCapture, [
  "inputs.candidate_g_gap_reconstruction_mode == 'apply'",
  'pre-apply-conditions.json',
], 'Pre-apply-targetbeviset');
const isolatedRollbackProof = step('Prove apply then direct rollback is exact on an isolated copy');
requireMarkers(isolatedRollbackProof, [
  "inputs.candidate_g_gap_reconstruction_mode == 'apply'",
  'applied_target_sha256=',
  'isolated-applied-conditions.json',
  '--rollback',
  'cmp --silent',
  'pre-apply-conditions.json',
  'test "$(sha256sum data/live/conditions.json',
], 'Apply→direct rollback-transaktionsbeviset');
assert.ok(!isolatedRollbackProof.includes('--target data/live/conditions.json'),
  'Rollbackbeviset må kun mutere den isolerede kopi.');

const rollbackDispatch = step('Roll back exact post-apply state or causally clean the deployed descendant');
requireMarkers(rollbackDispatch, [
  "inputs.candidate_g_gap_reconstruction_mode == 'rollback'",
  '--rollback-dispatch',
  '--target data/live/conditions.json',
  'rollback-operation/compact-rollback.json',
], 'Operativ exact-eller-kausal rollback');
assert.ok(!rollbackDispatch.includes('continue-on-error'), 'Operativ rollback må være fail-closed.');

const cleanup = step('Causally remove only the descriptor-bound reconstructed evidence');
requireMarkers(cleanup, [
  "inputs.candidate_g_gap_reconstruction_mode == 'cleanup'",
  '--cleanup',
  '--target data/live/conditions.json',
  '--descriptor .cache/candidate-g-gap-reconstruction/inspection/sealed-descriptor.json',
  '--descriptor-sha256 "${{ inputs.candidate_g_gap_descriptor_sha256 }}"',
], 'Cleanup-trinnet');
assert.ok(!cleanup.includes('--before ') && !cleanup.includes('--after ') && !cleanup.includes('continue-on-error'), 'Cleanup skal være kausalt descriptorbundet og fail-closed uden at geninterpolere.');

const orderedSteps = [
  'Apply the descriptor-bound one-time Candidate G reconstruction',
  'Refuse a missing or non-isolated rollback checkpoint',
  'Upload compact private rollback before continuing production',
  'Roll back exact post-apply state or causally clean the deployed descendant',
  'Causally remove only the descriptor-bound reconstructed evidence',
  'Inspect verified Candidate G continuation recovery',
  'Preserve deployed DMI zone cache as safe fallback',
  'Decide whether weather needs updating',
  'Run fast source gate before expensive data refresh',
  'Update DMI bulk model cache',
  'Update central weather cache',
  'Refuse reconstruction deploy without a successful fresh weather rebuild',
  'Attach scientific current provenance and exact DMI grid points',
  'Rebuild deterministic public weather runtime before validation and deploy',
  'Audit actual Candidate G public runtime before deploy',
  'Validate full project after fresh weather and current provenance',
  'Run release governance gate after refreshed data validation',
  'Build lean GitHub Pages artifact',
].map((name) => position(`name: ${name}`));
for (let index = 1; index < orderedSteps.length; index += 1) {
  assert.ok(orderedSteps[index - 1] < orderedSteps[index], 'Rollback, sourcegate, frisk produktion og fulde gates står i forkert rækkefølge.');
}

const reconstructionWeatherGate = step('Refuse reconstruction deploy without a successful fresh weather rebuild');
requireMarkers(reconstructionWeatherGate, [
  "steps.preflight.outputs.should_run == 'true'",
  "github.event_name == 'workflow_dispatch'",
  "inputs.candidate_g_gap_reconstruction_mode == 'apply'",
  "inputs.candidate_g_gap_reconstruction_mode == 'rollback'",
  "inputs.candidate_g_gap_reconstruction_mode == 'cleanup'",
  'WEATHER_OUTCOME: ${{ steps.weather.outcome }}',
  'if [ "$WEATHER_OUTCOME" != "success" ]; then',
  'hydrated fallback deployment is forbidden',
  'exit 1',
], 'Rekonstruktionens friske vejr-hard gate');
assert.ok(!reconstructionWeatherGate.includes('continue-on-error'), 'Rekonstruktionens vejr-hard gate må ikke skjule fejl.');
const normalFallbackReport = step('Report cached fallback');
assert.ok(
  normalFallbackReport.includes("steps.weather.outcome != 'success'")
    && !normalFallbackReport.includes('candidate_g_gap_reconstruction_mode'),
  'Normal drift skal fortsat bevare sin generiske, validerede fallbackvej.',
);

for (const name of [
  'Inspect verified Candidate G continuation recovery',
  'Inspect failed-run Candidate G gap checkpoint recovery',
  'Restore latest compact Candidate G continuation checkpoint',
  'Apply newer compact Candidate G continuation checkpoint',
]) {
  requireMarkers(step(name), [
    "github.event_name != 'workflow_dispatch' || inputs.candidate_g_gap_reconstruction_mode == 'none'",
  ], `${name} skal være slået fra under apply og cleanup`);
}

for (const name of [
  'Restore last verified Candidate G public fallback',
  'Stage audited last verified Candidate G public fallback',
]) {
  const block = step(name);
  assert.ok(block.includes("inputs.candidate_g_gap_reconstruction_mode != 'apply'"), `${name} skal springes over under apply.`);
  assert.ok(!block.includes("candidate_g_gap_reconstruction_mode == 'none'"), `${name} skal bevares under cleanup og normal drift.`);
}
const publicFallbackSave = step('Save last verified Candidate G public fallback');
requireMarkers(publicFallbackSave, [
  "github.event_name != 'workflow_dispatch' || inputs.candidate_g_gap_reconstruction_mode == 'none'",
  'uses: actions/cache/save@v6',
], 'Public fallback cache-save');

const continuationRestore = step('Restore latest compact Candidate G continuation checkpoint');
requireMarkers(continuationRestore, [
  'key: candidate-g-continuation-checkpoint-v2-${{ github.run_id }}-${{ github.run_attempt }}',
  'candidate-g-continuation-checkpoint-v2-',
  'candidate-g-continuation-checkpoint-v1-',
], 'Continuation-cache restore');
assert.ok(
  continuationRestore.indexOf('candidate-g-continuation-checkpoint-v2-')
    < continuationRestore.indexOf('candidate-g-continuation-checkpoint-v1-'),
  'Continuation-cache skal foretrække v2 og kun falde tilbage til målt v1.',
);
const continuationBuild = step('Build compact Candidate G continuation checkpoint');
requireMarkers(continuationBuild, [
  "if: steps.preflight.outputs.should_run == 'true' && steps.weather.outcome == 'success'",
  "github.event_name != 'workflow_dispatch' || inputs.candidate_g_gap_reconstruction_mode == 'none'",
  'node scripts/candidate-g-continuation-checkpoint.mjs',
  '--save',
], 'Continuation-checkpoint build');
const continuationSave = step('Save compact Candidate G continuation checkpoint before final gates');
assert.ok(continuationSave.includes("if: steps.preflight.outputs.should_run == 'true' && steps.weather.outcome == 'success'"), 'Hydreret normal fallback må aldrig mintes som et nyt v2-checkpoint.');
assert.ok(continuationSave.includes("github.event_name != 'workflow_dispatch' || inputs.candidate_g_gap_reconstruction_mode == 'none'"), 'Reconstruction state må aldrig gemmes i den delte continuation-cache før deploy.');
assert.ok(continuationSave.includes('candidate-g-continuation-checkpoint-v2-${{ github.run_id }}-${{ github.run_attempt }}'), 'Nye trustbærende checkpoints skal gemmes som v2.');
assert.ok(!continuationSave.includes('candidate-g-continuation-checkpoint-v1-'), 'Nye checkpoints må ikke gemmes under den gamle v1-nøgle.');
assert.equal(count(workflow, 'candidate-g-continuation-checkpoint-v1-'), 1, 'v1 må kun findes som read-only fallback.');

function sharedCandidateStateWriteAllowed(block, { eventName, mode, shouldRun, weatherSucceeded }) {
  assert.ok(block.includes("github.event_name != 'workflow_dispatch' || inputs.candidate_g_gap_reconstruction_mode == 'none'"));
  if (!shouldRun) return false;
  if (block.includes("steps.weather.outcome == 'success'") && !weatherSucceeded) return false;
  return eventName !== 'workflow_dispatch' || mode === 'none';
}

for (const mode of ['apply', 'rollback', 'cleanup']) {
  const failedPostMutationRun = {
    eventName: 'workflow_dispatch', mode, shouldRun: true, weatherSucceeded: true,
  };
  assert.equal(sharedCandidateStateWriteAllowed(publicFallbackSave, failedPostMutationRun), false,
    `${mode} må ikke kunne gemme et muteret public fallback før et senere gate-failure.`);
  assert.equal(sharedCandidateStateWriteAllowed(continuationBuild, failedPostMutationRun), false,
    `${mode} må ikke kunne bygge en delt continuation restorekilde før et senere gate-failure.`);
  assert.equal(sharedCandidateStateWriteAllowed(continuationSave, failedPostMutationRun), false,
    `${mode} må ikke kunne gemme en continuation restorekilde før et senere gate-failure.`);
}

assert.equal(count(workflow, 'node scripts/one-time-candidate-g-gap-reconstruction.mjs'), 5,
  'Rekonstruktionsscriptet skal have inspect, apply, isoleret direct rollback, operativ rollback og cleanup entrypoints.');
assert.ok(step('Run fast source gate before expensive data refresh').includes("github.event_name != 'schedule'"), 'Push og manuelle rekonstruktioner skal gennem kildegaten.');
for (const name of [
  'Validate full project after fresh weather and current provenance',
  'Run release governance gate after refreshed data validation',
]) {
  const block = step(name);
  assert.ok(block.includes("if: steps.preflight.outputs.should_run == 'true'"), `${name} skal køre ved enhver reel produktion.`);
  assert.ok(!block.includes('github.event_name') && !block.includes('inputs.force'), `${name} må ikke kunne trigger-springes over.`);
}

const deploy = workflow.slice(position('  deploy-pages:'));
requireMarkers(deploy, [
  'needs: build-and-prepare',
  "if: needs.build-and-prepare.outputs.should_deploy == 'true'",
  'id: deployment',
  'url: ${{ steps.deployment.outputs.page_url }}',
  'uses: actions/deploy-pages@v5',
  'uses: actions/checkout@v7',
  'Require checked-out HEAD to equal current origin/main',
], 'Pages-deployjobbet');

assert.ok(position('name: Determine exact-head D1 trip-storage readiness without failing the run')
  < position('name: Apply the descriptor-bound one-time Candidate G reconstruction'),
  'Backendkontrakten skal være live før reconstruction apply.');
assert.ok(position('name: Reconfirm current origin/main immediately before reconstruction mutation')
  < position('name: Apply the descriptor-bound one-time Candidate G reconstruction'),
  'Main skal genkontrolleres umiddelbart før reconstruction mutation.');
assert.ok(position('name: Run release governance gate after refreshed data validation')
  < position('name: Reconfirm current origin/main before protected writes and Pages artifact'),
  'Main skal genkontrolleres efter fulde gates og før beskyttede writes/Pages-artifact.');
const activeTripStorageProbe = step('Verify active trip-storage quality contract without creating data');
requireMarkers(activeTripStorageProbe, [
  "if: steps.preflight.outputs.should_run == 'true'",
  'node scripts/verify-trip-storage-edge.mjs',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'EXPECTED_TRIP_STORAGE_MODE: d1',
], 'Normal produktions read-only trip-storage-probe');
assert.ok(position('name: Run release governance gate after refreshed data validation')
  < position('name: Verify active trip-storage quality contract without creating data'));
assert.ok(position('name: Verify active trip-storage quality contract without creating data')
  < position('name: Reconfirm current origin/main before protected writes and Pages artifact'));
const lateAdminMainGate = step('Reconfirm current origin/main immediately before protected admin sync');
requireMarkers(lateAdminMainGate, [
  "if: steps.preflight.outputs.should_run == 'true'",
  'git fetch --no-tags --prune origin +refs/heads/main:refs/remotes/origin/main',
  'test "$(git rev-parse HEAD^{commit})" = "$EXPECTED_HEAD_SHA"',
  'test "$(git rev-parse origin/main^{commit})" = "$EXPECTED_HEAD_SHA"',
], 'Sen protected-admin exact-main-gate');
const lateAdminGateStart = position('name: Reconfirm current origin/main immediately before protected admin sync');
const nextNamedStep = workflow.indexOf('\n      - name:', lateAdminGateStart + 1);
assert.ok(workflow.slice(nextNamedStep).startsWith('\n      - name: Sync protected admin data to Supabase'),
  'Exact-main-gaten skal stå umiddelbart før sync-protected-admin-assets.mjs.');
assert.ok(position('name: Upload RavRadar support package') < lateAdminGateStart
  && lateAdminGateStart < position('name: Sync protected admin data to Supabase'));
assert.doesNotMatch(workflow, /live-rollback-seal|post-rebuild-live/i,
  'Et post-deploy checkpoint-restore må ikke kunne kassere nyere målte prøver.');

console.log('Engangsrekonstruktionens inspect/apply/rollback/cleanup-workflow er descriptorbundet, fail-closed og produktionsisoleret.');
