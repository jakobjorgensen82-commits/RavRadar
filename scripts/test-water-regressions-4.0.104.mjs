import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildWaterSourceForecastIndex, applyWaterSourceForecastStatus, applyWaterSourceRouting } from './lib/water-source-forecast-routing.mjs';

const generatedAt='2026-08-05T18:00:00.000Z';
const sources=[
  {sourceKey:'tidewater:EMPTY',stationId:'EMPTY',name:'Tom prognosekilde',sourceType:'forecast-point',point:[10,56]},
  {sourceKey:'tidewater:REAL',stationId:'REAL',name:'Reel prognosekilde',sourceType:'forecast-point',point:[10.1,56]}
];
const times=Array.from({length:40},(_,i)=>new Date(Date.parse(generatedAt)+i*3*3600000).toISOString());
const bulk={generatedAt,timeStrideHours:3,zones:{
  'SOURCE::tidewater:EMPTY':{hourly:Object.fromEntries(times.map(time=>[time,{time,'sea-mean-deviation':null}]))},
  'SOURCE::tidewater:REAL':{hourly:Object.fromEntries(times.map((time,i)=>[time,{time,'sea-mean-deviation':(12+i)/100}]))}
}};
const index=buildWaterSourceForecastIndex(sources,bulk,generatedAt);
assert.equal(index.has('tidewater:EMPTY'),false,'Null-vandstand må ikke konverteres til en falsk nulserie.');
assert.equal(index.has('tidewater:REAL'),true,'Reelle prognoseværdier skal fortsat indlæses.');
const aware=applyWaterSourceForecastStatus(sources,index,generatedAt,{minimumHours:96});
assert.equal(aware.find(x=>x.stationId==='EMPTY').routingEligible,false,'En tom kilde må ikke blive routingberettiget.');
assert.equal(aware.find(x=>x.stationId==='REAL').routingEligible,true,'En reel femdøgnsserie skal fortsat være routingberettiget.');

const feature={properties:{id:'Z',name:'Testzone',dataPoint:[10.1,56],coastLine:[[9.9,56],[10.3,56]],onshoreDirectionDeg:0}};
const source=aware.find(x=>x.stationId==='REAL');
const hourly=index.get(source.sourceKey).hourly.map(row=>({...row,waterLevelCm:null}));
const output={zones:{Z:{point:[10.1,56],current:{waterLevelCm:null},forecast:{hourly:[...hourly]},waterLevel:{}}}};
const forecastStore={zones:{Z:{hourly:[...hourly]}}};
const routing={zones:{Z:{enabled:true,method:'inverse-distance',requireAll:true,stations:[{sourceKey:source.sourceKey,stationId:source.stationId}]}}};
const haversineKm=()=>0;
const result=applyWaterSourceRouting({features:[feature],output,forecastStore,sources:aware,index,routing,haversineKm,generatedAt});
assert.equal(result.audit.applied,1);
assert.equal(output.zones.Z.waterLevel.interpolation.mode,'admin-override');
assert.deepEqual(output.zones.Z.forecast.hourly.slice(0,8).map(x=>x.waterLevelCm),[12,12,13,13,13,14,14,14],'En reel prognose skal bevare variation og må ikke blive en kunstig nulserie.');

const admin=await fs.readFile('js/ui/admin-dashboard.js','utf8');
assert.match(admin,/state\.waterRouting\.zones\?\?=\{\};const route=state\.waterRouting\.zones\[zoneId\]\?\?=/,'En ny zones administratorvalg skal oprettes direkte i det persistente routingdokument.');
assert.match(admin,/r\.enabled=list\.length>0/,'Klik på en vandstandskilde skal aktivere administratoroverride.');
assert.match(admin,/adminIds=overrideActive\?new Set/,'Aktive administratorvalg skal vises rødt på kortet.');

console.log('OK: administratorvalg bindes til routingdokumentet, og manglende prognosedata kan ikke blive til falske 0 cm.');
