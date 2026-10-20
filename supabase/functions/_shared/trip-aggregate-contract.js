import { isExactCalibrationModelBinding, sameCalibrationModelBinding }
  from '../../../js/services/calibration-eligibility.js';

export const AGGREGATE_PATH = '/v1/trips/aggregate-weather';
export const AGGREGATE_VERIFY_PATH = '/v1/trips/aggregate-weather-verify';
export const AGGREGATE_LIMITS = Object.freeze({
  accounts: 1000, pageRows: 200, rows: 4000, selectQueries: 45,
  payloadBytes: 20 * 1024 * 1024, metadataBytes: 512 * 1024,
  requestMs: 8000, callerMs: 45000, storageMs: 15000, snapshotAgeMs: 120000,
});
const SUBJECT = /^usr_v1_[A-Za-z0-9_-]{43}$/;
const REVISION = /^(0|[1-9][0-9]{0,18})$/;
export function aggregateFail(code) { throw new Error(code); }
export function aggregateExact(value, fields, code = 'AGGREGATE_SHAPE_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) aggregateFail(code);
}
export function previousClosedAggregateMonth(now = Date.now()) {
  if (!Number.isFinite(now)) aggregateFail('AGGREGATE_CLOCK_INVALID');
  const date = new Date(now), end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1);
  return Object.freeze({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
}
export function assertAggregateRequest(value, binding, now = Date.now()) {
  aggregateExact(value, ['schemaVersion', 'period', 'modelBinding', 'preferenceSnapshot']);
  if (value.schemaVersion !== 1 || !isExactCalibrationModelBinding(value.modelBinding)
      || !sameCalibrationModelBinding(value.modelBinding, binding)) aggregateFail('AGGREGATE_BINDING_INVALID');
  aggregateExact(value.period, ['start', 'end']);
  const period = previousClosedAggregateMonth(now);
  if (value.period.start !== period.start || value.period.end !== period.end) aggregateFail('AGGREGATE_PERIOD_INVALID');
  const snapshot = value.preferenceSnapshot;
  aggregateExact(snapshot, ['schemaVersion', 'snapshotAt', 'accounts']);
  const at = Date.parse(snapshot.snapshotAt);
  if (snapshot.schemaVersion !== 2 || !Number.isFinite(at)
      || new Date(at).toISOString() !== snapshot.snapshotAt
      || now - at > AGGREGATE_LIMITS.snapshotAgeMs || at > now + 5000
      || !Array.isArray(snapshot.accounts) || snapshot.accounts.length > AGGREGATE_LIMITS.accounts) {
    aggregateFail('AGGREGATE_PREFERENCE_SNAPSHOT_INVALID');
  }
  let previous = '';
  for (const account of snapshot.accounts) {
    aggregateExact(account, ['ownerSubject', 'enabled', 'revision', 'source']);
    if (typeof account.ownerSubject !== 'string' || !SUBJECT.test(account.ownerSubject) || account.ownerSubject <= previous
        || typeof account.enabled !== 'boolean' || typeof account.revision !== 'string' || !REVISION.test(account.revision)
        || BigInt(account.revision) > 9223372036854775807n
        || !['default', 'stored'].includes(account.source)
        || (account.source === 'default' && (!account.enabled || account.revision !== '0'))) {
      aggregateFail('AGGREGATE_PREFERENCE_SNAPSHOT_INVALID');
    }
    previous = account.ownerSubject;
  }
  return value;
}

// Physically closed: no env var, request field, option or caller-supplied
// policy can turn a preparation into a statistical disclosure. ROOT must
// separately implement/review the actual release and repeated-release rule.
export function aggregateWithheldReport(request) {
  return Object.freeze({ schemaVersion: 1, status: 'WITHHELD_RELEASE_POLICY_UNISSUED',
    period: { ...request.period }, modelBinding: { ...request.modelBinding } });
}
export function assertAggregateWithheldReport(report, request) {
  aggregateExact(report, ['schemaVersion', 'status', 'period', 'modelBinding'], 'AGGREGATE_RESPONSE_INVALID');
  aggregateExact(report.period, ['start', 'end'], 'AGGREGATE_RESPONSE_INVALID');
  if (report.schemaVersion !== 1 || report.status !== 'WITHHELD_RELEASE_POLICY_UNISSUED'
      || report.period.start !== request.period.start || report.period.end !== request.period.end
      || !isExactCalibrationModelBinding(report.modelBinding)
      || !sameCalibrationModelBinding(report.modelBinding, request.modelBinding)) aggregateFail('AGGREGATE_RESPONSE_INVALID');
  return report;
}
