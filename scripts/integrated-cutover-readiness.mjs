#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_CONFIG } from '../config.js';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  assertIntegratedRavScoreSelection,
} from './lib/ravscore-profile-transition.mjs';
import {
  assertRavScoreModelBinding as assertCandidateGRollbackModelBinding,
  ravScoreModelBinding as candidateGRollbackModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import { buildSupabaseAdminHeaders } from './lib/supabase-admin-rest.mjs';
import { ACCOUNT_ASSISTANT_MIGRATION } from './lib/account-assistant-successor-source.mjs';
import { CURRENT_GRID_MIGRATION } from './lib/current-grid-successor-source.mjs';
import { nativeIdentityMigration, readNativeIdentityCanonicalSource }
  from './lib/native-sampling-identity-successor-source.mjs';
import {currentMemoryWarmupMigration,requireCurrentMemoryWarmupOutput,readCurrentMemoryWarmupCanonicalSource,
  assertCurrentMemoryWarmupArchivesAbsent,CURRENT_MEMORY_WARMUP_PROJECTION}
  from './lib/current-memory-warmup-successor-source.mjs';
import {establishedNativeCurrentOriginMigration,requireEstablishedNativeCurrentOriginOutput,
  readEstablishedNativeCurrentOriginCanonicalSource,ESTABLISHED_NATIVE_CURRENT_ORIGIN_PROJECTION}
  from './lib/established-native-current-origin-successor-source.mjs';
import {LAST_MILE_ENCLOSURE_BINDING,lastMileEnclosureMigration,requireLastMileEnclosureOutput,readLastMileEnclosureCanonicalSource,
  lastMileEnclosureCheckpointContractFromBase} from './lib/last-mile-enclosure-successor-source.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BINDING,accountStatisticsAssistantMigration,requireAccountStatisticsAssistantOutput,
  readAccountStatisticsAssistantCanonicalSource,accountStatisticsAssistantCheckpointContractFromBase}
  from './lib/account-statistics-assistant-successor-source.mjs';
// Controller-only source phase. Never import this module into model/kernel/pack.
import {NATIVE_ORIGINAL_CONTINUITY_BINDING,NATIVE_ORIGINAL_CONTINUITY_BEFORE,
  nativeOriginalContinuityMigration,requireNativeOriginalContinuityOutput,
  readNativeOriginalContinuityCanonicalSource,nativeOriginalContinuityCheckpointContractFromBase}
  from './lib/native-original-continuity-successor-source.mjs';
import {ASSISTANT_LATER_H0_BINDING,ASSISTANT_LATER_H0_BEFORE,assistantLaterH0Migration,requireAssistantLaterH0Output,
  readAssistantLaterH0CanonicalSource,assistantLaterH0CheckpointContractFromBase,
  ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE,ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,
  ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,assistantPublic587SuccessorMigration,requireAssistantPublic587SuccessorOutput,
  readAssistantPublic587SuccessorCanonicalSource,assistantPublic587SuccessorCheckpointContractFromBase,
  ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC588_SUCCESSOR_BINDING,
  assistantPublic588SuccessorMigration,requireAssistantPublic588SuccessorOutput,
  readAssistantPublic588SuccessorCanonicalSource,assistantPublic588SuccessorCheckpointContractFromBase,
  ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC590_SUCCESSOR_BINDING,
  assistantPublic590SuccessorMigration,requireAssistantPublic590SuccessorOutput,
  readAssistantPublic590SuccessorCanonicalSource,assistantPublic590SuccessorCheckpointContractFromBase}
  from './lib/assistant-later-h0-successor-source.mjs';
import {STATISTICS_REVISION_MIGRATION,STATISTICS_REVISION_PREDECESSOR,buildStatisticsPreferenceRevision}
  from './build-statistics-preference-revision.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIRECTORY = path.join(ROOT, 'supabase', 'migrations');
export const DEFAULT_CUTOVER_SOURCE_PHASE = ACTIVE.sourcePhase;
const KNOWLEDGE_PATH = path.join(ROOT, 'knowledge', 'rav-assistant-public-v1.json');
const CENTRAL_PROFILE_PATH = path.join(ROOT, 'data', 'admin', 'ravscore-profile-selection.json');
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_HEAD_PATTERN = /^[a-f0-9]{40}$/;
const MIGRATION_VERSION_PATTERN = /^\d{8,14}$/;
const READINESS_DOCUMENT_KEY = 'ravscore-integrated-cutover-readiness';
const READINESS_SCHEMA = 'ravscore-integrated-cutover-readiness-v1';
const DATABASE_READBACK_SCHEMA = 'ravscore-integrated-cutover-db-v1';
const CHECKPOINT_DATABASE_READBACK_SCHEMA = 'ravscore-checkpoint-db-v1';
export const CHECKPOINT_CAS_CONTRACT_ID = 'ravscore-checkpoint-metadata-cas-v1';
const MODEL_BINDING_FIELDS = Object.freeze([
  'modelId', 'stateSchemaVersion', 'variantId', 'profileId', 'componentSchemaId',
  'explanationSchemaId', 'rankingPolicyId', 'bestTimePolicyId',
  'presentationPolicyId', 'modelContractSha256', 'modelBundleSha256',
]);
export const TRIP_BINDING_POLICY_ID =
  'ravradar-trip-v3-exact-integrated-candidate-g-global-warmup-v6';
export const TRIP_ACTIVE_ADMISSION_POLICY_ID =
  'ravradar-trip-v3-exact-operational-active-global-warmup-v6';
const ASSISTANT_FUNCTION = 'ravradar-assistant';
const PUBLIC_ORIGIN = 'https://ravradar.dk';

export const NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS = Object.freeze([
  Object.freeze({
    version: '20260829010000',
    id: '20260829010000_ravscore_operational_documents_no_history',
    filename: '20260829010000_ravscore_operational_documents_no_history.sql',
  }),
  Object.freeze({
    version: '20260829020000',
    id: '20260829020000_integrated_trip_calibration_binding',
    filename: '20260829020000_integrated_trip_calibration_binding.sql',
  }),
  Object.freeze({
    version: '20260901010000',
    id: '20260901010000_integrated_trip_measured_warmup_admission',
    filename: '20260901010000_integrated_trip_measured_warmup_admission.sql',
  }),
  Object.freeze({
    version: '20260903010000',
    id: '20260903010000_ravscore_checkpoint_metadata_cas',
    filename: '20260903010000_ravscore_checkpoint_metadata_cas.sql',
  }),
  Object.freeze({
    version: '20260904140000',
    id: '20260904140000_harmonie_wind_reference_binding',
    filename: '20260904140000_harmonie_wind_reference_binding.sql',
  }),
  Object.freeze({
    version: '20260905090000',
    id: '20260905090000_open_meteo_current_fallback_binding',
    filename: '20260905090000_open_meteo_current_fallback_binding.sql',
  }),
  Object.freeze({
    version: '20260906162332',
    id: '20260906162332_per_pair_weather_fallback_binding',
    filename: '20260906162332_per_pair_weather_fallback_binding.sql',
  }),
  Object.freeze({
    version: '20260907084343',
    id: '20260907084343_horizon_valid_weather_binding',
    filename: '20260907084343_horizon_valid_weather_binding.sql',
  }),
  Object.freeze({
    version: '20260909194000',
    id: '20260909194000_wam_same_run_resolution_binding',
    filename: '20260909194000_wam_same_run_resolution_binding.sql',
  }),
  Object.freeze({
    version: '20260912122607',
    id: '20260912122607_measured_rollback_warmup_binding',
    filename: '20260912122607_measured_rollback_warmup_binding.sql',
  }),
  Object.freeze({
    version: '20260912141641',
    id: '20260912141641_state_only_hold_closure_v2_binding',
    filename: '20260912141641_state_only_hold_closure_v2_binding.sql',
  }),
  Object.freeze({
    version: '20260912194206',
    id: '20260912194206_local_unavailable_cutover_binding',
    filename: '20260912194206_local_unavailable_cutover_binding.sql',
  }),
  Object.freeze({
    version: '20260913010000',
    id: '20260913010000_public_runtime_oracle_binding',
    filename: '20260913010000_public_runtime_oracle_binding.sql',
  }),
  Object.freeze({
    version: '20260914010000',
    id: '20260914010000_h0_reference_recovery_binding',
    filename: '20260914010000_h0_reference_recovery_binding.sql',
  }),
  Object.freeze({
    version: '20260914020000',
    id: '20260914020000_h0_state_snapshot_binding',
    filename: '20260914020000_h0_state_snapshot_binding.sql',
  }),
  Object.freeze({
    version: '20260914234500',
    id: '20260914234500_post_cutover_current_hold_binding',
    filename: '20260914234500_post_cutover_current_hold_binding.sql',
  }),
  Object.freeze({
    version: '20260915020000',
    id: '20260915020000_private_runtime_storage_deny',
    filename: '20260915020000_private_runtime_storage_deny.sql',
  }),
  Object.freeze({
    version: '20260916120000',
    id: '20260916120000_valid_data_before_local_missing_binding',
    filename: '20260916120000_valid_data_before_local_missing_binding.sql',
  }),
  Object.freeze({
    version: '20260917001500',
    id: '20260917001500_partial_zone_public_metadata_binding',
    filename: '20260917001500_partial_zone_public_metadata_binding.sql',
  }),
  Object.freeze({
    version: '20260918125600',
    id: '20260918125600_last_mile_history_envelope_binding',
    filename: '20260918125600_last_mile_history_envelope_binding.sql',
  }),
  Object.freeze({
    version: '20260918190000',
    id: '20260918190000_weather_input_resolution_binding',
    filename: '20260918190000_weather_input_resolution_binding.sql',
  }),
  Object.freeze({
    version: '20260919010000',
    id: '20260919010000_current_input_foundation_binding',
    filename: '20260919010000_current_input_foundation_binding.sql',
  }),
  Object.freeze({
    version: '20260919020000',
    id: '20260919020000_measured_warmup_checkpoint',
    filename: '20260919020000_measured_warmup_checkpoint.sql',
  }),
  Object.freeze({
    version: '20260919231000',
    id: '20260919231000_public_hour_delivery_binding',
    filename: '20260919231000_public_hour_delivery_binding.sql',
  }),
  Object.freeze({
    version: '20260920220000',
    id: '20260920220000_public_hour_pack_capacity_binding',
    filename: '20260920220000_public_hour_pack_capacity_binding.sql',
  }),
  Object.freeze({
    version: '20260922100000',
    id: '20260922100000_integrated_trip_binding_repair',
    filename: '20260922100000_integrated_trip_binding_repair.sql',
  }),
  Object.freeze({
    version: '20260922170000',
    id: '20260922170000_integrated_model_binding_successor',
    filename: '20260922170000_integrated_model_binding_successor.sql',
  }),
  Object.freeze({
    version: '20260923052100',
    id: '20260923052100_integrated_current_projection_binding',
    filename: '20260923052100_integrated_current_projection_binding.sql',
  }),
  Object.freeze({
    version: '20260923091500',
    id: '20260923091500_integrated_native_hold_continuation_binding',
    filename: '20260923091500_integrated_native_hold_continuation_binding.sql',
  }),
  Object.freeze({
    version: '20260923100000',
    id: '20260923100000_integrated_checkpoint_part_identity_binding',
    filename: '20260923100000_integrated_checkpoint_part_identity_binding.sql',
  }),
  Object.freeze({
    version: '20260923110000',
    id: '20260923110000_integrated_checkpoint_warmup_status_binding',
    filename: '20260923110000_integrated_checkpoint_warmup_status_binding.sql',
  }),
  Object.freeze({
    version: '20260923120000',
    id: '20260923120000_integrated_checkpoint_missing_state_binding',
    filename: '20260923120000_integrated_checkpoint_missing_state_binding.sql',
  }),
  Object.freeze({
    version: '20260923130000',
    id: '20260923130000_checkpoint_rejection_diagnostic',
    filename: '20260923130000_checkpoint_rejection_diagnostic.sql',
  }),
  Object.freeze({
    version: '20260923140000',
    id: '20260923140000_checkpoint_native_hold_null_evidence',
    filename: '20260923140000_checkpoint_native_hold_null_evidence.sql',
  }),
  Object.freeze({
    version: '20260923150000',
    id: '20260923150000_checkpoint_candidate_diagnostic_correction',
    filename: '20260923150000_checkpoint_candidate_diagnostic_correction.sql',
  }),
  Object.freeze({
    version: '20260923160000',
    id: '20260923160000_checkpoint_candidate_companion_id',
    filename: '20260923160000_checkpoint_candidate_companion_id.sql',
  }),
  Object.freeze({
    version: '20260923210000',
    id: '20260923210000_checkpoint_cas_bounded_timeout',
    filename: '20260923210000_checkpoint_cas_bounded_timeout.sql',
  }),
  Object.freeze({
    version: '20260925150000',
    id: '20260925150000_weather_selection_model_binding',
    filename: '20260925150000_weather_selection_model_binding.sql',
  }),
  Object.freeze({
    version: '20260926170000',
    id: '20260926170000_exact_checkpoint_predecessor',
    filename: '20260926170000_exact_checkpoint_predecessor.sql',
  }),
  Object.freeze({
    version: '20261002080000',
    id: '20261002080000_top20_display_binding',
    filename: '20261002080000_top20_display_binding.sql',
  }),
  Object.freeze({
    version: '20261002094500',
    id: '20261002094500_restore_checkpoint_cas_timeout',
    filename: '20261002094500_restore_checkpoint_cas_timeout.sql',
  }),
  Object.freeze({
    version: '20261003080000',
    id: '20261003080000_copernicus_child_close_binding',
    filename: '20261003080000_copernicus_child_close_binding.sql',
  }),
  Object.freeze({
    version: '20261004190000',
    id: '20261004190000_owner_current_source_domain_binding',
    filename: '20261004190000_owner_current_source_domain_binding.sql',
  }),
  Object.freeze({
    version:'20261005000000',
    id:'20261005000000_owner_water_level_only_binding',
    filename:'20261005000000_owner_water_level_only_binding.sql',
  }),
  Object.freeze({
    version: '20261010130000',
    id: '20261010130000_owner_export_origin_bound_successor',
    filename: '20261010130000_owner_export_origin_bound_successor.sql',
  }),
  Object.freeze({
    version: '20261012200000',
    id: '20261012200000_checkpoint_cas_single_projection_successor',
    filename: '20261012200000_checkpoint_cas_single_projection_successor.sql',
  }),
  ACCOUNT_ASSISTANT_MIGRATION,
  CURRENT_GRID_MIGRATION,
  STATISTICS_REVISION_MIGRATION,
  nativeIdentityMigration(),
]);

