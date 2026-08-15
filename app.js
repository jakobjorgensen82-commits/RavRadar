import { calculateRavScore, exceptionalScoreMark } from "./js/core/score-engine.js?v=4.0.212";
import { selectBestTimeForDay } from "./js/core/best-time-selector.js?v=4.0.212";
import { loadConditions, loadZones, loadDataManifest } from "./js/services/data-service.js?v=4.0.212";
import { submitObservation, getLocalObservations, syncPendingObservations } from "./js/services/observation-service.js?v=4.0.212";
import { predictAmberChance } from "./js/core/prediction-engine.js?v=4.0.212";
import { consumeAuthCallback } from "./js/services/auth-service.js?v=4.0.212";
import { activeTrip, answerTrip, pendingTripPrompt, resumeTripTracking, startTrip, stopTrip } from "./js/services/trip-service.js?v=4.0.212";
import { createMap, installFlowArrows, refreshZoneStyles, renderZones } from "./js/map/map-view.js?v=4.0.212";
import { projectPublicCoastlines } from "./js/map/public-coast-projection.js?v=4.0.212";
import { bindZoneInfoInteractions, showZoneInfo } from "./js/ui/info-panel.js?v=4.0.212";
import { openAccountDialog } from "./js/ui/account-panel.js?v=4.0.212";
import { openDeveloperDialog } from "./js/ui/developer-panel.js?v=4.0.212";
import { askRavRadar, QUICK_QUESTIONS } from "./js/services/rav-assistant.js?v=4.0.212";
import { loadAdaptiveModel } from "./js/core/adaptive-model.js?v=4.0.212";
import { buildLocalZoneScore } from "./js/core/local-zone-score.js?v=4.0.212";

const state = { mode:"waders", selectedZone:null, zoneLayer:null, zones:null, conditions:{ available:false,zones:{} }, lastGps:null, flowArrows:null, adaptiveModel:loadAdaptiveModel(), currentScores:new Map(), forecastGroups:new Map(), forecastRenderId:0 };
const map = createMap("map");
performance.mark?.('ravradar:map-shell-ready');
const infoPanel = document.querySelector("#infoPanel"), dataStatus = document.querySelector("#dataStatus"), ranking = document.querySelector("#ranking");
const nationalForecast = document.querySelector("#nationalForecastContent");
const tripButton = document.querySelector("#tripButton");
const assistantDialog=document.querySelector("#assistantDialog"), accountDialog=document.querySelector("#accountDialog"), developerDialog=document.querySelector("#developerDialog"), pinDialog=document.querySelector("#pinDialog"), tripDialog=document.querySelector("#tripDialog");

