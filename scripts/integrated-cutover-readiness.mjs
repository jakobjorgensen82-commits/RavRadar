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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIRECTORY = path.join(ROOT, 'supabase', 'migrations');
const KNOWLEDGE_PATH = path.join(ROOT, 'knowledge', 'rav-assistant-public-v1.json');
const CENTRAL_PROFILE_PATH = path.join(ROOT, 'data', 'admin', 'ravscore-profile-selection.json');
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_HEAD_PATTERN = /^[a-f0-9]{40}$/;
const MIGRATION_VERSION_PATTERN = /^\d{8,14}$/;
const READINESS_DOCUMENT_KEY = 'ravscore-integrated-cutover-readiness';
const READINESS_SCHEMA = 'ravscore-integrated-cutover-readiness-v1';
const DATABASE_READBACK_SCHEMA = 'ravscore-integrated-cutover-db-v1';
const MODEL_BINDING_FIELDS = Object.freeze([
  'modelId', 'stateSchemaVersion', 'variantId', 'profileId', 'componentSchemaId',
  'explanationSchemaId', 'rankingPolicyId', 'bestTimePolicyId',
  'presentationPolicyId', 'modelContractSha256', 'modelBundleSha256',
]);
export const TRIP_BINDING_POLICY_ID =
  'ravradar-trip-v3-exact-integrated-candidate-g-history-emergency-v3';
export const TRIP_ACTIVE_ADMISSION_POLICY_ID =
  'ravradar-trip-v3-exact-operational-active-reasons-v3';
const ASSISTANT_FUNCTION = 'ravradar-assistant';
const PUBLIC_ORIGIN = 'https://ravradar.dk';

export const REQUIRED_CUTOVER_MIGRATIONS = Object.freeze([
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
]);

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

