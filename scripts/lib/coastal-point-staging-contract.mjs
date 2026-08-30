import crypto from 'node:crypto';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../../js/core/ravscore-candidate-g-state-pipeline.js';

export const POINT_STAGE_SCHEMA_VERSION = 1;
export const POINT_STAGE_READY = 'ready-for-activation';
export const POINT_STAGE_ACTIVE_STATUSES = new Set(['awaiting-validation', 'activation-requested']);

const norm = value => ((Number(value) % 360) + 360) % 360;
const finitePoint = point => Array.isArray(point)
  && point.length === 2
  && point.every(value => Number.isFinite(Number(value)));

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
