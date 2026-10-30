// Pure VALUE checks for an already-opened ordinary stage. This module neither
// authenticates its inputs nor grants origin, ForPart, restore or publication
// authority. The normal caller must still prove GCM, source and fresh prewrite.
import crypto from 'node:crypto';
import { PRIVATE_CONDITIONS_MAX_BYTES } from './lib/bounded-json-writer.mjs';
import { isDeepStrictEqual } from 'node:util';
import { privateRuntimeBundleContentSha256, PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY as B_POLICY }
  from './private-production-runtime-bundle.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { assertIntegratedCoastalPointContinuation } from './lib/coastal-point-staging-contract.mjs';
import { assertCandidateGRollbackContinuation } from './lib/ravscore-candidate-g-rollback-runtime.mjs';

const SHA = /^[a-f0-9]{64}$/, HEAD = /^[a-f0-9]{40}$/;
const ATTEST = 'privateEstablishedNativeCurrentOrigin';
const KIND = 'PRIVATE_ESTABLISHED_NATIVE_CURRENT_ORIGIN';
const SEMANTIC = 'established-native-current-continuation-v1';
const MAX_CONDITIONS = PRIVATE_CONDITIONS_MAX_BYTES, MAX_ATTEST = 16 * 1024;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const same = isDeepStrictEqual;
const exact = (value, keys) => plain(value) && same(Object.keys(value).sort(), [...keys].sort());
const fail = code => { throw Object.assign(new Error('ORDINARY_STAGE_LINEAGE_' + code),
  { code: 'ORDINARY_STAGE_LINEAGE_' + code }); };
const need = (value, code) => { if (!value) fail(code); };
// Exactly the existing origin canonical/pairs/context formulas, not a new ABI.
const canonical = value => JSON.stringify(value, (_key, nested) => nested && typeof nested === 'object'
  && !Array.isArray(nested) ? Object.fromEntries(Object.keys(nested).sort().map(key => [key, nested[key]])) : nested);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const digest = value => sha(canonical(value));
const hour = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const dataset = value => typeof value === 'string' && /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
// This is the immutable historical origin anchor, not permission to restore or
// replay it. A new ordinary attestation retains this exact normal seed field.
const NORMAL_SEED = Object.freeze({
  datasetId: 'rr-20261016191945-210', referenceAt: '2026-10-16T10:00:00.000Z',
  nativeProducer: '89aec730d17348a95d753f3e2de73aaf5fb0d0f1', producer: 'd897f3eb88239db85389fb798ff5d960a02ed6d4',
  originalB: '1b67b9511d9f6fdd7ff799f85e9d8cc5512c19fa6c9f7d07b4629fa7d64f0efa',
  originalS: '4acbd69b1556ea08c456af78dca902c98354da2ae9cea65d22c9d48ecb67f8b0',
  B: 'f23e9cd98b23fb9613c2d415ac8fb0d3bef583031dfec352546cdbefc47c7ba8',
  S: 'd337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb',
  G: '61297a258de3bd7131c0268d62966cb6eed8463fc886641a07b4e23d071fe503',
  I: '84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3',
  C: '76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8',
  T: 'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f',
  ownerPolicyGitBlob: 'a4f65f8eb0396dbe3c3da442ebcb9a06d99d3287',
});
function hashedAttestation(value, code) {
  need(plain(value) && SHA.test(value.attestationSha256), code);
  const { attestationSha256, ...content } = value;
  need(Buffer.byteLength(canonical(value)) <= MAX_ATTEST && digest(content) === attestationSha256, code);
}
function registryParts(central) {
  need(plain(central) && central.zoneCount === 210 && central.partCount === 673
    && plain(central.zones) && Object.keys(central.zones).length === 210, 'REGISTRY');
  const parts = [];
  for (const [zoneId, values] of Object.entries(central.zones)) {
    need(Array.isArray(values) && values.length > 0, 'REGISTRY');
    for (const part of values) {
      need(plain(part) && typeof part.partId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(part.partId), 'REGISTRY');
      parts.push({ ...part, zoneId });
    }
  }
  need(parts.length === 673 && new Set(parts.map(part => part.partId)).size === 673, 'REGISTRY');
  return new Map(parts.map(part => [part.partId, part]));
}
function pairsFromConditions(conditions, parts, reference, I, C, label) {
  const roots = [conditions.ravScoreCandidateGRollback, conditions.ravScoreCandidateGWarmup].filter(value => value != null);
  need(roots.length === 1 && plain(roots[0].runtime?.parts), label + '_CANDIDATE_ROOT');
  const root = roots[0], integrated = conditions.coastalParts?.parts, candidate = root.runtime.parts;
  const ids = [...parts.keys()].sort();
  need(plain(integrated) && same(Object.keys(integrated).sort(), ids)
    && same(Object.keys(candidate).sort(), ids)
    && conditions.coastalParts.expectedPartCount === 673 && root.runtime.expectedPartCount === 673
    && same(conditions.coastalParts.modelBinding, I) && same(root.sourceModelBinding, I)
    && same(conditions.ravScoreCandidateGRollback != null ? root.rollbackModelBinding : root.candidateModelBinding, C)
    && same(root.runtime.modelBinding, C), label + '_PARTS_MODEL');
  const pairs = new Map();
  for (const [id, part] of parts) {
    const integratedState = integrated[id]?.ravScoreModel?.currentState;
    const candidateState = candidate[id]?.ravScoreModel?.currentState;
    need(integratedState && candidateState && hour(integratedState.time)
      && integratedState.time === candidateState.time && integratedState.time === reference, label + '_PAIR_TIME');
    try {
      assertIntegratedCoastalPointContinuation(integratedState, { samplingContextKey: ravScoreSamplingContextKey(part) });
    } catch { fail(label + '_I_CONTEXT_OR_STATE'); }
    try { assertCandidateGRollbackContinuation(candidateState, part); }
    catch { fail(label + '_G_CONTEXT_OR_STATE'); }
    pairs.set(id, { integrated: structuredClone(integratedState), candidate: structuredClone(candidateState),
      context: integratedState.samplingContextKey });
  }
  return pairs;
}
function pairsDigest(pairs) {
  const hash = crypto.createHash('sha256');
  for (const id of [...pairs.keys()].sort()) hash.update(canonical([id, pairs.get(id)]));
  return hash.digest('hex');
}
const contextDigest = pairs => digest([...pairs].map(([id, pair]) => [id, pair.context])
  .sort(([a], [b]) => a.localeCompare(b)));

