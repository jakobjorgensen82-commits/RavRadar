import assert from 'node:assert/strict';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
  buildCandidateGDerivedStateSeries,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-next-generation.js';
import {
  NEXT_RAVSCORE_STATE_MIGRATION_ID,
  NEXT_RAVSCORE_STATE_PROFILE_ID,
  NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS,
  buildNextGenerationDerivedStateSeries,
  rollbackNextGenerationState,
} from '../js/core/ravscore-next-generation-state-pipeline.js';

const hour = index => new Date(Date.UTC(2026, 7, 28, index)).toISOString();
const sample = (index, overrides = {}) => ({
  time: hour(index),
  currentSpeedMps: 0.15,
  currentAlignment: 1,
  currentVerified: true,
  waveHeightM: 1,
  wavePeriodS: 8,
  ...overrides,
});
const stateKey = 'sha256:next-model-test-context';
const first = Array.from({ length: 25 }, (_, index) => sample(index));
const second = Array.from({ length: 25 }, (_, index) => sample(index + 24));

const candidate = buildCandidateGDerivedStateSeries(first, { stateKey });
assert.equal(candidate.continuationState.modelId, CANDIDATE_G_STATE_MODEL_ID);

const migrated = buildNextGenerationDerivedStateSeries(second, {
  stateKey,
  initialState: candidate.continuationState,
});
assert.equal(migrated.migrationStatus, 'MIGRATED_COMPATIBLE_DERIVED_EVIDENCE');
assert.equal(migrated.initialStateAccepted, true);
assert.equal(migrated.schemaVersion, NEXT_RAVSCORE_STATE_SCHEMA_VERSION);
assert.equal(migrated.modelId, NEXT_RAVSCORE_MODEL_ID);
assert.equal(migrated.profileId, NEXT_RAVSCORE_STATE_PROFILE_ID);
assert.equal(migrated.continuationState.transportMemoryReady, true);
assert.equal(migrated.continuationState.transportMemoryCoverageHours, 48);
assert.equal(migrated.continuationState.migration.id, NEXT_RAVSCORE_STATE_MIGRATION_ID);
assert.equal(migrated.continuationState.migration.rawWeatherCopied, false);
assert.equal(migrated.continuationState.migration.rawCurrentVectorsCopied, false);
assert.equal(migrated.continuationState.migration.coordinatesCopied, false);
assert.equal(migrated.continuationState.migration.scoreOutputCopied, false);

const continued = buildNextGenerationDerivedStateSeries([sample(48)], {
  stateKey,
  initialState: migrated.continuationState,
});
assert.equal(continued.migrationStatus, 'CONTINUED_SAME_MODEL');
assert.equal(continued.initialStateAccepted, true);
assert.equal(continued.continuationState.modelId, NEXT_RAVSCORE_MODEL_ID);

const rollback = rollbackNextGenerationState(migrated.continuationState);
assert.equal(rollback.available, true);
assert.equal(rollback.state.schemaVersion, CANDIDATE_G_STATE_SCHEMA_VERSION);
assert.equal(rollback.state.modelId, CANDIDATE_G_STATE_MODEL_ID);
assert.equal(rollback.state.variantId, CANDIDATE_G_STATE_VARIANT_ID);
assert.equal(rollback.state.profileId, CANDIDATE_G_STATE_PROFILE_ID);
assert.equal(Object.hasOwn(rollback.state, 'migration'), false);
assert.equal(rollback.rawWeatherCopied, false);
assert.equal(rollback.rawCurrentVectorsCopied, false);
assert.equal(rollback.coordinatesCopied, false);
assert.equal(rollback.scoreOutputCopied, false);

const incompatible = buildNextGenerationDerivedStateSeries([sample(0)], {
  stateKey,
  initialState: {
    ...candidate.continuationState,
    modelId: 'UNRELATED-MODEL',
  },
});
assert.equal(incompatible.migrationStatus, 'REJECTED_INCOMPATIBLE_SOURCE');
assert.equal(incompatible.initialStateAccepted, false);
assert.equal(incompatible.initialStateResetReason, 'INCOMPATIBLE_SOURCE_MODEL_OR_SCHEMA');
assert.equal(incompatible.rows[0].transportPotential, 0);

const smoothOutflowAfter = outboundHours => {
  const inboundHours = 20;
  const samples = [
    ...Array.from({ length: inboundHours + 1 }, (_, index) => sample(index)),
    ...Array.from({ length: outboundHours }, (_, offset) => sample(inboundHours + 1 + offset, {
      currentAlignment: -1,
    })),
  ];
  return buildNextGenerationDerivedStateSeries(samples, {
    stateKey: `${stateKey}-smooth-${outboundHours}`,
  }).rows.at(-1);
};
const after12 = smoothOutflowAfter(12);
const after13 = smoothOutflowAfter(13);
const after14 = smoothOutflowAfter(14);
assert.ok(after12.transportPotential > after13.transportPotential);
assert.ok(after13.transportPotential > after14.transportPotential);
assert.ok(after14.transportPotential > 0,
  'Fralandsrettet grid-evidens må ikke udløse en kategorisk nul-gate efter 13 timer');
assert.ok(Math.abs(
  after13.transportPotential / after12.transportPotential
    - after14.transportPotential / after13.transportPotential,
) < 1e-9, 'Dæmpningen skal være glat over den tidligere 13-timers grænse');
assert.equal(after13.gridOutflowEvidenceActive, true);
assert.equal(after13.actualOutboundTransport, false,
  'Gridstrøm må ikke udlægges som observeret transport gennem strand og surfzone');
assert.equal(NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS.categoricalExhaustionGate, false);
assert.equal(NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS.beachOrSurfZoneDepletionClaimed, false);

assert.throws(() => buildNextGenerationDerivedStateSeries([sample(48)], {
  stateKey,
  initialState: {
    ...migrated.continuationState,
    currentUMps: 0.1,
  },
}), /forbidden or unknown fields/,
'Rå strømfelter må ikke krydse den nye stategrænse');

console.log('OK: næste RavScore-state migrerer og ruller tilbage med kun kompakt afledt evidens.');
