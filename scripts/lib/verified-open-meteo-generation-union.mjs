// Operational cache recovery, deliberately outside the score implementation.
// Do not use the legacy response-replay helper in open-meteo-part-bank here:
// overlapping original responses may contain hours not selected by that bank.
import {
  createOpenMeteoPartBankBuilder, validateOpenMeteoPartBank, openMeteoPartSha256,
  OPEN_METEO_PART_COMPONENTS, OPEN_METEO_PART_BANK_KIND, OPEN_METEO_PART_BANK_MAX_BYTES,
} from './open-meteo-part-bank.mjs';
import { pruneUnusableOpenMeteoPartBank } from './open-meteo-usable-part-bank.mjs';

export function mergeVerifiedOpenMeteoGenerations(latest, complete, options = {}) {
  if (!latest && !complete) return null;
  const validation = { parts: options.parts, spatialPolicies: options.spatialPolicies };
  if (latest) validateOpenMeteoPartBank(latest, validation);
  if (complete) validateOpenMeteoPartBank(complete, validation);
  const builder = createOpenMeteoPartBankBuilder(latest, options);
  if (builder.retired.changedOrRemovedTarget !== 0) {
    throw new Error('OPEN_METEO_PART_RECOVERY_TARGET_CHANGED');
  }
  const { bank: retained } = pruneUnusableOpenMeteoPartBank(builder.snapshot(), options);
  // Rebuild only previously selected, still-admitted records. In particular,
  // a response-bound legacy tuple can be canonically unusable after rounding;
  // copying its raw stored record would resurrect a retry-blocking false fill.
  const completeRetained = complete ? pruneUnusableOpenMeteoPartBank(complete, validation).bank : null;
  const inRetention = record => record.validTime >= retained.retention.startAt
    && record.validTime <= retained.retention.endAt;
  // Both banks have been re-admitted from original bytes above. Merge only
  // their selected records, not every hour in each original response. Latest
  // owns conflicts; complete fills only exact component/part/hour holes.
  const exactKey = record => JSON.stringify([record.partId, record.validTime, record.component]);
  const selected = new Map(retained.records.map(record => [exactKey(record), record]));
  for (const record of (completeRetained?.records ?? []).filter(inRetention)) {
    if (OPEN_METEO_PART_COMPONENTS.includes(record.component) && !selected.has(exactKey(record))) {
      selected.set(exactKey(record), record);
    }
  }
  const records = [...selected.values()].sort((a, b) => a.validTime.localeCompare(b.validTime)
    || a.partId.localeCompare(b.partId) || a.component.localeCompare(b.component));
  const responses = {};
  for (const { evidenceId } of records) {
    if (Object.hasOwn(responses, evidenceId)) continue;
    const evidence = retained.responses[evidenceId] ?? completeRetained?.responses[evidenceId];
    if (!evidence) throw new Error('OPEN_METEO_PART_RECOVERY_EVIDENCE_MISSING');
    responses[evidenceId] = evidence;
  }
  const content = { schemaVersion: 1, kind: OPEN_METEO_PART_BANK_KIND,
    retention: retained.retention, records, responses };
  const result = { ...content, bankSha256: openMeteoPartSha256(content) };
  if (Buffer.byteLength(JSON.stringify(result)) > OPEN_METEO_PART_BANK_MAX_BYTES) {
    throw new Error('OPEN_METEO_PART_BANK_BUDGET_EXCEEDED');
  }
  validateOpenMeteoPartBank(result, validation);
  return structuredClone(result);
}
