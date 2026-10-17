// Source/structure only. No PostgreSQL, production seed or JS origin admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { runInNewContext } from 'node:vm';
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

test('catalog-returned artificial attempt DDL has an explicit statement boundary and reverse cleanup', async () => {
  const source = (await fs.readFile(new URL('./lib/established-native-current-origin-postgres.mjs', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  const preambleStart = source.indexOf("const CP = 'ravradar_ravscore_checkpoint_'");
  const preambleEnd = source.indexOf('\nexport function assertEstablishedNativeCurrentOriginTransactionBounds', preambleStart);
  const functionStart = source.indexOf('async function artificialSelectorMechanics(');
  const functionEnd = source.indexOf('\nexport async function compareEstablishedNativeCurrentOriginSuccessor(', functionStart);
  assert(preambleStart >= 0 && preambleEnd > preambleStart && functionStart > preambleEnd && functionEnd > functionStart);
  const preamble = source.slice(preambleStart, preambleEnd);
  const fullInternalFunctions = source.slice(functionStart, functionEnd);
  const after = await readEstablishedNativeCurrentOriginCanonicalSource();
  const metadata = { datasetId: 'synthetic-catalog-boundary-only', referenceAt: '2026-10-03T01:00:00.000Z',
    generationSha256: 'c'.repeat(64), candidateStateSha256: 'd'.repeat(64) };
  // pg_get_functiondef's catalog result ends at its dollar delimiter plus
  // newline, without a SQL statement semicolon. This is a synthetic DDL-shape
  // fixture, not a PostgreSQL execution, payload or production seed proof.
  const catalogDdl = "CREATE OR REPLACE FUNCTION public.native_checkpoint_attempt(p_baseline boolean,p_expected bigint,p_payload jsonb)\n"
    + " RETURNS jsonb LANGUAGE plpgsql AS $function$\nBEGIN\n"
    + "RETURN public.ravradar_ravscore_checkpoint_cas(p_expected,(p_payload->>'productionReferenceAt')::timestamptz,p_payload);\n"
    + "END\n$function$";
  const expectedDrops = [
    'drop function if exists public.native_origin_fixture_attempt(boolean,bigint,jsonb);',
    'drop function if exists public.native_origin_fixture_cas(bigint,timestamptz,jsonb);',
    'drop function if exists public.native_origin_fixture_projection(jsonb,timestamptz);',
  ];
  async function exercise(functions, catalogSuffix) {
    const execute = runInNewContext(preamble + '\n' + functions + '\nartificialSelectorMechanics;',
      { assert, crypto, definition, PROJECTION });
    const calls = [], drops = [];
    let caseIndex = 0;
    const psql = async sql => {
      calls.push(sql);
      if (sql.startsWith("select jsonb_build_object('datasetId'")) return JSON.stringify(metadata);
      if (sql === "select pg_get_functiondef('public.native_checkpoint_attempt(boolean,bigint,jsonb)'::regprocedure);") return catalogDdl + catalogSuffix;
      if (sql.startsWith("select to_regprocedure('public.native_origin_fixture_")) return 't';
      if (sql.startsWith('create or replace function public.native_origin_fixture_projection(')) {
        // A boundary check, deliberately not a pretend SQL parser or server.
        assert.match(sql, /\$function\$(?:\s*;)+\s*revoke all on function public\.native_origin_fixture_projection/i,
          'Catalog-returned DDL must end before the following ACL statement');
        assert.equal((sql.match(/RETURN public\.native_origin_fixture_cas\(/g) ?? []).length, 1);
        assert(!sql.includes('RETURN public.ravradar_ravscore_checkpoint_cas('));
        return '';
      }
      if (sql.startsWith('select public.native_origin_fixture_projection')) return 't';
      if (sql.startsWith('truncate public.admin_documents;')) {
        const sqlstate = [null, '23505', '40001', null][caseIndex++];
        const previous = { version: 1, ownerIsNull: false };
        return JSON.stringify({ sqlstate, previous,
          result: sqlstate ? null : { disposition: 'updated', centralVersion: 2 },
          stored: sqlstate ? { ...previous, storedPayloadMatchesIncoming: false }
            : { version: 2, ownerIsNull: true, storedPayloadMatchesIncoming: true } });
      }
      if (sql.startsWith('drop function if exists public.')) { drops.push(sql); return ''; }
      assert.fail('Unexpected synthetic selector query category');
    };
    try {
      const result = await execute({ psql, after, atHour: () => metadata.referenceAt });
      assert.equal(result.reports.length, 4);
      assert.equal(result.productionSeedAuthenticated, false);
      assert.equal(result.actualInstalledFunctionsModified, false);
      assert.equal(result.privateJsAdmissionExercised, false);
      assert.equal(caseIndex, 4);
      return calls;
    } finally {
      assert.deepEqual(drops, expectedDrops, 'Both success and rejected CREATE clean up only their three owned functions in reverse order');
    }
  }
  await exercise(fullInternalFunctions, '\n');
  await exercise(fullInternalFunctions, ';\n');
  const fixedBoundary = " + attempt + ';\\n' + functions.map";
  const missingBoundary = " + attempt + '\\n' + functions.map";
  assert.equal(fullInternalFunctions.split(fixedBoundary).length, 2);
  await assert.rejects(exercise(fullInternalFunctions.replace(fixedBoundary, missingBoundary), '\n'),
    /Catalog-returned DDL must end before the following ACL statement/);
});
