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
} from '../core/coastline-editor-model.js?v=4.0.231';

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

function geometryLines(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates || []];
  if (geometry?.type === 'MultiLineString') return geometry.coordinates || [];
  return [];
}

function ownershipParts(config) {
  return Object.entries(config.coastalParts?.zones || {}).flatMap(([shippedZoneId, parts]) =>
    (parts || []).map(part => ({...part, shippedZoneId, sourceZoneId:part.sourceZoneId || shippedZoneId}))
  );
}

function effectiveOwner(config, part) {
  return config.document.partOwnership?.[part.partId]?.targetZoneId || part.shippedZoneId;
}

function isDisabled(config, part) {
  const row = config.document.disabledParts?.[part.partId];
  return row?.disabled === true && row?.published === true;
}

function validateTransferPart(part) {
  const failures=[];
  if(!part?.partId)failures.push('kystdelen mangler et stabilt ID');
  if(!geometryLines(part?.geometry).some(line=>line.length>1))failures.push('kystgeometrien er ugyldig');
  if(!Array.isArray(part?.landPoint)||part.landPoint.length!==2)failures.push('landpunkt mangler');
  if(!Array.isArray(part?.waterPoint)||part.waterPoint.length!==2)failures.push('vandpunkt mangler');
  if(!Number.isFinite(Number(part?.onshoreDirectionDeg)))failures.push('kystretningen mangler');
  if(!['full','partial'].includes(part?.marineCoverage))failures.push('DMI-gridbevis mangler');
  return {ok:failures.length===0,failures};
}

function showOwnershipValidation(state,kind,message) {
  state.validationMessage={kind,message};
  const box=document.querySelector('#coastlineOwnershipValidation');
  if(!box)return;
  box.className=`coastline-validation-status ${kind}`;
  box.textContent=message;
}

function assignPartToSelectedZone(state, part) {
  const validation=validateTransferPart(part);
  if(!validation.ok){
    showOwnershipValidation(state,'failed',`Ændringen blev ikke udført: ${validation.failures.join(', ')}.`);
    return false;
  }
  const selected=state.zone.properties.id;
  state.config.document.partOwnership||={};
  if(selected===part.sourceZoneId)delete state.config.document.partOwnership[part.partId];
  else state.config.document.partOwnership[part.partId]={targetZoneId:selected,published:true,updatedAt:new Date().toISOString()};
  state.config.document.schemaVersion=4;state.config.document.updatedAt=new Date().toISOString();state.config.ownershipDirty=true;state.ownershipDirty=true;
  showOwnershipValidation(state,'passed',`Godkendt: ${part.name||part.partId} har geometri, land-/vandpunkt og DMI-gridbevis. Ændringen er klar til central gemning.`);
  return true;
}

function squaredDistance(a,b) {
  const dx=Number(a[0])-Number(b[0]),dy=Number(a[1])-Number(b[1]);
  return dx*dx+dy*dy;
}

function renderOwnershipStatus(state) {
  const box=document.querySelector('#coastlineOwnershipStatus');
  if(!box)return;
  const parts=ownershipParts(state.config),selected=state.zone.properties.id;
  const owned=parts.filter(part=>effectiveOwner(state.config,part)===selected&&!isDisabled(state.config,part));
  const changed=Object.keys(state.config.document.partOwnership||{}).length+Object.keys(state.config.document.disabledParts||{}).length;
  box.innerHTML=`<b>${owned.length} præcise kystdele tilhører ${esc(state.zone.properties.name||selected)}</b><span>${changed} gemte eller ventende flytning(er) i alt. Klik på en grå nabostrækning på kortet for at føje den til denne hovedzone.</span>`;
  const save=document.querySelector('#saveCoastlineOwnership');
  if(save)save.disabled=!state.ownershipDirty;
}

