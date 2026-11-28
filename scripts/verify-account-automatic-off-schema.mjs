import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {
  accountErasureCatalogQuery, readAccountErasureSource, tripRecoveryCatalogQuery,
  verifyAccountErasureCatalogMetadata, verifyAccountErasureCheckReference,
} from './verify-account-erasure-schema.mjs';
import {ACCOUNT_AUTOMATIC_OFF_MIGRATIONS, readAccountAutomaticOffSql} from './lib/account-automatic-off-source.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const sqlText = value => "'" + value.replaceAll("'", "''") + "'";
const subquery = query => query.trim().replace(/;$/, '');
const modeCheckName = 'account_erasure_operations_mode_check';
const oldModeCheck = "CHECK ((mode = 'MANUAL_OWNER'::text))";
const automaticModeCheck = "CHECK ((mode = ANY (ARRAY['MANUAL_OWNER'::text, 'AUTOMATIC_INACTIVITY'::text])))";
const tripGuardName = 'guard_trip_erasure_recovery_write';

const executionRoles = {
  [tripGuardName]: 'none',
  account_automatic_erasure_auth_generation_guard: 'none',
  account_automatic_erasure_recipient_digest: 'none',
  account_erasure_commit_pg_stage: 'none',
  get_account_erasure_status: 'authenticated',
  list_account_erasure_operations: 'authenticated',
  find_account_erasure_operation: 'authenticated',
  stage_account_erasure_pg: 'authenticated',
  list_account_automatic_erasure_work: 'service_role',
  stage_account_automatic_erasure: 'service_role',
  account_automatic_erasure_drop_notice_data: 'none',
  prepare_account_automatic_notice_work: 'service_role',
  claim_account_automatic_notice: 'service_role',
};

function functionDefinitions(source) {
  const pattern = /^create (?:or replace )?function public\.(\w+)\(([^)]*)\)\s*returns (\w+)\s+language (plpgsql|sql)([\s\S]*?)\bas \$(\w*)\$([\s\S]*?)\$\6\$;/gm;
  return [...source.matchAll(pattern)].map(([, name, args, result, language, settings, , body]) => {
    const types = args.trim() ? args.split(',').map(arg => arg.trim().split(/\s+/)[1]).join(',') : '';
    const names = args.replace(/\s+/g, ' ').replace(/,\s*/g, ', ').trim().replace(' default null', ' DEFAULT NULL::uuid');
    const configuration = ['search_path=""'];
    assert.match(settings, /set search_path = ''/);
    if (settings.includes("set lock_timeout = '5s'")) configuration.push('lock_timeout=5s');
    const flags = settings.trim().replace(/set (?:search_path = ''|lock_timeout = '5s')/g, '').trim();
    assert.match(flags, /^(?:immutable strict|stable security definer|security definer)?$/);
    return {name, signature: 'public.' + name + '(' + types + ')', names, result, language, configuration,
      hash: sha256(body), legacyHash: sha256(body.trim()),
      definer: flags.includes('security definer'), strict: flags.includes('strict'),
      volatility: flags.includes('immutable') ? 'i' : flags.includes('stable') ? 's' : 'v'};
  });
}

const tableColumns = {
  account_automatic_erasure_policy: [['singleton', 'bool', true, 'true'], ['enabled', 'bool', true, 'false'],
    ['recovery_qualified', 'bool', true, 'false']],
  account_automatic_erasure_admissions: [['operation_id', 'uuid', true, null], ['notice_revision', 'int8', true, null],
    ['auth_user_created_at', 'text', true, null], ['recipient_digest', 'text', true, null]],
  account_automatic_notice_policy: [['singleton', 'bool', true, 'true'], ['enabled', 'bool', true, 'false']],
  account_automatic_notice_dispatches: [['notice_id', 'uuid', true, null], ['poll_requested_at', 'timestamptz', false, null]],
};

const tableConstraints = {
  account_automatic_erasure_policy: [3, null, null],
  account_automatic_erasure_admissions: [5, 'public.account_erasure_operations', 'r'],
  account_automatic_notice_policy: [2, null, null],
  account_automatic_notice_dispatches: [3, 'public.account_inactivity_notices', 'c'],
};

