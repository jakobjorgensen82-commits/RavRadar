export const TRIP_EVIDENCE_SCHEMA_VERSION = 3;
export const TRIP_SEARCH_COVERAGE = Object.freeze(['partial', 'normal', 'thorough']);
export const TRIP_SEARCH_MODES = Object.freeze(['waders', 'beach']);

import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  ravScoreModelBinding,
} from '../core/ravscore-model-contract.js?v=4.0.308';
import {
  CALIBRATION_NUMERIC_RANGES,
  CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY,
  CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION,
  assertNoSensitiveTripData,
  assertTripObservationNestedPrivacy,
  calibrationFeatureBinding,
  expectedCalibrationEligibility,
  isExactCalibrationModelBinding,
  isPublicEmergencyCalibrationFeatures,
  sameCalibrationModelBinding,
  tripEvidenceIntegrityIssues,
} from './calibration-eligibility.js?v=4.0.308';

export const TRIP_INELIGIBLE_REASON_PUBLIC_EMERGENCY =
  CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY;

const MAX_SEARCH_MINUTES = 24 * 60;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (TRIP_EVIDENCE_SCHEMA_VERSION !== CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION) {
  throw new Error('Tripkontrakten og kalibreringsvalidatoren har forskellig schemaversion.');
}

function requiredId(value, label) {
  const normalized = String(value || '').trim();
  if (!ID_PATTERN.test(normalized)) throw new Error(`${label} mangler eller har ugyldigt format.`);
  return normalized;
}

function requiredUuid(value, label) {
  const normalized = String(value || '').trim();
  if (!UUID_PATTERN.test(normalized)) throw new Error(`${label} skal være en UUID.`);
  return normalized.toLowerCase();
}

function requiredIso(value, label) {
  const time = Date.parse(String(value || ''));
  if (!Number.isFinite(time)) throw new Error(`${label} mangler eller er ugyldigt.`);
  return { time, iso: new Date(time).toISOString() };
}

function optionalGrams(value, found) {
  if (!found || value === '' || value == null) return null;
  const grams = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+(?:[.,]\d+)?$/.test(value.trim())
      ? Number(value.replace(',', '.'))
      : Number.NaN;
  if (!Number.isFinite(grams) || grams < 0 || grams > 10000) {
    throw new Error('Gram skal være et tal mellem 0 og 10000.');
  }
  return Math.round(grams * 10) / 10;
}

function assertChoice(value, allowed, label) {
  const normalized = String(value || '').trim();
  if (!allowed.includes(normalized)) throw new Error(`${label} er ugyldig.`);
  return normalized;
}

function rangedNumber(value, key) {
  if (value == null || value === '') return null;
  const number = typeof value === 'number' ? value : Number.NaN;
  const [minimum, maximum] = CALIBRATION_NUMERIC_RANGES[key];
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new Error(`${key} ligger uden for det tilladte interval.`);
  }
  return number;
}

export function assertTripEvidencePrivacy(value, path = 'tripEvidence') {
  if (value && typeof value === 'object' && !Array.isArray(value)
    && value.gps !== null && value.gps !== undefined) {
    throw new Error(`Præcis position må ikke sendes (${path}.gps).`);
  }
  try {
    return assertNoSensitiveTripData(value, { allowRootOwnerFields: true }, path);
  } catch (error) {
    if (error?.message === 'PRECISE_LOCATION_NOT_ALLOWED') {
      throw new Error(`Præcis position må ikke sendes (${path}).`);
    }
    throw error;
  }
}

