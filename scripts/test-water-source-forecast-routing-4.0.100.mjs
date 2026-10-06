import assert from 'node:assert/strict';
import { buildWaterSourceForecastIndex, applyWaterSourceForecastStatus, applyWaterSourceRouting, applyVerifiedWaterSourceRoutingToPartHourly, packWaterSourceForecastContinuity, unpackWaterSourceForecastContinuity, mergeWaterSourceForecastContinuity } from './lib/water-source-forecast-routing.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { readDmiForecastFile, writeDmiForecastFileAtomic } from './lib/dmi-forecast-file.mjs';
import { dmiWaterSourceFixture } from './test-helpers/dmi-water-source-fixture.mjs';
import { compareRavScoreBestTimeCandidates } from '../js/core/best-time-policy.js';
import { verifiedDmiForecastSource } from './lib/dmi-forecast-store.mjs';
import { comparePublicWeatherHours } from './check-public-weather-continuity.mjs';
import { packDmiPartContinuity, unpackDmiPartContinuity } from './lib/dmi-part-continuity.mjs';
import { createPersistentDmiStore } from './lib/dmi-acquisition-state.mjs';
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
// Synthetic retained SOURCE seams, not attribution of any historical run.
// Build each alternative through the normal native->hourly producer, then
// replace only the exact support hour in a NEW record. Both endpoint proofs
// remain independently valid; they must also describe the SAME source series.
const sourceSeriesChanges=[
  ['modelRun',proof=>{proof.modelRun='2026-08-05T03:00:00Z';
    proof.leadTimeHours=(Date.parse(proof.nativeValidTime)-Date.parse(proof.modelRun))/3600000;}],
  ['collection',proof=>{proof.collection='dkss_lf';}],
  ['gridDefinition',proof=>{proof.gridDefinitionSha256='c'.repeat(64);}],
  ['gridPoint',proof=>{proof.gridPoint=[proof.samplingPoint[0]+0.01,proof.samplingPoint[1]];
    proof.distanceKm=0.63;}],
];
let sourceSeriesSeams=0;
for(const [changedField,change] of sourceSeriesChanges)for(const source of sources){
  const key=source.sourceKey,alternativeBulk=structuredClone(bulk);
  for(const row of Object.values(alternativeBulk.zones[`SOURCE::${key}`].hourly))change(row.sources.waterLevel);
  const alternativeIndex=buildWaterSourceForecastIndex(sources,alternativeBulk,generatedAt);
  assert.equal(alternativeIndex.get(key)?.hourly.length,121,`${changedField}: independent alternative series`);
  const comparableOutput={zones:{Z:{current:{},forecast:{hourly:structuredClone(publicHourly)},waterLevel:{}}}};
  applyWaterSourceRouting({features,output:comparableOutput,forecastStore:{zones:{}},
    sources:aware,index:alternativeIndex,routing,haversineKm:hav,generatedAt});
  for(const hour of [0,94,115,116,117])assert.equal(
    comparableOutput.zones.Z.forecast.hourly[hour].waterLevelTrendCm3h,1,
    `${changedField}/${key}/H${hour}: comparable alternative is not blanket-rejected`);
  const identity={entityId:`SOURCE::${key}`,parentZoneId:`SOURCE::${key}`,
    entityType:'water-level-source',samplingContext:'water-level-source-point',samplingPoint:source.point};
  for(const hour of [0,94,115,116,117]){
    const seamIndex=new Map(index),record=structuredClone(index.get(key));
    const targetTime=record.hourly[hour].time,futureTime=record.hourly[hour+3].time;
    const future=structuredClone(alternativeIndex.get(key).hourly[hour+3]);
    assert.equal(future.time,futureTime);
    assert.ok(verifiedDmiForecastSource(record.hourly[hour].sources.waterLevel,'waterLevel',targetTime,identity));
    assert.ok(verifiedDmiForecastSource(future.sources.waterLevel,'waterLevel',futureTime,identity));
    record.hourly[hour+3]=future;
    seamIndex.set(key,record);
    const inputBefore=JSON.stringify(record),label=`${changedField}/${key}/H${hour}`;
    const seamOutput={zones:{Z:{current:{},forecast:{hourly:structuredClone(publicHourly)},waterLevel:{}}}};
    const seamStore={zones:{Z:{hourly:structuredClone(hourly)}}};
    applyWaterSourceRouting({features,output:seamOutput,forecastStore:seamStore,
      sources:aware,index:seamIndex,routing,haversineKm:hav,generatedAt});
    const parentRow=seamOutput.zones.Z.forecast.hourly[hour],storeRow=seamStore.zones.Z.hourly[hour];
    const direct=[{...structuredClone(directPartHourly[0]),time:targetTime,
      windSpeedMps:4,waveHeightM:0.2,currentSpeedMps:0.1,waterTemperatureC:12}];
    const directBefore=JSON.stringify(direct);
    const seamPart=applyVerifiedWaterSourceRoutingToPartHourly({part,parentFeature:features[0],
      hourly:direct,sources:aware,index:seamIndex,routing,haversineKm:hav});
    const baselinePart=applyVerifiedWaterSourceRoutingToPartHourly({part,parentFeature:features[0],
      hourly:direct,sources:aware,index,routing,haversineKm:hav});
    const comparablePart=applyVerifiedWaterSourceRoutingToPartHourly({part,parentFeature:features[0],
      hourly:direct,sources:aware,index:alternativeIndex,routing,haversineKm:hav});
    assert.equal(comparablePart.hourly[0].waterLevelTrendCm3h,1,`${label}: comparable PART alternative`);
    assert.equal(seamPart.appliedHours,1,label);
    assert.deepEqual({...seamPart.hourly[0],waterLevelTrendCm3h:baselinePart.hourly[0].waterLevelTrendCm3h},
      baselinePart.hourly[0],`${label}: only PART trend changes`);
    assert.equal(seamPart.hourly[0].waterLevelTrendCm3h,null,`${label}: PART incomparable T+3`);
    assert.equal(parentRow.waterLevelTrendCm3h,null,`${label}: parent incomparable T+3`);
    assert.equal(storeRow.waterLevelTrendCm3h,null,`${label}: pure DMI store incomparable T+3`);
    if(hour===0)assert.equal(seamOutput.zones.Z.current.waterLevelTrendCm3h,null,`${label}: current incomparable T+3`);
    assert.equal(parentRow.waterLevelCm,output.zones.Z.forecast.hourly[hour].waterLevelCm,label);
    assert.equal(storeRow.waterLevelCm,store.zones.Z.hourly[hour].waterLevelCm,label);
    assert.equal(parentRow.fallbackWind,publicHourly[hour].fallbackWind,`${label}: other public fields retained`);
    assert.equal(storeRow.windSpeedMps,hourly[hour].windSpeedMps,`${label}: other store fields retained`);
    for(const field of ['windSpeedMps','waveHeightM','currentSpeedMps','waterTemperatureC'])
      assert.equal(seamPart.hourly[0][field],direct[0][field],`${label}: ${field}`);
    assert.equal(JSON.stringify(direct),directBefore,`${label}: direct input immutable`);
    assert.equal(JSON.stringify(record),inputBefore,`${label}: retained SOURCE immutable`);
    assert.equal(seamOutput.zones.Z.forecast.hourly.length,118,`${label}: private support remains private`);
    assert.deepEqual(seamOutput.zones.Z.waterLevel.interpolation.stations,
      output.zones.Z.waterLevel.interpolation.stations,`${label}: central sources/weights unchanged`);
    sourceSeriesSeams++;
  }
}
assert.equal(sourceSeriesSeams,40,'Both source positions, intermediate and private-tail support seams are covered.');
// Independently rebuild protected SOURCE rows before filling native run seams.
// Keeping all native timestamps does not preserve previously valid derived
// H94/H95/H109/H110 when the currently selected native endpoints cross runs.
const seamBulk=structuredClone(bulk),protectedBulk=structuredClone(bulk);
const seamKey='tidewater:B',seamEntity=`SOURCE::${seamKey}`;
for(const [i,time] of times.entries())if(i>=32){
  const proof=seamBulk.zones[seamEntity].hourly[time].sources.waterLevel;
  proof.modelRun=i<=36?'2026-08-05T03:00:00Z':'2026-08-05T06:00:00Z';
  proof.leadTimeHours=(Date.parse(time)-Date.parse(proof.modelRun))/3600000;
}
const seamBulkBefore=JSON.stringify(seamBulk),protectedBulkBefore=JSON.stringify(protectedBulk);
const unretainedIndex=buildWaterSourceForecastIndex(sources,seamBulk,generatedAt);
const lostDerivedHours=[94,95,109,110];
const unretainedRows=new Map(unretainedIndex.get(seamKey).hourly.map(row=>[row.time,row]));
assert.equal(unretainedRows.size,117);
for(const hour of lostDerivedHours)assert.ok(!unretainedRows.has(index.get(seamKey).hourly[hour].time));
assert.equal(Object.keys(seamBulk.zones[seamEntity].hourly).length,41,'Every native timestamp still survives.');
const retainedIndex=buildWaterSourceForecastIndex(sources,seamBulk,generatedAt,{protectedBulkCache:protectedBulk});
const retainedRecord=retainedIndex.get(seamKey),retainedRows=new Map(retainedRecord.hourly.map(row=>[row.time,row]));
assert.equal(retainedRows.size,121,'Independently qualified protected derived hours must fill all four holes.');
for(const [time,row] of unretainedRows)assert.deepEqual(retainedRows.get(time),row,'Every valid current row and proof is preserved.');
for(const hour of lostDerivedHours)assert.deepEqual(retainedRows.get(index.get(seamKey).hourly[hour].time),
  index.get(seamKey).hourly[hour],'Retained derived row keeps its original complete SOURCE proof.');
