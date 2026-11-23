import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual as same, promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { gunzip } from 'node:zlib';
import { auditB374WaterSourceSupport, H0, H3, scope } from './audit.mjs';

const execute = promisify(execFile);
const decompress = promisify(gunzip);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error(code); };
const repository = 'jakobjorgensen82-commits/RavRadar';
const api = 'https://api.github.com/repos/' + repository;
const attempt = 1;
const targets = [
  { runId: 45065945955, head: '82c1bbbd2d1abf5817adfd151d684e6aa5bf50ec',
    id: 14776736823, bytes: 258439378, digest: 'sha256:a10527f1fd648d6efd2216ef2e206432312d1e8d6d673f0dee506c60fea251ce',
    datasetId: 'rr-20261122220312-210', reference: '2026-11-22T20:00:00.000Z', jobId: 137342354268,
    bundleSha256: '8377b81b913776b7ad9d45d80091c0b1166c57d4bfa3bf496a4688a038551e81' },
  { runId: 45088278207, head: 'fdf7078929d477092e247a4bee00146952aeebc7',
    id: 14786056986, bytes: 260527732, digest: 'sha256:29b2fe3a1f88236d976e9876cdc3be62942be089098fc22a1371d32c8477bc6c',
    datasetId: 'rr-20261123020235-210', reference: H0, jobId: 137412108521,
    bundleSha256: 'e7ce1396bf0ba43c2b9441aaa420c198183b54639551344ad3e04176cc9b62b5' },
];
const current = targets[1];
// Observed from the exact authenticated job 137412108521 restore receipt
// (step 59, 00:23:54.2458511Z). Both B373 create/seal steps emitted this SHA.
const restoredB374Input = '8377b81b913776b7ad9d45d80091c0b1166c57d4bfa3bf496a4688a038551e81';
const publicManifestSha = 'd8ce6d6a3e26c8f3be0206f869602b3288f12aa8bbd2144cf2bf8c0641ba606c';
const zoneRegistrySha = 'cd2ff012e1c5b9c8536ed02e13c756ed3cc982780a9c901cc67a33059a5a4086';
const routingFileSha = '9a814f69bab416f419aed65787796e9d8b53036f216691edbbdd7ca94e39d7b1';
const routingConfigurationSha256 = '167a62644387018349e0d16837f953e7b8c7b0b364ca21ec6ad5345728e4d4ee';

export function ordinaryStageIdentity(runNumber) {
  const target = targets.find(row => row.runId === runNumber);
  if (!target) fail('B374_UNPINNED_STAGE');
  return { repository, runId: String(target.runId), runAttempt: String(attempt), sourceHead: target.head };
}

const restoreStep = 'Verify and restore the private production runtime bundle';
const installedStep = 'Install only the allowlisted restored private runtime files';
const selectorStep = 'Classify one-time DMI PART continuity donor';
const donorStep = 'Restore exact previous native DMI donor without older score state';
const protectedCopyStep = 'Preserve deployed DMI zone cache as safe fallback';
const buildStep = 'Update central weather cache';
const modifiedInputSteps = [
  'Preserve original pairs and rebind metadata before new-hour source reconstruction',
  'Preserve nationwide originals before new-hour current-grid reconstruction',
  'Rebind the exact bounded-conditions predecessor before installation',
  'Rebind exact 11Z private state without changing weather measurements',
  'Import exact public Candidate G runtime only for first integrated bootstrap',
  'Reapply exact verified weather sources after private runtime installation',
  'Reconcile the paired 15Z originals with the working weather sources',
];

export function verifyNormalInputSteps(job) {
  if (job?.id !== current.jobId || job.head_sha !== current.head || job.run_id !== current.runId
    || job.run_attempt !== attempt || job.conclusion !== 'success') fail('B374_PRODUCER_JOB_IDENTITY');
  function step(name, conclusion) {
    const matches = job?.steps?.filter(item => item.name === name) ?? [];
    const only = matches[0];
    if (matches.length !== 1 || only.status !== 'completed' || only.conclusion !== conclusion
      || !Number.isSafeInteger(only.number)) fail('B374_ACTUAL_STEP_BINDING');
    return only;
  }
  const restore = step(restoreStep, 'success');
  const chain = [restore, step(installedStep, 'success'), step(selectorStep, 'success'),
    step(donorStep, 'skipped'), step(protectedCopyStep, 'success'), step(buildStep, 'success')];
  if (restore.number !== 59 || chain[2].number !== 66 || chain[3].number !== 67) fail('B374_ACTUAL_STEP_NUMBER');
  if (!chain.every((item, i) => i === 0 || item.number > chain[i - 1].number)) fail('B374_ACTUAL_STEP_ORDER');
  const exactHandoff = step('Verify rebuilt closure exactly matches the run-bound source handoff', 'skipped');
  if (exactHandoff.number !== 150 || exactHandoff.number >= chain[5].number) fail('B374_ACTUAL_STEP_ORDER');
  for (const name of modifiedInputSteps) {
    if (step(name, 'skipped').number >= chain[4].number) fail('B374_ACTUAL_STEP_ORDER');
  }
  if (!(Date.parse(restore.started_at) <= Date.parse(restore.completed_at))) fail('B374_ACTUAL_STEP_CLOCK');
  return restore;
}