// Frozen installed native0600 is a historical source phase, never current.
// The current phase is fixed only after actual C -> I -> T and SQL issuance.
export const CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS = Object.freeze([
  ...NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS, currentMemoryWarmupMigration(),
]);
export const ESTABLISHED_NATIVE_CURRENT_ORIGIN_REQUIRED_CUTOVER_MIGRATIONS = Object.freeze([
  ...CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS, establishedNativeCurrentOriginMigration(),
]);
// No invented descriptor while UNISSUED. Every active default below requires
// the new fixed output before I/O; an issued controller successor appends its exact source.
export const REQUIRED_CUTOVER_MIGRATIONS = Object.freeze([
  ...ESTABLISHED_NATIVE_CURRENT_ORIGIN_REQUIRED_CUTOVER_MIGRATIONS,
  ...(LAST_MILE_ENCLOSURE_BINDING === null ? [] : [lastMileEnclosureMigration()]),
  ...(ACCOUNT_STATISTICS_ASSISTANT_BINDING === null ? [] : [accountStatisticsAssistantMigration()]),
  ...(NATIVE_ORIGINAL_CONTINUITY_BINDING === null ? [] : [nativeOriginalContinuityMigration()]),
  ...(ASSISTANT_LATER_H0_BINDING === null ? [] : [assistantLaterH0Migration()]),
  ...(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING === null ? [] : [assistantPublic587SuccessorMigration()]),
  ...(ASSISTANT_PUBLIC588_SUCCESSOR_BINDING === null ? [] : [assistantPublic588SuccessorMigration()]),
  ...(ASSISTANT_PUBLIC590_SUCCESSOR_BINDING === null ? [] : [assistantPublic590SuccessorMigration()]),
]);
function migrationsForSourcePhase(sourcePhase) {
  assert(['native0600','current-memory-warmup','established-native-current-origin','last-mile-enclosure','account-statistics-assistant','native-original-continuity','assistant-later-h0','assistant-public587-successor','assistant-public588-successor','assistant-public590-successor'].includes(sourcePhase));
  if (sourcePhase === 'assistant-public590-successor') return assistantPublic590SuccessorRequiredMigrations();
  if (sourcePhase === 'assistant-public588-successor') return assistantPublic588SuccessorRequiredMigrations();
  if (sourcePhase === 'assistant-public587-successor') return assistantPublic587SuccessorRequiredMigrations();
  if (sourcePhase === 'assistant-later-h0') return assistantLaterH0RequiredMigrations();
  if (sourcePhase === 'native-original-continuity') return nativeOriginalContinuityRequiredMigrations();
  if (sourcePhase === 'account-statistics-assistant') return accountStatisticsAssistantRequiredMigrations();
  if (sourcePhase === 'last-mile-enclosure') return lastMileEnclosureRequiredMigrations();
  if (sourcePhase === 'native0600') return NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS;
  if (sourcePhase === 'established-native-current-origin') {
    requireEstablishedNativeCurrentOriginOutput(); return ESTABLISHED_NATIVE_CURRENT_ORIGIN_REQUIRED_CUTOVER_MIGRATIONS;
  }
  requireCurrentMemoryWarmupOutput();
  return CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS;
}
function canonicalForSourcePhase(sourcePhase,migrationsDirectory) {
  migrationsForSourcePhase(sourcePhase); // Unknown phases fail before filesystem access.
  if(sourcePhase==='assistant-public590-successor')return readAssistantPublic590SuccessorCanonicalSource({migrationsDirectory});
  if(sourcePhase==='assistant-public588-successor')return readAssistantPublic588SuccessorCanonicalSource({migrationsDirectory});
  if(sourcePhase==='assistant-public587-successor')return readAssistantPublic587SuccessorCanonicalSource({migrationsDirectory});
  if(sourcePhase==='assistant-later-h0')return readAssistantLaterH0CanonicalSource({migrationsDirectory});
  if(sourcePhase==='native-original-continuity')return readNativeOriginalContinuityCanonicalSource({migrationsDirectory});
  if(sourcePhase==='account-statistics-assistant')return readAccountStatisticsAssistantCanonicalSource({migrationsDirectory});
  if(sourcePhase==='last-mile-enclosure')return readLastMileEnclosureCanonicalSource({migrationsDirectory});
  if(sourcePhase==='established-native-current-origin')
    return readEstablishedNativeCurrentOriginCanonicalSource({migrationsDirectory});
  return sourcePhase==='current-memory-warmup'
    ? readCurrentMemoryWarmupCanonicalSource({migrationsDirectory})
    : readNativeIdentityCanonicalSource({migrationsDirectory});
}

export const LATEST_RAVSCORE_BINDING_MIGRATION =
  REQUIRED_CUTOVER_MIGRATIONS.find(item => item.version === '20260920220000');
export const TRIP_BINDING_POLICY_SOURCE_MIGRATION =
  REQUIRED_CUTOVER_MIGRATIONS.find(item => item.version === '20261010130000');
export const CHECKPOINT_CAS_SOURCE_MIGRATION =
  REQUIRED_CUTOVER_MIGRATIONS.find(item => item.version === '20261012200000');
export const ACCOUNT_ASSISTANT_SOURCE_MIGRATION = ACCOUNT_ASSISTANT_MIGRATION;
export const CHECKPOINT_NATIVE_HOLD_MIGRATION =
  REQUIRED_CUTOVER_MIGRATIONS.find(item => item.version === '20260923140000');
export const CHECKPOINT_COMPANION_ID_MIGRATION =
  REQUIRED_CUTOVER_MIGRATIONS.find(item => item.version === '20260923160000');
export const LATEST_REQUIRED_CUTOVER_MIGRATION = REQUIRED_CUTOVER_MIGRATIONS.at(-1);


// Explicit current phase; the frozen50 list remains a distinct historical source.
export function currentMemoryWarmupRequiredMigrations(){
  requireCurrentMemoryWarmupOutput();
  assert.equal(NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS.length,50);
  assert.equal(NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS.at(-1).version,'20261016060000');
  assert.equal(NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS.filter(m=>m.version==='20261013230000').length,1);
  return CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS;
}
function currentMemoryWarmupRows(migrationListText){
  const required=currentMemoryWarmupRequiredMigrations(); // guard FIRST
  const rows=parseSupabaseMigrationList(migrationListText);
  const local=uniqueVersions(rows,'local'),remote=uniqueVersions(rows,'remote');
  assertCurrentMemoryWarmupArchivesAbsent(local,remote);
  const allowed=new Set(required.map(m=>m.version));
  for(const {version} of required){assert(local.has(version),'Missing exact local phase source');
    if(version!==required.at(-1).version)assert(remote.has(version),'Missing installed predecessor');}
  for(const versions of [local,remote])for(const version of versions)
    assert(allowed.has(version)||migrationChronologicalKey(version)<migrationChronologicalKey(required[0].version),
      'Unknown post-cutover migration');
  const latest=[...remote].sort((a,b)=>migrationChronologicalKey(a)<migrationChronologicalKey(b)?-1:1).at(-1);
  assert.equal(latest,remote.has(required.at(-1).version)?required.at(-1).version:'20261016060000');
  return {required,local,remote};
}
export function assertCurrentMemoryWarmupMigrationsApplied(migrationListText){
  const {required,local,remote}=currentMemoryWarmupRows(migrationListText);
  assert(remote.has(required.at(-1).version));
  assert.deepEqual([...local].filter(v=>!remote.has(v)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(m=>m.version))});
}
export async function assertCurrentMemoryWarmupMigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireCurrentMemoryWarmupOutput(); // before fs, SQL parser or any caller input
  const {required,local,remote}=currentMemoryWarmupRows(migrationListText);
  await readCurrentMemoryWarmupCanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'current-memory-warmup'});
  const next=required.at(-1),pending=[...local].filter(v=>!remote.has(v));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Sole pending new phase only');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),alreadyAppliedVersions:Object.freeze(required.filter(m=>remote.has(m.version)).map(m=>m.version))});
}
export async function prepareCurrentMemoryWarmupCutoverWorkdir({workdir}={}){
  requireCurrentMemoryWarmupOutput();
  await readCurrentMemoryWarmupCanonicalSource();
  const prepared=await prepareTemporarySupabaseCutoverWorkdir({workdir,includeStatisticsPreferenceRevisionSource:true,
    sourcePhase:'current-memory-warmup'});
  const staged=await fs.readdir(prepared.migrationsDirectory);
  assert(staged.includes('20261013230000_account_statistics_revision.sql'));
  assert(staged.includes('20261016060000_native_sampling_identity_original_bound_successor.sql'));
  for(const v of ['20261014140000','20261015030000','20261016030000'])assert(!staged.some(f=>f.startsWith(v+'_')));
  const descriptor=currentMemoryWarmupMigration();
  assert(staged.includes(descriptor.filename),'Normal current workdir must include the new successor once');
  await readCurrentMemoryWarmupCanonicalSource({migrationsDirectory:prepared.migrationsDirectory});
  return prepared;
}
export async function hydrateCurrentMemoryWarmupRemoteMigrationHistory(options){
  requireCurrentMemoryWarmupOutput();
  const directory=path.join(assertTemporaryCutoverWorkdir(options.workdir),'supabase','migrations');
  currentMemoryWarmupRows(options.migrationListText);
  await readCurrentMemoryWarmupCanonicalSource({migrationsDirectory:directory});
  return hydrateTemporaryRemoteMigrationHistory({...options,sourcePhase:'current-memory-warmup'});
}

// The positive-origin phase is a separate sole-pending transition. These
// checks only select/verify sources; they never install SQL or mint origin.
export function establishedNativeCurrentOriginRequiredMigrations(){
  requireEstablishedNativeCurrentOriginOutput();
  assert.equal(CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS.length,51);
  assert.equal(CURRENT_MEMORY_WARMUP_REQUIRED_CUTOVER_MIGRATIONS.at(-1).version,'20261017020000');
  assert.equal(ESTABLISHED_NATIVE_CURRENT_ORIGIN_REQUIRED_CUTOVER_MIGRATIONS.length,52);return ESTABLISHED_NATIVE_CURRENT_ORIGIN_REQUIRED_CUTOVER_MIGRATIONS;
}
function establishedNativeCurrentOriginRows(migrationListText){
  const required=establishedNativeCurrentOriginRequiredMigrations();
  const rows=parseSupabaseMigrationList(migrationListText);
  const local=uniqueVersions(rows,'local'),remote=uniqueVersions(rows,'remote');
  assertCurrentMemoryWarmupArchivesAbsent(local,remote);
  const allowed=new Set(required.map(row=>row.version)),next=required.at(-1);
  for(const {version}of required){assert(local.has(version),'Missing exact origin source');
    if(version!==next.version)assert(remote.has(version),'Missing genuine installed predecessor');}
  for(const versions of [local,remote])for(const version of versions)
    assert(allowed.has(version)||migrationChronologicalKey(version)<migrationChronologicalKey(required[0].version),
      'Unknown post-cutover origin migration');
  const latest=[...remote].sort((a,b)=>migrationChronologicalKey(a)<migrationChronologicalKey(b)?-1:1).at(-1);
  assert.equal(latest,remote.has(next.version)?next.version:'20261017020000');
  return {required,local,remote};
}
export function assertEstablishedNativeCurrentOriginMigrationsApplied(migrationListText){
  const {required,local,remote}=establishedNativeCurrentOriginRows(migrationListText);
  assert(remote.has(required.at(-1).version),'Origin requires its installed exact source');
  assert.deepEqual([...local].filter(version=>!remote.has(version)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(row=>row.version))});
}
export async function assertEstablishedNativeCurrentOriginMigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireEstablishedNativeCurrentOriginOutput();
  const {required,local,remote}=establishedNativeCurrentOriginRows(migrationListText);
  await readEstablishedNativeCurrentOriginCanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'established-native-current-origin'});
  const next=required.at(-1),pending=[...local].filter(version=>!remote.has(version));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Only the exact new origin phase may be pending');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),
    alreadyAppliedVersions:Object.freeze(required.filter(row=>remote.has(row.version)).map(row=>row.version))});
}
export async function prepareEstablishedNativeCurrentOriginCutoverWorkdir({workdir}={}){
  requireEstablishedNativeCurrentOriginOutput();await readEstablishedNativeCurrentOriginCanonicalSource();
  const prepared=await prepareTemporarySupabaseCutoverWorkdir({workdir,includeStatisticsPreferenceRevisionSource:true,
    sourcePhase:'established-native-current-origin'});
  const staged=await fs.readdir(prepared.migrationsDirectory);
  for(const version of ['20261014140000','20261015030000','20261016030000'])
    assert(!staged.some(filename=>filename.startsWith(version+'_')));
  await readEstablishedNativeCurrentOriginCanonicalSource({migrationsDirectory:prepared.migrationsDirectory});return prepared;
}
export async function hydrateEstablishedNativeCurrentOriginRemoteMigrationHistory(options){
  requireEstablishedNativeCurrentOriginOutput();
  const directory=path.join(assertTemporaryCutoverWorkdir(options.workdir),'supabase','migrations');
  establishedNativeCurrentOriginRows(options.migrationListText);
  await readEstablishedNativeCurrentOriginCanonicalSource({migrationsDirectory:directory});
  return hydrateTemporaryRemoteMigrationHistory({...options,sourcePhase:'established-native-current-origin'});
}