export async function expectedTripBindingPolicy({ migrationsDirectory = MIGRATIONS_DIRECTORY } = {}) {
  const migration = await fs.readFile(path.join(
    migrationsDirectory,
    REQUIRED_CUTOVER_MIGRATIONS[1].filename,
  ), 'utf8');
  const match = migration.match(
    /create or replace function public\.ravradar_trip_v3_binding_allowed\([\s\S]*?\)\s*returns boolean[\s\S]*?as \$\$([\s\S]*?)\$\$;/i,
  );
  assert.ok(match && match[1], 'trip binding allowlist policy definition is missing from the migration');
  const definition = normaliseTripBindingPolicyDefinition(match[1]);
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

export async function expectedTripActiveAdmissionPolicy({ migrationsDirectory = MIGRATIONS_DIRECTORY } = {}) {
  const migration = await fs.readFile(path.join(
    migrationsDirectory,
    REQUIRED_CUTOVER_MIGRATIONS[1].filename,
  ), 'utf8');
  const definition = sqlFunctionBody(
    migration,
    'public.ravradar_trip_v3_active_binding_admitted',
    'active trip admission policy',
  );
  const triggerFunctionDefinition = sqlFunctionBody(
    migration,
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

export async function inspectMigrationSources({ migrationsDirectory = MIGRATIONS_DIRECTORY } = {}) {
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
      // applied history plus the two exact new migrations. New duplicates are
      // still a hard error.
      assert.ok(version.length === 8 && version <= '20260828',
        `duplicate Supabase migration version ${version}: ${versionToFilename.get(version)} and ${filename}`);
      historicalDuplicateVersions.add(version);
      continue;
    }
    versionToFilename.set(version, filename);
  }
  for (const migration of REQUIRED_CUTOVER_MIGRATIONS) {
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

export async function prepareTemporarySupabaseCutoverWorkdir({ workdir: inputWorkdir } = {}) {
  const workdir = assertTemporaryCutoverWorkdir(inputWorkdir);
  await inspectMigrationSources();
  await fs.mkdir(workdir, { recursive: true });
  const existing = await fs.readdir(workdir);
  assert.deepEqual(existing, [], 'cutover workdir must be empty before preparation');
  const supabaseDirectory = path.join(workdir, 'supabase');
  const migrationsDirectory = path.join(supabaseDirectory, 'migrations');
  await fs.mkdir(migrationsDirectory, { recursive: true });
  await fs.copyFile(path.join(ROOT, 'supabase', 'config.toml'), path.join(supabaseDirectory, 'config.toml'));
  for (const migration of REQUIRED_CUTOVER_MIGRATIONS) {
    await fs.copyFile(
      path.join(MIGRATIONS_DIRECTORY, migration.filename),
      path.join(migrationsDirectory, migration.filename),
    );
  }
  return Object.freeze({ workdir, migrationsDirectory });
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function migrationChronologicalKey(version) {
  assert.match(version, MIGRATION_VERSION_PATTERN);
  return BigInt(version.padEnd(14, '0'));
}

export function parseSupabaseMigrationList(value) {
  const rows = [];
  for (const line of stripAnsi(value).split(/\r?\n/)) {
    if (!/[|│]/.test(line)) continue;
    const columns = line.split(/[|│]/).map(column => column.trim());
    if (columns.length < 2) continue;
    const local = MIGRATION_VERSION_PATTERN.test(columns[0]) ? columns[0] : null;
    const remote = MIGRATION_VERSION_PATTERN.test(columns[1]) ? columns[1] : null;
    if (local || remote) rows.push(Object.freeze({ local, remote }));
  }
  assert.ok(rows.length > 0, 'Supabase migration-list output contained no parseable migration rows');
  return Object.freeze(rows);
}

export async function hydrateTemporaryRemoteMigrationHistory({
  workdir: inputWorkdir,
  migrationListText,
} = {}) {
  const workdir = assertTemporaryCutoverWorkdir(inputWorkdir);
  const migrationsDirectory = path.join(workdir, 'supabase', 'migrations');
  const source = await inspectMigrationSources({ migrationsDirectory });
  const rows = parseSupabaseMigrationList(migrationListText);
  const local = uniqueVersions(rows, 'local');
  const remote = uniqueVersions(rows, 'remote');
  const required = new Set(REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version));
  const firstUniqueCutoverVersion = migrationChronologicalKey(REQUIRED_CUTOVER_MIGRATIONS[0].version);
  for (const migration of REQUIRED_CUTOVER_MIGRATIONS) {
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

export async function assertSupabaseMigrationPlan({
  migrationListText,
  dryRunText,
  migrationsDirectory = MIGRATIONS_DIRECTORY,
} = {}) {
  const source = await inspectMigrationSources({ migrationsDirectory });
  const rows = parseSupabaseMigrationList(migrationListText);
  const local = uniqueVersions(rows, 'local');
  const remote = uniqueVersions(rows, 'remote');
  const requiredVersions = new Set(REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version));

  for (const migration of REQUIRED_CUTOVER_MIGRATIONS) {
    assert.ok(local.has(migration.version), `Supabase CLI did not see required local migration ${migration.filename}`);
  }

  const pending = [...local].filter(version => !remote.has(version));
  const unexpectedPending = pending.filter(version => !requiredVersions.has(version));
  assert.deepEqual(unexpectedPending, [],
    `refusing db push with unexpected pending migrations: ${unexpectedPending.join(', ')}`);
  for (let index = 1; index < REQUIRED_CUTOVER_MIGRATIONS.length; index += 1) {
    const earlier = REQUIRED_CUTOVER_MIGRATIONS[index - 1].version;
    const later = REQUIRED_CUTOVER_MIGRATIONS[index].version;
    assert.ok(!(remote.has(later) && !remote.has(earlier)),
      `remote cutover migration order is inconsistent: ${later} is applied before ${earlier}`);
  }

  const dryRun = stripAnsi(dryRunText);
  assert.ok(dryRun.trim(), 'Supabase db push --dry-run produced no auditable output');
  for (const migration of REQUIRED_CUTOVER_MIGRATIONS) {
    if (pending.includes(migration.version)) {
      assert.ok(dryRun.includes(migration.version),
        `dry-run did not name pending required migration ${migration.filename}`);
    }
  }
  for (const [version, filename] of source.versionToFilename.entries()) {
    if (!requiredVersions.has(version) && dryRun.includes(filename)) {
      throw new Error(`dry-run proposed unexpected migration ${filename}`);
    }
  }
  return Object.freeze({
    pendingVersions: Object.freeze(pending.sort()),
    alreadyAppliedVersions: Object.freeze([...requiredVersions].filter(version => remote.has(version)).sort()),
  });
}

export function assertSupabaseMigrationsApplied(migrationListText) {
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

function assertDatabaseReadback(value, expectedPolicy, expectedActiveAdmissionPolicy) {
  assertExactKeys(value, [
    'schemaVersion', 'tripSchemaVersion', 'appliedMigrationVersions',
    'tripBindingPolicy', 'tripActiveAdmissionPolicy', 'checks',
  ], 'database cutover readback');
  assert.equal(value.schemaVersion, DATABASE_READBACK_SCHEMA);
  assert.equal(value.tripSchemaVersion, 3);
  assert.deepEqual(value.appliedMigrationVersions,
    REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version),
    'database readback is missing required applied migrations');
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
  assert.match(String(value.tripActiveAdmissionPolicy.triggerDefinition ?? ''),
    /CREATE TRIGGER ravradar_observations_active_v3_binding_trigger BEFORE INSERT OR UPDATE[\s\S]* ON (?:public\.)?observations[\s\S]*ravradar_observation_require_active_v3_binding\(\)/i,
    'database active trip admission trigger definition is incompatible');
  assertExactKeys(value.checks, [
    'schemaVersionConstraintPresent',
    'dataQualityConstraintPresent',
    'nestedPrivacyConstraintPresent',
    'tripV3ConstraintPresent',
    'tripV3ConstraintValidatedAgainstHistoricalRows',
    'tripIdIndexPresent',
    'bindingPolicyDefinitionPresent',
    'activeBindingAdmissionDefinitionPresent',
    'activeBindingTriggerPresent',
    'activeBindingTriggerCallsGateExactlyOnce',
    'bindingGateCalledExactlyOnce',
    'integratedModelBindingPresent',
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
    'activeBindingAdmissionDefinitionPresent',
    'activeBindingTriggerPresent',
    'activeBindingTriggerCallsGateExactlyOnce',
    'bindingGateCalledExactlyOnce',
    'integratedModelBindingPresent',
    'candidateGRollbackBindingPresent',
    'unknownModelBindingRejected',
    'exactModelBindingPresent',
  ]) assert.equal(value.checks[key], true, `database cutover check failed: ${key}`);
  assert.equal(typeof value.checks.tripV3ConstraintValidatedAgainstHistoricalRows, 'boolean');
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
  tripActiveAdmissionPolicy = null,
} = {}) {
  assert.ok(typeof fetchImpl === 'function', 'fetch is required');
  assert.ok(url && serviceRoleKey, 'Supabase URL and service role are required for database readback');
  const binding = modelBinding ?? ravScoreModelBinding();
  const candidate = candidateModelBinding ?? candidateGRollbackModelBinding();
  assertExactKeys(binding, MODEL_BINDING_FIELDS, 'database expected integrated binding');
  assertExactKeys(candidate, MODEL_BINDING_FIELDS, 'database expected Candidate binding');
  const response = await fetchImpl(`${String(url).replace(/\/$/, '')}/rest/v1/rpc/ravradar_integrated_cutover_contract`, {
    method: 'POST',
    headers: buildSupabaseAdminHeaders(serviceRoleKey),
    body: JSON.stringify(expectedRpcBody(binding, candidate)),
  });
  const value = await readJsonResponse(response, 'integrated database metadata readback');
  const expectedPolicy = tripBindingPolicy ?? await expectedTripBindingPolicy();
  const expectedActiveAdmissionPolicy = tripActiveAdmissionPolicy
    ?? await expectedTripActiveAdmissionPolicy();
  assertDatabaseReadback(value, expectedPolicy, expectedActiveAdmissionPolicy);
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
    const prepared = await prepareTemporarySupabaseCutoverWorkdir({ workdir: argumentValue('--output') });
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
