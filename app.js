import { calculateRavScore } from "./js/core/score-engine.js";
import { loadConditions, loadZones } from "./js/services/data-service.js";
import { submitObservation, getLocalObservations } from "./js/services/observation-service.js";
import { predictAmberChance } from "./js/core/prediction-engine.js";
import { consumeAuthCallback } from "./js/services/auth-service.js";
import { activeTrip, answerTrip, pendingTripPrompt, resumeTripTracking, startTrip, stopTrip } from "./js/services/trip-service.js";
import { createMap, installFlowArrows, locateUser, refreshZoneStyles, renderZones } from "./js/map/map-view.js";
import { bindZoneInfoInteractions, showZoneInfo } from "./js/ui/info-panel.js";
import { openAccountDialog } from "./js/ui/account-panel.js";
import { openDeveloperDialog } from "./js/ui/developer-panel.js";
import { analyzeObservations } from "./js/services/learning-analysis.js";

const state = { mode:"waders", selectedZone:null, zoneLayer:null, zones:null, conditions:{ available:false,zones:{} }, lastGps:null, flowArrows:null };
const map = createMap("map");
const infoPanel = document.querySelector("#infoPanel"), dataStatus = document.querySelector("#dataStatus"), ranking = document.querySelector("#ranking");
const nationalForecast = document.querySelector("#nationalForecastContent");
const tripButton = document.querySelector("#tripButton");
const accountDialog=document.querySelector("#accountDialog"), developerDialog=document.querySelector("#developerDialog"), pinDialog=document.querySelector("#pinDialog"), tripDialog=document.querySelector("#tripDialog");

function zoneCondition(zone) { return state.conditions.zones?.[zone?.id] || {}; }
function resultFor(zone, weather = zoneCondition(zone).current || {}, history = zoneCondition(zone).history || {}) { const result=calculateRavScore({ mode:state.mode, zone, weather, history }); return {...result,prediction:predictAmberChance({baseScore:result.score,zone,weather,history,observations:getLocalObservations()})}; }
function selectedFeature() { return state.zones?.features.find(item=>item.properties.id===state.selectedZone?.id); }

function bindObservationForm() {
  const form=document.querySelector("#observationForm"); if(!form)return;
  form.addEventListener("submit",async event=>{ event.preventDefault(); const found=event.submitter?.value, status=document.querySelector("#observationStatus"); if(!found||!state.selectedZone)return; status.textContent="Gemmer…";
    try { const condition=zoneCondition(state.selectedZone); const data=new FormData(form); const observedDate=String(data.get("observedDate")||"");
      const response=await submitObservation({ zone:state.selectedZone,huntMode:state.mode,result:found,grams:data.get("grams"),observedAt:observedDate?`${observedDate}T12:00:00.000Z`:null,scoreResult:resultFor(state.selectedZone),weather:condition.current||{},gps:state.lastGps,tripId:activeTrip()?.id||null });
      const insight=analyzeObservations(); status.textContent=(response.stored==="local"?"Gemt sikkert på denne enhed.":"Gemt og synkroniseret.")+(insight.status==="ready"?` Modellen har nu ${insight.sampleSize} observationer til analyse.`:""); form.querySelectorAll("button").forEach(button=>button.disabled=true); }
    catch(error){status.textContent=error.message;}
  });
}

function renderSelectedZone() {
  if(!state.selectedZone)return;
  const condition=zoneCondition(state.selectedZone), result=resultFor(state.selectedZone);
  showZoneInfo(infoPanel,state.selectedZone,result,condition.current||{},state.mode,{ forecast:condition.forecast,history:condition.history||{} });
  bindZoneInfoInteractions(infoPanel,state.selectedZone,state.mode,condition.history||{});
  infoPanel.querySelector("[data-close-zone]")?.addEventListener("click", closeZone);
  bindObservationForm();
}

function openZone(zone,{scroll=true}={}) {
  state.selectedZone=zone;
  state.zoneLayer?.selectZone?.(zone.id);
  document.body.classList.add("zone-focus");
  const point=zone.pinPoint||zone.dataPoint;
  if(point) map.setView([point[1],point[0]],Math.max(map.getZoom(),10));
  renderSelectedZone();
  requestAnimationFrame(()=>map.invalidateSize());
  if(scroll) infoPanel.scrollIntoView({behavior:"smooth",block:"start"});
}

