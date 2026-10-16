// Native source-test phase only: no hosted connection, issuer or admission API.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withFrozenI71Source } from '../check-native-identity-frozen-i71-source.mjs';
import {
  NATIVE_IDENTITY_PREDECESSOR as BEFORE, NATIVE_IDENTITY_BINDING_REVIEW as AFTER,
  NATIVE_IDENTITY_ORIGINAL_NAMES, NATIVE_IDENTITY_REPLACEMENTS,
  nativeIdentityMigration, nativeIdentitySqlDefinition as definition,
  readNativeIdentityPredecessorSource, readNativeIdentityCanonicalSource,
} from './native-sampling-identity-successor-source.mjs';
import { nativeSamplingIdentityExpectedDatabaseContracts } from '../native-sampling-identity-successor-readiness.mjs';
import { statisticsPreferenceRevisionCatalogQuery, verifyStatisticsPreferenceRevisionCatalogMetadata }
  from '../verify-account-assistant-schema.mjs';
import { LATEST_RAVSCORE_BINDING_MIGRATION } from '../integrated-cutover-readiness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HEAD = '37e657867ff0f8c31f8e8489e5c9a1cf235192f9';
const TREE = 'aabcdfd4f81aeba8db448c7b60d87e5212e94cd3';
const TARGET = 'scripts/test-protected-ravscore-continuation-checkpoint.mjs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const body = value => value.slice(value.indexOf('as $$') + 5, value.lastIndexOf('$$;')).trim();
const CP = 'ravradar_ravscore_checkpoint_';
const CAS = 'public.' + CP + 'cas';
const KEY = 'ravscore-continuation-checkpoint';
const execute = promisify(execFile);

// Exact declarations from the genuine old test, evaluated ONLY against the
// verified fixed37 import closure. Never relabel a current state as old I71.
export async function withNativeI71CheckpointFactory(useFactory) {
  assert.equal(arguments.length, 1); assert.equal(typeof useFactory, 'function');
  const git = async args => (await execute('git', ['-C', ROOT, ...args],
    { encoding: 'utf8', timeout: 30_000, maxBuffer: 2 * 1024 * 1024 })).stdout;
  assert.equal((await git(['rev-parse', HEAD + '^{tree}'])).trim(), TREE);
  assert.match(await git(['ls-tree', HEAD, '--', TARGET]), /^100644 blob [a-f0-9]{40}\t/);
  const source = await git(['show', HEAD + ':' + TARGET]);
  assert.equal(sha(source), '7cb020036606c01618e244315532be583de71bbb246b457ae6f5c2028e0345a6');
  const slice = (start, end) => {
    assert.equal(source.split(start).length, 2); assert.equal(source.split(end).length, 2);
    assert(source.indexOf(start) < source.indexOf(end));
    return source.slice(source.indexOf(start), source.indexOf(end));
  };
  const factory = slice('const PART_COUNT =', 'const safeShape =')
    + slice('const samples =', 'const sourceDocument =');
  assert.equal(sha(factory), '71ce29ec98e43bfa02017a145c4438346f1d8a1f4323526ec58e4b1081d81e36');
  return withFrozenI71Source(async frozenRoot => {
    const imports = [
      ['buildIntegratedRavScoreStateSeries', 'js/core/ravscore-integrated-state-pipeline.js'],
      ['buildCandidateGDerivedStateSeries', 'js/core/ravscore-candidate-g-state-pipeline.js'],
      ['ravScoreModelBinding', 'js/core/ravscore-model-contract.js'],
      ['ravScoreModelBinding as candidateGRollbackModelBinding', 'scripts/rollback-assets/ravscore-model-contract.js'],
      ['candidateGStateKey', 'scripts/lib/coastal-point-staging-contract.mjs'],
      ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID', 'scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
      ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY, saveRavScoreContinuationCheckpoint', 'scripts/ravscore-continuation-checkpoint.mjs'],
      ['ravScoreContinuationImplementationSha256', 'scripts/lib/ravscore-continuation-implementation-contract.mjs'],
    ];
    const text = "import crypto from 'node:crypto';\n"
      + imports.map(([names, file]) => 'import { ' + names + ' } from '
        + JSON.stringify(pathToFileURL(path.join(frozenRoot, file)).href) + ';').join('\n')
      + '\n' + factory + '\nexport { sourceDocumentAt, atHour, saveRavScoreContinuationCheckpoint, '
      + 'ravScoreModelBinding, candidateGRollbackModelBinding, CURRENT_CONTINUATION_IMPLEMENTATION_SHA256 };';
    const loaded = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
    assert.equal(loaded.ravScoreModelBinding().modelBundleSha256, BEFORE.integrated);
    assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256, BEFORE.candidate);
    assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256, BEFORE.continuation);
    return useFactory(Object.freeze({ ...loaded, sourceHead: HEAD, sourceTree: TREE }));
  });
}

