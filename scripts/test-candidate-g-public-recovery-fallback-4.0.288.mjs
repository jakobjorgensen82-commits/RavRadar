import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CANDIDATE_G_RECOVERY_FALLBACK_POLICY,
  publishRecoveryFallback,
  selectNewestRecoveryFallbackCandidate,
  stageRecoveryFallback,
  upgradeRecoveryFallbackBundle,
  validateLegacyRecoveryFallbackBundle,
  validateRecoveryFallbackBundle,
} from './candidate-g-public-recovery-fallback.mjs';
import { compactJson, sha256Text } from './public-conditions-lib.mjs';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';

const generatedAt = '2026-08-27T01:34:48.669Z';
const nowMs = Date.parse('2026-08-27T10:00:00.000Z');
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
const productionReferenceAt = generatedAt;
const evidence = Array.from({ length: 49 }, (_, index) => ({
  time: new Date(Date.parse(productionReferenceAt) - (48 - index) * 3_600_000).toISOString(),
  strength: 0,
}));
const zones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [`zone-${index}`, {
  current: { windSpeedMps: 5 },
  forecast: { hourly: [] },
}]));
const detailZones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [`zone-${index}`, {
  forecast: { hourly: [{ time: '2026-08-29T00:00:00.000Z' }] },
}]));
const coastalZones = {};
const parts = {};
let partIndex = 0;
for (let zoneIndex = 0; zoneIndex < 210; zoneIndex += 1) {
  const zoneId = `zone-${zoneIndex}`;
  const count = zoneIndex < 43 ? 4 : 3;
  coastalZones[zoneId] = {
    expectedPartCount: count,
    scoredPartCount: count,
    currentReferenceAt: productionReferenceAt,
    hourly: [],
  };
  for (let localIndex = 0; localIndex < count; localIndex += 1) {
    const partId = `part-${partIndex}`;
    const mode = { available: true, score: 50, components: { transport: 0, release: 50, huntability: 50 } };
    parts[partId] = {
      zoneId,
      current: { time: productionReferenceAt, waders: { ...mode }, beach: { ...mode } },
      candidateG: {
        schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
        modelId: CANDIDATE_G_STATE_MODEL_ID,
        variantId: CANDIDATE_G_STATE_VARIANT_ID,
        profileId: CANDIDATE_G_STATE_PROFILE_ID,
        referenceAt: productionReferenceAt,
        transportReferenceAt: productionReferenceAt,
        transportMemoryReady: true,
        transportMemoryStatus: 'READY',
        transportMemoryCoverageHours: 48,
        modes: { waders: { ...mode }, beach: { ...mode } },
        currentState: {
          schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
          modelId: CANDIDATE_G_STATE_MODEL_ID,
          variantId: CANDIDATE_G_STATE_VARIANT_ID,
          profileId: CANDIDATE_G_STATE_PROFILE_ID,
          stateKey: `sha256:${sha256Text(partId)}`,
          time: productionReferenceAt,
          transportReferenceAt: productionReferenceAt,
          transportPotential: 0,
          outboundEpisodeEffectiveHours: 0,
          transportMemoryReady: true,
          transportMemoryStatus: 'READY',
          transportMemoryWindowHours: 48,
          transportMemoryCoverageHours: 48,
          transportEvidence: evidence.map(item => ({ ...item })),
          mobilisationPotential: 50,
        },
      },
    };
    partIndex += 1;
  }
}
const legacyConditions = { schemaVersion: 2, datasetId: 'rr-last-ready-210', generatedAt, productionReferenceAt, zones };
const legacyDetails = {
  schemaVersion: 1,
  datasetId: legacyConditions.datasetId,
  generatedAt,
  productionReferenceAt,
  zones: detailZones,
  coastalParts: {
    schemaVersion: 1,
    expectedPartCount: 673,
    scoredPartCount: 673,
    zones: coastalZones,
    parts,
  },
};
const legacyDescriptor = {
  schemaVersion: 1,
  status: 'last-verified-candidate-g-ready',
  datasetId: legacyConditions.datasetId,
  generatedAt,
  productionReferenceAt,
  validUntil: '2026-08-29T00:00:00.000Z',
  maximumAgeHours: 72,
  publicConditionsSha256: sha256Text(compactJson(legacyConditions)),
  publicConditionDetailsSha256: sha256Text(compactJson(legacyDetails)),
  audit: {
    status: 'passed',
    zoneCount: 210,
    partCount: 673,
    memoryReadyPartCount: 673,
    modeEvaluationCount: 1346,
    scoreReconstructionMismatchCount: 0,
  },
  privacy: { compactPublicProjectionOnly: true, privateCacheIncluded: false, credentialsIncluded: false },
};
const legacyBundle = { descriptor: legacyDescriptor, conditions: legacyConditions, details: legacyDetails };
assert.equal(validateLegacyRecoveryFallbackBundle(legacyBundle, { nowMs }).ok, true);
const hashTamperedLegacy = structuredClone(legacyBundle);
hashTamperedLegacy.conditions.zones['zone-0'].current.windSpeedMps = 99;
assert.ok(validateLegacyRecoveryFallbackBundle(hashTamperedLegacy, { nowMs }).errors.includes('STARTUP_HASH_MISMATCH'));
const metadataTamperedLegacy = structuredClone(legacyBundle);
metadataTamperedLegacy.descriptor.audit.modeEvaluationCount = 1345;
assert.ok(validateLegacyRecoveryFallbackBundle(metadataTamperedLegacy, { nowMs }).errors.includes('READY_AUDIT_METADATA_MISMATCH'));
const partialLegacy = structuredClone(legacyBundle);
delete partialLegacy.details.coastalParts.parts['part-672'];
partialLegacy.descriptor.publicConditionDetailsSha256 = sha256Text(compactJson(partialLegacy.details));
assert.ok(validateLegacyRecoveryFallbackBundle(partialLegacy, { nowMs }).errors.some(error =>
  error.includes('COVERAGE_MISMATCH') || error.includes('PART_COUNT_MISMATCH')));
