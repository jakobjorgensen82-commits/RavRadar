#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ASSISTANT_BINDING_HEADERS,
  LATEST_RAVSCORE_BINDING_MIGRATION,
  LATEST_REQUIRED_CUTOVER_MIGRATION,
  REQUIRED_CUTOVER_MIGRATIONS,
  assertSealedIntegratedCutoverReadiness,
  assertSupabaseMigrationPlan,
  assertSupabaseMigrationsApplied,
  buildIntegratedCutoverReadiness,
  checkIntegratedCutoverReadiness,
  checkSealedIntegratedCutoverReadiness,
  expectedAssistantBinding,
  expectedCheckpointCasContract,
  expectedTripActiveAdmissionPolicy,
  expectedTripBindingPolicy,
  hydrateTemporaryRemoteMigrationHistory,
  inspectMigrationSources,
  parseSupabaseDryRunMigrationFilenames,
  parseSupabaseMigrationList,
  publishIntegratedCutoverReadiness,
  prepareTemporarySupabaseCutoverWorkdir,
  verifyIntegratedAssistantEdge,
  verifyIntegratedDatabaseReadback,
  verifyTripStorageEdgeBoundaries,
} from './integrated-cutover-readiness.mjs';
import {
  ravScoreContinuationImplementationSha256,
} from './lib/ravscore-continuation-implementation-contract.mjs';
import { buildBoundedCurrentTransportMemory } from '../js/core/ravscore-regime-memory.js';
import { buildCurrentSupplyMemory } from '../js/core/ravscore-current-supply-memory.js';
import { readAccountAssistantCanonicalSource } from './lib/account-assistant-successor-source.mjs';
import { readCurrentGridCanonicalSource } from './lib/current-grid-successor-source.mjs';
import { accountAssistantCatalogQuery, verifyAccountAssistantCatalogMetadata,
  verifyInstalledAccountAssistantSchema } from './verify-account-assistant-schema.mjs';

const SOURCE_HEAD = 'a'.repeat(40);
const PUBLIC_IMPLEMENTATION_CLOSURE_SHA256 = 'c'.repeat(64);
const URL = 'https://project.example';
const SERVICE_KEY = 'sb_secret_test_only';
const PUBLISHABLE_KEY = 'sb_publishable_test_only';
const CHECKPOINT_CONTINUATION_HASH =
  await ravScoreContinuationImplementationSha256();
// The issued exact predecessor migration has its OWN historical endpoint.
// Today's continuation remains independently required in the current successor.
const EXACT_PREDECESSOR_CONTINUATION_HASH =
  '46683362ec6b69835695db375f7de976a8dd0a75b7367a27e2854b653d73e0ab';

await inspectMigrationSources();
assert.equal(REQUIRED_CUTOVER_MIGRATIONS.length, 48,
  'The active backend must preserve every predecessor, storage security and the exact checkpoint bridge');
assert.equal(LATEST_RAVSCORE_BINDING_MIGRATION.version, '20260920220000');
assert.equal(REQUIRED_CUTOVER_MIGRATIONS.at(-5).version, '20261005000000');
assert.equal(REQUIRED_CUTOVER_MIGRATIONS.at(-4).version, '20261010130000');
assert.equal(REQUIRED_CUTOVER_MIGRATIONS.at(-3).version, '20261012200000');
assert.equal(REQUIRED_CUTOVER_MIGRATIONS.at(-2).version, '20261013210000');
assert.equal(LATEST_REQUIRED_CUTOVER_MIGRATION.version, '20261013220000');

const integratedMigration = await fs.readFile(
  'supabase/migrations/20260901010000_integrated_trip_measured_warmup_admission.sql',
  'utf8',
);
for (const marker of [
  'create or replace function public.ravradar_integrated_cutover_contract(',
  'from supabase_migrations.schema_migrations m',
  "where m.version::text in ('20260829010000', '20260829020000', '20260901010000')",
  "c.conname = 'ravradar_observations_trip_v3_check'",
  "set local lock_timeout = '5s';",
  'create or replace function public.ravradar_trip_v3_calibration_truth_allowed(',
  'create or replace function public.ravradar_trip_v3_binding_allowed(',
  'create or replace function public.ravradar_trip_v3_active_binding_admitted(',
  "'bindingTruthCalledForBothModels'",
  "'bindingGateCalledExactlyOnce'",
  "'candidateGRollbackBindingPresent'",
  "'unknownModelBindingRejected'",
  "'tripBindingPolicy'",
  "'bindingPolicyDefinitionPresent'",
  "'exactModelBindingPresent'",
  'revoke all on function public.ravradar_integrated_cutover_contract(',
  ') from public, anon, authenticated;',
  'grant execute on function public.ravradar_integrated_cutover_contract(',
  ') to service_role;',
  'reads no observation rows.',
]) assert.ok(integratedMigration.includes(marker), `integrated migration metadata RPC is missing ${marker}`);
for (const forbidden of [
  /\bdrop\s+(?:trigger|constraint|index)\b/i,
  /\bcreate\s+(?:trigger|(?:unique\s+)?index)\b/i,
  /\balter\s+table\b/i,
  /\bnot\s+valid\b/i,
  /\bvalidate\s+constraint\b/i,
]) assert.doesNotMatch(integratedMigration, forbidden,
  `additive measured-warmup migration contains forbidden historical DDL: ${forbidden}`);
const rpcSql = integratedMigration.slice(integratedMigration.indexOf('create or replace function public.ravradar_integrated_cutover_contract('));
assert.doesNotMatch(rpcSql, /\bfrom\s+public\.observations\b/i,
  'integrated cutover RPC must not read observation rows');
assert.doesNotMatch(rpcSql, /\bselect\s+\*\b/i,
  'integrated cutover RPC must not expose broad table data');

const checkpointMigration = await fs.readFile(
  'supabase/migrations/20261010130000_owner_export_origin_bound_successor.sql',
  'utf8',
);
const exactPredecessorMigration = await fs.readFile(
  'supabase/migrations/20260926170000_exact_checkpoint_predecessor.sql',
  'utf8',
);
for (const marker of [
  '5ba4d8944a3e791a7fc918fe5027c5b3157b3cc74e6cd5f99c0fb54dca5208c9',
  'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  EXACT_PREDECESSOR_CONTINUATION_HASH,
  'rr-20260924163002-210',
  'extensions.digest(p_payload::text::bytea',
  'revoke all on function public.ravradar_ravscore_checkpoint_predecessor_payload_valid',
]) assert.ok(exactPredecessorMigration.includes(marker),
  `exact checkpoint predecessor bridge is missing ${marker}`);
