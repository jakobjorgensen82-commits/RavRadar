// INACTIVE private proposal: no I/O, authentication, forecast admission or save.
// Caller owns genuine B/S inputs, the measured RAW request-file SHA, successful
// decoder completion/physical close and an unchanged, privately parsed envelope.
import crypto from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';
import { discoverCommittedCoherentOriginalBootstrap } from './coherent-current-original-bootstrap.mjs';
import { projectCommittedRawRetentionPart } from '../plan-ravscore-current-history.mjs';
import { coherentOriginalScopeLimits, coherentOriginalSourceViews, saved121DirectSelection,
  SAVED_121_PROOF_ROLE } from './coherent-original-source-views.mjs';
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';
import { dmiExpectedIdentityForPart, dmiOriginalWireIdentityMatchesCentralIdentity,
  verifiedDmiNativeComponentSource, verifiedBulkCurrent } from './ravscore-production-adapters.mjs';
import { nativeCurrentOriginalBankForPart } from './ravscore-recovery-source-priority.mjs';
import { buildProtectedDmiNativeCurrentProofs,
  PROTECTED_DMI_NATIVE_PROOF_LIMITS as LIMIT } from './protected-dmi-native-current-proofs.mjs';

const SHA = /^[a-f0-9]{64}$/;
const refuse = code => { throw new Error('COHERENT_CURRENT_REPROJECTION_' + code); };
const keys = (value, fields) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && equal(Object.keys(value).sort(), [...fields].sort());
// Same metadata digest framing as discover(), NOT a request-file byte digest
// and NOT authentication. Only the existing kernel proves the full projection.
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const text = (value, maximum = LIMIT.recordBytes) => {
  const encoded = canonical(value);
  if (typeof encoded !== 'string' || Buffer.byteLength(encoded) > maximum) refuse('RECORD_BOUND');
  return encoded;
};
const hash = value => crypto.createHash('sha256').update(text(value)).digest('hex');

function measuredBudget(scope) {
  const start = process.hrtime.bigint();
  let units = 0;
  return () => {
    if (++units > LIMIT.parts * (LIMIT.donorDocuments * LIMIT.donorRowsPerPart + 2 * (124 + scope.additionalSelectionHours) * LIMIT.candidatesPerPart)
      || process.hrtime.bigint() - start > 600_000_000_000n) refuse('WORK_OR_RUNTIME_BOUND');
  };
}

function validateEnvelope(metadata, requestSha256, envelope, charge) {
  if (!SHA.test(requestSha256 ?? '') || !keys(envelope, ['schemaVersion', 'kind', 'privateBinding',
    'requestSha256', 'captureCount', 'privateOriginals', 'nativeAdmissionPerformed'])
    || envelope.schemaVersion !== 1 || envelope.kind !== 'COHERENT_CURRENT_ORIGINAL_DECODE'
    || envelope.requestSha256 !== requestSha256 || envelope.nativeAdmissionPerformed !== false
    || !equal(envelope.privateBinding, metadata.privateBinding)
    || !Array.isArray(envelope.privateOriginals) || envelope.privateOriginals.length !== metadata.privateRequests.length) refuse('ENVELOPE_BINDING');
  const byId = new Map(metadata.privateRequests.map(request => [request.requestId, request]));
  if (byId.size !== metadata.privateRequests.length) refuse('REQUEST_DUPLICATE');
  const decoded = new Map(), captures = new Set();
  let bytes = Buffer.byteLength(text(envelope.privateBinding)) + 512;
  for (const original of envelope.privateOriginals) {
    charge();
    if (!keys(original, ['requestId', 'partId', 'header', 'identity', 'row', 'capture'])
      || !byId.has(original.requestId) || decoded.has(original.requestId)) refuse('DECODE_REQUEST_INVENTORY');
    bytes += Buffer.byteLength(text(original, LIMIT.candidateBytesPerPart)) + 2;
    if (bytes > LIMIT.bankBytes) refuse('DECODE_BYTES_BOUND');
    const request = byId.get(original.requestId), source = original.row?.sources?.current;
    // No inferred generatedAt/cadence/age. Consume exactly the decoder header.
    if (!keys(original.header, ['currentVectorSemanticsVersion', 'currentVectorSelection', 'currentMaxDistanceKm'])
      || original.partId !== request.partId || !equal(original.capture, request.capture)
      || !equal(canonicalSavedDmiOriginalCapture(source), request.capture)
      || !keys(original.identity, Object.keys(request.identity))
      || !dmiOriginalWireIdentityMatchesCentralIdentity(original.identity, request.identity)
      || !Number.isFinite(Date.parse(original.row?.time))
      || Date.parse(original.row.time) !== Date.parse(request.nativeValidTime)
      || !Number.isFinite(original.row?.['current-u']) || !Number.isFinite(original.row?.['current-v'])
      || ['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours']
        .some(key => Object.hasOwn(source ?? {}, key))
      || !verifiedDmiNativeComponentSource(source, original.row.time, 'current', request.identity)
      || !verifiedBulkCurrent(original.header, original.identity, request.identity.samplingPoint,
        source, original.row.time, request.identity)) refuse('DECODE_NATIVE_IDENTITY');
    for (const [key, value] of Object.entries(request.nativeStep)) {
      if (!Object.hasOwn(source, key) || (key === 'nativeValidTime'
        ? Date.parse(source[key]) !== Date.parse(value) : !equal(source[key], value))) refuse('DECODE_NATIVE_STEP');
    }
    for (const key of ['nativeGridSampling', 'itemCreatedAt', 'itemUpdatedAt']) {
      if (Object.hasOwn(source, key) !== Object.hasOwn(request.nativeStep, key)) refuse('DECODE_NATIVE_STEP');
    }
    captures.add(text(request.capture)); decoded.set(request.requestId, original);
  }
  if (decoded.size !== byId.size || !Number.isSafeInteger(envelope.captureCount)
    || envelope.captureCount !== captures.size || captures.size > 4096) refuse('DECODE_REQUEST_INVENTORY');
  return decoded;
}

