// Synthetic VALUE-input test only. An artificial JSON attestation is never
// authenticated origin, GCM, a production result or permission to publish.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { assertOrdinaryCompletedStageLineage } from './ordinary-completed-stage-lineage.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { privateRuntimeContractHashes } from './private-production-runtime-workflow.mjs';
import { privateRuntimeBundleContentSha256, PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY as B_POLICY }
  from './private-production-runtime-bundle.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_key, nested) => nested && typeof nested === 'object'
  && !Array.isArray(nested) ? Object.fromEntries(Object.keys(nested).sort().map(key => [key, nested[key]])) : nested);
const digest = value => sha(canonical(value));
const signSynthetic = content => ({ ...content, attestationSha256: digest(content) });
function syntheticSeedFromExactNormalSource(source) {
  // Read only the existing finite literal, never execute the origin module or
  // expose a private issuer. Every row must be a simple single-quoted scalar.
  const match = /const SEED = Object\.freeze\(\{\n([\s\S]*?)\n\}\);/.exec(source.replaceAll('\r\n', '\n'));
  assert(match, 'Existing fixed normal seed literal');
  const rows = [...match[1].matchAll(/([A-Za-z][A-Za-z0-9]*): '([^'\n]*)'/g)];
  assert.equal(rows.length, 13);
  const result = Object.fromEntries(rows.map(row => [row[1], row[2]]));
  assert.equal(Object.keys(result).length, 13);
  assert.equal(match[1].replace(/([A-Za-z][A-Za-z0-9]*): '([^'\n]*)'/g, '').replace(/[\s,]/g, ''), '');
  return result;
}
function pairDigests(conditions, central) {
  const pairs = new Map();
  for (const parts of Object.values(central.zones)) for (const part of parts) {
    const integrated = conditions.coastalParts.parts[part.partId].ravScoreModel.currentState;
    const candidate = conditions.ravScoreCandidateGRollback.runtime.parts[part.partId].ravScoreModel.currentState;
    pairs.set(part.partId, { integrated, candidate, context: integrated.samplingContextKey });
  }
  const hash = crypto.createHash('sha256');
  for (const id of [...pairs.keys()].sort()) hash.update(canonical([id, pairs.get(id)]));
  return { pairsSha256: hash.digest('hex'), contextRegistrySha256: digest([...pairs]
    .map(([id, pair]) => [id, pair.context]).sort(([a], [b]) => a.localeCompare(b))) };
}
function bindPayload(input) {
  // Pretty bytes deliberately differ from JSON.stringify(input.conditions).
  // The validator must use these original bytes, not invent a serialization.
  const conditionsPayloadBytes = Buffer.from(JSON.stringify(input.conditions, null, 1) + '\n');
  const B = structuredClone(input.newBManifest);
  B.files[0].bytes = conditionsPayloadBytes.length; B.files[0].sha256 = sha(conditionsPayloadBytes);
  B.bundleContentSha256 = privateRuntimeBundleContentSha256(B);
  return { ...input, conditionsPayloadBytes, newBManifest: B };
}
test('ordinary lineage is finite value-only: one normal 673-pair fixture and critical cloned-input refusals', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-ordinary-stage-lineage-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const I = ravScoreModelBinding(), C = candidateBinding();
  const contracts = await privateRuntimeContractHashes({ repositoryRoot: ROOT });
  const seed = syntheticSeedFromExactNormalSource(await fs.readFile(path.join(ROOT, 'scripts/lib/established-native-current-origin.mjs'), 'utf8'));
  const ownerPolicyGitBlob = execFileSync('git', ['rev-parse', 'HEAD:scripts/lib/dmi-marine-zone-exclusions.json'],
    { cwd: ROOT, encoding: 'utf8' }).trim();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const baselineReference = '2026-10-19T10:00:00.000Z', target = '2026-10-19T11:00:00.000Z';
  const central = { zoneCount: 210, partCount: 673,
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => ['z' + i, []])) };
  for (let i = 0; i < 673; i++) central.zones['z' + (i % 210)].push({
    partId: 'p' + i, landPoint: [10, 56], waterPoint: [10.01, 56.01], onshoreDirectionDeg: 90 });
  const conditionsFor = reference => {
    // Exactly the existing admission target's 49-hour recipe, using the normal
    // I/G state builders once per reference, then real per-part context keys.
    const samples = Array.from({ length: 49 }, (_, i) => ({
      time: new Date(Date.parse(reference) - (48 - i) * 3_600_000).toISOString(),
      currentSpeedMps: 0.12, currentAlignment: 0.75, currentVerified: true,
      waveHeightM: 1.2, wavePeriodS: 6, waveDirectionDeg: 270 }));
    const first = central.zones.z0[0];
    const integrated = buildIntegratedRavScoreStateSeries(samples, {
      samplingContextKey: ravScoreSamplingContextKey(first), onshoreDirectionDeg: 90 }).rows.at(-1).continuationState;
    const candidate = buildCandidateGDerivedStateSeries(samples, { stateKey: candidateGStateKey(first) }).continuationState;
    const parts = {}, candidateParts = {};
    for (const [zoneId, values] of Object.entries(central.zones)) for (const part of values) {
      const { partId, ...metadata } = part;
      parts[part.partId] = { ...metadata, zoneId, ravScoreModel: { currentState: {
        ...structuredClone(integrated), samplingContextKey: ravScoreSamplingContextKey(part) } } };
      candidateParts[part.partId] = { ravScoreModel: { currentState: {
        ...structuredClone(candidate), stateKey: candidateGStateKey(part) } } };
    }
    return { datasetId: 'rr-synthetic-ordinary-stage-' + reference.slice(11, 13), productionReferenceAt: reference,
      generatedAt: '2026-10-19T12:00:00.000Z', zones: Object.fromEntries(Object.keys(central.zones).map(id => [id, {}])),
      coastalParts: { modelBinding: I, expectedPartCount: 673, parts },
      ravScoreCandidateGRollback: { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', sourceModelBinding: I, rollbackModelBinding: C,
        rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID, automaticActivationAllowed: false, publicDuringNormalOperation: false,
        runtime: { modelBinding: C, expectedPartCount: 673, scoredPartCount: 673,
          scoreProfile: { modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true }, parts: candidateParts } } };
  };
  const baselineConditions = conditionsFor(baselineReference), conditions = conditionsFor(target);
  const producer = { sourceHead: head, semanticContract: 'established-native-current-continuation-v1',
    integrated: I.modelBundleSha256, candidate: C.modelBundleSha256,
    continuation: contracts.continuationStateContractSha256, ownerPolicyGitBlob };
  const baselineContent = { schemaVersion: 1, kind: 'PRIVATE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',
    semanticContract: producer.semanticContract, seed,
    parent: { bundleContentSha256: '1'.repeat(64), generationSha256: '2'.repeat(64), attestationSha256: '3'.repeat(64) },
    producer, datasetId: baselineConditions.datasetId, referenceAt: baselineReference,
    registrySha256: digest(central), ...pairDigests(baselineConditions, central), transition: 'NORMAL_STRICT_CONTINUATION' };
  baselineConditions.privateEstablishedNativeCurrentOrigin = signSynthetic(baselineContent);
  const sourcePath = path.join(folder, 'conditions.json'), checkpointPath = path.join(folder, 'checkpoint.json');
  await fs.writeFile(sourcePath, JSON.stringify(baselineConditions));
  await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath, repositoryRoot: ROOT });
  const baselineCheckpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
  const baselineBDescriptor = { datasetId: baselineConditions.datasetId, productionReferenceAt: baselineReference,
    generatedAt: baselineConditions.generatedAt, modelBinding: I, contractHashes: contracts, bundleContentSha256: '4'.repeat(64) };
  conditions.privateEstablishedNativeCurrentOrigin = signSynthetic({ ...baselineContent,
    parent: { bundleContentSha256: baselineBDescriptor.bundleContentSha256,
      generationSha256: baselineCheckpoint.generationSha256,
      attestationSha256: baselineConditions.privateEstablishedNativeCurrentOrigin.attestationSha256 },
    datasetId: conditions.datasetId, referenceAt: target, ...pairDigests(conditions, central) });
  const input = bindPayload({ conditions, conditionsPayloadBytes: null,
    newBManifest: { schemaVersion: B_POLICY.schemaVersion, kind: B_POLICY.kind, privacyClass: B_POLICY.privacyClass,
      datasetId: conditions.datasetId, productionReferenceAt: target, generatedAt: conditions.generatedAt,
      generationId: conditions.datasetId, zoneCount: 210, partCount: 673, modelBinding: I, contractHashes: contracts,
      fileCount: 1, files: [{ id: 'full-conditions', relativePath: 'data/live/conditions.json', bytes: 0,
        sha256: '0'.repeat(64), privacyClass: B_POLICY.privacyClass }], bundleContentSha256: '0'.repeat(64) },
    originalAADIdentity: { repository: 'synthetic/RavRadar', runId: '1', runAttempt: '1', sourceHead: head },
    baselineBDescriptor, baselineConditions, baselineCheckpoint, centralContract: central,
    currentModelBinding: I, currentCandidateBinding: C, currentContractHashes: contracts, ownerPolicyGitBlob, targetReferenceAt: target });
  const snapshot = value => Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, sha(key === 'conditionsPayloadBytes' ? item : canonical(item))]));
  const before = snapshot(input);
  const result = assertOrdinaryCompletedStageLineage(input);
  assert.equal(result.status, 'VALUE_CHECKS_ONLY_NOT_ADMISSION');
  assert.equal(result.partCount, 673); assert.equal(result.zoneCount, 210); assert(Object.isFrozen(result));
  assert.deepEqual(Object.keys(result).sort(), ['status', 'zoneCount', 'partCount', 'bundleContentSha256',
    'baselineGenerationSha256', 'attestationSha256', 'contextRegistrySha256', 'pairsSha256'].sort());
  assert.deepEqual(snapshot(input), before, 'No original attestation or I/G state is modified');
  let rejected = 0;
  const reject = (value, code) => {
    assert.throws(() => assertOrdinaryCompletedStageLineage(value), error => error.code === 'ORDINARY_STAGE_LINEAGE_' + code);
    rejected++;
  };
  const changedConditions = (mutate, rehash = true) => {
    const next = { ...input, conditions: structuredClone(input.conditions) };
    mutate(next.conditions);
    if (rehash) {
      const { attestationSha256, ...content } = next.conditions.privateEstablishedNativeCurrentOrigin;
      next.conditions.privateEstablishedNativeCurrentOrigin = signSynthetic(content);
    }
    return bindPayload(next);
  };
  for (const key of ['bundleContentSha256', 'generationSha256', 'attestationSha256'])
    reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.parent[key] = '5'.repeat(64); }), 'EXACT_PARENT');
  reject({ ...input, conditionsPayloadBytes: Buffer.from('{}') }, 'CONDITIONS_PAYLOAD_HASH');
  reject({ ...input, conditions: { ...input.conditions, generatedAt: '2026-10-19T12:01:00.000Z' } }, 'IDENTITY_OR_REFERENCE');
  reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.attestationSha256 = '5'.repeat(64); }, false), 'ATTESTATION_HASH');
  reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.transition = 'SEED_METADATA_ONLY'; }), 'NORMAL_TRANSITION');
  reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.kind = 'PRIVATE_ARCHIVE_ISOLATED_NATIVE_CURRENT_ORIGIN'; }), 'NORMAL_TRANSITION');
  reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.producer.integrated = '5'.repeat(64); }), 'PRODUCER');
  reject({ ...input, originalAADIdentity: { ...input.originalAADIdentity, sourceHead: '5'.repeat(40) } }, 'PRODUCER');
  reject({ ...input, ownerPolicyGitBlob: '5'.repeat(40) }, 'PRODUCER');
  reject({ ...input, currentModelBinding: { ...I, modelBundleSha256: '5'.repeat(64) } }, 'CURRENT_MODEL');
  reject({ ...input, targetReferenceAt: baselineReference }, 'IDENTITY_OR_REFERENCE');
  reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.referenceAt = baselineReference; }), 'PRODUCER');
  reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.registrySha256 = '5'.repeat(64); }), 'REGISTRY_HASH');
  reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.pairsSha256 = '5'.repeat(64); }), 'PAIRS_HASH');
  reject(changedConditions(value => { value.privateEstablishedNativeCurrentOrigin.contextRegistrySha256 = '5'.repeat(64); }), 'CONTEXT_REGISTRY_HASH');
  reject(changedConditions(value => { value.coastalParts.parts.p0.ravScoreModel.currentState.samplingContextKey = 'sha256:' + '5'.repeat(64); }), 'NEW_I_CONTEXT_OR_STATE');
  reject(changedConditions(value => { value.ravScoreCandidateGRollback.runtime.parts.p0.ravScoreModel.currentState.stateKey = 'sha256:' + '5'.repeat(64); }), 'NEW_G_CONTEXT_OR_STATE');
  reject(changedConditions(value => { delete value.coastalParts.parts.p0; }), 'NEW_PARTS_MODEL');
  reject({ ...input, centralContract: { ...central, partCount: 672 } }, 'REGISTRY');
  const changedS = structuredClone(baselineCheckpoint);
  changedS.states.p0.supplyPotential += 0.1;
  reject({ ...input, baselineCheckpoint: changedS }, 'BASELINE_B_S_PAIRS');
  const changedParentConditions = structuredClone(baselineConditions);
  changedParentConditions.privateEstablishedNativeCurrentOrigin.attestationSha256 = '5'.repeat(64);
  reject({ ...input, baselineConditions: changedParentConditions }, 'BASELINE_ATTESTATION_HASH');
  reject({ ...input, untrustedHandle: {} }, 'ARGUMENTS');
  assert.equal(rejected, 24);
  assert.deepEqual(snapshot(input), before, 'All negative clones leave original operands unchanged');
  t.diagnostic(JSON.stringify({ positive: 1, parts: 673, rejected, syntheticAttestation: true,
    status: 'VALUE_CHECKS_ONLY_NOT_ADMISSION', authenticatedGcm: false, productionAuthority: false }));
});
