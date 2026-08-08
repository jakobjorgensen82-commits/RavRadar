import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { applyWaterSourceRouting, buildWaterSourceForecastIndex, applyWaterSourceForecastStatus } from './lib/water-source-forecast-routing.mjs';
import { recommendWaterStationBracket } from '../js/core/water-station-routing.js';

const generatedAt='2026-08-05T12:00:00Z';
const times=Array.from({length:40},(_,i)=>new Date(Date.parse(generatedAt)+i*3*3600000).toISOString());
const series=base=>Object.fromEntries(times.map((time,i)=>[time,{time,'sea-mean-deviation':(base+i)/100}]));
const sources=[
  {sourceKey:'oceanobs:NEAR',stationId:'NEAR',name:'Nær målestation',sourceType:'observation-station',point:[10.40,56.00],registryStatus:'active',properties:{status:'Active',parameterId:['sealev_dvr']}},
  {sourceKey:'tidewater:FAR',stationId:'FAR',name:'Fjernt prognosepunkt',sourceType:'forecast-point',point:[11.00,56.00],registryStatus:'active-forecast-point',properties:{status:'Active'}}
];
const bulk={generatedAt,timeStrideHours:3,zones:{
  'SOURCE::oceanobs:NEAR':{hourly:series(10)},
  'SOURCE::tidewater:FAR':{hourly:series(50)}
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

const workflow=await fs.readFile('.github/workflows/update-and-deploy.yml','utf8');
assert.match(workflow,/--exclude '_support\/'/,'Pages-artifact skal udelukke supportmappen.');
assert.match(workflow,/--exclude 'RavRadar-support-\*\.zip'/,'Pages-artifact skal udelukke support-ZIP.');
const registry=await fs.readFile('scripts/update-water-source-registry.mjs','utf8');
assert.match(registry,/\/tidewaterstation\/items/,'DMI bruger den singulære tidewaterstation-collection.');
assert.doesNotMatch(registry,/\/tidewaterstations\/items/,'Det fejlagtige plurale endpoint må ikke bruges.');
assert.match(registry,/discovery/,'Kilderegisteret skal dokumentere discovery-resultatet.');
const updater=await fs.readFile('scripts/update-weather.mjs','utf8');
assert.match(updater,/forecast_hours:\s*'120'/,'Fallback must request 120 future hours instead of five calendar days from midnight.');
assert.doesNotMatch(updater,/forecast_days:\s*'5'/,'Five calendar days truncate the future fallback horizon later in the day.');
assert.match(updater,/water-source-audit\.json/,'Vejrkørslen skal skrive en fuld audit af alle vandstandskilder.');

console.log('OK: Pages-sikkerhed, geografiske vægte, automatisk routing, administratoroverride og produceret time-for-time-serie er regressionstestet samlet.');
