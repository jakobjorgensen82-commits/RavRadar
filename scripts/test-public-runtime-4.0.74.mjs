import fs from 'node:fs/promises';
import { buildPublicConditions, buildPublicConditionDetails } from './public-conditions-lib.mjs';
const full=JSON.parse(await fs.readFile('data/live/conditions.json','utf8'));
const publicFile=JSON.parse(await fs.readFile('data/live/public-conditions.json','utf8'));
const detailsFile=JSON.parse(await fs.readFile('data/live/public-condition-details.json','utf8'));
const zones=JSON.parse(await fs.readFile('data/zones.geojson','utf8'));
const rebuilt=buildPublicConditions(full);
const rebuiltDetails=buildPublicConditionDetails(full);
if(JSON.stringify(publicFile)!==JSON.stringify(rebuilt))throw new Error('public-conditions.json svarer ikke til den deterministiske projektion af conditions.json.');
if(JSON.stringify(detailsFile)!==JSON.stringify(rebuiltDetails))throw new Error('public-condition-details.json svarer ikke til den deterministiske detaljeprojektion.');
if(full.datasetId!==publicFile.datasetId)throw new Error('datasetId mismatch mellem fuld og offentlig runtime.');
if(Object.keys(publicFile.zones||{}).length!==zones.features.length)throw new Error('Den offentlige runtime matcher ikke det aktive zoneregister.');
const scoreFields=[
 'available','status','score','winningPartId','winningPartName','scoreSpread',
 'comparisonPartCount','validPartCount','expectedPartCount','scoreQuality',
 'calibrationEligible','scoreSemantics','conservativeTailResetApplied',
 'historyCoverageHours','historyReasonCodes','scoreBounds',
 'winningPartUncertain','possibleWinningPartCount','possibleWinningParts',
];
function assertMaterializedScorePreserved(source,projected,label){
 if(!source||!projected)throw new Error(`${label} mangler.`);
 for(const field of scoreFields){
  if(JSON.stringify(projected[field])!==JSON.stringify(source[field]))throw new Error(`${label} ændrede ${field}.`);
 }
 if(JSON.stringify(projected.modelBinding)!==JSON.stringify(full.coastalParts.modelBinding))throw new Error(`${label} har forkert integreret modelbinding.`);
 for(const [component,value] of Object.entries(projected.components||{})){
  if(JSON.stringify(value)!==JSON.stringify(source.components?.[component]))throw new Error(`${label} ændrede komponenten ${component}.`);
 }
}
if(!full.coastalParts||!publicFile.coastalParts||!detailsFile.coastalParts)throw new Error('Den integrerede kystdelsruntime mangler.');
for(const [zoneId,fullZone] of Object.entries(full.coastalParts.zones||{})){
 const publicZone=publicFile.coastalParts.zones?.[zoneId];
 const detailZone=detailsFile.coastalParts.zones?.[zoneId];
 if(!publicZone||!detailZone)throw new Error(`Manglende integreret zone ${zoneId}.`);
 const referenceMs=Date.parse(fullZone.currentReferenceAt||full.productionReferenceAt);
 const sourceCurrent=(fullZone.hourly||[]).find(row=>Date.parse(row.time)===referenceMs);
 const projectedCurrent=publicZone.hourly?.[0];
 if(!sourceCurrent||sourceCurrent.time!==projectedCurrent?.time)throw new Error(`Aktuel scoretime ændret i ${zoneId}.`);
 for(const mode of ['waders','beach'])assertMaterializedScorePreserved(sourceCurrent[mode],projectedCurrent[mode],`Aktuel score ${zoneId}/${mode}`);
 const sourceHours=fullZone.hourly||[];
 const indexes=[0,Math.floor(sourceHours.length/2),sourceHours.length-1].filter((value,index,all)=>value>=0&&all.indexOf(value)===index);
 for(const index of indexes){
  const sourceHour=sourceHours[index];
  const projectedHour=(detailZone.hourly||[]).find(row=>row.time===sourceHour.time);
  if(!projectedHour)throw new Error(`Manglende offentlig scoretime ${zoneId}/${sourceHour.time}.`);
  for(const mode of ['waders','beach'])assertMaterializedScorePreserved(sourceHour[mode],projectedHour[mode],`Forecastscore ${zoneId}/${mode}/time ${index}`);
 }
}
for(const [zoneId,zone] of Object.entries(publicFile.zones||{})){
 if(Object.hasOwn(zone.history||{},'maxWind24hMps'))throw new Error(`Privat vindhistorik lækkede til offentlig zone ${zoneId}.`);
}
const fullBytes=(await fs.stat('data/live/conditions.json')).size,publicBytes=(await fs.stat('data/live/public-conditions.json')).size;
if(publicBytes>=fullBytes*.35)throw new Error(`Den offentlige runtime er ikke slank nok: ${publicBytes} af ${fullBytes} bytes.`);
console.log(`OK: progressiv offentlig runtime bevarer materialiserede integrerede scorer og reducerer startpakken fra ${fullBytes} bytes til ${publicBytes} bytes.`);
