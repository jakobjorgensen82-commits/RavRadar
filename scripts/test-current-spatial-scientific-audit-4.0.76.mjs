import fs from 'node:fs/promises';
import {directionFromComponents,arrowDirection} from '../js/core/current-direction-audit.js';

const [zones,conditions,bulk,publicDoc]=await Promise.all([
  fs.readFile('data/zones.geojson','utf8').then(JSON.parse),
  fs.readFile('data/live/conditions.json','utf8').then(JSON.parse),
  fs.readFile('data/live/dmi-bulk-cache.json','utf8').then(JSON.parse),
  fs.readFile('data/live/public-conditions.json','utf8').then(JSON.parse)
]);
const norm=v=>((Number(v)%360)+360)%360;
const diff=(a,b)=>Math.abs(((norm(a)-norm(b)+540)%360)-180);
const finite=v=>Number.isFinite(Number(v));
const near=(a,b,t=1e-6)=>Array.isArray(a)&&Array.isArray(b)&&Math.abs(Number(a[0])-Number(b[0]))<=t&&Math.abs(Number(a[1])-Number(b[1]))<=t;
const active=(zones.features||[]).filter(f=>f.properties?.zoneStatus==='active');
const failures=[];const warnings=[];let checkedDirections=0,checkedPoints=0,checkedHours=0;
for(const feature of active){
  const id=feature.properties.id;const full=conditions.zones?.[id];const pub=publicDoc.zones?.[id];const bz=bulk.zones?.[id];
  if(!full||!pub||!bz){failures.push(`${id}: mangler conditions/public/bulk`);continue;}
  const gu=bz.gridPoints?.['current-u'],gv=bz.gridPoints?.['current-v'];
  if(!gu||!gv){warnings.push(`${id}: mangler dokumenteret current-u/v-gitterpunkt`);continue;}
  const up=[Number(gu.longitude),Number(gu.latitude)],vp=[Number(gv.longitude),Number(gv.latitude)];
  if(!near(up,vp,1e-7)){failures.push(`${id}: current-u og current-v kommer fra forskellige gitterpunkter`);continue;}
  if(!near(full.flowPoints?.current,up)||!near(pub.flowPoints?.current,up))failures.push(`${id}: kortets strømposition matcher ikke DMI-gitterpunktet`);
  const validRows=Object.values(bz.hourly||{}).filter(r=>finite(r['current-u'])&&finite(r['current-v']));
  if(!validRows.length){failures.push(`${id}: strømpositionen har ingen gyldige u/v-data`);continue;}
  checkedPoints++;
  for(const row of full.forecast?.hourly||[]){
    if(!finite(row.currentUMps)||!finite(row.currentVMps)||!finite(row.currentDirectionDeg)||!finite(row.currentSpeedMps))continue;
    const expectedDir=directionFromComponents(row.currentUMps,row.currentVMps);
    const expectedSpeed=Math.hypot(Number(row.currentUMps),Number(row.currentVMps));
    if(diff(expectedDir,row.currentDirectionDeg)>1.1)failures.push(`${id} ${row.time}: retning ${row.currentDirectionDeg}° != u/v ${expectedDir.toFixed(2)}°`);
    if(Math.abs(expectedSpeed-Number(row.currentSpeedMps))>0.011)failures.push(`${id} ${row.time}: hastighed ${row.currentSpeedMps} != u/v ${expectedSpeed.toFixed(4)}`);
    if(diff(arrowDirection('current',row.currentDirectionDeg),row.currentDirectionDeg)>0.01)failures.push(`${id} ${row.time}: pilen vender ikke mod strømbevægelsen`);
    checkedDirections++;checkedHours++;
  }
  const distance=Math.max(Number(gu.distanceKm)||0,Number(gv.distanceKm)||0);
  if(distance>20)warnings.push(`${id}: nærmeste gyldige strømgitterpunkt ligger ${distance.toFixed(1)} km fra zonepunktet`);
}
if(checkedPoints<Math.floor(active.length*.9))failures.push(`Kun ${checkedPoints}/${active.length} zoner har verificerede marine u/v-gitterpunkter.`);
if(checkedDirections<1000)failures.push(`Kun ${checkedDirections} prognosetimer kunne verificeres direkte fra u/v.`);
const mapSource=await fs.readFile('js/map/map-view.js','utf8');
if(/arrowOffsetsForZoom|pairBase\.add/.test(mapSource))failures.push('Kortet fremstiller stadig kunstige pilepositioner omkring zonen.');
if(!/flowPoints\.current/.test(mapSource))failures.push('Kortet bruger ikke dokumenteret strøm-gitterpunkt.');
const report={schemaVersion:1,generatedAt:new Date().toISOString(),basis:{directionConvention:'oceanographic-to: 0° north, 90° east',components:'current-u=eastward velocity; current-v=northward velocity',directionFormula:'atan2(u,v)',speedFormula:'hypot(u,v)',displayRule:'current arrow points toward movement; wind arrow converts meteorological from-direction by +180°'},activeZones:active.length,verifiedMarineGridZones:checkedPoints,verifiedForecastHours:checkedHours,warnings,failures,status:failures.length?'failed':warnings.length?'passed-with-warnings':'passed'};
await fs.mkdir('data/diagnostics',{recursive:true});
await fs.writeFile('data/diagnostics/current-spatial-audit-4.0.76.json',`${JSON.stringify(report,null,2)}\n`);
if(failures.length)throw new Error(`Strømaudit fejlede:\n- ${failures.slice(0,40).join('\n- ')}${failures.length>40?`\n... ${failures.length-40} flere`:''}`);
console.log(`OK: ${checkedPoints}/${active.length} aktive zoner har marine DMI-u/v-gitterpunkter; ${checkedHours} timer har korrekt hastighed, oceanografisk mod-retning og pilretning.`);
if(warnings.length)console.log(`ADVARSLER (${warnings.length}):\n- ${warnings.slice(0,30).join('\n- ')}`);
