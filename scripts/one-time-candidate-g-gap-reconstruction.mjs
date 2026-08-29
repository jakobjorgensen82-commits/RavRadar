#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  isReconstructedTransportEvidence,
  ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
  ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_PROVENANCE,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
} from '../js/core/ravscore-regime-memory.js';

const HOUR_MS = 3_600_000;
const EPSILON = 1e-9;
const POLICY_PATH = 'data/admin/candidate-g-one-time-gap-reconstruction-20260829.json';
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const EXPECTED_SOURCE_BINDINGS = Object.freeze([
  Object.freeze({
    role: 'before',
    runId: 33225493339,
    runNumber: 3675,
    artifactId: 9707010150,
    artifactName: 'RavRadar-support-3675',
    headSha: 'a93082548c4cc1ddbe9c75ce303d334530a534c4',
  }),
  Object.freeze({
    role: 'after',
    runId: 33233545688,
    runNumber: 3676,
    artifactId: 9709446092,
    artifactName: 'RavRadar-support-3676',
    headSha: 'a93082548c4cc1ddbe9c75ce303d334530a534c4',
  }),
]);
const EXPECTED_FORBIDDEN_POLICY = Object.freeze({
  rawVectors: true,
  coordinates: true,
  weatherInterpolation: true,
  waveInterpolation: true,
  waterLevelInterpolation: true,
  generalFallback: true,
  automaticSchedule: true,
});

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(
  typeof value === 'string' || value instanceof Uint8Array ? value : canonicalJson(value),
).digest('hex');

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function finiteTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function strictFinite(value) {
  return value !== null && value !== undefined && value !== ''
    && typeof value !== 'boolean' && Number.isFinite(value);
}

function sameNumber(left, right) {
  return strictFinite(left) && strictFinite(right) && Object.is(left, right);
}

function iso(value) {
  if (!finiteTime(value)) throw new Error('ONE_TIME_GAP_INVALID_TIME');
  return new Date(value).toISOString();
}

function exactContext(state) {
  return [CANDIDATE_G_STATE_SCHEMA_VERSION, CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION]
    .includes(state?.schemaVersion)
    && state?.modelId === CANDIDATE_G_STATE_MODEL_ID
    && state?.variantId === CANDIDATE_G_STATE_VARIANT_ID
    && state?.profileId === CANDIDATE_G_STATE_PROFILE_ID;
}

function normalizedEvidence(evidence, label, { allowReconstructed = false } = {}) {
  if (!Array.isArray(evidence) || evidence.length < 2 || evidence.length > 49) {
    throw new Error(`ONE_TIME_GAP_${label}_EVIDENCE_COUNT`);
  }
  let previous = Number.NEGATIVE_INFINITY;
  return evidence.map(item => {
    const reconstructed = isReconstructedTransportEvidence(item);
    const expectedKeys = reconstructed
      ? 'incidentId,provenance,strength,time'
      : 'strength,time';
    if (!item || Object.keys(item).sort().join(',') !== expectedKeys
      || !finiteTime(item.time) || !strictFinite(item.strength)
      || item.strength < -1 || item.strength > 1) {
      throw new Error(`ONE_TIME_GAP_${label}_EVIDENCE_INVALID`);
    }
    if (reconstructed && !allowReconstructed) {
      throw new Error(`ONE_TIME_GAP_${label}_SOURCE_SCHEMA_NOT_MEASURED_ONLY`);
    }
    const time = Date.parse(item.time);
    if (time <= previous) throw new Error(`ONE_TIME_GAP_${label}_EVIDENCE_ORDER`);
    previous = time;
    return reconstructed
      ? {
        time: new Date(time).toISOString(),
        strength: item.strength,
        provenance: RECONSTRUCTED_TRANSPORT_EVIDENCE_PROVENANCE,
        incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
      }
      : { time: new Date(time).toISOString(), strength: item.strength };
  });
}

function stateRows(document, policy, label, { allowReconstructed = false } = {}) {
  if (typeof document?.datasetId !== 'string' || !document.datasetId.trim()
    || !finiteTime(document.productionReferenceAt)) {
    throw new Error(`ONE_TIME_GAP_${label}_DOCUMENT_IDENTITY`);
  }
  const zones = document?.zones;
  if (!zones || typeof zones !== 'object' || Array.isArray(zones)
    || Object.keys(zones).length !== policy.expectedZoneCount) {
    throw new Error(`ONE_TIME_GAP_${label}_ZONE_COUNT`);
  }
  const parts = document?.coastalParts?.parts;
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)) {
    throw new Error(`ONE_TIME_GAP_${label}_PARTS_MISSING`);
  }
  const rows = Object.entries(parts).sort(([left], [right]) => left.localeCompare(right)).map(([partId, part]) => {
    const state = part?.candidateG?.currentState;
    const expectedStateKeys = [
      'mobilisationPotential',
      'modelId',
      'outboundEpisodeEffectiveHours',
      'profileId',
      'schemaVersion',
      'stateKey',
      'time',
      'transportEvidence',
      'transportMemoryCoverageHours',
      'transportMemoryReady',
      'transportMemoryStatus',
      'transportMemoryWindowHours',
      'transportPotential',
      'transportReferenceAt',
      'variantId',
    ];
    if (!state || Object.keys(state).sort().join(',') !== expectedStateKeys.join(',')
      || !exactContext(state) || !/^sha256:[a-f0-9]{64}$/.test(String(state.stateKey || ''))
      || !finiteTime(state.time) || !finiteTime(state.transportReferenceAt)
      || Date.parse(state.transportReferenceAt) > Date.parse(state.time)
      || Date.parse(state.time) > Date.parse(document.productionReferenceAt)
      || (Date.parse(state.time) - Date.parse(state.transportReferenceAt)) / HOUR_MS
        > CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.maximumGapHours + EPSILON
      || !strictFinite(state.transportPotential) || state.transportPotential < 0 || state.transportPotential > 100
      || !strictFinite(state.outboundEpisodeEffectiveHours) || state.outboundEpisodeEffectiveHours < 0
      || !strictFinite(state.mobilisationPotential) || state.mobilisationPotential < 0 || state.mobilisationPotential > 100
      || typeof state.transportMemoryReady !== 'boolean'
      || !['READY', 'WINDOW_INCOMPLETE'].includes(state.transportMemoryStatus)
      || (state.transportMemoryStatus === 'READY') !== state.transportMemoryReady
      || state.transportMemoryWindowHours !== CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours
      || !strictFinite(state.transportMemoryCoverageHours)
      || state.transportMemoryCoverageHours < 0
      || state.transportMemoryCoverageHours > CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours) {
      throw new Error(`ONE_TIME_GAP_${label}_STATE_INVALID`);
    }
    if (!allowReconstructed && state.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION) {
      throw new Error(`ONE_TIME_GAP_${label}_SOURCE_SCHEMA_NOT_MEASURED_ONLY`);
    }
    const evidence = normalizedEvidence(state.transportEvidence, label, { allowReconstructed });
    const reconstructedCount = evidence.filter(isReconstructedTransportEvidence).length;
    if ((state.schemaVersion === CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION)
        !== (reconstructedCount > 0)) {
      throw new Error(`ONE_TIME_GAP_${label}_STATE_TRUST_SCHEMA_MISMATCH`);
    }
    if (evidence.at(-1)?.time !== iso(state.transportReferenceAt)) {
      throw new Error(`ONE_TIME_GAP_${label}_REFERENCE_MISMATCH`);
    }
    const replay = buildBoundedCurrentTransportMemory(evidence, {
      ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
      referenceTime: state.transportReferenceAt,
      restartAfterVerifiedTimeGap: true,
    });
    if (!replay.result
      || !sameNumber(replay.result.transportPotential, state.transportPotential)
      || !sameNumber(replay.result.outboundEpisodeEffectiveHours, state.outboundEpisodeEffectiveHours)
      || replay.memoryReady !== state.transportMemoryReady
      || replay.status !== state.transportMemoryStatus
      || !sameNumber(replay.windowHours, state.transportMemoryWindowHours)
      || !sameNumber(replay.coverageHours, state.transportMemoryCoverageHours)
      || canonicalJson(replay.evidence) !== canonicalJson(evidence)) {
      throw new Error(`ONE_TIME_GAP_${label}_STATE_REPLAY_MISMATCH`);
    }
    return { partId, part, state, evidence };
  });
  if (rows.length !== policy.expectedPartCount) {
    throw new Error(`ONE_TIME_GAP_${label}_PART_COUNT`);
  }
  return rows;
}

function matrixIdentity(rows) {
  return rows.map(({ partId, state }) => ({
    partId,
    stateKey: state.stateKey,
    schemaVersion: state.schemaVersion,
    modelId: state.modelId,
    variantId: state.variantId,
    profileId: state.profileId,
  }));
}

function stateMatrix(rows) {
  return rows.map(({ partId, state }) => [partId, state]);
}