function catalogQuery(functions) {
  const functionRows = functions.map(f => '(' + [
    f.name, f.signature, f.names, f.result, f.language, f.volatility, f.hash, executionRoles[f.name],
  ].map(sqlText).join(',') + ',' + f.definer + ',' + f.strict + ',array[' + f.configuration.map(sqlText).join(',') + '])');
  const tableRows = Object.entries(tableColumns).map(([name, columns]) => {
    const [count, reference, deleteAction] = tableConstraints[name];
    return '(' + [sqlText('public.' + name), sqlText(JSON.stringify(columns)) + '::jsonb', count,
      reference ? sqlText(reference) : 'null', deleteAction ? sqlText(deleteAction) : 'null'].join(',') + ')';
  });
  return String.raw`with manual_catalog as (
  ${subquery(accountErasureCatalogQuery)}
), trip_catalog as (
  ${subquery(tripRecoveryCatalogQuery)}
), function_scope(name, signature, arguments, result, language, volatility, body_hash, exposure, definer, strict, configuration) as (
  values ${functionRows.join(',\n  ')}
), table_scope(signature, columns, constraint_count, reference_relation, delete_action) as (
  values ${tableRows.join(',\n  ')}
), trigger_scope(name, function_signature, events, update_column) as (
  values ('account_erasure_recovery_guard', 'public.guard_trip_erasure_recovery_write()', 62, null),
    ('account_automatic_erasure_auth_generation_guard', 'public.account_automatic_erasure_auth_generation_guard()', 19, 'auth_user_created_at'),
    ('account_automatic_erasure_drop_notice_data', 'public.account_automatic_erasure_drop_notice_data()', 17, 'state')
), outbox as (
  select oid, relowner from pg_catalog.pg_class where oid = 'public.account_erasure_operations'::regclass
)
select (select metadata from manual_catalog) as manual,
 (select functions_ok and tables_ok and triggers_ok from trip_catalog) as trip_ok,
 (select count(*) = ${functions.length} and bool_and((
   p.proowner = outbox.relowner and p.prokind = 'f' and not p.proretset and p.provariadic = 0
   and p.prosecdef = s.definer and p.proisstrict = s.strict and p.provolatile::text = s.volatility
   and l.lanname::text = s.language and p.proconfig = s.configuration
   and pg_catalog.pg_get_function_arguments(p.oid) = s.arguments and pg_catalog.pg_get_function_result(p.oid) = s.result
   and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc, 'UTF8')), 'hex') = s.body_hash
   and (select count(*) from pg_catalog.pg_proc same where same.pronamespace = p.pronamespace and same.proname = p.proname) = 1
   and not pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
   and pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') = (s.exposure = 'authenticated')
   and pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') = (s.exposure = 'service_role')
   and not pg_catalog.has_function_privilege('supabase_auth_admin', p.oid, 'EXECUTE')
   and not exists (select 1 from pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
     where a.grantee <> p.proowner and (s.exposure = 'none'
       or pg_catalog.pg_get_userbyid(a.grantee)::text is distinct from s.exposure or a.is_grantable))
   ) is true)
   from function_scope s join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(s.signature)
   join pg_catalog.pg_language l on l.oid = p.prolang cross join outbox) as functions_ok,
 (select count(*) = 4 and bool_and((
   c.relkind = 'r' and c.relowner = outbox.relowner and c.relrowsecurity and c.relforcerowsecurity
   and not c.relispartition and not exists (select 1 from pg_catalog.pg_inherits where inhrelid = c.oid or inhparent = c.oid)
   and not exists (select 1 from pg_catalog.pg_policy where polrelid = c.oid)
   and not exists (select 1 from pg_catalog.pg_trigger where tgrelid = c.oid and not tgisinternal)
   and not exists (select 1 from pg_catalog.aclexplode(coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
     where a.grantee <> c.relowner)
   and not exists (select 1 from pg_catalog.pg_attribute a cross join lateral pg_catalog.aclexplode(a.attacl) acl
     where a.attrelid = c.oid and a.attnum > 0 and acl.grantee <> c.relowner)
   and not exists (select 1 from unnest(array['anon','authenticated','service_role','supabase_auth_admin']) r(role_name)
     where pg_catalog.has_table_privilege(r.role_name::name, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       or pg_catalog.has_any_column_privilege(r.role_name::name, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'))
   and (select count(*) from pg_catalog.pg_constraint k where k.conrelid = c.oid) = s.constraint_count
   and not exists (select 1 from pg_catalog.pg_constraint k where k.conrelid = c.oid
     and (not k.convalidated or k.condeferrable or k.contype not in ('p', 'c', 'f')))
   and exists (select 1 from pg_catalog.pg_constraint k where k.conrelid = c.oid
     and k.contype = 'p' and k.conkey = array[1]::smallint[])
   and (select count(*) from pg_catalog.pg_constraint k where k.conrelid = c.oid and k.contype = 'f')
     = case when s.reference_relation is null then 0 else 1 end
   and (s.reference_relation is null or exists (select 1 from pg_catalog.pg_constraint k where k.conrelid = c.oid
     and k.contype = 'f' and k.confrelid = pg_catalog.to_regclass(s.reference_relation)
     and k.conkey = array[1]::smallint[] and k.confkey = array[1]::smallint[]
     and k.confdeltype::text = s.delete_action and k.confupdtype = 'a' and k.confmatchtype = 's'))
   and pg_catalog.jsonb_array_length(s.columns) = (select count(*) from pg_catalog.pg_attribute a
     where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)
   and s.columns = (select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(a.attname, t.typname, a.attnotnull,
       pg_catalog.pg_get_expr(d.adbin, a.attrelid)) order by a.attnum)
     from pg_catalog.pg_attribute a
     join pg_catalog.pg_type t on t.oid = a.atttypid and t.typnamespace = 'pg_catalog'::regnamespace
     left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attidentity = '' and a.attgenerated = '')
   ) is true)
   from table_scope s join pg_catalog.pg_class c on c.oid = pg_catalog.to_regclass(s.signature) cross join outbox) as tables_ok,
 (select count(*) = 3 and bool_and((
    not t.tgisinternal and t.tgenabled = 'O' and t.tgtype = s.events and t.tgnargs = 0
    and t.tgfoid = pg_catalog.to_regprocedure(s.function_signature)
    and t.tgattr::text = case when s.update_column is null then '' else
      (select a.attnum::text from pg_catalog.pg_attribute a where a.attrelid = outbox.oid and a.attname = s.update_column) end
    and case when s.events <> 17 then t.tgqual is null else
      t.tgqual is not null and pg_catalog.pg_get_triggerdef(t.oid, false) ~
        $when$ WHEN [([:space:]]+new\.mode = 'AUTOMATIC_INACTIVITY'::text[)[:space:]]+AND [([:space:]]*old\.state <> 'COMPLETE'::text[)[:space:]]+AND [([:space:]]*new\.state = 'COMPLETE'::text[)[:space:]]+EXECUTE FUNCTION $when$
    end
   ) is true)
   from trigger_scope s cross join outbox
   join pg_catalog.pg_trigger t on t.tgrelid = outbox.oid and t.tgname = s.name) as triggers_ok,
 (select count(*) = 1 and bool_and(singleton is true and enabled is false and recovery_qualified is false)
   from public.account_automatic_erasure_policy) as erasure_off,
 (select count(*) = 1 and bool_and(singleton is true and enabled is false)
   from public.account_automatic_notice_policy) as notices_off;`;
}

