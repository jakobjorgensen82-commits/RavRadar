import { canonicalJson, sha256Hex } from '../../supabase/functions/_shared/trip-storage.js';
import { isExactCalibrationModelBinding } from '../../js/services/calibration-eligibility.js';

// REVIEW ONLY. This is not an issued privacy policy or a public API.
export const POLICY = Object.freeze({
  id: 'rr-self-reported-geometric-v2-UNISSUED', namespace: 'rr-trip-descriptive-GLOBAL',
  alphaNumerator: 7, alphaDenominator: 8, countBound: 1000,
  contributionPerAccountPerMonth: 1, coordinatesPerContribution: 4,
  costUnits: 4, lifetimeBudgetUnits: 8,
  epsilonUnit: 'ln(8/7)', addRemoveAccountEpsilonPerReport: '4*ln(8/7)',
  replacementAccountEpsilonPerReport: '8*ln(8/7)',
  addRemoveAccountLifetimeEpsilon: '8*ln(8/7)', replacementAccountLifetimeEpsilon: '16*ln(8/7)',
  publicReleaseIssued: false,
});
export const CELL_KEYS = Object.freeze(['windSpeedMs', 'waveHeightM', 'currentSpeedMs', 'waterLevelTrendM3h']
  .flatMap(metric => Array.from({ length: 5 }, (_, bin) => ['find', 'no-find'].map(outcome => `${metric}:${bin}:${outcome}`))).flat().sort());
export function fail(code) { throw new Error(code); }
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...fields].sort().join(',');

