export const TRIP_EVIDENCE_SCHEMA_VERSION = 3;
export const TRIP_SEARCH_COVERAGE = Object.freeze(['partial', 'normal', 'thorough']);
export const TRIP_SEARCH_MODES = Object.freeze(['waders', 'beach']);

import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  ravScoreModelBinding,
} from '../core/ravscore-model-contract.js?v=4.0.319';
import {
  CALIBRATION_NUMERIC_RANGES,
  CALIBRATION_INELIGIBLE_REASON_HISTORY_INCOMPLETE,
  CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY,
  CALIBRATION_INELIGIBLE_REASON_RECONSTRUCTED,
  CALIBRATION_INELIGIBLE_REASON_UNATTESTED,
  CALIBRATION_INELIGIBLE_REASON_GLOBAL_WARMUP_LOCK,
  CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION,
  TRIP_NON_CALIBRATION_QUALITY_FLAGS,
  assertCalibrationScoreQualityContract,
  assertNoSensitiveTripData,
  assertTripDataQualityFlags,
  assertTripObservationNestedPrivacy,
  calibrationFeatureBinding,
  expectedCalibrationEligibility,
  isExactCalibrationModelBinding,
  sameCalibrationModelBinding,
  tripEvidenceIntegrityIssues,
} from './calibration-eligibility.js?v=4.0.319';

export const LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION = 2;
export const RECONSTRUCTED_RAVSCORE_QUALITY_FLAG =
  CALIBRATION_INELIGIBLE_REASON_RECONSTRUCTED;
export const PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG =
  CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY;
export const HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG =
  CALIBRATION_INELIGIBLE_REASON_HISTORY_INCOMPLETE;
export const UNATTESTED_RAVSCORE_QUALITY_FLAG =
  CALIBRATION_INELIGIBLE_REASON_UNATTESTED;
export const GLOBAL_WARMUP_CALIBRATION_LOCK_REASON =
  CALIBRATION_INELIGIBLE_REASON_GLOBAL_WARMUP_LOCK;
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

function normalizeTripQualityFlags(value) {
  if (!Array.isArray(value)) throw new Error('Datakvalitetsflag skal være en liste.');
  try {
    assertTripDataQualityFlags(value);
  } catch {
    throw new Error('Datakvalitetsflag er ukendt eller ikke-kanonisk.');
  }
  const flags = value.map(entry => requiredId(entry, 'Datakvalitetsflag'));
  if (flags.some(flag => !TRIP_NON_CALIBRATION_QUALITY_FLAGS.includes(flag))) {
    throw new Error('Turen indeholder et datakvalitetsflag, som ikke hører til en prognosetur.');
  }
  return Object.freeze(flags);
}

function assertTripQualityReasonBinding(flags, reasonCodes) {
  if (!Array.isArray(reasonCodes)) throw new Error('Kalibreringsgrundlaget mangler årsagskoder.');
  const qualityReasons = reasonCodes.filter(code => TRIP_NON_CALIBRATION_QUALITY_FLAGS.includes(code));
  if (JSON.stringify(qualityReasons) !== JSON.stringify(flags)) {
    throw new Error('Datakvalitetsflag og kalibreringsgrundlag er ikke entydigt bundet sammen.');
  }
}

export function assertTripForecastQualityBinding({
  dataQualityFlags,
  reasonCodes,
  forecastCalibrationEligible,
  scoreCalibrationEligible,
} = {}) {
  const flags = normalizeTripQualityFlags(dataQualityFlags);
  assertTripQualityReasonBinding(flags, reasonCodes);
  if (typeof forecastCalibrationEligible !== 'boolean'
    || typeof scoreCalibrationEligible !== 'boolean') {
    throw new Error('Prognosen mangler eksplicit kalibreringsstatus.');
  }
  if (forecastCalibrationEligible === true && scoreCalibrationEligible !== true) {
    throw new Error('En inputlåst RavScore må ikke åbne turen for kalibrering.');
  }
  if (flags.length > 0 && forecastCalibrationEligible !== false) {
    throw new Error('Nød-, historikufuldstændig, rekonstrueret eller uattesteret RavScore skal være udelukket fra kalibrering.');
  }
  if (flags.length === 0 && RAVSCORE_CALIBRATION_ELIGIBLE === true
    && forecastCalibrationEligible === false
    && scoreCalibrationEligible === true
    && !reasonCodes.includes(GLOBAL_WARMUP_CALIBRATION_LOCK_REASON)) {
    throw new Error('En verificeret aktiv RavScore-prognose må ikke være udelukket fra kalibrering uden en årsag.');
  }
  return flags;
}

