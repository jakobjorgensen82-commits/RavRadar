import assert from 'node:assert/strict';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';
import { ravScoreModelBinding as integratedModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreVerifiedEvidenceTrust } from '../js/core/ravscore-evidence-trust-contract.js';
import {
  CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY,
  prepareCandidateGOperationalRollback as prepareCandidateGOperationalRollbackRaw,
} from './prepare-candidate-g-operational-rollback.mjs';
import {
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
  candidateGRollbackScoreProfile,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';

const HOUR_MS = 3_600_000;
const reference = '2026-08-29T12:00:00.000Z';
const referenceMs = Date.parse(reference);
const time = offset => new Date(referenceMs + offset * HOUR_MS).toISOString();
const datasetId = 'rr-20260829120000-210';
const sourceHead = 'a'.repeat(40);
const privateBundleContentSha256 = 'b'.repeat(64);
const implementationClosureSha256 = 'c'.repeat(64);
const prepareCandidateGOperationalRollback = (full, options) =>
  prepareCandidateGOperationalRollbackRaw(full, {
    sourceImplementationClosureSha256: implementationClosureSha256,
    requestedImplementationClosureSha256: implementationClosureSha256,
    ...options,
  });
const evidence = Array.from({ length: 49 }, (_, index) => ({
  time: time(index - 48),
  strength: index >= 36 ? 0.5 : 0,
}));
const oracle = buildBoundedCurrentTransportMemory(evidence, {
  ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  referenceTime: reference,
  restartAfterVerifiedTimeGap: true,
});
assert.equal(oracle.memoryReady, true);
const candidateBinding = candidateModelBinding();
const mode = score => ({
  available: true,
  score,
  baseScore: score,
  level: 'fair',
  label: 'Middel',
  components: { huntability: 60, transport: 70, release: 50 },
  componentReasons: { huntability: [], transport: [], release: [] },
  reasons: [],
  explanation: {
    ...candidateBinding,
    weights: { huntability: 0.2, transport: 0.5, release: 0.3 },
    contributions: { huntability: 12, transport: 35, release: 15 },
    transportDiagnostics: { engine: 'CANDIDATE_G' },
    mobilisationDiagnostics: { mobilisationPotential: 50 },
  },
  scoreProfileId: candidateBinding.modelId,
  modelBinding: candidateBinding,
});
const state = stateKey => ({
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  stateKey,
  time: reference,
  transportReferenceAt: reference,
  transportPotential: oracle.result.transportPotential,
  outboundEpisodeEffectiveHours: oracle.result.outboundEpisodeEffectiveHours,
  transportMemoryReady: true,
  transportMemoryStatus: oracle.status,
  transportMemoryWindowHours: oracle.windowHours,
  transportMemoryCoverageHours: oracle.coverageHours,
  transportEvidence: oracle.evidence,
  mobilisationPotential: 64,
});

function nationalRuntime() {
  const zones = {};
  const weatherZones = {};
  const parts = {};
  let partIndex = 0;
  for (let zoneIndex = 0; zoneIndex < 210; zoneIndex += 1) {
    const zoneId = `rollback-zone-${zoneIndex + 1}`;
    const partCount = zoneIndex < 43 ? 4 : 3;
    const zoneParts = [];
    for (let localIndex = 0; localIndex < partCount; localIndex += 1) {
      partIndex += 1;
      const partId = `rollback-part-${partIndex}`;
      zoneParts.push(partId);
      parts[partId] = {
        zoneId,
        name: `Rollback part ${partIndex}`,
        marineCoverage: 'full',
        landPoint: [10.01, 56.01],
        waterPoint: [10, 56],
        onshoreDirectionDeg: 90,
        onshoreDirectionSource: 'owner-approved-existing-point',
        flowPoints: { current: [10, 56], wind: [10.02, 56.02], sources: {} },
        current: {
          time: reference,
          weather: { windSpeedMps: 5, waveHeightM: 1, currentSpeedMps: 0.1 },
          waders: mode(62),
          beach: mode(67),
        },
        ravScoreModel: {
          ...candidateBinding,
          rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
          currentState: state(`sha256:rollback-state-${partIndex}`),
        },
      };
    }
    const waders = mode(62 + zoneIndex % 5);
    const beach = mode(67 + zoneIndex % 5);
    zones[zoneId] = {
      expectedPartCount: partCount,
      scoredPartCount: partCount,
      currentReferenceAt: reference,
      hourly: [{ time: reference, waders, beach }],
    };
    weatherZones[zoneId] = { id: zoneId, hourly: [{ time: reference }] };
  }
  assert.equal(partIndex, 673);
  return {
    weatherZones,
    runtime: {
      schemaVersion: 1,
      enabled: true,
      datasetVersion: '4.0.308',
      sourceRunId: 'synthetic-rollback-test',
      modelBinding: candidateBinding,
      evidenceTrust: ravScoreVerifiedEvidenceTrust(),
      generatedAt: reference,
      marginPoints: 7,
      expectedPartCount: 673,
      scoredPartCount: 673,
      scoreProfile: candidateGRollbackScoreProfile({
        modelCoverageReady: true,
        modelMemoryReady: true,
        modelMigrationReady: true,
      }),
      currentPilotMode: 'unavailable',
      currentPilotEnabled: false,
      scoreAvailability: {
        schemaVersion: 1,
        policy: 'candidate-g-local-fail-closed',
        allZonesActive: true,
        activeZoneCount: 210,
        unavailableZoneCount: 0,
        totalZoneCount: 210,
        evaluatedAt: reference,
        unavailableZones: [],
      },
      parts,
      zones,
    },
  };
}

function fullRuntime() {
  const { weatherZones, runtime } = nationalRuntime();
  return {
    datasetId,
    productionReferenceAt: reference,
    generatedAt: reference,
    zones: weatherZones,
    coastalParts: {
      modelBinding: integratedModelBinding(),
    },
    ravScoreCandidateGRollback: {
      schemaVersion: '1.0.0',
      kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
      sourceModelBinding: integratedModelBinding(),
      rollbackModelBinding: candidateBinding,
      rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
      automaticActivationAllowed: false,
      publicDuringNormalOperation: false,
      runtime,
    },
  };
}

const prepared = prepareCandidateGOperationalRollback(fullRuntime(), {
  expectedDatasetId: datasetId,
  sourceHead,
  privateBundleContentSha256,
  centralExpectedVersion: 17,
  now: time(1),
});
assert.equal(prepared.plan.mode, 'dry-run');
assert.equal(prepared.plan.sourceHead, sourceHead);
assert.equal(prepared.plan.datasetId, datasetId);
assert.equal(prepared.plan.centralExpectedVersion, 17);
assert.equal(prepared.plan.schedulerActivationAllowed, false);
assert.equal(prepared.plan.automaticActivationAllowed, false);
assert.equal(prepared.plan.calibrationEligible, false);
assert.equal(prepared.plan.activeModelBinding.modelId, CANDIDATE_G_STATE_MODEL_ID);
assert.match(prepared.plan.planSha256, /^[0-9a-f]{64}$/);
assert.match(prepared.plan.candidateFullSha256, /^[0-9a-f]{64}$/);
assert.equal(prepared.candidateFull.ravScoreCandidateGRollback, undefined);
assert.equal(prepared.candidateFull.coastalParts.modelBinding.modelId,
  CANDIDATE_G_STATE_MODEL_ID);
assert.equal(Object.keys(prepared.candidateFull.coastalParts.zones).length, 210);
assert.equal(Object.keys(prepared.candidateFull.coastalParts.parts).length, 673);

assert.throws(() => prepareCandidateGOperationalRollback(fullRuntime(), {
  expectedDatasetId: datasetId,
  sourceHead,
  mode: 'execute',
  privateBundleContentSha256,
  centralExpectedVersion: 17,
  now: time(1),
}), /exact manual-dispatch authorization/,
'execute must never be reachable through scheduler/default invocation');

const execute = prepareCandidateGOperationalRollback(fullRuntime(), {
  expectedDatasetId: datasetId,
  sourceHead,
  mode: 'execute',
  eventName: 'workflow_dispatch',
  ref: 'refs/heads/main',
  githubSha: sourceHead,
  confirmation: CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeConfirmation,
  privateBundleContentSha256,
  centralExpectedVersion: 17,
  now: time(1),
});
assert.equal(execute.plan.mode, 'execute');

const wrongDataset = fullRuntime();
assert.throws(() => prepareCandidateGOperationalRollback(wrongDataset, {
  expectedDatasetId: 'rr-another-dataset',
  sourceHead,
  privateBundleContentSha256,
  centralExpectedVersion: 17,
  now: time(1),
}), /dataset does not match/);

const modelMix = fullRuntime();
modelMix.ravScoreCandidateGRollback.runtime.parts['rollback-part-1']
  .current.beach.modelBinding = integratedModelBinding();
assert.throws(() => prepareCandidateGOperationalRollback(modelMix, {
  expectedDatasetId: datasetId,
  sourceHead,
  privateBundleContentSha256,
  centralExpectedVersion: 17,
  now: time(1),
}), /exact available Candidate G score/,
'one mixed-model part must stop the national rollback');

for (const invalidValue of ['62', false, [62]]) {
  const invalid = fullRuntime();
  invalid.ravScoreCandidateGRollback.runtime.parts['rollback-part-1']
    .current.waders.score = invalidValue;
  assert.throws(() => prepareCandidateGOperationalRollback(invalid, {
    expectedDatasetId: datasetId,
    sourceHead,
    privateBundleContentSha256,
    centralExpectedVersion: 17,
    now: time(1),
  }), /exact available Candidate G score/,
  `Candidate G prepare must reject non-number score ${JSON.stringify(invalidValue)}`);
}
for (const component of ['huntability', 'transport', 'release']) {
  for (const invalidValue of ['70', false, [70]]) {
    const invalid = fullRuntime();
    invalid.ravScoreCandidateGRollback.runtime.parts['rollback-part-1']
      .current.waders.components[component] = invalidValue;
    assert.throws(() => prepareCandidateGOperationalRollback(invalid, {
      expectedDatasetId: datasetId,
      sourceHead,
      privateBundleContentSha256,
      centralExpectedVersion: 17,
      now: time(1),
    }), /exact available Candidate G score/,
    `Candidate G prepare must reject ${component}=${JSON.stringify(invalidValue)}`);
  }
}

const rawVector = fullRuntime();
rawVector.ravScoreCandidateGRollback.runtime.parts['rollback-part-1']
  .ravScoreModel.currentState.currentUMps = 0.1;
assert.throws(() => prepareCandidateGOperationalRollback(rawVector, {
  expectedDatasetId: datasetId,
  sourceHead,
  privateBundleContentSha256,
  centralExpectedVersion: 17,
  now: time(1),
}), /forbidden raw current-vector field/);

assert.throws(() => prepareCandidateGOperationalRollback(fullRuntime(), {
  expectedDatasetId: datasetId,
  sourceHead,
  privateBundleContentSha256,
  centralExpectedVersion: 17,
  now: time(7),
}), /not fresh enough/);

console.log('Candidate G rollback dry-run/execute guard, 210/673 atomaritet, CAS-plan og privacy: bestået.');
