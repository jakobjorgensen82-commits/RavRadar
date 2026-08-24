import assert from 'node:assert/strict';
import { CANDIDATE_G_WEIGHTS } from '../js/core/ravscore-candidate-g.js?weights=4.0.273';
import {
  CANDIDATE_G_RAVSCORE_PROFILE_ID,
  PUBLIC_RAVSCORE_PROFILE_SELECTION,
  resolvePublicRavScoreProfile,
} from '../js/core/ravscore-profile-switch.js?weights=4.0.273';

const expected = { huntability: 0.20, transportAndDelivery: 0.50, mobilisation: 0.30 };
assert.deepEqual(CANDIDATE_G_WEIGHTS, expected, 'Den eneste offentlige RavScore skal bruge Candidate G 20/50/30.');
assert.equal(Object.values(CANDIDATE_G_WEIGHTS).reduce((sum, value) => sum + value, 0), 1, 'Vægtene skal summere til 1.');
assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.rollbackProfileId, null, 'Der må ikke være en offentlig rollbackprofil.');
assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.legacyPublicFallbackAllowed, false, 'Gammel offentlig fallback skal være slået fra.');
assert.equal(resolvePublicRavScoreProfile().activeProfileId, CANDIDATE_G_RAVSCORE_PROFILE_ID, 'Candidate G skal altid være den offentlige profil.');

const weighted = ({ huntability, transport, release }) =>
  Math.round(huntability * CANDIDATE_G_WEIGHTS.huntability
    + transport * CANDIDATE_G_WEIGHTS.transportAndDelivery
    + release * CANDIDATE_G_WEIGHTS.mobilisation);

assert.equal(weighted({ huntability: 100, transport: 0, release: 0 }), 20);
assert.equal(weighted({ huntability: 0, transport: 100, release: 0 }), 50);
assert.equal(weighted({ huntability: 0, transport: 0, release: 100 }), 30);
assert.equal(weighted({ huntability: 100, transport: 100, release: 100 }), 100);
assert.equal(weighted({ huntability: 0, transport: 0, release: 0 }), 0);

console.log('OK: Candidate G er eneste offentlige RavScore, låst til 20/50/30 uden gammel fallback.');
