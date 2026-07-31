import fs from "node:fs";
const zones=JSON.parse(fs.readFileSync(new URL("../data/zones.geojson",import.meta.url)));
const fallback=JSON.parse(fs.readFileSync(new URL("../data/geometry-snapshots/zones-4.0.44.geojson",import.meta.url)));
const audit=JSON.parse(fs.readFileSync(new URL("../data/diagnostics/constrained-coastline-4.0.48.json",import.meta.url)));
const fallbackById=new Map(fallback.features.map(f=>[f.properties.id,f]));
const auditById=new Map(audit.zones.map(z=>[z.zoneId,z]));
const b12=zones.features.filter(f=>f.properties?.batch==="B12");
const errors=[];
for(const f of b12){
 const p=f.properties, a=auditById.get(p.id);
 if(!Array.isArray(p.coastLine)||p.coastLine.length<2) errors.push(`${p.id}: ugyldig kystlinje`);
 if(!a) errors.push(`${p.id}: mangler 4.0.48-audit`);
 if(p.coastLineVersion==="4.0.48"){
  if(p.coastLineRefinementMode!=="constrained-nearest-natural-coast") errors.push(`${p.id}: forkert refinement mode`);
  if(a?.status!=="refined"||a.p95DistanceM>480||a.maximumDistanceM>750) errors.push(`${p.id}: forfinelse overskrider sikkerhedsgrænser`);
 } else if(p.coastLineVersion==="4.0.48-safe-fallback"){
  const original=fallbackById.get(p.id)?.properties?.coastLine;
  if(JSON.stringify(original)!==JSON.stringify(p.coastLine)) errors.push(`${p.id}: fallback matcher ikke 4.0.44`);
 } else errors.push(`${p.id}: ukendt geometri-version ${p.coastLineVersion}`);
}
if(b12.length!==8) errors.push(`Forventede 8 B12-zoner, fandt ${b12.length}`);
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`B12-kystlinjer valideret: ${b12.length} zoner følger 4.0.48-sikkerhedsmodellen.`);
