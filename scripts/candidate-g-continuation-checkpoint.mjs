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

export const CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY = Object.freeze({
  schemaVersion: 2,
  acceptedLegacySchemaVersions: Object.freeze([1]),
  expectedPartCount: 673,
  maximumCheckpointAgeHours: 72,
  allowedMemoryStatuses: Object.freeze(['READY', 'WINDOW_INCOMPLETE']),
});

const finiteTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sameModelContext = (left, right) => left?.schemaVersion === right?.schemaVersion
  && left?.modelId === right?.modelId
  && left?.variantId === right?.variantId
  && left?.profileId === right?.profileId;
const candidateGContext = Object.freeze({
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
});
const reconstructedCandidateGContext = Object.freeze({
  ...candidateGContext,
  schemaVersion: CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION,
});
const isCandidateGContext = value => sameModelContext(value, candidateGContext)
  || sameModelContext(value, reconstructedCandidateGContext);
const interruptedNextGenerationContext = Object.freeze({
  schemaVersion: '3.0.0',
  modelId: 'RRS-COASTAL-CAUSAL-CHAIN-1',
  variantId: 'COASTAL-SUPPLY-MOBILISATION-DELIVERY-1',
  profileId: 'coastal-supply-smooth-in6.578813-out8.312951-window48-boundary0-wave-build4-decay48',
});

function reconstructCandidateGTransport(state) {
  const rebuilt = buildBoundedCurrentTransportMemory(state.transportEvidence, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: state.transportReferenceAt,
    restartAfterVerifiedTimeGap: true,
  });
  const replayed = rebuilt.result;
  const metadataMatches = replayed
    && rebuilt.memoryReady === state.transportMemoryReady
    && rebuilt.status === state.transportMemoryStatus
    && Number(rebuilt.windowHours) === Number(state.transportMemoryWindowHours)
    && Math.abs(Number(rebuilt.coverageHours) - Number(state.transportMemoryCoverageHours)) < 1e-9
    && JSON.stringify(rebuilt.evidence) === JSON.stringify(state.transportEvidence);
  if (!metadataMatches) return null;
  return {
    ...state,
    ...candidateGContext,
    transportPotential: Number(replayed.transportPotential),
    outboundEpisodeEffectiveHours: Number(replayed.outboundEpisodeEffectiveHours),
    transportMemoryReady: rebuilt.memoryReady,
    transportMemoryStatus: rebuilt.status,
    transportMemoryWindowHours: Number(rebuilt.windowHours),
    transportMemoryCoverageHours: Number(rebuilt.coverageHours),
    transportEvidence: rebuilt.evidence.map(item => ({ ...item })),
  };
}

function stateForCandidateGTarget(state, targetState) {
  if (!targetState || state.stateKey !== targetState.stateKey) return null;
  if (!isCandidateGContext(targetState)) return null;
  if (isCandidateGContext(state)) return { state, adaptation: null };
  if (!sameModelContext(state, interruptedNextGenerationContext)) return null;
  const reconstructed = reconstructCandidateGTransport(state);
  if (!reconstructed) return null;
  return {
    state: reconstructed,
    adaptation: 'INTERRUPTED_NEXT_GENERATION_TO_CANDIDATE_G',
  };
}

