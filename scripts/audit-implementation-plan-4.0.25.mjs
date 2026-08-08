import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const exists = path => fs.existsSync(path);
const zonesDoc = readJson('data/zones.geojson');
const conditions = readJson('data/live/conditions.json');
const projectVersion = readJson('package.json').version;
const active = (zonesDoc.features || []).filter(f => f.properties?.zoneStatus === 'active');
const issues = [];
const horizons = [];
const providerSwitchDetails = [];
const norm = n => ((Number(n) % 360) + 360) % 360;
const bearing = (a,b) => { const r=Math.PI/180,[x1,y1]=a.map(Number),[x2,y2]=b.map(Number);const p1=y1*r,p2=y2*r,d=(x2-x1)*r;return norm(Math.atan2(Math.sin(d)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(d))/r); };
const angleDiff = (a,b) => { const d=Math.abs(norm(a)-norm(b));return Math.min(d,360-d); };
const hoursBetween = (a,b) => (Date.parse(b)-Date.parse(a))/36e5;
const componentFields = {
  wind: ['windSpeedMps','windDirectionDeg'],
  wave: ['waveHeightM','waveDirectionDeg','wavePeriodS'],
  current: ['currentSpeedMps','currentDirectionDeg'],
  waterLevel: ['waterLevelCm'],
  waterTemperature: ['waterTemperatureC']
};
const components = Object.keys(componentFields);
const intervalCoverage = Object.fromEntries(components.map(component => [component, {
  totalZones: active.length, completeZones: 0, zonesWithMissingHours: 0,
  validHours: 0, dmiHours: 0, fallbackHours: 0, missingHours: 0,
  providerHours: {}, dmiHoursMissingProvenance: { collection: 0, modelRun: 0, leadTimeHours: 0, forecastAgeHours: 0 },
  minimumValidHours: null, maximumValidHours: null, zoneDetails: []
}]));
const providerClass = provider => provider === 'dmi' ? 'dmi' : provider === 'missing' ? 'missing' : 'fallback';
const buildIntervals = rows => {
  const intervals=[];
  for(const row of rows){
    const previous=intervals.at(-1), contiguous=previous && Date.parse(row.time)-Date.parse(previous.endTime)===36e5;
    if(previous && contiguous && previous.provider===row.provider && previous.status===row.status){
      previous.endTime=row.time; previous.hours+=1;
    }else intervals.push({startTime:row.time,endTime:row.time,hours:1,provider:row.provider,status:row.status});
  }
  return intervals;
};
const summary = {
  generatedAt: new Date().toISOString(), version: projectVersion, activeZones: active.length,
  conditionsZones: Object.keys(conditions.zones || {}).length, zonesWithDirectionAnchors: 0,
  zonesWithValidGeometryDirection: 0, zonesWithAdminStationOverride: 0,
  duplicateForecastTimestampZones: 0, nonMonotonicForecastZones: 0,
  zonesBelowAcceptedHorizon: 0, acceptedMinimumForecastHours: 117,
  hourlyProviderSwitches: Object.fromEntries(components.map(component => [component,0])),
  componentMissingZones: Object.fromEntries(components.map(component => [component,0])),
  alsOddePlacementVerified: false, forecastHorizonHours: { min:null,median:null,max:null }
};
for (const f of active) {
  const p=f.properties||{}, zoneId=p.id;
  if (Array.isArray(p.directionAnchors) && p.directionAnchors.length) summary.zonesWithDirectionAnchors++;
  if (Array.isArray(p.dataPoint) && Array.isArray(p.pinPoint) && Number.isFinite(Number(p.onshoreDirectionDeg))) {
    const d=angleDiff(p.onshoreDirectionDeg,bearing(p.dataPoint,p.pinPoint));
    if (d <= 45) summary.zonesWithValidGeometryDirection++;
    else issues.push({severity:'warning',code:'ONSHORE_DIRECTION_GEOMETRY_MISMATCH',zoneId,differenceDeg:Math.round(d)});
  } else issues.push({severity:'error',code:'MISSING_DIRECTION_GEOMETRY',zoneId});
  if (zoneId==='DK-B02-13') {
    const lat=Number(p.pinPoint?.[1]);
    summary.alsOddePlacementVerified = p.region==='Mariager Fjord munding nord' && lat>56.68;
    if(!summary.alsOddePlacementVerified) issues.push({severity:'error',code:'ALS_ODDE_PLACEMENT_REGRESSION',zoneId,region:p.region,pinPoint:p.pinPoint});
  }
  const zone=conditions.zones?.[zoneId]||{};
  const rows=zone.forecast?.hourly||zone.hourly||[];
  const times=rows.map(r=>r.time).filter(Boolean);
  if (new Set(times).size !== times.length) {summary.duplicateForecastTimestampZones++;issues.push({severity:'error',code:'DUPLICATE_FORECAST_TIMES',zoneId});}
  if(times.some((t,i)=>i && Date.parse(t)<=Date.parse(times[i-1]))) {summary.nonMonotonicForecastZones++;issues.push({severity:'error',code:'NON_MONOTONIC_FORECAST_TIMES',zoneId});}
  if(times.length>1){const h=hoursBetween(times[0],times.at(-1));if(Number.isFinite(h)){horizons.push(h);if(h<summary.acceptedMinimumForecastHours){summary.zonesBelowAcceptedHorizon++;issues.push({severity:'warning',code:'FORECAST_HORIZON_BELOW_ACCEPTED_MINIMUM',zoneId,hours:Number(h.toFixed(1))});}}}
  for (const component of components) {
    let prev=null;
    let seen=false;
    const coverage=intervalCoverage[component];
    const classified=[];
    for (const row of rows) {
      const source=row.sources?.[component]||zone.sources?.[component]||{};
      const valid=componentFields[component].every(key => Number.isFinite(row[key]));
      const provider=valid ? (source.provider||'unknown') : 'missing';
      const status=providerClass(provider);
      classified.push({time:row.time,provider,status});
      coverage.providerHours[provider]=(coverage.providerHours[provider]||0)+1;
      if(status==='missing') coverage.missingHours++;
      else {
        coverage.validHours++;
        if(status==='dmi'){
          coverage.dmiHours++;
          if(!source.collection) coverage.dmiHoursMissingProvenance.collection++;
          if(!source.modelRun) coverage.dmiHoursMissingProvenance.modelRun++;
          if(!Number.isFinite(source.leadTimeHours)) coverage.dmiHoursMissingProvenance.leadTimeHours++;
          if(!Number.isFinite(source.forecastAgeHours)) coverage.dmiHoursMissingProvenance.forecastAgeHours++;
        } else coverage.fallbackHours++;
      }
      if(provider) seen=true;
      if (provider && prev && provider!==prev) {summary.hourlyProviderSwitches[component]++;providerSwitchDetails.push({zoneId,component,time:row.time,from:prev,to:provider});}
      if (provider) prev=provider;
    }
    const validHours=classified.filter(row=>row.status!=='missing').length;
    const dmiHours=classified.filter(row=>row.status==='dmi').length;
    const fallbackHours=classified.filter(row=>row.status==='fallback').length;
    const missingHours=classified.length-validHours;
    if(!seen || missingHours===classified.length) summary.componentMissingZones[component]++;
    if(missingHours===0 && classified.length>=summary.acceptedMinimumForecastHours) coverage.completeZones++;
    if(missingHours>0) coverage.zonesWithMissingHours++;
    coverage.minimumValidHours=coverage.minimumValidHours===null?validHours:Math.min(coverage.minimumValidHours,validHours);
    coverage.maximumValidHours=coverage.maximumValidHours===null?validHours:Math.max(coverage.maximumValidHours,validHours);
    coverage.zoneDetails.push({zoneId,totalHours:classified.length,validHours,dmiHours,fallbackHours,missingHours,intervals:buildIntervals(classified)});
    if(missingHours>0) issues.push({severity:'warning',code:'COMPONENT_INTERVAL_INCOMPLETE',zoneId,component,validHours,totalHours:classified.length});
  }
}
const routing=exists('data/water-level-station-routing.json')?readJson('data/water-level-station-routing.json'):{zones:{}};
summary.zonesWithAdminStationOverride=Object.values(routing.zones||{}).filter(x=>x?.enabled).length;
if(horizons.length){const sorted=[...horizons].sort((a,b)=>a-b);summary.forecastHorizonHours={min:Number(sorted[0].toFixed(1)),median:Number(sorted[Math.floor(sorted.length/2)].toFixed(1)),max:Number(sorted.at(-1).toFixed(1))};}
const cacheAudit=exists('data/diagnostics/dmi-cache-audit.json')?readJson('data/diagnostics/dmi-cache-audit.json'):null;
const ocean=exists('data/diagnostics/dmi-ocean-diagnostics.json')?readJson('data/diagnostics/dmi-ocean-diagnostics.json'):null;
for(const [component,coverage] of Object.entries(intervalCoverage)){
  const missing=coverage.dmiHoursMissingProvenance;
  if(Object.values(missing).some(value=>value>0)) issues.push({severity:'warning',code:'DMI_HOURLY_PROVENANCE_INCOMPLETE',component,dmiHours:coverage.dmiHours,missing});
}
const report={schemaVersion:3,...summary,summary,componentIntervalCoverage:intervalCoverage,cacheAuditSummary:cacheAudit?{beforeBytes:cacheAudit.beforeBytes??cacheAudit.sizeBeforeBytes,afterBytes:cacheAudit.afterBytes??cacheAudit.sizeAfterBytes,filesKept:cacheAudit.filesKept??cacheAudit.keptFiles?.length,filesRemoved:cacheAudit.filesRemoved??cacheAudit.removedFiles?.length}:null,marineCoverage:ocean?.summary||null,providerSwitchDetails:providerSwitchDetails.slice(0,1000),issues,issueCounts:{errors:issues.filter(x=>x.severity==='error').length,warnings:issues.filter(x=>x.severity==='warning').length}};
fs.mkdirSync('data/diagnostics',{recursive:true});
fs.writeFileSync('data/diagnostics/implementation-plan-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(process.env.RAVRADAR_AUDIT_STRICT==='true' && report.issueCounts.errors) process.exitCode=1;
