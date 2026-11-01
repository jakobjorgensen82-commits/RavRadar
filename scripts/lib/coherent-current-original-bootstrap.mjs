// Private metadata preparation only. The caller must supply the unchanged
// authenticated normal B/S/cache objects. This module authenticates nothing,
// opens no RAW, creates no native evidence and changes no selected candidate.
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { assertCommittedRawRetentionInputs, projectCommittedRawRetentionPart }
  from '../plan-ravscore-current-history.mjs';
import { dmiExpectedIdentityForPart, verifiedBulkCurrent,
  verifiedDmiNativeComponentSource, verifiedDmiForecastComponentSource }
  from './ravscore-production-adapters.mjs';
import { inspectDmiForecastGridSampling, sameNativeIdentity } from './dmi-forecast-store.mjs';
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';
import { createProtectedDmiNativeCurrentInspector,
  PROTECTED_DMI_NATIVE_PROOF_LIMITS as LIMIT } from './protected-dmi-native-current-proofs.mjs';
import { nativeCurrentOriginalBankForPart } from './ravscore-recovery-source-priority.mjs';
import { coherentOriginalScopeLimits, coherentOriginalSourceViews, saved121DirectSelection } from './coherent-original-source-views.mjs';
export { SAVED_121_PROOF_ROLE as SAVED_FORECAST_121_ROLE } from './coherent-original-source-views.mjs';

const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const hash = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');
const refuse = code => { throw new Error('COHERENT_ORIGINAL_BOOTSTRAP_' + code); };
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const hour = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
// Preserve the existing 124-row support window and 600_000ms CURRENT metadata
// preparation budget. Exceeding any bound refuses the WHOLE preparation; no
// row/capture/reference is truncated. National capacity remains unproved.
const maximumWorkUnits = scope => LIMIT.parts * (LIMIT.donorDocuments * LIMIT.donorRowsPerPart
  + (124 + scope.additionalSelectionHours) * 2 * LIMIT.candidatesPerPart);
const MAX_RUNTIME_NS = 600_000_000_000n;

function workBudget(scope) {
  const started = process.hrtime.bigint();
  let units = 0;
  return Object.freeze({
    charge() {
      if (++units > maximumWorkUnits(scope)) refuse('WORK_BOUND');
      if ((units & 255) === 1 && process.hrtime.bigint() - started > MAX_RUNTIME_NS) refuse('RUNTIME_BOUND');
    },
    finish() {
      const elapsed = process.hrtime.bigint() - started;
      if (elapsed > MAX_RUNTIME_NS) refuse('RUNTIME_BOUND');
      return { workUnits: units, runtimeMilliseconds: Number(elapsed / 1_000_000n) };
    },
  });
}

function ownTopStep(source) {
  const matches = source.nativeSteps.filter(step => step.itemId === source.itemId
    && step.assetIdentitySha256 === source.assetIdentitySha256
    && step.nativeValidTime === source.nativeValidTime && step.acquiredAt === source.acquiredAt
    && (step.itemCreatedAt ?? null) === (source.itemCreatedAt ?? null)
    && (step.itemUpdatedAt ?? null) === (source.itemUpdatedAt ?? null));
  return matches.length === 1 ? matches[0] : null;
}

function metadataReservoir(options, part, expected, projected, budget) {
  const result = [];
  let bytes = 0;
  const add = (source, step, origin) => {
    budget.charge();
    const capture = canonicalSavedDmiOriginalCapture(source);
    if (!capture) return;
    const value = { source, step, capture, origin };
    bytes += Buffer.byteLength(canonical(value)) + 2;
    if (result.length >= LIMIT.candidatesPerPart || bytes > LIMIT.candidateBytesPerPart) refuse('METADATA_RESERVOIR_BOUND');
    result.push(value);
  };
  // Native metadata from these actual supplied documents, never a global
  // asset/another-PART inference. A complete capture is not a native U/V proof.
  const documents = [['protected', options.protectedBulk], ['historical', options.historicalBulk],
    ['progress', options.progressCandidate], ...options.protectedCompanionContexts.map((value, index) => ['companion-' + index, value])];
  for (const [role, document] of documents) {
    const zone = document?.zones?.[expected.entityId];
    if (!zone) continue;
    const rows = Object.values(zone.hourly ?? {});
    if (rows.length > LIMIT.donorRowsPerPart) refuse('INPUT_BOUND');
    for (const row of rows) {
      budget.charge();
      const source = row?.sources?.current;
      if (!source || ['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours'].some(key => own(source, key))) continue;
      if (verifiedDmiNativeComponentSource(source, row.time, 'current', expected)
        && verifiedBulkCurrent(document, zone, part.waterPoint, source, row.time, expected)) {
        add(source, source, { kind: 'OWN_NATIVE_CONTEXT_METADATA', role, rowTime: row.time });
      }
    }
  }
  // The normal forecast producer spreads its SELECTED native source, so its
  // top-level complete capture belongs ONLY to its own selectedStep. This also
  // permits an interpolated stored selection's own top capture, not its U/V.
  const forecastRows = [['persisted', options.persistedHourlyByPart.get(part.partId)?.hourly ?? []],
    ...projected.recoverySources.map(source => [source.source, source.record.hourly])];
  for (const [role, rows] of forecastRows) {
    if (!Array.isArray(rows) || rows.length > LIMIT.donorRowsPerPart) refuse('INPUT_BOUND');
    for (const row of rows) {
      budget.charge();
      const source = row?.sources?.current;
      if (!verifiedDmiForecastComponentSource(source, row?.time, 'current', expected)
        || inspectDmiForecastGridSampling(source, 'current', row.time, expected).status !== 'coherent') continue;
      const step = ownTopStep(source);
      if (step) add(source, step, { kind: 'OWN_STORED_SELECTED_TOP_METADATA', role, rowTime: row.time });
    }
  }
  return { candidates: result, bytes };
}

