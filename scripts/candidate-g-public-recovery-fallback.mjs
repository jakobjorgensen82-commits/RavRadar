#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY,
  isReconstructedTransportEvidence,
} from '../js/core/ravscore-regime-memory.js';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { auditCandidateGPublicShadow } from './audit-ravscore-candidate-g-public-shadow.mjs';
import {
  buildPublicConditions,
  buildPublicConditionDetails,
  buildPublicNationalForecast,
  buildStartupCoastalParts,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';

export const CANDIDATE_G_RECOVERY_FALLBACK_POLICY = Object.freeze({
  schemaVersion: 2,
  legacySchemaVersion: 1,
  expectedZoneCount: 210,
  expectedPartCount: 673,
  maximumLocalWarmupPartCount: 6,
  maximumAgeHours: 72,
  cacheConditionsName: 'public-conditions.json',
  cacheDetailsName: 'public-condition-details.json',
  cacheDescriptorName: 'descriptor.json',
  publicConditionsName: 'candidate-g-last-verified-public-conditions.json',
  publicDetailsName: 'candidate-g-last-verified-public-condition-details.json',
});

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const hoursOld = (generatedAt, nowMs) => (nowMs - Date.parse(generatedAt || '')) / 3_600_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const STATE_KEY_PATTERN = /^sha256:[a-f0-9]{64}$/;
const COMPACT_STATE_KEYS = Object.freeze([
  'mobilisationPotential',
  'modelId',
  'outboundEpisodeEffectiveHours',
  'profileId',
  'schemaVersion',
  'stateKey',
  'time',
  'transportReferenceAt',
  'transportEvidence',
  'transportMemoryCoverageHours',
  'transportMemoryReady',
  'transportMemoryStatus',
  'transportMemoryWindowHours',
  'transportPotential',
  'variantId',
].sort());

const VERIFIED_ONLY_TRUST = Object.freeze({
  schemaVersion: 1,
  status: 'VERIFIED_ONLY',
  calibrationEligible: true,
  hardObservedOuttransportEligible: true,
  incidentId: null,
  affectedPartCount: 0,
  syntheticSampleCount: 0,
  activeUntil: null,
});

function trustSha256(value) {
  return sha256Text(compactJson(value));
}

function verifiedOnlyTrust(value) {
  return value && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === Object.keys(VERIFIED_ONLY_TRUST).sort().join(',')
    && value?.schemaVersion === VERIFIED_ONLY_TRUST.schemaVersion
    && value?.status === VERIFIED_ONLY_TRUST.status
    && value?.calibrationEligible === true
    && value?.hardObservedOuttransportEligible === true
    && value?.incidentId === null
    && Number(value?.affectedPartCount) === 0
    && Number(value?.syntheticSampleCount) === 0
    && value?.activeUntil === null;
}

function finiteInRange(value, minimum, maximum) {
  return typeof value !== 'boolean' && value !== null && value !== ''
    && Number.isFinite(Number(value)) && Number(value) >= minimum && Number(value) <= maximum;
}

function exactReadyAuditMetadata(descriptor) {
  const audit = descriptor?.audit;
  return audit?.status === 'passed'
    && Number(audit.zoneCount) === CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedZoneCount
    && Number(audit.partCount) === CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedPartCount
    && Number(audit.memoryReadyPartCount) === CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedPartCount
    && Number(audit.modeEvaluationCount) === CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedPartCount * 2
    && Number(audit.scoreReconstructionMismatchCount) === 0;
}

function measuredOnlyReadyProjection(details) {
  const errors = [];
  const coastal = details?.coastalParts;
  const parts = Object.entries(coastal?.parts || {});
  const zones = Object.entries(coastal?.zones || {});
  if (parts.length !== CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedPartCount) {
    errors.push('MEASURED_STATE_PART_COUNT_MISMATCH');
  }
  if (zones.length !== CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedZoneCount) {
    errors.push('MEASURED_STATE_ZONE_COUNT_MISMATCH');
  }
  if (Number(coastal?.expectedPartCount) !== CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedPartCount
    || Number(coastal?.scoredPartCount) !== CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedPartCount) {
    errors.push('MEASURED_STATE_COASTAL_ACCOUNTING_MISMATCH');
  }
  let readyPartCount = 0;
  let measuredStateCount = 0;
  let modeEvaluationCount = 0;
  const partCountByZone = new Map();
  for (const [, part] of parts) {
    partCountByZone.set(part?.zoneId, (partCountByZone.get(part?.zoneId) || 0) + 1);
  }
  for (const [zoneId, zone] of zones) {
    if (Number(zone?.expectedPartCount) !== (partCountByZone.get(zoneId) || 0)
      || Number(zone?.scoredPartCount) !== Number(zone?.expectedPartCount)) {
      errors.push('MEASURED_STATE_ZONE_ACCOUNTING_MISMATCH');
      break;
    }
  }
  for (const [partId, part] of parts) {
    const candidate = part?.candidateG;
    const state = candidate?.currentState;
    let valid = true;
    const reject = () => { valid = false; };
    if (!part?.zoneId || !coastal?.zones?.[part.zoneId]) reject();
    if (candidate?.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
      || candidate?.modelId !== CANDIDATE_G_STATE_MODEL_ID
      || candidate?.variantId !== CANDIDATE_G_STATE_VARIANT_ID
      || candidate?.profileId !== CANDIDATE_G_STATE_PROFILE_ID) reject();
    if (candidate?.transportMemoryReady !== true
      || candidate?.transportMemoryStatus !== 'READY'
      || Number(candidate?.transportMemoryCoverageHours) !== CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours) reject();
    if (!state || Object.keys(state).sort().join(',') !== COMPACT_STATE_KEYS.join(',')) reject();
    if (state?.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
      || state?.modelId !== CANDIDATE_G_STATE_MODEL_ID
      || state?.variantId !== CANDIDATE_G_STATE_VARIANT_ID
      || state?.profileId !== CANDIDATE_G_STATE_PROFILE_ID
      || !STATE_KEY_PATTERN.test(String(state?.stateKey || ''))) reject();
    if (state?.transportMemoryReady !== true
      || state?.transportMemoryStatus !== 'READY'
      || Number(state?.transportMemoryWindowHours) !== CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours
      || Number(state?.transportMemoryCoverageHours) !== CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours) reject();
    if (!finiteInRange(state?.transportPotential, 0, 100)
      || !finiteInRange(state?.outboundEpisodeEffectiveHours, 0, Number.MAX_SAFE_INTEGER)
      || !finiteInRange(state?.mobilisationPotential, 0, 100)) reject();
    const referenceMs = Date.parse(candidate?.transportReferenceAt || '');
    if (!Number.isFinite(referenceMs)
      || state?.transportReferenceAt !== candidate?.transportReferenceAt
      || state?.time !== candidate?.referenceAt
      || state?.time !== part?.current?.time) reject();
    const evidence = state?.transportEvidence;
    if (!Array.isArray(evidence) || evidence.length < 17 || evidence.length > 49) reject();
    if (Array.isArray(evidence)) {
      for (let index = 0; index < evidence.length; index += 1) {
        const item = evidence[index];
        const itemMs = Date.parse(item?.time || '');
        const previousMs = index ? Date.parse(evidence[index - 1]?.time || '') : null;
        if (!item || Object.keys(item).sort().join(',') !== 'strength,time'
          || !Number.isFinite(itemMs)
          || item.time !== new Date(itemMs).toISOString()
          || !finiteInRange(item.strength, -1, 1)
          || (index > 0 && (!(itemMs > previousMs)
            || (itemMs - previousMs) / 3_600_000 > CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.maximumGapHours))) reject();
      }
      if (Date.parse(evidence.at(-1)?.time || '') !== referenceMs) reject();
    }
    try {
      const replay = buildBoundedCurrentTransportMemory(evidence || [], {
        referenceTime: candidate?.transportReferenceAt,
      });
      if (replay.memoryReady !== true || replay.status !== 'READY'
        || Number(replay.coverageHours) !== CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours
        || Math.abs(Number(replay.result?.transportPotential) - Number(state?.transportPotential)) > 1e-9
        || Math.abs(Number(replay.result?.outboundEpisodeEffectiveHours)
          - Number(state?.outboundEpisodeEffectiveHours)) > 1e-9) reject();
    } catch {
      reject();
    }
    for (const mode of ['waders', 'beach']) {
      const modeState = candidate?.modes?.[mode];
      const activeState = part?.current?.[mode];
      if (modeState?.available === true
        && finiteInRange(modeState?.score, 0, 100)
        && activeState?.available === true
        && Number(activeState?.score) === Number(modeState?.score)) modeEvaluationCount += 1;
      else reject();
    }
    if (valid) {
      readyPartCount += 1;
      measuredStateCount += 1;
    } else if (errors.length < 12) {
      errors.push(`MEASURED_STATE_INVALID:${partId}`);
    }
  }
  if (readyPartCount !== CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedPartCount) {
    errors.push('MEASURED_READY_STATE_COUNT_MISMATCH');
  }
  if (modeEvaluationCount !== CANDIDATE_G_RECOVERY_FALLBACK_POLICY.expectedPartCount * 2) {
    errors.push('MEASURED_MODE_EVALUATION_COUNT_MISMATCH');
  }
  return { errors, readyPartCount, measuredStateCount, modeEvaluationCount };
}

function reconstructionSummary(full) {
  const parts = Object.values(full?.coastalParts?.parts || {});
  const reconstructedByPart = parts.map(part => (part?.candidateG?.currentState?.transportEvidence || [])
    .filter(isReconstructedTransportEvidence).length);
  return {
    reconstructedPartCount: reconstructedByPart.filter(count => count > 0).length,
    reconstructedTransportEvidenceCount: reconstructedByPart.reduce((sum, count) => sum + count, 0),
  };
}

async function atomicWrite(file, text) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temporary, text);
  await fs.rename(temporary, file);
}

