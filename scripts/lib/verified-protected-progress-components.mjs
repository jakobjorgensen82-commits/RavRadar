// Reconcile an authenticated acquisition snapshot with its still-protected
// production baseline before either generation becomes the next working set.
// Both sides are re-admitted from original provider bytes, never public JSON.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unpackPrivateWeatherComponentPack } from './private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE } from './private-weather-component-inventory.mjs';
import { OPEN_METEO_NATIVE_NEAREST_POLICIES } from './open-meteo-part-bank.mjs';
import { mergeVerifiedOpenMeteoGenerations } from './verified-open-meteo-generation-union.mjs';
import { reconcileDmiProgressFiles } from './verified-dmi-progress-inputs.mjs';
import { RESEARCH_HISTORY_HOURS } from './weather-history-retention.mjs';
import { OPEN_METEO_FUTURE_HOURS } from './open-meteo-forecast-window.mjs';

const CP_RUNNER = fileURLToPath(new URL('../run-copernicus-weather-components.py', import.meta.url));
const CURRENT_DONOR_RUNNER = fileURLToPath(new URL('../merge-verified-current-donor-banks.py', import.meta.url));
const CP_ORIGINAL = /^(?:objects\/[0-9a-f]{64}\.nc|receipts\/[0-9a-f]{64}-[0-9a-f]{64}\.json|static\/[0-9a-f]{64}\.json)$/;
const HOUR = 3_600_000;
const exactHour = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z');
// Report only these static codes. Provider responses, private paths and other
// exception messages must never escape into a public Actions log.
const SAFE_FAILURE_CODES = new Set([
  'PROTECTED_PROGRESS_ARGUMENTS_INVALID', 'PROTECTED_PROGRESS_BASE_INVALID',
  'PROTECTED_PROGRESS_TARGET_HOUR_INVALID', 'PROTECTED_PROGRESS_TARGETS_INVALID',
  'PROTECTED_PROGRESS_BASE_UNPACK_FAILED', 'PROTECTED_PROGRESS_OPEN_METEO_MERGE_FAILED',
  'PROTECTED_PROGRESS_CP_MERGE_TIMEOUT', 'PROTECTED_PROGRESS_CP_MERGE_UNAVAILABLE',
  'PROTECTED_PROGRESS_CP_MERGE_REJECTED', 'PROTECTED_PROGRESS_CP_MERGE_FILE_INVALID',
  'PROTECTED_PROGRESS_CP_MERGE_REPORT_INVALID', 'PROTECTED_PROGRESS_DUPLICATE_OUTPUT',
  'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_TIMEOUT',
  'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_UNAVAILABLE',
  'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_REJECTED',
  'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_REPORT_INVALID',
]);
export const protectedProgressUnionFailureCode = error => SAFE_FAILURE_CODES.has(error?.message)
  ? error.message : 'PROTECTED_PROGRESS_UNCLASSIFIED';
const fileOf = (files, relativePath) => files.find(file => file.relativePath === relativePath) ?? null;

async function runPython(pythonExecutable, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [CP_RUNNER, ...args], {
      windowsHide: true, stdio: 'ignore', env: { ...process.env, PYTHONUTF8: '1' },
    });
    const timer = setTimeout(() => { child.kill(); reject(new Error('PROTECTED_PROGRESS_CP_MERGE_TIMEOUT')); }, 180_000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('PROTECTED_PROGRESS_CP_MERGE_UNAVAILABLE')); });
    child.once('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error('PROTECTED_PROGRESS_CP_MERGE_REJECTED'));
    });
  });
}

async function cpOriginalFiles(directory, prefix = '') {
  const result = [];
  for (const item of await fs.readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) result.push(...await cpOriginalFiles(directory, relative));
    else if (item.isFile() && CP_ORIGINAL.test(relative)) result.push({
      relativePath: `.cache/copernicus-components/${relative}`,
      sourcePath: path.join(directory, relative),
    });
    else throw new Error('PROTECTED_PROGRESS_CP_MERGE_FILE_INVALID');
  }
  return result;
}

