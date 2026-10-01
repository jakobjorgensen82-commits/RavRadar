// Operational input preparation, outside the locked score/model bundle.
// This cannot grant admission: callers still use the unchanged bank validator.
import {
  OPEN_METEO_PART_COMPONENTS, openMeteoPartSha256,
  selectedOpenMeteoPartRecord, validateOpenMeteoPartBank,
} from './open-meteo-part-bank.mjs';
import { hasValue } from './weather-component-needs.mjs';

export function pruneUnusableOpenMeteoPartBank(bank, options = {}) {
  const suspects = (bank?.records ?? []).filter(record => OPEN_METEO_PART_COMPONENTS.includes(record.component)
    && !hasValue(record.values, record.component));
  // Normal valid banks are unchanged, without repeating expensive response
  // decoding. No authority is returned or inferred from this cheap screen.
  if (!suspects.length) return { bank, removedRecords: 0 };
  // Before removing anything, prove the entire original bank with the locked
  // validator. Tampering, bad identity or duplicate records still fail closed.
  const index = validateOpenMeteoPartBank(bank, options);
  const parts = new Map((options.parts ?? []).map(part => [part.partId, part]));
  const removed = new Set();
  for (const record of suspects) {
    const candidate = selectedOpenMeteoPartRecord(index, {
      part: parts.get(record.partId), validTime: record.validTime, component: record.component,
    });
    if (!candidate || candidate.recordId !== record.recordId) throw new Error('OPEN_METEO_UNUSABLE_RECORD_NOT_VERIFIED');
    if (!hasValue(candidate.values, candidate.component)) removed.add(candidate.recordId);
  }
  const records = bank.records.filter(record => !removed.has(record.recordId));
  const used = new Set(records.map(record => record.evidenceId));
  const { bankSha256: _oldHash, ...original } = bank;
  const content = { ...original, records,
    responses: Object.fromEntries(Object.entries(bank.responses).filter(([id]) => used.has(id))) };
  const result = { ...content, bankSha256: openMeteoPartSha256(content) };
  validateOpenMeteoPartBank(result, options);
  return { bank: result, removedRecords: removed.size };
}
