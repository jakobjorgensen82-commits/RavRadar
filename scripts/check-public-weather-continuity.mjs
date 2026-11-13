#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializePrivatePublicHourDeliveryPack } from './lib/public-hour-delivery-pack.mjs';
import { hasValue } from './lib/weather-component-needs.mjs';
import { publicDeliveryTransportEntries } from '../js/services/public-delivery-transport-binding.js';
import { readPublicDeliveryJsonFile } from './lib/public-delivery-json-transport.mjs';
import { FUR_WATER_ROUTING_PART_ID, FUR_DIAGNOSIS_CODES, classifyFurWaterLevelLoss }
  from './lib/fur-water-routing-diagnostic.mjs';

const FIELDS = Object.freeze(['wind', 'wave', 'current', 'waterLevel', 'waterTemperature']);
const exactHour = value => typeof value === 'string'
  && Number.isFinite(Date.parse(value)) && Date.parse(value) % 3_600_000 === 0
  && new Date(value).toISOString() === value;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const partIdentity = part => [part?.zoneId, part?.waterPoint, part?.landPoint];

function assertHour(document, { time, datasetId, partCount }) {
  if (document?.datasetId !== datasetId || document?.delivery?.kind !== 'hour'
    || document.delivery.key !== time || !document.coastalParts?.parts
    || Object.keys(document.coastalParts.parts).length !== partCount) {
    throw new Error('PUBLIC_WEATHER_CONTINUITY_HOUR_IDENTITY_INVALID');
  }
  return document.coastalParts.parts;
}

export function comparePublicWeatherHours(previous, current, {
  time,
  previousDatasetId,
  currentDatasetId,
  partCount,
} = {}) {
  const oldParts = assertHour(previous, { time, datasetId: previousDatasetId, partCount });
  const newParts = assertHour(current, { time, datasetId: currentDatasetId, partCount });
  const losses = Object.fromEntries(FIELDS.map(key => [key, 0]));
  const gains = Object.fromEntries(FIELDS.map(key => [key, 0]));
  const lossPartIds = Object.fromEntries(FIELDS.map(key => [key, []]));
  let changedIdentities = 0;
  for (const [partId, oldPart] of Object.entries(oldParts)) {
    const newPart = newParts[partId];
    if (!newPart) {
      changedIdentities += 1;
      continue;
    }
    if (!same(partIdentity(oldPart), partIdentity(newPart))) {
      changedIdentities += 1;
      continue;
    }
    const oldWeather = oldPart?.current?.weather;
    const newWeather = newPart?.current?.weather;
    for (const component of FIELDS) {
      const before = hasValue(oldWeather, component);
      const after = hasValue(newWeather, component);
      if (before && !after) {
        losses[component] += 1;
        // Coastal part IDs are already public. A short sample identifies
        // whether a regression is a single spatial gap or a broad tail loss
        // without exposing any weather value, coordinate or private proof.
        if (lossPartIds[component].length < 8) lossPartIds[component].push(partId);
      }
      if (!before && after) gains[component] += 1;
    }
  }
  return { losses, gains, changedIdentities, lossPartIds };
}