const markedLegacy = structuredClone(legacyBundle);
markedLegacy.details.coastalParts.parts['part-0'].candidateG.currentState.transportEvidence[24] = {
  ...markedLegacy.details.coastalParts.parts['part-0'].candidateG.currentState.transportEvidence[24],
  incidentId: 'RRGAP-2026-08-29-CANDIDATE-G-01',
  provenance: 'OWNER_AUTHORIZED_LINEAR_INTERPOLATION_DERIVED_STRENGTH',
};
markedLegacy.descriptor.publicConditionDetailsSha256 = sha256Text(compactJson(markedLegacy.details));
assert.ok(validateLegacyRecoveryFallbackBundle(markedLegacy, { nowMs }).errors.some(error =>
  error.startsWith('MEASURED_STATE_INVALID')));
const bundle = upgradeRecoveryFallbackBundle(legacyBundle);
const { descriptor, conditions, details } = bundle;
assert.equal(descriptor.schemaVersion, 2);
assert.equal(descriptor.legacyUpgrade.verifiedPartCount, 673);
assert.equal(descriptor.legacyUpgrade.verifiedModeEvaluationCount, 1346);
assert.equal(descriptor.legacyUpgrade.originalPublicConditionsSha256, legacyDescriptor.publicConditionsSha256);
assert.equal(descriptor.legacyUpgrade.originalPublicConditionDetailsSha256, legacyDescriptor.publicConditionDetailsSha256);
assert.equal(validateRecoveryFallbackBundle(bundle, { nowMs }).ok, true);
const trustTampered = structuredClone(bundle);
trustTampered.conditions.ravScoreEvidenceTrust.status = 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE';
trustTampered.descriptor.publicConditionsSha256 = sha256Text(compactJson(trustTampered.conditions));
assert.ok(validateRecoveryFallbackBundle(trustTampered, { nowMs }).errors.includes('SOURCE_EVIDENCE_TRUST_MISMATCH'));
assert.deepEqual(
  validateRecoveryFallbackBundle({ ...bundle, details: { ...details, datasetId: 'wrong' } }, { nowMs }).errors,
  ['DATASET_ID_MISMATCH', 'DETAIL_HASH_MISMATCH'],
);
assert.ok(validateRecoveryFallbackBundle({
  ...bundle,
  conditions: { ...conditions, generatedAt: '2026-08-27T02:00:00.000Z' },
}, { nowMs }).errors.includes('GENERATED_AT_MISMATCH'));
assert.ok(validateRecoveryFallbackBundle(bundle, {
  nowMs: Date.parse(generatedAt) + 73 * 3_600_000,
}).errors.includes('FALLBACK_TOO_OLD'));
assert.ok(validateRecoveryFallbackBundle(bundle, {
  nowMs: Date.parse(descriptor.validUntil) + 1,
}).errors.includes('FALLBACK_FORECAST_EXPIRED'));
const newerGeneratedAt = '2026-08-27T09:00:00.000Z';
const newerConditions = { ...conditions, datasetId: 'rr-newest-ready-210', generatedAt: newerGeneratedAt };
const newerDetails = { ...details, datasetId: newerConditions.datasetId, generatedAt: newerGeneratedAt };
const newerBundle = {
  descriptor: {
    ...descriptor,
    datasetId: newerConditions.datasetId,
    generatedAt: newerGeneratedAt,
    publicConditionsSha256: sha256Text(compactJson(newerConditions)),
    publicConditionDetailsSha256: sha256Text(compactJson(newerDetails)),
  },
  conditions: newerConditions,
  details: newerDetails,
};
assert.equal(selectNewestRecoveryFallbackCandidate([
  { status: 'older-cache', bundle },
  { status: 'newer-hydrated', bundle: newerBundle },
], { nowMs }).status, 'newer-hydrated');

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-candidate-g-public-fallback-'));
const cacheRoot = path.join(root, 'cache');
const outputRoot = path.join(root, 'live');
const manifestPath = path.join(outputRoot, 'manifest.json');
const auditPath = path.join(root, 'audit.json');
await fs.mkdir(cacheRoot, { recursive: true });
await fs.mkdir(outputRoot, { recursive: true });
await fs.writeFile(path.join(cacheRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.cacheDescriptorName), `${JSON.stringify(descriptor)}\n`);
await fs.writeFile(path.join(cacheRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.cacheConditionsName), compactJson(conditions));
await fs.writeFile(path.join(cacheRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.cacheDetailsName), compactJson(details));
await fs.writeFile(manifestPath, `${JSON.stringify({
  schemaVersion: 2,
  datasetId: 'rr-primary-warmup-210',
  generatedAt: '2026-08-27T09:55:50.000Z',
})}\n`);
await fs.writeFile(auditPath, `${JSON.stringify({
  status: 'passed',
  stateContinuation: { memoryReadyPartCount: 0, warmupPartCount: 673 },
})}\n`);

