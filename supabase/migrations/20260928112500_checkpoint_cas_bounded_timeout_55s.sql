-- The sealed 4.0.508 build reached the checkpoint CAS, but the 30-second
-- function-local limit cancelled both attempts.  Keep the higher limit
-- scoped to this one validated, atomic service-role RPC; no role-wide or
-- database-wide timeout is changed.
alter function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  set statement_timeout = '55s';
