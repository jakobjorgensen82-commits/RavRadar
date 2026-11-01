// Native TEST phase only, after the genuine frozen585 phase in the existing
// owned Unix-socket PostgreSQL host. Never an installer or origin issuer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
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
    const profile = await import('./source-producer-successor-source.mjs');
    if (profile.SOURCE_PRODUCER_PREDECESSOR_RELEASE === '4.0.594')
      return compareSourceProducerCurrent594Successor(options);
    assert.equal(arguments.length, 1);
    const { psql, runSql, root, sourceDocumentAt, atHour, saveCheckpoint } = options;
    for (const fn of [psql,runSql,sourceDocumentAt,atHour,saveCheckpoint]) assert.equal(typeof fn,'function');
    const inventory=sourceProducerRequiredMigrations();assert.equal(inventory.length,55);
    assert.equal(inventory.at(-2).version,OLD.version);assert.equal(inventory.at(-1).version,NEXT.version);
    const before = await readSourceProducerPredecessorCanonicalSource(), after = await readSourceProducerCanonicalSource();
    const migration = sourceProducerMigration(), sql = await fs.readFile(path.join(ROOT, 'supabase/migrations', migration.filename), 'utf8');
    assert.equal(sha(sql), PINS.migrationSha256); assert.equal(sha(before.canonicalSource), OLD.canonicalSha256);
    assert.equal(sha(after.canonicalSource), PINS.canonicalSha256); assertSourceProducerTransactionBounds(sql);
    const expected = { checkpoint: await expectedCheckpointCasContract({ sourcePhase: 'source-producer' }),
      trip: await expectedTripBindingPolicy({ sourcePhase: 'source-producer' }) };
    assert.equal(expected.checkpoint.sha256, PINS.checkpointContractSha256); assert.equal(expected.trip.sha256, PINS.tripBindingPolicySha256);
    phase = 'BEFORE_VERSION'; assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'), OLD.version);
    phase = 'GENUINE585_BANK';
    for(const [name,hour] of [['same',49],['newer',50]]){
      const metadata=JSON.parse(await psql("select jsonb_build_object('I',payload#>>'{modelBinding,modelBundleSha256}','C',payload#>>'{candidateGRollbackCompanion,modelBinding,modelBundleSha256}','T',payload->>'continuationStateContractSha256') from native_checkpoint_payloads where name='account-statistics-assistant-current-"+name+"';"));
      assert.deepEqual(metadata,{I:OLD.I,C:OLD.C,T:OLD.T},'Previous real585 normal producer rows are mandatory');
      assert.equal(await psql('select public.'+CP+"payload_valid((select payload from native_checkpoint_payloads where name='account-statistics-assistant-current-"+name+"'),'"+atHour(hour)+"');"),'t');
    }
    const names = [...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row => row[1]);
    const allNames = [...names, ...ALIASES.map(row => row.name)];
    assert.equal(new Set(allNames).size, names.length + 3);
    const contractSource = definition(after.canonicalSource, CP + 'contract');
    const validatorArray = /v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contractSource);
    assert(validatorArray); assert.equal((validatorArray[1].match(/pg_catalog\.to_regprocedure\(/g) ?? []).length, 31);
    assert.equal((contractSource.match(/\|\| v_[a-z0-9_]+_definition/g) ?? []).length + 1, 34);
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
      // Only genuine new SOURCE fixtures are made here. OLD585 rows were produced
      // by the preceding frozen585 normal phase, never by this current factory.
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
    // Full actual585 validity is required. This SQL predicate is not JS origin
    // authority: the actual B/S reader/prewrite remains a separate gate.
    const withoutDerived = expression => "("+expression+" #- '{generationSha256}' #- '{stateSha256}' #- '{candidateGRollbackCompanion,generationSha256}')";
    const projected = 'public.'+PROJECTION+"((select payload from native_checkpoint_payloads where name='account-statistics-assistant-current-same'),'"+atHour(49)+"')";
    const incoming = "(select payload from native_checkpoint_payloads where name='"+PREFIX+"same')";
    assert.equal(await psql('select '+projected+' is not null and '+withoutDerived(projected)+'='+withoutDerived(incoming)+';'),'t');
    for(const original of ['last-mile-584-same','origin-current-same','identity-same','after0600-same'])
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
      ['same-H0-585-metadata', 'account-statistics-assistant-current-same', PREFIX+'same', 1, null, 'updated', 2],
      ['same-H0-585-numeric-change', 'account-statistics-assistant-current-same', PREFIX+'changed', 1, '23505', null, 1],
      ['same-H0-585-wrong-version', 'account-statistics-assistant-current-same', PREFIX+'same', 0, '40001', null, 1],
      ['newer-585', 'account-statistics-assistant-current-same', PREFIX+'newer', 1, null, 'updated', 2],
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
      await psql("insert into native_checkpoint_payloads select '"+name+"',"+expression+" from native_checkpoint_payloads where name='account-statistics-assistant-current-same';");
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
    return { kind: 'SOURCE_PRODUCER_SUCCESSOR', sourceMigrationInventory:55, sqlExecuted: true, wholeMigrationExecuted: true,
      migrationVersion: migration.version, partCount: 673, checkpointOidSlots: 31, contractBodies: 34,
      oldFunctionsAndOidsPreserved: true, allEightOriginalFunctionsPreserved: true, privateAliases: 3,
      beforeGuardCases: guards.length, exactCheckpointContract: true, exactTripContract: true,
      schema2Catalog: true, normalProtectedJsonbRoundtrip: true, originalDigestsPreserved: true,
      trueOld585Fixtures: true, currentNormalFixtures: true, old585ModelNotRetagged: true,
      productionSeedAuthenticated: false, sameH0SqlIsNotOriginAuthentication: true, historicalSeedSelectorPreserved: true, reports };
  } catch (error) {
    try { console.error(JSON.stringify({ kind: 'SOURCE_PRODUCER_NATIVE_FIRST_FAILURE', phase,
      category: error?.code === 'ERR_ASSERTION' ? 'ASSERTION_FAILED' : 'NATIVE_CALL_FAILED', privatePayloadIncluded: false })); } catch {} // Diagnostic failure never replaces the raw first failure.
    throw error;
  }
}


