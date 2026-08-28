import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildPublicConditions,
  buildPublicConditionDetails,
  buildPublicManifest,
  compactJson,
} from './public-conditions-lib.mjs';
import {
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_PRIORS,
  NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
  NEXT_RAVSCORE_VARIANT_ID,
} from '../js/core/ravscore-next-generation.js';
import {
  NEXT_RAVSCORE_STATE_MIGRATION_ID,
  NEXT_RAVSCORE_STATE_PROFILE_ID,
} from '../js/core/ravscore-next-generation-state-pipeline.js';
import {
  nextPublicRavScoreConfigurationFromDocument,
  resolveNextPublicRavScoreProfile,
} from '../js/core/ravscore-next-generation-profile.js';

const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
for (const marker of [
  'buildNextGenerationDerivedStateSeries',
  'previousCoastalParts?.parts?.[part.partId]?.ravScore?.currentState',
  'previousCoastalParts?.parts?.[part.partId]?.candidateG?.currentState',
  'NEXT_RAVSCORE_STATE_MIGRATION_ID',
  'nextRavScoreReferenceReadiness(partRows, generatedAt)',
  'resolveNextPublicRavScoreProfile',
  'selectNextPublicRavScoreResult',
  'publicScoreChanged: true',
  'automaticActivationAllowed: false',
  'previous?.coastalParts ?? null',
]) assert.ok(updater.includes(marker), `Central RavScore-runtime mangler ${marker}`);

const referenceAt = '2026-08-28T12:00:00.000Z';
const productionConfiguration = nextPublicRavScoreConfigurationFromDocument(
  JSON.parse(fs.readFileSync('data/admin/ravscore-profile-selection.json', 'utf8')),
);
const scoreProfile = resolveNextPublicRavScoreProfile({
  selection: productionConfiguration.selection,
  modelCoverageReady: true,
  modelMemoryReady: false,
});
const ravScore = {
  schemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
  modelId: NEXT_RAVSCORE_MODEL_ID,
  variantId: NEXT_RAVSCORE_VARIANT_ID,
  profileId: NEXT_RAVSCORE_STATE_PROFILE_ID,
  priors: NEXT_RAVSCORE_PRIORS,
  migrationId: NEXT_RAVSCORE_STATE_MIGRATION_ID,
  scoreImpact: 'active-public',
  automaticActivationAllowed: false,
  publicScoreChanged: true,
  referenceAt,
  transportReferenceAt: referenceAt,
  currentTransition: 'SAME_TIME_HOLD',
  transportMemoryReady: false,
  transportMemoryStatus: 'WINDOW_INCOMPLETE',
  transportMemoryCoverageHours: 0,
  transportMemoryWindowHours: 48,
  currentState: {
    schemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
    modelId: NEXT_RAVSCORE_MODEL_ID,
    variantId: NEXT_RAVSCORE_VARIANT_ID,
    profileId: NEXT_RAVSCORE_STATE_PROFILE_ID,
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
  modes: {
    waders: { available: true, modelId: NEXT_RAVSCORE_MODEL_ID, score: 45 },
    beach: { available: true, modelId: NEXT_RAVSCORE_MODEL_ID, score: 55 },
  },
};
const full = {
  datasetId: 'rr-synthetic-integrated-ravscore',
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
    scoreAvailability: { policy: 'ravscore-local-fail-closed' },
    expectedPartCount: 1,
    scoredPartCount: 1,
    parts: {
      part1: {
        zoneId: 'zone1',
        current: { time: referenceAt, waders: { score: 45 }, beach: { score: 55 } },
        ravScore,
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
assert.equal(startup.coastalParts.parts.part1.ravScore, undefined,
  'Kompakt RavScore-state hører kun til den behovshentede detaljepakke.');
assert.equal(startup.coastalParts.parts.part1.current, undefined,
  'Den fulde aktuelle kystdel hører kun til den behovshentede detaljepakke.');
assert.deepEqual(details.coastalParts.parts.part1.ravScore, ravScore);
assert.deepEqual(startup.coastalParts.scoreProfile, scoreProfile);
assert.deepEqual(details.coastalParts.scoreProfile, scoreProfile);
assert.deepEqual(manifest.ravScoreProfile, scoreProfile);
assert.equal(startup.coastalParts.scoreProfile.activeProfileId, NEXT_RAVSCORE_MODEL_ID);
assert.equal(startup.coastalParts.scoreProfile.activationState, 'next-ravscore-only-local-fail-closed');
assert.equal(startup.coastalParts.scoreProfile.modelMemoryReady, false);
assert.equal(details.coastalParts.parts.part1.current.waders.score, 45);
assert.equal(details.coastalParts.parts.part1.ravScore.modes.waders.score, 45);
assert.equal(details.coastalParts.parts.part1.ravScore.publicScoreChanged, true);

const stateText = JSON.stringify(details.coastalParts.parts.part1.ravScore.currentState).toLowerCase();
for (const forbidden of ['currentu', 'currentv', 'waveheight', 'waveperiod', 'waterpoint', 'coordinates']) {
  assert.equal(stateText.includes(forbidden), false, `Den kompakte offentlige tilstand må ikke indeholde ${forbidden}`);
}

console.log('Integreret RavScore central runtime-, payload-, hash- og warmupkontrakt: OK');