const historicalOnlyIndex=buildWaterSourceForecastIndex(sources,seamBulk,generatedAt,{historicalBulkCache:protectedBulk});
assert.deepEqual(historicalOnlyIndex.get(seamKey).hourly,retainedRecord.hourly,'The existing historical donor also qualifies independently.');
const lfSeamBulk=structuredClone(seamBulk),lfProtectedBulk=structuredClone(protectedBulk);
for(const bank of [lfSeamBulk,lfProtectedBulk])for(const row of Object.values(bank.zones[seamEntity].hourly))
  row.sources.waterLevel.collection='dkss_lf';
const lfUnretainedIndex=buildWaterSourceForecastIndex(sources,lfSeamBulk,generatedAt);
const lfBaselineIndex=buildWaterSourceForecastIndex(sources,lfProtectedBulk,generatedAt);
const lfRetainedIndex=buildWaterSourceForecastIndex(sources,lfSeamBulk,generatedAt,{protectedBulkCache:lfProtectedBulk});
assert.equal(lfUnretainedIndex.get(seamKey).hourly.length,117);
assert.equal(lfRetainedIndex.get(seamKey).hourly.length,121,'The water-only LF exception includes independently retained SOURCE rows.');
// Qualification must see the finished union, not the builder's earlier memo.
// Exercise both actual routers on all seven allowed coastal zones plus Fur.
let retentionChecks=0;
for(const [activeIndex,sourceIndex,baselineIndex] of [
  [unretainedIndex,retainedIndex,index],[lfUnretainedIndex,lfRetainedIndex,lfBaselineIndex],
])
for(const zoneId of ['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02','DK-B05-17']){
  const testPart={...part,zoneId},testFeature={properties:{...features[0].properties,id:zoneId}};
  const testRouting={zones:{[zoneId]:routing.zones.Z}};
  const direct=publicHourly.map(row=>({...row,waterLevelCm:null,waterLevelTrendCm3h:null,
    windSpeedMps:4,windDirectionDeg:0,waveHeightM:0.2,waveDirectionDeg:90,wavePeriodS:4,
    currentSpeedMps:0.1,currentDirectionDeg:0,waterTemperatureC:12}));
  const args={part:testPart,parentFeature:testFeature,hourly:direct,sources:aware,
    routing:testRouting,haversineKm:hav};
  const before=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:baselineIndex});
  const missing=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:activeIndex});
  const retained=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:sourceIndex});
  assert.equal(missing.appliedHours,114);
  assert.equal(retained.appliedHours,118,'The fully qualified fresh union reaches the actual PART consumer.');
  const parentOutput={zones:{[zoneId]:{current:{},forecast:{hourly:structuredClone(direct)},waterLevel:{}}}};
  const parentStore={zones:{[zoneId]:{hourly:structuredClone(direct)}}};
  applyWaterSourceRouting({features:[testFeature],output:parentOutput,forecastStore:parentStore,
    sources:aware,index:sourceIndex,routing:testRouting,haversineKm:hav,generatedAt});
  assert.equal(parentOutput.zones[zoneId].forecast.hourly.length,118);
  for(const hour of lostDerivedHours){
    const row=retained.hourly[hour],time=row.time;
    assert.ok(Number.isFinite(row.waterLevelCm));
    assert.ok(Number.isFinite(parentOutput.zones[zoneId].forecast.hourly[hour].waterLevelCm));
    assert.ok(Number.isFinite(parentStore.zones[zoneId].hourly[hour].waterLevelCm));
    assert.equal(row.waterLevelTrendCm3h,null,'A retained scalar is not a comparable trend across a new-run T+3 seam.');
    assert.equal(parentOutput.zones[zoneId].forecast.hourly[hour].waterLevelTrendCm3h,null);
    const doc=(datasetId,weather)=>({datasetId,delivery:{kind:'hour',key:time},coastalParts:{parts:{
      [testPart.partId]:{zoneId,waterPoint:testPart.waterPoint,landPoint:[10.26,56],current:{weather}}
    }}});
    const compared=comparePublicWeatherHours(doc('previous',before.hourly[hour]),doc('next',row),{
      time,previousDatasetId:'previous',currentDatasetId:'next',partCount:1});
    assert.equal(compared.changedIdentities,0);
    assert.deepEqual(compared.losses,{wind:0,wave:0,current:0,waterLevel:0,waterTemperature:0});
    for(const field of ['windSpeedMps','waveHeightM','currentSpeedMps','waterTemperatureC'])
      assert.equal(row[field],direct[hour][field]);
    retentionChecks++;
  }
}
assert.equal(retentionChecks,64);
for(const [label,change] of [
  ['wrong sampling point',proof=>{proof.samplingPoint=[12,56];}],
  ['PART impersonation',proof=>{proof.entityId='PART::Z-P1';}],
  ['missing provider proof',proof=>{proof.provider='missing';}],
  ['unsupported collection',proof=>{proof.collection='dkss_unknown';}],
]){
  const invalidDonor=structuredClone(protectedBulk);
  for(const row of Object.values(invalidDonor.zones[seamEntity].hourly))change(row.sources.waterLevel);
  const rejected=buildWaterSourceForecastIndex(sources,seamBulk,generatedAt,{protectedBulkCache:invalidDonor});
  assert.deepEqual(rejected.get(seamKey).hourly,unretainedIndex.get(seamKey).hourly,label);
}
const missingDonor=structuredClone(protectedBulk);delete missingDonor.zones[seamEntity];
assert.deepEqual(buildWaterSourceForecastIndex(sources,seamBulk,generatedAt,{protectedBulkCache:missingDonor})
  .get(seamKey).hourly,unretainedIndex.get(seamKey).hourly,'A missing selected SOURCE is not fabricated or renormalized.');
