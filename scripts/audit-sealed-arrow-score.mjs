#!/usr/bin/env node
// One newly owner-approved immutable package. Never repoint the older audit.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCurrentArrowLandMask, CURRENT_ARROW_LAND_MASK_SHA256 } from '../js/map/current-arrow-land-mask.js';
import { measureSavedCurrentSelection, selectSavedCandidateRoot,
  validateSavedCandidateState } from './lib/sealed-arrow-score-selection.mjs';

export const SEALED_ARROW_SCORE_TARGET = Object.freeze({
  repository: 'jakobjorgensen82-commits/RavRadar', repositoryId: 1306858343,
  runId: 37776075804, runAttempt: 1,
  sourceHead: 'e6b34db2d82d18b69fdeec21a63b8b10a6f6fa3d',
  artifactId: 11558849419, artifactName: 'ravradar-private-build-stage-37776075804-1',
  artifactBytes: 213787612,
  artifactDigest: 'sha256:772b08cdcb97e22f4c39c5ed25cbf00aff0c971917e5679969b593dbc09e3b4a',
  datasetId: 'rr-20261008140328-210', productionReferenceAt: '2026-10-08T12:00:00.000Z',
  generatedAt: '2026-10-08T14:03:28.776Z',
});
const fail = code => { throw new Error(`SEALED_ARROW_SCORE_${code}`); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const sameNumber = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-9;
const timeKey = value => {
  const ms = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(ms) || ms % 3_600_000) fail('TIME_INVALID');
  return new Date(ms).toISOString(); // Lookup only, never alter saved originals.
};
const locations = () => ({ land: 0, water: 0, unknown: 0 });
const sourceFields = ['provider', 'collection', 'modelRun', 'vectorSemanticsVersion',
  'vectorSelection', 'verticalLayer', 'verticalLayerRankM', 'temporalResolution',
  'distanceKm', 'fallback', 'sourceClass'];
const canonicalSourceValue = (source, field) => {
  const value = source?.[field] ?? null;
  return field === 'modelRun' && value !== null ? timeKey(value) : value;
};
const canonicalNativeTimes = source => source?.nativeValidTimes == null ? null
  : Array.isArray(source.nativeValidTimes) ? source.nativeValidTimes.map(timeKey) : fail('NATIVE_TIMES_INVALID');

export function validateSealedArrowScoreTarget(artifact, run, now = new Date().toISOString()) {
  const t = SEALED_ARROW_SCORE_TARGET;
  if (artifact?.id !== t.artifactId || artifact.name !== t.artifactName
    || artifact.size_in_bytes !== t.artifactBytes || artifact.digest !== t.artifactDigest
    || artifact.expired !== false || !Number.isFinite(Date.parse(now))
    || !(Date.parse(artifact.expires_at) > Date.parse(now))
    || artifact.workflow_run?.id !== t.runId || artifact.workflow_run?.head_sha !== t.sourceHead
    || artifact.workflow_run?.head_branch !== 'main'
    || artifact.workflow_run?.repository_id !== t.repositoryId
    || artifact.workflow_run?.head_repository_id !== t.repositoryId
    || run?.id !== t.runId || run.run_attempt !== t.runAttempt
    || run.head_sha !== t.sourceHead || run.head_branch !== 'main'
    || run.status !== 'completed' || run.conclusion !== 'success'
    || run.event !== 'workflow_dispatch' || run.path !== '.github/workflows/run-current-weather-once.yml'
    || run.repository?.full_name !== t.repository || run.head_repository?.full_name !== t.repository) fail('TARGET_REJECTED');
  return true;
}

