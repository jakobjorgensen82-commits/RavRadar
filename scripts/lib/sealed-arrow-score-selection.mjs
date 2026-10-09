// Read-only comparison through the exact original producer's supplied readers.
// No provider, new score, mutation, loose source admission or claimed causal ID.
import { isDeepStrictEqual } from 'node:util';
const fail = code => { throw new Error('SEALED_ARROW_SCORE_' + code); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const locations = () => ({ land: 0, water: 0, unknown: 0 });
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort());
const ready = state => state?.transportMemoryReady === true && state.transportMemoryStatus === 'READY'
  && state.transportMemoryWindowHours === 48 && finite(state.transportMemoryCoverageHours)
  && Math.abs(state.transportMemoryCoverageHours - 48) <= 1e-6;
const time = value => {
  const ms = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(ms) || ms % 3600000) fail('SELECTION_TIME');
  return new Date(ms).toISOString();
};
const sourceView = source => {
  if (!source || typeof source !== 'object') return source;
  return { ...source,
    ...(source.modelRun == null ? {} : { modelRun: time(source.modelRun) }),
    ...(source.nativeValidTimes == null ? {} : { nativeValidTimes: source.nativeValidTimes.map(time) }) };
};
// Exact public projection contract of the original producer. This comparison
// intentionally does NOT claim that omitted run/cell IDs were publicly stored.
const publicSourceFields = ['status', 'reason', 'provider', 'collection', 'source', 'sourceClass',
  'controlledLivePilot', 'temporalResolution', 'verticalLayer', 'vectorSelection',
  'vectorSemanticsVersion', 'method', 'fallback', 'distanceKm'];
const publicSourceView = source => source && Object.fromEntries(publicSourceFields
  .filter(key => source[key] !== undefined).map(key => [key, source[key]]));
