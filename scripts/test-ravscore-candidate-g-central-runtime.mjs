import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildPublicConditions,
  buildPublicConditionDetails,
  buildPublicManifest,
  compactJson,
} from './public-conditions-lib.mjs';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY,
  ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
  ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_PROVENANCE,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
} from '../js/core/ravscore-regime-memory.js';
import {
  CANDIDATE_G_RAVSCORE_PROFILE_ID,
  publicRavScoreConfigurationFromDocument,
  resolvePublicRavScoreProfile,
} from '../js/core/ravscore-profile-switch.js';

const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
for (const marker of [
  'buildCandidateGDerivedStateSeries',
  'function compactCandidateGMode(result, evidenceTrust = null)',
  'evidenceTrust: evidenceTrust ?? null',
  'previousCoastalParts?.parts?.[part.partId]?.candidateG?.currentState',
  'initialStateAccepted',
  'transportMemoryReady: derivedState.transportMemoryReady',
  'candidateMemoryReady',
  'candidateWarmupEligible',
  'candidateGReferenceReadiness(partRows, generatedAt)',
  'resolvePublicRavScoreProfile',
  'selectPublicRavScoreResult',
  '), evidenceTrust);',
  "? 'active-public' : 'diagnostic-only'",
  'automaticActivationAllowed: false',
  'publicScoreChanged: scoreProfile.activeProfileId === CANDIDATE_G_RAVSCORE_PROFILE_ID',
  'previous?.coastalParts ?? null',
]) assert.ok(updater.includes(marker), `Central Candidate G-runtime mangler ${marker}`);

const referenceAt = '2026-08-23T12:00:00.000Z';
const productionConfiguration = publicRavScoreConfigurationFromDocument(
  JSON.parse(fs.readFileSync('data/admin/ravscore-profile-selection.json', 'utf8')),
);
const scoreProfile = resolvePublicRavScoreProfile({
  ...productionConfiguration,
  candidateCoverageReady: true,
  candidateMemoryReady: false,
  candidateWarmupEligible: true,
});
const candidateG = {
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  weights: { huntability: 0.2, transportAndDelivery: 0.5, mobilisation: 0.3 },
  scoreImpact: 'active-public',
  automaticActivationAllowed: false,
  publicScoreChanged: true,
  referenceAt,
  transportReferenceAt: referenceAt,
  currentTransition: 'SAME_TIME_HOLD',
  transportMemoryReady: false,
  transportMemoryStatus: 'WINDOW_INCOMPLETE',
  transportMemoryCoverageHours: 0,
  initialStateAccepted: true,
  initialStateResetReason: null,
  currentState: {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    stateKey: 'sha256:synthetic',
    time: referenceAt,
    transportReferenceAt: referenceAt,
    transportPotential: 50,
    outboundEpisodeEffectiveHours: 0,
    transportMemoryReady: false,
    transportMemoryStatus: 'WINDOW_INCOMPLETE',
    transportMemoryWindowHours: 48,
    transportMemoryCoverageHours: 0,
    transportEvidence: [{ time: referenceAt, strength: 0 }],
    mobilisationPotential: 50,
  },
  modes: { waders: { available: true, score: 45 }, beach: { available: true, score: 55 } },
};
const verifiedOnlyTrust = {
  schemaVersion: 1,
  status: 'VERIFIED_ONLY',
  calibrationEligible: true,
  hardObservedOuttransportEligible: true,
  incidentId: null,
  affectedPartCount: 0,
  syntheticSampleCount: 0,
  activeUntil: null,
};
const expectedMeasuredCandidateG = {
  ...candidateG,
  modes: Object.fromEntries(Object.entries(candidateG.modes).map(([mode, result]) => [
    mode,
    { ...result, evidenceTrust: verifiedOnlyTrust },
  ])),
  evidenceTrust: verifiedOnlyTrust,
};
const full = {
  datasetId: 'rr-synthetic-candidate-g',
  generatedAt: referenceAt,
  productionReferenceAt: referenceAt,
  zones: {},
  coastalParts: {
    schemaVersion: 1,
    enabled: true,
    datasetVersion: 'synthetic',
    sourceRunId: 'synthetic',
    generatedAt: referenceAt,
    scoreProfile,
    expectedPartCount: 1,
    scoredPartCount: 1,
    parts: {
      part1: {
        zoneId: 'zone1',
        current: { time: referenceAt, waders: { score: 45 }, beach: { score: 55 } },
        candidateG,
      },
    },
    zones: {
      zone1: {
        expectedPartCount: 1,
        scoredPartCount: 1,
        currentReferenceAt: referenceAt,
        hourly: [{
          time: referenceAt,
          waders: { status: 'whole-zone', score: 45, comparisonPartCount: 1, winningPartId: 'part1' },
          beach: { status: 'whole-zone', score: 55, comparisonPartCount: 1, winningPartId: 'part1' },
        }],
      },
    },
  },
};

const startup = buildPublicConditions(full);
const details = buildPublicConditionDetails(full);
const manifest = buildPublicManifest(full, compactJson(startup), compactJson(details));
assert.equal(startup.coastalParts.parts.part1.candidateG, undefined,
  'Candidate G-state hører kun til den behovshentede detaljepakke.');
assert.equal(startup.coastalParts.parts.part1.current, undefined,
  'Den fulde aktuelle kystdel hører kun til den behovshentede detaljepakke.');
