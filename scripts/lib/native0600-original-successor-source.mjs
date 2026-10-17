// Proposed scripts/lib/native0600-original-successor-source.mjs.
// Frozen predecessor SOURCE only; no current C/I/T builder or installer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readNativeIdentityCanonicalSource, nativeIdentitySqlDefinition as definition }
  from './native-sampling-identity-successor-source.mjs';
import { readCurrentGridCanonicalSource } from './current-grid-successor-source.mjs';
import { buildStatisticsPreferenceRevision } from '../build-statistics-preference-revision.mjs';

export const NATIVE0600_ORIGINAL_PREDECESSOR = Object.freeze({
  version: '20261016060000',
  filename: '20261016060000_native_sampling_identity_original_bound_successor.sql',
  migrationSha256: '10e26f9d095b6c06eee479eb11d821114b04e4db0dbdb7c6717c13200793f019',
  canonicalSha256: '9a9a71201536ffd7cd3ed724b7d260537c2e63ffd9445fb9d303c900ee9ed07c',
  currentGridCanonicalSha256: '52da7ec58df834fb879cab25d26d94da355e8eaaf6c24ce0913199ac8181a894',
  accountSourceSha256: 'a049bf058cd9fb849d354170f3eee717cb922d1ffea71e31e429a194179feec8',
  integrated: 'aa1e364bf6a0962725b6633fdc3487c6e626d51373302d7135023547a93c9855',
  candidate: '2786145f7fc812cd658cab3a69927db625c2b8ffb3be81256acedd12288f4010',
  continuation: '15f0eb6748cf0a4f1c9d8971e43efc6823ec7d70c85984e6619e07db277702f1',
});
// No new migration identity, tuple or SQL output has been issued.
export const NATIVE0600_ORIGINAL_SUCCESSOR_REVIEW = null;
export function requireNative0600OriginalSuccessorFrozen() {
  assert.equal(arguments.length, 0, 'No caller review or source override');
  if (NATIVE0600_ORIGINAL_SUCCESSOR_REVIEW === null)
    throw Object.assign(new Error('NATIVE0600_ORIGINAL_SUCCESSOR_UNISSUED'),
      { code: 'NATIVE0600_ORIGINAL_SUCCESSOR_UNISSUED' });
  // Issuance and the after-reader belong to a later reviewed integration.
  throw new Error('NATIVE0600_ORIGINAL_SUCCESSOR_ISSUANCE_NOT_IMPLEMENTED');
}

const CP = 'ravradar_ravscore_checkpoint_';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATIONS = path.join(ROOT, 'supabase/migrations');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const SQL_INPUTS = Object.freeze([
  ['20261013230000_account_statistics_revision.sql',
    'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae'],
  [NATIVE0600_ORIGINAL_PREDECESSOR.filename, NATIVE0600_ORIGINAL_PREDECESSOR.migrationSha256],
].map(Object.freeze));
const REPLACEMENTS = Object.freeze([
  CP + 'integrated_state_valid', CP + 'payload_valid',
  CP + 'integrated_state_reason', CP + 'payload_reason',
  'ravradar_trip_v3_binding_allowed', CP + 'cas', CP + 'contract',
]);
const NATIVE_ORIGINALS = Object.freeze([
  CP + 'native_identity_i71_state_valid', CP + 'native_identity_i71_payload_valid',
]);
const GRID_ORIGINALS = Object.freeze(['ffc', '249', 'c1ac'].flatMap(family =>
  ['state', 'payload'].map(kind => CP + 'grid_' + family + '_' + kind + '_valid')));
function once(source, before, after) {
  assert.equal(source.split(before).length, 2, 'One whole frozen source hunk required');
  return source.replace(before, () => after);
}
function migrationsDirectory(options) {
  if (options === undefined) return MIGRATIONS;
  assert(options && Object.getPrototypeOf(options) === Object.prototype);
  assert.deepEqual(Object.keys(options), ['migrationsDirectory'],
    'Only the existing exact-byte migrationsDirectory fixture seam');
  assert.equal(typeof options.migrationsDirectory, 'string');
  assert(path.isAbsolute(options.migrationsDirectory), 'Absolute SQL fixture directory required');
  return path.resolve(options.migrationsDirectory);
}

