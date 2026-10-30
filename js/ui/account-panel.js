import { authEnabled, authIdentityEpoch, currentSession, onAuthChange, sendMagicLink, signInWithPassword, signOut, signUpWithPassword } from "../services/auth-service.js?v=4.0.592";
import { getLocalObservations, getOwnTripExport, getOwnTripObservations, submitAccountTripReportObservation } from "../services/observation-service.js?v=4.0.592";
import { buildAccountTripReport, toAccountObservationColumns } from "../services/account-trip-report-contract.js?v=4.0.592";
import { openAccountTripReportDialog } from "./trip-evidence-dialog.js?v=4.0.592";
import { formatDateTime, formatNumber, t } from "../i18n.js?v=4.0.592";
import { RAVSCORE_CALIBRATION_ELIGIBLE, ravScoreModelBinding } from "../core/ravscore-model-contract.js?v=4.0.592";
import { accountTripBindingStatus } from "../services/calibration-eligibility.js?v=4.0.592";

import { getOwnStatisticsPreference, setOwnStatisticsPreference } from "../services/permissions-service.js?v=4.0.592";

const pendingHistoryViews = new WeakMap();
function stopHistoryView(dialog) { pendingHistoryViews.get(dialog)?.dispose(); }

const pendingStatisticsViews = new WeakMap();
function stopStatisticsView(dialog) { pendingStatisticsViews.get(dialog)?.dispose(); }
function bindStatisticsPreference(dialog, content) {
  const input=content.querySelector('#accountStatisticsPreference');
  const status=content.querySelector('#accountStatisticsStatus');
  if(!input||!status)return;
  const identity=authIdentityEpoch(),ownerId=currentSession()?.user?.id;
  let stopped=false,unsubscribe=()=>{},observed=null;
  const current=()=>!stopped&&dialog.open&&input.isConnected
    &&authIdentityEpoch()===identity&&ownerId&&currentSession()?.user?.id===ownerId;
  const dispose=()=>{
    if(stopped)return;stopped=true;unsubscribe();
    dialog.removeEventListener('close',dispose);dialog.removeEventListener('cancel',dispose);
    observed=null;input.disabled=true;input.indeterminate=true;status.textContent='';
    if(pendingStatisticsViews.get(dialog)?.dispose===dispose)pendingStatisticsViews.delete(dialog);
  };
  pendingStatisticsViews.set(dialog,{dispose});
  unsubscribe=onAuthChange(()=>{if(authIdentityEpoch()!==identity||currentSession()?.user?.id!==ownerId)dispose();});
  dialog.addEventListener('close',dispose);dialog.addEventListener('cancel',dispose);
  input.disabled=true;input.indeterminate=true;status.textContent=t('account.statisticsLoading');
  const show=value=>{observed=value;input.checked=value.enabled;input.indeterminate=false;input.disabled=false;status.textContent='';};
  const unavailable=()=>{observed=null;input.disabled=true;input.indeterminate=true;status.textContent=t('account.statisticsUnavailable');};
  input.addEventListener('change',async()=>{
    if(!current()||input.disabled)return;
    const requested=input.checked;input.disabled=true;status.textContent=t('account.statisticsSaving');
    try{const value=await setOwnStatisticsPreference(requested,observed);if(current()){show(value);status.textContent=t('account.statisticsSaved');}}
    catch{if(current())unavailable();} // Unknown write outcome is not a confirmed ON/OFF.
  });
  void getOwnStatisticsPreference().then(value=>{if(current())show(value);},()=>{if(current())unavailable();});
}


function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
}

export const hasNumber = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));

function rowKey(row = {}) {
  return String(row.client_observation_id || row.id || row.trip_id || '');
}

function tripDate(row) {
  const parsed = Date.parse(row.trip_started_at || row.observed_at || '');
  return Number.isFinite(parsed) ? formatDateTime(parsed) : t('account.dateMissing');
}

function minutesLabel(value) {
  if (value == null || value === '') return t('account.timeMissing');
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  if (minutes < 60) return t('account.minutes', { minutes });
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? t('account.hoursMinutes', { hours, minutes:rest }) : t('account.hours', { hours });
}

