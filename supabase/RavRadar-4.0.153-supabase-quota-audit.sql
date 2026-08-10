-- READ ONLY: run this first in Supabase SQL Editor. It changes no data.
select pg_size_pretty(sum(pg_database_size(datname))) as total_database_size
from pg_database;

select
  c.relname as relation,
  pg_size_pretty(pg_relation_size(c.oid)) as table_size,
  pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
order by pg_total_relation_size(c.oid) desc
limit 25;

select
  document_key,
  count(*) as versions,
  pg_size_pretty(sum(pg_column_size(payload))) as payload_size
from public.admin_document_versions
group by document_key
order by sum(pg_column_size(payload)) desc;

with machine_keys(document_key) as (values
  ('weather-health'),('runtime-diagnostics'),('dmi-water-stations'),
  ('water-station-routing-audit'),('ocean-diagnostics'),('cache-audit'),
  ('implementation-audit'),('protected-asset-manifest')
), ranked as (
  select id,document_key,payload,
    row_number() over(partition by document_key order by version desc,id desc) as rn
  from public.admin_document_versions
), removable as (
  select r.* from ranked r
  where r.document_key in (select document_key from machine_keys) or r.rn>100
)
select count(*) as rows_that_cleanup_will_remove,
       pg_size_pretty(coalesce(sum(pg_column_size(payload)),0)) as payload_that_cleanup_will_remove
from removable;