function zoneCondition(zone) { return state.conditions.zones?.[zone?.id] || {}; }
function localZoneScore(zone,time=null){
  return buildLocalZoneScore({coastalParts:state.conditions.coastalParts,zoneId:zone?.id,mode:state.mode,time:time||state.conditions.generatedAt});
}
function scoreFor(zone, weather = zoneCondition(zone).current || {}, history = zoneCondition(zone).history || {}) { return calculateRavScore({ mode:state.mode, zone, weather, history, adaptiveModel:state.adaptiveModel }); }
function resultFor(zone, weather = zoneCondition(zone).current || {}, history = zoneCondition(zone).history || {}) { const isCurrent=weather===zoneCondition(zone).current;const local=isCurrent&&state.conditions.coastalParts?.enabled?localZoneScore(zone,weather?.time):null;const result=local?.available?local:scoreFor(zone,weather,history); return {...result,prediction:predictAmberChance({baseScore:result.score,zone,weather,history,observations:getLocalObservations(),model:state.adaptiveModel})}; }
function currentScoreFor(zone){const key=`${state.mode}:${zone.id}`;if(!state.currentScores.has(key)){const local=state.conditions.coastalParts?.enabled?localZoneScore(zone):null;const result=local?.available?local:scoreFor(zone);state.currentScores.set(key,result);}return state.currentScores.get(key);}
function weatherForObservedDate(zone,date){
  const condition=zoneCondition(zone);const hours=condition.forecast?.hourly||[];
  const target=Date.parse(`${date}T12:00:00Z`);
  const sameDay=hours.filter(hour=>String(hour.time||'').slice(0,10)===date);
  if(!sameDay.length)return condition.current||{};
  return sameDay.reduce((best,hour)=>Math.abs(Date.parse(hour.time)-target)<Math.abs(Date.parse(best.time)-target)?hour:best,sameDay[0]);
}
function selectedFeature() { return state.zones?.features.find(item=>item.properties.id===state.selectedZone?.id); }
function showSelectedZoneParts() {
  if(!state.selectedZone)return;
  const result=localZoneScore(state.selectedZone);
  const parts=state.zones?.coastalParts?.zones?.[state.selectedZone.id] || [];
  const highlighted=(result?.localCoverageSummary?.parts || []).map(part=>part.partId);
  if(result?.localCoverage?.status !== 'whole-zone' && result?.localCoverage?.winningPartId && !highlighted.length) highlighted.push(result.localCoverage.winningPartId);
  state.zoneLayer?.showLocalParts?.(state.selectedZone.id,parts,highlighted);
  document.querySelector('#map')?.scrollIntoView({behavior:'smooth',block:'center'});
}

function renderSelectedZone() {
  if(!state.selectedZone)return;
  const condition=zoneCondition(state.selectedZone), result=resultFor(state.selectedZone);
  showZoneInfo(infoPanel,state.selectedZone,result,condition.current||{},state.mode,{ forecast:condition.forecast,history:condition.history||{} });
  bindZoneInfoInteractions(infoPanel,state.selectedZone,state.mode,condition.history||{},{onShowLocalParts:showSelectedZoneParts});
  infoPanel.querySelector("[data-close-zone]")?.addEventListener("click", closeZone);
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
  requestAnimationFrame(()=>{map.invalidateSize();state.zoneLayer?.showOverview?.();});
  document.querySelector("#map")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function renderRanking() {
  if(!state.zones)return;
  const rows=state.zones.features.map(feature=>({zone:feature.properties,result:currentScoreFor(feature.properties)})).filter(item=>item.result.available).sort((a,b)=>b.result.score-a.result.score).slice(0,5);
  ranking.innerHTML=rows.length?rows.map((item,index)=>`<button class="ranking-item" type="button" data-zone-id="${item.zone.id}"><span class="rank">${index+1}</span><span><strong>${item.zone.name}</strong><small>${item.zone.region}</small></span><b class="rank-score ${item.result.level}">${item.result.score}${exceptionalScoreMark(item.result.score)}</b></button>`).join(""):`<p class="ranking-empty">Ranglisten vises, når vejrdata er hentet.</p>`;
  ranking.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>openZone(state.zones.features.find(item=>item.properties.id===button.dataset.zoneId).properties)));
}

function groupHoursForZone(zone) {
  if(state.forecastGroups.has(zone.id))return state.forecastGroups.get(zone.id);
  const groups=new Map(); for(const hour of zoneCondition(zone).forecast?.hourly||[]){const date=String(hour.time||"").slice(0,10);if(!date)continue;if(!groups.has(date))groups.set(date,[]);groups.get(date).push(hour);}
  const days=[...groups.entries()].slice(0,5).map(([date,hours])=>({date,hours}));state.forecastGroups.set(zone.id,days);return days;
}
function bestForDay(zone,date) {
  const localRows=state.conditions.coastalParts?.zones?.[zone.id]?.hourly?.filter(row=>String(row.time||'').slice(0,10)===date).map(row=>({row,value:row[state.mode]})).filter(item=>Number.isFinite(item.value?.score)&&item.value.status!=='uncertain');
  if(localRows?.length){const best=localRows.sort((a,b)=>b.value.score-a.value.score||Date.parse(a.row.time)-Date.parse(b.row.time))[0];return{hour:{time:best.row.time},result:buildLocalZoneScore({coastalParts:state.conditions.coastalParts,zoneId:zone.id,mode:state.mode,time:best.row.time}),recommended:true,isNow:Math.abs(Date.parse(best.row.time)-Date.now())<3600000};}
  const condition=zoneCondition(zone), day=groupHoursForZone(zone).find(item=>item.date===date); if(!day)return null;
  const currentResult=currentScoreFor(zone);
  return selectBestTimeForDay({day,zone,mode:state.mode,history:condition.history||{},currentWeather:condition.current||null,currentResult,adaptiveModel:state.adaptiveModel});
}