function rowFound(row = {}) {
  if (typeof row.found === 'boolean') return row.found;
  return ['small', 'medium', 'good', 'found'].includes(String(row.result || '').toLowerCase());
}

function huntModeLabel(value) {
  if (value === 'waders') return t('mode.wadersShort');
  if (value === 'beach') return t('mode.beachShort');
  return t('account.modeMissing');
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

function displayName(id, lookup, fallback = t('account.unknownPlace')) {
  return lookup.get(String(id || '')) || String(fallback || id || t('account.unknownPlace'));
}

function renderHistoryRows(rows, context) {
  const zoneNames = new Map((context.zones || []).map(zone => [String(zone.id), zone.name || zone.id]));
  const partNames = new Map((context.coastalParts || []).map(part => [String(part.id), part.name || part.id]));
  return rows.map(row => {
    const found = rowFound(row);
    const zoneId = row.actual_zone_id || row.zone_id;
    const zone = displayName(zoneId, zoneNames, row.zone_name || t('account.areaMissing'));
    const part = displayName(row.actual_coastal_part_id, partNames, t('account.coastMissing'));
    const grams = found && hasNumber(row.grams) ? `<span>${escapeHtml(formatNumber(row.grams, { maximumFractionDigits:1 }))} g</span>` : '';
    const pending = row._source === 'device' && row.sync_status !== 'synced' ? `<span class="trip-log-pending">${t('account.pending')}</span>` : '';
    const manual = row.data_quality_flags?.includes('account-manual') ? `<span>${t('account.manual')}</span>` : '';
    const bindingStatus = accountTripBindingStatus(row, ravScoreModelBinding(), {
      allowCalibration: RAVSCORE_CALIBRATION_ELIGIBLE,
    });
    const bindingLabel = `<span>${t(`account.binding.${bindingStatus}`)}</span>`;
    return `<article class="trip-log-row">
      <div><strong>${escapeHtml(tripDate(row))}</strong><span>${escapeHtml(zone)} · ${escapeHtml(part)}</span></div>
      <div class="trip-log-facts"><span>${huntModeLabel(row.hunt_mode)}</span><span>${escapeHtml(minutesLabel(row.search_minutes))}</span><span class="${found ? 'trip-found' : 'trip-not-found'}">${t(found ? 'account.found' : 'account.notFound')}</span>${grams}${bindingLabel}${manual}${pending}</div>
    </article>`;
  }).join('');
}

async function showTripHistory(dialog, context) {
  stopStatisticsView(dialog);
  stopHistoryView(dialog);
  const content = dialog.querySelector('.dialog-content');
  const identity = authIdentityEpoch(), userId = currentSession()?.user?.id;
  if (!userId) return renderAccount(dialog, context);
  let stopped = false, unsubscribe = () => {};
  const dispose = () => {
    if (stopped) return;
    stopped = true;
    unsubscribe();
    dialog.removeEventListener('close', dispose);
    dialog.removeEventListener('cancel', dispose);
    if (pendingHistoryViews.get(dialog) === view) {
      pendingHistoryViews.delete(dialog);
      content.innerHTML = '';
    }
  };
  const view = { dispose };
  pendingHistoryViews.set(dialog, view);
  unsubscribe = onAuthChange(() => {
    if (authIdentityEpoch() === identity && currentSession()?.user?.id === userId) return;
    dispose();
    if (dialog.open) renderAccount(dialog, context);
  });
  dialog.addEventListener('close', dispose);
  dialog.addEventListener('cancel', dispose);
  content.innerHTML = `<h2>${t('account.history')}</h2><p class="form-status">${t('account.historyLoading')}</p>`;
  let remoteRows = [], loadError = null;
  try { remoteRows = await getOwnTripObservations({ limit: 100 }); }
  catch (error) { loadError = error; }
  if (!dialog.open || pendingHistoryViews.get(dialog) !== view
      || authIdentityEpoch() !== identity || !userId || currentSession()?.user?.id !== userId) return;
  const rows = mergeOwnRows(remoteRows, getLocalObservations(), userId);
  const foundCount = rows.filter(rowFound).length;
  const totalMinutes = rows.reduce((sum, row) => sum + Math.max(0, Number(row.search_minutes) || 0), 0);
  content.innerHTML = `
    <button id="tripHistoryBack" class="text-link back-link" type="button">${t('account.historyBack')}</button>
    <h2>${t('account.history')}</h2>
    <p>${t('account.historyIntro')}</p>
    ${loadError ? `<p class="notice">${t('account.historyLoadError')}</p>` : ''}
    <div class="trip-log-summary"><div><strong>${rows.length}</strong><span>${t('account.trips')}</span></div><div><strong>${foundCount}</strong><span>${t('account.tripsWithFinds')}</span></div><div><strong>${escapeHtml(minutesLabel(totalMinutes))}</strong><span>${t('account.totalSearch')}</span></div></div>
    <div class="trip-log-list">${rows.length ? renderHistoryRows(rows, context) : `<p class="empty-state-inline">${t('account.noTrips')}</p>`}</div>
    ${rows.length >= 100 ? `<p class="muted">${t('account.latest100')}</p>` : ''}
    <p class="trip-log-privacy">${t('account.historyPrivacy')}</p>`;
  content.querySelector('#tripHistoryBack')?.addEventListener('click', () => {
    if (pendingHistoryViews.get(dialog) === view) renderAccount(dialog, context);
  });
}

async function showAccountTripReport(dialog, context) {
  const identity = authIdentityEpoch(), userId = currentSession()?.user?.id;
  const isCurrentOwner = () => Boolean(userId) && authIdentityEpoch() === identity
    && currentSession()?.user?.id === userId;
  dialog.close();
  try {
    const answer = await openAccountTripReportDialog({
      mode: context.mode,
      zoneId: context.zoneId,
      coastalPartId: context.coastalPartId,
      zones: context.zones,
      coastalParts: context.coastalParts
    });
    if (!isCurrentOwner()) throw new Error(t('account.reportFailed'));
    if (!dialog.open) dialog.showModal();
    if (!answer) return renderAccount(dialog, context);
    const report = buildAccountTripReport({ observationOrigin: 'self-reported', ...answer, tripId: crypto.randomUUID() });
    const result = await submitAccountTripReportObservation(toAccountObservationColumns(report));
    if (!isCurrentOwner()) throw new Error(t('account.reportFailed'));
    const message = t(result.stored === 'remote' ? 'account.reportRemote' : 'account.reportQueued');
    renderAccount(dialog, context, message);
  } catch (error) {
    if (!dialog.open) dialog.showModal();
    renderAccount(dialog, context, isCurrentOwner() ? error?.message || t('account.reportFailed') : t('account.reportFailed'));
  }
}

function renderAccount(dialog, context, message = '') {
  stopStatisticsView(dialog);
  stopHistoryView(dialog);
  const session = currentSession();
  const signedIn = Boolean(session?.access_token && session?.user?.id);
  const content = dialog.querySelector('.dialog-content');
  content.innerHTML = signedIn ? `
    <h2>${t('account.title')}</h2>
    <p>${t('account.signedIn',{email:session.user?.email ? t('account.asEmail',{email:`<strong>${escapeHtml(session.user.email)}</strong>`}) : ''})}</p>
    <p>${t('account.signedInBody')}</p>
    ${message ? `<p class="notice" role="status">${escapeHtml(message)}</p>` : ''}
    <a id="accountTripReportLink" class="account-feature-link" href="#indberet-tur">${t('account.report')} <span aria-hidden="true">→</span></a>
    <a id="tripHistoryLink" class="account-feature-link" href="#mine-ture">${t('account.history')} <span aria-hidden="true">→</span></a>
    <button id="tripExportButton" class="account-feature-link" type="button">${t('account.exportTrips')}</button>
    <p class="muted">${t('account.exportTripsScope')}</p>
    <p id="tripExportStatus" class="form-status" role="status" aria-live="polite"></p>
    <label><input id="accountStatisticsPreference" type="checkbox" disabled aria-describedby="accountStatisticsExplanation accountStatisticsStatus">${t('account.statisticsPreference')}</label>
    <p id="accountStatisticsExplanation" class="muted">${t('account.statisticsExplanation')}</p>
    <p id="accountStatisticsStatus" class="form-status" role="status" aria-live="polite"></p>
    <p class="account-privacy-note">${t('account.privacy')}</p>
    <button id="signOutButton" class="primary-button" type="button">${t('account.logout')}</button>` : `
    <h2>${t('account.optional')}</h2>
    <p>${t('account.optionalBody')}</p>
    <p>${t('account.optionalBenefit')}</p>
    ${session?.access_token && !session?.user?.id ? `<div class="notice">${t('account.sessionInvalid')}</div>` : ''}
    ${authEnabled() ? `<form id="authForm" class="stack-form">
      <label>${t('account.email')}<input name="email" type="email" autocomplete="email" required></label>
      <label>${t('account.password')}<input name="password" type="password" autocomplete="current-password" minlength="6"></label>
      <div class="button-row"><button class="primary-button" name="action" value="login" type="submit">${t('account.login')}</button><button name="action" value="signup" type="submit">${t('account.signup')}</button></div>
      <div class="magic-link-explanation"><strong>${t('account.magicTitle')}</strong><p>${t('account.magicBody')}</p></div>
      <button name="action" value="magic" type="submit" formnovalidate>${t('account.magicSend')}</button><p id="authStatus" class="form-status" role="status"></p>
    </form>` : `<div class="notice">${t('account.disabled')}</div>`}`;

  if(signedIn)bindStatisticsPreference(dialog,content);
  content.querySelector('#accountTripReportLink')?.addEventListener('click', event => { event.preventDefault(); showAccountTripReport(dialog, context); });
  content.querySelector('#tripHistoryLink')?.addEventListener('click', event => { event.preventDefault(); showTripHistory(dialog, context); });
  content.querySelector('#tripExportButton')?.addEventListener('click', async event => {
    const button = event.currentTarget, status = content.querySelector('#tripExportStatus');
    const ownerId = session?.user?.id;
    const identity = authIdentityEpoch();
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    const isActive = () => {
      if (authIdentityEpoch() !== identity || !dialog.open || !button.isConnected) cancel();
      return !cancelled;
    };
    dialog.addEventListener('close', cancel);
    dialog.addEventListener('cancel', cancel);
    button.disabled = true;
    status.textContent = t('account.exportTripsWorking');
    try {
      if (!ownerId || currentSession()?.user?.id !== ownerId || !isActive()) throw new Error('OWNER_CHANGED');
      const data = await getOwnTripExport({ isActive });
      if (currentSession()?.user?.id !== ownerId || !isActive()) throw new Error('OWNER_CHANGED');
      const href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
      try {
        const link = document.createElement('a');
        link.href = href;
        link.download = `ravradar-mine-ture-${data.exported_at.slice(0, 10)}.json`;
        link.click();
      } finally { setTimeout(() => URL.revokeObjectURL(href), 0); }
      status.textContent = t('account.exportTripsReady');
    } catch {
      if (isActive()) status.textContent = t('account.exportTripsFailed');
    } finally {
      dialog.removeEventListener('close', cancel);
      dialog.removeEventListener('cancel', cancel);
      button.disabled = false;
    }
  });
  content.querySelector('#signOutButton')?.addEventListener('click', async () => { await signOut(); renderAccount(dialog, context); });
  content.querySelector('#authForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = content.querySelector('#authStatus');
    status.textContent = '';
    // The magic button skips password constraints, not the required valid email.
    if (!event.currentTarget.elements.namedItem('email').reportValidity()) return;
    const data = new FormData(event.currentTarget), action = event.submitter?.value;
    const email = String(data.get('email') || '').trim(), password = String(data.get('password') || '');
    status.textContent = t('common.working');
    try {
      if (action === 'magic') {
        await sendMagicLink(email);
        status.textContent = t('account.magicSent');
      } else {
        if (password.length < 6) throw new Error(t('account.passwordShort'));
        if (action === 'signup') {
          await signUpWithPassword(email, password);
          status.textContent = t('account.created');
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
