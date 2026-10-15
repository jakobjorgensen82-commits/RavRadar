#!/usr/bin/env node
// Private original metadata only. No provider, source selection, replay or score.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalSavedDmiOriginalCapture, prepareAuthenticatedSavedDmiOriginalRestore,
  savedAuditOriginalPreparationFailureCode }
  from './audit-saved-weather-inputs.mjs';
import { planRavScoreCurrentHistoryForPart } from './plan-ravscore-current-history.mjs';
import { dmiExpectedIdentityForPart, verifiedDmiNativeComponentSource, verifiedBulkCurrent }
  from './lib/ravscore-production-adapters.mjs';
import { dmiMarineCollectionAllowedForZone } from './lib/dmi-marine-zone-exclusions.mjs';
import { assertRavScoreModelBinding } from '../js/core/ravscore-model-contract.js';

export const SAVED_DMI_ORIGINAL_PLAN_PATH = '.cache/dmi-grib/.original-recovery-plan.json';
export const SAVED_DMI_ORIGINAL_PROGRESS = '38692413809-1';
export const SAVED_DMI_ORIGINAL_PROGRESS_KEY = `weather-private-progress-encrypted-v2-Linux-main-${SAVED_DMI_ORIGINAL_PROGRESS}`;
export const SAVED_DMI_ORIGINAL_TARGET = '2026-10-14T18:00:00.000Z';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const savedOriginalCanonicalJson = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeFailureCodes = new Set(['SCOPE_INVALID', 'HISTORY_DEMAND_UNAVAILABLE', 'DEMAND_INVALID',
  'DONOR_INVALID', 'ORIGINAL_SOURCE_INVALID', 'CAPTURE_INCOMPLETE', 'PLAN_BOUND', 'BINDING_INVALID',
  'CAPTURE_INVALID', 'PLAN_PATH_INVALID', 'PLAN_INVALID', 'ARGUMENTS_INVALID']
  .map(code => `SAVED_DMI_ORIGINAL_${code}`));
const refuse = code => { const error = new Error(`SAVED_DMI_ORIGINAL_${code}`);
  error.originalPlanCode = `SAVED_DMI_ORIGINAL_${code}`; throw error; };
const boundedParts = parts => parts instanceof Map && parts.size > 0 && parts.size <= 673;

export function savedDmiOriginalPreparationFailureCode(error) {
  try {
    if (safeFailureCodes.has(error?.originalPlanCode)) return error.originalPlanCode;
    return savedAuditOriginalPreparationFailureCode(error);
  } catch { return 'SAVED_DMI_ORIGINAL_PREPARATION_REFUSED'; }
}

export function assertSavedDmiOriginalRestoreScope({ progressSource, progressCacheKey,
  progressBaselineTargetHour, executionHead } = {}) {
  if (progressSource !== SAVED_DMI_ORIGINAL_PROGRESS || progressCacheKey !== SAVED_DMI_ORIGINAL_PROGRESS_KEY
    || progressBaselineTargetHour !== SAVED_DMI_ORIGINAL_TARGET
    || !/^[a-f0-9]{40}$/.test(executionHead ?? '')) refuse('SCOPE_INVALID');
}

// The same pure normal selector/time planner; never cold/week fallback.
export function savedDmiOriginalHistoryDemand({ conditions, parts } = {}) {
  if (!boundedParts(parts) || !object(conditions?.coastalParts?.parts)) refuse('HISTORY_DEMAND_UNAVAILABLE');
  try { assertRavScoreModelBinding(conditions.coastalParts.modelBinding); }
  catch { refuse('HISTORY_DEMAND_UNAVAILABLE'); }
  const demands = [];
  for (const part of parts.values()) {
    let demand;
    try { demand = planRavScoreCurrentHistoryForPart({ part,
      existingPart: conditions.coastalParts.parts[part.partId], targetReferenceAt: SAVED_DMI_ORIGINAL_TARGET }); }
    catch { refuse('HISTORY_DEMAND_UNAVAILABLE'); }
    if (demand.initialSource !== 'EXISTING_INTEGRATED' || demand.initialStateAt === null) refuse('HISTORY_DEMAND_UNAVAILABLE');
    demands.push(demand);
  }
  return demands.sort((a, b) => a.partId < b.partId ? -1 : a.partId > b.partId ? 1 : 0);
}

