-- RavRadar 4.0.369: the protected production runtime is service-role-only.
-- A restrictive policy closes this one bucket even if an older permissive
-- storage.objects SELECT policy exists for other site assets.
begin;

drop policy if exists ravradar_private_runtime_deny_client_read
  on storage.objects;
create policy ravradar_private_runtime_deny_client_read
on storage.objects as restrictive for select to anon, authenticated
using (bucket_id <> 'ravradar-private-production-runtime');

commit;
