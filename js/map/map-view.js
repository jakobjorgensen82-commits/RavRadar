const palette = { excellent: "#168653", good: "#168653", fair: "#e6a700", weak: "#d9822b", poor: "#d34a3a", unavailable: "#30383c" };

function markerMetrics(zoom = 7) {
  if (zoom <= 7) return { size: 12, border: 1.5, shadow: "0 1px 3px rgba(0,0,0,.32)" };
  if (zoom === 8) return { size: 15, border: 1.5, shadow: "0 1px 4px rgba(0,0,0,.33)" };
  if (zoom === 9) return { size: 18, border: 2, shadow: "0 2px 5px rgba(0,0,0,.34)" };
  if (zoom === 10) return { size: 22, border: 2, shadow: "0 2px 6px rgba(0,0,0,.35)" };
  return { size: 26, border: 2.5, shadow: "0 3px 8px rgba(0,0,0,.36)" };
}

function markerIcon(level = "unavailable", zoom = 7) {
  const color = palette[level] || palette.unavailable;
  const { size, border, shadow } = markerMetrics(zoom);
  const symbolSize = Math.max(8, Math.round(size * 0.52));
  return L.divIcon({
    className: "rav-pin-wrap",
    html: `<span class="rav-pin ${level}" style="--pin-color:${color};--pin-size:${size}px;--pin-border:${border}px;--pin-shadow:${shadow};--pin-symbol-size:${symbolSize}px" aria-hidden="true"><span class="rav-pin-symbol">${level === "excellent" ? "★" : ""}</span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2 + 6)]
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
    const marker = L.marker([point[1], point[0]], { icon: markerIcon(result?.level, map.getZoom()), title: zone.name, keyboard: true });
    marker.options.ravLevel = result?.level || "unavailable";
    marker.bindTooltip(`${escapeHtml(zone.name)} · ${result?.available ? `${result.score}/100` : "Ingen data"}`, { direction: "top" });
    marker.on("click", () => onSelect(zone));
    marker.addTo(markerLayer);
    markers.set(zone.id, marker);
  }
  const resizeMarkers = () => {
    const zoom = map.getZoom();
    for (const marker of markers.values()) marker.setIcon(markerIcon(marker.options.ravLevel, zoom));
  };
  map.on("zoomend", resizeMarkers);
  const bounds = geometryLayer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 10 });
  resizeMarkers();
  return { geometryLayer, markerLayer, markers, map, resizeMarkers };
}

export function refreshZoneStyles(layer, scoreForZone) {
  for (const [id, marker] of layer.markers.entries()) {
    const result = scoreForZone(id);
    marker.options.ravLevel = result?.level || "unavailable";
    marker.setIcon(markerIcon(marker.options.ravLevel, layer.map?.getZoom?.() ?? 7));
    marker.setTooltipContent(`${escapeHtml(marker.options.title)} · ${result?.available ? `${result.score}/100` : "Ingen data"}`);
  }
}

export function locateUser(map, onError, onFound = () => {}) {
  map.locate({ setView: true, maxZoom: 12, enableHighAccuracy: true });
  map.once("locationfound", event => { L.circleMarker(event.latlng, { radius: 7, weight: 3, color: "#073b4c", fillColor: "#fff", fillOpacity: 1 }).addTo(map); onFound({ latitude: event.latitude, longitude: event.longitude, accuracy: event.accuracy }); });
  map.once("locationerror", onError);
}

function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]); }


function flowArrowIcon(type, directionDeg) {
  const rotation = (Number(directionDeg) + (type === "wind" ? 180 : 0) + 360) % 360;
  return L.divIcon({
    className: `flow-arrow-wrap ${type}`,
    html: `<span class="flow-arrow ${type}" style="--direction:${rotation}deg" aria-hidden="true">↑</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function arrowOffsetsForZoom(zoom) {
  if (zoom <= 7) return [[0, 0]];
  if (zoom <= 9) return [[-24, -15], [24, 15]];
  if (zoom <= 11) return [[-42, -24], [0, 0], [42, 24], [-26, 32]];
  return [[-60, -34], [0, -32], [60, -8], [-48, 28], [18, 30], [66, 42]];
}

/**
 * Viser et diskret, zoomafhængigt felt af vind- og strømpile omkring zonernes
 * marine datapunkter. Laget genberegnes ved zoom og panorering, så der kommer
 * nye pile frem uden at overfylde kortet.
 */
export function installFlowArrows(map, featureCollection, conditionForZone) {
  if (!map.getPane("flowArrowsPane")) {
    const pane = map.createPane("flowArrowsPane");
    pane.style.zIndex = "360";
    pane.style.pointerEvents = "none";
  }
  const layer = L.layerGroup([], { pane:"flowArrowsPane" }).addTo(map);

  const render = () => {
    layer.clearLayers();
    const bounds = map.getBounds().pad(0.2);
    const zoom = map.getZoom();
    const offsets = arrowOffsetsForZoom(zoom);

    for (const feature of featureCollection.features || []) {
      const zone = feature.properties || {};
      const point = Array.isArray(zone.dataPoint) ? zone.dataPoint : zone.pinPoint;
      if (!point) continue;
      const base = L.latLng(point[1], point[0]);
      if (!bounds.contains(base)) continue;
      // Datadrevet pr. zone: enhver ny feature i zones.geojson får automatisk
      // vind- og strømpile, når conditionForZone(zone.id) leverer retningerne.
      const zoneCondition = conditionForZone(zone.id);
      const condition = zoneCondition?.current || zoneCondition || {};
      const hasWind = Number.isFinite(Number(condition.windDirectionDeg));
      const hasCurrent = Number.isFinite(Number(condition.currentDirectionDeg));
      if (!hasWind && !hasCurrent) continue;
      const basePixel = map.latLngToLayerPoint(base);

      offsets.forEach((offset, index) => {
        const pairBase = basePixel.add(L.point(offset[0], offset[1]));
        if (hasWind) {
          const windPosition = map.layerPointToLatLng(pairBase.add(L.point(-9, -6)));
          L.marker(windPosition, {
            icon: flowArrowIcon("wind", condition.windDirectionDeg),
            interactive: false,
            keyboard: false,
            pane: "flowArrowsPane",
            zIndexOffset: index
          }).addTo(layer);
        }
        if (hasCurrent) {
          const currentPosition = map.layerPointToLatLng(pairBase.add(L.point(9, 8)));
          L.marker(currentPosition, {
            icon: flowArrowIcon("current", condition.currentDirectionDeg),
            interactive: false,
            keyboard: false,
            pane: "flowArrowsPane",
            zIndexOffset: index
          }).addTo(layer);
        }
      });
    }
  };

  map.on("zoomend moveend resize", render);
  render();
  return { layer, refresh:render };
}
