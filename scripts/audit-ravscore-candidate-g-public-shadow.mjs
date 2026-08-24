#!/usr/bin/env node
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY,
} from '../js/core/ravscore-regime-memory.js';
import {
  CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA,
  CANDIDATE_G_WEIGHTS,
} from '../js/core/ravscore-candidate-g.js';
import {
  CANDIDATE_G_MEMORY_REFERENCE_SCOPE,
  CANDIDATE_G_RAVSCORE_PROFILE_ID,
  PUBLIC_RAVSCORE_PROFILE_SELECTION,
  resolvePublicRavScoreProfile,
} from '../js/core/ravscore-profile-switch.js';

const DEFAULT_INPUT = '.cache/active-public-condition-details.json';
const DEFAULT_OUTPUT = '.geometry-v2-work/candidate-g-public-shadow-audit.json';
const EXPECTED_ZONES = 210;
const EXPECTED_PARTS = 673;
const MODES = ['waders', 'beach'];
const NOT_READY_TRANSPORT_MEMORY_STATUSES = new Set([
  'LATEST_SAMPLE_MISSING',
  'WINDOW_HAS_MISSING_EVIDENCE',
  'WINDOW_INCOMPLETE',
  'WINDOW_HAS_TIME_GAP',
]);

const finite = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const clamp = value => Math.max(0, Math.min(100, Number(value)));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20);

function scoreBand(score) {
  if (score < 20) return '0-19';
  if (score < 40) return '20-39';
  if (score < 60) return '40-59';
  if (score < 80) return '60-79';
  return '80-100';
}

function summarize(values) {
  if (!values.length) return { count: 0, mean: null, minimum: null, maximum: null };
  return {
    count: values.length,
    mean: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    minimum: Math.min(...values),
    maximum: Math.max(...values),
  };
}

function reconstructCandidateScore(mode, candidateMode) {
  const contributions = candidateMode?.weightedContributions ?? {};
  const additive = Object.values(contributions).reduce((sum, value) => sum + Number(value), 0);
  const gated = Math.round(clamp(additive * Number(candidateMode.physicalGateFactor)));
  const limited = mode === 'waders' && finite(candidateMode.wadersHuntabilityMaximum)
    ? Math.min(gated, Number(candidateMode.wadersHuntabilityMaximum))
    : gated;
  return candidateMode.outflowExhaustionGateApplied === true ? 0 : limited;
}

