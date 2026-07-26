import fs from 'node:fs/promises';
const path = 'data/zones.geojson';
const geojson = JSON.parse(await fs.readFile(path, 'utf8'));
const normalize = value => ((value % 360) + 360) % 360;
function bearing(from, to) {
  const meanLat = ((from[1] + to[1]) / 2) * Math.PI / 180;
  const east = (to[0] - from[0]) * Math.cos(meanLat);
  const north = to[1] - from[1];
  return normalize(Math.atan2(east, north) * 180 / Math.PI);
}
let changed = 0;
const audit = [];
for (const feature of geojson.features ?? []) {
  const p = feature.properties ?? {};
  if (p.zoneStatus === 'legacy') continue;
  if (!Array.isArray(p.dataPoint) || !Array.isArray(p.pinPoint)) throw new Error(`${p.id}: dataPoint/pinPoint mangler`);
  const expected = Math.round(bearing(p.dataPoint, p.pinPoint));
  const previous = Number(p.onshoreDirectionDeg);
  const delta = Math.abs(((previous - expected + 540) % 360) - 180);
  if (previous !== expected) changed += 1;
  p.onshoreDirectionDeg = expected;
  p.onshoreDirectionSource = 'bearing from offshore dataPoint toward beach pinPoint';
  p.onshoreDirectionAuditedAt = '2026-07-26';
  audit.push({ zoneId: p.id, name: p.name, previous, audited: expected, correctionDeg: Math.round(delta) });
}
await fs.writeFile(path, `${JSON.stringify(geojson, null, 2)}\n`);
await fs.writeFile('ONSHORE-DIRECTION-AUDIT.json', `${JSON.stringify({ generatedAt: new Date().toISOString(), method: 'Bearing from offshore dataPoint toward beach pinPoint; active zones only', activeZones: audit.length, changedZones: changed, zones: audit }, null, 2)}\n`);
console.log(`Auditeret ${audit.length} aktive zoner; ${changed} retninger opdateret.`);
