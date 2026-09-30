import { normalizeForecastHourly } from './dmi-forecast-store.mjs';
import {
  dmiExpectedIdentityForPart,
  verifiedBulkCurrent,
  verifiedIntegratedPartHourly,
} from './ravscore-production-adapters.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const CURRENT_FIELDS = Object.freeze([
  'currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg',
  'currentCoastNormalSpeedMps', 'currentProvenance',
]);

/**
 * Contexts must be the caller's authenticated, original protected documents.
 * This helper does not manufacture a header or admit a source from a label.
 * It reuses the unchanged current verifier for the exact row and central PART.
 */
export function originalContextForProtectedDmiCurrent(row, contexts, bulkId, part) {
  if (!finite(row?.currentUMps) || !finite(row?.currentVMps)
    || !Array.isArray(contexts)) return null;
  const source = row?.currentProvenance?.status === 'verified'
    ? row.currentProvenance : row?.sources?.current;
  const identity = dmiExpectedIdentityForPart(part, bulkId);
  if (!identity) return null;
  return contexts.find(context => context && verifiedBulkCurrent(
    context, context?.zones?.[bulkId], part?.waterPoint, source, row?.time, identity,
  )) ?? null;
}

/**
 * Keep the ordinary full-row sanitizer, reserve selection and T/T+3 trend
 * calculation unchanged. Only a missing current projection may be recovered
 * from another real protected context. Persisted rows without any matching
 * original context remain unverified. Native collection/depth selection is
 * deliberately not performed here.
 */
export function verifiedProtectedDmiPartHourly(
  record, contexts, bulkId, part, componentInputs = {},
) {
  const protectedContexts = Array.isArray(contexts) ? contexts : [];
  const hourly = normalizeForecastHourly(record?.hourly ?? [], {
    limit: Number.MAX_SAFE_INTEGER,
  });
  const normalizedRecord = { ...record, hourly };
  const primary = protectedContexts[0] ?? null;
  const projection = verifiedIntegratedPartHourly(
    normalizedRecord, primary, bulkId, part, componentInputs,
  );
  const originalByTime = new Map(hourly.map(row => [row.time, row]));
  return projection.map(row => {
    if (row.currentProvenance?.status === 'verified' || row.currentStateOnlyHold) return row;
    const original = originalByTime.get(row.time);
    const context = originalContextForProtectedDmiCurrent(
      original, protectedContexts.filter(candidate => candidate !== primary), bulkId, part,
    );
    if (!context) return row;
    // Never sanitize groups separately: that would lose a T+3 water-level
    // counterpart in another group. This isolated result contributes current
    // only; all other fields stay exactly as the full projection produced them.
    const admitted = verifiedIntegratedPartHourly(
      { ...record, hourly: [original] }, context, bulkId, part,
    )[0];
    if (admitted?.currentProvenance?.status !== 'verified') return row;
    return { ...row, ...Object.fromEntries(CURRENT_FIELDS.map(key => [key, admitted[key]])) };
  });
}