// Current fixed phase; the genuine historical52 source/oracle runs in its frozen context.
export function lastMileEnclosureRequiredMigrations(){
  requireLastMileEnclosureOutput(); // null output refuses before I/O, never an old-phase fallback.
  const previous=establishedNativeCurrentOriginRequiredMigrations();
  assert.equal(previous.length,52);assert.equal(previous.at(-1).version,'20261017140000');
  return Object.freeze([...previous,lastMileEnclosureMigration()]);
}
function lastMileEnclosureRows(migrationListText){
  const required=lastMileEnclosureRequiredMigrations();
  const rows=parseSupabaseMigrationList(migrationListText);
  const local=uniqueVersions(rows,'local'),remote=uniqueVersions(rows,'remote');
  assertCurrentMemoryWarmupArchivesAbsent(local,remote);
  const allowed=new Set(required.map(row=>row.version)),next=required.at(-1);
  for(const {version}of required){assert(local.has(version),'Missing exact origin source');
    if(version!==next.version)assert(remote.has(version),'Missing genuine installed predecessor');}
  for(const versions of [local,remote])for(const version of versions)
    assert(allowed.has(version)||migrationChronologicalKey(version)<migrationChronologicalKey(required[0].version),
      'Unknown post-cutover origin migration');
  const latest=[...remote].sort((a,b)=>migrationChronologicalKey(a)<migrationChronologicalKey(b)?-1:1).at(-1);
  assert.equal(latest,remote.has(next.version)?next.version:'20261017140000');
  return {required,local,remote};
}
export function assertLastMileEnclosureMigrationsApplied(migrationListText){
  const {required,local,remote}=lastMileEnclosureRows(migrationListText);
  assert(remote.has(required.at(-1).version),'Origin requires its installed exact source');
  assert.deepEqual([...local].filter(version=>!remote.has(version)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(row=>row.version))});
}
export async function assertLastMileEnclosureMigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireLastMileEnclosureOutput();
  const {required,local,remote}=lastMileEnclosureRows(migrationListText);
  await readLastMileEnclosureCanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'last-mile-enclosure'});
  const next=required.at(-1),pending=[...local].filter(version=>!remote.has(version));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Only the exact new origin phase may be pending');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),
    alreadyAppliedVersions:Object.freeze(required.filter(row=>remote.has(row.version)).map(row=>row.version))});
}
export async function prepareLastMileEnclosureCutoverWorkdir({workdir}={}){
  requireLastMileEnclosureOutput();await readLastMileEnclosureCanonicalSource();
  const prepared=await prepareTemporarySupabaseCutoverWorkdir({workdir,includeStatisticsPreferenceRevisionSource:true,
    sourcePhase:'last-mile-enclosure'});
  const staged=await fs.readdir(prepared.migrationsDirectory);
  for(const version of ['20261014140000','20261015030000','20261016030000'])
    assert(!staged.some(filename=>filename.startsWith(version+'_')));
  await readLastMileEnclosureCanonicalSource({migrationsDirectory:prepared.migrationsDirectory});return prepared;
}
export async function hydrateLastMileEnclosureRemoteMigrationHistory(options){
  requireLastMileEnclosureOutput();
  const directory=path.join(assertTemporaryCutoverWorkdir(options.workdir),'supabase','migrations');
  lastMileEnclosureRows(options.migrationListText);
  await readLastMileEnclosureCanonicalSource({migrationsDirectory:directory});
  return hydrateTemporaryRemoteMigrationHistory({...options,sourcePhase:'last-mile-enclosure'});
}

// Separate585 phase; the genuine complete584 source/oracle remains unchanged.
export function accountStatisticsAssistantRequiredMigrations(){
  requireAccountStatisticsAssistantOutput(); // null output refuses before I/O, never an old-phase fallback.
  const previous=lastMileEnclosureRequiredMigrations();
  assert.equal(previous.length,53);assert.equal(previous.at(-1).version,'20261019060000');
  return Object.freeze([...previous,accountStatisticsAssistantMigration()]);
}
function accountStatisticsAssistantRows(migrationListText){
  const required=accountStatisticsAssistantRequiredMigrations();
  const rows=parseSupabaseMigrationList(migrationListText);
  const local=uniqueVersions(rows,'local'),remote=uniqueVersions(rows,'remote');
  assertCurrentMemoryWarmupArchivesAbsent(local,remote);
  const allowed=new Set(required.map(row=>row.version)),next=required.at(-1);
  for(const {version}of required){assert(local.has(version),'Missing exact origin source');
    if(version!==next.version)assert(remote.has(version),'Missing genuine installed predecessor');}
  for(const versions of [local,remote])for(const version of versions)
    assert(allowed.has(version)||migrationChronologicalKey(version)<migrationChronologicalKey(required[0].version),
      'Unknown post-cutover origin migration');
  const latest=[...remote].sort((a,b)=>migrationChronologicalKey(a)<migrationChronologicalKey(b)?-1:1).at(-1);
  assert.equal(latest,remote.has(next.version)?next.version:'20261019060000');
  return {required,local,remote};
}
export function assertAccountStatisticsAssistantMigrationsApplied(migrationListText){
  const {required,local,remote}=accountStatisticsAssistantRows(migrationListText);
  assert(remote.has(required.at(-1).version),'Origin requires its installed exact source');
  assert.deepEqual([...local].filter(version=>!remote.has(version)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(row=>row.version))});
}
export async function assertAccountStatisticsAssistantMigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireAccountStatisticsAssistantOutput();
  const {required,local,remote}=accountStatisticsAssistantRows(migrationListText);
  await readAccountStatisticsAssistantCanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'account-statistics-assistant'});
  const next=required.at(-1),pending=[...local].filter(version=>!remote.has(version));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Only the exact new origin phase may be pending');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),
    alreadyAppliedVersions:Object.freeze(required.filter(row=>remote.has(row.version)).map(row=>row.version))});
}
export async function prepareAccountStatisticsAssistantCutoverWorkdir({workdir}={}){
  requireAccountStatisticsAssistantOutput();await readAccountStatisticsAssistantCanonicalSource();
  const prepared=await prepareTemporarySupabaseCutoverWorkdir({workdir,includeStatisticsPreferenceRevisionSource:true,
    sourcePhase:'account-statistics-assistant'});
  const staged=await fs.readdir(prepared.migrationsDirectory);
  for(const version of ['20261014140000','20261015030000','20261016030000'])
    assert(!staged.some(filename=>filename.startsWith(version+'_')));
  await readAccountStatisticsAssistantCanonicalSource({migrationsDirectory:prepared.migrationsDirectory});return prepared;
}
export async function hydrateAccountStatisticsAssistantRemoteMigrationHistory(options){
  requireAccountStatisticsAssistantOutput();
  const directory=path.join(assertTemporaryCutoverWorkdir(options.workdir),'supabase','migrations');
  accountStatisticsAssistantRows(options.migrationListText);
  await readAccountStatisticsAssistantCanonicalSource({migrationsDirectory:directory});
  return hydrateTemporaryRemoteMigrationHistory({...options,sourcePhase:'account-statistics-assistant'});
}

// Named controller phase only: plan/readback are not runtime or publication authority.
export function assistantLaterH0RequiredMigrations(){
  requireAssistantLaterH0Output();const previous=nativeOriginalContinuityRequiredMigrations();
  assert.equal(previous.length,55);assert.equal(previous.at(-1).version,ASSISTANT_LATER_H0_BEFORE.version);
  return Object.freeze([...previous,assistantLaterH0Migration()]);
}
export function assistantPublic587SuccessorRequiredMigrations(){
  requireAssistantPublic587SuccessorOutput();const previous=assistantLaterH0RequiredMigrations();
  assert.equal(previous.length,56);assert.equal(previous.at(-1).version,ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE.version);
  return Object.freeze([...previous,assistantPublic587SuccessorMigration()]);
}
export function assistantPublic588SuccessorRequiredMigrations(){
  requireAssistantPublic588SuccessorOutput();const previous=assistantPublic587SuccessorRequiredMigrations();
  assert.equal(previous.length,57);assert.equal(previous.at(-1).version,ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE.version);
  return Object.freeze([...previous,assistantPublic588SuccessorMigration()]);
}
export function assistantPublic590SuccessorRequiredMigrations(){
  requireAssistantPublic590SuccessorOutput();const previous=assistantPublic588SuccessorRequiredMigrations();
  assert.equal(previous.length,58);assert.equal(previous.at(-1).version,ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE.version);
  return Object.freeze([...previous,assistantPublic590SuccessorMigration()]);
}
export function nativeOriginalContinuityRequiredMigrations(){
  requireNativeOriginalContinuityOutput(); // Explicit UNISSUED phase refuses before I/O.
  const previous=accountStatisticsAssistantRequiredMigrations();
  assert.equal(previous.length,54);
  assert.equal(previous.at(-1).version,NATIVE_ORIGINAL_CONTINUITY_BEFORE.version);
  return Object.freeze([...previous,nativeOriginalContinuityMigration()]);
}
function nativeOriginalContinuityRows(migrationListText){
  const required=nativeOriginalContinuityRequiredMigrations();
  const rows=parseSupabaseMigrationList(migrationListText);
  const local=uniqueVersions(rows,'local'),remote=uniqueVersions(rows,'remote');
  assertCurrentMemoryWarmupArchivesAbsent(local,remote);
  const allowed=new Set(required.map(row=>row.version)),next=required.at(-1);
  for(const {version}of required){assert(local.has(version),'Missing exact native continuity source');
    if(version!==next.version)assert(remote.has(version),'Missing genuine installed585 predecessor');}
  for(const versions of [local,remote])for(const version of versions)
    assert(allowed.has(version)||migrationChronologicalKey(version)<migrationChronologicalKey(required[0].version),
      'Unknown post-cutover native continuity migration');
  const latest=[...remote].sort((a,b)=>migrationChronologicalKey(a)<migrationChronologicalKey(b)?-1:1).at(-1);
  assert.equal(latest,remote.has(next.version)?next.version:NATIVE_ORIGINAL_CONTINUITY_BEFORE.version);
  return {required,local,remote};
}
export function assertNativeOriginalContinuityMigrationsApplied(migrationListText){
  const {required,local,remote}=nativeOriginalContinuityRows(migrationListText);
  assert(remote.has(required.at(-1).version),'Native continuity requires its installed exact source');
  assert.deepEqual([...local].filter(version=>!remote.has(version)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(row=>row.version))});
}
export async function assertNativeOriginalContinuityMigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireNativeOriginalContinuityOutput();
  const {required,local,remote}=nativeOriginalContinuityRows(migrationListText);
  await readNativeOriginalContinuityCanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'native-original-continuity'});
  const next=required.at(-1),pending=[...local].filter(version=>!remote.has(version));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Only the exact native continuity phase may be pending');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),
    alreadyAppliedVersions:Object.freeze(required.filter(row=>remote.has(row.version)).map(row=>row.version))});
}
export async function prepareNativeOriginalContinuityCutoverWorkdir({workdir}={}){
  requireNativeOriginalContinuityOutput();await readNativeOriginalContinuityCanonicalSource();
  const prepared=await prepareTemporarySupabaseCutoverWorkdir({workdir,includeStatisticsPreferenceRevisionSource:true,
    sourcePhase:'native-original-continuity'});
  const staged=await fs.readdir(prepared.migrationsDirectory);
  for(const version of ['20261014140000','20261015030000','20261016030000'])
    assert(!staged.some(filename=>filename.startsWith(version+'_')));
  await readNativeOriginalContinuityCanonicalSource({migrationsDirectory:prepared.migrationsDirectory});return prepared;
}
export async function hydrateNativeOriginalContinuityRemoteMigrationHistory(options){
  requireNativeOriginalContinuityOutput();
  const directory=path.join(assertTemporaryCutoverWorkdir(options.workdir),'supabase','migrations');
  nativeOriginalContinuityRows(options.migrationListText);
  await readNativeOriginalContinuityCanonicalSource({migrationsDirectory:directory});
  return hydrateTemporaryRemoteMigrationHistory({...options,sourcePhase:'native-original-continuity'});
}

const ISSUED_ASSISTANT587_ROWS=Object.freeze({
  required:assistantLaterH0RequiredMigrations,before:ASSISTANT_LATER_H0_BEFORE});
const PUBLIC587_SUCCESSOR_ROWS=Object.freeze({
  required:assistantPublic587SuccessorRequiredMigrations,before:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE});
const PUBLIC588_SUCCESSOR_ROWS=Object.freeze({
  required:assistantPublic588SuccessorRequiredMigrations,before:ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE});
const PUBLIC590_SUCCESSOR_ROWS=Object.freeze({
  required:assistantPublic590SuccessorRequiredMigrations,before:ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE});