function observedCadenceCandidates(evidence, edge) {
  const selected = edge === 'before' ? evidence.slice(-13) : evidence.slice(0, 13);
  const candidates = [];
  for (let index = 1; index < selected.length; index += 1) {
    const hours = (Date.parse(selected[index].time) - Date.parse(selected[index - 1].time)) / HOUR_MS;
    if (Math.abs(hours - 1) <= EPSILON || Math.abs(hours - 3) <= EPSILON) candidates.push(hours);
    else throw new Error('ONE_TIME_GAP_AMBIGUOUS_NATIVE_CADENCE');
  }
  return candidates;
}

function nativeCadenceHours(beforeEvidence, afterEvidence) {
  const beforeCandidates = observedCadenceCandidates(beforeEvidence, 'before');
  const afterCandidates = observedCadenceCandidates(afterEvidence, 'after');
  if (beforeCandidates.length < 2 || afterCandidates.length < 2) {
    throw new Error('ONE_TIME_GAP_NATIVE_CADENCE_UNPROVEN');
  }
  const beforeCadences = new Set(beforeCandidates);
  const afterCadences = new Set(afterCandidates);
  if (beforeCadences.size !== 1 || afterCadences.size !== 1
    || beforeCandidates[0] !== afterCandidates[0]) {
    throw new Error('ONE_TIME_GAP_NATIVE_CADENCE_NOT_UNANIMOUS');
  }
  return beforeCandidates[0];
}