const oldPredecessor = checkpointMigration.match(
  /create or replace function public\.ravradar_ravscore_checkpoint_predecessor_payload_valid\([\s\S]*?\n\$\$;/,
)?.[0];
const newPredecessor = exactPredecessorMigration.match(
  /create or replace function public\.ravradar_ravscore_checkpoint_predecessor_payload_valid\([\s\S]*?\n\$\$;/,
)?.[0];
assert.ok(oldPredecessor && newPredecessor);
assert.equal(
  newPredecessor.slice(newPredecessor.indexOf('  if p_payload is null')).replace(/\s+/g, ''),
  oldPredecessor.slice(oldPredecessor.indexOf('  if p_payload is null')).replace(/\s+/g, ''),
  'the existing schema-4 predecessor bridge must remain unchanged',
);
for (const marker of [
  'begin;',
  "set local lock_timeout = '5s';",
  'create or replace function public.ravradar_ravscore_checkpoint_canonical_time(',
  'create or replace function public.ravradar_ravscore_checkpoint_has_forbidden_key(',
  'create or replace function public.ravradar_ravscore_checkpoint_integrated_state_valid(',
  'create or replace function public.ravradar_ravscore_checkpoint_candidate_state_valid(',
  'create or replace function public.ravradar_ravscore_checkpoint_payload_valid(',
  'create or replace function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(',
  'create or replace function public.ravradar_ravscore_checkpoint_cas(',
  "v_key constant text := 'ravscore-continuation-checkpoint'",
  "or (p_state ->> 'transportReferenceAt')::timestamptz > p_reference_text::timestamptz",
  "or p_reference_text::timestamptz - (p_state ->> 'transportReferenceAt')::timestamptz > interval '3 hours'",
  "p_state -> 'transportMemoryReady' = 'false'::jsonb then",
  "p_state ->> 'transportMemoryStatus' is distinct from 'READY'",
  "p_state -> 'transportMemoryCoverageHours' is distinct from '48'::jsonb",
  "p_payload ->> 'continuationStateContractSha256' is distinct from",
  'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0', // immutable575
  '082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91',
  'v_exact_predecessor_same_target_transition',
  "#- '{continuationStateContractSha256}'",
  "#- '{candidateGRollbackCompanion,generationSha256}'",
  'create or replace function public.ravradar_ravscore_checkpoint_contract()',
  "'schemaVersion', 'ravscore-checkpoint-db-v1'",
  "'20261010130000'",
  "'checkpointContractDefinitionPresent'",
  "'checkpointCanonicalTimeHelperStableSecurityInvoker'",
  "'checkpointHistoryExclusionInstalled'",
  "'checkpointDirectPayloadReadRestricted'",
  'ravradar_ravscore_checkpoint_no_direct_read',
  'ravradar_ravscore_checkpoint_versions_no_direct_read',
  'from public, anon, authenticated;',
  'to service_role;',
  "notify pgrst, 'reload schema';",
  'commit;',
]) assert.ok(checkpointMigration.includes(marker),
  `checkpoint metadata-CAS migration is missing ${marker}`);
const measuredMissingAtReference = buildBoundedCurrentTransportMemory([
  { time: '2026-09-23T04:00:00.000Z', strength: 0.2 },
  { time: '2026-09-23T05:00:00.000Z', strength: null },
], { referenceTime: '2026-09-23T05:00:00.000Z' });
assert.equal(measuredMissingAtReference.status, 'WINDOW_HAS_MISSING_EVIDENCE');
assert.equal(measuredMissingAtReference.memoryReady, false);
assert.ok(checkpointMigration.includes(
  "when v_contains_missing then 'WINDOW_HAS_MISSING_EVIDENCE'",
));
assert.ok(!checkpointMigration.includes(
  "when jsonb_typeof(v_item -> 'strength') = 'null' then 'LATEST_SAMPLE_MISSING'",
), 'a present but null final hour must not be misclassified as an absent hour');
const noCurrentEvidence = buildCurrentSupplyMemory([], {
  referenceTime: '2026-09-23T05:00:00.000Z',
});
assert.equal(noCurrentEvidence.status, 'WINDOW_INCOMPLETE');
assert.equal(noCurrentEvidence.evidence.length, 0);
assert.ok(checkpointMigration.includes(
  "if pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') > 49",
), 'zero evidence must remain a valid, unavailable integrated continuation');
assert.ok(checkpointMigration.includes(
  "and pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') < 2)",
), 'READY integrated continuation must still have a real boundary chain');
const absentCandidateLatest = buildBoundedCurrentTransportMemory([
  { time: '2026-09-23T04:00:00.000Z', strength: 0.2 },
], { referenceTime: '2026-09-23T05:00:00.000Z' });
assert.equal(absentCandidateLatest.status, 'LATEST_SAMPLE_MISSING');
assert.equal(absentCandidateLatest.memoryReady, false);
assert.ok(checkpointMigration.includes(
  "when v_previous is distinct from v_reference then 'LATEST_SAMPLE_MISSING'",
), 'measured Candidate G continuation must distinguish an absent final row from a present null');

const privateRuntimeStorageMigration = await fs.readFile(
  'supabase/migrations/20260915020000_private_runtime_storage_deny.sql',
  'utf8',
);
for (const marker of [
  'begin;',
  'drop policy if exists ravradar_private_runtime_deny_client_read',
  'on storage.objects;',
  'create policy ravradar_private_runtime_deny_client_read',
  'on storage.objects as restrictive for select to anon, authenticated',
  "using (bucket_id <> 'ravradar-private-production-runtime');",
  'commit;',
]) assert.ok(privateRuntimeStorageMigration.includes(marker),
  `private runtime storage migration is missing ${marker}`);
assert.doesNotMatch(privateRuntimeStorageMigration,
  /\b(?:insert|update|delete|truncate)\b/i,
  'private runtime storage migration must not mutate stored runtime objects or pointers');

assert.equal(
  (checkpointMigration.match(/082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91/g)
    ?? []).length,
  1,
  'checkpoint migration must admit exactly one named predecessor implementation hash',
);
const checkpointCasInputSection = checkpointMigration.slice(
  checkpointMigration.indexOf('create or replace function public.ravradar_ravscore_checkpoint_cas('),
  checkpointMigration.indexOf('-- A separate service-role metadata RPC attests'),
);
assert.match(
  checkpointCasInputSection,
  /not public\.ravradar_ravscore_checkpoint_payload_valid\(\s*p_payload,\s*p_target_reference\s*\)/,
  'new CAS payloads must remain bound to the current validator only',
);
const checkpointPolicyReplacementPattern =
  /drop policy if exists ravradar_ravscore_checkpoint(?:_versions)?_no_direct_read\s+on public\.admin_document(?:_versions|s);/gi;
const checkpointPolicyReplacements = checkpointMigration.match(
  checkpointPolicyReplacementPattern,
) ?? [];
assert.equal(checkpointPolicyReplacements.length, 2,
  'checkpoint migration must replace exactly its two restrictive read policies');
assert.doesNotMatch(
  checkpointMigration.replace(checkpointPolicyReplacementPattern, ''),
  /\b(?:drop|truncate)\b/i,
  'checkpoint metadata-CAS migration must otherwise remain additive',
);
const checkpointReadbackMarker =
  '-- A separate service-role metadata RPC attests the additive checkpoint contract.';
const checkpointReadbackStart = checkpointMigration.indexOf(checkpointReadbackMarker);
assert.ok(checkpointReadbackStart >= 0,
  'checkpoint migration is missing the separate metadata-readback boundary');
const checkpointReadbackSql = checkpointMigration.slice(checkpointReadbackStart);
assert.doesNotMatch(checkpointReadbackSql, /\bfrom\s+public\.admin_documents\b/i,
  'cutover metadata readback must not read checkpoint payload rows');

function fullInstallationJob(text) {
  const headers = [...text.matchAll(/^  ([a-zA-Z][a-zA-Z0-9_-]*):[ \t]*\r?$/gm)];
  const selected = headers.filter(header => header[1] === 'deploy-trip-storage');
  assert.equal(selected.length, 1, 'Exactly one normal full-installation job is required');
  const index = headers.indexOf(selected[0]);
  return text.slice(selected[0].index, headers[index + 1]?.index ?? text.length);
}
for (const eol of ['\n', '\r\n']) {
  const expected = ['  deploy-trip-storage:', '    run: exact-full-install', ''].join(eol);
  const unrelated = ['  repair-existing-worker:', '    run: unrelated-repair-check', ''].join(eol);
  assert.equal(fullInstallationJob('jobs:' + eol + expected + unrelated), expected);
  assert.throws(() => fullInstallationJob('jobs:' + eol + unrelated), /Exactly one normal full-installation job/);
  assert.throws(() => fullInstallationJob('jobs:' + eol + expected + expected), /Exactly one normal full-installation job/);
}
// Every existing full-install assertion remains exact; another job cannot add
// or supply its main checks, migration commands, ordering or final publisher.
const workflow = fullInstallationJob(await fs.readFile('.github/workflows/deploy-trip-storage.yml', 'utf8'));
assert.match(workflow,
  /uses: supabase\/setup-cli@3c2f5e2ae34c34e428e8e206e2c4d21fa2d20fbf[\s\S]*?version: 2\.117\.0/,
  'backend cutover must pin the verified Supabase CLI version');
assert.ok(workflow.includes('supabase db push --linked --dry-run --skip-vault 2>&1 | tee'),
  'backend cutover must capture both Supabase dry-run output streams and exclude Vault writes');
assert.ok(workflow.includes('(supabase db push --linked --skip-vault)'),
  'backend cutover must exclude Vault writes from the exact migration apply');
const cutoverDbPushLines = workflow.split(/\r?\n/)
  .filter(line => line.includes('supabase db push --linked'));
assert.equal(cutoverDbPushLines.length, 2,
  'backend cutover must contain exactly one dry-run and one migration apply');
for (const line of cutoverDbPushLines) {
  assert.ok(line.includes('--skip-vault'),
    'every backend cutover db push must exclude unplanned Vault writes');
}
for (const marker of [
  'git rev-parse origin/main',
  'node scripts/integrated-cutover-readiness.mjs assert-source',
  'SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}',
  'node scripts/integrated-cutover-readiness.mjs prepare-workdir',
  'supabase migration list --linked',
  'supabase db push --linked --dry-run --skip-vault',
  'node scripts/integrated-cutover-readiness.mjs plan',
  'Reverify exact main immediately before the first external write',
  'supabase db push --linked --skip-vault',
  'node scripts/integrated-cutover-readiness.mjs applied',
  'node scripts/integrated-cutover-readiness.mjs verify-db',
  'supabase functions deploy --project-ref "$SUPABASE_PROJECT_ID"',
  'RAVRADAR_REQUIRE_INTEGRATED_BINDING: "true"',
  'node scripts/integrated-cutover-readiness.mjs publish',
]) assert.ok(workflow.includes(marker), `backend cutover workflow is missing ${marker}`);
const workflowOrder = [
  'npm run validate:source',
  'node scripts/integrated-cutover-readiness.mjs prepare-workdir',
  'supabase db push --linked --dry-run --skip-vault',
  'node scripts/integrated-cutover-readiness.mjs plan',
  'Reverify exact main immediately before the first external write',
  'supabase db push --linked --skip-vault)',
  'node scripts/integrated-cutover-readiness.mjs verify-db',
  'supabase functions deploy --project-ref "$SUPABASE_PROJECT_ID"',
  'node scripts/verify-trip-storage-edge.mjs',
  'node scripts/integrated-cutover-readiness.mjs publish',
];
for (let index = 1; index < workflowOrder.length; index += 1) {
  assert.ok(workflow.indexOf(workflowOrder[index - 1]) < workflow.indexOf(workflowOrder[index]),
    `backend cutover order is unsafe: ${workflowOrder[index - 1]} must precede ${workflowOrder[index]}`);
}
const cutoverSection = workflow.slice(
  workflow.indexOf('node scripts/integrated-cutover-readiness.mjs assert-source'),
  workflow.indexOf('node scripts/integrated-cutover-readiness.mjs publish')
    + 'node scripts/integrated-cutover-readiness.mjs publish'.length,
);
for (const forbidden of ['continue-on-error', 'supabase migration repair', 'supabase db reset', '--include-all']) {
  assert.equal(cutoverSection.includes(forbidden), false,
    `backend cutover pre-publish chain contains forbidden bypass: ${forbidden}`);
}
assert.equal((workflow.match(/integrated-cutover-readiness\.mjs publish/g) || []).length, 1,
  'protected readiness must have one final publisher');
assert.equal((workflow.match(/git fetch --no-tags --depth=1 origin \+refs\/heads\/main:refs\/remotes\/origin\/main/g) || []).length, 3,
  'backend cutover must verify main after checkout, before its first write and before final readiness');

const unicodeList = `
       LOCAL       │      REMOTE      │ TIME (UTC)
───────────────────┼──────────────────┼──────────────────────
 20260826          │ 20260826         │ 2026-08-26 00:00:00
 20260829010000    │ 20260829010000   │ 2026-08-29 01:00:00
 20260829020000    │ 20260829020000   │ 2026-08-29 02:00:00
 20260901010000    │ 20260901010000   │ 2026-09-01 01:00:00
 20260903010000    │                  │ 2026-09-03 01:00:00
 20260904140000    │                  │ 2026-09-04 14:00:00
 20260905090000    │                  │ 2026-09-05 09:00:00
 20260906162332    │                  │ 2026-09-06 16:23:32
 20260907084343    │                  │ 2026-09-07 08:43:43
 20260909194000    │                  │ 2026-09-09 19:40:00
 20260912122607    │                  │ 2026-09-12 12:26:07
 20260912141641    │                  │ 2026-09-12 14:16:41
 20260912194206    │                  │ 2026-09-12 19:42:06
 20260913010000    │                  │ 2026-09-13 01:00:00
 20260914010000    │                  │ 2026-09-14 01:00:00
 20260914020000    │                  │ 2026-09-14 02:00:00
 20260914234500    │                  │ 2026-09-14 23:45:00
 20260915020000    │                  │ 2026-09-15 02:00:00
 20260916120000    │                  │ 2026-09-16 12:00:00
 20260917001500    │                  │ 2026-09-17 00:15:00
 20260918125600    │                  │ 2026-09-18 12:56:00
 20260918190000    │                  │ 2026-09-18 19:00:00
 20260919010000    │                  │ 2026-09-19 01:00:00
 20260919020000    │                  │ 2026-09-19 02:00:00
 20260919231000    │                  │ 2026-09-19 23:10:00
 20260920220000    │                  │ 2026-09-20 22:00:00
 20260922100000    │                  │ 2026-09-22 10:00:00
 20260922170000    │                  │ 2026-09-22 17:00:00
 20260923052100    │                  │ 2026-09-23 05:21:00
 20260923091500    │                  │ 2026-09-23 09:15:00
 20260923100000    │                  │ 2026-09-23 10:00:00
 20260923110000    │                  │ 2026-09-23 11:00:00
 20260923120000    │                  │ 2026-09-23 12:00:00
 20260923130000    │                  │ 2026-09-23 13:00:00
 20260923140000    │                  │ 2026-09-23 14:00:00
 20260923150000    │                  │ 2026-09-23 15:00:00
 20260923160000    │                  │ 2026-09-23 16:00:00
 20260923210000    │                  │ 2026-09-23 21:00:00
 20260925150000    │                  │ 2026-09-25 15:00:00
 20260926170000    │                  │ 2026-09-26 17:00:00
 20261002080000    │                  │ 2026-10-02 08:00:00
 20261002094500    │                  │ 2026-10-02 09:45:00
 20261003080000    │                  │ 2026-10-03 08:00:00
 20261004190000    │                  │ 2026-10-04 19:00:00
 20261005000000    │                  │ 2026-10-05 00:00:00
 20261010130000    │                  │ 2026-10-10 13:00:00
 20261012200000    │                  │ 2026-10-12 20:00:00
 20261013210000    │                  │ 2026-10-13 21:00:00
 20261013220000    │                  │ 2026-10-13 22:00:00
`;
assert.deepEqual(parseSupabaseMigrationList(unicodeList), [
  { local: '20260826', remote: '20260826' },
  { local: '20260829010000', remote: '20260829010000' },
  { local: '20260829020000', remote: '20260829020000' },
  { local: '20260901010000', remote: '20260901010000' },
  { local: '20260903010000', remote: null },
  { local: '20260904140000', remote: null },
  { local: '20260905090000', remote: null },
  { local: '20260906162332', remote: null },
  { local: '20260907084343', remote: null },
  { local: '20260909194000', remote: null },
  { local: '20260912122607', remote: null },
  { local: '20260912141641', remote: null },
  { local: '20260912194206', remote: null },
  { local: '20260913010000', remote: null },
  { local: '20260914010000', remote: null },
  { local: '20260914020000', remote: null },
  { local: '20260914234500', remote: null },
  { local: '20260915020000', remote: null },
  { local: '20260916120000', remote: null },
  { local: '20260917001500', remote: null },
  { local: '20260918125600', remote: null },
  { local: '20260918190000', remote: null },
  { local: '20260919010000', remote: null },
  { local: '20260919020000', remote: null },
  { local: '20260919231000', remote: null },
  { local: '20260920220000', remote: null },
  { local: '20260922100000', remote: null },
  { local: '20260922170000', remote: null },
  { local: '20260923052100', remote: null },
  { local: '20260923091500', remote: null },
  { local: '20260923100000', remote: null },
  { local: '20260923110000', remote: null },
  { local: '20260923120000', remote: null },
  { local: '20260923130000', remote: null },
  { local: '20260923140000', remote: null },
  { local: '20260923150000', remote: null },
  { local: '20260923160000', remote: null },
  { local: '20260923210000', remote: null },
  { local: '20260925150000', remote: null },
  { local: '20260926170000', remote: null },
  { local: '20261002080000', remote: null },
  { local: '20261002094500', remote: null },
  { local: '20261003080000', remote: null },
  { local: '20261004190000', remote: null },
  { local: '20261005000000', remote: null },
  { local: '20261010130000', remote: null },
  { local: '20261012200000', remote: null },
  { local: '20261013210000', remote: null },
  { local: '20261013220000', remote: null },
]);

// Captured verbatim from backend readiness run 34333553305 with Supabase CLI 2.117.0.
const capturedFirstEightInstallList = `
   Local            | Remote | Time (UTC)
  ------------------|--------|-----------------------
   \`20260829010000\` | \` \`    | \`2026-08-29 01:00:00\`
   \`20260829020000\` | \` \`    | \`2026-08-29 02:00:00\`
   \`20260901010000\` | \` \`    | \`2026-09-01 01:00:00\`
   \`20260903010000\` | \` \`    | \`2026-09-03 01:00:00\`
   \`20260904140000\` | \` \`    | \`2026-09-04 14:00:00\`
   \`20260905090000\` | \` \`    | \`2026-09-05 09:00:00\`
   \`20260906162332\` | \` \`    | \`2026-09-06 16:23:32\`
   \`20260907084343\` | \` \`    | \`2026-09-07 08:43:43\`
`;
assert.deepEqual(parseSupabaseMigrationList(capturedFirstEightInstallList),
  REQUIRED_CUTOVER_MIGRATIONS.slice(0, 8).map(item => ({ local: item.version, remote: null })));
// Append the later binding rows and the storage-security successor while
// preserving the captured eight-row CLI fixture.
const currentFirstInstallList = `${capturedFirstEightInstallList}
   \`20260909194000\` | \` \`    | \`2026-09-09 19:40:00\`
   \`20260912122607\` | \` \`    | \`2026-09-12 12:26:07\`
   \`20260912141641\` | \` \`    | \`2026-09-12 14:16:41\`
   \`20260912194206\` | \` \`    | \`2026-09-12 19:42:06\`
   \`20260913010000\` | \` \`    | \`2026-09-13 01:00:00\`
   \`20260914010000\` | \` \`    | \`2026-09-14 01:00:00\`
   \`20260914020000\` | \` \`    | \`2026-09-14 02:00:00\`
   \`20260914234500\` | \` \`    | \`2026-09-14 23:45:00\`
   \`20260915020000\` | \` \`    | \`2026-09-15 02:00:00\`
   \`20260916120000\` | \` \`    | \`2026-09-16 12:00:00\`
   \`20260917001500\` | \` \`    | \`2026-09-17 00:15:00\`
   \`20260918125600\` | \` \`    | \`2026-09-18 12:56:00\`
   \`20260918190000\` | \` \`    | \`2026-09-18 19:00:00\`
   \`20260919010000\` | \` \`    | \`2026-09-19 01:00:00\`
   \`20260919020000\` | \` \`    | \`2026-09-19 02:00:00\`
   \`20260919231000\` | \` \`    | \`2026-09-19 23:10:00\`
   \`20260920220000\` | \` \`    | \`2026-09-20 22:00:00\`
   \`20260922100000\` | \` \`    | \`2026-09-22 10:00:00\`
   \`20260922170000\` | \` \`    | \`2026-09-22 17:00:00\`
   \`20260923052100\` | \` \`    | \`2026-09-23 05:21:00\`
   \`20260923091500\` | \` \`    | \`2026-09-23 09:15:00\`
   \`20260923100000\` | \` \`    | \`2026-09-23 10:00:00\`
   \`20260923110000\` | \` \`    | \`2026-09-23 11:00:00\`
   \`20260923120000\` | \` \`    | \`2026-09-23 12:00:00\`
   \`20260923130000\` | \` \`    | \`2026-09-23 13:00:00\`
   \`20260923140000\` | \` \`    | \`2026-09-23 14:00:00\`
   \`20260923150000\` | \` \`    | \`2026-09-23 15:00:00\`
   \`20260923160000\` | \` \`    | \`2026-09-23 16:00:00\`
   \`20260923210000\` | \` \`    | \`2026-09-23 21:00:00\`
   \`20260925150000\` | \` \`    | \`2026-09-25 15:00:00\`
   \`20260926170000\` | \` \`    | \`2026-09-26 17:00:00\`
   \`20261002080000\` | \` \`    | \`2026-10-02 08:00:00\`
   \`20261002094500\` | \` \`    | \`2026-10-02 09:45:00\`
   \`20261003080000\` | \` \`    | \`2026-10-03 08:00:00\`
   \`20261004190000\` | \` \`    | \`2026-10-04 19:00:00\`
   \`20261005000000\` | \` \`    | \`2026-10-05 00:00:00\`
   \`20261010130000\` | \` \`    | \`2026-10-10 13:00:00\`
   \`20261012200000\` | \` \`    | \`2026-10-12 20:00:00\`
   \`20261013210000\` | \` \`    | \`2026-10-13 21:00:00\`
   \`20261013220000\` | \` \`    | \`2026-10-13 22:00:00\`
`;
assert.deepEqual(parseSupabaseMigrationList(currentFirstInstallList),
  REQUIRED_CUTOVER_MIGRATIONS.map(item => ({ local: item.version, remote: null })));
assert.deepEqual(parseSupabaseMigrationList(`\u001b[36m${currentFirstInstallList}\u001b[0m`),
  REQUIRED_CUTOVER_MIGRATIONS.map(item => ({ local: item.version, remote: null })));
for (const malformed of [
  currentFirstInstallList.replace('`20260829010000`', '`20260829010000` suffix'),
  currentFirstInstallList.replace('` `    |', '`not-a-version` |'),
  currentFirstInstallList.replace('`20260829010000` | ` `', '`20260829010000` | `20260829020000`'),
  currentFirstInstallList.replace(
    '`20260829020000` | ` `',
    '`20260829010000` | ` `',
  ),
  currentFirstInstallList.replace('Local            | Remote | Time (UTC)', 'Local | Remote | Timestamp'),
]) assert.throws(() => parseSupabaseMigrationList(malformed),
  /Supabase migration-list/);

// Exact v2.117.0 strings and bullet shape from legacy-db-push-core.ts.
const currentFirstInstallDryRun = `
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Would push these migrations:
${REQUIRED_CUTOVER_MIGRATIONS.map(item => ` • \u001b[1m${item.filename}\u001b[0m`).join('\n')}
Finished supabase db push.
`;
assert.deepEqual(parseSupabaseDryRunMigrationFilenames(currentFirstInstallDryRun),
  REQUIRED_CUTOVER_MIGRATIONS.map(item => item.filename));
assert.deepEqual(parseSupabaseDryRunMigrationFilenames(`
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Remote database is up to date.
`), []);
for (const malformed of [
  REQUIRED_CUTOVER_MIGRATIONS.map(item => item.filename).join(' '),
  currentFirstInstallDryRun.replace('DRY RUN: migrations will *not* be pushed to the database.', ''),
  currentFirstInstallDryRun.replace(' • \u001b[1m20260829010000_', 'prose \u001b[1m20260829010000_'),
  currentFirstInstallDryRun.replace(
    ` • \u001b[1m${REQUIRED_CUTOVER_MIGRATIONS[1].filename}\u001b[0m`,
    ` • \u001b[1m${REQUIRED_CUTOVER_MIGRATIONS[0].filename}\u001b[0m`,
  ),
]) assert.throws(() => parseSupabaseDryRunMigrationFilenames(malformed),
  /Supabase db push --dry-run/);

// The explicit technical plan flag below is not installation authority.
// A generic caller must refuse the new pending account/assistant successor.
await assert.rejects(assertSupabaseMigrationPlan({
  migrationListText:currentFirstInstallList,dryRunText:currentFirstInstallDryRun,
}),/exact prewrite route/);
await assert.rejects(assertSupabaseMigrationPlan({
  migrationListText:currentFirstInstallList,dryRunText:currentFirstInstallDryRun,
  allowAccountAssistantPrewritePlan:'true',
}),/exact prewrite route/);
const firstInstallPlan = await assertSupabaseMigrationPlan({
    allowAccountAssistantPrewritePlan: true,
  migrationListText: currentFirstInstallList,
  dryRunText: currentFirstInstallDryRun,
});
assert.deepEqual(firstInstallPlan.pendingVersions,
  REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version));
assert.deepEqual(firstInstallPlan.alreadyAppliedVersions, []);

const plan = await assertSupabaseMigrationPlan({
    allowAccountAssistantPrewritePlan: true,
  migrationListText: unicodeList,
  dryRunText: `
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Would push these migrations:
${REQUIRED_CUTOVER_MIGRATIONS.slice(3).map(item => ` • ${item.filename}`).join('\n')}
Finished supabase db push.
`,
});
assert.deepEqual(plan.pendingVersions,
  REQUIRED_CUTOVER_MIGRATIONS.slice(3).map(item => item.version));
assert.deepEqual(plan.alreadyAppliedVersions,
  ['20260829010000', '20260829020000', '20260901010000']);

await assert.rejects(
  assertSupabaseMigrationPlan({
    allowAccountAssistantPrewritePlan: true,
    migrationListText: `${unicodeList}\n 20260823 │ │ 2026-08-23 00:00:00`,
    dryRunText: currentFirstInstallDryRun,
  }),
  /unexpected pending migrations: 20260823/,
);
await assert.rejects(
  assertSupabaseMigrationPlan({
    allowAccountAssistantPrewritePlan: true,
    migrationListText: unicodeList,
    dryRunText: `
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Remote database is up to date.
`,
  }),
  /did not propose exactly the pending required migrations/,
);
await assert.rejects(
  assertSupabaseMigrationPlan({
    allowAccountAssistantPrewritePlan: true,
    migrationListText: `
      LOCAL | REMOTE | TIME
      20260829010000 | | pending
       20260829020000 | 20260829020000 | applied
       20260901010000 | | pending
       20260903010000 | | pending
       20260904140000 | | pending
       20260905090000 | | pending
       20260906162332 | | pending
       20260907084343 | | pending
       20260909194000 | | pending
       20260912122607 | | pending
       20260912141641 | | pending
       20260912194206 | | pending
       20260913010000 | | pending
       20260914010000 | | pending
       20260914020000 | | pending
       20260914234500 | | pending
       20260915020000 | | pending
       20260916120000 | | pending
       20260917001500 | | pending
       20260918125600 | | pending
       20260918190000 | | pending
       20260919010000 | | pending
       20260919020000 | | pending
 20260919231000 | | pending
       20260920220000 | | pending
       20260922100000 | | pending
       20260922170000 | | pending
       20260923052100 | | pending
       20260923091500 | | pending
       20260923100000 | | pending
       20260923110000 | | pending
       20260923120000 | | pending
       20260923130000 | | pending
       20260923140000 | | pending
       20260923150000 | | pending
       20260923160000 | | pending
       20260923210000 | | pending
       20260925150000 | | pending
       20260926170000 | | pending
       20261002080000 | | pending
       20261002094500 | | pending
       20261003080000 | | pending
       20261004190000 | | pending
       20261005000000 | | pending
       20261010130000 | | pending
       20261012200000 | | pending
       20261013210000 | | pending
       20261013220000 | | pending
    `,
    dryRunText: currentFirstInstallDryRun,
  }),
  /migration order is inconsistent/,
);

const appliedList = `
 LOCAL | REMOTE | TIME
 20260826 | 20260826 | old
 20260829010000 | 20260829010000 | now
 20260829020000 | 20260829020000 | now
 20260901010000 | 20260901010000 | now
 20260903010000 | 20260903010000 | now
 20260904140000 | 20260904140000 | now
 20260905090000 | 20260905090000 | now
 20260906162332 | 20260906162332 | now
 20260907084343 | 20260907084343 | now
 20260909194000 | 20260909194000 | now
 20260912122607 | 20260912122607 | now
 20260912141641 | 20260912141641 | now
 20260912194206 | 20260912194206 | now
 20260913010000 | 20260913010000 | now
 20260914010000 | 20260914010000 | now
 20260914020000 | 20260914020000 | now
 20260914234500 | 20260914234500 | now
 20260915020000 | 20260915020000 | now
 20260916120000 | 20260916120000 | now
 20260917001500 | 20260917001500 | now
 20260918125600 | 20260918125600 | now
 20260918190000 | 20260918190000 | now
 20260919010000 | 20260919010000 | now
 20260919020000 | 20260919020000 | now
 20260919231000 | 20260919231000 | now
 20260920220000 | 20260920220000 | now
 20260922100000 | 20260922100000 | now
 20260922170000 | 20260922170000 | now
 20260923052100 | 20260923052100 | now
 20260923091500 | 20260923091500 | now
 20260923100000 | 20260923100000 | now
 20260923110000 | 20260923110000 | now
 20260923120000 | 20260923120000 | now
 20260923130000 | 20260923130000 | now
 20260923140000 | 20260923140000 | now
 20260923150000 | 20260923150000 | now
 20260923160000 | 20260923160000 | now
 20260923210000 | 20260923210000 | now
 20260925150000 | 20260925150000 | now
 20260926170000 | 20260926170000 | now
 20261002080000 | 20261002080000 | now
 20261002094500 | 20261002094500 | now
 20261003080000 | 20261003080000 | now
 20261004190000 | 20261004190000 | now
 20261005000000 | 20261005000000 | now
 20261010130000 | 20261010130000 | now
 20261012200000 | 20261012200000 | now
 20261013210000 | 20261013210000 | now
 20261013220000 | 20261013220000 | now
`;
assert.deepEqual(assertSupabaseMigrationsApplied(appliedList).appliedVersions,
  REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version));
const currentAppliedList = `
 Local | Remote | Time (UTC)
 ------|--------|-----------
${REQUIRED_CUTOVER_MIGRATIONS.map(item =>
    ` \`${item.version}\` | \`${item.version}\` | \`2026-09-09 10:30:00\``).join('\n')}
