import { canonicalJson, sha256Hex } from '../../supabase/functions/_shared/trip-storage.js';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { isCalibrationEligibleForBinding } from '../../js/services/calibration-eligibility.js';
import { AGGREGATE_LIMITS, assertAggregateRequest } from '../../supabase/functions/_shared/trip-aggregate-contract.js';
import { assertReviewPolicyAnchor, POLICY_ANCHOR } from './trip-aggregate-policy-gate.js';
import { qualifyTripWeatherAggregateRow } from './trip-aggregate-row.js';

// PRIVATE INACTIVE implementation of input scan only. No HTTP route, proposal,
// noise, report, budget charge or contribution/WeakMap deserialization exists.
// One row is a first execution unit, NOT a hosted CPU/heap qualification.
export const AGGREGATE_JOB_EXECUTION = Object.freeze({
  id: 'rr-private-input-scan-v1-UNISSUED', rowsPerChunk: 1,
  statementsPerInvocation: 45, maximumForwardSteps: 4000 + 10,
  maximumLeaseClaims: 2 * (4000 + 10 + 1), claimsPerForwardStep: 2,
  leaseMs: AGGREGATE_LIMITS.storageMs + AGGREGATE_LIMITS.requestMs,
});
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const SUBJECT = /^usr_v1_[A-Za-z0-9_-]{43}$/;
const ROW_FIELDS = ['storage_schema_version','owner_subject','owner_kind','trip_id',
  'client_observation_id','observed_at','submitted_at','payload_json','payload_sha256','source','created_at'];
const META_FIELDS = ROW_FIELDS.filter(key => key !== 'payload_json');
const HEADER_FIELDS = ['job_key','period_start','period_end','source_cutoff','execution_id','binding_sha256','policy_sha256',
  'accounting_sha256','preference_sha256','initial_erasure_sha256','erasure_revision','input_accounts',
  'phase','revision','next_shard','after_id','rows_read','payload_bytes','winner_count',
  'preference_count','erased_count','synthetic_count','ineligible_count','repeat_count','scan_steps',
  'lease_claims','step_claims','reserved_chunk_queries','lease_token','lease_until_ms',
  'last_chunk_token','last_source_shard','last_consumed_id','terminal_code'];
const COUNTERS = { erasure_revision: Number.MAX_SAFE_INTEGER, input_accounts: 1000,
  revision: Number.MAX_SAFE_INTEGER, next_shard: 10, rows_read: 4000, payload_bytes: 20971520,
  winner_count: 1000, preference_count: 4000, erased_count: 4000, synthetic_count: 4000,
  ineligible_count: 4000, repeat_count: 4000, scan_steps: 4010, lease_claims: 8022,
  step_claims: 2, reserved_chunk_queries: 8022 * 45 };
const fail = code => { throw new Error(code); };
const integer = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const exact = (row, fields) => row && typeof row === 'object' && !Array.isArray(row)
  && Object.keys(row).sort().join(',') === [...fields].sort().join(',');

