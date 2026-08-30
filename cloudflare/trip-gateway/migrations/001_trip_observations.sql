-- RavRadar external trip storage schema v1.
-- Deliberately contains no direct identity or precise-location columns.

create table if not exists trip_observations (
  storage_schema_version integer not null default 1 check (storage_schema_version = 1),
  owner_subject text not null check (length(owner_subject) between 20 and 96),
  owner_kind text not null check (owner_kind in ('user', 'anonymous')),
  trip_id text,
  client_observation_id text not null,
  observed_at text not null,
  submitted_at text not null,
  payload_json text not null check (json_valid(payload_json)),
  payload_sha256 text not null check (length(payload_sha256) = 64),
  source text not null check (source in ('live', 'supabase-migration')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (client_observation_id)
);

create unique index if not exists trip_observations_trip_id_unique
  on trip_observations(trip_id) where trip_id is not null;

create index if not exists trip_observations_owner_time
  on trip_observations(owner_subject, observed_at desc);

-- Control registry: one digest-only reservation serializes identity across all
-- ten shards. It deliberately stores neither payload JSON nor direct identity.
create table if not exists trip_observation_registry (
  client_observation_id text not null primary key,
  trip_id text,
  owner_subject text not null check (length(owner_subject) between 20 and 96),
  payload_sha256 text not null check (length(payload_sha256) = 64),
  target_database_index integer not null check (target_database_index between 0 and 9),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create unique index if not exists trip_observation_registry_trip_unique
  on trip_observation_registry(trip_id) where trip_id is not null;

create unique index if not exists trip_observation_registry_owner_client_unique
  on trip_observation_registry(owner_subject, client_observation_id);

create unique index if not exists trip_observation_registry_owner_trip_unique
  on trip_observation_registry(owner_subject, trip_id) where trip_id is not null;

-- A one-way, payload-free pseudonym tombstone makes owner erasure dominate
-- every concurrent or delayed store across all shards.
create table if not exists trip_owner_erasure_tombstones (
  owner_subject text not null primary key check (length(owner_subject) between 20 and 96),
  erased_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Durable one-way cutover boundary. Once present, deployment may only repair
-- forward to D1; it must never hide D1-only rows behind a Supabase mode toggle.
create table if not exists trip_storage_control (
  control_key text not null primary key check (control_key = 'd1_activation_attempted'),
  control_value text not null check (control_value = 'true'),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
