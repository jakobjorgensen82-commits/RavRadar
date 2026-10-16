import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import nativeFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as epoch from './lib/weather-state-epoch-input-view.mjs';
import * as archive from './lib/weather-state-epoch-archive.mjs';
import { withIssuedAccountAssistantSource } from './check-account-assistant-issued-source.mjs';
import { CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY as OLD }
  from './lib/bounded-conditions-predecessor-transition.mjs';
import { buildRavScoreCurrentHistoryDemand } from './plan-ravscore-current-history.mjs';
import { buildRavScoreProductionPartSeries, selectRavScoreProductionInitialState }
  from './lib/ravscore-production-part-pipeline.mjs';
import { selectCoastalPointCandidateGRollbackContinuation } from './lib/coastal-point-staging-contract.mjs';
import { historicalWaveMeasuredColdPipelineInitialization } from './lib/historical-wave-input-transition.mjs';
import { RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES } from './lib/ravscore-recovery-replay.mjs';
import { RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS, isReconstructedTransportEvidence }
  from '../js/core/ravscore-regime-memory.js';
import { CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION }
  from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { inspectDmiForecastGridSampling } from './lib/dmi-forecast-store.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const HOUR_MS = 3_600_000, base = Date.parse('2026-08-29T00:00:00.000Z');
const time = hour => new Date(base + hour * HOUR_MS).toISOString();
const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
function section(source, first, next) {
  const from = source.indexOf(first), until = source.indexOf(next, from);
  assert(from >= 0 && until > from, 'Exact normal source boundary required: ' + first);
  assert.equal(source.indexOf(first, from + first.length), -1, 'Unique source boundary required');
  return source.slice(from, until);
}
function evaluate(source, environment, result) {
  // Extracted ESM bodies must retain their real strict-mode mutation rules.
  return Function(...Object.keys(environment), "'use strict';\n" + source + '\nreturn ' + result + ';')(...Object.values(environment));
}

async function actualFixture(readSource = file => fs.readFile(file, 'utf8')) {
  const reviewedSource = (await readSource(path.join(ROOT, 'scripts/test-weather-state-epoch-input-view.mjs')))
    .replace(/\r\n/g, '\n');
  // Only the reviewed test's workflow reader changed. Prove its complete new
  // identity, then invert precisely that adapter before the unchanged fixture
  // pin and real archive/caller seams below. No fixture or guard is re-pinned.
  assert.equal(hash(reviewedSource), '0b2a7546988c480bd26d6b926eed98c29b6817ce65633d778995a7f02b8f5d93');
  const source = reviewedSource
    .replace("import { inverseCompletedRuntimeWorkflow } from './lib/completed-private-runtime-workflow-review.mjs';\n", '')
    .replace(
      "const workflow = inverseCompletedRuntimeWorkflow((await fs.readFile(path.join(ROOT, '.github/workflows/reusable-weather-build.yml'), 'utf8')).replaceAll('\\r\\n', '\\n'), 'build');",
      "const workflow = (await fs.readFile(path.join(ROOT, '.github/workflows/reusable-weather-build.yml'), 'utf8')).replaceAll('\\r\\n', '\\n');",
    );
  // New exact fixture identity after its additive checkpoint case and optional
  // dynamic target time. The default OLD archive inputs/validators remain
  // unchanged; this source pin is not reused native or production evidence.
  assert.equal(hash(source), '4f0f04dfb9de43fdf45b828620164294b5e109d19eaa1b54c9dfac8f523aeb64');
  // Exact existing controlled fixture, not a second fixture bank or a mocked
  // archive assertion. Its genuine fixed044d OLD validators and real archive
  // capture/SAVE/readback/local-rehydrate run unchanged, including negatives.
  const helpers = section(source, 'async function syntheticNewFactory(', '// Controlled storage exercises')
    + section(source, 'async function archivedOldView(root, componentFixture = null, targetAt = null)', "test('a JSON archive marker");
  return evaluate(helpers, { assert, crypto, fs, nativeFs, os, path, pathToFileURL,
    ROOT, hash, HOUR_MS, base, time, vectorSelection, withIssuedAccountAssistantSource, OLD,
    ...epoch, ...archive, dmiExpectedIdentityForPart, inspectDmiForecastGridSampling, ravScoreModelBinding },
  '({ownedTemporary,exclusiveJson,archivedOldView,syntheticNewFactory})');
}

