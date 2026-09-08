#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HANDOFF_KIND = 'RAVRADAR_VERIFIED_WEATHER_SOURCE_HANDOFF';
export const HANDOFF_CONTRACT_ID = 'verified-weather-source-handoff-v1';
export const PRODUCER_WORKFLOW = '.github/workflows/validate-copernicus-current-pilot.yml';
export const PRODUCER_WORKFLOWS = Object.freeze([
  PRODUCER_WORKFLOW,
  '.github/workflows/update-and-deploy.yml',
]);
export const PRODUCER_ARTIFACT_PREFIX = 'ravradar-weather-source-handoff';
export const FIRST_CUTOVER_CONFIRMATION =
  'EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE';
export const WEATHER_SOURCE_HANDOFF_CACHE_PATH =
  '.cache/verified-weather-source-handoff-cache';
const SAFE_CLOSURE_CONTRACT = 'current-operational-673x118-closure-safe-v2';
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const HEAD_SHA = /^[0-9a-f]{40}$/;
const RUN_ID = /^[1-9][0-9]{0,19}$/;
const EXACT_TARGET_COUNT = 673;
const EXACT_HOUR_COUNT = 118;
const EXACT_PAIR_COUNT = EXACT_TARGET_COUNT * EXACT_HOUR_COUNT;
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_INPUT_BYTES = 4 * 1024 * 1024 * 1024;
const ATTESTATION_FIELDS = new Set([
  'schemaVersion', 'kind', 'contractId', 'repository', 'producerWorkflow',
  'producerEvent', 'producerRef', 'sourceHeadSha', 'runId', 'runAttempt',
  'runnerOs', 'cacheKey', 'createdAt', 'expiresAt', 'productionReferenceAt',
  'operationalRangeEndAt', 'targetCount', 'operationalHourCount',
  'assignedPairCount', 'missingPairCount', 'overlapPairCount', 'sourceCounts',
  'closureId', 'safeProjectionSha256', 'targetRegistrySha256', 'inputs',
  'coordinatesIncluded', 'partIdsIncluded', 'pairRefsIncluded',
  'rawVectorsIncluded', 'rowsIncluded', 'attestationSha256',
]);

export const WEATHER_SOURCE_INPUTS = Object.freeze([
  Object.freeze({ id: 'dmi-candidate-progress', path: '.cache/dmi-candidate-progress.json', maximumBytes: 768 * 1024 * 1024 }),
  Object.freeze({ id: 'copernicus-current-shadow', path: '.cache/copernicus-current-shadow.json', maximumBytes: 1024 * 1024 * 1024 }),
  Object.freeze({ id: 'copernicus-current-source-stage', path: '.cache/copernicus-current-source-stage.json', maximumBytes: 512 * 1024 * 1024 }),
  Object.freeze({ id: 'current-field-shadow', path: '.cache/current-field-shadow.json', maximumBytes: 512 * 1024 * 1024 }),
  Object.freeze({ id: 'open-meteo-current-fallback', path: '.cache/open-meteo-current-fallback.json', maximumBytes: 1024 * 1024 * 1024 }),
]);

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) fail('NON_FINITE_JSON');
  return JSON.stringify(value);
}

export function canonicalSha256(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function bytesSha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function exactUtcHour(value, code = 'HANDOFF_TIME_INVALID') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(value)) fail(code);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().replace('.000Z', 'Z') !== value) fail(code);
  return parsed;
}

function canonicalInstant(value, code = 'HANDOFF_TIME_INVALID') {
  if (typeof value !== 'string') fail(code);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) fail(code);
  return parsed;
}

function validateSha(value, code) {
  if (!SHA256.test(value ?? '')) fail(code);
  return value;
}

function validateHead(value) {
  if (!HEAD_SHA.test(value ?? '')) fail('HANDOFF_HEAD_INVALID');
  return value;
}

