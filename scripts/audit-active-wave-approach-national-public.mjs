import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateRavScore, scoreRating } from '../js/core/score-engine.js';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Brug: node scripts/audit-active-wave-approach-national-public.mjs <public-conditions.json>');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const zones = payload?.zones || {};
const parts = payload?.coastalParts?.parts || {};
const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const rows = [];
const missing = { zone: 0, waveHeight: 0, waveDirection: 0, wavePeriod: 0, onshoreDirection: 0 };

for (const [partId, part] of Object.entries(parts)) {
  const zoneConditions = zones[part.zoneId];
  if (!zoneConditions) missing.zone += 1;
  const localWeather = part.current?.weather || {};
  const weather = {
    ...zoneConditions?.current,
    ...localWeather,
    wavePeriodS: zoneConditions?.current?.wavePeriodS ?? null
  };
  if (!finite(weather.waveHeightM)) missing.waveHeight += 1;
  if (!finite(weather.waveDirectionDeg)) missing.waveDirection += 1;
  if (!finite(weather.wavePeriodS)) missing.wavePeriod += 1;
  if (!finite(part.onshoreDirectionDeg)) missing.onshoreDirection += 1;
  const zone = { id: partId, onshoreDirectionDeg: part.onshoreDirectionDeg, shallowWater: false, reefs: false, seagrass: false };
  const history = zoneConditions?.history || {};

  for (const mode of ['waders', 'beach']) {
    const active = calculateRavScore({ mode, zone, weather, history });
    const fallback = calculateRavScore({ mode, zone, weather: { ...weather, waveDirectionDeg: null, wavePeriodS: null }, history });
    rows.push({
      available: active.available && fallback.available,
      delta: active.available && fallback.available ? active.score - fallback.score : null,
      componentDelta: active.available && fallback.available ? active.components.transport - fallback.components.transport : null,
      changedLevel: active.available && fallback.available ? scoreRating(active.score).level !== scoreRating(fallback.score).level : false,
      adjustment: active.explanation?.transportDiagnostics?.waveApproach?.adjustment ?? null
    });
  }
}

const valid = rows.filter(row => row.available && finite(row.delta));
const values = key => valid.map(row => Number(row[key]));
const mean = list => list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
const summary = {
  dataset: {
    version: payload.version,
    generatedAt: payload.generatedAt,
    zones: Object.keys(zones).length,
    expectedParts: payload?.coastalParts?.expectedPartCount ?? null,
    scoredParts: payload?.coastalParts?.scoredPartCount ?? null,
    publishedParts: Object.keys(parts).length
  },
  scenarios: rows.length,
  available: valid.length,
  missing,
  scoreDelta: {
    mean: valid.length ? Number(mean(values('delta')).toFixed(3)) : null,
    min: valid.length ? Math.min(...values('delta')) : null,
    max: valid.length ? Math.max(...values('delta')) : null,
    changedLevel: valid.filter(row => row.changedLevel).length
  },
  transportDelta: {
    min: valid.length ? Math.min(...values('componentDelta')) : null,
    max: valid.length ? Math.max(...values('componentDelta')) : null
  }
};

console.log(JSON.stringify(summary, null, 2));
assert.equal(summary.dataset.zones, 210);
assert.equal(summary.dataset.expectedParts, 673);
assert.equal(summary.dataset.scoredParts, 673);
assert.ok(summary.dataset.publishedParts >= 210 && summary.dataset.publishedParts <= 673, 'Det dynamiske public-udsnit skal indeholde mindst én kystdel pr. zone');
assert.equal(missing.waveHeight, 0);
assert.equal(missing.waveDirection, 0);
assert.ok(missing.wavePeriod <= 1);
assert.equal(missing.onshoreDirection, 0);
assert.equal(valid.length, rows.length);
assert.ok(valid.every(row => Math.abs(row.componentDelta) <= 12));
assert.ok(valid.every(row => Math.abs(row.delta) <= 5));
