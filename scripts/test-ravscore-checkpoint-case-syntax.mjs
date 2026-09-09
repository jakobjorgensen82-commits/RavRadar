#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const CHECKPOINT_SQL_COPIES = [
  'supabase/migrations/20260903010000_ravscore_checkpoint_metadata_cas.sql',
  'supabase/migrations/20260904140000_harmonie_wind_reference_binding.sql',
  'supabase/migrations/20260905090000_open_meteo_current_fallback_binding.sql',
  'supabase/migrations/20260906162332_per_pair_weather_fallback_binding.sql',
  'supabase/migrations/20260907084343_horizon_valid_weather_binding.sql',
  'supabase/schema.sql',
  'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
];

const BARE_DISTINCT_FROM_CASE = /\bis\s+distinct\s+from\s+case\b/giu;
const HISTORY_TRANSITION_EXPRESSION =
  /v_lineage\s*->>\s*'historyTransition'\s+is\s+distinct\s+from\s*\(\s*case\s+when\s+\(v_lineage\s*->>\s*'boundedUnknownPositionCount'\)::numeric\s*>\s*0\s+then\s+'UNKNOWN_HISTORY_INTERVAL'\s+else\s+'VERIFIED_CAUSAL_HISTORY_WINDOW'\s+end\s*\)/giu;

function assertSafeHistoryTransitionExpression(source, label) {
  assert.doesNotMatch(
    source,
    BARE_DISTINCT_FROM_CASE,
    `${label} contains the PostgreSQL-invalid unparenthesized IS DISTINCT FROM CASE form`,
  );
  const matches = [...source.matchAll(HISTORY_TRANSITION_EXPRESSION)];
  assert.equal(
    matches.length,
    1,
    `${label} must contain exactly one parenthesized history-transition CASE expression`,
  );
  return matches[0][0].replace(/\s+/gu, ' ').trim();
}

async function listSqlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSqlFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.sql') ? [entryPath] : [];
  }));
  return nested.flat();
}

const invalidRegressionFixture = `
  v_lineage ->> 'historyTransition' is distinct from case
    when (v_lineage ->> 'boundedUnknownPositionCount')::numeric > 0
      then 'UNKNOWN_HISTORY_INTERVAL'
    else 'VERIFIED_CAUSAL_HISTORY_WINDOW'
  end
`;
assert.throws(
  () => assertSafeHistoryTransitionExpression(invalidRegressionFixture, 'regression fixture'),
  /PostgreSQL-invalid unparenthesized/,
  'the regression guard must reject the original SQLSTATE 42601 form',
);

for (const sqlPath of await listSqlFiles('supabase')) {
  const source = await fs.readFile(sqlPath, 'utf8');
  assert.doesNotMatch(
    source,
    BARE_DISTINCT_FROM_CASE,
    `${sqlPath} contains an unparenthesized IS DISTINCT FROM CASE expression`,
  );
}

const canonicalExpressions = [];
for (const sqlPath of CHECKPOINT_SQL_COPIES) {
  const source = await fs.readFile(sqlPath, 'utf8');
  canonicalExpressions.push(assertSafeHistoryTransitionExpression(source, sqlPath));
}
assert.equal(
  new Set(canonicalExpressions).size,
  1,
  'checkpoint migration, schema and installer history-transition expressions must remain identical',
);

console.log('RavScore checkpoint CASE syntax regression test passed.');
