import fs from 'node:fs/promises';
const ZONES=['DK-B01-01','DK-B02-07','DK-B02-13','DK-B03-13'];
const strict=process.argv.includes('--strict');
const labels={
 'DK-B01-01':'kompleks åben vestkyst',
 'DK-B02-07':'nordjysk østkyst',
 'DK-B02-13':'åben kyst nord for Mariager Fjord; ikke fjordzone',
 'DK-B03-13':'højenergi-kyst med flere lokale kystretninger'
};
const [pkg,geo,conditions]=await Promise.all([
 fs.readFile('package.json','utf8').then(JSON.parse),
 fs.readFile('data/zones.geojson','utf8').then(JSON.parse),
 fs.readFile('data/live/conditions.json','utf8').then(JSON.parse)
]);
const byId=new Map((geo.features||[]).map(f=>[f.properties?.id,f]));
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const report={
 schemaVersion:2,
 version:pkg.version,
 generatedAt:new Date().toISOString(),
 dataset:{id:conditions.datasetId||null,generatedAt:conditions.generatedAt||null,schemaVersion:conditions.schemaVersion||null},
 mode:'shadow-validation',scoreImpact:'none',strictValidationRequested:strict,referenceZones:[]
};
for(const id of ZONES){
 const feature=byId.get(id); if(!feature)throw new Error(`Referencezonen ${id} mangler i zones.geojson.`);
 const p=feature.properties||{},z=conditions.zones?.[id]; if(!z)throw new Error(`Referencezonen ${id} mangler i conditions.json.`);
 const c=z.current||{},h=z.history||{};
 report.referenceZones.push({
  id,name:p.name,referenceRole:labels[id],classification:id==='DK-B02-13'?'open-coast-near-estuary':'reference-coast',
  geometry:{dataPoint:p.dataPoint||z.point||null,pinPoint:p.pinPoint||null,onshoreDirectionDeg:finite(p.onshoreDirectionDeg),coastType:p.coastType||null,coastLinePoints:Array.isArray(p.coastLine)?p.coastLine.length:0,onshoreDirectionSource:p.onshoreDirectionSource||null,reviewStatus:p.onshoreDirectionReviewStatus||null},
  morphology:{shallowWater:Boolean(p.shallowWater),reefs:Boolean(p.reefs),seagrass:Boolean(p.seagrass)},
  current:{speedMps:finite(c.currentSpeedMps),directionDeg:finite(c.currentDirectionDeg),uMps:finite(c.currentUMps),vMps:finite(c.currentVMps),provenance:c.currentProvenance||null},
  state:{mode:h.stateModelMode||null,eventPhase:h.eventPhase||null,strongEventDurationHours:finite(h.strongEventDurationHours),hoursSinceStrongEventEnd:finite(h.hoursSinceStrongEventEnd),inboundCurrentDurationHours:finite(h.inboundCurrentDurationHours),inboundCurrentMomentum:finite(h.inboundCurrentMomentum),outboundCurrentDurationHours:finite(h.outboundCurrentDurationHours),outboundCurrentPressure:finite(h.outboundCurrentPressure),activeCurrentRegime:h.activeCurrentRegime||null,activeCurrentRegimeDurationHours:finite(h.activeCurrentRegimeDurationHours),activeCurrentRegimeMomentum:finite(h.activeCurrentRegimeMomentum),activeCurrentRegimeStability:finite(h.activeCurrentRegimeStability),verifiedCurrentCoverageHours:finite(h.verifiedCurrentCoverageHours),unverifiedCurrentSampleCount:finite(h.unverifiedCurrentSampleCount),currentDirectionStability:finite(h.currentDirectionStability),mobilisationPotential:finite(h.mobilisationPotential),nearshorePotential:finite(h.nearshorePotential)},
  validation:{verifiedCurrent:c.currentProvenance?.status==='verified',shadowStatePresent:/^shadow-v[12]$/.test(h.stateModelMode||''),numericScoreChangedByReport:false}
 });
}
report.validationSummary={
 verifiedCurrentZones:report.referenceZones.filter(z=>z.validation.verifiedCurrent).length,
 shadowStateZones:report.referenceZones.filter(z=>z.validation.shadowStatePresent).length,
 expectedZones:report.referenceZones.length
};
await fs.mkdir('data/diagnostics',{recursive:true});
await fs.writeFile('data/diagnostics/state-reference-zones.json',JSON.stringify(report,null,2)+'\n');
const compact={generatedAt:report.generatedAt,dataset:report.dataset,summary:report.validationSummary,zones:report.referenceZones.map(z=>({id:z.id,current:{speedMps:z.current.speedMps,directionDeg:z.current.directionDeg,verified:z.validation.verifiedCurrent},state:z.state}))};
console.log(`RAVRADAR_STATE_REFERENCE ${JSON.stringify(compact)}`);
if(strict){
 const failures=[];
 if(!report.dataset.id||!report.dataset.generatedAt)failures.push('dataset metadata mangler');
 for(const z of report.referenceZones){
  if(!z.validation.verifiedCurrent)console.warn(`REFERENCE_CURRENT_WARNING ${z.id}: verificeret DMI-strøm mangler i dette datasæt`);
  if(!z.validation.shadowStatePresent)failures.push(`${z.id}: score-neutral skyggetilstand mangler`);
 }
 if(failures.length)throw new Error(`Streng referencezonevalidering fejlede: ${failures.join('; ')}`);
}
console.log(`Referencezonerapport skrevet for ${report.referenceZones.length} zoner${strict?' med streng produktionsvalidering':''}.`);