export async function checkPublicWeatherContinuity({
  previousConditionsPath,
  previousPackPath,
  newLiveDirectory,
  temporaryDirectory = os.tmpdir(),
} = {}) {
  const previousConditions = JSON.parse(await fs.readFile(previousConditionsPath, 'utf8'));
  const currentConditions = JSON.parse(await fs.readFile(path.join(newLiveDirectory, 'conditions.json'), 'utf8'));
  const newManifest = JSON.parse(await fs.readFile(path.join(newLiveDirectory, 'manifest.json'), 'utf8'));
  const previousReference = previousConditions.productionReferenceAt;
  const currentReference = newManifest.productionReferenceAt;
  if (!exactHour(previousReference) || !exactHour(currentReference)
    || currentConditions.datasetId !== newManifest.datasetId
    || currentConditions.productionReferenceAt !== currentReference
    || currentReference < previousReference || !Number.isSafeInteger(newManifest.coastalPartCount)
    || newManifest.coastalPartCount < 1 || !newManifest.detailDelivery?.hours) {
    throw new Error('PUBLIC_WEATHER_CONTINUITY_MANIFEST_INVALID');
  }
  const temporaryRoot = await fs.mkdtemp(path.join(temporaryDirectory, 'ravradar-weather-continuity-'));
  try {
    const oldDelivery = await materializePrivatePublicHourDeliveryPack({
      packPath: previousPackPath,
      conditions: previousConditions,
      liveDirectory: temporaryRoot,
    });
    if (oldDelivery.manifest.productionReferenceAt !== previousReference) {
      throw new Error('PUBLIC_WEATHER_CONTINUITY_PREVIOUS_REFERENCE_INVALID');
    }
    const oldTimes = Object.keys(oldDelivery.hours).filter(time => time >= currentReference).sort();
    const strictPlain = newManifest.detailDelivery.coldHoursSchema !== undefined;
    if (strictPlain) publicDeliveryTransportEntries(newManifest);
    const newHours = newManifest.detailDelivery.hours;
    const losses = Object.fromEntries(FIELDS.map(key => [key, 0]));
    const gains = Object.fromEntries(FIELDS.map(key => [key, 0]));
    let changedIdentities = 0;
    let comparedHours = 0;
    const lossHours = [];
    const furDiagnosis = {
      kind: 'FUR_WATER_LEVEL_LOSS_FIXED_CODE_COUNTS',
      lostHours: 0,
      codes: Object.fromEntries(FUR_DIAGNOSIS_CODES.map(code => [code, 0])),
      privatePayloadIncluded: false,
      rawValuesIncluded: false,
      routingCauseProvedByLegacySuccess: false,
    };
    for (const time of oldTimes) {
      const previousDescriptor = oldDelivery.hours[time];
      const currentDescriptor = newHours[time];
      if (!currentDescriptor?.path || !/^\.\/forecast\/[0-9a-f]{64}\.json$/.test(currentDescriptor.path)) {
        throw new Error('PUBLIC_WEATHER_CONTINUITY_HOUR_LOST');
      }
      const previous = (await readPublicDeliveryJsonFile(path.join(temporaryRoot, previousDescriptor.path), previousDescriptor, true)).value;
      const current = (await readPublicDeliveryJsonFile(path.join(newLiveDirectory, currentDescriptor.path), currentDescriptor, strictPlain)).value;
      const compared = comparePublicWeatherHours(previous, current, {
        time,
        previousDatasetId: previousConditions.datasetId,
        currentDatasetId: newManifest.datasetId,
        partCount: newManifest.coastalPartCount,
      });
      // The public example list is capped at eight; diagnosis must not depend
      // on whether Fur happened to fall inside that sample.
      const oldFur = previous.coastalParts.parts[FUR_WATER_ROUTING_PART_ID];
      const newFur = current.coastalParts.parts[FUR_WATER_ROUTING_PART_ID];
      if (oldFur && newFur && same(partIdentity(oldFur), partIdentity(newFur))
        && hasValue(oldFur.current?.weather, 'waterLevel')
        && !hasValue(newFur.current?.weather, 'waterLevel')) {
        furDiagnosis.lostHours += 1;
        const code = classifyFurWaterLevelLoss({ previousConditions, currentConditions, time });
        furDiagnosis.codes[code] += 1;
      }
      for (const component of FIELDS) {
        losses[component] += compared.losses[component];
        gains[component] += compared.gains[component];
      }
      if (Object.values(compared.losses).some(count => count > 0)) {
        lossHours.push({ time, losses: compared.losses,
          examplePartIds: compared.lossPartIds });
      }
      changedIdentities += compared.changedIdentities;
      comparedHours += 1;
    }
    const result = {
      schemaVersion: 1,
      previousReference,
      currentReference,
      comparedHours,
      comparedPartHours: comparedHours * newManifest.coastalPartCount,
      changedIdentities,
      losses,
      gains,
      lossHours,
      furWaterLevelDiagnosis: furDiagnosis,
      // A normal run cannot silently redefine the 673 approved coastal
      // identities to evade comparison. Geometry changes require their own
      // explicitly audited migration, not an automatic weather refresh.
      passed: changedIdentities === 0
        && Object.values(losses).every(count => count === 0),
    };
    return result;
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

const SAVED_PUBLIC_ORIGIN = 'https://ravradar.dk/data/live/';
const SAVED_MAX_MANIFEST_BYTES = 1024 * 1024;
const SAVED_MAX_PHYSICAL_HOUR_BYTES = 512 * 1024 * 1024;
const SAVED_CONTINUITY_TIMEOUT_MS = 5 * 60_000;

function savedContinuityFailure(code) {
  return new Error('SAVED_PUBLIC_CONTINUITY_' + code);
}

async function readSavedPublicManifest(file) {
  const expected = await fs.lstat(file);
  if (!expected.isFile()) throw savedContinuityFailure('MANIFEST_FILE');
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.dev !== expected.dev || stat.ino !== expected.ino
      || stat.size < 2 || stat.size > SAVED_MAX_MANIFEST_BYTES) {
      throw savedContinuityFailure('MANIFEST_FILE');
    }
    const bytes = Buffer.alloc(stat.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(bytes, length, bytes.length - length, length);
      if (result.bytesRead === 0) break;
      length += result.bytesRead;
    }
    if (length !== stat.size) throw savedContinuityFailure('MANIFEST_FILE');
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)));
  } finally {
    await handle.close();
  }
}