export function createForecastSnapshotReference({ manifest = null, conditions = null, id = null, issuedAt = null, validAt = null, capturedAt = null } = {}) {
  const manifestId = String(manifest?.datasetId || '').trim();
  const conditionsId = String(conditions?.datasetId || '').trim();
  if (manifestId && conditionsId && manifestId !== conditionsId) {
    throw new Error('Manifest og prognose tilhører ikke samme datasæt.');
  }
  const captured = requiredIso(capturedAt || new Date().toISOString(), 'Prognosens hentetid');
  const issuedValue = issuedAt
    || conditions?.productionReferenceAt
    || manifest?.productionReferenceAt
    || conditions?.generatedAt
    || manifest?.generatedAt;
  const issued = requiredIso(issuedValue, 'Prognosens udstedelsestid');
  if (issued.time > captured.time) throw new Error('Prognosen kan ikke være udstedt efter den blev hentet.');
  const valid = requiredIso(validAt || captured.iso, 'Prognosens gyldighedstid');
  return Object.freeze({
    id: requiredId(id || conditionsId || manifestId, 'Prognose-id'),
    issuedAt: issued.iso,
    validAt: valid.iso,
    capturedAt: captured.iso
  });
}

export function createCalibrationFeatureSnapshot(input = {}) {
  if (input.modelBinding !== null && input.modelBinding !== undefined
    && !isExactCalibrationModelBinding(input.modelBinding)) {
    throw new Error('RavScore-modelbindingen i turgrundlaget har et ugyldigt eksakt feltsæt.');
  }
  const snapshot = {
    modelVersion: requiredId(input.modelVersion, 'Modelversion'),
    appVersion: requiredId(input.appVersion, 'Appversion')
  };
  const bindingFields = input.modelBinding && typeof input.modelBinding === 'object' && !Array.isArray(input.modelBinding)
    ? {
      modelStateVersion: input.modelBinding.stateSchemaVersion,
      modelVariantId: input.modelBinding.variantId,
      modelProfileId: input.modelBinding.profileId,
      modelComponentSchemaId: input.modelBinding.componentSchemaId,
      modelExplanationSchemaId: input.modelBinding.explanationSchemaId,
      modelRankingPolicyId: input.modelBinding.rankingPolicyId,
      modelBestTimePolicyId: input.modelBinding.bestTimePolicyId,
      modelPresentationPolicyId: input.modelBinding.presentationPolicyId,
      modelContractSha256: input.modelBinding.modelContractSha256,
      modelBundleSha256: input.modelBinding.modelBundleSha256,
    }
    : Object.fromEntries([
      'modelStateVersion','modelVariantId','modelProfileId','modelComponentSchemaId',
      'modelExplanationSchemaId','modelRankingPolicyId','modelBestTimePolicyId','modelPresentationPolicyId',
      'modelContractSha256','modelBundleSha256',
    ].filter(key => input[key] !== undefined).map(key => [key, input[key]]));
  if (Object.keys(bindingFields).length !== 10) throw new Error('RavScore-modelbindingen i turgrundlaget er ufuldstændig.');
  for (const [key, value] of Object.entries(bindingFields)) snapshot[key] = requiredId(value, key);
  if (!SHA256_PATTERN.test(snapshot.modelContractSha256)
    || !SHA256_PATTERN.test(snapshot.modelBundleSha256)) {
    throw new Error('RavScore-modelbindingens hashes er ugyldige.');
  }
  if (input.modelBinding && snapshot.modelVersion !== input.modelBinding.modelId) {
    throw new Error('Modelversionen og RavScore-modelbindingen i turgrundlaget er forskellige.');
  }
  for (const key of Object.keys(CALIBRATION_NUMERIC_RANGES)) snapshot[key] = rangedNumber(input[key], key);
  for (const key of ['totalScore', 'huntabilityScore', 'transportScore', 'mobilisationScore']) {
    if (snapshot[key] == null) throw new Error(`${key} mangler.`);
  }
  snapshot.reasonCodes = Object.freeze((input.reasonCodes || []).map(value => requiredId(value, 'Årsagskode')).slice(0, 12));
  assertTripEvidencePrivacy(snapshot);
  return Object.freeze(snapshot);
}