function execution(databases) {
  if (!Array.isArray(databases) || databases.length !== 10
    || databases.some(db => !db || typeof db.prepare !== 'function')
    || typeof databases[0].batch !== 'function') fail('AGGREGATE_JOB_SHARDS_INVALID');
  const started = performance.now(); let statements = 0;
  const invoke = async (count, operation, outcomeCode) => {
    const remaining = AGGREGATE_LIMITS.storageMs - (performance.now() - started);
    if ((statements += count) > 45 || remaining <= 0) fail('AGGREGATE_CAPACITY_EXCEEDED');
    let timer;
    try {
      return await Promise.race([operation(), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(outcomeCode)), remaining);
      })]);
    } catch { fail(outcomeCode); }
    finally { clearTimeout(timer); }
  };
  const all = async (database, sql, args = []) => {
    const answer = await invoke(1, () => database.prepare(sql).bind(...args).all(), 'AGGREGATE_JOB_STORAGE_READ_FAILED');
    if (answer?.success !== true || !Array.isArray(answer.results)) fail('AGGREGATE_JOB_STORAGE_READ_FAILED');
    return answer.results;
  };
  const run = async (database, sql, args = []) => {
    const answer = await invoke(1, () => database.prepare(sql).bind(...args).run(), 'AGGREGATE_JOB_WRITE_OUTCOME_UNKNOWN');
    if (answer?.success !== true || ![0,1].includes(answer.meta?.changes)) fail('AGGREGATE_JOB_WRITE_OUTCOME_UNKNOWN');
    return answer.meta.changes;
  };
  const batch = async items => {
    // D1 batch is atomic, and EVERY member consumes the invocation allowance.
    const result = await invoke(items.length,
      () => databases[0].batch(items.map(({ sql, args }) => databases[0].prepare(sql).bind(...args))),
      'AGGREGATE_JOB_WRITE_OUTCOME_UNKNOWN');
    if (!Array.isArray(result) || result.length !== items.length
      || result.some(row => row?.success !== true || ![0,1].includes(row.meta?.changes))) fail('AGGREGATE_JOB_WRITE_OUTCOME_UNKNOWN');
    return result;
  };
  const wrappedControl = { prepare(sql) { return { bind(...args) { return {
    all: async () => ({ success: true, results: await all(databases[0], sql, args) }),
  }; } }; } };
  return { all, run, batch, wrappedControl, used: () => statements };
}

async function epoch(q, control) {
  const rows = await q.all(control, 'select singleton,erasure_revision from trip_weather_aggregate_job_control');
  if (rows.length !== 1 || !exact(rows[0], ['singleton','erasure_revision']) || rows[0].singleton !== 1
    || !integer(rows[0].erasure_revision, Number.MAX_SAFE_INTEGER)) fail('AGGREGATE_JOB_STATE_INVALID');
  return rows[0].erasure_revision;
}
async function metadata(q, databases, request, now) {
  assertAggregateRequest(request, ravScoreModelBinding(), now);
  await assertReviewPolicyAnchor(q.wrappedControl);
  const key = await sha256Hex(canonicalJson({ ledgerId: POLICY_ANCHOR.ledger_id, period: request.period }));
  return { key, bindingSha: await sha256Hex(canonicalJson(request.modelBinding)),
    preferenceSha: await sha256Hex(canonicalJson(request.preferenceSnapshot.accounts)),
    erasureRevision: await epoch(q, databases[0]) };
}
async function read(q, control, key) {
  const rows = await q.all(control, `select ${HEADER_FIELDS.join(',')} from trip_weather_aggregate_jobs where job_key=?`, [key]);
  if (rows.length > 1) fail('AGGREGATE_JOB_STATE_INVALID');
  if (!rows.length) return null;
  const row = rows[0];
  if (!exact(row, HEADER_FIELDS) || row.execution_id !== AGGREGATE_JOB_EXECUTION.id
    || !['SCANNING','READY_INPUT','FAILED','INVALIDATED'].includes(row.phase)
    || Object.entries(COUNTERS).some(([name, maximum]) => !integer(row[name], maximum))
    || ['job_key','binding_sha256','policy_sha256','accounting_sha256','preference_sha256','initial_erasure_sha256'].some(name => !SHA.test(row[name]))
    || typeof row.source_cutoff !== 'string' || !Number.isFinite(Date.parse(row.source_cutoff))
    || new Date(row.source_cutoff).toISOString() !== row.source_cutoff
    || !(row.after_id === '' || UUID.test(row.after_id))
    || (row.phase === 'SCANNING' && row.next_shard === 10)
    || (row.phase === 'READY_INPUT' && (row.next_shard !== 10 || row.after_id !== ''))
    || row.reserved_chunk_queries !== row.lease_claims * 45
    || !(row.last_chunk_token === null || UUID.test(row.last_chunk_token))
    || !(row.last_source_shard === null || integer(row.last_source_shard, 9))
    || (row.last_chunk_token === null) !== (row.last_source_shard === null)
    || !(row.last_consumed_id === null || UUID.test(row.last_consumed_id))
    || ![null,'CAPACITY','INTEGRITY','CONSENT_CHANGED','OWNER_ERASURE_CHANGED','RECOVERY_EXHAUSTED'].includes(row.terminal_code)
    || ['FAILED','INVALIDATED'].includes(row.phase) !== (row.terminal_code !== null)
    || (row.lease_token === null) !== (row.lease_until_ms === null)
    || (row.lease_token !== null && (!UUID.test(row.lease_token) || !integer(row.lease_until_ms, Number.MAX_SAFE_INTEGER)))) fail('AGGREGATE_JOB_STATE_INVALID');
  return row;
}
function progress(row) {
  // Fixed INTERNAL diagnostics only. Never a report/candidate or raw cursor.
  return Object.freeze({ kind: 'PRIVATE_JOB_PROGRESS_NOT_STATISTICS', jobKey: row.job_key,
    phase: row.phase, revision: row.revision, nextShard: row.next_shard,
    scanSteps: row.scan_steps, rowsRead: row.rows_read, payloadBytes: row.payload_bytes });
}
async function invalidate(q, control, row, reason) {
  if (!['SCANNING','READY_INPUT'].includes(row.phase)) return;
  await q.run(control, `update trip_weather_aggregate_jobs set phase='INVALIDATED',terminal_code=?,
    revision=revision+1,lease_token=null,lease_until_ms=null where job_key=? and revision=? and phase in ('SCANNING','READY_INPUT')`,
  [reason, row.job_key, row.revision]);
}
async function assertBasis(q, databases, row, info, request) {
  if (row.period_start !== request.period.start || row.period_end !== request.period.end
    || row.binding_sha256 !== info.bindingSha || row.policy_sha256 !== POLICY_ANCHOR.policy_sha256
    || row.accounting_sha256 !== POLICY_ANCHOR.accounting_sha256
    || Date.parse(row.source_cutoff) > Date.parse(request.preferenceSnapshot.snapshotAt)) fail('AGGREGATE_JOB_BINDING_CHANGED');
  if (row.preference_sha256 !== info.preferenceSha) {
    await invalidate(q, databases[0], row, 'CONSENT_CHANGED'); fail('AGGREGATE_JOB_CONSENT_CHANGED');
  }
  if (row.input_accounts !== request.preferenceSnapshot.accounts.length) fail('AGGREGATE_JOB_STATE_INVALID');
  if (row.erasure_revision !== info.erasureRevision) {
    await invalidate(q, databases[0], row, 'OWNER_ERASURE_CHANGED'); fail('AGGREGATE_OWNER_SET_CHANGED');
  }
  if (['FAILED','INVALIDATED'].includes(row.phase)) fail('AGGREGATE_JOB_TERMINAL');
}

