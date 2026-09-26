import path from 'node:path';
import { readFile } from 'node:fs/promises';

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
    optionalInputs: freezeList(['quick_confirmation', 'quick_progress_source']),
    secrets: freezeList([
      'RAVRADAR_R2_ACCOUNT_ID',
      'CLOUDFLARE_TRIP_GATEWAY_URL',
      'COPERNICUSMARINE_SERVICE_PASSWORD',
      'COPERNICUSMARINE_SERVICE_USERNAME',
      'DMI_API_KEY',
      'RAVRADAR_R2_ACCESS_KEY_ID',
      'RAVRADAR_R2_SECRET_ACCESS_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_URL',
      'TRIP_GATEWAY_SHARED_SECRET',
    ]),
    optionalSecrets: freezeList([
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
    inputs: freezeList([
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
