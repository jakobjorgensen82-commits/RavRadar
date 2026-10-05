import {
  OPEN_METEO_PART_COMPONENTS, buildOpenMeteoPartRequest, createOpenMeteoPartBankBuilder,
  readOpenMeteoPartResponse,
} from './lib/open-meteo-part-bank.mjs';
import { pruneUnusableOpenMeteoPartBank } from './lib/open-meteo-usable-part-bank.mjs';
import { hasValue } from './lib/weather-component-needs.mjs';

// No top-level provider calls or filesystem writes. The normal producer owns
// transport deadlines/retries, the private cache path and durable checkpoint.
// Injected transport returns { responseText, acquiredAt } for this exact request.
export async function produceOpenMeteoPartComponents({
  parts, productionReferenceAt, spatialPolicies, previousBank = null,
  fetchResponse, checkpoint = async () => {}, shouldContinue = () => true,
  requiredPairs, retentionStartAt, retentionEndAt,
  checkpointEveryParts = 10, startAfterPartId = null,
} = {}) {
  if (typeof fetchResponse !== 'function') throw new Error('OPEN_METEO_PART_TRANSPORT_REQUIRED');
  if (!Number.isInteger(checkpointEveryParts) || checkpointEveryParts < 1 || checkpointEveryParts > 50) {
    throw new Error('OPEN_METEO_PART_CHECKPOINT_BATCH_INVALID');
  }
  const bankOptions = { parts, spatialPolicies, retentionStartAt, retentionEndAt };
  let builder = createOpenMeteoPartBankBuilder(previousBank, bankOptions);
  const retired = { ...builder.retired, unusableComponent: 0 };
  const initial = pruneUnusableOpenMeteoPartBank(builder.snapshot(), bankOptions);
  if (initial.removedRecords) builder = createOpenMeteoPartBankBuilder(initial.bank, bankOptions);
  retired.unusableComponent += initial.removedRecords;
  const firstRequest = buildOpenMeteoPartRequest(parts[0], { component: 'wind', productionReferenceAt });
  if (retentionStartAt > productionReferenceAt || retentionEndAt < firstRequest.endAt) {
    throw new Error('OPEN_METEO_PART_RETENTION_DOES_NOT_COVER_PRODUCTION');
  }
  let bank = initial.bank;
  const failures = [];
  const componentWarnings = {};
  let requests = 0;
  let deferred = 0;
  const pendingCheckpointParts = new Set();
  let lastAttemptedPartId = null;
  let componentsNotAdmitted = 0;
  const allowed = new Set();
  const partIds = new Set(parts.map(part => part.partId));
  {
    if (!Array.isArray(requiredPairs)) throw new Error('OPEN_METEO_PART_RESIDUAL_INVALID');
    for (const pair of requiredPairs) {
      if (pair?.component === 'waterLevel') continue; // Old callers cannot request the DMI-only field.
      const offset = (Date.parse(pair?.validTime) - Date.parse(productionReferenceAt)) / 3_600_000;
      if (!partIds.has(pair?.partId) || !OPEN_METEO_PART_COMPONENTS.includes(pair?.component)
        || !Number.isInteger(offset) || offset < 0 || offset > 120
        || new Date(Date.parse(pair.validTime)).toISOString() !== pair.validTime) {
        throw new Error('OPEN_METEO_PART_RESIDUAL_INVALID');
      }
      const key = JSON.stringify([pair.partId, pair.validTime, pair.component]);
      if (allowed.has(key)) throw new Error('OPEN_METEO_PART_RESIDUAL_DUPLICATE');
      allowed.add(key);
    }
  }
  const priorPosition = parts.findIndex(part => part.partId === startAfterPartId);
  const orderedParts = priorPosition < 0 ? parts : [...parts.slice(priorPosition + 1), ...parts.slice(0, priorPosition + 1)];
  const work = [];
  for (const part of orderedParts) {
    const missing = new Set();
    for (let hour = 0; hour <= 120; hour += 1) {
      const validTime = new Date(Date.parse(productionReferenceAt) + hour * 3_600_000).toISOString();
      for (const component of OPEN_METEO_PART_COMPONENTS) {
        if (!allowed.has(JSON.stringify([part.partId, validTime, component]))) continue;
        if (!builder.has(part, validTime, component)) missing.add(component);
      }
    }
    const components = [...missing].filter(component => {
      if (spatialPolicies[component]?.kind !== 'not-admitted') return true;
      componentsNotAdmitted += 1;
      return false;
    });
    work.push(...components.map(component => ({ part, component })));
  }
  await checkpoint(bank);
  // Keep the existing two transport slots occupied independently. Waiting for
  // both siblings of one PART wasted the free slot behind a slow marine reply.
  // Request order, deadline and source proof stay unchanged; checkpoints have
  // one writer and can save completed siblings before the slow reply settles.
  const active = new Map();
  let position = 0;
  try {
    while (position < work.length || active.size) {
      while (active.size < 2 && position < work.length && shouldContinue()) {
        const id = position++;
        const { part, component } = work[id];
        lastAttemptedPartId = part.partId;
        // Start synchronously before checking permission for the next slot;
        // the caller can stop immediately after an attempt, not just on time.
        const operation = (async () => {
          const request = buildOpenMeteoPartRequest(part, { component, productionReferenceAt,
            cellSelection: spatialPolicies[component].cellSelection, spatialPolicy: spatialPolicies[component] });
          requests += 1;
          const response = await fetchResponse(request);
          return readOpenMeteoPartResponse({ ...response, request }, { part, spatialPolicies,
            onInvalid: code => { componentWarnings[code] = (componentWarnings[code] ?? 0) + 1; },
          });
        })().then(value => ({ id, part, component, value }), () => ({ id, part, component, failed: true }));
        active.set(id, operation);
      }
      if (!active.size) break;
      const result = await Promise.race(active.values());
      active.delete(result.id);
      if (result.failed) {
        failures.push({ component: result.component, channel: result.component === 'wind' ? 'weather' : 'marine',
          code: 'OPEN_METEO_PART_COMPONENT_UNAVAILABLE' });
        continue;
      }
      const admission = result.value;
      builder.add(admission);
      if (admission.records.some(record => !hasValue(record.values, record.component))) {
        // The unchanged parser binds original bytes; operational usability is
        // checked after canonical rounding before the next durable checkpoint.
        const pruned = pruneUnusableOpenMeteoPartBank(builder.snapshot(), bankOptions);
        if (pruned.removedRecords) builder = createOpenMeteoPartBankBuilder(pruned.bank, bankOptions);
        retired.unusableComponent += pruned.removedRecords;
        componentWarnings.OPEN_METEO_PART_CANONICAL_COMPONENT_INVALID =
          (componentWarnings.OPEN_METEO_PART_CANONICAL_COMPONENT_INVALID ?? 0)
          + admission.records.filter(record => !hasValue(record.values, record.component)).length;
      }
      if (admission.records.length > 0) pendingCheckpointParts.add(result.part.partId);
      if (pendingCheckpointParts.size >= checkpointEveryParts) {
        bank = builder.snapshot();
        // A failed checkpoint is a real persistence error, not a provider miss.
        await checkpoint(bank);
        pendingCheckpointParts.clear();
      }
    }
  } catch (error) {
    // No new request or write after persistence failure. Already-started
    // bounded transports must settle before outer recovery/cleanup proceeds.
    await Promise.allSettled(active.values());
    throw error;
  }
  deferred = work.length - position;
  if (pendingCheckpointParts.size > 0) {
    bank = builder.snapshot();
    await checkpoint(bank);
  }
  return { bank, summary: { requests, deferred, failures, componentWarnings, records: bank.records.length,
    lastAttemptedPartId, componentsNotAdmitted, retired } };
}