const stagedSourcePath = path.join(root, 'staged-source.json');
await fs.writeFile(stagedSourcePath, '{}\n');
const stagedAvailable = await stageRecoveryFallback({
  sourcePath: stagedSourcePath,
  manifestPath,
  cacheRoot,
  nowMs,
});
assert.equal(stagedAvailable.status, 'preserved-cache');
assert.equal(stagedAvailable.fallbackAvailable, true);

function fallbackBundleWithValidUntil({ datasetId, validUntil }) {
  const fixture = structuredClone(bundle);
  fixture.descriptor.datasetId = datasetId;
  fixture.descriptor.validUntil = validUntil;
  fixture.conditions.datasetId = datasetId;
  fixture.details.datasetId = datasetId;
  for (const zone of Object.values(fixture.details.zones)) {
    zone.forecast.hourly = [{ time: validUntil }];
  }
  fixture.descriptor.publicConditionsSha256 = sha256Text(compactJson(fixture.conditions));
  fixture.descriptor.publicConditionDetailsSha256 = sha256Text(compactJson(fixture.details));
  return upgradeRecoveryFallbackBundle(fixture);
}

async function assertExpiredFallbackRetired({ scenario, fixture, evaluationNowMs, expectedExpiryError }) {
  assert.deepEqual(
    validateRecoveryFallbackBundle(fixture, { nowMs: evaluationNowMs }).errors,
    [expectedExpiryError],
  );
  const scenarioRoot = path.join(root, scenario);
  const scenarioCacheRoot = path.join(scenarioRoot, 'cache');
  const scenarioOutputRoot = path.join(scenarioRoot, 'live');
  const scenarioManifestPath = path.join(scenarioOutputRoot, 'manifest.json');
  const scenarioAuditPath = path.join(scenarioRoot, 'audit.json');
  const scenarioSourcePath = path.join(scenarioOutputRoot, 'conditions.json');
  await fs.mkdir(scenarioCacheRoot, { recursive: true });
  await fs.mkdir(scenarioOutputRoot, { recursive: true });
  await fs.writeFile(
    path.join(scenarioCacheRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.cacheDescriptorName),
    `${JSON.stringify(fixture.descriptor)}\n`,
  );
  await fs.writeFile(
    path.join(scenarioCacheRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.cacheConditionsName),
    compactJson(fixture.conditions),
  );
  await fs.writeFile(
    path.join(scenarioCacheRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.cacheDetailsName),
    compactJson(fixture.details),
  );
  await fs.writeFile(scenarioSourcePath, '{}\n');
  await fs.writeFile(scenarioManifestPath, `${JSON.stringify({
    schemaVersion: 2,
    datasetId: `rr-fresh-primary-${scenario}-210`,
    generatedAt: new Date(evaluationNowMs).toISOString(),
    recoveryFallback: { status: 'active-last-verified', datasetId: fixture.descriptor.datasetId },
  })}\n`);
  await fs.writeFile(scenarioAuditPath, `${JSON.stringify({
    status: 'passed',
    stateContinuation: { memoryReadyPartCount: 0, warmupPartCount: 673 },
  })}\n`);
  await fs.writeFile(
    path.join(scenarioOutputRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.publicConditionsName),
    '{"stale":true}\n',
  );
  await fs.writeFile(
    path.join(scenarioOutputRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.publicDetailsName),
    '{"stale":true}\n',
  );

  const staged = await stageRecoveryFallback({
    sourcePath: scenarioSourcePath,
    manifestPath: scenarioManifestPath,
    cacheRoot: scenarioCacheRoot,
    nowMs: evaluationNowMs,
  });
  assert.equal(staged.status, 'unavailable-no-valid-fallback');
  assert.equal(staged.fallbackAvailable, false);
  assert.equal(staged.cacheRefreshed, false);

  const published = await publishRecoveryFallback({
    auditPath: scenarioAuditPath,
    manifestPath: scenarioManifestPath,
    cacheRoot: scenarioCacheRoot,
    outputRoot: scenarioOutputRoot,
    nowMs: evaluationNowMs,
  });
  assert.equal(published.status, 'inactive-no-valid-fallback');
  assert.equal(JSON.parse(await fs.readFile(scenarioManifestPath, 'utf8')).recoveryFallback, undefined);
  await assert.rejects(fs.access(path.join(
    scenarioOutputRoot,
    CANDIDATE_G_RECOVERY_FALLBACK_POLICY.publicConditionsName,
  )));
  await assert.rejects(fs.access(path.join(
    scenarioOutputRoot,
    CANDIDATE_G_RECOVERY_FALLBACK_POLICY.publicDetailsName,
  )));
}