function mergeExactEvidence(groups) {
  const byTime = new Map();
  for (const group of groups) {
    for (const item of group) {
      const time = iso(item.time);
      const existing = byTime.get(time);
      if (existing) {
        if (!sameNumber(existing.strength, item.strength)
          || isReconstructedTransportEvidence(existing) !== isReconstructedTransportEvidence(item)) {
          throw new Error('ONE_TIME_GAP_OVERLAP_CONFLICT');
        }
        continue;
      }
      byTime.set(time, { ...item, time });
    }
  }
  return [...byTime.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

function interpolateGap({ beforeAnchor, afterAnchor, cadenceHours, policy }) {
  const beforeMs = Date.parse(beforeAnchor.time);
  const afterMs = Date.parse(afterAnchor.time);
  const gapHours = (afterMs - beforeMs) / HOUR_MS;
  const cadenceCount = gapHours / cadenceHours;
  if (!(gapHours > cadenceHours + EPSILON
    && gapHours <= policy.maximumAnchorGapHours + EPSILON
    && Math.abs(cadenceCount - Math.round(cadenceCount)) <= EPSILON)) {
    throw new Error('ONE_TIME_GAP_BRACKET_SPAN_INVALID');
  }
  const count = Math.round(cadenceCount) - 1;
  if (!(count >= 1 && count <= policy.maximumSyntheticSamplesPerPart)) {
    throw new Error('ONE_TIME_GAP_SYNTHETIC_COUNT_INVALID');
  }
  return Array.from({ length: count }, (_, index) => {
    const fraction = (index + 1) / (count + 1);
    const strength = beforeAnchor.strength
      + ((afterAnchor.strength - beforeAnchor.strength) * fraction);
    if (!Number.isFinite(strength) || strength < -1 || strength > 1
      || strength < Math.min(beforeAnchor.strength, afterAnchor.strength) - EPSILON
      || strength > Math.max(beforeAnchor.strength, afterAnchor.strength) + EPSILON) {
      throw new Error('ONE_TIME_GAP_INTERPOLATION_OUT_OF_BOUNDS');
    }
    return {
      time: new Date(beforeMs + ((index + 1) * cadenceHours * HOUR_MS)).toISOString(),
      strength,
      provenance: RECONSTRUCTED_TRANSPORT_EVIDENCE_PROVENANCE,
      incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
    };
  });
}

function sanitizedTrustSummary({ descriptorSha256, affectedPartCount, syntheticSampleCount, activeUntil }) {
  return {
    schemaVersion: 1,
    incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
    decisionId: ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
    status: RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
    method: RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
    evidenceClassification: RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
    calibrationEligible: false,
    hardObservedOuttransportEligible: false,
    descriptorSha256,
    affectedPartCount,
    syntheticSampleCount,
    activeUntil,
  };
}

function verifiedOnlyTrustSummary() {
  return {
    schemaVersion: 1,
    status: 'VERIFIED_ONLY',
    calibrationEligible: true,
    hardObservedOuttransportEligible: true,
    incidentId: null,
    affectedPartCount: 0,
    syntheticSampleCount: 0,
    activeUntil: null,
  };
}

function compactTargetStateRows(document) {
  const parts = document?.coastalParts?.parts || {};
  return Object.keys(parts).sort().map(partId => [partId, parts[partId]?.candidateG?.currentState]);
}

function compactTargetIdentity(document) {
  return {
    datasetId: document?.datasetId ?? null,
    productionReferenceAt: finiteTime(document?.productionReferenceAt)
      ? iso(document.productionReferenceAt)
      : null,
    stateSha256: sha256(compactTargetStateRows(document)),
    evidenceTrust: document?.coastalParts?.evidenceTrust ?? null,
    incidentMarker: document?.candidateGOneTimeReconstruction ?? null,
  };
}

function validateCompactRollback(rollback, descriptorSha256, descriptor = null) {
  const expectedKeys = [
    'descriptorSha256',
    'incidentId',
    'payloadSha256',
    'postChangeStateSha256',
    'postChangeTargetIdentitySha256',
    'privacy',
    'schemaVersion',
    'sourceDatasetId',
    'sourceDocumentSha256',
    'sourceEvidenceTrust',
    'sourceProductionReferenceAt',
    'sourceTargetIdentitySha256',
    'stateSha256',
    'states',
    'status',
    'postChangeDocumentSha256',
  ];
  const expectedPrivacy = {
    compactDerivedStateOnly: true,
    rawVectorsIncluded: false,
    coordinatesIncluded: false,
    weatherIncluded: false,
    scoresIncluded: false,
    privateDataIncluded: false,
  };
  const { payloadSha256, ...payload } = rollback || {};
  const states = rollback?.states;
  const stateEntries = states && typeof states === 'object' && !Array.isArray(states)
    ? Object.entries(states).sort(([left], [right]) => left.localeCompare(right))
    : [];
  if (Object.keys(rollback || {}).sort().join(',') !== expectedKeys.sort().join(',')
    || rollback?.schemaVersion !== 1
    || rollback?.status !== 'ONE_TIME_GAP_PRE_CHANGE_COMPACT_ROLLBACK'
    || rollback?.incidentId !== ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    || rollback?.descriptorSha256 !== descriptorSha256
    || !SHA256_PATTERN.test(String(payloadSha256 || ''))
    || sha256(payload) !== payloadSha256
    || typeof rollback?.sourceDatasetId !== 'string' || !rollback.sourceDatasetId.trim()
    || !finiteTime(rollback?.sourceProductionReferenceAt)
    || !SHA256_PATTERN.test(String(rollback?.stateSha256 || ''))
    || !SHA256_PATTERN.test(String(rollback?.sourceDocumentSha256 || ''))
    || !SHA256_PATTERN.test(String(rollback?.postChangeDocumentSha256 || ''))
    || !SHA256_PATTERN.test(String(rollback?.postChangeStateSha256 || ''))
    || !SHA256_PATTERN.test(String(rollback?.sourceTargetIdentitySha256 || ''))
    || !SHA256_PATTERN.test(String(rollback?.postChangeTargetIdentitySha256 || ''))
    || canonicalJson(rollback?.privacy) !== canonicalJson(expectedPrivacy)
    || stateEntries.length !== 673
    || sha256(stateEntries) !== rollback.stateSha256
    || (rollback.sourceEvidenceTrust !== null
      && canonicalJson(rollback.sourceEvidenceTrust) !== canonicalJson(verifiedOnlyTrustSummary()))) {
    throw new Error('ONE_TIME_GAP_ROLLBACK_CHECKPOINT_INVALID');
  }
  if (descriptor && (rollback.sourceDatasetId !== descriptor.target.datasetId
    || iso(rollback.sourceProductionReferenceAt) !== iso(descriptor.target.productionReferenceAt)
    || rollback.stateSha256 !== descriptor.target.stateSha256
    || rollback.postChangeStateSha256 !== descriptor.integrity.plannedStateSha256)) {
    throw new Error('ONE_TIME_GAP_ROLLBACK_DESCRIPTOR_BINDING_INVALID');
  }
  for (const [partId, state] of stateEntries) {
    if (!partId || state?.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
      || !exactContext(state) || !/^sha256:[a-f0-9]{64}$/.test(String(state?.stateKey || ''))
      || !finiteTime(state?.time) || !finiteTime(state?.transportReferenceAt)
      || Date.parse(state.time) > Date.parse(rollback.sourceProductionReferenceAt)
      || state.transportMemoryReady !== false || state.transportMemoryStatus !== 'WINDOW_INCOMPLETE'
      || !strictFinite(state.mobilisationPotential)
      || (state.transportEvidence || []).some(isReconstructedTransportEvidence)) {
      throw new Error('ONE_TIME_GAP_ROLLBACK_BASELINE_INVALID');
    }
    const evidence = normalizedEvidence(state.transportEvidence, 'ROLLBACK_BASELINE');
    const replay = buildBoundedCurrentTransportMemory(evidence, {
      ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
      referenceTime: state.transportReferenceAt,
      restartAfterVerifiedTimeGap: true,
    });
    if (!replay.result
      || !sameNumber(replay.result.transportPotential, state.transportPotential)
      || !sameNumber(replay.result.outboundEpisodeEffectiveHours, state.outboundEpisodeEffectiveHours)
      || replay.memoryReady !== state.transportMemoryReady
      || replay.status !== state.transportMemoryStatus
      || !sameNumber(replay.windowHours, state.transportMemoryWindowHours)
      || !sameNumber(replay.coverageHours, state.transportMemoryCoverageHours)
      || canonicalJson(replay.evidence) !== canonicalJson(evidence)) {
      throw new Error('ONE_TIME_GAP_ROLLBACK_BASELINE_REPLAY_INVALID');
    }
  }
  const expectedSourceIdentity = sha256({
    datasetId: rollback.sourceDatasetId,
    productionReferenceAt: iso(rollback.sourceProductionReferenceAt),
    stateSha256: rollback.stateSha256,
    evidenceTrust: rollback.sourceEvidenceTrust,
    incidentMarker: null,
  });
  if (rollback.sourceTargetIdentitySha256 !== expectedSourceIdentity) {
    throw new Error('ONE_TIME_GAP_ROLLBACK_SOURCE_IDENTITY_INVALID');
  }
  return rollback;
}

function syntheticVariant(synthetic, strength) {
  return synthetic.map(item => ({ ...item, strength }));
}

function replayVariant(beforeEvidence, synthetic, afterEvidence, targetEvidence, referenceTime) {
  return buildBoundedCurrentTransportMemory(
    mergeExactEvidence([beforeEvidence, synthetic, afterEvidence, targetEvidence]),
    {
      ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
      referenceTime,
      restartAfterVerifiedTimeGap: false,
    },
  );
}

export function reconstructionEvidenceTrust(state) {
  const synthetic = (state?.transportEvidence || []).filter(isReconstructedTransportEvidence);
  if (!synthetic.length) return {
    status: 'VERIFIED_ONLY',
    calibrationEligible: true,
    hardObservedOuttransportEligible: true,
    incidentId: null,
    syntheticSampleCount: 0,
    activeUntil: null,
  };
  return {
    status: RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
    evidenceClassification: RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
    calibrationEligible: false,
    hardObservedOuttransportEligible: false,
    incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
    syntheticSampleCount: synthetic.length,
    activeUntil: new Date(Date.parse(synthetic.map(item => item.time).sort().at(-1))
      + (CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours * HOUR_MS)).toISOString(),
  };
}

const CLEANUP_PENDING_REASON = 'WINDOW_INCOMPLETE';
const CLEANUP_PENDING_MESSAGE_DA =
  'Der er endnu ikke nok sammenhængende strømdata til at beregne zonens RavScore.';

function cleanupPendingCandidateMode(evidenceTrust) {
  return {
    available: false,
    score: null,
    reason: CLEANUP_PENDING_REASON,
    evidenceTrust,
  };
}

function cleanupPendingPublicMode() {
  return {
    available: false,
    score: null,
    level: 'unavailable',
    label: 'RavScore midlertidigt utilgængelig',
    unavailability: {
      available: false,
      code: CLEANUP_PENDING_REASON,
      messageDa: CLEANUP_PENDING_MESSAGE_DA,
    },
    reasons: [CLEANUP_PENDING_MESSAGE_DA],
    scoreProfileId: CANDIDATE_G_STATE_MODEL_ID,
  };
}

function applyCleanupPendingRebuildInterlock(target, planned, descriptorSha256) {
  const verifiedTrust = verifiedOnlyTrustSummary();
  for (const { part, candidate, nextState } of planned) {
    candidate.currentState = nextState;
    candidate.referenceAt = nextState.time;
    candidate.transportReferenceAt = nextState.transportReferenceAt;
    candidate.currentTransition = 'VERIFIED_TIME_GAP_RECOVERY';
    candidate.transportMemoryReady = nextState.transportMemoryReady;
    candidate.transportMemoryStatus = nextState.transportMemoryStatus;
    candidate.transportMemoryCoverageHours = nextState.transportMemoryCoverageHours;
    candidate.transportMemoryWindowHours = nextState.transportMemoryWindowHours;
  }

  const allParts = Object.values(target?.coastalParts?.parts || {});
  if (allParts.length !== 673) throw new Error('ONE_TIME_GAP_CLEANUP_INTERLOCK_PART_COUNT');
  for (const part of allParts) {
    const candidate = part?.candidateG;
    if (!candidate || typeof candidate !== 'object') {
      throw new Error('ONE_TIME_GAP_CLEANUP_INTERLOCK_CANDIDATE_MISSING');
    }
    if (candidate.evidenceTrust?.incidentId === ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
      || candidate.evidenceTrust?.descriptorSha256 === descriptorSha256) {
      candidate.evidenceTrust = structuredClone(verifiedTrust);
    }
    candidate.modes = {
      waders: cleanupPendingCandidateMode(structuredClone(verifiedTrust)),
      beach: cleanupPendingCandidateMode(structuredClone(verifiedTrust)),
    };
    if (part?.current && typeof part.current === 'object' && !Array.isArray(part.current)) {
      part.current.waders = cleanupPendingPublicMode();
      part.current.beach = cleanupPendingPublicMode();
    }
  }

  const zones = target?.coastalParts?.zones || {};
  for (const zone of Object.values(zones)) {
    const expectedPartCount = Number.isSafeInteger(Number(zone?.expectedPartCount))
      ? Number(zone.expectedPartCount)
      : 0;
    for (const row of Array.isArray(zone?.hourly) ? zone.hourly : []) {
      for (const mode of ['waders', 'beach']) {
        row[mode] = {
          available: false,
          status: 'unavailable',
          score: null,
          validPartCount: 0,
          expectedPartCount,
          unavailableParts: [],
          reasons: [CLEANUP_PENDING_MESSAGE_DA],
        };
      }
    }
    zone.scoredPartCount = 0;
  }
  target.coastalParts.scoredPartCount = 0;
  const zoneIds = Object.keys(zones).sort();
  target.coastalParts.scoreAvailability = {
    schemaVersion: 1,
    policy: 'candidate-g-local-fail-closed',
    allZonesActive: false,
    activeZoneCount: 0,
    unavailableZoneCount: zoneIds.length,
    totalZoneCount: zoneIds.length,
    evaluatedAt: iso(target.productionReferenceAt),
    unavailableZones: zoneIds.map(zoneId => ({
      zoneId,
      reason: 'ONE_TIME_RECONSTRUCTION_CLEANUP_PENDING_REBUILD',
    })),
  };
  target.candidateGOneTimeCleanupPendingRebuild = {
    schemaVersion: 1,
    status: 'PENDING_FRESH_PRODUCTION_REBUILD',
    incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
    decisionId: ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
    descriptorSha256,
    createdAt: iso(target.productionReferenceAt),
    publicScoresFailClosed: true,
  };
}

function validatePolicy(policy) {
  const expectedPolicyKeys = [
    'decisionId',
    'expectedCadencePartCounts',
    'expectedPartCount',
    'expectedZoneCount',
    'forbidden',
    'incidentId',
    'maximumAnchorGapHours',
    'maximumSyntheticSamplesPerPart',
    'schemaVersion',
    'sources',
    'status',
  ];
  if (Object.keys(policy || {}).sort().join(',') !== expectedPolicyKeys.join(',')
    || policy?.schemaVersion !== 1
    || policy?.status !== 'owner-authorized-one-time'
    || policy?.incidentId !== ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    || policy?.decisionId !== ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID
    || policy?.expectedZoneCount !== 210
    || policy?.expectedPartCount !== 673
    || policy?.expectedCadencePartCounts?.['1h'] !== 665
    || policy?.expectedCadencePartCounts?.['3h'] !== 8
    || policy.maximumAnchorGapHours !== 6
    || policy.maximumSyntheticSamplesPerPart !== 5
    || !Array.isArray(policy.sources) || policy.sources.length !== 2) {
    throw new Error('ONE_TIME_GAP_POLICY_INVALID');
  }
  if (canonicalJson(policy.forbidden) !== canonicalJson(EXPECTED_FORBIDDEN_POLICY)) {
    throw new Error('ONE_TIME_GAP_FORBIDDEN_POLICY_INVALID');
  }
  for (const [index, source] of policy.sources.entries()) {
    if (canonicalJson(source) !== canonicalJson(EXPECTED_SOURCE_BINDINGS[index])) {
      throw new Error('ONE_TIME_GAP_SOURCE_POLICY_INVALID');
    }
  }
  return policy;
}

function parseRunAttestation(text) {
  const entries = String(text).split(/\r?\n/).filter(Boolean).map(line => {
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error('ONE_TIME_GAP_SOURCE_ATTESTATION_INVALID');
    return [line.slice(0, separator), line.slice(separator + 1)];
  });
  const expectedKeys = ['generated_at', 'ref', 'repository', 'run_number', 'sha'];
  const actualKeys = entries.map(([key]) => key).sort();
  if (new Set(actualKeys).size !== actualKeys.length
    || canonicalJson(actualKeys) !== canonicalJson(expectedKeys)) {
    throw new Error('ONE_TIME_GAP_SOURCE_ATTESTATION_SHAPE_INVALID');
  }
  const attestation = Object.fromEntries(entries);
  if (!finiteTime(attestation.generated_at)) {
    throw new Error('ONE_TIME_GAP_SOURCE_ATTESTATION_TIME_INVALID');
  }
  return attestation;
}

async function verifySourceBundles(policy, {
  beforeAttestationPath, afterAttestationPath, beforeBundlePath, afterBundlePath,
}) {
  const paths = [
    { attestationPath: beforeAttestationPath, bundlePath: beforeBundlePath },
    { attestationPath: afterAttestationPath, bundlePath: afterBundlePath },
  ];
  const verified = [];
  for (let index = 0; index < policy.sources.length; index += 1) {
    const source = policy.sources[index];
    const binding = paths[index];
    if (!binding.attestationPath || !binding.bundlePath) throw new Error('ONE_TIME_GAP_SOURCE_BINDING_MISSING');
    const [attestationText, bundleBytes] = await Promise.all([
      fs.readFile(binding.attestationPath, 'utf8'),
      fs.readFile(binding.bundlePath),
    ]);
    if (!(bundleBytes instanceof Uint8Array) || bundleBytes.byteLength === 0) {
      throw new Error('ONE_TIME_GAP_SOURCE_BUNDLE_EMPTY');
    }
    const attestation = parseRunAttestation(attestationText);
    if (attestation.repository !== 'jakobjorgensen82-commits/RavRadar'
      || attestation.run_number !== String(source.runNumber)
      || attestation.sha !== source.headSha
      || attestation.ref !== 'refs/heads/main') {
      throw new Error('ONE_TIME_GAP_SOURCE_ATTESTATION_MISMATCH');
    }
    verified.push({ artifactPayloadSha256: sha256(bundleBytes) });
  }
  return verified;
}

function buildPlan({ before, after, target, policy, sourceBindings }) {
  const beforeRows = stateRows(before, policy, 'BEFORE');
  const afterRows = stateRows(after, policy, 'AFTER');
  const targetRows = stateRows(target, policy, 'TARGET', { allowReconstructed: true });
  // A repeated apply against an already mutated target is an exact, pre-write
  // failure. The one-time operation never treats its own output as a new source.
  if (target.candidateGOneTimeReconstruction) throw new Error('ONE_TIME_GAP_TARGET_ALREADY_MARKED');
  const targetTrust = target?.coastalParts?.evidenceTrust;
  if (targetTrust !== null && targetTrust !== undefined
    && canonicalJson(targetTrust) !== canonicalJson(verifiedOnlyTrustSummary())) {
    throw new Error('ONE_TIME_GAP_TARGET_TRUST_CONFLICT');
  }
  if (!(Date.parse(before.productionReferenceAt) < Date.parse(after.productionReferenceAt)
    && Date.parse(after.productionReferenceAt) <= Date.parse(target.productionReferenceAt))) {
    throw new Error('ONE_TIME_GAP_DOCUMENT_TIME_ORDER_INVALID');
  }
  if (beforeRows.some(row => row.state.transportMemoryReady !== true
      || row.state.transportMemoryStatus !== 'READY')) {
    throw new Error('ONE_TIME_GAP_BEFORE_NOT_UNIFORMLY_READY');
  }
  if ([...afterRows, ...targetRows].some(row => row.state.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
      || row.state.transportMemoryReady !== false
      || row.state.transportMemoryStatus !== 'WINDOW_INCOMPLETE'
      || row.evidence.some(isReconstructedTransportEvidence))) {
    throw new Error('ONE_TIME_GAP_AFTER_OR_TARGET_NOT_HONEST_WINDOW_INCOMPLETE');
  }
  const identityHashes = [beforeRows, afterRows, targetRows].map(rows => sha256(matrixIdentity(rows)));
  if (new Set(identityHashes).size !== 1) throw new Error('ONE_TIME_GAP_PART_OR_CONTEXT_MISMATCH');
  const targetByPart = new Map(targetRows.map(row => [row.partId, row]));
  const afterByPart = new Map(afterRows.map(row => [row.partId, row]));
  const cadenceCounts = { '1h': 0, '3h': 0 };
  const syntheticTimeCounts = new Map();
  const planned = [];
  let signReversalPartCount = 0;
  let reconstructedOutflowGatePartCount = 0;
  const sensitivity = {
    linearVsNeutralPotentialChangedPartCount: 0,
    linearVsLeftHoldPotentialChangedPartCount: 0,
    linearVsRightHoldPotentialChangedPartCount: 0,
    neutralOutflowGatePartCount: 0,
    leftHoldOutflowGatePartCount: 0,
    rightHoldOutflowGatePartCount: 0,
  };
  let minimumBeforeAnchor = Number.POSITIVE_INFINITY;
  let maximumAfterAnchor = Number.NEGATIVE_INFINITY;
  let syntheticSampleCount = 0;

  for (const beforeRow of beforeRows) {
    const afterRow = afterByPart.get(beforeRow.partId);
    const targetRow = targetByPart.get(beforeRow.partId);
    if (!afterRow || !targetRow
      || beforeRow.state.stateKey !== afterRow.state.stateKey
      || beforeRow.state.stateKey !== targetRow.state.stateKey) {
      throw new Error('ONE_TIME_GAP_PART_BINDING_MISMATCH');
    }
    if ((targetRow.evidence || []).some(item => item?.incidentId !== undefined || item?.provenance !== undefined)) {
      throw new Error('ONE_TIME_GAP_TARGET_TRUST_CONFLICT');
    }
    const beforeAnchor = beforeRow.evidence.at(-1);
    const afterAnchor = afterRow.evidence.find(item => Date.parse(item.time) > Date.parse(beforeAnchor.time));
    if (!afterAnchor) throw new Error('ONE_TIME_GAP_AFTER_BRACKET_MISSING');
    // The old left suffix and the newer measured target suffix prove cadence.
    // Artifact 3676 supplies the exact right bracket but is not required to
    // contain two later 3-hour intervals.
    const cadenceHours = nativeCadenceHours(beforeRow.evidence, targetRow.evidence);
    cadenceCounts[`${cadenceHours}h`] += 1;
    const synthetic = interpolateGap({ beforeAnchor, afterAnchor, cadenceHours, policy });
    const targetAtSyntheticTimes = new Map(targetRow.evidence.map(item => [item.time, item]));
    if (synthetic.some(item => targetAtSyntheticTimes.has(item.time))) {
      throw new Error('ONE_TIME_GAP_TARGET_TIMESTAMP_ALREADY_FILLED');
    }
    const targetHasAfterAnchor = targetRow.evidence.some(item => item.time === afterAnchor.time
      && sameNumber(item.strength, afterAnchor.strength));
    if (!targetHasAfterAnchor) throw new Error('ONE_TIME_GAP_TARGET_AFTER_ANCHOR_MISSING');
    const mergedEvidence = mergeExactEvidence([
      beforeRow.evidence,
      synthetic,
      afterRow.evidence,
      targetRow.evidence,
    ]);
    const rebuilt = buildBoundedCurrentTransportMemory(mergedEvidence, {
      ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
      referenceTime: targetRow.state.transportReferenceAt,
      restartAfterVerifiedTimeGap: false,
    });
    if (!rebuilt.memoryReady || rebuilt.status !== 'READY'
      || !rebuilt.result || !rebuilt.evidence.some(isReconstructedTransportEvidence)) {
      throw new Error('ONE_TIME_GAP_RECONSTRUCTION_NOT_READY');
    }
    const syntheticRetained = rebuilt.evidence.filter(isReconstructedTransportEvidence);
    if (syntheticRetained.length !== synthetic.length) {
      throw new Error('ONE_TIME_GAP_RECONSTRUCTION_OUTSIDE_ACTIVE_WINDOW');
    }
    if (Math.sign(beforeAnchor.strength) !== Math.sign(afterAnchor.strength)) signReversalPartCount += 1;
    const honestOutflow = targetRow.state.outboundEpisodeEffectiveHours
      >= CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE.exhaustedAfterEffectiveHours;
    if (rebuilt.result.actualOutboundTransport === true && !honestOutflow) {
      reconstructedOutflowGatePartCount += 1;
    }
    const neutralReplay = replayVariant(
      beforeRow.evidence,
      syntheticVariant(synthetic, 0),
      afterRow.evidence,
      targetRow.evidence,
      targetRow.state.transportReferenceAt,
    );
    const leftReplay = replayVariant(
      beforeRow.evidence,
      syntheticVariant(synthetic, beforeAnchor.strength),
      afterRow.evidence,
      targetRow.evidence,
      targetRow.state.transportReferenceAt,
    );
    const rightReplay = replayVariant(
      beforeRow.evidence,
      syntheticVariant(synthetic, afterAnchor.strength),
      afterRow.evidence,
      targetRow.evidence,
      targetRow.state.transportReferenceAt,
    );
    if (!neutralReplay.result || !leftReplay.result || !rightReplay.result) {
      throw new Error('ONE_TIME_GAP_SENSITIVITY_REPLAY_FAILED');
    }
    if (!sameNumber(rebuilt.result.transportPotential, neutralReplay.result.transportPotential)) {
      sensitivity.linearVsNeutralPotentialChangedPartCount += 1;
    }
    if (!sameNumber(rebuilt.result.transportPotential, leftReplay.result.transportPotential)) {
      sensitivity.linearVsLeftHoldPotentialChangedPartCount += 1;
    }
    if (!sameNumber(rebuilt.result.transportPotential, rightReplay.result.transportPotential)) {
      sensitivity.linearVsRightHoldPotentialChangedPartCount += 1;
    }
    if (neutralReplay.result.actualOutboundTransport === true) sensitivity.neutralOutflowGatePartCount += 1;
    if (leftReplay.result.actualOutboundTransport === true) sensitivity.leftHoldOutflowGatePartCount += 1;
    if (rightReplay.result.actualOutboundTransport === true) sensitivity.rightHoldOutflowGatePartCount += 1;
    minimumBeforeAnchor = Math.min(minimumBeforeAnchor, Date.parse(beforeAnchor.time));
    maximumAfterAnchor = Math.max(maximumAfterAnchor, Date.parse(afterAnchor.time));
    for (const item of synthetic) {
      syntheticTimeCounts.set(item.time, (syntheticTimeCounts.get(item.time) || 0) + 1);
    }
    syntheticSampleCount += synthetic.length;
    planned.push({
      partId: beforeRow.partId,
      candidate: targetRow.part.candidateG,
      previousState: structuredClone(targetRow.state),
      nextState: {
        ...targetRow.state,
        schemaVersion: CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION,
        transportPotential: rebuilt.result.transportPotential,
        outboundEpisodeEffectiveHours: rebuilt.result.outboundEpisodeEffectiveHours,
        transportMemoryReady: rebuilt.memoryReady,
        transportMemoryStatus: rebuilt.status,
        transportMemoryWindowHours: rebuilt.windowHours,
        transportMemoryCoverageHours: rebuilt.coverageHours,
        transportEvidence: rebuilt.evidence.map(item => ({ ...item })),
      },
      beforeAnchor,
      afterAnchor,
      cadenceHours,
      synthetic,
    });
  }

  if (cadenceCounts['1h'] !== policy.expectedCadencePartCounts['1h']
    || cadenceCounts['3h'] !== policy.expectedCadencePartCounts['3h']) {
    throw new Error('ONE_TIME_GAP_NATIVE_CADENCE_POPULATION_MISMATCH');
  }
  const descriptor = {
    schemaVersion: 1,
    status: 'SEALED_ONE_TIME_GAP_RECONSTRUCTION_INSPECTION',
    incidentId: policy.incidentId,
    decisionId: policy.decisionId,
    method: RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
    evidenceClassification: RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
    expectedPartCount: policy.expectedPartCount,
    affectedPartCount: planned.length,
    syntheticSampleCount,
    cadencePartCounts: cadenceCounts,
    bracketInterval: {
      earliestBeforeAnchor: new Date(minimumBeforeAnchor).toISOString(),
      latestAfterAnchor: new Date(maximumAfterAnchor).toISOString(),
    },
    syntheticTimeCounts: Object.fromEntries([...syntheticTimeCounts.entries()].sort()),
    sources: policy.sources.map((source, index) => ({
      role: source.role,
      runId: source.runId,
      runNumber: source.runNumber,
      artifactId: source.artifactId,
      artifactName: source.artifactName,
      headSha: source.headSha,
      datasetId: index === 0 ? before.datasetId : after.datasetId,
      productionReferenceAt: iso(index === 0 ? before.productionReferenceAt : after.productionReferenceAt),
      stateSha256: sha256(stateMatrix(index === 0 ? beforeRows : afterRows)),
      artifactPayloadSha256: sourceBindings[index].artifactPayloadSha256,
    })),
    target: {
      datasetId: target.datasetId,
      productionReferenceAt: iso(target.productionReferenceAt),
      stateSha256: sha256(stateMatrix(targetRows)),
    },
    integrity: {
      partContextSha256: identityHashes[0],
      beforeEndpointMatrixSha256: sha256(planned.map(item => [
        item.partId, item.cadenceHours, item.beforeAnchor.time, sha256(item.beforeAnchor),
      ])),
      afterEndpointMatrixSha256: sha256(planned.map(item => [
        item.partId, item.cadenceHours, item.afterAnchor.time, sha256(item.afterAnchor),
      ])),
      syntheticMatrixSha256: sha256(planned.map(item => [
        item.partId, item.synthetic.map(evidence => sha256(evidence)),
      ])),
      plannedStateSha256: sha256(planned.map(item => [item.partId, item.nextState])),
    },
    aggregateSensitivity: {
      signReversalPartCount,
      reconstructedOutflowGatePartCount,
      ...sensitivity,
      hardObservedOuttransportSuppressed: true,
    },
    privacy: {
      compactDerivedStrengthOnly: true,
      rawVectorsIncluded: false,
      coordinatesIncluded: false,
      weatherIncluded: false,
      sourceStrengthsIncluded: false,
      syntheticStrengthsIncluded: false,
      scoresIncluded: false,
    },
  };
  return { descriptor, planned, target };
}

function sealedDescriptor(descriptor) {
  return { ...descriptor, descriptorSha256: sha256(descriptor) };
}

function validateDescriptorSemantics(descriptor) {
  const digestPattern = /^[a-f0-9]{64}$/;
  const expectedDescriptorKeys = [
    'affectedPartCount',
    'aggregateSensitivity',
    'bracketInterval',
    'cadencePartCounts',
    'decisionId',
    'evidenceClassification',
    'expectedPartCount',
    'incidentId',
    'integrity',
    'method',
    'privacy',
    'schemaVersion',
    'sources',
    'status',
    'syntheticSampleCount',
    'syntheticTimeCounts',
    'target',
  ];
  const expectedSourceKeys = [
    'artifactId',
    'artifactName',
    'artifactPayloadSha256',
    'datasetId',
    'headSha',
    'productionReferenceAt',
    'role',
    'runId',
    'runNumber',
    'stateSha256',
  ];
  const sourceBindingsValid = Array.isArray(descriptor?.sources)
    && descriptor.sources.length === EXPECTED_SOURCE_BINDINGS.length
    && descriptor.sources.every((source, index) => {
      const expected = EXPECTED_SOURCE_BINDINGS[index];
      return Object.keys(source || {}).sort().join(',') === expectedSourceKeys.join(',')
        && Object.entries(expected).every(([key, value]) => source?.[key] === value)
        && typeof source?.datasetId === 'string' && source.datasetId.trim()
        && finiteTime(source?.productionReferenceAt)
        && digestPattern.test(String(source?.stateSha256 || ''))
        && digestPattern.test(String(source?.artifactPayloadSha256 || ''));
    });
  const targetValid = Object.keys(descriptor?.target || {}).sort().join(',')
      === 'datasetId,productionReferenceAt,stateSha256'
    && typeof descriptor?.target?.datasetId === 'string'
    && descriptor.target.datasetId.trim()
    && finiteTime(descriptor.target.productionReferenceAt)
    && digestPattern.test(String(descriptor.target.stateSha256 || ''));
  const integrityKeys = [
    'afterEndpointMatrixSha256',
    'beforeEndpointMatrixSha256',
    'partContextSha256',
    'plannedStateSha256',
    'syntheticMatrixSha256',
  ];
  const integrityValid = Object.keys(descriptor?.integrity || {}).sort().join(',') === integrityKeys.join(',')
    && integrityKeys.every(key => digestPattern.test(String(descriptor.integrity[key] || '')));
  const sensitivityCountKeys = [
    'leftHoldOutflowGatePartCount',
    'linearVsLeftHoldPotentialChangedPartCount',
    'linearVsNeutralPotentialChangedPartCount',
    'linearVsRightHoldPotentialChangedPartCount',
    'neutralOutflowGatePartCount',
    'reconstructedOutflowGatePartCount',
    'rightHoldOutflowGatePartCount',
    'signReversalPartCount',
  ];
  const sensitivityValid = descriptor?.aggregateSensitivity?.hardObservedOuttransportSuppressed === true
    && Object.keys(descriptor?.aggregateSensitivity || {}).sort().join(',')
      === [...sensitivityCountKeys, 'hardObservedOuttransportSuppressed'].sort().join(',')
    && sensitivityCountKeys.every(key => Number.isSafeInteger(descriptor?.aggregateSensitivity?.[key])
      && descriptor.aggregateSensitivity[key] >= 0
      && descriptor.aggregateSensitivity[key] <= descriptor.affectedPartCount);
  const expectedPrivacy = {
    compactDerivedStrengthOnly: true,
    rawVectorsIncluded: false,
    coordinatesIncluded: false,
    weatherIncluded: false,
    sourceStrengthsIncluded: false,
    syntheticStrengthsIncluded: false,
    scoresIncluded: false,
  };
  const syntheticTimeEntries = Object.entries(descriptor?.syntheticTimeCounts || {});
  const syntheticTimesValid = syntheticTimeEntries.length > 0
    && syntheticTimeEntries.every(([time, count]) => finiteTime(time)
      && Date.parse(time) > Date.parse(descriptor?.bracketInterval?.earliestBeforeAnchor || '')
      && Date.parse(time) < Date.parse(descriptor?.bracketInterval?.latestAfterAnchor || '')
      && Number.isSafeInteger(count) && count > 0 && count <= descriptor.affectedPartCount)
    && syntheticTimeEntries.reduce((sum, [, count]) => sum + count, 0) === descriptor?.syntheticSampleCount;
  if (Object.keys(descriptor || {}).sort().join(',') !== expectedDescriptorKeys.join(',')
    || Object.keys(descriptor?.bracketInterval || {}).sort().join(',')
      !== 'earliestBeforeAnchor,latestAfterAnchor'
    || descriptor?.schemaVersion !== 1
    || descriptor?.status !== 'SEALED_ONE_TIME_GAP_RECONSTRUCTION_INSPECTION'
    || descriptor?.incidentId !== ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    || descriptor?.decisionId !== ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID
    || descriptor?.method !== RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD
    || descriptor?.evidenceClassification !== RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION
    || descriptor?.expectedPartCount !== 673
    || descriptor?.affectedPartCount !== 673
    || !Number.isSafeInteger(descriptor?.syntheticSampleCount)
    || descriptor.syntheticSampleCount < descriptor.affectedPartCount
    || descriptor.syntheticSampleCount > descriptor.affectedPartCount * 5
    || canonicalJson(descriptor?.cadencePartCounts) !== canonicalJson({ '1h': 665, '3h': 8 })
    || !finiteTime(descriptor?.bracketInterval?.earliestBeforeAnchor)
    || !finiteTime(descriptor?.bracketInterval?.latestAfterAnchor)
    || Date.parse(descriptor.bracketInterval.earliestBeforeAnchor)
      >= Date.parse(descriptor.bracketInterval.latestAfterAnchor)
    || !sourceBindingsValid || !targetValid || !integrityValid || !sensitivityValid
    || !syntheticTimesValid
    || canonicalJson(descriptor?.privacy) !== canonicalJson(expectedPrivacy)) {
    throw new Error('ONE_TIME_GAP_DESCRIPTOR_SEMANTICS_INVALID');
  }
  return descriptor;
}

function validateSealedDescriptor(value, expectedDigest) {
  if (!value || value.descriptorSha256 !== expectedDigest
    || !/^[a-f0-9]{64}$/.test(String(expectedDigest || ''))) {
    throw new Error('ONE_TIME_GAP_DESCRIPTOR_DIGEST_INVALID');
  }
  const { descriptorSha256, ...descriptor } = value;
  if (sha256(descriptor) !== descriptorSha256
    || descriptor.incidentId !== ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    || descriptor.status !== 'SEALED_ONE_TIME_GAP_RECONSTRUCTION_INSPECTION') {
    throw new Error('ONE_TIME_GAP_DESCRIPTOR_INTEGRITY_INVALID');
  }
  return validateDescriptorSemantics(descriptor);
}

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, file);
}

