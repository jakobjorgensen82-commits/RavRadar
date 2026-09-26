import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { buildWeatherComponentNeeds, openMeteoGapPairsFromWeatherNeeds,
  DMI_ONLY_WEATHER_COMPONENTS } from './weather-component-needs.mjs';
import { loadOpenMeteoPartRuntime, runOpenMeteoPartRuntime } from './open-meteo-part-runtime.mjs';
import { runCopernicusComponentRuntime } from './copernicus-component-runtime.mjs';
import { createWeatherComponentSelectionHistory, snapshotWeatherComponentSelectionHistory } from './weather-component-selection-history.mjs';
import { SCORING_RESERVE_COMPONENTS } from './ravscore-production-adapters.mjs';

const HISTORY_MAX_BYTES = 128 * 1024 * 1024;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function readHistory(file) {
  const stat = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (!stat) return null;
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > HISTORY_MAX_BYTES) {
    throw new Error('WEATHER_COMPONENT_SELECTION_FILE_INVALID');
  }
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function copernicusPassSummary(summary, { requestedNeeds, budgetMs, outcome }) {
  const count = key => Number.isSafeInteger(summary?.[key]) && summary[key] >= 0 ? summary[key] : null;
  return { requestedNeeds, budgetMs, outcome,
    status: summary?.status ?? null,
    attempts: count('attempts'), retryableAttempts: count('retryableAttempts'),
    retryableReasons: Object.fromEntries(Object.entries(summary?.retryableReasons ?? {})
      .filter(([key, value]) => /^CP_[A-Z0-9_]{1,80}$/.test(key) && Number.isSafeInteger(value) && value >= 0)),
    remainingNeeds: count('remainingNeeds'),
    transportFailure: summary?.transportFailure ?? (outcome === 'FAILED' ? 'CP_COMPONENT_REFRESH_FAILED' : null),
    attemptCountsComplete: outcome !== 'FAILED' && summary?.attemptCountsComplete !== false
      && !summary?.transportFailure && count('attempts') !== null && count('retryableAttempts') !== null,
  };
}

function copernicusCombinedSummary(snapshot, passes, after) {
  const attempted = Object.values(passes).filter(Boolean);
  if (!snapshot && !attempted.length) return null;
  const reasons = {};
  for (const pass of attempted) {
    for (const [code, count] of Object.entries(pass.retryableReasons)) reasons[code] = (reasons[code] ?? 0) + count;
  }
  // Candidate/record counts describe the final verified bank. Attempt totals
  // describe BOTH acquisitions, not merely the last (upgrade) invocation.
  // If an invocation could only be recovered offline, totals are known lower
  // bounds and attemptCountsComplete explicitly says so.
  return { ...snapshot,
    attempts: attempted.reduce((sum, pass) => sum + (pass.attempts ?? 0), 0),
    retryableAttempts: attempted.reduce((sum, pass) => sum + (pass.retryableAttempts ?? 0), 0),
    retryableReasons: Object.fromEntries(Object.entries(reasons).sort(([a], [b]) => a.localeCompare(b, 'en'))),
    transportFailure: attempted.find(pass => pass.transportFailure)?.transportFailure ?? null,
    attemptCountsComplete: attempted.every(pass => pass.attemptCountsComplete),
    remainingNeeds: after.needs.filter(row => SCORING_RESERVE_COMPONENTS.includes(row.component)).length,
    remainingUpgradeNeeds: after.copernicusUpgradeNeeds.length,
    passes,
  };
}