// PART + ROLE local, actual header/wire identity only. Distinct hours share a
// document. Same-time different sources/values NEVER overwrite one another:
// they occupy a further document. Exactly duplicate rows may share evidence.
function packedContexts(originals, existingCount, charge) {
  const groups = new Map(), documents = [];
  for (const original of originals) {
    charge();
    const key = text([original.header, original.identity]);
    const slots = groups.get(key) ?? [], time = Date.parse(original.row.time);
    if (slots.some(slot => equal(slot.times.get(time), original.row))) continue;
    let slot = slots.find(value => !value.times.has(time));
    if (!slot) {
      if (existingCount + documents.length >= LIMIT.donorDocuments) refuse('CONTEXT_DOCUMENT_BOUND');
      const document = { ...structuredClone(original.header), zones: {
        [original.identity.entityId]: { ...structuredClone(original.identity), hourly: {} } } };
      slot = { document, times: new Map() }; slots.push(slot); groups.set(key, slots); documents.push(document);
    }
    if (slot.times.size >= LIMIT.donorRowsPerPart) refuse('CONTEXT_ROW_BOUND');
    slot.times.set(time, original.row);
    // requestId is a unique dictionary key, not a replacement native time.
    slot.document.zones[original.identity.entityId].hourly[original.requestId] = structuredClone(original.row);
  }
  return documents;
}

/** Pure, all-or-nothing proof proposal. No result is a saved admission token.
 * Inputs remain caller-owned/read-only throughout this synchronous invocation.
 * Future caller must reauthenticate actual B/S and physically measured files;
 * serialized/cloned WeakMap-scoped contexts do not acquire authority here.
 */
