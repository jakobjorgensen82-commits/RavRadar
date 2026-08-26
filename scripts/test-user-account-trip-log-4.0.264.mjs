import assert from 'node:assert/strict';
import fs from 'node:fs';

const account = fs.readFileSync('js/ui/account-panel.js', 'utf8');
const accountContract = fs.readFileSync('js/services/account-trip-report-contract.js', 'utf8');
const observations = fs.readFileSync('js/services/observation-service.js', 'utf8');
const auth = fs.readFileSync('js/services/auth-service.js', 'utf8');
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const productionContract = fs.readFileSync('supabase/migrations/20260823_account_trip_log_contract.sql', 'utf8');
const uploadContract = fs.readFileSync('supabase/migrations/20260823_observation_upload_contract.sql', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

for (const marker of [
  'Mine ture og fund',
  'Loginlink uden adgangskode',
  'Her ser du de ture, som du har indsendt til RavRadar.',
  'getOwnTripObservations',
  'mergeOwnRows',
  'client_observation_id',
  'Venter på at blive sendt'
]) assert.match(account, new RegExp(marker));

assert.doesNotMatch(account, /Der oprettes ikke en ekstra kopi i databasen/, 'Turloggen må ikke vise intern databaseforklaring.');

assert.doesNotMatch(account, /\b(?:latitude|longitude|coordinates)\b/i);
assert.doesNotMatch(account, /fetch\s*\(/, 'Kontovisningen må kun bruge den afgrænsede observationstjeneste.');
assert.match(observations, /\/functions\/v1\/trip-log/);
assert.match(observations, /JSON\.stringify\(\{ limit: safeLimit \}\)/);
assert.match(observations, /Math\.min\(200/);
assert.doesNotMatch(observations, /schema_version=eq\.2/, 'Ældre egne fund skal også kunne vises.');
assert.doesNotMatch(account, /Number\(row\?\.schema_version\)\s*!==\s*2/, 'Ældre lokale egne fund må ikke skjules fra loggen.');
assert.match(account, /String\(fallback \|\| id \|\| 'Ukendt sted'\)/, 'Ældre ture skal foretrække et forståeligt områdenavn frem for et internt id.');
assert.match(observations, /active\?\.user\?\.id!==payload\.user_id/, 'En kontoejet outbox-tur må kun sendes som den samme bruger.');
assert.match(observations, /session\?\.access_token&&!session\?\.user\?\.id/);
assert.doesNotMatch(observations, /rest\/v1\/observations\?select=/i);
assert.match(schema, /create policy "users can read own observations"[\s\S]*using \(user_id = auth\.uid\(\)\)/);
assert.match(schema, /grant select on table public\.observations to authenticated/);

assert.match(productionContract, /add column if not exists data_quality_flags jsonb not null default '\[\]'::jsonb/);
assert.match(productionContract, /create policy "users can read own observations"[\s\S]*using \(user_id = auth\.uid\(\)\)/);
assert.match(productionContract, /grant select on table public\.observations to authenticated/);
assert.match(productionContract, /notify pgrst, 'reload schema'/);
assert.doesNotMatch(productionContract, /\b(?:delete|truncate|update)\b/i, 'Turlogmigrationen må ikke ændre eller slette eksisterende observationer.');

for (const column of ['forecast_target_at', 'report_accuracy']) {
  assert.match(uploadContract, new RegExp(`add column if not exists ${column}\\b`), `Produktionsmigrationen mangler uploadfeltet ${column}.`);
}
assert.match(uploadContract, /notify pgrst, 'reload schema'/);
assert.doesNotMatch(uploadContract, /\b(?:delete|truncate|update)\b/i, 'Uploadmigrationen må ikke ændre eller slette eksisterende observationer.');
assert.match(observations, /\.\.\.columns/);
assert.match(accountContract, /forecast_target_at: report\.observedAt/);
assert.match(accountContract, /report_accuracy: 'exact'/);

assert.doesNotMatch(account, /Supabase kunne ikke hentes/, 'Brugeren skal møde RavRadar-sprog og ikke leverandørnavnet ved en læsefejl.');
assert.match(account, /RavRadar kunne ikke hente dine gemte ture lige nu/);

assert.match(auth, /authRequest\("\/user"\)/);
assert.match(auth, /redirect_to=\$\{encodeURIComponent\(redirectTo\)\}/);
assert.match(auth, /await hydrateSessionUser\(\)\.catch/);
assert.match(app, /openAccountDialog\(accountDialog,userDataContext\(\)\)/);
assert.match(app, /getLocalObservations\(\)/, 'Den eksisterende lokale læringsmodel skal fortsat have sine observationer.');

console.log('Brugerkonto og turlog: privat Edge-læsning, Supabase-rollback og forklaring af loginlink består.');
