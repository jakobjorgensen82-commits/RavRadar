import { createReadStream } from 'node:fs';
import { readDmiBulkDocument } from './dmi-bulk-storage.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord, readDmiWaterSourceContinuity } from './dmi-forecast-file.mjs';
import { unpackDmiPartContinuity } from './dmi-part-continuity.mjs';
import { buildPartDmiForecastWithProtectedRetention, haversineKm } from './private-dmi-recovery-record.mjs';
import { dmiExpectedIdentityForPart } from './ravscore-production-adapters.mjs';
import { localPartRuntimeProperties } from './local-part-runtime.mjs';
import { buildWaterSourceForecastIndex, unpackWaterSourceForecastContinuity,
  applyWaterSourceForecastStatus } from './water-source-forecast-routing.mjs';
import { assertCoastalPointActivationStateInjection } from './coastal-point-staging-contract.mjs';
import { RESEARCH_HISTORY_HOURS } from './weather-history-retention.mjs';
import { OPEN_METEO_FUTURE_HOURS } from './open-meteo-forecast-window.mjs';
import { OPEN_METEO_NATIVE_NEAREST_POLICIES } from './open-meteo-part-bank.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { buildWeatherComponentNeeds, openMeteoGapPairsFromWeatherNeeds,
  DMI_ONLY_WEATHER_COMPONENTS } from './weather-component-needs.mjs';
