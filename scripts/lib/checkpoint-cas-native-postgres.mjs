import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { accountAssistantCatalogQuery, verifyAccountAssistantCatalogMetadata }
  from '../verify-account-assistant-schema.mjs';

const OLD_MIGRATION = '20261010130000_owner_export_origin_bound_successor.sql';
const NEW_MIGRATION = '20261012200000_checkpoint_cas_single_projection_successor.sql';
const ACCOUNT_MIGRATION = '20261013210000_account_assistant_original_bound_successor.sql';
const CAS = 'public.ravradar_ravscore_checkpoint_cas';
const KEY = 'ravscore-continuation-checkpoint';
const signatures = ['ravradar_ravscore_checkpoint_canonical_time',
  'ravradar_ravscore_checkpoint_has_forbidden_key',
  'ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_candidate_state_valid',
  'ravradar_ravscore_checkpoint_payload_valid',
  'ravradar_ravscore_checkpoint_predecessor_payload_valid',
  'ravradar_ravscore_checkpoint_top20_predecessor_projection',
  'ravradar_ravscore_checkpoint_cp_close_predecessor_projection',
  'ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
  'ravradar_ravscore_checkpoint_water_level_predecessor_projection',
  'ravradar_ravscore_checkpoint_userdata_predecessor_projection', 'version_admin_document'];
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const sqlText = text => String(text).replace(/\r\n?/g, '\n');
const command = (file, args, { input, env, timeout = 20_000 } = {}) => new Promise(resolve => {
  const child = execFile(file, args, { env, timeout, maxBuffer: 2 * 1024 * 1024 },
    (error, stdout) => resolve({ code: error ? (error.code ?? 'NATIVE_EXECFILE_UNKNOWN_ERROR') : 0, stdout: String(stdout ?? '') }));
  child.stdin?.on('error', () => {}); // Outcome is owned by execFile's actual close/error callback.
  child.stdin?.end(input ?? '');
});
const definition = (source, name) => {
  const head = `create or replace function public.${name}(`;
  const start = source.indexOf(head), end = source.indexOf('\n$$;', start);
  assert.ok(start >= 0 && end > start, 'actual SQL function definition missing');
  assert.equal(source.indexOf(head, start + head.length), -1, 'ambiguous SQL function definition');
  return source.slice(start, end + 4);
};

async function nativePrograms() {
  if (process.platform !== 'linux') throw new Error('NATIVE_POSTGRES_UNAVAILABLE_ON_THIS_HOST');
  const configured = await command('pg_config', ['--bindir']);
  if (configured.code !== 0) throw new Error('NATIVE_POSTGRES_PG_CONFIG_UNAVAILABLE');
  const candidates = [configured.stdout.trim()];
  try {
    candidates.push(...(await fs.readdir('/usr/lib/postgresql')).filter(value => /^\d+$/.test(value))
      .sort((a, b) => Number(b) - Number(a)).slice(0, 4)
      .map(value => `/usr/lib/postgresql/${value}/bin`));
  } catch { /* No installation, package download or alternative service. */ }
  for (const directory of [...new Set(candidates)]) {
    if (!path.isAbsolute(directory)) continue;
    const programs = Object.fromEntries(['initdb', 'pg_ctl', 'psql', 'postgres']
      .map(name => [name, path.join(directory, name)]));
    try { await Promise.all(Object.values(programs).map(file => fs.access(file, fs.constants.X_OK))); }
    catch { continue; }
    const versions = await Promise.all(Object.values(programs).map(file => command(file, ['--version'])));
    const majors = versions.map(result => result.code === 0 ? result.stdout.match(/\b(\d+)\.\d+\b/)?.[1] : null);
    if (majors.every(value => value !== null && value === majors[0]) && Number(majors[0]) >= 16) {
      return { ...programs, majorVersion: Number(majors[0]) };
    }
  }
  throw new Error('NATIVE_POSTGRES_COMPLETE_EXISTING_BINARIES_UNAVAILABLE');
}


