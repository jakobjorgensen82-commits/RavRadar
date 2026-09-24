import { exceptionalScoreMark, scoreRating } from "./js/core/score-presentation.js?v=4.0.484";
import { loadConditions, loadConditionDetails, mergeConditionDetails, loadZones, loadDataManifest, refreshPublicRuntimeGeneration } from "./js/services/data-service.js?v=4.0.484";
import { submitTripEvidenceObservation, syncPendingObservations } from "./js/services/observation-service.js?v=4.0.484";
import { consumeAuthCallback } from "./js/services/auth-service.js?v=4.0.484";
import { createMap, installFlowArrows, refreshZoneStyles, renderZones } from "./js/map/map-view.js?v=4.0.484";
import { projectPublicCoastlines } from "./js/map/public-coast-projection.js?v=4.0.484";
import { bindZoneInfoInteractions, showZoneInfo } from "./js/ui/info-panel.js?v=4.0.484";
import { openAccountDialog } from "./js/ui/account-panel.js?v=4.0.484";
import { openDeveloperDialog } from "./js/ui/developer-panel.js?v=4.0.484";
import { askRavRadar, quickQuestions, ravQuestionNeedsConditionDetails } from "./js/services/rav-assistant.js?v=4.0.484";
import { formatDateTime, formatNumber, getLanguage, getLocale, t } from "./js/i18n.js?v=4.0.484";
import { buildLocalZoneScore, isCurrentForecastHour, selectLocalBestForDay } from "./js/core/local-zone-score.js?v=4.0.484";
import { addNationalRanking, compareNationalRankingRows } from "./js/core/zone-ranking.js?v=4.0.484";
import { createPublicTripEvidenceRuntime } from './js/services/trip-evidence-runtime.js?v=4.0.484';
import { createPublicPageResumeHandler, createServiceWorkerControllerChangeHandler } from './js/core/public-page-resume.js?v=4.0.484';
import { forecastDateKeyInTimeZone, visibleForecastDays } from './js/core/forecast-calendar.js?v=4.0.484';
import { assertRavScoreModelBinding } from './js/core/ravscore-model-contract.js?v=4.0.484';

const state = { mode:"waders", selectedZone:null, zoneLayer:null, zones:null, conditions:{ available:false,zones:{} }, flowArrows:null, currentScores:new Map(), forecastGroups:new Map(), forecastRenderId:0 };
const RUNTIME_SNAPSHOT_TEXT = Object.freeze({
  da:Object.freeze({
    ageUnknown:'Prognose for {time}. Nogle kilders modelalder er ukendt; det betyder ikke, at de viste værdier mangler eller er ugyldige.',
    ranking:'Viser senest verificerede scorer fra {time}. Det er ikke den aktuelle time.',
    forecast:'Viser kun fremtidige prognoser fra den senest verificerede pakke.',
    data:'Begrænset nøddrift: Senest verificerede score og vejr fra {time} vises tydeligt som ældre data. Konservativ vejrreference er {source} ({age} timer). {known} af {total} kildealdre kan sammenlignes; {unknown} kan ikke. Den aktuelle time og lokale prognosedetaljer afventer næste vejr-opdatering.',
    trip:'En ravtur kan ikke startes fra den ældre nødvisning. Vent på næste vejr-opdatering.',
  }),
  de:Object.freeze({
    ageUnknown:'Prognose für {time}. Das Modellalter einiger Quellen ist unbekannt; angezeigte Werte sind deshalb nicht fehlend oder ungültig.',
    ranking:'Zuletzt verifizierte RavScores von {time}. Dies ist nicht die aktuelle Stunde.',
    forecast:'Es werden nur zukünftige Prognosen aus dem zuletzt verifizierten Paket angezeigt.',
    data:'Eingeschränkter Notbetrieb: Der zuletzt verifizierte RavScore und das Wetter von {time} werden deutlich als ältere Daten angezeigt. Die konservative Wetterreferenz ist {source} ({age} Stunden). {known} von {total} Quellenaltern sind vergleichbar; {unknown} nicht. Die aktuelle Stunde und lokale Prognosedetails warten auf die nächste Wetteraktualisierung.',
    trip:'Eine Bernsteintour kann nicht aus der älteren Notansicht gestartet werden. Warte auf die nächste Wetteraktualisierung.',
  }),
  en:Object.freeze({
    ageUnknown:'Forecast for {time}. Some source model ages are unknown; that does not mean the displayed values are missing or invalid.',
    ranking:'Showing the latest verified RavScores from {time}. This is not the current hour.',
    forecast:'Only future forecasts from the latest verified package are shown.',
    data:'Limited emergency mode: The latest verified RavScore and weather from {time} are clearly shown as older data. The conservative weather reference is {source} ({age} hours). {known} of {total} source ages are comparable; {unknown} are not. The current hour and local forecast details await the next weather update.',
    trip:'An amber trip cannot start from the older emergency view. Wait for the next weather update.',
  }),
});
function runtimeSnapshotText(key,values={}){
  const template=(RUNTIME_SNAPSHOT_TEXT[getLanguage()]||RUNTIME_SNAPSHOT_TEXT.da)[key]||'';
  return template.replace(/\{(\w+)\}/g,(_,name)=>values[name]??`{${name}}`);
}
const hasNumber = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));
const map = createMap("map");
performance.mark?.('ravradar:map-shell-ready');
const infoPanel = document.querySelector("#infoPanel"), dataStatus = document.querySelector("#dataStatus"), ranking = document.querySelector("#ranking");
const nationalForecast = document.querySelector("#nationalForecastContent");
const tripButton = document.querySelector("#tripButton");
let conditionDetailsPromise=null,conditionRuntimePromise=null,conditionRuntimeTimer=null,activeManifest;
let runtimeGeneration=0;
const pendingZoneDetails=new Map();
let coreViewReady=false,conditionDetailsReady=false;
let publicTripEvidenceRuntime=null;
const assistantDialog=document.querySelector("#assistantDialog"), accountDialog=document.querySelector("#accountDialog"), developerDialog=document.querySelector("#developerDialog"), pinDialog=document.querySelector("#pinDialog");

