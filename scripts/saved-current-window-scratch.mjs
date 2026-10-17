// Read-only external diagnosis. Every mutation is confined to an owned Git scratch.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { weatherComponentProgressCache, WEATHER_PROGRESS_CIPHER_PATH } from './weather-component-progress-cache.mjs';
import { copernicusOfflineEnvironment } from './lib/copernicus-offline-environment.mjs';
import { selectRavScoreProductionInitialState } from './lib/ravscore-production-part-pipeline.mjs';
import { assertCandidateGRollbackContinuation } from './lib/ravscore-candidate-g-rollback-runtime.mjs';

export const SAVED_CURRENT_WINDOW_SCOPE = Object.freeze({
  source: '39005745097-1', target: '2026-10-17T05:00:00.000Z',
  cacheKey: 'weather-private-progress-encrypted-v2-Linux-main-39005745097-1',
});
const fault = code => { throw Object.assign(new Error(code), { scratchCode: code }); };
const canonical = value => JSON.stringify(value, (_key, row) => row && typeof row === 'object' && !Array.isArray(row)
  ? Object.fromEntries(Object.keys(row).sort().map(k => [k, row[k]])) : row);
const codes = new Set(['RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY', 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED',
  'RAVSCORE_RECOVERY_REPLAY_CONFLICT', 'WEATHER_CACHE_ONLY_NETWORK_DISABLED', 'SAVED_CURRENT_WINDOW_NETWORK_DISABLED',
  'RAVSCORE_CURRENT_WINDOW_DIAGNOSTIC_UNAVAILABLE', 'SAVED_CURRENT_WINDOW_INPUT_CHANGED',
  'SAVED_CURRENT_WINDOW_BASELINE_PAIR_REQUIRED', 'SAVED_CURRENT_WINDOW_PROGRESS_REJECTED',
  'SAVED_CURRENT_WINDOW_PROCESS_TIMEOUT', 'SAVED_CURRENT_WINDOW_PROCESS_UNAVAILABLE',
  'SAVED_CURRENT_WINDOW_LOG_BOUND', 'SAVED_CURRENT_WINDOW_SCRATCH_INVALID']);
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 8192;
const enums = new Set(['SAME', 'TRUE_TO_FALSE', 'FALSE_TO_TRUE', 'INCREASED', 'DECREASED', 'CHANGED']);
const categories = new Set(['SAME_WINDOW', 'TIME_WINDOW_SHAPE_CHANGED', 'SAVED_KNOWN_BECOMES_UNKNOWN',
  'NEW_VALID_EVIDENCE_FILLS_SAVED_UNKNOWN', 'METADATA_ONLY_DIFFERENCE']);
const metadataKeys = ['ReferenceAt', 'MemoryReady', 'MemoryStatus', 'MemoryWindowHours', 'MemoryCoverageHours'];
const evidenceKeys = ['savedRowCount', 'reconstructedRowCount', 'commonTimeCount', 'savedOnlyTimeCount',
  'reconstructedOnlyTimeCount', 'orderedTimeMismatchCount', 'unknownToKnownCount', 'knownToUnknownCount',
  'nullMaskMismatchAtSameTimeCount'];
const bool = value => typeof value === 'boolean';