// The old host deliberately granted inspection access for its unchanged anon
// refusal cases. Complete its catalog fixture AFTER those cases: exact issued
// helper ACLs/policies, plus ordinary RLS on the two fixture-owned admin tables.
export function nativeIdentityHistoricalCatalogSetup(oldSource) {
  assert.equal(sha(oldSource), '55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6');
  const names = ['canonical_time', 'has_forbidden_key', 'integrated_state_valid',
    'candidate_state_valid', 'payload_valid', 'predecessor_payload_valid',
    'top20_predecessor_projection', 'cp_close_predecessor_projection',
    'owner_current_predecessor_projection', 'water_level_predecessor_projection',
    'userdata_predecessor_projection', 'integrated_state_reason', 'payload_reason', 'contract']
    .map(name => CP + name).concat('ravradar_trip_v3_binding_allowed');
  const statements = [...oldSource.matchAll(/^(?:revoke all|grant execute) on function public\.([a-z0-9_]+)\([^;]*;/gm)];
  const selected = [];
  for (const name of names) {
    const revoked = statements.filter(row => row[1] === name && row[0].startsWith('revoke all'));
    assert.equal(revoked.length, 1);
    assert.match(revoked[0][0], /\)\s+from public,\s*anon,\s*authenticated;$/);
    selected.push(revoked[0][0]);
    const granted = statements.filter(row => row[1] === name && row[0].startsWith('grant execute'));
    const service = [CP + 'contract', 'ravradar_trip_v3_binding_allowed'].includes(name);
    assert.equal(granted.length, service ? 1 : 0);
    if (service) { assert.match(granted[0][0], /\)\s+to service_role;$/); selected.push(granted[0][0]); }
  }
  assert.equal(selected.length, 17);
  for (const name of ['ravradar_ravscore_checkpoint_no_direct_read', 'ravradar_ravscore_checkpoint_versions_no_direct_read']) {
    const matches = [...oldSource.matchAll(new RegExp('^create policy ' + name + '\\n[^;]+;', 'gm'))];
    assert.equal(matches.length, 1); selected.push(matches[0][0]);
  }
  return definition(oldSource, 'ravradar_trip_v3_score_quality_allowed') + '\n' + selected.join('\n')
    + '\nalter table public.admin_documents enable row level security;'
    + '\nalter table public.admin_document_versions enable row level security;';
}

