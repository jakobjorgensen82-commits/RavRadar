import assert from 'node:assert/strict';
import { calculateRavScore, SCORE_WEIGHTS } from '../js/core/score-engine.js';
import { boundedWaveTransportAdjustment, MAX_WAVE_TRANSPORT_DELTA } from '../js/core/wave-approach.js';

const zone = { id: 'wave-test', onshoreDirectionDeg: 90, shallowWater: false, reefs: false, seagrass: false };
const history = { maxWind24hMps: 9, maxWave24hM: 1.4, hoursSinceHighEnergy: 10 };
const baseWeather = {
  windSpeedMps: 5,
  windDirectionDeg: 90,
  waveHeightM: 1.5,
  wavePeriodS: 10,
  waveDirectionDeg: 270,
  currentSpeedMps: 0.2,
  currentDirectionDeg: 45,
  waterLevelTrendCm3h: 0
};
const score = weather => calculateRavScore({ mode: 'beach', zone, weather, history });

const onshore = score(baseWeather);
const offshore = score({ ...baseWeather, waveDirectionDeg: 90 });
assert.ok(onshore.score > offshore.score, 'Pålandsbølger skal støtte den aktive score mere end fralandsbølger');
assert.ok(onshore.components.transport > offshore.components.transport);
assert.equal(onshore.explanation.weights.transport, SCORE_WEIGHTS.transport, 'Vægtene må ikke ændres i bølgedelmålet');
assert.equal(onshore.explanation.transportDiagnostics.waveApproach.available, true);

const shortPeriod = score({ ...baseWeather, wavePeriodS: 3 });
const longPeriod = score({ ...baseWeather, wavePeriodS: 10 });
assert.ok(longPeriod.score >= shortPeriod.score, 'Længere periode må ikke give lavere støtte ved samme højde og retning');
assert.ok(longPeriod.explanation.transportDiagnostics.waveApproach.waveEnergyProxy > shortPeriod.explanation.transportDiagnostics.waveApproach.waveEnergyProxy);

const missingPeriod = score({ ...baseWeather, wavePeriodS: null });
const missingDirection = score({ ...baseWeather, waveDirectionDeg: null });
assert.equal(missingPeriod.explanation.transportDiagnostics.waveApproach.adjustment, 0);
assert.equal(missingDirection.explanation.transportDiagnostics.waveApproach.adjustment, 0);
assert.equal(missingPeriod.components.transport, missingDirection.components.transport, 'Manglende bølgeinput skal falde tilbage uden opfundet effekt');

const positiveBound = boundedWaveTransportAdjustment({ baseTransportScore: 0, weather: baseWeather, onshoreDirectionDeg: 90 });
const negativeBound = boundedWaveTransportAdjustment({ baseTransportScore: 100, weather: { ...baseWeather, waveDirectionDeg: 90 }, onshoreDirectionDeg: 90 });
assert.equal(positiveBound.adjustment, MAX_WAVE_TRANSPORT_DELTA);
assert.equal(negativeBound.adjustment, -MAX_WAVE_TRANSPORT_DELTA);

const offshoreCurrent = score({ ...baseWeather, currentDirectionDeg: 270 });
assert.ok(offshoreCurrent.components.transport <= 28, 'Bølgeeffekten må ikke omgå loftet for stærk fralandsstrøm');
assert.ok(Math.abs(onshore.explanation.transportDiagnostics.waveApproach.adjustment) <= MAX_WAVE_TRANSPORT_DELTA);
assert.ok(onshore.componentReasons.transport.some(reason => reason.includes('Bølgernes retning og periode')));

console.log('OK: aktiv bølgeretning/periode er begrænset, forklarlig og har sikker fallback.');