// One already authenticated donor at a time; original shape/context checking
// does not assert NEW-use sampling or select a winning weather source.
export function collectSavedDmiOriginalCaptures({ document, parts, demands } = {}) {
  if (!boundedParts(parts) || !object(document?.zones) || !Array.isArray(demands)
    || demands.length !== parts.size || new Set(demands.map(row => row.partId)).size !== parts.size) refuse('DEMAND_INVALID');
  const originals = new Map();
  for (const demand of demands) {
    const part = parts.get(demand.partId), expected = dmiExpectedIdentityForPart(part);
    const from = Date.parse(demand.startAt), until = Date.parse(demand.endAt);
    if (!part || !expected || demand.endAt !== SAVED_DMI_ORIGINAL_TARGET
      || !Number.isFinite(from) || !Number.isFinite(until) || from > until
      || until - from > 123 * 3_600_000) refuse('DEMAND_INVALID');
    const zone = document.zones[expected.entityId];
    if (!zone) continue;
    if (!object(zone.hourly) || Object.keys(zone.hourly).length > 10_000) refuse('DONOR_INVALID');
    for (const row of Object.values(zone.hourly)) {
      const time = Date.parse(row?.time);
      if (!Number.isFinite(time) || time < from || time > until
        || !Number.isFinite(row?.['current-u']) || !Number.isFinite(row?.['current-v'])) continue;
      const source = row.sources?.current;
      if (!dmiMarineCollectionAllowedForZone(source?.collection, expected.parentZoneId)) continue;
      if (!object(source) || ['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours']
        .some(key => Object.hasOwn(source, key))
        || !verifiedDmiNativeComponentSource(source, row.time, 'current', expected)
        || !verifiedBulkCurrent(document, zone, part.waterPoint, source, row.time, expected)) refuse('ORIGINAL_SOURCE_INVALID');
      // Same normal planner skip rule; do not overwrite non-null receipts.
      if (source.nativeGridSampling != null) continue;
      const capture = canonicalSavedDmiOriginalCapture(source);
      if (!capture) refuse('CAPTURE_INCOMPLETE');
      originals.set(savedOriginalCanonicalJson(capture), capture);
      if (originals.size > 4096) refuse('PLAN_BOUND');
    }
  }
  return [...originals].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, capture]) => capture);
}

export function buildSavedDmiOriginalRestorePlan({ captures, source, demands, executionHead,
  nonce = crypto.randomBytes(16).toString('hex') } = {}) {
  assertSavedDmiOriginalRestoreScope({ progressSource: SAVED_DMI_ORIGINAL_PROGRESS,
    progressCacheKey: SAVED_DMI_ORIGINAL_PROGRESS_KEY, progressBaselineTargetHour: SAVED_DMI_ORIGINAL_TARGET, executionHead });
  if (!Array.isArray(captures) || captures.length > 5 * 4096 || !Array.isArray(demands) || !demands.length
    || !object(source?.modelBinding) || !/^[a-f0-9]{40}$/.test(source.sourceHead ?? '')
    || !/^[a-f0-9]{64}$/.test(source.bundleContentSha256 ?? '') || !/^[a-f0-9]{32}$/.test(nonce)
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(source.datasetId ?? '')) refuse('BINDING_INVALID');
  for (const key of ['productionReferenceAt', 'generatedAt']) {
    if (typeof source[key] !== 'string' || !Number.isFinite(Date.parse(source[key]))
      || new Date(source[key]).toISOString() !== source[key]) refuse('BINDING_INVALID');
  }
  const unique = new Map();
  for (const item of captures) {
    const capture = canonicalSavedDmiOriginalCapture(item);
    if (!capture || savedOriginalCanonicalJson(capture) !== savedOriginalCanonicalJson(item)) refuse('CAPTURE_INVALID');
    unique.set(savedOriginalCanonicalJson(capture), capture);
  }
  if (unique.size < 1 || unique.size > 4096) refuse('PLAN_BOUND');
  const originals = [...unique].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value);
  return { schemaVersion: 1, contractId: 'dmi-exact-original-restore-v1', binding: {
    progressSource: SAVED_DMI_ORIGINAL_PROGRESS, progressCacheKey: SAVED_DMI_ORIGINAL_PROGRESS_KEY,
    targetReferenceAt: SAVED_DMI_ORIGINAL_TARGET, sourceHead: source.sourceHead, executionHead,
    protectedBundleSha256: source.bundleContentSha256, protectedDatasetId: source.datasetId,
    protectedProductionReferenceAt: source.productionReferenceAt, protectedGeneratedAt: source.generatedAt,
    modelBindingSha256: sha(savedOriginalCanonicalJson(source.modelBinding)),
    historyDemandSha256: sha(savedOriginalCanonicalJson(demands)),
    originalsSha256: sha(savedOriginalCanonicalJson(originals)), nonce,
  }, originals };
}