function emergencySnapshotReferenceAt(){
  return state.conditions?.emergencyDetailsDeferred
    ? state.conditions.productionReferenceAt||state.conditions.generatedAt||null
    : null;
}
function zoneCondition(zone) { return state.conditions.zones?.[zone?.id] || {}; }
function localZoneScore(zone,time=null){
  const zoneReferenceAt=state.conditions.coastalParts?.zones?.[zone?.id]?.currentReferenceAt;
  const referenceAt=time||zoneReferenceAt||state.conditions.productionReferenceAt||state.conditions.generatedAt;
  return buildLocalZoneScore({coastalParts:state.conditions.coastalParts,zoneId:zone?.id,mode:state.mode,time:referenceAt});
}
function currentDisplayFor(zone){
  const condition=zoneCondition(zone),base=currentScoreFor(zone);
  if(base?.localPart){
    const hasWeather=Boolean(base.localWeather);
    const weather=hasWeather?{...base.localWeather,time:base.time}:{time:base.time};
    return {result:base,weather,context:{scope:hasWeather?'local':'local-weather-missing',partId:base.localPartId,partName:base.localPartName,time:base.time}};
  }
  if(!base?.available){
    return {result:base,weather:{time:base?.time||null},context:{scope:'local-unavailable',time:base?.time||null}};
  }
  const weather=condition.current||{};
  return {result:base,weather,context:{scope:'local-weather-missing',time:weather.time||null}};
}
function resultFor(zone) { return currentDisplayFor(zone).result; }
function scoreQualityMarker(result) {
  const bounds=result?.scoreBounds;
  const range=result?.scoreQuality==='HISTORY_INCOMPLETE'
    && Number.isFinite(bounds?.lower)&&Number.isFinite(bounds?.upper)
    && Number.isFinite(bounds?.modelUncertaintyPoints)
    ? ' · '+t('score.historyIncomplete.compactRange',{
      lower:bounds.lower,upper:bounds.upper,
    })
    : '';
  return result?.scoreQuality === 'HISTORY_INCOMPLETE'
    ? '<small class="score-quality-inline" title="' + t('score.historyIncomplete.body') + '">'
      + t('score.historyIncomplete.short') + range + '</small>'
    : '';
}
function currentScoreFor(zone){const key=`${state.mode}:${zone.id}`;if(!state.currentScores.has(key)){const local=localZoneScore(zone,emergencySnapshotReferenceAt());const result=local||{available:false,score:null,level:'unavailable',label:'RavScore midlertidigt utilgængelig',reasons:['RavScore-data mangler for zonen lige nu.']};state.currentScores.set(key,result);}return state.currentScores.get(key);}
function nationalRankingRow(row){return addNationalRanking(row,state.zones?.coastalParts?.zones?.[row.zone?.id]);}
function selectedFeature() { return state.zones?.features.find(item=>item.properties.id===state.selectedZone?.id); }
function showSelectedZoneParts() {
  if(!state.selectedZone)return;
  const result=localZoneScore(state.selectedZone);
  const parts=state.zones?.coastalParts?.zones?.[state.selectedZone.id] || [];
  const highlighted=result?.winningPartUncertain===true
    ?(result.possibleWinningParts||[]).map(part=>part.partId)
    :(result?.localCoverageSummary?.parts || []).map(part=>part.partId);
  if(result?.localCoverage?.status !== 'whole-zone' && result?.localCoverage?.winningPartId && !highlighted.length) highlighted.push(result.localCoverage.winningPartId);
  state.zoneLayer?.showLocalParts?.(state.selectedZone.id,parts,highlighted);
  document.querySelector('#map')?.scrollIntoView({behavior:'smooth',block:'center'});
}

function renderSelectedZone() {
  if(!state.selectedZone)return;
  infoPanel.hidden=false;
  const condition=zoneCondition(state.selectedZone), display=currentDisplayFor(state.selectedZone);
  const bestByDate=Object.fromEntries(groupHoursForZone(state.selectedZone).map(day=>[day.date,bestForDay(state.selectedZone,day.date)]));
  showZoneInfo(infoPanel,state.selectedZone,display.result,display.weather,state.mode,{ forecast:condition.forecast,history:condition.history||{},bestByDate,displayContext:display.context });
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
  void ensureConditionDetails().catch(error=>console.error('Zonedetaljer kunne ikke hentes',error));
  requestAnimationFrame(()=>map.invalidateSize());
  if(scroll) infoPanel.scrollIntoView({behavior:"smooth",block:"start"});
}

