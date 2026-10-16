// Append-only source for the measured native-identity C69 -> I71 -> T12.
// Fixed source expectations are never installation or original-data admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCurrentGridCanonicalSource } from './current-grid-successor-source.mjs';

export const NATIVE_IDENTITY_PREDECESSOR = Object.freeze({
  currentGridVersion: '20261013220000', statisticsVersion: '20261013230000',
  currentGridMigrationSha256: '77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b',
  statisticsMigrationSha256: 'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae',
  canonicalSha256: '52da7ec58df834fb879cab25d26d94da355e8eaaf6c24ce0913199ac8181a894',
  integrated: '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399',
  candidate: 'd192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9',
  continuation: '0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a',
});
// Deliberately NOT caller options, environment values or guessed output pins.
export const NATIVE_IDENTITY_BINDING_REVIEW = Object.freeze({
  migrationVersion: '20261016060000',
  integrated: 'aa1e364bf6a0962725b6633fdc3487c6e626d51373302d7135023547a93c9855',
  candidate: '2786145f7fc812cd658cab3a69927db625c2b8ffb3be81256acedd12288f4010',
  continuation: '15f0eb6748cf0a4f1c9d8971e43efc6823ec7d70c85984e6619e07db277702f1',
  integratedFileCount: 71, candidateFileCount: 69, continuationFileCount: 12,
});
export const NATIVE_IDENTITY_OUTPUT_REVIEW = Object.freeze({
  migrationSha256: '10e26f9d095b6c06eee479eb11d821114b04e4db0dbdb7c6717c13200793f019',
  canonicalSha256: '9a9a71201536ffd7cd3ed724b7d260537c2e63ffd9445fb9d303c900ee9ed07c',
  checkpointContractSha256: '7c5fca1a61300c47bc8ab6102071777314176f6ef3bfd10af44c55465b62fdfa',
  tripBindingPolicySha256: 'dfb46e5d6c7d966d8833ff595f76dbb0f09a2af553630c6fb954ee8c17deffa9',
});
export const NATIVE_IDENTITY_RECOVERY_REVIEW = Object.freeze({
  frozenI71SourceHead: '37e657867ff0f8c31f8e8489e5c9a1cf235192f9',
  frozenI71SourceTree: 'aabcdfd4f81aeba8db448c7b60d87e5212e94cd3',
  frozenI71AdapterSha256: '21f08e71ee3384b7e5d8a9294d356536ce0d866ffc562f7ecf94a4f547f35e77',
  recoveryPrewriteSha256: '6cae30d2c9a09391d2688129a7092a6ae624af8bb7239accf761f54190b17b11',
});
export const NATIVE_IDENTITY_SUCCESSOR_NAME = 'native_sampling_identity_original_bound_successor';
export const NATIVE_IDENTITY_REPLACEMENTS = Object.freeze([
  'ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_payload_valid',
  'ravradar_ravscore_checkpoint_integrated_state_reason',
  'ravradar_ravscore_checkpoint_payload_reason',
  'ravradar_trip_v3_binding_allowed', 'ravradar_ravscore_checkpoint_cas',
  'ravradar_ravscore_checkpoint_contract',
]);
export const NATIVE_IDENTITY_ORIGINAL_NAMES = Object.freeze([
  'ravradar_ravscore_checkpoint_native_identity_i71_state_valid',
  'ravradar_ravscore_checkpoint_native_identity_i71_payload_valid',
]);
export const nativeIdentitySourceSha256 = source => crypto.createHash('sha256').update(source).digest('hex');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHA = /^[a-f0-9]{64}$/;
export function assertNativeIdentityBindingsFrozen() {
  const review = NATIVE_IDENTITY_BINDING_REVIEW;
  if (!/^\d{14}$/.test(review.migrationVersion ?? '')
    || review.migrationVersion <= NATIVE_IDENTITY_PREDECESSOR.statisticsVersion
    || ['integrated', 'candidate', 'continuation'].some(key => !SHA.test(review[key] ?? '')
      || review[key] === NATIVE_IDENTITY_PREDECESSOR[key])
    || ['integratedFileCount', 'candidateFileCount', 'continuationFileCount']
      .some(key => !Number.isSafeInteger(review[key]) || review[key] < 1)) {
    throw Object.assign(new Error('NATIVE_SAMPLING_IDENTITY_BINDING_UNFROZEN'),
      { code: 'NATIVE_SAMPLING_IDENTITY_BINDING_UNFROZEN' });
  }
  return review;
}
export function assertNativeIdentityOutputFrozen() {
  assertNativeIdentityBindingsFrozen();
  if (Object.values(NATIVE_IDENTITY_OUTPUT_REVIEW).some(value => !SHA.test(value ?? ''))) {
    throw new Error('NATIVE_SAMPLING_IDENTITY_SQL_UNFROZEN');
  }
  return NATIVE_IDENTITY_OUTPUT_REVIEW;
}
export function assertNativeIdentityRecoveryFrozen() {
  assertNativeIdentityOutputFrozen();
  const review = NATIVE_IDENTITY_RECOVERY_REVIEW;
  if (!/^[a-f0-9]{40}$/.test(review.frozenI71SourceHead ?? '')
    || !/^[a-f0-9]{40}$/.test(review.frozenI71SourceTree ?? '')
    || !SHA.test(review.frozenI71AdapterSha256 ?? '')
    || !SHA.test(review.recoveryPrewriteSha256 ?? '')) throw new Error('NATIVE_SAMPLING_IDENTITY_RECOVERY_UNFROZEN');
  return review;
}
export function nativeIdentityMigration() {
  const { migrationVersion: version } = assertNativeIdentityBindingsFrozen();
  return Object.freeze({ version, id: version + '_' + NATIVE_IDENTITY_SUCCESSOR_NAME,
    filename: version + '_' + NATIVE_IDENTITY_SUCCESSOR_NAME + '.sql' });
}
export function nativeIdentitySqlDefinition(source, name) {
  const marker = 'create or replace function public.' + name + '(';
  assert.equal(source.split(marker).length, 2, 'One exact native-identity SQL definition required: ' + name);
  const start = source.indexOf(marker), end = source.indexOf('\n$$;', start);
  assert(end > start);
  return source.slice(start, end + 4);
}
function sourceMigrationsDirectory(options) {
  if (options === undefined) return path.join(ROOT, 'supabase/migrations');
  assert(options && Object.getPrototypeOf(options) === Object.prototype);
  assert.deepEqual(Object.keys(options), ['migrationsDirectory'], 'Only the existing exact-byte migration fixture seam');
  assert.equal(typeof options.migrationsDirectory, 'string');
  assert(options.migrationsDirectory.length > 0);
  return path.resolve(options.migrationsDirectory);
}
export async function readNativeIdentityPredecessorSource(options) {
  assertNativeIdentityBindingsFrozen(); // Must precede ALL filesystem work.
  assert(arguments.length <= 1, 'No predecessor or binding override');
  const migrationsDirectory = sourceMigrationsDirectory(options);
  const predecessor = await readCurrentGridCanonicalSource({ migrationsDirectory });
  assert.equal(nativeIdentitySourceSha256(predecessor.canonicalSource), NATIVE_IDENTITY_PREDECESSOR.canonicalSha256);
  const filename = path.join(migrationsDirectory, '20261013230000_account_statistics_revision.sql');
  const stat = await fs.lstat(filename);
  assert(stat.isFile() && !stat.isSymbolicLink());
  const statisticsMigration = (await fs.readFile(filename, 'utf8')).replace(/\r\n?/g, '\n');
  assert.equal(nativeIdentitySourceSha256(statisticsMigration), NATIVE_IDENTITY_PREDECESSOR.statisticsMigrationSha256);
  return Object.freeze({ ...predecessor, statisticsMigration });
}
export async function readNativeIdentityCanonicalSource(options) {
  const pins = assertNativeIdentityOutputFrozen(); // No I/O while unfrozen.
  assert(arguments.length <= 1, 'No source or admission override');
  const migrationsDirectory = sourceMigrationsDirectory(options);
  const { canonicalSource: before, accountSource } = await readNativeIdentityPredecessorSource({ migrationsDirectory });
  const filename = path.join(migrationsDirectory, nativeIdentityMigration().filename);
  const stat = await fs.lstat(filename);
  assert(stat.isFile() && !stat.isSymbolicLink());
  const migration = (await fs.readFile(filename, 'utf8')).replace(/\r\n?/g, '\n');
  assert.equal(nativeIdentitySourceSha256(migration), pins.migrationSha256);
  const names = [...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(match => match[1]);
  assert.deepEqual(names, [...NATIVE_IDENTITY_ORIGINAL_NAMES, ...NATIVE_IDENTITY_REPLACEMENTS]);
  let canonicalSource = before;
  for (const name of NATIVE_IDENTITY_REPLACEMENTS) canonicalSource = canonicalSource.replace(
    nativeIdentitySqlDefinition(before, name), () => nativeIdentitySqlDefinition(migration, name));
  const originals = NATIVE_IDENTITY_ORIGINAL_NAMES.map((name, index) => nativeIdentitySqlDefinition(migration, name)
    + '\nrevoke all on function public.' + name + '(jsonb,' + (index === 0 ? 'text' : 'timestamptz')
    + ') from public, anon, authenticated;').join('\n\n');
  const anchor = nativeIdentitySqlDefinition(canonicalSource, NATIVE_IDENTITY_REPLACEMENTS[0]);
  canonicalSource = canonicalSource.replace(anchor, () => originals + '\n\n' + anchor);
  assert.equal(nativeIdentitySourceSha256(canonicalSource), pins.canonicalSha256);
  let inverse = canonicalSource.replace(originals + '\n\n', '');
  for (const name of [...NATIVE_IDENTITY_REPLACEMENTS].reverse()) inverse = inverse.replace(
    nativeIdentitySqlDefinition(inverse, name), () => nativeIdentitySqlDefinition(before, name));
  assert.equal(inverse, before, 'Whole immutable220 inverse outside the exact nine functions');
  return Object.freeze({ canonicalSource, accountSource });
}
