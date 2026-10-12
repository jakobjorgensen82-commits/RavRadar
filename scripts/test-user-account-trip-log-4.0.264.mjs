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
const learning = fs.readFileSync('js/services/learning-analysis.js', 'utf8');
const calibration = fs.readFileSync('js/services/calibration-eligibility.js', 'utf8');

for (const marker of [
  'account.history',
  'account.magicTitle',
  'account.historyIntro',
  'getOwnTripObservations',
  'mergeOwnRows',
  'client_observation_id',
  'accountTripBindingStatus',
  'RAVSCORE_CALIBRATION_ELIGIBLE',
  'account.pending'
]) assert.match(account, new RegExp(marker));

assert.match(calibration, /TRIP_LOG_DTO_FIELD_NAMES[\s\S]*'model_binding'/,
  'Den private turlog-DTO skal medtage den eksakte, ikke-følsomme modelbinding.');
assert.match(calibration, /model_binding: isExactCalibrationModelBinding\(binding\)/,
  'Turlog-DTO må kun serialisere en komplet eksakt modelbinding.');

assert.doesNotMatch(account,
  /row\.calibration_binding_status\s*\|\|/,
  'Kontofladen må ikke stole på serverens integrerede bindingsklassifikation under Candidate rollback.');

assert.doesNotMatch(account, /Der oprettes ikke en ekstra kopi i databasen/, 'Turloggen må ikke vise intern databaseforklaring.');

