import { calculateRavScore } from "./js/core/score-engine.js";
import { loadConditions, loadZones } from "./js/services/data-service.js";
import { submitObservation } from "./js/services/observation-service.js";
import { consumeAuthCallback } from "./js/services/auth-service.js";
import { activeTrip, answerTrip, pendingTripPrompt, resumeTripTracking, startTrip, stopTrip } from "./js/services/trip-service.js";
import { createMap, locateUser, refreshZoneStyles, renderZones } from "./js/map/map-view.js";
import { bindZoneInfoInteractions, showZoneInfo } from "./js/ui/info-panel.js";
import { openAccountDialog } from "./js/ui/account-panel.js";
import { openDeveloperDialog } from "./js/ui/developer-panel.js";

const state = { mode:"waders", selectedZone:null, zoneLayer:null, zones:null, conditions:{ available:false,zones:{} }, lastGps:null };
const map = createMap("map");
const infoPanel = document.querySelector("#infoPanel"), dataStatus = document.querySelector("#dataStatus"), ranking = document.querySelector("#ranking");
const nationalForecast = document.querySelector("#nationalForecastContent");
const tripButton = document.querySelector("#tripButton");
const accountDialog=document.querySelector("#accountDialog"), developerDialog=document.querySelector("#developerDialog"), pinDialog=document.querySelector("#pinDialog"), tripDialog=document.querySelector("#tripDialog");

function zoneCondition(zone) { return state.conditions.zones?.[zone?.id] || {}; }
function resultFor(zone, weather = zoneCondition(zone).current || {}, history = zoneCondition(zone).history || {}) { return calculateRavScore({ mode:state.mode, zone, weather, history }); }
function selectedFeature() { return state.zones?.features.find(item=>item.properties.id===state.selectedZone?.id); }

function bindObservationForm() {
  const form=document.querySelector("#observationForm"); if(!form)return;
  form.addEventListener("submit",async event=>{ event.preventDefault(); const found=event.submitter?.value, status=document.querySelector("#observationStatus"); if(!found||!state.selectedZone)return; status.textContent="Gemmer…";
    try { const condition=zoneCondition(state.selectedZone); const response=await submitObservation({ zone:state.selectedZone,huntMode:state.mode,result:found,grams:new FormData(form).get("grams"),scoreResult:resultFor(state.selectedZone),weather:condition.current||{},gps:state.lastGps,tripId:activeTrip()?.id||null }); status.textContent=response.stored==="local"?"Gemt sikkert på denne enhed.":"Gemt og synkroniseret."; form.querySelectorAll("button").forEach(button=>button.disabled=true); }
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
  document.body.classList.add("zone-focus");
  const point=zone.pinPoint||zone.dataPoint;
  if(point) map.setView([point[1],point[0]],Math.max(map.getZoom(),10));
  renderSelectedZone();
  requestAnimationFrame(()=>map.invalidateSize());
  if(scroll) infoPanel.scrollIntoView({behavior:"smooth",block:"start"});
}

function closeZone() {
  state.selectedZone=null;
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
function openTripPrompt(trip){tripDialog.querySelector(".dialog-content").innerHTML=`<h2>Var du på ravtur i går?</h2><p>Din rute er gemt lokalt. Vælg det svar, der passer bedst.</p><form id="tripAnswerForm" class="stack-form"><div class="trip-answer-buttons"><button name="response" value="no">Nej</button><button name="response" value="yes">Ja</button><button name="response" value="much">Meget</button></div><label>Valgfrit antal gram<input name="grams" type="number" min="0" max="10000" step="0.1" inputmode="decimal"></label></form>`;tripDialog.showModal();tripDialog.querySelector("#tripAnswerForm").addEventListener("submit",event=>{event.preventDefault();answerTrip(trip.id,event.submitter?.value,new FormData(event.currentTarget).get("grams"));tripDialog.close();});}
function enableDialogClose(dialog){dialog.querySelector(".dialog-close")?.addEventListener("click",()=>dialog.close());dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});}
[accountDialog,developerDialog,pinDialog,tripDialog].forEach(enableDialogClose);

document.querySelectorAll(".mode-button").forEach(button=>button.addEventListener("click",()=>setMode(button.dataset.mode)));
document.querySelector("#locateButton").addEventListener("click",()=>locateUser(map,()=>alert("Din position kunne ikke hentes. Kontroller browserens tilladelse til placering."),position=>{state.lastGps={lat:position.latitude,lng:position.longitude,accuracy:position.accuracy,at:new Date().toISOString()};}));
document.querySelector("#accountButton").addEventListener("click",()=>openAccountDialog(accountDialog));
tripButton.addEventListener("click",()=>{if(activeTrip())stopTrip();else startTrip();updateTripUi();});
let logoTaps=0,tapTimer=null;document.querySelector("#logoButton").addEventListener("click",()=>{logoTaps+=1;clearTimeout(tapTimer);tapTimer=setTimeout(()=>{logoTaps=0;},5000);if(logoTaps>=10){logoTaps=0;pinDialog.showModal();pinDialog.querySelector("input").focus();}});
document.querySelector("#pinForm").addEventListener("submit",event=>{event.preventDefault();const pin=new FormData(event.currentTarget).get("pin");if(pin!=="1931"){document.querySelector("#pinStatus").textContent="Forkert PIN.";return;}pinDialog.close();event.currentTarget.reset();document.querySelector("#pinStatus").textContent="";openDeveloperDialog(developerDialog,state);});

try {await consumeAuthCallback();const [zones,conditions]=await Promise.all([loadZones(),loadConditions()]);state.zones=zones;state.conditions=conditions;state.zoneLayer=renderZones(map,zones,id=>resultFor(zones.features.find(item=>item.properties.id===id).properties),zone=>openZone(zone,{scroll:false}));setMode(localStorage.getItem("ravradar-mode")==="beach"?"beach":"waders");if(conditions.available&&conditions.generatedAt){const timestamp=new Date(conditions.generatedAt).toLocaleString("da-DK");const stale=Date.now()-new Date(conditions.generatedAt).getTime()>8*3600000;dataStatus.textContent=`${stale?"⚠ Data er ældre end normalt · ":""}Senest opdateret ${timestamp}`;}else dataStatus.textContent="Vejrdata indlæses ved næste automatiske GitHub-kørsel.";resumeTripTracking();updateTripUi();const pending=pendingTripPrompt();if(pending)setTimeout(()=>openTripPrompt(pending),650);}catch(error){console.error(error);infoPanel.innerHTML='<div class="notice">Kortzonerne kunne ikke indlæses. Kontroller den seneste GitHub Action.</div>';dataStatus.textContent="Fejl ved indlæsning";}