function assistantLaterH0Rows(migrationListText){
  return fixedAssistantRows(migrationListText,ISSUED_ASSISTANT587_ROWS);
}
function fixedAssistantRows(migrationListText,profile){
  assert(profile===ISSUED_ASSISTANT587_ROWS||profile===PUBLIC587_SUCCESSOR_ROWS||profile===PUBLIC588_SUCCESSOR_ROWS||profile===PUBLIC590_SUCCESSOR_ROWS);
  const required=profile.required();
  const rows=parseSupabaseMigrationList(migrationListText);
  const local=uniqueVersions(rows,'local'),remote=uniqueVersions(rows,'remote');
  assertCurrentMemoryWarmupArchivesAbsent(local,remote);
  const allowed=new Set(required.map(row=>row.version)),next=required.at(-1);
  for(const {version}of required){assert(local.has(version),'Missing exact assistant later-H0 source');
    if(version!==next.version)assert(remote.has(version),'Missing genuine installed assistant predecessor');}
  for(const versions of [local,remote])for(const version of versions)
    assert(allowed.has(version)||migrationChronologicalKey(version)<migrationChronologicalKey(required[0].version),
      'Unknown post-cutover assistant later-H0 migration');
  const latest=[...remote].sort((a,b)=>migrationChronologicalKey(a)<migrationChronologicalKey(b)?-1:1).at(-1);
  assert.equal(latest,remote.has(next.version)?next.version:profile.before.version);
  return {required,local,remote};
}
export function assertAssistantLaterH0MigrationsApplied(migrationListText){
  const {required,local,remote}=assistantLaterH0Rows(migrationListText);
  assert(remote.has(required.at(-1).version),'Native continuity requires its installed exact source');
  assert.deepEqual([...local].filter(version=>!remote.has(version)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(row=>row.version))});
}
export async function assertAssistantLaterH0MigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireAssistantLaterH0Output();
  const {required,local,remote}=assistantLaterH0Rows(migrationListText);
  await readAssistantLaterH0CanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'assistant-later-h0'});
  const next=required.at(-1),pending=[...local].filter(version=>!remote.has(version));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Only the exact assistant later-H0 phase may be pending');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),
    alreadyAppliedVersions:Object.freeze(required.filter(row=>remote.has(row.version)).map(row=>row.version))});
}
export function assertAssistantPublic587SuccessorMigrationsApplied(migrationListText){
  const {required,local,remote}=fixedAssistantRows(migrationListText,PUBLIC587_SUCCESSOR_ROWS);
  assert(remote.has(required.at(-1).version),'Public587 successor requires its installed exact source');
  assert.deepEqual([...local].filter(version=>!remote.has(version)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(row=>row.version))});
}
export async function assertAssistantPublic587SuccessorMigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireAssistantPublic587SuccessorOutput();
  const {required,local,remote}=fixedAssistantRows(migrationListText,PUBLIC587_SUCCESSOR_ROWS);
  await readAssistantPublic587SuccessorCanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'assistant-public587-successor'});
  const next=required.at(-1),pending=[...local].filter(version=>!remote.has(version));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Only the exact public587 successor may be pending');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),
    alreadyAppliedVersions:Object.freeze(required.filter(row=>remote.has(row.version)).map(row=>row.version))});
}
export function assertAssistantPublic588SuccessorMigrationsApplied(migrationListText){
  const {required,local,remote}=fixedAssistantRows(migrationListText,PUBLIC588_SUCCESSOR_ROWS);
  assert(remote.has(required.at(-1).version),'Public588 successor requires its installed exact source');
  assert.deepEqual([...local].filter(version=>!remote.has(version)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(row=>row.version))});
}
export async function assertAssistantPublic588SuccessorMigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireAssistantPublic588SuccessorOutput();
  const {required,local,remote}=fixedAssistantRows(migrationListText,PUBLIC588_SUCCESSOR_ROWS);
  await readAssistantPublic588SuccessorCanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'assistant-public588-successor'});
  const next=required.at(-1),pending=[...local].filter(version=>!remote.has(version));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Only the exact public588 successor may be pending');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),
    alreadyAppliedVersions:Object.freeze(required.filter(row=>remote.has(row.version)).map(row=>row.version))});
}
export function assertAssistantPublic590SuccessorMigrationsApplied(migrationListText){
  const {required,local,remote}=fixedAssistantRows(migrationListText,PUBLIC590_SUCCESSOR_ROWS);
  assert(remote.has(required.at(-1).version),'Public590 successor requires its installed exact source');
  assert.deepEqual([...local].filter(version=>!remote.has(version)),[]);
  return Object.freeze({appliedVersions:Object.freeze(required.map(row=>row.version))});
}
export async function assertAssistantPublic590SuccessorMigrationPlan({migrationListText,dryRunText,migrationsDirectory=MIGRATIONS_DIRECTORY}={}){
  requireAssistantPublic590SuccessorOutput();
  const {required,local,remote}=fixedAssistantRows(migrationListText,PUBLIC590_SUCCESSOR_ROWS);
  await readAssistantPublic590SuccessorCanonicalSource({migrationsDirectory});
  await inspectMigrationSources({migrationsDirectory,sourcePhase:'assistant-public590-successor'});
  const next=required.at(-1),pending=[...local].filter(version=>!remote.has(version));
  assert.deepEqual(pending,remote.has(next.version)?[]:[next.version],'Only the exact public590 successor may be pending');
  assert.deepEqual(parseSupabaseDryRunMigrationFilenames(dryRunText),pending.length?[next.filename]:[]);
  return Object.freeze({pendingVersions:Object.freeze(pending),
    alreadyAppliedVersions:Object.freeze(required.filter(row=>remote.has(row.version)).map(row=>row.version))});
}
export async function prepareAssistantLaterH0CutoverWorkdir({workdir}={}){
  requireAssistantLaterH0Output();await readAssistantLaterH0CanonicalSource();
  const prepared=await prepareTemporarySupabaseCutoverWorkdir({workdir,includeStatisticsPreferenceRevisionSource:true,
    sourcePhase:'assistant-later-h0'});
  const staged=await fs.readdir(prepared.migrationsDirectory);
  for(const version of ['20261014140000','20261015030000','20261016030000'])
    assert(!staged.some(filename=>filename.startsWith(version+'_')));
  await readAssistantLaterH0CanonicalSource({migrationsDirectory:prepared.migrationsDirectory});return prepared;
}
export async function hydrateAssistantLaterH0RemoteMigrationHistory(options){
  requireAssistantLaterH0Output();
  const directory=path.join(assertTemporaryCutoverWorkdir(options.workdir),'supabase','migrations');
  assistantLaterH0Rows(options.migrationListText);
  await readAssistantLaterH0CanonicalSource({migrationsDirectory:directory});
  return hydrateTemporaryRemoteMigrationHistory({...options,sourcePhase:'assistant-later-h0'});
}