export function auditCandidateGPublicShadow(document, {
  expectedZoneCount = EXPECTED_ZONES,
  expectedPartCount = EXPECTED_PARTS,
} = {}) {
  const errors = [];
  const coastal = document?.coastalParts;
  const zones = Object.entries(coastal?.zones ?? {});
  const parts = Object.entries(coastal?.parts ?? {});
  const add = (condition, code) => { if (!condition) errors.push(code); };

  add(typeof document?.datasetId === 'string' && document.datasetId.length > 0, 'MISSING_DATASET_ID');
  add(coastal?.enabled === true, 'COASTAL_PARTS_NOT_ENABLED');
  add(zones.length === expectedZoneCount, 'ZONE_COUNT_MISMATCH');
  add(Number(coastal?.expectedPartCount) === expectedPartCount, 'EXPECTED_PART_COUNT_MISMATCH');
  add(Number(coastal?.scoredPartCount) === expectedPartCount, 'SCORED_PART_COUNT_MISMATCH');
  add(parts.length === expectedPartCount, 'PART_OBJECT_COUNT_MISMATCH');
  add(coastal?.scoreProfile?.activeProfileId === CANDIDATE_G_RAVSCORE_PROFILE_ID, 'PUBLIC_PROFILE_NOT_CANDIDATE_G');
  add(coastal?.scoreProfile?.rollbackProfileId === null, 'PUBLIC_ROLLBACK_PROFILE_PRESENT');
  add(coastal?.scoreProfile?.candidateProfileId === CANDIDATE_G_RAVSCORE_PROFILE_ID, 'CANDIDATE_PROFILE_MISMATCH');
  add(coastal?.scoreProfile?.activationState === 'candidate-g-only-local-fail-closed',
    'PROFILE_NOT_CANDIDATE_G_ONLY');
  add(coastal?.scoreProfile?.publicAvailabilityPolicy === 'candidate-g-local-fail-closed',
    'PUBLIC_AVAILABILITY_POLICY_MISMATCH');
  add(coastal?.scoreProfile?.legacyPublicFallbackAllowed === false,
    'LEGACY_PUBLIC_FALLBACK_NOT_BLOCKED');
  add(coastal?.scoreProfile?.candidateMemoryReferenceScope === CANDIDATE_G_MEMORY_REFERENCE_SCOPE,
    'CANDIDATE_MEMORY_REFERENCE_SCOPE_MISMATCH');
  add(coastal?.scoreProfile?.automaticActivationAllowed === false, 'PROFILE_AUTOMATIC_ACTIVATION_NOT_BLOCKED');

  const availability = coastal?.scoreAvailability;
  const unavailableEntries = Array.isArray(availability?.unavailableZones) ? availability.unavailableZones : [];
  const unavailableByZone = new Map(unavailableEntries.map(entry => [entry?.zoneId, entry]));
  add(availability?.policy === 'candidate-g-local-fail-closed', 'SCORE_AVAILABILITY_POLICY_MISMATCH');
  add(Number(availability?.totalZoneCount) === zones.length, 'SCORE_AVAILABILITY_ZONE_COUNT_MISMATCH');
  add(Number(availability?.unavailableZoneCount) === unavailableEntries.length, 'SCORE_UNAVAILABLE_ZONE_COUNT_MISMATCH');
  add(Number(availability?.activeZoneCount) + unavailableEntries.length === zones.length, 'SCORE_ACTIVE_ZONE_COUNT_MISMATCH');
  add(availability?.allZonesActive === (unavailableEntries.length === 0), 'SCORE_ALL_ZONES_ACTIVE_FLAG_MISMATCH');

  const partCountByZone = new Map();
  for (const [, part] of parts) {
    partCountByZone.set(part?.zoneId, (partCountByZone.get(part?.zoneId) ?? 0) + 1);
  }
  for (const [zoneId, zone] of zones) {
    add(Number.isFinite(Date.parse(zone?.currentReferenceAt)), 'ZONE_REFERENCE_TIME_MISSING');
    add(Number(zone?.scoredPartCount) === Number(zone?.expectedPartCount), 'ZONE_PART_COVERAGE_INCOMPLETE');
    add((partCountByZone.get(zoneId) ?? 0) === Number(zone?.expectedPartCount), 'ZONE_PART_OBJECT_COUNT_MISMATCH');
    const current = (zone?.hourly ?? []).find(row => row?.time === zone?.currentReferenceAt);
    const unavailableModes = MODES.filter(mode => current?.[mode]?.available !== true || !finite(current?.[mode]?.score));
    const listedModes = unavailableByZone.get(zoneId)?.modes ?? [];
    add(unavailableModes.every(mode => listedModes.includes(mode)), 'LOCAL_UNAVAILABLE_MODE_NOT_LISTED');
    add(listedModes.every(mode => unavailableModes.includes(mode)), 'LISTED_UNAVAILABLE_MODE_IS_ACTIVE');
  }

  const modeRows = { waders: [], beach: [] };
  let acceptedStateCount = 0;
  let resetStateCount = 0;
  let outflowGateCount = 0;
  let scoreReconstructionMismatchCount = 0;
  let bandChangeCount = 0;
  let memoryReadyPartCount = 0;
  let warmupPartCount = 0;
  let transportStateReplayMismatchCount = 0;
  const persistedTransportPotentials = [];
  const replayedTransportPotentials = [];
  for (const [, part] of parts) {
    const zone = coastal?.zones?.[part?.zoneId];
    const candidate = part?.candidateG;
    const state = candidate?.currentState;
    add(Boolean(zone), 'PART_ZONE_MISSING');
    add((partCountByZone.get(part?.zoneId) ?? 0) === Number(zone?.expectedPartCount), 'ZONE_PART_OBJECT_COUNT_MISMATCH');
    add(candidate?.schemaVersion === CANDIDATE_G_STATE_SCHEMA_VERSION, 'STATE_SCHEMA_MISMATCH');
    add(candidate?.modelId === CANDIDATE_G_STATE_MODEL_ID, 'STATE_MODEL_MISMATCH');
    add(candidate?.variantId === CANDIDATE_G_STATE_VARIANT_ID, 'STATE_VARIANT_MISMATCH');
    add(candidate?.profileId === CANDIDATE_G_STATE_PROFILE_ID, 'STATE_PROFILE_MISMATCH');
    add(JSON.stringify(candidate?.weights) === JSON.stringify(CANDIDATE_G_WEIGHTS), 'CANDIDATE_WEIGHT_MISMATCH');
    add(candidate?.scoreImpact === 'active-public', 'CANDIDATE_NOT_ACTIVE_PUBLIC');
    add(candidate?.automaticActivationAllowed === false, 'AUTOMATIC_ACTIVATION_NOT_BLOCKED');
    add(candidate?.publicScoreChanged === true, 'PUBLIC_SCORE_CHANGE_NOT_FLAGGED');
    add(candidate?.referenceAt === zone?.currentReferenceAt, 'CANDIDATE_ZONE_REFERENCE_MISMATCH');
    add(candidate?.referenceAt === part?.current?.time, 'CANDIDATE_ACTIVE_REFERENCE_MISMATCH');
    const memoryReady = candidate?.transportMemoryReady === true;
    if (memoryReady) memoryReadyPartCount += 1;
    else warmupPartCount += 1;
    add(memoryReady
      ? candidate?.transportMemoryStatus === 'READY'
      : NOT_READY_TRANSPORT_MEMORY_STATUSES.has(candidate?.transportMemoryStatus),
    'BOUNDED_TRANSPORT_MEMORY_STATUS_INVALID');
    add(memoryReady
      ? Number(candidate?.transportMemoryCoverageHours) === 48
      : Number(candidate?.transportMemoryCoverageHours) >= 0
        && Number(candidate?.transportMemoryCoverageHours) < 48,
    'BOUNDED_TRANSPORT_MEMORY_COVERAGE_INVALID');
    add(state?.time === candidate?.referenceAt, 'STATE_REFERENCE_TIME_MISMATCH');
    add(state?.schemaVersion === CANDIDATE_G_STATE_SCHEMA_VERSION, 'COMPACT_STATE_SCHEMA_MISMATCH');
    add(state?.modelId === CANDIDATE_G_STATE_MODEL_ID, 'COMPACT_STATE_MODEL_MISMATCH');
    add(state?.profileId === CANDIDATE_G_STATE_PROFILE_ID, 'COMPACT_STATE_PROFILE_MISMATCH');
    add(typeof state?.stateKey === 'string' && state.stateKey.startsWith('sha256:'), 'COMPACT_STATE_KEY_MISSING');
    add(finite(state?.transportPotential) && Number(state.transportPotential) >= 0 && Number(state.transportPotential) <= 100, 'TRANSPORT_STATE_INVALID');
    add(finite(state?.outboundEpisodeEffectiveHours) && Number(state.outboundEpisodeEffectiveHours) >= 0, 'OUTFLOW_STATE_INVALID');
    add(state?.transportMemoryReady === memoryReady, 'COMPACT_BOUNDED_TRANSPORT_MEMORY_READY_MISMATCH');
    add(state?.transportMemoryStatus === candidate?.transportMemoryStatus,
      'COMPACT_BOUNDED_TRANSPORT_MEMORY_STATUS_MISMATCH');
    add(Number(state?.transportMemoryWindowHours) === 48, 'COMPACT_BOUNDED_TRANSPORT_MEMORY_WINDOW_INVALID');
    add(Number(state?.transportMemoryCoverageHours) === Number(candidate?.transportMemoryCoverageHours),
      'COMPACT_BOUNDED_TRANSPORT_MEMORY_COVERAGE_MISMATCH');
    add(Array.isArray(state?.transportEvidence)
      && (memoryReady ? state.transportEvidence.length >= 17 && state.transportEvidence.length <= 49
        : state.transportEvidence.length >= 1 && state.transportEvidence.length <= 49),
    'COMPACT_BOUNDED_TRANSPORT_EVIDENCE_INVALID_LENGTH');
    add((state?.transportEvidence ?? []).every((item, index, rows) =>
      item && Object.keys(item).sort().join(',') === 'strength,time'
      && Number.isFinite(Date.parse(item.time))
      && (item.strength === null || (finite(item.strength)
        && Number(item.strength) >= -1 && Number(item.strength) <= 1))
      && (index === 0 || Date.parse(item.time) > Date.parse(rows[index - 1].time))),
    'COMPACT_BOUNDED_TRANSPORT_EVIDENCE_INVALID');
    add((state?.transportEvidence ?? []).every((item, index, rows) =>
      Number.isFinite(item?.strength)
      && (index === 0 || (Date.parse(item.time) - Date.parse(rows[index - 1].time)) / 3_600_000
        <= CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.maximumGapHours)),
    'COMPACT_BOUNDED_TRANSPORT_EVIDENCE_NOT_CONTINUOUS');
    let replayedTransport = null;
    try {
      replayedTransport = buildBoundedCurrentTransportMemory(state?.transportEvidence ?? [], {
        referenceTime: candidate?.referenceAt,
      });
    } catch {
      add(false, 'COMPACT_BOUNDED_TRANSPORT_REPLAY_FAILED');
    }
    if (finite(state?.transportPotential)) persistedTransportPotentials.push(Number(state.transportPotential));
    if (finite(replayedTransport?.result?.transportPotential)) {
      replayedTransportPotentials.push(Number(replayedTransport.result.transportPotential));
    }
    const replayMatches = finite(state?.transportPotential)
      && finite(replayedTransport?.result?.transportPotential)
      && Math.abs(Number(state.transportPotential) - Number(replayedTransport.result.transportPotential)) <= 1e-9
      && Math.abs(Number(state.outboundEpisodeEffectiveHours)
        - Number(replayedTransport.result.outboundEpisodeEffectiveHours)) <= 1e-9
      && state.transportMemoryReady === replayedTransport.memoryReady
      && state.transportMemoryStatus === replayedTransport.status
      && Number(state.transportMemoryCoverageHours) === Number(replayedTransport.coverageHours);
    if (!replayMatches) transportStateReplayMismatchCount += 1;
    add(replayMatches, 'COMPACT_BOUNDED_TRANSPORT_REPLAY_MISMATCH');
    add(finite(state?.mobilisationPotential) && Number(state.mobilisationPotential) >= 0 && Number(state.mobilisationPotential) <= 100, 'MOBILISATION_STATE_INVALID');
    if (candidate?.initialStateAccepted === true) acceptedStateCount += 1;
    else resetStateCount += 1;

    const compactKeys = Object.keys(state ?? {}).sort();
    add(JSON.stringify(compactKeys) === JSON.stringify([
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
      'variantId',
    ].sort()), 'COMPACT_STATE_FIELD_SET_MISMATCH');
    const compactText = JSON.stringify(state ?? {}).toLowerCase();
    for (const forbidden of [
      'currentu', 'currentv', 'currentspeed', 'currentdirection', 'windspeed',
      'waveheight', 'waveperiod', 'latitude', 'longitude', 'waterpoint',
      'landpoint', 'coordinates',
    ]) add(!compactText.includes(forbidden), 'COMPACT_STATE_RAW_INPUT_INCLUDED');

    for (const mode of MODES) {
      const activePublic = part?.current?.[mode];
      const activeScore = activePublic?.score;
      const candidateMode = candidate?.modes?.[mode];
      add(candidateMode?.available === true && finite(candidateMode?.score), 'CANDIDATE_SCORE_MISSING');
      add(Object.keys(CANDIDATE_G_WEIGHTS).every(key => finite(candidateMode?.weightedContributions?.[key])), 'CANDIDATE_CONTRIBUTION_MISSING');
      add(finite(candidateMode?.physicalGateFactor), 'CANDIDATE_PHYSICAL_GATE_MISSING');
      if (!memoryReady) {
        add(activePublic?.available === false && !finite(activeScore), 'NOT_READY_CANDIDATE_EXPOSED_PUBLIC_SCORE');
        continue;
      }
      add(activePublic?.available === true && finite(activeScore), 'READY_ACTIVE_SCORE_MISSING');
      if (!finite(activeScore) || !finite(candidateMode?.score)) continue;
      const active = Number(activeScore);
      const proposed = Number(candidateMode.score);
      add(active >= 0 && active <= 100 && proposed >= 0 && proposed <= 100, 'SCORE_OUT_OF_RANGE');
      add(active === proposed, 'ACTIVE_SCORE_DOES_NOT_MATCH_CANDIDATE_G');
      const reconstructed = reconstructCandidateScore(mode, candidateMode);
      if (reconstructed !== proposed) scoreReconstructionMismatchCount += 1;
      if (scoreBand(active) !== scoreBand(proposed)) bandChangeCount += 1;
      if (candidateMode.outflowExhaustionGateApplied === true) {
        outflowGateCount += 1;
        add(proposed === 0, 'OUTFLOW_GATE_DID_NOT_ZERO_SCORE');
        add(candidateMode.outflowExhaustionExplanationDa === CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA, 'OUTFLOW_EXPLANATION_MISMATCH');
      }
      modeRows[mode].push({ active, proposed, delta: proposed - active });
    }
  }
  add(scoreReconstructionMismatchCount === 0, 'CANDIDATE_SCORE_RECONSTRUCTION_MISMATCH');

  const modeSummary = Object.fromEntries(MODES.map(mode => [mode, {
    active: summarize(modeRows[mode].map(row => row.active)),
    candidateG: summarize(modeRows[mode].map(row => row.proposed)),
    delta: summarize(modeRows[mode].map(row => row.delta)),
  }]));
  const uniqueErrors = [...new Set(errors)].sort();
  return {
    schemaVersion: 1,
    audit: 'candidate-g-active-public-shadow',
    status: uniqueErrors.length ? 'failed' : 'passed',
    activationShadowReady: uniqueErrors.length === 0,
    automaticActivationAllowed: false,
    publicScoreChanged: true,
    rollbackPath: null,
    publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
    scoreProfile: coastal?.scoreProfile ? {
      switchVersion: coastal.scoreProfile.switchVersion,
      requestedProfileId: coastal.scoreProfile.requestedProfileId,
      activeProfileId: coastal.scoreProfile.activeProfileId,
      rollbackProfileId: coastal.scoreProfile.rollbackProfileId,
      candidateProfileId: coastal.scoreProfile.candidateProfileId,
      candidateCoverageReady: coastal.scoreProfile.candidateCoverageReady,
      candidateMemoryReady: coastal.scoreProfile.candidateMemoryReady,
      candidateWarmupEligible: coastal.scoreProfile.candidateWarmupEligible,
      candidateMemoryReferenceScope: coastal.scoreProfile.candidateMemoryReferenceScope,
      prePublicWarmupAccepted: coastal.scoreProfile.prePublicWarmupAccepted,
      activationState: coastal.scoreProfile.activationState,
      publicAvailabilityPolicy: coastal.scoreProfile.publicAvailabilityPolicy,
      legacyPublicFallbackAllowed: coastal.scoreProfile.legacyPublicFallbackAllowed,
      automaticActivationAllowed: coastal.scoreProfile.automaticActivationAllowed,
    } : null,
    datasetDigest: digest({ datasetId: document?.datasetId, generatedAt: document?.generatedAt }),
    coverage: {
      zoneCount: zones.length,
      expectedZoneCount,
      partCount: parts.length,
      expectedPartCount,
      modeEvaluationCount: modeRows.waders.length + modeRows.beach.length,
    },
    stateContinuation: {
      acceptedStateCount,
      resetStateCount,
      memoryReadyPartCount,
      warmupPartCount,
      transportStateReplayMismatchCount,
      persistedTransportPotential: summarize(persistedTransportPotentials),
      replayedTransportPotential: summarize(replayedTransportPotentials),
      persistedTransportZeroCount: persistedTransportPotentials.filter(value => value === 0).length,
      replayedTransportZeroCount: replayedTransportPotentials.filter(value => value === 0).length,
      replayedTransportPositiveCount: replayedTransportPotentials.filter(value => value > 0).length,
    },
    scoreComparison: { modes: modeSummary, bandChangeCount, outflowGateCount },
    scoreReconstructionMismatchCount,
    errors: uniqueErrors,
    privacy: {
      rawCurrentVectorsIncluded: false,
      coordinatesIncluded: false,
      partIdentifiersIncluded: false,
      privateReplayPayloadIncluded: false,
    },
  };
}