function validateRunId(value) {
  const text = String(value ?? '');
  if (!RUN_ID.test(text)) fail('HANDOFF_RUN_ID_INVALID');
  return text;
}

function validateProducerWorkflow(value) {
  if (!PRODUCER_WORKFLOWS.includes(value)) fail('HANDOFF_PRODUCER_WORKFLOW_INVALID');
  return value;
}

function validatePositiveInteger(value, code) {
  if (!Number.isSafeInteger(value) || value < 1) fail(code);
  return value;
}

function assertInside(root, candidate, code = 'HANDOFF_PATH_INVALID') {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)) fail(code);
  return resolvedCandidate;
}

function readRegularFile(filePath, maximumBytes, code = 'HANDOFF_INPUT_INVALID') {
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch {
    fail(code);
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > maximumBytes) fail(code);
  return fs.readFileSync(filePath);
}

function readJsonFile(filePath, maximumBytes, code) {
  const bytes = readRegularFile(filePath, maximumBytes, code);
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail(code);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return { value, bytes };
}

function atomicWrite(filePath, bytes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  try {
    fs.writeFileSync(temporary, bytes, { flag: 'wx' });
    fs.renameSync(temporary, filePath);
  } finally {
    try { fs.unlinkSync(temporary); } catch {}
  }
}

function writeGithubLines(filePath, entries) {
  if (!filePath) return;
  fs.appendFileSync(filePath, entries.map(([key, value]) => `${key}=${value}\n`).join(''));
}

function sourceCountsFromClosure(closure) {
  return Object.freeze({
    dmi: closure.dmiVerifiedPairCount,
    copernicusBaltic: closure.copernicusBalticPairCount,
    copernicusAmm15: closure.copernicusAmm15PairCount,
    regionalNative: closure.regionalNativePairCount,
    regionalDerivedHold: closure.regionalDerivedHoldPairCount,
    openMeteo: closure.openMeteoPairCount,
  });
}

export function validateSafeClosure(closure) {
  if (!closure || typeof closure !== 'object' || Array.isArray(closure)
    || closure.schemaVersion !== 2
    || closure.contractId !== SAFE_CLOSURE_CONTRACT
    || closure.status !== 'READY'
    || closure.targetCount !== EXACT_TARGET_COUNT
    || closure.operationalHourCount !== EXACT_HOUR_COUNT
    || closure.totalPairCount !== EXACT_PAIR_COUNT
    || closure.missingPairCount !== 0
    || closure.coordinatesIncluded !== false
    || closure.rawVectorsIncluded !== false
    || closure.partIdsIncluded !== false
    || closure.pairRefsIncluded !== false) fail('HANDOFF_CLOSURE_INVALID');
  const reference = exactUtcHour(closure.productionReferenceAt, 'HANDOFF_CLOSURE_INVALID');
  const end = exactUtcHour(closure.operationalRangeEndAt, 'HANDOFF_CLOSURE_INVALID');
  if (end.getTime() - reference.getTime() !== 117 * 3_600_000) fail('HANDOFF_CLOSURE_HORIZON_INVALID');
  validateSha(closure.closureId, 'HANDOFF_CLOSURE_INVALID');
  validateSha(closure.safeProjectionSha256, 'HANDOFF_CLOSURE_INVALID');
  validateSha(closure.targetRegistrySha256, 'HANDOFF_CLOSURE_INVALID');
  const unsigned = Object.fromEntries(
    Object.entries(closure).filter(([key]) => key !== 'safeProjectionSha256'),
  );
  if (canonicalSha256(unsigned) !== closure.safeProjectionSha256) fail('HANDOFF_CLOSURE_HASH_INVALID');
  const sourceCounts = sourceCountsFromClosure(closure);
  if (Object.values(sourceCounts).some(value => !Number.isSafeInteger(value) || value < 0)
    || Object.values(sourceCounts).reduce((sum, value) => sum + value, 0) !== EXACT_PAIR_COUNT) {
    fail('HANDOFF_CLOSURE_CARDINALITY_INVALID');
  }
  return { reference, end, sourceCounts };
}

