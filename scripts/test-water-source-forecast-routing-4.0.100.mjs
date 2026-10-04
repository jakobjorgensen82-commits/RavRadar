import assert from 'node:assert/strict';
import { buildWaterSourceForecastIndex, applyWaterSourceForecastStatus, applyWaterSourceRouting, applyVerifiedWaterSourceRoutingToPartHourly } from './lib/water-source-forecast-routing.mjs';
import { compareRavScoreBestTimeCandidates } from '../js/core/best-time-policy.js';
import { comparePublicWeatherHours } from './check-public-weather-continuity.mjs';
import { FUR_WATER_ROUTING_PART_ID, buildFurWaterRoutingDiagnostic,
  validFurWaterRoutingDiagnostic, classifyFurWaterLevelLoss }
  from './lib/fur-water-routing-diagnostic.mjs';
const generatedAt='2026-08-05T06:02:00Z';
const currentHour='2026-08-05T06:00:00.000Z';
const times=Array.from({length:41},(_,i)=>new Date(Date.parse(currentHour)+i*3*3600000).toISOString());
const rows=(base,collection,key,samplingPoint)=>Object.fromEntries(times.map((time,i)=>[time,{
  time,
  'sea-mean-deviation':(base+i)/100,
  sources:{waterLevel:{
    provider:'dmi',fallback:false,collection,collectionFamily:'marine',
    component:'waterLevel',componentKind:'marine-water-level-scalar',
    fieldSet:['sea-mean-deviation'],optionalFieldSet:[],
    modelRun:'2026-08-05T00:00:00Z',nativeValidTime:time,
    leadTimeHours:(Date.parse(time)-Date.parse('2026-08-05T00:00:00Z'))/3600000,
    entityId:`SOURCE::${key}`,parentZoneId:`SOURCE::${key}`,entityType:'water-level-source',
    samplingContext:'water-level-source-point',samplingPoint,gridPoint:samplingPoint,
    gridDefinitionSha256:'a'.repeat(64),distanceKm:0,
    spatialSelection:'nearest-valid-grid-cell-no-spatial-interpolation',spatialSemanticsVersion:1,
    itemId:`item-${key}-${i}`,assetIdentitySha256:'b'.repeat(64),acquiredAt:generatedAt,
  }}
}]));
const sources=[
 {sourceKey:'oceanobs:A',stationId:'A',name:'Målestation A',sourceType:'observation-station',point:[10,56],registryStatus:'active'},
 {sourceKey:'tidewater:B',stationId:'B',name:'Prognosepunkt B',sourceType:'forecast-point',point:[11,56],registryStatus:'active-forecast-point'}
];
const bulk={generatedAt,timeStrideHours:3,zones:{
  'SOURCE::oceanobs:A':{hourly:rows(0,'dkss_idw','oceanobs:A',[10,56])},
  'SOURCE::tidewater:B':{hourly:rows(30,'dkss_nsbs','tidewater:B',[11,56])},
}};
const index=buildWaterSourceForecastIndex(sources,bulk,generatedAt);
assert.equal(index.size,2);
assert.equal(index.get('oceanobs:A').hourly[0].time,currentHour,'Kildeindekset skal bevare den igangværende klokktime efter timevinduet er passeret.');
const aware=applyWaterSourceForecastStatus(sources,index,generatedAt,{minimumHours:96});
assert.ok(aware.every(s=>s.sourceForecastStatus==='receiving'&&s.routingEligible));
const sparseBulk=structuredClone(bulk);
for(const time of times.slice(0,24))delete sparseBulk.zones['SOURCE::tidewater:B'].hourly[time].sources;
const sparseIndex=buildWaterSourceForecastIndex(sources,sparseBulk,generatedAt);
const sparseStatus=applyWaterSourceForecastStatus(sources,sparseIndex,generatedAt,{minimumHours:96});
assert.equal(sparseStatus.find(source=>source.sourceKey==='tidewater:B').sourceForecastStatus,'not-receiving',
  'A late verified point alone must not be reported as a usable 96-hour forecast.');
