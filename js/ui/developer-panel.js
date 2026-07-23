import { getLocalObservations } from "../services/observation-service.js";
import { listTrips } from "../services/trip-service.js";

export function openDeveloperDialog(dialog, context) {
  const conditions = context.conditions || {}; const zones = context.zones?.features || [];
  const generated = conditions.generatedAt ? new Date(conditions.generatedAt) : null;
  const ageHours = generated ? (Date.now() - generated.getTime()) / 3600000 : null;
  const providers = conditions.providers || conditions.meta?.providers || {};
  const providerRows = Object.entries(providers).map(([name, value]) => `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(typeof value === "string" ? value : value.status || "klar")}</td></tr>`).join("");
  dialog.querySelector(".dialog-content").innerHTML = `
    <h2>Udviklerpanel</h2><div class="developer-grid">
      <section><h3>Opdateringsstatus</h3><dl><dt>Genereret</dt><dd>${generated ? generated.toLocaleString("da-DK") : "Ingen data"}</dd><dt>Alder</dt><dd>${ageHours == null ? "–" : `${ageHours.toFixed(1).replace(".", ",")} timer`}</dd><dt>Zoner</dt><dd>${zones.length}</dd><dt>Vejrzoner</dt><dd>${Object.keys(conditions.zones || {}).length}</dd></dl></section>
      <section><h3>Lokal statistik</h3><dl><dt>Ture</dt><dd>${listTrips().length}</dd><dt>Observationer</dt><dd>${getLocalObservations().length}</dd><dt>GPS</dt><dd>Kun synlig her og på enheden</dd></dl></section>
      <section><h3>Dataproveniens</h3>${providerRows ? `<table><thead><tr><th>Kilde</th><th>Status</th></tr></thead><tbody>${providerRows}</tbody></table>` : `<p>DMI er primær. Open-Meteo Marine og MET Norway er forberedt som fallback i opdateringsarkitekturen.</p>`}</section>
      <section><h3>Valgt zone</h3><pre>${escapeHtml(JSON.stringify(context.selectedZone || { message: "Ingen zone valgt" }, null, 2))}</pre></section>
    </div><details><summary>Rå diagnostik</summary><pre>${escapeHtml(JSON.stringify({ generatedAt: conditions.generatedAt, available: conditions.available, zoneCount: zones.length, selectedZone: context.selectedZone }, null, 2))}</pre></details>`;
  dialog.showModal();
}
function escapeHtml(value="") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]); }