function cacheKey({ runnerOs, sourceHeadSha, runId, runAttempt }) {
  if (typeof runnerOs !== 'string' || !/^[A-Za-z0-9._-]{1,32}$/.test(runnerOs)) fail('HANDOFF_RUNNER_OS_INVALID');
  return `weather-source-handoff-v1-${runnerOs}-${sourceHeadSha}-${runId}-${runAttempt}`;
}

function unsignedAttestation(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'attestationSha256'));
}

export function validateAttestation(attestation, expected = {}) {
  if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)
    || Object.keys(attestation).length !== ATTESTATION_FIELDS.size
    || Object.keys(attestation).some(key => !ATTESTATION_FIELDS.has(key))
    || attestation.schemaVersion !== 1
    || attestation.kind !== HANDOFF_KIND
    || attestation.contractId !== HANDOFF_CONTRACT_ID
    || !PRODUCER_WORKFLOWS.includes(attestation.producerWorkflow)
    || attestation.producerEvent !== 'workflow_dispatch'
    || attestation.producerRef !== 'refs/heads/main'
    || attestation.targetCount !== EXACT_TARGET_COUNT
    || attestation.operationalHourCount !== EXACT_HOUR_COUNT
    || attestation.assignedPairCount !== EXACT_PAIR_COUNT
    || attestation.missingPairCount !== 0
    || attestation.overlapPairCount !== 0
    || attestation.coordinatesIncluded !== false
    || attestation.partIdsIncluded !== false
    || attestation.pairRefsIncluded !== false
    || attestation.rawVectorsIncluded !== false
    || attestation.rowsIncluded !== false) fail('HANDOFF_ATTESTATION_INVALID');
  validateHead(attestation.sourceHeadSha);
  validateRunId(attestation.runId);
  validatePositiveInteger(attestation.runAttempt, 'HANDOFF_ATTEMPT_INVALID');
  const reference = exactUtcHour(attestation.productionReferenceAt, 'HANDOFF_ATTESTATION_INVALID');
  const expiresAt = exactUtcHour(attestation.expiresAt, 'HANDOFF_ATTESTATION_INVALID');
  if (attestation.operationalRangeEndAt !== attestation.expiresAt
    || expiresAt.getTime() - reference.getTime() !== 117 * 3_600_000) {
    fail('HANDOFF_ATTESTATION_INVALID');
  }
  canonicalInstant(attestation.createdAt, 'HANDOFF_ATTESTATION_INVALID');
  for (const key of ['closureId', 'safeProjectionSha256', 'targetRegistrySha256']) {
    validateSha(attestation[key], 'HANDOFF_ATTESTATION_INVALID');
  }
  const counts = attestation.sourceCounts;
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)
    || Object.keys(counts).sort().join(',') !== [
      'copernicusAmm15', 'copernicusBaltic', 'dmi', 'openMeteo',
      'regionalDerivedHold', 'regionalNative',
    ].sort().join(',')
    || Object.values(counts).some(value => !Number.isSafeInteger(value) || value < 0)
    || Object.values(counts).reduce((sum, value) => sum + value, 0) !== EXACT_PAIR_COUNT) {
    fail('HANDOFF_ATTESTATION_CARDINALITY_INVALID');
  }
  if (!Array.isArray(attestation.inputs) || attestation.inputs.length !== WEATHER_SOURCE_INPUTS.length) {
    fail('HANDOFF_INPUT_INVENTORY_INVALID');
  }
  for (let index = 0; index < WEATHER_SOURCE_INPUTS.length; index += 1) {
    const expectedInput = WEATHER_SOURCE_INPUTS[index];
    const actual = attestation.inputs[index];
    if (!actual || Object.keys(actual).sort().join(',') !== 'bytes,id,path,sha256'
      || actual.id !== expectedInput.id || actual.path !== expectedInput.path
      || !Number.isSafeInteger(actual.bytes) || actual.bytes < 2 || actual.bytes > expectedInput.maximumBytes
      || !SHA256.test(actual.sha256 ?? '')) fail('HANDOFF_INPUT_INVENTORY_INVALID');
  }
  if (attestation.inputs.reduce((sum, input) => sum + input.bytes, 0) > MAX_TOTAL_INPUT_BYTES) {
    fail('HANDOFF_INPUT_SIZE_INVALID');
  }
  const expectedKey = cacheKey(attestation);
  if (attestation.cacheKey !== expectedKey) fail('HANDOFF_CACHE_KEY_INVALID');
  if (!SHA256.test(attestation.attestationSha256 ?? '')
    || canonicalSha256(unsignedAttestation(attestation)) !== attestation.attestationSha256) {
    fail('HANDOFF_ATTESTATION_HASH_INVALID');
  }
  for (const [key, value] of Object.entries(expected)) {
    if (value !== undefined && attestation[key] !== value) fail('HANDOFF_IDENTITY_MISMATCH', key);
  }
  return { expiresAt };
}

