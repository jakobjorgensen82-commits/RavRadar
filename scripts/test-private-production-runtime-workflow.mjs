import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  PRIVATE_RUNTIME_CONTRACT_FILES,
  PRIVATE_RUNTIME_FILES,
  buildPrivateRuntimeCreateSpec,
  buildPrivateRuntimeExpectation,
  buildPrivateRuntimePreflightState,
  installRestoredPrivateRuntime,
  materializePrivateRuntimePreflight,
  privateRuntimeContractHashes,
  validatePrivateRuntimePreflightState,
} from './private-production-runtime-workflow.mjs';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-private-workflow-'));
const repository = path.join(temp, 'repository');
const restored = path.join(temp, 'private', 'restored');
const sourceRepository = path.resolve('.');

try {
  await fs.mkdir(repository, { recursive: true });
  const contractFiles = [...new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())];
  for (const relative of contractFiles) {
    const destination = path.join(repository, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(sourceRepository, relative), destination);
  }

  const zones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [`z-${index}`, {}]));
  const parts = Object.fromEntries(Array.from({ length: 673 }, (_, index) => [`p-${index}`, {}]));
  const conditions = {
    datasetId: 'rr-synthetic-private-workflow',
    generatedAt: '2026-08-29T10:05:00.000Z',
    productionReferenceAt: '2026-08-29T10:00:00.000Z',
    zones,
    coastalParts: { modelBinding: ravScoreModelBinding(), parts },
  };
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const destination = path.join(repository, descriptor.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    let value = `synthetic-${descriptor.id}\n`;
    if (descriptor.id === 'full-conditions') value = `${JSON.stringify(conditions)}\n`;
    if (descriptor.id === 'dmi-bulk-cache') value = `${JSON.stringify({
      schemaVersion: 2,
      refreshStatus: 'complete',
      runs: {
        dkss_idw: { referenceTime: '2026-08-29T06:00:00.000Z' },
        wam_dw: { referenceTime: '2026-08-29T06:00:00.000Z' },
      },
    })}\n`;
    if (descriptor.id === 'runtime-diagnostics') value = `${JSON.stringify({
      acquisition: {
        prioritizedMissingOrExpiringZones: 0,
        bulkModelDownloads: { refreshStatus: 'complete' },
      },
      dataQuality: { forecast: { completeDmiZones: 210 } },
      health: { dmi: { totalZones: 210 } },
      duplicateTimes: { zones: 0 },
    })}\n`;
    await fs.writeFile(destination, value);
  }
  await fs.mkdir(path.join(repository, 'data', 'diagnostics'), { recursive: true });
  await fs.writeFile(
    path.join(repository, 'data', 'diagnostics', 'dmi-ocean-diagnostics.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      generatedAt: conditions.generatedAt,
      refreshStatus: 'complete',
    })}\n`,
  );

  const hashes = await privateRuntimeContractHashes({ repositoryRoot: repository });
  assert.deepEqual(Object.keys(hashes).sort(), [
    'continuationStateContractSha256',
    'fullRuntimeContractSha256',
    'publicProjectionContractSha256',
  ]);
  assert.ok(Object.values(hashes).every(value => /^[a-f0-9]{64}$/.test(value)));

  for (const [contract, relativePaths] of Object.entries(PRIVATE_RUNTIME_CONTRACT_FILES)) {
    for (const relativePath of relativePaths) {
      const absolute = path.join(repository, relativePath);
      const original = await fs.readFile(absolute);
      await fs.writeFile(absolute, Buffer.concat([original, Buffer.from('\n')]));
      const drifted = await privateRuntimeContractHashes({ repositoryRoot: repository });
      assert.notEqual(
        drifted[contract],
        hashes[contract],
        `${contract} drift in ${relativePath} must invalidate the private bundle contract`,
      );
      await fs.writeFile(absolute, original);
    }
  }

  const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: repository });
  assert.equal(spec.metadata.zoneCount, 210);
  assert.equal(spec.metadata.partCount, 673);
  assert.deepEqual(spec.metadata.modelBinding, ravScoreModelBinding());
  assert.equal(spec.files.length, PRIVATE_RUNTIME_FILES.length);

  const expected = await buildPrivateRuntimeExpectation({
    repositoryRoot: repository,
    targetReferenceAt: '2026-08-29T11:00:00Z',
    now: '2026-08-29T11:05:00Z',
  });
  assert.equal(expected.targetReferenceAt, '2026-08-29T11:00:00.000Z');
  assert.equal(expected.minimumReferenceAt, '2026-08-26T11:00:00.000Z');
  assert.deepEqual(expected.contractHashes, hashes);

  const preflightState = await buildPrivateRuntimePreflightState({
    repositoryRoot: repository,
  });
  assert.match(preflightState.stateSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(preflightState.dmiRuns, {
    dkss_idw: '2026-08-29T06:00:00.000Z',
    wam_dw: '2026-08-29T06:00:00.000Z',
  });
  assert.equal(preflightState.completeDmiZones, 210);
  assert.equal(preflightState.totalZones, 210);
  assert.equal(JSON.stringify(preflightState).includes('coordinates'), false);
  assert.equal(JSON.stringify(preflightState).includes('currentUMps'), false);

  const publicManifest = {
    schemaVersion: 4,
    complete: true,
    datasetId: conditions.datasetId,
    generatedAt: conditions.generatedAt,
    productionReferenceAt: conditions.productionReferenceAt,
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: ravScoreModelBinding(),
  };
  await validatePrivateRuntimePreflightState(preflightState, {
    repositoryRoot: repository,
    publicManifest,
  });
  await assert.rejects(
    validatePrivateRuntimePreflightState(preflightState, {
      repositoryRoot: repository,
      publicManifest: { ...publicManifest, datasetId: 'rr-not-deployed' },
    }),
    /does not attest/,
  );
  await assert.rejects(
    validatePrivateRuntimePreflightState({ ...preflightState, duplicateZones: 1 }, {
      repositoryRoot: repository,
      publicManifest,
    }),
    /state is invalid/,
  );
  await assert.rejects(
    validatePrivateRuntimePreflightState({
      ...preflightState,
      coordinates: [[9.5, 56.2]],
    }, {
      repositoryRoot: repository,
      publicManifest,
    }),
    /incompatible field set/,
  );

  const preflightCache = path.join(repository, '.cache', 'weather-preflight-state');
  const preflightWork = path.join(repository, '.cache', 'weather-preflight-work');
  await fs.mkdir(preflightCache, { recursive: true });
  await fs.writeFile(path.join(preflightCache, 'state.json'), `${JSON.stringify(preflightState)}\n`);
  await fs.writeFile(path.join(preflightCache, 'public-manifest.json'), `${JSON.stringify(publicManifest)}\n`);
  const materialized = await materializePrivateRuntimePreflight({
    repositoryRoot: repository,
    statePath: path.join(preflightCache, 'state.json'),
    publicManifestPath: path.join(preflightCache, 'public-manifest.json'),
    outputRoot: preflightWork,
  });
  assert.deepEqual(materialized, {
    materialized: true,
    fileCount: 4,
    datasetId: conditions.datasetId,
    privatePayloadIncluded: false,
    rawVectorsIncluded: false,
    coordinatesIncluded: false,
  });
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(preflightWork, 'data/live/conditions.json'), 'utf8')),
    {
      datasetId: conditions.datasetId,
      generatedAt: conditions.generatedAt,
      productionReferenceAt: conditions.productionReferenceAt,
    },
  );
  const materializedRelativePaths = [
    'data/live/conditions.json',
    'data/live/dmi-bulk-cache.json',
    'data/diagnostics/dmi-ocean-diagnostics.json',
    'data/live/ravradar-runtime-diagnostics.json',
  ].sort();
  const materializedDocuments = [];
  for (const relativePath of materializedRelativePaths) {
    materializedDocuments.push(JSON.parse(await fs.readFile(
      path.join(preflightWork, ...relativePath.split('/')),
      'utf8',
    )));
  }
  const materializedText = JSON.stringify(materializedDocuments);
  for (const forbidden of [
    'coordinates',
    'waterPoint',
    'landPoint',
    'currentUMps',
    'currentVMps',
    'coastalParts',
  ]) {
    assert.equal(materializedText.includes(forbidden), false,
      `materialized preflight must omit ${forbidden}`);
  }
  assert.equal(materializedText.includes('"zones":{'), false,
    'materialized preflight must omit full zone payloads');

  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const destination = path.join(restored, descriptor.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, `restored-${descriptor.id}\n`);
  }
  const installed = await installRestoredPrivateRuntime({
    restoredRoot: restored,
    repositoryRoot: repository,
  });
  assert.deepEqual(installed, {
    installed: true,
    fileCount: PRIVATE_RUNTIME_FILES.length,
    privateDataLogged: false,
  });
  assert.equal(
    await fs.readFile(path.join(repository, PRIVATE_RUNTIME_FILES[0].relativePath), 'utf8'),
    `restored-${PRIVATE_RUNTIME_FILES[0].id}\n`,
  );

  const rollbackSource = path.join(temp, 'private', 'rollback-source');
  const beforeFailedInstall = new Map();
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const source = path.join(rollbackSource, descriptor.relativePath);
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.writeFile(source, `next-${descriptor.id}\n`);
    const destination = path.join(repository, descriptor.relativePath);
    beforeFailedInstall.set(descriptor.relativePath, await fs.readFile(destination));
  }
  let renameCalls = 0;
  await assert.rejects(
    installRestoredPrivateRuntime({
      restoredRoot: rollbackSource,
      repositoryRoot: repository,
      renameImpl: async (...arguments_) => {
        renameCalls += 1;
        if (renameCalls === 4) throw new Error('synthetic mid-install failure');
        return fs.rename(...arguments_);
      },
    }),
    /synthetic mid-install failure/,
  );
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    assert.deepEqual(
      await fs.readFile(path.join(repository, descriptor.relativePath)),
      beforeFailedInstall.get(descriptor.relativePath),
      `failed install must restore ${descriptor.id} byte-for-byte`,
    );
  }

  await fs.writeFile(path.join(restored, 'unexpected-private.bin'), 'synthetic');
  await assert.rejects(
    installRestoredPrivateRuntime({ restoredRoot: restored, repositoryRoot: repository }),
    /inventory is incompatible/,
  );
  console.log('Private runtime workflow spec, 72-hour expectation and exact allowlisted install pass.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