assert.equal(JSON.stringify(seamBulk),seamBulkBefore,'Active native originals are immutable.');
assert.equal(JSON.stringify(protectedBulk),protectedBulkBefore,'Protected native originals are immutable.');
const lowerPriorityHistorical=structuredClone(protectedBulk);
for(const row of Object.values(lowerPriorityHistorical.zones[seamEntity].hourly))row['sea-mean-deviation']+=5;
assert.deepEqual(buildWaterSourceForecastIndex(sources,seamBulk,generatedAt,{
  protectedBulkCache:protectedBulk,historicalBulkCache:lowerPriorityHistorical,
}).get(seamKey).hourly,retainedRecord.hourly,'Active then protected then historical priority is preserved.');
const laterReference=new Date(Date.parse(currentHour)+130*3600000).toISOString();
assert.equal(buildWaterSourceForecastIndex(sources,seamBulk,laterReference,{
  protectedBulkCache:protectedBulk,historicalBulkCache:lowerPriorityHistorical,
}).size,0,'Expired donor hours outside the locked horizon are not refreshed or relabelled.');
// Cold-reentry boundary: the normal caller packs the direct DMI PART record
// BEFORE SOURCE routing. That existing pack does not silently persist the RAM
// SOURCE union or the original native bank. If the next protected copy contains
// the same mixed-run native endpoints, previously recovered derived hours are
// absent again. Diagnose this residual; do not call a passing first-generation
// retention test durable retention, or reinterpret aggregate routed provenance
// as the missing original SOURCE evidence.
const coldPartRecord={zoneId:`PART::${part.partId}`,point:part.waterPoint,
  hourly:index.get('oceanobs:A').hourly.map(row=>({time:row.time,waterLevelCm:null,
    sources:{waterLevel:{provider:'missing',fallback:false}}}))};