const yieldToBrowser=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));

async function renderNationalForecast() {
  if(!state.zones)return false;
  const renderId=++state.forecastRenderId;
  const dates=[...new Set(state.zones.features.flatMap(f=>groupHoursForZone(f.properties).map(day=>day.date)))].sort().slice(0,5);
  if(!dates.length){nationalForecast.innerHTML='<p class="ranking-empty">5-dages prognosen bliver vist efter næste vejr-opdatering.</p>';return true;}

  // Vis strukturen straks og giv browseren en reel mulighed for at tegne dagens rangliste.
  const data=dates.map(date=>({date,rows:[]}));
  nationalForecast.innerHTML=`<div class="day-tabs national-day-tabs" role="tablist">${data.map((day,index)=>`<button type="button" class="national-day-tab ${index===0?"active":""}" data-day-index="${index}"><span>${new Intl.DateTimeFormat("da-DK",{weekday:"short"}).format(new Date(`${day.date}T12:00:00`)).replace(".","")}</span><small>${new Intl.DateTimeFormat("da-DK",{day:"numeric",month:"short"}).format(new Date(`${day.date}T12:00:00`)).replace(".","")}</small></button>`).join("")}</div><div class="national-forecast-list"><p class="ranking-empty">Beregner 5-dages prognose… 0 %</p></div>`;
  await yieldToBrowser();
  if(renderId!==state.forecastRenderId)return false;

  // Beregn i små bidder. Den gamle synkrone løkke kunne blokere mobilbrowseren så
  // længe, at hverken dagens rangliste eller prognosen nogensinde blev malet.
  const features=state.zones.features;
  for(let index=0;index<features.length;index++){
    const zone=features[index].properties;
    for(let dayIndex=0;dayIndex<dates.length;dayIndex++){
      const best=bestForDay(zone,dates[dayIndex]);
      if(best){
        const rows=data[dayIndex].rows;
        rows.push({zone,...best});
        rows.sort((a,b)=>b.result.score-a.result.score);
        if(rows.length>5)rows.length=5;
      }
    }
    if(index%2===1||index===features.length-1){
      if(renderId!==state.forecastRenderId)return false;
      const progress=Math.round(((index+1)/features.length)*100);
      const list=nationalForecast.querySelector(".national-forecast-list");
      if(list)list.innerHTML=`<p class="ranking-empty">Beregner 5-dages prognose… ${progress} %</p>`;
      await yieldToBrowser();
    }
  }
  if(renderId!==state.forecastRenderId)return false;

  const list=nationalForecast.querySelector(".national-forecast-list");
  const render=index=>{nationalForecast.querySelectorAll(".national-day-tab").forEach((button,i)=>button.classList.toggle("active",i===index)); const rows=data[index].rows; list.innerHTML=rows.length?rows.map((item,i)=>`<button type="button" class="national-zone-row" data-zone-id="${item.zone.id}"><span class="rank">${i+1}</span><span><strong>${item.zone.name}</strong><small>${item.recommended?(item.isNow?"Bedst lige nu":`Bedste tidspunkt ca. ${new Intl.DateTimeFormat("da-DK",{hour:"2-digit",minute:"2-digit"}).format(new Date(item.hour.time))}`):"Se timeprognosen for forhold"}</small></span><b class="rank-score ${item.result.level}">${item.result.score}${exceptionalScoreMark(item.result.score)}</b></button>`).join(""):'<p class="ranking-empty">Ingen prognosedata for dagen.</p>'; list.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>openZone(state.zones.features.find(f=>f.properties.id===button.dataset.zoneId).properties)));};
  nationalForecast.querySelectorAll(".national-day-tab").forEach((button,index)=>button.addEventListener("click",()=>render(index))); render(0);
  return true;
}