function compactState(state, partId) {
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
    || !finiteTime(state.time) || !finiteTime(state.transportReferenceAt)
    || Date.parse(state.transportReferenceAt) > Date.parse(state.time)
    || (Date.parse(state.time) - Date.parse(state.transportReferenceAt)) / 3_600_000
      > CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.maximumGapHours
    || !state.schemaVersion || !state.modelId || !state.variantId || !state.profileId || !state.stateKey
    || !Number.isFinite(state.transportPotential) || state.transportPotential < 0 || state.transportPotential > 100
    || !Number.isFinite(state.outboundEpisodeEffectiveHours) || state.outboundEpisodeEffectiveHours < 0
    || typeof state.transportMemoryReady !== 'boolean'
    || !CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.allowedMemoryStatuses.includes(state.transportMemoryStatus)
    || Number(state.transportMemoryWindowHours) !== 48
    || !Number.isFinite(state.transportMemoryCoverageHours)
    || state.transportMemoryCoverageHours < 0 || state.transportMemoryCoverageHours > 48
    || !Array.isArray(state.transportEvidence) || state.transportEvidence.length < 1
    || state.transportEvidence.length > 49
    || !Number.isFinite(state.mobilisationPotential) || state.mobilisationPotential < 0 || state.mobilisationPotential > 100
    || (state.transportMemoryStatus === 'READY') !== state.transportMemoryReady) {
    throw new Error(`Ugyldig kompakt Candidate G-state for kystdel ${partId}`);
  }
  let previousEvidenceMs = Number.NEGATIVE_INFINITY;
  const referenceMs = Date.parse(state.transportReferenceAt);
  const transportEvidence = state.transportEvidence.map(evidence => {
    const reconstructed = isReconstructedTransportEvidence(evidence);
    const expectedKeys = reconstructed
      ? 'incidentId,provenance,strength,time'
      : 'strength,time';
    if (!finiteTime(evidence?.time) || !Number.isFinite(evidence?.strength)
      || evidence.strength < -1 || evidence.strength > 1
      || Object.keys(evidence || {}).sort().join(',') !== expectedKeys) {
      throw new Error(`Ugyldig kompakt transport-evidens for kystdel ${partId}`);
    }
    const evidenceMs = Date.parse(evidence.time);
    if (evidenceMs <= previousEvidenceMs || evidenceMs > referenceMs) {
      throw new Error(`Ikke-kausal transport-evidens for kystdel ${partId}`);
    }
    previousEvidenceMs = evidenceMs;
    return reconstructed
      ? {
        time: new Date(evidence.time).toISOString(),
        strength: Number(evidence.strength),
        provenance: RECONSTRUCTED_TRANSPORT_EVIDENCE_PROVENANCE,
        incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
      }
      : { time: new Date(evidence.time).toISOString(), strength: Number(evidence.strength) };
  });
  if (Date.parse(transportEvidence.at(-1)?.time ?? '') !== referenceMs) {
    throw new Error(`Kompakt transport-evidens slutter ikke ved referencen for kystdel ${partId}`);
  }
  const reconstructedEvidenceCount = transportEvidence.filter(isReconstructedTransportEvidence).length;
  const candidateContextMatches = isCandidateGContext(state)
    && ((state.schemaVersion === CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION)
      === (reconstructedEvidenceCount > 0));
  const interruptedAdapterContextMatches = sameModelContext(state, interruptedNextGenerationContext)
    && reconstructedEvidenceCount === 0;
  if (!candidateContextMatches && !interruptedAdapterContextMatches) {
    throw new Error(`Candidate G-state og rekonstruktionsproveniens matcher ikke for kystdel ${partId}`);
  }
  // Schema 2.1 carries owner-authorized reconstructed evidence and therefore
  // must be exactly replayable before it may enter either a checkpoint or a
  // restore. Measured-only schema 2.0 keeps DEC-0071/DEC-0072's historical
  // compatibility: older checkpoints may be mechanically valid even when
  // their cached summary fields predate today's stricter replay oracle.
  if (candidateContextMatches && reconstructedEvidenceCount > 0) {
    const replay = buildBoundedCurrentTransportMemory(transportEvidence, {
      ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
      referenceTime: new Date(state.transportReferenceAt).toISOString(),
      restartAfterVerifiedTimeGap: true,
    });
    const replayMatches = replay.result
      && Math.abs(Number(replay.result.transportPotential) - Number(state.transportPotential)) < 1e-9
      && Math.abs(Number(replay.result.outboundEpisodeEffectiveHours)
        - Number(state.outboundEpisodeEffectiveHours)) < 1e-9
      && replay.memoryReady === state.transportMemoryReady
      && replay.status === state.transportMemoryStatus
      && Number(replay.windowHours) === Number(state.transportMemoryWindowHours)
      && Math.abs(Number(replay.coverageHours) - Number(state.transportMemoryCoverageHours)) < 1e-9
      && JSON.stringify(replay.evidence) === JSON.stringify(transportEvidence);
    if (!replayMatches) {
      throw new Error(`Candidate G-checkpointets state kan ikke reproduceres for kystdel ${partId}`);
    }
  }
  return {
    schemaVersion: state.schemaVersion,
    modelId: state.modelId,
    variantId: state.variantId,
    profileId: state.profileId,
    stateKey: state.stateKey,
    time: new Date(state.time).toISOString(),
    transportReferenceAt: new Date(state.transportReferenceAt).toISOString(),
    transportPotential: Number(state.transportPotential),
    outboundEpisodeEffectiveHours: Number(state.outboundEpisodeEffectiveHours),
    transportMemoryReady: state.transportMemoryReady,
    transportMemoryStatus: state.transportMemoryStatus,
    transportMemoryWindowHours: Number(state.transportMemoryWindowHours),
    transportMemoryCoverageHours: Number(state.transportMemoryCoverageHours),
    transportEvidence,
    mobilisationPotential: Number(state.mobilisationPotential),
  };
}

