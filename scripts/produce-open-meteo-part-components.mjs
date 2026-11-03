import {
  OPEN_METEO_PART_COMPONENTS, buildOpenMeteoPartRequest, createOpenMeteoPartBankBuilder,
  readOpenMeteoPartResponse, openMeteoPartIdentity, openMeteoPartSha256,
} from './lib/open-meteo-part-bank.mjs';
import { pruneUnusableOpenMeteoPartBank } from './lib/open-meteo-usable-part-bank.mjs';
import { hasValue } from './lib/weather-component-needs.mjs';
import { assertWeatherTransportSettlement, isWeatherTransportStopUnproved,
  throwWeatherTransportStopUnproved } from './lib/weather-transport-settlement.mjs';

// Advisory progress only: identities/policies still pass the unchanged bank admission.
function zoneRotation(parts, spatialPolicies, stored, legacyPartId) {
  const identities = parts.map(openMeteoPartIdentity);
  const zones = new Map();
  const parent = new Map();
  for (let index = 0; index < parts.length; index += 1) {
    const zoneId = identities[index].parentZoneId;
    if (!zones.has(zoneId)) zones.set(zoneId, []);
    zones.get(zoneId).push(parts[index].partId);
    parent.set(parts[index].partId, zoneId);
  }
  const compareIds = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  for (const ids of zones.values()) ids.sort(compareIds);
  const orderedZones = new Map([...zones].sort(([a], [b]) => compareIds(a, b)));
  const domainSha256 = openMeteoPartSha256({ spatialPolicies,
    identities: [...identities].sort((a, b) => compareIds(a.entityId, b.entityId)) });
  const invalid = () => { throw new Error('OPEN_METEO_PART_CURSOR_INVALID'); };
  const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  if (stored !== undefined) {
    if (!exact(stored, ['schemaVersion', 'domainSha256', 'critical', 'temperature'])
      || stored.schemaVersion !== 1 || typeof stored.domainSha256 !== 'string'
      || !/^[a-f0-9]{64}$/.test(stored.domainSha256)) invalid();
    for (const tier of [stored.critical, stored.temperature]) {
      if (!exact(tier, ['lastZoneId', 'lastParts']) || !Array.isArray(tier.lastParts)
        || !(tier.lastZoneId === null || typeof tier.lastZoneId === 'string' && tier.lastZoneId)) invalid();
      const seen = new Set();
      for (const entry of tier.lastParts) {
        if (!Array.isArray(entry) || entry.length !== 2
          || entry.some(value => typeof value !== 'string' || !value) || seen.has(entry[0])) invalid();
        seen.add(entry[0]);
        if (stored.domainSha256 === domainSha256 && parent.get(entry[1]) !== entry[0]) invalid();
      }
      if (tier.lastZoneId !== null && !seen.has(tier.lastZoneId)) invalid();
    }
    if (stored.domainSha256 === domainSha256) return { state: structuredClone(stored), zones: orderedZones, parent };
  }
  // A v1 cursor, or a changed live domain, seeds only ordering from the legacy ID.
  const zoneId = parent.get(legacyPartId) ?? null;
  const seed = () => ({ lastZoneId: zoneId, lastParts: zoneId === null ? [] : [[zoneId, legacyPartId]] });
  return { state: { schemaVersion: 1, domainSha256, critical: seed(), temperature: seed() }, zones: orderedZones, parent };
}

function zoneOrderedTier(work, rotation, tierName) {
  const byPart = new Map();
  for (const item of work) {
    if (!byPart.has(item.part.partId)) byPart.set(item.part.partId, []);
    byPart.get(item.part.partId).push(item);
  }
  const tier = rotation.state[tierName];
  const after = (items, id) => {
    const index = items.indexOf(id);
    return index < 0 ? items : [...items.slice(index + 1), ...items.slice(0, index + 1)];
  };
  const lastParts = new Map(tier.lastParts);
  const queues = after([...rotation.zones.keys()], tier.lastZoneId).map(zoneId =>
    after(rotation.zones.get(zoneId), lastParts.get(zoneId)).filter(id => byPart.has(id)));
  const result = [];
  for (let round = 0; queues.some(queue => round < queue.length); round += 1) {
    for (const queue of queues) if (round < queue.length) result.push(...byPart.get(queue[round]));
  }
  return result;
}