export async function inspectOneTimeGap({
  beforePath, afterPath, targetPath, policyPath = POLICY_PATH, descriptorPath,
  beforeAttestationPath, afterAttestationPath, beforeBundlePath, afterBundlePath,
}) {
  const policy = validatePolicy(await readJson(policyPath));
  const [before, after, target, sourceBindings] = await Promise.all([
    readJson(beforePath), readJson(afterPath), readJson(targetPath),
    verifySourceBundles(policy, { beforeAttestationPath, afterAttestationPath, beforeBundlePath, afterBundlePath }),
  ]);
  const { descriptor } = buildPlan({ before, after, target, policy, sourceBindings });
  const sealed = sealedDescriptor(descriptor);
  await atomicWrite(descriptorPath, sealed);
  return {
    mode: 'inspect',
    incidentId: policy.incidentId,
    descriptorSha256: sealed.descriptorSha256,
    affectedPartCount: descriptor.affectedPartCount,
    syntheticSampleCount: descriptor.syntheticSampleCount,
    earliestBeforeAnchor: descriptor.bracketInterval.earliestBeforeAnchor,
    latestAfterAnchor: descriptor.bracketInterval.latestAfterAnchor,
    cadencePartCounts: descriptor.cadencePartCounts,
    aggregateSensitivity: descriptor.aggregateSensitivity,
  };
}

