// Native TEST phase only, after the genuine frozen0200 phase in the existing
// owned Unix-socket PostgreSQL host. Never an installer or origin issuer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESTABLISHED_NATIVE_CURRENT_ORIGIN_BEFORE as OLD,
  ESTABLISHED_NATIVE_CURRENT_ORIGIN_ALIASES as ALIASES,
  ESTABLISHED_NATIVE_CURRENT_ORIGIN_REPLACEMENTS as REPLACEMENTS,
  ESTABLISHED_NATIVE_CURRENT_ORIGIN_PROJECTION as PROJECTION,
  requireEstablishedNativeCurrentOriginBinding, requireEstablishedNativeCurrentOriginOutput,
  establishedNativeCurrentOriginMigration, readEstablishedNativeCurrentOriginCanonicalSource }
  from './established-native-current-origin-successor-source.mjs';
import { readCurrentMemoryWarmupCanonicalSource, currentMemoryWarmupDefinition as definition }
  from './current-memory-warmup-successor-source.mjs';
import { currentMemoryWarmupPreservationInventorySql } from './current-memory-warmup-postgres.mjs';
import { expectedCheckpointCasContract, expectedTripBindingPolicy } from '../integrated-cutover-readiness.mjs';
import { verifyStatisticsPreferenceRevisionCatalogMetadata, statisticsPreferenceRevisionCatalogQuery }
  from '../verify-account-assistant-schema.mjs';
import { restoreProtectedRavScoreContinuationCheckpoint } from '../protected-ravscore-continuation-checkpoint.mjs';
import { RAVSCORE_CONTINUATION_CHECKPOINT_POLICY } from '../ravscore-continuation-checkpoint.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CP = 'ravradar_ravscore_checkpoint_', CAS = 'public.' + CP + 'cas';
const KEY = 'ravscore-continuation-checkpoint', PREFIX = 'origin-current-';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const body = value => value.slice(value.indexOf('as $$') + 5, value.lastIndexOf('$$;')).trim();
const literal = value => { assert.equal(typeof value, 'string'); assert(!value.includes("'")); return "'" + value + "'"; };
const once = (source, before, after) => { assert.equal(source.split(before).length, 2); return source.replace(before, () => after); };
const SEED = Object.freeze({ datasetId: 'rr-20261016191945-210', referenceAt: '2026-10-16T10:00:00.000Z',
  generationSha256: 'd337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb',
  candidateStateSha256: '61297a258de3bd7131c0268d62966cb6eed8463fc886641a07b4e23d071fe503' });

export function assertEstablishedNativeCurrentOriginTransactionBounds(sql) {
  assert.equal(typeof sql, 'string');
  assert.match(sql, /begin;\n\nset local statement_timeout = '55s';\n\nset local lock_timeout = '5s';/);
}

// Whole per-row SHA256/bytes, not a large combined JSONB payload or MD5.
function accountRowsSql() {
  return "with rows as (select 'activity' as t,convert_to(to_jsonb(x)::text,'UTF8') as b from public.account_activity_journal x"
    + " union all select 'preference',convert_to(to_jsonb(x)::text,'UTF8') from public.account_statistics_preferences x)"
    + ", fingerprints as (select t,encode(extensions.digest(b,'sha256'),'hex') as h,octet_length(b) as n from rows)"
    + " select jsonb_build_array(t,h,n,count(*))::text from fingerprints group by t,h,n"
    + " order by t collate \"C\",h collate \"C\",n;";
}
const catalogSql = names => "select jsonb_object_agg(requested.name,jsonb_build_object('properties',to_jsonb(p)-array['prosrc','prosqlbody'],"
  + "'body',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex')))"
  + ' from pg_proc p join pg_namespace n on n.oid=p.pronamespace join (values '
  + names.map(name => '(' + literal(name) + ')').join(',')
  + ") requested(name) on p.proname=requested.name::pg_catalog.name where n.nspname='public';";