function checkpointRows(document, expectedPartCount) {
  const parts = document?.coastalParts?.parts || {};
  const rows = Object.entries(parts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([partId, part]) => [partId, compactState(
      part?.candidateG?.currentState ?? part?.ravScore?.currentState,
      partId,
    )]);
  if (rows.length !== expectedPartCount) {
    throw new Error(`Candidate G-checkpointet kræver ${expectedPartCount} kystdele, men fandt ${rows.length}`);
  }
  return rows;
}

function compactCheckpointEvidenceTrust(document, rows, checkpointSchemaVersion) {
  const syntheticSampleCount = rows.reduce((sum, [, state]) => sum
    + state.transportEvidence.filter(isReconstructedTransportEvidence).length, 0);
  if (!syntheticSampleCount) {
    const verifiedOnly = {
      schemaVersion: 1,
      status: 'VERIFIED_ONLY',
      calibrationEligible: true,
      hardObservedOuttransportEligible: true,
      incidentId: null,
      affectedPartCount: 0,
      syntheticSampleCount: 0,
      activeUntil: null,
    };
    const source = document?.coastalParts?.evidenceTrust;
    if (checkpointSchemaVersion === CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.schemaVersion
      && source != null
      && (Object.keys(source).sort().join(',') !== Object.keys(verifiedOnly).sort().join(',')
        || Object.entries(verifiedOnly).some(([key, value]) => source[key] !== value))) {
      throw new Error('Measured-only Candidate G-checkpoint mangler exact verified-only trust-binding');
    }
    return verifiedOnly;
  }
  if (checkpointSchemaVersion !== 2) {
    throw new Error('Trust-bearing Candidate G-state kræver checkpoint schema 2');
  }
  const source = document?.coastalParts?.evidenceTrust;
  const expectedReconstructedTrustKeys = [
    'activeUntil',
    'affectedPartCount',
    'calibrationEligible',
    'decisionId',
    'descriptorSha256',
    'evidenceClassification',
    'hardObservedOuttransportEligible',
    'incidentId',
    'method',
    'schemaVersion',
    'status',
    'syntheticSampleCount',
  ];
  const affectedPartCount = rows.filter(([, state]) => state.transportEvidence
    .some(isReconstructedTransportEvidence)).length;
  const latestSyntheticMs = Math.max(...rows.flatMap(([, state]) => state.transportEvidence
    .filter(isReconstructedTransportEvidence)
    .map(evidence => Date.parse(evidence.time))));
  const expectedActiveUntil = new Date(latestSyntheticMs
    + (CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours * 3_600_000)).toISOString();
  if (Object.keys(source || {}).sort().join(',') !== expectedReconstructedTrustKeys.join(',')
    || source?.schemaVersion !== 1
    || source?.status !== RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS
    || source?.incidentId !== ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    || source?.decisionId !== ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID
    || source?.method !== RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD
    || source?.evidenceClassification !== RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION
    || source?.calibrationEligible !== false
    || source?.hardObservedOuttransportEligible !== false
    || !/^[a-f0-9]{64}$/.test(String(source?.descriptorSha256 || ''))
    || source?.affectedPartCount !== affectedPartCount
    || source?.syntheticSampleCount !== syntheticSampleCount
    || source?.activeUntil !== expectedActiveUntil) {
    throw new Error('Candidate G-checkpointets reconstruction trust-binding er ugyldig');
  }
  return {
    schemaVersion: 1,
    status: source.status,
    incidentId: source.incidentId,
    decisionId: ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
    method: RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
    evidenceClassification: RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
    calibrationEligible: false,
    hardObservedOuttransportEligible: false,
    descriptorSha256: source.descriptorSha256,
    affectedPartCount,
    syntheticSampleCount,
    activeUntil: expectedActiveUntil,
  };
}