function drawOwnershipOverlay(state) {
  const parts=ownershipParts(state.config);
  if(!parts.length)return;
  const selected=state.zone.properties.id;
  const reference=[...state.line,...parts.filter(part=>effectiveOwner(state.config,part)===selected).flatMap(part=>geometryLines(part.geometry)).flat()];
  if(!reference.length)return;
  const lons=reference.map(point=>Number(point[0])),lats=reference.map(point=>Number(point[1]));
  const box={minLon:Math.min(...lons)-.22,maxLon:Math.max(...lons)+.22,minLat:Math.min(...lats)-.14,maxLat:Math.max(...lats)+.14};
  const relevant=part=>geometryLines(part.geometry).flat().some(([lon,lat])=>lon>=box.minLon&&lon<=box.maxLon&&lat>=box.minLat&&lat<=box.maxLat);
  const nearbyParts=parts.filter(relevant);
  for(const part of nearbyParts){
    const owner=effectiveOwner(state.config,part),disabled=isDisabled(state.config,part),isSelected=owner===selected&&!disabled;
    for(const line of geometryLines(part.geometry)){
      if(line.length<2)continue;
      const layer=addLayer(L.polyline(line.map(([lon,lat])=>[lat,lon]),{color:disabled?'#b7bec4':isSelected?'#ff7a2f':'#68737d',dashArray:disabled?'4 8':null,weight:isSelected?9:6,opacity:disabled ? .35 : (isSelected ? .92 : .55),interactive:true}));
      const ownerName=state.config.zones.find(zone=>zone.properties?.id===owner)?.properties?.name||owner;
      layer.bindTooltip(isSelected?`${part.name} · tilhører denne zone`:`${part.name} · tilhører ${ownerName} · klik for at flytte`);
      layer.on('click',event=>{
        L.DomEvent.stopPropagation(event);
        if(state.eraseMode){
          if(owner!==selected&&state.config.document.disabledParts?.[part.partId]?.previousZoneId!==selected)return;
          state.config.document.disabledParts||={};
          if(disabled)delete state.config.document.disabledParts[part.partId];
          else state.config.document.disabledParts[part.partId]={disabled:true,published:true,previousZoneId:owner,updatedAt:new Date().toISOString()};
          state.config.document.schemaVersion=4;state.config.document.updatedAt=new Date().toISOString();state.config.ownershipDirty=true;state.ownershipDirty=true;
          drawMap(state);renderOwnershipStatus(state);return;
        }
        if(isSelected||disabled)return;
        if(!confirm(`Flyt kystdelen “${part.name}” fra ${ownerName} til ${state.zone.properties.name||selected}?`))return;
        assignPartToSelectedZone(state,part);
        drawMap(state);renderOwnershipStatus(state);
      });
    }
  }

  const owned=parts.filter(part=>effectiveOwner(state.config,part)===selected&&!isDisabled(state.config,part));
  const ownedPoints=owned.flatMap(part=>geometryLines(part.geometry).flat());
  const guideEnds=[state.line[0],state.line.at(-1)].filter(Boolean);
  for(const guide of guideEnds){
    const endpoint=ownedPoints.reduce((best,point)=>!best||squaredDistance(point,guide)<squaredDistance(best,guide)?point:best,null);
    if(!endpoint)continue;
    const handle=addLayer(L.marker([endpoint[1],endpoint[0]],{draggable:true,icon:L.divIcon({className:'coastline-boundary-handle',html:'<span>↔</span>',iconSize:[34,34],iconAnchor:[17,17]})}));
    handle.bindTooltip('Træk zoneenden hen på den præcise nabokyst');
    handle.on('dragend',event=>{
      const ll=event.target.getLatLng(),drop=[ll.lng,ll.lat];
      const candidates=nearbyParts.filter(part=>effectiveOwner(state.config,part)!==selected&&!isDisabled(state.config,part));
      const nearest=candidates.map(part=>({part,distance:Math.min(...geometryLines(part.geometry).flat().map(point=>squaredDistance(point,drop)))})).sort((a,b)=>a.distance-b.distance)[0];
      if(!nearest||nearest.distance>.000025){drawMap(state);return;}
      const owner=effectiveOwner(state.config,nearest.part),ownerName=state.config.zones.find(zone=>zone.properties?.id===owner)?.properties?.name||owner;
      if(confirm(`Udvid ${state.zone.properties.name||selected} med kystdelen “${nearest.part.name}” fra ${ownerName}?`))assignPartToSelectedZone(state,nearest.part);
      drawMap(state);renderOwnershipStatus(state);
    });
  }
}

