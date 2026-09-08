import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  FIRST_CUTOVER_CONFIRMATION,
  PRODUCER_WORKFLOW,
  PRODUCER_WORKFLOWS,
  WEATHER_SOURCE_HANDOFF_CACHE_PATH,
  WEATHER_SOURCE_INPUTS,
  assertCacheInventory,
  canonicalJson,
  canonicalSha256,
  installWeatherSourceHandoff,
  resolveProducerRun,
  sealWeatherSourceHandoff,
  validateArtifactInventoryEntries,
  validateAttestation,
  verifyRebuiltClosure,
} from './verified-weather-source-handoff.mjs';

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ravradar-weather-handoff-'));
const producerRoot = path.join(temporaryRoot, 'producer');
const consumerRoot = path.join(temporaryRoot, 'consumer');
const cacheRoot = path.join(producerRoot, WEATHER_SOURCE_HANDOFF_CACHE_PATH);
const artifactRoot = path.join(temporaryRoot, 'artifact');
const repository = 'fixture/RavRadar';
const head = 'a'.repeat(40);
const runId = '34000000001';
const runAttempt = 2;
const runnerOs = 'Linux';
const reference = '2030-01-01T00:00:00Z';
const end = '2030-01-05T21:00:00Z';

const reusableWorkflow = fs.readFileSync('.github/workflows/reusable-weather-build.yml', 'utf8').replace(/\r\n/g, '\n');
const producerWorkflow = fs.readFileSync(PRODUCER_WORKFLOW, 'utf8').replace(/\r\n/g, '\n');
const orchestratorWorkflow = fs.readFileSync('.github/workflows/update-and-deploy.yml', 'utf8').replace(/\r\n/g, '\n');
const releaseGate = fs.readFileSync('scripts/release-gate.mjs', 'utf8').replace(/\r\n/g, '\n');
const privateRuntimeWorkflow = fs.readFileSync('scripts/private-production-runtime-workflow.mjs', 'utf8').replace(/\r\n/g, '\n');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function stepBlock(workflow, name) {
  const start = workflow.indexOf(`      - name: ${name}`);
  assert.notEqual(start, -1, `workflow step exists: ${name}`);
  const endIndex = workflow.indexOf('\n      - name:', start + 1);
  return workflow.slice(start, endIndex < 0 ? workflow.length : endIndex);
}

assert.deepEqual(WEATHER_SOURCE_INPUTS.map(input => input.path), [
  '.cache/dmi-candidate-progress.json',
  '.cache/copernicus-current-shadow.json',
  '.cache/copernicus-current-source-stage.json',
  '.cache/current-field-shadow.json',
  '.cache/open-meteo-current-fallback.json',
]);
assert.equal(WEATHER_SOURCE_INPUTS.some(input => input.path.startsWith('data/live/')), false);
assert.deepEqual(PRODUCER_WORKFLOWS, [
  '.github/workflows/validate-copernicus-current-pilot.yml',
  '.github/workflows/update-and-deploy.yml',
]);

const producerSeal = stepBlock(producerWorkflow, 'Seal exact run-bound verified weather source handoff');
for (const marker of [
  '--source-head "$GITHUB_SHA"',
  '--run-id "$GITHUB_RUN_ID"',
  '--run-attempt "$GITHUB_RUN_ATTEMPT"',
  '--producer-workflow ".github/workflows/validate-copernicus-current-pilot.yml"',
  '--closure data/diagnostics/current-operational-closure.json',
]) assert.equal(producerSeal.includes(marker), true, `producer seal marker: ${marker}`);
const producerCacheSave = stepBlock(producerWorkflow, 'Save exact run-bound verified weather source cache');
assert.equal(producerCacheSave.includes('path: .cache/verified-weather-source-handoff-cache'), true);
assert.equal(producerCacheSave.includes('restore-keys:'), false);
const producerSafeUpload = stepBlock(producerWorkflow, 'Upload only aggregate verified weather source handoff attestation');
for (const marker of [
  'ravradar-weather-source-handoff-${{ github.run_id }}-${{ github.run_attempt }}',
  'include-hidden-files: true',
  'path: .cache/verified-weather-source-handoff-cache/attestation.json',
]) assert.equal(producerSafeUpload.includes(marker), true, `safe upload marker: ${marker}`);
for (const forbidden of WEATHER_SOURCE_INPUTS.map(input => input.path)) {
  assert.equal(producerSafeUpload.includes(forbidden), false, `safe upload omits ${forbidden}`);
}

