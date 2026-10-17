import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync, execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { inverseCompletedRuntimeWorkflow } from './lib/completed-private-runtime-workflow-review.mjs';
import { assertCompletedPrivateRuntimeRequest, assertCompletedPrivateRuntimeIdentity,
  assertCompletedRuntimePublicIdentity, assertCompletedRuntimeProducerAncestry, completedRuntimeFailureCode,
  readCompletedPrivateRuntimePin, admitCompletedPrivateRuntime, verifyCompletedPrivateRuntime } from './completed-private-runtime-admission.mjs';
import { classifyVerifiedWeatherDeployment } from './lib/verified-weather-deployment-terminal.mjs';
import { ravScoreModelBinding, RAVSCORE_PUBLIC_FORECAST_HOURS } from '../js/core/ravscore-model-contract.js';
import { PRIVATE_RUNTIME_FILES, PRIVATE_RUNTIME_CONTRACT_FILES, buildPrivateRuntimeCreateSpec,
  buildPrivateRuntimeExpectation, installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { createPrivateProductionRuntimeBundle, restorePrivateProductionRuntimeBundle,
  canonicalPrivateRuntimeJson } from './private-production-runtime-bundle.mjs';
import { publishProtectedPrivateProductionRuntime, describeCurrentProtectedPrivateProductionRuntime,
  describeTargetProtectedPrivateProductionRuntime } from './protected-private-production-runtime.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import { buildPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES } from './lib/private-weather-component-inventory.mjs';
import { buildPrivatePublicHourDeliveryPack, compactPrivateConditionsForPersistence }
  from './lib/public-hour-delivery-pack.mjs';
import { observeOwnedPackCloseProbes } from './lib/owned-pack-close-probe.mjs';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const build = (await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const once = (await fs.readFile(new URL('../.github/workflows/run-current-weather-once.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const legacy = inverseCompletedRuntimeWorkflow(build, 'build');
const legacyOnce = inverseCompletedRuntimeWorkflow(once, 'once');
const blocks = text => text.split(/(?=^      - (?:name:|uses:))/m).slice(1);
const step = (text, name) => blocks(text).find(block => block.startsWith('      - name: ' + name + '\n'));
const selector = block => block.match(/^        if: (.+)$/m)?.[1] ?? 'true';
const evaluate = (expression, inputs, overrides = {}) => runInNewContext(expression
  .replace(/^\$\{\{\s*|\s*\}\}$/g, '').replace(/\bsteps\.([a-z][a-z0-9-]*)/g, (_, id) => `steps[${JSON.stringify(id)}]`),
  { inputs, steps: new Proxy(overrides, { get: (o, key) => o[key] ?? { outcome: 'success', outputs: {
    should_run: 'true', action: 'integrated-historical-maintenance', required: 'true', available: 'true',
    disposition: 'MEASURED_WARMUP_PUBLISHED', maintenance_completed: 'true', reused: 'false',
  } } }), github: { ref: 'refs/heads/main', event_name: 'workflow_dispatch' },
  success: () => true, always: () => true, cancelled: () => false, failure: () => false, hashFiles: () => 'synthetic' });
const defaults = { completed_private_runtime: false, checkpoint_only: false, quick_confirmation: false,
  quick_progress_source: '', weather_state_epoch_bootstrap: false, weather_state_epoch_checkpoint_reentry: false,
  native_sampling_identity_original_recovery: false, extended_provider_bootstrap: false, produce_weather_handoff: false };
const providerNames = ['Update DMI bulk model cache', 'Fill only exact-hour DMI gaps from Copernicus',
  'Fill only the exact remaining current gaps from Open-Meteo', 'Update central weather cache',
  'Prepare only an explicitly requested READY point activation',
  'Advance private point-candidate readiness without public score impact',
  'Atomically promote the validated point candidate in central admin storage',
  'Refuse a point activation without a successful exact-point weather rebuild',
  'Restore encrypted private weather progress only', 'Bind optional progress to the exact protected baseline'];

export function assertCompletedRuntimeWorkflow(actualBuild, actualOnce) {
  assert.equal((actualOnce.match(/^      completed_private_runtime:/gm) ?? []).length, 2,
    'One optional manual declaration and one actual build forwarding');
  assert(actualOnce.includes('target_hour: ${{ steps.completed-target.outputs.target_hour ||'));
  assert(actualOnce.includes("if: inputs.checkpoint_target_hour == '' && inputs.completed_private_runtime != true"));
  assert(actualOnce.includes('COMPLETED_RUNTIME_OUTCOME: ${{ needs.build-and-prepare.outputs.completed_runtime_outcome }}'));
  assert(actualBuild.includes('weather_outcome: ${{ steps.weather.outcome }}'));
  assert(actualBuild.includes('completed_runtime_outcome: ${{ steps.completed-runtime-target.outcome }}'));
  for (const name of providerNames) {
    assert.equal(evaluate(selector(step(actualBuild, name)), { ...defaults, completed_private_runtime: true }), false, name);
    assert.equal(Boolean(evaluate(selector(step(actualBuild, name)), defaults)),
      Boolean(evaluate(selector(step(legacy, name)), defaults)), 'default unchanged: ' + name);
  }
  for (const name of ['Restore newest compatible private runtime from protected storage',
    'Describe the exact restored private generation',
    'Install only the allowlisted restored private runtime files']) {
    const block = step(actualBuild, name);
    assert(block, name);
    assert.equal(evaluate(selector(block), { ...defaults, completed_private_runtime: true }), true, name);
  }
  let previous = -1;
  for (const id of ['completed-runtime-admission', 'ravscore-integrated-runtime-audit', 'completed-runtime-target',
    'checkpoint-build', 'private-runtime-bundle-spec', 'private-runtime-bundle-create', 'checkpoint-publish',
    'private-runtime-publish', 'current-grid-pages-target', 'current-grid-pages-upload',
    'current-grid-pages-artifact-seal', 'current-grid-edge-publication', 'current-grid-backend-readiness']) {
    const at = actualBuild.indexOf('\n        id: ' + id + '\n');
    assert(at > previous, 'Actual preserved build order: ' + id); previous = at;
  }
  const target = step(actualBuild, 'Preserve the exact current-grid Pages target before remote upload');
  for (const proof of ['steps.full-validation.outcome', 'steps.release-gate.outcome',
    'steps.checkpoint-save.outcome', 'steps.checkpoint-publish.outcome',
    'steps.private-runtime-publish.outcome', 'steps.ravscore-integrated-runtime-audit.outputs.runtime_audit_outcome'])
    assert(target.includes('test "${{ ' + proof + ' }}" = success'), proof);
  assert(target.includes('steps.completed-runtime-target.outcome || steps.weather.outcome'));
  assert(step(actualBuild, 'Refuse completed-runtime target or calibration mismatch before any new S or B publication')
    .includes('validate-completed-runtime-target'));
  assert(step(actualBuild, 'Prove the whole recreated B manifest and installed originals are unchanged')
    .includes('completed-private-runtime-admission.mjs before-publish'));
  assert(actualBuild.includes('fetch-depth: ${{ inputs.completed_private_runtime && \'0\' || \'1\' }}'));
}

test('completed route is genuinely RED on the old normal workflow and keeps every historical byte', () => {
  assert.throws(() => assertCompletedRuntimeWorkflow(legacy, legacyOnce));
  assertCompletedRuntimeWorkflow(build, once);
  const mutations = [
    build.replace('inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run', 'true && (steps.preflight.outputs.should_run'),
    build.replace('id: private-runtime-install\n', 'id: private-runtime-install\n        if: false\n'),
    build.replace('test "${{ steps.full-validation.outcome }}" = success', 'true'),
    build.replace('test "${{ steps.release-gate.outcome }}" = success', 'true'),
    build.replace('test "${{ steps.checkpoint-publish.outcome }}" = success', 'true'),
    build.replace('test "${{ steps.ravscore-integrated-runtime-audit.outputs.runtime_audit_outcome }}" = success', 'true'),
    build.replace('id: current-grid-pages-upload\n', 'id: moved-pages-upload\n'),
    build.replace('completed_runtime_outcome: ${{ steps.completed-runtime-target.outcome }}', 'completed_runtime_outcome: success'),
    build.replace('completed-private-runtime-admission.mjs before-publish', 'true'),
    build.replace('weather_outcome: ${{ steps.weather.outcome }}', 'weather_outcome: success'),
  ];
  for (const changed of mutations) {
    assert.notEqual(changed, build);
    assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build'), 'Exact inverse rejects every unreviewed mutation');
  }
});

test('actual preflight Bash exits before provider probe or preflight materialization only in completed/epoch mode', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-completed-preflight-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const script = step(build, 'Decide whether weather needs updating before private runtime download')
    .split('        run: |\n')[1].split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n');
  const bash = process.env.RAVRADAR_TEST_BASH ?? (process.platform === 'win32'
    ? path.resolve(path.dirname(process.env.PYTHON ?? process.execPath), '../native/git/usr/bin/sh.exe') : 'bash');
  // Sentinel functions observe calls; they do not impersonate a successful
  // provider fetch. No actual provider process or network is available here.
  const sentinel = 'node(){ echo NODE_PROBE >> "$PROBE_LOG"; mkdir -p "$RAVRADAR_PREFLIGHT_WORK/input/scripts"; return 0; }; python(){ echo PYTHON_PROBE >> "$PROBE_LOG"; return 0; }; ';
  const posix = file => process.platform === 'win32' ? file.replaceAll('\\', '/') : file;
  for (const mode of ['completed', 'epoch', 'normal']) {
    const out = path.join(root, mode + '.out'), probe = path.join(root, mode + '.probe');
    await fs.mkdir(path.join(root, '.cache/weather-preflight-state'), { recursive: true });
    await fs.writeFile(path.join(root, '.cache/weather-preflight-state/state.json'), '{}');
    await fs.mkdir(path.join(root, 'scripts'), { recursive: true });
    await fs.writeFile(path.join(root, 'scripts/check-weather-update.py'), '# synthetic probe fixture');
    const result = spawnSync(bash, ['-c', sentinel + script], { cwd: root, encoding: 'utf8', env: { ...process.env,
      PATH: path.dirname(bash) + path.delimiter + process.env.PATH,
      COMPLETED_PRIVATE_RUNTIME: String(mode === 'completed'), CHECKPOINT_ONLY: String(mode === 'epoch'),
      RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: String(mode === 'epoch'),
      GITHUB_OUTPUT: posix(out), PROBE_LOG: posix(probe), PREFLIGHT_CACHE_KEY: 'synthetic',
      PUBLIC_MANIFEST_AVAILABLE: 'true', GITHUB_WORKSPACE: posix(root),
      RAVRADAR_PREFLIGHT_WORK: posix(path.join(root, 'work')) } });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    const calls = await fs.readFile(probe, 'utf8').catch(() => '');
    if (mode === 'normal') assert.equal(calls, 'NODE_PROBE\nPYTHON_PROBE\n', result.stderr);
    else {
      assert.equal(calls, '');
      assert((await fs.readFile(out, 'utf8')).includes('reason=' + (mode === 'completed' ? 'completed-private-runtime' : 'epoch-checkpoint-reentry')));
      await assert.rejects(fs.access(path.join(root, 'work/input')));
    }
  }
});

test('request, exact target and honest terminal cannot be forged as fresh weather success', () => {
  assert.equal(completedRuntimeFailureCode(new Error('unbounded private text must not escape')), 'COMPLETED_PRIVATE_RUNTIME_REFUSED_UNKNOWN');
  for (const completedRuntimeBoundary of ['request', 'pointer', 'restore', 'identity', 'ancestry', 'installed-files',
    'B-S-compare', 'active-source', 'rebuilt-B']) assert.equal(completedRuntimeFailureCode({ completedRuntimeBoundary }),
      'COMPLETED_PRIVATE_RUNTIME_REFUSED_' + completedRuntimeBoundary.toUpperCase().replaceAll('-', '_'));
  const request = { COMPLETED_PRIVATE_RUNTIME: 'true', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'a'.repeat(40), RAVRADAR_PRODUCTION_TARGET_HOUR: '2026-10-16T10:00:00Z',
    QUICK_CONFIRMATION: 'false', QUICK_PROGRESS_SOURCE: '', CHECKPOINT_TARGET_HOUR: '', CHECKPOINT_ONLY: 'false',
    EPOCH_BOOTSTRAP: 'false', EPOCH_REENTRY: 'false', NATIVE_IDENTITY_RECOVERY: 'false',
    EXTENDED_PROVIDER_BOOTSTRAP: 'false', PRODUCE_HANDOFF: 'false' };
  assertCompletedPrivateRuntimeRequest(request);
  for (const [key, value] of [['GITHUB_REF', 'refs/heads/other'], ['GITHUB_EVENT_NAME', 'pull_request'],
    ['GITHUB_RUN_ATTEMPT', '2'], ['QUICK_CONFIRMATION', 'true'], ['QUICK_PROGRESS_SOURCE', '38948366717-1'],
    ['CHECKPOINT_TARGET_HOUR', '2026-10-16T10:00:00Z'], ['CHECKPOINT_ONLY', 'true'],
    ['EPOCH_BOOTSTRAP', 'true'], ['EPOCH_REENTRY', 'true'], ['NATIVE_IDENTITY_RECOVERY', 'true'],
    ['EXTENDED_PROVIDER_BOOTSTRAP', 'true'], ['PRODUCE_HANDOFF', 'true']])
    assert.throws(() => assertCompletedPrivateRuntimeRequest({ ...request, [key]: value }));
  const identity = { datasetId: 'rr-synthetic-completed-b', productionReferenceAt: '2026-10-16T10:00:00.000Z', generatedAt: '2026-10-16T19:19:45.000Z' };
  assertCompletedRuntimePublicIdentity(identity, { ...identity });
  for (const key of Object.keys(identity)) assert.throws(() => assertCompletedRuntimePublicIdentity(identity, { ...identity, [key]: 'different' }));
  const terminal = { targetOutcome: 'success', buildOutcome: 'success', weatherOutcome: 'skipped', completedPrivateRuntime: true,
    completedRuntimeOutcome: 'success', pagesBuildOutcome: 'success', pagesPrivacyOutcome: 'success', pagesArtifactSealOutcome: 'success',
    deployJobOutcome: 'success', deploymentOutcome: 'success', publicVerificationOutcome: 'success', shouldDeploy: true,
    artifactBuilt: true, deployedVerified: true, fullValidationOutcome: 'success', releaseGateOutcome: 'success' };
  assert.equal(classifyVerifiedWeatherDeployment(terminal).status, 'DEPLOYED');
  for (const patch of [{ completedRuntimeOutcome: 'skipped' }, { weatherOutcome: 'success' },
    { completedPrivateRuntime: false }, { publicVerificationOutcome: 'failure' }, { pagesPrivacyOutcome: 'failure' }])
    assert.equal(classifyVerifiedWeatherDeployment({ ...terminal, ...patch }).status, 'FAILED');
});

test('actual local Git ancestry rejects shallow/missing/nonancestor producer and full depth admits only its ancestor', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-completed-ancestry-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const repository = path.join(folder, 'source'), shallow = path.join(folder, 'shallow');
  await fs.mkdir(repository);
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=RavRadar synthetic test', '-c',
    'user.email=synthetic@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=NUL', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(repository, 'init', '-b', 'main');
  git(repository, 'commit', '--allow-empty', '-m', 'synthetic completed producer');
  const producer = git(repository, 'rev-parse', 'HEAD');
  git(repository, 'commit', '--allow-empty', '-m', 'synthetic consumer');
  const head = git(repository, 'rev-parse', 'HEAD');
  assertCompletedRuntimeProducerAncestry(repository, producer, head);
  assert.throws(() => assertCompletedRuntimeProducerAncestry(repository, head, producer));
  git(folder, 'clone', '--no-local', '--depth=1', '--branch=main', repository, shallow);
  assert.throws(() => assertCompletedRuntimeProducerAncestry(shallow, producer, head));
  git(shallow, 'fetch', '--unshallow', 'origin');
  assertCompletedRuntimeProducerAncestry(shallow, producer, head);
  git(repository, 'checkout', '--orphan', 'unrelated');
  git(repository, 'commit', '--allow-empty', '-m', 'synthetic unrelated producer');
  assert.throws(() => assertCompletedRuntimeProducerAncestry(repository, git(repository, 'rev-parse', 'HEAD'), head));
  assert.throws(() => assertCompletedRuntimeProducerAncestry(repository, 'f'.repeat(40), head));
});

test('actual normal B/S admission + verify reject changed valid S; both packs recreate identical B with sourceHead-only readback', async t => {
  // Test-only observation of the actual native close probes. Never replace a
  // native result or interpret an unreproduced failure as a product fix.
  const closeProbes = observeOwnedPackCloseProbes();
  t.after(() => {
    try { assert.equal(closeProbes.restore(), true, 'The observer must restore only its own wrappers.'); }
    finally { t.diagnostic(JSON.stringify(closeProbes.summary())); }
  });
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-completed-b-roundtrip-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source'), privateRoot = path.join(root, 'private'), installed = path.join(root, 'installed');
  await fs.mkdir(source); await fs.mkdir(installed); await fs.mkdir(privateRoot);
  const write = async (folder, name, value) => { const file = path.join(folder, name); await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)); };
  for (const name of new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())) {
    const bytes = await fs.readFile(new URL('../' + name, import.meta.url));
    await write(source, name, bytes); await write(installed, name, bytes);
  }
  const reference = '2026-10-16T10:00:00.000Z', binding = ravScoreModelBinding();
  // Reuse the genuine 49-hour checkpoint fixture recipe and the normal state
  // builders; this is tiny synthetic state generation, not weather scoring.
  const samples = Array.from({ length: 49 }, (_, i) => ({
    time: new Date(Date.parse(reference) - (48 - i) * 3_600_000).toISOString(),
    currentSpeedMps: 0.12, currentAlignment: 0.75, currentVerified: true,
    waveHeightM: 1.2, wavePeriodS: 6, waveDirectionDeg: 270 }));
  const partFor = partId => ({ partId, zoneId: 'fixture-zone', landPoint: [10, 56], waterPoint: [10.01, 56.01], onshoreDirectionDeg: 90 });
  const integratedTemplate = buildIntegratedRavScoreStateSeries(samples, {
    samplingContextKey: 'sha256:' + sha('fixture'), onshoreDirectionDeg: 90 }).rows.at(-1).continuationState;
  const candidateTemplate = buildCandidateGDerivedStateSeries(samples, { stateKey: candidateGStateKey(partFor('template')) }).continuationState;
  const parts = Object.fromEntries(Array.from({ length: 673 }, (_, i) => {
    const id = 'p' + i; const { partId, ...metadata } = partFor(id);
    return [id, { ...metadata, ravScoreModel: { currentState: {
      ...structuredClone(integratedTemplate), samplingContextKey: 'sha256:' + sha(id) } } }];
  }));
  const runtime = { datasetId: 'rr-synthetic-completed-b', generatedAt: '2026-10-16T19:19:45.000Z', productionReferenceAt: reference,
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => ['z' + i, {}])),
    coastalParts: { modelBinding: binding, expectedPartCount: 673, parts },
    ravScoreCandidateGRollback: { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', sourceModelBinding: binding, rollbackModelBinding: candidateBinding(),
      rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID, automaticActivationAllowed: false, publicDuringNormalOperation: false,
      runtime: { modelBinding: candidateBinding(), expectedPartCount: 673, scoredPartCount: 673,
        scoreProfile: { modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true },
        parts: Object.fromEntries(Object.keys(parts).map(id => [id, { ravScoreModel: { currentState: {
          ...structuredClone(candidateTemplate), stateKey: candidateGStateKey(partFor(id)) } } }])) } } };
  const ledger = '{"synthetic":"unchanged selected-source ledger"}\n';
  const conditions = { ...runtime, weatherComponentInputs: { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS',
    sourceSelectionApplied: true, openMeteoBankSha256: null, copernicusBankSha256: null, selectedComponentsSha256: sha(ledger) } };
  await write(source, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
  const hours = {}, sourceDetailsSha256 = 'a'.repeat(64);
  for (let i = 0; i < RAVSCORE_PUBLIC_FORECAST_HOURS; i++) {
    const time = new Date(Date.parse(reference) + i * 3_600_000).toISOString();
    const text = JSON.stringify({ delivery: { schemaVersion: 1, kind: 'hour', key: time, sourceDetailsSha256, modelBinding: binding },
      coastalParts: { modelBinding: binding } }) + '\n', hash = sha(text);
    await write(source, 'data/live/forecast/' + hash + '.json', text);
    hours[time] = { path: './forecast/' + hash + '.json', sha256: hash, bytes: Buffer.byteLength(text) };
  }
  const publicManifest = { datasetId: runtime.datasetId, productionReferenceAt: reference, publicConditionDetailsSha256: sourceDetailsSha256,
    ravScoreModelBinding: binding, detailDelivery: { schemaVersion: 1, sourceDetailsSha256, hours } };
  const publicPack = await buildPrivatePublicHourDeliveryPack({ liveDirectory: path.join(source, 'data/live'), publicManifest,
    startupNationalForecast: { schemaVersion: 2, modelBinding: binding, dates: ['2026-10-16'], modes: {
      waders: [{ date: '2026-10-16', rows: Array.from({ length: 5 }, (_, i) => ({ zoneId: 'z' + i, name: 'Zone ' + i,
        score: 80 - i, bestTime: reference })) }], beach: [] } },
    outputPath: path.join(source, '.cache/public-hour-delivery.pack') });
  const compact = compactPrivateConditionsForPersistence(conditions, publicPack.marker);
  for (const file of PRIVATE_RUNTIME_FILES) await write(source, file.relativePath, file.id === 'full-conditions' ? compact : { synthetic: file.id });
  const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: source });
  assert.equal(spec.files.length, 11);
  const first = path.join(privateRoot, 'first'), second = path.join(privateRoot, 'second'), restored = path.join(privateRoot, 'restored');
  await createPrivateProductionRuntimeBundle({ privateRoot, bundlePath: first, repositoryRoot: source, ...spec });
  const expected = await buildPrivateRuntimeExpectation({ repositoryRoot: source, targetReferenceAt: reference,
    now: '2026-10-16T20:00:00.000Z' });
  await restorePrivateProductionRuntimeBundle({ privateRoot, bundlePath: first, repositoryRoot: source, expected,
    outputPath: restored, targetReferenceAt: reference, minimumReferenceAt: reference,
    minimumGeneratedAt: runtime.generatedAt, now: '2026-10-16T20:00:00.000Z' });
  await installRestoredPrivateRuntime({ restoredRoot: restored, repositoryRoot: installed });
  // S and public implementation seals are outside the B allowlist.
  const checkpointPath = path.join(installed, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  await saveRavScoreContinuationCheckpoint({ repositoryRoot: installed,
    sourcePath: path.join(installed, 'data/live/conditions.json'), checkpointPath });
  await write(installed, '.cache/integrated-implementation-identity.json', { synthetic: 'public implementation seal cannot enter B' });
  const rebuilt = await buildPrivateRuntimeCreateSpec({ repositoryRoot: installed });
  await createPrivateProductionRuntimeBundle({ privateRoot, bundlePath: second, repositoryRoot: installed, ...rebuilt });
  assert.deepEqual(rebuilt.metadata, spec.metadata);
  const manifest = JSON.parse(await fs.readFile(path.join(first, 'manifest.json'), 'utf8'));
  assert.deepEqual(await fs.readFile(path.join(first, 'manifest.json')), await fs.readFile(path.join(second, 'manifest.json')),
    'entire normal packed manifest, not merely numeric conditions, must be byte-identical');
  for (const file of manifest.files) assert.deepEqual(await fs.readFile(path.join(source, file.relativePath)), await fs.readFile(path.join(installed, file.relativePath)));
  const active = { model: 'integrated', status: 'INTEGRATED_ACTIVE', pending: false, calibrationEligible: false,
    productionReferenceAt: '2026-10-13T16:00:00.000Z', datasetId: 'rr-synthetic-old-active', sourceRows: { operationalVersion: 4, profileVersion: 2 } };
  const description = { ...manifest, sourceHead: 'a'.repeat(40) };
  assertCompletedPrivateRuntimeIdentity({ manifest, current: description, restored: description, expected, active, target: reference });
  for (const changed of [{ ...manifest, generatedAt: reference }, { ...manifest, partCount: 672 },
    { ...manifest, datasetId: active.datasetId }, { ...manifest, productionReferenceAt: active.productionReferenceAt }])
    assert.throws(() => assertCompletedPrivateRuntimeIdentity({ manifest: changed, current: description, restored: description, expected, active, target: reference }));
  let row = null, writes = 0, downloads = 0; const objects = new Map();
  const request = async (_suffix, options = {}) => {
    if (!options.method || options.method === 'GET') return row ? [structuredClone(row)] : [];
    assert.equal(options.method, 'POST'); assert.equal(row, null); writes++;
    const body = JSON.parse(options.body); row = { document_key: body.document_key, payload: body.payload, version: 1 };
    return [structuredClone(row)];
  };
  const storage = { ensurePrivateBucket: async () => true,
    uploadImmutable: async (key, bytes) => {
      if (objects.has(key)) { assert.deepEqual(objects.get(key), Buffer.from(bytes)); return { created: false, alreadyExists: true }; }
      objects.set(key, Buffer.from(bytes)); return { created: true }; },
    download: async key => { downloads++; assert(objects.has(key)); return Buffer.from(objects.get(key)); },
    removeExact: async () => { throw new Error('no removal admitted'); }, anonymousStatus: async () => 403 };
  const git = (...args) => execFileSync('git', ['-c', 'user.name=RavRadar synthetic test', '-c', 'user.email=synthetic@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=NUL', ...args], { cwd: installed, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main'); git('commit', '--allow-empty', '-m', 'synthetic completed producer');
  const producer = git('rev-parse', 'HEAD'); git('commit', '--allow-empty', '-m', 'synthetic completed consumer');
  const consumer = git('rev-parse', 'HEAD');
  const publish = bundlePath => ({ privateRoot, bundlePath, repositoryRoot: installed, expected,
    now: '2026-10-16T20:00:00.000Z', request, storage });
  assert.equal((await publishProtectedPrivateProductionRuntime({ ...publish(first), sourceHead: producer })).published, true);
  const pin = await readCompletedPrivateRuntimePin(request), previous = structuredClone(row);
  const reuse = await publishProtectedPrivateProductionRuntime({ ...publish(second), sourceHead: consumer });
  assert.equal(reuse.published, false);
  assert.equal(reuse.reason, 'protected-private-runtime-content-already-current');
  assert.deepEqual(row, previous); assert.equal(writes, 1); assert.equal(downloads, 2); assert.equal(objects.size, 1);
  assert.equal((await readCompletedPrivateRuntimePin(request)).pin, pin.pin);
  const currentPath = path.join(root, 'private-runtime-current-source.json');
  const restoredPath = path.join(root, 'private-runtime-restored-source.json');
  const expectedPath = path.join(root, 'private-production-runtime-expected.json');
  const activePath = path.join(root, 'completed-runtime-active-source.json');
  await write(root, path.basename(currentPath), await describeCurrentProtectedPrivateProductionRuntime({ request }));
  await write(root, path.basename(restoredPath), await describeTargetProtectedPrivateProductionRuntime({ request,
    datasetId: manifest.datasetId, bundleContentSha256: manifest.bundleContentSha256, targetReferenceAt: reference }));
  await write(root, path.basename(expectedPath), expected); await write(root, path.basename(activePath), active);
  const receiptPath = path.join(root, 'completed-private-runtime-admission.json');
  const envBefore = { pin: process.env.COMPLETED_PRIVATE_RUNTIME_PIN, head: process.env.GITHUB_SHA };
  process.env.COMPLETED_PRIVATE_RUNTIME_PIN = pin.pin; process.env.GITHUB_SHA = consumer;
  try {
    const options = { root: installed, privateRoot, bundle: first, currentPath, restoredPath, expectedPath, activePath,
      checkpointPath, receiptPath, target: reference, head: consumer, readPin: () => readCompletedPrivateRuntimePin(request) };
    const admission = await admitCompletedPrivateRuntime(options);
    assert.equal(admission.datasetId, runtime.datasetId); assert.equal(admission.scoringPerformed, false);
    await verifyCompletedPrivateRuntime({ ...options, bundle: second, requireRebuiltBundle: true });
    const originalS = await fs.readFile(checkpointPath);
    const changedSource = path.join(root, 'different-valid-checkpoint-source.json');
    await write(root, path.basename(changedSource), { ...compact, datasetId: 'rr-synthetic-other-valid-S' });
    await saveRavScoreContinuationCheckpoint({ repositoryRoot: installed, sourcePath: changedSource, checkpointPath });
    await assert.rejects(admitCompletedPrivateRuntime({ ...options, receiptPath: path.join(root, 'refused-receipt.json') }),
      error => completedRuntimeFailureCode(error) === 'COMPLETED_PRIVATE_RUNTIME_REFUSED_B_S_COMPARE');
    await assert.rejects(verifyCompletedPrivateRuntime(options),
      error => completedRuntimeFailureCode(error) === 'COMPLETED_PRIVATE_RUNTIME_REFUSED_B_S_COMPARE');
    await fs.writeFile(checkpointPath, originalS);
    await verifyCompletedPrivateRuntime({ ...options, bundle: second, requireRebuiltBundle: true });
  } finally {
    if (envBefore.pin === undefined) delete process.env.COMPLETED_PRIVATE_RUNTIME_PIN; else process.env.COMPLETED_PRIVATE_RUNTIME_PIN = envBefore.pin;
    if (envBefore.head === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = envBefore.head;
  }
  row.version++;
  assert.notEqual((await readCompletedPrivateRuntimePin(request)).pin, pin.pin, 'same descriptor with changed pointer version must be refused');
});