export function sealWeatherSourceHandoff({
  root = process.cwd(), cacheRoot, repository, sourceHeadSha, runId, runAttempt,
  runnerOs, producerWorkflow,
  closurePath = 'data/diagnostics/current-operational-closure.json',
  createdAt = new Date().toISOString(),
}) {
  const resolvedRoot = path.resolve(root);
  const resolvedCacheRoot = assertInside(resolvedRoot, cacheRoot);
  const expectedCacheRoot = path.join(resolvedRoot, WEATHER_SOURCE_HANDOFF_CACHE_PATH);
  if (resolvedCacheRoot !== expectedCacheRoot || resolvedCacheRoot === resolvedRoot) {
    fail('HANDOFF_CACHE_ROOT_INVALID');
  }
  const { value: closure } = readJsonFile(
    assertInside(resolvedRoot, path.join(resolvedRoot, closurePath)),
    2 * 1024 * 1024,
    'HANDOFF_CLOSURE_INVALID',
  );
  const { sourceCounts } = validateSafeClosure(closure);
  validateHead(sourceHeadSha);
  const canonicalRunId = validateRunId(runId);
  const canonicalAttempt = validatePositiveInteger(Number(runAttempt), 'HANDOFF_ATTEMPT_INVALID');
  const canonicalProducerWorkflow = validateProducerWorkflow(producerWorkflow);
  canonicalInstant(createdAt, 'HANDOFF_ATTESTATION_INVALID');
  if (typeof repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    fail('HANDOFF_REPOSITORY_INVALID');
  }
  fs.rmSync(resolvedCacheRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(resolvedCacheRoot, 'payload'), { recursive: true });
  const inputs = WEATHER_SOURCE_INPUTS.map(descriptor => {
    const sourcePath = assertInside(resolvedRoot, path.join(resolvedRoot, descriptor.path));
    const bytes = readRegularFile(sourcePath, descriptor.maximumBytes);
    const destination = path.join(resolvedCacheRoot, 'payload', path.basename(descriptor.path));
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    return Object.freeze({
      id: descriptor.id,
      path: descriptor.path,
      sha256: bytesSha256(bytes),
      bytes: bytes.length,
    });
  });
  const attestation = {
    schemaVersion: 1,
    kind: HANDOFF_KIND,
    contractId: HANDOFF_CONTRACT_ID,
    repository,
    producerWorkflow: canonicalProducerWorkflow,
    producerEvent: 'workflow_dispatch',
    producerRef: 'refs/heads/main',
    sourceHeadSha,
    runId: canonicalRunId,
    runAttempt: canonicalAttempt,
    runnerOs,
    cacheKey: cacheKey({ runnerOs, sourceHeadSha, runId: canonicalRunId, runAttempt: canonicalAttempt }),
    createdAt,
    expiresAt: closure.operationalRangeEndAt,
    productionReferenceAt: closure.productionReferenceAt,
    operationalRangeEndAt: closure.operationalRangeEndAt,
    targetCount: EXACT_TARGET_COUNT,
    operationalHourCount: EXACT_HOUR_COUNT,
    assignedPairCount: EXACT_PAIR_COUNT,
    missingPairCount: 0,
    overlapPairCount: 0,
    sourceCounts,
    closureId: closure.closureId,
    safeProjectionSha256: closure.safeProjectionSha256,
    targetRegistrySha256: closure.targetRegistrySha256,
    inputs,
    coordinatesIncluded: false,
    partIdsIncluded: false,
    pairRefsIncluded: false,
    rawVectorsIncluded: false,
    rowsIncluded: false,
  };
  attestation.attestationSha256 = canonicalSha256(attestation);
  validateAttestation(attestation);
  atomicWrite(path.join(resolvedCacheRoot, 'attestation.json'), `${canonicalJson(attestation)}\n`);
  return attestation;
}