function closeZone() {
  state.selectedZone=null;
  state.zoneLayer?.selectZone?.(null);
  document.body.classList.remove("zone-focus");
  infoPanel.replaceChildren();
  infoPanel.hidden=true;
  requestAnimationFrame(()=>{map.invalidateSize();state.zoneLayer?.showOverview?.();});
  document.querySelector("#map")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function renderRanking() {
  if(!state.zones)return;
  const rows=state.zones.features.map(feature=>nationalRankingRow({zone:feature.properties,result:currentScoreFor(feature.properties)})).filter(item=>item.result.available).sort(compareNationalRankingRows).slice(0,5);
  ranking.innerHTML=rows.length?rows.map((item,index)=>`<button class="ranking-item" type="button" data-zone-id="${item.zone.id}"><span class="rank">${index+1}</span><span><strong>${item.zone.name}</strong><small>${item.zone.region}</small><small class="ranking-best-place">${t('ranking.bestPlace')}: ${item.result.score}</small>${scoreQualityMarker(item.result)}</span><b class="rank-score ${scoreRating(item.rankingDisplayScore).level}" title="${t('ranking.areaScore')}">${item.rankingDisplayScore}${exceptionalScoreMark(item.rankingDisplayScore)}</b></button>`).join(""):`<p class="ranking-empty">${t('ranking.waiting')}</p>`;
  const snapshotReference=emergencySnapshotReferenceAt();
  if(snapshotReference)ranking.insertAdjacentHTML('afterbegin',`<p class='ranking-empty runtime-snapshot-note'>${runtimeSnapshotText('ranking',{time:formatDateTime(snapshotReference)})}</p>`);
  ranking.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>openZone(state.zones.features.find(item=>item.properties.id===button.dataset.zoneId).properties)));
}

function groupHoursForZone(zone) {
  const cacheKey=`${zone.id}:${forecastDateKeyInTimeZone()}`;
  if(state.forecastGroups.has(cacheKey))return state.forecastGroups.get(cacheKey);
  const groups=new Map(); for(const hour of zoneCondition(zone).forecast?.hourly||[]){let date;try{date=forecastDateKeyInTimeZone(hour?.time);}catch{continue;}if(!groups.has(date))groups.set(date,[]);groups.get(date).push(hour);}
  const days=visibleForecastDays([...groups.entries()].map(([date,hours])=>({date,hours})));state.forecastGroups.set(cacheKey,days);return days;
}
function bestForDay(zone,date) {
  return selectLocalBestForDay({coastalParts:state.conditions.coastalParts,zoneId:zone.id,mode:state.mode,date});
}

const yieldToBrowser=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));

