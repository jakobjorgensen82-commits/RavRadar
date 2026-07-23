import { calculateRavScore } from "./js/core/score-engine.js";
import { loadConditions, loadZones } from "./js/services/data-service.js";
import { submitObservation } from "./js/services/observation-service.js";
import { consumeAuthCallback } from "./js/services/auth-service.js";
import { activeTrip, answerTrip, pendingTripPrompt, resumeTripTracking, startTrip, stopTrip } from "./js/services/trip-service.js";
import { createMap, locateUser, refreshZoneStyles, renderZones } from "./js/map/map-view.js";
import { showZoneInfo } from "./js/ui/info-panel.js";
import { openAccountDialog } from "./js/ui/account-panel.js";
import { openDeveloperDialog } from "./js/ui/developer-panel.js";

const state = { mode: "waders", selectedZone: null, zoneLayer: null, zones: null, conditions: { available: false, zones: {} }, lastGps: null };
const map = createMap("map");
const infoPanel = document.querySelector("#infoPanel");
const dataStatus = document.querySelector("#dataStatus");
const ranking = document.querySelector("#ranking");
const accountDialog = document.querySelector("#accountDialog");
const developerDialog = document.querySelector("#developerDialog");
const pinDialog = document.querySelector("#pinDialog");
const tripDialog = document.querySelector("#tripDialog");

function resultFor(zone) {
  const condition = state.conditions.zones?.[zone.id] || {};
  return calculateRavScore({ mode: state.mode, zone, weather: condition.current || {}, history: condition.history || {} });
}
function currentWeather() { return state.conditions.zones?.[state.selectedZone?.id]?.current || {}; }
function selectedFeature() { return state.zones?.features.find(item => item.properties.id === state.selectedZone?.id); }

function bindObservationForm() {
  const form = document.querySelector("#observationForm");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault(); const result = event.submitter?.value; const status = document.querySelector("#observationStatus");
    if (!result || !state.selectedZone) return;
    status.textContent = "Gemmer…";
    try {
      const response = await submitObservation({ zone: state.selectedZone, huntMode: state.mode, result, grams: new FormData(form).get("grams"), scoreResult: resultFor(state.selectedZone), weather: currentWeather(), gps: state.lastGps, tripId: activeTrip()?.id || null });
      status.textContent = response.stored === "local" ? "Gemt sikkert på denne enhed." : "Gemt og synkroniseret.";
      form.querySelectorAll("button").forEach(button => button.disabled = true);
    } catch (error) { status.textContent = error.message; }
  });
}
function renderSelectedZone() {
  if (!state.selectedZone) return;
  showZoneInfo(infoPanel, state.selectedZone, resultFor(state.selectedZone), currentWeather(), state.mode);
  bindObservationForm();
}
function renderRanking() {
  if (!state.zones) return;
  const rows = state.zones.features.map(feature => ({ zone: feature.properties, result: resultFor(feature.properties) })).filter(item => item.result.available).sort((a,b) => b.result.score-a.result.score).slice(0,5);
  ranking.innerHTML = rows.length ? rows.map((item,index) => `<button class="ranking-item" type="button" data-zone-id="${item.zone.id}"><span class="rank">${index+1}</span><span><strong>${item.zone.name}</strong><small>${item.zone.region}</small></span><b class="rank-score ${item.result.level}">${item.result.score}</b></button>`).join("") : `<p class="ranking-empty">Ranglisten vises, når vejrdata er hentet.</p>`;
  ranking.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    const feature = state.zones.features.find(item => item.properties.id === button.dataset.zoneId); state.selectedZone = feature.properties;
    map.fitBounds(L.geoJSON(feature).getBounds(), { maxZoom:10, padding:[20,20] }); renderSelectedZone(); infoPanel.scrollIntoView({ behavior:"smooth", block:"start" });
  }));
}
function setMode(mode) {
  state.mode = mode; localStorage.setItem("ravradar-mode", mode);
  document.querySelectorAll(".mode-button").forEach(button => { const active = button.dataset.mode === mode; button.classList.toggle("active",active); button.setAttribute("aria-pressed",String(active)); });
  if (state.zoneLayer) refreshZoneStyles(state.zoneLayer, id => resultFor(state.zones.features.find(item => item.properties.id === id).properties));
  renderRanking(); renderSelectedZone();
}
function updateTripUi() {
  const trip = activeTrip(); document.querySelector("#tripBar").hidden = !trip; document.querySelector("#tripButton").textContent = trip ? "Tur i gang" : "Start ravtur";
}
function openTripPrompt(trip) {
  tripDialog.querySelector(".dialog-content").innerHTML = `<h2>Var du på ravtur i går?</h2><p>Din rute er gemt lokalt. Vælg det svar, der passer bedst.</p><form id="tripAnswerForm" class="stack-form"><div class="trip-answer-buttons"><button name="response" value="no">Nej</button><button name="response" value="yes">Ja</button><button name="response" value="much">Meget</button></div><label>Valgfrit antal gram<input name="grams" type="number" min="0" max="10000" step="0.1" inputmode="decimal"></label></form>`;
  tripDialog.showModal();
  tripDialog.querySelector("#tripAnswerForm").addEventListener("submit", event => { event.preventDefault(); answerTrip(trip.id, event.submitter?.value, new FormData(event.currentTarget).get("grams")); tripDialog.close(); });
}
function enableDialogClose(dialog) { dialog.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close()); dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); }); }
[accountDialog, developerDialog, pinDialog, tripDialog].forEach(enableDialogClose);

