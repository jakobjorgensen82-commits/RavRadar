import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import nativeFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { migrateOwnedI71NativeIdentityWorkingRuntime, validatePredecessorIdentity, ownedI71WorkingFailurePhase }
  from './migrate-post-cutover-private-runtime.mjs';
import { NATIVE_IDENTITY_RECOVERY_STAGES } from './native-sampling-identity-recovery-prewrite.mjs';
import { NATIVE_IDENTITY_PREDECESSOR, assertNativeIdentityRecoveryFrozen } from './lib/native-sampling-identity-successor-source.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { withFrozenI71Source } from './check-native-identity-frozen-i71-source.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const oldHead = '37e657867ff0f8c31f8e8489e5c9a1cf235192f9';

test('OWNED extraction is an exact inverse of every old public migration and TARGET-validator byte', async () => {
  let source = (await fs.readFile(new URL('./migrate-post-cutover-private-runtime.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const addedStart = source.indexOf('// LOCAL metadata utility only.'), addedEnd = source.indexOf('function argument(argv, name)', addedStart);
  assert(addedStart > 0 && addedEnd > addedStart);
  source = source.slice(0, addedStart) + source.slice(addedEnd);
  const wrapperStart = source.indexOf('  return migratePrivateRuntimeCore({ sourceRoot, outputRoot, bundleManifestPath,'),
    wrapperEnd = source.indexOf('  if (currentGridOriginalOnly && metadataOnly', wrapperStart);
  assert(wrapperStart > 0 && wrapperEnd > wrapperStart);
  source = source.slice(0, wrapperStart) + source.slice(wrapperEnd);
  const ownedIdentity = '  const predecessorIdentity = owned ? owned.identity : validatePredecessorIdentity(';
  assert.equal(source.split(ownedIdentity).length, 2);
  source = source.replace(ownedIdentity, '  const predecessorIdentity = validatePredecessorIdentity(');
  const pathStart = source.indexOf('  if (owned && (repository !== owned.repository'),
    pathEnd = source.indexOf('  if (currentGridOriginalOnly) {', pathStart);
  assert(pathStart > 0 && pathEnd > pathStart);
  source = source.slice(0, pathStart) + source.slice(pathEnd);
  const ownedReport = "    kind: owned ? 'RAVRADAR_OWNED_I71_NATIVE_IDENTITY_WORKING_REBIND' : 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_REBIND',\n"
    + "    ...(owned ? { admission: 'NO_ADMISSION', protectedSourceClaimed: false,\n"
    + "      sourceKind: 'RAVRADAR_NATIVE_IDENTITY_OWNED_I71_WORKING_SOURCE' } : {}),";
  assert.equal(source.split(ownedReport).length, 2);
  source = source.replace(ownedReport, "    kind: 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_REBIND',");
  assert.equal(sha(source), 'ed8fef02c6ef8716a895b8f2c45b5e8286eae0de833706ef5888322b19734117');
  const originalWindowsBytes = Buffer.from(source.replace(/\n/g, '\r\n'));
  assert.equal(originalWindowsBytes.length, 101771);
  assert.equal(sha(originalWindowsBytes), '8c3c7ad5d426d61f1ae5985342efd3763847168cc5f23b600e7028534b2b3fbf');
});

test('OWNED entry has no injected source/validator/protected-descriptor seam and grants NO_ADMISSION', async () => {
  const methods = new Map(), touched = [];
  for (const name of ['realpath', 'lstat', 'readFile', 'mkdir', 'open']) {
    methods.set(name, fs[name]); fs[name] = () => { touched.push(name); throw new Error('Unexpected operation I/O'); };
  }
  try {
    for (const override of ['repositoryRoot', 'predecessorRoot', 'expectedSourceHead', 'validator', 'protectedDescriptor']) {
      await assert.rejects(migrateOwnedI71NativeIdentityWorkingRuntime({ sourceRoot: 'owned', outputRoot: 'out',
        privateRoot: 'private', reportPath: 'report', [override]: 'not authority' }), /NO_ADMISSION/);
    }
    assert.deepEqual(touched, []);
  } finally { for (const [name, method] of methods) fs[name] = method; }
  const binding = ravScoreModelBinding();
  const descriptor = { schemaVersion: '1.0.0', kind: 'RAVRADAR_NATIVE_IDENTITY_OWNED_I71_WORKING_SOURCE',
    sourceHead: oldHead, datasetId: 'rr-controlled-owned-not-protected', bundleContentSha256: 'a'.repeat(64),
    productionReferenceAt: '2026-10-14T17:00:00.000Z', generatedAt: '2026-10-14T17:05:00.000Z',
    modelBinding: binding, contractHashes: { continuationStateContractSha256: 'b'.repeat(64),
      fullRuntimeContractSha256: 'c'.repeat(64), publicProjectionContractSha256: 'd'.repeat(64) },
    expectedZoneCount: 210, expectedPartCount: 673, privatePayloadIncluded: false };
  assert.throws(() => validatePredecessorIdentity(descriptor, oldHead), /source identity is invalid/);
});

test('actual fixed diagnostic kernel retains first phase/Error and never emits private messages, fields or unknown codes', async () => {
  const source = await fs.readFile(new URL('./native-sampling-identity-recovery-prewrite.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('const FAILURE_PHASES = '), end = source.indexOf('const inside = ', start);
  assert(start > 0 && end > start);
  const { prewriteStage, prewriteRefusal } = Function('assert', 'NATIVE_IDENTITY_RECOVERY_STAGES',
    source.slice(start, end) + ';return {prewriteStage,prewriteRefusal};')(assert, NATIVE_IDENTITY_RECOVERY_STAGES);
  const privateValue = 'PRIVATE_SENTINEL_MUST_NEVER_BE_LOGGED';
  const first = Object.assign(new Error(privateValue), { code: 'ENOENT', secret: privateValue });
  const cleanup = Object.assign(new Error(privateValue + '_cleanup'), { code: 'EPERM' });
  await assert.rejects(prewriteStage('SOURCE', () => prewriteStage('OLD_GCM', async () => {
    try { throw first; } catch (error) { try { throw cleanup; } catch { /* preserve original */ } throw error; }
  })), error => error === first);
  assert.deepEqual(prewriteRefusal(first, 'prepare-build'), {
    kind: 'NATIVE_IDENTITY_RECOVERY_PREWRITE_REFUSAL', stage: 'prepare-build', phase: 'OLD_GCM', cause: 'MISSING_FILE',
  });
  const unknown = Object.assign(new Error(privateValue), { code: privateValue, data: { privateValue } });
  await assert.rejects(prewriteStage('NEW_METADATA', async () => { throw unknown; }), error => error === unknown);
  const diagnostics = JSON.stringify([prewriteRefusal(first, privateValue), prewriteRefusal(unknown, 'prepare-build'),
    prewriteRefusal(privateValue, privateValue)]);
  assert(!diagnostics.includes(privateValue)); assert(!diagnostics.includes('secret')); assert(!diagnostics.includes('data'));
  assert.equal(prewriteRefusal(unknown, 'prepare-build').cause, 'UNKNOWN');
  assert.equal(prewriteRefusal(unknown, 'prepare-build').phase, 'NEW_METADATA');
  const result = spawnSync(process.execPath, ['scripts/native-sampling-identity-recovery-prewrite.mjs', 'prepare-build'],
    { cwd: ROOT, encoding: 'utf8', env: {} });
  assert.equal(result.status, 1); assert.equal(result.stdout, '');
  let frozen = true, freezeCause;
  try { assertNativeIdentityRecoveryFrozen(); }
  catch (error) { frozen = false; freezeCause = error.code === 'NATIVE_SAMPLING_IDENTITY_BINDING_UNFROZEN' ? 'UNFROZEN' : 'UNKNOWN'; }
  assert.deepEqual(JSON.parse(result.stderr), { kind: 'NATIVE_IDENTITY_RECOVERY_PREWRITE_REFUSAL', stage: 'prepare-build',
    phase: frozen ? 'LOCATIONS' : 'SOURCE', cause: frozen ? 'CONTRACT_REJECTED' : freezeCause });
});

test('OWNED locations preserve the actual first I/O Error object and its fixed phase', async () => {
  const first = Object.assign(new Error('PRIVATE_LOCATION_VALUE'), { code: 'EACCES' });
  const original = fs.realpath;
  fs.realpath = async () => { throw first; };
  try {
    await assert.rejects(migrateOwnedI71NativeIdentityWorkingRuntime({ sourceRoot: 'source', outputRoot: 'output',
      privateRoot: 'private', reportPath: 'report' }), error => error === first);
    assert.equal(ownedI71WorkingFailurePhase(first), 'LOCATIONS');
  } finally { fs.realpath = original; }
});

test('prepare-build locations are independently owned, allow only the exact UTC spelling pair and refuse retries', async () => {
  const source = await fs.readFile(new URL('./native-sampling-identity-recovery-prewrite.mjs', import.meta.url), 'utf8');
  const helpersStart = source.indexOf('const inside = '), helpersEnd = source.indexOf('async function closed(', helpersStart);
  const start = source.indexOf('async function locations('), end = source.indexOf('async function withActualFrozenI71(', start);
  assert(helpersStart > 0 && helpersEnd > helpersStart && start > helpersEnd && end > start);
  const parent = await fs.realpath(os.tmpdir()), temporary = await fs.mkdtemp(path.join(parent, 'rr-owned-i71-locations-'));
  const progress = { source: '38768040429-1', key: 'weather-private-progress-encrypted-v2-Linux-main-38768040429-1',
    target: '2026-10-15T16:00:00.000Z' };
  const env = { RAVRADAR_NATIVE_IDENTITY_RECOVERY_OPT_IN: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ATTEMPT: '1', GITHUB_RUN_ID: '1001', RUNNER_TEMP: temporary,
    RAVRADAR_PRODUCTION_TARGET_HOUR: progress.target, QUICK_PROGRESS_SOURCE: progress.source,
    NATIVE_IDENTITY_PROGRESS_CACHE_MATCHED_KEY: progress.key, QUICK_CONFIRMATION: 'false' };
  const locations = Function('assert', 'path', 'fs', 'ROOT', 'NATIVE_IDENTITY_ORIGINAL_PROGRESS', 'process',
    source.slice(helpersStart, helpersEnd) + source.slice(start, end) + ';return locations;')(
      assert, path, fs, ROOT, progress, { env });
  try {
    for (const [id, target] of [['1001', progress.target], ['1002', '2026-10-15T16:00:00Z']]) {
      env.GITHUB_RUN_ID = id; env.RAVRADAR_PRODUCTION_TARGET_HOUR = target;
      const files = await locations('prepare-build');
      assert.equal(files.privateRoot, path.join(temporary, 'ravradar-native-identity-prewrite-' + id + '-1'));
      assert.equal((await fs.readdir(files.privateRoot)).join(','), 'prepare-build');
      await assert.rejects(locations('prepare-build'), { code: 'EEXIST' });
    }
    env.GITHUB_RUN_ID = '1003';
    for (const target of ['2026-10-15T17:00:00Z', '2026-10-15T16:00:00.001Z', '2026-10-15T18:00:00+02:00']) {
      env.RAVRADAR_PRODUCTION_TARGET_HOUR = target; await assert.rejects(locations('prepare-build'), { code: 'ERR_ASSERTION' });
    }
    env.RAVRADAR_PRODUCTION_TARGET_HOUR = progress.target; env.NATIVE_IDENTITY_PROGRESS_CACHE_MATCHED_KEY = progress.key + '-prefix';
    await assert.rejects(locations('prepare-build'), { code: 'ERR_ASSERTION' });
    await assert.rejects(fs.lstat(path.join(temporary, 'ravradar-native-identity-prewrite-1003-1')), { code: 'ENOENT' });
  } finally {
    assert.equal(path.dirname(temporary), parent); assert(path.basename(temporary).startsWith('rr-owned-i71-locations-'));
    await fs.rm(temporary, { recursive: true });
  }
});

test('fixed central inputs copy exact owned bytes and reject missing, changed, existing and uncatalogued sources', async () => {
  const source = await fs.readFile(new URL('./native-sampling-identity-recovery-prewrite.mjs', import.meta.url), 'utf8');
  const constantsStart = source.indexOf('const ORIGINAL_PROGRESS_ADMIN_INPUTS = '), constantsEnd = source.indexOf('const same = ', constantsStart);
  const start = source.indexOf('const inside = '), end = source.indexOf('async function locations(', start);
  assert(constantsStart > 0 && constantsEnd > constantsStart && start > constantsEnd && end > start);
  const { PRIVATE_WEATHER_COMPONENT_FILES } = await import('./lib/private-weather-component-inventory.mjs');
  const { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } = await import('./lib/private-weather-progress-files.mjs');
  const parent = await fs.realpath(os.tmpdir()), temporary = await fs.mkdtemp(path.join(parent, 'rr-owned-i71-central-'));
  const central = path.join(temporary, 'actual-central'); await fs.mkdir(central);
  const helpers = Function('assert', 'crypto', 'fs', 'nativeFs', 'path', 'ROOT', 'same',
    'PRIVATE_WEATHER_COMPONENT_FILES', 'PRIVATE_WEATHER_PROGRESS_ONLY_FILES',
    source.slice(constantsStart, constantsEnd) + source.slice(start, end)
      + ';return {copyOriginalProgressAdminInputs,verifyOriginalProgressAdminInputs,closedInputCatalog,stagingProgressCatalog,ORIGINAL_PROGRESS_ADMIN_INPUTS};')(
        assert, crypto, fs, nativeFs, path, central, (left, right) => assert.deepEqual(left, right),
        PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_PROGRESS_ONLY_FILES);
  const paths = helpers.ORIGINAL_PROGRESS_ADMIN_INPUTS.map(file => file.relativePath);
  assert.deepEqual(paths, ['data/live/coastal-parts-v2.json', 'data/zones.geojson']);
  async function resetCentral() {
    for (const [index, relative] of paths.entries()) {
      const file = path.join(central, relative); await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify({ controlledCopyBytesOnly: index }) + '\n');
    }
  }
  async function empty(name) { const root = path.join(temporary, name); await fs.mkdir(root); return root; }
  try {
    await resetCentral();
    const positive = await empty('positive'), proofs = await helpers.copyOriginalProgressAdminInputs(positive);
    await helpers.verifyOriginalProgressAdminInputs(positive, proofs);
    for (const relative of paths) assert.deepEqual(await fs.readFile(path.join(positive, relative)), await fs.readFile(path.join(central, relative)));
    await fs.writeFile(path.join(central, paths[1]), 'controlled changed central bytes\n');
    await assert.rejects(helpers.verifyOriginalProgressAdminInputs(positive, proofs), { code: 'ERR_ASSERTION' });
    await resetCentral();
    const missing = await empty('missing'); await fs.unlink(path.join(central, paths[1]));
    await assert.rejects(helpers.copyOriginalProgressAdminInputs(missing), { code: 'ENOENT' });
    assert.deepEqual(await fs.readdir(missing), [], 'Both actual source inputs are required BEFORE any copying');
    await resetCentral();
    const changed = await empty('changed'), copy = fs.copyFile;
    fs.copyFile = async (...args) => { await copy(...args); if (args[0] === path.join(central, paths[0])) await fs.appendFile(args[0], 'controlled concurrent change'); };
    try { await assert.rejects(helpers.copyOriginalProgressAdminInputs(changed), { code: 'ERR_ASSERTION' }); }
    finally { fs.copyFile = copy; }
    await resetCentral();
    await assert.rejects(helpers.copyOriginalProgressAdminInputs(positive), { code: 'EEXIST' });
    const catalog = await empty('catalog'), excluded = new Set(paths);
    for (const relative of [...paths, '.cache/dmi-candidate-progress.json',
      '.cache/copernicus-components/objects/' + 'a'.repeat(64) + '.nc',
      '.cache/copernicus-components/receipts/' + 'b'.repeat(64) + '-' + 'c'.repeat(64) + '.json',
      '.cache/copernicus-components/static/' + 'd'.repeat(64) + '.json']) {
      const file = path.join(catalog, relative); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, 'controlled catalog bytes\n');
    }
    const files = await helpers.closedInputCatalog(catalog, excluded, true);
    assert.equal(files.length, 4); assert(files.every(file => file.sourcePath === path.join(catalog, file.relativePath)));
    assert(files.every(file => !paths.includes(file.relativePath)));
    const extra = path.join(catalog, '.cache/unreviewed.bin'); await fs.writeFile(extra, 'unknown\n');
    await assert.rejects(helpers.closedInputCatalog(catalog, excluded, true), /Unknown working progress file/);
    await fs.unlink(extra); const directory = path.join(catalog, 'unknown-folder'); await fs.mkdir(directory);
    await assert.rejects(helpers.closedInputCatalog(catalog, excluded, true), /Unknown working progress directory/);
    await fs.rmdir(directory);
    const malformed = path.join(catalog, '.cache/copernicus-components/objects', 'a'.repeat(63) + '.nc'); await fs.writeFile(malformed, 'unknown\n');
    await assert.rejects(helpers.closedInputCatalog(catalog, excluded, true), /Unknown working progress file/);
    await fs.unlink(malformed);
    // Byte-catalog contract only: these controlled bytes are NOT a numeric
    // state proof. The separate typed module must run the real old/new oracles.
    const statePath = PRIVATE_WEATHER_COMPONENT_FILES.coastalPointState;
    const oldState = path.join(catalog, statePath); await fs.mkdir(path.dirname(oldState), { recursive: true });
    await fs.writeFile(oldState, 'controlled original state bytes\n');
    const originalBytes = await fs.readFile(oldState), stagingRoot = await empty('staging');
    const newState = path.join(stagingRoot, statePath); await fs.mkdir(path.dirname(newState), { recursive: true });
    await fs.writeFile(newState, 'controlled new working metadata bytes\n');
    const newBytes = await fs.readFile(newState);
    const stagingPaths = ['coastalPointDmi', 'coastalPointState', 'coastalPointStatus', 'coastalPointActivationState',
      'coastalPointPendingPromotion'].map(key => PRIVATE_WEATHER_COMPONENT_FILES[key]);
    const staging = { kind: 'NATIVE_IDENTITY_STAGING_WORKING_COPY', admission: 'NO_ADMISSION', originalsUnchanged: true,
      installationPerformed: false, files: [{ relativePath: statePath, sourcePath: newState, bytes: newBytes.length,
        sha256: sha(newBytes), originalBytes: originalBytes.length, originalSha256: sha(originalBytes) }],
      absentPaths: stagingPaths.filter(file => file !== statePath) };
    const originalCatalog = await helpers.closedInputCatalog(catalog, excluded, true);
    const workingCatalog = await helpers.stagingProgressCatalog(originalCatalog, staging, stagingRoot);
    assert.equal(workingCatalog.find(file => file.relativePath === statePath).sourcePath, newState);
    assert(workingCatalog.filter(file => file.relativePath !== statePath).every(file => file.sourcePath === path.join(catalog, file.relativePath)));
    assert.deepEqual(await fs.readFile(oldState), originalBytes);
    const forged = structuredClone(staging); forged.files[0].originalSha256 = '0'.repeat(64);
    await assert.rejects(helpers.stagingProgressCatalog(originalCatalog, forged, stagingRoot), { code: 'ERR_ASSERTION' });
    const dropped = { ...staging, files: [], absentPaths: stagingPaths };
    await assert.rejects(helpers.stagingProgressCatalog(originalCatalog, dropped, stagingRoot), { code: 'ERR_ASSERTION' });
    const foreign = structuredClone(staging); foreign.files[0].sourcePath = oldState;
    await assert.rejects(helpers.stagingProgressCatalog(originalCatalog, foreign, stagingRoot), { code: 'ERR_ASSERTION' });
    const extraStaging = path.join(stagingRoot, '.cache/dmi-candidate-progress.json'); await fs.writeFile(extraStaging, 'unexpected\n');
    await assert.rejects(helpers.stagingProgressCatalog(originalCatalog, staging, stagingRoot), { code: 'ERR_ASSERTION' });
    await fs.unlink(extraStaging); await fs.appendFile(newState, 'changed after receipt');
    await assert.rejects(helpers.stagingProgressCatalog(originalCatalog, staging, stagingRoot), { code: 'ERR_ASSERTION' });
  } finally {
    assert.equal(path.dirname(temporary), parent); assert(path.basename(temporary).startsWith('rr-owned-i71-central-'));
    await fs.rm(temporary, { recursive: true });
  }
});

// This fixture is produced by the genuine fixed I71/C69 pipelines. No state,
// coordinate, score or binding is copied from a current-family generator.
async function genuineI71Fixture() {
  return withFrozenI71Source(async root => {
    const load = relative => import(pathToFileURL(path.join(root, relative)).href);
    const [pipeline, candidatePipeline, staging, integrated, candidate, profile, candidateProfile, evidence] = await Promise.all([
      load('js/core/ravscore-integrated-state-pipeline.js'), load('js/core/ravscore-candidate-g-state-pipeline.js'),
      load('scripts/lib/coastal-point-staging-contract.mjs'), load('js/core/ravscore-model-contract.js'),
      load('scripts/rollback-assets/ravscore-model-contract.js'), load('js/core/ravscore-public-model.js'),
      load('scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'), load('js/core/ravscore-evidence-trust-contract.js'),
    ]);
    const ib = integrated.ravScoreModelBinding(), cb = candidate.ravScoreModelBinding();
    assert.equal(ib.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.integrated);
    assert.equal(cb.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.candidate);
    const reference = '2026-10-14T17:00:00.000Z', generatedAt = '2026-10-14T17:05:00.000Z';
    const zones = {}, parts = {}, candidateParts = {}, scoreZones = {};
    const samples = Array.from({ length: 49 }, (_, index) => ({
      time: new Date(Date.parse(reference) - (48 - index) * 3_600_000).toISOString(),
      currentSpeedMps: 0.054, currentAlignment: 1, currentVerified: true,
      waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: 270,
    }));
    for (let zoneIndex = 0; zoneIndex < 210; zoneIndex += 1) {
      const zoneId = 'OWNED-CONTROLLED-ZONE-' + zoneIndex, count = zoneIndex < 43 ? 4 : 3;
      zones[zoneId] = { forecast: { provider: 'CONTROLLED_TEST_ONLY', generatedAt, hourly: [] } };
      scoreZones[zoneId] = { expectedPartCount: count, scoredPartCount: count, currentReferenceAt: reference, hourly: [] };
      for (let index = 0; index < count; index += 1) {
        const partId = zoneId + '::OWNED-PART-' + index;
        const part = { partId, zoneId, name: 'Controlled owned part', waterPoint: [8, 55], landPoint: [8.01, 55],
          onshoreDirectionDeg: 90, onshoreDirectionSource: 'landPoint', marineCoverage: 'controlled', current: null, hourly: [] };
        const identity = staging.coastalPointStageIdentity(part);
        const originalI = pipeline.buildIntegratedRavScoreStateSeries(samples, {
          samplingContextKey: identity.samplingContextKey, onshoreDirectionDeg: part.onshoreDirectionDeg }).continuationState;
        const originalC = candidatePipeline.buildCandidateGDerivedStateSeries(samples, {
          stateKey: identity.expectedCandidateGStateKey }).continuationState;
        staging.assertIntegratedCoastalPointContinuation(originalI, { samplingContextKey: identity.samplingContextKey });
        staging.assertCandidateGCoastalPointRollbackContinuation(originalC, identity.expectedCandidateGStateKey);
        parts[partId] = { ...part, ravScoreModel: { ...ib, currentState: originalI, modes: {} } };
        candidateParts[partId] = { ...part, ravScoreModel: { ...cb, currentState: originalC, modes: {} } };
      }
    }
    assert.equal(Object.keys(parts).length, 673);
    const conditions = { datasetId: 'rr-controlled-owned-i71-673', generatedAt, productionReferenceAt: reference, zones,
      coastalParts: { schemaVersion: 1, enabled: true, generatedAt, expectedPartCount: 673, scoredPartCount: 673,
        marginPoints: 7, modelBinding: ib, evidenceTrust: evidence.ravScoreVerifiedEvidenceTrust(),
        scoreProfile: profile.resolvePublicRavScoreProfile({ modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true }),
        parts, zones: scoreZones },
      ravScoreCandidateGRollback: { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', sourceModelBinding: ib, rollbackModelBinding: cb,
        rollbackId: candidateProfile.CANDIDATE_G_OPERATIONAL_ROLLBACK_ID, automaticActivationAllowed: false,
        publicDuringNormalOperation: false, runtime: { schemaVersion: 1, enabled: true, generatedAt: reference,
          expectedPartCount: 673, scoredPartCount: 673, modelBinding: cb,
          scoreProfile: candidateProfile.candidateGRollbackScoreProfile({ modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true }),
          parts: candidateParts, zones: {} } } };
    // A genuine pre-I71 pair remains untouched historical control material.
    const historical = await load('scripts/check-account-assistant-issued-source.mjs');
    await historical.withIssuedAccountAssistantSource(async originalRoot => {
      const originalLoad = relative => import(pathToFileURL(path.join(originalRoot, relative)).href);
      const [oldPipeline, oldCandidate, oldStage] = await Promise.all([
        originalLoad('js/core/ravscore-integrated-state-pipeline.js'), originalLoad('js/core/ravscore-candidate-g-state-pipeline.js'),
        originalLoad('scripts/lib/coastal-point-staging-contract.mjs'),
      ]);
      const part = Object.values(parts)[0], identity = oldStage.coastalPointStageIdentity(part);
      const originalIntegratedState = oldPipeline.buildIntegratedRavScoreStateSeries(samples, {
        samplingContextKey: identity.samplingContextKey, onshoreDirectionDeg: part.onshoreDirectionDeg }).continuationState;
      const originalCandidateGState = oldCandidate.buildCandidateGDerivedStateSeries(samples, {
        stateKey: identity.expectedCandidateGStateKey }).continuationState;
      assert.equal(originalIntegratedState.modelBundleSha256, 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5');
      conditions.ravScoreCurrentSourceDomainTransitions = { schemaVersion: 1,
        kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION_ARCHIVE', privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
        parts: { [part.partId]: { schemaVersion: 1, kind: 'PRIVATE_CURRENT_DECODER_TRANSITION',
          parentZoneId: part.zoneId, partId: part.partId, coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
          referenceAt: reference, originalIntegratedState, originalCandidateGState } } };
    });
    return conditions;
  });
}
let fixturePromise;
const fixedFixture = () => fixturePromise ??= genuineI71Fixture();

test('fixed genuine source produces and fully validates all673 old I/C pairs plus untouched c1ac originals', async () => {
  const conditions = await fixedFixture();
  assert.equal(Object.keys(conditions.zones).length, 210);
  assert.equal(Object.keys(conditions.coastalParts.parts).length, 673);
  for (const part of Object.values(conditions.coastalParts.parts)) {
    assert.equal(part.ravScoreModel.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.integrated);
    assert.equal(part.ravScoreModel.currentState.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.integrated);
    assert.equal(part.ravScoreModel.currentState.currentEvidence.length, 49);
    const candidate = conditions.ravScoreCandidateGRollback.runtime.parts[part.partId];
    assert.equal(candidate.ravScoreModel.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.candidate);
    assert.equal(candidate.ravScoreModel.currentState.transportEvidence.length, 49);
  }
  const originals = Object.values(conditions.ravScoreCurrentSourceDomainTransitions.parts);
  assert.equal(originals.length, 1);
  assert.equal(originals[0].originalIntegratedState.modelBundleSha256,
    'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5');
});

test('genuine normal673 I71/C69 working bytes migrate metadata-only to actual issued successor, never protected B', async t => {
  if (ravScoreModelBinding().modelBundleSha256 === NATIVE_IDENTITY_PREDECESSOR.integrated) {
    t.skip('ACTUAL_NEW_TARGET_NOT_ISSUED: no fake C/I/T or injected current validator'); return;
  }
  const conditions = await fixedFixture();
  const { PRIVATE_RUNTIME_BASE_FILES } = await import('./lib/private-weather-component-inventory.mjs');
  const parent = await fs.realpath(os.tmpdir()), privateRoot = await fs.mkdtemp(path.join(parent, 'rr-owned-i71-working-'));
  async function inputs(name, value) {
    const root = path.join(privateRoot, name); await fs.mkdir(root);
    for (const descriptor of PRIVATE_RUNTIME_BASE_FILES) {
      const file = path.join(root, descriptor.relativePath); await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(descriptor.id === 'full-conditions' ? value : {
        kind: 'CONTROLLED_TEST_ONLY', inventoryId: descriptor.id }) + '\n', { flag: 'wx' });
    }
    return root;
  }
  const options = (sourceRoot, name) => ({ sourceRoot, privateRoot: path.join(privateRoot, name),
    outputRoot: path.join(privateRoot, name, 'new-working'), reportPath: path.join(privateRoot, name, 'report.json') });
  try {
    const positiveRoot = path.join(privateRoot, 'positive'); await fs.mkdir(positiveRoot);
    const sourceRoot = await inputs('positive/source', conditions);
    const originals = await Promise.all(PRIVATE_RUNTIME_BASE_FILES.map(async file => [file.relativePath,
      sha(await fs.readFile(path.join(sourceRoot, file.relativePath)))]));
    const report = await migrateOwnedI71NativeIdentityWorkingRuntime(options(sourceRoot, 'positive'));
    assert.equal(report.kind, 'RAVRADAR_OWNED_I71_NATIVE_IDENTITY_WORKING_REBIND');
    assert.equal(report.admission, 'NO_ADMISSION'); assert.equal(report.protectedSourceClaimed, false);
    assert.equal(report.transitionKind, 'MODEL_BINDING_METADATA_ONLY'); assert.equal(report.migratedPartCount, 673);
    assert.equal(report.repairedContinuationCount, 0); assert.equal(report.recomputedModeCount, 0); assert.equal(report.recomputedZoneCount, 0);
    assert.equal(report.measurementsChanged, false); assert.equal(report.candidateStatesChanged, false);
    const migrated = JSON.parse(await fs.readFile(path.join(report.workingRoot, 'data/live/conditions.json'), 'utf8'));
    assert.deepEqual(migrated.ravScoreCurrentSourceDomainTransitions, conditions.ravScoreCurrentSourceDomainTransitions);
    const manifest = JSON.parse(await fs.readFile(path.join(report.ownedBundlePath, 'manifest.json'), 'utf8'));
    assert.equal(manifest.modelBinding.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.integrated);
    for (const [file, original] of originals) assert.equal(sha(await fs.readFile(path.join(sourceRoot, file))), original);
    for (const [name, mutate] of [
      ['invalid-own-state', value => { Object.values(value.coastalParts.parts)[672].ravScoreModel.currentState.currentMemoryCoverageHours = -1; }],
      ['different-own-point', value => { Object.values(value.coastalParts.parts)[672].waterPoint[0] += 0.01; }],
    ]) {
      const broken = structuredClone(conditions); mutate(broken);
      await fs.mkdir(path.join(privateRoot, name));
      const source = await inputs(name + '/source', broken), negative = options(source, name);
      await assert.rejects(migrateOwnedI71NativeIdentityWorkingRuntime(negative), /migration rejected|continuation|sampling/i);
      await assert.rejects(fs.lstat(negative.outputRoot), { code: 'ENOENT' });
    }
  } finally {
    assert.equal(path.dirname(privateRoot), parent); assert(path.basename(privateRoot).startsWith('rr-owned-i71-working-'));
    await fs.rm(privateRoot, { recursive: true });
  }
});
