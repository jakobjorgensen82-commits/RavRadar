import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { applyWaterSourceRouting, buildWaterSourceForecastIndex, applyWaterSourceForecastStatus, applyVerifiedWaterSourceRoutingToPartHourly, summarizeLf7WaterRouting } from './lib/water-source-forecast-routing.mjs';
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

{
  const zones=['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02'];
  const referenceAt=new Date(generatedAt).toISOString(), contract={zones:{}}, rows=[];
  const config={zones:Object.fromEntries(zones.map(zone=>[zone,{enabled:true,requireAll:true,
    stations:[{sourceKey:sources[0].sourceKey,weight:1}],method:'manual-weights'}]))};
  for(const zoneId of zones){
    const part={zoneId,partId:zoneId+'-synthetic',waterPoint:point};contract.zones[zoneId]=[part];
    const hourly=Array.from({length:121},(_,i)=>({time:new Date(Date.parse(referenceAt)+i*3600000).toISOString(),waterLevelCm:null}));
    const routed=applyVerifiedWaterSourceRoutingToPartHourly({part,parentFeature:{properties:{id:zoneId}},
      hourly,sources:aware,index,routing:config,haversineKm,diagnosticReferenceAt:referenceAt});
    rows.push({...part,record:{hourly:routed.hourly},waterRoutingObservation:routed.waterRoutingObservation,
      scores:routed.hourly.slice(0,118).map(hour=>({time:hour.time,weather:{waterLevelCm:hour.waterLevelCm,waterLevelTrendCm3h:hour.waterLevelTrendCm3h}}))});
  }
  const summary=summarizeLf7WaterRouting(rows,contract,referenceAt);
  assert.equal(summary.expectedPartCount,7);assert.equal(summary.observedPartCount,7);
  assert.equal(summary.counts.observedHours,7*118);assert.equal(summary.counts.computedValueMismatchHours,0);
  rows[0].scores[0].weather.waterLevelCm+=1;
  assert.equal(summarizeLf7WaterRouting(rows,contract,referenceAt).counts.computedValueMismatchHours,1,
    'Observe already computed output; do not recompute a score to hide a mismatch');
  assert.match(updater,/waterRoutingObservation: routedWater\.waterRoutingObservation/);
  assert.match(updater,/waterRoutingAudit: summarizeLf7WaterRouting\(partRows, contract, partForecastStartAt\)/);
  // Execute the raw current retirement and diagnostics caller, not a field regex.
  const source=updater.replaceAll('\r\n','\n');
  const cleanupStart=source.indexOf('// Retained output projections and the completed attestation');
  const cleanupEnd=source.indexOf("reportWeatherBuildStage('current-origin-ready');",cleanupStart)
    + "reportWeatherBuildStage('current-origin-ready');".length;
  const diagnosticStart=source.indexOf('function buildRuntimeDiagnostics(');
  const diagnosticEnd=source.indexOf('\nfunction summarizeDmiComponentCoverage(',diagnosticStart);
  const write=source.split('\n').find(line=>line.startsWith('await fs.writeFile(RUNTIME_DIAGNOSTICS_PATH,'));
  assert(cleanupStart>0&&cleanupEnd>cleanupStart&&diagnosticStart>0&&diagnosticEnd>diagnosticStart);
  assert.equal(source.split('await fs.writeFile(RUNTIME_DIAGNOSTICS_PATH,').length,2);
  assert(source.indexOf(write)>cleanupEnd,'diagnostics must run after working-owner retirement');
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const finish=new AsyncFunction('scope',`
    let {coastalPartScoreBuild}=scope;
    const {fs,RUNTIME_DIAGNOSTICS_PATH,output,weatherHealth,APP_VERSION,
      ACCEPTED_FORECAST_HOURS,reportWeatherBuildStage}=scope;
    ${source.slice(diagnosticStart,diagnosticEnd)}
    ${source.slice(cleanupStart,cleanupEnd)}
    ${write}
    return coastalPartScoreBuild;
  `);
  assert(Buffer.byteLength(JSON.stringify(summary))<2048,'only bounded aggregate metadata is retained');
  for(const observation of [summary,null]){
    const owner={waterRoutingAudit:observation,privateWorkingOwner:new Map(rows.map(row=>[row.partId,row]))};
    const before=JSON.stringify(owner.waterRoutingAudit),writes=[];
    const remaining=await finish({coastalPartScoreBuild:owner,
      fs:{writeFile:async(file,text)=>{assert.equal(file,'fixture-runtime-diagnostics.json');writes.push(JSON.parse(text));}},
      RUNTIME_DIAGNOSTICS_PATH:'fixture-runtime-diagnostics.json',
      output:{generatedAt:referenceAt,datasetId:'LF7-LIFETIME-FIXTURE',productionReferenceAt:referenceAt,zones:{}},
      weatherHealth:{fixture:true},APP_VERSION:'test-only',ACCEPTED_FORECAST_HOURS:118,
      reportWeatherBuildStage:stage=>assert.equal(stage,'current-origin-ready')});
    assert.equal(remaining,null,'the full production/recovery working owner is still retired');
    assert.equal(writes.length,1);assert.deepEqual(writes[0].lf7WaterRouting,observation,
      'the actual diagnostics write must preserve the computed observation after cleanup; unknown stays null');
    assert.equal(JSON.stringify(owner.waterRoutingAudit),before);assert.equal(owner.privateWorkingOwner.size,7);
    assert.equal(JSON.stringify(writes[0]).includes('privateWorkingOwner'),false);
  }
}
console.log('LF7_NORMAL_PRODUCER_AUDIT: all seven current part contexts reach existing private diagnostics; actual computed-value mismatch is visible.');
