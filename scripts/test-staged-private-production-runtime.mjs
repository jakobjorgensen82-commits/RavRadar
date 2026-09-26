import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { createPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import {
  PRIVATE_RUNTIME_CONTRACT_FILES,
  PRIVATE_RUNTIME_FILES,
  buildPrivateRuntimeCreateSpec,
  buildPrivateRuntimeExpectation,
} from './private-production-runtime-workflow.mjs';
import {
  openStagedPrivateProductionRuntime,
  sealStagedPrivateProductionRuntime,
} from './staged-private-production-runtime.mjs';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-private-build-stage-test-'));
const repositoryRoot = path.join(temp, 'repository');
const privateRoot = path.join(temp, 'private');
const restoredRoot = path.join(temp, 'restored');
const bundlePath = path.join(privateRoot, 'bundle');
const outputPath = path.join(temp, 'sealed.bin');
const restoredBundlePath = path.join(restoredRoot, 'bundle');
const sourceHead = 'a'.repeat(40);
const otherHead = 'b'.repeat(40);
const identity = {
  repository: 'owner/RavRadar', runId: '123456', runAttempt: '1', sourceHead,
};
const masterSecret = 'synthetic-stage-secret-at-least-thirty-two-characters';
const now = '2026-08-29T11:05:00.000Z';

try {
  await fs.mkdir(repositoryRoot, { recursive: true });
  for (const relativePath of new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())) {
    const destination = path.join(repositoryRoot, relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(path.resolve('.'), relativePath), destination);
  }
  const conditions = {
    datasetId: 'rr-synthetic-private-stage',
    generatedAt: '2026-08-29T10:05:00.000Z',
    productionReferenceAt: '2026-08-29T10:00:00.000Z',
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, index) => [`z-${index}`, {}])),
    coastalParts: {
      modelBinding: ravScoreModelBinding(),
      parts: Object.fromEntries(Array.from({ length: 673 }, (_, index) => [`p-${index}`, {}])),
    },
  };
  for (const file of PRIVATE_RUNTIME_FILES) {
    const destination = path.join(repositoryRoot, file.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.id === 'full-conditions'
      ? `${JSON.stringify(conditions)}\n` : `synthetic-${file.id}\n`);
  }
  const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot });
  await fs.mkdir(privateRoot, { recursive: true });
  await fs.mkdir(restoredRoot, { recursive: true });
  await createPrivateProductionRuntimeBundle({
    ...spec, repositoryRoot, privateRoot, bundlePath,
  });
  const expected = await buildPrivateRuntimeExpectation({
    repositoryRoot, targetReferenceAt: '2026-08-29T11:00:00.000Z', now,
  });
  const common = { repositoryRoot, expected, masterSecret, now, ...identity };
  const sealed = await sealStagedPrivateProductionRuntime({
    ...common, privateRoot, bundlePath, outputPath,
  });
  assert.equal(sealed.sealed, true);
  const ciphertext = await fs.readFile(outputPath);
  assert.equal(ciphertext.includes(Buffer.from(conditions.datasetId)), false,
    'public-repository artifact must never contain private identity in plaintext');
  assert.equal(ciphertext.includes(Buffer.from('synthetic-full-conditions')), false);
  await assert.rejects(openStagedPrivateProductionRuntime({
    ...common, privateRoot: restoredRoot, bundlePath: restoredBundlePath,
    inputPath: outputPath, runId: '123457',
  }), /authentication failed/);
  assert.equal(await fs.stat(restoredBundlePath).catch(() => null), null);
  const tamperedPath = path.join(temp, 'tampered.bin');
  const tampered = Buffer.from(ciphertext);
  tampered[Math.floor(tampered.length / 2)] ^= 1;
  await fs.writeFile(tamperedPath, tampered);
  await assert.rejects(openStagedPrivateProductionRuntime({
    ...common, privateRoot: restoredRoot, bundlePath: restoredBundlePath,
    inputPath: tamperedPath,
  }), /authentication failed/);
  assert.equal(await fs.stat(restoredBundlePath).catch(() => null), null);
  await assert.rejects(openStagedPrivateProductionRuntime({
    ...common, privateRoot: restoredRoot, bundlePath: restoredBundlePath,
    inputPath: outputPath, sourceHead: otherHead,
  }), /authentication failed/);
  const opened = await openStagedPrivateProductionRuntime({
    ...common, privateRoot: restoredRoot, bundlePath: restoredBundlePath,
    inputPath: outputPath,
  });
  assert.equal(opened.restored, true);
  assert.equal(opened.bundleContentSha256, sealed.bundleContentSha256);
  assert.equal(opened.productionPointerUnchanged, true);
  await assert.rejects(sealStagedPrivateProductionRuntime({
    ...common, privateRoot, bundlePath,
    outputPath: path.join(repositoryRoot, 'unwanted.bin'),
  }), /outside repository/);
  console.log('OK: encrypted private build stage restores exact bundle and rejects changed identity or bytes.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
