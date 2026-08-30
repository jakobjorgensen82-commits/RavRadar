import crypto from 'node:crypto';

const finitePoint = point => Array.isArray(point)
  && point.length === 2
  && point.every(value => typeof value === 'number' && Number.isFinite(value));

/**
 * Stable, model-neutral identity for the existing sampling context. The hash
 * may be retained in compact state; the coordinates themselves may not.
 */
export function ravScoreSamplingContextKey(part) {
  if (typeof part?.partId !== 'string' || !part.partId
    || !finitePoint(part?.waterPoint)
    || typeof part?.onshoreDirectionDeg !== 'number'
    || !Number.isFinite(part.onshoreDirectionDeg)
    || part.onshoreDirectionDeg < 0
    || part.onshoreDirectionDeg >= 360) {
    throw new Error('RavScore sampling context is incomplete');
  }
  const context = JSON.stringify({
    partId: part.partId,
    waterPoint: [...part.waterPoint],
    onshoreDirectionDeg: part.onshoreDirectionDeg,
  });
  return `sha256:${crypto.createHash('sha256').update(context).digest('hex')}`;
}