export async function writeSavedDmiOriginalRestorePlan({ repositoryRoot = ROOT, plan } = {}) {
  const requested = path.resolve(repositoryRoot), rootStat = await fs.lstat(requested);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) refuse('PLAN_PATH_INVALID');
  const root = await fs.realpath(requested);
  let directory = root;
  for (const segment of ['.cache', 'dmi-grib']) {
    directory = path.join(directory, segment);
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) refuse('PLAN_PATH_INVALID');
  }
  if (!object(plan) || plan.contractId !== 'dmi-exact-original-restore-v1') refuse('PLAN_INVALID');
  const bytes = Buffer.from(savedOriginalCanonicalJson(plan) + '\n');
  if (bytes.length > 16 * 1024 * 1024) refuse('PLAN_BOUND');
  const file = await fs.open(path.join(root, SAVED_DMI_ORIGINAL_PLAN_PATH),
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
  return { schemaVersion: 1, kind: 'SAVED_DMI_ORIGINAL_RESTORE_PREPARATION', status: 'ORIGINAL_PLAN_PREPARED',
    originalCount: plan.originals.length, planBytes: bytes.length, planSha256: sha(bytes),
    privatePayloadIncluded: false, providerRequestsPerformed: false, remoteWrites: false,
    semanticUnionPerformed: false, replayPerformed: false, scoreBuilt: false, sourceAdmissionPerformed: false };
}

async function runPreparationCli() {
  try {
    const argv = process.argv.slice(2), options = { executionHead: process.env.GITHUB_SHA };
    if (argv.shift() !== 'prepare') refuse('ARGUMENTS_INVALID');
    const names = { '--private-root': 'privateRoot', '--descriptor': 'descriptorPath', '--predecessor-root': 'predecessorRoot',
      '--progress-file': 'progressFile', '--progress-source': 'progressSource', '--progress-cache-key': 'progressCacheKey',
      '--progress-baseline-target-hour': 'progressBaselineTargetHour', '--python': 'pythonExecutable' };
    while (argv.length) {
      const key = argv.shift(), value = argv.shift();
      if (!names[key] || !value || value.startsWith('--') || Object.hasOwn(options, names[key])) refuse('ARGUMENTS_INVALID');
      options[names[key]] = value;
    }
    const report = await prepareAuthenticatedSavedDmiOriginalRestore(options);
    if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,
      `plan_sha256=${report.planSha256}\noriginal_count=${report.originalCount}\nplan_bytes=${report.planBytes}\n`);
    console.log(JSON.stringify(report));
  } catch (error) {
    console.error(savedDmiOriginalPreparationFailureCode(error)); process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // The authenticated reader imports this module's pure planning functions.
  // Finish module evaluation before it awaits that import; a top-level await
  // here would make the actual CLI wait on its own unfinished evaluation.
  void runPreparationCli();
}
