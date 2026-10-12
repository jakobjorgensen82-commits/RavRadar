// Read-only canonical source adapter. Historical migrations are never write targets.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ACCOUNT_ASSISTANT_MIGRATION = Object.freeze({
  version: '20261013210000',
  id: '20261013210000_account_assistant_original_bound_successor',
  filename: '20261013210000_account_assistant_original_bound_successor.sql',
});
const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations');
const CP = 'ravradar_ravscore_checkpoint_';
const PROJECTION = CP + 'account_assistant_predecessor_projection';
const REPLACEMENTS = Object.freeze([
  CP + 'integrated_state_valid', CP + 'payload_valid',
  CP + 'integrated_state_reason', CP + 'payload_reason',
  'ravradar_trip_v3_binding_allowed', CP + 'userdata_predecessor_projection',
  CP + 'predecessor_payload_valid', CP + 'cas', CP + 'contract',
]);
const ACCOUNT_FUNCTIONS = Object.freeze([
  'record_account_activity', 'get_own_statistics_preference',
  'enable_own_statistics_preference', 'disable_own_statistics_preference',
]);
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
function once(text, before, after) {
  assert.equal(text.split(before).length, 2, 'Ambiguous canonical source replacement');
  return text.replace(before, () => after);
}
function definition(source, name) {
  const mark = 'create or replace function public.' + name + '(';
  assert.equal(source.split(mark).length, 2, 'Exact canonical function required: ' + name);
  const start = source.indexOf(mark), end = source.indexOf('\n$$;', start);
  assert(end > start, 'Complete canonical function required: ' + name);
  return source.slice(start, end + 4);
}
export async function readAccountAssistantCanonicalSource({ migrationsDirectory = MIGRATIONS } = {}) {
  const read = async (name, pin) => {
    const source = (await fs.readFile(path.join(migrationsDirectory, name), 'utf8')).replace(/\r\n?/g, '\n');
    assert.equal(sha(source), pin, 'Pinned immutable SQL source: ' + name);
    return source;
  };
  const original = await read('20261010130000_owner_export_origin_bound_successor.sql',
    '55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6');
  // This is the actual CAS predecessor, not the retired body in original130000.
  await read('20261012200000_checkpoint_cas_single_projection_successor.sql',
    'b03605272397585a3e6ad248398ba7bc6d88af506837f76c88a9a92955b48c18');
  const migration = await read(ACCOUNT_ASSISTANT_MIGRATION.filename,
    '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d');
  const actualNames = [...migration.matchAll(/^create (?:or replace )?function public\.([a-z0-9_]+)\(/gm)].map(m => m[1]);
  assert.deepEqual(actualNames, [...ACCOUNT_FUNCTIONS, PROJECTION, ...REPLACEMENTS],
    'Exact sparse migration function inventory');
  let canonicalSource = original;
  for (const name of REPLACEMENTS) {
    canonicalSource = once(canonicalSource, definition(canonicalSource, name), definition(migration, name));
  }
  const projection = definition(migration, PROJECTION)
    + '\nrevoke all on function public.' + PROJECTION + '(jsonb,timestamptz) from public, anon, authenticated;';
  const userdata = definition(canonicalSource, CP + 'userdata_predecessor_projection');
  canonicalSource = once(canonicalSource, userdata, projection + '\n\n' + userdata);
  assert.equal(sha(canonicalSource), '7a2f0490f744c49d9e9f2b7c77a41057d5c6aa420a23e133a04e9ab590b7ead1');
  let inverse = once(canonicalSource, projection + '\n\n', '');
  for (const name of [...REPLACEMENTS].reverse()) {
    inverse = once(inverse, definition(inverse, name), definition(original, name));
  }
  assert.equal(inverse, original, 'Canonical source must preserve all original bytes outside exact definitions');
  const startMarker = '$account_assistant_before$;\n\n';
  assert.equal(migration.split(startMarker).length, 2);
  const start = migration.indexOf(startMarker) + startMarker.length;
  const end = migration.indexOf('create or replace function public.' + PROJECTION + '(', start);
  assert(end > start);
  const accountSource = migration.slice(start, end).trim() + '\n';
  assert.equal(sha(accountSource), 'a049bf058cd9fb849d354170f3eee717cb922d1ffea71e31e429a194179feec8');
  return Object.freeze({ canonicalSource, accountSource });
}