export function assertObservationTripQualityBinding(columns = {}) {
  if (![LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION, TRIP_EVIDENCE_SCHEMA_VERSION]
    .includes(columns?.schema_version)) {
    throw new Error('Kun en kendt turkontrakt kan kvalitetskontrolleres.');
  }
  const flags = normalizeTripQualityFlags(columns.data_quality_flags);
  assertTripQualityReasonBinding(flags, columns.calibration_features?.reasonCodes);
  const sameForecastContext = String(columns.actual_zone_id || '') === String(columns.forecast_zone_id || '')
    && String(columns.actual_coastal_part_id || '') === String(columns.forecast_coastal_part_id || '');
  const expectedEligibility = columns.schema_version === LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION
    ? sameForecastContext && flags.length === 0
    : RAVSCORE_CALIBRATION_ELIGIBLE === true
      && flags.length === 0
      && expectedCalibrationEligibility(columns, ravScoreModelBinding());
  if (columns.calibration_eligible !== expectedEligibility) {
    throw new Error('Turens kalibreringsstatus matcher ikke prognosebindingen og datakvaliteten.');
  }
  return flags;
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
  for (const key of [
    'totalScore','scoreBoundLower','scoreBoundUpper','scoreBoundModelUncertaintyPoints',
    'scoreBoundRawLower','scoreBoundRawUpper','historyCoverageHours',
    'huntabilityScore','transportScore','mobilisationScore',
  ]) {
    if (snapshot[key] == null) throw new Error(`${key} mangler.`);
  }
  snapshot.scoreQuality=requiredId(input.scoreQuality,'Scorekvalitet');
  snapshot.scoreSemantics=requiredId(input.scoreSemantics,'Scoresemantik');
  if(typeof input.scoreCalibrationEligible!=='boolean'
    ||typeof input.conservativeTailResetApplied!=='boolean'){
    throw new Error('Scorekvaliteten mangler eksplicit kalibrerings- eller tail-reset-status.');
  }
  snapshot.scoreCalibrationEligible=input.scoreCalibrationEligible;
  snapshot.conservativeTailResetApplied=input.conservativeTailResetApplied;
  if(!Array.isArray(input.historyReasonCodes)
    ||input.historyReasonCodes.length>12){
    throw new Error('Historikårsagskoder mangler eller er ugyldige.');
  }
  snapshot.historyReasonCodes=Object.freeze(input.historyReasonCodes
    .map(value=>requiredId(value,'Historikårsagskode')));
  snapshot.reasonCodes = Object.freeze((input.reasonCodes || []).map(value => requiredId(value, 'Årsagskode')).slice(0, 12));
  assertCalibrationScoreQualityContract(snapshot);
  assertTripEvidencePrivacy(snapshot);
  return Object.freeze(snapshot);
}

function unattestedCalibrationFeatures(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const reasons = Array.isArray(source.reasonCodes)
    ? source.reasonCodes.filter(reason => reason !== UNATTESTED_RAVSCORE_QUALITY_FLAG).slice(0, 11)
    : [];
  const features = Object.freeze({
    ...source,
    reasonCodes: Object.freeze([...reasons, UNATTESTED_RAVSCORE_QUALITY_FLAG])
  });
  assertTripEvidencePrivacy(features);
  return features;
}

function legacyObservationColumns(evidence) {
  return {
    schema_version: LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION,
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
    data_quality_flags: evidence.dataQualityFlags
  };
}