function syntheticDocument() {
  const referenceAt = '2026-08-23T10:00:00.000Z';
  const zones = {};
  const parts = {};
  let partNumber = 0;
  const scoreProfile = resolvePublicRavScoreProfile({
    selection: {
      ...PUBLIC_RAVSCORE_PROFILE_SELECTION,
      requestedProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
      candidateActivationEnabled: true,
      prePublicWarmupAccepted: true,
      status: 'owner-approved-pre-public-synthetic-active',
      activationAuthority: 'synthetic-owner-review',
    },
    evidence: {
      freshFinalShadowRunId: null,
      ownerReviewDecisionId: 'synthetic-owner-review',
    },
    candidateCoverageReady: true,
    candidateMemoryReady: false,
    candidateWarmupEligible: true,
  });
  for (let zoneNumber = 0; zoneNumber < EXPECTED_ZONES; zoneNumber += 1) {
    const zoneId = `zone-${zoneNumber}`;
    const partCount = zoneNumber < 43 ? 4 : 3;
    zones[zoneId] = {
      expectedPartCount: partCount,
      scoredPartCount: partCount,
      currentReferenceAt: referenceAt,
      hourly: [{
        time: referenceAt,
        waders: { status: 'unavailable', available: false, score: null, reasons: ['Candidate G-historikken er endnu ikke sammenhængende.'] },
        beach: { status: 'unavailable', available: false, score: null, reasons: ['Candidate G-historikken er endnu ikke sammenhængende.'] },
      }],
    };
    for (let local = 0; local < partCount; local += 1) {
      const partId = `part-${partNumber}`;
      const mode = {
        available: true,
        score: 50,
        components: { huntability: 50, transport: 50, delivery: 50, transportAndDelivery: 50, mobilisation: 50 },
        weightedContributions: { huntability: 10, transportAndDelivery: 25, mobilisation: 15 },
        additiveScore: 50,
        physicalGateFactor: 1,
        wadersHuntabilityMaximum: null,
        wadersHuntabilityLimitApplied: false,
        outflowExhaustionGateApplied: false,
        outflowExhaustionExplanationDa: null,
      };
      parts[partId] = {
        zoneId,
        current: {
          time: referenceAt,
          waders: { available: false, score: null, reasons: ['Candidate G-historikken er endnu ikke sammenhængende.'] },
          beach: { available: false, score: null, reasons: ['Candidate G-historikken er endnu ikke sammenhængende.'] },
        },
        candidateG: {
          schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
          modelId: CANDIDATE_G_STATE_MODEL_ID,
          variantId: CANDIDATE_G_STATE_VARIANT_ID,
          profileId: CANDIDATE_G_STATE_PROFILE_ID,
          weights: CANDIDATE_G_WEIGHTS,
          scoreImpact: 'active-public',
          automaticActivationAllowed: false,
          publicScoreChanged: true,
          referenceAt,
          transportMemoryReady: false,
          transportMemoryStatus: 'WINDOW_INCOMPLETE',
          transportMemoryCoverageHours: 0,
          initialStateAccepted: zoneNumber > 0,
          initialStateResetReason: zoneNumber > 0 ? null : 'NO_PREVIOUS_STATE',
          currentState: {
            schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
            modelId: CANDIDATE_G_STATE_MODEL_ID,
            variantId: CANDIDATE_G_STATE_VARIANT_ID,
            profileId: CANDIDATE_G_STATE_PROFILE_ID,
            stateKey: `sha256:${digest(partId)}`,
            time: referenceAt,
            transportPotential: 0,
            outboundEpisodeEffectiveHours: 0,
            transportMemoryReady: false,
            transportMemoryStatus: 'WINDOW_INCOMPLETE',
            transportMemoryWindowHours: 48,
            transportMemoryCoverageHours: 0,
            transportEvidence: [{ time: referenceAt, strength: 0 }],
            mobilisationPotential: 50,
          },
          modes: { waders: mode, beach: mode },
        },
      };
      partNumber += 1;
    }
  }
  return {
    schemaVersion: 1,
    datasetId: 'rr-synthetic-210',
    generatedAt: referenceAt,
    coastalParts: {
      enabled: true,
      scoreProfile,
      scoreAvailability: {
        schemaVersion: 1,
        policy: 'candidate-g-local-fail-closed',
        allZonesActive: false,
        activeZoneCount: 0,
        unavailableZoneCount: EXPECTED_ZONES,
        totalZoneCount: EXPECTED_ZONES,
        evaluatedAt: referenceAt,
        unavailableZones: Object.keys(zones).map(zoneId => ({
          zoneId,
          zoneName: zoneId,
          modes: [...MODES],
          reasons: ['Candidate G-historikken er endnu ikke sammenhængende.'],
        })),
      },
      expectedPartCount: EXPECTED_PARTS,
      scoredPartCount: EXPECTED_PARTS,
      zones,
      parts,
    },
  };
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes('--self-test')) {
    const report = auditCandidateGPublicShadow(syntheticDocument());
    assert.equal(report.status, 'passed');
    assert.equal(report.coverage.zoneCount, EXPECTED_ZONES);
    assert.equal(report.coverage.partCount, EXPECTED_PARTS);
    assert.equal(report.coverage.modeEvaluationCount, 0);
    assert.equal(report.scoreReconstructionMismatchCount, 0);
    assert.equal(report.stateContinuation.memoryReadyPartCount, 0);
    assert.equal(report.stateContinuation.warmupPartCount, EXPECTED_PARTS);
    assert.equal(report.scoreProfile.activeProfileId, CANDIDATE_G_RAVSCORE_PROFILE_ID);
    assert.equal(report.privacy.partIdentifiersIncluded, false);
    const leakDocument = syntheticDocument();
    Object.values(leakDocument.coastalParts.parts)[0].current.waders = { available: true, score: 50 };
    assert.equal(auditCandidateGPublicShadow(leakDocument).status, 'failed',
      'En gammel eller opfundet offentlig score må ikke lække ud, når Candidate G-historikken mangler.');
    console.log('Candidate G-only lokal fail-closed public-audit-self-test: OK');
    return;
  }
  const inputIndex = arguments_.indexOf('--input');
  const outputIndex = arguments_.indexOf('--output');
  const inputPath = inputIndex >= 0 ? arguments_[inputIndex + 1] : DEFAULT_INPUT;
  const outputPath = outputIndex >= 0 ? arguments_[outputIndex + 1] : DEFAULT_OUTPUT;
  const document = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  const report = auditCandidateGPublicShadow(document);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Candidate G public shadow: ${report.status}; ${report.coverage.zoneCount}/${report.coverage.expectedZoneCount} zoner og ${report.coverage.partCount}/${report.coverage.expectedPartCount} kystdele.`);
  if (report.status !== 'passed') process.exitCode = 1;
}

await main();