export async function createAutomaticAccountOffSchemaReadback(expectedManualCheckReference) {
  const prior = verifyAccountErasureCheckReference(expectedManualCheckReference);
  assert.deepEqual(prior.definitions.filter(([name]) => name === modeCheckName), [[modeCheckName, oldModeCheck]]);
  const tripSource = (await readFile(new URL('../supabase/migrations/20261127095500_trip_owner_erasure_intents.sql', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  assert.equal(sha256(tripSource), 'a642ed82053544f48be7de53867d846736feb6c8d6e0862c029f0493d7b0c59a');
  const source = await Promise.all(ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(migration => readAccountAutomaticOffSql(migration)));
  const functions = [...functionDefinitions(tripSource).filter(({name}) => name === tripGuardName),
    ...source.flatMap(functionDefinitions)];
  assert.deepEqual(functions.map(({name}) => name).sort(), Object.keys(executionRoles).sort());
  const legacySource = readAccountErasureSource();
  for (const {name, legacyHash} of functions) {
    if (Object.hasOwn(legacySource.bodies, name)) legacySource.bodies[name] = legacyHash;
  }

  return {
    query: catalogQuery(functions),
    verifyRows(rows) {
      try {
        assert(Array.isArray(rows) && rows.length === 1);
        const {manual, ...proof} = rows[0];
        assert.deepEqual(proof, {trip_ok:true, functions_ok:true, tables_ok:true, triggers_ok:true,
          erasure_off:true, notices_off:true});
        assert.equal(manual.table.userTriggers, 3);
        const mode = manual.checks.definitions.filter(([name]) => name === modeCheckName);
        assert.deepEqual(mode, [[modeCheckName, automaticModeCheck]]);
        // Prove each successor delta before the historical verifier checks
        // every other legacy invariant against the original reference.
        verifyAccountErasureCatalogMetadata([{metadata:{...manual,
          table:{...manual.table, userTriggers:0},
          checks:{...manual.checks, definitions:manual.checks.definitions.map(([name, definition]) =>
            [name, name === modeCheckName ? oldModeCheck : definition])},
        }}], {source:legacySource, expectedCheckReference:prior});
      } catch {
        throw new Error('ACCOUNT_AUTOMATIC_OFF_CATALOG_MISMATCH');
      }
      return Object.freeze({kind:'ACCOUNT_AUTOMATIC_OFF_SCHEMA_INSTALLED', catalogVerified:true,
        migrationVersions:ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(({version}) => version),
        automaticErasureEnabled:false, automaticErasureRecoveryQualified:false, automaticNoticesEnabled:false,
        activationAuthority:false});
    },
  };
}

// The fixed catalogue transport is private to the historical module. Keep
// this new bounded query local so historical proof input bytes stay unchanged.
async function readCatalog(query, accessToken, fetchImpl) {
  assert(typeof accessToken === 'string' && accessToken.length > 0 && !/[\r\n]/.test(accessToken));
  const controller = new AbortController();
  let rejectDeadline;
  const deadline = new Promise((_, reject) => { rejectDeadline = reject; });
  const timer = setTimeout(() => rejectDeadline(new Error('ACCOUNT_AUTOMATIC_OFF_CATALOG_TIMEOUT')), 15_000);
  const bounded = operation => Promise.race([operation, deadline]);
  try {
    const response = await bounded(fetchImpl('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query', {
      method:'POST', redirect:'error', cache:'no-store', credentials:'omit', signal:controller.signal,
      headers:{authorization:'Bearer ' + accessToken, 'content-type':'application/json'},
      body:JSON.stringify({query, read_only:true}),
    }));
    assert(response.status === 201 && !response.redirected && response.body, 'ACCOUNT_AUTOMATIC_OFF_CATALOG_RESPONSE');
    const limit = 32_768;
    const declared = response.headers.get('content-length');
    assert(declared === null || (/^\d+$/.test(declared) && Number(declared) <= limit), 'ACCOUNT_AUTOMATIC_OFF_CATALOG_RESPONSE');
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      for (;;) {
        const part = await bounded(reader.read());
        if (part.done) break;
        assert(part.value instanceof Uint8Array && (length += part.value.byteLength) <= limit,
          'ACCOUNT_AUTOMATIC_OFF_CATALOG_RESPONSE');
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    const result = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks, length)));
    if (Array.isArray(result)) return result;
    const keys = Object.keys(result ?? {});
    if (keys.length === 1 && ['result','data'].includes(keys[0])) return result[keys[0]];
    throw new Error('ACCOUNT_AUTOMATIC_OFF_CATALOG_RESPONSE');
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function verifyInstalledAutomaticAccountOffSchema({
  accessToken, expectedManualCheckReference, fetchImpl = globalThis.fetch,
}) {
  const {query, verifyRows} = await createAutomaticAccountOffSchemaReadback(expectedManualCheckReference);
  return verifyRows(await readCatalog(query, accessToken, fetchImpl));
}
