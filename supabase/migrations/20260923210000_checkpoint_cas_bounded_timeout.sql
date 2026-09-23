-- The protected checkpoint validates the full 673-part continuation before
-- its atomic write. The REST role's short default statement timeout can abort
-- a valid checkpoint after all weather and release gates have completed.
-- Bound only this RPC; do not change the role or database-wide limit.
alter function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  set statement_timeout = '30s';