assert.ok(sparseStatus.find(source=>source.sourceKey==='tidewater:B').sourceForecastVerifiedHours<96);
const sparseOutput={zones:{Z:{point:[10.5,56],current:{waterLevelCm:42,waterLevelSource:'dmi-model-authoritative'},
  forecast:{hourly:index.get('oceanobs:A').hourly.slice(0,118).map(row=>({...row}))},waterLevel:{source:'dmi-model-authoritative'}}}};
applyWaterSourceRouting({features:[{properties:{id:'Z',name:'Testzone',dataPoint:[10.5,56],
  coastLine:[[10,56],[11,56]],onshoreDirectionDeg:0}}],output:sparseOutput,
  forecastStore:{zones:{Z:{hourly:[]}}},sources:aware,index:sparseIndex,
  routing:{zones:{Z:{enabled:true,requireAll:true,stations:[{sourceKey:'oceanobs:A'},{sourceKey:'tidewater:B'}]}}},
  haversineKm:(a,b)=>Math.abs(a[0]-b[0])*60,generatedAt});
assert.equal(sparseOutput.zones.Z.waterLevel.source,'dmi-model-authoritative',
  'A route valid only in later hours must not mislabel current direct DMI water as routed.');
const hourly=index.get('oceanobs:A').hourly.map(r=>({...r,windSpeedMps:1}));
const publicHourly=hourly.slice(0,118).map((row,index)=>({...row,fallbackWind:index>=2?9:null,sources:{...(row.sources??{}),waterLevel:{provider:'dmi',collection:'stale-wrong-collection',modelRun:'stale-wrong-run'}}}));
const output={zones:{Z:{point:[10.5,56],current:{waterLevelCm:null,waterLevelTrendCm3h:999},forecast:{hourly:publicHourly},waterLevel:{}}}};
const store={zones:{Z:{hourly:[...hourly]}}};
const features=[{properties:{id:'Z',name:'Testzone',dataPoint:[10.5,56],coastLine:[[10,56],[11,56]],onshoreDirectionDeg:0}}];
const routing={zones:{Z:{enabled:true,method:'inverse-distance',requireAll:true,stations:[{sourceKey:'oceanobs:A',stationId:'A'},{sourceKey:'tidewater:B',stationId:'B'}]}}};
const hav=(a,b)=>Math.abs(a[0]-b[0])*60;
const result=applyWaterSourceRouting({features,output,forecastStore:store,sources:aware,index,routing,haversineKm:hav,generatedAt});
assert.equal(result.audit.applied,1);
assert.equal(output.zones.Z.waterLevel.interpolation.mode,'admin-override');
assert.equal(output.zones.Z.waterLevel.interpolation.stations.length,2);
assert.equal(output.zones.Z.forecast.hourly[0].waterLevelCm,15);
assert.equal(store.zones.Z.hourly[0].waterLevelCm,15);
assert.equal(output.zones.Z.forecast.hourly[0].sources.waterLevel.collection,'dkss_idw+dkss_nsbs','Den routede værdi skal mærkes med begge faktiske DKSS-collections.');
assert.deepEqual(output.zones.Z.forecast.hourly[0].sources.waterLevel.collections,['dkss_idw','dkss_nsbs']);
assert.equal(output.zones.Z.forecast.hourly[0].sources.waterLevel.modelRun,'2026-08-05T00:00:00Z');
assert.equal(output.zones.Z.forecast.hourly[0].sources.waterLevel.routing,'dmi-water-source-interpolation');
assert.deepEqual(output.zones.Z.forecast.hourly[0].sources.waterLevel.sourceKeys,['oceanobs:A','tidewater:B']);
assert.equal(output.zones.Z.forecast.hourly[0].sources.waterLevel.forecastAgeHours,6.03,'Forecastalder skal fortsat bruge den faktiske genereringstid og ikke det afrundede routingvindue.');
assert.equal(store.zones.Z.hourly[0].sources.waterLevel.collection,'dkss_idw+dkss_nsbs','Forecaststore skal have samme faktiske routingproveniens.');
assert.equal(output.zones.Z.forecast.hourly[2].fallbackWind,9,'Vandstandsrouting mÃ¥ ikke slette komponentvis fallback fra den offentlige prognose.');
assert.equal(store.zones.Z.hourly[2].fallbackWind,undefined,'Den rene DMI-cache skal ikke forurenes med offentlig fallback.');
assert.equal(index.get('oceanobs:A').hourly.length,121,'Privat kildeindex skal bevare H118–H120.');
assert.equal(output.zones.Z.forecast.hourly.length,118,'Routet offentlig prognose må ikke udvides med private støttetimer.');
for(const hour of [115,116,117])assert.equal(output.zones.Z.forecast.hourly[hour].waterLevelTrendCm3h,1,'Alle sidste tre offentlige trends bruger deres præcise private DMI-støttetime.');
assert.equal(output.zones.Z.current.waterLevelTrendCm3h,1,'Aktuel trend skal følge den nyvalgte routede vandstand.');
assert.equal(output.zones.Z.current.sources.waterLevel.collection,'dkss_idw+dkss_nsbs');
const part={partId:'Z-P1',zoneId:'Z',waterPoint:[10.25,56]};
const directPartHourly=times.slice(0,2).map(time=>({time,waterLevelCm:42,
  waterLevelTrendCm3h:6,waterLevelProvenance:{provider:'dmi',status:'verified'},
  sources:{waterLevel:{provider:'dmi',entityId:'PART::Z-P1'}}}));
