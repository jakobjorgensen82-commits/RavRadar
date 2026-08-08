import assert from 'node:assert/strict';
import { buildWaterSourceForecastIndex, applyWaterSourceForecastStatus, applyWaterSourceRouting } from './lib/water-source-forecast-routing.mjs';
const generatedAt='2026-08-05T06:00:00Z';
const times=Array.from({length:40},(_,i)=>new Date(Date.parse(generatedAt)+i*3*3600000).toISOString());
const rows=(base)=>Object.fromEntries(times.map((time,i)=>[time,{time,'sea-mean-deviation':(base+i)/100}]));
const sources=[
 {sourceKey:'oceanobs:A',stationId:'A',name:'Målestation A',sourceType:'observation-station',point:[10,56],registryStatus:'active'},
 {sourceKey:'tidewater:B',stationId:'B',name:'Prognosepunkt B',sourceType:'forecast-point',point:[11,56],registryStatus:'active-forecast-point'}
];
const bulk={generatedAt,timeStrideHours:3,zones:{'SOURCE::oceanobs:A':{hourly:rows(0)},'SOURCE::tidewater:B':{hourly:rows(30)}}};
const index=buildWaterSourceForecastIndex(sources,bulk,generatedAt);
assert.equal(index.size,2);
const aware=applyWaterSourceForecastStatus(sources,index,generatedAt,{minimumHours:96});
assert.ok(aware.every(s=>s.sourceForecastStatus==='receiving'&&s.routingEligible));
const hourly=index.get('oceanobs:A').hourly.map(r=>({...r,windSpeedMps:1}));
const publicHourly=hourly.map((row,index)=>({...row,fallbackWind:index>=2?9:null}));
const output={zones:{Z:{point:[10.5,56],current:{waterLevelCm:null},forecast:{hourly:publicHourly},waterLevel:{}}}};
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
assert.equal(output.zones.Z.forecast.hourly[2].fallbackWind,9,'Vandstandsrouting mÃ¥ ikke slette komponentvis fallback fra den offentlige prognose.');
assert.equal(store.zones.Z.hourly[2].fallbackWind,undefined,'Den rene DMI-cache skal ikke forurenes med offentlig fallback.');
console.log('OK: målestationer og DMI-prognosepunkter leverer samme DKSS-femdøgnsformat, kan afstandsinterpoleres og styrer zoneprognosen.');
