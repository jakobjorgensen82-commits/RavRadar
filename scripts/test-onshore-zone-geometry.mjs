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

// Retningskonventionen testes på faste syntetiske geometrier. Produktionszoner
// kan lovligt ændres gennem admin og må derfor ikke være hårdkodede til gamle grader.
const fixtures = [
  { name: 'nord', from: [10, 56], to: [10, 56.1], expected: 0 },
  { name: 'øst', from: [10, 56], to: [10.1, 56], expected: 90 },
  { name: 'syd', from: [10, 56], to: [10, 55.9], expected: 180 },
  { name: 'vest', from: [10, 56], to: [9.9, 56], expected: 270 }
];
for (const fixture of fixtures) {
  assert.ok(
    angularDifference(bearing(fixture.from, fixture.to), fixture.expected) <= 0.2,
    `Syntetisk ${fixture.name}-retning skal give ${fixture.expected}°`
  );
}

const geojson = JSON.parse(await fs.readFile('data/zones.geojson', 'utf8'));
const detailed = (geojson.features ?? []).filter(({ properties: p = {} }) =>
  /^DK-B(?:\d{2}-\d{2}|11-(?:SAM|LAE)-\d{2})$/.test(p.id ?? '') && p.zoneStatus !== 'legacy'
);
assert.ok(detailed.length >= 150, `For få aktuelle detaljerede kystzoner: ${detailed.length}`);
for (const { properties: p } of detailed) {
  assert.ok(Array.isArray(p.dataPoint) && Array.isArray(p.pinPoint), `${p.id}: mangler dataPoint/pinPoint`);
  const expected = bearing(p.dataPoint, p.pinPoint);
  assert.notEqual(expected, null, `${p.id}: identiske hav- og landpunkter`);
  const delta = angularDifference(Number(p.onshoreDirectionDeg), expected);
  assert.ok(
    delta <= 1.1,
    `${p.id}: pålandsretning ${p.onshoreDirectionDeg}° afviger ${delta.toFixed(1)}° fra hav→land ${expected.toFixed(1)}°`
  );
}
console.log(`Onshore-geometri: ${detailed.length} detaljerede zoner valideret; godkendte adminretninger stemmer med hav→land-geometrien.`);
