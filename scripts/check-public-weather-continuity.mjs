#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializePrivatePublicHourDeliveryPack } from './lib/public-hour-delivery-pack.mjs';
import { hasValue } from './lib/weather-component-needs.mjs';

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
  const newManifest = JSON.parse(await fs.readFile(path.join(newLiveDirectory, 'manifest.json'), 'utf8'));
  const previousReference = previousConditions.productionReferenceAt;
  const currentReference = newManifest.productionReferenceAt;
  if (!exactHour(previousReference) || !exactHour(currentReference)
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
    const newHours = newManifest.detailDelivery.hours;
    const losses = Object.fromEntries(FIELDS.map(key => [key, 0]));
    const gains = Object.fromEntries(FIELDS.map(key => [key, 0]));
    let changedIdentities = 0;
    let comparedHours = 0;
    const lossHours = [];
    for (const time of oldTimes) {
      const previousDescriptor = oldDelivery.hours[time];
      const currentDescriptor = newHours[time];
      if (!currentDescriptor?.path || !/^\.\/forecast\/[0-9a-f]{64}\.json$/.test(currentDescriptor.path)) {
        throw new Error('PUBLIC_WEATHER_CONTINUITY_HOUR_LOST');
      }
      const previous = JSON.parse(await fs.readFile(path.join(temporaryRoot, previousDescriptor.path), 'utf8'));
      const current = JSON.parse(await fs.readFile(path.join(newLiveDirectory, currentDescriptor.path), 'utf8'));
      const compared = comparePublicWeatherHours(previous, current, {
        time,
        previousDatasetId: previousConditions.datasetId,
        currentDatasetId: newManifest.datasetId,
        partCount: newManifest.coastalPartCount,
      });
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
  const args = parseArgs(process.argv.slice(2));
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
