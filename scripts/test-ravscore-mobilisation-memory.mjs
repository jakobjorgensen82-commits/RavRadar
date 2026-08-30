import assert from 'node:assert/strict';

import {
  WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE,
  buildWaveMobilisationPotential,
  waveMobilisationEnergy,
} from '../js/core/ravscore-mobilisation-memory.js';

const hourly = (count, waveHeightM, wavePeriodS, start = '2026-01-01T00:00:00Z') => {
  const startMs = new Date(start).getTime();
  return Array.from({ length: count }, (_, index) => ({
    time: new Date(startMs + index * 3_600_000).toISOString(),
    waveHeightM,
    wavePeriodS,
  }));
};

assert.deepEqual(WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE, {
  id: 'wave-energy-state-build-4-decay-48',
  buildHalfLifeHours: 4,
  decayHalfLifeHours: 48,
  initialPotential: 0,
  directWindScoreIncluded: false,
  currentSpeedScoreIncluded: false,
  missingSamplePolicy: 'HOLD_LAST_DERIVED_STATE',
  boundaryPolicy: 'CARRY_FORWARD_COMPACT_DERIVED_MOBILISATION_STATE',
});

const lowEnergy = waveMobilisationEnergy({ waveHeightM: 0.5, wavePeriodS: 4 });
const highEnergy = waveMobilisationEnergy({ waveHeightM: 2, wavePeriodS: 8 });
assert.equal(lowEnergy.available, true);
assert.equal(highEnergy.available, true);
assert.ok(highEnergy.energyProxy > lowEnergy.energyProxy);
assert.ok(highEnergy.energyScore > lowEnergy.energyScore);
assert.equal(waveMobilisationEnergy({ waveHeightM: null, wavePeriodS: 8 }).available, false);
const invalidPositiveHeightZeroPeriod = waveMobilisationEnergy({
  waveHeightM: 0.4,
  wavePeriodS: 0,
});
assert.equal(invalidPositiveHeightZeroPeriod.available, false);
assert.equal(invalidPositiveHeightZeroPeriod.inputStatus, 'INVALID');
assert.equal(invalidPositiveHeightZeroPeriod.energyScore, null);
const exactCalmEnergy = waveMobilisationEnergy({ waveHeightM: 0, wavePeriodS: 0 });
assert.equal(exactCalmEnergy.available, true);
assert.equal(exactCalmEnergy.inputStatus, 'EXACT_CALM');
assert.equal(exactCalmEnergy.exactCalm, true);
assert.equal(exactCalmEnergy.energyScore, 0);

const oneHighHour = buildWaveMobilisationPotential(hourly(1, 2, 8)).at(-1).mobilisationPotential;
const fourHighHours = buildWaveMobilisationPotential(hourly(4, 2, 8)).at(-1).mobilisationPotential;
const twelveHighHours = buildWaveMobilisationPotential(hourly(12, 2, 8)).at(-1).mobilisationPotential;
assert.ok(oneHighHour > 0 && oneHighHour < fourHighHours);
assert.ok(fourHighHours < twelveHighHours && twelveHighHours < 100);
const fourModerateHours = buildWaveMobilisationPotential(hourly(4, 0.8, 6))
  .at(-1).mobilisationPotential;
assert.ok(fourModerateHours > oneHighHour,
  'En enkelt høj bølgetop må ikke veje mere end en udviklet, moderat hændelse');

const built = buildWaveMobilisationPotential(hourly(12, 2, 8));
const quietStart = new Date(new Date(built.at(-1).time).getTime() + 3_600_000).toISOString();
const quiet = buildWaveMobilisationPotential(hourly(48, 0, 3, quietStart), {
  initialState: built.at(-1).continuationState,
});
assert.ok(quiet.at(-1).mobilisationPotential < built.at(-1).mobilisationPotential);
assert.ok(quiet.at(-1).mobilisationPotential > 0);
assert.ok(Math.abs(quiet.at(-1).mobilisationPotential
  / built.at(-1).mobilisationPotential - 0.5) < 1e-9,
'48 rolige timer skal halvere den afledte mobiliseringstilstand i referenceprofilen');

const allSamples = hourly(13, 2, 8);
const uninterrupted = buildWaveMobilisationPotential(allSamples);
const first = buildWaveMobilisationPotential(allSamples.slice(0, 7));
const continued = buildWaveMobilisationPotential(allSamples.slice(7), {
  initialState: first.at(-1).continuationState,
});
assert.equal(
  continued.at(-1).mobilisationPotential,
  uninterrupted.at(-1).mobilisationPotential,
  'Kompakt tilstand skal give samme resultat som et ubrudt forløb',
);

const missing = buildWaveMobilisationPotential([
  { time: '2026-01-01T00:00:00Z', waveHeightM: 2, wavePeriodS: 8 },
  { time: '2026-01-01T01:00:00Z', waveHeightM: null, wavePeriodS: null },
]);
assert.equal(missing[1].mobilisationPotential, missing[0].mobilisationPotential);
assert.equal(missing[1].transition, 'missing-hold');

assert.throws(() => buildWaveMobilisationPotential(hourly(1, 1, 5), {
  initialState: { time: '2026-01-02T00:00:00Z', mobilisationPotential: 50 },
}), /backwards/);

console.log('OK: bølgeenergi bygger og aftrapper en kontinuerlig, score-neutral mobiliseringstilstand.');
