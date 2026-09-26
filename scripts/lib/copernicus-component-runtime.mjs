// Normal-weather boundary: pinned Python plan/transport -> real byte authority
// -> opaque PART index. No score formula, central geometry or datum changes.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadCopernicusComponentAuthority, validateCopernicusComponentCandidates } from './copernicus-component-index.mjs';

export function copernicusRetryableReasonCounts(attempts) {
  const counts = {};
  for (const attempt of attempts) {
    if (attempt?.status !== 'RETRYABLE_ERROR') continue;
    const supplied = attempt.reason;
    const code = typeof supplied === 'string' && /^CP_[A-Z0-9_]{1,80}$/.test(supplied)
      ? supplied : 'CP_COMPONENT_REQUEST_RETRYABLE_ERROR';
    counts[code] = (counts[code] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, 'en')));
}

export async function runCopernicusComponentRuntime({ privateCacheRoot, bankPath, cacheDirectory,
  parts, productionReferenceAt, needs, retentionStartAt, retentionEndAt, budgetMs = 0,
  requestTimeoutMs, maximumRequests, maximumDownloadBytes,
  pythonExecutable = process.env.PYTHON ?? 'python', verificationTimeoutMs = 120_000,
} = {}) {
  if (!Array.isArray(parts) || !parts.length || !Array.isArray(needs)
    || typeof privateCacheRoot !== 'string' || !privateCacheRoot
    || typeof budgetMs !== 'number' || !Number.isFinite(budgetMs) || budgetMs < 0) {
    throw new Error('CP_COMPONENT_RUNTIME_ARGUMENTS_INVALID');
  }
  bankPath ??= path.join(privateCacheRoot, 'copernicus-component-bank.json');
  cacheDirectory ??= path.join(privateCacheRoot, 'copernicus-components');
  // Water level is DMI-only even for direct callers with an old need list.
  needs = needs.filter(row => row.component !== 'waterLevel');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cp-component-plan-'));
  try {
    const planInputPath = path.join(temporary, 'input.json');
    await fs.writeFile(planInputPath, JSON.stringify({ parts: parts.map(part => ({ partId: part.partId,
      parentZoneId: part.zoneId ?? part.parentZoneId ?? part.sourceZoneId, waterPoint: part.waterPoint })),
      productionReferenceAt, needs, retentionStartAt, retentionEndAt }), 'utf8');
    const base = { planInputPath, bankPath, cacheDirectory, pythonExecutable, timeoutMs: verificationTimeoutMs };
    let result, transportFailure = null;
    if (budgetMs > 0 && needs.length > 0) {
      try {
        result = await loadCopernicusComponentAuthority({ ...base, timeoutMs: budgetMs + verificationTimeoutMs,
          transportBudget: { budgetMs, requestTimeoutMs, maximumRequests, maximumDownloadBytes } });
      } catch (error) {
        // Checkpointed siblings survive a bounded process/transport failure.
        // Re-verification is offline and cannot start a fresh provider run.
        transportFailure = 'CP_COMPONENT_PRODUCER_FAILED_OR_TIMED_OUT';
        result = await loadCopernicusComponentAuthority(base);
      }
    } else result = await loadCopernicusComponentAuthority(base);
    const all = [...result.candidates, ...result.privateSupportCandidates];
    const index = validateCopernicusComponentCandidates(all, { parts, authority: result.authority });
    return { index, bankSha256: result.bankSha256, summary: { status: result.status, admittedCandidates: result.candidates.length,
      privateSupportCandidates: result.privateSupportCandidates.length, remainingNeeds: result.remainingNeeds.length,
      recordFailures: result.recordFailures.length, attempts: result.attempts.length,
      invalidOriginalRecordsReleasedForRetry: result.invalidOriginalRecordsReleasedForRetry,
      retryableAttempts: result.attempts.filter(row => row.status === 'RETRYABLE_ERROR').length,
      retryableReasons: copernicusRetryableReasonCounts(result.attempts), transportFailure,
      // Offline re-verification recovers the bank, not the interrupted
      // invocation's attempt log. Zero recovered attempts is not zero work.
      attemptCountsComplete: transportFailure === null } };
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