// No top-level provider calls or filesystem writes. The normal producer owns
// transport deadlines/retries, the private cache path and durable checkpoint.
// Injected transport returns { responseText, acquiredAt } for this exact request.
export async function produceOpenMeteoPartComponents({
  parts, productionReferenceAt, spatialPolicies, previousBank = null,
  fetchResponse, checkpoint = async () => {}, shouldContinue = () => true,
  requiredPairs, retentionStartAt, retentionEndAt,
  checkpointEveryParts = 10, startAfterPartId = null, advisoryZoneRotation,
  transportOwnsRequestStart = false,
} = {}) {
  assertWeatherTransportSettlement();
  if (typeof fetchResponse !== 'function' || typeof transportOwnsRequestStart !== 'boolean') {
    throw new Error('OPEN_METEO_PART_TRANSPORT_REQUIRED');
  }
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
  const requestsByComponent = Object.fromEntries(OPEN_METEO_PART_COMPONENTS.map(component => [component, 0]));
  const deferredByComponent = { ...requestsByComponent };
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
  const rotation = zoneRotation(parts, spatialPolicies, advisoryZoneRotation, startAfterPartId);
  const criticalCandidates = [], temperatureCandidates = [];
  for (const part of parts) {
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
    for (const component of components) {
      (component === 'waterTemperature' ? temperatureCandidates : criticalCandidates).push({ part, component });
    }
  }
  const criticalWork = zoneOrderedTier(criticalCandidates, rotation, 'critical');
  const temperatureWork = zoneOrderedTier(temperatureCandidates, rotation, 'temperature');
  // Each tier visits one eligible PART per zone per round. Preserve that tier's
  // order while giving temperature one of every
  // three dispatch opportunities under sustained wind/wave pressure. The
  // existing budget must allow those starts; no upstream value is promised.
  const work = [];
  let criticalIndex = 0, temperatureIndex = 0;
  while (criticalIndex < criticalWork.length || temperatureIndex < temperatureWork.length) {
    for (let slot = 0; slot < 2 && criticalIndex < criticalWork.length; slot += 1) {
      work.push(criticalWork[criticalIndex++]);
    }
    if (temperatureIndex < temperatureWork.length) work.push(temperatureWork[temperatureIndex++]);
  }
  assertWeatherTransportSettlement();
  await checkpoint(bank);
  // Keep the existing two transport slots occupied independently. Waiting for
  // both siblings of one PART wasted the free slot behind a slow marine reply.
  // Order within each priority tier, deadline and source proof are preserved; checkpoints have
  // one writer and can save completed siblings before the slow reply settles.
  const active = new Map();
  let position = 0;
  try {
    while (position < work.length || active.size) {
      while (active.size < 2 && position < work.length && shouldContinue()) {
        assertWeatherTransportSettlement();
        const id = position++;
        const { part, component } = work[id];
        let requestStarted = false;
        const onRequestStarted = () => {
          if (requestStarted) return;
          requestStarted = true;
          requests += 1; requestsByComponent[component] += 1;
          lastAttemptedPartId = part.partId;
          const tier = rotation.state[component === 'waterTemperature' ? 'temperature' : 'critical'];
          const zoneId = rotation.parent.get(part.partId);
          tier.lastZoneId = zoneId;
          const index = tier.lastParts.findIndex(entry => entry[0] === zoneId);
          if (index < 0) tier.lastParts.push([zoneId, part.partId]);
          else tier.lastParts[index] = [zoneId, part.partId];
        };
        // Direct transports retain their component-start contract. The normal
        // paced adapter receipts only its first actual HTTP start, so a task
        // stopped while waiting for a slot cannot steal the durable cursor.
        const operation = (async () => {
          const request = buildOpenMeteoPartRequest(part, { component, productionReferenceAt,
            cellSelection: spatialPolicies[component].cellSelection, spatialPolicy: spatialPolicies[component] });
          if (!transportOwnsRequestStart) onRequestStarted();
          const response = await fetchResponse(request, { onRequestStarted });
          if (!requestStarted) throw new Error('OPEN_METEO_PART_REQUEST_START_RECEIPT_REQUIRED');
          return readOpenMeteoPartResponse({ ...response, request }, { part, spatialPolicies,
            onInvalid: code => { componentWarnings[code] = (componentWarnings[code] ?? 0) + 1; },
          });
        // Keep rejection handled even while a sibling checkpoint is awaiting
        // I/O; the original branded error is rethrown at the consumption edge.
        })().then(value => ({ id, part, component, value }),
          error => ({ id, part, component, failed: true, error, requestStarted }));
        active.set(id, operation);
      }
      if (!active.size) break;
      const result = await Promise.race(active.values());
      if (result.failed && isWeatherTransportStopUnproved(result.error)) throw result.error;
      assertWeatherTransportSettlement();
      active.delete(result.id);
      if (result.failed) {
        if (!result.requestStarted && transportOwnsRequestStart
          && ['OPEN_METEO_PART_RUNTIME_BUDGET_REACHED', 'OPEN_METEO_PART_HTTP_ATTEMPT_LIMIT_REACHED'].includes(result.error?.code)) {
          deferred += 1; deferredByComponent[result.component] += 1;
          continue;
        }
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
        assertWeatherTransportSettlement();
        await checkpoint(bank);
        pendingCheckpointParts.clear();
      }
    }
  } catch (error) {
    // No new request or write after persistence failure. Already-started
    // bounded transports must settle before outer recovery/cleanup proceeds.
    const settled = await Promise.allSettled(active.values());
    if (!isWeatherTransportStopUnproved(error) && settled.some(result =>
      result.status === 'fulfilled' && result.value.failed && isWeatherTransportStopUnproved(result.value.error))) {
      throwWeatherTransportStopUnproved(active, error);
    }
    throw error;
  }
  deferred += work.length - position;
  for (const { component } of work.slice(position)) deferredByComponent[component] += 1;
  if (pendingCheckpointParts.size > 0) {
    bank = builder.snapshot();
    assertWeatherTransportSettlement();
    await checkpoint(bank);
  }
  assertWeatherTransportSettlement();
  return { bank, zoneRotation: rotation.state, summary: { requests, deferred, requestsByComponent, deferredByComponent,
    failures, componentWarnings, records: bank.records.length,
    lastAttemptedPartId, componentsNotAdmitted, retired } };
}
