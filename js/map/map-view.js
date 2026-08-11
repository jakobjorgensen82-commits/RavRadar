const palette = { good: "#168653", fair: "#e6a700", weak: "#d9822b", poor: "#d34a3a", unavailable: "#30383c" };

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

function boundaryTickLength(selected = false, zoom = 7) {
  // Markørens længde følger præcis den synlige farvestregs bredde.
  const baseWeight = zoom <= 7 ? 7 : zoom <= 9 ? 6 : zoom <= 11 ? 5.5 : 5;
  return baseWeight + (selected ? 4 : 0);
}

function boundaryTickIcon(tangentBearing, selected = false, zoom = 7) {
  const rotation = (tangentBearing + 90) % 360;
  const length = boundaryTickLength(selected, zoom);
  return L.divIcon({
    className: "zone-boundary-tick-wrap",
    html: `<span class="zone-boundary-tick${selected ? " selected" : ""}" style="--tick-rotation:${rotation}deg;--tick-length:${length}px" aria-hidden="true"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
}

function nearestBoundaryReference(lines, target, preferEnd = false) {
  let best = null;
  for (const line of lines) {
    for (let index = 0; index < line.length; index += 1) {
      const point = line[index];
      const latScale = Math.cos((point[0] + target[0]) * Math.PI / 360);
      const distance = ((point[0] - target[0]) ** 2) + (((point[1] - target[1]) * latScale) ** 2);
      if (!best || distance < best.distance) best = { line, index, point, distance };
    }
  }
  if (!best) return null;
  const neighbourIndex = preferEnd
    ? (best.index > 0 ? best.index - 1 : 1)
    : (best.index < best.line.length - 1 ? best.index + 1 : best.index - 1);
  const neighbour = best.line[neighbourIndex] || best.point;
  const bearing = preferEnd ? coastBearing(neighbour, best.point) : coastBearing(best.point, neighbour);
  return { point: best.point, bearing };
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
  if (!map.getPane("zoneBoundaryPane")) {
    const pane = map.createPane("zoneBoundaryPane");
    pane.style.zIndex = "430";
    pane.style.pointerEvents = "none";
  }

  for (const feature of featureCollection.features) {
    const zone = feature.properties;
    if (zone.zoneStatus !== "active") continue;
    const zoneId = zone._parentId || zone.id;
    const lineId = zone._mapId || zone.id;
    const result = scoreForZone(zoneId);
    const parentCoastLine = Array.isArray(zone.coastLine) && zone.coastLine.length > 1
      ? zone.coastLine.map(([lng, lat]) => [lat, lng])
      : null;
    const publicLines = Array.isArray(zone.publicCoastLines)
      ? zone.publicCoastLines.filter(line => Array.isArray(line) && line.length > 1).map(line => line.map(([lng, lat]) => [lat, lng]))
      : [];
    const coastLines = publicLines.length ? publicLines : (parentCoastLine ? [parentCoastLine] : []);
    if (!coastLines.length || !parentCoastLine) continue;
    const renderedCoast = coastLines.length === 1 ? coastLines[0] : coastLines;

    const casing = L.polyline(renderedCoast, {
      ...zoneCasingStyle(false, map.getZoom()),
      pane: "zoneCoastPane",
      interactive: false
    }).addTo(lineLayer);

    const visible = L.polyline(renderedCoast, {
      ...zoneLineStyle(result?.level, false, map.getZoom()),
      pane: "zoneCoastPane",
      interactive: false
    }).addTo(lineLayer);

    // En transparent, bred klikflade gør kystlinjen nem at vælge på mobil.
    const hit = L.polyline(renderedCoast, {
      color: "transparent",
      opacity: 0,
      weight: 24,
      pane: "zoneCoastPane",
      interactive: true,
      bubblingMouseEvents: false
    }).addTo(lineLayer);

    // Sorte tværstreger gør zonens start og slutning synlige uden at dække scorefarven.
    const startReference = nearestBoundaryReference(coastLines, parentCoastLine[0], false);
    const endReference = nearestBoundaryReference(coastLines, parentCoastLine[parentCoastLine.length - 1], true);
    const startBearing = startReference.bearing;
    const endBearing = endReference.bearing;
    const startTick = L.marker(startReference.point, { icon: boundaryTickIcon(startBearing, false, map.getZoom()), pane: "zoneBoundaryPane", interactive: false, keyboard: false }).addTo(lineLayer);
    const endTick = L.marker(endReference.point, { icon: boundaryTickIcon(endBearing, false, map.getZoom()), pane: "zoneBoundaryPane", interactive: false, keyboard: false }).addTo(lineLayer);

    hit.bindTooltip(`${escapeHtml(zone.name)} · ${result?.available ? `${result.score}/100` : "Ingen data"}`, { direction: "top", sticky: true });
    hit.on("click", () => onSelect(zone));
    hit.on("mouseover", () => visible.setStyle({ weight: visible.options.weight + 1, opacity: 1 }));
    hit.on("mouseout", () => visible.setStyle(zoneLineStyle(hit.options.ravLevel, hit.options.ravSelected, map.getZoom())));
    hit.options.ravLevel = result?.level || "unavailable";
    hit.options.ravSelected = false;
    hit.options.zoneTitle = zone._partName || zone.name;
    lines.set(lineId, { casing, visible, hit, startTick, endTick, startBearing, endBearing, zoneId });
  }

  const bounds = geometryLayer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 10 });

  const api = { geometryLayer, lineLayer, lines, map, selectedId: null };
  api.selectZone = id => {
    api.selectedId = id || null;
    for (const pair of lines.values()) {
      pair.hit.options.ravSelected = pair.zoneId === api.selectedId;
      pair.casing.setStyle(zoneCasingStyle(pair.hit.options.ravSelected, map.getZoom()));
      pair.visible.setStyle(zoneLineStyle(pair.hit.options.ravLevel, pair.hit.options.ravSelected, map.getZoom()));
      pair.startTick.setIcon(boundaryTickIcon(pair.startBearing, pair.hit.options.ravSelected, map.getZoom()));
      pair.endTick.setIcon(boundaryTickIcon(pair.endBearing, pair.hit.options.ravSelected, map.getZoom()));
      if (pair.hit.options.ravSelected) { pair.casing.bringToFront(); pair.visible.bringToFront(); pair.hit.bringToFront(); }
    }
  };
  const applyZoomStyles = () => {
    const zoom = map.getZoom();
    for (const pair of lines.values()) {
      pair.casing.setStyle(zoneCasingStyle(pair.hit.options.ravSelected, zoom));
      pair.visible.setStyle(zoneLineStyle(pair.hit.options.ravLevel, pair.hit.options.ravSelected, zoom));
      pair.hit.setStyle({ weight: zoom <= 8 ? 28 : 24 });
      pair.startTick.setIcon(boundaryTickIcon(pair.startBearing, pair.hit.options.ravSelected, zoom));
      pair.endTick.setIcon(boundaryTickIcon(pair.endBearing, pair.hit.options.ravSelected, zoom));
      // Leaflet kan afslutte zoomanimationens SVG-transform efter zoomend.
      // redraw() sikrer, at geometri og stregbredde projekteres på det nye zoomniveau.
      pair.casing.redraw();
      pair.visible.redraw();
      pair.hit.redraw();
    }
  };
  let zoomFrame = 0;
  const refreshZoomStyles = () => {
    applyZoomStyles();
    if (zoomFrame) cancelAnimationFrame(zoomFrame);
    zoomFrame = requestAnimationFrame(() => {
      zoomFrame = 0;
      applyZoomStyles();
    });
  };
  map.on("zoomend", refreshZoomStyles);
  api.destroy = () => {
    map.off("zoomend", refreshZoomStyles);
    if (zoomFrame) cancelAnimationFrame(zoomFrame);
  };
  return api;
}

export function refreshZoneStyles(layer, scoreForZone) {
  for (const pair of layer.lines.values()) {
    const result = scoreForZone(pair.zoneId);
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


function flowArrowIcon(type, directionDeg, label = "") {
  const rotation = (Number(directionDeg) + (type === "wind" ? 180 : 0) + 360) % 360;
  return L.divIcon({
    className: `flow-arrow-wrap ${type}`,
    html: `<span class="flow-arrow ${type}" style="--direction:${rotation}deg" aria-hidden="true">↑</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [0, -12]
  });
}