function latestForecastTime(details) {
  const times = Object.values(details?.zones || {})
    .flatMap(zone => zone?.forecast?.hourly || [])
    .map(row => Date.parse(row?.time || ''))
    .filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

export function validateRecoveryFallbackBundle({ descriptor, conditions, details }, {
  nowMs = Date.now(),
  enforceAge = true,
} = {}) {
  const policy = CANDIDATE_G_RECOVERY_FALLBACK_POLICY;
  const errors = [];
  if (descriptor?.schemaVersion !== policy.schemaVersion) errors.push('DESCRIPTOR_SCHEMA_MISMATCH');
  if (descriptor?.status !== 'last-verified-candidate-g-ready') errors.push('DESCRIPTOR_STATUS_MISMATCH');
  if (!descriptor?.datasetId || descriptor.datasetId !== conditions?.datasetId || descriptor.datasetId !== details?.datasetId) {
    errors.push('DATASET_ID_MISMATCH');
  }
  if (!descriptor?.generatedAt
    || descriptor.generatedAt !== conditions?.generatedAt
    || descriptor.generatedAt !== details?.generatedAt) {
    errors.push('GENERATED_AT_MISMATCH');
  }
  if (Object.keys(conditions?.zones || {}).length !== policy.expectedZoneCount) errors.push('STARTUP_ZONE_COUNT_MISMATCH');
  if (Object.keys(details?.zones || {}).length !== policy.expectedZoneCount) errors.push('DETAIL_ZONE_COUNT_MISMATCH');
  if (Object.keys(details?.coastalParts?.parts || {}).length !== policy.expectedPartCount) errors.push('COASTAL_PART_COUNT_MISMATCH');
  if (!exactReadyAuditMetadata(descriptor)) errors.push('READY_AUDIT_METADATA_MISMATCH');
  if (Number(descriptor?.audit?.reconstructedPartCount) !== 0
    || Number(descriptor?.audit?.reconstructedTransportEvidenceCount) !== 0) {
    errors.push('RECONSTRUCTED_SOURCE_NOT_ALLOWED');
  }
  const stateInspection = measuredOnlyReadyProjection(details);
  errors.push(...stateInspection.errors);
  const conditionTrust = conditions?.ravScoreEvidenceTrust;
  const detailTrust = details?.ravScoreEvidenceTrust;
  const partTrustBound = Object.values(details?.coastalParts?.parts || {}).every(part =>
    verifiedOnlyTrust(part?.candidateG?.evidenceTrust));
  if (!verifiedOnlyTrust(descriptor?.ravScoreEvidenceTrust)
    || !verifiedOnlyTrust(conditionTrust)
    || !verifiedOnlyTrust(detailTrust)
    || !verifiedOnlyTrust(conditions?.coastalParts?.evidenceTrust)
    || !verifiedOnlyTrust(details?.coastalParts?.evidenceTrust)
    || !partTrustBound
    || trustSha256(descriptor?.ravScoreEvidenceTrust) !== descriptor?.ravScoreEvidenceTrustSha256
    || trustSha256(conditionTrust) !== descriptor?.ravScoreEvidenceTrustSha256
    || trustSha256(detailTrust) !== descriptor?.ravScoreEvidenceTrustSha256
    || trustSha256(conditions?.coastalParts?.evidenceTrust) !== descriptor?.ravScoreEvidenceTrustSha256
    || trustSha256(details?.coastalParts?.evidenceTrust) !== descriptor?.ravScoreEvidenceTrustSha256) {
    errors.push('SOURCE_EVIDENCE_TRUST_MISMATCH');
  }
  const generatedAt = descriptor?.generatedAt || conditions?.generatedAt;
  const age = hoursOld(generatedAt, nowMs);
  if (!Number.isFinite(age) || age < 0) errors.push('GENERATED_AT_INVALID');
  if (enforceAge && age > policy.maximumAgeHours) errors.push('FALLBACK_TOO_OLD');
  const validUntilMs = Date.parse(descriptor?.validUntil || '');
  if (!Number.isFinite(validUntilMs)) errors.push('FORECAST_VALID_UNTIL_INVALID');
  if (enforceAge && Number.isFinite(validUntilMs) && nowMs > validUntilMs) errors.push('FALLBACK_FORECAST_EXPIRED');
  const conditionsText = compactJson(conditions);
  const detailsText = compactJson(details);
  if (descriptor?.publicConditionsSha256 !== sha256Text(conditionsText)) errors.push('STARTUP_HASH_MISMATCH');
  if (descriptor?.publicConditionDetailsSha256 !== sha256Text(detailsText)) errors.push('DETAIL_HASH_MISMATCH');
  return { ok: errors.length === 0, errors, ageHours: Number.isFinite(age) ? age : null };
}

export function validateLegacyRecoveryFallbackBundle({ descriptor, conditions, details }, {
  nowMs = Date.now(),
  enforceAge = true,
} = {}) {
  const policy = CANDIDATE_G_RECOVERY_FALLBACK_POLICY;
  const errors = [];
  if (descriptor?.schemaVersion !== policy.legacySchemaVersion) errors.push('LEGACY_DESCRIPTOR_SCHEMA_MISMATCH');
  if (descriptor?.status !== 'last-verified-candidate-g-ready') errors.push('DESCRIPTOR_STATUS_MISMATCH');
  if (!descriptor?.datasetId || descriptor.datasetId !== conditions?.datasetId || descriptor.datasetId !== details?.datasetId) {
    errors.push('DATASET_ID_MISMATCH');
  }
  if (!descriptor?.generatedAt || descriptor.generatedAt !== conditions?.generatedAt
    || descriptor.generatedAt !== details?.generatedAt) errors.push('GENERATED_AT_MISMATCH');
  if (!exactReadyAuditMetadata(descriptor)) errors.push('READY_AUDIT_METADATA_MISMATCH');
  if (Object.keys(conditions?.zones || {}).length !== policy.expectedZoneCount
    || Object.keys(details?.zones || {}).length !== policy.expectedZoneCount
    || Object.keys(details?.coastalParts?.parts || {}).length !== policy.expectedPartCount) {
    errors.push('LEGACY_PUBLIC_COVERAGE_MISMATCH');
  }
  const conditionsText = compactJson(conditions);
  const detailsText = compactJson(details);
  if (!SHA256_PATTERN.test(String(descriptor?.publicConditionsSha256 || ''))
    || descriptor.publicConditionsSha256 !== sha256Text(conditionsText)) errors.push('STARTUP_HASH_MISMATCH');
  if (!SHA256_PATTERN.test(String(descriptor?.publicConditionDetailsSha256 || ''))
    || descriptor.publicConditionDetailsSha256 !== sha256Text(detailsText)) errors.push('DETAIL_HASH_MISMATCH');
  const hasTrustField = descriptor?.ravScoreEvidenceTrust !== undefined
    || descriptor?.ravScoreEvidenceTrustSha256 !== undefined
    || conditions?.ravScoreEvidenceTrust !== undefined
    || conditions?.coastalParts?.evidenceTrust !== undefined
    || details?.ravScoreEvidenceTrust !== undefined
    || details?.coastalParts?.evidenceTrust !== undefined
    || Object.values(details?.coastalParts?.parts || {}).some(part => part?.candidateG?.evidenceTrust !== undefined);
  if (hasTrustField) errors.push('LEGACY_PARTIAL_TRUST_MARKER_NOT_ALLOWED');
  const stateInspection = measuredOnlyReadyProjection(details);
  errors.push(...stateInspection.errors);
  const generatedAt = descriptor?.generatedAt || conditions?.generatedAt;
  const age = hoursOld(generatedAt, nowMs);
  if (!Number.isFinite(age) || age < 0) errors.push('GENERATED_AT_INVALID');
  if (enforceAge && age > policy.maximumAgeHours) errors.push('FALLBACK_TOO_OLD');
  const validUntilMs = Date.parse(descriptor?.validUntil || '');
  if (!Number.isFinite(validUntilMs)) errors.push('FORECAST_VALID_UNTIL_INVALID');
  if (enforceAge && Number.isFinite(validUntilMs) && nowMs > validUntilMs) errors.push('FALLBACK_FORECAST_EXPIRED');
  return {
    ok: errors.length === 0,
    errors,
    ageHours: Number.isFinite(age) ? age : null,
    stateInspection,
  };
}

// En bevaret nødvisning kan være bygget af en ældre appversion. Genopbyg kun
// dens offentlige opstartsprojektion og deterministiske femdøgnsindeks fra den
// allerede auditerede detaljepakke, og bind projektionen til en ny hash.
// Detaljepakken, dataset-id, tider, scorer og Candidate G-state ændres ikke.
export function upgradeRecoveryFallbackBundle(bundle) {
  const sourceDescriptor = bundle?.descriptor || {};
  const sourceConditions = bundle?.conditions || {};
  const sourceDetails = bundle?.details || {};
  const legacy = sourceDescriptor.schemaVersion === CANDIDATE_G_RECOVERY_FALLBACK_POLICY.legacySchemaVersion;
  const sourceValidation = legacy
    ? validateLegacyRecoveryFallbackBundle(bundle, { enforceAge: false })
    : validateRecoveryFallbackBundle(bundle, { enforceAge: false });
  if (!sourceValidation.ok) {
    throw new Error(`Candidate G-fallbackkilden kan ikke opgraderes: ${sourceValidation.errors.join(',')}`);
  }
  const evidenceTrust = VERIFIED_ONLY_TRUST;
  const details = {
    ...sourceDetails,
    ravScoreEvidenceTrust: evidenceTrust,
    coastalParts: {
      ...sourceDetails.coastalParts,
      evidenceTrust,
      parts: Object.fromEntries(Object.entries(sourceDetails.coastalParts?.parts || {}).map(([partId, part]) => [partId, {
        ...part,
        candidateG: { ...part?.candidateG, evidenceTrust },
      }])),
    },
  };
  const conditions = {
    ...sourceConditions,
    ravScoreEvidenceTrust: evidenceTrust,
    coastalParts: sourceConditions.coastalParts
      ? { ...sourceConditions.coastalParts, evidenceTrust }
      : sourceConditions.coastalParts,
  };
  const zones = Object.fromEntries(Object.entries(conditions.zones || {}).map(([zoneId, zone]) => [zoneId, {
    ...zone,
    forecast: details.zones?.[zoneId]?.forecast || zone?.forecast || { hourly: [] },
  }]));
  const nationalForecast = buildPublicNationalForecast({
    datasetId: conditions.datasetId,
    generatedAt: conditions.generatedAt,
    productionReferenceAt: conditions.productionReferenceAt || details.productionReferenceAt || null,
    zones,
    coastalParts: details.coastalParts || conditions.coastalParts || null,
  });
  const coastalParts = buildStartupCoastalParts({
    datasetId: conditions.datasetId,
    generatedAt: conditions.generatedAt,
    productionReferenceAt: conditions.productionReferenceAt || details.productionReferenceAt || null,
    coastalParts: details.coastalParts || conditions.coastalParts || null,
  });
  const upgradedConditions = { ...conditions, ravScoreEvidenceTrust: evidenceTrust, nationalForecast, coastalParts };
  const upgradedDescriptor = {
    ...sourceDescriptor,
    schemaVersion: CANDIDATE_G_RECOVERY_FALLBACK_POLICY.schemaVersion,
    publicConditionsSha256: sha256Text(compactJson(upgradedConditions)),
    publicConditionDetailsSha256: sha256Text(compactJson(details)),
    ravScoreEvidenceTrust: evidenceTrust,
    ravScoreEvidenceTrustSha256: trustSha256(evidenceTrust),
    audit: {
      ...sourceDescriptor.audit,
      reconstructedPartCount: 0,
      reconstructedTransportEvidenceCount: 0,
    },
    ...(legacy ? {
      legacyUpgrade: {
        sourceSchemaVersion: CANDIDATE_G_RECOVERY_FALLBACK_POLICY.legacySchemaVersion,
        originalPublicConditionsSha256: sourceDescriptor.publicConditionsSha256,
        originalPublicConditionDetailsSha256: sourceDescriptor.publicConditionDetailsSha256,
        verifiedPartCount: sourceValidation.stateInspection.readyPartCount,
        verifiedModeEvaluationCount: sourceValidation.stateInspection.modeEvaluationCount,
        measuredOnlyStateCount: sourceValidation.stateInspection.measuredStateCount,
      },
    } : {}),
  };
  return {
    ...bundle,
    descriptor: upgradedDescriptor,
    conditions: upgradedConditions,
    details,
  };
}

export function selectNewestRecoveryFallbackCandidate(candidates, { nowMs = Date.now() } = {}) {
  return candidates
    .map(candidate => {
      try {
        const bundle = upgradeRecoveryFallbackBundle(candidate.bundle);
        return { ...candidate, bundle, validation: validateRecoveryFallbackBundle(bundle, { nowMs }) };
      } catch (error) {
        return { ...candidate, bundle: candidate.bundle, validation: { ok: false, errors: [error.message] } };
      }
    })
    .filter(candidate => candidate.validation.ok)
    .sort((left, right) => Date.parse(right.bundle.descriptor.generatedAt) - Date.parse(left.bundle.descriptor.generatedAt))[0] || null;
}

function descriptorFor({ full, publicDocument, detailsDocument, audit, reconstruction }) {
  const publicText = compactJson(publicDocument);
  const detailsText = compactJson(detailsDocument);
  const evidenceTrust = publicDocument?.ravScoreEvidenceTrust;
  if (!verifiedOnlyTrust(evidenceTrust)
    || trustSha256(evidenceTrust) !== trustSha256(detailsDocument?.ravScoreEvidenceTrust)
    || reconstruction.reconstructedPartCount !== 0
    || reconstruction.reconstructedTransportEvidenceCount !== 0) {
    throw new Error('Et rekonstrueret eller ubundet READY-datasæt må ikke mærkes som senest verificeret.');
  }
  return {
    schemaVersion: CANDIDATE_G_RECOVERY_FALLBACK_POLICY.schemaVersion,
    status: 'last-verified-candidate-g-ready',
    datasetId: full.datasetId,
    generatedAt: full.generatedAt,
    productionReferenceAt: full.productionReferenceAt || null,
    validUntil: latestForecastTime(detailsDocument),
    maximumAgeHours: CANDIDATE_G_RECOVERY_FALLBACK_POLICY.maximumAgeHours,
    publicConditionsSha256: sha256Text(publicText),
    publicConditionDetailsSha256: sha256Text(detailsText),
    ravScoreEvidenceTrust: evidenceTrust,
    ravScoreEvidenceTrustSha256: trustSha256(evidenceTrust),
    audit: {
      status: audit.status,
      zoneCount: audit.coverage.zoneCount,
      partCount: audit.coverage.partCount,
      memoryReadyPartCount: audit.stateContinuation.memoryReadyPartCount,
      modeEvaluationCount: audit.coverage.modeEvaluationCount,
      scoreReconstructionMismatchCount: audit.scoreReconstructionMismatchCount,
      reconstructedPartCount: reconstruction.reconstructedPartCount,
      reconstructedTransportEvidenceCount: reconstruction.reconstructedTransportEvidenceCount,
    },
    privacy: {
      compactPublicProjectionOnly: true,
      privateCacheIncluded: false,
      credentialsIncluded: false,
    },
  };
}

async function writeCacheBundle(cacheRoot, { descriptor, conditions, details }) {
  const policy = CANDIDATE_G_RECOVERY_FALLBACK_POLICY;
  await atomicWrite(path.join(cacheRoot, policy.cacheConditionsName), compactJson(conditions));
  await atomicWrite(path.join(cacheRoot, policy.cacheDetailsName), compactJson(details));
  await atomicWrite(path.join(cacheRoot, policy.cacheDescriptorName), `${JSON.stringify(descriptor, null, 2)}\n`);
}

async function readCacheBundle(cacheRoot) {
  const policy = CANDIDATE_G_RECOVERY_FALLBACK_POLICY;
  return {
    descriptor: await readJson(path.join(cacheRoot, policy.cacheDescriptorName)),
    conditions: await readJson(path.join(cacheRoot, policy.cacheConditionsName)),
    details: await readJson(path.join(cacheRoot, policy.cacheDetailsName)),
  };
}

async function fetchDeployedBundle(baseUrl, manifest) {
  const fallback = manifest?.recoveryFallback;
  if (fallback?.status !== 'active-last-verified') return null;
  const fetchJson = async relative => {
    const response = await fetch(new URL(String(relative).replace(/^\.\//, 'data/live/'), `${baseUrl.replace(/\/$/, '')}/`), {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };
  const [conditions, details] = await Promise.all([
    fetchJson(fallback.conditionsPath),
    fetchJson(fallback.conditionDetailsPath),
  ]);
  return {
    descriptor: {
      schemaVersion: Number(fallback.schemaVersion
        ?? CANDIDATE_G_RECOVERY_FALLBACK_POLICY.legacySchemaVersion),
      status: 'last-verified-candidate-g-ready',
      datasetId: fallback.datasetId,
      generatedAt: fallback.generatedAt,
      productionReferenceAt: fallback.productionReferenceAt || null,
      validUntil: fallback.validUntil || null,
      maximumAgeHours: fallback.maximumAgeHours,
      publicConditionsSha256: fallback.publicConditionsSha256,
      publicConditionDetailsSha256: fallback.publicConditionDetailsSha256,
      ravScoreEvidenceTrust: fallback.ravScoreEvidenceTrust,
      ravScoreEvidenceTrustSha256: fallback.ravScoreEvidenceTrustSha256,
      audit: fallback.sourceAudit,
      privacy: fallback.privacy,
    },
    conditions,
    details,
  };
}

export async function stageRecoveryFallback({
  sourcePath,
  manifestPath,
  cacheRoot,
  deployedBaseUrl = '',
  nowMs = Date.now(),
}) {
  const candidates = [];
  let cachedBundle = null;
  try {
    cachedBundle = await readCacheBundle(cacheRoot);
    candidates.push({ status: 'preserved-cache', bundle: cachedBundle });
  } catch {}

  if (deployedBaseUrl) {
    try {
      const manifest = await readJson(manifestPath);
      const deployed = await fetchDeployedBundle(deployedBaseUrl, manifest);
      if (deployed) {
        candidates.push({ status: 'restored-deployed-fallback', bundle: deployed });
      }
    } catch (error) {
      console.warn(`Deployet Candidate G-nødvisning kunne ikke genbruges: ${error.message}`);
    }
  }

  try {
    const full = await readJson(sourcePath);
    const audit = auditCandidateGPublicShadow(full);
    const reconstruction = reconstructionSummary(full);
    const policy = CANDIDATE_G_RECOVERY_FALLBACK_POLICY;
    if (audit.status === 'passed'
      && audit.stateContinuation.memoryReadyPartCount === policy.expectedPartCount
      && audit.coverage.modeEvaluationCount === policy.expectedPartCount * 2
      && reconstruction.reconstructedPartCount === 0
      && reconstruction.reconstructedTransportEvidenceCount === 0) {
      const publicDocument = buildPublicConditions(full);
      const detailsDocument = buildPublicConditionDetails(full);
      candidates.push({
        status: 'staged-hydrated-ready-dataset',
        bundle: {
          descriptor: descriptorFor({ full, publicDocument, detailsDocument, audit, reconstruction }),
          conditions: publicDocument,
          details: detailsDocument,
        },
      });
    }
  } catch (error) {
    console.warn(`Det hydrerede Candidate G-grundlag kunne ikke auditeres til nødvisning: ${error.message}`);
  }

  const selected = selectNewestRecoveryFallbackCandidate(candidates, { nowMs });
  if (!selected) throw new Error('Intet komplet, auditeret Candidate G-datasæt inden for 72 timer og egen prognosehorisont kunne klargøres til nødvisning.');
  const cacheRefreshed = !cachedBundle
    || cachedBundle.descriptor?.publicConditionsSha256 !== selected.bundle.descriptor.publicConditionsSha256
    || cachedBundle.descriptor?.publicConditionDetailsSha256 !== selected.bundle.descriptor.publicConditionDetailsSha256;
  await writeCacheBundle(cacheRoot, selected.bundle);
  return {
    status: selected.status,
    datasetId: selected.bundle.descriptor.datasetId,
    ageHours: selected.validation.ageHours,
    cacheRefreshed,
  };
}

async function removeIfPresent(file) {
  await fs.unlink(file).catch(error => {
    if (error?.code !== 'ENOENT') throw error;
  });
}

export async function publishRecoveryFallback({ auditPath, manifestPath, cacheRoot, outputRoot, nowMs = Date.now() }) {
  const audit = await readJson(auditPath);
  const manifest = await readJson(manifestPath);
  const policy = CANDIDATE_G_RECOVERY_FALLBACK_POLICY;
  if (audit.status !== 'passed') throw new Error('Den aktuelle Candidate G-runtime må ikke publiceres efter en fejlet audit.');
  const ready = Number(audit.stateContinuation?.memoryReadyPartCount || 0);
  const warmup = Number(audit.stateContinuation?.warmupPartCount || 0);
  const publicConditionsPath = path.join(outputRoot, policy.publicConditionsName);
  const publicDetailsPath = path.join(outputRoot, policy.publicDetailsName);
  if (ready === policy.expectedPartCount) {
    delete manifest.recoveryFallback;
    await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await removeIfPresent(publicConditionsPath);
    await removeIfPresent(publicDetailsPath);
    return { status: 'inactive-current-runtime-ready', datasetId: manifest.datasetId };
  }
  const completeAccounting = ready + warmup === policy.expectedPartCount;
  const globalRecovery = ready === 0 && warmup === policy.expectedPartCount;
  const boundedLocalRecovery = ready > 0 && warmup > 0 && warmup <= policy.maximumLocalWarmupPartCount;
  if (!completeAccounting || (!globalRecovery && !boundedLocalRecovery)) {
    throw new Error(`Uventet delvis national Candidate G-recovery: ready=${ready}, warmup=${warmup}.`);
  }
  const bundle = upgradeRecoveryFallbackBundle(await readCacheBundle(cacheRoot));
  const validation = validateRecoveryFallbackBundle(bundle, { nowMs });
  if (!validation.ok) throw new Error(`Candidate G-nødvisningen er ikke publicerbar: ${validation.errors.join(',')}`);
  await writeCacheBundle(cacheRoot, bundle);
  await atomicWrite(publicConditionsPath, compactJson(bundle.conditions));
  await atomicWrite(publicDetailsPath, compactJson(bundle.details));
  manifest.recoveryFallback = {
    schemaVersion: CANDIDATE_G_RECOVERY_FALLBACK_POLICY.schemaVersion,
    status: 'active-last-verified',
    reason: globalRecovery
      ? 'candidate-g-verified-time-gap-recovery'
      : 'candidate-g-bounded-local-context-warmup',
    datasetId: bundle.descriptor.datasetId,
    generatedAt: bundle.descriptor.generatedAt,
    productionReferenceAt: bundle.descriptor.productionReferenceAt,
    validUntil: bundle.descriptor.validUntil,
    maximumAgeHours: policy.maximumAgeHours,
    conditionsPath: `./${policy.publicConditionsName}`,
    conditionDetailsPath: `./${policy.publicDetailsName}`,
    publicConditionsSha256: bundle.descriptor.publicConditionsSha256,
    publicConditionDetailsSha256: bundle.descriptor.publicConditionDetailsSha256,
    ravScoreEvidenceTrust: bundle.descriptor.ravScoreEvidenceTrust,
    ravScoreEvidenceTrustSha256: bundle.descriptor.ravScoreEvidenceTrustSha256,
    sourceAudit: bundle.descriptor.audit,
    primaryDatasetId: manifest.datasetId,
    primaryGeneratedAt: manifest.generatedAt,
    primaryMemoryReadyPartCount: ready,
    primaryWarmupPartCount: warmup,
    privacy: bundle.descriptor.privacy,
  };
  await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return {
    status: 'active-last-verified',
    datasetId: bundle.descriptor.datasetId,
    primaryDatasetId: manifest.datasetId,
    ageHours: validation.ageHours,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name, fallback) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : fallback;
  };
  const cacheRoot = value('--cache-root', '.cache/candidate-g-last-ready-public');
  let result;
  if (args.includes('--stage')) {
    result = await stageRecoveryFallback({
      sourcePath: value('--source', 'data/live/conditions.json'),
      manifestPath: value('--manifest', 'data/live/manifest.json'),
      cacheRoot,
      deployedBaseUrl: value('--deployed-base-url', process.env.RAVRADAR_DEPLOYED_BASE_URL || ''),
    });
  } else if (args.includes('--publish')) {
    result = await publishRecoveryFallback({
      auditPath: value('--audit', '.geometry-v2-work/candidate-g-public-runtime-audit.json'),
      manifestPath: value('--manifest', 'data/live/manifest.json'),
      cacheRoot,
      outputRoot: value('--output-root', 'data/live'),
    });
  } else {
    throw new Error('Brug --stage eller --publish.');
  }
  const githubOutput = value('--github-output', '');
  if (githubOutput && Object.hasOwn(result, 'cacheRefreshed')) {
    await fs.appendFile(githubOutput, `cache_refreshed=${result.cacheRefreshed ? 'true' : 'false'}\n`);
  }
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
