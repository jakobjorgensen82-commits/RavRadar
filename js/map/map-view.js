import { t } from "../i18n.js?v=4.0.320";

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
  // På landsniveau skal skellene være små nok til, at kysten ikke bliver sort.
  const baseWeight = zoom <= 6 ? 2.5 : zoom <= 7 ? 3 : zoom <= 9 ? 5 : 6;
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

function boundaryDistanceKm(left, right) {
  const latScale = Math.cos((left[0] + right[0]) * Math.PI / 360);
  const latKm = (left[0] - right[0]) * 111.32;
  const lonKm = (left[1] - right[1]) * 111.32 * latScale;
  return Math.hypot(latKm, lonKm);
}

export function sharedMainZoneBoundaries(rows, maximumDistanceKm = .35) {
  const candidates = rows.flatMap(row => [
    row.startReference && {...row.startReference, zoneId: row.zoneId, side: 'start'},
    row.endReference && {...row.endReference, zoneId: row.zoneId, side: 'end'}
  ]).filter(candidate => Array.isArray(candidate?.point));
  const nearest = candidates.map((left, leftIndex) => {
    let best = null;
    candidates.forEach((right, rightIndex) => {
      if (leftIndex === rightIndex || left.zoneId === right.zoneId) return;
      const distanceKm = boundaryDistanceKm(left.point, right.point);
      if (distanceKm <= maximumDistanceKm && (!best || distanceKm < best.distanceKm)) best = {rightIndex, distanceKm};
    });
    return best;
  });
  const used = new Set();
  const boundaries = [];
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    if (used.has(leftIndex)) continue;
    const best = nearest[leftIndex];
    if (!best || nearest[best.rightIndex]?.rightIndex !== leftIndex || used.has(best.rightIndex)) continue;
    used.add(leftIndex); used.add(best.rightIndex);
    const left = candidates[leftIndex], right = candidates[best.rightIndex];
    boundaries.push({
      point: [(left.point[0] + right.point[0]) / 2, (left.point[1] + right.point[1]) / 2],
      bearing: left.bearing,
      zoneIds: new Set([left.zoneId, right.zoneId])
    });
  }
  return boundaries;
}

export function createMap(elementId) {
  const map = L.map(elementId, { zoomControl: true }).setView([56.45, 10.15], 7);
  const streetMap = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: `&copy; ${t('map.osmAttribution')}` });
  const satelliteMap = L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: t('map.imageryAttribution') });
  const saved = localStorage.getItem("ravradar-basemap");
  (saved === "satellite" ? satelliteMap : streetMap).addTo(map);
  const control = L.control.layers({ [t('map.standard')]: streetMap, [t('map.satellite')]: satelliteMap }, null, { position: "topright", collapsed: true }).addTo(map);
  const toggle = control.getContainer()?.querySelector(".leaflet-control-layers-toggle");
  if (toggle) { toggle.title = t('map.switch'); toggle.setAttribute("aria-label", t('map.switch')); }
  map.on("baselayerchange", event => { localStorage.setItem("ravradar-basemap", event.layer === satelliteMap ? "satellite" : "street"); control.collapse(); });
  return map;
}