// Re-project, do not forward arbitrary JSON from a child or its raw exception.
export function fixedCurrentWindowReport(value) {
  if (value?.schemaVersion !== 1 || value?.kind !== 'RAVSCORE_INITIAL_CURRENT_WINDOW_DIAGNOSTIC'
    || value.privatePayloadIncluded !== false || value.valuesIncluded !== false
    || value.sourceIdentifiersIncluded !== false || value.coordinatesIncluded !== false
    || value.timesIncluded !== false || value.stateMutationPerformed !== false
    || value.continuationIssued !== false || value.productionAuthority !== false) return null;
  if (value.status === 'UNAVAILABLE') return { status: 'UNAVAILABLE', code: codes.has(value.code) ? value.code : 'UNCLASSIFIED' };
  if (value.status !== 'COMPARED' || value.initialSelectionSource !== 'EXISTING_INTEGRATED'
    || value.savedPairNativeGridOrigin !== 'NOT_ESTABLISHED_BY_COMPACT_STATE'
    || value.savedPairValidatedByCurrentContracts !== true || !bool(value.sameWindowGuardMatches)) return null;
  const model = row => {
    if (!row || !categories.has(row.category) || !['metadataMatches', 'timeNullMaskMatches', 'sameWindow'].every(k => bool(row[k]))
      || !metadataKeys.every(k => enums.has(row.metadata?.[k])) || !evidenceKeys.every(k => count(row.evidence?.[k]))) return null;
    return { metadata: Object.fromEntries(metadataKeys.map(k => [k, row.metadata[k]])),
      evidence: Object.fromEntries(evidenceKeys.map(k => [k, row.evidence[k]])),
      metadataMatches: row.metadataMatches, timeNullMaskMatches: row.timeNullMaskMatches,
      sameWindow: row.sameWindow, category: row.category };
  };
  const integrated = model(value.integrated), candidateG = model(value.candidateG);
  const historyKeys = ['rowCount', 'verifiedVectorCount', 'stateOnlyHoldCount', 'missingCount'];
  const families = value.inputCandidateFamilies;
  const familyKeys = ['rowCount', 'copernicusCount', 'openMeteoCount', 'otherOrUnclassifiedCount',
    'dmiNewCoordinateMetadataCount', 'dmiWithoutNewCoordinateMetadataCount'];
  if (!integrated || !candidateG || !historyKeys.every(k => count(value.selectedHistory?.[k]))
    || value.selectedHistory.sourceFamilyNotPreservedByCompactProjection !== true
    || families?.scope !== 'INPUT_CANDIDATES_NOT_SELECTED_SOURCE_COUNTS'
    || !familyKeys.every(k => count(families[k])) || !['dkss_idw', 'dkss_nsbs', 'dkss_lf'].every(k => count(families.dmi?.[k]))) return null;
  return { status: 'COMPARED', initialSelectionSource: 'EXISTING_INTEGRATED',
    savedPairValidatedByCurrentContracts: true, savedPairNativeGridOrigin: 'NOT_ESTABLISHED_BY_COMPACT_STATE',
    selectedHistory: { ...Object.fromEntries(historyKeys.map(k => [k, value.selectedHistory[k]])), sourceFamilyNotPreservedByCompactProjection: true },
    inputCandidateFamilies: { scope: families.scope, ...Object.fromEntries(familyKeys.map(k => [k, families[k]])),
      dmi: Object.fromEntries(['dkss_idw', 'dkss_nsbs', 'dkss_lf'].map(k => [k, families.dmi[k]])) },
    integrated, candidateG, sameWindowGuardMatches: value.sameWindowGuardMatches };
}

export function savedCurrentWindowChildEnvironment(source = process.env) {
  return { ...copernicusOfflineEnvironment(source), NODE_OPTIONS: '--max-old-space-size=8192',
    RAVRADAR_PRODUCTION_TARGET_HOUR: SAVED_CURRENT_WINDOW_SCOPE.target,
    RAVRADAR_WEATHER_CACHE_ONLY: 'true', RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: 'true',
    RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'false', RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: 'false',
    DMI_BULK_CACHE_PATH: '.cache/dmi-candidate-progress.json', DMI_REQUEST_BUDGET: '0', DMI_LIVE_ZONE_BUDGET: '0',
    DMI_MAX_RETRIES: '0', RAVRADAR_COMPONENT_COPERNICUS_BUDGET_MS: '0', RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: '0',
    RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE: 'auto', RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED: 'false' };
}

