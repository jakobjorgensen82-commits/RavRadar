// Private input only. The caller owns the authenticated registry, locked H0
// and the normal pre-score source context. Do not log or upload privateInput.
// READY only binds a direct DKSS selection to its stored endpoints. It does
// not establish nearest wet cell, other providers or national coverage.
import { isDeepStrictEqual } from 'node:util';
import { canonicalForecastHour, inspectDmiNativeGridSampling } from './dmi-forecast-store.mjs';
import { createProtectedDmiNativeCurrentInspector } from './protected-dmi-native-current-proofs.mjs';
import { dmiExpectedIdentityForPart, RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION }
  from './ravscore-production-adapters.mjs';
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';

export function prepareDkssCurrentRawAuditInput({ part, hour, referenceAt, publicBank, publicContexts }) {
  if (typeof referenceAt !== 'string' || canonicalForecastHour(referenceAt) !== referenceAt
    || hour?.time !== referenceAt) return { outcome: 'H0_UNPROVED' };

  const admitted = hour.currentProvenance;
  if (admitted?.status !== 'verified' || admitted.provider !== 'dmi' || admitted.fallback !== false
    || admitted.vectorSemanticsVersion !== RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION
    || admitted.sourceClass !== 'local-model-grid' || hour.currentStateOnlyHold != null
    || !Number.isFinite(hour.currentUMps) || !Number.isFinite(hour.currentVMps)) {
    return { outcome: 'OTHER_OR_MISSING_SOURCE' };
  }
  const selected = hour.sources?.current, identity = dmiExpectedIdentityForPart(part);
  if (!identity || !selected || !isDeepStrictEqual(admitted,
    { ...selected, status: admitted.status, sourceClass: admitted.sourceClass })) {
    return { outcome: 'ACCEPTED_SOURCE_MISMATCH' };
  }
  let proof;
  try {
    proof = createProtectedDmiNativeCurrentInspector({ contexts: publicContexts, previousBank: publicBank })
      .inspectOriginals({ part, row: hour });
  } catch {
    return { outcome: 'ORIGINAL_UNAVAILABLE' };
  }
  if (!proof.ok) return { outcome: 'ORIGINAL_UNAVAILABLE' };
  if (proof.nativeRows.some(row => !canonicalSavedDmiOriginalCapture(row.source))) {
    return { outcome: 'CAPTURE_UNPROVED' };
  }
  if (proof.nativeRows.some(({ source }) => inspectDmiNativeGridSampling(source).status !== 'coherent'
    || source.nativeGridSampling.coordinateInterpretation !== 'dmi-dkss-grib1-header-endpoints-v1')) {
    return { outcome: 'NATIVE_GRID_UNPROVED' };
  }
  // Only the Python comparator may consume this private payload. A READY input
  // means both endpoint contracts were found. No nearest-cell search is made.
  const waterPoint = identity.samplingPoint;
  return {
    outcome: 'READY',
    privateInput: {
      part: { partId: part.partId, zoneId: identity.parentZoneId, waterPoint },
      hour: { time: hour.time, currentUMps: hour.currentUMps, currentVMps: hour.currentVMps,
        currentProvenance: structuredClone(admitted) },
      nativeRows: proof.nativeRows.map(({ time, uMps, vMps, source }) =>
        ({ time, uMps, vMps, source, waterPoint: [...waterPoint] })),
    },
  };
}
