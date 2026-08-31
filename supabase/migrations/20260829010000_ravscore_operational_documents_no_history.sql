-- RavScore continuation and point-readiness are high-frequency operational
-- documents. Keep only their current row; they are not owner-authored history.
create or replace function public.version_admin_document()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.payload is not distinct from old.payload then return null; end if;
  if tg_op='UPDATE' and old.document_key not in (
    'weather-health',
    'runtime-diagnostics',
    'dmi-water-stations',
    'water-station-routing-audit',
    'ocean-diagnostics',
    'cache-audit',
    'implementation-audit',
    'coastal-point-staging-status',
    'protected-asset-manifest',
    'ravscore-continuation-checkpoint',
    'ravscore-private-production-runtime-pointer',
    'ravscore-integrated-cutover-readiness',
    'ravscore-operational-model-activation'
  ) then
    insert into public.admin_document_versions(document_key,payload,version,created_by)
    values(old.document_key,old.payload,old.version,auth.uid());
  end if;
  if tg_op='UPDATE' then new.version=old.version+1; end if;
  new.updated_at=now();
  new.updated_by=auth.uid();
  return new;
end;
$$;

-- Model activation and the centrally authoritative profile are one transaction.
-- A service-role caller supplies both observed versions; any concurrent change
-- aborts the whole function. Unchanged source-profile payloads are locked and
-- verified without manufacturing a new version while a transition is PENDING.
create or replace function public.ravradar_ravscore_operational_cas(
  p_expected_operational_version bigint,
  p_expected_profile_version bigint,
  p_operational_payload jsonb,
  p_profile_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_operational_version bigint;
  v_operational_payload jsonb;
  v_profile_version bigint;
  v_profile_payload jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required' using errcode='42501';
  end if;
  if p_expected_operational_version < 0 or p_expected_profile_version < 0
    or jsonb_typeof(p_operational_payload) <> 'object'
    or jsonb_typeof(p_profile_payload) <> 'object' then
    raise exception 'invalid RavScore CAS input' using errcode='22023';
  end if;

  -- Every caller locks the two keys in this fixed order.
  select version, payload into v_operational_version, v_operational_payload
  from public.admin_documents
  where document_key='ravscore-operational-model-activation'
  for update;
  select version, payload into v_profile_version, v_profile_payload
  from public.admin_documents
  where document_key='ravscore-profile-selection'
  for update;

  if p_expected_operational_version = 0 then
    if v_operational_version is not null then
      raise exception 'operational CAS version mismatch' using errcode='40001';
    end if;
    insert into public.admin_documents(document_key,payload,updated_by)
    values('ravscore-operational-model-activation',p_operational_payload,null)
    returning version,payload into v_operational_version,v_operational_payload;
  else
    if v_operational_version is distinct from p_expected_operational_version then
      raise exception 'operational CAS version mismatch' using errcode='40001';
    end if;
    update public.admin_documents
    set payload=p_operational_payload,updated_by=null
    where document_key='ravscore-operational-model-activation'
      and version=p_expected_operational_version
    returning version,payload into v_operational_version,v_operational_payload;
    if v_operational_version is null then
      raise exception 'operational CAS update lost' using errcode='40001';
    end if;
  end if;

  if p_expected_profile_version = 0 then
    if v_profile_version is not null then
      raise exception 'profile CAS version mismatch' using errcode='40001';
    end if;
    insert into public.admin_documents(document_key,payload,updated_by)
    values('ravscore-profile-selection',p_profile_payload,null)
    returning version,payload into v_profile_version,v_profile_payload;
  elsif v_profile_version is distinct from p_expected_profile_version then
    raise exception 'profile CAS version mismatch' using errcode='40001';
  elsif v_profile_payload is distinct from p_profile_payload then
    update public.admin_documents
    set payload=p_profile_payload,updated_by=null
    where document_key='ravscore-profile-selection'
      and version=p_expected_profile_version
    returning version,payload into v_profile_version,v_profile_payload;
    if v_profile_version is null then
      raise exception 'profile CAS update lost' using errcode='40001';
    end if;
  end if;

  return jsonb_build_object(
    'operationalVersion',v_operational_version,
    'operationalPayload',v_operational_payload,
    'profileVersion',v_profile_version,
    'profilePayload',v_profile_payload
  );
end;
$$;

revoke all on function public.ravradar_ravscore_operational_cas(bigint,bigint,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.ravradar_ravscore_operational_cas(bigint,bigint,jsonb,jsonb)
  to service_role;

-- Preserve every version that may already exist. The migration changes only
-- future trigger behaviour; it deliberately performs no destructive cleanup
-- of historical rows.

-- The full runtime never belongs in a repository or an Actions cache. Its
-- content-addressed objects live in one explicitly private, bounded bucket.
-- No anon/authenticated storage policy is granted here; service-role access is
-- used only by the exact-main production workflow, and the workflow probes
-- anonymous denial before deployment.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ravradar-private-production-runtime',
  'ravradar-private-production-runtime',
  false,
  402653184,
  array['application/gzip']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RDKS is not part of the public Pages artifact. The admin documentation
-- bundle follows the same read permission as the protected handbook, while
-- writes remain owner/full-admin only through the existing document RPC.
create or replace function public.ravradar_document_permission(p_document_key text)
returns text
language sql
immutable
as $$
  select case
    when p_document_key in ('handbook','rdks-documentation-center') then 'handbook_view'
    when p_document_key in ('rules','rule-history') then 'rules_view'
    when p_document_key in ('water-level-station-routing','direction-reviews','zone-overrides','dmi-station-registry','coastline-overrides') then 'zones_view'
    when p_document_key like 'diagnostic-%' or p_document_key in ('diagnostics-settings','runtime-diagnostics','weather-health','dmi-water-stations','water-station-routing-audit','ocean-diagnostics','cache-audit','implementation-audit') then 'diagnostics_view'
    else 'full_admin'
  end;
$$;

create or replace function public.ravradar_document_write_permission(p_document_key text)
returns text
language sql
immutable
as $$
  select case
    when p_document_key in ('handbook','rdks-documentation-center') then 'full_admin'
    when p_document_key in ('rules','rule-history') then 'rules_edit'
    when p_document_key in ('water-level-station-routing','direction-reviews','zone-overrides','dmi-station-registry','coastline-overrides') then 'zones_weather_edit'
    when p_document_key like 'diagnostic-%' or p_document_key in ('diagnostics-settings','runtime-diagnostics','weather-health','dmi-water-stations','water-station-routing-audit','ocean-diagnostics','cache-audit','implementation-audit') then 'system_manage'
    else 'full_admin'
  end;
$$;
