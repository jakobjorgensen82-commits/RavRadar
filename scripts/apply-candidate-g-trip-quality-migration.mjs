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
const SCHEMA_TWO_BRANCH_PATTERN = /schema_version\s*=\s*2/;

function extractSqlFunctionCalls(text, functionName) {
  const source = String(text || '');
  const normalized = source.toLowerCase();
  const token = String(functionName || '').toLowerCase();
  const calls = [];
  let outerQuote = null;
  for (let start = 0; start < normalized.length; start += 1) {
    const outerCharacter = source[start];
    if (outerQuote) {
      if (outerCharacter === outerQuote) {
        if (source[start + 1] === outerQuote) {
          start += 1;
        } else {
          outerQuote = null;
        }
      }
      continue;
    }
    if (outerCharacter === "'" || outerCharacter === '"') {
      outerQuote = outerCharacter;
      continue;
    }
    if (!normalized.startsWith(token, start)) continue;
    const leftCharacter = source[start - 1] || '';
    if (/[a-z0-9_$]/i.test(leftCharacter)) continue;
    let callStart = start;
    if (leftCharacter === '.') {
      const schemaPrefix = 'pg_catalog.';
      const schemaStart = start - schemaPrefix.length;
      if (schemaStart < 0
        || normalized.slice(schemaStart, start) !== schemaPrefix
        || /[a-z0-9_$]/i.test(source[schemaStart - 1] || '')) {
        continue;
      }
      callStart = schemaStart;
    }
    const rightCharacter = source[start + token.length] || '';
    if (/[a-z0-9_$]/i.test(rightCharacter)) continue;
    let open = start + token.length;
    while (/\s/.test(source[open] || '')) open += 1;
    if (source[open] !== '(') continue;
    let depth = 0;
    let quote = null;
    let end = -1;
    for (let index = open; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (character === quote) {
          if (source[index + 1] === quote) {
            index += 1;
          } else {
            quote = null;
          }
        }
        continue;
      }
      if (character === "'" || character === '"') {
        quote = character;
      } else if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
        if (depth === 0) {
          end = index + 1;
          break;
        }
      }
    }
    if (end < 0) throw new Error('TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:balanced-jsonb-path-call');
    calls.push(source.slice(callStart, end));
    start = end - 1;
  }
  return calls;
}

function normalizeJsonPathDeparserExpression(value) {
  const source = String(value || '');
  let normalized = '';
  let inString = false;
  let escaped = false;
  for (const character of source) {
    if (inString) {
      normalized += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      normalized += character;
    } else if (!/\s/.test(character) && character !== '(' && character !== ')') {
      normalized += character;
    }
  }
  if (inString) {
    throw new Error('TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:canonical-reason-order');
  }
  return normalized;
}

function assertCanonicalReasonOrder(definition) {
  const canonicalCalls = extractSqlFunctionCalls(definition, 'jsonb_path_query_array')
    .filter(call => QUALITY_FLAGS.every(flag => call.toLowerCase().includes(flag)));
  if (canonicalCalls.length !== 1) {
    throw new Error('TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:canonical-reason-order');
  }
  const jsonPathLiterals = [...canonicalCalls[0].matchAll(/'((?:''|[^'])*)'\s*::\s*(?:pg_catalog\.)?jsonpath\b/gi)];
  if (jsonPathLiterals.length !== 1) {
    throw new Error('TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:canonical-reason-order');
  }
  const normalizedJsonPath = normalizeJsonPathDeparserExpression(
    jsonPathLiterals[0][1].replace(/''/g, "'"),
  );
  const expectedJsonPath = `$[*]?${QUALITY_FLAGS.map(flag => `@=="${flag}"`).join('||')}`;
  if (normalizedJsonPath !== expectedJsonPath) {
    throw new Error('TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:canonical-reason-order');
  }
}

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
  const rawDefinition = String(rows[0]?.definition || '');
  const definition = rawDefinition.toLowerCase();
  for (const marker of [
    'calibration_eligible', 'data_quality_flags', 'actual_zone_id', 'forecast_zone_id',
    'jsonb_path_query_array', ...QUALITY_FLAGS,
  ]) {
    if (!definition.includes(marker)) throw new Error(`TRIP_QUALITY_CONSTRAINT_MARKER_MISSING:${marker}`);
  }
  assertCanonicalReasonOrder(rawDefinition);
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