function closeZone() {
  state.selectedZone=null;
  state.zoneLayer?.selectZone?.(null);
  document.body.classList.remove("zone-focus");
  infoPanel.innerHTML='<div class="empty-state"><h2>Vælg et område på kortet</h2><p>Du får RavScore, forklaring og de vigtigste forhold for den valgte jagtform.</p></div>';
  requestAnimationFrame(()=>map.invalidateSize());
  document.querySelector("#map")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function renderRanking() {
  if(!state.zones)return;
  const rows=state.zones.features.map(feature=>({zone:feature.properties,result:resultFor(feature.properties)})).filter(item=>item.result.available).sort((a,b)=>b.result.score-a.result.score).slice(0,5);
  ranking.innerHTML=rows.length?rows.map((item,index)=>`<button class="ranking-item" type="button" data-zone-id="${item.zone.id}"><span class="rank">${index+1}</span><span><strong>${item.zone.name}</strong><small>${item.zone.region}</small></span><b class="rank-score ${item.result.level}">${item.result.score}</b></button>`).join(""):`<p class="ranking-empty">Ranglisten vises, når vejrdata er hentet.</p>`;
  ranking.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>openZone(state.zones.features.find(item=>item.properties.id===button.dataset.zoneId).properties)));
}

function groupHours(forecast) {
  const groups=new Map(); for(const hour of forecast?.hourly||[]){const date=String(hour.time||"").slice(0,10);if(!date)continue;if(!groups.has(date))groups.set(date,[]);groups.get(date).push(hour);} return [...groups.entries()].slice(0,5).map(([date,hours])=>({date,hours}));
}
function bestForDay(zone,date) {
  const condition=zoneCondition(zone), day=groupHours(condition.forecast).find(item=>item.date===date); if(!day)return null;
  const scored=day.hours.map(hour=>({hour,result:resultFor(zone,hour,condition.history||{})})).filter(item=>item.result.available).sort((a,b)=>b.result.score-a.result.score);
  if(!scored.length)return null;
  if(state.mode!=="waders")return {...scored[0],recommended:true};
  const levels=day.hours.map(hour=>Number(hour.waterLevelCm)).filter(Number.isFinite);
  if(!levels.length)return {...scored[0],recommended:false};
  const min=Math.min(...levels),max=Math.max(...levels),lowThreshold=min+(max-min)*0.4;
  const suitable=scored.filter(({hour})=>{
    const level=Number(hour.waterLevelCm),trend=Number(hour.waterLevelTrendCm3h);
    return Number.isFinite(level)&&level<=lowThreshold&&(Number.isFinite(trend)?trend<=0:true);
  });
  return suitable.length?{...suitable[0],recommended:true}:{...scored[0],recommended:false};
}
function renderNationalForecast() {
  if(!state.zones)return;
  const dates=[...new Set(state.zones.features.flatMap(f=>groupHours(zoneCondition(f.properties).forecast).map(day=>day.date)))].sort().slice(0,5);
  if(!dates.length){nationalForecast.innerHTML='<p class="ranking-empty">5-dages prognosen bliver vist efter næste vejr-opdatering.</p>';return;}
  const data=dates.map(date=>({date,rows:state.zones.features.map(f=>{const best=bestForDay(f.properties,date);return best?{zone:f.properties,...best}:null;}).filter(Boolean).sort((a,b)=>b.result.score-a.result.score).slice(0,5)}));
  nationalForecast.innerHTML=`<div class="day-tabs national-day-tabs" role="tablist">${data.map((day,index)=>`<button type="button" class="national-day-tab ${index===0?"active":""}" data-day-index="${index}"><span>${new Intl.DateTimeFormat("da-DK",{weekday:"short"}).format(new Date(`${day.date}T12:00:00`)).replace(".","")}</span><small>${new Intl.DateTimeFormat("da-DK",{day:"numeric",month:"short"}).format(new Date(`${day.date}T12:00:00`)).replace(".","")}</small></button>`).join("")}</div><div class="national-forecast-list"></div>`;
  const list=nationalForecast.querySelector(".national-forecast-list");
  const render=index=>{nationalForecast.querySelectorAll(".national-day-tab").forEach((button,i)=>button.classList.toggle("active",i===index)); const rows=data[index].rows; list.innerHTML=rows.length?rows.map((item,i)=>`<button type="button" class="national-zone-row" data-zone-id="${item.zone.id}"><span class="rank">${i+1}</span><span><strong>${item.zone.name}</strong><small>${item.recommended?`Bedste tidspunkt ca. ${new Intl.DateTimeFormat("da-DK",{hour:"2-digit",minute:"2-digit"}).format(new Date(item.hour.time))}`:"Se timeprognosen for vandstand og forhold"}</small></span><b class="rank-score ${item.result.level}">${item.result.score}</b></button>`).join(""):'<p class="ranking-empty">Ingen prognosedata for dagen.</p>'; list.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>openZone(state.zones.features.find(f=>f.properties.id===button.dataset.zoneId).properties)));};
  nationalForecast.querySelectorAll(".national-day-tab").forEach((button,index)=>button.addEventListener("click",()=>render(index))); render(0);
}

