import fs from 'node:fs/promises';
const ZONES=['DK-B01-01','DK-B02-07','DK-B02-13','DK-B03-13'];
const labels={
 'DK-B01-01':'kompleks åben vestkyst',
 'DK-B02-07':'nordjysk østkyst',
 'DK-B02-13':'åben kyst nord for Mariager Fjord; ikke fjordzone',
 'DK-B03-13':'højenergi-kyst med flere lokale kystretninger'
};
const [geo,conditions]=await Promise.all([
 fs.readFile('data/zones.geojson','utf8').then(JSON.parse),
 fs.readFile('data/live/conditions.json','utf8').then(JSON.parse)
]);
const byId=new Map((geo.features||[]).map(f=>[f.properties?.id,f]));
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const report={schemaVersion:1,version:'4.0.112',generatedAt:new Date().toISOString(),mode:'shadow-validation',scoreImpact:'none',referenceZones:[]};
for(const id of ZONES){
 const feature=byId.get(id); if(!feature)throw new Error(`Referencezonen ${id} mangler i zones.geojson.`);
 const p=feature.properties||{},z=conditions.zones?.[id]; if(!z)throw new Error(`Referencezonen ${id} mangler i conditions.json.`);
 const c=z.current||{},h=z.history||{};
 report.referenceZones.push({
  id,name:p.name,referenceRole:labels[id],classification:id==='DK-B02-13'?'open-coast-near-estuary':'reference-coast',
  geometry:{dataPoint:p.dataPoint||z.point||null,pinPoint:p.pinPoint||null,onshoreDirectionDeg:finite(p.onshoreDirectionDeg),coastType:p.coastType||null,coastLinePoints:Array.isArray(p.coastLine)?p.coastLine.length:0,onshoreDirectionSource:p.onshoreDirectionSource||null,reviewStatus:p.onshoreDirectionReviewStatus||null},
  morphology:{shallowWater:Boolean(p.shallowWater),reefs:Boolean(p.reefs),seagrass:Boolean(p.seagrass)},
  current:{speedMps:finite(c.currentSpeedMps),directionDeg:finite(c.currentDirectionDeg),uMps:finite(c.currentUMps),vMps:finite(c.currentVMps),provenance:c.currentProvenance||null},
  state:{mode:h.stateModelMode||null,eventPhase:h.eventPhase||null,strongEventDurationHours:finite(h.strongEventDurationHours),hoursSinceStrongEventEnd:finite(h.hoursSinceStrongEventEnd),inboundCurrentDurationHours:finite(h.inboundCurrentDurationHours),inboundCurrentMomentum:finite(h.inboundCurrentMomentum),outboundCurrentDurationHours:finite(h.outboundCurrentDurationHours),outboundCurrentPressure:finite(h.outboundCurrentPressure),currentDirectionStability:finite(h.currentDirectionStability),mobilisationPotential:finite(h.mobilisationPotential),nearshorePotential:finite(h.nearshorePotential)},
  validation:{verifiedCurrent:c.currentProvenance?.status==='verified',shadowStatePresent:h.stateModelMode==='shadow-v1',numericScoreChangedByReport:false}
 });
}
await fs.mkdir('data/diagnostics',{recursive:true});
await fs.writeFile('data/diagnostics/state-reference-zones.json',JSON.stringify(report,null,2)+'\n');
console.log(`Referencezonerapport skrevet for ${report.referenceZones.length} zoner.`);
