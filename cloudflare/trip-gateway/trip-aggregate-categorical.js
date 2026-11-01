import { canonicalJson, sha256Hex } from '../../supabase/functions/_shared/trip-storage.js';
import { isExactCalibrationModelBinding } from '../../js/services/calibration-eligibility.js';
import { POLICY, sampleClampedCount, assertPrivateNoisyProposal, fail } from './trip-aggregate-dp.js';

// A distinct, still UNISSUED output policy. The immutable binary mechanism and
// its old reports are not edited or relabelled. Both policies use the actual
// same global month key and account-lifetime accounting in the existing ledger.
export const CATEGORICAL_POLICY = Object.freeze({ ...POLICY,
  id: 'rr-self-reported-mode-result-geometric-v3-UNISSUED',
  layout: 'FOUR_WEATHER_FIVE_BINS_TWO_MODES_FOUR_RESULTS',
  selection: 'EARLIEST_OBSERVED_THEN_ID_ONE_ACCOUNT_MONTH',
  effort: 'ALL_VALIDATED_REPORTED_EFFORT_UNADJUSTED',
  legacySamplerSha256: 'ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b',
});
export const CATEGORICAL_CELL_KEYS = Object.freeze(['windSpeedMs', 'waveHeightM', 'currentSpeedMs', 'waterLevelTrendM3h']
  .flatMap(metric => Array.from({ length: 5 }, (_, bin) => ['beach', 'waders']
    .flatMap(mode => ['none', 'small', 'medium', 'good'].map(result => `${metric}:${bin}:${mode}:${result}`))))
  .flat().sort());
const integer = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...fields].sort().join(',');

export function denseCountsFromCategoricalCandidate(candidate) {
  if (candidate?.kind !== 'PRIVATE_UNRELEASED_CATEGORICAL_AGGREGATE_PREPARATION'
    || candidate.cohort !== 'DESCRIPTIVE_SELF_REPORTED_NO_CALIBRATION'
    || candidate.allShardsRead !== 10 || candidate.modelCalibrationEligible !== false
    || candidate.verifiedForecastData !== false || candidate.genuineTripOriginVerified !== false
    || candidate.verifiedCalibrationContributors !== 0 || candidate.normalCalibrationEligibleContributors !== 0
    || candidate.releasePolicyIssued !== false || !integer(candidate.compatibleReportedContributors, POLICY.countBound)
    || candidate.unverifiedOriginContributors !== candidate.compatibleReportedContributors
    || candidate.effortStatus !== CATEGORICAL_POLICY.effort
    || !Array.isArray(candidate.cells) || candidate.cells.length > CATEGORICAL_CELL_KEYS.length) fail('DP_CATEGORICAL_COHORT_INVALID');
  const counts = new Array(CATEGORICAL_CELL_KEYS.length).fill(0), seen = new Set();
  for (const row of candidate.cells) {
    const index = CATEGORICAL_CELL_KEYS.indexOf(row?.cell);
    if (!exact(row, ['cell', 'count']) || index < 0 || seen.has(index) || !integer(row.count, POLICY.countBound)) fail('DP_CATEGORICAL_COHORT_INVALID');
    seen.add(index); counts[index] = row.count;
  }
  let previous = null;
  for (const metric of ['windSpeedMs', 'waveHeightM', 'currentSpeedMs', 'waterLevelTrendM3h']) {
    const totals = [];
    for (const mode of ['beach', 'waders']) for (const result of ['none', 'small', 'medium', 'good']) {
      totals.push(CATEGORICAL_CELL_KEYS.reduce((sum, key, index) => sum
        + (key.startsWith(metric + ':') && key.endsWith(':' + mode + ':' + result) ? counts[index] : 0), 0));
    }
    if (totals.reduce((sum, value) => sum + value, 0) !== candidate.compatibleReportedContributors
      || previous !== null && canonicalJson(previous) !== canonicalJson(totals)) fail('DP_CATEGORICAL_COHORT_INVALID');
    previous = totals;
  }
  return counts;
}

export async function makePrivateCategoricalProposal(candidate, request, { randomFill } = {}) {
  if (!isExactCalibrationModelBinding(request?.modelBinding)
    || !exact(request.period, ['start', 'end'])) fail('DP_REQUEST_INVALID');
  const counts = denseCountsFromCategoricalCandidate(candidate);
  // One selected account still changes four count coordinates (eight under
  // replacement). More fixed empty cells do not add another contribution.
  const cells = CATEGORICAL_CELL_KEYS.map((cell, index) => ({ cell,
    noisyCount: sampleClampedCount(counts[index], { randomFill }) }));
  return Object.freeze({ schemaVersion: 3, kind: 'PRIVATE_UNISSUED_DP_REVIEW_REPORT',
    cohort: 'DESCRIPTIVE_SELF_REPORTED_NO_CALIBRATION', period: { ...request.period },
    modelBinding: { ...request.modelBinding }, policyId: CATEGORICAL_POLICY.id,
    policySha256: await sha256Hex(canonicalJson(CATEGORICAL_POLICY)),
    originStatus: 'UNKNOWN_NOT_TEST_FREE', weatherStatus: 'SELF_REPORTED_NOT_SERVER_ATTESTED',
    verifiedCalibrationContributors: 0, publicReleaseIssued: false,
    effortStatus: CATEGORICAL_POLICY.effort, cells });
}

export async function assertPrivateCategoricalProposal(report) {
  if (!exact(report, ['schemaVersion', 'kind', 'cohort', 'period', 'modelBinding', 'policyId', 'policySha256',
    'originStatus', 'weatherStatus', 'verifiedCalibrationContributors', 'publicReleaseIssued', 'effortStatus', 'cells'])
    || report.schemaVersion !== 3 || report.kind !== 'PRIVATE_UNISSUED_DP_REVIEW_REPORT'
    || report.cohort !== 'DESCRIPTIVE_SELF_REPORTED_NO_CALIBRATION'
    || !exact(report.period, ['start', 'end']) || !isExactCalibrationModelBinding(report.modelBinding)
    || report.policyId !== CATEGORICAL_POLICY.id || report.policySha256 !== await sha256Hex(canonicalJson(CATEGORICAL_POLICY))
    || report.originStatus !== 'UNKNOWN_NOT_TEST_FREE' || report.weatherStatus !== 'SELF_REPORTED_NOT_SERVER_ATTESTED'
    || report.verifiedCalibrationContributors !== 0 || report.publicReleaseIssued !== false
    || report.effortStatus !== CATEGORICAL_POLICY.effort
    || !Array.isArray(report.cells) || report.cells.length !== CATEGORICAL_CELL_KEYS.length) fail('DP_CATEGORICAL_PROPOSAL_INVALID');
  for (let index = 0; index < CATEGORICAL_CELL_KEYS.length; index++) {
    const row = report.cells[index];
    if (!exact(row, ['cell', 'noisyCount']) || row.cell !== CATEGORICAL_CELL_KEYS[index]
      || !integer(row.noisyCount, POLICY.countBound)) fail('DP_CATEGORICAL_PROPOSAL_INVALID');
  }
  return report;
}

export async function assertPrivateTripStudyReport(report) {
  if (report?.schemaVersion === 3) return assertPrivateCategoricalProposal(report);
  return assertPrivateNoisyProposal(report);
}
