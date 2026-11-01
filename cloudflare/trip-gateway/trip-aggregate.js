import { canonicalJson } from '../../supabase/functions/_shared/trip-storage.js';
import { isCalibrationEligibleForBinding } from '../../js/services/calibration-eligibility.js';
import { qualifyTripWeatherAggregateRow } from './trip-aggregate-row.js';
import { collectReadyTripWeatherAggregateJob } from './trip-aggregate-job.js';
import { CATEGORICAL_POLICY } from './trip-aggregate-categorical.js';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { AGGREGATE_LIMITS, aggregateFail, assertAggregateRequest, aggregateWithheldReport }
  from '../../supabase/functions/_shared/trip-aggregate-contract.js';

const contributionSubjects = new WeakMap();
// Internal accounting metadata, NEVER part of a serializable candidate or HTTP DTO.
export function aggregateContributionSubjects(candidate) {
  const subjects=contributionSubjects.get(candidate);
  if (!subjects) aggregateFail('AGGREGATE_ACCOUNT_SUBJECTS_UNAVAILABLE');
  return [...subjects];
}
const METRICS = Object.freeze({
  windSpeedMs: [0, 4, 8, 12, 20, Infinity],
  waveHeightM: [0, .3, .75, 1.5, 3, Infinity],
  currentSpeedMs: [0, .1, .25, .5, 1, Infinity],
  waterLevelTrendM3h: [-Infinity, -.1, -.02, .02, .1, Infinity],
});
const ROW_FIELDS = ['storage_schema_version','owner_subject','owner_kind','trip_id',
  'client_observation_id','observed_at','submitted_at','payload_json','payload_sha256','source','created_at'];

// Server-internal preparation. Exact counts are NOT anonymous release data.
// The only HTTP-facing caller below discards them and emits the closed DTO.
export async function prepareTripWeatherAggregate(databaseList, request) {
  return prepareTripWeatherAggregateUsing(databaseList, request, false);
}
export async function prepareCategoricalTripWeatherAggregate(databaseList, request) {
  return prepareTripWeatherAggregateUsing(databaseList, request, true);
}
async function prepareTripWeatherAggregateUsing(databaseList, request, categorical) {
  const now = Date.now(), binding = ravScoreModelBinding();
  assertAggregateRequest(request, binding, now);
  if (!Array.isArray(databaseList) || databaseList.length !== 10
      || databaseList.some(db => !db || typeof db.prepare !== 'function')) aggregateFail('AGGREGATE_SHARDS_INVALID');
  let queries = 0;
  const rowState = { rowsRead: 0, payloadBytes: 0, after: ''};
  const started = performance.now();
  const query = async (database, sql, args = []) => {
    const remaining = AGGREGATE_LIMITS.storageMs - (performance.now() - started);
    if (++queries > AGGREGATE_LIMITS.selectQueries || remaining <= 0) aggregateFail('AGGREGATE_CAPACITY_EXCEEDED');
    let reply, timer, expired = false;
    try {
      reply = await Promise.race([database.prepare(sql).bind(...args).all(), new Promise((_, reject) => {
        timer = setTimeout(() => { expired = true; reject(new Error('AGGREGATE_CAPACITY_EXCEEDED')); }, remaining);
      })]);
    } catch { aggregateFail(expired ? 'AGGREGATE_CAPACITY_EXCEEDED' : 'AGGREGATE_STORAGE_READ_FAILED'); }
    finally { clearTimeout(timer); }
    if (reply?.success !== true || !Array.isArray(reply.results)) aggregateFail('AGGREGATE_STORAGE_READ_FAILED');
    return reply.results;
  };
  // Additive separate ledger is a prerequisite, never an implicit installation.
  await query(databaseList[0], `select schema_version, release_key, period_start, period_end,
    model_binding_sha256, policy_sha256, report_json, report_sha256, created_at
    from trip_weather_aggregate_releases limit 0`);
  const tombstones = async () => {
    const rows = await query(databaseList[0], `select owner_subject from trip_owner_erasure_tombstones
      order by owner_subject limit 10001`);
    if (rows.length > 10000 || rows.some(row => Object.keys(row).join(',') !== 'owner_subject'
        || !/^(usr|anon)_v1_[A-Za-z0-9_-]{43}$/.test(row.owner_subject))) aggregateFail('AGGREGATE_TOMBSTONE_INVALID');
    return rows.map(row => row.owner_subject);
  };
  const beforeTombstones = await tombstones(), erased = new Set(beforeTombstones);
  const allowed = new Set(request.preferenceSnapshot.accounts.filter(row => row.enabled).map(row => row.ownerSubject));
  const seen = new Set(), tripIds = new Set(), selected = new Map();
  const exclusions = { preference: 0, erased: 0, synthetic: 0, ineligible: 0, repeatContributor: 0 };
  for (const database of databaseList) {
    rowState.after = '';
    while (true) {
      const rows = await query(database, `select ${ROW_FIELDS.join(', ')} from trip_observations t
        where t.owner_kind = 'user' and t.client_observation_id > ?
          and t.observed_at >= ? and t.observed_at < ? and t.created_at < ?
          and not exists (select 1 from trip_owner_erasure_tombstones x where x.owner_subject = t.owner_subject)
        order by t.client_observation_id limit ?`,
      [rowState.after, request.period.start, request.period.end, request.preferenceSnapshot.snapshotAt, AGGREGATE_LIMITS.pageRows + 1]);
      if (rows.length > AGGREGATE_LIMITS.pageRows + 1) aggregateFail('AGGREGATE_STORAGE_READ_FAILED');
      const hasMore = rows.length > AGGREGATE_LIMITS.pageRows;
      for (const row of rows.slice(0, AGGREGATE_LIMITS.pageRows)) {
        const qualified = await qualifyTripWeatherAggregateRow(row, {
          request, binding, state: rowState, seen, tripIds, erased, allowed, exclusions,
        });
        if (qualified === null) continue;
        const { payload, id, reportedTrip } = qualified;
        // One account contributes at most one deterministic reported trip per
        // fixed closed month. This is a sensitivity bound, NOT anonymity proof.
        const current = selected.get(row.owner_subject);
        const rank = payload.observed_at + '|' + id;
        if (!current || rank < current.rank) selected.set(row.owner_subject, {
          rank, found: payload.found, reportedTrip,
          features: Object.fromEntries(Object.keys(METRICS).map(metric => [metric, payload.calibration_features[metric]])),
          calibrationEligible: isCalibrationEligibleForBinding(payload, binding),
        });
        if (current) exclusions.repeatContributor++;
      }
      if (!hasMore) break;
    }
  }
  if (canonicalJson(beforeTombstones) !== canonicalJson(await tombstones())) aggregateFail('AGGREGATE_OWNER_SET_CHANGED');
  return finishTripWeatherAggregate(databaseList, query, selected, rowState, exclusions, categorical);
}