async function renderNationalForecast() {
  if(!state.zones)return false;
  const renderId=++state.forecastRenderId;
  const prepared=(state.conditions?.nationalForecast?.modes?.[state.mode]||null);
  if(!Array.isArray(prepared)&&!conditionDetailsReady){
    nationalForecast.innerHTML=`<p class="ranking-empty">${t('forecast.fetching')}</p>`;
    try{await ensureConditionDetails();}catch(error){console.error('5-dages prognose og kystdelsdetaljer kunne ikke hentes',error);nationalForecast.innerHTML=`<p class="ranking-empty">${t('forecast.loadFailed')}</p>`;return false;}
  }
  const preparedAfterLoad=state.conditions?.nationalForecast?.modes?.[state.mode];
  let visiblePrepared=Array.isArray(preparedAfterLoad)?visibleForecastDays(preparedAfterLoad):null;
  const snapshotReference=emergencySnapshotReferenceAt();
  if(snapshotReference&&Array.isArray(visiblePrepared)){
    const currentHourMs=Math.floor(Date.now()/3600000)*3600000;
    visiblePrepared=visiblePrepared.map(day=>({
      ...day,
      rows:(day.rows||[]).filter(row=>Number.isFinite(Date.parse(row?.time))&&Date.parse(row.time)>=currentHourMs),
    })).filter(day=>day.rows.length>0);
  }
  const dates=Array.isArray(visiblePrepared)
    ?visiblePrepared.map(day=>day.date)
    :[...new Set(state.zones.features.flatMap(f=>groupHoursForZone(f.properties).map(day=>day.date)))].sort().slice(0,5);
  if(!dates.length){nationalForecast.innerHTML=`<p class="ranking-empty">${t('forecast.expired')}</p>`;return true;}

  // Vis strukturen straks og giv browseren en reel mulighed for at tegne dagens rangliste.
  const data=Array.isArray(visiblePrepared)?visiblePrepared.map(day=>({
    date:day.date,
    rows:(day.rows||[]).flatMap(row=>{
      const zone=state.zones.features.find(feature=>feature.properties.id===row.zoneId)?.properties;
      if(!zone||!hasNumber(row.score)||!hasNumber(row.rankingDisplayScore))return [];
      return [{
        zone,
        result:{
          available:true,
          score:Number(row.score),
          scoreQuality:row.scoreQuality,
          scoreBounds:row.scoreBounds?{...row.scoreBounds}:null,
          calibrationEligible:row.calibrationEligible,
          scoreSemantics:row.scoreSemantics,
          conservativeTailResetApplied:row.conservativeTailResetApplied,
          historyCoverageHours:row.historyCoverageHours,
          historyReasonCodes:Array.isArray(row.historyReasonCodes)?row.historyReasonCodes:[],
        },
        hour:{time:row.time},
        recommended:true,
        isNow:isCurrentForecastHour(row.time),
        rankingScore:Number(row.rankingScore),
        rankingDisplayScore:Number(row.rankingDisplayScore),
      }];
    }),
  })):dates.map(date=>({date,rows:[]}));
  nationalForecast.innerHTML=`<div class="day-tabs national-day-tabs" role="tablist">${data.map((day,index)=>`<button type="button" class="national-day-tab ${index===0?"active":""}" data-day-index="${index}"><span>${new Intl.DateTimeFormat(getLocale(),{weekday:"short"}).format(new Date(`${day.date}T12:00:00`)).replace(".","")}</span><small>${new Intl.DateTimeFormat(getLocale(),{day:"numeric",month:"short"}).format(new Date(`${day.date}T12:00:00`)).replace(".","")}</small></button>`).join("")}</div><div class="national-forecast-list"><p class="ranking-empty">${t('forecast.calculating',{progress:0})}</p></div>`;
  if(snapshotReference)nationalForecast.insertAdjacentHTML('afterbegin',`<p class='ranking-empty runtime-snapshot-note'>${runtimeSnapshotText('forecast')}</p>`);
  await yieldToBrowser();
  if(renderId!==state.forecastRenderId)return false;

  // Beregn i små bidder. Den gamle synkrone løkke kunne blokere mobilbrowseren så
  // længe, at hverken dagens rangliste eller prognosen nogensinde blev malet.
  if(!Array.isArray(visiblePrepared)){
    const features=state.zones.features;
    for(let index=0;index<features.length;index++){
      const zone=features[index].properties;
      for(let dayIndex=0;dayIndex<dates.length;dayIndex++){
        const best=bestForDay(zone,dates[dayIndex]);
        if(best){
          const rows=data[dayIndex].rows;
          rows.push(nationalRankingRow({zone,...best}));
          rows.sort(compareNationalRankingRows);
          if(rows.length>5)rows.length=5;
        }
      }
      if(index%2===1||index===features.length-1){
        if(renderId!==state.forecastRenderId)return false;
        const progress=Math.round(((index+1)/features.length)*100);
        const list=nationalForecast.querySelector(".national-forecast-list");
        if(list)list.innerHTML=`<p class="ranking-empty">${t('forecast.calculating',{progress})}</p>`;
        await yieldToBrowser();
      }
    }
  }
  if(renderId!==state.forecastRenderId)return false;

  const list=nationalForecast.querySelector(".national-forecast-list");
  const render=index=>{nationalForecast.querySelectorAll(".national-day-tab").forEach((button,i)=>button.classList.toggle("active",i===index)); const rows=data[index].rows; list.innerHTML=rows.length?rows.map((item,i)=>`<button type="button" class="national-zone-row" data-zone-id="${item.zone.id}"><span class="rank">${i+1}</span><span><strong>${item.zone.name}</strong><small>${item.recommended?(item.isNow?t('forecast.bestNow'):t('forecast.bestAt',{time:formatDateTime(item.hour.time,{hour:'2-digit',minute:'2-digit'})})):t('forecast.seeHourly')}</small><small class="ranking-best-place">${t('ranking.bestPlace')}: ${item.result.score}</small>${scoreQualityMarker(item.result)}</span><b class="rank-score ${scoreRating(item.rankingDisplayScore).level}" title="${t('ranking.areaScore')}">${item.rankingDisplayScore}${exceptionalScoreMark(item.rankingDisplayScore)}</b></button>`).join(""):`<p class="ranking-empty">${t('forecast.noData')}</p>`; list.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>openZone(state.zones.features.find(f=>f.properties.id===button.dataset.zoneId).properties)));};
  nationalForecast.querySelectorAll(".national-day-tab").forEach((button,index)=>button.addEventListener("click",()=>render(index))); render(0);
  return true;
}

function ensureConditionDetails(zoneId=state.selectedZone?.id??null){
  const partitioned=Boolean(activeManifest?.detailDelivery);
  if(partitioned&&(!zoneId||state.conditions.loadedDetailZones?.includes(zoneId)))return Promise.resolve(state.conditions);
  if(!partitioned&&conditionDetailsReady)return Promise.resolve(state.conditions);
  if(state.conditions?.emergencyDetailsDeferred)return Promise.resolve(state.conditions);
  const requestKey=partitioned?zoneId:'legacy';
  if(pendingZoneDetails.has(requestKey))return pendingZoneDetails.get(requestKey);
  if(activeManifest===undefined)return Promise.reject(new Error('Datamanifestet er ikke klar endnu.'));
  let pending=null;
  const generation=runtimeGeneration;
  const selectedReferenceAt=state.conditions.publicRuntimeAvailability?.selectedReferenceAt;
  pending=loadConditionDetails({manifest:activeManifest,conditions:state.conditions,zoneId:partitioned?zoneId:null}).then(details=>{
    if(generation!==runtimeGeneration||selectedReferenceAt!==state.conditions.publicRuntimeAvailability?.selectedReferenceAt)return state.conditions;
    state.conditions=mergeConditionDetails(state.conditions,details);
    conditionDetailsReady=partitioned?false:true;
    performance.mark?.('ravradar:condition-details-loaded');
    state.flowArrows?.refresh?.();
    state.currentScores.clear();state.forecastGroups.clear();
    refreshZoneStyles(state.zoneLayer,id=>currentScoreFor(state.zones.features.find(item=>item.properties.id===id).properties));
    renderRanking();renderSelectedZone();
    return state.conditions;
  }).catch(error=>{
    if(conditionDetailsPromise===pending)conditionDetailsPromise=null;
    throw error;
  }).finally(()=>{
    if(pendingZoneDetails.get(requestKey)===pending)pendingZoneDetails.delete(requestKey);
    if(conditionDetailsPromise===pending)conditionDetailsPromise=null;
  });
  pendingZoneDetails.set(requestKey,pending);
  conditionDetailsPromise=pending;
  return pending;
}