export async function applyOneTimeGap({
  beforePath, afterPath, targetPath, policyPath = POLICY_PATH, descriptorPath,
  descriptorSha256, rollbackPath,
  beforeAttestationPath, afterAttestationPath, beforeBundlePath, afterBundlePath,
}) {
  const policy = validatePolicy(await readJson(policyPath));
  const [before, after, target, sealed, sourceBindings] = await Promise.all([
    readJson(beforePath), readJson(afterPath), readJson(targetPath), readJson(descriptorPath),
    verifySourceBundles(policy, { beforeAttestationPath, afterAttestationPath, beforeBundlePath, afterBundlePath }),
  ]);
  const expectedDescriptor = validateSealedDescriptor(sealed, descriptorSha256);
  const { descriptor, planned } = buildPlan({ before, after, target, policy, sourceBindings });
  if (canonicalJson(descriptor) !== canonicalJson(expectedDescriptor)) {
    throw new Error('ONE_TIME_GAP_DESCRIPTOR_OR_TARGET_CAS_MISMATCH');
  }
  const rollback = {
    schemaVersion: 1,
    status: 'ONE_TIME_GAP_PRE_CHANGE_COMPACT_ROLLBACK',
    incidentId: policy.incidentId,
    descriptorSha256,
    sourceDatasetId: target.datasetId,
    sourceDocumentSha256: sha256(target),
    sourceProductionReferenceAt: iso(target.productionReferenceAt),
    sourceEvidenceTrust: target?.coastalParts?.evidenceTrust ?? null,
    stateSha256: sha256(planned.map(item => [item.partId, item.previousState])),
    postChangeStateSha256: sha256(planned.map(item => [item.partId, item.nextState])),
    states: Object.fromEntries(planned.map(item => [item.partId, item.previousState])),
    privacy: {
      compactDerivedStateOnly: true,
      rawVectorsIncluded: false,
      coordinatesIncluded: false,
      weatherIncluded: false,
      scoresIncluded: false,
      privateDataIncluded: false,
    },
  };
  for (const item of planned) item.candidate.currentState = item.nextState;
  const lastSyntheticAt = planned.flatMap(item => item.synthetic.map(evidence => evidence.time)).sort().at(-1);
  const activeUntil = new Date(Date.parse(lastSyntheticAt)
    + (CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours * HOUR_MS)).toISOString();
  const trustSummary = sanitizedTrustSummary({
    descriptorSha256,
    affectedPartCount: planned.length,
    syntheticSampleCount: descriptor.syntheticSampleCount,
    activeUntil,
  });
  target.candidateGOneTimeReconstruction = trustSummary;
  target.coastalParts.evidenceTrust = trustSummary;
  rollback.sourceTargetIdentitySha256 = sha256({
    datasetId: rollback.sourceDatasetId,
    productionReferenceAt: rollback.sourceProductionReferenceAt,
    stateSha256: rollback.stateSha256,
    evidenceTrust: rollback.sourceEvidenceTrust,
    incidentMarker: null,
  });
  rollback.postChangeTargetIdentitySha256 = sha256(compactTargetIdentity(target));
  rollback.postChangeDocumentSha256 = sha256(target);
  rollback.payloadSha256 = sha256(rollback);
  await atomicWrite(rollbackPath, rollback);
  await atomicWrite(targetPath, target);
  return {
    mode: 'apply',
    incidentId: policy.incidentId,
    descriptorSha256,
    affectedPartCount: planned.length,
    syntheticSampleCount: descriptor.syntheticSampleCount,
    rollbackStateSha256: rollback.stateSha256,
  };
}

