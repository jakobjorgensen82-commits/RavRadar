// Source/structure only. No PostgreSQL, production seed or JS origin admission.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { assertEstablishedNativeCurrentOriginTransactionBounds, compareEstablishedNativeCurrentOriginSuccessor }
  from './lib/established-native-current-origin-postgres.mjs';
import { requireEstablishedNativeCurrentOriginOutput, establishedNativeCurrentOriginMigration,
  readEstablishedNativeCurrentOriginCanonicalSource, ESTABLISHED_NATIVE_CURRENT_ORIGIN_ALIASES as ALIASES,
  ESTABLISHED_NATIVE_CURRENT_ORIGIN_PROJECTION as PROJECTION }
  from './lib/established-native-current-origin-successor-source.mjs';
import { readCurrentMemoryWarmupCanonicalSource, currentMemoryWarmupDefinition as definition }
  from './lib/current-memory-warmup-successor-source.mjs';

test('native origin phase requires whole issued source and unchanged strict 55s/5s transaction bounds', async () => {
  const pins = requireEstablishedNativeCurrentOriginOutput();
  const sql = await fs.readFile(new URL('../supabase/migrations/' + establishedNativeCurrentOriginMigration().filename,
    import.meta.url), 'utf8');
  assertEstablishedNativeCurrentOriginTransactionBounds(sql);
  assert.throws(() => assertEstablishedNativeCurrentOriginTransactionBounds(sql.replace("statement_timeout = '55s'", "statement_timeout = '54s'")));
  assert.throws(() => assertEstablishedNativeCurrentOriginTransactionBounds(sql.replace("lock_timeout = '5s'", "lock_timeout = '6s'")));
  assert.match(pins.migrationSha256, /^[a-f0-9]{64}$/);
  const source = compareEstablishedNativeCurrentOriginSuccessor.toString();
  assert(source.indexOf('requireEstablishedNativeCurrentOriginOutput()') < source.indexOf('await fs.readFile('));
  for (const phase of ['BEFORE_VERSION', 'BEFORE_CATALOG', 'BEFORE_INVENTORY', 'INSTALL', 'READBACK',
    'SYNTHETIC_IS_NOT_SEED', 'ARTIFICIAL_SQL_SELECTOR', 'PRESERVED']) assert(source.includes("phase = '" + phase + "'"));
});

test('current contract adds exactly three private aliases, 20 to 23 validators and 23 to 26 bodies', async () => {
  const before = await readCurrentMemoryWarmupCanonicalSource(), after = await readEstablishedNativeCurrentOriginCanonicalSource();
  const slots = source => {
    const array = /v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(definition(source, 'ravradar_ravscore_checkpoint_contract'));
    assert(array); return [...array[1].matchAll(/pg_catalog\.to_regprocedure\(/g)].length;
  };
  const bodies = source => (definition(source, 'ravradar_ravscore_checkpoint_contract').match(/\|\| v_[a-z0-9_]+_definition/g) ?? []).length + 1;
  assert.equal(slots(before.canonicalSource), 20); assert.equal(slots(after.canonicalSource), 23);
  assert.equal(bodies(before.canonicalSource), 23); assert.equal(bodies(after.canonicalSource), 26);
  assert.equal(ALIASES.length, 3);
  for (const original of before.originalDefinitions) assert.equal(definition(after.canonicalSource, original.name), original.definition);
  const projection = definition(after.canonicalSource, PROJECTION);
  for (const selector of ['rr-20261016191945-210', '2026-10-16T10:00:00.000Z',
    'd337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb',
    '61297a258de3bd7131c0268d62966cb6eed8463fc886641a07b4e23d071fe503']) assert.equal(projection.split(selector).length, 2);
});

test('artificial selector mechanism is internal and cannot be mistaken for native production admission', async () => {
  const module = await import('./lib/established-native-current-origin-postgres.mjs');
  assert.deepEqual(Object.keys(module).sort(), ['assertEstablishedNativeCurrentOriginTransactionBounds', 'compareEstablishedNativeCurrentOriginSuccessor']);
  const source = await fs.readFile(new URL('./lib/established-native-current-origin-postgres.mjs', import.meta.url), 'utf8');
  for (const text of ['productionSeedAuthenticated: false', 'privateJsAdmissionExercised: false',
    'actualInstalledFunctionsModified: false', 'Synthetic normal0200 is NEVER the actual production seed',
    'Whole projection inverse except explicitly artificial selectors', 'allEightOriginalFunctionsPreserved: true']) assert(source.includes(text));
  assert(!source.includes('productionSeedAuthenticated: true'));
  assert(!source.includes('readEstablishedNativeCurrentSeedOrigin('));
});