function nextConditionRuntimeGateAt(conditions){
  const availability=conditions?.publicRuntimeAvailability;
  if(!conditions?.available||!availability)return null;
  if(availability.mode==='FRESH')return Math.min(
    Date.parse(availability.ageReferenceAt)+3600000+1,
    Date.parse(availability.selectedReferenceAt)+3600000
  );
  if(availability.mode==='EMERGENCY_LAST_COMPLETE')return Math.min(
    Date.parse(availability.validUntil)+1,
    Date.parse(availability.selectedReferenceAt)+3600000
  );
  return null;
}
function updatePublicDataStatus(conditions){
  const availability=conditions?.publicRuntimeAvailability;
  if(conditions?.available&&conditions?.emergencyDetailsDeferred){
    const snapshotReference=conditions.productionReferenceAt||conditions.generatedAt;
    dataStatus.textContent=runtimeSnapshotText('data',{
      time:formatDateTime(snapshotReference),
      source:formatDateTime(availability?.ageReferenceAt),
      age:formatNumber(availability?.ageHours,{minimumFractionDigits:1,maximumFractionDigits:1}),
      known:availability?.weatherSourceAge?.knownCount??0,
      unknown:availability?.weatherSourceAge?.unknownComparableAgeCount??0,
      total:availability?.weatherSourceAge?.totalCount??0,
    });
  }else if(conditions?.available&&availability?.weatherSourceAge?.unknownComparableAgeCount>0){
    dataStatus.textContent=runtimeSnapshotText('ageUnknown',{time:formatDateTime(availability.selectedReferenceAt)});
  }else if(conditions?.available&&availability?.mode==='EMERGENCY_LAST_COMPLETE'){
    dataStatus.textContent=t('data.emergency',{
      time:formatDateTime(availability.selectedReferenceAt),
      source:formatDateTime(availability.ageReferenceAt),
      age:formatNumber(availability.ageHours,{minimumFractionDigits:1,maximumFractionDigits:1}),
      known:availability.weatherSourceAge.knownCount,
      unknown:availability.weatherSourceAge.unknownComparableAgeCount,
      total:availability.weatherSourceAge.totalCount,
    });
  }else if(conditions?.available&&availability?.ageReferenceAt){
    dataStatus.textContent=t('data.updated',{time:formatDateTime(availability.ageReferenceAt)});
  }else{
    dataStatus.textContent=t('data.failed');
  }
}
function scheduleConditionRuntimeGate(){
  clearTimeout(conditionRuntimeTimer);conditionRuntimeTimer=null;
  const target=nextConditionRuntimeGateAt(state.conditions);
  const delay=Number.isFinite(target)?Math.min(5*60000,Math.max(1000,target-Date.now())):60000;
  conditionRuntimeTimer=setTimeout(()=>{void reevaluateConditionRuntime();},delay);
}
async function reevaluateConditionRuntime(){
  if(conditionRuntimePromise)return conditionRuntimePromise;
  if(!activeManifest)return state.conditions;
  const previous=state.conditions;
  conditionRuntimePromise=refreshPublicRuntimeGeneration({manifest:activeManifest,conditions:previous,now:Date.now()})
    .then(async update=>{
      const next=update.conditions;
      // Prepare the complete replacement before mutating the active runtime.
      const replacementZones=update.zones?projectPublicCoastlines(update.zones):null;
      const replacementLayer=replacementZones
        ?renderZones(map,replacementZones,()=>({available:false,level:'unavailable'}),zone=>openZone(zone,{scroll:false}))
        :null;
      const selectionChanged=update.changed||previous.available!==next.available
        || previous.publicRuntimeAvailability?.selectedReferenceAt!==next.publicRuntimeAvailability?.selectedReferenceAt;
      if(selectionChanged){runtimeGeneration+=1;pendingZoneDetails.clear();conditionDetailsPromise=null;}
      if(update.zones){
        state.zoneLayer?.destroy?.();
        state.zones=replacementZones;
        state.zoneLayer=replacementLayer;
        state.flowArrows?.destroy?.();
        state.flowArrows=null;
        if(state.selectedZone)state.selectedZone=state.zones.features.find(feature=>feature.properties.id===state.selectedZone.id)?.properties??null;
      }
      activeManifest=update.manifest;
      // A same-hour manifest refresh may finish after a zone request. Keep
      // those newly loaded details instead of reinstalling its earlier snapshot.
      state.conditions=selectionChanged?next:{...state.conditions,publicRuntimeAvailability:next.publicRuntimeAvailability};
      if(next.available&&!next.emergencyDetailsDeferred&&!state.flowArrows)state.flowArrows=installFlowArrows(map,state.zones,id=>state.conditions.zones?.[id]||{},()=>state.conditions.coastalParts||null);
      conditionDetailsReady=state.conditions.detailsAvailable===true;
      updatePublicDataStatus(next);
      updateTripUi();
      const previousAvailability=previous.publicRuntimeAvailability;
      const nextAvailability=next.publicRuntimeAvailability;
      const changed=update.changed||previous.available!==next.available
        || previousAvailability?.mode!==nextAvailability?.mode
        || previousAvailability?.selectedReferenceAt!==nextAvailability?.selectedReferenceAt;
      if(changed&&coreViewReady)await resumePublicView();
      if(state.selectedZone)void ensureConditionDetails().catch(error=>console.warn('Zonens prognose kunne ikke opdateres',error));
      scheduleConditionRuntimeGate();
      return state.conditions;
    })
    .catch(error=>{console.warn('Opdateringen kunne ikke hentes; den verificerede visning bevares',error);return state.conditions;})
    .finally(()=>{conditionRuntimePromise=null;scheduleConditionRuntimeGate();});
  return conditionRuntimePromise;
}