export async function rollbackOneTimeGap({ targetPath, descriptorPath, descriptorSha256, rollbackPath }) {
  const [target, sealed, rollback] = await Promise.all([
    readJson(targetPath), readJson(descriptorPath), readJson(rollbackPath),
  ]);
  const descriptor = validateSealedDescriptor(sealed, descriptorSha256);
  validateCompactRollback(rollback, descriptorSha256, descriptor);
  if (target?.candidateGOneTimeReconstruction?.incidentId !== ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    || target.candidateGOneTimeReconstruction.descriptorSha256 !== descriptorSha256
    || target?.datasetId !== rollback?.sourceDatasetId
    || iso(target?.productionReferenceAt) !== rollback?.sourceProductionReferenceAt
    || sha256(target) !== rollback?.postChangeDocumentSha256
    || sha256(compactTargetIdentity(target)) !== rollback?.postChangeTargetIdentitySha256) {
    throw new Error('ONE_TIME_GAP_ROLLBACK_BINDING_INVALID');
  }
  const parts = target?.coastalParts?.parts || {};
  if (Object.keys(parts).length !== 673) throw new Error('ONE_TIME_GAP_ROLLBACK_PART_COUNT');
  const currentRows = Object.keys(parts).sort().map(partId => [partId, parts[partId]?.candidateG?.currentState]);
  if (sha256(currentRows) !== rollback.postChangeStateSha256) {
    throw new Error('ONE_TIME_GAP_IMMEDIATE_ROLLBACK_CAS_MISMATCH');
  }
  let affectedPartCount = 0;
  let removedSampleCount = 0;
  for (const partId of Object.keys(parts).sort()) {
    const state = parts[partId]?.candidateG?.currentState;
    const baseline = rollback.states?.[partId];
    if (!state || !baseline || state.stateKey !== baseline.stateKey || !exactContext(state)) {
      throw new Error('ONE_TIME_GAP_ROLLBACK_CONTEXT_MISMATCH');
    }
    const synthetic = (state.transportEvidence || []).filter(isReconstructedTransportEvidence);
    if (!synthetic.length) throw new Error('ONE_TIME_GAP_ROLLBACK_LINEAGE_MISSING');
    if (baseline.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
      || (baseline.transportEvidence || []).some(item => item?.incidentId !== undefined || item?.provenance !== undefined)
      || baseline.transportMemoryReady === true
      || baseline.transportMemoryStatus !== 'WINDOW_INCOMPLETE') {
      throw new Error('ONE_TIME_GAP_ROLLBACK_BASELINE_NOT_HONEST_WINDOW_INCOMPLETE');
    }
    // The exact compact pre-change state is restored first. A following fresh
    // production may then advance only from that measured-only schema-2.0.0
    // baseline; this is the required safe order before any code rollback.
    parts[partId].candidateG.currentState = structuredClone(baseline);
    affectedPartCount += 1;
    removedSampleCount += synthetic.length;
  }
  delete target.candidateGOneTimeReconstruction;
  if (rollback.sourceEvidenceTrust === null) delete target.coastalParts.evidenceTrust;
  else target.coastalParts.evidenceTrust = structuredClone(rollback.sourceEvidenceTrust);
  const restoredRows = Object.keys(parts).sort().map(partId => [partId, parts[partId]?.candidateG?.currentState]);
  if (sha256(restoredRows) !== rollback.stateSha256) {
    throw new Error('ONE_TIME_GAP_IMMEDIATE_ROLLBACK_OUTPUT_MISMATCH');
  }
  if (sha256(compactTargetIdentity(target)) !== rollback.sourceTargetIdentitySha256) {
    throw new Error('ONE_TIME_GAP_IMMEDIATE_ROLLBACK_DOCUMENT_OUTPUT_MISMATCH');
  }
  if (sha256(target) !== rollback.sourceDocumentSha256) {
    throw new Error('ONE_TIME_GAP_IMMEDIATE_ROLLBACK_FULL_DOCUMENT_OUTPUT_MISMATCH');
  }
  await atomicWrite(targetPath, target);
  return { mode: 'rollback', incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID, affectedPartCount, removedSampleCount };
}

