// A once-only score INPUT view, never a restored generation or admission.
// Original weather remains the separate no-loss baseline. Only an actual
// authenticated, saved/read-back archive can authorize omission of old state.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { assertVerifiedWeatherStateEpochArchive } from './weather-state-epoch-archive.mjs';
import { CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY as OLD }
  from './bounded-conditions-predecessor-transition.mjs';
import { NATIVE_IDENTITY_BINDING_REVIEW as NEW, assertNativeIdentityBindingsFrozen }
  from './native-sampling-identity-successor-source.mjs';
import { PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE }
  from './private-weather-component-inventory.mjs';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding }
  from '../rollback-assets/ravscore-model-contract.js';
import { ravScoreContinuationImplementationSha256 }
  from './ravscore-continuation-implementation-contract.mjs';
import { RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES }
  from './ravscore-recovery-replay.mjs';

const views = new WeakMap();
const SHA = /^[a-f0-9]{64}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => JSON.stringify(value, (_key, item) => object(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const canonicalHash = value => hash(canonical(value));
const same = (left, right) => assert.deepEqual(left, right, 'WEATHER_STATE_EPOCH_INPUT_MISMATCH');
function reject(code) {
  throw Object.assign(new Error('WEATHER_STATE_EPOCH_' + code), { code: 'WEATHER_STATE_EPOCH_' + code });
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function hour(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) reject('TARGET_INVALID');
  return value;
}
function registryFacts(registry) {
  if (!object(registry) || registry.schemaVersion !== 2 || registry.enabled !== true
    || registry.zoneCount !== 210 || registry.partCount !== 673 || !object(registry.zones)
    || Object.keys(registry.zones).length !== 210) reject('REGISTRY_INVALID');
  const ids = [];
  for (const [zoneId, parts] of Object.entries(registry.zones)) {
    if (!zoneId || !Array.isArray(parts) || parts.length === 0) reject('REGISTRY_INVALID');
    for (const part of parts) {
      if (!object(part) || typeof part.partId !== 'string' || !part.partId
        || !Array.isArray(part.waterPoint) || part.waterPoint.length !== 2
        || part.waterPoint.some(value => typeof value !== 'number' || !Number.isFinite(value))
        || Math.abs(part.waterPoint[0]) > 180 || Math.abs(part.waterPoint[1]) > 90) reject('REGISTRY_INVALID');
      ids.push(part.partId);
    }
  }
  if (ids.length !== 673 || new Set(ids).size !== ids.length) reject('REGISTRY_INVALID');
  ids.sort();
  return { registryCanonicalSha256: canonicalHash(registry), partIdsSha256: canonicalHash(ids), ids };
}
function assertOriginal(context) {
  if (!object(context) || !object(context.originalConditions) || !object(context.originalCheckpointPayload)
    || !object(context.originalDescription) || !Number.isSafeInteger(context.checkpointVersion)
    || context.checkpointVersion < 1 || typeof context.archiveId !== 'string' || !context.archiveId
    || !SHA.test(context.archiveCatalogSha256 ?? '') || !context.originalFileDigests) reject('ARCHIVE_INVALID');
  const identity = context.originalDescription;
  if (identity.kind !== OLD.sourceDescriptionKind || identity.schemaVersion !== OLD.sourceDescriptionSchemaVersion
    || identity.expectedZoneCount !== 210 || identity.expectedPartCount !== 673
    || !/^[a-f0-9]{40}$/.test(identity.sourceHead ?? '')
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(identity.datasetId ?? '')
    || !SHA.test(identity.bundleContentSha256 ?? '')) reject('ORIGINAL_IDENTITY_INVALID');
  same(identity.modelBinding, OLD.sourceModelBinding);
  same(identity.contractHashes, OLD.sourceContractHashes);
  same(context.originalConditions.coastalParts?.modelBinding, OLD.sourceModelBinding);
  same(context.originalCheckpointPayload.modelBinding, OLD.sourceModelBinding);
  if (hour(context.originalConditions.productionReferenceAt) !== hour(identity.productionReferenceAt)
    || hour(context.originalCheckpointPayload.productionReferenceAt) !== identity.productionReferenceAt
    || context.originalCheckpointPayload.partCount !== 673) reject('ORIGINAL_IDENTITY_INVALID');
  const pack = context.publicPackReference;
  if (!object(pack) || pack.archivedWithinOriginalBundle !== true
    || pack.relativePath !== PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath
    || !SHA.test(pack.fileSha256 ?? '') || !Number.isSafeInteger(pack.bytes) || pack.bytes <= 0
    || !object(pack.marker)) reject('PUBLIC_ARCHIVE_REQUIRED');
  if (Date.parse(hour(context.targetReferenceAt)) <= Date.parse(identity.productionReferenceAt)) reject('TARGET_NOT_NEWER');
  return context;
}
function emptyMap() {
  const map = new Map();
  const immutable = () => reject('VIEW_MUTATION');
  for (const key of ['set', 'delete', 'clear']) Object.defineProperty(map, key, { value: immutable });
  return Object.freeze(map);
}

/**
 * The archive handle is opaque and comes from actual original authentication,
 * archive SAVE/read-back and original-preservation checks. A serialized marker
 * or caller-provided conditions/checkpoint can never mint this score view.
 * Each process rehydrates the actual archive, then derives the same facts hash.
 */
export async function createWeatherStateEpochInputView(options) {
  if (arguments.length !== 1 || !object(options)
    || Object.keys(options).sort().join(',') !== 'archive,registry,targetReferenceAt') reject('ARGUMENTS_INVALID');
  const { archive, registry, targetReferenceAt } = options;
  // FIRST: no caller marker, binding or source can replace archive authority.
  const context = assertOriginal(assertVerifiedWeatherStateEpochArchive(archive));
  if (hour(targetReferenceAt) !== context.targetReferenceAt) reject('TARGET_MISMATCH');
  const registryProof = registryFacts(registry);
  const originalIds = Object.keys(context.originalConditions.coastalParts?.parts ?? {}).sort();
  same(originalIds, registryProof.ids);
  const reviewed = assertNativeIdentityBindingsFrozen();
  const integrated = ravScoreModelBinding(), candidate = candidateBinding();
  if (integrated.modelBundleSha256 !== reviewed.integrated
    || candidate.modelBundleSha256 !== reviewed.candidate
    || reviewed.integrated !== NEW.integrated || reviewed.candidate !== NEW.candidate
    || await ravScoreContinuationImplementationSha256() !== reviewed.continuation) reject('NEW_BINDING_REQUIRED');
  const facts = freeze({ schemaVersion: 1, kind: 'WEATHER_STATE_EPOCH_INPUT_FACTS',
    admission: 'NO_ADMISSION', archiveId: context.archiveId,
    archiveCatalogSha256: context.archiveCatalogSha256,
    originalFileDigests: structuredClone(context.originalFileDigests),
    originalDescription: structuredClone(context.originalDescription),
    checkpointVersion: context.checkpointVersion,
    targetReferenceAt, modelBinding: { ...integrated }, candidateModelBinding: { ...candidate },
    continuationStateContractSha256: reviewed.continuation,
    registryCanonicalSha256: registryProof.registryCanonicalSha256, partIdsSha256: registryProof.partIdsSha256,
    expectedZoneCount: 210, expectedPartCount: 673,
    initialIntegratedStateCount: 0, initialCandidateStateCount: 0, archivedScoreRecoverySourceCount: 0,
    candidateGBootstrapMode: RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.integratedStateLessRecovery,
    candidateGSourceValidated: false, syntheticHistoryAllowed: false,
    weatherNoLossRequired: true, oldDecoderAllowed: false });
  const checkpoints = Object.freeze({}), priorSources = Object.freeze([]), persisted = emptyMap();
  // Deliberately not an installed/full runtime and not a re-tagged old score.
  // Original weather is retained separately; no old per-part score/state is
  // copied beneath this NEW planner binding.
  const plannerConditions = freeze({ zones: {}, coastalParts: { modelBinding: { ...integrated }, parts: {} } });
  const view = Object.freeze({ kind: 'WEATHER_STATE_EPOCH_INPUT_VIEW', admission: 'NO_ADMISSION',
    targetReferenceAt, facts, viewSha256: canonicalHash(facts), plannerConditions,
    checkpointStates: checkpoints, checkpointCandidateGRollbackStates: checkpoints,
    scoringPreviousCoastalParts: null, scoringCandidateRuntime: null,
    scoringDeployedBulkCache: null, scoringHistoricalDmiBulkCache: null,
    scoringPersistedDmiPartRows: persisted, scoringArchivedRecoverySources: priorSources,
    stateLessRecovery: true,
    candidateGBootstrapMode: facts.candidateGBootstrapMode, candidateGSourceValidated: false,
    weatherContinuityBaseline: context.originalConditions,
    publicPackReference: context.publicPackReference });
  views.set(view, { archive, registry, context, registrySha256: registryProof.registryCanonicalSha256 });
  return view;
}

// This view authorizes NO numeric source. Callers must still pass actual NEW
// acquisition through every normal native/provenance/OWNER guard. In particular
// it does not sanitize an old current, copy a receipt or create a fake hold.
export function assertWeatherStateEpochInputView(view) {
  const stored = view && typeof view === 'object' ? views.get(view) : null;
  if (!stored) reject('UNVERIFIED_VIEW');
  if (assertVerifiedWeatherStateEpochArchive(stored.archive) !== stored.context
    || canonicalHash(stored.registry) !== stored.registrySha256
    || view.scoringPersistedDmiPartRows.size !== 0
    || canonicalHash(view.facts) !== view.viewSha256) reject('VIEW_CHANGED');
  return view;
}

// The actual normal caller must bind its own target and complete central
// registry, not merely trust the registry retained when the view was minted.
export function assertWeatherStateEpochInputViewForTarget(view, options) {
  if (arguments.length !== 2 || !object(options)
    || Object.keys(options).sort().join(',') !== 'registry,targetReferenceAt') reject('ARGUMENTS_INVALID');
  const verified = assertWeatherStateEpochInputView(view);
  if (hour(options.targetReferenceAt) !== verified.targetReferenceAt) reject('TARGET_MISMATCH');
  if (registryFacts(options.registry).registryCanonicalSha256 !== verified.facts.registryCanonicalSha256) {
    reject('REGISTRY_MISMATCH');
  }
  return verified;
}

export function weatherStateEpochInputViewFacts(view) {
  const verified = assertWeatherStateEpochInputView(view);
  return Object.freeze({ facts: verified.facts, viewSha256: verified.viewSha256 });
}