async function sourceModules(root, target) {
  const directory = await fs.realpath(root);
  const git = async args => (await execute('git', ['-C', directory, ...args], { timeout: 12_000 })).stdout.trim();
  if (await git(['rev-parse', 'HEAD']) !== target.head
    || await git(['status', '--porcelain', '--untracked-files=all']) !== '') fail('B374_ARCHIVED_READER_SOURCE');
  const load = name => import(pathToFileURL(path.join(directory, name)));
  const [stage, bindings, workflow, artifact, audit] = await Promise.all([
    load('scripts/staged-private-production-runtime.mjs'), load('js/core/ravscore-model-contract.js'),
    load('scripts/private-production-runtime-workflow.mjs'), load('scripts/ordinary-completed-stage-artifact.mjs'),
    load('scripts/audit-saved-weather-inputs.mjs'),
  ]);
  return { load, directory, stage, artifact, withoutSecrets: audit.withoutSavedAuditSecrets,
    binding: bindings.ravScoreModelBinding(),
    contracts: await workflow.privateRuntimeContractHashes({ repositoryRoot: directory }) };
}

async function open(target, modules, privateRoot, token, masterSecret, artifacts) {
  let producerJobs;
  const transport = async (url, options) => {
    if (url.startsWith(api + '/actions/artifacts/') && url !== `${api}/actions/artifacts/${target.id}/zip`) {
      fail('B374_PINNED_STAGE_MISMATCH');
    }
    const response = await fetch(url, options);
    if (target === current && url === `${api}/actions/runs/${target.runId}/attempts/1/jobs?per_page=100`
      && response.status === 200) producerJobs = response.clone().json().catch(() => null);
    return response;
  };
  const identity = ordinaryStageIdentity(target.runId);
  const downloaded = await modules.withoutSecrets(() => modules.artifact.downloadOrdinaryCompletedStageArtifact({
    ...identity, token, fetchImpl: transport,
  }));
  artifacts.push(downloaded.privateDirectory);
  if (downloaded.producer.jobId !== target.jobId || downloaded.artifact.id !== target.id || downloaded.artifact.bytes !== target.bytes
    || downloaded.artifact.digest !== target.digest) fail('B374_PINNED_STAGE_MISMATCH');
  const bundlePath = path.join(privateRoot, 'bundle');
  const { reference, datasetId } = target;
  await fs.mkdir(privateRoot, { mode: 0o700 });
  const result = await modules.withoutSecrets(() => modules.stage.openStagedPrivateProductionRuntime({
    inputPath: downloaded.sealedPath, privateRoot, bundlePath, repositoryRoot: modules.directory,
    expected: { modelBinding: modules.binding, contractHashes: modules.contracts, datasetId,
      productionReferenceAt: reference, targetReferenceAt: reference, minimumReferenceAt: reference,
      minimumGeneratedAt: reference },
    ...identity, masterSecret,
  }));
  const manifest = JSON.parse(await fs.readFile(path.join(bundlePath, 'manifest.json')));
  if (result.restored !== true || result.productionPointerUnchanged !== true
    || manifest.bundleContentSha256 !== result.bundleContentSha256 || manifest.bundleContentSha256 !== target.bundleSha256
    || manifest.productionReferenceAt !== reference || manifest.datasetId !== datasetId
    || !same(manifest.modelBinding, modules.binding) || !same(manifest.contractHashes, modules.contracts)) {
    fail('B374_STAGE_BUNDLE_IDENTITY');
  }
  const jobs = await producerJobs;
  const job = jobs?.jobs?.find(row => row.id === downloaded.producer.jobId);
  if (target === current && (!job || job.run_id !== target.runId || job.run_attempt !== attempt
    || job.head_sha !== target.head)) fail('B374_PRODUCER_JOB_IDENTITY');
  return { manifest, job, payload: path.join(bundlePath, 'payload') };
}