export async function captureSavedCurrentWindowProcess({ executable, args, root, logRoot, name, environment, maximumMilliseconds }) {
  // Callers below supply only fixed normal commands, never CLI-supplied programs.
  const stdoutPath = path.join(logRoot, `${name}.stdout`), stderrPath = path.join(logRoot, `${name}.stderr`);
  const out = await fs.open(stdoutPath, 'wx', 0o600), err = await fs.open(stderrPath, 'wx', 0o600);
  try {
    return await new Promise(resolve => {
      let child, reason = null, bytes = 0, chain = Promise.resolve();
      try { child = spawn(executable, args, { cwd: root, env: environment, windowsHide: true,
        detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] }); }
      catch { resolve({ exitCode: null, signal: null, code: 'SAVED_CURRENT_WINDOW_PROCESS_UNAVAILABLE', stdoutPath, stderrPath }); return; }
      const stop = code => { reason ??= code; try {
        if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {} };
      const timer = setTimeout(() => stop('SAVED_CURRENT_WINDOW_PROCESS_TIMEOUT'), maximumMilliseconds);
      for (const [stream, handle] of [[child.stdout, out], [child.stderr, err]]) stream.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > 16 * 1024 * 1024) { stop('SAVED_CURRENT_WINDOW_LOG_BOUND'); return; }
        stream.pause(); chain = chain.then(async () => {
          for (let offset = 0; offset < chunk.length;) {
            const written = await handle.write(chunk, offset, chunk.length - offset);
            if (!Number.isSafeInteger(written.bytesWritten) || written.bytesWritten < 1) throw new Error('PRIVATE_LOG_WRITE_FAILED');
            offset += written.bytesWritten;
          }
        }).then(() => stream.resume()).catch(() => stop('SAVED_CURRENT_WINDOW_PROCESS_UNAVAILABLE'));
      });
      child.once('error', () => { reason ??= 'SAVED_CURRENT_WINDOW_PROCESS_UNAVAILABLE'; });
      child.once('close', async (exitCode, signal) => { clearTimeout(timer); await chain;
        resolve({ exitCode, signal, code: reason, stdoutPath, stderrPath }); });
    });
  } finally { await out.close(); await err.close(); }
}

export async function readSavedCurrentWindowProcessReport(result) {
  // Whole private child files already closed before any parsing/filtering.
  const stderr = await fs.readFile(result.stderrPath, 'utf8');
  let firstError = result.code ?? null, diagnostic = null, diagnosticCount = 0;
  for (const line of stderr.split(/\r?\n/)) {
    if (firstError === null) {
      const match = /^Error: ([A-Z][A-Z0-9_]{0,127})$/.exec(line);
      if (match) firstError = codes.has(match[1]) ? match[1] : 'UNCLASSIFIED';
    }
    if (line.startsWith('RAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT ')) {
      diagnosticCount++;
      try { diagnostic = fixedCurrentWindowReport(JSON.parse(line.slice('RAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT '.length))); }
      catch { diagnostic = null; }
    }
  }
  if (diagnosticCount !== 1) diagnostic = null;
  return { status: diagnostic?.status === 'COMPARED' && result.exitCode !== 0
      && firstError === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY' ? 'GUARD_DIAGNOSED' : 'UNAVAILABLE',
    firstErrorCode: firstError ?? (result.exitCode === 0 ? 'UPDATER_COMPLETED_WITHOUT_GUARD' : 'UNCLASSIFIED'),
    exitCode: Number.isInteger(result.exitCode) ? result.exitCode : null,
    originalGuardRejected: firstError === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY' && result.exitCode !== 0,
    ...(diagnostic ? { diagnostic } : {}), wholePrivateChildLogRetained: result.code !== 'SAVED_CURRENT_WINDOW_LOG_BOUND' };
}

export async function prepareSavedCurrentWindowScratch({ scratchRoot, logRoot, payloadRoot, source }) {
  const root = await fs.realpath(scratchRoot), logs = await fs.realpath(logRoot);
  if (root !== path.resolve(scratchRoot) || path.dirname(root) !== path.dirname(logs)
    || path.basename(root) !== 'current-window-source' || !/^[a-f0-9]{64}$/.test(source?.bundleContentSha256 ?? '')) fault('SAVED_CURRENT_WINDOW_SCRATCH_INVALID');
  await installRestoredPrivateRuntime({ restoredRoot: payloadRoot, repositoryRoot: root });
  // The original normal donor is captured before the authenticated progress union.
  await fs.copyFile(path.join(root, 'data/live/dmi-bulk-cache.json'), path.join(root, '.cache/deployed-dmi-bulk-cache.json'), fs.constants.COPYFILE_EXCL);
  const conditions = JSON.parse(await fs.readFile(path.join(root, 'data/live/conditions.json'), 'utf8'));
  const registry = JSON.parse(await fs.readFile(path.join(root, 'data/live/coastal-parts-v2.json'), 'utf8'));
  const model = await import(pathToFileURL(path.join(root, 'js/core/ravscore-model-contract.js')).href);
  if (canonical(conditions.coastalParts?.modelBinding) !== canonical(model.ravScoreModelBinding())) fault('SAVED_CURRENT_WINDOW_INPUT_CHANGED');
  const candidate = conditions.ravScoreCandidateGRollback?.runtime ?? conditions.ravScoreCandidateGWarmup?.runtime;
  const parts = Object.entries(registry.zones ?? {}).flatMap(([zoneId, rows]) => rows.map(part => ({ ...part, zoneId })));
  if (parts.length !== 673 || Object.keys(registry.zones ?? {}).length !== 210) fault('SAVED_CURRENT_WINDOW_BASELINE_PAIR_REQUIRED');
  // An absent S is NOT permission for cold/stateless reconstruction. Every
  // normal selector must use the exact authenticated B continuation pair.
  for (const part of parts) {
    const initial = selectRavScoreProductionInitialState({ part, existingPart: conditions.coastalParts?.parts?.[part.partId],
      targetReferenceAt: SAVED_CURRENT_WINDOW_SCOPE.target });
    if (initial.source !== 'EXISTING_INTEGRATED') fault('SAVED_CURRENT_WINDOW_BASELINE_PAIR_REQUIRED');
    const other = candidate?.parts?.[part.partId]?.ravScoreModel?.currentState;
    assertCandidateGRollbackContinuation(other, part);
    if (other.time !== initial.state.time) fault('SAVED_CURRENT_WINDOW_BASELINE_PAIR_REQUIRED');
  }
  return { repositoryRoot: root, normalProgressBaselineUsed: false, scratchPrepared: true };
}