export function renderZones(map, featureCollection, scoreForZone, onSelect) {
  // Polygonerne bevares skjult til geofencing og beregninger.
  const geometryLayer = L.geoJSON(featureCollection, { style: { opacity: 0, fillOpacity: 0, weight: 0 }, interactive: false });
  const lineLayer = L.layerGroup().addTo(map);
  const lines = new Map();
  const rows = [];

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

    const startReference = nearestBoundaryReference(coastLines, parentCoastLine[0], false);
    const endReference = nearestBoundaryReference(coastLines, parentCoastLine[parentCoastLine.length - 1], true);

    hit.bindTooltip(`${escapeHtml(zone.name)} · ${result?.available ? `${result.score}/100` : t('map.noData')}`, { direction: "top", sticky: true });
    hit.on("click", () => onSelect(zone));
    hit.on("mouseover", () => visible.setStyle({ weight: visible.options.weight + 1, opacity: 1 }));
    hit.on("mouseout", () => visible.setStyle(zoneLineStyle(hit.options.ravLevel, hit.options.ravSelected, map.getZoom())));
    hit.options.ravLevel = result?.level || "unavailable";
    hit.options.ravSelected = false;
    hit.options.zoneTitle = zone._partName || zone.name;
    const row = { casing, visible, hit, zoneId, lineId, startReference, endReference };
    rows.push(row);
    lines.set(lineId, row);
  }

  // Ét sort skel tegnes kun, når to forskellige hovedzoners ydre ender mødes.
  // Interne multipart-/beregningsdelgrænser og fritstående zoneender får intet skel.
  const boundaryTicks = sharedMainZoneBoundaries(rows).map(boundary => ({
    ...boundary,
    marker: L.marker(boundary.point, {icon: boundaryTickIcon(boundary.bearing, false, map.getZoom()), pane:'zoneBoundaryPane', interactive:false, keyboard:false}).addTo(lineLayer)
  }));

  const bounds = geometryLayer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 10 });

  const api = { geometryLayer, lineLayer, lines, boundaryTicks, overviewBounds: bounds, map, selectedId: null };
  let localPartsLayer = null;
  api.clearLocalParts = () => {
    if (localPartsLayer) map.removeLayer(localPartsLayer);
    localPartsLayer = null;
  };
  api.showLocalParts = (zoneId, parts = [], highlightedPartIds = []) => {
    api.clearLocalParts();
    const highlighted = new Set(highlightedPartIds);
    localPartsLayer = L.layerGroup().addTo(map);
    const partBounds = L.latLngBounds([]);
    parts.forEach((part, index) => {
      const geometry = part?.geometry;
      const sourceLines = geometry?.type === 'LineString' ? [geometry.coordinates] : geometry?.type === 'MultiLineString' ? geometry.coordinates : [];
      const latLngLines = sourceLines.filter(line => Array.isArray(line) && line.length > 1).map(line => line.map(([lng,lat]) => [lat,lng]));
      if (!latLngLines.length) return;
      const isHighlighted = highlighted.has(part.partId);
      const color = isHighlighted ? '#0a7b4f' : ['#1769aa','#8b5cf6','#b45309','#0f766e'][index % 4];
      const layer = L.polyline(latLngLines.length === 1 ? latLngLines[0] : latLngLines, {pane:'zoneBoundaryPane',color,weight:isHighlighted?9:7,opacity:1,lineCap:'round',lineJoin:'round',interactive:true}).addTo(localPartsLayer);
      layer.bindTooltip(`${escapeHtml(part.name || t('map.coastalPart'))}${isHighlighted ? ` · ${t('map.amongBest')}` : ''}`, {permanent:true,direction:'top',className:`local-part-label${isHighlighted?' highlighted':''}`});
      partBounds.extend(layer.getBounds());
    });
    if (partBounds.isValid()) map.fitBounds(partBounds,{padding:[34,34],maxZoom:12});
    api.selectedId = zoneId;
  };
  api.showOverview = () => { if (api.overviewBounds?.isValid()) map.fitBounds(api.overviewBounds, {padding:[18,18], maxZoom:7}); };
  api.selectZone = id => {
    api.clearLocalParts();
    api.selectedId = id || null;
    for (const pair of lines.values()) {
      pair.hit.options.ravSelected = pair.zoneId === api.selectedId;
      pair.casing.setStyle(zoneCasingStyle(pair.hit.options.ravSelected, map.getZoom()));
      pair.visible.setStyle(zoneLineStyle(pair.hit.options.ravLevel, pair.hit.options.ravSelected, map.getZoom()));
      if (pair.hit.options.ravSelected) { pair.casing.bringToFront(); pair.visible.bringToFront(); pair.hit.bringToFront(); }
    }
    for (const boundary of boundaryTicks) boundary.marker.setIcon(boundaryTickIcon(boundary.bearing, boundary.zoneIds.has(api.selectedId), map.getZoom()));
  };
  const applyZoomStyles = () => {
    const zoom = map.getZoom();
    for (const pair of lines.values()) {
      pair.casing.setStyle(zoneCasingStyle(pair.hit.options.ravSelected, zoom));
      pair.visible.setStyle(zoneLineStyle(pair.hit.options.ravLevel, pair.hit.options.ravSelected, zoom));
      pair.hit.setStyle({ weight: zoom <= 8 ? 28 : 24 });
      // Leaflet kan afslutte zoomanimationens SVG-transform efter zoomend.
      // redraw() sikrer, at geometri og stregbredde projekteres på det nye zoomniveau.
      pair.casing.redraw();
      pair.visible.redraw();
      pair.hit.redraw();
    }
    for (const boundary of boundaryTicks) boundary.marker.setIcon(boundaryTickIcon(boundary.bearing, boundary.zoneIds.has(api.selectedId), zoom));
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
    api.clearLocalParts();
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
    pair.hit.setTooltipContent(`${escapeHtml(pair.hit.options.zoneTitle)} · ${result?.available ? `${result.score}/100` : t('map.noData')}`);
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

function pointCoordinates(value, fallback = null) {
  if (Array.isArray(value) && value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
    return [Number(value[0]), Number(value[1])];
  }
  return fallback;
}

function validDirection(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function buildFlowArrowCandidates(featureCollection, conditionForZone, coastalParts = null, zoom = 7) {
  const verifiedCurrentGridSources = new Set(['dmi-marine-grid', 'copernicus-current-grid', 'dmi-regional-proxy-grid']);
  const candidates = [];
  const activeZoneIds = new Set();
  for (const feature of featureCollection?.features || []) {
    const zone = feature.properties || {};
    if (zone.zoneStatus && zone.zoneStatus !== 'active') continue;
    if (zone.id) activeZoneIds.add(zone.id);
    const fallbackPoint = pointCoordinates(zone.dataPoint);
    if (!fallbackPoint) continue;
    const zoneCondition = conditionForZone(zone.id) || {};
    const condition = zoneCondition.current || zoneCondition;
    const flowPoints = zoneCondition.flowPoints || {};
    const currentSourceMetadata = flowPoints?.sourceMetadata?.current || {};
    const currentProvider = zoneCondition.currentSource || zoneCondition.sources?.current?.provider || null;
    const verifiedCurrent = verifiedCurrentGridSources.has(flowPoints?.sources?.current);
    if (validDirection(condition.currentDirectionDeg) && (currentProvider !== 'dmi' || verifiedCurrent)) {
      candidates.push({
        type:'current', zoneId:zone.id, partId:null,
        point:pointCoordinates(flowPoints.current, fallbackPoint),
        directionDeg:Number(condition.currentDirectionDeg),
        source:flowPoints?.sources?.current || 'provider-request-point',
        sourceClass:typeof currentSourceMetadata.sourceClass === 'string'
          ? currentSourceMetadata.sourceClass:null,
        distanceKm:typeof currentSourceMetadata.distanceKm === 'number'
          && Number.isFinite(currentSourceMetadata.distanceKm)
          ? currentSourceMetadata.distanceKm:null,
      });
    }
    if (validDirection(condition.windDirectionDeg)) {
      candidates.push({
        type:'wind', zoneId:zone.id, partId:null,
        point:pointCoordinates(flowPoints.wind, fallbackPoint),
        directionDeg:Number(condition.windDirectionDeg),
        source:flowPoints?.sources?.wind || 'provider-request-point'
      });
    }
  }

  // Landsoversigten bevarer ét repræsentativt punkt pr. hovedzone. Først ved
  // nærmere zoom tilføjes lokale kystdeles egne, dokumenterede DMI-punkter.
  // Dermed vokser tætheden med kortets detaljeniveau uden kunstige kopier.
  if (zoom < 9 || coastalParts?.enabled !== true) return candidates;
  for (const [partId, part] of Object.entries(coastalParts.parts || {})) {
    if (!activeZoneIds.has(part?.zoneId)) continue;
    const weather = part?.current?.weather || {};
    const flowPoints = part?.flowPoints || {};
    const currentReferenceAt = Date.parse(coastalParts.zones?.[part.zoneId]?.currentReferenceAt || '');
    const partCurrentAt = Date.parse(part?.current?.time || '');
    const sharesZoneReference = Number.isFinite(currentReferenceAt) && partCurrentAt === currentReferenceAt;
    if (sharesZoneReference && validDirection(weather.currentDirectionDeg) && verifiedCurrentGridSources.has(flowPoints?.sources?.current)) {
      const point = pointCoordinates(flowPoints.current);
      const sourceMetadata=flowPoints?.sourceMetadata?.current||{};
      if (point) candidates.push({
        type:'current',zoneId:part.zoneId,partId,point,
        directionDeg:Number(weather.currentDirectionDeg),source:flowPoints.sources.current,
        sourceClass:typeof sourceMetadata.sourceClass==='string'?sourceMetadata.sourceClass:null,
        distanceKm:typeof sourceMetadata.distanceKm==='number'&&Number.isFinite(sourceMetadata.distanceKm)
          ? sourceMetadata.distanceKm:null,
      });
    }
    const windSource = flowPoints?.sources?.wind;
    if (sharesZoneReference && validDirection(weather.windDirectionDeg) && ['dmi-atmospheric-grid', 'dmi-marine-wind-grid'].includes(windSource)) {
      const point = pointCoordinates(flowPoints.wind);
      if (point) candidates.push({ type:'wind', zoneId:part.zoneId, partId, point, directionDeg:Number(weather.windDirectionDeg), source:windSource });
    }
  }
  return candidates;
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

export function installFlowArrows(map, featureCollection, conditionForZone, coastalPartsForMap = () => null) {
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

    const candidates = buildFlowArrowCandidates(featureCollection, conditionForZone, coastalPartsForMap?.(), zoom);
    for (const candidate of candidates) {
      try {
        const position = latLngFromPoint(candidate.point);
        if (!position || !bounds.contains(position) || !canPlaceAt(map, position, occupied[candidate.type], minDistance)) continue;
        const marker = L.marker(position, {
          icon: flowArrowIcon(candidate.type, candidate.directionDeg),
          interactive: false,
          keyboard: false,
          pane: "flowArrowsPane"
        }).addTo(layer);
        marker.options.ravFlowMeta = {
          type:candidate.type,
          zoneId:candidate.zoneId,
          partId:candidate.partId,
          source:candidate.source,
          point:[position.lng,position.lat],
          directionDeg:candidate.type === 'wind' ? (candidate.directionDeg+180)%360 : candidate.directionDeg
        };
        counts[candidate.type] += 1;
      } catch (error) {
        console.warn("Pile for zone kunne ikke vises", { zoneId:candidate.zoneId || null, partId:candidate.partId || null, error });
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
