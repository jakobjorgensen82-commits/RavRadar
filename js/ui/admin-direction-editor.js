const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const norm=value=>((Number(value)%360)+360)%360;

function bearing(from,to){
  const [lon1,lat1]=from.map(value=>Number(value)*Math.PI/180),[lon2,lat2]=to.map(value=>Number(value)*Math.PI/180);
  const y=Math.sin(lon2-lon1)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);
  return norm(Math.atan2(y,x)*180/Math.PI);
}
function directionLabel(value){const labels=['N','NØ','Ø','SØ','S','SV','V','NV'],degrees=Math.round(norm(value));return `${labels[Math.round(degrees/45)%8]} ${degrees}°`;}
function distanceKm(a,b){if(!a||!b)return null;const R=6371,[lon1,lat1]=a.map(x=>Number(x)*Math.PI/180),[lon2,lat2]=b.map(x=>Number(x)*Math.PI/180),dLat=lat2-lat1,dLon=lon2-lon1,h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function validPoint(point){return Array.isArray(point)&&point.length>=2&&point.every(Number.isFinite)&&point[0]>=7&&point[0]<=16&&point[1]>=54&&point[1]<=58.5;}
function geometryLines(geometry){if(geometry?.type==='LineString')return[geometry.coordinates||[]];if(geometry?.type==='MultiLineString')return geometry.coordinates||[];return[];}
function projected(point,latitude){return [point[0]*111.32*Math.cos(latitude*Math.PI/180),point[1]*111.32];}
export function pairGeometryCheck(part){
  if(!validPoint(part?.waterPoint)||!validPoint(part?.landPoint))return{valid:false,message:'Land- eller havpunkt mangler.'};
  const latitude=(part.waterPoint[1]+part.landPoint[1])/2,water=projected(part.waterPoint,latitude),land=projected(part.landPoint,latitude),pair=[land[0]-water[0],land[1]-water[1]],pairLength=Math.hypot(...pair);
  if(pairLength<.05||pairLength>8)return{valid:false,message:'Afstanden mellem punkterne skal være 0,05–8 km.'};
  let best=null;
  for(const line of geometryLines(part.geometry))for(let index=1;index<line.length;index++){
    const a=projected(line[index-1],latitude),b=projected(line[index],latitude),segment=[b[0]-a[0],b[1]-a[1]],lengthSquared=segment[0]**2+segment[1]**2;
    if(!lengthSquared)continue;
    const t=Math.max(0,Math.min(1,((water[0]-a[0])*segment[0]+(water[1]-a[1])*segment[1])/lengthSquared)),coast=[a[0]+t*segment[0],a[1]+t*segment[1]],u=Math.max(0,Math.min(1,((coast[0]-water[0])*pair[0]+(coast[1]-water[1])*pair[1])/(pairLength**2))),crossing=[water[0]+u*pair[0],water[1]+u*pair[1]],distance=Math.hypot(coast[0]-crossing[0],coast[1]-crossing[1]);
    if(!best||distance<best.distance)best={distance,segment,coast};
  }
  if(!best||best.distance>.08)return{valid:false,message:'Punktlinjen rammer ikke den valgte kyststrækning præcist.'};
  const tangentLength=Math.hypot(...best.segment),cos=Math.abs((pair[0]*best.segment[0]+pair[1]*best.segment[1])/(pairLength*tangentLength)),angleFromPerpendicular=Math.asin(Math.min(1,cos))*180/Math.PI,waterSide=best.segment[0]*(water[1]-best.coast[1])-best.segment[1]*(water[0]-best.coast[0]),landSide=best.segment[0]*(land[1]-best.coast[1])-best.segment[1]*(land[0]-best.coast[0]);
  if(waterSide*landSide>=0)return{valid:false,message:'Land- og havpunkt ligger ikke på hver sin side af kysten.'};
  if(angleFromPerpendicular>20)return{valid:true,warning:true,message:`Lokal vinkelafvigelse ${Math.round(angleFromPerpendicular)}°. Målingen er kun vejledende og blokerer ikke godkendelsen.`};
  return{valid:true,warning:false,message:`Lokalt kystkryds kontrolleret · vinkelafvigelse ${Math.round(angleFromPerpendicular)}°.`};
}
function reviewParts(parts,review){
  const overrides=review?.partOverrides||{};
  return parts.map(part=>{const saved=overrides[part.partId]||{};return{...structuredClone(part),name:saved.name||part.name,landPoint:structuredClone(saved.landPoint||part.landPoint),waterPoint:structuredClone(saved.waterPoint||part.waterPoint),onshoreDirectionDeg:norm(saved.onshoreDirectionDeg??part.onshoreDirectionDeg),verified:Boolean(saved.verified)};});
}

export function createDirectionEditor(host,{zones,coastalParts,reviews,saveNow,saveDraft}){
  let map=null,layers=[],selectedZoneId=null,selectedPartId=null,currentParts=[],focusRequested=false;
  const active=zones.filter(feature=>feature.properties?.zoneStatus==='active'&&Array.isArray(coastalParts.zones?.[feature.properties?.id])&&coastalParts.zones[feature.properties.id].length);
  const verifiedCount=active.filter(feature=>reviews[feature.properties.id]?.status==='verified').length;
  host.innerHTML=`<article class="admin-card direction-intro"><div class="rule-card-head"><div><h2>Land- og havpunkter for kyststrækninger</h2><p>Søg efter en hovedzone. Kortet viser hele zonen og alle de præcise kyststrækninger, som hører til den.</p></div><span class="badge">${verifiedCount}/${active.length} zoner godkendt</span></div><p><b>Blå</b> markører er havpunkter. <b>Grønne</b> markører er landpunkter. Vælg en kyststrækning i listen, og træk dens eksisterende markører til de rigtige placeringer.</p><p class="hint">En kladde påvirker ikke RavRadar. Først når zonen godkendes og den centrale gemning er læst tilbage, tages ændringen med i næste DMI-validering og deployment.</p></article>
  <div class="direction-layout"><article class="admin-card direction-queue"><div class="toolbar"><input id="directionSearch" placeholder="Søg efter zone eller kyststrækning"><select id="directionFilter"><option value="pending">Ikke godkendte først</option><option value="uncertain">Kun mistænkelige</option><option value="verified">Kun godkendte</option><option value="all">Alle zoner</option></select></div><div id="directionZoneList" class="direction-zone-list"></div></article>
  <article class="admin-card direction-work"><div id="directionEmpty" class="empty">Vælg en zone i listen.</div><div id="directionEditor" hidden><div class="rule-card-head"><div><span id="directionStatus" class="badge"></span><h2 id="directionName"></h2><p id="directionMeta" class="muted"></p></div></div><div id="directionMap" class="direction-map"></div><div class="direction-legend"><span><i class="dot sea"></i> Flytbart havpunkt</span><span><i class="dot land"></i> Flytbart landpunkt</span><span><i class="line coast"></i> Valgt kyststrækning</span><span><i class="line arrow"></i> Hav → land</span></div><section class="anchor-manager"><h3>Kyststrækninger i zonen</h3><div id="directionPartList" class="anchor-tabs"></div></section><section id="directionPartEditor" class="admin-card inset-card"><h3 id="directionPartName"></h3><p id="directionPartId" class="hint"></p><div class="toolbar"><button id="calculateDirection" class="admin-button secondary">Beregn hav → land</button></div><div class="direction-controls"><label>Pålandsretning <strong id="directionValue"></strong><input id="directionRange" type="range" min="0" max="359" step="1" disabled></label><label>Beregnet grad<input id="directionNumber" type="number" min="0" max="359" step="1" disabled></label></div><p class="hint">Retningen beregnes altid fra det blå havpunkt til det grønne landpunkt. Flyt punkterne for at ændre retningen.</p><div id="directionChecks" class="direction-checks"></div></section><fieldset class="direction-confirmations"><legend>Bekræft hele zonen</legend><label><input id="directionConfirmSea" type="checkbox"> Alle blå punkter ligger i havet</label><label><input id="directionConfirmLand" type="checkbox"> Alle grønne punkter ligger ved deres kyst/land</label><label><input id="directionConfirmArrow" type="checkbox"> Alle retninger peger fra hav mod land</label></fieldset><p id="directionApprovalStatus" class="hint"></p><label>Bemærkning<textarea id="directionNote" placeholder="Skriv hvis noget kræver senere kontrol."></textarea></label><div class="direction-actions"><button id="directionFlag" class="admin-button secondary">Kræver senere kontrol</button><button id="directionApprove" class="admin-button" disabled>Godkend og gem centralt</button></div></div></article></div>`;
  const list=host.querySelector('#directionZoneList');
  const risk=feature=>{const id=feature.properties.id,parts=coastalParts.zones[id]||[],review=reviews[id];if(review?.status==='verified')return 99;if(parts.some(part=>!validPoint(part.waterPoint)||!validPoint(part.landPoint)))return 0;if(parts.some(part=>{const d=distanceKm(part.waterPoint,part.landPoint);return d<.05||d>8;}))return 1;return 3;};
  const visible=()=>{const q=host.querySelector('#directionSearch').value.trim().toLocaleLowerCase('da'),filter=host.querySelector('#directionFilter').value;return active.filter(feature=>{const p=feature.properties,id=p.id,review=reviews[id],text=`${id} ${p.name} ${p.region} ${(coastalParts.zones[id]||[]).map(x=>x.name).join(' ')}`.toLocaleLowerCase('da');if(q&&!text.includes(q))return false;if(filter==='verified')return review?.status==='verified';if(filter==='uncertain')return risk(feature)<=1&&review?.status!=='verified';if(filter==='pending')return review?.status!=='verified';return true;}).sort((a,b)=>risk(a)-risk(b)||(a.properties.name||'').localeCompare(b.properties.name||'','da'));};
  const drawList=()=>{const rows=visible();list.innerHTML=rows.length?rows.map(feature=>{const p=feature.properties,review=reviews[p.id],count=(coastalParts.zones[p.id]||[]).length;return `<button class="direction-zone-row ${selectedZoneId===p.id?'selected':''}" data-zone-id="${esc(p.id)}"><span><b>${esc(p.name||p.id)}</b><small>${esc(p.id)} · ${count} kyststrækning${count===1?'':'er'}</small></span><span class="badge ${review?.status==='verified'?'active':review?.status==='flagged'?'draft':''}">${review?.status==='verified'?'Godkendt':review?.status==='flagged'?'Senere kontrol':'Ikke kontrolleret'}</span></button>`}).join(''):'<div class="empty">Ingen zoner matcher.</div>';list.querySelectorAll('[data-zone-id]').forEach(button=>button.onclick=()=>selectZone(button.dataset.zoneId));};
  const selectedPart=()=>currentParts.find(part=>part.partId===selectedPartId)||currentParts[0];
  const snapshot=verified=>Object.fromEntries(currentParts.map(part=>[part.partId,{partId:part.partId,name:part.name,landPoint:part.landPoint,waterPoint:part.waterPoint,onshoreDirectionDeg:Math.round(norm(part.onshoreDirectionDeg)),verified:Boolean(verified)}]));
  const persist=()=>{if(!selectedZoneId)return;reviews[selectedZoneId]={...(reviews[selectedZoneId]||{}),status:'draft',partOverrides:snapshot(false),note:host.querySelector('#directionNote').value.trim(),updatedAt:new Date().toISOString()};saveDraft(reviews);drawList();};
  const clearLayers=()=>{if(map)layers.forEach(layer=>map.removeLayer(layer));layers=[];};
  const add=layer=>{layer.addTo(map);layers.push(layer);return layer;};
  const redraw=()=>{if(!map)return;clearLayers();const feature=active.find(x=>x.properties.id===selectedZoneId),bounds=[];
    currentParts.forEach(part=>{geometryLines(part.geometry).forEach(line=>{if(line.length)bounds.push(...line.map(point=>[point[1],point[0]]));});[['waterPoint'],['landPoint']].forEach(([key])=>{const point=part[key];if(validPoint(point))bounds.push([point[1],point[0]]);});});
    if(bounds.length&&(focusRequested||!map._loaded)){map.fitBounds(L.latLngBounds(bounds).pad(.18),{maxZoom:14});focusRequested=false;}
    if(feature)add(L.geoJSON(feature.geometry,{style:{color:'#d8a232',weight:2,fillOpacity:.035,interactive:false}}));
    currentParts.forEach((part,index)=>{const selected=part.partId===selectedPartId;geometryLines(part.geometry).forEach(line=>{if(line.length){const latlngs=line.map(point=>[point[1],point[0]]),layer=add(L.polyline(latlngs,{color:selected?'#1261a0':'#72a7bd',weight:selected?7:3,opacity:selected?1:.65}));layer.bindTooltip(`${index+1}. ${esc(part.name)}`);layer.on('click',()=>{selectedPartId=part.partId;renderPartEditor();redraw();});}});
      if(validPoint(part.waterPoint)&&validPoint(part.landPoint)){
        const water=[part.waterPoint[1],part.waterPoint[0]],land=[part.landPoint[1],part.landPoint[0]];
        add(L.polyline([water,land],{color:selected?'#ff3f3f':'#ff7a7a',weight:selected?6:4,opacity:selected?1:.78,interactive:false}));
        add(L.circleMarker(land,{radius:selected?7:5,color:'#ff3f3f',weight:3,fillColor:'#ff3f3f',fillOpacity:1,interactive:false}).bindTooltip(`Pilen peger mod land · ${part.name}`));
      }
      [['waterPoint','sea','Havpunkt'],['landPoint','land','Landpunkt']].forEach(([key,kind,label])=>{const point=part[key];if(!validPoint(point))return;const marker=add(L.marker([point[1],point[0]],{draggable:selected,title:`${label}: ${part.name}`,icon:L.divIcon({className:'direction-point-icon',html:`<span class="direction-point ${kind} ${selected?'selected':''}">${index+1}</span>`,iconSize:[28,28],iconAnchor:[14,14]})}));marker.bindTooltip(`${label} · ${part.name}`);if(selected)marker.on('dragend',event=>{const ll=event.target.getLatLng();part[key]=[ll.lng,ll.lat];part.onshoreDirectionDeg=bearing(part.waterPoint,part.landPoint);persist();renderPartEditor();redraw();});});});};
  const redrawOrReport=()=>{try{redraw();}catch(error){host.dataset.mapError=error?.stack||error?.message||String(error);throw error;}};
  const updateApproval=()=>{const confirmations=['directionConfirmSea','directionConfirmLand','directionConfirmArrow'].every(id=>host.querySelector('#'+id).checked),checks=currentParts.map(part=>({part,check:pairGeometryCheck(part)})),blockers=checks.filter(row=>!row.check.valid),warnings=checks.filter(row=>row.check.warning),status=host.querySelector('#directionApprovalStatus');host.querySelector('#directionApprove').disabled=!(confirmations&&currentParts.length&&!blockers.length);status.className=`hint ${blockers.length?'status-bad':warnings.length?'status-warning':''}`;status.textContent=blockers.length?`Kan ikke godkendes endnu: ${blockers.map(row=>`${row.part.name}: ${row.check.message}`).join(' · ')}`:warnings.length?`Vinkelmålingen advarer for ${warnings.map(row=>row.part.name).join(', ')}. Den er kun vejledende; din manuelle helhedsvurdering afgør godkendelsen.`:confirmations?'Klar til godkendelse.':'Sæt de tre flueben, når du har kontrolleret hele zonen.';};
  const renderPartEditor=()=>{const part=selectedPart();if(!part)return;host.querySelector('#directionPartList').innerHTML=currentParts.map((item,index)=>`<button type="button" data-part-id="${esc(item.partId)}" class="anchor-tab ${item.partId===part.partId?'active':''}"><b>${index+1}. ${esc(item.name)}</b><small>${directionLabel(item.onshoreDirectionDeg)}</small></button>`).join('');host.querySelectorAll('[data-part-id]').forEach(button=>button.onclick=()=>{selectedPartId=button.dataset.partId;renderPartEditor();redraw();});host.querySelector('#directionPartName').textContent=part.name;host.querySelector('#directionPartId').textContent=part.partId;host.querySelector('#directionRange').value=Math.round(norm(part.onshoreDirectionDeg));host.querySelector('#directionNumber').value=Math.round(norm(part.onshoreDirectionDeg));host.querySelector('#directionValue').textContent=directionLabel(part.onshoreDirectionDeg);const d=distanceKm(part.waterPoint,part.landPoint),geometryCheck=pairGeometryCheck(part);host.querySelector('#directionChecks').innerHTML=`<div class="metric-card"><span>Havpunkt</span><strong>${validPoint(part.waterPoint)?part.waterPoint.map(x=>x.toFixed(5)).join(', '):'Mangler'}</strong></div><div class="metric-card"><span>Landpunkt</span><strong>${validPoint(part.landPoint)?part.landPoint.map(x=>x.toFixed(5)).join(', '):'Mangler'}</strong></div><div class="metric-card ${geometryCheck.valid&&!geometryCheck.warning?'':'warning'}"><span>Lokal kystvinkel (vejledende)</span><strong>${esc(geometryCheck.message)}</strong></div><div class="metric-card"><span>Hav → land</span><strong>${directionLabel(part.onshoreDirectionDeg)}</strong></div><div class="metric-card"><span>Afstand</span><strong>${d==null?'–':d.toFixed(2)+' km'}</strong></div>`;updateApproval();};
  const selectZone=id=>{
    selectedZoneId=id;
    focusRequested=true;
    const feature=active.find(x=>x.properties.id===id),review=reviews[id]||{};
    currentParts=reviewParts(coastalParts.zones[id]||[],review);
    selectedPartId=currentParts[0]?.partId;
    drawList();
    host.querySelector('#directionEmpty').hidden=true;
    host.querySelector('#directionEditor').hidden=false;
    host.querySelector('#directionName').textContent=feature.properties.name||id;
    host.querySelector('#directionMeta').textContent=`${id} · ${currentParts.length} kyststrækning${currentParts.length===1?'':'er'} · ${feature.properties.region||'Ukendt område'}`;
    host.querySelector('#directionStatus').textContent=review.status==='verified'?'Godkendt':review.status==='flagged'?'Kræver senere kontrol':'Ikke kontrolleret';
    host.querySelector('#directionNote').value=review.note||'';
    const confirmations=review.confirmations||{};
    host.querySelector('#directionConfirmSea').checked=Boolean(confirmations.seaPointInWater);
    host.querySelector('#directionConfirmLand').checked=Boolean(confirmations.landPointAtCoast);
    host.querySelector('#directionConfirmArrow').checked=Boolean(confirmations.arrowSeaToLand);
    if(!map){
      map=L.map(host.querySelector('#directionMap'),{zoomControl:true});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
    }
    map.invalidateSize();
    renderPartEditor();
    redrawOrReport();
    setTimeout(()=>{if(!map||selectedZoneId!==id)return;map.invalidateSize();focusRequested=true;redrawOrReport();},50);
    updateApproval();
  };
  const calculateDirection=()=>{const part=selectedPart();if(!part||!validPoint(part.waterPoint)||!validPoint(part.landPoint))return;part.onshoreDirectionDeg=bearing(part.waterPoint,part.landPoint);persist();renderPartEditor();redraw();};
  host.querySelector('#calculateDirection').onclick=calculateDirection;
  ['directionConfirmSea','directionConfirmLand','directionConfirmArrow'].forEach(id=>host.querySelector('#'+id).onchange=updateApproval);
  host.querySelector('#directionFlag').onclick=()=>{reviews[selectedZoneId]={...(reviews[selectedZoneId]||{}),status:'flagged',partOverrides:snapshot(false),note:host.querySelector('#directionNote').value.trim(),confirmations:{seaPointInWater:host.querySelector('#directionConfirmSea').checked,landPointAtCoast:host.querySelector('#directionConfirmLand').checked,arrowSeaToLand:host.querySelector('#directionConfirmArrow').checked},updatedAt:new Date().toISOString()};saveDraft(reviews);drawList();};
  host.querySelector('#directionApprove').onclick=async()=>{const button=host.querySelector('#directionApprove'),confirmations={seaPointInWater:true,landPointAtCoast:true,arrowSeaToLand:true};button.disabled=true;reviews[selectedZoneId]={...(reviews[selectedZoneId]||{}),status:'verified',partOverrides:snapshot(true),note:host.querySelector('#directionNote').value.trim(),confirmations,verifiedAt:new Date().toISOString()};try{await saveNow(reviews);host.querySelector('#directionStatus').textContent='Godkendt · afventer DMI-validering';drawList();alert('Land-/vandpunkterne er gemt centralt. Næste produktionskørsel validerer DMI-grid og giver besked, hvis ændringen ikke kan godkendes.');}catch(error){alert(error.message);updateApproval();}};
  host.querySelector('#directionSearch').oninput=drawList;host.querySelector('#directionFilter').onchange=drawList;drawList();const first=visible()[0];if(first)selectZone(first.properties.id);
  return()=>{clearLayers();if(map)map.remove();map=null;};
}