export async function startTripWeatherAggregateJob(databases, request, { now = Date.now() } = {}) {
  const q = execution(databases), control = databases[0], info = await metadata(q, databases, request, now);
  let row = await read(q, control, info.key);
  if (!row) {
    const tombstones = await q.all(control,
      'select owner_subject from trip_owner_erasure_tombstones order by owner_subject limit 10001');
    let prior = '';
    if (tombstones.length > 10000 || tombstones.some(item => {
      if (!exact(item, ['owner_subject']) || !/^(usr|anon)_v1_[A-Za-z0-9_-]{43}$/.test(item.owner_subject)
        || item.owner_subject <= prior) return true;
      prior = item.owner_subject; return false;
    })) fail('AGGREGATE_TOMBSTONE_INVALID');
    const erasureSha = await sha256Hex(canonicalJson(tombstones.map(item => item.owner_subject)));
    await q.run(control, `insert into trip_weather_aggregate_jobs
      (job_key,period_start,period_end,source_cutoff,execution_id,binding_sha256,policy_sha256,accounting_sha256,
       preference_sha256,initial_erasure_sha256,erasure_revision,input_accounts)
      select ?,?,?,?,?,?,?,?,?,?,?,? from trip_weather_aggregate_job_control where singleton=1 and erasure_revision=?
      and not exists(select 1 from trip_weather_aggregate_jobs where job_key=?)`,
    [info.key,request.period.start,request.period.end,request.preferenceSnapshot.snapshotAt,AGGREGATE_JOB_EXECUTION.id,info.bindingSha,
      POLICY_ANCHOR.policy_sha256,POLICY_ANCHOR.accounting_sha256,info.preferenceSha,erasureSha,
      info.erasureRevision,request.preferenceSnapshot.accounts.length,info.erasureRevision,info.key]);
    row = await read(q, control, info.key);
    if (!row) fail('AGGREGATE_OWNER_SET_CHANGED');
  }
  await assertBasis(q, databases, row, { ...info, erasureRevision: await epoch(q, control) }, request);
  return progress(row);
}