const partRouting=applyVerifiedWaterSourceRoutingToPartHourly({
  part,parentFeature:features[0],hourly:directPartHourly,
  sources:aware,index,routing,haversineKm:hav,
});
assert.equal(partRouting.appliedHours,2);
assert.equal(partRouting.hourly[0].waterLevelCm,8,
  'The coastal part must use its own water point, not the parent zone’s 15 cm weight.');
assert.equal(partRouting.hourly[0].waterLevelTrendCm3h,1);
assert.equal(partRouting.hourly[0].waterLevelProvenance.provider,'dmi');
assert.equal(partRouting.hourly[0].waterLevelProvenance.targetPartId,part.partId);
assert.equal(partRouting.hourly[0].waterLevelProvenance.entityId,undefined,
  'Routed SOURCE proof must not impersonate a direct PART grid sample.');
const incompleteSourceIndex=new Map(index);
const incompleteB=structuredClone(index.get('tidewater:B'));
incompleteB.hourly.find(row=>row.time===times[1]).waterLevelCm=null;
incompleteSourceIndex.set('tidewater:B',incompleteB);
const incompletePart=applyVerifiedWaterSourceRoutingToPartHourly({
  part,parentFeature:features[0],hourly:directPartHourly,
  sources:aware,index:incompleteSourceIndex,routing,haversineKm:hav,
});
assert.equal(incompletePart.hourly[0].waterLevelCm,8);
assert.equal(incompletePart.hourly[0].waterLevelTrendCm3h,null,
  'An unproved T+3 SOURCE must not create a routed trend.');
assert.equal(incompletePart.hourly[1].waterLevelCm,42,
  'An incomplete routed hour must retain the valid direct DMI PART value.');
const forgedSourceIndex=new Map(index);
// Synthetic Fur candidate-path boundary, NOT attribution of the old run:
// published SOURCE A survives byte-for-byte, but a new A+B bracket is
// incomplete in seven hours and the direct PART never had those values.
// The actual production no-loss comparator must still detect that loss.
const boundaryTimes=index.get('oceanobs:A').hourly.slice(111,118).map(row=>row.time);
assert.equal(boundaryTimes.length,7);
const boundaryDirect=boundaryTimes.map(time=>({time,waterLevelCm:null,
  windSpeedMps:4,windDirectionDeg:0,waveHeightM:0.2,waveDirectionDeg:90,wavePeriodS:4,
  currentSpeedMps:0.1,currentDirectionDeg:0,waterTemperatureC:12}));
