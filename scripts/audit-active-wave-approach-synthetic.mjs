import assert from 'node:assert/strict';
import { calculateRavScore, scoreRating } from '../js/core/score-engine.js';

const modes = ['waders', 'beach'];
const winds = [2, 5, 9, 14];
const waveHeights = [0.1, 0.3, 0.7, 1.2, 2, 3];
const wavePeriods = [3, 5, 7, 10];
const waveOffsets = [0, 30, 60, 90, 120, 180];
const currentSpeeds = [0.05, 0.2, 0.5, 0.8];
const currentOffsets = [0, 45, 90, 180];
const histories = [
  { name: 'quiet', maxWind24hMps: 4, maxWave24hM: 0.3, hoursSinceHighEnergy: 72 },
  { name: 'fresh', maxWind24hMps: 14, maxWave24hM: 2, hoursSinceHighEnergy: 8 },
  { name: 'stale', maxWind24hMps: 9, maxWave24hM: 1, hoursSinceHighEnergy: 96 }
];
const onshoreDirectionDeg = 90;
const zone = { id: 'synthetic-wave', onshoreDirectionDeg, shallowWater: false, reefs: false, seagrass: false };
const rows = [];

for (const mode of modes) for (const windSpeedMps of winds) for (const waveHeightM of waveHeights) {
  for (const wavePeriodS of wavePeriods) for (const waveOffset of waveOffsets) for (const currentSpeedMps of currentSpeeds) {
    for (const currentOffset of currentOffsets) for (const history of histories) {
      const weather = {
        windSpeedMps,
        windDirectionDeg: 270,
        waveHeightM,
        wavePeriodS,
        waveDirectionDeg: (onshoreDirectionDeg + 180 + waveOffset) % 360,
        currentSpeedMps,
        currentDirectionDeg: (onshoreDirectionDeg + currentOffset) % 360,
        waterLevelTrendCm3h: 0
      };
      const active = calculateRavScore({ mode, zone, weather, history });
      const fallback = calculateRavScore({ mode, zone, weather: { ...weather, waveDirectionDeg: null, wavePeriodS: null }, history });
      assert.equal(active.available, true);
      assert.equal(fallback.available, true);
      const componentDelta = active.components.transport - fallback.components.transport;
      const scoreDelta = active.score - fallback.score;
      assert.ok(Math.abs(componentDelta) <= 12, 'Transportændringen overskrider loftet');
      assert.ok(Math.abs(scoreDelta) <= 5, 'Samlet RavScore ændres mere end den tilladte afrundingsramme');
      if (currentOffset === 180 && currentSpeedMps >= 0.2) {
        assert.ok(active.components.transport <= 28, 'Bølgeeffekten omgår fralandsstrømloftet');
      }
      rows.push({ mode, wavePeriodS, waveOffset, history: history.name, componentDelta, scoreDelta, changedLevel: scoreRating(active.score).level !== scoreRating(fallback.score).level });
    }
  }
}

const summarize = selected => ({
  scenarios: selected.length,
  scoreDeltaMean: Number((selected.reduce((sum, row) => sum + row.scoreDelta, 0) / selected.length).toFixed(3)),
  scoreDeltaMin: Math.min(...selected.map(row => row.scoreDelta)),
  scoreDeltaMax: Math.max(...selected.map(row => row.scoreDelta)),
  transportDeltaMin: Math.min(...selected.map(row => row.componentDelta)),
  transportDeltaMax: Math.max(...selected.map(row => row.componentDelta)),
  changedLevel: selected.filter(row => row.changedLevel).length
});
const summary = {
  overall: summarize(rows),
  byMode: Object.fromEntries(modes.map(mode => [mode, summarize(rows.filter(row => row.mode === mode))])),
  byWaveOffset: Object.fromEntries(waveOffsets.map(offset => [offset, summarize(rows.filter(row => row.waveOffset === offset))])),
  byWavePeriod: Object.fromEntries(wavePeriods.map(period => [period, summarize(rows.filter(row => row.wavePeriodS === period))])),
  byHistory: Object.fromEntries(histories.map(history => [history.name, summarize(rows.filter(row => row.history === history.name))]))
};

console.log(JSON.stringify(summary, null, 2));
assert.equal(rows.length, 55296);
assert.ok(summary.byWaveOffset[0].scoreDeltaMean > summary.byWaveOffset[180].scoreDeltaMean, 'Pålandsbølger skal samlet støtte mere end fralandsbølger');
assert.ok(summary.byWavePeriod[10].scoreDeltaMean >= summary.byWavePeriod[3].scoreDeltaMean, 'Længere perioder skal samlet have mindst samme støtte som korte');