function drawMap(state, { fit = false } = {}) {
  if (!editorMap || !window.L) return;
  clearLayers();
  const originalLatLngs = state.original.map(([lon, lat]) => [lat, lon]);
  const editedLatLngs = state.line.map(([lon, lat]) => [lat, lon]);
  addLayer(L.polyline(originalLatLngs, { color:'#d8a232', weight:5, opacity:.55, dashArray:'8 8', interactive:false }));
  addLayer(L.polyline(editedLatLngs, { color:'#5ee093', weight:7, opacity:1, interactive:false }));
  drawOwnershipOverlay(state);

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
    config,
    zone,
    original: cloneLine(zone.properties.coastLine || []),
    line: cloneLine(override?.coastLine || zone.properties.coastLine || []),
    anchors: [],
    undo: [],
    redo: [],
    note: override?.note || '',
    disabled: override?.disabled === true,
    dirty: false,
    ownershipDirty:Boolean(config.ownershipDirty),
    eraseMode:false
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
  renderOwnershipStatus(activeState);
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
  const selectedId = config.selectedZoneId || config.zones[0]?.properties?.id;
  const effectiveName = zone => String(config.document.overrides?.[zone.properties?.id]?.published === true
    ? (config.document.overrides[zone.properties.id].zoneName || zone.properties?.name || zone.properties?.id)
    : (zone.properties?.name || zone.properties?.id));
  const filteredOptions = (selected, query='') => {
    const needle=query.trim().toLowerCase();
    return config.zones.filter(zone => !needle || `${zone.properties?.id} ${effectiveName(zone)} ${zone.properties?.region||''}`.toLowerCase().includes(needle))
      .map(zone => `<option value="${esc(zone.properties.id)}" ${zone.properties.id===selected?'selected':''}>${esc(effectiveName(zone))}</option>`).join('');
  };

  content.innerHTML = `
    <article class="admin-card coastline-editor-intro">
      <div class="rule-card-head"><div><h2>Rediger kystlinjer og zonegrænser</h2><p>Flyt de præcise kystdele mellem hovedzoner for at gøre en zone længere eller kortere. Kystlinje, målepunkter og vejrdata bliver sammen. Den grønne linje nedenfor er kun zonens fallback-/referencelinje.</p></div><span class="badge active">Central gemning</span></div>
      <div class="workflow-path"><div><b>1. Vælg zone</b><span>Søg på navn, område eller ID</span></div><div><b>2. Flyt kystdele</b><span>Klik på nabozonens grå stykker</span></div><div><b>3. Kontrollér</b><span>Ejerskab og data testes automatisk</span></div><div><b>4. Gem</b><span>Ændringen følger samlet gennem systemet</span></div></div>
    </article>
    <div class="coastline-editor-layout">
      <article class="admin-card coastline-editor-panel">
        <label>Søg zone<input id="coastlineSearch" placeholder="Navn, område eller zone-ID"></label>
        <label>Zone<select id="coastlineZone">${filteredOptions(selectedId)}</select></label>
        <div id="coastlineNoMatches" class="status-warning" hidden>Ingen zoner matcher søgningen.</div>
        <label>Zonenavn<input id="coastlineZoneName" maxlength="120" placeholder="Zonens navn"></label>
        <div id="coastlineZoneStatus"></div>
        <fieldset class="coastline-tools"><legend>Flyt hovedzonens grænse</legend>
          <p>De orange strækninger tilhører den valgte hovedzone. Grå strækninger tilhører nabozoner. Klik på en grå strækning for at flytte hele den præcise kystdel med dens landpunkt, vandpunkt og vejrdata til den valgte zone.</p>
          <p>Hvis en zone skal gøres kortere, vælger du først den hovedzone, som skal overtage stykket, og klikker derefter på stykket.</p>
          <div id="coastlineOwnershipStatus" class="coastline-ownership-status" aria-live="polite"></div>
          <div id="coastlineOwnershipValidation" class="coastline-validation-status" role="status" aria-live="assertive">Ingen ændring afventer validering.</div>
          <div class="toolbar"><button id="coastlineExtendMode" class="admin-button secondary active" type="button">Træk/udvid kyst</button><button id="coastlineEraseMode" class="admin-button danger" type="button">Viskelæder</button><button id="saveCoastlineOwnership" class="admin-button" disabled>Gem kyst og zonegrænser</button></div>
          <p class="hint">Redigér den præcise kyststreg. Zonestregen følger automatisk med. Viskelæderet fjerner en hel kontrolleret kystdel med dens punkt- og DMI-tilknytning og kan gendannes ved at klikke på den stiplede linje igen.</p>
          <p id="coastlineOwnershipSaveStatus" class="hint">Intet offentliggøres, før ændringen er gemt centralt og har bestået produktionskontrollen.</p>
        </fieldset>
        <fieldset class="coastline-tools"><legend>Fallback-/referencelinje</legend>
          <p><b>Grønne punkter:</b> træk dem. <b>Blå punkter:</b> klik for at indsætte. Dobbeltklik på et grønt punkt for at slette det.</p>
          <div class="coastline-mode-switch"><button type="button" id="coastlineNavigateMode" class="admin-button secondary active">Flyt kort</button><button type="button" id="coastlinePreciseMode" class="admin-button secondary">Præcis redigering</button></div>
          <label class="switch-line"><input id="coastlineAnchorMode" type="checkbox"> Sæt strandmarkører ved klik på kortet</label>
          <label>Påvirk nabopunkter<select id="coastlineAnchorRadius"><option value="0">Kun nærmeste punkt</option><option value="1">1 punkt på hver side</option><option value="2" selected>2 punkter på hver side</option><option value="3">3 punkter på hver side</option><option value="5">5 punkter på hver side</option></select></label>
          <p class="hint">En strandmarkør flytter nærmeste linjepunkt til markøren og former nabopunkterne gradvist. Det giver en blød linje uden at flytte hele zonen.</p>
        </fieldset>
        <div class="toolbar"><button id="coastlineUndo" class="admin-button secondary">Fortryd</button><button id="coastlineRedo" class="admin-button secondary">Gentag</button><button id="coastlineReset" class="admin-button danger">Nulstil zonen</button></div>
        <label>Notat om rettelsen<textarea id="coastlineNote" placeholder="Fx: følger stranden nord om havnemolen"></textarea></label>
        <div id="coastlineMetrics" class="direction-checks"></div>
        <div id="coastlineIssues" aria-live="polite"></div>
        <div class="toolbar"><button id="saveCoastlineDraft" class="admin-button">Gem ændringer</button></div>
        <p id="coastlineSaveStatus" class="hint" aria-live="polite">Denne grønne linje bruges som zonens fallback/reference. Brug de orange og grå kystdele ovenfor, når selve hovedzonens længde skal ændres.</p>
      </article>
      <article class="admin-card coastline-map-card">
        <div class="coastline-map-legend"><span><i class="line original"></i> Projektets linje</span><span><i class="line edited"></i> Redigeret linje</span><span><i class="dot insert"></i> Indsæt punkt</span><span><i class="diamond">◆</i> Strandmarkør</span></div>
        <div id="coastlineEditorMap" class="coastline-editor-map"></div>
      </article>
    </div>`;

  editorMap = L.map('coastlineEditorMap', {zoomControl:true}).setView([56.2, 10.2], 8);
  const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:20, attribution:'&copy; OpenStreetMap-bidragsydere'});
  const satellite = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:20, attribution:'Imagery &copy; Esri, Maxar'}).addTo(editorMap);
  L.control.layers({'Satellit':satellite,'Standardkort':street}, null, {collapsed:false}).addTo(editorMap);

  const originalSelectZone = selectZone;
  const selectAndSync = zoneId => {
    originalSelectZone(config, zoneId);
    if (!activeState) return;
    const override=config.document.overrides?.[zoneId];
    document.querySelector('#coastlineZoneName').value = override?.published === true ? (override.zoneName || activeState.zone.properties?.name || '') : (activeState.zone.properties?.name || '');
    document.querySelector('#coastlineZoneStatus').innerHTML = override?.published === true
      ? `<span class="badge active">Gemt centralt ${esc(new Date(override.updatedAt).toLocaleString('da-DK'))}</span>`
      : '<span class="badge">Aktuel projektgeometri</span>';
    config.onZoneSelected?.(zoneId);
  };

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
    const previous=activeState?.zone?.properties?.id || select.value;
    const html=filteredOptions(previous,event.target.value);
    select.innerHTML=html;
    const noMatches=document.querySelector('#coastlineNoMatches');
    noMatches.hidden=Boolean(select.options.length);
    if (!select.options.length) { clearLayers(); return; }
    const nextId=[...select.options].some(option=>option.value===previous)?previous:select.options[0].value;
    select.value=nextId;
    if (nextId !== activeState?.zone?.properties?.id) {
      if (activeState?.dirty && !confirm('Der er ændringer, som ikke er gemt. Skift zone og kassér dem?')) {
        event.target.value='';
        select.innerHTML=filteredOptions(previous,'');
        select.value=previous;
        return;
      }
      selectAndSync(nextId);
    } else {
      drawMap(activeState,{fit:true});
    }
  });
  document.querySelector('#coastlineZone').addEventListener('change', event => {
    if (activeState?.dirty && !confirm('Der er ændringer, som ikke er gemt. Skift zone og kassér dem?')) { event.target.value = activeState.zone.properties.id; return; }
    selectAndSync(event.target.value);
  });
  document.querySelector('#coastlineZoneName').addEventListener('input',()=>{if(activeState)activeState.dirty=true;});
  document.querySelector('#coastlineExtendMode').onclick=()=>{if(!activeState)return;activeState.eraseMode=false;document.querySelector('#coastlineExtendMode').classList.add('active');document.querySelector('#coastlineEraseMode').classList.remove('active');drawMap(activeState);};
  document.querySelector('#coastlineEraseMode').onclick=()=>{if(!activeState)return;activeState.eraseMode=true;document.querySelector('#coastlineEraseMode').classList.add('active');document.querySelector('#coastlineExtendMode').classList.remove('active');drawMap(activeState);};
  document.querySelector('#saveCoastlineOwnership').addEventListener('click',async()=>{
    if(!activeState?.ownershipDirty)return;
    const button=document.querySelector('#saveCoastlineOwnership'),status=document.querySelector('#coastlineOwnershipSaveStatus');
    button.disabled=true;button.textContent='Gemmer…';status.textContent='Gemmer centralt og kontrollerer readback…';
    const result=await config.onSave(config.document,null);
    button.textContent='Gem nye zonegrænser';
    if(!result?.ok){button.disabled=false;status.className='status-bad';status.textContent=`Zonegrænserne kunne ikke gemmes: ${result?.error||'ukendt fejl'}`;return;}
    config.document=result.document||config.document;config.ownershipDirty=false;activeState.config.document=config.document;activeState.ownershipDirty=false;
    status.className='status-good';status.textContent='Gemt centralt. Den flyttede del havde et gyldigt DMI-gridbevis; produktionskontrollen gentager kontrollen før offentliggørelse.';
    renderOwnershipStatus(activeState);drawMap(activeState);
  });

  // The following mode controls are intentionally preserved unchanged.
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
    document.querySelector('#coastlineZoneName').value=activeState.zone.properties?.name||'';
    drawMap(activeState); renderMetrics(activeState);
  });
  document.querySelector('#saveCoastlineDraft').addEventListener('click', async () => {
    if (!activeState) return;
    const validation = validateCoastLine(activeState.line, activeState.original);
    if (!validation.valid) return alert('Linjen kan ikke gemmes, før geometri-fejlene er rettet.');
    const zoneName=document.querySelector('#coastlineZoneName').value.trim();
    if (!zoneName) return alert('Zonen skal have et navn.');
    const button=document.querySelector('#saveCoastlineDraft');
    const status=document.querySelector('#coastlineSaveStatus');
    button.disabled=true;button.textContent='Gemmer…';status.textContent='Gemmer centralt og kontrollerer readback…';
    const override = createOverride(activeState.zone, activeState.line, document.querySelector('#coastlineNote').value, zoneName);
    config.document.overrides[override.zoneId] = override;
    config.document.schemaVersion=4;
    config.document.updatedAt = new Date().toISOString();
    const result=await config.onSave(config.document,override);
    button.disabled=false;button.textContent='Gem ændringer';
    if (!result?.ok) { status.className='status-bad';status.textContent=`Ændringen kunne ikke gemmes centralt: ${result?.error||'ukendt fejl'}. Den er sikret lokalt og kan forsøges igen.`; return; }
    activeState.zone.properties.name=zoneName;
    activeState.dirty = false;
    status.className='status-good';status.textContent='Fallback-/referencelinjen og zonenavnet er gemt centralt og verificeret.';
    const search=document.querySelector('#coastlineSearch').value;
    document.querySelector('#coastlineZone').innerHTML=filteredOptions(override.zoneId,search);
    document.querySelector('#coastlineZone').value=override.zoneId;
    selectAndSync(override.zoneId);
  });

  selectAndSync(selectedId);
  setTimeout(() => editorMap?.invalidateSize(), 0);
}
