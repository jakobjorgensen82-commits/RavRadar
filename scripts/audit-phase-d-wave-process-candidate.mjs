import assert from 'node:assert/strict';
import { evaluatePhaseDProcessCandidate } from '../js/core/phase-d-process-candidate.js';
import { evaluatePhaseDWaveProcessCandidate } from '../js/core/phase-d-wave-process-candidate.js';

const modes = ['waders', 'beach'];
const windSpeeds = [2, 6, 10, 14];
const waveHeights = [0.1, 0.5, 1, 2, 3];
const wavePeriods = [3, 5, 7, 10];
const waveOffsets = [0, 30, 60, 90, 120, 180];
const currentSpeeds = [0.05, 0.15, 0.3, 0.5];
const currentAlignments = [-0.8, -0.3, 0, 0.4, 0.8];
const onshoreDirectionDeg = 90;

const histories = {
  quiet: {
    maxWave24hM: 0.4,
    maxWind24hMps: 5,
    strongEventDurationHours: 0,
    hoursSinceStrongEventEnd: 72,
    stateModelMode: 'shadow-v2',
    verifiedCurrentCoverageHours: 12,
    inboundCurrentMomentum: 0,
    outboundCurrentPressure: 0,
    activeCurrentRegimeDurationHours: 2,
    activeCurrentRegimeStability: 0.4,
    activeCurrentRegime: 'neutral'
  },
  fresh: {
    maxWave24hM: 2.2,
    maxWind24hMps: 12,
    strongEventDurationHours: 10,
    hoursSinceStrongEventEnd: 6,
    stateModelMode: 'shadow-v2',
    verifiedCurrentCoverageHours: 12,
    inboundCurrentMomentum: 0.5,
    outboundCurrentPressure: 0.1,
    activeCurrentRegimeDurationHours: 8,
    activeCurrentRegimeStability: 0.8,
    activeCurrentRegime: 'inbound'
  },
  stale: {
    maxWave24hM: 2.2,
    maxWind24hMps: 12,
    strongEventDurationHours: 10,
    hoursSinceStrongEventEnd: 72,
    stateModelMode: 'shadow-v2',
    verifiedCurrentCoverageHours: 12,
    inboundCurrentMomentum: 0.1,
    outboundCurrentPressure: 0.25,
    activeCurrentRegimeDurationHours: 5,
    activeCurrentRegimeStability: 0.6,
    activeCurrentRegime: 'outbound'
  }
};

const level = score => score >= 75 ? 'high' : score >= 50 ? 'medium' : score >= 25 ? 'low' : 'very-low';

function context({ mode, windSpeedMps, waveHeightM, wavePeriodS, waveOffset, currentSpeedMps, currentAlignment, historyName }) {
  return {
    mode,
    weather: {
      windSpeedMps,
      waveHeightM,
      wavePeriodS,
      // DMI direction is "from". Offset zero therefore propagates onshore.
      waveDirectionDeg: (onshoreDirectionDeg + 180 + waveOffset) % 360,
      currentSpeedMps,
      currentAlignment
    },
    history: histories[historyName],
    zone: {
      onshoreDirectionDeg,
      reefs: true,
      shallowWater: true,
      seagrass: false
    }
  };
}

const rows = [];
for (const mode of modes) {
  for (const windSpeedMps of windSpeeds) {
    for (const waveHeightM of waveHeights) {
      for (const wavePeriodS of wavePeriods) {
        for (const waveOffset of waveOffsets) {
          for (const currentSpeedMps of currentSpeeds) {
            for (const currentAlignment of currentAlignments) {
              for (const historyName of Object.keys(histories)) {
                const inputs = { mode, windSpeedMps, waveHeightM, wavePeriodS, waveOffset, currentSpeedMps, currentAlignment, historyName };
                const scenario = context(inputs);
                const base = evaluatePhaseDProcessCandidate(scenario);
                const wave = evaluatePhaseDWaveProcessCandidate(scenario);
                assert.equal(base.available, true);
                assert.equal(wave.available, true);
                assert.ok(wave.score >= 0 && wave.score <= 100);
                rows.push({
                  ...inputs,
                  physicallyConsistent: histories[historyName].maxWave24hM >= waveHeightM
                    && histories[historyName].maxWind24hMps >= windSpeedMps,
                  baseScore: base.score,
                  waveScore: wave.score,
                  delta: wave.score - base.score,
                  changedLevel: level(base.score) !== level(wave.score),
                  waveEnergyProxy: wave.diagnostics.waveEnergyProxy,
                  waveApproachSupportScore: wave.diagnostics.waveApproachSupportScore
                });
              }
            }
          }
        }
      }
    }
  }
}

const mean = (items, key) => items.reduce((sum, item) => sum + item[key], 0) / items.length;
const group = (key, value) => rows.filter(row => row[key] === value);
const consistentRows = rows.filter(row => row.physicallyConsistent);
const summarize = items => ({
  scenarios: items.length,
  baseMean: Number(mean(items, 'baseScore').toFixed(3)),
  waveMean: Number(mean(items, 'waveScore').toFixed(3)),
  deltaMean: Number(mean(items, 'delta').toFixed(3)),
  minDelta: Math.min(...items.map(item => item.delta)),
  maxDelta: Math.max(...items.map(item => item.delta)),
  changedLevel: items.filter(item => item.changedLevel).length
});

const summary = {
  scenarios: rows.length,
  overall: summarize(rows),
  physicallyConsistent: summarize(consistentRows),
  byMode: Object.fromEntries(modes.map(mode => [mode, summarize(group('mode', mode))])),
  byWaveOffset: Object.fromEntries(waveOffsets.map(offset => [offset, summarize(group('waveOffset', offset))])),
  byWavePeriod: Object.fromEntries(wavePeriods.map(period => [period, summarize(group('wavePeriodS', period))])),
  byHistory: Object.fromEntries(Object.keys(histories).map(name => [name, summarize(group('historyName', name))])),
  largestIncrease: rows.reduce((best, row) => row.delta > best.delta ? row : best, rows[0]),
  largestDecrease: rows.reduce((best, row) => row.delta < best.delta ? row : best, rows[0]),
  largestConsistentIncrease: consistentRows.reduce((best, row) => row.delta > best.delta ? row : best, consistentRows[0]),
  largestConsistentDecrease: consistentRows.reduce((best, row) => row.delta < best.delta ? row : best, consistentRows[0])
};

console.log(JSON.stringify(summary, null, 2));

assert.equal(rows.length, 57600);
assert.ok(summary.byWaveOffset[0].deltaMean > summary.byWaveOffset[180].deltaMean + 3, 'Pålands- og fralandsbølger skal adskilles tydeligt i gennemsnit');
assert.ok(summary.byWavePeriod[10].deltaMean > summary.byWavePeriod[3].deltaMean, 'Længere periode skal give større gennemsnitlig bølgestøtte');
assert.ok(summary.overall.minDelta >= -30, 'Den forsigtige bølgekandidat må ikke skabe ekstreme negative spring');
assert.ok(summary.overall.maxDelta <= 30, 'Den forsigtige bølgekandidat må ikke skabe ekstreme positive spring');