async function actualCallerSeams() {
  const updater = await fs.readFile(path.join(ROOT, 'scripts/update-weather.mjs'), 'utf8');
  const planner = await fs.readFile(path.join(ROOT, 'scripts/plan-ravscore-current-history.mjs'), 'utf8');
  // Existing producer tests use these same source-boundary seams. This target
  // executes only the actual scorer input/initialization blocks, NOT its full
  // 118h national public projection/provider/filesystem entrypoint.
  const header = section(updater, 'function scoreCoastalPartsRuntime(', '  const parentById = new Map(parentFeatures.map(');
  const prepare = evaluate(header + `
    return {previousCoastalParts,previousCandidateGRollbackRuntime,pointStateInjections,
      checkpointStates,checkpointCandidateGRollbackStates,deployedBulkCache,historicalDmiBulkCache,
      persistedDmiPartRows,previousCurrentSourceDomainTransitions,historicalWaveInputTransition,
      calculationBootstrapMode,calculationSourceValidated,forceHistoricalWaveMeasuredColdReplay,
      componentInputs,generatedAt};
  }`, { assertWeatherStateEpochInputViewForTarget: epoch.assertWeatherStateEpochInputViewForTarget,
    RAVSCORE_EFFECTIVE_FIRST_CUTOVER_BOOTSTRAP_MODE: RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.automatic,
    RAVSCORE_EFFECTIVE_FIRST_CUTOVER_SOURCE_VALIDATED: false, RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS },
  'scoreCoastalPartsRuntime');
  const initialization = section(updater, '      const existingPart = previousCoastalParts?.parts?.[part.partId] ?? null;',
    '      const feature = {');
  const initialize = evaluate(`return function(part,input) {
    const {previousCoastalParts,previousCandidateGRollbackRuntime,pointStateInjections,
      checkpointStates,checkpointCandidateGRollbackStates,historicalWaveInputTransition,
      calculationBootstrapMode,calculationSourceValidated,forceHistoricalWaveMeasuredColdReplay,generatedAt}=input;
    ${initialization}
    return {initialSelection,previousCandidateGContinuation,legacyCandidateGMigrationState,
      candidateGRollbackMeasuredColdStart,candidateGRollbackMeasuredWarmupContinuation};
  };`, { selectRavScoreProductionInitialState, selectCoastalPointCandidateGRollbackContinuation,
    historicalWaveMeasuredColdPipelineInitialization, isReconstructedTransportEvidence,
    CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION, RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES,
    CANDIDATE_G_MEASURED_WARMUP_STATUS: 'BUILDING_MEASURED_ONLY' }, 'null');
  const demandCall = section(planner, '  const demand = buildRavScoreCurrentHistoryDemand({',
    '  // Existing private .cache only;');
  const demand = input => evaluate(demandCall, { ...input, buildRavScoreCurrentHistoryDemand }, 'demand');
  assert.match(updater, /previous\?\.ravScoreCurrentSourceDomainTransitions \?\? null,\s+stateEpochView,\s+\)/);
  assert.match(updater, /const stateEpochView = process\.env\.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP === 'true'/);
  assert.match(planner, /const epochRequested = environmentBoolean\('RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP'\)/);
  return { prepare, initialize, demand };
}