function captureMatchesRequiredStep(candidate, source, step) {
  if (!sameNativeIdentity(candidate.source, source, 'current')
    || own(candidate.step, 'nativeGridSampling') !== own(step, 'nativeGridSampling')
    || !Object.entries(step).every(([key, value]) => isDeepStrictEqual(candidate.step[key], value))) return false;
  // Byte fields come ONLY from the independently complete candidate capture.
  // This framed query is not a new capture and is never returned to the caller.
  const framedQuery = canonicalSavedDmiOriginalCapture({ ...candidate.capture,
    collection: source.collection, modelRun: source.modelRun, validTime: step.nativeValidTime,
    itemId: step.itemId, assetIdentitySha256: step.assetIdentitySha256, acquiredAt: step.acquiredAt,
    itemCreatedAt: step.itemCreatedAt ?? null, itemUpdatedAt: step.itemUpdatedAt ?? null });
  return isDeepStrictEqual(framedQuery, candidate.capture);
}

export function discoverCommittedCoherentOriginalBootstrap(options = {}) {
  const input = { progressCandidate: null, historicalBulk: null, protectedCompanionContexts: [],
    persistedHourlyByPart: new Map(), liveCurrentPilot: null, ...options };
  const scope = coherentOriginalScopeLimits(input), MAX_REFERENCES = scope.maximumReferences;
  const budget = workBudget(scope);
  assertCommittedRawRetentionInputs(input); // The SAME normal B/S structure guard.
  if (!hour(input.productionReferenceAt) || !Number.isSafeInteger(input.registry.partCount)
    || input.registry.partCount < 1 || input.registry.partCount > LIMIT.parts) refuse('INPUT_INVALID');
  const counts = { partsVisited: 0, coherentSelections: 0, originalsAlreadyProved: 0,
    missingOriginalSelections: 0, missingOriginalEndpoints: 0, metadataBoundEndpoints: 0,
    unboundCaptures: 0, ambiguousCaptures: 0, otherProofRefusals: 0, nonCoherentMissingSelections: 0,
    missingBankSources: 0, explicitNullBankSources: 0, presentBankSources: 0,
    reservoirCandidates: 0, reservoirBytes: 0, requestBytes: 2, selectionReferences: 0 };
  const requests = new Map(), seenParts = new Set(), captureKeys = new Set();
  const referenceCounts = { history: 0, saved: 0 };
  for (const [zoneId, entries] of Object.entries(input.registry.zones)) for (const entry of entries) {
    budget.charge();
    const part = { ...entry, zoneId }, expected = dmiExpectedIdentityForPart(part);
    if (!expected || seenParts.has(part.partId) || seenParts.size >= LIMIT.parts) refuse('INPUT_INVALID');
    seenParts.add(part.partId); counts.partsVisited++;
    // No copied priority/sanitation/time planner. The existing helper bodies
    // remain unchanged; its selected rows are never mutated or replaced here.
    const projected = projectCommittedRawRetentionPart({ ...input, part, expected, target: input.productionReferenceAt });
    const reservoir = metadataReservoir(input, part, expected, projected, budget);
    counts.reservoirCandidates += reservoir.candidates.length; counts.reservoirBytes += reservoir.bytes;
    const views = coherentOriginalSourceViews({ input, part, expected, projected });
    for (const view of views) {
      const selectedSource = view.source;
      const bank = nativeCurrentOriginalBankForPart(selectedSource, part);
      if (selectedSource.nativeCurrentOriginals == null) counts.missingBankSources++;
      else if (bank === null) counts.explicitNullBankSources++;
      else counts.presentBankSources++;
      const inspector = createProtectedDmiNativeCurrentInspector({ contexts: selectedSource.nativeCurrentContexts, previousBank: bank });
      for (const row of view.rows) {
        budget.charge();
        if (view.saved121 && !saved121DirectSelection(row)) continue;
        const source = row.sources?.current;
        if (source?.provider !== 'dmi' || source.vectorSemanticsVersion !== 3) continue;
        const payload = [row.currentUMps, row.currentVMps, row.currentSpeedMps, row.currentDirectionDeg];
        if (!payload.some(Number.isFinite)) continue;
        if (!payload.every(Number.isFinite)) { counts.otherProofRefusals++; continue; }
        const proof = inspector.inspectOriginals({ part, row });
        if (proof.ok) { counts.originalsAlreadyProved++; continue; }
        if (proof.code !== 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING') { counts.otherProofRefusals++; continue; }
        if (inspectDmiForecastGridSampling(source, 'current', row.time, expected).status !== 'coherent') {
          counts.nonCoherentMissingSelections++; continue;
        }
        counts.coherentSelections++; counts.missingOriginalSelections++;
        const endpoints = inspector.inspectEndpointOriginals({ part, row });
        if (!endpoints.ok || endpoints.endpoints.length !== source.nativeSteps.length) { counts.otherProofRefusals++; continue; }
        for (const [index, step] of source.nativeSteps.entries()) {
          if (endpoints.endpoints[index] !== null) continue;
          counts.missingOriginalEndpoints++;
          const matches = new Map();
          for (const candidate of reservoir.candidates) {
            budget.charge();
            if (captureMatchesRequiredStep(candidate, source, step)) {
              const key = canonical(candidate.capture);
              if (!matches.has(key)) matches.set(key, candidate);
            }
          }
          if (!matches.size) { counts.unboundCaptures++; continue; }
          if (matches.size !== 1) { counts.ambiguousCaptures++; continue; }
          const candidate = [...matches.values()][0], captureKey = canonical(candidate.capture);
          captureKeys.add(captureKey);
          if (captureKeys.size > 4096) refuse('CAPTURE_BOUND');
          counts.metadataBoundEndpoints++;
          const fields = { partId: part.partId, sourceRole: selectedSource.source,
            initialStateAt: projected.selected.state.time, initialStateSha256: hash(projected.selected.state),
            identity: structuredClone(expected), nativeValidTime: step.nativeValidTime,
            nativeStep: structuredClone(step), capture: structuredClone(candidate.capture) };
          const requestId = hash(fields), selection = { rowTime: row.time,
            sourceSha256: hash(source), tupleSha256: hash([row.currentUMps, row.currentVMps]) };
          const existing = requests.get(requestId);
          const request = existing ?? { requestId, ...fields,
            captureOrigin: structuredClone(candidate.origin), selectionReferences: [] };
          if (!existing) counts.requestBytes += Buffer.byteLength(canonical(request)) + 2;
          if (!request.selectionReferences.some(value => isDeepStrictEqual(value, selection))) {
            const category = view.saved121 ? 'saved' : 'history';
            if (++referenceCounts[category] > (view.saved121
              ? scope.maximumSavedReferences : scope.maximumHistoryReferences)) refuse('REFERENCE_BOUND');
            if (request.selectionReferences.length >= 124 || ++counts.selectionReferences > MAX_REFERENCES) refuse('REFERENCE_BOUND');
            counts.requestBytes += Buffer.byteLength(canonical(selection)) + 2;
            request.selectionReferences.push(selection);
          }
          if (counts.requestBytes > LIMIT.bankBytes) refuse('REQUEST_BYTES_BOUND');
          requests.set(requestId, request);
          if (requests.size > MAX_REFERENCES) refuse('REQUEST_BOUND');
        }
      }
    }
  }
  if (counts.partsVisited !== input.registry.partCount) refuse('INPUT_INVALID');
  const unresolved = counts.unboundCaptures + counts.ambiguousCaptures + counts.otherProofRefusals + counts.nonCoherentMissingSelections > 0;
  const status = unresolved ? 'UNRESOLVED' : counts.missingOriginalEndpoints ? 'METADATA_BOUND' : 'NO_BOOTSTRAP_REQUIRED';
  const privateRequests = unresolved ? [] : [...requests.values()].sort((a, b) => {
    budget.charge(); return a.requestId.localeCompare(b.requestId);
  });
  const timing = budget.finish();
  // All-or-nothing metadata: a partial/ambiguous reservoir cannot seed decode.
  return { summary: { schemaVersion: 1, kind: 'COHERENT_ORIGINAL_BOOTSTRAP_METADATA', status,
    refusalCode: unresolved ? 'COHERENT_ORIGINAL_BOOTSTRAP_CAPTURE_UNRESOLVED' : null,
    scope: scope.metadataScope, counts, timing,
    requestCount: unresolved ? 0 : requests.size, rawAvailability: 'NOT_PROBED', missingRawFiles: null,
    authenticationPerformed: false, rawReadPerformed: false, decoderExecuted: false,
    nativeAdmissionPerformed: false, sourcePriorityChanged: false, selectedRowsChanged: false,
    privatePayloadIncluded: false },
  privateBinding: { datasetId: input.boundary.datasetId,
    committedReferenceAt: input.boundary.productionReferenceAt, targetReferenceAt: input.productionReferenceAt,
    bundleContentSha256: input.boundary.bundleContentSha256, conditionsSha256: input.boundary.conditionsSha256,
    checkpointGenerationSha256: input.boundary.checkpointGenerationSha256 },
  privateRequests };
}
