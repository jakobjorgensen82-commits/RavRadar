import crypto from 'node:crypto';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../../js/core/ravscore-candidate-g-state-pipeline.js';
import { buildIntegratedRavScoreStateSeries } from '../../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_ROLLBACK_ID,
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../../js/core/ravscore-model-contract.js';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';

export const POINT_STAGE_SCHEMA_VERSION = 2;
export const POINT_STAGE_READY = 'ready-for-activation';
export const POINT_STAGE_ACTIVE_STATUSES = new Set(['awaiting-validation', 'activation-requested']);

const FORBIDDEN_STATE_KEY = /^(?:coordinates?|coords?|gridPoint|samplingPoint|waterPoint|landPoint|latitude|longitude|lat|lon|lng|currentUMps|currentVMps|uMps|vMps|eastwardCurrent|northwardCurrent|current-u|current-v)$/i;
const CANDIDATE_G_CONTINUATION_KEYS = Object.freeze([
  'schemaVersion',
  'modelId',
  'variantId',
  'profileId',
  'stateKey',
  'time',
  'transportReferenceAt',
  'transportPotential',
  'outboundEpisodeEffectiveHours',
  'transportMemoryReady',
  'transportMemoryStatus',
  'transportMemoryWindowHours',
  'transportMemoryCoverageHours',
  'transportEvidence',
  'mobilisationPotential',
]);
const INTEGRATED_CONTINUATION_KEYS = Object.freeze([
  'schemaVersion',
  'modelId',
  'variantId',
  'profileId',
  'componentSchemaId',
  'explanationSchemaId',
  'rankingPolicyId',
  'bestTimePolicyId',
  'presentationPolicyId',
  'modelContractSha256',
  'modelBundleSha256',
  'samplingContextKey',
  'time',
  'currentReferenceAt',
  'currentMemoryReady',
  'currentMemoryStatus',
  'currentMemoryWindowHours',
  'currentMemoryCoverageHours',
  'currentEvidence',
  'currentNativeHoldAuthorization',
  'supplyPotential',
  'waveStateSchemaVersion',
  'wavePolicyId',
  'waveLastVerifiedAt',
  'waveMigrationSeedAt',
  'waveMemoryReady',
  'waveMemoryStatus',
  'waveEnergyScore',
  'waveMigrationSeedAwaitingReference',
  'mobilisationPotential',
  'rollbackCandidateGMobilisationPotential',
  'lineage',
]);
const MIGRATION_LINEAGE_KEYS = Object.freeze([
  'migrationId',
  'sourceModelId',
  'sourceStateSchemaVersion',
  'migratedAt',
]);
const COLD_REPLAY_LINEAGE_KEYS = Object.freeze([
  'recoveryId',
  'source',
  'replayedHourCount',
  'targetReferenceAt',
]);

const norm = value => ((Number(value) % 360) + 360) % 360;
const finitePoint = point => Array.isArray(point)
  && point.length === 2
  && point.every(value => typeof value === 'number' && Number.isFinite(value));

export function bearing(waterPoint, landPoint) {
  if (!finitePoint(waterPoint) || !finitePoint(landPoint)) throw new Error('Ugyldigt land-/vandpunkt');
  const [lon1, lat1] = waterPoint.map(value => Number(value) * Math.PI / 180);
  const [lon2, lat2] = landPoint.map(value => Number(value) * Math.PI / 180);
  return Number(norm(Math.atan2(
    Math.sin(lon2 - lon1) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
  ) * 180 / Math.PI).toFixed(1));
}

export function candidateGStateKey(part) {
  if (typeof part?.partId !== 'string' || !part.partId
    || !finitePoint(part?.waterPoint)
    || typeof part?.onshoreDirectionDeg !== 'number'
    || !Number.isFinite(part.onshoreDirectionDeg)
    || part.onshoreDirectionDeg < 0
    || part.onshoreDirectionDeg >= 360) {
    throw new Error('Candidate G state context is incomplete');
  }
  const context = JSON.stringify({
    partId: part.partId,
    waterPoint: part.waterPoint,
    onshoreDirectionDeg: part.onshoreDirectionDeg,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
  });
  return `sha256:${crypto.createHash('sha256').update(context).digest('hex')}`;
}

