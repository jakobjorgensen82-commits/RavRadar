#!/usr/bin/env node
// Read-only normal dependency selection; no provider, production replay or score.
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
import { buildPrivateDmiRecoveryRecord } from './lib/private-dmi-recovery-record.mjs';
import { buildNewestValidRavScoreRecoverySources } from './lib/ravscore-recovery-source-priority.mjs';
import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';
import { verifiedProtectedDmiPartHourly } from './lib/protected-dmi-current-context.mjs';
import { verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { inspectDmiForecastGridSampling, inspectDmiNativeGridSampling } from './lib/dmi-forecast-store.mjs';

export const SAVED_DMI_ORIGINAL_PLAN_PATH = '.cache/dmi-grib/.original-recovery-plan.json';
export const SAVED_DMI_ORIGINAL_PROGRESS = '38692413809-1';
export const SAVED_DMI_ORIGINAL_PROGRESS_KEY = `weather-private-progress-encrypted-v2-Linux-main-${SAVED_DMI_ORIGINAL_PROGRESS}`;
export const SAVED_DMI_ORIGINAL_TARGET = '2026-10-14T18:00:00.000Z';
export const SAVED_DMI_ORIGINAL_SCOPES = Object.freeze([
  Object.freeze({ progressSource: SAVED_DMI_ORIGINAL_PROGRESS, progressCacheKey: SAVED_DMI_ORIGINAL_PROGRESS_KEY,
    progressBaselineTargetHour: SAVED_DMI_ORIGINAL_TARGET }),
  Object.freeze({ progressSource: '38768040429-1', progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-38768040429-1',
    progressBaselineTargetHour: '2026-10-15T16:00:00.000Z' }),
]);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const savedOriginalCanonicalJson = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeFailureCodes = new Set(['SCOPE_INVALID', 'HISTORY_DEMAND_UNAVAILABLE', 'DEMAND_INVALID',
  'DONOR_INVALID', 'ORIGINAL_SOURCE_INVALID', 'CAPTURE_INCOMPLETE', 'PLAN_BOUND', 'BINDING_INVALID',
  'CAPTURE_INVALID', 'PLAN_PATH_INVALID', 'PLAN_INVALID', 'ARGUMENTS_INVALID',
  'SELECTED_ENDPOINT_UNAVAILABLE', 'SELECTED_CURRENT_INVALID', 'HOLD_SUPPORT_UNAVAILABLE', 'INPUTS_UNAVAILABLE']
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
  if (!SAVED_DMI_ORIGINAL_SCOPES.some(scope => scope.progressSource === progressSource
    && scope.progressCacheKey === progressCacheKey && scope.progressBaselineTargetHour === progressBaselineTargetHour)
    || !/^[a-f0-9]{40}$/.test(executionHead ?? '')) refuse('SCOPE_INVALID');
}

// The same pure normal selector/time planner; never cold/week fallback.
export function savedDmiOriginalHistoryDemand({ conditions, parts, targetReferenceAt = SAVED_DMI_ORIGINAL_TARGET } = {}) {
  if (!SAVED_DMI_ORIGINAL_SCOPES.some(scope => scope.progressBaselineTargetHour === targetReferenceAt)) refuse('SCOPE_INVALID');
  if (!boundedParts(parts) || !object(conditions?.coastalParts?.parts)) refuse('HISTORY_DEMAND_UNAVAILABLE');
  try { assertRavScoreModelBinding(conditions.coastalParts.modelBinding); }
  catch { refuse('HISTORY_DEMAND_UNAVAILABLE'); }
  const demands = [];
  for (const part of parts.values()) {
    let demand;
    try { demand = planRavScoreCurrentHistoryForPart({ part,
      existingPart: conditions.coastalParts.parts[part.partId], targetReferenceAt }); }
    catch { refuse('HISTORY_DEMAND_UNAVAILABLE'); }
    if (demand.initialSource !== 'EXISTING_INTEGRATED' || demand.initialStateAt === null) refuse('HISTORY_DEMAND_UNAVAILABLE');
    demands.push(demand);
  }
  return demands.sort((a, b) => a.partId < b.partId ? -1 : a.partId > b.partId ? 1 : 0);
}

// The actual private normal caller, not the PUBLIC-only decoder preference or
// an independent union of every native donor. Inputs remain detached originals.
export function collectSelectedSavedDmiOriginalCaptures(options = {}) {
  return collectSelectedSavedDmiOriginalCapturesMeasured(options);
}

const PREFLIGHT_PROOF_CODES = new Set(['DMI_NATIVE_PROOF_SELECTION_INVALID',
  'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING', 'DMI_NATIVE_PROOF_NATIVE_CONFLICT',
  'DMI_NATIVE_PROOF_PROJECTION_MISMATCH', 'DMI_NATIVE_PROOF_ENDPOINT_MISMATCH',
  'DMI_NATIVE_PROOF_CONTEXT_INVALID', 'DMI_NATIVE_PROOF_CONTEXT_CONFLICT', 'DMI_NATIVE_PROOF_DONOR_BOUND']);
function target48hDiagnosticRelation(time, target) {
  const age = (Date.parse(target) - (typeof time === 'number' ? time : Date.parse(time))) / 3_600_000;
  return !Number.isFinite(age) ? 'UNAVAILABLE' : age < 0 ? 'AFTER_TARGET'
    : age <= 48 ? 'WITHIN_TARGET_48H' : 'BEFORE_TARGET_48H';
}

// The observer is private to this module. It receives fixed metadata only and
// never changes the ordinary fail-fast guards, source selection or originals.
function collectSelectedSavedDmiOriginalCapturesMeasured({ protectedBulk, progressCandidate = null,
  persistedHourlyByPart = new Map(), parts, demands,
  targetReferenceAt = SAVED_DMI_ORIGINAL_TARGET } = {}, observeFailure = null) {
  if (!boundedParts(parts) || !object(protectedBulk?.zones) || progressCandidate !== null && !object(progressCandidate?.zones)
    || !(persistedHourlyByPart instanceof Map) || !Array.isArray(demands) || demands.length !== parts.size
    || new Set(demands.map(row => row.partId)).size !== parts.size) refuse('INPUTS_UNAVAILABLE');
  if (!SAVED_DMI_ORIGINAL_SCOPES.some(scope => scope.progressBaselineTargetHour === targetReferenceAt)) refuse('SCOPE_INVALID');
  const originals = new Map(), targetMs = Date.parse(targetReferenceAt);
  for (const demand of demands) {
    const part = parts.get(demand.partId), expected = dmiExpectedIdentityForPart(part);
    const from = Date.parse(demand.startAt);
    if (!part || !expected || demand.endAt !== targetReferenceAt || demand.initialSource !== 'EXISTING_INTEGRATED'
      || !Number.isFinite(from) || from !== Date.parse(demand.initialStateAt) - 51 * 3_600_000
      || targetMs < from || targetMs - from > 123 * 3_600_000) refuse('DEMAND_INVALID');
    const persistedHourly = persistedHourlyByPart.get(part.partId)?.hourly ?? [];
    if (!Array.isArray(persistedHourly)) refuse('INPUTS_UNAVAILABLE');
    const containsRequiredHold = rows => rows.some(row => {
      const provenance = row.currentProvenance ?? row.sources?.current;
      const collection = row.currentStateOnlyHold?.collection ?? provenance?.collection;
      return Date.parse(row.time) >= from && Date.parse(row.time) <= targetMs
        && (!collection || dmiMarineCollectionAllowedForZone(collection, expected.parentZoneId))
        && (row.currentStateOnlyHold != null || provenance?.stateOnly === true
          || provenance?.status === 'verified-derived-state-only'
          || provenance?.classification === 'REGIONAL_DMI_DERIVED_HOLD');
    });
    if (containsRequiredHold(persistedHourly)) refuse('HOLD_SUPPORT_UNAVAILABLE');
    const feature = { properties: { id: expected.entityId, dataPoint: part.waterPoint } };
    const records = [], sanitizedCurrentLosses = new Set();
    for (const [document, previous] of [[protectedBulk, true], [progressCandidate, false]]) {
      if (document === null) { records.push(null); continue; }
      if (Object.hasOwn(document.zones, expected.entityId)) {
        const zone = document.zones[expected.entityId];
        if (!object(zone) || !object(zone.hourly) || Object.keys(zone.hourly).length > 10_000) refuse('DONOR_INVALID');
      }
      const record = buildPrivateDmiRecoveryRecord(feature, document, targetReferenceAt,
        { startAt: demand.startAt, expectedIdentity: expected,
          ...(previous ? { persistedHourly, protectPreviousDmi: true } : {}) });
      if (!record) { records.push(null); continue; }
      // No authenticated pilot is supplied in this original-only operation.
      // Never silently erase a required hold and call the result zero demand.
      if (containsRequiredHold(record.hourly)) refuse('HOLD_SUPPORT_UNAVAILABLE');
      const hourly = previous
        ? verifiedProtectedDmiPartHourly(record, [document], expected.entityId, part, { requireNativeGridSampling: false })
        : verifiedIntegratedPartHourly(record, document, expected.entityId, part, { requireNativeGridSampling: false });
      const sanitizedByTime = new Map(hourly.map(row => [row.time, row]));
      for (const row of record.hourly) {
        const provenance = row.currentProvenance ?? row.sources?.current, sanitized = sanitizedByTime.get(row.time);
        const time = Date.parse(row.time);
        if (time >= from && time <= targetMs
          && Number.isFinite(row.currentUMps) && Number.isFinite(row.currentVMps)
          && provenance?.provider === 'dmi'
          && dmiMarineCollectionAllowedForZone(provenance?.collection, expected.parentZoneId)
          && (!Number.isFinite(sanitized?.currentUMps) || !Number.isFinite(sanitized?.currentVMps))) {
          sanitizedCurrentLosses.add(time);
        }
      }
      records.push({ source: previous ? 'deployed-private-runtime' : 'progressive-private-dmi',
        nativeCurrentContexts: [document], record: { ...record, hourly } });
    }
    const selected = buildNewestValidRavScoreRecoverySources({ fallbackSource: records[0], preferredSource: records[1],
      protectedPreviousSource: records[0], productionReferenceAt: targetReferenceAt, part });
    const verifiedSelectedTimes = new Set();
    for (const source of selected) {
      const inspector = createProtectedDmiNativeCurrentInspector({ contexts: source.nativeCurrentContexts ?? [] });
      for (const row of source.record?.hourly ?? []) {
        const time = Date.parse(row.time);
        if (time < from || time > targetMs || !Number.isFinite(row.currentUMps) || !Number.isFinite(row.currentVMps)) continue;
        const provenance = row.currentProvenance?.status === 'verified' ? row.currentProvenance : row.sources?.current;
        if (provenance?.provider !== 'dmi') continue; // No DMI original is inferred from another provider's selected row.
        if (!['dkss_lf', 'dkss_nsbs', 'dkss_idw'].includes(provenance.collection)) refuse('SELECTED_CURRENT_INVALID');
        if (!dmiMarineCollectionAllowedForZone(provenance?.collection, expected.parentZoneId)) continue;
        const proof = inspector.inspectOriginals({ part, row });
        if (!proof.ok && observeFailure) observeFailure({ branch: 'INSPECT_ORIGINALS_REJECTED',
          reasonCode: PREFLIGHT_PROOF_CODES.has(proof.code) ? proof.code : 'DMI_NATIVE_PROOF_INVALID',
          target48hRelation: target48hDiagnosticRelation(row.time, targetReferenceAt) });
        if (!proof.ok) refuse('SELECTED_ENDPOINT_UNAVAILABLE');
        const sampling = inspectDmiForecastGridSampling(provenance, 'current', row.time, expected).status;
        if (!['unknown', 'coherent'].includes(sampling)) refuse('SELECTED_CURRENT_INVALID');
        for (const native of proof.nativeRows) {
          const nativeMs = Date.parse(native.time), endpoint = native.source;
          if (!Number.isFinite(nativeMs) || nativeMs < from - 3 * 3_600_000
            || nativeMs > targetMs + 3 * 3_600_000) refuse('DEMAND_INVALID');
          const status = inspectDmiNativeGridSampling(endpoint).status;
          if (status === 'coherent') continue;
          if (status !== 'unknown' || endpoint.nativeGridSampling != null) refuse('SELECTED_CURRENT_INVALID');
          const capture = canonicalSavedDmiOriginalCapture(endpoint);
          if (!capture) refuse('CAPTURE_INCOMPLETE');
          originals.set(savedOriginalCanonicalJson(capture), capture);
          if (originals.size > 4096) refuse('PLAN_BOUND');
        }
        verifiedSelectedTimes.add(time);
      }
    }
    // A rejected donor is not a restore dependency when the normal priority
    // actually selected a same-hour replacement whose own native endpoints
    // passed every check above. Otherwise sanitizer loss must never become
    // apparent zero demand. This is not an independent donor union/admission.
    if (observeFailure) {
      const first = [...sanitizedCurrentLosses].filter(time => !verifiedSelectedTimes.has(time)).sort((a, b) => a - b)[0];
      if (first !== undefined) observeFailure({ branch: 'SANITIZER_LOSS_UNCOVERED',
        reasonCode: 'SANITIZER_CURRENT_LOSS_UNCOVERED',
        target48hRelation: target48hDiagnosticRelation(first, targetReferenceAt) });
    }
    if ([...sanitizedCurrentLosses].some(time => !verifiedSelectedTimes.has(time))) refuse('SELECTED_ENDPOINT_UNAVAILABLE');
  }
  return [...originals].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, capture]) => capture);
}