assert.doesNotMatch(account, /\b(?:latitude|longitude|coordinates)\b/i);
assert.doesNotMatch(account, /fetch\s*\(/, 'Kontovisningen må kun bruge den afgrænsede observationstjeneste.');
assert.match(observations, /\/functions\/v1\/trip-log/);
assert.match(observations, /JSON\.stringify\(\{ limit: safeLimit \}\)/);
assert.match(observations, /Math\.min\(200/);
assert.doesNotMatch(observations, /schema_version=eq\.2/, 'Ældre egne fund skal også kunne vises.');
assert.doesNotMatch(account, /Number\(row\?\.schema_version\)\s*!==\s*2/, 'Ældre lokale egne fund må ikke skjules fra loggen.');
assert.match(account, /String\(fallback \|\| id \|\| t\('account\.unknownPlace'\)\)/, 'Ældre ture skal foretrække et forståeligt områdenavn frem for et internt id.');
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
assert.doesNotMatch(observations, /^\s*\.\.\.columns,\s*$/m, 'Historiske rækker må ikke spredes ukontrolleret til lokal eller ekstern lagring.');
assert.match(observations, /data_quality_flags:\[\.\.\.columns\.data_quality_flags\]/);
assert.match(accountContract, /forecast_target_at: report\.observedAt/);
assert.match(accountContract, /report_accuracy: 'exact'/);

assert.doesNotMatch(account, /Supabase kunne ikke hentes/, 'Brugeren skal møde RavRadar-sprog og ikke leverandørnavnet ved en læsefejl.');
assert.match(account, /t\('account\.historyLoadError'\)/);

assert.match(auth, /authRequest\("\/user"\)/);
assert.match(auth, /redirect_to=\$\{encodeURIComponent\(redirectTo\)\}/);
assert.match(auth, /await hydrateSessionUser\(startingEpoch\)\.catch/,
  'Callbackens brugerhydrering skal afklare sit eget loginvalg før normal notifikation.');
assert.match(app, /openAccountDialog\(accountDialog,userDataContext\(\)\)/);
assert.match(learning, /getLocalObservations\(\)/, 'Den eksisterende lokale læringsmodel skal fortsat have sine observationer.');

// Import the actual UI, observation service and their shared versioned auth
// module. Only DOM/storage/HTTP are synthetic; no private renderer is called.
const releaseVersion = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
globalThis.window = { addEventListener() {} };
globalThis.fetch = async () => { throw new Error('TEST_NETWORK_FORBIDDEN'); };
const authApi = await import(`../js/services/auth-service.js?v=${releaseVersion}`);
const { openAccountDialog } = await import('../js/ui/account-panel.js');
const { PUBLIC_CONFIG } = await import('../config.js');
const turn = () => new Promise(resolve => setImmediate(resolve));
let historyCases = 0;
for (const action of ['unchanged', 'refresh', 'body-failure', 'switch', 'logout', 'same-owner-relogin',
  'switch-while-history', 'same-owner-while-history', 'closed-dialog', 'newer-account-view', 'newer-history']) {
  let loginOwner = 'synthetic-owner-a';
  const streams = [], handlers = new Map();
  const sessionFor = owner => ({ access_token: `synthetic-token-${owner}`,
    refresh_token: `synthetic-refresh-${owner}`, expires_at: 9_999_999_999,
    user: { id: owner, email: `${owner}@example.invalid` } });
  globalThis.fetch = async input => {
    const url = new URL(input);
    assert.equal(url.origin, new URL(PUBLIC_CONFIG.supabaseUrl).origin);
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password')
      return Response.json(sessionFor(loginOwner));
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token')
      return Response.json({ ...sessionFor('synthetic-owner-a'), access_token: 'synthetic-renewed-token' });
    if (url.pathname === '/auth/v1/logout') return Response.json({});
    if (url.pathname === '/functions/v1/trip-log') {
      return new Response(new ReadableStream({ start(controller) { streams.push(controller); } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error('TEST_NETWORK_FORBIDDEN');
  };
  await authApi.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
  const row = (id, zoneName, owner) => ({ id, zone_name: zoneName, user_id: owner,
    observed_at: '2026-10-09T08:00:00.000Z', hunt_mode: 'beach', result: 'none', search_minutes: 20 });
  values.set('ravradar-observations-v2', JSON.stringify([
    row('synthetic-local-a', 'LOCAL_A_VIEW', 'synthetic-owner-a'),
    row('synthetic-local-b', 'LOCAL_B_VIEW', 'synthetic-owner-b'),
  ]));
  values.set('ravradar-observation-outbox-v1', '[]');
  const localBefore = values.get('ravradar-observations-v2');
  let markup = '';
  const content = {
    get innerHTML() { return markup; },
    set innerHTML(value) { markup = value; handlers.clear(); },
    querySelector(selector) {
      if (!markup.includes(`id="${selector.slice(1)}"`)) return null;
      return { addEventListener(name, listener) { handlers.set(`${selector}:${name}`, listener); } };
    },
  };
  const dialog = { open: false, querySelector: () => content,
    showModal() { this.open = true; }, close() { this.open = false; } };
  const startHistory = async () => {
    openAccountDialog(dialog);
    const listener = handlers.get('#tripHistoryLink:click');
    assert.equal(typeof listener, 'function');
    let prevented = false;
    listener({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    await turn();
  };
  const finishBody = (index, marker) => {
    streams[index].enqueue(new TextEncoder().encode(JSON.stringify({ rows: [
      row(`synthetic-remote-${index}`, marker, 'synthetic-owner-a'),
    ] })));
    streams[index].close();
  };
  await startHistory();
  assert.equal(streams.length, 1);
  assert.doesNotMatch(markup, /(?:REMOTE_A|LOCAL_[AB])_VIEW/, 'No private rows are rendered before body completion.');
  if (action === 'refresh') await authApi.refreshSession({ force: true });
  if (action === 'switch' || action === 'switch-while-history') {
    loginOwner = 'synthetic-owner-b';
    await authApi.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
  }
  if (['logout', 'same-owner-relogin', 'same-owner-while-history'].includes(action)) await authApi.signOut();
  if (action === 'same-owner-relogin' || action === 'same-owner-while-history')
    await authApi.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
  if (['switch', 'logout', 'same-owner-relogin', 'newer-account-view'].includes(action)) openAccountDialog(dialog);
  if (action === 'closed-dialog') dialog.close();
  if (action === 'newer-history') {
    await startHistory();
    assert.equal(streams.length, 2);
    finishBody(1, 'REMOTE_NEWER_VIEW');
    await turn();
    assert.match(markup, /REMOTE_NEWER_VIEW/);
  }
  const currentView = markup;
  if (action === 'body-failure') streams[0].error(new Error('SYNTHETIC_BODY_FAILURE'));
  else finishBody(0, 'REMOTE_A_VIEW');
  await turn();
  if (action === 'unchanged' || action === 'refresh') {
    assert.match(markup, /REMOTE_A_VIEW/);
    assert.match(markup, /LOCAL_A_VIEW/);
    assert.doesNotMatch(markup, /LOCAL_B_VIEW/, 'Another owner\'s private local rows must remain hidden.');
  } else if (action === 'body-failure') {
    assert.match(markup, /LOCAL_A_VIEW/, 'An ordinary failed remote read preserves the correct owner\'s local history.');
    assert.doesNotMatch(markup, /(?:LOCAL_B|REMOTE_A)_VIEW|SYNTHETIC_BODY_FAILURE/);
  } else {
    assert.equal(markup, currentView, `${action}: an old history completion must not overwrite the current account/view.`);
    assert.doesNotMatch(markup, /REMOTE_A_VIEW/);
  }
  assert.equal(values.get('ravradar-observations-v2'), localBefore, 'Rendering/rejecting a stale read must not rewrite private local rows.');
  assert.equal(values.get('ravradar-observation-outbox-v1'), '[]');
  historyCases += 1;
}

console.log(`Brugerkonto og turlog: eksisterende kontrakter og ${historyCases} faktiske dialog/body/ejerforløb består uden netværk.`);
