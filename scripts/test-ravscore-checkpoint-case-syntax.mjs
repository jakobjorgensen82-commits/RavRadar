#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const CHECKPOINT_SQL_COPIES = [
  'supabase/migrations/20260903010000_ravscore_checkpoint_metadata_cas.sql',
  'supabase/migrations/20260904140000_harmonie_wind_reference_binding.sql',
  'supabase/migrations/20260905090000_open_meteo_current_fallback_binding.sql',
  'supabase/migrations/20260906162332_per_pair_weather_fallback_binding.sql',
  'supabase/migrations/20260907084343_horizon_valid_weather_binding.sql',
  'supabase/migrations/20260909194000_wam_same_run_resolution_binding.sql',
  'supabase/migrations/20260912122607_measured_rollback_warmup_binding.sql',
  'supabase/schema.sql',
  'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
];

// Inspect the changed PL/pgSQL function, not handbook strings or unrelated SQL.
// This is a targeted regression guard, not a general PostgreSQL parser.
const CHECKPOINT_FUNCTION = /^create or replace function public\.ravradar_ravscore_checkpoint_integrated_state_valid\([\s\S]*?^as \$\$\r?\n([\s\S]*?)^\$\$;/gmu;
const HISTORY_TRANSITION_EXPRESSION =
  /v_lineage\s*->>\s*'historyTransition'\s+is\s+distinct\s+from\s*\(\s*case\s+when\s+\(v_lineage\s*->>\s*'boundedUnknownPositionCount'\)::numeric\s*>\s*0\s+then\s+'UNKNOWN_HISTORY_INTERVAL'\s+else\s+'VERIFIED_CAUSAL_HISTORY_WINDOW'\s+end\s*\)/giu;

function assertSafeHistoryTransitionExpression(source, label) {
  const matches = [...source.matchAll(HISTORY_TRANSITION_EXPRESSION)];
  assert.equal(
    matches.length,
    1,
    `${label} must contain exactly one parenthesized history-transition CASE expression`,
  );
  return matches[0][0].replace(/\s+/gu, ' ').trim();
}

function checkpointFunctionBody(source, label) {
  const functions = [...source.matchAll(CHECKPOINT_FUNCTION)];
  assert.equal(functions.length, 1, `${label} must define exactly one checkpoint validator`);
  return functions[0][1];
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
  /exactly one parenthesized history-transition CASE expression/,
  'the regression guard must reject the original SQLSTATE 42601 form',
);

const validRegressionFixture = invalidRegressionFixture.replace('from case', 'from (case').replace(/end\s*$/u, 'end)\n');
const documentationFixture = `-- Historical failure: IS DISTINCT FROM CASE
create or replace function public.ravradar_ravscore_checkpoint_integrated_state_valid(p_state jsonb, p_reference_text text)
returns boolean language plpgsql
as $$
-- The old IS DISTINCT FROM CASE form is documented here, not executed.
${validRegressionFixture}
$$;
insert into public.admin_documents values ('handbook', 'IS DISTINCT FROM CASE');
`;
assertSafeHistoryTransitionExpression(
  checkpointFunctionBody(documentationFixture, 'documentation fixture'), 'documentation fixture',
);

const canonicalExpressions = [];
for (const sqlPath of CHECKPOINT_SQL_COPIES) {
  const source = await fs.readFile(sqlPath, 'utf8');
  canonicalExpressions.push(assertSafeHistoryTransitionExpression(checkpointFunctionBody(source, sqlPath), sqlPath));
}
assert.equal(
  new Set(canonicalExpressions).size,
  1,
  'checkpoint migration, schema and installer history-transition expressions must remain identical',
);

console.log('RavScore checkpoint CASE syntax regression test passed.');
