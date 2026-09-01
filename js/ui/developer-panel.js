import { getLocalObservations } from "../services/observation-service.js?v=4.0.319";
import { t } from "../i18n.js?v=4.0.319";

function legacyTripCount() {
  try {
    const rows = JSON.parse(localStorage.getItem('ravradar-trips-v1') || '[]');
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

export function openDeveloperDialog(dialog, context) {
  const conditions = context.conditions || {}; const zones = context.zones?.features || [];
  const generated = conditions.generatedAt ? new Date(conditions.generatedAt) : null;
  const ageHours = generated ? (Date.now() - generated.getTime()) / 3600000 : null;
  const providers = conditions.providers || conditions.meta?.providers || {};
  const providerRows = Object.entries(providers).map(([name, value]) => `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(typeof value === "string" ? value : value.status || "klar")}</td></tr>`).join("");
  const scoreAvailability = conditions.coastalParts?.scoreAvailability || {};
  const historyIncomplete = Number(scoreAvailability.historyIncompleteModeCount) > 0;
  const historyReasonCodes = [...new Set((scoreAvailability.historyIncompleteZones || [])
    .flatMap(zone => Array.isArray(zone.historyReasonCodes) ? zone.historyReasonCodes : []))];
  const historyQuality = {
    allCurrentScoresFullHistory: scoreAvailability.allCurrentScoresFullHistory === true,
    fullHistoryModeCount: scoreAvailability.fullHistoryModeCount ?? null,
    historyIncompleteModeCount: scoreAvailability.historyIncompleteModeCount ?? null,
    historyIncompleteZoneCount: scoreAvailability.historyIncompleteZoneCount ?? null,
    historyReasonCodes,
  };
  const historyCard = historyIncomplete
    ? `<section class="display-context warning history-quality-warning" role="status"><h3>${escapeHtml(t('score.historyIncomplete.title'))}</h3><p>${escapeHtml(t('score.historyIncomplete.body'))}</p><p><b>${escapeHtml(scoreAvailability.historyIncompleteZoneCount)}</b> zoner · <b>${escapeHtml(scoreAvailability.historyIncompleteModeCount)}</b> scoretilstande · kalibrering udelukket.</p><p><code>${escapeHtml(historyReasonCodes.join(', ') || 'HISTORY_INCOMPLETE')}</code></p></section>`
    : '';
  dialog.querySelector(".dialog-content").innerHTML = `
    <h2>Udviklerpanel</h2>${historyCard}<div class="developer-grid">
      <section><h3>Opdateringsstatus</h3><dl><dt>Genereret</dt><dd>${generated ? generated.toLocaleString("da-DK") : "Ingen data"}</dd><dt>Alder</dt><dd>${ageHours == null ? "–" : `${ageHours.toFixed(1).replace(".", ",")} timer`}</dd><dt>Zoner</dt><dd>${zones.length}</dd><dt>Vejrzoner</dt><dd>${Object.keys(conditions.zones || {}).length}</dd></dl></section>
      <section><h3>Lokal statistik</h3><dl><dt>Historiske lokale ture</dt><dd>${legacyTripCount()}</dd><dt>Observationer</dt><dd>${getLocalObservations().length}</dd><dt>Positionssporing</dt><dd>Ikke aktiv</dd></dl><p>Eksisterende lokal historik bevares på enheden, men den gamle tracker indlæses ikke.</p></section>
      <section><h3>Dataproveniens</h3>${providerRows ? `<table><thead><tr><th>Kilde</th><th>Status</th></tr></thead><tbody>${providerRows}</tbody></table>` : `<p>DMI er primær. Open-Meteo Marine og MET Norway er forberedt som fallback i opdateringsarkitekturen.</p>`}</section>
      <section><h3>Valgt zone</h3><pre>${escapeHtml(JSON.stringify(context.selectedZone || { message: "Ingen zone valgt" }, null, 2))}</pre></section>
    </div><p><button id="openAdminButton" class="primary-button" type="button">Åbn administration</button></p><details><summary>Rå diagnostik</summary><pre>${escapeHtml(JSON.stringify({ generatedAt: conditions.generatedAt, available: conditions.available, zoneCount: zones.length, historyQuality, selectedZone: context.selectedZone }, null, 2))}</pre></details>`;
  dialog.querySelector('#openAdminButton').addEventListener('click', () => { sessionStorage.setItem('ravradar-admin-auth', 'yes'); location.href = './admin.html'; });
  dialog.showModal();
}
function escapeHtml(value="") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]); }