export function reprojectCommittedCoherentCurrentOriginals({ input: options, metadata,
  requestSha256, decodedEnvelope } = {}) {
  const input = { progressCandidate: null, historicalBulk: null, protectedCompanionContexts: [],
    persistedHourlyByPart: new Map(), liveCurrentPilot: null, ...options };
  const scope = coherentOriginalScopeLimits(input), MAX_REFERENCES = scope.maximumReferences;
  const charge = measuredBudget(scope);
  if (!keys(metadata, ['summary', 'privateBinding', 'privateRequests'])
    || !Array.isArray(metadata.privateRequests) || metadata.privateRequests.length > MAX_REFERENCES
    || !(metadata.summary?.status === 'METADATA_BOUND' && metadata.privateRequests.length > 0
      || scope.saved && metadata.summary?.status === 'NO_BOOTSTRAP_REQUIRED' && metadata.privateRequests.length === 0)) refuse('METADATA_REQUIRED');
  const noDecode = metadata.privateRequests.length === 0;
  if (noDecode && (requestSha256 != null || decodedEnvelope != null)) refuse('UNEXPECTED_DECODE');
  // Fresh same-normal discovery binds every supplied request/capture/reference.
  // Deliberately exclude nondeterministic summary.timing, never file-byte SHA.
  const fresh = discoverCommittedCoherentOriginalBootstrap(input);
  const stableSummary = ({ timing: _timing, ...stable }) => stable;
  if (fresh.summary.status !== metadata.summary.status || !equal(metadata.privateBinding, fresh.privateBinding)
    || !equal(stableSummary(metadata.summary), stableSummary(fresh.summary))
    || !equal(metadata.privateRequests, fresh.privateRequests)) refuse('METADATA_CHANGED');
  charge();
  const decoded = noDecode ? new Map() : validateEnvelope(fresh, requestSha256, decodedEnvelope, charge);
  const byPart = new Map();
  for (const request of fresh.privateRequests) {
    charge();
    const list = byPart.get(request.partId) ?? [];
    list.push(request); byPart.set(request.partId, list);
  }
  const privateProofBanks = [], visited = new Set();
  const counts = { parts: 0, roles: 0, requests: fresh.privateRequests.length,
    selections: 0, decodedContextDocuments: 0, contexts: 0, nativeRows: 0, bankBytes: 2 };
  for (const [zoneId, entries] of Object.entries(input.registry.zones)) for (const entry of entries) {
    charge();
    if (!byPart.has(entry.partId) && !scope.saved) continue;
    const part = { ...entry, zoneId }, expected = dmiExpectedIdentityForPart(part);
    if (!expected || visited.has(part.partId) || visited.size >= LIMIT.parts) refuse('PART_INVENTORY');
    visited.add(part.partId); counts.parts++;
    // The exact SAME normal source selection, priority and sanitation again.
    const projected = projectCommittedRawRetentionPart({ ...input, part, expected, target: input.productionReferenceAt });
    const views = coherentOriginalSourceViews({ input, part, expected, projected });
    const stateSha256 = hash(projected.selected.state), byRole = new Map();
    for (const request of byPart.get(part.partId) ?? []) {
      charge();
      if (request.initialStateAt !== projected.selected.state.time || request.initialStateSha256 !== stateSha256
        || !equal(request.identity, expected)) refuse('SELECTION_STATE_CHANGED');
      const list = byRole.get(request.sourceRole) ?? [];
      list.push(request); byRole.set(request.sourceRole, list);
    }
    // A full saved bank also includes selections already proved by genuine
    // contexts/previousBank; it must not contain only the decoded holes.
    const savedView = views.find(view => view.saved121);
    if (savedView?.rows.some(saved121DirectSelection) && !byRole.has(SAVED_121_PROOF_ROLE)) {
      byRole.set(SAVED_121_PROOF_ROLE, []);
    }
    for (const [sourceRole, requests] of byRole) {
      const matchingViews = views.filter(view => view.source.source === sourceRole);
      if (matchingViews.length !== 1) refuse('SELECTION_ROLE_CHANGED');
      const view = matchingViews[0], source = view.source, selectionsByTime = new Map(), originals = [];
      if (!Array.isArray(source.nativeCurrentContexts) || source.nativeCurrentContexts.length > LIMIT.donorDocuments
        || source.record.hourly.length > LIMIT.donorRowsPerPart) refuse('INPUT_BOUND');
      const rows = new Map();
      for (const row of view.rows) {
        charge();
        const list = rows.get(row.time) ?? []; list.push(row); rows.set(row.time, list);
      }
      for (const request of requests) {
        charge(); originals.push(decoded.get(request.requestId));
        for (const reference of request.selectionReferences) {
          charge();
          const matches = rows.get(reference.rowTime) ?? [], row = matches[0];
          if (matches.length !== 1 || hash(row.sources?.current) !== reference.sourceSha256
            || hash([row.currentUMps, row.currentVMps]) !== reference.tupleSha256
            || !row.sources.current.nativeSteps.some(step => equal(step, request.nativeStep))) refuse('SELECTION_CHANGED');
          selectionsByTime.set(row.time, { part, row });
        }
      }
      if (view.saved121) for (const row of view.rows) {
        charge();
        if (saved121DirectSelection(row)) selectionsByTime.set(row.time, { part, row });
      }
      if (selectionsByTime.size < 1 || selectionsByTime.size > LIMIT.hoursPerPart) refuse('SELECTION_DOMAIN_BOUND');
      const documents = packedContexts(originals, source.nativeCurrentContexts.length, charge);
      const previousBank = nativeCurrentOriginalBankForPart(source, part);
      // Preserve own authenticated contexts + own previousBank; no global or
      // other-role donor. Kernel alone checks every full source/tuple/old age.
      const bank = buildProtectedDmiNativeCurrentProofs({ selections: [...selectionsByTime.values()],
        contexts: [...source.nativeCurrentContexts, ...documents], previousBank });
      charge(); counts.roles++; counts.selections += bank.selections.length;
      counts.decodedContextDocuments += documents.length;
      counts.contexts += bank.contexts.length; counts.nativeRows += bank.nativeRows.length;
      let bytes = 512;
      for (const records of [bank.contexts, bank.nativeRows, bank.selections]) for (const record of records) {
        charge(); bytes += Buffer.byteLength(text(record)) + 2;
      }
      counts.bankBytes += bytes;
      if (counts.bankBytes > LIMIT.bankBytes) refuse('OUTPUT_BYTES_BOUND');
      privateProofBanks.push({ partId: part.partId, sourceRole,
        initialStateAt: projected.selected.state.time, initialStateSha256: stateSha256, bank });
    }
  }
  if (visited.size !== (scope.saved ? input.registry.partCount : byPart.size)) refuse('PART_INVENTORY');
  charge();
  return { summary: { schemaVersion: 1, kind: 'COHERENT_CURRENT_ORIGINAL_REPROJECTION', status: 'PROVED_PRIVATE_ONLY',
    ...(scope.saved ? { scope: 'MISSING_HISTORY_REFERENCES_AND_ALL_SAVED121_DIRECT_DMI_SELECTIONS',
      savedForecast121ProofDomainChecked: true } : {}),
    counts, metadataRevalidated: true, requestByteShaCompared: !noDecode, decoderEnvelopeValidated: !noDecode,
    authenticationPerformed: false, rawReadPerformed: false, nativeAdmissionPerformed: false,
    sourcePriorityChanged: false, selectedRowsChanged: false, bankActivated: false, bankSaved: false,
    privatePayloadIncluded: false }, privateProofBanks };
}