export async function runSavedCurrentWindowScratch({ scratchRoot, logRoot, basePath, source, repository,
  masterSecret, encryptionKey, pythonExecutable = 'python' }) {
  const root = await fs.realpath(scratchRoot), logs = await fs.realpath(logRoot);
  if (root !== path.resolve(scratchRoot) || path.dirname(root) !== path.dirname(logs)
    || path.basename(root) !== 'current-window-source' || !/^[a-f0-9]{64}$/.test(source?.bundleContentSha256 ?? '')) fault('SAVED_CURRENT_WINDOW_SCRATCH_INVALID');
  const environment = savedCurrentWindowChildEnvironment();
  const run = async (name, executable, args, maximumMilliseconds = 180_000) => {
    const reply = await captureSavedCurrentWindowProcess({ executable, args, root, logRoot: logs, name, environment, maximumMilliseconds });
    if (reply.exitCode !== 0 || reply.signal !== null || reply.code) fault(reply.code ?? 'SAVED_CURRENT_WINDOW_INPUT_CHANGED');
  };
  const restored = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: root, basePath, repository,
    masterSecret, encryptionKey, productionReferenceAt: SAVED_CURRENT_WINDOW_SCOPE.target, resumeOriginalTarget: true, pythonExecutable });
  if (restored.restored !== true || restored.requiresProtectedRestore === true || restored.fileCount < 1
    || restored.restoredProductionReferenceAt !== SAVED_CURRENT_WINDOW_SCOPE.target) fault('SAVED_CURRENT_WINDOW_PROGRESS_REJECTED');
  const py = (name, args) => run(name, pythonExecutable, args);
  await py('registry', ['scripts/build-copernicus-target-registry.py', '--at', SAVED_CURRENT_WINDOW_SCOPE.target,
    '--dmi', '.cache/dmi-candidate-progress.json']);
  await py('closure', ['scripts/build-current-operational-closure.py', '--at', SAVED_CURRENT_WINDOW_SCOPE.target.replace('.000Z', 'Z'),
    '--dmi', '.cache/dmi-candidate-progress.json']);
  await py('pilot', ['scripts/build-live-current-pilot.py', '--at', SAVED_CURRENT_WINDOW_SCOPE.target,
    '--dmi', '.cache/dmi-candidate-progress.json']);
  const execution = await captureSavedCurrentWindowProcess({ executable: process.execPath,
    args: ['--import', pathToFileURL(path.join(root, 'scripts/lib/saved-current-window-network-stop.mjs')).href, 'scripts/update-weather.mjs'],
    root, logRoot: logs, name: 'normal-updater', environment, maximumMilliseconds: 45 * 60_000 });
  return { ...await readSavedCurrentWindowProcessReport(execution), exactOriginalTargetRestoreVerified: true,
    protectedBaselinePairsRequired: true, separateCheckpointCompanionLoaded: false,
    cacheOnly: true, providerRequestsPerformed: false, remoteWrites: false, productionAuthority: false,
    publicationInvoked: false, unchangedNormalUpdater: true, semanticUnionPerformedInPrivateScratch: true,
    privatePayloadIncluded: false, oldOriginalsChanged: false };
}