function setMode(mode,{render=true}={}){state.mode=mode;state.currentScores.clear();localStorage.setItem("ravradar-mode",mode);document.querySelectorAll(".mode-button").forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});if(!render)return;if(state.zoneLayer)refreshZoneStyles(state.zoneLayer,id=>currentScoreFor(state.zones.features.find(item=>item.properties.id===id).properties));renderRanking();performance.mark?.('ravradar:ranking-ready');renderNationalForecast().then(completed=>{if(completed)performance.mark?.('ravradar:forecast-ready');}).catch(error=>{console.error('5-dages prognosen kunne ikke beregnes',error);nationalForecast.innerHTML='<p class="ranking-empty">5-dages prognosen kunne ikke beregnes.</p>';});renderSelectedZone();}
function updateTripUi(){const trip=activeTrip();tripButton.textContent=trip?"Afslut tur":"Start ravtur";tripButton.classList.toggle("trip-active",Boolean(trip));tripButton.setAttribute("aria-pressed",String(Boolean(trip)));document.querySelector("#tripStatus").textContent=trip?"Ravtur i gang. GPS registreres kun, mens appen er åben.":"";}
function normalizeZoneSearch(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("da-DK").trim();}
function installZoneSearch(form,zones){
  const input=form.querySelector("#tripZoneSearch"), hidden=form.querySelector("input[name=zoneId]"), results=form.querySelector("#tripZoneResults");
  const label=zone=>`${zone.name} · ${zone.region}`;
  const render=()=>{const query=normalizeZoneSearch(input.value);const matches=zones.filter(zone=>!query||normalizeZoneSearch(`${zone.name} ${zone.region} ${zone.id}`).includes(query)).slice(0,30);results.innerHTML=matches.map(zone=>`<button type="button" role="option" data-zone-id="${zone.id}"><strong>${zone.name}</strong><small>${zone.region}</small></button>`).join("")||'<p>Ingen zoner matcher søgningen.</p>';results.hidden=false;results.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{const zone=zones.find(item=>item.id===button.dataset.zoneId);input.value=label(zone);hidden.value=zone.id;results.hidden=true;input.setAttribute("aria-expanded","false");}));};
  input.addEventListener("focus",()=>{input.setAttribute("aria-expanded","true");render();});
  input.addEventListener("input",()=>{hidden.value="";input.setAttribute("aria-expanded","true");render();});
  input.addEventListener("keydown",event=>{if(event.key==="Escape"){results.hidden=true;input.setAttribute("aria-expanded","false");}});
  document.addEventListener("click",event=>{if(!form.querySelector(".zone-search").contains(event.target)){results.hidden=true;input.setAttribute("aria-expanded","false");}},{once:false});
}
function openTripPrompt(trip){
  const zones=(state.zones?.features||[]).map(feature=>feature.properties).sort((a,b)=>a.name.localeCompare(b.name,"da"));
  const defaultDate=String(trip.endedAt||trip.startedAt||new Date().toISOString()).slice(0,10);
  tripDialog.querySelector(".dialog-content").innerHTML=`<h2>Fortæl om din ravtur</h2><p>For at gøre RavRadar bedre sammenholder vi dit svar med de vejr-, vandstands- og prognosedata, der gjaldt på den valgte dato og i den valgte zone.</p><form id="tripAnswerForm" class="stack-form"><fieldset class="trip-found-field"><legend>Fandt du rav?</legend><div class="trip-answer-buttons"><label><input type="radio" name="response" value="none" required><span>Nej</span></label><label><input type="radio" name="response" value="medium" required><span>Ja</span></label></div></fieldset><label>Dato for ravjagten<input name="observedDate" type="date" required value="${defaultDate}" max="${new Date().toISOString().slice(0,10)}"></label><label>Zone<div class="zone-search"><input id="tripZoneSearch" type="search" placeholder="Søg efter zone, fx øs" autocomplete="off" role="combobox" aria-controls="tripZoneResults" aria-expanded="false" required><input name="zoneId" type="hidden"><div id="tripZoneResults" class="zone-search-results" role="listbox" hidden></div></div></label><label>Valgfrit antal gram<input name="grams" type="number" min="0" max="10000" step="0.1" inputmode="decimal"></label><button type="submit" class="primary-button trip-submit">Indsend</button><p class="form-status" id="tripAnswerStatus"></p></form>`;
  tripDialog.showModal();
  const form=tripDialog.querySelector("#tripAnswerForm");installZoneSearch(form,zones);
  form.addEventListener("submit",async event=>{
    event.preventDefault();const data=new FormData(form),response=String(data.get("response")||""),zone=zones.find(item=>item.id===data.get("zoneId")),status=form.querySelector("#tripAnswerStatus");
    if(!response||!zone){status.textContent="Vælg både Ja/Nej og en zone fra søgeresultaterne.";return;}
    const observedDate=String(data.get("observedDate"));const condition=zoneCondition(zone);const weather=weatherForObservedDate(zone,observedDate);const scoreResult=resultFor(zone,weather,condition.history||{});const submitButton=form.querySelector(".trip-submit");submitButton.disabled=true;submitButton.textContent="Indsender…";
    try{answerTrip(trip.id,response,data.get("grams"),{observedDate,zoneId:zone.id,zoneName:zone.name});await submitObservation({zone,huntMode:state.mode,result:response,grams:data.get("grams"),observedAt:`${observedDate}T12:00:00.000Z`,scoreResult,weather,prediction:scoreResult.prediction,gps:trip.points?.at(-1)||null,tripId:trip.id});status.textContent="Tak. Oplysningerne er sendt til Administratorcenteret.";setTimeout(()=>tripDialog.close(),450);}catch(error){status.textContent=error.message;submitButton.disabled=false;submitButton.textContent="Indsend";}
  });
}
function enableDialogClose(dialog){dialog.querySelector(".dialog-close")?.addEventListener("click",()=>dialog.close());dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});}
[assistantDialog,accountDialog,developerDialog,pinDialog,tripDialog].forEach(enableDialogClose);

