import {
  TRIP_SEARCH_COVERAGE,
  TRIP_SEARCH_MODES,
  assertTripEvidencePrivacy
} from './trip-evidence-contract.js?v=4.0.295';

export const ACCOUNT_TRIP_REPORT_SCHEMA_VERSION = 1;
export const ACCOUNT_TRIP_REPORT_SOURCE = 'account-manual';
export const HISTORICAL_SNAPSHOT_UNAVAILABLE = 'historical-snapshot-unavailable';

const MAX_SEARCH_MINUTES = 24 * 60;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredId(value, label) {
  const normalized = String(value || '').trim();
  if (!ID_PATTERN.test(normalized)) throw new Error(`${label} mangler eller har ugyldigt format.`);
  return normalized;
}

function requiredUuid(value) {
  const normalized = String(value || '').trim();
  if (!UUID_PATTERN.test(normalized)) throw new Error('Rapport-id skal være en UUID.');
  return normalized.toLowerCase();
}

function requiredIso(value, label) {
  const time = Date.parse(String(value || ''));
  if (!Number.isFinite(time)) throw new Error(`${label} mangler eller er ugyldigt.`);
  return { time, iso: new Date(time).toISOString() };
}

function requiredChoice(value, allowed, label) {
  const normalized = String(value || '').trim();
  if (!allowed.includes(normalized)) throw new Error(`${label} er ugyldig.`);
  return normalized;
}

function optionalGrams(value, found) {
  if (!found || value === '' || value == null) return null;
  const grams = Number(value);
  if (!Number.isFinite(grams) || grams < 0 || grams > 10000) throw new Error('Gram skal være et tal mellem 0 og 10000.');
  return Math.round(grams * 10) / 10;
}

export function buildAccountTripReport(input = {}, { now = Date.now() } = {}) {
  const started = requiredIso(input.startedAt, 'Dato og starttid');
  const searchMinutes = Math.round(Number(input.searchMinutes));
  if (!Number.isInteger(searchMinutes) || searchMinutes < 1 || searchMinutes > MAX_SEARCH_MINUTES) {
    throw new Error('Søgetiden skal være mellem 1 minut og 24 timer.');
  }
  const endedTime = started.time + searchMinutes * 60000;
  if (endedTime > Number(now) + 5 * 60000) {
    throw new Error('Turen kan ikke slutte i fremtiden. Kontrollér dato, tidspunkt og søgetid.');
  }
  if (typeof input.found !== 'boolean') throw new Error('Fund eller intet fund skal angives.');

  const report = Object.freeze({
    schemaVersion: ACCOUNT_TRIP_REPORT_SCHEMA_VERSION,
    reportSource: ACCOUNT_TRIP_REPORT_SOURCE,
    tripId: requiredUuid(input.tripId),
    tripStartedAt: started.iso,
    tripEndedAt: new Date(endedTime).toISOString(),
    observedAt: new Date(started.time + searchMinutes * 30000).toISOString(),
    searchMinutes,
    searchCoverage: requiredChoice(input.searchCoverage, TRIP_SEARCH_COVERAGE, 'Søgegrundighed'),
    mode: requiredChoice(input.mode, TRIP_SEARCH_MODES, 'Søgemetode'),
    zoneId: requiredId(input.zoneId, 'Zone'),
    coastalPartId: requiredId(input.coastalPartId, 'Kystdel'),
    found: input.found,
    grams: optionalGrams(input.grams, input.found),
    calibrationEligible: false,
    historicalSnapshotStatus: HISTORICAL_SNAPSHOT_UNAVAILABLE
  });
  assertTripEvidencePrivacy(report);
  return report;
}

export function toAccountObservationColumns(report) {
  if (report?.schemaVersion !== ACCOUNT_TRIP_REPORT_SCHEMA_VERSION || report?.reportSource !== ACCOUNT_TRIP_REPORT_SOURCE) {
    throw new Error('Kun en gyldig kontoindberetning kan gemmes gennem denne funktion.');
  }
  const columns = {
    schema_version: report.schemaVersion,
    trip_id: report.tripId,
    trip_started_at: report.tripStartedAt,
    trip_ended_at: report.tripEndedAt,
    observed_at: report.observedAt,
    forecast_target_at: report.observedAt,
    search_minutes: report.searchMinutes,
    search_coverage: report.searchCoverage,
    report_accuracy: 'exact',
    hunt_mode: report.mode,
    actual_zone_id: report.zoneId,
    actual_coastal_part_id: report.coastalPartId,
    calibration_eligible: false,
    found: report.found,
    result: report.found ? 'medium' : 'none',
    grams: report.grams,
    forecast_zone_id: null,
    forecast_coastal_part_id: null,
    forecast_snapshot_id: null,
    forecast_issued_at: null,
    forecast_valid_at: null,
    forecast_captured_at: null,
    calibration_features: null,
    data_quality_flags: [ACCOUNT_TRIP_REPORT_SOURCE, HISTORICAL_SNAPSHOT_UNAVAILABLE, 'not-calibration-eligible']
  };
  assertTripEvidencePrivacy(columns);
  return columns;
}
