// Normal source-only regression; all originals/backend credentials are
// SYNTHETIC TESTONLY. This cannot qualify the actual production seed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalCpFollowerInputs } from './lib/established-native-current-origin-cp-fixture.mjs';
import { normalBAndSTransports } from './lib/established-native-current-origin-test-transports.mjs';

const P0 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'd7b31aa3c706e2f657fe5de99c56434f3cff260d';
const TREE = '9d05b060dba9015233a368c63438a3dfd9b9b45d';
const ownParent = await fs.realpath(os.tmpdir());
const HERE = await fs.mkdtemp(path.join(ownParent, 'rr-established-origin-followers-'));
const ownIdentity = await fs.lstat(HERE, { bigint: true });
const OLD = path.join(HERE, 'source0200'), HOST = path.join(HERE, 'source-successor');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const load = (root, relative) => import(pathToFileURL(path.join(root, relative)).href);
const clone = structuredClone;
const write = async (root, relative, value) => {
  const file = path.join(root, relative); await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value) + '\n');
};
const git = (root, ...args) => execFileSync('git', ['-c', 'core.autocrlf=false', '-c',
  'user.name=RavRadar TESTONLY origin fixture', '-c', 'user.email=synthetic@example.invalid',
  '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=NUL', '-C', root, ...args],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const receipt = { kind: 'PRIVATE_SYNTHETIC_FIXED_ORIGIN_THREE_NORMAL_FOLLOWERS', base: BASE, baseTree: TREE,
  productionAnchor: false, SQLMigrationProof: false, sameTimeCASMigrationProof: false,
  regionalPhysicalNative: 'UNRUN', result: 'STARTED', stages: [], sourcePins: [], followers: [] };
const saveReceipt = async () => write(HERE, 'receipt.json', receipt);
let stage = 'SOURCE_HOST', restoreFetch;
try {
  assert.equal(git(P0, 'rev-parse', BASE + '^{tree}'), TREE);
  for (const root of [OLD, HOST]) {
    await assert.rejects(fs.access(root), { code: 'ENOENT' });
    execFileSync('git', ['clone', '--shared', '--no-checkout', '--no-hardlinks', P0, root],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git(root, '-c', 'advice.detachedHead=false', 'checkout', '--detach', BASE);
    assert.equal(git(root, 'rev-parse', 'HEAD^{tree}'), TREE);
    assert.equal(git(root, 'status', '--porcelain', '-uno'), '');
  }
  const originalInputs = await normalCpFollowerInputs(OLD);
  const zones = {};
  for (let i = 0; i < 210; i++) zones[i === 0 ? originalInputs.zone.id : 'SYNTHETIC-ORIGIN-ZONE-' + i] = [];
  const zoneIds = Object.keys(zones), allParts = [];
  for (let i = 0; i < 673; i++) {
    const zoneId = zoneIds[i % 210];
    const part = { ...clone(originalInputs.part), partId: i === 0 ? originalInputs.part.partId : 'SYNTHETIC-ORIGIN-PART-' + i,
      parentZoneId: zoneId, zoneId };
    zones[zoneId].push(clone(part)); allParts.push(part);
  }
  const central = { zoneCount: 210, partCount: 673, zones };
  const zoneFor = part => ({ id: part.zoneId, onshoreDirectionDeg: part.onshoreDirectionDeg });
  const inputsFor = async (root, part) => normalCpFollowerInputs(root, { part, zone: zoneFor(part) });
  const h0 = (series, target) => ({
    integrated: clone(series.scores.find(row => row.time === target)?.ravScoreModel?.continuationState),
    candidate: clone(series.candidateGRollbackScores.find(row => row.time === target)?.candidateG?.continuationState),
  });
  const pairsFrom = conditions => new Map(allParts.map(part => [part.partId, {
    integrated: conditions.coastalParts.parts[part.partId].ravScoreModel.currentState,
    candidate: conditions.ravScoreCandidateGWarmup.runtime.parts[part.partId].ravScoreModel.currentState,
  }]));
  const conditionsFor = async (root, pairs, reference, label) => {
    const I = (await load(root, 'js/core/ravscore-model-contract.js')).ravScoreModelBinding();
    const C = (await load(root, 'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
    return { datasetId: 'rr-synthetic-origin-' + label, productionReferenceAt: reference,
      generatedAt: new Date(Date.parse(reference) + 3600000).toISOString(),
      zones: Object.fromEntries(zoneIds.map(id => [id, { fixtureOnly: true }])),
      coastalParts: { modelBinding: I, expectedPartCount: 673,
        parts: Object.fromEntries(allParts.map(part => [part.partId, { ...part,
          ravScoreModel: { currentState: clone(pairs.get(part.partId).integrated) } }])) },
      ravScoreCandidateGWarmup: { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', status: 'BUILDING_MEASURED_ONLY', evidencePolicy: 'MEASURED_ONLY',
        syntheticHistoryAllowed: false, automaticActivationAllowed: false, publicDuringNormalOperation: false,
        sourceModelBinding: I, candidateModelBinding: C,
        runtime: { modelBinding: C, status: 'BUILDING_MEASURED_ONLY', expectedPartCount: 673,
          measuredPartCount: 673, parts: Object.fromEntries(allParts.map(part => [part.partId,
            { ravScoreModel: { currentState: clone(pairs.get(part.partId).candidate) } }])) } } };
  };
  async function saveNormal(root, backend, conditions, label) {
    const workflow = await load(root, 'scripts/private-production-runtime-workflow.mjs');
    const bundle = await load(root, 'scripts/private-production-runtime-bundle.mjs');
    const protectedB = await load(root, 'scripts/protected-private-production-runtime.mjs');
    const normalS = await load(root, 'scripts/ravscore-continuation-checkpoint.mjs');
    const protectedS = await load(root, 'scripts/protected-ravscore-continuation-checkpoint.mjs');
    for (const descriptor of workflow.PRIVATE_RUNTIME_FILES)
      await write(root, descriptor.relativePath, descriptor.id === 'full-conditions' ? conditions : { fixtureOnly: descriptor.id });
    const checkpointPath = path.join(root, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
    await normalS.saveRavScoreContinuationCheckpoint({ repositoryRoot: root, sourcePath: path.join(root, 'data/live/conditions.json'), checkpointPath });
    const spec = await workflow.buildPrivateRuntimeCreateSpec({ repositoryRoot: root });
    assert.equal(spec.files.length, 9, 'The normal fixed B inventory must NOT acquire a registry or journal.');
    const privateRoot = path.join(HERE, label + '-private'); await fs.mkdir(privateRoot);
    const bundlePath = path.join(privateRoot, 'created');
    await bundle.createPrivateProductionRuntimeBundle({ repositoryRoot: root, privateRoot, bundlePath, ...spec });
    const now = conditions.generatedAt;
    const expected = await workflow.buildPrivateRuntimeExpectation({ repositoryRoot: root, targetReferenceAt: conditions.productionReferenceAt, now });
    const S = await protectedS.publishProtectedRavScoreContinuationCheckpoint({ checkpointPath,
      targetReference: conditions.productionReferenceAt, request: backend.documentRequest, rpcRequest: backend.checkpointRpc });
    const B = await protectedB.publishProtectedPrivateProductionRuntime({ repositoryRoot: root, privateRoot, bundlePath,
      expected, now, sourceHead: git(root, 'rev-parse', 'HEAD'), request: backend.documentRequest, storage: backend.storage });
    assert.equal(B.published, true); assert.equal(S.published, true);
    const restored = path.join(privateRoot, 'restored');
    const restoredResult = await protectedB.restoreProtectedPrivateProductionRuntime({ repositoryRoot: root,
      privateRoot, bundlePath: restored, expected, now, request: backend.documentRequest, storage: backend.storage });
    assert.equal(restoredResult.restored, true);
    const originalBytes = await fs.readFile(path.join(bundlePath, 'payload/data/live/conditions.json'));
    assert.deepEqual(await fs.readFile(path.join(restored, 'payload/data/live/conditions.json')), originalBytes);
    const remoteS = path.join(HERE, label + '-s/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    assert.equal((await protectedS.restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath: remoteS,
      targetReference: conditions.productionReferenceAt, request: backend.documentRequest })).restored, true);
    assert.deepEqual(JSON.parse(await fs.readFile(remoteS)), JSON.parse(await fs.readFile(checkpointPath)));
    const checkpoint = JSON.parse(await fs.readFile(checkpointPath));
    const manifest = JSON.parse(await fs.readFile(path.join(bundlePath, 'manifest.json')));
    return { privateRoot, bundlePath: restored, manifest, checkpoint, spec, conditionsBytesSha256: sha(originalBytes) };
  }

  stage = 'NORMAL_COLD_673';
  const oldPipeline = (await load(OLD, 'scripts/lib/ravscore-production-part-pipeline.mjs')).buildRavScoreProductionPartSeries;
  const seedPairs = new Map();
  for (const part of allParts) {
    const input = await inputsFor(OLD, part), target = input.time(0);
    const series = oldPipeline({ part, zone: zoneFor(part), initialSelection: { state: null, source: 'COLD_START',
      candidateGSourceDisposition: 'VALIDATED_ROLLBACK_ORACLE_REBUILT_FROM_MEASURED_HISTORY' },
      candidateGRollbackMeasuredColdStart: true, targetReferenceAt: target,
      recoverySources: [input.source(input.originals)], publicHourly: input.originals.filter(row => row.time === target), requireNativeGridSampling: true });
    const pair = h0(series, target); assert(pair.integrated && pair.candidate);
    assert.equal(pair.integrated.currentEvidence.length, 49);
    assert.equal(pair.integrated.currentEvidence.filter(row => row.strength !== null).length, 45);
    seedPairs.set(part.partId, pair); input.assertInputsUnchanged();
  }
  const seedConditions = await conditionsFor(OLD, seedPairs, originalInputs.time(0), 'seed');
  const seedBackend = normalBAndSTransports(), oldSaved = await saveNormal(OLD, seedBackend, seedConditions, 'seed');
  receipt.stages.push({ stage, actualParts: seedPairs.size, B: oldSaved.manifest.bundleContentSha256, S: oldSaved.checkpoint.generationSha256 });
  await saveReceipt();

  stage = 'EXACT_SOURCE_COMPOSITION_AND_NORMAL_C_I_T';
  const productFiles = [
  [
    "scripts/lib/established-native-current-origin.mjs",
    "e4741332e9cc54523fccf8ded70ace9767047d97090306c00fafd43385235c42"
  ],
  [
    "scripts/lib/ravscore-production-part-pipeline.mjs",
    "dadb5bf8c37fd12415b4596523df218f67cca4d4775b1cf8d0f2066c524cabd0"
  ],
  [
    "scripts/update-weather.mjs",
    "608b795d382d96fed7435ffd9437f589f8771ea742ec65f75053d25059b9d25d"
  ],
  [
    "scripts/public-conditions-lib.mjs",
    "e5a921d2a818694cfa13d5fcb30392cad972dc3b7038e929bc1d659a95f8017d"
  ],
  [
    "scripts/check-native-current-reanalysis-predecessor-source.mjs",
    "1c08778a28bc3931b42430eaa94d9659dd279f42528c5306631b971c4405928d"
  ],
  [
    "scripts/lib/model-source-imports.mjs",
    "534aa596471ea2fd68661540c4ed5e29d8385cf7cbf45f0c010e7e3357ec811b"
  ],
  [
    "scripts/build-ravscore-model-bundle.mjs",
    "974a8af2c8fdbc92217b15f582142f43a13288143d635b72dec0521021a66dcd"
  ],
  [
    "scripts/build-candidate-g-rollback-bundle.mjs",
    "79e030daafc41f56c20d343c1a246ad79b82fce2cd27a3f636a762f8f687dbf0"
  ]
].map(([relative, expected]) => [relative, path.join(P0, relative), expected]);
  const composition = [];
  for (const [relative, file, expected] of productFiles) {
    const raw = Buffer.from((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')); if (expected) assert.equal(sha(raw), expected);
    await write(HOST, relative, raw); composition.push({ path: relative, productSha256: sha(raw), bytes: raw.length });
  }
  assert.equal(oldSaved.manifest.bundleContentSha256, 'd47f3671a44c14f100907d958dc2f05a6a1e42a5769ea65e48c675ec5257b7e4');
  assert.equal(oldSaved.checkpoint.generationSha256, '199476623ca6b970c8d000f70769d6ddb51c7ca1751f97a81f0a01ef6a148018');
  const originPath = 'scripts/lib/established-native-current-origin.mjs';
  const originalOrigin = await fs.readFile(path.join(HOST, originPath), 'utf8');
  const seedLiteral = /const SEED = Object\.freeze\(\{[\s\S]*?\n\}\);/.exec(originalOrigin)?.[0]; assert(seedLiteral);
  const anchor = { datasetId: seedConditions.datasetId, referenceAt: seedConditions.productionReferenceAt,
    nativeProducer: BASE, producer: BASE, originalB: oldSaved.manifest.bundleContentSha256,
    originalS: oldSaved.checkpoint.generationSha256, B: oldSaved.manifest.bundleContentSha256,
    S: oldSaved.checkpoint.generationSha256, G: oldSaved.checkpoint.candidateGRollbackCompanion.stateSha256,
    I: oldSaved.checkpoint.modelBinding.modelBundleSha256, C: oldSaved.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256,
    T: oldSaved.checkpoint.continuationStateContractSha256,
    ownerPolicyGitBlob: git(OLD, 'rev-parse', 'HEAD:scripts/lib/dmi-marine-zone-exclusions.json') };
  const testSeed = 'const SEED = Object.freeze(' + JSON.stringify(anchor, null, 2) + ');';
  const testOrigin = originalOrigin.replace(seedLiteral, testSeed);
  assert.equal(testOrigin.replace(testSeed, seedLiteral), originalOrigin);
  await write(HOST, originPath, testOrigin);
  const importsPath = 'scripts/lib/model-source-imports.mjs';
  const originalImports = await fs.readFile(path.join(HOST, importsPath), 'utf8');
  assert.equal(sha(originalImports), '534aa596471ea2fd68661540c4ed5e29d8385cf7cbf45f0c010e7e3357ec811b');
  const testImports = originalImports.replace('e4741332e9cc54523fccf8ded70ace9767047d97090306c00fafd43385235c42', sha(testOrigin));
  assert.equal(testImports.replace(sha(testOrigin), 'e4741332e9cc54523fccf8ded70ace9767047d97090306c00fafd43385235c42'), originalImports);
  await write(HOST, importsPath, testImports);
  const sourceSet = productFiles.map(([relative]) => relative);
  for (const builder of ['scripts/build-candidate-g-rollback-bundle.mjs', 'scripts/build-ravscore-model-bundle.mjs']) {
    const result = execFileSync(process.execPath, [path.join(HOST, builder), '--write'], { cwd: HOST,
      encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GITHUB_SHA: '' } });
    receipt.stages.push({ stage: 'NORMAL_BUILDER', builder, stdout: result.trim() });
  }
  sourceSet.push('scripts/rollback-assets/ravscore-model-bundle.generated.js', 'js/core/ravscore-model-bundle.generated.js');
  git(HOST, 'add', '--', ...sourceSet); git(HOST, 'commit', '-m', 'TESTONLY synthetic fixed origin normal source composition');
  assert.equal(git(HOST, 'status', '--porcelain', '-uno'), '');
  receipt.sourceHead = git(HOST, 'rev-parse', 'HEAD'); receipt.sourceTree = git(HOST, 'rev-parse', 'HEAD^{tree}');
  receipt.sourcePins = composition; receipt.syntheticOriginSha256 = sha(testOrigin); receipt.syntheticImportInventorySha256 = sha(testImports);
  receipt.wholeOriginInverse = true; receipt.wholeInventoryInverse = true;
  const workflow = await load(HOST, 'scripts/private-production-runtime-workflow.mjs');
  const I = (await load(HOST, 'js/core/ravscore-model-contract.js')).ravScoreModelBinding();
  const C = (await load(HOST, 'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
  receipt.syntheticNewTuple = { I: I.modelBundleSha256, C: C.modelBundleSha256, ...(await workflow.privateRuntimeContractHashes({ repositoryRoot: HOST })) };
  assert.notEqual(I.modelBundleSha256, anchor.I); assert.notEqual(C.modelBundleSha256, anchor.C);
  await write(HOST, 'data/live/coastal-parts-v2.json', central);
  delete process.env.GITHUB_SHA;

  stage = 'FIXED_AUTHENTICATED_SEED_METADATA_ONLY';
  const origin = await load(HOST, originPath);
  Object.assign(process.env, { GITHUB_WORKFLOW: 'Deploy RavRadar code-only repair', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ATTEMPT: '1', RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_WRITER_ACTIVE: 'false',
    RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_CONFIRMATION: 'DEPLOY-CODE-ONLY-REPAIR', RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN: 'true',
    RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE: 'before', RAVRADAR_PREDECESSOR_PRIVATE_ROOT: oldSaved.privateRoot,
    RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE: oldSaved.bundlePath });
  restoreFetch = seedBackend.installFixedReaderTransport();
  const seedHandle = await origin.readEstablishedNativeCurrentSeedOrigin();
  const rebound = new Map([...seedPairs].map(([id, pair]) => {
    const changed = clone(pair); changed.integrated.modelBundleSha256 = I.modelBundleSha256;
    if (Object.hasOwn(changed.candidate, 'modelBundleSha256')) changed.candidate.modelBundleSha256 = C.modelBundleSha256;
    const inverse = clone(changed); inverse.integrated.modelBundleSha256 = pair.integrated.modelBundleSha256;
    if (Object.hasOwn(inverse.candidate, 'modelBundleSha256')) inverse.candidate.modelBundleSha256 = pair.candidate.modelBundleSha256;
    assert.deepEqual(inverse, pair); return [id, changed];
  }));
  const metadata = await conditionsFor(HOST, rebound, seedConditions.productionReferenceAt, 'seed');
  metadata.privateEstablishedNativeCurrentOrigin = await origin.buildEstablishedNativeCurrentOriginAttestation(seedHandle,
    { centralContract: central, conditions: metadata, partResults: null });
  assert.equal(metadata.privateEstablishedNativeCurrentOrigin.transition, 'SEED_METADATA_ONLY');
  restoreFetch(); restoreFetch = undefined;
  // This is intentionally a distinct initialized synthetic backend. The
  // test does NOT simulate, waive or claim the real same-reference SQL/CAS.
  const backend = normalBAndSTransports();
  let saved = await saveNormal(HOST, backend, metadata, 'metadata');
  restoreFetch = backend.installFixedReaderTransport();
  receipt.stages.push({ stage, numericInverseParts: rebound.size, initializedSeparateBackend: true }); await saveReceipt();

  stage = 'THREE_REAL_B_S_ORDINARY_FOLLOWERS';
  const pipeline = await load(HOST, 'scripts/lib/ravscore-production-part-pipeline.mjs');
  const { buildNewestValidRavScoreRecoverySources } = await load(HOST, 'scripts/lib/ravscore-recovery-source-priority.mjs');
  let currentConditions = metadata, prior = 0;
  for (const targetHour of [19, 32, 51]) {
    process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT = saved.privateRoot;
    process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE = saved.bundlePath;
    const handle = await origin.readEstablishedNativeCurrentOrigin(central); assert(handle);
    const oldPairs = pairsFrom(currentConditions), wholeSaved = JSON.stringify([...oldPairs]);
    const partResults = new Map(), nextPairs = new Map();
    for (const part of allParts) {
      const input = await inputsFor(HOST, part), pair = oldPairs.get(part.partId), target = input.time(targetHour);
      const futureHour = prior + 2, preferredRows = input.historicalRevision.map(row => row.time === input.time(futureHour)
        ? input.current(futureHour, 0.13, input.time(-60)) : row);
      const fallback = input.source(input.originals);
      const selected = buildNewestValidRavScoreRecoverySources({ part, productionReferenceAt: target,
        fallbackSource: fallback, preferredSource: input.source(preferredRows, 'progressive-private-dmi'),
        protectedPreviousSource: fallback });
      const selectedRich = selected.flatMap(source => source.record.hourly).filter(row => row.time === input.time(futureHour)
        && row.currentProvenance?.status === 'verified');
      assert.equal(selectedRich.length, 1); assert.equal(selectedRich[0].currentUMps, 0.13);
      assert.equal(selectedRich[0].currentVMps, 0);
      const options = { part, zone: zoneFor(part), initialSelection: { state: pair.integrated, source: 'EXISTING_INTEGRATED' },
        previousCandidateGContinuation: pair.candidate, candidateGRollbackMeasuredWarmupContinuation: true,
        targetReferenceAt: target, recoverySources: selected, publicHourly: input.originals.filter(row => row.time === target), requireNativeGridSampling: true };
      if (part === allParts[0]) {
        assert.throws(() => pipeline.buildRavScoreProductionPartSeries(options), error => error.code === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY');
        if (prior === 0) {
          // The exact normal CP reference-48 clip leaves the SAME 49-hour
          // weather timeline but loses 16 formerly known current originals.
          const clipped = input.originals.map(row => Date.parse(row.time) < Date.parse(input.time(targetHour - 48))
            ? input.withoutCurrent(row) : row);
          const clippedFallback = input.source(clipped);
          const clippedSources = buildNewestValidRavScoreRecoverySources({ part, productionReferenceAt: target,
            fallbackSource: clippedFallback, preferredSource: input.source(clipped, 'progressive-private-dmi'),
            protectedPreviousSource: clippedFallback });
          const clippedOptions = { ...options, recoverySources: clippedSources };
          const { summarizeRavScoreInitialCurrentWindow } = await load(HOST, 'scripts/lib/ravscore-initial-current-window-audit.mjs');
          const diagnostic = summarizeRavScoreInitialCurrentWindow(clippedOptions);
          assert.equal(diagnostic.status, 'COMPARED');
          assert.equal(diagnostic.selectedHistory.rowCount, 49);
          assert.equal(diagnostic.selectedHistory.verifiedVectorCount, 29);
          assert.equal(diagnostic.selectedHistory.missingCount, 20);
          for (const model of [diagnostic.integrated, diagnostic.candidateG]) {
            assert.equal(model.category, 'SAVED_KNOWN_BECOMES_UNKNOWN');
            assert.equal(model.evidence.knownToUnknownCount, 16);
            assert.equal(model.evidence.unknownToKnownCount, 0);
          }
          assert.throws(() => pipeline.buildRavScoreProductionPartSeries(clippedOptions),
            error => error.code === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY');
          receipt.actual16ClipGuard = diagnostic;
        }
        assert.throws(() => pipeline.buildRavScoreProductionPartSeries({ ...options, establishedNativeCurrentOrigin: {} }));
        assert.throws(() => pipeline.buildRavScoreProductionPartSeries({ ...options, establishedNativeCurrentOrigin: handle,
          part: { ...part, zoneId: 'WRONG-ORIGIN-ZONE' } }));
        assert.throws(() => pipeline.buildRavScoreProductionPartSeries({ ...options, establishedNativeCurrentOrigin: handle,
          initialSelection: { ...options.initialSelection, state: { ...pair.integrated, time: input.time(prior - 1) } } }));
      }
      const series = pipeline.buildRavScoreProductionPartSeries({ ...options, establishedNativeCurrentOrigin: handle });
      const actual = pipeline.assertEstablishedNativeCurrentProductionResult(series, { originHandle: handle, part, targetReferenceAt: target });
      assert.deepEqual(actual, h0(series, target));
      assert.throws(() => pipeline.assertEstablishedNativeCurrentProductionResult(clone(series), { originHandle: handle, part, targetReferenceAt: target }));
      assert(series.recovery.hourly.every(row => Date.parse(row.time) > Date.parse(pair.integrated.time)), 'Replay must never refold the OLD saved window.');
      const compactFuture = series.recovery.hourly.find(row => row.time === input.time(futureHour));
      assert.equal(compactFuture.currentSpeedMps, 0.13, 'Normal latest priority AFTER saved time.');
      assert.equal(compactFuture.currentDirectionDeg, 90);
      assert.equal(Object.hasOwn(compactFuture, 'currentUMps'), false, 'No raw U/V may be added to compact replay.');
      assert.equal(Object.hasOwn(compactFuture, 'currentVMps'), false);
      const honestMissingHour = ({ 19: 18, 32: 31, 51: 44 })[targetHour];
      const honestMissing = actual.integrated.currentEvidence.find(row => row.time === input.time(honestMissingHour));
      assert(honestMissing, 'A measured missing hour must remain present as missing, not disappear.');
      assert.equal(honestMissing.strength, null);
      assert.equal(actual.integrated.time, target); assert.equal(actual.candidate.time, target);
      input.assertInputsUnchanged(); partResults.set(part.partId, series); nextPairs.set(part.partId, actual);
    }
    assert.equal(JSON.stringify([...oldPairs]), wholeSaved, 'Every saved input state pair must remain WHOLE unchanged.');
    const next = await conditionsFor(HOST, nextPairs, originalInputs.time(targetHour), 'follow-' + targetHour);
    next.privateEstablishedNativeCurrentOrigin = await origin.buildEstablishedNativeCurrentOriginAttestation(handle,
      { centralContract: central, conditions: next, partResults });
    assert.equal(next.privateEstablishedNativeCurrentOrigin.transition, 'NORMAL_STRICT_CONTINUATION');
    assert.equal(next.privateEstablishedNativeCurrentOrigin.parent.attestationSha256,
      currentConditions.privateEstablishedNativeCurrentOrigin.attestationSha256);
    saved = await saveNormal(HOST, backend, next, 'follow-' + targetHour);
    assert.equal(backend.objects.size, 2, 'Only normal current+previous B retention is claimed.');
    receipt.followers.push({ from: prior, to: targetHour, actualPartResults: partResults.size,
      strictOldGuardRefused: true, savedPairUnchanged: true, latestPriorityAfterSaved: true,
      B: saved.manifest.bundleContentSha256, S: saved.checkpoint.generationSha256,
      attestation: next.privateEstablishedNativeCurrentOrigin.attestationSha256 });
    currentConditions = next; prior = targetHour; await saveReceipt();
  }
  assert.equal(receipt.followers.length, 3); assert(backend.events.includes('RETIRED_OWN_PREVIOUS_OBJECT'));
  assert.deepEqual(await fs.readFile(path.join(oldSaved.bundlePath, 'payload/data/live/conditions.json')),
    await fs.readFile(path.join(oldSaved.privateRoot, 'created/payload/data/live/conditions.json')));
  originalInputs.assertInputsUnchanged(); receipt.result = 'PASS'; receipt.stage = 'COMPLETE';
  receipt.authenticatedReaderTransport = 'NORMAL_REQUESTERS_TEST_OWNED_INVALID_HTTPS';
  receipt.originIssuerOverridden = false; receipt.mutableOriginals = false;
  await saveReceipt(); console.log(JSON.stringify({ result: receipt.result, actualParts: 673, followers: [19, 13, 19],
    sourceHead: receipt.sourceHead, syntheticNewTuple: receipt.syntheticNewTuple,
    SQLMigrationProof: false, sameTimeCASMigrationProof: false, physicalRegional: 'UNRUN' }));
} catch (error) {
  receipt.result = 'FAIL'; receipt.stage = stage;
  receipt.error = { name: error.name, code: error.code ?? null, message: error.message, stack: error.stack };
  await saveReceipt(); console.error(error); process.exitCode = 1;
} finally { if (restoreFetch) restoreFetch(); }
// No source checkout is mutated. Failed synthetic roots retain the whole
// first receipt; only this successful, identity-checked temporary root retires.
if (receipt.result === 'PASS') {
  const after = await fs.lstat(HERE, { bigint: true });
  assert(after.isDirectory() && !after.isSymbolicLink());
  assert.equal(after.dev, ownIdentity.dev); assert.equal(after.ino, ownIdentity.ino);
  assert.equal(await fs.realpath(HERE), HERE); assert.equal(path.dirname(HERE), ownParent);
  assert(path.basename(HERE).startsWith('rr-established-origin-followers-'));
  await fs.rm(HERE, { recursive: true, force: false });
}