export function validateArtifactInventoryEntries(entries) {
  if (!Array.isArray(entries) || entries.length !== 1 || entries[0] !== 'attestation.json') {
    fail('HANDOFF_ARTIFACT_INVENTORY_INVALID');
  }
  return true;
}

function expectedArtifactName(runId, runAttempt) {
  return `${PRODUCER_ARTIFACT_PREFIX}-${runId}-${runAttempt}`;
}

function apiHeaders(token) {
  if (typeof token !== 'string' || token.length < 1) fail('HANDOFF_TOKEN_MISSING');
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'RavRadar-verified-weather-source-handoff',
  };
}

async function fetchJson(fetchImpl, url, headers, code) {
  const response = await fetchImpl(url, { headers });
  if (!response?.ok) fail(code);
  try { return await response.json(); } catch { fail(code); }
}

export async function resolveProducerRun({
  repository, expectedHeadSha, runId, runnerOs, token,
  firstCutover, confirmation, apiUrl = 'https://api.github.com',
  fetchImpl = globalThis.fetch,
}) {
  validateHead(expectedHeadSha);
  const canonicalRunId = validateRunId(runId);
  if (firstCutover !== true || confirmation !== FIRST_CUTOVER_CONFIRMATION) {
    fail('HANDOFF_CUTOVER_AUTHORIZATION_INVALID');
  }
  if (typeof fetchImpl !== 'function') fail('HANDOFF_FETCH_UNAVAILABLE');
  const headers = apiHeaders(token);
  const base = `${apiUrl.replace(/\/$/, '')}/repos/${repository}`;
  const run = await fetchJson(fetchImpl, `${base}/actions/runs/${canonicalRunId}`, headers, 'HANDOFF_RUN_LOOKUP_FAILED');
  const attempt = validatePositiveInteger(run.run_attempt, 'HANDOFF_ATTEMPT_INVALID');
  if (String(run.id) !== canonicalRunId
    || run.repository?.full_name !== repository
    || run.head_repository?.full_name !== repository
    || !PRODUCER_WORKFLOWS.includes(run.path)
    || run.event !== 'workflow_dispatch'
    || run.head_branch !== 'main'
    || run.head_sha !== expectedHeadSha
    || run.status !== 'completed'
    || run.conclusion !== 'success') fail('HANDOFF_RUN_IDENTITY_INVALID');
  const artifactList = await fetchJson(
    fetchImpl,
    `${base}/actions/runs/${canonicalRunId}/artifacts?per_page=100`,
    headers,
    'HANDOFF_ARTIFACT_LOOKUP_FAILED',
  );
  if (!Number.isSafeInteger(artifactList?.total_count)
    || artifactList.total_count < 0
    || !Array.isArray(artifactList.artifacts)
    || artifactList.total_count !== artifactList.artifacts.length
    || artifactList.total_count > 100) {
    fail('HANDOFF_ARTIFACT_PAGINATION_INCOMPLETE');
  }
  const name = expectedArtifactName(canonicalRunId, attempt);
  const matches = artifactList.artifacts.filter(artifact => artifact?.name === name);
  if (matches.length !== 1) fail('HANDOFF_ARTIFACT_IDENTITY_INVALID');
  const artifact = matches[0];
  if (!Number.isSafeInteger(artifact.id) || artifact.id < 1
    || artifact.expired !== false
    || artifact.workflow_run?.id !== run.id
    || artifact.workflow_run?.head_branch !== 'main'
    || artifact.workflow_run?.head_sha !== expectedHeadSha
    || !SHA256.test(artifact.digest ?? '')
    || !Number.isSafeInteger(artifact.size_in_bytes)
    || artifact.size_in_bytes < 1
    || artifact.size_in_bytes > MAX_ARTIFACT_BYTES) fail('HANDOFF_ARTIFACT_IDENTITY_INVALID');
  const zipResponse = await fetchImpl(`${base}/actions/artifacts/${artifact.id}/zip`, { headers });
  if (!zipResponse?.ok) fail('HANDOFF_ARTIFACT_DOWNLOAD_FAILED');
  const zip = Buffer.from(await zipResponse.arrayBuffer());
  if (zip.length !== artifact.size_in_bytes || bytesSha256(zip) !== artifact.digest) {
    fail('HANDOFF_ARTIFACT_DIGEST_INVALID');
  }
  return {
    schemaVersion: 1,
    repository,
    producerWorkflow: run.path,
    producerEvent: 'workflow_dispatch',
    producerRef: 'refs/heads/main',
    sourceHeadSha: expectedHeadSha,
    runId: canonicalRunId,
    runAttempt: attempt,
    runnerOs,
    cacheKey: cacheKey({ runnerOs, sourceHeadSha: expectedHeadSha, runId: canonicalRunId, runAttempt: attempt }),
    artifactId: artifact.id,
    artifactName: name,
    artifactDigest: artifact.digest,
    artifactSizeBytes: artifact.size_in_bytes,
    downloadedZipSha256: bytesSha256(zip),
    zip,
  };
}

