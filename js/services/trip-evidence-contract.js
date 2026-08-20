export const TRIP_EVIDENCE_SCHEMA_VERSION = 2;
export const TRIP_SEARCH_COVERAGE = Object.freeze(['partial', 'normal', 'thorough']);
export const TRIP_SEARCH_MODES = Object.freeze(['waders', 'beach']);

const MAX_SEARCH_MINUTES = 24 * 60;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_REMOTE_KEY = /(lat(?:itude)?|lon(?:gitude)?|lng|gps|coord|position|route|track)/i;
const CALIBRATION_RANGES = Object.freeze({
  totalScore: [0, 100],
  huntabilityScore: [0, 100],
  transportScore: [0, 100],
  mobilisationScore: [0, 100],
  windSpeedMs: [0, 100],
  windDirectionDeg: [0, 360],
  waveHeightM: [0, 30],
  wavePeriodS: [0, 40],
  waveDirectionDeg: [0, 360],
  currentSpeedMs: [0, 10],
  currentDirectionDeg: [0, 360],
  waterLevelM: [-20, 20],
  waterLevelTrendM3h: [-10, 10],
  maxWaveHeight24hM: [0, 30],
  hoursSinceEnergyPeak: [0, 168],
  sustainedOnshoreHours: [0, 168]
});

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
  const grams = Number(value);
  if (!Number.isFinite(grams) || grams < 0 || grams > 100000) {
    throw new Error('Gram skal være et tal mellem 0 og 100000.');
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
  const number = Number(value);
  const [minimum, maximum] = CALIBRATION_RANGES[key];
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new Error(`${key} ligger uden for det tilladte interval.`);
  }
  return number;
}

export function assertTripEvidencePrivacy(value, path = 'tripEvidence') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertTripEvidencePrivacy(entry, `${path}[${index}]`));
    return true;
  }
  if (!value || typeof value !== 'object') return true;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_REMOTE_KEY.test(key)) throw new Error(`Præcis position må ikke sendes (${path}.${key}).`);
    assertTripEvidencePrivacy(entry, `${path}.${key}`);
  }
  return true;
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
  const snapshot = {
    modelVersion: requiredId(input.modelVersion, 'Modelversion'),
    appVersion: requiredId(input.appVersion, 'Appversion')
  };
  for (const key of Object.keys(CALIBRATION_RANGES)) snapshot[key] = rangedNumber(input[key], key);
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

  const searchMinutes = Math.max(1, Math.round((ended.time - started.time) / 60000));
  if (searchMinutes > MAX_SEARCH_MINUTES) throw new Error('En søgetur kan højst vare 24 timer.');

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
    calibrationEligible: zoneId === forecastZoneId && coastalPartId === forecastCoastalPartId,
    found: input.found,
    grams: optionalGrams(input.grams, input.found),
    forecastSnapshotId: requiredId(snapshot.id, 'Prognose-id'),
    forecastIssuedAt: issued.iso,
    forecastValidAt: valid.iso,
    forecastCapturedAt: captured.iso,
    calibrationFeatures: createCalibrationFeatureSnapshot(input.calibrationFeatures || {})
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
    zone_id: evidence.zoneId,
    coastal_part_id: evidence.coastalPartId,
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
    calibration_features: evidence.calibrationFeatures
  };
  assertTripEvidencePrivacy(columns);
  return columns;
}