const normalProducerSeal = stepBlock(
  reusableWorkflow,
  'Seal normal exact run-bound verified weather source handoff',
);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && inputs.produce_weather_handoff == true",
  '--producer-workflow ".github/workflows/update-and-deploy.yml"',
  '--source-head "$GITHUB_SHA"',
  '--run-id "$GITHUB_RUN_ID"',
  '--run-attempt "$GITHUB_RUN_ATTEMPT"',
  '--closure data/diagnostics/current-operational-closure.json',
]) assert.equal(normalProducerSeal.includes(marker), true, `normal producer seal marker: ${marker}`);
const normalProducerCacheSave = stepBlock(
  reusableWorkflow,
  'Save normal exact run-bound verified weather source cache',
);
assert.equal(normalProducerCacheSave.includes('restore-keys:'), false);
const normalProducerSafeUpload = stepBlock(
  reusableWorkflow,
  'Upload only aggregate normal verified weather source handoff attestation',
);
assert.equal(normalProducerSafeUpload.includes('include-hidden-files: true'), true);
assert.equal(normalProducerSafeUpload.includes('path: .cache/verified-weather-source-handoff-cache/attestation.json'), true);
for (const forbidden of WEATHER_SOURCE_INPUTS.map(input => input.path)) {
  assert.equal(normalProducerSafeUpload.includes(forbidden), false, `normal safe upload omits ${forbidden}`);
}
assert.equal(
  reusableWorkflow.indexOf('name: Run release governance gate after refreshed data validation')
    < reusableWorkflow.indexOf('name: Seal normal exact run-bound verified weather source handoff'),
  true,
  'normal handoff is sealed only after the full release gate',
);
assert.equal(
  reusableWorkflow.includes('candidate-maintenance|candidate-legacy-maintenance'),
  true,
  'normal handoff supports both documented pre-cutover maintenance states',
);

const restoreBlock = stepBlock(reusableWorkflow, 'Restore exact run-bound verified weather source cache');
assert.equal(restoreBlock.includes('fail-on-cache-miss: true'), true);
assert.equal(restoreBlock.includes('restore-keys:'), false);
const artifactValidation = stepBlock(reusableWorkflow, 'Validate and extract only aggregate handoff attestation');
assert.equal(
  artifactValidation.indexOf('validate-artifact-inventory') < artifactValidation.indexOf('unzip -qq'),
  true,
  'archive inventory is fail-closed before extraction',
);
assert.equal(
  reusableWorkflow.indexOf('name: Install exact verified weather sources atomically')
    < reusableWorkflow.indexOf('name: Restore the latest atomic schema-6 and Candidate G rollback checkpoint'),
  true,
  'attested target is locked before target-dependent state',
);
const firstHandoffInstallPosition = reusableWorkflow.indexOf('name: Install exact verified weather sources atomically');
const privateRuntimeInstallPosition = reusableWorkflow.indexOf('name: Install only the allowlisted restored private runtime files');
const handoffReapplyPosition = reusableWorkflow.indexOf('name: Reapply exact verified weather sources after private runtime installation');
const legacyBootstrapPosition = reusableWorkflow.indexOf('name: Resolve the one-time Candidate G bootstrap gate');
assert.equal(
  firstHandoffInstallPosition < privateRuntimeInstallPosition
    && privateRuntimeInstallPosition < handoffReapplyPosition
    && handoffReapplyPosition < legacyBootstrapPosition,
  true,
  'private runtime overlap is repaired from the exact cache before any later consumer',
);
const privateRuntimeWeatherOverlap = WEATHER_SOURCE_INPUTS
  .map(input => input.path)
  .filter(inputPath => privateRuntimeWorkflow.includes(`relativePath: '${inputPath}'`));