export const ASSISTANT_BINDING_HEADERS = Object.freeze({
  modelId: 'x-ravradar-model-id',
  stateSchemaVersion: 'x-ravradar-model-state-version',
  modelContractSha256: 'x-ravradar-model-contract-sha256',
  modelBundleSha256: 'x-ravradar-model-bundle-sha256',
  knowledgeSchema: 'x-ravradar-assistant-knowledge-schema',
  knowledgeSha256: 'x-ravradar-assistant-knowledge-sha256',
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normaliseTripBindingPolicyDefinition(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

export async function expectedTripBindingPolicy({ migrationsDirectory = MIGRATIONS_DIRECTORY, sourcePhase = DEFAULT_CUTOVER_SOURCE_PHASE } = {}) {
  const { canonicalSource: migration } = await canonicalForSourcePhase(sourcePhase,migrationsDirectory);
  return tripBindingPolicyFromCanonicalSource(migration);
}

// Pure renderer shared by the fixed source issuer and normal readback. A
// caller-provided string is data only; it cannot install/admit a source.
export function tripBindingPolicyFromCanonicalSource(migration) {
  assert.equal(typeof migration,'string');
  const scoreQualityMatch = migration.match(
    /create or replace function public\.ravradar_trip_v3_score_quality_allowed\([\s\S]*?\)\s*returns boolean[\s\S]*?as \$\$([\s\S]*?)\$\$;/i,
  );
  const truthMatch = migration.match(
    /create or replace function public\.ravradar_trip_v3_calibration_truth_allowed\([\s\S]*?\)\s*returns boolean[\s\S]*?as \$\$([\s\S]*?)\$\$;/i,
  );
  const bindingMatch = migration.match(
    /create or replace function public\.ravradar_trip_v3_binding_allowed\([\s\S]*?\)\s*returns boolean[\s\S]*?as \$\$([\s\S]*?)\$\$;/i,
  );
  assert.ok(scoreQualityMatch?.[1] && truthMatch?.[1] && bindingMatch?.[1],
    'trip score-quality/truth/binding policy definition is missing from the migration');
  const definition = `${normaliseTripBindingPolicyDefinition(scoreQualityMatch[1])}\n-- calibration-truth-function --\n${normaliseTripBindingPolicyDefinition(truthMatch[1])}\n-- binding-function --\n${normaliseTripBindingPolicyDefinition(bindingMatch[1])}`;
  return Object.freeze({
    id: TRIP_BINDING_POLICY_ID,
    sha256: sha256(definition),
    definition,
  });
}

function sqlFunctionBody(source, functionName, label) {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(
    `create or replace function ${escaped}\\([\\s\\S]*?\\)\\s*returns [\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
    'i',
  ));
  assert.ok(match && match[1], `${label} definition is missing from the migration`);
  return normaliseTripBindingPolicyDefinition(match[1]);
}

export async function expectedCheckpointCasContract({
  migrationsDirectory = MIGRATIONS_DIRECTORY, sourcePhase = DEFAULT_CUTOVER_SOURCE_PHASE,
} = {}) {
  // Exact reviewed successor, including independent fixed-I71 originals.
  // Historical220/230 bytes and the legacy returned migration ID stay intact.
  const { canonicalSource: migration } = await canonicalForSourcePhase(sourcePhase,migrationsDirectory);
  return checkpointCasContractFromCanonicalSource(migration,{sourcePhase});
}

export function checkpointCasContractFromCanonicalSource(migration,{sourcePhase=DEFAULT_CUTOVER_SOURCE_PHASE}={}) {
  assert.equal(typeof migration,'string');
  assert(['native0600','current-memory-warmup','established-native-current-origin','last-mile-enclosure','account-statistics-assistant','native-original-continuity','assistant-later-h0','assistant-public587-successor','assistant-public588-successor','assistant-public590-successor'].includes(sourcePhase));
  if(sourcePhase==='assistant-public590-successor')return assistantPublic590SuccessorCheckpointContractFromBase(migration,
    checkpointCasContractFromCanonicalSource(migration,{sourcePhase:'native-original-continuity'}));
  if(sourcePhase==='assistant-public588-successor')return assistantPublic588SuccessorCheckpointContractFromBase(migration,
    checkpointCasContractFromCanonicalSource(migration,{sourcePhase:'native-original-continuity'}));
  if(sourcePhase==='assistant-public587-successor')return assistantPublic587SuccessorCheckpointContractFromBase(migration,
    checkpointCasContractFromCanonicalSource(migration,{sourcePhase:'native-original-continuity'}));
  if(sourcePhase==='assistant-later-h0')return assistantLaterH0CheckpointContractFromBase(migration,
    checkpointCasContractFromCanonicalSource(migration,{sourcePhase:'native-original-continuity'}));
  if(sourcePhase==='native-original-continuity')return nativeOriginalContinuityCheckpointContractFromBase(migration,
    checkpointCasContractFromCanonicalSource(migration,{sourcePhase:'account-statistics-assistant'}));
  if(sourcePhase==='account-statistics-assistant')return accountStatisticsAssistantCheckpointContractFromBase(migration,
    checkpointCasContractFromCanonicalSource(migration,{sourcePhase:'last-mile-enclosure'}));
  if(sourcePhase==='last-mile-enclosure')return lastMileEnclosureCheckpointContractFromBase(migration,
    checkpointCasContractFromCanonicalSource(migration,{sourcePhase:'established-native-current-origin'}));
  const definitions = [
    ['public.ravradar_ravscore_checkpoint_canonical_time', 'canonical-time validator'],
    ['public.ravradar_ravscore_checkpoint_has_forbidden_key', 'forbidden-key validator'],
    ['public.ravradar_ravscore_checkpoint_integrated_state_valid', 'integrated-state validator'],
    ['public.ravradar_ravscore_checkpoint_candidate_state_valid', 'Candidate-state validator'],
    ['public.ravradar_ravscore_checkpoint_payload_valid', 'checkpoint payload validator'],
    ['public.ravradar_ravscore_checkpoint_predecessor_payload_valid',
      'exact predecessor payload validator'],
    ['public.ravradar_ravscore_checkpoint_cas', 'checkpoint CAS'],
    ['public.version_admin_document', 'checkpoint history-exclusion trigger'],
    ['public.ravradar_ravscore_checkpoint_top20_predecessor_projection',
      'exact Top5 binding predecessor projection'],
    ['public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection',
      'exact CP child-close binding predecessor projection'],
    ['public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
      'exact owner current binding predecessor projection'],
    ['public.ravradar_ravscore_checkpoint_water_level_predecessor_projection',
      'exact water-level-only binding predecessor projection'],
    ['public.ravradar_ravscore_checkpoint_userdata_predecessor_projection',
      'exact userdata binding predecessor projection'],
    ['public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection',
      'exact account/assistant binding predecessor projection'],
    ['public.ravradar_ravscore_checkpoint_grid_ffc_state_valid',
      'whole original ffc state validator'],
    ['public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid',
      'whole original ffc payload validator'],
    ['public.ravradar_ravscore_checkpoint_grid_249_state_valid',
      'whole original 249 state validator'],
    ['public.ravradar_ravscore_checkpoint_grid_249_payload_valid',
      'whole original 249 payload validator'],
    ['public.ravradar_ravscore_checkpoint_grid_c1ac_state_valid',
      'whole original c1ac state validator'],
    ['public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid',
      'whole original c1ac payload validator'],
    ['public.ravradar_ravscore_checkpoint_native_identity_i71_state_valid',
      'whole original I71 state validator'],
    ['public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid',
      'whole original I71 payload validator'],
    ...(sourcePhase !== 'native0600' ? [['public.'+CURRENT_MEMORY_WARMUP_PROJECTION,'exact assistant after0600 projection']] : []),
    ...(sourcePhase === 'established-native-current-origin' ? [
      ['public.ravradar_ravscore_checkpoint_cmw0200_state_valid','whole original0200 state validator'],
      ['public.ravradar_ravscore_checkpoint_cmw0200_payload_valid','whole original0200 payload validator'],
      ['public.'+ESTABLISHED_NATIVE_CURRENT_ORIGIN_PROJECTION,'exact authentic seed metadata projection'],
    ] : []),
  ].map(([functionName, label]) => sqlFunctionBody(
    migration,
    functionName,
    label,
  ));
  let definition = definitions[0]
    + `\n-- forbidden-key-validator --\n${definitions[1]}`
    + `\n-- integrated-state-validator --\n${definitions[2]}`
    + `\n-- candidate-state-validator --\n${definitions[3]}`
    + `\n-- payload-validator --\n${definitions[4]}`
    + `\n-- predecessor-payload-validator --\n${definitions[5]}`
    + `\n-- cas-function --\n${definitions[6]}`
    + `\n-- checkpoint-history-exclusion --\n${definitions[7]}`
    + `\n-- top20-predecessor-projection --\n${definitions[8]}`
    + `\n-- cp-close-predecessor-projection --\n${definitions[9]}`
    + `\n-- owner-current-predecessor-projection --\n${definitions[10]}`
    + `\n-- water-level-predecessor-projection --\n${definitions[11]}`
    + `\n-- userdata-predecessor-projection --\n${definitions[12]}`
    + `\n-- account-assistant-predecessor-projection --\n${definitions[13]}`
    + `\n-- grid-original-ffc-state-validator --\n${definitions[14]}`
    + `\n-- grid-original-ffc-payload-validator --\n${definitions[15]}`
    + `\n-- grid-original-249-state-validator --\n${definitions[16]}`
    + `\n-- grid-original-249-payload-validator --\n${definitions[17]}`
    + `\n-- grid-original-c1ac-state-validator --\n${definitions[18]}`
    + `\n-- grid-original-c1ac-payload-validator --\n${definitions[19]}`
    + `\n-- native-identity-i71-state-validator --\n${definitions[20]}`
    + `\n-- native-identity-i71-payload-validator --\n${definitions[21]}`;
  if(sourcePhase !== 'native0600'){assert.equal(definitions.length,sourcePhase==='current-memory-warmup'?23:26);
    definition += `\n-- current-memory-warmup-predecessor-projection --\n${definitions[22]}`;}
  else assert.equal(definitions.length,22);
  if(sourcePhase === 'established-native-current-origin'){
    definition += `\n-- cmw0200-original-state-validator --\n${definitions[23]}`
      + `\n-- cmw0200-original-payload-validator --\n${definitions[24]}`
      + `\n-- established-native-current-origin-projection --\n${definitions[25]}`;
  }
  return Object.freeze({
    id: CHECKPOINT_CAS_CONTRACT_ID,
    sha256: sha256(definition),
    definition,
  });
}

export async function expectedTripActiveAdmissionPolicy({ migrationsDirectory = MIGRATIONS_DIRECTORY } = {}) {
  const migration = await fs.readFile(path.join(
    migrationsDirectory,
    LATEST_RAVSCORE_BINDING_MIGRATION.filename,
  ), 'utf8');
  const triggerMigration = await fs.readFile(path.join(
    migrationsDirectory,
    REQUIRED_CUTOVER_MIGRATIONS[1].filename,
  ), 'utf8');
  const definition = sqlFunctionBody(
    migration,
    'public.ravradar_trip_v3_active_binding_admitted',
    'active trip admission policy',
  );
  const triggerFunctionDefinition = sqlFunctionBody(
    triggerMigration,
    'public.ravradar_observation_require_active_v3_binding',
    'active trip admission trigger function',
  );
  return Object.freeze({
    id: TRIP_ACTIVE_ADMISSION_POLICY_ID,
    sha256: sha256(`${definition}\n-- trigger-function --\n${triggerFunctionDefinition}`),
    definition,
    triggerFunctionDefinition,
  });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function assertExactKeys(value, expectedKeys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort(), `${label} has an incompatible exact key set`);
}

function normaliseSourceHead(value, label = 'source head') {
  const sourceHead = String(value || '').trim().toLowerCase();
  assert.match(sourceHead, SOURCE_HEAD_PATTERN, `${label} must be an exact 40-character Git SHA`);
  return sourceHead;
}

async function expectedAssistantKnowledge() {
  const knowledge = JSON.parse(await fs.readFile(KNOWLEDGE_PATH, 'utf8'));
  assert.equal(knowledge.schemaVersion, 'rav-assistant-public-knowledge-v1', 'assistant knowledge schema is incompatible');
  assert.ok(Array.isArray(knowledge.facts) && knowledge.facts.length > 0, 'assistant knowledge facts are missing');
  const knowledgeSha256 = sha256(JSON.stringify(knowledge.facts));
  assert.match(knowledgeSha256, SHA256_PATTERN);
  return Object.freeze({
    schemaVersion: knowledge.schemaVersion,
    sha256: knowledgeSha256,
  });
}

export async function expectedAssistantBinding() {
  const binding = ravScoreModelBinding();
  assertRavScoreModelBinding(binding);
  const knowledge = await expectedAssistantKnowledge();
  return Object.freeze({
    modelId: binding.modelId,
    stateSchemaVersion: binding.stateSchemaVersion,
    modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256,
    knowledgeSchema: knowledge.schemaVersion,
    knowledgeSha256: knowledge.sha256,
  });
}

export async function buildIntegratedCutoverReadiness(sourceHeadInput, {
  publicImplementationClosureSha256,
} = {}) {
  ACTIVE.requireOutput(); // Fast aktiv familie før readiness/input.
  const sourceHead = normaliseSourceHead(sourceHeadInput);
  assert.match(String(publicImplementationClosureSha256 ?? ''), SHA256_PATTERN,
    'public implementation closure must be an exact SHA-256');
  const modelBinding = ravScoreModelBinding();
  assertRavScoreModelBinding(modelBinding);
  const candidateBinding = candidateGRollbackModelBinding();
  assertCandidateGRollbackModelBinding(candidateBinding);
  const centralProfile = JSON.parse(await fs.readFile(CENTRAL_PROFILE_PATH, 'utf8'));
  assertIntegratedRavScoreSelection(centralProfile,
    'Integrated cutover readiness central profile');
  const assistantBinding = await expectedAssistantBinding();
  const tripBindingPolicy = await expectedTripBindingPolicy();
  const tripActiveAdmissionPolicy = await expectedTripActiveAdmissionPolicy();
  return Object.freeze({
    schemaVersion: READINESS_SCHEMA,
    sourceHead,
    modelContractSha256: modelBinding.modelContractSha256,
    modelBundleSha256: modelBinding.modelBundleSha256,
    publicImplementationClosureSha256,
    migrationIds: Object.freeze(REQUIRED_CUTOVER_MIGRATIONS.map(item => item.id)),
    tripSchemaVersion: 3,
    tripBindingPolicyId: tripBindingPolicy.id,
    tripBindingPolicySha256: tripBindingPolicy.sha256,
    tripActiveAdmissionPolicyId: tripActiveAdmissionPolicy.id,
    tripActiveAdmissionPolicySha256: tripActiveAdmissionPolicy.sha256,
    modelBinding: Object.freeze({ ...modelBinding }),
    candidateModelBinding: Object.freeze({ ...candidateBinding }),
    centralProfile: Object.freeze(centralProfile),
    assistantBinding,
  });
}

export async function inspectMigrationSources({ migrationsDirectory = MIGRATIONS_DIRECTORY, sourcePhase = DEFAULT_CUTOVER_SOURCE_PHASE } = {}) {
  const requiredMigrations = migrationsForSourcePhase(sourcePhase);
  const filenames = (await fs.readdir(migrationsDirectory))
    .filter(filename => filename.endsWith('.sql'))
    .sort();
  const versionToFilename = new Map();
  const historicalDuplicateVersions = new Set();
  for (const filename of filenames) {
    const match = filename.match(/^(\d{8,14})_[A-Za-z0-9_.-]+\.sql$/);
    assert.ok(match, `migration filename is not versioned safely: ${filename}`);
    const version = match[1];
    if (versionToFilename.has(version)) {
      // RavRadar's historical repository used date-only migration names and
      // therefore contains pre-cutover duplicates. They are never passed to db
      // push: the workflow builds a temporary normalized view from remote
      // applied history plus the exact allowlisted cutover migrations. New duplicates are
      // still a hard error.
      assert.ok(version.length === 8 && version <= '20260828',
        `duplicate Supabase migration version ${version}: ${versionToFilename.get(version)} and ${filename}`);
      historicalDuplicateVersions.add(version);
      continue;
    }
    versionToFilename.set(version, filename);
  }
  for (const migration of requiredMigrations) {
    assert.equal(versionToFilename.get(migration.version), migration.filename,
      `required cutover migration is missing or renamed: ${migration.filename}`);
  }
  return Object.freeze({
    filenames: Object.freeze(filenames),
    versionToFilename,
    historicalDuplicateVersions: Object.freeze([...historicalDuplicateVersions].sort()),
  });
}

function assertTemporaryCutoverWorkdir(value) {
  const workdir = path.resolve(String(value || ''));
  assert.ok(workdir && workdir !== path.parse(workdir).root, 'cutover workdir must be a specific temporary directory');
  assert.ok(workdir !== ROOT && !workdir.startsWith(`${ROOT}${path.sep}`),
    'cutover workdir must stay outside the repository');
  return workdir;
}

export async function prepareTemporarySupabaseCutoverWorkdir({ workdir: inputWorkdir, includeStatisticsPreferenceRevisionSource = false, sourcePhase = DEFAULT_CUTOVER_SOURCE_PHASE } = {}) {
  const requiredMigrations = migrationsForSourcePhase(sourcePhase);
  assert.equal(typeof includeStatisticsPreferenceRevisionSource,'boolean');
  if (includeStatisticsPreferenceRevisionSource) await assertStatisticsPreferenceRevisionSource(MIGRATIONS_DIRECTORY);
  const workdir = assertTemporaryCutoverWorkdir(inputWorkdir);
  await inspectMigrationSources({sourcePhase});
  await fs.mkdir(workdir, { recursive: true });
  const existing = await fs.readdir(workdir);
  assert.deepEqual(existing, [], 'cutover workdir must be empty before preparation');
  const supabaseDirectory = path.join(workdir, 'supabase');
  const migrationsDirectory = path.join(supabaseDirectory, 'migrations');
  await fs.mkdir(migrationsDirectory, { recursive: true });
  await fs.copyFile(path.join(ROOT, 'supabase', 'config.toml'), path.join(supabaseDirectory, 'config.toml'));
  for (const migration of requiredMigrations) {
    await fs.copyFile(
      path.join(MIGRATIONS_DIRECTORY, migration.filename),
      path.join(migrationsDirectory, migration.filename),
    );
  }
  // Statistics230 is now a required historical source and was copied above.
  // Its explicit legacy option still verifies the immutable source, not a grant.
  return Object.freeze({ workdir, migrationsDirectory });
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function migrationChronologicalKey(version) {
  assert.match(version, MIGRATION_VERSION_PATTERN);
  return BigInt(version.padEnd(14, '0'));
}

export function parseSupabaseMigrationList(value) {
  const rows = [];
  let headerCount = 0;
  const seenVersions = new Set();
  for (const line of stripAnsi(value).split(/\r?\n/)) {
    if (!/[|│]/.test(line)) continue;
    const columns = line.split(/[|│]/).map(column => column.trim());
    if (columns.length > 3 && columns[0] === '') columns.shift();
    if (columns.length > 3 && columns.at(-1) === '') columns.pop();
    if (columns.length === 3
      && columns[0].toLowerCase() === 'local'
      && columns[1].toLowerCase() === 'remote'
      && ['time', 'time (utc)'].includes(columns[2].toLowerCase())) {
      headerCount += 1;
      continue;
    }
    if (columns.every(column => /^[-─━┄┅┈┉ ]+$/.test(column))) continue;
    assert.equal(headerCount, 1,
      'Supabase migration-list row appeared without one recognized Local/Remote/Time header');
    assert.equal(columns.length, 3,
      'Supabase migration-list row did not contain exactly three columns');

    const parseVersionCell = (column, field) => {
      let cell = column;
      if (cell.startsWith('`') || cell.endsWith('`')) {
        const quoted = cell.match(/^`([^`]*)`$/);
        assert.ok(quoted, `Supabase migration-list ${field} cell had malformed backtick quoting`);
        cell = quoted[1].trim();
      }
      if (!cell) return null;
      assert.match(cell, MIGRATION_VERSION_PATTERN,
        `Supabase migration-list ${field} cell was neither blank nor an exact migration version`);
      return cell;
    };

    const local = parseVersionCell(columns[0], 'Local');
    const remote = parseVersionCell(columns[1], 'Remote');
    assert.ok(local || remote,
      'Supabase migration-list row contained neither a local nor a remote version');
    assert.ok(!(local && remote) || local === remote,
      'Supabase migration-list row ambiguously paired different local and remote versions');
    for (const version of new Set([local, remote].filter(Boolean))) {
      assert.ok(!seenVersions.has(version),
        `Supabase migration-list output repeated migration version ${version} across rows`);
      seenVersions.add(version);
    }
    rows.push(Object.freeze({ local, remote }));
  }
  assert.equal(headerCount, 1,
    'Supabase migration-list output did not contain one recognized Local/Remote/Time header');
  assert.ok(rows.length > 0, 'Supabase migration-list output contained no parseable migration rows');
  return Object.freeze(rows);
}

export function parseSupabaseDryRunMigrationFilenames(value) {
  const lines = stripAnsi(value).split(/\r?\n/);
  const dryRunMarkerIndexes = lines
    .map((line, index) =>
      line.trim() === 'DRY RUN: migrations will *not* be pushed to the database.' ? index : -1)
    .filter(index => index >= 0);
  assert.equal(dryRunMarkerIndexes.length, 1,
    'Supabase db push --dry-run output did not contain one exact no-write marker');
  assert.equal(lines.some(line => /^Would (?:seed|create)\b/.test(line.trim())), false,
    'Supabase db push --dry-run proposed an operation outside the migration plan');
  const sectionIndexes = lines
    .map((line, index) => line.trim() === 'Would push these migrations:' ? index : -1)
    .filter(index => index >= 0);
  assert.ok(sectionIndexes.length <= 1,
    'Supabase db push --dry-run output contained multiple migration sections');
  if (sectionIndexes.length === 0) {
    const upToDateIndexes = lines
      .map((line, index) => line.trim() === 'Remote database is up to date.' ? index : -1)
      .filter(index => index >= 0);
    assert.equal(upToDateIndexes.length, 1,
      'Supabase db push --dry-run output contained neither a migration plan nor an exact up-to-date result');
    assert.ok(dryRunMarkerIndexes[0] < upToDateIndexes[0],
      'Supabase db push --dry-run up-to-date result appeared before its no-write marker');
    return Object.freeze([]);
  }
  assert.ok(dryRunMarkerIndexes[0] < sectionIndexes[0],
    'Supabase db push --dry-run migration plan appeared before its no-write marker');
  assert.equal(lines.some(line => line.trim() === 'Remote database is up to date.'), false,
    'Supabase db push --dry-run ambiguously reported both pending migrations and up-to-date');

  const filenames = [];
  let finished = false;
  for (const line of lines.slice(sectionIndexes[0] + 1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === 'Finished supabase db push.') {
      finished = true;
      break;
    }
    const bullet = trimmed.match(/^[•*-]\s+(.+)$/);
    assert.ok(bullet,
      'Supabase db push --dry-run migration section contained an unrecognized row');
    let filename = bullet[1].trim();
    if (filename.startsWith('`') || filename.endsWith('`')) {
      const quoted = filename.match(/^`([^`]*)`$/);
      assert.ok(quoted,
        'Supabase db push --dry-run migration filename had malformed backtick quoting');
      filename = quoted[1].trim();
    }
    assert.match(filename, /^\d{8,14}_[^/\\\r\n]+\.sql$/,
      'Supabase db push --dry-run contained an invalid migration filename');
    filenames.push(filename);
  }
  assert.ok(filenames.length > 0,
    'Supabase db push --dry-run migration section contained no migration filenames');
  assert.equal(new Set(filenames).size, filenames.length,
    'Supabase db push --dry-run repeated a migration filename');
  assert.equal(finished, true,
    'Supabase db push --dry-run migration plan had no exact completion marker');
  return Object.freeze(filenames);
}

export async function hydrateTemporaryRemoteMigrationHistory({
  workdir: inputWorkdir,
  migrationListText, sourcePhase = DEFAULT_CUTOVER_SOURCE_PHASE,
} = {}) {
  const requiredMigrations = migrationsForSourcePhase(sourcePhase);
  const workdir = assertTemporaryCutoverWorkdir(inputWorkdir);
  const migrationsDirectory = path.join(workdir, 'supabase', 'migrations');
  const source = await inspectMigrationSources({ migrationsDirectory, sourcePhase });
  const rows = parseSupabaseMigrationList(migrationListText);
  const local = uniqueVersions(rows, 'local');
  const remote = uniqueVersions(rows, 'remote');
  const required = new Set(requiredMigrations.map(item => item.version));
  const firstUniqueCutoverVersion = migrationChronologicalKey(requiredMigrations[0].version);
  for (const migration of requiredMigrations) {
    assert.ok(local.has(migration.version), `temporary migration view is missing ${migration.filename}`);
  }
  const placeholders = [];
  for (const version of [...remote].filter(item => !local.has(item)).sort()) {
    assert.ok(!required.has(version), `required migration ${version} was remote-only in the temporary source view`);
    assert.ok(migrationChronologicalKey(version) < firstUniqueCutoverVersion,
      `remote contains an unknown post-cutover migration ${version}; refusing to normalize history`);
    const filename = `${version}_remote_applied_history_placeholder.sql`;
    assert.ok(!source.versionToFilename.has(version), `temporary migration version already exists: ${version}`);
    await fs.writeFile(
      path.join(migrationsDirectory, filename),
      `-- Temporary CI-only placeholder for already-applied remote migration ${version}.\n-- It is never committed and contains no executable SQL.\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
    placeholders.push(filename);
  }
  return Object.freeze({ placeholders: Object.freeze(placeholders) });
}

function uniqueVersions(rows, field) {
  const values = rows.map(row => row[field]).filter(Boolean);
  assert.equal(new Set(values).size, values.length, `Supabase migration list contains duplicate ${field} versions`);
  return new Set(values);
}

async function assertStatisticsPreferenceRevisionSource(migrationsDirectory) {
  const output=await buildStatisticsPreferenceRevision({migrationsDirectory});
  const file=path.join(migrationsDirectory,STATISTICS_REVISION_MIGRATION.filename);
  const stat=await fs.lstat(file);assert.ok(stat.isFile()&&!stat.isSymbolicLink());
  assert.deepEqual(await fs.readFile(file),Buffer.from(output.migration),'Exact statistics revision migration source required');
}

export async function assertSupabaseMigrationPlan({
  migrationListText,
  dryRunText,
  migrationsDirectory = MIGRATIONS_DIRECTORY,
  allowAccountAssistantPrewritePlan = false,
  allowStatisticsPreferenceRevisionPlan = false,
} = {}) {
  ACTIVE.requireOutput(); // Fast aktiv familie; UNISSUED må ikke falde tilbage.
  assert.equal(typeof allowStatisticsPreferenceRevisionPlan,'boolean');
  await inspectMigrationSources({ migrationsDirectory });
  if (allowStatisticsPreferenceRevisionPlan) {
    assert.equal(allowAccountAssistantPrewritePlan,false,'Statistics revision is a separate sole prewrite route');
    await assertStatisticsPreferenceRevisionSource(migrationsDirectory);
  }
  const rows = parseSupabaseMigrationList(migrationListText);
  const local = uniqueVersions(rows, 'local');
  const remote = uniqueVersions(rows, 'remote');
  // A normal/code-only installer may observe an already-installed successor,
  // never acquire its separate original-preserving recovery write authority.
  assert.ok(remote.has(nativeIdentityMigration().version),
    'NATIVE_SAMPLING_IDENTITY_RECOVERY_ROUTE_REQUIRED');
  assert.ok(remote.has(currentMemoryWarmupMigration().version),
    'CURRENT_MEMORY_WARMUP_PREWRITE_ROUTE_REQUIRED');
  assert.ok(remote.has(establishedNativeCurrentOriginMigration().version),
    'ESTABLISHED_NATIVE_CURRENT_ORIGIN_PREWRITE_ROUTE_REQUIRED');
  if(ACTIVE.sourcePhase==='assistant-public590-successor'){
    assert.ok(remote.has(assistantPublic590SuccessorMigration().version),'ASSISTANT_PUBLIC590_SUCCESSOR_PREWRITE_ROUTE_REQUIRED');
    assertAssistantPublic590SuccessorMigrationsApplied(migrationListText);
  }
  if(ACTIVE.sourcePhase==='assistant-public588-successor'){
    assert.ok(remote.has(assistantPublic588SuccessorMigration().version),'ASSISTANT_PUBLIC588_SUCCESSOR_PREWRITE_ROUTE_REQUIRED');
    assertAssistantPublic588SuccessorMigrationsApplied(migrationListText);
  }
  assert.ok(remote.has(assistantPublic587SuccessorMigration().version),'ASSISTANT_PUBLIC587_SUCCESSOR_PREWRITE_ROUTE_REQUIRED');
  if(!['assistant-public588-successor','assistant-public590-successor'].includes(ACTIVE.sourcePhase))assertAssistantPublic587SuccessorMigrationsApplied(migrationListText);
  const plannedMigrations = REQUIRED_CUTOVER_MIGRATIONS;
  const requiredVersions = new Set(plannedMigrations.map(item => item.version));

  for (const migration of REQUIRED_CUTOVER_MIGRATIONS) {
    assert.ok(local.has(migration.version), `Supabase CLI did not see required local migration ${migration.filename}`);
  }

  const pending = [...local].filter(version => !remote.has(version));
  if (pending.includes(STATISTICS_REVISION_MIGRATION.version)) {
    assert.equal(allowStatisticsPreferenceRevisionPlan,true,'Pending statistics revision requires its named prewrite route');
  }
  if (allowStatisticsPreferenceRevisionPlan) {
    assert.ok(local.has(STATISTICS_REVISION_MIGRATION.version));
    for (const migration of REQUIRED_CUTOVER_MIGRATIONS) assert.ok(remote.has(migration.version),'Statistics revision cannot install older migrations');
    assert.ok(remote.has(STATISTICS_REVISION_PREDECESSOR));
    assert.deepEqual(pending,remote.has(STATISTICS_REVISION_MIGRATION.version)?[]:[STATISTICS_REVISION_MIGRATION.version]);
  }
  if (pending.includes(ACCOUNT_ASSISTANT_MIGRATION.version)) {
    assert.equal(allowAccountAssistantPrewritePlan, true,
      'Pending account/assistant successor requires its exact prewrite route');
  }
  const unexpectedPending = pending.filter(version => !requiredVersions.has(version));
  assert.deepEqual(unexpectedPending, [],
    `refusing db push with unexpected pending migrations: ${unexpectedPending.join(', ')}`);
  for (let index = 1; index < REQUIRED_CUTOVER_MIGRATIONS.length; index += 1) {
    const earlier = REQUIRED_CUTOVER_MIGRATIONS[index - 1].version;
    const later = REQUIRED_CUTOVER_MIGRATIONS[index].version;
    assert.ok(!(remote.has(later) && !remote.has(earlier)),
      `remote cutover migration order is inconsistent: ${later} is applied before ${earlier}`);
  }

  const dryRunFilenames = parseSupabaseDryRunMigrationFilenames(dryRunText);
  const expectedPendingFilenames = plannedMigrations
    .filter(migration => pending.includes(migration.version))
    .map(migration => migration.filename);
  assert.deepEqual(dryRunFilenames, expectedPendingFilenames,
    'Supabase db push --dry-run did not propose exactly the pending required migrations in order');
  return Object.freeze({
    pendingVersions: Object.freeze(pending.sort()),
    alreadyAppliedVersions: Object.freeze([...requiredVersions].filter(version => remote.has(version)).sort()),
  });
}

export function assertSupabaseMigrationsApplied(migrationListText) {
  if(ACTIVE.sourcePhase==='assistant-public590-successor')assertAssistantPublic590SuccessorMigrationsApplied(migrationListText);
  else if(ACTIVE.sourcePhase==='assistant-public588-successor')assertAssistantPublic588SuccessorMigrationsApplied(migrationListText);
  else assertAssistantPublic587SuccessorMigrationsApplied(migrationListText);
  const rows = parseSupabaseMigrationList(migrationListText);
  const local = uniqueVersions(rows, 'local');
  const remote = uniqueVersions(rows, 'remote');
  const requiredVersions = REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version);
  for (const version of requiredVersions) {
    assert.ok(local.has(version), `required local migration ${version} disappeared after db push`);
    assert.ok(remote.has(version), `required migration ${version} was not recorded remotely after db push`);
  }
  const pending = [...local].filter(version => !remote.has(version));
  assert.deepEqual(pending, [], `pending migrations remain after db push: ${pending.join(', ')}`);
  return Object.freeze({ appliedVersions: Object.freeze([...requiredVersions]) });
}

function expectedRpcBody(binding, candidate) {
  return {
    p_model_id: binding.modelId,
    p_state_schema_version: binding.stateSchemaVersion,
    p_variant_id: binding.variantId,
    p_profile_id: binding.profileId,
    p_component_schema_id: binding.componentSchemaId,
    p_explanation_schema_id: binding.explanationSchemaId,
    p_ranking_policy_id: binding.rankingPolicyId,
    p_best_time_policy_id: binding.bestTimePolicyId,
    p_presentation_policy_id: binding.presentationPolicyId,
    p_model_contract_sha256: binding.modelContractSha256,
    p_model_bundle_sha256: binding.modelBundleSha256,
    p_candidate_model_id: candidate.modelId,
    p_candidate_state_schema_version: candidate.stateSchemaVersion,
    p_candidate_variant_id: candidate.variantId,
    p_candidate_profile_id: candidate.profileId,
    p_candidate_component_schema_id: candidate.componentSchemaId,
    p_candidate_explanation_schema_id: candidate.explanationSchemaId,
    p_candidate_ranking_policy_id: candidate.rankingPolicyId,
    p_candidate_best_time_policy_id: candidate.bestTimePolicyId,
    p_candidate_presentation_policy_id: candidate.presentationPolicyId,
    p_candidate_model_contract_sha256: candidate.modelContractSha256,
    p_candidate_model_bundle_sha256: candidate.modelBundleSha256,
  };
}

function assertDatabaseReadback(
  value,
  expectedPolicy,
  expectedActiveAdmissionPolicy,
) {
  assertExactKeys(value, [
    'schemaVersion', 'tripSchemaVersion', 'appliedMigrationVersions',
    'tripBindingPolicy', 'tripActiveAdmissionPolicy', 'checks',
  ], 'database cutover readback');
  assert.equal(value.schemaVersion, DATABASE_READBACK_SCHEMA);
  assert.equal(value.tripSchemaVersion, 3);
  assert.deepEqual(value.appliedMigrationVersions,
    REQUIRED_CUTOVER_MIGRATIONS.slice(0, 3).map(item => item.version),
    'trip database readback is missing its exact applied migrations');
  assertExactKeys(value.tripBindingPolicy, ['id', 'definition'],
    'database trip binding policy readback');
  assert.equal(value.tripBindingPolicy.id, expectedPolicy.id,
    'database trip binding policy id is incompatible');
  assert.equal(
    sha256(normaliseTripBindingPolicyDefinition(value.tripBindingPolicy.definition)),
    expectedPolicy.sha256,
    'database trip binding policy definition hash drifted',
  );
  assertExactKeys(value.tripActiveAdmissionPolicy,
    ['id', 'definition', 'triggerFunctionDefinition', 'triggerDefinition'],
    'database active trip admission policy readback');
  assert.equal(value.tripActiveAdmissionPolicy.id, expectedActiveAdmissionPolicy.id,
    'database active trip admission policy id is incompatible');
  assert.equal(
    sha256(`${normaliseTripBindingPolicyDefinition(value.tripActiveAdmissionPolicy.definition)}\n-- trigger-function --\n${normaliseTripBindingPolicyDefinition(value.tripActiveAdmissionPolicy.triggerFunctionDefinition)}`),
    expectedActiveAdmissionPolicy.sha256,
    'database active trip admission policy definition hash drifted',
  );
  const activeTriggerDefinition = String(
    value.tripActiveAdmissionPolicy.triggerDefinition ?? '',
  ).replaceAll('"', '').replace(/\s+/g, ' ').trim();
  assert.match(activeTriggerDefinition,
    /^CREATE TRIGGER ravradar_observations_active_v3_binding_trigger BEFORE INSERT OR UPDATE OF schema_version, model_version, calibration_features, calibration_eligible, actual_zone_id, actual_coastal_part_id, forecast_zone_id, forecast_coastal_part_id ON (?:public\.)?observations FOR EACH ROW EXECUTE FUNCTION (?:public\.)?ravradar_observation_require_active_v3_binding\(\);?$/i,
    'database active trip admission trigger definition is incompatible');
  assertExactKeys(value.checks, [
    'schemaVersionConstraintPresent',
    'dataQualityConstraintPresent',
    'nestedPrivacyConstraintPresent',
    'tripV3ConstraintPresent',
    'tripV3ConstraintValidatedAgainstHistoricalRows',
    'tripIdIndexPresent',
    'bindingPolicyDefinitionPresent',
    'bindingTruthCalledForBothModels',
    'activeBindingAdmissionDefinitionPresent',
    'activeBindingTriggerPresent',
    'activeBindingTriggerCallsGateExactlyOnce',
    'bindingGateCalledExactlyOnce',
    'integratedModelBindingPresent',
    'integratedProxyCeilingBindingPresent',
    'integratedMissingCalibrationCeilingRejected',
    'candidateGRollbackBindingPresent',
    'unknownModelBindingRejected',
    'exactModelBindingPresent',
  ], 'database cutover checks');
  for (const key of [
    'schemaVersionConstraintPresent',
    'dataQualityConstraintPresent',
    'nestedPrivacyConstraintPresent',
    'tripV3ConstraintPresent',
    'tripIdIndexPresent',
    'bindingPolicyDefinitionPresent',
    'bindingTruthCalledForBothModels',
    'activeBindingAdmissionDefinitionPresent',
    'activeBindingTriggerPresent',
    'activeBindingTriggerCallsGateExactlyOnce',
    'bindingGateCalledExactlyOnce',
    'integratedModelBindingPresent',
    'integratedProxyCeilingBindingPresent',
    'integratedMissingCalibrationCeilingRejected',
    'candidateGRollbackBindingPresent',
    'unknownModelBindingRejected',
    'exactModelBindingPresent',
  ]) assert.equal(value.checks[key], true, `database cutover check failed: ${key}`);
  assert.equal(typeof value.checks.tripV3ConstraintValidatedAgainstHistoricalRows, 'boolean');
  return true;
}

function assertCheckpointDatabaseReadback(value, expectedCheckpointContract) {
  assertExactKeys(value, [
    'schemaVersion', 'appliedMigrationVersion', 'checkpointContract', 'checks',
  ], 'checkpoint database readback');
  assert.equal(value.schemaVersion, CHECKPOINT_DATABASE_READBACK_SCHEMA);
  assert.equal(value.appliedMigrationVersion, LATEST_RAVSCORE_BINDING_MIGRATION.version,
    'checkpoint database readback is missing its applied migration');
  assertExactKeys(value.checkpointContract, ['id', 'definition'],
    'database checkpoint CAS contract readback');
  assert.equal(value.checkpointContract.id, expectedCheckpointContract.id,
    'database checkpoint CAS contract id is incompatible');
  assert.equal(
    sha256(normaliseTripBindingPolicyDefinition(value.checkpointContract.definition)),
    expectedCheckpointContract.sha256,
    'database checkpoint CAS contract definition hash drifted',
  );
  const expectedChecks = [
    'checkpointContractDefinitionPresent',
    'checkpointCanonicalTimeHelperStableSecurityInvoker',
    'checkpointHistoryExclusionInstalled',
    'checkpointDirectPayloadReadRestricted',
    'checkpointCasSecurityDefiner',
    'checkpointCasStatementTimeout55Seconds',
    'checkpointCasServiceRoleExecutable',
    'checkpointCasAnonymousExecutionRejected',
    'checkpointValidatorExecutionRestricted',
    'checkpointFunctionsSearchPathLocked',
  ];
  assertExactKeys(value.checks, expectedChecks, 'checkpoint database checks');
  for (const key of expectedChecks) {
    assert.equal(value.checks[key], true, `checkpoint database check failed: ${key}`);
  }
  return true;
}

function requiredSupabaseConfiguration({ requireServiceRole = true } = {}) {
  const url = String(process.env.SUPABASE_URL || PUBLIC_CONFIG.supabaseUrl || '').trim().replace(/\/$/, '');
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_CONFIG.supabasePublishableKey || '').trim();
  assert.ok(url, 'SUPABASE_URL is required');
  if (requireServiceRole) assert.ok(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is required');
  assert.ok(publishableKey, 'Supabase publishable key is required');
  return Object.freeze({ url, serviceRoleKey, publishableKey });
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  let value;
  try { value = text ? JSON.parse(text) : null; }
  catch { throw new Error(`${label} returned invalid JSON`); }
  if (!response.ok) {
    const code = value && typeof value === 'object' ? String(value.code || value.error || '') : '';
    throw new Error(`${label} failed with HTTP ${response.status}${code ? ` (${code.slice(0, 80)})` : ''}`);
  }
  return value;
}

export async function verifyIntegratedDatabaseReadback({
  url,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
  modelBinding = null,
  candidateModelBinding = null,
  tripBindingPolicy = null,
  tripActiveAdmissionPolicy = null, sourcePhase = DEFAULT_CUTOVER_SOURCE_PHASE,
} = {}) {
  assert(['native0600','current-memory-warmup','established-native-current-origin','last-mile-enclosure','account-statistics-assistant','native-original-continuity','assistant-later-h0','assistant-public587-successor','assistant-public588-successor','assistant-public590-successor'].includes(sourcePhase));
  if(sourcePhase === 'current-memory-warmup')requireCurrentMemoryWarmupOutput();
  if(sourcePhase === 'established-native-current-origin')requireEstablishedNativeCurrentOriginOutput();
  if(sourcePhase === 'assistant-public590-successor')requireAssistantPublic590SuccessorOutput();
  if(sourcePhase === 'assistant-public588-successor')requireAssistantPublic588SuccessorOutput();
  if(sourcePhase === 'assistant-public587-successor')requireAssistantPublic587SuccessorOutput();
  if(sourcePhase === 'assistant-later-h0')requireAssistantLaterH0Output();
  if(sourcePhase === 'native-original-continuity')requireNativeOriginalContinuityOutput();
  if(sourcePhase === 'account-statistics-assistant')requireAccountStatisticsAssistantOutput();
  if(sourcePhase === 'last-mile-enclosure')requireLastMileEnclosureOutput();
  assert.ok(typeof fetchImpl === 'function', 'fetch is required');
  assert.ok(url && serviceRoleKey, 'Supabase URL and service role are required for database readback');
  const binding = modelBinding ?? ravScoreModelBinding();
  const candidate = candidateModelBinding ?? candidateGRollbackModelBinding();
  assertExactKeys(binding, MODEL_BINDING_FIELDS, 'database expected integrated binding');
  assertExactKeys(candidate, MODEL_BINDING_FIELDS, 'database expected Candidate binding');
  const baseUrl = String(url).replace(/\/$/, '');
  const response = await fetchImpl(`${baseUrl}/rest/v1/rpc/ravradar_integrated_cutover_contract`, {
    method: 'POST',
    headers: buildSupabaseAdminHeaders(serviceRoleKey),
    body: JSON.stringify(expectedRpcBody(binding, candidate)),
  });
  const value = await readJsonResponse(response, 'integrated database metadata readback');
  const expectedPolicy = tripBindingPolicy ?? await expectedTripBindingPolicy({sourcePhase});
  const expectedActiveAdmissionPolicy = tripActiveAdmissionPolicy
    ?? await expectedTripActiveAdmissionPolicy();
  const expectedCheckpointContract = await expectedCheckpointCasContract({sourcePhase});
  assertDatabaseReadback(value, expectedPolicy, expectedActiveAdmissionPolicy);
  const checkpointResponse = await fetchImpl(
    `${baseUrl}/rest/v1/rpc/ravradar_ravscore_checkpoint_contract`,
    {
      method: 'POST',
      headers: buildSupabaseAdminHeaders(serviceRoleKey),
      body: '{}',
    },
  );
  const checkpointValue = await readJsonResponse(
    checkpointResponse,
    'checkpoint database metadata readback',
  );
  assertCheckpointDatabaseReadback(checkpointValue, expectedCheckpointContract);
  return value;
}

function expectedAssistantHeaders(binding) {
  return Object.freeze({
    [ASSISTANT_BINDING_HEADERS.modelId]: binding.modelId,
    [ASSISTANT_BINDING_HEADERS.stateSchemaVersion]: binding.stateSchemaVersion,
    [ASSISTANT_BINDING_HEADERS.modelContractSha256]: binding.modelContractSha256,
    [ASSISTANT_BINDING_HEADERS.modelBundleSha256]: binding.modelBundleSha256,
    [ASSISTANT_BINDING_HEADERS.knowledgeSchema]: binding.knowledgeSchema,
    [ASSISTANT_BINDING_HEADERS.knowledgeSha256]: binding.knowledgeSha256,
  });
}

export async function verifyTripStorageEdgeBoundaries({
  url,
  publishableKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  assert.ok(typeof fetchImpl === 'function', 'fetch is required');
  assert.ok(url && publishableKey, 'Supabase URL and publishable key are required for trip Edge checks');
  const baseUrl = String(url).replace(/\/$/, '');
  async function invoke(functionName, { origin, method = 'POST', body = '{}' } = {}) {
    return fetchImpl(`${baseUrl}/functions/v1/${functionName}`, {
      method,
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
        origin,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body } : {}),
    });
  }

  for (const functionName of ['submit-observation', 'trip-log']) {
    const preflight = await invoke(functionName, { origin: PUBLIC_ORIGIN, method: 'OPTIONS' });
    assert.equal(preflight.status, 204, `${functionName}: allowed CORS preflight returned ${preflight.status}`);
    assert.equal(preflight.headers.get('access-control-allow-origin'), PUBLIC_ORIGIN,
      `${functionName}: allowed CORS preflight did not expose the public origin`);
    const foreign = await invoke(functionName, { origin: 'https://example.invalid', method: 'OPTIONS' });
    assert.equal(foreign.status, 403, `${functionName}: foreign origin was not rejected`);
    assert.equal(foreign.headers.get('access-control-allow-origin'), null,
      `${functionName}: foreign origin received an allow-origin header`);
  }

  const unauthenticatedLog = await invoke('trip-log', {
    origin: PUBLIC_ORIGIN,
    body: JSON.stringify({ limit: 1 }),
  });
  assert.equal(unauthenticatedLog.status, 401,
    `trip-log accepted an unauthenticated read (${unauthenticatedLog.status})`);
  const unauthenticatedBody = await assistantJson(unauthenticatedLog, 'trip-log unauthenticated boundary');
  assert.equal(unauthenticatedBody?.error, 'LOGIN_REQUIRED', 'trip-log safe login error is missing');

  const invalidObservation = await invoke('submit-observation', { origin: PUBLIC_ORIGIN });
  assert.equal(invalidObservation.status, 400,
    `submit-observation field gate returned ${invalidObservation.status}`);
  return true;
}

