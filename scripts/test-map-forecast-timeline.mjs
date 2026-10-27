import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { registerHooks } from 'node:module';
import { setImmediate as turn } from 'node:timers/promises';
import { createMapForecastController, exactMapZoneScore, mapCoastalPartsForDisplay } from '../js/services/map-forecast-view.js';
import { bindMapTimeline, mapTimelineDate, mapTimelineDayTicks } from '../js/ui/map-timeline.js';
import '../js/ui/map-timeline-copy.js?v=4.0.579';
import { buildSelectedHourFlowArrows } from '../js/map/map-view.js';
import * as service from '../js/services/data-service.js';
import { openForecastShareSelection, mountForecastShareControl } from '../js/ui/forecast-share.js';
import { FORECAST_SHARE_BASE_URL, forecastShareUrl, forecastShareCopy } from '../js/services/forecast-share-contract.js';
import forecastShareWorker from './forecast-share/worker.mjs';
import { publicDeliveryGeneration } from '../js/core/public-delivery-contract.js';
import { showZoneInfo, bindZoneInfoInteractions } from '../js/ui/info-panel.js';
import { buildLocalZoneScore, selectLocalBestForDay, isCurrentForecastHour } from '../js/core/local-zone-score.js';
import { forecastDateKeyInTimeZone, visibleForecastDays } from '../js/core/forecast-calendar.js';
import { getLanguage, getLocale, t } from '../js/i18n.js';
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
  targetManifest.detailDelivery[document.delivery.kind==='zone'?'zones':'hours'][document.delivery.key]=descriptor;
  const url=`./data/live/forecast/${sha256}.json?dataset=${targetManifest.datasetId}&sha=${sha256}`;
  documents.set(url,text);return{document,url,text};
}
for(const i of selectedIndices){const time=horizonTimes[i];hourDocuments.set(time,register(buildPublicDeliveryDocument(source,details,manifest,'hour',time)));}
const rankedZoneIds=[...new Set(Object.values(startup.nationalForecast.modes).flatMap(days=>days.flatMap(day=>day.rows.slice(0,1).map(row=>row.zoneId))))];
const zoneDocuments=new Map(rankedZoneIds.map(id=>[id,register(buildPublicDeliveryDocument(source,details,manifest,'zone',id))]));
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

  // Demand-only sharing uses the same normal projected zone document and
  // registry as this existing full-domain fixture. No real network or score
  // producer is substituted; response bodies use the platform stream API.
  const shareZoneId=rankedZoneIds[0],shareRow=zoneDocuments.get(shareZoneId);
  const shareSelection={zoneId:shareZoneId,time:h1,mode:'waders',language:'da'};
  function shareFixture({mutateDocument=null,mutateManifest=null,zoneText=null,registryText=zoneRegistryText,onRead=()=>{},responseStatus=200,location=null}={}){
    const target=structuredClone(manifest),document=structuredClone(shareRow.document);
    if(mutateDocument){
      mutateDocument(document);
      const text=compactJson(document),sha256=sha256Text(text);
      target.detailDelivery.zones[shareZoneId]={path:'./forecast/'+sha256+'.json',sha256,bytes:Buffer.byteLength(text)};
    }
    if(mutateManifest)mutateManifest(target);
    const entry=target.detailDelivery.zones[shareZoneId],path='./data/live/'+entry.path.slice(2);
    const documents=new Map([['./data/live/manifest.json',compactJson(target)],
      [path,zoneText??compactJson(document)],['./data/zones.geojson',registryText]]);
    const reads=[];
    return{reads,fetchPublic:async(path,options)=>{
      reads.push(path);assert.equal(options.cache,'no-store');assert.ok(options.signal);
      onRead(path);assert.ok(documents.has(path),'Only the existing three fixed public inputs may be requested');
      return new Response(documents.get(path),{status:responseStatus,headers:{'Content-Type':'application/json',...(location===null?{}:{Location:location})}});
    }};
  }
  for(const mode of ['waders','beach']){
    const fixture=shareFixture(),selection={...shareSelection,mode};
    const shared=await service.loadPublicForecastShareSelection(selection,fixture);
    const normal=exactMapZoneScore({conditions:a.conditions,time:h1,zoneId:shareZoneId,mode});
    assert.equal(shared.result.score,normal.score);assert.equal(shared.result.time,h1);
    assert.equal(shared.zoneName,JSON.parse(zoneRegistryText).features.find(row=>row.properties.id===shareZoneId).properties.name);
    assert.deepEqual(shared.selection,selection);assert.equal(fixture.reads.length,3);
    assert.deepEqual(Object.keys(shared.result).sort(),['available','localCoverage','score','scoreQuality','time']);
    assert.equal(Object.isFrozen(shared.result),true);cases++;
  }
  for(const [zoneText,reason] of [
    [shareRow.text+' ',/FORECAST_SHARE_BYTES_INVALID/],
    [shareRow.text.replace('map-timeline-synthetic','Map-timeline-synthetic'),/FORECAST_SHARE_BINDING_INVALID/],
  ]){
    await assert.rejects(()=>service.loadPublicForecastShareSelection(shareSelection,shareFixture({zoneText})),reason);cases++;
  }
  for(const [mutateDocument,reason] of [
    [document=>{const score=document.coastalParts.zones[shareZoneId].hourly[1].waders;
      score.modelBinding={...score.modelBinding,modelBundleSha256:'0'.repeat(64)};},/model|bundle/i],
    [document=>{const part=Object.values(document.coastalParts.parts)[0];
      part.ravScoreEvidenceTrust={...part.ravScoreEvidenceTrust,status:'UNVERIFIED'};},/VERIFIED_ONLY/],
    [document=>{document.coastalParts.zones[shareZoneId].hourly[1].time=h2;},/row time mismatch/],
  ]){
    await assert.rejects(()=>service.loadPublicForecastShareSelection(shareSelection,shareFixture({mutateDocument})),reason);cases++;
  }
  await assert.rejects(()=>service.loadPublicForecastShareSelection(shareSelection,shareFixture({
    mutateManifest:target=>{target.ravScoreModelBinding.modelBundleSha256='0'.repeat(64);},
  })),/model|bundle/i);cases++;
  await assert.rejects(()=>service.loadPublicForecastShareSelection(shareSelection,shareFixture({
    registryText:zoneRegistryText.replace('Zone 1','Zone X'),
  })),/FORECAST_SHARE_BINDING_INVALID/);cases++;
  for(const selection of [{...shareSelection,zoneId:'not-in-manifest'},
    {...shareSelection,time:new Date(Date.parse(last)+3600000).toISOString()}]){
    const fixture=shareFixture();assert.equal(await service.loadPublicForecastShareSelection(selection,fixture),null);
    assert.deepEqual(fixture.reads,['./data/live/manifest.json']);cases++;
  }
  const elapsed=shareFixture({onRead:path=>{
    if(path==='./data/zones.geojson')Date.now=()=>freshNow+2*3600000;
  }});
  try{assert.equal(await service.loadPublicForecastShareSelection(shareSelection,elapsed),null,
    'A selected hour that expires during I/O must not borrow the new current hour');}
  finally{Date.now=()=>freshNow;}cases++;

  // Faktisk Worker-indgang -> uændret handler -> den eksisterende normale læser.
  // Kun transporten er syntetisk; shareFixture leverer de samme autentificerbare
  // manifest-/zone-/registerbytes som ovenfor. Ingen ny model eller prognose bygges.
  const shareBase='https://ravradar-prognosedeling.jakob-jorgensen82.workers.dev/';
  assert.equal(FORECAST_SHARE_BASE_URL,shareBase);
  const workerConfig=JSON.parse(await fs.readFile(new URL('./forecast-share/wrangler.jsonc',import.meta.url),'utf8'));
  assert.deepEqual(workerConfig,{name:'ravradar-prognosedeling',main:'worker.mjs',
    compatibility_date:'2026-10-24',workers_dev:true,preview_urls:false},
    'Ingen assets, routes, databaser, KV, R2, cron, vars eller secrets i konfigurationen');cases++;
  const escapeShareAttribute=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;');
  async function shareWorkerRequest(url,{fixture=shareFixture(),method='GET',headers={},body=null}={}){
    const originalFetch=globalThis.fetch,upstream=[];
    globalThis.fetch=async(input,options)=>{
      const target=new URL(input);
      upstream.push({url:target.href,redirect:options.redirect,credentials:options.credentials,headers:options.headers});
      return fixture.fetchPublic('.'+target.pathname,options);
    };
    try{
      const request=new Request(url,{method,headers,...(body===null?{}:{body})});
      const response=await forecastShareWorker.fetch(request,{
        shareBaseUrl:'https://forged.invalid/',PUBLIC_PAGE:'https://forged.invalid/',
        fetchPublic:()=>assert.fail('Miljøet må ikke udskifte den normale transport'),
      });
      const html=await response.text();
      // Kontroller uden for handlerens fail-closed catch: et forkert upstreamkald
      // må ikke skjules som blot en utilgængelig prognose i denne prøve.
      for(const call of upstream){
        const target=new URL(call.url);
        assert.equal(target.origin,'https://ravradar.dk');
        assert.equal(target.search,'');assert.equal(target.hash,'');
        assert.equal(target.username,'');assert.equal(target.password,'');
        assert.ok(['/data/live/manifest.json','/data/zones.geojson'].includes(target.pathname)
          || /^\/data\/live\/forecast\/[a-f0-9]{64}\.json$/.test(target.pathname));
        assert.equal(call.redirect,'manual');assert.equal(call.credentials,'omit');
        assert.deepEqual(call.headers,{Accept:'application/json'});
      }
      return{response,html,reads:fixture.reads,upstream};
    }finally{globalThis.fetch=originalFetch;}
  }
  for(const language of ['da','de','en'])for(const mode of ['waders','beach']){
    const selection={...shareSelection,language,mode},url=forecastShareUrl(shareBase,selection);
    const expected=exactMapZoneScore({conditions:a.conditions,time:h1,zoneId:shareZoneId,mode});
    const result=await shareWorkerRequest(url,{headers:{Authorization:'Bearer synthetic',Cookie:'synthetic=1',
      'X-Forwarded-Host':'forged.invalid','X-Share-Base-Url':'https://forged.invalid/'}});
    assert.equal(result.response.status,200);assert.equal(result.reads.length,3);
    assert.equal(result.response.headers.get('content-type'),'text/html; charset=utf-8');
    assert.equal(result.response.headers.get('cache-control'),'no-store');
    assert.equal(result.response.headers.get('referrer-policy'),'no-referrer');
    assert.equal(result.response.headers.get('x-content-type-options'),'nosniff');
    assert.equal(result.response.headers.get('content-security-policy'),"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    assert.ok(result.html.startsWith('<!doctype html><html lang="'+language+'">'));
    assert.ok(result.html.includes('<meta property="og:title" content="'));
    assert.ok(result.html.includes(forecastShareCopy(language).score+' '+expected.score+'/100'));
    const modeMarker=escapeShareAttribute(' · '+forecastShareCopy(language)[mode]+' · ');
    assert.ok((result.html.match(/<meta property="og:description" content="([^"]*)">/)?.[1]??'').includes(modeMarker)
      &&(result.html.match(/<\/h1><p>([^<]*)<\/p>/)?.[1]??'').includes(modeMarker),
      'Both OG and visible forecast text must name the exact selected search mode');
    assert.ok(result.html.includes('<meta property="og:url" content="'+escapeShareAttribute(url)+'">'));
    assert.ok(result.html.includes('<link rel="canonical" href="'+escapeShareAttribute(url)+'">'));
    assert.ok(result.html.includes('<meta property="og:image" content="https://ravradar.dk/assets/icons/ravradar-512.png">'));
    assert.ok(result.html.includes('href="'+escapeShareAttribute(forecastShareUrl('https://ravradar.dk/',selection))+'"'));
    assert.doesNotMatch(result.html,/<script|forged\.invalid|synthetic=|Bearer synthetic|modelBundleSha256|coastalParts/);cases++;
  }
  const shareUrl=forecastShareUrl(shareBase,shareSelection);
  const head=await shareWorkerRequest(shareUrl,{method:'HEAD'});
  assert.equal(head.response.status,200);assert.equal(head.html,'');assert.equal(head.reads.length,3);
  assert.equal(head.response.headers.get('content-type'),'text/html; charset=utf-8');
  assert.equal(head.response.headers.get('cache-control'),'no-store');cases++;
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){
    const result=await shareWorkerRequest(shareUrl,{method,body:'{"score":100,"upstream":"https://forged.invalid/"}'});
    assert.equal(result.response.status,405);assert.equal(result.response.headers.get('allow'),'GET, HEAD');
    assert.equal(result.html,'');assert.equal(result.upstream.length,0);cases++;
  }
  for(const url of [shareUrl.replace('https:','http:'),shareUrl.replace('ravradar-prognosedeling.','other.'),
    shareUrl.replace('/?','/other?')]){
    const result=await shareWorkerRequest(url);assert.equal(result.response.status,503);
    assert.equal(result.upstream.length,0);assert.doesNotMatch(result.html,/\d+\/100/);cases++;
  }
  for(const extra of ['&score=100','&upstream=https%3A%2F%2Fforged.invalid%2F','&shareBaseUrl=https%3A%2F%2Fforged.invalid%2F','&zone=another']){
    const result=await shareWorkerRequest(shareUrl+extra);assert.equal(result.response.status,400);
    assert.equal(result.upstream.length,0);assert.doesNotMatch(result.html,/\d+\/100|forged\.invalid/);cases++;
  }
  const facebook=await shareWorkerRequest(shareUrl+'&fbclid=synthetic');
  assert.equal(facebook.response.status,200);assert.equal(facebook.reads.length,3);
  assert.doesNotMatch(facebook.html,/fbclid|synthetic/);
  assert.ok(facebook.html.includes('content="'+escapeShareAttribute(shareUrl)+'"'));cases++;
  const unavailableShare=async(fixture,url=shareUrl)=>{
    const result=await shareWorkerRequest(url,{fixture});
    assert.equal(result.response.status,200);
    assert.ok(result.html.includes(forecastShareCopy('da').unavailable));
    assert.doesNotMatch(result.html,/\d+\/100|FORECAST_SHARE_|modelBundleSha256|forged\.invalid/);
    return result;
  };
  for(const fixture of [
    shareFixture({zoneText:shareRow.text+' '}),
    shareFixture({zoneText:shareRow.text.replace('map-timeline-synthetic','Map-timeline-synthetic')}),
    shareFixture({mutateManifest:target=>{target.ravScoreModelBinding.modelBundleSha256='0'.repeat(64);}}),
    shareFixture({mutateDocument:document=>{
      const row=document.coastalParts.zones[shareZoneId].hourly[1].waders;
      row.modelBinding={...row.modelBinding,modelBundleSha256:'0'.repeat(64)};
    }}),
    shareFixture({registryText:zoneRegistryText.replace('Zone 1','Zone X')}),
  ]){await unavailableShare(fixture);cases++;}
  // Workerens manuelle redirect svarer aldrig ved at hente Location. Den normale
  // læser afviser alle 3xx før JSON/digest, og den offentlige fejl er stadig ærlig.
  for(const status of [301,302,303,307,308]){
    const result=await unavailableShare(shareFixture({responseStatus:status,location:'https://forged.invalid/redirect'}));
    assert.deepEqual(result.reads,['./data/live/manifest.json']);
    assert.equal(result.upstream.length,1);assert.equal(result.upstream[0].redirect,'manual');cases++;
  }
  const forgedPath=await unavailableShare(shareFixture({mutateManifest:target=>{
    target.detailDelivery.zones[shareZoneId].path='https://forged.invalid/forecast.json';
  }}));
  assert.deepEqual(forgedPath.reads,['./data/live/manifest.json']);cases++;
  const outside=await unavailableShare(shareFixture(),forecastShareUrl(shareBase,{...shareSelection,
    time:new Date(Date.parse(last)+3600000).toISOString()}));
  assert.deepEqual(outside.reads,['./data/live/manifest.json']);cases++;
  try{
    Date.now=()=>freshNow+2*3600000;
    const expired=await unavailableShare(shareFixture());
    assert.deepEqual(expired.reads,['./data/live/manifest.json']);
  }finally{Date.now=()=>freshNow;}cases++;
  try{
    const expiredDuringRead=await unavailableShare(shareFixture({onRead:path=>{
      if(path==='./data/zones.geojson')Date.now=()=>freshNow+2*3600000;
    }}));
    assert.equal(expiredDuringRead.reads.length,3);
  }finally{Date.now=()=>freshNow;}cases++;


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
    constructor(){this.style={};this.attributes={};this.dataset={};this.listeners=new Map();this.children=[];this.hidden=false;this.textContent='';this.value='0';this.isConnected=true;}
    setAttribute(key,value){this.attributes[key]=String(value);}
    addEventListener(key,listener){this.listeners.set(key,listener);}
    append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}
    dispatch(type){return this.listeners.get(type)?.({type,target:this,currentTarget:this});}
    showModal(){this.open=true;}close(){this.open=false;this.dispatch('close');}
    remove(){this.isConnected=false;}focus(){this.focused=true;}select(){this.selected=true;}
    set innerHTML(value){this.html=value;this.nodes=new Map([...value.matchAll(/data-map-time-[a-z]+/g)].map(([key])=>['['+key+']',new Element()]));}
    querySelector(selector){return this.nodes.get(selector);}
  }
  globalThis.document={createElement:()=>new Element(),body:new Element()};globalThis.localStorage={getItem:()=> 'da'};
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

  // The normal startup selector owns no newer user intention. Check before
  // any setMode/localStorage/controller mutation, and again before openZone.
  const repeated=['2026-10-25T00:00:00.000Z','2026-10-25T01:00:00.000Z'];
  const start='2026-10-24T23:00:00.000Z';
  for(const selectedTime of repeated)for(const scenario of ['ready','prior-user','later-user','generation','rollover','error']){
    const calls=[],opens=[],modes=[],notices=[];let intent=0;
    const sharedController=createMapForecastController({loadHour:(time,generation)=>new Promise((resolve,reject)=>calls.push({time,generation,resolve,reject}))});
    sharedController.configure({generation:'share-A',times:[start,...repeated],live:{time:start,conditions:{}}});
    if(scenario==='prior-user')intent++; // Same final mode is still a newer explicit choice.
    openForecastShareSelection({incoming:{status:'valid',selection:{zoneId:'Z',time:selectedTime,mode:'beach',language:'da'}},
      controller:sharedController,zones:{features:[{properties:{id:'Z'}}]},
      setMode:mode=>modes.push(mode),openZone:zone=>opens.push(zone.id),notice:value=>notices.push(value),
      isStillRequested:()=>intent===0});
    if(scenario==='prior-user'){
      assert.equal(modes.length,0);assert.equal(calls.length,0);
      assert.equal(sharedController.snapshot().requestedTime,start);
    }else{
      await turn();assert.equal(calls.length,1);assert.equal(calls[0].time,selectedTime);
      assert.equal(sharedController.snapshot().committedTime,start,'Pending link is not the displayed hour');
      if(scenario==='later-user'){intent++;sharedController.now();}
      if(scenario==='generation')sharedController.configure({generation:'share-B',times:[start,...repeated],live:{time:start,conditions:{}}});
      if(scenario==='rollover'){
        const advanced=new Date(Date.parse(selectedTime)+3600000).toISOString();
        sharedController.configure({generation:'share-A',times:[advanced],live:{time:advanced,conditions:{}}});
      }
      if(scenario==='error')calls[0].reject(Error('UNAVAILABLE'));
      else calls[0].resolve({generation:'share-A',time:selectedTime,conditions:{}});
      await turn();await turn();
      if(scenario==='ready'){assert.deepEqual(opens,['Z']);assert.equal(sharedController.snapshot().committedTime,selectedTime);}
      else assert.deepEqual(opens,[],'A late shared response cannot replace a newer user/time/generation');
      assert.equal(calls.length,1,'No fallback or retry');
    }
    sharedController.destroy();cases++;
  }
  for(const incoming of [{status:'invalid'},{status:'valid',selection:{zoneId:'missing',time:repeated[0],mode:'waders',language:'da'}},
    {status:'valid',selection:{zoneId:'Z',time:'2026-10-26T00:00:00.000Z',mode:'waders',language:'da'}}]){
    const sharedController=createMapForecastController({loadHour:()=>{throw Error('NO_FALLBACK_FETCH');}});
    sharedController.configure({generation:'A',times:repeated,live:{time:repeated[0],conditions:{}}});
    openForecastShareSelection({incoming,controller:sharedController,zones:{features:[{properties:{id:'Z'}}]},
      setMode:()=>assert.fail('No mode mutation'),openZone:()=>assert.fail('No zone substitution'),notice:()=>{}});
    assert.equal(sharedController.snapshot().committedTime,repeated[0]);sharedController.destroy();cases++;
  }

  assert.equal(mapTimelineDayTicks(['2026-10-17T21:00:00.000Z','2026-10-17T22:00:00.000Z']).length,2,'Day ticks follow Copenhagen midnight');cases++;
  const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8'),html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('class="map-shell"')<html.indexOf('id="mapTimeline"')&&html.indexOf('id="mapTimeline"')<html.indexOf('class="legend"'));
  assert.match(app,/function assistantContext\(\).*currentDisplayFor\(zone\)/);
  assert.match(app,/conditions:state\.conditions,zones:state\.zones/);
  assert.doesNotMatch(app,/state\.conditions\s*=\s*(?:frame|mapForecast|mapConditions)/);cases++;

  // Actual national ranking event -> existing Now controller -> actual app
  // open/render/detail route. The normal bound zone envelope is loaded only
  // on click; no score/model authority comes from this owned DOM fixture.
  const appSource=app.replace(/\r\n/g,'\n');
  const fragment=(start,end)=>{
    const from=appSource.indexOf(start),to=appSource.indexOf(end,from+start.length);
    assert.ok(from>=0&&to>from,'Normal zone caller boundary absent: '+start);return appSource.slice(from,to);
  };
  class Button {
    constructor(dataset={}){this.dataset=dataset;this.events=new Map();this.classList={toggle(){}};}
    addEventListener(event,callback){this.events.set(event,callback);}
    click(){this.events.get('click')?.();}
  }
  const mapCallbacks=[...appSource.matchAll(/zone=>\{noteForecastShareUserIntent\(\);openZone\(zone,\{scroll:false\}\);\}/g)].map(row=>row[0]);
  assert.equal(mapCallbacks.length,2,'Both actual map callbacks keep their old selected-hour entrypoint');
  for(const language of ['da','de','en'])for(const mode of ['waders','beach']){
    globalThis.localStorage={getItem:()=>language};
    const panelCalls=[],shareCalls=[],loaded=[],errors=[];
    const panel={innerHTML:'',hidden:true,querySelector:selector=>selector==='.zone-header'
      ?{insertAdjacentElement:(_position,button)=>{panel.shareButton=button;}}:null,addEventListener(){},removeEventListener(){},
      prepend(){},scrollIntoView(){},replaceChildren(){this.innerHTML='';}};
    const list={style:{setProperty(){}},buttons:[],querySelectorAll:()=>list.buttons,
      set innerHTML(html){this.html=html;this.buttons=[...html.matchAll(/data-zone-id="([^"]+)"/g)].map(row=>new Button({zoneId:row[1]}));}};
    const national={tabs:[],querySelector:()=>list,querySelectorAll:()=>national.tabs,
      set innerHTML(html){this.tabs=[...html.matchAll(/data-day-index="(\d+)"/g)].map(row=>new Button({dayIndex:row[1]}));}};
    let releaseLate=null,holdLate=false,currentLoad=null,verifiedLoad=null;
    const uiState={mode,selectedZone:null,currentScores:new Map(),forecastGroups:new Map(),forecastRenderId:0,
      zones:features,zoneLayer:{selectZone(){}},conditions:live,flowArrows:{refresh(){}}};
    const context={state:uiState,Map,Promise,Date,Intl,console:{warn(){},error:error=>errors.push(error)},
      infoPanel:panel,nationalForecast:national,coreViewReady:false,selectedZonePartsVisible:false,
      URL,forecastShareUserIntent:0,forecastShareControlCleanup:()=>{},mapForecastTimeline:service.mapForecastTimeline,
      mountForecastShareControl:(host,options)=>{shareCalls.push(options);return mountForecastShareControl(host,options);},
      activeManifest:manifest,runtimeGeneration:1,pendingZoneDetails:new Map(),conditionDetailsPromise:null,conditionDetailsReady:false,
      performance:{mark(){}},mapScores:new Map(),resetAssistantTopic(){},
      document:{baseURI:'https://ravradar.invalid/',querySelector:()=>null,createElement:()=>({}),body:{classList:{add(){},remove(){}}}},
      map:{setView(){},getZoom:()=>7,invalidateSize(){}},requestAnimationFrame:callback=>callback(),
      refreshZoneStyles(){},showSelectedZoneParts(){},renderRanking(){},yieldToBrowser:async()=>{},
      hasNumber:Number.isFinite,isCurrentForecastHour,forecastDateKeyInTimeZone,visibleForecastDays,
      buildLocalZoneScore,selectLocalBestForDay,exactMapZoneScore,getLanguage,getLocale,t,
      mapTimelineDate,formatDateTime:value=>value,scoreRating:()=>({level:'good'}),exceptionalScoreMark:()=>'',scoreQualityMarker:()=>'',
      loadConditionDetails:async options=>{loaded.push(options.zoneId);return service.loadConditionDetails(options);},
      mergeConditionDetails:service.mergeConditionDetails,bindZoneInfoInteractions,
      showZoneInfo:(...args)=>{panelCalls.push(args);return showZoneInfo(...args);}};
    const controller=createMapForecastController({
      loadHour:time=>{
        verifiedLoad=service.loadMapForecastHour({manifest,conditions:live,time});
        currentLoad=verifiedLoad.then(verified=>holdLate
          ?new Promise(resolve=>{releaseLate=()=>resolve(verified);}):verified);
        return currentLoad;
      },onCommit:frame=>context.handleMapForecastCommit(frame)});
    context.mapForecast=controller;
    vm.createContext(context);
    vm.runInContext([
      fragment('function noteForecastShareUserIntent()','const mapTimelineHost'),
      fragment('function handleMapForecastCommit(frame)','function configureMapTimeline()'),
      fragment('function refreshMapDisplay()','let publicTripEvidenceRuntime'),
      fragment('function emergencySnapshotReferenceAt()','function resultFor(zone)'),
      fragment('function currentScoreFor(zone)','function nationalRankingRow(row)'),
      fragment('function renderSelectedZone()','function renderRanking()'),
      fragment('function groupHoursForZone(zone)','const yieldToBrowser='),
      fragment('async function renderNationalForecast()','function ensureConditionDetails('),
      fragment('function ensureConditionDetails(','function nextConditionRuntimeGateAt('),
    ].join('\n'),context,{filename:'normal-national-zone-now-callers.js'});
    controller.configure({generation:timeline.generation,times:horizonTimes,live:{time:generatedAt,conditions:live}});
    context.coreViewReady=true;
    controller.select(h1,{immediate:true});await turn();await currentLoad;await turn();
    assert.equal(controller.snapshot().status,'ready');
    const mapOpen=vm.runInContext('('+mapCallbacks[0]+')',context),zone=features.features.find(row=>row.properties.id===rankedZoneIds[0]).properties;
    mapOpen(zone);assert.equal(controller.snapshot().committedTime,h1);
    assert.equal(panelCalls.at(-1)[5].mapForecastTime,h1);
    assert.equal(shareCalls.at(-1).selection.time,h1);assert.equal(shareCalls.at(-1).selection.mode,mode);
    panel.shareButton.dispatch('click');const earlierShareDialog=globalThis.document.body.children.at(-1);
    assert.equal(earlierShareDialog.open,true,'Actual app mounts a share dialog for its committed hour');
    const generatedShareInput=earlierShareDialog.children[1].children.find(node=>node.type==='text');
    assert.equal(generatedShareInput.value,forecastShareUrl(FORECAST_SHARE_BASE_URL,shareCalls.at(-1).selection),
      'Den faktiske UI ignorerer Pages-adressen og bruger den faste godkendte Worker-rute');
    assert.doesNotMatch(panel.innerHTML,/data-forecast-section|data-tide-section/);
    assert.equal(loaded.length,0,'A future map click keeps the existing single-hour route');
    assert.equal(await context.renderNationalForecast(),true);
    // Select an available later national day first; resetting the map must not
    // rewrite national dates/ranks or auto-select a different national day.
    const lastTab=national.tabs.at(-1);lastTab.click();
    const selectedDayMarkup=list.html,firstButton=list.buttons[0];assert.ok(firstButton);
    firstButton.click();const pending=context.conditionDetailsPromise;if(pending)await pending;
    assert.equal(earlierShareDialog.isConnected,false,'Top20/Now must dispose an already open future-hour dialog');
    assert.equal(controller.snapshot().committedTime,generatedAt,'National forecast zone click must synchronously select existing Now');
    assert.equal(controller.snapshot().requestedTime,generatedAt);
    assert.equal(panelCalls.at(-1)[5].mapForecastTime,null);
    assert.equal(panelCalls.at(-1)[2].time,generatedAt,'Normal cards are current, not the selected future hour');
    assert.match(panel.innerHTML,/data-forecast-section/);assert.match(panel.innerHTML,/data-tide-section/);
    assert.doesNotMatch(panel.innerHTML,/map-timeline-zone-scope/);
    const summary=JSON.parse(panel.innerHTML.match(/class="forecast-payload">([^<]+)</)[1]);
    assert.equal(summary[0].date,forecastDateKeyInTimeZone(freshNow),'Calendar remains based on real Now');
    assert.equal(summary.length,5);assert.equal(summary.flatMap(day=>day.hours).length,118);
    assert.equal(list.html,selectedDayMarkup,'National selected day and ranking markup are unchanged');
    assert.deepEqual(loaded,[firstButton.dataset.zoneId]);
    assert.equal(uiState.conditions.publicRuntimeAvailability.selectedReferenceAt,generatedAt);
    assert.equal(uiState.conditions.deliveryManifestIdentity,live.deliveryManifestIdentity);
    const zoneLoads=requests.filter(url=>[...zoneDocuments.values()].some(row=>row.url===url));
    assert.ok(zoneLoads.length<=rankedZoneIds.length,'Only explicitly opened zone envelopes are requested');
    // A previously started selected-hour load may still finish after Now.
    // It must not restore the future projection or selected-hour zone cards.
    controller.select(h1,{immediate:true});await turn();await currentLoad;await turn();
    assert.equal(controller.snapshot().status,'ready');
    holdLate=true;controller.select(last,{immediate:true});
    await turn();await verifiedLoad;await turn();assert.ok(releaseLate);
    firstButton.click();assert.equal(controller.snapshot().committedTime,generatedAt);
    releaseLate();await currentLoad;await turn();
    assert.equal(controller.snapshot().committedTime,generatedAt);
    assert.equal(controller.snapshot().requestedTime,generatedAt);
    assert.equal(panelCalls.at(-1)[5].mapForecastTime,null);assert.match(panel.innerHTML,/data-forecast-section/);
    assert.equal(errors.length,0);assert.equal(JSON.stringify(live),before,'Original live input is unchanged');
    // The actual caller's fresh timeline check, not a synthetic age predicate,
    // rejects both copy/share after the real selected hour has rolled out.
    for(const actionIndex of [0,1]){
      context.renderSelectedZone();panel.shareButton.dispatch('click');
      const expiredDialog=globalThis.document.body.children.at(-1);
      assert.equal(expiredDialog.open,true);
      const options=shareCalls.at(-1);assert.equal(options.isSelectionCurrent(options.selection),true);
      Date.now=()=>freshNow+3600000;
      try{
        assert.equal(options.isSelectionCurrent(options.selection),false);
        const actions=expiredDialog.children[1].children.find(node=>node.className==='button-row');
        await actions.children[actionIndex].dispatch('click');
        assert.equal(expiredDialog.isConnected,false,'Rollover closes the old score before any share/copy call');
      }finally{Date.now=()=>freshNow;}
    }
    context.renderSelectedZone();panel.shareButton.dispatch('click');
    const replacedDialog=globalThis.document.body.children.at(-1);assert.equal(replacedDialog.open,true);
    controller.configure({generation:'synthetic-next-generation',times:horizonTimes,
      live:{time:generatedAt,conditions:live}});
    assert.equal(replacedDialog.isConnected,false,'Actual controller commit -> app render closes the old generation dialog');
    controller.configure({generation:timeline.generation,times:horizonTimes,live:{time:generatedAt,conditions:live}});
    panel.shareButton.dispatch('click');const closingDialog=globalThis.document.body.children.at(-1);
    assert.equal(closingDialog.open,true);context.closeZone();
    assert.equal(closingDialog.isConnected,false,'Actual closeZone disposes the owned dialog');
    controller.destroy();cases++;
  }
  globalThis.localStorage={getItem:()=> 'da'};
  // The actual day renderer must keep every calendar day on one bounded row.
  // Pixel rectangles below are layout arithmetic, not a browser/font-paint claim.
  for(const language of ['da','de','en'])for(const count of [4,5,6])for(const viewport of [320,375,390,414]){
    const starts={4:'2026-10-18T03:00:00.000Z',5:'2026-10-18T21:00:00.000Z',6:'2026-10-18T21:00:00.000Z'};
    const lengths={4:78,5:76,6:118},start=Date.parse(starts[count]);
    const times=Array.from({length:lengths[count]},(_,i)=>new Date(start+i*3600000).toISOString());
    globalThis.localStorage={getItem:()=>language};
    const ticks=mapTimelineDayTicks(times,language);assert.equal(ticks.length,count);
    const geometries=ticks.map(tick=>({left:(tick.centre-tick.width/2)*(viewport-20),right:(tick.centre+tick.width/2)*(viewport-20)}));
    assert.ok(geometries[0].left>=-1e-9);assert.ok(geometries.at(-1).right<=viewport-20+1e-9);
    for(let i=1;i<ticks.length;i++)assert.ok(geometries[i].left>=geometries[i-1].right-1e-9,'No day label rectangles overlap');
    const dayController=createMapForecastController({loadHour:async time=>({generation:'days',time,conditions:{}})});
    const dayHost=new Element(),dayUi=bindMapTimeline(dayHost,dayController);
    dayController.configure({generation:'days',times,live:{time:times[0],conditions:{}}});
    const children=dayHost.querySelector('[data-map-time-days]').children;
    const buttons=children.filter(node=>node.type==='button'),boundaries=children.filter(node=>node.className==='map-timeline-day-boundary');
    assert.equal(buttons.length,count);assert.equal(boundaries.length,count-1);
    for(let i=0;i<count;i++){
      assert.equal(buttons[i].textContent,ticks[i].weekday+'\n'+ticks[i].date);
      assert.equal(buttons[i].attributes['aria-label'],ticks[i].label);
      assert.equal(parseFloat(buttons[i].style.left),ticks[i].centre*100);
      assert.equal(parseFloat(buttons[i].style.width),ticks[i].width*100);
      buttons[i].dispatch('click');assert.equal(dayController.snapshot().requestedTime,times[ticks[i].index]);
      if(i)assert.equal(parseFloat(boundaries[i-1].style.left),ticks[i].index/(times.length-1)*100,'Boundary is the real midnight hour, not equal spacing');
    }
    assert.ok(ticks.some((tick,i)=>Math.abs(tick.centre-(i+.5)/count)>.001),'Partial days do not use a fake equal-time axis');
    dayUi.destroy();dayController.destroy();cases++;
  }
  globalThis.localStorage={getItem:()=> 'da'};
  for(const times of [[],['2026-10-18T12:00:00.000Z']]){
    const ticks=mapTimelineDayTicks(times,'da');assert.equal(ticks.length,times.length);
    if(ticks.length)assert.equal(ticks[0].centre,.5);
  }
  console.log(JSON.stringify({status:'PASS_MAP_TIMELINE_LOCAL_ONLY',cases,zones:210,parts:673,scrubEvents:250,
    preloadRequests:0,networkCalls:0,browserPaintMeasured:false,hosted:false}));
}finally{
  globalThis.fetch=saved.fetch;Date.now=saved.now;globalThis.document=saved.document;globalThis.localStorage=saved.storage;service.clearDataMemoryCache();
}
