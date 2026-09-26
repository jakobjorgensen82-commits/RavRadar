#!/usr/bin/env node
// One-time 11Z/15Z recovery: re-admit the independently protected 15Z
// originals as source evidence, never copy public weather or score state.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unpackPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES as FILES } from './lib/private-weather-component-inventory.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES as DMI_FILES } from './lib/private-weather-progress-files.mjs';
import { mergeVerifiedProtectedProgressComponents,
  protectedProgressUnionFailureCode } from './lib/verified-protected-progress-components.mjs';
import { reconcileDmiProgressFiles } from './lib/verified-dmi-progress-inputs.mjs';
import { installComponents } from './weather-component-progress-cache.mjs';

const BANKS = [FILES.openMeteoBank, FILES.copernicusBank,
  FILES.copernicusCurrentDonorBank, FILES.openMeteoCurrentDonorBank];
const PHASES = new Set(['LOAD_CONDITIONS', 'VERIFY_DONOR_PACK', 'VERIFY_WORKING_BANKS',
  'MERGE_WEATHER_BANKS', 'VERIFY_DMI_DONORS', 'MERGE_DMI', 'INSTALL']);
const OWN_CODES = new Set(['PAIRED_SOURCE_ARGUMENTS_INVALID',
  'PAIRED_SOURCE_GENERATION_ORDER_INVALID', 'PAIRED_SOURCE_FILE_INVALID',
  'PAIRED_SOURCE_DUPLICATE_OUTPUT', 'PAIRED_SOURCE_CLEANUP_PATH_INVALID']);
export function pairedSourceDiagnostic(error) {
  const code = error?.message;
  const safe = OWN_CODES.has(code)
    || [...PHASES].some(phase => code === `PAIRED_SOURCE_${phase}_REJECTED`);
  if (!safe) return 'PAIRED_SOURCE_UNCLASSIFIED';
  const detail = error?.safeDetail;
  const safeDetail = detail === 'PROTECTED_PROGRESS_UNCLASSIFIED'
    || protectedProgressUnionFailureCode({ message: detail }) === detail;
  return `${code}${safeDetail ? ` ${detail}` : ''}`;
}
const exactHour = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z');
const parse = argv => {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!['--root', '--donor-root', '--target-reference', '--report'].includes(key)
      || !argv[index + 1] || args[key]) throw new Error('PAIRED_SOURCE_ARGUMENTS_INVALID');
    args[key] = argv[index + 1];
  }
  if (!args['--root'] || !args['--donor-root'] || !args['--target-reference'] || !args['--report']) {
    throw new Error('PAIRED_SOURCE_ARGUMENTS_INVALID');
  }
  return args;
};
async function existingFile(root, relative) {
  const sourcePath = path.join(root, relative);
  const stat = await fs.lstat(sourcePath).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return null;
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1) throw new Error('PAIRED_SOURCE_FILE_INVALID');
  return { relativePath: relative, sourcePath };
}

