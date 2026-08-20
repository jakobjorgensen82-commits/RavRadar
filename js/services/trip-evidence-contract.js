export const TRIP_EVIDENCE_SCHEMA_VERSION = 2;
export const TRIP_SEARCH_COVERAGE = Object.freeze(['partial', 'normal', 'thorough']);
export const TRIP_SEARCH_MODES = Object.freeze(['waders', 'beach']);

const MAX_SEARCH_MINUTES = 24 * 60;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const FORBIDDEN_REMOTE_KEY = /(lat(?:itude)?|lon(?:gitude)?|lng|gps|coord|position|route|track)/i;

function requiredId(value, label) {
  const normalized = String(value || '').trim();
  if (!ID_PATTERN.test(normalized)) throw new Error(`${label} mangler eller har ugyldigt format.`);
  return normalized;
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
  const evidence = Object.freeze({
    schemaVersion: TRIP_EVIDENCE_SCHEMA_VERSION,
    tripId: requiredId(input.tripId, 'Tur-id'),
    tripStartedAt: started.iso,
    tripEndedAt: ended.iso,
    observedAt: new Date(started.time + (ended.time - started.time) / 2).toISOString(),
    searchMinutes,
    searchCoverage: assertChoice(input.searchCoverage, TRIP_SEARCH_COVERAGE, 'Søgegrundighed'),
    mode: assertChoice(input.mode, TRIP_SEARCH_MODES, 'Søgemetode'),
    zoneId: requiredId(input.zoneId, 'Zone'),
    coastalPartId: requiredId(input.coastalPartId, 'Kystdel'),
    found: input.found,
    grams: optionalGrams(input.grams, input.found),
    forecastSnapshotId: requiredId(snapshot.id, 'Prognose-id'),
    forecastIssuedAt: issued.iso,
    forecastValidAt: valid.iso,
    forecastCapturedAt: captured.iso
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
    mode: evidence.mode,
    zone_id: evidence.zoneId,
    coastal_part_id: evidence.coastalPartId,
    found: evidence.found,
    result: evidence.found ? 'medium' : 'none',
    grams: evidence.grams,
    forecast_snapshot_id: evidence.forecastSnapshotId,
    forecast_issued_at: evidence.forecastIssuedAt,
    forecast_valid_at: evidence.forecastValidAt,
    forecast_captured_at: evidence.forecastCapturedAt
  };
  assertTripEvidencePrivacy(columns);
  return columns;
}
