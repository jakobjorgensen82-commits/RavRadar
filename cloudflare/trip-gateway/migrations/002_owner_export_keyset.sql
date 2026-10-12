-- Additive own-trip export keyset index. No historical schema/row rewrite.
-- Install only through the existing authorized, controlled D1 workflow.
create index if not exists trip_observations_owner_export
  on trip_observations(owner_subject, client_observation_id, created_at);
