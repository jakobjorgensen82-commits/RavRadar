import fs from "node:fs";
const zones=JSON.parse(fs.readFileSync(new URL("../data/zones.geojson", import.meta.url)));
const errors=[];
const allowed=new Set(["2.6.24","3.0.2","4.0.45","4.0.46-safe-rollback","4.0.47","4.0.44-fallback","4.0.48","4.0.48-safe-fallback"]);
for(const feature of zones.features||[]){
 const p=feature.properties||{};
 if(p.zoneStatus!=="active") continue;
 if(!Array.isArray(p.coastLine)||p.coastLine.length<2) errors.push(`${p.id}: mangler kystlinje`);
 if(!allowed.has(p.coastLineVersion)) errors.push(`${p.id}: ukendt kystlinjeversion ${p.coastLineVersion}`);
 for(const point of p.coastLine||[]) if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)) errors.push(`${p.id}: ugyldigt koordinat`);
 if(p.coastLineVersion==="4.0.47" && p.coastLineRefinementMode!=="source-segment-natural-coast") errors.push(`${p.id}: produktionskyst mangler korrekt refinement mode`);
 if(p.coastLineVersion==="4.0.48" && p.coastLineRefinementMode!=="constrained-nearest-natural-coast") errors.push(`${p.id}: 4.0.48-kyst mangler korrekt refinement mode`);
 if(p.coastLineVersion==="4.0.44-fallback" && p.coastLineRefinementMode!=="audited-safe-fallback") errors.push(`${p.id}: fallback mangler korrekt refinement mode`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`Kystlinjer valideret: ${(zones.features||[]).filter(f=>f?.properties?.zoneStatus==="active").length} aktive zoner.`);
