import { authEnabled, currentSession, sendMagicLink, signInWithPassword, signOut, signUpWithPassword } from "../services/auth-service.js?v=4.0.269";
import { getLocalObservations, getOwnTripObservations, submitAccountTripReportObservation } from "../services/observation-service.js?v=4.0.269";
import { buildAccountTripReport, toAccountObservationColumns } from "../services/account-trip-report-contract.js?v=4.0.269";
import { openAccountTripReportDialog } from "./trip-evidence-dialog.js?v=4.0.269";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
}

function rowKey(row = {}) {
  return String(row.client_observation_id || row.id || row.trip_id || '');
}

function tripDate(row) {
  const parsed = Date.parse(row.trip_started_at || row.observed_at || '');
  return Number.isFinite(parsed)
    ? new Intl.DateTimeFormat('da-DK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(parsed))
    : 'Dato mangler';
}

function minutesLabel(value) {
  if (value == null || value === '') return 'Tid ikke registreret';
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  if (minutes < 60) return `${minutes} min.`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours} t. ${rest} min.` : `${hours} t.`;
}

function rowFound(row = {}) {
  if (typeof row.found === 'boolean') return row.found;
  return ['small', 'medium', 'good', 'found'].includes(String(row.result || '').toLowerCase());
}

function huntModeLabel(value) {
  if (value === 'waders') return 'I vandet';
  if (value === 'beach') return 'På stranden';
  return 'Søgemåde ikke registreret';
}

function mergeOwnRows(remoteRows, localRows, userId) {
  const merged = new Map();
  for (const row of localRows) {
    if (!userId || row?.user_id !== userId) continue;
    const key = rowKey(row);
    if (key) merged.set(key, { ...row, _source: 'device' });
  }
  for (const row of remoteRows) {
    const key = rowKey(row);
    if (key) merged.set(key, { ...(merged.get(key) || {}), ...row, _source: 'account' });
  }
  return [...merged.values()].sort((left, right) => Date.parse(right.observed_at || right.trip_started_at || 0) - Date.parse(left.observed_at || left.trip_started_at || 0));
}

function displayName(id, lookup, fallback = 'Ukendt sted') {
  return lookup.get(String(id || '')) || String(fallback || id || 'Ukendt sted');
}

function renderHistoryRows(rows, context) {
  const zoneNames = new Map((context.zones || []).map(zone => [String(zone.id), zone.name || zone.id]));
  const partNames = new Map((context.coastalParts || []).map(part => [String(part.id), part.name || part.id]));
  return rows.map(row => {
    const found = rowFound(row);
    const zoneId = row.actual_zone_id || row.zone_id;
    const zone = displayName(zoneId, zoneNames, row.zone_name || 'Område ikke angivet');
    const part = displayName(row.actual_coastal_part_id, partNames, 'Kyststrækning ikke angivet');
    const grams = found && Number.isFinite(Number(row.grams)) ? `<span>${escapeHtml(Number(row.grams).toLocaleString('da-DK'))} g</span>` : '';
    const pending = row._source === 'device' && row.sync_status !== 'synced' ? '<span class="trip-log-pending">Venter på at blive sendt</span>' : '';
    const manual = row.data_quality_flags?.includes('account-manual') ? '<span>Efterregistreret</span>' : '';
    return `<article class="trip-log-row">
      <div><strong>${escapeHtml(tripDate(row))}</strong><span>${escapeHtml(zone)} · ${escapeHtml(part)}</span></div>
      <div class="trip-log-facts"><span>${huntModeLabel(row.hunt_mode)}</span><span>${escapeHtml(minutesLabel(row.search_minutes))}</span><span class="${found ? 'trip-found' : 'trip-not-found'}">${found ? 'Fandt rav' : 'Fandt ikke rav'}</span>${grams}${manual}${pending}</div>
    </article>`;
  }).join('');
}

async function showTripHistory(dialog, context) {
  const content = dialog.querySelector('.dialog-content');
  content.innerHTML = '<h2>Mine ture og fund</h2><p class="form-status">Henter dine ture…</p>';
  let remoteRows = [], loadError = null;
  try { remoteRows = await getOwnTripObservations({ limit: 100 }); }
  catch (error) { loadError = error; }
  const userId = currentSession()?.user?.id;
  const rows = mergeOwnRows(remoteRows, getLocalObservations(), userId);
  const foundCount = rows.filter(rowFound).length;
  const totalMinutes = rows.reduce((sum, row) => sum + Math.max(0, Number(row.search_minutes) || 0), 0);
  content.innerHTML = `
    <button id="tripHistoryBack" class="text-link back-link" type="button">← Tilbage til min konto</button>
    <h2>Mine ture og fund</h2>
    <p>Her ser du de ture, som du har indsendt til RavRadar.</p>
    ${loadError ? '<p class="notice">RavRadar kunne ikke hente dine gemte ture lige nu. Ture, der stadig ligger på denne enhed, vises nedenfor.</p>' : ''}
    <div class="trip-log-summary"><div><strong>${rows.length}</strong><span>Ture</span></div><div><strong>${foundCount}</strong><span>Ture med fund</span></div><div><strong>${escapeHtml(minutesLabel(totalMinutes))}</strong><span>Samlet søgetid</span></div></div>
    <div class="trip-log-list">${rows.length ? renderHistoryRows(rows, context) : '<p class="empty-state-inline">Du har endnu ingen indsendte ture på denne konto.</p>'}</div>
    ${rows.length >= 100 ? '<p class="muted">Viser de seneste 100 ture.</p>' : ''}
    <p class="trip-log-privacy">RavRadar gemmer det valgte område og den valgte kyststrækning – ikke din præcise position eller GPS-rute.</p>`;
  content.querySelector('#tripHistoryBack')?.addEventListener('click', () => renderAccount(dialog, context));
}

async function showAccountTripReport(dialog, context) {
  dialog.close();
  try {
    const answer = await openAccountTripReportDialog({
      mode: context.mode,
      zoneId: context.zoneId,
      coastalPartId: context.coastalPartId,
      zones: context.zones,
      coastalParts: context.coastalParts
    });
    if (!dialog.open) dialog.showModal();
    if (!answer) return renderAccount(dialog, context);
    const report = buildAccountTripReport({ ...answer, tripId: crypto.randomUUID() });
    const result = await submitAccountTripReportObservation(toAccountObservationColumns(report));
    const message = result.stored === 'supabase'
      ? 'Tak. Turen er sendt til RavRadar og kan nu ses under Mine ture og fund.'
      : 'Turen er gemt på denne enhed og sendes automatisk, når forbindelsen er tilbage.';
    renderAccount(dialog, context, message);
  } catch (error) {
    if (!dialog.open) dialog.showModal();
    renderAccount(dialog, context, error?.message || 'Turen kunne ikke indsendes. Prøv igen.');
  }
}

function renderAccount(dialog, context, message = '') {
  const session = currentSession();
  const signedIn = Boolean(session?.access_token && session?.user?.id);
  const content = dialog.querySelector('.dialog-content');
  content.innerHTML = signedIn ? `
    <h2>Min konto</h2>
    <p>Du er logget ind${session.user?.email ? ` som <strong>${escapeHtml(session.user.email)}</strong>` : ''}.</p>
    <p>Når du indsender en ravtur, gemmes den hos RavRadar og knyttes til din konto, så kun du kan se den i din turlog.</p>
    ${message ? `<p class="notice" role="status">${escapeHtml(message)}</p>` : ''}
    <a id="accountTripReportLink" class="account-feature-link" href="#indberet-tur">Indberet tur eller fund <span aria-hidden="true">→</span></a>
    <a id="tripHistoryLink" class="account-feature-link" href="#mine-ture">Mine ture og fund <span aria-hidden="true">→</span></a>
    <p class="account-privacy-note">RavRadar sender ikke din præcise position eller GPS-rute. Oplysningerne bruges til at undersøge, hvornår scorereglerne rammer rigtigt og forkert.</p>
    <button id="signOutButton" class="primary-button" type="button">Log ud</button>` : `
    <h2>Login er valgfrit</h2>
    <p>Du kan bruge RavRadar og indberette ture uden en konto. Uden login sendes turen uden forbindelse til en bruger og kan derfor ikke følge med til en anden enhed.</p>
    <p>Med login kan du åbne <strong>Mine ture og fund</strong> og se dine indsendte ture på tværs af enheder.</p>
    ${session?.access_token && !session?.user?.id ? '<div class="notice">Din tidligere login-session kunne ikke bekræftes. Log ind igen, så dine ture kan knyttes sikkert til den rigtige konto.</div>' : ''}
    ${authEnabled() ? `<form id="authForm" class="stack-form">
      <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
      <label>Adgangskode<input name="password" type="password" autocomplete="current-password" minlength="6"></label>
      <div class="button-row"><button class="primary-button" name="action" value="login" type="submit">Log ind</button><button name="action" value="signup" type="submit">Opret konto</button></div>
      <div class="magic-link-explanation"><strong>Loginlink uden adgangskode</strong><p>Vi sender et tidsbegrænset link til din e-mail. Når du åbner linket, bliver du logget ind uden at skrive en adgangskode. Hvis e-mailen ikke har en konto endnu, bliver den oprettet.</p></div>
      <button name="action" value="magic" type="submit">Send loginlink til min e-mail</button><p id="authStatus" class="form-status" role="status"></p>
    </form>` : '<div class="notice">Login er ikke aktiveret endnu.</div>'}`;

  content.querySelector('#accountTripReportLink')?.addEventListener('click', event => { event.preventDefault(); showAccountTripReport(dialog, context); });
  content.querySelector('#tripHistoryLink')?.addEventListener('click', event => { event.preventDefault(); showTripHistory(dialog, context); });
  content.querySelector('#signOutButton')?.addEventListener('click', async () => { await signOut(); renderAccount(dialog, context); });
  content.querySelector('#authForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = content.querySelector('#authStatus'), data = new FormData(event.currentTarget), action = event.submitter?.value;
    const email = String(data.get('email') || '').trim(), password = String(data.get('password') || '');
    status.textContent = 'Arbejder…';
    try {
      if (action === 'magic') {
        await sendMagicLink(email);
        status.textContent = 'Loginlinket er sendt. Åbn e-mailen på denne enhed og tryk på linket.';
      } else {
        if (password.length < 6) throw new Error('Adgangskoden skal være mindst 6 tegn. Du kan også bruge loginlinket uden adgangskode.');
        if (action === 'signup') {
          await signUpWithPassword(email, password);
          status.textContent = 'Kontoen er oprettet. Hvis du har fået en bekræftelsesmail, skal du åbne den først.';
        } else {
          await signInWithPassword(email, password);
          renderAccount(dialog, context);
        }
      }
    } catch (error) { status.textContent = error.message; }
  });
}

export function openAccountDialog(dialog, context = {}) {
  renderAccount(dialog, context);
  if (!dialog.open) dialog.showModal();
}
