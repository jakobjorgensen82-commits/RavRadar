-- Phase D: precise trip location remains local. Existing rows are preserved.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.observations'::regclass
      and conname = 'observations_remote_location_null'
  ) then
    alter table public.observations
      add constraint observations_remote_location_null
      check (
        gps is null
        and not (coalesce(weather_snapshot, '{}'::jsonb) ?| array['gps','latitude','longitude','coordinates','position'])
      ) not valid;
  end if;
end $$;

drop policy if exists "anonymous observations can be inserted" on public.observations;
drop policy if exists "Insert observations" on public.observations;
create policy "anonymous observations can be inserted" on public.observations for insert to anon
with check (
  user_id is null
  and gps is null
  and not (coalesce(weather_snapshot, '{}'::jsonb) ?| array['gps','latitude','longitude','coordinates','position'])
  and observed_at between now() - interval '2 days' and now() + interval '10 minutes'
);

drop policy if exists "authenticated observations can be inserted" on public.observations;
create policy "authenticated observations can be inserted" on public.observations for insert to authenticated
with check (
  (user_id is null or user_id = auth.uid())
  and gps is null
  and not (coalesce(weather_snapshot, '{}'::jsonb) ?| array['gps','latitude','longitude','coordinates','position'])
);