export function assertCacheInventory(cacheRoot) {
  const rootStat = fs.lstatSync(cacheRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail('HANDOFF_CACHE_INVENTORY_INVALID');
  const expected = new Set([
    'attestation.json',
    'payload',
    ...WEATHER_SOURCE_INPUTS.map(input => `payload/${path.basename(input.path)}`),
  ]);
  const actual = new Set();
  const walk = (directory, prefix = '') => {
    for (const name of fs.readdirSync(directory)) {
      const full = path.join(directory, name);
      const relative = prefix ? `${prefix}/${name}` : name;
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) fail('HANDOFF_CACHE_INVENTORY_INVALID');
      actual.add(relative);
      if (stat.isDirectory()) walk(full, relative);
    }
  };
  walk(cacheRoot);
  if (actual.size !== expected.size || [...actual].some(value => !expected.has(value))) {
    fail('HANDOFF_CACHE_INVENTORY_INVALID');
  }
}

export function installWeatherSourceHandoff({
  root = process.cwd(), cacheRoot, artifactAttestationPath, resolvedMetadataPath,
  expectedRepository, expectedHeadSha, expectedRunId, runnerOs,
  now = new Date().toISOString(), githubOutput, githubEnv,
}) {
  const resolvedRoot = path.resolve(root);
  const isolatedCacheRoot = path.resolve(cacheRoot);
  assertCacheInventory(isolatedCacheRoot);
  const cacheAttestation = readRegularFile(
    path.join(isolatedCacheRoot, 'attestation.json'), 256 * 1024, 'HANDOFF_ATTESTATION_INVALID',
  );
  const artifactAttestation = readRegularFile(
    artifactAttestationPath, 256 * 1024, 'HANDOFF_ATTESTATION_INVALID',
  );
  if (!cacheAttestation.equals(artifactAttestation)) fail('HANDOFF_ATTESTATION_MISMATCH');
  const attestation = JSON.parse(cacheAttestation.toString('utf8'));
  const resolved = JSON.parse(readRegularFile(
    resolvedMetadataPath, 256 * 1024, 'HANDOFF_RESOLVED_METADATA_INVALID',
  ).toString('utf8'));
  validateAttestation(attestation, {
    repository: expectedRepository,
    sourceHeadSha: expectedHeadSha,
    runId: validateRunId(expectedRunId),
    runAttempt: resolved.runAttempt,
    runnerOs,
    cacheKey: resolved.cacheKey,
    producerWorkflow: resolved.producerWorkflow,
  });
  if (resolved.repository !== expectedRepository || resolved.sourceHeadSha !== expectedHeadSha
    || resolved.runId !== String(expectedRunId)
    || !PRODUCER_WORKFLOWS.includes(resolved.producerWorkflow)
    || resolved.producerEvent !== 'workflow_dispatch' || resolved.producerRef !== 'refs/heads/main'
    || resolved.artifactName !== expectedArtifactName(resolved.runId, resolved.runAttempt)
    || resolved.artifactDigest !== resolved.downloadedZipSha256
    || !SHA256.test(resolved.artifactDigest ?? '')) fail('HANDOFF_RESOLVED_METADATA_INVALID');
  const nowInstant = canonicalInstant(now, 'HANDOFF_TIME_INVALID');
  if (nowInstant.getTime() > exactUtcHour(attestation.expiresAt).getTime()) fail('HANDOFF_EXPIRED');
  const staged = [];
  const backups = [];
  const installed = [];
  try {
    for (let index = 0; index < WEATHER_SOURCE_INPUTS.length; index += 1) {
      const descriptor = WEATHER_SOURCE_INPUTS[index];
      const evidence = attestation.inputs[index];
      const source = path.join(isolatedCacheRoot, 'payload', path.basename(descriptor.path));
      const bytes = readRegularFile(source, descriptor.maximumBytes);
      if (bytes.length !== evidence.bytes || bytesSha256(bytes) !== evidence.sha256) fail('HANDOFF_INPUT_HASH_INVALID');
      const destination = assertInside(resolvedRoot, path.join(resolvedRoot, descriptor.path));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const temporary = `${destination}.handoff-${process.pid}-${index}`;
      fs.writeFileSync(temporary, bytes, { flag: 'wx' });
      staged.push({ temporary, destination });
    }
    for (const { temporary, destination } of staged) {
      const backup = `${destination}.handoff-backup-${process.pid}`;
      if (fs.existsSync(destination)) {
        fs.renameSync(destination, backup);
        backups.push({ backup, destination });
      }
      fs.renameSync(temporary, destination);
      installed.push(destination);
    }
  } catch (error) {
    for (const { temporary } of staged) { try { fs.unlinkSync(temporary); } catch {} }
    for (const destination of [...installed].reverse()) {
      try { fs.unlinkSync(destination); } catch {}
    }
    for (const { backup, destination } of [...backups].reverse()) {
      try { fs.renameSync(backup, destination); } catch {}
    }
    throw error;
  }
  for (const { backup } of backups) { try { fs.unlinkSync(backup); } catch {} }
  writeGithubLines(githubOutput, [
    ['reused', 'true'],
    ['target_hour', attestation.productionReferenceAt],
    ['closure_id', attestation.closureId],
  ]);
  writeGithubLines(githubEnv, [
    ['RAVRADAR_PRODUCTION_TARGET_HOUR', attestation.productionReferenceAt],
  ]);
  return attestation;
}