test('shared genuine fixture source pin is Git LF canonical and rejects all non-line-ending drift', async () => {
  const readLF = async file => (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
  for (const readSource of [readLF, async file => (await readLF(file)).replace(/\n/g, '\r\n')]) {
    const fixture = await actualFixture(readSource);
    for (const name of ['ownedTemporary', 'exclusiveJson', 'archivedOldView', 'syntheticNewFactory']) {
      assert.equal(typeof fixture[name], 'function');
    }
  }
  await assert.rejects(actualFixture(async file => (await readLF(file)) + '// fixture drift\n'),
    { code: 'ERR_ASSERTION' });
  await assert.rejects(actualFixture(async file => (await readLF(file)).replace('\n', '\r')),
    { code: 'ERR_ASSERTION' }, 'A lone CR is not normalized away');
});

test('bounded real caller seams: archived view selects673 COLD demands and strict NEW initialization; not full updater or delivery', async t => {
  const fixtures = await actualFixture(), root = await fixtures.ownedTemporary(t);
  const { view, registry } = await fixtures.archivedOldView(root), seams = await actualCallerSeams();
  const registryPath = path.join(root, 'caller-registry.json'), activationPath = path.join(root, 'caller-activation.json');
  await fixtures.exclusiveJson(registryPath, registry);
  await fixtures.exclusiveJson(activationPath, { controlledOldActivationMustNotBeApplied: true });
  const sourcePaths = { conditions: path.join(root, 'original-conditions.json'),
    checkpoint: path.join(root, 'original-S.json'), activation: activationPath };
  const sourceHashes = Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async ([key, filename]) =>
    [key, { sha256: 'sha256:' + hash(await fs.readFile(filename)) }])));
  const registryFile = { json: registry, sha256: 'sha256:' + hash(await fs.readFile(registryPath)) };
  const demandInputs = { registry: registryFile, baseline: sourceHashes.conditions,
    conditions: view.weatherContinuityBaseline, checkpointFile: sourceHashes.checkpoint,
    activation: sourceHashes.activation, checkpoint: { loaded: false, continuationAvailable: false,
      states: view.checkpointStates, candidateGRollbackStates: view.checkpointCandidateGRollbackStates },
    activationPairs: {}, productionReferenceAt: time(10), epochView: view, stateLessRecovery: false };
  const demand = seams.demand(demandInputs);
  assert.equal(demand.demands.length, 673); assert.equal(demand.registrySha256, registryFile.sha256);
  assert.deepEqual(demand.sourceHashes, Object.fromEntries(Object.entries(sourceHashes).map(([key, value]) => [key, value.sha256])));
  for (const row of demand.demands) {
    assert.equal(row.initialSource, 'COLD_START'); assert.equal(row.initialStateAt, null);
    assert.equal(row.initialStateSha256, null);
    assert.equal((Date.parse(row.endAt) - Date.parse(row.startAt)) / HOUR_MS, 48);
    assert.equal(row.endAt, time(10));
  }
  assert.deepEqual(seams.demand({ ...demandInputs, epochView: null,
    conditions: view.plannerConditions, stateLessRecovery: true }), demand,
  'The normal demand builder is unchanged; only authenticated input selection differs.');
  assert.throws(() => seams.demand({ ...demandInputs, epochView: null }), /binding|bundle|model/i,
    'Default route still rejects OLD bindings; no implicit epoch bypass.');

  const old = view.weatherContinuityBaseline, oldPart = Object.values(old.coastalParts.parts)[0];
  const oldStates = JSON.parse(await fs.readFile(sourcePaths.checkpoint, 'utf8'));
  const oldPersisted = new Map([[oldPart.partId, { hourly: [{ oldCurrentMustNotBeConsumed: true }] }]]);
  const oldActivation = { [oldPart.partId]: { oldActivationMustNotBeApplied: true } };
  const args = [registry, [], {}, { newActiveBulkMustBePreserved: true }, { oldDeployed: true }, null, time(10),
    old.coastalParts, old.ravScoreCandidateGRollback.runtime, oldActivation,
    oldStates.states, oldStates.candidateGRollbackCompanion.states, {}, null, null, oldPersisted,
    { oldHistorical: true }, { oldTransitionArchive: true }];
  const ordinary = seams.prepare(...args), explicitNull = seams.prepare(...args, null);
  assert.deepEqual(ordinary, explicitNull);
  assert.equal(ordinary.previousCoastalParts, old.coastalParts);
  assert.equal(ordinary.pointStateInjections, oldActivation);
  assert.equal(ordinary.persistedDmiPartRows, oldPersisted);
  assert.equal(ordinary.deployedBulkCache, args[4]); assert.equal(ordinary.historicalDmiBulkCache, args[16]);
  assert.throws(() => seams.prepare(...args, { kind: 'WEATHER_STATE_EPOCH_INPUT_VIEW' }), /UNVERIFIED_VIEW/);
  const wrongTarget = [...args]; wrongTarget[6] = time(11);
  assert.throws(() => seams.prepare(...wrongTarget, view), /TARGET_MISMATCH/);
  const wrongRegistry = structuredClone(registry); wrongRegistry.zones['EPOCH-ZONE-0'][0].waterPoint[0] += 0.001;
  const wrongContract = [...args]; wrongContract[0] = wrongRegistry;
  assert.throws(() => seams.prepare(...wrongContract, view), /REGISTRY_MISMATCH/);
  const collision = [...args]; collision[13] = { forbiddenSecondTransition: true };
  assert.throws(() => seams.prepare(...collision, view), /TRANSITION_COLLISION/);
  const selected = seams.prepare(...args, view);
  assert.equal(selected.previousCoastalParts, null); assert.equal(selected.previousCandidateGRollbackRuntime, null);
  assert.equal(selected.deployedBulkCache, null); assert.equal(selected.historicalDmiBulkCache, null);
  assert.equal(selected.previousCurrentSourceDomainTransitions, null);
  assert.deepEqual(selected.pointStateInjections, {});
  assert.equal(Object.keys(selected.checkpointStates).length, 0);
  assert.equal(Object.keys(selected.checkpointCandidateGRollbackStates).length, 0);
  assert.equal(selected.persistedDmiPartRows.size, 0);
  assert.equal(selected.componentInputs.requireNativeGridSampling, true);
  assert.equal(selected.calculationBootstrapMode, view.candidateGBootstrapMode);
  assert.equal(selected.calculationSourceValidated, false);
  let initialized = 0;
  for (const part of Object.values(registry.zones).flat()) {
    const result = seams.initialize(part, selected);
    assert.equal(result.initialSelection.source, 'COLD_START'); assert.equal(result.initialSelection.state, null);
    assert.equal(result.previousCandidateGContinuation, null); assert.equal(result.legacyCandidateGMigrationState, null);
    assert.equal(result.candidateGRollbackMeasuredColdStart, true);
    initialized++;
  }
  assert.equal(initialized, 673);
  // Smallest real downstream score proof: one OWN part through the unchanged
  // production PartSeries. This is not the full scorer's national118h output.
  const part = registry.zones['EPOCH-ZONE-0'][0], zone = { id: part.zoneId, onshoreDirectionDeg: 90 };
  const rows = (await fixtures.syntheticNewFactory())(part), initial = seams.initialize(part, selected);
  const input = { part, zone, ...initial, targetReferenceAt: time(10), requireNativeGridSampling: true,
    recoverySources: [{ source: 'synthetic-own-new-native', record: { point: part.waterPoint, hourly: rows.slice(0, 10) } }],
    publicHourly: [rows[10]] };
  const result = buildRavScoreProductionPartSeries(input);
  assert.equal(result.ravScoreState.continuationState.time, time(10));
  assert.equal(result.candidateGState.initialStateSource, 'VERIFIED_MEASURED_COLD_START');
  assert.equal(result.recovery.coldStartBootstrapApplied, false);
  assert.equal(result.recovery.coldStartHistoryLineage.completeCausalPositionCount, 10);
  assert.equal(result.recovery.coldStartHistoryLineage.boundedUnknownPositionCount, 38);
  const legacyRow = structuredClone(rows[10]);
  delete legacyRow.currentProvenance.nativeGridSampling;
  for (const step of legacyRow.currentProvenance.nativeSteps) delete step.nativeGridSampling;
  assert.throws(() => buildRavScoreProductionPartSeries({ ...input, publicHourly: [legacyRow] }),
    { code: 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' });
  for (const [key, filename] of Object.entries(sourcePaths)) {
    assert.equal('sha256:' + hash(await fs.readFile(filename)), sourceHashes[key].sha256);
  }
  assert.equal('sha256:' + hash(await fs.readFile(registryPath)), registryFile.sha256);
  assert.equal(view.weatherContinuityBaseline, old);
  assert.equal(old.coastalParts.parts[oldPart.partId], oldPart);
});
