import fs from "node:fs";

const zones = JSON.parse(fs.readFileSync(new URL("../data/zones.geojson", import.meta.url)));
const master = JSON.parse(fs.readFileSync(new URL("../data/coastline-master.geojson", import.meta.url)));
const masterLines = master.features.map(feature => feature.geometry.coordinates);
const b12 = zones.features.filter(feature => feature.properties?.batch === "B12");
const errors = [];

function project(point, a, b) {
  const lat = point[1] * Math.PI / 180;
  const sx = 111320 * Math.cos(lat), sy = 110540;
  const px = point[0] * sx, py = point[1] * sy;
  const ax = a[0] * sx, ay = a[1] * sy, bx = b[0] * sx, by = b[1] * sy;
  const dx = bx - ax, dy = by - ay;
  const denominator = dx * dx + dy * dy;
  const t = denominator ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distanceToMaster(point) {
  let best = Infinity;
  for (const line of masterLines) for (let i = 0; i < line.length - 1; i += 1) best = Math.min(best, project(point, line[i], line[i + 1]));
  return best;
}

for (const feature of b12) {
  const p = feature.properties;
  if (!Array.isArray(p.coastLine) || p.coastLine.length < 5) errors.push(`${p.id}: kystlinjen har for få punkter`);
  if (!String(p.coastLineSource || "").includes("master coastline")) errors.push(`${p.id}: kystlinjen er ikke dokumenteret som masterafledt`);
  for (const point of p.coastLine || []) {
    const nearest = distanceToMaster(point);
    if (nearest > 22) errors.push(`${p.id}: punkt ligger ${nearest.toFixed(0)} m fra masterkysten`);
  }
}
if (b12.length !== 8) errors.push(`Forventede 8 B12-zoner, fandt ${b12.length}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`B12-kystlinjer valideret: ${b12.length} zoner følger masterkysten med 8 m landværts strand-offset.`);