async function atomicWrite(file, text) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temporary, text);
  await fs.rename(temporary, file);
}

export async function saveContinuationCheckpoint({
  sourcePath = 'data/live/conditions.json',
  checkpointPath = '.cache/candidate-g-continuation-checkpoint/checkpoint.json',
  expectedPartCount = CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
} = {}) {
  const source = await readJson(sourcePath);
  if (!source?.datasetId || !finiteTime(source.productionReferenceAt)) {
    throw new Error('Candidate G-checkpointets kilde mangler datasæt eller produktionstime');
  }
  const rows = checkpointRows(source, expectedPartCount);
  const sourceReferenceMs = Date.parse(source.productionReferenceAt);
  for (const [partId, state] of rows) {
    if (Date.parse(state.time) > sourceReferenceMs || Date.parse(state.transportReferenceAt) > sourceReferenceMs) {
      throw new Error(`Candidate G-checkpointet indeholder fremtidig state for kystdel ${partId}`);
    }
  }
  const evidenceTrust = compactCheckpointEvidenceTrust(
    source,
    rows,
    CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.schemaVersion,
  );
  const checkpoint = {
    schemaVersion: CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.schemaVersion,
    status: 'candidate-g-compact-continuation',
    datasetId: source.datasetId,
    productionReferenceAt: new Date(source.productionReferenceAt).toISOString(),
    partCount: rows.length,
    stateSha256: sha256(rows),
    payloadSha256: sha256({ rows, evidenceTrust }),
    evidenceTrust,
    states: Object.fromEntries(rows),
    privacy: {
      compactDerivedStateOnly: true,
      weatherIncluded: false,
      scoresIncluded: false,
      rawVectorsIncluded: false,
      coordinatesIncluded: false,
      privateDataIncluded: false,
    },
  };
  await atomicWrite(checkpointPath, `${JSON.stringify(checkpoint)}\n`);
  return { saved: true, datasetId: checkpoint.datasetId, productionReferenceAt: checkpoint.productionReferenceAt, partCount: rows.length };
}

