import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CANDIDATE_G_RECOVERY_FALLBACK_POLICY,
  publishRecoveryFallback,
  selectNewestRecoveryFallbackCandidate,
  validateRecoveryFallbackBundle,
} from './candidate-g-public-recovery-fallback.mjs';
import { compactJson, sha256Text } from './public-conditions-lib.mjs';

const generatedAt = '2026-08-27T01:34:48.669Z';
const nowMs = Date.parse('2026-08-27T10:00:00.000Z');
const zones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [`zone-${index}`, {
  current: { windSpeedMps: 5 },
  forecast: { hourly: [] },
}]));
const detailZones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [`zone-${index}`, {
  forecast: { hourly: [{ time: '2026-08-29T00:00:00.000Z' }] },
}]));
const parts = Object.fromEntries(Array.from({ length: 673 }, (_, index) => [`part-${index}`, { zoneId: `zone-${index % 210}` }]));
const conditions = { schemaVersion: 2, datasetId: 'rr-last-ready-210', generatedAt, zones };
const details = {
  schemaVersion: 1,
  datasetId: conditions.datasetId,
  generatedAt,
  zones: detailZones,
  coastalParts: { parts },
};
const descriptor = {
  schemaVersion: 1,
  status: 'last-verified-candidate-g-ready',
  datasetId: conditions.datasetId,
  generatedAt,
  productionReferenceAt: '2026-08-27T00:00:00.000Z',
  validUntil: '2026-08-29T00:00:00.000Z',
  maximumAgeHours: 72,
  publicConditionsSha256: sha256Text(compactJson(conditions)),
  publicConditionDetailsSha256: sha256Text(compactJson(details)),
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
const bundle = { descriptor, conditions, details };
assert.equal(validateRecoveryFallbackBundle(bundle, { nowMs }).ok, true);
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

const activated = await publishRecoveryFallback({ auditPath, manifestPath, cacheRoot, outputRoot, nowMs });
assert.equal(activated.status, 'active-last-verified');
const recoveryManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
assert.equal(recoveryManifest.datasetId, 'rr-primary-warmup-210');
assert.equal(recoveryManifest.recoveryFallback.datasetId, conditions.datasetId);
assert.equal(recoveryManifest.recoveryFallback.maximumAgeHours, 72);
assert.equal(recoveryManifest.recoveryFallback.primaryMemoryReadyPartCount, 0);
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
