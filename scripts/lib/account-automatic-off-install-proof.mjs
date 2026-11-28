import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ACCOUNT_AUTOMATIC_OFF_MIGRATIONS} from './account-automatic-off-source.mjs';
import {
  readAccountErasureSource,
  verifyAccountErasureCheckReference,
} from '../verify-account-erasure-schema.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const WORKFLOW = '.github/workflows/verify-supabase-cli-local-restore.yml';
const ORIGIN = Object.freeze({
  head: '39ec5aedf193e9ba327e8c724d7d85570ad61447',
  run: 46124841742,
  job: 140917063953,
  receiptSha256: '466f96fd46bf152311af9403e94f787f58069a94a71ff0c23518dec4f96a7199',
});
// The isolated fixture uses these actual inputs, including the signed Worker
// that deletes and reads back the synthetic trips. Installer-only changes can
// reuse its receipt when those inputs match.
const NATIVE_SCOPE = Object.freeze([
  WORKFLOW,
  'package.json',
  'scripts/test-supabase-cli-local-restore.mjs',
  'scripts/verify-account-erasure-schema.mjs',
  'scripts/verify-account-automatic-off-schema.mjs',
  'scripts/lib/account-automatic-off-source.mjs',
  'scripts/lib/account-erasure-outbox-native-fixture.mjs',
  'scripts/lib/account-native-activity-receipt-source.mjs',
  'scripts/lib/isolated-trip-erasure-sqlite.mjs',
  'supabase/schema.sql',
  'supabase/migrations/20261116181500_account_erasure_outbox_off.sql',
  'supabase/migrations/20261117180000_account_inactivity_notice_off.sql',
  'supabase/migrations/20261117180100_account_native_activity_capture_off.sql',
  'supabase/migrations/20261127095500_trip_owner_erasure_intents.sql',
  ...ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(({filename}) => 'supabase/migrations/' + filename),
  'supabase/functions/_shared/',
  'cloudflare/trip-gateway/',
  'js/services/calibration-eligibility.js',
  'js/core/',
]);