export async function readNative0600OriginalPredecessorSource(options) {
  assert(arguments.length <= 1, 'No caller binding, canonical or validator override');
  const directory = migrationsDirectory(options), sources = new Map();
  for (const [filename, digest] of SQL_INPUTS) {
    const file = path.join(directory, filename), stat = await fs.lstat(file);
    assert(stat.isFile() && !stat.isSymbolicLink(), 'Regular immutable SQL required: ' + filename);
    const bytes = await fs.readFile(file);
    assert.equal(sha(bytes), digest, 'Whole raw frozen SQL mismatch: ' + filename);
    sources.set(filename, bytes);
  }
  // The older chain keeps its existing exact canonical-LF reader semantics.
  // This phase independently pins the complete raw230/0600 source bytes.
  // These genuine readers select immutable SQL, not live model builders.
  const fixture = { migrationsDirectory: directory };
  const current = await readNativeIdentityCanonicalSource(fixture);
  const grid = await readCurrentGridCanonicalSource(fixture);
  const old = NATIVE0600_ORIGINAL_PREDECESSOR;
  assert.equal(sha(current.canonicalSource), old.canonicalSha256);
  assert.equal(sha(grid.canonicalSource), old.currentGridCanonicalSha256);
  assert.equal(sha(current.accountSource), old.accountSourceSha256);
  assert.equal(current.accountSource, grid.accountSource);
  const migration = sources.get(old.filename).toString('utf8');
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)]
    .map(match => match[1]), [...NATIVE_ORIGINALS, ...REPLACEMENTS]);
  const originals = NATIVE_ORIGINALS.map((name, index) => definition(migration, name)
    + '\nrevoke all on function public.' + name + '(jsonb,'
    + (index === 0 ? 'text' : 'timestamptz') + ') from public, anon, authenticated;').join('\n\n');
  let inverse = once(current.canonicalSource, originals + '\n\n', '');
  for (const name of [...REPLACEMENTS].reverse())
    inverse = once(inverse, definition(inverse, name), definition(grid.canonicalSource, name));
  assert.equal(inverse, grid.canonicalSource, 'Whole native0600 inverse to the genuine frozen220 canonical');
  for (const name of GRID_ORIGINALS)
    assert.equal(definition(current.canonicalSource, name), definition(grid.canonicalSource, name));
  for (const name of NATIVE_ORIGINALS)
    assert.equal(definition(current.canonicalSource, name), definition(migration, name));
  const statistics = await buildStatisticsPreferenceRevision(fixture);
  const statisticsBytes = sources.get('20261013230000_account_statistics_revision.sql');
  assert.deepEqual(Buffer.from(statistics.migration), statisticsBytes, 'Whole genuine230 renderer equality');
  assert.equal(statistics.afterExpected.schemaVersion, 2);
  assert.equal(statistics.accountPrefixSha256, old.accountSourceSha256);
  // Recheck the frozen inputs after the normal readers; no SQL is executed.
  for (const [filename] of SQL_INPUTS)
    assert.deepEqual(await fs.readFile(path.join(directory, filename)), sources.get(filename));
  return Object.freeze({
    kind: 'NATIVE0600_ORIGINAL_FROZEN_PREDECESSOR_SOURCE', admission: 'NO_ADMISSION',
    predecessor: old, canonicalSource: current.canonicalSource, accountSource: current.accountSource,
    inverseCanonicalSha256: sha(inverse), statisticsSchemaVersion: 2,
    statisticsMigration: statistics.migration, statisticsExpected: statistics.afterExpected,
    originalDefinitions: Object.freeze([...GRID_ORIGINALS, ...NATIVE_ORIGINALS]
      .map(name => Object.freeze({ name, definition: definition(current.canonicalSource, name) }))),
    canonicalIssuer: false, installation: false,
  });
}