assert.deepEqual(privateRuntimeWeatherOverlap, [
  '.cache/copernicus-current-shadow.json',
  '.cache/open-meteo-current-fallback.json',
]);
const beforeFirstHandoffInstall = reusableWorkflow.slice(0, firstHandoffInstallPosition);
for (const input of WEATHER_SOURCE_INPUTS) {
  assert.equal(beforeFirstHandoffInstall.includes(input.path), false, `no provider input restore precedes handoff: ${input.path}`);
}
const handoffReapply = stepBlock(reusableWorkflow, 'Reapply exact verified weather sources after private runtime installation');
assert.equal(handoffReapply.includes("steps.weather-source-handoff.outputs.reused == 'true'"), true);
assert.equal(handoffReapply.includes('verified-weather-source-handoff.mjs install'), true);
const handoffCopernicusDisposition = stepBlock(
  reusableWorkflow,
  'Require reusable Copernicus source stage before combined current closure',
);
assert.equal(handoffCopernicusDisposition.includes('--require-source-stage-reusable'), true);
assert.equal(handoffCopernicusDisposition.includes('--require-source-stage-ready'), false);
assert.equal(
  handoffCopernicusDisposition.includes("steps.weather-source-handoff.outputs.reused != 'true'"),
  false,
  'run-bound handoff must validate and accept exact IN_PROGRESS/partial Copernicus evidence',
);
assert.equal(
  reusableWorkflow.indexOf('name: Run fast source gate before expensive data refresh')
    < reusableWorkflow.indexOf('name: Update DMI bulk model cache'),
  true,
  'source gate still precedes provider acquisition',
);
for (const name of [
  'Refresh private Copernicus cache before DMI cache churn',
  'Restore bounded DMI GRIB download cache',
  'Restore last complete active DMI generation',
  'Resolve newest terminal-proven exact-main legacy DMI generation',
  'Bootstrap the terminal-proven exact legacy DMI generation',
  'Strictly bind and materialize the active DMI generation',
  'Restore isolated DMI candidate progress for normal maintenance',
  'Restore private seven-day current-field research cache',
  'Update DMI bulk model cache',
  'Refresh private Copernicus cache after DMI cache churn',
  'Remove only invalid production Copernicus source disposition',
  'Install targeted Copernicus dependencies',
  'Verify targeted Copernicus credentials',
  'Fill only exact-hour DMI gaps from Copernicus',
  'Restore shared private Open-Meteo current progress',
  'Fill only the exact remaining current gaps from Open-Meteo',
]) assert.equal(stepBlock(reusableWorkflow, name).includes("steps.weather-source-handoff.outputs.reused != 'true'"), true, `handoff overwrite/acquisition skip: ${name}`);
for (const name of [
  'Build exact DMI-first current operational closure',
  'Build public seven-day current history and controlled live selection',
  'Update central weather cache',
  'Validate full project after fresh weather and current provenance',
  'Run release governance gate after refreshed data validation',
]) assert.equal(stepBlock(reusableWorkflow, name).includes("steps.weather-source-handoff.outputs.reused != 'true'"), false, `handoff retained step: ${name}`);
for (const marker of [
  'ravscore_integrated_weather_handoff_run_id:',
  'A verified weather handoff is accepted only by an integrated first cutover.',
  'Verified weather handoff run id is malformed.',
  'produce_weather_handoff:',
  'produce_weather_handoff_confirmation:',
  'PRODUCE-VERIFIED-WEATHER-SOURCE-HANDOFF',
]) assert.equal(orchestratorWorkflow.includes(marker), true, `orchestrator authorization marker: ${marker}`);
assert.equal(reusableWorkflow.includes('single-use'), false);
assert.equal(producerWorkflow.includes('single-use'), false);
assert.equal(
  packageJson.scripts?.['test:verified-weather-source-handoff'],
  'node scripts/test-verified-weather-source-handoff.mjs',
  'isolated handoff test has an exact package binding',
);
assert.equal(
  packageJson.scripts?.['test:workflow-action-contracts']?.includes('test:verified-weather-source-handoff'),
  true,
  'workflow action contract runs the handoff test',
);
for (const marker of [
  "await read('scripts/verified-weather-source-handoff.mjs')",
  "await read('scripts/test-verified-weather-source-handoff.mjs')",
  'test:verified-weather-source-handoff',
  'HANDOFF_ARTIFACT_PAGINATION_INCOMPLETE',
  'HANDOFF_CACHE_ROOT_INVALID',
  'HANDOFF_INPUT_HASH_INVALID',
  'name: Seal exact run-bound verified weather source handoff',
  'name: Verify rebuilt closure exactly matches the run-bound source handoff',
]) assert.equal(releaseGate.includes(marker), true, `release-gate handoff binding: ${marker}`);

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function expectCode(callback, code) {
  assert.throws(callback, error => error?.code === code, code);
}