// The selector below is deliberately ARTIFICIAL SQL ONLY. It copies the whole
// installed function bodies into three separately named test functions and
// changes ONLY four exact seed selector literals and those private call names.
// It NEVER changes the actual installed migration/functions, any JS reader,
// fixed production seed, native handle or production B/S admission.
async function artificialSelectorMechanics({ psql, after, atHour }) {
  const projectionName = 'native_origin_fixture_projection', casName = 'native_origin_fixture_cas';
  const attemptName = 'native_origin_fixture_attempt';
  const metadata = JSON.parse(await psql("select jsonb_build_object('datasetId',payload->>'datasetId',"
    + "'referenceAt',payload->>'productionReferenceAt','generationSha256',payload->>'generationSha256',"
    + "'candidateStateSha256',payload#>>'{candidateGRollbackCompanion,stateSha256}')"
    + " from public.native_checkpoint_payloads where name='after0600-same';"));
  assert.notDeepEqual(metadata, SEED, 'Synthetic normal0200 is NEVER the actual production seed');
  for (const key of Object.keys(SEED)) assert.equal(typeof metadata[key], 'string');
  const originalProjection = definition(after.canonicalSource, PROJECTION);
  let projection = once(originalProjection, 'function public.' + PROJECTION + '(', 'function public.' + projectionName + '(');
  for (const key of Object.keys(SEED)) projection = once(projection, literal(SEED[key]), literal(metadata[key]));
  let inverse = projection;
  for (const key of [...Object.keys(SEED)].reverse()) inverse = once(inverse, literal(metadata[key]), literal(SEED[key]));
  inverse = once(inverse, 'function public.' + projectionName + '(', 'function public.' + PROJECTION + '(');
  assert.equal(inverse, originalProjection, 'Whole projection inverse except explicitly artificial selectors');
  const originalCas = definition(after.canonicalSource, CP + 'cas');
  let cas = once(originalCas, 'function ' + CAS + '(', 'function public.' + casName + '(');
  cas = once(cas, 'public.' + PROJECTION + '(', 'public.' + projectionName + '(');
  assert.equal(once(once(cas, 'public.' + projectionName + '(', 'public.' + PROJECTION + '('),
    'function public.' + casName + '(', 'function ' + CAS + '('), originalCas);
  const originalAttempt = await psql("select pg_get_functiondef('public.native_checkpoint_attempt(boolean,bigint,jsonb)'::regprocedure);");
  let attempt = once(originalAttempt, 'FUNCTION public.native_checkpoint_attempt(', 'FUNCTION public.' + attemptName + '(');
  attempt = once(attempt, CAS + '(', 'public.' + casName + '(');
  assert.equal(once(once(attempt, 'public.' + casName + '(', CAS + '('),
    'FUNCTION public.' + attemptName + '(', 'FUNCTION public.native_checkpoint_attempt('), originalAttempt);
  const functions = [[projectionName, '(jsonb,timestamptz)'], [casName, '(bigint,timestamptz,jsonb)'],
    [attemptName, '(boolean,bigint,jsonb)']];
  for (const [name, signature] of functions) assert.equal(await psql("select to_regprocedure('public." + name + signature + "') is null;"), 't');
  const reports = [];
  try {
    await psql(projection + '\n' + cas + '\n' + attempt + ';\n' + functions.map(([name, signature]) =>
      'revoke all on function public.' + name + signature + ' from public,anon,authenticated;').join('\n')
      + '\nalter function public.' + casName + "(bigint,timestamptz,jsonb) set statement_timeout='55s';"
      + '\ngrant execute on function public.' + attemptName + '(boolean,bigint,jsonb) to service_role;');
    assert.equal(await psql('select public.' + projectionName
      + "((select payload from native_checkpoint_payloads where name='after0600-same'),'" + atHour(49) + "') is not null;"), 't');
    for (const [name, incoming, version, code, disposition, storedVersion] of [
      ['artificial-same-metadata', 'same', 1, null, 'updated', 2],
      ['artificial-same-numeric-change', 'changed', 1, '23505', null, 1],
      ['artificial-version-refusal', 'same', 0, '40001', null, 1],
      ['artificial-newer', 'newer', 1, null, 'updated', 2],
    ]) {
      const observed = JSON.parse(await psql(reset('after0600-same')
        + "set request.jwt.claim.role='service_role';set role service_role;select public." + attemptName
        + '(false,' + version + ",(select payload from native_checkpoint_payloads where name='" + PREFIX + incoming + "'));"));
      assertObserved(observed, code, disposition, storedVersion);
      reports.push({ case: name, sqlstate: code, disposition, storedVersion, artificialSelectorOnly: true });
    }
  } finally {
    for (const [name, signature] of [...functions].reverse()) await psql('drop function if exists public.' + name + signature + ';');
  }
  return { kind: 'ARTIFICIAL_SELECTOR_SQL_MECHANICS_ONLY', productionSeedAuthenticated: false,
    actualInstalledFunctionsModified: false, privateJsAdmissionExercised: false, reports };
}
function reset(central) {
  return 'truncate public.admin_documents;' + (central ? "insert into public.admin_documents(document_key,payload,version,updated_by)"
    + " select '" + KEY + "',payload,1,'00000000-0000-0000-0000-000000000001'"
    + " from public.native_checkpoint_payloads where name='" + central + "';" : '');
}
function assertObserved(observed, code, disposition, storedVersion) {
  assert.equal(observed.sqlstate, code); assert.equal(observed.stored.version, storedVersion);
  if (disposition) { assert.equal(observed.result.disposition, disposition); assert.equal(observed.result.centralVersion, storedVersion); }
  if (code || disposition === 'unchanged') {
    const { storedPayloadMatchesIncoming, ...stored } = observed.stored;
    assert.deepEqual(stored, observed.previous); assert.equal(stored.ownerIsNull, false);
  } else { assert.equal(observed.stored.ownerIsNull, true); assert.equal(observed.stored.storedPayloadMatchesIncoming, true); }
}