const sourceBefore=JSON.stringify(index.get('oceanobs:A'));
const changedBracketIndex=new Map(index);
const incompleteBracket=structuredClone(index.get('tidewater:B'));
for(const row of incompleteBracket.hourly)if(boundaryTimes.includes(row.time))row.waterLevelCm=null;
changedBracketIndex.set('tidewater:B',incompleteBracket);
const singleRoute={zones:{Z:{enabled:true,requireAll:true,stations:[{sourceKey:'oceanobs:A'}]}}};
const routeBoundary=(direct,selectedRouting)=>applyVerifiedWaterSourceRoutingToPartHourly({
  part,parentFeature:features[0],hourly:direct,sources:aware,index:changedBracketIndex,
  routing:selectedRouting,haversineKm:hav}).hourly;
const priorRouted=routeBoundary(boundaryDirect,singleRoute);
const changedRouted=routeBoundary(boundaryDirect,routing);
const sameRouted=routeBoundary(boundaryDirect,singleRoute);
const directControl=routeBoundary(boundaryDirect.map(row=>({...row,waterLevelCm:42})),routing);
const boundaryLosses={changed:0,same:0,directPresent:0};
for(let i=0;i<boundaryTimes.length;i++){
  const time=boundaryTimes[i];
  const doc=(datasetId,row)=>({datasetId,delivery:{kind:'hour',key:time},coastalParts:{parts:{
    [part.partId]:{zoneId:part.zoneId,waterPoint:part.waterPoint,landPoint:[10.26,56],current:{weather:row}}
  }}});
  for(const [key,row] of [['changed',changedRouted[i]],['same',sameRouted[i]],['directPresent',directControl[i]]]){
    const compared=comparePublicWeatherHours(doc('prior',priorRouted[i]),doc('next',row),{
      time,previousDatasetId:'prior',currentDatasetId:'next',partCount:1});
    assert.equal(compared.changedIdentities,0);
    assert.deepEqual({...compared.losses,waterLevel:0},{wind:0,wave:0,current:0,waterLevel:0,waterTemperature:0});
    boundaryLosses[key]+=compared.losses.waterLevel;
  }
}
assert.deepEqual(boundaryLosses,{changed:7,same:0,directPresent:0});
assert.equal(JSON.stringify(index.get('oceanobs:A')),sourceBefore,'Old native SOURCE bank is still intact.');
assert.ok(boundaryDirect.every(row=>row.waterLevelCm===null),'Routing must not mutate direct PART inputs.');
// Exercise the same real router's future private trace, not the unavailable
// historical cipher. The first rollout honestly has no old diagnostic.
const furPart={...part,partId:FUR_WATER_ROUTING_PART_ID,zoneId:'DK-B05-17'};
const furFeature={properties:{...features[0].properties,id:furPart.zoneId}};
const furRoute=original=>({zones:{[furPart.zoneId]:original.zones.Z}});
const furMeta=datasetId=>({datasetId,productionReferenceAt:currentHour,
  generatedAt:new Date(generatedAt).toISOString()});
const captureRoute=(selectedRouting,previousRoutingDiagnostic=null,sourceIndex=changedBracketIndex,
  direct=boundaryDirect)=>applyVerifiedWaterSourceRoutingToPartHourly({
    part:furPart,parentFeature:furFeature,hourly:direct,sources:aware,index:sourceIndex,
    routing:furRoute(selectedRouting),haversineKm:hav,
    diagnosticReferenceAt:currentHour,previousRoutingDiagnostic});
const beforeTrace=captureRoute(singleRoute);
const previousConditions={...furMeta('rr-prior'),
  furWaterRoutingDiagnostic:buildFurWaterRoutingDiagnostic(beforeTrace.diagnostic,furMeta('rr-prior'))};
const currentTrace=captureRoute(routing,previousConditions.furWaterRoutingDiagnostic);
const currentConditions={...furMeta('rr-next'),
  furWaterRoutingDiagnostic:buildFurWaterRoutingDiagnostic(currentTrace.diagnostic,furMeta('rr-next'))};
