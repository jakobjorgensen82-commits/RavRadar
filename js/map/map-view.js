const palette = { excellent: "#168653", good: "#168653", fair: "#e6a700", weak: "#d9822b", poor: "#d34a3a", unavailable: "#30383c" };

function zoneLineStyle(level = "unavailable", selected = false, zoom = 7) {
  // Oversigten skal kunne aflæses på landsniveau. Derfor er zonelinjerne
  // tydeligst ved lav zoom og bliver mere præcise/finere, jo tættere man går på.
  const baseWeight = zoom <= 7 ? 7 : zoom <= 9 ? 6 : zoom <= 11 ? 5.5 : 5;
  return {
    color: palette[level] || palette.unavailable,
    weight: baseWeight + (selected ? 4 : 0),
    opacity: selected ? 1 : .96,
    lineCap: "butt",
    lineJoin: "round"
  };
}

function zoneCasingStyle(selected = false, zoom = 7) {
  const baseWeight = zoom <= 7 ? 10 : zoom <= 9 ? 9 : zoom <= 11 ? 8.5 : 8;
  return {
    color: "rgba(255,255,255,.88)",
    weight: baseWeight + (selected ? 5 : 0),
    opacity: .92,
    lineCap: "butt",
    lineJoin: "round"
  };
}


function coastBearing(a, b) {
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function boundaryTickIcon(tangentBearing, selected = false) {
  const rotation = (tangentBearing + 90) % 360;
  return L.divIcon({
    className: "zone-boundary-tick-wrap",
    html: `<span class="zone-boundary-tick${selected ? " selected" : ""}" style="--tick-rotation:${rotation}deg" aria-hidden="true"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
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
  // Polygonerne bevares skjult til geofencing og beregninger.
  const geometryLayer = L.geoJSON(featureCollection, { style: { opacity: 0, fillOpacity: 0, weight: 0 }, interactive: false });
  const lineLayer = L.layerGroup().addTo(map);
  const lines = new Map();

  if (!map.getPane("zoneCoastPane")) {
    const pane = map.createPane("zoneCoastPane");
    pane.style.zIndex = "410";
  }

  for (const feature of featureCollection.features) {
    const zone = feature.properties;
    if (zone.zoneStatus === "legacy") continue;
    const result = scoreForZone(zone.id);
    const coastLine = Array.isArray(zone.coastLine) && zone.coastLine.length > 1
      ? zone.coastLine.map(([lng, lat]) => [lat, lng])
      : null;
    if (!coastLine) continue;

    const casing = L.polyline(coastLine, {
      ...zoneCasingStyle(false, map.getZoom()),
      pane: "zoneCoastPane",
      interactive: false
    }).addTo(lineLayer);

    const visible = L.polyline(coastLine, {
      ...zoneLineStyle(result?.level, false, map.getZoom()),
      pane: "zoneCoastPane",
      interactive: false
    }).addTo(lineLayer);

    // En transparent, bred klikflade gør kystlinjen nem at vælge på mobil.
    const hit = L.polyline(coastLine, {
      color: "transparent",
      opacity: 0,
      weight: 24,
      pane: "zoneCoastPane",
      interactive: true,
      bubblingMouseEvents: false
    }).addTo(lineLayer);

    // Sorte tværstreger gør zonens start og slutning synlige uden at dække scorefarven.
    const startBearing = coastBearing(coastLine[0], coastLine[1]);
    const endBearing = coastBearing(coastLine[coastLine.length - 2], coastLine[coastLine.length - 1]);
    const startTick = L.marker(coastLine[0], { icon: boundaryTickIcon(startBearing), pane: "zoneCoastPane", interactive: false, keyboard: false }).addTo(lineLayer);
    const endTick = L.marker(coastLine[coastLine.length - 1], { icon: boundaryTickIcon(endBearing), pane: "zoneCoastPane", interactive: false, keyboard: false }).addTo(lineLayer);

    hit.bindTooltip(`${escapeHtml(zone.name)} · ${result?.available ? `${result.score}/100` : "Ingen data"}`, { direction: "top", sticky: true });
    hit.on("click", () => onSelect(zone));
    hit.on("mouseover", () => visible.setStyle({ weight: visible.options.weight + 1, opacity: 1 }));
    hit.on("mouseout", () => visible.setStyle(zoneLineStyle(hit.options.ravLevel, hit.options.ravSelected, map.getZoom())));
    hit.options.ravLevel = result?.level || "unavailable";
    hit.options.ravSelected = false;
    hit.options.zoneTitle = zone.name;
    lines.set(zone.id, { casing, visible, hit, startTick, endTick, startBearing, endBearing });
  }

  const bounds = geometryLayer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 10 });

  const api = { geometryLayer, lineLayer, lines, map, selectedId: null };
  api.selectZone = id => {
    api.selectedId = id || null;
    for (const [zoneId, pair] of lines.entries()) {
      pair.hit.options.ravSelected = zoneId === api.selectedId;
      pair.casing.setStyle(zoneCasingStyle(pair.hit.options.ravSelected, map.getZoom()));
      pair.visible.setStyle(zoneLineStyle(pair.hit.options.ravLevel, pair.hit.options.ravSelected, map.getZoom()));
      pair.startTick.setIcon(boundaryTickIcon(pair.startBearing, pair.hit.options.ravSelected));
      pair.endTick.setIcon(boundaryTickIcon(pair.endBearing, pair.hit.options.ravSelected));
      if (pair.hit.options.ravSelected) { pair.casing.bringToFront(); pair.visible.bringToFront(); pair.hit.bringToFront(); }
    }
  };
  const refreshZoomStyles = () => {
    for (const pair of lines.values()) {
      pair.casing.setStyle(zoneCasingStyle(pair.hit.options.ravSelected, map.getZoom()));
      pair.visible.setStyle(zoneLineStyle(pair.hit.options.ravLevel, pair.hit.options.ravSelected, map.getZoom()));
      pair.hit.setStyle({ weight: map.getZoom() <= 8 ? 28 : 24 });
    }
  };
  map.on("zoomend", refreshZoomStyles);
  api.destroy = () => map.off("zoomend", refreshZoomStyles);
  return api;
}

export function refreshZoneStyles(layer, scoreForZone) {
  for (const [id, pair] of layer.lines.entries()) {
    const result = scoreForZone(id);
    pair.hit.options.ravLevel = result?.level || "unavailable";
    pair.visible.setStyle(zoneLineStyle(pair.hit.options.ravLevel, pair.hit.options.ravSelected, layer.map.getZoom()));
    pair.casing.setStyle(zoneCasingStyle(pair.hit.options.ravSelected, layer.map.getZoom()));
    pair.hit.setTooltipContent(`${escapeHtml(pair.hit.options.zoneTitle)} · ${result?.available ? `${result.score}/100` : "Ingen data"}`);
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