function assistantContext(){const zone=state.selectedZone;const condition=zoneCondition(zone);return {zone,weather:condition.current||{},history:condition.history||{},result:zone?resultFor(zone):null,mode:state.mode,zones:state.zones,conditions:state.conditions};}
function addAssistantMessage(text,who="assistant",loading=false){const box=document.querySelector("#assistantMessages");const div=document.createElement("div");div.className=`assistant-message ${who}${loading?" loading":""}`;const p=document.createElement("p");p.textContent=text;div.appendChild(p);box.appendChild(div);box.scrollTop=box.scrollHeight;return div;}
async function submitAssistantQuestion(question){const clean=String(question||"").trim();if(!clean)return;addAssistantMessage(clean,"user");const pending=addAssistantMessage("Undersøger forholdene…","assistant",true);try{pending.querySelector("p").textContent=await askRavRadar(clean,assistantContext());pending.classList.remove("loading");}catch(error){pending.querySelector("p").textContent=error.message;pending.classList.remove("loading");}}
const quickBox=document.querySelector("#assistantQuickQuestions");quickBox.innerHTML=QUICK_QUESTIONS.map(q=>`<button type="button">${q}</button>`).join("");quickBox.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>submitAssistantQuestion(button.textContent)));document.querySelector("#assistantButton").addEventListener("click",()=>assistantDialog.showModal());document.querySelector("#assistantForm").addEventListener("submit",async event=>{event.preventDefault();const field=event.currentTarget.elements.question;const q=field.value;field.value="";await submitAssistantQuestion(q);});

