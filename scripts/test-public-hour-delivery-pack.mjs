import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { RAVSCORE_PUBLIC_FORECAST_HOURS } from '../js/core/ravscore-model-contract.js';
import {
  buildPrivatePublicHourDeliveryPack,
  compactPrivateConditionsForPersistence,
  inspectPrivatePublicHourDeliveryPack,
  installPrivateConditionsAndHourPack,
  materializePrivatePublicHourDeliveryPack,
  rebindPrivatePublicHourDeliveryPack,
} from './lib/public-hour-delivery-pack.mjs';
import { resolvePublicNationalForecast } from './public-conditions-lib.mjs';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);

test('public hour delivery is compacted, authenticated and restored byte-for-byte', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-public-hour-pack-test-'));
  try {
    const live = path.join(root, 'data', 'live');
    const forecast = path.join(live, 'forecast');
    const outputPath = path.join(root, '.cache', 'public-hour-delivery.pack');
    await fs.mkdir(forecast, { recursive: true });
    const start = Date.parse('2026-09-19T02:00:00.000Z');
    const modelBinding = { modelId: 'test-model', stateSchemaVersion: '1' };
    const sourceDetailsSha256 = 'a'.repeat(64);
    const hours = {};
    const originals = new Map();
    for (let index = 0; index < RAVSCORE_PUBLIC_FORECAST_HOURS; index += 1) {
      const time = new Date(start + index * 3_600_000).toISOString();
      const repeatedPayload = index === 0
        ? 'large-public-hour-shard-'.repeat(Math.ceil((9 * 1024 * 1024) / 25))
        : 'same-public-hour-projection-value-'.repeat(64);
      const text = `${JSON.stringify({
        delivery: { schemaVersion: 1, kind: 'hour', key: time,
          sourceDetailsSha256, modelBinding },
        repeatedPayload,
      })}\n`;
      const sha256 = digest(text);
      const file = `${sha256}.json`;
      await fs.writeFile(path.join(forecast, file), text);
      hours[time] = { path: `./forecast/${file}`, sha256, bytes: Buffer.byteLength(text) };
      originals.set(time, text);
    }
    const publicManifest = {
      datasetId: 'rr-pack-test',
      productionReferenceAt: '2026-09-19T02:00:00.000Z',
      publicConditionDetailsSha256: sourceDetailsSha256,
      ravScoreModelBinding: modelBinding,
      detailDelivery: { schemaVersion: 1, sourceDetailsSha256, hours },
    };
    const startupNationalForecast = {
      schemaVersion: 2,
      modelBinding,
      dates: ['2026-09-19'],
      modes: { waders: [{ date: '2026-09-19', rows: [] }], beach: [] },
    };
    const built = await buildPrivatePublicHourDeliveryPack({
      liveDirectory: live,
      publicManifest,
      startupNationalForecast,
      outputPath,
    });
    const full = {
      datasetId: publicManifest.datasetId,
      productionReferenceAt: publicManifest.productionReferenceAt,
      coastalParts: {
        expectedPartCount: 2,
        parts: {
          p1: { current: { score: 50 }, hourly: [{ time: 'future', score: 60 }] },
          p2: { current: { score: 40 }, hourly: [{ time: 'future', score: 45 }] },
        },
      },
    };
    const compact = compactPrivateConditionsForPersistence(full, built.marker);
    assert.equal(compact.coastalParts.parts.p1.hourly, undefined);
    assert.deepEqual(compact.coastalParts.parts.p1.current, full.coastalParts.parts.p1.current);
    assert.equal(full.coastalParts.parts.p1.hourly.length, 1,
      'compaction must not mutate the in-memory public source');
    assert.deepEqual(resolvePublicNationalForecast(compact), startupNationalForecast,
      'compact restore must retain the exact startup ranking instead of recomputing it from removed rows');
    const inspected = await inspectPrivatePublicHourDeliveryPack({ packPath: outputPath, conditions: compact });
    assert.equal(inspected.manifest.entries.length, RAVSCORE_PUBLIC_FORECAST_HOURS);
    const restoredRoot = path.join(root, 'restored');
    const restored = await materializePrivatePublicHourDeliveryPack({
      packPath: outputPath,
      conditions: compact,
      liveDirectory: restoredRoot,
    });
    assert.deepEqual(Object.keys(restored.hours).sort(), Object.keys(hours).sort());
    for (const [time, descriptor] of Object.entries(restored.hours)) {
      const text = await fs.readFile(path.join(restoredRoot, descriptor.path.replace(/^\.\//, '')), 'utf8');
      assert.equal(text, originals.get(time));
    assert.equal(digest(text), descriptor.sha256);
    }

    const targetBinding = { ...modelBinding, modelBundleSha256: 'c'.repeat(64) };
    const targetStartupNationalForecast = {
      ...startupNationalForecast,
      modelBinding: targetBinding,
    };
    const targetConditions = structuredClone(compact);
    targetConditions.publicHourDelivery = {
      ...targetConditions.publicHourDelivery,
      sourceDetailsSha256: 'b'.repeat(64),
      modelBinding: targetBinding,
      startupNationalForecast: targetStartupNationalForecast,
      startupNationalForecastSha256: digest(canonical(targetStartupNationalForecast)),
    };
    const reboundPath = path.join(root, '.cache', 'rebound.pack');
    const rebound = await rebindPrivatePublicHourDeliveryPack({
      sourcePackPath: outputPath,
      sourceConditions: compact,
      targetConditions,
      targetDetailsSha256: 'b'.repeat(64),
      outputPath: reboundPath,
    });
    Object.assign(targetConditions.publicHourDelivery, rebound);
    const reboundInspection = await inspectPrivatePublicHourDeliveryPack({
      packPath: reboundPath,
      conditions: targetConditions,
    });
    assert.equal(reboundInspection.manifest.sourceDetailsSha256, 'b'.repeat(64));
    assert.deepEqual(reboundInspection.manifest.modelBinding, targetBinding);
    const reboundRoot = path.join(root, 'rebound-restored');
    const reboundRestored = await materializePrivatePublicHourDeliveryPack({
      packPath: reboundPath,
      conditions: targetConditions,
      liveDirectory: reboundRoot,
    });
    for (const entry of reboundRestored.manifest.entries) {
      const document = JSON.parse(await fs.readFile(
        path.join(reboundRoot, 'forecast', entry.file), 'utf8',
      ));
      assert.equal(document.delivery.sourceDetailsSha256, 'b'.repeat(64));
      assert.deepEqual(document.delivery.modelBinding, targetBinding);
    }
    const tampered = Buffer.from(await fs.readFile(outputPath));
    tampered[tampered.length - 1] ^= 1;
    const tamperedPath = path.join(root, 'tampered.pack');
    await fs.writeFile(tamperedPath, tampered);
    await assert.rejects(
      inspectPrivatePublicHourDeliveryPack({ packPath: tamperedPath, conditions: compact }),
      /digest does not match conditions/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('private conditions and public-hour pack install as one rollback-safe pair', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-public-hour-transaction-test-'));
  try {
    const conditionsPath = path.join(root, 'data', 'live', 'conditions.json');
    const packPath = path.join(root, '.cache', 'public-hour-delivery.pack');
    await fs.mkdir(path.dirname(conditionsPath), { recursive: true });
    await fs.mkdir(path.dirname(packPath), { recursive: true });
    await fs.writeFile(conditionsPath, 'old-conditions');
    await fs.writeFile(packPath, 'old-pack');
    const stagedConditionsPath = `${conditionsPath}.stage-1`;
    const stagedPackPath = `${packPath}.stage-1`;
    await fs.writeFile(stagedConditionsPath, 'new-conditions');
    await fs.writeFile(stagedPackPath, 'new-pack');
    await installPrivateConditionsAndHourPack({
      stagedConditionsPath, conditionsPath, stagedPackPath, packPath,
    });
    assert.equal(await fs.readFile(conditionsPath, 'utf8'), 'new-conditions');
    assert.equal(await fs.readFile(packPath, 'utf8'), 'new-pack');

    const failedConditionsStage = `${conditionsPath}.stage-2`;
    const failedPackStage = `${packPath}.stage-2`;
    await fs.writeFile(failedConditionsStage, 'bad-conditions');
    await fs.writeFile(failedPackStage, 'bad-pack');
    await assert.rejects(installPrivateConditionsAndHourPack({
      stagedConditionsPath: failedConditionsStage,
      conditionsPath,
      stagedPackPath: failedPackStage,
      packPath,
      renameImpl: async (source, destination) => {
        if (source === path.resolve(failedConditionsStage)) throw new Error('synthetic install failure');
        return fs.rename(source, destination);
      },
    }), /synthetic install failure/);
    assert.equal(await fs.readFile(conditionsPath, 'utf8'), 'new-conditions');
    assert.equal(await fs.readFile(packPath, 'utf8'), 'new-pack');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
