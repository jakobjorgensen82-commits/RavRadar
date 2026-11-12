import { SCORING_RESERVE_COMPONENTS, partReserveCalculationInputs, projectSelectedPartReserve } from './ravscore-input-classification.mjs';
export { SCORING_RESERVE_COMPONENTS };
import { calculateIntegratedPartHour } from './ravscore-input-classification.mjs';
import { sanitizeWind, sanitizeWave, sanitizeWaterLevel, sanitizeWaterTemperature } from './ravscore-input-classification.mjs';
import { calculateIntegratedZoneHourlyProjection, RAVSCORE_LOCAL_MARGIN_POINTS } from './ravscore-zone-score-calculation.mjs';
export { RAVSCORE_LOCAL_MARGIN_POINTS };
const INTEGRATED_ZONE_PROJECTION_TEXT = Object.freeze({
  "invalidResult": "RavScore-resultatets kvalitets- eller intervalkontrakt er ugyldig for denne kystdel.",
  "missingInput": "RavScore-datagrundlaget mangler for denne kystdel.",
  "missingExpectedParts": "En eller flere forventede kystdele mangler helt for denne time."
});
import { RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION, RAVSCORE_WAM_MAX_DISTANCE_KM, HOUR_MS, MAXIMUM_DMI_BRACKET_HOURS, MAXIMUM_DMI_EDGE_MINUTES, finite, validTimeMs, nativeTimesCoverRow, exactDmiIdentity, dmiExpectedIdentityForPart, DMI_ORIGINAL_IDENTITY_STRINGS, DMI_ORIGINAL_IDENTITY_KEYS, exactIdentityPoint, dmiOriginalWireIdentityMatchesCentralIdentity, verifiedDmiForecastComponentSource, verifiedDmiNativeComponentSource, eligibleDmiForecastComponentSource, eligibleDmiNativeComponentSource, eligibleBulkCurrent, samePoint, haversineKm, verifiedWamDistance, verifiedBulkCurrent, verifiedControlledLiveCurrentSource } from './ravscore-input-classification.mjs';
export { RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION, RAVSCORE_WAM_MAX_DISTANCE_KM, dmiExpectedIdentityForPart, dmiOriginalWireIdentityMatchesCentralIdentity, verifiedDmiForecastComponentSource, verifiedDmiNativeComponentSource, eligibleDmiForecastComponentSource, eligibleDmiNativeComponentSource, eligibleBulkCurrent, verifiedBulkCurrent, verifiedControlledLiveCurrentSource };
import { coastNormalSpeedMpsFromUv, pythonRoundDmiSamplingCoordinate,
  projectRavScoreAdmittedCurrentVector, calculateRavScoreWaterLevelTrends,
} from './ravscore-physical-calculation.mjs';
export { coastNormalSpeedMpsFromUv, pythonRoundDmiSamplingCoordinate };
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
import {
  RAVSCORE_WEIGHTS,
  ravScoreModelBinding,
} from '../../js/core/ravscore-model-contract.js';
import {
  normalizeDegrees,
  normalizeForecastHourly,
  uvToTowardDirectionDeg,
  verifiedDmiForecastSource,
  verifiedDmiNativeSource,
  assertDmiForecastGridSamplingApplicable,
} from './dmi-forecast-store.mjs';
import {
  assertRegionalSelectedCurrentApplicable,
  stateOnlyCurrentRowForbiddenFields,
  stripStateOnlyCurrentRowProjection,
  eligibleLivePilotSource as verifiedLivePilotSource,
  eligibleStateOnlyCurrentHold as verifiedStateOnlyCurrentHold,
} from './live-current-pilot.mjs';
import { dmiWeatherSourcePrecedesReserves, selectQualifiedWeatherComponent } from './weather-component-selection.mjs';
import { qualifiedWeatherReserveCandidates, selectedWeatherReserveSource } from './weather-reserve-admission.mjs';
import { retainPreviouslySelectedReserve } from './weather-component-selection-history.mjs';
import {
  FEGGESUND_WAVE_PROXY_INPUT_SOURCE,
  FEGGESUND_WAVE_PROXY_NOTICE_ID,
  FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,
  verifyCompactFeggesundWaveProxy,
} from './feggesund-wave-proxy.mjs';

// DMI's documented WAM grids are approximately 1 km (DW) and 5 km (NSB).
// Keep a bounded coastal wet-cell margin without admitting the generic

// Production weather and provenance are JSON numbers, never coercible values.
// Treat booleans, numeric strings, arrays and custom objects as missing so a
// malformed cache cannot accidentally become a zero/current proof.




const round = (value, digits) => Number.isFinite(value)
  ? Number(value.toFixed(digits))
  : null;



/** Exact normal Python round(coordinate, 7), including binary halfway ties.
 * This is a wire-identity formatter only, never a change to central geometry.
 * Decode the input binary64 exactly before rounding the rational to an even
 * scaled integer. Coordinate bounds keep that integer exactly representable.
 */