export function coastalPointStageIdentity(part) {
  return {
    samplingContextKey: ravScoreSamplingContextKey(part),
    expectedCandidateGStateKey: candidateGStateKey(part),
    modelBinding: ravScoreModelBinding(),
  };
}

function assertNoPrivateStateFields(value, path = 'activation state') {
  if (Array.isArray(value)) {
    const coordinateLike = value.length === 2
      && value.every(item => typeof item === 'number' && Number.isFinite(item));
    if (coordinateLike) throw new Error(`${path} contains a coordinate-like pair`);
    value.forEach((item, index) => assertNoPrivateStateFields(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_STATE_KEY.test(key)) throw new Error(`${path} contains forbidden field ${key}`);
    assertNoPrivateStateFields(nested, `${path}.${key}`);
  }
}

function assertExactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) {
    throw new Error(`${label} har ikke den canonical field-allowlist`);
  }
}

export function assertCoastalPointStageModelBinding(binding, label = 'Coastal-point RavScore binding') {
  assertRavScoreModelBinding(binding, label);
  assertExactKeys(binding, Object.keys(ravScoreModelBinding()), label);
  return binding;
}

export function assertIntegratedCoastalPointContinuation(
  state,
  {
    samplingContextKey,
    requireReady = false,
    label = 'Coastal-point RavScore continuation',
  } = {},
) {
  if (typeof samplingContextKey !== 'string' || !samplingContextKey) {
    throw new Error(`${label} mangler canonical sampling context`);
  }
  assertExactKeys(state, INTEGRATED_CONTINUATION_KEYS, label);
  if (!Array.isArray(state.currentEvidence)) throw new Error(`${label} mangler current-evidence`);
  state.currentEvidence.forEach((entry, index) => assertExactKeys(
    entry,
    ['time', 'strength'],
    `${label}.currentEvidence[${index}]`,
  ));
  if (state.currentNativeHoldAuthorization !== null) {
    assertExactKeys(
      state.currentNativeHoldAuthorization,
      ['sourceClass', 'source', 'collection', 'distanceKm'],
      `${label}.currentNativeHoldAuthorization`,
    );
  }
  if (state.lineage !== null) {
    const lineageKeys = Object.keys(state.lineage ?? {}).sort().join('|');
    const migrationKeys = [...MIGRATION_LINEAGE_KEYS].sort().join('|');
    const coldReplayKeys = [...COLD_REPLAY_LINEAGE_KEYS].sort().join('|');
    if (lineageKeys !== migrationKeys && lineageKeys !== coldReplayKeys) {
      throw new Error(`${label}.lineage har ikke en canonical field-allowlist`);
    }
  }
  assertNoPrivateStateFields(state, label);
  const validated = buildIntegratedRavScoreStateSeries([], {
    samplingContextKey,
    initialState: state,
  });
  if (validated.initialStateAccepted !== true || validated.initialStateSource !== 'INTEGRATED_CONTINUATION') {
    throw new Error(`${label} er ikke en canonical schema-4 continuation`);
  }
  if (requireReady) {
    if (state?.currentMemoryReady !== true
      || !RAVSCORE_CURRENT_SUPPLY_POLICY.readyStatuses.includes(state?.currentMemoryStatus)) {
      throw new Error(`${label} mangler READY current-memory`);
    }
    if (state?.waveMemoryReady !== true
      || !RAVSCORE_WAVE_MOBILISATION_POLICY.readyStatuses.includes(state?.waveMemoryStatus)) {
      throw new Error(`${label} mangler READY wave-memory`);
    }
  }
  return state;
}

