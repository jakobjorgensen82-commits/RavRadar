import fs from 'node:fs/promises';
import {directionFromComponents,arrowDirection} from '../js/core/current-direction-audit.js';
import {
  verifiedLivePilotSource,
  verifiedNativeCadenceReferenceForPart,
} from './lib/live-current-pilot.mjs';

const [zones,conditions,bulk,publicDoc,coastalParts,pilotControl,pilotHistory]=await Promise.all([
  fs.readFile('data/zones.geojson','utf8').then(JSON.parse),
  fs.readFile('data/live/conditions.json','utf8').then(JSON.parse),
  fs.readFile('data/live/dmi-bulk-cache.json','utf8').then(JSON.parse),
  fs.readFile('data/live/public-conditions.json','utf8').then(JSON.parse),
  fs.readFile('data/live/coastal-parts-v2.json','utf8').then(JSON.parse),
  fs.readFile('data/current-live-pilot-control.json','utf8').then(JSON.parse),
  fs.readFile('data/live/current-pilot-history.json','utf8').then(JSON.parse).catch(()=>null)
]);
const norm=v=>((Number(v)%360)+360)%360;
const diff=(a,b)=>Math.abs(((norm(a)-norm(b)+540)%360)-180);
const finite=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v));
const near=(a,b,t=1e-6)=>Array.isArray(a)&&Array.isArray(b)&&Math.abs(Number(a[0])-Number(b[0]))<=t&&Math.abs(Number(a[1])-Number(b[1]))<=t;
const haversineKm=(a,b)=>{if(!Array.isArray(a)||!Array.isArray(b))return Infinity;const rad=value=>Number(value)*Math.PI/180;const dLat=rad(Number(b[1])-Number(a[1])),dLon=rad(Number(b[0])-Number(a[0])),lat1=rad(a[1]),lat2=rad(b[1]);const term=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 6371.0088*2*Math.atan2(Math.sqrt(term),Math.sqrt(1-term));};
const active=(zones.features||[]).filter(f=>f.properties?.zoneStatus==='active');
const strictCurrentSemantics=Number(bulk.currentVectorSemanticsVersion)===3;
const failures=[];const warnings=[];let verifiedGridZones=0,verifiedHours=0,unverifiedHours=0;
const liveMode=pilotControl?.mode;
const controlledLive=liveMode==='controlled-live';
const dmiOnlyRollback=liveMode==='dmi-only-rollback';
if(!controlledLive&&!dmiOnlyRollback)failures.push(`Ukendt live-pilottilstand: ${liveMode||'mangler'}`);
if(!pilotHistory)failures.push('Den byggede online strømhistorik mangler.');
else if(pilotHistory?.mode!==liveMode)failures.push('Livehistorikken og den versionsstyrede pilotkontrol er uenige om tilstanden.');
if(controlledLive&&pilotHistory?.enabled!==true)failures.push('Kontrolleret live-tilstand har ikke en aktiveret online strømhistorik.');
if(dmiOnlyRollback&&pilotHistory?.enabled!==false)failures.push('DMI-only rollback har ikke slået anvendelsen af supplerende strøm fra.');
if(pilotHistory?.credentialsIncluded!==false)failures.push('Online strømhistorik dokumenterer ikke, at credentials er udeladt.');
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
  if(!validRows.length)warnings.push(`${id}: hovedzonen har ingen lokal DMI-u/v; kystdelene auditeres selvstændigt.`);
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
let verifiedNativeCadenceHeldParts=0;
const verifiedPartsBySource={'dmi-local':0,'copernicus-local':0,'dmi-regional-proxy':0};
const pilotEntries=Array.isArray(pilotHistory?.entries)?pilotHistory.entries:[];
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
  const runtimePart=conditions.coastalParts?.parts?.[part.partId];
  const currentProof=runtimePart?.current?.weather?.currentProvenance;
  const currentWeather=runtimePart?.current?.weather;
  if(!finite(currentWeather?.currentUMps)||!finite(currentWeather?.currentVMps)){
    const candidate=runtimePart?.candidateG;
    const currentAt=Date.parse(runtimePart?.current?.time);
    const transportAt=Date.parse(candidate?.transportReferenceAt);
    const ageHours=(currentAt-transportAt)/3_600_000;
    const safeHeldState=controlledLive
      && candidate?.currentTransition==='NATIVE_CADENCE_HOLD'
      && ((candidate?.transportMemoryReady===true&&candidate?.transportMemoryStatus==='READY')
        || (candidate?.transportMemoryReady===false&&candidate?.transportMemoryStatus==='WINDOW_INCOMPLETE'))
      && Number.isFinite(currentAt)
      && Number.isFinite(transportAt)
      && ageHours>0&&ageHours<=3
      && verifiedNativeCadenceReferenceForPart(part,pilotHistory,candidate.transportReferenceAt)
      && !finite(currentWeather?.currentSpeedMps)
      && !finite(currentWeather?.currentDirectionDeg);
    if(safeHeldState){
      verifiedNativeCadenceHeldParts++;
      verifiedPartsBySource['dmi-regional-proxy']++;
      continue;
    }
    continue;
  }
  if(currentProof?.status!=='verified'){failures.push(`${bulkId}: den viste lokale strøm mangler tidsbestemt proveniens`);continue;}
  let sourceClass=null;let expectedArrowSource=null;
  if(String(currentProof.provider??'').toLowerCase()==='dmi'&&Number(currentProof.vectorSemanticsVersion)===3){
    const syntheticRow={'current-u':currentWeather.currentUMps,'current-v':currentWeather.currentVMps,sources:{current:currentProof}};
    if(!verifiedBulkRow(bz,part.waterPoint,syntheticRow)){failures.push(`${bulkId}: den viste DMI-strøm består ikke den lokale celle-/lagkontrol`);continue;}
    sourceClass='dmi-local';expectedArrowSource='dmi-marine-grid';
  }else{
    const supplementalProof=verifiedLivePilotSource(currentProof,part.waterPoint,{requireStatus:true});
    if(!supplementalProof){failures.push(`${bulkId}: den viste supplerende strøm består ikke celle-, lag-, afstands- og kildekontrollen`);continue;}
    if(dmiOnlyRollback){failures.push(`${bulkId}: rollbacktilstanden viser stadig supplerende strøm`);continue;}
    const selectedTimeMs=Date.parse(runtimePart?.current?.time);
    if(!Number.isFinite(selectedTimeMs)){failures.push(`${bulkId}: den viste supplerende strøm mangler gyldigt tidspunkt`);continue;}
    const selectedTime=new Date(selectedTimeMs).toISOString();
    const historyMatch=pilotEntries.find(entry=>entry.partId===part.partId&&entry.source===currentProof.source&&Number(entry.uMps)===Number(currentWeather.currentUMps)&&Number(entry.vMps)===Number(currentWeather.currentVMps)&&Date.parse(entry.validTime)===Date.parse(selectedTime)&&near(entry.gridPoint,currentProof.gridPoint,1e-7));
    if(!historyMatch){failures.push(`${bulkId}: den viste supplerende strøm findes ikke som eksakt U/V-post i onlinehistorikken`);continue;}
    sourceClass=currentProof.sourceClass==='owner-approved-regional-proxy'?'dmi-regional-proxy':'copernicus-local';
    expectedArrowSource=supplementalProof.arrowSource;
  }
  if(!near(runtimePart?.flowPoints?.current,currentProof.gridPoint))failures.push(`${bulkId}: den lokale strømpil matcher ikke den viste times faktiske kildecelle`);
  if(runtimePart?.flowPoints?.sources?.current!==expectedArrowSource)failures.push(`${bulkId}: strømpilens kildeklasse matcher ikke den valgte strøm`);
  verifiedPartsBySource[sourceClass]++;
  verifiedPartGridPoints++;
}
const requiredPartCoverage=expectedParts.length;
const verifiedScoreReadyParts=verifiedPartGridPoints+verifiedNativeCadenceHeldParts;
if(controlledLive&&verifiedScoreReadyParts<requiredPartCoverage)failures.push(`Kun ${verifiedScoreReadyParts}/${expectedParts.length} lokale kystdele har enten eksakt verificeret strøm eller dokumenteret native-cadence-tilstand; alle ${requiredPartCoverage} kræves.`);
if(dmiOnlyRollback)warnings.push(`DMI-only rollback er aktiv: ${verifiedPartGridPoints}/${expectedParts.length} dele har lokal DMI-strøm; resten er tydeligt missing.`);
const publicScoredParts=Number(publicDoc.coastalParts?.scoredPartCount||0);
if(publicScoredParts>verifiedScoreReadyParts)failures.push(`Offentlig runtime scorer ${publicScoredParts} kystdele, men kun ${verifiedScoreReadyParts} har eksakt verificeret strøm eller dokumenteret native-cadence-tilstand.`);
const mapSource=await fs.readFile('js/map/map-view.js','utf8');
if(/arrowOffsetsForZoom|pairBase\.add/.test(mapSource))failures.push('Kortet fremstiller stadig kunstige pilepositioner omkring zonen.');
if(!/flowPoints\.current/.test(mapSource))failures.push('Kortet bruger ikke dokumenteret strøm-gitterpunkt.');
const report={schemaVersion:6,generatedAt:new Date().toISOString(),livePilotMode:liveMode,currentVectorSemanticsVersion:bulk.currentVectorSemanticsVersion??null,basis:{directionConvention:'oceanographic-to: 0° north, 90° east',components:'current-u=eastward velocity; current-v=northward velocity',directionFormula:'atan2(u,v)',speedFormula:'hypot(u,v)',displayRule:'current arrow points toward movement; wind arrow converts meteorological from-direction by +180°; a held native-cadence state shows no current arrow.',waterCellProof:'Both U and V must be finite in the exact same source, coordinate, forecast time and vertical layer.',selectionRule:'Per exact time: verified local DMI within 5 km, then Baltic NEMO within 5 km, then AMM15 within 5 km. Only the eight owner-approved dkss_lf regional proxies may preserve the latest derived transport state for at most three hours until the next native sample. No temporal or spatial interpolation and no movement is added while held.',verificationRule:'Exact arrows require status=verified and documented provider/grid/time/layer provenance. A score-only native-cadence hold requires a verified regional source row at the earlier transport reference, ready 48-hour memory and a maximum age of three hours. Missing provenance is never represented as 0/0.'},activeZones:active.length,expectedCoastalParts:expectedParts.length,verifiedCoastalPartGridPoints:verifiedPartGridPoints,verifiedNativeCadenceHeldParts,verifiedScoreReadyParts,verifiedPartsBySource,requiredCoastalPartCoverage:requiredPartCoverage,requiredCoastalPartCoverageRatio:controlledLive?1:null,publicScoredParts,verifiedMarineGridZones:verifiedGridZones,verifiedForecastHours:verifiedHours,unverifiedForecastHours:unverifiedHours,unverifiedReasons,warnings,failures,status:failures.length?'failed':warnings.length?'passed-with-warnings':'passed'};
await fs.mkdir('data/diagnostics',{recursive:true});
await fs.writeFile('data/diagnostics/current-spatial-audit-4.0.76.json',`${JSON.stringify(report,null,2)}\n`);
if(failures.length)throw new Error(`Strømaudit fejlede:\n- ${failures.slice(0,40).join('\n- ')}${failures.length>40?`\n... ${failures.length-40} flere`:''}`);
console.log(`OK (${liveMode}): ${verifiedGridZones}/${active.length} hovedzoner og ${verifiedScoreReadyParts}/${expectedParts.length} lokale kystdele har eksakt verificeret strøm eller dokumenteret native-cadence-tilstand; ${verifiedHours} hovedzonetimer er verificeret og ${unverifiedHours} er tydeligt ikke-verificerbare.`);
if(warnings.length)console.log(`ADVARSLER (${warnings.length}):\n- ${warnings.slice(0,30).join('\n- ')}`);