export async function reconcileProtectedWeatherSources({
  root, donorRoot, productionReferenceAt,
  pythonExecutable = process.env.PYTHON ?? 'python',
} = {}) {
  if (typeof root !== 'string' || typeof donorRoot !== 'string'
    || !exactHour(productionReferenceAt)) {
    throw new Error('PAIRED_SOURCE_ARGUMENTS_INVALID');
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-paired-source-'));
  let phase = 'LOAD_CONDITIONS';
  try {
    const [workingConditions, conditions] = await Promise.all([
      fs.readFile(path.join(root, 'data/live/conditions.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(donorRoot, 'data/live/conditions.json'), 'utf8').then(JSON.parse),
    ]);
    // generatedAt is the wall-clock build instant (normally with minutes and
    // milliseconds). Only productionReferenceAt identifies a forecast hour.
    if (!exactHour(workingConditions.productionReferenceAt)
      || !exactHour(conditions.productionReferenceAt)
      || Date.parse(workingConditions.productionReferenceAt)
        >= Date.parse(conditions.productionReferenceAt)
      || Date.parse(conditions.productionReferenceAt) > Date.parse(productionReferenceAt)) {
      throw new Error('PAIRED_SOURCE_GENERATION_ORDER_INVALID');
    }
    phase = 'VERIFY_DONOR_PACK';
    const donorFiles = await unpackPrivateWeatherComponentPack({
      restoredRoot: donorRoot, outputRoot: path.join(temporary, 'donor-verified'),
      conditions, pythonExecutable,
    });
    phase = 'VERIFY_WORKING_BANKS';
    const latestFiles = (await Promise.all(BANKS.map(relative => existingFile(root, relative)))).filter(Boolean);
    phase = 'MERGE_WEATHER_BANKS';
    const merged = await mergeVerifiedProtectedProgressComponents({
      root, progressFiles: latestFiles, progressVerifiedRoot: root,
      temporaryDirectory: temporary, productionReferenceAt,
      completeFiles: donorFiles, completeIsNewer: true, pythonExecutable,
    });
    // The forecast and DMI station stores live in the authenticated bundle's
    // base inventory, outside its component pack. Keep the current runtime
    // cursor; old 15Z is an evidence donor, not today's scheduler authority.
    phase = 'VERIFY_DMI_DONORS';
    const dmiDonors = (await Promise.all(Object.values(DMI_FILES)
      .map(relative => existingFile(donorRoot, relative)))).filter(Boolean);
    phase = 'MERGE_DMI';
    const dmi = await reconcileDmiProgressFiles({
      root, files: dmiDonors, temporaryDirectory: temporary,
      productionReferenceAt, recoverRuntimeCursor: false,
    });
    const files = [...merged.files, ...dmi.files];
    if (new Set(files.map(file => file.relativePath)).size !== files.length) {
      throw new Error('PAIRED_SOURCE_DUPLICATE_OUTPUT');
    }
    phase = 'INSTALL';
    await installComponents(root, files);
    return { schemaVersion: 1, kind: 'PAIRED_PRIVATE_WEATHER_SOURCE_RECONCILIATION',
      sourceComponentsMerged: { openMeteo: merged.openMeteoAdded,
        copernicus: merged.copernicusMerged, currentDonors: merged.currentDonorMerged },
      dmiForecast: dmi.summary.forecast, dmiStations: dmi.summary.stations,
      publicValuesCopied: false, runtimeCursorCopied: false };
  } catch (error) {
    // Public Actions logs get a fixed phase code, never a provider response,
    // private path or exception text from the authenticated inputs.
    if (OWN_CODES.has(error?.message)) throw error;
    if (!PHASES.has(phase)) throw new Error('PAIRED_SOURCE_UNCLASSIFIED');
    const failure = new Error(`PAIRED_SOURCE_${phase}_REJECTED`, { cause: error });
    if (phase === 'MERGE_WEATHER_BANKS') {
      failure.safeDetail = protectedProgressUnionFailureCode(error);
    }
    throw failure;
  } finally {
    const resolved = path.resolve(temporary);
    const parent = await fs.realpath(os.tmpdir());
    const actualParent = await fs.realpath(path.dirname(resolved));
    if (actualParent !== parent || !path.basename(resolved).startsWith('rr-paired-source-')) {
      throw new Error('PAIRED_SOURCE_CLEANUP_PATH_INVALID');
    }
    await fs.rm(resolved, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parse(process.argv.slice(2));
    const result = await reconcileProtectedWeatherSources({
      root: path.resolve(args['--root']), donorRoot: path.resolve(args['--donor-root']),
      productionReferenceAt: args['--target-reference'],
    });
    await fs.writeFile(path.resolve(args['--report']), `${JSON.stringify(result)}\n`, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(pairedSourceDiagnostic(error));
    process.exitCode = 1;
  }
}