export function assertCandidateGCoastalPointMigrationInput(
  state,
  expectedStateKey,
  label = 'Candidate G coastal-point migration input',
) {
  const stateKeys = Object.keys(state ?? {}).sort().join('|');
  const canonicalKeys = [...CANDIDATE_G_CONTINUATION_KEYS].sort().join('|');
  const rollbackKeys = [...CANDIDATE_G_CONTINUATION_KEYS, 'rollbackId'].sort().join('|');
  if (stateKeys !== canonicalKeys
    && !(stateKeys === rollbackKeys && state?.rollbackId === RAVSCORE_ROLLBACK_ID)) {
    throw new Error(`${label} har ikke den canonical field-allowlist`);
  }
  if (!Array.isArray(state.transportEvidence)) throw new Error(`${label} mangler transport-evidence`);
  state.transportEvidence.forEach((entry, index) => assertExactKeys(
    entry,
    ['time', 'strength'],
    `${label}.transportEvidence[${index}]`,
  ));
  assertNoPrivateStateFields(state, label);
  if (!state || typeof state !== 'object' || Array.isArray(state)
    || state.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
    || state.modelId !== CANDIDATE_G_STATE_MODEL_ID
    || state.variantId !== CANDIDATE_G_STATE_VARIANT_ID
    || state.profileId !== CANDIDATE_G_STATE_PROFILE_ID
    || state.stateKey !== expectedStateKey) {
    throw new Error(`${label} har inkompatibel model- eller samplingbinding`);
  }
  return state;
}

export function assertCoastalPointActivationStateInjection(
  document,
  label = 'Coastal-point activation-state injection',
) {
  if (!document || typeof document !== 'object' || Array.isArray(document)
    || document.schemaVersion !== POINT_STAGE_SCHEMA_VERSION
    || !document.states || typeof document.states !== 'object' || Array.isArray(document.states)
    || Object.keys(document.states).length < 1) {
    throw new Error(`${label} har inkompatibelt schema`);
  }
  assertExactKeys(
    document,
    ['schemaVersion', 'ravScoreModelBinding', 'preparedAt', 'states'],
    label,
  );
  if (!Number.isFinite(Date.parse(document.preparedAt))) {
    throw new Error(`${label} mangler gyldig preparedAt`);
  }
  assertCoastalPointStageModelBinding(document.ravScoreModelBinding, `${label} model binding`);
  assertNoPrivateStateFields(document, label);
  for (const [partId, state] of Object.entries(document.states)) {
    if (typeof partId !== 'string' || !partId) throw new Error(`${label} indeholder ugyldigt part-id`);
    if (!/^sha256:[a-f0-9]{64}$/.test(state?.samplingContextKey ?? '')) {
      throw new Error(`${label} ${partId} har ugyldig sampling-context-hash`);
    }
    assertIntegratedCoastalPointContinuation(state, {
      samplingContextKey: state?.samplingContextKey,
      requireReady: true,
      label: `${label} ${partId}`,
    });
  }
  return document.states;
}

export function activeOverrides(review = {}) {
  if (review?.activePartOverrides && typeof review.activePartOverrides === 'object') {
    return review.activePartOverrides;
  }
  if (review?.status === 'verified' && review?.partOverrides && typeof review.partOverrides === 'object') {
    return review.partOverrides;
  }
  return {};
}

export function stagedEntries(directionDocument = {}, activePartsDocument = {}) {
  const active = new Map(Object.entries(activePartsDocument?.zones ?? {}).flatMap(([zoneId, parts]) =>
    (parts ?? []).map(part => [part.partId, { zoneId, part }])));
  const entries = [];
  for (const [zoneId, review] of Object.entries(directionDocument?.zones ?? {})) {
    const stage = review?.stagedChange;
    if (!stage || !POINT_STAGE_ACTIVE_STATUSES.has(stage.status) || typeof stage.revision !== 'string') continue;
    for (const [partId, candidate] of Object.entries(stage.partOverrides ?? {})) {
      const current = active.get(partId);
      if (!current || current.zoneId !== zoneId || !finitePoint(candidate?.waterPoint) || !finitePoint(candidate?.landPoint)) continue;
      const part = {
        ...current.part,
        ...candidate,
        partId,
        waterPoint: candidate.waterPoint.map(Number),
        landPoint: candidate.landPoint.map(Number),
      };
      part.onshoreDirectionDeg = bearing(part.waterPoint, part.landPoint);
      const changed = JSON.stringify(part.waterPoint) !== JSON.stringify(current.part.waterPoint)
        || JSON.stringify(part.landPoint) !== JSON.stringify(current.part.landPoint)
        || Math.abs((((part.onshoreDirectionDeg - Number(current.part.onshoreDirectionDeg)) + 180) % 360) - 180) > 0.05;
      if (!changed) continue;
      entries.push({
        stageId: `STAGED::${stage.revision}::${partId}`,
        revision: stage.revision,
        zoneId,
        partId,
        activationRequested: stage.status === 'activation-requested',
        part,
        review,
        stage,
      });
    }
  }
  return entries.sort((left, right) => left.stageId.localeCompare(right.stageId));
}

