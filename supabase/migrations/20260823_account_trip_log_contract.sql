-- RavRadar 4.0.266: komplet produktionskontrakt for efterregistrering og privat turlog.
-- Databevarende og idempotent: ingen eksisterende observationer slettes eller omskrives.

begin;

alter table public.observations
  add column if not exists data_quality_flags jsonb not null default '[]'::jsonb;

alter table public.observations enable row level security;

drop policy if exists "observations are publicly readable" on public.observations;
drop policy if exists "users can read own observations" on public.observations;
create policy "users can read own observations" on public.observations
  for select to authenticated
  using (user_id = auth.uid());

grant select on table public.observations to authenticated;

comment on column public.observations.data_quality_flags is
  'Dataminimerede kvalitetsmarkoerer; maa ikke indeholde brugeridentitet, GPS, rute eller fri tekst.';

notify pgrst, 'reload schema';

commit;