// Same native server/owner, after all thirteen old130000/200000 comparisons.
// This is a source fixture, not an installed account or production checkpoint.
async function compareAccountAssistantSuccessor({ psql, runSql, source, oldSource,
  oldFixtures, currentFixtures, cases, atHour, oldCas, newCas }) {
  assert.equal(hash(source), '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d');
  await psql("insert into supabase_migrations.schema_migrations values('20261012200000');");
  const noAccountObjects = async () => assert.equal(await psql(
    "select to_regclass('public.account_activity_journal') is null and "
    + "to_regclass('public.account_statistics_preferences') is null and "
    + "to_regprocedure('public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)') is null;"), 't');
  // Test the REAL beforeGuard, not a hand-written equivalent. Each failed
  // whole transaction must leave account objects absent and CAS body unchanged.
  for (const [drift, restore] of [
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) security invoker;",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) security definer;"],
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) set search_path=public;",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) set search_path=pg_catalog,public;"],
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='54s';",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
    ["revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from service_role;",
     "grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to service_role;"],
    ["grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to anon;",
     "revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from anon;"],
    ["grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to authenticated;",
     "revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from authenticated;"],
  ]) {
    await psql(drift);
    assert.notEqual((await runSql(source)).code, 0, 'actual beforeGuard must reject predecessor properties/ACL drift');
    await noAccountObjects();
    await psql(restore);
    const stored = await psql("select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;");
    const expected = newCas.slice(newCas.indexOf('as $$') + 5, newCas.lastIndexOf('$$;')).trim();
    assert.equal(stored, expected, 'refused whole migration must preserve actual200000 CAS');
  }
  // Apply the WHOLE new append-only SOURCE, including transaction, BEFORE,
  // account DDL, exact projections/functions, AFTER ACL/body guards and notify.
  await psql(source);
  assert.equal(await psql("select current_setting('lock_timeout');"), '0');
  await psql("insert into supabase_migrations.schema_migrations values('20261013210000');");
  assert.notEqual((await runSql(source)).code, 0, 'already-installed migration must not replay');

  const successor = structuredClone(currentFixtures);
  successor.predecessor = structuredClone(oldFixtures.current);
  successor.unknown = structuredClone(successor.predecessor);
  successor.unknown.modelBinding.modelBundleSha256 = 'e'.repeat(64);
  successor.invalid = structuredClone(successor.current); successor.invalid.partCount = 672;
  successor.mixed = structuredClone(successor.predecessor);
  Object.values(successor.mixed.states)[0].modelBundleSha256 = successor.current.modelBinding.modelBundleSha256;
  successor.wrongCandidate = structuredClone(successor.predecessor);
  successor.wrongCandidate.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = 'f'.repeat(64);
  await psql('truncate public.native_checkpoint_payloads;');
  for (const [name,payload] of Object.entries(successor)) {
    const json=JSON.stringify(payload); assert.equal(json.includes('$native_fixture$'),false);
    await psql("insert into public.native_checkpoint_payloads values('" + name + "',$native_fixture$" + json + "$native_fixture$::jsonb);");
  }
  const projection='public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection';
  const whole=JSON.parse(await psql("select jsonb_build_object("
    + "'wholeEqual'," + projection + "((select payload from native_checkpoint_payloads where name='predecessor'),'"
    + atHour(49) + "')=(select payload from native_checkpoint_payloads where name='current'),"
    + "'mixedRefused'," + projection + "((select payload from native_checkpoint_payloads where name='mixed'),'" + atHour(49) + "') is null,"
    + "'candidateRefused'," + projection + "((select payload from native_checkpoint_payloads where name='wrongCandidate'),'" + atHour(49) + "') is null);"));
  assert.deepEqual(whole,{wholeEqual:true,mixedRefused:true,candidateRefused:true},
    'whole 673 payload projection, not selected state fields, must match the normal builder output');

  const properties=JSON.parse(await psql("select jsonb_build_object("
    + "'definer',p.prosecdef,'searchPath','search_path=pg_catalog, public'=any(p.proconfig),"
    + "'timeout','statement_timeout=55s'=any(p.proconfig),"
    + "'service',has_function_privilege('service_role',p.oid,'execute'),"
    + "'anon',has_function_privilege('anon',p.oid,'execute'),"
    + "'authenticated',has_function_privilege('authenticated',p.oid,'execute'),"
    + "'bodySha',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex'))"
    + " from pg_proc p where p.oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;"));
  const successorCas=definition(source,'ravradar_ravscore_checkpoint_cas');
  assert.deepEqual(properties,{definer:true,searchPath:true,timeout:true,service:true,anon:false,
    authenticated:false,bodySha:hash(successorCas.slice(successorCas.indexOf('as $$')+5,successorCas.lastIndexOf('$$;')).trim())});
  const reports=[];
  for (const [name,central,incoming,version,expectedCode,disposition,storedVersion,
    role='service_role',claimRole=role] of cases) {
    const reset="truncate public.admin_documents;" + (central
      ? "insert into public.admin_documents(document_key,payload,version,updated_by) select '" + KEY
        + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='" + central + "';" : '');
    const observed=JSON.parse(await psql(reset + "\nset statement_timeout='55s';"
      + " do $$ begin perform set_config('request.jwt.claim.role','" + claimRole + "',false); end $$; set role " + role + ";"
      + " select public.native_checkpoint_attempt(false," + version + ",(select payload from native_checkpoint_payloads where name='" + incoming + "'));"));
    assert.equal(observed.sqlstate,expectedCode,'new full-migration case ' + name);
    if (disposition) { assert.equal(observed.result.disposition,disposition); assert.equal(observed.result.centralVersion,storedVersion); }
    assert.equal(observed.stored?.version,storedVersion);
    if (expectedCode || disposition==='unchanged') {
      assert.equal(observed.stored.ownerIsNull,false);
      const {storedPayloadMatchesIncoming,...stored}=observed.stored;
      assert.deepEqual(stored,observed.previous,'new refusal/unchanged must preserve whole payload/reference/version/owner');
    } else { assert.equal(observed.stored.ownerIsNull,true); assert.equal(observed.stored.storedPayloadMatchesIncoming,true); }
    reports.push({case:name,sqlstate:expectedCode,disposition,storedVersion});
  }

  // Explicit receipt-difference oracle. Both generation receipts must remain
  // equal because the full validator requires that invariant. They therefore
  // change as a pair; no individual mismatch is admitted by the comparator.
  const receiptCases=[];
  for (const fields of [['generationPair'],['stateSha256'],['generationPair','stateSha256']]) {
    const payload=structuredClone(successor.current);
    if(fields.includes('generationPair')) {
      payload.generationSha256=hash('native successor generation receipt');
      payload.candidateGRollbackCompanion.generationSha256=payload.generationSha256;
    }
    if(fields.includes('stateSha256')) payload.stateSha256=hash('native successor state receipt');
    assert.notDeepEqual(payload,successor.current);
    const stripReceipts=value=>{
      const copy=structuredClone(value); delete copy.generationSha256; delete copy.stateSha256;
      delete copy.candidateGRollbackCompanion.generationSha256; return copy;
    };
    assert.deepEqual(stripReceipts(payload),stripReceipts(successor.current),
      'only the three already allowed receipt leaves differ in this positive fixture');
    receiptCases.push({name:'receipt-'+fields.join('-'),payload,valid:true,sqlstate:null});
  }
  const badGeneration=structuredClone(successor.current);
  badGeneration.generationSha256=hash('unpaired generation receipt');
  receiptCases.push({name:'unpaired-generation',payload:badGeneration,valid:false,sqlstate:'22023'});
  const candidateReceipt=structuredClone(successor.current);
  candidateReceipt.candidateGRollbackCompanion.stateSha256=hash('changed Candidate state receipt');
  assert.deepEqual(candidateReceipt.candidateGRollbackCompanion.states,successor.current.candidateGRollbackCompanion.states);
  receiptCases.push({name:'candidate-state-receipt',payload:candidateReceipt,valid:true,sqlstate:'23505'});
  const changedHistory=structuredClone(successor.current);
  changedHistory.candidateGRollbackCompanion.states=structuredClone(successor.changed.candidateGRollbackCompanion.states);
  assert.notDeepEqual(Object.values(changedHistory.candidateGRollbackCompanion.states)[0].transportEvidence,
    Object.values(successor.current.candidateGRollbackCompanion.states)[0].transportEvidence,
    'the existing normal Candidate builder produces genuinely different history, not a metadata-only variation');
  receiptCases.push({name:'candidate-history',payload:changedHistory,valid:true,sqlstate:'23505'});
  for(const {name,payload,valid,sqlstate} of receiptCases) {
    const json=JSON.stringify(payload);assert.equal(json.includes('$native_fixture$'),false);
    await psql("insert into public.native_checkpoint_payloads values('receipt-incoming',$native_fixture$"+json+"$native_fixture$::jsonb);");
    assert.equal(await psql("select public.ravradar_ravscore_checkpoint_payload_valid("
      + "(select payload from native_checkpoint_payloads where name='receipt-incoming'),'"+atHour(49)+"');"),valid?'t':'f',
      'receipt oracle must prove full-validator admission independently: '+name);
    const observed=JSON.parse(await psql("truncate public.admin_documents;"
      + "insert into public.admin_documents(document_key,payload,version,updated_by) select '"+KEY
      + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='predecessor';"
      + " set statement_timeout='55s'; select set_config('request.jwt.claim.role','service_role',false); set role service_role;"
      + " select public.native_checkpoint_attempt(false,1,(select payload from native_checkpoint_payloads where name='receipt-incoming'));").then(output=>output.split('\n').at(-1)));
    assert.equal(observed.sqlstate,sqlstate,name);
    if(sqlstate===null) {
      assert.equal(observed.result.disposition,'updated');assert.equal(observed.result.centralVersion,2);
      assert.equal(observed.stored.storedPayloadMatchesIncoming,true);assert.equal(observed.stored.ownerIsNull,true);
    } else {
      const {storedPayloadMatchesIncoming,...stored}=observed.stored;
      assert.deepEqual(stored,observed.previous,'receipt/history refusal preserves the entire stored original');
      assert.equal(stored.ownerIsNull,false);
    }
    await psql("delete from public.native_checkpoint_payloads where name='receipt-incoming';");
  }
  const catalogMetadata=JSON.parse(await psql(accountAssistantCatalogQuery));
  const catalogReceipt=await verifyAccountAssistantCatalogMetadata(catalogMetadata);
  assert.equal(catalogReceipt.status,'ACCOUNT_ASSISTANT_SCHEMA_MATCH');
  assert.equal(catalogReceipt.accountRowsRead,false);
  for(const drift of [
    'grant execute on function public.get_own_statistics_preference() to authenticated with grant option;',
    'create role native_catalog_unexpected nologin; grant select(user_id) on public.account_statistics_preferences to native_catalog_unexpected;',
  ]) {
    const unsafe=JSON.parse(await psql('begin;'+drift+accountAssistantCatalogQuery+'rollback;'));
    await assert.rejects(verifyAccountAssistantCatalogMetadata(unsafe),
      /ACCOUNT_ASSISTANT_CATALOG_MISMATCH/,
      'the installed catalog reader must reject delegated RPC and hidden column grants');
  }
  assert.deepEqual(await verifyAccountAssistantCatalogMetadata(JSON.parse(await psql(accountAssistantCatalogQuery))),
    catalogReceipt,'transactional metadata negatives restore the exact account catalog');

  const ownerA='00000000-0000-0000-0000-000000000001';
  const ownerB='00000000-0000-0000-0000-000000000002';
  const missing='00000000-0000-0000-0000-000000000003';
  await psql("insert into public.profiles(id) values('" + ownerA + "'),('" + ownerB + "');");
  const accountSession=(uid,role='authenticated',claim=role)=>"select set_config('request.jwt.claim.sub','" + uid
    + "',false); select set_config('request.jwt.claim.role','" + claim + "',false); set role " + role + ";";
  const ownCall=async (uid,name)=>JSON.parse((await psql(accountSession(uid)
    + 'select public.' + name + '();')).split('\n').at(-1));
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:true,source:'default'});
  assert.equal(await psql('select count(*) from public.account_statistics_preferences;'),'0',
    'default read is not a stored opt-in or statistic processing');
  assert.deepEqual(await ownCall(ownerA,'disable_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerB,'get_own_statistics_preference'),{enabled:true,source:'default'});
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerB,'enable_own_statistics_preference'),{enabled:true,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:false,source:'stored'},
    'another owner cannot overwrite a stored false');
  assert.deepEqual(await ownCall(ownerA,'enable_own_statistics_preference'),{enabled:true,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'disable_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'record_account_activity'),{recorded:true});
  const first=await psql("select first_observed_at::text from public.account_activity_journal where user_id='" + ownerA + "';");
  assert.deepEqual(await ownCall(ownerA,'record_account_activity'),{recorded:true});
  assert.equal(await psql("select first_observed_at::text from public.account_activity_journal where user_id='" + ownerA + "';"),first);
  assert.equal(await psql("select last_activity_at>=first_observed_at from public.account_activity_journal where user_id='" + ownerA + "';"),'t');
  assert.equal(await psql("select count(*) from public.account_activity_journal where user_id='" + ownerB + "';"),'0');

  // Use real SQL identities/ACL/RLS, not a mocked auth return or request payload.
  for (const uid of ['',missing]) for (const name of ['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference']) {
    assert.notEqual((await runSql(accountSession(uid)+'select public.'+name+'();')).code,0);
  }
  for (const name of ['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference']) {
    for (const role of ['anon','service_role']) assert.notEqual((await runSql(accountSession(ownerA,role)+'select public.'+name+'();')).code,0);
  }
  for (const table of ['account_activity_journal','account_statistics_preferences']) {
    assert.equal(await psql("select relrowsecurity from pg_class where oid='public."+table+"'::regclass;"),'t');
    assert.notEqual((await runSql(accountSession(ownerA)+'select * from public.'+table+';')).code,0,
      'ordinary authenticated table read must be denied, including its own rows');
    // Temporary fixture-only grant demonstrates that the actual enabled RLS
    // still denies all direct rows; rollback preserves the migration ACL.
    const rls=(await psql('begin; grant select on public.'+table+' to authenticated;'
      + accountSession(ownerA)+'select count(*) from public.'+table+'; rollback;')).split('\n').at(-1);
    assert.equal(rls,'0');
    assert.equal(await psql("select has_table_privilege('authenticated','public."+table+"','select');"),'f');
  }
  assert.equal(await psql('select count(*) from public.account_statistics_preferences;'),'2');
  return {kind:'NATIVE_ACCOUNT_ASSISTANT_SUCCESSOR',wholeMigrationExecuted:true,
    migrationSQLSha256:hash(source),normalModelPartCount:673,wholeProjectionEqual:true,
    oldSemanticsRechecked:reports.length,beforeGuardDriftCases:6,accountOwnerAclRls:true,
    receiptDifferenceCases:receiptCases.length,installedCatalog:catalogReceipt,reports};
}

// Called ONLY by the existing protected-checkpoint target's native-only branch.
// Its real 673 model builders and normal checkpoint saver supply the fixtures.
export async function runNativeCheckpointSqlComparison({ repositoryRoot,
  sourceDocumentAt, atHour, saveCheckpoint } = {}) {
  const programs = await nativePrograms();
  assert.ok(typeof sourceDocumentAt === 'function' && typeof atHour === 'function'
    && typeof saveCheckpoint === 'function', 'normal fixture constructors are required');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-checkpoint-pg-'));
  assert.match(root, /^[A-Za-z0-9_/-]+$/, 'private native directory cannot be passed safely to pg_ctl');
  const data = path.join(root, 'database'), socket = path.join(root, 'socket');
  await fs.mkdir(socket, { mode: 0o700 });
  const env = { PATH: process.env.PATH, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'UTC',
    PGHOST: socket, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: 'rr_native_test',
    PGPASSFILE: path.join(root, 'absent-password-file'), PGSSLMODE: 'disable' };
  const runSql = (input, timeout = 70_000) => command(programs.psql,
    ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', '5432', '-U', 'rr_native_test', '-d', 'postgres'],
    { input, env, timeout });
  const psql = async (input, timeout = 70_000) => {
    const result = await command(programs.psql,
      ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', '5432', '-U', 'rr_native_test', '-d', 'postgres'],
      { input, env, timeout });
    if (result.code !== 0) throw new Error('NATIVE_POSTGRES_SQL_COMMAND_FAILED');
    return result.stdout.trim();
  };
  let owner = null, started = false, stopped = false, cleanupAllowed = false;
  const readOwner = async () => {
    const pid = Number((await fs.readFile(path.join(data, 'postmaster.pid'), 'utf8')).split('\n')[0]);
    assert.ok(Number.isSafeInteger(pid) && pid > 1, 'owned server PID missing');
    const argv = (await fs.readFile(`/proc/${pid}/cmdline`, 'utf8')).split('\0');
    assert.ok(argv.includes(data), 'native PostgreSQL is not bound to its owned directory');
    const stat = await fs.readFile(`/proc/${pid}/stat`, 'utf8');
    return { pid, birth: stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] };
  };
  try {
    const initialized = await command(programs.initdb,
      ['-D', data, '-U', 'rr_native_test', '--no-locale', '--encoding=UTF8', '--auth-local=trust', '--auth-host=reject'], { env });
    assert.equal(initialized.code, 0, 'existing native initdb failed');
    // An unknown launch outcome must preserve this private directory.
    const launch = await command(programs.pg_ctl, ['-D', data, '-l', path.join(root,'server.log'), '-w', '-t', '20', 'start', '-o',
      `-k ${socket} -p 5432 -c listen_addresses='' -c unix_socket_permissions=0700 -c log_statement=none -c log_min_error_statement=panic -c log_error_verbosity=terse`], { env });
    assert.equal(launch.code, 0, 'private Unix-socket PostgreSQL failed to start');
    started = true; owner = await readOwner();
    assert.equal(await psql("select current_setting('listen_addresses');"), '', 'TCP must remain disabled');
    const oldSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', OLD_MIGRATION), 'utf8'));
    const newSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', NEW_MIGRATION), 'utf8'));
    const accountSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', ACCOUNT_MIGRATION), 'utf8'));
    const oldCas = definition(oldSource, 'ravradar_ravscore_checkpoint_cas');
    const newCas = definition(newSource, 'ravradar_ravscore_checkpoint_cas');
    const aliasCas = oldCas.replace(`function ${CAS}(`, `function ${CAS}_baseline(`);
    const setup = `
create schema auth; create schema extensions; create schema supabase_migrations;
create table supabase_migrations.schema_migrations(version text primary key);
insert into supabase_migrations.schema_migrations values('20261010130000');
create extension pgcrypto with schema extensions;
create role service_role nologin bypassrls; create role anon nologin; create role authenticated nologin;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.profiles(id uuid primary key);
grant usage on schema public,auth to service_role,anon,authenticated;
create table public.admin_documents(document_key text primary key,payload jsonb not null,
  version bigint not null default 1,updated_by uuid,updated_at timestamptz not null default now());
create table public.admin_document_versions(document_key text,payload jsonb,version bigint,created_by uuid);
create table public.native_checkpoint_payloads(name text primary key,payload jsonb not null);
grant select on public.admin_documents,public.native_checkpoint_payloads to service_role,anon,authenticated;
${signatures.map(name => definition(oldSource, name)).join('\n')}
${definition(oldSource,'ravradar_trip_v3_calibration_truth_allowed')}
revoke all on function public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)
  to service_role;
${['ravradar_ravscore_checkpoint_integrated_state_reason','ravradar_ravscore_checkpoint_payload_reason',
  'ravradar_trip_v3_binding_allowed','ravradar_ravscore_checkpoint_contract'].map(name => definition(oldSource,name)).join('\n')}
create trigger native_checkpoint_version before update on public.admin_documents
for each row execute function public.version_admin_document();
${aliasCas}\n${oldCas}
revoke all on function ${CAS}(bigint,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function ${CAS}_baseline(bigint,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function ${CAS}(bigint,timestamptz,jsonb),${CAS}_baseline(bigint,timestamptz,jsonb) to service_role;
alter function ${CAS}(bigint,timestamptz,jsonb) set statement_timeout='55s';
alter function ${CAS}_baseline(bigint,timestamptz,jsonb) set statement_timeout='55s';
create function public.native_checkpoint_attempt(p_baseline boolean,p_expected bigint,p_payload jsonb)
returns jsonb language plpgsql as $$
declare result jsonb; code text; stored jsonb; previous jsonb; started timestamptz:=clock_timestamp();
begin
  select jsonb_build_object('version',version,'reference',payload->>'productionReferenceAt',
    'payloadMd5',md5(payload::text),'ownerIsNull',updated_by is null) into previous
    from public.admin_documents where document_key='${KEY}';
  begin
    if p_baseline then result:=public.ravradar_ravscore_checkpoint_cas_baseline(p_expected,(p_payload->>'productionReferenceAt')::timestamptz,p_payload);
    else result:=public.ravradar_ravscore_checkpoint_cas(p_expected,(p_payload->>'productionReferenceAt')::timestamptz,p_payload); end if;
  exception when query_canceled then get stacked diagnostics code=returned_sqlstate;
    when others then get stacked diagnostics code=returned_sqlstate; end;
  select jsonb_build_object('version',version,'reference',payload->>'productionReferenceAt',
    'storedPayloadMatchesIncoming',payload=p_payload,'payloadMd5',md5(payload::text),
    'ownerIsNull',updated_by is null) into stored from public.admin_documents where document_key='${KEY}';
  return jsonb_build_object('sqlstate',code,'result',result,'stored',stored,'previous',previous,
    'elapsedMs',extract(epoch from (clock_timestamp()-started))*1000);
end $$;
grant execute on function public.native_checkpoint_attempt(boolean,bigint,jsonb) to service_role,anon,authenticated;`;
    await psql(setup);
    const calibrationSignature='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)';
    const calibrationAcl=JSON.parse(await psql("select jsonb_build_object("
      + "'public',exists(select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a"
      + " where p.oid='"+calibrationSignature+"'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE'),"
      + "'anon',has_function_privilege('anon','"+calibrationSignature+"','EXECUTE'),"
      + "'authenticated',has_function_privilege('authenticated','"+calibrationSignature+"','EXECUTE'),"
      + "'service',has_function_privilege('service_role','"+calibrationSignature+"','EXECUTE'));"));
    assert.deepEqual(calibrationAcl,{public:false,anon:false,authenticated:false,service:true},
      'actual old calibration-truth definition retains its original service-only ACL');
    // Execute the ENTIRE append-only migration: registered predecessor and exact
    // installed old body, transaction, lock timeout, replacement, ACL and notify.
    // Its own precondition/permissions are not reimplemented by this fixture.
    await psql(newSource);
    assert.equal(await psql("select current_setting('lock_timeout');"), '0',
      'complete migration must commit/reset its transaction-local lock timeout');
    const fixtures = {}, currentFixtures = {};
    const oldTuple={integrated:'249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932',
      candidate:'55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957',
      continuation:'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0'};
    const newTuple={integrated:'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5',
      candidate:'2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9',
      continuation:'7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'};
    function metadataFixture(payload,from,to) {
      assert.equal(payload.modelBinding.modelBundleSha256,from.integrated);
      assert.equal(payload.continuationStateContractSha256,from.continuation);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,from.candidate);
      const copy=structuredClone(payload);
      copy.modelBinding.modelBundleSha256=to.integrated;
      copy.continuationStateContractSha256=to.continuation;
      copy.candidateGRollbackCompanion.modelBinding.modelBundleSha256=to.candidate;
      for(const state of Object.values(copy.states)) {
        assert.equal(state.modelBundleSha256,from.integrated); state.modelBundleSha256=to.integrated;
      }
      return copy;
    }
    for (const [name, hour, options] of [['current',49,{}],['future',50,{}],['changed',49,{ candidateCurrentSpeedMps:0.18 }]]) {
      const sourcePath = path.join(root, `${name}-source.json`), checkpointPath = path.join(root, `${name}-checkpoint.json`);
      await fs.writeFile(sourcePath, JSON.stringify(sourceDocumentAt(hour, `rr-native-sql-${hour}`, options)));
      await saveCheckpoint({ sourcePath, checkpointPath });
      fixtures[name] = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      assert.equal(fixtures[name].partCount, 673); assert.equal(Object.keys(fixtures[name].states).length, 673);
      currentFixtures[name]=structuredClone(fixtures[name]);
      fixtures[name]=metadataFixture(currentFixtures[name],newTuple,oldTuple);
      assert.deepEqual(metadataFixture(fixtures[name],oldTuple,newTuple),currentFixtures[name],
        'historical thirteen-case fixture differs only in exact binding metadata');
    }
    // Exact metadata-only predecessor of the normal current-builder fixture.
    // Native SQL must itself validate its unchanged 673 state values/projection.
    fixtures.predecessor = structuredClone(fixtures.current);
    fixtures.predecessor.modelBinding.modelBundleSha256 = 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb';
    fixtures.predecessor.continuationStateContractSha256 = '4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51';
    fixtures.predecessor.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = '8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3';
    Object.values(fixtures.predecessor.states).forEach(state => { state.modelBundleSha256 = fixtures.predecessor.modelBinding.modelBundleSha256; });
    fixtures.unknown = structuredClone(fixtures.predecessor); fixtures.unknown.modelBinding.modelBundleSha256 = 'e'.repeat(64);
    fixtures.invalid = structuredClone(fixtures.current); fixtures.invalid.partCount = 672;
    for (const [name,payload] of Object.entries(fixtures)) {
      const json = JSON.stringify(payload); assert.equal(json.includes('$native_fixture$'),false);
      await psql(`insert into public.native_checkpoint_payloads values('${name}',$native_fixture$${json}$native_fixture$::jsonb);`);
    }
    const checked = JSON.parse(await psql(`select jsonb_build_object('current',public.ravradar_ravscore_checkpoint_payload_valid((select payload from native_checkpoint_payloads where name='current'),'${atHour(49)}'),
      'predecessor',public.ravradar_ravscore_checkpoint_userdata_predecessor_projection((select payload from native_checkpoint_payloads where name='predecessor'),'${atHour(49)}') is not null,
      'definer',(select prosecdef from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'timeout',(select 'statement_timeout=55s'=any(proconfig) from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'searchPath',(select 'search_path=pg_catalog, public'=any(proconfig) from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'anonCanExecute',has_function_privilege('anon','${CAS}(bigint,timestamptz,jsonb)','execute'),
      'newBodySha256',(select encode(extensions.digest(btrim(prosrc,E' \\r\\n\\t')::bytea,'sha256'),'hex') from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'oldBodySha256',(select encode(extensions.digest(btrim(prosrc,E' \\r\\n\\t')::bytea,'sha256'),'hex') from pg_proc where oid='${CAS}_baseline(bigint,timestamptz,jsonb)'::regprocedure));`));
    const body = source => source.slice(source.indexOf('as $$')+5,source.lastIndexOf('$$;')).trim();
    assert.deepEqual(checked,{ current:true,predecessor:true,definer:true,timeout:true,
      searchPath:true,anonCanExecute:false,newBodySha256:hash(body(newCas)),oldBodySha256:hash(body(oldCas)) });
    const cases = [
      ['insert',null,'current',0,null,'inserted',1],
      ['equal-stale-version','current','current',999,null,'unchanged',1],
      ['same-reference-changed-state','current','changed',1,'23505',null,1],
      ['regression','future','current',1,'22023',null,1],
      ['wrong-version','current','future',0,'40001',null,1],
      ['higher-reference','current','future',1,null,'updated',2],
      ['negative-version','current','current',-1,'22023',null,1],
      ['role-rejection','current','current',1,'42501',null,1,'service_role','anon'],
      ['ACL-rejection','current','current',1,'42501',null,1,'anon','anon'],
      ['same-predecessor','predecessor','current',1,null,'updated',2],
      ['changed-predecessor-state','predecessor','changed',1,'23505',null,1],
      ['unknown-predecessor','unknown','current',1,'22023',null,1],
      ['invalid-incoming','current','invalid',1,'22023',null,1],
    ];
    const reports=[];
    for (const [name,central,incoming,version,expectedCode,disposition,storedVersion,
      role='service_role',claimRole=role] of cases) {
      const observations=[];
      for (const baseline of [true,false]) {
        const reset = `truncate public.admin_documents;${central ? `insert into public.admin_documents(document_key,payload,version,updated_by) select '${KEY}',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='${central}';` : ''}`;
        const observed=JSON.parse(await psql(`${reset}
set statement_timeout='55s'; do $$ begin perform set_config('request.jwt.claim.role','${claimRole}',false); end $$; set role ${role};
select public.native_checkpoint_attempt(${baseline},${version},(select payload from native_checkpoint_payloads where name='${incoming}'));`));
        if (observed.sqlstate!==expectedCode) {
          throw new Error(`NATIVE_POSTGRES_CASE_${name.replace(/-/g,'_').toUpperCase()}_SQLSTATE_${observed.sqlstate??'OK'}`);
        }
        if (disposition) { assert.equal(observed.result.disposition,disposition); assert.equal(observed.result.centralVersion,storedVersion); }
        assert.equal(observed.stored?.version,storedVersion);
        if (expectedCode || disposition==='unchanged') {
          assert.equal(observed.stored.ownerIsNull,false,'refused/unchanged CAS must preserve stored owner');
          const { storedPayloadMatchesIncoming,...stored }=observed.stored;
          assert.deepEqual(stored,observed.previous,'refused/unchanged CAS must preserve exact native stored payload/reference/version/owner');
        } else assert.equal(observed.stored.ownerIsNull,true);
        observations.push(observed);
      }
      const withoutTiming = value => { const { elapsedMs,...semantic }=value;return semantic; };
      assert.deepEqual(withoutTiming(observations[1]),withoutTiming(observations[0]),`native old/new ${name} invariance`);
      reports.push({case:name,oldElapsedMs:observations[0].elapsedMs,newElapsedMs:observations[1].elapsedMs,sqlstate:expectedCode,disposition,storedVersion});
    }
    const accountAssistant=await compareAccountAssistantSuccessor({psql,runSql,source:accountSource,oldSource,
      oldFixtures:fixtures,currentFixtures,cases,atHour,oldCas,newCas});
    return {kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',accountAssistant,postgresMajorVersion:programs.majorVersion,
      tcpEnabled:false,normalModelPartCount:673,sqlExecuted:true,migrationExecuted:true,
      migrationSQLSha256:hash(newSource),caseCount:reports.length,
      oldCasDefinitionSha256:hash(oldCas),newCasDefinitionSha256:hash(newCas),reports};
  } finally {
    if (started) {
      const current = await readOwner(); assert.deepEqual(current,owner,'native server ownership changed; preserve directory');
      const stop=await command(programs.pg_ctl,['-D',data,'-m','immediate','-w','-t','20','stop'],{env});
      assert.equal(stop.code,0,'native server stop was not proved; preserve directory');
      const status=await command(programs.pg_ctl,['-D',data,'status'],{env});
      assert.equal(status.code,3,'native server is not physically terminal; preserve directory');
      stopped=true;
      cleanupAllowed=true;
    }
    const resolved=path.resolve(root), temp=path.resolve(os.tmpdir());
    assert.ok(path.dirname(resolved)===temp && path.basename(resolved).startsWith('rr-checkpoint-pg-'));
    if (cleanupAllowed && (!started || stopped)) await fs.rm(resolved,{recursive:true,force:false});
  }
}
