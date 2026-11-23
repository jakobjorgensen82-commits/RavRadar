// Fixed app80 source/data only. No HTTP, environment, CLI, process or activation.
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';

// Unissued native-receipt append. No CLI, activation or arbitrary SQL path.
export const fixedNativeActivityReceiptMigration = '20261122200000_account_native_activity_receipt_off.sql';
export function readFixedNativeActivityReceiptSource() {
  const file = new URL('../../supabase/migrations/' + fixedNativeActivityReceiptMigration, import.meta.url);
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > 65536) throw new Error('NATIVE_RECEIPT_SOURCE_REQUIRED');
  const bytes = readFileSync(file);
  if (bytes.length !== stat.size) throw new Error('NATIVE_RECEIPT_SOURCE_REQUIRED');
  const sql = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replaceAll('\r\n', '\n');
  const bodies = [...sql.matchAll(/create or replace function public\.(\w+)\([^;]*?\bas \$(\w+)\$\n([\s\S]*?)\n\$\2\$;/g)];
  if (bodies.length !== 1 || bodies[0][1] !== 'account_native_activity_token_hook') throw new Error('NATIVE_RECEIPT_SOURCE_REQUIRED');
  return { sql, sha256: createHash('sha256').update(sql, 'utf8').digest('hex'),
    hookBodySha256: createHash('sha256').update(bodies[0][3].trim(), 'utf8').digest('hex') };
}

// The normal reader and existing native case share this exact fixed SQL.
// Only the table projection gains the receipt; the legacy 17-CHECK scope stays intact.
export function buildFixedNativeActivityReceiptQuery(catalogQuery) {
  const targets = "targets(name) as (values ('account_inactivity_policy'),('account_lifecycle_activity'),('account_inactivity_notices'))";
  const tableSource = " from targets w left join pg_catalog.pg_class c on c.oid=pg_catalog.to_regclass('public.'||w.name)),";
  const receiptTableSource = " from (select name from targets union all values ('account_native_activity_receipt')) w left join pg_catalog.pg_class c on c.oid=pg_catalog.to_regclass('public.'||w.name)),";
  if (typeof catalogQuery !== 'string' || Buffer.byteLength(catalogQuery, 'utf8') > 65536
    || catalogQuery.split(targets).length !== 2 || catalogQuery.split(tableSource).length !== 2) {
    throw new Error('NATIVE_RECEIPT_QUERY_REQUIRED');
  }
  const extended = catalogQuery.replace(tableSource, receiptTableSource).trim().replace(/;$/, '');
  return `select saved.metadata,
    pg_catalog.has_schema_privilege('supabase_auth_admin','public','USAGE') as "authAdminPublicUsage",
    (select coverage_epoch::text from public.account_inactivity_policy where singleton) as "policyEpoch",
    pg_catalog.to_char(pg_catalog.clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "observedAt",
    (select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'armEpoch', arm_epoch::text, 'coverageEpoch', coverage_epoch::text,
      'armedAt', case when armed_at is null then null else pg_catalog.to_char(armed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
      'nativeStartedAt', case when native_started_at is null then null else pg_catalog.to_char(native_started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
      'nativeCapturedAt', case when native_captured_at is null then null else pg_catalog.to_char(native_captured_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end))
      from public.account_native_activity_receipt) as "receipt"
    from (` + extended + ') as saved;';
}

// Parameterless, one-time arm contract for the later admitted fixed owner. It
// changes no policy/activity. Repeating it cannot reset the first time or epoch.
export const fixedNativeActivityReceiptArmQuery = `begin;
set local lock_timeout = '250ms';
set local statement_timeout = '5s';
update public.account_native_activity_receipt r
set coverage_epoch = p.coverage_epoch, armed_at = pg_catalog.clock_timestamp()
from public.account_inactivity_policy p
where r.singleton and p.singleton and r.armed_at is null and r.coverage_epoch is null
  and r.native_started_at is null and r.native_captured_at is null
  and p.coverage_status = 'UNKNOWN' and p.coverage_started_at is null
  and not p.notices_enabled and not p.delivery_qualified;
commit;`;

export function currentNativeActivityReceiptSourceContext() {
  const files = readdirSync(new URL('../../supabase/migrations/', import.meta.url)).filter(file => file.endsWith('.sql'));
  if (!files.includes(fixedNativeActivityReceiptMigration)) return null;
  if (files.length !== 80 || !['20261116181500_account_erasure_outbox_off.sql',
    '20261117180000_account_inactivity_notice_off.sql','20261117180100_account_native_activity_capture_off.sql'].every(file => files.includes(file)))
    throw new Error('CURRENT80_RECEIPT_SOURCE_REQUIRED');
  const source = readFixedNativeActivityReceiptSource();
  return Object.freeze({ sourceSqlFileCount: 80, originalSqlScopeCount: 79,
    migrationVersion: '20261122200000', migrationFilename: fixedNativeActivityReceiptMigration,
    migrationSQLSha256: source.sha256, hookBodySha256: source.hookBodySha256 });
}
