#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ASSISTANT_BINDING_HEADERS,
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

const SOURCE_HEAD = 'a'.repeat(40);
const PUBLIC_IMPLEMENTATION_CLOSURE_SHA256 = 'c'.repeat(64);
const URL = 'https://project.example';
const SERVICE_KEY = 'sb_secret_test_only';
const PUBLISHABLE_KEY = 'sb_publishable_test_only';
const CHECKPOINT_CONTINUATION_HASH =
  await ravScoreContinuationImplementationSha256();

await inspectMigrationSources();
assert.equal(REQUIRED_CUTOVER_MIGRATIONS.length, 10,
  'The active cutover must preserve the nine applied migrations and append one binding migration');
assert.equal(REQUIRED_CUTOVER_MIGRATIONS.at(-1).version, '20260912122607');

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
  'supabase/migrations/20260912122607_measured_rollback_warmup_binding.sql',
  'utf8',
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
  "p_state ->> 'transportReferenceAt' is distinct from p_reference_text",
  "p_state -> 'transportMemoryReady' is distinct from 'true'::jsonb",
  "p_state ->> 'transportMemoryStatus' is distinct from 'READY'",
  "p_state -> 'transportMemoryCoverageHours' is distinct from '48'::jsonb",
  "p_payload ->> 'continuationStateContractSha256' is distinct from",
  CHECKPOINT_CONTINUATION_HASH,
  '082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91',
  'v_exact_predecessor_same_target_transition',
  "#- '{continuationStateContractSha256}'",
  "#- '{candidateGRollbackCompanion,generationSha256}'",
  'create or replace function public.ravradar_ravscore_checkpoint_contract()',
  "'schemaVersion', 'ravscore-checkpoint-db-v1'",
  "'20260912122607'",
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

const workflow = await fs.readFile('.github/workflows/deploy-trip-storage.yml', 'utf8');
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
// Append both later binding rows while preserving the captured eight-row CLI fixture.
const currentFirstInstallList = `${capturedFirstEightInstallList}
   \`20260909194000\` | \` \`    | \`2026-09-09 19:40:00\`
   \`20260912122607\` | \` \`    | \`2026-09-12 12:26:07\`
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

const firstInstallPlan = await assertSupabaseMigrationPlan({
  migrationListText: currentFirstInstallList,
  dryRunText: currentFirstInstallDryRun,
});
assert.deepEqual(firstInstallPlan.pendingVersions,
  REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version));
assert.deepEqual(firstInstallPlan.alreadyAppliedVersions, []);

const plan = await assertSupabaseMigrationPlan({
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
  ['20260903010000', '20260904140000', '20260905090000', '20260906162332', '20260907084343', '20260909194000', '20260912122607']);
assert.deepEqual(plan.alreadyAppliedVersions,
  ['20260829010000', '20260829020000', '20260901010000']);

await assert.rejects(
  assertSupabaseMigrationPlan({
    migrationListText: `${unicodeList}\n 20260823 │ │ 2026-08-23 00:00:00`,
    dryRunText: currentFirstInstallDryRun,
  }),
  /unexpected pending migrations: 20260823/,
);
await assert.rejects(
  assertSupabaseMigrationPlan({
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

// The live backend already has the first nine migrations. Every applied prefix
// must resume at its exact suffix, and a retry after all ten must be a no-op.
for (let appliedCount = 0; appliedCount <= REQUIRED_CUTOVER_MIGRATIONS.length; appliedCount += 1) {
  const appliedPrefix = REQUIRED_CUTOVER_MIGRATIONS.slice(0, appliedCount);
  const pendingSuffix = REQUIRED_CUTOVER_MIGRATIONS.slice(appliedCount);
  const prefixList = `Local | Remote | Time (UTC)\n${REQUIRED_CUTOVER_MIGRATIONS.map((item, index) =>
    `${item.version} | ${index < appliedCount ? item.version : ''} | state`).join('\n')}`;
  const suffixDryRun = `DRY RUN: migrations will *not* be pushed to the database.\n${pendingSuffix.length
    ? `Would push these migrations:\n${pendingSuffix.map(item => ` • ${item.filename}`).join('\n')}\nFinished supabase db push.`
    : 'Remote database is up to date.'}`;
  const prefixPlan = await assertSupabaseMigrationPlan({
    migrationListText: prefixList,
    dryRunText: suffixDryRun,
  });
  assert.deepEqual(prefixPlan.alreadyAppliedVersions, appliedPrefix.map(item => item.version),
    `prefix ${appliedCount}: applied migrations must not be rerun`);
  assert.deepEqual(prefixPlan.pendingVersions, pendingSuffix.map(item => item.version),
    `prefix ${appliedCount}: only the exact remaining suffix may be applied`);
  if (appliedCount === 8) {
    assert.deepEqual(prefixPlan.pendingVersions, ['20260909194000', '20260912122607'],
      'the eight-migration historical prefix needs both later binding migrations');
  }
  if (appliedCount === 9) {
    assert.deepEqual(prefixPlan.pendingVersions, ['20260912122607'],
      'the installed live backend needs only the measured-warmup binding migration');
    await assert.rejects(assertSupabaseMigrationPlan({
      migrationListText: prefixList,
      dryRunText: currentFirstInstallDryRun,
    }), /did not propose exactly the pending required migrations/,
    'the ten-file first-install plan must not replay nine already-applied migrations');
  }
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
  appliedMigrationVersion: REQUIRED_CUTOVER_MIGRATIONS.at(-1).version,
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
