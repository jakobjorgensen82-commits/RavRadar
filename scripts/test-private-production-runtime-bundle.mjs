#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY,
  createPrivateProductionRuntimeBundle,
  privateRuntimeBundleContentSha256,
  restorePrivateProductionRuntimeBundle,
  verifyPrivateProductionRuntimeBundle,
} from './private-production-runtime-bundle.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REFERENCE = '2026-08-29T10:00:00.000Z';
const GENERATED = '2026-08-29T10:05:00.000Z';
const NOW = '2026-08-29T12:00:00.000Z';
const TARGET_REFERENCE = '2026-08-29T11:00:00.000Z';
const MINIMUM_REFERENCE = '2026-08-29T09:00:00.000Z';
const MINIMUM_GENERATED = '2026-08-29T09:05:00.000Z';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const execFileAsync = promisify(execFile);

const CONTRACT_HASHES = Object.freeze({
  continuationStateContractSha256: digest('synthetic-continuation-contract-v1'),
  fullRuntimeContractSha256: digest('synthetic-full-runtime-contract-v1'),
  publicProjectionContractSha256: digest('synthetic-public-projection-contract-v1'),
});

const metadata = (overrides = {}) => ({
  datasetId: 'rr-synthetic-private-runtime-210',
  productionReferenceAt: REFERENCE,
  generatedAt: GENERATED,
  generationId: 'synthetic-generation-1',
  zoneCount: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedZoneCount,
  partCount: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount,
  modelBinding: { ...ravScoreModelBinding() },
  contractHashes: { ...CONTRACT_HASHES },
  privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
  ...overrides,
});

async function rejectsMessage(action, pattern) {
  await assert.rejects(action, error => {
    assert.match(String(error?.message ?? ''), pattern);
    return true;
  });
}

async function resealManifest(bundlePath, mutate) {
  const manifestPath = path.join(bundlePath, PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.manifestName);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  mutate(manifest);
  manifest.bundleContentSha256 = privateRuntimeBundleContentSha256(manifest);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
}

