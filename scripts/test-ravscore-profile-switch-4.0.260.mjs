import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  CANDIDATE_G_RAVSCORE_PROFILE_ID,
  PUBLIC_RAVSCORE_PROFILE_SELECTION,
  candidateGReferenceReadiness,
  publicRavScoreConfigurationFromDocument,
  resolvePublicRavScoreProfile,
  rollbackPublicRavScoreSelection,
  selectPublicRavScoreResult,
} from '../js/core/ravscore-profile-switch.js';

const candidateG = Object.freeze({
  available: true,
  modelId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  score: 68,
  components: { huntability: 72, transport: 84, transportAndDelivery: 80, mobilisation: 64 },
  additiveScore: 73.6,
  outflowExhaustionGateApplied: false,
});
const readyState = Object.freeze({ transportMemoryReady: true, transportMemoryStatus: 'READY' });

assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.requestedProfileId, CANDIDATE_G_RAVSCORE_PROFILE_ID);
assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.rollbackProfileId, null);
assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.legacyPublicFallbackAllowed, false);
assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.publicAvailabilityPolicy, 'candidate-g-local-fail-closed');

const readinessAt = '2026-08-25T05:00:00.000Z';
const readinessRows = ['part-a', 'part-b'].map(partId => ({
  zoneId: 'zone-a',
  partId,
  candidateGState: { initialStateAccepted: true },
  scores: [
    { time: '2026-08-25T03:00:00.000Z', candidateG: { transportMemoryReady: true, transportMemoryStatus: 'READY' } },
    { time: '2026-08-25T06:00:00.000Z', candidateG: { transportMemoryReady: false, transportMemoryStatus: 'WINDOW_INCOMPLETE' } },
  ],
}));
assert.equal(candidateGReferenceReadiness(readinessRows, readinessAt).candidateMemoryReady, true,
  'the current readiness gate must use the latest causal row, never a future forecast row');

const productionDocument = JSON.parse(fs.readFileSync('data/admin/ravscore-profile-selection.json', 'utf8'));
const packageVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
assert.equal(productionDocument.sourceVersion, packageVersion);
assert.equal(productionDocument.switchVersion, `RAVSCORE-PROFILE-SWITCH-${packageVersion}`);
const configuration = publicRavScoreConfigurationFromDocument(productionDocument);

const profile = resolvePublicRavScoreProfile({
  ...configuration,
  candidateCoverageReady: false,
  candidateMemoryReady: false,
  candidateWarmupEligible: false,
});
assert.equal(profile.activeProfileId, CANDIDATE_G_RAVSCORE_PROFILE_ID);
assert.equal(profile.rollbackProfileId, null);
assert.equal(profile.activationState, 'candidate-g-only-local-fail-closed');
assert.equal(profile.fallbackReason, null);
assert.ok(profile.advisories.includes('LOCAL_CANDIDATE_COVERAGE_INCOMPLETE'));

const projected = selectPublicRavScoreResult({ profile, candidateG, candidateState: readyState, mode: 'waders' });
assert.equal(projected.score, 68);
assert.deepEqual(projected.components, { huntability: 72, transport: 80, release: 64 });
assert.deepEqual(projected.explanation.weights, { huntability: 0.20, transport: 0.50, release: 0.30 });

for (const status of ['WINDOW_INCOMPLETE','WINDOW_HAS_MISSING_EVIDENCE','WINDOW_HAS_TIME_GAP','LATEST_SAMPLE_MISSING']) {
  const unavailable = selectPublicRavScoreResult({
    profile,
    candidateG,
    candidateState: { transportMemoryReady: false, transportMemoryStatus: status },
    mode: 'beach',
  });
  assert.equal(unavailable.available, false, `${status} skal lukke lokalt.`);
  assert.equal(unavailable.score, null);
  assert.equal(unavailable.scoreProfileId, CANDIDATE_G_RAVSCORE_PROFILE_ID);
  assert.equal(unavailable.unavailability.code, status);
}

assert.throws(rollbackPublicRavScoreSelection, /rollback til den gamle RavScore-model er fjernet/);
for (const invalidSelection of [
  { ...configuration.selection, requestedProfileId: 'UNKNOWN' },
  { ...configuration.selection, rollbackProfileId: 'RRS-CURRENT-B0-4.0.247' },
  { ...configuration.selection, legacyPublicFallbackAllowed: true },
  { ...configuration.selection, switchVersion: 'OLDER-SWITCH' },
]) assert.throws(() => resolvePublicRavScoreProfile({ selection: invalidSelection }), /Ugyldig offentlig RavScore-konfiguration/);

const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const admin = fs.readFileSync('js/ui/admin-dashboard.js', 'utf8');
const assistant = fs.readFileSync('js/services/rav-assistant.js', 'utf8');
const infoPanel = fs.readFileSync('js/ui/info-panel.js', 'utf8');
const centralHydration = fs.readFileSync('scripts/sync-admin-config.py', 'utf8');
const centralPersistence = fs.readFileSync('scripts/sync-protected-admin-assets.mjs', 'utf8');
assert.match(updater, /candidate-g-local-fail-closed/);
assert.match(updater, /scoreAvailability/);
assert.match(updater, /NATIVE_CADENCE_HOLD|nativeCadenceHoldHours/);
assert.doesNotMatch(app, /local\?\.available\?local:scoreFor\(zone\)/);
assert.doesNotMatch(app, /displayScope:'parent-fallback'/);
assert.doesNotMatch(app, /calculateRavScore|selectBestTimeForDay|scoreFor\(/);
assert.doesNotMatch(assistant, /calculateRavScore|score-engine\.js/);
assert.doesNotMatch(infoPanel, /calculateRavScore|selectBestTimeForDay|bestHourForDay/);
assert.match(admin, /Zonernes RavScore-status/);
assert.match(admin, /ALLE AKTIVE/);
assert.match(admin, /Hvorfor\?/);
assert.match(admin, /resten af Danmark fortsætter med Candidate G/);
assert.match(centralHydration, /is_candidate_g_only_selection/);
assert.match(centralHydration, /not is_candidate_g_only_selection\(central\)/);
assert.match(centralPersistence, /assertCandidateGOnlySelection/);

console.log('Candidate G-only med lokal, lukket utilgængelighed og uden gammel offentlig fallback: OK');