export async function compareEstablishedNativeCurrentOriginSuccessor({ psql, runSql, root, sourceDocumentAt, atHour, saveCheckpoint }) {
  let phase = 'SOURCE';
  try {
    const NEXT = requireEstablishedNativeCurrentOriginBinding(), PINS = requireEstablishedNativeCurrentOriginOutput();
    const before = await readCurrentMemoryWarmupCanonicalSource(), after = await readEstablishedNativeCurrentOriginCanonicalSource();
    const migration = establishedNativeCurrentOriginMigration(), sql = await fs.readFile(path.join(ROOT, 'supabase/migrations', migration.filename), 'utf8');
    assert.equal(sha(sql), PINS.migrationSha256); assert.equal(sha(before.canonicalSource), OLD.canonicalSha256);
    assert.equal(sha(after.canonicalSource), PINS.canonicalSha256); assertEstablishedNativeCurrentOriginTransactionBounds(sql);
    const expected = { checkpoint: await expectedCheckpointCasContract({ sourcePhase: 'established-native-current-origin' }),
      trip: await expectedTripBindingPolicy({ sourcePhase: 'established-native-current-origin' }) };
    assert.equal(expected.checkpoint.sha256, PINS.checkpointContractSha256); assert.equal(expected.trip.sha256, PINS.tripBindingPolicySha256);
    phase = 'BEFORE_VERSION'; assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'), OLD.version);
    const names = [...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row => row[1]);
    const allNames = [...names, ...ALIASES.map(row => row.name)];
    assert.equal(new Set(allNames).size, names.length + 3);
    const contractSource = definition(after.canonicalSource, CP + 'contract');
    const validatorArray = /v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contractSource);
    assert(validatorArray); assert.equal((validatorArray[1].match(/pg_catalog\.to_regprocedure\(/g) ?? []).length, 23);
    assert.equal((contractSource.match(/\|\| v_[a-z0-9_]+_definition/g) ?? []).length + 1, 26);
    phase = 'BEFORE_CATALOG'; const catalogBefore = JSON.parse(await psql(catalogSql(names)));
    assert.deepEqual(Object.keys(catalogBefore).sort(), [...names].sort());
    for (const name of names) assert.equal(catalogBefore[name].body, sha(body(definition(before.canonicalSource, name))));
    const accountCatalogBefore = await psql(statisticsPreferenceRevisionCatalogQuery);
    assert.equal((await verifyStatisticsPreferenceRevisionCatalogMetadata(JSON.parse(accountCatalogBefore))).schemaVersion, 2);
    phase = 'BEFORE_INVENTORY'; const preservedSql = currentMemoryWarmupPreservationInventorySql('preserved');
    const preserved = await psql(preservedSql);
    const archivePins = new Map(await Promise.all((await fs.readdir(path.join(ROOT, 'supabase/migrations')))
      .filter(name => name.endsWith('.sql')).map(async name => [name, sha(await fs.readFile(path.join(ROOT, 'supabase/migrations', name)))])));
    const guards = [
      ["delete from supabase_migrations.schema_migrations where version='" + OLD.version + "';", "insert into supabase_migrations.schema_migrations values('" + OLD.version + "');"],
      ["delete from supabase_migrations.schema_migrations where version='20261013230000';", "insert into supabase_migrations.schema_migrations values('20261013230000');"],
      ["insert into supabase_migrations.schema_migrations values('20990101000000');", "delete from supabase_migrations.schema_migrations where version='20990101000000';"],
      ['alter function ' + CAS + '(bigint,timestamptz,jsonb) security invoker;', 'alter function ' + CAS + '(bigint,timestamptz,jsonb) security definer;'],
      ['alter function ' + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='54s';", 'alter function ' + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
      ['revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from service_role;', 'grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to service_role;'],
      ['grant execute on function public.' + CP + 'native_identity_i71_payload_valid(jsonb,timestamptz) to authenticated;',
        'revoke execute on function public.' + CP + 'native_identity_i71_payload_valid(jsonb,timestamptz) from authenticated;'],
      ['create function public.' + PROJECTION + '(jsonb,timestamptz) returns jsonb language sql as $$select null::jsonb$$;',
        'drop function public.' + PROJECTION + '(jsonb,timestamptz);'],
    ];
    for (const [index, [drift, restore]] of guards.entries()) {
      phase = 'GUARD_' + index; await psql(drift); assert.notEqual((await runSql(sql)).code, 0); await psql(restore);
      assert.equal(await psql(preservedSql), preserved); assert.deepEqual(JSON.parse(await psql(catalogSql(names))), catalogBefore);
      for (const alias of ALIASES) assert.equal(await psql("select to_regprocedure('public." + alias.name + alias.signature + "') is null;"), 't');
    }
    phase = 'INSTALL'; await psql(sql);
    assert.equal(await psql("select current_setting('lock_timeout');"), '0'); assert.equal(await psql(preservedSql), preserved);
    assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery), accountCatalogBefore);
    await psql("insert into supabase_migrations.schema_migrations values('" + migration.version + "');");
    assert.notEqual((await runSql(sql)).code, 0, 'No replay after installed version');
    const catalogAfter = JSON.parse(await psql(catalogSql(allNames)));
    for (const name of names) {
      assert.equal(catalogAfter[name].body, sha(body(definition(after.canonicalSource, name))));
      assert.deepEqual(catalogAfter[name].properties, catalogBefore[name].properties, 'Old OID/ACL/owner/all native properties preserved');
      if (!REPLACEMENTS.includes(name)) assert.deepEqual(catalogAfter[name], catalogBefore[name]);
    }
    for (const alias of ALIASES) {
      assert.equal(catalogAfter[alias.name].body, sha(body(definition(after.canonicalSource, alias.name))));
      assert.equal(await psql("select not has_function_privilege('anon','public." + alias.name + alias.signature
        + "','EXECUTE') and not has_function_privilege('authenticated','public." + alias.name + alias.signature + "','EXECUTE');"), 't');
    }
    for (const original of before.originalDefinitions) assert.equal(definition(after.canonicalSource, original.name), original.definition);
    phase = 'READBACK'; const contract = JSON.parse(await psql("set request.jwt.claim.role='service_role';set role service_role;select public." + CP + 'contract();'));
    assert.deepEqual(contract.checkpointContract, { id: expected.checkpoint.id, definition: expected.checkpoint.definition });
    assert(Object.values(contract.checks).every(value => value === true));
    const trip = await psql("select (select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_score_quality_allowed(text,jsonb)'::regprocedure)"
      + "||E'\\n-- calibration-truth-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure)"
      + "||E'\\n-- binding-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure);");
    assert.equal(sha(trip), PINS.tripBindingPolicySha256);
    phase = 'CURRENT_FIXTURES'; const current = {};
    for (const [name, hour, options] of [['same', 49, {}], ['newer', 50, {}], ['changed', 49, { candidateCurrentSpeedMps: 0.18 }]]) {
      const sourcePath = path.join(root, PREFIX + name + '-source.json'), checkpointPath = path.join(root, PREFIX + name + '-checkpoint.json');
      // Only NEW current fixtures are made here. OLD0200 rows were produced by
      // the preceding unchanged frozen0200 phase, never by this new factory.
      await fs.writeFile(sourcePath, JSON.stringify(sourceDocumentAt(hour, 'rr-native-identity-' + hour, options)), { flag: 'wx' });
      await saveCheckpoint({ sourcePath, checkpointPath });
      const payload = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      assert.equal(payload.partCount, 673); assert.equal(Object.keys(payload.states).length, 673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length, 673);
      assert.equal(payload.modelBinding.modelBundleSha256, NEXT.I); assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256, NEXT.C);
      assert.equal(payload.continuationStateContractSha256, NEXT.T);
      const text = JSON.stringify(payload); assert(!text.includes('$origin_fixture$'));
      await psql("insert into native_checkpoint_payloads values('" + PREFIX + name + "',$origin_fixture$" + text + '$origin_fixture$::jsonb);');
      assert.equal(await psql('select public.' + CP + "payload_valid((select payload from native_checkpoint_payloads where name='" + PREFIX + name + "'),'" + atHour(hour) + "');"), 't');
      current[name] = payload;
    }
    phase = 'SYNTHETIC_IS_NOT_SEED';
    assert.equal(await psql('select public.' + CP + "cmw0200_payload_valid((select payload from native_checkpoint_payloads where name='after0600-same'),'" + atHour(49) + "');"), 't');
    assert.equal(await psql('select public.' + PROJECTION + "((select payload from native_checkpoint_payloads where name='after0600-same'),'" + atHour(49) + "') is null;"), 't');
    phase = 'NORMAL_JSONB_ROUNDTRIP';
    const size = Number(await psql("select octet_length(convert_to(payload::text,'UTF8')) from native_checkpoint_payloads where name='" + PREFIX + "same';"));
    assert(Number.isSafeInteger(size) && size > 0 && size <= RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes);
    const chunks = [];
    for (let offset = 1; offset <= size; offset += 262144) chunks.push(Buffer.from((await psql("select encode(substring(convert_to(payload::text,'UTF8') from "
      + offset + " for 262144),'base64') from native_checkpoint_payloads where name='" + PREFIX + "same';")).replace(/\s/g, ''), 'base64'));
    const bytes = Buffer.concat(chunks); assert.equal(bytes.length, size); const payload = JSON.parse(bytes.toString('utf8'));
    assert.deepEqual(payload, current.same); assert.notEqual(JSON.stringify(payload), JSON.stringify(current.same));
    const checkpointPath = path.join(root, 'origin-jsonb/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    const request = async () => [{ document_key: KEY, payload, version: 1 }];
    const restored = await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath, targetReference: atHour(49), request });
    assert.equal(restored.restored, true); assert.equal(restored.objectMemberOrderRestored, true);
    const restoredBytes = await fs.readFile(checkpointPath); assert.deepEqual(JSON.parse(restoredBytes), current.same);
    assert.equal((await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath, targetReference: atHour(49), request })).reason, 'protected-checkpoint-equivalent');
    assert.deepEqual(await fs.readFile(checkpointPath), restoredBytes);
    const reports = [], cases = [
      ['equal-retry', PREFIX + 'same', PREFIX + 'same', 0, null, 'unchanged', 1],
      ['same-current-numeric-change', PREFIX + 'same', PREFIX + 'changed', 1, '23505', null, 1],
      ['newer-current', PREFIX + 'same', PREFIX + 'newer', 1, null, 'updated', 2],
      ['wrong-version', PREFIX + 'same', PREFIX + 'newer', 0, '40001', null, 1],
      ['regression', PREFIX + 'newer', PREFIX + 'same', 1, '22023', null, 1],
      ['synthetic0200-is-not-seed-same', 'after0600-same', PREFIX + 'same', 1, '22023', null, 1],
      ['synthetic0200-is-not-seed-newer', 'after0600-same', PREFIX + 'newer', 1, '22023', null, 1],
    ];
    for (const [family, central] of [['i994', 'grid-current'], ...['ffc', '249', 'c1ac'].map(family => [family, 'original-' + family])])
      cases.push(['newer-' + family, central, PREFIX + 'newer', 1, null, 'updated', 2], ['same-' + family, central, PREFIX + 'same', 1, '22023', null, 1]);
    const bank = await psql(currentMemoryWarmupPreservationInventorySql('original-bank')), account = await psql(accountRowsSql());
    for (const [name, central, incoming, version, code, disposition, storedVersion] of cases) {
      phase = 'CASE_' + name.toUpperCase().replaceAll('-', '_');
      const observed = JSON.parse(await psql(reset(central)
        + "set statement_timeout='55s';set request.jwt.claim.role='service_role';set role service_role;select public.native_checkpoint_attempt(false,"
        + version + ",(select payload from native_checkpoint_payloads where name='" + incoming + "'));"));
      assertObserved(observed, code, disposition, storedVersion); reports.push({ case: name, sqlstate: code, disposition, storedVersion });
    }
    phase = 'ARTIFICIAL_SQL_SELECTOR'; const artificial = await artificialSelectorMechanics({ psql, after, atHour });
    phase = 'PRESERVED'; assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')), bank);
    assert.equal(await psql(accountRowsSql()), account); assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery), accountCatalogBefore);
    assert.equal(await psql('select count(*) from admin_document_versions;'), '0');
    assert.deepEqual(JSON.parse(await psql(catalogSql(allNames))), catalogAfter);
    for (const [file, pin] of archivePins) assert.equal(sha(await fs.readFile(path.join(ROOT, 'supabase/migrations', file))), pin);
    return { kind: 'ESTABLISHED_NATIVE_CURRENT_ORIGIN_SUCCESSOR', sqlExecuted: true, wholeMigrationExecuted: true,
      migrationVersion: migration.version, partCount: 673, checkpointOidSlots: 23, contractBodies: 26,
      oldFunctionsAndOidsPreserved: true, allEightOriginalFunctionsPreserved: true, privateAliases: 3,
      beforeGuardCases: guards.length, exactCheckpointContract: true, exactTripContract: true,
      schema2Catalog: true, normalProtectedJsonbRoundtrip: true, originalDigestsPreserved: true,
      productionSeedAuthenticated: false, synthetic0200CorrectlyRefusedAsSeed: true, artificial, reports };
  } catch (error) {
    console.error(JSON.stringify({ kind: 'ESTABLISHED_NATIVE_CURRENT_ORIGIN_NATIVE_FIRST_FAILURE', phase,
      category: error?.code === 'ERR_ASSERTION' ? 'ASSERTION_FAILED' : 'NATIVE_CALL_FAILED', privatePayloadIncluded: false }));
    throw error;
  }
}