// The outer production job remains the single writer. The source-specific
// loaders independently validate original bytes and central PART identity.
// Passing budget zero is the provider-free saved-weather/code-repair route.
export async function prepareWeatherComponentRuntime({
  privateCacheRoot, parts, productionReferenceAt, retentionStartAt, retentionEndAt,
  readVerifiedHourly, openMeteoSpatialPolicies, copernicusBudgetMs,
  copernicusUpgradeBudgetMs = copernicusBudgetMs, openMeteoBudgetMs,
  copernicusRequestTimeoutMs = 45_000, copernicusMaximumRequests = 32,
  copernicusMaximumDownloadBytes = 96 * 1024 * 1024,
  openMeteoRequestTimeoutMs = 15_000, openMeteoMaximumRetries = 2,
  // Explicit injection allows a small orchestration test without provider calls.
  loadOpenMeteo = loadOpenMeteoPartRuntime, runOpenMeteo = runOpenMeteoPartRuntime,
  runCopernicus = runCopernicusComponentRuntime,
} = {}) {
  if (typeof privateCacheRoot !== 'string' || !path.isAbsolute(privateCacheRoot)
    || path.resolve(privateCacheRoot) === path.parse(privateCacheRoot).root
    || typeof readVerifiedHourly !== 'function'
    || ![copernicusBudgetMs, copernicusUpgradeBudgetMs, openMeteoBudgetMs]
      .every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('WEATHER_COMPONENT_RUNTIME_ARGUMENTS_INVALID');
  }
  await fs.mkdir(privateCacheRoot, { recursive: true, mode: 0o700 });
  if ((await fs.lstat(privateCacheRoot)).isSymbolicLink()) throw new Error('WEATHER_COMPONENT_PRIVATE_ROOT_INVALID');
  const historyPath = path.join(privateCacheRoot, 'weather-component-selection-history.json');
  const history = createWeatherComponentSelectionHistory(await readHistory(historyPath),
    { parts, retentionStartAt, retentionEndAt });
  const inputs = { productionReferenceAt, componentSelectionHistory: history,
    openMeteoComponentIndex: null, copernicusComponentIndex: null };
  const failures = [];
  const copernicusPasses = { critical: null, upgrade: null };
  const common = { privateCacheRoot, parts, productionReferenceAt, retentionStartAt, retentionEndAt };
  const omOptions = { ...common, bankPath: path.join(privateCacheRoot, 'open-meteo-part-component-bank.json'),
    spatialPolicies: openMeteoSpatialPolicies };
  const cpOptions = { ...common, bankPath: path.join(privateCacheRoot, 'copernicus-component-bank.json'),
    cacheDirectory: path.join(privateCacheRoot, 'copernicus-components') };
  let om = null, cp = null;
  let omLoadFailed = false;
  // Load both retained sources before deciding where acquisition is needed.
  try { om = await loadOpenMeteo(omOptions); inputs.openMeteoComponentIndex = om.index; }
  catch { omLoadFailed = true; failures.push('OPEN_METEO_COMPONENT_CACHE_UNAVAILABLE'); }
  const plan = () => buildWeatherComponentNeeds({ parts, productionReferenceAt,
    readVerifiedHourly: part => readVerifiedHourly(part, inputs) });
  try {
    cp = await runCopernicus({ ...cpOptions,
      needs: plan().needs.filter(row => SCORING_RESERVE_COMPONENTS.includes(row.component)), budgetMs: 0 });
    inputs.copernicusComponentIndex = cp.index;
  } catch { failures.push('COPERNICUS_COMPONENT_CACHE_UNAVAILABLE'); }
  const before = plan();
  // Report every necessary missing component, but do not repeatedly spend
  // acquisition budget on fields whose source policy excludes reserves.
  // Water level and its T+3 support are DMI-only, not pending datum admission.
  const refreshCopernicus = async (needs, budgetMs, failureCode, pass) => {
    try {
      cp = await runCopernicus({ ...cpOptions, needs, budgetMs,
        requestTimeoutMs: Math.min(copernicusRequestTimeoutMs, budgetMs),
        maximumRequests: copernicusMaximumRequests, maximumDownloadBytes: copernicusMaximumDownloadBytes });
      inputs.copernicusComponentIndex = cp.index;
      copernicusPasses[pass] = copernicusPassSummary(cp.summary,
        { requestedNeeds: needs.length, budgetMs,
          outcome: cp.summary?.transportFailure ? 'RECOVERED_AFTER_TRANSPORT_FAILURE' : 'COMPLETED' });
    } catch {
      failures.push(failureCode);
      copernicusPasses[pass] = copernicusPassSummary(null,
        { requestedNeeds: needs.length, budgetMs, outcome: 'FAILED' });
      // A failed refresh may already have checkpointed a subset. Bind the
      // actual durable generation, never the pre-refresh in-memory digest.
      try {
        cp = await runCopernicus({ ...cpOptions, needs: [], budgetMs: 0 });
        inputs.copernicusComponentIndex = cp.index;
      } catch {
        cp = null;
        inputs.copernicusComponentIndex = null;
        failures.push('COPERNICUS_COMPONENT_DURABLE_SNAPSHOT_UNAVAILABLE');
      }
    }
  };
  const acquisitionNeeds = before.needs.filter(row => SCORING_RESERVE_COMPONENTS.includes(row.component));
  if (copernicusBudgetMs > 0 && acquisitionNeeds.length) {
    await refreshCopernicus(acquisitionNeeds, copernicusBudgetMs,
      'COPERNICUS_COMPONENT_REFRESH_UNAVAILABLE', 'critical');
  }
  // Persistent physical gaps must not starve every lower-priority upgrade.
  // This separate bounded pass follows the actual gap/challenge pass.
  const afterCriticalCopernicus = plan();
  if (copernicusUpgradeBudgetMs > 0 && afterCriticalCopernicus.copernicusUpgradeNeeds.length) {
    await refreshCopernicus(afterCriticalCopernicus.copernicusUpgradeNeeds,
      copernicusUpgradeBudgetMs, 'COPERNICUS_COMPONENT_UPGRADE_UNAVAILABLE', 'upgrade');
  }
  // Recompute after CP. OM must not fetch every pair just because its own bank
  // is empty, or consume its budget challenging DMI without proved model age.
  const afterCopernicus = plan();
  if (!omLoadFailed) {
    try {
      om = await runOpenMeteo({ ...omOptions,
        requiredPairs: openMeteoGapPairsFromWeatherNeeds(afterCopernicus)
          .filter(row => SCORING_RESERVE_COMPONENTS.includes(row.component)), budgetMs: openMeteoBudgetMs,
        requestTimeoutMs: openMeteoRequestTimeoutMs, maxRetries: openMeteoMaximumRetries });
      inputs.openMeteoComponentIndex = om.index;
    } catch {
      failures.push('OPEN_METEO_COMPONENT_REFRESH_UNAVAILABLE');
      // The read-only loader can return a rebased/empty in-memory bank which
      // has never existed on disk. Even a failed acquisition may have saved
      // newer siblings. An offline checkpoint establishes the exact bank
      // used by scoring and by the private next-generation package.
      try {
        om = await runOpenMeteo({ ...omOptions, requiredPairs: [], budgetMs: 0,
          requestTimeoutMs: openMeteoRequestTimeoutMs, maxRetries: openMeteoMaximumRetries });
        inputs.openMeteoComponentIndex = om.index;
      } catch {
        om = null;
        inputs.openMeteoComponentIndex = null;
        failures.push('OPEN_METEO_COMPONENT_DURABLE_SNAPSHOT_UNAVAILABLE');
      }
    }
  }
  const after = plan();
  return { inputs, historyPath, sourceMarker: {
    schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
    openMeteoBankSha256: om?.bank?.bankSha256 ?? null,
    copernicusBankSha256: cp?.bankSha256 ?? null,
  }, summary: { failures, before: before.summary, afterCopernicus: afterCopernicus.summary,
    after: after.summary, dmiOnlyComponents: [...DMI_ONLY_WEATHER_COMPONENTS],
    pendingAdmissionComponents: [...new Set(after.needs
      .filter(row => !SCORING_RESERVE_COMPONENTS.includes(row.component)
        && !DMI_ONLY_WEATHER_COMPONENTS.includes(row.component)).map(row => row.component))],
    // Attribute remaining CP work at its own boundary, before OM fills gaps.
    copernicus: copernicusCombinedSummary(cp?.summary, copernicusPasses, afterCopernicus), openMeteo: om?.summary ?? null,
    pendingCopernicusUpgrades: after.copernicusUpgradeNeeds.length },
  remainingNeeds: after.needs, dmiOnlyNeeds: after.dmiOnlyNeeds,
  dmiUpgradeNeeds: after.dmiUpgradeNeeds,
  copernicusUpgradeNeeds: after.copernicusUpgradeNeeds };
}

export async function persistWeatherComponentSelections(prepared) {
  const file = prepared?.historyPath;
  if (typeof file !== 'string' || !path.isAbsolute(file)) throw new Error('WEATHER_COMPONENT_HISTORY_PATH_INVALID');
  const document = snapshotWeatherComponentSelectionHistory(prepared.inputs?.componentSelectionHistory);
  const bytes = Buffer.from(`${JSON.stringify(document)}\n`, 'utf8');
  if (bytes.length > HISTORY_MAX_BYTES) throw new Error('WEATHER_COMPONENT_SELECTION_FILE_TOO_LARGE');
  const stat = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (stat && (!stat.isFile() || stat.isSymbolicLink())) throw new Error('WEATHER_COMPONENT_SELECTION_FILE_INVALID');
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await fs.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, { force: true }); }
  return { ...prepared.sourceMarker, selectedComponentsSha256: digest(bytes) };
}