/**
 * Separate NEW calculation gate, applied after ordinary source/reserve choice.
 * Never use this to sanitize an immutable original, choose a different source,
 * or zero an old memory. Derived proxy/state-only inputs have their own lineage
 * contracts; this gate does not attest or upgrade those contracts.
 */
export function assertDmiPartHourlyGridSamplingApplicable(hourly, bulkId, part,
  { assertRoutedWaterLevelApplicable = null, liveCurrentPilot = null } = {}) {
  const identity = dmiExpectedIdentityForPart(part, bulkId);
  for (const row of hourly) {
    const source = row?.currentProvenance;
    if (assertRegionalSanitizedCurrentApplicable(row, part, liveCurrentPilot, bulkId)) continue;
    if (source?.provider !== 'dmi' || source.status !== 'verified'
      || !['currentUMps', 'currentVMps'].every(field => finite(row?.[field]) !== null)) continue;
    assertDmiForecastGridSamplingApplicable(source, 'current', row.time, identity);
  }
  return hourly;
}









function applyVerifiedPartReserves(row, part, {
  productionReferenceAt, openMeteoComponentIndex = null, copernicusComponentIndex = null,
  componentSelectionHistory = null, scalarPlanningOnly = false,
} = {}) {
  if (!openMeteoComponentIndex && !copernicusComponentIndex) return row;
  let result = row;
  for (const { component, primary, skipPrimary, skipDerived } of partReserveCalculationInputs(
    row, productionReferenceAt, scalarPlanningOnly)) {
    if (skipPrimary) continue;
    const reserves = qualifiedWeatherReserveCandidates({ openMeteoComponentIndex, copernicusComponentIndex }, {
      part, validTime: row.time, component,
    });
    if (!reserves.length) continue;
    // The owner-approved neighbour-wave proxy remains a valid retained input.
    // Reserve gap filling is not permission to replace it with unknown-age data.
    if (skipDerived) continue;
    const candidates = retainPreviouslySelectedReserve([primary, ...reserves].filter(Boolean), componentSelectionHistory,
      { part, time: row.time, component });
    const admitted = new Map(candidates.map(candidate => [candidate, candidate.source]));
    const choice = selectQualifiedWeatherComponent(candidates, {
      component, productionReferenceAt,
      // Primary came through the strict DMI sanitizer above. Reserve is rebuilt
      // from original response bytes by an opaque, validated PART-bank index;
      // arbitrary cache status/provenance flags cannot create this capability.
      admit: candidate => admitted.get(candidate) ?? null,
    });
    if (!choice || choice.candidate.source.provider === 'dmi') continue;
    const reserve = choice.candidate;
    const source = selectedWeatherReserveSource(reserve);
    result = projectSelectedPartReserve(result, component, reserve.values, source);
  }
  // Owner policy: water level and its T+3 difference use DMI only.
  // Current continues through the separately validated operational closure.
  return result;
}

/**
 * The integrated model may consume current only when the exact hourly U/V pair
 * is backed by verified DMI provenance or the separately controlled live pilot.
 */
export function verifiedIntegratedPartHourly(record, bulkCache, bulkId, part, componentInputs = {}) {
  const expectedDmiIdentity = dmiExpectedIdentityForPart(part, bulkId);
  const regionalInputs = new Map();
  const sanitized = normalizeForecastHourly(record?.hourly ?? [], {
    limit: Number.MAX_SAFE_INTEGER,
  }).map(hour => {
    const { row, source, proof } = calculateIntegratedPartHour(hour, bulkCache, bulkId, part);
    if (proof && componentInputs.liveCurrentPilot) {
      try {
        if (assertRegionalSelectedCurrentApplicable(source, hour.time, part,
          hour.currentUMps, hour.currentVMps, componentInputs.liveCurrentPilot)) {
          regionalInputs.set(new Date(hour.time).toISOString(), source);
        }
      } catch (error) {
        // Historical admission preserves original values. Only strict selected
        // NEW use may require this extra qualification; no source reselection.
        if (componentInputs.requireNativeGridSampling === true) throw error;
      }
    }
    return row;
  }).map(row => applyVerifiedPartReserves(row, part, componentInputs));
  const result = calculateRavScoreWaterLevelTrends(sanitized);
  for (const row of result) {
      const source = regionalInputs.get(new Date(row.time).toISOString());
      if (source) {
        const expectedSource = { ...source, status: 'verified', sourceClass: source.sourceClass
          ?? (source.vectorSemanticsVersion === 3 ? 'local-model-grid' : undefined) };
        if (JSON.stringify(row.currentProvenance) !== JSON.stringify(expectedSource)) {
          throw new Error('REGIONAL_SANITIZER_DERIVATION_MISMATCH');
        }
        regionalSanitizedSources.set(row.currentProvenance, { source, document: componentInputs.liveCurrentPilot,
          sourceObject: row.currentProvenance, projection: regionalProjectionSnapshot(row),
          part: regionalPartSnapshot(part) });
      }
    }
  if (componentInputs.requireNativeGridSampling === true) {
    assertDmiPartHourlyGridSamplingApplicable(result, bulkId, part, componentInputs);
  }
  return result;
}