function assertAssistantResponseBinding(response, expectedHeaders, { required = true } = {}) {
  const present = Object.keys(expectedHeaders).filter(name => response.headers.get(name) !== null);
  if (present.length > 0 && present.length !== Object.keys(expectedHeaders).length) {
    throw new Error('assistant returned a partial model/knowledge binding header set');
  }
  if (required) assert.equal(present.length, Object.keys(expectedHeaders).length,
    'assistant did not return the required integrated model/knowledge binding headers');
  if (present.length) {
    for (const [name, expected] of Object.entries(expectedHeaders)) {
      assert.equal(response.headers.get(name), expected, `assistant binding header mismatch: ${name}`);
    }
    const exposed = new Set(String(response.headers.get('access-control-expose-headers') || '')
      .toLowerCase().split(',').map(value => value.trim()).filter(Boolean));
    for (const name of Object.keys(expectedHeaders)) {
      assert.ok(exposed.has(name), `assistant binding header is not CORS-exposed: ${name}`);
    }
  }
  return present.length > 0;
}

async function assistantJson(response, label) {
  let body;
  try { body = await response.json(); }
  catch { throw new Error(`${label} returned invalid JSON`); }
  return body;
}

export async function verifyIntegratedAssistantEdge({
  url,
  publishableKey,
  fetchImpl = globalThis.fetch,
  requireBinding = true,
  assistantBinding: sealedAssistantBinding = null,
  modelBinding: sealedModelBinding = null,
} = {}) {
  assert.ok(typeof fetchImpl === 'function', 'fetch is required');
  assert.ok(url && publishableKey, 'Supabase URL and publishable key are required for assistant readback');
  const assistantBinding = sealedAssistantBinding ?? await expectedAssistantBinding();
  const endpoint = `${String(url).replace(/\/$/, '')}/functions/v1/${ASSISTANT_FUNCTION}`;
  const headers = {
    apikey: publishableKey,
    authorization: `Bearer ${publishableKey}`,
    origin: PUBLIC_ORIGIN,
  };
  const response = await fetchImpl(endpoint, { method: 'OPTIONS', headers });
  assert.equal(response.status, 204, `assistant CORS metadata check returned ${response.status}`);
  assert.equal(response.headers.get('access-control-allow-origin'), PUBLIC_ORIGIN,
    'assistant CORS metadata check did not allow the public origin');

  const expectedHeaders = expectedAssistantHeaders(assistantBinding);
  const bindingPresent = assertAssistantResponseBinding(response, expectedHeaders, { required: requireBinding });

  const foreign = await fetchImpl(endpoint, {
    method: 'OPTIONS',
    headers: { ...headers, origin: 'https://example.invalid' },
  });
  assert.equal(foreign.status, 403, 'assistant accepted a foreign CORS origin');
  assert.equal(foreign.headers.get('access-control-allow-origin'), null,
    'assistant exposed an allow-origin header to a foreign origin');

  if (requireBinding) {
    const exactBinding = sealedModelBinding ?? ravScoreModelBinding();
    assertExactKeys(exactBinding, MODEL_BINDING_FIELDS,
      'assistant expected exact model binding');
    const basePayload = Object.freeze({
      question: 'Hvad er hovedstaden i Frankrig?',
      locale: 'da',
    });
    const cases = [
      ['missing', undefined],
      ['extra', { ...exactBinding, unexpected: 'forbidden' }],
      ['mismatch', { ...exactBinding, modelBundleSha256: '0'.repeat(64) }],
    ];
    for (const [label, modelBinding] of cases) {
      const context = modelBinding === undefined ? {} : { modelBinding };
      const rejected = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, context }),
      });
      assert.equal(rejected.status, 409, `assistant accepted ${label} model binding (${rejected.status})`);
      assertAssistantResponseBinding(rejected, expectedHeaders);
      assert.deepEqual(await assistantJson(rejected, `assistant ${label}-binding rejection`),
        { error: 'MODEL_BINDING_MISMATCH' },
        `assistant ${label}-binding rejection body is incompatible`);
    }

    const accepted = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, context: { modelBinding: exactBinding } }),
    });
    assert.equal(accepted.status, 200, `assistant rejected the exact model binding (${accepted.status})`);
    assertAssistantResponseBinding(accepted, expectedHeaders);
    const acceptedBody = await assistantJson(accepted, 'assistant exact-binding fixed refusal');
    assertExactKeys(acceptedBody, ['answer'], 'assistant exact-binding fixed refusal');
    assert.ok(typeof acceptedBody.answer === 'string' && acceptedBody.answer.trim(),
      'assistant exact-binding fixed refusal has no safe answer');
  }
  return Object.freeze({ bindingPresent, assistantBinding });
}

