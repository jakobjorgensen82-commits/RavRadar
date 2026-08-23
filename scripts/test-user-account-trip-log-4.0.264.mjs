import assert from 'node:assert/strict';
import fs from 'node:fs';

const account = fs.readFileSync('js/ui/account-panel.js', 'utf8');
const observations = fs.readFileSync('js/services/observation-service.js', 'utf8');
const auth = fs.readFileSync('js/services/auth-service.js', 'utf8');
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

for (const marker of [
  'Mine ture og fund',
  'Loginlink uden adgangskode',
  'Der oprettes ikke en ekstra kopi i databasen',
  'getOwnTripObservations',
  'mergeOwnRows',
  'client_observation_id',
  'Venter på at blive sendt'
]) assert.match(account, new RegExp(marker));

assert.doesNotMatch(account, /\b(?:latitude|longitude|coordinates)\b/i);
assert.doesNotMatch(account, /fetch\s*\(/, 'Kontovisningen må kun bruge den afgrænsede observationstjeneste.');
assert.match(observations, /rest\/v1\/observations\?select=/);
assert.match(observations, /user_id=eq\./);
assert.match(observations, /limit=\$\{safeLimit\}/);
assert.match(observations, /Math\.min\(200/);
assert.doesNotMatch(observations, /schema_version=eq\.2/, 'Ældre egne fund skal også kunne vises.');
assert.doesNotMatch(account, /Number\(row\?\.schema_version\)\s*!==\s*2/, 'Ældre lokale egne fund må ikke skjules fra loggen.');
assert.match(account, /String\(fallback \|\| id \|\| 'Ukendt sted'\)/, 'Ældre ture skal foretrække et forståeligt områdenavn frem for et internt id.');
assert.match(observations, /active\?\.user\?\.id!==payload\.user_id/, 'En kontoejet outbox-tur må kun sendes som den samme bruger.');
assert.match(observations, /session\?\.access_token&&!session\?\.user\?\.id/);
assert.doesNotMatch(observations, /rest\/v1\/(?:trip_log|user_trips|trip_history)/i);
assert.match(schema, /create policy "users can read own observations"[\s\S]*using \(user_id = auth\.uid\(\)\)/);

assert.match(auth, /authRequest\("\/user"\)/);
assert.match(auth, /redirect_to=\$\{encodeURIComponent\(redirectTo\)\}/);
assert.match(auth, /await hydrateSessionUser\(\)\.catch/);
assert.match(app, /openAccountDialog\(accountDialog,userDataContext\(\)\)/);
assert.match(app, /getLocalObservations\(\)/, 'Den eksisterende lokale læringsmodel skal fortsat have sine observationer.');

console.log('Brugerkonto og turlog: samme Supabase-post, egen RLS-læsning og forklaring af loginlink består.');
