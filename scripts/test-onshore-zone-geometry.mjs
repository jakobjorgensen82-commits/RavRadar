import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const normalize = value => ((value % 360) + 360) % 360;
const angularDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
function bearing(from, to) {
  const meanLat = ((from[1] + to[1]) / 2) * Math.PI / 180;
  const east = (to[0] - from[0]) * Math.cos(meanLat);
  const north = to[1] - from[1];
  if (Math.hypot(east, north) < 1e-10) return null;
  return normalize(Math.atan2(east, north) * 180 / Math.PI);
}
const geojson = JSON.parse(await fs.readFile('data/zones.geojson', 'utf8'));
const detailed = (geojson.features ?? []).filter(({properties:p={}}) => /^DK-B(?:\d{2}-\d{2}|11-(?:SAM|LAE)-\d{2})$/.test(p.id ?? '') && p.zoneStatus !== 'legacy');
assert.equal(detailed.length, 209, 'Forventede 209 aktuelle detaljerede kystzoner');
for (const {properties:p} of detailed) {
  assert.ok(Array.isArray(p.dataPoint) && Array.isArray(p.pinPoint), `${p.id}: mangler dataPoint/pinPoint`);
  const expected = bearing(p.dataPoint, p.pinPoint);
  assert.notEqual(expected, null, `${p.id}: identiske hav- og landpunkter`);
  const delta = angularDifference(Number(p.onshoreDirectionDeg), expected);
  assert.ok(delta <= 1.1, `${p.id}: pålandsretning ${p.onshoreDirectionDeg}° afviger ${delta.toFixed(1)}° fra hav→land ${expected.toFixed(1)}°`);
}
const byId = new Map(detailed.map(f => [f.properties.id, f.properties]));
assert.ok(angularDifference(byId.get('DK-B02-12').onshoreDirectionDeg, 268) <= 1, 'Øster Hurup skal pege mod land mod vest');
assert.ok(angularDifference(byId.get('DK-B06-03').onshoreDirectionDeg, 270) <= 1, 'Grenaa skal pege mod land mod vest');
assert.ok(angularDifference(byId.get('DK-B03-13').onshoreDirectionDeg, 90) <= 1, 'Blåvand skal pege mod land mod øst');
console.log(`Onshore-geometri: ${detailed.length} detaljerede zoner valideret; hav→land-retningen er konsistent.`);