function safeClosure(overrides = {}) {
  const closure = {
    schemaVersion: 2,
    contractId: 'current-operational-673x118-closure-safe-v2',
    closureId: canonicalSha256('closure'),
    status: 'READY',
    productionReferenceAt: reference,
    operationalRangeEndAt: end,
    targetCount: 673,
    operationalHourCount: 118,
    totalPairCount: 673 * 118,
    dmiVerifiedPairCount: (673 * 118) - 5,
    copernicusBalticPairCount: 1,
    copernicusAmm15PairCount: 1,
    regionalNativePairCount: 1,
    regionalDerivedHoldPairCount: 1,
    openMeteoPairCount: 1,
    missingPairCount: 0,
    targetRegistrySha256: canonicalSha256('targets'),
    coordinatesIncluded: false,
    rawVectorsIncluded: false,
    partIdsIncluded: false,
    pairRefsIncluded: false,
    ...overrides,
  };
  delete closure.safeProjectionSha256;
  closure.safeProjectionSha256 = canonicalSha256(closure);
  return closure;
}

try {
  fs.mkdirSync(producerRoot, { recursive: true });
  fs.mkdirSync(consumerRoot, { recursive: true });
  for (const [index, input] of WEATHER_SOURCE_INPUTS.entries()) {
    writeJson(path.join(producerRoot, input.path), { fixture: input.id, index });
  }
  const closurePath = 'data/diagnostics/current-operational-closure.json';
  writeJson(path.join(producerRoot, closurePath), safeClosure());

  const attestation = sealWeatherSourceHandoff({
    root: producerRoot,
    cacheRoot,
    repository,
    producerWorkflow: PRODUCER_WORKFLOW,
    sourceHeadSha: head,
    runId,
    runAttempt,
    runnerOs,
    closurePath,
    createdAt: '2029-12-31T23:00:00.000Z',
  });
  assert.equal(attestation.assignedPairCount, 79_414);
  assert.equal(attestation.missingPairCount, 0);
  assert.equal(attestation.overlapPairCount, 0);
  assertCacheInventory(cacheRoot);
  validateArtifactInventoryEntries(['attestation.json']);
  for (const unsafe of [[], ['attestation.json', 'private.json'], ['../attestation.json'], ['/attestation.json']]) {
    expectCode(() => validateArtifactInventoryEntries(unsafe), 'HANDOFF_ARTIFACT_INVENTORY_INVALID');
  }

  const attestationText = fs.readFileSync(path.join(cacheRoot, 'attestation.json'), 'utf8');
  const safeAttestation = JSON.parse(attestationText);
  for (const key of [
    'coordinatesIncluded', 'partIdsIncluded', 'pairRefsIncluded',
    'rawVectorsIncluded', 'rowsIncluded',
  ]) assert.equal(safeAttestation[key], false, `${key} privacy flag`);
  for (const forbiddenKey of ['coordinates', 'partIds', 'pairRefs', 'rows', 'uMps', 'vMps', 'assignments']) {
    assert.equal(Object.hasOwn(safeAttestation, forbiddenKey), false, `safe attestation omits ${forbiddenKey}`);
  }
  const unexpectedPrivateField = { ...safeAttestation, privatePayload: { rowCount: 1 } };
  delete unexpectedPrivateField.attestationSha256;
  unexpectedPrivateField.attestationSha256 = canonicalSha256(unexpectedPrivateField);
  expectCode(
    () => validateAttestation(unexpectedPrivateField),
    'HANDOFF_ATTESTATION_INVALID',
  );
  const shortenedHorizon = {
    ...safeAttestation,
    expiresAt: '2030-01-05T20:00:00Z',
    operationalRangeEndAt: '2030-01-05T20:00:00Z',
  };
  delete shortenedHorizon.attestationSha256;
  shortenedHorizon.attestationSha256 = canonicalSha256(shortenedHorizon);
  expectCode(() => validateAttestation(shortenedHorizon), 'HANDOFF_ATTESTATION_INVALID');
  assert.equal(attestationText.includes('FIXTURE-'), false, 'safe artifact omits private part identities');

  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.copyFileSync(path.join(cacheRoot, 'attestation.json'), path.join(artifactRoot, 'attestation.json'));
  const artifactDigest = `sha256:${'b'.repeat(64)}`;
  const resolved = {
    schemaVersion: 1,
    repository,
    producerWorkflow: PRODUCER_WORKFLOW,
    producerEvent: 'workflow_dispatch',
    producerRef: 'refs/heads/main',
    sourceHeadSha: head,
    runId,
    runAttempt,
    runnerOs,
    cacheKey: attestation.cacheKey,
    artifactId: 99,
    artifactName: `ravradar-weather-source-handoff-${runId}-${runAttempt}`,
    artifactDigest,
    artifactSizeBytes: 100,
    downloadedZipSha256: artifactDigest,
  };
  const resolvedPath = path.join(temporaryRoot, 'resolved.json');
  writeJson(resolvedPath, resolved);
  installWeatherSourceHandoff({
    root: consumerRoot,
    cacheRoot,
    artifactAttestationPath: path.join(artifactRoot, 'attestation.json'),
    resolvedMetadataPath: resolvedPath,
    expectedRepository: repository,
    expectedHeadSha: head,
    expectedRunId: runId,
    runnerOs,
    now: '2030-01-01T01:00:00.000Z',
  });
  for (const input of WEATHER_SOURCE_INPUTS) {
    assert.deepEqual(
      fs.readFileSync(path.join(consumerRoot, input.path)),
      fs.readFileSync(path.join(producerRoot, input.path)),
      `installed ${input.id}`,
    );
  }
  verifyRebuiltClosure({
    attestationPath: path.join(artifactRoot, 'attestation.json'),
    closurePath: path.join(producerRoot, closurePath),
  });
  writeJson(path.join(producerRoot, 'mismatched-closure.json'), safeClosure({ closureId: canonicalSha256('other') }));
  expectCode(() => verifyRebuiltClosure({
    attestationPath: path.join(artifactRoot, 'attestation.json'),
    closurePath: path.join(producerRoot, 'mismatched-closure.json'),
  }), 'HANDOFF_REBUILT_CLOSURE_MISMATCH');
  expectCode(() => installWeatherSourceHandoff({
    root: consumerRoot,
    cacheRoot,
    artifactAttestationPath: path.join(artifactRoot, 'attestation.json'),
    resolvedMetadataPath: resolvedPath,
    expectedRepository: repository,
    expectedHeadSha: head,
    expectedRunId: runId,
    runnerOs,
    now: '2030-01-05T22:00:00.000Z',
  }), 'HANDOFF_EXPIRED');
  installWeatherSourceHandoff({
    root: consumerRoot,
    cacheRoot,
    artifactAttestationPath: path.join(artifactRoot, 'attestation.json'),
    resolvedMetadataPath: resolvedPath,
    expectedRepository: repository,
    expectedHeadSha: head,
    expectedRunId: runId,
    runnerOs,
    now: '2030-01-05T21:00:00.000Z',
  });

  for (const scenario of [
    ['extra', root => writeJson(path.join(root, 'payload', 'extra.json'), { private: true }), 'HANDOFF_CACHE_INVENTORY_INVALID'],
    ['missing', root => fs.unlinkSync(path.join(root, 'payload', path.basename(WEATHER_SOURCE_INPUTS[0].path))), 'HANDOFF_CACHE_INVENTORY_INVALID'],
    ['tamper', root => writeJson(path.join(root, 'payload', path.basename(WEATHER_SOURCE_INPUTS[0].path)), { tampered: true }), 'HANDOFF_INPUT_HASH_INVALID'],
  ]) {
    const [name, mutate, code] = scenario;
    const root = path.join(temporaryRoot, `cache-${name}`);
    copyDirectory(cacheRoot, root);
    mutate(root);
    if (code === 'HANDOFF_CACHE_INVENTORY_INVALID') expectCode(() => assertCacheInventory(root), code);
    else expectCode(() => installWeatherSourceHandoff({
      root: consumerRoot,
      cacheRoot: root,
      artifactAttestationPath: path.join(artifactRoot, 'attestation.json'),
      resolvedMetadataPath: resolvedPath,
      expectedRepository: repository,
      expectedHeadSha: head,
      expectedRunId: runId,
      runnerOs,
      now: '2030-01-01T01:00:00.000Z',
    }), code);
  }
  const symlinkRoot = path.join(temporaryRoot, 'cache-symlink');
  copyDirectory(cacheRoot, symlinkRoot);
  const symlinkFile = path.join(symlinkRoot, 'payload', path.basename(WEATHER_SOURCE_INPUTS[0].path));
  fs.unlinkSync(symlinkFile);
  try {
    fs.symlinkSync(path.join(producerRoot, WEATHER_SOURCE_INPUTS[0].path), symlinkFile, 'file');
    expectCode(() => assertCacheInventory(symlinkRoot), 'HANDOFF_CACHE_INVENTORY_INVALID');
  } catch (error) {
    if (error?.code !== 'EPERM') throw error;
  }

  const zip = Buffer.from('exact immutable test artifact');
  const zipDigest = `sha256:${crypto.createHash('sha256').update(zip).digest('hex')}`;
  const baseRun = {
    id: Number(runId),
    run_attempt: runAttempt,
    repository: { full_name: repository },
    head_repository: { full_name: repository },
    path: PRODUCER_WORKFLOW,
    event: 'workflow_dispatch',
    head_branch: 'main',
    head_sha: head,
    status: 'completed',
    conclusion: 'success',
  };
  const baseArtifact = {
    id: 99,
    name: `ravradar-weather-source-handoff-${runId}-${runAttempt}`,
    expired: false,
    workflow_run: { id: Number(runId), head_branch: 'main', head_sha: head },
    digest: zipDigest,
    size_in_bytes: zip.length,
  };
  const mockFetch = ({ run = baseRun, artifacts = [baseArtifact], totalCount = artifacts.length, body = zip } = {}) => async url => {
    if (url.endsWith(`/actions/runs/${runId}`)) {
      return new Response(JSON.stringify(run), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes(`/actions/runs/${runId}/artifacts`)) {
      return new Response(JSON.stringify({ total_count: totalCount, artifacts }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(body, { status: 200 });
  };
  const resolvedRun = await resolveProducerRun({
    repository,
    expectedHeadSha: head,
    runId,
    runnerOs,
    token: 'fixture-token',
    firstCutover: true,
    confirmation: FIRST_CUTOVER_CONFIRMATION,
    fetchImpl: mockFetch(),
  });
  assert.equal(resolvedRun.cacheKey, attestation.cacheKey);
  assert.equal(resolvedRun.artifactDigest, zipDigest);

  const normalResolvedRun = await resolveProducerRun({
    repository,
    expectedHeadSha: head,
    runId,
    runnerOs,
    token: 'fixture-token',
    firstCutover: true,
    confirmation: FIRST_CUTOVER_CONFIRMATION,
    fetchImpl: mockFetch({
      run: { ...baseRun, path: PRODUCER_WORKFLOWS[1] },
    }),
  });
  assert.equal(normalResolvedRun.producerWorkflow, PRODUCER_WORKFLOWS[1]);

  for (const [label, mutation] of [
    ['repository', { repository: { full_name: 'attacker/repo' } }],
    ['head repository', { head_repository: { full_name: 'attacker/repo' } }],
    ['workflow', { path: '.github/workflows/attacker.yml' }],
    ['event', { event: 'push' }],
    ['branch', { head_branch: 'feature' }],
    ['head', { head_sha: 'c'.repeat(40) }],
    ['attempt', { run_attempt: 0 }],
    ['conclusion', { conclusion: 'failure' }],
  ]) {
    await assert.rejects(resolveProducerRun({
      repository,
      expectedHeadSha: head,
      runId,
      runnerOs,
      token: 'fixture-token',
      firstCutover: true,
      confirmation: FIRST_CUTOVER_CONFIRMATION,
      fetchImpl: mockFetch({ run: { ...baseRun, ...mutation } }),
    }), error => typeof error?.code === 'string', label);
  }
  await assert.rejects(resolveProducerRun({
    repository,
    expectedHeadSha: head,
    runId,
    runnerOs,
    token: 'fixture-token',
    firstCutover: false,
    confirmation: FIRST_CUTOVER_CONFIRMATION,
    fetchImpl: mockFetch(),
  }), error => error?.code === 'HANDOFF_CUTOVER_AUTHORIZATION_INVALID');
  await assert.rejects(resolveProducerRun({
    repository,
    expectedHeadSha: head,
    runId: '0',
    runnerOs,
    token: 'fixture-token',
    firstCutover: true,
    confirmation: FIRST_CUTOVER_CONFIRMATION,
    fetchImpl: mockFetch(),
  }), error => error?.code === 'HANDOFF_RUN_ID_INVALID');
  await assert.rejects(resolveProducerRun({
    repository,
    expectedHeadSha: head,
    runId,
    runnerOs,
    token: 'fixture-token',
    firstCutover: true,
    confirmation: FIRST_CUTOVER_CONFIRMATION,
    fetchImpl: mockFetch({ body: Buffer.from('tampered') }),
  }), error => error?.code === 'HANDOFF_ARTIFACT_DIGEST_INVALID');
  await assert.rejects(resolveProducerRun({
    repository,
    expectedHeadSha: head,
    runId,
    runnerOs,
    token: 'fixture-token',
    firstCutover: true,
    confirmation: FIRST_CUTOVER_CONFIRMATION,
    fetchImpl: mockFetch({ totalCount: 101 }),
  }), error => error?.code === 'HANDOFF_ARTIFACT_PAGINATION_INCOMPLETE');

  for (const invalidCacheRoot of [producerRoot, path.join(producerRoot, '.arbitrary-cache')]) {
    expectCode(() => sealWeatherSourceHandoff({
      root: producerRoot,
      cacheRoot: invalidCacheRoot,
      repository,
      producerWorkflow: PRODUCER_WORKFLOW,
      sourceHeadSha: head,
      runId,
      runAttempt,
      runnerOs,
      closurePath,
      createdAt: '2029-12-31T23:00:00.000Z',
    }), 'HANDOFF_CACHE_ROOT_INVALID');
  }

  expectCode(() => sealWeatherSourceHandoff({
    root: producerRoot,
    cacheRoot,
    repository,
    producerWorkflow: '.github/workflows/attacker.yml',
    sourceHeadSha: head,
    runId,
    runAttempt,
    runnerOs,
    closurePath,
    createdAt: '2029-12-31T23:00:00.000Z',
  }), 'HANDOFF_PRODUCER_WORKFLOW_INVALID');

  const invalidCounts = safeClosure({ dmiVerifiedPairCount: (673 * 118) - 6 });
  writeJson(path.join(producerRoot, 'invalid-counts.json'), invalidCounts);
  expectCode(() => sealWeatherSourceHandoff({
    root: producerRoot,
    cacheRoot,
    repository,
    producerWorkflow: PRODUCER_WORKFLOW,
    sourceHeadSha: head,
    runId,
    runAttempt,
    runnerOs,
    closurePath: 'invalid-counts.json',
    createdAt: '2029-12-31T23:00:00.000Z',
  }), 'HANDOFF_CLOSURE_CARDINALITY_INVALID');

  console.log('Verified weather source handoff tamper, privacy, identity and exact-closure contracts passed.');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