export async function mergeVerifiedProtectedProgressComponents({
  root, progressFiles, progressVerifiedRoot, temporaryDirectory, productionReferenceAt,
  completeFiles = null, completeIsNewer = false,
  pythonExecutable = process.env.PYTHON ?? 'python',
} = {}) {
  if (!Array.isArray(progressFiles) || typeof root !== 'string' || typeof progressVerifiedRoot !== 'string'
    || typeof temporaryDirectory !== 'string' || typeof completeIsNewer !== 'boolean'
    || (completeIsNewer && completeFiles === null)) {
    throw new Error('PROTECTED_PROGRESS_ARGUMENTS_INVALID');
  }
  const dmi = await reconcileDmiProgressFiles({ root, files: progressFiles, temporaryDirectory, productionReferenceAt });
  progressFiles = dmi.files;
  let protectedFiles = completeFiles;
  if (protectedFiles !== null && !Array.isArray(protectedFiles)) throw new Error('PROTECTED_PROGRESS_BASE_INVALID');
  if (protectedFiles === null) {
    const protectedPack = path.join(root, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
    const stat = await fs.lstat(protectedPack).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) return { files: progressFiles, openMeteoAdded: 0, copernicusMerged: false,
      currentDonorMerged: { copernicus: false, openMeteo: false }, dmiProgress: dmi.summary };
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('PROTECTED_PROGRESS_BASE_INVALID');
  }
  // GitHub's production-hour lock uses seconds; component records use .000Z.
  // Accept both spellings of the same exact UTC hour, without rounding times.
  if (!exactHour(productionReferenceAt)) throw new Error('PROTECTED_PROGRESS_TARGET_HOUR_INVALID');
  productionReferenceAt = new Date(productionReferenceAt).toISOString();
  if (protectedFiles === null) {
    const conditions = JSON.parse(await fs.readFile(path.join(root, 'data/live/conditions.json'), 'utf8'));
    protectedFiles = await unpackPrivateWeatherComponentPack({
      restoredRoot: root,
      outputRoot: path.join(temporaryDirectory, 'protected-verified'),
      conditions, pythonExecutable,
    }).catch(() => { throw new Error('PROTECTED_PROGRESS_BASE_UNPACK_FAILED'); });
  }
  const registry = JSON.parse(await fs.readFile(path.join(root, 'data/live/coastal-parts-v2.json'), 'utf8'));
  const parts = Object.entries(registry.zones ?? {}).flatMap(([zoneId, rows]) =>
    rows.map(part => ({ ...part, zoneId })));
  if (parts.length !== registry.partCount || parts.length < 1) {
    throw new Error('PROTECTED_PROGRESS_TARGETS_INVALID');
  }
  let files = [...progressFiles];
  let openMeteoAdded = 0;
  const latestOm = fileOf(files, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank);
  const protectedOm = fileOf(protectedFiles, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank);
  if (protectedOm && (latestOm || completeIsNewer)) {
    const latest = latestOm ? JSON.parse(await fs.readFile(latestOm.sourcePath, 'utf8')) : null;
    const complete = JSON.parse(await fs.readFile(protectedOm.sourcePath, 'utf8'));
    const reference = Date.parse(productionReferenceAt);
    let merged;
    try {
      merged = mergeVerifiedOpenMeteoGenerations(
        completeIsNewer ? complete : latest, completeIsNewer ? latest : complete, {
        parts, spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES,
        retentionStartAt: new Date(reference - RESEARCH_HISTORY_HOURS * HOUR).toISOString(),
        retentionEndAt: new Date(reference + (OPEN_METEO_FUTURE_HOURS - 1) * HOUR).toISOString(),
      });
    } catch { throw new Error('PROTECTED_PROGRESS_OPEN_METEO_MERGE_FAILED'); }
    openMeteoAdded = merged.records.length - (latest?.records ?? []).filter(row =>
      row.validTime >= merged.retention.startAt && row.validTime <= merged.retention.endAt).length;
    const destination = path.join(temporaryDirectory, 'merged-open-meteo-bank.json');
    await fs.writeFile(destination, `${JSON.stringify(merged)}\n`, { flag: 'wx', mode: 0o600 });
    if (latestOm) files = files.map(file => file === latestOm ? { ...file, sourcePath: destination } : file);
    else files.push({ relativePath: PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, sourcePath: destination });
  }
  let copernicusMerged = false;
  const latestCp = fileOf(files, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank);
  const protectedCp = fileOf(protectedFiles, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank);
  if (protectedCp && (latestCp || completeIsNewer)) {
    const outputRoot = path.join(temporaryDirectory, 'merged-copernicus');
    const summary = path.join(temporaryDirectory, 'merged-copernicus-summary.json');
    await runPython(pythonExecutable, [
      '--merge-generations', '--bank', completeIsNewer ? protectedCp.sourcePath : latestCp.sourcePath,
      '--cache-directory', completeIsNewer
        ? path.join(path.dirname(protectedCp.sourcePath), 'copernicus-components')
        : path.join(progressVerifiedRoot, '.cache/copernicus-components'),
      '--complete-bank', completeIsNewer ? (latestCp ?? protectedCp).sourcePath : protectedCp.sourcePath,
      '--complete-cache-directory', completeIsNewer
        ? latestCp
          ? path.join(progressVerifiedRoot, '.cache/copernicus-components')
          : path.join(path.dirname(protectedCp.sourcePath), 'copernicus-components')
        : path.join(path.dirname(protectedCp.sourcePath), 'copernicus-components'),
      '--merge-output-root', outputRoot,
      '--target-registry', path.join(root, 'data/live/coastal-parts-v2.json'),
      '--target-reference', productionReferenceAt,
      '--output', summary,
    ]);
    const report = JSON.parse(await fs.readFile(summary, 'utf8'));
    if (report.kind !== 'CP_COMPONENT_DUAL_GENERATION_STAGE' || !/^sha256:[0-9a-f]{64}$/.test(report.bankSha256)) {
      throw new Error('PROTECTED_PROGRESS_CP_MERGE_REPORT_INVALID');
    }
    files = files.filter(file => file.relativePath !== PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank
      && !file.relativePath.startsWith('.cache/copernicus-components/'));
    files.push({ relativePath: PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank,
      sourcePath: path.join(outputRoot, 'bank.json') });
    files.push(...await cpOriginalFiles(path.join(outputRoot, 'cache')));
    copernicusMerged = true;
  }
  const currentDonorMerged = { copernicus: false, openMeteo: false };
  for (const [name, relativePath, kind, reportKind] of [
    ['copernicus', PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentDonorBank,
      'copernicus', 'COPERNICUS_CURRENT_DONOR_GENERATION_UNION'],
    ['openMeteo', PRIVATE_WEATHER_COMPONENT_FILES.openMeteoCurrentDonorBank,
      'open-meteo', 'OPEN_METEO_CURRENT_DONOR_GENERATION_UNION'],
  ]) {
    const latest = fileOf(files, relativePath);
    const complete = fileOf(protectedFiles, relativePath);
    if (!complete || (!latest && !completeIsNewer)) continue;
    const output = path.join(temporaryDirectory, `merged-${name}-current-donor.json`);
    const reportPath = path.join(temporaryDirectory, `merged-${name}-current-donor-report.json`);
    await runCurrentDonorPython(pythonExecutable, [
      '--kind', kind,
      '--latest', completeIsNewer ? complete.sourcePath : latest.sourcePath,
      '--complete', completeIsNewer ? (latest ?? complete).sourcePath : complete.sourcePath,
      '--targets', path.join(root, 'data/live/coastal-parts-v2.json'),
      '--target-reference', productionReferenceAt, '--output', output, '--report', reportPath,
    ]);
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    if (report.schemaVersion !== 1 || report.kind !== reportKind
      || !Number.isSafeInteger(report.recordCount) || report.recordCount < 0) {
      throw new Error('PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_REPORT_INVALID');
    }
    if (latest) files = files.map(file => file === latest ? { ...file, sourcePath: output } : file);
    else files.push({ relativePath, sourcePath: output });
    currentDonorMerged[name] = true;
  }
  const names = files.map(file => file.relativePath);
  if (new Set(names).size !== names.length) throw new Error('PROTECTED_PROGRESS_DUPLICATE_OUTPUT');
  return { files, openMeteoAdded, copernicusMerged, currentDonorMerged, dmiProgress: dmi.summary };
}

async function runCurrentDonorPython(pythonExecutable, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [CURRENT_DONOR_RUNNER, ...args], {
      windowsHide: true, stdio: 'ignore', env: { ...process.env, PYTHONUTF8: '1' },
    });
    const timer = setTimeout(() => { child.kill(); reject(new Error('PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_TIMEOUT')); }, 180_000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_UNAVAILABLE')); });
    child.once('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error('PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_REJECTED'));
    });
  });
}
