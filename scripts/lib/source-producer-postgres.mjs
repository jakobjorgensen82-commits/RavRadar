// Native TEST phase only, after the genuine frozen585 phase in the existing
// owned Unix-socket PostgreSQL host. Never an installer or origin issuer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_PRODUCER_BEFORE as OLD, SOURCE_PRODUCER_ALIASES as ALIASES,
  SOURCE_PRODUCER_REPLACEMENTS as REPLACEMENTS, SOURCE_PRODUCER_PROJECTION as PROJECTION,
  requireSourceProducerBinding, requireSourceProducerOutput, sourceProducerMigration,
  readSourceProducerPredecessorCanonicalSource, readSourceProducerCanonicalSource,
  sourceProducerDefinition as definition } from './source-producer-successor-source.mjs';
import { currentMemoryWarmupPreservationInventorySql } from './current-memory-warmup-postgres.mjs';
import { expectedCheckpointCasContract, expectedTripBindingPolicy, sourceProducerRequiredMigrations } from '../integrated-cutover-readiness.mjs';
import { verifyStatisticsPreferenceRevisionCatalogMetadata, statisticsPreferenceRevisionCatalogQuery }
  from '../verify-account-assistant-schema.mjs';
import { restoreProtectedRavScoreContinuationCheckpoint } from '../protected-ravscore-continuation-checkpoint.mjs';
import { RAVSCORE_CONTINUATION_CHECKPOINT_POLICY } from '../ravscore-continuation-checkpoint.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CP = 'ravradar_ravscore_checkpoint_', CAS = 'public.' + CP + 'cas';
const KEY = 'ravscore-continuation-checkpoint', PREFIX = 'source-producer-current-';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const body = value => value.slice(value.indexOf('as $$') + 5, value.lastIndexOf('$$;')).trim();
const literal = value => { assert.equal(typeof value, 'string'); assert(!value.includes("'")); return "'" + value + "'"; };
const once = (source, before, after) => { assert.equal(source.split(before).length, 2); return source.replace(before, () => after); };