document.querySelectorAll(".mode-button").forEach(button=>button.addEventListener("click",()=>setMode(button.dataset.mode)));
document.querySelector("#accountButton").addEventListener("click",()=>openAccountDialog(accountDialog));
tripButton.addEventListener("click",()=>{if(activeTrip()){stopTrip();updateTripUi();return;}startTrip();updateTripUi();});
let logoTaps=0,tapTimer=null;document.querySelector("#logoButton").addEventListener("click",()=>{logoTaps+=1;clearTimeout(tapTimer);tapTimer=setTimeout(()=>{logoTaps=0;},5000);if(logoTaps>=10){logoTaps=0;pinDialog.showModal();pinDialog.querySelector("input").focus();}});
document.querySelector("#pinForm").addEventListener("submit",event=>{event.preventDefault();const pin=new FormData(event.currentTarget).get("pin");if(pin!=="1931"){document.querySelector("#pinStatus").textContent="Forkert PIN.";return;}pinDialog.close();event.currentTarget.reset();document.querySelector("#pinStatus").textContent="";openDeveloperDialog(developerDialog,state);});

try {
  await consumeAuthCallback();
  const started=performance.now();
  // 1: side/kortgrundlag og statiske zoner vises straks.
  const zones=projectPublicCoastlines(await loadZones());state.zones=zones;
  performance.mark?.('ravradar:zones-loaded');
  // De lokale kystdele leverer den præcise synlige geometri, men samles under
  // hovedzonen som ét klikmål, én scorefarve og kun to ydre zonemarkeringer.
  state.zoneLayer=renderZones(map,zones,()=>({available:false,level:'unavailable'}),zone=>openZone(zone,{scroll:false}));
  dataStatus.textContent='Kontrollerer aktuelle data…';
  // 2: lille manifest kontrollerer friskhed og sammenhæng.
  const manifest=await loadDataManifest();
  performance.mark?.('ravradar:manifest-loaded');
  if(manifest?.generatedAt)dataStatus.textContent=`Seneste datasæt ${new Date(manifest.generatedAt).toLocaleString('da-DK')} · henter zoner…`;
  // 3: samlet landsdatasæt hentes; dataset-id forhindrer blanding.
  const conditions=await loadConditions({manifest});state.conditions=conditions;
  performance.mark?.('ravradar:conditions-loaded');
  // 4: vælg jagtform før den første scoreberegning, så cachen ikke bygges to gange.
  setMode(localStorage.getItem('ravradar-mode')==='beach'?'beach':'waders',{render:false});
  refreshZoneStyles(state.zoneLayer,id=>currentScoreFor(zones.features.find(item=>item.properties.id===id).properties));
  performance.mark?.('ravradar:zone-colors-ready');
  // 5: dagens rangliste og 5-dages prognose må aldrig vente på dekorative pile.
  renderRanking();performance.mark?.('ravradar:ranking-ready');
  await yieldToBrowser();
  const forecastCompleted=await renderNationalForecast();
  if(forecastCompleted)performance.mark?.('ravradar:forecast-ready');
  // Vind- og strømpile kommer fortsat efter de centrale prognosevisninger,
  // men installationen må ikke afhænge af browserens vurdering af "ledig tid".
  // requestIdleCallback kan blive udskudt kraftigt i baggrundsfaner og på pressede
  // enheder. En almindelig timer gør arbejdet deterministisk uden at flytte det
  // tilbage foran rangliste, første paint eller 5-dagesprognosen.
  let flowArrowAttempts=0;
  const installArrows=()=>{
    if(state.flowArrows)return;
    flowArrowAttempts+=1;
    performance.mark?.('ravradar:flow-arrows-started');
    try{
      const arrows=installFlowArrows(map,zones,id=>state.conditions.zones?.[id]||{});
      const counts=arrows.counts?.()||{wind:0,current:0};
      if((counts.wind||0)+(counts.current||0)===0)throw new Error('Pilelaget blev oprettet uden synlige vind- eller strømpile.');
      state.flowArrows=arrows;
      performance.mark?.('ravradar:flow-arrows-ready');
      window.dispatchEvent(new CustomEvent('ravradar:flow-arrows-ready',{detail:counts}));
    }catch(error){
      performance.mark?.('ravradar:flow-arrows-failed');
      console.error('Vind- og strømpile kunne ikke vises',error);
      window.dispatchEvent(new CustomEvent('ravradar:flow-arrows-failed',{detail:{message:error?.message||String(error),attempt:flowArrowAttempts}}));
      if(flowArrowAttempts<2)setTimeout(installArrows,750);
    }
  };
  setTimeout(installArrows,0);
  if(conditions.available&&conditions.generatedAt)dataStatus.textContent=`Senest opdateret ${new Date(conditions.generatedAt).toLocaleString('da-DK')} · klar på ${Math.round(performance.now()-started)} ms`;
  else dataStatus.textContent='Aktuelle data kunne ikke hentes. Gamle data vises ikke.';
  performance.mark?.('ravradar:ready');
  window.dispatchEvent(new CustomEvent('ravradar:ready',{detail:{generatedAt:conditions.generatedAt||null,datasetId:conditions.datasetId||null}}));
  resumeTripTracking();syncPendingObservations().catch(()=>{});updateTripUi();const pending=pendingTripPrompt();if(pending)setTimeout(()=>openTripPrompt(pending),650);
} catch(error){console.error(error);infoPanel.innerHTML='<div class="notice">Aktuelle data kunne ikke indlæses. Gamle prognoser vises ikke.</div>';dataStatus.textContent='Fejl ved indlæsning';}