async function readReadinessDocument({ url, serviceRoleKey, fetchImpl }) {
  const endpoint = `${String(url).replace(/\/$/, '')}/rest/v1/admin_documents`;
  const response = await fetchImpl(
    `${endpoint}?select=payload&document_key=eq.${encodeURIComponent(READINESS_DOCUMENT_KEY)}&limit=1`,
    { headers: buildSupabaseAdminHeaders(serviceRoleKey) },
  );
  const rows = await readJsonResponse(response, 'protected integrated readiness readback');
  assert.ok(Array.isArray(rows), 'protected integrated readiness readback was not a row list');
  return rows[0]?.payload ?? null;
}

function assertReadinessDocument(actual, expected) {
  assert.ok(actual, 'protected integrated cutover readiness document is missing');
  assert.equal(stableJson(actual), stableJson(expected),
    'protected integrated cutover readiness document does not match the exact source/model/backend binding');
  return true;
}

function assertSealedModelBindingShape(binding, label) {
  assertExactKeys(binding, MODEL_BINDING_FIELDS, label);
  for (const field of MODEL_BINDING_FIELDS.slice(0, 9)) {
    assert.match(String(binding[field] ?? ''), /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/,
      `${label} has an invalid ${field}`);
  }
  assert.match(String(binding.modelContractSha256 ?? ''), SHA256_PATTERN,
    `${label} has an invalid contract digest`);
  assert.match(String(binding.modelBundleSha256 ?? ''), SHA256_PATTERN,
    `${label} has an invalid implementation digest`);
}

