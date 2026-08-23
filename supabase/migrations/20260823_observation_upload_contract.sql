-- RavRadar 4.0.267: komplet uploadkontrakt for manuelle kontoindberetninger.
-- Databevarende og idempotent: ingen eksisterende observationer slettes eller omskrives.

begin;

alter table public.observations
  add column if not exists forecast_target_at timestamptz;

alter table public.observations
  add column if not exists report_accuracy text
  check (report_accuracy is null or report_accuracy in ('exact', 'approximate', 'unknown'));

notify pgrst, 'reload schema';

commit;