assert.ok(validFurWaterRoutingDiagnostic(previousConditions.furWaterRoutingDiagnostic));
assert.ok(validFurWaterRoutingDiagnostic(currentConditions.furWaterRoutingDiagnostic));
assert.deepEqual(currentTrace.hourly,changedRouted,'Diagnosis cannot alter routed values or other fields.');
for(const time of boundaryTimes)assert.equal(classifyFurWaterLevelLoss({
  previousConditions,currentConditions,time}),'ROUTE_CHANGED_PREVIOUS_SOURCES_STILL_PRESENT');
assert.equal(classifyFurWaterLevelLoss({previousConditions:{...furMeta('rr-legacy')},
  currentConditions,time:boundaryTimes[0]}),'TRACE_NOT_RECORDED');
const noOldSource=new Map(changedBracketIndex);
noOldSource.delete('oceanobs:A');
const onlyB={zones:{Z:{enabled:true,requireAll:true,stations:[{sourceKey:'tidewater:B'}]}}};
const missingOldTrace=captureRoute(onlyB,previousConditions.furWaterRoutingDiagnostic,noOldSource);
assert.equal(classifyFurWaterLevelLoss({previousConditions,currentConditions:{...furMeta('rr-missing'),
  furWaterRoutingDiagnostic:buildFurWaterRoutingDiagnostic(missingOldTrace.diagnostic,furMeta('rr-missing'))},
  time:boundaryTimes[0]}),'ROUTE_CHANGED_PREVIOUS_SOURCES_NOT_PRESENT');
const movedSourceIndex=new Map(changedBracketIndex);
const movedSource=structuredClone(changedBracketIndex.get('oceanobs:A'));
movedSource.point=[10.01,56];
movedSourceIndex.set('oceanobs:A',movedSource);
const movedSourceTrace=captureRoute(routing,previousConditions.furWaterRoutingDiagnostic,movedSourceIndex);
assert.equal(movedSourceTrace.diagnostic.hours[boundaryTimes[0]].previousSourceSetAvailable,false,
  'The same source key at another sampling point is not the original source identity.');
const nonNumeric=structuredClone(currentConditions.furWaterRoutingDiagnostic);
nonNumeric.trace.hours[boundaryTimes[0]].verifiedSelectedSourceCount='1';
assert.equal(validFurWaterRoutingDiagnostic(nonNumeric),false);
const extra=structuredClone(currentConditions.furWaterRoutingDiagnostic);
extra.trace.privateRawValues=[42];
assert.equal(validFurWaterRoutingDiagnostic(extra),false);
const outside=structuredClone(currentConditions.furWaterRoutingDiagnostic);
outside.trace.hours['2026-08-05T05:00:00.000Z']=outside.trace.hours[boundaryTimes[0]];
assert.equal(validFurWaterRoutingDiagnostic(outside),false);
const wrongDataset={...currentConditions,datasetId:'rr-unrelated'};
assert.equal(classifyFurWaterLevelLoss({previousConditions,currentConditions:wrongDataset,
  time:boundaryTimes[0]}),'TRACE_IDENTITY_OR_FORMAT_INVALID');
const movedContext=structuredClone(currentConditions);
movedContext.furWaterRoutingDiagnostic.trace.contextSha256='f'.repeat(64);
assert.equal(classifyFurWaterLevelLoss({previousConditions,currentConditions:movedContext,
  time:boundaryTimes[0]}),'CONTEXT_CHANGED');
const traceText=JSON.stringify(currentConditions.furWaterRoutingDiagnostic);
for(const forbidden of ['waterLevelCm','samplingPoint','oceanobs:A','tidewater:B',
  'coastLine','weight','modelRun','dkss_idw'])assert.equal(traceText.includes(forbidden),false,forbidden);
assert.ok(Buffer.byteLength(traceText)<32*1024,'Private presence-only trace remains small and bounded.');
assert.equal(partRouting.diagnostic,null,'Non-Fur routing does not acquire a diagnostic.');
const forgedB=structuredClone(index.get('tidewater:B'));
forgedB.hourly[0].sources.waterLevel.entityId='PART::Z-P1';
forgedSourceIndex.set('tidewater:B',forgedB);
const forgedPart=applyVerifiedWaterSourceRoutingToPartHourly({
  part,parentFeature:features[0],hourly:directPartHourly.slice(0,1),
  sources:aware,index:forgedSourceIndex,routing,haversineKm:hav,
});
assert.equal(forgedPart.appliedHours,0);
assert.equal(forgedPart.hourly[0].waterLevelCm,42,
  'A SOURCE record relabelled as a PART must not override direct DMI data.');