/**
 * Collapse coastal-part results into one public zone/hour result. Missing
 * parts stay explicit, but they do not suppress valid scores from the other
 * parts. The zone/hour is unavailable only when no part has a valid score.
 */
export function buildIntegratedZoneHourlyProjection(options = {}) {
  return calculateIntegratedZoneHourlyProjection(options, INTEGRATED_ZONE_PROJECTION_TEXT);
}

export function buildIntegratedPartPublicProjection({
  row,
  score,
  scoreProfile,
  selectedMode,
  flowPoints,
  flowPointsAt = null,
} = {}) {
  if (!row || typeof selectedMode !== 'function' || !scoreProfile) {
    throw new Error('Integrated part projection requires row, profile and mode selector');
  }
  const ravScoreModel = score?.ravScoreModel ? {
    ...ravScoreModelBinding(),
    weights: RAVSCORE_WEIGHTS,
    scoreImpact: 'active-public',
    automaticActivationAllowed: false,
    publicScoreChanged: scoreProfile.activeProfileId === ravScoreModelBinding().modelId,
    referenceAt: score.ravScoreModel.referenceAt,
    currentReferenceAt: score.ravScoreModel.currentReferenceAt,
    currentTransition: score.ravScoreModel.publicContext?.currentTransition ?? null,
    currentMemoryReady: score.ravScoreModel.currentMemoryReady,
    currentMemoryStatus: score.ravScoreModel.currentMemoryStatus,
    currentMemoryCoverageHours: score.ravScoreModel.currentMemoryCoverageHours,
    currentMemoryWindowHours: score.ravScoreModel.currentMemoryWindowHours,
    waveLastVerifiedAt: score.ravScoreModel.waveLastVerifiedAt,
    waveMemoryReady: score.ravScoreModel.waveMemoryReady,
    waveMemoryStatus: score.ravScoreModel.waveMemoryStatus,
    lastMileWaveReferenceAt: score.ravScoreModel.lastMileWaveReferenceAt,
    lastMileMemoryReady: score.ravScoreModel.lastMileMemoryReady,
    lastMileMemoryStatus: score.ravScoreModel.lastMileMemoryStatus,
    migrationApplied: row.ravScoreState?.migrationApplied === true,
    migrationId: row.ravScoreState?.migrationId ?? null,
    initialStateAccepted: row.ravScoreState?.initialStateAccepted ?? null,
    initialStateSource: row.ravScoreState?.initialStateSource ?? null,
    currentState: score.ravScoreModel.continuationState,
    modes: score.ravScoreModel.modes,
  } : null;
  return {
    zoneId: row.zoneId,
    name: row.name,
    marineCoverage: row.marineCoverage,
    landPoint: row.landPoint,
    waterPoint: row.waterPoint,
    onshoreDirectionDeg: row.onshoreDirectionDeg,
    onshoreDirectionSource: row.onshoreDirectionSource,
    flowPoints,
    // Transport only: these are the already computed per-part results, not a
    // second score calculation or a copy of the zone winner's weather.
    hourly: (row.scores ?? []).map(hour => ({
      time: hour.time,
      weather: hour.weather,
      waders: selectedMode(hour, 'waders'),
      beach: selectedMode(hour, 'beach'),
      flowPoints: typeof flowPointsAt === 'function' ? flowPointsAt(hour.time) : null,
    })),
    current: score ? {
      ...score,
      ravScoreModel: undefined,
      waders: selectedMode(score, 'waders'),
      beach: selectedMode(score, 'beach'),
    } : null,
    ravScoreModel,
  };
}

// Module-private registrations occur ONLY after the actual normal sanitizer.
// This is not an exported row/token registration factory.
const regionalSanitizedSources = new WeakMap();
const regionalPartSnapshot = part => JSON.stringify([part.partId,
  part.zoneId, part.parentZoneId, part.sourceZoneId, part.waterPoint, part.onshoreDirectionDeg]);
const regionalProjectionSnapshot = row => JSON.stringify([row.time, row.currentUMps,
  row.currentVMps, row.currentSpeedMps, row.currentDirectionDeg,
  row.currentCoastNormalSpeedMps, row.currentProvenance]);
export function assertRegionalSanitizedCurrentApplicable(row, part, document, bulkId = 'PART::' + part?.partId) {
  const receipt = regionalSanitizedSources.get(row?.currentProvenance);
  if (!receipt && row?.currentProvenance?.source !== 'dmi-dkss-lf-regional-proxy') return false;
  if (!receipt || bulkId !== 'PART::' + part?.partId || receipt.document !== document || receipt.sourceObject !== row.currentProvenance
    || receipt.projection !== regionalProjectionSnapshot(row) || receipt.part !== regionalPartSnapshot(part)) {
    const error = new Error('REGIONAL_SANITIZER_APPLICATION_UNVERIFIED');
    error.code = 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED';
    error.samplingStatus = 'regional-sanitizer-unqualified';
    throw error;
  }
  return assertRegionalSelectedCurrentApplicable(receipt.source, row.time, part,
    row.currentUMps, row.currentVMps, document);
}
