import fs from "node:fs";
const zones=JSON.parse(fs.readFileSync(new URL("../data/zones.geojson", import.meta.url)));
const errors=[];
for(const feature of zones.features||[]){
 const p=feature.properties||{};
 if(p.zoneStatus==="legacy") continue;
 if(!Array.isArray(p.coastLine)||p.coastLine.length<2) errors.push(`${p.id}: mangler kystlinje`);
 if(p.coastLineVersion!=="2.6.19") errors.push(`${p.id}: gammel kystlinjeversion`);
 for(const point of p.coastLine||[]) if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)) errors.push(`${p.id}: ugyldigt koordinat`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`Kystlinjer valideret: ${(zones.features||[]).filter(f=>f?.properties?.zoneStatus!=="legacy").length} aktive zoner.`);