// Read-only FIRST failure for ONE actual part. A stopped collector cannot
// establish complete row coverage or release the original preparation guard.
export function inspectSelectedSavedDmiOriginalCaptures(options = {}) {
  if (!(options.parts instanceof Map) || options.parts.size !== 1) refuse('INPUTS_UNAVAILABLE');
  let firstFailure = null;
  try {
    collectSelectedSavedDmiOriginalCapturesMeasured(options, failure => { firstFailure ??= failure; });
    return { status: 'MEASURED', inspectionScope: 'FIRST_FAILURE_PER_PART', firstFailure: null };
  } catch (error) {
    if (error?.originalPlanCode === 'SAVED_DMI_ORIGINAL_HOLD_SUPPORT_UNAVAILABLE') {
      firstFailure = { branch: 'HOLD_SUPPORT_UNAVAILABLE', reasonCode: 'HOLD_SUPPORT_UNAVAILABLE',
        target48hRelation: 'UNAVAILABLE' };
    } else if (error?.originalPlanCode !== 'SAVED_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE' || !firstFailure) throw error;
    return { status: 'PARTIAL', inspectionScope: 'FIRST_FAILURE_PER_PART',
      firstFailure: { ...firstFailure, code: error.originalPlanCode } };
  }
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
  progressSource = SAVED_DMI_ORIGINAL_PROGRESS, progressCacheKey = SAVED_DMI_ORIGINAL_PROGRESS_KEY,
  targetReferenceAt = SAVED_DMI_ORIGINAL_TARGET,
  nonce = crypto.randomBytes(16).toString('hex') } = {}) {
  assertSavedDmiOriginalRestoreScope({ progressSource, progressCacheKey, progressBaselineTargetHour: targetReferenceAt, executionHead });
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
  if (unique.size > 4096 || demands.some(row => row.endAt !== targetReferenceAt)) refuse('PLAN_BOUND');
  const originals = [...unique].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value);
  return { schemaVersion: 1, contractId: 'dmi-exact-original-restore-v1', binding: {
    progressSource, progressCacheKey,
    targetReferenceAt, sourceHead: source.sourceHead, executionHead,
    protectedBundleSha256: source.bundleContentSha256, protectedDatasetId: source.datasetId,
    protectedProductionReferenceAt: source.productionReferenceAt, protectedGeneratedAt: source.generatedAt,
    modelBindingSha256: sha(savedOriginalCanonicalJson(source.modelBinding)),
    historyDemandSha256: sha(savedOriginalCanonicalJson(demands)),
    originalsSha256: sha(savedOriginalCanonicalJson(originals)), nonce,
  }, originals };
}

export async function writeSavedDmiOriginalRestorePlan({ repositoryRoot = ROOT, plan } = {}) {
  if (!object(plan) || plan.contractId !== 'dmi-exact-original-restore-v1' || !Array.isArray(plan.originals)) refuse('PLAN_INVALID');
  if (plan.originals.length === 0) {
    const existing = await fs.lstat(path.resolve(repositoryRoot, SAVED_DMI_ORIGINAL_PLAN_PATH))
      .catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (existing) refuse('PLAN_PATH_INVALID');
    return { schemaVersion: 1, kind: 'SAVED_DMI_ORIGINAL_RESTORE_PREPARATION',
      status: 'NO_ORIGINAL_RESTORE_REQUIRED', originalCount: 0, planBytes: 0, planSha256: '',
      privatePayloadIncluded: false, providerRequestsPerformed: false, remoteWrites: false,
      semanticUnionPerformed: false, replayPerformed: false, scoreBuilt: false, sourceAdmissionPerformed: false };
  }
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
      `preparation_status=${report.status}\nplan_sha256=${report.planSha256}\noriginal_count=${report.originalCount}\nplan_bytes=${report.planBytes}\n`);
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