export async function rollbackOrCleanupOneTimeGap({
  targetPath, descriptorPath, descriptorSha256, rollbackPath, policyPath = POLICY_PATH,
}) {
  const [target, sealed, rollback] = await Promise.all([
    readJson(targetPath), readJson(descriptorPath), readJson(rollbackPath),
  ]);
  const descriptor = validateSealedDescriptor(sealed, descriptorSha256);
  validateCompactRollback(rollback, descriptorSha256, descriptor);
  const currentRows = compactTargetStateRows(target);
  const exactPostApplyIdentity = target?.candidateGOneTimeReconstruction?.incidentId
      === ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    && target?.candidateGOneTimeReconstruction?.descriptorSha256 === descriptorSha256
    && target?.datasetId === rollback.sourceDatasetId
    && finiteTime(target?.productionReferenceAt)
    && iso(target.productionReferenceAt) === rollback.sourceProductionReferenceAt
    && sha256(currentRows) === rollback.postChangeStateSha256
    && sha256(target) === rollback.postChangeDocumentSha256
    && sha256(compactTargetIdentity(target)) === rollback.postChangeTargetIdentitySha256;

  if (exactPostApplyIdentity) {
    const result = await rollbackOneTimeGap({
      targetPath, descriptorPath, descriptorSha256, rollbackPath,
    });
    return {
      ...result,
      mode: 'rollback-dispatch',
      strategy: 'EXACT_IDENTICAL_POST_APPLY_TARGET',
      newerMeasuredEvidencePreserved: true,
      pendingFreshProductionRebuild: true,
    };
  }

  const result = await cleanupOneTimeGap({
    targetPath, descriptorPath, descriptorSha256, policyPath,
  });
  return {
    ...result,
    mode: 'rollback-dispatch',
    strategy: 'CAUSAL_INCIDENT_CLEANUP',
  };
}