export async function readTripWeatherAggregateJob(databases, request, { now = Date.now() } = {}) {
  const q = execution(databases), info = await metadata(q, databases, request, now);
  const row = await read(q, databases[0], info.key); if (!row) fail('AGGREGATE_JOB_MISSING');
  await assertBasis(q, databases, row, info, request); return progress(row);
}

const leasePredicate = `job_key=? and revision=? and phase='SCANNING' and lease_token=?
  and erasure_revision=(select erasure_revision from trip_weather_aggregate_job_control where singleton=1)`;

export async function advanceTripWeatherAggregateJob(databases, request, { now = Date.now() } = {}) {
  const q = execution(databases), control = databases[0], info = await metadata(q, databases, request, now);
  let job = await read(q, control, info.key); if (!job) fail('AGGREGATE_JOB_MISSING');
  await assertBasis(q, databases, job, info, request);
  if (job.phase === 'READY_INPUT') return progress(job);
  if (job.lease_token !== null && job.lease_until_ms > now) fail('AGGREGATE_JOB_BUSY');
  if (job.step_claims >= 2 || job.lease_claims >= AGGREGATE_JOB_EXECUTION.maximumLeaseClaims) {
    await q.run(control, `update trip_weather_aggregate_jobs set phase='FAILED',terminal_code='RECOVERY_EXHAUSTED',
      revision=revision+1,lease_token=null,lease_until_ms=null where job_key=? and revision=? and phase='SCANNING'`, [job.job_key,job.revision]);
    fail('AGGREGATE_JOB_RECOVERY_EXHAUSTED');
  }
  const token = crypto.randomUUID();
  const claimed = await q.run(control, `update trip_weather_aggregate_jobs set revision=revision+1,
    lease_token=?,lease_until_ms=?,lease_claims=lease_claims+1,step_claims=step_claims+1,
    reserved_chunk_queries=reserved_chunk_queries+45 where job_key=? and revision=? and phase='SCANNING'
    and step_claims<2 and lease_claims<8022 and (lease_token is null or lease_until_ms<=?)
    and erasure_revision=(select erasure_revision from trip_weather_aggregate_job_control where singleton=1)`,
  [token,now+AGGREGATE_JOB_EXECUTION.leaseMs,job.job_key,job.revision,now]);
  if (claimed !== 1) fail('AGGREGATE_JOB_STALE_LEASE');
  job = await read(q, control, job.job_key);
  if (!job || job.lease_token !== token) fail('AGGREGATE_JOB_STALE_LEASE');
  try {
    const range = await q.all(databases[job.next_shard], `select ${META_FIELDS.join(',')},
      length(cast(payload_json as blob)) as payload_bytes from trip_observations t
      where t.owner_kind='user' and t.client_observation_id>? and t.observed_at>=? and t.observed_at<?
      and t.created_at<? and not exists(select 1 from trip_owner_erasure_tombstones x where x.owner_subject=t.owner_subject)
      order by t.client_observation_id limit 2`, [job.after_id,job.period_start,job.period_end,job.source_cutoff]);
    if (range.length > 2) fail('AGGREGATE_STORED_INTEGRITY_INVALID');
    const state = { rowsRead: job.rows_read, payloadBytes: job.payload_bytes, after: job.after_id };
    const exclusions = { preference: job.preference_count, erased: job.erased_count,
      synthetic: job.synthetic_count, ineligible: job.ineligible_count, repeatContributor: job.repeat_count };
    const items = []; let winnerCount = job.winner_count, consumedId = null;
    if (range.length) {
      const meta = range[0];
      if (!exact(meta, [...META_FIELDS,'payload_bytes']) || !integer(meta.payload_bytes, Number.MAX_SAFE_INTEGER)) fail('AGGREGATE_STORED_INTEGRITY_INVALID');
      const allowed = new Set(request.preferenceSnapshot.accounts.filter(account => account.enabled).map(account => account.ownerSubject));
      const erasedRows = await q.all(control, 'select owner_subject from trip_owner_erasure_tombstones where owner_subject=?', [meta.owner_subject]);
      if (erasedRows.length > 1 || erasedRows.some(row => !exact(row, ['owner_subject']) || row.owner_subject !== meta.owner_subject)) fail('AGGREGATE_TOMBSTONE_INVALID');
      const erased = new Set(erasedRows.map(row => row.owner_subject));
      let row = { ...meta }; delete row.payload_bytes;
      const payloadRequired = !erased.has(meta.owner_subject) && allowed.has(meta.owner_subject);
      if (payloadRequired && job.rows_read < 4000) {
        if (meta.payload_bytes > 20971520 - job.payload_bytes) fail('AGGREGATE_CAPACITY_EXCEEDED');
        const rows = await q.all(databases[job.next_shard], `select ${ROW_FIELDS.join(',')} from trip_observations
          where client_observation_id=? and owner_subject=? limit 2`, [meta.client_observation_id,meta.owner_subject]);
        if (rows.length !== 1 || !exact(rows[0], ROW_FIELDS)
          || META_FIELDS.some(key => rows[0][key] !== meta[key]) || typeof rows[0].payload_json !== 'string') fail('AGGREGATE_STORED_INTEGRITY_INVALID');
        row = rows[0];
      }
      const duplicates = await q.all(control, `select client_observation_id,trip_id from trip_weather_aggregate_job_seen
        where job_key=? and (client_observation_id=? or trip_id=?) limit 3`, [job.job_key,meta.client_observation_id,meta.trip_id]);
      if (duplicates.length > 2 || duplicates.some(item => !exact(item, ['client_observation_id','trip_id'])
        || !UUID.test(item.client_observation_id) || !(item.trip_id === null || UUID.test(item.trip_id)))) fail('AGGREGATE_JOB_STATE_INVALID');
      const seen = new Set(duplicates.map(item => item.client_observation_id));
      const tripIds = new Set(duplicates.map(item => item.trip_id).filter(value => value !== null));
      const tripWasPresent = tripIds.has(row.trip_id);
      // The global seen row may now belong to a newer ordinary lease holder.
      // Refuse the stale holder before interpreting that legitimate commit
      // as a malformed/duplicate source row. The final atomic CAS still guards
      // every child/header write if ownership changes after this read.
      const currentLease = await read(q, control, job.job_key);
      if (!currentLease || currentLease.revision !== job.revision
        || currentLease.lease_token !== token || currentLease.phase !== 'SCANNING'
        || currentLease.erasure_revision !== job.erasure_revision) fail('AGGREGATE_JOB_STALE_LEASE');
      const scanRequest = { ...request, preferenceSnapshot: { ...request.preferenceSnapshot, snapshotAt: job.source_cutoff } };
      const qualified = await qualifyTripWeatherAggregateRow(row, { request: scanRequest,
        binding: request.modelBinding, state, seen, tripIds, erased, allowed, exclusions });
      // Reuse the normal qualifier's measured UTF8 count, not a second encoding.
      if (payloadRequired && state.payloadBytes-job.payload_bytes !== meta.payload_bytes) fail('AGGREGATE_STORED_INTEGRITY_INVALID');
      consumedId = row.client_observation_id;
      const seenTrip = !tripWasPresent && tripIds.has(row.trip_id) ? row.trip_id : null;
      items.push({ sql: `insert into trip_weather_aggregate_job_seen
        (job_key,client_observation_id,trip_id,owner_subject,source_shard,payload_bytes,payload_sha256)
        select job_key,?,?,?,?,?,? from trip_weather_aggregate_jobs where ${leasePredicate}`,
      args: [consumedId,seenTrip,row.owner_subject,job.next_shard,state.payloadBytes-job.payload_bytes,
        payloadRequired ? row.payload_sha256 : null,job.job_key,job.revision,token] });
      if (qualified !== null) {
        const previous = await q.all(control, `select rank from trip_weather_aggregate_job_winners where job_key=? and owner_subject=?`, [job.job_key,row.owner_subject]);
        if (previous.length > 1 || previous.some(item => !exact(item, ['rank']) || typeof item.rank !== 'string')) fail('AGGREGATE_JOB_STATE_INVALID');
        const rank = qualified.payload.observed_at + '|' + qualified.id;
        if (previous.length) exclusions.repeatContributor++;
        if (!previous.length || rank < previous[0].rank) {
          if (!previous.length && ++winnerCount > 1000) fail('AGGREGATE_CAPACITY_EXCEEDED');
          const features = qualified.payload.calibration_features;
          items.push({ sql: `insert into trip_weather_aggregate_job_winners
            (job_key,owner_subject,client_observation_id,rank,found,wind_speed,wave_height,current_speed,water_trend,calibration_eligible)
            select job_key,?,?,?,?,?,?,?,?,? from trip_weather_aggregate_jobs where ${leasePredicate}
            on conflict(job_key,owner_subject) do update set client_observation_id=excluded.client_observation_id,rank=excluded.rank,found=excluded.found,
              wind_speed=excluded.wind_speed,wave_height=excluded.wave_height,current_speed=excluded.current_speed,
              water_trend=excluded.water_trend,calibration_eligible=excluded.calibration_eligible
            where excluded.rank<trip_weather_aggregate_job_winners.rank`,
          args: [row.owner_subject,qualified.id,rank,qualified.payload.found === true ? 1 : 0,features.windSpeedMs,features.waveHeightM,
            features.currentSpeedMs,features.waterLevelTrendM3h,
            isCalibrationEligibleForBinding(qualified.payload,request.modelBinding) ? 1 : 0,job.job_key,job.revision,token] });
        }
      }
    }
    const hasMore = range.length === 2, nextShard = hasMore ? job.next_shard : job.next_shard + 1;
    const after = hasMore ? consumedId : '';
    items.push({ sql: `update trip_weather_aggregate_jobs set phase=?,revision=revision+1,
      next_shard=?,after_id=?,rows_read=?,payload_bytes=?,winner_count=?,preference_count=?,erased_count=?,
      synthetic_count=?,ineligible_count=?,repeat_count=?,scan_steps=scan_steps+1,step_claims=0,
      lease_token=null,lease_until_ms=null,last_chunk_token=?,last_source_shard=?,last_consumed_id=?
      where ${leasePredicate}`,
    args: [nextShard===10 ? 'READY_INPUT' : 'SCANNING',nextShard,after,state.rowsRead,state.payloadBytes,winnerCount,
      exclusions.preference,exclusions.erased,exclusions.synthetic,exclusions.ineligible,exclusions.repeatContributor,
      token,job.next_shard,consumedId,job.job_key,job.revision,token] });
    const committed = await q.batch(items);
    if (committed.at(-1).meta.changes !== 1 || committed.some(item => item.meta.changes !== 1)) fail('AGGREGATE_JOB_STALE_LEASE');
    const stored = await read(q, control, job.job_key);
    if (!stored || stored.last_chunk_token !== token || stored.revision !== job.revision+1) fail('AGGREGATE_JOB_WRITE_OUTCOME_UNKNOWN');
    await assertBasis(q, databases, stored, { ...info, erasureRevision: await epoch(q, control) }, request);
    return progress(stored);
  } catch (error) {
    const reason = error.message === 'AGGREGATE_CAPACITY_EXCEEDED' ? 'CAPACITY'
      : error.message === 'AGGREGATE_STORED_INTEGRITY_INVALID' ? 'INTEGRITY' : null;
    if (reason) {
      try { await q.run(control, `update trip_weather_aggregate_jobs set phase='FAILED',terminal_code=?,
        revision=revision+1,lease_token=null,lease_until_ms=null where ${leasePredicate}`, [reason,job.job_key,job.revision,token]); }
      catch { /* Preserve the first failure; never repeat an unknown write. */ }
    }
    throw error;
  }
}