export function createTripStartRecord(input = {}) {
  const started = requiredIso(input.startedAt, 'Starttid');
  const record = {
    schemaVersion: TRIP_EVIDENCE_SCHEMA_VERSION,
    tripId: requiredUuid(input.tripId, 'Tur-id'),
    startedAt: started.iso,
    mode: assertChoice(input.mode, TRIP_SEARCH_MODES, 'Søgemetode'),
    forecastZoneId: requiredId(input.zoneId, 'Zone ved turstart'),
    forecastCoastalPartId: requiredId(input.coastalPartId, 'Kystdel ved turstart'),
    forecastSnapshot: createForecastSnapshotReference(input.forecastSnapshot || {}),
    calibrationFeatures: createCalibrationFeatureSnapshot(input.calibrationFeatures || {})
  };
  assertTripEvidencePrivacy(record);
  return Object.freeze(record);
}

export function completeTripEvidence(startRecord, completion = {}) {
  if (startRecord?.schemaVersion !== TRIP_EVIDENCE_SCHEMA_VERSION) throw new Error('Turstart mangler den aktuelle kontrakt.');
  return buildTripEvidence({
    tripId: startRecord.tripId,
    startedAt: startRecord.startedAt,
    endedAt: completion.endedAt,
    mode: startRecord.mode,
    zoneId: completion.zoneId,
    coastalPartId: completion.coastalPartId,
    forecastZoneId: startRecord.forecastZoneId,
    forecastCoastalPartId: startRecord.forecastCoastalPartId,
    searchCoverage: completion.searchCoverage,
    found: completion.found,
    grams: completion.grams,
    forecastSnapshot: startRecord.forecastSnapshot,
    calibrationFeatures: startRecord.calibrationFeatures
  });
}

export function buildTripEvidence(input = {}) {
  const started = requiredIso(input.startedAt, 'Starttid');
  const ended = requiredIso(input.endedAt, 'Sluttid');
  if (ended.time <= started.time) throw new Error('Sluttid skal ligge efter starttid.');
  if (ended.time - started.time > MAX_SEARCH_MINUTES * 60000) {
    throw new Error('En søgetur kan højst vare 24 timer.');
  }

  const searchMinutes = Math.max(1, Math.round((ended.time - started.time) / 60000));

  const snapshot = input.forecastSnapshot || {};
  const issued = requiredIso(snapshot.issuedAt, 'Prognosens udstedelsestid');
  const valid = requiredIso(snapshot.validAt, 'Prognosens gyldighedstid');
  const captured = requiredIso(snapshot.capturedAt, 'Prognosens hentetid');
  if (issued.time > captured.time) throw new Error('Prognosen kan ikke være udstedt efter den blev hentet.');
  if (captured.time > started.time + 5 * 60000) {
    throw new Error('Prognosegrundlaget skal være fastholdt ved turens start.');
  }

  if (typeof input.found !== 'boolean') throw new Error('Fund eller intet fund skal angives.');
  const zoneId = requiredId(input.zoneId, 'Zone');
  const coastalPartId = requiredId(input.coastalPartId, 'Kystdel');
  const forecastZoneId = requiredId(input.forecastZoneId || zoneId, 'Zone ved turstart');
  const forecastCoastalPartId = requiredId(input.forecastCoastalPartId || coastalPartId, 'Kystdel ved turstart');
  const calibrationFeatures = createCalibrationFeatureSnapshot(input.calibrationFeatures || {});
  const publicEmergency = isPublicEmergencyCalibrationFeatures(calibrationFeatures);
  const modelEligible = sameCalibrationModelBinding(
    calibrationFeatureBinding(calibrationFeatures),
    ravScoreModelBinding(),
  );
  const evidence = Object.freeze({
    schemaVersion: TRIP_EVIDENCE_SCHEMA_VERSION,
    tripId: requiredUuid(input.tripId, 'Tur-id'),
    tripStartedAt: started.iso,
    tripEndedAt: ended.iso,
    observedAt: new Date(started.time + (ended.time - started.time) / 2).toISOString(),
    searchMinutes,
    searchCoverage: assertChoice(input.searchCoverage, TRIP_SEARCH_COVERAGE, 'Søgegrundighed'),
    mode: assertChoice(input.mode, TRIP_SEARCH_MODES, 'Søgemetode'),
    zoneId,
    coastalPartId,
    forecastZoneId,
    forecastCoastalPartId,
    calibrationEligible: RAVSCORE_CALIBRATION_ELIGIBLE === true
      && modelEligible
      && !publicEmergency
      && zoneId === forecastZoneId
      && coastalPartId === forecastCoastalPartId,
    found: input.found,
    grams: optionalGrams(input.grams, input.found),
    forecastSnapshotId: requiredId(snapshot.id, 'Prognose-id'),
    forecastIssuedAt: issued.iso,
    forecastValidAt: valid.iso,
    forecastCapturedAt: captured.iso,
    calibrationFeatures
  });
  assertTripEvidencePrivacy(evidence);
  return evidence;
}

