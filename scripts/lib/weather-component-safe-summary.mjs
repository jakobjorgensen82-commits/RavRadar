// Log-only projection. Never copy runtime objects, provider messages, keys,
// coordinates, cursor identities, hashes or provenance into a public log.
// Missing evidence stays null, not an invented zero. This describes the four
// scalar/component fallback families; the separate current producer is absent.
const FAMILIES = ['wind', 'wave', 'waterLevel', 'waterTemperature'];
const COVERAGE_COUNTS = ['required', 'valid', 'missing', 'trendMissing', 'dmi', 'reserve', 'agedDmiChallenges'];
const CP_COUNTS = ['admittedCandidates', 'privateSupportCandidates', 'remainingNeeds', 'recordFailures',
  'attempts', 'retryableAttempts', 'remainingUpgradeNeeds', 'invalidOriginalRecordsReleasedForRetry'];
const CP_STATUSES = ['IN_PROGRESS', 'CANDIDATES_READY'];
const CP_OUTCOMES = ['COMPLETED', 'FAILED', 'RECOVERED_AFTER_TRANSPORT_FAILURE'];
const CP_TRANSPORT_FAILURES = ['CP_COMPONENT_PRODUCER_FAILED_OR_TIMED_OUT', 'CP_COMPONENT_REFRESH_FAILED'];
const CP_RETRY_CODES = [
  'CP_COMPONENT_REQUEST_RETRYABLE_ERROR', 'CP_COMPONENT_TRANSPORT_BUDGET_REACHED',
  'CP_COMPONENT_DOWNLOAD_BYTE_BUDGET_REACHED', 'CP_COMPONENT_SUBSET_TIMEOUT',
  'CP_COMPONENT_SUBSET_FAILED', 'CP_COMPONENT_DATASET_UPDATING',
  'CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE', 'CP_COMPONENT_STATIC_CELL_INELIGIBLE',
  'CP_COMPONENT_STATIC_GRID_REFRESH_UNAVAILABLE',
  'CP_COMPONENT_STATIC_FIELD_SEMANTICS_INVALID', 'CP_COMPONENT_STATIC_FIELD_UNIT_INVALID',
  'CP_COMPONENT_STATIC_FIELD_DIMENSIONS_INVALID', 'CP_COMPONENT_STATIC_FIELD_VALUE_MISSING',
  'CP_COMPONENT_STATIC_MASK_SURFACE_INVALID', 'CP_COMPONENT_STATIC_MASK_SURFACE_MISSING',
  'CP_COMPONENT_STATIC_REQUEST_RECEIPT_INVALID', 'CP_COMPONENT_STATIC_SIZE_LIMIT',
  'CP_COMPONENT_STATIC_PAYLOAD_INVALID', 'CP_COMPONENT_STATIC_DECODED_SIZE_LIMIT',
  'CP_COMPONENT_STATIC_DECODE_FAILED', 'CP_COMPONENT_STATIC_DATASET_IDENTITY_CONFLICT',
  'CP_COMPONENT_STATIC_COORDINATE_INVALID', 'CP_COMPONENT_STATIC_GRID_DIMENSIONS_INVALID',
  'CP_COMPONENT_STATIC_NATIVE_CELL_OUTSIDE_BOUND', 'CP_COMPONENT_STATIC_MASK_OR_DEPTH_INVALID',
  'CP_COMPONENT_COORDINATE_MISSING_OR_AMBIGUOUS', 'CP_COMPONENT_COORDINATE_SEMANTICS_INVALID',
];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// JSON summaries have data properties. An accessor or inherited property is
// not acquisition evidence and must not execute during logging.
const field = (value, key) => record(value)
  ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const counts = (value, keys) => Object.fromEntries(keys.map(key => [key, count(field(value, key))]));
const choice = (value, options) => options.includes(value) ? value : null;
const boolean = value => typeof value === 'boolean' ? value : null;
const length = value => Array.isArray(value) ? value.length : null;
const coverage = value => Object.fromEntries(FAMILIES.map(family =>
  [family, counts(field(value, family), COVERAGE_COUNTS)]));
const retryReasons = value => counts(value, CP_RETRY_CODES);

function copernicusPass(value) {
  if (!record(value)) return null;
  return { ...counts(value, ['requestedNeeds', 'budgetMs', 'attempts', 'retryableAttempts', 'remainingNeeds', 'deferred']),
    status: choice(field(value, 'status'), CP_STATUSES),
    outcome: choice(field(value, 'outcome'), CP_OUTCOMES),
    retryableReasons: retryReasons(field(value, 'retryableReasons')),
    transportFailure: choice(field(value, 'transportFailure'), CP_TRANSPORT_FAILURES),
    attemptCountsComplete: boolean(field(value, 'attemptCountsComplete')) };
}

export function safeWeatherComponentSummary(summary) {
  const cp = field(summary, 'copernicus');
  const passes = field(cp, 'passes');
  const om = field(summary, 'openMeteo');
  return { kind: 'weather-component-coverage',
    before: coverage(field(summary, 'before')),
    afterCopernicus: coverage(field(summary, 'afterCopernicus')),
    after: coverage(field(summary, 'after')),
    failureCount: length(field(summary, 'failures')),
    pendingCopernicusUpgrades: count(field(summary, 'pendingCopernicusUpgrades')),
    copernicus: { ...counts(cp, CP_COUNTS),
      status: choice(field(cp, 'status'), CP_STATUSES),
      retryableReasons: retryReasons(field(cp, 'retryableReasons')),
      transportFailure: choice(field(cp, 'transportFailure'), CP_TRANSPORT_FAILURES),
      attemptCountsComplete: boolean(field(cp, 'attemptCountsComplete')),
      // Existing summaries do not report deferred counts in every CP pass.
      // Keep null rather than mislabelling remaining needs as deferrals.
      passes: { critical: copernicusPass(field(passes, 'critical')),
        upgrade: copernicusPass(field(passes, 'upgrade')) } },
    openMeteo: { ...counts(om, ['requests', 'deferred', 'records', 'componentsNotAdmitted']),
      failureCount: length(field(om, 'failures')),
      transport: counts(field(om, 'transport'), ['httpAttempts', 'retries', 'timeouts', 'responseBytes']) } };
}
