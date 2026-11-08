import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { applyWaterSourceRouting, buildWaterSourceForecastIndex, applyWaterSourceForecastStatus } from './lib/water-source-forecast-routing.mjs';
import { recommendWaterStationBracket } from '../js/core/water-station-routing.js';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';
import { dmiWaterSourceFixture } from './test-helpers/dmi-water-source-fixture.mjs';

const generatedAt='2026-08-05T12:00:00Z';
const times=Array.from({length:40},(_,i)=>new Date(Date.parse(generatedAt)+i*3*3600000).toISOString());
const sources=[
  {sourceKey:'oceanobs:NEAR',stationId:'NEAR',name:'Nær målestation',sourceType:'observation-station',point:[10.40,56.00],registryStatus:'active',properties:{status:'Active',parameterId:['sealev_dvr']}},
  {sourceKey:'tidewater:FAR',stationId:'FAR',name:'Fjernt prognosepunkt',sourceType:'forecast-point',point:[11.00,56.00],registryStatus:'active-forecast-point',properties:{status:'Active'}}
];
const series=(source,base)=>Object.fromEntries(times.map((time,i)=>[
  time,dmiWaterSourceFixture(source,time,base+i,generatedAt),
]));
const bulk={generatedAt,timeStrideHours:3,zones:{
  'SOURCE::oceanobs:NEAR':{hourly:series(sources[0],10)},
  'SOURCE::tidewater:FAR':{hourly:series(sources[1],50)}
}};
const index=buildWaterSourceForecastIndex(sources,bulk,generatedAt);
const aware=applyWaterSourceForecastStatus(sources,index,generatedAt,{minimumHours:96});
assert.equal(index.size,2);
assert.ok(aware.every(s=>s.routingEligible));

const R=6371,toRad=x=>x*Math.PI/180;
const haversineKm=(a,b)=>{const dLat=toRad(b[1]-a[1]),dLon=toRad(b[0]-a[0]);const q=Math.sin(dLat/2)**2+Math.cos(toRad(a[1]))*Math.cos(toRad(b[1]))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q));};
const point=[10.50,56.00];
const feature={properties:{id:'Z',name:'Produktionskæde test',dataPoint:point,coastLine:[[10.0,56],[11.2,56]],onshoreDirectionDeg:0}};
const auto=recommendWaterStationBracket({zoneId:'Z',zoneName:feature.properties.name,point,coastLine:feature.properties.coastLine,onshoreDirectionDeg:0,stations:aware,haversineKm});
assert.equal(auto.stations.length,2,'Automatikken skal kunne vælge to kilder.');
const expectedNear=1/haversineKm(point,sources[0].point),expectedFar=1/haversineKm(point,sources[1].point);
const expectedNearWeight=expectedNear/(expectedNear+expectedFar);
const nearAuto=auto.stations.find(s=>s.stationId==='NEAR');
assert.ok(Math.abs(nearAuto.weight-expectedNearWeight)<1e-9,'Automatisk interpolation skal bruge reel geografisk afstand.');
assert.ok(nearAuto.weight>0.80,'Den geografisk nærmeste kilde skal få klart størst vægt i testen.');

function run(routing){
  const hourly=index.get('oceanobs:NEAR').hourly.map(row=>({...row,waterLevelCm:null}));
  const output={zones:{Z:{point,current:{waterLevelCm:null},forecast:{hourly:[...hourly]},waterLevel:{}}}};
  const store={zones:{Z:{hourly:[...hourly]}}};
  const result=applyWaterSourceRouting({features:[feature],output,forecastStore:store,sources:aware,index,routing,haversineKm,generatedAt});
  return {result,output,store};
}

