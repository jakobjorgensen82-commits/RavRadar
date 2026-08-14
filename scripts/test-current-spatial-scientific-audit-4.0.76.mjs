import fs from 'node:fs/promises';
import {directionFromComponents,arrowDirection} from '../js/core/current-direction-audit.js';

const [zones,conditions,bulk,publicDoc,coastalParts]=await Promise.all([
  fs.readFile('data/zones.geojson','utf8').then(JSON.parse),
  fs.readFile('data/live/conditions.json','utf8').then(JSON.parse),
  fs.readFile('data/live/dmi-bulk-cache.json','utf8').then(JSON.parse),
  fs.readFile('data/live/public-conditions.json','utf8').then(JSON.parse),
  fs.readFile('data/live/coastal-parts-v2.json','utf8').then(JSON.parse)
]);
const norm=v=>((Number(v)%360)+360)%360;
const diff=(a,b)=>Math.abs(((norm(a)-norm(b)+540)%360)-180);
const finite=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v));
const near=(a,b,t=1e-6)=>Array.isArray(a)&&Array.isArray(b)&&Math.abs(Number(a[0])-Number(b[0]))<=t&&Math.abs(Number(a[1])-Number(b[1]))<=t;
const active=(zones.features||[]).filter(f=>f.properties?.zoneStatus==='active');
const failures=[];const warnings=[];let verifiedGridZones=0,verifiedHours=0,unverifiedHours=0;
const unverifiedReasons={};
for(const feature of active){
  const id=feature.properties.id;const full=conditions.zones?.[id];const pub=publicDoc.zones?.[id];const bz=bulk.zones?.[id];
  if(!full||!pub||!bz){failures.push(`${id}: mangler conditions/public/bulk`);continue;}
  const gu=bz.gridPoints?.['current-u'],gv=bz.gridPoints?.['current-v'];
  if(!gu||!gv){warnings.push(`${id}: mangler dokumenteret current-u/v-gitterpunkt`);}
  else {
    const up=[Number(gu.longitude),Number(gu.latitude)],vp=[Number(gv.longitude),Number(gv.latitude)];
    if(!near(up,vp,1e-7)){failures.push(`${id}: current-u og current-v kommer fra forskellige gitterpunkter`);}
    else {
      if(!near(full.flowPoints?.current,up)||!near(pub.flowPoints?.current,up))failures.push(`${id}: kortets strømposition matcher ikke DMI-gitterpunktet`);
      const validRows=Object.values(bz.hourly||{}).filter(r=>finite(r['current-u'])&&finite(r['current-v']));
      if(!validRows.length)failures.push(`${id}: strømpositionen har ingen gyldige u/v-data`);
      else verifiedGridZones++;
      const distance=Math.max(Number(gu.distanceKm)||0,Number(gv.distanceKm)||0);
      if(distance>20)warnings.push(`${id}: nærmeste gyldige strømgitterpunkt ligger ${distance.toFixed(1)} km fra zonepunktet`);
    }
  }

  for(const row of full.forecast?.hourly||[]){
    const status=row?.currentProvenance?.status;
    const hasU=finite(row.currentUMps),hasV=finite(row.currentVMps);
    if(status!=='verified'){
      unverifiedHours++;
      const reason=row?.currentProvenance?.reason||'missing-status';
      unverifiedReasons[reason]=(unverifiedReasons[reason]||0)+1;
      if(hasU||hasV)failures.push(`${id} ${row.time}: ikke-verificeret time indeholder alligevel u/v-komponenter`);
      continue;
    }
    if(!hasU||!hasV){failures.push(`${id} ${row.time}: verificeret proveniens mangler u eller v`);continue;}
    if(!near(row.currentProvenance?.gridPoint,full.flowPoints?.current))failures.push(`${id} ${row.time}: provenienspunkt matcher ikke kortets strømposition`);
    if(!finite(row.currentDirectionDeg)||!finite(row.currentSpeedMps)){failures.push(`${id} ${row.time}: verificeret time mangler vist retning eller hastighed`);continue;}
    const expectedDir=directionFromComponents(row.currentUMps,row.currentVMps);
    const expectedSpeed=Math.hypot(Number(row.currentUMps),Number(row.currentVMps));
    if(diff(expectedDir,row.currentDirectionDeg)>1.1)failures.push(`${id} ${row.time}: retning ${row.currentDirectionDeg}° != u/v ${expectedDir.toFixed(2)}°`);
    if(Math.abs(expectedSpeed-Number(row.currentSpeedMps))>0.011)failures.push(`${id} ${row.time}: hastighed ${row.currentSpeedMps} != u/v ${expectedSpeed.toFixed(4)}`);
    if(diff(arrowDirection('current',row.currentDirectionDeg),row.currentDirectionDeg)>0.01)failures.push(`${id} ${row.time}: pilen vender ikke mod strømbevægelsen`);
    verifiedHours++;
  }
}
if(verifiedGridZones<Math.floor(active.length*.9))failures.push(`Kun ${verifiedGridZones}/${active.length} zoner har verificerede marine u/v-gitterpunkter.`);
if(verifiedHours<1000)failures.push(`Kun ${verifiedHours} prognosetimer kunne verificeres direkte fra u/v.`);
const expectedParts=Object.values(coastalParts.zones||{}).flat();
let verifiedPartGridPoints=0;
for(const part of expectedParts){
  const bulkId=`PART::${part.partId}`;
  const bz=bulk.zones?.[bulkId];
  const gu=bz?.gridPoints?.['current-u'],gv=bz?.gridPoints?.['current-v'];
  if(!gu||!gv)continue;
  const up=[Number(gu.longitude),Number(gu.latitude)],vp=[Number(gv.longitude),Number(gv.latitude)];
  const validRows=Object.values(bz.hourly||{}).filter(row=>finite(row['current-u'])&&finite(row['current-v']));
  if(!near(up,vp,1e-7)){failures.push(`${bulkId}: current-u og current-v kommer fra forskellige gitterpunkter`);continue;}
  if(!validRows.length)continue;
  verifiedPartGridPoints++;
}
const requiredPartCoverage=Math.ceil(expectedParts.length*.95);
if(verifiedPartGridPoints<requiredPartCoverage)failures.push(`Kun ${verifiedPartGridPoints}/${expectedParts.length} lokale kystdele har verificerede marine u/v-gitterpunkter; mindst ${requiredPartCoverage} kræves.`);
const publicScoredParts=Number(publicDoc.coastalParts?.scoredPartCount||0);
if(publicScoredParts>verifiedPartGridPoints)failures.push(`Offentlig runtime scorer ${publicScoredParts} kystdele, men kun ${verifiedPartGridPoints} har verificeret lokal strøm.`);
const mapSource=await fs.readFile('js/map/map-view.js','utf8');
if(/arrowOffsetsForZoom|pairBase\.add/.test(mapSource))failures.push('Kortet fremstiller stadig kunstige pilepositioner omkring zonen.');
if(!/flowPoints\.current/.test(mapSource))failures.push('Kortet bruger ikke dokumenteret strøm-gitterpunkt.');
const report={schemaVersion:3,generatedAt:new Date().toISOString(),basis:{directionConvention:'oceanographic-to: 0° north, 90° east',components:'current-u=eastward velocity; current-v=northward velocity',directionFormula:'atan2(u,v)',speedFormula:'hypot(u,v)',displayRule:'current arrow points toward movement; wind arrow converts meteorological from-direction by +180°',verificationRule:'Only rows with status=verified and documented DMI grid/time provenance are compared. Missing provenance is never represented as 0/0.'},activeZones:active.length,expectedCoastalParts:expectedParts.length,verifiedCoastalPartGridPoints:verifiedPartGridPoints,requiredCoastalPartCoverage:requiredPartCoverage,publicScoredParts,verifiedMarineGridZones:verifiedGridZones,verifiedForecastHours:verifiedHours,unverifiedForecastHours:unverifiedHours,unverifiedReasons,warnings,failures,status:failures.length?'failed':warnings.length?'passed-with-warnings':'passed'};
await fs.mkdir('data/diagnostics',{recursive:true});
await fs.writeFile('data/diagnostics/current-spatial-audit-4.0.76.json',`${JSON.stringify(report,null,2)}\n`);
if(failures.length)throw new Error(`Strømaudit fejlede:\n- ${failures.slice(0,40).join('\n- ')}${failures.length>40?`\n... ${failures.length-40} flere`:''}`);
console.log(`OK: ${verifiedGridZones}/${active.length} aktive zoner og ${verifiedPartGridPoints}/${expectedParts.length} lokale kystdele har marine DMI-u/v-gitterpunkter; ${verifiedHours} timer er verificeret og ${unverifiedHours} er tydeligt ikke-verificerbare.`);
if(warnings.length)console.log(`ADVARSLER (${warnings.length}):\n- ${warnings.slice(0,30).join('\n- ')}`);