const coldPack=await packDmiPartContinuity(new Map([[part.partId,coldPartRecord]]),[part],currentHour);
const coldRestored=await unpackDmiPartContinuity(JSON.parse(JSON.stringify(coldPack)),[part],currentHour);
assert.deepEqual(coldRestored.get(part.partId).hourly,coldPartRecord.hourly,
  'Actual existing pack/unpack preserves direct PART absence; it does not invent SOURCE rows.');
let coldReentryLosses=0;
for(const [activeBank,originalBank] of [[seamBulk,protectedBulk],[lfSeamBulk,lfProtectedBulk]]){
  const coldActive=JSON.parse(JSON.stringify(activeBank));
  const coldProtected=JSON.parse(JSON.stringify(activeBank));
  const coldIndex=buildWaterSourceForecastIndex(sources,coldActive,generatedAt,{protectedBulkCache:coldProtected});
  assert.equal(coldIndex.get(seamKey).hourly.length,117,
    'A cold protected copy of mixed native rows is not the original independent 121-hour bank.');
  const withOriginal=buildWaterSourceForecastIndex(sources,coldActive,generatedAt,{
    protectedBulkCache:coldProtected,historicalBulkCache:JSON.parse(JSON.stringify(originalBank)),
  });
  assert.equal(withOriginal.get(seamKey).hourly.length,121,
    'A real independent original donor still qualifies after JSON reentry, without freshening.');
  for(const zoneId of ['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02','DK-B05-17']){
    const testPart={...part,zoneId},testFeature={properties:{...features[0].properties,id:zoneId}};
    const args={part:testPart,parentFeature:testFeature,
      hourly:coldRestored.get(part.partId).hourly,sources:aware,
      routing:{zones:{[zoneId]:routing.zones.Z}},haversineKm:hav};
    const missing=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:coldIndex});
    const retained=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:withOriginal});
    for(const hour of lostDerivedHours){
      const previous=retained.hourly[hour],next=missing.hourly[hour],time=previous.time;
      assert.equal(next.waterLevelCm,null,'Missing original support must remain honestly missing.');
      assert.ok(Number.isFinite(previous.waterLevelCm));
      assert.ok(!verifiedDmiForecastSource(previous.sources.waterLevel,'waterLevel',time,{
        entityId:seamEntity,parentZoneId:seamEntity,entityType:'water-level-source',
        samplingContext:'water-level-source-point',samplingPoint:sources[1].point,
      }),'A final routed PART aggregate cannot impersonate an original SOURCE proof.');
      const doc=(datasetId,weather)=>({datasetId,delivery:{kind:'hour',key:time},coastalParts:{parts:{
        [testPart.partId]:{zoneId,waterPoint:testPart.waterPoint,landPoint:[10.26,56],current:{weather}}
      }}});
      const compared=comparePublicWeatherHours(doc('first',previous),doc('cold-next',next),{
        time,previousDatasetId:'first',currentDatasetId:'cold-next',partCount:1});
      assert.equal(compared.changedIdentities,0);
      assert.deepEqual(compared.losses,{wind:0,wave:0,current:0,waterLevel:1,waterTemperature:0});
      coldReentryLosses+=compared.losses.waterLevel;
    }
  }
}
assert.equal(coldReentryLosses,64,'The real no-loss comparator still blocks this synthetic second-generation boundary.');
console.log('SOURCE_COLD_REENTRY_LEGACY_BOUNDARY: 64 synthetic water losses without an independently retained SOURCE original.');
// Test the other actual normal cold-start boundary before proposing a storage
// fix. The current zone store admits active ZONE records plus PART continuity,
// not a SOURCE bank. Neither a RAM-only root property nor SOURCE:: under zones
// becomes durable just because it survives an intermediate JSON stringify.
// Do not widen the active-zone domain, fake a PART identity or change this ABI.
const zoneCacheRecord={zoneId:'Z',hourly:structuredClone(publicHourly)};
const originalSourceRecord=JSON.parse(JSON.stringify(retainedRecord));
const unsupportedSourceStore={schemaVersion:2,generatedAt:currentHour,horizonHours:118,
  runtime:{nextZoneCursor:1},zones:{Z:zoneCacheRecord,[seamEntity]:originalSourceRecord},
  partContinuity:JSON.parse(JSON.stringify(coldPack)),
  waterSourceForecastIndex:{[seamKey]:originalSourceRecord}};