// Server-internal consumer of a real completed fixed scan. It accepts no JSON
// progress/candidate, rereads actual original rows, and reuses the exact normal
// qualifier. The returned Map is consumed only inside aggregate.js; only that
// module may issue its own nonserializable contribution proof.
export async function collectReadyTripWeatherAggregateJob(databases, request, { now = Date.now() } = {}) {
  const q = execution(databases), control = databases[0], info = await metadata(q, databases, request, now);
  const job = await read(q, control, info.key); if (!job) fail('AGGREGATE_JOB_MISSING');
  await assertBasis(q, databases, job, info, request);
  if (job.phase !== 'READY_INPUT') fail('AGGREGATE_JOB_NOT_READY');
  if (job.lease_token !== null) fail('AGGREGATE_JOB_STATE_INVALID');
  const fields = ['owner_subject','client_observation_id','rank','found','wind_speed','wave_height',
    'current_speed','water_trend','calibration_eligible','source_shard','payload_sha256','payload_bytes'];
  const winners = await q.all(control, `select w.owner_subject,w.client_observation_id,w.rank,w.found,
    w.wind_speed,w.wave_height,w.current_speed,w.water_trend,w.calibration_eligible,
    s.source_shard,s.payload_sha256,s.payload_bytes from trip_weather_aggregate_job_winners w
    join trip_weather_aggregate_job_seen s on s.job_key=w.job_key
      and s.client_observation_id=w.client_observation_id and s.owner_subject=w.owner_subject
    where w.job_key=? order by s.source_shard,w.client_observation_id limit 1001`, [job.job_key]);
  if (winners.length !== job.winner_count || winners.length > AGGREGATE_LIMITS.accounts) fail('AGGREGATE_JOB_STATE_INVALID');
  const grouped = Array.from({ length: 10 }, () => []), ownerSet = new Set(), clientSet = new Set();
  let sourceBytes = 0;
  for (const winner of winners) {
    if (!exact(winner, fields) || !SUBJECT.test(winner.owner_subject) || !UUID.test(winner.client_observation_id)
      || !integer(winner.source_shard, 9) || !integer(winner.payload_bytes, AGGREGATE_LIMITS.payloadBytes)
      || !SHA.test(winner.payload_sha256) || ![0,1].includes(winner.found)
      || ![0,1].includes(winner.calibration_eligible) || typeof winner.rank !== 'string' || winner.rank.length > 80
      || ['wind_speed','wave_height','current_speed','water_trend'].some(key => !Number.isFinite(winner[key]))
      || ownerSet.has(winner.owner_subject) || clientSet.has(winner.client_observation_id)) fail('AGGREGATE_JOB_STATE_INVALID');
    ownerSet.add(winner.owner_subject); clientSet.add(winner.client_observation_id);
    if ((sourceBytes += winner.payload_bytes) > job.payload_bytes || sourceBytes > AGGREGATE_LIMITS.payloadBytes) fail('AGGREGATE_CAPACITY_EXCEEDED');
    grouped[winner.source_shard].push(winner);
  }
  const tombstones = await q.all(control, 'select owner_subject from trip_owner_erasure_tombstones order by owner_subject limit 10001');
  let previous = '';
  if (tombstones.length > 10000 || tombstones.some(item => {
    if (!exact(item, ['owner_subject']) || !/^(usr|anon)_v1_[A-Za-z0-9_-]{43}$/.test(item.owner_subject)
      || item.owner_subject <= previous) return true;
    previous = item.owner_subject; return false;
  })) fail('AGGREGATE_TOMBSTONE_INVALID');
  if (await sha256Hex(canonicalJson(tombstones.map(item => item.owner_subject))) !== job.initial_erasure_sha256) fail('AGGREGATE_OWNER_SET_CHANGED');
  const erased = new Set(tombstones.map(item => item.owner_subject));
  const allowed = new Set(request.preferenceSnapshot.accounts.filter(item => item.enabled).map(item => item.ownerSubject));
  const selected = new Map(), seen = new Set(), tripIds = new Set();
  const state = { rowsRead: 0, payloadBytes: 0, after: '' };
  const recheckExclusions = { preference: 0, erased: 0, synthetic: 0, ineligible: 0, repeatContributor: 0 };
  const scanRequest = { ...request, preferenceSnapshot: { ...request.preferenceSnapshot, snapshotAt: job.source_cutoff } };
  for (let shard = 0; shard < 10; shard++) {
    const expected = grouped[shard]; if (!expected.length) continue;
    // At most one original-row query per populated shard, not1000 per-row calls.
    // SQL checks the saved length in the SAME read as the body, so a changed
    // larger row cannot overrun the existing cumulative20MiB transport budget.
    const identities = canonicalJson(expected.map(item => ({ id: item.client_observation_id,
      owner: item.owner_subject, sha: item.payload_sha256, bytes: item.payload_bytes })));
    if (new TextEncoder().encode(identities).length > AGGREGATE_LIMITS.metadataBytes) fail('AGGREGATE_CAPACITY_EXCEEDED');
    const rows = await q.all(databases[shard], `select ${ROW_FIELDS.map(key => 't.' + key).join(',')}
      from json_each(?) expected join trip_observations t on t.client_observation_id=json_extract(expected.value,'$.id')
      where t.owner_subject=json_extract(expected.value,'$.owner') and t.payload_sha256=json_extract(expected.value,'$.sha')
        and length(cast(t.payload_json as blob))=json_extract(expected.value,'$.bytes')
      and not exists(select 1 from trip_owner_erasure_tombstones x where x.owner_subject=t.owner_subject)
      order by t.client_observation_id limit 1001`, [identities]);
    if (rows.length !== expected.length) fail('AGGREGATE_JOB_SOURCE_CHANGED');
    state.after = '';
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index], winner = expected[index], beforeBytes = state.payloadBytes;
      if (!exact(row, ROW_FIELDS) || row.client_observation_id !== winner.client_observation_id
        || row.owner_subject !== winner.owner_subject || row.payload_sha256 !== winner.payload_sha256) fail('AGGREGATE_JOB_SOURCE_CHANGED');
      const qualified = await qualifyTripWeatherAggregateRow(row, { request: scanRequest,
        binding: request.modelBinding, state, seen, tripIds, erased, allowed, exclusions: recheckExclusions });
      if (qualified === null) fail('AGGREGATE_JOB_WINNER_ORIGIN_INVALID');
      const { payload, id } = qualified, features = payload.calibration_features;
      const calibrationEligible = isCalibrationEligibleForBinding(payload, request.modelBinding);
      if (state.payloadBytes - beforeBytes !== winner.payload_bytes || payload.observed_at + '|' + id !== winner.rank
        || (payload.found === true ? 1 : 0) !== winner.found || (calibrationEligible ? 1 : 0) !== winner.calibration_eligible
        || features.windSpeedMs !== winner.wind_speed || features.waveHeightM !== winner.wave_height
        || features.currentSpeedMs !== winner.current_speed || features.waterLevelTrendM3h !== winner.water_trend) fail('AGGREGATE_JOB_SOURCE_CHANGED');
      selected.set(row.owner_subject, { rank: winner.rank, found: payload.found,
        features: { windSpeedMs: features.windSpeedMs, waveHeightM: features.waveHeightM,
          currentSpeedMs: features.currentSpeedMs, waterLevelTrendM3h: features.waterLevelTrendM3h }, calibrationEligible });
    }
  }
  const latest = await read(q, control, job.job_key);
  if (!latest || latest.phase !== 'READY_INPUT' || latest.revision !== job.revision
    || latest.erasure_revision !== job.erasure_revision || latest.lease_token !== null) fail('AGGREGATE_JOB_SOURCE_CHANGED');
  await assertBasis(q, databases, latest, { ...info, erasureRevision: await epoch(q, control) }, request);
  return { selected, rowsRead: job.rows_read, query: q.all, exclusions: {
    preference: job.preference_count, erased: job.erased_count, synthetic: job.synthetic_count,
    ineligible: job.ineligible_count, repeatContributor: job.repeat_count } };
}