document.querySelectorAll(".mode-button").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.querySelector("#locateButton").addEventListener("click", () => locateUser(map, () => alert("Din position kunne ikke hentes. Kontroller browserens tilladelse til placering."), position => { state.lastGps = { lat:position.latitude, lng:position.longitude, accuracy:position.accuracy, at:new Date().toISOString() }; }));
document.querySelector("#accountButton").addEventListener("click", () => openAccountDialog(accountDialog));
document.querySelector("#tripButton").addEventListener("click", () => { if (!activeTrip()) startTrip(); updateTripUi(); });
document.querySelector("#stopTripButton").addEventListener("click", () => { stopTrip(); updateTripUi(); });

let logoTaps = 0, tapTimer = null;
document.querySelector("#logoButton").addEventListener("click", () => { logoTaps += 1; clearTimeout(tapTimer); tapTimer = setTimeout(() => { logoTaps = 0; }, 5000); if (logoTaps >= 10) { logoTaps=0; pinDialog.showModal(); pinDialog.querySelector("input").focus(); } });
document.querySelector("#pinForm").addEventListener("submit", event => { event.preventDefault(); const pin = new FormData(event.currentTarget).get("pin"); if (pin !== "1931") { document.querySelector("#pinStatus").textContent="Forkert PIN."; return; } pinDialog.close(); event.currentTarget.reset(); document.querySelector("#pinStatus").textContent=""; openDeveloperDialog(developerDialog, state); });

try {
  await consumeAuthCallback();
  const [zones, conditions] = await Promise.all([loadZones(), loadConditions()]); state.zones = zones; state.conditions = conditions;
  state.zoneLayer = renderZones(map, zones, id => resultFor(zones.features.find(item => item.properties.id === id).properties), zone => { state.selectedZone = zone; renderSelectedZone(); });
  setMode(localStorage.getItem("ravradar-mode") === "beach" ? "beach" : "waders");
  if (conditions.available && conditions.generatedAt) { const timestamp = new Date(conditions.generatedAt).toLocaleString("da-DK"); const stale = Date.now()-new Date(conditions.generatedAt).getTime()>8*3600000; dataStatus.textContent = `${stale ? "⚠ Data er ældre end normalt · " : ""}Senest opdateret ${timestamp}`; }
  else dataStatus.textContent = "Vejrdata indlæses ved næste automatiske GitHub-kørsel.";
  resumeTripTracking(); updateTripUi(); const pending = pendingTripPrompt(); if (pending) setTimeout(() => openTripPrompt(pending), 650);
} catch (error) { console.error(error); infoPanel.innerHTML = `<div class="notice">Kortzonerne kunne ikke indlæses. Kontroller den seneste GitHub Action.</div>`; dataStatus.textContent="Fejl ved indlæsning"; }