export function measureSavedCurrentSelection({ part, record, bulk, pilot, referenceAt,
  storedRows = [], integratedEvidence = [], candidateEvidence = [], readers, mask, projectionKind = 'private' }) {
  if (!['private', 'public'].includes(projectionKind)) fail('PROJECTION_KIND');
  if (!part?.partId || !finite(part.onshoreDirectionDeg)) fail('SELECTION_PART');
  const bulkId = 'PART::' + part.partId, identity = readers.dmiExpectedIdentityForPart(part, bulkId);
  // Missing continuity stays missing. Do not fabricate hourly rows from score
  // values or seed history times to make a currently admissible source causal.
  const assembled = readers.mergeActiveNativeLiveCurrentPilotIntoRecord(record ?? { hourly: [] }, part, pilot, {
    activeBulk: bulk, bulkId, productionReferenceAt: referenceAt,
    primaryCurrentVerified: row => Boolean(readers.eligibleBulkCurrent(
      bulk, bulk?.zones?.[bulkId], part.waterPoint, row?.sources?.current, row?.time, identity)),
  });
  const byTime = new Map();
  for (const row of readers.verifiedIntegratedPartHourly(assembled, bulk, bulkId, part)) {
    const key = time(row.time);
    if (byTime.has(key)) fail('DUPLICATE_SELECTION');
    byTime.set(key, row);
  }
  const location = point => {
    const result = mask.classifyPoint(point);
    if (!['land', 'water', 'unknown'].includes(result)) fail('LOCATION_CLASS');
    return result;
  };
  const projection = { rows: 0, matched: 0, mismatched: 0, unavailable: 0,
    modeWeatherCompared: 0, modeWeatherMismatches: 0,
    arrowPointMatched: 0, arrowPointMismatched: 0, arrowPointUnavailable: 0,
    providers: { dmi: 0, copernicus: 0, 'open-meteo': 0 }, mapLocation: locations() };
  const seen = new Set();
  for (const stored of storedRows) {
    const key = time(stored.time);
    if (seen.has(key)) fail('DUPLICATE_SCORE_TIME'); seen.add(key);
    if (!finite(stored.weather?.currentSpeedMps) || !finite(stored.weather?.currentDirectionDeg)) continue;
    projection.rows++;
    const row = byTime.get(key), source = row?.currentProvenance;
    if (source?.status !== 'verified' || !Object.hasOwn(projection.providers, source.provider)) {
      projection.unavailable++; continue;
    }
    const expectedSource = readers.displayedCurrentProvenance(source);
    const expectedView = projectionKind === 'public' ? publicSourceView(expectedSource) : sourceView(expectedSource);
    if (row.currentSpeedMps !== stored.weather.currentSpeedMps
      || row.currentDirectionDeg !== stored.weather.currentDirectionDeg
      || !isDeepStrictEqual(expectedView,
        projectionKind === 'public' ? stored.weather.currentProvenance : sourceView(stored.weather.currentProvenance))) {
      projection.mismatched++; continue;
    }
    projection.matched++; projection.providers[source.provider]++;
    projection.mapLocation[location(source.gridPoint)]++;
    for (const weather of stored.modeWeather ?? []) {
      if (weather == null) continue;
      projection.modeWeatherCompared++;
      if (weather.time !== undefined && time(weather.time) !== key
        || weather.currentSpeedMps !== stored.weather.currentSpeedMps
        || weather.currentDirectionDeg !== stored.weather.currentDirectionDeg
        || !isDeepStrictEqual(weather.currentProvenance, stored.weather.currentProvenance)) projection.modeWeatherMismatches++;
    }
    const point = stored.flowPoints?.current;
    if (!Array.isArray(point) || !Array.isArray(source.gridPoint)) projection.arrowPointUnavailable++;
    else if (point.length === 2 && source.gridPoint.length === 2
      && point.every((value, i) => finite(value) && finite(source.gridPoint[i]) && Math.abs(value - source.gridPoint[i]) <= 1e-7)) projection.arrowPointMatched++;
    else projection.arrowPointMismatched++;
  }
  const memories = {};
  for (const [kind, evidence, maximum] of [['integrated', integratedEvidence, 50], ['candidateG', candidateEvidence, 49]]) {
    if (!Array.isArray(evidence) || evidence.length > maximum) fail('MEMORY_BOUND');
    const result = { finite: 0, missing: 0, matched: 0, mismatched: 0, unavailable: 0,
      providers: { dmi: 0, copernicus: 0, 'open-meteo': 0 }, mapLocation: locations() };
    const times = new Set();
    for (const entry of evidence) {
      const key = time(entry.time);
      if (times.has(key)) fail('DUPLICATE_MEMORY_TIME'); times.add(key);
      if (entry.strength === null) { result.missing++; continue; }
      if (!finite(entry.strength)) fail('MEMORY_STRENGTH'); result.finite++;
      const row = byTime.get(key), source = row?.currentProvenance;
      if (source?.status !== 'verified' || !Object.hasOwn(result.providers, source.provider)) {
        result.unavailable++; continue;
      }
      const derived = kind === 'integrated'
        ? readers.deriveCurrentSupplyEvidence(row, { getNormalSpeed: value => value.currentCoastNormalSpeedMps,
          isVerified: value => value.currentProvenance?.status === 'verified' })
        : readers.deriveCurrentTransportEvidence(row, {
          ...readers.CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
          getSpeed: value => value.currentSpeedMps,
          getAlignment: value => finite(value.currentDirectionDeg)
            ? Math.cos((value.currentDirectionDeg - part.onshoreDirectionDeg) * Math.PI / 180) : null,
          isVerified: value => value.currentProvenance?.status === 'verified' });
      if (!finite(derived?.strength) || Math.abs(derived.strength - entry.strength) > 1e-9) {
        result.mismatched++; continue;
      }
      result.matched++; result.providers[source.provider]++;
      result.mapLocation[location(source.gridPoint)]++;
    }
    memories[kind] = result;
  }
  return { projection, memories };
}
export function selectSavedCandidateRoot(conditions, readers) {
  const rollback = conditions.ravScoreCandidateGRollback, warmup = conditions.ravScoreCandidateGWarmup;
  if (rollback != null && warmup != null) fail('CANDIDATE_ROOT_AMBIGUOUS');
  const descriptor = rollback ?? warmup;
  if (descriptor == null) {
    if (conditions.coastalParts?.enabled === true) fail('CANDIDATE_ROOT_MISSING');
    return null; // Explicitly reported NOT_PRESENT for a non-enabled empty test runtime.
  }
  const runtime = descriptor.runtime, expectedParts = conditions.coastalParts.parts;
  const binding = readers.candidateModelBinding();
  const descriptorKeys = ['schemaVersion', 'kind', 'privacyClass', 'sourceModelBinding',
    'automaticActivationAllowed', 'publicDuringNormalOperation', 'runtime', ...(rollback
      ? ['rollbackModelBinding', 'rollbackId'] : ['candidateModelBinding', 'status', 'evidencePolicy', 'syntheticHistoryAllowed'])];
  if (!exactKeys(descriptor, descriptorKeys)
    || Object.keys(expectedParts).length !== 673 || conditions.coastalParts.expectedPartCount !== 673
    || descriptor.schemaVersion !== '1.0.0' || descriptor.privacyClass !== 'PRIVATE_PRODUCTION_RUNTIME'
    || descriptor.automaticActivationAllowed !== false || descriptor.publicDuringNormalOperation !== false
    || !isDeepStrictEqual(descriptor.sourceModelBinding, conditions.coastalParts.modelBinding)
    || !isDeepStrictEqual(rollback ? descriptor.rollbackModelBinding : descriptor.candidateModelBinding, binding)
    || descriptor.kind !== (rollback ? 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME' : 'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME')
    || (rollback ? descriptor.rollbackId !== readers.CANDIDATE_G_OPERATIONAL_ROLLBACK_ID
      : descriptor.status !== 'BUILDING_MEASURED_ONLY' || descriptor.evidencePolicy !== 'MEASURED_ONLY'
        || descriptor.syntheticHistoryAllowed !== false)
    || runtime?.schemaVersion !== 1 || runtime.enabled !== true
    || runtime.generatedAt !== conditions.productionReferenceAt || runtime.expectedPartCount !== 673
    || !isDeepStrictEqual(runtime.modelBinding, binding)
    || !isDeepStrictEqual(Object.keys(runtime.parts ?? {}).sort(), Object.keys(expectedParts).sort())
    || (rollback ? runtime.scoredPartCount !== 673 || runtime.scoreProfile?.modelCoverageReady !== true
      || runtime.scoreProfile?.modelMemoryReady !== true || runtime.scoreProfile?.modelMigrationReady !== true
      : runtime.measuredPartCount !== 673 || runtime.status !== 'BUILDING_MEASURED_ONLY'
        || !exactKeys(runtime, ['schemaVersion', 'enabled', 'status', 'generatedAt', 'modelBinding',
          'expectedPartCount', 'measuredPartCount', 'parts']))) fail('CANDIDATE_ROOT_INVALID');
  let readyParts = 0;
  for (const wrapper of Object.values(runtime.parts)) {
    if (!rollback && (!exactKeys(wrapper, ['ravScoreModel'])
      || !exactKeys(wrapper.ravScoreModel, ['currentState']))) fail('CANDIDATE_PART_INVALID');
    const stateReady = ready(wrapper?.ravScoreModel?.currentState);
    if (rollback && !stateReady) fail('CANDIDATE_READY_STATE_INVALID');
    readyParts += Number(stateReady);
  }
  if (!rollback && readyParts === 673) fail('CANDIDATE_ALL_READY_WARMUP');
  return { kind: rollback ? 'READY_ROLLBACK' : 'MEASURED_WARMUP', runtime };
}
export function validateSavedCandidateState(state, part, readers) {
  if (state == null) fail('CANDIDATE_STATE_MISSING');
  readers.assertCandidateGRollbackContinuation(state, part, 'Saved arrow-score candidate continuation');
  const replay = readers.buildBoundedCurrentTransportMemory(state.transportEvidence, {
    ...readers.CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: state.transportReferenceAt, restartAfterVerifiedTimeGap: true });
  if (replay.memoryReady !== state.transportMemoryReady || replay.status !== state.transportMemoryStatus
    || replay.windowHours !== state.transportMemoryWindowHours
    || Math.abs(replay.coverageHours - state.transportMemoryCoverageHours) > 1e-6
    || !isDeepStrictEqual(replay.evidence, state.transportEvidence)
    || replay.result !== null && (Math.abs(replay.result.transportPotential - state.transportPotential) > 1e-6
      || Math.abs(replay.result.outboundEpisodeEffectiveHours - state.outboundEpisodeEffectiveHours) > 1e-6)) fail('CANDIDATE_REPLAY_MISMATCH');
  return state.transportEvidence;
}
