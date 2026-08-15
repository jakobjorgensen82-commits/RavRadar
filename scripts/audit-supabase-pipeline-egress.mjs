import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const runsPerDay=Number(process.env.RAVRADAR_RUNS_PER_DAY||96);
const days=Number(process.env.RAVRADAR_BILLING_DAYS||30);
const hydration={
  'water-level-station-routing':'data/water-level-station-routing.json',
  'direction-reviews':'data/admin/direction-reviews.json',
  rules:'data/admin/admin-rules.json',
  'coastline-overrides':'data/admin/coastline-overrides.json',
  'dmi-water-stations':'data/live/dmi-water-stations.json',
  'coastal-parts-v2-activation':'data/geometry-v2/active-national-coastal-parts/manifest.json',
};
const protectedReadback={
  'dmi-water-stations':'data/live/dmi-water-stations.json',
  'coastal-parts-v2-activation':'data/geometry-v2/active-national-coastal-parts/manifest.json',
};
const avoidedHydration='data/live/water-station-routing-audit.json';
const compactBytes=file=>Buffer.byteLength(JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))));
const measure=entries=>Object.fromEntries(Object.entries(entries).map(([key,file])=>[key,compactBytes(file)]));
const hydrationBytes=measure(hydration);
const protectedBytes=measure(protectedReadback);
const perRun=Object.values(hydrationBytes).reduce((a,b)=>a+b,0)+Object.values(protectedBytes).reduce((a,b)=>a+b,0);
const avoidedBytesPerRun=compactBytes(avoidedHydration);
const monthly=perRun*runsPerDay*days;
const avoidedMonthly=avoidedBytesPerRun*runsPerDay*days;
console.log(JSON.stringify({
  status:'read-only-lower-bound',
  root,
  assumptions:{runsPerDay,days,httpAndBillingOverheadIncluded:false,manifestReadbackIncluded:false,adminAndUserTrafficIncluded:false},
  hydrationBytes,
  protectedReadbackBytes:protectedBytes,
  estimatedBytesPerRun:perRun,
  estimatedGiBPerPeriod:Number((monthly/1024**3).toFixed(3)),
  avoidedRoutingAuditBytesPerRun:avoidedBytesPerRun,
  avoidedRoutingAuditGiBPerPeriod:Number((avoidedMonthly/1024**3).toFixed(3)),
  note:'Dette er en pipeline-estimator, ikke Supabases faktiske billingmåling.',
},null,2));