import { loadOpenMeteoPartRuntime, loadRetainedOpenMeteoPartIndex, runOpenMeteoPartRuntime } from './open-meteo-part-runtime.mjs';
import { runCopernicusComponentRuntime } from './copernicus-component-runtime.mjs';
import { createWeatherComponentSelectionHistory, snapshotWeatherComponentSelectionHistory } from './weather-component-selection-history.mjs';
import { SCORING_RESERVE_COMPONENTS, verifiedIntegratedPartHourly } from './ravscore-production-adapters.mjs';
import { applyVerifiedWaterSourceRoutingToPartHourly } from './water-source-forecast-routing.mjs';
import { assertWeatherTransportSettlement, isWeatherTransportStopUnproved } from './weather-transport-settlement.mjs';

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
  assertWeatherTransportSettlement();
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
  catch (error) {
    if (isWeatherTransportStopUnproved(error)) throw error;
    assertWeatherTransportSettlement();
    omLoadFailed = true; failures.push('OPEN_METEO_COMPONENT_CACHE_UNAVAILABLE');
  }
  const plan = () => {
    assertWeatherTransportSettlement();
    return buildWeatherComponentNeeds({ parts, productionReferenceAt,
      readVerifiedHourly: part => readVerifiedHourly(part, inputs) });
  };
  try {
    cp = await runCopernicus({ ...cpOptions,
      needs: plan().needs.filter(row => SCORING_RESERVE_COMPONENTS.includes(row.component)), budgetMs: 0 });
    inputs.copernicusComponentIndex = cp.index;
  } catch (error) {
    if (isWeatherTransportStopUnproved(error)) throw error;
    assertWeatherTransportSettlement();
    failures.push('COPERNICUS_COMPONENT_CACHE_UNAVAILABLE');
  }
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
    } catch (error) {
      if (isWeatherTransportStopUnproved(error)) throw error;
      assertWeatherTransportSettlement();
      failures.push(failureCode);
      copernicusPasses[pass] = copernicusPassSummary(null,
        { requestedNeeds: needs.length, budgetMs, outcome: 'FAILED' });
      // A failed refresh may already have checkpointed a subset. Bind the
      // actual durable generation, never the pre-refresh in-memory digest.
      try {
        cp = await runCopernicus({ ...cpOptions, needs: [], budgetMs: 0 });
        inputs.copernicusComponentIndex = cp.index;
      } catch (error) {
        if (isWeatherTransportStopUnproved(error)) throw error;
        assertWeatherTransportSettlement();
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
    } catch (error) {
      if (isWeatherTransportStopUnproved(error)) throw error;
      assertWeatherTransportSettlement();
      failures.push('OPEN_METEO_COMPONENT_REFRESH_UNAVAILABLE');
      // The read-only loader can return a rebased/empty in-memory bank which
      // has never existed on disk. Even a failed acquisition may have saved
      // newer siblings. An offline checkpoint establishes the exact bank
      // used by scoring and by the private next-generation package.
      try {
        om = await runOpenMeteo({ ...omOptions, requiredPairs: [], budgetMs: 0,
          requestTimeoutMs: openMeteoRequestTimeoutMs, maxRetries: openMeteoMaximumRetries });
        inputs.openMeteoComponentIndex = om.index;
      } catch (error) {
        if (isWeatherTransportStopUnproved(error)) throw error;
        assertWeatherTransportSettlement();
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
  let failed = false;
  try {
    const handle = await fs.open(temporary, 'wx', 0o600);
    let writeFailed = false;
    try { await handle.writeFile(bytes); await handle.sync(); }
    catch (error) { writeFailed = true; throw error; }
    finally {
      try { await handle.close(); }
      catch (error) { if (!writeFailed) throw error; }
    }
    await fs.rename(temporary, file);
  } catch (error) { failed = true; throw error; }
  finally {
    try { await fs.rm(temporary, { force: true }); }
    catch (error) { if (!failed) throw error; }
  }
  return { ...prepared.sourceMarker, selectedComponentsSha256: digest(bytes) };
}

// One shared normal scalar applicability boundary; CURRENT keeps its own closure.
export function verifiedPartScalarPlanningHourly({
  part, parentFeature, record, dmiBulkCache, inputs, liveCurrentPilot = null,
  waterSourceRoutingContext, scalarPlanningOnly = false,
}) {
  const componentInputs = { ...inputs, requireNativeGridSampling: false, liveCurrentPilot };
  if (scalarPlanningOnly) componentInputs.scalarPlanningOnly = true;
  const routed = applyVerifiedWaterSourceRoutingToPartHourly({
    part, parentFeature,
    hourly: verifiedIntegratedPartHourly(
      record, dmiBulkCache, `PART::${part.partId}`, part, componentInputs),
    ...waterSourceRoutingContext,
  });
  // This plan consumes only wind/wave/waterLevel/waterTemperature, not current.
  // NEW current is assembled and strictly checked in the score caller.
  return routed.hourly;
}

// Diagnostic state is private to the actual failing operation. Retain the
// original error identity, including an unproved transport-stop brand.
const RETAINED_SCALAR_PLAN_MAX_MS = 300_000;
const retainedScalarFailurePhases = new WeakMap();
const RETAINED_SCALAR_PHASES = new Set([
  'CONTEXT', 'ARGUMENTS', 'LOAD', 'ENCODE', 'PUBLISH', 'TRANSPORT_SETTLEMENT',
  'SNAPSHOT_BEFORE', 'REGISTRY', 'FORECAST', 'DMI_CURRENT', 'DMI_DEPLOYED',
  'DMI_HISTORICAL', 'PART_CONTINUITY', 'POINT_STATE', 'WATER_CONTEXT',
  'SOURCE_CONTINUITY', 'SOURCE_INDEX', 'PART_RETENTION', 'SELECTION_HISTORY',
  'OPEN_METEO_RETAINED', 'COMPONENT_NEEDS', 'COPERNICUS_VERIFY', 'SCALAR_NEEDS',
  'SNAPSHOT_AFTER',
]);
function rememberRetainedScalarFailure(error, phase) {
  if (error !== null && (typeof error === 'object' || typeof error === 'function')
    && !retainedScalarFailurePhases.has(error)) retainedScalarFailurePhases.set(error, phase);
}
export function retainedScalarPlanningFailureDiagnostic(error, fallbackPhase) {
  const phase = retainedScalarFailurePhases.get(error) ?? fallbackPhase;
  let category = 'UNKNOWN_FAILURE';
  if (isWeatherTransportStopUnproved(error)) category = 'TRANSPORT_STOP_UNPROVED';
  else {
    // Never invoke an error getter, serialize its fields or expose raw text.
    let message;
    try { message = Object.getOwnPropertyDescriptor(error, 'message')?.value; } catch {}
    if (message === 'RETAINED_SCALAR_PLANNING_DEADLINE'
      || message === 'CP_COMPONENT_BYTE_VERIFICATION_TIMEOUT') category = 'TIMEOUT';
    else if (message === 'CP_COMPONENT_BYTE_VERIFICATION_FAILED') category = 'CP_VERIFICATION_FAILED';
    else if (message === 'CP_COMPONENT_BYTE_VERIFIER_UNAVAILABLE') category = 'CP_VERIFIER_UNAVAILABLE';
    else if (message === 'CP_COMPONENT_BYTE_AUTHORITY_INVALID') category = 'CP_AUTHORITY_INVALID';
    else if (message === 'RETAINED_SCALAR_SNAPSHOT_CHANGED') category = 'SNAPSHOT_CHANGED';
    else if ([
      'RETAINED_SCALAR_CONTEXT_UNAVAILABLE', 'RETAINED_SCALAR_ARGUMENTS_INVALID',
      'RETAINED_SCALAR_PLAN_SIZE', 'RETAINED_SCALAR_INPUTS_INVALID',
      'RETAINED_SCALAR_SNAPSHOT_ARGUMENTS_INVALID', 'RETAINED_SCALAR_HISTORY_PATH_INVALID',
      'RETAINED_SCALAR_SNAPSHOT_FILE_INVALID', 'RETAINED_SCALAR_METADATA_LIMIT',
      'RETAINED_SCALAR_REGISTRY_INVALID', 'RETAINED_SCALAR_PART_DOMAIN_INVALID',
      'RETAINED_SCALAR_WATER_CONTEXT_INVALID', 'RETAINED_SCALAR_PARENT_MISSING',
      'SCALAR_ENCODING_DOMAIN_INVALID', 'SCALAR_ENCODING_ROW_INVALID',
      'SCALAR_ENCODING_COMPONENT_INVALID', 'SCALAR_ENCODING_REASON_INVALID',
      'SCALAR_ENCODING_SUPPORT_INVALID',
    ].includes(message)) category = 'INPUT_INVALID';
  }
  return { phase: RETAINED_SCALAR_PHASES.has(phase) ? phase : 'LOAD', errorCategory: category };
}

// Offline counterpart of the existing retained-load section above. In
// particular it never calls runOpenMeteoPartRuntime, even with a zero budget.
// CP's existing no-transportBudget arm invokes the fixed --verify-only reader.
export async function loadRetainedWeatherComponentPlanningInputs({
  privateCacheRoot, parts, productionReferenceAt, retentionStartAt, retentionEndAt,
  planningDeadlineAt = Date.now() + RETAINED_SCALAR_PLAN_MAX_MS,
}) {
  let phase = 'TRANSPORT_SETTLEMENT';
  try {
    retainedScalarRemaining(planningDeadlineAt);
    assertWeatherTransportSettlement();
    if (!path.isAbsolute(privateCacheRoot) || !Array.isArray(parts) || !parts.length) {
      throw new Error('RETAINED_SCALAR_INPUTS_INVALID');
    }
    phase = 'SELECTION_HISTORY';
    const historyPath = path.join(privateCacheRoot, 'weather-component-selection-history.json');
    const inputs = { productionReferenceAt,
      componentSelectionHistory: createWeatherComponentSelectionHistory(await readHistory(historyPath),
        { parts, retentionStartAt, retentionEndAt }),
      openMeteoComponentIndex: null, copernicusComponentIndex: null };
    const common = { privateCacheRoot, parts, productionReferenceAt, retentionStartAt, retentionEndAt };
    phase = 'OPEN_METEO_RETAINED';
    inputs.openMeteoComponentIndex = await loadRetainedOpenMeteoPartIndex({ ...common,
      bankPath: path.join(privateCacheRoot, 'open-meteo-part-component-bank.json'),
      spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES });
    retainedScalarRemaining(planningDeadlineAt);
    // Offline verification projects the entire retained Copernicus bank.
    // Compute the actual needs only after all verified indexes are available.
    phase = 'COPERNICUS_VERIFY';
    const cp = await runCopernicusComponentRuntime({ ...common,
      bankPath: path.join(privateCacheRoot, 'copernicus-component-bank.json'),
      cacheDirectory: path.join(privateCacheRoot, 'copernicus-components'),
      needs: [],
      budgetMs: 0, verificationTimeoutMs: retainedScalarRemaining(planningDeadlineAt) });
    retainedScalarRemaining(planningDeadlineAt);
    inputs.copernicusComponentIndex = cp.index;
    phase = 'TRANSPORT_SETTLEMENT';
    assertWeatherTransportSettlement();
    return { inputs };
  } catch (error) {
    rememberRetainedScalarFailure(error, phase);
    throw error;
  }
}

// One shared deadline covers the complete offline retained plan. The CP
// verifier receives only its remaining time; no provider budget is extended.
function retainedScalarRemaining(deadline) {
  const left = deadline - Date.now();
  if (!Number.isSafeInteger(deadline) || left <= 0 || left > RETAINED_SCALAR_PLAN_MAX_MS)
    throw new Error('RETAINED_SCALAR_PLANNING_DEADLINE');
  return left;
}

async function retainedScalarSnapshotDigest(file, optional, deadline) {
  retainedScalarRemaining(deadline);
  let stat;
  try { stat = await fs.lstat(file); }
  catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('RETAINED_SCALAR_SNAPSHOT_FILE_INVALID');
  const digest = createHash('sha256');
  const stream = createReadStream(file, { signal: AbortSignal.timeout(retainedScalarRemaining(deadline)) });
  try {
    for await (const chunk of stream) { retainedScalarRemaining(deadline); digest.update(chunk); }
  } finally {
    // Do not publish a fallback while our hash handle might still be open.
    if (!stream.closed) {
      stream.destroy();
      await new Promise(resolve => stream.once('close', resolve));
    }
  }
  retainedScalarRemaining(deadline);
  return { bytes: stat.size, sha256: `sha256:${digest.digest('hex')}` };
}

// The ordinary workflow already restores/authenticates these files before
// steps 105-106. This loader adds no restore, provider request or source
// authority. Its result is internal planning input, never public coverage.
export async function loadRetainedPartScalarPlanning({
  root, dmiCachePath, productionReferenceAt, historicalCachePath = null,
}) {
  let phase = 'TRANSPORT_SETTLEMENT';
  try {
    assertWeatherTransportSettlement();
    phase = 'ARGUMENTS';
    if (!path.isAbsolute(root) || !path.isAbsolute(dmiCachePath)
      || !/^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(productionReferenceAt)
      || !Number.isFinite(Date.parse(productionReferenceAt))) {
      throw new Error('RETAINED_SCALAR_SNAPSHOT_ARGUMENTS_INVALID');
    }
    const planningDeadlineAt = Date.now() + RETAINED_SCALAR_PLAN_MAX_MS;
    const readBudgeted = async operation => {
      retainedScalarRemaining(planningDeadlineAt);
      const value = await operation();
      retainedScalarRemaining(planningDeadlineAt);
      return value;
    };
    const at = relative => path.join(root, relative);
    const files = {
      dmi: [dmiCachePath, false],
      parts: [at('data/live/coastal-parts-v2.json'), false],
      zones: [at('data/zones.geojson'), false],
      forecast: [at('data/live/dmi-forecast-cache.json'), false],
      stations: [at('data/live/dmi-water-stations.json'), false],
      deployed: [at('.cache/deployed-dmi-bulk-cache.json'), true],
      routing: [at('data/water-level-station-routing.json'), true],
      selection: [at('.cache/weather-component-selection-history.json'), true],
      openMeteo: [at('.cache/open-meteo-part-component-bank.json'), true],
      copernicus: [at('.cache/copernicus-component-bank.json'), true],
      pointState: [at('.cache/coastal-point-staging/activation-state-injection.json'), true],
    };
    if (historicalCachePath !== null) {
      if (!path.isAbsolute(historicalCachePath)) throw new Error('RETAINED_SCALAR_HISTORY_PATH_INVALID');
      files.historical = [historicalCachePath, false];
    }
    const snapshot = async () => {
      const settled = await Promise.allSettled(Object.entries(files).map(async ([key, [file, optional]]) =>
        [key, await retainedScalarSnapshotDigest(file, optional, planningDeadlineAt)]));
      // Every owned stream must settle before any caller may take fallback.
      const failed = settled.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
      retainedScalarRemaining(planningDeadlineAt);
      return Object.fromEntries(settled.map(result => result.value));
    };
    phase = 'SNAPSHOT_BEFORE';
    const before = await snapshot();
    const readJson = async (key, fallback) => {
      if (before[key] === null) return fallback;
      if (before[key].bytes > 64 * 1024 * 1024) throw new Error('RETAINED_SCALAR_METADATA_LIMIT');
      return readBudgeted(async () => JSON.parse(await fs.readFile(files[key][0], 'utf8')));
    };
    phase = 'REGISTRY';
    const contract = await readJson('parts');
    const features = (await readJson('zones'))?.features;
    if (!contract?.enabled || !contract.zones || !Array.isArray(features) || !features.length) {
      throw new Error('RETAINED_SCALAR_REGISTRY_INVALID');
    }
    const parts = Object.entries(contract.zones).flatMap(([zoneId, zoneParts]) =>
      zoneParts.map(part => ({ ...part, zoneId })));
    if (parts.length !== contract.partCount || parts.length < 1 || parts.length > 673
      || features.length > 210 || new Set(parts.map(part => part.partId)).size !== parts.length) {
      throw new Error('RETAINED_SCALAR_PART_DOMAIN_INVALID');
    }
    const parentById = new Map(features.map(feature => [feature.properties?.id, feature]));
    phase = 'FORECAST';
    const forecastStore = await readBudgeted(async () => {
      // Keep the normal whole-file inspector and both continuity readers.
      // This planner never consumes the already-inspected zone forecasts.
      const index = await inspectDmiForecastFile(files.forecast[0]);
      const store = { ...index.metadata };
      if (index.continuity) {
        const entries = [];
        for (const descriptor of index.continuity.entries) {
          entries.push(await readDmiForecastRecord(index, descriptor));
        }
        store.partContinuity = { ...index.continuity.metadata, entries };
      }
      if (index.waterSourceContinuity) {
        store.waterSourceContinuity = await readDmiWaterSourceContinuity(index);
      }
      return store;
    });
    phase = 'DMI_CURRENT';
    const dmiBulkCache = await readBudgeted(() => readDmiBulkDocument(dmiCachePath));
    phase = 'DMI_DEPLOYED';
    const deployedDmiBulkCache = before.deployed === null ? null : await readBudgeted(() => readDmiBulkDocument(files.deployed[0]));
    phase = 'DMI_HISTORICAL';
    const historicalDmiBulkCache = historicalCachePath === null ? null : await readBudgeted(() => readDmiBulkDocument(historicalCachePath));
    phase = 'PART_CONTINUITY';
    const persisted = await unpackDmiPartContinuity(forecastStore.partContinuity, parts, productionReferenceAt);
    phase = 'POINT_STATE';
    const pointState = before.pointState === null ? {}
      : assertCoastalPointActivationStateInjection(await readJson('pointState'));
    phase = 'WATER_CONTEXT';
    const stations = (await readJson('stations'))?.stations;
    const routing = await readJson('routing', { schemaVersion: 1, zones: {} });
    if (!Array.isArray(stations) || !routing?.zones) throw new Error('RETAINED_SCALAR_WATER_CONTEXT_INVALID');
    phase = 'SOURCE_CONTINUITY';
    const retainedSourceIndex = await unpackWaterSourceForecastContinuity(
      forecastStore.waterSourceContinuity, productionReferenceAt);
    phase = 'SOURCE_INDEX';
    const sourceIndex = buildWaterSourceForecastIndex(stations, dmiBulkCache, productionReferenceAt, {
      protectedBulkCache: deployedDmiBulkCache, historicalBulkCache: historicalDmiBulkCache, retainedSourceIndex,
    });
    const sourceRegistry = applyWaterSourceForecastStatus(stations, sourceIndex, productionReferenceAt, { minimumHours: 96 });
    const waterSourceRoutingContext = { sources: sourceRegistry, index: sourceIndex, routing, haversineKm,
      previousRoutingDiagnostic: null, diagnosticReferenceAt: productionReferenceAt };
    phase = 'PART_RETENTION';
    const records = new Map();
    for (const part of parts) {
      retainedScalarRemaining(planningDeadlineAt);
      const parent = parentById.get(part.zoneId);
      if (!parent) throw new Error('RETAINED_SCALAR_PARENT_MISSING');
      const bulkId = `PART::${part.partId}`;
      const expectedIdentity = dmiExpectedIdentityForPart(part, bulkId);
      const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: part.waterPoint },
        properties: localPartRuntimeProperties(parent.properties, part, bulkId) };
      records.set(part.partId, buildPartDmiForecastWithProtectedRetention(feature, dmiBulkCache,
        pointState?.[part.partId] ? null : deployedDmiBulkCache, productionReferenceAt, {
          startAt: productionReferenceAt, expectedIdentity, scalarPlanningOnly: true,
          persistedHourly: pointState?.[part.partId] ? [] : persisted.get(part.partId)?.hourly ?? [],
          historicalBulkCache: pointState?.[part.partId] ? null : historicalDmiBulkCache,
        }));
    }
    const readVerifiedHourly = (part, inputs) => verifiedPartScalarPlanningHourly({
      part, parentFeature: parentById.get(part.zoneId), record: records.get(part.partId),
      dmiBulkCache, inputs, waterSourceRoutingContext, scalarPlanningOnly: true,
    });
    try {
      const retentionStartAt = new Date(Date.parse(productionReferenceAt) - RESEARCH_HISTORY_HOURS * 3600000).toISOString();
      const retentionEndAt = new Date(Date.parse(productionReferenceAt) + (OPEN_METEO_FUTURE_HOURS - 1) * 3600000).toISOString();
      const { inputs } = await loadRetainedWeatherComponentPlanningInputs({ privateCacheRoot: at('.cache'),
        parts, productionReferenceAt, retentionStartAt, retentionEndAt, planningDeadlineAt });
      phase = 'SCALAR_NEEDS';
      const needs = buildWeatherComponentNeeds({ parts, productionReferenceAt, scalarPlanningOnly: true,
        readVerifiedHourly: part => readVerifiedHourly(part, inputs) });
      phase = 'SNAPSHOT_AFTER';
      const after = await snapshot();
      if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('RETAINED_SCALAR_SNAPSHOT_CHANGED');
      // Wave-only parent/Feggesund work remains in the unchanged WAM/scoring
      // caller. No wave coverage or CURRENT availability is claimed here.
      const scalar = row => ['wind', 'waterLevel', 'waterTemperature'].includes(row.component);
      return { productionReferenceAt, parts, snapshotInputHashes: before,
        needs: needs.needs.filter(scalar), dmiUpgradeNeeds: needs.dmiUpgradeNeeds.filter(scalar),
        privateSupportNeeds: needs.privateSupportNeeds };
    } finally {
      records.clear();
      try { assertWeatherTransportSettlement(); }
      catch (error) { rememberRetainedScalarFailure(error, 'TRANSPORT_SETTLEMENT'); throw error; }
    }
  } catch (error) {
    rememberRetainedScalarFailure(error, phase);
    throw error;
  }
}