export async function cleanupOneTimeGap({
  targetPath, descriptorPath, descriptorSha256, policyPath = POLICY_PATH,
}) {
  const [target, sealed, policyValue] = await Promise.all([
    readJson(targetPath), readJson(descriptorPath), readJson(policyPath),
  ]);
  const policy = validatePolicy(policyValue);
  const descriptor = validateSealedDescriptor(sealed, descriptorSha256);
  const rows = stateRows(target, policy, 'CLEANUP_TARGET', { allowReconstructed: true });
  if (Date.parse(target.productionReferenceAt) < Date.parse(descriptor.target.productionReferenceAt)) {
    throw new Error('ONE_TIME_GAP_CLEANUP_TARGET_PRECEDES_INSPECTION');
  }
  const normalizedContextSha256 = sha256(rows.map(({ partId, state }) => ({
    partId,
    stateKey: state.stateKey,
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: state.modelId,
    variantId: state.variantId,
    profileId: state.profileId,
  })));
  if (normalizedContextSha256 !== descriptor.integrity.partContextSha256) {
    throw new Error('ONE_TIME_GAP_CLEANUP_PART_CONTEXT_MISMATCH');
  }
  const affected = rows.filter(row => row.evidence.some(isReconstructedTransportEvidence));
  if (!affected.length) throw new Error('ONE_TIME_GAP_CLEANUP_LINEAGE_MISSING');
  const syntheticSampleCount = affected.reduce((sum, row) => sum
    + row.evidence.filter(isReconstructedTransportEvidence).length, 0);
  const latestSyntheticAt = affected.flatMap(row => row.evidence
    .filter(isReconstructedTransportEvidence).map(item => item.time)).sort().at(-1);
  const retainedSyntheticTimeCounts = new Map();
  for (const item of affected.flatMap(row => row.evidence.filter(isReconstructedTransportEvidence))) {
    retainedSyntheticTimeCounts.set(item.time, (retainedSyntheticTimeCounts.get(item.time) || 0) + 1);
  }
  if ([...retainedSyntheticTimeCounts.entries()].some(([time, count]) => {
    const inspectedCount = descriptor.syntheticTimeCounts?.[time];
    return !Number.isSafeInteger(inspectedCount) || count > inspectedCount;
  })) {
    throw new Error('ONE_TIME_GAP_CLEANUP_SYNTHETIC_LINEAGE_MISMATCH');
  }
  const expectedTrust = sanitizedTrustSummary({
    descriptorSha256,
    affectedPartCount: affected.length,
    syntheticSampleCount,
    activeUntil: new Date(Date.parse(latestSyntheticAt)
      + (CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours * HOUR_MS)).toISOString(),
  });
  if (canonicalJson(target?.coastalParts?.evidenceTrust) !== canonicalJson(expectedTrust)
    || canonicalJson(target?.candidateGOneTimeReconstruction) !== canonicalJson(expectedTrust)) {
    throw new Error('ONE_TIME_GAP_CLEANUP_TRUST_BINDING_INVALID');
  }

  const planned = [];
  let removedSampleCount = 0;
  for (const row of affected) {
    const synthetic = row.evidence.filter(isReconstructedTransportEvidence);
    const measured = row.evidence.filter(item => !isReconstructedTransportEvidence(item));
    if (measured.length < 2) throw new Error('ONE_TIME_GAP_CLEANUP_MEASURED_SUFFIX_MISSING');
    const latestSyntheticMs = Math.max(...synthetic.map(item => Date.parse(item.time)));
    const newerMeasuredSuffix = measured.filter(item => Date.parse(item.time) > latestSyntheticMs);
    if (!newerMeasuredSuffix.length) throw new Error('ONE_TIME_GAP_CLEANUP_NEWER_MEASURED_SUFFIX_MISSING');
    // The incident itself is a known causal break. Replay only the measured
    // right suffix so the cleanup cannot reinterpret a 1--6 hour hole as a
    // continuous measured series under the generic maximum-gap tolerance.
    const rebuilt = buildBoundedCurrentTransportMemory(newerMeasuredSuffix, {
      ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
      referenceTime: row.state.transportReferenceAt,
      restartAfterVerifiedTimeGap: true,
    });
    if (!rebuilt.result || rebuilt.memoryReady !== false || rebuilt.status !== 'WINDOW_INCOMPLETE'
      || rebuilt.evidence.some(isReconstructedTransportEvidence)
      || newerMeasuredSuffix.some(expected => !rebuilt.evidence.some(actual => actual.time === expected.time
        && sameNumber(actual.strength, expected.strength)))) {
      throw new Error('ONE_TIME_GAP_CLEANUP_MEASURED_SUFFIX_REPLAY_INVALID');
    }
    const nextState = {
      ...row.state,
      schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
      transportPotential: rebuilt.result.transportPotential,
      outboundEpisodeEffectiveHours: rebuilt.result.outboundEpisodeEffectiveHours,
      transportMemoryReady: rebuilt.memoryReady,
      transportMemoryStatus: rebuilt.status,
      transportMemoryWindowHours: rebuilt.windowHours,
      transportMemoryCoverageHours: rebuilt.coverageHours,
      transportEvidence: rebuilt.evidence.map(item => ({ ...item })),
    };
    if (nextState.mobilisationPotential !== row.state.mobilisationPotential) {
      throw new Error('ONE_TIME_GAP_CLEANUP_MOBILISATION_MUTATED');
    }
    planned.push({ part: row.part, candidate: row.part.candidateG, nextState });
    removedSampleCount += synthetic.length;
  }

  applyCleanupPendingRebuildInterlock(target, planned, descriptorSha256);
  target.coastalParts.evidenceTrust = verifiedOnlyTrustSummary();
  delete target.candidateGOneTimeReconstruction;
  if (compactTargetStateRows(target).some(([, state]) => (state?.transportEvidence || [])
    .some(isReconstructedTransportEvidence))) {
    throw new Error('ONE_TIME_GAP_CLEANUP_OUTPUT_STILL_RECONSTRUCTED');
  }
  await atomicWrite(targetPath, target);
  return {
    mode: 'cleanup',
    incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
    affectedPartCount: planned.length,
    removedSampleCount,
    newerMeasuredEvidencePreserved: true,
    preIncidentMeasuredEvidenceDiscardedAtCausalBoundary: true,
    mobilisationMutated: false,
    pendingFreshProductionRebuild: true,
    publicScoresFailClosed: true,
  };
}

async function writeSanitizedGithubOutput(file, result) {
  if (!file) return;
  if (result?.mode !== 'inspect'
    || !/^[a-f0-9]{64}$/.test(String(result.descriptorSha256 || ''))
    || !Number.isSafeInteger(result.affectedPartCount)
    || !Number.isSafeInteger(result.syntheticSampleCount)
    || !Number.isSafeInteger(result.cadencePartCounts?.['1h'])
    || !Number.isSafeInteger(result.cadencePartCounts?.['3h'])
    || result.affectedPartCount !== 673
    || result.syntheticSampleCount < result.affectedPartCount
    || result.syntheticSampleCount > result.affectedPartCount * 5
    || result.cadencePartCounts['1h'] !== 665
    || result.cadencePartCounts['3h'] !== 8) {
    throw new Error('ONE_TIME_GAP_GITHUB_OUTPUT_INVALID');
  }
  const output = {
    descriptor_sha256: result.descriptorSha256,
    affected_part_count: result.affectedPartCount,
    synthetic_sample_count: result.syntheticSampleCount,
    cadence_1h: result.cadencePartCounts['1h'],
    cadence_3h: result.cadencePartCounts['3h'],
    sign_reversal_part_count: result.aggregateSensitivity?.signReversalPartCount,
    reconstructed_outflow_gate_part_count: result.aggregateSensitivity?.reconstructedOutflowGatePartCount,
    neutral_outflow_gate_part_count: result.aggregateSensitivity?.neutralOutflowGatePartCount,
    left_hold_outflow_gate_part_count: result.aggregateSensitivity?.leftHoldOutflowGatePartCount,
    right_hold_outflow_gate_part_count: result.aggregateSensitivity?.rightHoldOutflowGatePartCount,
  };
  if (Object.values(output).slice(5).some(value => !Number.isSafeInteger(value)
    || value < 0 || value > result.affectedPartCount)) {
    throw new Error('ONE_TIME_GAP_GITHUB_SENSITIVITY_OUTPUT_INVALID');
  }
  await fs.appendFile(file, `${Object.entries(output).map(([key, value]) => `${key}=${value}`).join('\n')}\n`);
}

function parseArgs(argv) {
  const result = { mode: null, policyPath: POLICY_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (['--inspect', '--apply', '--rollback', '--rollback-dispatch', '--cleanup'].includes(value)) {
      if (result.mode) throw new Error('ONE_TIME_GAP_MULTIPLE_MODES');
      result.mode = value.slice(2);
    }
    else if (value === '--before') result.beforePath = argv[++index];
    else if (value === '--after') result.afterPath = argv[++index];
    else if (value === '--target') result.targetPath = argv[++index];
    else if (value === '--policy') result.policyPath = argv[++index];
    else if (value === '--descriptor') result.descriptorPath = argv[++index];
    else if (value === '--descriptor-sha256') result.descriptorSha256 = argv[++index];
    else if (value === '--rollback-checkpoint') result.rollbackPath = argv[++index];
    else if (value === '--before-attestation') result.beforeAttestationPath = argv[++index];
    else if (value === '--after-attestation') result.afterAttestationPath = argv[++index];
    else if (value === '--before-bundle') result.beforeBundlePath = argv[++index];
    else if (value === '--after-bundle') result.afterBundlePath = argv[++index];
    else if (value === '--github-output') result.githubOutputPath = argv[++index];
    else throw new Error(`Ukendt argument: ${value}`);
  }
  if (!result.mode || !result.targetPath || !result.descriptorPath) throw new Error('ONE_TIME_GAP_ARGUMENTS_MISSING');
  if (['inspect', 'apply'].includes(result.mode) && (!result.beforePath || !result.afterPath)) throw new Error('ONE_TIME_GAP_SOURCES_MISSING');
  if (['inspect', 'apply'].includes(result.mode) && (!result.beforeAttestationPath || !result.afterAttestationPath
    || !result.beforeBundlePath || !result.afterBundlePath)) throw new Error('ONE_TIME_GAP_SOURCE_BINDINGS_MISSING');
  if (result.mode !== 'inspect' && !result.descriptorSha256) throw new Error('ONE_TIME_GAP_DESCRIPTOR_SEAL_MISSING');
  if (['apply', 'rollback', 'rollback-dispatch'].includes(result.mode) && !result.rollbackPath) throw new Error('ONE_TIME_GAP_ROLLBACK_PATH_MISSING');
  if (result.githubOutputPath && result.mode !== 'inspect') throw new Error('ONE_TIME_GAP_GITHUB_OUTPUT_INSPECT_ONLY');
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.mode === 'inspect'
    ? await inspectOneTimeGap(options)
    : options.mode === 'apply'
      ? await applyOneTimeGap(options)
      : options.mode === 'rollback'
        ? await rollbackOneTimeGap(options)
        : options.mode === 'rollback-dispatch'
          ? await rollbackOrCleanupOneTimeGap(options)
          : await cleanupOneTimeGap(options);
  await writeSanitizedGithubOutput(options.githubOutputPath, result);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
