import { samePoint, waveComponent, prepareRavScoreRecoveryCurrentComponent,
  completeRavScoreRecoveryCurrentComponent } from './ravscore-recovery-calculation.mjs';
import { calculateRavScoreRecoveryCurrentProjection } from './ravscore-physical-calculation.mjs';
import {
  RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS, RAVSCORE_COLD_START_REPLAY_HOURS,
  RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES, RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
  finite, canonicalTime, canonicalHour, digest, failClosed, exactOperationalStateOnlyHold, addComponent,
  ravScoreCandidateMigrationWaveBootstrapTargetAt, ravScoreRecoveryReplayStartAt,
  ravScoreRecoverySourceStartAt, selectRavScoreInitialState,
  prepareRavScoreRecoveryReplay, ravScoreRecoveryReplayRowWindow,
  appendRavScoreRecoveryComponents, completeRavScoreRecoveryReplay,
  prepareRavScorePermittedCurrentHistory, completeRavScorePermittedCurrentHistory,
} from './ravscore-recovery-calculation.mjs';
export {
  RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS, RAVSCORE_COLD_START_REPLAY_HOURS,
  RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES, RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
  ravScoreCandidateMigrationWaveBootstrapTargetAt, ravScoreRecoveryReplayStartAt,
  ravScoreRecoverySourceStartAt, selectRavScoreInitialState,
};
import { latestVerifiedNativeCadenceSampleForPart, stateOnlyCurrentRowForbiddenFields } from './live-current-pilot.mjs';
import crypto from 'node:crypto';
import {
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../../js/core/ravscore-model-contract.js';
import {
  buildIntegratedRavScoreStateSeries,
  canonicalRavScoreStateOnlyCurrentHold,
  validateCandidateGMigrationSource,
} from '../../js/core/ravscore-integrated-state-pipeline.js';
import {
  buildCurrentSupplyMemory,
} from '../../js/core/ravscore-current-supply-memory.js';
import { classifyWavePhysicalTuple } from '../../js/core/ravscore-mobilisation-memory.js';
import {
  assertIntegratedCoastalPointContinuation,
  candidateGStateKey,
} from './coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';
import {
  assertRegionalSanitizedCurrentApplicable,
  coastNormalSpeedMpsFromUv,
  dmiExpectedIdentityForPart,
  verifiedControlledLiveCurrentSource,
  eligibleDmiForecastComponentSource as verifiedDmiForecastComponentSource,
} from './ravscore-production-adapters.mjs';
import { verifyCompactFeggesundWaveProxy } from './feggesund-wave-proxy.mjs';
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
import { assertDmiForecastGridSamplingApplicable } from './dmi-forecast-store.mjs';


const HOUR_MS = 3_600_000;

const circularDistanceDeg = (left, right) => {
  const difference = Math.abs(Number(left) - Number(right)) % 360;
  return Math.min(difference, 360 - difference);
};





function currentComponent(row, part, { requireNativeGridSampling = false, liveCurrentPilot = null } = {}) {
  const prepared = prepareRavScoreRecoveryCurrentComponent(row, part);
  if (prepared === null) return null;
  const { provenance } = prepared;
  // Check the actual rich original BEFORE compaction discards native endpoints.
  // Historical admission/signatures stay unchanged. A compact memory marker,
  // or a different fresh parser result, cannot attest this original lookup.
  if (requireNativeGridSampling && provenance.provider === 'dmi'
    && !assertRegionalSanitizedCurrentApplicable(row, part, liveCurrentPilot)) {
    assertDmiForecastGridSamplingApplicable(provenance, 'current', row.time,
      dmiExpectedIdentityForPart(part));
  }
  return completeRavScoreRecoveryCurrentComponent(row, prepared);
}

const SHA256 = /^(?:sha256:)?[0-9a-f]{64}$/;

/**
 * Component reserves are already admitted by the opaque CP/Open-Meteo bank
 * before they reach this private replay.  Keep a second, small structural
 * proof here so a reserve row cannot become replay evidence merely by saying
 * `verified`; Candidate G's migration bridge remains DMI-only below.
 */




/**
 * Current-only input for the owner-scoped consumer transition. Reuse the
 * actual replay admission/signature checks; do NOT relabel old signed state
 * evidence as LF or infer a source from a value match. Callers must supply
 * their already qualified private records, including the pre-state window.
 * Missing/excluded input stays unknown; no wave/last-mile replay is done here.
 */
export function buildRavScorePermittedCurrentHistory({ part, referenceAt, sourceRecords = [],
  requireNativeGridSampling = false, liveCurrentPilot = null, preserveNativeCadenceHolds = false } = {}) {
  const { endMs, startMs, parentZoneId } = prepareRavScorePermittedCurrentHistory({
    part, referenceAt, sourceRecords, requireNativeGridSampling, preserveNativeCadenceHolds,
  });
  const union = new Map();
  const nativeSources = new Map();
  for (const source of sourceRecords) {
    const record = source?.record;
    if (!record || !Array.isArray(record.hourly)) continue;
    if (!samePoint(record.point, part.waterPoint)) {
      failClosed('RAVSCORE_RECOVERY_REPLAY_SAMPLING_MISMATCH',
        'Current source transition has a different sampling point');
    }
    const seen = new Set();
    for (const row of record.hourly) {
      const ms = Date.parse(row?.time);
      if (!Number.isFinite(ms) || ms < startMs || ms > endMs) continue;
      const time = canonicalHour(row.time);
      if (seen.has(time)) {
        failClosed('RAVSCORE_RECOVERY_REPLAY_CONFLICT',
          'Current source transition has duplicate source hours');
      }
      seen.add(time);
      const provenance = row.currentProvenance?.status === 'verified'
        ? row.currentProvenance : row.sources?.current;
      const hold = preserveNativeCadenceHolds
        ? exactOperationalStateOnlyHold(row.currentStateOnlyHold, row.time, part) : null;
      if (!dmiMarineCollectionAllowedForZone(hold?.collection ?? provenance?.collection, parentZoneId)) continue;
      if (hold && stateOnlyCurrentRowForbiddenFields(row).some(key => row[key] !== null && row[key] !== undefined)) {
        failClosed('RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID', 'Current history hold contains a projection');
      }
      if (hold && !latestVerifiedNativeCadenceSampleForPart(part, liveCurrentPilot, hold.sourceValidTime,
        { requireNativeGridSampling: true, expectedHold: hold })) {
        failClosed('RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID', 'Current history hold lacks its exact original');
      }
      const current = currentComponent(row, part, { requireNativeGridSampling, liveCurrentPilot });
      if (!current && [row.currentSpeedMps, row.currentDirectionDeg,
        row.currentUMps, row.currentVMps].some(finite)) {
        failClosed('RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED',
          'Current source transition lacks exact verified provenance');
      }
      const components = union.get(time) ?? {};
      addComponent(components, 'current', current);
      if (current && !nativeSources.has(time)) nativeSources.set(time, provenance);
      if (hold) addComponent(components, 'currentHold', { signature: digest(hold), row: hold });
      if (components.current && components.currentHold) {
        failClosed('RAVSCORE_RECOVERY_REPLAY_CONFLICT', 'Current history cannot select both a vector and a hold');
      }
      union.set(time, components);
    }
  }
  for (const components of union.values()) {
    const hold = components.currentHold?.row;
    if (!hold) continue;
    const native = nativeSources.get(hold.sourceValidTime);
    if (!native || ['sourceAssetSha256', 'sourceProofSha256', 'vectorCommitmentSha256',
      'closureId', 'closureContractId', 'targetIdentityFingerprint', 'parentZoneId']
      .some(key => native[key] !== hold[key])) {
      failClosed('RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID', 'Current history hold has a different selected native original');
    }
  }
  return completeRavScorePermittedCurrentHistory({ union, startMs, endMs });
}





/**
 * Build one private causal state input. Rows before the production target are
 * reduced to verified current/wave components and never returned as scores.
 * Public target/future rows remain separate and are evaluated only through
 * scoreStartAt=targetReferenceAt by the existing integrated adapter.
 */
export function buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt,
  sourceRecords = [],
  publicHourly = [],
  nativeCadenceHoldHours = 0,
  nativeCadenceReferenceSample = null,
  requireNativeGridSampling = false,
  liveCurrentPilot = null,
} = {}) {
  const plan = prepareRavScoreRecoveryReplay({
    part, initialState, targetReferenceAt, publicHourly, nativeCadenceHoldHours,
  });
  const { target, targetMs, coldStart, stateMs, canonicalPublicRows,
    candidateMigration, candidateWaveBootstrapTarget, migrationWaveStartMs, migrationWaveEndMs } = plan;
  const union = new Map();
  const migrationWaveByTime = new Map();
  let acceptedSourceRecordCount = 0;
  for (const source of sourceRecords) {
    const record = source?.record;
    if (!record || !Array.isArray(record.hourly)) continue;
    if (!samePoint(record.point, part.waterPoint)) {
      failClosed(
        'RAVSCORE_RECOVERY_REPLAY_SAMPLING_MISMATCH',
        'RavScore recovery source has a different sampling point',
      );
    }
    acceptedSourceRecordCount += 1;
    for (const row of record.hourly) {
      const { needsReplay, needsMigrationWave, time } = ravScoreRecoveryReplayRowWindow(row, plan);
      if (!needsReplay && !needsMigrationWave) continue;
      const candidateHold = needsReplay && requireNativeGridSampling
        ? exactOperationalStateOnlyHold(row.currentStateOnlyHold, time, part) : null;
      const currentHold = candidateHold && dmiMarineCollectionAllowedForZone(candidateHold.collection,
        part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId) ? candidateHold : null;
      if (candidateHold && !currentHold) {
        failClosed('RAVSCORE_CURRENT_SOURCE_DOMAIN_EXCLUDED', 'Current replay hold is excluded for its target zone');
      }
      if (currentHold && (stateOnlyCurrentRowForbiddenFields(row).some(key => row[key] !== null && row[key] !== undefined)
        || !latestVerifiedNativeCadenceSampleForPart(part, liveCurrentPilot, currentHold.sourceValidTime,
          { requireNativeGridSampling: true, expectedHold: currentHold }))) {
        failClosed('RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID',
          'Current replay hold lacks its exact original or contains a projection');
      }
      const current = needsReplay ? currentComponent(row, part, { requireNativeGridSampling, liveCurrentPilot }) : null;
      const hasCurrentPayload = [
        row?.currentSpeedMps,
        row?.currentDirectionDeg,
        row?.currentUMps,
        row?.currentVMps,
      ].some(finite);
      if (needsReplay && hasCurrentPayload && !current) {
        failClosed(
          'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED',
          'RavScore recovery replay contains current without exact verified provenance',
        );
      }
      const wave = needsReplay || needsMigrationWave
        ? waveComponent(row, part, {
          // A normal integrated continuation may use a separately admitted
          // CP/Open-Meteo wave reserve.  The one-time Candidate G bridge is
          // intentionally stricter: its 40-hour history must be direct DMI.
          allowVerifiedFallback: needsReplay && !needsMigrationWave,
          requireNativeGridSampling,
        })
        : null;
      const hasWavePayload = [
        row?.waveHeightM,
        row?.wavePeriodS,
        row?.waveDirectionDeg,
      ].some(finite);
      if ((needsReplay || needsMigrationWave) && hasWavePayload && !wave) {
        failClosed(
          'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED',
          'RavScore recovery replay contains waves without exact verified provenance or direction',
        );
      }
      appendRavScoreRecoveryComponents({
        time, current, wave, currentHold, needsReplay, needsMigrationWave, union, migrationWaveByTime,
      });
    }
  }
  const heldSourceTimes = new Set([...union.values()].map(row => row.currentHold?.row.sourceValidTime).filter(Boolean));
  const selectedNativeSources = new Map();
  if (heldSourceTimes.size) {
    // Only the actual selected hold's rich native support is used, including
    // support at/before initial state. Compact state cannot supply its proof.
    for (const source of sourceRecords) {
      if (!Array.isArray(source?.record?.hourly)) continue;
      for (const row of source.record.hourly) {
        if (!Number.isFinite(Date.parse(row?.time)) || !heldSourceTimes.has(canonicalHour(row.time))) continue;
        const current = currentComponent(row, part, { requireNativeGridSampling: true, liveCurrentPilot });
        if (!current && [row.currentSpeedMps, row.currentDirectionDeg, row.currentUMps, row.currentVMps].some(finite)) {
          failClosed('RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED', 'Current replay hold support lacks exact verified provenance');
        }
        if (!current) continue;
        const time = canonicalHour(row.time), selected = selectedNativeSources.get(time) ?? {};
        addComponent(selected, 'current', current);
        selected.provenance = row.currentProvenance?.status === 'verified' ? row.currentProvenance : row.sources?.current;
        selectedNativeSources.set(time, selected);
      }
    }
    for (const components of union.values()) {
      const hold = components.currentHold?.row;
      if (!hold) continue;
      const native = selectedNativeSources.get(hold.sourceValidTime)?.provenance;
      if (!native || ['sourceAssetSha256', 'sourceProofSha256', 'vectorCommitmentSha256',
        'closureId', 'closureContractId', 'targetIdentityFingerprint', 'parentZoneId']
        .some(key => native[key] !== hold[key])) {
        failClosed('RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID',
          'Current replay hold has a different selected native original');
      }
    }
  }
  return completeRavScoreRecoveryReplay({
    part, initialState, nativeCadenceHoldHours, nativeCadenceReferenceSample,
    union, migrationWaveByTime, acceptedSourceRecordCount, plan,
  });
}
