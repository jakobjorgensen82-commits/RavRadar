const palette = { excellent: "#168653", good: "#168653", fair: "#e6a700", poor: "#d34a3a", unavailable: "#76868d" };

function markerIcon(level = "unavailable") {
  const color = palette[level] || palette.unavailable;
  return L.divIcon({
    className: "rav-pin-wrap",
    html: `<span class="rav-pin ${level}" style="--pin-color:${color}" aria-hidden="true"><span class="rav-pin-symbol">${level === "excellent" ? "★" : ""}</span></span>`,
    iconSize: [30, 40], iconAnchor: [15, 39], popupAnchor: [0, -35]
  });
}

export function createMap(elementId) {
  const map = L.map(elementId, { zoomControl: true }).setView([56.45, 10.15], 7);
  const streetMap = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap-bidragsydere" });
  const satelliteMap = L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics og GIS-brugerfællesskabet" });
  const saved = localStorage.getItem("ravradar-basemap");
  (saved === "satellite" ? satelliteMap : streetMap).addTo(map);
  const control = L.control.layers({ "🗺️ Standard": streetMap, "🛰️ Satellit": satelliteMap }, null, { position: "topright", collapsed: true }).addTo(map);
  const toggle = control.getContainer()?.querySelector(".leaflet-control-layers-toggle");
  if (toggle) { toggle.title = "Skift kortvisning"; toggle.setAttribute("aria-label", "Skift kortvisning"); }
  map.on("baselayerchange", event => { localStorage.setItem("ravradar-basemap", event.layer === satelliteMap ? "satellite" : "street"); control.collapse(); });
  return map;
}

export function renderZones(map, featureCollection, scoreForZone, onSelect) {
  // Polygonerne er fortsat tilgængelige for geofencing, men tegnes ikke på kortet.
  const geometryLayer = L.geoJSON(featureCollection, { style: { opacity: 0, fillOpacity: 0, weight: 0 }, interactive: false });
  const markerLayer = L.layerGroup().addTo(map);
  const markers = new Map();
  for (const feature of featureCollection.features) {
    const zone = feature.properties;
    const point = Array.isArray(zone.pinPoint) ? zone.pinPoint : zone.dataPoint;
    const result = scoreForZone(zone.id);
    const marker = L.marker([point[1], point[0]], { icon: markerIcon(result?.level), title: zone.name, keyboard: true });
    marker.bindTooltip(zone.name, { direction: "top", offset: [0, -30] });
    marker.bindPopup(`<div class="zone-popup"><strong>${escapeHtml(zone.name)}</strong><span class="popup-score ${result?.level || "unavailable"}">${result?.available ? `${result.score}/100` : "Ingen data"}</span><button type="button" class="popup-open-zone">Åbn zone</button></div>`);
    marker.on("popupopen", event => event.popup.getElement()?.querySelector(".popup-open-zone")?.addEventListener("click", () => onSelect(zone)));
    marker.on("click", () => onSelect(zone));
    marker.addTo(markerLayer);
    markers.set(zone.id, marker);
  }
  const bounds = geometryLayer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 10 });
  return { geometryLayer, markerLayer, markers };
}

export function refreshZoneStyles(layer, scoreForZone) {
  for (const [id, marker] of layer.markers.entries()) {
    const result = scoreForZone(id);
    marker.setIcon(markerIcon(result?.level));
    const popup = marker.getPopup();
    if (popup) popup.setContent(`<div class="zone-popup"><strong>${escapeHtml(marker.options.title)}</strong><span class="popup-score ${result?.level || "unavailable"}">${result?.available ? `${result.score}/100` : "Ingen data"}</span><button type="button" class="popup-open-zone">Åbn zone</button></div>`);
  }
}

export function locateUser(map, onError, onFound = () => {}) {
  map.locate({ setView: true, maxZoom: 12, enableHighAccuracy: true });
  map.once("locationfound", event => { L.circleMarker(event.latlng, { radius: 7, weight: 3, color: "#073b4c", fillColor: "#fff", fillOpacity: 1 }).addTo(map); onFound({ latitude: event.latitude, longitude: event.longitude, accuracy: event.accuracy }); });
  map.once("locationerror", onError);
}

function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]); }
