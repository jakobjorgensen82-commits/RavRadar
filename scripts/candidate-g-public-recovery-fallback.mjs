#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  schemaVersion: 1,
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
  if (Number(descriptor?.audit?.memoryReadyPartCount) !== policy.expectedPartCount) errors.push('MEMORY_READY_COUNT_MISMATCH');
  if (Number(descriptor?.audit?.modeEvaluationCount) !== policy.expectedPartCount * 2) errors.push('MODE_EVALUATION_COUNT_MISMATCH');
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

// En bevaret nødvisning kan være bygget af en ældre appversion. Genopbyg kun
// dens offentlige opstartsprojektion og deterministiske femdøgnsindeks fra den
// allerede auditerede detaljepakke, og bind projektionen til en ny hash.
// Detaljepakken, dataset-id, tider, scorer og Candidate G-state ændres ikke.
export function upgradeRecoveryFallbackBundle(bundle) {
  const conditions = bundle?.conditions || {};
  const details = bundle?.details || {};
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
  const upgradedConditions = { ...conditions, nationalForecast, coastalParts };
  return {
    ...bundle,
    descriptor: {
      ...(bundle?.descriptor || {}),
      publicConditionsSha256: sha256Text(compactJson(upgradedConditions)),
    },
    conditions: upgradedConditions,
    details,
  };
}

export function selectNewestRecoveryFallbackCandidate(candidates, { nowMs = Date.now() } = {}) {
  return candidates
    .map(candidate => {
      const bundle = upgradeRecoveryFallbackBundle(candidate.bundle);
      return { ...candidate, bundle, validation: validateRecoveryFallbackBundle(bundle, { nowMs }) };
    })
    .filter(candidate => candidate.validation.ok)
    .sort((left, right) => Date.parse(right.bundle.descriptor.generatedAt) - Date.parse(left.bundle.descriptor.generatedAt))[0] || null;
}

function descriptorFor({ full, publicDocument, detailsDocument, audit }) {
  const publicText = compactJson(publicDocument);
  const detailsText = compactJson(detailsDocument);
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
    audit: {
      status: audit.status,
      zoneCount: audit.coverage.zoneCount,
      partCount: audit.coverage.partCount,
      memoryReadyPartCount: audit.stateContinuation.memoryReadyPartCount,
      modeEvaluationCount: audit.coverage.modeEvaluationCount,
      scoreReconstructionMismatchCount: audit.scoreReconstructionMismatchCount,
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
      schemaVersion: 1,
      status: 'last-verified-candidate-g-ready',
      datasetId: fallback.datasetId,
      generatedAt: fallback.generatedAt,
      productionReferenceAt: fallback.productionReferenceAt || null,
      validUntil: fallback.validUntil || null,
      maximumAgeHours: fallback.maximumAgeHours,
      publicConditionsSha256: fallback.publicConditionsSha256,
      publicConditionDetailsSha256: fallback.publicConditionDetailsSha256,
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
    const policy = CANDIDATE_G_RECOVERY_FALLBACK_POLICY;
    if (audit.status === 'passed'
      && audit.stateContinuation.memoryReadyPartCount === policy.expectedPartCount
      && audit.coverage.modeEvaluationCount === policy.expectedPartCount * 2) {
      const publicDocument = buildPublicConditions(full);
      const detailsDocument = buildPublicConditionDetails(full);
      candidates.push({
        status: 'staged-hydrated-ready-dataset',
        bundle: {
          descriptor: descriptorFor({ full, publicDocument, detailsDocument, audit }),
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
    schemaVersion: 1,
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
