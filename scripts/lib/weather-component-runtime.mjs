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

// The outer production job remains the single writer. The source-specific
// loaders independently validate original bytes and central PART identity.
// Passing budget zero is the provider-free saved-weather/code-repair route.
export async function prepareWeatherComponentRuntime({
  privateCacheRoot, parts, productionReferenceAt, retentionStartAt, retentionEndAt,
  readVerifiedHourly, openMeteoSpatialPolicies, copernicusBudgetMs, openMeteoBudgetMs,
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
    || ![copernicusBudgetMs, openMeteoBudgetMs].every(value => Number.isSafeInteger(value) && value >= 0)) {
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
  const acquisitionNeeds = before.needs.filter(row => SCORING_RESERVE_COMPONENTS.includes(row.component));
  if (copernicusBudgetMs > 0 && acquisitionNeeds.length) {
    try {
      cp = await runCopernicus({ ...cpOptions, needs: acquisitionNeeds, budgetMs: copernicusBudgetMs,
        requestTimeoutMs: Math.min(copernicusRequestTimeoutMs, copernicusBudgetMs),
        maximumRequests: copernicusMaximumRequests, maximumDownloadBytes: copernicusMaximumDownloadBytes });
      inputs.copernicusComponentIndex = cp.index;
    } catch {
      failures.push('COPERNICUS_COMPONENT_REFRESH_UNAVAILABLE');
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
    copernicus: cp?.summary ?? null, openMeteo: om?.summary ?? null },
  remainingNeeds: after.needs, dmiOnlyNeeds: after.dmiOnlyNeeds, dmiUpgradeNeeds: after.dmiUpgradeNeeds };
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