export function activatedRecoveryEntries(directionDocument = {}, activePartsDocument = {}) {
  const baseline = new Map(Object.entries(activePartsDocument?.zones ?? {}).flatMap(([zoneId, parts]) =>
    (parts ?? []).map(part => [part.partId, { zoneId, part }])));
  const entries = [];
  for (const [zoneId, review] of Object.entries(directionDocument?.zones ?? {})) {
    const activation = review?.lastActivation;
    if (!activation?.revision || !Array.isArray(activation.partIds)) continue;
    const overrides = activeOverrides(review);
    for (const partId of activation.partIds) {
      const current = baseline.get(partId);
      const candidate = overrides[partId];
      if (!current || current.zoneId !== zoneId || !finitePoint(candidate?.waterPoint) || !finitePoint(candidate?.landPoint)) continue;
      const part = { ...current.part, ...candidate, partId };
      part.waterPoint = candidate.waterPoint.map(Number);
      part.landPoint = candidate.landPoint.map(Number);
      part.onshoreDirectionDeg = bearing(part.waterPoint, part.landPoint);
      entries.push({
        stageId: `STAGED::${activation.revision}::${partId}`,
        revision: activation.revision,
        zoneId,
        partId,
        activationRequested: false,
        recoveryOnly: true,
        part,
      });
    }
  }
  return entries.sort((left, right) => left.stageId.localeCompare(right.stageId));
}

export function promotedDirectionDocument(directionDocument, promotions, activatedAt) {
  const output = structuredClone(directionDocument);
  output.schemaVersion = Math.max(3, Number(output.schemaVersion) || 0);
  output.updatedAt = activatedAt;
  const byZone = new Map();
  for (const promotion of promotions) {
    const rows = byZone.get(promotion.zoneId) ?? [];
    rows.push(promotion);
    byZone.set(promotion.zoneId, rows);
  }
  for (const [zoneId, zonePromotions] of byZone) {
    const promotion = zonePromotions[0];
    if (zonePromotions.some(row => row.revision !== promotion.revision)) {
      throw new Error(`${zoneId}: flere samtidige kandidatrevisioner kan ikke aktiveres atomisk`);
    }
    const review = output.zones?.[zoneId];
    const stage = review?.stagedChange;
    if (!review || !stage || stage.revision !== promotion.revision || stage.status !== 'activation-requested') {
      throw new Error(`${promotion.partId}: den centrale kandidat ændrede sig før aktivering`);
    }
    const previousActive = structuredClone(activeOverrides(review));
    const nextActive = { ...previousActive };
    for (const [partId, candidate] of Object.entries(stage.partOverrides ?? {})) {
      nextActive[partId] = { ...structuredClone(candidate), verified: true };
    }
    review.status = 'verified';
    review.rollbackPartOverrides = previousActive;
    review.activePartOverrides = nextActive;
    // Keep the legacy field synchronized while old clients still exist.
    review.partOverrides = structuredClone(nextActive);
    review.stagedChange = null;
    review.activatedAt = activatedAt;
    review.lastActivation = {
      revision: promotion.revision,
      activatedAt,
      partIds: zonePromotions.map(row => row.partId).sort(),
      automaticActivationAllowed: false,
    };
  }
  return output;
}