async function readPublicHours(normal, packPath, conditions, publicManifest) {
  const { manifest, payloadOffset } = await normal.inspectPrivatePublicHourDeliveryPack({ packPath, conditions });
  if (manifest.productionReferenceAt !== H0 || manifest.datasetId !== current.datasetId
    || manifest.sourceDetailsSha256 !== publicManifest.publicConditionDetailsSha256
    || !same(manifest.modelBinding, publicManifest.ravScoreModelBinding)) fail('B374_PUBLIC_HOUR_MANIFEST');
  const expected = new Map(scope.map(([, id]) => [id, new Map()]));
  const handle = await fs.open(packPath, 'r');
  try {
    let position = payloadOffset;
    for (const [i, entry] of manifest.entries.entries()) {
      const time = new Date(Date.parse(H0) + i * 3_600_000).toISOString();
      if (entry.time !== time) fail('B374_PUBLIC_HOUR_AXIS');
      if (time === H0 || time === H3) {
        const compressed = Buffer.alloc(entry.compressedBytes);
        for (let offset = 0; offset < compressed.length;) {
          const { bytesRead } = await handle.read(compressed, offset, compressed.length - offset, position + offset);
          if (!bytesRead) fail('B374_PUBLIC_HOUR_TRUNCATED');
          offset += bytesRead;
        }
        if (sha(compressed) !== entry.compressedSha256) fail('B374_PUBLIC_HOUR_DIGEST');
        const raw = await decompress(compressed, { maxOutputLength: entry.bytes });
        if (raw.length !== entry.bytes || sha(raw) !== entry.sha256) fail('B374_PUBLIC_HOUR_DIGEST');
        const row = JSON.parse(raw);
        if (row.datasetId !== current.datasetId || row.generatedAt !== conditions.generatedAt
          || row.productionReferenceAt !== H0 || row.delivery?.schemaVersion !== 1
          || row.delivery.kind !== 'hour' || row.delivery.key !== time
          || row.delivery.sourceDetailsSha256 !== manifest.sourceDetailsSha256
          || !same(row.delivery.modelBinding, manifest.modelBinding)) fail('B374_PUBLIC_HOUR_IDENTITY');
        for (const [zoneId, id] of scope) {
          const part = row.coastalParts?.parts?.[id];
          if (part?.id !== id || part.zoneId !== zoneId || part.current?.time !== time
            || !part.current.weather) fail('B374_PUBLIC_PART_IDENTITY');
          const { waterLevelCm, waterLevelTrendCm3h } = part.current.weather;
          expected.get(id).set(time, { waterLevelCm, waterLevelTrendCm3h });
        }
      }
      position += entry.compressedBytes;
    }
  } finally {
    await handle.close();
  }
  return expected;
}

