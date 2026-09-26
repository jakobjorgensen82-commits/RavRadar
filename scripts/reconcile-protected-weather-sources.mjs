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
import { mergeVerifiedProtectedProgressComponents } from './lib/verified-protected-progress-components.mjs';
import { reconcileDmiProgressFiles } from './lib/verified-dmi-progress-inputs.mjs';
import { installComponents } from './weather-component-progress-cache.mjs';

const BANKS = [FILES.openMeteoBank, FILES.copernicusBank,
  FILES.copernicusCurrentDonorBank, FILES.openMeteoCurrentDonorBank];
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
  try {
    const [workingConditions, conditions] = await Promise.all([
      fs.readFile(path.join(root, 'data/live/conditions.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(donorRoot, 'data/live/conditions.json'), 'utf8').then(JSON.parse),
    ]);
    if (!exactHour(workingConditions.generatedAt) || !exactHour(conditions.generatedAt)
      || Date.parse(workingConditions.generatedAt) >= Date.parse(conditions.generatedAt)
      || Date.parse(conditions.generatedAt) > Date.parse(productionReferenceAt)) {
      throw new Error('PAIRED_SOURCE_GENERATION_ORDER_INVALID');
    }
    const donorFiles = await unpackPrivateWeatherComponentPack({
      restoredRoot: donorRoot, outputRoot: path.join(temporary, 'donor-verified'),
      conditions, pythonExecutable,
    });
    const latestFiles = (await Promise.all(BANKS.map(relative => existingFile(root, relative)))).filter(Boolean);
    const merged = await mergeVerifiedProtectedProgressComponents({
      root, progressFiles: latestFiles, progressVerifiedRoot: root,
      temporaryDirectory: temporary, productionReferenceAt,
      completeFiles: donorFiles, completeIsNewer: true, pythonExecutable,
    });
    // The forecast and DMI station stores live in the authenticated bundle's
    // base inventory, outside its component pack. Keep the current runtime
    // cursor; old 15Z is an evidence donor, not today's scheduler authority.
    const dmiDonors = (await Promise.all(Object.values(DMI_FILES)
      .map(relative => existingFile(donorRoot, relative)))).filter(Boolean);
    const dmi = await reconcileDmiProgressFiles({
      root, files: dmiDonors, temporaryDirectory: temporary,
      productionReferenceAt, recoverRuntimeCursor: false,
    });
    const files = [...merged.files, ...dmi.files];
    if (new Set(files.map(file => file.relativePath)).size !== files.length) {
      throw new Error('PAIRED_SOURCE_DUPLICATE_OUTPUT');
    }
    await installComponents(root, files);
    return { schemaVersion: 1, kind: 'PAIRED_PRIVATE_WEATHER_SOURCE_RECONCILIATION',
      sourceComponentsMerged: { openMeteo: merged.openMeteoAdded,
        copernicus: merged.copernicusMerged, currentDonors: merged.currentDonorMerged },
      dmiForecast: dmi.summary.forecast, dmiStations: dmi.summary.stations,
      publicValuesCopied: false, runtimeCursorCopied: false };
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
  } catch {
    console.error('PAIRED_PRIVATE_WEATHER_SOURCE_RECONCILIATION_REJECTED');
    process.exitCode = 1;
  }
}
