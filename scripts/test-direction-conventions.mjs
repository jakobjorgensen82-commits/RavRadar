import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { uvToTowardDirectionDeg } from './lib/dmi-forecast-store.mjs';
import { calculateRavScore } from '../js/core/score-engine.js';

const angularDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const vectors = [
  [0, 1, 0], [1, 1, 45], [1, 0, 90], [1, -1, 135],
  [0, -1, 180], [-1, -1, 225], [-1, 0, 270], [-1, 1, 315]
];
for (const [u, v, expected] of vectors) {
  assert.ok(angularDifference(uvToTowardDirectionDeg(u, v), expected) < 1e-9, `U=${u}, V=${v} skal give ${expected}° mod-retning`);
}
assert.equal(uvToTowardDirectionDeg(null, 1), null);

function transport({ onshore, currentToward, windFrom }) {
  return calculateRavScore({
    mode: 'beach',
    zone: { id: 'DIRECTION-TEST', coastType: 'test', onshoreDirectionDeg: onshore },
    weather: { windSpeedMps: 6, windDirectionDeg: windFrom, waveHeightM: 0.5, currentSpeedMps: 0.5, currentDirectionDeg: currentToward, waterLevelTrendCm3h: 0 },
    history: { maxWind24hMps: 6, maxWave24hM: 0.5, hoursSinceHighEnergy: 12 }
  }).components.transport;
}
assert.ok(transport({ onshore: 90, currentToward: 90, windFrom: 270 }) > transport({ onshore: 90, currentToward: 270, windFrom: 90 }), 'Vestkyst: strøm mod øst og vind fra vest skal være mere påland end det modsatte');
assert.ok(transport({ onshore: 270, currentToward: 270, windFrom: 90 }) > transport({ onshore: 270, currentToward: 90, windFrom: 270 }), 'Østkyst: strøm mod vest og vind fra øst skal være mere påland end det modsatte');

const zones = JSON.parse(await fs.readFile('data/zones.geojson', 'utf8'));
let active = 0;
for (const feature of zones.features ?? []) {
  const p = feature.properties ?? {};
  if (p.zoneStatus === 'legacy') continue;
  active += 1;
  assert.ok(Array.isArray(p.dataPoint) && Array.isArray(p.pinPoint), `${p.id}: datapunkter mangler`);
  const meanLat = ((p.dataPoint[1] + p.pinPoint[1]) / 2) * Math.PI / 180;
  const expected = ((Math.atan2((p.pinPoint[0] - p.dataPoint[0]) * Math.cos(meanLat), p.pinPoint[1] - p.dataPoint[1]) * 180 / Math.PI) % 360 + 360) % 360;
  assert.ok(angularDifference(p.onshoreDirectionDeg, expected) <= 1, `${p.id}: onshoreDirectionDeg ${p.onshoreDirectionDeg}° afviger fra hav→land-bearing ${expected.toFixed(1)}°`);
  assert.equal(p.onshoreDirectionSource, 'bearing from offshore dataPoint toward beach pinPoint', `${p.id}: auditkilde mangler`);
}
assert.equal(active, 222);
console.log(`Retningskonventioner og ${active} aktive onshore-retninger er dokumenteret og valideret.`);
