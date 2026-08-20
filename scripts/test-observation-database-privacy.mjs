import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [schema, migration, observationService] = await Promise.all([
  fs.readFile('supabase/schema.sql', 'utf8'),
  fs.readFile('supabase/migrations/20260820_observation_remote_privacy.sql', 'utf8'),
  fs.readFile('js/services/observation-service.js', 'utf8'),
]);

for (const sql of [schema, migration]) {
  assert.match(sql, /constraint observations_remote_location_null/i);
  assert.match(sql, /gps is null/i);
  assert.match(sql, /weather_snapshot[\s\S]*\?\| array\['gps','latitude','longitude','coordinates','position'\]/i);
  assert.match(sql, /not valid/i, 'Historiske observationsrækker må ikke ændres eller slettes automatisk.');
}

for (const policyName of [
  'anonymous observations can be inserted',
  'authenticated observations can be inserted',
]) {
  const start = migration.indexOf(`create policy "${policyName}"`);
  assert.ok(start >= 0, `Migrationen mangler policy: ${policyName}`);
  const end = migration.indexOf(';', start);
  const policy = migration.slice(start, end + 1);
  assert.match(policy, /gps is null/i);
  assert.match(policy, /weather_snapshot[\s\S]*'coordinates'/i);
}

assert.doesNotMatch(
  migration,
  /\b(?:update|delete from|truncate)\s+public\.observations/i,
  'Privacy-migrationen må ikke ændre eller slette historiske observationer uden ejergodkendelse.',
);
assert.match(observationService, /remoteObservationPayload/);
assert.match(observationService, /gps\s*:\s*null/);

console.log('Observation privacy: browser og database afviser ny fjern-GPS uden at ændre historiske rækker.');