export function assertSourceProducerTransactionBounds(sql) {
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

export async function compareSourceProducerSuccessor(options) {
  let phase = 'SOURCE';
  try {
    const NEXT = requireSourceProducerBinding(), PINS = requireSourceProducerOutput(); // Before caller access or I/O.
    assert.equal(arguments.length, 1);
    const { psql, runSql, root, sourceDocumentAt, atHour, saveCheckpoint } = options;
    for (const fn of [psql,runSql,sourceDocumentAt,atHour,saveCheckpoint]) assert.equal(typeof fn,'function');
    const inventory=sourceProducerRequiredMigrations();assert.equal(inventory.length,57);
    assert.equal(inventory.at(-2).version,OLD.version);assert.equal(inventory.at(-1).version,NEXT.version);
    const before = await readSourceProducerPredecessorCanonicalSource(), after = await readSourceProducerCanonicalSource();
    const migration = sourceProducerMigration(), sql = await fs.readFile(path.join(ROOT, 'supabase/migrations', migration.filename), 'utf8');
    assert.equal(sha(sql), PINS.migrationSha256); assert.equal(sha(before.canonicalSource), OLD.canonicalSha256);
    assert.equal(sha(after.canonicalSource), PINS.canonicalSha256); assertSourceProducerTransactionBounds(sql);
    const expected = { checkpoint: await expectedCheckpointCasContract({ sourcePhase: 'source-producer' }),
      trip: await expectedTripBindingPolicy({ sourcePhase: 'source-producer' }) };
    assert.equal(expected.checkpoint.sha256, PINS.checkpointContractSha256); assert.equal(expected.trip.sha256, PINS.tripBindingPolicySha256);
    phase = 'BEFORE_VERSION'; assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'), OLD.version);
    phase = 'GENUINE587_BANK';
    for(const [name,hour] of [['same',49],['newer',50]]){
      const metadata=JSON.parse(await psql("select jsonb_build_object('I',payload#>>'{modelBinding,modelBundleSha256}','C',payload#>>'{candidateGRollbackCompanion,modelBinding,modelBundleSha256}','T',payload->>'continuationStateContractSha256') from native_checkpoint_payloads where name='assistant-later-h0-current-"+name+"';"));
      assert.deepEqual(metadata,{I:OLD.I,C:OLD.C,T:OLD.T},'Previous real587 normal producer rows are mandatory');
      assert.equal(await psql('select public.'+CP+"payload_valid((select payload from native_checkpoint_payloads where name='assistant-later-h0-current-"+name+"'),'"+atHour(hour)+"');"),'t');
    }
    const names = [...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row => row[1]);
    const allNames = [...names, ...ALIASES.map(row => row.name)];
    assert.equal(new Set(allNames).size, names.length + 3);
    const contractSource = definition(after.canonicalSource, CP + 'contract');
    const validatorArray = /v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contractSource);
    assert(validatorArray); assert.equal((validatorArray[1].match(/pg_catalog\.to_regprocedure\(/g) ?? []).length, 36);
    assert.equal((contractSource.match(/\|\| v_[a-z0-9_]+_definition/g) ?? []).length + 1, 39);
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
      ...['20261014140000','20261015030000','20261016030000'].map(version=>["insert into supabase_migrations.schema_migrations values('"+version+"');","delete from supabase_migrations.schema_migrations where version='"+version+"';"]),
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
      // Only genuine new SOURCE fixtures are made here. OLD587 rows were produced
      // by the preceding genuine frozen587 normal phase, never by this current factory.
      await fs.writeFile(sourcePath, JSON.stringify(sourceDocumentAt(hour, 'rr-last-mile-584-' + (name === 'changed' ? 'same' : name), options)), { flag: 'wx' });
      await saveCheckpoint({ sourcePath, checkpointPath, repositoryRoot: ROOT });
      const payload = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      assert.equal(payload.partCount, 673); assert.equal(Object.keys(payload.states).length, 673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length, 673);
      assert.equal(payload.modelBinding.modelBundleSha256, NEXT.I); assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256, NEXT.C);
      assert.equal(payload.continuationStateContractSha256, NEXT.T);
      const text = JSON.stringify(payload); assert(!text.includes('$assistant_fixture$'));
      await psql("insert into native_checkpoint_payloads values('" + PREFIX + name + "',$assistant_fixture$" + text + '$assistant_fixture$::jsonb);');
      assert.equal(await psql('select public.' + CP + "payload_valid((select payload from native_checkpoint_payloads where name='" + PREFIX + name + "'),'" + atHour(hour) + "');"), 't');
      current[name] = payload;
    }
    phase = 'SAME_H0_WHOLE_METADATA_INVERSE';
    // Full actual587 validity is required. This SQL predicate is not JS origin
    // authority: the actual B/S reader/prewrite remains a separate gate.
    const withoutDerived = expression => "("+expression+" #- '{generationSha256}' #- '{stateSha256}' #- '{candidateGRollbackCompanion,generationSha256}')";
    const projected = 'public.'+PROJECTION+"((select payload from native_checkpoint_payloads where name='assistant-later-h0-current-same'),'"+atHour(49)+"')";
    const incoming = "(select payload from native_checkpoint_payloads where name='"+PREFIX+"same')";
    assert.equal(await psql('select '+projected+' is not null and '+withoutDerived(projected)+'='+withoutDerived(incoming)+';'),'t');
    for(const original of ['account-statistics-assistant-current-same','last-mile-584-same','origin-current-same','identity-same','after0600-same'])
      assert.equal(await psql('select public.'+PROJECTION+"((select payload from native_checkpoint_payloads where name='"+original+"'),'"+atHour(49)+"') is null;"),'t');
    // The original0200->140000 fixed production selector stays unchanged.
    assert.equal(await psql('select public.'+CP+"native_origin_projection((select payload from native_checkpoint_payloads where name='after0600-same'),'"+atHour(49)+"') is null;"),'t');
    phase = 'NORMAL_JSONB_ROUNDTRIP';
    const size = Number(await psql("select octet_length(convert_to(payload::text,'UTF8')) from native_checkpoint_payloads where name='" + PREFIX + "same';"));
    assert(Number.isSafeInteger(size) && size > 0 && size <= RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes);
    const chunks = [];
    for (let offset = 1; offset <= size; offset += 262144) chunks.push(Buffer.from((await psql("select encode(substring(convert_to(payload::text,'UTF8') from "
      + offset + " for 262144),'base64') from native_checkpoint_payloads where name='" + PREFIX + "same';")).replace(/\s/g, ''), 'base64'));
    const bytes = Buffer.concat(chunks); assert.equal(bytes.length, size); const payload = JSON.parse(bytes.toString('utf8'));
    assert.deepEqual(payload, current.same); assert.notEqual(JSON.stringify(payload), JSON.stringify(current.same));
    const checkpointPath = path.join(root, 'source-producer-jsonb/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    const request = async () => [{ document_key: KEY, payload, version: 1 }];
    const restored = await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath, targetReference: atHour(49), request });
    assert.equal(restored.restored, true); assert.equal(restored.objectMemberOrderRestored, true);
    const restoredBytes = await fs.readFile(checkpointPath); assert.deepEqual(JSON.parse(restoredBytes), current.same);
    assert.equal((await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath, targetReference: atHour(49), request })).reason, 'protected-checkpoint-equivalent');
    assert.deepEqual(await fs.readFile(checkpointPath), restoredBytes);
    const reports = [], cases = [
      ['equal-retry', PREFIX+'same', PREFIX+'same', 0, null, 'unchanged', 1],
      ['same-current-numeric-change', PREFIX+'same', PREFIX+'changed', 1, '23505', null, 1],
      ['newer-current', PREFIX+'same', PREFIX+'newer', 1, null, 'updated', 2],
      ['wrong-version', PREFIX+'same', PREFIX+'newer', 0, '40001', null, 1],
      ['regression', PREFIX+'newer', PREFIX+'same', 1, '22023', null, 1],
      ['same-H0-587-metadata', 'assistant-later-h0-current-same', PREFIX+'same', 1, null, 'updated', 2],
      ['same-H0-587-numeric-change', 'assistant-later-h0-current-same', PREFIX+'changed', 1, '23505', null, 1],
      ['same-H0-587-wrong-version', 'assistant-later-h0-current-same', PREFIX+'same', 0, '40001', null, 1],
      ['newer-587', 'assistant-later-h0-current-same', PREFIX+'newer', 1, null, 'updated', 2],
      ['same-direct586-refused', 'native-original-continuity-current-same', PREFIX+'same', 1, '22023', null, 1],
      ['newer-direct586-refused', 'native-original-continuity-current-same', PREFIX+'newer', 1, '22023', null, 1],
      ['same-direct585-refused', 'account-statistics-assistant-current-same', PREFIX+'same', 1, '22023', null, 1],
      ['newer-direct585-refused', 'account-statistics-assistant-current-same', PREFIX+'newer', 1, '22023', null, 1],
      ['same-direct584-refused', 'last-mile-584-same', PREFIX+'same', 1, '22023', null, 1],
      ['newer-direct584-refused', 'last-mile-584-same', PREFIX+'newer', 1, '22023', null, 1],
      ['same-direct140000-refused', 'origin-current-same', PREFIX+'same', 1, '22023', null, 1],
      ['newer-direct140000-refused', 'origin-current-same', PREFIX+'newer', 1, '22023', null, 1],
      ['same-direct0600-refused', 'identity-same', PREFIX+'same', 1, '22023', null, 1],
      ['newer-direct0600-refused', 'identity-same', PREFIX+'newer', 1, '22023', null, 1],
      ['same-direct0200-refused', 'after0600-same', PREFIX+'same', 1, '22023', null, 1],
      ['newer-direct0200-refused', 'after0600-same', PREFIX+'newer', 1, '22023', null, 1],
    ];
    for (const [family, central] of [['i994', 'grid-current'], ...['ffc', '249', 'c1ac'].map(family => [family, 'original-' + family])])
      cases.push(['newer-' + family, central, PREFIX + 'newer', 1, '22023', null, 1], ['same-' + family, central, PREFIX + 'same', 1, '22023', null, 1]);
    for(const [kind,expression] of [
      ['value',"jsonb_set(payload,'{states,part-001,currentEvidence,0,strength}','2'::jsonb)"],
      ['field',"jsonb_set(payload,'{unknownField}','true'::jsonb)"],
      ['part',"payload #- '{states,part-001}'"],
      ['T',"jsonb_set(payload,'{continuationStateContractSha256}',to_jsonb(repeat('e',64)))"]]){
      const name='source-producer-invalid-'+kind.toLowerCase();
      await psql("insert into native_checkpoint_payloads select '"+name+"',"+expression+" from native_checkpoint_payloads where name='assistant-later-h0-current-same';");
      assert.equal(await psql('select public.'+PROJECTION+"((select payload from native_checkpoint_payloads where name='"+name+"'),'"+atHour(49)+"') is null;"),'t');
      cases.push([name,name,PREFIX+'newer',1,'22023',null,1]);
    }
    const bank = await psql(currentMemoryWarmupPreservationInventorySql('original-bank')), account = await psql(accountRowsSql());
    for (const [name, central, incoming, version, code, disposition, storedVersion] of cases) {
      phase = 'CASE_' + name.toUpperCase().replaceAll('-', '_');
      const observed = JSON.parse(await psql(reset(central)
        + "set statement_timeout='55s';set request.jwt.claim.role='service_role';set role service_role;select public.native_checkpoint_attempt(false,"
        + version + ",(select payload from native_checkpoint_payloads where name='" + incoming + "'));"));
      try { assertObserved(observed, code, disposition, storedVersion); }
      catch (error) {
        // Retain only fixed case/SQLSTATE/outcome categories, never row payloads.
        // Observation failure must not replace the original assertion/cleanup.
        try {
          const state = value => value === null ? null : typeof value === 'string' && /^[0-9A-Z]{5}$/.test(value) ? value : 'UNKNOWN';
          const result = value => ['inserted','updated','unchanged'].includes(value) ? value : value === null || value === undefined ? null : 'UNKNOWN';
          const version = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
          console.error(JSON.stringify({ kind: 'SOURCE_PRODUCER_NATIVE_CASE_ASSERTION', phase,
            expectedSqlstate: state(code), observedSqlstate: state(observed?.sqlstate),
            expectedDisposition: result(disposition), observedDisposition: result(observed?.result?.disposition),
            expectedVersion: version(storedVersion), observedVersion: version(observed?.stored?.version),
            privatePayloadIncluded: false }));
        } catch {}
        throw error;
      }
      reports.push({ case: name, sqlstate: code, disposition, storedVersion });
    }
    phase = 'PRESERVED'; assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')), bank);
    assert.equal(await psql(accountRowsSql()), account); assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery), accountCatalogBefore);
    assert.equal(await psql('select count(*) from admin_document_versions;'), '0');
    assert.deepEqual(JSON.parse(await psql(catalogSql(allNames))), catalogAfter);
    for (const [file, pin] of archivePins) assert.equal(sha(await fs.readFile(path.join(ROOT, 'supabase/migrations', file))), pin);
    return { kind: 'SOURCE_PRODUCER_SUCCESSOR', sourceMigrationInventory:57, sqlExecuted: true, wholeMigrationExecuted: true,
      migrationVersion: migration.version, partCount: 673, checkpointOidSlots: 36, contractBodies: 39,
      oldFunctionsAndOidsPreserved: true, allEightOriginalFunctionsPreserved: true, privateAliases: 3,
      beforeGuardCases: guards.length, exactCheckpointContract: true, exactTripContract: true,
      schema2Catalog: true, normalProtectedJsonbRoundtrip: true, originalDigestsPreserved: true,
      trueOld587Fixtures: true, currentNormalFixtures: true, old585And586ModelsNotRetagged: true,
      productionSeedAuthenticated: false, sameH0SqlIsNotOriginAuthentication: true, historicalSeedSelectorPreserved: true, reports };
  } catch (error) {
    try { console.error(JSON.stringify({ kind: 'SOURCE_PRODUCER_NATIVE_FIRST_FAILURE', phase,
      category: error?.code === 'ERR_ASSERTION' ? 'ASSERTION_FAILED' : 'NATIVE_CALL_FAILED', privatePayloadIncluded: false })); } catch {} // Diagnostic failure never replaces the raw first failure.
    throw error;
  }
}
