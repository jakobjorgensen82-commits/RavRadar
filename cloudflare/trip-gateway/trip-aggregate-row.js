import { canonicalJson, sha256Hex, assertStoredExternalTripContract }
  from '../../supabase/functions/_shared/trip-storage.js';
import { expectedCalibrationEligibility, observationOrigin }
  from '../../js/services/calibration-eligibility.js';
import { AGGREGATE_LIMITS, aggregateFail }
  from '../../supabase/functions/_shared/trip-aggregate-contract.js';

const encoder = new TextEncoder();
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// Server-internal row qualification, not candidate/contributor attestation.
// The normal caller owns validated request/binding, cumulative state and sets.
// This does not deserialize or authorize a resumable job or a report.
export async function qualifyTripWeatherAggregateRow(row, {
  request, binding, state, seen, tripIds, erased, allowed, exclusions,
}) {
  if (++state.rowsRead > AGGREGATE_LIMITS.rows) aggregateFail('AGGREGATE_CAPACITY_EXCEEDED');
  const id = row.client_observation_id;
  if (!UUID.test(id) || id <= state.after || seen.has(id)
      || row.storage_schema_version !== 1 || row.owner_kind !== 'user'
      || !/^usr_v1_[A-Za-z0-9_-]{43}$/.test(row.owner_subject)
      || typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))
      || Date.parse(row.created_at) >= Date.parse(request.preferenceSnapshot.snapshotAt)
      || typeof row.observed_at !== 'string' || row.observed_at < request.period.start
      || row.observed_at >= request.period.end) aggregateFail('AGGREGATE_STORED_INTEGRITY_INVALID');
  seen.add(id); state.after = id;
  if (erased.has(row.owner_subject)) { exclusions.erased++; return null; }
  if (!allowed.has(row.owner_subject)) { exclusions.preference++; return null; }
  if (typeof row.payload_json !== 'string'
      || (state.payloadBytes += encoder.encode(row.payload_json).byteLength) > AGGREGATE_LIMITS.payloadBytes) aggregateFail('AGGREGATE_CAPACITY_EXCEEDED');
  let payload;
  try { payload = JSON.parse(row.payload_json); }
  catch { aggregateFail('AGGREGATE_STORED_INTEGRITY_INVALID'); }
  const digest = { ...payload }; delete digest.submitted_at;
  if (await sha256Hex(canonicalJson(digest)) !== row.payload_sha256
      || payload.client_observation_id !== id || (payload.trip_id ?? null) !== row.trip_id
      || payload.observed_at !== row.observed_at || payload.submitted_at !== row.submitted_at) aggregateFail('AGGREGATE_STORED_INTEGRITY_INVALID');
  if (row.trip_id !== null) {
    if (!UUID.test(row.trip_id) || tripIds.has(row.trip_id)) aggregateFail('AGGREGATE_STORED_INTEGRITY_INVALID');
    tripIds.add(row.trip_id);
  }
  if (Number(payload.schema_version ?? 1) !== 3) { exclusions.ineligible++; return null; }
  try { assertStoredExternalTripContract(payload); }
  catch { aggregateFail('AGGREGATE_STORED_INTEGRITY_INVALID'); }
  if (observationOrigin(payload) === 'synthetic-test') { exclusions.synthetic++; return null; }
  // A declared submission kind, never proof that a trip or its weather is genuine.
  // Old/missing origin is not silently promoted into the future reported cohort.
  if (observationOrigin(payload) !== 'self-reported') { exclusions.ineligible++; return null; }
  // The existing normal D1 producer deliberately persists schema3 with
  // calibration_eligible=false. NEVER flip it or relabel the source as
  // calibrated. Only a distinct, unreleased SELF-REPORTED association
  // candidate is prepared from compatible reported snapshot fields.
  // Normal storage omits nulls; grams:null is a null-only read view,
  // not an invented measurement or a mutation of the stored payload.
  const reportedView = Object.hasOwn(payload, 'grams') ? payload : { ...payload, grams: null };
  if (!expectedCalibrationEligibility(reportedView, binding)) { exclusions.ineligible++; return null; }
  return { payload, id };
}
