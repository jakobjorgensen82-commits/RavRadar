import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { NATIVE_IDENTITY_BINDING_REVIEW } from './native-sampling-identity-successor-source.mjs';
import { CURRENT_MEMORY_WARMUP_BEFORE, currentMemoryWarmupMigration, requireCurrentMemoryWarmupBinding,
  requireCurrentMemoryWarmupOutput } from './current-memory-warmup-successor-source.mjs';
import { ASSISTANT_KNOWLEDGE_BEFORE, assistantKnowledgeMigration, requireAssistantKnowledgeBinding,
  requireAssistantKnowledgeOutput } from './assistant-knowledge-successor-source.mjs';

export const PRODUCTION_WORKFLOW_SOURCES = Object.freeze({
  orchestrator: '.github/workflows/update-and-deploy.yml',
  build: '.github/workflows/reusable-weather-build.yml',
  deploy: '.github/workflows/reusable-pages-deploy.yml',
  recovery: '.github/workflows/reusable-operational-reentry.yml',
});

const freezeList = values => Object.freeze([...values]);

export const PRODUCTION_WORKFLOW_ROLES = freezeList(Object.keys(PRODUCTION_WORKFLOW_SOURCES));

export const PRODUCTION_WORKFLOW_INTERFACES = Object.freeze({
  build: Object.freeze({
    jobId: 'build-and-prepare',
    inputs: freezeList([
      'production_target_hour',
      'force',
      'extended_provider_bootstrap',
      'quick_confirmation',
      'quick_progress_source',
      'checkpoint_only',
      'weather_state_epoch_bootstrap',
      'weather_state_epoch_archive_key',
      'weather_state_epoch_archive_catalog_sha256',
      'native_sampling_identity_original_recovery',
      'produce_weather_handoff',
      'produce_weather_handoff_confirmation',
      'ravscore_candidate_g_rollback_mode',
      'ravscore_candidate_g_rollback_confirmation',
      'ravscore_integrated_first_cutover',
      'ravscore_integrated_first_cutover_confirmation',
      'ravscore_integrated_weather_handoff_run_id',
      'ravscore_integrated_return',
      'ravscore_integrated_return_confirmation',
    ]),
    optionalInputs: freezeList(['quick_confirmation', 'quick_progress_source', 'checkpoint_only',
      'native_sampling_identity_original_recovery', 'weather_state_epoch_bootstrap',
      'weather_state_epoch_archive_key', 'weather_state_epoch_archive_catalog_sha256']),
    secrets: freezeList([
      'RAVRADAR_R2_ACCOUNT_ID',
      'CLOUDFLARE_TRIP_GATEWAY_URL',
      'COPERNICUSMARINE_SERVICE_PASSWORD',
      'COPERNICUSMARINE_SERVICE_USERNAME',
      'DMI_API_KEY',
      'RAVRADAR_R2_ACCESS_KEY_ID',
      'RAVRADAR_R2_SECRET_ACCESS_KEY',
      'SUPABASE_ACCESS_TOKEN',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_URL',
      'TRIP_GATEWAY_SHARED_SECRET',
    ]),
    optionalSecrets: freezeList([
      'SUPABASE_ACCESS_TOKEN',
      'RAVRADAR_R2_ACCOUNT_ID',
      'RAVRADAR_R2_ACCESS_KEY_ID',
      'RAVRADAR_R2_SECRET_ACCESS_KEY',
    ]),
    outputs: freezeList([
      'should_deploy',
      'preflight_should_run',
      'operational_action',
      'operational_model',
      'operational_binding_current',
      'central_version',
      'initial_cutover_required',
      'legacy_source_required',
      'deployment_model',
      'integrated_implementation_closure_sha256',
      'active_deployment_id',
      'weather_outcome',
      'full_validation_outcome',
      'release_gate_outcome',
      'pages_build_outcome',
      'pages_privacy_outcome',
      'pages_artifact_seal_outcome',
      'handoff_upload_outcome',
      'checkpoint_disposition',
      'checkpoint_disposition_sha256',
      'checkpoint_dataset_id',
      'checkpoint_runtime_audit_sha256',
      'checkpoint_build_outcome',
      'checkpoint_save_outcome',
      'checkpoint_publish_outcome',
      'pages_configure_outcome',
      'pages_upload_outcome',
      'artifact_built',
    ]),
  }),
  deploy: Object.freeze({
    jobId: 'deploy-pages',
    optionalInputs: freezeList(['pre_activation_recovery']),
    inputs: freezeList([
      'pre_activation_recovery',
      'active_deployment_id',
      'central_version',
      'code_only_repair',
      'deployment_model',
      'integrated_implementation_closure_sha256',
      'legacy_source_required',
      'operational_action',
      'source_repair_id',
      'exact_public_recovery',
    ]),
    secrets: freezeList([
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_URL',
    ]),
    outputs: freezeList([
      'deployment_outcome',
      'public_verification_outcome',
      'deployed_verified',
    ]),
  }),
});