const automatic=run({zones:{}});
assert.equal(automatic.result.audit.applied,1);
assert.equal(automatic.output.zones.Z.waterLevel.interpolation.mode,'automatic');
assert.equal(automatic.output.zones.Z.waterLevel.interpolation.stations.length,2);
assert.deepEqual(automatic.output.zones.Z.forecast.hourly.map(r=>r.waterLevelCm),automatic.store.zones.Z.hourly.map(r=>r.waterLevelCm),'ForecastStore og zonens time-for-time-serie skal være identiske.');
assert.equal(automatic.output.zones.Z.current.waterLevelCm,automatic.output.zones.Z.forecast.hourly[0].waterLevelCm,'Aktuel vandstand skal komme fra samme routede serie.');

const override=run({zones:{Z:{enabled:true,method:'inverse-distance',requireAll:true,stations:[{sourceKey:'tidewater:FAR',stationId:'FAR'}]}}});
assert.equal(override.result.audit.applied,1);
assert.equal(override.output.zones.Z.waterLevel.interpolation.mode,'admin-override');
assert.equal(override.output.zones.Z.waterLevel.interpolation.stations.length,1);
assert.equal(override.output.zones.Z.waterLevel.interpolation.stations[0].weight,1);
assert.equal(override.output.zones.Z.forecast.hourly[0].waterLevelCm,50,'Administratoroverride skal alene styre den producerede vandstandsserie.');

const workflow=await readProductionWorkflowSource('build');
assert.match(workflow,/--exclude '_support\/'/,'Pages-artifact skal udelukke supportmappen.');
assert.match(workflow,/--exclude 'RavRadar-support-\*\.zip'/,'Pages-artifact skal udelukke support-ZIP.');
const registry=await fs.readFile('scripts/update-water-source-registry.mjs','utf8');
assert.match(registry,/\/tidewaterstation\/items/,'DMI bruger den singulære tidewaterstation-collection.');
assert.doesNotMatch(registry,/\/tidewaterstations\/items/,'Det fejlagtige plurale endpoint må ikke bruges.');
assert.match(registry,/discovery/,'Kilderegisteret skal dokumentere discovery-resultatet.');
const updater=await fs.readFile('scripts/update-weather.mjs','utf8');
assert.match(updater,/buildWaterSourceForecastIndex\(rawStationRegistry, dmiBulkCache, generatedAt, \{\s*protectedBulkCache: deployedDmiBulkCache,\s*historicalBulkCache: historicalDmiBulkCache,\s*retainedSourceIndex: retainedWaterSourceIndex,\s*\}\)/,
  'The one normal SOURCE index must consume the existing protected and historical native banks before parent/PART planning and scoring.');
