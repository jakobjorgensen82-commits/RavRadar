import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { registerHooks } from 'node:module';
import { setImmediate as turn } from 'node:timers/promises';
import { createMapForecastController, exactMapZoneScore, mapCoastalPartsForDisplay } from '../js/services/map-forecast-view.js';
import { bindMapTimeline, mapTimelineDate, mapTimelineDayTicks } from '../js/ui/map-timeline.js';
import '../js/ui/map-timeline-copy.js?v=4.0.579';
import { buildSelectedHourFlowArrows } from '../js/map/map-view.js';
import * as service from '../js/services/data-service.js';
import { publicDeliveryGeneration } from '../js/core/public-delivery-contract.js';
import { buildPublicConditions, buildPublicConditionDetails, buildPublicManifest, buildPublicDeliveryDocument,
  compactJson, sha256Text } from './public-conditions-lib.mjs';

let cases = 0;
const fixtureUrl = new URL('./test-ravscore-public-data-service-binding.mjs?mapTimelineFixture', import.meta.url).href;
const fixtureText = (await fs.readFile(new URL('./test-ravscore-public-data-service-binding.mjs', import.meta.url),'utf8')).replace(/\r\n/g,'\n');
assert.equal(crypto.createHash('sha256').update(fixtureText).digest('hex'),'2fd624fc66f30907694c836402e293393e1676a44537f716cc9b084b94ffe449');
const sentinel = "const primary = bundle('primary-integrated', 61);";
assert.equal(fixtureText.split(sentinel).length,2);
// Reuse the existing normal210/673 pure fixture factory, not its old tests or
// I/O. No product/module logic or existing test file is edited by this loader.
const fixtureSource = fixtureText.split(sentinel)[0] + '\nexport {full,score,generatedAt,freshNow,horizonTimes,partsByZone,zoneIds,coastalPartsText,zoneRegistryText};\n';
const hooks=registerHooks({load(url,context,next){return url===fixtureUrl?{format:'module',source:fixtureSource,shortCircuit:true}:next(url,context);}});
let fixture;try{fixture=await import(fixtureUrl);}finally{hooks.deregister();}
const {full,score,generatedAt,freshNow,horizonTimes,partsByZone,zoneIds,coastalPartsText,zoneRegistryText}=fixture;
const source=full('map-timeline-synthetic',42), selectedIndices=[0,1,2,117];
// Keep the exact118-hour national contract, without cloning a giant rich score
// into116 hours that this target never selects. Unavailable is explicit, not a
// fabricated usable hour; the four selected hours retain normal rich scores.
for(const zone of Object.values(source.coastalParts.zones))for(let i=0;i<zone.hourly.length;i++){
  if(selectedIndices.includes(i))continue;
  for(const mode of ['waders','beach'])zone.hourly[i][mode]={
    available:false,score:null,scoreQuality:'UNAVAILABLE',scoreBounds:null,calibrationEligible:false,
    scoreSemantics:null,conservativeTailResetApplied:false,historyCoverageHours:null,historyReasonCodes:[],
    modelBinding:source.coastalParts.modelBinding,status:'unavailable',validPartCount:0,
    expectedPartCount:zone.expectedPartCount,comparisonPartCount:0,unavailableParts:[],
    unavailability:{available:false,code:'SYNTHETIC_NO_EXACT_INPUT',messageDa:'Syntetisk prøvetime uden data.',
      policy:'integrated-model-local-fail-closed',validPartCount:0,expectedPartCount:zone.expectedPartCount},
    reasons:['Syntetisk prøvetime uden data.'],
  };
}
for(const part of Object.values(source.coastalParts.parts)){
  const original=part.flowPoints;
  part.hourly=selectedIndices.map(index=>{
    const time=horizonTimes[index],points={current:[original.current[0]+index*.000001,original.current[1]],
      wind:[original.wind[0]+index*.000001,original.wind[1]],sources:{...original.sources}};
    return{time,weather:{time,windSpeedMps:6,currentSpeedMps:.2,windDirectionDeg:90+index,currentDirectionDeg:30+index},
      flowPoints:points,waders:score(43,partsByZone[part.zoneId][0],partsByZone[part.zoneId].length,time),
      beach:score(44,partsByZone[part.zoneId][0],partsByZone[part.zoneId].length,time)};
  });
}
const startup=buildPublicConditions(source),details=buildPublicConditionDetails(source);
const startupText=compactJson(startup),detailsText=compactJson(details);
const manifest=buildPublicManifest(source,startupText,detailsText,coastalPartsText,zoneRegistryText);
const placeholder=key=>{const sha256=sha256Text(key);return{path:`./forecast/${sha256}.json`,sha256,bytes:1};};
manifest.detailDelivery={schemaVersion:1,forecastHours:118,sourceDetailsSha256:manifest.publicConditionDetailsSha256,
  hours:Object.fromEntries(horizonTimes.map(time=>[time,placeholder(time)])),zones:Object.fromEntries(zoneIds.map(id=>[id,placeholder(id)]))};
