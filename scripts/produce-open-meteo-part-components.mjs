import {
  OPEN_METEO_PART_COMPONENTS, buildOpenMeteoPartRequest, createOpenMeteoPartBankBuilder,
  readOpenMeteoPartResponse,
} from './lib/open-meteo-part-bank.mjs';

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
  const builder = createOpenMeteoPartBankBuilder(previousBank, { parts, spatialPolicies, retentionStartAt, retentionEndAt });
  const firstRequest = buildOpenMeteoPartRequest(parts[0], { component: 'wind', productionReferenceAt });
  if (retentionStartAt > productionReferenceAt || retentionEndAt < firstRequest.endAt) {
    throw new Error('OPEN_METEO_PART_RETENTION_DOES_NOT_COVER_PRODUCTION');
  }
  let bank = builder.snapshot();
  const failures = [];
  const componentWarnings = {};
  let requests = 0;
  let deferred = 0;
  let pendingCheckpointParts = 0;
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
  await checkpoint(bank);
  const priorPosition = parts.findIndex(part => part.partId === startAfterPartId);
  const orderedParts = priorPosition < 0 ? parts : [...parts.slice(priorPosition + 1), ...parts.slice(0, priorPosition + 1)];
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
    if (!components.length) continue;
    // At most two concurrent requests. One transport/setup/parse failure never
    // discards an independently useful sibling or the previous private bank.
    const admissions = [];
    for (let offset = 0; offset < components.length; offset += 2) {
      const batch = components.slice(offset, offset + 2);
      if (!shouldContinue()) { deferred += components.length - offset; break; }
      lastAttemptedPartId = part.partId;
      const results = await Promise.allSettled(batch.map(component => Promise.resolve().then(async () => {
        const request = buildOpenMeteoPartRequest(part, { component, productionReferenceAt,
          cellSelection: spatialPolicies[component].cellSelection, spatialPolicy: spatialPolicies[component] });
        requests += 1;
        const response = await fetchResponse(request);
        return readOpenMeteoPartResponse({ ...response, request }, { part, spatialPolicies,
          onInvalid: code => { componentWarnings[code] = (componentWarnings[code] ?? 0) + 1; },
        });
      })));
      for (const [position, result] of results.entries()) {
        if (result.status === 'fulfilled') admissions.push(result.value);
        else failures.push({ component: batch[position], channel: batch[position] === 'wind' ? 'weather' : 'marine',
          code: 'OPEN_METEO_PART_COMPONENT_UNAVAILABLE' });
      }
    }
    for (const admission of admissions) builder.add(admission);
    if (admissions.some(admission => admission.records.length > 0)) pendingCheckpointParts += 1;
    if (pendingCheckpointParts >= checkpointEveryParts) {
      bank = builder.snapshot();
      // A failed checkpoint is a real persistence error, not a provider miss.
      await checkpoint(bank);
      pendingCheckpointParts = 0;
    }
  }
  if (pendingCheckpointParts > 0) {
    bank = builder.snapshot();
    await checkpoint(bank);
  }
  return { bank, summary: { requests, deferred, failures, componentWarnings, records: bank.records.length,
    lastAttemptedPartId, componentsNotAdmitted, retired: builder.retired } };
}