async function main() {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-private-runtime-test-'));
  const privateRoot = path.join(sandbox, 'private-root');
  const sourceRoot = path.join(sandbox, 'synthetic-sources');
  await fs.mkdir(privateRoot, { recursive: true });
  await fs.mkdir(sourceRoot, { recursive: true });
  const runtimeBytes = Buffer.from('synthetic private runtime bytes\n', 'utf8');
  const cacheBytes = Buffer.from([0, 1, 2, 3, 5, 8, 13, 21]);
  const runtimeSource = path.join(sourceRoot, 'runtime.fixture');
  const cacheSource = path.join(sourceRoot, 'cache.fixture');
  await fs.writeFile(runtimeSource, runtimeBytes);
  await fs.writeFile(cacheSource, cacheBytes);
  const sourceFiles = [
    {
      id: 'full-runtime',
      sourcePath: runtimeSource,
      relativePath: 'runtime/full-runtime.fixture',
      privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
    },
    {
      id: 'weather-cache',
      sourcePath: cacheSource,
      relativePath: 'cache/weather-cache.fixture',
      privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
    },
  ];
  let sequence = 0;
  const newBundle = async (overrides = {}) => {
    sequence += 1;
    const bundlePath = path.join(privateRoot, `bundle-${sequence}`);
    await createPrivateProductionRuntimeBundle({
      privateRoot,
      bundlePath,
      repositoryRoot: REPOSITORY_ROOT,
      metadata: metadata(overrides),
      files: sourceFiles,
    });
    return bundlePath;
  };
  const expected = {
    datasetId: metadata().datasetId,
    generationId: metadata().generationId,
    productionReferenceAt: metadata().productionReferenceAt,
    generatedAt: metadata().generatedAt,
    modelBinding: { ...ravScoreModelBinding() },
    contractHashes: { ...CONTRACT_HASHES },
  };
  const restoreOptions = bundlePath => ({
    privateRoot,
    bundlePath,
    repositoryRoot: REPOSITORY_ROOT,
    expected,
    targetReferenceAt: TARGET_REFERENCE,
    minimumReferenceAt: MINIMUM_REFERENCE,
    minimumGeneratedAt: MINIMUM_GENERATED,
    now: NOW,
  });

  try {
    const bundlePath = await newBundle();
    const verified = await verifyPrivateProductionRuntimeBundle({
      privateRoot,
      bundlePath,
      repositoryRoot: REPOSITORY_ROOT,
      expected,
      now: NOW,
    });
    assert.equal(verified.verified, true);
    assert.equal(verified.fileCount, 2);
    assert.equal(verified.zoneCount, 210);
    assert.equal(verified.partCount, 673);
    assert.deepEqual(verified.modelBinding, ravScoreModelBinding());
    assert.deepEqual(verified.contractHashes, CONTRACT_HASHES);
    assert.equal(verified.files.find(file => file.id === 'full-runtime').bytes, runtimeBytes.length);
    assert.equal(
      verified.files.find(file => file.id === 'full-runtime').sha256,
      digest(runtimeBytes),
    );

    const restoredPath = path.join(privateRoot, 'restored-valid');
    const restored = await restorePrivateProductionRuntimeBundle({
      ...restoreOptions(bundlePath),
      outputPath: restoredPath,
    });
    assert.equal(restored.restored, true);
    assert.equal(restored.atomicDirectoryPublication, true);
    assert.deepEqual(
      await fs.readFile(path.join(restoredPath, 'runtime', 'full-runtime.fixture')),
      runtimeBytes,
    );
    assert.deepEqual(
      await fs.readFile(path.join(restoredPath, 'cache', 'weather-cache.fixture')),
      cacheBytes,
    );

    const tamperedBundle = await newBundle();
    await fs.appendFile(
      path.join(tamperedBundle, 'payload', 'runtime', 'full-runtime.fixture'),
      'tamper',
    );
    const tamperedOutput = path.join(privateRoot, 'restore-tampered');
    await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
      ...restoreOptions(tamperedBundle),
      outputPath: tamperedOutput,
    }), /payload integrity/);
    await assert.rejects(fs.lstat(tamperedOutput), { code: 'ENOENT' });

    const missingBundle = await newBundle();
    await fs.rm(path.join(missingBundle, 'payload', 'cache', 'weather-cache.fixture'));
    const sentinelTarget = path.join(privateRoot, 'restore-sentinel');
    await fs.mkdir(sentinelTarget);
    await fs.writeFile(path.join(sentinelTarget, 'sentinel.txt'), 'unchanged');
    await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
      ...restoreOptions(missingBundle),
      outputPath: sentinelTarget,
    }), /output already exists/);
    assert.equal(await fs.readFile(path.join(sentinelTarget, 'sentinel.txt'), 'utf8'), 'unchanged');
    await rejectsMessage(() => verifyPrivateProductionRuntimeBundle({
      privateRoot,
      bundlePath: missingBundle,
      repositoryRoot: REPOSITORY_ROOT,
      expected,
      now: NOW,
    }), /inventory/);
    const missingOutput = path.join(privateRoot, 'restore-missing');
    await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
      ...restoreOptions(missingBundle),
      outputPath: missingOutput,
    }), /inventory/);
    await assert.rejects(fs.lstat(missingOutput), { code: 'ENOENT' });

    const extraBundle = await newBundle();
    await fs.writeFile(path.join(extraBundle, 'payload', 'unexpected.fixture'), 'unexpected');
    await rejectsMessage(() => verifyPrivateProductionRuntimeBundle({
      privateRoot,
      bundlePath: extraBundle,
      repositoryRoot: REPOSITORY_ROOT,
      expected,
      now: NOW,
    }), /inventory/);

    for (const [field, invalidValue, pattern] of [
      ['modelId', 'RRS-OTHER-MODEL', /model binding|modelId/],
      ['profileId', 'other-profile', /model binding|profileId/],
      ['stateSchemaVersion', '999.0.0', /model binding|stateSchemaVersion/],
    ]) {
      const incompatibleBundle = await newBundle();
      const incompatibleOutput = path.join(privateRoot, `restore-incompatible-${field}`);
      await resealManifest(incompatibleBundle, manifest => {
        manifest.modelBinding[field] = invalidValue;
      });
      await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
        ...restoreOptions(incompatibleBundle),
        outputPath: incompatibleOutput,
      }), pattern);
      await assert.rejects(fs.lstat(incompatibleOutput), { code: 'ENOENT' });
    }

    for (const [field, invalidValue] of [['zoneCount', 209], ['partCount', 672]]) {
      const countBundle = await newBundle();
      const countOutput = path.join(privateRoot, `restore-count-${field}`);
      await resealManifest(countBundle, manifest => {
        manifest[field] = invalidValue;
      });
      await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
        ...restoreOptions(countBundle),
        outputPath: countOutput,
      }), /exactly 210 zones and 673 parts/);
      await assert.rejects(fs.lstat(countOutput), { code: 'ENOENT' });
    }

    const contractBundle = await newBundle();
    await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
      ...restoreOptions(contractBundle),
      outputPath: path.join(privateRoot, 'restore-contract-mismatch'),
      expected: {
        ...expected,
        contractHashes: {
          ...CONTRACT_HASHES,
          fullRuntimeContractSha256: digest('different-runtime-contract'),
        },
      },
    }), /contract hashes/);

    for (const [field, invalidValue, pattern] of [
      ['datasetId', 'rr-another-synthetic-dataset', /another dataset/],
      ['generationId', 'another-generation', /another generation/],
    ]) {
      const identityOutput = path.join(privateRoot, `restore-identity-${field}`);
      await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
        ...restoreOptions(contractBundle),
        outputPath: identityOutput,
        expected: { ...expected, [field]: invalidValue },
      }), pattern);
      await assert.rejects(fs.lstat(identityOutput), { code: 'ENOENT' });
    }

    const futureReferenceBundle = await newBundle({
      productionReferenceAt: '2026-08-29T13:00:00.000Z',
    });
    await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
      ...restoreOptions(futureReferenceBundle),
      outputPath: path.join(privateRoot, 'restore-future-reference'),
      expected: {
        ...expected,
        productionReferenceAt: undefined,
      },
    }), /future relative/);

    const futureGenerationBundle = await newBundle({
      generatedAt: '2026-08-29T13:00:01.000Z',
    });
    await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
      ...restoreOptions(futureGenerationBundle),
      outputPath: path.join(privateRoot, 'restore-future-generation'),
      expected: {
        ...expected,
        generatedAt: undefined,
      },
      now: '2026-08-29T12:00:00.000Z',
    }), /generation is from the future/);

    const regressionBundle = await newBundle({
      productionReferenceAt: '2026-08-29T08:00:00.000Z',
      generatedAt: '2026-08-29T08:05:00.000Z',
    });
    await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
      ...restoreOptions(regressionBundle),
      outputPath: path.join(privateRoot, 'restore-regression'),
      expected: {
        ...expected,
        productionReferenceAt: undefined,
        generatedAt: undefined,
      },
    }), /regress the production reference/);

    await rejectsMessage(() => createPrivateProductionRuntimeBundle({
      privateRoot: REPOSITORY_ROOT,
      bundlePath: path.join(REPOSITORY_ROOT, 'data', 'live', 'forbidden-private-bundle'),
      repositoryRoot: REPOSITORY_ROOT,
      metadata: metadata(),
      files: sourceFiles,
    }), /outside the repository/);
    await rejectsMessage(() => restorePrivateProductionRuntimeBundle({
      ...restoreOptions(bundlePath),
      outputPath: path.join(REPOSITORY_ROOT, 'data', 'live', 'forbidden-private-restore'),
    }), /strict descendant/);

    const cliBundle = path.join(privateRoot, 'bundle-cli');
    const cliRestore = path.join(privateRoot, 'restore-cli');
    const cliSpecPath = path.join(sourceRoot, 'cli-create-spec.json');
    const cliExpectedPath = path.join(sourceRoot, 'cli-expected.json');
    const cliRestoreExpectedPath = path.join(sourceRoot, 'cli-restore-expected.json');
    await fs.writeFile(cliSpecPath, JSON.stringify({ metadata: metadata(), files: sourceFiles }));
    await fs.writeFile(cliExpectedPath, JSON.stringify(expected));
    await fs.writeFile(cliRestoreExpectedPath, JSON.stringify({
      ...expected,
      targetReferenceAt: TARGET_REFERENCE,
      minimumReferenceAt: MINIMUM_REFERENCE,
      minimumGeneratedAt: MINIMUM_GENERATED,
    }));
    const cli = path.join(REPOSITORY_ROOT, 'scripts', 'private-production-runtime-bundle.mjs');
    const createdCli = await execFileAsync(process.execPath, [
      cli,
      'create',
      '--private-root', privateRoot,
      '--bundle', cliBundle,
      '--spec', cliSpecPath,
    ], { cwd: REPOSITORY_ROOT });
    const verifiedCli = await execFileAsync(process.execPath, [
      cli,
      'verify',
      '--private-root', privateRoot,
      '--bundle', cliBundle,
      '--expected', cliExpectedPath,
      '--now', NOW,
    ], { cwd: REPOSITORY_ROOT });
    const restoredCli = await execFileAsync(process.execPath, [
      cli,
      'restore',
      '--private-root', privateRoot,
      '--bundle', cliBundle,
      '--expected', cliRestoreExpectedPath,
      '--output', cliRestore,
      '--now', NOW,
    ], { cwd: REPOSITORY_ROOT });
    assert.equal(JSON.parse(createdCli.stdout).status, 'created');
    assert.equal(JSON.parse(verifiedCli.stdout).status, 'verified');
    assert.equal(JSON.parse(restoredCli.stdout).status, 'restored');
    assert.deepEqual(
      await fs.readFile(path.join(cliRestore, 'runtime', 'full-runtime.fixture')),
      runtimeBytes,
    );
    for (const output of [
      createdCli.stdout,
      createdCli.stderr,
      verifiedCli.stdout,
      verifiedCli.stderr,
      restoredCli.stdout,
      restoredCli.stderr,
    ]) {
      assert.equal(output.includes(metadata().datasetId), false);
      assert.equal(output.includes(metadata().generationId), false);
      assert.equal(output.includes(runtimeSource), false);
      assert.equal(output.includes(runtimeBytes.toString('utf8').trim()), false);
    }

    console.log([
      'Private production runtime bundle: passed',
      'opaque synthetic files only',
      '210/673 and full model binding enforced',
      'tamper/missing/cross-model/profile/state/count/future/regression rejected',
      'failed restore leaves its target unchanged',
      'bundle and restore outputs rejected from repository web paths',
      'CLI logs expose only structural hashes and counts',
    ].join('; '));
  } finally {
    await fs.rm(sandbox, { recursive: true, force: true });
  }
}

await main();