function setMode(mode,{render=true}={}){state.mode=mode;state.currentScores.clear();localStorage.setItem("ravradar-mode",mode);document.querySelectorAll(".mode-button").forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});if(!render)return;if(state.zoneLayer)refreshZoneStyles(state.zoneLayer,id=>currentScoreFor(state.zones.features.find(item=>item.properties.id===id).properties));renderRanking();performance.mark?.('ravradar:ranking-ready');renderNationalForecast().then(completed=>{if(completed)performance.mark?.('ravradar:forecast-ready');}).catch(error=>{console.error('5-dages prognosen kunne ikke beregnes',error);nationalForecast.innerHTML=`<p class="ranking-empty">${t('forecast.loadFailed')}</p>`;});renderSelectedZone();}

async function resumePublicView() {
  await yieldToBrowser();
  map.invalidateSize({pan:false});
  state.currentScores.clear();state.forecastGroups.clear();
  refreshZoneStyles(state.zoneLayer,id=>currentScoreFor(state.zones.features.find(item=>item.properties.id===id).properties));
  renderRanking();renderSelectedZone();
  const completed=await renderNationalForecast();
  state.flowArrows?.refresh?.();
  await yieldToBrowser();
  map.invalidateSize({pan:false});
  if(completed)performance.mark?.('ravradar:forecast-ready');
}

const handlePublicPageShow=createPublicPageResumeHandler({
  isCoreReady:()=>coreViewReady&&Boolean(state.zoneLayer&&state.zones),
  // Optional zone shards must never turn a healthy bfcache return into a full
  // reload. The selected zone is retried independently after runtime refresh.
  detailsRequired:()=>!activeManifest?.detailDelivery&&conditionDetailsPromise!==null,
  isDetailsReady:()=>conditionDetailsReady,
  waitForDetails:()=>conditionDetailsPromise,
  resume:async()=>{await reevaluateConditionRuntime();await resumePublicView();},
  reload:()=>location.reload()
});
addEventListener('pageshow',event=>{if(event.persisted)void handlePublicPageShow(event);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&coreViewReady)void reevaluateConditionRuntime();});

function updateTripUi(message=''){
  const trip=publicTripEvidenceRuntime?.active();
  const stopped=Boolean(trip?.stoppedAt);
  const snapshotOnly=Boolean(state.conditions?.emergencyDetailsDeferred);
  tripButton.disabled=snapshotOnly;
  tripButton.title=snapshotOnly?runtimeSnapshotText('trip'):'';
  tripButton.textContent=t(stopped?'header.trip.complete':trip?'header.trip.finish':'header.trip.start');
  tripButton.classList.toggle('trip-active',Boolean(trip));
  tripButton.setAttribute('aria-pressed',String(Boolean(trip)));
  document.querySelector('#tripStatus').textContent=message||(snapshotOnly?runtimeSnapshotText('trip'):stopped?t('trip.status.stopped'):trip?t('trip.status.active'):'');
}
function enableDialogClose(dialog){dialog.querySelector(".dialog-close")?.addEventListener("click",()=>dialog.close());dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});}
[assistantDialog,accountDialog,developerDialog,pinDialog].forEach(enableDialogClose);

function assistantContext(){const zone=state.selectedZone,condition=zoneCondition(zone),display=zone?currentDisplayFor(zone):null;return {locale:getLanguage(),modelBinding:state.conditions?.ravScoreRuntime?.modelBinding??null,zone,weather:display?.weather||{},history:condition.history||{},result:display?.result||null,mode:state.mode,zones:state.zones,conditions:state.conditions};}
function addAssistantMessage(text,who="assistant",loading=false){const box=document.querySelector("#assistantMessages");const div=document.createElement("div");div.className=`assistant-message ${who}${loading?" loading":""}`;const p=document.createElement("p");p.textContent=text;div.appendChild(p);box.appendChild(div);box.scrollTop=box.scrollHeight;return div;}
async function submitAssistantQuestion(question){const clean=String(question||"").trim();if(!clean)return;addAssistantMessage(clean,"user");const pending=addAssistantMessage(t('assistant.working'),"assistant",true);try{if(ravQuestionNeedsConditionDetails(clean))await ensureConditionDetails();pending.querySelector("p").textContent=await askRavRadar(clean,assistantContext());pending.classList.remove("loading");}catch(error){pending.querySelector("p").textContent=error.message;pending.classList.remove("loading");}}
const quickBox=document.querySelector("#assistantQuickQuestions");quickBox.innerHTML=quickQuestions().map(q=>`<button type="button">${q}</button>`).join("");quickBox.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>submitAssistantQuestion(button.textContent)));document.querySelector("#assistantButton").addEventListener("click",()=>assistantDialog.showModal());document.querySelector("#assistantForm").addEventListener("submit",async event=>{event.preventDefault();const field=event.currentTarget.elements.question;const q=field.value;field.value="";await submitAssistantQuestion(q);});