const documents=new Map(),hourDocuments=new Map();
function register(document,targetManifest=manifest){
  const text=compactJson(document),sha256=sha256Text(text),descriptor={path:`./forecast/${sha256}.json`,sha256,bytes:Buffer.byteLength(text)};
  targetManifest.detailDelivery.hours[document.delivery.key]=descriptor;
  const url=`./data/live/forecast/${sha256}.json?dataset=${targetManifest.datasetId}&sha=${sha256}`;
  documents.set(url,text);return{document,url,text};
}
for(const i of selectedIndices){const time=horizonTimes[i];hourDocuments.set(time,register(buildPublicDeliveryDocument(source,details,manifest,'hour',time)));}
const startupUrl=`./data/live/public-conditions.json?dataset=${manifest.datasetId}&sha=${manifest.publicConditionsSha256}`;
documents.set(startupUrl,startupText);
const saved={fetch:globalThis.fetch,now:Date.now,document:globalThis.document,storage:globalThis.localStorage};
const requests=[];let corrupt=null;
globalThis.fetch=async(url,options={})=>{
  const key=String(url);requests.push(key);
  if(corrupt?.url===key&&corrupt.offline)throw Error('SYNTHETIC_OFFLINE');
  const text=corrupt?.url===key?corrupt.text:documents.get(key);
  return{ok:text!==undefined,status:text!==undefined?200:404,text:async()=>text};
};
Date.now=()=>freshNow;
try{
  const live=await service.loadConditions({manifest});assert.equal(live.available,true);
  assert.equal(Object.keys(live.zones).length,210);assert.equal(Object.keys(live.coastalParts.parts).length,673);cases++;
  const before=JSON.stringify(live),requestCount=requests.length;
  const timeline=service.mapForecastTimeline({manifest,conditions:live});
  assert.deepEqual(timeline.times,horizonTimes);assert.equal(requests.length,requestCount);
  const now=await service.loadMapForecastHour({manifest,conditions:live,time:generatedAt});
  assert.equal(now.time,generatedAt);assert.equal(requests.length,requestCount,'Now reuses already verified live view');cases++;
  const h1=horizonTimes[1],h2=horizonTimes[2],last=horizonTimes[117];
  const [a,b]=await Promise.all([service.loadMapForecastHour({manifest,conditions:live,time:h1}),service.loadMapForecastHour({manifest,conditions:live,time:h1})]);
  assert.equal(a.generation,timeline.generation);assert.equal(b.time,h1);
  assert.equal(requests.filter(url=>url===hourDocuments.get(h1).url).length,1,'Concurrent consumers share verified in-flight load');
  assert.equal(a.conditions.publicRuntimeAvailability.selectedReferenceAt,generatedAt,'Future view must not fake current clock');
  assert.equal(a.conditions.mapForecastTime,h1);
  assert.equal(a.conditions.zones['zone-1'].flowPoints,null,'NoH0 zone coordinates are reused');cases++;
  assert.equal(mapCoastalPartsForDisplay(null,live.coastalParts),live.coastalParts);
  assert.equal(mapCoastalPartsForDisplay({isNow:true,conditions:a.conditions},live.coastalParts),live.coastalParts);
  assert.equal(mapCoastalPartsForDisplay({isNow:false,conditions:a.conditions},live.coastalParts),a.conditions.coastalParts);
  assert.equal(mapCoastalPartsForDisplay({isNow:false,conditions:{}},live.coastalParts),null,'Missing future evidence must not borrow H0');cases++;
  for(const mode of ['waders','beach'])for(let i=0;i<210;i++){
    const zoneId=zoneIds[i],value=exactMapZoneScore({conditions:a.conditions,time:h1,zoneId,mode});
    assert.equal(value.time,h1);assert.equal(value.score,43+(i%5)+(mode==='beach'?1:0));
    assert.equal(value.localWeather.time,h1);
  }cases++;
  const broken={...a.conditions,coastalParts:{...a.conditions.coastalParts,zones:{...a.conditions.coastalParts.zones,
    'zone-1':{...a.conditions.coastalParts.zones['zone-1'],hourly:[{...a.conditions.coastalParts.zones['zone-1'].hourly[0],time:h2}]}}}};
  assert.equal(exactMapZoneScore({conditions:broken,time:h1,zoneId:'zone-1',mode:'waders'}),null,'Missing exact time never chooses nearest row');cases++;
  const features={features:zoneIds.map(id=>({properties:{id,zoneStatus:'active',dataPoint:[0,0]}}))},water={classifyPoint:()=> 'water'};
  const overview=buildSelectedHourFlowArrows(features,a.conditions.coastalParts,{time:h1,mode:'waders'},7,water);
  assert.equal(overview.length,420);assert.equal(new Set(overview.map(row=>row.zoneId+':'+row.type)).size,420);
  const local=buildSelectedHourFlowArrows(features,a.conditions.coastalParts,{time:h1,mode:'beach'},10,water);
  assert.equal(local.length,1346);assert.ok(local.every(row=>row.point[0]!==0&&row.directionDeg===(row.type==='wind'?91:31)));
  assert.equal(buildSelectedHourFlowArrows(features,a.conditions.coastalParts,{time:h2},7,water).length,0);
  assert.equal(buildSelectedHourFlowArrows(features,a.conditions.coastalParts,{time:h1},7,{classifyPoint:()=> 'land'}).filter(row=>row.type==='current').length,0);cases++;
  const noEvidence=structuredClone(a.conditions.coastalParts);for(const p of Object.values(noEvidence.parts))delete p.flowPoints;
  assert.equal(buildSelectedHourFlowArrows(features,noEvidence,{time:h1},10,water).length,0,'Absence must not invent directions/locations');cases++;
  await service.loadMapForecastHour({manifest,conditions:live,time:last});cases++;
  await assert.rejects(()=>service.loadMapForecastHour({manifest,conditions:live,time:new Date(Date.parse(last)+3600000).toISOString()}),/EXACT_HOUR_UNAVAILABLE/);cases++;
  for(const mutation of ['bytes','sha','offline']){
    service.clearDataMemoryCache();const row=hourDocuments.get(h2);
    corrupt={url:row.url,text:mutation==='bytes'?row.text+' ':row.text.replace('map-timeline-synthetic','Map-timeline-synthetic'),offline:mutation==='offline'};
    await assert.rejects(()=>service.loadMapForecastHour({manifest,conditions:live,time:h2}));cases++;
  }corrupt=null;
  const changedManifest=structuredClone(manifest),bad=structuredClone(hourDocuments.get(h2).document);
  bad.coastalParts.parts['part-1'].current.time=generatedAt;register(bad,changedManifest);
  const changedLive=await service.loadConditions({manifest:changedManifest});assert.equal(changedLive.available,true);
  await assert.rejects(()=>service.loadMapForecastHour({manifest:changedManifest,conditions:changedLive,time:h2}),/stale local/);cases++;
  await assert.rejects(()=>service.loadMapForecastHour({manifest:changedManifest,conditions:live,time:h2}),/GENERATION_MISMATCH/);cases++;
  Date.now=()=>freshNow+3600000;
  assert.equal(service.mapForecastTimeline({manifest,conditions:live}).times.length,117);
  await assert.rejects(()=>service.loadMapForecastHour({manifest,conditions:live,time:generatedAt}),/EXACT_HOUR_UNAVAILABLE/);cases++;
  Date.now=()=>Date.parse(manifest.validUntil)+1;
  assert.throws(()=>service.mapForecastTimeline({manifest,conditions:live}),/expired/);cases++;
  Date.now=()=>freshNow;assert.equal(JSON.stringify(live),before,'Live weather/ranking/assistant/trip source is byte-value unchanged');cases++;

  // Actual UI event wiring with a minimal owned DOM, plus a bounded scheduler
  // and deferred network seam. Real keyboard/touch/browser paint are ROOT gates.
  class Element{
    constructor(){this.attributes={};this.dataset={};this.listeners=new Map();this.children=[];this.hidden=false;this.textContent='';this.value='0';}
    setAttribute(key,value){this.attributes[key]=String(value);}
    addEventListener(key,listener){this.listeners.set(key,listener);}
    append(node){this.children.push(node);}replaceChildren(){this.children=[];}
    dispatch(type){this.listeners.get(type)?.({type,target:this,currentTarget:this});}
    set innerHTML(value){this.html=value;this.nodes=new Map([...value.matchAll(/data-map-time-[a-z]+/g)].map(([key])=>['['+key+']',new Element()]));}
    querySelector(selector){return this.nodes.get(selector);}
  }
  globalThis.document={createElement:()=>new Element()};globalThis.localStorage={getItem:()=> 'da'};
  let timer=0;const timers=new Map(),calls=[],commits=[];
  const controller=createMapForecastController({schedule:fn=>{timers.set(++timer,fn);return timer;},cancel:key=>timers.delete(key),
    loadHour:(time,generation)=>new Promise((resolve,reject)=>calls.push({time,generation,resolve,reject})),onCommit:frame=>commits.push(frame)});
  const host=new Element(),ui=bindMapTimeline(host,controller);
  assert.equal(host.hidden,true,'Do not flash unavailable while initial runtime is still loading');
  controller.configure({generation:'A',times:horizonTimes,live:{time:generatedAt,conditions:live}});
  assert.equal(host.hidden,false);
  assert.equal(calls.length,0);assert.match(host.html,/type="range"[^>]*step="1"/);cases++;
  const range=host.querySelector('[data-map-time-range]');
  for(let i=0;i<250;i++){range.value=String(1+i%117);range.dispatch('input');}
  assert.equal(calls.length,0);assert.equal(timers.size,1,'250 scrubs retain one debounce and no preload');
  range.value='2';range.dispatch('change');await turn();assert.equal(calls.length,1);assert.equal(calls[0].time,h2);
  assert.equal(controller.snapshot().committedTime,generatedAt);
  assert.match(host.querySelector('[data-map-time-committed]').textContent,/Kortet viser/);
  assert.equal(host.querySelector('[data-map-time-requested]').hidden,false);cases++;
  controller.select(last,{immediate:true});await turn();assert.equal(calls.length,1,'Only one physical request may be active');
  calls[0].resolve({generation:'A',time:h2,conditions:{mapForecastTime:h2}});await turn();await turn();
  assert.equal(controller.snapshot().committedTime,generatedAt,'Old response cannot win');assert.equal(calls.length,2);assert.equal(calls[1].time,last);
  calls[1].resolve({generation:'A',time:last,conditions:{mapForecastTime:last}});await turn();
  assert.equal(controller.snapshot().committedTime,last);cases++;
  controller.select(h1,{immediate:true});await turn();calls[2].reject(Error('OFFLINE'));await turn();
  assert.equal(controller.snapshot().status,'error');assert.equal(controller.snapshot().committedTime,last);
  assert.ok(host.querySelector('[data-map-time-committed]').textContent.includes(mapTimelineDate(last)));cases++;
  host.querySelector('[data-map-time-now]').dispatch('click');assert.equal(controller.snapshot().committedTime,generatedAt);assert.equal(calls.length,3);cases++;
  host.querySelector('[data-map-time-next]').dispatch('click');await turn();assert.equal(calls[3].time,h1);
  controller.configure({generation:'B',times:horizonTimes,live:{time:generatedAt,conditions:{datasetId:'B'}}});
  calls[3].resolve({generation:'A',time:h1,conditions:{datasetId:'A',mapForecastTime:h1}});await turn();
  assert.equal(controller.committed.generation,'B');assert.equal(controller.committed.isNow,true);cases++;
  controller.configure({generation:'B',times:horizonTimes.slice(1),live:{time:h1,conditions:{datasetId:'B'}}});
  assert.equal(controller.snapshot().committedTime,h1,'Now follows real runtime hour refresh');cases++;
  controller.configure();assert.equal(controller.snapshot().committedTime,null);assert.equal(range.disabled,true);cases++;
  ui.destroy();controller.destroy();
  for(const language of ['da','de','en']){
    const label=mapTimelineDate('2026-10-18T12:00:00.000Z',language);
    assert.match(label,language==='da'?/Søndag/:language==='de'?/Sonntag/:/Sunday/);
    assert.match(label,/18/);assert.match(label,/14[.:]00/);
  }cases++;
  assert.notEqual(mapTimelineDate('2026-10-25T00:00:00.000Z','da'),mapTimelineDate('2026-10-25T01:00:00.000Z','da'),'Repeated DST hour must have distinct zone labels');cases++;
  assert.equal(mapTimelineDayTicks(['2026-10-17T21:00:00.000Z','2026-10-17T22:00:00.000Z']).length,2,'Day ticks follow Copenhagen midnight');cases++;
  const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8'),html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('class="map-shell"')<html.indexOf('id="mapTimeline"')&&html.indexOf('id="mapTimeline"')<html.indexOf('class="legend"'));
  assert.match(app,/function assistantContext\(\).*currentDisplayFor\(zone\)/);
  assert.match(app,/conditions:state\.conditions,zones:state\.zones/);
  assert.doesNotMatch(app,/state\.conditions\s*=\s*(?:frame|mapForecast|mapConditions)/);cases++;
  console.log(JSON.stringify({status:'PASS_MAP_TIMELINE_LOCAL_ONLY',cases,zones:210,parts:673,scrubEvents:250,
    preloadRequests:0,networkCalls:0,browserPaintMeasured:false,hosted:false}));
}finally{
  globalThis.fetch=saved.fetch;Date.now=saved.now;globalThis.document=saved.document;globalThis.localStorage=saved.storage;service.clearDataMemoryCache();
}