assert.match(updater,/unpackWaterSourceForecastContinuity\(\s*dmiForecastStore.waterSourceContinuity, canonicalForecastHour\(generatedAt\),/,
  'The normal cold caller must qualify SOURCE continuity at its locked reference.');
assert.match(updater,/nextDmiForecastStore.waterSourceContinuity = await packWaterSourceForecastContinuity\(\s*waterSourceForecastIndex, canonicalForecastHour\(generatedAt\),/,
  'Independent SOURCE proof must be saved before it is routed into parent/PART values.');
assert.ok(updater.indexOf('nextDmiForecastStore.waterSourceContinuity = await')
  < updater.indexOf('const waterSourceApplication = applyWaterSourceRouting'),
  'Derived routed aggregates must never be captured as original SOURCE records.');
assert.match(updater,/referenceMs \+ \(OPEN_METEO_FUTURE_HOURS - 1\) \* 3_600_000/,'Fallback must request the exact locked horizon including private H120 support.');
assert.match(updater,/start_hour: startHour, end_hour: endHour/,'Independent requests must keep the same locked start and end even across UTC hour boundaries.');
assert.doesNotMatch(updater,/forecast_days:\s*'5'/,'Five calendar days truncate the future fallback horizon later in the day.');
assert.match(updater,/water-source-audit\.json/,'Vejrkørslen skal skrive en fuld audit af alle vandstandskilder.');

console.log('OK: Pages-sikkerhed, geografiske vægte, automatisk routing, administratoroverride og produceret time-for-time-serie er regressionstestet samlet.');

// The observer consumes no one-use origin handle and releases only AFTER the
// existing whole normal finalizer. It is not a replacement gate or public data.
const observationImport=updater.indexOf("import { captureLf7MemoryObservation, writeLf7FurConsumerObservation }");
assert.ok(observationImport>=0);
assert.ok(updater.indexOf('captureLf7MemoryObservation({ part:')>updater.indexOf('productionSeries = buildRavScoreProductionPartSeries({'));
assert.ok(updater.indexOf('await writeLf7FurConsumerObservation({ conditions: output,')
  >updater.indexOf('await buildEstablishedNativeCurrentOriginAttestation(establishedNativeCurrentOrigin,'));
assert.doesNotMatch(updater,/assertEstablishedNativeCurrentOriginForPart\(/,'The wrapper must not consume the per-part authority again.');
const observer=await fs.readFile('scripts/lib/lf7-fur-consumer-observation.mjs','utf8');
assert.match(observer,/partResults.get\(row.observation.partId\) !== row.result/,'Only exact already-finalized result references are summarized.');
assert.match(observer,/NOT_EXPOSED_BY_COMPACT_MEMORY/,'Compact memory never invents contribution provenance.');
assert.match(observer,/OBSERVATION_NOT_AUTHORITY/);
assert.match(observer,/32768/,'Private output has a fixed small byte bound.');
assert.match(observer,/\.geometry-v2-work\/lf7-fur-consumer-observation-v1\.json/);
assert.doesNotMatch(observer,/assertEstablishedNativeCurrentOriginForPart|readEstablishedNativeCurrentOrigin|fetch\(/);
// Negative observation-only fixtures cannot substitute a cloned result for the
// exact normal finalized map. They mint no B/S or producer authority.
const {captureLf7MemoryObservation,writeLf7FurConsumerObservation}=await import('./lib/lf7-fur-consumer-observation.mjs');
const observationPart={partId:'synthetic-lf7-part',zoneId:'DK-B01-01',waterPoint:[10,56],landPoint:[10,55],onshoreDirectionDeg:0};
const observationResult={currentSourceDomainTransition:null};
const observation=captureLf7MemoryObservation({part:observationPart,
  initialSelection:{source:'EXISTING_INTEGRATED',state:{privateSentinel:'DO_NOT_EMIT'}},
  previousCandidateGContinuation:null,productionSeries:observationResult,hasEstablishedOrigin:true});
assert.doesNotMatch(JSON.stringify(observation.observation),/DO_NOT_EMIT|waterPoint|landPoint|currentUMps|currentVMps/);
assert.equal(observation.observation.perContributionNativeProvenance,'NOT_EXPOSED_BY_COMPACT_MEMORY');
assert.equal(await writeLf7FurConsumerObservation({conditions:{},partResults:new Map(),memoryObservations:[],waterObservations:[]}),false);
const observationHash='a'.repeat(64);
const formatOnlyAttestation={attestationSha256:observationHash,parent:{bundleContentSha256:observationHash,generationSha256:observationHash},
  producer:{integrated:observationHash,candidate:observationHash,continuation:observationHash},
  registrySha256:observationHash,contextRegistrySha256:observationHash,pairsSha256:observationHash};
assert.equal(await writeLf7FurConsumerObservation({conditions:{privateEstablishedNativeCurrentOrigin:formatOnlyAttestation},
  partResults:new Map([[observationPart.partId,structuredClone(observationResult)]]),
  memoryObservations:[observation],waterObservations:[]}),false);

// Normal exported CODE inventory: the added helper is physically covered by RAW.
const family=await import('./lib/source-producer-after597-runtime-family.mjs');
const observationOwner='scripts/lib/lf7-fur-consumer-observation.mjs';
assert.equal(family.SOURCE_PRODUCER_AFTER597_CODE_FILES.filter(file=>file===observationOwner).length,1);
assert.equal(family.SOURCE_PRODUCER_AFTER597_RAW_CODE_FILES.filter(file=>file===observationOwner).length,1);
assert.deepEqual([...family.SOURCE_PRODUCER_AFTER597_CODE_FILES].sort(),family.SOURCE_PRODUCER_AFTER597_CODE_FILES);
assert.equal(new Set(family.SOURCE_PRODUCER_AFTER597_CODE_FILES).size,family.SOURCE_PRODUCER_AFTER597_CODE_FILES.length);
assert.equal(workflow.split('            .geometry-v2-work/lf7-fur-consumer-observation-v1.json').length,2);
const sourceControlUpload=workflow.split('      - name: Upload an actually observed payload-free SOURCE control summary\n');
assert.equal(sourceControlUpload.length,2);
const sourceControlBody=sourceControlUpload[1].split('\n      - name: ')[0];
assert.match(sourceControlBody,/if: always\(\) && hashFiles\('\.geometry-v2-work\/weather-source-operational-control-summary\.json'\) != ''/);
assert.match(sourceControlBody,/retention-days: 30/);
assert.match(sourceControlBody,/if-no-files-found: error/);
const lf7Path='.geometry-v2-work/lf7-fur-consumer-observation-v1.json';
const sourceSidecar=sourceControlBody.split('\n').find(line=>line.includes(lf7Path));
assert.ok(sourceSidecar,'The existing private SOURCE control artifact carries the sidecar.');
const sidecarExpression=sourceSidecar.trim().slice(3,-2).trim()
  .replace(/\bsteps\.([a-z-]+)/g,(_,id)=>'steps['+JSON.stringify(id)+']');
const observeSourceSidecar=({family='true',kind='PREPARED_WEATHER',owner='success',seal='success'}={})=>
  runInNewContext(sidecarExpression,{steps:{
    'operational-model':{outputs:{source_normal_producer:family}},
    'weather-route-result':{outputs:{source_result_kind:kind}},
    'source-normal':{outcome:owner},
    'source-operational-handoff-seal':{outcome:seal},
  }});
assert.equal(observeSourceSidecar(),lf7Path);
for(const unavailable of [{family:'false'},{family:''},{kind:'NO_WORK'},{kind:'SAVED_PAIR'},
  {owner:'failure'},{owner:'skipped'},{seal:'failure'},{seal:'skipped'}])
  assert.equal(observeSourceSidecar(unavailable),'');
const normalTail=await fs.readFile('scripts/source-normal-producer-tail.mjs','utf8');
const ownedWeatherPaths=normalTail.match(/^  weather: Object\.freeze\(\[\.\.\.new Set\(\[[\s\S]*?\]\)\]\),$/m);
assert.ok(ownedWeatherPaths?.[0].includes("'"+lf7Path+"'"),
  'The normal SOURCE weather phase owns the exact report through its regular file-closure path.');

// Only private observation code is faulted. Normal producer/routing calls keep
// their existing uncaught failure and score semantics.
const {beginLf7WaterObservation,observeLf7WaterDecision}=await import('./lib/lf7-fur-consumer-observation.mjs');

const componentRow = (offset, values={}) => ({
  time: new Date(Date.parse(generatedAt) + offset*3_600_000).toISOString(), ...values,
});
const verified = (collection,provider='dmi') => ({ status:'verified',provider,collection });
const selectedObservation = captureLf7MemoryObservation({part:observationPart,
  initialSelection:{source:'EXISTING_INTEGRATED',state:null}, previousCandidateGContinuation:null,
  productionSeries:{recovery:{scoreStartAt:generatedAt,hourly:[
    componentRow(-1,{currentSpeedMps:1,currentDirectionDeg:1,currentProvenance:verified('dkss_lf')}),
    componentRow(0,{currentSpeedMps:0,currentDirectionDeg:1,currentProvenance:verified('dkss_lf'),
      waterTemperatureC:0,waterTemperatureProvenance:verified('dkss_lf')}),
    componentRow(1,{currentSpeedMps:1,currentDirectionDeg:1,currentProvenance:verified(undefined),
      waterTemperatureC:1,waterTemperatureProvenance:verified(undefined,'open-meteo')}),
    componentRow(2,{sources:{current:verified('dkss_lf'),waterTemperature:verified('dkss_lf')}}),
    componentRow(3,{currentStateOnlyHold:{collection:'dkss_lf'},waterTemperatureC:1}),
    componentRow(4,{currentSpeedMps:1,currentDirectionDeg:1,currentProvenance:verified('dkss_nsbs')}),
    componentRow(4), componentRow(118,{waterTemperatureC:1,waterTemperatureProvenance:verified('dkss_lf')}),
  ]}}, hasEstablishedOrigin:true});
assert.deepEqual(selectedObservation.observation.selectedPartComponents,[
  4, [1,0,1,115,1,1], [1,1,1,115],
]);
assert.deepEqual(observation.observation.selectedPartComponents,[
  0, [0,0,0,118,0,0], [0,0,0,118],
]);
assert.doesNotMatch(JSON.stringify(selectedObservation.observation),/currentSpeedMps|currentDirectionDeg|waterTemperatureC/);

const tailContext={zoneId:'DK-B01-01',partId:observationPart.partId,stream:'PART_PUBLIC',
  referenceAt:generatedAt,rows:[{sourceKey:'synthetic',weight:1}]};
const tailObservation=beginLf7WaterObservation(tailContext);
const sourceEndpoint={sources:{waterLevel:verified('dkss_lf')}};
const otherEndpoint={sources:{waterLevel:verified('dkss_nsbs')}};
observeLf7WaterDecision(tailObservation,{time:componentRow(115).time,branch:'APPLIED',
  sourceRows:[otherEndpoint],futureRows:[otherEndpoint],trendKnown:true});
observeLf7WaterDecision(tailObservation,{time:componentRow(116).time,branch:'noSelection'});
assert.deepEqual(tailObservation.tailSupport,[
  [true,'VERIFIED',1,0], [true,'NOT_USED',null,null], [false,'UNKNOWN',null,null],
]);
observeLf7WaterDecision(tailObservation,{time:componentRow(117).time,branch:'APPLIED',
  sourceRows:[sourceEndpoint],futureRows:[sourceEndpoint],trendKnown:false});
assert.deepEqual(tailObservation.tailSupport[2],[true,'UNKNOWN',null,null]);
const finalTail=beginLf7WaterObservation(tailContext);
observeLf7WaterDecision(finalTail,{time:componentRow(117).time,branch:'APPLIED',
  sourceRows:[sourceEndpoint],futureRows:[sourceEndpoint],trendKnown:true});
assert.deepEqual(finalTail.tailSupport[2],[true,'VERIFIED',1,1]);


const observationZoneIds=['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02'];
const allResults=new Map(), allMemory=[], allWater=[];
for(const [index,zoneId] of observationZoneIds.entries()){
  const parts=index<3?3:2;
  for(let part=0;part<parts;part++){
    const partId=zoneId.toLowerCase()+'-national-part-'+String(part+1).padStart(2,'0');
    const result=selectedObservation.result;
    const memory=captureLf7MemoryObservation({part:{...observationPart,zoneId,partId},
      initialSelection:{source:'EXISTING_INTEGRATED',state:null},previousCandidateGContinuation:null,
      productionSeries:result,hasEstablishedOrigin:true});
    allResults.set(partId,result);
    allMemory.push(memory);
    allWater.push(beginLf7WaterObservation({...tailContext,zoneId,partId}));
  }
  for(const stream of ['PARENT_PUBLIC','PARENT_FORECAST_CACHE'])
    allWater.push(beginLf7WaterObservation({...tailContext,zoneId,partId:null,stream}));
}
for(const [partId,stream] of [['dk-b05-17-national-part-04','PART_PUBLIC'],
  [null,'PARENT_PUBLIC'],[null,'PARENT_FORECAST_CACHE']])
  allWater.push(beginLf7WaterObservation({...tailContext,zoneId:'DK-B05-17',partId,stream}));
for(const water of allWater)for(let offset=0;offset<118;offset++)
  observeLf7WaterDecision(water,{time:componentRow(offset).time,branch:'APPLIED',
    sourceRows:[sourceEndpoint],futureRows:[sourceEndpoint],trendKnown:true});
assert.equal(allWater.length,34);
const originalCwd=process.cwd(), privateRoot=await fs.mkdtemp(path.join(os.tmpdir(),'rr-lf7-observation-'));
const reportFile=path.join(privateRoot,'.geometry-v2-work','lf7-fur-consumer-observation-v1.json');
try {
  process.chdir(privateRoot);
  const attestation={...formatOnlyAttestation,producer:{...formatOnlyAttestation.producer,
    sourceHead:'b'.repeat(40),ownerPolicyGitBlob:'a4f65f8eb0396dbe3c3da442ebcb9a06d99d3287'}};
  assert.equal(await writeLf7FurConsumerObservation({conditions:{datasetId:'synthetic',productionReferenceAt:generatedAt,
    privateEstablishedNativeCurrentOrigin:attestation},partResults:allResults,
    memoryObservations:allMemory,waterObservations:allWater}),true);
  const bytes=await fs.readFile(reportFile);
  assert(bytes.length<=30500,'Full 17-part and 34-route synthetic case must leave report headroom.');
  const report=JSON.parse(bytes);
  assert.equal(report.observedParts,17);
  assert.equal(report.sourceT3.length,34);
  assert.deepEqual(report.tailSupportHourOffsets,[118,119,120]);
  assert.deepEqual(report.sourceT3[0].tailSupport[2],[true,'VERIFIED',1,1]);
  assert.equal(report.selectedPartComponentFields.expectedHours,118);
  const currentIndex=report.selectedPartComponentFields.fields.indexOf('current');
  const lfIndex=report.selectedPartComponentFields.current.indexOf('dkssLf');
  assert.equal(report.memory[0].selectedPartComponents[currentIndex][lfIndex],1);
  assert.doesNotMatch(bytes.toString('utf8'),/currentSpeedMps|currentDirectionDeg|waterTemperatureC|synthetic-lf7-part.*sourceKey/);
  console.log('LF7 observations: 17 PARTs, 34 routes, '+bytes.length+' bytes.');
} finally {
  process.chdir(originalCwd);
  await fs.unlink(reportFile).catch(error=>{if(error.code!=='ENOENT')throw error;});
  await fs.rmdir(path.dirname(reportFile)).catch(error=>{if(error.code!=='ENOENT')throw error;});
  await fs.rmdir(privateRoot);
}

const observationWarnings=[],originalObservationWarn=console.warn;
console.warn=code=>observationWarnings.push(code);
try{
  const circular=[];circular.push(circular);
  assert.equal(beginLf7WaterObservation({zoneId:'DK-B01-01',stream:'PART_PUBLIC',referenceAt:generatedAt,
    rows:[{sourceKey:'DO_NOT_EMIT',point:circular,weight:1}]}),null);
  assert.equal(captureLf7MemoryObservation({part:observationPart,
    initialSelection:{source:'EXISTING_INTEGRATED',state:circular},previousCandidateGContinuation:null,
    productionSeries:observationResult,hasEstablishedOrigin:true}),null);
  const failedObservation=beginLf7WaterObservation({zoneId:'DK-B01-01',stream:'PART_PUBLIC',referenceAt:generatedAt,rows:[]});
  observeLf7WaterDecision(failedObservation,{time:times[0],branch:'APPLIED',
    sourceRows:[{sources:{waterLevel:{collection:'dkss_lf',gridPoint:circular}}}]});
  assert.equal(failedObservation.invalid,true,'Partial counts cannot be presented as a complete observation.');
  assert.deepEqual(observationWarnings,Array(3).fill('LF7_FUR_CONSUMER_OBSERVATION_NOT_RECORDED'));
}finally{console.warn=originalObservationWarn;}