const unsupportedSourceBefore=JSON.stringify(unsupportedSourceStore);
const normalColdStore=createPersistentDmiStore(
  JSON.parse(JSON.stringify(unsupportedSourceStore)),['Z'],118);
assert.deepEqual(Object.keys(normalColdStore.zones),['Z'],
  'A SOURCE entity is not an admitted coastal zone in the normal persisted store.');
assert.equal(Object.hasOwn(normalColdStore,'waterSourceForecastIndex'),false,
  'An invented root slot is not retained by the actual normal cold-start caller.');
assert.deepEqual(normalColdStore.zones.Z,zoneCacheRecord,'The existing active zone stays unchanged.');
assert.deepEqual(normalColdStore.partContinuity,coldPack,'Existing PART continuity stays unchanged.');
assert.equal(normalColdStore.runtime.nextZoneCursor,1,'The existing scheduler cursor stays unchanged.');
assert.equal(JSON.stringify(unsupportedSourceStore),unsupportedSourceBefore,
  'The independent fixture and its authentic SOURCE originals remain immutable.');
console.log('SOURCE_STORE_ADMISSION_BOUNDARY: normal cold start does not admit a SOURCE-as-zone or invented root bank; existing zone/PART/cursor preserved.');
// A defined optional SOURCE-only bank in the SAME authenticated private
// forecast file now crosses the actual normal cold disk/store boundary.
// Negative legacy evidence above remains: a routed PART is not an original.
const sourceContinuityFolder=await fs.mkdtemp(path.join(os.tmpdir(),'rr-water-source-continuity-'));
let durableSourceChecks=0;
let rollingSourceChecks=0;
try{
  for(const [activeBank,originalBank] of [[seamBulk,protectedBulk],[lfSeamBulk,lfProtectedBulk]]){
    const warmIndex=buildWaterSourceForecastIndex(sources,activeBank,generatedAt,{protectedBulkCache:originalBank});
    const bankBefore=JSON.stringify([activeBank,originalBank,warmIndex.get(seamKey)]);
    const continuity=await packWaterSourceForecastContinuity(warmIndex,currentHour);
    for(const entry of continuity.entries)assert.ok(Buffer.byteLength(JSON.stringify(entry))<1024*1024,
      'Each actual SOURCE entry fits its recordwise writer ceiling; ordinary metadata limits are unchanged.');
    const coldFile=path.join(sourceContinuityFolder,'forecast.json');
    let store={schemaVersion:2,generatedAt:currentHour,horizonHours:121,
      runtime:{nextZoneCursor:1},zones:{Z:structuredClone(zoneCacheRecord)},
      partContinuity:structuredClone(coldPack),waterSourceContinuity:continuity};
    for(let generation=0;generation<3;generation++){
      await writeDmiForecastFileAtomic(coldFile,store);
      const actualCold=await readDmiForecastFile(coldFile);
      store=createPersistentDmiStore(actualCold,['Z'],121);
      assert.deepEqual(store.zones.Z,zoneCacheRecord,'Cold zone original stays unchanged.');
      assert.deepEqual(store.partContinuity,coldPack,'Direct PART pack stays unchanged.');
      assert.equal(store.runtime.nextZoneCursor,1,'Scheduler cursor stays unchanged.');
      const retained=await unpackWaterSourceForecastContinuity(store.waterSourceContinuity,currentHour);
      const restoredIndex=buildWaterSourceForecastIndex(sources,structuredClone(activeBank),generatedAt,{
        protectedBulkCache:structuredClone(activeBank),retainedSourceIndex:retained,
      });
      assert.equal(restoredIndex.get(seamKey).hourly.length,121);
      assert.deepEqual(restoredIndex.get(seamKey).hourly,warmIndex.get(seamKey).hourly,
        'All native/derived SOURCE rows keep their actual original proof across cold disk generations.');
      for(const zoneId of ['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02','DK-B05-17']){
        const testPart={...part,zoneId},testFeature={properties:{...features[0].properties,id:zoneId}};
        const args={part:testPart,parentFeature:testFeature,
          hourly:coldRestored.get(part.partId).hourly,sources:aware,
          routing:{zones:{[zoneId]:routing.zones.Z}},haversineKm:hav};
        const previous=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:warmIndex});
        const next=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:restoredIndex});
        for(const hour of lostDerivedHours){
          const before=previous.hourly[hour],after=next.hourly[hour],time=before.time;
          const doc=(datasetId,weather)=>({datasetId,delivery:{kind:'hour',key:time},coastalParts:{parts:{
            [testPart.partId]:{zoneId,waterPoint:testPart.waterPoint,landPoint:[10.26,56],current:{weather}}
          }}});
          const compared=comparePublicWeatherHours(doc('warm',before),doc('cold',after),{
            time,previousDatasetId:'warm',currentDatasetId:'cold',partCount:1});
          assert.equal(compared.changedIdentities,0);
          assert.deepEqual(compared.losses,{wind:0,wave:0,current:0,waterLevel:0,waterTemperature:0});
          durableSourceChecks++;
        }
      }
      store.waterSourceContinuity=await packWaterSourceForecastContinuity(restoredIndex,currentHour);
    }
    assert.equal(JSON.stringify([activeBank,originalBank,warmIndex.get(seamKey)]),bankBefore,
      'Independent original native banks and their derived records remain immutable.');
    const storedRows=await unpackWaterSourceForecastContinuity(continuity,currentHour);
    const shiftedSources=structuredClone(sources);shiftedSources[1].point=[11.01,56];
    const changedPoint=buildWaterSourceForecastIndex(shiftedSources,seamBulk,generatedAt,{retainedSourceIndex:storedRows});
    assert.equal(changedPoint.has(seamKey),false,'A changed central point cannot use the old SOURCE bank.');
    assert.equal((await unpackWaterSourceForecastContinuity(continuity,laterReference)).size,0,
      'Expired hours never get fresh timestamps or renewed data status.');
    await assert.rejects(unpackWaterSourceForecastContinuity({...continuity,productionReferenceAt:laterReference},currentHour),
      /DMI_WATER_SOURCE_CONTINUITY_MARKER_INVALID/);
    const badRaw=structuredClone(continuity);badRaw.entries[0].rawSha256='0'.repeat(64);
    await assert.rejects(unpackWaterSourceForecastContinuity(badRaw,currentHour),
      /DMI_WATER_SOURCE_CONTINUITY_RAW_INVALID/);
    const badCompressed=structuredClone(continuity);badCompressed.entries[0].compressedSha256='0'.repeat(64);
    await assert.rejects(unpackWaterSourceForecastContinuity(badCompressed,currentHour),
      /DMI_WATER_SOURCE_CONTINUITY_COMPRESSED_INVALID/);
    const altered=structuredClone(warmIndex);altered.get(seamKey).hourly[0].sources.waterLevel.entityId='PART::forged';
    await assert.rejects(packWaterSourceForecastContinuity(altered,currentHour),/DMI_WATER_SOURCE_CONTINUITY_ROW_INVALID/);
    const sparse=buildWaterSourceForecastIndex(sources,activeBank,generatedAt);
    const sparsePack=await packWaterSourceForecastContinuity(sparse,currentHour);
    const merged=await mergeWaterSourceForecastContinuity(sparsePack,continuity,currentHour);
    assert.equal(merged.recoveredHours,4,'Normal failed-run merge adds only the four qualified SOURCE holes.');
    const mergedRows=await unpackWaterSourceForecastContinuity(merged.pack,currentHour);
    for(const row of sparse.get(seamKey).hourly)assert.deepEqual(
      mergedRows.get(seamKey).hourly.find(r=>r.time===row.time),row,'Valid protected hours retain priority and original bytes.');
    assert.equal(mergedRows.get(seamKey).hourly.length,121);
    assert.equal((await mergeWaterSourceForecastContinuity(continuity,sparsePack,currentHour)).recoveredHours,0,
      'A weaker progress snapshot cannot replace complete protected SOURCE rows.');
    // Advance the locked clock, not just restart at the same reference. No
    // new endpoint is invented: retained hours expire, while the pre-existing
    // bounded native nearest-edge rule can still derive one admitted tail hour.
    let rollingPack=continuity;
    for(let shift=1;shift<=3;shift++){
      const reference=new Date(Date.parse(currentHour)+shift*3600000).toISOString();
      const actualGeneration=new Date(Date.parse(reference)+2*60000).toISOString();
      await writeDmiForecastFileAtomic(coldFile,{schemaVersion:2,zones:{Z:zoneCacheRecord},
        waterSourceContinuity:rollingPack});
      const cold=await readDmiForecastFile(coldFile);
      const retained=await unpackWaterSourceForecastContinuity(cold.waterSourceContinuity,reference);
      const saved=await unpackWaterSourceForecastContinuity(cold.waterSourceContinuity,
        cold.waterSourceContinuity.productionReferenceAt);
      assert.deepEqual(retained.get(seamKey).hourly,saved.get(seamKey).hourly
        .filter(row=>Date.parse(row.time)>=Date.parse(reference)),
        'The codec only expires stored hours; it cannot create or refresh any row.');
      const nextIndex=buildWaterSourceForecastIndex(sources,structuredClone(activeBank),actualGeneration,{
        protectedBulkCache:structuredClone(activeBank),retainedSourceIndex:retained});
      assert.equal(nextIndex.get(seamKey).hourly.length,Math.min(121,122-shift),
        'The existing verified 95-minute nearest-edge rule is unchanged.');
      for(const row of nextIndex.get(seamKey).hourly.filter(row=>Date.parse(row.time)>Date.parse(times.at(-1)))){
        assert.equal(row.sources.waterLevel.temporalResolution,'nearest-edge');
        assert.deepEqual(row.sources.waterLevel.nativeValidTimes,[times.at(-1)],
          'Any admitted tail uses the actual old native endpoint, not a fabricated observation.');
        assert.ok(Date.parse(row.time)-Date.parse(times.at(-1))<=95*60000);
      }
      for(const h of lostDerivedHours)assert.deepEqual(
        nextIndex.get(seamKey).hourly.find(row=>row.time===warmIndex.get(seamKey).hourly[h].time),
        warmIndex.get(seamKey).hourly[h],'Rolling retention preserves original SOURCE evidence byte-for-byte.');
      const direct=publicHourly.slice(0,118).map((row,i)=>({...row,
        time:new Date(Date.parse(reference)+i*3600000).toISOString(),waterLevelCm:null,waterLevelTrendCm3h:null}));
      for(const zoneId of ['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02','DK-B05-17']){
        const targetPart={...part,zoneId},feature={properties:{...features[0].properties,id:zoneId}};
        const selectedRouting={zones:{[zoneId]:routing.zones.Z}};
        const args={part:targetPart,parentFeature:feature,hourly:direct,sources:aware,
          routing:selectedRouting,haversineKm:hav,diagnosticReferenceAt:actualGeneration};
        const previous=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:warmIndex});
        const next=applyVerifiedWaterSourceRoutingToPartHourly({...args,index:nextIndex});
        const parentOutput={zones:{[zoneId]:{current:{},forecast:{hourly:structuredClone(direct)},waterLevel:{}}}};
        applyWaterSourceRouting({features:[feature],output:parentOutput,forecastStore:{zones:{}},sources:aware,
          index:nextIndex,routing:selectedRouting,haversineKm:hav,generatedAt:actualGeneration});
        for(const h of lostDerivedHours){
          const time=warmIndex.get(seamKey).hourly[h].time;
          const before=previous.hourly.find(row=>row.time===time),after=next.hourly.find(row=>row.time===time);
          const doc=(datasetId,weather)=>({datasetId,delivery:{kind:'hour',key:time},coastalParts:{parts:{
            [targetPart.partId]:{zoneId,waterPoint:targetPart.waterPoint,landPoint:[10.26,56],current:{weather}}
          }}});
          const compared=comparePublicWeatherHours(doc('warm',before),doc('rolling',after),{
            time,previousDatasetId:'warm',currentDatasetId:'rolling',partCount:1});
          assert.equal(compared.changedIdentities,0);
          assert.deepEqual(compared.losses,{wind:0,wave:0,current:0,waterLevel:0,waterTemperature:0});
          assert.equal(after.sources.waterLevel.forecastAgeHours,Number((6.03+shift).toFixed(2)),
            'PART projection ages retained originals against the actual new reference.');
          assert.equal(parentOutput.zones[zoneId].forecast.hourly.find(row=>row.time===time)
            .sources.waterLevel.forecastAgeHours,Number((6.03+shift).toFixed(2)),'ZONE projection uses the same conservative age.');
          rollingSourceChecks++;
        }
      }
      rollingPack=await packWaterSourceForecastContinuity(nextIndex,reference);
    }
  }
  assert.equal(durableSourceChecks,192,'Three actual cold disk generations exercise the former 64-loss boundary each.');
  assert.equal(rollingSourceChecks,192,'Three advancing references retain all seven zones and Fur for both source collections.');
  assert.equal((await unpackWaterSourceForecastContinuity(null,currentHour)).size,0,'Legacy snapshots without a SOURCE bank remain readable.');
  const mutatedMemo=structuredClone(retainedRecord);
  // First qualify the record in the normal router, then mutate its proof.
  const memoPrime=applyVerifiedWaterSourceRoutingToPartHourly({part,parentFeature:features[0],hourly:coldPartRecord.hourly,
    sources:aware,index:new Map([[seamKey,mutatedMemo]]),
    routing:{zones:{Z:{enabled:true,stations:[{sourceKey:seamKey,stationId:'B'}]}}},haversineKm:hav});
  assert.equal(memoPrime.appliedHours,121,'The actual normal router primes this exact record before mutation.');
  mutatedMemo.hourly[0].sources.waterLevel.entityId='PART::mutated-after-qualification';
  await assert.rejects(packWaterSourceForecastContinuity(new Map([[seamKey,mutatedMemo]]),currentHour),
    /DMI_WATER_SOURCE_CONTINUITY_ROW_INVALID/,'A stale verification memo cannot seal mutated evidence.');
  // Capacity is an actual disk/codec boundary, not a declared constant. Use
  // distinct per-source asset hashes as a conservative synthetic workload.
  const capacitySources=Array.from({length:256},(_,i)=>({sourceKey:`tidewater:CAP${i}`,
    stationId:`CAP${i}`,sourceType:'forecast-point',point:[10+i/10000,56]}));
  const capacityBulk={generatedAt:currentHour,timeStrideHours:3,zones:{}};
  for(const source of capacitySources)capacityBulk.zones[`SOURCE::${source.sourceKey}`]={
    hourly:Object.fromEntries(times.map((time,i)=>{
      const row=dmiWaterSourceFixture(source,time,i,currentHour);
      row.sources.waterLevel.assetIdentitySha256=crypto.createHash('sha256').update(source.sourceKey+time).digest('hex');
      return [time,row];
    }))};
  const capacityIndex=buildWaterSourceForecastIndex(capacitySources,capacityBulk,currentHour);
  const capacityPack=await packWaterSourceForecastContinuity(capacityIndex,currentHour);
  assert.equal(capacityPack.sourceCount,256);
  assert.ok(Buffer.byteLength(JSON.stringify(capacityPack))>1024*1024,
    'This actually crosses the old single-metadata ceiling; the recordwise path is necessary.');
  const capacityFile=path.join(sourceContinuityFolder,'capacity.json');
  await writeDmiForecastFileAtomic(capacityFile,{schemaVersion:2,zones:{Z:zoneCacheRecord},
    waterSourceContinuity:capacityPack});
  const capacityCold=await readDmiForecastFile(capacityFile);
  const capacityRecovered=await unpackWaterSourceForecastContinuity(capacityCold.waterSourceContinuity,currentHour);
  assert.equal(capacityRecovered.size,256);
  let recoveredSourceHours=0;
  for(const [key,record] of capacityRecovered){
    assert.deepEqual(record.hourly,capacityIndex.get(key).hourly);
    recoveredSourceHours+=record.hourly.length;
  }
  assert.equal(recoveredSourceHours,256*121);
  const overCount={...capacityPack,sourceCount:257};
  await assert.rejects(unpackWaterSourceForecastContinuity(overCount,currentHour),/DMI_WATER_SOURCE_CONTINUITY_MARKER_INVALID/);
  console.log(JSON.stringify({kind:'SOURCE_CONTINUITY_RECORDWISE_CAPACITY',sourceCount:256,
    qualifiedSourceHours:recoveredSourceHours,rawBytes:capacityPack.rawBytes,
    compressedBytes:capacityPack.compressedBytes,storedBytes:(await fs.stat(capacityFile)).size,
    synthetic:true,fullNationalJobProven:false}));
}finally{
  assert.equal(path.dirname(sourceContinuityFolder),path.resolve(os.tmpdir()));
  assert.ok(path.basename(sourceContinuityFolder).startsWith('rr-water-source-continuity-'));
  await fs.rm(sourceContinuityFolder,{recursive:true,force:true});
}
console.log('SOURCE_COLD_DISK_CONTINUITY: 192 no-loss checks through three actual same-reference cold restarts; remote durability/public effect still open.');
console.log('SOURCE_ROLLING_DISK_CONTINUITY: 192 no-loss checks at three advancing references; original evidence unchanged, derived age current, no fabricated tail.');
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
for(const [zoneId,allowed] of [['DK-B01-01',true],['DK-B01-02',true],['DK-B02-08',true],['DK-B02-09',true],['DK-B02-11',true],['DK-B03-01',true],['DK-B03-02',true],['DK-B05-17',true],['DK-B02-10',true],['DK-B05-25',true],['DK-B01-03',true]]){
  const targetPart={...part,zoneId},targetFeature={properties:{...features[0].properties,id:zoneId}};
  const targetRouting={zones:{[zoneId]:{enabled:true,requireAll:true,stations:[{sourceKey:'oceanobs:A'}]}}};
  const before=JSON.stringify(directPartHourly);
  const routed=applyVerifiedWaterSourceRoutingToPartHourly({part:targetPart,parentFeature:targetFeature,
    hourly:directPartHourly,sources:aware,index:lfIndex,routing:targetRouting,haversineKm:hav});
  assert.equal(routed.appliedHours,allowed?2:0,zoneId);
  assert.equal(routed.hourly[0].waterLevelTrendCm3h,1,'Verified LF T+3 support is permitted for waterLevel only.');
  if(!allowed)assert.deepEqual(routed.hourly,directPartHourly,'Excluded SOURCE retains valid direct PART input.');
  assert.equal(JSON.stringify(directPartHourly),before);
  const targetOutput={zones:{[zoneId]:{current:{},forecast:{hourly:structuredClone(directPartHourly)},waterLevel:{}}}};
  const parentResult=applyWaterSourceRouting({features:[targetFeature],output:targetOutput,
    forecastStore:{zones:{}},sources:aware,index:lfIndex,routing:targetRouting,haversineKm:hav,generatedAt});
  assert.equal(parentResult.audit.applied,allowed?1:0,zoneId);
  assert.equal(targetOutput.zones[zoneId].forecast.hourly[0].waterLevelTrendCm3h,1,
    'Verified LF T+3 support remains permitted in the parent caller for waterLevel only.');
  const nsbsRouting={zones:{[zoneId]:{enabled:true,requireAll:true,stations:[{sourceKey:'tidewater:B'}]}}};
  assert.equal(applyVerifiedWaterSourceRoutingToPartHourly({part:targetPart,parentFeature:targetFeature,
    hourly:directPartHourly,sources:aware,index:lfIndex,routing:nsbsRouting,haversineKm:hav}).appliedHours,2);
  const mixedRouting={zones:{[zoneId]:routing.zones.Z}};
  const mixed=applyVerifiedWaterSourceRoutingToPartHourly({part:targetPart,parentFeature:targetFeature,
    hourly:directPartHourly,sources:aware,index:lfIndex,routing:mixedRouting,haversineKm:hav});
  assert.equal(mixed.appliedHours,2,'An authentic mixed LF/NSBS central bracket remains usable.');
  assert.equal(mixed.hourly[0].sources.waterLevel.collection,'dkss_lf+dkss_nsbs');
  const missingIndex=new Map(lfIndex),missing=structuredClone(lfIndex.get('tidewater:B'));
  missing.hourly.find(row=>row.time===times[1]).waterLevelCm=null;
  missingIndex.set('tidewater:B',missing);
  const incomplete=applyVerifiedWaterSourceRoutingToPartHourly({part:targetPart,parentFeature:targetFeature,
    hourly:directPartHourly,sources:aware,index:missingIndex,routing:mixedRouting,haversineKm:hav});
  assert.equal(incomplete.hourly[1].waterLevelCm,42,'Missing support still retains direct PART, never renormalizes.');
  assert.equal(incomplete.hourly[0].waterLevelTrendCm3h,null,'Missing T+3 remains unknown.');
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
