// Exact read-only source view for the append-only current-grid successor.
// Historical SQL and original-family validator literals are never retagged.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAccountAssistantCanonicalSource } from './account-assistant-successor-source.mjs';

export const CURRENT_GRID_MIGRATION = Object.freeze({
  version: '20261013220000',
  id: '20261013220000_current_grid_original_bound_successor',
  filename: '20261013220000_current_grid_original_bound_successor.sql',
});
const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations');
const CP = 'ravradar_ravscore_checkpoint_';
const REPLACEMENTS = Object.freeze([
  CP + 'integrated_state_valid', CP + 'payload_valid',
  CP + 'integrated_state_reason', CP + 'payload_reason',
  'ravradar_trip_v3_binding_allowed', CP + 'cas', CP + 'contract',
]);
const ORIGINALS = Object.freeze(['ffc', '249', 'c1ac'].flatMap(family =>
  ['state', 'payload'].map(kind => Object.freeze({
    name: CP + 'grid_' + family + '_' + kind + '_valid',
    signature: 'public.' + CP + 'grid_' + family + '_' + kind
      + '_valid(jsonb,' + (kind === 'state' ? 'text' : 'timestamptz') + ')',
  }))));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function once(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Exact unique current-grid source hunk required');
  return source.replace(before, () => after);
}
function definition(source, name) {
  const marker = 'create or replace function public.' + name + '(';
  assert.equal(source.split(marker).length, 2, 'Exact complete current-grid function required: ' + name);
  const start = source.indexOf(marker), end = source.indexOf('\n$$;', start);
  assert(end > start);
  return source.slice(start, end + 4);
}
export async function readCurrentGridCanonicalSource({ migrationsDirectory = MIGRATIONS } = {}) {
  // Preserve the existing readback fixture-directory seam, not a caller-supplied
  // binding, payload, SQL query, or database-admission override.
  const { canonicalSource: predecessor, accountSource } =
    await readAccountAssistantCanonicalSource({ migrationsDirectory });
  assert.equal(sha(predecessor), '7a2f0490f744c49d9e9f2b7c77a41057d5c6aa420a23e133a04e9ab590b7ead1');
  assert.equal(sha(accountSource), 'a049bf058cd9fb849d354170f3eee717cb922d1ffea71e31e429a194179feec8');
  const filename = path.join(migrationsDirectory, CURRENT_GRID_MIGRATION.filename);
  const stat = await fs.lstat(filename);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Regular non-symlink current-grid migration required');
  const migration = (await fs.readFile(filename, 'utf8')).replace(/\r\n?/g, '\n');
  assert.equal(sha(migration), 'f283e36f55cb69f8d8271a560a04adeb5cde1e93777b52b96677148e1d2e060b',
    'Immutable current-grid migration hash drifted');
  const names = [...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)]
    .map(match => match[1]);
  assert.deepEqual(names, [...ORIGINALS.map(row => row.name), ...REPLACEMENTS],
    'Exact thirteen-function sparse current-grid migration');
  let canonicalSource = predecessor;
  for (const name of REPLACEMENTS) {
    canonicalSource = once(canonicalSource, definition(canonicalSource, name), definition(migration, name));
  }
  const originals = ORIGINALS.map(row => definition(migration, row.name)
    + '\nrevoke all on function ' + row.signature + ' from public, anon, authenticated;').join('\n\n');
  const anchor = definition(canonicalSource, CP + 'integrated_state_valid');
  canonicalSource = once(canonicalSource, anchor, originals + '\n\n' + anchor);
  assert.equal(sha(canonicalSource), '055868fb1991eedd5e83e84abaab727c3b188a8559afda2edb66558981fdc2b5');
  let inverse = once(canonicalSource, originals + '\n\n', '');
  for (const name of [...REPLACEMENTS].reverse()) {
    inverse = once(inverse, definition(inverse, name), definition(predecessor, name));
  }
  assert.equal(inverse, predecessor, 'Whole 213 canonical inverse outside six original validators and seven replacements');
  return Object.freeze({ canonicalSource, accountSource });
}
