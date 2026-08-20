import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluatePhaseDProcessCandidate } from '../js/core/phase-d-process-candidate.js';
import { evaluatePhaseDWaveProcessCandidate } from '../js/core/phase-d-wave-process-candidate.js';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Brug: node scripts/audit-phase-d-wave-national-public.mjs <public-conditions.json>');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const zones = payload?.zones || {};
const publicParts = payload?.coastalParts?.parts || {};
const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const scoreLevel = score => score >= 75 ? 'high' : score >= 50 ? 'medium' : score >= 25 ? 'low' : 'very-low';

function directionClass(alignment) {
  if (!finite(alignment)) return 'missing';
  if (Number(alignment) >= 0.2) return 'onshore';
  if (Number(alignment) <= -0.35) return 'offshore';
  return 'neutral';
}

function agreementClass(currentAlignment, waveAlignment) {
  const current = directionClass(currentAlignment);
  const wave = directionClass(waveAlignment);
  if (current === 'missing' || wave === 'missing') return 'missing';
  if (current === 'onshore' && wave === 'onshore') return 'both-onshore';
  if (current === 'offshore' && wave === 'offshore') return 'both-offshore';
  if (current === 'onshore' && wave === 'offshore') return 'current-onshore-wave-offshore';
  if (current === 'offshore' && wave === 'onshore') return 'current-offshore-wave-onshore';
  return 'mixed-or-neutral';
}

const rows = [];
const missing = {
  zone: 0,
  localWaveHeight: 0,
  localWaveDirection: 0,
  zoneWavePeriod: 0,
  onshoreDirection: 0,
  localCurrentDirection: 0,
  localCurrentSpeed: 0
};

for (const [partId, part] of Object.entries(publicParts)) {
  const zoneConditions = zones[part.zoneId];
  if (!zoneConditions) missing.zone += 1;
  const localWeather = part.current?.weather || {};
  if (!finite(localWeather.waveHeightM)) missing.localWaveHeight += 1;
  if (!finite(localWeather.waveDirectionDeg)) missing.localWaveDirection += 1;
  if (!finite(zoneConditions?.current?.wavePeriodS)) missing.zoneWavePeriod += 1;
  if (!finite(part.onshoreDirectionDeg)) missing.onshoreDirection += 1;
  if (!finite(localWeather.currentDirectionDeg)) missing.localCurrentDirection += 1;
  if (!finite(localWeather.currentSpeedMps)) missing.localCurrentSpeed += 1;

  const weather = {
    ...zoneConditions?.current,
    ...localWeather,
    // The compact public part record has local wave height and direction but
    // no period. Use the parent zone period for this diagnostic and report it.
    wavePeriodS: zoneConditions?.current?.wavePeriodS ?? null
  };
  const contextBase = {
    weather,
    history: zoneConditions?.history || {},
    zone: {
      id: partId,
      onshoreDirectionDeg: part.onshoreDirectionDeg,
      reefs: false,
      shallowWater: false,
      seagrass: false
    }
  };

  for (const mode of ['waders', 'beach']) {
    const context = { ...contextBase, mode };
    const base = evaluatePhaseDProcessCandidate(context);
    const wave = evaluatePhaseDWaveProcessCandidate(context);
    rows.push({
      mode,
      available: base.available && wave.available,
      baseScore: base.score,
      waveScore: wave.score,
      delta: base.available && wave.available ? wave.score - base.score : null,
      changedLevel: base.available && wave.available ? scoreLevel(base.score) !== scoreLevel(wave.score) : false,
      agreement: agreementClass(base.diagnostics?.currentAlignment, wave.diagnostics?.waveOnshoreAlignment)
    });
  }
}

const availableRows = rows.filter(row => row.available && finite(row.delta));
const unavailableRows = rows.filter(row => !row.available);
const summarize = selected => {
  const valid = selected.filter(row => row.available && finite(row.delta));
  return {
    scenarios: selected.length,
    available: valid.length,
    baseMean: valid.length ? Number(mean(valid.map(row => row.baseScore)).toFixed(3)) : null,
    waveMean: valid.length ? Number(mean(valid.map(row => row.waveScore)).toFixed(3)) : null,
    deltaMean: valid.length ? Number(mean(valid.map(row => row.delta)).toFixed(3)) : null,
    minDelta: valid.length ? Math.min(...valid.map(row => row.delta)) : null,
    maxDelta: valid.length ? Math.max(...valid.map(row => row.delta)) : null,
    changedLevel: valid.filter(row => row.changedLevel).length
  };
};

const agreements = [...new Set(rows.map(row => row.agreement))];
const summary = {
  dataset: {
    schemaVersion: payload.schemaVersion,
    generatedAt: payload.generatedAt,
    zoneRecords: Object.keys(zones).length,
    expectedPartCount: payload?.coastalParts?.expectedPartCount ?? null,
    scoredPartCount: payload?.coastalParts?.scoredPartCount ?? null,
    publishedPartRecords: Object.keys(publicParts).length,
    wavePeriodSource: 'parent-zone-current'
  },
  missing,
  overall: summarize(rows),
  byMode: Object.fromEntries(['waders', 'beach'].map(mode => [mode, summarize(rows.filter(row => row.mode === mode))])),
  byDirectionAgreement: Object.fromEntries(agreements.sort().map(name => [name, summarize(rows.filter(row => row.agreement === name))])),
  unavailableScenarios: unavailableRows.length
};

console.log(JSON.stringify(summary, null, 2));

assert.equal(summary.dataset.zoneRecords, 210, 'Det offentlige datasæt skal dække 210 zoner');
assert.equal(summary.dataset.expectedPartCount, 673, 'Metadata skal angive 673 forventede kystdele');
assert.equal(summary.dataset.scoredPartCount, 673, 'Metadata skal angive 673 beregnede kystdele');
assert.equal(summary.dataset.publishedPartRecords, 225, 'Kontrollen skal synliggøre forskellen mellem beregnede og offentliggjorte delposter');
assert.equal(missing.localWaveHeight, 0);
assert.equal(missing.localWaveDirection, 0);
assert.ok(missing.zoneWavePeriod <= 1, 'Højst én zone må mangle bølgeperiode i dette kendte snapshot');
assert.equal(missing.onshoreDirection, 0);
assert.equal(availableRows.length, rows.length, 'Alle offentliggjorte delposter og begge søgemåder skal kunne evalueres');
assert.ok(availableRows.every(row => row.waveScore >= 0 && row.waveScore <= 100));
