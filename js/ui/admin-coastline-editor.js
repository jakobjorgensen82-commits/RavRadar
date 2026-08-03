import {
  applyAnchor,
  applyOverridesToCollection,
  cloneLine,
  createOverride,
  insertPoint,
  lineLengthKm,
  movePoint,
  removePoint,
  validateCoastLine
} from '../core/coastline-editor-model.js?v=4.0.87';

let editorMap = null;
let mapLayers = [];
let activeState = null;

const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

function clearLayers() {
  if (!editorMap) return;
  mapLayers.forEach(layer => editorMap.removeLayer(layer));
  mapLayers = [];
}

function addLayer(layer) {
  layer.addTo(editorMap);
  mapLayers.push(layer);
  return layer;
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function pushHistory(state) {
  state.dirty = true;
  state.undo.push(cloneLine(state.line));
  if (state.undo.length > 80) state.undo.shift();
  state.redo = [];
}

function renderMetrics(state) {
  const validation = validateCoastLine(state.line, state.original);
  const metric = document.querySelector('#coastlineMetrics');
  if (!metric) return validation;
  metric.innerHTML = `
    <div class="metric-card"><span>Punkter</span><b>${validation.pointCount}</b></div>
    <div class="metric-card"><span>Længde</span><b>${validation.lengthKm.toFixed(2)} km</b></div>
    <div class="metric-card"><span>Ændring</span><b>${((validation.lengthRatio - 1) * 100).toFixed(0)} %</b></div>
    <div class="metric-card"><span>Kontrol</span><b>${validation.valid ? '✓ Godkendt' : '⚠ Kræver rettelse'}</b></div>`;
  const issues = document.querySelector('#coastlineIssues');
  issues.innerHTML = validation.issues.length
    ? `<ul>${validation.issues.map(issue => `<li>${esc(issue)}</li>`).join('')}</ul>`
    : '<p>Linjen består de automatiske geometri-kontroller.</p>';
  issues.className = `coastline-issues ${validation.valid ? 'ok' : 'warning'}`;
  document.querySelector('#saveCoastlineDraft').disabled = !validation.valid;
  return validation;
}

function drawMap(state, { fit = false } = {}) {
  if (!editorMap || !window.L) return;
  clearLayers();
  const originalLatLngs = state.original.map(([lon, lat]) => [lat, lon]);
  const editedLatLngs = state.line.map(([lon, lat]) => [lat, lon]);
  addLayer(L.polyline(originalLatLngs, { color:'#d8a232', weight:5, opacity:.55, dashArray:'8 8', interactive:false }));
  addLayer(L.polyline(editedLatLngs, { color:'#5ee093', weight:7, opacity:1, interactive:false }));

  state.line.forEach((point, index) => {
    const marker = addLayer(L.circleMarker([point[1], point[0]], {
      radius: index === 0 || index === state.line.length - 1 ? 7 : 5,
      color:'#fff', fillColor:'#0b7', fillOpacity:1, weight:2,
      draggable:false
    }));
    const drag = L.marker([point[1], point[0]], {
      draggable:true,
      opacity:0,
      icon:L.divIcon({className:'coastline-drag-handle',html:'<span></span>',iconSize:[30,30],iconAnchor:[15,15]})
    });
    addLayer(drag);
    drag.bindTooltip(`Punkt ${index + 1} · træk for at flytte${state.line.length > 2 ? ' · dobbeltklik for at slette' : ''}`);
    drag.on('dragstart', () => pushHistory(state));
    drag.on('drag', event => {
      const ll = event.target.getLatLng();
      state.line = movePoint(state.line, index, [ll.lng, ll.lat]);
      marker.setLatLng(ll);
      const green = mapLayers.find(layer => layer instanceof L.Polyline && layer.options.color === '#5ee093');
      green?.setLatLngs(state.line.map(([lon, lat]) => [lat, lon]));
      renderMetrics(state);
    });
    drag.on('dragend', () => { drawMap(state); renderMetrics(state); });
    drag.on('dblclick', event => {
      L.DomEvent.stopPropagation(event);
      if (state.line.length <= 2) return;
      pushHistory(state);
      state.line = removePoint(state.line, index);
      drawMap(state);
      renderMetrics(state);
    });
  });

  state.line.slice(1).forEach((point, index) => {
    const mid = midpoint(state.line[index], point);
    const marker = addLayer(L.circleMarker([mid[1], mid[0]], {radius:5,color:'#67b7ff',fillColor:'#67b7ff',fillOpacity:.8,weight:1}));
    marker.bindTooltip('Klik for at tilføje et nyt punkt');
    marker.on('click', event => {
      L.DomEvent.stopPropagation(event);
      pushHistory(state);
      state.line = insertPoint(state.line, index + 1, mid);
      drawMap(state);
      renderMetrics(state);
    });
  });

  for (const anchor of state.anchors) {
    addLayer(L.marker([anchor[1], anchor[0]], {
      icon:L.divIcon({className:'coastline-anchor-icon',html:'<span>◆</span>',iconSize:[28,28],iconAnchor:[14,14]})
    }).bindTooltip('Strandmarkør'));
  }

  if (fit) {
    const bounds = L.latLngBounds([...originalLatLngs, ...editedLatLngs]);
    if (bounds.isValid()) editorMap.fitBounds(bounds.pad(.25), {maxZoom:17});
  }
}

function zoneOptions(zones, selectedId, query = '') {
  const needle = query.trim().toLowerCase();
  return zones
    .filter(zone => !needle || `${zone.properties?.id} ${zone.properties?.name} ${zone.properties?.region}`.toLowerCase().includes(needle))
    .map(zone => `<option value="${esc(zone.properties.id)}" ${zone.properties.id === selectedId ? 'selected' : ''}>${esc(zone.properties.name || zone.properties.id)}</option>`)
    .join('');
}

function selectZone(config, zoneId) {
  const zone = config.zones.find(item => item.properties?.id === zoneId) || config.zones[0];
  if (!zone) return;
  const override = config.document.overrides?.[zone.properties.id];
  activeState = {
    zone,
    original: cloneLine(zone.properties.coastLine || []),
    line: cloneLine(override?.coastLine || zone.properties.coastLine || []),
    anchors: [],
    undo: [],
    redo: [],
    note: override?.note || '',
    disabled: override?.disabled === true,
    dirty: false
  };
  document.querySelector('#coastlineZone').value = zone.properties.id;
  document.querySelector('#coastlineNote').value = activeState.note;
  document.querySelector('#coastlineZoneStatus').innerHTML = override
    ? `<span class="badge draft">${override.disabled?'Kystdel deaktiveret':'Kladde gemt'} ${esc(new Date(override.updatedAt).toLocaleString('da-DK'))}</span>`
    : '<span class="badge">Uændret projektgeometri</span>';
  document.querySelector('#coastlineAnchorMode').checked = false;
  editorMap.__anchorMode = false;
  drawMap(activeState, {fit:true});
  renderMetrics(activeState);
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/geo+json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

export function destroyCoastlineEditor() {
  if (editorMap) editorMap.remove();
  editorMap = null;
  mapLayers = [];
  activeState = null;
}

export function renderCoastlineEditor(content, config) {
  destroyCoastlineEditor();
  const draftCount = Object.keys(config.document.overrides || {}).length;
  const selectedId = config.selectedZoneId || config.zones[0]?.properties?.id;
  content.innerHTML = `
    <article class="admin-card coastline-editor-intro">
      <div class="rule-card-head"><div><h2>Manuel redigering af kystlinjer</h2><p>Ret én zone ad gangen direkte på kortet. Ændringer gemmes som kladder og påvirker ikke brugerkortet, før en valideret <code>zones.geojson</code> eksporteres og lægges på GitHub.</p></div><span class="badge draft">${draftCount} kladder</span></div>
      <div class="workflow-path"><div><b>1. Vælg zone</b><span>Find kyststrækningen</span></div><div><b>2. Ret linjen</b><span>Træk punkter eller sæt strandmarkører</span></div><div><b>3. Kontrollér</b><span>Geometri testes automatisk</span></div><div><b>4. Udgiv samlet</b><span>Eksportér først efter kontrol</span></div></div>
    </article>
    <div class="coastline-editor-layout">
      <article class="admin-card coastline-editor-panel">
        <label>Søg zone<input id="coastlineSearch" placeholder="Navn, område eller zone-ID"></label>
        <label>Zone<select id="coastlineZone">${zoneOptions(config.zones, selectedId)}</select></label>
        <div id="coastlineZoneStatus"></div>
        <fieldset class="coastline-tools"><legend>Redigering</legend>
          <p><b>Grønne punkter:</b> træk dem. <b>Blå punkter:</b> klik for at indsætte. Dobbeltklik på et grønt punkt for at slette det.</p>
          <div class="coastline-mode-switch"><button type="button" id="coastlineNavigateMode" class="admin-button secondary active">Flyt kort</button><button type="button" id="coastlinePreciseMode" class="admin-button secondary">Præcis redigering</button></div>
          <label class="switch-line"><input id="coastlineAnchorMode" type="checkbox"> Sæt strandmarkører ved klik på kortet</label>
          <label>Påvirk nabopunkter<select id="coastlineAnchorRadius"><option value="0">Kun nærmeste punkt</option><option value="1">1 punkt på hver side</option><option value="2" selected>2 punkter på hver side</option><option value="3">3 punkter på hver side</option><option value="5">5 punkter på hver side</option></select></label>
          <p class="hint">En strandmarkør flytter nærmeste linjepunkt til markøren og former nabopunkterne gradvist. Det giver en blød linje uden at flytte hele zonen.</p>
        </fieldset>
        <div class="toolbar"><button id="coastlineUndo" class="admin-button secondary">Fortryd</button><button id="coastlineRedo" class="admin-button secondary">Gentag</button><button id="coastlineReset" class="admin-button danger">Nulstil zonen</button></div>
        <label>Notat om rettelsen<textarea id="coastlineNote" placeholder="Fx: skærer forbi havnemolen og følger stranden mod nord"></textarea></label>
        <div id="coastlineMetrics" class="direction-checks"></div>
        <div id="coastlineIssues" aria-live="polite"></div>
        <div class="toolbar"><button id="saveCoastlineDraft" class="admin-button">Gem zonekladde</button><button id="disableCoastlineSegment" class="admin-button danger">Deaktivér kystdel</button><button id="discardCoastlineDraft" class="admin-button secondary">Slet kladde</button></div><p class="hint">Deaktivér kystdel fjerner zonen fra den eksporterede aktive visning uden at slette dens geometri eller historik.</p>
      </article>
      <article class="admin-card coastline-map-card">
        <div class="coastline-map-legend"><span><i class="line original"></i> Projektets linje</span><span><i class="line edited"></i> Redigeret linje</span><span><i class="dot insert"></i> Indsæt punkt</span><span><i class="diamond">◆</i> Strandmarkør</span></div>
        <div id="coastlineEditorMap" class="coastline-editor-map"></div>
      </article>
    </div>
    <article class="admin-card coastline-publish-card">
      <h2>Samlet udgivelse</h2>
      <p>Eksporten anvender alle gyldige kladder oven på den nuværende zonefil. Polygoner, zone-ID'er, RavScore, DMI-routing, onshore-retninger og øvrige egenskaber bevares uændret.</p>
      <div class="toolbar"><button id="exportCoastlineDrafts" class="admin-button secondary">Eksportér kladdebackup</button><button id="exportPublishedZones" class="admin-button">Eksportér valideret zones.geojson</button></div>
      <p class="status-warning"><b>Sikkerhed:</b> Den eksporterede fil bliver ikke automatisk aktiv. Den skal gennem projektets normale GitHub-validering. Den eksisterende snapshot-/rollbackmekanisme bevares.</p>
    </article>`;

  editorMap = L.map('coastlineEditorMap', {zoomControl:true}).setView([56.2, 10.2], 8);
  const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:20, attribution:'&copy; OpenStreetMap-bidragsydere'});
  const satellite = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:20, attribution:'Imagery &copy; Esri, Maxar'}).addTo(editorMap);
  L.control.layers({'Satellit':satellite,'Standardkort':street}, null, {collapsed:false}).addTo(editorMap);

  editorMap.on('click', event => {
    if (!editorMap.__anchorMode || !activeState) return;
    pushHistory(activeState);
    const anchor = [event.latlng.lng, event.latlng.lat];
    activeState.anchors.push(anchor);
    const radius = Number(document.querySelector('#coastlineAnchorRadius').value || 2);
    activeState.line = applyAnchor(activeState.line, anchor, radius);
    drawMap(activeState);
    renderMetrics(activeState);
  });

  document.querySelector('#coastlineSearch').addEventListener('input', event => {
    const select = document.querySelector('#coastlineZone');
    const current = select.value;
    select.innerHTML = zoneOptions(config.zones, current, event.target.value);
    if (!select.value && select.options.length) select.value = select.options[0].value;
  });
  document.querySelector('#coastlineZone').addEventListener('change', event => {
    if (activeState?.dirty && !confirm('Der er ændringer, som ikke er gemt. Skift zone og kassér dem?')) { event.target.value = activeState.zone.properties.id; return; }
    selectZone(config, event.target.value);
  });
  const setMapMode = precise => {
    editorMap.__preciseMode = precise;
    document.querySelector('#coastlineNavigateMode').classList.toggle('active', !precise);
    document.querySelector('#coastlinePreciseMode').classList.toggle('active', precise);
    if (!precise) { document.querySelector('#coastlineAnchorMode').checked = false; editorMap.__anchorMode = false; }
    document.querySelector('#coastlineEditorMap').classList.toggle('precise-mode', precise);
  };
  document.querySelector('#coastlineNavigateMode').onclick=()=>setMapMode(false);
  document.querySelector('#coastlinePreciseMode').onclick=()=>setMapMode(true);
  document.querySelector('#coastlineAnchorMode').addEventListener('change', event => {
    editorMap.__anchorMode = event.target.checked;
    document.querySelector('#coastlineEditorMap').classList.toggle('anchor-mode', event.target.checked);
  });
  document.querySelector('#coastlineUndo').addEventListener('click', () => {
    if (!activeState?.undo.length) return;
    activeState.redo.push(cloneLine(activeState.line));
    activeState.line = activeState.undo.pop();
    drawMap(activeState); renderMetrics(activeState);
  });
  document.querySelector('#coastlineRedo').addEventListener('click', () => {
    if (!activeState?.redo.length) return;
    activeState.undo.push(cloneLine(activeState.line));
    activeState.line = activeState.redo.pop();
    drawMap(activeState); renderMetrics(activeState);
  });
  document.querySelector('#coastlineReset').addEventListener('click', () => {
    if (!activeState || !confirm('Nulstil denne zone til projektets oprindelige kystlinje?')) return;
    pushHistory(activeState);
    activeState.line = cloneLine(activeState.original);
    activeState.anchors = [];
    drawMap(activeState); renderMetrics(activeState);
  });
  document.querySelector('#saveCoastlineDraft').addEventListener('click', async () => {
    if (!activeState) return;
    const validation = validateCoastLine(activeState.line, activeState.original);
    if (!validation.valid) return alert('Linjen kan ikke gemmes, før geometri-fejlene er rettet.');
    const override = createOverride(activeState.zone, activeState.line, document.querySelector('#coastlineNote').value);
    config.document.overrides[override.zoneId] = override;
    config.document.updatedAt = new Date().toISOString();
    await config.onSave(config.document);
    activeState.dirty = false;
    selectZone(config, override.zoneId);
  });
  document.querySelector('#disableCoastlineSegment').addEventListener('click', async () => {
    if (!activeState) return;
    const id=activeState.zone.properties.id;
    const existing=config.document.overrides[id];
    const disabling=existing?.disabled!==true;
    if (!confirm(disabling?'Deaktivér denne kystdel? Geometrien bevares og kan aktiveres igen.':'Aktivér denne kystdel igen?')) return;
    const override=createOverride(activeState.zone, activeState.line, document.querySelector('#coastlineNote').value);
    override.disabled=disabling;
    config.document.overrides[id]=override;
    config.document.updatedAt=new Date().toISOString();
    await config.onSave(config.document);
    activeState.dirty=false;
    selectZone(config,id);
  });
  document.querySelector('#discardCoastlineDraft').addEventListener('click', async () => {
    if (!activeState || !config.document.overrides[activeState.zone.properties.id]) return;
    if (!confirm('Slet den gemte kladde for denne zone?')) return;
    delete config.document.overrides[activeState.zone.properties.id];
    config.document.updatedAt = new Date().toISOString();
    await config.onSave(config.document);
    selectZone(config, activeState.zone.properties.id);
  });
  document.querySelector('#exportCoastlineDrafts').addEventListener('click', () => downloadJson(`ravradar-kystlinje-klader-${new Date().toISOString().slice(0,10)}.json`, config.document));
  document.querySelector('#exportPublishedZones').addEventListener('click', () => {
    const invalid = Object.values(config.document.overrides || {}).filter(override => !validateCoastLine(override.coastLine, override.originalCoastLine).valid);
    if (invalid.length) return alert(`${invalid.length} kladde(r) er ugyldige. Ret dem før samlet eksport.`);
    const collection = applyOverridesToCollection(config.collection, config.document.overrides);
    downloadJson('zones.geojson', collection);
  });

  selectZone(config, selectedId);
  setTimeout(() => editorMap?.invalidateSize(), 0);
}
