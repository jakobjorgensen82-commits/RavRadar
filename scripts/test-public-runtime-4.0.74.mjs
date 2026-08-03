import fs from 'node:fs/promises';
import { buildPublicConditions } from './public-conditions-lib.mjs';
import { calculateRavScore } from '../js/core/score-engine.js';
const full=JSON.parse(await fs.readFile('data/live/conditions.json','utf8'));
const publicFile=JSON.parse(await fs.readFile('data/live/public-conditions.json','utf8'));
const zones=JSON.parse(await fs.readFile('data/zones.geojson','utf8'));
const rebuilt=buildPublicConditions(full);
if(JSON.stringify(publicFile)!==JSON.stringify(rebuilt))throw new Error('public-conditions.json svarer ikke til den deterministiske projektion af conditions.json.');
if(full.datasetId!==publicFile.datasetId)throw new Error('datasetId mismatch mellem fuld og offentlig runtime.');
if(Object.keys(publicFile.zones||{}).length!==zones.features.length)throw new Error('Den offentlige runtime matcher ikke det aktive zoneregister.');
const zoneMap=new Map(zones.features.map(feature=>[feature.properties.id,feature.properties]));
for(const [zoneId,fullZone] of Object.entries(full.zones||{})){
 const pub=publicFile.zones[zoneId],zone=zoneMap.get(zoneId);if(!pub||!zone)throw new Error(`Manglende zone ${zoneId}.`);
 for(const mode of ['waders','beach']){
  const a=calculateRavScore({mode,zone,weather:fullZone.current||{},history:fullZone.history||{}});
  const b=calculateRavScore({mode,zone,weather:pub.current||{},history:pub.history||{}});
  if(a.score!==b.score||a.transportScore!==b.transportScore||a.huntabilityScore!==b.huntabilityScore||a.mobilisationScore!==b.mobilisationScore)throw new Error(`Aktuel score ændret i ${zoneId}/${mode}.`);
  const hours=fullZone.forecast?.hourly||[];for(const index of [0,Math.floor(hours.length/2),hours.length-1].filter(i=>i>=0)){
   const pa=calculateRavScore({mode,zone,weather:hours[index],history:fullZone.history||{}});
   const pb=calculateRavScore({mode,zone,weather:pub.forecast.hourly[index],history:pub.history||{}});
   if(pa.score!==pb.score)throw new Error(`Forecastscore ændret i ${zoneId}/${mode}/time ${index}.`);
  }
 }
}
const fullBytes=(await fs.stat('data/live/conditions.json')).size,publicBytes=(await fs.stat('data/live/public-conditions.json')).size;
if(publicBytes>=fullBytes*.35)throw new Error(`Den offentlige runtime er ikke slank nok: ${publicBytes} af ${fullBytes} bytes.`);
console.log(`OK: offentlig runtime bevarer scorer og reducerer ${fullBytes} bytes til ${publicBytes} bytes.`);