function latLngFromPoint(value, fallback = null) {
  if (Array.isArray(value) && value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
    return L.latLng(Number(value[1]), Number(value[0]));
  }
  return fallback;
}

function minArrowSeparationPx(zoom) {
  if (zoom <= 7) return 34;
  if (zoom <= 9) return 28;
  if (zoom <= 11) return 22;
  return 16;
}

function canPlaceAt(map, latLng, occupied, minDistance) {
  const p = map.latLngToLayerPoint(latLng);
  if (occupied.some(existing => p.distanceTo(existing) < minDistance)) return false;
  occupied.push(p);
  return true;
}

export function installFlowArrows(map, featureCollection, conditionForZone) {
  if (!map.getPane("flowArrowsPane")) {
    const pane = map.createPane("flowArrowsPane");
    pane.style.zIndex = "440";
    pane.style.pointerEvents = "none";
  }
  // Byg markørerne mens laget er afkoblet fra kortet. Hvis laget allerede er
  // monteret, udløser hver addTo(layer) ellers en dyr DOM-opdatering.
  const layer = L.layerGroup([], { pane:"flowArrowsPane" });

  let counts = { wind:0, current:0 };
  const render = () => {
    counts = { wind:0, current:0 };
    const wasVisible = map.hasLayer(layer);
    if (wasVisible) map.removeLayer(layer);
    layer.clearLayers();
    const bounds = map.getBounds().pad(0.12);
    const zoom = map.getZoom();
    const minDistance = minArrowSeparationPx(zoom);
    const occupied = { current: [], wind: [] };

    for (const feature of featureCollection.features || []) {
      const zone = feature.properties || {};
      if (zone.zoneStatus && zone.zoneStatus !== "active") continue;
      try {
      const fallbackPoint = Array.isArray(zone.dataPoint) ? L.latLng(zone.dataPoint[1], zone.dataPoint[0]) : null;
      if (!fallbackPoint) continue;
      const zoneCondition = conditionForZone(zone.id);
      const condition = zoneCondition?.current || zoneCondition || {};
      const flowPoints = zoneCondition?.flowPoints || {};
      const hasWind = condition.windDirectionDeg !== null && condition.windDirectionDeg !== undefined && condition.windDirectionDeg !== '' && Number.isFinite(Number(condition.windDirectionDeg));
      const currentProvider = zoneCondition?.currentSource || zoneCondition?.sources?.current?.provider || null;
      const hasCurrentValue = condition.currentDirectionDeg !== null && condition.currentDirectionDeg !== undefined && condition.currentDirectionDeg !== '' && Number.isFinite(Number(condition.currentDirectionDeg));
      const hasVerifiedDmiPoint = flowPoints?.sources?.current === 'dmi-marine-grid';
      const hasCurrent = hasCurrentValue && (currentProvider !== 'dmi' || hasVerifiedDmiPoint);

      // Strømpilen står ved det faktiske marine DMI-gitterpunkt, som leverede
      // current-u/current-v. Der fremstilles ikke længere kunstige kopier rundt
      // om zonen; det gav pile på land og antydede en rumlig opløsning, vi ikke har.
      if (hasCurrent) {
        const currentPosition = latLngFromPoint(flowPoints.current, fallbackPoint);
        if (bounds.contains(currentPosition) && canPlaceAt(map, currentPosition, occupied.current, minDistance)) {
          const marker = L.marker(currentPosition, {
            icon: flowArrowIcon("current", condition.currentDirectionDeg),
            interactive: false,
            keyboard: false,
            pane: "flowArrowsPane"
          }).addTo(layer);
          marker.options.ravFlowMeta = { type:'current', zoneId:zone.id, point:[currentPosition.lng,currentPosition.lat], directionDeg:Number(condition.currentDirectionDeg) };
          counts.current += 1;
        }
      }

      // Vindpilen står ved det faktiske atmosfæriske gitterpunkt. Vindretningen
      // er meteorologisk "fra", derfor vender ikonfunktionen pilen 180° til den
      // retning luften bevæger sig imod.
      if (hasWind) {
        const windPosition = latLngFromPoint(flowPoints.wind, fallbackPoint);
        if (bounds.contains(windPosition) && canPlaceAt(map, windPosition, occupied.wind, minDistance)) {
          const marker = L.marker(windPosition, {
            icon: flowArrowIcon("wind", condition.windDirectionDeg),
            interactive: false,
            keyboard: false,
            pane: "flowArrowsPane"
          }).addTo(layer);
          marker.options.ravFlowMeta = { type:'wind', zoneId:zone.id, point:[windPosition.lng,windPosition.lat], directionDeg:(Number(condition.windDirectionDeg)+180)%360 };
          counts.wind += 1;
        }
      }
      } catch (error) {
        console.warn("Pile for zone kunne ikke vises", { zoneId: zone.id || null, error });
      }
    }
    layer.addTo(map);
    layer.ravFlowCounts = { ...counts };
    return layer.ravFlowCounts;
  };

  map.on("zoomend moveend resize", render);
  render();
  return { layer, refresh:render, counts:()=>({ ...(layer.ravFlowCounts||counts) }) };
}
