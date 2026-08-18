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
const haversineKm=(a,b)=>{if(!Array.isArray(a)||!Array.isArray(b))return Infinity;const rad=value=>Number(value)*Math.PI/180;const dLat=rad(Number(b[1])-Number(a[1])),dLon=rad(Number(b[0])-Number(a[0])),lat1=rad(a[1]),lat2=rad(b[1]);const term=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 6371.0088*2*Math.atan2(Math.sqrt(term),Math.sqrt(1-term));};
const active=(zones.features||[]).filter(f=>f.properties?.zoneStatus==='active');
const strictCurrentSemantics=Number(bulk.currentVectorSemanticsVersion)===3;
const failures=[];const warnings=[];let verifiedGridZones=0,verifiedHours=0,unverifiedHours=0;
if(!strictCurrentSemantics)warnings.push('Lokalt snapshot er fra før strømsemantik v3; produktionskørslen skal genbygge alle strømdata før deploy.');
const unverifiedReasons={};
function verifiedBulkRow(bulkZone,expectedSamplingPoint,row){
  if(!finite(row?.['current-u'])||!finite(row?.['current-v']))return null;
  const source=row?.sources?.current;
  const maximumDistance=Number(bulk.currentMaxDistanceKm??5);
  if(String(source?.provider??'').toLowerCase()!=='dmi')return null;
  if(Number(source?.vectorSemanticsVersion)!==3||!source?.verticalLayer)return null;
  if(!near(bulkZone?.samplingPoint,expectedSamplingPoint,1e-7)||!near(source?.samplingPoint,expectedSamplingPoint,1e-7))return null;
  if(source?.vectorSelection!==bulk.currentVectorSelection)return null;
  if(!Array.isArray(source?.gridPoint)||!source.gridPoint.every(finite))return null;
  if(!finite(source?.distanceKm)||Number(source.distanceKm)>maximumDistance)return null;
  if(haversineKm(expectedSamplingPoint,source.gridPoint)>maximumDistance+0.01)return null;
  return source;
}
for(const feature of active){
  const id=feature.properties.id;const full=conditions.zones?.[id];const pub=publicDoc.zones?.[id];const bz=bulk.zones?.[id];
  if(!full||!pub||!bz){failures.push(`${id}: mangler conditions/public/bulk`);continue;}
  if(strictCurrentSemantics&&!near(bz.samplingPoint,full.point,1e-7))failures.push(`${id}: bulkens samplingPoint matcher ikke det aktuelle administratorpunkt`);
  const validRows=Object.values(bz.hourly||{}).filter(r=>finite(r['current-u'])&&finite(r['current-v']));
  if(!validRows.length)failures.push(`${id}: strømpositionen har ingen gyldige u/v-data`);
  else if(strictCurrentSemantics&&validRows.some(row=>!verifiedBulkRow(bz,full.point,row)))failures.push(`${id}: mindst én strømtime mangler selvstændigt bevis for vandkolonne, dybdelag eller afstand`);
  else verifiedGridZones++;
  const currentProof=full.current?.currentProvenance?.status==='verified'?full.current.currentProvenance:null;
  if(currentProof&&(!near(full.flowPoints?.current,currentProof.gridPoint)||!near(pub.flowPoints?.current,currentProof.gridPoint)))failures.push(`${id}: kortets strømposition matcher ikke den aktuelle times DMI-gitterpunkt`);

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
    if(strictCurrentSemantics&&Number(row.currentProvenance?.vectorSemanticsVersion)!==3)failures.push(`${id} ${row.time}: verificeret strøm mangler semantik v3`);
    if(strictCurrentSemantics&&!near(row.currentProvenance?.samplingPoint,full.point,1e-7))failures.push(`${id} ${row.time}: proveniensens samplingPoint matcher ikke administratorpunktet`);
    if(strictCurrentSemantics&&Number(row.currentProvenance?.distanceKm)>Number(bulk.currentMaxDistanceKm??5))failures.push(`${id} ${row.time}: proveniensafstand overskrider 5 km`);
    if(strictCurrentSemantics&&haversineKm(full.point,row.currentProvenance?.gridPoint)>Number(bulk.currentMaxDistanceKm??5)+0.01)failures.push(`${id} ${row.time}: proveniensens koordinatafstand overskrider 5 km`);
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
  if(!bz){
    if(strictCurrentSemantics)failures.push(`${bulkId}: mangler bulkpost efter semantik-v3-genopbygning`);
    continue;
  }
  const validRows=Object.values(bz.hourly||{}).filter(row=>finite(row['current-u'])&&finite(row['current-v']));
  if(strictCurrentSemantics&&!near(bz.samplingPoint,part.waterPoint,1e-7)){failures.push(`${bulkId}: samplingPoint matcher ikke det aktuelle flytbare vandpunkt`);continue;}
  if(strictCurrentSemantics&&validRows.some(row=>!verifiedBulkRow(bz,part.waterPoint,row))){failures.push(`${bulkId}: mindst én strømtime mangler selvstændigt bevis for vandkolonne, dybdelag eller afstand`);continue;}
  if(!validRows.length)continue;
  const runtimePart=conditions.coastalParts?.parts?.[part.partId];
  const currentProof=runtimePart?.current?.weather?.currentProvenance;
  if(finite(runtimePart?.current?.weather?.currentUMps)&&finite(runtimePart?.current?.weather?.currentVMps)){
    if(currentProof?.status!=='verified')failures.push(`${bulkId}: den viste lokale strøm mangler tidsbestemt proveniens`);
    else if(!near(runtimePart?.flowPoints?.current,currentProof.gridPoint))failures.push(`${bulkId}: den lokale strømpil matcher ikke den viste times DMI-celle`);
  }
  verifiedPartGridPoints++;
}
const requiredPartCoverage=expectedParts.length;
if(verifiedPartGridPoints<requiredPartCoverage)failures.push(`Kun ${verifiedPartGridPoints}/${expectedParts.length} lokale kystdele har verificerede marine u/v-gitterpunkter; alle ${requiredPartCoverage} kræves.`);
const publicScoredParts=Number(publicDoc.coastalParts?.scoredPartCount||0);
if(publicScoredParts>verifiedPartGridPoints)failures.push(`Offentlig runtime scorer ${publicScoredParts} kystdele, men kun ${verifiedPartGridPoints} har verificeret lokal strøm.`);
const mapSource=await fs.readFile('js/map/map-view.js','utf8');
if(/arrowOffsetsForZoom|pairBase\.add/.test(mapSource))failures.push('Kortet fremstiller stadig kunstige pilepositioner omkring zonen.');
if(!/flowPoints\.current/.test(mapSource))failures.push('Kortet bruger ikke dokumenteret strøm-gitterpunkt.');
const report={schemaVersion:4,generatedAt:new Date().toISOString(),currentVectorSemanticsVersion:bulk.currentVectorSemanticsVersion??null,basis:{directionConvention:'oceanographic-to: 0° north, 90° east',components:'current-u=eastward velocity; current-v=northward velocity',directionFormula:'atan2(u,v)',speedFormula:'hypot(u,v)',displayRule:'current arrow points toward movement; wind arrow converts meteorological from-direction by +180°',waterCellProof:'Both U and V must be finite in the exact same DMI ocean-model coordinate, forecast time and vertical layer.',selectionRule:'For each native time, choose the nearest valid water column across active DKSS collections; choose the deepest valid layer only inside that column; maximum 5 km from the current administrator sampling point. Scalar marine model selection cannot influence current.',verificationRule:'Only rows with status=verified and documented DMI grid/time/layer provenance are compared. Missing provenance is never represented as 0/0.'},activeZones:active.length,expectedCoastalParts:expectedParts.length,verifiedCoastalPartGridPoints:verifiedPartGridPoints,requiredCoastalPartCoverage:requiredPartCoverage,requiredCoastalPartCoverageRatio:1,publicScoredParts,verifiedMarineGridZones:verifiedGridZones,verifiedForecastHours:verifiedHours,unverifiedForecastHours:unverifiedHours,unverifiedReasons,warnings,failures,status:failures.length?'failed':warnings.length?'passed-with-warnings':'passed'};
await fs.mkdir('data/diagnostics',{recursive:true});
await fs.writeFile('data/diagnostics/current-spatial-audit-4.0.76.json',`${JSON.stringify(report,null,2)}\n`);
if(failures.length)throw new Error(`Strømaudit fejlede:\n- ${failures.slice(0,40).join('\n- ')}${failures.length>40?`\n... ${failures.length-40} flere`:''}`);
console.log(`OK: ${verifiedGridZones}/${active.length} aktive zoner og ${verifiedPartGridPoints}/${expectedParts.length} lokale kystdele har marine DMI-u/v-gitterpunkter; ${verifiedHours} timer er verificeret og ${unverifiedHours} er tydeligt ikke-verificerbare.`);
if(warnings.length)console.log(`ADVARSLER (${warnings.length}):\n- ${warnings.slice(0,30).join('\n- ')}`);