function assertSealedCentralProfile(profile, binding) {
  assertExactKeys(profile, [
    'schemaVersion', 'sourceVersion', 'switchVersion', 'requestedProfileId',
    'activeModelId', 'stateSchemaVersion', 'variantId', 'profileId',
    'componentSchemaId', 'explanationSchemaId', 'rankingPolicyId',
    'bestTimePolicyId', 'presentationPolicyId', 'modelContractSha256',
    'modelBundleSha256', 'rollbackModelId', 'runtimeFallbackModelId',
    'modelActivationEnabled', 'automaticActivationAllowed',
    'publicAvailabilityPolicy', 'crossModelRuntimeFallbackAllowed',
    'migrationRequiredAtFirstCutover', 'status', 'activationAuthority', 'evidence',
  ], 'sealed readiness central profile');
  assertExactKeys(profile.evidence, [
    'decisionId', 'exactHeadValidationRequired', 'freshProductionValidationRequired',
  ], 'sealed readiness central profile evidence');
  assert.match(String(profile.sourceVersion ?? ''), /^\d+\.\d+\.\d+$/,
    'sealed readiness central profile sourceVersion is invalid');
  assert.equal(profile.schemaVersion, '3.0.0');
  assert.equal(profile.switchVersion, 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0');
  assert.equal(profile.requestedProfileId, binding.modelId);
  assert.equal(profile.activeModelId, binding.modelId);
  for (const field of MODEL_BINDING_FIELDS.slice(1)) {
    assert.equal(profile[field], binding[field],
      `sealed readiness central profile differs at ${field}`);
  }
  assert.equal(profile.runtimeFallbackModelId, null);
  assert.equal(profile.rollbackModelId, candidateGRollbackModelBinding().modelId);
  assert.equal(profile.modelActivationEnabled, true);
  assert.equal(profile.automaticActivationAllowed, false);
  assert.equal(profile.publicAvailabilityPolicy, 'integrated-model-local-fail-closed');
  assert.equal(profile.crossModelRuntimeFallbackAllowed, false);
  assert.equal(profile.migrationRequiredAtFirstCutover, true);
  assert.equal(profile.status, 'owner-approved-integrated-model-only-local-fail-closed');
  assert.equal(profile.activationAuthority, 'DEC-0110-integrated-ravscore-release-decision');
  assert.deepEqual(profile.evidence, {
    decisionId: 'DEC-0110',
    exactHeadValidationRequired: true,
    freshProductionValidationRequired: true,
  });
}

export function assertSealedIntegratedCutoverReadiness(value) {
  assertExactKeys(value, [
    'schemaVersion', 'sourceHead', 'modelContractSha256', 'modelBundleSha256',
    'publicImplementationClosureSha256',
    'migrationIds', 'tripSchemaVersion', 'tripBindingPolicyId',
    'tripBindingPolicySha256', 'tripActiveAdmissionPolicyId',
    'tripActiveAdmissionPolicySha256', 'modelBinding', 'candidateModelBinding',
    'centralProfile', 'assistantBinding',
  ], 'sealed integrated cutover readiness');
  assert.equal(value.schemaVersion, READINESS_SCHEMA);
  normaliseSourceHead(value.sourceHead, 'sealed readiness source head');
  assertSealedModelBindingShape(value.modelBinding, 'sealed readiness integrated binding');
  assertSealedModelBindingShape(value.candidateModelBinding,
    'sealed readiness Candidate binding');
  assert.equal(value.modelContractSha256, value.modelBinding.modelContractSha256);
  assert.equal(value.modelBundleSha256, value.modelBinding.modelBundleSha256);
  assert.match(String(value.publicImplementationClosureSha256 ?? ''), SHA256_PATTERN);
  assert.deepEqual(value.migrationIds, REQUIRED_CUTOVER_MIGRATIONS.map(item => item.id));
  assert.equal(value.tripSchemaVersion, 3);
  assert.equal(value.tripBindingPolicyId, TRIP_BINDING_POLICY_ID);
  assert.match(String(value.tripBindingPolicySha256 ?? ''), SHA256_PATTERN);
  assert.equal(value.tripActiveAdmissionPolicyId, TRIP_ACTIVE_ADMISSION_POLICY_ID);
  assert.match(String(value.tripActiveAdmissionPolicySha256 ?? ''), SHA256_PATTERN);
  assertSealedCentralProfile(value.centralProfile, value.modelBinding);
  assertExactKeys(value.assistantBinding, [
    'modelId', 'stateSchemaVersion', 'modelContractSha256', 'modelBundleSha256',
    'knowledgeSchema', 'knowledgeSha256',
  ], 'sealed readiness assistant binding');
  assert.equal(value.assistantBinding.modelId, value.modelBinding.modelId);
  assert.equal(value.assistantBinding.stateSchemaVersion, value.modelBinding.stateSchemaVersion);
  assert.equal(value.assistantBinding.modelContractSha256,
    value.modelBinding.modelContractSha256);
  assert.equal(value.assistantBinding.modelBundleSha256,
    value.modelBinding.modelBundleSha256);
  assert.equal(value.assistantBinding.knowledgeSchema, 'rav-assistant-public-knowledge-v1');
  assert.match(String(value.assistantBinding.knowledgeSha256 ?? ''), SHA256_PATTERN);
  return true;
}

export async function checkSealedIntegratedCutoverReadiness({
  expected,
  url,
  serviceRoleKey,
  publishableKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  assertSealedIntegratedCutoverReadiness(expected);
  const actual = await readReadinessDocument({ url, serviceRoleKey, fetchImpl });
  assertReadinessDocument(actual, expected);
  await verifyIntegratedDatabaseReadback({
    url,
    serviceRoleKey,
    fetchImpl,
    modelBinding: expected.modelBinding,
    candidateModelBinding: expected.candidateModelBinding,
    tripBindingPolicy: {
      id: expected.tripBindingPolicyId,
      sha256: expected.tripBindingPolicySha256,
    },
    tripActiveAdmissionPolicy: {
      id: expected.tripActiveAdmissionPolicyId,
      sha256: expected.tripActiveAdmissionPolicySha256,
    },
  });
  await verifyTripStorageEdgeBoundaries({ url, publishableKey, fetchImpl });
  await verifyIntegratedAssistantEdge({
    url,
    publishableKey,
    fetchImpl,
    requireBinding: true,
    assistantBinding: expected.assistantBinding,
    modelBinding: expected.modelBinding,
  });
  return actual;
}

export async function publishIntegratedCutoverReadiness({
  sourceHead,
  publicImplementationClosureSha256,
  url,
  serviceRoleKey,
  publishableKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  const expected = await buildIntegratedCutoverReadiness(sourceHead, {
    publicImplementationClosureSha256,
  });

  // All calls before the upsert are read-only. A marker is never written for a
  // source head whose committed DB or deployed assistant contract is stale.
  await verifyIntegratedDatabaseReadback({ url, serviceRoleKey, fetchImpl });
  await verifyTripStorageEdgeBoundaries({ url, publishableKey, fetchImpl });
  await verifyIntegratedAssistantEdge({ url, publishableKey, fetchImpl, requireBinding: true });

  const current = await readReadinessDocument({ url, serviceRoleKey, fetchImpl });
  if (!current || stableJson(current) !== stableJson(expected)) {
    const endpoint = `${String(url).replace(/\/$/, '')}/rest/v1/admin_documents`;
    const response = await fetchImpl(`${endpoint}?on_conflict=document_key&select=payload`, {
      method: 'POST',
      headers: {
        ...buildSupabaseAdminHeaders(serviceRoleKey),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ document_key: READINESS_DOCUMENT_KEY, payload: expected, updated_by: null }),
    });
    const rows = await readJsonResponse(response, 'protected integrated readiness write');
    assert.ok(Array.isArray(rows) && rows.length === 1, 'protected readiness write did not return exactly one row');
    assertReadinessDocument(rows[0]?.payload, expected);
  }
  const readback = await readReadinessDocument({ url, serviceRoleKey, fetchImpl });
  assertReadinessDocument(readback, expected);
  return expected;
}

export async function checkIntegratedCutoverReadiness({
  sourceHead,
  publicImplementationClosureSha256,
  url,
  serviceRoleKey,
  publishableKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  const expected = await buildIntegratedCutoverReadiness(sourceHead, {
    publicImplementationClosureSha256,
  });
  const actual = await readReadinessDocument({ url, serviceRoleKey, fetchImpl });
  assertReadinessDocument(actual, expected);
  await verifyIntegratedDatabaseReadback({ url, serviceRoleKey, fetchImpl });
  await verifyTripStorageEdgeBoundaries({ url, publishableKey, fetchImpl });
  await verifyIntegratedAssistantEdge({ url, publishableKey, fetchImpl, requireBinding: true });
  return expected;
}

function sourceHeadFromEnvironment() {
  const githubSha = normaliseSourceHead(process.env.GITHUB_SHA, 'GITHUB_SHA');
  if (process.env.RAVRADAR_EXPECTED_SOURCE_HEAD) {
    assert.equal(normaliseSourceHead(process.env.RAVRADAR_EXPECTED_SOURCE_HEAD, 'RAVRADAR_EXPECTED_SOURCE_HEAD'), githubSha,
      'RAVRADAR_EXPECTED_SOURCE_HEAD does not match GITHUB_SHA');
  }
  if (process.env.GITHUB_REF) assert.equal(process.env.GITHUB_REF, 'refs/heads/main',
    'integrated cutover readiness may only run from refs/heads/main');
  return githubSha;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  assert.ok(index >= 0 && process.argv[index + 1], `${name} is required`);
  return process.argv[index + 1];
}

function optionalArgumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function runCli() {
  ACTIVE.requireOutput(); // Fast aktiv familie før CLI/input.
  const command = process.argv[2];
  if (command === 'assert-source') {
    const sourceHead = sourceHeadFromEnvironment();
    await inspectMigrationSources();
    const expected = await buildIntegratedCutoverReadiness(sourceHead, {
      publicImplementationClosureSha256:
        argumentValue('--public-implementation-closure-sha256'),
    });
    console.log(`Integrated cutover source verified: ${expected.sourceHead}; bundle ${expected.modelBundleSha256}.`);
    return;
  }
  if (command === 'prepare-workdir') {
    const prepared = await prepareTemporarySupabaseCutoverWorkdir({ workdir: argumentValue('--output'),
      includeStatisticsPreferenceRevisionSource:process.argv.includes('--statistics-preference-revision-source') });
    console.log(`Temporary Supabase cutover view prepared with ${REQUIRED_CUTOVER_MIGRATIONS.length} exact source migrations.`);
    assert.ok(prepared.migrationsDirectory);
    return;
  }
  if (command === 'hydrate-history') {
    const migrationListText = await fs.readFile(argumentValue('--migration-list'), 'utf8');
    const result = await hydrateTemporaryRemoteMigrationHistory({
      workdir: argumentValue('--workdir'),
      migrationListText,
    });
    console.log(`Temporary migration view normalized with ${result.placeholders.length} already-applied remote history marker(s).`);
    return;
  }
  if (command === 'plan') {
    const migrationListText = await fs.readFile(argumentValue('--migration-list'), 'utf8');
    const dryRunText = await fs.readFile(argumentValue('--dry-run'), 'utf8');
    const migrationsDirectory = optionalArgumentValue('--migrations-directory') || MIGRATIONS_DIRECTORY;
    const plan = await assertSupabaseMigrationPlan({ migrationListText, dryRunText, migrationsDirectory });
    console.log(`Supabase dry-run accepted: ${plan.pendingVersions.length} required migration(s) pending; no unexpected writes.`);
    return;
  }
  if (command === 'applied') {
    const migrationListText = await fs.readFile(argumentValue('--migration-list'), 'utf8');
    const result = assertSupabaseMigrationsApplied(migrationListText);
    console.log(`Supabase migration metadata readback is complete: ${result.appliedVersions.join(', ')}.`);
    return;
  }
  const { url, serviceRoleKey, publishableKey } = requiredSupabaseConfiguration();
  if (command === 'check-sealed') {
    if (process.env.GITHUB_REF) assert.equal(process.env.GITHUB_REF, 'refs/heads/main',
      'sealed readiness reconciliation may only run from refs/heads/main');
    if (process.env.GITHUB_SHA) normaliseSourceHead(process.env.GITHUB_SHA, 'GITHUB_SHA');
    const expected = JSON.parse(await fs.readFile(argumentValue('--document'), 'utf8'));
    const payload = await checkSealedIntegratedCutoverReadiness({
      expected,
      url,
      serviceRoleKey,
      publishableKey,
    });
    const output = optionalArgumentValue('--output');
    if (output) await fs.writeFile(output, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
    console.log(`Protected sealed integrated readiness is live-verified for ${payload.sourceHead}.`);
    return;
  }
  const sourceHead = sourceHeadFromEnvironment();
  if (command === 'verify-db') {
    await verifyIntegratedDatabaseReadback({ url, serviceRoleKey });
    console.log('Integrated trip schema metadata readback is exact and reads no observation rows.');
    return;
  }
  if (command === 'publish') {
    assert.equal(process.env.RAVRADAR_REQUIRE_INTEGRATED_BINDING, 'true',
      'protected readiness publish requires explicit integrated-binding attestation intent');
    const publicImplementationClosureSha256 =
      argumentValue('--public-implementation-closure-sha256');
    const payload = await publishIntegratedCutoverReadiness({
      sourceHead,
      publicImplementationClosureSha256,
      url,
      serviceRoleKey,
      publishableKey,
    });
    const output = optionalArgumentValue('--output');
    if (output) await fs.writeFile(output, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
    console.log(`Protected integrated cutover readiness published for ${payload.sourceHead}; bundle ${payload.modelBundleSha256}.`);
    return;
  }
  if (command === 'check') {
    const publicImplementationClosureSha256 =
      argumentValue('--public-implementation-closure-sha256');
    const payload = await checkIntegratedCutoverReadiness({
      sourceHead,
      publicImplementationClosureSha256,
      url,
      serviceRoleKey,
      publishableKey,
    });
    const output = optionalArgumentValue('--output');
    if (output) await fs.writeFile(output, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
    console.log(`Protected integrated cutover readiness is exact and read-only verified for ${payload.sourceHead}.`);
    return;
  }
  throw new Error('Usage: integrated-cutover-readiness.mjs assert-source|prepare-workdir|hydrate-history|plan|applied|verify-db|publish|check|check-sealed');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch(error => {
    console.error(error instanceof Error ? error.message : 'Integrated cutover readiness failed');
    process.exitCode = 1;
  });
}