// Actual PostgreSQL 16 catalogue from the native artifact for the same
// historical account install (#1041, run 45250650574, artifact 14861016886).
// The CHECK reference contains PostgreSQL expressions only.
const MANUAL_CHECK_REFERENCE = {
  "format": "PG_CONSTRAINTDEF_V1",
  "definitions": [
    [
      "account_erasure_operations_auth_attempt_ids_check",
      "CHECK (((COALESCE(array_ndims(auth_attempt_ids), 1) = 1) AND (COALESCE(array_lower(auth_attempt_ids, 1), 1) = 1) AND (array_position(auth_attempt_ids, NULL::uuid) IS NULL) AND (NOT ('00000000-0000-0000-0000-000000000000'::uuid = ANY (auth_attempt_ids)))))"
    ],
    [
      "account_erasure_operations_auth_user_created_at_check",
      "CHECK (((auth_user_created_at IS NULL) OR (auth_user_created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{1,9})?Z$'::text)))"
    ],
    [
      "account_erasure_operations_check",
      "CHECK ((target_user_id <> requested_by))"
    ],
    [
      "account_erasure_operations_check1",
      "CHECK (((activity_first IS NULL) = (activity_last IS NULL)))"
    ],
    [
      "account_erasure_operations_check10",
      "CHECK (((auth_user_created_at IS NOT NULL) = (auth_claimed_at IS NOT NULL)))"
    ],
    [
      "account_erasure_operations_check11",
      "CHECK (((state <> 'AUTH_ATTEMPTED'::text) OR (auth_claimed_at IS NOT NULL)))"
    ],
    [
      "account_erasure_operations_check12",
      "CHECK (((auth_claimed_at IS NULL) OR ((auth_attempt_id IS NOT NULL) AND isfinite(auth_claimed_at) AND (auth_claimed_at >= pg_staged_at))))"
    ],
    [
      "account_erasure_operations_check13",
      "CHECK (((state = ANY (ARRAY['AUTH_ABSENT_D1_PENDING'::text, 'COMPLETE'::text])) = (auth_absent_at IS NOT NULL)))"
    ],
    [
      "account_erasure_operations_check14",
      "CHECK (((auth_absent_at IS NULL) OR ((auth_attempt_id IS NOT NULL) AND (d1_owner_subject IS NOT NULL) AND isfinite(auth_absent_at) AND (auth_absent_at >= COALESCE(auth_claimed_at, pg_staged_at)))))"
    ],
    [
      "account_erasure_operations_check15",
      "CHECK (((state = 'COMPLETE'::text) = (d1_ack_at IS NOT NULL)))"
    ],
    [
      "account_erasure_operations_check16",
      "CHECK (((d1_ack_at IS NOT NULL) = (d1_deleted_count IS NOT NULL)))"
    ],
    [
      "account_erasure_operations_check17",
      "CHECK (((d1_ack_at IS NULL) OR (isfinite(d1_ack_at) AND (d1_ack_at >= auth_absent_at))))"
    ],
    [
      "account_erasure_operations_check18",
      "CHECK (((auth_attempt_id IS NULL) OR ((pg_staged_at IS NOT NULL) AND (d1_owner_subject IS NOT NULL))))"
    ],
    [
      "account_erasure_operations_check2",
      "CHECK (((activity_first IS NULL) OR (isfinite(activity_first) AND isfinite(activity_last) AND (activity_first <= activity_last))))"
    ],
    [
      "account_erasure_operations_check3",
      "CHECK ((isfinite(prepared_at) AND isfinite(updated_at) AND (prepared_at <= updated_at)))"
    ],
    [
      "account_erasure_operations_check4",
      "CHECK (((state = ANY (ARRAY['PG_STAGED_AUTH_PENDING'::text, 'AUTH_ATTEMPTED'::text, 'AUTH_ABSENT_D1_PENDING'::text, 'COMPLETE'::text])) = (pg_staged_at IS NOT NULL)))"
    ],
    [
      "account_erasure_operations_check5",
      "CHECK (((pg_staged_at IS NULL) OR (isfinite(pg_staged_at) AND (pg_staged_at >= prepared_at))))"
    ],
    [
      "account_erasure_operations_check6",
      "CHECK (((state <> ALL (ARRAY['HOLD_ACTIVITY_CHANGED'::text, 'HOLD_POLICY'::text])) OR (hold_reason IS NOT NULL)))"
    ],
    [
      "account_erasure_operations_check7",
      "CHECK (((state <> ALL (ARRAY['PREPARED'::text, 'COMPLETE'::text])) OR (hold_reason IS NULL)))"
    ],
    [
      "account_erasure_operations_check8",
      "CHECK (((pg_staged_at IS NOT NULL) OR (pg_rows_removed = 0)))"
    ],
    [
      "account_erasure_operations_check9",
      "CHECK ((NOT (auth_attempt_id IS DISTINCT FROM auth_attempt_ids[cardinality(auth_attempt_ids)])))"
    ],
    [
      "account_erasure_operations_d1_deleted_count_check",
      "CHECK (((d1_deleted_count >= 0) AND (d1_deleted_count <= '9007199254740991'::bigint)))"
    ],
    [
      "account_erasure_operations_d1_owner_subject_check",
      "CHECK (((d1_owner_subject IS NULL) OR (d1_owner_subject ~ '^usr_v1_[A-Za-z0-9_-]{43}$'::text)))"
    ],
    [
      "account_erasure_operations_hold_reason_check",
      "CHECK ((hold_reason = ANY (ARRAY['ACTIVITY_CHANGED'::text, 'PRIVILEGED_TARGET'::text, 'REFERENCE_POLICY'::text, 'REFERENCE_CATALOG_UNKNOWN'::text, 'TARGET_MISSING'::text, 'STORAGE_CATALOG_UNKNOWN'::text, 'STORAGE_POLICY_UNQUALIFIED'::text, 'STORAGE_OWNERSHIP'::text, 'AUTH_GENERATION_CHANGED'::text])))"
    ],
    [
      "account_erasure_operations_mode_check",
      "CHECK ((mode = 'MANUAL_OWNER'::text))"
    ],
    [
      "account_erasure_operations_operation_id_check",
      "CHECK ((operation_id <> '00000000-0000-0000-0000-000000000000'::uuid))"
    ],
    [
      "account_erasure_operations_pg_rows_removed_check",
      "CHECK (((pg_rows_removed >= 0) AND (pg_rows_removed <= '9007199254740991'::bigint)))"
    ],
    [
      "account_erasure_operations_state_check",
      "CHECK ((state = ANY (ARRAY['PREPARED'::text, 'HOLD_ACTIVITY_CHANGED'::text, 'HOLD_POLICY'::text, 'PG_STAGED_AUTH_PENDING'::text, 'AUTH_ATTEMPTED'::text, 'AUTH_ABSENT_D1_PENDING'::text, 'COMPLETE'::text])))"
    ]
  ],
  "postgresMajor": 16,
  "definitionsSha256": "8b2c8cec94df18b5412c71b3719aab82226a88146d4dac55b9ff43041416df2a"
};
const MANUAL_SQL_SHA256 = '80fad3aa7232443558973d9ee9adc1a0e590c30cecf66eb4bb8c85fade7aa499';

