#!/usr/bin/env node

// Repair only the read-only reason function. The applied validator and its
// three-hour native-cadence allowance must remain byte-for-byte unchanged.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor = 'supabase/migrations/20260923130000_checkpoint_rejection_diagnostic.sql';
const destination = 'supabase/migrations/20260923150000_checkpoint_candidate_diagnostic_correction.sql';
const predecessorSha256 = '6c43152ca038e5d322063cb3ed922bfb43dc698de5690629b488b4a6dfbf6d57';
const normalize = value => value.replace(/\r\n?/g, '\n');
const source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), predecessorSha256,
  'Applied diagnostic changed; review the successor against the exact source');
const marker = 'create or replace function public.ravradar_ravscore_checkpoint_candidate_state_reason(';
const start = source.indexOf(marker);
assert.ok(start >= 0 && source.indexOf(marker, start + 1) < 0,
  'Expected exactly one Candidate G reason function');
const end = source.indexOf('\n$$;', start);
assert.ok(end > start);
let definition = source.slice(start, end + '\n$$;'.length);
const oldRule = `    return v_status <> 'READY'
      and p_state ->> 'transportMemoryStatus' = v_status
      and abs((p_state ->> 'transportMemoryCoverageHours')::numeric - v_coverage) <= 0.000000001;`;
assert.equal(definition.split(oldRule).length - 1, 1,
  'The broken boolean-as-text diagnostic branch must occur exactly once');
definition = definition.replace(oldRule, `    if (v_status <> 'READY'
      and p_state ->> 'transportMemoryStatus' = v_status) is distinct from true
    then
      return 'C07'; -- Non-READY status does not match the bounded evidence.
    end if;
    if (abs((p_state ->> 'transportMemoryCoverageHours')::numeric - v_coverage)
      <= 0.000000001) is distinct from true
    then
      return 'C08'; -- Non-READY coverage does not match the bounded evidence.
    end if;
    return null;`);
assert.ok(!/return v_status <> 'READY'/.test(definition));
const output = [
  '-- Append-only correction of a read-only Candidate G diagnostic, not the CAS validator.',
  '-- The historical function returned boolean text instead of a fixed reason code.',
  'begin;',
  "set local lock_timeout = '5s';",
  definition,
  'revoke all on function public.ravradar_ravscore_checkpoint_candidate_state_reason(jsonb,text)',
  '  from public, anon, authenticated;',
  "comment on function public.ravradar_ravscore_checkpoint_candidate_state_reason(jsonb,text)",
  "is 'Service-role-only fixed reason codes for the unchanged Candidate G state validator.';",
  "notify pgrst, 'reload schema';",
  'commit;',
  '',
].join('\n\n').trimEnd() + '\n';
const mode = process.argv[2] ?? '--check';
assert.ok(mode === '--write' || mode === '--check', 'Use --write or --check');
if (mode === '--write') await fs.writeFile(destination, output, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), output,
  'Candidate G diagnostic successor is stale');
console.log('Candidate G diagnostic successor matches immutable SQL source.');