// RavRadar 4.0.212: versionsmanifest + sikker service-worker-opdatering.
function installAppUpdateFlow() {
  if (!("serviceWorker" in navigator)) return;
  const banner=document.querySelector("#updateBanner"), updateButton=document.querySelector("#updateAppButton");
  const version=window.RAVRADAR_VERSION||"4.0.212"; document.querySelector("#appVersion").textContent=version;
  let refreshing=false, registration=null, waitingWorker=null;
  const showUpdate=worker=>{waitingWorker=worker||waitingWorker;if(waitingWorker){waitingWorker.postMessage({type:'SKIP_WAITING'});return;}if(!banner||!updateButton)return;banner.hidden=false;updateButton.disabled=false;updateButton.textContent="Opdater nu";};
  const activate=()=>{updateButton.disabled=true;updateButton.textContent="Opdaterer…";(waitingWorker||registration?.waiting)?.postMessage({type:"SKIP_WAITING"});};
  updateButton?.addEventListener("click",activate);
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(refreshing)return;refreshing=true;location.reload();});
  async function checkVersion(){
    try{const response=await fetch(`./version.json?t=${Date.now()}`,{cache:"no-store"});if(!response.ok)return;const remote=await response.json();if(remote.version&&remote.version!==version){showUpdate(registration?.waiting);await registration?.update();if(registration?.waiting)showUpdate(registration.waiting);}}catch(error){console.debug("Versionskontrol kunne ikke gennemføres",error);}
  }
  addEventListener("load",async()=>{try{registration=await navigator.serviceWorker.register(`./service-worker.js?v=${version}`,{updateViaCache:"none"});if(registration.waiting&&navigator.serviceWorker.controller)showUpdate(registration.waiting);registration.addEventListener("updatefound",()=>{const worker=registration.installing;worker?.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate(worker);});});await registration.update();await checkVersion();document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){registration?.update();checkVersion();}});setInterval(checkVersion,30*60*1000);}catch(error){console.warn("Service worker kunne ikke registreres",error);}});
}
installAppUpdateFlow();