await assertExpiredFallbackRetired({
  scenario: 'age-expired',
  fixture: fallbackBundleWithValidUntil({
    datasetId: 'rr-age-expired-ready-210',
    validUntil: '2026-09-01T00:00:00.000Z',
  }),
  evaluationNowMs: Date.parse(generatedAt) + 73 * 3_600_000,
  expectedExpiryError: 'FALLBACK_TOO_OLD',
});
await assertExpiredFallbackRetired({
  scenario: 'forecast-expired',
  fixture: fallbackBundleWithValidUntil({
    datasetId: 'rr-forecast-expired-ready-210',
    validUntil: '2026-08-27T09:00:00.000Z',
  }),
  evaluationNowMs: nowMs,
  expectedExpiryError: 'FALLBACK_FORECAST_EXPIRED',
});

const productionWorkflow = await fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8');
assert.ok(productionWorkflow.includes("steps.candidate-g-public-fallback-stage.outputs.fallback_available == 'true'"));
assert.ok(productionWorkflow.includes('node scripts/candidate-g-public-recovery-fallback.mjs'));

await fs.writeFile(auditPath, `${JSON.stringify({
  status: 'failed',
  stateContinuation: { memoryReadyPartCount: 0, warmupPartCount: 673 },
})}\n`);
await assert.rejects(
  publishRecoveryFallback({ auditPath, manifestPath, cacheRoot, outputRoot, nowMs }),
  /må ikke publiceres efter en fejlet audit/,
);
await fs.writeFile(auditPath, `${JSON.stringify({
  status: 'passed',
  stateContinuation: { memoryReadyPartCount: 0, warmupPartCount: 673 },
})}\n`);

