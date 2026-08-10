-- RavRadar 4.0.153: bounded, idempotent admin history and one-time quota cleanup.
-- Run in Supabase SQL Editor after taking a database backup/export.
begin;

create or replace function public.version_admin_document()
returns trigger
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
declare
  machine_document boolean := old.document_key in (
    'weather-health','runtime-diagnostics','dmi-water-stations',
    'water-station-routing-audit','ocean-diagnostics','cache-audit',
    'implementation-audit','protected-asset-manifest'
  );
begin
  -- Cancel truly identical updates: no timestamp churn, no version and no history row.
  if new.payload is not distinct from old.payload then
    return null;
  end if;
  -- Machine diagnostics keep only their latest document. Human/admin truth retains rollback.
  if not machine_document then
    insert into public.admin_document_versions(document_key,payload,version,created_by)
    values(old.document_key,old.payload,old.version,auth.uid());
  end if;
  new.version=old.version+1;
  new.updated_at=now();
  new.updated_by=coalesce(new.updated_by,auth.uid());
  return new;
end;
$$;

-- Remove historical copies of replaceable machine diagnostics.
delete from public.admin_document_versions
where document_key in (
  'weather-health','runtime-diagnostics','dmi-water-stations',
  'water-station-routing-audit','ocean-diagnostics','cache-audit',
  'implementation-audit','protected-asset-manifest'
);

-- Keep the newest 100 rollback points per human/admin document. Current truth remains
-- in admin_documents and is never deleted by this migration.
with ranked as (
  select id,row_number() over(partition by document_key order by version desc,id desc) as rn
  from public.admin_document_versions
)
delete from public.admin_document_versions v using ranked r
where v.id=r.id and r.rn>100;

analyze public.admin_documents;
analyze public.admin_document_versions;
commit;

-- Read-only verification after commit. VACUUM FULL is deliberately not automatic.
select
  c.relname as relation,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('admin_documents','admin_document_versions')
order by pg_total_relation_size(c.oid) desc;

select document_key,count(*) as retained_versions
from public.admin_document_versions
group by document_key
order by retained_versions desc,document_key;