function setMode(mode){state.mode=mode;localStorage.setItem("ravradar-mode",mode);document.querySelectorAll(".mode-button").forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});if(state.zoneLayer)refreshZoneStyles(state.zoneLayer,id=>resultFor(state.zones.features.find(item=>item.properties.id===id).properties));renderRanking();renderNationalForecast();renderSelectedZone();}
function updateTripUi(){const trip=activeTrip();tripButton.textContent=trip?"Afslut tur":"Start ravtur";tripButton.classList.toggle("trip-active",Boolean(trip));tripButton.setAttribute("aria-pressed",String(Boolean(trip)));document.querySelector("#tripStatus").textContent=trip?"Ravtur i gang. GPS registreres kun, mens appen er åben.":"";}
function openTripPrompt(trip){
  const zones=(state.zones?.features||[]).map(feature=>feature.properties).sort((a,b)=>a.name.localeCompare(b.name,"da"));
  const defaultDate=String(trip.endedAt||trip.startedAt||new Date().toISOString()).slice(0,10);
  tripDialog.querySelector(".dialog-content").innerHTML=`<h2>Fandt du rav på din tur?</h2><p>For at gøre RavRadar bedre sammenholder vi dit svar med de vejr-, vandstands- og prognosedata, der gjaldt på den valgte dato og i den valgte zone.</p><form id="tripAnswerForm" class="stack-form"><label>Dato for ravjagten<input name="observedDate" type="date" required value="${defaultDate}" max="${new Date().toISOString().slice(0,10)}"></label><label>Zone<select name="zoneId" required><option value="">Vælg zone</option>${zones.map(zone=>`<option value="${zone.id}">${zone.name} · ${zone.region}</option>`).join("")}</select></label><label>Valgfrit antal gram<input name="grams" type="number" min="0" max="10000" step="0.1" inputmode="decimal"></label><div class="trip-answer-buttons"><button name="response" value="no">Nej</button><button name="response" value="yes">Ja</button><button name="response" value="much">Meget</button></div><p class="form-status" id="tripAnswerStatus"></p></form>`;
  tripDialog.showModal();
  tripDialog.querySelector("#tripAnswerForm").addEventListener("submit",async event=>{
    event.preventDefault(); const form=event.currentTarget, data=new FormData(form), response=event.submitter?.value, zone=zones.find(item=>item.id===data.get("zoneId"));
    if(!response||!zone){form.querySelector("#tripAnswerStatus").textContent="Vælg både zone og svar.";return;}
    const observedDate=String(data.get("observedDate")); const condition=zoneCondition(zone); const weather=condition.current||{}; const scoreResult=resultFor(zone,weather,condition.history||{});
    answerTrip(trip.id,response,data.get("grams"),{observedDate,zoneId:zone.id,zoneName:zone.name});
    try{await submitObservation({zone,huntMode:state.mode,result:response==="no"?"none":response==="much"?"good":"medium",grams:data.get("grams"),observedAt:`${observedDate}T12:00:00.000Z`,scoreResult,weather,gps:trip.points?.at(-1)||null,tripId:trip.id});}catch(error){console.warn("Tursvar blev gemt lokalt",error);}
    tripDialog.close();
  });
}
function enableDialogClose(dialog){dialog.querySelector(".dialog-close")?.addEventListener("click",()=>dialog.close());dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});}
[accountDialog,developerDialog,pinDialog,tripDialog].forEach(enableDialogClose);