// Import the exact producer's normal readers, not current main's contracts.
export async function originalArrowScoreReaders(producerRoot) {
  const root = path.resolve(producerRoot);
  const stat = await fs.lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('PRODUCER_ROOT');
  const load = relative => import(pathToFileURL(path.join(root, relative)).href);
  const [workflow, bundle, staged, bulk, hourly, bounds, adapters, memory, forecast, continuity,
    assembly, spatial, regime, candidate, candidateBinding] = await Promise.all([
    load('scripts/private-production-runtime-workflow.mjs'),
    load('scripts/private-production-runtime-bundle.mjs'),
    load('scripts/staged-private-production-runtime.mjs'),
    load('scripts/lib/dmi-bulk-storage.mjs'), load('scripts/lib/private-conditions-hourly.mjs'),
    load('scripts/lib/bounded-json-writer.mjs'), load('scripts/lib/ravscore-production-adapters.mjs'),
    load('js/core/ravscore-current-supply-memory.js'), load('scripts/lib/dmi-forecast-file.mjs'),
    load('scripts/lib/dmi-part-continuity.mjs'),
    load('scripts/lib/protected-live-current-assembly.mjs'),
    load('scripts/lib/current-spatial-runtime-proof.mjs'), load('js/core/ravscore-regime-memory.js'),
    load('scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'), load('scripts/rollback-assets/ravscore-model-contract.js'),
  ]);
  return { root, ...workflow, ...bundle, ...staged, ...bulk, ...hourly,
    ...bounds, ...adapters, ...memory, ...forecast, ...continuity, ...assembly, ...spatial, ...regime, ...candidate,
    candidateModelBinding: candidateBinding.ravScoreModelBinding };
}
export async function originalArrowScoreExpectation(readers, now = new Date().toISOString()) {
  const t = SEALED_ARROW_SCORE_TARGET;
  return { ...await readers.buildPrivateRuntimeExpectation({ repositoryRoot: readers.root,
    targetReferenceAt: t.productionReferenceAt, now }), datasetId: t.datasetId,
  productionReferenceAt: t.productionReferenceAt, generatedAt: t.generatedAt };
}

