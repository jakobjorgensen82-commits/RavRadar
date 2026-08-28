#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_PRIORS,
  NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
  NEXT_RAVSCORE_VARIANT_ID,
} from '../js/core/ravscore-next-generation.js';
import {
  NEXT_RAVSCORE_STATE_MIGRATION_ID,
  NEXT_RAVSCORE_STATE_PROFILE_ID,
} from '../js/core/ravscore-next-generation-state-pipeline.js';
import { NEXT_RAVSCORE_AVAILABILITY_POLICY } from '../js/core/ravscore-next-generation-profile.js';

const EXPECTED_ZONE_COUNT = 210;
const EXPECTED_PART_COUNT = 673;
const MODES = Object.freeze(['waders', 'beach']);
const finite = value => value !== null && value !== undefined && Number.isFinite(Number(value));

export function auditNextGenerationPublicRuntime(document, {
  expectedZoneCount = EXPECTED_ZONE_COUNT,
  expectedPartCount = EXPECTED_PART_COUNT,
  requireAllReady = true,
} = {}) {
  const failures = [];
  const add = (condition, code, detail = null) => {
    if (!condition) failures.push(detail ? `${code}:${detail}` : code);
  };
  const coastal = document?.coastalParts;
  const zones = coastal?.zones || {};
  const parts = coastal?.parts || {};
  add(coastal?.scoreProfile?.activeProfileId === NEXT_RAVSCORE_MODEL_ID, 'PUBLIC_PROFILE_MISMATCH');
  add(coastal?.scoreProfile?.modelProfileId === NEXT_RAVSCORE_MODEL_ID, 'MODEL_PROFILE_MISMATCH');
  add(coastal?.scoreProfile?.rollbackProfileId === null, 'PUBLIC_ROLLBACK_PROFILE_PRESENT');
  add(coastal?.scoreProfile?.legacyPublicFallbackAllowed === false, 'LEGACY_PUBLIC_FALLBACK_ALLOWED');
  add(coastal?.scoreProfile?.publicAvailabilityPolicy === NEXT_RAVSCORE_AVAILABILITY_POLICY,
    'PUBLIC_AVAILABILITY_POLICY_MISMATCH');
  add(coastal?.scoreAvailability?.policy === NEXT_RAVSCORE_AVAILABILITY_POLICY,
    'SCORE_AVAILABILITY_POLICY_MISMATCH');
  add(Object.keys(zones).length === expectedZoneCount, 'ZONE_COUNT_MISMATCH');
  add(Object.keys(parts).length === expectedPartCount, 'PART_COUNT_MISMATCH');

  let readyPartCount = 0;
  let modeEvaluationCount = 0;
  let scoreReconstructionMismatchCount = 0;
  for (const [partId, part] of Object.entries(parts)) {
    const state = part?.ravScore;
    add(Boolean(state), 'RAVSCORE_STATE_MISSING', partId);
    if (!state) continue;
    add(state.schemaVersion === NEXT_RAVSCORE_STATE_SCHEMA_VERSION, 'STATE_SCHEMA_MISMATCH', partId);
    add(state.modelId === NEXT_RAVSCORE_MODEL_ID, 'STATE_MODEL_MISMATCH', partId);
    add(state.variantId === NEXT_RAVSCORE_VARIANT_ID, 'STATE_VARIANT_MISMATCH', partId);
    add(state.profileId === NEXT_RAVSCORE_STATE_PROFILE_ID, 'STATE_PROFILE_MISMATCH', partId);
    add(state.migrationId === NEXT_RAVSCORE_STATE_MIGRATION_ID, 'STATE_MIGRATION_MISMATCH', partId);
    add(JSON.stringify(state.priors) === JSON.stringify(NEXT_RAVSCORE_PRIORS), 'STATE_PRIORS_MISMATCH', partId);
    add(state.automaticActivationAllowed === false, 'AUTOMATIC_ACTIVATION_ALLOWED', partId);
    add(state.currentState?.schemaVersion === NEXT_RAVSCORE_STATE_SCHEMA_VERSION, 'COMPACT_STATE_SCHEMA_MISMATCH', partId);
    add(state.currentState?.modelId === NEXT_RAVSCORE_MODEL_ID, 'COMPACT_STATE_MODEL_MISMATCH', partId);
    const memoryReady = state.transportMemoryReady === true && state.transportMemoryStatus === 'READY';
    if (memoryReady) readyPartCount += 1;
    for (const mode of MODES) {
      const model = state.modes?.[mode];
      const active = part?.current?.[mode];
      add(model?.modelId === NEXT_RAVSCORE_MODEL_ID, 'MODE_MODEL_MISMATCH', `${partId}:${mode}`);
      add(model?.available === true && finite(model?.score), 'MODE_SCORE_MISSING', `${partId}:${mode}`);
      add(active?.scoreProfileId === NEXT_RAVSCORE_MODEL_ID, 'PUBLIC_MODE_PROFILE_MISMATCH', `${partId}:${mode}`);
      if (memoryReady || requireAllReady) {
        add(active?.available === true && finite(active?.score), 'PUBLIC_MODE_SCORE_MISSING', `${partId}:${mode}`);
      } else {
        add(active?.available === false && active?.score === null, 'WARMUP_MODE_NOT_FAIL_CLOSED', `${partId}:${mode}`);
      }
      if (memoryReady && finite(model?.score) && finite(active?.score) && Number(model.score) !== Number(active.score)) {
        scoreReconstructionMismatchCount += 1;
      }
      if (memoryReady) {
        add(active?.explanation?.weights === null, 'LEGACY_WEIGHT_EXPLANATION_PRESENT', `${partId}:${mode}`);
        add(active?.explanation?.causalExplanation?.physicalCoupling?.supplyCountedOnce === true,
          'CAUSAL_DOUBLE_COUNT_GUARD_MISSING', `${partId}:${mode}`);
        add(active?.explanation?.transportDiagnostics?.surfZoneResolved === false,
          'SURF_ZONE_PRECISION_CLAIMED', `${partId}:${mode}`);
        add(active?.explanation?.transportDiagnostics?.beachOrSurfZoneDepletionClaimed === false,
          'BEACH_OR_SURF_DEPLETION_CLAIMED', `${partId}:${mode}`);
        add(active?.explanation?.causalExplanation?.waterLevel?.scoreImpact?.coastalSupply === 0,
          'WATER_LEVEL_SUPPLY_DOUBLE_COUNT', `${partId}:${mode}`);
        add(active?.explanation?.causalExplanation?.waterLevel?.scoreImpact?.nearshoreSupport === 0
          && active?.explanation?.causalExplanation?.waterLevel?.gridCurrentVectorAdded === false,
          'WATER_LEVEL_NEARSHORE_VECTOR_CLAIMED', `${partId}:${mode}`);
        add(Array.isArray(active?.explanation?.uncertainty?.limitations)
          && active.explanation.uncertainty.limitations.length > 0,
          'UNCERTAINTY_LIMITATIONS_MISSING', `${partId}:${mode}`);
        add(active?.explanation?.empiricalFindAccuracyClaimed === false,
          'EMPIRICAL_FIND_ACCURACY_CLAIMED', `${partId}:${mode}`);
      }
      modeEvaluationCount += 1;
    }
  }
  add(scoreReconstructionMismatchCount === 0, 'ACTIVE_SCORE_RECONSTRUCTION_MISMATCH');
  if (requireAllReady) add(readyPartCount === expectedPartCount, 'MEMORY_READY_COUNT_MISMATCH');
  return {
    ok: failures.length === 0,
    status: failures.length === 0 ? 'passed' : 'failed',
    audit: 'integrated-next-ravscore-public-runtime',
    failures,
    coverage: { zoneCount: Object.keys(zones).length, partCount: Object.keys(parts).length, modeEvaluationCount },
    stateContinuation: {
      memoryReadyPartCount: readyPartCount,
      warmupPartCount: Math.max(0, Object.keys(parts).length - readyPartCount),
    },
    scoreReconstructionMismatchCount,
    privacy: {
      rawVectorsLogged: false,
      coordinatesLogged: false,
      privatePayloadsLogged: false,
    },
  };
}