const activated = await publishRecoveryFallback({ auditPath, manifestPath, cacheRoot, outputRoot, nowMs });
assert.equal(activated.status, 'active-last-verified');
const recoveryManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
assert.equal(recoveryManifest.datasetId, 'rr-primary-warmup-210');
assert.equal(recoveryManifest.recoveryFallback.datasetId, conditions.datasetId);
assert.equal(recoveryManifest.recoveryFallback.maximumAgeHours, 72);
assert.equal(recoveryManifest.recoveryFallback.primaryMemoryReadyPartCount, 0);
assert.deepEqual(recoveryManifest.recoveryFallback.ravScoreEvidenceTrust, verifiedOnlyTrust);
assert.equal(recoveryManifest.recoveryFallback.ravScoreEvidenceTrustSha256, sha256Text(compactJson(verifiedOnlyTrust)));
assert.equal(
  JSON.parse(await fs.readFile(path.join(outputRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.publicConditionsName), 'utf8')).datasetId,
  conditions.datasetId,
);

await fs.writeFile(auditPath, `${JSON.stringify({
  status: 'passed',
  stateContinuation: { memoryReadyPartCount: 672, warmupPartCount: 1 },
})}\n`);
const boundedLocal = await publishRecoveryFallback({ auditPath, manifestPath, cacheRoot, outputRoot, nowMs });
assert.equal(boundedLocal.status, 'active-last-verified');
assert.equal(
  JSON.parse(await fs.readFile(manifestPath, 'utf8')).recoveryFallback.reason,
  'candidate-g-bounded-local-context-warmup',
);

await fs.writeFile(auditPath, `${JSON.stringify({
  status: 'passed',
  stateContinuation: { memoryReadyPartCount: 666, warmupPartCount: 7 },
})}\n`);
await assert.rejects(
  publishRecoveryFallback({ auditPath, manifestPath, cacheRoot, outputRoot, nowMs }),
  /Uventet delvis national Candidate G-recovery/,
);

await fs.writeFile(auditPath, `${JSON.stringify({
  status: 'passed',
  stateContinuation: { memoryReadyPartCount: 673, warmupPartCount: 0 },
})}\n`);
const deactivated = await publishRecoveryFallback({ auditPath, manifestPath, cacheRoot, outputRoot, nowMs });
assert.equal(deactivated.status, 'inactive-current-runtime-ready');
assert.equal(JSON.parse(await fs.readFile(manifestPath, 'utf8')).recoveryFallback, undefined);
await assert.rejects(fs.access(path.join(outputRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.publicConditionsName)));
await assert.rejects(fs.access(path.join(outputRoot, CANDIDATE_G_RECOVERY_FALLBACK_POLICY.publicDetailsName)));

await fs.rm(root, { recursive: true, force: true });
console.log('Candidate G last-verified public recovery fallback: OK');