// Bounded aggregates only. Match saved inputs; do not calculate a new score.
export function measureArrowScorePart({ part, record, bulk, mask, readers }) {
  if (!object(part) || !Array.isArray(part.waterPoint) || part.waterPoint.length !== 2
    || !part.waterPoint.every(finite) || !finite(part.onshoreDirectionDeg)) fail('PART_IDENTITY');
  const partId = part.partId, bulkId = `PART::${partId}`;
  const projection = { rows: 0, dmiRows: 0, otherProviderRows: 0,
    normalSelectionMatched: locations(), normalSelectionMismatch: 0,
    noMatchingSavedSelection: 0, arrowPointMismatch: 0, arrowPointNotProved: 0 };
  const exactRows = new Map();
  for (const row of readers.verifiedIntegratedPartHourly(record ?? { hourly: [] }, bulk, bulkId, part)) {
    const key = timeKey(row.time);
    if (exactRows.has(key)) fail('DUPLICATE_SELECTION');
    exactRows.set(key, row);
  }
  const seenScoreTimes = new Set();
  for (const row of part.hourly ?? []) {
    const key = timeKey(row.time);
    if (seenScoreTimes.has(key)) fail('DUPLICATE_SCORE_TIME');
    seenScoreTimes.add(key);
    const weather = row.weather;
    if (!finite(weather?.currentSpeedMps) || !finite(weather?.currentDirectionDeg)) continue;
    projection.rows++;
    if (weather.currentProvenance?.provider !== 'dmi') { projection.otherProviderRows++; continue; }
    projection.dmiRows++;
    const selected = exactRows.get(key);
    if (selected?.currentProvenance?.status !== 'verified'
      || selected.currentProvenance.provider !== 'dmi') { projection.noMatchingSavedSelection++; continue; }
    const matches = sameNumber(selected.currentSpeedMps, weather.currentSpeedMps)
      && sameNumber(selected.currentDirectionDeg, weather.currentDirectionDeg)
      && sourceFields.every(field => JSON.stringify(canonicalSourceValue(selected.currentProvenance, field))
        === JSON.stringify(canonicalSourceValue(weather.currentProvenance, field)))
      && JSON.stringify(canonicalNativeTimes(selected.currentProvenance))
        === JSON.stringify(canonicalNativeTimes(weather.currentProvenance));
    if (!matches) { projection.normalSelectionMismatch++; continue; }
    const point = selected.currentProvenance.gridPoint;
    projection.normalSelectionMatched[mask.classifyPoint(point)]++;
    const arrow = row.flowPoints;
    if (arrow?.sources?.current !== 'dmi-marine-grid' || !Array.isArray(arrow.current)) {
      projection.arrowPointNotProved++; continue;
    }
    if (!Array.isArray(point) || point.length !== 2 || arrow.current.length !== 2
      || !point.every((value, i) => finite(arrow.current[i]) && Math.abs(value - arrow.current[i]) <= 1e-7)) {
      projection.arrowPointMismatch++;
    }
  }
  const memory = { statePresent: part.ravScoreModel?.currentState != null,
    replayMatched: false, evidence: 0, authenticSavedInputMatches: locations(),
    eligibleSavedInputMatches: locations(), unmatched: 0 };
  const state = part.ravScoreModel?.currentState;
  if (!state) return { projection, memory };
  if (!object(state) || !Array.isArray(state.currentEvidence) || state.currentEvidence.length > 50
    || state.currentMemoryWindowHours !== 48) fail('STATE_INVALID');
  const referenceTime = timeKey(state.time), currentReferenceAt = timeKey(state.currentReferenceAt);
  const nativeHold = referenceTime !== currentReferenceAt && state.currentNativeHoldAuthorization != null;
  const replay = readers.buildCurrentSupplyMemory(state.currentEvidence, { referenceTime,
    nativeHold, nativeHoldIntervalEnds: state.currentNativeHoldIntervalEnds,
    nativeHoldReferenceTime: nativeHold ? currentReferenceAt : null });
  if (replay.memoryReady !== state.currentMemoryReady || replay.status !== state.currentMemoryStatus
    || replay.referenceTime !== currentReferenceAt || replay.coverageHours !== state.currentMemoryCoverageHours
    || !(replay.supplyPotential === null ? state.supplyPotential === null : sameNumber(replay.supplyPotential, state.supplyPotential))
    || JSON.stringify(replay.evidence) !== JSON.stringify(state.currentEvidence)) fail('STATE_REPLAY_MISMATCH');
  memory.replayMatched = true;
  const identity = readers.dmiExpectedIdentityForPart(part, bulkId), rawZone = bulk?.zones?.[bulkId];
  const nativeRows = new Map();
  for (const row of Array.isArray(rawZone?.hourly) ? rawZone.hourly : Object.values(rawZone?.hourly ?? {})) {
    const key = timeKey(row.time);
    if (nativeRows.has(key)) fail('DUPLICATE_NATIVE_TIME');
    nativeRows.set(key, row);
  }
  const lower = Date.parse(currentReferenceAt) - 48 * 3_600_000;
  for (const evidence of state.currentEvidence) {
    const key = timeKey(evidence.time);
    if (Date.parse(key) < lower || Date.parse(key) > Date.parse(currentReferenceAt)) continue;
    memory.evidence++;
    const raw = nativeRows.get(key), source = raw?.sources?.current;
    const authentic = finite(raw?.['current-u']) && finite(raw?.['current-v']) && readers.verifiedBulkCurrent(
      bulk, rawZone, part.waterPoint, source, raw.time, identity);
    if (!authentic || !sameNumber(evidence.strength, readers.currentSupplyStrength(
      readers.coastNormalSpeedMpsFromUv(raw['current-u'], raw['current-v'], part.onshoreDirectionDeg)))) {
      memory.unmatched++; continue;
    }
    const location = mask.classifyPoint(authentic.gridPoint);
    memory.authenticSavedInputMatches[location]++;
    if (readers.eligibleBulkCurrent(bulk, rawZone, part.waterPoint, source, raw.time, identity)) {
      memory.eligibleSavedInputMatches[location]++;
    }
  }
  return { projection, memory };
}