function validateCheckpoint(checkpoint, expectedPartCount) {
  const acceptedSchema = checkpoint?.schemaVersion === CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.schemaVersion
    || CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.acceptedLegacySchemaVersions.includes(checkpoint?.schemaVersion);
  if (!acceptedSchema
    || !['candidate-g-compact-continuation', 'ravscore-compact-continuation'].includes(checkpoint?.status)
    || !checkpoint?.datasetId || !finiteTime(checkpoint.productionReferenceAt)
    || Number(checkpoint.partCount) !== expectedPartCount
    || checkpoint?.privacy?.compactDerivedStateOnly !== true
    || checkpoint?.privacy?.weatherIncluded !== false
    || checkpoint?.privacy?.scoresIncluded !== false
    || checkpoint?.privacy?.rawVectorsIncluded !== false
    || checkpoint?.privacy?.coordinatesIncluded !== false
    || checkpoint?.privacy?.privateDataIncluded !== false
    || (checkpoint?.schemaVersion === CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.schemaVersion
      && (!Object.hasOwn(checkpoint, 'evidenceTrust') || checkpoint.evidenceTrust == null))) {
    throw new Error('Candidate G-checkpointets descriptor er ugyldig');
  }
  const rows = Object.entries(checkpoint.states || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([partId, state]) => [partId, compactState(state, partId)]);
  if (rows.length !== expectedPartCount || sha256(rows) !== checkpoint.stateSha256) {
    throw new Error('Candidate G-checkpointets kompakte state matcher ikke integriteten');
  }
  if (checkpoint.schemaVersion === 1
    && rows.some(([, state]) => state.schemaVersion === CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION
      || state.transportEvidence.some(isReconstructedTransportEvidence))) {
    throw new Error('Legacy Candidate G-checkpoint må kun indeholde source-backed schema-2.0.0-state');
  }
  const evidenceTrust = compactCheckpointEvidenceTrust(
    { coastalParts: { evidenceTrust: checkpoint.evidenceTrust } },
    rows,
    checkpoint.schemaVersion,
  );
  if (checkpoint.schemaVersion === CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.schemaVersion
    && (!/^[a-f0-9]{64}$/.test(String(checkpoint.payloadSha256 || ''))
      || sha256({ rows, evidenceTrust }) !== checkpoint.payloadSha256)) {
    throw new Error('Candidate G-checkpointets state og trust-binding matcher ikke payload-integriteten');
  }
  const checkpointMs = Date.parse(checkpoint.productionReferenceAt);
  for (const [partId, state] of rows) {
    if (Date.parse(state.time) > checkpointMs || Date.parse(state.transportReferenceAt) > checkpointMs) {
      throw new Error(`Candidate G-checkpointet indeholder fremtidig state for kystdel ${partId}`);
    }
  }
  return { rows, evidenceTrust };
}