function assertRole(role) {
  if (!Object.hasOwn(PRODUCTION_WORKFLOW_SOURCES, role)) {
    throw new Error('Unknown production workflow role: ' + String(role));
  }
}

export function resolveProductionWorkflowSourcePath(role, { root = process.cwd() } = {}) {
  assertRole(role);
  return path.resolve(root, PRODUCTION_WORKFLOW_SOURCES[role]);
}

export async function readProductionWorkflowSource(role, options = {}) {
  return readFile(resolveProductionWorkflowSourcePath(role, options), 'utf8');
}

export async function readProductionWorkflowSources(options = {}) {
  const entries = await Promise.all(
    PRODUCTION_WORKFLOW_ROLES.map(async role => [
      role,
      await readProductionWorkflowSource(role, options),
    ]),
  );
  return Object.freeze(Object.fromEntries(entries));
}

export const loadProductionWorkflowSources = readProductionWorkflowSources;

export function concatenateProductionWorkflowSources(
  sources,
  { separator = '\n' } = {},
) {
  return PRODUCTION_WORKFLOW_ROLES
    .map(role => {
      if (typeof sources?.[role] !== 'string') {
        throw new Error('Missing production workflow source for role: ' + role);
      }
      return sources[role];
    })
    .join(separator);
}

// Routing only: this neither admits original data nor authorizes installation.
// Database prewrite and the normal artifact/activation gates remain mandatory.
export function deferCurrentGridBindingEdges(migrationVersion) {
  return migrationVersion === assistantKnowledgeMigration().version
    || migrationVersion === currentMemoryWarmupMigration().version
    || migrationVersion === '20261013220000'
    || typeof migrationVersion === 'string' && /^\d{14}$/.test(migrationVersion)
      && migrationVersion === NATIVE_IDENTITY_BINDING_REVIEW.migrationVersion;
}

