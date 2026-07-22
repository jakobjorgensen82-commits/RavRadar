import { calculateRavScore } from "./js/core/score-engine.js";
import { loadConditions, loadZones } from "./js/services/data-service.js";
import { createMap, locateUser, refreshZoneStyles, renderZones } from "./js/map/map-view.js";
import { showZoneInfo } from "./js/ui/info-panel.js";

const state = { mode: "waders", selectedZone: null, zoneLayer: null, zones: null, conditions: { available: false, zones: {} } };
const map = createMap("map");
const infoPanel = document.querySelector("#infoPanel");
const dataStatus = document.querySelector("#dataStatus");

function resultFor(zone) {
  const condition = state.conditions.zones?.[zone.id] || {};
  return calculateRavScore({ mode: state.mode, zone, weather: condition.current || {}, history: condition.history || {} });
}

function renderSelectedZone() {
  if (!state.selectedZone) return;
  const condition = state.conditions.zones?.[state.selectedZone.id] || {};
  showZoneInfo(infoPanel, state.selectedZone, resultFor(state.selectedZone), condition.current || {}, state.mode);
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-button").forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (state.zoneLayer) refreshZoneStyles(state.zoneLayer, id => {
    const feature = state.zones.features.find(item => item.properties.id === id);
    return resultFor(feature.properties);
  });
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

  if (conditions.available && conditions.generatedAt) {
    const timestamp = new Date(conditions.generatedAt).toLocaleString("da-DK");
    dataStatus.textContent = `Data senest opdateret ${timestamp}`;
  } else dataStatus.textContent = "Aktuelle DMI-data er endnu ikke koblet på. Ingen testmålinger vises.";
} catch (error) {
  console.error(error);
  infoPanel.innerHTML = `<div class="notice">Kortzonerne kunne ikke indlæses. Kontroller projektfilerne på GitHub.</div>`;
  dataStatus.textContent = "Fejl ved indlæsning";
}
