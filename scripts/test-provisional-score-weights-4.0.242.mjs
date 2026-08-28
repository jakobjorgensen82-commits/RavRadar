import assert from 'node:assert/strict';
import {
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_PRIORS,
  evaluateNextGenerationRavScore,
} from '../js/core/ravscore-next-generation.js';
import {
  NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION,
  resolveNextPublicRavScoreProfile,
} from '../js/core/ravscore-next-generation-profile.js';

assert.equal(NEXT_RAVSCORE_PRIORS.huntabilityMaximumShare, 0.20,
  'Jagtbarhed må højst modulere 20 % efter den fysiske mulighed.');
assert.equal(NEXT_RAVSCORE_PRIORS.waveDirectionMaximumReduction, 0.20,
  'Bølgeretningen må højst reducere nærkyststøtten 20 %.');
assert.equal(NEXT_RAVSCORE_PRIORS.categoricalOutflowExhaustionGate, false,
  'Den historiske 13-timers nul-gate må ikke være aktiv.');
assert.equal(NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION.rollbackProfileId, null,
  'Der må ikke være en offentlig rollbackscoreprofil.');
assert.equal(NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION.legacyPublicFallbackAllowed, false,
  'Gammel offentlig scorefallback skal være slået fra.');
assert.equal(
  resolveNextPublicRavScoreProfile({ modelCoverageReady: true, modelMemoryReady: true }).activeProfileId,
  NEXT_RAVSCORE_MODEL_ID,
  'Den kystkausale RavScore skal være den eneste offentlige profil.',
);

const context = {
  mode: 'beach',
  zone: { onshoreDirectionDeg: 0 },
  weather: {
    windSpeedMps: 2,
    waveHeightM: 1,
    wavePeriodS: 7,
    waveDirectionDeg: 180,
    waterLevelTrendCm3h: 0,
  },
};
const evaluate = memory => evaluateNextGenerationRavScore(context, { memory });
assert.equal(evaluate({ transportPotential: 0, mobilisationPotential: 100 }).score, 0,
  'Mobilisering må ikke skabe supply.');
assert.equal(evaluate({ transportPotential: 100, mobilisationPotential: 0 }).score, 0,
  'Supply uden mobilisering må ikke skabe fysisk mulighed.');
assert.ok(evaluate({ transportPotential: 100, mobilisationPotential: 100 }).score > 0,
  'Komplet fysisk kæde skal kunne give en positiv score.');

console.log('OK: kystkausal RavScore er eneste offentlige profil uden 20/50/30, 13-timers gate eller legacyfallback.');
