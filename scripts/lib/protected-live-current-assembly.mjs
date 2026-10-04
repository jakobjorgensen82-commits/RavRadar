import { isDeepStrictEqual } from 'node:util';
import {
  mergeLiveCurrentPilotIntoRecord,
  eligibleStateOnlyCurrentHold as verifiedStateOnlyCurrentHold,
} from './live-current-pilot.mjs';
import {
  verifiedControlledLiveCurrentSource,
  verifiedIntegratedPartHourly,
  eligibleBulkCurrent as verifiedBulkCurrent,
  dmiExpectedIdentityForPart,
} from './ravscore-production-adapters.mjs';
import { originalContextForProtectedDmiCurrent } from './protected-dmi-current-context.mjs';
import { selectQualifiedWeatherComponent } from './weather-component-selection.mjs';
import { exactDmiCurrentProjection, displayedCurrentProvenance }
  from './current-spatial-runtime-proof.mjs';
import { projectExactDmiNativeCurrentToForecast } from './dmi-native-current-runtime-projection.mjs';

const CURRENT_FIELDS = Object.freeze([
  'currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg',
  'currentCoastNormalSpeedMps', 'currentProvenance',
]);
const canonicalTime = value => typeof value === 'string'
  && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

/**
 * Reconcile an independently admitted historical DMI current with the unchanged
 * closure choice before replay selection. Both replay callers supply only
 * contexts already allowed on their own path. PUBLIC uses the separate entry
 * below, which additionally requires its exact active-native artifact row.
 * No closure assignment, native evidence or other weather family is rewritten.
 */
export function mergeProtectedLiveCurrentPilotIntoRecord(
  record, part, document,
  options = {},
) {
  return mergeAdmittedCurrent(record, part, document, options, null);
}

// No caller-supplied donor bank or proof callback can widen PUBLIC authority.
export function mergeActiveNativeLiveCurrentPilotIntoRecord(
  record, part, document,
  { activeBulk = null, bulkId, productionReferenceAt, ...pilotOptions } = {},
) {
  return mergeAdmittedCurrent(record, part, document, {
    ...pilotOptions, currentContexts: [activeBulk], bulkId, productionReferenceAt,
  }, { bulk: activeBulk });
}

function mergeAdmittedCurrent(
  record, part, document,
  { currentContexts = [], bulkId, productionReferenceAt, ...pilotOptions },
  activeNative,
) {
  const merged = mergeLiveCurrentPilotIntoRecord(record, part, document, pilotOptions);
  if (merged === record || !Array.isArray(record?.hourly)
    || !Array.isArray(merged?.hourly)) return merged;
  const originals = new Map();
  const duplicates = new Set();
  for (const row of record.hourly) {
    const time = canonicalTime(row?.time);
    if (!time) continue;
    if (originals.has(time)) duplicates.add(time);
    else originals.set(time, row);
  }
  for (const time of duplicates) originals.delete(time);
  let retainedHours = 0;
  let retainedVectorHours = 0;
  const hourly = merged.hourly.map(candidate => {
    const original = originals.get(canonicalTime(candidate?.time));
    if (!original || candidate === original) return candidate;
    const context = originalContextForProtectedDmiCurrent(
      original, currentContexts, bulkId, part,
    );
    if (!context) return candidate;
    // Recheck the actual vector/projection, not a caller callback or label.
    const primary = verifiedIntegratedPartHourly(
      { ...record, hourly: [original] }, context, bulkId, part,
    )[0];
    if (primary?.currentProvenance?.status !== 'verified'
      || primary.currentProvenance.provider !== 'dmi'
      || primary.currentProvenance.vectorSemanticsVersion !== 3) return candidate;
    if (activeNative) {
      const exact = exactDmiCurrentProjection({
        bulkZone: activeNative.bulk?.zones?.[bulkId], part,
        selectedTime: original.time,
        currentProof: displayedCurrentProvenance(primary.currentProvenance),
        verifyBulkRow: (zone, point, row) => verifiedBulkCurrent(
          activeNative.bulk, zone, point, row?.sources?.current, row?.time,
          dmiExpectedIdentityForPart(part),
        ) ? projectExactDmiNativeCurrentToForecast(row, productionReferenceAt) : null,
      });
      // Exact producer precision and complete source identity (including grid
      // point/native lineage), not merely equal rounded display speed/heading.
      if (!exact || primary.currentUMps !== exact.row.currentUMps
        || primary.currentVMps !== exact.row.currentVMps
        || !isDeepStrictEqual(primary.currentProvenance, exact.source)) return candidate;
    }
    const source = candidate?.currentProvenance;
    const hold = verifiedStateOnlyCurrentHold(source, candidate?.time, part);
    const vectorProof = verifiedControlledLiveCurrentSource(
      source, candidate?.time, part, candidate?.currentUMps, candidate?.currentVMps,
    );
    // A malformed loser stays visible to the unchanged sanitizer/replay.
    if (!hold && !vectorProof) return candidate;
    const candidateProjection = verifiedIntegratedPartHourly(
      { ...merged, hourly: [candidate] }, null, bulkId, part,
    )[0];
    if (candidateProjection?.currentProvenance?.status !== 'verified'
      && !candidateProjection?.currentStateOnlyHold) return candidate;
    let retain = Boolean(hold) || source.provider === 'dmi';
    if (!retain) {
      const options = [
        { source: primary.currentProvenance, nativePrimary: true },
        { source, nativePrimary: false },
      ];
      const admitted = new Map(options.map(option => [option, option.source]));
      retain = selectQualifiedWeatherComponent(options, {
        component: 'current', productionReferenceAt,
        // Both actual sources were admitted above. Use the locked target,
        // never acquisition time or this row's later forecast hour.
        admit: option => admitted.get(option) ?? null,
      })?.candidate?.nativePrimary === true;
    }
    if (!retain) return candidate;
    retainedHours += 1;
    if (vectorProof) retainedVectorHours += 1;
    const retainedSource = original.currentProvenance?.status === 'verified'
      ? original.currentProvenance : original.sources.current;
    const result = {
      ...candidate,
      ...Object.fromEntries(CURRENT_FIELDS.map(key => [key, primary[key]])),
      sources: { ...(candidate.sources ?? {}), current: retainedSource },
    };
    delete result.currentStateOnlyHold;
    return result;
  });
  if (!retainedHours) return merged;
  const completeness = { ...(merged.model?.completeness ?? {}) };
  if (Number.isInteger(completeness.supplementalCurrentHours)) {
    completeness.supplementalCurrentHours = Math.max(0,
      completeness.supplementalCurrentHours - retainedVectorHours);
  }
  const hasLiveCurrent = hourly.some(row => row?.currentProvenance?.controlledLivePilot === true);
  completeness.controlledLiveCurrentPilot = hasLiveCurrent;
  if (!hasLiveCurrent) delete completeness.controlledLiveCurrentPilotMode;
  // This private counter describes final assembly; closure counts stay intact.
  completeness.protectedDmiCurrentRetentionHours = retainedHours;
  return { ...merged, hourly, model: { ...(merged.model ?? {}), completeness } };
}