// SOURCE identity is global; eligibility must be checked against the TARGET
// zone, including an administrator's explicit station bracket.
const lfBulk=structuredClone(bulk);
lfBulk.zones['SOURCE::oceanobs:A'].hourly=rows(0,'dkss_lf','oceanobs:A',[10,56]);
const lfIndex=buildWaterSourceForecastIndex(sources,lfBulk,generatedAt);
assert.equal(lfIndex.size,2,'Authentic LF sources remain available for allowed target zones.');
for(const [zoneId,allowed] of [['DK-B01-01',false],['DK-B01-02',false],['DK-B02-08',false],['DK-B02-09',false],['DK-B02-11',false],['DK-B03-01',false],['DK-B03-02',false],['DK-B05-17',true],['DK-B02-10',true],['DK-B05-25',true],['DK-B01-03',true]]){
  const targetPart={...part,zoneId},targetFeature={properties:{...features[0].properties,id:zoneId}};
  const targetRouting={zones:{[zoneId]:{enabled:true,requireAll:true,stations:[{sourceKey:'oceanobs:A'}]}}};
  const before=JSON.stringify(directPartHourly);
  const routed=applyVerifiedWaterSourceRoutingToPartHourly({part:targetPart,parentFeature:targetFeature,
    hourly:directPartHourly,sources:aware,index:lfIndex,routing:targetRouting,haversineKm:hav});
  assert.equal(routed.appliedHours,allowed?2:0,zoneId);
  if(!allowed)assert.deepEqual(routed.hourly,directPartHourly,'Excluded SOURCE retains valid direct PART input.');
  assert.equal(JSON.stringify(directPartHourly),before);
  const targetOutput={zones:{[zoneId]:{current:{},forecast:{hourly:structuredClone(directPartHourly)},waterLevel:{}}}};
  const parentResult=applyWaterSourceRouting({features:[targetFeature],output:targetOutput,
    forecastStore:{zones:{}},sources:aware,index:lfIndex,routing:targetRouting,haversineKm:hav,generatedAt});
  assert.equal(parentResult.audit.applied,allowed?1:0,zoneId);
  const nsbsRouting={zones:{[zoneId]:{enabled:true,requireAll:true,stations:[{sourceKey:'tidewater:B'}]}}};
  assert.equal(applyVerifiedWaterSourceRoutingToPartHourly({part:targetPart,parentFeature:targetFeature,
    hourly:directPartHourly,sources:aware,index:lfIndex,routing:nsbsRouting,haversineKm:hav}).appliedHours,2);
}
const directTieHourly=[directPartHourly[0],{...directPartHourly[1],waterLevelCm:5}];
const routedTieHourly=applyVerifiedWaterSourceRoutingToPartHourly({
  part,parentFeature:features[0],hourly:directTieHourly,
  sources:aware,index,routing,haversineKm:hav,
}).hourly;
const candidate=row=>({hour:row,result:{available:true,score:70,scoreQuality:'FULL_HISTORY'}});
assert.ok(compareRavScoreBestTimeCandidates(candidate(directTieHourly[0]),candidate(directTieHourly[1]),'waders')>0);
assert.ok(compareRavScoreBestTimeCandidates(candidate(routedTieHourly[0]),candidate(routedTieHourly[1]),'waders')<0,
  'The admitted routed DMI level must reach the equal-score waders time decision.');
assert.equal(compareRavScoreBestTimeCandidates(candidate(routedTieHourly[0]),candidate(routedTieHourly[1]),'beach')<0,true,
  'Beach timing remains earliest-at-equal-score, not a water-level bonus.');
console.log('OK: målestationer og DMI-prognosepunkter leverer samme DKSS-femdøgnsformat, kan afstandsinterpoleres og styrer zoneprognosen.');
