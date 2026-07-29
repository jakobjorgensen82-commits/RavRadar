import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const exists = path => fs.existsSync(path);
const zonesDoc = readJson('data/zones.geojson');
const conditions = readJson('data/live/conditions.json');
const active = (zonesDoc.features || []).filter(f => f.properties?.status !== 'legacy' && f.properties?.zoneStatus !== 'legacy');
const issues = [];
const horizons = [];
const providerSwitchDetails = [];
const norm = n => ((Number(n) % 360) + 360) % 360;
const bearing = (a,b) => { const r=Math.PI/180,[x1,y1]=a.map(Number),[x2,y2]=b.map(Number);const p1=y1*r,p2=y2*r,d=(x2-x1)*r;return norm(Math.atan2(Math.sin(d)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(d))/r); };
const angleDiff = (a,b) => { const d=Math.abs(norm(a)-norm(b));return Math.min(d,360-d); };
const hoursBetween = (a,b) => (Date.parse(b)-Date.parse(a))/36e5;
const components = ['wind','wave','current','waterLevel'];
const summary = {
  generatedAt: new Date().toISOString(), version: '4.0.32', activeZones: active.length,
  conditionsZones: Object.keys(conditions.zones || {}).length, zonesWithDirectionAnchors: 0,
  zonesWithValidGeometryDirection: 0, zonesWithAdminStationOverride: 0,
  duplicateForecastTimestampZones: 0, nonMonotonicForecastZones: 0,
  zonesBelowAcceptedHorizon: 0, acceptedMinimumForecastHours: 117,
  hourlyProviderSwitches: { wind:0,wave:0,current:0,waterLevel:0 },
  componentMissingZones: { wind:0,wave:0,current:0,waterLevel:0 },
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
    for (const row of rows) {
      const source=row.sources?.[component]||zone.sources?.[component]||{};
      const provider=source.provider||null;
      if(provider) seen=true;
      if (provider && prev && provider!==prev) {summary.hourlyProviderSwitches[component]++;providerSwitchDetails.push({zoneId,component,time:row.time,from:prev,to:provider});}
      if (provider) prev=provider;
    }
    if(!seen && !zone.sources?.[component]?.provider) summary.componentMissingZones[component]++;
  }
}
const routing=exists('data/water-level-station-routing.json')?readJson('data/water-level-station-routing.json'):{zones:{}};
summary.zonesWithAdminStationOverride=Object.values(routing.zones||{}).filter(x=>x?.enabled).length;
if(horizons.length){const sorted=[...horizons].sort((a,b)=>a-b);summary.forecastHorizonHours={min:Number(sorted[0].toFixed(1)),median:Number(sorted[Math.floor(sorted.length/2)].toFixed(1)),max:Number(sorted.at(-1).toFixed(1))};}
const cacheAudit=exists('data/diagnostics/dmi-cache-audit.json')?readJson('data/diagnostics/dmi-cache-audit.json'):null;
const ocean=exists('data/diagnostics/dmi-ocean-diagnostics.json')?readJson('data/diagnostics/dmi-ocean-diagnostics.json'):null;
const report={schemaVersion:2,...summary,summary,cacheAuditSummary:cacheAudit?{beforeBytes:cacheAudit.beforeBytes??cacheAudit.sizeBeforeBytes,afterBytes:cacheAudit.afterBytes??cacheAudit.sizeAfterBytes,filesKept:cacheAudit.filesKept??cacheAudit.keptFiles?.length,filesRemoved:cacheAudit.filesRemoved??cacheAudit.removedFiles?.length}:null,marineCoverage:ocean?.summary||null,providerSwitchDetails:providerSwitchDetails.slice(0,1000),issues,issueCounts:{errors:issues.filter(x=>x.severity==='error').length,warnings:issues.filter(x=>x.severity==='warning').length}};
fs.mkdirSync('data/diagnostics',{recursive:true});
fs.writeFileSync('data/diagnostics/implementation-plan-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(process.env.RAVRADAR_AUDIT_STRICT==='true' && report.issueCounts.errors) process.exitCode=1;
