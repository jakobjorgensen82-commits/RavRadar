import crypto from 'node:crypto';
import { canonicalPrivateRuntimeJson, privateRuntimeBundleContentSha256 } from '../private-production-runtime-bundle.mjs';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (a, b) => canonicalPrivateRuntimeJson(a) === canonicalPrivateRuntimeJson(b);
const exactHour = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value && Date.parse(value) % 3_600_000 === 0;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Export ONLY observations that were actually persisted by the old producer.
 * The old producer's score projection loses raw U/V and wave source evidence;
 * it is deliberately not returned as a model-input record or replay proof.
 * The caller must verify the whole protected bundle using the predecessor's
 * reader before passing these hash-bound bytes and that same reader here.
 */
export function extractProtectedPredecessorInputs({ conditionsBytes, manifest,
  expectedIdentity, oldStaging, oldIntegratedBinding, oldCandidateBinding } = {}) {
  if (!Buffer.isBuffer(conditionsBytes) || !plain(manifest) || !plain(expectedIdentity)
      || !/^[0-9a-f]{40}$/.test(expectedIdentity.sourceHead ?? '')
      || manifest.bundleContentSha256 !== privateRuntimeBundleContentSha256(manifest)
      || manifest.bundleContentSha256 !== expectedIdentity.bundleContentSha256
      || manifest.datasetId !== expectedIdentity.datasetId
      || manifest.productionReferenceAt !== expectedIdentity.productionReferenceAt
      || manifest.generatedAt !== expectedIdentity.generatedAt
      || manifest.partCount !== expectedIdentity.expectedPartCount
      || manifest.zoneCount !== expectedIdentity.expectedZoneCount
      || !same(manifest.modelBinding, expectedIdentity.modelBinding)
      || !same(manifest.contractHashes, expectedIdentity.contractHashes)) {
    throw new Error('Predecessor input export does not match its protected identity');
  }
  const files = manifest.files?.filter(file => file.id === 'full-conditions'
    && file.relativePath === 'data/live/conditions.json');
  if (files?.length !== 1 || files[0].bytes !== conditionsBytes.length
      || files[0].sha256 !== hash(conditionsBytes)) {
    throw new Error('Predecessor input export conditions bytes do not match the sealed manifest');
  }
  let source;
  try { source = JSON.parse(conditionsBytes.toString('utf8')); }
  catch { throw new Error('Protected predecessor conditions cannot be parsed'); }
  if (source.datasetId !== manifest.datasetId || source.productionReferenceAt !== manifest.productionReferenceAt
      || source.generatedAt !== manifest.generatedAt || !exactHour(source.productionReferenceAt)
      || Object.keys(source.zones ?? {}).length !== manifest.zoneCount
      || Object.keys(source.coastalParts?.parts ?? {}).length !== manifest.partCount) {
    throw new Error('Predecessor input export conditions generation is incomplete');
  }
  const integratedBinding = oldIntegratedBinding.ravScoreModelBinding();
  const candidateBinding = oldCandidateBinding.ravScoreModelBinding();
  oldIntegratedBinding.assertRavScoreModelBinding(source.coastalParts.modelBinding);
  if (!same(integratedBinding, manifest.modelBinding)) throw new Error('Predecessor input export uses another model reader');
  const roots = [
    ['ravScoreCandidateGRollback', 'rollbackModelBinding'],
    ['ravScoreCandidateGWarmup', 'candidateModelBinding'],
  ].filter(([name]) => source[name] !== undefined);
  if (roots.length !== 1) throw new Error('Predecessor input export needs one exclusive Candidate G runtime');
  const [candidateRoot, candidateBindingKey] = roots[0];
  const candidate = source[candidateRoot];
  if (!same(candidate.sourceModelBinding, integratedBinding)
      || !same(candidate[candidateBindingKey], candidateBinding)
      || !same(candidate.runtime?.modelBinding, candidateBinding)) {
    throw new Error('Predecessor input export Candidate G binding is not exact');
  }
  const ids = Object.keys(source.coastalParts.parts).sort();
  if (!same(ids, Object.keys(candidate.runtime.parts ?? {}).sort())) {
    throw new Error('Predecessor input export state-pair inventory differs');
  }
  const parts = {};
  for (const partId of ids) {
    const original = source.coastalParts.parts[partId];
    const part = { ...original, partId };
    if (original.partId !== undefined && original.partId !== partId) throw new Error('Predecessor PART identity differs');
    if (!Object.hasOwn(source.zones, original.zoneId)) throw new Error('Predecessor PART parent is absent');
    oldIntegratedBinding.assertRavScoreModelBinding(Object.fromEntries(
      Object.keys(integratedBinding).map(key => [key, original.ravScoreModel?.[key]])));
    const identity = oldStaging.coastalPointStageIdentity(part);
    const integratedState = original.ravScoreModel?.currentState;
    const candidateGState = candidate.runtime.parts[partId]?.ravScoreModel?.currentState;
    oldStaging.assertIntegratedCoastalPointContinuation(integratedState, { samplingContextKey: identity.samplingContextKey });
    oldStaging.assertCandidateGCoastalPointRollbackContinuation(candidateGState, identity.expectedCandidateGStateKey);
    if (integratedState.time !== candidateGState.time || integratedState.time !== source.productionReferenceAt
        || original.current?.time !== source.productionReferenceAt || !plain(original.current.weather)
        || !Array.isArray(original.hourly)) throw new Error('Predecessor input export H0 pair or weather is not exact');
    let previous = null;
    const observedHourly = original.hourly.map(row => {
      if (!exactHour(row?.time) || row.time < source.productionReferenceAt
          || (previous !== null && row.time <= previous) || !plain(row.weather)) {
        throw new Error('Predecessor observed weather projection has an invalid time inventory');
      }
      previous = row.time;
      return { time: row.time, weather: structuredClone(row.weather) };
    });
    if (observedHourly[0]?.time !== source.productionReferenceAt
        || !same(observedHourly[0].weather, original.current.weather)) {
      throw new Error('Predecessor observed H0 and current weather disagree');
    }
    parts[partId] = {
      partId, parentZoneId: original.zoneId, waterPoint: structuredClone(original.waterPoint),
      onshoreDirectionDeg: original.onshoreDirectionDeg,
      samplingContextKey: identity.samplingContextKey,
      statePair: structuredClone({ integratedState, candidateGState }),
      statePairSha256: hash(canonicalPrivateRuntimeJson({ integratedState, candidateGState })),
      observedProjection: { kind: 'PERSISTED_SCORE_WEATHER_PROJECTION', hourly: observedHourly },
      rawSelectedInputRecord: null,
      historicalInputDisposition: 'RAW_HISTORY_NOT_PERSISTED',
      inputEquivalenceProved: false,
      affectedByPeakCorrection: null,
      bundleBridgeDisposition: 'REQUIRES_ACTUAL_INPUT_EQUIVALENCE_OR_AFFECTED_REPLAY',
    };
  }
  return {
    schemaVersion: 1, kind: 'RAVRADAR_PROTECTED_PREDECESSOR_INPUT_EVIDENCE',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', privatePayloadIncluded: true,
    sourceHead: expectedIdentity.sourceHead, datasetId: manifest.datasetId,
    productionReferenceAt: manifest.productionReferenceAt, generatedAt: manifest.generatedAt,
    sourceBundleContentSha256: manifest.bundleContentSha256,
    sourceConditionsSha256: files[0].sha256, modelBinding: structuredClone(integratedBinding),
    candidateModelBinding: structuredClone(candidateBinding), candidateRoot, parts,
    summary: { partCount: ids.length, validatedStatePairCount: ids.length,
      rawSelectedHistoryAvailable: false, historicalInputEquivalenceProved: false,
      affectedPartCount: null, reboundStateCount: 0, coldResetPartCount: 0,
      privatePayloadIncluded: false },
  };
}

export function requirePersistedRawPredecessorRecord(partEvidence) {
  if (partEvidence?.rawSelectedInputRecord === null
      && partEvidence?.historicalInputDisposition === 'RAW_HISTORY_NOT_PERSISTED') {
    const error = new Error('Protected predecessor contains a score-weather projection, not the consumed raw input history');
    error.code = 'RAVSCORE_PREDECESSOR_RAW_HISTORY_NOT_PERSISTED';
    throw error;
  }
  throw new Error('Unknown predecessor input evidence contract');
}
