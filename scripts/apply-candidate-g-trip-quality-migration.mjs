#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANDIDATE_G_TRIP_QUALITY_MIGRATION = Object.freeze({
  projectRef: 'afqhhdrkjfjtpadntdzo',
  path: 'supabase/migrations/20260829_candidate_g_reconstructed_trip_exclusion.sql',
  constraint: 'ravradar_observations_trip_v2_check',
});

const MANAGEMENT_API = 'https://api.supabase.com/v1';
const QUALITY_FLAGS = Object.freeze([
  'public-emergency-last-complete',
  'ravscore-reconstructed-derived-evidence',
  'ravscore-evidence-trust-unattested',
]);
const CONSTRAINT_COMMENT = 'Trip v2 DEC-0109-v2: exact quality allowlist and canonical quality-reason order; reconstructed, public-emergency and legacy-unattested snapshots are always excluded from calibration.';
const CANONICAL_REASON_ORDER_MARKER = '@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested"';
const CANONICAL_REASON_ORDER_PATTERN = /@\s*==\s*"public-emergency-last-complete"\s*\|\|\s*@\s*==\s*"ravscore-reconstructed-derived-evidence"\s*\|\|\s*@\s*==\s*"ravscore-evidence-trust-unattested"/i;
const SCHEMA_TWO_BRANCH_PATTERN = /schema_version\s*=\s*2/;

export function assertCandidateGTripQualityMigrationSql(sql) {
  const text = String(sql || '');
  const normalized = text.toLowerCase();
  for (const marker of [
    'begin;',
    'alter table public.observations',
    `add constraint ${CANDIDATE_G_TRIP_QUALITY_MIGRATION.constraint}`,
    'schema_version = 2',
    'validate constraint ravradar_observations_trip_v2_check',
    'commit;',
    CANONICAL_REASON_ORDER_MARKER,
    ...QUALITY_FLAGS,
  ]) {
    if (!normalized.includes(marker.toLowerCase())) throw new Error(`TRIP_QUALITY_MIGRATION_MARKER_MISSING:${marker}`);
  }
  if (/\b(?:drop\s+table|truncate|delete\s+from|update\s+public\.|insert\s+into)\b/i.test(text)) {
    throw new Error('TRIP_QUALITY_MIGRATION_UNEXPECTED_DATA_MUTATION');
  }
  if (normalized.indexOf('begin;') > normalized.indexOf('alter table public.observations')
    || normalized.lastIndexOf('commit;') < normalized.lastIndexOf('validate constraint')) {
    throw new Error('TRIP_QUALITY_MIGRATION_NOT_ATOMIC');
  }
  return true;
}

export function assertCandidateGTripQualityConstraintRows(rows) {
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.convalidated !== true) {
    throw new Error('TRIP_QUALITY_CONSTRAINT_NOT_VALIDATED');
  }
  const definition = String(rows[0]?.definition || '').toLowerCase();
  for (const marker of [
    'calibration_eligible', 'data_quality_flags', 'actual_zone_id', 'forecast_zone_id',
    'jsonb_path_query_array', ...QUALITY_FLAGS,
  ]) {
    if (!definition.includes(marker)) throw new Error(`TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:${marker}`);
  }
  if (!CANONICAL_REASON_ORDER_PATTERN.test(definition)) {
    throw new Error('TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:canonical-reason-order');
  }
  if (!SCHEMA_TWO_BRANCH_PATTERN.test(definition)) {
    throw new Error('TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:explicit-schema-two-branch');
  }
  if (rows[0]?.constraint_comment !== CONSTRAINT_COMMENT) {
    throw new Error('TRIP_QUALITY_CONSTRAINT_COMMENT_MISMATCH');
  }
  return true;
}

async function managementQuery({ accessToken, projectRef, query, readOnly }) {
  const response = await fetch(`${MANAGEMENT_API}/projects/${encodeURIComponent(projectRef)}/database/query`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, read_only: readOnly === true }),
  });
  const responseText = await response.text();
  if (response.status !== 201) {
    throw new Error(`SUPABASE_MANAGEMENT_QUERY_FAILED:${response.status}`);
  }
  if (!responseText.trim()) return [];
  const parsed = JSON.parse(responseText);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.result)) return parsed.result;
  if (Array.isArray(parsed?.data)) return parsed.data;
  return [];
}

export async function applyCandidateGTripQualityMigration({
  accessToken,
  projectRef = CANDIDATE_G_TRIP_QUALITY_MIGRATION.projectRef,
  verifyOnly = false,
} = {}) {
  if (!accessToken || typeof accessToken !== 'string') throw new Error('SUPABASE_ACCESS_TOKEN_MISSING');
  if (projectRef !== CANDIDATE_G_TRIP_QUALITY_MIGRATION.projectRef) throw new Error('SUPABASE_PROJECT_REF_MISMATCH');
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const migrationSql = await fs.readFile(path.join(repositoryRoot, CANDIDATE_G_TRIP_QUALITY_MIGRATION.path), 'utf8');
  assertCandidateGTripQualityMigrationSql(migrationSql);
  const migrationSha256 = crypto.createHash('sha256').update(migrationSql).digest('hex');
  const verificationQuery = `select c.convalidated, pg_get_constraintdef(c.oid) as definition,
        pg_catalog.obj_description(c.oid, 'pg_constraint') as constraint_comment
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_class r on r.oid = c.conrelid
      join pg_catalog.pg_namespace n on n.oid = r.relnamespace
      where n.nspname = 'public'
        and r.relname = 'observations'
        and c.conname = '${CANDIDATE_G_TRIP_QUALITY_MIGRATION.constraint}'`;
  let rows = await managementQuery({
    accessToken,
    projectRef,
    readOnly: true,
    query: verificationQuery,
  });
  let alreadyCurrent = false;
  try {
    assertCandidateGTripQualityConstraintRows(rows);
    alreadyCurrent = true;
  } catch (error) {
    if (verifyOnly) throw error;
  }
  if (!verifyOnly && !alreadyCurrent) {
    await managementQuery({ accessToken, projectRef, query: migrationSql, readOnly: false });
    rows = await managementQuery({ accessToken, projectRef, query: verificationQuery, readOnly: true });
    assertCandidateGTripQualityConstraintRows(rows);
  }
  return {
    status: verifyOnly ? 'verified' : alreadyCurrent ? 'already-current' : 'applied-and-verified',
    migrationSha256,
  };
}

async function main() {
  const result = await applyCandidateGTripQualityMigration({
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    projectRef: process.env.SUPABASE_PROJECT_ID || CANDIDATE_G_TRIP_QUALITY_MIGRATION.projectRef,
    verifyOnly: process.argv.includes('--verify-only'),
  });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