// Exact distribution of clamp(c + Z,0,n), NOT truncated/renormalized noise.
// Z has the full two-sided geometric law with alpha=7/8. Entire tail masses
// reside at endpoints; common denominator is (7+8)*8^n for every input c.
export function rationalClampedWeights(count, n = POLICY.countBound) {
  if (!integer(n, 1000) || n < 1 || !integer(count, n)) fail('DP_COUNT_DOMAIN_INVALID');
  const a = 7n, b = 8n, denominator = (a + b) * b ** BigInt(n);
  const weights = [];
  // Exact adjacent bases; the division is exact on each side of count.
  let base = a ** BigInt(count) * b ** BigInt(n - count);
  for (let y = 0; y <= n; y++) {
    weights.push((y === 0 || y === n ? b : b - a) * base);
    if (y < n) base = y < count ? (base / a) * b : (base / b) * a;
  }
  if (weights.reduce((sum, value) => sum + value, 0n) !== denominator) fail('DP_WEIGHT_SUM_INVALID');
  return { denominator, weights };
}
export function inverseRationalCount(weights, denominator, ticket) {
  if (typeof ticket !== 'bigint' || ticket < 0n || ticket >= denominator) fail('DP_TICKET_INVALID');
  let sum = 0n, chosen = -1;
  // Full fixed-size scan. No data-dependent early exit is used. JS BigInt is
  // not certified constant-time: physical side-channel safety remains a gate.
  for (let y = 0; y < weights.length; y++) {
    sum += weights[y];
    if (chosen === -1 && ticket < sum) chosen = y;
  }
  if (sum !== denominator || chosen === -1) fail('DP_WEIGHT_SUM_INVALID');
  return chosen;
}
export function uniformRationalTicket(denominator, randomFill = value => crypto.getRandomValues(value)) {
  if (typeof denominator !== 'bigint' || denominator <= 0n || typeof randomFill !== 'function') fail('DP_ENTROPY_CONFIGURATION_INVALID');
  const bits = denominator.toString(2).length, bytes = Math.ceil(bits / 8), extra = bytes * 8 - bits;
  if (bytes > 376) fail('DP_ENTROPY_CONFIGURATION_INVALID');
  const attempts = 32, buffer = new Uint8Array(bytes * attempts);
  try { randomFill(buffer); } catch { fail('DP_ENTROPY_UNAVAILABLE'); }
  let first = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let value = 0n;
    for (let j = 0; j < bytes; j++) {
      const byte = j === 0 ? buffer[attempt * bytes + j] & (255 >>> extra) : buffer[attempt * bytes + j];
      value = (value << 8n) | BigInt(byte);
    }
    if (first === null && value < denominator) first = value;
  }
  // Bounded rejection may return no proposal, never biased modulo/fallback.
  // D=15*8^n gives rejection probability 1/16, so this random-only failure is
  // 2^-128, independent of c. Under ideal independent bits, accepted tickets
  // are exactly uniform. CSPRNG/entropy/timing assumptions require ROOT review.
  if (first === null) fail('DP_ENTROPY_REJECTION_EXHAUSTED');
  return first;
}
// Exact same clamped two-sided geometric law. No per-count weight construction.
// Independent sign masses are +:7/15, -:7/15, zero:1/15. Conditional nonzero
// magnitude M has P(M=k)=(1/8)*(7/8)^(k-1); all M>=n are one endpoint event.
// The fixed n-1 Bernoulli scan and all 32 unbiased sign attempts are retained,
// including for a zero sign. Random-only failure remains 2^-128, not modulo.
// This private implementation is NOT certified constant-time or Worker-ready.
export function geometricMagnitudeFromBits(buffer, n) {
  if (!integer(n, 1000) || n < 1 || !(buffer instanceof Uint8Array)
      || buffer.byteLength !== Math.ceil((n - 1) * 3 / 8)) fail('DP_ENTROPY_CONFIGURATION_INVALID');
  let firstFailure = -1;
  for (let trial = 0; trial < n - 1; trial++) {
    const bit = trial * 3, index = bit >>> 3, shift = bit & 7;
    const pair = buffer[index] | ((buffer[index + 1] ?? 0) << 8);
    if (firstFailure === -1 && ((pair >>> shift) & 7) === 0) firstFailure = trial;
  }
  return firstFailure === -1 ? n : firstFailure + 1;
}
export function sampleClampedCount(count, { n = POLICY.countBound,
    randomFill = value => crypto.getRandomValues(value) } = {}) {
  if (!integer(n, 1000) || n < 1 || !integer(count, n)) fail('DP_COUNT_DOMAIN_INVALID');
  if (typeof randomFill !== 'function') fail('DP_ENTROPY_CONFIGURATION_INVALID');
  const sign = Number(uniformRationalTicket(15n, randomFill));
  const buffer = new Uint8Array(Math.ceil((n - 1) * 3 / 8));
  try { randomFill(buffer); } catch { fail('DP_ENTROPY_UNAVAILABLE'); }
  const magnitude = geometricMagnitudeFromBits(buffer, n);
  const direction = sign < 7 ? 1 : sign < 14 ? -1 : 0;
  return Math.max(0, Math.min(n, count + direction * magnitude));
}
export function denseCountsFromNormalCandidate(candidate) {
  if (candidate?.kind !== 'PRIVATE_UNRELEASED_SELF_REPORTED_AGGREGATE_PREPARATION'
      || candidate.cohort !== 'DESCRIPTIVE_SELF_REPORTED_NO_CALIBRATION'
      || candidate.allShardsRead !== 10 || candidate.modelCalibrationEligible !== false
      || candidate.verifiedForecastData !== false || candidate.genuineTripOriginVerified !== false
      || candidate.verifiedCalibrationContributors !== 0 || candidate.normalCalibrationEligibleContributors !== 0
      || candidate.releasePolicyIssued !== false || !integer(candidate.compatibleReportedContributors, POLICY.countBound)
      || candidate.unverifiedOriginContributors !== candidate.compatibleReportedContributors
      || !Array.isArray(candidate.cells) || candidate.cells.length > CELL_KEYS.length) fail('DP_NORMAL_COHORT_INVALID');
  const counts = new Array(CELL_KEYS.length).fill(0), seen = new Set();
  for (const row of candidate.cells) {
    const i = CELL_KEYS.indexOf(row?.cell);
    if (!exact(row, ['cell', 'count']) || i < 0 || seen.has(i) || !integer(row.count, POLICY.countBound)) fail('DP_NORMAL_COHORT_INVALID');
    seen.add(i); counts[i] = row.count;
  }
  let findTotal = null;
  for (const metric of ['windSpeedMs', 'waveHeightM', 'currentSpeedMs', 'waterLevelTrendM3h']) {
    const total = CELL_KEYS.reduce((sum, key, i) => sum + (key.startsWith(metric + ':') ? counts[i] : 0), 0);
    const finds = CELL_KEYS.reduce((sum, key, i) => sum + (key.startsWith(metric + ':') && key.endsWith(':find') ? counts[i] : 0), 0);
    if (total !== candidate.compatibleReportedContributors || (findTotal !== null && finds !== findTotal)) fail('DP_NORMAL_COHORT_INVALID');
    findTotal = finds;
  }
  return counts;
}
export async function makePrivateNoisyProposal(candidate, request, { randomFill } = {}) {
  if (!isExactCalibrationModelBinding(request?.modelBinding)
      || !exact(request.period, ['start', 'end'])) fail('DP_REQUEST_INVALID');
  const counts = denseCountsFromNormalCandidate(candidate);
  const cells = CELL_KEYS.map((cell, i) => ({ cell, noisyCount: sampleClampedCount(counts[i], { randomFill }) }));
  return Object.freeze({ schemaVersion: 2, kind: 'PRIVATE_UNISSUED_DP_REVIEW_REPORT',
    cohort: 'DESCRIPTIVE_SELF_REPORTED_NO_CALIBRATION', period: { ...request.period },
    modelBinding: { ...request.modelBinding }, policyId: POLICY.id,
    policySha256: await sha256Hex(canonicalJson(POLICY)),
    originStatus: 'UNKNOWN_NOT_TEST_FREE', weatherStatus: 'SELF_REPORTED_NOT_SERVER_ATTESTED',
    verifiedCalibrationContributors: 0, publicReleaseIssued: false, cells });
}
export async function assertPrivateNoisyProposal(report) {
  if (!exact(report, ['schemaVersion','kind','cohort','period','modelBinding','policyId','policySha256',
    'originStatus','weatherStatus','verifiedCalibrationContributors','publicReleaseIssued','cells'])
      || report.schemaVersion !== 2 || report.kind !== 'PRIVATE_UNISSUED_DP_REVIEW_REPORT'
      || report.cohort !== 'DESCRIPTIVE_SELF_REPORTED_NO_CALIBRATION'
      || !exact(report.period, ['start','end']) || !isExactCalibrationModelBinding(report.modelBinding)
      || report.policyId !== POLICY.id || report.policySha256 !== await sha256Hex(canonicalJson(POLICY))
      || report.originStatus !== 'UNKNOWN_NOT_TEST_FREE' || report.weatherStatus !== 'SELF_REPORTED_NOT_SERVER_ATTESTED'
      || report.verifiedCalibrationContributors !== 0 || report.publicReleaseIssued !== false
      || !Array.isArray(report.cells) || report.cells.length !== CELL_KEYS.length) fail('DP_PROPOSAL_INVALID');
  for (let i = 0; i < CELL_KEYS.length; i++) {
    if (!exact(report.cells[i], ['cell','noisyCount']) || report.cells[i].cell !== CELL_KEYS[i]
        || !integer(report.cells[i].noisyCount, POLICY.countBound)) fail('DP_PROPOSAL_INVALID');
  }
  return report;
}
export function releaseTripWeatherStatistics() { fail('AGGREGATE_PUBLIC_RELEASE_UNISSUED'); }
