import assert from "node:assert/strict";
import fs from "node:fs";
const zones = JSON.parse(fs.readFileSync(new URL("../data/zones.geojson", import.meta.url)));
const master = JSON.parse(fs.readFileSync(new URL("../data/coastline-master.geojson", import.meta.url)));
const masterLines = master.features.map(feature => feature.geometry.coordinates);
const active = zones.features.filter(feature => feature.properties?.zoneStatus === "active");

function segmentDistance(point, a, b) {
  const lat = point[1] * Math.PI / 180;
  const sx = 111320 * Math.cos(lat), sy = 110540;
  const px = point[0] * sx, py = point[1] * sy;
  const ax = a[0] * sx, ay = a[1] * sy, bx = b[0] * sx, by = b[1] * sy;
  const dx = bx - ax, dy = by - ay, denominator = dx * dx + dy * dy;
  const t = denominator ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distanceToMaster(point) {
  let best = Infinity;
  for (const line of masterLines) for (let i = 0; i < line.length - 1; i += 1) best = Math.min(best, segmentDistance(point, line[i], line[i + 1]));
  return best;
}
function pointDistance(a, b) { return segmentDistance(a, b, b); }

assert.ok(active.length>=150, `For få aktive zoner efter godkendte sletninger: ${active.length}`);
let detailed = 0;
for (const feature of active) {
  const p = feature.properties;
  assert.equal(p.coastLineVersion, "4.0.45", `${p.id}: forkert kystlinjeversion`);
  assert.ok(["master-snapped", "audited-existing-fallback"].includes(p.coastLineRefinementMode), `${p.id}: ukendt forfiningstilstand`);
  if (p.coastLineRefinementMode === "master-snapped") assert.match(p.coastLineSource, /master coastline.*8 m/i, `${p.id}: mangler dokumenteret strand-offset`);
  assert.ok(Array.isArray(p.coastLine) && p.coastLine.length >= 2, `${p.id}: mangler kystlinje`);
  if (p.coastLine.length >= 10) detailed += 1;
  for (let i = 0; i < p.coastLine.length; i += 1) {
    const point = p.coastLine[i];
    assert.ok(Array.isArray(point) && point.length === 2 && point.every(Number.isFinite), `${p.id}: ugyldigt punkt`);
    if (p.coastLineRefinementMode === "master-snapped") assert.ok(distanceToMaster(point) <= 22, `${p.id}: punkt er mere end 22 m fra masterkysten`);
    if (i && p.coastLineRefinementMode === "master-snapped") assert.ok(pointDistance(p.coastLine[i - 1], point) <= 150, `${p.id}: for stort spring mellem kystpunkter`);
  }
}
assert.ok(detailed >= 190, `Kun ${detailed} zoner har detaljeret strandforløb`);
const fallback = active.filter(feature => feature.properties.coastLineRefinementMode !== "master-snapped");
assert.ok(fallback.length <= 1, `For mange zoner bruger sikker fallback: ${fallback.length}`);
console.log(`Kystlinjefinjustering 4.0.45 valideret: ${active.length} zoner, ${active.length - fallback.length} master-snappede og ${fallback.length} sikker fallback.`);
