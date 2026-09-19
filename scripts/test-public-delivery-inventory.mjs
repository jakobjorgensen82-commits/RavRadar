import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { PRIVATE_RUNTIME_CONTRACT_FILES } from './private-production-runtime-workflow.mjs';
import { computeRavScorePublicBrowserClosure } from './lib/ravscore-public-browser-closure.mjs';
import { computeRavScoreModelBundle } from './build-ravscore-model-bundle.mjs';
import { copyPublicDeliveryShards } from './copy-public-delivery-shards.mjs';

const deliveryModule = 'js/core/public-delivery-contract.js';
const copyHelper = 'scripts/copy-public-delivery-shards.mjs';
for (const file of [deliveryModule, copyHelper]) {
  assert.ok(PRIVATE_RUNTIME_CONTRACT_FILES.publicProjectionContractSha256.includes(file),
    `${file} must be bound by the private public-projection contract.`);
}
const [browser, model, worker, packageText] = await Promise.all([
  computeRavScorePublicBrowserClosure(), computeRavScoreModelBundle(),
  fs.readFile('service-worker.js', 'utf8'), fs.readFile('package.json', 'utf8'),
]);
assert.ok(browser.manifest.files.some(file => file.path === deliveryModule));
assert.ok(model.manifest.files.some(file => file.path === deliveryModule),
  'The producer import must remain covered by the transitive implementation bundle.');
assert.ok(!browser.manifest.files.some(file => file.path === copyHelper));
assert.match(worker, /\.\/js\/core\/public-delivery-contract\.js\?v=\$\{APP_VERSION\}/);
const scripts = JSON.parse(packageText).scripts;
assert.equal(scripts['test:public-delivery-refresh'], 'node scripts/test-public-delivery-refresh.mjs');
assert.equal(scripts['test:public-delivery-inventory'], 'node scripts/test-public-delivery-inventory.mjs');
assert.equal(scripts['test:weather-component-composition'], 'node scripts/test-weather-component-composition.mjs');
assert.equal(scripts['test:weather-component-selection'], 'node scripts/test-weather-component-selection.mjs');
assert.equal(scripts['test:dmi-native-chain-continuity'], 'python -B scripts/test-dmi-native-chain-continuity.py');
assert.doesNotMatch(scripts['validate:production-artifact'], /public-delivery|weather-component|dmi-native-chain-continuity/,
  'Targeted source tests must not expand the fixed production artifact gate.');

// Tiny complete inventory: 118 hour documents and one zone document. Only
// manifest-listed immutable files may cross into the public artifact.
const tempParent = path.resolve(os.tmpdir());
const temporary = await fs.mkdtemp(path.join(tempParent, 'ravradar-public-delivery-test-'));
assert.equal(path.dirname(path.resolve(temporary)), tempParent);
assert.ok(path.basename(temporary).startsWith('ravradar-public-delivery-test-'));
try {
  const source = path.join(temporary, 'source');
  const target = path.join(temporary, 'target');
  await fs.mkdir(path.join(source, 'forecast'), { recursive: true });
  const reference = '2026-09-19T00:00:00.000Z';
  const times = Array.from({ length: 118 }, (_, i) => new Date(Date.parse(reference) + i * 3600000).toISOString());
  const manifest = { datasetId: 'inventory-test', generatedAt: reference, productionReferenceAt: reference,
    publicConditionDetailsSha256: 'a'.repeat(64), zoneCount: 1, coastalPartCount: 1, ravScoreModelBinding: {} };
  manifest.detailDelivery = { schemaVersion: 1, forecastHours: 118,
    sourceDetailsSha256: manifest.publicConditionDetailsSha256, hours: {}, zones: {} };
  for (const [kind, keys] of [['hour', times], ['zone', ['z1']]]) {
    for (const key of keys) {
      const selected = kind === 'hour' ? [key] : times;
      const document = { datasetId: manifest.datasetId, generatedAt: reference, productionReferenceAt: reference,
        delivery: { schemaVersion: 1, kind, key, modelBinding: {}, sourceDetailsSha256: manifest.publicConditionDetailsSha256 },
        zones: { z1: { forecast: { hourly: selected.map(time => ({ time })) } } },
        coastalParts: { zones: { z1: { expectedPartCount: 1, hourly: selected.map(time => ({ time })) } },
          parts: { p1: { zoneId: 'z1' } } } };
      const text = `${JSON.stringify(document)}\n`;
      const sha256 = crypto.createHash('sha256').update(text).digest('hex');
      const descriptor = { path: `./forecast/${sha256}.json`, sha256, bytes: Buffer.byteLength(text) };
      manifest.detailDelivery[kind === 'hour' ? 'hours' : 'zones'][key] = descriptor;
      await fs.writeFile(path.join(source, descriptor.path), text);
    }
  }
  await fs.writeFile(path.join(source, 'manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(source, 'forecast', 'private-cache.json'), '{"privatePayload":"not-public"}');
  assert.deepEqual(await copyPublicDeliveryShards({ source, target }), { files: 119 });
  assert.equal((await fs.readdir(path.join(target, 'forecast'))).length, 119);
  await assert.rejects(fs.access(path.join(target, 'forecast', 'private-cache.json')), /ENOENT/);
  const first = manifest.detailDelivery.hours[times[0]];
  await fs.writeFile(path.join(source, first.path), 'tampered');
  await assert.rejects(copyPublicDeliveryShards({ source, target }), /size\/type|hash mismatch/);
  await fs.writeFile(path.join(source, 'manifest.json'), JSON.stringify({ ...manifest, detailDelivery: undefined }));
  assert.deepEqual(await copyPublicDeliveryShards({ source, target }), { files: 0 }, 'Legacy four-file sources remain readable.');
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
console.log(`OK: public delivery inventory, browser/model import graphs (${browser.manifest.files.length}/${model.manifest.files.length}), immutable copy and legacy compatibility.`);