document.querySelectorAll(".mode-button").forEach(button=>button.addEventListener("click",()=>setMode(button.dataset.mode)));
document.querySelector("#accountButton").addEventListener("click",async()=>{await ensureConditionDetails().catch(()=>{});openAccountDialog(accountDialog,userDataContext());});
tripButton.addEventListener('click',async()=>{
  if(!publicTripEvidenceRuntime)return;
  tripButton.disabled=true;
  try{
    await ensureConditionDetails();
    const active=publicTripEvidenceRuntime.active();
    const result=active?.stoppedAt?await publicTripEvidenceRuntime.resume():active?await publicTripEvidenceRuntime.stop():await publicTripEvidenceRuntime.startWithPrompt();
    if(result?.status==='started')updateTripUi(t('trip.status.started'));
    else if(result?.status==='submitted')updateTripUi(t('trip.status.submitted'));
    else if(result?.status==='queued')updateTripUi(t('trip.status.queued'));
    else if(result?.status==='discarded')updateTripUi(t('trip.status.discarded'));
    else updateTripUi();
  }catch(error){updateTripUi(error?.message||t('trip.status.failed'));}
  finally{tripButton.disabled=false;}
});
let logoTaps=0,tapTimer=null;document.querySelector("#logoButton").addEventListener("click",()=>{logoTaps+=1;clearTimeout(tapTimer);tapTimer=setTimeout(()=>{logoTaps=0;},5000);if(logoTaps>=10){logoTaps=0;pinDialog.showModal();pinDialog.querySelector("input").focus();}});
document.querySelector("#pinForm").addEventListener("submit",event=>{event.preventDefault();const pin=new FormData(event.currentTarget).get("pin");if(pin!=="1931"){document.querySelector("#pinStatus").textContent="Forkert PIN.";return;}pinDialog.close();event.currentTarget.reset();document.querySelector("#pinStatus").textContent="";openDeveloperDialog(developerDialog,state);});

try {
  await consumeAuthCallback();
  // 1: manifestet er autoriteten for alle offentlige runtimefiler, også
  // kystdelene. Ingen fil må derfor hentes eller caches før schema-4-
  // kontrakten, datasættet og modelbundlen er valideret.
  const manifest=await loadDataManifest();activeManifest=manifest;
  performance.mark?.('ravradar:manifest-loaded');
  const manifestSourceAge=manifest?.weatherSourceAge;
  if(manifestSourceAge?.unknownComparableAgeCount===0&&manifestSourceAge.oldestKnownSourceReferenceAt){
    dataStatus.textContent=t('data.updatedFetching',{time:formatDateTime(manifestSourceAge.oldestKnownSourceReferenceAt)});
  }
  // 2: zonegrundlag og kystdele indlæses som ét manifestbundet datasæt.
  const zones=projectPublicCoastlines(await loadZones({manifest}));state.zones=zones;
  performance.mark?.('ravradar:zones-loaded');
  // De lokale kystdele leverer den præcise synlige geometri, men samles under
  // hovedzonen som ét klikmål, én scorefarve og kun to ydre zonemarkeringer.
  state.zoneLayer=renderZones(map,zones,()=>({available:false,level:'unavailable'}),zone=>openZone(zone,{scroll:false}));
  dataStatus.textContent=t('data.checking');
  // 3: samlet landsdatasæt hentes; dataset-id forhindrer blanding.
  const conditions=await loadConditions({manifest});state.conditions=conditions;
  conditionDetailsReady=conditions.detailsAvailable===true;
  scheduleConditionRuntimeGate();
  performance.mark?.('ravradar:conditions-loaded');
  // 4: vælg jagtform før den første scoreberegning, så cachen ikke bygges to gange.
  setMode(localStorage.getItem('ravradar-mode')==='beach'?'beach':'waders',{render:false});
  refreshZoneStyles(state.zoneLayer,id=>currentScoreFor(zones.features.find(item=>item.properties.id===id).properties));
  performance.mark?.('ravradar:zone-colors-ready');
  // 5: kort, dagens rangliste og de fem nationale top-5-lister bruger kun
  // startpakken. Den store detaljepakke hentes først ved en funktion, der
  // faktisk behøver zone-, konto-, tur-, assistent- eller zoomdetaljer.
  renderRanking();performance.mark?.('ravradar:ranking-ready');
  await yieldToBrowser();
  performance.mark?.('ravradar:ready');
  coreViewReady=true;
  window.dispatchEvent(new CustomEvent('ravradar:ready',{detail:{generatedAt:conditions.generatedAt||null,datasetId:conditions.datasetId||null}}));
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
    if(state.conditions?.emergencyDetailsDeferred)return;
    flowArrowAttempts+=1;
    performance.mark?.('ravradar:flow-arrows-started');
    try{
      const arrows=installFlowArrows(map,state.zones,id=>state.conditions.zones?.[id]||{},()=>state.conditions.coastalParts||null);
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
  map.on('zoomend',()=>{if(map.getZoom()>=9)void ensureConditionDetails().catch(error=>console.error('Lokale kortdetaljer kunne ikke hentes',error));});
  updatePublicDataStatus(conditions);
  syncPendingObservations().catch(()=>{});updateTripUi();
} catch(error){console.error(error);infoPanel.hidden=false;infoPanel.innerHTML=`<div class="notice">${t('data.couldNotLoad')}</div>`;dataStatus.textContent=t('data.loadError');}

// Versionsmanifest + sikker service-worker-opdatering.
function currentAppVersion() {
  const versionText=String(globalThis.RAVRADAR_VERSION||document.querySelector('#appVersion')?.textContent||'').trim();
  if(!/^\d+\.\d+\.\d+$/.test(versionText))throw new Error('RavRadars appversion mangler eller er ugyldig.');
  return versionText;
}
function installAppUpdateFlow() {
  if (!("serviceWorker" in navigator)) return;
  const banner=document.querySelector("#updateBanner"), updateButton=document.querySelector("#updateAppButton");
  const version=currentAppVersion(); document.querySelector("#appVersion").textContent=version;
  let registration=null, waitingWorker=null;
  const showUpdate=worker=>{waitingWorker=worker||waitingWorker;if(waitingWorker){waitingWorker.postMessage({type:'SKIP_WAITING'});return;}if(!banner||!updateButton)return;banner.hidden=false;updateButton.disabled=false;updateButton.textContent=t('update.now');};
  const activate=()=>{updateButton.disabled=true;updateButton.textContent=t('update.updating');(waitingWorker||registration?.waiting)?.postMessage({type:"SKIP_WAITING"});};
  updateButton?.addEventListener("click",activate);
  const handleControllerChange=createServiceWorkerControllerChangeHandler({
    isControlled:()=>Boolean(navigator.serviceWorker.controller),
    reload:()=>location.reload()
  });
  navigator.serviceWorker.addEventListener("controllerchange",handleControllerChange);
  async function checkVersion(){
    try{const response=await fetch(`./version.json?t=${Date.now()}`,{cache:"no-store"});if(!response.ok)return;const remote=await response.json();if(remote.version&&remote.version!==version){showUpdate(registration?.waiting);await registration?.update();if(registration?.waiting)showUpdate(registration.waiting);}}catch(error){console.debug("Versionskontrol kunne ikke gennemføres",error);}
  }
  addEventListener("load",async()=>{try{registration=await navigator.serviceWorker.register(`./service-worker.js?v=${version}`,{updateViaCache:"none"});if(registration.waiting&&navigator.serviceWorker.controller)showUpdate(registration.waiting);registration.addEventListener("updatefound",()=>{const worker=registration.installing;worker?.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate(worker);});});await registration.update();await checkVersion();document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){registration?.update();checkVersion();}});setInterval(checkVersion,30*60*1000);}catch(error){console.warn("Service worker kunne ikke registreres",error);}});
}
installAppUpdateFlow();
const TRIP_EVIDENCE_INTEGRATION_V3 = true;