`;
assert.deepEqual(assertSupabaseMigrationsApplied(currentAppliedList).appliedVersions,
  REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version));
assert.throws(() => assertSupabaseMigrationsApplied(unicodeList), /was not recorded remotely/);

// Every applied prefix must resume at its exact suffix, and a retry after all
// twenty-six required migrations must be a no-op.
for (let appliedCount = 0; appliedCount <= REQUIRED_CUTOVER_MIGRATIONS.length; appliedCount += 1) {
  const appliedPrefix = REQUIRED_CUTOVER_MIGRATIONS.slice(0, appliedCount);
  const pendingSuffix = REQUIRED_CUTOVER_MIGRATIONS.slice(appliedCount);
  const prefixList = `Local | Remote | Time (UTC)\n${REQUIRED_CUTOVER_MIGRATIONS.map((item, index) =>
    `${item.version} | ${index < appliedCount ? item.version : ''} | state`).join('\n')}`;
  const suffixDryRun = `DRY RUN: migrations will *not* be pushed to the database.\n${pendingSuffix.length
    ? `Would push these migrations:\n${pendingSuffix.map(item => ` • ${item.filename}`).join('\n')}\nFinished supabase db push.`
    : 'Remote database is up to date.'}`;
  const prefixPlan = await assertSupabaseMigrationPlan({
    allowAccountAssistantPrewritePlan: true,
    migrationListText: prefixList,
    dryRunText: suffixDryRun,
  });
  assert.deepEqual(prefixPlan.alreadyAppliedVersions, appliedPrefix.map(item => item.version),
    `prefix ${appliedCount}: applied migrations must not be rerun`);
  assert.deepEqual(prefixPlan.pendingVersions, pendingSuffix.map(item => item.version),
    `prefix ${appliedCount}: only the exact remaining suffix may be applied`);
  if (appliedCount === 14) {
    await assert.rejects(assertSupabaseMigrationPlan({
    allowAccountAssistantPrewritePlan: true,
      migrationListText: prefixList,
      dryRunText: currentFirstInstallDryRun,
    }), /did not propose exactly the pending required migrations/,
      'the complete first-install plan must not replay fourteen already-applied migrations');
  }
}

const codeOnlyHelperDirectory = await fs.mkdtemp(
  path.join(os.tmpdir(), 'ravradar-code-only-plan-'),
);
try {
  const migrationListPath = path.join(codeOnlyHelperDirectory, 'migration-list.txt');
  const dryRunPath = path.join(codeOnlyHelperDirectory, 'dry-run.txt');
  await fs.writeFile(
    migrationListPath,
    `Local | Remote | Time (UTC)\n${REQUIRED_CUTOVER_MIGRATIONS.map((item, index) =>
      `${item.version} | ${index < REQUIRED_CUTOVER_MIGRATIONS.length - 1 ? item.version : ''} | state`).join('\n')}`,
  );
  await fs.writeFile(
    dryRunPath,
    `DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • ${LATEST_REQUIRED_CUTOVER_MIGRATION.filename}\nFinished supabase db push.`,
  );
  const helperEnvironment = {
    ...process.env,
    RAVRADAR_USERDATA_UPGRADE_OPT_IN: 'true',
    RAVRADAR_USERDATA_PREWRITE_REQUIRED: 'true',
    RAVRADAR_USERDATA_PREWRITE_VERIFIED: 'true',
    RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN: 'true',
    RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED: 'true',
    RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_VERIFIED: 'true',
  };
  const helperRun = spawnSync(process.execPath, [
    path.resolve('scripts/verify-code-only-migration-plan.mjs'),
    '--migration-list', migrationListPath,
    '--dry-run', dryRunPath,
    '--migrations-directory', path.resolve('supabase/migrations'),
    '--require-prewrite-gate',
    '--current-grid-prewrite-plan', '--expected-pending-version', '20261013220000',
  ], { encoding: 'utf8', env: { ...helperEnvironment,
    RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN: 'true',
    RAVRADAR_CURRENT_GRID_PREWRITE_REQUIRED: 'true',
    RAVRADAR_CURRENT_GRID_PREWRITE_VERIFIED: 'true' } });
  assert.equal(helperRun.status, 0,
    helperRun.stderr || helperRun.stdout || helperRun.error?.message);
  assert.match(
    helperRun.stdout,
    /exactly 20261013220000_current_grid_original_bound_successor.sql/,
    'the live code-only helper must admit exactly the current checkpoint bridge',
  );
  // Keep the historical account negatives on an actually pending account
  // successor, not on the distinct current-grid route.
  await fs.writeFile(migrationListPath,
    `Local | Remote | Time (UTC)\n${REQUIRED_CUTOVER_MIGRATIONS.map(item =>
      `${item.version} | ${item.version < '20261013210000' ? item.version : ''} | state`).join('\n')}`);
  await fs.writeFile(dryRunPath,
    `DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n${REQUIRED_CUTOVER_MIGRATIONS.filter(item => item.version >= '20261013210000').map(item => ` • ${item.filename}`).join('\n')}\nFinished supabase db push.`);
  const accountArgs=[
    path.resolve('scripts/verify-code-only-migration-plan.mjs'),
    '--migration-list',migrationListPath,'--dry-run',dryRunPath,
    '--migrations-directory',path.resolve('supabase/migrations'),
    '--require-prewrite-gate','--account-assistant-prewrite-plan',
    '--expected-pending-version','20261013210000',
  ];
  const accountPlanRun=(args=accountArgs,env=helperEnvironment)=>
    spawnSync(process.execPath,args,{encoding:'utf8',env});
  for(const [args,env,reason] of [
    [accountArgs.filter(x=>x!=='--account-assistant-prewrite-plan'),helperEnvironment,/exact prewrite route/],
    [accountArgs,{...helperEnvironment,RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN:'false'},/named opt-in/],
    [accountArgs,{...helperEnvironment,RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_VERIFIED:'false'},/actual same-original prewrite proof/],
    [accountArgs.map(x=>x==='20261013210000'?'20261012200000':x),helperEnvironment,/Only the fixed account/],
  ]) {
    const refused=accountPlanRun(args,env);
    assert.equal(refused.status,1);assert.equal(refused.stdout,'');assert.match(refused.stderr,reason);
  }
  const accountCombined=accountPlanRun();
  assert.equal(accountCombined.status,1);assert.equal(accountCombined.stdout,'');
  assert.match(accountCombined.stderr,/Pending plan changed or is already applied/,
    'valid old account proof cannot authorize combined account/current-grid installation');

  await fs.writeFile(migrationListPath,
    `Local | Remote | Time (UTC)\n${REQUIRED_CUTOVER_MIGRATIONS.map(item =>
      `${item.version} | ${item.version === '20261013220000' ? '' : item.version} | state`).join('\n')}`);
  await fs.writeFile(dryRunPath,
    `DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • ${LATEST_REQUIRED_CUTOVER_MIGRATION.filename}\nFinished supabase db push.`);
  const gridArgs=accountArgs.map(x=>x==='--account-assistant-prewrite-plan'
    ? '--current-grid-prewrite-plan' : x==='20261013210000' ? '20261013220000' : x);
  const gridEnvironment={...helperEnvironment,RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN:'true',
    RAVRADAR_CURRENT_GRID_PREWRITE_REQUIRED:'true',RAVRADAR_CURRENT_GRID_PREWRITE_VERIFIED:'true'};
  const gridPlanRun=(args=gridArgs,env=gridEnvironment)=>
    spawnSync(process.execPath,args,{encoding:'utf8',env});
  for(const [args,env,reason] of [
    [gridArgs.filter(x=>!['--current-grid-prewrite-plan','--expected-pending-version','20261013220000'].includes(x)),gridEnvironment,/exact prewrite route/],
    [gridArgs,{...gridEnvironment,RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN:'false'},/own named opt-in/],
    [gridArgs,{...gridEnvironment,RAVRADAR_CURRENT_GRID_PREWRITE_REQUIRED:'false'},/same-original prewrite proof/],
    [gridArgs,{...gridEnvironment,RAVRADAR_CURRENT_GRID_PREWRITE_VERIFIED:'false'},/same-original prewrite proof/],
    [gridArgs.filter(x=>x!=='--require-prewrite-gate'),gridEnvironment,/same-original prewrite proof/],
    [gridArgs.filter(x=>!['--expected-pending-version','20261013220000'].includes(x)),gridEnvironment,/Missing --expected-pending-version/],
    [gridArgs.map(x=>x==='20261013220000'?'20261013210000':x),gridEnvironment,/Only the fixed current-grid/],
    [[...gridArgs,'--account-assistant-prewrite-plan'],gridEnvironment,/routes are separate/],
    [gridArgs,helperEnvironment,/own named opt-in/],
  ]) {
    const refused=gridPlanRun(args,env);
    assert.equal(refused.status,1);assert.equal(refused.stdout,'');assert.match(refused.stderr,reason);
  }
  const gridOldRoute=accountPlanRun(accountArgs.filter(x=>!['--expected-pending-version','20261013210000'].includes(x)));
  assert.equal(gridOldRoute.status,1);assert.equal(gridOldRoute.stdout,'');
  assert.match(gridOldRoute.stderr,/exact prewrite route/,
    'fully satisfied account flags alone must never admit pending current-grid');
  await fs.writeFile(migrationListPath,currentAppliedList);
  await fs.writeFile(dryRunPath,'DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.');
  const gridNoop=gridPlanRun();
  assert.equal(gridNoop.status,1);assert.equal(gridNoop.stdout,'');
  assert.match(gridNoop.stderr,/Pending plan changed or is already applied/);
  const refusedNoop=accountPlanRun();
  assert.equal(refusedNoop.status,1);assert.equal(refusedNoop.stdout,'');
  assert.match(refusedNoop.stderr,/Pending plan changed or is already applied/);
  // Keep exercising the previous userdata opt-in refusal through the real
  // helper. The implementation successor must not permit replaying that
  // binding migration, even when its existing opt-in is supplied.
  await fs.writeFile(migrationListPath,
    `Local | Remote | Time (UTC)\n${REQUIRED_CUTOVER_MIGRATIONS.map((item, index) =>
      `${item.version} | ${index < REQUIRED_CUTOVER_MIGRATIONS.length - 4 ? item.version : ''} | state`).join('\n')}`);
  await fs.writeFile(dryRunPath,
    `DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n${REQUIRED_CUTOVER_MIGRATIONS.slice(-4).map(item => ` • ${item.filename}`).join('\n')}\nFinished supabase db push.`);
  const refusedReplay = spawnSync(process.execPath, [
    path.resolve('scripts/verify-code-only-migration-plan.mjs'),
    '--migration-list', migrationListPath, '--dry-run', dryRunPath,
    '--migrations-directory', path.resolve('supabase/migrations'),
    '--require-prewrite-gate',
    '--account-assistant-prewrite-plan',
  ], { encoding: 'utf8', env: helperEnvironment });
  assert.equal(refusedReplay.status, 1);
  assert.match(refusedReplay.stderr, /only the exact latest required integrated migration/);
  assert.equal(refusedReplay.stdout, '');
  for (const optIn of [undefined, 'false']) {
    const rejectedEnvironment = { ...helperEnvironment };
    delete rejectedEnvironment.RAVRADAR_USERDATA_UPGRADE_OPT_IN;
    if (optIn !== undefined) rejectedEnvironment.RAVRADAR_USERDATA_UPGRADE_OPT_IN = optIn;
    const rejectedRun = spawnSync(process.execPath, [
      path.resolve('scripts/verify-code-only-migration-plan.mjs'),
      '--migration-list', migrationListPath,
      '--dry-run', dryRunPath,
      '--migrations-directory', path.resolve('supabase/migrations'),
      '--require-prewrite-gate',
    '--account-assistant-prewrite-plan',
    ], { encoding: 'utf8', env: rejectedEnvironment });
    assert.equal(rejectedRun.status, 1,
      `pending userdata migration must reject ${optIn === undefined ? 'missing' : 'false'} opt-in`);
    assert.match(rejectedRun.stderr,
      /The pending userdata binding requires explicit existing-owner-export opt-in/);
    assert.equal(rejectedRun.stdout, '', 'rejected opt-in must not emit a successful migration plan');
  }
} finally {
  await fs.rm(codeOnlyHelperDirectory, { recursive: true, force: true });
}

const duplicateDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-cutover-migrations-'));
try {
  await Promise.all([
    fs.writeFile(path.join(duplicateDirectory, '20260829010000_ravscore_operational_documents_no_history.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260829010000_duplicate.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260829020000_integrated_trip_calibration_binding.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260901010000_integrated_trip_measured_warmup_admission.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260903010000_ravscore_checkpoint_metadata_cas.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260904140000_harmonie_wind_reference_binding.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260905090000_open_meteo_current_fallback_binding.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260906162332_per_pair_weather_fallback_binding.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260907084343_horizon_valid_weather_binding.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260909194000_wam_same_run_resolution_binding.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260912122607_measured_rollback_warmup_binding.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260912141641_state_only_hold_closure_v2_binding.sql'), '-- test\n'),
  ]);
  await assert.rejects(inspectMigrationSources({ migrationsDirectory: duplicateDirectory }), /duplicate Supabase migration version/);
} finally {
  await fs.rm(duplicateDirectory, { recursive: true, force: true });
}

const isolatedWorkdir = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-cutover-workdir-'));
try {
  const prepared = await prepareTemporarySupabaseCutoverWorkdir({ workdir: isolatedWorkdir });
  const exactMigrationFilenames = REQUIRED_CUTOVER_MIGRATIONS.map(item => item.filename).sort();
  assert.deepEqual((await fs.readdir(prepared.migrationsDirectory)).sort(),
    exactMigrationFilenames);
  const firstInstall = await hydrateTemporaryRemoteMigrationHistory({
    workdir: isolatedWorkdir,
    migrationListText: currentFirstInstallList,
  });
  assert.deepEqual(firstInstall.placeholders, []);
  assert.deepEqual((await fs.readdir(prepared.migrationsDirectory)).sort(),
    exactMigrationFilenames,
    'first-install history must not create a false applied-migration placeholder');
  const initialRemoteHistory = `
 LOCAL │ REMOTE │ TIME
       │ 20260823 │ historical
 20260829010000 │ │ pending
 20260829020000 │ │ pending
 20260901010000 │ │ pending
 20260903010000 │ │ pending
 20260904140000 │ │ pending
 20260905090000 │ │ pending
 20260906162332 │ │ pending
 20260907084343 │ │ pending
 20260909194000 │ │ pending
 20260912122607 │ │ pending
 20260912141641 │ │ pending
 20260912194206 │ │ pending
 20260913010000 │ │ pending
 20260914010000 │ │ pending
 20260914020000 │ │ pending
 20260914234500 │ │ pending
 20260915020000 │ │ pending
 20260916120000 │ │ pending
 20260917001500 │ │ pending
  20260918125600 │ │ pending
  20260918190000 │ │ pending
 20260919010000 │ │ pending
 20260919020000 │ │ pending
 20260919231000 │ │ pending
 20260920220000 │ │ pending
 20260922100000 │ │ pending
 20260922170000 │ │ pending
 20260923052100 │ │ pending
 20260923091500 │ │ pending
 20260923100000 │ │ pending
 20260923110000 │ │ pending
 20260923120000 │ │ pending
 20260923130000 │ │ pending
 20260923140000 │ │ pending
 20260923150000 │ │ pending
 20260923160000 │ │ pending
 20260923210000 │ │ pending
 20260925150000 │ │ pending
 20260926170000 │ │ pending
 20261002080000 │ │ pending
 20261002094500 │ │ pending
 20261003080000 │ │ pending
 20261004190000 │ │ pending
 20261005000000 │ │ pending
 20261010130000 │ │ pending
 20261012200000 │ │ pending
 20261013210000 │ │ pending
 20261013220000 │ │ pending
 `;
  const hydrated = await hydrateTemporaryRemoteMigrationHistory({
    workdir: isolatedWorkdir,
    migrationListText: initialRemoteHistory,
  });
  assert.deepEqual(hydrated.placeholders, ['20260823_remote_applied_history_placeholder.sql']);
  assert.match(await fs.readFile(path.join(prepared.migrationsDirectory, hydrated.placeholders[0]), 'utf8'),
    /contains no executable SQL/);
  await assert.rejects(hydrateTemporaryRemoteMigrationHistory({
    workdir: isolatedWorkdir,
    migrationListText: `
      LOCAL │ REMOTE │ TIME
      │ 20260830 │ future
      20260829010000 │ │ pending
      20260829020000 │ │ pending
  20260901010000 │ │ pending
  20260903010000 │ │ pending
  20260904140000 │ │ pending
  20260905090000 │ │ pending
  20260906162332 │ │ pending
  20260907084343 │ │ pending
  20260909194000 │ │ pending
  20260912122607 │ │ pending
  20260912141641 │ │ pending
  20260912194206 │ │ pending
  20260913010000 │ │ pending
 20260914010000 │ │ pending
 20260914020000 │ │ pending
 20260914234500 │ │ pending
 20260915020000 │ │ pending
 20260916120000 │ │ pending
 20260917001500 │ │ pending
 20260918125600 │ │ pending
 20260918190000 │ │ pending
 20260919010000 │ │ pending
 20260919020000 │ │ pending
 20260919231000 │ │ pending
 20260920220000 │ │ pending
 20260922100000 │ │ pending
 20260922170000 │ │ pending
 20260923052100 │ │ pending
 20260923091500 │ │ pending
 20260923100000 │ │ pending
 20260923110000 │ │ pending
 20260923120000 │ │ pending
 20260923130000 │ │ pending
 20260923140000 │ │ pending
 20260923150000 │ │ pending
 20260923160000 │ │ pending
 20260923210000 │ │ pending
 20260925150000 │ │ pending
 20260926170000 │ │ pending
 20261002080000 │ │ pending
 20261002094500 │ │ pending
 20261003080000 │ │ pending
 20261004190000 │ │ pending
 20261005000000 │ │ pending
 20261010130000 │ │ pending
 20261012200000 │ │ pending
 20261013210000 │ │ pending
 20261013220000 │ │ pending
    `,
  }), /unknown post-cutover migration 20260830/);
} finally {
  await fs.rm(isolatedWorkdir, { recursive: true, force: true });
}

const readiness = await buildIntegratedCutoverReadiness(SOURCE_HEAD, {
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
});
assert.deepEqual(Object.keys(readiness), [
  'schemaVersion',
  'sourceHead',
  'modelContractSha256',
  'modelBundleSha256',
  'publicImplementationClosureSha256',
  'migrationIds',
  'tripSchemaVersion',
  'tripBindingPolicyId',
  'tripBindingPolicySha256',
  'tripActiveAdmissionPolicyId',
  'tripActiveAdmissionPolicySha256',
  'modelBinding',
  'candidateModelBinding',
  'centralProfile',
  'assistantBinding',
]);
assert.equal(readiness.sourceHead, SOURCE_HEAD);
assert.equal(readiness.tripSchemaVersion, 3);
assert.equal(readiness.tripBindingPolicyId,
  'ravradar-trip-v3-exact-integrated-candidate-g-global-warmup-v6');
assert.match(readiness.tripBindingPolicySha256, /^[a-f0-9]{64}$/);
assert.equal(readiness.tripActiveAdmissionPolicyId,
  'ravradar-trip-v3-exact-operational-active-global-warmup-v6');
assert.match(readiness.tripActiveAdmissionPolicySha256, /^[a-f0-9]{64}$/);
assert.equal(readiness.modelContractSha256, readiness.modelBinding.modelContractSha256);
assert.equal(readiness.modelBundleSha256, readiness.modelBinding.modelBundleSha256);
assert.equal(readiness.publicImplementationClosureSha256,
  PUBLIC_IMPLEMENTATION_CLOSURE_SHA256);
assert.equal(readiness.centralProfile.modelBundleSha256, readiness.modelBinding.modelBundleSha256);
assert.equal(readiness.centralProfile.sourceVersion,
  JSON.parse(await fs.readFile('data/admin/ravscore-profile-selection.json', 'utf8')).sourceVersion);
assertSealedIntegratedCutoverReadiness(readiness);
assert.throws(() => assertSealedIntegratedCutoverReadiness({
  ...readiness,
  centralProfile: { ...readiness.centralProfile, hiddenFallback: true },
}), /exact key set/);
assert.throws(() => assertSealedIntegratedCutoverReadiness({
  ...readiness,
  modelBinding: { ...readiness.modelBinding, modelBundleSha256: '0'.repeat(64) },
}), /strictly equal|modelBundle/);
assert.equal(readiness.assistantBinding.modelContractSha256, readiness.modelContractSha256);
assert.equal(readiness.assistantBinding.modelBundleSha256, readiness.modelBundleSha256);
assert.deepEqual(readiness.migrationIds, REQUIRED_CUTOVER_MIGRATIONS.map(item => item.id));
assert.doesNotMatch(JSON.stringify(readiness), /(?:coordinate|latitude|longitude|currentU|currentV|payloadRow)/i);
await assert.rejects(buildIntegratedCutoverReadiness('short', {
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
}), /exact 40-character Git SHA/);

const expectedPolicy = await expectedTripBindingPolicy();
const expectedActiveAdmissionPolicy = await expectedTripActiveAdmissionPolicy();
const expectedCheckpointContract = await expectedCheckpointCasContract();
const {canonicalSource:accountCanonicalSource,accountSource:accountSchemaSource}=
  await readAccountAssistantCanonicalSource();
assert.ok(accountCanonicalSource.includes('7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'),
  'immutable213 canonical keeps its own historical continuation');
const {canonicalSource:currentCanonicalSource,accountSource:currentAccountSchemaSource}=
  await readCurrentGridCanonicalSource();
assert.equal(currentAccountSchemaSource,accountSchemaSource,'current-grid must not alter account schema');
assert.ok(currentCanonicalSource.includes(CHECKPOINT_CONTINUATION_HASH));

// The normal hashed readback takes exactly the new CAS body, never an expected
// hash override; the other twelve immutable function bodies stay unchanged.
const singleProjectionMigration = await fs.readFile(path.resolve(
  'supabase/migrations/20261012200000_checkpoint_cas_single_projection_successor.sql'), 'utf8');
function checkpointSqlBody(source, name) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0);
  const from = source.indexOf('as $$', start) + 'as $$'.length;
  return source.slice(from, source.indexOf('$$;', from)).replace(/\r\n?/g, '\n').trim();
}
const oldCasBody = checkpointSqlBody(checkpointMigration, 'ravradar_ravscore_checkpoint_cas');
const newCasBody = checkpointSqlBody(singleProjectionMigration, 'ravradar_ravscore_checkpoint_cas');
assert.notEqual(newCasBody, oldCasBody);
const accountCasBody=checkpointSqlBody(accountCanonicalSource,'ravradar_ravscore_checkpoint_cas');
assert.notEqual(accountCasBody,newCasBody);
const currentCasBody=checkpointSqlBody(currentCanonicalSource,'ravradar_ravscore_checkpoint_cas');
assert.notEqual(currentCasBody,accountCasBody);
assert.ok(expectedCheckpointContract.definition.includes(`-- cas-function --\n${currentCasBody}\n-- checkpoint-history-exclusion --`));
assert.ok(!expectedCheckpointContract.definition.includes(accountCasBody));
for(const family of ['ffc','249','c1ac'])for(const kind of ['state','payload']) {
  const name=`ravradar_ravscore_checkpoint_grid_${family}_${kind}_valid`;
  const body=checkpointSqlBody(currentCanonicalSource,name);
  assert.ok(expectedCheckpointContract.definition.includes(`-- grid-original-${family}-${kind}-validator --\n${body}`),
    'readback must hash the complete original-family body: '+name);
  assert.doesNotMatch(body,/RAVSCORE_CHECKPOINT_[A-Z_]+_GENERATED/,
    'frozen original validators must not use mutable current-binding markers');
}
assert.ok(!expectedCheckpointContract.definition.includes(newCasBody));
assert.ok(!expectedCheckpointContract.definition.includes(oldCasBody));
assert.equal(expectedCheckpointContract.sha256,
  createHash('sha256').update(expectedCheckpointContract.definition).digest('hex'));
assert.equal((singleProjectionMigration.match(/create or replace function /g) || []).length, 1);
assert.match(singleProjectionMigration, /set statement_timeout = '55s'/);
assert.match(singleProjectionMigration, /from public, anon, authenticated/);
assert.match(singleProjectionMigration, /to service_role/);
assert.match(newCasBody, /elsif public\.ravradar_ravscore_checkpoint_predecessor_payload_valid/);
for (const projection of ['userdata', 'water_level', 'owner_current', 'cp_close', 'top20']) {
  assert.equal((newCasBody.match(new RegExp(`public\\.ravradar_ravscore_checkpoint_${projection}_predecessor_projection\\(`, 'g')) || []).length, 1);
}
for (const unchangedName of [
  'ravradar_ravscore_checkpoint_canonical_time',
  'ravradar_ravscore_checkpoint_has_forbidden_key',
  'ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_candidate_state_valid',
  'ravradar_ravscore_checkpoint_payload_valid',
  'ravradar_ravscore_checkpoint_predecessor_payload_valid',
  'version_admin_document',
  ...['userdata', 'water_level', 'owner_current', 'cp_close', 'top20']
    .map(name => `ravradar_ravscore_checkpoint_${name}_predecessor_projection`),
]) {
  assert.ok(!singleProjectionMigration.includes('create or replace function public.'+unchangedName+'('),
    'historical200000 still replaces only CAS, not '+unchangedName);
  assert.ok(expectedCheckpointContract.definition.includes(checkpointSqlBody(currentCanonicalSource,unchangedName)));
  if(!['ravradar_ravscore_checkpoint_integrated_state_valid','ravradar_ravscore_checkpoint_payload_valid'].includes(unchangedName)) {
    assert.equal(checkpointSqlBody(currentCanonicalSource,unchangedName),checkpointSqlBody(accountCanonicalSource,unchangedName),
      'current-grid keeps the complete213 helper unchanged: '+unchangedName);
  }
  if(!['ravradar_ravscore_checkpoint_integrated_state_valid','ravradar_ravscore_checkpoint_payload_valid',
    'ravradar_ravscore_checkpoint_predecessor_payload_valid','ravradar_ravscore_checkpoint_userdata_predecessor_projection'].includes(unchangedName)) {
    assert.equal(checkpointSqlBody(accountCanonicalSource,unchangedName),checkpointSqlBody(checkpointMigration,unchangedName),
      'current successor preserves every truly unchanged old body: '+unchangedName);
  }
}
assert.equal((accountCasBody.match(/public\.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection\(/g)||[]).length,1);
for(const projection of ['userdata','water_level','owner_current','cp_close','top20']) {
  assert.equal((accountCasBody.match(new RegExp(`public\\.ravradar_ravscore_checkpoint_${projection}_predecessor_projection\\(`,'g'))||[]).length,1);
}
// Source/readback routing only: these assertions are NOT native PostgreSQL,
// equality/race/timeout or hosted publish evidence.
assert.equal(expectedPolicy.definition, expectedPolicy.definition.trim());
assert.equal(expectedActiveAdmissionPolicy.definition,
  expectedActiveAdmissionPolicy.definition.trim());
assert.equal(expectedActiveAdmissionPolicy.triggerFunctionDefinition,
  expectedActiveAdmissionPolicy.triggerFunctionDefinition.trim());
const databaseReadback = {
  schemaVersion: 'ravscore-integrated-cutover-db-v1',
  tripSchemaVersion: 3,
  appliedMigrationVersions: REQUIRED_CUTOVER_MIGRATIONS.slice(0, 3).map(item => item.version),
  tripBindingPolicy: {
    id: expectedPolicy.id,
    definition: expectedPolicy.definition,
  },
  tripActiveAdmissionPolicy: {
    id: expectedActiveAdmissionPolicy.id,
    definition: expectedActiveAdmissionPolicy.definition,
    triggerFunctionDefinition: expectedActiveAdmissionPolicy.triggerFunctionDefinition,
    triggerDefinition: 'CREATE TRIGGER ravradar_observations_active_v3_binding_trigger BEFORE INSERT OR UPDATE OF schema_version, model_version, calibration_features, calibration_eligible, actual_zone_id, actual_coastal_part_id, forecast_zone_id, forecast_coastal_part_id ON public.observations FOR EACH ROW EXECUTE FUNCTION ravradar_observation_require_active_v3_binding()',
  },
  checks: {
    schemaVersionConstraintPresent: true,
    dataQualityConstraintPresent: true,
    nestedPrivacyConstraintPresent: true,
    tripV3ConstraintPresent: true,
    tripV3ConstraintValidatedAgainstHistoricalRows: false,
    tripIdIndexPresent: true,
    bindingPolicyDefinitionPresent: true,
    bindingTruthCalledForBothModels: true,
    activeBindingAdmissionDefinitionPresent: true,
    activeBindingTriggerPresent: true,
    activeBindingTriggerCallsGateExactlyOnce: true,
    bindingGateCalledExactlyOnce: true,
    integratedModelBindingPresent: true,
    integratedProxyCeilingBindingPresent: true,
    integratedMissingCalibrationCeilingRejected: true,
    candidateGRollbackBindingPresent: true,
    unknownModelBindingRejected: true,
    exactModelBindingPresent: true,
  },
};

const checkpointDatabaseReadback = {
  schemaVersion: 'ravscore-checkpoint-db-v1',
  appliedMigrationVersion: LATEST_RAVSCORE_BINDING_MIGRATION.version,
  checkpointContract: {
    id: expectedCheckpointContract.id,
    definition: expectedCheckpointContract.definition,
  },
  checks: {
    checkpointContractDefinitionPresent: true,
    checkpointCanonicalTimeHelperStableSecurityInvoker: true,
    checkpointHistoryExclusionInstalled: true,
    checkpointDirectPayloadReadRestricted: true,
    checkpointCasSecurityDefiner: true,
    checkpointCasStatementTimeout55Seconds: true,
    checkpointCasServiceRoleExecutable: true,
    checkpointCasAnonymousExecutionRejected: true,
    checkpointValidatorExecutionRestricted: true,
    checkpointFunctionsSearchPathLocked: true,
  },
};

let rpcRequestBody = null;
let checkpointRpcCalls = 0;
await verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: async (requestUrl, options) => {
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.apikey, SERVICE_KEY);
    assert.equal(options.headers.Authorization, undefined, 'sb_secret_ keys must not be translated to bearer JWTs');
    if (requestUrl === `${URL}/rest/v1/rpc/ravradar_integrated_cutover_contract`) {
      rpcRequestBody = JSON.parse(options.body);
      return new Response(JSON.stringify(databaseReadback), { status: 200 });
    }
    assert.equal(requestUrl, `${URL}/rest/v1/rpc/ravradar_ravscore_checkpoint_contract`);
    assert.equal(options.body, '{}');
    checkpointRpcCalls += 1;
    return new Response(JSON.stringify(checkpointDatabaseReadback), { status: 200 });
  },
});
assert.equal(checkpointRpcCalls, 1);
for (const invalidTimeoutCheck of [false, null, undefined]) {
  const invalidReadback = structuredClone(checkpointDatabaseReadback);
  if (invalidTimeoutCheck === undefined) {
    delete invalidReadback.checks.checkpointCasStatementTimeout55Seconds;
  } else {
    invalidReadback.checks.checkpointCasStatementTimeout55Seconds = invalidTimeoutCheck;
  }
  await assert.rejects(verifyIntegratedDatabaseReadback({
    url: URL,
    serviceRoleKey: SERVICE_KEY,
    fetchImpl: async requestUrl => new Response(JSON.stringify(
      requestUrl.endsWith('/ravradar_integrated_cutover_contract')
        ? databaseReadback : invalidReadback,
    ), { status: 200 }),
  }), /checkpointCasStatementTimeout55Seconds|incompatible exact key set/);
}
assert.deepEqual(Object.keys(rpcRequestBody).sort(), [
  'p_best_time_policy_id',
  'p_candidate_best_time_policy_id',
  'p_candidate_component_schema_id',
  'p_candidate_explanation_schema_id',
  'p_candidate_model_bundle_sha256',
  'p_candidate_model_contract_sha256',
  'p_candidate_model_id',
  'p_candidate_presentation_policy_id',
  'p_candidate_profile_id',
  'p_candidate_ranking_policy_id',
  'p_candidate_state_schema_version',
  'p_candidate_variant_id',
  'p_component_schema_id',
  'p_explanation_schema_id',
  'p_model_bundle_sha256',
  'p_model_contract_sha256',
  'p_model_id',
  'p_presentation_policy_id',
  'p_profile_id',
  'p_ranking_policy_id',
  'p_state_schema_version',
  'p_variant_id',
]);

const expectedAssistant = await expectedAssistantBinding();
function assistantResponseHeaders({ includeBinding = true, partial = false, mismatch = false } = {}) {
  const headers = new Headers({
    'access-control-allow-origin': 'https://ravradar.dk',
  });
  if (includeBinding) {
    const values = {
      [ASSISTANT_BINDING_HEADERS.modelId]: mismatch ? 'wrong-model' : expectedAssistant.modelId,
      [ASSISTANT_BINDING_HEADERS.stateSchemaVersion]: expectedAssistant.stateSchemaVersion,
      [ASSISTANT_BINDING_HEADERS.modelContractSha256]: expectedAssistant.modelContractSha256,
      [ASSISTANT_BINDING_HEADERS.modelBundleSha256]: expectedAssistant.modelBundleSha256,
      [ASSISTANT_BINDING_HEADERS.knowledgeSchema]: expectedAssistant.knowledgeSchema,
      [ASSISTANT_BINDING_HEADERS.knowledgeSha256]: expectedAssistant.knowledgeSha256,
    };
    for (const [name, value] of Object.entries(values)) {
      if (!partial || name === ASSISTANT_BINDING_HEADERS.modelId) headers.set(name, value);
    }
    headers.set('access-control-expose-headers', Object.keys(values).join(', '));
  }
  return headers;
}

function assistantFetch({ includeBinding = true, partial = false, mismatch = false } = {}) {
  return async (_url, options) => {
    if (options.headers.origin === 'https://example.invalid') return new Response(null, { status: 403 });
    if (options.method === 'POST') {
      const supplied = JSON.parse(options.body)?.context?.modelBinding;
      const exact = supplied && JSON.stringify(supplied) === JSON.stringify(readiness.modelBinding);
      return new Response(JSON.stringify(exact
        ? { answer: 'Det spørgsmål ligger uden for RavRadar.' }
        : { error: 'MODEL_BINDING_MISMATCH' }), {
        status: exact ? 200 : 409,
        headers: assistantResponseHeaders({ includeBinding, partial, mismatch }),
      });
    }
    return new Response(null, {
      status: 204,
      headers: assistantResponseHeaders({ includeBinding, partial, mismatch }),
    });
  };
}

assert.equal((await verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch(),
})).bindingPresent, true);
assert.equal((await verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch({ includeBinding: false }),
  requireBinding: false,
})).bindingPresent, false);
await assert.rejects(verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch({ includeBinding: false }),
}), /did not return the required/);
await assert.rejects(verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch({ partial: true }),
}), /partial model\/knowledge binding/);
await assert.rejects(verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch({ mismatch: true }),
}), /header mismatch/);

function databaseReadbackFetch(
  database = databaseReadback,
  checkpointDatabase = checkpointDatabaseReadback,
) {
  return async requestUrl => {
    if (requestUrl.endsWith('/rest/v1/rpc/ravradar_integrated_cutover_contract')) {
      return new Response(JSON.stringify(database), { status: 200 });
    }
    if (requestUrl.endsWith('/rest/v1/rpc/ravradar_ravscore_checkpoint_contract')) {
      return new Response(JSON.stringify(checkpointDatabase), { status: 200 });
    }
    throw new Error(`unexpected database readback URL ${requestUrl}`);
  };
}

function fullCutoverFetch({
  existingReadiness = null,
  database = databaseReadback,
  checkpointDatabase = checkpointDatabaseReadback,
} = {}) {
  const calls = [];
  let stored = existingReadiness;
  const fetchImpl = async (requestUrl, options = {}) => {
    const method = options.method || 'GET';
    calls.push({ requestUrl, method });
    if (requestUrl.endsWith('/rest/v1/rpc/ravradar_integrated_cutover_contract')) {
      return new Response(JSON.stringify(database), { status: 200 });
    }
    if (requestUrl.endsWith('/rest/v1/rpc/ravradar_ravscore_checkpoint_contract')) {
      return new Response(JSON.stringify(checkpointDatabase), { status: 200 });
    }
    if (requestUrl.includes('/functions/v1/trip-log') || requestUrl.includes('/functions/v1/submit-observation')) {
      if (method === 'OPTIONS') {
        if (options.headers.origin === 'https://example.invalid') return new Response(null, { status: 403 });
        return new Response(null, {
          status: 204,
          headers: { 'access-control-allow-origin': 'https://ravradar.dk' },
        });
      }
      if (requestUrl.includes('/trip-log')) {
        return new Response(JSON.stringify({ error: 'LOGIN_REQUIRED' }), { status: 401 });
      }
      return new Response(JSON.stringify({ error: 'INVALID_REQUEST' }), { status: 400 });
    }
    if (requestUrl.includes(`/functions/v1/ravradar-assistant`)) {
      if (options.headers.origin === 'https://example.invalid') return new Response(null, { status: 403 });
      if (method === 'POST') {
        const supplied = JSON.parse(options.body)?.context?.modelBinding;
        const exact = supplied && JSON.stringify(supplied) === JSON.stringify(readiness.modelBinding);
        return new Response(JSON.stringify(exact
          ? { answer: 'Det spørgsmål ligger uden for RavRadar.' }
          : { error: 'MODEL_BINDING_MISMATCH' }), {
          status: exact ? 200 : 409,
          headers: assistantResponseHeaders(),
        });
      }
      return new Response(null, { status: 204, headers: assistantResponseHeaders() });
    }
    if (requestUrl.includes('/rest/v1/admin_documents')) {
      if (method === 'GET') return new Response(JSON.stringify(stored ? [{ payload: stored }] : []), { status: 200 });
      assert.equal(method, 'POST');
      const body = JSON.parse(options.body);
      assert.equal(body.document_key, 'ravscore-integrated-cutover-readiness');
      stored = body.payload;
      return new Response(JSON.stringify([{ payload: stored }]), { status: 200 });
    }
    throw new Error(`unexpected mock URL ${requestUrl}`);
  };
  return { calls, fetchImpl, get stored() { return stored; } };
}

const tripBoundaryMock = fullCutoverFetch();
await verifyTripStorageEdgeBoundaries({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: tripBoundaryMock.fetchImpl,
});
const publishMock = fullCutoverFetch();
const published = await publishIntegratedCutoverReadiness({
  sourceHead: SOURCE_HEAD,
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: publishMock.fetchImpl,
});
assert.deepEqual(published, readiness);
assert.deepEqual(publishMock.stored, readiness);
const writeIndex = publishMock.calls.findIndex(call => call.method === 'POST' && call.requestUrl.includes('/admin_documents'));
const databaseIndex = publishMock.calls.findIndex(call => call.requestUrl.includes('/rpc/'));
const tripIndex = publishMock.calls.findIndex(call => call.requestUrl.includes('/functions/v1/trip-log'));
const assistantIndex = publishMock.calls.findIndex(call => call.requestUrl.includes('/functions/v1/ravradar-assistant'));
assert.ok(databaseIndex >= 0 && tripIndex > databaseIndex && assistantIndex > tripIndex && writeIndex > assistantIndex,
  'readiness was written before every metadata/Edge gate passed');

const rejectedDatabase = structuredClone(databaseReadback);
rejectedDatabase.checks.exactModelBindingPresent = false;
const failedPublishMock = fullCutoverFetch({ database: rejectedDatabase });
await assert.rejects(publishIntegratedCutoverReadiness({
  sourceHead: SOURCE_HEAD,
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: failedPublishMock.fetchImpl,
}), /exactModelBindingPresent/);

const driftedPolicyDatabase = structuredClone(databaseReadback);
driftedPolicyDatabase.tripBindingPolicy.definition += '\nselect true;';
await assert.rejects(verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: databaseReadbackFetch(driftedPolicyDatabase),
}), /policy definition hash drifted/);

const driftedActiveAdmissionDatabase = structuredClone(databaseReadback);
driftedActiveAdmissionDatabase.tripActiveAdmissionPolicy.definition += '\nreturn true;';
await assert.rejects(verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: databaseReadbackFetch(driftedActiveAdmissionDatabase),
}), /active trip admission policy definition hash drifted/);

const reducedActiveTriggerDatabase = structuredClone(databaseReadback);
reducedActiveTriggerDatabase.tripActiveAdmissionPolicy.triggerDefinition =
  'CREATE TRIGGER ravradar_observations_active_v3_binding_trigger BEFORE INSERT OR UPDATE OF schema_version ON public.observations FOR EACH ROW EXECUTE FUNCTION ravradar_observation_require_active_v3_binding()';
await assert.rejects(verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: databaseReadbackFetch(reducedActiveTriggerDatabase),
}), /active trip admission trigger definition is incompatible/);

const driftedCheckpointDatabase = structuredClone(checkpointDatabaseReadback);
driftedCheckpointDatabase.checkpointContract.definition += '\nreturn true;';
await assert.rejects(verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: databaseReadbackFetch(databaseReadback, driftedCheckpointDatabase),
}), /checkpoint CAS contract definition hash drifted/);

const previousCheckpointDatabase = structuredClone(checkpointDatabaseReadback);
previousCheckpointDatabase.appliedMigrationVersion = '20260909194000';
await assert.rejects(verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: databaseReadbackFetch(databaseReadback, previousCheckpointDatabase),
}), /checkpoint database readback is missing its applied migration/,
'readiness must reject the old nine-migration backend before publishing the new model binding');

for (const rejectedCheck of Object.keys(checkpointDatabaseReadback.checks)) {
  const rejected = structuredClone(checkpointDatabaseReadback);
  rejected.checks[rejectedCheck] = false;
  await assert.rejects(verifyIntegratedDatabaseReadback({
    url: URL,
    serviceRoleKey: SERVICE_KEY,
    fetchImpl: databaseReadbackFetch(databaseReadback, rejected),
  }), new RegExp(rejectedCheck));
}

for (const rejectedCheck of [
  'bindingPolicyDefinitionPresent',
  'bindingTruthCalledForBothModels',
  'activeBindingAdmissionDefinitionPresent',
  'activeBindingTriggerPresent',
  'activeBindingTriggerCallsGateExactlyOnce',
  'bindingGateCalledExactlyOnce',
  'integratedModelBindingPresent',
  'candidateGRollbackBindingPresent',
  'unknownModelBindingRejected',
]) {
  const rejected = structuredClone(databaseReadback);
  rejected.checks[rejectedCheck] = false;
  await assert.rejects(verifyIntegratedDatabaseReadback({
    url: URL,
    serviceRoleKey: SERVICE_KEY,
    fetchImpl: databaseReadbackFetch(rejected),
  }), new RegExp(rejectedCheck));
}
assert.equal(failedPublishMock.calls.some(call => call.requestUrl.includes('/admin_documents')), false,
  'failed database gate touched the readiness document');

const checkMock = fullCutoverFetch({ existingReadiness: readiness });
await checkIntegratedCutoverReadiness({
  sourceHead: SOURCE_HEAD,
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: checkMock.fetchImpl,
});
assert.equal(checkMock.calls.some(call => call.method !== 'GET' && call.requestUrl.includes('/admin_documents')), false,
  'normal readiness checker wrote protected storage');
const sealedCheckMock = fullCutoverFetch({ existingReadiness: readiness });
assert.deepEqual(await checkSealedIntegratedCutoverReadiness({
  expected: readiness,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: sealedCheckMock.fetchImpl,
}), readiness);
assert.equal(sealedCheckMock.calls.some(call => call.method !== 'GET'
  && call.requestUrl.includes('/admin_documents')), false,
'sealed readiness checker must be strictly read-only');
await assert.rejects(checkIntegratedCutoverReadiness({
  sourceHead: 'b'.repeat(40),
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: checkMock.fetchImpl,
}), /does not match the exact source/);

console.log('Integrated backend cutover readiness: migration fail-closed, metadata-only DB readback, no-write Edge binding, protected exact-head marker and read-only checker are green.');

// Fixed metadata-only Management caller. Controlled transport fixtures only:
// not measured PostgreSQL types, Auth, installed RPCs, triggers or production.
const typedCatalogModule = await import('./read-typed-trip-catalog.mjs');
const typedColumnTypes = {
  schema_version:'int2',rav_score:'int2',user_id:'uuid',anonymous_id:'uuid',trip_id:'uuid',client_observation_id:'uuid',
  trip_started_at:'timestamptz',trip_ended_at:'timestamptz',observed_at:'timestamptz',submitted_at:'timestamptz',
  forecast_issued_at:'timestamptz',forecast_valid_at:'timestamptz',forecast_captured_at:'timestamptz',
  search_minutes:'int4',found:'bool',calibration_eligible:'bool',grams:'numeric',wind_speed_mps:'numeric',
  wind_direction_deg:'numeric',wave_height_m:'numeric',wave_period_s:'numeric',water_level_cm:'numeric',
  current_speed_mps:'numeric',current_direction_deg:'numeric',search_coverage:'text',hunt_mode:'text',
  result:'text',actual_zone_id:'text',actual_coastal_part_id:'text',forecast_zone_id:'text',
  forecast_coastal_part_id:'text',model_version:'text',forecast_snapshot_id:'text',
  calibration_features:'jsonb',weather_snapshot:'jsonb',data_quality_flags:'jsonb',gps:'jsonb',
};
const typedSignatures = [
  'auth.role()','auth.uid()','public.ravradar_trip_payload_has_sensitive_key(jsonb)',
  'public.ravradar_trip_v3_score_quality_allowed(text,jsonb)',
  'public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)',
  'public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)',
  'public.ravradar_trip_v3_active_binding_admitted(text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,text)',
  'public.ravradar_observation_require_active_v3_binding()',
  'public.ravradar_trip_v3_js9_projection_matches(numeric,numeric,integer)',
  'public.ravradar_trip_v3_ffc_historical_original_valid(public.observations)',
  'public.ravradar_trip_v3_ffc_historical_admitted(jsonb,uuid)',
];
const typedRows = [
  {kind:'engine',name:'server',metadata:{serverVersionNum:160001,targetCount:1,
    counts:{columns:37,constraints:0,indexes:0,triggers:0,functions:11,roles:3,memberships:0}}},
  {kind:'relation',name:'public.observations',metadata:{kind:'r',owner:'synthetic-owner-NOT-LOGGED',
    rls:true,forceRls:false,hasInheritance:false}},
  ...Object.entries(typedColumnTypes).map(([name,typeName],index)=>({kind:'column',name,metadata:{
    position:index+1,typeSchema:'pg_catalog',typeName,typeKind:'b',formattedType:typeName,typmod:-1,
    notNull:false,identity:'',generated:'',arrayDimensions:0,hasMissingValue:false,defaultBytes:null,default:null,
  }})),
  ...typedSignatures.map(name=>({kind:'function',name,metadata:{
    present:false,owner:null,kind:null,language:null,arguments:null,result:null,volatility:null,strict:null,
    securityDefiner:null,returnsSet:null,searchPath:null,otherConfiguration:false,definitionBytes:null,
    definition:null,sameNameCount:0,aclCount:0,execute:{anon:null,authenticated:null,service_role:null},acl:null,
  }})),
  ...['anon','authenticated','service_role'].map(name=>({kind:'role',name,metadata:{
    present:true,superuser:false,inherit:true,createRole:false,createDb:false,login:false,replication:false,
    bypassRls:name==='service_role',tablePrivileges:{select:true,insert:name==='service_role',
      update:false,delete:false,anyColumnSelect:true,anyColumnInsert:name==='service_role',anyColumnUpdate:false},
  }})),
];
const typedDocument = {schemaVersion:'ravradar-typed-trip-catalog-read-v1',rows:typedRows};
const typedEnvelope = [{bytes:Buffer.byteLength(JSON.stringify(typedDocument)),metadata:typedDocument}];
const typedCalls=[];
const typedReport = await typedCatalogModule.readTypedTripCatalog({
  accessToken:'synthetic-management-token-NOT-LOGGED',
  fetchImpl:async(url,init)=>{
    typedCalls.push({url,init});
    return new Response(JSON.stringify(typedEnvelope),{status:201});
  },
});
assert.equal(typedCalls.length,1);
assert.equal(typedCalls[0].url,'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');
assert.equal(typedCalls[0].init.method,'POST');
assert.equal(typedCalls[0].init.redirect,'error');
assert.equal(JSON.parse(typedCalls[0].init.body).read_only,true);
assert.deepEqual(Object.keys(JSON.parse(typedCalls[0].init.body)).sort(),['query','read_only']);
assert.equal(typedReport.status,'READ_REVIEW_REQUIRED');
assert.equal(typedReport.columns.length,37);
assert.equal(typedReport.fullTypedRpcTriggerCheckProved,false);
assert.equal(typedReport.completeOldOrNewCheckSourceMatch,false);
assert.equal(typedReport.authRoleUidSourceMatch,false);
assert.doesNotMatch(JSON.stringify(typedReport),/synthetic-owner|management-token|definition|memberRole|grantedRole/);
for(const [response,code] of [
  [new Response('PRIVATE-BODY-MUST-NOT-LEAK',{status:503}),'CATALOG_HTTP_STATUS'],
  [new Response(JSON.stringify({unexpected:typedEnvelope}),{status:201}),'CATALOG_ENVELOPE'],
  [new Response(new Uint8Array(262145),{status:201}),'CATALOG_BODY_BOUND'],
]) {
  let attempts=0;
  await assert.rejects(typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
    fetchImpl:async()=>{attempts++;return response;}}),new RegExp(code));
  assert.equal(attempts,1,'fixed catalog read must not retry any refusal');
}
let typedUnexpectedCalls=0;
await assert.rejects(typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
  query:'select anything',fetchImpl:async()=>{typedUnexpectedCalls++;}}),/CATALOG_ARGUMENTS/);
assert.equal(typedUnexpectedCalls,0,'caller must reject free query options before any network');
const typedDomainEnvelope=structuredClone(typedEnvelope);
typedDomainEnvelope[0].metadata.rows.find(row=>row.kind==='column').metadata.typeKind='d';
const typedDomainReport=await typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
  fetchImpl:async()=>new Response(JSON.stringify(typedDomainEnvelope),{status:201})});
assert.ok(typedDomainReport.refusalCodes.includes('UNREVIEWED_TYPE'));
assert.equal(typedDomainReport.fullTypedRpcTriggerCheckProved,false);
const typedDuplicateEnvelope=structuredClone(typedEnvelope);
typedDuplicateEnvelope[0].metadata.rows.push(typedDuplicateEnvelope[0].metadata.rows[0]);
await assert.rejects(typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
  fetchImpl:async()=>new Response(JSON.stringify(typedDuplicateEnvelope),{status:201})}),/CATALOG_DUPLICATE/);
const typedOverflowEnvelope=structuredClone(typedEnvelope);
typedOverflowEnvelope[0].bytes=196609;
await assert.rejects(typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
  fetchImpl:async()=>new Response(JSON.stringify(typedOverflowEnvelope),{status:201})}),/CATALOG_DOCUMENT_BOUND/);

const typedOptionalSourceUrls = new Set([
  new globalThis.URL('../supabase/migrations/20261012000000_current_grid_original_bound_successor.sql',import.meta.url).href,
  new globalThis.URL('../supabase/migrations/20261012010000_owner_ffc_historical_trip_intake.sql',import.meta.url).href,
]);
const typedSourceRead = fs.readFile;
try {
  let missingReads = 0, missingFetches = 0;
  fs.readFile = async(input,...args) => {
    if(input instanceof globalThis.URL && typedOptionalSourceUrls.has(input.href)) {
      missingReads++;
      throw Object.assign(new Error('synthetic missing reviewed successor'),{code:'ENOENT'});
    }
    return typedSourceRead(input,...args);
  };
  const missingReport=await typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
    fetchImpl:async()=>{missingFetches++;return new Response(JSON.stringify(typedEnvelope),{status:201});}});
  assert.equal(missingReads,2,'only the two fixed successor oracles may be absent');
  assert.equal(missingFetches,1,'missing successor review evidence must not prevent the fixed SELECT');
  assert.ok(missingReport.refusalCodes.includes('REVIEWED_SUCCESSOR_SOURCE_MISSING'));
  assert.equal(missingReport.status,'READ_REVIEW_REQUIRED');
  assert.equal(missingReport.fullTypedRpcTriggerCheckProved,false);
  for(const signature of typedSignatures.slice(8)) {
    assert.equal(missingReport.functions.find(row=>row.signature===signature).bodySignatureConfigurationMatch,false,
      'absent successor SOURCE must never attest its function body');
  }
  let deniedFetches=0;
  fs.readFile = async(input,...args) => {
    if(input instanceof globalThis.URL && typedOptionalSourceUrls.has(input.href))
      throw Object.assign(new Error('synthetic successor permission denial'),{code:'EACCES'});
    return typedSourceRead(input,...args);
  };
  await assert.rejects(typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
    fetchImpl:async()=>{deniedFetches++;throw Error('not called');}}),
    error=>error.code==='EACCES');
  assert.equal(deniedFetches,0,'non-ENOENT successor errors remain hard before transport');
} finally { fs.readFile=typedSourceRead; }

const typedBaseSql=(await fs.readFile('supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql','utf8')).replace(/\r\n?/g,'\n');
const typedBaseMarker='create or replace function public.ravradar_trip_payload_has_sensitive_key(';
const typedBaseAt=typedBaseSql.indexOf(typedBaseMarker);
const typedBaseEnd=typedBaseSql.indexOf('\n$$;',typedBaseAt);
assert.ok(typedBaseAt>=0 && typedBaseEnd>typedBaseAt,'positive oracle must be the actual existing BASE SOURCE');
const typedBaseDefinition=typedBaseSql.slice(typedBaseAt,typedBaseEnd+4);
const typedBaseArguments=typedBaseDefinition.slice(typedBaseMarker.length,
  typedBaseDefinition.indexOf(')\nreturns')).replace(/\s+/g,' ').trim();
const typedBaseEnvelope=structuredClone(typedEnvelope);
Object.assign(typedBaseEnvelope[0].metadata.rows.find(row=>row.name===typedSignatures[2]).metadata,{
  present:true,owner:'synthetic-owner-NOT-LOGGED',kind:'f',language:'plpgsql',arguments:typedBaseArguments,
  result:'boolean',volatility:'i',strict:true,securityDefiner:false,returnsSet:false,
  searchPath:'search_path=public',otherConfiguration:false,
  definition:typedBaseDefinition,definitionBytes:Buffer.byteLength(typedBaseDefinition),sameNameCount:1,
});
typedBaseEnvelope[0].bytes=Buffer.byteLength(JSON.stringify(typedBaseEnvelope[0].metadata));
const typedBaseRead=async envelope=>typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
  fetchImpl:async()=>new Response(JSON.stringify(envelope),{status:201})});
const typedBaseReport=await typedBaseRead(typedBaseEnvelope);
assert.equal(typedBaseReport.functions.find(row=>row.signature===typedSignatures[2]).bodySignatureConfigurationMatch,true,
  'complete actual BASE SOURCE body/signature/configuration must match, not parser marker counts');
assert.equal(typedBaseReport.fullTypedRpcTriggerCheckProved,false);
for(const [field,value] of [['present',false],['sameNameCount',2],['result','integer'],['arguments','wrong_name jsonb'],
  ['searchPath','search_path=pg_catalog, public'],['strict',false]]) {
  const changed=structuredClone(typedBaseEnvelope);
  changed[0].metadata.rows.find(row=>row.name===typedSignatures[2]).metadata[field]=value;
  const changedReport=await typedBaseRead(changed);
  assert.equal(changedReport.functions.find(row=>row.signature===typedSignatures[2]).bodySignatureConfigurationMatch,false,
    'source body alone cannot approve altered signature/type/configuration: '+field);
}

// PostgreSQL's pg_get_functiondef closes the matching dollar tag with newline,
// not a SQL-input semicolon. Keep the prior semicoloned SOURCE positive above.
const typedPgNoSemicolonDefinition=typedBaseDefinition
  .replace(/\bas \$\$/i,()=> 'AS $function$')
  .replace(/\n\$\$;$/,()=> '\n$function$\n');
assert.ok(typedPgNoSemicolonDefinition.endsWith('$function$\n'),
  'normal native-style fixture must omit only the terminal SQL-input semicolon');
const typedPgEnvelope=fields=>{
  const envelope=structuredClone(typedBaseEnvelope);
  const row=envelope[0].metadata.rows.find(item=>item.name===typedSignatures[2]);
  Object.assign(row.metadata,{definition:typedPgNoSemicolonDefinition},fields);
  row.metadata.definitionBytes=Buffer.byteLength(row.metadata.definition);
  envelope[0].bytes=Buffer.byteLength(JSON.stringify(envelope[0].metadata));
  return envelope;
};
const typedPgReport=await typedBaseRead(typedPgEnvelope({}));
assert.equal(typedPgReport.functions.find(row=>row.signature===typedSignatures[2]).bodySignatureConfigurationMatch,true,
  'same actual reviewed SOURCE body with matching native dollar tag and no terminal semicolon must match');
assert.equal(typedPgReport.status,'READ_REVIEW_REQUIRED');
assert.equal(typedPgReport.completeOldOrNewCheckSourceMatch,false);
assert.equal(typedPgReport.authRoleUidSourceMatch,false);
assert.equal(typedPgReport.wholeTriggerSourceMatch,false);
assert.equal(typedPgReport.fullTypedRpcTriggerCheckProved,false);
for(const [label,fields] of [
  ['changed-body',{definition:typedPgNoSemicolonDefinition.replace('return false;',()=> 'return true;')}],
  ['trailing-ddl',{definition:typedPgNoSemicolonDefinition+
    'ALTER FUNCTION public.ravradar_trip_payload_has_sensitive_key(jsonb) RESET ALL;\n'}],
  ['mismatched-tag',{definition:typedPgNoSemicolonDefinition.replace(/\$function\$\n$/,()=> '$different$\n')}],
  ['not-present',{present:false}],
  ['overloaded',{sameNameCount:2}],
  ['unreviewed-configuration',{searchPath:'search_path=pg_catalog, public'}],
]) {
  const report=await typedBaseRead(typedPgEnvelope(fields));
  assert.equal(report.functions.find(row=>row.signature===typedSignatures[2]).bodySignatureConfigurationMatch,false,
    'optional terminal semicolon must not approve '+label);
  assert.equal(report.status,'READ_REVIEW_REQUIRED');
  assert.equal(report.fullTypedRpcTriggerCheckProved,false);
}

let typedHeldController;
const typedHeldBody=new Response(new ReadableStream({start(controller){typedHeldController=controller;}}),{status:201});
let typedDeadlineAttempts=0;
await assert.rejects(typedCatalogModule.readTypedTripCatalog({accessToken:'synthetic',
  fetchImpl:async(_url,init)=>{typedDeadlineAttempts++;
    init.signal.addEventListener('abort',()=>typedHeldController.error(new Error('synthetic transport abort')),{once:true});
    return typedHeldBody;}}),/CATALOG_REQUEST_DEADLINE/);
assert.equal(typedDeadlineAttempts,1,'actual fixed 15s stream deadline must not retry');
console.log('Fixed typed-catalog caller: one pinned metadata read, bounded private projection and real client-deadline refusal; no database execution.');


// Fixed historical rate-log reader, controlled normal transport only.
// Each fresh module is a synthetic testcase, never authority for a live repeat.
assert.equal(Object.hasOwn(process.env,'SUPABASE_ACCESS_TOKEN'),false,
  'offline rate fixtures must not capture or replace an ambient Management token');
const fixedRatePriorFetch=globalThis.fetch;
process.env.SUPABASE_ACCESS_TOKEN='synthetic-rate-token-NOT-LOGGED';
try {
  const rateFixtures=[
    ['pg-fallback-categories',()=>new Response(JSON.stringify({result:[
      {status:null,error_code:'NOT_RECORDED'},
      {status:null,error_code:'UNRECOGNIZED_CODE'},
    ],error:null}),{status:200}),'RECORDED_CATEGORIES',2],
    ['pg-gateway-code-refused',()=>new Response(JSON.stringify({result:[
      {status:null,error_code:'UNAUTHORIZED_MISSING_API_KEY'},
    ],error:null}),{status:200}),'LOG_SCHEMA_UNAVAILABLE',null],
    ['categories',()=>new Response(JSON.stringify({result:[
      {status:401,error_code:'UNAUTHORIZED_MISSING_API_KEY'},
      {status:null,error_code:'42501'},
    ],error:null}),{status:200}),'RECORDED_CATEGORIES',2],
    ['empty',()=>new Response(JSON.stringify({result:[],error:null}),{status:200}),
      'NO_MATCHING_RECORDED_EVENTS',0],
    ['http',()=>new Response('PRIVATE-LOG-BODY-NOT-LOGGED',{status:503}),'LOG_HTTP_REJECTED',null],
    ['envelope',()=>new Response(JSON.stringify({data:[],error:null}),{status:200}),
      'LOG_SCHEMA_UNAVAILABLE',null],
    ['oversize',()=>new Response(new Uint8Array(32769),{status:200}),'LOG_BODY_TOO_LARGE',null],
    ['row-cap',()=>new Response(JSON.stringify({result:Array(8).fill(
      {status:null,error_code:'42501'}),error:null}),{status:200}),'LOG_ROW_CAP_REACHED',null],
    ['unknown-code',()=>new Response(JSON.stringify({result:[
      {status:null,error_code:'PRIVATE-NOT-ALLOWLISTED'},
    ],error:null}),{status:200}),'LOG_SCHEMA_UNAVAILABLE',null],
    ['missing-fields',()=>new Response(JSON.stringify({result:[
      {status:null,error_code:'LOG_FIELDS_UNAVAILABLE'},
    ],error:null}),{status:200}),'LOG_FIELDS_UNAVAILABLE',null],
    ['held-stream',()=>new Response(new ReadableStream({start(){}}),{status:200}),
      'LOG_DEADLINE_EXCEEDED',null],
  ];
  for(const [label,response,status,rowCount] of rateFixtures) {
    const module=await import('./read-fixed-public-rate-log-20261012.mjs?offline_fixed_case='+label);
    let requests=0;
    globalThis.fetch=async(url,init)=>{
      requests++;
      assert.equal(url.origin,'https://api.supabase.com');
      assert.equal(url.pathname,'/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
      assert.deepEqual([...url.searchParams.keys()].sort(),['iso_timestamp_end','iso_timestamp_start','sql']);
      assert.equal(url.searchParams.get('iso_timestamp_start'),'2026-10-12T03:45:00Z');
      assert.equal(url.searchParams.get('iso_timestamp_end'),'2026-10-12T03:46:00Z');
      assert.match(url.searchParams.get('sql'),/timestamp >= '2026-10-12 03:45:11'/);
      assert.match(url.searchParams.get('sql'),/timestamp < '2026-10-12 03:45:13'/);
      assert.equal(init.method,'GET'); assert.equal(init.body,undefined);
      assert.equal(init.redirect,'error'); assert.equal(init.cache,'no-store');
      assert.equal(init.credentials,'omit');
      return response();
    };
    const report=await module.readFixedPublicRateLog20261012();
    assert.equal(report.requestStatus,status,label);
    assert.equal(report.rowCount,rowCount,label);
    if(label==='pg-fallback-categories') assert.deepEqual(report.pairs,[
      {status:null,error_code:'NOT_RECORDED'},
      {status:null,error_code:'UNRECOGNIZED_CODE'},
    ],'admit only the exact already-query-generated PostgreSQL fallback categories');
    assert.equal(report.privatePayloadLogged,false);
    assert.equal(report.scope.sqlStart,'2026-10-12T03:45:11Z');
    assert.equal(report.scope.sqlEndExclusive,'2026-10-12T03:45:13Z');
    if(rowCount===null) assert.equal(report.pairs,null,'refusal must not expose partial rows');
    assert.doesNotMatch(JSON.stringify(report),/PRIVATE-|synthetic-rate-token|Bearer/);
    assert.equal(requests,1,'each controlled ordinary call must use one GET with no retry');
    assert.equal((await module.readFixedPublicRateLog20261012()).requestStatus,'LOG_READ_ALREADY_CONSUMED');
    assert.equal(requests,1,'one-shot state must refuse a second call before transport');
  }
  const argumentModule=await import('./read-fixed-public-rate-log-20261012.mjs?offline_fixed_case=argument');
  let argumentRequests=0;globalThis.fetch=async()=>{argumentRequests++;throw Error('not called');};
  assert.equal((await argumentModule.readFixedPublicRateLog20261012({sql:'not allowed'})).requestStatus,
    'LOG_ARGUMENTS_FORBIDDEN');
  assert.equal(argumentRequests,0);
} finally {
  globalThis.fetch=fixedRatePriorFetch;delete process.env.SUPABASE_ACCESS_TOKEN;
}
console.log('Fixed rate-log normal caller fixtures: exact historical GET, strict bounded results and one-shot/deadline refusals; no account log read.');
const typedWorkflowSource=(await fs.readFile('.github/workflows/deploy-trip-storage.yml','utf8')).replace(/\r\n/g,'\n');
const typedReadJob=typedWorkflowSource.slice(typedWorkflowSource.indexOf('  read-fixed-supabase-metadata:'),
  typedWorkflowSource.indexOf('  reject-unknown-operation:'));
assert.ok(typedReadJob.includes("inputs.operation == 'typed-trip-catalog-read'"));
assert.ok(typedReadJob.includes("inputs.operation == 'fixed-public-rate-log-read'"));
assert.ok(typedReadJob.includes('test "$GITHUB_RUN_ATTEMPT" = 1'));
assert.ok(typedReadJob.includes('test "$GITHUB_REF" = refs/heads/main'));
assert.ok(typedReadJob.indexOf('test "$GITHUB_REPOSITORY" = jakobjorgensen82-commits/RavRadar') <
  typedReadJob.indexOf('uses: actions/checkout@v7'),'fixed repository must be checked before checkout/GitHub reads');
assert.ok(typedReadJob.includes('node scripts/weather-source-gate.mjs check'));
assert.ok(typedReadJob.includes('steps.fixed_read_source.outputs.required'));
assert.ok(typedReadJob.includes('node scripts/check-fixed-supabase-account-read-idle.mjs'));
assert.ok(typedReadJob.indexOf('Require genuinely fresh idle main') <
  typedReadJob.indexOf('node scripts/read-typed-trip-catalog.mjs'));
assert.doesNotMatch(typedReadJob,/supabase db push|apply-candidate-g|functions deploy|wrangler|upload-artifact|cache\/save|SUPABASE_DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY/);
// Preserve both old fixed routes exactly; admit only the one reviewed third step.
const typedCatalogReadStep="      - name: Read the one fixed typed trip catalog\n        if: inputs.operation == 'typed-trip-catalog-read'\n        timeout-minutes: 1\n        run: node scripts/read-typed-trip-catalog.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n";
const typed12OctReadStep="      - name: Read the one fixed public rate-log interval\n        if: inputs.operation == 'fixed-public-rate-log-read'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-public-rate-log-20261012.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n";
const typed13OctReadStep="      - name: Read the one fixed 13 October public rate-log interval\n        if: inputs.operation == 'fixed-public-rate-log-read-20261013'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-public-rate-log-20261013.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n";
for(const step of [typedCatalogReadStep,typed12OctReadStep,typed13OctReadStep]) {
  assert.equal(typedReadJob.split(step).length,2,'each exact fixed read step must occur once');
}
assert.ok(typedReadJob.endsWith(typedCatalogReadStep+typed12OctReadStep+typed13OctReadStep),
  'the two unchanged historical readers must precede the reviewed 13 October reader');
const typedLegacyReadJob=typedReadJob.replace(typed13OctReadStep,'');
assert.equal((typedLegacyReadJob.match(/SUPABASE_ACCESS_TOKEN:/g)||[]).length,2,
  'remove only the exact new read step before proving the unchanged old two-token contract');

// Actual fixed reader idle guard with controlled metadata transport only.
// No account read, GitHub request, watchdog change or new runtime executor.
const fixedIdleModule=await import('./check-fixed-supabase-account-read-idle.mjs');
const fixedIdleOwn=123456789;
const fixedIdleLegacy=[
  [34868901509,'2026-09-14T16:29:10Z','c4930944a6273c00f201994504e3971ad3f2b165'],
  [34613079069,'2026-09-11T14:55:55Z','5587001b45ffea056addaf6cd20084719540336a'],
  [34228112413,'2026-09-08T12:47:45Z','b814b525962514a368536f456477881390d6b333'],
].map(([id,at,sha])=>({id,head_branch:'main',path:'.github/workflows/update-and-deploy.yml',
  status:'queued',conclusion:null,run_attempt:1,event:'workflow_dispatch',
  head_sha:sha,created_at:at,updated_at:at}));
function fixedIdleFixture({queued=fixedIdleLegacy,total=queued.length,jobs={total_count:0,jobs:[]},
  active=[{id:fixedIdleOwn,status:'in_progress',head_branch:'main'}],otherStatus=null}={}) {
  const calls=[];
  const options={repository:'jakobjorgensen82-commits/RavRadar',runId:fixedIdleOwn,
    githubToken:'synthetic-idle-token-NOT-LOGGED',fetchImpl:async(input,init)=>{
      const url=new globalThis.URL(input);calls.push(url.pathname+url.search);
      assert.equal(url.origin,'https://api.github.com');
      assert.equal(init.method,'GET');assert.equal(init.body,undefined);
      assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.credentials,'omit');
      assert.equal(init.headers.authorization,'Bearer synthetic-idle-token-NOT-LOGGED');
      let document;
      if(url.pathname==='/repos/jakobjorgensen82-commits/RavRadar/actions/runs') {
        assert.equal(url.searchParams.get('branch'),'main');
        const status=url.searchParams.get('status');
        assert.ok(['in_progress','queued','waiting','pending','requested'].includes(status));
        assert.equal(url.searchParams.get('per_page'),status==='queued'?'100':'1');
        document=status==='queued'?{total_count:total,workflow_runs:queued}
          :status==='in_progress'?{total_count:active.length,workflow_runs:active}
          :otherStatus===status?{total_count:1,workflow_runs:[{id:999}]}
          :{total_count:0,workflow_runs:[]};
      } else {
        assert.ok(fixedIdleLegacy.some(run=>url.pathname===
          '/repos/jakobjorgensen82-commits/RavRadar/actions/runs/'+run.id+'/attempts/1/jobs'));
        assert.equal(url.search,'?per_page=1');document=jobs;
      }
      return new Response(JSON.stringify(document),{status:200});
    }};
  return {calls,options,invoke:()=>fixedIdleModule.checkFixedSupabaseAccountReadIdle(options)};
}
const fixedIdlePositive=fixedIdleFixture();
assert.deepEqual(await fixedIdlePositive.invoke(),{schemaVersion:1,status:'FIXED_READ_MAIN_IDLE',
  requests:8,inertQueuedRuns:3,emptyJobInventories:3,atomicWriterLease:false});
assert.equal(fixedIdlePositive.calls.length,8);
assert.equal(fixedIdlePositive.calls.filter(route=>route.includes('/attempts/1/jobs')).length,3);
const fixedIdleEmpty=fixedIdleFixture({queued:[]});
assert.equal((await fixedIdleEmpty.invoke()).requests,5);
for(let index=0;index<3;index++)for(const changed of [
  {id:fixedIdleLegacy[index].id+1},{head_sha:'a'.repeat(40)},{head_branch:'feature'},
  {path:'.github/workflows/run-current-weather-once.yml'},{run_attempt:2},{event:'schedule'},
  {status:'in_progress'},{conclusion:'failure'},
  {created_at:'2026-09-01T00:00:00Z'},{updated_at:'2026-10-12T00:00:00Z'},
]) {
  const queued=structuredClone(fixedIdleLegacy);Object.assign(queued[index],changed);
  const fixture=fixedIdleFixture({queued});
  await assert.rejects(fixture.invoke(),/FIXED_READ_MAIN_NOT_IDLE/);
  assert.equal(fixture.calls.some(route=>route.includes('/jobs')),false,
    'validate every exact legacy identity before any jobs read');
}
for(const settings of [
  {queued:fixedIdleLegacy.slice(0,2),total:3},
  {queued:[...fixedIdleLegacy,{id:777}],total:4},
  {queued:[fixedIdleLegacy[0],fixedIdleLegacy[0],fixedIdleLegacy[2]]},
  {active:[{id:fixedIdleOwn,status:'in_progress',head_branch:'main'},{id:987}]},
  {otherStatus:'waiting'},{otherStatus:'pending'},{otherStatus:'requested'},
])await assert.rejects(fixedIdleFixture(settings).invoke(),/FIXED_READ_(INVENTORY_INCOMPLETE|MAIN_NOT_IDLE)/);
for(const jobs of [{total_count:1,jobs:[{id:1}]},{total_count:0,jobs:[{id:1}]},{jobs:[]}])
  await assert.rejects(fixedIdleFixture({jobs}).invoke(),/FIXED_READ_LEGACY_JOBS_NOT_EMPTY/);
let fixedIdleForbiddenCalls=0;
await assert.rejects(fixedIdleModule.checkFixedSupabaseAccountReadIdle({
  repository:'other/RavRadar',runId:fixedIdleOwn,githubToken:'synthetic',
  fetchImpl:async()=>{fixedIdleForbiddenCalls++;},
}),/FIXED_READ_GITHUB_SCOPE/);
assert.equal(fixedIdleForbiddenCalls,0);
for(const response of [
  new Response('PRIVATE-GITHUB-BODY-NOT-LOGGED',{status:403}),
  new Response(new Uint8Array(65537),{status:200}),
]) {
  let calls=0;
  await assert.rejects(fixedIdleModule.checkFixedSupabaseAccountReadIdle({
    repository:'jakobjorgensen82-commits/RavRadar',runId:fixedIdleOwn,githubToken:'synthetic',
    fetchImpl:async()=>{calls++;return response;},
  }),/FIXED_READ_IDLE_(UNAVAILABLE|BOUND)/);
  assert.equal(calls,1,'fixed guard never retries transport or inventory refusals');
}
let fixedIdleDeadlineCalls=0;
await assert.rejects(fixedIdleModule.checkFixedSupabaseAccountReadIdle({
  repository:'jakobjorgensen82-commits/RavRadar',runId:fixedIdleOwn,githubToken:'synthetic',
  fetchImpl:async()=>{fixedIdleDeadlineCalls++;return new Response(new ReadableStream({start(){}}),{status:200});},
}),/FIXED_READ_IDLE_DEADLINE/);
assert.equal(fixedIdleDeadlineCalls,1,'same real five-second request/body deadline, no retry');
const fixedIdleSource=await fs.readFile('scripts/check-fixed-supabase-account-read-idle.mjs','utf8');
const cadenceSource=await fs.readFile('scripts/check-weather-cadence-watchdog.mjs','utf8');
for(const [id,at,sha] of [
  [34868901509,'2026-09-14T16:29:10Z','c4930944a6273c00f201994504e3971ad3f2b165'],
  [34613079069,'2026-09-11T14:55:55Z','5587001b45ffea056addaf6cd20084719540336a'],
  [34228112413,'2026-09-08T12:47:45Z','b814b525962514a368536f456477881390d6b333'],
])for(const value of [String(id),at,sha]) {
  assert.ok(fixedIdleSource.includes(value)&&cadenceSource.includes(value),'same precise existing history, not a blanket queue rule');
}
console.log('Fixed account-reader idle guard: exact historical queues plus fresh empty attempt-1 jobs, complete bounded inventories and real five-second body deadline; controlled input only.');

// New fixed account metadata reader: controlled transport, not native/hosted
// evidence. Native branch executes this SAME query against actual catalog.
const accountNames=['record_account_activity','get_own_statistics_preference',
  'enable_own_statistics_preference','disable_own_statistics_preference'];
const accountTable=(activity)=>({
  present:true,regular:true,rls:true,forceRls:false,inheritance:false,
  columns:(activity?[['user_id','uuid'],['first_observed_at','timestamptz'],['last_activity_at','timestamptz']]
    :[['user_id','uuid'],['enabled','bool']]).map(([name,type],index)=>({
      name,position:index+1,type,builtin:true,notNull:true,default:false,identity:'',generated:'',dimensions:0,
    })),
  droppedColumns:0,constraintCount:activity?3:2,primaryKey:1,profilesCascade:1,
  activityOrder:activity?1:0,policyCount:0,userTriggerCount:0,unexpectedAcl:false,
  anonAccess:false,authenticatedAccess:false,
});
const accountMetadata={schemaVersion:1,tables:{
  account_activity_journal:accountTable(true),account_statistics_preferences:accountTable(false),
},functions:Object.fromEntries(accountNames.map(name=>{
  const head=accountSchemaSource.indexOf('create function public.'+name+'()');
  const start=accountSchemaSource.indexOf('as $$',head)+5,end=accountSchemaSource.indexOf('\n$$;',start);
  assert.ok(head>=0 && end>start);
  return[name,{present:true,sameNameCount:1,kind:'f',language:'plpgsql',result:'jsonb',arguments:'',
    variadic:false,strict:false,returnsSet:false,definer:true,volatility:'v',configuration:['search_path=""'],
    bodySha256:createHash('sha256').update(accountSchemaSource.slice(start,end).trim()).digest('hex'),
    publicExecute:false,unexpectedAcl:false,anonExecute:false,authenticatedExecute:true,serviceExecute:false}];
}))};
const accountExpected={schemaVersion:1,status:'ACCOUNT_ASSISTANT_SCHEMA_MATCH',scope:'FIXED_METADATA_ONLY',
  tables:2,rpcs:4,rls:true,directClientTableAccess:false,serviceRpcExecuteCount:0,
  accountRowsRead:false,statisticalProcessingProved:false,hostedOwnerFlowProved:false};
assert.deepEqual(await verifyAccountAssistantCatalogMetadata(accountMetadata),accountExpected);
const accountDefaultService=structuredClone(accountMetadata);
for(const name of accountNames)accountDefaultService.functions[name].serviceExecute=true;
assert.deepEqual(await verifyAccountAssistantCatalogMetadata(accountDefaultService),
  {...accountExpected,serviceRpcExecuteCount:4},
  'existing service default execute is observed, not silently represented as a client grant');
for(const mutate of [
  m=>{delete m.tables.account_activity_journal;},
  m=>{m.tables.account_statistics_preferences.columns[1].type='text';},
  m=>{m.tables.account_activity_journal.profilesCascade=0;},
  m=>{m.tables.account_activity_journal.rls=false;},
  m=>{m.tables.account_statistics_preferences.policyCount=1;},
  m=>{m.tables.account_activity_journal.unexpectedAcl=true;},
  m=>{m.tables.account_statistics_preferences.authenticatedAccess=true;},
  m=>{m.functions.record_account_activity.bodySha256='0'.repeat(64);},
  m=>{m.functions.record_account_activity.configuration=['search_path=public'];},
  m=>{m.functions.get_own_statistics_preference.definer=false;},
  m=>{m.functions.enable_own_statistics_preference.publicExecute=true;},
  m=>{m.functions.disable_own_statistics_preference.anonExecute=true;},
  m=>{m.functions.get_own_statistics_preference.unexpectedAcl=true;},
  m=>{m.functions.record_account_activity.sameNameCount=2;},
]) {
  const copy=structuredClone(accountMetadata);mutate(copy);
  await assert.rejects(verifyAccountAssistantCatalogMetadata(copy),/ACCOUNT_ASSISTANT_CATALOG_/);
}
const accountRequests=[];
const accountReport=await verifyInstalledAccountAssistantSchema({accessToken:'synthetic-account-token',
  fetchImpl:async(url,init)=>{
    accountRequests.push({url,init});
    return new Response(JSON.stringify([{metadata:accountMetadata}]),{status:201});
  }});
assert.deepEqual(accountReport,accountExpected);assert.equal(accountRequests.length,1);
assert.equal(accountRequests[0].url,'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');
assert.equal(accountRequests[0].init.method,'POST');assert.equal(accountRequests[0].init.redirect,'error');
assert.equal(accountRequests[0].init.cache,'no-store');assert.equal(accountRequests[0].init.credentials,'omit');
assert.deepEqual(JSON.parse(accountRequests[0].init.body),{query:accountAssistantCatalogQuery,read_only:true});
assert.doesNotMatch(accountAssistantCatalogQuery,/\b(?:from|join)\s+public\.account_/i);
assert.doesNotMatch(JSON.stringify(accountReport),/synthetic-account-token|Bearer|first_observed_at|user_id/);
for(const response of [
  new Response('PRIVATE-BODY-NOT-LOGGED',{status:403}),
  new Response(new Uint8Array(32769),{status:201}),
  new Response(JSON.stringify([{metadata:accountMetadata},{metadata:accountMetadata}]),{status:201}),
]) {
  let calls=0;
  await assert.rejects(verifyInstalledAccountAssistantSchema({accessToken:'synthetic-account-token',
    fetchImpl:async()=>{calls++;return response;}}),/ACCOUNT_ASSISTANT_CATALOG_/);
  assert.equal(calls,1,'fixed account readback never retries');
}
let arbitraryAccountCalls=0;
await assert.rejects(verifyInstalledAccountAssistantSchema({accessToken:'synthetic',
  query:'select anything',fetchImpl:async()=>{arbitraryAccountCalls++;}}),/ACCOUNT_ASSISTANT_CATALOG_/);
assert.equal(arbitraryAccountCalls,0);

const accountCodeOnly=await fs.readFile('.github/workflows/deploy-code-only-repair.yml','utf8');
const accountReadback=accountCodeOnly.indexOf('node scripts/verify-account-assistant-schema.mjs');
const accountDbApply=accountCodeOnly.indexOf('          supabase db push --linked --skip-vault');
const accountTripDeploy=accountCodeOnly.indexOf('      - name: Deploy exact rebound trip Edges without Worker or D1 replay');
const accountAssistantDeploy=accountCodeOnly.indexOf('            if supabase functions deploy ravradar-assistant');
assert.ok(accountDbApply>=0 && accountReadback>accountDbApply
  && accountTripDeploy>accountReadback && accountAssistantDeploy>accountTripDeploy,
  'fixed account catalog readback must precede all three rebound Edge deployments');
const accountAttemptPolicy=accountCodeOnly.slice(accountCodeOnly.indexOf('          assistant_deploy_attempts=3'),
  accountCodeOnly.indexOf('          for ((attempt = 1; attempt <= assistant_deploy_attempts; attempt++)); do'));
assert.match(accountAttemptPolicy,/RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN/);
assert.doesNotMatch(accountAttemptPolicy,/RAVRADAR_ACCOUNT_ASSISTANT_FINAL_REQUIRED/);
assert.match(accountAttemptPolicy,/assistant_deploy_attempts=1/);
console.log('Account/assistant successor: strict named prewrite plan, sparse current readback and fixed metadata caller; controlled fixtures only.');
