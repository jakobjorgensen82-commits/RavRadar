import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';

const OLD_MIGRATION = '20261010130000_owner_export_origin_bound_successor.sql';
const NEW_MIGRATION = '20261012200000_checkpoint_cas_single_projection_successor.sql';
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
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
grant usage on schema public,auth to service_role,anon,authenticated;
create table public.admin_documents(document_key text primary key,payload jsonb not null,
  version bigint not null default 1,updated_by uuid,updated_at timestamptz not null default now());
create table public.admin_document_versions(document_key text,payload jsonb,version bigint,created_by uuid);
create table public.native_checkpoint_payloads(name text primary key,payload jsonb not null);
grant select on public.admin_documents,public.native_checkpoint_payloads to service_role,anon,authenticated;
${signatures.map(name => definition(oldSource, name)).join('\n')}
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
    // Execute the ENTIRE append-only migration: registered predecessor and exact
    // installed old body, transaction, lock timeout, replacement, ACL and notify.
    // Its own precondition/permissions are not reimplemented by this fixture.
    await psql(newSource);
    assert.equal(await psql("select current_setting('lock_timeout');"), '0',
      'complete migration must commit/reset its transaction-local lock timeout');
    const fixtures = {};
    for (const [name, hour, options] of [['current',49,{}],['future',50,{}],['changed',49,{ candidateCurrentSpeedMps:0.18 }]]) {
      const sourcePath = path.join(root, `${name}-source.json`), checkpointPath = path.join(root, `${name}-checkpoint.json`);
      await fs.writeFile(sourcePath, JSON.stringify(sourceDocumentAt(hour, `rr-native-sql-${hour}`, options)));
      await saveCheckpoint({ sourcePath, checkpointPath });
      fixtures[name] = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      assert.equal(fixtures[name].partCount, 673); assert.equal(Object.keys(fixtures[name].states).length, 673);
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
    return {kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',postgresMajorVersion:programs.majorVersion,
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