function publicTripEvidenceContext(selection = null) {
  const partsById = state.conditions?.coastalParts?.parts || {};
  const coastalParts = Object.entries(partsById)
    .filter(([, part]) => part?.zoneId)
    .map(([id, part]) => ({ id, zoneId: part.zoneId, name: part.name || id }));
  const zonesWithParts = new Set(coastalParts.map(part => part.zoneId));
  const zones = (state.zones?.features || [])
    .map(feature => feature?.properties)
    .filter(zone => zone?.id && zonesWithParts.has(zone.id))
    .map(zone => ({ id: zone.id, name: zone.name || zone.id }))
    .sort((left, right) => left.name.localeCompare(right.name, getLocale()));
  if (!zones.length || !coastalParts.length) throw new Error('Kystdelene er ikke klar endnu.');

  const selectedZoneId = state.selectedZone?.id;
  const zoneId = selection?.zoneId || (zones.some(zone => zone.id === selectedZoneId) ? selectedZoneId : zones[0].id);
  const recommendedPartId = state.selectedZone?.id === zoneId ? localZoneScore(state.selectedZone)?.localPartId : null;
  const coastalPartId = selection?.coastalPartId
    || (coastalParts.some(part => part.id === recommendedPartId && part.zoneId === zoneId) ? recommendedPartId : null)
    || coastalParts.find(part => part.zoneId === zoneId)?.id;
  const coastalPart = partsById[coastalPartId];
  if (!coastalPart) throw new Error('Den valgte kyststrækning findes ikke længere. Vælg område og kyststrækning igen.');

  const appVersion = currentAppVersion();
  const modelBinding = state.conditions?.ravScoreRuntime?.modelBinding;
  try {
    assertRavScoreModelBinding(modelBinding, 'Turens aktive RavScore-modelbinding');
  } catch {
    throw new Error('RavScore-modelbindingen er ikke klar endnu.');
  }
  return {
    mode: selection?.mode || state.mode,
    zoneId,
    coastalPartId,
    // Turgrundlaget skal bindes til hele det aktive, hashbærende manifest.
    // En lokal delprojektion her ville miste evidenstillid og nødvisningsbinding.
    manifest: activeManifest,
    conditions: state.conditions,
    coastalPart,
    zones,
    coastalParts,
    appVersion,
    modelVersion: modelBinding.modelId,
    modelBinding
  };
}

function userDataContext() {
  const zones = (state.zones?.features || []).map(feature => feature?.properties).filter(zone => zone?.id);
  const coastalParts = Object.entries(state.conditions?.coastalParts?.parts || {}).map(([id, part]) => ({ id, zoneId:part?.zoneId, name:part?.name || id }));
  const selectedPart = state.selectedZone ? buildLocalZoneScore({ coastalParts:state.conditions?.coastalParts, zoneId:state.selectedZone.id, mode:state.mode }) : null;
  return { mode:state.mode, zoneId:state.selectedZone?.id || zones[0]?.id || null, coastalPartId:selectedPart?.localPartId || null, zones, coastalParts };
}

publicTripEvidenceRuntime = createPublicTripEvidenceRuntime({
  getContext: publicTripEvidenceContext,
  persist: submitTripEvidenceObservation
});
updateTripUi();
void TRIP_EVIDENCE_INTEGRATION_V3;