// Runner-only entry point. Supply pinned public files and both checked-out
// historical readers in the authorized GitHub-hosted runner.
async function runBound({
  sourceRoots, manifestBytes, zonesBytes, routingBytes, githubToken, stageMasterSecret,
}) {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted'
    || process.env.GITHUB_REPOSITORY !== repository || !process.env.RUNNER_TEMP) fail('B374_HOSTED_READER_REQUIRED');
  if (sha(manifestBytes) !== publicManifestSha || sha(zonesBytes) !== zoneRegistrySha
    || sha(routingBytes) !== routingFileSha) fail('B374_PUBLIC_FILE_DIGEST');
  const publicManifest = JSON.parse(manifestBytes);
  const geometry = JSON.parse(zonesBytes);
  const routing = JSON.parse(routingBytes);
  if (publicManifest.datasetId !== current.datasetId || publicManifest.productionReferenceAt !== H0
    || publicManifest.zoneRegistrySha256 !== zoneRegistrySha) fail('B374_PUBLIC_GENERATION_IDENTITY');
  const work = await fs.mkdtemp(path.join(await fs.realpath(process.env.RUNNER_TEMP), 'rr-b374-audit-'));
  const artifactDirectories = [];
  try {
    const older = await sourceModules(sourceRoots[0], targets[0]);
    const newer = await sourceModules(sourceRoots[1], current);
    const b374 = await open(current, newer, path.join(work, 'b374'), githubToken, stageMasterSecret, artifactDirectories);
    verifyNormalInputSteps(b374.job);
    const b373 = await open(targets[0], older, path.join(work, 'b373'), githubToken, stageMasterSecret, artifactDirectories);
    if (restoredB374Input !== b373.manifest.bundleContentSha256) fail('B374_PREDECESSOR_NOT_B373');
    const [forecast, router, restrictions, partRecovery, bulk, companion, publicHours] = await Promise.all([
      'dmi-forecast-file', 'water-source-forecast-routing', 'dmi-marine-zone-exclusions', 'private-dmi-recovery-record',
      'dmi-bulk-storage', 'private-weather-component-pack', 'public-hour-delivery-pack',
    ].map(name => newer.load(`scripts/lib/${name}.mjs`)));
    const read = async (root, relative) => JSON.parse(await fs.readFile(path.join(root, relative)));
    const fromCache = b => forecast.inspectDmiForecastFile(path.join(b.payload, 'data/live/dmi-forecast-cache.json'));
    const [thisCache, previousCache] = await Promise.all([fromCache(b374), fromCache(b373)]);
    if (!previousCache.hasPartContinuity || ![1, 2].includes(previousCache.continuity?.metadata.schemaVersion)) {
      fail('B374_HISTORICAL_DONOR_STATE_UNPROVED');
    }
    const unpackIndex = async (cache, target) => {
      const packed = await forecast.readDmiWaterSourceContinuity(cache);
      if (packed?.productionReferenceAt !== target.reference) fail('B374_SOURCE_CONTINUITY_IDENTITY');
      return router.unpackWaterSourceForecastContinuity(packed, H0);
    };
    const [conditions, stationDocument, diagnostics] = await Promise.all([
      'conditions', 'dmi-water-stations', 'ravradar-runtime-diagnostics',
    ].map(name => read(b374.payload, `data/live/${name}.json`)));
    if (diagnostics.lf7WaterRouting?.configurationSha256 !== routingConfigurationSha256) fail('B374_ROUTING_DIGEST_UNPROVED');
    const companions = path.join(work, 'dmi-companions');
    const descriptor = b374.manifest.files.find(row => row.relativePath === '.cache/weather-component-inputs.pack');
    await newer.withoutSecrets(() => companion.unpackPrivateWeatherComponentCompanions({
      restoredRoot: b374.payload, outputRoot: companions, conditions, expectedPackDescriptor: descriptor,
    }));
    const [activeBulk, protectedBulk, sealedIndex, retainedIndex, hours] = await Promise.all([
      bulk.readDmiBulkDocument(path.join(companions, '.cache/dmi-candidate-progress.json')),
      bulk.readDmiBulkDocument(path.join(b373.payload, 'data/live/dmi-bulk-cache.json')),
      unpackIndex(thisCache, current), unpackIndex(previousCache, targets[0]),
      readPublicHours(publicHours, path.join(b374.payload, '.cache/public-hour-delivery.pack'), conditions, publicManifest),
    ]);
    const cases = new Map(scope.map(([zoneId, partId]) => {
      const part = conditions.coastalParts?.parts?.[partId];
      if (part?.zoneId !== zoneId) fail('B374_PRIVATE_PART_IDENTITY');
      return [partId, { part: { ...part, partId },
        feature: geometry.features.find(candidate => candidate.properties?.id === zoneId), publicHours: hours.get(partId) }];
    }));
    return auditB374WaterSourceSupport({
      normal: { ...router, collectionAllowedForZone: restrictions.dmiMarineCollectionAllowedForZone,
        haversineKm: partRecovery.haversineKm },
      cases, stationRegistry: stationDocument.stations, routing, routingConfigurationSha256, sealedIndex,
      activeBulk, protectedBulk, historicalBulk: null, retainedIndex,
    });
  } finally {
    await Promise.all([work, ...artifactDirectories].map(directory => fs.rm(directory, { recursive: true, force: true })));
  }
}

export async function runB374WaterSourceAudit(options) {
  try {
    return await runBound(options);
  } catch (error) {
    const code = /^(B374_|ORDINARY_STAGE_|SEALED_B374_|ALTERNATIVE_NORMAL_|AUTHENTICATED_INPUTS_)[A-Z0-9_]{1,74}$/
      .test(error?.message ?? '') ? error.message : 'B374_AUDIT_UNAVAILABLE';
    fail(code);
  }
}