// Only the actual owning native host calls this, after all old phases in its
// still-live, TCP-disabled cluster. No fake executor run counts as SQL proof.
export async function compareNativeSamplingIdentitySuccessor({ psql, runSql, root,
  sourceDocumentAt, atHour, saveCheckpoint, oldSource }) {
  let phase = 'SOURCE_PREDECESSOR';
  try {
    const before = await readNativeIdentityPredecessorSource();
    phase = 'SOURCE_CANONICAL';
    const after = await readNativeIdentityCanonicalSource();
    phase = 'SOURCE_CONTRACTS';
    const expected = await nativeSamplingIdentityExpectedDatabaseContracts();
    phase = 'SOURCE_MIGRATION';
    const migration = nativeIdentityMigration();
    const migrationPath = path.join(ROOT, 'supabase/migrations', migration.filename);
    const sql = (await fs.readFile(migrationPath, 'utf8')).replace(/\r\n?/g, '\n');
    const archiveNames = (await fs.readdir(path.dirname(migrationPath))).filter(name => name.endsWith('.sql')).sort();
    const archivePins = await Promise.all(archiveNames.map(async name =>
      [name, sha(await fs.readFile(path.join(path.dirname(migrationPath), name)))]));
    assert.match(sql, /begin;\n\nset local lock_timeout = '5s';/);
    phase = 'SOURCE_HISTORY';
    assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'), BEFORE.statisticsVersion);
    phase = 'HISTORICAL_CATALOG_SETUP';
    await psql(nativeIdentityHistoricalCatalogSetup(oldSource));
    const preservedSql = "select md5(jsonb_build_object('checkpoint',(select jsonb_agg(to_jsonb(t) order by document_key) from public.admin_documents t),"
      + "'history',(select jsonb_agg(to_jsonb(t)) from public.admin_document_versions t),"
      + "'activity',(select jsonb_agg(to_jsonb(t) order by user_id) from public.account_activity_journal t),"
      + "'preference',(select jsonb_agg(to_jsonb(t) order by user_id) from public.account_statistics_preferences t),"
      + "'bank',(select jsonb_agg(to_jsonb(t) order by name) from public.native_checkpoint_payloads t))::text);";
    phase = 'HISTORICAL_CATALOG_PRESERVED_ROWS';
    const preserved = await psql(preservedSql);
    const originalRowsSql = "select md5(jsonb_agg(jsonb_build_array(name,payload) order by name)::text) from public.native_checkpoint_payloads where name in ('original-ffc','original-249','original-c1ac','grid-current','grid-future','grid-changed');";
    phase = 'HISTORICAL_CATALOG_ORIGINAL_ROWS';
    const originalRowsBefore = await psql(originalRowsSql);
    const accountRowsSql = "select md5(jsonb_build_object('activity',(select jsonb_agg(to_jsonb(t) order by user_id) from public.account_activity_journal t),'preference',(select jsonb_agg(to_jsonb(t) order by user_id) from public.account_statistics_preferences t))::text);";
    phase = 'HISTORICAL_CATALOG_ACCOUNT_ROWS';
    const accountRowsBefore = await psql(accountRowsSql);
    const allNames = [...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row => row[1]);
    // PostgreSQL stores identifiers as `name` (normally 63 bytes). Resolve the
    // exact issued names through that type, but retain their FULL source keys.
    const catalogSql = names => "select jsonb_object_agg(requested.source_name,jsonb_build_object('oid',p.oid,'definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl,'body',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex'))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join (values " + names.map(name => "('" + name + "')").join(',') + ") as requested(source_name) on p.proname=requested.source_name::pg_catalog.name where n.nspname='public';";
    phase = 'HISTORICAL_CATALOG_READ';
    const catalogBefore = JSON.parse(await psql(catalogSql(allNames)));
    phase = 'HISTORICAL_CATALOG_FUNCTION_SET';
    assert.deepEqual(Object.keys(catalogBefore).sort(), [...allNames].sort());
    for (const name of allNames) {
      // Names come only from the hash-verified public SQL source, never rows or
      // private values. Preserve the first exact failed function without a stack.
      phase = 'HISTORICAL_CATALOG_BODY_' + name.toUpperCase();
      assert.equal(catalogBefore[name].body, sha(body(definition(before.canonicalSource, name))));
    }
    const guards = [
      ["delete from supabase_migrations.schema_migrations where version='20261013230000';", "insert into supabase_migrations.schema_migrations values('20261013230000');"],
      ["insert into supabase_migrations.schema_migrations values('20990101000000');", "delete from supabase_migrations.schema_migrations where version='20990101000000';"],
      ['alter function ' + CAS + '(bigint,timestamptz,jsonb) security invoker;', 'alter function ' + CAS + '(bigint,timestamptz,jsonb) security definer;'],
      ["alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='54s';", "alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
      ['revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from service_role;', 'grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to service_role;'],
      ['grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to anon;', 'revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from anon;'],
      ['grant execute on function public.' + CP + 'grid_c1ac_state_valid(jsonb,text) to authenticated;', 'revoke execute on function public.' + CP + 'grid_c1ac_state_valid(jsonb,text) from authenticated;'],
    ];
    for (const [index, [drift, restore]] of guards.entries()) {
      phase = 'BEFORE_GUARD_' + index;
      await psql(drift); assert.notEqual((await runSql(sql)).code, 0);
      await psql(restore);
      assert.equal(await psql(preservedSql), preserved);
      assert.deepEqual(JSON.parse(await psql(catalogSql(allNames))), catalogBefore);
      assert.equal(await psql("select to_regprocedure('public." + NATIVE_IDENTITY_ORIGINAL_NAMES[0] + "(jsonb,text)') is null;"), 't');
    }
    phase = 'INSTALL';
    await psql(sql); // Whole BEFORE + DDL + AFTER + ACL + transaction, unchanged.
    assert.equal(await psql("select current_setting('lock_timeout');"), '0');
    assert.equal(await psql(preservedSql), preserved, 'NEW install must preserve every original row and account');
    await psql("insert into supabase_migrations.schema_migrations values('" + migration.version + "');");
    assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'), migration.version);
    assert.notEqual((await runSql(sql)).code, 0, 'Installed NEW migration must not replay');
    phase = 'CONTRACT';
    const catalogAfter = JSON.parse(await psql(catalogSql([...allNames, ...NATIVE_IDENTITY_ORIGINAL_NAMES])));
    for (const name of allNames) {
      assert.equal(catalogAfter[name].oid, catalogBefore[name].oid);
      assert.equal(catalogAfter[name].body, sha(body(definition(after.canonicalSource, name))));
      if (!NATIVE_IDENTITY_REPLACEMENTS.includes(name)) assert.deepEqual(catalogAfter[name], catalogBefore[name]);
      else {
        const { body: oldBody, ...oldProperties } = catalogBefore[name];
        const { body: newBody, ...newProperties } = catalogAfter[name];
        assert.deepEqual(newProperties, oldProperties);
      }
    }
    for (const name of NATIVE_IDENTITY_ORIGINAL_NAMES) assert.equal(catalogAfter[name].body, sha(body(definition(after.canonicalSource, name))));
    const contract = JSON.parse(await psql("set request.jwt.claim.role='service_role'; set role service_role; select public.ravradar_ravscore_checkpoint_contract();"));
    assert.equal(contract.schemaVersion, 'ravscore-checkpoint-db-v1');
    assert.equal(contract.appliedMigrationVersion, LATEST_RAVSCORE_BINDING_MIGRATION.version);
    assert.deepEqual(contract.checkpointContract, { id: expected.checkpoint.id, definition: expected.checkpoint.definition });
    assert.deepEqual(contract.checks, Object.fromEntries([
      'checkpointContractDefinitionPresent', 'checkpointCanonicalTimeHelperStableSecurityInvoker',
      'checkpointHistoryExclusionInstalled', 'checkpointDirectPayloadReadRestricted',
      'checkpointCasSecurityDefiner', 'checkpointCasStatementTimeout55Seconds',
      'checkpointCasServiceRoleExecutable', 'checkpointCasAnonymousExecutionRejected',
      'checkpointValidatorExecutionRestricted', 'checkpointFunctionsSearchPathLocked',
    ].map(name => [name, true])));
    const tripBody = await psql("select (select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_score_quality_allowed(text,jsonb)'::regprocedure) || E'\\n-- calibration-truth-function --\\n' || (select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure) || E'\\n-- binding-function --\\n' || (select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure);");
    assert.equal(sha(tripBody), expected.trip.sha256);
    const accountCatalog = await verifyStatisticsPreferenceRevisionCatalogMetadata(JSON.parse(await psql(statisticsPreferenceRevisionCatalogQuery)));
    assert.equal(accountCatalog.schemaVersion, 2);
    const put = async (name, payload) => {
      assert.match(name, /^[a-z0-9-]+$/); const text = JSON.stringify(payload);
      assert(!text.includes('$native_fixture$'));
      await psql("insert into public.native_checkpoint_payloads values('" + name + "',$native_fixture$" + text + '$native_fixture$::jsonb);');
    };
    phase = 'CURRENT_FIXTURES';
    const current = {};
    for (const [name, hour] of [['same', 49], ['newer', 50]]) {
      const sourcePath = path.join(root, 'identity-' + name + '-source.json');
      const checkpointPath = path.join(root, 'identity-' + name + '-checkpoint.json');
      await fs.writeFile(sourcePath, JSON.stringify(sourceDocumentAt(hour, 'rr-native-identity-' + hour)), { flag: 'wx' });
      await saveCheckpoint({ sourcePath, checkpointPath });
      const payload = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      assert.equal(payload.modelBinding.modelBundleSha256, AFTER.integrated);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256, AFTER.candidate);
      assert.equal(payload.continuationStateContractSha256, AFTER.continuation);
      assert.equal(payload.partCount, 673); assert.equal(Object.keys(payload.states).length, 673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length, 673);
      current[name] = payload; await put('identity-' + name, payload);
      assert.equal(await psql("select public." + CP + "payload_valid((select payload from native_checkpoint_payloads where name='identity-" + name + "'),'" + atHour(hour) + "');"), 't');
    }
    const cases = [];
    for (const [family, central, validator] of [
      ['i71', 'grid-current', NATIVE_IDENTITY_ORIGINAL_NAMES[1]],
      ...['ffc', '249', 'c1ac'].map(family => [family, 'original-' + family, CP + 'grid_' + family + '_payload_valid']),
    ]) {
      phase = 'ORIGINAL_' + family.toUpperCase();
      assert.equal(await psql("select public." + validator + "((select payload from native_checkpoint_payloads where name='" + central + "'),'" + atHour(49) + "');"), 't');
      cases.push(['newer-' + family, central, 'identity-newer', 1, null, 'updated', 2],
        ['same-' + family, central, 'identity-same', 1, '22023', null, 1],
        ['version-' + family, central, 'identity-newer', 0, '40001', null, 1]);
      for (const [kind, expression] of [
        ['point', "jsonb_set(payload,'{states,part-001,samplingContextKey}','null'::jsonb)"],
        ['state', "payload #- '{states,part-001}'"],
        ['source', "jsonb_set(payload,'{candidateGRollbackCompanion,generationSha256}',to_jsonb(repeat('e',64)))"],
        ['binding', "jsonb_set(payload,'{modelBinding,modelBundleSha256}',to_jsonb('" + AFTER.integrated + "'::text))"],
      ]) {
        const name = 'identity-' + family + '-' + kind;
        await psql("insert into native_checkpoint_payloads select '" + name + "'," + expression + " from native_checkpoint_payloads where name='" + central + "';");
        assert.equal(await psql("select public." + validator + "((select payload from native_checkpoint_payloads where name='" + name + "'),'" + atHour(49) + "');"), 'f');
        cases.push([name, name, 'identity-newer', 1, '22023', null, 1]);
      }
    }
    for (const [kind, mutate] of [
      ['point', value => { value.states['part-001'].samplingContextKey = null; }],
      ['state', value => { delete value.states['part-001']; }],
      ['source', value => { value.candidateGRollbackCompanion.generationSha256 = 'e'.repeat(64); }],
      ['binding', value => { value.states['part-001'].modelBundleSha256 = BEFORE.integrated; }],
    ]) {
      const bad = structuredClone(current.newer); mutate(bad); const name = 'identity-incoming-' + kind;
      await put(name, bad); cases.push([name, 'grid-current', name, 1, '22023', null, 1]);
    }
    cases.push(['equal-current', 'identity-same', 'identity-same', 0, null, 'unchanged', 1],
      ['newer-current', 'identity-same', 'identity-newer', 1, null, 'updated', 2],
      ['regression', 'identity-newer', 'identity-same', 1, '22023', null, 1]);
    const reports = [];
    for (const [name, central, incoming, version, sqlstate, disposition, storedVersion] of cases) {
      phase = 'CASE_' + name.replaceAll('-', '_').toUpperCase();
      const reset = "truncate public.admin_documents; insert into public.admin_documents(document_key,payload,version,updated_by) select '" + KEY
        + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='" + central + "';";
      const observed = JSON.parse(await psql(reset + " set statement_timeout='55s'; set request.jwt.claim.role='service_role'; set role service_role; select public.native_checkpoint_attempt(false,"
        + version + ",(select payload from native_checkpoint_payloads where name='" + incoming + "'));"));
      assert.equal(observed.sqlstate, sqlstate); assert.equal(observed.stored.version, storedVersion);
      if (disposition) { assert.equal(observed.result.disposition, disposition); assert.equal(observed.result.centralVersion, storedVersion); }
      if (sqlstate || disposition === 'unchanged') {
        const { storedPayloadMatchesIncoming, ...stored } = observed.stored;
        assert.deepEqual(stored, observed.previous); assert.equal(stored.ownerIsNull, false);
      } else { assert.equal(observed.stored.ownerIsNull, true); assert.equal(observed.stored.storedPayloadMatchesIncoming, true); }
      reports.push({ case: name, sqlstate, disposition, storedVersion });
    }
    phase = 'FINAL_PRESERVATION';
    assert.equal(await psql('select count(*) from public.admin_document_versions;'), '0');
    assert.equal(await psql(originalRowsSql), originalRowsBefore);
    assert.equal(await psql(accountRowsSql), accountRowsBefore);
    assert.deepEqual(JSON.parse(await psql(catalogSql([...allNames, ...NATIVE_IDENTITY_ORIGINAL_NAMES]))), catalogAfter);
    for (const [name, pin] of archivePins) assert.equal(sha(await fs.readFile(path.join(path.dirname(migrationPath), name))), pin);
    return { kind: 'NATIVE_SAMPLING_IDENTITY_SUCCESSOR', sqlExecuted: true, wholeMigrationExecuted: true,
      historyBefore: BEFORE.statisticsVersion, migrationVersion: migration.version,
      partCount: 673, originalFamilies: ['ffc', '249', 'c1ac', 'i71'], beforeGuardCases: guards.length,
      exactCheckpointContract: true, exactTripContract: true, schema2Catalog: true,
      timeoutSeconds: 55, migrationLocalLockTimeoutSeconds: 5, archivesUnchanged: archivePins.length, reports };
  } catch (error) {
    console.error(JSON.stringify({ kind: 'NATIVE_IDENTITY_FIRST_FAILURE', phase,
      category: error?.code === 'ERR_ASSERTION' ? 'ASSERTION_FAILED' : 'NATIVE_CALL_FAILED', privatePayloadIncluded: false }));
    throw error;
  }
}
