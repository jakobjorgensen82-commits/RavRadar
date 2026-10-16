import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUIRED_CUTOVER_MIGRATIONS, LATEST_REQUIRED_CUTOVER_MIGRATION,
  expectedCheckpointCasContract, expectedTripBindingPolicy, assertSupabaseMigrationPlan,
  assertSupabaseMigrationsApplied } from './integrated-cutover-readiness.mjs';
import { nativeIdentityMigration, readNativeIdentityCanonicalSource,
  NATIVE_IDENTITY_OUTPUT_REVIEW } from './lib/native-sampling-identity-successor-source.mjs';
import { nativeSamplingIdentityExpectedDatabaseContracts } from './native-sampling-identity-successor-readiness.mjs';
import { checkpointMetadataCasBlock } from './sync-ravscore-model-binding.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateModelBinding } from './rollback-assets/ravscore-model-contract.js';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';
import { selectStatisticsRevisionRoute } from './verify-statistics-preference-revision-plan.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migration = nativeIdentityMigration();
const migrationList = absent => 'Local | Remote | Time (UTC)\n'
  + REQUIRED_CUTOVER_MIGRATIONS.map(row => `${row.version} | ${absent.includes(row.version) ? '' : row.version} | synthetic-metadata-only`).join('\n');
const upToDate = 'DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.\n';

test('actual normal statistics selector and CLI accept only the fully installed native successor', async () => {
  const environment = { GITHUB_EVENT_NAME:'workflow_dispatch', GITHUB_REF:'refs/heads/main', GITHUB_RUN_ATTEMPT:'1',
    RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN:'false' };
  assert.equal(selectStatisticsRevisionRoute({migrationListText:migrationList([]),environment}),'installed');
  for (const absent of [[migration.version],['20261013230000',migration.version]])
    assert.throws(()=>selectStatisticsRevisionRoute({migrationListText:migrationList(absent),environment}));
  assert.throws(()=>selectStatisticsRevisionRoute({migrationListText:migrationList([]),
    environment:{...environment,RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN:'true'}}),/no historical statistics grant replay/);
  assert.throws(()=>selectStatisticsRevisionRoute({migrationListText:migrationList([])+'\n20991016060000 | 20991016060000 | synthetic',environment}),/unknown later/);
  const parent=await fs.realpath(os.tmpdir()), temporary=await fs.mkdtemp(path.join(parent,'rr-native-normal-plan-'));
  try {
    const list=path.join(temporary,'list.txt'), dry=path.join(temporary,'dry.txt');
    await fs.writeFile(list,migrationList([])); await fs.writeFile(dry,upToDate);
    const script=fileURLToPath(new URL('./verify-statistics-preference-revision-plan.mjs',import.meta.url));
    const args=['--phase','installed','--migration-list',list,'--dry-run',dry,'--migrations-directory',
      fileURLToPath(new URL('../supabase/migrations',import.meta.url))];
    const result=spawnSync(process.execPath,[script,...args],{env:{...process.env,...environment},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const before=spawnSync(process.execPath,[script,...args.map((arg,index)=>index===1?'before':arg)],
      {env:{...process.env,...environment,RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN:'true'},encoding:'utf8'});
    assert.equal(before.status,1); assert(before.stderr.includes('NATIVE_SAMPLING_IDENTITY_RECOVERY_ROUTE_REQUIRED'));
  } finally {
    assert.equal(path.dirname(temporary),parent); assert(path.basename(temporary).startsWith('rr-native-normal-plan-'));
    await fs.rm(temporary,{recursive:true});
  }
});

test('normal migration inventory retains220 then230 then the exact native identity successor', () => {
  assert.deepEqual(REQUIRED_CUTOVER_MIGRATIONS.slice(-3).map(row => row.version),
    ['20261013220000', '20261013230000', migration.version]);
  assert.deepEqual(LATEST_REQUIRED_CUTOVER_MIGRATION, migration);
});

test('normal migration caller cannot install the native identity transition or replay older grants', async () => {
  const applied = await assertSupabaseMigrationPlan({ migrationListText: migrationList([]), dryRunText: upToDate });
  assert.deepEqual(applied.pendingVersions, []);
  assert(applied.alreadyAppliedVersions.includes(migration.version));
  assertSupabaseMigrationsApplied(migrationList([]));
  for (const absent of [[migration.version], ['20261013230000', migration.version]]) {
    for (const allowAccountAssistantPrewritePlan of [false, true]) {
      await assert.rejects(() => assertSupabaseMigrationPlan({ migrationListText: migrationList(absent),
        dryRunText: upToDate, allowAccountAssistantPrewritePlan }),
      /NATIVE_SAMPLING_IDENTITY_RECOVERY_ROUTE_REQUIRED/);
    }
    assert.throws(() => assertSupabaseMigrationsApplied(migrationList(absent)));
  }
});

test('normal exact database contract expectations match the reviewed native identity source', async () => {
  const reviewed = await nativeSamplingIdentityExpectedDatabaseContracts();
  const checkpoint = await expectedCheckpointCasContract(), trip = await expectedTripBindingPolicy();
  assert.equal(checkpoint.id, reviewed.checkpoint.id);
  assert.equal(checkpoint.sha256, reviewed.checkpoint.sha256);
  assert.equal(checkpoint.definition, reviewed.checkpoint.definition);
  assert.equal(trip.id, reviewed.trip.id);
  assert.equal(trip.sha256, reviewed.trip.sha256);
  assert.equal(trip.definition, reviewed.trip.definition);
  assert.equal(reviewed.checkpoint.sha256, NATIVE_IDENTITY_OUTPUT_REVIEW.checkpointContractSha256);
  assert.equal(reviewed.trip.sha256, NATIVE_IDENTITY_OUTPUT_REVIEW.tripBindingPolicySha256);
  const { canonicalSource } = await readNativeIdentityCanonicalSource();
  assert(checkpointMetadataCasBlock(canonicalSource, ravScoreModelBinding(), candidateModelBinding(),
    await ravScoreContinuationImplementationSha256()).includes('native_identity_i71_payload_valid'));
});