export function assertOrdinaryCompletedStageLineage(input) {
  need(arguments.length === 1 && exact(input, ['conditions', 'conditionsPayloadBytes', 'newBManifest', 'originalAADIdentity',
    'baselineBDescriptor', 'baselineConditions', 'baselineCheckpoint', 'centralContract', 'currentModelBinding',
    'currentCandidateBinding', 'currentContractHashes', 'ownerPolicyGitBlob', 'targetReferenceAt']), 'ARGUMENTS');
  const { conditions, conditionsPayloadBytes, newBManifest: B, originalAADIdentity: aad,
    baselineBDescriptor: oldB, baselineConditions: oldConditions, baselineCheckpoint: S, centralContract: central,
    currentModelBinding: I, currentCandidateBinding: C, currentContractHashes: contracts, ownerPolicyGitBlob, targetReferenceAt } = input;
  need(plain(conditions) && plain(oldConditions) && plain(B) && plain(oldB) && plain(S), 'VALUES');
  need(exact(aad, ['repository', 'runId', 'runAttempt', 'sourceHead'])
    && typeof aad.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(aad.repository)
    && ['runId', 'runAttempt'].every(key => typeof aad[key] === 'string' && /^[1-9][0-9]*$/.test(aad[key]))
    && HEAD.test(aad.sourceHead), 'AAD_IDENTITY');
  need(same(I, ravScoreModelBinding()) && same(C, candidateBinding()) && HEAD.test(ownerPolicyGitBlob)
    && exact(contracts, B_POLICY.requiredContractHashKeys) && Object.values(contracts).every(value => SHA.test(value)), 'CURRENT_MODEL');
  need(B.schemaVersion === B_POLICY.schemaVersion && B.kind === B_POLICY.kind && B.privacyClass === B_POLICY.privacyClass
    && B.zoneCount === 210 && B.partCount === 673 && Array.isArray(B.files)
    && B.files.length > 0 && B.files.length <= 32 && B.fileCount === B.files.length
    && SHA.test(B.bundleContentSha256) && privateRuntimeBundleContentSha256(B) === B.bundleContentSha256, 'NEW_B_MANIFEST');
  need(same(B.modelBinding, I) && same(oldB.modelBinding, I) && same(S.modelBinding, I)
    && same(B.contractHashes, contracts) && same(oldB.contractHashes, contracts)
    && S.continuationStateContractSha256 === contracts.continuationStateContractSha256, 'B_S_MODEL');
  need(hour(targetReferenceAt) && conditions.productionReferenceAt === targetReferenceAt && B.productionReferenceAt === targetReferenceAt
    && dataset(conditions.datasetId) && conditions.datasetId === B.datasetId
    && time(conditions.generatedAt) && conditions.generatedAt === B.generatedAt
    && hour(oldB.productionReferenceAt) && oldConditions.productionReferenceAt === oldB.productionReferenceAt
    && oldConditions.datasetId === oldB.datasetId && oldConditions.generatedAt === oldB.generatedAt
    && dataset(oldB.datasetId) && time(oldB.generatedAt) && Date.parse(targetReferenceAt) > Date.parse(oldB.productionReferenceAt), 'IDENTITY_OR_REFERENCE');
  const files = B.files.filter(file => file?.id === 'full-conditions' || file?.relativePath === 'data/live/conditions.json');
  need(files.length === 1 && exact(files[0], ['id', 'relativePath', 'bytes', 'sha256', 'privacyClass'])
    && files[0].id === 'full-conditions' && files[0].relativePath === 'data/live/conditions.json'
    && files[0].privacyClass === B_POLICY.privacyClass && SHA.test(files[0].sha256)
    && conditionsPayloadBytes instanceof Uint8Array && conditionsPayloadBytes.byteLength > 0
    && conditionsPayloadBytes.byteLength <= MAX_CONDITIONS && files[0].bytes === conditionsPayloadBytes.byteLength
    && sha(conditionsPayloadBytes) === files[0].sha256, 'CONDITIONS_PAYLOAD_HASH');
  try {
    const bytes = Buffer.from(conditionsPayloadBytes), text = bytes.toString('utf8');
    need(Buffer.from(text, 'utf8').equals(bytes) && same(JSON.parse(text), conditions), 'CONDITIONS_PAYLOAD_VALUE');
  } catch { fail('CONDITIONS_PAYLOAD_VALUE'); }
  const attest = conditions[ATTEST], oldAttest = oldConditions[ATTEST];
  hashedAttestation(attest, 'ATTESTATION_HASH');
  need(exact(attest, ['schemaVersion', 'kind', 'semanticContract', 'seed', 'parent', 'producer', 'datasetId',
    'referenceAt', 'registrySha256', 'contextRegistrySha256', 'pairsSha256', 'transition', 'attestationSha256'])
    && attest.schemaVersion === 1 && attest.kind === KIND && attest.semanticContract === SEMANTIC
    && same(attest.seed, NORMAL_SEED) && attest.transition === 'NORMAL_STRICT_CONTINUATION', 'NORMAL_TRANSITION');
  hashedAttestation(oldAttest, 'BASELINE_ATTESTATION_HASH');
  need(oldAttest.schemaVersion === 1 && oldAttest.semanticContract === SEMANTIC
    && [KIND, 'PRIVATE_ARCHIVE_ISOLATED_NATIVE_CURRENT_ORIGIN'].includes(oldAttest.kind)
    && oldAttest.datasetId === oldB.datasetId && oldAttest.referenceAt === oldB.productionReferenceAt, 'BASELINE_ATTESTATION');
  need(exact(attest.parent, ['bundleContentSha256', 'generationSha256', 'attestationSha256'])
    && SHA.test(oldB.bundleContentSha256) && SHA.test(S.generationSha256)
    && attest.parent.bundleContentSha256 === oldB.bundleContentSha256
    && attest.parent.generationSha256 === S.generationSha256
    && attest.parent.attestationSha256 === oldAttest.attestationSha256, 'EXACT_PARENT');
  need(exact(attest.producer, ['sourceHead', 'semanticContract', 'integrated', 'candidate', 'continuation', 'ownerPolicyGitBlob'])
    && same(attest.producer, { sourceHead: aad.sourceHead, semanticContract: SEMANTIC, integrated: I.modelBundleSha256,
      candidate: C.modelBundleSha256, continuation: contracts.continuationStateContractSha256, ownerPolicyGitBlob })
    && attest.datasetId === B.datasetId && attest.referenceAt === targetReferenceAt, 'PRODUCER');
  const parts = registryParts(central), zoneIds = Object.keys(central.zones).sort();
  for (const value of [conditions, oldConditions])
    need(plain(value.zones) && same(Object.keys(value.zones).sort(), zoneIds), 'CONDITIONS_ZONES');
  const registrySha256 = digest(central);
  need(attest.registrySha256 === registrySha256 && oldAttest.registrySha256 === registrySha256, 'REGISTRY_HASH');
  const oldPairs = pairsFromConditions(oldConditions, parts, oldB.productionReferenceAt, I, C, 'BASELINE');
  const pairs = pairsFromConditions(conditions, parts, targetReferenceAt, I, C, 'NEW');
  const contextSha256 = contextDigest(pairs), pairSha256 = pairsDigest(pairs);
  need(contextSha256 === contextDigest(oldPairs) && attest.contextRegistrySha256 === contextSha256
    && oldAttest.contextRegistrySha256 === contextDigest(oldPairs), 'CONTEXT_REGISTRY_HASH');
  need(attest.pairsSha256 === pairSha256 && oldAttest.pairsSha256 === pairsDigest(oldPairs), 'PAIRS_HASH');
  const companion = S.candidateGRollbackCompanion, ids = [...parts.keys()].sort();
  need(S.datasetId === oldB.datasetId && S.productionReferenceAt === oldB.productionReferenceAt && S.partCount === 673
    && plain(S.states) && same(Object.keys(S.states).sort(), ids) && plain(companion?.states)
    && same(Object.keys(companion.states).sort(), ids) && companion.partCount === 673
    && companion.datasetId === S.datasetId && companion.productionReferenceAt === S.productionReferenceAt
    && companion.generationSha256 === S.generationSha256 && same(companion.modelBinding, C), 'BASELINE_S');
  for (const [id, pair] of oldPairs)
    need(same(pair.integrated, S.states[id]) && same(pair.candidate, companion.states[id]), 'BASELINE_B_S_PAIRS');
  return Object.freeze({ status: 'VALUE_CHECKS_ONLY_NOT_ADMISSION', zoneCount: 210, partCount: 673,
    bundleContentSha256: B.bundleContentSha256, baselineGenerationSha256: S.generationSha256,
    attestationSha256: attest.attestationSha256, contextRegistrySha256: contextSha256, pairsSha256: pairSha256 });
}