function savedPublicHourEntries(manifest) {
  if (manifest?.schemaVersion !== 4 || manifest.complete !== true || manifest.zoneCount !== 210
    || manifest.coastalPartCount !== 673 || !exactHour(manifest.productionReferenceAt)
    || typeof manifest.datasetId !== 'string' || !manifest.datasetId
    || typeof manifest.generatedAt !== 'string' || !Number.isFinite(Date.parse(manifest.generatedAt))
    || !manifest.ravScoreModelBinding || !manifest.detailDelivery) {
    throw savedContinuityFailure('MANIFEST_SHAPE');
  }
  let hours;
  try { hours = publicDeliveryTransportEntries(manifest).filter(entry => entry.kind === 'hour'); }
  catch { throw savedContinuityFailure('DESCRIPTOR'); }
  if (hours.length !== 118) throw savedContinuityFailure('HOUR_INVENTORY');
  return hours;
}

export async function checkSavedCurrentPublicWeatherContinuity({
  previousManifestPath,
  previousManifestJson,
  expectedPublicManifestSha256,
  newLiveDirectory,
  fetchImpl = globalThis.fetch,
  deadlineSignal,
} = {}) {
  if (!/^[a-f0-9]{64}$/.test(expectedPublicManifestSha256 ?? '')) {
    throw savedContinuityFailure('PREDECESSOR_PIN');
  }
  const localDeadline = AbortSignal.timeout(SAVED_CONTINUITY_TIMEOUT_MS);
  const deadline = deadlineSignal ? AbortSignal.any([localDeadline, deadlineSignal]) : localDeadline;
  const expires = performance.now() + SAVED_CONTINUITY_TIMEOUT_MS;
  const checkDeadline = () => {
    if (deadline.aborted || performance.now() >= expires) throw savedContinuityFailure('DEADLINE');
  };
  const { sha256CanonicalJson } = await import('./ravscore-operational-pages-recovery.mjs');
  const { readExactMapResponse } = await import('./lib/public-map-hour-pages.mjs');
  const { assertPublicDeliveryDocument } = await import('../js/core/public-delivery-contract.js');
  const { readPublicDeliveryJsonBytes } = await import('./lib/public-delivery-json-transport.mjs');
  checkDeadline();
  const manifestFromFile = previousManifestPath !== undefined;
  const manifestFromMemory = previousManifestJson !== undefined;
  if (manifestFromFile === manifestFromMemory
    || (manifestFromMemory && (typeof previousManifestJson !== 'string'
      || Buffer.byteLength(previousManifestJson) < 2 || Buffer.byteLength(previousManifestJson) > SAVED_MAX_MANIFEST_BYTES))) {
    throw savedContinuityFailure('MANIFEST_FILE');
  }
  const previous = manifestFromFile
    ? await readSavedPublicManifest(previousManifestPath) : JSON.parse(previousManifestJson);
  if (sha256CanonicalJson(previous) !== expectedPublicManifestSha256) {
    throw savedContinuityFailure('PREDECESSOR_PIN');
  }
  const currentPath = path.join(newLiveDirectory, 'manifest.json');
  const current = await readSavedPublicManifest(currentPath);
  const currentManifestSha256 = sha256CanonicalJson(current);
  const oldHours = savedPublicHourEntries(previous);
  const newHours = new Map(savedPublicHourEntries(current).map(entry => [entry.key, entry]));
  if (current.productionReferenceAt <= previous.productionReferenceAt
    || current.datasetId === previous.datasetId
    || sha256CanonicalJson(current.ravScoreModelBinding) !== sha256CanonicalJson(previous.ravScoreModelBinding)) {
    throw savedContinuityFailure('GENERATION');
  }
  const overlap = oldHours.filter(entry => entry.key >= current.productionReferenceAt);
  if (!overlap.length || overlap.some(entry => !newHours.has(entry.key))) {
    throw savedContinuityFailure('OVERLAP');
  }
  // publicDeliveryTransportEntries has already checked the content-addressed
  // physical path, byte bounds and complete 118-hour axis of both manifests.
  const plannedBytes = overlap.reduce((bytes, entry) => bytes + entry.bytes, 0);
  if (plannedBytes > SAVED_MAX_PHYSICAL_HOUR_BYTES) throw savedContinuityFailure('PHYSICAL_BYTES');
  const losses = Object.fromEntries(FIELDS.map(key => [key, 0]));
  const gains = Object.fromEntries(FIELDS.map(key => [key, 0]));
  let changedIdentities = 0;
  for (const oldEntry of overlap) {
    checkDeadline();
    const newEntry = newHours.get(oldEntry.key);
    const signal = AbortSignal.any([deadline, AbortSignal.timeout(30_000)]);
    let oldHour, newHour;
    try {
      const response = await fetchImpl(new URL(oldEntry.path, SAVED_PUBLIC_ORIGIN), {
        redirect: 'error', credentials: 'omit', cache: 'no-store', signal,
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        throw savedContinuityFailure('HOUR_HTTP');
      }
      const oldBytes = await readExactMapResponse(response, oldEntry.bytes);
      oldHour = (await readPublicDeliveryJsonBytes(oldBytes, oldEntry,
        previous.detailDelivery.coldHoursSchema === 1)).value;
      assertPublicDeliveryDocument(oldHour, previous, oldEntry);
    } catch (error) {
      checkDeadline();
      if (error?.message === 'SAVED_PUBLIC_CONTINUITY_HOUR_HTTP') throw error;
      throw savedContinuityFailure('PREDECESSOR_HOUR');
    }
    try {
      newHour = (await readPublicDeliveryJsonFile(path.join(newLiveDirectory, newEntry.path),
        newEntry, current.detailDelivery.coldHoursSchema === 1)).value;
      assertPublicDeliveryDocument(newHour, current, newEntry);
    } catch {
      checkDeadline();
      throw savedContinuityFailure('CANDIDATE_HOUR');
    }
    const compared = comparePublicWeatherHours(oldHour, newHour, {
      time: oldEntry.key,
      previousDatasetId: previous.datasetId,
      currentDatasetId: current.datasetId,
      partCount: current.coastalPartCount,
    });
    changedIdentities += compared.changedIdentities;
    for (const component of FIELDS) {
      losses[component] += compared.losses[component];
      gains[component] += compared.gains[component];
    }
  }
  if (sha256CanonicalJson(await readSavedPublicManifest(currentPath)) !== currentManifestSha256) {
    throw savedContinuityFailure('CANDIDATE_DRIFT');
  }
  checkDeadline();
  return {
    kind: 'SAVED_CURRENT_PUBLIC_WEATHER_CONTINUITY',
    previousManifestSha256: expectedPublicManifestSha256,
    currentManifestSha256,
    comparedHours: overlap.length,
    comparedPartHours: overlap.length * current.coastalPartCount,
    predecessorHourBytes: plannedBytes,
    changedIdentities,
    losses,
    gains,
    privatePayloadIncluded: false,
    passed: changedIdentities === 0 && Object.values(losses).every(count => count === 0),
  };
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (!value || !['--previous-conditions', '--previous-pack', '--new-live'].includes(argument)) {
      throw new Error('PUBLIC_WEATHER_CONTINUITY_ARGUMENT_INVALID');
    }
    result[argument] = value;
  }
  if (!result['--previous-conditions'] || !result['--previous-pack'] || !result['--new-live']) {
    throw new Error('PUBLIC_WEATHER_CONTINUITY_ARGUMENT_MISSING');
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--saved-current-public-predecessor') {
    try {
      if (argv.length !== 6 || argv[2] !== '--public-manifest-sha256' || argv[4] !== '--new-live'
        || !argv[1] || !argv[5]) throw savedContinuityFailure('ARGUMENTS');
      const result = await checkSavedCurrentPublicWeatherContinuity({
        previousManifestPath: argv[1], expectedPublicManifestSha256: argv[3], newLiveDirectory: argv[5],
      });
      console.log(JSON.stringify(result));
      if (!result.passed) process.exitCode = 1;
    } catch (error) {
      const code = error?.message;
      console.error(typeof code === 'string' && /^SAVED_PUBLIC_CONTINUITY_[A-Z_]+$/.test(code)
        ? code : 'SAVED_PUBLIC_CONTINUITY_READBACK_REFUSED');
      process.exitCode = 1;
    }
  } else {
    const args = parseArgs(argv);
    checkPublicWeatherContinuity({
      previousConditionsPath: args['--previous-conditions'],
      previousPackPath: args['--previous-pack'],
      newLiveDirectory: args['--new-live'],
    }).then(result => {
      console.log(JSON.stringify(result));
      if (!result.passed) process.exitCode = 1;
    }).catch(error => {
      console.error(`Public weather continuity failed closed: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
