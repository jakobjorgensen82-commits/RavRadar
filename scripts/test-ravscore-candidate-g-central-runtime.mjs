import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPublicConditions, buildPublicConditionDetails } from './public-conditions-lib.mjs';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';

const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
for (const marker of [
  'buildCandidateGDerivedStateSeries',
  'previousCoastalParts?.parts?.[part.partId]?.candidateG?.currentState',
  'initialStateAccepted',
  "scoreImpact: 'diagnostic-only'",
  'automaticActivationAllowed: false',
  'publicScoreChanged: false',
  'previous?.coastalParts ?? null',
]) assert.ok(updater.includes(marker), `Central Candidate G-runtime mangler ${marker}`);

const referenceAt = '2026-08-23T12:00:00.000Z';
const candidateG = {
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  weights: { huntability: 0.2, transportAndDelivery: 0.5, mobilisation: 0.3 },
  scoreImpact: 'diagnostic-only',
  automaticActivationAllowed: false,
  publicScoreChanged: false,
  referenceAt,
  initialStateAccepted: true,
  initialStateResetReason: null,
  currentState: {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    stateKey: 'sha256:synthetic',
    time: referenceAt,
    transportPotential: 50,
    outboundEpisodeEffectiveHours: 0,
    mobilisationPotential: 50,
  },
  modes: { waders: { available: true, score: 45 }, beach: { available: true, score: 55 } },
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
    expectedPartCount: 1,
    scoredPartCount: 1,
    parts: {
      part1: {
        zoneId: 'zone1',
        current: { time: referenceAt, waders: { score: 40 }, beach: { score: 50 } },
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
          waders: { status: 'whole-zone', score: 40, comparisonPartCount: 1, winningPartId: 'part1' },
          beach: { status: 'whole-zone', score: 50, comparisonPartCount: 1, winningPartId: 'part1' },
        }],
      },
    },
  },
};

const startup = buildPublicConditions(full);
const details = buildPublicConditionDetails(full);
assert.deepEqual(startup.coastalParts.parts.part1.candidateG, candidateG);
assert.deepEqual(details.coastalParts.parts.part1.candidateG, candidateG);
assert.equal(details.coastalParts.parts.part1.current.waders.score, 40);
assert.equal(details.coastalParts.parts.part1.candidateG.modes.waders.score, 45);
assert.equal(details.coastalParts.parts.part1.candidateG.publicScoreChanged, false);

const stateText = JSON.stringify(details.coastalParts.parts.part1.candidateG.currentState).toLowerCase();
for (const forbidden of ['currentu', 'currentv', 'waveheight', 'waveperiod', 'waterpoint', 'coordinates']) {
  assert.equal(stateText.includes(forbidden), false, `Den kompakte offentlige tilstand maa ikke indeholde ${forbidden}`);
}

console.log('Candidate G central diagnostic-only runtimekontrakt: OK');