export function migrateLegacyUnattestedTripStart(record) {
  if (record?.schemaVersion !== LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION) return record;
  const hasEligibility = Object.hasOwn(record, 'forecastCalibrationEligible');
  const hasFlags = Object.hasOwn(record, 'dataQualityFlags');
  if (hasEligibility !== hasFlags) throw new Error('Den aktive tur har en ufuldstændig evidenstillidsbinding.');
  if (hasEligibility) {
    assertTripForecastQualityBinding({
      dataQualityFlags: record.dataQualityFlags,
      reasonCodes: record.calibrationFeatures?.reasonCodes,
      forecastCalibrationEligible: record.forecastCalibrationEligible,
      scoreCalibrationEligible: record.calibrationFeatures?.scoreCalibrationEligible,
    });
    return record;
  }
  const migrated = Object.freeze({
    ...record,
    calibrationFeatures: unattestedCalibrationFeatures(record.calibrationFeatures),
    forecastCalibrationEligible: false,
    dataQualityFlags: Object.freeze([UNATTESTED_RAVSCORE_QUALITY_FLAG])
  });
  assertTripEvidencePrivacy(migrated);
  return migrated;
}

export function migrateLegacyUnattestedTripEvidence(record) {
  if (record?.schemaVersion !== LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION) return record;
  if (Object.hasOwn(record, 'dataQualityFlags')) {
    assertObservationTripQualityBinding(legacyObservationColumns(record));
    return record;
  }
  const migrated = Object.freeze({
    ...record,
    calibrationEligible: false,
    dataQualityFlags: Object.freeze([UNATTESTED_RAVSCORE_QUALITY_FLAG]),
    calibrationFeatures: unattestedCalibrationFeatures(record.calibrationFeatures)
  });
  assertTripEvidencePrivacy(migrated);
  return migrated;
}

export function migrateLegacyUnattestedObservationColumns(columns) {
  if (columns?.schema_version !== LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION) return columns;
  if (Object.hasOwn(columns, 'data_quality_flags')) {
    assertObservationTripQualityBinding(columns);
    return columns;
  }
  const calibrationFeatures = unattestedCalibrationFeatures(columns.calibration_features);
  const migrated = Object.freeze({
    ...columns,
    calibration_eligible: false,
    data_quality_flags: Object.freeze([UNATTESTED_RAVSCORE_QUALITY_FLAG]),
    calibration_features: calibrationFeatures,
    weather_snapshot: columns?.weather_snapshot && typeof columns.weather_snapshot === 'object'
      ? { ...columns.weather_snapshot, calibrationFeatures }
      : columns?.weather_snapshot
  });
  assertObservationTripQualityBinding(migrated);
  assertTripEvidencePrivacy(migrated);
  return migrated;
}

export function createTripStartRecord(input = {}) {
  const started = requiredIso(input.startedAt, 'Starttid');
  const calibrationFeatures = createCalibrationFeatureSnapshot(input.calibrationFeatures || {});
  const bindingEligible = RAVSCORE_CALIBRATION_ELIGIBLE === true
    && sameCalibrationModelBinding(calibrationFeatureBinding(calibrationFeatures), ravScoreModelBinding());
  const dataQualityFlags = assertTripForecastQualityBinding({
    dataQualityFlags: input.dataQualityFlags,
    reasonCodes: calibrationFeatures.reasonCodes,
    forecastCalibrationEligible: input.forecastCalibrationEligible,
    scoreCalibrationEligible: calibrationFeatures.scoreCalibrationEligible,
  });
  const globalWarmupLocked = calibrationFeatures.reasonCodes
    .includes(GLOBAL_WARMUP_CALIBRATION_LOCK_REASON);
  const expectedForecastEligibility = bindingEligible
    && calibrationFeatures.scoreCalibrationEligible === true
    && dataQualityFlags.length === 0
    && !globalWarmupLocked;
  if (input.forecastCalibrationEligible !== expectedForecastEligibility) {
    throw new Error('Turstartens kalibreringsstatus matcher ikke den eksakte RavScore-modelbinding.');
  }
  const record = {
    schemaVersion: TRIP_EVIDENCE_SCHEMA_VERSION,
    tripId: requiredUuid(input.tripId, 'Tur-id'),
    startedAt: started.iso,
    mode: assertChoice(input.mode, TRIP_SEARCH_MODES, 'Søgemetode'),
    forecastZoneId: requiredId(input.zoneId, 'Zone ved turstart'),
    forecastCoastalPartId: requiredId(input.coastalPartId, 'Kystdel ved turstart'),
    forecastSnapshot: createForecastSnapshotReference(input.forecastSnapshot || {}),
    calibrationFeatures,
    forecastCalibrationEligible: expectedForecastEligibility,
    dataQualityFlags
  };
  assertTripEvidencePrivacy(record);
  return Object.freeze(record);
}