// Additive actual594 schema arm in this SAME owned native PG wrapper. It is not
// the old585 comparison above, a new PG host, a fixture re-tag or a SQL issuer.
async function compareSourceProducerCurrent594Successor(options) {
  const NEXT=requireSourceProducerBinding(),PINS=requireSourceProducerOutput(); // BEFORE caller access/I/O.
  assert.equal(arguments.length,1);assert.equal(process.platform,'linux');
  const source=await import('./source-producer-successor-source.mjs');
  assert.equal(source.SOURCE_PRODUCER_PREDECESSOR_RELEASE,'4.0.594');
  assert.equal(typeof source.requireSourceProducerCodeParent,'function');
  const selected=source.requireSourceProducerCodeParent();
  assert.equal(selected,source.SOURCE_PRODUCER_BEFORE);
  const {psql,runSql}=options;assert.equal(typeof psql,'function');assert.equal(typeof runSql,'function');
  const {withSource594CodeParent}=await import('../check-assistant-later-h0-predecessor-source.mjs');
  assert.equal(typeof withSource594CodeParent,'function');
  return withSource594CodeParent(async genuine37=>{
    const load=relative=>import(pathToFileURL(path.join(genuine37,relative)).href);
    // The fixed normal code callback authenticates actual37, not a caller root.
    const family=await load('scripts/lib/assistant-later-h0-successor-source.mjs');
    assert.equal(family.requireInstalled593Original591Release(),'4.0.594');
    const I=(await load('js/core/ravscore-model-contract.js')).ravScoreModelBinding();
    const C=(await load('scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
    const workflow=await load('scripts/private-production-runtime-workflow.mjs');
    const contracts=await workflow.privateRuntimeContractHashes({repositoryRoot:genuine37});
    const original=family.requireInstalled593Original591Binding(),pins=family.requireInstalled593Original591Output();
    assert.deepEqual({version:original.version,C:original.C,I:original.I,T:original.T,
      canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
      checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},selected);
    assert.equal(I.modelBundleSha256,selected.I);assert.equal(C.modelBundleSha256,selected.C);
    assert.equal(contracts.continuationStateContractSha256,selected.T);
    const readiness=await load('scripts/integrated-cutover-readiness.mjs');
    const baseline=readiness.accountStatisticsAssistantRequiredMigrations();
    const genuine=readiness.installed593Original591RequiredMigrations();
    const required=sourceProducerRequiredMigrations();
    assert.equal(baseline.length,54);assert.equal(genuine.length,61);assert.equal(required.length,62);
    assert.deepEqual(genuine.slice(0,baseline.length),baseline);
    assert.deepEqual(required.slice(0,-1),genuine);assert.equal(genuine.at(-1).version,selected.version);
    assert.equal(required.at(-1).version,NEXT.version);
    const before=await family.readInstalled593Original591CanonicalSource();
    assert.equal(sha(before.canonicalSource),selected.canonicalSha256);
    assert.equal(typeof source.sourceProducerPredecessorContractInventory,'function');
    source.sourceProducerPredecessorContractInventory(before.canonicalSource);
    const migration=sourceProducerMigration(),file=path.join(ROOT,'supabase/migrations',migration.filename);
    const sql=await fs.readFile(file,'utf8');assert.equal(sha(sql),PINS.migrationSha256);
    assertSourceProducerTransactionBounds(sql);const after=await readSourceProducerCanonicalSource();
    assert.equal(sha(after.canonicalSource),PINS.canonicalSha256);
    const versions=async()=>JSON.parse(await psql("select coalesce(json_agg(version order by version),'[]'::json) from supabase_migrations.schema_migrations;"));
    const chronological=version=>{assert.match(version,/^[0-9]{8}([0-9]{6})?$/);return version.padEnd(14,'0');};
    const assertVersions=(actual,inventory)=>{
      assert(Array.isArray(actual));const expected=new Set(inventory.map(row=>row.version));
      assert.equal(new Set(actual).size,actual.length);
      for(const version of expected)assert(actual.includes(version),'Missing actual native migration '+version);
      for(const version of actual)assert(expected.has(version)||chronological(version)<chronological(inventory[0].version),
        'Unknown post-cutover migration in same native PG');
      assert.equal([...actual].sort((a,b)=>chronological(a).localeCompare(chronological(b))).at(-1),inventory.at(-1).version);
    };
    assertVersions(await versions(),baseline);
    const preservedSql=currentMemoryWarmupPreservationInventorySql('preserved');
    const preserved=await psql(preservedSql),account=await psql(accountRowsSql());
    const accountCatalog=await psql(statisticsPreferenceRevisionCatalogQuery);
    assert.equal((await verifyStatisticsPreferenceRevisionCatalogMetadata(JSON.parse(accountCatalog))).schemaVersion,2);
    const sqlInputs=[];
    for(const migration of genuine.slice(baseline.length)){
      assert.match(migration.filename,/^[0-9]{14}_[a-z0-9_]+\.sql$/);
      const file=path.join(genuine37,'supabase/migrations',migration.filename),stat=await fs.lstat(file);
      assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size>0);
      const raw=await fs.readFile(file);assert.equal(raw.length,stat.size);
      sqlInputs.push({migration,file,raw,sha256:sha(raw)});
    }
    // Entire existing issued SQL and actual registration, in chronological order.
    // No old585 row, body or model label is rewritten into a594 fixture.
    for(const row of sqlInputs){
      await psql(row.raw.toString('utf8'));
      await psql("insert into supabase_migrations.schema_migrations(version) values('"+row.migration.version+"');");
      assert.deepEqual(await fs.readFile(row.file),row.raw);
    }
    assertVersions(await versions(),genuine);
    const names=[...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row=>row[1]);
    const catalog594=JSON.parse(await psql(catalogSql(names)));
    assert.deepEqual(Object.keys(catalog594).sort(),[...names].sort());
    for(const name of names)assert.equal(catalog594[name].body,sha(body(definition(before.canonicalSource,name))));
    const rpcReadback=async(verifier,settings)=>{
      const address='https://source-current-same-pg.invalid',key='NATIVE_TEST_ONLY_NO_REMOTE_SERVICE';let calls=0;
      const signature='public.ravradar_integrated_cutover_contract('+Array(22).fill('text').join(',')+')';
      const fetchImpl=async(input,request)=>{
        assert.equal(typeof input,'string');assert.equal(request.method,'POST');
        const payload=JSON.parse(request.body);assert.equal(Object.getPrototypeOf(payload),Object.prototype);
        let name,args;
        if(calls===0){
          assert.equal(input,address+'/rest/v1/rpc/ravradar_integrated_cutover_contract');
          assert.equal(Object.keys(payload).length,22);
          const actual=JSON.parse(await psql("select to_json(proargnames) from pg_proc where oid='"+signature+"'::regprocedure;"));
          assert.deepEqual([...actual].sort(),Object.keys(payload).sort());
          for(const[field,value]of Object.entries(payload)){assert.match(field,/^p_[a-z0-9_]+$/);assert.equal(typeof value,'string');}
          name='ravradar_integrated_cutover_contract';
          args=Object.entries(payload).map(([field,value])=>field+"=>'"+value.replaceAll("'","''")+"'").join(',');
        }else{
          assert.equal(calls,1);assert.equal(input,address+'/rest/v1/rpc/ravradar_ravscore_checkpoint_contract');
          assert.deepEqual(payload,{});name='ravradar_ravscore_checkpoint_contract';args='';
        }
        const text=await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+name+'('+args+')::text;');
        JSON.parse(text);calls++;return new Response(text,{status:200,headers:{'content-type':'application/json'}});
      };
      await verifier({...settings,url:address,serviceRoleKey:key,fetchImpl});assert.equal(calls,2);return calls;
    };
    // The normal GENUINE37 verifier derives all22 fields and actually executes
    // both real contracts on THIS PG. No authored metadata or READY response.
    await rpcReadback(readiness.verifyIntegratedDatabaseReadback,{
      sourcePhase:'assistant-installed593-origin591-successor',modelBinding:I,candidateModelBinding:C});
    await psql(sql);await psql("insert into supabase_migrations.schema_migrations(version) values('"+migration.version+"');");
    assert.notEqual((await runSql(sql)).code,0,'No replay after installed version');
    assertVersions(await versions(),required);
    const allNames=[...after.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row=>row[1]);
    const catalogAfter=JSON.parse(await psql(catalogSql(allNames)));
    assert.deepEqual(Object.keys(catalogAfter).sort(),[...allNames].sort());
    for(const name of allNames){
      assert.equal(catalogAfter[name].body,sha(body(definition(after.canonicalSource,name))));
      if(catalog594[name])assert.deepEqual(catalogAfter[name].properties,catalog594[name].properties);
    }
    const currentReadiness=await import('../integrated-cutover-readiness.mjs');
    await rpcReadback(currentReadiness.verifyIntegratedDatabaseReadback,{sourcePhase:'source-producer'});
    assert.equal(await psql(preservedSql),preserved);assert.equal(await psql(accountRowsSql()),account);
    assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery),accountCatalog);
    for(const row of sqlInputs)assert.deepEqual(await fs.readFile(row.file),row.raw);
    assert.equal(sha(await fs.readFile(file)),PINS.migrationSha256);
    return Object.freeze({kind:'SOURCE_CURRENT594_SAME_PG_SCHEMA_PREPARED',sourceMigrationInventory:62,
      genuine594MigrationInventory:61,genuine594IntegratedRpcParameters:22,genuine594ActualRpcCalls:2,
      sourceActualRpcCalls:2,sameNativePg:true,normalVerifiers:true,old585RowsPreserved:true,
      originalSqlBytesPreserved:true,metadataAuthored:false,sourceNativeActionQualified:false,
      originalBAndSAuthenticated:false,productionProof:false});
  });
}