document.querySelectorAll(".mode-button").forEach(button=>button.addEventListener("click",()=>setMode(button.dataset.mode)));
document.querySelector("#locateButton").addEventListener("click",()=>locateUser(map,()=>alert("Din position kunne ikke hentes. Kontroller browserens tilladelse til placering."),position=>{state.lastGps={lat:position.latitude,lng:position.longitude,accuracy:position.accuracy,at:new Date().toISOString()};}));
document.querySelector("#accountButton").addEventListener("click",()=>openAccountDialog(accountDialog));
tripButton.addEventListener("click",()=>{if(activeTrip())stopTrip();else startTrip();updateTripUi();});
let logoTaps=0,tapTimer=null;document.querySelector("#logoButton").addEventListener("click",()=>{logoTaps+=1;clearTimeout(tapTimer);tapTimer=setTimeout(()=>{logoTaps=0;},5000);if(logoTaps>=10){logoTaps=0;pinDialog.showModal();pinDialog.querySelector("input").focus();}});
document.querySelector("#pinForm").addEventListener("submit",event=>{event.preventDefault();const pin=new FormData(event.currentTarget).get("pin");if(pin!=="1931"){document.querySelector("#pinStatus").textContent="Forkert PIN.";return;}pinDialog.close();event.currentTarget.reset();document.querySelector("#pinStatus").textContent="";openDeveloperDialog(developerDialog,state);});

try {await consumeAuthCallback();const [zones,conditions]=await Promise.all([loadZones(),loadConditions()]);state.zones=zones;state.conditions=conditions;state.zoneLayer=renderZones(map,zones,id=>resultFor(zones.features.find(item=>item.properties.id===id).properties),zone=>openZone(zone,{scroll:false}));state.flowArrows=installFlowArrows(map,zones,id=>state.conditions.zones?.[id]||{});setMode(localStorage.getItem("ravradar-mode")==="beach"?"beach":"waders");if(conditions.available&&conditions.generatedAt){const timestamp=new Date(conditions.generatedAt).toLocaleString("da-DK");const stale=Date.now()-new Date(conditions.generatedAt).getTime()>8*3600000;dataStatus.textContent=`${stale?"⚠ Data er ældre end normalt · ":""}Senest opdateret ${timestamp}`;}else dataStatus.textContent="Vejrdata indlæses ved næste automatiske GitHub-kørsel.";resumeTripTracking();updateTripUi();const pending=pendingTripPrompt();if(pending)setTimeout(()=>openTripPrompt(pending),650);}catch(error){console.error(error);infoPanel.innerHTML='<div class="notice">Kortzonerne kunne ikke indlæses. Kontroller den seneste GitHub Action.</div>';dataStatus.textContent="Fejl ved indlæsning";}

// RavRadar 3.0.0: versionsmanifest + sikker service-worker-opdatering.
function installAppUpdateFlow() {
  if (!("serviceWorker" in navigator)) return;
  const banner=document.querySelector("#updateBanner"), updateButton=document.querySelector("#updateAppButton");
  const version=window.RAVRADAR_VERSION||"3.0.0"; document.querySelector("#appVersion").textContent=version;
  let refreshing=false, registration=null, waitingWorker=null;
  const showUpdate=worker=>{waitingWorker=worker||waitingWorker;if(!banner||!updateButton)return;banner.hidden=false;updateButton.disabled=false;updateButton.textContent="Opdater nu";};
  const activate=()=>{updateButton.disabled=true;updateButton.textContent="Opdaterer…";(waitingWorker||registration?.waiting)?.postMessage({type:"SKIP_WAITING"});};
  updateButton?.addEventListener("click",activate);
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(refreshing)return;refreshing=true;location.reload();});
  async function checkVersion(){
    try{const response=await fetch(`./version.json?t=${Date.now()}`,{cache:"no-store"});if(!response.ok)return;const remote=await response.json();if(remote.version&&remote.version!==version){showUpdate(registration?.waiting);await registration?.update();if(registration?.waiting)showUpdate(registration.waiting);}}catch(error){console.debug("Versionskontrol kunne ikke gennemføres",error);}
  }
  addEventListener("load",async()=>{try{registration=await navigator.serviceWorker.register(`./service-worker.js?v=${version}`,{updateViaCache:"none"});if(registration.waiting&&navigator.serviceWorker.controller)showUpdate(registration.waiting);registration.addEventListener("updatefound",()=>{const worker=registration.installing;worker?.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate(worker);});});await registration.update();await checkVersion();document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){registration?.update();checkVersion();}});setInterval(checkVersion,30*60*1000);}catch(error){console.warn("Service worker kunne ikke registreres",error);}});
}
installAppUpdateFlow();
