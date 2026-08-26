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