export function installedManualAccountCheckReference() {
  assert.equal(readAccountErasureSource().sha256, MANUAL_SQL_SHA256);
  return verifyAccountErasureCheckReference(MANUAL_CHECK_REFERENCE);
}

const actionsBase = 'https://api.github.com/repos/' + REPOSITORY + '/actions/';
async function readActions(path) {
  const signal = AbortSignal.timeout(20_000);
  const token = process.env.GITHUB_TOKEN;
  assert(typeof token === 'string' && token.length > 0);
  let response = await fetch(actionsBase + path, {
    redirect: 'manual', signal,
    headers: {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json'},
  });

  // Fetch the fixed job's signed log as bounded data. Only the validated
  // receipt is consumed. The signed request carries no GitHub credential.
  if (path.endsWith('/logs')) {
    assert.equal(response.status, 302);
    const location = new URL(response.headers.get('location'));
    assert(location.protocol === 'https:' && !location.username && !location.password && !location.port
      && /^productionresultssa\d+\.blob\.core\.windows\.net$/.test(location.hostname));
    await response.body?.cancel();
    response = await fetch(location, {redirect: 'error', signal});
  }
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.length;
      assert(bytes <= 2 * 1024 * 1024);
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks, bytes));
}
const git = args => execFileSync('git', args, {
  cwd: ROOT, encoding: 'utf8', timeout: 15_000, stdio: ['ignore', 'pipe', 'pipe'],
});

export function assertAutomaticAccountOffReceipt(raw) {
  assert(typeof raw === 'string' && Buffer.byteLength(raw) <= 2 * 1024 * 1024);
  const lines = raw.split(/\r?\n/).filter(line => line.includes('"isolatedAutomaticOffInstallation"'));
  assert.equal(lines.length, 1);
  const line = lines[0].slice(lines[0].indexOf('{')).trim();
  assert.equal(createHash('sha256').update(line).digest('hex'), ORIGIN.receiptSha256);
  const record = JSON.parse(line);
  assert.equal(record.status, 'PASS');
  assert.equal(record.scope, 'synthetic-standard-cli-local-restore');
  assert.equal(record.sourceHead, ORIGIN.head);
  assert.equal(record.ownedDockerClosed, true);
  assert.deepEqual(record.syntheticNativeActivity.isolatedAutomaticOffInstallation, {
    kind: 'ACCOUNT_AUTOMATIC_OFF_SCHEMA_INSTALLED',
    catalogVerified: true,
    migrationVersions: ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(({version}) => version),
    automaticErasureEnabled: false,
    automaticErasureRecoveryQualified: false,
    automaticNoticesEnabled: false,
    activationAuthority: false,
  });
  return record.syntheticNativeActivity.isolatedAutomaticOffInstallation;
}

export async function qualifyAutomaticAccountOffNative(head, {read = readActions, readGit = git} = {}) {
  assert.match(head ?? '', /^[a-f0-9]{40}$/);
  assert.equal(readGit(['rev-parse', 'HEAD^{commit}']).trim(), head);
  assert.equal(readGit(['status', '--porcelain', '--untracked-files=no']).trim(), '');
  assert.equal(readGit(['for-each-ref', 'refs/replace']).trim(), '');
  readGit(['merge-base', '--is-ancestor', ORIGIN.head, head]);
  readGit(['diff', '--quiet', '--no-ext-diff', ORIGIN.head, head, '--', ...NATIVE_SCOPE]);

  const run = JSON.parse(await read('runs/' + ORIGIN.run));
  assert.equal(run.id, ORIGIN.run);
  assert.equal(run.head_sha, ORIGIN.head);
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.path, WORKFLOW);
  assert.equal(run.run_attempt, 1);
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'success');
  const job = JSON.parse(await read('jobs/' + ORIGIN.job));
  assert.equal(job.id, ORIGIN.job);
  assert.equal(job.run_id, ORIGIN.run);
  assert.equal(job.run_attempt, 1);
  assert.equal(job.head_sha, ORIGIN.head);
  assert.equal(job.status, 'completed');
  assert.equal(job.conclusion, 'success');
  for (const name of ['Require actual checkout identity', 'Run only the standard synthetic local restore']) {
    const steps = job.steps.filter(step => step.name === name);
    assert.equal(steps.length, 1);
    assert.equal(steps[0].status, 'completed');
    assert.equal(steps[0].conclusion, 'success');
  }
  const receipt = assertAutomaticAccountOffReceipt(await read('jobs/' + ORIGIN.job + '/logs'));
  return {nativeRun: ORIGIN.run, nativeHead: ORIGIN.head, migrationVersions: receipt.migrationVersions};
}
