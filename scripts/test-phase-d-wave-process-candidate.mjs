import assert from 'node:assert/strict';
import { evaluatePhaseDProcessCandidate } from '../js/core/phase-d-process-candidate.js';
import { evaluatePhaseDWaveProcessCandidate } from '../js/core/phase-d-wave-process-candidate.js';

const baseContext = {
  mode: 'beach',
  weather: {
    windSpeedMps: 6,
    waveHeightM: 1,
    wavePeriodS: 7,
    waveDirectionDeg: 270,
    currentSpeedMps: 0.3,
    currentAlignment: 0.7
  },
  history: {
    maxWave24hM: 2,
    maxWind24hMps: 12,
    strongEventDurationHours: 10,
    hoursSinceStrongEventEnd: 8,
    stateModelMode: 'shadow-v2',
    verifiedCurrentCoverageHours: 12,
    inboundCurrentMomentum: 0.5,
    outboundCurrentPressure: 0.1,
    activeCurrentRegimeDurationHours: 8,
    activeCurrentRegimeStability: 0.8,
    activeCurrentRegime: 'inbound'
  },
  zone: {
    onshoreDirectionDeg: 90,
    reefs: true,
    shallowWater: true,
    seagrass: false
  }
};

const evaluate = overrides => evaluatePhaseDWaveProcessCandidate({
  ...baseContext,
  ...overrides,
  weather: { ...baseContext.weather, ...(overrides?.weather || {}) },
  history: { ...baseContext.history, ...(overrides?.history || {}) },
  zone: { ...baseContext.zone, ...(overrides?.zone || {}) }
});

const onshore = evaluate({});
const offshore = evaluate({ weather: { waveDirectionDeg: 90 } });
assert.equal(onshore.available, true);
assert.equal(offshore.available, true);
assert.ok(onshore.score >= offshore.score + 5, 'Pålandsbølger skal give tydeligt større støtte end fralandsbølger');
assert.ok(onshore.diagnostics.waveOnshoreAlignment > 0.99);
assert.ok(offshore.diagnostics.waveOnshoreAlignment < -0.99);
assert.ok(Number.isFinite(onshore.candidateScores.candidateD));
assert.ok(Number.isFinite(onshore.candidateScores.candidateE));
assert.ok(onshore.candidateScores.candidateD > offshore.candidateScores.candidateD, 'Kandidat D skal bruge bølgeretningen i leveringsvejen');
assert.ok(onshore.candidateScores.candidateE >= offshore.candidateScores.candidateE + 5, 'Kandidat E skal dæmpe en fysisk svag leveringsvej');
assert.ok(onshore.candidateScores.candidateE <= onshore.candidateScores.candidateD, 'Den fysiske gate må ikke løfte scoren');

const shortPeriod = evaluate({ weather: { wavePeriodS: 3 } });
const longPeriod = evaluate({ weather: { wavePeriodS: 10 } });
assert.ok(longPeriod.score > shortPeriod.score, 'Længere periode ved samme højde skal øge den relative bølgeenergiproxy');
assert.ok(longPeriod.diagnostics.waveEnergyProxy > shortPeriod.diagnostics.waveEnergyProxy);

const wrapA = evaluate({ weather: { waveDirectionDeg: 179 }, zone: { onshoreDirectionDeg: 359 } });
const wrapB = evaluate({ weather: { waveDirectionDeg: 181 }, zone: { onshoreDirectionDeg: 1 } });
assert.ok(Math.abs(wrapA.diagnostics.waveOnshoreAlignment - wrapB.diagnostics.waveOnshoreAlignment) < 1e-9, 'Retning skal være kontinuerlig omkring 0/360 grader');

const missingDirectionContext = {
  ...baseContext,
  weather: { ...baseContext.weather, waveDirectionDeg: null }
};
const missingDirection = evaluatePhaseDWaveProcessCandidate(missingDirectionContext);
const originalWithoutDirection = evaluatePhaseDProcessCandidate(missingDirectionContext);
assert.equal(missingDirection.score, originalWithoutDirection.score, 'Manglende bølgeretning skal falde tilbage uden at opfinde en scoreeffekt');
assert.ok(missingDirection.confidence.limitations.includes('wave-direction-missing'));
assert.equal(missingDirection.diagnostics.waveApproachAvailable, false);

for (const result of [onshore, offshore, shortPeriod, longPeriod, wrapA, wrapB, missingDirection]) {
  assert.ok(result.score >= 0 && result.score <= 100, 'Kandidatscoren skal være 0-100');
  assert.equal(result.scoreImpact, 'diagnostic-only');
  assert.equal(result.diagnostics.staticRetentionScoreImpact, false);
}

console.log('OK: fase D-bølgekandidat bruger retning og periode diagnostisk og falder sikkert tilbage.');
