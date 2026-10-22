// Proof-only views of caller-owned, authenticated input. No selection/priority,
// decoding, original inference, authentication, mutation or runtime admission.
import { isDeepStrictEqual } from 'node:util';
import { dmiExpectedIdentityForPart, verifiedDmiForecastComponentSource }
  from './ravscore-production-adapters.mjs';
import { nativeCurrentOriginalBankForPart } from './ravscore-recovery-source-priority.mjs';
import { PROTECTED_DMI_NATIVE_PROOF_LIMITS as LIMIT } from './protected-dmi-native-current-proofs.mjs';
const refuse = code => { throw new Error('COHERENT_ORIGINAL_VIEWS_' + code); };
const hour = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export const SAVED_121_PROOF_ROLE = 'saved-private-part-forecast-121-proof-only';
export function coherentOriginalScopeLimits(input) {
  if (input.includeSavedForecast121 !== undefined && typeof input.includeSavedForecast121 !== 'boolean') refuse('SCOPE_INVALID');
  const saved = input.includeSavedForecast121 === true;
  // The old history limit is unchanged. New references are endpoint->row
  // edges: up to two endpoints for each of the additional 121 saved rows.
  return { saved, maximumReferences: 2 * LIMIT.parts * 124 + (saved ? 2 * LIMIT.parts * 121 : 0),
    maximumHistoryReferences: 2 * LIMIT.parts * 124, maximumSavedReferences: saved ? 2 * LIMIT.parts * 121 : 0,
    additionalSelectionHours: saved ? 121 : 0,
    metadataScope: saved ? 'BEFORE_RETENTION_AND_EXACT_SAVED_PART_FORECAST_121_METADATA_ONLY'
      : 'BEFORE_RETENTION_COHERENT_MISSING_ENDPOINT_METADATA_ONLY' };
}
export function saved121DirectSelection(row) {
  return row?.currentStateOnlyHold == null && row?.sources?.current?.provider === 'dmi'
    && row.sources.current.vectorSemanticsVersion === 3
    && [row.currentUMps, row.currentVMps, row.currentSpeedMps, row.currentDirectionDeg].some(Number.isFinite);
}
export function coherentOriginalSourceViews({ input, part, expected, projected }) {
  const scope = coherentOriginalScopeLimits(input);
  const from = Date.parse(projected.selected.state.time), until = Date.parse(input.productionReferenceAt);
  const views = projected.recoverySources.map(source => ({ source, saved121: false,
    rows: source.record.hourly.filter(row => {
      const time = Date.parse(row.time);
      return !(time <= from || time >= until); // Exact old historical predicate, including invalid-time refusal downstream.
    }) }));
  if (!scope.saved) return views;
  const saved = input.persistedHourlyByPart.get(part.partId), reference = input.boundary.productionReferenceAt;
  if (!hour(reference) || !hour(input.productionReferenceAt) || Date.parse(reference) > until
    || projected.selected.state.time !== reference
    || !isDeepStrictEqual(expected, dmiExpectedIdentityForPart(part))
    || !saved || !isDeepStrictEqual(saved.point, expected.samplingPoint)
    || !Array.isArray(saved.hourly) || saved.hourly.length !== LIMIT.hoursPerPart
    || saved.hourly.some((row, index) => !hour(row?.time)
      || row.time !== new Date(Date.parse(reference) + index * 3_600_000).toISOString())) refuse('SAVED_121_IDENTITY_OR_TIME');
  const contexts = [input.protectedBulk, input.historicalBulk, input.progressCandidate,
    ...input.protectedCompanionContexts].filter(Boolean);
  if (contexts.length > LIMIT.donorDocuments) refuse('INPUT_BOUND');
  const source = { source: SAVED_121_PROOF_ROLE, nativeCurrentContexts: contexts,
    ...(saved.nativeCurrentOriginals == null ? {} : { nativeCurrentOriginals: saved.nativeCurrentOriginals }),
    record: { zoneId: expected.entityId, point: saved.point, hourly: saved.hourly } };
  nativeCurrentOriginalBankForPart(source, part); // Existing wrapper/PART front; no copied proof validator.
  for (const row of saved.hourly) if (saved121DirectSelection(row)
    && (!Number.isFinite(row.currentUMps) || !Number.isFinite(row.currentVMps)
      || !verifiedDmiForecastComponentSource(row.sources.current, row.time, 'current', expected))) refuse('SAVED_121_SELECTION_INVALID');
  // This view never enters projected.recoverySources or any selector. All rows
  // and contexts retain their original references and their old saved age/H0.
  views.push({ source, saved121: true, rows: saved.hourly });
  return views;
}