// The only alternate input is read and requalified through the fixed durable
// normal job. No caller-supplied rows, candidate or serialized proof is accepted.
export async function prepareReadyTripWeatherAggregate(databaseList, request) {
  const input = await collectReadyTripWeatherAggregateJob(databaseList, request);
  return finishTripWeatherAggregate(databaseList, input.query, input.selected,
    { rowsRead: input.rowsRead }, input.exclusions);
}

export async function prepareCategoricalReadyTripWeatherAggregate(databaseList, request) {
  const input = await collectReadyTripWeatherAggregateJob(databaseList, request);
  return finishTripWeatherAggregate(databaseList, input.query, input.selected,
    { rowsRead: input.rowsRead }, input.exclusions, true);
}

async function finishTripWeatherAggregate(databaseList, query, selected, rowState, exclusions, categorical = false) {
  const eligibleSubjects = [...selected.keys()].sort();
  const charges = await query(databaseList[0], `select owner_subject,sum(budget_units) total_units
    from trip_weather_aggregate_account_charges
    where owner_subject in (select value from json_each(?)) group by owner_subject order by owner_subject`,
    [canonicalJson(eligibleSubjects)]);
  let prior='';
  for (const charge of charges) {
    if (!charge || Object.keys(charge).sort().join(',')!=='owner_subject,total_units'
      || !selected.has(charge.owner_subject) || charge.owner_subject<=prior
      || ![4,8].includes(charge.total_units)) aggregateFail('AGGREGATE_ACCOUNT_BUDGET_INVALID');
    prior=charge.owner_subject;
    if (charge.total_units===8) selected.delete(charge.owner_subject);
  }
  // Whole row/hash/schema/eligibility/tie checks above still run, even for spent accounts.
  // One account's lifetime clipping never removes or displaces another account.
  const cells = new Map();
  for (const { found, features, reportedTrip } of selected.values()) {
    if (categorical && (!['beach','waders'].includes(reportedTrip?.huntMode)
      || !['none','small','medium','good'].includes(reportedTrip?.result))) aggregateFail('AGGREGATE_STORED_INTEGRITY_INVALID');
    const outcome = categorical ? reportedTrip.result : found === true ? 'find' : 'no-find';
    for (const [metric, bounds] of Object.entries(METRICS)) {
      const value = features[metric];
      if (typeof value !== 'number' || !Number.isFinite(value)) aggregateFail('AGGREGATE_STORED_INTEGRITY_INVALID');
      const bin = bounds.findIndex((bound, index) => index < bounds.length - 1 && value >= bound && value < bounds[index + 1]);
      if (bin < 0) aggregateFail('AGGREGATE_STORED_INTEGRITY_INVALID');
      const key = metric + ':' + bin + ':' + (categorical ? reportedTrip.huntMode + ':' : '') + outcome;
      cells.set(key, (cells.get(key) ?? 0) + 1);
    }
  }
  const candidate=Object.freeze({ kind: categorical ? 'PRIVATE_UNRELEASED_CATEGORICAL_AGGREGATE_PREPARATION' : 'PRIVATE_UNRELEASED_SELF_REPORTED_AGGREGATE_PREPARATION',
    cohort: 'DESCRIPTIVE_SELF_REPORTED_NO_CALIBRATION',
    allShardsRead: 10, compatibleReportedContributors: selected.size, rowsRead: rowState.rowsRead,
    modelCalibrationEligible: false, verifiedForecastData: false,
    genuineTripOriginVerified: false, unverifiedOriginContributors: selected.size,
    verifiedCalibrationContributors: 0,
    releaseBlockers: ['RELEASE_POLICY_UNISSUED', 'TRIP_ORIGIN_NOT_ATTESTED', 'FORECAST_NOT_SERVER_ATTESTED'],
    normalCalibrationEligibleContributors: [...selected.values()].filter(({ calibrationEligible }) => calibrationEligible).length,
    exclusions, cells: [...cells].sort(([a], [b]) => a.localeCompare(b)).map(([cell, count]) => ({ cell, count })),
    releasePolicyIssued: false, ...(categorical ? { effortStatus: CATEGORICAL_POLICY.effort } : {}) });
  contributionSubjects.set(candidate,Object.freeze([...selected.keys()].sort()));
  return candidate;
}

export { handlePolicyBoundAggregate as handleTripWeatherAggregate, handleVerifyPolicyBoundAggregate as handleVerifyTripWeatherAggregate } from './trip-aggregate-policy-gate.js';