export function verifyRebuiltClosure({ attestationPath, closurePath }) {
  const { value: attestation } = readJsonFile(attestationPath, 256 * 1024, 'HANDOFF_ATTESTATION_INVALID');
  validateAttestation(attestation);
  const { value: closure } = readJsonFile(closurePath, 2 * 1024 * 1024, 'HANDOFF_CLOSURE_INVALID');
  const { sourceCounts } = validateSafeClosure(closure);
  for (const key of [
    'productionReferenceAt', 'operationalRangeEndAt', 'closureId',
    'safeProjectionSha256', 'targetRegistrySha256',
  ]) {
    if (closure[key] !== attestation[key]) fail('HANDOFF_REBUILT_CLOSURE_MISMATCH', key);
  }
  if (canonicalJson(sourceCounts) !== canonicalJson(attestation.sourceCounts)) {
    fail('HANDOFF_REBUILT_CLOSURE_MISMATCH', 'sourceCounts');
  }
  return true;
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) { result._.push(token); continue; }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) fail('HANDOFF_ARGUMENT_INVALID', key);
    result[key] = value;
    index += 1;
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (command === 'seal') {
    const attestation = sealWeatherSourceHandoff({
      root: args.root,
      cacheRoot: args['cache-root'],
      repository: args.repository,
      producerWorkflow: args['producer-workflow'],
      sourceHeadSha: args['source-head'],
      runId: args['run-id'],
      runAttempt: args['run-attempt'],
      runnerOs: args['runner-os'],
      closurePath: args.closure,
      createdAt: args['created-at'],
    });
    writeGithubLines(args['github-output'], [['cache_key', attestation.cacheKey]]);
    console.log(`Verified weather source handoff sealed: ${attestation.attestationSha256}`);
    return;
  }
  if (command === 'resolve-run') {
    const resolved = await resolveProducerRun({
      repository: args.repository,
      expectedHeadSha: args['expected-head'],
      runId: args['run-id'],
      runnerOs: args['runner-os'],
      token: process.env.GITHUB_TOKEN,
      firstCutover: args['first-cutover'] === 'true',
      confirmation: args.confirmation,
      apiUrl: process.env.GITHUB_API_URL,
    });
    fs.mkdirSync(args['output-dir'], { recursive: true });
    const metadata = { ...resolved };
    delete metadata.zip;
    atomicWrite(path.join(args['output-dir'], 'producer-artifact.zip'), resolved.zip);
    atomicWrite(path.join(args['output-dir'], 'resolved.json'), `${canonicalJson(metadata)}\n`);
    writeGithubLines(args['github-output'], [
      ['cache_key', resolved.cacheKey],
      ['run_attempt', resolved.runAttempt],
      ['artifact_name', resolved.artifactName],
      ['artifact_digest', resolved.artifactDigest],
    ]);
    console.log(`Verified exact producer run ${resolved.runId}/${resolved.runAttempt}.`);
    return;
  }
  if (command === 'validate-artifact-inventory') {
    const entries = fs.readFileSync(args['entries-file'], 'utf8')
      .split(/\r?\n/)
      .filter(Boolean);
    validateArtifactInventoryEntries(entries);
    console.log('Verified weather source handoff artifact inventory is exact.');
    return;
  }
  if (command === 'install') {
    installWeatherSourceHandoff({
      root: args.root,
      cacheRoot: args['cache-root'],
      artifactAttestationPath: args['artifact-attestation'],
      resolvedMetadataPath: args.resolved,
      expectedRepository: args.repository,
      expectedHeadSha: args['expected-head'],
      expectedRunId: args['run-id'],
      runnerOs: args['runner-os'],
      githubOutput: args['github-output'],
      githubEnv: args['github-env'],
    });
    console.log('Verified run-bound weather source handoff installed atomically.');
    return;
  }
  if (command === 'verify-closure') {
    verifyRebuiltClosure({ attestationPath: args.attestation, closurePath: args.closure });
    console.log('Rebuilt operational closure exactly matches the verified source handoff.');
    return;
  }
  fail('HANDOFF_COMMAND_INVALID');
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`${error.code ?? 'HANDOFF_FAILED'}: ${error.message}`);
    process.exitCode = 1;
  });
}