export async function restoreContinuationCheckpoint({
  targetPath = 'data/live/conditions.json',
  checkpointPath = '.cache/candidate-g-continuation-checkpoint/checkpoint.json',
  targetReference,
  expectedPartCount = CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
  maximumCheckpointAgeHours = CANDIDATE_G_CONTINUATION_CHECKPOINT_POLICY.maximumCheckpointAgeHours,
} = {}) {
  let checkpoint;
  try {
    checkpoint = await readJson(checkpointPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return { restored: false, reason: 'checkpoint-not-found' };
    throw error;
  }
  if (!finiteTime(targetReference)) throw new Error('Målreferencen til Candidate G-checkpointet er ugyldig');
  const target = await readJson(targetPath);
  if (!finiteTime(target.productionReferenceAt)) throw new Error('Det hydrerede mål mangler en gyldig produktionstime');
  const checkpointAt = Date.parse(checkpoint.productionReferenceAt || '');
  const deployedAt = Date.parse(target.productionReferenceAt);
  const requestedAt = Date.parse(targetReference);
  if (checkpointAt <= deployedAt) return { restored: false, reason: 'checkpoint-not-newer-than-deployed' };
  if (checkpointAt > requestedAt) return { restored: false, reason: 'checkpoint-is-after-target-reference' };
  if ((requestedAt - checkpointAt) / 3_600_000 > maximumCheckpointAgeHours) {
    return { restored: false, reason: 'checkpoint-too-old' };
  }
  const { rows, evidenceTrust } = validateCheckpoint(checkpoint, expectedPartCount);
  const targetParts = target?.coastalParts?.parts || {};
  if (Object.keys(targetParts).length !== expectedPartCount) throw new Error('Det hydrerede mål matcher ikke checkpointets delantal');
  const planned = [];
  let incompatiblePartCount = 0;
  let regressedPartCount = 0;
  const sourceKinds = new Set();
  for (const [partId, state] of rows) {
    const candidate = targetParts[partId]?.candidateG;
    const targetState = candidate?.currentState;
    sourceKinds.add(isCandidateGContext(state)
      ? 'candidate-g'
      : sameModelContext(state, interruptedNextGenerationContext)
        ? 'interrupted-next-generation'
        : 'unsupported');
    if (targetState && (Date.parse(state.time) < Date.parse(targetState.time)
      || Date.parse(state.transportReferenceAt) < Date.parse(targetState.transportReferenceAt))) {
      regressedPartCount += 1;
      continue;
    }
    const selected = stateForCandidateGTarget(state, targetState);
    if (!selected) {
      incompatiblePartCount += 1;
      continue;
    }
    planned.push({ candidate, ...selected });
  }
  if (sourceKinds.has('unsupported') || sourceKinds.size !== 1) {
    return {
      restored: false,
      reason: 'checkpoint-model-context-mixed',
      sourceDatasetId: checkpoint.datasetId,
      checkpointAt: checkpoint.productionReferenceAt,
      partCount: rows.length,
      sourceContextCount: sourceKinds.size,
      targetUnchanged: true,
    };
  }
  if (regressedPartCount > 0) {
    return {
      restored: false,
      reason: 'checkpoint-state-regression',
      sourceDatasetId: checkpoint.datasetId,
      checkpointAt: checkpoint.productionReferenceAt,
      partCount: rows.length,
      regressedPartCount,
      targetUnchanged: true,
    };
  }
  if (incompatiblePartCount > 0) {
    return {
      restored: false,
      reason: 'checkpoint-model-context-incompatible',
      sourceDatasetId: checkpoint.datasetId,
      checkpointAt: checkpoint.productionReferenceAt,
      partCount: rows.length,
      incompatiblePartCount,
      targetUnchanged: true,
    };
  }
  const adaptedPartCount = planned.filter(item => item.adaptation !== null).length;
  if (adaptedPartCount !== 0 && adaptedPartCount !== rows.length) {
    throw new Error('Candidate G-checkpointets modeltilpasning er ikke ens for alle kystdele');
  }
  for (const item of planned) {
    item.candidate.currentState = item.state;
  }
  target.coastalParts.evidenceTrust = evidenceTrust;
  await atomicWrite(targetPath, `${JSON.stringify(target, null, 2)}\n`);
  return {
    restored: true,
    sourceDatasetId: checkpoint.datasetId,
    checkpointAt: checkpoint.productionReferenceAt,
    partCount: rows.length,
    adaptedPartCount,
    adaptation: adaptedPartCount > 0 ? 'INTERRUPTED_NEXT_GENERATION_TO_CANDIDATE_G' : null,
    copiedWeather: false,
    copiedScores: false,
    copiedRawVectors: false,
    copiedCoordinates: false,
    copiedPrivateData: false,
  };
}

function parseArgs(argv) {
  const result = { mode: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--save' || value === '--restore') {
      const nextMode = value.slice(2);
      if (result.mode) throw new Error('Brug præcis én af --save eller --restore');
      result.mode = nextMode;
    }
    else if (value === '--source') result.sourcePath = argv[++index];
    else if (value === '--target') result.targetPath = argv[++index];
    else if (value === '--checkpoint') result.checkpointPath = argv[++index];
    else if (value === '--target-reference') result.targetReference = argv[++index];
    else throw new Error(`Ukendt argument: ${value}`);
  }
  if (!result.mode) throw new Error('Brug --save eller --restore');
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.mode === 'save'
    ? await saveContinuationCheckpoint(options)
    : await restoreContinuationCheckpoint(options);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