export function toObservationTripColumns(evidence) {
  if (evidence?.schemaVersion !== TRIP_EVIDENCE_SCHEMA_VERSION) {
    throw new Error('Kun den aktuelle turkontrakt kan gemmes som en ny observation.');
  }
  const columns = {
    schema_version: evidence.schemaVersion,
    trip_id: evidence.tripId,
    trip_started_at: evidence.tripStartedAt,
    trip_ended_at: evidence.tripEndedAt,
    observed_at: evidence.observedAt,
    search_minutes: evidence.searchMinutes,
    search_coverage: evidence.searchCoverage,
    hunt_mode: evidence.mode,
    actual_zone_id: evidence.zoneId,
    actual_coastal_part_id: evidence.coastalPartId,
    forecast_zone_id: evidence.forecastZoneId,
    forecast_coastal_part_id: evidence.forecastCoastalPartId,
    calibration_eligible: evidence.calibrationEligible,
    found: evidence.found,
    result: evidence.found ? 'medium' : 'none',
    grams: evidence.grams,
    forecast_snapshot_id: evidence.forecastSnapshotId,
    forecast_issued_at: evidence.forecastIssuedAt,
    forecast_valid_at: evidence.forecastValidAt,
    forecast_captured_at: evidence.forecastCapturedAt,
    calibration_features: evidence.calibrationFeatures,
    model_version: evidence.calibrationFeatures.modelVersion,
    rav_score: evidence.calibrationFeatures.totalScore,
    weather_snapshot: {
      schemaVersion: 4,
      capturedAt: evidence.forecastCapturedAt,
      forecastSnapshotId: evidence.forecastSnapshotId,
      forecastIssuedAt: evidence.forecastIssuedAt,
      forecastValidAt: evidence.forecastValidAt,
      calibrationFeatures: evidence.calibrationFeatures,
    },
    wind_speed_mps: evidence.calibrationFeatures.windSpeedMs,
    wind_direction_deg: evidence.calibrationFeatures.windDirectionDeg,
    wave_height_m: evidence.calibrationFeatures.waveHeightM,
    wave_period_s: evidence.calibrationFeatures.wavePeriodS,
    water_level_cm: evidence.calibrationFeatures.waterLevelM == null
      ? null
      : Number((evidence.calibrationFeatures.waterLevelM * 100).toFixed(9)),
    current_speed_mps: evidence.calibrationFeatures.currentSpeedMs,
    current_direction_deg: evidence.calibrationFeatures.currentDirectionDeg,
  };
  assertTripObservationNestedPrivacy(columns);
  const issues = tripEvidenceIntegrityIssues(columns);
  if (issues.length) throw new Error(`Turgrundlaget er internt inkonsistent (${issues.join(', ')}).`);
  const publicEmergency = isPublicEmergencyCalibrationFeatures(columns.calibration_features);
  const expectedEligible = RAVSCORE_CALIBRATION_ELIGIBLE === true
    && !publicEmergency
    && expectedCalibrationEligibility(columns, ravScoreModelBinding());
  if (columns.calibration_eligible !== expectedEligible) {
    throw new Error('Turgrundlagets kalibreringsstatus er inkonsistent.');
  }
  return columns;
}
