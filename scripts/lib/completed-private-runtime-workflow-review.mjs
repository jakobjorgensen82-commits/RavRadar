// Test-only exact inverse. Every byte of the historical workflow oracle is
// retained; new-route behavior is tested separately against the actual files.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const review = JSON.parse(fs.readFileSync(new URL('./completed-private-runtime-workflow-review.json', import.meta.url), 'utf8'));
const coldReview = JSON.parse(fs.readFileSync(new URL('./current-family-cold-start-workflow-review.json', import.meta.url), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
// Test-only exact optional-stage wiring inverse. Both entire reviewed afterimages
// restore the previous workflows; no caller, selector or command is ignored.
export const ordinaryStageWiringReview = JSON.parse(fs.readFileSync(
  new URL('./ordinary-completed-stage-workflow-review.json', import.meta.url), 'utf8'));
for (const row of Object.values(ordinaryStageWiringReview)) {
  row.edits.forEach(Object.freeze); Object.freeze(row.edits); Object.freeze(row);
}
Object.freeze(ordinaryStageWiringReview);
// Exact585 normal User-Agent inverse; the entire issued584 workflow remains the oracle.
export function inverseRelease585WorkflowUserAgents(source, role) {
  if (role !== 'build' || sha(source) !== '2ee56b8ae3546f8ac3ce97b45aaedbfe7eb67fac0960961f164cecca70c0970c') return source;
  assert.equal(source.split('RavRadar/4.0.585').length, 6, 'Exactly five normal585 User-Agent fields');
  const previous = source.replaceAll('RavRadar/4.0.585', 'RavRadar/4.0.584');
  assert.equal(sha(previous), 'b509a5131c64f9df9a431fdf9f99b082fb14c88de8bf9c3ad3e33b8ddc77de57', 'Whole genuine main674 workflow survives');
  return previous;
}
export function inverseOrdinaryCompletedStageWorkflowWiring(source, role) {
  source = inverseRelease585WorkflowUserAgents(source, role);
  const row = ordinaryStageWiringReview[role];
  if (!row || sha(source) !== row.afterSha256) return source;
  assert.equal(Buffer.byteLength(source), row.afterBytes, 'Whole reviewed staged caller byte count');
  let previous = source;
  for (const [offset, actual, original] of row.edits) {
    assert.equal(previous.slice(offset, offset + actual.length), actual, 'Exact optional-stage wiring hunk');
    previous = previous.slice(0, offset) + original + previous.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(previous), row.beforeBytes);
  assert.equal(sha(previous), row.beforeSha256, 'Entire preceding workflow survives the optional-stage wiring inverse');
  return previous;
}
// Test-only exact relocation of the unchanged four-step UNPUBLISHED B stage.
// The entire c72 predecessor, including its later protected B/S writes, remains
// the old oracle. Unknown whole bytes never enter this inverse.
const earlyStageAfterSha = '05665749cefb5f210a7542cb6fab06e2900be0fd9bb8326cab9b1dcc7b432f73';
const earlyStageBeforeSha = 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6';
const earlyStageStart = '      # The expensive weather/score build is already complete. Save its exact\n';
const earlyStageNext = '      - name: Generate and strictly validate production reference zones\n';
const earlyStageOldNext = '      - name: Build dataminimized weather preflight state after final gates\n';
export function assertEarlyCompletedRuntimeStageOrder(source) {
  source = inverseOrdinaryCompletedStageWorkflowWiring(source, 'build');
  assert.equal(sha(source), earlyStageAfterSha, 'Only the whole reviewed early-stage workflow is current');
  for (const marker of [earlyStageStart, earlyStageNext, earlyStageOldNext])
    assert.equal(source.split(marker).length, 2, 'One exact early-stage boundary');
  const start = source.indexOf(earlyStageStart), end = source.indexOf(earlyStageNext);
  assert(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.equal(Buffer.byteLength(block), 3399, 'The same four complete stage blocks are relocated');
  assert.equal(sha(block), '712d300b49902e52d89f7fdbe383106fdfc692eb93a531ef7ec57101a8b3d22a',
    'Every stage body, selector, secret, inventory and upload field is unchanged');
  assert.deepEqual([...block.matchAll(/^        id: (.+)$/gm)].map(row => row[1]),
    ['private-runtime-bundle-spec', 'private-runtime-bundle-create', 'private-build-stage-seal', 'private-build-stage-upload']);
  const markers = [
    '      - name: Create and validate exactly one checkpoint disposition before release gate\n',
    earlyStageStart, earlyStageNext,
    '        id: full-validation\n', '        id: release-gate\n',
    '      - name: Require exact integrated backend and Edge readiness before integrated Pages\n',
    '        id: checkpoint-build\n', '        id: checkpoint-save\n', earlyStageOldNext,
    '        id: private-runtime-publish\n', '        id: checkpoint-publish\n',
  ];
  let prior = -1;
  for (const marker of markers) {
    assert.equal(source.split(marker).length, 2, 'One unchanged current workflow step: ' + marker.trim());
    const at = source.indexOf(marker);
    assert(at > prior, 'Encrypted UNPUBLISHED B precedes final gates; protected B/S stay after them: ' + marker.trim());
    prior = at;
  }
  const disposition = source.indexOf(markers[0]);
  assert.equal(source.indexOf('      - name: ', disposition + markers[0].length),
    source.indexOf('      - name: Build private production runtime bundle specification\n'),
    'The exact four-block stage immediately follows checkpoint disposition');
  return block;
}
export function inverseEarlyCompletedRuntimeStage(source, role) {
  source = inverseOrdinaryCompletedStageWorkflowWiring(source, role);
  if (role !== 'build' || sha(source) !== earlyStageAfterSha) return source;
  const block = assertEarlyCompletedRuntimeStageOrder(source);
  const without = source.replace(block, '');
  assert.equal(without.split(earlyStageOldNext).length, 2, 'One original stage destination');
  const previous = without.replace(earlyStageOldNext, () => block + earlyStageOldNext);
  assert.equal(sha(previous), earlyStageBeforeSha,
    'The whole genuine c72 workflow survives only the four-block relocation inverse');
  return previous;
}
// Test-only release584 UA layer. The complete actual workflow is checked
// before replacing only its five version strings; no runtime guard changes.
export function inverseRelease584WorkflowUserAgents(source, role) {
  source = inverseOrdinaryCompletedStageWorkflowWiring(source, role);
  source = inverseEarlyCompletedRuntimeStage(source, role);
  if (role !== 'build' || sha(source) !== 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6') return source;
  assert.equal(source.split('RavRadar/4.0.584').length, 6, 'Exactly five reviewed584 User-Agent fields');
  const previous = source.replaceAll('RavRadar/4.0.584', 'RavRadar/4.0.581');
  assert.equal(sha(previous), '4883b292423e162eec6f88d6402ef189adca71dc538fdfe22b7f91162f8ce4f0',
    'Every byte of the genuine581 current-family-C workflow survives the584 UA inverse');
  return previous;
}
// Test-only additive C layer. Only these two whole reviewed afterimages may
// enter; every byte of the genuine f644 predecessor remains the old oracle.
export function inverseCurrentFamilyColdStartWorkflow(source, role) {
  source = inverseRelease584WorkflowUserAgents(source, role);
  const row = coldReview.roles[role];
  if (!row || sha(source) !== row.actualSha256) return source;
  let previous = source;
  for (const [offset, actual, original] of row.edits) {
    assert.equal(previous.slice(offset, offset + actual.length), actual, 'Exact C inverse segment');
    previous = previous.slice(0, offset) + original + previous.slice(offset + actual.length);
  }
  assert.equal(sha(previous), row.predecessorSha256, 'Whole genuine f644 workflow survives the C inverse');
  return previous;
}
// Exact test-only ordinary checkout inverse; no runtime source guard is changed.
export function inverseOrdinaryFullHistoryCheckout(source, role) {
  if (role !== 'build' || sha(source) !== '861fad7501e32d4b63c72caa598825b15fb5fb2758961a1187ed57858e5c01ce') return source;
  const actual = "      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n";
  const original = "      - uses: actions/checkout@v7\n        with:\n          fetch-depth: ${{ inputs.completed_private_runtime && '0' || '1' }}\n";
  assert.equal(source.split(actual).length, 2, 'One reviewed checkout block');
  const previous = source.replace(actual, original);
  assert.equal(sha(previous), 'c3f3f76aed3b1193d3c446f00018668ea165370bcdb92742c7139b2cd3e9ab7d',
    'The entire preceding workflow survives the one-line checkout inverse');
  return previous;
}
// Exact test-only RAW-retention caller layer. No runtime input or authority changes.
const rawRetentionDemand = "      - name: Plan bounded current history from the actual selected continuation\n";
const rawRetentionRefresh = "      - name: Refresh DMI water-source registry\n";
const rawRetentionGeneration = "      - name: Prepare strict active DMI donor or resumable candidate\n";
const rawRetentionLegacy = "      - name: Bind causal OLD current reconstruction to the materialized saved inputs\n";
const rawRetentionDmi = "      - name: Update DMI bulk model cache\n";
const rawRetentionOldBlock = "      - name: Plan bounded current history from the actual selected continuation\n        id: current-history-demand\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.historical-wave-transition.outputs.required != 'true')\n        run: node scripts/plan-ravscore-current-history.mjs\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: ${{ steps.private-runtime-install.outcome == 'success' && 'true' || 'false' }}\n          RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED: ${{ (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true' && 'true' || 'false' }}\n\n";
const rawRetentionBlock = "      - name: Plan bounded current history from the actual selected continuation\n        id: current-history-demand\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.historical-wave-transition.outputs.required != 'true')\n        run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: ${{ steps.private-runtime-install.outcome == 'success' && 'true' || 'false' }}\n          RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED: ${{ (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true' && 'true' || 'false' }}\n\n";
const rawRetentionEnv = "          DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION: ${{ steps.private-runtime-install.outcome == 'success' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && inputs.weather_state_epoch_bootstrap != true && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && steps.historical-wave-transition.outputs.required != 'true' && 'true' || 'false' }}\n";
export function assertCurrentHistoryRawRetentionOrder(source) {
  for (const marker of [rawRetentionDemand, rawRetentionRefresh, rawRetentionGeneration,
    rawRetentionLegacy, rawRetentionDmi])
    assert.equal(source.split(marker).length, 2, 'One exact RAW-retention workflow step');
  const start = source.indexOf(rawRetentionDemand);
  const end = source.indexOf('      - name: ', start + rawRetentionDemand.length);
  const prepared = source.indexOf(rawRetentionGeneration);
  assert(end > start, 'The actual demand block has a finite next-step boundary');
  assert.equal(end, source.indexOf(rawRetentionLegacy), 'Demand immediately precedes legacy binding');
  assert(prepared < start, 'Actual generation materialization precedes demand');
  assert.equal(source.indexOf('      - name: ', prepared + rawRetentionGeneration.length), start,
    'Demand immediately follows actual generation materialization');
  assert(end < source.indexOf(rawRetentionDmi), 'Demand and legacy binding precede DMI');
  assert.equal(source.slice(start, end), rawRetentionBlock, 'Only the reviewed planner arg changes');
  assert.equal(source.split(rawRetentionEnv).length, 2, 'One exact committed-retention requirement');
  const dmiStart = source.indexOf(rawRetentionDmi);
  const dmiEnd = source.indexOf('      - name: ', dmiStart + rawRetentionDmi.length);
  assert(dmiEnd > dmiStart);
  assert(source.slice(dmiStart, dmiEnd).includes(rawRetentionEnv), 'Retention requirement belongs to DMI');
  assert.equal(sha(source), '46c88e4cca919ecc288c006db443106b1f8ce8fed1dbca3a87b74d7aea8a3e34', 'The entire current RAW-retention workflow is reviewed');
}
export function inverseCurrentHistoryRawRetentionOrder(source, role) {
  source = inverseCurrentFamilyColdStartWorkflow(source, role);
  if (role !== 'build' || sha(source) !== '46c88e4cca919ecc288c006db443106b1f8ce8fed1dbca3a87b74d7aea8a3e34') return source;
  assertCurrentHistoryRawRetentionOrder(source);
  let previous = source.replace(rawRetentionEnv, '').replace(rawRetentionBlock, '');
  previous = previous.replace(rawRetentionRefresh, rawRetentionOldBlock + rawRetentionRefresh);
  assert.equal(sha(previous), 'fd1cd664bdbdcf41ef2ad32e6ad5caf058a980b3093a3f4fc226ca1797854b49',
    'Whole preceding workflow survives only the exact demand move, arg and env inverses');
  return previous;
}
export function inverseOriginWeatherReadCredentials(source, role) {
  source = inverseCurrentHistoryRawRetentionOrder(source, role);
  if (role !== 'build' || sha(source) !== 'fd1cd664bdbdcf41ef2ad32e6ad5caf058a980b3093a3f4fc226ca1797854b49') return source;
  const marker = '      - name: Update central weather cache\n';
  assert.equal(source.split(marker).length, 2, 'One normal weather credential scope');
  const start = source.indexOf(marker), end = source.indexOf('\n      - name: ', start + marker.length);
  assert(end > start);
  const step = source.slice(start, end);
  const actual = "          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n";
  const original = "          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n";
  assert.equal(step.split(actual).length, 2, 'Exactly two normal weather Supabase credentials');
  const previous = source.slice(0, start) + step.replace(actual, original) + source.slice(end);
  assert.equal(sha(previous), 'fff327a65cf0a441f33da2e70e144802d11d5bcb8c0b8d570219f23a84970f11',
    'Entire paired-publication workflow survives only the two weather env inverses');
  return previous;
}
export function inversePairedPrivateRuntimePublication(source, role) {
  source = inverseOriginWeatherReadCredentials(source, role);
  if (role !== 'build' || sha(source) !== 'fff327a65cf0a441f33da2e70e144802d11d5bcb8c0b8d570219f23a84970f11') return source;
  for (const [actual, original] of [["      - name: Refuse current-family B publication without a completable checkpoint disposition\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && steps.operational-action.outputs.action != 'candidate-dry-run'\n        shell: bash\n        env:\n          CHECKPOINT_DISPOSITION: ${{ steps.checkpoint-disposition.outputs.disposition }}\n        run: |\n          set -euo pipefail\n          node --input-type=module <<'NODE'\n          import fs from 'node:fs';\n          import { assertPrivateRuntimeCheckpointPublicationDisposition }\n            from './scripts/reconcile-private-runtime-checkpoint.mjs';\n          const descriptor = JSON.parse(fs.readFileSync(process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE + '/manifest.json', 'utf8'));\n          assertPrivateRuntimeCheckpointPublicationDisposition(descriptor, process.env.CHECKPOINT_DISPOSITION);\n          NODE\n\n      - name: Publish bounded private runtime with one protected rollback generation\n        id: private-runtime-publish\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && steps.operational-action.outputs.action != 'candidate-dry-run'\n        run: >-\n          node scripts/protected-private-production-runtime.mjs\n          --publish\n          --private-root \"$RAVRADAR_PRIVATE_RUNTIME_ROOT\"\n          --bundle \"$RAVRADAR_PRIVATE_RUNTIME_BUNDLE\"\n          --repository-root \"$GITHUB_WORKSPACE\"\n          --expected .cache/private-production-runtime-expected.json\n          --source-head \"$GITHUB_SHA\"\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n      - name: Reconfirm current main before protected RavScore write\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && (steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED' || steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED')\n        shell: bash\n        run: |\n          git fetch --no-tags origin main\n          test \"$GITHUB_REF\" = \"refs/heads/main\"\n          test \"$(git rev-parse HEAD)\" = \"$(git rev-parse origin/main)\"\n\n      - name: Publish atomic RavScore checkpoint to protected admin storage\n        id: checkpoint-publish\n        if: steps.private-runtime-publish.outcome == 'success' && steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && (steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED' || steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED') && steps.operational-action.outputs.action != 'candidate-dry-run'\n        run: >-\n          node scripts/protected-ravscore-continuation-checkpoint.mjs\n          --publish\n          --target-reference \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n","      - name: Publish bounded private runtime with one protected rollback generation\n        id: private-runtime-publish\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && steps.operational-action.outputs.action != 'candidate-dry-run'\n        run: >-\n          node scripts/protected-private-production-runtime.mjs\n          --publish\n          --private-root \"$RAVRADAR_PRIVATE_RUNTIME_ROOT\"\n          --bundle \"$RAVRADAR_PRIVATE_RUNTIME_BUNDLE\"\n          --repository-root \"$GITHUB_WORKSPACE\"\n          --expected .cache/private-production-runtime-expected.json\n          --source-head \"$GITHUB_SHA\"\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n"],["      - name: Build dataminimized weather preflight state after final gates\n","      - name: Reconfirm current main before protected RavScore write\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && (steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED' || steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED')\n        shell: bash\n        run: |\n          git fetch --no-tags origin main\n          test \"$GITHUB_REF\" = \"refs/heads/main\"\n          test \"$(git rev-parse HEAD)\" = \"$(git rev-parse origin/main)\"\n\n      - name: Publish atomic RavScore checkpoint to protected admin storage\n        id: checkpoint-publish\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && (steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED' || steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED') && steps.operational-action.outputs.action != 'candidate-dry-run'\n        run: >-\n          node scripts/protected-ravscore-continuation-checkpoint.mjs\n          --publish\n          --target-reference \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n      - name: Build dataminimized weather preflight state after final gates\n"],["      - name: Install only the allowlisted restored private runtime files\n        id: private-runtime-install\n        if: steps.preflight.outputs.should_run == 'true' && steps.private-runtime-state.outputs.available == 'true'\n        shell: bash\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          PREDECESSOR_TRANSITION_KIND: ${{ steps.historical-wave-predecessor.outputs.transition_kind }}\n          MIGRATED_RUNTIME_ROOT: ${{ steps.bounded-conditions-predecessor-migration.outputs.restored_path }}\n          EXACT_WEATHER_MIGRATED_ROOT: ${{ steps.exact-weather-pair-migration.outputs.restored_path }}\n          OWNER_CURRENT_MIGRATED_ROOT: ${{ steps.owner-current-original-migration.outputs.restored_path }}\n          CURRENT_GRID_MIGRATED_ROOT: ${{ steps.current-grid-original-migration.outputs.restored_path }}\n        run: |\n          set -euo pipefail\n          if test \"${{ inputs.weather_state_epoch_bootstrap }}\" = true; then\n            test \"${{ steps.state-epoch-runtime-install.outcome }}\" = success\n            node scripts/weather-state-epoch.mjs verify\n            exit 0\n          fi\n          if test \"${{ inputs.native_sampling_identity_original_recovery }}\" = true; then\n            test \"${{ steps.native-identity-runtime-install.outcome }}\" = success\n            node scripts/install-native-identity-checkpoint-runtime.mjs verify\n            exit 0\n          fi\n          restored_root=\"$RAVRADAR_PRIVATE_RUNTIME_RESTORE\"\n          if test \"$PREDECESSOR_TRANSITION_KIND\" = \"current-grid-sampling-original\"; then\n            test -n \"$CURRENT_GRID_MIGRATED_ROOT\"\n            test \"${{ steps.current-grid-original-migration.outcome }}\" = 'success'\n            restored_root=\"$CURRENT_GRID_MIGRATED_ROOT\"\n          elif test \"$PREDECESSOR_TRANSITION_KIND\" = \"owner-current-domain-original\"; then\n            test -n \"$OWNER_CURRENT_MIGRATED_ROOT\"\n            restored_root=\"$OWNER_CURRENT_MIGRATED_ROOT\"\n          elif test \"$PREDECESSOR_TRANSITION_KIND\" = \"bounded-conditions-writer\"; then\n            test -n \"$MIGRATED_RUNTIME_ROOT\"\n            restored_root=\"$MIGRATED_RUNTIME_ROOT\"\n          elif test -n \"$EXACT_WEATHER_MIGRATED_ROOT\"; then\n            restored_root=\"$EXACT_WEATHER_MIGRATED_ROOT\"\n          fi\n          node scripts/private-production-runtime-workflow.mjs install \\\n            --restored \"$restored_root\" \\\n            --repository-root \"$GITHUB_WORKSPACE\"\n\n      # The 4.0.500 private bundle predates persistent PART-hour DMI\n      # continuity. Bootstrap once from the exact previous protected native\n      # DMI generation, without installing any older score or cache state.\n      - name: Reconcile only authenticated CURRENT B to its exact protected S before providers\n        id: paired-checkpoint-reconcile\n        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated' && steps.paired-checkpoint-route.outputs.required == 'true'\n        shell: bash\n        run: |\n          set -euo pipefail\n          test \"${{ steps.private-runtime-install.outcome }}\" = success\n          git fetch --no-tags origin main\n          test \"$GITHUB_REF\" = 'refs/heads/main'\n          test \"$(git rev-parse HEAD)\" = \"$GITHUB_SHA\"\n          test \"$(git rev-parse origin/main)\" = \"$GITHUB_SHA\"\n          node scripts/reconcile-private-runtime-checkpoint.mjs reconcile\n        env:\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          NATIVE_IDENTITY_RECOVERY: ${{ inputs.native_sampling_identity_original_recovery }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n","      - name: Install only the allowlisted restored private runtime files\n        id: private-runtime-install\n        if: steps.preflight.outputs.should_run == 'true' && steps.private-runtime-state.outputs.available == 'true'\n        shell: bash\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          PREDECESSOR_TRANSITION_KIND: ${{ steps.historical-wave-predecessor.outputs.transition_kind }}\n          MIGRATED_RUNTIME_ROOT: ${{ steps.bounded-conditions-predecessor-migration.outputs.restored_path }}\n          EXACT_WEATHER_MIGRATED_ROOT: ${{ steps.exact-weather-pair-migration.outputs.restored_path }}\n          OWNER_CURRENT_MIGRATED_ROOT: ${{ steps.owner-current-original-migration.outputs.restored_path }}\n          CURRENT_GRID_MIGRATED_ROOT: ${{ steps.current-grid-original-migration.outputs.restored_path }}\n        run: |\n          set -euo pipefail\n          if test \"${{ inputs.weather_state_epoch_bootstrap }}\" = true; then\n            test \"${{ steps.state-epoch-runtime-install.outcome }}\" = success\n            node scripts/weather-state-epoch.mjs verify\n            exit 0\n          fi\n          if test \"${{ inputs.native_sampling_identity_original_recovery }}\" = true; then\n            test \"${{ steps.native-identity-runtime-install.outcome }}\" = success\n            node scripts/install-native-identity-checkpoint-runtime.mjs verify\n            exit 0\n          fi\n          restored_root=\"$RAVRADAR_PRIVATE_RUNTIME_RESTORE\"\n          if test \"$PREDECESSOR_TRANSITION_KIND\" = \"current-grid-sampling-original\"; then\n            test -n \"$CURRENT_GRID_MIGRATED_ROOT\"\n            test \"${{ steps.current-grid-original-migration.outcome }}\" = 'success'\n            restored_root=\"$CURRENT_GRID_MIGRATED_ROOT\"\n          elif test \"$PREDECESSOR_TRANSITION_KIND\" = \"owner-current-domain-original\"; then\n            test -n \"$OWNER_CURRENT_MIGRATED_ROOT\"\n            restored_root=\"$OWNER_CURRENT_MIGRATED_ROOT\"\n          elif test \"$PREDECESSOR_TRANSITION_KIND\" = \"bounded-conditions-writer\"; then\n            test -n \"$MIGRATED_RUNTIME_ROOT\"\n            restored_root=\"$MIGRATED_RUNTIME_ROOT\"\n          elif test -n \"$EXACT_WEATHER_MIGRATED_ROOT\"; then\n            restored_root=\"$EXACT_WEATHER_MIGRATED_ROOT\"\n          fi\n          node scripts/private-production-runtime-workflow.mjs install \\\n            --restored \"$restored_root\" \\\n            --repository-root \"$GITHUB_WORKSPACE\"\n\n      # The 4.0.500 private bundle predates persistent PART-hour DMI\n      # continuity. Bootstrap once from the exact previous protected native\n      # DMI generation, without installing any older score or cache state.\n"],["      - name: Restore protected atomic RavScore checkpoint when cache is absent\n        if: steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n        run: >-\n          node scripts/protected-ravscore-continuation-checkpoint.mjs\n          --restore\n          --target-reference \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n","      - name: Restore protected atomic RavScore checkpoint when cache is absent\n        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n        run: >-\n          node scripts/protected-ravscore-continuation-checkpoint.mjs\n          --restore\n          --target-reference \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n"],["      - name: Select current-family paired checkpoint restoration before any S restore\n        id: paired-checkpoint-route\n        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated'\n        shell: bash\n        env:\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          NATIVE_IDENTITY_RECOVERY: ${{ inputs.native_sampling_identity_original_recovery }}\n        run: |\n          set -euo pipefail\n          git fetch --no-tags origin main\n          test \"$GITHUB_REF\" = 'refs/heads/main'\n          test \"$(git rev-parse HEAD)\" = \"$GITHUB_SHA\"\n          test \"$(git rev-parse origin/main)\" = \"$GITHUB_SHA\"\n          node scripts/reconcile-private-runtime-checkpoint.mjs select\n\n      - name: Restore the latest atomic schema-6 and Candidate G rollback checkpoint\n        if: steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n        id: ravscore-checkpoint-cache\n        uses: actions/cache/restore@v6\n        with:\n          path: .cache/ravscore-continuation-checkpoint\n          key: ravscore-continuation-schema6-v2-${{ github.run_id }}-${{ github.run_attempt }}\n          restore-keys: |\n            ravscore-continuation-schema6-v2-\n\n","      - name: Restore the latest atomic schema-6 and Candidate G rollback checkpoint\n        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n        id: ravscore-checkpoint-cache\n        uses: actions/cache/restore@v6\n        with:\n          path: .cache/ravscore-continuation-checkpoint\n          key: ravscore-continuation-schema6-v2-${{ github.run_id }}-${{ github.run_attempt }}\n          restore-keys: |\n            ravscore-continuation-schema6-v2-\n\n"]]) {
    assert.equal(source.split(actual).length, 2, 'Exact paired-publication workflow inverse');
    source = source.replace(actual, () => original);
  }
  assert.equal(sha(source), '861fad7501e32d4b63c72caa598825b15fb5fb2758961a1187ed57858e5c01ce', 'Whole previous ordinary workflow survives');
  return source;
}
export function inverseCompletedRuntimeWorkflow(source, role) {
  source = inverseOrdinaryCompletedStageWorkflowWiring(source, role);
  source = inverseEarlyCompletedRuntimeStage(source, role);
  source = inversePairedPrivateRuntimePublication(source, role);
  source = inverseOrdinaryFullHistoryCheckout(source, role);
  // Exact release581 UA-only inverse; all historical guards below remain intact.
  if (role === 'build' && sha(source) === 'c3f3f76aed3b1193d3c446f00018668ea165370bcdb92742c7139b2cd3e9ab7d') {
    assert.equal(source.split('RavRadar/4.0.581').length, 6, 'Exactly five reviewed581 UA changes');
    source = source.replaceAll('RavRadar/4.0.581', 'RavRadar/4.0.580');
    assert.equal(sha(source), '41db6fb9dbde88f26cf6be776db5d712925e166ebc90e4db8f3d754954233615',
      'Whole reviewed580 workflow must survive the581 inverse');
  }
  // Exact release580 successor only; retain the reviewed579 inverse below.
  if (role === 'build' && sha(source) === '41db6fb9dbde88f26cf6be776db5d712925e166ebc90e4db8f3d754954233615') {
    assert.equal(source.split('RavRadar/4.0.580').length, 6, 'Exactly five reviewed580 UA changes');
    source = source.replaceAll('RavRadar/4.0.580', 'RavRadar/4.0.579');
    assert.equal(sha(source), '1630141d45a0b65bbe0b6940b23079f330c2b94a1b4ec947b3c6d961f9f43f8b',
      'Whole reviewed579 workflow must survive the580 inverse');
  }
  // Exact test-only UA release successor; retain the entire old workflow oracle.
  if (role === 'build' && sha(source) === '1630141d45a0b65bbe0b6940b23079f330c2b94a1b4ec947b3c6d961f9f43f8b') {
    assert.equal(source.split('RavRadar/4.0.579').length, 6, 'Exactly five reviewed UA changes');
    source = source.replaceAll('RavRadar/4.0.579', 'RavRadar/4.0.578');
    assert.equal(sha(source), '061c8eaababf8e718e30c98faee1f789850536d8b28fe11e4071b71d27b45af4',
      'Whole pre-release completed-runtime workflow must survive the inverse');
  }
  const row = review.inverseReview[role];
  if (!row) return source;
  assert.equal(sha(source), row.actualSha256, 'Exact reviewed completed-runtime workflow: ' + role);
  let legacy = source;
  for (const [offset, actual, original] of row.edits) {
    assert.equal(legacy.slice(offset, offset + actual.length), actual, 'Exact inverse segment');
    legacy = legacy.slice(0, offset) + original + legacy.slice(offset + actual.length);
  }
  assert.equal(sha(legacy), row.legacySha256, 'Whole historical workflow must survive the inverse');
  return legacy;
}
