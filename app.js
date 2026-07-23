import { calculateRavScore } from "./js/core/score-engine.js";
import { loadConditions, loadZones } from "./js/services/data-service.js";
import { observationsEnabled, submitObservation } from "./js/services/observation-service.js";
import { createMap, locateUser, refreshZoneStyles, renderZones } from "./js/map/map-view.js";
import { showZoneInfo } from "./js/ui/info-panel.js";

const state = { mode: "waders", selectedZone: null, zoneLayer: null, zones: null, conditions: { available: false, zones: {} } };
const map = createMap("map");
const infoPanel = document.querySelector("#infoPanel");
const dataStatus = document.querySelector("#dataStatus");
const ranking = document.querySelector("#ranking");

function resultFor(zone) {
  const condition = state.conditions.zones?.[zone.id] || {};
  return calculateRavScore({ mode: state.mode, zone, weather: condition.current || {}, history: condition.history || {} });
}

function bindObservationForm() {
  const form = document.querySelector("#observationForm");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const result = event.submitter?.value;
    const status = document.querySelector("#observationStatus");
    if (!result || !state.selectedZone) return;
    status.textContent = "Gemmer…";
    try {
      await submitObservation({ zoneId: state.selectedZone.id, huntMode: state.mode, result });
      status.textContent = "Tak – observationen er gemt anonymt.";
      form.querySelectorAll("button").forEach(button => button.disabled = true);
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function renderSelectedZone() {
  if (!state.selectedZone) return;
  const condition = state.conditions.zones?.[state.selectedZone.id] || {};
  showZoneInfo(infoPanel, state.selectedZone, resultFor(state.selectedZone), condition.current || {}, state.mode, { observationsEnabled: observationsEnabled() });
  bindObservationForm();
}

function renderRanking() {
  if (!state.zones) return;
  const rows = state.zones.features
    .map(feature => ({ zone: feature.properties, result: resultFor(feature.properties) }))
    .filter(item => item.result.available)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, 5);
  ranking.innerHTML = rows.length ? rows.map((item, index) => `
    <button class="ranking-item" type="button" data-zone-id="${item.zone.id}">
      <span class="rank">${index + 1}</span><span><strong>${item.zone.name}</strong><small>${item.zone.region}</small></span>
      <b class="rank-score ${item.result.level}">${item.result.score}</b>
    </button>`).join("") : `<p class="ranking-empty">Ranglisten vises, når DMI-data er hentet.</p>`;
  ranking.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    const feature = state.zones.features.find(item => item.properties.id === button.dataset.zoneId);
    state.selectedZone = feature.properties;
    map.fitBounds(L.geoJSON(feature).getBounds(), { maxZoom: 10, padding: [20, 20] });
    renderSelectedZone();
    infoPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

function setMode(mode) {
  state.mode = mode;
  localStorage.setItem("ravradar-mode", mode);
  document.querySelectorAll(".mode-button").forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (state.zoneLayer) refreshZoneStyles(state.zoneLayer, id => {
    const feature = state.zones.features.find(item => item.properties.id === id);
    return resultFor(feature.properties);
  });
  renderRanking();
  renderSelectedZone();
}

document.querySelectorAll(".mode-button").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.querySelector("#locateButton").addEventListener("click", () => locateUser(map, () => alert("Din position kunne ikke hentes. Kontroller browserens tilladelse til placering.")));

try {
  const [zones, conditions] = await Promise.all([loadZones(), loadConditions()]);
  state.zones = zones;
  state.conditions = conditions;
  state.zoneLayer = renderZones(map, zones, id => {
    const feature = zones.features.find(item => item.properties.id === id);
    return resultFor(feature.properties);
  }, zone => { state.selectedZone = zone; renderSelectedZone(); });

  const savedMode = localStorage.getItem("ravradar-mode");
  setMode(savedMode === "beach" ? "beach" : "waders");
  if (conditions.available && conditions.generatedAt) {
    const timestamp = new Date(conditions.generatedAt).toLocaleString("da-DK");
    const stale = Date.now() - new Date(conditions.generatedAt).getTime() > 8 * 60 * 60 * 1000;
    dataStatus.textContent = `${stale ? "⚠ Data er ældre end normalt · " : ""}Senest opdateret ${timestamp}`;
  } else dataStatus.textContent = "DMI-data indlæses ved næste automatiske GitHub-kørsel.";
} catch (error) {
  console.error(error);
  infoPanel.innerHTML = `<div class="notice">Kortzonerne kunne ikke indlæses. Kontroller den seneste GitHub Action.</div>`;
  dataStatus.textContent = "Fejl ved indlæsning";
}