export async function inspectSealedArrowScores({ producerRoot, privateRoot, bundlePath, maskRoot,
  now = new Date().toISOString() }) {
  if (['STAGED_PRIVATE_BUILD_MASTER_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'GH_TOKEN', 'GITHUB_TOKEN']
    .some(key => process.env[key])) fail('SECRET_PRESENT_DURING_INSPECTION');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => fail('NETWORK_FORBIDDEN');
  try {
    const readers = await originalArrowScoreReaders(producerRoot);
    const expected = await originalArrowScoreExpectation(readers, now);
    const verified = await readers.verifyPrivateProductionRuntimeBundle({ repositoryRoot: readers.root,
      privateRoot, bundlePath, expected, now });
    const payload = path.join(bundlePath, 'payload');
    const conditionsFile = path.join(payload, 'data/live/conditions.json');
    const stat = await fs.lstat(conditionsFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > readers.PRIVATE_CONDITIONS_MAX_BYTES) fail('CONDITIONS_BOUND');
    const conditions = JSON.parse(await fs.readFile(conditionsFile, 'utf8'));
    readers.assertPrivateConditionsHourly(conditions);
    if (conditions.datasetId !== expected.datasetId || conditions.generatedAt !== expected.generatedAt
      || timeKey(conditions.productionReferenceAt) !== expected.productionReferenceAt
      || Object.keys(conditions.zones ?? {}).length !== 210
      || Object.keys(conditions.coastalParts?.parts ?? {}).length !== 673) fail('CONDITIONS_IDENTITY');
    const maskFile = path.join(maskRoot, 'data/map/current-arrow-land-mask.json');
    const maskStat = await fs.lstat(maskFile);
    if (!maskStat.isFile() || maskStat.isSymbolicLink() || maskStat.size !== 4481562) fail('MASK_BOUND');
    const maskBytes = await fs.readFile(maskFile);
    if (crypto.createHash('sha256').update(maskBytes).digest('hex') !== CURRENT_ARROW_LAND_MASK_SHA256) fail('MASK_DIGEST');
    const mask = createCurrentArrowLandMask(JSON.parse(maskBytes.toString('utf8')));
    const bulk = await readers.readDmiBulkDocument(path.join(payload, 'data/live/dmi-bulk-cache.json'));
    const pilotFile = path.join(payload, 'data/live/current-pilot-history.json');
    const pilotStat = await fs.lstat(pilotFile);
    if (!pilotStat.isFile() || pilotStat.isSymbolicLink() || pilotStat.size > 256 * 1024 * 1024) fail('PILOT_BOUND');
    const pilotDocument = JSON.parse(await fs.readFile(pilotFile, 'utf8'));
    const pilot = Number(pilotDocument?.schemaVersion) === 1 && pilotDocument?.controlledLivePilot === true
      ? pilotDocument : null; // Same admission entry as the original normal caller.
    const candidateRoot = selectSavedCandidateRoot(conditions, readers);
    const selectedInputs = { projection: { rows: 0, matched: 0, mismatched: 0, unavailable: 0,
      providers: { dmi: 0, copernicus: 0, 'open-meteo': 0 }, mapLocation: locations() },
    memories: Object.fromEntries(['integrated', 'candidateG'].map(kind => [kind,
      { finite: 0, missing: 0, matched: 0, mismatched: 0, unavailable: 0,
        providers: { dmi: 0, copernicus: 0, 'open-meteo': 0 }, mapLocation: locations() }])) };
    let candidateStatesReplayed = 0;
    const addCounts = (target, input) => {
      for (const [key, value] of Object.entries(input)) {
        if (typeof value === 'number') target[key] += value;
        else addCounts(target[key], value);
      }
    };
    const index = await readers.inspectDmiForecastFile(path.join(payload, 'data/live/dmi-forecast-cache.json'));
    const entries = new Map(), meta = index.continuity?.metadata;
    if (meta && (meta.partCount !== 673 || index.continuity.entries.length !== 673)) fail('CONTINUITY_COUNT');
    if (meta) readers.assertDmiPartContinuityTotalSize(meta.rawBytes, meta.compressedBytes);
    let rawBytes = 0, compressedBytes = 0, lastId = null;
    const totals = { parts: 0, storedScoreRows: 0, storedDmiScoreRows: 0, storedOtherProviderScoreRows: 0,
      dmiScoreSelectionMatches: locations(), dmiScoreSelectionMismatches: 0, noMatchingSavedDmiSelection: 0,
      arrowPointMismatches: 0, arrowPointNotProved: 0, presentStates: 0, replayedStates: 0,
      memoryEvidence: 0, authenticNativeMemoryMatches: locations(), eligibleNativeMemoryMatches: locations(),
      unmatchedNativeMemoryEvidence: 0 };
    for (const descriptor of index.continuity?.entries ?? []) {
      const entry = await readers.readDmiForecastRecord(index, descriptor);
      if (entries.has(entry.partId) || lastId !== null && entry.partId.localeCompare(lastId) <= 0) fail('CONTINUITY_ID');
      lastId = entry.partId;
      // Retain only descriptors, not 673 decoded records/large national strings.
      entries.set(entry.partId, descriptor);
    }
    for (const [partId, original] of Object.entries(conditions.coastalParts.parts)) {
      if (!object(original) || !Object.hasOwn(conditions.zones, original.zoneId)) fail('PART_IDENTITY');
      const part = { ...original, partId };
      let record = null;
      if (entries.has(partId)) {
        const entry = await readers.readDmiForecastRecord(index, entries.get(partId));
        const decoded = await readers.unpackDmiPartContinuity({ ...meta, partCount: 1,
          rawBytes: entry.rawBytes, compressedBytes: entry.compressedBytes, entries: [entry] }, [part], meta.productionReferenceAt);
        rawBytes += entry.rawBytes; compressedBytes += entry.compressedBytes;
        if (!decoded.has(partId)) fail('ORIGINAL_GEOMETRY_MISMATCH');
        record = decoded.get(partId);
      }
      const { projection: p, memory: m } = measureArrowScorePart({ part, record, bulk, mask, readers });
      const candidateState = candidateRoot?.runtime.parts[partId]?.ravScoreModel?.currentState;
      const candidateEvidence = candidateRoot ? validateSavedCandidateState(candidateState, part, readers) : [];
      candidateStatesReplayed += Number(candidateRoot !== null);
      const selected = measureSavedCurrentSelection({ part, record, bulk, pilot,
        referenceAt: expected.productionReferenceAt, storedRows: part.hourly ?? [],
        integratedEvidence: part.ravScoreModel?.currentState?.currentEvidence ?? [],
        candidateEvidence, readers, mask });
      addCounts(selectedInputs, selected);
      totals.parts++; totals.storedScoreRows += p.rows; totals.storedDmiScoreRows += p.dmiRows;
      totals.storedOtherProviderScoreRows += p.otherProviderRows;
      totals.dmiScoreSelectionMismatches += p.normalSelectionMismatch;
      totals.noMatchingSavedDmiSelection += p.noMatchingSavedSelection;
      totals.arrowPointMismatches += p.arrowPointMismatch; totals.arrowPointNotProved += p.arrowPointNotProved;
      totals.presentStates += Number(m.statePresent); totals.replayedStates += Number(m.replayMatched);
      totals.memoryEvidence += m.evidence; totals.unmatchedNativeMemoryEvidence += m.unmatched;
      for (const location of ['land', 'water', 'unknown']) {
        totals.dmiScoreSelectionMatches[location] += p.normalSelectionMatched[location];
        totals.authenticNativeMemoryMatches[location] += m.authenticSavedInputMatches[location];
        totals.eligibleNativeMemoryMatches[location] += m.eligibleSavedInputMatches[location];
      }
    }
    if (meta && (rawBytes !== meta.rawBytes || compressedBytes !== meta.compressedBytes)) fail('CONTINUITY_TOTALS');
    const report = { kind: 'SEALED_ARROW_SCORE_AUDIT', schemaVersion: 1, status: 'MEASURED_WITH_LIMITATIONS',
      artifactId: SEALED_ARROW_SCORE_TARGET.artifactId, sourceRunId: SEALED_ARROW_SCORE_TARGET.runId,
      sourceHead: SEALED_ARROW_SCORE_TARGET.sourceHead, datasetId: expected.datasetId,
      productionReferenceAt: expected.productionReferenceAt, generatedAt: expected.generatedAt,
      bundleIntegrityVerified: true, priorOriginalGcmOpenRequired: true,
      exactProducerReaders: true, fileCount: verified.fileCount,
      nationalPartsMeasured: 673, coastlineSha256: CURRENT_ARROW_LAND_MASK_SHA256,
      continuity: meta ? 'ORIGINAL_DMI_ONLY' : 'NOT_PRESENT', totals,
      selectedInputs, controlledPilotPresent: pilot !== null,
      candidateRoot: candidateRoot?.kind ?? 'NOT_PRESENT', candidateStatesReplayed,
      attribution: 'SAVED_INPUT_TIME_SOURCE_AND_PROJECTION_MATCH_NOT_PERSISTED_CAUSAL_JOIN',
      nativeWetMask: 'NOT_MEASURED_COASTLINE_IS_NOT_PROVIDER_CELL_VALIDITY',
      otherProviderScoreGrounding: 'ORIGINAL_NORMAL_CP_OM_ASSEMBLY_COMPARED_WHERE_SAVED_ROWS_EXIST',
      retainedCandidateGTransportGrounding: 'SAVED_EVIDENCE_STRENGTH_MATCH_NOT_PERSISTED_CAUSAL_JOIN',
      numericCorrectionMade: false, scoreCorrectnessProved: false, rawVectorsIncluded: false,
      coordinatesIncluded: false, privatePayloadIncluded: false, providersCalled: false,
      scoreGenerated: false, productionPointerUnchanged: true };
    if (Buffer.byteLength(JSON.stringify(report)) > 32 * 1024) fail('REPORT_BOUND');
    return report;
  } finally { globalThis.fetch = originalFetch; }
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  const arg = name => { const i = args.indexOf(name); if (i < 0 || !args[i + 1]) fail('ARGUMENT'); return args[i + 1]; };
  if (mode === 'target') validateSealedArrowScoreTarget(JSON.parse(await fs.readFile(arg('--artifact'), 'utf8')),
    JSON.parse(await fs.readFile(arg('--run'), 'utf8')));
  else if (mode === 'open') {
    const readers = await originalArrowScoreReaders(arg('--producer-root'));
    const stat = await fs.lstat(arg('--input'));
    // Actual member length is measured after fixed ZIP authentication, not guessed as ZIP-minus-header.
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 100 || stat.size > SEALED_ARROW_SCORE_TARGET.artifactBytes) fail('CIPHER_BOUND');
    const t = SEALED_ARROW_SCORE_TARGET;
    const result = await readers.openStagedPrivateProductionRuntime({ repositoryRoot: readers.root,
      privateRoot: arg('--private-root'), bundlePath: arg('--bundle'), inputPath: arg('--input'),
      expected: await originalArrowScoreExpectation(readers), repository: t.repository,
      runId: String(t.runId), runAttempt: String(t.runAttempt), sourceHead: t.sourceHead,
      masterSecret: process.env.STAGED_PRIVATE_BUILD_MASTER_SECRET });
    if (!result.restored || !result.productionPointerUnchanged) fail('OPEN_REJECTED');
  } else if (mode === 'inspect') {
    const report = await inspectSealedArrowScores({ producerRoot: arg('--producer-root'), privateRoot: arg('--private-root'),
      bundlePath: arg('--bundle'), maskRoot: arg('--mask-root') });
    await fs.writeFile(arg('--report'), JSON.stringify(report) + '\n', { flag: 'wx', mode: 0o600 });
  } else fail('MODE');
  console.log(JSON.stringify({ kind: 'SEALED_ARROW_SCORE_STEP', status: 'SUCCESS', privatePayloadIncluded: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(async () => {
  const i = process.argv.indexOf('--report');
  if (i >= 0 && process.argv[i + 1]) await fs.writeFile(process.argv[i + 1], JSON.stringify({
    kind: 'SEALED_ARROW_SCORE_AUDIT', status: 'FAILED_CLOSED', privatePayloadIncluded: false,
    rawVectorsIncluded: false, productionPointerUnchanged: true }) + '\n', { flag: 'wx', mode: 0o600 }).catch(() => {});
  console.error('SEALED_ARROW_SCORE_AUDIT_FAILED_CLOSED'); process.exitCode = 1;
});