async function writeAuditReport(output, report) {
  const resolved = path.resolve(output);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, `${JSON.stringify(report, null, 2)}\n`);
}

async function selfTest() {
  const mode = score => ({
    available: true,
    score,
    modelId: NEXT_RAVSCORE_MODEL_ID,
    components: {},
  });
  const projected = score => ({
    available: true,
    score,
    scoreProfileId: NEXT_RAVSCORE_MODEL_ID,
    explanation: {
      weights: null,
      empiricalFindAccuracyClaimed: false,
      causalExplanation: {
        physicalCoupling: { supplyCountedOnce: true },
        waterLevel: {
          scoreImpact: { coastalSupply: 0, nearshoreSupport: 0 },
          gridCurrentVectorAdded: false,
        },
      },
      transportDiagnostics: { surfZoneResolved: false, beachOrSurfZoneDepletionClaimed: false },
      uncertainty: { limitations: ['synthetic'] },
    },
  });
  const state = {
    schemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
    modelId: NEXT_RAVSCORE_MODEL_ID,
    variantId: NEXT_RAVSCORE_VARIANT_ID,
    profileId: NEXT_RAVSCORE_STATE_PROFILE_ID,
    migrationId: NEXT_RAVSCORE_STATE_MIGRATION_ID,
    priors: NEXT_RAVSCORE_PRIORS,
    automaticActivationAllowed: false,
    transportMemoryReady: true,
    transportMemoryStatus: 'READY',
    currentState: { schemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION, modelId: NEXT_RAVSCORE_MODEL_ID },
    modes: { waders: mode(61), beach: mode(70) },
  };
  const document = { coastalParts: {
    scoreProfile: {
      activeProfileId: NEXT_RAVSCORE_MODEL_ID,
      modelProfileId: NEXT_RAVSCORE_MODEL_ID,
      rollbackProfileId: null,
      legacyPublicFallbackAllowed: false,
      publicAvailabilityPolicy: NEXT_RAVSCORE_AVAILABILITY_POLICY,
    },
    scoreAvailability: { policy: NEXT_RAVSCORE_AVAILABILITY_POLICY },
    zones: { z1: {} },
    parts: { p1: { ravScore: state, current: { waders: projected(61), beach: projected(70) } } },
  } };
  const report = auditNextGenerationPublicRuntime(document, { expectedZoneCount: 1, expectedPartCount: 1 });
  assert.equal(report.ok, true, report.failures.join(', '));
  const invalid = structuredClone(document);
  invalid.coastalParts.parts.p1.current.beach.explanation.transportDiagnostics.surfZoneResolved = true;
  assert.equal(auditNextGenerationPublicRuntime(invalid, { expectedZoneCount: 1, expectedPartCount: 1 }).ok, false);
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-runtime-audit-'));
  const nestedOutput = path.join(temporaryRoot, 'missing-parent', 'audit.json');
  await writeAuditReport(nestedOutput, report);
  assert.equal(JSON.parse(await fs.readFile(nestedOutput, 'utf8')).ok, true);
  await fs.rm(temporaryRoot, { recursive: true, force: true });
  console.log('OK: integreret RavScore-runtimeaudit låser model, state, projektion, usikkerhed og fail-closed-kontrakt.');
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const inputIndex = process.argv.indexOf('--input');
  const input = inputIndex >= 0 ? process.argv[inputIndex + 1] : 'data/live/conditions.json';
  const outputIndex = process.argv.indexOf('--output');
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  const report = auditNextGenerationPublicRuntime(JSON.parse(await fs.readFile(input, 'utf8')), {
    requireAllReady: !process.argv.includes('--allow-local-warmup'),
  });
  if (output) await writeAuditReport(output, report);
  if (!report.ok) throw new Error(`RavScore-runtimeaudit fejlede: ${report.failures.slice(0, 20).join(', ')}`);
  console.log(`OK: ${report.coverage.zoneCount} zoner, ${report.coverage.partCount} kystdele og ${report.coverage.modeEvaluationCount} modelprojektioner.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