assert.deepEqual(details.coastalParts.parts.part1.candidateG, expectedMeasuredCandidateG);
assert.deepEqual(startup.coastalParts.scoreProfile, scoreProfile);
assert.deepEqual(details.coastalParts.scoreProfile, scoreProfile);
assert.deepEqual(manifest.ravScoreProfile, scoreProfile);
for (const trust of [
  startup.ravScoreEvidenceTrust,
  startup.coastalParts.evidenceTrust,
  details.ravScoreEvidenceTrust,
  details.coastalParts.evidenceTrust,
  details.coastalParts.parts.part1.candidateG.evidenceTrust,
  details.coastalParts.parts.part1.candidateG.modes.waders.evidenceTrust,
  details.coastalParts.parts.part1.candidateG.modes.beach.evidenceTrust,
  manifest.ravScoreEvidenceTrust,
]) {
  assert.deepEqual(trust, verifiedOnlyTrust,
    'Målt Candidate G-state skal publiceres med samme eksplicitte VERIFIED_ONLY-tillid overalt.');
}
assert.equal(startup.coastalParts.scoreProfile.activeProfileId, CANDIDATE_G_RAVSCORE_PROFILE_ID);
assert.equal(startup.coastalParts.scoreProfile.activationState, 'candidate-g-only-local-fail-closed');
assert.equal(startup.coastalParts.scoreProfile.candidateMemoryReady, false);
assert.equal(details.coastalParts.parts.part1.current.waders.score, 45);
assert.equal(details.coastalParts.parts.part1.candidateG.modes.waders.score, 45);
assert.equal(details.coastalParts.parts.part1.candidateG.publicScoreChanged, true);

const reconstructed = structuredClone(full);
const reconstructedState = reconstructed.coastalParts.parts.part1.candidateG;
const reconstructedActiveUntil = new Date(Date.parse(referenceAt)
  + CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours * 3_600_000).toISOString();
const reconstructedPartTrust = {
  status: RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
  evidenceClassification: RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
  calibrationEligible: false,
  hardObservedOuttransportEligible: false,
  incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
  syntheticSampleCount: 1,
  activeUntil: reconstructedActiveUntil,
};
reconstructedState.currentState.schemaVersion = CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION;
reconstructedState.currentState.transportEvidence = [{
  time: referenceAt,
  strength: 0.25,
  provenance: RECONSTRUCTED_TRANSPORT_EVIDENCE_PROVENANCE,
  incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
}];
reconstructedState.evidenceTrust = structuredClone(reconstructedPartTrust);
for (const mode of ['waders', 'beach']) {
  reconstructedState.modes[mode].evidenceTrust = structuredClone(reconstructedPartTrust);
}
reconstructed.coastalParts.evidenceTrust = {
  schemaVersion: 1,
  status: RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
  incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
  decisionId: ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
  method: RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
  evidenceClassification: RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
  calibrationEligible: false,
  hardObservedOuttransportEligible: false,
  descriptorSha256: 'a'.repeat(64),
  affectedPartCount: 1,
  syntheticSampleCount: 1,
  activeUntil: reconstructedActiveUntil,
};
const reconstructedStartup = buildPublicConditions(reconstructed);
const reconstructedDetails = buildPublicConditionDetails(reconstructed);
const reconstructedManifest = buildPublicManifest(
  reconstructed,
  compactJson(reconstructedStartup),
  compactJson(reconstructedDetails),
);
for (const trust of [
  reconstructedStartup.ravScoreEvidenceTrust,
  reconstructedStartup.coastalParts.evidenceTrust,
  reconstructedDetails.ravScoreEvidenceTrust,
  reconstructedDetails.coastalParts.evidenceTrust,
  reconstructedManifest.ravScoreEvidenceTrust,
]) {
  assert.equal(trust.status, RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS);
  assert.equal(trust.descriptorSha256, 'a'.repeat(64));
  assert.equal(trust.calibrationEligible, false);
}

const aggregateTrustTamper = structuredClone(reconstructed);
aggregateTrustTamper.coastalParts.evidenceTrust.calibrationEligible = true;
assert.throws(() => buildPublicConditions(aggregateTrustTamper), /forseglet provenancebinding/,
  'Aggregate trust må ikke kunne ommærkes som kalibreringsegnet.');
const partTrustTamper = structuredClone(reconstructed);
partTrustTamper.coastalParts.parts.part1.candidateG.evidenceTrust.syntheticSampleCount = 0;
assert.throws(() => buildPublicConditionDetails(partTrustTamper), /forseglet provenancebinding/,
  'Part-trust skal stemme eksakt med de markerede samples.');
const markerLaundering = structuredClone(reconstructed);
delete markerLaundering.coastalParts.parts.part1.candidateG.currentState.transportEvidence[0].incidentId;
delete markerLaundering.coastalParts.parts.part1.candidateG.currentState.transportEvidence[0].provenance;
assert.throws(() => buildPublicConditions(markerLaundering), /ikke nedklassificeres/,
  'Fjernede samplemarkører må ikke kunne nedklassificere aktiv rekonstruktion til målt evidens.');
const invalidSyntheticTime = structuredClone(reconstructed);
invalidSyntheticTime.coastalParts.parts.part1.candidateG.currentState.transportEvidence[0].time = 'invalid';
assert.throws(() => buildPublicConditions(invalidSyntheticTime), /forseglet provenancebinding/,
  'Rekonstrueret evidens med ugyldig tid skal fejle lukket.');

const stateText = JSON.stringify(details.coastalParts.parts.part1.candidateG.currentState).toLowerCase();
for (const forbidden of ['currentu', 'currentv', 'waveheight', 'waveperiod', 'waterpoint', 'coordinates']) {
  assert.equal(stateText.includes(forbidden), false, `Den kompakte offentlige tilstand maa ikke indeholde ${forbidden}`);
}

console.log('Candidate G central pre-public warmup-runtimekontrakt: OK');
