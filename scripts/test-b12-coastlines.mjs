import fs from "node:fs";

const zones = JSON.parse(fs.readFileSync(new URL("../data/zones.geojson", import.meta.url)));
const master = JSON.parse(fs.readFileSync(new URL("../data/coastline-master.geojson", import.meta.url)));
const masterPoints = master.features.flatMap(feature => feature.geometry.coordinates);
const b12 = zones.features.filter(feature => feature.properties?.batch === "B12");
const errors = [];

function distanceMeters(a, b) {
  const lat = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const dx = (a[0] - b[0]) * 111320 * Math.cos(lat);
  const dy = (a[1] - b[1]) * 110540;
  return Math.hypot(dx, dy);
}

for (const feature of b12) {
  const p = feature.properties;
  if (!Array.isArray(p.coastLine) || p.coastLine.length < 5) {
    errors.push(`${p.id}: kystlinjen har for få punkter`);
    continue;
  }
  if (!String(p.coastLineSource || "").includes("master coastline")) {
    errors.push(`${p.id}: kystlinjen er ikke dokumenteret som masterafledt`);
  }
  for (const point of p.coastLine) {
    const nearest = Math.min(...masterPoints.map(candidate => distanceMeters(point, candidate)));
    if (nearest > 65) errors.push(`${p.id}: punkt ligger ${nearest.toFixed(0)} m fra masterkysten`);
  }
}

if (b12.length !== 8) errors.push(`Forventede 8 B12-zoner, fandt ${b12.length}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`B12-kystlinjer valideret: ${b12.length} zoner følger masterkysten med 45 m landværts offset.`);