export function completeTripEvidence(startRecord, completion = {}) {
  if (startRecord?.schemaVersion === LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION) {
    const trustedStart = migrateLegacyUnattestedTripStart(startRecord);
    const started = requiredIso(trustedStart.startedAt, 'Starttid');
    const ended = requiredIso(completion.endedAt, 'Sluttid');
    if (ended.time <= started.time || ended.time - started.time > MAX_SEARCH_MINUTES * 60000) {
      throw new Error('Den historiske tur har en ugyldig varighed.');
    }
    const zoneId = requiredId(completion.zoneId, 'Zone');
    const coastalPartId = requiredId(completion.coastalPartId, 'Kystdel');
    if (typeof completion.found !== 'boolean') throw new Error('Fund eller intet fund skal angives.');
    const evidence = Object.freeze({
      schemaVersion: LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION,
      tripId: requiredUuid(trustedStart.tripId, 'Tur-id'),
      tripStartedAt: started.iso,
      tripEndedAt: ended.iso,
      observedAt: new Date(started.time + (ended.time - started.time) / 2).toISOString(),
      searchMinutes: Math.max(1, Math.round((ended.time - started.time) / 60000)),
      searchCoverage: assertChoice(completion.searchCoverage, TRIP_SEARCH_COVERAGE, 'Søgegrundighed'),
      mode: assertChoice(trustedStart.mode, TRIP_SEARCH_MODES, 'Søgemetode'),
      zoneId,
      coastalPartId,
      forecastZoneId: requiredId(trustedStart.forecastZoneId, 'Zone ved turstart'),
      forecastCoastalPartId: requiredId(trustedStart.forecastCoastalPartId, 'Kystdel ved turstart'),
      calibrationEligible: false,
      dataQualityFlags: trustedStart.dataQualityFlags,
      found: completion.found,
      grams: optionalGrams(completion.grams, completion.found),
      forecastSnapshotId: requiredId(trustedStart.forecastSnapshot?.id, 'Prognose-id'),
      forecastIssuedAt: requiredIso(trustedStart.forecastSnapshot?.issuedAt, 'Prognosens udstedelsestid').iso,
      forecastValidAt: requiredIso(trustedStart.forecastSnapshot?.validAt, 'Prognosens gyldighedstid').iso,
      forecastCapturedAt: requiredIso(trustedStart.forecastSnapshot?.capturedAt, 'Prognosens hentetid').iso,
      calibrationFeatures: trustedStart.calibrationFeatures
    });
    assertTripEvidencePrivacy(evidence);
    return evidence;
  }
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
    calibrationFeatures: startRecord.calibrationFeatures,
    forecastCalibrationEligible: startRecord.forecastCalibrationEligible,
    dataQualityFlags: startRecord.dataQualityFlags
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
  const dataQualityFlags = assertTripForecastQualityBinding({
    dataQualityFlags: input.dataQualityFlags,
    reasonCodes: calibrationFeatures.reasonCodes,
    forecastCalibrationEligible: input.forecastCalibrationEligible,
    scoreCalibrationEligible: calibrationFeatures.scoreCalibrationEligible,
  });
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
    calibrationEligible: input.forecastCalibrationEligible === true
      && RAVSCORE_CALIBRATION_ELIGIBLE === true
      && calibrationFeatures.scoreCalibrationEligible === true
      && modelEligible
      && dataQualityFlags.length === 0
      && zoneId === forecastZoneId
      && coastalPartId === forecastCoastalPartId,
    dataQualityFlags,
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
  if (evidence?.schemaVersion === LEGACY_TRIP_EVIDENCE_SCHEMA_VERSION) {
    const migrated = migrateLegacyUnattestedTripEvidence(evidence);
    const columns = legacyObservationColumns(migrated);
    assertObservationTripQualityBinding(columns);
    assertTripEvidencePrivacy(columns);
    return columns;
  }
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
    data_quality_flags: evidence.dataQualityFlags,
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
  const expectedEligible = RAVSCORE_CALIBRATION_ELIGIBLE === true
    && expectedCalibrationEligibility(columns, ravScoreModelBinding());
  if (columns.calibration_eligible !== expectedEligible) {
    throw new Error('Turgrundlagets kalibreringsstatus er inkonsistent.');
  }
  return columns;
}