export async function currentGridEdgePublicationRequired(current, action) {
  const { LATEST_REQUIRED_CUTOVER_MIGRATION } = await import('../integrated-cutover-readiness.mjs');
  const native = await import('./native-sampling-identity-successor-source.mjs');
  if (LATEST_REQUIRED_CUTOVER_MIGRATION.version === assistantKnowledgeMigration().version) {
    requireAssistantKnowledgeOutput();
    const { isDeepStrictEqual } = await import('node:util');
    const { ravScoreModelBinding } = await import('../../js/core/ravscore-model-contract.js');
    const binding = ravScoreModelBinding(), next = requireAssistantKnowledgeBinding();
    if (binding.modelBundleSha256 !== next.I)
      throw new Error('Assistant knowledge Edge route requires its actual current binding');
    if (isDeepStrictEqual(current?.modelBinding, binding)) return false;
    const original = { ...binding, modelBundleSha256: ASSISTANT_KNOWLEDGE_BEFORE.integrated };
    if (!isDeepStrictEqual(current?.modelBinding, original))
      throw new Error('Assistant knowledge Edge route has an unknown public original binding');
    if (current.model !== 'integrated' || current.status !== 'INTEGRATED_ACTIVE'
      || current.pending !== false || action !== 'integrated-historical-maintenance')
      throw new Error('Assistant knowledge late Edge publication requires the normal active historical route');
    return true;
  }
  if (LATEST_REQUIRED_CUTOVER_MIGRATION.version === currentMemoryWarmupMigration().version) {
    requireCurrentMemoryWarmupOutput();
    const { isDeepStrictEqual } = await import('node:util');
    const { ravScoreModelBinding } = await import('../../js/core/ravscore-model-contract.js');
    const binding = ravScoreModelBinding(), next = requireCurrentMemoryWarmupBinding();
    if (binding.modelBundleSha256 !== next.I)
      throw new Error('Current-memory warmup Edge route requires its actual issued current binding');
    if (isDeepStrictEqual(current?.modelBinding, binding)) return false;
    const original = { ...binding, modelBundleSha256: CURRENT_MEMORY_WARMUP_BEFORE.integrated };
    if (!isDeepStrictEqual(current?.modelBinding, original))
      throw new Error('Current-memory warmup Edge route has an unknown public original binding');
    if (current.model !== 'integrated' || current.status !== 'INTEGRATED_ACTIVE'
      || current.pending !== false || action !== 'integrated-historical-maintenance')
      throw new Error('Current-memory warmup late Edge publication requires the normal active historical route');
    return true;
  }
  if (LATEST_REQUIRED_CUTOVER_MIGRATION.version === native.nativeIdentityMigration().version) {
    const { isDeepStrictEqual } = await import('node:util');
    const { ravScoreModelBinding } = await import('../../js/core/ravscore-model-contract.js');
    const binding = ravScoreModelBinding();
    if (binding.modelBundleSha256 !== native.assertNativeIdentityBindingsFrozen().integrated)
      throw new Error('Native-identity Edge route requires its actual issued current binding');
    if (isDeepStrictEqual(current?.modelBinding, binding)) return false;
    const { CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY: ffc,
      CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY: delivered,
      CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY: selected } =
      await import('./bounded-conditions-predecessor-transition.mjs');
    const originalI71 = { ...binding, modelBundleSha256: native.NATIVE_IDENTITY_PREDECESSOR.integrated };
    if (![ffc.sourceModelBinding, delivered.sourceModelBinding, selected.sourceModelBinding, originalI71]
      .some(original => isDeepStrictEqual(current?.modelBinding, original)))
      throw new Error('Native-identity Edge route has an unknown public original binding');
    if (current.model !== 'integrated' || current.status !== 'INTEGRATED_ACTIVE'
      || current.pending !== false || action !== 'integrated-historical-maintenance')
      throw new Error('Native-identity late Edge publication requires the normal active historical route');
    return true;
  }
  if (!deferCurrentGridBindingEdges(LATEST_REQUIRED_CUTOVER_MIGRATION.version)) return false;
  const { isDeepStrictEqual } = await import('node:util');
  const { ravScoreModelBinding } = await import('../../js/core/ravscore-model-contract.js');
  const { CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY: ffc,
    CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY: delivered,
    CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY: selected } =
    await import('./bounded-conditions-predecessor-transition.mjs');
  if (isDeepStrictEqual(current?.modelBinding, ravScoreModelBinding())) return false;
  if (![ffc, delivered, selected].some(policy =>
    isDeepStrictEqual(current?.modelBinding, policy.sourceModelBinding))) return false;
  if (current.model !== 'integrated' || current.status !== 'INTEGRATED_ACTIVE'
    || current.pending !== false || action !== 'integrated-historical-maintenance') {
    throw new Error('Current-grid late Edge publication requires the normal active historical route');
  }
  return true;
}

// Supplemental ordering guard over the already validated artifact, not an
// original-data validator, SQL permission, or replacement for artifact gates.
export async function assertCurrentGridEdgeGeneration(current, manifest, targetReference) {
  const { default: assert } = await import('node:assert/strict');
  const { ravScoreModelBinding } = await import('../../js/core/ravscore-model-contract.js');
  assert.equal(await currentGridEdgePublicationRequired(current, 'integrated-historical-maintenance'), true);
  assert.deepEqual(manifest?.ravScoreModelBinding, ravScoreModelBinding());
  const before = Date.parse(current.productionReferenceAt);
  const after = Date.parse(manifest.productionReferenceAt);
  assert(Number.isFinite(before) && Number.isFinite(after) && after > before,
    'Late current-grid Edges require a strictly newer public generation');
  assert.equal(after, Date.parse(targetReference));
  assert.equal(typeof manifest.datasetId, 'string');
  assert(manifest.datasetId.length > 0 && manifest.datasetId !== current.datasetId);
}

// An uploaded artifact is an ordering prerequisite, not a completed Pages deploy
// or an activation permission. The existing seal validator owns its schema.
export async function assertCurrentGridEdgeArtifact(current, manifest, targetReference,
  seal, workflowIdentity, implementationIdentity) {
  const { default: assert } = await import('node:assert/strict');
  const { assertUploadedOperationalPagesTarget } = await import('../ravscore-operational-pages-recovery.mjs');
  await assertCurrentGridEdgeGeneration(current, manifest, targetReference);
  assert.deepEqual(implementationIdentity?.modelBinding, manifest.ravScoreModelBinding);
  return assertUploadedOperationalPagesTarget({ seal, workflowIdentity, targetManifest: manifest,
    targetModelBinding: implementationIdentity.modelBinding,
    implementationClosureSha256: implementationIdentity.implementationClosureSha256 });
}
